using HIS.Application.DTOs.Equipment;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K7 phien 5b (2026-05-30): tach MedicalEquipmentServiceImpl (~224 dong) khoi ExtendedWorkflowServices.cs.
#region Flow 15: Medical Equipment Service - Real Implementation
public class MedicalEquipmentServiceImpl : IMedicalEquipmentService
{
    private readonly HISDbContext _context;
    public MedicalEquipmentServiceImpl(HISDbContext context) => _context = context;

    public async Task<List<MedicalEquipmentDto>> GetEquipmentListAsync(Guid? departmentId = null, string? category = null, string? status = null)
    {
        var query = _context.MedicalEquipments.Include(x => x.Department).AsQueryable();
        if (departmentId.HasValue) query = query.Where(x => x.DepartmentId == departmentId);
        if (!string.IsNullOrEmpty(category)) query = query.Where(x => x.Category == category);
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        var list = await query.ToBoundedListAsync("MedicalEquipment.GetEquipmentList");
        return list.Select(MapToEquipmentDto).ToList();
    }

    public async Task<MedicalEquipmentDto> GetEquipmentAsync(Guid id)
    {
        var e = await _context.MedicalEquipments.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : MapToEquipmentDto(e);
    }

    public async Task<MedicalEquipmentDto> RegisterEquipmentAsync(RegisterEquipmentDto dto)
    {
        var name = string.IsNullOrWhiteSpace(dto.Name) ? dto.EquipmentName : dto.Name;
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên thiết bị là bắt buộc", nameof(dto.Name));
        if (dto.PurchasePrice is < 0m)
            throw new ArgumentException("Giá mua không hợp lệ", nameof(dto.PurchasePrice));
        // No FK on MedicalEquipments.DepartmentId: a zero-GUID / unknown department was accepted and the
        // device showed a blank "Khoa · Phòng" on the v2 list.
        if (dto.DepartmentId.HasValue
            && !await _context.Departments.AnyAsync(d => d.Id == dto.DepartmentId.Value && !d.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy khoa/phòng sử dụng thiết bị");
        // The code typed on the form was discarded (always a generated EQ-timestamp).
        var code = dto.EquipmentCode?.Trim();
        if (!string.IsNullOrEmpty(code) && await _context.MedicalEquipments.AnyAsync(x => x.EquipmentCode == code))
            throw new InvalidOperationException($"Mã thiết bị {code} đã tồn tại");
        var entity = new MedicalEquipment { Id = Guid.NewGuid(), EquipmentCode = string.IsNullOrEmpty(code) ? CodeGenerator.Timestamp("EQ") : code, EquipmentName = name, Category = dto.Category ?? "General", SerialNumber = dto.SerialNumber, Manufacturer = dto.Manufacturer, DepartmentId = dto.DepartmentId, Status = "Active", PurchaseDate = dto.PurchaseDate, CreatedAt = DateTime.Now,
            // Previously accepted but never persisted.
            Model = dto.Model, RiskClass = dto.RiskClass, CountryOfOrigin = dto.CountryOfOrigin, PurchasePrice = dto.PurchasePrice,
            PurchaseSource = dto.Supplier, WarrantyExpiry = dto.WarrantyEndDate ?? dto.WarrantyExpiry, ExpectedLifeYears = dto.ExpectedLifeYears, Location = dto.RoomNumber };
        _context.MedicalEquipments.Add(entity);
        await _context.SaveChangesAsync();
        return await GetEquipmentAsync(entity.Id);
    }

    public async Task<MedicalEquipmentDto> UpdateEquipmentAsync(Guid id, RegisterEquipmentDto dto)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return null!;
        e.EquipmentName = dto.Name; e.Category = dto.Category ?? e.Category; e.SerialNumber = dto.SerialNumber; e.Manufacturer = dto.Manufacturer;
        await _context.SaveChangesAsync();
        return await GetEquipmentAsync(id);
    }

    public async Task<bool> TransferEquipmentAsync(Guid id, Guid newDepartmentId, string roomNumber)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return false;
        e.DepartmentId = newDepartmentId; e.Location = roomNumber;
        await _context.SaveChangesAsync();
        return true;
    }

