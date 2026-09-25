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
            // QA-R11: every department used to come back "Chưa chấm" with 0/0/0 records (hard-coded),
            // whatever had been checked in. Now read the check-in rows and the department's records of
            // that VN day (admitted that day; "hoàn thành" = HSBA đã kết thúc/khóa TT46).
            var date = (search.Date ?? HIS.Core.Common.VnTime.NowVn).Date;
            var next = date.AddDays(1);
            var deptQuery = _context.Set<Department>().Where(d => !d.IsDeleted && d.IsActive);
            if (search.DepartmentId.HasValue) deptQuery = deptQuery.Where(d => d.Id == search.DepartmentId.Value);
            var departments = await deptQuery.OrderBy(d => d.DepartmentName).ToListAsync();

            var checkIns = await _context.MedicalRecordDeptCheckIns
                .Where(c => !c.IsDeleted && c.CheckInDate == date)
                .ToListAsync();
            var recordCounts = await _context.MedicalRecords
                .Where(r => !r.IsDeleted && r.DepartmentId != null && r.AdmissionDate >= date && r.AdmissionDate < next)
                .GroupBy(r => r.DepartmentId!.Value)
                .Select(g => new { DeptId = g.Key, Total = g.Count(), Done = g.Count(r => r.EmrFinalizedAt != null) })
                .ToListAsync();

            var deptList = departments.Select(d =>
            {
                var ci = checkIns.FirstOrDefault(c => c.DepartmentId == d.Id);
                var rc = recordCounts.FirstOrDefault(x => x.DeptId == d.Id);
                return new DepartmentAttendanceDto
                {
                    DepartmentId = d.Id,
                    DepartmentName = d.DepartmentName,
                    IsCheckedIn = ci != null,
                    CheckInTime = ci?.CheckInTime,
                    CheckInByName = ci?.CheckInByName,
                    TotalRecords = rc?.Total ?? 0,
                    CompletedRecords = rc?.Done ?? 0,
                    PendingRecords = (rc?.Total ?? 0) - (rc?.Done ?? 0),
                };
            }).ToList();

            var checkedIn = deptList.Count(x => x.IsCheckedIn);
            return new AttendanceSummaryDto
            {
                Date = date,
                TotalDepartments = deptList.Count,
                CheckedInCount = checkedIn,
                PendingCount = deptList.Count - checkedIn,
                Departments = deptList,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting attendance");
            throw;
        }
    }

    public async Task<AttendanceCheckInDto> CheckInAsync(CheckInDto dto, Guid userId)
    {
        // QA-R11: this used to write nothing and answered Success=true — even for a department that does
        // not exist, and even when the lookup threw (the catch also returned Success=true).
        var dept = await _context.Set<Department>()
            .FirstOrDefaultAsync(d => d.Id == dto.DepartmentId && !d.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy khoa/phòng");

        var nowVn = HIS.Core.Common.VnTime.NowVn;
        var today = nowVn.Date;
        if (await _context.MedicalRecordDeptCheckIns.AnyAsync(c => !c.IsDeleted && c.DepartmentId == dept.Id && c.CheckInDate == today))
            throw new InvalidOperationException($"Khoa {dept.DepartmentName} đã được điểm danh hôm nay.");

        var user = userId == Guid.Empty ? null : await _context.Users.FindAsync(userId);
        var row = new MedicalRecordDeptCheckIn
        {
            Id = Guid.NewGuid(),
            DepartmentId = dept.Id,
            CheckInDate = today,
            CheckInTime = nowVn,
            CheckInById = userId == Guid.Empty ? null : userId,
            CheckInByName = user?.FullName,
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString(),
        };
        _context.MedicalRecordDeptCheckIns.Add(row);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (NangCap23ServiceHelpers.IsUniqueViolation(ex))
        {
            throw new InvalidOperationException($"Khoa {dept.DepartmentName} đã được điểm danh hôm nay.");
        }

        return new AttendanceCheckInDto
        {
            DepartmentId = dept.Id,
            DepartmentName = dept.DepartmentName,
            CheckInTime = nowVn,
            CheckInByName = row.CheckInByName,
            Success = true,
        };
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

            var nowVn = HIS.Core.Common.VnTime.NowVn; // QA-R11: ExpectedReturnDate is VN wall clock
            var activeBorrows = await _context.Set<MedicalRecordBorrowRequest>()
                .CountAsync(b => !b.IsDeleted && b.Status == 3);
            var overdueBorrows = await _context.Set<MedicalRecordBorrowRequest>()
                .CountAsync(b => !b.IsDeleted && b.Status == 3 &&
                    b.ExpectedReturnDate.HasValue && b.ExpectedReturnDate.Value < nowVn);

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
            // QA-R2: trước đây trả bộ số bịa (1250 hồ sơ, 12 đang mượn...) như KPI thật.
            _logger.LogWarning(ex, "Error getting stats");
            throw;
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
            // QA-R11: honest wording — the codes are checked, not reserved (no row is written).
            result.Message = $"Có {result.Allocated} mã khả dụng (chưa giữ chỗ)" +
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
