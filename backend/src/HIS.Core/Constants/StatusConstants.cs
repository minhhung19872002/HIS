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

/// <summary>
/// #218/T3: trạng thái PHIẾU HOÀN TIỀN (Receipts với ReceiptType = 3). Trước đây chỉ là số trần rải
/// trong BillingCompleteService.Refunds và KHÔNG có luật chuyển nào — đo trên API thật thì 11/16 lượt
/// chuyển bất hợp lệ đều được chấp nhận với HTTP 200, trong đó ba lượt cho tiền RA KHỎI QUỸ sai:
/// xác nhận chi cho phiếu chưa từng duyệt, cho phiếu đã từ chối, và cho phiếu đã hủy.
/// </summary>
/// <summary>
/// #217/T2: hai từ vựng KHÁC NHAU cùng nói về "loại dịch vụ", lệch nhau một bậc —
///   <c>Service.ServiceType</c>      : 1-Khám, 2-XN, 3-CĐHA, 4-TDCN, 5-PTTT
///   <c>ServiceRequest.RequestType</c>: 1-XN,   2-CĐHA, 3-TDCN, 4-PTTT, 5-Khác
/// Đường chỉ định của khám từng gán thẳng <c>RequestType = service.ServiceType</c>, tức chép nguyên
/// mã của bảng này sang bảng kia: chỉ định XÉT NGHIỆM ra loại "CĐHA", chỉ định CĐHA ra "TDCN".
/// Hệ quả đo được: bộ khớp kết quả máy phân tích lọc <c>RequestType == 1</c> nên KHÔNG BAO GIỜ khớp
/// được phiếu xét nghiệm tạo từ phòng khám; các màn đếm "kết quả XN" cũng đếm nhầm nhóm.
/// Đổi mã ở đây để việc chuyển đổi có tên và không ai chép chéo lần nữa.
/// </summary>
public static class ServiceRequestType
{
    public const int Lab = 1;          // XN
    public const int Imaging = 2;      // CĐHA
    public const int FunctionTest = 3; // TDCN
    public const int Surgery = 4;      // PTTT
    public const int Other = 5;        // Khác

    /// <summary>Đổi <c>Service.ServiceType</c> sang <c>ServiceRequest.RequestType</c>.</summary>
    public static int FromServiceType(int serviceType) => serviceType switch
    {
        2 => Lab,           // XN
        3 => Imaging,       // CĐHA
        4 => FunctionTest,  // TDCN
        5 => Surgery,       // PTTT
        _ => Other,         // 1-Khám và mọi giá trị lạ
    };

    public static string GetName(int requestType) => requestType switch
    {
        Lab => "Xét nghiệm",
        Imaging => "Chẩn đoán hình ảnh",
        FunctionTest => "Thăm dò chức năng",
        Surgery => "Phẫu thuật - thủ thuật",
        Other => "Khác",
        _ => $"Không xác định ({requestType})",
    };
}

public static class RefundStatus
{
    public const int PendingApproval = 0;  // Chờ duyệt
    public const int Approved = 1;         // Đã duyệt
    public const int Rejected = 2;         // Từ chối
    public const int Paid = 4;             // Đã chi hoàn
    public const int Cancelled = 5;        // Đã hủy

    /// <summary>Nguyên tắc: tiền chỉ ra khỏi quỹ SAU KHI đã duyệt; từ chối/đã chi/đã hủy là trạng thái kết thúc.</summary>
    private static readonly Dictionary<int, int[]> ValidTransitions = new()
    {
        { PendingApproval, [Approved, Rejected, Cancelled] },
        { Approved,        [Paid, Cancelled] },
        { Rejected,        [] },
        { Paid,            [] },
        { Cancelled,       [] },
    };

