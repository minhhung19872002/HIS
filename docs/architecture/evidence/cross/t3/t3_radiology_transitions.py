"""T3 (#218) — bảng trạng thái của PHIẾU KẾT QUẢ chẩn đoán hình ảnh (`RadiologyReports.Status`).

Từ vựng đọc được trong code đang chạy:
    RadiologyReports.Status : 0 = Nháp · 1 = Sơ duyệt · 2 = Duyệt chính thức / đã ký số
    RadiologySignatureHistory.Status : 1 = Đã ký · 3 = Đã hủy ký

Hệ thống có sẵn hai đường ĐI RA khỏi trạng thái đã duyệt, tức là ý đồ nghiệp vụ rất rõ ràng:
`CancelApprovalAsync` (hủy duyệt → về nháp) và `CancelSignedResultAsync` (thu hồi chữ ký → về nháp).
Bài đo này hỏi: đường ghi kết quả (`results/enter`) có tôn trọng hai cửa đó không, hay sửa thẳng
được nội dung của một phiếu đã duyệt / đã ký.

Ca 5 là ca nặng nhất trong cả đợt T1-T4: nếu sửa được nội dung của phiếu ĐÃ KÝ SỐ mà lịch sử chữ ký
vẫn nguyên "đã ký", thì chữ ký đang bảo chứng cho một nội dung khác nội dung bác sĩ thực sự ký.

Đi đúng đường thật, không cấy thẳng vào DB: tiếp đón → chỉ định CĐHA → điều phối → đến nơi → thực
hiện (bước này mới bắc cầu sang phiếu CĐHA) → nhập kết quả. Nên bài đo phủ luôn mảnh "đường kết quả
CĐHA" mà #217 còn thiếu.

Tiền tố dữ liệu T3RIS, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3RIS"
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
    print("  %-46s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def cleanup(patient_id):
    if not patient_id:
        return
    sql("""
DECLARE @p uniqueidentifier = '%s';
DELETE sh FROM RadiologySignatureHistories sh JOIN RadiologyReports rr ON rr.Id = sh.RadiologyReportId
  JOIN RadiologyExams re ON re.Id = rr.RadiologyExamId JOIN RadiologyRequests rq ON rq.Id = re.RadiologyRequestId WHERE rq.PatientId = @p;
DELETE rr FROM RadiologyReports rr JOIN RadiologyExams re ON re.Id = rr.RadiologyExamId
  JOIN RadiologyRequests rq ON rq.Id = re.RadiologyRequestId WHERE rq.PatientId = @p;
DELETE re FROM RadiologyExams re JOIN RadiologyRequests rq ON rq.Id = re.RadiologyRequestId WHERE rq.PatientId = @p;
DELETE FROM RadiologyRequests WHERE PatientId = @p;
DELETE FROM RadiologyDispatches WHERE PatientId = @p;
DELETE srdp FROM ServiceRequestDetailParameters srdp JOIN ServiceRequestDetails srd ON srd.Id = srdp.ServiceRequestDetailId
  JOIN ServiceRequests sr ON sr.Id = srd.ServiceRequestId JOIN MedicalRecords mr ON mr.Id = sr.MedicalRecordId WHERE mr.PatientId = @p;
DELETE srd FROM ServiceRequestDetails srd JOIN ServiceRequests sr ON sr.Id = srd.ServiceRequestId
  JOIN MedicalRecords mr ON mr.Id = sr.MedicalRecordId WHERE mr.PatientId = @p;
