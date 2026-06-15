using HIS.Application.DTOs;
using HIS.Application.DTOs.BhytFullCoverage;

namespace HIS.Application.Services;

/// <summary>
/// F3.4: Quan ly danh sach BN BHYT chi tra 100% thuoc dac tri.
/// </summary>
public interface IBhytFullCoverageService
{
    Task<PagedResultDto<BhytFullCoveragePatientDto>> SearchAsync(BhytFullCoverageSearchDto dto);
    Task<BhytFullCoveragePatientDto?> GetByIdAsync(Guid id);
    Task<BhytFullCoveragePatientDto> CreateAsync(CreateBhytFullCoverageDto dto, Guid userId);
    Task<BhytFullCoveragePatientDto> UpdateAsync(Guid id, CreateBhytFullCoverageDto dto, Guid userId);
    Task<bool> DeleteAsync(Guid id, Guid userId);

    /// <summary>
    /// Kiem tra BN co thuoc danh sach full-coverage cung chi tra = 0 khong.
    /// Dung boi engine tinh tien (ReassignObjectService).
    /// </summary>
    Task<bool> IsFullCoverageActiveAsync(Guid patientId, DateTime? asOf = null);
}
