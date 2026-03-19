using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

public class TreatmentProtocolService : ITreatmentProtocolService
{
    private readonly HISDbContext _context;

    public TreatmentProtocolService(HISDbContext context)
    {
        _context = context;
    }

    private static string GetStatusName(int status) => status switch
    {
        0 => "Ban nhap",
        1 => "Dang ap dung",
        2 => "Da thay the",
        3 => "Ngung su dung",
        _ => "Khong xac dinh"
    };

    private static TreatmentProtocolDto MapToDto(TreatmentProtocol entity, bool includeSteps = false)
    {
        var dto = new TreatmentProtocolDto
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            Description = entity.Description,
            IcdCode = entity.IcdCode,
            IcdName = entity.IcdName,
            DiseaseGroup = entity.DiseaseGroup,
            Version = entity.Version,
            Status = entity.Status,
            StatusName = GetStatusName(entity.Status),
            ApprovedBy = entity.ApprovedBy,
            ApprovedDate = entity.ApprovedDate,
            EffectiveDate = entity.EffectiveDate,
            ExpiryDate = entity.ExpiryDate,
            Department = entity.Department,
            References = entity.References,
            Notes = entity.Notes,
            StepCount = entity.Steps?.Count ?? 0,
            CreatedAt = entity.CreatedAt
        };

        if (includeSteps && entity.Steps != null)
        {
            dto.Steps = entity.Steps
                .OrderBy(s => s.StepOrder)
                .Select(s => new TreatmentProtocolStepDto
                {
                    Id = s.Id,
                    StepOrder = s.StepOrder,
                    Name = s.Name,
                    Description = s.Description,
                    ActivityType = s.ActivityType,
                    MedicationName = s.MedicationName,
                    MedicationDose = s.MedicationDose,
                    MedicationRoute = s.MedicationRoute,
                    MedicationFrequency = s.MedicationFrequency,
                    DurationDays = s.DurationDays,
                    ServiceCode = s.ServiceCode,
                    ServiceName = s.ServiceName,
                    Conditions = s.Conditions,
                    ExpectedOutcome = s.ExpectedOutcome,
                    Notes = s.Notes,
                    IsOptional = s.IsOptional
                })
                .ToList();
        }

