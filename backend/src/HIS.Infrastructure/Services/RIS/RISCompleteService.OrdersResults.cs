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
            StudyInstanceUID = r.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID,
            Items = new List<RadiologyOrderItemDto>
            {
                new RadiologyOrderItemDto
                {
                    Id = r.Id,
                    ServiceId = r.ServiceId,
                    ServiceCode = r.Service?.ServiceCode ?? "",
                    ServiceName = r.Service?.ServiceName ?? "",
                    ServiceType = GetServiceTypeName(r.Service?.ServiceType ?? 0),
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
            StudyInstanceUID = request.Exams.SelectMany(e => e.DicomStudies).FirstOrDefault()?.StudyInstanceUID,
            Items = new List<RadiologyOrderItemDto>
            {
                new RadiologyOrderItemDto
                {
                    Id = request.Id,
                    ServiceId = request.ServiceId,
                    ServiceCode = request.Service?.ServiceCode ?? "",
                    ServiceName = request.Service?.ServiceName ?? "",
                    ServiceType = GetServiceTypeName(request.Service?.ServiceType ?? 0),
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

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByServiceTypeAsync(Guid serviceTypeId)
    {
        // Return templates based on service type
        return await Task.FromResult(GetDefaultTemplates());
    }

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByServiceAsync(Guid serviceId)
    {
        return await Task.FromResult(GetDefaultTemplates());
    }

    public async Task<List<RadiologyResultTemplateDto>> GetResultTemplatesByGenderAsync(string gender)
    {
        var templates = GetDefaultTemplates();
        return await Task.FromResult(templates.Where(t => t.Gender == "Both" || t.Gender == gender).ToList());
    }

    public async Task<List<RadiologyResultTemplateDto>> GetAllResultTemplatesAsync(string keyword = null)
    {
        return await Task.FromResult(GetDefaultTemplates());
    }

    public async Task<RadiologyResultTemplateDto> SaveResultTemplateAsync(SaveResultTemplateDto dto)
    {
        return new RadiologyResultTemplateDto
        {
            Id = dto.Id ?? Guid.NewGuid(),
            Code = dto.Code,
            Name = dto.Name,
            ServiceTypeId = dto.ServiceTypeId,
            ServiceId = dto.ServiceId,
            Gender = dto.Gender,
            DescriptionTemplate = dto.DescriptionTemplate,
            ConclusionTemplate = dto.ConclusionTemplate,
            NoteTemplate = dto.NoteTemplate,
            SortOrder = dto.SortOrder,
            IsDefault = dto.IsDefault,
            IsActive = dto.IsActive
        };
    }

    public async Task<bool> DeleteResultTemplateAsync(Guid templateId)
    {
        return await Task.FromResult(true);
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
            ServiceType = GetServiceTypeName(request.Service?.ServiceType ?? 0),
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
            ServiceType = GetServiceTypeName(request.Service?.ServiceType ?? 0),
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
