"""T3 (#218) — HỘI CHẨN THUỐC DẤU *: ghi đè kết luận sau khi lãnh đạo đã duyệt.

Hội chẩn loại 3 là **hội chẩn thuốc dấu \\*** — nhóm thuốc phải có lãnh đạo duyệt mới dùng được.
`ApproveConsultationAsync` ghi `ApprovalStatus = 2` (Đã duyệt) kèm `ApprovedBy` + `ApprovedAt`, tức
một người cụ thể đứng tên chịu trách nhiệm cho **kết luận và phương hướng điều trị** của buổi hội chẩn.

Nhưng `CompleteConsultationAsync` (`POST /api/inpatient/consultations/{id}/complete`) là bốn dòng gán,
**không hỏi `ApprovalStatus` hay `ApprovedAt` lần nào**:

    entity.Conclusion = conclusion;
    entity.Treatment  = treatment;
    entity.Status = 2;

Nên sau khi lãnh đạo đã duyệt, vẫn gọi lại được để **ghi đè kết luận và phương hướng điều trị**, mà
`ApprovedBy` / `ApprovedAt` giữ nguyên. Chữ duyệt của lãnh đạo đứng tên cho một kết luận khác hẳn cái
người đó đã đọc và ký duyệt.

Tìm ra bằng bộ dò `t3_verified_edit_sweep.py`, không phải tình cờ.

Ghi nhận cho đúng: `UpdateConsultationAsync` cùng file cũng không có gác, nhưng **hôm nay không có
route API nào gọi tới** (rà toàn bộ chỉ thấy khai báo ở interface). Vẫn vá cùng lúc cho nhất quán,
nhưng bài đo này chỉ đo được đường có thật là `complete`.

Tiền tố dữ liệu T3HCH, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3HCH"
KL = "KET-LUAN-LANH-DAO-DA-DUYET"
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

    hc_id = str(uuid.uuid4())
    try:
        adm = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Admissions WHERE IsDeleted=0")
        uid = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")
        if len(adm) != 36:
            raise SystemExit("không tìm được lượt nội trú: %r" % adm)

        def seed(approval_status, conclusion=KL):
            """Hội chẩn loại 3 (thuốc dấu *), đã hoàn thành, có/không có duyệt lãnh đạo."""
            sql("DELETE FROM InpatientConsultations WHERE Id='%s'; "
                "INSERT INTO InpatientConsultations (Id, AdmissionId, ConsultationType, "
                " ConsultationDate, ChairmanId, SecretaryId, Reason, ClinicalFindings, Conclusion, "
                " Treatment, Status, ApprovalStatus, ApprovedBy, ApprovedAt, CreatedAt, IsDeleted) VALUES "
                "('%s','%s', 3, GETUTCDATE(), '%s', '%s', N'%s', N'%s-lam-sang', N'%s', "
                " N'%s-phuong-huong', 2, %d, %s, %s, GETUTCDATE(), 0);"
                % (hc_id, hc_id, adm, uid, uid, TAG, TAG, conclusion, TAG, approval_status,
                   ("'" + uid + "'") if approval_status == 2 else "NULL",
                   "GETUTCDATE()" if approval_status == 2 else "NULL"))

        def state():
            return sql("SELECT ISNULL(Conclusion, N'?') + N' ~~ ' "
                       " + CASE WHEN ApprovedAt IS NULL THEN 'chua-duyet' ELSE 'DA-DUYET' END "
                       "FROM InpatientConsultations WHERE Id='%s'" % hc_id)

        # ── 1. Ghi đè kết luận sau khi lãnh đạo đã duyệt ───────────────────
        print("── Ghi đè kết luận hội chẩn ĐÃ ĐƯỢC LÃNH ĐẠO DUYỆT ──")
        seed(approval_status=2)
        st, b = http("POST", "/api/inpatient/consultations/%s/complete" % hc_id,
                     {"Conclusion": "KET-LUAN-BI-SUA-SAU-KHI-DUYET", "Treatment": "khac"})
        s1 = state()
        case("KHÔNG ghi đè được kết luận đã duyệt", True, KL in s1,
             "HTTP %s · kết luận ~~ trạng thái duyệt = %r" % (st, s1[:60]))

        # ── 2. ĐỐI CHỨNG ÂM: hội chẩn CHƯA duyệt vẫn phải kết luận được ────
        print("\n── Đối chứng âm: hội chẩn chưa duyệt vẫn phải hoàn thành được ──")
        seed(approval_status=0, conclusion="")
        st, b = http("POST", "/api/inpatient/consultations/%s/complete" % hc_id,
                     {"Conclusion": TAG + "-KET-LUAN-HOP-LE", "Treatment": "ok"})
        s2 = state()
        case("hội chẩn chưa duyệt ĐƯỢC ghi kết luận", False,
             TAG + "-KET-LUAN-HOP-LE" not in s2,
             "HTTP %s · %r" % (st, s2[:60]))

    finally:
        try:
            sql("DELETE FROM InpatientConsultations WHERE Id='%s';" % hc_id)
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
                  open(os.path.join(HERE, "t3_consultation_approved.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_consultation_approved.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
