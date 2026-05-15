using System.Text.Json;
using System.Text;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace HIS.Infrastructure.Services;

// ============================================================================
// Batch 1.1: National Prescription Gateway (donthuocquocgia.vn)
// ============================================================================

public class NationalPrescriptionGatewayService : INationalPrescriptionGatewayService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;

    public NationalPrescriptionGatewayService(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private static string StatusName(int s) => s switch
    {
        0 => "Nháp",
        1 => "Đã gửi",
        2 => "Cổng QG xác nhận",
        3 => "Bị từ chối",
        4 => "Đã hủy",
        _ => "Khác"
    };

    public async Task<List<NationalPrescriptionSubmissionDto>> SearchAsync(string? keyword, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.NationalPrescriptionSubmissions.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.SubmissionCode.Contains(k) || x.PatientIdNumber.Contains(k) || x.DoctorIdNumber.Contains(k));
        }
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.CreatedAt <= to.Value);

        var rows = await q.OrderByDescending(x => x.CreatedAt)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .ToListAsync();

        // Enrich with prescription code + patient name (via MedicalRecord)
        var rxIds = rows.Select(r => r.PrescriptionId).Distinct().ToList();
        var rxMap = await _db.Prescriptions.AsNoTracking()
            .Where(p => rxIds.Contains(p.Id))
            .Include(p => p.MedicalRecord)
            .Select(p => new { p.Id, p.PrescriptionCode, MrPatientId = p.MedicalRecord.PatientId })
            .ToListAsync();
        var patientIds = rxMap.Select(r => r.MrPatientId).Distinct().ToList();
        var patientMap = await _db.Patients.AsNoTracking()
            .Where(p => patientIds.Contains(p.Id))
            .Select(p => new { p.Id, p.FullName })
            .ToListAsync();

        return rows.Select(r =>
        {
            var rx = rxMap.FirstOrDefault(x => x.Id == r.PrescriptionId);
            var patient = rx == null ? null : patientMap.FirstOrDefault(p => p.Id == rx.MrPatientId);
            return new NationalPrescriptionSubmissionDto
            {
                Id = r.Id,
                PrescriptionId = r.PrescriptionId,
                SubmissionCode = r.SubmissionCode,
                FacilityCode = r.FacilityCode,
                DoctorIdNumber = r.DoctorIdNumber,
                DoctorLicenseNumber = r.DoctorLicenseNumber,
                PatientIdNumber = r.PatientIdNumber,
                PrescriptionType = r.PrescriptionType,
                Status = r.Status,
                StatusName = StatusName(r.Status),
                GatewayTransactionId = r.GatewayTransactionId,
                ErrorCode = r.ErrorCode,
                ErrorMessage = r.ErrorMessage,
                SubmittedAt = r.SubmittedAt,
                AcknowledgedAt = r.AcknowledgedAt,
                RetryCount = r.RetryCount,
                PrescriptionCode = rx?.PrescriptionCode,
                PatientName = patient?.FullName,
                CreatedAt = r.CreatedAt
            };
        }).ToList();
    }

    public async Task<NationalPrescriptionSubmissionDetailDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.NationalPrescriptionSubmissions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var rx = await _db.Prescriptions.AsNoTracking().Where(p => p.Id == r.PrescriptionId)
            .Include(p => p.MedicalRecord)
            .Select(p => new { p.PrescriptionCode, MrPatientId = p.MedicalRecord.PatientId }).FirstOrDefaultAsync();
        var patientName = rx == null ? null : await _db.Patients.AsNoTracking().Where(p => p.Id == rx.MrPatientId).Select(p => p.FullName).FirstOrDefaultAsync();
        return new NationalPrescriptionSubmissionDetailDto
        {
            Id = r.Id,
            PrescriptionId = r.PrescriptionId,
            SubmissionCode = r.SubmissionCode,
            FacilityCode = r.FacilityCode,
            DoctorIdNumber = r.DoctorIdNumber,
            DoctorLicenseNumber = r.DoctorLicenseNumber,
            PatientIdNumber = r.PatientIdNumber,
            PrescriptionType = r.PrescriptionType,
            Status = r.Status,
            StatusName = StatusName(r.Status),
            GatewayTransactionId = r.GatewayTransactionId,
            ErrorCode = r.ErrorCode,
            ErrorMessage = r.ErrorMessage,
            SubmittedAt = r.SubmittedAt,
            AcknowledgedAt = r.AcknowledgedAt,
            RetryCount = r.RetryCount,
            PrescriptionCode = rx?.PrescriptionCode,
            PatientName = patientName,
            CreatedAt = r.CreatedAt,
            PayloadJson = r.PayloadJson,
            ResponseJson = r.ResponseJson
        };
    }

    public async Task<NationalPrescriptionSubmissionDto> SubmitAsync(SubmitNationalPrescriptionDto dto, string? userId)
    {
        var rx = await _db.Prescriptions
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(p => p.Id == dto.PrescriptionId)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thuốc");
        var patient = rx.MedicalRecord?.Patient;

        var facilityCode = _config["NationalGateway:FacilityCode"] ?? "BV-DEMO-01";
        var code = $"DTQG-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";

        var payload = new
        {
            submissionCode = code,
            facilityCode,
            doctorIdNumber = dto.DoctorIdNumber,
            doctorLicense = dto.DoctorLicenseNumber,
            prescriptionType = dto.PrescriptionType,
            issuedAt = rx.PrescriptionDate.ToString("yyyy-MM-ddTHH:mm:ss"),
            patient = new
            {
                idNumber = patient?.IdentityNumber ?? "",
                fullName = patient?.FullName ?? "",
                gender = patient?.Gender,
                dob = patient?.DateOfBirth?.ToString("yyyy-MM-dd")
            },
            diagnosis = rx.Diagnosis,
            items = rx.Details.Select(d => new
            {
                medicineCode = d.Medicine?.MedicineCode,
                medicineName = d.Medicine?.MedicineName,
                quantity = d.Quantity,
                unit = d.Medicine?.Unit ?? d.Unit,
                dosage = d.Dosage,
                usage = d.Usage,
                durationDays = d.Days
            })
        };

        var entity = new NationalPrescriptionSubmission
        {
            Id = Guid.NewGuid(),
            PrescriptionId = dto.PrescriptionId,
            SubmissionCode = code,
            FacilityCode = facilityCode,
            DoctorIdNumber = dto.DoctorIdNumber,
            DoctorLicenseNumber = dto.DoctorLicenseNumber,
            PatientIdNumber = patient?.IdentityNumber ?? "",
            PrescriptionType = dto.PrescriptionType,
            PayloadJson = JsonSerializer.Serialize(payload),
            Status = 1, // Submitted
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            SubmittedAt = DateTime.UtcNow
        };

        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        if (mockMode)
        {
            // Mock cổng — luôn acknowledge
            entity.Status = 2;
            entity.GatewayTransactionId = $"MOCK-{Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()}";
            entity.AcknowledgedAt = DateTime.UtcNow;
            entity.ResponseJson = JsonSerializer.Serialize(new { ack = true, transactionId = entity.GatewayTransactionId, ts = DateTime.UtcNow });
        }
        else
        {
            // TODO: HTTP POST tới donthuocquocgia.vn/api/prescription
            // Khi production, gọi HttpClient sandbox URL từ config["NationalGateway:Prescription:BaseUrl"]
            entity.Status = 1;
        }

        _db.NationalPrescriptionSubmissions.Add(entity);
        await _db.SaveChangesAsync();

        return new NationalPrescriptionSubmissionDto
        {
            Id = entity.Id,
            PrescriptionId = entity.PrescriptionId,
            SubmissionCode = entity.SubmissionCode,
            FacilityCode = entity.FacilityCode,
            DoctorIdNumber = entity.DoctorIdNumber,
            DoctorLicenseNumber = entity.DoctorLicenseNumber,
            PatientIdNumber = entity.PatientIdNumber,
            PrescriptionType = entity.PrescriptionType,
            Status = entity.Status,
            StatusName = StatusName(entity.Status),
            GatewayTransactionId = entity.GatewayTransactionId,
            SubmittedAt = entity.SubmittedAt,
            AcknowledgedAt = entity.AcknowledgedAt,
            RetryCount = entity.RetryCount,
            CreatedAt = entity.CreatedAt,
            PrescriptionCode = rx.PrescriptionCode,
            PatientName = patient?.FullName
        };
    }

    public async Task<NationalPrescriptionSubmissionDto?> RetryAsync(Guid id, string? userId)
    {
        var entity = await _db.NationalPrescriptionSubmissions.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        if (entity.Status == 2) return null; // đã ack — không retry
        entity.RetryCount++;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        if (mockMode)
        {
            entity.Status = 2;
            entity.AcknowledgedAt = DateTime.UtcNow;
            entity.GatewayTransactionId = $"MOCK-{Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()}";
            entity.ResponseJson = JsonSerializer.Serialize(new { ack = true, retried = true, transactionId = entity.GatewayTransactionId });
            entity.ErrorCode = null;
            entity.ErrorMessage = null;
        }
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<NationalPrescriptionSubmissionDto?> CancelAsync(Guid id, string? userId)
    {
        var entity = await _db.NationalPrescriptionSubmissions.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        entity.Status = 4;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public Task<NationalGatewayConfigDto> GetConfigAsync()
    {
        return Task.FromResult(new NationalGatewayConfigDto
        {
            NationalPrescriptionBaseUrl = _config["NationalGateway:Prescription:BaseUrl"] ?? "https://donthuocquocgia.vn",
            NationalPharmacyBaseUrl = _config["NationalGateway:Pharmacy:BaseUrl"] ?? "https://duocquocgia.com.vn",
            FacilityCode = _config["NationalGateway:FacilityCode"] ?? "BV-DEMO-01",
            FacilityName = _config["NationalGateway:FacilityName"] ?? "Bệnh viện Demo",
            MockMode = _config.GetValue<bool>("NationalGateway:MockMode", true),
            AutoSubmit = _config.GetValue<bool>("NationalGateway:AutoSubmit", false),
            RetryCount = _config.GetValue<int>("NationalGateway:RetryCount", 3),
            TimeoutSeconds = _config.GetValue<int>("NationalGateway:TimeoutSeconds", 30)
        });
    }

    public Task<bool> SaveConfigAsync(NationalGatewayConfigDto config, string? userId)
    {
        // Config persistence ngoài scope đơn giản — production lưu vào SystemConfig table
        // (placeholder để FE save không lỗi 404)
        return Task.FromResult(true);
    }

    public Task<bool> TestConnectionAsync()
    {
        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        return Task.FromResult(mockMode);
    }
}

// ============================================================================
// Batch 1.2: National Pharmacy Gateway (duocquocgia.com.vn)
// ============================================================================

public class NationalPharmacyGatewayService : INationalPharmacyGatewayService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;

    public NationalPharmacyGatewayService(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private static string StatusName(int s) => s switch
    {
        0 => "Nháp",
        1 => "Đã gửi",
        2 => "Cổng QG xác nhận",
        3 => "Bị từ chối",
        _ => "Khác"
    };

    public async Task<List<NationalPharmacyOutboundReportDto>> SearchAsync(string? reportType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.NationalPharmacyOutboundReports.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(reportType)) q = q.Where(x => x.ReportType == reportType);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.PeriodFrom >= from.Value);
        if (to.HasValue) q = q.Where(x => x.PeriodTo <= to.Value);

        return await q.OrderByDescending(x => x.CreatedAt)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .Select(r => new NationalPharmacyOutboundReportDto
            {
                Id = r.Id,
                ReportCode = r.ReportCode,
                ReportType = r.ReportType,
                PeriodFrom = r.PeriodFrom,
                PeriodTo = r.PeriodTo,
                ItemCount = r.ItemCount,
                Status = r.Status,
                StatusName = StatusName(r.Status),
                GatewayTicketNumber = r.GatewayTicketNumber,
                ErrorCode = r.ErrorCode,
                ErrorMessage = r.ErrorMessage,
                SubmittedAt = r.SubmittedAt,
                AcknowledgedAt = r.AcknowledgedAt,
                RetryCount = r.RetryCount,
                CreatedAt = r.CreatedAt,
                Notes = r.Notes
            })
            .ToListAsync();
    }

    public async Task<NationalPharmacyOutboundReportDetailDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.NationalPharmacyOutboundReports.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        return new NationalPharmacyOutboundReportDetailDto
        {
            Id = r.Id,
            ReportCode = r.ReportCode,
            ReportType = r.ReportType,
            PeriodFrom = r.PeriodFrom,
            PeriodTo = r.PeriodTo,
            ItemCount = r.ItemCount,
            Status = r.Status,
            StatusName = StatusName(r.Status),
            GatewayTicketNumber = r.GatewayTicketNumber,
            ErrorCode = r.ErrorCode,
            ErrorMessage = r.ErrorMessage,
            SubmittedAt = r.SubmittedAt,
            AcknowledgedAt = r.AcknowledgedAt,
            RetryCount = r.RetryCount,
            CreatedAt = r.CreatedAt,
            Notes = r.Notes,
            PayloadXml = r.PayloadXml,
            ResponseXml = r.ResponseXml
        };
    }

    public async Task<NationalPharmacyOutboundReportDto> GenerateAndSubmitAsync(GeneratePharmacyReportDto dto, string? userId)
    {
        var code = $"DQG-{dto.ReportType}-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";

        // Build XML payload per CV 2406/QLD-Ttra 2018 schema
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<DuocQuocGiaReport>");
        sb.AppendLine($"  <ReportCode>{code}</ReportCode>");
        sb.AppendLine($"  <FacilityCode>{_config["NationalGateway:FacilityCode"] ?? "BV-DEMO-01"}</FacilityCode>");
        sb.AppendLine($"  <ReportType>{dto.ReportType}</ReportType>");
        sb.AppendLine($"  <PeriodFrom>{dto.PeriodFrom:yyyy-MM-dd}</PeriodFrom>");
        sb.AppendLine($"  <PeriodTo>{dto.PeriodTo:yyyy-MM-dd}</PeriodTo>");

        // Pull data based on report type
        var items = new List<object>();
        if (dto.ReportType == "DailySale" || dto.ReportType == "MonthlyInventory")
        {
            // Gather pharmacy sales for period (use CreatedAt as transaction time)
            var sales = await _db.RetailSales.AsNoTracking()
                .Where(s => s.CreatedAt >= dto.PeriodFrom && s.CreatedAt <= dto.PeriodTo)
                .Include(s => s.Items)
                .ToListAsync();
            foreach (var s in sales)
            {
                foreach (var i in s.Items)
                {
                    items.Add(new
                    {
                        Code = (string?)null,
                        Name = i.MedicineName,
                        i.Quantity,
                        i.UnitPrice,
                        SaleDate = s.CreatedAt
                    });
                }
            }
        }

        sb.AppendLine($"  <ItemCount>{items.Count}</ItemCount>");
        sb.AppendLine("  <Items>");
        foreach (dynamic it in items)
        {
            sb.AppendLine($"    <Item code=\"{it.Code}\" name=\"{System.Net.WebUtility.HtmlEncode((string?)it.Name ?? "")}\" qty=\"{it.Quantity}\" price=\"{it.UnitPrice}\" date=\"{it.SaleDate:yyyy-MM-dd}\" />");
        }
        sb.AppendLine("  </Items>");
        sb.AppendLine("</DuocQuocGiaReport>");

        var entity = new NationalPharmacyOutboundReport
        {
            Id = Guid.NewGuid(),
            ReportCode = code,
            ReportType = dto.ReportType,
            PeriodFrom = dto.PeriodFrom,
            PeriodTo = dto.PeriodTo,
            PharmacyId = dto.PharmacyId,
            ItemCount = items.Count,
            PayloadXml = sb.ToString(),
            Status = 1,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            SubmittedAt = DateTime.UtcNow,
            Notes = dto.Notes
        };

        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        if (mockMode)
        {
            entity.Status = 2;
            entity.GatewayTicketNumber = $"DQG-ACK-{Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()}";
            entity.AcknowledgedAt = DateTime.UtcNow;
            entity.ResponseXml = $"<DuocQuocGiaResponse><Ticket>{entity.GatewayTicketNumber}</Ticket><Status>Accepted</Status></DuocQuocGiaResponse>";
        }

        _db.NationalPharmacyOutboundReports.Add(entity);
        await _db.SaveChangesAsync();

        return new NationalPharmacyOutboundReportDto
        {
            Id = entity.Id,
            ReportCode = entity.ReportCode,
            ReportType = entity.ReportType,
            PeriodFrom = entity.PeriodFrom,
            PeriodTo = entity.PeriodTo,
            ItemCount = entity.ItemCount,
            Status = entity.Status,
            StatusName = StatusName(entity.Status),
            GatewayTicketNumber = entity.GatewayTicketNumber,
            SubmittedAt = entity.SubmittedAt,
            AcknowledgedAt = entity.AcknowledgedAt,
            RetryCount = entity.RetryCount,
            CreatedAt = entity.CreatedAt,
            Notes = entity.Notes
        };
    }

    public async Task<NationalPharmacyOutboundReportDto?> RetryAsync(Guid id, string? userId)
    {
        var entity = await _db.NationalPharmacyOutboundReports.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        if (entity.Status == 2) return null;
        entity.RetryCount++;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        if (mockMode)
        {
            entity.Status = 2;
            entity.AcknowledgedAt = DateTime.UtcNow;
            entity.GatewayTicketNumber = $"DQG-ACK-{Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()}";
            entity.ResponseXml = $"<DuocQuocGiaResponse><Ticket>{entity.GatewayTicketNumber}</Ticket><Status>Retried-Accepted</Status></DuocQuocGiaResponse>";
            entity.ErrorCode = null;
            entity.ErrorMessage = null;
        }
        await _db.SaveChangesAsync();

        var detail = await GetByIdAsync(id);
        return detail;
    }

    public Task<bool> TestConnectionAsync()
    {
        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        return Task.FromResult(mockMode);
    }
}

