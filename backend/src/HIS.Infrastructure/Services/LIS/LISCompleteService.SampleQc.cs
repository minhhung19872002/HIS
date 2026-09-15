using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

// Wave-2 (2026-09-15): real data behind the v2 sample-storage / sample-tracking / lab-qc screens.
// Before this, LISCompleteController.SubModules.cs returned hard-coded fake rows (random Guids, "Bệnh nhân 001")
// and RunQC/Levey-Jennings/QC-report queried QCLots/QCResults tables that never existed (silently empty).
//
// Sources of truth:
//   • sample storage / tracking → ServiceRequestDetails (SampleBarcode, SampleLocation, ReceiveStatus, RejectReason…)
//   • IQC results               → LabQCResults (EF entity, table exists)
//   • IQC lots                  → LabQCLots (raw SQL; migration proposed). Until it exists, lots are DERIVED read-only
//                                 from LabQCResults.QCLotNumber and lot writes throw NotSupportedException.
public partial class LISCompleteService
{
    private const int SqlInvalidObjectName = 208;

    // ───────────────────────────── Sample storage ─────────────────────────────

    public async Task<List<Guid>> GetDetailIdsByBarcodeAsync(string barcode, Guid? serviceRequestId = null)
    {
        if (string.IsNullOrWhiteSpace(barcode)) return new List<Guid>();
        var bc = barcode.Trim();
        var q = _context.ServiceRequestDetails.Where(d => d.SampleBarcode == bc && !d.IsDeleted);
        if (serviceRequestId.HasValue) q = q.Where(d => d.ServiceRequestId == serviceRequestId.Value);
        return await q.Select(d => d.Id).ToListAsync();
    }

    public async Task<List<Guid>> GetTubeDetailIdsAsync(Guid detailId)
    {
        var barcode = await _context.ServiceRequestDetails.Where(d => d.Id == detailId && !d.IsDeleted)
            .Select(d => new { d.SampleBarcode }).FirstOrDefaultAsync();
        if (barcode == null) return new List<Guid>();
        if (string.IsNullOrEmpty(barcode.SampleBarcode)) return new List<Guid> { detailId };
        return await GetDetailIdsByBarcodeAsync(barcode.SampleBarcode);
    }

    private sealed record SampleRow(Guid Id, string? SampleBarcode, string? SampleLocation, DateTime? UpdatedAt,
        string? UpdatedBy, string RequestCode, string PatientName, string PatientCode, string ServiceName,
        Guid ServiceRequestId);

    private IQueryable<SampleRow> SampleRows(IQueryable<ServiceRequestDetail> q) => q.Select(d => new SampleRow(
        d.Id, d.SampleBarcode, d.SampleLocation, d.UpdatedAt, d.UpdatedBy,
        d.ServiceRequest.RequestCode, d.ServiceRequest.MedicalRecord.Patient.FullName,
        d.ServiceRequest.MedicalRecord.Patient.PatientCode, d.Service.ServiceName, d.ServiceRequestId));

