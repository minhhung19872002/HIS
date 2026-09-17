using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
    private readonly IPatientDataScopeGuard _scope;
    private readonly ILogger<PatientService>? _logger;

    public PatientService(HISDbContext context, IMapper mapper, IPatientDataScopeGuard scope,
        ILogger<PatientService>? logger = null)
    {
        _context = context;
        _mapper = mapper;
        _scope = scope;
        _logger = logger;
    }

    // QA-R7: BHYT card = 2 letters + 13 digits; the 10-digit BHXH code is also accepted as an identifier.
    private static readonly Regex BhytCardPattern = new(@"^[A-Z]{2}\d{13}$", RegexOptions.CultureInvariant);
    private static readonly Regex BhxhCodePattern = new(@"^\d{10}$", RegexOptions.CultureInvariant);
    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.CultureInvariant);

    /// <summary>
    /// QA-R7: NON-blocking format check — PatientDto has no warnings array, so a suspicious BHYT number or
    /// e-mail is only logged (field name + patient code, never the value). Unchanged values on an edit are skipped.
    /// </summary>
    private void WarnOnSuspiciousFormats(CreatePatientDto dto, Patient? existing, string? patientCode)
    {
        if (_logger == null) return;
        var bhyt = dto.InsuranceNumber?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(bhyt) && !string.Equals(bhyt, existing?.InsuranceNumber?.Trim(), StringComparison.OrdinalIgnoreCase)
            && !BhytCardPattern.IsMatch(bhyt) && !BhxhCodePattern.IsMatch(bhyt))
            _logger.LogWarning("Patient {PatientCode}: InsuranceNumber does not look like a BHYT card (2 letters + 13 digits) or a 10-digit BHXH code", patientCode);
        var email = dto.Email?.Trim();
        if (!string.IsNullOrEmpty(email) && !string.Equals(email, existing?.Email?.Trim(), StringComparison.OrdinalIgnoreCase)
            && !EmailPattern.IsMatch(email))
            _logger.LogWarning("Patient {PatientCode}: Email is malformed", patientCode);
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
        if (patient == null) return null;
        // QA round 4: a doctor scoped to one department could read every department's patients.
        await _scope.EnsurePatientInScopeAsync(id);
        return _mapper.Map<PatientDto>(patient);
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
            items = matched.Skip(Math.Max(0, page - 1) * pageSize).Take(pageSize).ToList();
        }
        else
        {
            totalCount = await query.CountAsync();
            items = await query.AsNoTracking()
                .OrderByDescending(p => p.CreatedAt)
                .Skip(Math.Max(0, page - 1) * pageSize)
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

    // QA-R6: accent-insensitive like the Latin1_General_CI_AI collation this search had before it moved in
    // memory (#403) — "duc" must find "Đức".
    private static bool ContainsIgnoreCase(string? value, string? term)
        => string.IsNullOrWhiteSpace(term)
            || HIS.Core.Common.VnSearchText.Contains(value, term);

    public async Task<PatientDto> CreateAsync(CreatePatientDto dto)
    {
        await ValidatePatientAsync(dto, excludeId: null, existing: null);
        var patient = _mapper.Map<Patient>(dto);
        patient.PatientCode = await GeneratePatientCodeAsync();
        WarnOnSuspiciousFormats(dto, null, patient.PatientCode);

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();

        return _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto> UpdateAsync(UpdatePatientDto dto)
    {
        var patient = await _context.Patients.FindAsync(dto.Id)
            ?? throw new KeyNotFoundException("Patient not found");
        await ValidatePatientAsync(dto, excludeId: dto.Id, existing: patient);
        WarnOnSuspiciousFormats(dto, patient, patient.PatientCode);

        _mapper.Map(dto, patient);
        await _context.SaveChangesAsync();

        return _mapper.Map<PatientDto>(patient);
    }

    /// <summary>
    /// QA-R4: the patient-master API accepted an empty name, a date of birth in the future (2030 saved
    /// live), a birth year of 1800, and a CCCD already belonging to another patient. Same rules as
    /// reception's ValidateNewPatient plus the CCCD uniqueness check.
    /// </summary>
    /// <param name="existing">The stored row on an edit, null on create. A value the editor did not touch is
    /// accepted even when it is invalid: the database already holds patients with a future date of birth, a
    /// birth year of 1800 and a blank name, and rejecting those would make the very rows that need correcting
    /// uneditable. Only a value the user actually changes has to be valid.</param>
    private async Task ValidatePatientAsync(CreatePatientDto dto, Guid? excludeId, Patient? existing)
    {
        // Blank is refused on create, and on an edit that would erase a name the row already has. A row whose
        // stored name is already blank stays editable so the rest of it can be corrected.
        var erasesStoredName = existing == null || !string.IsNullOrWhiteSpace(existing.FullName);
        if (string.IsNullOrWhiteSpace(dto.FullName) && erasesStoredName)
            throw new ArgumentException("Chưa nhập họ tên bệnh nhân", nameof(dto.FullName));
        var todayVn = HIS.Core.Common.VnTime.TodayVn;
        if (dto.DateOfBirth.HasValue && dto.DateOfBirth.Value.Date > todayVn
            && dto.DateOfBirth.Value.Date != existing?.DateOfBirth?.Date)
            throw new ArgumentException("Ngày sinh không được ở tương lai", nameof(dto.DateOfBirth));
        // QA-R6: the year bound below only covered YearOfBirth — a date of birth of 1800-01-01 or 0001-01-01
        // (age 226 / 2025) was saved.
        if (dto.DateOfBirth.HasValue && dto.DateOfBirth.Value.Year < 1900
            && dto.DateOfBirth.Value.Date != existing?.DateOfBirth?.Date)
            throw new ArgumentException($"Ngày sinh không hợp lệ ({dto.DateOfBirth.Value:dd/MM/yyyy})", nameof(dto.DateOfBirth));
        if (dto.YearOfBirth.HasValue && (dto.YearOfBirth.Value < 1900 || dto.YearOfBirth.Value > todayVn.Year)
            && dto.YearOfBirth != existing?.YearOfBirth)
            throw new ArgumentException($"Năm sinh không hợp lệ ({dto.YearOfBirth.Value})", nameof(dto.YearOfBirth));
        if ((dto.Gender < 0 || dto.Gender > 3) && dto.Gender != existing?.Gender)
            throw new ArgumentException($"Giới tính không hợp lệ ({dto.Gender})", nameof(dto.Gender));
        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
        {
            var digits = dto.PhoneNumber.Count(char.IsDigit);
            if (digits < 9 || digits > 12)
                throw new ArgumentException("Số điện thoại không hợp lệ", nameof(dto.PhoneNumber));
        }
        if (!string.IsNullOrWhiteSpace(dto.IdentityNumber))
        {
            var cccd = dto.IdentityNumber.Trim();
            if (!cccd.All(char.IsDigit) || (cccd.Length != 9 && cccd.Length != 12))
                throw new ArgumentException("CCCD/CMND phải gồm 9 hoặc 12 chữ số", nameof(dto.IdentityNumber));
            var other = await _context.Patients.AsNoTracking()
                .Where(p => !p.IsDeleted && (excludeId == null || p.Id != excludeId.Value))
                .FindByIdentityNumberDecryptedAsync(cccd);
            if (other != null)
                throw new InvalidOperationException(
                    $"Số CCCD/CMND đã thuộc bệnh nhân {other.PatientCode} - {other.FullName}. Tìm và chọn đúng bệnh nhân cũ.");
        }
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
