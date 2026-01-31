using Microsoft.EntityFrameworkCore;
using AutoMapper;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

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
        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.IdentityNumber == identityNumber);
        return patient == null ? null : _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto?> GetByInsuranceNumberAsync(string insuranceNumber)
    {
        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.InsuranceNumber == insuranceNumber);
        return patient == null ? null : _mapper.Map<PatientDto>(patient);
    }

    public async Task<PagedResultDto<PatientDto>> SearchAsync(PatientSearchDto dto)
    {
        var query = _context.Patients.AsQueryable();

        if (!string.IsNullOrEmpty(dto.PatientCode))
            query = query.Where(p => p.PatientCode.Contains(dto.PatientCode));

        if (!string.IsNullOrEmpty(dto.IdentityNumber))
            query = query.Where(p => p.IdentityNumber != null && p.IdentityNumber.Contains(dto.IdentityNumber));

        if (!string.IsNullOrEmpty(dto.PhoneNumber))
            query = query.Where(p => p.PhoneNumber != null && p.PhoneNumber.Contains(dto.PhoneNumber));

        if (!string.IsNullOrEmpty(dto.InsuranceNumber))
            query = query.Where(p => p.InsuranceNumber != null && p.InsuranceNumber.Contains(dto.InsuranceNumber));

        if (!string.IsNullOrEmpty(dto.Keyword))
            query = query.Where(p => p.FullName.Contains(dto.Keyword) ||
                                    p.PatientCode.Contains(dto.Keyword) ||
                                    (p.PhoneNumber != null && p.PhoneNumber.Contains(dto.Keyword)));

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((dto.Page - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        return new PagedResultDto<PatientDto>
        {
            Items = _mapper.Map<List<PatientDto>>(items),
            TotalCount = totalCount,
            Page = dto.Page,
            PageSize = dto.PageSize
        };
    }

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
            ?? throw new Exception("Patient not found");

        _mapper.Map(dto, patient);
        await _context.SaveChangesAsync();

        return _mapper.Map<PatientDto>(patient);
    }

    public async Task DeleteAsync(Guid id)
    {
        var patient = await _context.Patients.FindAsync(id)
            ?? throw new Exception("Patient not found");

        patient.IsDeleted = true;
        await _context.SaveChangesAsync();
    }

    public async Task<string> GeneratePatientCodeAsync()
    {
        var year = DateTime.Now.Year.ToString().Substring(2);
        var prefix = $"BN{year}";

        var lastCode = await _context.Patients
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
