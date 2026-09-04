using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

using HIS.Core.Constants;

namespace HIS.Infrastructure.Services;

public partial class InsuranceXmlService
{

    public async Task<SubmitResultDto> SubmitToInsurancePortalAsync(SubmitToInsurancePortalDto dto)
    {
        try
        {
            // #441: gửi XML THẬT của đợt. Trước đây payload là chuỗi giả
            // `<batch>{BatchId}</batch>` vì BatchId không được persist → cổng BHXH nhận rác
            // trong khi UI báo thành công (thành công giả trên đường compliance).
            var batch = await _context.Set<InsuranceXmlBatch>()
                .FirstOrDefaultAsync(b => b.Id == dto.BatchId && !b.IsDeleted);

            if (batch == null)
            {
                _logger.LogWarning("Submit rejected: XML batch {BatchId} not found", dto.BatchId);
                return new SubmitResultDto
                {
                    Success = false,
                    Message = "Không tìm thấy đợt xuất XML. Vui lòng xuất lại XML trước khi gửi.",
                    SubmitTime = DateTime.Now
                };
            }

            // #218/T3 (2026-09-04): đợt đã gửi rồi thì KHÔNG gửi lại. Trước đây đường này có ba lớp
            // kiểm (đợt tồn tại · thư mục còn · có file xml) nhưng không đọc `Status` lần nào, nên
            // bấm gửi hai lần là hồ sơ chi phí đi lên cơ quan bảo hiểm hai lần. Đo được: `SubmittedAt`
            // và `SubmitTransactionId` của lượt gửi cũ bị ghi đè, tức là đã thực sự ra cổng lần nữa.
            // Đặt NGAY sau khi tìm thấy đợt, trước mọi việc khác — chặn phải xảy ra trước khi gói file.
            if (InsuranceXmlBatchStatus.IsAlreadySubmitted(batch.Status))
            {
                _logger.LogWarning("Submit rejected: batch {BatchCode} already submitted at {At} (txn {Txn})",
                    batch.BatchCode, batch.SubmittedAt, batch.SubmitTransactionId);
                return new SubmitResultDto
                {
                    Success = false,
                    Message = $"Đợt {batch.BatchCode} đã gửi lên BHXH lúc {batch.SubmittedAt:dd/MM/yyyy HH:mm} "
                              + $"(mã giao dịch {batch.SubmitTransactionId}). Không gửi lại để tránh trùng hồ sơ; "
                              + "nếu cần nộp lại, hãy xuất đợt mới.",
                    TransactionId = batch.SubmitTransactionId,
                    SubmitTime = DateTime.Now
                };
            }

            if (string.IsNullOrWhiteSpace(batch.FilePath) || !Directory.Exists(batch.FilePath))
            {
                _logger.LogWarning("Submit rejected: batch {BatchCode} missing files at {Path}",
                    batch.BatchCode, batch.FilePath);
                return new SubmitResultDto
                {
                    Success = false,
                    Message = $"Đợt {batch.BatchCode} không còn file XML trên máy chủ. Vui lòng xuất lại.",
                    SubmitTime = DateTime.Now
                };
            }

            // Gói 14 file XML của đợt thành ZIP rồi base64 — đúng nội dung đã xuất, không phải chuỗi giả.
            var xmlFiles = Directory.GetFiles(batch.FilePath, "*.xml");
            if (xmlFiles.Length == 0)
            {
                _logger.LogWarning("Submit rejected: batch {BatchCode} has 0 xml file", batch.BatchCode);
                return new SubmitResultDto
                {
                    Success = false,
                    Message = $"Đợt {batch.BatchCode} không có file XML nào để gửi.",
                    SubmitTime = DateTime.Now
                };
            }

            // Dùng CHUNG hàm đóng gói với luồng ký (#441): ký cái gì thì gửi đúng cái đó,
            // và bytes deterministic nên chữ ký đã ghi nhận vẫn khớp với payload gửi đi.
            var packed = await PackBatchAsync(batch.FilePath);

            var request = new BhxhSubmitRequest
            {
                XmlBase64 = Convert.ToBase64String(packed),
                BatchCode = batch.BatchCode,       // mã đợt THẬT, không sinh timestamp mới
                FacilityCode = "" // Will use gateway options internally
            };

            var response = await _gatewayClient.SubmitCostDataAsync(request);
            var ok = response.Status != 3; // 3 = error

            // Ghi vết kết quả gửi lên chính đợt — phục vụ tra cứu/đối soát sau này.
            batch.Status = ok ? 2 : 3; // 2-Đã gửi BHXH · 3-Bị từ chối
            batch.SubmittedAt = DateTime.Now;
            batch.SubmitTransactionId = response.TransactionId;
            batch.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Submitted batch {BatchCode} ({Files} files, {Size} bytes) → status={Status} txn={Txn}",
                batch.BatchCode, xmlFiles.Length, packed.Length, response.Status, response.TransactionId);

            return new SubmitResultDto
            {
                Success = ok,
                TransactionId = response.TransactionId,
                Message = response.Message,
                SubmitTime = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway submission failed for batch {BatchId}", dto.BatchId);

            return new SubmitResultDto
            {
                Success = false,
                TransactionId = null,
                Message = $"Khong the gui du lieu len cong BHXH: {ex.Message}",
                SubmitTime = DateTime.Now
            };
        }
    }

