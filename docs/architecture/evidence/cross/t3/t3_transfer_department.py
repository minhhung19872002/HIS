"""T3/#218 + T2/#217 — CHUYỂN KHOA nội trú: luật trạng thái, giường đích, và bàn giao lâm sàng.

`InpatientCompleteService.TransferDepartmentAsync` đổi khoa/phòng/giường của một lượt nội trú.
Đọc mã thấy ba chỗ đáng ngờ, bài này đo để biết chắc:

1. **Không kiểm trạng thái lượt nội trú.** `Admissions.Status`: 0 đang điều trị · 1 xuất viện ·
   2 chuyển viện · 3 tử vong · 4 bỏ về. Chuyển khoa không đọc cột này lần nào.

2. **Không kiểm giường đích còn trống.** Đây lại là một bất đối xứng hai cửa giống hệt vụ xét
   nghiệm: đường ĐỔI GIƯỜNG (`BedFeeReports.cs`) có kiểm và ném "Giường … đã có bệnh nhân", còn
   đường CHUYỂN KHOA thì tạo thẳng `BedAssignment` mới.

3. **Bàn giao lâm sàng bị bỏ rơi.** `DepartmentTransferDto` mang `TransferReason`,
   `DiagnosisOnTransfer`, `TreatmentSummary`, `ReceivingDoctorId` — grep toàn bộ mã nguồn
   `HIS.Infrastructure` thì không chỗ nào đọc bốn trường này, và không có bảng lịch sử chuyển khoa
   nào cả. Nếu đúng vậy thì bác sĩ viết tóm tắt điều trị lúc bàn giao xong nó bay mất, mà API vẫn
   trả 200 kèm một `AdmissionDto` hợp lệ — đúng kiểu lỗi mà bài đo đường-thuận-suôn-sẻ không thấy.

Tiền tố dữ liệu T3TRF, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3TRF"
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


def cleanup(patient_ids):
    for pid in [p for p in patient_ids if p]:
        sql("""
