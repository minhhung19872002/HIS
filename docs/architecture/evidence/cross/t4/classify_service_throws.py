"""#219/T4 — đổi `throw new Exception(...)` trong tầng service sang kiểu có nghĩa.

Vì sao: DomainExceptionFilter (đã gắn ở 26 controller) map KeyNotFoundException → 404 và
InvalidOperationException → 400 kèm message; còn `Exception` trần rơi vào nhánh cuối → **500**.
Nên mọi quy tắc nghiệp vụ viết bằng `throw new Exception("...")` đang hiện ra với người dùng như
một sự cố máy chủ, và giao diện không thể phân biệt "anh nhập sai" với "máy hỏng".

Luật phân loại (máy móc, đúng thứ filter đã ghi):
  - message có "not found" / "không tồn tại" / "không tìm thấy"  → KeyNotFoundException  (404)
  - còn lại                                                      → InvalidOperationException (400)

KHÔNG đụng:
  - `throw new Exception(msg, ex)` — đó là bọc lỗi gốc, không phải guard nghiệp vụ;
  - `throw` trần trong catch;
  - file nào mà controller của nó KHÔNG gắn DomainExceptionFilter (đổi kiểu ở đó vô ích).

Dùng:
  python classify_service_throws.py --dry   # in ra kế hoạch để soi
  python classify_service_throws.py --apply
"""
import io, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = r"D:\Source\HIS\backend\src\HIS.Infrastructure\Services"

NOT_FOUND = ("not found", "không tồn tại", "khong ton tai", "không tìm thấy", "khong tim thay")

# throw new Exception( <một đối số chuỗi duy nhất> );
# Bắt cả chuỗi nội suy $"..." và chuỗi thường; dừng ở dấu " cuối trước )
THROW = re.compile(r'throw new Exception\((\$?"(?:[^"\\]|\\.)*")\s*\)')


def classify(msg: str) -> str:
    low = msg.lower()
    return "KeyNotFoundException" if any(k in low for k in NOT_FOUND) else "InvalidOperationException"


def process(rel_paths, apply: bool):
    total = {"KeyNotFoundException": 0, "InvalidOperationException": 0}
    skipped = 0
    for rel in rel_paths:
        p = os.path.join(ROOT, rel.replace("/", os.sep))
        if not os.path.exists(p):
            print("  KHÔNG CÓ FILE: %s" % rel)
            continue
        src = io.open(p, encoding="utf-8-sig").read()
        before = src.count("throw new Exception(")
        changes = []

        def repl(m):
            msg = m.group(1)
            kind = classify(msg)
            changes.append((kind, msg[:88]))
            total[kind] += 1
            return "throw new %s(%s)" % (kind, msg)

        out = THROW.sub(repl, src)
        after = out.count("throw new Exception(")
        skipped += after
        print("\n%s  (%d chỗ → sửa %d, giữ nguyên %d)" % (rel, before, len(changes), after))
        for kind, msg in changes:
            print("   %-26s %s" % ("404" if kind == "KeyNotFoundException" else "400", msg))
        if after:
            for line in out.split("\n"):
                if "throw new Exception(" in line:
                    print("   GIỮ NGUYÊN (nhiều đối số / không khớp): %s" % line.strip()[:100])
        if apply and changes:
            io.open(p, "w", encoding="utf-8", newline="").write(out)

    print("\n== tổng: %d → 404, %d → 400, %d giữ nguyên ==" % (
        total["KeyNotFoundException"], total["InvalidOperationException"], skipped))


BATCH1 = [
    "Billing/BillingCompleteService.Refunds.cs",
    "Billing/BillingCompleteService.ElectronicInvoices.cs",
    "Billing/BillingCompleteService.LockApproveDiscount.cs",
    "Billing/BillingCompleteService.Payments.cs",
    "Reception/ReceptionCompleteService.Registration.cs",
    "Reception/ReceptionCompleteService.Insurance.cs",
    "Reception/ReceptionCompleteService.Queue.cs",
    "Reception/ReceptionCompleteService.Printing.cs",
    "Reception/ReceptionCompleteService.PhotosDocs.cs",
    "Reception/ReceptionCompleteService.OrdersBilling.cs",
    "Warehouse/WarehouseCompleteService.StockOut.cs",
    "Warehouse/WarehouseCompleteService.StockIn.cs",
    "Warehouse/WarehouseCompleteService.Inventory.cs",
    "MedicalRecordArchiveService.cs",
]

BATCH2 = [
    "AppointmentBookingService.cs",
    "AssetManagementService.Disposal.cs",
    "AssetManagementService.FixedAssetHandover.cs",
    "AssetManagementService.Reports.cs",
    "AssetManagementService.cs",
    "Billing/BillingCompleteService.AdminReports.cs",
    "Billing/BillingCompleteService.CashBook.cs",
    "Billing/BillingCompleteService.ElectronicInvoices.cs",
    "BookingManagementService.cs",
    "ClinicalNarrativeService.cs",
    "EmrAdminService.cs",
    "EpidemiologyService.cs",
    "Examination/ExaminationCompleteService.Diagnosis.cs",
    "Examination/ExaminationCompleteService.ExamHistoryCare.cs",
    "Examination/ExaminationCompleteService.Prescriptions.cs",
    "Examination/ExaminationCompleteService.PrescriptionsLib.cs",
    "Examination/ExaminationCompleteService.ServiceOrders.cs",
    "Examination/ExaminationCompleteService.WaitingList.cs",
    "FollowUpService.cs",
    "HealthCheckupService.cs",
    "ImmunizationService.cs",
    "Inpatient/InpatientCompleteService.BedFeeReports.cs",
    "Inpatient/InpatientCompleteService.CareRecords.cs",
    "Inpatient/InpatientCompleteService.Discharge.cs",
    "Inpatient/InpatientCompleteService.NutritionReports.cs",
    "Inpatient/InpatientCompleteService.OrdersReports.cs",
    "Inpatient/InpatientCompleteService.PatientMgmt.cs",
    "Inpatient/InpatientCompleteService.Prescriptions.cs",
    "Inpatient/InpatientCompleteService.Treatment.cs",
    "IvfLabService.Transfers.cs",
    "IvfLabService.cs",
    "PatientService.cs",
    "PaymentGatewayService.Query.cs",
    "PaymentGatewayService.VietQR.cs",
    "ProcurementService.cs",
    "Surgery/SurgeryPrescriptionServiceImpl.cs",
    "Surgery/SurgerySchedulingServiceImpl.cs",
]

if __name__ == "__main__":
    batch = BATCH2 if "--batch2" in sys.argv else BATCH1
    process(batch, apply="--apply" in sys.argv)
