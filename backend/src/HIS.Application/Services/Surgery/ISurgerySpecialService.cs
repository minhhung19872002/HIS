using HIS.Application.DTOs.NangCap18;

namespace HIS.Application.Services.Surgery;

/// <summary>
/// Surgery Special Service — NangCap18 Anesthesia Chart + Profit Calculation.
///
/// K12 POC Step 1 (2026-05-30, Plan B TRUE module hóa):
/// Tách 3 method NangCap18 khỏi `ISurgeryCompleteService` (god interface 105 method)
/// thành interface riêng theo Bounded Context Surgery.NangCap18.
/// Facade `ISurgeryCompleteService` vẫn giữ public API stable (controllers KHÔNG đổi).
/// </summary>
public interface ISurgerySpecialService
{
    /// <summary>Lưu phiếu gây mê (NangCap18 #6).</summary>
    Task<bool> SaveAnesthesiaChartAsync(SaveAnesthesiaChartDto dto, Guid userId);

    /// <summary>Lấy phiếu gây mê theo surgeryId.</summary>
    Task<AnesthesiaChartDto> GetAnesthesiaChartAsync(Guid surgeryId);

    /// <summary>Tính lợi nhuận PTTT (TT37 + chi phí thực tế).</summary>
    Task<SurgeryProfitDto> CalculateSurgeryProfitAsync(Guid surgeryId);
}
