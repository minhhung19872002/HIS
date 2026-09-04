"""T3 (#218) — BÁN THUỐC THEO ĐƠN: giao diện gọi cửa GIẢ, trong khi cửa thật nằm ở service bên cạnh.

Thuộc **nhóm B** của khảo sát §38. Nhưng khi mở ra đọc thì tình huống khác hẳn những cái khác trong
nhóm — và khác theo hướng đáng lo hơn:

* `WarehouseCompleteService.CreatePharmacySaleByPrescriptionAsync`
  (`POST /api/warehouse/pharmacy-sales/by-prescription/{id}`) là **vỏ rỗng**: sinh `SaleCode` từ
  `DateTime.Now`, `Items = []`, `TotalAmount = 0`, không ghi gì;
* `CreateRetailSaleAsync` (`POST /api/warehouse/pharmacy-sales/retail`) cũng vỏ rỗng: gán vài trường
  lên chính DTO người dùng gửi lên rồi **trả lại nguyên si**;
* nhưng `HospitalPharmacyService.CreateSaleAsync` **đã làm đúng và đầy đủ**: ghi `RetailSales` +
  `RetailSaleItems`, trừ tồn kho theo **FEFO**, chạy trong **transaction**, và từ chối khi không đủ
  tồn (`Không đủ tồn kho cho thuốc ...`).

Tức bản đúng đã tồn tại. Cái đáng lo là **giao diện đang gọi bản giả**: `frontend/src/modules/pharmacy/
api/warehouse.ts` trỏ vào `/warehouse/pharmacy-sales/*`. Dược sĩ bán thuốc, phần mềm báo thành công,
**tiền không vào sổ và tồn kho không trừ**.

Nên bản vá KHÔNG viết bản thứ ba. Hai cửa kho trở thành lớp mỏng **ủy thác** cho bản đúng — đúng cái
kỷ luật cả đợt này rút ra sau mười sáu lần gặp *một luật thi hành ở một cửa, bỏ trống ở cửa bên cạnh*:
gặp hai cửa cùng làm một việc thì hợp nhất, đừng nhân bản.

Bài đo kiểm ba chuyện: bán theo đơn có **ghi phiếu bán** không · có **trừ tồn kho** không · bán lại
đúng đơn ấy lần hai có bị chặn không (bài học §15 — phát một đơn hai lần).

Tiền tố dữ liệu T3BAN, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3BAN"
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

    rx = stock_id = None
    try:
        # Dựng một lô tồn kho riêng + một đơn thuốc trỏ đúng vào thuốc/kho đó, để số liệu đo được
        # sạch, không lẫn với dữ liệu sẵn có.
        row = sql("SELECT TOP 1 CAST(i.Id AS varchar(50)) + '|' + CAST(i.WarehouseId AS varchar(50)) "
                  " + '|' + CAST(i.MedicineId AS varchar(50)) + '|' "
                  " + CAST(CAST(i.Quantity AS decimal(18,0)) AS varchar(20)) "
                  "FROM InventoryItems i WHERE i.IsDeleted=0 AND i.MedicineId IS NOT NULL "
                  " AND i.Quantity >= 50 AND i.ExpiryDate > GETDATE()")
        if row.count("|") != 3:
            raise SystemExit("không tìm được lô tồn kho đủ dùng để đo: %r" % row)
        stock_id, wh, med, qty0 = row.split("|")

        rec = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE IsDeleted=0")
        doc = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")
        rx = str(uuid.uuid4())
        det = str(uuid.uuid4())
        dept = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Departments WHERE IsDeleted=0")
        sql("INSERT INTO Prescriptions (Id, PrescriptionCode, PrescriptionDate, MedicalRecordId, "
            " DoctorId, DepartmentId, PrescriptionType, TotalDays, TotalTangs, TotalAmount, "
            " InsuranceAmount, PatientAmount, Status, IsDispensed, PaymentCategory, DrugOrderType, "
            " Note, CreatedAt, IsDeleted) VALUES "
            "('%s', N'%s-RX', GETUTCDATE(), '%s', '%s', '%s', 1, 1, 0, 20000, 0, 20000, 1, 0, 1, 1, "
            " N'%s', GETUTCDATE(), 0); "
            "INSERT INTO PrescriptionDetails (Id, PrescriptionId, MedicineId, WarehouseId, Quantity, "
            " DispensedQuantity, Unit, UnitPrice, Amount, InsuranceAmount, PatientAmount, PatientType, "
            " InsurancePaymentRate, Days, TotalPrice, Status, CreatedAt, IsDeleted) VALUES "
            "('%s','%s','%s','%s', 10, 0, N'Vien', 2000, 20000, 0, 20000, 2, 0, 1, 20000, 0, "
            " GETUTCDATE(), 0);"
            % (rx, TAG, rec, doc, dept, TAG, det, rx, med, wh))

        def ton_kho():
            return float(sql("SELECT CAST(CAST(Quantity AS decimal(18,0)) AS varchar(20)) "
                             "FROM InventoryItems WHERE Id='%s'" % stock_id) or 0)

        def so_phieu_ban():
            return int(sql("SELECT CAST(COUNT(*) AS varchar(9)) FROM RetailSales "
                           "WHERE PrescriptionId='%s'" % rx) or 0)

        print("── Bán thuốc theo đơn ──")
        truoc = ton_kho()
        st, b = http("POST", "/api/warehouse/pharmacy-sales/by-prescription/%s" % rx)
        sau = ton_kho()
        n = so_phieu_ban()

        case("phiếu bán ĐƯỢC ghi xuống RetailSales", n == 1,
             "HTTP %s · số phiếu gắn đơn này=%d" % (st, n))
        case("tồn kho ĐƯỢC trừ đúng 10", abs((truoc - sau) - 10) < 0.001,
             "tồn kho %s → %s (giảm %s)" % (truoc, sau, truoc - sau))

        print("\n── Bán lại đúng đơn đó lần thứ hai ──")
        truoc2 = ton_kho()
        st, b = http("POST", "/api/warehouse/pharmacy-sales/by-prescription/%s" % rx)
        sau2 = ton_kho()
        case("bán trùng cùng một đơn bị chặn",
             st >= 400 and so_phieu_ban() == 1 and abs(truoc2 - sau2) < 0.001,
             "HTTP %s · số phiếu=%d · tồn kho trừ thêm %s · %s"
             % (st, so_phieu_ban(), truoc2 - sau2, b[:45]))

    finally:
        try:
            if rx:
                sql("DELETE FROM RetailSaleItems WHERE RetailSaleId IN "
                    " (SELECT Id FROM RetailSales WHERE PrescriptionId='%s'); "
                    "DELETE FROM RetailSales WHERE PrescriptionId='%s'; "
                    "DELETE FROM PrescriptionDetails WHERE PrescriptionId='%s'; "
                    "DELETE FROM Prescriptions WHERE Id='%s';" % (rx, rx, rx, rx))
            if stock_id:
                sql("UPDATE InventoryItems SET Quantity=%s WHERE Id='%s'" % (qty0, stock_id))
        except Exception as e:
            print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_pharmacy_sale.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_pharmacy_sale.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
