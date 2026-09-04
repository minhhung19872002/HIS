"""T3 (#218) + T2 (#217) — CA MỔ: bắt đầu, kết thúc, và tường trình phẫu thuật có được giữ không.

Hai bảng trạng thái đi song song:
    SurgeryRequests.Status  : 1 đã duyệt/lên lịch · 2 đang mổ · 3 hoàn thành · 4 hủy/từ chối
    SurgerySchedules.Status : 2 đang chuẩn bị · 3 đang mổ · 4 hoàn thành

Đọc `SurgeryOperationServiceImpl.Execution.cs` thấy ba chỗ đáng ngờ:

1. **`StartSurgeryAsync` không kiểm trạng thái gì cả.** Đặt thẳng `Status = 3` và **tạo mới một
   `SurgeryRecord`** mỗi lần gọi. Gọi hai lần là có hai biên bản mổ cho một ca.

2. **`CompleteSurgeryAsync` cũng không kiểm trạng thái**, và phần ghi tường trình nằm trong
   `if (schedule.SurgeryRecord != null)`. Mà `SurgeryRecord` chỉ được tạo ở bước BẮT ĐẦU. Nên kết
   thúc một ca chưa từng bắt đầu thì **chẩn đoán sau mổ, mô tả, tai biến bay hết**, mà API vẫn trả
   200. Cùng loại lỗi với vụ bàn giao chuyển khoa: mọi thứ đều "thành công", chỉ có thứ bác sĩ gõ
   vào là biến mất.

3. **`StartSurgeryAsync` trả 200 kèm DTO rỗng khi không tìm thấy lịch mổ.** Chú thích ngay trong
   file ghi rõ đợt sửa 2026-06-12 đã bỏ kiểu "success giả" này — nhưng chỉ sửa ở
   `CompleteSurgeryAsync`, còn hàm anh em ngay bên trên thì bỏ sót.

Tiền tố dữ liệu T3PTT, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3PTT"
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
    print("  %-50s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def cleanup(patient_id):
    if not patient_id:
        return
    sql("""
DECLARE @p uniqueidentifier = '%s';
DELETE rec FROM SurgeryRecords rec JOIN SurgerySchedules sch ON sch.Id = rec.SurgeryScheduleId
  JOIN SurgeryRequests req ON req.Id = sch.SurgeryRequestId
  JOIN MedicalRecords mr ON mr.Id = req.MedicalRecordId WHERE mr.PatientId = @p;
DELETE sch FROM SurgerySchedules sch JOIN SurgeryRequests req ON req.Id = sch.SurgeryRequestId
  JOIN MedicalRecords mr ON mr.Id = req.MedicalRecordId WHERE mr.PatientId = @p;
