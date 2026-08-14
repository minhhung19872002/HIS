using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HIS.Application.DTOs.NangCap24;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace HIS.Infrastructure.Services;

public class BhxhInspectorService : IBhxhInspectorService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<BhxhInspectorService> _logger;

    public BhxhInspectorService(HISDbContext db, IConfiguration config, ILogger<BhxhInspectorService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task<InspectorLoginResponseDto> LoginAsync(InspectorLoginDto dto, string ipAddress)
    {
        var account = await _db.BhxhInspectorAccounts
            .FirstOrDefaultAsync(a => a.Username == dto.Username && !a.IsDeleted);

        if (account == null)
            return new InspectorLoginResponseDto { Success = false, Message = "Tài khoản không tồn tại" };

        if (account.LockedUntil.HasValue && account.LockedUntil.Value > DateTime.UtcNow)
            return new InspectorLoginResponseDto { Success = false, Message = "Tài khoản đang bị khóa tạm thời" };

        if (!account.IsActive)
            return new InspectorLoginResponseDto { Success = false, Message = "Tài khoản đã bị vô hiệu hóa" };

        bool valid;
        try { valid = BCrypt.Net.BCrypt.Verify(dto.Password, account.PasswordHash); }
        catch { valid = false; }

        if (!valid)
        {
            account.LoginFailCount++;
            if (account.LoginFailCount >= 5)
            {
                account.LockedUntil = DateTime.UtcNow.AddMinutes(15);
                account.LoginFailCount = 0;
            }
            await _db.SaveChangesAsync();
            return new InspectorLoginResponseDto { Success = false, Message = "Mật khẩu không đúng" };
        }

        account.LastLoginAt = DateTime.UtcNow;
        account.LastLoginIp = ipAddress;
        account.LoginFailCount = 0;
        account.LockedUntil = null;

        var accessLog = new BhxhInspectorAccessLog
        {
            Id = Guid.NewGuid(),
            InspectorAccountId = account.Id,
            Action = "login",
            IpAddress = ipAddress,
            PerformedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _db.BhxhInspectorAccessLogs.Add(accessLog);
        await _db.SaveChangesAsync();

        var token = GenerateInspectorToken(account);

        return new InspectorLoginResponseDto
        {
            Success = true,
            Token = token,
            Message = "Đăng nhập thành công",
            Inspector = MapAccountToDto(account)
        };
    }

    private string GenerateInspectorToken(BhxhInspectorAccount account)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key not configured")));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
            new Claim(ClaimTypes.Name, account.Username),
            new Claim(ClaimTypes.Role, "BhxhInspector"),
            new Claim(JwtClaims.InspectorType, "bhxh"),
            new Claim(JwtClaims.FullName, account.FullName)
        };
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<List<InspectorAccountDto>> ListAccountsAsync()
    {
        var list = await _db.BhxhInspectorAccounts
            .Where(a => !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
        return list.Select(MapAccountToDto).ToList();
    }

    public async Task<InspectorAccountDto> CreateAccountAsync(InspectorCreateDto dto, Guid adminUserId)
    {
        if (await _db.BhxhInspectorAccounts.AnyAsync(a => a.Username == dto.Username && !a.IsDeleted))
            throw new InvalidOperationException("Tên đăng nhập đã tồn tại");

        var account = new BhxhInspectorAccount
        {
            Id = Guid.NewGuid(),
            Username = dto.Username.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            BhxhCode = dto.BhxhCode,
            Province = dto.Province,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = adminUserId.ToString()
        };
        _db.BhxhInspectorAccounts.Add(account);
        await _db.SaveChangesAsync();
        return MapAccountToDto(account);
    }

    public async Task UpdateAccountActiveAsync(Guid id, bool isActive, Guid adminUserId)
    {
        var account = await _db.BhxhInspectorAccounts.FirstOrDefaultAsync(a => a.Id == id);
        if (account == null) return;
        account.IsActive = isActive;
        account.UpdatedAt = DateTime.UtcNow;
        account.UpdatedBy = adminUserId.ToString();
        await _db.SaveChangesAsync();
    }

    public async Task ResetPasswordAsync(Guid id, string newPassword, Guid adminUserId)
    {
        var account = await _db.BhxhInspectorAccounts.FirstOrDefaultAsync(a => a.Id == id);
        if (account == null) return;
        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        account.UpdatedAt = DateTime.UtcNow;
        account.UpdatedBy = adminUserId.ToString();
        await _db.SaveChangesAsync();
    }

    public async Task<InspectorRecordSearchResultDto> SearchRecordsAsync(
        InspectorSearchRecordDto dto, Guid inspectorId, string? ipAddress)
    {
        var q = _db.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .AsQueryable();

        if (dto.FromDate.HasValue)
            q = q.Where(m => m.AdmissionDate >= dto.FromDate.Value);
        if (dto.ToDate.HasValue)
            q = q.Where(m => m.AdmissionDate <= dto.ToDate.Value.AddDays(1));
        if (dto.TreatmentType.HasValue)
            q = q.Where(m => m.TreatmentType == dto.TreatmentType.Value);

        var candidates = await q.AsNoTracking().ToListAsync();
        var filtered = candidates.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim();
            filtered = filtered.Where(m =>
                m.MedicalRecordCode.Contains(kw, StringComparison.OrdinalIgnoreCase)
                || (m.Patient?.FullName?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false)
                || (m.Patient?.InsuranceNumber?.Contains(kw, StringComparison.OrdinalIgnoreCase) ?? false));
        }
        if (!string.IsNullOrWhiteSpace(dto.InsuranceNumber))
        {
            filtered = filtered.Where(m => string.Equals(
                m.Patient?.InsuranceNumber,
                dto.InsuranceNumber.Trim(),
                StringComparison.OrdinalIgnoreCase));
        }

        var filteredList = filtered
            .OrderByDescending(m => m.AdmissionDate)
            .ToList();
        var total = filteredList.Count;
        var items = filteredList
            .Skip((dto.PageIndex - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .Select(m => new InspectorRecordListItemDto
            {
                MedicalRecordId = m.Id,
                MedicalRecordCode = m.MedicalRecordCode,
                PatientName = m.Patient != null ? (m.Patient.FullName ?? "") : "",
                InsuranceNumber = m.Patient != null ? m.Patient.InsuranceNumber : null,
                DepartmentName = m.Department != null ? (m.Department.DepartmentName ?? "") : "",
                AdmissionDate = m.AdmissionDate,
                DischargeDate = m.DischargeDate,
                Diagnosis = m.MainDiagnosis,
                TreatmentType = m.PatientType,
                TreatmentTypeName = m.PatientType == 1 ? "BHYT" :
                                    m.PatientType == 2 ? "Viện phí" :
                                    m.PatientType == 3 ? "Dịch vụ" : "Khám SK",
                TotalAmount = 0,
                HasSignedXml = false
            })
            .ToList();

        // Log audit
        var auditLog = new BhxhInspectorAccessLog
        {
            Id = Guid.NewGuid(),
            InspectorAccountId = inspectorId,
            Action = "search",
            ActionDetails = $"keyword={dto.Keyword} from={dto.FromDate} to={dto.ToDate}",
            IpAddress = ipAddress,
            PerformedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _db.BhxhInspectorAccessLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return new InspectorRecordSearchResultDto
        {
            Items = items,
            TotalCount = total,
            PageIndex = dto.PageIndex,
            PageSize = dto.PageSize
        };
    }

    public async Task<InspectorRecordDetailDto?> GetRecordDetailAsync(
        Guid medicalRecordId, Guid inspectorId, string? ipAddress)
    {
        var record = await _db.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);
        if (record == null) return null;

        var services = await _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest != null && d.ServiceRequest.MedicalRecordId == medicalRecordId)
            .Select(d => new InspectorRecordServiceDto
            {
                ServiceCode = d.Service != null ? (d.Service.ServiceCode ?? "") : "",
                ServiceName = d.Service != null ? (d.Service.ServiceName ?? "") : "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                TotalAmount = d.UnitPrice * d.Quantity,
                Status = d.Status.ToString()
            })
            .ToListAsync();

        var meds = await _db.Prescriptions
            .Where(p => p.MedicalRecordId == medicalRecordId)
            .SelectMany(p => p.Details)
            .Include(i => i.Medicine)
            .Select(i => new InspectorRecordMedicineDto
            {
                MedicineCode = i.Medicine != null ? (i.Medicine.MedicineCode ?? "") : "",
                MedicineName = i.Medicine != null ? (i.Medicine.MedicineName ?? "") : "",
                Concentration = i.Medicine != null ? i.Medicine.Concentration : null,
                Quantity = (int)i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalAmount = i.UnitPrice * i.Quantity
            })
            .ToListAsync();

        var totalServices = services.Sum(s => s.TotalAmount);
        var totalMeds = meds.Sum(m => m.TotalAmount);
        var totalAmount = totalServices + totalMeds;

        var detail = new InspectorRecordDetailDto
        {
            MedicalRecordId = record.Id,
            MedicalRecordCode = record.MedicalRecordCode,
            PatientName = record.Patient?.FullName ?? "",
            PatientDob = record.Patient?.DateOfBirth ?? DateTime.MinValue,
            PatientGender = record.Patient?.Gender == 1 ? "Nam"
                           : record.Patient?.Gender == 2 ? "Nữ" : "Khác",
            Address = record.Patient?.Address,
            InsuranceNumber = record.Patient?.InsuranceNumber,
            DepartmentName = record.Department?.DepartmentName ?? "",
            AdmissionDate = record.AdmissionDate,
            DischargeDate = record.DischargeDate,
            AdmissionDiagnosis = record.InitialDiagnosis,
            FinalDiagnosis = record.MainDiagnosis,
            Services = services,
            Medicines = meds,
            TotalAmount = totalAmount,
            BhytAmount = record.PatientType == 1 ? totalAmount * 0.8m : 0,
            CoPayAmount = record.PatientType == 1 ? totalAmount * 0.2m : totalAmount
        };

        var auditLog = new BhxhInspectorAccessLog
        {
            Id = Guid.NewGuid(),
            InspectorAccountId = inspectorId,
            Action = "view_record",
            MedicalRecordId = medicalRecordId,
            IpAddress = ipAddress,
            PerformedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _db.BhxhInspectorAccessLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return detail;
    }

    public async Task<byte[]?> DownloadSignedXmlAsync(Guid medicalRecordId, Guid inspectorId, string? ipAddress)
    {
        var record = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == medicalRecordId);
        if (record == null) return null;

        // Demo: trả XML đại diện cho HSBA (production có lưu trữ file thật)
        var xml = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<MedicalRecord>
  <RecordCode>{record.MedicalRecordCode}</RecordCode>
  <PatientName>{record.Patient?.FullName ?? string.Empty}</PatientName>
  <AdmissionDate>{record.AdmissionDate:yyyy-MM-dd}</AdmissionDate>
  <DischargeDate>{record.DischargeDate?.ToString("yyyy-MM-dd") ?? string.Empty}</DischargeDate>
  <Diagnosis>{record.MainDiagnosis ?? string.Empty}</Diagnosis>
  <TotalAmount>0</TotalAmount>
  <SignedAt>{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ}</SignedAt>
  <Signature>placeholder-pkcs7-detached-signature</Signature>
</MedicalRecord>";

        var auditLog = new BhxhInspectorAccessLog
        {
            Id = Guid.NewGuid(),
            InspectorAccountId = inspectorId,
            Action = "download_xml",
            MedicalRecordId = medicalRecordId,
            IpAddress = ipAddress,
            PerformedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _db.BhxhInspectorAccessLogs.Add(auditLog);
        await _db.SaveChangesAsync();

        return Encoding.UTF8.GetBytes(xml);
    }

    private static InspectorAccountDto MapAccountToDto(BhxhInspectorAccount a) => new()
    {
        Id = a.Id,
        Username = a.Username,
        FullName = a.FullName,
        Email = a.Email,
        BhxhCode = a.BhxhCode,
        Province = a.Province,
        IsActive = a.IsActive,
        LastLoginAt = a.LastLoginAt
    };
}
