"""T3 (#218) — CHIA SẺ KẾT QUẢ CĐHA QUA QR: endpoint không cần đăng nhập, không kiểm gì cả.

Đây là mục nhóm B duy nhất trong đợt mà vấn đề chính không phải "mất dữ liệu" mà là **an ninh**.

`CreateShareResultQRAsync` sinh một mã chia sẻ và một mã truy cập 4 số, **không lưu cái nào**, rồi
đưa cho người bệnh. Phía kia:

    public async Task<RadiologyResultDto> GetSharedResultAsync(string shareCode, string accessCode)
    {
        // In production, validate share code and access code from database
        return new RadiologyResultDto { Description = "Shared result - implement validation", ... };
    }

Hàm **bỏ qua cả hai tham số**. Và endpoint gọi nó là `[AllowAnonymous]`:

    [HttpGet("shared-result/{shareCode}")]
    [AllowAnonymous]

Nói cho công bằng: **hôm nay nó chưa rò rỉ dữ liệu nào**, vì DTO dựng sẵn không chứa gì thật. Cái
đang hỏng là hai chuyện khác:

* tính năng **không chạy** — mã QR và mã truy cập đưa cho người bệnh không mở được gì;
* và chỗ này là **một endpoint không cần đăng nhập, đứng đúng nơi kết quả chẩn đoán hình ảnh sẽ chảy
  qua, với toàn bộ cơ chế bảo vệ chưa được cài**. Người nối nó vào dữ liệu thật — tức người làm đúng
  việc mà chú thích `// In production, validate...` bảo làm — sẽ mở kết quả của mọi người bệnh cho
  bất kỳ ai gọi, trừ khi họ nhớ cài phần kiểm tra trước.

Bảy ca. Ca 7 là **đối chứng ngược**: nhập sai vài lần dưới ngưỡng khoá thì mã đúng vẫn phải mở được —
không có nó thì một bản vá "chặn sạch, ai cũng không xem được" cũng ăn điểm tuyệt đối.

Tiền tố dữ liệu T3QR, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3QR"
CASES = []
TOKEN = None


def http(method, path, body=None, auth=True):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if auth:
        headers["Authorization"] = "Bearer %s" % TOKEN
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
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
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:150], text[:250]))
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

    report_id = None
    try:
        # Kết quả CĐHA thật để chia sẻ. KẾT LUẬN mang chuỗi nhận dạng riêng: mọi ca đo dưới đây đều
        # hỏi cùng một câu — "chuỗi này có lọt ra ngoài không / có về đúng người có quyền không".
        exam = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM RadiologyExams WHERE IsDeleted=0")
        rad = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")
        if not exam or not rad:
            raise SystemExit("thiếu dữ liệu nền: exam=%r radiologist=%r" % (exam, rad))

        KET_LUAN = "%s-KET-LUAN-RIENG-TU-CUA-NGUOI-BENH" % TAG
        report_id = str(uuid.uuid4())
        sql("INSERT INTO RadiologyReports (Id, RadiologyExamId, RadiologistId, ReportDate, "
            " Findings, Impression, Status, CreatedAt, IsDeleted) VALUES "
            "('%s','%s','%s', GETUTCDATE(), N'%s-MO-TA', N'%s', 1, GETUTCDATE(), 0);"
            % (report_id, exam, rad, TAG, KET_LUAN))

        print("── Tạo link chia sẻ ──")
        st, b = http("POST", "/api/RISComplete/results/%s/share-qr?validityHours=24" % report_id)
        try:
            share = json.loads(b).get("data") or json.loads(b)
        except Exception:
            share = {}
        share_url = (share or {}).get("shareUrl") or ""
        ma_chia_se = share_url.rstrip("/").split("/")[-1] if share_url else ""
        ma_truy_cap = (share or {}).get("accessCode") or ""

        try:
            luu = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyResultShares "
                          "WHERE ShareCode = N'%s'" % ma_chia_se.replace("'", "''")) or 0) \
                if ma_chia_se else 0
        except SystemExit:
            luu = 0  # bảng chưa tồn tại = chưa lưu được gì, đúng điều đang đo
        case("link chia sẻ ĐƯỢC lưu lại", luu == 1,
             "HTTP %s · mã chia sẻ=%r · số dòng lưu được=%d" % (st, ma_chia_se, luu))

        # Mã truy cập KHÔNG được lưu dạng rõ: ai đọc được bảng thì đọc được mọi kết quả đang chia sẻ.
        try:
            ro = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RadiologyResultShares "
                         "WHERE AccessCodeHash = N'%s'" % ma_truy_cap) or 0) if ma_truy_cap else 0
        except SystemExit:
            ro = -1
        case("mã truy cập KHÔNG lưu dạng rõ", luu == 1 and ro == 0,
             "tìm mã %r trong cột băm: %s" % (ma_truy_cap, "thấy (hỏng)" if ro > 0 else
                                              ("chưa có bảng" if ro < 0 else "không thấy")))

        print("\n── Mở link (endpoint KHÔNG cần đăng nhập) ──")
        # Sai mã truy cập: không được trả nội dung kết quả.
        st2, b2 = http("GET", "/api/RISComplete/shared-result/%s?accessCode=0000" % ma_chia_se,
                       auth=False)
        lo = KET_LUAN in b2
        case("SAI mã truy cập bị từ chối", st2 >= 400 and not lo,
             "HTTP %s · lọt kết luận=%s · %s" % (st2, lo, b2[:60]))

        # Mã chia sẻ không tồn tại: cũng không được trả gì.
        st3, b3 = http("GET", "/api/RISComplete/shared-result/KHONG-CO-THAT-%s?accessCode=1234" % TAG,
                       auth=False)
        case("mã chia sẻ KHÔNG TỒN TẠI bị từ chối",
             st3 >= 400 and "Shared result" not in b3,
             "HTTP %s · %s" % (st3, b3[:60]))

        # Dò mã: 4 chữ số chỉ có 10.000 khả năng, không đếm số lần thử thì dò hết trong vài giây.
        for _ in range(6):
            http("GET", "/api/RISComplete/shared-result/%s?accessCode=1111" % ma_chia_se, auth=False)
        st4, b4 = http("GET", "/api/RISComplete/shared-result/%s?accessCode=%s"
                       % (ma_chia_se, ma_truy_cap), auth=False)
        case("dò mã liên tiếp bị KHOÁ (kể cả sau đó nhập đúng)",
             st4 >= 400 and KET_LUAN not in b4, "HTTP %s · %s" % (st4, b4[:70]))

        # Thu hồi link rồi thì mã đúng cũng không mở được nữa.
        try:
            sql("UPDATE RadiologyResultShares SET FailedAttempts=0, LockedUntil=NULL, IsRevoked=1 "
                "WHERE ShareCode=N'%s'" % ma_chia_se)
            co_bang = True
        except SystemExit:
            co_bang = False
        st5, b5 = http("GET", "/api/RISComplete/shared-result/%s?accessCode=%s"
                       % (ma_chia_se, ma_truy_cap), auth=False)
        case("link ĐÃ THU HỒI không mở được nữa", co_bang and st5 >= 400 and KET_LUAN not in b5,
             "HTTP %s · có bảng=%s · lọt kết luận=%s" % (st5, co_bang, KET_LUAN in b5))

        # ĐỐI CHỨNG NGƯỢC — nhập sai 2 lần (dưới ngưỡng khoá) thì mã đúng vẫn phải mở được.
        print("\n── Đối chứng: link hợp lệ vẫn dùng được ──")
        try:
            sql("UPDATE RadiologyResultShares SET FailedAttempts=0, LockedUntil=NULL, IsRevoked=0 "
                "WHERE ShareCode=N'%s'" % ma_chia_se)
        except SystemExit:
            pass
        for _ in range(2):
            http("GET", "/api/RISComplete/shared-result/%s?accessCode=0001" % ma_chia_se, auth=False)
        st6, b6 = http("GET", "/api/RISComplete/shared-result/%s?accessCode=%s"
                       % (ma_chia_se, ma_truy_cap), auth=False)
        case("ĐỐI CHỨNG: mã ĐÚNG mở được đúng kết quả đó", st6 == 200 and KET_LUAN in b6,
             "HTTP %s · trả đúng kết luận của phiếu=%s" % (st6, KET_LUAN in b6))

    finally:
        try:
            if report_id:
                sql("IF OBJECT_ID('RadiologyResultShares') IS NOT NULL "
                    " DELETE FROM RadiologyResultShares WHERE RadiologyReportId='%s'; "
                    "DELETE FROM RadiologyReports WHERE Id='%s';" % (report_id, report_id))
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:90])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_share_result_qr.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_share_result_qr.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
