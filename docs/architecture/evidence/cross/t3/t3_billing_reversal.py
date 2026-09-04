"""T3 (#218) — ĐẢO BÚT TOÁN DỊCH VỤ: đảo hai lần thì trừ tiền hai lần.

`ReverseServiceChargeAsync` (`POST /api/BillingComplete/reverse-charge`) là bút toán đảo khi hủy một
dịch vụ đã tính tiền: nó tính lại số tiền từ chi tiết chỉ định, **trừ thẳng vào hóa đơn**
(`TotalServiceAmount` và `TotalAmount`), rồi đặt `ServiceRequests.Status = 4` (đã hủy).

Nhưng nó **không hề đọc trạng thái hiện tại của chỉ định trước khi làm**. Gọi lần thứ hai trên đúng
chỉ định đó thì:

* số tiền vẫn tính ra y như cũ (chi tiết chỉ định không đổi),
* **hóa đơn bị trừ thêm một lần nữa**,
* `Status = 4` gán lại — không đổi gì, nên nhìn vào trạng thái cuối thì **không thấy dấu vết** của
  lần đảo thừa.

Đây là chính cái hình dạng của lỗi tiền tạm ứng ở §11 (một phiếu 1.000.000đ chi ra 2.000.000đ),
lần này theo chiều ngược lại: một dịch vụ tính tiền một lần bị gỡ khỏi hóa đơn hai lần. Có chặn sàn
`if (< 0) = 0` nên hóa đơn không âm — nhưng với hóa đơn đủ lớn thì lần đảo thứ hai lặng lẽ gỡ thêm
một khoản chưa từng được tính.

Cách đo phải nhìn vào **số tiền trên hóa đơn**, không nhìn trạng thái chỉ định: sau hai lần đảo thì
trạng thái vẫn là 4 dù đảo một lần hay mười lần. Đúng bài học của lượt đo BHXH — trạng thái cuối
giống nhau không có nghĩa là chuyện đã xảy ra giống nhau.

Tiền tố dữ liệu T3REV, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3REV"
CASES = []
TOKEN = None


def http(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer %s" % TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
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
    if text.startswith("Msg ") or "Invalid column name" in text or "Invalid object name" in text:
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:120], text[:200]))
    return text


def case(name, must_block, blocked, detail):
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-52s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    made = []
    try:
        row = sql("SELECT TOP 1 CAST(sr.Id AS varchar(50)) + '|' + CAST(sr.MedicalRecordId AS varchar(50)) "
                  " + '|' + CAST(sr.Status AS varchar(3)) + '|' + CAST(sr.ServiceId AS varchar(50)) "
                  "FROM ServiceRequests sr WHERE sr.IsDeleted=0 AND sr.MedicalRecordId IS NOT NULL")
        if row.count("|") != 3:
            raise SystemExit("không tìm được chỉ định dịch vụ gắn hồ sơ: %r" % row)
        sr_id, rec_id, orig_status, service_id = row.split("|")

        # Dựng chi tiết chỉ định có số tiền rõ ràng: 1 × 500.000đ.
        detail_id = str(uuid.uuid4())
        made.append(detail_id)
        sql("DELETE FROM ServiceRequestDetails WHERE ServiceRequestId='%s'; "
            "INSERT INTO ServiceRequestDetails (Id, ServiceRequestId, ServiceId, Quantity, UnitPrice, "
            " Amount, InsuranceAmount, PatientAmount, PatientType, InsurancePaymentRate, Status, "
            " IsSampleCollected, ReceiveStatus, CreatedAt, IsDeleted) VALUES "
            "('%s','%s','%s', 1, 500000, 500000, 0, 500000, 2, 0, 0, 0, 0, GETUTCDATE(), 0);"
            % (sr_id, detail_id, sr_id, service_id))

        # Hóa đơn với số dư đủ lớn để lần đảo thứ hai KHÔNG bị chặn sàn 0 che mất.
        inv = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM InvoiceSummaries WHERE MedicalRecordId='%s'" % rec_id)
        if len(inv) != 36:
            inv = str(uuid.uuid4())
            made.append(inv)
            sql("INSERT INTO InvoiceSummaries (Id, InvoiceCode, InvoiceDate, MedicalRecordId, "
                " TotalServiceAmount, TotalMedicineAmount, TotalSupplyAmount, TotalBedAmount, TotalAmount, "
                " InsuranceAmount, PatientCoPayment, OutOfPocket, DepositAmount, PaidAmount, RefundAmount, "
                " RemainingAmount, DiscountAmount, Status, IsApprovedByAccountant, CreatedAt, IsDeleted) "
                "VALUES ('%s', N'%s', GETUTCDATE(), '%s', 5000000, 0, 0, 0, 5000000, "
                " 0, 0, 5000000, 0, 0, 0, 5000000, 0, 0, 0, GETUTCDATE(), 0);"
                % (inv, TAG + inv[:8], rec_id))
        else:
            sql("UPDATE InvoiceSummaries SET TotalServiceAmount=5000000, TotalAmount=5000000 WHERE Id='%s'" % inv)
        sql("UPDATE ServiceRequests SET Status=1 WHERE Id='%s'" % sr_id)

        def invoice_total():
            return sql("SELECT CAST(CAST(TotalAmount AS decimal(18,0)) AS varchar(30)) "
                       "FROM InvoiceSummaries WHERE Id='%s'" % inv)

        def sr_status():
            return sql("SELECT CAST(Status AS varchar(3)) FROM ServiceRequests WHERE Id='%s'" % sr_id)

        body = {"MedicalRecordId": rec_id, "ServiceRequestId": sr_id, "Reason": TAG}

        print("── Đảo bút toán lần 1 (hợp lệ) ──")
        before = float(invoice_total())
        st1, b1 = http("POST", "/api/BillingComplete/reverse-charge", body)
        after1 = float(invoice_total())
        # Đối chứng âm: lần đảo đầu BẮT BUỘC phải chạy và phải trừ đúng 500.000đ.
        case("lần đảo đầu chạy được và trừ đúng 500.000đ", False,
             not (st1 == 200 and abs((before - after1) - 500000) < 1),
             "HTTP %s · hóa đơn %s → %s (giảm %s)" % (st1, before, after1, before - after1))

        print("\n── Đảo bút toán lần 2 trên CÙNG chỉ định ──")
        st2, b2 = http("POST", "/api/BillingComplete/reverse-charge", body)
        after2 = float(invoice_total())
        case("đảo lần hai bị chặn", True, st2 >= 400,
             "HTTP %s · %s" % (st2, b2[:70]))
        # Điều thật sự quan trọng: TIỀN. Trạng thái chỉ định là 4 dù đảo một lần hay mười lần.
        case("hóa đơn KHÔNG bị trừ thêm lần nữa", True, abs(after2 - after1) < 1,
             "sau lần 1=%s · sau lần 2=%s (trừ thêm %s) · trạng thái chỉ định=%s"
             % (after1, after2, after1 - after2, sr_status()))

    finally:
        try:
            sql("DELETE FROM ServiceRequestDetails WHERE ServiceRequestId='%s'; "
                "UPDATE ServiceRequests SET Status=%s WHERE Id='%s'; "
                "DELETE FROM BillingReversals WHERE Reason=N'%s';" % (sr_id, orig_status, sr_id, TAG))
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"]
                      else "hệ thống CHẶN nhầm đường hợp lệ"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_billing_reversal.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_billing_reversal.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
