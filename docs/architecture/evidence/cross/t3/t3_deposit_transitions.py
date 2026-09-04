"""T3 (#218) — TIỀN TẠM ỨNG: hủy rồi có tiêu được không, và hoàn được mấy lần.

`Deposits.Status`: 2 = đã xác nhận (còn dùng được) · 3 = đã dùng hết · 5 = đã hủy.

Ba chỗ đáng ngờ đọc được từ mã, bài này đo để biết chắc:

1. `UseDepositForPaymentAsync` chỉ kiểm SỐ DƯ, không kiểm `Status` ⇒ phiếu tạm ứng **đã hủy** có
   thể vẫn tiêu được (hủy chỉ đặt `Status = 5`, không đụng `RemainingAmount`).

2. `CreateRefundAsync` có hai nhánh nằm cách nhau đúng mười dòng: nhánh **phiếu thanh toán** kiểm
   `originalPayment.Status == 2` ("đã bị hủy") và chặn; nhánh **phiếu tạm ứng** ngay bên cạnh
   KHÔNG kiểm `Status` gì cả. Lại đúng hình dạng "một luật, thi hành ở một cửa, bỏ trống ở cửa kia".

3. Nặng nhất: đường hoàn tiền **không bao giờ ghi ngược** vào phiếu tạm ứng. `availableAmount` được
   tính bằng `Amount - UsedAmount`, mà hoàn tiền không tăng `UsedAmount` ở bất kỳ bước nào — kể cả
   `ConfirmRefundAsync`, tức là lúc TIỀN ĐÃ RA KHỎI QUỸ. Nên cùng một phiếu tạm ứng có thể hoàn
   **nhiều lần**, mỗi lần đều thấy số dư y như cũ.

Ba ca đối chứng dương ở cuối: dùng tạm ứng bình thường · hoàn lần đầu · hoàn quá số dư sau khi đã
tiêu. Nếu chúng cũng chặn thì bản vá đã siết quá tay.

Tiền tố dữ liệu T3DEP, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3DEP"
GHOST = "00000000-0000-0000-0000-0000000000ff"
CASES = []


def http(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def payload(body):
    try:
        d = json.loads(body)
    except Exception:
        return {}
    return d.get("data", d) if isinstance(d, dict) else d


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    return (out.stdout or "").strip()


def case(name, must_block, blocked, detail):
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-48s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def cleanup(patient_id):
    if not patient_id:
        return
    sql("""