    private async Task<Dictionary<string, string>> UserNamesAsync(IEnumerable<string?> ids)
    {
        var guids = ids.Where(s => Guid.TryParse(s, out _)).Select(s => Guid.Parse(s!)).Distinct().ToList();
        if (guids.Count == 0) return new Dictionary<string, string>();
        var users = await _context.Users.Where(u => guids.Contains(u.Id)).Select(u => new { u.Id, u.FullName }).ToListAsync();
        return users.ToDictionary(u => u.Id.ToString(), u => u.FullName, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<Dictionary<Guid, string>> UserNamesAsync(IEnumerable<Guid?> ids)
    {
        var guids = ids.Where(g => g.HasValue).Select(g => g!.Value).Distinct().ToList();
        if (guids.Count == 0) return new Dictionary<Guid, string>();
        return await _context.Users.Where(u => guids.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);
    }

    /// <summary>
    /// UpdatedAt / ReceivedAt / CreatedAt are stored UTC (HISDbContext, SampleReceiveService) while
    /// SampleCollectedAt / ReviewedAt are local VN — the FE reads naive timestamps as local, so the
    /// UTC ones showed "Lưu lúc"/"TC lúc"/received 7 h early and sorted wrongly in the timeline.
    /// VN has no DST → fixed +7.
    /// </summary>
    private static DateTime? UtcToVn(DateTime? utc) => utc?.AddHours(7);

    private static object ToStorageRecord(IGrouping<string, SampleRow> g, Dictionary<string, string> names)
    {
        var first = g.OrderByDescending(r => r.UpdatedAt).First();
        var parts = (first.SampleLocation ?? "").Split('/', StringSplitOptions.TrimEntries);
        string? Part(int i) => parts.Length > i && parts[i].Length > 0 ? parts[i] : null;
        return new
        {
            id = first.Id,
            sampleBarcode = first.SampleBarcode ?? "",
            labRequestId = first.ServiceRequestId,
            requestCode = first.RequestCode,
            patientName = first.PatientName,
            patientCode = first.PatientCode,
            // One tube can carry several tests ("thêm XN cùng mẫu")
            sampleType = string.Join(", ", g.Select(r => r.ServiceName).Distinct()),
            tubeColor = "",               // not recorded anywhere yet
            storageLocation = first.SampleLocation ?? "",
            freezer = Part(0), rack = Part(1), box = Part(2), position = Part(3),
            temperature = (decimal?)null, // not recorded (proposed column)
            storageCondition = "",        // not recorded (proposed column)
            storedAt = UtcToVn(first.UpdatedAt),
            storedBy = first.UpdatedBy != null && names.TryGetValue(first.UpdatedBy, out var n) ? n : first.UpdatedBy ?? "",
            expiryDate = (DateTime?)null,
            isExpired = false,
            status = 0, // stored — retrieval/disposal history is not persisted (SampleLocation is cleared)
        };
    }

    public async Task<List<object>> GetStoredSamplesAsync(string? keyword)
    {
        var q = _context.ServiceRequestDetails.Where(d => !d.IsDeleted && d.SampleLocation != null && d.SampleLocation != "");
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(d => (d.SampleBarcode != null && d.SampleBarcode.Contains(kw))
                || d.SampleLocation!.Contains(kw)
                || d.ServiceRequest.RequestCode.Contains(kw)
                || d.ServiceRequest.MedicalRecord.Patient.FullName.Contains(kw)
                || d.ServiceRequest.MedicalRecord.Patient.PatientCode.Contains(kw));
        }
        var rows = await SampleRows(q.OrderByDescending(d => d.UpdatedAt).Take(1000)).ToListAsync();
        var names = await UserNamesAsync(rows.Select(r => r.UpdatedBy));
        return rows.GroupBy(r => r.SampleBarcode ?? r.Id.ToString())
            .Select(g => ToStorageRecord(g, names)).ToList();
    }

    public async Task<object?> GetSampleByBarcodeAsync(string barcode)
    {
        var bc = (barcode ?? "").Trim();
        if (bc.Length == 0) return null;
        var rows = await SampleRows(_context.ServiceRequestDetails.Where(d => !d.IsDeleted && d.SampleBarcode == bc)).ToListAsync();
        if (rows.Count == 0) return null;
        var names = await UserNamesAsync(rows.Select(r => r.UpdatedBy));
        return rows.GroupBy(r => r.SampleBarcode!).Select(g => ToStorageRecord(g, names)).First();
    }

    public async Task<List<object>> GetStorageLocationsAsync()
    {
        var locations = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.SampleLocation != null && d.SampleLocation != "")
            .Select(d => new { d.SampleLocation, Key = d.SampleBarcode ?? d.Id.ToString() })
            .Distinct().ToListAsync();
        return locations
            .Select(l => l.SampleLocation!.Split('/', StringSplitOptions.TrimEntries))
            .GroupBy(p => new { freezer = p.ElementAtOrDefault(0) ?? "", rack = p.ElementAtOrDefault(1) ?? "", box = p.ElementAtOrDefault(2) ?? "" })
            .OrderBy(g => g.Key.freezer).ThenBy(g => g.Key.rack).ThenBy(g => g.Key.box)
            .Select(g => (object)new
            {
                g.Key.freezer, g.Key.rack, g.Key.box,
                totalPositions = 0, // capacity is not configured anywhere (proposed LabStorageLocations)
                usedPositions = g.Count(),
                availablePositions = 0,
            }).ToList();
    }