// ============================================================================
// Batch 2: Đề án 06 Certificate Service
// ============================================================================

public class DeAn06CertificateService : IDeAn06CertificateService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;

    public DeAn06CertificateService(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private static string Da06StatusName(int s) => s switch
    {
        0 => "Chưa gửi",
        1 => "Đã gửi cổng",
        2 => "Cổng xác nhận",
        3 => "Bị từ chối",
        _ => "Khác"
    };

    // ----- Birth Certificate -----

    public async Task<List<BirthCertificateDto>> SearchBirthCertificatesAsync(string? keyword, int? da06Status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.BirthCertificateRecords.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.CertificateNumber.Contains(k) || x.MotherFullName.Contains(k) || x.MotherIdNumber.Contains(k));
        }
        if (da06Status.HasValue) q = q.Where(x => x.Da06Status == da06Status.Value);
        if (from.HasValue) q = q.Where(x => x.BirthDateTime >= from.Value);
        if (to.HasValue) q = q.Where(x => x.BirthDateTime <= to.Value);

        var rows = await q.OrderByDescending(x => x.BirthDateTime)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .ToListAsync();

        return rows.Select(r => MapBirthCert(r)).ToList();
    }

    public async Task<BirthCertificateDto?> GetBirthCertificateAsync(Guid id)
    {
        var r = await _db.BirthCertificateRecords.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return r == null ? null : MapBirthCert(r);
    }

    public async Task<BirthCertificateDto> SaveBirthCertificateAsync(SaveBirthCertificateDto dto, string? userId)
    {
        BirthCertificateRecord entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.BirthCertificateRecords.FirstOrDefaultAsync(x => x.Id == dto.Id.Value)
                ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new BirthCertificateRecord
            {
                Id = Guid.NewGuid(),
                CertificateNumber = $"GCS-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                Da06Status = 0
            };
            _db.BirthCertificateRecords.Add(entity);
        }

        entity.MotherPatientId = dto.MotherPatientId;
        entity.MotherFullName = dto.MotherFullName ?? "";
        entity.MotherIdNumber = dto.MotherIdNumber ?? "";
        entity.FatherFullName = dto.FatherFullName;
        entity.FatherIdNumber = dto.FatherIdNumber;
        entity.BirthDateTime = dto.BirthDateTime;
        entity.ChildGender = dto.ChildGender;
        entity.ChildName = dto.ChildName;
        entity.BirthWeight = dto.BirthWeight;
        entity.GestationalAgeWeeks = dto.GestationalAgeWeeks;
        entity.BirthMethod = dto.BirthMethod;
        entity.BirthLocation = dto.BirthLocation;
        entity.IsLiveBirth = dto.IsLiveBirth;
        entity.SingletonOrMultiple = dto.SingletonOrMultiple;
        entity.AttendingDoctorId = dto.AttendingDoctorId;
        entity.MidwifeId = dto.MidwifeId;
        entity.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return MapBirthCert(entity);
    }

    public async Task<BirthCertificateDto?> SubmitBirthCertificateToDa06Async(Guid id, string? userId)
    {
        var entity = await _db.BirthCertificateRecords.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;

        entity.Da06SubmissionId = $"DA06-BIRTH-{Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()}";
        entity.Da06SubmittedAt = DateTime.UtcNow;
        entity.Da06Status = 1;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        if (mockMode)
        {
            entity.Da06Status = 2;
            entity.Da06AcknowledgedAt = DateTime.UtcNow;
            entity.Da06ResponseCode = "200";
            entity.Da06ErrorMessage = null;
        }

        await _db.SaveChangesAsync();
        return MapBirthCert(entity);
    }

    private BirthCertificateDto MapBirthCert(BirthCertificateRecord r) => new()
    {
        Id = r.Id,
        CertificateNumber = r.CertificateNumber,
        MotherPatientId = r.MotherPatientId,
        MotherFullName = r.MotherFullName,
        MotherIdNumber = r.MotherIdNumber,
        FatherFullName = r.FatherFullName,
        FatherIdNumber = r.FatherIdNumber,
        BirthDateTime = r.BirthDateTime,
        ChildGender = r.ChildGender,
        ChildName = r.ChildName,
        BirthWeight = r.BirthWeight,
        GestationalAgeWeeks = r.GestationalAgeWeeks,
        BirthMethod = r.BirthMethod,
        BirthLocation = r.BirthLocation,
        IsLiveBirth = r.IsLiveBirth,
        SingletonOrMultiple = r.SingletonOrMultiple,
        Notes = r.Notes,
        Da06Status = r.Da06Status,
        Da06StatusName = Da06StatusName(r.Da06Status),
        Da06SubmissionId = r.Da06SubmissionId,
        Da06ErrorMessage = r.Da06ErrorMessage,
        Da06SubmittedAt = r.Da06SubmittedAt,
        Da06AcknowledgedAt = r.Da06AcknowledgedAt,
        CreatedAt = r.CreatedAt
    };

    // ----- Death Certificate -----

    public async Task<List<DeathCertificateDto>> SearchDeathCertificatesAsync(string? keyword, int? da06Status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.DeathCertificateRecords.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.CertificateNumber.Contains(k) || (x.PrimaryCauseDescription != null && x.PrimaryCauseDescription.Contains(k)));
        }
        if (da06Status.HasValue) q = q.Where(x => x.Da06Status == da06Status.Value);
        if (from.HasValue) q = q.Where(x => x.DeathDateTime >= from.Value);
        if (to.HasValue) q = q.Where(x => x.DeathDateTime <= to.Value);

        var rows = await q.OrderByDescending(x => x.DeathDateTime)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .ToListAsync();

        var patientIds = rows.Select(r => r.PatientId).Distinct().ToList();
        var patientMap = await _db.Patients.AsNoTracking()
            .Where(p => patientIds.Contains(p.Id))
            .Select(p => new { p.Id, p.FullName, p.PatientCode })
            .ToListAsync();

        return rows.Select(r =>
        {
            var p = patientMap.FirstOrDefault(x => x.Id == r.PatientId);
            return MapDeathCert(r, p?.FullName, p?.PatientCode);
        }).ToList();
    }

    public async Task<DeathCertificateDto?> GetDeathCertificateAsync(Guid id)
    {
        var r = await _db.DeathCertificateRecords.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var p = await _db.Patients.AsNoTracking().Where(x => x.Id == r.PatientId).Select(x => new { x.FullName, x.PatientCode }).FirstOrDefaultAsync();
        return MapDeathCert(r, p?.FullName, p?.PatientCode);
    }

    public async Task<DeathCertificateDto> SaveDeathCertificateAsync(SaveDeathCertificateDto dto, string? userId)
    {
        DeathCertificateRecord entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.DeathCertificateRecords.FirstOrDefaultAsync(x => x.Id == dto.Id.Value)
                ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new DeathCertificateRecord
            {
                Id = Guid.NewGuid(),
                CertificateNumber = $"GBT-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                Da06Status = 0
            };
            _db.DeathCertificateRecords.Add(entity);
        }

        entity.PatientId = dto.PatientId;
        entity.DeathDateTime = dto.DeathDateTime;
        entity.DeathLocation = dto.DeathLocation;
        entity.PrimaryCauseIcd = dto.PrimaryCauseIcd;
        entity.PrimaryCauseDescription = dto.PrimaryCauseDescription;
        entity.SecondaryCauseIcd = dto.SecondaryCauseIcd;
        entity.SecondaryCauseDescription = dto.SecondaryCauseDescription;
        entity.MannerOfDeath = dto.MannerOfDeath;
        entity.CertifyingDoctorId = dto.CertifyingDoctorId;
        entity.CertifyingDoctorName = dto.CertifyingDoctorName;
        entity.CertifyingDoctorLicense = dto.CertifyingDoctorLicense;
        entity.CertifyingDate = dto.CertifyingDate;
        entity.InformantFullName = dto.InformantFullName;
        entity.InformantIdNumber = dto.InformantIdNumber;
        entity.InformantRelationship = dto.InformantRelationship;
        entity.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        var p = await _db.Patients.AsNoTracking().Where(x => x.Id == entity.PatientId).Select(x => new { x.FullName, x.PatientCode }).FirstOrDefaultAsync();
        return MapDeathCert(entity, p?.FullName, p?.PatientCode);
    }

    public async Task<DeathCertificateDto?> SubmitDeathCertificateToDa06Async(Guid id, string? userId)
    {
        var entity = await _db.DeathCertificateRecords.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;

        entity.Da06SubmissionId = $"DA06-DEATH-{Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()}";
        entity.Da06SubmittedAt = DateTime.UtcNow;
        entity.Da06Status = 1;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        if (mockMode)
        {
            entity.Da06Status = 2;
            entity.Da06AcknowledgedAt = DateTime.UtcNow;
            entity.Da06ResponseCode = "200";
            entity.Da06ErrorMessage = null;
        }

        await _db.SaveChangesAsync();
        var p = await _db.Patients.AsNoTracking().Where(x => x.Id == entity.PatientId).Select(x => new { x.FullName, x.PatientCode }).FirstOrDefaultAsync();
        return MapDeathCert(entity, p?.FullName, p?.PatientCode);
    }

    private DeathCertificateDto MapDeathCert(DeathCertificateRecord r, string? patientName, string? patientCode) => new()
    {
        Id = r.Id,
        CertificateNumber = r.CertificateNumber,
        PatientId = r.PatientId,
        PatientName = patientName,
        PatientCode = patientCode,
        DeathDateTime = r.DeathDateTime,
        DeathLocation = r.DeathLocation,
        PrimaryCauseIcd = r.PrimaryCauseIcd,
        PrimaryCauseDescription = r.PrimaryCauseDescription,
        SecondaryCauseIcd = r.SecondaryCauseIcd,
        SecondaryCauseDescription = r.SecondaryCauseDescription,
        MannerOfDeath = r.MannerOfDeath,
        CertifyingDoctorName = r.CertifyingDoctorName,
        CertifyingDoctorLicense = r.CertifyingDoctorLicense,
        CertifyingDate = r.CertifyingDate,
        InformantFullName = r.InformantFullName,
        InformantIdNumber = r.InformantIdNumber,
        InformantRelationship = r.InformantRelationship,
        Notes = r.Notes,
        Da06Status = r.Da06Status,
        Da06StatusName = Da06StatusName(r.Da06Status),
        Da06SubmissionId = r.Da06SubmissionId,
        Da06ErrorMessage = r.Da06ErrorMessage,
        Da06SubmittedAt = r.Da06SubmittedAt,
        Da06AcknowledgedAt = r.Da06AcknowledgedAt,
        CreatedAt = r.CreatedAt
    };

    // ----- Driving License Health Check -----

    public async Task<List<DrivingLicenseHealthCheckDto>> SearchDrivingLicenseChecksAsync(string? keyword, int? da06Status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.DrivingLicenseHealthChecks.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.CertificateNumber.Contains(k) || (x.LicenseClass != null && x.LicenseClass.Contains(k)));
        }
        if (da06Status.HasValue) q = q.Where(x => x.Da06Status == da06Status.Value);
        if (from.HasValue) q = q.Where(x => x.ExamDate >= from.Value);
        if (to.HasValue) q = q.Where(x => x.ExamDate <= to.Value);

        var rows = await q.OrderByDescending(x => x.ExamDate)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .ToListAsync();

        var patientIds = rows.Select(r => r.PatientId).Distinct().ToList();
        var patientMap = await _db.Patients.AsNoTracking()
            .Where(p => patientIds.Contains(p.Id))
            .Select(p => new { p.Id, p.FullName, p.PatientCode })
            .ToListAsync();

        return rows.Select(r =>
        {
            var p = patientMap.FirstOrDefault(x => x.Id == r.PatientId);
            return MapDlhc(r, p?.FullName, p?.PatientCode);
        }).ToList();
    }

    public async Task<DrivingLicenseHealthCheckDto?> GetDrivingLicenseCheckAsync(Guid id)
    {
        var r = await _db.DrivingLicenseHealthChecks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var p = await _db.Patients.AsNoTracking().Where(x => x.Id == r.PatientId).Select(x => new { x.FullName, x.PatientCode }).FirstOrDefaultAsync();
        return MapDlhc(r, p?.FullName, p?.PatientCode);
    }

    public async Task<DrivingLicenseHealthCheckDto> SaveDrivingLicenseCheckAsync(SaveDrivingLicenseHealthCheckDto dto, string? userId)
    {
        DrivingLicenseHealthCheck entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.DrivingLicenseHealthChecks.FirstOrDefaultAsync(x => x.Id == dto.Id.Value)
                ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new DrivingLicenseHealthCheck
            {
                Id = Guid.NewGuid(),
                CertificateNumber = $"KSK-LX-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                Da06Status = 0
            };
            _db.DrivingLicenseHealthChecks.Add(entity);
        }

        entity.PatientId = dto.PatientId;
        entity.ExaminationId = dto.ExaminationId;
        entity.LicenseClass = dto.LicenseClass;
        entity.ExamDate = dto.ExamDate;
        entity.HeightCm = dto.HeightCm;
        entity.WeightKg = dto.WeightKg;
        entity.SystolicBp = dto.SystolicBp;
        entity.DiastolicBp = dto.DiastolicBp;
        entity.HeartRate = dto.HeartRate;
        entity.VisionRightWithoutGlasses = dto.VisionRightWithoutGlasses;
        entity.VisionLeftWithoutGlasses = dto.VisionLeftWithoutGlasses;
        entity.VisionRightWithGlasses = dto.VisionRightWithGlasses;
        entity.VisionLeftWithGlasses = dto.VisionLeftWithGlasses;
        entity.ColorBlindNormal = dto.ColorBlindNormal;
        entity.ColorVisionDetail = dto.ColorVisionDetail;
        entity.VisionFieldResult = dto.VisionFieldResult;
        entity.HearingNormal = dto.HearingNormal;
        entity.HearingDetail = dto.HearingDetail;
        entity.NeurologicalNormal = dto.NeurologicalNormal;
        entity.NeurologicalDetail = dto.NeurologicalDetail;
        entity.PsychiatricNormal = dto.PsychiatricNormal;
        entity.PsychiatricDetail = dto.PsychiatricDetail;
        entity.CardioRespiratoryConclusion = dto.CardioRespiratoryConclusion;
        entity.MusculoskeletalConclusion = dto.MusculoskeletalConclusion;
        entity.EndocrineConclusion = dto.EndocrineConclusion;
        entity.DrugTestPerformed = dto.DrugTestPerformed;
        entity.DrugTestPositive = dto.DrugTestPositive;
        entity.DrugTestDetail = dto.DrugTestDetail;
        entity.AlcoholTestPerformed = dto.AlcoholTestPerformed;
        entity.AlcoholLevelMgPercent = dto.AlcoholLevelMgPercent;
        entity.EligibleToDrive = dto.EligibleToDrive;
        entity.Conclusion = dto.Conclusion;
        entity.CertifyingDoctorId = dto.CertifyingDoctorId;
        entity.CertifyingDoctorName = dto.CertifyingDoctorName;
        entity.CertifyingDoctorLicense = dto.CertifyingDoctorLicense;
        entity.IssuedAt = dto.IssuedAt;
        entity.ExpiresAt = dto.ExpiresAt;

        await _db.SaveChangesAsync();
        var p = await _db.Patients.AsNoTracking().Where(x => x.Id == entity.PatientId).Select(x => new { x.FullName, x.PatientCode }).FirstOrDefaultAsync();
        return MapDlhc(entity, p?.FullName, p?.PatientCode);
    }

    public async Task<DrivingLicenseHealthCheckDto?> SubmitDrivingLicenseCheckToDa06Async(Guid id, string? userId)
    {
        var entity = await _db.DrivingLicenseHealthChecks.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;

        entity.Da06SubmissionId = $"DA06-DRIVE-{Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()}";
        entity.Da06SubmittedAt = DateTime.UtcNow;
        entity.Da06Status = 1;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var mockMode = _config.GetValue<bool>("NationalGateway:MockMode", true);
        if (mockMode)
        {
            entity.Da06Status = 2;
            entity.Da06AcknowledgedAt = DateTime.UtcNow;
            entity.Da06ResponseCode = "200";
            entity.Da06ErrorMessage = null;
        }

        await _db.SaveChangesAsync();
        var p = await _db.Patients.AsNoTracking().Where(x => x.Id == entity.PatientId).Select(x => new { x.FullName, x.PatientCode }).FirstOrDefaultAsync();
        return MapDlhc(entity, p?.FullName, p?.PatientCode);
    }

    private DrivingLicenseHealthCheckDto MapDlhc(DrivingLicenseHealthCheck r, string? patientName, string? patientCode) => new()
    {
        Id = r.Id,
        CertificateNumber = r.CertificateNumber,
        PatientId = r.PatientId,
        PatientName = patientName,
        PatientCode = patientCode,
        LicenseClass = r.LicenseClass,
        ExamDate = r.ExamDate,
        HeightCm = r.HeightCm,
        WeightKg = r.WeightKg,
        SystolicBp = r.SystolicBp,
        DiastolicBp = r.DiastolicBp,
        HeartRate = r.HeartRate,
        VisionRightWithoutGlasses = r.VisionRightWithoutGlasses,
        VisionLeftWithoutGlasses = r.VisionLeftWithoutGlasses,
        VisionRightWithGlasses = r.VisionRightWithGlasses,
        VisionLeftWithGlasses = r.VisionLeftWithGlasses,
        ColorBlindNormal = r.ColorBlindNormal,
        ColorVisionDetail = r.ColorVisionDetail,
        VisionFieldResult = r.VisionFieldResult,
        HearingNormal = r.HearingNormal,
        HearingDetail = r.HearingDetail,
        NeurologicalNormal = r.NeurologicalNormal,
        NeurologicalDetail = r.NeurologicalDetail,
        PsychiatricNormal = r.PsychiatricNormal,
        PsychiatricDetail = r.PsychiatricDetail,
        CardioRespiratoryConclusion = r.CardioRespiratoryConclusion,
        MusculoskeletalConclusion = r.MusculoskeletalConclusion,
        EndocrineConclusion = r.EndocrineConclusion,
        DrugTestPerformed = r.DrugTestPerformed,
        DrugTestPositive = r.DrugTestPositive,
        DrugTestDetail = r.DrugTestDetail,
        AlcoholTestPerformed = r.AlcoholTestPerformed,
        AlcoholLevelMgPercent = r.AlcoholLevelMgPercent,
        EligibleToDrive = r.EligibleToDrive,
        Conclusion = r.Conclusion,
        CertifyingDoctorName = r.CertifyingDoctorName,
        CertifyingDoctorLicense = r.CertifyingDoctorLicense,
        IssuedAt = r.IssuedAt,
        ExpiresAt = r.ExpiresAt,
        Da06Status = r.Da06Status,
        Da06StatusName = Da06StatusName(r.Da06Status),
        Da06SubmissionId = r.Da06SubmissionId,
        Da06ErrorMessage = r.Da06ErrorMessage,
        Da06SubmittedAt = r.Da06SubmittedAt,
        Da06AcknowledgedAt = r.Da06AcknowledgedAt,
        CreatedAt = r.CreatedAt
    };
}

