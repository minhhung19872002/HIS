"""T3 (#218) + T2 (#217) — GỬI HỒ SƠ BHXH: đợt đã gửi rồi có gửi lại được không.

Đây là đường duy nhất trong cả đợt đo mà hậu quả đi RA NGOÀI bệnh viện: dữ liệu chi phí khám chữa
bệnh gửi lên cổng của cơ quan bảo hiểm xã hội. Gửi trùng một đợt là gửi trùng hồ sơ thật.

Hai bảng trạng thái, và chúng KHÔNG nối với nhau:
    InsuranceXmlBatches.Status : 0 đã xuất · 1 đã ký số · 2 đã gửi BHXH · 3 bị từ chối
    InsuranceClaims.ClaimStatus: 0 chờ · 1 khóa · 2 đã duyệt · 3 từ chối một phần · 4 từ chối toàn
                                 bộ · 5 đã thanh toán

`SubmitToInsurancePortalAsync` có ba lớp kiểm (đợt tồn tại · thư mục còn · có file xml) nhưng
**không đọc `Status`** lần nào. `ApplyXmlSignatureAsync` thì luôn đặt `Status = 1` bất kể đang ở đâu,
nên ký lại một đợt ĐÃ GỬI sẽ lặng lẽ xoá dấu vết là nó đã gửi.

Bên hồ sơ, `UpdateInsuranceClaimAsync` và `DeleteInsuranceClaimAsync` chỉ kiểm `claim == null`. Sửa
được chẩn đoán của hồ sơ **đã thanh toán**, và xoá được hồ sơ đã gửi.

Bài đo KHÔNG chạm cổng BHXH thật: đợt dùng để đo có thư mục tạm trên máy, và điều được kiểm là hệ
thống có từ chối **trước khi** gọi cổng hay không.

Tiền tố dữ liệu T3BHX, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3BHX"
CASES = []


def http(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
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
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=90)
    return (out.stdout or "").strip()


def case(name, must_block, blocked, detail):
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-50s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def cleanup(tmpdir, patient_id):
    sql("DELETE FROM InsuranceXmlBatches WHERE BatchCode LIKE '%s%%';" % TAG)
    sql("DELETE FROM InsuranceClaims WHERE ClaimCode LIKE '%s%%';" % TAG)
    if patient_id:
        sql("DELETE FROM Patients WHERE Id = '%s';" % patient_id)
    if tmpdir and os.path.isdir(tmpdir):
        shutil.rmtree(tmpdir, ignore_errors=True)


def main():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    tok = payload(b)["token"]

    tmpdir = None
    patient_id = None
    try:
        # Thư mục XML thật trên máy, để lượt gửi KHÔNG bị từ chối vì "thiếu file" — có thế mới biết
        # hệ thống chặn vì TRẠNG THÁI hay vì lý do khác.
        tmpdir = tempfile.mkdtemp(prefix="t3bhx_")
        with open(os.path.join(tmpdir, "XML1.xml"), "w", encoding="utf-8") as f:
            f.write("<?xml version='1.0' encoding='utf-8'?><root>%s</root>" % TAG)

        def make_batch(status, suffix):
            bid = str(uuid.uuid4())
            sql("INSERT INTO InsuranceXmlBatches "
                "(Id, BatchCode, PeriodMonth, PeriodYear, FilePath, FileSize, TotalRecords, "
                " SuccessRecords, FailedRecords, Status, ExportTime, CreatedAt, IsDeleted) VALUES "
                "('%s', N'%s-%s', 9, 2026, N'%s', 100, 1, 1, 0, %d, GETDATE(), GETDATE(), 0);"
                % (bid, TAG, suffix, tmpdir.replace("\\", "\\\\").replace("'", "''"), status))
            return bid

        def batch_state(bid):
            return sql("SELECT ISNULL(CAST(Status AS varchar(5)),'?') FROM InsuranceXmlBatches WHERE Id='%s'" % bid)

        def submit_mark(bid):
            """Dấu vết của một lượt GỬI: mã giao dịch + thời điểm gửi.

            KHÔNG đọc `Status` để kết luận có gửi hay không. Cổng BHXH ở máy này chạy chế độ giả lập
            (`BhxhGateway:UseMock=true`) nên gửi lại một đợt đã gửi vẫn trả 'thành công' và GHI LẠI
            `Status = 2` y như cũ — lượt đo đầu của bài này đọc đúng cái đó và báo ĐẠT GIẢ. Chỉ hai
            trường dưới đây mới cho biết hệ thống có thực sự đi ra cổng lần nữa hay không.
            """
            return sql("SELECT ISNULL(SubmitTransactionId,'-') + '|' + "
                       "ISNULL(CONVERT(varchar(30), SubmittedAt, 126),'-') "
                       "FROM InsuranceXmlBatches WHERE Id='%s'" % bid)

        # ── Đợt ĐÃ GỬI, gửi lại lần nữa ─────────────────────────────────────
        print("── đợt XML đã gửi lên BHXH ──")
        b_sent = make_batch(2, "SENT")
        sql("UPDATE InsuranceXmlBatches SET SubmitTransactionId=N'%s-TXN-CU', SubmittedAt='2026-09-01T08:00:00' "
            "WHERE Id='%s'" % (TAG, b_sent))
        mark_before = submit_mark(b_sent)
        st, resp = http("POST", "/api/insurance/submit", tok,
                        {"batchId": b_sent, "username": "x", "password": "x", "testMode": True})
        mark_after = submit_mark(b_sent)
        msg = (payload(resp) or {}).get("message", "") or resp[:90]
        case("gửi lại một đợt đã gửi lên BHXH", True, mark_after == mark_before,
             "HTTP %s · dấu gửi %s · %s"
             % (st, "GIỮ NGUYÊN" if mark_after == mark_before else "BỊ GHI ĐÈ → đã đi ra cổng lần nữa",
                msg[:60]))

        # ── Đợt CHƯA KÝ SỐ ──────────────────────────────────────────────────
        print("\n── đợt chưa ký số ──")
        b_unsigned = make_batch(0, "UNSIGNED")
        mark_before = submit_mark(b_unsigned)
        st, resp = http("POST", "/api/insurance/submit", tok,
                        {"batchId": b_unsigned, "username": "x", "password": "x", "testMode": True})
        mark_after = submit_mark(b_unsigned)
        after = batch_state(b_unsigned)
        msg = (payload(resp) or {}).get("message", "") or resp[:90]
        went_out = mark_after != mark_before
        # GHI NHẬN, cố ý KHÔNG coi là lỗi phải sửa trong đợt này: bắt buộc ký số trước khi gửi có
        # thể làm tê liệt một cơ sở chưa cấu hình chữ ký. Là câu hỏi nghiệp vụ, cần người dùng quyết.
        # Nên ca này luôn ĐẠT; phần chữ mới là thứ đáng đọc.
        case("(quan sát) gửi đợt chưa ký số", False, False,
             "HTTP %s · Status sau=%s · đã đi ra cổng=%s · %s" % (st, after, went_out, msg[:55]))

        # ── Ký lại một đợt ĐÃ GỬI ───────────────────────────────────────────
        print("\n── ký lại đợt đã gửi ──")
        b_resign = make_batch(2, "RESIGN")
        st, resp = http("POST", "/api/insurance/xml/%s/signature" % b_resign, tok,
                        {"signatureValue": "AA==", "certificateBase64": "AA==",
                         "caProvider": TAG, "hashAlgorithm": "SHA-256"})
        after = batch_state(b_resign)
        msg = (payload(resp) or {}).get("message", "") or resp[:90]
        # Chặn đúng = giữ nguyên 2 VÀ nói vì đã gửi, chứ không phải rơi ở khâu kiểm chữ ký.
        said_sent = "đã gửi" in msg.lower() or "da gui" in msg.lower()
        case("ký lại đợt đã gửi (phải nói vì đã gửi)", True, after == "2" and said_sent,
             "HTTP %s · Status sau=%s · %s" % (st, after, msg[:70]))

        # ── Hồ sơ BHYT: sửa / xoá theo trạng thái ───────────────────────────
        print("\n── hồ sơ BHYT ──")
        suffix = str(int(time.time()))[-6:]
        st, b = http("POST", "/api/Patients", tok, {
            "fullName": "%s Do Van Bao Hiem" % TAG, "dateOfBirth": "1970-05-05T00:00:00",
            "gender": 1, "phoneNumber": "02%s" % suffix.rjust(8, "0")[:8],
            "address": "Số 11 phố Bảo Hiểm"})
        patient_id = payload(b).get("id")
        if not patient_id:
            raise SystemExit("không tạo được bệnh nhân: %s %s" % (st, b[:200]))

        def make_claim(status, code_suffix):
            code = "%s-%s" % (TAG, code_suffix)
            sql("INSERT INTO InsuranceClaims "
                "(Id, ClaimCode, PatientId, InsuranceType, ServiceDate, TreatmentType, TotalAmount, "
                " InsuranceAmount, PatientAmount, OutOfPocketAmount, InsurancePaymentRate, "
                " ClaimStatus, MainDiagnosisCode, MainDiagnosisName, CreatedAt, IsDeleted) VALUES "
                "(NEWID(), N'%s', '%s', 1, GETDATE(), 1, 100000, 80000, 20000, 0, 80, %d, "
                " N'J18', N'Viem phoi', GETDATE(), 0);" % (code, patient_id, status))
            return code

        def claim_state(code):
            return sql("SELECT ISNULL(MainDiagnosisCode,'') + '|' + ISNULL(CAST(IsDeleted AS varchar(2)),'?') "
                       "FROM InsuranceClaims WHERE ClaimCode='%s'" % code).split("|")

        def edit(code):
            return http("PUT", "/api/insurance/claims/%s" % code, tok,
                        {"diagnosisCode": "SUA", "diagnosisName": "Da bi sua", "notes": TAG})

        for label, status, must_block in [
            ("hồ sơ đang chờ (0)", 0, False),
            ("hồ sơ đã khóa (1)", 1, True),
            ("hồ sơ đã duyệt (2)", 2, True),
            ("hồ sơ bị từ chối (4)", 4, False),
            ("hồ sơ ĐÃ THANH TOÁN (5)", 5, True),
        ]:
            code = make_claim(status, "C%d" % status)
            st, resp = edit(code)
            diag = (claim_state(code) + ["", ""])[0]
            msg = (payload(resp) or {}).get("message", "") or resp[:70]
            case("sửa chẩn đoán: %s" % label, must_block, diag != "SUA",
                 "HTTP %s · chẩn đoán sau=%r · %s" % (st, diag, msg[:50]))

        code_paid = make_claim(5, "DEL5")
        st, resp = http("DELETE", "/api/insurance/claims/%s" % code_paid, tok)
        deleted = (claim_state(code_paid) + ["", ""])[1]
        case("xoá hồ sơ ĐÃ THANH TOÁN", True, deleted == "0",
             "HTTP %s · IsDeleted=%s" % (st, deleted))

        code_new = make_claim(0, "DEL0")
        st, resp = http("DELETE", "/api/insurance/claims/%s" % code_new, tok)
        deleted = (claim_state(code_new) + ["", ""])[1]
        case("xoá hồ sơ đang chờ (phải cho qua)", False, deleted == "0",
             "HTTP %s · IsDeleted=%s" % (st, deleted))

    finally:
        cleanup(tmpdir, patient_id)
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"] else "hệ thống chặn nhưng phải cho qua"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_bhxh_transitions.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_bhxh_transitions.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