    // ───────────────────────────── Sample tracking ─────────────────────────────

    /// <summary>RejectReason is stored as "CODE - label[: notes]" by the v2 reject form; legacy rows are free text.</summary>
    private static (string code, string reason) SplitRejectReason(string? raw)
    {
        var s = raw ?? "";
        var i = s.IndexOf(" - ", StringComparison.Ordinal);
        if (i > 0 && i <= 12 && s[..i].All(c => char.IsLetterOrDigit(c) || c == '_')) return (s[..i], s[(i + 3)..]);
        return ("", s);
    }

    public async Task<List<object>> GetSampleRejectionsAsync(DateTime? fromDate, DateTime? toDate, string? keyword)
    {
        // Rejection time is a UTC column → compare against the UTC window of the VN local days
        var from = HIS.Core.Common.VnTime.DayRangeUtc(fromDate ?? HIS.Core.Common.VnTime.TodayVn.AddDays(-30)).FromUtc;
        var to = HIS.Core.Common.VnTime.DayRangeUtc(toDate ?? HIS.Core.Common.VnTime.TodayVn).ToUtc;
        var q = _context.ServiceRequestDetails.Where(d => !d.IsDeleted && d.ReceiveStatus == 2
            && (d.ReceivedAt ?? d.UpdatedAt ?? d.CreatedAt) >= from && (d.ReceivedAt ?? d.UpdatedAt ?? d.CreatedAt) < to);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(d => (d.SampleBarcode != null && d.SampleBarcode.Contains(kw))
                || d.ServiceRequest.RequestCode.Contains(kw)
                || d.ServiceRequest.MedicalRecord.Patient.FullName.Contains(kw)
                || d.ServiceRequest.MedicalRecord.Patient.PatientCode.Contains(kw));
        }
        var rows = await q.OrderByDescending(d => d.ReceivedAt ?? d.UpdatedAt).Take(500).Select(d => new
        {
            d.Id, d.SampleBarcode, d.ServiceRequestId, d.ServiceRequest.RequestCode,
            PatientName = d.ServiceRequest.MedicalRecord.Patient.FullName,
            PatientCode = d.ServiceRequest.MedicalRecord.Patient.PatientCode,
            d.RejectReason, RejectedAt = d.ReceivedAt ?? d.UpdatedAt ?? d.CreatedAt, d.ReceivedByUserId, d.UpdatedBy,
        }).ToListAsync();
        var byId = await UserNamesAsync(rows.Select(r => r.ReceivedByUserId));
        var byStr = await UserNamesAsync(rows.Select(r => r.UpdatedBy));
        return rows.Select(r =>
        {
            var (code, reason) = SplitRejectReason(r.RejectReason);
            var by = r.ReceivedByUserId.HasValue && byId.TryGetValue(r.ReceivedByUserId.Value, out var n1) ? n1
                   : r.UpdatedBy != null && byStr.TryGetValue(r.UpdatedBy, out var n2) ? n2 : "";
            return (object)new
            {
                id = r.Id, sampleBarcode = r.SampleBarcode ?? "", labRequestId = r.ServiceRequestId, requestCode = r.RequestCode,
                patientName = r.PatientName, patientCode = r.PatientCode,
                rejectionReason = reason, rejectionCode = code, rejectedAt = UtcToVn(r.RejectedAt), rejectedBy = by,
                // An undone/recollected rejection leaves ReceiveStatus 2 → it disappears from this list (no history table)
                isUndone = false, reCollected = false,
            };
        }).ToList();
    }

    public async Task<object> GetSampleTrackingSummaryAsync(DateTime? fromDate, DateTime? toDate)
    {
        var from = fromDate ?? DateTime.Today.AddDays(-30);
        var to = (toDate ?? DateTime.Today).Date.AddDays(1);
        var rows = await _context.ServiceRequestDetails
            .Where(d => !d.IsDeleted && d.IsSampleCollected && d.ServiceRequest.RequestType == 1
                && d.SampleCollectedAt >= from && d.SampleCollectedAt < to)
            .Select(d => new { d.ReceiveStatus, d.Status, d.SampleCollectedAt, d.ResultDate, d.RejectReason })
            .ToListAsync();
        var total = rows.Count;
        var rejected = rows.Count(r => r.ReceiveStatus == 2);
        var tats = rows.Where(r => r.ResultDate.HasValue && r.SampleCollectedAt.HasValue && r.ResultDate > r.SampleCollectedAt)
            .Select(r => (r.ResultDate!.Value - r.SampleCollectedAt!.Value).TotalMinutes).ToList();
        return new
        {
            totalSamples = total,
            collected = total,
            received = rows.Count(r => r.ReceiveStatus == 1),
            rejected,
            processing = rows.Count(r => r.ReceiveStatus == 1 && r.Status == 1),
            completed = rows.Count(r => r.Status == 2),
            rejectionRate = total > 0 ? Math.Round((double)rejected / total, 4) : 0, // fraction — FE multiplies by 100
            averageTurnaroundMinutes = tats.Count > 0 ? (int)Math.Round(tats.Average()) : 0,
            topRejectionReasons = rows.Where(r => r.ReceiveStatus == 2)
                .GroupBy(r => SplitRejectReason(r.RejectReason).reason)
                .OrderByDescending(g => g.Count()).Take(5)
                .Select(g => new { reason = g.Key, count = g.Count() }).ToList(),
        };
    }

    public async Task<List<object>> GetSampleTimelineAsync(string barcode)
    {
        var bc = (barcode ?? "").Trim();
        var rows = await _context.ServiceRequestDetails.Where(d => !d.IsDeleted && d.SampleBarcode == bc)
            .Select(d => new
            {
                d.Id, d.SampleBarcode, d.ServiceRequestId, d.ServiceRequest.RequestCode,
                PatientName = d.ServiceRequest.MedicalRecord.Patient.FullName, ServiceName = d.Service.ServiceName,
                d.SampleCollectedAt, d.CollectedByUserId, d.ReceivedAt, d.ReceivedByUserId, d.ReceiveStatus, d.RejectReason,
                d.TechnicianRunAt, d.TechnicianUserId, d.ResultDate, d.ReviewedAt, d.ReviewerUserId, d.SampleLocation, d.UpdatedAt,
            }).ToListAsync();
        if (rows.Count == 0) throw new KeyNotFoundException($"Không tìm thấy mẫu với barcode {bc}");
        var names = await UserNamesAsync(rows.SelectMany(r => new[] { r.CollectedByUserId, r.ReceivedByUserId, r.TechnicianUserId, r.ReviewerUserId }));
        string Name(Guid? id) => id.HasValue && names.TryGetValue(id.Value, out var n) ? n : "";
        var events = new List<(DateTime at, object ev)>();
        void Add(Guid srdId, string type, DateTime? at, Guid? user, string? reason = null, string? location = null, string? notes = null)
        {
            if (!at.HasValue) return;
            var r = rows.First(x => x.Id == srdId);
            events.Add((at.Value, new
            {
                id = $"{srdId}-{type}", sampleBarcode = r.SampleBarcode, labRequestId = r.ServiceRequestId, requestCode = r.RequestCode,
                patientName = r.PatientName, eventType = type, eventDate = at.Value, userId = user?.ToString() ?? "", userName = Name(user),
                location, reason, notes,
            }));
        }
        // Tube-level events once (shared by every test on the tube); test-level events per SRD
        var tube = rows.OrderBy(r => r.SampleCollectedAt).First();
        Add(tube.Id, "collected", tube.SampleCollectedAt, tube.CollectedByUserId);
        if (tube.ReceiveStatus == 2) Add(tube.Id, "rejected", UtcToVn(tube.ReceivedAt ?? tube.UpdatedAt), tube.ReceivedByUserId, SplitRejectReason(tube.RejectReason).reason);
        else Add(tube.Id, "received", UtcToVn(tube.ReceivedAt), tube.ReceivedByUserId);
        foreach (var r in rows)
        {
            Add(r.Id, "processing", r.TechnicianRunAt, r.TechnicianUserId, notes: r.ServiceName);
            Add(r.Id, "completed", r.ReviewedAt ?? r.ResultDate, r.ReviewerUserId, notes: r.ServiceName);
        }
        if (!string.IsNullOrEmpty(tube.SampleLocation)) Add(tube.Id, "stored", UtcToVn(tube.UpdatedAt), null, location: tube.SampleLocation);
        return events.OrderBy(e => e.at).Select(e => e.ev).ToList();
    }

    // ───────────────────────────── IQC lots / results ─────────────────────────────

    private static int ParseQcLevel(string? level)
        => int.TryParse(new string((level ?? "").Where(char.IsDigit).ToArray()), out var n) ? n : 0;

    private async Task<DbConnection> OpenEfConnectionAsync()
    {
        // Do NOT dispose — the connection belongs to the DbContext.
        var c = _context.Database.GetDbConnection();
        if (c.State != System.Data.ConnectionState.Open) await c.OpenAsync();
        return c;
    }

    private sealed record QcLotRow(Guid Id, string LotNumber, string TestCode, string? TestName, int Level, string? Manufacturer,
        decimal TargetMean, decimal TargetSD, string? Unit, DateTime? ExpiryDate, bool IsActive, DateTime CreatedAt);

    /// <summary>Lots from LabQCLots, or null when the table has not been migrated yet.</summary>
    private async Task<List<QcLotRow>?> TryLoadLotTableAsync(string? lotNumber = null, string? testCode = null, int? level = null, Guid? id = null)
    {
        try
        {
            var conn = await OpenEfConnectionAsync();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"SELECT Id, LotNumber, TestCode, TestName, QCLevel, Manufacturer, TargetMean, TargetSD, Unit, ExpiryDate, IsActive, CreatedAt
                FROM LabQCLots WHERE IsDeleted = 0
                  AND (@id IS NULL OR Id = @id) AND (@lot IS NULL OR LotNumber = @lot)
                  AND (@test IS NULL OR TestCode = @test) AND (@lvl IS NULL OR QCLevel = @lvl)
                ORDER BY CreatedAt DESC";
            cmd.Parameters.Add(new SqlParameter("@id", (object?)id ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@lot", (object?)lotNumber ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@test", (object?)testCode ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@lvl", (object?)level ?? DBNull.Value));
            var list = new List<QcLotRow>();
            using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
                list.Add(new QcLotRow(r.GetGuid(0), r.GetString(1), r.GetString(2), r.IsDBNull(3) ? null : r.GetString(3), r.GetInt32(4),
                    r.IsDBNull(5) ? null : r.GetString(5), r.GetDecimal(6), r.GetDecimal(7), r.IsDBNull(8) ? null : r.GetString(8),
                    r.IsDBNull(9) ? null : r.GetDateTime(9), r.GetBoolean(10), r.GetDateTime(11)));
            return list;
        }
        catch (SqlException ex) when (ex.Number == SqlInvalidObjectName)
        {
            return null;
        }
    }

    private static object ToLotDto(QcLotRow l) => new
    {
        id = l.Id, lotNumber = l.LotNumber, testCode = l.TestCode, testName = l.TestName ?? l.TestCode, level = l.Level,
        manufacturer = l.Manufacturer ?? "", expiryDate = l.ExpiryDate, targetMean = l.TargetMean, targetSD = l.TargetSD,
        unit = l.Unit ?? "", isActive = l.IsActive, createdAt = l.CreatedAt, isDerived = false,
    };

    public async Task<List<object>> GetQCLotsAsync(string? testCode, bool? isActive)
    {
        var table = await TryLoadLotTableAsync();
        if (table != null)
            return table.Where(l => (string.IsNullOrWhiteSpace(testCode) || l.TestCode.Contains(testCode.Trim(), StringComparison.OrdinalIgnoreCase))
                                 && (!isActive.HasValue || l.IsActive == isActive.Value))
                .Select(ToLotDto).ToList();

        // Not migrated: derive read-only lots from recorded IQC runs (latest Mean/SD per lot+test+level)
        var runs = await _context.LabQCResults.Where(q => !q.IsDeleted && q.QCLotNumber != null && q.QCLotNumber != "")
            .Select(q => new { q.QCLotNumber, q.ServiceId, q.TestCode, q.QCLevel, q.Mean, q.SD, q.RunTime,
                ServiceName = _context.Services.Where(s => s.Id == q.ServiceId).Select(s => s.ServiceName).FirstOrDefault() })
            .ToListAsync();
        return runs.GroupBy(q => new { q.QCLotNumber, q.ServiceId, q.QCLevel })
            .Select(g =>
            {
                var last = g.OrderByDescending(x => x.RunTime).First();
                var key = $"{g.Key.QCLotNumber}|{g.Key.ServiceId}|{g.Key.QCLevel}";
                return new
                {
                    id = new Guid(System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(key))),
                    lotNumber = g.Key.QCLotNumber!, testCode = last.TestCode, testName = last.ServiceName ?? last.TestCode,
                    level = ParseQcLevel(g.Key.QCLevel), manufacturer = "", expiryDate = (DateTime?)null,
                    targetMean = last.Mean, targetSD = last.SD, unit = "", isActive = true,
                    createdAt = g.Min(x => x.RunTime), isDerived = true,
                    lastRun = last.RunTime,
                };
            })
            .Where(l => string.IsNullOrWhiteSpace(testCode) || (l.testCode ?? "").Contains(testCode.Trim(), StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(l => l.lastRun)
            .Select(l => (object)l).ToList();
    }

    private const string LotTableMissing =
        "Chưa có bảng lô QC (LabQCLots) — cần chạy migration trước khi thêm/sửa/xoá lô. Danh sách lô hiện được suy ra từ kết quả QC đã chạy.";

    public async Task<object> SaveQCLotAsync(Guid? id, SaveQCLotDto dto, Guid? userId)
    {
        if (string.IsNullOrWhiteSpace(dto.LotNumber)) throw new ArgumentException("Chưa nhập số lô", nameof(dto.LotNumber));
        if (string.IsNullOrWhiteSpace(dto.TestCode)) throw new ArgumentException("Chưa nhập mã xét nghiệm", nameof(dto.TestCode));
        if (dto.Level is < 1 or > 3) throw new ArgumentException("Mức QC phải là 1, 2 hoặc 3", nameof(dto.Level));
        if (dto.TargetSD <= 0) throw new ArgumentException("Target SD phải > 0", nameof(dto.TargetSD));

        if (await TryLoadLotTableAsync(id: Guid.Empty) == null) throw new NotSupportedException(LotTableMissing);
        var lot = dto.LotNumber.Trim(); var test = dto.TestCode.Trim();
        var dup = await TryLoadLotTableAsync(lotNumber: lot, testCode: test, level: dto.Level);
        if (dup!.Any(l => l.Id != id)) throw new InvalidOperationException($"Lô {lot} / {test} / mức {dto.Level} đã tồn tại.");

        var newId = id ?? Guid.NewGuid();
        var sql = id.HasValue
            ? @"UPDATE LabQCLots SET TestCode=@test, TestName=@name, QCLevel=@lvl, Manufacturer=@mfg, TargetMean=@mean, TargetSD=@sd,
                   Unit=@unit, ExpiryDate=@exp, IsActive=@active, UpdatedAt=GETDATE(), UpdatedBy=@user WHERE Id=@id AND IsDeleted=0"
            : @"INSERT INTO LabQCLots (Id, LotNumber, TestCode, TestName, QCLevel, Manufacturer, TargetMean, TargetSD, Unit, ExpiryDate, IsActive, CreatedAt, CreatedBy, IsDeleted)
                VALUES (@id, @lot, @test, @name, @lvl, @mfg, @mean, @sd, @unit, @exp, @active, GETDATE(), @user, 0)";
        var rows = await _context.Database.ExecuteSqlRawAsync(sql,
            new SqlParameter("@id", newId), new SqlParameter("@lot", lot), new SqlParameter("@test", test),
            new SqlParameter("@name", (object?)dto.TestName ?? DBNull.Value), new SqlParameter("@lvl", dto.Level),
            new SqlParameter("@mfg", (object?)dto.Manufacturer ?? DBNull.Value), new SqlParameter("@mean", dto.TargetMean),
            new SqlParameter("@sd", dto.TargetSD), new SqlParameter("@unit", (object?)dto.Unit ?? DBNull.Value),
            new SqlParameter("@exp", (object?)dto.ExpiryDate ?? DBNull.Value), new SqlParameter("@active", dto.IsActive),
            new SqlParameter("@user", (object?)userId?.ToString() ?? DBNull.Value));
        if (rows == 0) throw new KeyNotFoundException("Không tìm thấy lô QC");
        return ToLotDto((await TryLoadLotTableAsync(id: newId))!.First());
    }

    public async Task<bool> DeleteQCLotAsync(Guid id)
    {
        if (await TryLoadLotTableAsync(id: Guid.Empty) == null) throw new NotSupportedException(LotTableMissing);
        var rows = await _context.Database.ExecuteSqlRawAsync(
            "UPDATE LabQCLots SET IsDeleted=1, UpdatedAt=GETDATE() WHERE Id=@id AND IsDeleted=0", new SqlParameter("@id", id));
        return rows > 0;
    }

    public async Task<List<object>> GetQCResultsAsync(string? testCode, string? lotNumber, DateTime? fromDate, DateTime? toDate)
    {
        var from = fromDate ?? DateTime.Today.AddDays(-30);
        var to = (toDate ?? DateTime.Today).Date.AddDays(1);
        var q = _context.LabQCResults.Where(r => !r.IsDeleted && r.RunTime >= from && r.RunTime < to);
        if (!string.IsNullOrWhiteSpace(testCode)) { var t = testCode.Trim(); q = q.Where(r => r.TestCode.Contains(t) || _context.Services.Any(s => s.Id == r.ServiceId && s.ServiceName.Contains(t))); }
        if (!string.IsNullOrWhiteSpace(lotNumber)) { var l = lotNumber.Trim(); q = q.Where(r => r.QCLotNumber == l); }
        var rows = await q.OrderByDescending(r => r.RunTime).Take(1000).Select(r => new
        {
            r.Id, r.QCLotNumber, r.TestCode, TestName = _context.Services.Where(s => s.Id == r.ServiceId).Select(s => s.ServiceName).FirstOrDefault(), r.QCLevel, r.Value, r.Mean, r.SD, r.ZScore,
            r.WestgardRule, r.Violations, r.IsAccepted, r.AnalyzerId, AnalyzerName = _context.LabAnalyzers.Where(a => a.Id == r.AnalyzerId).Select(a => a.Name).FirstOrDefault(), r.RunTime, r.PerformedBy, r.Notes,
        }).ToListAsync();
        var names = await UserNamesAsync(rows.Select(r => r.PerformedBy));
        return rows.Select(r => (object)new
        {
            id = r.Id, lotId = (Guid?)null, lotNumber = r.QCLotNumber ?? "", testCode = r.TestCode, testName = r.TestName ?? r.TestCode,
            level = ParseQcLevel(r.QCLevel), value = r.Value, mean = r.Mean, sd = r.SD, zScore = r.ZScore,
            westgardRule = r.WestgardRule, isViolation = !r.IsAccepted, analyzerId = r.AnalyzerId, analyzerName = r.AnalyzerName,
            runDate = r.RunTime, operatorName = r.PerformedBy.HasValue && names.TryGetValue(r.PerformedBy.Value, out var n) ? n : "",
            notes = r.Notes ?? r.Violations,
        }).ToList();
    }
}
