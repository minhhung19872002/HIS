using HIS.Application.Common;
using HIS.Core.Entities;

namespace HIS.Application.Interfaces;

/// <summary>
/// LIS admin — logic 8 danh mục CRUD tách khỏi LisCatalogController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/validation/response shape giữ nguyên; userId
/// truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public interface ILisCatalogService
{
    // 1. LabBook
    Task<ServiceOutcome> GetBooksAsync(string? keyword, bool? isActive);
    Task<ServiceOutcome> SaveBookAsync(LabBook dto, Guid userId);
    Task<ServiceOutcome> DeleteBookAsync(Guid id);

    // 2. LabBookGroup
    Task<ServiceOutcome> GetGroupsAsync(Guid? labBookId, string? keyword);
    Task<ServiceOutcome> SaveGroupAsync(LabBookGroup dto, Guid userId);
    Task<ServiceOutcome> DeleteGroupAsync(Guid id);

    // 3. LabMeasurementUnit
    Task<ServiceOutcome> GetUnitsAsync(string? keyword, bool? isActive);
    Task<ServiceOutcome> SaveUnitAsync(LabMeasurementUnit dto, Guid userId);
    Task<ServiceOutcome> DeleteUnitAsync(Guid id);

    // 4. LabOrganism
    Task<ServiceOutcome> GetOrganismsAsync(string? keyword, string? category);
    Task<ServiceOutcome> SaveOrganismAsync(LabOrganism dto, Guid userId);
    Task<ServiceOutcome> DeleteOrganismAsync(Guid id);

    // 5. LabAntibiotic
    Task<ServiceOutcome> GetAntibioticsAsync(string? keyword, string? drugClass);
    Task<ServiceOutcome> SaveAntibioticAsync(LabAntibiotic dto, Guid userId);
    Task<ServiceOutcome> DeleteAntibioticAsync(Guid id);

    // 6. LabChemical
    Task<ServiceOutcome> GetChemicalsAsync(Guid? serviceId, Guid? supplyId);
    Task<ServiceOutcome> SaveChemicalAsync(LabChemical dto, Guid userId);
    Task<ServiceOutcome> DeleteChemicalAsync(Guid id);

    // 7. LisTestParameter
    Task<ServiceOutcome> GetTestsAsync(string? keyword, Guid? groupId, bool? isActive);
    Task<ServiceOutcome> SaveTestAsync(LisTestParameter dto, Guid userId);
    Task<ServiceOutcome> DeleteTestAsync(Guid id);

    // 8. LabSampleType (read-only)
    Task<ServiceOutcome> GetSampleTypesAsync(string? keyword, bool? isActive);
}
