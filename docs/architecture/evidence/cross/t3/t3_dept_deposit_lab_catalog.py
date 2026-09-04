"""T3 (#218) — NỘP TẠM ỨNG TỪ KHOA VỀ QUỸ, và DANH MỤC XÉT NGHIỆM: hai đầu đều không ghi.

**Nộp tạm ứng.** `CreateDepartmentDepositAsync` ĐỌC thật — tra khoa, tra các phiếu tạm ứng, cộng
tổng tiền — rồi **không ghi gì**: sinh mã biên lai `TUK{yyyyMMddHHmmssfff}` và trả DTO. Điều dưỡng
nộp tiền tạm ứng thu tại khoa về quỹ bệnh viện, phần mềm in ra mã biên lai, và **không dòng nào ghi
lại rằng số tiền ấy đã được nộp**. Nộp lại đúng những phiếu ấy lần nữa vẫn được; đối chiếu quỹ thì
không tra ra ai nộp cái gì lúc nào.

Đầu bên kia cũng vậy — `ReceiveDepartmentDepositAsync` có chú thích thẳng thắn
`// No DepartmentDeposit table - return stub confirming receipt`, trả `Status = 2 // Đã tiếp nhận`
kèm `TotalAmount = 0`. Thủ quỹ bấm tiếp nhận, được xác nhận, không gì được ghi.

Đây là **tiền mặt đi qua tay người**, và cả hai đầu của việc bàn giao đều là vỏ rỗng.

Bản vá **không mượn `Deposits.Status`** làm dấu đã-nộp: cột đó đang có lệch nghĩa ĐÃ BIẾT mà cố ý
chưa sửa (giá trị 3 được đường ghi đặt là "đã tiêu hết" nhưng mọi báo cáo đọc là "đã hoàn tiền" — xem
`StatusConstants.DepositStatus`). Thêm nghĩa thứ ba vào đó là lặp lại đúng hình dạng đã làm hỏng số
liệu tử vong ở §42.

**Danh mục xét nghiệm.** `SaveLabTestAsync` là `return new LabTestCatalogDto { Code, Name };`. Đường
đọc lấy từ `Services` (`ServiceType = 2`) nên bảng đã có — nhóm A. Nhưng `SaveLabTestDto` mang theo
`ResultType`, `SampleType`, `TubeType`, `DecimalPlaces`, `ResultOptions`, `EnglishName` mà `Services`
không có ô nào để giữ. Lưu rồi **im lặng bỏ mất** mấy trường ấy thì đúng vào họ lỗi cả đợt đang chữa
⇒ migration 182 thêm cột.

Bảy ca. Ca 7 là **đối chứng ngược**.

Tiền tố dữ liệu T3TUK, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3TUK"
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
    print("  %-56s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def data_of(b):
    try:
        d = json.loads(b)
        return d.get("data", d)
    except Exception:
        return {}


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    d1, d2, d3 = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    try:
        dept = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Departments WHERE IsDeleted=0")
        pat = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Patients WHERE IsDeleted=0")
        usr = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")
        grp = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM ServiceGroups WHERE IsDeleted=0")
        if not (dept and pat and usr and grp):
            raise SystemExit("thiếu dữ liệu nền: dept=%r pat=%r usr=%r grp=%r" % (dept, pat, usr, grp))

        # Ba phiếu tạm ứng: hai để nộp đợt đầu, một dành cho ca đối chứng.
        sql("INSERT INTO Deposits (Id, ReceiptNumber, ReceiptDate, PatientId, Amount, PaymentMethod, "
            " ReceivedByUserId, Status, UsedAmount, RemainingAmount, CreatedAt, IsDeleted) VALUES "
            "('%s', N'%s-P1', GETUTCDATE(), '%s', 500000, 1, '%s', 2, 0, 500000, GETUTCDATE(), 0), "
            "('%s', N'%s-P2', GETUTCDATE(), '%s', 300000, 1, '%s', 2, 0, 300000, GETUTCDATE(), 0), "
            "('%s', N'%s-P3', GETUTCDATE(), '%s', 200000, 1, '%s', 2, 0, 200000, GETUTCDATE(), 0);"
            % (d1, TAG, pat, usr, d2, TAG, pat, usr, d3, TAG, pat, usr))

        print("── Nộp tạm ứng từ khoa về quỹ ──")
        st, b = http("POST", "/api/BillingComplete/deposits/department",
                     {"departmentId": dept, "depositIds": [d1, d2]})
        kq = data_of(b)
        ma = (kq or {}).get("receiptCode") or ""
        try:
            n = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM DepartmentDepositBatches "
                        "WHERE ReceiptCode=N'%s'" % ma.replace("'", "''")) or 0) if ma else 0
        except SystemExit:
            n = 0
        case("phiếu nộp ĐƯỢC ghi lại", n == 1,
             "HTTP %s · mã biên lai=%r · số dòng ghi được=%d" % (st, ma, n))

        try:
            danh_dau = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM Deposits "
                               "WHERE Id IN ('%s','%s') AND HandoverBatchId IS NOT NULL" % (d1, d2)) or 0)
        except SystemExit:
            danh_dau = 0
        case("hai phiếu tạm ứng ĐƯỢC đánh dấu đã nộp", danh_dau == 2,
             "số phiếu có HandoverBatchId=%d (mong 2)" % danh_dau)

        # Đòi ca trên đã đạt: nếu chẳng ghi gì thì "Status giữ nguyên" là hiển nhiên và vô nghĩa.
        stt = sql("SELECT CAST(MIN(Status) AS varchar(9)) + '/' + CAST(MAX(Status) AS varchar(9)) "
                  "FROM Deposits WHERE Id IN ('%s','%s')" % (d1, d2))
        case("KHÔNG mượn Deposits.Status làm dấu đã nộp",
             danh_dau == 2 and stt == "2/2",
             "có ghi dấu riêng=%s · Status min/max=%r (phải giữ 2/2)" % (danh_dau == 2, stt))

        print("\n── Nộp LẠI đúng những phiếu ấy ──")
        st2, b2 = http("POST", "/api/BillingComplete/deposits/department",
                       {"departmentId": dept, "depositIds": [d1, d2]})
        case("nộp trùng phiếu đã nộp bị CHẶN", st2 >= 400, "HTTP %s · %s" % (st2, b2[:75]))

        # ĐỐI CHỨNG NGƯỢC — không có ca này thì bản vá "chặn sạch" cũng ăn điểm.
        st3, b3 = http("POST", "/api/BillingComplete/deposits/department",
                       {"departmentId": dept, "depositIds": [d3]})
        kq3 = data_of(b3)
        case("ĐỐI CHỨNG: nộp lô phiếu CHƯA nộp vẫn chạy, tổng tiền đúng",
             st3 == 200 and float(kq3.get("totalAmount") or 0) == 200000.0,
             "HTTP %s · tổng tiền=%r (mong 200000)" % (st3, kq3.get("totalAmount")))

        print("\n── Danh mục xét nghiệm ──")
        ma_xn = "%s-XN1" % TAG
        st4, b4 = http("POST", "/api/LISComplete/catalog/tests",
                       {"code": ma_xn, "name": "%s Dinh luong Glucose" % TAG,
                        "englishName": "Glucose", "groupId": grp, "unit": "mmol/L",
                        "resultType": "Numeric", "decimalPlaces": 2, "price": 35000,
                        "insurancePrice": 30000, "sampleType": "Mau toan phan",
                        "tubeType": "Ong nap xanh", "tatMinutes": 60, "isActive": True})
        try:
            n4 = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM Services "
                         "WHERE ServiceCode=N'%s' AND IsDeleted=0" % ma_xn) or 0)
        except SystemExit:
            n4 = 0
        case("xét nghiệm ĐƯỢC lưu xuống Services", n4 == 1,
             "HTTP %s · số dòng ghi được=%d" % (st4, n4))

        try:
            ky_thuat = sql("SELECT ISNULL(ResultType,'-')+'|'+ISNULL(SampleType,'-')+'|'"
                           "+ISNULL(TubeType,'-')+'|'+ISNULL(CAST(DecimalPlaces AS varchar(9)),'-') "
                           "FROM Services WHERE ServiceCode=N'%s' AND IsDeleted=0" % ma_xn)
        except SystemExit:
            ky_thuat = ""
        case("thông số kỹ thuật KHÔNG bị bỏ mất khi lưu",
             ky_thuat == "Numeric|Mau toan phan|Ong nap xanh|2",
             "ResultType|SampleType|TubeType|DecimalPlaces = %r" % ky_thuat)

    finally:
        try:
            sql("IF OBJECT_ID('DepartmentDepositBatches') IS NOT NULL "
                " DELETE FROM DepartmentDepositBatches WHERE Id IN "
                "  (SELECT DISTINCT HandoverBatchId FROM Deposits "
                "   WHERE ReceiptNumber LIKE N'%s-%%' AND HandoverBatchId IS NOT NULL); "
                "DELETE FROM Deposits WHERE ReceiptNumber LIKE N'%s-%%'; "
                "DELETE FROM Services WHERE ServiceCode LIKE N'%s-%%';" % (TAG, TAG, TAG))
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:90])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_dept_deposit_lab_catalog.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_dept_deposit_lab_catalog.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
