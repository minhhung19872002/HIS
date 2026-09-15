using Microsoft.EntityFrameworkCore;
using AutoMapper;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Security;

namespace HIS.Infrastructure.Services;

public class PatientService : IPatientService
{
    private readonly HISDbContext _context;
    private readonly IMapper _mapper;

    public PatientService(HISDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<PatientMergeSuccessorDto>> GetMergeSuccessorsAsync(IReadOnlyCollection<Guid> patientIds)
    {
        var result = new List<PatientMergeSuccessorDto>();
        var ids = patientIds.Distinct().Take(1000).ToList();
        if (ids.Count == 0) return result;

        var merged = await _context.Patients.IgnoreQueryFilters().AsNoTracking()
            .Where(p => ids.Contains(p.Id) && p.MergedIntoPatientId != null)
            .Select(p => new { p.Id, Next = p.MergedIntoPatientId!.Value })
            .ToListAsync();

        foreach (var m in merged)
        {
            // Đi theo chuỗi ghép (ghép nén chuỗi nên thường chỉ một bước; giới hạn để dữ liệu hỏng tạo
            // vòng lặp cũng không treo request).
            var current = m.Next;
            Patient? survivor = null;
            for (var hop = 0; hop < 10; hop++)
            {
                var p = await _context.Patients.IgnoreQueryFilters().AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == current);
                if (p == null) break;
                if (!p.IsDeleted) { survivor = p; break; }
                if (p.MergedIntoPatientId is not Guid next) break;
                current = next;
            }

            if (survivor != null)
                result.Add(new PatientMergeSuccessorDto
                {
                    PatientId = m.Id,
                    CurrentPatientId = survivor.Id,
                    CurrentPatientCode = survivor.PatientCode,
                    CurrentFullName = survivor.FullName,
                });
        }
        return result;
    }

    public async Task<PatientDto?> GetByIdAsync(Guid id)
    {
        var patient = await _context.Patients.FindAsync(id);
        return patient == null ? null : _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto?> GetByCodeAsync(string patientCode)
    {
        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.PatientCode == patientCode);
        return patient == null ? null : _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto?> GetByIdentityNumberAsync(string identityNumber)
    {
        var patient = await _context.Patients.AsNoTracking()
            .FindByIdentityNumberDecryptedAsync(identityNumber);
        return patient == null ? null : _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto?> GetByInsuranceNumberAsync(string insuranceNumber)
    {
        var patient = await _context.Patients.AsNoTracking()
            .FindByInsuranceNumberDecryptedAsync(insuranceNumber);
        return patient == null ? null : _mapper.Map<PatientDto>(patient);
    }

    public async Task<PagedResultDto<PatientDto>> SearchAsync(PatientSearchDto dto)
    {
        var query = _context.Patients.AsQueryable();

        if (!string.IsNullOrEmpty(dto.PatientCode))
            query = query.Where(p => p.PatientCode.Contains(dto.PatientCode));

        var needsPiiSearch = !string.IsNullOrWhiteSpace(dto.IdentityNumber)
            || !string.IsNullOrWhiteSpace(dto.PhoneNumber)
            || !string.IsNullOrWhiteSpace(dto.InsuranceNumber)
            || !string.IsNullOrWhiteSpace(dto.Keyword);
        var page = Math.Max(1, dto.Page);
        var pageSize = Math.Clamp(dto.PageSize, 1, 200);
        List<Patient> items;
        int totalCount;

        if (needsPiiSearch)
        {
            var candidates = await query.AsNoTracking().ToListAsync();
            var matched = candidates
                .Where(p =>
                    ContainsIgnoreCase(p.IdentityNumber, dto.IdentityNumber)
                    && ContainsIgnoreCase(p.PhoneNumber, dto.PhoneNumber)
                    && ContainsIgnoreCase(p.InsuranceNumber, dto.InsuranceNumber)
                    && (string.IsNullOrWhiteSpace(dto.Keyword)
                        || ContainsIgnoreCase(p.FullName, dto.Keyword)
                        || ContainsIgnoreCase(p.PatientCode, dto.Keyword)
                        || ContainsIgnoreCase(p.PhoneNumber, dto.Keyword)))
                .OrderByDescending(p => p.CreatedAt)
                .ToList();
            totalCount = matched.Count;
            items = matched.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        }
        else
        {
            totalCount = await query.CountAsync();
            items = await query.AsNoTracking()
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        return new PagedResultDto<PatientDto>
        {
            Items = _mapper.Map<List<PatientDto>>(items),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private static bool ContainsIgnoreCase(string? value, string? term)
        => string.IsNullOrWhiteSpace(term)
            || (value?.Contains(term.Trim(), StringComparison.OrdinalIgnoreCase) ?? false);

    public async Task<PatientDto> CreateAsync(CreatePatientDto dto)
    {
        var patient = _mapper.Map<Patient>(dto);
        patient.PatientCode = await GeneratePatientCodeAsync();

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();

        return _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto> UpdateAsync(UpdatePatientDto dto)
    {
        var patient = await _context.Patients.FindAsync(dto.Id)
            ?? throw new KeyNotFoundException("Patient not found");

        _mapper.Map(dto, patient);
        await _context.SaveChangesAsync();

        return _mapper.Map<PatientDto>(patient);
    }

    public async Task DeleteAsync(Guid id)
    {
        var patient = await _context.Patients.FindAsync(id)
            ?? throw new KeyNotFoundException("Patient not found");

        patient.IsDeleted = true;
        await _context.SaveChangesAsync();
    }

    public async Task<string> GeneratePatientCodeAsync()
    {
        var year = DateTime.Now.Year.ToString().Substring(2);
        var prefix = $"BN{year}";

        var lastCode = await _context.Patients
            .IgnoreQueryFilters()
            .Where(p => p.PatientCode.StartsWith(prefix))
            .OrderByDescending(p => p.PatientCode)
            .Select(p => p.PatientCode)
            .FirstOrDefaultAsync();

        var nextNumber = 1;
        if (!string.IsNullOrEmpty(lastCode))
        {
            var numberPart = lastCode.Replace(prefix, "");
            if (int.TryParse(numberPart, out var lastNumber))
                nextNumber = lastNumber + 1;
        }

        return $"{prefix}{nextNumber:D6}";
    }
}
