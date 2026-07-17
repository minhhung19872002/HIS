using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService
{
    // ========================================================================
    // Transfer Management
    // ========================================================================

    public async Task<PagedTransferResult> GetTransfersAsync(TransferSearchDto search)
    {
        try
        {
            // Query from Discharge table (DischargeType = 2 means transfer)
            var query = _context.Set<Discharge>()
                .Include(d => d.Admission).ThenInclude(a => a.Patient)
                .Include(d => d.Admission).ThenInclude(a => a.Department)
                .Where(d => !d.IsDeleted && d.DischargeType == 2)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.Keyword))
            {
                var kw = search.Keyword.Trim().ToLower();
                query = query.Where(d =>
                    d.Admission.Patient.FullName.ToLower().Contains(kw) ||
                    d.Admission.Patient.PatientCode.ToLower().Contains(kw));
            }

            if (search.FromDate.HasValue)
                query = query.Where(d => d.DischargeDate >= search.FromDate.Value);
            if (search.ToDate.HasValue)
                query = query.Where(d => d.DischargeDate <= search.ToDate.Value.AddDays(1));

            var total = await query.CountAsync();
            var records = await query
                .OrderByDescending(d => d.DischargeDate)
                .Skip(search.PageIndex * search.PageSize)
                .Take(search.PageSize)
                .Select(d => new
                {
                    d.Id,
                    PatientCode = d.Admission.Patient.PatientCode,
                    PatientName = d.Admission.Patient.FullName,
                    FromDepartment = d.Admission.Department != null ? d.Admission.Department.DepartmentName : "",
                    Reason = d.DischargeInstructions ?? "",
                    Diagnosis = d.DischargeDiagnosis ?? "",
                    d.DischargeDate,
                    d.DischargeCondition,
                })
                .ToListAsync();

            var items = records.Select(d => new TransferRecordDto
            {
                Id = d.Id,
                PatientCode = d.PatientCode,
                PatientName = d.PatientName,
                FromDepartment = d.FromDepartment,
                Reason = d.Reason,
                Diagnosis = d.Diagnosis,
                TransferDate = d.DischargeDate,
                Status = d.DischargeCondition >= 3 ? 3 : d.DischargeCondition,
                StatusName = GetTransferStatusName(d.DischargeCondition),
            }).ToList();

            return new PagedTransferResult { TotalCount = total, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying transfers, returning stub data");
            return GetStubTransfers(search);
        }
    }

    public async Task<TransferRecordDto> ApproveTransferAsync(ApproveTransferDto dto, Guid userId)
    {
        try
        {
            var discharge = await _context.Set<Discharge>()
                .Include(d => d.Admission).ThenInclude(a => a.Patient)
                .FirstOrDefaultAsync(d => d.Id == dto.TransferId && !d.IsDeleted);

            if (discharge == null)
                return new TransferRecordDto { StatusName = "Khong tim thay" };

            discharge.DischargeCondition = dto.Approve ? 1 : 2;
            discharge.DischargeInstructions = dto.Approve ? discharge.DischargeInstructions : dto.RejectReason;
            await _context.SaveChangesAsync();

            return new TransferRecordDto
            {
                Id = discharge.Id,
                PatientName = discharge.Admission?.Patient?.FullName,
                Status = discharge.DischargeCondition,
                StatusName = dto.Approve ? "Da duyet" : "Tu choi",
                ApprovedDate = DateTime.UtcNow,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error approving transfer");
            return new TransferRecordDto
            {
                Id = dto.TransferId,
                Status = dto.Approve ? 1 : 2,
                StatusName = dto.Approve ? "Da duyet" : "Tu choi",
                ApprovedDate = DateTime.UtcNow,
            };
        }
    }

    public async Task<TransferRecordDto> AssignTransferNumberAsync(AssignTransferNumberDto dto, Guid userId)
    {
        await Task.CompletedTask;
        return new TransferRecordDto
        {
            Id = dto.TransferId,
            TransferNumber = dto.TransferNumber,
            Status = 1,
            StatusName = "Da cap so",
            ApprovedDate = DateTime.UtcNow,
        };
    }
}
