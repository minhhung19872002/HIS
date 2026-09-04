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
    public const int Dispensed = 2;        // Đã cấp phát (đủ)
    public const int Returned = 3;         // Hoàn trả
    public const int Cancelled = 4;        // Hủy
    // 6 = Cấp một phần (conformance state-machine tài liệu). KHÔNG chèn vào value 3 để tránh dịch literal
    // Status==3/4 đang dùng khắp billing/data-inheritance/insurance. Set khi còn dòng thuốc chưa cấp đủ.
    public const int PartialDispensed = 6;

    /// <summary>
    /// #218/T3: luật chuyển trạng thái đơn thuốc. Trước đây KHÔNG có luật nào — đo bằng API thật
    /// (docs/architecture/evidence/cross/t3) thì 9/15 lượt chuyển bất hợp lệ đều được chấp nhận với
    /// HTTP 200, trong đó có hai lượt nguy hiểm: đơn đã HỦY vẫn cấp phát được, và đơn ĐÃ CẤP PHÁT
    /// vẫn hủy được (thuốc đã rời kho nhưng hồ sơ ghi là hủy).
    /// </summary>
    private static readonly Dictionary<int, int[]> ValidTransitions = new()
    {
        { PendingApproval,  [Approved, Cancelled] },              // chờ duyệt → duyệt | hủy
        { Approved,         [Dispensed, PartialDispensed, Cancelled] },
        { PartialDispensed, [Dispensed, Returned, Cancelled] },   // cấp nốt | hoàn trả | hủy phần còn lại
        // Đã ra khỏi kho thì KHÔNG được lật cờ trạng thái suông nữa. Việc "hủy đơn đã phát" có thật,
        // nhưng đi bằng WarehouseCompleteService.CancelDispensedPrescriptionAsync — đường đó trả thuốc
        // về kho rồi mới đặt Cancelled, và không đi qua guard này.
        { Dispensed,        [Returned] },
        { Returned,         [] },
        { Cancelled,        [] },
    };

    /// <summary>Giữ nguyên trạng thái luôn hợp lệ (gọi lại cùng một hành động = không làm gì).</summary>
    public static bool CanTransition(int from, int to)
        => from == to || (ValidTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to));

    /// <summary>Ném <see cref="InvalidOperationException"/> nếu lượt chuyển không hợp lệ —
    /// DomainExceptionFilter map thành 400 INVALID_STATE với đúng câu tiếng Việt này.</summary>
    public static void EnsureCanTransition(int from, int to)
    {
        if (!CanTransition(from, to))
            throw new InvalidOperationException(
                $"Không thể chuyển đơn thuốc từ trạng thái \"{GetName(from)}\" sang \"{GetName(to)}\".");
    }

    public static string GetName(int status) => status switch
    {
        PendingApproval => "Chờ duyệt",
        Approved => "Đã duyệt",
        Dispensed => "Đã cấp phát",
        Returned => "Hoàn trả",
        Cancelled => "Hủy",
        PartialDispensed => "Cấp một phần",
        _ => $"Không xác định ({status})",
    };
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
    public const int EmergencyCabinetIssue = 12; // Xuất tủ trực (cabinet dispensing for patient)

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
        EmergencyCabinetIssue => "Xuất tủ trực",
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
