using System.Text.Json;
using System.Text;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;
// ============================================================================
// Batch 2: Đề án 06 Certificate Service
// ============================================================================

public class DeAn06CertificateService : IDeAn06CertificateService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly IDeAn06GatewayClient _client;
    private readonly ILogger<DeAn06CertificateService> _logger;

    public DeAn06CertificateService(
        HISDbContext db, IConfiguration config,
        IDeAn06GatewayClient client, ILogger<DeAn06CertificateService> logger)
    {
        _db = db; _config = config; _client = client; _logger = logger;
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
        Nangcap23StateMachine.EnsureCanSubmit(entity.Da06Status, "Giấy chứng sinh");

        entity.Da06SubmittedAt = DateTime.UtcNow;
        entity.Da06Status = 1;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var payload = JsonSerializer.Serialize(new
        {
            certificateNumber = entity.CertificateNumber,
            facilityCode = _config["NationalGateway:FacilityCode"] ?? "BV-DEMO-01",
            mother = new { fullName = entity.MotherFullName, idNumber = entity.MotherIdNumber },
            father = new { fullName = entity.FatherFullName, idNumber = entity.FatherIdNumber },
            birth = new
            {
                dateTime = entity.BirthDateTime,
                weight = entity.BirthWeight,
                gestationalAgeWeeks = entity.GestationalAgeWeeks,
                method = entity.BirthMethod,
                location = entity.BirthLocation,
                childGender = entity.ChildGender,
                childName = entity.ChildName,
                isLiveBirth = entity.IsLiveBirth,
                singletonOrMultiple = entity.SingletonOrMultiple
            }
        });
        var result = await _client.SubmitBirthCertificateAsync(payload);
        if (result.Acknowledged)
        {
            entity.Da06Status = 2;
            entity.Da06AcknowledgedAt = DateTime.UtcNow;
            entity.Da06SubmissionId = result.TransactionId;
            entity.Da06ResponseCode = "200";
            entity.Da06ErrorMessage = null;
            _logger.LogInformation("Birth cert ack: cert={Cert} txn={Txn}", entity.CertificateNumber, result.TransactionId);
        }
        else
        {
            entity.Da06Status = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN" ? 1 : 3;
            entity.Da06ResponseCode = result.ErrorCode;
            entity.Da06ErrorMessage = result.ErrorMessage;
            _logger.LogWarning("Birth cert submit fail: cert={Cert} err={Err}", entity.CertificateNumber, result.ErrorCode);
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
        Nangcap23StateMachine.EnsureCanSubmit(entity.Da06Status, "Giấy báo tử");

        entity.Da06SubmittedAt = DateTime.UtcNow;
        entity.Da06Status = 1;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var payload = JsonSerializer.Serialize(new
        {
            certificateNumber = entity.CertificateNumber,
            facilityCode = _config["NationalGateway:FacilityCode"] ?? "BV-DEMO-01",
            patientId = entity.PatientId,
            death = new
            {
                dateTime = entity.DeathDateTime,
                location = entity.DeathLocation,
                primaryCauseIcd = entity.PrimaryCauseIcd,
                primaryCauseDescription = entity.PrimaryCauseDescription,
                secondaryCauseIcd = entity.SecondaryCauseIcd,
                manner = entity.MannerOfDeath
            },
            certifyingDoctor = new
            {
                name = entity.CertifyingDoctorName,
                license = entity.CertifyingDoctorLicense,
                date = entity.CertifyingDate
            },
            informant = new
            {
                fullName = entity.InformantFullName,
                idNumber = entity.InformantIdNumber,
                relationship = entity.InformantRelationship
            }
        });
        var result = await _client.SubmitDeathCertificateAsync(payload);
        if (result.Acknowledged)
        {
            entity.Da06Status = 2;
            entity.Da06AcknowledgedAt = DateTime.UtcNow;
            entity.Da06SubmissionId = result.TransactionId;
            entity.Da06ResponseCode = "200";
            entity.Da06ErrorMessage = null;
        }
        else
        {
            entity.Da06Status = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN" ? 1 : 3;
            entity.Da06ResponseCode = result.ErrorCode;
            entity.Da06ErrorMessage = result.ErrorMessage;
            _logger.LogWarning("Death cert submit fail: cert={Cert} err={Err}", entity.CertificateNumber, result.ErrorCode);
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
        // High-New-2 + High-New-3: KHÔNG trust dto.EligibleToDrive — server tự tính theo TT 24/2023
        // Apply ngay tại Save (không chỉ Submit) để UI/print pipeline đọc đúng giá trị.
        entity.EligibleToDrive = dto.EligibleToDrive; // gán tạm để Recompute thấy giá trị "yêu cầu"
        var changed = DrivingLicenseEligibility.Recompute(entity);
        if (changed)
        {
            _logger.LogInformation(
                "DLHC eligibility auto-corrected at Save: cert={Cert} class={Class} client={Client} computed={Computed}",
                entity.CertificateNumber, entity.LicenseClass, dto.EligibleToDrive, entity.EligibleToDrive);
        }
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
        Nangcap23StateMachine.EnsureCanSubmit(entity.Da06Status, "Giấy KSK lái xe");

        // LUÔN re-compute trước Submit — defense-in-depth (đã Recompute tại Save nhưng có thể
        // DB record được Service khác update). Helper duy nhất ở Application layer.
        var origEligibility = entity.EligibleToDrive;
        if (DrivingLicenseEligibility.Recompute(entity))
        {
            _logger.LogInformation(
                "DLHC eligibility re-corrected at Submit: cert={Cert} class={Class} prev={Prev} computed={Computed}",
                entity.CertificateNumber, entity.LicenseClass, origEligibility, entity.EligibleToDrive);
        }

        entity.Da06SubmittedAt = DateTime.UtcNow;
        entity.Da06Status = 1;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        var payload = JsonSerializer.Serialize(new
        {
            certificateNumber = entity.CertificateNumber,
            facilityCode = _config["NationalGateway:FacilityCode"] ?? "BV-DEMO-01",
            patientId = entity.PatientId,
            licenseClass = entity.LicenseClass,
            examDate = entity.ExamDate,
            anthropometric = new { heightCm = entity.HeightCm, weightKg = entity.WeightKg },
            vitals = new { sbp = entity.SystolicBp, dbp = entity.DiastolicBp, heartRate = entity.HeartRate },
            vision = new
            {
                rightWithout = entity.VisionRightWithoutGlasses,
                leftWithout = entity.VisionLeftWithoutGlasses,
                rightWith = entity.VisionRightWithGlasses,
                leftWith = entity.VisionLeftWithGlasses,
                colorBlindNormal = entity.ColorBlindNormal
            },
            hearingNormal = entity.HearingNormal,
            drug = new { performed = entity.DrugTestPerformed, positive = entity.DrugTestPositive },
            alcohol = new { performed = entity.AlcoholTestPerformed, level = entity.AlcoholLevelMgPercent },
            conclusion = entity.Conclusion,
            eligibleToDrive = entity.EligibleToDrive,
            certifyingDoctor = new { name = entity.CertifyingDoctorName, license = entity.CertifyingDoctorLicense }
        });
        var result = await _client.SubmitDrivingLicenseCheckAsync(payload);
        if (result.Acknowledged)
        {
            entity.Da06Status = 2;
            entity.Da06AcknowledgedAt = DateTime.UtcNow;
            entity.Da06SubmissionId = result.TransactionId;
            entity.Da06ResponseCode = "200";
            entity.Da06ErrorMessage = null;
        }
        else
        {
            entity.Da06Status = result.ErrorCode is "NETWORK_ERROR" or "TIMEOUT" or "CIRCUIT_OPEN" ? 1 : 3;
            entity.Da06ResponseCode = result.ErrorCode;
            entity.Da06ErrorMessage = result.ErrorMessage;
            _logger.LogWarning("DLHC submit fail: cert={Cert} err={Err}", entity.CertificateNumber, result.ErrorCode);
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

