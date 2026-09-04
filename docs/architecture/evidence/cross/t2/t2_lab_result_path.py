"""T2 (#217) — đường KẾT QUẢ XÉT NGHIỆM: chỉ định → lấy mẫu → máy trả kết quả → bác sĩ đọc được.

Mảnh cuối cùng của luồng chính mà hai bài trước chưa chạm. Không có endpoint "nhập kết quả bằng
tay": kết quả về từ máy phân tích qua HL7 (ORU^R01), và `LISComplete/mock-receive/{analyzerId}` là
cửa mô phỏng chính thức cho đường đó.

Cách hệ thống khớp kết quả với chỉ định (LISCompleteService.Worklist):
    ServiceRequestDetails.SampleBarcode == OBR sample id
    AND Service.ServiceCode == OBX test code
    AND ServiceRequest.RequestType == 1 (xét nghiệm)

Nên bài đo đi đúng chuỗi đó: đặt chỉ định xét nghiệm thật → dán mã vạch cho mẫu → bắn kết quả từ
"máy" → khẳng định kết quả ĐÃ vào đúng dòng chỉ định, trạng thái nhảy sang "có kết quả", và cờ
bất thường được tính. Thêm một lượt bắn với mã vạch lạ để xem hệ thống có nuốt lặng không.

Dữ liệu mang tiền tố T2LAB, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T2LAB"
BARCODE = "T2LAB-BC-001"
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
    print("  %-38s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def login():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    return payload(b)["token"]


def cleanup(patient_id):
    sql("DELETE FROM ServiceRequestDetailParameters WHERE ParameterCode LIKE 'XN%%' AND "
        "ServiceRequestDetailId IN (SELECT Id FROM ServiceRequestDetails WHERE SampleBarcode='%s');" % BARCODE)
    if patient_id:
        sql("""
