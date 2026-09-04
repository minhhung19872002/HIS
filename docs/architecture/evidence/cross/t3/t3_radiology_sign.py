"""T3 (#218) — KÝ SỐ KẾT QUẢ CĐHA: ký được hai lần, và ký được cả phiếu KHÔNG TỒN TẠI.

Đợt này đã vá hai cửa quanh chữ ký CĐHA — cấm sửa nội dung phiếu đã ký (§5) và bắt hủy duyệt phải
thu hồi chữ ký (§21). Còn chính cửa **KÝ** thì chưa ai đụng tới. Hai vấn đề:

**1. Ký hai lần thì có hai chữ ký cùng còn hiệu lực.** `SignResultAsync` không hỏi phiếu đã có chữ
ký chưa; mỗi lần gọi là thêm một dòng `RadiologySignatureHistory` với `Status = 1`. Hậu quả nằm ở
cửa hủy: `CancelSignedResultAsync` chỉ thu hồi **chữ ký mới nhất**

    .OrderByDescending(s => s.SignedAt).FirstOrDefaultAsync()

nên sau khi hủy, chữ ký cũ **vẫn còn hiệu lực**. Phiếu về nháp nhưng vẫn mang một chữ ký sống, và
lớp gác `hasActiveSignature` (§5) sẽ cấm sửa nội dung **vĩnh viễn** — phiếu kẹt cứng, không sửa
được mà cũng không ký lại cho sạch được.

**2. Ký một chỉ định CHƯA CÓ phiếu đọc thì hệ thống TỰ DỰNG một phiếu rồi ký luôn.** Khi tra không
ra phiếu, `SignResultAsync` đi nhánh dự phòng và tạo mới:

    Findings = "Ky so tu dong",
    Status = 1,

rồi ký và đặt `Status = 2` (đã duyệt). Kết quả là **một kết quả chẩn đoán hình ảnh có chữ ký số hợp
lệ, mang nội dung do máy bịa ra, không bác sĩ nào đọc phim**. Chữ ký số là thứ để quy trách nhiệm —
nó không được phép bảo chứng cho một nội dung không ai viết.

Bài đo dựng dữ liệu riêng (một chỉ định + một ca chụp KHÔNG có phiếu đọc), không mượn dữ liệu thật.

Tiền tố dữ liệu T3SGN, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3SGN"
CASES = []
TOKEN = None


def http(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer %s" % TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
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
    text = (out.stdout or "").strip()
    if text.startswith("Msg ") or "Invalid column name" in text or "Invalid object name" in text:
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:120], text[:200]))
    return text


def case(name, must_block, blocked, detail):
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-56s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    report_id = None
    try:
        row = sql("SELECT TOP 1 CAST(r.Id AS varchar(50)) + '|' + CAST(r.Status AS varchar(3)) "
                  "FROM RadiologyReports r WHERE r.IsDeleted=0")
        if "|" not in row:
            raise SystemExit("không tìm được phiếu đọc kết quả: %r" % row)
        report_id, orig_status = row.split("|")

        def active_signatures():
            return sql("SELECT CAST(COUNT(*) AS varchar(5)) FROM RadiologySignatureHistories "
                       "WHERE RadiologyReportId='%s' AND Status=1" % report_id)

        def reset():
            sql("DELETE FROM RadiologySignatureHistories WHERE RadiologyReportId='%s'; "
                "UPDATE RadiologyReports SET Status=1, ApprovedAt=NULL, ApprovedBy=NULL WHERE Id='%s'"
                % (report_id, report_id))

        # ── 1. Ký lần đầu (đối chứng âm: phải chạy) ────────────────────────
        print("── Ký số lần đầu (đối chứng âm: phải chạy) ──")
        reset()
        st, b = http("POST", "/api/RISComplete/results/sign",
                     {"ReportId": report_id, "SignatureType": "DIGITAL", "Note": TAG})
        case("ký số lần đầu ĐƯỢC chạy", False,
             not (st == 200 and active_signatures() == "1"),
             "HTTP %s · số chữ ký còn hiệu lực=%s" % (st, active_signatures()))

        # ── 2. Ký lần hai trên cùng phiếu ──────────────────────────────────
        print("\n── Ký số lần thứ hai trên cùng một phiếu ──")
        st, b = http("POST", "/api/RISComplete/results/sign",
                     {"ReportId": report_id, "SignatureType": "DIGITAL", "Note": TAG + "-lan2"})
        n = active_signatures()
        case("KHÔNG chồng thêm chữ ký thứ hai còn hiệu lực", True, n == "1",
             "HTTP %s · số chữ ký còn hiệu lực=%s (phải là 1)" % (st, n))

        # ── 3. Hủy chữ ký phải thu hồi HẾT, không chỉ cái mới nhất ─────────
        print("\n── Hủy kết quả đã ký: thu hồi hết hay chỉ cái mới nhất ──")
        st, b = http("POST", "/api/RISComplete/results/cancel-signed",
                     {"ReportId": report_id, "Reason": TAG + " huy"})
        left = active_signatures()
        case("hủy ký thu hồi HẾT chữ ký còn hiệu lực", True, left == "0",
             "HTTP %s · còn sót %s chữ ký sống (phiếu về nháp mà vẫn bị khoá sửa)" % (st, left))

        # ── 4. Ký một chỉ định KHÔNG có phiếu đọc ──────────────────────────
        # Đây là ca nặng nhất: nhánh dự phòng tự dựng một phiếu với nội dung "Ky so tu dong"
        # rồi ký luôn — chữ ký số bảo chứng cho nội dung không ai viết.
        print("\n── Ký một chỉ định CHƯA CÓ phiếu đọc kết quả ──")
        rq = sql("SELECT TOP 1 CAST(req.Id AS varchar(50)) FROM RadiologyRequests req "
                 " JOIN RadiologyExams e ON e.RadiologyRequestId = req.Id "
                 " LEFT JOIN RadiologyReports rp ON rp.RadiologyExamId = e.Id "
                 "WHERE req.IsDeleted=0 AND rp.Id IS NULL")
        if len(rq) == 36:
            before = sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyReports "
                         "WHERE Findings = N'Ky so tu dong'")
            st, b = http("POST", "/api/RISComplete/results/sign",
                         {"ReportId": rq, "SignatureType": "DIGITAL", "Note": TAG})
            after = sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyReports "
                        "WHERE Findings = N'Ky so tu dong'")
            case("KHÔNG tự dựng phiếu 'Ky so tu dong' rồi ký", True, before == after,
                 "HTTP %s · số phiếu nội dung bịa: %s → %s" % (st, before, after))
        else:
            print("  (bỏ qua: không tìm được chỉ định nào chưa có phiếu đọc trong DB này)")

    finally:
        if report_id:
            try:
                sql("DELETE FROM RadiologySignatureHistories WHERE RadiologyReportId='%s'; "
                    "UPDATE RadiologyReports SET Status=%s, ApprovedAt=NULL, ApprovedBy=NULL WHERE Id='%s'; "
                    "DELETE FROM RadiologySignatureHistories WHERE RadiologyReportId IN "
                    " (SELECT Id FROM RadiologyReports WHERE Findings = N'Ky so tu dong'); "
                    "DELETE FROM RadiologyReports WHERE Findings = N'Ky so tu dong';"
                    % (report_id, orig_status, report_id))
            except Exception as e:
                print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s" % c["case"])
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_radiology_sign.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_radiology_sign.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
