namespace HIS.Core.Constants;

public static class MedicalRecordStatus
{
    public const int WaitingExam = 0;       // Chờ khám
    public const int InProgress = 1;        // Đang khám
    public const int WaitingConclusion = 2; // Chờ kết luận
    public const int Completed = 3;         // Hoàn thành
    public const int Paid = 4;              // Đã thanh toán
    public const int PendingCLS = 5;        // Chờ kết quả CLS (lab/CĐHA)
    public const int Cancelled = 6;         // Hủy

    private static readonly Dictionary<int, int[]> ValidTransitions = new()
    {
        { WaitingExam, [InProgress, Cancelled] },
        { InProgress, [PendingCLS, WaitingConclusion, Completed, Cancelled] },
        { PendingCLS, [InProgress, WaitingConclusion, Cancelled] },
        { WaitingConclusion, [Completed, InProgress, Cancelled] },
        { Completed, [Paid] },
        { Paid, [] },
        { Cancelled, [] },
    };

    public static bool CanTransition(int from, int to)
        => ValidTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to);

    public static string GetName(int status) => status switch
    {
        WaitingExam => "Chờ khám",
        InProgress => "Đang khám",
        WaitingConclusion => "Chờ kết luận",
        Completed => "Hoàn thành",
        Paid => "Đã thanh toán",
        PendingCLS => "Chờ kết quả CLS",
        Cancelled => "Hủy",
        _ => $"Không xác định ({status})",
    };
}

public static class ExaminationStatus
{
    public const int Waiting = 0;           // Chờ khám
    public const int InProgress = 1;        // Đang khám
    public const int PendingCLS = 2;        // Chờ CLS
    public const int WaitingConclusion = 3; // Chờ kết luận
    public const int Completed = 4;         // Hoàn thành
    public const int Cancelled = 5;         // Hủy

    public static string GetName(int status) => status switch
    {
        Waiting => "Chờ khám",
        InProgress => "Đang khám",
        PendingCLS => "Chờ CLS",
        WaitingConclusion => "Chờ kết luận",
        Completed => "Hoàn thành",
        Cancelled => "Hủy",
        _ => $"Không xác định ({status})",
    };
}

public static class QueueTicketStatus
{
    public const int Waiting = 0;
    public const int Calling = 1;
    public const int Serving = 2;
    public const int Completed = 3;
    public const int Skipped = 4;
}

public static class PrescriptionScope
{
    public const int Outpatient = 1;     // Ngoại trú
    public const int Inpatient = 2;      // Nội trú
    public const int Retail = 3;         // Nhà thuốc
    public const int TraditionalMed = 4; // YHCT
}

public static class PaymentCategory
{
    public const int BHYT = 1;     // Bảo hiểm y tế
    public const int Fee = 2;      // Thu phí (viện phí)
    public const int External = 3; // Thuốc ngoài (mua ngoài BV)
}

public static class PrescriptionStatus
{
    public const int PendingApproval = 0;  // Chờ duyệt
    public const int Approved = 1;         // Đã duyệt
    public const int Dispensed = 2;        // Đã cấp phát
    public const int Returned = 3;         // Hoàn trả
    public const int Cancelled = 4;        // Hủy
}

public static class LabRequestStatus
{
    public const int Pending = 0;
    public const int SampleCollected = 1;
    public const int Processing = 2;
    public const int Completed = 3;
    public const int Approved = 4;
    public const int Cancelled = 5;
}

public static class RadiologyRequestStatus
{
    public const int Pending = 0;
    public const int Scheduled = 1;
    public const int InProgress = 2;
    public const int Completed = 3;
    public const int Reported = 4;
    public const int Approved = 5;
    public const int Cancelled = 6;
}

public static class AbbreviationScope
{
    public const int General = 0;
    public const int Prescription = 1;
    public const int Diagnosis = 2;
    public const int Lab = 3;
    public const int Radiology = 4;
    public const int Appointment = 5;
    public const int Surgery = 6;
    public const int Nursing = 7;

    public static string GetName(int scope) => scope switch
    {
        General => "Chung",
        Prescription => "Ghi chú thuốc",
        Diagnosis => "Chẩn đoán / Triệu chứng",
        Lab => "Kết quả XN",
        Radiology => "Mô tả CĐHA",
        Appointment => "Ghi chú hẹn",
        Surgery => "Tường trình PTTT",
        Nursing => "Chăm sóc ĐD",
        _ => "Khác",
    };
}

public static class StockIssueType
{
    public const int OutpatientPrescription = 1;
    public const int InpatientRequisition = 2;
    public const int DepartmentIssue = 3;
    public const int WarehouseTransfer = 4;
    public const int SupplierReturn = 5;
    public const int ExternalIssue = 6;
    public const int Destruction = 7;
    public const int TestSample = 8;
    public const int StockTakeAdjust = 9;
    public const int Disposal = 10;
    public const int RetailSale = 11;

    public static string GetName(int type) => type switch
    {
        OutpatientPrescription => "Xuất đơn thuốc ngoại trú",
        InpatientRequisition => "Xuất phiếu lĩnh nội trú",
        DepartmentIssue => "Xuất khoa/phòng",
        WarehouseTransfer => "Xuất chuyển kho",
        SupplierReturn => "Xuất trả NCC",
        ExternalIssue => "Xuất ngoại viện",
        Destruction => "Xuất hủy",
        TestSample => "Xuất kiểm nghiệm",
        StockTakeAdjust => "Xuất kiểm kê",
        Disposal => "Xuất thanh lý",
        RetailSale => "Xuất bán nhà thuốc",
        _ => "Khác",
    };
}

public static class CompoundingStatus
{
    public const int Pending = 0;
    public const int InProgress = 1;
    public const int Completed = 2;
    public const int Cancelled = 3;

    public static string GetName(int status) => status switch
    {
        Pending => "Chờ pha chế",
        InProgress => "Đang pha chế",
        Completed => "Hoàn thành",
        Cancelled => "Hủy",
        _ => "Khác",
    };
}

public static class DrugOrderType
{
    public const int Regular = 1;
    public const int EmergencyCabinet = 2;
    public const int Return = 3;

    public static string GetName(int type) => type switch
    {
        Regular => "Thường qui (Phiếu lĩnh)",
        EmergencyCabinet => "Xuất tủ trực",
        Return => "Hoàn trả",
        _ => "Khác",
    };
}

public static class PatientType
{
    public const int BHYT = 1;
    public const int Fee = 2;
    public const int Service = 3;
    public const int HealthCheck = 4;

    public static string GetName(int type) => type switch
    {
        BHYT => "BHYT",
        Fee => "Viện phí",
        Service => "Dịch vụ",
        HealthCheck => "Khám sức khỏe",
        _ => "Khác",
    };
}

public static class TreatmentType
{
    public const int Outpatient = 1;
    public const int Inpatient = 2;
    public const int Emergency = 3;

    public static string GetName(int type) => type switch
    {
        Outpatient => "Ngoại trú",
        Inpatient => "Nội trú",
        Emergency => "Cấp cứu",
        _ => "Khác",
    };
}
