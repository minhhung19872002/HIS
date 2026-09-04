"""T3 (#218) — LỊCH HẸN KHÁM: ba nút đổi trạng thái không có một lượt kiểm nào.

Module đặt lịch có năm trạng thái: 0 Chờ xác nhận · 1 Đã xác nhận · 2 Đã đến khám · 3 Không đến ·
4 Đã hủy. Đọc mã thấy phần lớn được làm cẩn thận:

* `CancelBookingAsync` chặn hủy lịch đã check-in, chặn hủy lịch đã kết thúc;
* `CancelAppointmentAsync` (bệnh nhân tự hủy) xác thực số điện thoại rồi chặn `Status >= 2`;
* `UpdateBookingAsync` (đổi lịch) chặn `Status >= 2`, chặn ngày quá khứ, chặn trùng lịch;
* `CheckinFromBookingAsync` (tiếp đón lập hồ sơ) chặn `Status >= 2` và chặn hồ sơ khám trùng.

Nhưng ba nút còn lại — **xác nhận · đã đến khám · không đến** — chỉ là ba dòng gọi chung một hàm
`UpdateBookingStatus(code, newStatus, name)`, và hàm đó **gán thẳng trạng thái mới, không kiểm gì**:

    appointment.Status = newStatus;      // hết, không có một câu if nào phía trên

Đúng cái hình dạng đã gặp năm lần trong đợt này: *một luật, thi hành ở cửa này, bỏ trống ở cửa bên
cạnh*. Hậu quả thật, không phải lý thuyết:

* lịch **đã hủy** bấm "xác nhận" là sống lại thành lịch đang chờ khám;
* lịch **đã đến khám** bấm "không đến" là xoá sạch dấu vết bệnh nhân đã tới — mà `GetBookingStatsAsync`
  lấy tỉ lệ vắng từ chính hai con số đó, nên báo cáo vắng khám sai theo;
* lịch **không đến** bấm "đã đến khám" là dựng lại một lượt khám chưa từng xảy ra.

Bài đo đi qua HTTP thật với token admin, không cấy thẳng vào DB. Sáu ca "phải chặn" và ba **đối
chứng âm** — đường đi hợp lệ bắt buộc vẫn phải thông, để một bản vá chặn sạch mọi nút không thể
đạt điểm tuyệt đối.

Tiền tố dữ liệu T3APM, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3APM"
CASES = []
TOKEN = None


def http(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer %s" % TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
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
    # sqlcmd in lỗi ra stdout rồi trả mã 0 — chuỗi lỗi trông y hệt dữ liệu. Dừng còn hơn đo mù.
    if text.startswith("Msg ") or "Invalid column name" in text or "Invalid object name" in text:
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:120], text[:200]))
    return text


def case(name, must_block, blocked, detail):
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-52s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def seed(patient_id, status, n):
    """Dựng một lịch hẹn ở đúng trạng thái cần đo. Ngày hẹn để HÔM NAY."""
    code = "%s%s%02d" % (TAG, datetime.now().strftime("%H%M%S"), n)
    sql("INSERT INTO Appointments (Id, AppointmentCode, AppointmentDate, AppointmentTime, PatientId,"
        " AppointmentType, Reason, Status, IsReminderSent, CreatedAt, IsDeleted) VALUES "
        "('%s', N'%s', CAST(GETDATE() AS date), '08:00:00', '%s', 2, N'%s', %d, 0, GETUTCDATE(), 0);"
        % (uuid.uuid4(), code, patient_id, TAG, status))
    return code


def status_of(code):
    return sql("SELECT CAST(Status AS varchar(3)) FROM Appointments WHERE AppointmentCode='%s'" % code)


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    try:
        patient_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Patients WHERE IsDeleted=0")
        if len(patient_id) != 36:
            raise SystemExit("không tìm được bệnh nhân để gắn lịch hẹn: %r" % patient_id)

        # ── Sáu ca PHẢI CHẶN ────────────────────────────────────────────────
        print("── Đổi trạng thái từ một trạng thái đã kết thúc ──")
        probes = [
            ("xác nhận một lịch ĐÃ HỦY",              4, "confirm", "1"),
            ("xác nhận một lịch ĐÃ ĐẾN KHÁM",         2, "confirm", "1"),
            ("xác nhận một lịch đã KHÔNG ĐẾN",        3, "confirm", "1"),
            ("đánh dấu KHÔNG ĐẾN cho lịch ĐÃ ĐẾN KHÁM", 2, "no-show", "3"),
            ("check-in một lịch ĐÃ HỦY",              4, "checkin", "2"),
            ("check-in một lịch đã KHÔNG ĐẾN",        3, "checkin", "2"),
        ]
        for i, (name, start, action, bad_status) in enumerate(probes):
            code = seed(patient_id, start, i)
            st, b = http("PUT", "/api/booking-management/bookings/%s/%s" % (code, action))
            now = status_of(code)
            # Chặn = trạng thái KHÔNG chuyển sang giá trị nút đó muốn gán.
            case(name, True, now != bad_status,
                 "HTTP %s · %d → %s (mong đợi giữ %d)" % (st, start, now, start))

        # ── Ba ĐỐI CHỨNG ÂM: đường hợp lệ vẫn phải thông ────────────────────
        # Không có phần này thì một bản vá chặn sạch mọi nút cũng đạt 6/6, tức bài đo không phân
        # biệt được "vá đúng" với "làm hỏng cả module đặt lịch".
        print("\n── Đối chứng âm: đường đi hợp lệ ──")
        oks = [
            ("chờ xác nhận → xác nhận",     0, "confirm", "1"),
            ("đã xác nhận → đã đến khám",   1, "checkin", "2"),
            ("đã xác nhận → không đến",     1, "no-show", "3"),
        ]
        for i, (name, start, action, want) in enumerate(oks):
            code = seed(patient_id, start, 90 + i)
            st, b = http("PUT", "/api/booking-management/bookings/%s/%s" % (code, action))
            now = status_of(code)
            case(name, False, now != want,
                 "HTTP %s · %d → %s (mong đợi %s)" % (st, start, now, want))

    finally:
        try:
            sql("DELETE FROM Appointments WHERE AppointmentCode LIKE N'%s%%';" % TAG)
        except SystemExit as e:
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
                  open(os.path.join(HERE, "t3_appointment_transitions.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_appointment_transitions.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