    public static bool CanTransition(int from, int to)
        => from == to || (ValidTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to));

    public static void EnsureCanTransition(int from, int to)
    {
        if (!CanTransition(from, to))
            throw new InvalidOperationException(
                $"Không thể chuyển phiếu hoàn tiền từ trạng thái \"{GetName(from)}\" sang \"{GetName(to)}\".");
    }

    public static string GetName(int status) => status switch
    {
        PendingApproval => "Chờ duyệt",
        Approved => "Đã duyệt",
        Rejected => "Từ chối",
        Paid => "Đã chi hoàn",
        Cancelled => "Đã hủy",
        _ => $"Không xác định ({status})",
    };
}

/// <summary>
/// Trạng thái của YÊU CẦU PHẪU THUẬT (<c>SurgeryRequests.Status</c>) và của LỊCH MỔ
/// (<c>SurgerySchedules.Status</c>). Hai bảng đi song song và code cập nhật cả hai cùng lúc.
/// </summary>
public static class SurgeryStatus
{
    // SurgeryRequests.Status
    public const int RequestScheduled = 1;  // Đã duyệt / đã lên lịch
    public const int RequestInProgress = 2; // Đang mổ
    public const int RequestCompleted = 3;  // Hoàn thành
    public const int RequestCancelled = 4;  // Hủy / từ chối duyệt

    // SurgerySchedules.Status
    public const int SchedulePreparing = 2;  // Đang chuẩn bị
    public const int ScheduleInProgress = 3; // Đang mổ
    public const int ScheduleCompleted = 4;  // Hoàn thành

    public static string RequestLabel(int status) => status switch
    {
        RequestScheduled => "Đã lên lịch",
        RequestInProgress => "Đang mổ",
        RequestCompleted => "Đã hoàn thành",
        RequestCancelled => "Đã hủy",
        _ => $"Không xác định ({status})",
    };

    /// <summary>
    /// Ca mổ đã bắt đầu được chưa. Chặn hai thứ: ca ĐÃ HỦY (mổ một ca đã hủy), và ca đang mổ hoặc
    /// đã mổ xong (gọi lại sẽ đẻ thêm một biên bản mổ thứ hai cho cùng một ca).
    /// </summary>
    public static bool CanStart(int requestStatus, int scheduleStatus)
        => requestStatus != RequestCancelled
           && scheduleStatus != ScheduleInProgress
           && scheduleStatus != ScheduleCompleted;

    public static void EnsureCanStart(int requestStatus, int scheduleStatus)
    {
        if (requestStatus == RequestCancelled)
            throw new InvalidOperationException("Ca mổ đã hủy, không bắt đầu được.");
        if (scheduleStatus == ScheduleInProgress)
            throw new InvalidOperationException("Ca mổ đang diễn ra, không bắt đầu lại được.");
        if (scheduleStatus == ScheduleCompleted)
            throw new InvalidOperationException("Ca mổ đã kết thúc, không bắt đầu lại được.");
    }

    /// <summary>
    /// Ca mổ kết thúc được chưa. Quan trọng nhất là <paramref name="hasRecord"/>: biên bản mổ chỉ
    /// sinh ra ở bước BẮT ĐẦU, mà toàn bộ tường trình (chẩn đoán sau mổ, mô tả, tai biến) lại ghi
    /// vào biên bản đó. Kết thúc một ca chưa từng bắt đầu thì tường trình rơi hết mà API vẫn trả
    /// 200 — đo được ở evidence/cross/t3/t3_surgery_transitions.json.
    /// </summary>
    /// <summary>
    /// Phiếu mổ còn hủy / từ chối duyệt được không.
    ///
    /// <para>#218/T3 — `CancelSurgeryAsync` và `RejectSurgeryAsync` trước đây gán thẳng
    /// <see cref="RequestCancelled"/> không kiểm gì, nên hủy được cả ca **đã mổ xong** và ca **đang
    /// mổ**. Hủy một ca đã hoàn thành thì biên bản mổ vẫn nằm đó còn phiếu lại khai là đã hủy — hai
    /// thứ nói ngược nhau về một việc đã thật sự xảy ra trên người bệnh.</para>
    /// </summary>
    public static void EnsureCanCancelRequest(int requestStatus, string action)
    {
        if (requestStatus == RequestCompleted)
            throw new InvalidOperationException(
                $"Ca mổ đã hoàn thành, không {action} được. Biên bản mổ đã ghi nhận ca này thật sự đã diễn ra.");
        if (requestStatus == RequestInProgress)
            throw new InvalidOperationException(
                $"Ca mổ đang diễn ra, không {action} được.");
        if (requestStatus == RequestCancelled)
            throw new InvalidOperationException("Ca mổ đã hủy trước đó rồi.");
    }

