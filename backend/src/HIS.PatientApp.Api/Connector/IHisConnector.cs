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
}
