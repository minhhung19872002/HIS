using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class CommunityHealthService : ICommunityHealthService
{
    private readonly HISDbContext _context;

    public CommunityHealthService(HISDbContext context)
    {
        _context = context;
    }

    // ==================== Households ====================

    public async Task<List<HouseholdListDto>> SearchHouseholdsAsync(HouseholdSearchDto? filter = null)
    {
        try
        {
            var query = _context.HouseholdHealthRecords
                .Include(h => h.AssignedTeam)
                .Where(h => !h.IsDeleted)
                .AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(h =>
                        h.HouseholdCode.ToLower().Contains(kw) ||
                        (h.HeadOfHousehold != null && h.HeadOfHousehold.ToLower().Contains(kw)) ||
                        (h.Address != null && h.Address.ToLower().Contains(kw)) ||
                        (h.PhoneNumber != null && h.PhoneNumber.Contains(kw))
                    );
                }
                if (filter.RiskLevel.HasValue)
                    query = query.Where(h => h.RiskLevel == filter.RiskLevel.Value);
                if (!string.IsNullOrEmpty(filter.WardName))
                    query = query.Where(h => h.WardName == filter.WardName);
                if (filter.AssignedTeamId.HasValue)
                    query = query.Where(h => h.AssignedTeamId == filter.AssignedTeamId.Value);
                if (filter.OverdueVisitOnly == true)
                    query = query.Where(h => h.NextVisitDate.HasValue && h.NextVisitDate.Value < DateTime.UtcNow);
            }

            var now = DateTime.UtcNow;

            return await query
                .OrderBy(h => h.HouseholdCode)
                .ThenBy(h => h.Id)
                .Take(200)
                .Select(h => new HouseholdListDto
                {
                    Id = h.Id,
                    HouseholdCode = h.HouseholdCode,
                    Address = h.Address,
                    WardName = h.WardName,
                    DistrictName = h.DistrictName,
                    HeadOfHousehold = h.HeadOfHousehold,
                    PhoneNumber = h.PhoneNumber,
                    MemberCount = h.MemberCount,
                    RiskLevel = h.RiskLevel,
                    AssignedTeamName = h.AssignedTeam != null ? h.AssignedTeam.TeamName : null,
                    LastVisitDate = h.LastVisitDate.HasValue ? h.LastVisitDate.Value.ToString("yyyy-MM-dd") : null,
                    NextVisitDate = h.NextVisitDate.HasValue ? h.NextVisitDate.Value.ToString("yyyy-MM-dd") : null,
                    IsOverdue = h.NextVisitDate.HasValue && h.NextVisitDate.Value < now,
                    AssignedTeamId = h.AssignedTeamId,
                    Notes = h.Notes,
                    HasElderlyMember = h.HasElderlyMember,
                    HasChildUnder5 = h.HasChildUnder5,
                    HasPregnant = h.HasPregnant,
                    HasChronicDisease = h.HasChronicDisease,
                    Status = h.Status,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<HouseholdListDto>();
        }
    }

    public async Task<HouseholdListDto?> GetHouseholdByIdAsync(Guid id)
    {
        var h = await _context.HouseholdHealthRecords
            .Include(x => x.AssignedTeam)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (h == null) return null;

        return new HouseholdListDto
        {
            Id = h.Id,
            HouseholdCode = h.HouseholdCode,
            Address = h.Address,
            WardName = h.WardName,
            DistrictName = h.DistrictName,
            HeadOfHousehold = h.HeadOfHousehold,
            PhoneNumber = h.PhoneNumber,
            MemberCount = h.MemberCount,
            RiskLevel = h.RiskLevel,
            AssignedTeamName = h.AssignedTeam?.TeamName,
            LastVisitDate = h.LastVisitDate?.ToString("yyyy-MM-dd"),
            NextVisitDate = h.NextVisitDate?.ToString("yyyy-MM-dd"),
            IsOverdue = h.NextVisitDate.HasValue && h.NextVisitDate.Value < DateTime.UtcNow,
            AssignedTeamId = h.AssignedTeamId,
            Notes = h.Notes,
            HasElderlyMember = h.HasElderlyMember,
            HasChildUnder5 = h.HasChildUnder5,
            HasPregnant = h.HasPregnant,
            HasChronicDisease = h.HasChronicDisease,
            Status = h.Status,
        };
    }

    // QA-R11: a household had to reference a live team, and an empty body created code-less, head-less rows.
    private async Task ValidateTeamAsync(Guid? teamId)
    {
        if (teamId.HasValue && !await _context.CommunityHealthTeams.AnyAsync(t => t.Id == teamId.Value && !t.IsDeleted))
            throw new ArgumentException("Đội y tế không tồn tại.", "AssignedTeamId");
    }

    public async Task<HouseholdListDto> CreateHouseholdAsync(HouseholdCreateDto dto, string? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.HeadOfHousehold))
            throw new ArgumentException("Chưa nhập chủ hộ.", nameof(dto.HeadOfHousehold));
        if (dto.RiskLevel is < 0 or > 3)
            throw new ArgumentException("Mức rủi ro không hợp lệ.", nameof(dto.RiskLevel));
        await ValidateTeamAsync(dto.AssignedTeamId);
        var code = dto.HouseholdCode?.Trim();
        if (string.IsNullOrEmpty(code))
        {
            // The v2 form has no code field → every household used to be saved with HouseholdCode = "".
            var year = HIS.Core.Common.VnTime.TodayVn.Year;
            var n = await _context.HouseholdHealthRecords.CountAsync(h => h.HouseholdCode.StartsWith($"HH-{year}-")) + 1;
            code = $"HH-{year}-{n:D5}";
            while (await _context.HouseholdHealthRecords.AnyAsync(h => h.HouseholdCode == code))
                code = $"HH-{year}-{++n:D5}";
        }
        else if (await _context.HouseholdHealthRecords.AnyAsync(h => h.HouseholdCode == code && !h.IsDeleted))
            throw new InvalidOperationException($"Mã hộ {code} đã tồn tại.");
        var entity = new HouseholdHealthRecord
        {
            Id = Guid.NewGuid(),
            HouseholdCode = code,
            Address = dto.Address,
            WardName = dto.WardName,
            DistrictName = dto.DistrictName,
            HeadOfHousehold = dto.HeadOfHousehold,
            PhoneNumber = dto.PhoneNumber,
            MemberCount = dto.MemberCount,
            RiskLevel = dto.RiskLevel,
            AssignedTeamId = dto.AssignedTeamId,
            NextVisitDate = DateTime.TryParse(dto.NextVisitDate, out var nvd) ? nvd : null,
            Notes = dto.Notes,
            HasElderlyMember = dto.HasElderlyMember,
            HasChildUnder5 = dto.HasChildUnder5,
            HasPregnant = dto.HasPregnant,
            HasChronicDisease = dto.HasChronicDisease,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };

        _context.HouseholdHealthRecords.Add(entity);
        await _context.SaveChangesAsync();

        return new HouseholdListDto
        {
            Id = entity.Id,
            HouseholdCode = entity.HouseholdCode,
            Address = entity.Address,
            WardName = entity.WardName,
            DistrictName = entity.DistrictName,
            HeadOfHousehold = entity.HeadOfHousehold,
            PhoneNumber = entity.PhoneNumber,
            MemberCount = entity.MemberCount,
            RiskLevel = entity.RiskLevel,
            NextVisitDate = entity.NextVisitDate?.ToString("yyyy-MM-dd"),
            IsOverdue = false,
            AssignedTeamId = entity.AssignedTeamId,
            Notes = entity.Notes,
            HasElderlyMember = entity.HasElderlyMember,
            HasChildUnder5 = entity.HasChildUnder5,
            HasPregnant = entity.HasPregnant,
            HasChronicDisease = entity.HasChronicDisease,
            Status = entity.Status,
        };
    }

    public async Task<HouseholdListDto> UpdateHouseholdAsync(Guid id, HouseholdUpdateDto dto)
    {
        var entity = await _context.HouseholdHealthRecords
            .Include(h => h.AssignedTeam)
            .FirstOrDefaultAsync(h => h.Id == id && !h.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hộ gia đình.");
        if (dto.RiskLevel is < 0 or > 3)
            throw new ArgumentException("Mức rủi ro không hợp lệ.", nameof(dto.RiskLevel));
        if (dto.Status is < 0 or > 2)
            throw new ArgumentException("Trạng thái hộ không hợp lệ.", nameof(dto.Status));
        await ValidateTeamAsync(dto.AssignedTeamId);

        if (dto.Address != null) entity.Address = dto.Address;
        if (dto.WardName != null) entity.WardName = dto.WardName;
        if (dto.DistrictName != null) entity.DistrictName = dto.DistrictName;
        if (dto.HeadOfHousehold != null) entity.HeadOfHousehold = dto.HeadOfHousehold;
        if (dto.PhoneNumber != null) entity.PhoneNumber = dto.PhoneNumber;
        if (dto.MemberCount.HasValue) entity.MemberCount = dto.MemberCount.Value;
        if (dto.RiskLevel.HasValue) entity.RiskLevel = dto.RiskLevel.Value;
        if (dto.AssignedTeamId.HasValue) entity.AssignedTeamId = dto.AssignedTeamId.Value;
        if (!string.IsNullOrEmpty(dto.LastVisitDate) && DateTime.TryParse(dto.LastVisitDate, out var lvd))
            entity.LastVisitDate = lvd;
        if (!string.IsNullOrEmpty(dto.NextVisitDate) && DateTime.TryParse(dto.NextVisitDate, out var nvd))
            entity.NextVisitDate = nvd;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        if (dto.HasElderlyMember.HasValue) entity.HasElderlyMember = dto.HasElderlyMember.Value;
        if (dto.HasChildUnder5.HasValue) entity.HasChildUnder5 = dto.HasChildUnder5.Value;
        if (dto.HasPregnant.HasValue) entity.HasPregnant = dto.HasPregnant.Value;
        if (dto.HasChronicDisease.HasValue) entity.HasChronicDisease = dto.HasChronicDisease.Value;
        if (dto.Status.HasValue) entity.Status = dto.Status.Value;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        if (dto.AssignedTeamId.HasValue)
            await _context.Entry(entity).Reference(h => h.AssignedTeam).LoadAsync();

        return new HouseholdListDto
        {
            Id = entity.Id,
            HouseholdCode = entity.HouseholdCode,
            Address = entity.Address,
            WardName = entity.WardName,
            DistrictName = entity.DistrictName,
            HeadOfHousehold = entity.HeadOfHousehold,
            PhoneNumber = entity.PhoneNumber,
            MemberCount = entity.MemberCount,
            RiskLevel = entity.RiskLevel,
            AssignedTeamName = entity.AssignedTeam?.TeamName,
            LastVisitDate = entity.LastVisitDate?.ToString("yyyy-MM-dd"),
            NextVisitDate = entity.NextVisitDate?.ToString("yyyy-MM-dd"),
            IsOverdue = entity.NextVisitDate.HasValue && entity.NextVisitDate.Value < DateTime.UtcNow,
            AssignedTeamId = entity.AssignedTeamId,
            Notes = entity.Notes,
            HasElderlyMember = entity.HasElderlyMember,
            HasChildUnder5 = entity.HasChildUnder5,
            HasPregnant = entity.HasPregnant,
            HasChronicDisease = entity.HasChronicDisease,
            Status = entity.Status,
        };
    }

    public async Task DeleteHouseholdAsync(Guid id)
    {
        var entity = await _context.HouseholdHealthRecords.FindAsync(id)
            ?? throw new InvalidOperationException("Household not found");
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<HouseholdListDto>> GetHouseholdsByRiskAsync(int riskLevel)
    {
        return await SearchHouseholdsAsync(new HouseholdSearchDto { RiskLevel = riskLevel });
    }

    public async Task<List<OverdueVisitDto>> GetOverdueVisitsAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            return await _context.HouseholdHealthRecords
                .Include(h => h.AssignedTeam)
                .Where(h => !h.IsDeleted && h.NextVisitDate.HasValue && h.NextVisitDate.Value < now)
                .OrderBy(h => h.NextVisitDate)
                .Take(200)
                .Select(h => new OverdueVisitDto
                {
                    HouseholdId = h.Id,
                    HouseholdCode = h.HouseholdCode,
                    HeadOfHousehold = h.HeadOfHousehold,
                    Address = h.Address,
                    WardName = h.WardName,
                    RiskLevel = h.RiskLevel,
                    LastVisitDate = h.LastVisitDate.HasValue ? h.LastVisitDate.Value.ToString("yyyy-MM-dd") : null,
                    NextVisitDate = h.NextVisitDate!.Value.ToString("yyyy-MM-dd"),
                    DaysOverdue = (int)(now - h.NextVisitDate!.Value).TotalDays,
                    AssignedTeamName = h.AssignedTeam != null ? h.AssignedTeam.TeamName : null,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<OverdueVisitDto>();
        }
    }

    // ==================== NCD Screenings ====================

    public async Task<List<NcdScreeningListDto>> SearchNcdScreeningsAsync(NcdScreeningSearchDto? filter = null)
    {
        try
        {
            var query = _context.NcdScreenings
                .Include(s => s.Patient)
                .Where(s => !s.IsDeleted)
                .AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(s =>
                        (s.Patient != null && (s.Patient.FullName.ToLower().Contains(kw) || s.Patient.PatientCode.ToLower().Contains(kw))) ||
                        (s.Diagnosis != null && s.Diagnosis.ToLower().Contains(kw))
                    );
                }
                if (filter.PatientId.HasValue)
                    query = query.Where(s => s.PatientId == filter.PatientId.Value);
                if (!string.IsNullOrEmpty(filter.ScreeningType))
                    query = query.Where(s => s.ScreeningType == filter.ScreeningType);
                if (filter.RiskLevel.HasValue)
                    query = query.Where(s => s.RiskLevel == filter.RiskLevel.Value);
                if (filter.ReferredOnly == true)
                    query = query.Where(s => s.ReferredToFacility);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(s => s.ScreeningDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(s => s.ScreeningDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(s => s.ScreeningDate)
                .ThenBy(s => s.Id)
                .Take(200)
                .Select(s => new NcdScreeningListDto
                {
                    Id = s.Id,
                    PatientId = s.PatientId,
                    PatientName = s.Patient != null ? s.Patient.FullName : null,
                    PatientCode = s.Patient != null ? s.Patient.PatientCode : null,
                    ScreeningDate = s.ScreeningDate.ToString("yyyy-MM-dd"),
                    ScreeningType = s.ScreeningType,
                    SystolicBP = s.SystolicBP,
                    DiastolicBP = s.DiastolicBP,
                    FastingGlucose = s.FastingGlucose,
                    HbA1c = s.HbA1c,
                    BMI = s.BMI,
                    CVDRiskScore = s.CVDRiskScore,
                    RiskLevel = s.RiskLevel,
                    Diagnosis = s.Diagnosis,
                    ReferredToFacility = s.ReferredToFacility,
                    ScreenedBy = s.ScreenedBy,
                    FollowUpDate = s.FollowUpDate.HasValue ? s.FollowUpDate.Value.ToString("yyyy-MM-dd") : null,
                    SmokingStatus = s.SmokingStatus,
                    AlcoholUse = s.AlcoholUse,
                    Gender = s.Patient != null ? s.Patient.Gender : null,
                    DateOfBirth = s.Patient != null && s.Patient.DateOfBirth.HasValue ? s.Patient.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<NcdScreeningListDto>();
        }
    }

    public async Task<NcdScreeningListDto?> GetNcdScreeningByIdAsync(Guid id)
    {
        var s = await _context.NcdScreenings
            .Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (s == null) return null;

        return new NcdScreeningListDto
        {
            Id = s.Id,
            PatientId = s.PatientId,
            PatientName = s.Patient?.FullName,
            PatientCode = s.Patient?.PatientCode,
            ScreeningDate = s.ScreeningDate.ToString("yyyy-MM-dd"),
            ScreeningType = s.ScreeningType,
            SystolicBP = s.SystolicBP,
            DiastolicBP = s.DiastolicBP,
            FastingGlucose = s.FastingGlucose,
            HbA1c = s.HbA1c,
            BMI = s.BMI,
            CVDRiskScore = s.CVDRiskScore,
            RiskLevel = s.RiskLevel,
            Diagnosis = s.Diagnosis,
            ReferredToFacility = s.ReferredToFacility,
            ScreenedBy = s.ScreenedBy,
        };
    }

    public async Task<NcdScreeningListDto> CreateNcdScreeningAsync(NcdScreeningCreateDto dto, string? userId)
    {
        // QA-R2: a screening without a real patient was saved with PatientId = Guid.Empty (orphan, no name).
        if (dto.PatientId == Guid.Empty || !await _context.Patients.AnyAsync(p => p.Id == dto.PatientId && !p.IsDeleted))
            throw new ArgumentException("Chưa chọn bệnh nhân hợp lệ cho phiếu sàng lọc.");
        if (dto.SystolicBP is < 40 or > 300 || dto.DiastolicBP is < 20 or > 200
            || (dto.SystolicBP.HasValue && dto.DiastolicBP.HasValue && dto.DiastolicBP >= dto.SystolicBP))
            throw new ArgumentException("Huyết áp không hợp lệ.");

        // Calculate CVD risk score based on WHO/ISH risk charts (simplified)
        var riskScore = CalculateCVDRiskScore(dto);
        var riskLevel = riskScore < 10 ? 0 : riskScore < 20 ? 1 : riskScore < 30 ? 2 : 3;

        var entity = new NcdScreening
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            ScreeningDate = DateTime.TryParse(dto.ScreeningDate, out var sd) ? sd : DateTime.UtcNow,
            ScreeningType = dto.ScreeningType,
            SystolicBP = dto.SystolicBP,
            DiastolicBP = dto.DiastolicBP,
            FastingGlucose = dto.FastingGlucose,
            RandomGlucose = dto.RandomGlucose,
            HbA1c = dto.HbA1c,
            BMI = dto.BMI,
            WaistCircumference = dto.WaistCircumference,
            SmokingStatus = dto.SmokingStatus,
            AlcoholUse = dto.AlcoholUse,
            PhysicalActivity = dto.PhysicalActivity,
            FamilyHistory = dto.FamilyHistory,
            CVDRiskScore = riskScore,
            RiskLevel = riskLevel,
            Diagnosis = dto.Diagnosis,
            ReferredToFacility = dto.ReferredToFacility,
            FollowUpDate = DateTime.TryParse(dto.FollowUpDate, out var fud) ? fud : null,
            ScreenedBy = dto.ScreenedBy,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };

        _context.NcdScreenings.Add(entity);
        await _context.SaveChangesAsync();

        var patient = await _context.Patients.FindAsync(dto.PatientId);

        return new NcdScreeningListDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = patient?.FullName,
            PatientCode = patient?.PatientCode,
            ScreeningDate = entity.ScreeningDate.ToString("yyyy-MM-dd"),
            ScreeningType = entity.ScreeningType,
            SystolicBP = entity.SystolicBP,
            DiastolicBP = entity.DiastolicBP,
            FastingGlucose = entity.FastingGlucose,
            HbA1c = entity.HbA1c,
            BMI = entity.BMI,
            CVDRiskScore = entity.CVDRiskScore,
            RiskLevel = entity.RiskLevel,
            Diagnosis = entity.Diagnosis,
            ReferredToFacility = entity.ReferredToFacility,
            ScreenedBy = entity.ScreenedBy,
        };
    }

    public async Task<NcdScreeningListDto> UpdateNcdScreeningAsync(Guid id, NcdScreeningUpdateDto dto)
    {
        var entity = await _context.NcdScreenings
            .Include(s => s.Patient)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted)
            ?? throw new InvalidOperationException("Screening not found");

        if (dto.SystolicBP.HasValue) entity.SystolicBP = dto.SystolicBP.Value;
        if (dto.DiastolicBP.HasValue) entity.DiastolicBP = dto.DiastolicBP.Value;
        if (dto.FastingGlucose.HasValue) entity.FastingGlucose = dto.FastingGlucose.Value;
        if (dto.RandomGlucose.HasValue) entity.RandomGlucose = dto.RandomGlucose.Value;
        if (dto.HbA1c.HasValue) entity.HbA1c = dto.HbA1c.Value;
        if (dto.BMI.HasValue) entity.BMI = dto.BMI.Value;
        if (dto.WaistCircumference.HasValue) entity.WaistCircumference = dto.WaistCircumference.Value;
        if (dto.SmokingStatus.HasValue) entity.SmokingStatus = dto.SmokingStatus.Value;
        if (dto.AlcoholUse.HasValue) entity.AlcoholUse = dto.AlcoholUse.Value;
        if (dto.PhysicalActivity.HasValue) entity.PhysicalActivity = dto.PhysicalActivity.Value;
        if (dto.FamilyHistory != null) entity.FamilyHistory = dto.FamilyHistory;
        if (dto.CVDRiskScore.HasValue) entity.CVDRiskScore = dto.CVDRiskScore.Value;
        if (dto.RiskLevel.HasValue) entity.RiskLevel = dto.RiskLevel.Value;
        if (dto.Diagnosis != null) entity.Diagnosis = dto.Diagnosis;
        if (dto.ReferredToFacility.HasValue) entity.ReferredToFacility = dto.ReferredToFacility.Value;
        if (!string.IsNullOrEmpty(dto.FollowUpDate) && DateTime.TryParse(dto.FollowUpDate, out var fud))
            entity.FollowUpDate = fud;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new NcdScreeningListDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientName = entity.Patient?.FullName,
            PatientCode = entity.Patient?.PatientCode,
            ScreeningDate = entity.ScreeningDate.ToString("yyyy-MM-dd"),
            ScreeningType = entity.ScreeningType,
            SystolicBP = entity.SystolicBP,
            DiastolicBP = entity.DiastolicBP,
            FastingGlucose = entity.FastingGlucose,
            HbA1c = entity.HbA1c,
            BMI = entity.BMI,
            CVDRiskScore = entity.CVDRiskScore,
            RiskLevel = entity.RiskLevel,
            Diagnosis = entity.Diagnosis,
            ReferredToFacility = entity.ReferredToFacility,
            ScreenedBy = entity.ScreenedBy,
        };
    }

    public async Task<NcdStatsDto> GetNcdStatsAsync()
    {
        try
        {
            var screenings = await _context.NcdScreenings
                .Where(s => !s.IsDeleted)
                .ToListAsync();

            var hypertension = screenings.Count(s => s.SystolicBP >= 140 || s.DiastolicBP >= 90);
            var diabetes = screenings.Count(s => s.FastingGlucose >= 7.0m || s.HbA1c >= 6.5m);
            var cvdScores = screenings.Where(s => s.CVDRiskScore.HasValue).Select(s => (double)s.CVDRiskScore!.Value).ToList();

            return new NcdStatsDto
            {
                TotalScreenings = screenings.Count,
                HighRiskCount = screenings.Count(s => s.RiskLevel >= 2),
                ReferredCount = screenings.Count(s => s.ReferredToFacility),
                HypertensionDetected = hypertension,
                DiabetesDetected = diabetes,
                AverageCVDRisk = cvdScores.Count > 0 ? Math.Round(cvdScores.Average(), 1) : 0,
                ByType = screenings
                    .GroupBy(s => s.ScreeningType)
                    .Select(g => new NcdScreeningByTypeDto { ScreeningType = g.Key, Count = g.Count() })
                    .ToList(),
                ByRisk = screenings
                    .GroupBy(s => s.RiskLevel)
                    .Select(g => new NcdScreeningByRiskDto { RiskLevel = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new NcdStatsDto();
        }
    }

    // ==================== Teams ====================

    public async Task<List<TeamListDto>> SearchTeamsAsync(TeamSearchDto? filter = null)
    {
        try
        {
            var query = _context.CommunityHealthTeams
                .Where(t => !t.IsDeleted)
                .AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(t =>
                        t.TeamCode.ToLower().Contains(kw) ||
                        t.TeamName.ToLower().Contains(kw) ||
                        (t.LeaderName != null && t.LeaderName.ToLower().Contains(kw))
                    );
                }
                if (filter.Status.HasValue)
                    query = query.Where(t => t.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.AssignedWard))
                    query = query.Where(t => t.AssignedWard == filter.AssignedWard);
            }

            // QA-R11: ActiveHouseholds was a stored counter only refreshed by a team edit (always 0 on the list),
            // and the page's "Bao phủ" column had no source at all → both computed live here.
            var since = DateTime.UtcNow.AddDays(-90);
            var teams = await query
                .OrderBy(t => t.TeamCode)
                .ThenBy(t => t.Id)
                .Take(200)
                .Select(t => new
                {
                    Dto = new TeamListDto
                    {
                        Id = t.Id,
                        TeamCode = t.TeamCode,
                        TeamName = t.TeamName,
                        LeaderName = t.LeaderName,
                        AssignedWard = t.AssignedWard,
                        MemberCount = t.MemberCount,
                        ActiveHouseholds = t.ActiveHouseholds,
                        Status = t.Status,
                        EstablishedDate = t.EstablishedDate.HasValue ? t.EstablishedDate.Value.ToString("yyyy-MM-dd") : null,
                    },
                    Households = _context.HouseholdHealthRecords.Count(h => h.AssignedTeamId == t.Id && !h.IsDeleted),
                    Visited = _context.HouseholdHealthRecords.Count(h => h.AssignedTeamId == t.Id && !h.IsDeleted
                        && h.LastVisitDate.HasValue && h.LastVisitDate.Value >= since),
                })
                .ToListAsync();
            foreach (var t in teams)
            {
                t.Dto.ActiveHouseholds = t.Households;
                t.Dto.VisitCoverage = t.Households > 0 ? (int)Math.Round(100.0 * t.Visited / t.Households) : 0;
            }
            return teams.Select(t => t.Dto).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<TeamListDto>();
        }
    }

    public async Task<TeamListDto?> GetTeamByIdAsync(Guid id)
    {
        var t = await _context.CommunityHealthTeams
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (t == null) return null;

        return new TeamListDto
        {
            Id = t.Id,
            TeamCode = t.TeamCode,
            TeamName = t.TeamName,
            LeaderName = t.LeaderName,
            AssignedWard = t.AssignedWard,
            MemberCount = t.MemberCount,
            ActiveHouseholds = t.ActiveHouseholds,
            Status = t.Status,
            EstablishedDate = t.EstablishedDate?.ToString("yyyy-MM-dd"),
        };
    }

    public async Task<TeamListDto> CreateTeamAsync(TeamCreateDto dto, string? userId)
    {
        var entity = new CommunityHealthTeam
        {
            Id = Guid.NewGuid(),
            TeamCode = dto.TeamCode,
            TeamName = dto.TeamName,
            LeaderName = dto.LeaderName,
            LeaderId = dto.LeaderId,
            AssignedWard = dto.AssignedWard,
            MemberCount = dto.MemberCount,
            ActiveHouseholds = 0,
            Status = 0, // Active
            EstablishedDate = DateTime.TryParse(dto.EstablishedDate, out var ed) ? ed : DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };

        _context.CommunityHealthTeams.Add(entity);
        await _context.SaveChangesAsync();

        return new TeamListDto
        {
            Id = entity.Id,
            TeamCode = entity.TeamCode,
            TeamName = entity.TeamName,
            LeaderName = entity.LeaderName,
            AssignedWard = entity.AssignedWard,
            MemberCount = entity.MemberCount,
            ActiveHouseholds = entity.ActiveHouseholds,
            Status = entity.Status,
            EstablishedDate = entity.EstablishedDate?.ToString("yyyy-MM-dd"),
        };
    }

    public async Task<TeamListDto> UpdateTeamAsync(Guid id, TeamUpdateDto dto)
    {
        var entity = await _context.CommunityHealthTeams.FindAsync(id);
        if (entity == null || entity.IsDeleted) throw new KeyNotFoundException("Không tìm thấy đội y tế.");
        if (dto.Status is < 0 or > 1)
            throw new ArgumentException("Trạng thái đội không hợp lệ.", nameof(dto.Status));

        if (dto.TeamName != null) entity.TeamName = dto.TeamName;
        if (dto.LeaderName != null) entity.LeaderName = dto.LeaderName;
        if (dto.LeaderId.HasValue) entity.LeaderId = dto.LeaderId.Value;
        if (dto.AssignedWard != null) entity.AssignedWard = dto.AssignedWard;
        if (dto.MemberCount.HasValue) entity.MemberCount = dto.MemberCount.Value;
        if (dto.Status.HasValue) entity.Status = dto.Status.Value;

        // Recalculate active households
        entity.ActiveHouseholds = await _context.HouseholdHealthRecords
            .CountAsync(h => h.AssignedTeamId == id && !h.IsDeleted);

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new TeamListDto
        {
            Id = entity.Id,
            TeamCode = entity.TeamCode,
            TeamName = entity.TeamName,
            LeaderName = entity.LeaderName,
            AssignedWard = entity.AssignedWard,
            MemberCount = entity.MemberCount,
            ActiveHouseholds = entity.ActiveHouseholds,
            Status = entity.Status,
            EstablishedDate = entity.EstablishedDate?.ToString("yyyy-MM-dd"),
        };
    }

    public async Task DeleteTeamAsync(Guid id)
    {
        var entity = await _context.CommunityHealthTeams.FindAsync(id)
            ?? throw new InvalidOperationException("Team not found");
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    // ==================== Helpers ====================

    /// <summary>
    /// Simplified WHO/ISH CVD risk calculation (percentage 10-year risk)
    /// Based on age, gender, systolic BP, smoking, diabetes, cholesterol
    /// </summary>
    private static decimal CalculateCVDRiskScore(NcdScreeningCreateDto dto)
    {
        decimal score = 0;

        // Hypertension risk
        if (dto.SystolicBP >= 180) score += 15;
        else if (dto.SystolicBP >= 160) score += 10;
        else if (dto.SystolicBP >= 140) score += 5;

        // Diabetes risk
        if (dto.FastingGlucose >= 7.0m || dto.HbA1c >= 6.5m) score += 10;
        else if (dto.FastingGlucose >= 5.6m || dto.HbA1c >= 5.7m) score += 3;

        // Smoking
        if (dto.SmokingStatus == 2) score += 8; // current
        else if (dto.SmokingStatus == 1) score += 3; // former

        // BMI
        if (dto.BMI >= 30) score += 5;
        else if (dto.BMI >= 25) score += 2;

        // Physical inactivity
        if (dto.PhysicalActivity == 0) score += 3;

        // Alcohol
        if (dto.AlcoholUse >= 3) score += 3;

        // Family history
        if (!string.IsNullOrEmpty(dto.FamilyHistory)) score += 5;

        return Math.Min(score, 50); // cap at 50%
    }
}
