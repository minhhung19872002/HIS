"""T3 (#218) — đua trạng thái: hai người thao tác cùng lúc trên cùng một bản ghi.

Checklist của #218 có mục "Đua trạng thái: 2 user đổi state đồng thời (gắn #188)" và đây là mục
chưa ai đo. Câu hỏi không phải "có khoá không" mà là **hậu quả có nhìn thấy được không**:

  A. Cấp phát cùng một đơn thuốc từ N phiên song song → kho bị trừ MẤY LẦN?
     Đây là câu nguy hiểm nhất: trừ hai lần nghĩa là thuốc bốc hơi khỏi sổ kho.
  B. Duyệt và từ chối cùng một phiếu hoàn tiền cùng lúc → kết cục có xác định không?
  C. Hai lượt hủy cùng một đơn → có thành hai lần hủy không?

Cách đo: dựng bản ghi, bắn N request đồng thời bằng thread, rồi đọc lại DB xem TÁC ĐỘNG THẬT
(số lượng tồn kho, trạng thái cuối) chứ không chỉ đếm HTTP 200.

Dữ liệu mang tiền tố T3RACE và được dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, threading, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3RACE"
FANOUT = 5
RESULTS = []


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


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    return (out.stdout or "").strip()


def record(name, ok, detail):
    RESULTS.append({"check": name, "pass": bool(ok), "detail": detail})
    print("  %-40s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))


def login():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    return (json.loads(b).get("data") or {})["token"]


def fire(method, path, token, body, n=FANOUT):
    """Bắn n request ĐỒNG THỜI, chờ tất cả xong, trả về danh sách mã HTTP."""
    out = [None] * n
    barrier = threading.Barrier(n)

    def worker(i):
        barrier.wait()          # thả cùng lúc để thật sự chồng nhau
        out[i] = http(method, path, token, body)[0]

    ts = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
    for t in ts: t.start()
    for t in ts: t.join()
    return out


def seed_prescription(status, med, wh):
    code = "%s-%d" % (TAG, int(time.time() * 1000) % 1000000)
    sql("""
DECLARE @mr uniqueidentifier = (SELECT TOP 1 Id FROM MedicalRecords WHERE IsDeleted=0 ORDER BY CreatedAt);
DECLARE @u uniqueidentifier = (SELECT TOP 1 Id FROM Users WHERE IsDeleted=0 ORDER BY CreatedAt);
DECLARE @d uniqueidentifier = (SELECT TOP 1 Id FROM Departments WHERE IsDeleted=0 ORDER BY DepartmentCode);
INSERT INTO Prescriptions (Id, PrescriptionCode, PrescriptionDate, MedicalRecordId, DoctorId, DepartmentId,
  PrescriptionType, TotalDays, TotalTangs, TotalAmount, InsuranceAmount, PatientAmount, Status,
  IsDispensed, CreatedAt, IsDeleted, PaymentCategory, DrugOrderType, WarehouseId)
VALUES (NEWID(), '%s', SYSUTCDATETIME(), @mr, @u, @d, 1, 1, 0, 0, 0, 0, %d, 0, SYSUTCDATETIME(), 0, 2, 1, '%s');
DECLARE @p uniqueidentifier = (SELECT Id FROM Prescriptions WHERE PrescriptionCode='%s');
INSERT INTO PrescriptionDetails (Id, PrescriptionId, MedicineId, Quantity, DispensedQuantity, UnitPrice,
  Amount, InsuranceAmount, PatientAmount, PatientType, InsurancePaymentRate, Days, TotalPrice,
  Status, CreatedAt, IsDeleted)
VALUES (NEWID(), @p, '%s', 10, 0, 1000, 10000, 0, 10000, 2, 0, 1, 10000, 0, SYSUTCDATETIME(), 0);
""" % (code, status, wh, code, med))
    pid = sql("SELECT CAST(Id AS varchar(50)) FROM Prescriptions WHERE PrescriptionCode='%s'" % code)
    if len(pid) != 36:
        raise SystemExit("không dựng được đơn thuốc (%s): %s" % (code, pid[:300]))
    return pid


def main():
    tok = login()
    med = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Medicines WHERE IsDeleted=0 AND IsActive=1 ORDER BY MedicineCode")
    wh = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Warehouses WHERE IsActive=1 AND IsDeleted=0 AND WarehouseType=2 ORDER BY WarehouseName")
    sql("DELETE FROM PrescriptionDetails WHERE PrescriptionId IN (SELECT Id FROM Prescriptions WHERE PrescriptionCode LIKE '%s%%');"
        "DELETE FROM Prescriptions WHERE PrescriptionCode LIKE '%s%%';"
        "DELETE FROM InventoryItems WHERE BatchNumber='%s';" % (TAG, TAG, TAG))

    print("== A. Cấp phát cùng một đơn từ %d phiên song song ==" % FANOUT)
    sql("""
INSERT INTO InventoryItems (Id, WarehouseId, ItemType, MedicineId, BatchNumber, ExpiryDate, Quantity,
  ReservedQuantity, ImportPrice, UnitPrice, IsLocked, CreatedAt, IsDeleted)
