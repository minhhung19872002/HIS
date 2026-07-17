using HIS.Application.DTOs.PatientPortal;
using HIS.Core.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K-wave5: tach tu PatientPortalServiceImpl.cs — Medicine Reminders, Health Metrics,
// Patient Q&A, Auth + ownership checks (~385 dong).
public partial class PatientPortalServiceImpl
{
    // NangCap19: Medicine Reminders
    public async Task<List<MedicineReminderDto>> GetMedicineRemindersAsync(Guid accountId, bool activeOnly = true)
    {
        try
        {
            IQueryable<MedicineReminder> query = _context.MedicineReminders;
            if (accountId != Guid.Empty) query = query.Where(x => x.AccountId == accountId);
            if (activeOnly) query = query.Where(x => x.IsActive);
            var list = await query.OrderBy(x => x.MedicineName).Take(30).ToListAsync();
            return list.Select(e => new MedicineReminderDto
            {
                Id = e.Id, AccountId = e.AccountId, MedicineName = e.MedicineName, Dosage = e.Dosage,
                Frequency = e.Frequency, Times = e.Times ?? "", Instructions = e.Instructions ?? "",
                StartDate = e.StartDate, EndDate = e.EndDate, IsActive = e.IsActive,
                PrescriptionId = e.PrescriptionId ?? "", Notes = e.Notes ?? "", CreatedAt = e.CreatedAt
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<MedicineReminderDto>();
        }
    }

    public async Task<MedicineReminderDto> SaveMedicineReminderAsync(SaveMedicineReminderDto dto)
    {
        var entity = dto.Id.HasValue && dto.Id != Guid.Empty
            ? await _context.MedicineReminders.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new MedicineReminder { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.MedicineReminders.Add(entity);
        }
        entity.AccountId = dto.AccountId;
        entity.MedicineName = dto.MedicineName;
        entity.Dosage = dto.Dosage;
        entity.Frequency = dto.Frequency;
        entity.Times = dto.Times;
        entity.Instructions = dto.Instructions;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        entity.PrescriptionId = dto.PrescriptionId;
        entity.Notes = dto.Notes;
        entity.IsActive = true;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new MedicineReminderDto
        {
            Id = entity.Id, AccountId = entity.AccountId, MedicineName = entity.MedicineName,
            Dosage = entity.Dosage, Frequency = entity.Frequency, Times = entity.Times ?? "",
            Instructions = entity.Instructions ?? "", StartDate = entity.StartDate, EndDate = entity.EndDate,
            IsActive = entity.IsActive, PrescriptionId = entity.PrescriptionId ?? "",
            Notes = entity.Notes ?? "", CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteMedicineReminderAsync(Guid id)
    {
        var entity = await _context.MedicineReminders.FindAsync(id);
        if (entity == null) return false;
        _context.MedicineReminders.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleMedicineReminderAsync(Guid id)
    {
        var entity = await _context.MedicineReminders.FindAsync(id);
        if (entity == null) return false;
        entity.IsActive = !entity.IsActive;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    // NangCap19: Health Metrics
    public async Task<List<HealthMetricDto>> GetHealthMetricsAsync(Guid accountId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            IQueryable<HealthMetric> query = _context.HealthMetrics;
            if (accountId != Guid.Empty) query = query.Where(x => x.AccountId == accountId);
            if (fromDate.HasValue) query = query.Where(x => x.RecordedAt >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(x => x.RecordedAt <= toDate.Value);
            var list = await query.OrderByDescending(x => x.RecordedAt).Take(200).ToListAsync();
            return list.Select(e => new HealthMetricDto
            {
                Id = e.Id, AccountId = e.AccountId, RecordedAt = e.RecordedAt,
                BloodPressureSystolic = e.BloodPressureSystolic, BloodPressureDiastolic = e.BloodPressureDiastolic,
                HeartRate = e.HeartRate, Weight = e.Weight, Height = e.Height, BMI = e.BMI,
                BloodGlucose = e.BloodGlucose, Temperature = e.Temperature, SpO2 = e.SpO2,
                Notes = e.Notes ?? "", Source = e.Source, CreatedAt = e.CreatedAt
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HealthMetricDto>();
        }
    }

    public async Task<HealthMetricDto> SaveHealthMetricAsync(SaveHealthMetricDto dto)
    {
        var entity = dto.Id.HasValue && dto.Id != Guid.Empty
            ? await _context.HealthMetrics.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new HealthMetric { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.HealthMetrics.Add(entity);
        }
        entity.AccountId = dto.AccountId;
        entity.RecordedAt = dto.RecordedAt;
        entity.BloodPressureSystolic = dto.BloodPressureSystolic;
        entity.BloodPressureDiastolic = dto.BloodPressureDiastolic;
        entity.HeartRate = dto.HeartRate;
        entity.Weight = dto.Weight;
        entity.Height = dto.Height;
        entity.BloodGlucose = dto.BloodGlucose;
        entity.Temperature = dto.Temperature;
        entity.SpO2 = dto.SpO2;
        entity.Notes = dto.Notes;
        entity.Source = dto.Source ?? "Manual";
        // Auto-calculate BMI
        if (entity.Weight.HasValue && entity.Height.HasValue && entity.Height > 0)
        {
            var heightM = entity.Height.Value / 100m;
            entity.BMI = Math.Round(entity.Weight.Value / (heightM * heightM), 1);
        }
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new HealthMetricDto
        {
            Id = entity.Id, AccountId = entity.AccountId, RecordedAt = entity.RecordedAt,
            BloodPressureSystolic = entity.BloodPressureSystolic, BloodPressureDiastolic = entity.BloodPressureDiastolic,
            HeartRate = entity.HeartRate, Weight = entity.Weight, Height = entity.Height, BMI = entity.BMI,
            BloodGlucose = entity.BloodGlucose, Temperature = entity.Temperature, SpO2 = entity.SpO2,
            Notes = entity.Notes ?? "", Source = entity.Source, CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteHealthMetricAsync(Guid id)
    {
        var entity = await _context.HealthMetrics.FindAsync(id);
        if (entity == null) return false;
        _context.HealthMetrics.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<HealthMetricTrendDto>> GetHealthMetricTrendsAsync(Guid accountId, int days = 30)
    {
        try
        {
            var fromDate = DateTime.Now.AddDays(-days);
            IQueryable<HealthMetric> q = _context.HealthMetrics.Where(x => x.RecordedAt >= fromDate);
            if (accountId != Guid.Empty) q = q.Where(x => x.AccountId == accountId);
            var metrics = await q
                .OrderBy(x => x.RecordedAt)
                .ToListAsync();

            var trends = new List<HealthMetricTrendDto>();

            // Blood Pressure Systolic
            var bpSys = metrics.Where(x => x.BloodPressureSystolic.HasValue).ToList();
            if (bpSys.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "BloodPressureSystolic",
                    DataPoints = bpSys.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.BloodPressureSystolic!.Value }).ToList(),
                    MinValue = bpSys.Min(x => x.BloodPressureSystolic), MaxValue = bpSys.Max(x => x.BloodPressureSystolic),
                    AvgValue = Math.Round(bpSys.Average(x => x.BloodPressureSystolic!.Value), 1), LatestValue = bpSys.Last().BloodPressureSystolic
                });
            }

            // Blood Pressure Diastolic
            var bpDia = metrics.Where(x => x.BloodPressureDiastolic.HasValue).ToList();
            if (bpDia.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "BloodPressureDiastolic",
                    DataPoints = bpDia.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.BloodPressureDiastolic!.Value }).ToList(),
                    MinValue = bpDia.Min(x => x.BloodPressureDiastolic), MaxValue = bpDia.Max(x => x.BloodPressureDiastolic),
                    AvgValue = Math.Round(bpDia.Average(x => x.BloodPressureDiastolic!.Value), 1), LatestValue = bpDia.Last().BloodPressureDiastolic
                });
            }

            // Heart Rate
            var hr = metrics.Where(x => x.HeartRate.HasValue).ToList();
            if (hr.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "HeartRate",
                    DataPoints = hr.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.HeartRate!.Value }).ToList(),
                    MinValue = hr.Min(x => x.HeartRate), MaxValue = hr.Max(x => x.HeartRate),
                    AvgValue = Math.Round(hr.Average(x => x.HeartRate!.Value), 1), LatestValue = hr.Last().HeartRate
                });
            }

            // Weight
            var wt = metrics.Where(x => x.Weight.HasValue).ToList();
            if (wt.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "Weight",
                    DataPoints = wt.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.Weight!.Value }).ToList(),
                    MinValue = wt.Min(x => x.Weight), MaxValue = wt.Max(x => x.Weight),
                    AvgValue = Math.Round(wt.Average(x => x.Weight!.Value), 1), LatestValue = wt.Last().Weight
                });
            }

            // Blood Glucose
            var bg = metrics.Where(x => x.BloodGlucose.HasValue).ToList();
            if (bg.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "BloodGlucose",
                    DataPoints = bg.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.BloodGlucose!.Value }).ToList(),
                    MinValue = bg.Min(x => x.BloodGlucose), MaxValue = bg.Max(x => x.BloodGlucose),
                    AvgValue = Math.Round(bg.Average(x => x.BloodGlucose!.Value), 1), LatestValue = bg.Last().BloodGlucose
                });
            }

            // SpO2
            var spo2 = metrics.Where(x => x.SpO2.HasValue).ToList();
            if (spo2.Any())
            {
                trends.Add(new HealthMetricTrendDto
                {
                    MetricName = "SpO2",
                    DataPoints = spo2.Select(x => new HealthMetricPointDto { RecordedAt = x.RecordedAt, Value = x.SpO2!.Value }).ToList(),
                    MinValue = spo2.Min(x => x.SpO2), MaxValue = spo2.Max(x => x.SpO2),
                    AvgValue = Math.Round(spo2.Average(x => x.SpO2!.Value), 1), LatestValue = spo2.Last().SpO2
                });
            }

            return trends;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HealthMetricTrendDto>();
        }
    }

    // NangCap19: Patient Q&A
    public async Task<List<PatientQuestionDto>> GetPatientQuestionsAsync(Guid accountId, int? status = null)
    {
        try
        {
            IQueryable<PatientQuestion> query = _context.PatientQuestions;
            if (accountId != Guid.Empty) query = query.Where(x => x.AccountId == accountId);
            if (status.HasValue) query = query.Where(x => x.Status == status.Value);
            var list = await query.OrderByDescending(x => x.CreatedAt).Take(100).ToListAsync();
            return list.Select(MapQuestionToDto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PatientQuestionDto>();
        }
    }

    public async Task<PatientQuestionDto> CreatePatientQuestionAsync(CreatePatientQuestionDto dto)
    {
        var entity = new PatientQuestion
        {
            Id = Guid.NewGuid(),
            AccountId = dto.AccountId,
            Subject = dto.Subject,
            Content = dto.Content,
            Category = dto.Category,
            ImageUrls = dto.ImageUrls,
            IsPublic = dto.IsPublic,
            Status = 1,
            CreatedAt = DateTime.Now
        };
        _context.PatientQuestions.Add(entity);
        await _context.SaveChangesAsync();
        return MapQuestionToDto(entity);
    }

    public async Task<PatientQuestionDto> GetQuestionByIdAsync(Guid id)
    {
        var entity = await _context.PatientQuestions.FindAsync(id);
        return entity == null ? null! : MapQuestionToDto(entity);
    }

    public async Task<PatientQuestionDto> AnswerPatientQuestionAsync(Guid id, AnswerPatientQuestionDto dto)
    {
        var entity = await _context.PatientQuestions.FindAsync(id);
        if (entity == null) return null!;
        entity.AnsweredBy = dto.AnsweredBy;
        entity.AnsweredByName = dto.AnsweredByName;
        entity.Answer = dto.Answer;
        entity.AnsweredAt = DateTime.Now;
        entity.Status = 2; // Answered
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return MapQuestionToDto(entity);
    }

    private static PatientQuestionDto MapQuestionToDto(PatientQuestion e) => new()
    {
        Id = e.Id, AccountId = e.AccountId, Subject = e.Subject, Content = e.Content,
        Category = e.Category ?? "", ImageUrls = e.ImageUrls ?? "", Status = e.Status,
        StatusText = e.Status switch { 1 => "Chờ trả lời", 2 => "Đã trả lời", 3 => "Đã đóng", _ => "Không xác định" },
        AnsweredBy = e.AnsweredBy ?? "", AnsweredByName = e.AnsweredByName ?? "",
        Answer = e.Answer ?? "", AnsweredAt = e.AnsweredAt, IsPublic = e.IsPublic, CreatedAt = e.CreatedAt
    };

    // ── Issue #202: DB-touching logic moved from PatientPortalController ─────────

    public async Task<PortalAuthResultDto> AuthenticatePortalAsync(string identifier, string password)
    {
        var ident = (identifier ?? "").Trim();
        var account = await _context.PortalAccounts
            .FirstOrDefaultAsync(a => !a.IsDeleted && (a.Username == ident || a.Email == ident || a.Phone == ident));
        if (account == null)
            return new PortalAuthResultDto { Success = false, Message = "Tài khoản hoặc mật khẩu không đúng" };

        if (account.LockedUntil.HasValue && account.LockedUntil.Value > DateTime.UtcNow)
            return new PortalAuthResultDto { Success = false, Message = "Tài khoản đang bị khóa tạm thời, thử lại sau" };

        bool valid;
        try { valid = BCrypt.Net.BCrypt.Verify(password, account.PasswordHash); }
        catch { valid = false; }
        if (!valid)
        {
            account.FailedLoginAttempts++;
            if (account.FailedLoginAttempts >= 5)
            {
                account.LockedUntil = DateTime.UtcNow.AddMinutes(15);
                account.FailedLoginAttempts = 0;
            }
            await _context.SaveChangesAsync();
            return new PortalAuthResultDto { Success = false, Message = "Tài khoản hoặc mật khẩu không đúng" };
        }

        if (!string.Equals(account.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return new PortalAuthResultDto { Success = false, Message = "Tài khoản chưa kích hoạt hoặc đang bị tạm ngưng" };
        if (!account.PatientId.HasValue || account.PatientId.Value == Guid.Empty)
            return new PortalAuthResultDto { Success = false, Message = "Tài khoản chưa liên kết hồ sơ bệnh nhân" };

        account.LastLoginAt = DateTime.UtcNow;
        account.FailedLoginAttempts = 0;
        account.LockedUntil = null;
        await _context.SaveChangesAsync();

        return new PortalAuthResultDto
        {
            Success = true,
            Message = "Đăng nhập thành công",
            AccountId = account.Id,
            PatientId = account.PatientId.Value,
            Username = account.Username,
        };
    }

    public async Task<object> GetPortalDoctorsAsync()
        => await _context.Users.Where(u => u.IsActive && u.UserType == 1)
            .Select(u => new { u.Id, u.FullName, title = u.Title, specialty = u.Specialty })
            .Take(20).ToListAsync();

    public async Task<object> GetPortalDepartmentsAsync()
        => await _context.Departments.Where(d => d.IsActive)
            .Select(d => new { d.Id, d.DepartmentCode, d.DepartmentName })
            .Take(30).ToListAsync();

    public Task<bool> IsFamilyMemberOwnedByAccountAsync(Guid id, Guid accountId)
        => _context.FamilyMembers.AnyAsync(x => x.Id == id && x.AccountId == accountId);

    public Task<bool> IsMedicineReminderOwnedByAccountAsync(Guid id, Guid accountId)
        => _context.MedicineReminders.AnyAsync(x => x.Id == id && x.AccountId == accountId);

    public Task<bool> IsHealthMetricOwnedByAccountAsync(Guid id, Guid accountId)
        => _context.HealthMetrics.AnyAsync(x => x.Id == id && x.AccountId == accountId);

    public Task<bool> IsPatientQuestionOwnedByAccountAsync(Guid id, Guid accountId)
        => _context.PatientQuestions.AnyAsync(x => x.Id == id && x.AccountId == accountId);

    public Task<bool> IsPrescriptionOwnedByPatientAsync(Guid prescriptionId, Guid patientId)
        => (from p in _context.Prescriptions
            join mr in _context.MedicalRecords on p.MedicalRecordId equals mr.Id
            where p.Id == prescriptionId && mr.PatientId == patientId
            select p.Id).AnyAsync();
}