    private static readonly string[] RetiredStatuses = { "Decommissioned", "PendingDisposal", "ApprovedForDisposal" };

    /// <summary>
    /// Loads the device for a maintenance / calibration / repair write. A device that is (being) disposed
    /// silently accepted new plans, calibrations and repair tickets.
    /// </summary>
    private async Task<MedicalEquipment> GetUsableEquipmentAsync(Guid equipmentId)
    {
        var eq = await _context.MedicalEquipments.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == equipmentId)
            ?? throw new KeyNotFoundException("Không tìm thấy thiết bị");
        if (RetiredStatuses.Contains(eq.Status))
            throw new InvalidOperationException($"Thiết bị {eq.EquipmentCode} đã/đang thanh lý, không thể thao tác.");
        return eq;
    }

    public async Task<bool> UpdateEquipmentStatusAsync(Guid id, string status, string reason)
    {
        var e = await _context.MedicalEquipments.FindAsync(id);
        if (e == null) return false;
        e.Status = status; e.StatusReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<MaintenanceScheduleDto>> GetMaintenanceSchedulesAsync(DateTime? dueDate = null, bool? overdue = null)
    {
        try
        {
            var query = _context.MaintenanceRecords.Include(x => x.Equipment).ThenInclude(x => x!.Department).Where(x => x.Status == "Scheduled");
            if (dueDate.HasValue) query = query.Where(x => x.ScheduledDate <= dueDate);
            if (overdue == true) query = query.Where(x => x.ScheduledDate < DateTime.Today);
            var list = await query.ToBoundedListAsync("MedicalEquipment.GetMaintenanceSchedules");
            return list.Select(e => new MaintenanceScheduleDto { Id = e.Id, ScheduleCode = e.ScheduleCode ?? "", EquipmentId = e.EquipmentId, EquipmentCode = e.Equipment?.EquipmentCode ?? "", EquipmentName = e.Equipment?.EquipmentName ?? "", DepartmentName = e.Equipment?.Department?.DepartmentName ?? "", MaintenanceType = e.MaintenanceType, Frequency = e.Frequency ?? "", NextDueDate = e.ScheduledDate, Status = e.Status, ApprovalStatus = e.ApprovalStatus, ApprovedBy = e.ApprovedBy, ApprovedAt = e.ApprovedAt, ApprovalNote = e.ApprovalNote }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<MaintenanceScheduleDto>();
        }
    }

    /// <summary>NangCap26 XVII.7 — lãnh đạo duyệt kế hoạch bảo dưỡng đã lập.</summary>
    public async Task<MaintenanceScheduleDto> ApproveMaintenanceScheduleAsync(Guid id, string? note, Guid userId)
        => await SetMaintenanceApprovalAsync(id, 1, note, userId);

    /// <summary>NangCap26 XVII.7 — từ chối kế hoạch bảo dưỡng (bắt buộc lý do).</summary>
    public async Task<MaintenanceScheduleDto> RejectMaintenanceScheduleAsync(Guid id, string reason, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("Phải nhập lý do từ chối kế hoạch bảo dưỡng.");
        return await SetMaintenanceApprovalAsync(id, 2, reason, userId);
    }

    private async Task<MaintenanceScheduleDto> SetMaintenanceApprovalAsync(Guid id, int status, string? note, Guid userId)
    {
        var e = await _context.MaintenanceRecords.Include(x => x.Equipment)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy kế hoạch bảo dưỡng.");

        if (e.Status is "Completed")
            throw new InvalidOperationException("Kế hoạch đã hoàn tất, không duyệt/từ chối được nữa.");
        // Only a pending plan (ApprovalStatus 0) can be decided — approve→reject→approve flips were accepted.
        if (e.ApprovalStatus != 0)
            throw new InvalidOperationException(e.ApprovalStatus == 1
                ? "Kế hoạch bảo dưỡng đã được duyệt."
                : "Kế hoạch bảo dưỡng đã bị từ chối.");

        e.ApprovalStatus = status;
        e.ApprovedBy = userId;
        e.ApprovedAt = DateTime.Now;
        e.ApprovalNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        e.UpdatedAt = DateTime.Now;
        e.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        return new MaintenanceScheduleDto
        {
            Id = e.Id, ScheduleCode = e.ScheduleCode ?? "",
            EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "",
            MaintenanceType = e.MaintenanceType, NextDueDate = e.ScheduledDate, Status = e.Status,
            ApprovalStatus = e.ApprovalStatus, ApprovedBy = e.ApprovedBy, ApprovedAt = e.ApprovedAt,
            ApprovalNote = e.ApprovalNote,
        };
    }

    /// <summary>
    /// Sinh mã phiếu kế hoạch bảo dưỡng theo ngày: BDyyyyMMdd-NNNN (NNNN = số thứ tự trong ngày).
    /// Đúng cách bệnh viện đánh số hồ sơ TTBYT — tra cứu được theo ngày, không phải chuỗi ngẫu nhiên.
    /// </summary>
    private async Task<string> NextMaintenanceCodeAsync(DateTime scheduledDate)
    {
        var prefix = $"BD{scheduledDate:yyyyMMdd}-";
        var used = await _context.MaintenanceRecords.AsNoTracking()
            .Where(x => x.ScheduleCode != null && x.ScheduleCode.StartsWith(prefix))
            .Select(x => x.ScheduleCode!)
            .ToListAsync();
        var next = used
            .Select(c => int.TryParse(c[prefix.Length..], out var n) ? n : 0)
            .DefaultIfEmpty(0).Max() + 1;
        return $"{prefix}{next:D4}";
    }

    public async Task<MaintenanceScheduleDto> CreateMaintenanceScheduleAsync(Guid equipmentId, string maintenanceType, string frequency, DateTime nextDueDate, string? notes = null)
    {
        // Kế hoạch mới luôn ở trạng thái CHỜ DUYỆT (ApprovalStatus mặc định 0) — lãnh đạo
        // duyệt xong mới đưa vào lịch thực hiện (XVII.7).
        // A missing date produced plan "BD00010101-0001" due on 0001-01-01; a past date was accepted too.
        if (nextDueDate == default)
            throw new ArgumentException("Ngày bảo dưỡng dự kiến là bắt buộc", nameof(nextDueDate));
        // A plan imported from the existing paper schedule legitimately carries an older due date, so only an
        // absurd date is refused; a merely overdue plan is what the "quá hạn" list is for.
        if (nextDueDate.Date < DateTime.Today.AddYears(-5))
            throw new ArgumentException("Ngày bảo dưỡng dự kiến quá xa trong quá khứ", nameof(nextDueDate));
        var eq = await GetUsableEquipmentAsync(equipmentId);
        var entity = new MaintenanceRecord
        {
            Id = Guid.NewGuid(),
            ScheduleCode = await NextMaintenanceCodeAsync(nextDueDate),
            EquipmentId = equipmentId,
            MaintenanceType = maintenanceType,
            Frequency = string.IsNullOrWhiteSpace(frequency) ? null : frequency,
            ScheduledDate = nextDueDate,
            // The v2 form's "Mô tả công việc / Đơn vị thực hiện / Ghi chú" were sent as notes and dropped.
            WorkDescription = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            Status = "Scheduled",
            CreatedAt = DateTime.Now,
        };
        _context.MaintenanceRecords.Add(entity);
        await _context.SaveChangesAsync();
        return new MaintenanceScheduleDto
        {
            Id = entity.Id, ScheduleCode = entity.ScheduleCode ?? "",
            EquipmentId = equipmentId, EquipmentCode = eq.EquipmentCode, EquipmentName = eq.EquipmentName,
            DepartmentName = eq.Department?.DepartmentName ?? "",
            MaintenanceType = maintenanceType, Frequency = frequency,
            NextDueDate = nextDueDate, Status = "Scheduled", ApprovalStatus = 0,
        };
    }

    public async Task<List<MaintenanceRecordDto>> GetMaintenanceHistoryAsync(Guid equipmentId)
    {
        var list = await _context.MaintenanceRecords.Include(x => x.PerformedBy).Where(x => x.EquipmentId == equipmentId).OrderByDescending(x => x.PerformedDate ?? x.ScheduledDate).ToBoundedListAsync("MedicalEquipment.MaintenanceHistory");
        return list.Select(e => new MaintenanceRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, MaintenanceType = e.MaintenanceType, MaintenanceDate = e.ScheduledDate, PerformedAt = e.PerformedDate, Result = e.Status, Description = e.WorkDescription, TotalCost = e.TotalCost }).ToList();
    }

    public async Task<MaintenanceRecordDto> RecordMaintenanceAsync(CreateMaintenanceRecordDto dto)
    {
        if (dto.PartsCost is < 0m || dto.LaborCost is < 0m)
            throw new ArgumentException("Chi phí bảo trì không được âm");
        // Missing date → record "BD00010101-…" dated 0001-01-01; a completed job cannot be in the future.
        if (dto.MaintenanceDate == default)
            throw new ArgumentException("Ngày bảo trì là bắt buộc", nameof(dto.MaintenanceDate));
        if (dto.MaintenanceDate.Date > DateTime.Today)
            throw new ArgumentException("Ngày bảo trì không được ở tương lai", nameof(dto.MaintenanceDate));
        var eq = await GetUsableEquipmentAsync(dto.EquipmentId);
        var entity = new MaintenanceRecord { Id = Guid.NewGuid(), ScheduleCode = await NextMaintenanceCodeAsync(dto.MaintenanceDate), EquipmentId = dto.EquipmentId, MaintenanceType = dto.MaintenanceType ?? "Corrective", ScheduledDate = dto.MaintenanceDate, PerformedDate = DateTime.Now, Status = "Completed", WorkDescription = dto.Description, PartsReplaced = dto.PartsReplaced, PartsCost = dto.PartsCost, LaborCost = dto.LaborCost, TotalCost = (dto.PartsCost ?? 0) + (dto.LaborCost ?? 0), CreatedAt = DateTime.Now };
        _context.MaintenanceRecords.Add(entity);
        // "BT lần cuối" on the device showed the submit time, not the maintenance date.
        eq.LastMaintenanceDate = dto.MaintenanceDate;
        await _context.SaveChangesAsync();
        return new MaintenanceRecordDto { Id = entity.Id, EquipmentId = entity.EquipmentId, MaintenanceType = entity.MaintenanceType, PerformedAt = entity.PerformedDate, Result = entity.Status };
    }

    public async Task<List<CalibrationRecordDto>> GetCalibrationsDueAsync(int daysAhead = 30)
    {
        var dueDate = DateTime.Today.AddDays(daysAhead);
        var list = await _context.CalibrationRecords.Include(x => x.Equipment).Where(x => x.Status == "Scheduled" && x.ScheduledDate <= dueDate).ToBoundedListAsync("MedicalEquipment.CalibrationsDue");
        return list.Select(e => new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", CalibrationDate = e.ScheduledDate, Status = e.Status }).ToList();
    }

    public async Task<CalibrationRecordDto> GetCalibrationRecordAsync(Guid id)
    {
        var e = await _context.CalibrationRecords.Include(x => x.Equipment).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, EquipmentName = e.Equipment?.EquipmentName ?? "", CalibrationDate = e.PerformedDate ?? e.ScheduledDate, NextCalibrationDate = e.NextCalibrationDate ?? e.ScheduledDate.AddYears(1), Status = e.Status, CertificateNumber = e.CertificateNumber, Result = e.PassedCalibration ? "Pass" : "Fail" };
    }

    public async Task<CalibrationRecordDto> RecordCalibrationAsync(RecordCalibrationDto dto)
    {
        // Date 0001-01-01 (key omitted), a future calibration and a negative cost were all recorded.
        if (dto.CalibrationDate == default)
            throw new ArgumentException("Ngày hiệu chuẩn là bắt buộc", nameof(dto.CalibrationDate));
        if (dto.CalibrationDate.Date > DateTime.Today)
            throw new ArgumentException("Ngày hiệu chuẩn không được ở tương lai", nameof(dto.CalibrationDate));
        if (dto.CalibrationCost is < 0m)
            throw new ArgumentException("Chi phí hiệu chuẩn không được âm", nameof(dto.CalibrationCost));
        if (dto.NextCalibrationDate.Date <= dto.CalibrationDate.Date)
            throw new ArgumentException("Ngày hiệu chuẩn tiếp theo phải sau ngày hiệu chuẩn", nameof(dto.NextCalibrationDate));
        // Any value other than the exact "Pass" (e.g. "pass", "Đạt") silently recorded a FAIL.
        var result = dto.Result?.Trim();
        if (!string.Equals(result, "Pass", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(result, "Fail", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(result, "Conditional", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Kết quả hiệu chuẩn phải là Pass, Fail hoặc Conditional", nameof(dto.Result));
        var eq = await GetUsableEquipmentAsync(dto.EquipmentId);
        var entity = new CalibrationRecord { Id = Guid.NewGuid(), EquipmentId = dto.EquipmentId, ScheduledDate = dto.CalibrationDate, PerformedDate = dto.CalibrationDate, PerformedBy = dto.CalibratedBy, Status = "Completed", CertificateNumber = dto.CertificateNumber, CalibrationStandard = dto.CalibrationStandard, PassedCalibration = string.Equals(result, "Pass", StringComparison.OrdinalIgnoreCase), CalibrationCost = dto.CalibrationCost, ValidFrom = dto.CalibrationDate, ValidUntil = dto.NextCalibrationDate, NextCalibrationDate = dto.NextCalibrationDate, CreatedAt = DateTime.Now };
        _context.CalibrationRecords.Add(entity);
        // "KĐ lần cuối" showed the submit time instead of the certificate's calibration date.
        eq.LastCalibrationDate = dto.CalibrationDate; eq.NextCalibrationDate = entity.ValidUntil;
        // A device that FAILED calibration must not stay usable on patients. Previously only "Active" was
        // blocked, so a device "InMaintenance" at that moment went back to Active when its repair completed.
        if (!entity.PassedCalibration)
        {
            eq.Status = "OutOfService";
            eq.StatusReason = $"Không đạt hiệu chuẩn ngày {dto.CalibrationDate:dd/MM/yyyy}";
        }
        // ...and a later PASS must release that calibration lock (no status endpoint exists, so the device
        // stayed OutOfService forever). Other OutOfService reasons are left untouched.
        else if (entity.PassedCalibration && eq.Status == "OutOfService"
                 && eq.StatusReason != null && eq.StatusReason.StartsWith("Không đạt hiệu chuẩn"))
        {
            eq.Status = "Active";
            eq.StatusReason = null;
        }
        await _context.SaveChangesAsync();
        return await GetCalibrationRecordAsync(entity.Id);
    }

    public async Task<List<CalibrationRecordDto>> GetCalibrationHistoryAsync(Guid equipmentId)
    {
        var list = await _context.CalibrationRecords.Where(x => x.EquipmentId == equipmentId).OrderByDescending(x => x.PerformedDate ?? x.ScheduledDate).ToBoundedListAsync("MedicalEquipment.CalibrationHistory");
        return list.Select(e => new CalibrationRecordDto { Id = e.Id, EquipmentId = e.EquipmentId, CalibrationDate = e.PerformedDate ?? e.ScheduledDate, NextCalibrationDate = e.NextCalibrationDate ?? e.ScheduledDate.AddYears(1), Status = e.Status, CertificateNumber = e.CertificateNumber, Result = e.PassedCalibration ? "Pass" : "Fail" }).ToList();
    }

    public async Task<List<RepairRequestDto>> GetRepairRequestsAsync(string? status = null, Guid? departmentId = null)
    {
        // No Include(RequestedBy): it is a required nav (INNER JOIN) and rows saved with RequestedById = Guid.Empty
        // disappeared from the list; the requester is not part of the DTO anyway.
        var query = _context.RepairRequests.Include(x => x.Equipment).Include(x => x.Department).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (departmentId.HasValue) query = query.Where(x => x.DepartmentId == departmentId);
        var list = await query.OrderByDescending(x => x.RequestDate).ToBoundedListAsync("MedicalEquipment.RepairRequests");
        return list.Select(MapToRepairDto).ToList();
    }

    public async Task<RepairRequestDto> GetRepairRequestAsync(Guid id)
    {
        var e = await _context.RepairRequests.Include(x => x.Equipment).Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return null!;
        return MapToRepairDto(e);
    }

    // DepartmentName was never filled — the v2 "Yêu cầu sửa chữa" tab showed a blank department line.
    private static RepairRequestDto MapToRepairDto(RepairRequest e) => new()
    {
        Id = e.Id, RequestCode = e.RequestCode, EquipmentId = e.EquipmentId,
        EquipmentCode = e.Equipment?.EquipmentCode ?? "", EquipmentName = e.Equipment?.EquipmentName ?? "",
        DepartmentName = e.Department?.DepartmentName ?? "",
        ProblemDescription = e.ProblemDescription, Severity = e.Priority, Status = e.Status,
        ReportedDate = e.RequestDate, RequestedAt = e.RequestDate,
        ActionTaken = e.RepairActions, PartsUsed = e.PartsUsed, RepairCost = e.TotalCost, ActualCompletionDate = e.CompletedDate,
    };

    public async Task<RepairRequestDto> CreateRepairRequestAsync(CreateRepairRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ProblemDescription))
            throw new ArgumentException("Mô tả sự cố là bắt buộc", nameof(dto.ProblemDescription));
        var eq = await GetUsableEquipmentAsync(dto.EquipmentId);
        // Double-submit / repeated "Báo hỏng" opened a second ticket on a device already under repair.
        var openCode = await _context.RepairRequests.AsNoTracking()
            .Where(r => r.EquipmentId == dto.EquipmentId && (r.Status == "Pending" || r.Status == "Assigned" || r.Status == "InProgress"))
            .Select(r => r.RequestCode).FirstOrDefaultAsync();
        // Only a repeat within a few minutes is the double-submit this guards against. A genuine second fault
        // reported while the first repair is still running must be recordable.
        if (openCode != null && await _context.RepairRequests.AsNoTracking().AnyAsync(r =>
                r.EquipmentId == dto.EquipmentId
                && (r.Status == "Pending" || r.Status == "Assigned" || r.Status == "InProgress")
                && r.RequestDate >= DateTime.Now.AddMinutes(-5)))
            throw new InvalidOperationException($"Thiết bị vừa được báo hỏng ({openCode}) — không tạo thêm yêu cầu trùng.");
        var entity = new RepairRequest { Id = Guid.NewGuid(), RequestCode = CodeGenerator.Timestamp("REP"), EquipmentId = dto.EquipmentId, RequestDate = DateTime.Now, ProblemDescription = dto.ProblemDescription, Priority = dto.Severity ?? dto.Priority ?? "Normal", Status = "Pending", CreatedAt = DateTime.Now,
            RequestedById = dto.RequestedById, DepartmentId = eq.DepartmentId };
        _context.RepairRequests.Add(entity);
        eq.Status = "InMaintenance";
        await _context.SaveChangesAsync();
        return await GetRepairRequestAsync(entity.Id);
    }

    public async Task<RepairRequestDto> UpdateRepairRequestAsync(Guid id, RepairRequestDto dto)
    {
        var e = await _context.RepairRequests.FindAsync(id);
        if (e == null) return null!;
        e.Priority = dto.Severity ?? e.Priority; e.Status = dto.Status;
        await _context.SaveChangesAsync();
        return await GetRepairRequestAsync(id);
    }

    public async Task<bool> CompleteRepairAsync(Guid id, string actionTaken, string partsUsed, decimal cost)
    {
        var e = await _context.RepairRequests.FindAsync(id);
        if (e == null) return false;
        e.Status = "Completed"; e.CompletedDate = DateTime.Now; e.RepairActions = actionTaken; e.PartsUsed = partsUsed; e.TotalCost = cost; e.IsRepaired = true;
        var eq = await _context.MedicalEquipments.FindAsync(e.EquipmentId);
        if (eq != null) eq.Status = "Active";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<EquipmentDisposalDto>> GetDisposalRequestsAsync(string? status = null)
    {
        var query = _context.MedicalEquipments.Where(x => x.Status == "Decommissioned" || x.DecommissionDate != null);
        var list = await query.ToBoundedListAsync("MedicalEquipment.GetDisposalRequests");
        return list.Select(e => new EquipmentDisposalDto { Id = e.Id, EquipmentId = e.Id, EquipmentName = e.EquipmentName, Status = e.Status, DisposalDate = e.DecommissionDate, DisposalReason = e.DecommissionReason }).ToList();
    }

    public async Task<EquipmentDisposalDto> CreateDisposalRequestAsync(CreateDisposalRequestDto dto)
    {
        var e = await _context.MedicalEquipments.FindAsync(dto.EquipmentId);
        if (e == null) return null!;
        e.Status = "PendingDisposal"; e.DecommissionReason = dto.DisposalReason;
        await _context.SaveChangesAsync();
        return new EquipmentDisposalDto { Id = Guid.NewGuid(), EquipmentId = e.Id, EquipmentName = e.EquipmentName, Status = "PendingDisposal", DisposalReason = dto.DisposalReason };
    }

    public async Task<bool> ApproveDisposalAsync(Guid id, string notes) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "ApprovedForDisposal"; await _context.SaveChangesAsync(); return true; }
    public async Task<bool> RejectDisposalAsync(Guid id, string reason) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "Active"; e.DecommissionReason = null; await _context.SaveChangesAsync(); return true; }
    public async Task<bool> ExecuteDisposalAsync(Guid id, DateTime disposalDate, string certificate) { var e = await _context.MedicalEquipments.FindAsync(id); if (e == null) return false; e.Status = "Decommissioned"; e.DecommissionDate = disposalDate; await _context.SaveChangesAsync(); return true; }

    public async Task<EquipmentDashboardDto> GetDashboardAsync()
    {
        try
        {
            return new EquipmentDashboardDto
            {
                TotalEquipment = await _context.MedicalEquipments.CountAsync(),
                ActiveEquipment = await _context.MedicalEquipments.CountAsync(x => x.Status == "Active"),
                InMaintenance = await _context.MedicalEquipments.CountAsync(x => x.Status == "InMaintenance"),
                OpenRepairRequests = await _context.RepairRequests.CountAsync(x => x.Status == "Pending"),
                CalibrationDueThisMonth = await _context.MedicalEquipments.CountAsync(x => x.NextCalibrationDate != null && x.NextCalibrationDate <= DateTime.Today.AddDays(30))
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingTable(ex))
        {
            return new EquipmentDashboardDto();
        }
    }

    public async Task<EquipmentReportDto> GetEquipmentReportAsync(DateTime fromDate, DateTime toDate)
    {
        return new EquipmentReportDto { FromDate = fromDate, ToDate = toDate, MaintenanceEventsTotal = await _context.MaintenanceRecords.CountAsync(x => x.PerformedDate >= fromDate && x.PerformedDate <= toDate), RepairRequests = await _context.RepairRequests.CountAsync(x => x.RequestDate >= fromDate && x.RequestDate <= toDate) };
    }

    // The list/detail DTO dropped every field the v2 page reads (risk class, model, purchase, warranty,
    // maintenance/calibration dates, numeric status) — risk/status tabs and the calibration tab were always empty.
    private static MedicalEquipmentDto MapToEquipmentDto(MedicalEquipment e) => new()
    {
        Id = e.Id, EquipmentCode = e.EquipmentCode, Name = e.EquipmentName, Category = e.Category, SerialNumber = e.SerialNumber,
        Manufacturer = e.Manufacturer, DepartmentName = e.Department?.DepartmentName ?? "", Status = e.Status, Location = e.Location,
        DepartmentId = e.DepartmentId, Model = e.Model, RiskClass = e.RiskClass, CountryOfOrigin = e.CountryOfOrigin,
        PurchaseDate = e.PurchaseDate, PurchasePrice = e.PurchasePrice, Supplier = e.PurchaseSource,
        WarrantyEndDate = e.WarrantyExpiry, WarrantyExpiry = e.WarrantyExpiry,
        IsUnderWarranty = e.WarrantyExpiry.HasValue && e.WarrantyExpiry.Value.Date >= DateTime.Today,
        ExpectedLifeYears = e.ExpectedLifeYears,
        LastMaintenanceDate = e.LastMaintenanceDate, NextMaintenanceDate = e.NextMaintenanceDate,
        LastCalibrationDate = e.LastCalibrationDate, NextCalibrationDate = e.NextCalibrationDate,
        StatusReason = e.StatusReason, CreatedAt = e.CreatedAt,
    };
}
#endregion
