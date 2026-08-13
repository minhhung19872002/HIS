using HIS.Application.DTOs.NangCap27;

namespace HIS.Application.Services;

/// <summary>
/// NangCap27 (HSMT BV Tâm thần Quảng Ngãi) — Phiếu vận chuyển người bệnh (17.x của HSMT: 4.1.8/4.1.30,
/// 10.1.9/.11, 11.1.12/.14, 18.2.9/.11, 18.3.12/.14). Danh mục vận chuyển + giá xăng tái sử dụng
/// từ <see cref="IMasterCatalogService"/>, service này chỉ quản lý PHIẾU.
/// </summary>
public interface IPatientTransportSlipService
{
    Task<List<PatientTransportSlipDto>> GetSlipsAsync(TransportSlipFilterDto filter);
    Task<PatientTransportSlipDto?> GetSlipAsync(Guid id);
    Task<PatientTransportSlipDto> SaveSlipAsync(SaveTransportSlipDto dto, string? userId);
    Task<PatientTransportSlipDto> ApproveSlipAsync(Guid id, Guid userId);
    Task<PatientTransportSlipDto> CompleteSlipAsync(Guid id, string? userId);
    Task<PatientTransportSlipDto> CancelSlipAsync(Guid id, string? reason, string? userId);
    Task<bool> DeleteSlipAsync(Guid id, string? userId);
}

/// <summary>
/// NangCap27 — Khám sức khỏe theo đoàn: danh mục công ty (HSMT 17.1) + hợp đồng KSK (HSMT 17.2).
/// Đợt khám / nhập danh sách Excel / gói dịch vụ đã có sẵn ở module Khám sức khỏe
/// (api/health-checkup) — service này chỉ bổ sung phần công ty + hợp đồng còn thiếu.
/// </summary>
public interface ICheckupContractService
{
    Task<List<CheckupCompanyDto>> GetCompaniesAsync(string? keyword, bool? isActive);
    Task<CheckupCompanyDto> SaveCompanyAsync(CheckupCompanyDto dto, string? userId);
    Task<bool> DeleteCompanyAsync(Guid id, string? userId);

    Task<List<CheckupContractDto>> GetContractsAsync(CheckupContractFilterDto filter);
    Task<CheckupContractDto?> GetContractAsync(Guid id);
    Task<CheckupContractDto> SaveContractAsync(SaveCheckupContractDto dto, string? userId);
    Task<bool> DeleteContractAsync(Guid id, string? userId);
}
