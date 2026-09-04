"""T3 (#218) — KẾ HOẠCH TỔNG HỢP HỒ SƠ: bốn cửa ghi rỗng, một cột trạng thái mang hai nghĩa.

`MedicalRecordPlanningService` có bốn hàm cùng đúng một khuôn đã gặp ở §25 (`CreateBorrowAsync`):
sinh mã bằng `new Random()`, `await Task.CompletedTask`, rồi **trả DTO như thể đã lưu**:

    SubmitHandoverAsync        gửi bàn giao hồ sơ        POST /handover/submit
    ApproveHandoverAsync       duyệt bàn giao            POST /handover/approve
    AssignTransferNumberAsync  cấp số chuyển tuyến       POST /transfers/assign-number
    CreateRecordCopyAsync      yêu cầu sao chụp hồ sơ    POST /record-copy

Nhưng khi lần theo đường ĐỌC để biết cửa ghi phải ghi vào đâu thì lòi ra hai chuyện nặng hơn
chính bốn cái vỏ rỗng:

**Một — `MedicalRecordArchives.Status` bị hai tính năng đọc theo hai bộ nghĩa xung đột.**

    giá trị │ kho lưu trữ (MedicalRecordArchiveService) │ màn bàn giao (GetHandoverStatusName)
    ────────┼───────────────────────────────────────────┼──────────────────────────────────────
       2    │ ĐANG MƯỢN                                 │ ĐÃ DUYỆT

Hậu quả có thật ngay hôm nay, chưa cần vá gì: hồ sơ **đang cho người khác mượn** hiện trên màn
bàn giao thành **"Đã duyệt"**, và `GetStatsAsync` đếm nó vào `completedHandovers`. Đây là lần thứ
tư của khuôn "mượn cột trạng thái của tính năng khác" (§13, §21, §33). Và nó là cái bẫy: cứ theo
chú thích DTO mà cho `ApproveHandoverAsync` ghi `Status = 2` thì mỗi lần duyệt bàn giao sẽ đánh
dấu hồ sơ thành đang-cho-mượn. Nên bản vá cấp cột riêng `HandoverStatus` (migration 178).

**Hai — `ApproveTransferAsync` là hàm THẬT nhưng ghi lý do từ chối đè lên nội dung lâm sàng:**

    discharge.DischargeInstructions = dto.Approve ? discharge.DischargeInstructions : dto.RejectReason;

`DischargeInstructions` là **hướng dẫn sau xuất viện cho người bệnh**. Từ chối một phiếu chuyển
tuyến thì xoá mất hướng dẫn đó. Lần thứ tư trong đợt gặp đúng hình dạng này (§23, §27, §30).

Tám ca, trong đó **ca 7 là đối chứng ngược**: duyệt chuyển tuyến hợp lệ phải vẫn chạy được. Không
có nó thì một bản vá "chặn sạch" cũng ăn điểm tuyệt đối.

Tiền tố dữ liệu T3KHTH, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3KHTH"
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
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:150], text[:250]))
    return text


def case(name, ok, detail):
    CASES.append({"case": name, "pass": bool(ok), "detail": detail})
    print("  %-58s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    arc = arc_loan = dis_reject = dis_ok = dis_num = dis_dead = None
    try:
        rec = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE IsDeleted=0")
        pat = sql("SELECT TOP 1 CAST(PatientId AS varchar(50)) FROM MedicalRecords WHERE Id='%s'" % rec)
        usr = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")
        # `Discharges` một-đối-một với `Admissions` (unique key trên AdmissionId), nên ba ca đo
        # cần ba lượt nằm viện CHƯA có phiếu ra viện.
        adms = [x.strip() for x in sql(
            "SELECT TOP 4 CAST(a.Id AS varchar(50)) FROM Admissions a "
            "WHERE a.IsDeleted=0 AND NOT EXISTS "
            " (SELECT 1 FROM Discharges d WHERE d.AdmissionId = a.Id)").splitlines() if x.strip()]
        if not (rec and pat and usr) or len(adms) < 4:
            raise SystemExit("thiếu dữ liệu nền để dựng ca đo: rec=%r pat=%r usr=%r admissions=%d"
                             % (rec, pat, usr, len(adms)))

        # ── Dựng dữ liệu ────────────────────────────────────────────────────────────────
        # arc      : hồ sơ đã lưu kho, sẽ đem đi bàn giao
        # arc_loan : hồ sơ ĐANG CHO MƯỢN (Status=2) — để bắt vụ đụng nghĩa cột
        arc, arc_loan = str(uuid.uuid4()), str(uuid.uuid4())
        sql("INSERT INTO MedicalRecordArchives (Id, ArchiveCode, MedicalRecordId, PatientId, Status, "
            " ArchiveYear, IsOnLoan, CreatedAt, IsDeleted) VALUES "
            "('%s', N'%s-A1', '%s', '%s', 1, 2026, 0, GETUTCDATE(), 0), "
            "('%s', N'%s-A2', '%s', '%s', 2, 2026, 1, GETUTCDATE(), 0);"
            % (arc, TAG, rec, pat, arc_loan, TAG, rec, pat))

        # Ba phiếu chuyển tuyến (Discharges có DischargeType=2), mỗi phiếu cho một ca.
        # HD = hướng dẫn sau xuất viện, nội dung lâm sàng phải còn nguyên sau khi từ chối.
        HD = "%s-HUONG-DAN-LAM-SANG: uong thuoc du 7 ngay, tai kham thu 5" % TAG
        # dis_dead: phiếu chuyển tuyến của người bệnh có kết cục TỬ VONG, cố ý KHÔNG bấm duyệt —
        # dùng riêng cho ca đọc, để kết quả không bị chính lệnh duyệt của ca khác làm nhiễu.
        dis_reject, dis_ok, dis_num, dis_dead = (str(uuid.uuid4()), str(uuid.uuid4()),
                                                 str(uuid.uuid4()), str(uuid.uuid4()))
        sql("INSERT INTO Discharges (Id, AdmissionId, DischargeDate, DischargeType, DischargeCondition, "
            " DischargedBy, DischargeInstructions, CreatedAt, IsDeleted) VALUES "
            "('%s','%s', GETUTCDATE(), 2, 0, '%s', N'%s', GETUTCDATE(), 0), "
            "('%s','%s', GETUTCDATE(), 2, 0, '%s', N'%s', GETUTCDATE(), 0), "
            "('%s','%s', GETUTCDATE(), 2, 0, '%s', N'%s', GETUTCDATE(), 0), "
            "('%s','%s', GETUTCDATE(), 2, 5, '%s', N'%s', GETUTCDATE(), 0);"
            % (dis_reject, adms[0], usr, HD, dis_ok, adms[1], usr, HD,
               dis_num, adms[2], usr, HD, dis_dead, adms[3], usr, HD))

        def col(table, idv, c):
            return sql("SELECT ISNULL(CAST(%s AS nvarchar(200)), '<null>') FROM %s WHERE Id='%s'"
                       % (c, table, idv))

        # ── Bàn giao hồ sơ ──────────────────────────────────────────────────────────────
        print("── Bàn giao hồ sơ ──")
        st, b = http("POST", "/api/medical-record-planning/handover/submit",
                     {"medicalRecordIds": [rec], "note": "%s gui ban giao" % TAG})
        hs = col("MedicalRecordArchives", arc, "HandoverStatus")
        case("gửi bàn giao ĐƯỢC ghi xuống hồ sơ lưu trữ", hs == "1",
             "HTTP %s · HandoverStatus=%s (mong 1)" % (st, hs))

        st, b = http("POST", "/api/medical-record-planning/handover/approve",
                     {"handoverId": arc, "approve": True})
        hs = col("MedicalRecordArchives", arc, "HandoverStatus")
        case("duyệt bàn giao ĐƯỢC ghi xuống hồ sơ lưu trữ", hs == "2",
             "HTTP %s · HandoverStatus=%s (mong 2)" % (st, hs))

        # Đối chứng chống-hồi-quy cho chính bản vá: duyệt bàn giao KHÔNG được đụng vào
        # `Status` — cột đó là của kho lưu trữ/mượn trả, không phải của bàn giao.
        stt = col("MedicalRecordArchives", arc, "Status")
        case("duyệt bàn giao KHÔNG đụng cột Status của kho lưu trữ", stt == "1",
             "Status=%s (phải giữ nguyên 1 = đã lưu)" % stt)

        # Vụ đụng nghĩa: hồ sơ ĐANG MƯỢN (Status=2) không được hiện là "Đã duyệt" bàn giao.
        st, b = http("GET", "/api/medical-record-planning/handover?keyword=%s-A2&pageSize=5" % TAG)
        loan_shown_approved = '"Da duyet"' in b or '"Đã duyệt"' in b
        case("hồ sơ ĐANG MƯỢN không bị báo là 'đã duyệt bàn giao'", not loan_shown_approved,
             "HTTP %s · %s" % (st, b[:110]))

        # ── Chuyển tuyến ────────────────────────────────────────────────────────────────
        print("\n── Chuyển tuyến ──")
        st, b = http("POST", "/api/medical-record-planning/transfers/assign-number",
                     {"transferId": dis_num, "transferNumber": "%s-CV-001" % TAG})
        tn = col("Discharges", dis_num, "TransferNumber")
        case("cấp số chuyển tuyến ĐƯỢC ghi xuống phiếu", tn == "%s-CV-001" % TAG,
             "HTTP %s · TransferNumber=%s" % (st, tn))

        st, b = http("POST", "/api/medical-record-planning/transfers/approve",
                     {"transferId": dis_reject, "approve": False,
                      "rejectReason": "%s-LY-DO-TU-CHOI" % TAG})
        hd_sau = col("Discharges", dis_reject, "DischargeInstructions")
        case("từ chối chuyển tuyến KHÔNG đè hướng dẫn sau xuất viện", hd_sau == HD,
             "HTTP %s · hướng dẫn còn=%r" % (st, hd_sau[:60]))

        # ĐỐI CHỨNG NGƯỢC — không có ca này thì bản vá "chặn sạch" cũng ăn điểm tuyệt đối.
        st, b = http("POST", "/api/medical-record-planning/transfers/approve",
                     {"transferId": dis_ok, "approve": True})
        ts = col("Discharges", dis_ok, "TransferStatus")
        hd_ok = col("Discharges", dis_ok, "DischargeInstructions")
        case("ĐỐI CHỨNG: duyệt chuyển tuyến hợp lệ vẫn chạy", ts == "1" and hd_ok == HD,
             "HTTP %s · TransferStatus=%s · hướng dẫn nguyên vẹn=%s" % (st, ts, hd_ok == HD))

        # Duyệt hồ sơ là việc HÀNH CHÍNH, không được đụng vào kết cục điều trị của người bệnh —
        # cột đó chảy thẳng vào số liệu khỏi/đỡ/tử vong bệnh viện báo lên cơ quan quản lý.
        # Dựng phiếu với kết cục TỬ VONG rồi duyệt, xem có bị viết lại thành "khỏi" không.
        sql("UPDATE Discharges SET DischargeCondition = 5, TransferStatus = NULL WHERE Id='%s'" % dis_num)
        st, b = http("POST", "/api/medical-record-planning/transfers/approve",
                     {"transferId": dis_num, "approve": True})
        dc = col("Discharges", dis_num, "DischargeCondition")
        case("duyệt chuyển tuyến KHÔNG ghi đè kết cục điều trị", dc == "5",
             "HTTP %s · DischargeCondition=%s (dựng 5=tử vong, duyệt xong phải vẫn 5)" % (st, dc))

        # Và chiều đọc: người bệnh tử vong không được hiện thành "Hoàn thành" hồ sơ chuyển tuyến.
        # Đọc trên `dis_dead` — phiếu chưa hề bấm duyệt — để kết quả không do lệnh duyệt tạo ra.
        st, b = http("GET", "/api/medical-record-planning/transfers?pageSize=200")
        row = next((x for x in json.loads(b)["data"]["items"] if x["id"] == dis_dead), None)
        case("kết cục tử vong không bị đọc thành trạng thái hồ sơ",
             row is not None and row.get("statusName") == "Cho duyet",
             "HTTP %s · phiếu tử vong CHƯA duyệt hiện là %r (mong 'Cho duyet')"
             % (st, (row or {}).get("statusName")))

        # ── Sao chụp hồ sơ ──────────────────────────────────────────────────────────────
        print("\n── Sao chụp hồ sơ ──")
        st, b = http("POST", "/api/medical-record-planning/record-copy",
                     {"medicalRecordId": rec, "requester": "%s-NGUOI-XIN" % TAG,
                      "purpose": "%s giam dinh BHXH" % TAG, "copyCount": 3})
        try:
            n = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RecordCopyRequests "
                        "WHERE Requester=N'%s-NGUOI-XIN'" % TAG) or 0)
        except SystemExit:
            n = 0  # bảng chưa tồn tại = chưa lưu được gì, đúng là điều đang đo
        case("yêu cầu sao chụp ĐƯỢC lưu vết", n == 1,
             "HTTP %s · số yêu cầu lưu được=%d" % (st, n))

    finally:
        try:
            sql("DELETE FROM Discharges WHERE Id IN ('%s','%s','%s','%s');"
                % (dis_reject or uuid.uuid4(), dis_ok or uuid.uuid4(),
                   dis_num or uuid.uuid4(), dis_dead or uuid.uuid4()))
            sql("DELETE FROM MedicalRecordArchives WHERE ArchiveCode LIKE N'%s-%%';" % TAG)
            sql("IF OBJECT_ID('RecordCopyRequests') IS NOT NULL "
                " DELETE FROM RecordCopyRequests WHERE Requester LIKE N'%s-%%';" % TAG)
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:90])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_record_planning.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_record_planning.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
