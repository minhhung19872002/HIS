namespace HIS.PatientApp.Api.Connector;

/// <summary>
/// Cửa DUY NHẤT để BFF chạm vào HIS.
///
/// Mọi thứ ở đây đều là lời gọi HTTP tới API mà HIS cung cấp — đúng yêu cầu HSMT I.1 "hệ thống tích
/// hợp module kết nối với HIS dựa trên các API HIS cung cấp". Đổi sang một HIS khác chỉ cần viết một
/// implementation mới, phần còn lại của app không đổi một dòng.
///
/// Mở rộng dần theo phase; Phase 1 chỉ cần tra cứu bệnh nhân để đăng ký và liên kết tài khoản.
/// Bảng đối chiếu route: docs/features/patient-app/his-connector-mapping.md
/// </summary>
public interface IHisConnector
{
    /// <summary>Lấy hồ sơ bệnh nhân theo Id. Null nếu HIS không có.</summary>
    Task<HisPatient?> GetPatientByIdAsync(Guid patientId, CancellationToken ct = default);

    /// <summary>Lấy theo mã bệnh nhân in trên thẻ khám. Null nếu không có.</summary>
    Task<HisPatient?> GetPatientByCodeAsync(string patientCode, CancellationToken ct = default);

    /// <summary>Lấy theo số CCCD/CMND. Null nếu không có.</summary>
    Task<HisPatient?> GetPatientByIdentityAsync(string identityNumber, CancellationToken ct = default);

    /// <summary>
    /// Tìm bệnh nhân theo số điện thoại. HIS không có route riêng cho việc này (khảo sát §3) nên
    /// phải đi qua <c>POST /api/patients/search</c> rồi tự lọc lại đúng số — search của HIS khớp
    /// mờ nhiều trường, không lọc lại thì rất dễ trả nhầm người khác.
    /// </summary>
    Task<IReadOnlyList<HisPatient>> FindPatientsByPhoneAsync(string phoneNumber, CancellationToken ct = default);

    /// <summary>HIS có sống không — dùng cho endpoint /health của BFF.</summary>
    Task<bool> PingAsync(CancellationToken ct = default);

    // ---------------------------------------------------------- danh mục

    /// <summary>Khoa khám mở cho đặt lịch. Có nhớ tạm vì danh mục ít đổi.</summary>
    Task<IReadOnlyList<HisDepartment>> GetDepartmentsAsync(CancellationToken ct = default);

    Task<IReadOnlyList<HisDoctor>> GetDoctorsAsync(Guid? departmentId, CancellationToken ct = default);

    /// <summary>Phòng khám đang mở, kèm số người đang chờ — app dùng để chọn nơi lấy số.</summary>
    Task<IReadOnlyList<HisRoom>> GetRoomsAsync(Guid? departmentId, CancellationToken ct = default);

    // ------------------------------------------------- số thứ tự (I.2 #3)

    /// <summary>
    /// Lấy số thứ tự ngoại trú. <paramref name="priorityReason"/> bỏ trống = số thường; HIS tự đối
    /// chiếu tuổi từ hồ sơ nên người cao tuổi vẫn được ưu tiên dù không khai.
    /// </summary>
    Task<HisQueueTicket> TakeQueueNumberAsync(
        string phoneNumber, string? patientName, Guid roomId, int queueType,
        int? priorityReason, CancellationToken ct = default);

    /// <summary>Trạng thái vé: đang gọi số nào, còn bao nhiêu người, ước tính bao nhiêu phút.</summary>
    Task<HisQueueTicketStatus?> GetQueueTicketStatusAsync(Guid ticketId, CancellationToken ct = default);

    // --------------------------------------------------- đặt khám (I.2 #4)

    Task<HisSlotResult> GetSlotsAsync(
        DateTime date, Guid? departmentId, Guid? doctorId, CancellationToken ct = default);

    Task<HisBookingResult> BookAppointmentAsync(object payload, CancellationToken ct = default);

    /// <summary>Tra lịch hẹn theo số điện thoại của người bệnh.</summary>
    Task<IReadOnlyList<HisBookingStatus>> LookupAppointmentsAsync(
        string phoneNumber, CancellationToken ct = default);

    Task<HisBookingStatus> CancelAppointmentAsync(
        string appointmentCode, string phoneNumber, string? reason, CancellationToken ct = default);

    Task<HisBookingStatus> RescheduleAppointmentAsync(
        string appointmentCode, string phoneNumber, DateTime newDate, TimeSpan? newTime,
        Guid? newDoctorId, string? reason, CancellationToken ct = default);

    // -------------------------------------- kết quả khám ngoại trú (I.2 #5)
    //
    // Mọi hàm dưới đây nhận patientId. BFF LUÔN truyền id của tài khoản đang đăng nhập, không bao giờ
    // nhận từ thân yêu cầu — token gửi sang HIS là tài khoản dịch vụ nên HIS sẽ đưa bất cứ hồ sơ nào
    // được hỏi. Chốt chặn nằm ở BFF.

    Task<IReadOnlyList<HisVisitSummary>> GetVisitsAsync(
        Guid patientId, int limit = 20, CancellationToken ct = default);

    Task<IReadOnlyList<HisLabResult>> GetLabResultsAsync(
        Guid patientId, Guid? visitId = null, CancellationToken ct = default);

    /// <summary>
    /// Chi tiết một phiếu xét nghiệm kèm từng chỉ số. Null nếu HIS không có, HOẶC phiếu không thuộc
    /// <paramref name="patientId"/> — HIS tự đối chiếu chủ sở hữu rồi trả 404, nên phép kiểm không
    /// phụ thuộc vào việc BFF có nhớ kiểm hay không.
    /// </summary>
    Task<HisLabResult?> GetLabResultAsync(Guid patientId, Guid resultId, CancellationToken ct = default);

    Task<IReadOnlyList<HisImagingResult>> GetImagingResultsAsync(
        Guid patientId, Guid? visitId = null, CancellationToken ct = default);

    Task<HisImagingResult?> GetImagingResultAsync(Guid patientId, Guid resultId, CancellationToken ct = default);

    /// <summary>Danh sách ảnh PACS của một phiếu KQ CĐHA.</summary>
    Task<IReadOnlyList<HisImagingInstance>> GetImagingInstancesAsync(
        Guid patientId, Guid resultId, CancellationToken ct = default);

    /// <summary>Ảnh đã dựng. Null nếu HIS/PACS không có ảnh đó.</summary>
    Task<HisImageBytes?> GetImagingInstanceImageAsync(
        Guid patientId, Guid resultId, string instanceId, int width, CancellationToken ct = default);

    Task<IReadOnlyList<HisFunctionalResult>> GetFunctionalResultsAsync(
        Guid patientId, Guid? visitId = null, CancellationToken ct = default);

    Task<HisFunctionalResult?> GetFunctionalResultAsync(Guid patientId, Guid resultId, CancellationToken ct = default);

    Task<IReadOnlyList<HisHealthCheckup>> GetHealthCheckupsAsync(
        Guid patientId, CancellationToken ct = default);

    Task<IReadOnlyList<HisPrescription>> GetPrescriptionsAsync(
        Guid patientId, bool activeOnly, CancellationToken ct = default);
}