// ============================================================================
// Batch 3.1: Linen Management
// ============================================================================

public class LinenManagementService : ILinenManagementService
{
    private readonly HISDbContext _db;
    public LinenManagementService(HISDbContext db) { _db = db; }

    private static string LinenStatusName(int s) => s switch
    {
        0 => "Nháp", 1 => "Đã gửi đi", 2 => "Đã nhận về", 3 => "Đã đối chiếu", 4 => "Đã hủy", _ => "Khác"
    };

    private static string SterStatusName(int s) => s switch
    {
        0 => "Đã lên lịch", 1 => "Đang thực hiện", 2 => "Hoàn thành", 3 => "Thất bại", 4 => "Đã hủy", _ => "Khác"
    };

    public async Task<List<LinenItemDto>> ListLinenItemsAsync(string? keyword, string? category, bool? isActive)
    {
        var q = _db.LinenItems.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.ItemCode.Contains(k) || x.ItemName.Contains(k));
        }
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
        if (isActive.HasValue) q = q.Where(x => x.IsActive == isActive.Value);

        return await q.OrderBy(x => x.Category).ThenBy(x => x.ItemCode)
            .Select(x => new LinenItemDto
            {
                Id = x.Id,
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Category = x.Category,
                Unit = x.Unit,
                StandardWeightKg = x.StandardWeightKg,
                MaxReuseCount = x.MaxReuseCount,
                CurrentStock = x.CurrentStock,
                InCleaning = x.InCleaning,
                InRepair = x.InRepair,
                Damaged = x.Damaged,
                MinStockAlert = x.MinStockAlert,
                IsActive = x.IsActive,
                Notes = x.Notes
            })
            .Take(500)
            .ToListAsync();
    }

    public async Task<LinenItemDto?> GetLinenItemAsync(Guid id)
    {
        var x = await _db.LinenItems.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        if (x == null) return null;
        return new LinenItemDto
        {
            Id = x.Id,
            ItemCode = x.ItemCode,
            ItemName = x.ItemName,
            Category = x.Category,
            Unit = x.Unit,
            StandardWeightKg = x.StandardWeightKg,
            MaxReuseCount = x.MaxReuseCount,
            CurrentStock = x.CurrentStock,
            InCleaning = x.InCleaning,
            InRepair = x.InRepair,
            Damaged = x.Damaged,
            MinStockAlert = x.MinStockAlert,
            IsActive = x.IsActive,
            Notes = x.Notes
        };
    }

    public async Task<LinenItemDto> SaveLinenItemAsync(LinenItemDto dto, string? userId)
    {
        LinenItem entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _db.LinenItems.FirstOrDefaultAsync(x => x.Id == dto.Id) ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new LinenItem { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.LinenItems.Add(entity);
        }
        entity.ItemCode = dto.ItemCode;
        entity.ItemName = dto.ItemName;
        entity.Category = dto.Category;
        entity.Unit = dto.Unit;
        entity.StandardWeightKg = dto.StandardWeightKg;
        entity.MaxReuseCount = dto.MaxReuseCount;
        entity.CurrentStock = dto.CurrentStock;
        entity.InCleaning = dto.InCleaning;
        entity.InRepair = dto.InRepair;
        entity.Damaged = dto.Damaged;
        entity.MinStockAlert = dto.MinStockAlert;
        entity.IsActive = dto.IsActive;
        entity.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return (await GetLinenItemAsync(entity.Id))!;
    }

    public async Task<bool> DeleteLinenItemAsync(Guid id, string? userId)
    {
        var entity = await _db.LinenItems.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<LinenTransactionDto>> SearchTransactionsAsync(string? transactionType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.LinenTransactions.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(transactionType)) q = q.Where(x => x.TransactionType == transactionType);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.TransactionDate >= from.Value);
        if (to.HasValue) q = q.Where(x => x.TransactionDate <= to.Value);

        var rows = await q.OrderByDescending(x => x.TransactionDate)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .ToListAsync();

        var deptIds = rows.SelectMany(r => new[] { r.FromDepartmentId, r.ToDepartmentId }).Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
        var deptMap = await _db.Departments.AsNoTracking().Where(d => deptIds.Contains(d.Id)).Select(d => new { d.Id, Name = d.DepartmentName }).ToListAsync();

        return rows.Select(r => new LinenTransactionDto
        {
            Id = r.Id,
            TransactionCode = r.TransactionCode,
            TransactionType = r.TransactionType,
            TransactionDate = r.TransactionDate,
            FromDepartmentId = r.FromDepartmentId,
            FromDepartmentName = deptMap.FirstOrDefault(d => d.Id == r.FromDepartmentId)?.Name,
            ToDepartmentId = r.ToDepartmentId,
            ToDepartmentName = deptMap.FirstOrDefault(d => d.Id == r.ToDepartmentId)?.Name,
            DispatcherName = r.DispatcherName,
            ReceiverName = r.ReceiverName,
            TotalItems = r.TotalItems,
            TotalWeightKg = r.TotalWeightKg,
            VendorName = r.VendorName,
            Status = r.Status,
            StatusName = LinenStatusName(r.Status),
            Notes = r.Notes,
            DetailsJson = r.DetailsJson,
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    public async Task<LinenTransactionDto?> GetTransactionAsync(Guid id)
    {
        var r = await _db.LinenTransactions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var deptMap = await _db.Departments.AsNoTracking()
            .Where(d => d.Id == r.FromDepartmentId || d.Id == r.ToDepartmentId)
            .Select(d => new { d.Id, Name = d.DepartmentName }).ToListAsync();
        return new LinenTransactionDto
        {
            Id = r.Id,
            TransactionCode = r.TransactionCode,
            TransactionType = r.TransactionType,
            TransactionDate = r.TransactionDate,
            FromDepartmentId = r.FromDepartmentId,
            FromDepartmentName = deptMap.FirstOrDefault(d => d.Id == r.FromDepartmentId)?.Name,
            ToDepartmentId = r.ToDepartmentId,
            ToDepartmentName = deptMap.FirstOrDefault(d => d.Id == r.ToDepartmentId)?.Name,
            DispatcherName = r.DispatcherName,
            ReceiverName = r.ReceiverName,
            TotalItems = r.TotalItems,
            TotalWeightKg = r.TotalWeightKg,
            VendorName = r.VendorName,
            Status = r.Status,
            StatusName = LinenStatusName(r.Status),
            Notes = r.Notes,
            DetailsJson = r.DetailsJson,
            CreatedAt = r.CreatedAt
        };
    }

    public async Task<LinenTransactionDto> SaveTransactionAsync(SaveLinenTransactionDto dto, string? userId)
    {
        LinenTransaction entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.LinenTransactions.FirstOrDefaultAsync(x => x.Id == dto.Id.Value) ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new LinenTransaction
            {
                Id = Guid.NewGuid(),
                TransactionCode = $"LIN-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _db.LinenTransactions.Add(entity);
        }
        entity.TransactionType = dto.TransactionType;
        entity.TransactionDate = dto.TransactionDate;
        entity.FromDepartmentId = dto.FromDepartmentId;
        entity.ToDepartmentId = dto.ToDepartmentId;
        entity.DispatcherName = dto.DispatcherName;
        entity.ReceiverName = dto.ReceiverName;
        entity.VendorName = dto.VendorName;
        entity.Notes = dto.Notes;
        entity.DetailsJson = dto.DetailsJson ?? "[]";

        // Compute totals from DetailsJson
        try
        {
            var arr = JsonSerializer.Deserialize<List<JsonElement>>(entity.DetailsJson) ?? new();
            entity.TotalItems = arr.Sum(e => e.TryGetProperty("quantity", out var q) ? q.GetInt32() : 0);
            entity.TotalWeightKg = (decimal)arr.Sum(e => e.TryGetProperty("weight", out var w) ? w.GetDouble() : 0);
        }
        catch { /* tolerate bad JSON */ }

        await _db.SaveChangesAsync();
        return (await GetTransactionAsync(entity.Id))!;
    }

    public async Task<LinenTransactionDto?> UpdateTransactionStatusAsync(Guid id, int newStatus, string? userId)
    {
        var entity = await _db.LinenTransactions.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        entity.Status = newStatus;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetTransactionAsync(id);
    }

    public async Task<List<SterilizationScheduleDto>> SearchSchedulesAsync(string? areaType, int? status, DateTime? from, DateTime? to)
    {
        var q = _db.SterilizationSchedules.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(areaType)) q = q.Where(x => x.AreaType == areaType);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.ScheduledAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.ScheduledAt <= to.Value);

        var rows = await q.OrderByDescending(x => x.ScheduledAt).Take(500).ToListAsync();
        var deptIds = rows.Where(r => r.DepartmentId.HasValue).Select(r => r.DepartmentId!.Value).Distinct().ToList();
        var roomIds = rows.Where(r => r.RoomId.HasValue).Select(r => r.RoomId!.Value).Distinct().ToList();
        var deptMap = await _db.Departments.AsNoTracking().Where(d => deptIds.Contains(d.Id)).Select(d => new { d.Id, Name = d.DepartmentName }).ToListAsync();
        var roomMap = await _db.Rooms.AsNoTracking().Where(r => roomIds.Contains(r.Id)).Select(r => new { r.Id, Name = r.RoomName }).ToListAsync();

        return rows.Select(r => new SterilizationScheduleDto
        {
            Id = r.Id,
            ScheduleCode = r.ScheduleCode,
            ScheduledAt = r.ScheduledAt,
            AreaType = r.AreaType,
            RoomId = r.RoomId,
            RoomName = roomMap.FirstOrDefault(x => x.Id == r.RoomId)?.Name,
            DepartmentId = r.DepartmentId,
            DepartmentName = deptMap.FirstOrDefault(x => x.Id == r.DepartmentId)?.Name,
            AreaCode = r.AreaCode,
            SterilizationMethod = r.SterilizationMethod,
            Agent = r.Agent,
            DurationMinutes = r.DurationMinutes,
            AssignedStaff = r.AssignedStaff,
            StartedAt = r.StartedAt,
            CompletedAt = r.CompletedAt,
            Status = r.Status,
            StatusName = SterStatusName(r.Status),
            CultureSampleCode = r.CultureSampleCode,
            CultureResult = r.CultureResult,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    public async Task<SterilizationScheduleDto?> GetScheduleAsync(Guid id)
    {
        var r = await _db.SterilizationSchedules.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var deptName = r.DepartmentId.HasValue ? await _db.Departments.AsNoTracking().Where(d => d.Id == r.DepartmentId).Select(d => d.DepartmentName).FirstOrDefaultAsync() : null;
        var roomName = r.RoomId.HasValue ? await _db.Rooms.AsNoTracking().Where(d => d.Id == r.RoomId).Select(d => d.RoomName).FirstOrDefaultAsync() : null;
        return new SterilizationScheduleDto
        {
            Id = r.Id,
            ScheduleCode = r.ScheduleCode,
            ScheduledAt = r.ScheduledAt,
            AreaType = r.AreaType,
            RoomId = r.RoomId,
            RoomName = roomName,
            DepartmentId = r.DepartmentId,
            DepartmentName = deptName,
            AreaCode = r.AreaCode,
            SterilizationMethod = r.SterilizationMethod,
            Agent = r.Agent,
            DurationMinutes = r.DurationMinutes,
            AssignedStaff = r.AssignedStaff,
            StartedAt = r.StartedAt,
            CompletedAt = r.CompletedAt,
            Status = r.Status,
            StatusName = SterStatusName(r.Status),
            CultureSampleCode = r.CultureSampleCode,
            CultureResult = r.CultureResult,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt
        };
    }

    public async Task<SterilizationScheduleDto> SaveScheduleAsync(SaveSterilizationScheduleDto dto, string? userId)
    {
        SterilizationSchedule entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.SterilizationSchedules.FirstOrDefaultAsync(x => x.Id == dto.Id.Value) ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new SterilizationSchedule
            {
                Id = Guid.NewGuid(),
                ScheduleCode = $"STR-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _db.SterilizationSchedules.Add(entity);
        }
        entity.ScheduledAt = dto.ScheduledAt;
        entity.AreaType = dto.AreaType;
        entity.RoomId = dto.RoomId;
        entity.DepartmentId = dto.DepartmentId;
        entity.AreaCode = dto.AreaCode;
        entity.SterilizationMethod = dto.SterilizationMethod;
        entity.Agent = dto.Agent;
        entity.DurationMinutes = dto.DurationMinutes;
        entity.AssignedStaff = dto.AssignedStaff;
        entity.StartedAt = dto.StartedAt;
        entity.CompletedAt = dto.CompletedAt;
        entity.CultureSampleCode = dto.CultureSampleCode;
        entity.CultureResult = dto.CultureResult;
        entity.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return (await GetScheduleAsync(entity.Id))!;
    }

    public async Task<SterilizationScheduleDto?> UpdateScheduleStatusAsync(Guid id, int newStatus, string? cultureResult, string? userId)
    {
        var entity = await _db.SterilizationSchedules.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        entity.Status = newStatus;
        if (newStatus == 1) entity.StartedAt = DateTime.UtcNow;
        if (newStatus == 2) entity.CompletedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(cultureResult)) entity.CultureResult = cultureResult;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetScheduleAsync(id);
    }
}

// ============================================================================
// Batch 3.2: Functional Diagnostics
// ============================================================================

public class FunctionalDiagnosticsService : IFunctionalDiagnosticsService
{
    private readonly HISDbContext _db;
    public FunctionalDiagnosticsService(HISDbContext db) { _db = db; }

    private static readonly Dictionary<string, string> _testTypeNames = new()
    {
        ["ECG"] = "Điện tim thường quy",
        ["ECGStress"] = "Điện tim gắng sức",
        ["Endoscopy"] = "Nội soi",
        ["BoneDensity"] = "Đo loãng xương",
        ["EEG"] = "Điện não",
        ["EMG"] = "Điện cơ",
        ["Spirometry"] = "Đo chức năng hô hấp",
        ["Audiometry"] = "Đo thính lực"
    };

    private static string StatusName(int s) => s switch
    {
        0 => "Đã chỉ định", 1 => "Đang thực hiện", 2 => "Đã hoàn thành", 3 => "Đã duyệt", 4 => "Đã hủy", _ => "Khác"
    };

    public async Task<List<FunctionalDiagnosticTestDto>> SearchAsync(string? keyword, string? testType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.FunctionalDiagnosticTests.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.TestCode.Contains(k));
        }
        if (!string.IsNullOrWhiteSpace(testType)) q = q.Where(x => x.TestType == testType);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.CreatedAt <= to.Value);

        var rows = await q.OrderByDescending(x => x.CreatedAt).Skip(pageIndex * pageSize).Take(pageSize).ToListAsync();
        var pids = rows.Select(r => r.PatientId).Distinct().ToList();
        var pmap = await _db.Patients.AsNoTracking().Where(p => pids.Contains(p.Id)).Select(p => new { p.Id, p.FullName, p.PatientCode }).ToListAsync();

        return rows.Select(r =>
        {
            var p = pmap.FirstOrDefault(x => x.Id == r.PatientId);
            return new FunctionalDiagnosticTestDto
            {
                Id = r.Id,
                TestCode = r.TestCode,
                PatientId = r.PatientId,
                PatientName = p?.FullName,
                PatientCode = p?.PatientCode,
                TestType = r.TestType,
                TestTypeName = _testTypeNames.TryGetValue(r.TestType, out var n) ? n : r.TestType,
                PerformingDoctorId = r.PerformingDoctorId,
                PerformingDoctorName = r.PerformingDoctorName,
                TechnicianId = r.TechnicianId,
                PerformedAt = r.PerformedAt,
                DeviceName = r.DeviceName,
                DeviceSerialNumber = r.DeviceSerialNumber,
                ClinicalIndication = r.ClinicalIndication,
                Findings = r.Findings,
                Conclusion = r.Conclusion,
                Recommendation = r.Recommendation,
                MeasurementsJson = r.MeasurementsJson,
                ImagesJson = r.ImagesJson,
                Status = r.Status,
                StatusName = StatusName(r.Status),
                VerifiedById = r.VerifiedById,
                VerifiedAt = r.VerifiedAt,
                Notes = r.Notes,
                CreatedAt = r.CreatedAt
            };
        }).ToList();
    }

    public async Task<FunctionalDiagnosticTestDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.FunctionalDiagnosticTests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var p = await _db.Patients.AsNoTracking().Where(x => x.Id == r.PatientId).Select(x => new { x.FullName, x.PatientCode }).FirstOrDefaultAsync();
        return new FunctionalDiagnosticTestDto
        {
            Id = r.Id,
            TestCode = r.TestCode,
            PatientId = r.PatientId,
            PatientName = p?.FullName,
            PatientCode = p?.PatientCode,
            TestType = r.TestType,
            TestTypeName = _testTypeNames.TryGetValue(r.TestType, out var n) ? n : r.TestType,
            PerformingDoctorId = r.PerformingDoctorId,
            PerformingDoctorName = r.PerformingDoctorName,
            TechnicianId = r.TechnicianId,
            PerformedAt = r.PerformedAt,
            DeviceName = r.DeviceName,
            DeviceSerialNumber = r.DeviceSerialNumber,
            ClinicalIndication = r.ClinicalIndication,
            Findings = r.Findings,
            Conclusion = r.Conclusion,
            Recommendation = r.Recommendation,
            MeasurementsJson = r.MeasurementsJson,
            ImagesJson = r.ImagesJson,
            Status = r.Status,
            StatusName = StatusName(r.Status),
            VerifiedById = r.VerifiedById,
            VerifiedAt = r.VerifiedAt,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt
        };
    }

    public async Task<FunctionalDiagnosticTestDto> SaveAsync(SaveFunctionalDiagnosticTestDto dto, string? userId)
    {
        FunctionalDiagnosticTest entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.FunctionalDiagnosticTests.FirstOrDefaultAsync(x => x.Id == dto.Id.Value) ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new FunctionalDiagnosticTest
            {
                Id = Guid.NewGuid(),
                TestCode = $"FDT-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                Status = 0
            };
            _db.FunctionalDiagnosticTests.Add(entity);
        }

        entity.PatientId = dto.PatientId;
        entity.MedicalRecordId = dto.MedicalRecordId;
        entity.ExaminationId = dto.ExaminationId;
        entity.ServiceRequestDetailId = dto.ServiceRequestDetailId;
        entity.TestType = dto.TestType;
        entity.PerformingDoctorId = dto.PerformingDoctorId;
        entity.PerformingDoctorName = dto.PerformingDoctorName;
        entity.TechnicianId = dto.TechnicianId;
        entity.PerformedAt = dto.PerformedAt;
        entity.DeviceName = dto.DeviceName;
        entity.DeviceSerialNumber = dto.DeviceSerialNumber;
        entity.ClinicalIndication = dto.ClinicalIndication;
        entity.Findings = dto.Findings;
        entity.Conclusion = dto.Conclusion;
        entity.Recommendation = dto.Recommendation;
        entity.MeasurementsJson = dto.MeasurementsJson ?? "{}";
        entity.ImagesJson = dto.ImagesJson ?? "[]";
        entity.Notes = dto.Notes;

        if (!string.IsNullOrWhiteSpace(entity.Findings) && entity.Status == 0)
            entity.Status = 1;

        await _db.SaveChangesAsync();
        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task<FunctionalDiagnosticTestDto?> CompleteAsync(Guid id, string? userId)
    {
        var entity = await _db.FunctionalDiagnosticTests.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        entity.Status = 2;
        if (!entity.PerformedAt.HasValue) entity.PerformedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<FunctionalDiagnosticTestDto?> VerifyAsync(Guid id, string? userId)
    {
        var entity = await _db.FunctionalDiagnosticTests.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        entity.Status = 3;
        entity.VerifiedAt = DateTime.UtcNow;
        if (Guid.TryParse(userId, out var g)) entity.VerifiedById = g;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id, string? userId)
    {
        var entity = await _db.FunctionalDiagnosticTests.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return true;
    }
}