VALUES (NEWID(), '%s', N'Medicine', '%s', '%s', DATEADD(year, 2, SYSUTCDATETIME()), 100, 0, 1000, 1500, 0, SYSUTCDATETIME(), 0);
""" % (wh, med, TAG))
    pid = seed_prescription(1, med, wh)   # 1 = đã duyệt, sẵn sàng phát
    # Phải đo TỔNG tồn của cả thuốc đó, không chỉ lô mình vừa nạp: FEFO chọn lô hạn gần nhất, có thể
    # là một lô khác. Lượt chạy đầu đo mỗi lô riêng nên thấy "không trừ gì" và suýt kết luận sai.
    def stock_of_medicine():
        v = sql("SELECT ISNULL(CAST(SUM(Quantity) AS varchar(30)),'0') FROM InventoryItems "
                "WHERE MedicineId='%s' AND IsDeleted=0" % med)
        try:
            return float(v)
        except ValueError:
            return None

    before = stock_of_medicine()
    codes = fire("POST", "/api/pharmacy/prescriptions/%s/dispense" % pid, tok, {})
    after = stock_of_medicine()
    ok200 = sum(1 for c in codes if c == 200)
    deducted = None if (before is None or after is None) else round(before - after, 4)
    record("A1. kho chỉ bị trừ ĐÚNG MỘT LẦN", deducted == 10.0,
           "đơn 10 viên, %d request song song (%d×200) → tổng tồn %s → %s, trừ %s (đúng phải là 10)"
           % (FANOUT, ok200, before, after, deducted))
    st_after = sql("SELECT CAST(Status AS varchar(5)) + '|' + CAST(IsDispensed AS varchar(5)) FROM Prescriptions WHERE Id='%s'" % pid)
    conflicts = sum(1 for c in codes if c == 409)
    record("A2. người thua cuộc nhận 409, không phải 500", conflicts == FANOUT - ok200 and 500 not in codes,
           "Status|IsDispensed=%s · mã HTTP: %s (kỳ vọng 1×200 + %d×409)" % (st_after, codes, FANOUT - 1))

    print("\n== B. Duyệt và từ chối cùng một phiếu hoàn tiền cùng lúc ==")
    sql("DELETE FROM Receipts WHERE ReceiptCode LIKE '%s%%'" % TAG)
    rcode = "%s-R-%d" % (TAG, int(time.time() * 1000) % 100000)
    sql("""
DECLARE @p uniqueidentifier = (SELECT TOP 1 Id FROM Patients WHERE IsDeleted=0 ORDER BY CreatedAt);
DECLARE @u uniqueidentifier = (SELECT TOP 1 Id FROM Users WHERE IsDeleted=0 ORDER BY CreatedAt);
INSERT INTO Receipts (Id, ReceiptCode, ReceiptDate, PatientId, ReceiptType, PaymentMethod,
  Amount, Discount, FinalAmount, Status, CashierId, CreatedAt, IsDeleted, DiscountReasonCode)
VALUES (NEWID(), '%s', SYSUTCDATETIME(), @p, 3, 1, 100000, 0, 100000, 0, @u, SYSUTCDATETIME(), 0, '');
""" % rcode)
    rid = sql("SELECT CAST(Id AS varchar(50)) FROM Receipts WHERE ReceiptCode='%s'" % rcode)

    out = [None, None]
    barrier = threading.Barrier(2)

    def approve():
        barrier.wait()
        out[0] = http("POST", "/api/BillingComplete/refunds/approve", tok,
                      {"refundId": rid, "isApproved": True})[0]

    def reject():
        barrier.wait()
        out[1] = http("POST", "/api/BillingComplete/refunds/approve", tok,
                      {"refundId": rid, "isApproved": False, "rejectReason": TAG})[0]

    ts = [threading.Thread(target=approve), threading.Thread(target=reject)]
    for t in ts: t.start()
    for t in ts: t.join()
    final = sql("SELECT CAST(Status AS varchar(5)) FROM Receipts WHERE Id='%s'" % rid)
    record("B1. kết cục là MỘT trạng thái hợp lệ", final in ("1", "2"),
           "duyệt=%s · từ chối=%s → trạng thái cuối=%s (1 duyệt / 2 từ chối)" % (out[0], out[1], final))

    print("\n== C. Hủy cùng một đơn thuốc từ %d phiên song song ==" % FANOUT)
    pid2 = seed_prescription(0, med, wh)
    codes2 = fire("POST", "/api/pharmacy/prescriptions/%s/reject" % pid2, tok, {"reason": TAG})
    st2 = sql("SELECT CAST(Status AS varchar(5)) FROM Prescriptions WHERE Id='%s'" % pid2)
    record("C1. hủy nhiều lần vẫn ra một kết quả", st2 == "4",
           "%d request song song → Status=%s (4 = Hủy) · mã HTTP: %s" % (FANOUT, st2, codes2))

    sql("DELETE FROM PrescriptionDetails WHERE PrescriptionId IN (SELECT Id FROM Prescriptions WHERE PrescriptionCode LIKE '%s%%');"
        "DELETE FROM Prescriptions WHERE PrescriptionCode LIKE '%s%%';"
        "DELETE FROM Receipts WHERE ReceiptCode LIKE '%s%%';"
        "DELETE FROM InventoryItems WHERE BatchNumber='%s';" % (TAG, TAG, TAG, TAG))

    ok = sum(1 for r in RESULTS if r["pass"])
    print("\n%d/%d kiểm tra đạt" % (ok, len(RESULTS)))
    json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "fanout": FANOUT, "checks": RESULTS},
              open(os.path.join(HERE, "t3_concurrency.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("ghi t3_concurrency.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
