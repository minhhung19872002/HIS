using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Core.Constants;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;

namespace HIS.Infrastructure.Services.Surgery;

/// <summary>
/// K12 Step 2b (2026-05-30, Plan B): Implementation ISurgerySchedulingService.
/// Logic copy 1-1 từ SurgeryCompleteService cũ region 6.1 + 6.1.1 (22 method, ~570 dong).
/// </summary>
public class SurgerySchedulingServiceImpl : ISurgerySchedulingService
{
    private readonly HISDbContext _context;

    public SurgerySchedulingServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    #region 6.1 Quản lý PTTT

    public async Task<SurgeryDto> CreateSurgeryRequestAsync(CreateSurgeryRequestDto dto, Guid userId)
    {
        try
        {
            // 🔴 PATIENT-SAFETY (sweep prod 2026-06-12): trước đây lấy BN ĐẦU TIÊN trong DB
            // (FirstOrDefault / tự tạo "Bệnh nhân Test") khi thiếu context → body rỗng vẫn tạo
            // ca mổ gắn NHẦM bệnh nhân. Resolve BẮT BUỘC từ HSBA/lần khám; thiếu → 400.
            Patient? patient = null;
            if (dto.MedicalRecordId != Guid.Empty)
            {
                patient = await _context.Set<MedicalRecord>()
                    .Where(m => m.Id == dto.MedicalRecordId)
                    .Select(m => m.Patient)
                    .FirstOrDefaultAsync();
                if (patient == null)
                    throw new InvalidOperationException("Khong tim thay ho so benh an (medicalRecordId khong ton tai)");
            }
            else if (dto.ExaminationId.HasValue && dto.ExaminationId.Value != Guid.Empty)
            {
                patient = await _context.Set<Examination>()
                    .Where(e => e.Id == dto.ExaminationId.Value)
                    .Select(e => e.MedicalRecord.Patient)
                    .FirstOrDefaultAsync();
                if (patient == null)
                    throw new InvalidOperationException("Khong tim thay lan kham (examinationId khong ton tai)");
            }
            else
            {
                throw new InvalidOperationException(
                    "Thieu medicalRecordId hoac examinationId — khong the tao yeu cau PTTT khong gan benh nhan");
            }

            // Tìm User để làm RequestingDoctor (dùng user đầu tiên nếu userId không tồn tại)
            var doctor = await _context.Set<User>().FindAsync(userId);
            if (doctor == null)
            {
                doctor = await _context.Set<User>().FirstOrDefaultAsync();
            }
            var doctorId = doctor?.Id ?? userId;

            var requestId = Guid.NewGuid();
            var requestCode = $"PT{DateTime.Now:yyyyMMddHHmmss}";

            var request = new SurgeryRequest
            {
                Id = requestId,
                RequestCode = requestCode,
                PatientId = patient.Id,
                MedicalRecordId = dto.MedicalRecordId != Guid.Empty ? dto.MedicalRecordId : null,
                // Link examination (OPD/CĐHA workflow) when provided
                ExaminationId = dto.ExaminationId != Guid.Empty ? dto.ExaminationId : null,
                RequestDate = DateTime.Now,
                SurgeryType = GetSurgeryTypeName(dto.SurgeryType),
                RequestingDoctorId = doctorId,
                Priority = dto.SurgeryNature,
                Status = 0, // Chờ lên lịch
                PreOpDiagnosis = dto.PreOperativeDiagnosis,
                PreOpIcdCode = dto.PreOperativeIcdCode,
                PlannedProcedure = dto.SurgeryMethod,
                EstimatedDuration = 60, // Default 60 phút
                AnesthesiaType = dto.AnesthesiaType,
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };

            // Tường trình PTTT → cột riêng (migration 78). Ưu tiên field tường minh (FE mới);
            // fallback parse sentinel trong Notes cho FE cũ / row legacy. Notes giữ nguyên.
            request.SurgeryReport = dto.SurgeryReport;
            request.Conclusion = dto.Conclusion;
            request.AttachedImageUrls = dto.AttachedImageUrls;
            if (request.SurgeryReport is null && request.Conclusion is null && request.AttachedImageUrls is null)
                ApplyNarrativeFromNotes(request, dto.Notes);

            _context.Set<SurgeryRequest>().Add(request);
            await _context.SaveChangesAsync();

            // Return DTO
            return new SurgeryDto
            {
                Id = request.Id,
                SurgeryCode = request.RequestCode,
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                PatientName = patient.FullName,
                MedicalRecordId = request.MedicalRecordId ?? Guid.Empty,
                ExaminationId = request.ExaminationId,
                SurgeryType = dto.SurgeryType,
                SurgeryTypeName = request.SurgeryType,
                SurgeryClass = dto.SurgeryClass,
                SurgeryClassName = GetSurgeryClassName(dto.SurgeryClass),
                SurgeryNature = dto.SurgeryNature,
                SurgeryNatureName = dto.SurgeryNature == 1 ? "Cấp cứu" : "Chương trình",
                PreOperativeDiagnosis = dto.PreOperativeDiagnosis,
                PreOperativeIcdCode = dto.PreOperativeIcdCode,
                SurgeryServiceId = dto.SurgeryServiceId,
                SurgeryServiceName = dto.SurgeryMethod ?? "Phẫu thuật",
                AnesthesiaType = dto.AnesthesiaType,
                AnesthesiaTypeName = GetAnesthesiaTypeName(dto.AnesthesiaType),
                Status = 0,
                StatusName = "Chờ lên lịch",
                CreatedAt = DateTime.Now
            };
        }
        catch (InvalidOperationException)
        {
            throw; // lỗi nghiệp vụ → DomainExceptionFilter trả 400 message rõ, không bọc thành 500
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"CreateSurgeryRequestAsync Error: {ex.Message}");
            throw new Exception($"Lỗi tạo yêu cầu phẫu thuật: {ex.Message}", ex);
        }
    }

    // Tách narrative PTTT từ chuỗi Notes pack sentinel ([TUONGTRINH]/[KETLUAN]/[HINHCHINH]/[HINHPHU])
    // mà SurgeryReportModal FE đang gửi, đổ vào cột riêng. Best-effort, từng dòng; không đụng Notes gốc.
    private static void ApplyNarrativeFromNotes(SurgeryRequest request, string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes)) return;
        var images = new List<string>();
        foreach (var raw in notes.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.TrimStart();
            if (line.StartsWith("[TUONGTRINH]"))
                request.SurgeryReport = line.Substring("[TUONGTRINH]".Length).Trim();
            else if (line.StartsWith("[KETLUAN]"))
                request.Conclusion = line.Substring("[KETLUAN]".Length).Trim();
            else if (line.StartsWith("[HINHCHINH]") || line.StartsWith("[HINHPHU]"))
                images.Add(line);
        }
        if (images.Count > 0)
            request.AttachedImageUrls = string.Join("\n", images);
    }

    private static string GetSurgeryTypeName(int surgeryType) => surgeryType switch
    {
        1 => "Phẫu thuật lớn",
        2 => "Phẫu thuật nhỏ",
        3 => "Thủ thuật",
        _ => "Phẫu thuật"
    };

    private static string GetSurgeryClassName(int surgeryClass) => surgeryClass switch
    {
        1 => "Đặc biệt",
        2 => "Loại 1",
        3 => "Loại 2",
        4 => "Loại 3",
        _ => "Không xác định"
    };

    private static string GetAnesthesiaTypeName(int anesthesiaType) => anesthesiaType switch
    {
        1 => "Gây tê",
        2 => "Gây mê toàn thân",
        3 => "Gây mê nội khí quản",
        4 => "Gây tê tủy sống",
        5 => "Gây tê ngoài màng cứng",
        _ => "Không xác định"
    };

    public async Task<SurgeryDto> ApproveSurgeryAsync(ApproveSurgeryDto dto, Guid userId)
    {
        try
        {
            var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);
            if (request == null) throw new KeyNotFoundException("Surgery request not found");

            request.Status = dto.IsApproved ? 1 : 4;
            request.UpdatedAt = DateTime.Now;
            request.UpdatedBy = userId.ToString();

            await _context.SaveChangesAsync();
            return await GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"ApproveSurgeryAsync: missing table/column - {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId, Status = dto.IsApproved ? 1 : 4 };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"ApproveSurgeryAsync error: {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
    }

    public async Task<SurgeryDto> RejectSurgeryAsync(Guid surgeryId, string reason, Guid userId)
    {
        var request = await _context.Set<SurgeryRequest>().FindAsync(surgeryId);
        if (request == null) throw new KeyNotFoundException("Surgery request not found");

        // #218/T3: không từ chối duyệt một ca đã mổ hoặc đang mổ — việc đã xảy ra trên người bệnh.
        SurgeryStatus.EnsureCanCancelRequest(request.Status, "từ chối duyệt");

        request.Status = SurgeryStatus.RequestCancelled;
        // Lý do vào ô riêng (migration 176), KHÔNG ghi đè `Notes` — đó là ghi chú lâm sàng của phiếu.
        request.CancelReason = reason;
        request.UpdatedAt = DateTime.Now;
        request.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return await GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    public async Task<SurgeryDto> ScheduleSurgeryAsync(ScheduleSurgeryDto dto, Guid userId)
    {
        try
        {
            // Sweep 2026-06-12: body rỗng từng tạo schedule zero-GUID (success giả) — validate yêu cầu mổ tồn tại.
            if (dto.SurgeryId == Guid.Empty
                || !await _context.Set<SurgeryRequest>().AnyAsync(r => r.Id == dto.SurgeryId))
                throw new InvalidOperationException("Khong tim thay yeu cau PTTT (surgeryId khong hop le)");

            var schedule = new SurgerySchedule
            {
                Id = Guid.NewGuid(),
                SurgeryRequestId = dto.SurgeryId,
                OperatingRoomId = dto.OperatingRoomId,
                ScheduledDate = dto.ScheduledDate.Date,
                ScheduledTime = dto.ScheduledDate.TimeOfDay,
                ScheduledDateTime = dto.ScheduledDate,
                EstimatedDuration = dto.EstimatedDurationMinutes,
                SurgeonId = userId,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };

            _context.Set<SurgerySchedule>().Add(schedule);

            var request = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId);
            if (request != null)
            {
                request.Status = 1; // Đã lên lịch
            }

            await _context.SaveChangesAsync();
            return await GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
        }
        catch (InvalidOperationException)
        {
            throw; // sweep 2026-06-12: lỗi nghiệp vụ KHÔNG nuốt — filter trả 400 (trước trả DTO rỗng 200 = success giả)
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"ScheduleSurgeryAsync: missing table/column - {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"ScheduleSurgeryAsync error: {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
    }

    public async Task<List<SurgeryScheduleDto>> GetSurgeryScheduleAsync(DateTime date, Guid? operatingRoomId)
    {
        try
        {
            var query = _context.Set<SurgerySchedule>()
                .Include(s => s.SurgeryRequest)
                .ThenInclude(r => r.Patient)
                .Include(s => s.OperatingRoom)
                .Include(s => s.Surgeon)
                .Where(s => s.ScheduledDate.Date == date.Date && !s.IsDeleted);

            if (operatingRoomId.HasValue)
                query = query.Where(s => s.OperatingRoomId == operatingRoomId.Value);

            var schedules = await query.ToListAsync();

            var result = schedules
                .GroupBy(s => s.OperatingRoomId)
                .Select(g => new SurgeryScheduleDto
                {
                    Date = date,
                    OperatingRoomId = g.Key,
                    OperatingRoomName = g.First().OperatingRoom?.RoomName ?? "",
                    Surgeries = g.Select(s => new SurgeryScheduleItemDto
                    {
                        SurgeryId = s.SurgeryRequestId,
                        SurgeryCode = s.SurgeryRequest?.RequestCode ?? "",
                        PatientName = s.SurgeryRequest?.Patient?.FullName ?? "",
                        PatientCode = s.SurgeryRequest?.Patient?.PatientCode ?? "",
                        SurgeryServiceName = s.SurgeryRequest?.PlannedProcedure ?? "",
                        SurgeryType = int.TryParse(s.SurgeryRequest?.SurgeryType, out var st) ? st : 1,
                        SurgeryNature = s.SurgeryRequest?.Priority ?? 1,
                        ScheduledTime = s.ScheduledDateTime,
                        EstimatedDuration = s.EstimatedDuration ?? 60,
                        Status = s.Status,
                        StatusName = GetStatusName(s.Status),
                        SurgeonName = s.Surgeon?.FullName ?? ""
                    }).ToList()
                }).ToList();

            return result;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeryScheduleAsync: missing table/column - {ex.Message}");
            return new List<SurgeryScheduleDto>();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeryScheduleAsync error: {ex.Message}");
            return new List<SurgeryScheduleDto>();
        }
    }

    public async Task<SurgeryDto> CheckInPatientAsync(SurgeryCheckInDto dto, Guid userId)
    {
        try
        {
            var schedule = await _context.Set<SurgerySchedule>()
                .FirstOrDefaultAsync(s => s.SurgeryRequestId == dto.SurgeryId);

            if (schedule != null)
            {
                schedule.Status = 2; // Đang chuẩn bị
                schedule.UpdatedAt = DateTime.Now;
                schedule.UpdatedBy = userId.ToString();
                await _context.SaveChangesAsync();
            }

            return await GetSurgeryByIdAsync(dto.SurgeryId) ?? new SurgeryDto();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"CheckInPatientAsync: missing table/column - {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"CheckInPatientAsync error: {ex.Message}");
            return new SurgeryDto { Id = dto.SurgeryId };
        }
    }

    public async Task<PagedResultDto<SurgeryDto>> GetSurgeriesAsync(SurgerySearchDto dto)
    {
        try
        {
            var query = _context.Set<SurgeryRequest>()
                .Include(r => r.Patient)
                .Where(r => !r.IsDeleted);

            if (!string.IsNullOrEmpty(dto.Keyword))
            {
                query = query.Where(r =>
                    r.RequestCode.Contains(dto.Keyword) ||
                    r.Patient.FullName.Contains(dto.Keyword) ||
                    r.Patient.PatientCode.Contains(dto.Keyword));
            }

            if (dto.Status.HasValue)
                query = query.Where(r => r.Status == dto.Status.Value);

            if (dto.FromDate.HasValue)
                query = query.Where(r => r.RequestDate >= dto.FromDate.Value);

            if (dto.ToDate.HasValue)
                query = query.Where(r => r.RequestDate <= dto.ToDate.Value);

            // Filter by examination (OPD/CĐHA workflow)
            if (dto.ExaminationId.HasValue)
                query = query.Where(r => r.ExaminationId == dto.ExaminationId.Value);

            // Filter by medical record (inpatient workflow)
            if (dto.MedicalRecordId.HasValue)
                query = query.Where(r => r.MedicalRecordId == dto.MedicalRecordId.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((dto.Page - 1) * dto.PageSize)
                .Take(dto.PageSize)
                .ToListAsync();

            return new PagedResultDto<SurgeryDto>
            {
                Items = items.Select(r => new SurgeryDto
                {
                    Id = r.Id,
                    SurgeryCode = r.RequestCode,
                    PatientId = r.PatientId,
                    PatientCode = r.Patient?.PatientCode ?? "",
                    PatientName = r.Patient?.FullName ?? "",
                    DateOfBirth = r.Patient?.DateOfBirth,
                    Gender = r.Patient?.Gender == 1 ? "Nam" : "Nữ",
                    MedicalRecordId = r.MedicalRecordId ?? Guid.Empty,
                    ExaminationId = r.ExaminationId,
                    SurgeryType = int.TryParse(r.SurgeryType, out var st) ? st : 1,
                    SurgeryTypeName = r.SurgeryType,
                    SurgeryNature = r.Priority,
                    SurgeryNatureName = r.Priority == 3 ? "Cấp cứu" : "Chương trình",
                    PreOperativeDiagnosis = r.PreOpDiagnosis,
                    PreOperativeIcdCode = r.PreOpIcdCode,
                    SurgeryServiceName = r.PlannedProcedure ?? "",
                    AnesthesiaType = r.AnesthesiaType ?? 1,
                    Status = r.Status,
                    StatusName = GetStatusName(r.Status),
                    CreatedAt = r.CreatedAt
                }).ToList(),
                TotalCount = totalCount,
                Page = dto.Page,
                PageSize = dto.PageSize
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeriesAsync: missing table/column - {ex.Message}");
            return new PagedResultDto<SurgeryDto> { Items = new List<SurgeryDto>(), TotalCount = 0, Page = dto.Page, PageSize = dto.PageSize };
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeriesAsync error: {ex.Message}");
            return new PagedResultDto<SurgeryDto> { Items = new List<SurgeryDto>(), TotalCount = 0, Page = dto.Page, PageSize = dto.PageSize };
        }
    }

    public async Task<SurgeryDto?> GetSurgeryByIdAsync(Guid id)
    {
        try
        {
            var request = await _context.Set<SurgeryRequest>()
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return null;

            return new SurgeryDto
            {
                Id = request.Id,
                SurgeryCode = request.RequestCode,
                PatientId = request.PatientId,
                PatientCode = request.Patient?.PatientCode ?? "",
                PatientName = request.Patient?.FullName ?? "",
                DateOfBirth = request.Patient?.DateOfBirth,
                Gender = request.Patient?.Gender == 1 ? "Nam" : "Nữ",
                MedicalRecordId = request.MedicalRecordId ?? Guid.Empty,
                SurgeryType = int.TryParse(request.SurgeryType, out var st) ? st : 1,
                SurgeryTypeName = request.SurgeryType,
                SurgeryNature = request.Priority,
                SurgeryNatureName = request.Priority == 3 ? "Cấp cứu" : "Chương trình",
                PreOperativeDiagnosis = request.PreOpDiagnosis,
                PreOperativeIcdCode = request.PreOpIcdCode,
                SurgeryServiceName = request.PlannedProcedure ?? "",
                SurgeryMethod = request.PlannedProcedure,
                AnesthesiaType = request.AnesthesiaType ?? 1,
                Status = request.Status,
                StatusName = GetStatusName(request.Status),
                Description = request.Notes,
                CreatedAt = request.CreatedAt
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeryByIdAsync: missing table/column - {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"GetSurgeryByIdAsync error: {ex.Message}");
            return null;
        }
    }

    public async Task<SurgeryDto> UpdateSurgeryStatusAsync(Guid surgeryId, int status, Guid userId)
    {
        var request = await _context.Set<SurgeryRequest>().FindAsync(surgeryId);
        if (request != null)
        {
            request.Status = status;
            request.UpdatedAt = DateTime.Now;
            request.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();
        }
        return await GetSurgeryByIdAsync(surgeryId) ?? new SurgeryDto();
    }

    public async Task<bool> CancelSurgeryAsync(Guid surgeryId, string reason, Guid userId)
    {
        var request = await _context.Set<SurgeryRequest>().FindAsync(surgeryId);
        if (request == null) return false;

        // #218/T3: hủy một ca ĐÃ MỔ XONG thì biên bản mổ vẫn nằm đó còn phiếu lại khai là đã hủy —
        // hai thứ nói ngược nhau về một việc đã thật sự xảy ra trên người bệnh.
        SurgeryStatus.EnsureCanCancelRequest(request.Status, "hủy");

        request.Status = SurgeryStatus.RequestCancelled;
        request.CancelReason = reason;
        request.UpdatedAt = DateTime.Now;
        request.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<SurgeryDto> SetTeamFeesAsync(Guid surgeryId, List<SurgeryTeamMemberRequestDto> teamMembers, Guid userId)
    {
        return GetSurgeryByIdAsync(surgeryId).ContinueWith(t => t.Result ?? new SurgeryDto());
    }

    public Task<SurgeryFeeCalculationDto> CalculateTeamFeesAsync(Guid surgeryId)
    {
        return Task.FromResult(new SurgeryFeeCalculationDto
        {
            SurgeryId = surgeryId,
            ServicePrice = 5000000,
            TotalFeePool = 1500000,
            TeamFees = new List<TeamMemberFeeDto>
            {
                new() { StaffName = "BS. Nguyễn Văn A", Role = 1, RoleName = "PT viên chính", FeePercent = 40, FeeAmount = 600000 },
                new() { StaffName = "BS. Trần Văn B", Role = 2, RoleName = "PT viên phụ", FeePercent = 20, FeeAmount = 300000 },
                new() { StaffName = "BS. Lê Thị C", Role = 3, RoleName = "BS gây mê", FeePercent = 25, FeeAmount = 375000 },
                new() { StaffName = "ĐD. Phạm Thị D", Role = 4, RoleName = "Điều dưỡng", FeePercent = 15, FeeAmount = 225000 }
            },
            TotalDistributed = 1500000
        });
    }

    public Task<SurgeryProfitDto> CalculateProfitAsync(Guid surgeryId)
    {
        return Task.FromResult(new SurgeryProfitDto
        {
            SurgeryId = surgeryId,
            ServiceRevenue = 5000000,
            MedicineRevenue = 2000000,
            SupplyRevenue = 1500000,
            TotalRevenue = 8500000,
            MedicineCost = 1200000,
            SupplyCost = 800000,
            TeamFee = 1500000,
            OperatingCost = 500000,
            TotalExpense = 4000000,
            Profit = 4500000,
            ProfitMargin = 52.94
        });
    }

    public Task<SurgeryCostCalculationDto> CalculateCostTT37Async(Guid surgeryId, bool hasTeamChange)
    {
        return Task.FromResult(new SurgeryCostCalculationDto
        {
            SurgeryId = surgeryId,
            ServiceCost = 5000000,
            HasTeamChange = hasTeamChange,
            AdditionalServiceCost = hasTeamChange ? 500000 : null,
            MedicineCost = 2000000,
            SupplyCost = 1500000,
            TotalCost = hasTeamChange ? 9000000 : 8500000,
            InsuranceCoverage = 6800000,
            PatientPayment = hasTeamChange ? 2200000 : 1700000
        });
    }

    public Task<SurgeryStatisticsDto> GetStatisticsAsync(DateTime fromDate, DateTime toDate, Guid? departmentId)
    {
        return Task.FromResult(new SurgeryStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalSurgeries = 150,
            EmergencySurgeries = 25,
            ScheduledSurgeries = 125,
            CompletedCount = 145,
            CancelledCount = 5,
            TotalRevenue = 1250000000,
            TotalExpense = 625000000,
            TotalProfit = 625000000
        });
    }

    #endregion

    #region 6.1.1 Gói PTTT & Định mức

    public Task<List<SurgeryPackageDto>> GetSurgeryPackagesAsync(Guid? surgeryServiceId)
    {
        return Task.FromResult(new List<SurgeryPackageDto>
        {
            new() { Id = Guid.NewGuid(), Code = "GOI001", Name = "Gói cắt ruột thừa", PackagePrice = 8000000, IsActive = true },
            new() { Id = Guid.NewGuid(), Code = "GOI002", Name = "Gói mổ sỏi thận", PackagePrice = 15000000, IsActive = true },
            new() { Id = Guid.NewGuid(), Code = "GOI003", Name = "Gói đặt stent tim", PackagePrice = 50000000, IsActive = true }
        });
    }

    public Task<SurgeryPackageDto?> GetSurgeryPackageByIdAsync(Guid id)
    {
        return Task.FromResult<SurgeryPackageDto?>(new SurgeryPackageDto
        {
            Id = id,
            Code = "GOI001",
            Name = "Gói cắt ruột thừa",
            PackagePrice = 8000000,
            MedicineLimit = 3000000,
            SupplyLimit = 2000000,
            IsActive = true
        });
    }

    public Task<SurgeryPackageDto> SaveSurgeryPackageAsync(SurgeryPackageDto dto, Guid userId)
    {
        dto.Id = dto.Id == Guid.Empty ? Guid.NewGuid() : dto.Id;
        return Task.FromResult(dto);
    }

    public Task<bool> DeleteSurgeryPackageAsync(Guid id, Guid userId)
    {
        return Task.FromResult(true);
    }

    public Task<List<PackageMedicineNormDto>> GetPackageMedicineNormsAsync(Guid packageId)
    {
        return Task.FromResult(new List<PackageMedicineNormDto>
        {
            new() { MedicineCode = "TH001", MedicineName = "Paracetamol 500mg", Unit = "Viên", StandardQuantity = 20 },
            new() { MedicineCode = "TH002", MedicineName = "Cefazolin 1g", Unit = "Lọ", StandardQuantity = 3 }
        });
    }

    public Task<List<PackageSupplyNormDto>> GetPackageSupplyNormsAsync(Guid packageId)
    {
        return Task.FromResult(new List<PackageSupplyNormDto>
        {
            new() { SupplyCode = "VT001", SupplyName = "Bông gạc", Unit = "Cuộn", StandardQuantity = 5 },
            new() { SupplyCode = "VT002", SupplyName = "Chỉ khâu Vicryl", Unit = "Sợi", StandardQuantity = 3 }
        });
    }

    #endregion

    // Helper copy từ SurgeryCompleteService cũ
    private static string GetStatusName(int status) => status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đang thực hiện",
        3 => "Hoàn thành",
        4 => "Đã hủy",
        5 => "Hoãn",
        _ => "Không xác định"
    };
}
