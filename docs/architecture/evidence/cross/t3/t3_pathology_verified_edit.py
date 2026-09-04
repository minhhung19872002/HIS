"""T3 (#218) — GIẢI PHẪU BỆNH: sửa được kết quả ĐÃ DUYỆT, chẩn đoán ung thư đổi mà chữ ký duyệt giữ nguyên.

`VerifyPathologyResultAsync` được canh rất cẩn thận — kiểm kết quả có gắn phiếu hợp lệ không, phiếu
đã ở trạng thái hoàn thành chưa, và **chặn duyệt lại** một kết quả đã duyệt:

    if (result.VerifiedAt.HasValue)
        throw new InvalidOperationException("Kết quả GPB này đã được duyệt");

Nhưng `UpdatePathologyResultAsync` — cửa **sửa nội dung** — **không hỏi `VerifiedAt` một lần nào**.
Nên sau khi bác sĩ giải phẫu bệnh đã duyệt, vẫn sửa được `Diagnosis`, `IcdCode`, mô tả đại thể, mô
tả vi thể… trong khi `VerifiedBy` / `VerifiedByName` / `VerifiedAt` **giữ nguyên**.

Kết quả: một phiếu giải phẫu bệnh mang tên người duyệt và giờ duyệt, nhưng nội dung chẩn đoán đã
khác cái mà người đó thật sự đọc và ký duyệt. Với GPB thì chẩn đoán ấy thường là kết luận ung thư —
thứ quyết định phác đồ điều trị.

Đúng hình dạng đã gặp ở §5 (sửa nội dung phiếu CĐHA đã ký số): lớp xác nhận **có tồn tại và được
canh kỹ ở đường của chính nó**, nhưng cửa sửa nội dung không hề tra tới nó.

Ghi nhận một chỗ module này làm ĐÚNG, để không đổ oan: controller đã chặn sẵn `RequestId` rỗng
(`Thiếu RequestId (phiếu GPB)`), nên không tạo được kết quả GPB mồ côi không gắn phiếu nào.

Tiền tố dữ liệu T3GPB, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3GPB"
GOC = "UNG-THU-BIEU-MO-TUYEN-DO-BIET-HOA-CAO"
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

    res_id = str(uuid.uuid4())
    try:
        rq = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM PathologyRequests WHERE IsDeleted=0")
        if len(rq) != 36:
            raise SystemExit("không tìm được phiếu GPB: %r" % rq)
        uid = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")

        def seed(verified):
            """Kết quả GPB với chẩn đoán rõ ràng; `verified` quyết định đã duyệt hay chưa."""
            sql("DELETE FROM PathologyResults WHERE Id='%s'; "
                "UPDATE PathologyRequests SET Status=3 WHERE Id='%s'; "
                "INSERT INTO PathologyResults (Id, RequestId, Diagnosis, GrossDescription, "
                " MicroscopicDescription, VerifiedBy, VerifiedByName, VerifiedAt, CreatedAt, IsDeleted) "
                "VALUES ('%s','%s', N'%s', N'%s-dai-the', N'%s-vi-the', %s, %s, %s, GETUTCDATE(), 0);"
                % (res_id, rq, res_id, rq, GOC, TAG, TAG,
                   ("'" + uid + "'") if verified else "NULL",
                   ("N'BS Duyet'") if verified else "NULL",
                   "GETUTCDATE()" if verified else "NULL"))

        def diagnosis():
            return sql("SELECT ISNULL(Diagnosis, N'(trong)') FROM PathologyResults WHERE Id='%s'" % res_id)

        def verifier():
            return sql("SELECT ISNULL(VerifiedByName, N'(chua duyet)') + '|' "
                       " + CASE WHEN VerifiedAt IS NULL THEN 'khong' ELSE 'co' END "
                       "FROM PathologyResults WHERE Id='%s'" % res_id)

        # ── 1. Sửa một kết quả ĐÃ DUYỆT ────────────────────────────────────
        print("── Sửa chẩn đoán của một kết quả GPB ĐÃ DUYỆT ──")
        seed(verified=True)
        st, b = http("PUT", "/api/Pathology/results/%s" % res_id,
                     {"Diagnosis": "LANH-TINH-DA-SUA-SAU-KHI-DUYET"})
        d = diagnosis()
        case("KHÔNG sửa được chẩn đoán của kết quả đã duyệt", True, GOC in d,
             "HTTP %s · Diagnosis hiện tại=%r" % (st, d[:50]))
        # Điều làm nó nguy hiểm: chữ ký duyệt vẫn nguyên trong khi nội dung đã đổi.
        case("chữ ký duyệt không còn bảo chứng cho nội dung khác", True, GOC in d,
             "người duyệt|đã duyệt = %s" % verifier())

        # ── 2. ĐỐI CHỨNG ÂM: kết quả CHƯA duyệt vẫn phải sửa được ──────────
        print("\n── Đối chứng âm: kết quả CHƯA duyệt vẫn phải sửa được ──")
        seed(verified=False)
        st, b = http("PUT", "/api/Pathology/results/%s" % res_id,
                     {"Diagnosis": TAG + "-SUA-HOP-LE"})
        d2 = diagnosis()
        case("kết quả chưa duyệt ĐƯỢC sửa bình thường", False,
             not (st == 200 and TAG + "-SUA-HOP-LE" in d2),
             "HTTP %s · Diagnosis=%r" % (st, d2[:45]))

    finally:
        try:
            sql("DELETE FROM PathologyResults WHERE Id='%s';" % res_id)
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
                  open(os.path.join(HERE, "t3_pathology_verified_edit.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_pathology_verified_edit.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
