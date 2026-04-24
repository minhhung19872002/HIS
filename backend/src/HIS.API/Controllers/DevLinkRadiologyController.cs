using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// DEV helper: link today's RadiologyRequests with real Orthanc StudyInstanceUIDs
/// so the worklist page shows "has images" + DicomViewer can load real DICOM data.
/// Needed because PopulateData seeds requests but doesn't attach DICOM metadata.
/// </summary>
[ApiController]
[Route("api/dev/link-radiology")]
[AllowAnonymous]
public class DevLinkRadiologyController : ControllerBase
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;

    public DevLinkRadiologyController(HISDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public record LinkResult(int RequestsUpdated, int ExamsCreated, int StudiesCreated, List<string> OrthancUIDs);

    [HttpPost("today")]
    public async Task<ActionResult<LinkResult>> LinkToday()
    {
        // 1. Pull live Orthanc study UIDs
        var pacsBase = (_config["PACS:BaseUrl"] ?? "http://localhost:8042").TrimEnd('/');
        var pacsUser = _config["PACS:Username"] ?? "admin";
        var pacsPass = _config["PACS:Password"] ?? "orthanc";

        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        var authBytes = System.Text.Encoding.ASCII.GetBytes($"{pacsUser}:{pacsPass}");
        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

        List<System.Text.Json.JsonElement>? studies;
        try
        {
            var studiesJson = await http.GetStringAsync($"{pacsBase}/studies?expand=true");
            studies = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(studiesJson);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Không kết nối được Orthanc: {ex.Message}" });
        }

        if (studies == null || studies.Count == 0)
            return BadRequest(new { message = "Orthanc chưa có study nào. Push DICOM trước." });

        var uids = new List<string>();
        var studyMeta = new List<(string uid, string? orthancId, int series, int instances)>();
        foreach (var s in studies)
        {
            string? uid = null;
            string? orthancId = null;
            int series = 0, instances = 0;

            if (s.TryGetProperty("MainDicomTags", out var tags) &&
                tags.TryGetProperty("StudyInstanceUID", out var u))
            {
                uid = u.GetString();
            }
            if (s.TryGetProperty("ID", out var i)) orthancId = i.GetString();
            if (s.TryGetProperty("Series", out var ser)) series = ser.GetArrayLength();
            if (s.TryGetProperty("Series", out var seriesArr))
            {
                foreach (var sr in seriesArr.EnumerateArray())
                {
                    // Count instances by fetching series
                    try
                    {
                        var srId = sr.GetString();
                        if (!string.IsNullOrEmpty(srId))
                        {
                            var srJson = await http.GetStringAsync($"{pacsBase}/series/{srId}");
                            var srDoc = System.Text.Json.JsonDocument.Parse(srJson);
                            if (srDoc.RootElement.TryGetProperty("Instances", out var inst))
                                instances += inst.GetArrayLength();
                        }
                    }
                    catch { /* ignore per-series */ }
                }
            }

            if (!string.IsNullOrEmpty(uid))
            {
                uids.Add(uid);
                studyMeta.Add((uid, orthancId, series, Math.Max(instances, 1)));
            }
        }

        if (uids.Count == 0)
            return BadRequest(new { message = "Không parse được StudyInstanceUID từ Orthanc" });

        // 2. Today's RadiologyRequests without DicomStudy yet
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);
        var todayRequests = await _db.RadiologyRequests
            .Where(r => r.CreatedAt >= today && r.CreatedAt < tomorrow)
            .OrderBy(r => r.CreatedAt)
            .Take(10)
            .ToListAsync();

        int requestsUpdated = 0, examsCreated = 0, studiesCreated = 0;

        for (int idx = 0; idx < todayRequests.Count; idx++)
        {
            var req = todayRequests[idx];
            var (uid, orthancId, seriesCount, instanceCount) = studyMeta[idx % studyMeta.Count];

            // Ensure RadiologyExam exists
            var exam = await _db.RadiologyExams.FirstOrDefaultAsync(e => e.RadiologyRequestId == req.Id);
            if (exam == null)
            {
                exam = new RadiologyExam
                {
                    Id = Guid.NewGuid(),
                    RadiologyRequestId = req.Id,
                    ExamCode = $"EX{DateTime.Now:yyMMdd}{idx:D4}",
                    ExamName = "Linked from Orthanc",
                    ExamDate = DateTime.Now,
                    ModalityId = Guid.NewGuid(),
                    Status = 2, // Completed
                    AccessionNumber = req.RequestCode,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.RadiologyExams.Add(exam);
                examsCreated++;
            }

            // Ensure DicomStudy exists (one per exam, with real UID)
            var existing = await _db.DicomStudies.FirstOrDefaultAsync(d => d.RadiologyExamId == exam.Id);
            if (existing == null)
            {
                _db.DicomStudies.Add(new DicomStudy
                {
                    Id = Guid.NewGuid(),
                    RadiologyExamId = exam.Id,
                    StudyInstanceUID = uid,
                    StudyDate = DateTime.Today,
                    StudyTime = DateTime.Now,
                    StudyDescription = "Linked from Orthanc (dev)",
                    NumberOfSeries = seriesCount > 0 ? seriesCount : 1,
                    NumberOfImages = instanceCount,
                    StorageLocation = orthancId,
                    CreatedAt = DateTime.UtcNow,
                });
                studiesCreated++;
            }
            else if (existing.StudyInstanceUID != uid)
            {
                existing.StudyInstanceUID = uid;
                existing.StorageLocation = orthancId;
                existing.NumberOfSeries = seriesCount > 0 ? seriesCount : 1;
                existing.NumberOfImages = instanceCount;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            // Mark request as Completed so hasImages propagates
            if (req.Status < 3)
            {
                req.Status = 3; // Completed
                req.UpdatedAt = DateTime.UtcNow;
                requestsUpdated++;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new LinkResult(requestsUpdated, examsCreated, studiesCreated, uids));
    }
}
