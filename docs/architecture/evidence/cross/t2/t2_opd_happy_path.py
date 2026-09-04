"""T2 (#217) — luồng khám ngoại trú từ đầu đến cuối, có khẳng định KẾT QUẢ.

#217 nói rõ điều nó muốn: không phải "trang có load được không" mà là "mỗi bước tạo ra đúng dữ liệu,
chuyển đúng bước, và số liệu cuối (tiền/đơn/kết quả) ĐÚNG". Vì vậy bài này đi bằng API và đọc lại
DB sau từng bước, thay vì bấm qua tám màn hình rồi chỉ kiểm không có lỗi console.

Luồng: tạo bệnh nhân → tiếp đón (đăng ký khám viện phí) → bắt đầu khám → chỉ định cận lâm sàng →
kết luận → kê đơn → dược duyệt + cấp phát → thu tiền → hoàn thành lượt khám.

Sau mỗi bước script khẳng định thứ ĐÁNG khẳng định: có bản ghi mới đúng bảng nào, trạng thái nhảy
sang đúng giá trị nào, tiền cộng ra đúng bao nhiêu. Bước nào hỏng thì in rõ đã đi tới đâu và dừng —
biết được luồng đứt ở đâu quan trọng hơn là một dòng PASS/FAIL cuối.

Dữ liệu tạo ra mang tiền tố T2E2E và được xoá ở cuối (dọn theo thứ tự khoá ngoại).

Cần: API :5106, DB his-sqlserver, tài khoản admin.
Kết quả: t2_opd_happy_path.json
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T2E2E"
STEPS = []


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
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q", "SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    return (out.stdout or "").strip()


def step(name, ok, detail):
    STEPS.append({"step": name, "pass": bool(ok), "detail": detail})
    print("  %-34s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def login():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    return payload(b)["token"]


def cleanup(patient_id):
    if not patient_id:
        return
    # Xoá theo chiều ngược của khoá ngoại.
    sql("""
DECLARE @p uniqueidentifier = '%s';
DELETE pd FROM PrescriptionDetails pd JOIN Prescriptions pr ON pr.Id = pd.PrescriptionId
  JOIN MedicalRecords mr ON mr.Id = pr.MedicalRecordId WHERE mr.PatientId = @p;