DECLARE @p uniqueidentifier = '%s';
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
    tok = login()
    patient_id = None
    try:
        suffix = str(int(time.time()))[-6:]
        st, b = http("POST", "/api/Patients", tok, {
            "fullName": "%s Le Van Xet Nghiem" % TAG, "dateOfBirth": "1990-07-07T00:00:00",
            "gender": 1, "phoneNumber": "07%s" % suffix.rjust(8, "0")[:8], "address": "Số 3 phố Xét Nghiệm",
        })
        pat = payload(b)
        patient_id = pat.get("id") or pat.get("Id")
        if not step("1. Tạo bệnh nhân", st in (200, 201) and bool(patient_id), "HTTP %s · mã=%s" % (st, pat.get("patientCode"))):
            return

        room = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Rooms WHERE IsDeleted=0 AND IsActive=1 ORDER BY RoomCode")
        http("POST", "/api/reception/register/fee", tok,
             {"patientId": patient_id, "serviceType": 2, "roomId": room, "isPriority": False})
        mr_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE PatientId='%s' ORDER BY CreatedAt DESC" % patient_id)
        exam_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Examinations WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr_id)
        if not step("2. Tiếp đón + lượt khám", bool(mr_id) and bool(exam_id), "hồ sơ %s · lượt khám %s" % (mr_id, exam_id)):
            return
        http("POST", "/api/examination/%s/start" % exam_id, tok, {})

        # ── Chỉ định một xét nghiệm THẬT ────────────────────────────────────
        svc_row = sql("SELECT TOP 1 CAST(s.Id AS varchar(50)) + '|' + s.ServiceCode FROM Services s "
                      "JOIN ServiceGroups g ON g.Id = s.ServiceGroupId "
                      "WHERE s.IsDeleted=0 AND s.IsActive=1 AND g.GroupCode LIKE 'XN%' ORDER BY s.ServiceCode")
        svc_id, svc_code = (svc_row.split("|") + ["", ""])[:2]
        st, b = http("POST", "/api/examination/service-orders", tok, {
            "examinationId": exam_id, "diagnosisCode": "E11", "diagnosisName": "Đái tháo đường",
            "services": [{"serviceId": svc_id, "quantity": 1, "paymentType": 2}],
            "autoSelectRoom": True,
        })
        srd = sql("SELECT TOP 1 CAST(srd.Id AS varchar(50)) + '|' + CAST(sr.RequestType AS varchar(5)) "
                  "FROM ServiceRequestDetails srd JOIN ServiceRequests sr ON sr.Id = srd.ServiceRequestId "
                  "WHERE sr.MedicalRecordId='%s' ORDER BY srd.CreatedAt DESC" % mr_id)
        srd_id, req_type = (srd.split("|") + ["", ""])[:2]
        if not step("3. Chỉ định xét nghiệm", st in (200, 201) and len(srd_id) == 36,
                    "HTTP %s · dịch vụ %s · RequestType=%s (1 = xét nghiệm)" % (st, svc_code, req_type)):
            return

        # ── Dán mã vạch cho mẫu ─────────────────────────────────────────────
        # Khâu lấy mẫu ở quầy sinh mã vạch; ở đây gán thẳng để đo đúng đoạn máy-trả-kết-quả.
        sql("UPDATE ServiceRequestDetails SET SampleBarcode='%s' WHERE Id='%s'" % (BARCODE, srd_id))
        got = sql("SELECT ISNULL(SampleBarcode,'') FROM ServiceRequestDetails WHERE Id='%s'" % srd_id)
        step("4. Dán mã vạch cho mẫu", got == BARCODE, "SampleBarcode=%s" % got)

        # ── Máy phân tích trả kết quả ───────────────────────────────────────
        analyzer = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM LabAnalyzers WHERE IsDeleted=0 ORDER BY CreatedAt")
        st, b = http("POST", "/api/LISComplete/mock-receive/%s" % analyzer, tok, [{
            "sampleBarcode": BARCODE, "testCode": svc_code, "result": "9.9",
            "unit": "mmol/L", "flag": "H", "resultTime": datetime.now().isoformat(timespec="seconds"),
        }])
        after = sql("SELECT ISNULL(CAST(Status AS varchar(5)),'?') + '|' + ISNULL(Result,'') "
                    "FROM ServiceRequestDetails WHERE Id='%s'" % srd_id)
        st_val, res_val = (after.split("|") + ["", ""])[:2]
        step("5. Kết quả vào đúng dòng chỉ định", st in (200, 201) and res_val == "9.9" and st_val == "2",
             "HTTP %s · Status=%s (2 = có KQ) · Result=%s · %s" % (st, st_val, res_val, b[:80].replace(chr(10), " ")))

        flag = sql("SELECT TOP 1 ISNULL(Flag,'') FROM ServiceRequestDetailParameters WHERE ServiceRequestDetailId='%s'" % srd_id)
        # Cờ do MÁY gửi phải thắng cờ tự suy từ khoảng tham chiếu — nếu ra khác thì cờ đã bị
        # rơi mất trên đường (bản cũ đặt nhầm cờ vào OBX-7 nên hệ thống tự suy ra "L").
        step("6. Cờ của máy được giữ nguyên", flag == "H",
             "Flag=%s (máy gửi H)" % (flag or "TRỐNG"))

        # ── Mã vạch lạ: không được nuốt lặng ────────────────────────────────
        st, b = http("POST", "/api/LISComplete/mock-receive/%s" % analyzer, tok, [{
            "sampleBarcode": "%s-KHONG-CO" % BARCODE, "testCode": svc_code, "result": "1.1",
            "unit": "mmol/L", "flag": "N", "resultTime": datetime.now().isoformat(timespec="seconds"),
        }])
        d = payload(b) or {}
        matched = d.get("matchedCount", d.get("MatchedCount"))
        step("7. Mã vạch lạ không khớp nhầm ai", st in (200, 201) and matched in (0, "0"),
             "HTTP %s · matchedCount=%s · %s" % (st, matched, b[:110].replace(chr(10), " ")))

    finally:
        cleanup(patient_id)
        ok = sum(1 for s in STEPS if s["pass"])
        print("\n%d/%d bước đạt" % (ok, len(STEPS)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "steps": STEPS},
                  open(os.path.join(HERE, "t2_lab_result_path.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t2_lab_result_path.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
