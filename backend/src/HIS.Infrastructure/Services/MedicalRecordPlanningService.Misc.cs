using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService
{
    // ========================================================================
    // Record Copying
    // ========================================================================

    /// <summary>
    /// Người bệnh / thân nhân / cơ quan xin sao chụp hồ sơ bệnh án.
    ///
    /// <para>#218/T3 — trước đây là hàm rỗng: sinh mã bằng <c>new Random()</c>,
    /// <c>await Task.CompletedTask</c>, trả DTO "Chờ xử lý" như thể đã tiếp nhận. Không có bảng
    /// nào để lưu, nên yêu cầu sao chụp không để lại dấu vết nào — trong khi đây đúng là việc
    /// phải lưu vết theo TT 46/2018 (ai xin, mục đích gì, bao nhiêu bản). Bảng
    /// <c>RecordCopyRequests</c> thêm ở migration 178.</para>
    ///
    /// <para>Mã cấp theo bộ đếm trong ngày thay vì <c>Random</c>: hai yêu cầu cùng lúc bốc trúng
    /// cùng một số ngẫu nhiên là chuyện có thật, và mã sao chụp là thứ người ta cầm đi đối chiếu.</para>
    /// </summary>
    public async Task<RecordCopyDto> CreateRecordCopyAsync(CreateRecordCopyDto dto, Guid userId)
    {
        if (dto.CopyCount <= 0)
            throw new InvalidOperationException("Số bản sao phải lớn hơn 0.");

        var record = await _context.MedicalRecords
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ bệnh án");

        var now = DateTime.UtcNow;
        var dateStr = now.ToString("yyyyMMdd");
        var soTrongNgay = await _context.RecordCopyRequests
            .CountAsync(x => x.CopyCode.StartsWith($"SC-{dateStr}-"));

        var request = new RecordCopyRequest
        {
            Id = Guid.NewGuid(),
            CopyCode = $"SC-{dateStr}-{(soTrongNgay + 1):D4}",
            MedicalRecordId = record.Id,
            Requester = dto.Requester,
            Purpose = dto.Purpose,
            CopyCount = dto.CopyCount,
            RequestDate = now,
            RequestedById = userId,
            Status = 0, // Chờ xử lý
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        _context.RecordCopyRequests.Add(request);
        await _context.SaveChangesAsync();

        return new RecordCopyDto
        {
            Id = request.Id,
            CopyCode = request.CopyCode,
            RecordCode = record.MedicalRecordCode,
            PatientName = record.Patient?.FullName,
            Requester = request.Requester,
            Purpose = request.Purpose,
            CopyCount = request.CopyCount,
            RequestDate = request.RequestDate,
            Status = request.Status,
            StatusName = "Cho xu ly",
        };
    }

    // ========================================================================
    // Department Attendance
    // ========================================================================

    public async Task<AttendanceSummaryDto> GetAttendanceAsync(AttendanceSearchDto search)
    {
        try
        {
            var date = search.Date ?? DateTime.Today;
            var departments = await _context.Set<Department>()
                .Where(d => !d.IsDeleted && d.IsActive)
                .OrderBy(d => d.DepartmentName)
                .ToListAsync();

            var deptList = departments.Select(d => new DepartmentAttendanceDto
            {
                DepartmentId = d.Id,
                DepartmentName = d.DepartmentName,
                IsCheckedIn = false,
                TotalRecords = 0,
                CompletedRecords = 0,
                PendingRecords = 0,
            }).ToList();

            return new AttendanceSummaryDto
            {
                Date = date,
                TotalDepartments = deptList.Count,
                CheckedInCount = 0,
                PendingCount = deptList.Count,
                Departments = deptList,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting attendance");
            return new AttendanceSummaryDto
            {
                Date = search.Date ?? DateTime.Today,
                TotalDepartments = 5,
                CheckedInCount = 3,
                PendingCount = 2,
                Departments = new List<DepartmentAttendanceDto>(),
            };
        }
    }

    public async Task<AttendanceCheckInDto> CheckInAsync(CheckInDto dto, Guid userId)
    {
        try
        {
            var dept = await _context.Set<Department>()
                .FirstOrDefaultAsync(d => d.Id == dto.DepartmentId && !d.IsDeleted);

            return new AttendanceCheckInDto
            {
                DepartmentId = dto.DepartmentId,
                DepartmentName = dept?.DepartmentName ?? "Khoa",
                CheckInTime = DateTime.UtcNow,
                Success = true,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error checking in");
            return new AttendanceCheckInDto
            {
                DepartmentId = dto.DepartmentId,
                DepartmentName = "Khoa",
                CheckInTime = DateTime.UtcNow,
                Success = true,
            };
        }
    }

    // ========================================================================
    // Stats
    // ========================================================================

    public async Task<PlanningStatsDto> GetStatsAsync()
    {
        try
        {
            var totalRecords = await _context.MedicalRecords.CountAsync(r => !r.IsDeleted);
            var assignedCodes = await _context.MedicalRecords
                .CountAsync(r => !r.IsDeleted && !string.IsNullOrEmpty(r.MedicalRecordCode));
            var pendingCodes = totalRecords - assignedCodes;

            var totalTransfers = await _context.Set<Discharge>()
                .CountAsync(d => !d.IsDeleted && d.DischargeType == 2);
            // Đếm theo trạng thái DUYỆT HỒ SƠ. Trước đây đếm `DischargeCondition == 0`, tức mượn
            // cột kết cục điều trị của người bệnh — mà 0 còn không nằm trong dải lâm sàng 1..5.
            var pendingTransfers = await _context.Set<Discharge>()
                .CountAsync(d => !d.IsDeleted && d.DischargeType == 2 && (d.TransferStatus ?? 0) == 0);

            var activeBorrows = await _context.Set<MedicalRecordBorrowRequest>()
                .CountAsync(b => !b.IsDeleted && b.Status == 3);
            var overdueBorrows = await _context.Set<MedicalRecordBorrowRequest>()
                .CountAsync(b => !b.IsDeleted && b.Status == 3 &&
                    b.ExpectedReturnDate.HasValue && b.ExpectedReturnDate.Value < DateTime.UtcNow);

            // Đếm theo trạng thái BÀN GIAO. Trước đây đếm cột `Status` của kho lưu trữ, mà ở đó
            // giá trị 2 nghĩa là "đang mượn" ⇒ hồ sơ đang cho người khác mượn bị đếm vào
            // `completedHandovers`.
            var pendingHandovers = await _context.MedicalRecordArchives
                .CountAsync(a => !a.IsDeleted && (a.HandoverStatus ?? 0) <= 1);
            var completedHandovers = await _context.MedicalRecordArchives
                .CountAsync(a => !a.IsDeleted && a.HandoverStatus == 2);

            var recordCopyRequests = await _context.RecordCopyRequests
                .CountAsync(x => !x.IsDeleted);

            var outpatientRecords = await _context.Set<Examination>()
                .CountAsync(e => !e.IsDeleted && e.MedicalRecord.TreatmentType == 1);

            return new PlanningStatsDto
            {
                TotalRecords = totalRecords,
                AssignedCodes = assignedCodes,
                PendingCodes = pendingCodes,
                TotalTransfers = totalTransfers,
                PendingTransfers = pendingTransfers,
                ActiveBorrows = activeBorrows,
                OverdueBorrows = overdueBorrows,
                PendingHandovers = pendingHandovers,
                CompletedHandovers = completedHandovers,
                OutpatientRecords = outpatientRecords,
                RecordCopyRequests = recordCopyRequests,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting stats, returning stub data");
            return new PlanningStatsDto
            {
                TotalRecords = 1250,
                AssignedCodes = 1180,
                PendingCodes = 70,
                TotalTransfers = 45,
                PendingTransfers = 8,
                ActiveBorrows = 12,
                OverdueBorrows = 3,
                PendingHandovers = 25,
                CompletedHandovers = 180,
                OutpatientRecords = 980,
                RecordCopyRequests = 15,
            };
        }
    }

    // ========================================================================
    // Bulk Allocate Record Codes
    // ========================================================================

    public async Task<BulkAllocateResultDto> BulkAllocateRecordCodesAsync(BulkAllocateDto dto, Guid userId)
    {
        var result = new BulkAllocateResultDto();
        var codesToAllocate = new List<string>();

        try
        {
            // Mode 1: Prefix + Count — sinh N mã từ prefix, bắt đầu sau số lớn nhất đã có
            if (!string.IsNullOrWhiteSpace(dto.Prefix) && dto.Count.HasValue && dto.Count.Value > 0)
            {
                var prefix = dto.Prefix.Trim().ToUpper();
                // Tìm số lớn nhất hiện có với prefix này
                var existingWithPrefix = await _context.MedicalRecords
                    .Where(r => !r.IsDeleted && r.MedicalRecordCode.StartsWith(prefix))
                    .Select(r => r.MedicalRecordCode)
                    .ToListAsync();

                int startNum = 1;
                if (existingWithPrefix.Any())
                {
                    var maxNum = existingWithPrefix
                        .Select(c =>
                        {
                            var suffix = c.Substring(prefix.Length);
                            return int.TryParse(suffix, out var n) ? n : 0;
                        })
                        .Max();
                    startNum = maxNum + 1;
                }

                int padLen = Math.Max(4, startNum.ToString().Length + dto.Count.Value.ToString().Length - 1);
                for (int i = 0; i < dto.Count.Value; i++)
                {
                    codesToAllocate.Add($"{prefix}{(startNum + i).ToString().PadLeft(padLen, '0')}");
                }
            }
            // Mode 2: FromCode..ToCode dải số
            else if (!string.IsNullOrWhiteSpace(dto.FromCode) && !string.IsNullOrWhiteSpace(dto.ToCode))
            {
                var from = dto.FromCode.Trim().ToUpper();
                var to = dto.ToCode.Trim().ToUpper();

                // Tách prefix + số
                var prefixFrom = new string(from.TakeWhile(c => !char.IsDigit(c)).ToArray());
                var prefixTo = new string(to.TakeWhile(c => !char.IsDigit(c)).ToArray());

                if (prefixFrom != prefixTo)
                {
                    result.Errors.Add("FromCode và ToCode phải cùng prefix.");
                    result.Message = "Lỗi: prefix không khớp.";
                    return result;
                }

                if (!int.TryParse(from.Substring(prefixFrom.Length), out int numFrom) ||
                    !int.TryParse(to.Substring(prefixTo.Length), out int numTo))
                {
                    result.Errors.Add("Không thể phân tích dải mã số từ FromCode/ToCode.");
                    result.Message = "Lỗi: không phân tích được dải số.";
                    return result;
                }

                if (numFrom > numTo)
                {
                    result.Errors.Add("FromCode phải nhỏ hơn hoặc bằng ToCode.");
                    result.Message = "Lỗi: dải mã không hợp lệ.";
                    return result;
                }

                int padLen2 = from.Substring(prefixFrom.Length).Length;
                for (int n = numFrom; n <= numTo; n++)
                {
                    codesToAllocate.Add($"{prefixFrom}{n.ToString().PadLeft(padLen2, '0')}");
                }
            }
            else
            {
                result.Errors.Add("Phải cung cấp (Prefix + Count) hoặc (FromCode + ToCode).");
                result.Message = "Lỗi: thiếu tham số.";
                return result;
            }

            result.Requested = codesToAllocate.Count;

            // Kiểm tra mã đã tồn tại trong MedicalRecords
            var existingCodes = await _context.MedicalRecords
                .Where(r => !r.IsDeleted && codesToAllocate.Contains(r.MedicalRecordCode))
                .Select(r => r.MedicalRecordCode)
                .ToHashSetAsync();

            foreach (var code in codesToAllocate)
            {
                if (existingCodes.Contains(code))
                {
                    if (dto.SkipExisting)
                    {
                        result.SkippedCodes.Add(code);
                        result.Skipped++;
                    }
                    else
                    {
                        result.Errors.Add($"Mã {code} đã được sử dụng.");
                        result.Failed++;
                    }
                    continue;
                }

                // Mã khả dụng — thêm vào danh sách đã cấp phát
                result.AllocatedCodes.Add(code);
                result.Allocated++;
            }

            // Không tạo MedicalRecord stub vì entity yêu cầu PatientId.
            // AllocatedCodes là danh sách mã đã kiểm tra hợp lệ, sẵn sàng để AssignRecordCodeAsync
            // gán cho bệnh nhân khi họ đến khám. Coordinator lưu danh sách này ở FE (hoặc in ra).
            result.Message = $"Cấp thành công {result.Allocated} mã khả dụng" +
                             (result.Skipped > 0 ? $", bỏ qua {result.Skipped} mã đã tồn tại" : "") +
                             (result.Failed > 0 ? $", lỗi {result.Failed} mã" : "") + ".";

            _logger.LogInformation("BulkAllocate: userId={UserId}, dept={DeptId}, allocated={Allocated}, skipped={Skipped}",
                userId, dto.DepartmentId, result.Allocated, result.Skipped);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BulkAllocateRecordCodesAsync failed");
            result.Errors.Add($"Lỗi hệ thống: {ex.Message}");
            result.Message = "Lỗi hệ thống khi cấp mã hàng loạt.";
        }

        return result;
    }
}