    public static void EnsureCanComplete(int scheduleStatus, bool hasRecord)
    {
        if (scheduleStatus == ScheduleCompleted)
            throw new InvalidOperationException("Ca mổ đã kết thúc rồi.");
        if (!hasRecord)
            throw new InvalidOperationException(
                "Ca mổ chưa được bắt đầu nên chưa có biên bản mổ để ghi tường trình. "
                + "Bấm \"Bắt đầu ca mổ\" trước rồi kết thúc.");
    }
}

/// <summary>
/// Trạng thái của ĐỢT XUẤT XML gửi cơ quan bảo hiểm xã hội (<c>InsuranceXmlBatches.Status</c>).
///
/// <para>Đây là đường duy nhất trong hệ thống mà hậu quả đi RA NGOÀI bệnh viện: gửi trùng một đợt
/// là gửi trùng hồ sơ thật lên cổng của cơ quan bảo hiểm.</para>
/// </summary>
public static class InsuranceXmlBatchStatus
{
    public const int Exported = 0;   // Đã xuất file, chưa ký
    public const int Signed = 1;     // Đã ký số
    public const int Submitted = 2;  // Đã gửi BHXH
    public const int Rejected = 3;   // Bị từ chối — sửa rồi gửi lại là hợp lệ

    public static string Label(int status) => status switch
    {
        Exported => "Đã xuất",
        Signed => "Đã ký số",
        Submitted => "Đã gửi BHXH",
        Rejected => "Bị từ chối",
        _ => $"Không xác định ({status})",
    };

    /// <summary>
    /// Đợt đã gửi rồi thì không đụng vào nữa: không gửi lại (trùng hồ sơ ở cơ quan bảo hiểm) và
    /// không ký lại (ký lại đặt <see cref="Signed"/> đè lên, xoá mất dấu là nó ĐÃ gửi).
    ///
    /// <para>Cố ý KHÔNG bắt buộc <see cref="Signed"/> trước khi gửi: một cơ sở chưa cấu hình chữ ký
    /// số sẽ bị chặn hoàn toàn khỏi việc gửi hồ sơ. Đó là câu hỏi nghiệp vụ, cần người dùng quyết —
    /// ghi lại ở evidence/cross/t3/t3_bhxh_transitions.json.</para>
    /// </summary>
    public static bool IsAlreadySubmitted(int status) => status == Submitted;

    /// <summary>Ném <see cref="InvalidOperationException"/> (→ HTTP 400) nếu đợt đã gửi.</summary>
    public static void EnsureNotSubmitted(int status, string action)
    {
        if (IsAlreadySubmitted(status))
            throw new InvalidOperationException(
                $"Đợt XML đã gửi lên BHXH, không {action} được. Nếu cần nộp lại, hãy xuất đợt mới.");
    }
}

/// <summary>
/// Trạng thái của một HỒ SƠ đề nghị thanh toán bảo hiểm (<c>InsuranceClaims.ClaimStatus</c>).
/// </summary>
public static class InsuranceClaimStatus
{
    public const int Pending = 0;           // Chờ — còn sửa thoải mái
    public const int Locked = 1;            // Đã khóa (chốt để đưa vào đợt xuất)
    public const int Approved = 2;          // Cơ quan bảo hiểm đã duyệt
    public const int PartiallyRejected = 3; // Từ chối một phần
    public const int FullyRejected = 4;     // Từ chối toàn bộ
    public const int Paid = 5;              // Đã thanh toán

