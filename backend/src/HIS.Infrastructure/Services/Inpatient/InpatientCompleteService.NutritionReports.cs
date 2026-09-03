using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K6 phien 5 (2026-05-30): tach 4 region (3.1 Waiting + 3.3 Service Orders + 3.5 Nutrition + 3.8 Reports, ~674 dong) khoi InpatientCompleteService.
public partial class InpatientCompleteService {
    #region 3.5 Nutrition

    // Issue #4: suất ăn nội trú persist THẬT — reuse bảng DietOrders/DietTypes (Luồng 12 Clinical
    // Nutrition) thay vì tạo bảng mới. DietOrder không có cột "bữa" nên bữa cụ thể (1-4) encode
    // marker "[M{n}]" đầu SpecialInstructions; order không marker (đặt từ màn Clinical Nutrition,
    // chế độ ăn cả ngày) tính vào cả 3 bữa chính khi tổng hợp.

    private static int ParseMealType(string? specialInstructions)
        => specialInstructions is { Length: >= 4 } s && s[0] == '[' && s[1] == 'M'
           && char.IsDigit(s[2]) && s[3] == ']'
            ? s[2] - '0'
            : 0;

    private static string? StripMealTypeMarker(string? specialInstructions)
        => ParseMealType(specialInstructions) == 0 ? specialInstructions : specialInstructions![4..];

    private static string? BuildSpecialInstructions(int mealType, string? requirements)
        => mealType is >= 1 and <= 4 ? $"[M{mealType}]{requirements}" : requirements;

    private async Task<Guid> ResolveDietTypeIdAsync(int nutritionLevel, string? menuCode)
    {
        if (!string.IsNullOrWhiteSpace(menuCode))
        {
            var byCode = await _context.DietTypes
                .Where(d => d.Code == menuCode)
                .Select(d => (Guid?)d.Id)
                .FirstOrDefaultAsync();
            if (byCode.HasValue) return byCode.Value;
        }

        var (category, code, name) = nutritionLevel switch
        {
            2 => ("Therapeutic", "NL2", "Kiêng"),
            3 => ("Special", "NL3", "Đặc biệt"),
            _ => ("Regular", "NL1", "Bình thường"),
        };
        var existing = await _context.DietTypes
            .Where(d => d.Category == category && d.IsActive)
            .OrderBy(d => d.Code)
            .Select(d => (Guid?)d.Id)
            .FirstOrDefaultAsync();
        if (existing.HasValue) return existing.Value;

        var dietType = new DietType
        {
            Id = Guid.NewGuid(), Code = code, Name = name, Category = category,
            IsActive = true, CreatedAt = DateTime.UtcNow,
        };
        _context.DietTypes.Add(dietType);
        await _context.SaveChangesAsync();
        return dietType.Id;
    }

    private static NutritionOrderDto MapNutritionOrder(DietOrder e) => new()
    {
        Id = e.Id,
        AdmissionId = e.AdmissionId,
        PatientName = e.Admission?.Patient?.FullName ?? string.Empty,
        BedName = e.Admission?.Bed?.BedName ?? e.Admission?.Bed?.BedCode,
        OrderDate = e.StartDate,
        MealType = ParseMealType(e.SpecialInstructions),
        NutritionLevel = e.DietType?.Category switch
        {
            "Therapeutic" => 2,
            "Special" => 3,
            _ => 1,
        },
        MenuCode = e.DietType?.Code,
        MenuName = e.DietType?.Name,
        SpecialRequirements = StripMealTypeMarker(e.SpecialInstructions),
        Status = e.Status == "Active" ? 0 : 2,
    };

