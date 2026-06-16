using HIS.Application.DTOs.MultiHisConnector;

namespace HIS.Application.Interfaces;

public interface IMultiHisConnectorService
{
    // ─── Connection CRUD ─────────────────────────────────────────────────────
    Task<List<HisConnectionDto>> GetConnectionsAsync();
    Task<HisConnectionDto?> GetConnectionByIdAsync(Guid id);
    Task<HisConnectionDto> SaveConnectionAsync(SaveHisConnectionDto dto, string? userId);
    Task<bool> DeleteConnectionAsync(Guid id);

    // ─── Test & Health ───────────────────────────────────────────────────────
    /// <summary>
    /// Ping BaseUrl/health (hoặc /api/ping) của connection đã lưu.
    /// MockMode=true trả Online ngay, không gọi HTTP thật.
    /// Cập nhật LastCheckedAt + LastStatus vào DB sau mỗi lần test.
    /// </summary>
    Task<ConnectionTestResultDto> TestConnectionAsync(Guid id, CancellationToken ct = default);

    // ─── CheckMissingForms ───────────────────────────────────────────────────
    /// <summary>
    /// Đối soát thiếu tờ phiếu bắt buộc cho các đợt khám/nhập viện trong khoảng ngày.
    /// Rule đơn giản hiện tại: OPD cần tờ "Phiếu khám bệnh"; IPD cần thêm
    /// "Tờ điều trị" + "Phiếu ra viện". Mở rộng rule bằng cách inject config/table.
    /// </summary>
    Task<MissingFormsCheckResultDto> CheckMissingFormsAsync(
        DateTime fromDate,
        DateTime toDate,
        string? encounterType = null);
}
