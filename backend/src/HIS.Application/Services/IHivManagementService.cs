using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IHivManagementService
{
    // HIV Patients
    Task<List<HivPatientListDto>> SearchPatientsAsync(HivPatientSearchDto? filter = null);
    Task<HivPatientListDto?> GetPatientByIdAsync(Guid id);
    Task<HivPatientListDto> CreatePatientAsync(HivPatientCreateDto dto);
    Task<HivPatientListDto> UpdatePatientAsync(Guid id, HivPatientUpdateDto dto);
    Task<HivPatientStatsDto> GetPatientStatsAsync();

    // Lab Results
    Task<List<HivLabResultListDto>> SearchLabResultsAsync(HivLabResultSearchDto? filter = null);
    Task<HivLabResultListDto> CreateLabResultAsync(HivLabResultCreateDto dto);

    // PMTCT
    Task<List<PmtctRecordListDto>> GetPmtctRecordsByPatientAsync(Guid hivPatientId);
    Task<PmtctRecordListDto> CreatePmtctRecordAsync(PmtctRecordCreateDto dto);
    Task<PmtctRecordListDto> UpdatePmtctRecordAsync(Guid id, PmtctRecordUpdateDto dto);
    Task<PmtctStatsDto> GetPmtctStatsAsync();
}