        return dto;
    }

    public async Task<TreatmentProtocolPagedResult> SearchProtocolsAsync(TreatmentProtocolSearchDto dto)
    {
        var pageIndex = Math.Max(1, dto.PageIndex);
        var pageSize = Math.Clamp(dto.PageSize, 1, 100);

        var query = _context.TreatmentProtocols
            .Include(p => p.Steps)
            .Where(p => !p.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.ToLower();
            query = query.Where(p =>
                p.Code.ToLower().Contains(kw) ||
                p.Name.ToLower().Contains(kw) ||
                (p.Description != null && p.Description.ToLower().Contains(kw)) ||
                (p.IcdCode != null && p.IcdCode.ToLower().Contains(kw)) ||
                (p.IcdName != null && p.IcdName.ToLower().Contains(kw))
            );
        }

        if (!string.IsNullOrWhiteSpace(dto.IcdCode))
        {
            query = query.Where(p => p.IcdCode == dto.IcdCode);
        }

        if (!string.IsNullOrWhiteSpace(dto.DiseaseGroup))
        {
            query = query.Where(p => p.DiseaseGroup == dto.DiseaseGroup);
        }

        if (!string.IsNullOrWhiteSpace(dto.Department))
        {
            query = query.Where(p => p.Department == dto.Department);
        }

        if (dto.Status.HasValue)
        {
            query = query.Where(p => p.Status == dto.Status.Value);
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new TreatmentProtocolPagedResult
        {
            Items = items.Select(p => MapToDto(p, includeSteps: false)).ToList(),
            TotalCount = totalCount,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<TreatmentProtocolDto?> GetProtocolByIdAsync(Guid id)
    {
        var entity = await _context.TreatmentProtocols
            .Include(p => p.Steps)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        return entity == null ? null : MapToDto(entity, includeSteps: true);
    }

    public async Task<TreatmentProtocolDto> SaveProtocolAsync(SaveTreatmentProtocolDto dto)
    {
        TreatmentProtocol entity;

        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            // Update existing
            entity = await _context.TreatmentProtocols
                .Include(p => p.Steps)
                .FirstOrDefaultAsync(p => p.Id == dto.Id.Value && !p.IsDeleted)
                ?? throw new InvalidOperationException($"Protocol {dto.Id} not found");

            entity.Code = dto.Code;
            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.IcdCode = dto.IcdCode;
            entity.IcdName = dto.IcdName;
            entity.DiseaseGroup = dto.DiseaseGroup;
            entity.Department = dto.Department;
            entity.References = dto.References;
            entity.Notes = dto.Notes;
            entity.UpdatedAt = DateTime.UtcNow;

            // Remove old steps
            if (entity.Steps.Any())
            {
                _context.TreatmentProtocolSteps.RemoveRange(entity.Steps);
            }
        }
        else
        {
            // Create new
            entity = new TreatmentProtocol
            {
                Code = dto.Code,
                Name = dto.Name,
                Description = dto.Description,
                IcdCode = dto.IcdCode,
                IcdName = dto.IcdName,
                DiseaseGroup = dto.DiseaseGroup,
                Department = dto.Department,
                References = dto.References,
                Notes = dto.Notes,
                Version = 1,
                Status = 0 // Draft
            };
            _context.TreatmentProtocols.Add(entity);
        }

        // Add steps
        foreach (var stepDto in dto.Steps)
        {
            var step = new TreatmentProtocolStep
            {
                ProtocolId = entity.Id,
                StepOrder = stepDto.StepOrder,
                Name = stepDto.Name,
                Description = stepDto.Description,
                ActivityType = stepDto.ActivityType,
                MedicationName = stepDto.MedicationName,
                MedicationDose = stepDto.MedicationDose,
                MedicationRoute = stepDto.MedicationRoute,
                MedicationFrequency = stepDto.MedicationFrequency,
                DurationDays = stepDto.DurationDays,
                ServiceCode = stepDto.ServiceCode,
                ServiceName = stepDto.ServiceName,
                Conditions = stepDto.Conditions,
                ExpectedOutcome = stepDto.ExpectedOutcome,
                Notes = stepDto.Notes,
                IsOptional = stepDto.IsOptional
            };
            entity.Steps.Add(step);
        }

        await _context.SaveChangesAsync();

        // Reload with steps
        var saved = await _context.TreatmentProtocols
            .Include(p => p.Steps)
            .FirstAsync(p => p.Id == entity.Id);

        return MapToDto(saved, includeSteps: true);
    }

    public async Task<bool> DeleteProtocolAsync(Guid id)
    {
        var entity = await _context.TreatmentProtocols
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (entity == null) return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<TreatmentProtocolDto> ApproveProtocolAsync(Guid id, string approvedBy)
    {
        var entity = await _context.TreatmentProtocols
            .Include(p => p.Steps)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new InvalidOperationException($"Protocol {id} not found");

        entity.Status = 1; // Active
        entity.ApprovedBy = approvedBy;
        entity.ApprovedDate = DateTime.UtcNow;
        entity.EffectiveDate = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(entity, includeSteps: true);
    }

    public async Task<TreatmentProtocolDto> NewVersionAsync(Guid id)
    {
        var original = await _context.TreatmentProtocols
            .Include(p => p.Steps)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new InvalidOperationException($"Protocol {id} not found");

        // Mark old version as superseded
        original.Status = 2; // Superseded
        original.UpdatedAt = DateTime.UtcNow;

        // Clone protocol with new version
        var newProtocol = new TreatmentProtocol
        {
            Code = original.Code,
            Name = original.Name,
            Description = original.Description,
            IcdCode = original.IcdCode,
            IcdName = original.IcdName,
            DiseaseGroup = original.DiseaseGroup,
            Version = original.Version + 1,
            Status = 0, // Draft
            Department = original.Department,
            References = original.References,
            Notes = original.Notes
        };
        _context.TreatmentProtocols.Add(newProtocol);

        // Clone steps
        foreach (var step in original.Steps.Where(s => !s.IsDeleted))
        {
            var newStep = new TreatmentProtocolStep
            {
                ProtocolId = newProtocol.Id,
                StepOrder = step.StepOrder,
                Name = step.Name,
                Description = step.Description,
                ActivityType = step.ActivityType,
                MedicationName = step.MedicationName,
                MedicationDose = step.MedicationDose,
                MedicationRoute = step.MedicationRoute,
                MedicationFrequency = step.MedicationFrequency,
                DurationDays = step.DurationDays,
                ServiceCode = step.ServiceCode,
                ServiceName = step.ServiceName,
                Conditions = step.Conditions,
                ExpectedOutcome = step.ExpectedOutcome,
                Notes = step.Notes,
                IsOptional = step.IsOptional
            };
            newProtocol.Steps.Add(newStep);
        }

        await _context.SaveChangesAsync();

        var saved = await _context.TreatmentProtocols
            .Include(p => p.Steps)
            .FirstAsync(p => p.Id == newProtocol.Id);

        return MapToDto(saved, includeSteps: true);
    }

    public async Task<List<TreatmentProtocolDto>> GetProtocolsByIcdAsync(string icdCode)
    {
        var protocols = await _context.TreatmentProtocols
            .Include(p => p.Steps)
            .Where(p => !p.IsDeleted && p.IcdCode == icdCode)
            .OrderByDescending(p => p.Version)
            .ThenByDescending(p => p.CreatedAt)
            .Take(50)
            .ToListAsync();

        return protocols.Select(p => MapToDto(p, includeSteps: false)).ToList();
    }

    public async Task<ProtocolEvaluationDto> EvaluatePatientAsync(Guid protocolId, Guid examinationId)
    {
        var protocol = await _context.TreatmentProtocols
            .Include(p => p.Steps)
            .FirstOrDefaultAsync(p => p.Id == protocolId && !p.IsDeleted)
            ?? throw new InvalidOperationException($"Protocol {protocolId} not found");

        var examination = await _context.Examinations
            .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted)
            ?? throw new InvalidOperationException($"Examination {examinationId} not found");

        // Get patient's service requests for this examination
        var serviceRequests = await _context.ServiceRequests
            .Include(sr => sr.Details)
                .ThenInclude(d => d.Service)
            .Where(sr => sr.ExaminationId == examinationId && !sr.IsDeleted)
            .ToListAsync();

        var allServiceDetails = serviceRequests.SelectMany(sr => sr.Details).ToList();

        // Get patient's prescriptions for this examination
        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details)
                .ThenInclude(d => d.Medicine)
            .Where(p => p.ExaminationId == examinationId && !p.IsDeleted)
            .ToListAsync();

        var allPrescriptionDetails = prescriptions.SelectMany(p => p.Details).ToList();

        // Evaluate each step
        var stepEvaluations = new List<ProtocolStepEvaluationDto>();
        var completedCount = 0;

        foreach (var step in protocol.Steps.Where(s => !s.IsDeleted).OrderBy(s => s.StepOrder))
        {
            var eval = new ProtocolStepEvaluationDto
            {
                StepOrder = step.StepOrder,
                StepName = step.Name,
                ActivityType = step.ActivityType ?? "Other"
            };

            switch (step.ActivityType?.ToLower())
            {
                case "medication":
                    // Check if medication was prescribed
                    if (!string.IsNullOrEmpty(step.MedicationName))
                    {
                        var medName = step.MedicationName.ToLower();
                        var matchedMed = allPrescriptionDetails.FirstOrDefault(d =>
                            d.Medicine != null &&
                            d.Medicine.MedicineName.ToLower().Contains(medName));

                        if (matchedMed != null)
                        {
                            eval.IsCompleted = true;
                            eval.CompletedNote = $"Da ke don: {matchedMed.Medicine?.MedicineName}, Lieu: {matchedMed.Dosage}, Tan suat: {matchedMed.Frequency}";
                            completedCount++;
                        }
                        else
                        {
                            eval.CompletedNote = $"Chua ke thuoc: {step.MedicationName}";
                        }
                    }
                    break;

                case "lab":
                case "imaging":
                case "procedure":
                    // Check if service was requested
                    if (!string.IsNullOrEmpty(step.ServiceCode))
                    {
                        var matchedService = allServiceDetails.FirstOrDefault(d =>
                            d.Service != null &&
                            d.Service.ServiceCode == step.ServiceCode);

                        if (matchedService != null)
                        {
                            eval.IsCompleted = true;
                            eval.CompletedNote = $"Da chi dinh: {matchedService.Service?.ServiceName}";
                            completedCount++;
                        }
                        else
                        {
                            eval.CompletedNote = $"Chua chi dinh dich vu: {step.ServiceName ?? step.ServiceCode}";
                        }
                    }
                    else if (!string.IsNullOrEmpty(step.ServiceName))
                    {
                        var svcName = step.ServiceName.ToLower();
                        var matchedService = allServiceDetails.FirstOrDefault(d =>
                            d.Service != null &&
                            d.Service.ServiceName.ToLower().Contains(svcName));

                        if (matchedService != null)
                        {
                            eval.IsCompleted = true;
                            eval.CompletedNote = $"Da chi dinh: {matchedService.Service?.ServiceName}";
                            completedCount++;
                        }
                        else
                        {
                            eval.CompletedNote = $"Chua chi dinh dich vu: {step.ServiceName}";
                        }
                    }
                    break;

                case "monitoring":
                default:
                    // Monitoring or other steps - cannot be automatically verified
                    eval.CompletedNote = "Can danh gia thu cong";
                    break;
            }

            stepEvaluations.Add(eval);
        }

        var totalSteps = stepEvaluations.Count;
        var pendingSteps = totalSteps - completedCount;
        var complianceRate = totalSteps > 0 ? Math.Round((double)completedCount / totalSteps * 100, 1) : 0;

        return new ProtocolEvaluationDto
        {
            ProtocolId = protocol.Id,
            ProtocolName = $"{protocol.Name} (v{protocol.Version})",
            TotalSteps = totalSteps,
            CompletedSteps = completedCount,
            PendingSteps = pendingSteps,
            ComplianceRate = complianceRate,
            StepEvaluations = stepEvaluations
        };
    }

    public async Task<List<string>> GetDiseaseGroupsAsync()
    {
        return await _context.TreatmentProtocols
            .Where(p => !p.IsDeleted && p.DiseaseGroup != null && p.DiseaseGroup != "")
            .Select(p => p.DiseaseGroup!)
            .Distinct()
            .OrderBy(g => g)
            .ToListAsync();
    }
}
