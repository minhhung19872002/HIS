"""T3 (#218) — ĐÓNG HỒ SƠ BỆNH ÁN: cùng một lỗi, đã sửa đúng ở một nơi, còn nguyên ở nơi kia.

Hệ thống có **hai** đường đóng hồ sơ bệnh án:

1. `EmrAdminService.FinalizeRecordAsync` — làm ĐÚNG. Ngay trên đầu hàm còn ghi lại bài học:

       // ⚠️ Trước đây set Status=5 — SAI semantics (5 = ... của luồng khám).
       // Nay khóa bằng cờ riêng EmrFinalizedAt/By + ghi vết/phiên bản vào EmrAmendments

   Khóa bằng `MedicalRecords.EmrFinalizedAt`, có `EmrLockGuard` chặn sửa nội dung với đúng câu
   TT46, mở lại phải qua đường riêng có hạn chế quyền + bắt buộc lý do + lưu vết `EmrAmendments`.

2. `EmrManagementService.CloseEmrAsync` (B.2.5, `POST /api/emr-management/close`) — **vẫn làm đúng
   cái việc mà dòng cảnh báo trên nói là SAI**:

       examination.Status = 5;   // Closed

   Nhưng `ExaminationStatus` nói rõ **5 = Cancelled (Hủy)**. Nên đóng một hồ sơ đã khám xong lại
   đánh dấu lượt khám đó là ĐÃ HỦY, ở đúng cái ô mà cả hệ thống đang đọc:

   * `ReceptionCompleteService.Queue` in nhãn "Hủy" cho lượt khám đã hoàn thành;
   * `ExaminationCompleteService.Prescriptions` từ chối kê đơn với lý do "Phiên khám đã hủy";
   * `ExaminationCompleteService.Conclusion` từ chối sửa kết luận với lý do "Phiếu khám đã hủy".

   Khóa thì có khóa — nhưng khóa bằng cách khai man lượt khám đã bị hủy.

3. `ReopenEmrAsync` đặt `Status = 3` ("Chờ kết luận"), **bất kể trước đó là gì**. Một lượt khám
   Hoàn thành (4) đóng rồi mở lại thì thành Chờ kết luận — mất luôn dữ kiện đã khám xong.

Bài đo hỏi đúng ba câu: sau khi đóng, ô trạng thái có bị ghi đè thành "Hủy" không · cờ TT46
`EmrFinalizedAt` có được đặt không · mở lại có trả về đúng trạng thái cũ không.

Tiền tố dữ liệu T3EMR, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3EMR"
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


def case(name, ok, detail):
    CASES.append({"case": name, "pass": bool(ok), "detail": detail})
    print("  %-54s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    exam_id = None
    try:
        # Mượn một lượt khám CÓ SẴN gắn hồ sơ bệnh án, ghi lại trạng thái gốc để trả về đúng như cũ.
        row = sql("SELECT TOP 1 CAST(e.Id AS varchar(50)) + '|' + CAST(e.Status AS varchar(3)) + '|' "
                  " + CAST(e.MedicalRecordId AS varchar(50)) "
                  "FROM Examinations e WHERE e.IsDeleted=0 AND e.MedicalRecordId IS NOT NULL")
        if "|" not in row:
            raise SystemExit("không tìm được lượt khám có hồ sơ bệnh án: %r" % row)
        exam_id, orig_status, rec_id = row.split("|")

        # Dựng bối cảnh: lượt khám ĐÃ HOÀN THÀNH (4), hồ sơ CHƯA khóa TT46.
        sql("UPDATE Examinations SET Status=4 WHERE Id='%s'; "
            "UPDATE MedicalRecords SET EmrFinalizedAt=NULL, EmrFinalizedBy=NULL WHERE Id='%s';"
            % (exam_id, rec_id))

        # `CloseEmrAsync` chỉ đóng khi bộ tự kiểm không còn lỗi mức Error. Lượt đo ĐẦU quên chuyện
        # này: `canClose=false, errorCount=2` nên hàm THOÁT SỚM, không ghi gì — mà trạng thái không
        # đổi trông y hệt "đã đóng đúng cách", nên hai ca đầu báo PASS trong khi thật ra CHƯA ĐO GÌ.
        # Đúng cái bẫy đã gặp ở bài BHXH. Tắt tạm các luật tự kiểm để phép đóng THẬT SỰ chạy, rồi
        # bật lại ở phần dọn.
        sql("UPDATE EmrAutoCheckRules SET IsActive=0 WHERE IsActive=1;")

        print("── Đóng hồ sơ (POST /api/emr-management/close) ──")
        st, b = http("POST", "/api/emr-management/close", {"ExaminationId": exam_id, "Note": TAG})
        # Không đo mù: nếu phép đóng lại bị từ chối thì dừng hẳn, đừng báo PASS cho việc chưa xảy ra.
        if '"canClose":false' in b.replace(" ", ""):
            raise SystemExit("phep dong VAN bi tu choi, khong do duoc: %s" % b[:200])
        after = sql("SELECT CAST(Status AS varchar(3)) FROM Examinations WHERE Id='%s'" % exam_id)
        fin = sql("SELECT CASE WHEN EmrFinalizedAt IS NULL THEN 'khong' ELSE 'co' END "
                  "FROM MedicalRecords WHERE Id='%s'" % rec_id)

        # 5 = Cancelled trong ExaminationStatus. Đóng hồ sơ KHÔNG được biến lượt khám thành "đã hủy".
        case("đóng hồ sơ KHÔNG ghi đè trạng thái thành 'Hủy' (5)", after != "5",
             "HTTP %s · trạng thái sau khi đóng=%s (4=Hoàn thành, 5=Hủy)" % (st, after))
        case("đóng hồ sơ đặt cờ khóa TT46 EmrFinalizedAt", fin == "co",
             "EmrFinalizedAt=%s" % fin)

        # Hệ quả đo được ở nơi khác: nhãn hàng đợi tiếp đón đọc đúng ô Status đó.
        label = sql("SELECT CASE CAST(Status AS varchar(3)) WHEN '4' THEN N'Hoàn thành' "
                    " WHEN '5' THEN N'Hủy' ELSE CAST(Status AS varchar(3)) END "
                    "FROM Examinations WHERE Id='%s'" % exam_id)
        case("lượt khám đã xong KHÔNG bị hiển thị là 'Hủy'", label != "Hủy",
             "nhãn hệ thống đang hiển thị: %r" % label)

        # ── Ca QUAN TRỌNG NHẤT: khóa có còn khóa không ────────────────────
        # Trước bản vá, hồ sơ đã đóng chặn được sửa nội dung — nhưng chặn NHỜ `Status = 5` bị đọc
        # nhầm là "đã hủy". Bỏ dòng gán đó đi mà không có gì thay thế thì hoá ra **mở toang** hồ sơ
        # đã đóng, tức bản vá còn tệ hơn lỗi. Nên phải đo thẳng: đã đóng rồi thì sửa kết luận phải
        # bị từ chối, và từ chối bằng đúng lý do TT46 chứ không phải "phiếu khám đã hủy".
        st, b = http("PUT", "/api/examination/%s/conclusion" % exam_id,
                     {"conclusion": TAG, "treatment": TAG})
        case("hồ sơ ĐÃ ĐÓNG vẫn chặn sửa nội dung", st == 400 and "TT46" in b,
             "HTTP %s · %s" % (st, b[:110]))

        print("\n── Mở lại hồ sơ (POST /api/emr-management/reopen) ──")
        st, b = http("POST", "/api/emr-management/reopen", {"ExaminationId": exam_id, "Note": TAG})
        after2 = sql("SELECT CAST(Status AS varchar(3)) FROM Examinations WHERE Id='%s'" % exam_id)
        fin2 = sql("SELECT CASE WHEN EmrFinalizedAt IS NULL THEN 'khong' ELSE 'co' END "
                   "FROM MedicalRecords WHERE Id='%s'" % rec_id)
        case("mở lại trả về ĐÚNG trạng thái cũ (Hoàn thành=4)", after2 == "4",
             "HTTP %s · trạng thái sau khi mở lại=%s (3=Chờ kết luận)" % (st, after2))
        case("mở lại gỡ cờ khóa TT46", fin2 == "khong",
             "EmrFinalizedAt=%s" % fin2)

    finally:
        if exam_id:
            try:
                sql("UPDATE Examinations SET Status=%s WHERE Id='%s'; "
                    "DELETE FROM EmrCloseLogs WHERE Note=N'%s';" % (orig_status, exam_id, TAG))
                sql("UPDATE MedicalRecords SET EmrFinalizedAt=NULL, EmrFinalizedBy=NULL WHERE Id='%s';" % rec_id)
                sql("UPDATE EmrAutoCheckRules SET IsActive=1 WHERE IsDeleted=0;")
            except Exception as e:
                print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_emr_close_semantics.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_emr_close_semantics.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
