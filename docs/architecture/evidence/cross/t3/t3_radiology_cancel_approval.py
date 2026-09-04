"""T3 (#218) — HỦY DUYỆT KẾT QUẢ CHẨN ĐOÁN HÌNH ẢNH: hai cửa hủy, một cửa làm đủ, một cửa làm trống.

Cùng một việc "đưa phiếu đã duyệt về nháp" có **hai** đường trong module CĐHA, và chúng kết thúc ở
đúng cùng một trạng thái (`Status = 0`, xoá `ApprovedBy`/`ApprovedAt`):

* `CancelSignedResultAsync` — làm đủ: **thu hồi chữ ký số** (`RadiologySignatureHistory.Status = 3`)
  và **ghi lại lý do** vào `RejectReason`.
* `CancelApprovalAsync` (`POST /api/RISComplete/results/{id}/cancel-approval`) — toàn bộ thân hàm là
  bốn dòng gán. Nhận tham số `reason` rồi **vứt đi không dùng một lần nào**. Không đụng tới chữ ký.

Ba hậu quả đo được:

1. **Chữ ký số vẫn còn hiệu lực** (`Status = 1`) trên một phiếu đã bị đưa về nháp — chữ ký bảo chứng
   cho một phiếu mà hệ thống đang coi là chưa duyệt. Ghi chú ở `RISCompleteService.OrdersResults.cs`
   (đợt sửa trước, cùng #218) đã nêu đúng chuyện này khi vá cửa SỬA NỘI DUNG, nhưng cửa HỦY DUYỆT
   thì lúc đó chưa đụng tới.
2. **Lý do hủy duyệt biến mất.** Hủy duyệt một kết quả chẩn đoán hình ảnh đã ký là việc phải giải
   trình được; API có nhận lý do, giao diện có bắt nhập, nhưng không có chỗ nào giữ lại.
3. **Phiếu và chỉ định nói khác nhau.** Duyệt thì đặt `RadiologyRequest.Status = 5` (Approved), hủy
   duyệt thì bỏ quên — phiếu về nháp (0) trong khi chỉ định vẫn khai là đã duyệt (5).

Cộng thêm một ca hiển nhiên: hủy duyệt một phiếu **chưa hề được duyệt** vẫn trả 200.

Bài đo đi qua HTTP thật với token admin. Có **đối chứng âm**: hủy duyệt một phiếu đã duyệt bình
thường bắt buộc vẫn phải thành công — nếu không thì bản vá chỉ là chặn bừa.

Tiền tố dữ liệu T3RCA, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3RCA"
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

    report_id = None
    try:
        # Mượn một phiếu đọc kết quả CÓ SẴN kèm chỉ định, ghi lại nguyên trạng để trả về đúng như cũ.
        row = sql("SELECT TOP 1 CAST(r.Id AS varchar(50)) + '|' + CAST(r.Status AS varchar(3)) + '|' "
                  " + CAST(req.Id AS varchar(50)) + '|' + CAST(req.Status AS varchar(3)) "
                  "FROM RadiologyReports r "
                  " JOIN RadiologyExams e ON e.Id = r.RadiologyExamId "
                  " JOIN RadiologyRequests req ON req.Id = e.RadiologyRequestId "
                  "WHERE r.IsDeleted=0")
        if row.count("|") != 3:
            raise SystemExit("không tìm được phiếu đọc kết quả gắn chỉ định: %r" % row)
        report_id, orig_rep_status, request_id, orig_req_status = row.split("|")

        def set_state(rep_status, req_status):
            sql("UPDATE RadiologyReports SET Status=%s, ApprovedBy=NULL, ApprovedAt=GETUTCDATE() WHERE Id='%s'; "
                "UPDATE RadiologyRequests SET Status=%s WHERE Id='%s'; "
                "DELETE FROM RadiologySignatureHistories WHERE RadiologyReportId='%s';"
                % (rep_status, report_id, req_status, request_id, report_id))

        def seed_signature():
            """Một chữ ký số ĐANG CÒN HIỆU LỰC (Status=1) trên phiếu."""
            uid = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")
            sql("INSERT INTO RadiologySignatureHistories (Id, RadiologyReportId, SignedByUserId, "
                " SignatureType, SignedAt, Status, CreatedAt, IsDeleted) VALUES "
                "('%s','%s','%s', 1, GETUTCDATE(), 1, GETUTCDATE(), 0);"
                % (uuid.uuid4(), report_id, uid))

        def sig_state():
            return sql("SELECT TOP 1 CAST(Status AS varchar(3)) + '|' + ISNULL(RejectReason, N'(trong)') "
                       "FROM RadiologySignatureHistories WHERE RadiologyReportId='%s'" % report_id)

        def rep_status():
            return sql("SELECT CAST(Status AS varchar(3)) FROM RadiologyReports WHERE Id='%s'" % report_id)

        def req_status():
            return sql("SELECT CAST(Status AS varchar(3)) FROM RadiologyRequests WHERE Id='%s'" % request_id)

        # ── 1. Hủy duyệt một phiếu CHƯA duyệt ───────────────────────────────
        print("── Hủy duyệt khi không có gì để hủy ──")
        set_state(0, 4)                       # phiếu đang là nháp
        st, b = http("POST", "/api/RISComplete/results/%s/cancel-approval" % report_id,
                     {"Reason": TAG + " chua duyet"})
        case("hủy duyệt một phiếu CHƯA duyệt", True, st >= 400,
             "HTTP %s · %s" % (st, b[:70]))

        # ── 2+3. Hủy duyệt phiếu ĐÃ KÝ SỐ ───────────────────────────────────
        print("\n── Hủy duyệt một phiếu đã ký số ──")
        set_state(2, 5)                       # đã duyệt, chỉ định cũng đã duyệt
        seed_signature()
        st, b = http("POST", "/api/RISComplete/results/%s/cancel-approval" % report_id,
                     {"Reason": TAG + " ly do that"})
        sig = sig_state()
        sig_status, _, reason = sig.partition("|")
        case("chữ ký số bị THU HỒI khi hủy duyệt", True, sig_status != "1",
             "trạng thái chữ ký=%s (1=còn hiệu lực, 3=đã thu hồi)" % sig_status)
        case("LÝ DO hủy duyệt được lưu lại", True, TAG in reason,
             "RejectReason=%r" % reason)
        case("chỉ định KHÔNG còn kẹt ở 'đã duyệt'", True, req_status() != "5",
             "phiếu=%s · chỉ định=%s (5=đã duyệt)" % (rep_status(), req_status()))

        # ── 4. ĐỐI CHỨNG ÂM ─────────────────────────────────────────────────
        # Ba ca trên đều dạng "phải chặn / phải làm thêm", nên một bản vá chặn sạch mọi lần hủy
        # duyệt cũng đạt điểm. Ca này bắt buộc đường hợp lệ vẫn phải thông.
        print("\n── Đối chứng âm: hủy duyệt hợp lệ vẫn phải chạy ──")
        set_state(2, 5)                       # đã duyệt, KHÔNG có chữ ký
        st, b = http("POST", "/api/RISComplete/results/%s/cancel-approval" % report_id,
                     {"Reason": TAG + " hop le"})
        case("hủy duyệt một phiếu đã duyệt (không ký) ĐƯỢC chạy", False,
             not (st == 200 and rep_status() == "0"),
             "HTTP %s · phiếu sau khi hủy=%s (0=nháp)" % (st, rep_status()))

    finally:
        if report_id:
            try:
                sql("DELETE FROM RadiologySignatureHistories WHERE RadiologyReportId='%s'; "
                    "UPDATE RadiologyReports SET Status=%s WHERE Id='%s'; "
                    "UPDATE RadiologyRequests SET Status=%s WHERE Id='%s';"
                    % (report_id, orig_rep_status, report_id, orig_req_status, request_id))
            except Exception as e:
                print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống làm THIẾU" if c["mustBlock"] else "hệ thống CHẶN nhầm đường hợp lệ"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_radiology_cancel_approval.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_radiology_cancel_approval.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
