"""T3 (#218) — GIẤY NGHỈ ỐM / NGHỈ THAI SẢN: cấp xong mà bệnh viện không giữ lại bản ghi nào.

`CreateSickLeaveAsync` và `CreateMaternityLeaveAsync` là hai hàm rỗng thuộc **nhóm B** của khảo sát
§38 — nhóm "chưa có bảng", tức tính năng còn thiếu chứ không phải chỉ quên nối đường ghi:

    return new SickLeaveDto { Id = Guid.NewGuid(), ExaminationId = examinationId, ... };

Người dùng cấp giấy, giao diện báo thành công kèm một Id trông hợp lệ, và **không dòng nào được ghi
xuống** — trước migration 177 thì cũng không có bảng nào để ghi.

Đây là **giấy tờ pháp lý** (mẫu C65-HD theo TT 56/2017) để người bệnh hưởng chế độ BHXH. Không có
bản ghi thì cơ sở khám chữa bệnh không tra cứu lại được đã cấp cho ai, bao nhiêu ngày, và không đối
chiếu được khi cơ quan BHXH hỏi.

Bài đo kiểm bốn chuyện, theo đúng kỷ luật của cả đợt:

1. giấy cấp ra **thật sự được ghi xuống bảng** (đếm dòng, không nhìn mã HTTP — hàm rỗng vẫn trả 200);
2. **chẩn đoán được chụp lại** tại thời điểm cấp, và **không đổi theo** khi lượt khám sửa chẩn đoán
   sau đó — giấy đã phát ra tay người bệnh là tuyên bố đóng băng (bài học §27/§33);
3. **khoảng ngày phải hợp lệ**: ngày kết thúc sớm hơn ngày bắt đầu thì từ chối, không kẹp về 0 như
   lỗi truyền dịch §32;
4. **không cấp trùng** hai giấy cùng loại cho một lượt khám.

Tiền tố dữ liệu T3GNP, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3GNP"
CHAN_DOAN_GOC = "VIEM-PHOI-LUC-CAP-GIAY"
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
    print("  %-56s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    exam = None
    try:
        row = sql("SELECT TOP 1 CAST(e.Id AS varchar(50)) + '|' + CAST(e.Status AS varchar(3)) + '|' "
                  " + ISNULL(e.MainDiagnosis, N'(trong)') "
                  "FROM Examinations e WHERE e.IsDeleted=0 AND e.MedicalRecordId IS NOT NULL")
        if row.count("|") < 2:
            raise SystemExit("không tìm được lượt khám: %r" % row)
        parts = row.split("|")
        exam, orig_status, orig_diag = parts[0], parts[1], "|".join(parts[2:])

        # Mốc ngày do CHÍNH bài đo quyết định — bài học §39 (lệch đồng hồ host/container).
        FROM = datetime.now().date()
        TO = FROM + timedelta(days=4)          # 5 ngày kể cả hai đầu

        def reset():
            sql("DELETE FROM SickLeaves WHERE ExaminationId='%s'; "
                "DELETE FROM MaternityLeaves WHERE ExaminationId='%s'; "
                "UPDATE Examinations SET Status=4, MainDiagnosis=N'%s', MainIcdCode=N'J18' WHERE Id='%s';"
                % (exam, exam, CHAN_DOAN_GOC, exam))

        def so_giay(bang):
            return int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM %s WHERE ExaminationId='%s'"
                           % (bang, exam)) or 0)

        # ── 1. Cấp giấy nghỉ ốm ─────────────────────────────────────────────
        print("── Cấp giấy nghỉ ốm ──")
        reset()
        st, b = http("POST", "/api/examination/%s/sick-leave" % exam,
                     {"Days": 5, "FromDate": FROM.isoformat(), "ToDate": TO.isoformat(),
                      "Reason": TAG + " nghi om"})
        n = so_giay("SickLeaves")
        case("giấy nghỉ ốm ĐƯỢC ghi xuống bảng", n == 1,
             "HTTP %s · số giấy trong bảng=%d" % (st, n))

        so = sql("SELECT TOP 1 ISNULL(CertificateNumber, N'(trong)') + N' ~~ ' "
                 " + ISNULL(DiagnosisName, N'(trong)') FROM SickLeaves WHERE ExaminationId='%s'" % exam)
        case("giấy mang SỐ GIẤY và CHẨN ĐOÁN chụp tại lúc cấp",
             so.split(" ~~ ")[0].startswith("NO") and CHAN_DOAN_GOC in so,
             "số giấy ~~ chẩn đoán = %r" % so[:60])

        # ── 2. Sửa chẩn đoán lượt khám SAU khi đã cấp giấy ──────────────────
        # Giấy đã phát ra tay người bệnh là tuyên bố đóng băng: sửa hồ sơ sau đó KHÔNG được
        # đổi nội dung tờ giấy đã cấp.
        print("\n── Sửa chẩn đoán lượt khám sau khi giấy đã cấp ──")
        sql("UPDATE Examinations SET MainDiagnosis=N'CHAN-DOAN-SUA-SAU' WHERE Id='%s'" % exam)
        sau = sql("SELECT TOP 1 ISNULL(DiagnosisName, N'(trong)') FROM SickLeaves WHERE ExaminationId='%s'" % exam)
        case("chẩn đoán trên giấy đã cấp KHÔNG đổi theo", CHAN_DOAN_GOC in sau,
             "chẩn đoán trên giấy=%r" % sau[:45])

        # ── 3. Cấp trùng ────────────────────────────────────────────────────
        print("\n── Cấp giấy nghỉ ốm lần hai cho cùng lượt khám ──")
        st, b = http("POST", "/api/examination/%s/sick-leave" % exam,
                     {"Days": 5, "FromDate": FROM.isoformat(), "ToDate": TO.isoformat(),
                      "Reason": TAG + " cap trung"})
        case("cấp trùng giấy cùng loại bị chặn", st >= 400 and so_giay("SickLeaves") == 1,
             "HTTP %s · số giấy=%d · %s" % (st, so_giay("SickLeaves"), b[:50]))

        # ── 4. Khoảng ngày ngược ────────────────────────────────────────────
        print("\n── Ngày kết thúc sớm hơn ngày bắt đầu ──")
        reset()
        st, b = http("POST", "/api/examination/%s/sick-leave" % exam,
                     {"Days": 5, "FromDate": TO.isoformat(), "ToDate": FROM.isoformat(),
                      "Reason": TAG + " ngay nguoc"})
        case("khoảng ngày ngược bị từ chối", st >= 400 and so_giay("SickLeaves") == 0,
             "HTTP %s · số giấy=%d · %s" % (st, so_giay("SickLeaves"), b[:50]))

        # ── 5. Giấy nghỉ thai sản ───────────────────────────────────────────
        print("\n── Cấp giấy nghỉ thai sản ──")
        reset()
        st, b = http("POST", "/api/examination/%s/maternity-leave" % exam,
                     {"Days": 5, "FromDate": FROM.isoformat(), "ToDate": TO.isoformat(),
                      "GestationalWeeks": 38, "Reason": TAG + " thai san"})
        n = so_giay("MaternityLeaves")
        tuan = sql("SELECT TOP 1 ISNULL(CAST(GestationalWeeks AS varchar(5)), '?') "
                   "FROM MaternityLeaves WHERE ExaminationId='%s'" % exam)
        case("giấy nghỉ thai sản ĐƯỢC ghi, giữ số tuần thai", n == 1 and tuan == "38",
             "HTTP %s · số giấy=%d · tuần thai=%s" % (st, n, tuan))

        # ── 6. Không cấp trên lượt khám ĐÃ HỦY ──────────────────────────────
        print("\n── Cấp giấy trên một lượt khám ĐÃ HỦY ──")
        reset()
        sql("UPDATE Examinations SET Status=5 WHERE Id='%s'" % exam)
        st, b = http("POST", "/api/examination/%s/sick-leave" % exam,
                     {"Days": 5, "FromDate": FROM.isoformat(), "ToDate": TO.isoformat(),
                      "Reason": TAG + " da huy"})
        case("không cấp giấy trên lượt khám đã hủy", st >= 400 and so_giay("SickLeaves") == 0,
             "HTTP %s · số giấy=%d · %s" % (st, so_giay("SickLeaves"), b[:50]))

    finally:
        if exam:
            try:
                sql("DELETE FROM SickLeaves WHERE ExaminationId='%s'; "
                    "DELETE FROM MaternityLeaves WHERE ExaminationId='%s'; "
                    "UPDATE Examinations SET Status=%s, MainDiagnosis=%s WHERE Id='%s';"
                    % (exam, exam, orig_status,
                       "NULL" if orig_diag == "(trong)" else "N'" + orig_diag.replace("'", "''") + "'",
                       exam))
            except Exception as e:
                print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_leave_certificates.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_leave_certificates.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