    public static string Label(int status) => status switch
    {
        Pending => "Chờ",
        Locked => "Đã khóa",
        Approved => "Đã duyệt",
        PartiallyRejected => "Từ chối một phần",
        FullyRejected => "Từ chối toàn bộ",
        Paid => "Đã thanh toán",
        _ => $"Không xác định ({status})",
    };

    /// <summary>
    /// Còn sửa được nội dung không. Hồ sơ **bị từ chối** CỐ Ý vẫn sửa được — đó chính là quy trình
    /// sửa-rồi-nộp-lại mà <c>ProcessRejectedClaimAsync</c> phục vụ. Hồ sơ đã khóa thì phải mở khóa
    /// trước (đã có endpoint riêng, chỉ Admin/Manager).
    /// </summary>
    public static bool IsEditable(int status)
        => status == Pending || status == PartiallyRejected || status == FullyRejected;

    /// <summary>Chỉ hồ sơ chưa đi đâu cả mới xoá được.</summary>
    public static bool IsDeletable(int status) => status == Pending;

    public static void EnsureEditable(int status)
    {
        if (!IsEditable(status))
            throw new InvalidOperationException(
                status == Locked
                    ? "Hồ sơ đã khóa, phải mở khóa trước khi sửa."
                    : $"Hồ sơ ở trạng thái \"{Label(status)}\", không sửa được nội dung.");
    }

    public static void EnsureDeletable(int status)
    {
        if (!IsDeletable(status))
            throw new InvalidOperationException(
                $"Hồ sơ ở trạng thái \"{Label(status)}\", không xoá được.");
    }
}

/// <summary>
/// Trạng thái của PHIẾU TẠM ỨNG (<c>Deposits.Status</c>) — từ vựng mà code đang chạy dùng, đọc từ
/// <c>BillingCompleteService.Payments.cs</c>.
///
/// <para>⚠️ <b>Lệch nghĩa đã biết, CHƯA sửa:</b> giá trị <see cref="FullyUsed"/> được ĐƯỜNG GHI đặt
/// khi số dư về 0 vì đã tiêu hết (<c>Payments.cs</c>, chú thích "Đã sử dụng hết"), nhưng mọi BÁO CÁO
/// lại đọc nó là "đã hoàn tiền" (<c>StatsReversal.cs</c>, <c>AdminReports.cs</c>). Chú thích trên
/// entity <c>Deposit</c> cũng ghi "3-Refunded". Ba nơi hiểu một con số theo hai nghĩa. Không tự sửa
/// vì đổi phía nào cũng làm đổi SỐ LIỆU BÁO CÁO đã phát ra ngoài — cần người dùng quyết.</para>
/// </summary>
public static class DepositStatus
{
    public const int Confirmed = 2;  // Đã xác nhận — còn tiêu / hoàn được
    public const int FullyUsed = 3;  // Số dư về 0 (xem cảnh báo lệch nghĩa ở trên)
    public const int Cancelled = 5;  // Đã hủy

    public static string Label(int status) => status switch
    {
        Confirmed => "Đã xác nhận",
        FullyUsed => "Đã dùng hết",
        Cancelled => "Đã hủy",
        _ => $"Không xác định ({status})",
    };

    /// <summary>Phiếu còn được đụng tới tiền không (tiêu hoặc hoàn). Phiếu đã hủy thì không.</summary>
    public static bool IsSpendable(int status) => status != Cancelled;

    /// <summary>Ném <see cref="InvalidOperationException"/> (→ HTTP 400) khi phiếu đã hủy.</summary>
    public static void EnsureSpendable(int status, string action)
    {
        if (!IsSpendable(status))
            throw new InvalidOperationException($"Phiếu tạm ứng đã hủy, không {action} được.");
    }
}