DELETE sr FROM ServiceRequests sr JOIN MedicalRecords mr ON mr.Id = sr.MedicalRecordId WHERE mr.PatientId = @p;
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
        # ── Đi đúng đường: tiếp đón → chỉ định CĐHA → điều phối → thực hiện ──
        suffix = str(int(time.time()))[-6:]
        st, b = http("POST", "/api/Patients", tok, {
            "fullName": "%s Pham Van Chieu Chup" % TAG, "dateOfBirth": "1975-11-11T00:00:00",
            "gender": 1, "phoneNumber": "09%s" % suffix.rjust(8, "0")[:8],
            "address": "Số 7 phố Chiếu Chụp"})
        patient_id = payload(b).get("id")
        if not patient_id:
            raise SystemExit("không tạo được bệnh nhân: %s %s" % (st, b[:200]))

        room = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Rooms WHERE IsDeleted=0 AND IsActive=1 ORDER BY RoomCode")
        http("POST", "/api/reception/register/fee", tok,
             {"patientId": patient_id, "serviceType": 2, "roomId": room, "isPriority": False})
        mr_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE PatientId='%s' ORDER BY CreatedAt DESC" % patient_id)
        exam_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Examinations WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr_id)
        http("POST", "/api/examination/%s/start" % exam_id, tok, {})

        svc_row = sql("SELECT TOP 1 CAST(s.Id AS varchar(50)) + '|' + s.ServiceCode FROM Services s "
                      "JOIN ServiceGroups g ON g.Id = s.ServiceGroupId "
                      "WHERE s.IsDeleted=0 AND s.IsActive=1 AND g.GroupCode LIKE 'CDHA%' ORDER BY s.ServiceCode")
        svc_id, svc_code = (svc_row.split("|") + ["", ""])[:2]
        http("POST", "/api/examination/service-orders", tok, {
            "examinationId": exam_id, "diagnosisCode": "J18", "diagnosisName": "Viêm phổi",
            "services": [{"serviceId": svc_id, "quantity": 1, "paymentType": 2}],
            "autoSelectRoom": True})
        srd_id = sql("SELECT TOP 1 CAST(srd.Id AS varchar(50)) FROM ServiceRequestDetails srd "
                     "JOIN ServiceRequests sr ON sr.Id = srd.ServiceRequestId "
                     "WHERE sr.MedicalRecordId='%s' ORDER BY srd.CreatedAt DESC" % mr_id)
        if len(srd_id) != 36:
            raise SystemExit("không dựng được dòng chỉ định CĐHA: %r" % srd_id)

        st, b = http("POST", "/api/radiology-dispatch", tok,
                     {"serviceRequestDetailId": srd_id, "roomId": room, "priority": 1, "note": TAG})
        disp_id = (payload(b) or {}).get("id")
        if not disp_id:
            raise SystemExit("không điều phối được: %s %s" % (st, b[:200]))
        http("POST", "/api/radiology-dispatch/%s/mark-arrived" % disp_id, tok, {})
        http("POST", "/api/radiology-dispatch/%s/mark-performed" % disp_id, tok, {})

        req_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM RadiologyRequests "
                     "WHERE SourceServiceRequestDetailId='%s'" % srd_id)
        if len(req_id) != 36:
            raise SystemExit("bước 'thực hiện' không bắc cầu sang phiếu CĐHA: %r" % req_id)
        print("phiếu CĐHA %s · dịch vụ %s\n" % (req_id, svc_code))

        def enter(desc, concl):
            return http("POST", "/api/RISComplete/results/enter", tok,
                        {"orderItemId": req_id, "description": desc, "conclusion": concl})

        def report_state():
            row = sql("SELECT TOP 1 ISNULL(CAST(rr.Status AS varchar(5)),'?') + '|' + ISNULL(rr.Impression,'') + '|' + "
                      "CAST(rr.Id AS varchar(50)) FROM RadiologyReports rr "
                      "JOIN RadiologyExams re ON re.Id = rr.RadiologyExamId "
                      "WHERE re.RadiologyRequestId='%s' ORDER BY rr.CreatedAt DESC" % req_id)
            return (row.split("|") + ["", "", ""])[:3]

        print("── ghi kết quả lần đầu (phải CHO qua) ──")
        st, b = enter("Phổi hai bên sáng đều.", "KL-GOC")
        rstat, impr, report_id = report_state()
        case("nhập kết quả lần đầu vào phiếu nháp", False, impr != "KL-GOC",
             "HTTP %s · Status=%s (0 = nháp) · Kết luận=%r" % (st, rstat, impr))

        print("\n── sau khi DUYỆT chính thức ──")
        st, b = http("POST", "/api/RISComplete/results/%s/final-approve" % report_id, tok,
                     {"resultId": report_id, "note": TAG, "isFinalApproval": True})
        rstat, impr, _ = report_state()
        case("duyệt chính thức đưa phiếu sang trạng thái 2", False, rstat != "2",
             "HTTP %s · Status=%s" % (st, rstat))

        st, b = enter("Sửa trộm mô tả.", "KL-SUA-SAU-DUYET")
        rstat, impr, _ = report_state()
        case("sửa nội dung phiếu ĐÃ DUYỆT", True, impr != "KL-SUA-SAU-DUYET",
             "HTTP %s · Status=%s · Kết luận=%r" % (st, rstat, impr))

        print("\n── hủy duyệt rồi sửa (đối chứng dương: phải CHO qua) ──")
        http("POST", "/api/RISComplete/results/%s/cancel-approval" % report_id, tok, {"reason": TAG})
        st, b = enter("Mô tả sửa hợp lệ.", "KL-SUA-HOP-LE")
        rstat, impr, _ = report_state()
        case("sửa sau khi đã hủy duyệt", False, impr != "KL-SUA-HOP-LE",
             "HTTP %s · Status=%s (0 = nháp) · Kết luận=%r" % (st, rstat, impr))

        print("\n── sau khi KÝ SỐ ──")
        st, b = http("POST", "/api/RISComplete/results/sign", tok,
                     {"reportId": report_id, "signatureType": "DIGITAL"})
        signed_before = sql("SELECT COUNT(*) FROM RadiologySignatureHistories "
                            "WHERE RadiologyReportId='%s' AND Status=1" % report_id)
        rstat, impr, _ = report_state()
        case("ký số đưa phiếu sang trạng thái đã ký", False, not (rstat == "2" and signed_before == "1"),
             "HTTP %s · Status=%s · chữ ký còn hiệu lực=%s" % (st, rstat, signed_before))

        st, b = enter("Sửa trộm sau khi đã ký.", "KL-SUA-SAU-KY")
        rstat, impr, _ = report_state()
        signed_after = sql("SELECT COUNT(*) FROM RadiologySignatureHistories "
                           "WHERE RadiologyReportId='%s' AND Status=1" % report_id)
        case("sửa nội dung phiếu ĐÃ KÝ SỐ", True, impr != "KL-SUA-SAU-KY",
             "HTTP %s · Status=%s · Kết luận=%r · chữ ký còn hiệu lực=%s"
             % (st, rstat, impr, signed_after))

        # Lối vòng: `CancelApprovalAsync` đưa phiếu về nháp NHƯNG không đụng tới lịch sử chữ ký.
        # Nếu chỉ gác theo `Status` thì đi đường này vẫn sửa được nội dung dưới một chữ ký còn sống.
        print("\n── lối vòng: hủy DUYỆT (không thu hồi chữ ký) rồi sửa ──")
        http("POST", "/api/RISComplete/results/%s/cancel-approval" % report_id, tok, {"reason": TAG})
        st, b = enter("Sửa qua lối vòng.", "KL-LOI-VONG")
        rstat, impr, _ = report_state()
        still_signed = sql("SELECT COUNT(*) FROM RadiologySignatureHistories "
                           "WHERE RadiologyReportId='%s' AND Status=1" % report_id)
        case("sửa khi chữ ký vẫn còn hiệu lực", True, impr != "KL-LOI-VONG",
             "HTTP %s · Status=%s · Kết luận=%r · chữ ký còn hiệu lực=%s"
             % (st, rstat, impr, still_signed))

        print("\n── thu hồi chữ ký rồi sửa (đối chứng dương: phải CHO qua) ──")
        http("POST", "/api/RISComplete/results/cancel-signed", tok,
             {"reportId": report_id, "reason": TAG})
        st, b = enter("Mô tả sửa sau thu hồi.", "KL-SAU-THU-HOI")
        rstat, impr, _ = report_state()
        case("sửa sau khi đã thu hồi chữ ký", False, impr != "KL-SAU-THU-HOI",
             "HTTP %s · Status=%s (0 = nháp) · Kết luận=%r" % (st, rstat, impr))

    finally:
        cleanup(patient_id)
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"] else "hệ thống chặn nhưng phải cho qua"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_radiology_transitions.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_radiology_transitions.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
