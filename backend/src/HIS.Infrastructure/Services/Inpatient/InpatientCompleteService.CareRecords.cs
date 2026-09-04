using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// wave-8a (2026-07-17): tach khoi InpatientCompleteService.Treatment.cs (PURE VERBATIM, khong doi logic).
public partial class InpatientCompleteService {
    #region 3.6 Treatment Information — Infusion / Blood Transfusion / Drug Reaction / Injury / Newborn / Hemodialysis
    // #16 (2026-06-11): persist thật vào bảng InfusionRecords (mig 94) — trước đây echo-fake,
    // FE báo "Đã ghi nhận truyền dịch" nhưng KHÔNG lưu gì (patient-safety).
    public async Task<InfusionRecordDto> CreateInfusionRecordAsync(CreateInfusionRecordDto dto, Guid userId)
    {
        var entity = new InfusionRecord
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            FluidName = dto.FluidName,
            Volume = dto.Volume,
            DropRate = dto.DropRate,
            StartTime = dto.StartTime,
            Route = dto.Route,
            AdditionalMedication = dto.AdditionalMedication,
            StartedBy = userId,
            Status = 0, // Đang truyền
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
            IsDeleted = false,
        };
        _context.InfusionRecords.Add(entity);
        await _context.SaveChangesAsync();
        return await MapInfusionDtoAsync(entity);
    }

    public async Task<InfusionRecordDto> UpdateInfusionRecordAsync(Guid id, string observations, string? complications, Guid userId)
    {
        var entity = await _context.InfusionRecords.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu truyền dịch");
        entity.Observations = observations;
        entity.Complications = complications;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await MapInfusionDtoAsync(entity);
    }

    public async Task<InfusionRecordDto> CompleteInfusionAsync(Guid id, DateTime endTime, Guid userId)
    {
        var entity = await _context.InfusionRecords.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu truyền dịch");
        entity.EndTime = endTime;
        entity.DurationMinutes = (int)Math.Max(0, (endTime - entity.StartTime).TotalMinutes);
        entity.CompletedBy = userId;
        entity.Status = 1; // Hoàn thành
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await MapInfusionDtoAsync(entity);
    }

    private async Task<InfusionRecordDto> MapInfusionDtoAsync(InfusionRecord e)
    {
        var starter = await _context.Users.AsNoTracking()
            .Where(u => u.Id == e.StartedBy).Select(u => u.FullName).FirstOrDefaultAsync();
        return new InfusionRecordDto
        {
            Id = e.Id,
            AdmissionId = e.AdmissionId,
            FluidName = e.FluidName,
            Volume = e.Volume,
            DropRate = e.DropRate,
            StartTime = e.StartTime,
            EndTime = e.EndTime,
            DurationMinutes = e.DurationMinutes,
            Route = e.Route,
            AdditionalMedication = e.AdditionalMedication,
            StartedBy = e.StartedBy,
            StartedByName = starter ?? string.Empty,
            Observations = e.Observations,
            Complications = e.Complications,
            Status = e.Status,
        };
    }

    public Task<DateTime> CalculateInfusionEndTimeAsync(int volumeMl, int dropRate)
    {
        // Formula: duration (minutes) = volumeMl * 20 / dropRate
        // 20 drops = 1 ml (standard drip set)
        var durationMinutes = dropRate > 0 ? volumeMl * 20.0 / dropRate : 0;
        var endTime = DateTime.Now.AddMinutes(durationMinutes);
        return Task.FromResult(endTime);
    }

    public async Task<List<InfusionRecordDto>> GetInfusionRecordsAsync(Guid admissionId)
    {
        // #16: đọc thật từ bảng InfusionRecords (trước trả rỗng)
        var rows = await _context.InfusionRecords.AsNoTracking()
            .Where(x => x.AdmissionId == admissionId && !x.IsDeleted)
            .OrderByDescending(x => x.StartTime)
            .ToListAsync();
        var userIds = rows.Select(r => r.StartedBy).Distinct().ToList();
        var names = await _context.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);
        return rows.Select(e => new InfusionRecordDto
        {
            Id = e.Id,
            AdmissionId = e.AdmissionId,
            FluidName = e.FluidName,
            Volume = e.Volume,
            DropRate = e.DropRate,
            StartTime = e.StartTime,
            EndTime = e.EndTime,
            DurationMinutes = e.DurationMinutes,
            Route = e.Route,
            AdditionalMedication = e.AdditionalMedication,
            StartedBy = e.StartedBy,
            StartedByName = names.TryGetValue(e.StartedBy, out var n) ? n : string.Empty,
            Observations = e.Observations,
            Complications = e.Complications,
            Status = e.Status,
        }).ToList();
    }

    public async Task<byte[]> PrintInfusionRecordAsync(Guid id)
    {
        // #16: in từ dữ liệu thật bảng InfusionRecords (mig 94)
        var e = await _context.InfusionRecords.AsNoTracking()
            .Include(x => x.Admission).ThenInclude(a => a.Patient)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">THÔNG TIN TRUYỀN DỊCH</div>");
        if (e == null)
        {
            bodyContent.AppendLine($@"<p class=""text-italic"">Không tìm thấy phiếu truyền dịch {id}.</p>");
        }
        else
        {
            var starter = await _context.Users.AsNoTracking()
                .Where(u => u.Id == e.StartedBy).Select(u => u.FullName).FirstOrDefaultAsync();
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Bệnh nhân:</span><span class=""field-value"">{e.Admission?.Patient?.FullName} ({e.Admission?.Patient?.PatientCode})</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Dịch truyền:</span><span class=""field-value"">{e.FluidName}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Thể tích / tốc độ:</span><span class=""field-value"">{e.Volume} ml — {e.DropRate} giọt/phút</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Đường truyền:</span><span class=""field-value"">{e.Route ?? "—"}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Thuốc pha thêm:</span><span class=""field-value"">{e.AdditionalMedication ?? "—"}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Bắt đầu:</span><span class=""field-value"">{e.StartTime:dd/MM/yyyy HH:mm}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Kết thúc:</span><span class=""field-value"">{(e.EndTime.HasValue ? e.EndTime.Value.ToString("dd/MM/yyyy HH:mm") : "Đang truyền")}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Người thực hiện:</span><span class=""field-value"">{starter ?? "—"}</span></div>");
            if (!string.IsNullOrEmpty(e.Observations))
                bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Theo dõi:</span><span class=""field-value"">{e.Observations}</span></div>");
            if (!string.IsNullOrEmpty(e.Complications))
                bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Biến chứng:</span><span class=""field-value"">{e.Complications}</span></div>");
        }
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHIẾU THEO DÕI TRUYỀN DỊCH</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Phiếu theo dõi truyền dịch", body.ToString());
        return Encoding.UTF8.GetBytes(html);
    }

    public Task<BloodTransfusionDto> CreateBloodTransfusionAsync(CreateBloodTransfusionDto dto, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = dto.AdmissionId,
            BloodType = dto.BloodType,
            RhFactor = dto.RhFactor,
            BloodProductType = dto.BloodProductType,
            BagNumber = dto.BagNumber,
            Volume = dto.Volume,
            TransfusionStart = dto.TransfusionStart,
            DoctorOrderId = userId,
            ExecutedBy = userId,
            Status = 0 // Đang truyền
        });
    }

    public Task<BloodTransfusionDto> UpdateBloodTransfusionMonitoringAsync(Guid id, string preVitals, string duringVitals, string postVitals, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            PreTransfusionVitals = preVitals,
            DuringTransfusionVitals = duringVitals,
            PostTransfusionVitals = postVitals,
            ExecutedBy = userId,
            Status = 0 // Đang truyền
        });
    }

    public Task<BloodTransfusionDto> RecordTransfusionReactionAsync(Guid id, string reactionDetails, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            HasReaction = true,
            ReactionDetails = reactionDetails,
            ExecutedBy = userId,
            Status = 0
        });
    }

    public Task<BloodTransfusionDto> CompleteBloodTransfusionAsync(Guid id, DateTime endTime, Guid userId)
    {
        return Task.FromResult(new BloodTransfusionDto
        {
            Id = id,
            TransfusionEnd = endTime,
            ExecutedBy = userId,
            Status = 2 // Hoàn thành
        });
    }

    public Task<List<BloodTransfusionDto>> GetBloodTransfusionsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<BloodTransfusionDto>());
    }

    public async Task<byte[]> PrintBloodTransfusionAsync(Guid id)
    {
        // Blood transfusion records are in-memory DTOs; build generic form
        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">THÔNG TIN TRUYỀN MÁU</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã phiếu:</span><span class=""field-value"">{id}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");
        bodyContent.AppendLine($@"<p class=""text-italic"">Chi tiết truyền máu sẽ được cập nhật khi có bảng BloodTransfusions trong DB.</p>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">PHIẾU THEO DÕI TRUYỀN MÁU</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Phiếu theo dõi truyền máu", body.ToString());
        return await Task.FromResult(Encoding.UTF8.GetBytes(html));
    }

    public Task<DrugReactionRecordDto> CreateDrugReactionRecordAsync(Guid admissionId, Guid? medicineId, string medicineName, int severity, string symptoms, string? treatment, Guid userId)
    {
        return Task.FromResult(new DrugReactionRecordDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            MedicineId = medicineId,
            MedicineName = medicineName,
            ReactionTime = DateTime.Now,
            Severity = severity,
            Symptoms = symptoms,
            Treatment = treatment,
            ReportedBy = userId
        });
    }

    public Task<List<DrugReactionRecordDto>> GetDrugReactionRecordsAsync(Guid admissionId)
    {
        return Task.FromResult(new List<DrugReactionRecordDto>());
    }

    public async Task<byte[]> PrintDrugReactionRecordAsync(Guid id)
    {
        // Drug reaction records are in-memory DTOs; build generic form
        var bodyContent = new StringBuilder();
        bodyContent.AppendLine($@"<div class=""section-title"">BÁO CÁO PHẢN ỨNG THUỐC</div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Mã báo cáo:</span><span class=""field-value"">{id}</span></div>");
        bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày in:</span><span class=""field-value"">{DateTime.Now:dd/MM/yyyy HH:mm}</span></div>");
        bodyContent.AppendLine($@"<p class=""text-italic"">Chi tiết phản ứng thuốc sẽ được cập nhật khi có bảng DrugReactions trong DB.</p>");

        var body = new StringBuilder();
        body.AppendLine(GetHospitalHeader());
        body.AppendLine(@"<div class=""form-title"">BÁO CÁO PHẢN ỨNG THUỐC BẤT LỢI (ADR)</div>");
        body.AppendLine(bodyContent.ToString());
        body.AppendLine(GetSignatureBlock());

        var html = WrapHtmlPage("Báo cáo phản ứng thuốc bất lợi", body.ToString());
        return await Task.FromResult(Encoding.UTF8.GetBytes(html));
    }

    public Task<InjuryRecordDto> CreateInjuryRecordAsync(Guid admissionId, InjuryRecordDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.AdmissionId = admissionId;
        return Task.FromResult(dto);
    }

    public Task<InjuryRecordDto?> GetInjuryRecordAsync(Guid admissionId)
    {
        return Task.FromResult<InjuryRecordDto?>(null);
    }

    public async Task<NewbornRecordDto> CreateNewbornRecordAsync(Guid motherAdmissionId, NewbornRecordDto dto, Guid userId)
    {
        // Validate APGAR 0-10
        if (dto.ApgarScore1Min < 0 || dto.ApgarScore1Min > 10)
            throw new InvalidOperationException("Diem APGAR 1 phut phai tu 0 den 10.");
        if (dto.ApgarScore5Min < 0 || dto.ApgarScore5Min > 10)
            throw new InvalidOperationException("Diem APGAR 5 phut phai tu 0 den 10.");
        if (dto.ApgarScore10Min.HasValue && (dto.ApgarScore10Min.Value < 0 || dto.ApgarScore10Min.Value > 10))
            throw new InvalidOperationException("Diem APGAR 10 phut phai tu 0 den 10.");
        if (dto.BirthWeight <= 0)
            throw new InvalidOperationException("Can nang phai lon hon 0.");

        var entity = new NewbornRecord
        {
            Id                  = Guid.NewGuid(),
            MotherAdmissionId   = motherAdmissionId,
            BirthDate           = dto.BirthDate,
            BirthTime           = dto.BirthTime,
            Gender              = dto.Gender,
            BirthWeight         = dto.BirthWeight,
            BirthLength         = dto.BirthLength,
            HeadCircumference   = dto.HeadCircumference,
            ApgarScore1Min      = dto.ApgarScore1Min,
            ApgarScore5Min      = dto.ApgarScore5Min,
            ApgarScore10Min     = dto.ApgarScore10Min,
            DeliveryMethod      = dto.DeliveryMethod,
            Complications       = dto.Complications,
            InitialExamFindings = dto.InitialExamFindings,
            VitaminKGiven       = dto.VitaminKGiven,
            HepBVaccine         = dto.HepBVaccine,
            NewbornAdmissionId  = null, // mo hinh nhe: khong tao admission rieng
            Status              = 0,
            DischargeDate       = null,
            CreatedAt           = DateTime.UtcNow,
            CreatedBy           = userId.ToString(),
        };

        _context.NewbornRecords.Add(entity);
        await _context.SaveChangesAsync();

        return MapNewbornDto(entity);
    }

    public async Task<List<NewbornRecordDto>> GetNewbornRecordsAsync(Guid motherAdmissionId)
    {
        var records = await _context.NewbornRecords
            .Where(r => r.MotherAdmissionId == motherAdmissionId && !r.IsDeleted)
            .OrderBy(r => r.BirthDate).ThenBy(r => r.BirthTime)
            .ToListAsync();

        return records.Select(MapNewbornDto).ToList();
    }

    public async Task<NewbornRecordDto> UpdateNewbornRecordAsync(Guid id, NewbornRecordDto dto, Guid userId)
    {
        var entity = await _context.NewbornRecords.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted)
            ?? throw new InvalidOperationException("Khong tim thay ho so tre so sinh.");

        // Validate APGAR 0-10
        if (dto.ApgarScore1Min < 0 || dto.ApgarScore1Min > 10)
            throw new InvalidOperationException("Diem APGAR 1 phut phai tu 0 den 10.");
        if (dto.ApgarScore5Min < 0 || dto.ApgarScore5Min > 10)
            throw new InvalidOperationException("Diem APGAR 5 phut phai tu 0 den 10.");
        if (dto.ApgarScore10Min.HasValue && (dto.ApgarScore10Min.Value < 0 || dto.ApgarScore10Min.Value > 10))
            throw new InvalidOperationException("Diem APGAR 10 phut phai tu 0 den 10.");
        if (dto.BirthWeight <= 0)
            throw new InvalidOperationException("Can nang phai lon hon 0.");

        entity.BirthDate           = dto.BirthDate;
        entity.BirthTime           = dto.BirthTime;
        entity.Gender              = dto.Gender;
        entity.BirthWeight         = dto.BirthWeight;
        entity.BirthLength         = dto.BirthLength;
        entity.HeadCircumference   = dto.HeadCircumference;
        entity.ApgarScore1Min      = dto.ApgarScore1Min;
        entity.ApgarScore5Min      = dto.ApgarScore5Min;
        entity.ApgarScore10Min     = dto.ApgarScore10Min;
        entity.DeliveryMethod      = dto.DeliveryMethod;
        entity.Complications       = dto.Complications;
        entity.InitialExamFindings = dto.InitialExamFindings;
        entity.VitaminKGiven       = dto.VitaminKGiven;
        entity.HepBVaccine         = dto.HepBVaccine;
        entity.UpdatedAt           = DateTime.UtcNow;
        entity.UpdatedBy           = userId.ToString();

        await _context.SaveChangesAsync();
        return MapNewbornDto(entity);
    }

    public async Task<NewbornRecordDto> DischargeNewbornRecordAsync(Guid id, DateTime dischargeDate, Guid userId)
    {
        var entity = await _context.NewbornRecords.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted)
            ?? throw new InvalidOperationException("Khong tim thay ho so tre so sinh.");

        entity.Status        = 2; // Da xuat
        entity.DischargeDate = dischargeDate;
        entity.UpdatedAt     = DateTime.UtcNow;
        entity.UpdatedBy     = userId.ToString();

        await _context.SaveChangesAsync();
        return MapNewbornDto(entity);
    }

    private static NewbornRecordDto MapNewbornDto(NewbornRecord e) => new NewbornRecordDto
    {
        Id                  = e.Id,
        MotherAdmissionId   = e.MotherAdmissionId,
        BirthDate           = e.BirthDate,
        BirthTime           = e.BirthTime,
        Gender              = e.Gender,
        BirthWeight         = e.BirthWeight,
        BirthLength         = e.BirthLength,
        HeadCircumference   = e.HeadCircumference,
        ApgarScore1Min      = e.ApgarScore1Min,
        ApgarScore5Min      = e.ApgarScore5Min,
        ApgarScore10Min     = e.ApgarScore10Min,
        DeliveryMethod      = e.DeliveryMethod,
        Complications       = e.Complications,
        InitialExamFindings = e.InitialExamFindings,
        VitaminKGiven       = e.VitaminKGiven,
        HepBVaccine         = e.HepBVaccine,
        NewbornAdmissionId  = e.NewbornAdmissionId,
        Status              = e.Status,
        DischargeDate       = e.DischargeDate,
    };

    // ── Chạy thận nhân tạo (#148) ───────────────────────────────────────────

    public async Task<HemodialysisSessionDto> CreateHemodialysisSessionAsync(Guid admissionId, HemodialysisSessionDto dto, Guid userId)
    {
        ValidateHemodialysis(dto);

        var entity = new HemodialysisSession
        {
            Id                    = Guid.NewGuid(),
            AdmissionId           = admissionId,
            SessionDate           = dto.SessionDate,
            StartTime             = dto.StartTime,
            EndTime               = dto.EndTime,
            SessionNumber         = dto.SessionNumber,
            WeightPre             = dto.WeightPre,
            WeightPost            = dto.WeightPost,
            Pulse                 = dto.Pulse,
            BloodPressureLying    = dto.BloodPressureLying,
            BloodPressureStanding = dto.BloodPressureStanding,
            Temperature           = dto.Temperature,
            RespiratoryRate       = dto.RespiratoryRate,
            BloodFlowRate         = dto.BloodFlowRate,
            ArterialPressure      = dto.ArterialPressure,
            VenousPressure        = dto.VenousPressure,
            Tmp                   = dto.Tmp,
            ReplacementFluid      = dto.ReplacementFluid,
            DialyzerType          = dto.DialyzerType,
            Medications           = dto.Medications,
            Complications         = dto.Complications,
            Notes                 = dto.Notes,
            CreatedAt             = DateTime.UtcNow,
            CreatedBy             = userId.ToString(),
        };

        _context.HemodialysisSessions.Add(entity);
        await _context.SaveChangesAsync();

        return MapHemodialysisDto(entity);
    }

    public async Task<List<HemodialysisSessionDto>> GetHemodialysisSessionsAsync(Guid admissionId)
    {
        var sessions = await _context.HemodialysisSessions
            .Where(s => s.AdmissionId == admissionId && !s.IsDeleted)
            .OrderBy(s => s.SessionDate).ThenBy(s => s.StartTime)
            .ToListAsync();

        return sessions.Select(MapHemodialysisDto).ToList();
    }

    public async Task<HemodialysisSessionDto> UpdateHemodialysisSessionAsync(Guid id, HemodialysisSessionDto dto, Guid userId)
    {
        var entity = await _context.HemodialysisSessions.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted)
            ?? throw new InvalidOperationException("Khong tim thay phieu chay than.");

        ValidateHemodialysis(dto);

        entity.SessionDate           = dto.SessionDate;
        entity.StartTime             = dto.StartTime;
        entity.EndTime               = dto.EndTime;
        entity.SessionNumber         = dto.SessionNumber;
        entity.WeightPre             = dto.WeightPre;
        entity.WeightPost            = dto.WeightPost;
        entity.Pulse                 = dto.Pulse;
        entity.BloodPressureLying    = dto.BloodPressureLying;
        entity.BloodPressureStanding = dto.BloodPressureStanding;
        entity.Temperature           = dto.Temperature;
        entity.RespiratoryRate       = dto.RespiratoryRate;
        entity.BloodFlowRate         = dto.BloodFlowRate;
        entity.ArterialPressure      = dto.ArterialPressure;
        entity.VenousPressure        = dto.VenousPressure;
        entity.Tmp                   = dto.Tmp;
        entity.ReplacementFluid      = dto.ReplacementFluid;
        entity.DialyzerType          = dto.DialyzerType;
        entity.Medications           = dto.Medications;
        entity.Complications         = dto.Complications;
        entity.Notes                 = dto.Notes;
        entity.UpdatedAt             = DateTime.UtcNow;
        entity.UpdatedBy             = userId.ToString();

        await _context.SaveChangesAsync();
        return MapHemodialysisDto(entity);
    }

    public async Task DeleteHemodialysisSessionAsync(Guid id, Guid userId)
    {
        var entity = await _context.HemodialysisSessions.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted)
            ?? throw new InvalidOperationException("Khong tim thay phieu chay than.");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
    }

    private static void ValidateHemodialysis(HemodialysisSessionDto dto)
    {
        if (dto.WeightPre < 0 || dto.WeightPost < 0)
            throw new InvalidOperationException("Can nang khong duoc am.");
        if (dto.Pulse < 0 || dto.RespiratoryRate < 0)
            throw new InvalidOperationException("Mach / nhip tho khong duoc am.");
        if (dto.BloodFlowRate < 0)
            throw new InvalidOperationException("Toc do mau khong duoc am.");
    }

    private static HemodialysisSessionDto MapHemodialysisDto(HemodialysisSession e) => new HemodialysisSessionDto
    {
        Id                    = e.Id,
        AdmissionId           = e.AdmissionId,
        SessionDate           = e.SessionDate,
        StartTime             = e.StartTime,
        EndTime               = e.EndTime,
        SessionNumber         = e.SessionNumber,
        WeightPre             = e.WeightPre,
        WeightPost            = e.WeightPost,
        Pulse                 = e.Pulse,
        BloodPressureLying    = e.BloodPressureLying,
        BloodPressureStanding = e.BloodPressureStanding,
        Temperature           = e.Temperature,
        RespiratoryRate       = e.RespiratoryRate,
        BloodFlowRate         = e.BloodFlowRate,
        ArterialPressure      = e.ArterialPressure,
        VenousPressure        = e.VenousPressure,
        Tmp                   = e.Tmp,
        ReplacementFluid      = e.ReplacementFluid,
        DialyzerType          = e.DialyzerType,
        Medications           = e.Medications,
        Complications         = e.Complications,
        Notes                 = e.Notes,
    };

    #endregion
}