DECLARE @p uniqueidentifier = '%s';
DELETE dt FROM DepartmentTransfers dt JOIN Admissions a ON a.Id = dt.AdmissionId WHERE a.PatientId = @p;
DELETE ba FROM BedAssignments ba JOIN Admissions a ON a.Id = ba.AdmissionId WHERE a.PatientId = @p;
DELETE d FROM Discharges d JOIN Admissions a ON a.Id = d.AdmissionId WHERE a.PatientId = @p;
DELETE FROM Admissions WHERE PatientId = @p;
DELETE e FROM Examinations e JOIN MedicalRecords mr ON mr.Id = e.MedicalRecordId WHERE mr.PatientId = @p;
DELETE r FROM Receipts r WHERE r.PatientId = @p;
DELETE FROM MedicalRecords WHERE PatientId = @p;
DELETE FROM Patients WHERE Id = @p;
""" % pid)


def admit(tok, label, seq, room, dept, doc):
    """Dựng một bệnh nhân đã nhập viện, trả (patientId, admissionId)."""
    suffix = str(int(time.time()) + seq)[-6:]
    st, b = http("POST", "/api/Patients", tok, {
        "fullName": "%s %s" % (TAG, label), "dateOfBirth": "1980-01-0%dT00:00:00" % (seq + 1),
        "gender": 1, "phoneNumber": "03%s" % suffix.rjust(8, "0")[:8],
        "address": "Số %d phố Chuyển Khoa" % (seq + 1)})
    pid = payload(b).get("id")
    if not pid:
        raise SystemExit("không tạo được bệnh nhân %s: %s %s" % (label, st, b[:200]))
    http("POST", "/api/reception/register/fee", tok,
         {"patientId": pid, "serviceType": 2, "roomId": room, "isPriority": False})
    mr = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE PatientId='%s' ORDER BY CreatedAt DESC" % pid)
    ex = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Examinations WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr)
    http("POST", "/api/examination/%s/start" % ex, tok, {})
    http("POST", "/api/inpatient/admit-from-opd", tok, {
        "medicalRecordId": mr, "departmentId": dept, "roomId": room, "admissionType": 1,
        "diagnosisOnAdmission": "Viêm phổi", "reasonForAdmission": TAG, "attendingDoctorId": doc})
    adm = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Admissions WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr)
    if len(adm) != 36:
        raise SystemExit("không nhập viện được %s: %r" % (label, adm))
    return pid, adm


def free_bed(exclude=""):
    return sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Beds WHERE IsDeleted=0 AND IsActive=1 "
               "AND Id NOT IN (SELECT BedId FROM BedAssignments WHERE ReleasedAt IS NULL) "
               "%s ORDER BY BedCode" % ("AND Id <> '%s'" % exclude if exclude else ""))


def main():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    tok = payload(b)["token"]

    pids = []
    try:
        room = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Rooms WHERE IsDeleted=0 AND IsActive=1 ORDER BY RoomCode")
        doc = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0 ORDER BY CreatedAt")
        depts = sql("SELECT TOP 2 CAST(Id AS varchar(50)) FROM Departments WHERE IsDeleted=0 ORDER BY DepartmentCode").split("\n")
        dept_a = depts[0].strip()
        dept_b = (depts[1].strip() if len(depts) > 1 else dept_a)

        pid1, adm1 = admit(tok, "Nguyen Van Chuyen", 0, room, dept_a, doc)
        pids.append(pid1)
        bed1 = free_bed()
        http("POST", "/api/inpatient/assign-bed", tok, {"admissionId": adm1, "bedId": bed1, "note": TAG})

        # Bệnh nhân thứ hai đang NẰM ở giường đích, để thử va chạm giường.
        pid2, adm2 = admit(tok, "Tran Van Choán", 1, room, dept_a, doc)
        pids.append(pid2)
        bed2 = free_bed(exclude=bed1)
        http("POST", "/api/inpatient/assign-bed", tok, {"admissionId": adm2, "bedId": bed2, "note": TAG})
        print("lượt nội trú A=%s (giường %s) · B=%s (giường %s)\n" % (adm1, bed1[:8], adm2, bed2[:8]))

        def transfer(adm, target_bed, reason=TAG + "-LY-DO"):
            return http("POST", "/api/inpatient/transfer-department", tok, {
                "admissionId": adm, "targetDepartmentId": dept_b, "targetRoomId": room,
                "targetBedId": target_bed, "transferReason": reason,
                "diagnosisOnTransfer": "Viêm phổi nặng lên",
                "treatmentSummary": "Đã dùng kháng sinh 3 ngày, sốt chưa giảm.",
                "receivingDoctorId": doc})

        print("── chuyển khoa hợp lệ (phải CHO qua) ──")
        bed3 = free_bed()
        st, b = transfer(adm1, bed3)
        dept_now = sql("SELECT CAST(DepartmentId AS varchar(50)) FROM Admissions WHERE Id='%s'" % adm1)
        case("chuyển khoa cho lượt đang điều trị", False, dept_now.lower() != dept_b.lower(),
             "HTTP %s · khoa mới khớp=%s" % (st, dept_now.lower() == dept_b.lower()))

        # ── Bàn giao lâm sàng có được giữ lại không ─────────────────────────
        # Lượt đo đầu đoán tên cột là "Notes" — cột đó không tồn tại, câu SQL lỗi, và bài đo đọc
        # chuỗi báo lỗi thành "có dữ liệu" rồi báo ĐẠT. Nên giờ không đoán nữa: lấy DANH SÁCH THẬT
        # các cột chữ của hai bảng rồi dò hết, và hỏng danh sách thì dừng chứ không đo mù.
        cols = [c.strip() for c in sql(
            "SELECT TABLE_NAME + '.' + COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_NAME IN ('Admissions','MedicalRecords') "
            "AND DATA_TYPE IN ('nvarchar','varchar','text','ntext')").split("\n") if c.strip()]
        adm_cols = [c.split(".")[1] for c in cols if c.startswith("Admissions.")]
        mr_cols = [c.split(".")[1] for c in cols if c.startswith("MedicalRecords.")]
        if not adm_cols:
            raise SystemExit("không đọc được danh sách cột — bài đo sẽ mù, dừng lại")
        marker = "LY-DO"
        conds_a = " OR ".join("ISNULL(CAST(a.[%s] AS nvarchar(max)),'') LIKE '%%%s%%'" % (c, marker) for c in adm_cols)
        conds_m = " OR ".join("ISNULL(CAST(mr.[%s] AS nvarchar(max)),'') LIKE '%%%s%%'" % (c, marker) for c in mr_cols)
        in_old_cols = sql("SELECT COUNT(*) FROM Admissions a LEFT JOIN MedicalRecords mr ON mr.Id = a.MedicalRecordId "
                          "WHERE a.Id='%s' AND ((%s) OR (%s))" % (adm1, conds_a, conds_m or "1=0"))

        # Nay bàn giao có chỗ ở riêng (bảng DepartmentTransfers), nên đo bằng CỬA ĐỌC chính thức —
        # lưu được mà không đọc ra được thì vẫn coi như mất.
        st_h, b_h = http("GET", "/api/inpatient/department-transfers/%s" % adm1, tok)
        hist = payload(b_h) or []
        got = hist[0] if isinstance(hist, list) and hist else {}
        kept_all = (marker in (got.get("transferReason") or "")
                    and "kháng sinh 3 ngày" in (got.get("treatmentSummary") or "")
                    and (got.get("diagnosisOnTransfer") or "") != ""
                    and bool(got.get("receivingDoctorId")))
        case("lý do + tóm tắt điều trị đọc lại được", False, not kept_all,
             "HTTP %s · số lần chuyển trong lịch sử=%d · đủ 4 trường bàn giao=%s "
             "(dò thêm %d cột chữ cũ: %s chỗ)"
             % (st_h, len(hist) if isinstance(hist, list) else 0, kept_all, len(cols), in_old_cols or "0"))

        case("lịch sử ghi đúng khoa đi và khoa đến", False,
             not (str(got.get("toDepartmentId", "")).lower() == dept_b.lower()
                  and str(got.get("fromDepartmentId", "")).lower() == dept_a.lower()),
             "từ %s → %s" % (got.get("fromDepartmentName") or "?", got.get("toDepartmentName") or "?"))

        print("\n── giường đích ĐANG CÓ người ──")
        st, b = transfer(adm1, bed2)
        n_on_bed2 = sql("SELECT COUNT(*) FROM BedAssignments WHERE BedId='%s' AND ReleasedAt IS NULL" % bed2)
        case("chuyển vào giường đã có bệnh nhân khác", True, n_on_bed2 == "1",
             "HTTP %s · số người đang giữ giường đích=%s" % (st, n_on_bed2))

        # Đối chứng dương: cùng một luật, ở cửa CHUYỂN GIƯỜNG. Route thật là `transfer-bed`
        # (service `TransferBedAsync`) — lượt đầu gọi `change-bed` nên ăn 404 và ca đo vô nghĩa.
        print("\n── đối chứng: đường CHUYỂN GIƯỜNG có chặn không ──")
        n_before = sql("SELECT COUNT(*) FROM BedAssignments WHERE BedId='%s' AND ReleasedAt IS NULL" % bed2)
        st, b = http("POST", "/api/inpatient/transfer-bed", tok,
                     {"admissionId": adm2, "newBedId": bed2, "reason": TAG})
        n_after = sql("SELECT COUNT(*) FROM BedAssignments WHERE BedId='%s' AND ReleasedAt IS NULL" % bed2)
        case("chuyển giường vào giường đã có người", True, n_after == n_before,
             "HTTP %s · người giữ giường đích trước=%s sau=%s · %s"
             % (st, n_before, n_after, (payload(b) or {}).get("message", b[:70])))

        print("\n── sau khi đã XUẤT VIỆN ──")
        http("POST", "/api/inpatient/discharge", tok, {
            "admissionId": adm1, "dischargeDate": datetime.now().isoformat(timespec="seconds"),
            "dischargeType": 1, "dischargeCondition": 1, "dischargeDiagnosis": "Khỏi"})
        adm_status = sql("SELECT CAST(Status AS varchar(5)) FROM Admissions WHERE Id='%s'" % adm1)
        case("xuất viện đưa lượt sang trạng thái 1", False, adm_status != "1",
             "Admissions.Status=%s (1 = đã xuất viện)" % adm_status)

        dept_before = sql("SELECT CAST(DepartmentId AS varchar(50)) FROM Admissions WHERE Id='%s'" % adm1)
        bed4 = free_bed()
        st, b = transfer(adm1, bed4)
        dept_after = sql("SELECT CAST(DepartmentId AS varchar(50)) FROM Admissions WHERE Id='%s'" % adm1)
        n_new_bed = sql("SELECT COUNT(*) FROM BedAssignments WHERE AdmissionId='%s' AND ReleasedAt IS NULL" % adm1)
        case("chuyển khoa cho bệnh nhân ĐÃ XUẤT VIỆN", True,
             dept_after.lower() == dept_before.lower() and n_new_bed == "0",
             "HTTP %s · giường đang giữ sau khi chuyển=%s" % (st, n_new_bed))

    finally:
        cleanup(pids)
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"] else "hệ thống chặn / mất dữ liệu nhưng phải cho qua"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_transfer_department.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_transfer_department.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