    private IQueryable<DietOrder> DietOrdersActiveOn(DateTime date)
    {
        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1);
        return _context.DietOrders
            .Include(o => o.Admission!).ThenInclude(a => a.Patient)
            .Include(o => o.Admission!).ThenInclude(a => a.Bed)
            .Include(o => o.DietType)
            .Where(o => !o.IsDeleted && o.Status == "Active"
                && o.StartDate < dayEnd
                && (o.EndDate == null || o.EndDate >= dayStart));
    }

    public async Task<NutritionOrderDto> CreateNutritionOrderAsync(CreateNutritionOrderDto dto, Guid userId)
    {
        var admission = await _context.Admissions
                .Include(a => a.Patient).Include(a => a.Bed)
                .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId && !a.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy đợt điều trị (admissionId không tồn tại)");

        var order = new DietOrder
        {
            Id = Guid.NewGuid(),
            OrderCode = $"SA-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
            AdmissionId = admission.Id,
            PatientId = admission.PatientId,
            DietTypeId = await ResolveDietTypeIdAsync(dto.NutritionLevel, dto.MenuCode),
            OrderedById = userId,
            StartDate = dto.OrderDate.Date,
            EndDate = dto.OrderDate.Date.AddDays(1).AddSeconds(-1), // suất ăn theo ngày
            Status = "Active",
            SpecialInstructions = BuildSpecialInstructions(dto.MealType, dto.SpecialRequirements),
            CreatedAt = DateTime.UtcNow,
        };
        _context.DietOrders.Add(order);
        await _context.SaveChangesAsync();

        order.Admission = admission;
        order.DietType = await _context.DietTypes.FindAsync(order.DietTypeId);
        return MapNutritionOrder(order);
    }

    public async Task<NutritionOrderDto> UpdateNutritionOrderAsync(Guid id, CreateNutritionOrderDto dto, Guid userId)
    {
        var order = await _context.DietOrders
                .Include(o => o.Admission!).ThenInclude(a => a.Patient)
                .Include(o => o.Admission!).ThenInclude(a => a.Bed)
                .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy chỉ định suất ăn");

        order.DietTypeId = await ResolveDietTypeIdAsync(dto.NutritionLevel, dto.MenuCode);
        order.StartDate = dto.OrderDate.Date;
        order.EndDate = dto.OrderDate.Date.AddDays(1).AddSeconds(-1);
        order.SpecialInstructions = BuildSpecialInstructions(dto.MealType, dto.SpecialRequirements);
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        order.DietType = await _context.DietTypes.FindAsync(order.DietTypeId);
        return MapNutritionOrder(order);
    }

    public async Task DeleteNutritionOrderAsync(Guid id, Guid userId)
    {
        var order = await _context.DietOrders.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy chỉ định suất ăn");
        order.IsDeleted = true;
        order.Status = "Discontinued";
        order.DiscontinuationReason = "Xóa từ màn suất ăn nội trú";
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<NutritionOrderDto>> GetNutritionOrdersAsync(Guid? admissionId, Guid? departmentId, DateTime date)
    {
        var query = DietOrdersActiveOn(date);
        if (admissionId.HasValue) query = query.Where(o => o.AdmissionId == admissionId.Value);
        if (departmentId.HasValue) query = query.Where(o => o.Admission!.DepartmentId == departmentId.Value);

        var orders = await query.OrderBy(o => o.StartDate).ToListAsync();
        return orders.Select(MapNutritionOrder).ToList();
    }

    public async Task<NutritionSummaryDto> GetNutritionSummaryAsync(Guid departmentId, DateTime date)
    {
        var deptName = await _context.Departments
            .Where(d => d.Id == departmentId)
            .Select(d => d.DepartmentName)
            .FirstOrDefaultAsync() ?? string.Empty;

        var orders = await DietOrdersActiveOn(date)
            .Where(o => o.Admission!.DepartmentId == departmentId)
            .ToListAsync();

        var summary = new NutritionSummaryDto
        {
            SummaryDate = date.Date,
            DepartmentId = departmentId,
            DepartmentName = deptName,
            Details = orders.Select(MapNutritionOrder).ToList(),
        };

        foreach (var order in orders)
        {
            switch (order.DietType?.Category)
            {
                case "Therapeutic": summary.DietCount++; break;
                case "Special": summary.SpecialCount++; break;
                default: summary.NormalCount++; break;
            }

            // Marker bữa cụ thể → đếm đúng bữa; chế độ ăn cả ngày → cả 3 bữa chính.
            switch (ParseMealType(order.SpecialInstructions))
            {
                case 1: summary.TotalBreakfast++; break;
                case 2: summary.TotalLunch++; break;
                case 3: summary.TotalDinner++; break;
                case 4: summary.TotalSnack++; break;
                default:
                    summary.TotalBreakfast++;
                    summary.TotalLunch++;
                    summary.TotalDinner++;
                    break;
            }
        }

        return summary;
    }

    public async Task<byte[]> PrintNutritionSummaryAsync(Guid departmentId, DateTime date)
    {
        // Issue #4: in từ số liệu tổng hợp thật (DietOrders) — trước đây đếm bệnh nhân nội trú
        // rồi gán hết vào "chế độ thường" (số liệu giả).
        var summary = await GetNutritionSummaryAsync(departmentId, date);

        string MealRow(int mealType) => summary.Details
            .Count(d => d.MealType == mealType || (d.MealType == 0 && mealType <= 3)).ToString();
        string MealRowByLevel(int mealType, int level) => summary.Details
            .Count(d => (d.MealType == mealType || (d.MealType == 0 && mealType <= 3)) && d.NutritionLevel == level)
            .ToString();

        var headers = new[] { "Bữa ăn", "Số suất", "Chế độ thường", "Chế độ kiêng", "Chế độ đặc biệt" };
        var mealNames = new[] { "Sáng", "Trưa", "Chiều", "Phụ" };
        var rows = new List<string[]>();
        for (var meal = 1; meal <= 4; meal++)
        {
            rows.Add(new[]
            {
                mealNames[meal - 1], MealRow(meal),
                MealRowByLevel(meal, 1), MealRowByLevel(meal, 2), MealRowByLevel(meal, 3),
            });
        }

        var html = BuildTableReport(
            "BẢNG TỔNG HỢP SUẤT ĂN",
            $"Khoa: {Esc(summary.DepartmentName)} - Ngày: {date:dd/MM/yyyy}",
            date,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion



    #region 3.8 Reports

    public Task<DepartmentRevenueReportDto> GetDepartmentRevenueReportAsync(ReportSearchDto searchDto)
    {
        return Task.FromResult(new DepartmentRevenueReportDto
        {
            FromDate = searchDto.FromDate,
            ToDate = searchDto.ToDate
        });
    }

    public Task<TreatmentActivityReportDto> GetTreatmentActivityReportAsync(ReportSearchDto searchDto)
    {
        return Task.FromResult(new TreatmentActivityReportDto
        {
            FromDate = searchDto.FromDate,
            ToDate = searchDto.ToDate,
            DepartmentId = searchDto.DepartmentId
        });
    }

    public Task<Register4069Dto> GetRegister4069Async(DateTime fromDate, DateTime toDate, Guid? departmentId)
    {
        return Task.FromResult(new Register4069Dto
        {
            FromDate = fromDate,
            ToDate = toDate
        });
    }

    public async Task<byte[]> PrintRegister4069Async(DateTime fromDate, DateTime toDate, Guid? departmentId)
    {
        var query = _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord)
            .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate);

        if (departmentId.HasValue)
            query = query.Where(a => a.DepartmentId == departmentId.Value);

        var admissions = await query.OrderBy(a => a.AdmissionDate).ToListAsync();
        var dept = departmentId.HasValue ? await _context.Departments.FindAsync(departmentId.Value) : null;

        var headers = new[] { "Mã BN", "Họ tên", "Giới", "Năm sinh", "Địa chỉ", "Ngày vào", "Chẩn đoán", "Ngày ra", "Kết quả" };
        var rows = admissions.Select(a =>
        {
            var discharge = _context.Set<Discharge>().FirstOrDefault(d => d.AdmissionId == a.Id);
            var result = discharge?.DischargeType switch
            {
                1 => "Ra viện", 2 => "Chuyển viện", 3 => "Bỏ về", 4 => "Tử vong", _ => "Đang ĐT"
            };
            return new[]
            {
                a.Patient?.PatientCode ?? "",
                a.Patient?.FullName ?? "",
                a.Patient?.Gender == 1 ? "Nam" : "Nữ",
                a.Patient?.DateOfBirth?.ToString("yyyy") ?? a.Patient?.YearOfBirth?.ToString() ?? "",
                a.Patient?.Address ?? "",
                a.AdmissionDate.ToString("dd/MM/yyyy"),
                a.DiagnosisOnAdmission ?? "",
                discharge?.DischargeDate.ToString("dd/MM/yyyy") ?? "",
                result
            };
        }).ToList();

        var html = BuildTableReport(
            "SỔ ĐĂNG KÝ ĐIỀU TRỊ NỘI TRÚ",
            $"(Mẫu 4069) {(dept != null ? $"- Khoa: {Esc(dept.DepartmentName)}" : "")} - Từ {fromDate:dd/MM/yyyy} đến {toDate:dd/MM/yyyy}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    public Task<MedicineSupplyUsageReportDto> GetMedicineSupplyUsageReportAsync(ReportSearchDto searchDto)
    {
        return Task.FromResult(new MedicineSupplyUsageReportDto
        {
            FromDate = searchDto.FromDate,
            ToDate = searchDto.ToDate,
            DepartmentId = searchDto.DepartmentId
        });
    }

    public async Task<byte[]> PrintMedicineSupplyUsageReportAsync(ReportSearchDto searchDto)
    {
        var query = _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.PrescriptionType == 2
                && d.Prescription.PrescriptionDate >= searchDto.FromDate
                && d.Prescription.PrescriptionDate <= searchDto.ToDate);

        if (searchDto.DepartmentId.HasValue)
            query = query.Where(d => d.Prescription.DepartmentId == searchDto.DepartmentId.Value);

        var details = await query.ToListAsync();
        var dept = searchDto.DepartmentId.HasValue
            ? await _context.Departments.FindAsync(searchDto.DepartmentId.Value) : null;

        // Aggregate by medicine
        var grouped = details
            .GroupBy(d => new { d.MedicineId, Name = d.Medicine?.MedicineName ?? "", Unit = d.Medicine?.Unit ?? "" })
            .Select(g => new
            {
                g.Key.Name,
                g.Key.Unit,
                Quantity = g.Sum(x => x.Quantity),
                Amount = g.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .ToList();

        var headers = new[] { "Tên thuốc/VTYT", "ĐVT", "Tổng SL", "Thành tiền" };
        var rows = grouped.Select(g => new[]
        {
            g.Name, g.Unit, g.Quantity.ToString("#,##0"), g.Amount.ToString("#,##0")
        }).ToList();

        var html = BuildTableReport(
            "BÁO CÁO SỬ DỤNG THUỐC / VẬT TƯ",
            $"{(dept != null ? $"Khoa: {Esc(dept.DepartmentName)} - " : "")}Từ {searchDto.FromDate:dd/MM/yyyy} đến {searchDto.ToDate:dd/MM/yyyy}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    // G-08: Lay danh sach ServiceRequest cua dot dieu tri (chua huy)
    public async Task<List<InpatientServiceRequestItemDto>> GetAdmissionServiceRequestsAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>()
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return new();

        var requests = await _context.ServiceRequests
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .Where(r => r.MedicalRecordId == admission.MedicalRecordId && r.Status != 4)
            .OrderByDescending(r => r.RequestDate)
            .ToBoundedListAsync("InpatientCompleteService.GetAdmissionServiceRequestsAsync");

        return requests.Select(r => new InpatientServiceRequestItemDto
        {
            Id = r.Id,
            RequestCode = r.RequestCode,
            RequestDate = r.RequestDate,
            ServiceName = r.Service?.ServiceName ?? r.Details.FirstOrDefault()?.Service?.ServiceName,
            Quantity = r.Quantity > 0 ? r.Quantity : r.Details.Sum(d => d.Quantity),
            UnitPrice = r.UnitPrice,
            TotalAmount = r.TotalAmount > 0 ? r.TotalAmount : r.Details.Sum(d => d.Amount),
            RequestType = r.RequestType,
            Status = r.Status,
            PatientType = r.Details.FirstOrDefault()?.PatientType ?? 2,
            IsEmergency = r.IsEmergency,
        }).ToList();
    }

    // G-08: Huy nhieu chi dinh CLS mot lan
    public async Task<CancelServiceRequestsResultDto> CancelServiceRequestsAsync(Guid admissionId, CancelServiceRequestsDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>()
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return new() { FailedIds = dto.ServiceRequestIds };

        var result = new CancelServiceRequestsResultDto();
        var now = DateTime.Now;
        var userStr = userId.ToString();

        // #195: nạp 1 lần các phiếu cần hủy thay vì 1 query/phiếu. Điều kiện lọc giữ nguyên
        // (đúng hồ sơ của lượt nằm viện, chưa hủy) nên phiếu nào rơi vào FailedIds vẫn thế.
        var cancelIds = dto.ServiceRequestIds.ToList();
        var cancellableById = await _context.ServiceRequests
            .Where(r => cancelIds.Contains(r.Id)
                && r.MedicalRecordId == admission.MedicalRecordId
                && r.Status != 4)
            .ToDictionaryAsync(r => r.Id);

        foreach (var requestId in dto.ServiceRequestIds)
        {
            cancellableById.TryGetValue(requestId, out var sr);
            if (sr == null)
            {
                result.FailedIds.Add(requestId);
                continue;
            }
            // Only cancel if not yet having results (status 0 or 2)
            if (sr.Status == 3)
            {
                result.FailedIds.Add(requestId);
                continue;
            }
            sr.Status = 4; // Cancelled
            sr.Notes = string.IsNullOrEmpty(dto.Reason) ? sr.Notes : $"Hủy: {dto.Reason}";
            sr.UpdatedAt = now;
            sr.UpdatedBy = userStr;
            result.CancelledCount++;
        }

        if (result.CancelledCount > 0)
            await _context.SaveChangesAsync();

        return result;
    }

    // G-15: Doi doi tuong thanh toan ServiceRequest (BHYT<->Vien phi)
    public async Task<InpatientServiceRequestItemDto> UpdateServiceRequestPaymentTypeAsync(Guid serviceRequestId, UpdateServiceRequestPaymentTypeDto dto, Guid userId)
    {
        var sr = await _context.ServiceRequests
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(r => r.Id == serviceRequestId);
        if (sr == null) throw new Exception("ServiceRequest not found");
        if (sr.Status == 4) throw new Exception("Cannot update cancelled ServiceRequest");

        var now = DateTime.Now;
        var userStr = userId.ToString();

        foreach (var detail in sr.Details)
        {
            detail.PatientType = dto.PatientType;
            detail.UpdatedAt = now;
            detail.UpdatedBy = userStr;
        }
        sr.UpdatedAt = now;
        sr.UpdatedBy = userStr;

        await _context.SaveChangesAsync();

        return new InpatientServiceRequestItemDto
        {
            Id = sr.Id,
            RequestCode = sr.RequestCode,
            RequestDate = sr.RequestDate,
            ServiceName = sr.Service?.ServiceName ?? sr.Details.FirstOrDefault()?.Service?.ServiceName,
            Quantity = sr.Quantity > 0 ? sr.Quantity : sr.Details.Sum(d => d.Quantity),
            UnitPrice = sr.UnitPrice,
            TotalAmount = sr.TotalAmount,
            RequestType = sr.RequestType,
            Status = sr.Status,
            PatientType = dto.PatientType,
            IsEmergency = sr.IsEmergency,
        };
    }

    #endregion
}
