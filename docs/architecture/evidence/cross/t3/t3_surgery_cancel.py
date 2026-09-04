"""T3 (#218) — HỦY / TỪ CHỐI PHIẾU MỔ: lý do ghi đè ghi chú lâm sàng, và hủy được cả ca ĐÃ MỔ XONG.

Đợt trước (§13) đã vá bước **bắt đầu** và **kết thúc** ca mổ. Còn hai cửa nữa của cùng phiếu mổ,
`RejectSurgeryAsync` (`POST /api/SurgeryComplete/{id}/reject`) và `CancelSurgeryAsync`
(`.../{id}/cancel`), và cả hai đều là bốn dòng gán y hệt nhau:

    request.Status = 4;
    request.Notes = reason;      // ← ghi ĐÈ

Hai vấn đề:

1. **`Notes` là ghi chú lâm sàng của phiếu mổ**, ghi lúc tạo phiếu từ `dto.Notes` và đọc ra làm
   `Description` của phiếu. Hủy hay từ chối một ca mổ là **xoá mất ghi chú ấy**, thay bằng câu lý do.
   Đúng dạng §27 (lý do hủy ghi đè kết luận khám). Và cũng như §27, chính entity này đã học bài đó
   một lần rồi — dòng 48 của `Surgery.cs` ghi *"Tường trình PTTT … tách khỏi sentinel Notes
   (migration 78)"*.

2. **Không có gác nào**: hủy được cả ca mổ **đã hoàn thành** (`Status = 3`) và ca **đang mổ** (2).
   Hủy một ca đã mổ xong thì biên bản mổ vẫn nằm đó, còn phiếu mổ thì khai là đã hủy — hai thứ nói
   ngược nhau về một việc đã thật sự xảy ra trên người bệnh.

Đối chứng âm: từ chối một phiếu **chờ duyệt** và hủy một phiếu **đã lên lịch nhưng chưa mổ** đều bắt
buộc vẫn phải chạy được.

Tiền tố dữ liệu T3SRG, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3SRG"
GHI_CHU = "GHI-CHU-LAM-SANG-CUA-PHIEU-MO"
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

    sg_id = None
    try:
        row = sql("SELECT TOP 1 CAST(Id AS varchar(50)) + '|' + CAST(Status AS varchar(3)) + '|' "
                  " + ISNULL(Notes, N'(trong)') FROM SurgeryRequests WHERE IsDeleted=0")
        if row.count("|") < 2:
            raise SystemExit("không tìm được phiếu mổ: %r" % row)
        parts = row.split("|")
        sg_id, orig_status, orig_notes = parts[0], parts[1], "|".join(parts[2:])

        def prepare(status):
            sql("UPDATE SurgeryRequests SET Status=%d, Notes=N'%s' WHERE Id='%s'"
                % (status, GHI_CHU, sg_id))

        def notes():
            return sql("SELECT ISNULL(Notes, N'(trong)') FROM SurgeryRequests WHERE Id='%s'" % sg_id)

        def status():
            return sql("SELECT CAST(Status AS varchar(3)) FROM SurgeryRequests WHERE Id='%s'" % sg_id)

        # ── 1. Hủy một ca ĐÃ MỔ XONG ───────────────────────────────────────
        print("── Hủy một ca mổ ĐÃ HOÀN THÀNH ──")
        prepare(3)                                  # 3 = đã hoàn thành
        st, b = http("POST", "/api/SurgeryComplete/%s/cancel" % sg_id, {"Reason": TAG + " huy ca da mo"})
        case("KHÔNG hủy được ca mổ đã hoàn thành", True, status() != "4",
             "HTTP %s · trạng thái=%s (4=đã hủy) · %s" % (st, status(), b[:45]))
        case("ghi chú lâm sàng của phiếu mổ còn nguyên", True, GHI_CHU in notes(),
             "Notes hiện tại=%r" % notes()[:55])

        # ── 2. Hủy một ca ĐANG MỔ ──────────────────────────────────────────
        print("\n── Hủy một ca mổ ĐANG DIỄN RA ──")
        prepare(2)                                  # 2 = đang mổ
        st, b = http("POST", "/api/SurgeryComplete/%s/cancel" % sg_id, {"Reason": TAG + " huy ca dang mo"})
        case("KHÔNG hủy được ca mổ đang diễn ra", True, status() != "4",
             "HTTP %s · trạng thái=%s · %s" % (st, status(), b[:45]))

        # ── 3. Từ chối duyệt một ca ĐÃ MỔ XONG ─────────────────────────────
        print("\n── Từ chối duyệt một ca đã mổ xong ──")
        prepare(3)
        st, b = http("POST", "/api/SurgeryComplete/%s/reject" % sg_id, {"Reason": TAG + " tu choi"})
        case("KHÔNG từ chối được ca mổ đã hoàn thành", True, status() != "4",
             "HTTP %s · trạng thái=%s · %s" % (st, status(), b[:45]))

        # ── 4+5. ĐỐI CHỨNG ÂM ──────────────────────────────────────────────
        print("\n── Đối chứng âm: đường hợp lệ vẫn phải thông ──")
        prepare(1)                                  # 1 = đã duyệt / đã lên lịch, chưa mổ
        st, b = http("POST", "/api/SurgeryComplete/%s/cancel" % sg_id, {"Reason": TAG + " huy hop le"})
        case("hủy một ca CHƯA MỔ ĐƯỢC chạy", False, status() != "4",
             "HTTP %s · trạng thái=%s" % (st, status()))
        # Và lý do phải lưu được ở đâu đó, chứ không phải đè lên ghi chú lâm sàng.
        both = sql("SELECT ISNULL(CancelReason, N'(trong)') + N' ~~ ' + ISNULL(Notes, N'(trong)') "
                   "FROM SurgeryRequests WHERE Id='%s'" % sg_id)
        case("lý do hủy lưu ô riêng, ghi chú lâm sàng còn nguyên", True,
             (TAG in both.split(" ~~ ")[0]) and (GHI_CHU in both.split(" ~~ ")[-1]),
             "CancelReason ~~ Notes = %r" % both[:85])

    finally:
        if sg_id:
            try:
                sql("UPDATE SurgeryRequests SET Status=%s, Notes=%s, CancelReason=NULL WHERE Id='%s'"
                    % (orig_status,
                       "NULL" if orig_notes == "(trong)" else "N'" + orig_notes.replace("'", "''") + "'",
                       sg_id))
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
                  open(os.path.join(HERE, "t3_surgery_cancel.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_surgery_cancel.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
