using HIS.Application.DTOs.Billing;

namespace HIS.Application.Services;

public interface IReassignObjectService
{
    /// <summary>Đổi đối tượng hàng loạt (bulk) — endpoint cũ, giữ nguyên</summary>
    Task<ReassignObjectResultDto> ReassignAsync(ReassignObjectRequestDto dto, Guid userId);

    /// <summary>Đổi đối tượng toàn bộ hồ sơ bệnh án (cả dịch vụ lẫn thuốc)</summary>
    Task<ChangeObjectResultDto> ChangeObjectForRecordAsync(ChangeObjectForRecordRequestDto dto, Guid userId);

    /// <summary>Đổi đối tượng một dòng dịch vụ CLS/PTTT</summary>
    Task<ChangeObjectResultDto> ChangeObjectForServiceLineAsync(ChangeObjectForServiceLineRequestDto dto, Guid userId);

    /// <summary>Đổi đối tượng một dòng thuốc/VTYT tại CĐHA (#137)</summary>
    Task<ChangeObjectResultDto> ChangeObjectForDrugLineAsync(ChangeObjectForDrugLineRequestDto dto, Guid userId);

    /// <summary>Lấy lịch sử đổi đối tượng theo hồ sơ bệnh án</summary>
    Task<List<PayerChangeLogDto>> GetPayerChangeHistoryAsync(Guid medicalRecordId);
}
