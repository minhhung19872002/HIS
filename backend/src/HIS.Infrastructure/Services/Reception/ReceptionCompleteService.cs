using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Properties;
using iText.Barcodes;
using IxPageSize = iText.Kernel.Geom.PageSize;
using QueueDailyStatisticsDto = HIS.Application.DTOs.Reception.QueueDailyStatisticsDto;
using AverageWaitingTimeDto = HIS.Application.DTOs.Reception.AverageWaitingTimeDto;
using QueueReportRequestDto = HIS.Application.DTOs.Reception.QueueReportRequestDto;
using QueueConfigurationDto = HIS.Application.DTOs.Reception.QueueConfigurationDto;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IReceptionCompleteService — handles all reception/registration workflows.
///
/// K9 phien (2026-05-30): converted to partial class. ZERO runtime change — partial class.
/// </summary>
public partial class ReceptionCompleteService : IReceptionCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Patient> _patientRepo;
    private readonly IRepository<MedicalRecord> _medicalRecordRepo;
    private readonly IRepository<Examination> _examinationRepo;
    private readonly IRepository<QueueTicket> _queueTicketRepo;
    private readonly IRepository<QueueConfiguration> _queueConfigRepo;
    private readonly IRepository<Room> _roomRepo;
    private readonly IRepository<Department> _departmentRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IBhxhGatewayClient _bhxhClient;
    private readonly BhxhGatewayOptions _bhxhOptions;
    private readonly ILogger<ReceptionCompleteService>? _receptionLogger;

    public ReceptionCompleteService(
        HISDbContext context,
        IRepository<Patient> patientRepo,
        IRepository<MedicalRecord> medicalRecordRepo,
        IRepository<Examination> examinationRepo,
        IRepository<QueueTicket> queueTicketRepo,
        IRepository<QueueConfiguration> queueConfigRepo,
        IRepository<Room> roomRepo,
        IRepository<Department> departmentRepo,
        IRepository<User> userRepo,
        IUnitOfWork unitOfWork,
        IBhxhGatewayClient bhxhClient,
        IOptions<BhxhGatewayOptions>? bhxhOptions = null,
        ILogger<ReceptionCompleteService>? logger = null)
    {
        _bhxhOptions = bhxhOptions?.Value ?? new BhxhGatewayOptions();
        _receptionLogger = logger;
        _context = context;
        _patientRepo = patientRepo;
        _medicalRecordRepo = medicalRecordRepo;
        _examinationRepo = examinationRepo;
        _queueTicketRepo = queueTicketRepo;
        _queueConfigRepo = queueConfigRepo;
        _roomRepo = roomRepo;
        _departmentRepo = departmentRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _bhxhClient = bhxhClient;
    }








    #region Private Helper Methods

    private static byte[] BuildSimplePdf(
        string title,
        IEnumerable<KeyValuePair<string, string>> fields,
        IEnumerable<string>? details = null)
    {
        using var memoryStream = new MemoryStream();
        using var writer = new PdfWriter(memoryStream);
        using var pdf = new PdfDocument(writer);
        using var document = new Document(pdf);

        var regularFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
        var boldFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);

        document.Add(new iText.Layout.Element.Paragraph(title)
            .SetFont(boldFont)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetFontSize(16)
            .SetMarginBottom(12));

        foreach (var field in fields)
        {
            var key = string.IsNullOrWhiteSpace(field.Key) ? "-" : field.Key;
            var value = string.IsNullOrWhiteSpace(field.Value) ? "-" : field.Value;
            document.Add(new iText.Layout.Element.Paragraph($"{key}: {value}")
                .SetFont(regularFont)
                .SetFontSize(10)
                .SetMarginBottom(4));
        }

        if (details != null)
        {
            var detailItems = details.Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
            if (detailItems.Count > 0)
            {
                document.Add(new iText.Layout.Element.Paragraph("DETAILS")
                    .SetFont(boldFont)
                    .SetFontSize(12)
                    .SetMarginTop(12)
                    .SetMarginBottom(6));

                foreach (var detail in detailItems)
                {
                    document.Add(new iText.Layout.Element.Paragraph($"- {detail}")
                        .SetFont(regularFont)
                        .SetFontSize(9)
                        .SetMarginBottom(2));
                }
            }
        }

        document.Add(new iText.Layout.Element.Paragraph($"Generated at: {DateTime.Now:yyyy-MM-dd HH:mm:ss}")
            .SetFont(regularFont)
            .SetFontSize(8)
            .SetTextAlignment(TextAlignment.RIGHT)
            .SetMarginTop(16));

        document.Close();
        return memoryStream.ToArray();
    }

    private async Task<(int Total, int Waiting, int InProgress, int WaitingResult, int Completed, int DoingLab, int InsuranceCount)> GetRoomStatsAsync(Guid roomId, DateTime date)
    {
        // Source of truth for "patients in room today" is MedicalRecord, not
        // Examination. A reception flow creates an MR and assigns it to a
        // room before any examination row exists; the OPD page later spawns
        // Examinations only when the doctor opens the encounter.
        // Status mapping aligns with MedicalRecord.Status:
        //   0=Waiting (chờ tiếp đón) | 1=InProgress (đang khám)
        //   2=WaitingResult (chờ kết quả CLS) | 3=Completed (hoàn thành)
        // AdmissionDate ghi bằng DateTime.Now — DayRangeUtc tránh lệch UTC 00h-07h VN.
        var (admFromUtc, admToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(date);
        var records = await _context.MedicalRecords
            .Where(m => m.RoomId == roomId && m.AdmissionDate >= admFromUtc && m.AdmissionDate < admToUtc)
            .Select(m => new { m.Status, m.PatientType })
            .ToListAsync();

        return (
            Total: records.Count,
            Waiting: records.Count(m => m.Status == 0),
            InProgress: records.Count(m => m.Status == 1),
            WaitingResult: records.Count(m => m.Status == 2),
            Completed: records.Count(m => m.Status == 3),
            DoingLab: records.Count(m => m.Status == 2),
            InsuranceCount: records.Count(m => m.PatientType == 1)
        );
    }

    private async Task<int> CalculateEstimatedWaitAsync(Guid roomId, int queueType)
    {
        // IssueDate chuẩn hóa UTC — dùng DayRangeUtc để tránh lệch UTC 00h-07h VN.
        var (ewFromUtc, ewToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);

        // Get waiting tickets ahead (status 0=waiting), ordered by priority then queue number
        var waitingTickets = await _context.QueueTickets
            .Where(t => t.RoomId == roomId && t.QueueType == queueType && t.IssueDate >= ewFromUtc && t.IssueDate < ewToUtc && t.Status == 0)
            .ToListAsync();

        if (waitingTickets.Count == 0)
            return 0;

        // Calculate average service time from completed tickets today
        var completedToday = await _context.QueueTickets
            .Where(t => t.RoomId == roomId && t.QueueType == queueType && t.IssueDate >= ewFromUtc && t.IssueDate < ewToUtc
                && t.Status == 3 && t.CalledTime.HasValue && t.CompletedTime.HasValue)
            .Select(t => new { t.CalledTime, t.CompletedTime })
            .ToListAsync();

        double avgMinutesPerPatient;
        if (completedToday.Count >= 3)
        {
            // Use actual average from today's completed tickets
            avgMinutesPerPatient = completedToday
                .Average(t => (t.CompletedTime!.Value - t.CalledTime!.Value).TotalMinutes);
            // Clamp to reasonable range (2-30 min)
            avgMinutesPerPatient = Math.Clamp(avgMinutesPerPatient, 2, 30);
        }
        else
        {
            // Fall back to Service.EstimatedMinutes or default 5 min
            var room = await _context.Rooms
                .Include(r => r.Department)
                .FirstOrDefaultAsync(r => r.Id == roomId);

            if (room != null && queueType == 2) // Examination room
            {
                var avgServiceMinutes = await _context.Services
                    .Where(s => s.ServiceType == 1 && s.EstimatedMinutes > 0 && s.IsActive)
                    .AverageAsync(s => (double?)s.EstimatedMinutes);
                avgMinutesPerPatient = avgServiceMinutes ?? 5;
            }
            else
            {
                avgMinutesPerPatient = 5; // Default 5 min per patient
            }
        }

        // Count tickets ahead, weighting by priority (priority patients served faster)
        var normalCount = waitingTickets.Count(t => t.Priority == 0);
        var priorityCount = waitingTickets.Count(t => t.Priority == 1);
        var emergencyCount = waitingTickets.Count(t => t.Priority == 2);

        // Emergency and priority patients are served first, so they add less wait
        var effectiveCount = normalCount + (priorityCount * 0.7) + (emergencyCount * 0.3);

        return (int)Math.Ceiling(effectiveCount * avgMinutesPerPatient);
    }

    /// <summary>
    /// R3 đa cơ sở: chi nhánh của user thao tác (User.BranchId, fallback Department.BranchId).
    /// Best-effort — NULL = không gắn chi nhánh (behavior cũ), không chặn nghiệp vụ.
    /// </summary>
    private async Task<Guid?> GetUserBranchIdAsync(Guid userId)
    {
        return await _context.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.BranchId ?? (u.Department != null ? u.Department.BranchId : null))
            .FirstOrDefaultAsync();
    }

    private async Task<string> GeneratePatientCodeAsync()
    {
        var today = DateTime.Today;
        var prefix = $"BN{today:yyyyMMdd}";

        // Get the max patient code with today's prefix
        var maxCode = await _context.Patients
            .IgnoreQueryFilters()
            .Where(p => p.PatientCode.StartsWith(prefix))
            .OrderByDescending(p => p.PatientCode)
            .Select(p => p.PatientCode)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (!string.IsNullOrEmpty(maxCode) && maxCode.Length > prefix.Length)
        {
            if (int.TryParse(maxCode.Substring(prefix.Length), out int currentNumber))
            {
                nextNumber = currentNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D4}";
    }

    private async Task<string> GenerateMedicalRecordCodeAsync()
    {
        var today = DateTime.Today;
        var prefix = $"MR{today:yyyyMMdd}";

        var maxCode = await _context.MedicalRecords
            .Where(m => m.MedicalRecordCode.StartsWith(prefix))
            .OrderByDescending(m => m.MedicalRecordCode)
            .Select(m => m.MedicalRecordCode)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (!string.IsNullOrEmpty(maxCode) && maxCode.Length > prefix.Length)
        {
            if (int.TryParse(maxCode.Substring(prefix.Length), out int currentNumber))
            {
                nextNumber = currentNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D4}";
    }

    private async Task<string> GenerateDepositReceiptNumberAsync()
    {
        // ReceiptDate ghi bằng DateTime.Now — DayRangeUtc tránh lệch UTC 00h-07h VN.
        var todayVn = HIS.Core.Common.VnTime.TodayVn;
        var (depFromUtc, depToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(todayVn);
        var count = await _context.Deposits.CountAsync(d => d.ReceiptDate >= depFromUtc && d.ReceiptDate < depToUtc);
        return $"TU{todayVn:yyyyMMdd}{(count + 1):D4}";
    }

    private async Task<string> GeneratePaymentReceiptNumberAsync()
    {
        // ReceiptDate ghi bằng DateTime.Now — DayRangeUtc tránh lệch UTC 00h-07h VN.
        var todayVn = HIS.Core.Common.VnTime.TodayVn;
        var (payFromUtc, payToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(todayVn);
        var count = await _context.Payments.CountAsync(p => p.ReceiptDate >= payFromUtc && p.ReceiptDate < payToUtc);
        return $"PT{todayVn:yyyyMMdd}{(count + 1):D4}";
    }

    private QueueTicketDto MapToQueueTicketDto(QueueTicket ticket)
    {
        return new QueueTicketDto
        {
            Id = ticket.Id,
            TicketCode = ticket.TicketNumber,
            QueueNumber = ticket.QueueNumber,
            QueueDate = ticket.IssueDate,
            PatientId = ticket.PatientId,
            PatientCode = ticket.Patient?.PatientCode,
            PatientName = ticket.Patient?.FullName,
            RoomId = ticket.RoomId ?? Guid.Empty,
            RoomName = ticket.Room?.RoomName ?? "",
            QueueType = ticket.QueueType,
            Priority = ticket.Priority,
            Status = ticket.Status,
            CalledCount = 1,
            CalledAt = ticket.CalledTime,
            CompletedAt = ticket.CompletedTime,
            CalledBy = ticket.CalledByUser?.FullName
        };
    }

    private async Task<DocumentHoldDto> MapToDocumentHoldDtoAsync(DocumentHold hold)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == hold.MedicalRecordId);

        return new DocumentHoldDto
        {
            Id = hold.Id,
            AdmissionId = hold.MedicalRecordId ?? Guid.Empty,
            PatientCode = medicalRecord?.Patient?.PatientCode ?? "",
            PatientName = medicalRecord?.Patient?.FullName ?? "",
            MedicalRecordCode = medicalRecord?.MedicalRecordCode ?? "",
            DocumentType = hold.DocumentType.ToString(),
            DocumentNumber = hold.DocumentNumber ?? "",
            Description = hold.Description ?? "",
            HoldDate = hold.HoldDate,
            ReturnDate = hold.ReturnDate,
            Status = hold.Status == 1 ? "Holding" : "Returned",
            Note = hold.Notes ?? ""
        };
    }

    private AdmissionDto MapToAdmissionDto(MedicalRecord record, Patient patient, Room? room, QueueTicketDto? ticket)
    {
        return new AdmissionDto
        {
            Id = record.Id,
            AdmissionCode = record.MedicalRecordCode,
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            DateOfBirth = patient.DateOfBirth,
            YearOfBirth = patient.YearOfBirth,
            Gender = patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "Khác",
            Address = patient.Address ?? "",
            PhoneNumber = patient.PhoneNumber ?? "",
            IdentityNumber = patient.IdentityNumber ?? "",
            InsuranceNumber = record.InsuranceNumber ?? "",
            AdmissionDate = record.AdmissionDate,
            DepartmentId = room?.DepartmentId ?? Guid.Empty,
            DepartmentName = room?.Department?.DepartmentName ?? "",
            RoomId = room?.Id,
            RoomName = room?.RoomName ?? "",
            Status = record.Status == 0 ? "Waiting" : record.Status == 1 ? "InProgress" : "Completed",
            QueueNumber = ticket?.QueueNumber ?? 0,
            QueueCode = ticket?.TicketCode ?? "",
            Priority = ticket?.Priority ?? 0,
            IsEmergency = record.TreatmentType == 3,
            IsPriority = (ticket?.Priority ?? 0) > 0,
            CreatedDate = record.CreatedAt
        };
    }

    private string GetDocumentTypeName(int documentType)
    {
        return documentType switch
        {
            1 => "CCCD/CMND",
            2 => "The BHYT",
            3 => "Giay gioi thieu",
            4 => "Giay chuyen vien",
            _ => "Giay to khac"
        };
    }

    #endregion
}