/// <summary>
/// Trạng thái của một LƯỢT NỘI TRÚ (<c>Admissions.Status</c>) — từ vựng mà code đang chạy dùng,
/// đọc từ bảng ánh xạ trong <c>InpatientCompleteService.Discharge.cs</c>.
/// </summary>
public static class AdmissionStatus
{
    public const int InTreatment = 0;      // Đang điều trị
    public const int Discharged = 1;       // Đã xuất viện
    public const int TransferredOut = 2;   // Chuyển viện
    public const int Died = 3;             // Tử vong
    public const int LeftAgainstAdvice = 4; // Bỏ về

    /// <summary>
    /// Đã chuyển khoa NỘI BỘ — lượt cũ được đóng lại và mở một lượt mới ở khoa đến.
    /// `InpatientCompleteService.PatientMgmt.TransferDepartmentAsync` ghi giá trị này.
    /// </summary>
    public const int TransferredDepartment = 5;

    /// <summary>
    /// Chờ ra viện. <b>Khai báo nhưng chưa có đường ghi nào</b> — rà toàn bộ mã nguồn 2026-09-04 chỉ
    /// thấy một chỗ ĐỌC (`TreatmentRelationshipService`, gom chung với 0 và 5 là "còn đang điều trị"),
    /// không có chỗ nào GÁN. Giữ hằng số ở đây để đặt tên cho giá trị đó thay vì để ai đó gặp số 6
    /// rồi đoán.
    /// </summary>
    public const int PendingDischarge = 6;

    public static string Label(int status) => status switch
    {
        InTreatment => "Đang điều trị",
        Discharged => "Đã xuất viện",
        TransferredOut => "Đã chuyển viện",
        Died => "Đã tử vong",
        LeftAgainstAdvice => "Đã bỏ về",
        TransferredDepartment => "Đã chuyển khoa",
        PendingDischarge => "Chờ ra viện",
        _ => $"Không xác định ({status})",
    };

    /// <summary>
    /// Lượt còn đang nằm viện — điều kiện của mọi thao tác điều trị (chuyển khoa, xếp giường…).
    ///
    /// <para>Gồm cả <see cref="PendingDischarge"/>: bệnh nhân chờ ra viện thì vẫn còn nằm viện. Hôm
    /// nay không có đường nào ghi giá trị 6 nên vế này chưa đổi hành vi của bất cứ chỗ nào; để sẵn
    /// cho đúng nghĩa, và vì chỗ ĐỌC duy nhất của giá trị 6 cũng đang gom nó vào nhóm còn điều trị.</para>
    ///
    /// <para><see cref="TransferredDepartment"/> thì <b>không</b> tính là còn hoạt động: lượt đó đã
    /// được thay bằng một lượt mới ở khoa đến, mọi thao tác phải làm trên lượt mới.</para>
    /// </summary>
    public static bool IsActive(int status)
        => status == InTreatment || status == PendingDischarge;
}

/// <summary>
/// Trạng thái THẬT của một dòng chỉ định (<c>ServiceRequestDetails.Status</c>) trên đường xét
/// nghiệm và chẩn đoán hình ảnh. Đây là từ vựng mà code đang chạy dùng — xem
/// <c>LISCompleteService.QCHistory.cs</c> (bảng đổi số sang nhãn hiển thị).
///
/// Trong <see cref="HasResult"/>, cột <c>ReviewedAt</c> phân biệt tiếp "có KQ" với "đã bác sĩ duyệt".
///
/// <para><b>Chiều ngược</b> đã được <c>LabCancelChainService</c> gác theo đúng chuỗi: hủy duyệt →
/// hủy KQ → hủy lấy mẫu. <see cref="EnsureCanWriteResult"/> là vế đối xứng cho chiều thuận, để
/// không ai ghi được kết quả vào chỉ định đã hủy hoặc đè lên kết quả đã duyệt.</para>
/// </summary>
public static class LabDetailStatus
{
    public const int Pending = 0;        // Chờ lấy mẫu
    public const int InProgress = 1;     // Đang thực hiện (đã có mẫu)
    public const int HasResult = 2;      // Có kết quả (ReviewedAt != null ⇒ đã duyệt)
    public const int Cancelled = 3;      // Đã hủy

