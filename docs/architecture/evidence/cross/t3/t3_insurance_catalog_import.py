"""T3 (#218) — NHẬP DANH MỤC BHYT: nhập file xong báo "0 dòng", không lỗi, không dữ liệu.

    public async Task<ImportResultDto> ImportMedicineCatalogAsync(byte[] fileContent)
    {
        return new ImportResultDto { TotalRows = 0, SuccessRows = 0, FailedRows = 0, Errors = new() };
    }

`ImportServiceCatalogAsync` y hệt. `UpdateInsurancePricesAsync` thì `return dto;`.

Cách phản hồi này đáng nói riêng. Trả `TotalRows = 0` **không kèm lỗi nào** đọc ra thành *"file của
bạn rỗng"*, chứ không phải *"chức năng này chưa làm gì"*. Người quản trị nhập danh mục BHYT theo một
quyết định mới của Bộ, thấy 0 dòng, sẽ đi kiểm tra lại file của mình. Một hàm rỗng **im lặng** còn đỡ
hơn một hàm rỗng **đổ lỗi cho dữ liệu người dùng**.

`InsurancePriceConfigs` có `EffectiveFrom`/`EffectiveTo`/`DecisionNumber` — tức giá BHYT được thiết
kế để **có phiên bản theo ngày hiệu lực**. Đó là yêu cầu thật: hồ sơ thanh toán của tháng trước phải
được giám định theo giá của tháng trước. Nên nhập giá mới phải **đóng bản cũ và mở bản mới**, không
ghi đè — ghi đè là xoá mất căn cứ của mọi hồ sơ đã gửi.

Bảy ca. Ca 7 là **đối chứng ngược**: file hợp lệ phải nhập được đủ số dòng.

Tiền tố dữ liệu T3DM, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3DM"
CASES = []
TOKEN = None


def upload(path, filename, content: bytes):
    """POST multipart/form-data một file, không dùng thư viện ngoài."""
    bound = "----t3boundary%s" % uuid.uuid4().hex
    body = (
        ("--%s\r\nContent-Disposition: form-data; name=\"file\"; filename=\"%s\"\r\n"
         "Content-Type: text/csv\r\n\r\n" % (bound, filename)).encode()
        + content
        + ("\r\n--%s--\r\n" % bound).encode()
    )
    req = urllib.request.Request(
        BASE + path, data=body, method="POST",
        headers={"Content-Type": "multipart/form-data; boundary=%s" % bound,
                 "Authorization": "Bearer %s" % TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
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

    try:
        med = sql("SELECT TOP 1 CAST(Id AS varchar(50)) + '|' + MedicineCode FROM Medicines "
                  "WHERE IsDeleted=0")
        svc = sql("SELECT TOP 1 CAST(Id AS varchar(50)) + '|' + ServiceCode FROM Services "
                  "WHERE IsDeleted=0")
        if med.count("|") != 1 or svc.count("|") != 1:
            raise SystemExit("thiếu dữ liệu nền: med=%r svc=%r" % (med, svc))
        med_code = med.split("|")[1].strip()
        svc_code = svc.split("|")[1].strip()

        HEADER = "ItemCode,ItemName,Unit,InsurancePrice,PaymentRate,EffectiveFrom,DecisionNumber\n"

        print("── Nhập danh mục thuốc ──")
        csv1 = (HEADER
                + "%s,%s Thuoc mot,Vien,12000,80,2026-01-01,%s-QD-01\n" % (med_code, TAG, TAG)
                + "%s-X2,%s Thuoc hai,Ong,8000,100,2026-01-01,%s-QD-01\n" % (TAG, TAG, TAG))
        st, b = upload("/api/insurance/catalog/import-medicines", "dm.csv", csv1.encode("utf-8"))
        kq = data_of(b)
        try:
            n = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM InsurancePriceConfigs "
                        "WHERE DecisionNumber = N'%s-QD-01' AND IsDeleted=0" % TAG) or 0)
        except SystemExit:
            n = 0
        case("dòng danh mục ĐƯỢC ghi xuống InsurancePriceConfigs", n == 2,
             "HTTP %s · SuccessRows=%r · số dòng ghi được=%d" % (st, kq.get("successRows"), n))

        # ĐỐI CHỨNG NGƯỢC — không có ca này thì bản vá "từ chối sạch mọi file" cũng ăn điểm.
        case("ĐỐI CHỨNG: file hợp lệ nhập đủ số dòng, không báo lỗi",
             kq.get("totalRows") == 2 and kq.get("successRows") == 2 and kq.get("failedRows") == 0,
             "tổng=%r · thành công=%r · hỏng=%r" % (kq.get("totalRows"), kq.get("successRows"),
                                                    kq.get("failedRows")))

        print("\n── Nhập lại cùng mã với giá MỚI ──")
        csv2 = (HEADER
                + "%s,%s Thuoc mot,Vien,15000,80,2026-07-01,%s-QD-02\n" % (med_code, TAG, TAG))
        st2, b2 = upload("/api/insurance/catalog/import-medicines", "dm2.csv", csv2.encode("utf-8"))
        try:
            cu = sql("SELECT ISNULL(CONVERT(varchar(10), EffectiveTo, 120), '<null>') "
                     "FROM InsurancePriceConfigs WHERE ItemCode=N'%s' "
                     " AND DecisionNumber=N'%s-QD-01' AND IsDeleted=0" % (med_code, TAG))
            gia_moi = sql("SELECT CAST(CAST(InsurancePrice AS decimal(18,0)) AS varchar(20)) "
                          "FROM InsurancePriceConfigs WHERE ItemCode=N'%s' "
                          " AND DecisionNumber=N'%s-QD-02' AND IsDeleted=0" % (med_code, TAG))
            gia_cu = sql("SELECT CAST(CAST(InsurancePrice AS decimal(18,0)) AS varchar(20)) "
                         "FROM InsurancePriceConfigs WHERE ItemCode=N'%s' "
                         " AND DecisionNumber=N'%s-QD-01' AND IsDeleted=0" % (med_code, TAG))
        except SystemExit:
            cu = gia_moi = gia_cu = ""
        case("giá mới mở bản GHI ĐÈ bản cũ", gia_moi == "15000",
             "HTTP %s · giá bản mới=%r" % (st2, gia_moi))
        case("bản giá CŨ được đóng lại chứ không bị xoá", cu != "<null>" and cu != "" and gia_cu == "12000",
             "hết hiệu lực từ=%r · giá cũ còn nguyên=%r" % (cu, gia_cu))

        print("\n── File hỏng và dòng hỏng ──")
        st3, b3 = upload("/api/insurance/catalog/import-medicines", "hong.csv",
                         b"\x00\x01\x02 khong phai csv")
        kq3 = data_of(b3)
        # KHÔNG chấp nhận 404 trơn: 404 ở đây là route sai, không phải sản phẩm từ chối file hỏng.
        # Lần chạy đầu ca này PASS đúng vì lý do đó — tôi đoán nhầm tiền tố route.
        if st3 == 404 and "message" not in b3:
            raise SystemExit("route sai (404 định tuyến), dừng để không đo mù: %s" % b3[:120])
        case("file KHÔNG đọc được thì BÁO LỖI, không im lặng trả 0 dòng",
             (st3 >= 400 and bool(b3.strip())) or (kq3.get("failedRows") or 0) > 0
             or len(kq3.get("errors") or []) > 0,
             "HTTP %s · tổng=%r · hỏng=%r · số lỗi=%d"
             % (st3, kq3.get("totalRows"), kq3.get("failedRows"), len(kq3.get("errors") or [])))

        csv4 = (HEADER
                + "%s-X3,%s Thieu gia,Vien,,80,2026-01-01,%s-QD-03\n" % (TAG, TAG, TAG)
                + "%s-X4,%s Du gia,Vien,5000,80,2026-01-01,%s-QD-03\n" % (TAG, TAG, TAG))
        st4, b4 = upload("/api/insurance/catalog/import-medicines", "thieu.csv", csv4.encode("utf-8"))
        kq4 = data_of(b4)
        errs = kq4.get("errors") or []
        case("dòng thiếu giá bị đếm HỎNG kèm số dòng + lý do",
             kq4.get("failedRows") == 1 and kq4.get("successRows") == 1
             and len(errs) == 1 and (errs[0].get("rowNumber") or 0) > 0
             and bool(errs[0].get("errorMessage")),
             "thành công=%r · hỏng=%r · lỗi=%s"
             % (kq4.get("successRows"), kq4.get("failedRows"), json.dumps(errs[:1], ensure_ascii=False)[:80]))

        print("\n── Nhập danh mục dịch vụ ──")
        csv5 = (HEADER
                + "%s,%s Dich vu mot,Lan,55000,80,2026-01-01,%s-QD-04\n" % (svc_code, TAG, TAG))
        st5, b5 = upload("/api/insurance/catalog/import-services", "dv.csv", csv5.encode("utf-8"))
        try:
            n5 = int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM InsurancePriceConfigs "
                         "WHERE DecisionNumber=N'%s-QD-04' AND ServiceId IS NOT NULL "
                         " AND IsDeleted=0" % TAG) or 0)
        except SystemExit:
            n5 = 0
        case("danh mục DỊCH VỤ cũng nhập được, gắn đúng ServiceId", n5 == 1,
             "HTTP %s · số dòng dịch vụ ghi được=%d" % (st5, n5))

    finally:
        try:
            sql("IF OBJECT_ID('InsurancePriceConfigs') IS NOT NULL "
                " DELETE FROM InsurancePriceConfigs WHERE DecisionNumber LIKE N'%s-QD-%%';" % TAG)
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:90])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_insurance_catalog_import.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_insurance_catalog_import.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
