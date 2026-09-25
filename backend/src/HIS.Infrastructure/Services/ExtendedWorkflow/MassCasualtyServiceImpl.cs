using HIS.Application.DTOs.MassCasualty;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;

namespace HIS.Infrastructure.Services;

// K7 phien 3 (2026-05-30): tach MassCasualtyServiceImpl (~498 dong) khoi ExtendedWorkflowServices.cs.
public class MassCasualtyServiceImpl : IMassCasualtyService
{
    private readonly HISDbContext _context;
    public MassCasualtyServiceImpl(HISDbContext context) => _context = context;

    public async Task<MCIEventDto> GetActiveEventAsync()
    {
        // QA-R2: several events can be Active at once; without an order the "active event" was arbitrary.
        var e = await _context.MCIEvents.Include(x => x.Victims)
            .Where(x => x.Status == "Active")
            .OrderByDescending(x => x.ActivatedAt)
            .FirstOrDefaultAsync();
        if (e == null) return null!;
        return MapToEventDto(e);
    }

    public async Task<List<MCIEventDto>> GetEventsAsync(DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.MCIEvents.Include(x => x.Victims).AsQueryable();
        if (fromDate.HasValue) query = query.Where(x => x.ActivatedAt >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(x => x.ActivatedAt <= toDate.Value);
        var list = await query.OrderByDescending(x => x.ActivatedAt).ToBoundedListAsync("MassCasualty.GetEvents");
        return list.Select(MapToEventDto).ToList();
    }

    public async Task<MCIEventDto> GetEventAsync(Guid id)
    {
        var e = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapToEventDto(e);
    }

    // QA-R4: the board (v2 EmergencyDisaster) can only show ONE active event; a second activation used to
    // create a parallel Active event that hid the first one and could never be closed from the UI.
    private static readonly string[] TriageCategories = { "Red", "Yellow", "Green", "Black" };
    private static readonly string[] VictimStatuses = { "Active", "Admitted", "Discharged", "Transferred", "Deceased" };

    /// <summary>
    /// Refuses a second MCI activation only while another event started TODAY is still running — that is the real
    /// double-activation the guard is for. Events left "Active" from previous days are stale housekeeping (the dev
    /// database alone carries 11) and must not block a new incident; the caller surfaces them as a warning instead.
    /// </summary>
    private async Task<string?> EnsureNoActiveEventAsync()
    {
        var today = DateTime.Now.Date;
        var active = await _context.MCIEvents.Where(x => x.Status == "Active")
            .OrderByDescending(x => x.ActivatedAt)
            .Select(x => new { x.EventCode, x.ActivatedAt })
            .FirstOrDefaultAsync();
        if (active == null) return null;
        if (active.ActivatedAt >= today)
            throw new InvalidOperationException($"Đang có sự kiện {active.EventCode} kích hoạt hôm nay chưa kết thúc — kết thúc sự kiện đó trước khi kích hoạt sự kiện mới.");
        return active.EventCode;
    }

    private async Task EnsureVictimEventActiveAsync(Guid eventId)
    {
        if (!await _context.MCIEvents.AnyAsync(x => x.Id == eventId && x.Status == "Active"))
            throw new InvalidOperationException("Sự kiện MCI đã kết thúc — không thay đổi phân loại/trạng thái nạn nhân được nữa.");
    }

    public async Task<MCIEventDto> ActivateEventAsync(ActivateMCIEventDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.EventName))
            throw new ArgumentException("Chưa nhập tên sự kiện.");
        await EnsureNoActiveEventAsync();
        var entity = new MCIEvent
        {
            Id = Guid.NewGuid(),
            EventCode = $"MCI{DateTime.Now:yyyyMMddHHmmss}",
            EventName = dto.EventName,
            EventType = dto.EventType,
            EventLocation = dto.Location,
            AlertReceivedAt = DateTime.Now,
            ActivatedAt = DateTime.Now,
            AlertLevel = dto.AlertLevel ?? "Yellow",
            EstimatedVictims = dto.EstimatedCasualties,
            Status = "Active",
            IncidentCommanderId = Guid.Empty,
            CreatedAt = DateTime.Now
        };
        _context.MCIEvents.Add(entity);
        await _context.SaveChangesAsync();
        return new MCIEventDto { Id = entity.Id, EventCode = entity.EventCode, EventName = entity.EventName, EventType = entity.EventType, Location = entity.EventLocation, AlertLevel = entity.AlertLevel, Status = "Active", ActivatedAt = entity.ActivatedAt };
    }

    // Pre-push review: only the SAME user's double-press within a short window is merged — the v2 button always
    // sends the hospital-wide location, so matching on location alone swallowed a second nurse's real alarm.
    private static readonly TimeSpan CodeBlueDedupWindow = TimeSpan.FromSeconds(20);

    public async Task<MCIEventDto> ActivateCodeBlueAsync(string location, Guid activatedByUserId)
    {
        // Code Blue (báo động đỏ) must NEVER be refusable: it is pressed during a cardiac arrest and a stale
        // un-closed MCI event is a housekeeping problem, not a reason to block the alarm. Pre-push review of QA
        // round 4 measured 11 events still "Active" — the guard would have made the button 100% dead.
        // QA-R9 (double-submit): two presses in the same second created two events with the SAME code. A repeat
        // press for the same location within CodeBlueDedupWindow now returns the running event (AlreadyActive),
        // serialized by an app lock. The lock never refuses the alarm: on timeout we still create the event.
        var eventLocation = string.IsNullOrWhiteSpace(location) ? "Toàn bệnh viện" : location.Trim();
        await using var tx = await SqlAppLock.BeginAsync(_context);
        try
        {
            await SqlAppLock.AcquireAsync(_context, "HIS.MCI.CodeBlue", "busy", 3000);
        }
        catch (InvalidOperationException)
        {
            // Lock busy — fall through and create the event anyway (the alarm must never be blocked).
        }

        var windowStart = DateTime.Now - CodeBlueDedupWindow;
        var existing = await _context.MCIEvents
            .Where(x => x.Status == "Active" && x.EventCode.StartsWith("CODEBLUE")
                        && x.EventLocation == eventLocation && x.ActivatedAt >= windowStart
                        && activatedByUserId != Guid.Empty && x.IncidentCommanderId == activatedByUserId)
            .OrderByDescending(x => x.ActivatedAt)
            .FirstOrDefaultAsync();
        if (existing != null)
        {
            if (tx != null) await tx.CommitAsync();
            return new MCIEventDto
            {
                Id = existing.Id,
                EventCode = existing.EventCode,
                EventName = existing.EventName,
                EventType = existing.EventType,
                Location = existing.EventLocation,
                AlertLevel = existing.AlertLevel,
                Status = existing.Status,
                ActivatedAt = existing.ActivatedAt,
                AlreadyActive = true
            };
        }

        // Unique code: millisecond stamp + skip a taken one (same scheme as BillingCompleteService.NextStampCodeAsync).
        var now = DateTime.Now;
        var code = $"CODEBLUE{now:yyyyMMddHHmmssfff}";
        for (var i = 0; i < 50 && await _context.MCIEvents.AnyAsync(x => x.EventCode == code); i++)
        {
            await Task.Delay(2);
            now = DateTime.Now;
            code = $"CODEBLUE{now:yyyyMMddHHmmssfff}";
        }
        var entity = new MCIEvent
        {
            Id = Guid.NewGuid(),
            EventCode = code,
            EventName = "Code Blue — Báo động đỏ cấp cứu",
            EventType = "Violence",
            EventLocation = eventLocation,
            AlertReceivedAt = now,
            ActivatedAt = now,
            AlertLevel = "Red",
            EstimatedVictims = 0,
            Status = "Active",
            IncidentCommanderId = activatedByUserId,
            BloodBankAlerted = true,
            ORsCleared = true,
            CreatedAt = now,
            CreatedBy = activatedByUserId != Guid.Empty ? activatedByUserId.ToString() : null
        };
        _context.MCIEvents.Add(entity);
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return new MCIEventDto
        {
            Id = entity.Id,
            EventCode = entity.EventCode,
            EventName = entity.EventName,
            EventType = entity.EventType,
            Location = entity.EventLocation,
            AlertLevel = entity.AlertLevel,
            Status = "Active",
            ActivatedAt = entity.ActivatedAt
        };
    }

    public async Task<MCIEventDto> UpdateEventAsync(UpdateMCIEventDto dto)
    {
        var e = await _context.MCIEvents.FindAsync(dto.EventId);
        if (e == null) return null!;
        if (!string.IsNullOrEmpty(dto.Status)) e.Status = dto.Status;
        if (!string.IsNullOrEmpty(dto.AlertLevel)) e.AlertLevel = dto.AlertLevel;
        await _context.SaveChangesAsync();
        return new MCIEventDto { Id = e.Id, EventCode = e.EventCode, EventName = e.EventName, Status = e.Status, AlertLevel = e.AlertLevel };
    }

    public async Task<bool> EscalateEventAsync(Guid eventId, string newAlertLevel)
    {
        var e = await _context.MCIEvents.FindAsync(eventId);
        if (e == null) return false;
        e.AlertLevel = newAlertLevel;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeactivateEventAsync(Guid eventId, string reason)
    {
        var e = await _context.MCIEvents.FindAsync(eventId);
        // QA-R2: ending an already-ended event overwrote DeactivatedAt and the after-action report.
        if (e == null || e.Status != "Active") return false;
        e.Status = "Deactivated";
        e.DeactivatedAt = DateTime.Now;
        e.AfterActionReport = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<MCIVictimDto>> GetVictimsAsync(Guid eventId, string? triageCategory = null, string? status = null)
    {
        var query = _context.MCIVictims.Where(x => x.MCIEventId == eventId);
        if (!string.IsNullOrEmpty(triageCategory)) query = query.Where(x => x.TriageCategory == triageCategory);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.OrderByDescending(x => x.ArrivalTime).ToBoundedListAsync("MassCasualty.GetVictims");
        return list.Select(MapToVictimDto).ToList();
    }

    public async Task<MCIVictimDto> GetVictimAsync(Guid id)
    {
        var e = await _context.MCIVictims.FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapToVictimDto(e);
    }

    public async Task<MCIVictimDto> RegisterVictimAsync(RegisterMCIVictimDto dto)
    {
        if (!await _context.MCIEvents.AnyAsync(x => x.Id == dto.EventId && x.Status == "Active"))
            throw new InvalidOperationException("Sự kiện MCI không tồn tại hoặc đã kết thúc — không tiếp nhận nạn nhân vào sự kiện này.");
        var victimCount = await _context.MCIVictims.CountAsync(x => x.MCIEventId == dto.EventId) + 1;
        var entity = new MCIVictim
        {
            Id = Guid.NewGuid(),
            MCIEventId = dto.EventId,
            TagNumber = $"TAG{victimCount:D4}",
            Name = dto.Name,
            EstimatedAge = dto.EstimatedAge,
            Gender = dto.Gender,
            IdentifyingFeatures = dto.Description,
            TriageCategory = dto.TriageCategory ?? string.Empty, // not yet triaged; entity column is read as non-null
            TriageTime = DateTime.Now,
            RespiratoryRate = dto.RespiratoryRate,
            HasRadialPulse = dto.Pulse?.ToLower() == "present",
            FollowsCommands = dto.MentalStatus?.ToLower() == "alert",
            CanWalk = dto.CanWalk,
            InjuryDescription = dto.ChiefComplaint,
            ArrivalTime = DateTime.Now,
            CurrentLocation = "Triage",
            Status = "Active",
            CreatedAt = DateTime.Now
        };
        _context.MCIVictims.Add(entity);

        // Update event victim count
        var evt = await _context.MCIEvents.FindAsync(dto.EventId);
        if (evt != null) evt.ActualVictims++;

        await _context.SaveChangesAsync();
        return MapToVictimDto(entity);
    }

    public async Task<MCIVictimDto> UpdateVictimAsync(Guid id, MCIVictimDto dto)
    {
        var e = await _context.MCIVictims.FindAsync(id);
        if (e == null) return null!;
        // QA-R4: status is a fixed set (the board maps it to disposition); no status/location change on a closed event.
        // Treatment notes stay editable for after-action documentation.
        if (dto.Status != null && !VictimStatuses.Contains(dto.Status, StringComparer.OrdinalIgnoreCase))
            throw new ArgumentException($"Trạng thái nạn nhân không hợp lệ: '{dto.Status}' (Active/Admitted/Discharged/Transferred/Deceased).");
        if (dto.Status != null || dto.CurrentLocation != null || dto.Name != null)
            await EnsureVictimEventActiveAsync(e.MCIEventId);
        // QA-R2: partial update — a notes-only PUT used to null out Name/CurrentLocation/Status.
        if (dto.Name != null) e.Name = dto.Name;
        if (dto.CurrentLocation != null) e.CurrentLocation = dto.CurrentLocation;
        if (dto.Status != null) e.Status = VictimStatuses.First(s => s.Equals(dto.Status, StringComparison.OrdinalIgnoreCase));
        if (dto.TreatmentNotes != null) e.InitialTreatment = dto.TreatmentNotes;
        await _context.SaveChangesAsync();
        return MapToVictimDto(e);
    }

    public async Task<MCIVictimDto> ReTriageVictimAsync(ReTriageDto dto)
    {
        var e = await _context.MCIVictims.FindAsync(dto.VictimId);
        if (e == null) return null!;
        // QA-R4: any string ("Purple") was stored as the triage colour; re-triage on a closed event was accepted.
        var category = TriageCategories.FirstOrDefault(c => c.Equals(dto.NewCategory?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException($"Phân loại triage không hợp lệ: '{dto.NewCategory}' (Red/Yellow/Green/Black).");
        await EnsureVictimEventActiveAsync(e.MCIEventId);
        e.TriageCategory = category;
        e.TriageTime = DateTime.Now;
        e.TriageNotes = dto.Reason;
        await _context.SaveChangesAsync();
        return MapToVictimDto(e);
    }

    public async Task<bool> IdentifyVictimAsync(Guid victimId, string name, string idNumber, DateTime? dateOfBirth)
    {
        var e = await _context.MCIVictims.FindAsync(victimId);
        if (e == null) return false;
        e.Name = name;
        // Check if patient exists
        var patient = await _context.Patients
            .Where(p => !p.IsDeleted)
            .FindByIdentityNumberDecryptedAsync(idNumber);
        if (patient != null) e.PatientId = patient.Id;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AssignVictimLocationAsync(Guid victimId, string area, string assignedTo)
    {
        var e = await _context.MCIVictims.FindAsync(victimId);
        if (e == null) return false;
        e.CurrentLocation = area;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<MCIVictimDto> RecordTreatmentAsync(Guid victimId, MCITreatmentDto treatment)
    {
        var e = await _context.MCIVictims.FindAsync(victimId);
        if (e == null) return null!;
        e.InitialTreatment = (e.InitialTreatment ?? "") + $"\n[{DateTime.Now:HH:mm}] {treatment.Treatment}";
        await _context.SaveChangesAsync();
        return MapToVictimDto(e);
    }

    public async Task<MCIVictimDto> DispositionVictimAsync(Guid victimId, string disposition, string? destination = null)
    {
        var e = await _context.MCIVictims.FindAsync(victimId);
        if (e == null) return null!;
        e.Status = disposition;
        if (!string.IsNullOrEmpty(destination)) e.CurrentLocation = destination;
        await _context.SaveChangesAsync();
        return MapToVictimDto(e);
    }

    public async Task<MCIResourceStatusDto> GetResourceStatusAsync(Guid eventId)
    {
        // QA-R11: Beds.Status is not maintained by assign/transfer/release (dev data: 3 "Trống" beds occupied, 2 "Đang
        // sử dụng" beds free), so the MCI board showed the wrong free-bed count. Free = usable bed with no active
        // assignment — the same rule as the ward map / assign-bed.
        var totalBeds = await _context.Beds.CountAsync(b => b.IsActive);
        var availableBeds = await _context.Beds.CountAsync(b => b.IsActive && b.Status != 2
            && !_context.BedAssignments.Any(ba => ba.BedId == b.Id && ba.Status == 0));
        var staff = await _context.MedicalStaffs.Where(s => s.Status == "Active").ToListAsync();
        return new MCIResourceStatusDto
        {
            EventId = eventId,
            UpdatedAt = DateTime.Now,
            TotalBeds = totalBeds,
            AvailableBeds = availableBeds,
            DoctorsOnDuty = staff.Count(s => s.StaffType == "Doctor"),
            NursesOnDuty = staff.Count(s => s.StaffType == "Nurse")
        };
    }

    public Task<MCIResourceStatusDto> UpdateResourceStatusAsync(Guid eventId, MCIResourceStatusDto dto)
    {
        dto.EventId = eventId;
        dto.UpdatedAt = DateTime.Now;
        return Task.FromResult(dto);
    }

    public Task<StaffCalloutDto> InitiateStaffCalloutAsync(Guid eventId)
    {
        return Task.FromResult(new StaffCalloutDto { Id = Guid.NewGuid(), EventId = eventId, InitiatedAt = DateTime.Now, CalloutType = "SMS" });
    }

    // QA-R11: answered true without writing anything. Staff call-outs have no table (InitiateStaffCallout only echoes
    // an id), so a response cannot be recorded — refuse clearly instead of pretending.
    public Task<bool> RecordStaffResponseAsync(Guid calloutId, Guid staffId, string response, int? etaMinutes)
        => throw new InvalidOperationException("Ghi nhận phản hồi huy động nhân sự chưa có nơi lưu trên máy chủ — vui lòng liên hệ trực tiếp và ghi vào báo cáo tình hình.");

    public async Task<MCICommandCenterDto> GetCommandCenterDataAsync(Guid eventId)
    {
        var evt = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Id == eventId);
        if (evt == null) return null!;
        var stats = await GetRealTimeStatsAsync(eventId);
        var resources = await GetResourceStatusAsync(eventId);
        return new MCICommandCenterDto
        {
            EventId = eventId,
            EventName = evt.EventName,
            EventStatus = evt.Status,
            LastUpdated = DateTime.Now,
            RealTimeStats = stats,
            Resources = resources
        };
    }

    public async Task<MCIRealTimeStatsDto> GetRealTimeStatsAsync(Guid eventId)
    {
        var victims = await _context.MCIVictims.Where(x => x.MCIEventId == eventId).ToListAsync();
        return new MCIRealTimeStatsDto
        {
            EventId = eventId,
            Timestamp = DateTime.Now,
            TotalVictims = victims.Count,
            TotalArrived = victims.Count,
            InTreatment = victims.Count(v => v.Status == "Active"),
            Disposed = victims.Count(v => v.Status != "Active"),
            RedCategory = victims.Count(v => v.TriageCategory == "Red"),
            RedActive = victims.Count(v => v.TriageCategory == "Red" && v.Status == "Active"),
            YellowCategory = victims.Count(v => v.TriageCategory == "Yellow"),
            YellowActive = victims.Count(v => v.TriageCategory == "Yellow" && v.Status == "Active"),
            GreenCategory = victims.Count(v => v.TriageCategory == "Green"),
            GreenActive = victims.Count(v => v.TriageCategory == "Green" && v.Status == "Active"),
            BlackCategory = victims.Count(v => v.TriageCategory == "Black"),
            BlackTotal = victims.Count(v => v.TriageCategory == "Black"),
            Admitted = victims.Count(v => v.Status == "Admitted"),
            Discharged = victims.Count(v => v.Status == "Discharged"),
            Transferred = victims.Count(v => v.Status == "Transferred"),
            Deceased = victims.Count(v => v.Status == "Deceased")
        };
    }

    public Task<MCIBroadcastDto> SendBroadcastAsync(Guid eventId, string messageType, string priority, string title, string message, List<string> targetGroups)
    {
        return Task.FromResult(new MCIBroadcastDto { Id = Guid.NewGuid(), EventId = eventId, MessageType = messageType, Priority = priority, Title = title, Message = message, TargetGroups = targetGroups, SentAt = DateTime.Now });
    }

    public async Task<List<MCIUpdateDto>> GetEventUpdatesAsync(Guid eventId, int limit = 50)
    {
        var reports = await _context.MCISituationReports.Where(x => x.MCIEventId == eventId).OrderByDescending(x => x.ReportTime).Take(limit).ToListAsync();
        return reports.Select(r => new MCIUpdateDto { Id = r.Id, EventId = r.MCIEventId, Time = r.ReportTime, PostedAt = r.ReportTime, Category = "SitRep", Message = r.Comments ?? $"Report #{r.ReportNumber}", Priority = "Normal" }).ToList();
    }

    public async Task<MCIUpdateDto> PostUpdateAsync(Guid eventId, string category, string message, string priority)
    {
        var count = await _context.MCISituationReports.CountAsync(x => x.MCIEventId == eventId) + 1;
        var report = new MCISituationReport
        {
            Id = Guid.NewGuid(),
            MCIEventId = eventId,
            ReportNumber = count,
            ReportTime = DateTime.Now,
            ReportedById = Guid.Empty,
            Comments = message,
            CreatedAt = DateTime.Now
        };
        _context.MCISituationReports.Add(report);
        await _context.SaveChangesAsync();
        return new MCIUpdateDto { Id = report.Id, EventId = eventId, Time = report.ReportTime, PostedAt = report.ReportTime, Category = category, Message = message, Priority = priority };
    }

    public async Task<List<FamilyNotificationDto>> GetFamilyNotificationsAsync(Guid eventId)
    {
        var victims = await _context.MCIVictims.Where(x => x.MCIEventId == eventId && x.FamilyNotified).ToBoundedListAsync("MassCasualty.FamilyNotifications");
        return victims.Select(v => new FamilyNotificationDto
        {
            Id = Guid.NewGuid(),
            VictimId = v.Id,
            VictimName = v.Name,
            TriageTag = v.TagNumber,
            ContactName = v.FamilyContactName,
            ContactPhone = v.FamilyContactPhone,
            NotifiedAt = v.FamilyNotifiedAt,
            NotificationStatus = "Notified"
        }).ToList();
    }

    public async Task<FamilyNotificationDto> NotifyFamilyAsync(Guid victimId, FamilyNotificationDto dto)
    {
        var v = await _context.MCIVictims.FindAsync(victimId);
        // QA-R2: an unknown victim used to come back as "Notified" without writing anything.
        if (v == null) return null!;
        v.FamilyNotified = true;
        v.FamilyContactName = dto.ContactName;
        v.FamilyContactPhone = dto.ContactPhone;
        v.FamilyNotifiedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        dto.NotifiedAt = DateTime.Now;
        dto.NotificationStatus = "Notified";
        return dto;
    }

    public Task<List<HotlineCallDto>> GetHotlineCallsAsync(Guid eventId) => Task.FromResult(new List<HotlineCallDto>());
    // QA-R11: record echoed the call back with a random id (nothing saved — the list above stays empty) and match
    // answered true. Hotline calls have no table: refuse clearly until one exists.
    public Task<HotlineCallDto> RecordHotlineCallAsync(Guid eventId, HotlineCallDto dto)
        => throw new InvalidOperationException("Sổ cuộc gọi đường dây nóng chưa có nơi lưu trên máy chủ nên chưa ghi được.");
    public Task<bool> MatchVictimToInquiryAsync(Guid callId, Guid victimId)
        => throw new InvalidOperationException("Sổ cuộc gọi đường dây nóng chưa có nơi lưu trên máy chủ nên chưa đối chiếu nạn nhân được.");

    public async Task<MCIEventReportDto> GenerateEventReportAsync(Guid eventId)
    {
        var evt = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Id == eventId);
        if (evt == null) return null!;
        var victims = evt.Victims?.ToList() ?? new List<MCIVictim>();
        return new MCIEventReportDto
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            EventCode = evt.EventCode,
            EventName = evt.EventName,
            EventDateTime = evt.AlertReceivedAt,
            ActivatedAt = evt.ActivatedAt,
            DeactivatedAt = evt.DeactivatedAt,
            DurationHours = evt.DeactivatedAt.HasValue ? (int)(evt.DeactivatedAt.Value - evt.ActivatedAt).TotalHours : (int)(DateTime.Now - evt.ActivatedAt).TotalHours,
            TotalVictims = victims.Count,
            RedTotal = victims.Count(v => v.TriageCategory == "Red"),
            YellowTotal = victims.Count(v => v.TriageCategory == "Yellow"),
            GreenTotal = victims.Count(v => v.TriageCategory == "Green"),
            BlackTotal = victims.Count(v => v.TriageCategory == "Black"),
            Admitted = victims.Count(v => v.Status == "Admitted"),
            TreatedAndDischarged = victims.Count(v => v.Status == "Discharged"),
            Transferred = victims.Count(v => v.Status == "Transferred"),
            Deceased = victims.Count(v => v.Status == "Deceased"),
            TotalStaffInvolved = evt.StaffMobilized,
            ReportGeneratedAt = DateTime.Now,
            GeneratedAt = DateTime.Now
        };
    }

    public async Task<MCIAuthorityReportDto> GenerateAuthorityReportAsync(Guid eventId, string reportType)
    {
        var evt = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Id == eventId);
        if (evt == null) return null!;
        var victims = evt.Victims?.ToList() ?? new List<MCIVictim>();
        return new MCIAuthorityReportDto
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            ReportType = reportType,
            EventType = evt.EventType,
            EventLocation = evt.EventLocation,
            EventDateTime = evt.AlertReceivedAt,
            VictimsReceived = victims.Count,
            VictimsTreated = victims.Count(v => v.Status != "Active"),
            VictimsAdmitted = victims.Count(v => v.Status == "Admitted"),
            VictimsTransferred = victims.Count(v => v.Status == "Transferred"),
            Deceased = victims.Count(v => v.Status == "Deceased"),
            CurrentStatus = evt.Status,
            Status = "Draft",
            GeneratedAt = DateTime.Now
        };
    }

    public Task<MCIAuthorityReportDto> SubmitAuthorityReportAsync(Guid reportId)
    {
        return Task.FromResult(new MCIAuthorityReportDto { Id = reportId, Status = "Submitted", SubmittedAt = DateTime.Now });
    }

    public async Task<MCIDashboardDto> GetDashboardAsync()
    {
        try
        {
            var active = await _context.MCIEvents.Include(x => x.Victims).FirstOrDefaultAsync(x => x.Status == "Active");
            var eventsThisYear = await _context.MCIEvents.CountAsync(x => x.ActivatedAt.Year == DateTime.Now.Year);

            var dashboard = new MCIDashboardDto
            {
                HasActiveEvent = active != null,
                TotalEventsThisYear = eventsThisYear
            };

            if (active != null)
            {
                dashboard.ActiveEvent = MapToEventDto(active);
                dashboard.RealTimeStats = await GetRealTimeStatsAsync(active.Id);
                dashboard.Resources = await GetResourceStatusAsync(active.Id);

                var victims = active.Victims?.ToList() ?? new List<MCIVictim>();
                dashboard.VictimBoard = victims.OrderByDescending(v => v.ArrivalTime).Take(20).Select(v => new MCIVictimSummaryDto
                {
                    Id = v.Id,
                    TriageTag = v.TagNumber,
                    Name = v.Name ?? "Unknown",
                    TriageCategory = v.TriageCategory,
                    CurrentLocation = v.CurrentLocation,
                    Status = v.Status,
                    ArrivedAt = v.ArrivalTime,
                    MinutesSinceArrival = (int)(DateTime.Now - v.ArrivalTime).TotalMinutes
                }).ToList();

                dashboard.RecentArrivals = victims.OrderByDescending(v => v.ArrivalTime).Take(5).Select(v => new MCIVictimSummaryDto
                {
                    Id = v.Id,
                    TriageTag = v.TagNumber,
                    Name = v.Name ?? "Unknown",
                    TriageCategory = v.TriageCategory,
                    CurrentLocation = v.CurrentLocation,
                    Status = v.Status,
                    ArrivedAt = v.ArrivalTime,
                    MinutesSinceArrival = (int)(DateTime.Now - v.ArrivalTime).TotalMinutes
                }).ToList();
            }

            return dashboard;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new MCIDashboardDto { HasActiveEvent = false, TotalEventsThisYear = 0 };
        }
    }

    private MCIEventDto MapToEventDto(MCIEvent e)
    {
        var victims = e.Victims?.ToList() ?? new List<MCIVictim>();
        return new MCIEventDto
        {
            Id = e.Id,
            EventCode = e.EventCode,
            EventName = e.EventName,
            EventType = e.EventType,
            Location = e.EventLocation,
            AlertLevel = e.AlertLevel,
            EstimatedCasualties = e.EstimatedVictims,
            Status = e.Status,
            NotifiedAt = e.AlertReceivedAt,
            ActivatedAt = e.ActivatedAt,
            DeactivatedAt = e.DeactivatedAt,
            TotalVictims = victims.Count,
            RedCategory = victims.Count(v => v.TriageCategory == "Red"),
            YellowCategory = victims.Count(v => v.TriageCategory == "Yellow"),
            GreenCategory = victims.Count(v => v.TriageCategory == "Green"),
            BlackCategory = victims.Count(v => v.TriageCategory == "Black"),
            Admitted = victims.Count(v => v.Status == "Admitted"),
            Discharged = victims.Count(v => v.Status == "Discharged"),
            Transferred = victims.Count(v => v.Status == "Transferred"),
            Deceased = victims.Count(v => v.Status == "Deceased"),
            StaffActivated = e.StaffMobilized,
            BedsAllocated = e.BedsActivated
        };
    }

    private MCIVictimDto MapToVictimDto(MCIVictim e)
    {
        return new MCIVictimDto
        {
            Id = e.Id,
            EventId = e.MCIEventId,
            TriageTag = e.TagNumber,
            Name = e.Name,
            EstimatedAge = e.EstimatedAge,
            Gender = e.Gender,
            Description = e.IdentifyingFeatures,
            TriageCategory = e.TriageCategory,
            TriageTime = e.TriageTime ?? DateTime.Now,
            IdentificationStatus = e.PatientId.HasValue ? "Identified" : "Unidentified",
            RespiratoryRate = e.RespiratoryRate,
            CanWalk = e.CanWalk,
            ChiefComplaint = e.InjuryDescription,
            CurrentLocation = e.CurrentLocation,
            Status = e.Status,
            ArrivedAt = e.ArrivalTime,
            FamilyNotified = e.FamilyNotified,
            FamilyContactName = e.FamilyContactName,
            FamilyContactPhone = e.FamilyContactPhone,
            TreatmentNotes = e.InitialTreatment
        };
    }
}
