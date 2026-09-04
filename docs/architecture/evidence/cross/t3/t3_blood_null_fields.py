"""T3 (#218) — mỗi đường GHI của module máu có thực sự chạy được không.

Xuất phát từ một nghi ngờ rộng: toàn bộ `BloodBankCompleteService` viết bằng SQL trần và truyền
`DBNull.Value` làm ĐỐI SỐ cho `ExecuteSqlRawAsync`, mà EF Core không ánh xạ được kiểu đó. Ban đầu
tưởng có ~48 quả mìn nằm chờ.

Đo xong thì bức tranh khác hẳn, và đây mới là điều đáng ghi lại:

* **43 chỗ dạng `x ?? DBNull.Value`** chỉ nổ khi `x` thật sự null. Nhưng DTO của module này khai
  chuỗi là **không-nullable**, mà `[ApiController]` bắt buộc trường không-nullable phải có giá trị,
  nên qua API chúng gần như không tới được — gửi thiếu là bị chặn ở tầng kiểm tra dữ liệu với 400
  trước khi chạm tới câu SQL.
* **4 chỗ bắn `DBNull` VÔ ĐIỀU KIỆN** thì nổ 100%, không phụ thuộc người dùng nhập gì:
  `CreateIssueRequestAsync` (PatientCode/PatientName) và `CreateImportReceiptAsync` (DonorName,
  Temperature, Note). Hai chức năng đó **chưa bao giờ chạy được**.

Nên bài đo này không đi tìm "trường bỏ trống" nữa (hướng đó bị tầng kiểm tra dữ liệu chặn, đo ra
toàn 400 và **không chứng minh được gì** — lượt chạy đầu của chính bài này đã sai đúng như vậy).
Nó gọi **từng đường ghi của module máu bằng payload ĐẦY ĐỦ và hợp lệ**, rồi hỏi một câu duy nhất:
đường này có chạy không. Chính câu hỏi đó mới lộ ra hai chức năng chết.

Điều kiểm: phản hồi KHÔNG được là lỗi hạ tầng `DBNull`. Mã 400 vì luật nghiệp vụ vẫn tính là ĐẠT.

Tiền tố dữ liệu T3NUL, dọn ở cuối.
Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request, uuid
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3NUL"
CASES = []


def http(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def payload(body):
    try:
        d = json.loads(body)
    except Exception:
        return {}
    return d.get("data", d) if isinstance(d, dict) else d


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    text = (out.stdout or "").strip()
    # sqlcmd in LỖI ra stdout rồi trả mã 0, nên chuỗi lỗi trông y như dữ liệu. Đã dính hai lần:
    # một câu `ORDER BY CreatedAt` trên bảng không có cột đó trả về "Invalid column name" và chuỗi
    # ấy được dùng làm `supplierId`, làm cả bài đo lệch; lần trước là "Invalid column name 'Notes'"
    # bị đọc thành "có dữ liệu" và báo ĐẠT GIẢ. Dừng ngay còn hơn đo mù.
    if text.startswith("Msg ") or "Invalid column name" in text or "Invalid object name" in text:
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:120], text[:200]))
    return text


def is_dbnull_failure(body):
    return "type 'DBNull'" in body or "store type mapping" in body


def case(name, service_method, st, body, extra="", must_succeed=True):
    """Mặc định đòi đường ghi THÀNH CÔNG thật.

    Lượt chạy đầu chỉ hỏi "có phải lỗi DBNull không", nên một ca trả 400 vì mã túi trùng vẫn được
    báo ĐẠT trong khi chức năng đang hỏng. Khẳng định yếu như vậy chính là thứ bài đo phải tránh.
    """
    ok = not is_dbnull_failure(body) and (not must_succeed or st in (200, 201))
    CASES.append({"case": name, "serviceMethod": service_method, "status": st,
                  "pass": ok, "body": body[:90].replace("\n", " ")})
    print("  %-42s %-4s HTTP %-4s %s"
          % (name, "PASS" if ok else "FAIL", st, extra or ("" if ok else body[:60])))
    return ok


def cleanup():
    sql("DELETE FROM BloodImportItems WHERE BagCode LIKE '%s%%';" % TAG)
    sql("DELETE FROM BloodBags WHERE BagCode LIKE '%s%%';" % TAG)
    sql("DELETE FROM BloodImportReceipts WHERE Note = N'%s';" % TAG)
    sql("DELETE FROM BloodProductTypes WHERE Code LIKE '%s%%';" % TAG)
    sql("DELETE FROM BloodSuppliers WHERE Code LIKE '%s%%';" % TAG)
    sql("DELETE FROM BloodIssueRequests WHERE ClinicalIndication = N'%s';" % TAG)


def main():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    tok = payload(b)["token"]

    try:
        rbc = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM BloodProductTypes WHERE Code='RBC'")
        supplier = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM BloodSuppliers ORDER BY Code")
        dept = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Departments WHERE IsDeleted=0 ORDER BY DepartmentCode")
        suffix = str(int(time.time()))[-6:]
        U = "%s-%s" % (TAG, suffix)   # tiền tố DUY NHẤT cho lượt chạy này
        now = datetime.now()

        print("── danh mục ──")
        st, b = http("POST", "/api/BloodBankComplete/product-types", tok, {
            "id": "00000000-0000-0000-0000-000000000000",
            "code": "%s%s" % (TAG, suffix), "name": "%s che pham" % TAG,
            "description": "mo ta", "shelfLifeDays": 35, "minTemperature": 2, "maxTemperature": 6,
            "standardVolume": 250, "unit": "mL", "price": 100, "insurancePrice": 90, "isActive": True})
        case("thêm loại chế phẩm", "SaveProductTypeAsync", st, b)

        st, b = http("POST", "/api/BloodBankComplete/suppliers", tok, {
            "id": "00000000-0000-0000-0000-000000000000",
            "code": "%sS%s" % (TAG, suffix), "name": "%s ncc" % TAG, "address": "so 1",
            "phone": "0900000000", "email": "a@b.c", "contactPerson": "A", "license": "GP1",
            "isActive": True})
        case("thêm nhà cung cấp", "SaveSupplierAsync", st, b)

        print("\n── phiếu nhập máu ──")
        # Đường này từng hỏng 100%: ba chỗ bắn DBNull vô điều kiện trong vòng lặp tạo túi máu.
        st, b = http("POST", "/api/BloodBankComplete/import-receipts", tok, {
            "receiptDate": now.isoformat(timespec="seconds"), "supplierId": supplier,
            "deliveryPerson": "%s giao" % TAG, "note": TAG,
            "items": [{"bagCode": "%s-NK1" % U, "barcode": "%sBC1" % U,
                       "bloodType": "O", "rhFactor": "+", "productTypeId": rbc, "volume": 250,
                       "collectionDate": (now - timedelta(days=3)).isoformat(timespec="seconds"),
                       "expiryDate": (now + timedelta(days=30)).isoformat(timespec="seconds"),
                       "donorCode": "D1", "donorName": "Nguoi hien", "testResults": "OK",
                       "price": 100}]})
        bags = sql("SELECT COUNT(*) FROM BloodBags WHERE BagCode='%s-NK1'" % U)
        case("tạo phiếu nhập máu", "CreateImportReceiptAsync", st, b,
             "túi máu vào kho=%s" % bags)
        receipt_id = (payload(b) or {}).get("id") if not is_dbnull_failure(b) else None

        if receipt_id:
            st, b = http("PUT", "/api/BloodBankComplete/import-receipts/%s" % receipt_id, tok, {
                "receiptDate": now.isoformat(timespec="seconds"), "supplierId": supplier,
                "deliveryPerson": "%s giao 2" % TAG, "note": TAG, "items": []})
            case("sửa phiếu nhập máu", "UpdateImportReceiptAsync", st, b)

            st, b = http("POST", "/api/BloodBankComplete/import-receipts/%s/confirm" % receipt_id, tok, {})
            case("xác nhận phiếu nhập", "ConfirmImportReceiptAsync", st, b)

        print("\n── phiếu lĩnh máu ──")
        # Đường này cũng từng hỏng 100% (PatientCode/PatientName bắn DBNull vô điều kiện).
        st, b = http("POST", "/api/BloodBankComplete/issue-requests", tok, {
            "departmentId": dept, "bloodType": "O", "rhFactor": "+", "productTypeId": rbc,
            "requestedQuantity": 1, "urgency": "Thuong", "clinicalIndication": TAG, "note": TAG})
        case("tạo phiếu lĩnh máu", "CreateIssueRequestAsync", st, b)
        req_id = (payload(b) or {}).get("id") if not is_dbnull_failure(b) else None

        if req_id:
            st, b = http("POST", "/api/BloodBankComplete/issue-requests/%s/approve" % req_id, tok, {})
            case("duyệt phiếu lĩnh", "ApproveIssueRequestAsync", st, b)

            bag = str(uuid.uuid4())
            sql("INSERT INTO BloodBags (Id, BagCode, BloodType, RhFactor, ProductTypeId, Volume, "
                " CollectionDate, ExpiryDate, Status, IsTestPassed, CreatedAt) VALUES "
                "('%s', N'%s-XUAT', N'O', N'+', '%s', 250, DATEADD(day,-5,GETDATE()), "
                " DATEADD(day,20,GETDATE()), N'Available', 1, GETDATE());" % (bag, U, rbc))
            st, b = http("POST", "/api/BloodBankComplete/issue", tok,
                         {"requestId": req_id, "bloodBagIds": [bag], "note": TAG})
            case("xuất máu theo phiếu lĩnh", "IssueBloodAsync", st, b)

        print("\n── phiếu chỉ định + truyền máu ──")
        pat = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Patients WHERE IsDeleted=0 ORDER BY CreatedAt DESC")
        st, b = http("POST", "/api/BloodBankComplete/orders", tok, {
            "patientId": pat, "visitId": pat, "diagnosis": TAG, "clinicalIndication": TAG,
            "items": [{"productTypeId": rbc, "bloodType": "O", "rhFactor": "+",
                       "orderedQuantity": 1, "note": TAG}]})
        case("tạo phiếu chỉ định máu", "CreateBloodOrderAsync", st, b)
        order_id = (payload(b) or {}).get("id") if not is_dbnull_failure(b) else None
        item_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM BloodOrderItems WHERE OrderId='%s'" % order_id) if order_id else ""

        if len(item_id) == 36:
            bag2 = str(uuid.uuid4())
            sql("INSERT INTO BloodBags (Id, BagCode, BloodType, RhFactor, ProductTypeId, Volume, "
                " CollectionDate, ExpiryDate, Status, IsTestPassed, CreatedAt) VALUES "
                "('%s', N'%s-TRUYEN', N'O', N'+', '%s', 250, DATEADD(day,-5,GETDATE()), "
                " DATEADD(day,20,GETDATE()), N'Available', 1, GETDATE());" % (bag2, U, rbc))
            st, b = http("POST", "/api/BloodBankComplete/orders/items/%s/assign" % item_id, tok,
                         {"bloodBagId": bag2})
            case("gán túi máu cho chỉ định", "AssignBloodBagToPatientAsync", st, b)

            st, b = http("POST", "/api/BloodBankComplete/orders/items/%s/cross-match" % item_id, tok,
                         {"bloodBagId": bag2, "result": "Phù hợp", "note": TAG})
            case("ghi phản ứng chéo", "RecordCrossMatchResultAsync", st, b)

            st, b = http("POST", "/api/BloodBankComplete/orders/items/%s/start-transfusion" % item_id, tok,
                         {"bloodBagId": bag2})
            case("bắt đầu truyền", "StartTransfusionAsync", st, b)

            st, b = http("POST", "/api/BloodBankComplete/orders/items/%s/complete-transfusion" % item_id, tok,
                         {"bloodBagId": bag2, "note": TAG})
            case("kết thúc truyền", "CompleteTransfusionAsync", st, b)

            bag3 = str(uuid.uuid4())
            sql("INSERT INTO BloodBags (Id, BagCode, BloodType, RhFactor, ProductTypeId, Volume, "
                " CollectionDate, ExpiryDate, Status, IsTestPassed, CreatedAt) VALUES "
                "('%s', N'%s-GOBO', N'O', N'+', '%s', 250, DATEADD(day,-5,GETDATE()), "
                " DATEADD(day,20,GETDATE()), N'Available', 1, GETDATE());" % (bag3, U, rbc))
            http("POST", "/api/BloodBankComplete/orders/items/%s/assign" % item_id, tok, {"bloodBagId": bag3})
            st, b = http("POST", "/api/BloodBankComplete/orders/items/%s/unassign" % item_id, tok,
                         {"bloodBagId": bag3, "reason": TAG})
            case("gỡ túi khỏi chỉ định", "UnassignBloodBagAsync", st, b)

        # ── Lượt hai: BỎ TRỐNG các trường KIỂU GIÁ TRỊ NULLABLE ─────────────
        # Đây là phần rủi ro còn lại thật sự. `[ApiController]` bắt buộc chuỗi không-nullable phải
        # có giá trị, nên nhánh null của chúng không tới được qua API. Nhưng `DateTime?`, `decimal?`
        # thì KHÔNG bị bắt buộc — bỏ trống `LicenseExpiryDate` từng làm thêm nhà cung cấp hỏng ngay.
        print("\n── bỏ trống trường kiểu giá trị nullable ──")
        st, b = http("POST", "/api/BloodBankComplete/product-types", tok, {
            "id": "00000000-0000-0000-0000-000000000000",
            "code": "%sN%s" % (TAG, suffix), "name": "%s che pham 2" % TAG,
            "description": "mo ta", "shelfLifeDays": 35, "unit": "mL",
            "price": 100, "insurancePrice": 90, "isActive": True})
        case("chế phẩm, bỏ trống nhiệt độ + thể tích", "SaveProductTypeAsync", st, b)

        st, b = http("POST", "/api/BloodBankComplete/suppliers", tok, {
            "id": "00000000-0000-0000-0000-000000000000",
            "code": "%sN%s" % (TAG, suffix), "name": "%s ncc 2" % TAG, "address": "so 2",
            "phone": "0900000001", "email": "c@d.e", "contactPerson": "B", "license": "GP2",
            "isActive": True})
        case("nhà cung cấp, bỏ trống hạn giấy phép", "SaveSupplierAsync", st, b)

        print("\n── trạng thái túi máu ──")
        bag4 = str(uuid.uuid4())
        sql("INSERT INTO BloodBags (Id, BagCode, BloodType, RhFactor, ProductTypeId, Volume, "
            " CollectionDate, ExpiryDate, Status, IsTestPassed, CreatedAt) VALUES "
            "('%s', N'%s-TRANGTHAI', N'O', N'+', '%s', 250, DATEADD(day,-5,GETDATE()), "
            " DATEADD(day,20,GETDATE()), N'Available', 1, GETDATE());" % (bag4, U, rbc))
        st, b = http("PUT", "/api/BloodBankComplete/blood-bags/%s/status" % bag4, tok,
                     {"status": "Quarantined", "reason": TAG})
        case("đổi trạng thái túi máu", "UpdateBloodBagStatusAsync", st, b)

    finally:
        cleanup()
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d đường ghi của module máu chạy được" % (ok, len(CASES)))
        if bad:
            print("Hỏng vì lỗi hạ tầng DBNull:")
            for c in bad:
                print("  - %-40s (%s)" % (c["case"], c["serviceMethod"]))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_blood_null_fields.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_blood_null_fields.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