    public static string Label(int status) => status switch
    {
        Pending => "Chờ",
        InProgress => "Đang thực hiện",
        HasResult => "Có kết quả",
        Cancelled => "Đã hủy",
        _ => $"Không xác định ({status})",
    };

    /// <summary>
    /// Dòng chỉ định có đang nhận được kết quả mới không. Hai trường hợp phải từ chối:
    /// chỉ định đã hủy, và kết quả đã được duyệt (phải hủy duyệt trước mới ghi đè được).
    /// </summary>
    public static bool CanWriteResult(int status, bool isReviewed)
        => status != Cancelled && !isReviewed;

    /// <summary>Lý do từ chối, hoặc <c>null</c> nếu được phép ghi.</summary>
    public static string? WriteResultRefusal(int status, bool isReviewed)
    {
        if (status == Cancelled)
            return "Chỉ định đã hủy, không ghi được kết quả.";
        if (isReviewed)
            return "Kết quả đã được duyệt. Phải hủy duyệt trước khi ghi đè.";
        return null;
    }

    /// <summary>Ném <see cref="InvalidOperationException"/> (→ HTTP 400) khi không được phép ghi.</summary>
    public static void EnsureCanWriteResult(int status, bool isReviewed)
    {
        var refusal = WriteResultRefusal(status, isReviewed);
        if (refusal != null) throw new InvalidOperationException(refusal);
    }
}

/// <summary>
/// ⚠️ KHÔNG được dùng ở đâu trong code đang chạy (grep = 0 lượt, kiểm 2026-09-04). Đường xét
/// nghiệm thật dùng <see cref="LabDetailStatus"/> trên <c>ServiceRequestDetails.Status</c>, có
/// từ vựng 4 trạng thái khác hẳn 6 trạng thái ở đây. Giữ lại để không phá mã ngoài, đừng dùng cho
/// code mới.
/// </summary>
public static class LabRequestStatus
{
    public const int Pending = 0;
    public const int SampleCollected = 1;
    public const int Processing = 2;
    public const int Completed = 3;
    public const int Approved = 4;
    public const int Cancelled = 5;
}

/// <summary>
/// Trạng thái của PHIẾU KẾT QUẢ chẩn đoán hình ảnh (<c>RadiologyReports.Status</c>) — từ vựng mà
/// code đang chạy dùng, đọc từ <c>RISCompleteService.ImagingApproval.cs</c> và
/// <c>RISCompleteService.IntegrationSignature.cs</c>.
///
/// <para>Hệ thống có sẵn hai cửa ĐI RA khỏi trạng thái đã duyệt: <c>CancelApprovalAsync</c> (hủy
/// duyệt) và <c>CancelSignedResultAsync</c> (thu hồi chữ ký). <see cref="EnsureCanEditContent"/> là
/// vế bắt buộc phải đi qua hai cửa đó trước khi sửa nội dung.</para>
///
/// <para><b>Vì sao phải xét cả chữ ký chứ không chỉ <c>Status</c>:</b> <c>CancelApprovalAsync</c>
/// đưa phiếu về nháp nhưng KHÔNG đụng tới <c>RadiologySignatureHistory</c>. Chỉ gác theo
/// <c>Status</c> thì còn một lối vòng: ký số → hủy duyệt → sửa, và chữ ký vẫn còn hiệu lực trên nội
/// dung đã bị đổi. Đo được lối vòng này ở
/// <c>evidence/cross/t3/t3_radiology_transitions.json</c>.</para>
/// </summary>
public static class RadiologyReportStatus
{
    public const int Draft = 0;              // Nháp — đang viết
    public const int PreliminaryApproved = 1; // Sơ duyệt (KTV/BS đọc lần đầu)
    public const int FinalApproved = 2;      // Duyệt chính thức / đã ký số

