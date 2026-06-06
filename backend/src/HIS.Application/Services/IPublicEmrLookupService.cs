using HIS.Application.DTOs.PublicEmr;

namespace HIS.Application.Services;

/// <summary>
/// Tra cứu công khai HSBA đã ký số bằng CCCD + ngày sinh (không cần đăng nhập).
/// Privacy P0: bắt buộc 2 yếu tố, token ngắn hạn cho phép tải PDF, rate-limit theo IP, audit mỗi lượt.
/// </summary>
public interface IPublicEmrLookupService
{
    /// <summary>
    /// Tra cứu danh sách tài liệu HSBA đã ký số của bệnh nhân khớp CCCD + ngày sinh.
    /// </summary>
    Task<PublicEmrLookupResponse> LookupAsync(
        PublicEmrLookupRequest request, string? ipAddress, string? userAgent, string? requestPath);

    /// <summary>
    /// Lấy file PDF đã ký của 1 tài liệu — chỉ khi documentId thuộc token tra cứu hợp lệ.
    /// Trả null nếu token sai/hết hạn hoặc documentId không thuộc phiên.
    /// </summary>
    Task<PublicEmrDocumentFileDto?> GetDocumentPdfAsync(
        Guid documentId, string? token, string? ipAddress, string? userAgent, string? requestPath);
}