DELETE pr FROM Prescriptions pr JOIN MedicalRecords mr ON mr.Id = pr.MedicalRecordId WHERE mr.PatientId = @p;
DELETE sr FROM ServiceRequests sr JOIN MedicalRecords mr ON mr.Id = sr.MedicalRecordId WHERE mr.PatientId = @p;
DELETE p FROM Payments p WHERE p.PatientId = @p;
DELETE r FROM Receipts r WHERE r.PatientId = @p;
DELETE e FROM Examinations e JOIN MedicalRecords mr ON mr.Id = e.MedicalRecordId WHERE mr.PatientId = @p;
DELETE FROM MedicalRecords WHERE PatientId = @p;
DELETE FROM Patients WHERE Id = @p;
DELETE FROM InventoryItems WHERE BatchNumber = 'T2E2E';
""" % patient_id)


def main():
    tok = login()
    patient_id = None
    try:
        # ── 1. Bệnh nhân mới ────────────────────────────────────────────────
        code_suffix = str(int(time.time()))[-6:]
        st, b = http("POST", "/api/Patients", tok, {
            "fullName": "%s Nguyen Van Test" % TAG,
            "dateOfBirth": "1985-05-05T00:00:00", "gender": 1,
            "phoneNumber": "09%s" % code_suffix.rjust(8, "0")[:8],
            "address": "Số 1 phố Thử Nghiệm",
        })
        pat = payload(b)
        patient_id = pat.get("id") or pat.get("Id")
        if not step("1. Tạo bệnh nhân", st in (200, 201) and bool(patient_id),
                    "HTTP %s · patientId=%s · mã=%s" % (st, patient_id, pat.get("patientCode"))):
            return

        # ── 2. Tiếp đón: đăng ký khám viện phí ───────────────────────────────
        room = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Rooms WHERE IsDeleted=0 AND IsActive=1 ORDER BY RoomCode")
        st, b = http("POST", "/api/reception/register/fee", tok, {
            "patientId": patient_id, "serviceType": 2, "roomId": room, "isPriority": False,
        })
        adm = payload(b)
        mr_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM MedicalRecords WHERE PatientId='%s' ORDER BY CreatedAt DESC" % patient_id)
        if not step("2. Tiếp đón đăng ký khám", st in (200, 201) and bool(mr_id),
                    "HTTP %s · tạo hồ sơ bệnh án %s" % (st, mr_id or "KHÔNG CÓ")):
            return

        exam_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Examinations WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr_id)
        if not step("3. Tiếp đón sinh lượt khám", bool(exam_id),
                    "examinationId=%s" % (exam_id or "KHÔNG CÓ — tiếp đón không sinh lượt khám")):
            return

        # ── 4. Bác sĩ bắt đầu khám ──────────────────────────────────────────
        st, b = http("POST", "/api/examination/%s/start" % exam_id, tok, {})
        s_after = sql("SELECT CAST(Status AS varchar(5)) FROM Examinations WHERE Id='%s'" % exam_id)
        step("4. Bắt đầu khám", st in (200, 204) and s_after == "1",
             "HTTP %s · Examinations.Status=%s (kỳ vọng 1 Đang khám)" % (st, s_after))

        # ── 5. Chỉ định cận lâm sàng ────────────────────────────────────────
        svc = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Services WHERE IsDeleted=0 AND IsActive=1 AND ServicePrice > 0 ORDER BY ServiceCode")
        svc_price = sql("SELECT TOP 1 CAST(ServicePrice AS varchar(30)) FROM Services WHERE Id='%s'" % svc)
        st, b = http("POST", "/api/examination/service-orders", tok, {
            "examinationId": exam_id, "diagnosisCode": "J06",
            "diagnosisName": "Nhiễm khuẩn đường hô hấp trên",
            "services": [{"serviceId": svc, "quantity": 1, "paymentType": 2}],
            "autoSelectRoom": True,
        })
        n_req = sql("SELECT COUNT(*) FROM ServiceRequests WHERE MedicalRecordId='%s'" % mr_id)
        step("5. Chỉ định cận lâm sàng", st in (200, 201) and n_req.isdigit() and int(n_req) >= 1,
             "HTTP %s · ServiceRequests=%s · đơn giá dịch vụ=%s" % (st, n_req, svc_price))

        # ── 6. Kết luận ─────────────────────────────────────────────────────
        # Ghi kết luận đi bằng CompleteExamination; PUT .../conclusion là SỬA kết luận của một
        # phiếu ĐÃ hoàn thành (service chặn khi Status < 4). Lượt chạy đầu gọi sai thứ tự nên
        # nhận 500 — chính chỗ đó lộ ra rằng guard nghiệp vụ đang ném Exception trần.
        st, b = http("POST", "/api/examination/%s/complete" % exam_id, tok, {
            "examinationId": exam_id, "finalDiagnosisCode": "J06",
            "finalDiagnosisName": "Nhiễm khuẩn đường hô hấp trên",
            "conclusionType": 1, "conclusionNotes": "Theo dõi ngoại trú",
        })
        s_after = sql("SELECT CAST(Status AS varchar(5)) FROM Examinations WHERE Id='%s'" % exam_id)
        step("6. Hoàn thành lượt khám", st in (200, 204) and s_after == "4",
             "HTTP %s · Examinations.Status=%s (kỳ vọng 4 Hoàn thành)" % (st, s_after))

        st, b = http("PUT", "/api/examination/%s/conclusion" % exam_id, tok, {
            "examinationId": exam_id, "conclusionType": 1,
            "conclusionNotes": "Theo dõi ngoại trú — đã sửa",
        })
        step("7. Sửa kết luận sau khi hoàn thành", st in (200, 204), "HTTP %s" % st)

        # ── 7. Kê đơn ───────────────────────────────────────────────────────
        med = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Medicines WHERE IsDeleted=0 AND IsActive=1 ORDER BY MedicineCode")
        st, b = http("POST", "/api/examination/prescriptions", tok, {
            "examinationId": exam_id, "prescriptionType": 1, "paymentCategory": 2,
            "diagnosisCode": "J06", "diagnosisName": "Nhiễm khuẩn đường hô hấp trên",
            "totalDays": 3,
            "items": [{"medicineId": med, "quantity": 6, "days": 3, "dosage": "1 viên",
                       "frequency": "2 lần/ngày", "paymentType": 2}],
            "instructions": "Uống sau ăn",
        })
        pres = payload(b)
        pres_id = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Prescriptions WHERE MedicalRecordId='%s' ORDER BY CreatedAt DESC" % mr_id)
        pres_status = sql("SELECT CAST(Status AS varchar(5)) FROM Prescriptions WHERE Id='%s'" % pres_id) if pres_id else ""
        if not step("8. Kê đơn thuốc", st in (200, 201) and bool(pres_id),
                    "HTTP %s · prescriptionId=%s · Status=%s" % (st, pres_id or "KHÔNG CÓ", pres_status)):
            return

        n_items = sql("SELECT COUNT(*) FROM PrescriptionDetails WHERE PrescriptionId='%s'" % pres_id)
        step("9. Đơn có dòng thuốc", n_items.isdigit() and int(n_items) >= 1,
             "PrescriptionDetails=%s" % n_items)

        # ── 9. Dược duyệt ───────────────────────────────────────────────────
        st, b = http("POST", "/api/pharmacy/prescriptions/%s/accept" % pres_id, tok, {})
        s_after = sql("SELECT CAST(Status AS varchar(5)) FROM Prescriptions WHERE Id='%s'" % pres_id)
        step("9b. Dược duyệt đơn", st == 200 and s_after == "1",
             "HTTP %s · Prescriptions.Status=%s (kỳ vọng 1 Đã duyệt)" % (st, s_after))

        # ── 10. Cấp phát (trừ kho) ──────────────────────────────────────────
        # Nạp sẵn tồn cho đúng viên thuốc vừa kê vào kho lẻ ngoại trú, nếu không bước phát dừng
        # ở "không đủ tồn kho" và cả đoạn sau (thu tiền, chặn hủy đơn đã phát) không đo được.
        wh = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Warehouses WHERE IsActive=1 AND IsDeleted=0 AND WarehouseType=2 ORDER BY WarehouseName")
        sql("""
