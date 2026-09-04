"""T2 (#217) — luồng NỘI TRÚ từ nhập viện đến xuất viện, có khẳng định KẾT QUẢ.

Bổ sung mảnh còn thiếu của #217: lượt chạy trước phủ khám ngoại trú, bài này đi tiếp phần
"nội trú: nhập viện → điều trị → xuất viện".

Luồng: tạo bệnh nhân → tiếp đón → khám → nhập viện từ phòng khám → xếp giường → kê đơn nội trú →
xuất viện, và một luồng ngược (hủy xuất viện).

Cùng nguyên tắc với bài ngoại trú: gọi API rồi ĐỌC LẠI DB sau từng bước, khẳng định bản ghi sinh ra
đúng bảng nào và trạng thái nhảy đúng giá trị nào — không chỉ xem HTTP 200.

Dữ liệu mang tiền tố T2IPD và được dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T2IPD"
STEPS = []


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


def step(name, ok, detail):
    STEPS.append({"step": name, "pass": bool(ok), "detail": detail})
    print("  %-36s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def login():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    return payload(b)["token"]


def cleanup(patient_id):
    if not patient_id:
        return
    sql("""
DECLARE @p uniqueidentifier = '%s';
DELETE ba FROM BedAssignments ba JOIN Admissions a ON a.Id = ba.AdmissionId
  JOIN MedicalRecords mr ON mr.Id = a.MedicalRecordId WHERE mr.PatientId = @p;
DELETE pd FROM PrescriptionDetails pd JOIN Prescriptions pr ON pr.Id = pd.PrescriptionId
  JOIN MedicalRecords mr ON mr.Id = pr.MedicalRecordId WHERE mr.PatientId = @p;
DELETE pr FROM Prescriptions pr JOIN MedicalRecords mr ON mr.Id = pr.MedicalRecordId WHERE mr.PatientId = @p;
DELETE sr FROM ServiceRequests sr JOIN MedicalRecords mr ON mr.Id = sr.MedicalRecordId WHERE mr.PatientId = @p;
DELETE a FROM Admissions a JOIN MedicalRecords mr ON mr.Id = a.MedicalRecordId WHERE mr.PatientId = @p;
DELETE e FROM Examinations e JOIN MedicalRecords mr ON mr.Id = e.MedicalRecordId WHERE mr.PatientId = @p;
DELETE r FROM Receipts r WHERE r.PatientId = @p;
DELETE p FROM Payments p WHERE p.PatientId = @p;
DELETE FROM MedicalRecords WHERE PatientId = @p;
DELETE FROM Patients WHERE Id = @p;
DELETE FROM InventoryItems WHERE BatchNumber = 'T2IPD';
""" % patient_id)


def main():
    tok = login()
    patient_id = None
    try:
        suffix = str(int(time.time()))[-6:]
        st, b = http("POST", "/api/Patients", tok, {
            "fullName": "%s Tran Thi Noi Tru" % TAG, "dateOfBirth": "1978-03-03T00:00:00",
            "gender": 2, "phoneNumber": "08%s" % suffix.rjust(8, "0")[:8],
            "address": "Số 2 phố Nội Trú",
        })
        pat = payload(b)
        patient_id = pat.get("id") or pat.get("Id")
        if not step("1. Tạo bệnh nhân", st in (200, 201) and bool(patient_id),
                    "HTTP %s · mã=%s" % (st, pat.get("patientCode"))):
            return

        room = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Rooms WHERE IsDeleted=0 AND IsActive=1 ORDER BY RoomCode")
        st, b = http("POST", "/api/reception/register/fee", tok,
                     {"patientId": patient_id, "serviceType": 2, "roomId": room, "isPriority": False})
        mr_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE PatientId='%s' ORDER BY CreatedAt DESC" % patient_id)
        if not step("2. Tiếp đón tạo hồ sơ", st in (200, 201) and bool(mr_id), "HTTP %s · hồ sơ %s" % (st, mr_id)):
            return

        exam_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Examinations WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr_id)
        http("POST", "/api/examination/%s/start" % exam_id, tok, {})

        # ── Nhập viện từ phòng khám ─────────────────────────────────────────
        dept = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Departments WHERE IsDeleted=0 ORDER BY DepartmentCode")
        doc = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0 ORDER BY CreatedAt")
        st, b = http("POST", "/api/inpatient/admit-from-opd", tok, {
            "medicalRecordId": mr_id, "departmentId": dept, "roomId": room,
            "admissionType": 1, "diagnosisOnAdmission": "Viêm phổi",
            "reasonForAdmission": "Sốt cao, khó thở", "attendingDoctorId": doc,
        })
        adm_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Admissions WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr_id)
        if not step("3. Nhập viện từ phòng khám", st in (200, 201) and bool(adm_id),
                    "HTTP %s · admissionId=%s · %s" % (st, adm_id or "KHÔNG CÓ", b[:90].replace(chr(10), " "))):
            return

        adm_status = sql("SELECT CAST(Status AS varchar(5)) FROM Admissions WHERE Id='%s'" % adm_id)
        step("4. Lượt nội trú ở trạng thái điều trị", adm_status == "0",
             "Admissions.Status=%s (0 = đang điều trị)" % adm_status)

        # ── Xếp giường ──────────────────────────────────────────────────────
        bed = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Beds WHERE IsDeleted=0 AND IsActive=1 "
                  "AND Id NOT IN (SELECT BedId FROM BedAssignments WHERE ReleasedAt IS NULL) ORDER BY BedCode")
        st, b = http("POST", "/api/inpatient/assign-bed", tok,
                     {"admissionId": adm_id, "bedId": bed, "note": TAG})
        n_bed = sql("SELECT COUNT(*) FROM BedAssignments WHERE AdmissionId='%s' AND ReleasedAt IS NULL" % adm_id)
        step("5. Xếp giường", st in (200, 201) and n_bed == "1",
             "HTTP %s · BedAssignments đang giữ=%s · %s" % (st, n_bed, b[:80].replace(chr(10), " ")))

        # ── Kê đơn nội trú ──────────────────────────────────────────────────
        med = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Medicines WHERE IsDeleted=0 AND IsActive=1 ORDER BY MedicineCode")
        st, b = http("POST", "/api/inpatient/prescriptions", tok, {
            "admissionId": adm_id, "prescriptionType": 2, "paymentCategory": 2, "totalDays": 2,
            "items": [{"medicineId": med, "quantity": 4, "days": 2, "dosage": "1 viên",
                       "frequency": "2 lần/ngày", "paymentType": 2}],
        })
        n_pres = sql("SELECT COUNT(*) FROM Prescriptions WHERE MedicalRecordId='%s'" % mr_id)
        step("6. Kê đơn nội trú", st in (200, 201) and n_pres.isdigit() and int(n_pres) >= 1,
             "HTTP %s · Prescriptions=%s · %s" % (st, n_pres, b[:80].replace(chr(10), " ")))

        # ── Cấp phát đơn nội trú trước khi xuất viện ────────────────────────
        # Lượt chạy đầu bỏ qua bước này và xuất viện bị chặn với đúng lý do
        # "Còn 1 đơn thuốc chưa cấp" — guard ĐÚNG, lỗi là ở bài test. Muốn đi hết luồng thì phải
        # cấp phát cho xong, và muốn cấp phát thì phải có tồn kho.
        pres_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Prescriptions WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr_id)
        wh = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Warehouses WHERE IsActive=1 AND IsDeleted=0 AND WarehouseType=2 ORDER BY WarehouseName")
        sql("""
