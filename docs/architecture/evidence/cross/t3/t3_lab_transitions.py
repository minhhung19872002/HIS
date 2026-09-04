"""T3 (#218) — bảng trạng thái của DÒNG CHỈ ĐỊNH xét nghiệm (`ServiceRequestDetails.Status`).

Hai hằng số `LabRequestStatus` / `RadiologyRequestStatus` trong `StatusConstants.cs` **không được
dùng ở đâu cả** (grep = 0 lượt). Trạng thái chạy thật là số trần trên `ServiceRequestDetails.Status`,
từ vựng đọc được ở `LISCompleteService.QCHistory.cs:537`:

    0 = Chờ (lấy mẫu) · 1 = Đang thực hiện (đã có mẫu) · 2 = Có KQ · 3 = Đã hủy
    trong 2, `ReviewedAt != null` nghĩa là "đã duyệt"

Chiều NGƯỢC đã có `LabCancelChainService` gác rất chặt: muốn hủy KQ phải hủy duyệt trước, muốn hủy
lấy mẫu phải hủy KQ trước. Bài đo này hỏi chiều THUẬN có được gác tương xứng không — cụ thể là hai
tình huống chạm tới an toàn người bệnh:

  * ghi kết quả vào một chỉ định **đã hủy** (3 → 2): bệnh án hiện kết quả cho xét nghiệm không còn
  * **đè** kết quả lên một kết quả **đã được bác sĩ duyệt** mà không qua bước hủy duyệt

Đo cả hai cửa vào: nhập tay (`orders/enter-result`) và máy phân tích (`mock-receive`).
Bốn ca cuối là **đối chứng dương** — chuỗi hủy đã chặn đúng, dùng để biết bài đo không mù.

Không sửa gì. Tiền tố dữ liệu T3LAB, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3LAB"
BARCODE = "T3LAB-BC-001"
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
    """must_block=True: hệ thống PHẢI từ chối. Đạt khi blocked đúng bằng must_block."""
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-46s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def srd_state(srd_id):
    row = sql("SELECT ISNULL(CAST(Status AS varchar(5)),'?') + '|' + ISNULL(Result,'') + '|' + "
              # cờ ASCII: sqlcmd đổi codepage làm hỏng chuỗi tiếng Việt trong SQL,
              # từng khiến ca "duyệt KQ của chỉ định đã hủy" báo FAIL giả.
              "CASE WHEN ReviewedAt IS NULL THEN 'unreviewed' ELSE 'reviewed' END "
              "FROM ServiceRequestDetails WHERE Id='%s'" % srd_id)
    return (row.split("|") + ["", "", ""])[:3]


def set_state(srd_id, status, result="", reviewed=False):
    sql("UPDATE ServiceRequestDetails SET Status=%d, Result=%s, ReviewedAt=%s WHERE Id='%s'"
        % (status,
           ("N'%s'" % result) if result else "NULL",
           "GETDATE()" if reviewed else "NULL",
           srd_id))


def cleanup(patient_id):
    if not patient_id:
        return
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
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    tok = payload(b)["token"]

    patient_id = None
    try:
        # ── Dựng một dòng chỉ định xét nghiệm thật ──────────────────────────
        suffix = str(int(time.time()))[-6:]
        st, b = http("POST", "/api/Patients", tok, {
            "fullName": "%s Tran Thi Trang Thai" % TAG, "dateOfBirth": "1988-03-03T00:00:00",
            "gender": 2, "phoneNumber": "08%s" % suffix.rjust(8, "0")[:8],
            "address": "Số 5 phố Trạng Thái"})
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
                      "WHERE s.IsDeleted=0 AND s.IsActive=1 AND g.GroupCode LIKE 'XN%' ORDER BY s.ServiceCode")
        svc_id, svc_code = (svc_row.split("|") + ["", ""])[:2]
        http("POST", "/api/examination/service-orders", tok, {
            "examinationId": exam_id, "diagnosisCode": "E11", "diagnosisName": "Đái tháo đường",
            "services": [{"serviceId": svc_id, "quantity": 1, "paymentType": 2}],
            "autoSelectRoom": True})
        srd_id = sql("SELECT TOP 1 CAST(srd.Id AS varchar(50)) FROM ServiceRequestDetails srd "
                     "JOIN ServiceRequests sr ON sr.Id = srd.ServiceRequestId "
                     "WHERE sr.MedicalRecordId='%s' ORDER BY srd.CreatedAt DESC" % mr_id)
        sr_id = sql("SELECT TOP 1 CAST(ServiceRequestId AS varchar(50)) FROM ServiceRequestDetails WHERE Id='%s'" % srd_id)
        if len(srd_id) != 36:
            raise SystemExit("không dựng được dòng chỉ định: %r" % srd_id)
        sql("UPDATE ServiceRequestDetails SET SampleBarcode='%s', IsSampleCollected=1 WHERE Id='%s'" % (BARCODE, srd_id))
        analyzer = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM LabAnalyzers WHERE IsDeleted=0 ORDER BY CreatedAt")
        print("dòng chỉ định %s · dịch vụ %s\n" % (srd_id, svc_code))

        def enter(result):
            return http("POST", "/api/LISComplete/orders/enter-result", tok,
                        {"labTestItemId": srd_id, "result": result})

        def machine(result, flag="N"):
            return http("POST", "/api/LISComplete/mock-receive/%s" % analyzer, tok, [{
                "sampleBarcode": BARCODE, "testCode": svc_code, "result": result,
                "unit": "mmol/L", "flag": flag,
                "resultTime": datetime.now().isoformat(timespec="seconds")}])

        print("── chiều THUẬN: ghi kết quả ──")

        # 1. Chỉ định ĐÃ HỦY vẫn nhận được kết quả nhập tay?
        set_state(srd_id, 3)
        st, b = enter("6.1")
        stt, res, rev = srd_state(srd_id)
        case("hủy rồi vẫn nhập tay được KQ", True, res != "6.1",
             "HTTP %s · Status=%s · Result=%r" % (st, stt, res))

        # 2. Chỉ định ĐÃ HỦY vẫn nhận được kết quả từ MÁY?
        set_state(srd_id, 3)
        st, b = machine("6.2")
        stt, res, rev = srd_state(srd_id)
        case("hủy rồi máy vẫn bắn được KQ vào", True, res != "6.2",
             "HTTP %s · Status=%s · Result=%r · %s" % (st, stt, res, payload(b).get("matchedCount")))

        # 3. KQ ĐÃ DUYỆT bị đè bằng nhập tay, không qua bước hủy duyệt?
        set_state(srd_id, 2, "5.0", reviewed=True)
        st, b = enter("9.9")
        stt, res, rev = srd_state(srd_id)
        case("đè KQ đã duyệt bằng nhập tay", True, res != "9.9",
             "HTTP %s · Status=%s · Result=%r · %s" % (st, stt, res, rev))

        # 4. KQ ĐÃ DUYỆT bị đè bằng kết quả MÁY?
        set_state(srd_id, 2, "5.0", reviewed=True)
        st, b = machine("8.8")
        stt, res, rev = srd_state(srd_id)
        # Không chỉ hỏi "có bị đè không" mà còn hỏi "có báo lý do không" — luồng máy chạy theo lô
        # nên chọn cách bỏ qua dòng và ghi vào `errors`, thay vì ném lỗi giết cả lô.
        errs = (payload(b) or {}).get("errors") or []
        case("đè KQ đã duyệt bằng KQ máy", True, res != "8.8",
             "HTTP %s · Status=%s · Result=%r · %s" % (st, stt, res, rev))
        case("luồng máy nói rõ lý do từ chối", False, not errs,
             "errors=%s" % (errs[:1] or "TRỐNG"))

        # 5. Duyệt một chỉ định đã hủy (service lọc Status != 3 — kỳ vọng CHẶN)
        set_state(srd_id, 3, "7.7")
        st, b = http("POST", "/api/LISComplete/orders/approve", tok,
                     {"orderId": sr_id, "itemIds": [srd_id]})
        stt, res, rev = srd_state(srd_id)
        case("duyệt KQ của chỉ định đã hủy", True, rev == "unreviewed",
             "HTTP %s · Status=%s · %s" % (st, stt, rev))

        print("\n── chiều NGƯỢC (đối chứng dương: chuỗi hủy phải chặn) ──")

        # 6. Hủy KQ khi CHƯA hủy duyệt → phải chặn
        set_state(srd_id, 2, "5.0", reviewed=True)
        st, b = http("POST", "/api/laboratory/cancel-chain/cancel-result", tok,
                     {"serviceRequestDetailId": srd_id, "reason": "T3 đo"})
        stt, res, rev = srd_state(srd_id)
        case("hủy KQ khi chưa hủy duyệt", True, res == "5.0",
             "HTTP %s · Status=%s · Result=%r" % (st, stt, res))

        # 7. Hủy lấy mẫu khi ĐANG có KQ → phải chặn
        set_state(srd_id, 2, "5.0")
        sql("UPDATE ServiceRequestDetails SET IsSampleCollected=1, SampleBarcode='%s' WHERE Id='%s'" % (BARCODE, srd_id))
        st, b = http("POST", "/api/laboratory/cancel-chain/cancel-collection", tok,
                     {"serviceRequestDetailId": srd_id, "reason": "T3 đo"})
        stt, res, rev = srd_state(srd_id)
        case("hủy lấy mẫu khi đang có KQ", True, res == "5.0",
             "HTTP %s · Status=%s · Result=%r" % (st, stt, res))

        # 8. Hủy KQ ĐÚNG chuỗi (đã hủy duyệt trước) → phải CHO qua
        set_state(srd_id, 2, "5.0")
        st, b = http("POST", "/api/laboratory/cancel-chain/cancel-result", tok,
                     {"serviceRequestDetailId": srd_id, "reason": "T3 đo"})
        stt, res, rev = srd_state(srd_id)
        case("hủy KQ đúng chuỗi (đã hủy duyệt)", False, stt != "1",
             "HTTP %s · Status=%s (1 = Đang TH) · Result=%r" % (st, stt, res))

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
                  open(os.path.join(HERE, "t3_lab_transitions.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_lab_transitions.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
