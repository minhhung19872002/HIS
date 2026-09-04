using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Constants;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Partial class: Co-Reader / Dong doc ket qua CDHA (#139).
/// Reuse HISDbContext (_context) va IUnitOfWork (_unitOfWork) tu RISCompleteService.cs.
/// </summary>
public partial class RISCompleteService
{
    // ------------------------------------------------------------------ //
    //  HELPERS (private)                                                   //
    // ------------------------------------------------------------------ //

    /// <summary>
    /// Lay ten user tu cache hoac DB. Tra null neu khong tim thay.
    /// </summary>
    private async Task<string?> ResolveUserNameAsync(Guid userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId && !u.IsDeleted)
            .Select(u => new { u.FullName })
            .FirstOrDefaultAsync();
        return user?.FullName;
    }

    // ------------------------------------------------------------------ //
    //  ADD CO-READER                                                       //
    // ------------------------------------------------------------------ //

    public async Task<CoReaderDto> AddCoReaderAsync(AddCoReaderDto dto, Guid currentUserId)
    {
        // Xac nhan report ton tai
        var reportExists = await _context.Set<RadiologyReport>()
            .AsNoTracking()
            .AnyAsync(r => r.Id == dto.RadiologyReportId && !r.IsDeleted);
        if (!reportExists)
            throw new InvalidOperationException($"RadiologyReport {dto.RadiologyReportId} khong ton tai.");

        // Tranh them trung cung mot ReaderId cho cung report
        var duplicate = await _context.Set<RadiologyReportCoReader>()
            .AnyAsync(c => c.RadiologyReportId == dto.RadiologyReportId
                        && c.ReaderId == dto.ReaderId
                        && !c.IsDeleted);
        if (duplicate)
            throw new InvalidOperationException("BS dong doc nay da duoc them vao report.");

        // Snapshot ten neu caller khong truyen
        var readerName = dto.ReaderName
            ?? await ResolveUserNameAsync(dto.ReaderId)
            ?? dto.ReaderId.ToString();

        var entity = new RadiologyReportCoReader
        {
            Id                = Guid.NewGuid(),
            RadiologyReportId = dto.RadiologyReportId,
            ReaderId          = dto.ReaderId,
            ReaderName        = readerName,
            Role              = dto.Role ?? "CoReader",
            Opinion           = dto.Opinion,
            CreatedAt         = DateTime.UtcNow,
            CreatedBy         = currentUserId.ToString(),
        };

        _context.Set<RadiologyReportCoReader>().Add(entity);
        await _unitOfWork.SaveChangesAsync();

        return MapToCoReaderDto(entity);
    }

    // ------------------------------------------------------------------ //
    //  GET CO-READERS                                                      //
    // ------------------------------------------------------------------ //

    public async Task<List<CoReaderDto>> GetCoReadersAsync(Guid reportId)
    {
        var list = await _context.Set<RadiologyReportCoReader>()
            .AsNoTracking()
            .Where(c => c.RadiologyReportId == reportId && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return list.Select(MapToCoReaderDto).ToList();
    }

    // ------------------------------------------------------------------ //
    //  UPDATE OPINION                                                      //
    // ------------------------------------------------------------------ //

    public async Task<bool> UpdateCoReaderOpinionAsync(UpdateCoReaderOpinionDto dto, Guid currentUserId)
    {
        var entity = await _context.Set<RadiologyReportCoReader>()
            .FirstOrDefaultAsync(c => c.Id == dto.CoReaderId && !c.IsDeleted);
        if (entity == null)
            throw new InvalidOperationException($"CoReader {dto.CoReaderId} khong ton tai.");

        if (dto.Opinion != null) entity.Opinion = dto.Opinion;
        if (dto.Role    != null) entity.Role    = dto.Role;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = currentUserId.ToString();

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // ------------------------------------------------------------------ //
    //  REMOVE CO-READER (soft-delete)                                      //
    // ------------------------------------------------------------------ //

    public async Task<bool> RemoveCoReaderAsync(Guid coReaderId, Guid currentUserId)
    {
        var entity = await _context.Set<RadiologyReportCoReader>()
            .FirstOrDefaultAsync(c => c.Id == coReaderId && !c.IsDeleted);
        if (entity == null) return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = currentUserId.ToString();

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // ------------------------------------------------------------------ //
    //  COPY REPORT RESULT                                                  //
    // ------------------------------------------------------------------ //

    public async Task<bool> CopyReportResultAsync(CopyReportResultDto dto, Guid currentUserId)
    {
        var source = await _context.Set<RadiologyReport>()
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == dto.SourceReportId && !r.IsDeleted);
        if (source == null)
            throw new InvalidOperationException($"Report nguon {dto.SourceReportId} khong ton tai.");

        var target = await _context.Set<RadiologyReport>()
            .FirstOrDefaultAsync(r => r.Id == dto.TargetReportId && !r.IsDeleted);
        if (target == null)
            throw new InvalidOperationException($"Report dich {dto.TargetReportId} khong ton tai.");


        // #218/T3: cùng lớp gác với EnterRadiologyResultAsync (§5). Bộ dò
        // `t3_verified_edit_sweep.py` chỉ ra rằng lớp gác ấy mới chỉ đặt ở MỘT trong bốn cửa ghi
        // vào Findings/Impression/Recommendations — ba cửa còn lại sửa được cả phiếu đã ký số,
        // trong khi chữ ký vẫn giữ Status=1 và tiếp tục bảo chứng cho nội dung đã bị thay.
        var hasActiveSignature = await _context.Set<RadiologySignatureHistory>()
            .AnyAsync(sig => sig.RadiologyReportId == dto.TargetReportId && sig.Status == 1);
        RadiologyReportStatus.EnsureCanEditContent(target.Status, hasActiveSignature);

        // Copy noi dung
        target.Findings        = source.Findings;
        target.Impression      = source.Impression;
        target.Recommendations = source.Recommendations;
        target.UpdatedAt       = DateTime.UtcNow;
        target.UpdatedBy       = currentUserId.ToString();

        // Them ban ghi co-reader tu radiologist nguon (neu tuy chon bat)
        if (dto.TrackAsCoReader && source.RadiologistId != Guid.Empty)
        {
            var alreadyTracked = await _context.Set<RadiologyReportCoReader>()
                .AnyAsync(c => c.RadiologyReportId == dto.TargetReportId
                            && c.ReaderId == source.RadiologistId
                            && !c.IsDeleted);

            if (!alreadyTracked)
            {
                var readerName = await ResolveUserNameAsync(source.RadiologistId);
                _context.Set<RadiologyReportCoReader>().Add(new RadiologyReportCoReader
                {
                    Id                = Guid.NewGuid(),
                    RadiologyReportId = dto.TargetReportId,
                    ReaderId          = source.RadiologistId,
                    ReaderName        = readerName,
                    Role              = "CopiedFrom",
                    CopiedFromReportId = dto.SourceReportId,
                    CreatedAt         = DateTime.UtcNow,
                    CreatedBy         = currentUserId.ToString(),
                });
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // ------------------------------------------------------------------ //
    //  MERGE CO-READER OPINIONS INTO IMPRESSION                           //
    // ------------------------------------------------------------------ //

    public async Task<MergeResultDto> MergeCoReaderOpinionsAsync(MergeCoReaderOpinionsDto dto, Guid currentUserId)
    {
        var report = await _context.Set<RadiologyReport>()
            .FirstOrDefaultAsync(r => r.Id == dto.RadiologyReportId && !r.IsDeleted);
        if (report == null)
            throw new InvalidOperationException($"Report {dto.RadiologyReportId} khong ton tai.");


        // #218/T3: cùng lớp gác với EnterRadiologyResultAsync (§5). Bộ dò
        // `t3_verified_edit_sweep.py` chỉ ra rằng lớp gác ấy mới chỉ đặt ở MỘT trong bốn cửa ghi
        // vào Findings/Impression/Recommendations — ba cửa còn lại sửa được cả phiếu đã ký số,
        // trong khi chữ ký vẫn giữ Status=1 và tiếp tục bảo chứng cho nội dung đã bị thay.
        var hasActiveSignature = await _context.Set<RadiologySignatureHistory>()
            .AnyAsync(sig => sig.RadiologyReportId == dto.RadiologyReportId && sig.Status == 1);
        RadiologyReportStatus.EnsureCanEditContent(report.Status, hasActiveSignature);

        var coReaders = await _context.Set<RadiologyReportCoReader>()
            .AsNoTracking()
            .Where(c => c.RadiologyReportId == dto.RadiologyReportId
                     && !c.IsDeleted
                     && !string.IsNullOrEmpty(c.Opinion))
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        if (coReaders.Count == 0)
            return new MergeResultDto { MergedImpression = report.Impression ?? string.Empty, CoReaderCount = 0 };

        // Gop y kien: "[TenBS (Role)]: Y kien"
        var opinions = coReaders
            .Select(c => $"[{c.ReaderName ?? "BS"} ({c.Role ?? "CoReader"})]: {c.Opinion}")
            .ToList();
        var mergedBlock = string.Join("\n", opinions);

        if (dto.AppendMode)
        {
            report.Impression = string.IsNullOrEmpty(report.Impression)
                ? mergedBlock
                : report.Impression + "\n\n--- Y kien dong doc ---\n" + mergedBlock;
        }
        else
        {
            report.Impression = mergedBlock;
        }

        report.UpdatedAt = DateTime.UtcNow;
        report.UpdatedBy = currentUserId.ToString();

        await _unitOfWork.SaveChangesAsync();

        return new MergeResultDto
        {
            MergedImpression = report.Impression,
            CoReaderCount    = coReaders.Count,
        };
    }

    // ------------------------------------------------------------------ //
    //  PRIVATE MAPPER                                                      //
    // ------------------------------------------------------------------ //

    private static CoReaderDto MapToCoReaderDto(RadiologyReportCoReader e) => new()
    {
        Id                 = e.Id,
        RadiologyReportId  = e.RadiologyReportId,
        ReaderId           = e.ReaderId,
        ReaderName         = e.ReaderName,
        Role               = e.Role,
        Opinion            = e.Opinion,
        CopiedFromReportId = e.CopiedFromReportId,
        CreatedAt          = e.CreatedAt,
    };
}
