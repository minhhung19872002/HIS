"""T3 (#218) — CỔNG THANH TOÁN: tiền vào có được ghi đúng đơn, đúng số không.

Ba cổng (VNPay · MoMo · ZaloPay) cùng nhận callback từ máy chủ nhà cung cấp, cùng ghi
`PaymentTransactions` rồi tạo `Receipts`. Đọc mã thấy VNPay được làm rất chuẩn — kiểm chữ ký, chặn
gọi trùng, **và đối chiếu số tiền** — còn hai cổng kia thì không đủ. Lại đúng hình dạng "một luật,
thi hành ở một cửa, bỏ trống ở cửa kia".

Hai điều bài này đo:

1. **Đối chiếu số tiền.** `LinkReceiptAsync` tạo phiếu thu với `Amount = txn.Amount` — tức **số tiền
   trên đơn của mình**, không phải số tiền cổng báo đã trả. Nên nếu callback báo trả ít hơn mà hệ
   thống vẫn nhận, sổ quỹ được ghi đủ số của đơn. VNPay chặn (`Amount mismatch`); MoMo và ZaloPay
   không đọc trường `amount` lần nào.

2. **ZaloPay khớp giao dịch bằng ĐUÔI 6 KÝ TỰ.** `app_trans_id` có dạng `yyMMdd_xxxxxx` với phần
   đuôi là `TxnRef[^6..]`, và callback tra bằng `TxnRef.EndsWith(suffix)`. Mà `TxnRef` =
   `HIS` + `yyyyMMddHHmmss` + 4 số ngẫu nhiên, nên **6 ký tự cuối chỉ là giây + số ngẫu nhiên** —
   ngày bị bỏ hoàn toàn. Hai giao dịch tạo ở cùng giây-trong-phút với cùng số ngẫu nhiên sẽ đụng
   nhau **dù cách nhau nhiều tháng**, và `FirstOrDefault` chọn bừa một cái.

Bài đo tự tính chữ ký hợp lệ cho từng cổng nên đi đúng đường thật, không cấy thẳng vào DB.

Tiền tố dữ liệu T3PAY, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import hashlib, hmac, json, os, subprocess, sys, urllib.error, urllib.parse, urllib.request, uuid
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3PAY"
CASES = []

# Khoá lấy đúng từ appsettings.json (môi trường dev). MoMo/ZaloPay để RỖNG trong cấu hình, và
# `cfg["Key2"] ?? default` KHÔNG bắt chuỗi rỗng, nên khoá thực dùng là chuỗi rỗng.
VNPAY_SECRET = "SANDBOXSECRETKEY00000000000000000000"
MOMO_ACCESS_KEY = ""
MOMO_SECRET = ""
ZALO_KEY2 = ""


def http(method, path, body=None, raw_query=None):
    url = BASE + path + (("?" + raw_query) if raw_query else "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    text = (out.stdout or "").strip()
    # sqlcmd in lỗi ra stdout rồi trả mã 0 — chuỗi lỗi trông y như dữ liệu. Dừng còn hơn đo mù.
    if text.startswith("Msg ") or "Invalid column name" in text or "Invalid object name" in text:
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:120], text[:200]))
    return text


def case(name, must_block, blocked, detail):
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-50s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def hmac_hex(key, data, algo):
    return hmac.new(key.encode(), data.encode(), algo).hexdigest()


def seed_txn(txn_ref, amount, provider, patient_id, created_at_sql="GETUTCDATE()",
             provider_order_ref=None):
    tid = str(uuid.uuid4())
    ref_sql = "NULL" if provider_order_ref is None else "N'%s'" % provider_order_ref
    sql("INSERT INTO PaymentTransactions (Id, TxnRef, Provider, OrderType, OrderInfo, PatientId, "
        " Amount, Currency, Status, PaymentUrl, ExpiresAt, CreatedAt, IsDeleted, ProviderOrderRef) VALUES "
        "('%s', N'%s', N'%s', N'other', N'%s', '%s', %d, N'VND', 0, N'', "
        " DATEADD(day,1,GETUTCDATE()), %s, 0, %s);"
        % (tid, txn_ref, provider, TAG, patient_id, amount, created_at_sql, ref_sql))
    return tid


def txn_state(txn_ref):
    return sql("SELECT ISNULL(CAST(Status AS varchar(5)),'?') FROM PaymentTransactions WHERE TxnRef='%s'" % txn_ref)


def receipts_for(patient_id):
    return sql("SELECT ISNULL(CAST(CAST(SUM(FinalAmount) AS decimal(18,0)) AS varchar(30)),'0') "
               "FROM Receipts WHERE PatientId='%s' AND ReceiptType=2" % patient_id)


def cleanup(patient_id):
    """Chỉ dọn thứ bài đo tạo ra.

    Bài đo dùng một bệnh nhân CÓ SẴN (không tạo mới), nên tuyệt đối không được xoá bệnh nhân đó —
    lượt chạy đầu làm đúng như vậy và đâm vào khoá ngoại của hồ sơ bệnh án. Phiếu thu do callback
    sinh ra nhận diện qua `Note` có tên nhà cung cấp + mã giao dịch của mình.
    """
    try:
        sql("DELETE FROM Receipts WHERE ReceiptType=2 AND Note LIKE N'%%HIS20%%' "
            "AND Id IN (SELECT r.Id FROM Receipts r WHERE r.Note LIKE N'%%HIS20%%' "
            "  AND EXISTS (SELECT 1 FROM PaymentTransactions p WHERE p.OrderInfo=N'%s' "
            "              AND r.Note LIKE N'%%' + p.TxnRef + N'%%'));" % TAG)
        sql("DELETE FROM PaymentTransactions WHERE OrderInfo = N'%s';" % TAG)
    except SystemExit as e:
        print("  (dọn dữ liệu gặp trục trặc, bỏ qua: %s)" % str(e)[:80])


def main():
    patient_id = None
    try:
        patient_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Patients WHERE IsDeleted=0 ORDER BY CreatedAt DESC")
        if len(patient_id) != 36:
            raise SystemExit("không tìm được bệnh nhân để gắn giao dịch: %r" % patient_id)

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        stamp = now.strftime("%Y%m%d%H%M%S")

        # ── 1. VNPay: sai số tiền (đối chứng dương — cổng này ĐÃ kiểm) ──────
        print("── VNPay: đối chiếu số tiền (đối chứng dương) ──")
        ref_v = "HIS%s1111" % stamp
        seed_txn(ref_v, 1000000, "vnpay", patient_id)
        q = {
            "vnp_Amount": "100000",              # 1.000đ — KHÁC đơn 1.000.000đ
            "vnp_ResponseCode": "00", "vnp_TransactionStatus": "00",
            "vnp_TxnRef": ref_v, "vnp_TransactionNo": "999",
            "vnp_PayDate": now.strftime("%Y%m%d%H%M%S"),
        }
        signed = "&".join("%s=%s" % (urllib.parse.quote_plus(k), urllib.parse.quote_plus(v))
                          for k, v in sorted(q.items()))
        q["vnp_SecureHash"] = hmac_hex(VNPAY_SECRET, signed, hashlib.sha512)
        st, b = http("GET", "/api/payment/vnpay/ipn",
                     raw_query=urllib.parse.urlencode(q))
        case("VNPay: callback báo sai số tiền", True, txn_state(ref_v) != "1",
             "HTTP %s · trạng thái=%s · %s" % (st, txn_state(ref_v), b[:60]))

        # ── 2. MoMo: sai số tiền ────────────────────────────────────────────
        print("\n── MoMo: đối chiếu số tiền ──")
        ref_m = "HIS%s2222" % stamp
        seed_txn(ref_m, 1000000, "momo", patient_id)
        before = float(receipts_for(patient_id) or 0)
        body = {
            "partnerCode": "MOMOSANDBOX", "orderId": ref_m, "requestId": ref_m,
            "amount": "1000",                     # 1.000đ — KHÁC đơn 1.000.000đ
            "orderInfo": TAG, "orderType": "momo_wallet", "transId": "888",
            "resultCode": "0", "message": "Success", "payType": "qr",
            "responseTime": "1", "extraData": "",
        }
        raw = ("accessKey=%s&amount=%s&extraData=%s&message=%s&orderId=%s&orderInfo=%s"
               "&orderType=%s&partnerCode=%s&payType=%s&requestId=%s&responseTime=%s"
               "&resultCode=%s&transId=%s") % (
            MOMO_ACCESS_KEY, body["amount"], body["extraData"], body["message"], body["orderId"],
            body["orderInfo"], body["orderType"], body["partnerCode"], body["payType"],
            body["requestId"], body["responseTime"], body["resultCode"], body["transId"])
        body["signature"] = hmac_hex(MOMO_SECRET, raw, hashlib.sha256)
        st, b = http("POST", "/api/payment/momo/ipn", body)
        after = float(receipts_for(patient_id) or 0)
        case("MoMo: callback báo sai số tiền", True, txn_state(ref_m) != "1",
             "HTTP %s · trạng thái=%s · phiếu thu tăng %s (đơn 1.000.000, báo trả 1.000)"
             % (st, txn_state(ref_m), after - before))

        # ── 3. ZaloPay: sai số tiền ─────────────────────────────────────────
        print("\n── ZaloPay: đối chiếu số tiền ──")
        ref_z = "HIS%s3333" % stamp
        seed_txn(ref_z, 1000000, "zalopay", patient_id)
        before = float(receipts_for(patient_id) or 0)
        data_obj = {"app_trans_id": "%s_%s" % (now.strftime("%y%m%d"), ref_z[-6:]),
                    "zp_trans_id": 777, "amount": 1000}
        data_str = json.dumps(data_obj, separators=(",", ":"))
        st, b = http("POST", "/api/payment/zalopay/callback",
                     {"data": data_str, "mac": hmac_hex(ZALO_KEY2, data_str, hashlib.sha256)})
        after = float(receipts_for(patient_id) or 0)
        case("ZaloPay: callback báo sai số tiền", True, txn_state(ref_z) != "1",
             "HTTP %s · trạng thái=%s · phiếu thu tăng %s" % (st, txn_state(ref_z), after - before))

        # ── 4. ZaloPay: ngày trong app_trans_id bị BỎ QUA hoàn toàn ─────────
        # Cách đo dứt khoát hơn lượt đầu: lượt đầu dựng CẢ hai giao dịch (cũ + mới) rồi xem cái nào
        # được xác nhận — nó chọn đúng cái mới, nhưng đó là MAY, vì câu tra không có `ORDER BY` nào
        # bảo đảm thứ tự. Đo như vậy không chứng minh được gì.
        #
        # Ở đây chỉ dựng DUY NHẤT một giao dịch CŨ (8 tháng trước) rồi gửi callback mang ngày HÔM
        # NAY nhưng trùng 6 ký tự cuối. Nếu hệ thống vẫn xác nhận giao dịch 8 tháng tuổi đó thì đã
        # chứng minh: phần ngày trong `app_trans_id` bị bỏ qua hoàn toàn, chỉ còn đuôi 6 ký tự
        # (giây + số ngẫu nhiên) để phân biệt — với 540.000 tổ hợp thì đụng nhau là chuyện sớm muộn.
        print("\n── ZaloPay: ngày trong app_trans_id có được dùng không ──")
        suffix = "594444"                          # 2 số giây + 4 số ngẫu nhiên
        old_ref = "HIS20260101120%s" % suffix      # giao dịch CŨ, tháng 1
        seed_txn(old_ref, 500000, "zalopay", patient_id, "DATEADD(month,-8,GETUTCDATE())")
        data_obj = {"app_trans_id": "%s_%s" % (now.strftime("%y%m%d"), suffix),
                    "zp_trans_id": 666, "amount": 500000}
        data_str = json.dumps(data_obj, separators=(",", ":"))
        st, b = http("POST", "/api/payment/zalopay/callback",
                     {"data": data_str, "mac": hmac_hex(ZALO_KEY2, data_str, hashlib.sha256)})
        s_old = txn_state(old_ref)
        case("ZaloPay: callback hôm nay KHÔNG được khớp giao dịch tháng 1", True, s_old != "1",
             "HTTP %s · giao dịch 8 tháng tuổi: trạng thái=%s · %s" % (st, s_old, b[:55]))

        # ── 5+6. ĐỐI CHỨNG ÂM: tiền trả THẬT vẫn phải vào ───────────────────
        # Bốn ca trên đều có dạng "phải chặn", nên một bản vá chặn sạch mọi callback cũng đạt 4/4.
        # Hai ca này giữ cho bản vá trung thực: callback ĐÚNG mã đơn, ĐÚNG số tiền thì bắt buộc
        # phải được ghi nhận và phải lập phiếu thu.
        print("\n── Đối chứng âm: callback hợp lệ vẫn phải được ghi nhận ──")
        ref_ok = "HIS%s5555" % stamp
        app_ok = "%s_%s" % (now.strftime("%y%m%d"), ref_ok[-6:])
        seed_txn(ref_ok, 300000, "zalopay", patient_id, provider_order_ref=app_ok)
        before = float(receipts_for(patient_id) or 0)
        data_obj = {"app_trans_id": app_ok, "zp_trans_id": 555, "amount": 300000}
        data_str = json.dumps(data_obj, separators=(",", ":"))
        st, b = http("POST", "/api/payment/zalopay/callback",
                     {"data": data_str, "mac": hmac_hex(ZALO_KEY2, data_str, hashlib.sha256)})
        after = float(receipts_for(patient_id) or 0)
        case("ZaloPay: callback hợp lệ ĐƯỢC ghi nhận", False, txn_state(ref_ok) != "1",
             "HTTP %s · trạng thái=%s · phiếu thu tăng %s (đúng 300.000)"
             % (st, txn_state(ref_ok), after - before))

        ref_mok = "HIS%s6666" % stamp
        seed_txn(ref_mok, 300000, "momo", patient_id)
        body = {
            "partnerCode": "MOMOSANDBOX", "orderId": ref_mok, "requestId": ref_mok,
            "amount": "300000",                   # ĐÚNG số tiền của đơn
            "orderInfo": TAG, "orderType": "momo_wallet", "transId": "444",
            "resultCode": "0", "message": "Success", "payType": "qr",
            "responseTime": "1", "extraData": "",
        }
        raw = ("accessKey=%s&amount=%s&extraData=%s&message=%s&orderId=%s&orderInfo=%s"
               "&orderType=%s&partnerCode=%s&payType=%s&requestId=%s&responseTime=%s"
               "&resultCode=%s&transId=%s") % (
            MOMO_ACCESS_KEY, body["amount"], body["extraData"], body["message"], body["orderId"],
            body["orderInfo"], body["orderType"], body["partnerCode"], body["payType"],
            body["requestId"], body["responseTime"], body["resultCode"], body["transId"])
        body["signature"] = hmac_hex(MOMO_SECRET, raw, hashlib.sha256)
        st, b = http("POST", "/api/payment/momo/ipn", body)
        case("MoMo: IPN hợp lệ ĐƯỢC ghi nhận", False, txn_state(ref_mok) != "1",
             "HTTP %s · trạng thái=%s" % (st, txn_state(ref_mok)))

    finally:
        cleanup(patient_id)
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"] else "hệ thống làm SAI đối tượng"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_payment_gateway.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_payment_gateway.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