    public async Task<SubmitStatusDto> CheckSubmitStatusAsync(string transactionId)
    {
        try
        {
            var response = await _gatewayClient.GetAssessmentResultAsync(transactionId);

            var statusName = response.Status switch
            {
                0 => "Dang xu ly",
                1 => "Hoan thanh",
                2 => "Loi",
                _ => "Khong xac dinh"
            };

            return new SubmitStatusDto
            {
                TransactionId = transactionId,
                Status = response.Status,
                StatusName = statusName,
                Message = response.Message,
                CompletedAt = response.Status == 1 ? DateTime.Now : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway status check failed for transaction {TransactionId}", transactionId);

            return new SubmitStatusDto
            {
                TransactionId = transactionId,
                Status = 0,
                StatusName = "Khong the kiem tra trang thai",
                Message = $"Khong the ket noi cong BHXH: {ex.Message}"
            };
        }
    }

    public async Task<InsuranceFeedbackDto> GetInsuranceFeedbackAsync(string transactionId)
    {
        try
        {
            var response = await _gatewayClient.GetAssessmentResultAsync(transactionId);

            return new InsuranceFeedbackDto
            {
                TransactionId = response.TransactionId,
                TotalRecords = response.TotalRecords,
                AcceptedRecords = response.AcceptedRecords,
                RejectedRecords = response.RejectedRecords,
                Items = response.Items.Select(item => new FeedbackItem
                {
                    MaLk = item.MaLk,
                    IsAccepted = item.IsAccepted,
                    RejectCode = item.RejectCode,
                    RejectReason = item.RejectReason
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway feedback retrieval failed for transaction {TransactionId}", transactionId);

            return new InsuranceFeedbackDto
            {
                TransactionId = transactionId,
                TotalRecords = 0,
                AcceptedRecords = 0,
                RejectedRecords = 0,
                Items = new List<FeedbackItem>()
            };
        }
    }

    public async Task<SubmitResultDto> ResubmitRejectedClaimsAsync(List<string> maLkList)
    {
        try
        {
            // Re-generate XML for rejected claims and submit via gateway
            var claims = await _context.InsuranceClaims
                .Where(c => maLkList.Contains(c.ClaimCode) && !c.IsDeleted)
                .ToListAsync();

            if (!claims.Any())
            {
                return new SubmitResultDto
                {
                    Success = false,
                    Message = "Khong tim thay ho so de gui lai",
                    SubmitTime = DateTime.Now
                };
            }

            var xmlContent = $"<resubmit><count>{claims.Count}</count></resubmit>";
            var request = new BhxhSubmitRequest
            {
                XmlBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(xmlContent)),
                BatchCode = CodeGenerator.Timestamp("RESUB"),
                FacilityCode = ""
            };

            var response = await _gatewayClient.SubmitCostDataAsync(request);

            return new SubmitResultDto
            {
                Success = response.Status != 3,
                TransactionId = response.TransactionId,
                Message = response.Message ?? $"Da gui lai {claims.Count} ho so",
                SubmitTime = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BHXH gateway resubmission failed for {Count} claims", maLkList.Count);

            return new SubmitResultDto
            {
                Success = false,
                TransactionId = null,
                Message = $"Khong the gui lai du lieu: {ex.Message}",
                SubmitTime = DateTime.Now
            };
        }
    }



    public async Task<InsuranceSettlementBatchDto> CreateSettlementBatchAsync(int month, int year)
    {
        if (month <= 0 || month > 12) month = DateTime.Now.Month;
        if (year <= 0 || year > 9999) year = DateTime.Now.Year;
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
            .ToListAsync();

        // Id deterministic theo (year, month) — đợt quyết toán sinh on-the-fly nhưng cần Id ổn định
        // để các bước đối soát (import KQ giám định / tính chênh lệch) map ngược về kỳ. Xem PeriodToBatchId.
        return new InsuranceSettlementBatchDto
        {
            Id = PeriodToBatchId(year, month),
            BatchCode = $"QT-{year}{month:D2}",
            Month = month,
            Year = year,
            TotalRecords = claims.Count,
            ValidRecords = claims.Count,
            InvalidRecords = 0,
            TotalAmount = claims.Sum(c => c.TotalAmount),
            InsuranceAmount = claims.Sum(c => c.InsuranceAmount),
            PatientAmount = claims.Sum(c => c.PatientAmount),
            Status = 0,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<InsuranceSettlementBatchDto?> GetSettlementBatchAsync(Guid batchId)
    {
        var period = BatchIdToPeriod(batchId);
        if (period == null) return null;
        var (year, month) = period.Value;
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);
        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
            .ToListAsync();
        return new InsuranceSettlementBatchDto
        {
            Id = batchId,
            BatchCode = $"QT-{year}{month:D2}",
            Month = month,
            Year = year,
            TotalRecords = claims.Count,
            ValidRecords = claims.Count(c => c.ClaimStatus != 4),
            InvalidRecords = claims.Count(c => c.ClaimStatus == 4),
            TotalAmount = claims.Sum(c => c.TotalAmount),
            InsuranceAmount = claims.Sum(c => c.InsuranceAmount),
            PatientAmount = claims.Sum(c => c.PatientAmount),
            Status = claims.Any(c => c.ProcessedAt != null) ? 3 : 0,
            CreatedAt = DateTime.Now
        };
    }

    public async Task<List<InsuranceSettlementBatchDto>> GetSettlementBatchesAsync(int year)
    {
        var batches = new List<InsuranceSettlementBatchDto>();

        // #195: 1 query cho cả năm thay vì 12 query/tháng, và chỉ lấy 4 cột cần dùng thay vì
        // nạp nguyên entity. Chia ngăn vẫn dùng đúng biểu thức [đầu tháng, cuối tháng] cũ —
        // kể cả nét lệch sẵn có là endDate rơi vào 00:00 ngày cuối tháng.
        var yearStart = new DateTime(year, 1, 1);
        var yearEnd = new DateTime(year, 12, 1).AddMonths(1).AddDays(-1);
        var yearClaims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= yearStart && c.ServiceDate <= yearEnd)
            .Select(c => new { c.ServiceDate, c.TotalAmount, c.InsuranceAmount, c.PatientAmount })
            .ToListAsync();

        for (int month = 1; month <= 12; month++)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            // Only include months that have passed or are current
            if (startDate > DateTime.Today) break;

            var claims = yearClaims
                .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
                .ToList();

            batches.Add(new InsuranceSettlementBatchDto
            {
                Id = PeriodToBatchId(year, month),
                BatchCode = $"QT-{year}{month:D2}",
                Month = month,
                Year = year,
                TotalRecords = claims.Count,
                ValidRecords = claims.Count,
                InvalidRecords = 0,
                TotalAmount = claims.Sum(c => c.TotalAmount),
                InsuranceAmount = claims.Sum(c => c.InsuranceAmount),
                PatientAmount = claims.Sum(c => c.PatientAmount),
                Status = 0,
                CreatedAt = DateTime.Now
            });
        }

        return batches;
    }

    // F4 (audit FLOW-FINAL 2026-06-06): đối soát THẬT — parse file KQ giám định từ cổng BHXH →
    // ghi xuất toán per-hồ sơ (InsuranceRejection) + cập nhật trạng thái claim, KHÔNG hardcode 0.
    public async Task<InsuranceReconciliationDto> ImportReconciliationResultAsync(Guid batchId, byte[] fileContent, Guid userId)
    {
        var period = BatchIdToPeriod(batchId);
        var dto = new InsuranceReconciliationDto
        {
            Id = batchId,
            BatchCode = period != null ? $"QT-{period.Value.year}{period.Value.month:D2}" : $"DS-{batchId.ToString()[..8]}",
            Month = period?.month ?? 0,
            Year = period?.year ?? 0,
            RejectedClaims = new List<RejectedClaimDto>(),
            Status = 0,
            ReconciliationDate = DateTime.Now,
        };
        if (period == null) return dto; // batchId không map được kỳ → không đối soát được

        var (year, month) = period.Value;
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var rows = ParseReconciliationFile(fileContent);
        if (rows.Count == 0)
            _logger.LogWarning("ImportReconciliationResult: file rỗng/không đọc được cho kỳ {Month}/{Year}", month, year);

        var claims = await _context.InsuranceClaims
            .Include(c => c.Patient)
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
            .ToListAsync();
        var byCode = claims
            .Where(c => !string.IsNullOrEmpty(c.ClaimCode))
            .GroupBy(c => c.ClaimCode)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var now = DateTime.Now;
        var processed = new HashSet<Guid>();
        int acceptedCount = 0, rejectedCount = 0;
        decimal acceptedInsurance = 0, rejectedTotal = 0;

        // #195: nạp 1 lần KQ giám định cũ của mọi hồ sơ trong kỳ, thay vì 1 query/dòng file.
        var claimIdsInPeriod = byCode.Values.Select(c => c.Id).Distinct().ToList();
        var oldRejectionsByClaim = claimIdsInPeriod.Count == 0
            ? new Dictionary<Guid, List<InsuranceRejection>>()
            : (await _context.InsuranceRejections
                    .Where(x => claimIdsInPeriod.Contains(x.ClaimId) && !x.IsDeleted)
                    .ToListAsync())
                .GroupBy(x => x.ClaimId)
                .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var row in rows)
        {
            if (!byCode.TryGetValue(row.MaLk, out var claim) || processed.Contains(claim.Id)) continue;
            processed.Add(claim.Id);

            // Xoá KQ giám định cũ của hồ sơ → re-import idempotent.
            if (oldRejectionsByClaim.TryGetValue(claim.Id, out var oldRej) && oldRej.Count > 0)
                _context.InsuranceRejections.RemoveRange(oldRej);

            claim.ProcessedAt = now;
            claim.ProcessedBy = userId == Guid.Empty ? null : userId;
            if (!string.IsNullOrWhiteSpace(row.ProcessorName)) claim.ProcessorName = row.ProcessorName;

            if (row.RejectedAmount > 0)
            {
                rejectedCount++;
                rejectedTotal += row.RejectedAmount;
                acceptedInsurance += Math.Max(0, claim.InsuranceAmount - row.RejectedAmount);
                claim.ClaimStatus = row.RejectedAmount >= claim.InsuranceAmount ? 4 : 3; // 4-từ chối toàn bộ, 3-một phần
                claim.ProcessorNote = row.RejectReason;
                _context.InsuranceRejections.Add(new InsuranceRejection
                {
                    Id = Guid.NewGuid(),
                    ClaimId = claim.Id,
                    RejectionCode = row.RejectCode ?? "",
                    RejectionReason = string.IsNullOrWhiteSpace(row.RejectReason) ? "Xuất toán theo KQ giám định" : row.RejectReason,
                    RejectedAmount = row.RejectedAmount,
                    RejectedAt = now,
                    RejectedBy = userId == Guid.Empty ? null : userId,
                    RejectorName = row.ProcessorName,
                    AppealStatus = 0,
                    CreatedAt = now,
                    CreatedBy = userId.ToString(),
                });
                dto.RejectedClaims.Add(new RejectedClaimDto
                {
                    MaLk = claim.ClaimCode,
                    PatientName = claim.Patient?.FullName ?? "",
                    InsuranceNumber = claim.InsuranceNumber ?? claim.Patient?.InsuranceNumber ?? "",
                    RejectCode = row.RejectCode ?? "",
                    RejectReason = row.RejectReason ?? "",
                    ClaimAmount = claim.InsuranceAmount,
                    RejectedAmount = row.RejectedAmount,
                });
            }
            else
            {
                acceptedCount++;
                acceptedInsurance += claim.InsuranceAmount;
                claim.ClaimStatus = 2; // Đã duyệt
            }
        }

        await _context.SaveChangesAsync();

        dto.HospitalRecordCount = claims.Count;
        dto.HospitalTotalAmount = claims.Sum(c => c.TotalAmount);
        dto.HospitalInsuranceAmount = claims.Sum(c => c.InsuranceAmount);
        dto.AcceptedRecordCount = acceptedCount;
        dto.AcceptedInsuranceAmount = acceptedInsurance;
        dto.AcceptedTotalAmount = acceptedInsurance;
        dto.RejectedRecordCount = rejectedCount;
        dto.DifferenceAmount = rejectedTotal;
        dto.Status = 1;
        dto.ReconciliationDate = now;
        return dto;
    }

    public async Task<List<RejectedClaimDto>> GetRejectedClaimsAsync(Guid batchId)
    {
        // Đọc xuất toán THẬT đã import (InsuranceRejection) cho các hồ sơ thuộc kỳ của batchId.
        var period = BatchIdToPeriod(batchId);
        if (period == null) return new List<RejectedClaimDto>();
        var (year, month) = period.Value;
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var query =
            from rej in _context.InsuranceRejections.Where(x => !x.IsDeleted)
            join claim in _context.InsuranceClaims on rej.ClaimId equals claim.Id
            where claim.ServiceDate >= startDate && claim.ServiceDate <= endDate
            select new { rej, claim, claim.Patient };
        var list = await query.OrderByDescending(x => x.rej.RejectedAt).Take(500).ToListAsync();
        return list.Select(x => new RejectedClaimDto
        {
            MaLk = x.claim.ClaimCode,
            PatientName = x.Patient != null ? x.Patient.FullName : "",
            InsuranceNumber = x.claim.InsuranceNumber ?? (x.Patient != null ? x.Patient.InsuranceNumber : "") ?? "",
            RejectCode = x.rej.RejectionCode,
            RejectReason = x.rej.RejectionReason,
            ClaimAmount = x.claim.InsuranceAmount,
            RejectedAmount = x.rej.RejectedAmount,
        }).ToList();
    }

    public async Task<bool> ProcessRejectedClaimAsync(string maLk, RejectedClaimProcessDto dto)
    {
        var claim = await _context.InsuranceClaims.FirstOrDefaultAsync(c => c.ClaimCode == maLk);
        if (claim == null) return false;

        if (dto.Action == 2) // Accept rejection
        {
            claim.ClaimStatus = 4; // Rejected
        }
        else if (dto.Action == 1 && dto.UpdateData != null) // Fix and resubmit
        {
            if (!string.IsNullOrEmpty(dto.UpdateData.DiagnosisCode))
                claim.MainDiagnosisCode = dto.UpdateData.DiagnosisCode;
            claim.ClaimStatus = 0; // Reset to pending
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ReconciliationDifferenceDto> CalculateReconciliationDifferenceAsync(Guid batchId)
    {
        // Chênh lệch THẬT = Σ tiền BHYT BV đề nghị − Σ tiền BHXH chấp nhận (= đề nghị − xuất toán).
        var result = new ReconciliationDifferenceDto { BatchId = batchId, Details = new List<DifferenceDetail>() };
        var period = BatchIdToPeriod(batchId);
        if (period == null) return result;
        var (year, month) = period.Value;
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var claims = await _context.InsuranceClaims
            .Where(c => c.ServiceDate >= startDate && c.ServiceDate <= endDate)
            .ToListAsync();
        var claimIds = claims.Select(c => c.Id).ToList();
        var rejections = await _context.InsuranceRejections
            .Where(r => !r.IsDeleted && claimIds.Contains(r.ClaimId))
            .ToListAsync();
        var rejectedByClaim = rejections
            .GroupBy(r => r.ClaimId)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.RejectedAmount));

        decimal hospital = claims.Sum(c => c.InsuranceAmount);
        decimal rejectedTotal = rejectedByClaim.Values.Sum();
        result.HospitalAmount = hospital;
        result.InsuranceAmount = hospital - rejectedTotal;
        result.DifferenceAmount = rejectedTotal;

        var typeNames = new Dictionary<int, string> { { 1, "Ngoại trú" }, { 2, "Nội trú" }, { 3, "Cấp cứu" } };
        foreach (var grp in claims.GroupBy(c => c.TreatmentType).OrderBy(g => g.Key))
        {
            decimal gHospital = grp.Sum(c => c.InsuranceAmount);
            decimal gRejected = grp.Sum(c => rejectedByClaim.TryGetValue(c.Id, out var v) ? v : 0);
            result.Details.Add(new DifferenceDetail
            {
                Category = typeNames.TryGetValue(grp.Key, out var n) ? n : $"Loại {grp.Key}",
                HospitalAmount = gHospital,
                InsuranceAmount = gHospital - gRejected,
                Difference = gRejected,
            });
        }
        return result;
    }

    // ─── F4: Đối soát BHYT — helpers (2026-06-09) ─────────────────────────────────

    private static readonly byte[] BatchSig = { 0x42, 0x48, 0x59, 0x54, 0x51, 0x54 }; // "BHYTQT"

    /// <summary>Sinh Id đợt quyết toán deterministic từ (year, month). Đợt sinh on-the-fly nên Id phải
    /// ổn định + decode ngược được (BatchIdToPeriod) để import/tính chênh lệch map đúng kỳ.
    /// Round-trip an toàn: new Guid(byte[16]) ↔ ToByteArray() là nghịch đảo của nhau.</summary>
    private static Guid PeriodToBatchId(int year, int month)
    {
        var b = new byte[16];
        Array.Copy(BatchSig, 0, b, 0, BatchSig.Length); // bytes 0..5
        b[6] = (byte)((year >> 8) & 0xFF);
        b[7] = (byte)(year & 0xFF);
        b[8] = (byte)(month & 0xFF);
        return new Guid(b);
    }

    private static (int year, int month)? BatchIdToPeriod(Guid id)
    {
        var b = id.ToByteArray();
        for (int i = 0; i < BatchSig.Length; i++) if (b[i] != BatchSig[i]) return null;
        int year = (b[6] << 8) | b[7];
        int month = b[8];
        if (year < 2000 || year > 9999 || month < 1 || month > 12) return null;
        return (year, month);
    }

    /// <summary>Dòng KQ giám định đã parse từ file cổng BHXH (gom theo MaLk).</summary>
    private sealed class ReconRow
    {
        public string MaLk = "";
        public decimal RejectedAmount;
        public string? RejectCode;
        public string? RejectReason;
        public string? ProcessorName;
    }

    /// <summary>Parse file KQ đối soát cổng BHXH. 2 định dạng:
    ///  - XML (4210): mỗi node có con MA_LK + tiền xuất toán (T_XUATTOAN/T_TUCHOI/TIEN_TUCHOI) + lý do (MA_TUCHOI/LYDO_TUCHOI).
    ///  - CSV: cột MaLk,RejectedAmount,RejectCode,RejectReason (có/không header; phân tách , ; hoặc tab).
    /// Gom theo MaLk (SUM tiền xuất toán) để tránh đếm trùng dòng header/chi tiết.</summary>
    private static List<ReconRow> ParseReconciliationFile(byte[] content)
    {
        var rows = new List<ReconRow>();
        if (content == null || content.Length == 0) return rows;
        var text = Encoding.UTF8.GetString(content).TrimStart('﻿');
        if (string.IsNullOrWhiteSpace(text)) return rows;

        var map = new Dictionary<string, ReconRow>(StringComparer.OrdinalIgnoreCase);
        void Upsert(string? maLk, decimal rejected, string? code, string? reason, string? processor)
        {
            if (string.IsNullOrWhiteSpace(maLk)) return;
            maLk = maLk.Trim();
            if (!map.TryGetValue(maLk, out var r)) { r = new ReconRow { MaLk = maLk }; map[maLk] = r; }
            r.RejectedAmount += rejected;
            if (string.IsNullOrEmpty(r.RejectCode) && !string.IsNullOrWhiteSpace(code)) r.RejectCode = code.Trim();
            if (string.IsNullOrEmpty(r.RejectReason) && !string.IsNullOrWhiteSpace(reason)) r.RejectReason = reason.Trim();
            if (string.IsNullOrEmpty(r.ProcessorName) && !string.IsNullOrWhiteSpace(processor)) r.ProcessorName = processor.Trim();
        }

        if (text.TrimStart().StartsWith("<"))
        {
            try
            {
                var doc = XDocument.Parse(text);
                foreach (var el in doc.Descendants())
                {
                    var maLk = ChildVal(el, "MA_LK");
                    if (string.IsNullOrWhiteSpace(maLk)) continue;
                    var rejected = ParseMoney(ChildVal(el, "T_XUATTOAN", "T_TUCHOI", "TIEN_TUCHOI", "SOTIEN_TUCHOI", "T_CHENHLECH"));
                    var code = ChildVal(el, "MA_TUCHOI", "MA_LYDO", "MA_LOI");
                    var reason = ChildVal(el, "LYDO_TUCHOI", "LY_DO_TUCHOI", "LY_DO", "GHI_CHU", "MOTA_LOI");
                    var processor = ChildVal(el, "NGUOI_GD", "MA_GIAMDINHVIEN", "NGUOIGD");
                    Upsert(maLk, rejected, code, reason, processor);
                }
            }
            catch { /* XML hỏng → trả những gì gom được */ }
        }
        else
        {
            var lines = text.Replace("\r", "").Split('\n', StringSplitOptions.RemoveEmptyEntries);
            foreach (var raw in lines)
            {
                var cols = raw.Split(new[] { ',', ';', '\t' });
                if (cols.Length < 2) continue;
                var maLk = cols[0].Trim().Trim('"');
                if (string.IsNullOrWhiteSpace(maLk) || maLk.Equals("MaLk", StringComparison.OrdinalIgnoreCase)) continue; // bỏ header
                var rejected = ParseMoney(cols[1]);
                var code = cols.Length > 2 ? cols[2].Trim().Trim('"') : null;
                var reason = cols.Length > 3 ? cols[3].Trim().Trim('"') : null;
                Upsert(maLk, rejected, code, reason, null);
            }
        }
        rows.AddRange(map.Values);
        return rows;
    }

    private static string? ChildVal(XElement el, params string[] names)
    {
        foreach (var name in names)
        {
            var child = el.Elements().FirstOrDefault(e => string.Equals(e.Name.LocalName, name, StringComparison.OrdinalIgnoreCase));
            if (child != null && !string.IsNullOrWhiteSpace(child.Value)) return child.Value;
        }
        return null;
    }

    private static decimal ParseMoney(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return 0;
        s = s.Trim().Replace(",", "").Replace("\"", "");
        return decimal.TryParse(s, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0;
    }


}
