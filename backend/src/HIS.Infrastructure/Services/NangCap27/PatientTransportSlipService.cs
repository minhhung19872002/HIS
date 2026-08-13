using HIS.Application.DTOs.NangCap27;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services.NangCap27;

/// <summary>
/// NangCap27 G1 — Phiếu vận chuyển người bệnh.
/// Giá được SNAPSHOT từ danh mục lúc lập/sửa phiếu; đổi danh mục về sau KHÔNG làm đổi phiếu đã lập.
/// </summary>
public class PatientTransportSlipService : IPatientTransportSlipService
{
    private readonly HISDbContext _db;

    public PatientTransportSlipService(HISDbContext db) => _db = db;

    private static string StatusName(int status) => status switch
    {
        0 => "Nháp",
        1 => "Đã duyệt",
        2 => "Hoàn thành",
        3 => "Đã hủy",
        _ => "Không xác định"
    };

    public async Task<List<PatientTransportSlipDto>> GetSlipsAsync(TransportSlipFilterDto filter)
    {
        var q = _db.PatientTransportSlips.AsNoTracking().Where(s => !s.IsDeleted);

        if (filter.PatientId.HasValue) q = q.Where(s => s.PatientId == filter.PatientId);
        if (filter.MedicalRecordId.HasValue) q = q.Where(s => s.MedicalRecordId == filter.MedicalRecordId);
        if (filter.ExaminationId.HasValue) q = q.Where(s => s.ExaminationId == filter.ExaminationId);
        if (filter.DepartmentId.HasValue) q = q.Where(s => s.DepartmentId == filter.DepartmentId);
        if (filter.FromDate.HasValue) q = q.Where(s => s.TransportDate >= filter.FromDate.Value.Date);
        if (filter.ToDate.HasValue) q = q.Where(s => s.TransportDate < filter.ToDate.Value.Date.AddDays(1));
        if (filter.Status.HasValue) q = q.Where(s => s.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim();
            q = q.Where(s => s.SlipCode.Contains(kw)
                || s.FromPlace.Contains(kw)
                || s.ToPlace.Contains(kw)
                || (s.DriverName != null && s.DriverName.Contains(kw))
                || (s.VehiclePlate != null && s.VehiclePlate.Contains(kw)));
        }

        var slips = await q.OrderByDescending(s => s.TransportDate).Take(500).ToListAsync();
        return await ProjectAsync(slips);
    }

    public async Task<PatientTransportSlipDto?> GetSlipAsync(Guid id)
    {
        var slip = await _db.PatientTransportSlips.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (slip == null) return null;
        return (await ProjectAsync(new List<PatientTransportSlip> { slip })).FirstOrDefault();
    }

    public async Task<PatientTransportSlipDto> SaveSlipAsync(SaveTransportSlipDto dto, string? userId)
    {
        if (dto.PatientId == Guid.Empty)
            throw new InvalidOperationException("Chưa chọn người bệnh cho phiếu vận chuyển.");
        if (string.IsNullOrWhiteSpace(dto.FromPlace) || string.IsNullOrWhiteSpace(dto.ToPlace))
            throw new InvalidOperationException("Phải nhập nơi đi và nơi đến.");
        if (dto.DistanceKm < 0)
            throw new InvalidOperationException("Số km không được âm.");

        var service = await _db.TransportServices
            .FirstOrDefaultAsync(t => t.Id == dto.TransportServiceId && !t.IsDeleted)
            ?? throw new InvalidOperationException("Dịch vụ vận chuyển không tồn tại trong danh mục.");

        var patientExists = await _db.Patients.AnyAsync(p => p.Id == dto.PatientId && !p.IsDeleted);
        if (!patientExists)
            throw new InvalidOperationException("Người bệnh không tồn tại.");

        PatientTransportSlip entity;
        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            entity = await _db.PatientTransportSlips
                .FirstOrDefaultAsync(s => s.Id == dto.Id && !s.IsDeleted)
                ?? throw new InvalidOperationException("Phiếu vận chuyển không tồn tại.");
            if (entity.Status != 0)
                throw new InvalidOperationException("Chỉ sửa được phiếu ở trạng thái Nháp.");
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            entity = new PatientTransportSlip
            {
                Id = Guid.NewGuid(),
                SlipCode = await GenerateSlipCodeAsync(),
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                Status = 0
            };
            _db.PatientTransportSlips.Add(entity);
        }

        entity.PatientId = dto.PatientId;
        entity.MedicalRecordId = dto.MedicalRecordId;
        entity.ExaminationId = dto.ExaminationId;
        entity.DepartmentId = dto.DepartmentId;
        entity.TransportServiceId = service.Id;
        entity.TransportDate = dto.TransportDate ?? DateTime.UtcNow;
        entity.FromPlace = dto.FromPlace.Trim();
        entity.ToPlace = dto.ToPlace.Trim();
        entity.Reason = dto.Reason;
        entity.VehiclePlate = dto.VehiclePlate;
        entity.DriverName = dto.DriverName;
        entity.EscortStaff = dto.EscortStaff;
        entity.DistanceKm = dto.DistanceKm;
        entity.FuelType = string.IsNullOrWhiteSpace(dto.FuelType) ? null : dto.FuelType.Trim();
        entity.Note = dto.Note;

