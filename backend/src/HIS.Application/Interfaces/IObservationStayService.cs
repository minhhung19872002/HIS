using HIS.Application.Common;
using HIS.Application.DTOs.ObservationStay;

namespace HIS.Application.Interfaces;

/// <summary>
/// Phòng lưu / Observation ngắn hạn (N1.07) — logic tách khỏi ObservationStayController (#202 thin-controller).
/// Tiếp nhận → theo dõi sinh hiệu → cho về / chuyển nhập viện.
/// Trả ServiceOutcome để controller map về IActionResult giữ nguyên status code + body.
/// </summary>
public interface IObservationStayService
{
    Task<ServiceOutcome> ListAsync(int? status, string? keyword);
    Task<ServiceOutcome> CreateAsync(CreateDto dto, Guid userId);
    Task<ServiceOutcome> AddVitalAsync(Guid id, VitalDto dto, Guid userId);
    Task<ServiceOutcome> GetVitalsAsync(Guid id);
    Task<ServiceOutcome> DischargeAsync(Guid id, DischargeDto dto, Guid userId);
    Task<ServiceOutcome> EscalateAsync(Guid id, DischargeDto dto, Guid userId);
    Task<ServiceOutcome> UpdateTriageAsync(Guid id, UpdateTriageDto dto, Guid userId);
}
