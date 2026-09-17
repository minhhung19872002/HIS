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
        // QA-R4: unknown admission died on the FK (500); finished stay, blank fluid, volume -500 ml and
        // drop rate 0 were all written as a running infusion.
        var admissionStatus = await _context.Admissions.AsNoTracking()
            .Where(a => a.Id == dto.AdmissionId && !a.IsDeleted)
            .Select(a => (int?)a.Status)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Không tìm thấy lượt nội trú.");
        await EnsureChartableAsync(dto.AdmissionId, admissionStatus, "ghi truyền dịch");
        if (string.IsNullOrWhiteSpace(dto.FluidName))
            throw new InvalidOperationException("Chưa nhập tên dịch truyền.");
        if (dto.Volume <= 0)
            throw new InvalidOperationException("Thể tích dịch truyền phải lớn hơn 0 ml.");
        if (dto.DropRate <= 0)
            throw new InvalidOperationException("Tốc độ truyền (giọt/phút) phải lớn hơn 0.");
        if (dto.StartTime == default)
            throw new InvalidOperationException("Chưa nhập giờ bắt đầu truyền.");
        await EmrLockGuard.EnsureEditableByAdmissionAsync(_context, dto.AdmissionId); // TT46 — QA0915: was writable on a finalized EMR
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
        // #218/T3: hai lượt kiểm còn thiếu.
        //
        // (1) Giờ kết thúc phải sau giờ bắt đầu. Dấu hiệu nằm ngay trong `Math.Max(0, …)` cũ:
        //     người viết BIẾT hiệu số có thể âm nhưng kẹp triệu chứng thay vì từ chối dữ liệu vào,
        //     nên phiếu truyền dịch ghi được EndTime sớm hơn StartTime với thời lượng 0 phút — một
        //     y lệnh truyền dịch kết thúc trước khi bắt đầu, nằm trong hồ sơ chăm sóc người bệnh.
        //     Đo được ở evidence/cross/t3/t3_infusion_complete.json.
        if (endTime < entity.StartTime)
            throw new InvalidOperationException(
                $"Giờ kết thúc ({endTime:HH:mm dd/MM}) sớm hơn giờ bắt đầu truyền "
                + $"({entity.StartTime:HH:mm dd/MM}). Kiểm tra lại giờ nhập.");

        // (2) Không kết thúc lại một phiếu đã kết thúc: gọi lần hai ghi đè cả EndTime lẫn
        //     CompletedBy, tức xoá mất ai thật sự kết thúc lượt truyền và vào lúc nào.
        if (entity.EndTime != null)
            throw new InvalidOperationException(
                $"Phiếu truyền dịch đã kết thúc lúc {entity.EndTime:HH:mm dd/MM} rồi.");

        entity.EndTime = endTime;
        entity.DurationMinutes = (int)(endTime - entity.StartTime).TotalMinutes;
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
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Bệnh nhân:</span><span class=""field-value"">{Esc(e.Admission?.Patient?.FullName)} ({Esc(e.Admission?.Patient?.PatientCode)})</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Dịch truyền:</span><span class=""field-value"">{Esc(e.FluidName)}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Thể tích / tốc độ:</span><span class=""field-value"">{e.Volume} ml — {e.DropRate} giọt/phút</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Đường truyền:</span><span class=""field-value"">{Esc(e.Route ?? "—")}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Thuốc pha thêm:</span><span class=""field-value"">{Esc(e.AdditionalMedication ?? "—")}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Bắt đầu:</span><span class=""field-value"">{e.StartTime:dd/MM/yyyy HH:mm}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Kết thúc:</span><span class=""field-value"">{(e.EndTime.HasValue ? e.EndTime.Value.ToString("dd/MM/yyyy HH:mm") : "Đang truyền")}</span></div>");
            bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Người thực hiện:</span><span class=""field-value"">{Esc(starter ?? "—")}</span></div>");
            if (!string.IsNullOrEmpty(e.Observations))
                bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Theo dõi:</span><span class=""field-value"">{Esc(e.Observations)}</span></div>");
            if (!string.IsNullOrEmpty(e.Complications))
                bodyContent.AppendLine($@"<div class=""field""><span class=""field-label"">Biến chứng:</span><span class=""field-value"">{Esc(e.Complications)}</span></div>");
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

    // ── QA0915 wave-2: blood transfusion at the bedside ───────────────────────────────────────────
    // Was an in-memory stub: TreatmentMonitorSection said "Đã ghi nhận truyền máu" and nothing was stored,
    // and the reaction endpoint recorded nothing either. Now persisted to BloodTransfusions (the blood
    // bank's table). That table requires a real blood unit and blood request, so the bag number must be
    // an issued unit (BloodUnits.UnitCode) and the patient must have a live blood request. ABO/Rh is
    // checked with the shared BloodCompatibility rule. The stay id is kept in Note ("[ADM:{id}]") because
    // the table has no AdmissionId column.
    private const int TransfusionInProgress = 1, TransfusionCompleted = 2, TransfusionStoppedReaction = 3, TransfusionCancelled = 4;

    private static string? MapBloodProductCode(string? productName) => (productName ?? string.Empty).Trim().ToLowerInvariant() switch
    {
        "hồng cầu khối" or "rbc" => "RBC",
        "máu toàn phần" or "wb" => "WB",
        "huyết tương tươi đông lạnh" or "ffp" => "FFP",
        "khối tiểu cầu" or "plt" => "PLT",
        "tủa lạnh" or "cryo" => "CRYO",
        _ => null,
    };

    public async Task<BloodTransfusionDto> CreateBloodTransfusionAsync(CreateBloodTransfusionDto dto, Guid userId)
    {
        var admission = await _context.Admissions.AsNoTracking().Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId)
            ?? throw new KeyNotFoundException("Admission not found");
        if (!HIS.Core.Constants.AdmissionStatus.IsActive(admission.Status))
            throw new InvalidOperationException("Lượt nội trú đã kết thúc, không ghi nhận truyền máu được.");
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, admission.MedicalRecordId); // TT46
        if (dto.Volume <= 0) throw new InvalidOperationException("Thể tích truyền phải lớn hơn 0.");
        if (dto.TransfusionStart == default) throw new InvalidOperationException("Chưa nhập giờ bắt đầu truyền.");

        var bag = (dto.BagNumber ?? string.Empty).Trim();
        var unit = await _context.BloodUnits.FirstOrDefaultAsync(u => u.UnitCode == bag)
            ?? throw new InvalidOperationException($"Không tìm thấy túi máu mã \"{bag}\" trong ngân hàng máu.");
        // BloodUnits.Status: 0-Chờ xét nghiệm, 1-Đủ điều kiện, 2-Không đủ điều kiện, 3-Đã sử dụng (cấp phát), 4-Hủy.
        // An untested (0) unit must never reach a patient.
        if (unit.Status != 1 && unit.Status != 3)
            throw new InvalidOperationException($"Túi máu {bag} chưa xét nghiệm, không đủ điều kiện hoặc đã hủy — không được truyền.");
        if (unit.ExpiryDate < DateTime.Now)
            throw new InvalidOperationException($"Túi máu {bag} đã hết hạn ({unit.ExpiryDate:dd/MM/yyyy HH:mm}).");
        if (HIS.Core.Constants.BloodCompatibility.NormalizeAbo(dto.BloodType) != HIS.Core.Constants.BloodCompatibility.NormalizeAbo(unit.BloodType)
            || HIS.Core.Constants.BloodCompatibility.NormalizeRh(dto.RhFactor) != HIS.Core.Constants.BloodCompatibility.NormalizeRh(unit.RhFactor))
            throw new InvalidOperationException(
                $"Nhóm máu nhập ({dto.BloodType}{dto.RhFactor}) không khớp nhãn túi {bag} ({unit.BloodType}{unit.RhFactor}). Kiểm tra lại túi máu.");
        var productCode = MapBloodProductCode(dto.BloodProductType);
        var match = HIS.Core.Constants.BloodCompatibility.Check(productCode,
            admission.Patient.BloodType, admission.Patient.RhFactor, unit.BloodType, unit.RhFactor);
        if (match == HIS.Core.Constants.BloodCompatibility.BloodMatch.Incompatible)
            throw new InvalidOperationException("KHÔNG TƯƠNG THÍCH: " + HIS.Core.Constants.BloodCompatibility.Describe(
                admission.Patient.BloodType, admission.Patient.RhFactor, unit.BloodType, unit.RhFactor));
        if (await _context.BloodTransfusions.AnyAsync(t => t.BloodUnitId == unit.Id && t.Status != TransfusionCancelled))
            throw new InvalidOperationException($"Túi máu {bag} đã được ghi nhận truyền trước đó.");

        var request = await _context.BloodRequests.AsNoTracking()
            .Where(r => r.PatientId == admission.PatientId && r.Status != 4 && r.Status != 5)
            .OrderByDescending(r => r.MedicalRecordId == admission.MedicalRecordId)
            .ThenByDescending(r => r.RequestDate)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Bệnh nhân chưa có phiếu dự trù/yêu cầu máu còn hiệu lực — lập phiếu yêu cầu máu trước khi truyền.");

        var entity = new BloodTransfusion
        {
            Id = Guid.NewGuid(),
            TransfusionCode = $"TM{DateTime.Now:yyyyMMddHHmmssfff}",
            BloodRequestId = request.Id,
            BloodUnitId = unit.Id,
            PatientId = admission.PatientId,
            TransfusionDate = dto.TransfusionStart,
            StartTime = dto.TransfusionStart.TimeOfDay,
            Volume = dto.Volume,
            NurseId = userId,
            Status = TransfusionInProgress,
            Note = $"[ADM:{admission.Id}] {dto.BloodProductType}",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };
        _context.BloodTransfusions.Add(entity);
        await _context.SaveChangesAsync();
        return await MapBloodTransfusionAsync(entity.Id);
    }

    public async Task<BloodTransfusionDto> UpdateBloodTransfusionMonitoringAsync(Guid id, string preVitals, string duringVitals, string postVitals, Guid userId)
    {
        var e = await _context.BloodTransfusions.FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu truyền máu");
        if (!string.IsNullOrWhiteSpace(preVitals)) e.VitalSignsBefore = preVitals;
        if (!string.IsNullOrWhiteSpace(postVitals)) e.VitalSignsAfter = postVitals;
        if (!string.IsNullOrWhiteSpace(duringVitals))
            e.Note = $"{e.Note}\n[Trong truyền {DateTime.Now:HH:mm dd/MM}] {duringVitals}".Trim();
        e.UpdatedAt = DateTime.UtcNow;
        e.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await MapBloodTransfusionAsync(id);
    }

    public async Task<BloodTransfusionDto> RecordTransfusionReactionAsync(Guid id, string reactionDetails, Guid userId)
    {
        var e = await _context.BloodTransfusions.FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu truyền máu");
        if (string.IsNullOrWhiteSpace(reactionDetails))
            throw new InvalidOperationException("Chưa mô tả phản ứng truyền máu.");
        if (e.Status == TransfusionCancelled)
            throw new InvalidOperationException("Phiếu truyền máu đã hủy.");
        e.HasReaction = true;
        // Append rather than overwrite: a second reaction must not erase the first one.
        e.ReactionDescription = string.IsNullOrWhiteSpace(e.ReactionDescription)
            ? reactionDetails
            : $"{e.ReactionDescription}\n[{DateTime.Now:HH:mm dd/MM}] {reactionDetails}";
        if (e.Status == TransfusionInProgress) e.Status = TransfusionStoppedReaction;
        e.UpdatedAt = DateTime.UtcNow;
        e.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await MapBloodTransfusionAsync(id);
    }

    public async Task<BloodTransfusionDto> CompleteBloodTransfusionAsync(Guid id, DateTime endTime, Guid userId)
    {
        var e = await _context.BloodTransfusions.FirstOrDefaultAsync(t => t.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu truyền máu");
        if (e.Status == TransfusionCompleted || e.Status == TransfusionCancelled)
            throw new InvalidOperationException("Phiếu truyền máu đã kết thúc hoặc đã hủy.");
        if (endTime < e.TransfusionDate)
            throw new InvalidOperationException("Giờ kết thúc sớm hơn giờ bắt đầu truyền.");
        e.EndTime = endTime.TimeOfDay;
        if (e.Status == TransfusionInProgress) e.Status = TransfusionCompleted;
        e.UpdatedAt = DateTime.UtcNow;
        e.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await MapBloodTransfusionAsync(id);
    }

    public async Task<List<BloodTransfusionDto>> GetBloodTransfusionsAsync(Guid admissionId)
    {
        var tag = $"[ADM:{admissionId}]";
        var ids = await _context.BloodTransfusions.AsNoTracking()
            .Where(t => t.Note != null && t.Note.StartsWith(tag))
            .OrderByDescending(t => t.TransfusionDate)
            .Select(t => t.Id)
            .ToListAsync();
        var list = new List<BloodTransfusionDto>();
        foreach (var id in ids) list.Add(await MapBloodTransfusionAsync(id));
        return list;
    }

    private async Task<BloodTransfusionDto> MapBloodTransfusionAsync(Guid id)
    {
        var t = await _context.BloodTransfusions.AsNoTracking()
            .Include(x => x.BloodUnit)
            .Include(x => x.Nurse)
            .FirstAsync(x => x.Id == id);
        var note = t.Note ?? string.Empty;
        Guid admissionId = Guid.Empty;
        if (note.StartsWith("[ADM:") && note.Length >= 42) Guid.TryParse(note.Substring(5, 36), out admissionId);
        var firstLine = note.Split('\n')[0];
        var product = firstLine.Length > 43 ? firstLine.Substring(43).Trim() : string.Empty;
        return new BloodTransfusionDto
        {
            Id = t.Id,
            AdmissionId = admissionId,
            BloodType = t.BloodUnit?.BloodType ?? string.Empty,
            RhFactor = t.BloodUnit?.RhFactor ?? string.Empty,
            BloodProductType = product,
            BagNumber = t.BloodUnit?.UnitCode ?? string.Empty,
            Volume = (int)t.Volume,
            TransfusionStart = t.TransfusionDate,
            TransfusionEnd = t.EndTime.HasValue ? t.TransfusionDate.Date + t.EndTime.Value : null,
            DoctorOrderId = t.DoctorId ?? Guid.Empty,
            ExecutedBy = t.NurseId,
            ExecutedByName = t.Nurse?.FullName,
            PreTransfusionVitals = t.VitalSignsBefore,
            PostTransfusionVitals = t.VitalSignsAfter,
            HasReaction = t.HasReaction,
            ReactionDetails = t.ReactionDescription,
            Status = t.Status,
        };
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
        // QA-R6: a 2027 birth date and an unknown mother stay were accepted.
        if (dto.BirthDate.Date > HIS.Core.Common.VnTime.TodayVn)
            throw new InvalidOperationException("Ngày sinh của trẻ không được ở tương lai.");
        if (!await _context.Set<Admission>().AnyAsync(a => a.Id == motherAdmissionId && !a.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy lượt nội trú của mẹ.");

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
        if (dto.BirthDate.Date > HIS.Core.Common.VnTime.TodayVn)
            throw new InvalidOperationException("Ngày sinh của trẻ không được ở tương lai.");

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
        // QA-R6: discharging twice and a discharge date before birth were both accepted.
        if (entity.Status == 2)
            throw new InvalidOperationException("Trẻ đã được ra viện trước đó.");
        if (dischargeDate.Date < entity.BirthDate.Date)
            throw new InvalidOperationException("Ngày ra viện không được trước ngày sinh.");

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
        // QA0915: unknown admission failed on the FK at SaveChanges → 500; answer 404 instead.
        if (!await _context.Admissions.AnyAsync(a => a.Id == admissionId))
            throw new KeyNotFoundException("Admission not found");

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