DECLARE @p uniqueidentifier = '%s';
DELETE FROM Receipts WHERE PatientId = @p;
DELETE FROM Deposits WHERE PatientId = @p;
DELETE e FROM Examinations e JOIN MedicalRecords mr ON mr.Id = e.MedicalRecordId WHERE mr.PatientId = @p;
DELETE FROM MedicalRecords WHERE PatientId = @p;
DELETE FROM Patients WHERE Id = @p;
""" % patient_id)


def main():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    tok = payload(b)["token"]

    patient_id = None
    try:
        suffix = str(int(time.time()))[-6:]
        st, b = http("POST", "/api/Patients", tok, {
            "fullName": "%s Le Thi Tam Ung" % TAG, "dateOfBirth": "1992-02-02T00:00:00",
            "gender": 2, "phoneNumber": "05%s" % suffix.rjust(8, "0")[:8],
            "address": "Số 9 phố Tạm Ứng"})
        patient_id = payload(b).get("id")
        if not patient_id:
            raise SystemExit("không tạo được bệnh nhân: %s %s" % (st, b[:200]))

        def make_deposit(amount):
            http("POST", "/api/BillingComplete/deposits", tok, {
                "patientId": patient_id, "depositType": 1, "depositSource": 1,
                "amount": amount, "paymentMethod": 1, "notes": TAG})
            return sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Deposits "
                       "WHERE PatientId='%s' ORDER BY CreatedAt DESC" % patient_id)

        def dep_state(did):
            row = sql("SELECT ISNULL(CAST(Status AS varchar(5)),'?') + '|' + "
                      "CAST(CAST(RemainingAmount AS decimal(18,0)) AS varchar(20)) + '|' + "
                      "CAST(CAST(UsedAmount AS decimal(18,0)) AS varchar(20)) "
                      "FROM Deposits WHERE Id='%s'" % did)
            return (row.split("|") + ["", "", ""])[:3]

        def use(did, amount):
            return http("POST", "/api/BillingComplete/deposits/use-for-payment", tok,
                        {"invoiceId": GHOST, "depositId": did, "amount": amount})

        def refund_full(did, amount):
            """Tạo → duyệt → xác nhận chi. Trả (mã HTTP của bước tạo, id phiếu hoàn hoặc '')."""
            st, b = http("POST", "/api/BillingComplete/refunds", tok, {
                "patientId": patient_id, "refundType": 1, "originalDepositId": did,
                "refundAmount": amount, "refundMethod": 1, "reason": TAG})
            rid = (payload(b) or {}).get("id") or ""
            if rid:
                http("POST", "/api/BillingComplete/refunds/approve", tok,
                     {"refundId": rid, "isApproved": True})
                http("POST", "/api/BillingComplete/refunds/confirm", tok,
                     {"refundId": rid, "transactionNumber": TAG, "notes": TAG})
            return st, rid

        def paid_out():
            """Tổng tiền ĐÃ CHI hoàn cho bệnh nhân này (phiếu hoàn ở trạng thái đã chi)."""
            v = sql("SELECT ISNULL(CAST(CAST(SUM(FinalAmount) AS decimal(18,0)) AS varchar(20)),'0') "
                    "FROM Receipts WHERE PatientId='%s' AND ReceiptType=3 AND Status=4" % patient_id)
            return v or "0"

        print("── đối chứng dương: đường bình thường phải CHẠY ──")
        d1 = make_deposit(1000000)
        st, b = use(d1, 300000)
        stt, rem, used = dep_state(d1)
        case("tiêu tạm ứng đang còn hiệu lực", False, not (st in (200, 201) and rem == "700000"),
             "HTTP %s · Status=%s · còn lại=%s · đã dùng=%s" % (st, stt, rem, used))

        st, _ = refund_full(d1, 400000)
        case("hoàn lần đầu trong số dư", False, st not in (200, 201),
             "HTTP %s · đã chi=%s" % (st, paid_out()))

        st, b = http("POST", "/api/BillingComplete/refunds", tok, {
            "patientId": patient_id, "refundType": 1, "originalDepositId": d1,
            "refundAmount": 900000, "refundMethod": 1, "reason": TAG})
        case("hoàn vượt quá phần chưa tiêu", True, st not in (200, 201),
             "HTTP %s · %s" % (st, (payload(b) or {}).get("message", b[:70])))

        print("\n── phiếu tạm ứng ĐÃ HỦY ──")
        d2 = make_deposit(1000000)
        st_c, _ = http("POST", "/api/BillingComplete/deposits/%s/cancel" % d2, tok, {"reason": TAG})
        stt, rem, used = dep_state(d2)
        case("hủy đưa phiếu sang trạng thái 5", False, stt != "5",
             "HTTP %s · Status=%s · còn lại=%s" % (st_c, stt, rem))

        st, b = use(d2, 100000)
        stt, rem, used = dep_state(d2)
        case("tiêu phiếu tạm ứng đã hủy", True, used == "0",
             "HTTP %s · Status=%s · đã dùng=%s" % (st, stt, used))

        st, b = http("POST", "/api/BillingComplete/refunds", tok, {
            "patientId": patient_id, "refundType": 1, "originalDepositId": d2,
            "refundAmount": 100000, "refundMethod": 1, "reason": TAG})
        case("hoàn tiền cho phiếu tạm ứng đã hủy", True, st not in (200, 201),
             "HTTP %s · %s" % (st, (payload(b) or {}).get("message", b[:70])))

        print("\n── hoàn NHIỀU LẦN cùng một phiếu tạm ứng ──")
        d3 = make_deposit(1000000)
        before = int(paid_out() or 0)
        refund_full(d3, 1000000)
        after_one = int(paid_out() or 0)
        # Lần hai đi HẾT chuỗi (tạo → duyệt → xác nhận chi), không dừng ở bước tạo. Chỉ khi đi hết
        # mới biết tiền có THỰC SỰ ra khỏi quỹ lần thứ hai hay không — mà đó mới là thiệt hại.
        st, rid2 = refund_full(d3, 1000000)
        after_two = int(paid_out() or 0)
        case("hoàn lần hai cùng một phiếu tạm ứng", True, st not in (200, 201),
             "HTTP %s · đã chi sau lần 1=%s · sau lần 2=%s"
             % (st, after_one - before, after_two - before))

        # Điều quan trọng nhất: tổng tiền THỰC SỰ ra khỏi quỹ cho phiếu 1.000.000 này.
        over = after_two - before
        case("tổng chi không vượt quá giá trị phiếu", False, over > 1000000,
             "đã chi cho phiếu 1.000.000 = %s" % over)

    finally:
        cleanup(patient_id)
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"] else "hệ thống chặn / sai số nhưng phải cho qua"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_deposit_transitions.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_deposit_transitions.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
