using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K3 phien 1 (2026-05-30): tach RIS Module 8 (5 region 8.1+8.2+8.3+8.4+8.5, ~1730 dong)
// khoi RISCompleteService.cs god-file (5679 dong). ZERO runtime change â€" partial class.
// Ctor + 13 DI deps + PACS config o file goc.
public partial class RISCompleteService
{
    #region 8.3 Radiology Orders & Results

    public async Task<List<RadiologyOrderDto>> GetRadiologyOrdersAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? departmentId = null,
        string serviceType = null,
        string status = null,
        string keyword = null)
    {
        // E2E #2: thiếu fromDate/toDate → mặc định lấy ca trong NGÀY HÔM NAY (giờ VN; RequestDate lưu UTC)
        // thay vì trả rỗng. Có truyền date thì giữ hành vi cũ (toDate bao trọn ngày qua khoảng nửa-mở).
        DateTime fromUtc, toUtc;
        if (fromDate is null && toDate is null)
        {
            (fromUtc, toUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.NowVn);
        }
        else
        {
            fromUtc = fromDate ?? DateTime.MinValue;
            toUtc = (toDate ?? HIS.Core.Common.VnTime.NowVn).AddDays(1);
        }

        var query = _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .Where(r => r.RequestDate >= fromUtc && r.RequestDate < toUtc);

        if (!string.IsNullOrEmpty(status))
        {
            int statusInt;
            if (!int.TryParse(status, out statusInt))
            {
                statusInt = status.ToLower() switch
                {
                    "pending" => 0,
                    "inprogress" => 1,
                    "completed" => 2,
                    "cancelled" => 3,
                    _ => -1
                };
            }
            if (statusInt >= 0)
            {
                query = query.Where(r => r.Status == statusInt);
            }
        }

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(r =>
                r.Patient.FullName.Contains(keyword) ||
                r.Patient.PatientCode.Contains(keyword) ||
                r.RequestCode.Contains(keyword));
        }

        var requests = await query.OrderByDescending(r => r.RequestDate).ToBoundedListAsync("RIS.GetRadiologyOrders");

        return requests.Select(r => new RadiologyOrderDto
        {
            Id = r.Id,
            OrderCode = r.RequestCode,
            PatientId = r.PatientId,
            PatientCode = r.Patient.PatientCode,
            PatientName = r.Patient.FullName,
            Age = r.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - r.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = r.Patient.Gender == 1 ? "Nam" : "Nu",
            VisitId = r.MedicalRecordId ?? Guid.Empty,
            MedicalRecordId = r.MedicalRecordId,
            OrderDate = r.RequestDate,
            OrderDoctorName = r.RequestingDoctor?.FullName ?? "",
            Diagnosis = r.ClinicalInfo,
            ClinicalInfo = r.ClinicalInfo,
            Status = GetStatusName(r.Status),
            PatientType = r.PatientType == 1 ? "BHYT" : "Vien phi",
            AccessionNumber = r.Exams.FirstOrDefault()?.AccessionNumber,
            StudyInstanceUID = r.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID,
            DicomStudyId = r.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.Id,
            Items = new List<RadiologyOrderItemDto>
            {
                new RadiologyOrderItemDto
                {
                    Id = r.Id,
                    ServiceId = r.ServiceId,
                    ServiceCode = r.Service?.ServiceCode ?? "",
                    ServiceName = r.Service?.ServiceName ?? "",
                    ServiceType = GetRadiologyServiceTypeName(r.Service),
                    Quantity = 1,
                    Price = r.TotalAmount,
                    InsurancePrice = r.InsuranceAmount,
                    Status = GetStatusName(r.Status),
                    StartTime = r.Exams.FirstOrDefault()?.StartTime,
                    EndTime = r.Exams.FirstOrDefault()?.EndTime,
                    HasResult = r.Exams.Any(e => e.Report != null),
                    HasImages = r.Exams.Any(e => e.DicomStudies.Any())
                }
            }
        }).ToList();
    }

    public async Task<RadiologyOrderDto> GetRadiologyOrderAsync(Guid orderId)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.RequestingDoctor)
            .Include(r => r.Exams)
                .ThenInclude(e => e.Report)
            .Include(r => r.Exams)
                .ThenInclude(e => e.DicomStudies)
            .FirstOrDefaultAsync(r => r.Id == orderId);

        if (request == null) return null;

        return new RadiologyOrderDto
        {
            Id = request.Id,
            OrderCode = request.RequestCode,
            PatientId = request.PatientId,
            PatientCode = request.Patient.PatientCode,
            PatientName = request.Patient.FullName,
            Age = request.Patient.DateOfBirth.HasValue ? (int?)((DateTime.Now - request.Patient.DateOfBirth.Value).Days / 365) : null,
            Gender = request.Patient.Gender == 1 ? "Nam" : "Nu",
            VisitId = request.MedicalRecordId ?? Guid.Empty,
            MedicalRecordId = request.MedicalRecordId,
            OrderDate = request.RequestDate,
            OrderDoctorName = request.RequestingDoctor?.FullName ?? "",
            Diagnosis = request.ClinicalInfo,
            ClinicalInfo = request.ClinicalInfo,
            Status = GetStatusName(request.Status),
            PatientType = request.PatientType == 1 ? "BHYT" : "Vien phi",
            AccessionNumber = request.Exams.FirstOrDefault()?.AccessionNumber,
            StudyInstanceUID = request.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID,
            DicomStudyId = request.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.Id,
            Items = new List<RadiologyOrderItemDto>
            {
                new RadiologyOrderItemDto
                {
                    Id = request.Id,
                    ServiceId = request.ServiceId,
                    ServiceCode = request.Service?.ServiceCode ?? "",
                    ServiceName = request.Service?.ServiceName ?? "",
                    ServiceType = GetRadiologyServiceTypeName(request.Service),
                    Quantity = 1,
                    Price = request.TotalAmount,
                    InsurancePrice = request.InsuranceAmount,
                    Status = GetStatusName(request.Status),
                    StartTime = request.Exams.FirstOrDefault()?.StartTime,
                    EndTime = request.Exams.FirstOrDefault()?.EndTime,
                    HasResult = request.Exams.Any(e => e.Report != null),
                    HasImages = request.Exams.Any(e => e.DicomStudies.Any())
                }
            }
        };
    }

    // ════════════════════════════════════════════════════════════════════════════════════════
    // Mẫu kết quả CĐHA — #218/T3
    //
    // Cả cụm này trước đây là **hardcode**: bốn đường đọc đều trả về cùng một danh sách dựng trong
    // mã (`GetDefaultTemplates()`), `SaveResultTemplateAsync` không ghi gì, `DeleteResultTemplateAsync`
    // trả `true` mà không xoá. Bác sĩ soạn mẫu riêng cho khoa mình thì mất; bấm xoá thì phần mềm báo
    // xong mà mẫu vẫn còn nguyên ở lần mở sau.
    //
    // Bảng `RadiologyReportTemplates` đã tồn tại sẵn — lại là nhóm A, chỉ thiếu đường ghi. Migration
    // 180 bổ sung `ServiceId`/`ServiceTypeId`/`Gender`/`IsDefault`, ba cột mà chính hai đường đọc
    // "lọc theo dịch vụ" và "lọc theo giới tính" cần mới làm được việc của chúng.
    //
    // `GetDefaultTemplates()` giữ lại làm **mẫu gợi ý khi kho mẫu còn trống** (bệnh viện mới cài
    // chưa soạn mẫu nào), và chỉ dùng khi thật sự trống — không trộn lẫn với mẫu do người dùng soạn,
    // để không lặp lại kiểu "trả số liệu bịa mà người dùng không phân biệt được" đã gặp ở §42.
    // ════════════════════════════════════════════════════════════════════════════════════════

    private IQueryable<RadiologyReportTemplate> TemplateQuery() =>
        _context.Set<RadiologyReportTemplate>().Where(t => !t.IsDeleted);

    private static RadiologyResultTemplateDto ToTemplateDto(RadiologyReportTemplate t) =>
        new RadiologyResultTemplateDto
        {
            Id = t.Id,
            Code = t.TemplateCode,
            Name = t.TemplateName,
            ServiceTypeId = t.ServiceTypeId,
            ServiceId = t.ServiceId,
            Gender = t.Gender ?? "Both",
            DescriptionTemplate = t.FindingsTemplate,
            ConclusionTemplate = t.ImpressionTemplate,
            NoteTemplate = t.Note,
            SortOrder = t.SortOrder,
            IsDefault = t.IsDefault,
            IsActive = t.IsActive,
            CreatedBy = t.CreatedBy,
        };

    /// <summary>
    /// Mẫu gợi ý chỉ dùng khi kho mẫu còn TRỐNG HẲN. Có một mẫu người dùng soạn thì thôi trộn —
    /// người dùng phải phân biệt được đâu là mẫu của mình.
    /// </summary>
    private async Task<List<RadiologyResultTemplateDto>> TemplatesOrSeedAsync(
        IQueryable<RadiologyReportTemplate> query)
    {
        var rows = await query.OrderBy(t => t.SortOrder).ThenBy(t => t.TemplateName).ToListAsync();
        if (rows.Count > 0) return rows.Select(ToTemplateDto).ToList();
        return await TemplateQuery().AnyAsync() ? new List<RadiologyResultTemplateDto>()
                                                : GetDefaultTemplates();
    }

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByServiceTypeAsync(Guid serviceTypeId)
        => await TemplatesOrSeedAsync(TemplateQuery().Where(t => t.IsActive && t.ServiceTypeId == serviceTypeId));

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByServiceAsync(Guid serviceId)
        => await TemplatesOrSeedAsync(TemplateQuery().Where(t => t.IsActive && t.ServiceId == serviceId));

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByGenderAsync(string gender)
        => await TemplatesOrSeedAsync(TemplateQuery()
            .Where(t => t.IsActive && (t.Gender == null || t.Gender == "Both" || t.Gender == gender)));

    public async Task<List<RadiologyResultTemplateDto>> GetAllResultTemplatesAsync(string keyword = null)
    {
        var q = TemplateQuery();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            q = q.Where(t => t.TemplateCode.ToLower().Contains(kw) || t.TemplateName.ToLower().Contains(kw));
        }
        return await TemplatesOrSeedAsync(q);
    }

    /// <summary>
    /// Lưu mẫu kết quả — thêm mới hoặc sửa mẫu sẵn có. #218/T3: trước đây chỉ dội lại DTO người dùng
    /// vừa gửi lên, mẫu không đi đến đâu cả.
    /// </summary>
    public async Task<RadiologyResultTemplateDto> SaveResultTemplateAsync(SaveResultTemplateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code)) throw new InvalidOperationException("Chưa nhập mã mẫu.");
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new InvalidOperationException("Chưa nhập tên mẫu.");

        var code = dto.Code.Trim();
        var now = DateTime.Now;

        RadiologyReportTemplate? entity = null;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.Set<RadiologyReportTemplate>()
                .FirstOrDefaultAsync(t => t.Id == dto.Id.Value && !t.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy mẫu kết quả cần sửa");
        }

        // Mã mẫu là thứ người dùng gõ để gọi mẫu ra, trùng mã thì gọi nhầm mẫu.
        var trung = await TemplateQuery().AnyAsync(t =>
            t.TemplateCode == code && (entity == null || t.Id != entity.Id));
        if (trung) throw new InvalidOperationException($"Mã mẫu {code} đã được dùng cho mẫu khác.");

        if (entity == null)
        {
            entity = new RadiologyReportTemplate { Id = Guid.NewGuid(), CreatedAt = now };
            _context.Set<RadiologyReportTemplate>().Add(entity);
        }
        else
        {
            entity.UpdatedAt = now;
        }

        entity.TemplateCode = code;
        entity.TemplateName = dto.Name.Trim();
        entity.ServiceTypeId = dto.ServiceTypeId;
        entity.ServiceId = dto.ServiceId;
        entity.Gender = string.IsNullOrWhiteSpace(dto.Gender) ? "Both" : dto.Gender.Trim();
        entity.FindingsTemplate = dto.DescriptionTemplate;
        entity.ImpressionTemplate = dto.ConclusionTemplate;
        entity.Note = dto.NoteTemplate;
        entity.SortOrder = dto.SortOrder;
        entity.IsDefault = dto.IsDefault;
        entity.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        return ToTemplateDto(entity);
    }

    /// <summary>
    /// Xoá mềm một mẫu kết quả. #218/T3: trước đây trả `true` mà không xoá gì — người dùng bấm xoá,
    /// phần mềm báo xong, mở lại vẫn thấy mẫu ở đó.
    /// </summary>
    public async Task<bool> DeleteResultTemplateAsync(Guid templateId)
    {
        var entity = await _context.Set<RadiologyReportTemplate>()
            .FirstOrDefaultAsync(t => t.Id == templateId && !t.IsDeleted);
        if (entity == null) return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<RadiologyResultDto> ChangeResultTemplateAsync(ChangeResultTemplateDto dto)
    {
        var template = GetDefaultTemplates().FirstOrDefault(t => t.Id == dto.NewTemplateId);

        return new RadiologyResultDto
        {
            OrderItemId = dto.OrderItemId,
            Description = dto.KeepExistingContent ? "" : template?.DescriptionTemplate,
            Conclusion = dto.KeepExistingContent ? "" : template?.ConclusionTemplate,
            Note = dto.KeepExistingContent ? "" : template?.NoteTemplate
        };
    }

    public async Task<RadiologyResultDto> EnterRadiologyResultAsync(EnterRadiologyResultDto dto)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
            .FirstOrDefaultAsync(r => r.Id == dto.OrderItemId);

        if (request == null) return null;

        // Get or create exam
        var exam = request.Exams.FirstOrDefault();
        if (exam == null)
        {
            exam = new RadiologyExam
            {
                Id = Guid.NewGuid(),
                RadiologyRequestId = request.Id,
                ExamCode = $"EX{DateTime.Now:yyyyMMddHHmmss}",
                ExamName = request.Service?.ServiceName ?? "CDHA",
                ExamDate = DateTime.Now,
                Status = 2, // Completed
                AccessionNumber = GenerateAccessionNumber()
            };
            await _context.RadiologyExams.AddAsync(exam);
        }

        // Create or update report
        var report = await _context.RadiologyReports
            .FirstOrDefaultAsync(r => r.RadiologyExamId == exam.Id);

        if (report == null)
        {
            report = new RadiologyReport
            {
                Id = Guid.NewGuid(),
                RadiologyExamId = exam.Id,
                RadiologistId = GetCurrentUserIdOrAdmin(), // Admin user
                ReportDate = DateTime.Now,
                Status = 0, // Draft
                CreatedAt = DateTime.Now
            };
            await _context.RadiologyReports.AddAsync(report);
        }

        // T3/#218 (2026-09-04): trước đây đường này ghi đè Findings/Impression bất kể phiếu đang ở
        // trạng thái nào — kể cả phiếu ĐÃ KÝ SỐ. Chữ ký trong RadiologySignatureHistory vẫn giữ
        // Status=1 sau khi nội dung bị đổi, tức là chữ ký bảo chứng cho một nội dung khác nội dung
        // bác sĩ thực sự ký. Phải đi qua CancelApprovalAsync / CancelSignedResultAsync trước.
        //
        // Xét cả chữ ký chứ không chỉ Status: CancelApprovalAsync đưa phiếu về nháp nhưng KHÔNG thu
        // hồi chữ ký, nên nếu chỉ gác theo Status thì còn lối vòng ký → hủy duyệt → sửa.
        var hasActiveSignature = report.Id != Guid.Empty && await _context.Set<RadiologySignatureHistory>()
            .AnyAsync(s => s.RadiologyReportId == report.Id && s.Status == 1);
        RadiologyReportStatus.EnsureCanEditContent(report.Status, hasActiveSignature);

        report.Findings = dto.Description;
        report.Impression = dto.Conclusion;
        report.Recommendations = dto.Note;
        report.UpdatedAt = DateTime.Now;

        request.Status = 4; // Reported
        await _unitOfWork.SaveChangesAsync();

        return new RadiologyResultDto
        {
            Id = report.Id,
            OrderItemId = dto.OrderItemId,
            OrderCode = request.RequestCode,
            PatientId = request.PatientId,
            PatientCode = request.Patient.PatientCode,
            PatientName = request.Patient.FullName,
            ServiceCode = request.Service?.ServiceCode ?? "",
            ServiceName = request.Service?.ServiceName ?? "",
            ServiceType = GetRadiologyServiceTypeName(request.Service),
            ResultDate = DateTime.Now,
            Description = dto.Description,
            Conclusion = dto.Conclusion,
            Note = dto.Note,
            ApprovalStatus = "Draft",
            Images = new List<AttachedImageDto>()
        };
    }

    public async Task<RadiologyResultDto> GetRadiologyResultAsync(Guid orderItemId)
    {
        var request = await _context.RadiologyRequests
            .Include(r => r.Patient)
            .Include(r => r.Service)
            .Include(r => r.Exams)
                .ThenInclude(e => e.Report)
            .FirstOrDefaultAsync(r => r.Id == orderItemId);

        if (request == null) return null;

        var exam = request.Exams.FirstOrDefault();
        var report = exam?.Report;

        return new RadiologyResultDto
        {
            Id = report?.Id ?? Guid.Empty,
            OrderItemId = orderItemId,
            OrderCode = request.RequestCode,
            PatientId = request.PatientId,
            PatientCode = request.Patient.PatientCode,
            PatientName = request.Patient.FullName,
            ServiceCode = request.Service?.ServiceCode ?? "",
            ServiceName = request.Service?.ServiceName ?? "",
            ServiceType = GetRadiologyServiceTypeName(request.Service),
            ResultDate = report?.ReportDate ?? DateTime.Now,
            Description = report?.Findings ?? "",
            Conclusion = report?.Impression ?? "",
            Note = report?.Recommendations ?? "",
            ApprovalStatus = GetReportStatusName(report?.Status ?? 0),
            ApprovedTime = report?.ApprovedAt,
            Images = new List<AttachedImageDto>()
        };
    }

    public async Task<RadiologyResultDto> UpdateRadiologyResultAsync(Guid resultId, UpdateRadiologyResultDto dto)
    {
        var report = await _context.RadiologyReports
            .Include(r => r.RadiologyExam)
                .ThenInclude(e => e.RadiologyRequest)
                    .ThenInclude(req => req.Patient)
            .FirstOrDefaultAsync(r => r.Id == resultId);

        if (report == null) return null;

        // #218/T3: cùng lớp gác với EnterRadiologyResultAsync (§5). Bộ dò
        // `t3_verified_edit_sweep.py` chỉ ra rằng lớp gác ấy mới chỉ đặt ở MỘT trong bốn cửa ghi
        // vào Findings/Impression/Recommendations — ba cửa còn lại sửa được cả phiếu đã ký số,
        // trong khi chữ ký vẫn giữ Status=1 và tiếp tục bảo chứng cho nội dung đã bị thay.
        var hasActiveSignature = await _context.Set<RadiologySignatureHistory>()
            .AnyAsync(sig => sig.RadiologyReportId == resultId && sig.Status == 1);
        RadiologyReportStatus.EnsureCanEditContent(report.Status, hasActiveSignature);

        report.Findings = dto.Description;
        report.Impression = dto.Conclusion;
        report.Recommendations = dto.Note;
        report.UpdatedAt = DateTime.Now;

        await _unitOfWork.SaveChangesAsync();

        var request = report.RadiologyExam.RadiologyRequest;
        return new RadiologyResultDto
        {
            Id = report.Id,
            OrderItemId = request.Id,
            PatientId = request.PatientId,
            PatientCode = request.Patient.PatientCode,
            PatientName = request.Patient.FullName,
            Description = dto.Description,
            Conclusion = dto.Conclusion,
            Note = dto.Note,
            ApprovalStatus = GetReportStatusName(report.Status)
        };
    }

    public async Task<AttachedImageDto> AttachImageAsync(AttachImageDto dto)
    {
        return new AttachedImageDto
        {
            Id = Guid.NewGuid(),
            FileName = dto.FileName,
            FileType = dto.FileType,
            Description = dto.Description,
            SortOrder = dto.SortOrder,
            DicomStudyUID = dto.DicomStudyUID,
            DicomSeriesUID = dto.DicomSeriesUID,
            DicomInstanceUID = dto.DicomInstanceUID
        };
    }

    public async Task<bool> RemoveAttachedImageAsync(Guid imageId)
    {
        return await Task.FromResult(true);
    }
    #endregion
}