DELETE FROM InventoryItems WHERE BatchNumber='%s';
INSERT INTO InventoryItems (Id, WarehouseId, ItemType, MedicineId, BatchNumber, ExpiryDate, Quantity,
  ReservedQuantity, ImportPrice, UnitPrice, IsLocked, CreatedAt, IsDeleted)
VALUES (NEWID(), '%s', N'Medicine', '%s', '%s', DATEADD(year, 2, SYSUTCDATETIME()), 100, 0, 1000, 1500, 0, SYSUTCDATETIME(), 0);
""" % (TAG, wh, med, TAG))
        st, b = http("POST", "/api/pharmacy/prescriptions/%s/dispense" % pres_id, tok, {})
        s_after = sql("SELECT CAST(Status AS varchar(5)) + '|' + CAST(IsDispensed AS varchar(5)) FROM Prescriptions WHERE Id='%s'" % pres_id)
        step("10. Cấp phát thuốc", st == 200 and s_after.startswith(("2|", "6|")),
             "HTTP %s · Status|IsDispensed=%s · %s" % (st, s_after, b[:100].replace(chr(10), " ")))

        left = sql("SELECT ISNULL(CAST(SUM(Quantity) AS varchar(30)),'?') FROM InventoryItems WHERE MedicineId='%s' AND BatchNumber='%s'" % (med, TAG))
        # So bằng SỐ: sqlcmd in decimal ra '94.0000', so chuỗi với '94.000' sẽ trượt oan.
        try:
            left_n = float(left)
        except ValueError:
            left_n = None
        step("11. Kho bị trừ đúng số đã phát", left_n == 94.0,
             "tồn lô %s còn %s (nạp 100, kê 6 → kỳ vọng 94)" % (TAG, left))

        # ── 12. Thu tiền ────────────────────────────────────────────────────
        # ReceptionPaymentDto lấy MedicalRecordId + các khoản tiền; lượt đầu gửi
        # {patientId, amount} nên 404, và Payments không có cột "Amount" mà là PaidAmount.
        amount = 50000
        st, b = http("POST", "/api/reception/billing/payment", tok, {
            "medicalRecordId": mr_id, "serviceIds": [],
            "totalAmount": amount, "insuranceAmount": 0, "patientAmount": amount,
            "discountAmount": 0, "paidAmount": amount, "paymentMethod": 1,
        })
        # Tiền thu ở tiếp đón đi vào Receipts — SỔ PHIẾU THU DUY NHẤT — chứ KHÔNG vào bảng Payments.
        # (Ghi vào Payments là cách làm cũ đã bỏ vì không màn hình nào đọc, tiền biến mất khỏi sổ quỹ.)
        # Lượt chạy đầu kiểm nhầm bảng nên thấy 0 đồng và tưởng là lỗi sản phẩm.
        receipt = sql("SELECT ISNULL(CAST(SUM(FinalAmount) AS varchar(30)),'0') FROM Receipts "
                      "WHERE MedicalRecordId='%s' AND ReceiptType=2 AND Status=1" % mr_id)
        try:
            receipt_n = float(receipt)
        except ValueError:
            receipt_n = None
        step("12. Thu tiền vào sổ phiếu thu", st in (200, 201) and receipt_n == float(amount),
             "HTTP %s · tổng Receipts.FinalAmount=%s (kỳ vọng %s)" % (st, receipt, amount))

        # ── 13. Luồng ngược: đơn đã phát KHÔNG được hủy suông (gắn #218) ────
        st, b = http("POST", "/api/pharmacy/prescriptions/%s/reject" % pres_id, tok, {"reason": "thử hủy sau khi phát"})
        s_after = sql("SELECT CAST(Status AS varchar(5)) FROM Prescriptions WHERE Id='%s'" % pres_id)
        step("13. Chặn hủy đơn ĐÃ PHÁT", st == 400,
             "HTTP %s (kỳ vọng 400) · Status giữ nguyên %s" % (st, s_after))

    finally:
        cleanup(patient_id)
        ok = sum(1 for s in STEPS if s["pass"])
        print("\n%d/%d bước đạt" % (ok, len(STEPS)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "steps": STEPS},
                  open(os.path.join(HERE, "t2_opd_happy_path.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t2_opd_happy_path.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
