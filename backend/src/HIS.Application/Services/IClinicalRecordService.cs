using HIS.Application.DTOs.Clinical;

namespace HIS.Application.Services;

public interface IClinicalRecordService
{
    // Partograph (Bieu do chuyen da)
    Task<List<PartographRecordDto>> GetPartographRecordsAsync(PartographSearchDto filter);
    Task<PartographRecordDto> SavePartographRecordAsync(PartographSaveDto dto);
    Task<bool> DeletePartographRecordAsync(Guid id);

    // Anesthesia (Phieu gay me hoi suc)
    Task<List<AnesthesiaRecordDto>> GetAnesthesiaRecordsAsync(AnesthesiaSearchDto filter);
    Task<AnesthesiaRecordDto?> GetAnesthesiaByIdAsync(Guid id);
    Task<AnesthesiaRecordDto> SaveAnesthesiaRecordAsync(AnesthesiaSaveDto dto);
    Task<bool> DeleteAnesthesiaRecordAsync(Guid id);
}