    public static string Label(int status) => status switch
    {
        Draft => "Nháp",
        PreliminaryApproved => "Sơ duyệt",
        FinalApproved => "Đã duyệt",
        _ => $"Không xác định ({status})",
    };

    /// <summary>
    /// Có được sửa nội dung (mô tả · kết luận · ghi chú) của phiếu không.
    ///
    /// <para>Sơ duyệt (<see cref="PreliminaryApproved"/>) CỐ Ý vẫn cho sửa: đó là bước đọc đầu của
    /// kỹ thuật viên, bác sĩ còn phải hoàn thiện tường trình sau đó. Chỉ chặn khi đã duyệt chính
    /// thức hoặc khi còn một chữ ký đang có hiệu lực.</para>
    /// </summary>
    public static bool CanEditContent(int status, bool hasActiveSignature)
        => status != FinalApproved && !hasActiveSignature;

    /// <summary>Lý do từ chối, hoặc <c>null</c> nếu được phép sửa.</summary>
    public static string? EditContentRefusal(int status, bool hasActiveSignature)
    {
        if (hasActiveSignature)
            return "Kết quả đã ký số. Phải thu hồi chữ ký trước khi sửa nội dung.";
        if (status == FinalApproved)
            return "Kết quả đã duyệt chính thức. Phải hủy duyệt trước khi sửa nội dung.";
        return null;
    }

    /// <summary>Ném <see cref="InvalidOperationException"/> (→ HTTP 400) khi không được phép sửa.</summary>
    public static void EnsureCanEditContent(int status, bool hasActiveSignature)
    {
        var refusal = EditContentRefusal(status, hasActiveSignature);
        if (refusal != null) throw new InvalidOperationException(refusal);
    }
}

/// <summary>
/// ⚠️ KHÔNG được dùng ở đâu trong code đang chạy (grep = 0 lượt, kiểm 2026-09-04). Xem ghi chú ở
/// <see cref="LabRequestStatus"/>. Trạng thái CHỈ ĐỊNH CĐHA thật nằm trên
/// <c>RadiologyRequests.Status</c> (2 = đang thực hiện · 3 = đã chụp · 4 = đã tường trình ·
/// 5 = đã duyệt); trạng thái PHIẾU KẾT QUẢ nằm ở <see cref="RadiologyReportStatus"/>.
/// </summary>
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

/// <summary>
/// Trạng thái LỊCH HẸN KHÁM (<c>Appointments.Status</c>).
///
/// <para>Module đặt lịch phần lớn được canh cẩn thận: hủy tại quầy, bệnh nhân tự hủy, đổi lịch và
/// tiếp đón-lập-hồ-sơ đều chặn <c>Status &gt;= 2</c>. Nhưng ba nút xác nhận · đã đến khám · không
/// đến lại dùng chung một hàm gán thẳng trạng thái, **không kiểm gì**. Đo được ở
/// evidence/cross/t3/t3_appointment_transitions.json: cả sáu bước chuyển sai đều trả HTTP 200 —
/// lịch đã hủy bấm "xác nhận" là sống lại, lịch đã đến khám bấm "không đến" là xoá dấu vết bệnh
/// nhân đã tới (và <c>GetBookingStatsAsync</c> tính tỉ lệ vắng từ chính hai con số đó).</para>
/// </summary>
public static class AppointmentStatus
{
    public const int Pending = 0;    // Chờ xác nhận
    public const int Confirmed = 1;  // Đã xác nhận
    public const int Attended = 2;   // Đã đến khám
    public const int NoShow = 3;     // Không đến
    public const int Cancelled = 4;  // Đã hủy

    public static string Label(int status) => status switch
    {
        Pending => "Chờ xác nhận",
        Confirmed => "Đã xác nhận",
        Attended => "Đã đến khám",
        NoShow => "Không đến",
        Cancelled => "Đã hủy",
        _ => $"Không xác định ({status})",
    };

