using HIS.Application.DTOs.Pharmacy;

namespace HIS.Application.Services;

/// <summary>
/// #214 [SAFE-3] Cấu hình ngưỡng liều + kiểm tra quá liều khi kê đơn (advisory).
/// Không chặn lâm sàng: bảng rỗng / thuốc không có range active → không cảnh báo.
/// </summary>
public interface IMedicineDoseRangeService
{
    Task<List<MedicineDoseRangeDto>> GetByMedicineAsync(Guid medicineId);
    Task<List<MedicineDoseRangeDto>> SearchAsync(string? keyword);
    Task<MedicineDoseRangeDto> CreateAsync(CreateMedicineDoseRangeDto dto, Guid userId);
    Task<MedicineDoseRangeDto> UpdateAsync(Guid id, CreateMedicineDoseRangeDto dto, Guid userId);
    Task<bool> DeleteAsync(Guid id, Guid userId);

    /// <summary>Kiểm tra liều kê so với ngưỡng cấu hình → danh sách cảnh báo (advisory).</summary>
    Task<List<DoseWarningDto>> CheckAsync(DoseCheckRequestDto request);
}
