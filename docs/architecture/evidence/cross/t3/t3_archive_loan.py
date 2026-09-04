"""T3 (#218) — MƯỢN/TRẢ HỒ SƠ LƯU TRỮ: cửa thứ hai, không một lượt kiểm nào.

Sau khi vá `CreateBorrowAsync` (§25) thì cửa tạo phiếu mượn đã chặn được "hồ sơ đang có người mượn".
Nhưng còn một cửa nữa cũng cho mượn đúng tập hồ sơ đó: `WriteGapService.BorrowRecordAsync`
(`POST /api/write-gap/record-planning/borrow`), thao tác thẳng trên `MedicalRecordArchives` —
`IsOnLoan = true`, `Status = 2`. Toàn bộ phần kiểm của nó:

    var archive = await _db.MedicalRecordArchives.FirstOrDefaultAsync(a => a.Id == dto.ArchiveId);
    if (archive == null) return ServiceOutcome.NotFound();
    archive.IsOnLoan = true;                    // hết

`ReturnRecordAsync` cùng file cũng vậy: `IsOnLoan = false`, `Status = 1`, không hỏi trước đó hồ sơ
có đang được mượn không.

Ba điều đo được:

1. **Mượn một tập hồ sơ ĐANG có người mượn** — người thứ hai nhận 200, `BorrowedByUserId` bị ghi đè
   sang người mới. Hệ thống quên mất người đang thật sự cầm tập hồ sơ giấy trong tay.
2. **Trả một tập hồ sơ chưa hề được mượn** — 200, và `ReturnedAt` được đặt cho một lượt mượn không
   tồn tại.
3. Lý do mượn (`Reason`) thì có ghi (`BorrowReason`) — cái này làm đúng, ghi lại để không đổ oan.

Đúng hình dạng đã gặp suốt đợt: luật được viết ở một cửa (§25 vừa vá), cửa bên cạnh để trống.

Tiền tố dữ liệu T3ARC, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3ARC"
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
    print("  %-54s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    arc_id = None
    try:
        row = sql("SELECT TOP 1 CAST(Id AS varchar(50)) + '|' + CAST(Status AS varchar(3)) + '|' "
                  " + CAST(CAST(IsOnLoan AS int) AS varchar(3)) "
                  "FROM MedicalRecordArchives WHERE IsDeleted=0")
        if row.count("|") != 2:
            raise SystemExit("không tìm được hồ sơ lưu trữ: %r" % row)
        arc_id, orig_status, orig_loan = row.split("|")

        def state():
            return sql("SELECT CAST(Status AS varchar(3)) + '|' + CAST(CAST(IsOnLoan AS int) AS varchar(3)) "
                       " + '|' + ISNULL(CAST(BorrowedByUserId AS varchar(50)), '(trong)') "
                       "FROM MedicalRecordArchives WHERE Id='%s'" % arc_id)

        def set_free():
            sql("UPDATE MedicalRecordArchives SET Status=1, IsOnLoan=0, BorrowedByUserId=NULL, "
                " BorrowedAt=NULL, ReturnedAt=NULL WHERE Id='%s'" % arc_id)

        # ── 1. Đối chứng âm: mượn lần đầu phải chạy được ────────────────────
        print("── Mượn lần đầu (đối chứng âm: phải chạy) ──")
        set_free()
        st, b = http("POST", "/api/write-gap/record-planning/borrow",
                     {"ArchiveId": arc_id, "Reason": TAG + " muon lan 1"})
        s1 = state()
        case("mượn lần đầu ĐƯỢC chạy", False, not (st == 200 and s1.startswith("2|1")),
             "HTTP %s · trạng thái|đang mượn|người mượn = %s" % (st, s1))
        holder1 = s1.split("|")[2]

        # ── 2. Mượn tiếp khi hồ sơ ĐANG có người giữ ───────────────────────
        print("\n── Mượn tiếp một tập hồ sơ đang có người giữ ──")
        st, b = http("POST", "/api/write-gap/record-planning/borrow",
                     {"ArchiveId": arc_id, "Reason": TAG + " muon lan 2"})
        s2 = state()
        reason_now = sql("SELECT ISNULL(BorrowReason, N'(trong)') FROM MedicalRecordArchives WHERE Id='%s'" % arc_id)
        case("mượn chồng lên lượt mượn đang mở bị chặn", True, st >= 400,
             "HTTP %s · %s" % (st, b[:60]))
        # Điều thật sự quan trọng: người đang giữ hồ sơ KHÔNG được ghi đè mất.
        case("người đang giữ hồ sơ không bị ghi đè", True,
             s2.split("|")[2] == holder1 and TAG + " muon lan 2" not in reason_now,
             "lý do đang lưu=%r" % reason_now)

        # ── 3. Trả một tập hồ sơ chưa hề được mượn ─────────────────────────
        print("\n── Trả một tập hồ sơ chưa hề được mượn ──")
        set_free()
        st, b = http("POST", "/api/write-gap/record-planning/return", {"ArchiveId": arc_id})
        returned_at = sql("SELECT CASE WHEN ReturnedAt IS NULL THEN 'khong' ELSE 'co' END "
                          "FROM MedicalRecordArchives WHERE Id='%s'" % arc_id)
        case("trả hồ sơ chưa mượn bị chặn", True, st >= 400,
             "HTTP %s · ngày trả được đặt=%s · %s" % (st, returned_at, b[:45]))

        # ── 4. Đối chứng âm: trả hồ sơ đang mượn phải chạy được ────────────
        print("\n── Trả hồ sơ đang mượn (đối chứng âm: phải chạy) ──")
        set_free()
        http("POST", "/api/write-gap/record-planning/borrow",
             {"ArchiveId": arc_id, "Reason": TAG + " muon de tra"})
        st, b = http("POST", "/api/write-gap/record-planning/return", {"ArchiveId": arc_id})
        s4 = state()
        case("trả một hồ sơ đang mượn ĐƯỢC chạy", False, not (st == 200 and s4.startswith("1|0")),
             "HTTP %s · trạng thái|đang mượn|người mượn = %s" % (st, s4))

    finally:
        if arc_id:
            try:
                sql("UPDATE MedicalRecordArchives SET Status=%s, IsOnLoan=%s, BorrowedByUserId=NULL, "
                    " BorrowedAt=NULL, ReturnedAt=NULL, BorrowReason=NULL WHERE Id='%s'"
                    % (orig_status, orig_loan, arc_id))
            except Exception as e:
                print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống CHO qua nhưng phải chặn" if c["mustBlock"]
                      else "hệ thống CHẶN nhầm đường hợp lệ"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_archive_loan.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_archive_loan.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
