using HIS.Application.DTOs.Adr;

namespace HIS.Application.Interfaces;

public interface IAdrReportService
{
    /// <summary>Lấy danh sách phiếu ADR, lọc theo ngày / từ khóa.</summary>
    Task<List<AdrReportDto>> GetAdrReportsAsync(DateTime? from, DateTime? to, string? keyword);

    /// <summary>Tạo mới hoặc cập nhật phiếu ADR (Id == Guid.Empty = tạo mới).</summary>
    Task<AdrReportDto> SaveAdrReportAsync(AdrReportDto dto, string? userId);

    /// <summary>Soft-delete phiếu ADR.</summary>
    Task<bool> DeleteAdrReportAsync(Guid id, string? userId);

    /// <summary>Báo cáo tổng hợp đếm theo severity trong khoảng thời gian.</summary>
    Task<AdrReportSummaryDto> GetReportSummaryAsync(DateTime? from, DateTime? to);
}