        await ApplyPricingAsync(entity, service);

        await _db.SaveChangesAsync();
        return (await ProjectAsync(new List<PatientTransportSlip> { entity })).First();
    }

    /// <summary>
    /// Snapshot giá + tính tiền.
    /// CalculationType = 1 (theo km): tiền dịch vụ = km × đơn giá; tiền xăng = km × hệ số (lít/km) × giá xăng hiện hành.
    /// CalculationType = 2 (theo lượt): tiền dịch vụ = đơn giá, không tính tiền xăng riêng.
    /// </summary>
    private async Task ApplyPricingAsync(PatientTransportSlip entity, TransportService service)
    {
        entity.CalculationType = service.CalculationType;
        entity.UnitPrice = service.UnitPrice;

        if (service.CalculationType == 1)
        {
            entity.ServiceAmount = Math.Round(entity.DistanceKm * service.UnitPrice, 2);
            entity.GasolineFactor = service.GasolineFactor;

            if (service.GasolineFactor.HasValue && service.GasolineFactor.Value > 0)
            {
                // Danh mục giá xăng có NHIỀU loại nhiên liệu cùng hiệu lực một ngày (RON 95 / E5 / Diesel).
                // Phải lọc theo đúng loại nhiên liệu của xe; nếu không, "bản giá mới nhất" là tuỳ ý và
                // mỗi lần lập phiếu ra một số tiền khác nhau. Không chọn được loại → không tính tiền xăng
                // (để trống còn hơn tính sai tiền của người bệnh).
                var fuel = await ResolveFuelPriceAsync(entity.FuelType, entity.TransportDate);

                entity.GasolinePriceId = fuel?.Id;
                entity.FuelType = fuel?.FuelType ?? entity.FuelType;
                entity.FuelPricePerLitre = fuel?.PricePerLitre;
                entity.FuelAmount = fuel == null
                    ? 0
                    : Math.Round(entity.DistanceKm * service.GasolineFactor.Value * fuel.PricePerLitre, 2);
            }
            else
            {
                entity.GasolinePriceId = null;
                entity.FuelPricePerLitre = null;
                entity.FuelAmount = 0;
            }
        }
        else
        {
            entity.ServiceAmount = service.UnitPrice;
            entity.GasolineFactor = null;
            entity.GasolinePriceId = null;
            entity.FuelPricePerLitre = null;
            entity.FuelAmount = 0;
        }

        entity.TotalAmount = entity.ServiceAmount + entity.FuelAmount;
    }

    /// <summary>
    /// Bản giá hiệu lực gần nhất TẠI ngày vận chuyển của đúng loại nhiên liệu (không lấy bảng giá tương lai).
    /// Không truyền loại nhiên liệu: chỉ tự chọn khi danh mục có DUY NHẤT một loại — nhiều loại mà đoán bừa
    /// thì tiền xăng sai; khi đó trả null để phiếu ghi 0 và người lập phải chọn lại loại nhiên liệu.
    /// </summary>
    private async Task<GasolinePrice?> ResolveFuelPriceAsync(string? fuelType, DateTime transportDate)
    {
        var effective = _db.GasolinePrices.AsNoTracking()
            .Where(g => !g.IsDeleted && g.EffectiveFrom <= transportDate);

        if (!string.IsNullOrWhiteSpace(fuelType))
        {
            return await effective
                .Where(g => g.FuelType == fuelType)
                .OrderByDescending(g => g.EffectiveFrom)
                .FirstOrDefaultAsync();
        }

        var distinctTypes = await effective.Select(g => g.FuelType).Distinct().Take(2).ToListAsync();
        if (distinctTypes.Count != 1) return null;

        return await effective
            .Where(g => g.FuelType == distinctTypes[0])
            .OrderByDescending(g => g.EffectiveFrom)
            .FirstOrDefaultAsync();
    }

    public async Task<PatientTransportSlipDto> ApproveSlipAsync(Guid id, Guid userId)
    {
        var entity = await _db.PatientTransportSlips.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted)
            ?? throw new InvalidOperationException("Phiếu vận chuyển không tồn tại.");
        if (entity.Status != 0)
            throw new InvalidOperationException("Chỉ duyệt được phiếu ở trạng thái Nháp.");

        entity.Status = 1;
        entity.ApprovedByUserId = userId == Guid.Empty ? null : userId;
        entity.ApprovedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId == Guid.Empty ? null : userId.ToString();
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (await ProjectAsync(new List<PatientTransportSlip> { entity })).First();
    }

    public async Task<PatientTransportSlipDto> CompleteSlipAsync(Guid id, string? userId)
    {
        var entity = await _db.PatientTransportSlips.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted)
            ?? throw new InvalidOperationException("Phiếu vận chuyển không tồn tại.");
        if (entity.Status != 1)
            throw new InvalidOperationException("Chỉ hoàn thành được phiếu đã duyệt.");

        entity.Status = 2;
        entity.UpdatedBy = userId;
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (await ProjectAsync(new List<PatientTransportSlip> { entity })).First();
    }

    public async Task<PatientTransportSlipDto> CancelSlipAsync(Guid id, string? reason, string? userId)
    {
        var entity = await _db.PatientTransportSlips.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted)
            ?? throw new InvalidOperationException("Phiếu vận chuyển không tồn tại.");
        if (entity.Status == 2)
            throw new InvalidOperationException("Phiếu đã hoàn thành, không hủy được.");
        if (entity.Status == 3)
            throw new InvalidOperationException("Phiếu đã hủy trước đó.");

        entity.Status = 3;
        entity.CancelReason = reason;
        entity.UpdatedBy = userId;
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (await ProjectAsync(new List<PatientTransportSlip> { entity })).First();
    }

    public async Task<bool> DeleteSlipAsync(Guid id, string? userId)
    {
        var entity = await _db.PatientTransportSlips.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (entity == null) return false;
        if (entity.Status != 0)
            throw new InvalidOperationException("Chỉ xóa được phiếu ở trạng thái Nháp.");

        entity.IsDeleted = true;
        entity.UpdatedBy = userId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task<string> GenerateSlipCodeAsync()
    {
        var prefix = $"VC{DateTime.Now:yyyyMMdd}";
        var todayCount = await _db.PatientTransportSlips
            .IgnoreQueryFilters()
            .CountAsync(s => s.SlipCode.StartsWith(prefix));
        return $"{prefix}{(todayCount + 1):D4}";
    }

    /// <summary>Nạp tên người bệnh / khoa / dịch vụ / người duyệt trong 1 lượt truy vấn mỗi bảng (tránh N+1).</summary>
    private async Task<List<PatientTransportSlipDto>> ProjectAsync(List<PatientTransportSlip> slips)
    {
        if (slips.Count == 0) return new List<PatientTransportSlipDto>();

        var patientIds = slips.Select(s => s.PatientId).Distinct().ToList();
        var serviceIds = slips.Select(s => s.TransportServiceId).Distinct().ToList();
        var deptIds = slips.Where(s => s.DepartmentId.HasValue).Select(s => s.DepartmentId!.Value).Distinct().ToList();
        var userIds = slips.Where(s => s.ApprovedByUserId.HasValue).Select(s => s.ApprovedByUserId!.Value).Distinct().ToList();

        var patients = await _db.Patients.AsNoTracking()
            .Where(p => patientIds.Contains(p.Id))
            .Select(p => new { p.Id, p.PatientCode, p.FullName }).ToListAsync();
        var services = await _db.TransportServices.AsNoTracking()
            .Where(t => serviceIds.Contains(t.Id))
            .Select(t => new { t.Id, t.Name }).ToListAsync();
        var deptNames = new Dictionary<Guid, string>();
        if (deptIds.Count > 0)
        {
            deptNames = await _db.Departments.AsNoTracking()
                .Where(d => deptIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => d.DepartmentName);
        }

        var userNames = new Dictionary<Guid, string>();
        if (userIds.Count > 0)
        {
            userNames = await _db.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName);
        }

        return slips.Select(s =>
        {
            var patient = patients.FirstOrDefault(p => p.Id == s.PatientId);
            return new PatientTransportSlipDto
            {
                Id = s.Id,
                SlipCode = s.SlipCode,
                PatientId = s.PatientId,
                PatientCode = patient?.PatientCode,
                PatientName = patient?.FullName,
                MedicalRecordId = s.MedicalRecordId,
                ExaminationId = s.ExaminationId,
                DepartmentId = s.DepartmentId,
                DepartmentName = s.DepartmentId.HasValue && deptNames.TryGetValue(s.DepartmentId.Value, out var deptName)
                    ? deptName
                    : null,
                TransportServiceId = s.TransportServiceId,
                TransportServiceName = services.FirstOrDefault(t => t.Id == s.TransportServiceId)?.Name,
                GasolinePriceId = s.GasolinePriceId,
                FuelType = s.FuelType,
                TransportDate = s.TransportDate,
                FromPlace = s.FromPlace,
                ToPlace = s.ToPlace,
                Reason = s.Reason,
                VehiclePlate = s.VehiclePlate,
                DriverName = s.DriverName,
                EscortStaff = s.EscortStaff,
                DistanceKm = s.DistanceKm,
                CalculationType = s.CalculationType,
                UnitPrice = s.UnitPrice,
                GasolineFactor = s.GasolineFactor,
                FuelPricePerLitre = s.FuelPricePerLitre,
                ServiceAmount = s.ServiceAmount,
                FuelAmount = s.FuelAmount,
                TotalAmount = s.TotalAmount,
                Status = s.Status,
                StatusName = StatusName(s.Status),
                ApprovedByUserId = s.ApprovedByUserId,
                ApprovedByName = s.ApprovedByUserId.HasValue && userNames.TryGetValue(s.ApprovedByUserId.Value, out var approverName)
                    ? approverName
                    : null,
                ApprovedAt = s.ApprovedAt,
                CancelReason = s.CancelReason,
                Note = s.Note,
                CreatedAt = s.CreatedAt
            };
        }).ToList();
    }
}