    /// <summary>
    /// Ba trạng thái KẾT THÚC. Đã đến khám thì lượt khám có thật và thường đã kéo theo hồ sơ khám;
    /// không đến và đã hủy đều là kết luận cuối của lịch. Từ đây không quay ngược được nữa —
    /// muốn khám thì đặt lịch mới, chứ không hồi sinh lịch cũ.
    /// </summary>
    public static bool IsTerminal(int status)
        => status == Attended || status == NoShow || status == Cancelled;

    /// <summary>
    /// Bước chuyển hợp lệ, dùng chung cho cả ba nút. Chỉ có đúng bốn đường:
    /// chờ xác nhận → đã xác nhận · chờ xác nhận|đã xác nhận → đã đến khám · → không đến.
    /// </summary>
    public static bool CanTransition(int from, int to) => to switch
    {
        Confirmed => from == Pending,
        Attended => from == Pending || from == Confirmed,
        NoShow => from == Pending || from == Confirmed,
        _ => false,
    };

    public static void EnsureCanTransition(int from, int to)
    {
        if (CanTransition(from, to)) return;

        if (IsTerminal(from))
            throw new InvalidOperationException(
                $"Lịch hẹn đang ở trạng thái \"{Label(from)}\" — đây là trạng thái kết thúc, "
                + $"không chuyển sang \"{Label(to)}\" được. Nếu bệnh nhân cần khám thì đặt lịch mới.");

        throw new InvalidOperationException(
            $"Không chuyển lịch hẹn từ \"{Label(from)}\" sang \"{Label(to)}\" được.");
    }
}

/// <summary>
/// Loại thẻ BHYT — `InsuranceCard.CardType`.
///
/// <para>#218/T3: cột này trước đây chỉ có chú thích "Loại thẻ" và **không chỗ nào trong mã ghi vào
/// nó** (bảng `InsuranceCards` cũng chưa từng có dòng nào, dù `KioskService` vẫn ĐỌC nó để bệnh nhân
/// tự check-in bằng số thẻ). Vì cột còn trống hoàn toàn nên đặt nghĩa ở đây là an toàn — khác hẳn
/// `Discharges.DischargeCondition` hay `MedicalRecordArchives.Status`, hai chỗ đã có người dùng theo
/// nghĩa khác và việc mượn lại đã gây hỏng số liệu (§42).</para>
/// </summary>
public static class InsuranceCardType
{
    /// <summary>Thẻ BHYT thường do cơ quan BHXH cấp.</summary>
    public const int Standard = 0;

    /// <summary>
    /// Thẻ BHYT TẠM bệnh viện cấp cho trẻ dưới 6 tuổi chưa có thẻ chính thức (CV 3434/BYT-BH).
    /// </summary>
    public const int TemporaryUnderSix = 1;

    /// <summary>Trẻ dưới 6 tuổi hưởng 100% chi phí khám chữa bệnh.</summary>
    public const int UnderSixPaymentRate = 100;

    /// <summary>
    /// Chế độ áp dụng cho trẻ **dưới 6 tuổi**, thẻ có giá trị đến ngày trẻ đủ **72 tháng**.
    ///
    /// <para>#218/T3 — trước đây có hai luật tuổi khác nhau trong cùng một file, và luật dùng để CẤP
    /// thì sai: <c>Today.Year - dob.Year &lt;= 6</c> nhận cả trẻ đã 6 tuổi, lại còn tính trừ năm nên
    /// trẻ sinh 31/12 bị coi là già thêm gần một tuổi. Đếm theo THÁNG mới đúng.</para>
    /// </summary>
    public static bool IsUnderSix(DateTime dateOfBirth, DateTime asOf)
    {
        var thang = (asOf.Year - dateOfBirth.Year) * 12 + asOf.Month - dateOfBirth.Month;
        if (asOf.Day < dateOfBirth.Day) thang--;
        return thang < 72;
    }

    /// <summary>Ngày thẻ hết hiệu lực: ngày trẻ đủ 72 tháng.</summary>
    public static DateTime ExpiryFor(DateTime dateOfBirth) => dateOfBirth.AddYears(6);
}
