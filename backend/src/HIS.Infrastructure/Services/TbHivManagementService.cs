using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class TbHivManagementService : ITbHivManagementService
{
    private readonly HISDbContext _context;

    public TbHivManagementService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<TbHivRecordListDto>> SearchRecordsAsync(TbHivSearchDto filter)
    {
        try
        {
            var query = _context.TbHivRecords
                .Include(r => r.Patient)
                .Include(r => r.Doctor)
                .Include(r => r.Department)
                .Include(r => r.FollowUps)
                .Where(r => !r.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(r =>
                    r.RegistrationCode.ToLower().Contains(kw) ||
                    (r.Patient != null && (r.Patient.FullName.ToLower().Contains(kw) || r.Patient.PatientCode.ToLower().Contains(kw)))
                );
            }
            if (!string.IsNullOrEmpty(filter.RecordType))
                query = query.Where(r => r.RecordType == filter.RecordType);
            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(r => r.Status == filter.Status);
            if (!string.IsNullOrEmpty(filter.TreatmentCategory))
                query = query.Where(r => r.TreatmentCategory == filter.TreatmentCategory);
            if (filter.DoctorId.HasValue)
                query = query.Where(r => r.DoctorId == filter.DoctorId.Value);
            if (filter.DepartmentId.HasValue)
                query = query.Where(r => r.DepartmentId == filter.DepartmentId.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(r => r.RegistrationDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(r => r.RegistrationDate <= to.AddDays(1));

            var skip = filter.PageIndex * filter.PageSize;

            return await query
                .OrderByDescending(r => r.RegistrationDate)
                .Skip(skip)
                .Take(filter.PageSize)
                .Select(r => new TbHivRecordListDto
                {
                    Id = r.Id,
                    PatientId = r.PatientId,
                    PatientName = r.Patient != null ? r.Patient.FullName : "",
                    PatientCode = r.Patient != null ? r.Patient.PatientCode : "",
                    Gender = r.Patient != null ? r.Patient.Gender : null,
                    DateOfBirth = r.Patient != null && r.Patient.DateOfBirth.HasValue ? r.Patient.DateOfBirth.Value.ToString("yyyy-MM-dd") : null,
                    RecordType = r.RecordType,
                    RegistrationCode = r.RegistrationCode,
                    RegistrationDate = r.RegistrationDate.ToString("yyyy-MM-dd"),
                    TreatmentCategory = r.TreatmentCategory,
                    TreatmentRegimen = r.TreatmentRegimen,
                    TreatmentStartDate = r.TreatmentStartDate.HasValue ? r.TreatmentStartDate.Value.ToString("yyyy-MM-dd") : null,
                    Status = r.Status,
                    DoctorName = r.Doctor != null ? r.Doctor.FullName : null,
                    DepartmentName = r.Department != null ? r.Department.DepartmentName : null,
                    TotalFollowUps = r.FollowUps.Count(f => !f.IsDeleted),
                    LastFollowUpDate = r.FollowUps.Where(f => !f.IsDeleted).OrderByDescending(f => f.VisitDate).Select(f => f.VisitDate.ToString("yyyy-MM-dd")).FirstOrDefault(),
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<TbHivRecordListDto>();
        }
    }

    public async Task<TbHivRecordDetailDto?> GetRecordByIdAsync(Guid id)
    {
        try
        {
            var r = await _context.TbHivRecords
                .Include(r => r.Patient)
                .Include(r => r.Doctor)
                .Include(r => r.Department)
                .Include(r => r.FollowUps.Where(f => !f.IsDeleted))
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

            if (r == null) return null;

            return new TbHivRecordDetailDto
            {
                Id = r.Id,
                PatientId = r.PatientId,
                PatientName = r.Patient?.FullName ?? "",
                PatientCode = r.Patient?.PatientCode ?? "",
                Gender = r.Patient?.Gender,
                DateOfBirth = r.Patient?.DateOfBirth?.ToString("yyyy-MM-dd"),
                RecordType = r.RecordType,
                RegistrationCode = r.RegistrationCode,
                RegistrationDate = r.RegistrationDate.ToString("yyyy-MM-dd"),
                TreatmentCategory = r.TreatmentCategory,
                TreatmentRegimen = r.TreatmentRegimen,
                TreatmentStartDate = r.TreatmentStartDate?.ToString("yyyy-MM-dd"),
                ExpectedEndDate = r.ExpectedEndDate?.ToString("yyyy-MM-dd"),
                Status = r.Status,
                SmearResult = r.SmearResult,
                GeneXpertResult = r.GeneXpertResult,
                TbSite = r.TbSite,
                IsMdr = r.IsMdr,
                Cd4Count = r.Cd4Count,
                ViralLoad = r.ViralLoad,
                ArtRegimen = r.ArtRegimen,
                ArtStartDate = r.ArtStartDate?.ToString("yyyy-MM-dd"),
                WhoStage = r.WhoStage,
                DotProvider = r.DotProvider,
                DotProviderPhone = r.DotProviderPhone,
                OutcomeDate = r.OutcomeDate?.ToString("yyyy-MM-dd"),
                OutcomeNotes = r.OutcomeNotes,
                DoctorId = r.DoctorId,
                DepartmentId = r.DepartmentId,
                DoctorName = r.Doctor?.FullName,
                DepartmentName = r.Department?.DepartmentName,
                Notes = r.Notes,
                CreatedAt = r.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
                TotalFollowUps = r.FollowUps.Count,
                LastFollowUpDate = r.FollowUps.OrderByDescending(f => f.VisitDate).Select(f => f.VisitDate.ToString("yyyy-MM-dd")).FirstOrDefault(),
                FollowUps = r.FollowUps.OrderByDescending(f => f.VisitDate).Select(f => new TbHivFollowUpDto
                {
                    Id = f.Id,
                    TbHivRecordId = f.TbHivRecordId,
                    VisitDate = f.VisitDate.ToString("yyyy-MM-dd"),
                    TreatmentMonth = f.TreatmentMonth,
                    Weight = f.Weight,
                    SmearResult = f.SmearResult,
                    CultureResult = f.CultureResult,
                    Cd4Count = f.Cd4Count,
                    ViralLoad = f.ViralLoad,
                    DrugAdherence = f.DrugAdherence,
                    SideEffects = f.SideEffects,
                    RegimenChanged = f.RegimenChanged,
                    NewRegimen = f.NewRegimen,
                    Notes = f.Notes,
                    ExaminationId = f.ExaminationId,
                }).ToList(),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<TbHivRecordDetailDto> CreateRecordAsync(CreateTbHivRecordDto dto)
    {
        // Auto-generate registration code: TB-YYYY-NNNN or HIV-YYYY-NNNN
        var prefix = dto.RecordType == "HIV" ? "HIV" : "TB";
        var yearStr = DateTime.UtcNow.Year.ToString();
        var yearCount = await _context.TbHivRecords
            .Where(r => r.RegistrationCode.StartsWith($"{prefix}-{yearStr}"))
            .CountAsync();
        var registrationCode = $"{prefix}-{yearStr}-{(yearCount + 1):D4}";

        var record = new TbHivRecord
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            RecordType = dto.RecordType,
            RegistrationDate = DateTime.TryParse(dto.RegistrationDate, out var rd) ? rd : DateTime.UtcNow,
            RegistrationCode = registrationCode,
            TreatmentCategory = dto.TreatmentCategory,
            TreatmentRegimen = dto.TreatmentRegimen,
            TreatmentStartDate = DateTime.TryParse(dto.TreatmentStartDate, out var tsd) ? tsd : null,
            ExpectedEndDate = DateTime.TryParse(dto.ExpectedEndDate, out var eed) ? eed : null,
            Status = "OnTreatment",
            SmearResult = dto.SmearResult,
            GeneXpertResult = dto.GeneXpertResult,
            TbSite = dto.TbSite,
            IsMdr = dto.IsMdr,
            Cd4Count = dto.Cd4Count,
            ViralLoad = dto.ViralLoad,
            ArtRegimen = dto.ArtRegimen,
            ArtStartDate = DateTime.TryParse(dto.ArtStartDate, out var asd) ? asd : null,
            WhoStage = dto.WhoStage,
            DotProvider = dto.DotProvider,
            DotProviderPhone = dto.DotProviderPhone,
            DoctorId = dto.DoctorId,
            DepartmentId = dto.DepartmentId,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.TbHivRecords.Add(record);
        await _context.SaveChangesAsync();

        return (await GetRecordByIdAsync(record.Id))!;
    }

    public async Task<TbHivRecordDetailDto> UpdateRecordAsync(Guid id, UpdateTbHivRecordDto dto)
    {
        var record = await _context.TbHivRecords.FindAsync(id)
            ?? throw new InvalidOperationException("Record not found");

        if (dto.TreatmentRegimen != null) record.TreatmentRegimen = dto.TreatmentRegimen;
        if (dto.TreatmentStartDate != null && DateTime.TryParse(dto.TreatmentStartDate, out var tsd)) record.TreatmentStartDate = tsd;
        if (dto.ExpectedEndDate != null && DateTime.TryParse(dto.ExpectedEndDate, out var eed)) record.ExpectedEndDate = eed;
        if (dto.SmearResult != null) record.SmearResult = dto.SmearResult;
        if (dto.GeneXpertResult != null) record.GeneXpertResult = dto.GeneXpertResult;
        if (dto.TbSite != null) record.TbSite = dto.TbSite;
        if (dto.IsMdr.HasValue) record.IsMdr = dto.IsMdr.Value;
        if (dto.Cd4Count.HasValue) record.Cd4Count = dto.Cd4Count.Value;
        if (dto.ViralLoad.HasValue) record.ViralLoad = dto.ViralLoad.Value;
        if (dto.ArtRegimen != null) record.ArtRegimen = dto.ArtRegimen;
        if (dto.ArtStartDate != null && DateTime.TryParse(dto.ArtStartDate, out var asd)) record.ArtStartDate = asd;
        if (dto.WhoStage != null) record.WhoStage = dto.WhoStage;
        if (dto.DotProvider != null) record.DotProvider = dto.DotProvider;
        if (dto.DotProviderPhone != null) record.DotProviderPhone = dto.DotProviderPhone;
        if (dto.DoctorId.HasValue) record.DoctorId = dto.DoctorId.Value;
        if (dto.DepartmentId.HasValue) record.DepartmentId = dto.DepartmentId.Value;
        if (dto.Notes != null) record.Notes = dto.Notes;
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (await GetRecordByIdAsync(id))!;
    }

    public async Task<bool> CloseRecordAsync(Guid id, CloseTbHivRecordDto dto)
    {
        var record = await _context.TbHivRecords.FindAsync(id);
        if (record == null || record.IsDeleted) return false;

        record.Status = dto.Status;
        record.OutcomeDate = DateTime.UtcNow;
        record.OutcomeNotes = dto.OutcomeNotes;
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<TbHivFollowUpDto>> GetFollowUpsAsync(Guid recordId)
    {
        try
        {
            return await _context.TbHivFollowUps
                .Where(f => f.TbHivRecordId == recordId && !f.IsDeleted)
                .OrderByDescending(f => f.VisitDate)
                .Select(f => new TbHivFollowUpDto
                {
                    Id = f.Id,
                    TbHivRecordId = f.TbHivRecordId,
                    VisitDate = f.VisitDate.ToString("yyyy-MM-dd"),
                    TreatmentMonth = f.TreatmentMonth,
                    Weight = f.Weight,
                    SmearResult = f.SmearResult,
                    CultureResult = f.CultureResult,
                    Cd4Count = f.Cd4Count,
                    ViralLoad = f.ViralLoad,
                    DrugAdherence = f.DrugAdherence,
                    SideEffects = f.SideEffects,
                    RegimenChanged = f.RegimenChanged,
                    NewRegimen = f.NewRegimen,
                    Notes = f.Notes,
                    ExaminationId = f.ExaminationId,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<TbHivFollowUpDto>();
        }
    }

    public async Task<TbHivFollowUpDto> CreateFollowUpAsync(Guid recordId, CreateTbHivFollowUpDto dto)
    {
        _ = await _context.TbHivRecords.FindAsync(recordId)
            ?? throw new InvalidOperationException("Record not found");

        var followUp = new TbHivFollowUp
        {
            Id = Guid.NewGuid(),
            TbHivRecordId = recordId,
            VisitDate = DateTime.TryParse(dto.VisitDate, out var vd) ? vd : DateTime.UtcNow,
            TreatmentMonth = dto.TreatmentMonth,
            Weight = dto.Weight,
            SmearResult = dto.SmearResult,
            CultureResult = dto.CultureResult,
            Cd4Count = dto.Cd4Count,
            ViralLoad = dto.ViralLoad,
            DrugAdherence = dto.DrugAdherence,
            SideEffects = dto.SideEffects,
            RegimenChanged = dto.RegimenChanged,
            NewRegimen = dto.NewRegimen,
            Notes = dto.Notes,
            ExaminationId = dto.ExaminationId,
            CreatedAt = DateTime.UtcNow,
        };

        _context.TbHivFollowUps.Add(followUp);
        await _context.SaveChangesAsync();

        return new TbHivFollowUpDto
        {
            Id = followUp.Id,
            TbHivRecordId = followUp.TbHivRecordId,
            VisitDate = followUp.VisitDate.ToString("yyyy-MM-dd"),
            TreatmentMonth = followUp.TreatmentMonth,
            Weight = followUp.Weight,
            SmearResult = followUp.SmearResult,
            CultureResult = followUp.CultureResult,
            Cd4Count = followUp.Cd4Count,
            ViralLoad = followUp.ViralLoad,
            DrugAdherence = followUp.DrugAdherence,
            SideEffects = followUp.SideEffects,
            RegimenChanged = followUp.RegimenChanged,
            NewRegimen = followUp.NewRegimen,
            Notes = followUp.Notes,
            ExaminationId = followUp.ExaminationId,
        };
    }

    public async Task<TbHivStatsDto> GetStatisticsAsync()
    {
        try
        {
            var records = await _context.TbHivRecords
                .Where(r => !r.IsDeleted)
                .ToListAsync();

            var categoryBreakdown = records
                .GroupBy(r => r.TreatmentCategory)
                .Select(g => new TbHivCategoryBreakdownDto
                {
                    TreatmentCategory = g.Key,
                    Count = g.Count(),
                })
                .ToList();

            return new TbHivStatsDto
            {
                TotalRecords = records.Count,
                TbCount = records.Count(r => r.RecordType == "TB"),
                HivCount = records.Count(r => r.RecordType == "HIV"),
                TbHivCoinfectionCount = records.Count(r => r.RecordType == "TB_HIV"),
                OnTreatmentCount = records.Count(r => r.Status == "OnTreatment"),
                CompletedCount = records.Count(r => r.Status == "Completed"),
                FailedCount = records.Count(r => r.Status == "Failed"),
                DefaultedCount = records.Count(r => r.Status == "DefaultedLostToFollowUp"),
                DiedCount = records.Count(r => r.Status == "Died"),
                TransferredOutCount = records.Count(r => r.Status == "TransferredOut"),
                MdrTbCount = records.Count(r => r.IsMdr),
                CategoryBreakdown = categoryBreakdown,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new TbHivStatsDto();
        }
    }

    public async Task<List<TbHivTreatmentOutcomeDto>> GetTreatmentOutcomesAsync(string? fromDate, string? toDate)
    {
        try
        {
            var query = _context.TbHivRecords
                .Where(r => !r.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(fromDate) && DateTime.TryParse(fromDate, out var from))
                query = query.Where(r => r.RegistrationDate >= from);
            if (!string.IsNullOrEmpty(toDate) && DateTime.TryParse(toDate, out var to))
                query = query.Where(r => r.RegistrationDate <= to.AddDays(1));

            var records = await query.ToListAsync();

            var outcomes = new List<TbHivTreatmentOutcomeDto>();
            foreach (var type in new[] { "TB", "HIV", "TB_HIV" })
            {
                var typeRecords = records.Where(r => r.RecordType == type).ToList();
                if (typeRecords.Count == 0) continue;

                var completed = typeRecords.Count(r => r.Status == "Completed");
                var total = typeRecords.Count;

                outcomes.Add(new TbHivTreatmentOutcomeDto
                {
                    RecordType = type,
                    Total = total,
                    Completed = completed,
                    Failed = typeRecords.Count(r => r.Status == "Failed"),
                    Defaulted = typeRecords.Count(r => r.Status == "DefaultedLostToFollowUp"),
                    Died = typeRecords.Count(r => r.Status == "Died"),
                    TransferredOut = typeRecords.Count(r => r.Status == "TransferredOut"),
                    StillOnTreatment = typeRecords.Count(r => r.Status == "OnTreatment"),
                    CompletionRate = total > 0 ? Math.Round((double)completed / total * 100, 1) : 0,
                });
            }

            return outcomes;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<TbHivTreatmentOutcomeDto>();
        }
    }
}
