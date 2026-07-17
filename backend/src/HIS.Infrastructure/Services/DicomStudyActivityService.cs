using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HIS.Application.DTOs.NangCap24;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace HIS.Infrastructure.Services;

public class DicomStudyActivityService : IDicomStudyActivityService
{
    private readonly HISDbContext _db;

    public DicomStudyActivityService(HISDbContext db) { _db = db; }

    public async Task LogAsync(string studyUid, string action, Guid? requestId, Guid? userId,
        string? userName, string? actionDetails, string? machineName, string? ipAddress, string? relatedReportId)
    {
        if (string.IsNullOrWhiteSpace(studyUid)) return;
        var log = new DicomStudyActivityLog
        {
            Id = Guid.NewGuid(),
            StudyInstanceUid = studyUid,
            RadiologyRequestId = requestId,
            Action = action,
            ActionDetails = actionDetails,
            PerformedByUserId = userId,
            PerformedByName = userName,
            MachineName = machineName,
            IpAddress = ipAddress,
            RelatedReportId = relatedReportId,
            PerformedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _db.DicomStudyActivityLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public async Task<DicomStudyActivityLogSearchResultDto> SearchAsync(DicomStudyActivityLogSearchDto dto)
    {
        var q = _db.DicomStudyActivityLogs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(dto.StudyInstanceUid)) q = q.Where(l => l.StudyInstanceUid == dto.StudyInstanceUid);
        if (dto.RadiologyRequestId.HasValue) q = q.Where(l => l.RadiologyRequestId == dto.RadiologyRequestId.Value);
        if (!string.IsNullOrWhiteSpace(dto.Action)) q = q.Where(l => l.Action == dto.Action);
        if (dto.UserId.HasValue) q = q.Where(l => l.PerformedByUserId == dto.UserId.Value);
        if (dto.FromDate.HasValue) q = q.Where(l => l.PerformedAt >= dto.FromDate.Value);
        if (dto.ToDate.HasValue) q = q.Where(l => l.PerformedAt <= dto.ToDate.Value.AddDays(1));

        var total = await q.CountAsync();
        var logs = await q
            .OrderByDescending(l => l.PerformedAt)
            .Skip((dto.PageIndex - 1) * dto.PageSize).Take(dto.PageSize)
            .ToListAsync();
        return new DicomStudyActivityLogSearchResultDto
        {
            Items = logs.Select(MapToDto).ToList(),
            TotalCount = total
        };
    }

    public async Task<List<DicomStudyActivityLogDto>> GetStudyTimelineAsync(string studyUid)
    {
        var logs = await _db.DicomStudyActivityLogs
            .Where(l => l.StudyInstanceUid == studyUid)
            .OrderByDescending(l => l.PerformedAt)
            .ToListAsync();
        return logs.Select(MapToDto).ToList();
    }

    private static DicomStudyActivityLogDto MapToDto(DicomStudyActivityLog l) => new()
    {
        Id = l.Id,
        StudyInstanceUid = l.StudyInstanceUid,
        RadiologyRequestId = l.RadiologyRequestId,
        Action = l.Action,
        ActionLabel = ActionToVi(l.Action),
        ActionDetails = l.ActionDetails,
        PerformedByName = l.PerformedByName,
        MachineName = l.MachineName,
        IpAddress = l.IpAddress,
        PerformedAt = l.PerformedAt,
        RelatedReportId = l.RelatedReportId
    };

    private static string ActionToVi(string action) => action switch
    {
        "created_from_his" => "Tạo từ HIS",
        "received_from_modality" => "Nhận từ máy chụp",
        "viewed" => "Xem ảnh",
        "result_drafted" => "Soạn kết quả",
        "result_modified" => "Sửa kết quả",
        "result_approved" => "Duyệt kết quả",
        "result_rejected" => "Từ chối kết quả",
        "result_printed" => "In kết quả",
        "study_info_modified" => "Sửa thông tin ca chụp",
        "matched_to_request" => "Match ca chụp",
        "unmatched" => "Unmatch ca chụp",
        "cancelled" => "Hủy ca chụp",
        "restored" => "Khôi phục",
        "shared" => "Chia sẻ",
        "exported_zip" => "Xuất ZIP",
        "sent_to_remote" => "Gửi server khác",
        _ => action
    };
}
