using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Common;
using HIS.Application.DTOs.EmrAdmin;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services
{
    public partial class EmrAdminService
    {
        // ============ Completeness Check ============
        public async Task<EmrCompletenessDto> GetCompletenessCheckAsync(Guid medicalRecordId)
        {
            var record = await _db.MedicalRecords.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);

            var requiredDocTypes = await _db.Set<EmrDocumentType>().AsNoTracking()
                .Where(d => d.IsRequired && d.IsActive).ToListAsync();

            // Get signing requests for this record
            var signingRequests = await _db.SigningRequests.AsNoTracking()
                .Where(s => s.PatientId == (record != null ? record.PatientId : Guid.Empty))
                .ToListAsync();

            var items = new List<CompletenessItemDto>();
            foreach (var docType in requiredDocTypes)
            {
                var sr = signingRequests.FirstOrDefault(s => s.DocumentType == docType.Code);
                items.Add(new CompletenessItemDto
                {
                    DocumentType = docType.Code,
                    DocumentName = docType.Name,
                    IsRequired = docType.IsRequired,
                    Exists = sr != null,
                    IsSigned = sr?.Status == 1,
                    SignedByName = sr?.AssignedToName,
                    SignedAt = sr?.SignedAt
                });
            }

            var total = items.Count;
            var signed = items.Count(i => i.IsSigned);
            var unsigned = items.Count(i => i.Exists && !i.IsSigned);
            var missing = items.Count(i => i.IsRequired && !i.Exists);
            var pct = total > 0 ? Math.Round((double)signed / total * 100, 1) : 0;

            return new EmrCompletenessDto
            {
                MedicalRecordId = medicalRecordId,
                TotalDocuments = total,
                SignedDocuments = signed,
                UnsignedDocuments = unsigned,
                MissingRequiredDocuments = missing,
                CompletenessPercent = pct,
                IsComplete = missing == 0 && unsigned == 0,
                IsFinalized = record?.EmrFinalizedAt != null, // TT46: cờ riêng (Status=5 là PendingCLS — bug cũ đã sửa)
                Items = items,
                MissingDocumentNames = items.Where(i => i.IsRequired && !i.Exists).Select(i => i.DocumentName).ToList()
            };
        }

        // ============ Finalization (TT46 — plan-emr-tt46-immutability) ============
        // ⚠️ Trước đây set Status=5 — SAI semantics (5 = MedicalRecordStatus.PendingCLS của luồng khám).
        // Nay khóa bằng cờ riêng EmrFinalizedAt/By + ghi vết/phiên bản vào EmrAmendments (snapshot bản hiện hành).
        public async Task<FinalizeResultDto> FinalizeRecordAsync(FinalizeRecordDto dto)
        {
            var record = await _db.MedicalRecords.FindAsync(dto.MedicalRecordId);
            if (record == null)
                return new FinalizeResultDto { Success = false, Message = "Khong tim thay ho so benh an" };
            if (record.EmrFinalizedAt != null)
                return new FinalizeResultDto { Success = false, Message = "Ho so da duoc ket thuc truoc do" };

            var now = DateTime.UtcNow;
            Guid.TryParse(GetCurrentUserId(), out var userId);

            record.EmrFinalizedAt = now;
            record.EmrFinalizedBy = userId == Guid.Empty ? null : userId;
            record.UpdatedAt = now;
            record.UpdatedBy = GetCurrentUserId();

            var versionNo = ((await _db.EmrAmendments
                .Where(a => a.MedicalRecordId == record.Id && a.Action == 1 && !a.IsDeleted)
                .MaxAsync(a => (int?)a.VersionNo)) ?? 0) + 1;

            _db.EmrAmendments.Add(new EmrAmendment
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                Action = 1, // Finalize
                VersionNo = versionNo,
                Reason = dto.Notes,
                SnapshotJson = await BuildEmrSnapshotJsonAsync(record),
                PerformedBy = userId,
                PerformedByName = GetCurrentUserName(),
                PerformedAt = now,
                CreatedAt = now,
                CreatedBy = GetCurrentUserId(),
            });
            await _db.SaveChangesAsync();

            return new FinalizeResultDto
            {
                Success = true,
                Message = $"Da ket thuc ho so benh an (phien ban v{versionNo})",
                FinalizedAt = now,
                VersionNo = versionNo,
            };
        }

        // F8.5: hạn nộp hồ sơ lưu trữ sau ra viện (ngày) — quy định nội bộ, mặc định.
        private const int EmrArchiveDeadlineDays = 10;
        private const int ActionDeptApprove = 4; // cấp 1: buồng bệnh/ĐD trưởng khoa duyệt

        /// <summary>F8.5 cấp 1: buồng bệnh/ĐD trưởng khoa duyệt hồ sơ trước khi chuyển KHTH lưu trữ.</summary>
        public async Task<FinalizeResultDto> DeptApproveRecordAsync(DeptApproveRecordDto dto)
        {
            var record = await _db.MedicalRecords.FindAsync(dto.MedicalRecordId);
            if (record == null)
                return new FinalizeResultDto { Success = false, Message = "Khong tim thay ho so benh an" };
            if (record.EmrFinalizedAt != null)
                return new FinalizeResultDto { Success = false, Message = "Ho so da luu tru (cap 2) — khong can duyet cap 1" };

            var already = await _db.EmrAmendments
                .AnyAsync(a => a.MedicalRecordId == record.Id && a.Action == ActionDeptApprove && !a.IsDeleted);
            if (already)
                return new FinalizeResultDto { Success = false, Message = "Ho so da duoc duyet cap 1 truoc do" };

            var now = DateTime.UtcNow;
            Guid.TryParse(GetCurrentUserId(), out var userId);
            _db.EmrAmendments.Add(new EmrAmendment
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                Action = ActionDeptApprove,
                VersionNo = 0,
                Reason = dto.Notes,
                PerformedBy = userId,
                PerformedByName = GetCurrentUserName(),
                PerformedAt = now,
                CreatedAt = now,
                CreatedBy = GetCurrentUserId(),
            });
            await _db.SaveChangesAsync();
            return new FinalizeResultDto { Success = true, Message = "Da duyet cap 1 (buong benh/khoa) — chuyen KHTH luu tru", FinalizedAt = now };
        }

        /// <summary>F8.5: trạng thái duyệt 2 cấp + số ngày nộp muộn.</summary>
        public async Task<ArchiveApprovalStatusDto> GetArchiveApprovalAsync(Guid medicalRecordId)
        {
            var record = await _db.MedicalRecords.FindAsync(medicalRecordId);
            if (record == null)
                return new ArchiveApprovalStatusDto { MedicalRecordId = medicalRecordId, DeadlineDays = EmrArchiveDeadlineDays };

            var dept = await _db.EmrAmendments
                .Where(a => a.MedicalRecordId == medicalRecordId && a.Action == ActionDeptApprove && !a.IsDeleted)
                .OrderByDescending(a => a.PerformedAt)
                .FirstOrDefaultAsync();
            var finalize = await _db.EmrAmendments
                .Where(a => a.MedicalRecordId == medicalRecordId && a.Action == 1 && !a.IsDeleted)
                .OrderByDescending(a => a.PerformedAt)
                .FirstOrDefaultAsync();

            var finalized = record.EmrFinalizedAt != null;
            var submissionAt = dept?.PerformedAt ?? record.EmrFinalizedAt;
            int? daysSince = null;
            var lateDays = 0;
            if (record.DischargeDate.HasValue && submissionAt.HasValue)
            {
                daysSince = (int)(submissionAt.Value.Date - record.DischargeDate.Value.Date).TotalDays;
                lateDays = Math.Max(0, daysSince.Value - EmrArchiveDeadlineDays);
            }
            else if (record.DischargeDate.HasValue && !finalized && dept == null)
            {
                // chưa nộp duyệt: đếm ngày đã trôi qua tới hiện tại để cảnh báo quá hạn
                daysSince = (int)(DateTime.UtcNow.Date - record.DischargeDate.Value.Date).TotalDays;
                lateDays = Math.Max(0, daysSince.Value - EmrArchiveDeadlineDays);
            }

            return new ArchiveApprovalStatusDto
            {
                MedicalRecordId = medicalRecordId,
                DeptApproved = dept != null,
                DeptApprovedAt = dept?.PerformedAt,
                DeptApprovedByName = dept?.PerformedByName,
                Finalized = finalized,
                FinalizedAt = record.EmrFinalizedAt,
                FinalizedByName = finalize?.PerformedByName,
                DischargeDate = record.DischargeDate,
                DaysSinceDischarge = daysSince,
                LateDays = lateDays,
                DeadlineDays = EmrArchiveDeadlineDays,
                Level = finalized ? 2 : (dept != null ? 1 : 0),
            };
        }

        /// <summary>TT46: mở lại hồ sơ đã kết thúc — bắt buộc lý do, lưu vết EmrAmendments.</summary>
        public async Task<FinalizeResultDto> ReopenRecordAsync(Guid medicalRecordId, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                return new FinalizeResultDto { Success = false, Message = "Phai nhap ly do mo lai ho so (TT46)" };

            var record = await _db.MedicalRecords.FindAsync(medicalRecordId);
            if (record == null)
                return new FinalizeResultDto { Success = false, Message = "Khong tim thay ho so benh an" };
            if (record.EmrFinalizedAt == null)
                return new FinalizeResultDto { Success = false, Message = "Ho so chua ket thuc — khong can mo lai" };

            var now = DateTime.UtcNow;
            Guid.TryParse(GetCurrentUserId(), out var userId);

            record.EmrFinalizedAt = null;
            record.EmrFinalizedBy = null;
            record.UpdatedAt = now;
            record.UpdatedBy = GetCurrentUserId();

            var currentVersion = (await _db.EmrAmendments
                .Where(a => a.MedicalRecordId == record.Id && a.Action == 1 && !a.IsDeleted)
                .MaxAsync(a => (int?)a.VersionNo)) ?? 1;

            _db.EmrAmendments.Add(new EmrAmendment
            {
                Id = Guid.NewGuid(),
                MedicalRecordId = record.Id,
                Action = 2, // Reopen
                VersionNo = currentVersion,
                Reason = reason.Trim(),
                PerformedBy = userId,
                PerformedByName = GetCurrentUserName(),
                PerformedAt = now,
                CreatedAt = now,
                CreatedBy = GetCurrentUserId(),
            });
            await _db.SaveChangesAsync();

            return new FinalizeResultDto { Success = true, Message = "Da mo lai ho so — moi chinh sua se duoc luu vet; ket thuc lai de tao phien ban moi" };
        }

        public async Task<List<EmrAmendmentDto>> GetAmendmentsAsync(Guid medicalRecordId)
        {
            return await _db.EmrAmendments.AsNoTracking()
                .Where(a => a.MedicalRecordId == medicalRecordId && !a.IsDeleted)
                .OrderByDescending(a => a.PerformedAt)
                .Select(a => new EmrAmendmentDto
                {
                    Id = a.Id,
                    MedicalRecordId = a.MedicalRecordId,
                    Action = a.Action,
                    ActionName = a.Action == 1 ? "Kết thúc hồ sơ" : a.Action == 2 ? "Mở lại hồ sơ" : "Tu chỉnh",
                    VersionNo = a.VersionNo,
                    Reason = a.Reason,
                    SnapshotJson = a.SnapshotJson,
                    PerformedBy = a.PerformedBy,
                    PerformedByName = a.PerformedByName,
                    PerformedAt = a.PerformedAt,
                }).ToBoundedListAsync("EmrAdminService.GetAmendmentsAsync");
        }

        /// <summary>
        /// Snapshot "bản cũ" mức hồ sơ tại thời điểm finalize: nội dung chính + thống kê tài liệu
        /// + danh sách chữ ký số hiệu lực — đủ đối chiếu khi tu chỉnh (per-document snapshot = phase sau).
        /// </summary>
        private async Task<string> BuildEmrSnapshotJsonAsync(MedicalRecord record)
        {
            var examIds = await _db.Examinations.AsNoTracking()
                .Where(e => e.MedicalRecordId == record.Id && !e.IsDeleted)
                .Select(e => e.Id).ToListAsync();
            var prescriptionIds = await _db.Prescriptions.AsNoTracking()
                .Where(p => p.MedicalRecordId == record.Id && !p.IsDeleted)
                .Select(p => p.Id).ToListAsync();
            var serviceRequestCount = await _db.ServiceRequests.AsNoTracking()
                .CountAsync(s => s.MedicalRecordId == record.Id && !s.IsDeleted);
            var progressCount = await _db.DailyProgresses.AsNoTracking()
                .CountAsync(d => !d.IsDeleted && _db.Admissions
                    .Any(ad => ad.Id == d.AdmissionId && ad.MedicalRecordId == record.Id));

            var docIds = examIds.Concat(prescriptionIds).Append(record.Id).ToList();
            var signatures = await _db.DocumentSignatures.AsNoTracking()
                .Where(ds => ds.Status == 0 && docIds.Contains(ds.DocumentId))
                .Select(ds => new
                {
                    ds.DocumentId,
                    ds.DocumentType,
                    ds.DocumentCode,
                    SignerName = ds.SignedByUser != null ? ds.SignedByUser.FullName : null,
                    ds.SignedAt,
                })
                .ToListAsync();

            return System.Text.Json.JsonSerializer.Serialize(new
            {
                snapshotAt = DateTime.UtcNow,
                record.MedicalRecordCode,
                record.MainDiagnosis,
                record.MainIcdCode,
                record.SubDiagnosis,
                record.TreatmentResult,
                record.DischargeType,
                record.AdmissionDate,
                record.DischargeDate,
                counts = new
                {
                    examinations = examIds.Count,
                    prescriptions = prescriptionIds.Count,
                    serviceRequests = serviceRequestCount,
                    dailyProgresses = progressCount,
                },
                activeSignatures = signatures,
            });
        }
    }
}
