"""T3 (#218) — XUẤT KHO: phát một đơn thuốc hai lần có trừ kho hai lần không.

`WarehouseCompleteService.StockOut.cs` có hai hàm phát thuốc gần như song sinh, và chúng **lệch
nhau đúng một mệnh đề**:

    nội trú  (dòng ~267):  foreach (var detail in prescription.Details.Where(d => d.Status == 0))
    ngoại trú (dòng ~108):  foreach (var detail in prescription.Details)

Bên nội trú bỏ qua những dòng đã phát nên gọi lại là vô hại; bên ngoại trú chạy lại toàn bộ vòng
FEFO. `Prescriptions.IsDispensed` có được ĐẶT (dòng ~185) nhưng không chỗ nào ĐỌC nó làm điều kiện —
chỉ dùng để lọc danh sách chờ phát trên màn hình, tức là giấu đơn khỏi worklist chứ không chặn một
lời gọi thẳng theo id.

Đây là lần thứ năm trong đợt này gặp cùng một hình dạng: một luật, thi hành ở một cửa, bỏ trống ở
cửa kia. Đáng chú ý là chú thích ngay tại chỗ còn ghi một lần lệch NGƯỢC LẠI trước đây (nội trú
thiếu bộ lọc lô khoá mà ngoại trú đã có) — cặp hàm này đã trôi khỏi nhau theo cả hai chiều.

Đo cả hai cửa vào: đường kho (`/api/warehouse/issues/dispense-outpatient/{id}`) và đường dược
(`/api/pharmacy/prescriptions/{id}/dispense`).

Tiền tố dữ liệu T3KHO, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3KHO"
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


def msg_of(body):
    """Câu thông báo trong thân trả về, chịu được cả thân `true` lẫn thân không phải object."""
    d = payload(body)
    return d.get("message") if isinstance(d, dict) and d.get("message") else body[:45]


def case(name, must_block, blocked, detail):
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-50s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def cleanup(patient_ids):
    sql("DELETE FROM InventoryItems WHERE BatchNumber='%s';" % TAG)
    for pid in [p for p in patient_ids if p]:
        sql("""
DECLARE @p uniqueidentifier = '%s';
DELETE ei FROM ExportReceiptDetails ei JOIN ExportReceipts e ON e.Id = ei.ExportReceiptId WHERE e.PatientId = @p;
DELETE FROM ExportReceipts WHERE PatientId = @p;
DELETE pd FROM PrescriptionDetails pd JOIN Prescriptions p ON p.Id = pd.PrescriptionId
  JOIN MedicalRecords mr ON mr.Id = p.MedicalRecordId WHERE mr.PatientId = @p;
