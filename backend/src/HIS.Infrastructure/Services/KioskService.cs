using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;
using HIS.Application.DTOs.Kiosk;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Self-service kiosk — cấp số tự động, checkin CCCD/BHYT, quản lý hàng chờ.
///
/// Số thứ tự format: {Prefix}{NNN} (VD: A001).
/// Prefix lấy từ ServiceType (O=OPD, L=LAB, I=IMAGING, P=PHARMACY) hoặc "A" mặc định.
/// Reset về 001 lúc 0h theo giờ VN (dùng VnTime.DayRangeUtc cho query sargable).
/// </summary>
public class KioskService : IKioskService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<KioskService> _logger;

    public KioskService(HISDbContext context, IUnitOfWork unitOfWork, ILogger<KioskService> logger)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string ServiceTypePrefix(string? serviceType) => serviceType?.ToUpperInvariant() switch
    {
        "LAB"      => "L",
        "IMAGING"  => "I",
        "PHARMACY" => "P",
        _          => "A"   // OPD và mặc định
    };

    private static string FormatTicketNumber(string prefix, int seq) =>
        $"{prefix}{seq:D3}";

    /// <summary>Lấy số thứ tự kế tiếp cho ngày VN hôm nay + khoa + serviceType.</summary>
    private async Task<int> NextSequenceAsync(DateTime issueDateVn, Guid? departmentId, string prefix)
    {
        var max = await _context.Set<KioskTicket>()
            .Where(t => t.IssueDate == issueDateVn.Date
                     && t.DepartmentId == departmentId
                     && t.TicketNumber.StartsWith(prefix))
            .MaxAsync(t => (int?)t.SequenceNumber) ?? 0;
        return max + 1;
    }

    private static KioskTicketDto ToDto(KioskTicket t, int? peopleAhead = null) => new()
    {
        Id              = t.Id,
        TicketNumber    = t.TicketNumber,
        SequenceNumber  = t.SequenceNumber,
        PatientName     = t.PatientName,
        DepartmentName  = t.Department?.DepartmentName,
        RoomName        = t.Room?.RoomName,
        ServiceType     = t.ServiceType,
        Status          = t.Status,
        IssuedAt        = t.IssuedAt,
        CalledAt        = t.CalledAt,
        Note            = t.Note,
        PeopleAheadInQueue = peopleAhead,
    };

    /// <summary>Che bớt tên BN để không lộ PII (VD: "Nguyễn Văn An" → "Nguyễn V** An").</summary>
    private static string MaskName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "";
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length <= 2) return name;
        // Che các từ đệm (ở giữa)
        for (int i = 1; i < parts.Length - 1; i++)
            parts[i] = parts[i][0] + "**";
        return string.Join(' ', parts);
    }

    // ── IKioskService implementation ──────────────────────────────────────────

    public async Task<KioskTicketDto> IssueTicketAsync(IssueTicketDto dto)
    {
        var todayVn  = VnTime.TodayVn;
        var nowUtc   = DateTime.UtcNow;
        var prefix   = ServiceTypePrefix(dto.ServiceType);
        var seq      = await NextSequenceAsync(todayVn, dto.DepartmentId, prefix);

        var ticket = new KioskTicket
        {
            Id             = Guid.NewGuid(),
            TicketNumber   = FormatTicketNumber(prefix, seq),
            SequenceNumber = seq,
            IssueDate      = todayVn.Date,
            DepartmentId   = dto.DepartmentId,
            RoomId         = dto.RoomId,
            ServiceType    = dto.ServiceType,
            PatientName    = dto.PatientName?.Trim(),
            Note           = dto.Note,
            Status         = 0,
            IssuedAt       = nowUtc,
            CreatedAt      = nowUtc,
        };

        _context.Set<KioskTicket>().Add(ticket);
        await _unitOfWork.SaveChangesAsync();

        // Load navigation props
        if (ticket.DepartmentId.HasValue)
            ticket.Department = await _context.Departments.FindAsync(ticket.DepartmentId.Value);
        if (ticket.RoomId.HasValue)
            ticket.Room = await _context.Rooms.FindAsync(ticket.RoomId.Value);

        var (fromUtc, toUtc) = VnTime.DayRangeUtc(todayVn);
        int ahead = await _context.Set<KioskTicket>()
            .CountAsync(t => t.IssuedAt >= fromUtc && t.IssuedAt < toUtc
                          && t.DepartmentId == dto.DepartmentId
                          && t.Status == 0
                          && t.SequenceNumber < seq);

        _logger.LogInformation("KioskTicket issued: {TicketNumber} dept={DeptId}", ticket.TicketNumber, dto.DepartmentId);
        return ToDto(ticket, ahead);
    }

    public async Task<CheckinResultDto> CheckinByCardAsync(CheckinByCardDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CitizenId) && string.IsNullOrWhiteSpace(dto.InsuranceCard))
            throw new ArgumentException("Cần nhập CCCD hoặc số thẻ BHYT.");

        // Tra cứu bệnh nhân
        Patient? patient = null;
        string? insuranceWarning = null;

        if (!string.IsNullOrWhiteSpace(dto.CitizenId))
            patient = await _context.Patients
                .Where(p => !p.IsDeleted)
                .FindByIdentityNumberDecryptedAsync(dto.CitizenId.Trim());

        if (patient == null && !string.IsNullOrWhiteSpace(dto.InsuranceCard))
        {
            // Tra qua InsuranceCards
            var card = await _context.Set<InsuranceCard>()
                .Include(c => c.Patient)
                .FirstOrDefaultAsync(c => c.CardNumber == dto.InsuranceCard.Trim() && c.IsActive);

            if (card != null)
            {
                patient = card.Patient;
                // Cảnh báo thẻ sắp hết hạn (30 ngày)
                if (card.EndDate.HasValue && card.EndDate.Value <= DateTime.Today.AddDays(30))
                    insuranceWarning = $"Thẻ BHYT hết hạn {card.EndDate.Value:dd/MM/yyyy} — vui lòng gia hạn.";
            }
        }

        var issueDto = new IssueTicketDto
        {
            DepartmentId = dto.DepartmentId,
            RoomId       = dto.RoomId,
            ServiceType  = dto.ServiceType,
            PatientName  = patient?.FullName,
            Note         = dto.Note,
        };

        var ticket = await IssueTicketAsync(issueDto);

        // Gắn PatientId vào ticket nếu tìm được
        if (patient != null)
        {
            var entity = await _context.Set<KioskTicket>().FindAsync(ticket.Id);
            if (entity != null)
            {
                entity.PatientId   = patient.Id;
                entity.CitizenId   = dto.CitizenId?.Trim();
                entity.InsuranceCard = dto.InsuranceCard?.Trim();
                await _unitOfWork.SaveChangesAsync();
            }
        }

        return new CheckinResultDto
        {
            Ticket            = ticket,
            PatientFound      = patient != null,
            MaskedPatientName = patient != null ? MaskName(patient.FullName) : null,
            InsuranceWarning  = insuranceWarning,
        };
    }

    public async Task<QueueStatusDto> GetQueueStatusAsync(Guid? departmentId, Guid? roomId)
    {
        var (fromUtc, toUtc) = VnTime.DayRangeUtc(VnTime.TodayVn);

        var query = _context.Set<KioskTicket>()
            .Include(t => t.Department)
            .Include(t => t.Room)
            .Where(t => !t.IsDeleted
                     && t.IssuedAt >= fromUtc && t.IssuedAt < toUtc
                     && t.Status != 3); // bỏ đã hủy

        if (departmentId.HasValue) query = query.Where(t => t.DepartmentId == departmentId);
        if (roomId.HasValue)       query = query.Where(t => t.RoomId == roomId);

        var tickets = await query.OrderBy(t => t.SequenceNumber).ToListAsync();

        var waiting   = tickets.Where(t => t.Status == 0).ToList();
        var calledNow = tickets.FirstOrDefault(t => t.Status == 1);

        string? deptName = null;
        if (departmentId.HasValue)
            deptName = (await _context.Departments.FindAsync(departmentId.Value))?.DepartmentName;

        return new QueueStatusDto
        {
            DepartmentId         = departmentId,
            DepartmentName       = deptName,
            WaitingCount         = waiting.Count,
            CurrentCalledTicket  = calledNow?.TicketNumber,
            WaitingTickets       = waiting.Select(t => ToDto(t)).ToList(),
        };
    }

    public async Task<KioskTicketDto?> CallNextAsync(CallNextDto dto)
    {
        var (fromUtc, toUtc) = VnTime.DayRangeUtc(VnTime.TodayVn);

        var next = await _context.Set<KioskTicket>()
            .Where(t => !t.IsDeleted
                     && t.IssuedAt >= fromUtc && t.IssuedAt < toUtc
                     && t.Status == 0)
            .If(dto.DepartmentId.HasValue, q => q.Where(t => t.DepartmentId == dto.DepartmentId))
            .If(dto.RoomId.HasValue,       q => q.Where(t => t.RoomId == dto.RoomId))
            .OrderBy(t => t.SequenceNumber)
            .FirstOrDefaultAsync();

        if (next == null) return null;

        next.Status   = 1;
        next.CalledAt = DateTime.UtcNow;
        next.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await _context.Entry(next).Reference(t => t.Department).LoadAsync();
        await _context.Entry(next).Reference(t => t.Room).LoadAsync();

        _logger.LogInformation("KioskTicket called: {TicketNumber}", next.TicketNumber);
        return ToDto(next);
    }

    public async Task<KioskTicketDto> CompleteTicketAsync(Guid ticketId)
    {
        var ticket = await _context.Set<KioskTicket>()
            .Include(t => t.Department).Include(t => t.Room)
            .FirstOrDefaultAsync(t => t.Id == ticketId)
            ?? throw new KeyNotFoundException($"Không tìm thấy phiếu {ticketId}.");

        ticket.Status    = 2;
        ticket.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        return ToDto(ticket);
    }

    public async Task<KioskTicketDto> CancelTicketAsync(Guid ticketId)
    {
        var ticket = await _context.Set<KioskTicket>()
            .Include(t => t.Department).Include(t => t.Room)
            .FirstOrDefaultAsync(t => t.Id == ticketId)
            ?? throw new KeyNotFoundException($"Không tìm thấy phiếu {ticketId}.");

        ticket.Status    = 3;
        ticket.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        return ToDto(ticket);
    }

    public async Task<KioskTicketDto?> GetByIdAsync(Guid id)
    {
        var t = await _context.Set<KioskTicket>()
            .Include(x => x.Department).Include(x => x.Room)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        return t == null ? null : ToDto(t);
    }
}

// ── Tiny LINQ extension để chain điều kiện có/không filter ───────────────────
file static class QueryExtensions
{
    public static IQueryable<T> If<T>(this IQueryable<T> q, bool condition, Func<IQueryable<T>, IQueryable<T>> filter)
        => condition ? filter(q) : q;
}