DELETE req FROM SurgeryRequests req JOIN MedicalRecords mr ON mr.Id = req.MedicalRecordId WHERE mr.PatientId = @p;
DELETE e FROM Examinations e JOIN MedicalRecords mr ON mr.Id = e.MedicalRecordId WHERE mr.PatientId = @p;
DELETE r FROM Receipts r WHERE r.PatientId = @p;
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
            "fullName": "%s Vu Van Phau Thuat" % TAG, "dateOfBirth": "1985-06-06T00:00:00",
            "gender": 1, "phoneNumber": "06%s" % suffix.rjust(8, "0")[:8],
            "address": "Số 13 phố Phẫu Thuật"})
        patient_id = payload(b).get("id")
        if not patient_id:
            raise SystemExit("không tạo được bệnh nhân: %s %s" % (st, b[:200]))

        room = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Rooms WHERE IsDeleted=0 AND IsActive=1 ORDER BY RoomCode")
        http("POST", "/api/reception/register/fee", tok,
             {"patientId": patient_id, "serviceType": 2, "roomId": room, "isPriority": False})
        mr_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE PatientId='%s' ORDER BY CreatedAt DESC" % patient_id)
        svc_id = sql("SELECT TOP 1 CAST(s.Id AS varchar(50)) FROM Services s JOIN ServiceGroups g ON g.Id = s.ServiceGroupId "
                     "WHERE s.IsDeleted=0 AND s.IsActive=1 AND g.GroupCode LIKE 'PTTT%' ORDER BY s.ServiceCode")
        if len(svc_id) != 36:
            svc_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Services WHERE IsDeleted=0 AND IsActive=1 ORDER BY ServiceCode")
        or_room = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM OperatingRooms WHERE IsDeleted=0 ORDER BY CreatedAt")
        if len(or_room) != 36:
            or_room = room

        def new_surgery(label):
            """Tạo yêu cầu → duyệt → lên lịch. Trả surgeryRequestId."""
            st, b = http("POST", "/api/SurgeryComplete/requests", tok, {
                "medicalRecordId": mr_id, "surgeryServiceId": svc_id,
                "surgeryType": 1, "surgeryClass": 1, "surgeryNature": 1,
                "preOperativeDiagnosis": "%s %s" % (TAG, label), "anesthesiaType": 1,
                "scheduledDate": (datetime.now() + timedelta(days=1)).isoformat(timespec="seconds"),
                "operatingRoomId": or_room, "notes": TAG})
            sid = (payload(b) or {}).get("id")
            if not sid:
                raise SystemExit("không tạo được yêu cầu mổ (%s): %s %s" % (label, st, b[:200]))
            http("POST", "/api/SurgeryComplete/approve", tok,
                 {"surgeryId": sid, "isApproved": True, "notes": TAG})
            http("POST", "/api/SurgeryComplete/schedule", tok, {
                "surgeryId": sid, "scheduledDate": (datetime.now() + timedelta(days=1)).isoformat(timespec="seconds"),
                "operatingRoomId": or_room, "estimatedDurationMinutes": 60})
            return sid

        def start(sid):
            return http("POST", "/api/SurgeryComplete/start", tok,
                        {"surgeryId": sid, "startTime": datetime.now().isoformat(timespec="seconds")})

        def complete(sid, marker):
            return http("POST", "/api/SurgeryComplete/complete", tok, {
                "surgeryId": sid, "endTime": datetime.now().isoformat(timespec="seconds"),
                "postOperativeDiagnosis": marker, "postOperativeIcdCode": "K35",
                "description": "%s mô tả" % marker, "conclusion": "%s kết luận" % marker,
                "complications": "%s tai biến" % marker})

        def record_count(sid):
            return sql("SELECT COUNT(*) FROM SurgeryRecords rec JOIN SurgerySchedules sch ON sch.Id = rec.SurgeryScheduleId "
                       "WHERE sch.SurgeryRequestId='%s'" % sid)

        def postop(sid):
            return sql("SELECT TOP 1 ISNULL(rec.PostOpDiagnosis,'') FROM SurgeryRecords rec "
                       "JOIN SurgerySchedules sch ON sch.Id = rec.SurgeryScheduleId "
                       "WHERE sch.SurgeryRequestId='%s' ORDER BY rec.CreatedAt DESC" % sid)

        def req_status(sid):
            return sql("SELECT ISNULL(CAST(Status AS varchar(5)),'?') FROM SurgeryRequests WHERE Id='%s'" % sid)

        # ── Đường bình thường (đối chứng dương) ─────────────────────────────
        print("── ca mổ bình thường (phải CHẠY) ──")
        s1 = new_surgery("BINH-THUONG")
        st, b = start(s1)
        n1 = record_count(s1)
        case("bắt đầu ca mổ đã lên lịch", False, not (st in (200, 201) and n1 == "1"),
             "HTTP %s · số biên bản mổ=%s" % (st, n1))

        st, b = complete(s1, "KL-GOC")
        case("kết thúc ca mổ và tường trình được lưu", False, postop(s1) != "KL-GOC",
             "HTTP %s · chẩn đoán sau mổ=%r · trạng thái yêu cầu=%s" % (st, postop(s1), req_status(s1)))

        # ── Kết thúc một ca CHƯA TỪNG BẮT ĐẦU ───────────────────────────────
        print("\n── kết thúc ca chưa từng bắt đầu ──")
        s2 = new_surgery("CHUA-BAT-DAU")
        st, b = complete(s2, "KL-MAT")
        n2 = record_count(s2)
        got = postop(s2)
        # Chặn = từ chối. Cho qua mà GIỮ tường trình cũng chấp nhận được. Cái KHÔNG chấp nhận được là
        # trả 200 rồi vứt hết tường trình đi — đó mới là thiệt hại.
        kept_or_refused = (st not in (200, 201)) or (got == "KL-MAT")
        case("tường trình không bị vứt khi chưa bắt đầu", False, not kept_or_refused,
             "HTTP %s · số biên bản=%s · chẩn đoán sau mổ=%r" % (st, n2, got))

        # ── Bắt đầu HAI LẦN ─────────────────────────────────────────────────
        print("\n── bắt đầu ca mổ hai lần ──")
        s3 = new_surgery("HAI-LAN")
        start(s3)
        n_before = record_count(s3)
        st, b = start(s3)
        n_after = record_count(s3)
        case("bắt đầu lần hai không đẻ thêm biên bản", True, n_after == n_before,
             "HTTP %s · số biên bản trước=%s sau=%s" % (st, n_before, n_after))

        # ── Bắt đầu một ca ĐÃ HỦY ───────────────────────────────────────────
        print("\n── ca mổ đã hủy ──")
        s4 = new_surgery("DA-HUY")
        st_c, _ = http("POST", "/api/SurgeryComplete/%s/cancel" % s4, tok, {"reason": TAG})
        st_before = req_status(s4)
        st, b = start(s4)
        st_after = req_status(s4)
        case("hủy ca mổ đưa yêu cầu sang trạng thái 4", False, st_before != "4",
             "HTTP %s · trạng thái=%s" % (st_c, st_before))
        case("bắt đầu một ca mổ ĐÃ HỦY", True, st_after == "4",
             "HTTP %s · trạng thái sau=%s (4 = vẫn đang hủy)" % (st, st_after))

        # ── id không tồn tại ────────────────────────────────────────────────
        print("\n── id ca mổ không tồn tại ──")
        st, b = start(GHOST)
        case("bắt đầu ca mổ với id không có (phải báo lỗi)", True, st not in (200, 201),
             "HTTP %s · %s" % (st, (payload(b) or {}).get("message", b[:70])))

        # ── Sáu endpoint CẬP NHẬT tường trình ───────────────────────────────
        # Đọc `SurgeryOperationServiceImpl.Execution.cs` thấy cả sáu hàm chỉ đọc lại ca mổ rồi trả
        # về, KHÔNG ghi gì. Đo để biết chắc: gọi endpoint, rồi đọc thẳng DB xem có đổi không.
        # Một endpoint ghi trả 200 mà không lưu gì là dạng nguy hiểm nhất — bác sĩ tin là đã lưu.
        print("\n── các endpoint cập nhật tường trình ──")
        s5 = new_surgery("CAP-NHAT")
        start(s5)
        complete(s5, "KL-TRUOC-KHI-SUA")

        def rec_field(sid, col):
            return sql("SELECT TOP 1 ISNULL(CAST(rec.[%s] AS nvarchar(max)),'') FROM SurgeryRecords rec "
                       "JOIN SurgerySchedules sch ON sch.Id = rec.SurgeryScheduleId "
                       "WHERE sch.SurgeryRequestId='%s' ORDER BY rec.CreatedAt DESC" % (col, sid))

        def req_field(sid, col):
            return sql("SELECT ISNULL(CAST([%s] AS nvarchar(max)),'') FROM SurgeryRequests WHERE Id='%s'" % (col, sid))

        st, b = http("PUT", "/api/SurgeryComplete/%s/post-diagnosis" % s5, tok,
                     {"diagnosis": "SUA-SAU-MO", "icdCode": "K35.8"})
        got = rec_field(s5, "PostOpDiagnosis")
        case("sửa chẩn đoán SAU mổ được lưu", False, got != "SUA-SAU-MO",
             "HTTP %s · trong DB=%r" % (st, got))

        st, b = http("PUT", "/api/SurgeryComplete/%s/pre-diagnosis" % s5, tok,
                     {"diagnosis": "SUA-TRUOC-MO", "icdCode": "K35.2"})
        got = req_field(s5, "PreOpDiagnosis")
        case("sửa chẩn đoán TRƯỚC mổ được lưu", False, got != "SUA-TRUOC-MO",
             "HTTP %s · trong DB=%r" % (st, got))

        st, b = http("PUT", "/api/SurgeryComplete/%s/execution" % s5, tok, {
            "surgeryId": s5, "postOperativeDiagnosis": "EXEC-SAU-MO", "postOperativeIcdCode": "K35.3",
            "preOperativeDiagnosis": "EXEC-TRUOC-MO", "preOperativeIcdCode": "K35.1",
            "surgeryMethod": "Nội soi", "anesthesiaType": 2,
            "startTime": datetime.now().isoformat(timespec="seconds"),
            "description": "EXEC-mô-tả", "conclusion": "EXEC-kết-luận",
            "complications": "EXEC-tai-biến", "teamMembers": []})
        got = rec_field(s5, "PostOpDiagnosis")
        case("cập nhật thông tin thực hiện được lưu", False, got != "EXEC-SAU-MO",
             "HTTP %s · chẩn đoán sau mổ trong DB=%r" % (st, got))

        # Kết luận mổ: `CompleteSurgeryDto` có trường `Conclusion` nhưng `CompleteSurgeryAsync`
        # không hề ánh xạ nó, và `SurgeryRecords` cũng không có cột nào tên như vậy. Tức là kết luận
        # mổ bị rơi ngay trên ĐƯỜNG THUẬN, không cần tình huống lạ nào.
        has_col = sql("SELECT CASE WHEN COL_LENGTH('dbo.SurgeryRecords','Conclusion') IS NULL "
                      "THEN 'KHONG' ELSE 'CO' END")
        got = rec_field(s5, "Conclusion") if has_col == "CO" else ""
        case("kết luận mổ có chỗ lưu và được lưu", False, has_col != "CO" or not got,
             "cột Conclusion=%s · giá trị=%r" % (has_col, got))

        st, b = http("PUT", "/api/SurgeryComplete/%s/tt50-info" % s5, tok,
                     {"surgeryId": s5, "surgeryMethod": "TT50-PP", "anesthesiaType": 3})
        # Không đòi nó phải LƯU (cần thiết kế), nhưng KHÔNG được trả 200 như thể đã lưu.
        case("khai báo TT50 không được im lặng báo thành công", True, st not in (200, 201),
             "HTTP %s · %s" % (st, (payload(b) or {}).get("message", b[:60])))

        # Ekip mổ nay được cài đặt thật, nên điều phải kiểm KHÔNG còn là "đừng im lặng báo thành
        # công" mà là "có lưu thật không". Đọc thẳng DB, không tin mã HTTP.
        doc_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0 ORDER BY CreatedAt")
        st, b = http("PUT", "/api/SurgeryComplete/%s/team" % s5, tok,
                     [{"staffId": doc_id, "role": 1}])
        n_team = sql("SELECT COUNT(*) FROM SurgeryTeamMembers tm JOIN SurgeryRecords rec ON rec.Id = tm.SurgeryRecordId "
                     "JOIN SurgerySchedules sch ON sch.Id = rec.SurgeryScheduleId "
                     "WHERE sch.SurgeryRequestId='%s' AND tm.IsDeleted=0" % s5)
        case("cập nhật ekip mổ được lưu thật", False, n_team in ("0", ""),
             "HTTP %s · số thành viên ekip trong DB=%s" % (st, n_team))

    finally:
        cleanup(patient_id)
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"] else "hệ thống chặn / mất dữ liệu nhưng phải cho qua"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_surgery_transitions.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_surgery_transitions.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