DELETE FROM InventoryItems WHERE BatchNumber='%s';
INSERT INTO InventoryItems (Id, WarehouseId, ItemType, MedicineId, BatchNumber, ExpiryDate, Quantity,
  ReservedQuantity, ImportPrice, UnitPrice, IsLocked, CreatedAt, IsDeleted)
VALUES (NEWID(), '%s', N'Medicine', '%s', '%s', DATEADD(year, 2, SYSUTCDATETIME()), 100, 0, 1000, 1500, 0, SYSUTCDATETIME(), 0);
""" % (TAG, wh, med, TAG))
        http("POST", "/api/pharmacy/prescriptions/%s/accept" % pres_id, tok, {})
        st, b = http("POST", "/api/pharmacy/prescriptions/%s/dispense" % pres_id, tok, {})
        disp = sql("SELECT CAST(IsDispensed AS varchar(5)) FROM Prescriptions WHERE Id='%s'" % pres_id)
        step("7. Cấp phát đơn nội trú", st == 200 and disp == "1",
             "HTTP %s · IsDispensed=%s" % (st, disp))

        # ── Xuất viện ───────────────────────────────────────────────────────
        st, b = http("POST", "/api/inpatient/discharge", tok, {
            "admissionId": adm_id, "dischargeDate": datetime.now().isoformat(timespec="seconds"),
            "dischargeType": 1, "dischargeCondition": 1,
            "dischargeDiagnosisCode": "J18.9", "dischargeDiagnosis": "Viêm phổi",
        })
        adm_status = sql("SELECT CAST(Status AS varchar(5)) FROM Admissions WHERE Id='%s'" % adm_id)
        step("8. Xuất viện", st in (200, 201) and adm_status == "1",
             "HTTP %s · Admissions.Status=%s (1 = đã xuất viện) · %s" % (st, adm_status, b[:80].replace(chr(10), " ")))

        released = sql("SELECT COUNT(*) FROM BedAssignments WHERE AdmissionId='%s' AND ReleasedAt IS NOT NULL" % adm_id)
        step("9. Xuất viện trả giường", released == "1",
             "BedAssignments đã trả=%s (kỳ vọng 1)" % released)

        # ── Luồng ngược: hủy xuất viện ──────────────────────────────────────
        # Endpoint nhận [FromBody] string — gửi object {} sẽ bị model-binder từ chối 400.
        st, b = http("POST", "/api/inpatient/cancel-discharge/%s" % adm_id, tok, "%s huỷ xuất viện" % TAG)
        adm_status = sql("SELECT CAST(Status AS varchar(5)) FROM Admissions WHERE Id='%s'" % adm_id)
        step("10. Hủy xuất viện đưa về điều trị", st in (200, 201) and adm_status == "0",
             "HTTP %s · Admissions.Status=%s (kỳ vọng 0) · %s" % (st, adm_status, b[:80].replace(chr(10), " ")))

    finally:
        cleanup(patient_id)
        ok = sum(1 for s in STEPS if s["pass"])
        print("\n%d/%d bước đạt" % (ok, len(STEPS)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "steps": STEPS},
                  open(os.path.join(HERE, "t2_inpatient_happy_path.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t2_inpatient_happy_path.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
