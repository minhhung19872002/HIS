"""T3 (#218) — HỦY / MỞ LẠI LƯỢT KHÁM: lý do hủy ghi ĐÈ lên kết luận của bác sĩ.

Hai thao tác trên cùng một lượt khám, cùng một file, và cùng không có một lượt kiểm nào.

**`CancelExaminationAsync`** (`POST /api/examination/{id}/cancel`) — bốn dòng:

    examination.Status = 5;                  // Cancelled
    examination.ConclusionNote = reason;     // ← ghi ĐÈ

`ConclusionNote` là **kết luận khám của bác sĩ**: `CompleteExaminationAsync` và
`UpdateConclusionAsync` đều ghi nó từ `dto.ConclusionNotes`, và `CdaDocumentService` lấy đúng ô đó
làm phần diễn biến lâm sàng cho tài liệu CDA gửi hồ sơ sức khỏe quốc gia. Hủy một lượt khám đã có
kết luận là **xoá mất kết luận ấy**, thay bằng câu "lý do hủy". Cùng dạng với lỗi mất bàn giao lâm
sàng khi chuyển khoa ở §10.

Không có gác nào khác: hủy được lượt khám **đã hoàn thành**, hủy lại lượt **đã hủy**, và hủy cả lượt
thuộc hồ sơ **đã khóa TT46** (`EmrFinalizedAt`) — trong khi sửa kết luận của chính lượt đó thì bị
`EmrLockGuard` chặn.

**`RevertCompletionAsync`** (`POST /api/examination/{id}/revert-completion`) — gán `Status = 1` bất
kể đang ở đâu, nên mở lại được cả lượt **đã hủy**; và tham số `reason` nhận rồi vứt, giống
`CancelApprovalAsync` (§21) và `CancelDischargeAsync` (§23).

Bài đo có **đối chứng âm**: hủy một lượt đang khám dở, và mở lại một lượt vừa hoàn thành, đều bắt
buộc vẫn phải chạy.

Tiền tố dữ liệu T3EXC, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3EXC"
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


KL = "KET-LUAN-CUA-BAC-SI"


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    exam_id = None
    try:
        row = sql("SELECT TOP 1 CAST(e.Id AS varchar(50)) + '|' + CAST(e.Status AS varchar(3)) + '|' "
                  " + CAST(e.MedicalRecordId AS varchar(50)) + '|' + ISNULL(e.ConclusionNote, N'(trong)') "
                  "FROM Examinations e WHERE e.IsDeleted=0 AND e.MedicalRecordId IS NOT NULL")
        if row.count("|") < 3:
            raise SystemExit("không tìm được lượt khám: %r" % row)
        parts = row.split("|")
        exam_id, orig_status, rec_id, orig_note = parts[0], parts[1], parts[2], "|".join(parts[3:])

        def set_state(status, note=KL, finalized=False):
            sql("UPDATE Examinations SET Status=%s, ConclusionNote=N'%s' WHERE Id='%s'; "
                "UPDATE MedicalRecords SET EmrFinalizedAt=%s WHERE Id='%s';"
                % (status, note, exam_id,
                   "GETUTCDATE()" if finalized else "NULL", rec_id))

        def note():
            return sql("SELECT ISNULL(ConclusionNote, N'(trong)') FROM Examinations WHERE Id='%s'" % exam_id)

        def status():
            return sql("SELECT CAST(Status AS varchar(3)) FROM Examinations WHERE Id='%s'" % exam_id)

        # ── 1. Hủy một lượt khám ĐÃ CÓ KẾT LUẬN ────────────────────────────
        print("── Hủy lượt khám đã hoàn thành, đã có kết luận ──")
        set_state(4)
        st, b = http("POST", "/api/examination/%s/cancel" % exam_id, {"Reason": TAG + " ly do huy"})
        n = note()
        case("kết luận của bác sĩ KHÔNG bị lý do hủy ghi đè", True, KL in n,
             "HTTP %s · ConclusionNote hiện tại=%r" % (st, n[:60]))
        case("hủy một lượt khám ĐÃ HOÀN THÀNH bị chặn", True, status() != "5",
             "trạng thái=%s (5=đã hủy)" % status())

        # ── 2. Hủy lượt khám thuộc hồ sơ ĐÃ KHÓA TT46 ──────────────────────
        print("\n── Hủy lượt khám thuộc hồ sơ đã khóa TT46 ──")
        set_state(1, finalized=True)
        st, b = http("POST", "/api/examination/%s/cancel" % exam_id, {"Reason": TAG + " huy khi da khoa"})
        case("hủy lượt khám của hồ sơ ĐÃ KHÓA bị chặn", True, status() != "5",
             "HTTP %s · trạng thái=%s · %s" % (st, status(), b[:50]))
        sql("UPDATE MedicalRecords SET EmrFinalizedAt=NULL WHERE Id='%s'" % rec_id)

        # ── 3. Mở lại một lượt ĐÃ HỦY ──────────────────────────────────────
        print("\n── Mở lại một lượt khám đã hủy ──")
        set_state(5)
        st, b = http("POST", "/api/examination/%s/revert-completion" % exam_id,
                     {"Reason": TAG + " mo lai"})
        case("mở lại một lượt khám ĐÃ HỦY bị chặn", True, status() != "1",
             "HTTP %s · trạng thái=%s · %s" % (st, status(), b[:50]))

        # ── 4+5. ĐỐI CHỨNG ÂM ──────────────────────────────────────────────
        print("\n── Đối chứng âm: đường hợp lệ vẫn phải thông ──")
        set_state(1)
        st, b = http("POST", "/api/examination/%s/cancel" % exam_id, {"Reason": TAG + " huy hop le"})
        case("hủy một lượt đang khám dở ĐƯỢC chạy", False, status() != "5",
             "HTTP %s · trạng thái=%s" % (st, status()))
        # Chuyển lý do sang ô riêng chỉ có nghĩa nếu nó THẬT SỰ được lưu ở đó — và kết luận của
        # bác sĩ phải còn nguyên bên cạnh.
        both = sql("SELECT ISNULL(CancelReason, N'(trong)') + N' ~~ ' + ISNULL(ConclusionNote, N'(trong)') "
                   "FROM Examinations WHERE Id='%s'" % exam_id)
        case("lý do hủy lưu vào ô riêng, kết luận còn nguyên", True,
             (TAG in both.split(" ~~ ")[0]) and (KL in both.split(" ~~ ")[-1]),
             "CancelReason ~~ ConclusionNote = %r" % both[:90])

        set_state(4)
        st, b = http("POST", "/api/examination/%s/revert-completion" % exam_id,
                     {"Reason": TAG + " mo lai hop le"})
        case("mở lại một lượt vừa hoàn thành ĐƯỢC chạy", False, status() != "1",
             "HTTP %s · trạng thái=%s" % (st, status()))

    finally:
        if exam_id:
            try:
                sql("UPDATE Examinations SET Status=%s, ConclusionNote=%s WHERE Id='%s'; "
                    "UPDATE MedicalRecords SET EmrFinalizedAt=NULL WHERE Id='%s';"
                    % (orig_status,
                       "NULL" if orig_note == "(trong)" else "N'" + orig_note.replace("'", "''") + "'",
                       exam_id, rec_id))
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
                  open(os.path.join(HERE, "t3_examination_cancel_revert.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_examination_cancel_revert.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
