using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;

namespace HIS.Infrastructure.Services.Surgery;

/// <summary>
/// K12 Step 3 (2026-05-30, Plan B): Implementation ISurgeryOperationService.
/// Logic copy 1-1 từ SurgeryCompleteService cũ region 6.3 + 6.3.1 + 6.4 + 6.4.1 + 6.4.2
/// (45 method, ~1349 dong). Inject ISurgerySchedulingService để dùng GetSurgeryByIdAsync.
/// </summary>
public partial class SurgeryOperationServiceImpl : ISurgeryOperationService
{
    private readonly HISDbContext _context;
    private readonly ISurgerySchedulingService _scheduling;

    public SurgeryOperationServiceImpl(HISDbContext context, ISurgerySchedulingService scheduling)
    {
        _context = context;
        _scheduling = scheduling;
    }

    /// <summary>
    /// Load full surgery context from DB for print templates
    /// </summary>
    private async Task<(SurgeryRequest? req, SurgerySchedule? sched, SurgeryRecord? rec, Patient? pat, User? surgeon, User? anesthesiologist, OperatingRoom? room)> LoadSurgeryPrintDataAsync(Guid surgeryId)
    {
        try
        {
            var req = await _context.Set<SurgeryRequest>()
                .Include(r => r.Patient)
                .Include(r => r.RequestingDoctor)
                .Include(r => r.Schedules)
                .FirstOrDefaultAsync(r => r.Id == surgeryId);

            if (req == null) return (null, null, null, null, null, null, null);

            var sched = await _context.Set<SurgerySchedule>()
                .Include(s => s.OperatingRoom)
                .Include(s => s.Surgeon)
                .Include(s => s.Anesthesiologist)
                .Include(s => s.SurgeryRecord)
                .FirstOrDefaultAsync(s => s.SurgeryRequestId == surgeryId);

            var rec = sched?.SurgeryRecord;
            var pat = req.Patient;
            var surgeon = sched?.Surgeon ?? req.RequestingDoctor;
            var anesthesiologist = sched?.Anesthesiologist;
            var room = sched?.OperatingRoom;

            return (req, sched, rec, pat, surgeon, anesthesiologist, room);
        }
        catch
        {
            return (null, null, null, null, null, null, null);
        }
    }


    // Lấy nội dung dòng có sentinel tag (vd "[TUONGTRINH]") trong Notes pack kiểu cũ. Null nếu không có.
    private static string? ExtractNoteTag(string? notes, string tag)
    {
        if (string.IsNullOrWhiteSpace(notes)) return null;
        foreach (var raw in notes.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.TrimStart();
            if (line.StartsWith(tag, StringComparison.Ordinal))
                return line.Substring(tag.Length).Trim();
        }
        return null;
    }

    private static string GetAnesthesiaTypeName(int anesthesiaType) => anesthesiaType switch
    {
        1 => "Gây tê",
        2 => "Gây mê toàn thân",
        3 => "Gây mê nội khí quản",
        4 => "Gây tê tủy sống",
        5 => "Gây tê ngoài màng cứng",
        _ => "Không xác định"
    };
}