DELETE p FROM Prescriptions p JOIN MedicalRecords mr ON mr.Id = p.MedicalRecordId WHERE mr.PatientId = @p;
DELETE e FROM Examinations e JOIN MedicalRecords mr ON mr.Id = e.MedicalRecordId WHERE mr.PatientId = @p;
DELETE r FROM Receipts r WHERE r.PatientId = @p;
DELETE FROM MedicalRecords WHERE PatientId = @p;
DELETE FROM Patients WHERE Id = @p;
""" % pid)


def main():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    tok = payload(b)["token"]

    pids = []
    try:
        med = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Medicines WHERE IsDeleted=0 AND IsActive=1 ORDER BY MedicineCode")
        wh = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Warehouses WHERE IsActive=1 AND IsDeleted=0 AND WarehouseType=2 ORDER BY WarehouseName")
        room = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Rooms WHERE IsDeleted=0 AND IsActive=1 ORDER BY RoomCode")

        def seed_stock(qty=100):
            sql("DELETE FROM InventoryItems WHERE BatchNumber='%s';" % TAG)
            sql("INSERT INTO InventoryItems (Id, WarehouseId, ItemType, MedicineId, BatchNumber, "
                " ExpiryDate, Quantity, ReservedQuantity, ImportPrice, UnitPrice, IsLocked, CreatedAt, IsDeleted) "
                "VALUES (NEWID(), '%s', N'Medicine', '%s', '%s', DATEADD(year,2,SYSUTCDATETIME()), "
                " %d, 0, 1000, 1500, 0, SYSUTCDATETIME(), 0);" % (wh, med, TAG, qty))

        def stock_left():
            """TỔNG tồn của thuốc này trong kho, KHÔNG phải riêng lô vừa nạp.

            Bẫy đã gặp một lần ở bài đo luồng ngoại trú và lặp lại đúng ở đây: FEFO chọn lô có hạn
            gần nhất, thường KHÔNG phải lô mình vừa nạp, nên đo riêng lô của mình sẽ thấy 'tồn không
            đổi' và kết luận nhầm là hệ thống đã chặn.
            """
            v = sql("SELECT ISNULL(CAST(SUM(Quantity) AS varchar(30)),'0') FROM InventoryItems "
                    "WHERE MedicineId='%s' AND WarehouseId='%s' AND IsDeleted=0" % (med, wh))
            try:
                return float(v)
            except ValueError:
                return None

        def new_prescription(label, qty=6):
            suffix = str(int(time.time() * 1000))[-8:]
            st, b = http("POST", "/api/Patients", tok, {
                "fullName": "%s %s" % (TAG, label), "dateOfBirth": "1990-08-08T00:00:00",
                "gender": 1, "phoneNumber": "07%s" % suffix[:8], "address": "Số 17 phố Xuất Kho"})
            pid = payload(b).get("id")
            if not pid:
                raise SystemExit("không tạo được bệnh nhân: %s %s" % (st, b[:200]))
            pids.append(pid)
            http("POST", "/api/reception/register/fee", tok,
                 {"patientId": pid, "serviceType": 2, "roomId": room, "isPriority": False})
            mr = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE PatientId='%s' ORDER BY CreatedAt DESC" % pid)
            ex = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Examinations WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr)
            http("POST", "/api/examination/%s/start" % ex, tok, {})
            st, b = http("POST", "/api/examination/prescriptions", tok, {
                "examinationId": ex, "prescriptionType": 1, "paymentCategory": 2, "totalDays": 3,
                "items": [{"medicineId": med, "quantity": qty, "dosage": "1v x 2", "usage": "Uống",
                           "days": 3, "note": TAG}]})
            pres = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Prescriptions "
                       "WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr)
            if len(pres) != 36:
                raise SystemExit("không kê được đơn (%s): %s %s" % (label, st, b[:200]))
            sql("UPDATE Prescriptions SET WarehouseId='%s' WHERE Id='%s'" % (wh, pres))
            http("POST", "/api/pharmacy/prescriptions/%s/accept" % pres, tok, {})
            return pres

        # ── Cửa KHO: phát hai lần ───────────────────────────────────────────
        print("── cửa kho: /api/warehouse/issues/dispense-outpatient ──")
        seed_stock(100)
        pres1 = new_prescription("CUA-KHO")
        before1 = stock_left()
        st, b = http("POST", "/api/warehouse/issues/dispense-outpatient/%s" % pres1, tok, {})
        after1 = stock_left()
        case("phát lần đầu trừ đúng số đã kê", False, (before1 - after1) != 6.0,
             "HTTP %s · tổng tồn %s → %s (kê 6)" % (st, before1, after1))

        st, b = http("POST", "/api/warehouse/issues/dispense-outpatient/%s" % pres1, tok, {})
        after2 = stock_left()
        case("phát LẦN HAI không được trừ kho nữa", True, after2 == after1,
             "HTTP %s · tồn sau lần 1=%s · sau lần 2=%s · %s"
             % (st, after1, after2, msg_of(b)))

        # ── Cửa DƯỢC: phát hai lần ──────────────────────────────────────────
        print("\n── cửa dược: /api/pharmacy/prescriptions/{id}/dispense ──")
        seed_stock(100)
        pres2 = new_prescription("CUA-DUOC")
        before1 = stock_left()
        st, b = http("POST", "/api/pharmacy/prescriptions/%s/dispense" % pres2, tok, {})
        after1 = stock_left()
        case("phát lần đầu qua cửa dược", False, (before1 - after1) != 6.0,
             "HTTP %s · tổng tồn %s → %s (kê 6)" % (st, before1, after1))

        st, b = http("POST", "/api/pharmacy/prescriptions/%s/dispense" % pres2, tok, {})
        after2 = stock_left()
        case("phát LẦN HAI qua cửa dược", True, after2 == after1,
             "HTTP %s · tồn sau lần 1=%s · sau lần 2=%s · %s"
             % (st, after1, after2, msg_of(b)))

        # ── Đối chứng dương: đơn khác vẫn phát bình thường ──────────────────
        print("\n── đối chứng dương: đơn khác vẫn phát được ──")
        pres3 = new_prescription("DON-KHAC")
        before = stock_left()
        st, b = http("POST", "/api/warehouse/issues/dispense-outpatient/%s" % pres3, tok, {})
        after = stock_left()
        case("đơn thuốc khác vẫn phát được bình thường", False,
             after is None or before is None or (before - after) != 6.0,
             "HTTP %s · tồn trước=%s sau=%s (kỳ vọng giảm 6)" % (st, before, after))

    finally:
        cleanup(pids)
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"] else "hệ thống chặn / sai số nhưng phải cho qua"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_stockout_double_dispense.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_stockout_double_dispense.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