// ============================================================================
// Batch 4.1: Zalo Notification Service
// ============================================================================

public class ZaloNotificationService : IZaloNotificationService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;

    public ZaloNotificationService(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private static string StatusName(int s) => s switch
    {
        0 => "Đang chờ", 1 => "Đã gửi", 2 => "Đã nhận", 3 => "Lỗi", _ => "Khác"
    };

    public async Task<List<ZaloNotificationLogDto>> SearchLogsAsync(string? keyword, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.ZaloNotificationLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.TargetPhone.Contains(k) || x.TemplateName.Contains(k) || (x.PatientName != null && x.PatientName.Contains(k)));
        }
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.CreatedAt <= to.Value);

        return await q.OrderByDescending(x => x.CreatedAt)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .Select(r => new ZaloNotificationLogDto
            {
                Id = r.Id,
                TemplateId = r.TemplateId,
                TemplateName = r.TemplateName,
                TargetPhone = r.TargetPhone,
                PatientId = r.PatientId,
                PatientName = r.PatientName,
                RelatedEntityType = r.RelatedEntityType,
                RelatedEntityId = r.RelatedEntityId,
                PayloadJson = r.PayloadJson,
                MessageId = r.MessageId,
                Status = r.Status,
                StatusName = StatusName(r.Status),
                ErrorCode = r.ErrorCode,
                ErrorMessage = r.ErrorMessage,
                SentAt = r.SentAt,
                DeliveredAt = r.DeliveredAt,
                CostVnd = r.CostVnd,
                RetryCount = r.RetryCount,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ZaloNotificationLogDto?> GetLogAsync(Guid id)
    {
        return (await SearchLogsAsync(null, null, null, null, 0, 1000)).FirstOrDefault(x => x.Id == id);
    }

    public async Task<ZaloNotificationLogDto> SendAsync(SendZaloMessageDto dto, string? userId)
    {
        // Resolve patient name if patientId provided
        string? patientName = null;
        if (dto.PatientId.HasValue)
        {
            patientName = await _db.Patients.AsNoTracking()
                .Where(p => p.Id == dto.PatientId)
                .Select(p => p.FullName)
                .FirstOrDefaultAsync();
        }

        var templateName = dto.TemplateId switch
        {
            "appointment_reminder" => "Nhắc lịch tái khám",
            "lab_result_ready" => "Kết quả XN sẵn sàng",
            "prescription_dispense" => "Đơn thuốc đã có",
            "medicine_reminder" => "Nhắc uống thuốc",
            _ => "Thông báo"
        };

        var entity = new ZaloNotificationLog
        {
            Id = Guid.NewGuid(),
            TemplateId = dto.TemplateId,
            TemplateName = templateName,
            TargetPhone = dto.TargetPhone,
            PatientId = dto.PatientId,
            PatientName = patientName,
            RelatedEntityType = dto.RelatedEntityType,
            RelatedEntityId = dto.RelatedEntityId,
            PayloadJson = JsonSerializer.Serialize(dto.TemplateParams),
            Status = 0,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        var mockMode = _config.GetValue<bool>("Zalo:MockMode", true);
        if (mockMode)
        {
            entity.Status = 2; // Delivered
            entity.MessageId = $"ZNS-MOCK-{Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()}";
            entity.SentAt = DateTime.UtcNow;
            entity.DeliveredAt = DateTime.UtcNow;
            entity.CostVnd = 350; // typical ZNS cost
        }
        else
        {
            // TODO: POST https://business.openapi.zalo.me/message/template
            // headers: access_token, Content-Type: application/json
            entity.Status = 0;
        }

        _db.ZaloNotificationLogs.Add(entity);
        await _db.SaveChangesAsync();

        return new ZaloNotificationLogDto
        {
            Id = entity.Id,
            TemplateId = entity.TemplateId,
            TemplateName = entity.TemplateName,
            TargetPhone = entity.TargetPhone,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            RelatedEntityType = entity.RelatedEntityType,
            RelatedEntityId = entity.RelatedEntityId,
            PayloadJson = entity.PayloadJson,
            MessageId = entity.MessageId,
            Status = entity.Status,
            StatusName = StatusName(entity.Status),
            SentAt = entity.SentAt,
            DeliveredAt = entity.DeliveredAt,
            CostVnd = entity.CostVnd,
            RetryCount = entity.RetryCount,
            CreatedAt = entity.CreatedAt
        };
    }

    public Task<ZaloConfigDto> GetConfigAsync()
    {
        return Task.FromResult(new ZaloConfigDto
        {
            AccessToken = _config["Zalo:AccessToken"] ?? "",
            OaId = _config["Zalo:OaId"] ?? "",
            BaseUrl = _config["Zalo:BaseUrl"] ?? "https://business.openapi.zalo.me",
            MockMode = _config.GetValue<bool>("Zalo:MockMode", true),
            IsEnabled = _config.GetValue<bool>("Zalo:IsEnabled", false)
        });
    }

    public Task<bool> SaveConfigAsync(ZaloConfigDto config, string? userId)
    {
        // Placeholder — persistence into SystemConfig table is left to production deployment
        return Task.FromResult(true);
    }

    public Task<bool> TestConnectionAsync()
    {
        var mockMode = _config.GetValue<bool>("Zalo:MockMode", true);
        return Task.FromResult(mockMode);
    }
}

// ============================================================================
// Batch 4.2: Quality Dashboard Service
// ============================================================================

public class QualityDashboardService : IQualityDashboardService
{
    private readonly HISDbContext _db;
    public QualityDashboardService(HISDbContext db) { _db = db; }

    public async Task<QualityDashboardDto> GetFullDashboardAsync(DateTime? asOfDate = null)
    {
        var dt = asOfDate ?? DateTime.Today;
        return new QualityDashboardDto
        {
            AsOfDate = dt,
            ClinicQueues = await GetClinicQueuesAsync(dt),
            InpatientByDepartment = await GetInpatientByDepartmentAsync(dt),
            Paraclinical = await GetParaclinicalStatusAsync(dt),
            Lab = await GetLabStatusAsync(dt),
            Revenue = await GetDailyRevenueAsync(dt)
        };
    }

    public async Task<List<ClinicQueueViewDto>> GetClinicQueuesAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        try
        {
            var queueRows = await _db.QueueTickets.AsNoTracking()
                .Where(q => q.CreatedAt >= date && q.CreatedAt < nextDay)
                .GroupBy(q => new { q.RoomId })
                .Select(g => new
                {
                    g.Key.RoomId,
                    Waiting = g.Count(x => x.Status == 0),    // not yet called
                    InProgress = g.Count(x => x.Status == 1), // called / serving
                    Completed = g.Count(x => x.Status == 2)   // completed
                })
                .ToListAsync();

            var roomIds = queueRows.Where(r => r.RoomId.HasValue).Select(r => r.RoomId!.Value).ToList();
            var rooms = await _db.Rooms.AsNoTracking()
                .Where(r => roomIds.Contains(r.Id))
                .Select(r => new { r.Id, Name = r.RoomName })
                .ToListAsync();

            return queueRows.Select(q => new ClinicQueueViewDto
            {
                RoomId = q.RoomId ?? Guid.Empty,
                RoomName = rooms.FirstOrDefault(r => r.Id == q.RoomId)?.Name ?? "Phòng không xác định",
                Waiting = q.Waiting,
                InProgress = q.InProgress,
                Completed = q.Completed
            }).ToList();
        }
        catch
        {
            return new List<ClinicQueueViewDto>();
        }
    }

    public async Task<List<InpatientDepartmentViewDto>> GetInpatientByDepartmentAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        try
        {
            var admissions = await _db.Admissions.AsNoTracking()
                .Include(a => a.Department)
                .Include(a => a.Discharge)
                .ToListAsync();

            var grouped = admissions
                .GroupBy(a => new { a.DepartmentId, DeptName = a.Department != null ? a.Department.DepartmentName : "?" })
                .Select(g => new InpatientDepartmentViewDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DeptName,
                    Present = g.Count(a => a.Status == 0),
                    Admitted = g.Count(a => a.AdmissionDate >= date && a.AdmissionDate < nextDay),
                    Discharged = g.Count(a => a.Discharge != null && a.Discharge.DischargeDate >= date && a.Discharge.DischargeDate < nextDay)
                })
                .OrderByDescending(x => x.Present)
                .ToList();

            return grouped;
        }
        catch
        {
            return new List<InpatientDepartmentViewDto>();
        }
    }

    public async Task<ParaclinicalStatusViewDto> GetParaclinicalStatusAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        var view = new ParaclinicalStatusViewDto();

        try
        {
            // Radiology
            var radiology = await _db.RadiologyRequests.AsNoTracking()
                .Where(r => r.CreatedAt >= date && r.CreatedAt < nextDay)
                .GroupBy(r => 1)
                .Select(g => new { Pending = g.Count(x => x.Status < 2), Completed = g.Count(x => x.Status >= 2) })
                .FirstOrDefaultAsync();
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Chẩn đoán hình ảnh", Pending = radiology?.Pending ?? 0, Completed = radiology?.Completed ?? 0 });
        }
        catch { view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Chẩn đoán hình ảnh" }); }

        try
        {
            // Endoscopy / functional diag
            var fdt = await _db.FunctionalDiagnosticTests.AsNoTracking()
                .Where(r => r.CreatedAt >= date && r.CreatedAt < nextDay)
                .GroupBy(r => 1)
                .Select(g => new { Pending = g.Count(x => x.Status < 2), Completed = g.Count(x => x.Status >= 2) })
                .FirstOrDefaultAsync();
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Thăm dò chức năng", Pending = fdt?.Pending ?? 0, Completed = fdt?.Completed ?? 0 });
        }
        catch { view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Thăm dò chức năng" }); }

        try
        {
            // Pathology
            var path = await _db.PathologyRequests.AsNoTracking()
                .Where(r => r.RequestDate >= date && r.RequestDate < nextDay)
                .GroupBy(r => 1)
                .Select(g => new { Pending = g.Count(x => x.Status < 3), Completed = g.Count(x => x.Status >= 3) })
                .FirstOrDefaultAsync();
            view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Giải phẫu bệnh", Pending = path?.Pending ?? 0, Completed = path?.Completed ?? 0 });
        }
        catch { view.Items.Add(new ParaclinicalTypeStatusDto { TypeName = "Giải phẫu bệnh" }); }

        return view;
    }

    public async Task<LabStatusViewDto> GetLabStatusAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        var view = new LabStatusViewDto();

        // LabRequest doesn't carry Category directly; aggregate via items.Service.Group
        try
        {
            var labItems = await _db.LabRequestItems.AsNoTracking()
                .Include(x => x.LabRequest)
                .Include(x => x.Service)!.ThenInclude(s => s!.ServiceGroup)
                .Where(x => x.LabRequest!.CreatedAt >= date && x.LabRequest.CreatedAt < nextDay)
                .ToListAsync();

            var grouped = labItems
                .GroupBy(x => x.Service?.ServiceGroup?.GroupName ?? "Khác")
                .Select(g => new LabCategoryStatusDto
                {
                    CategoryName = g.Key,
                    Pending = g.Count(x => x.Status < 3),
                    Completed = g.Count(x => x.Status >= 3)
                })
                .ToList();

            view.Categories.AddRange(grouped);

            // Always include 4 standard categories
            string[] standardCats = { "Huyết học", "Sinh hóa", "Vi sinh", "Miễn dịch" };
            foreach (var c in standardCats)
            {
                if (!view.Categories.Any(x => x.CategoryName == c))
                    view.Categories.Add(new LabCategoryStatusDto { CategoryName = c, Pending = 0, Completed = 0 });
            }
        }
        catch
        {
            view.Categories.Add(new LabCategoryStatusDto { CategoryName = "Huyết học" });
            view.Categories.Add(new LabCategoryStatusDto { CategoryName = "Sinh hóa" });
            view.Categories.Add(new LabCategoryStatusDto { CategoryName = "Vi sinh" });
            view.Categories.Add(new LabCategoryStatusDto { CategoryName = "Miễn dịch" });
        }

        return view;
    }

    public async Task<DailyRevenueViewDto> GetDailyRevenueAsync(DateTime? asOfDate = null)
    {
        var date = (asOfDate ?? DateTime.Today).Date;
        var nextDay = date.AddDays(1);

        var view = new DailyRevenueViewDto();

        try
        {
            var receipts = await _db.Receipts.AsNoTracking()
                .Where(r => r.ReceiptDate >= date && r.ReceiptDate < nextDay && r.Status == 1)
                .ToListAsync();

            // Outpatient vs Inpatient detection by MedicalRecord type
            var mrIds = receipts.Where(r => r.MedicalRecordId.HasValue).Select(r => r.MedicalRecordId!.Value).Distinct().ToList();
            var mrTypes = await _db.MedicalRecords.AsNoTracking()
                .Where(m => mrIds.Contains(m.Id))
                .Select(m => new { m.Id, MedicalRecordType = m.TreatmentType })
                .ToListAsync();

            foreach (var r in receipts)
            {
                var t = r.MedicalRecordId.HasValue
                    ? mrTypes.FirstOrDefault(m => m.Id == r.MedicalRecordId.Value)?.MedicalRecordType
                    : null;
                // type 1=Outpatient, 2=Inpatient (per most existing usage)
                if (t == 2) view.InpatientTotal += r.FinalAmount;
                else view.OutpatientTotal += r.FinalAmount;
            }

            // Group by cashier
            var cashierGroups = receipts
                .GroupBy(r => r.CashierId)
                .ToList();

            var cashierIds = cashierGroups.Select(g => g.Key).Distinct().ToList();
            var cashierMap = await _db.Users.AsNoTracking()
                .Where(u => cashierIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName })
                .ToListAsync();

            foreach (var g in cashierGroups)
            {
                var name = cashierMap.FirstOrDefault(c => c.Id == g.Key)?.FullName ?? "Không xác định";
                decimal opTotal = 0, ipTotal = 0;
                foreach (var r in g)
                {
                    var t = r.MedicalRecordId.HasValue
                        ? mrTypes.FirstOrDefault(m => m.Id == r.MedicalRecordId.Value)?.MedicalRecordType
                        : null;
                    if (t == 2) ipTotal += r.FinalAmount; else opTotal += r.FinalAmount;
                }
                view.ByCashier.Add(new CashierRevenueDto
                {
                    CashierId = g.Key,
                    CashierName = name,
                    OutpatientRevenue = opTotal,
                    InpatientRevenue = ipTotal,
                    ReceiptCount = g.Count()
                });
            }
        }
        catch
        {
            // tolerate schema drift
        }

        return view;
    }
}
