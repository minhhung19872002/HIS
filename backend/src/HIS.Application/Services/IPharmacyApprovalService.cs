using HIS.Application.DTOs.Pharmacy;

namespace HIS.Application.Services;

public interface IPharmacyApprovalService
{
    Task<PharmacyApprovalDto> CreateAsync(CreatePharmacyApprovalDto dto, Guid userId);
    Task<PharmacyApprovalDto> UpdateAsync(Guid id, CreatePharmacyApprovalDto dto, Guid userId);
    Task<bool> DeleteDraftAsync(Guid id, Guid userId);

    Task<PharmacyApprovalDto> SubmitAsync(SubmitApprovalDto dto, Guid userId);
    Task<PharmacyApprovalDto> ApproveAsync(ApproveDto dto, Guid userId);
    Task<PharmacyApprovalDto> RevokeAsync(RevokeApprovalDto dto, Guid userId);

    Task<PharmacyApprovalDto?> GetByIdAsync(Guid id);
    Task<PharmacyApprovalSearchResultDto> SearchAsync(PharmacyApprovalSearchDto dto);

    Task<List<ExpiringMedicineDto>> GetExpiringMedicinesAsync(int daysAhead);
}
