using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K-wave5: tach Transfer/SpermBank/Biopsy/Dashboard sang IvfLabService.Transfers.cs (~355 dong).
public partial class IvfLabService : IIvfLabService
{
    private readonly HISDbContext _context;
    private readonly ILogger<IvfLabService> _logger;

    public IvfLabService(HISDbContext context, ILogger<IvfLabService> logger)
    {
        _context = context;
        _logger = logger;
    }

    private static readonly Dictionary<int, string> CycleStatusNames = new()
    {
        { 1, "Đang hoạt động" }, { 2, "Chọc trứng" }, { 3, "Thụ tinh" },
        { 4, "Chuyển phôi" }, { 5, "Trữ đông" }, { 6, "Hoàn thành" }, { 7, "Hủy" }
    };

    private static readonly Dictionary<int, string> EmbryoStatusNames = new()
    {
        { 1, "Nuôi cấy" }, { 2, "Chuyển tươi" }, { 3, "Đông lạnh" },
        { 4, "Rã đông" }, { 5, "Đã chuyển" }, { 6, "Hủy bỏ" }
    };

    // Manual embryo status changes (freeze/thaw have their own endpoints). 5=Transferred and 6=Discarded are terminal.
    private static readonly Dictionary<int, HashSet<int>> EmbryoStatusTransitions = new()
    {
        { 1, new() { 2, 5, 6 } }, { 2, new() { 1, 5, 6 } }, { 3, new() { 6 } },
        { 4, new() { 5, 6 } }, { 5, new() }, { 6, new() }
    };

    private static readonly Dictionary<int, string> SpermStatusNames = new()
    {
        { 1, "Lưu trữ" }, { 2, "Đã sử dụng" }, { 3, "Đã hủy" }
    };

    private static readonly Dictionary<int, string> TransferTypeNames = new()
    {
        { 1, "Phôi tươi" }, { 2, "Phôi đông" }
    };

    private static readonly Dictionary<int, string> ResultStatusNames = new()
    {
        { 0, "Chờ kết quả" }, { 1, "Dương tính" }, { 2, "Âm tính" }
    };

    // ---- Couples ----

    public async Task<List<IvfCoupleDto>> GetCouplesAsync(IvfCoupleSearchDto? filter = null)
    {
        try
        {
            var query = _context.Set<IvfPatientCouple>()
                .Where(c => !c.IsDeleted)
                .Include(c => c.WifePatient)
                .Include(c => c.HusbandPatient)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter?.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(c =>
                    (c.WifePatient != null && c.WifePatient.FullName.ToLower().Contains(kw)) ||
                    (c.HusbandPatient != null && c.HusbandPatient.FullName.ToLower().Contains(kw)) ||
                    (c.InfertilityCause != null && c.InfertilityCause.ToLower().Contains(kw)));
            }

            var pageIndex = filter?.PageIndex ?? 0;
            var pageSize = filter?.PageSize ?? 20;

            return await query.OrderByDescending(c => c.CreatedAt)
                .Skip(pageIndex * pageSize).Take(pageSize)
                .Select(c => new IvfCoupleDto
                {
                    Id = c.Id,
                    WifePatientId = c.WifePatientId,
                    WifeName = c.WifePatient != null ? c.WifePatient.FullName : null,
                    WifeCode = c.WifePatient != null ? c.WifePatient.PatientCode : null,
                    WifeDob = c.WifePatient != null ? c.WifePatient.DateOfBirth.ToString() : null,
                    HusbandPatientId = c.HusbandPatientId,
                    HusbandName = c.HusbandPatient != null ? c.HusbandPatient.FullName : null,
                    HusbandCode = c.HusbandPatient != null ? c.HusbandPatient.PatientCode : null,
                    HusbandDob = c.HusbandPatient != null ? c.HusbandPatient.DateOfBirth.ToString() : null,
                    InfertilityDurationMonths = c.InfertilityDurationMonths,
                    InfertilityCause = c.InfertilityCause,
                    MarriageDate = c.MarriageDate.HasValue ? c.MarriageDate.Value.ToString("yyyy-MM-dd") : null,
                    Notes = c.Notes,
                    CycleCount = c.Cycles.Count(cy => !cy.IsDeleted)
                }).ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new List<IvfCoupleDto>(); }
    }

    public async Task<IvfCoupleDetailDto?> GetCoupleByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.Set<IvfPatientCouple>()
                .Where(x => x.Id == id && !x.IsDeleted)
                .Include(x => x.WifePatient)
                .Include(x => x.HusbandPatient)
                .Include(x => x.Cycles.Where(cy => !cy.IsDeleted))
                    .ThenInclude(cy => cy.Doctor)
                .FirstOrDefaultAsync();

            if (c == null) return null;

            return new IvfCoupleDetailDto
            {
                Id = c.Id,
                WifePatientId = c.WifePatientId,
                WifeName = c.WifePatient?.FullName,
                WifeCode = c.WifePatient?.PatientCode,
                WifeDob = c.WifePatient != null ? c.WifePatient.DateOfBirth.ToString() : null,
                HusbandPatientId = c.HusbandPatientId,
                HusbandName = c.HusbandPatient?.FullName,
                HusbandCode = c.HusbandPatient?.PatientCode,
                HusbandDob = c.HusbandPatient != null ? c.HusbandPatient.DateOfBirth.ToString() : null,
                InfertilityDurationMonths = c.InfertilityDurationMonths,
                InfertilityCause = c.InfertilityCause,
                MarriageDate = c.MarriageDate?.ToString("yyyy-MM-dd"),
                Notes = c.Notes,
                CycleCount = c.Cycles.Count,
                Cycles = c.Cycles.OrderByDescending(cy => cy.CycleNumber).Select(cy => new IvfCycleDto
                {
                    Id = cy.Id,
                    CoupleId = cy.CoupleId,
                    CycleNumber = cy.CycleNumber,
                    StartDate = cy.StartDate.ToString("yyyy-MM-dd"),
                    Status = cy.Status,
                    StatusName = CycleStatusNames.GetValueOrDefault(cy.Status, ""),
                    Protocol = cy.Protocol,
                    DoctorId = cy.DoctorId,
                    DoctorName = cy.Doctor?.FullName,
                    Notes = cy.Notes,
                    EmbryoCount = cy.Embryos.Count(e => !e.IsDeleted),
                    TransferCount = cy.Transfers.Count(t => !t.IsDeleted)
                }).ToList()
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return null; }
    }

    public async Task<IvfCoupleDto> SaveCoupleAsync(SaveIvfCoupleDto dto)
    {
        try
        {
            if (dto.WifePatientId == dto.HusbandPatientId)
                throw new ArgumentException("Vợ và chồng không thể là cùng một người bệnh");
            var patientCount = await _context.Patients.CountAsync(p => (p.Id == dto.WifePatientId || p.Id == dto.HusbandPatientId) && !p.IsDeleted);
            if (patientCount < 2)
                throw new KeyNotFoundException("Không tìm thấy hồ sơ người bệnh của vợ hoặc chồng");

            IvfPatientCouple entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfPatientCouple>().FindAsync(dto.Id.Value)
                    ?? throw new KeyNotFoundException("Couple not found");
                // Chain of custody: once a couple has cycles (oocytes/embryos/straws), swapping the wife or
                // husband re-assigns every embryo of that couple to different people (wrong-couple linkage).
                if ((entity.WifePatientId != dto.WifePatientId || entity.HusbandPatientId != dto.HusbandPatientId)
                    && await _context.Set<IvfCycle>().AnyAsync(c => c.CoupleId == entity.Id && !c.IsDeleted))
                    throw new InvalidOperationException("Cặp đôi đã có chu kỳ IVF — không được đổi người vợ/chồng. Hãy đăng ký cặp đôi mới.");
                entity.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                entity = new IvfPatientCouple { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
                _context.Set<IvfPatientCouple>().Add(entity);
            }

            entity.WifePatientId = dto.WifePatientId;
            entity.HusbandPatientId = dto.HusbandPatientId;
            entity.InfertilityDurationMonths = dto.InfertilityDurationMonths;
            entity.InfertilityCause = dto.InfertilityCause;
            entity.MarriageDate = string.IsNullOrEmpty(dto.MarriageDate) ? null : DateTime.Parse(dto.MarriageDate);
            entity.Notes = dto.Notes;

            await _context.SaveChangesAsync();
            return new IvfCoupleDto { Id = entity.Id, WifePatientId = entity.WifePatientId, HusbandPatientId = entity.HusbandPatientId, InfertilityDurationMonths = entity.InfertilityDurationMonths, InfertilityCause = entity.InfertilityCause, Notes = entity.Notes };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService write failed"); throw; }
    }

    // ---- Cycles ----

    public async Task<List<IvfCycleDto>> GetCyclesAsync(Guid coupleId)
    {
        try
        {
            // Local copy: EF Core rejects a static Dictionary constant inside a server projection.
            var cycleStatusNames = CycleStatusNames;
            return await _context.Set<IvfCycle>()
                .Where(c => c.CoupleId == coupleId && !c.IsDeleted)
                .Include(c => c.Doctor)
                .OrderByDescending(c => c.CycleNumber)
                .Select(c => new IvfCycleDto
                {
                    Id = c.Id,
                    CoupleId = c.CoupleId,
                    CycleNumber = c.CycleNumber,
                    StartDate = c.StartDate.ToString("yyyy-MM-dd"),
                    Status = c.Status,
                    StatusName = cycleStatusNames.GetValueOrDefault(c.Status, ""),
                    Protocol = c.Protocol,
                    DoctorId = c.DoctorId,
                    DoctorName = c.Doctor != null ? c.Doctor.FullName : null,
                    Notes = c.Notes,
                    EmbryoCount = c.Embryos.Count(e => !e.IsDeleted),
                    TransferCount = c.Transfers.Count(t => !t.IsDeleted)
                }).ToBoundedListAsync("IvfLab.GetCycles");
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new List<IvfCycleDto>(); }
    }

    public async Task<IvfCycleDetailDto?> GetCycleByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.Set<IvfCycle>()
                .Where(x => x.Id == id && !x.IsDeleted)
                .Include(x => x.Doctor)
                .Include(x => x.OvumPickup)
                .Include(x => x.Embryos.Where(e => !e.IsDeleted))
                .Include(x => x.Transfers.Where(t => !t.IsDeleted))
                    .ThenInclude(t => t.Doctor)
                .Include(x => x.Transfers.Where(t => !t.IsDeleted))
                    .ThenInclude(t => t.Embryologist)
                .Include(x => x.Biopsies.Where(b => !b.IsDeleted))
                .FirstOrDefaultAsync();

            if (c == null) return null;

            return new IvfCycleDetailDto
            {
                Id = c.Id,
                CoupleId = c.CoupleId,
                CycleNumber = c.CycleNumber,
                StartDate = c.StartDate.ToString("yyyy-MM-dd"),
                Status = c.Status,
                StatusName = CycleStatusNames.GetValueOrDefault(c.Status, ""),
                Protocol = c.Protocol,
                DoctorId = c.DoctorId,
                DoctorName = c.Doctor?.FullName,
                Notes = c.Notes,
                EmbryoCount = c.Embryos.Count,
                TransferCount = c.Transfers.Count,
                OvumPickup = c.OvumPickup != null && !c.OvumPickup.IsDeleted ? new IvfOvumPickupDto
                {
                    Id = c.OvumPickup.Id,
                    CycleId = c.OvumPickup.CycleId,
                    PickupDate = c.OvumPickup.PickupDate.ToString("yyyy-MM-dd"),
                    TotalOvums = c.OvumPickup.TotalOvums,
                    MatureOvums = c.OvumPickup.MatureOvums,
                    ImmatureOvums = c.OvumPickup.ImmatureOvums,
                    DegeneratedOvums = c.OvumPickup.DegeneratedOvums,
                    PerformedById = c.OvumPickup.PerformedById,
                    Notes = c.OvumPickup.Notes
                } : null,
                Embryos = c.Embryos.OrderBy(e => e.EmbryoCode).Select(e => new IvfEmbryoDto
                {
                    Id = e.Id, CycleId = e.CycleId, EmbryoCode = e.EmbryoCode,
                    Day2Grade = e.Day2Grade, Day3Grade = e.Day3Grade, Day5Grade = e.Day5Grade,
                    Day6Grade = e.Day6Grade, Day7Grade = e.Day7Grade,
                    Status = e.Status, StatusName = EmbryoStatusNames.GetValueOrDefault(e.Status, ""),
                    FreezeDate = e.FreezeDate?.ToString("yyyy-MM-dd"),
                    ThawDate = e.ThawDate?.ToString("yyyy-MM-dd"),
                    StrawCode = e.StrawCode, StrawColor = e.StrawColor,
                    BoxCode = e.BoxCode, TankCode = e.TankCode, RackPosition = e.RackPosition,
                    Notes = e.Notes, ImageUrl = e.ImageUrl
                }).ToList(),
                Transfers = c.Transfers.OrderByDescending(t => t.TransferDate).Select(t => new IvfTransferDto
                {
                    Id = t.Id, CycleId = t.CycleId,
                    TransferDate = t.TransferDate.ToString("yyyy-MM-dd"),
                    TransferType = t.TransferType,
                    TransferTypeName = TransferTypeNames.GetValueOrDefault(t.TransferType, ""),
                    EmbryoCount = t.EmbryoCount,
                    DoctorId = t.DoctorId, DoctorName = t.Doctor?.FullName,
                    EmbryologistId = t.EmbryologistId, EmbryologistName = t.Embryologist?.FullName,
                    Notes = t.Notes, ResultStatus = t.ResultStatus,
                    ResultStatusName = ResultStatusNames.GetValueOrDefault(t.ResultStatus, "")
                }).ToList(),
                Biopsies = c.Biopsies.OrderByDescending(b => b.SentDate).Select(b => new IvfBiopsyDto
                {
                    Id = b.Id, CycleId = b.CycleId, PatientId = b.PatientId,
                    BiopsyLab = b.BiopsyLab,
                    SentDate = b.SentDate?.ToString("yyyy-MM-dd"),
                    ResultDate = b.ResultDate?.ToString("yyyy-MM-dd"),
                    Result = b.Result, Notes = b.Notes
                }).ToList()
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return null; }
    }

    public async Task<IvfCycleDto> SaveCycleAsync(SaveIvfCycleDto dto)
    {
        try
        {
            if (!await _context.Set<IvfPatientCouple>().AnyAsync(c => c.Id == dto.CoupleId && !c.IsDeleted))
                throw new KeyNotFoundException("Không tìm thấy cặp đôi IVF");

            IvfCycle entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfCycle>().FindAsync(dto.Id.Value)
                    ?? throw new KeyNotFoundException("Cycle not found");
                // Moving a cycle to another couple would carry its oocytes/embryos to the wrong couple.
                if (entity.CoupleId != dto.CoupleId)
                    throw new InvalidOperationException("Không được chuyển chu kỳ IVF sang cặp đôi khác");
                entity.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                entity = new IvfCycle { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, Status = 1 };
                _context.Set<IvfCycle>().Add(entity);
            }

            entity.CoupleId = dto.CoupleId;
            entity.CycleNumber = dto.CycleNumber;
            entity.StartDate = string.IsNullOrEmpty(dto.StartDate) ? DateTime.UtcNow : DateTime.Parse(dto.StartDate);
            entity.Protocol = dto.Protocol;
            entity.DoctorId = dto.DoctorId;
            entity.Notes = dto.Notes;

            await _context.SaveChangesAsync();
            return new IvfCycleDto
            {
                Id = entity.Id, CoupleId = entity.CoupleId, CycleNumber = entity.CycleNumber,
                StartDate = entity.StartDate.ToString("yyyy-MM-dd"), Status = entity.Status,
                StatusName = CycleStatusNames.GetValueOrDefault(entity.Status, ""),
                Protocol = entity.Protocol, Notes = entity.Notes
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService write failed"); throw; }
    }

    public async Task<bool> UpdateCycleStatusAsync(Guid id, int status)
    {
        try
        {
            var entity = await _context.Set<IvfCycle>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            if (!CycleStatusNames.ContainsKey(status))
                throw new ArgumentException($"Trạng thái chu kỳ không hợp lệ: {status}");
            if ((entity.Status == 6 || entity.Status == 7) && status != entity.Status)
                throw new InvalidOperationException($"Chu kỳ đã {CycleStatusNames[entity.Status].ToLower()} — không đổi trạng thái được nữa");
            entity.Status = status;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService write failed"); throw; }
    }

    // ---- OvumPickup ----

    public async Task<IvfOvumPickupDto> SaveOvumPickupAsync(SaveIvfOvumPickupDto dto)
    {
        try
        {
            if (dto.TotalOvums < 0 || dto.MatureOvums < 0 || dto.ImmatureOvums < 0 || dto.DegeneratedOvums < 0)
                throw new ArgumentException("Số noãn không được âm");
            if (dto.MatureOvums + dto.ImmatureOvums + dto.DegeneratedOvums > dto.TotalOvums)
                throw new ArgumentException("Tổng noãn trưởng thành + chưa trưởng thành + thoái hóa vượt quá tổng số noãn chọc được");
            if (!await _context.Set<IvfCycle>().AnyAsync(c => c.Id == dto.CycleId && !c.IsDeleted))
                throw new KeyNotFoundException("Không tìm thấy chu kỳ IVF");

            IvfOvumPickup entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfOvumPickup>().FindAsync(dto.Id.Value)
                    ?? throw new KeyNotFoundException("OvumPickup not found");
                if (entity.CycleId != dto.CycleId)
                    throw new InvalidOperationException("Không được chuyển kết quả chọc noãn sang chu kỳ khác");
                entity.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                entity = new IvfOvumPickup { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
                _context.Set<IvfOvumPickup>().Add(entity);
            }

            entity.CycleId = dto.CycleId;
            entity.PickupDate = string.IsNullOrEmpty(dto.PickupDate) ? DateTime.UtcNow : DateTime.Parse(dto.PickupDate);
            entity.TotalOvums = dto.TotalOvums;
            entity.MatureOvums = dto.MatureOvums;
            entity.ImmatureOvums = dto.ImmatureOvums;
            entity.DegeneratedOvums = dto.DegeneratedOvums;
            entity.PerformedById = dto.PerformedById;
            entity.Notes = dto.Notes;

            await _context.SaveChangesAsync();
            return new IvfOvumPickupDto
            {
                Id = entity.Id, CycleId = entity.CycleId,
                PickupDate = entity.PickupDate.ToString("yyyy-MM-dd"),
                TotalOvums = entity.TotalOvums, MatureOvums = entity.MatureOvums,
                ImmatureOvums = entity.ImmatureOvums, DegeneratedOvums = entity.DegeneratedOvums,
                PerformedById = entity.PerformedById, Notes = entity.Notes
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService write failed"); throw; }
    }

    public async Task<IvfOvumPickupDto?> GetOvumPickupAsync(Guid cycleId)
    {
        try
        {
            var e = await _context.Set<IvfOvumPickup>()
                .Where(o => o.CycleId == cycleId && !o.IsDeleted)
                .Include(o => o.PerformedBy)
                .FirstOrDefaultAsync();

            if (e == null) return null;
            return new IvfOvumPickupDto
            {
                Id = e.Id, CycleId = e.CycleId,
                PickupDate = e.PickupDate.ToString("yyyy-MM-dd"),
                TotalOvums = e.TotalOvums, MatureOvums = e.MatureOvums,
                ImmatureOvums = e.ImmatureOvums, DegeneratedOvums = e.DegeneratedOvums,
                PerformedById = e.PerformedById,
                PerformedByName = e.PerformedBy?.FullName,
                Notes = e.Notes
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return null; }
    }

    // ---- Embryos ----

    public async Task<List<IvfEmbryoDto>> GetEmbryosAsync(Guid cycleId)
    {
        try
        {
            var embryoStatusNames = EmbryoStatusNames;
            return await _context.Set<IvfEmbryo>()
                .Where(e => e.CycleId == cycleId && !e.IsDeleted)
                .OrderBy(e => e.EmbryoCode)
                .Select(e => new IvfEmbryoDto
                {
                    Id = e.Id, CycleId = e.CycleId, EmbryoCode = e.EmbryoCode,
                    Day2Grade = e.Day2Grade, Day3Grade = e.Day3Grade, Day5Grade = e.Day5Grade,
                    Day6Grade = e.Day6Grade, Day7Grade = e.Day7Grade,
                    Status = e.Status, StatusName = embryoStatusNames.GetValueOrDefault(e.Status, ""),
                    FreezeDate = e.FreezeDate != null ? e.FreezeDate.Value.ToString("yyyy-MM-dd") : null,
                    ThawDate = e.ThawDate != null ? e.ThawDate.Value.ToString("yyyy-MM-dd") : null,
                    StrawCode = e.StrawCode, StrawColor = e.StrawColor,
                    BoxCode = e.BoxCode, TankCode = e.TankCode, RackPosition = e.RackPosition,
                    Notes = e.Notes, ImageUrl = e.ImageUrl
                }).ToBoundedListAsync("IvfLab.GetEmbryos");
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new List<IvfEmbryoDto>(); }
    }

    public async Task<IvfEmbryoDto> SaveEmbryoAsync(SaveIvfEmbryoDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.EmbryoCode))
                throw new ArgumentException("Phải nhập mã phôi");
            var cycle = await _context.Set<IvfCycle>().FirstOrDefaultAsync(c => c.Id == dto.CycleId && !c.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy chu kỳ IVF");

            IvfEmbryo entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfEmbryo>().FindAsync(dto.Id.Value)
                    ?? throw new KeyNotFoundException("Embryo not found");
                // Chain of custody: re-pointing an existing embryo to another cycle hands it to another couple.
                if (entity.CycleId != dto.CycleId)
                    throw new InvalidOperationException("Không được chuyển phôi sang chu kỳ/cặp đôi khác");
                entity.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                if (cycle.Status == 7)
                    throw new InvalidOperationException("Chu kỳ IVF đã hủy — không thêm phôi được");
                entity = new IvfEmbryo { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, Status = 1 };
                _context.Set<IvfEmbryo>().Add(entity);
            }

            entity.CycleId = dto.CycleId;
            entity.EmbryoCode = dto.EmbryoCode;
            entity.Day2Grade = dto.Day2Grade;
            entity.Day3Grade = dto.Day3Grade;
            entity.Day5Grade = dto.Day5Grade;
            entity.Day6Grade = dto.Day6Grade;
            entity.Day7Grade = dto.Day7Grade;
            entity.Notes = dto.Notes;
            entity.ImageUrl = dto.ImageUrl;

            await _context.SaveChangesAsync();
            return new IvfEmbryoDto
            {
                Id = entity.Id, CycleId = entity.CycleId, EmbryoCode = entity.EmbryoCode,
                Day2Grade = entity.Day2Grade, Day3Grade = entity.Day3Grade,
                Day5Grade = entity.Day5Grade, Day6Grade = entity.Day6Grade, Day7Grade = entity.Day7Grade,
                Status = entity.Status, StatusName = EmbryoStatusNames.GetValueOrDefault(entity.Status, ""),
                Notes = entity.Notes, ImageUrl = entity.ImageUrl
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService write failed"); throw; }
    }

    public async Task<bool> UpdateEmbryoStatusAsync(Guid id, int status)
    {
        try
        {
            var entity = await _context.Set<IvfEmbryo>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            if (!EmbryoStatusNames.ContainsKey(status))
                throw new ArgumentException($"Trạng thái phôi không hợp lệ: {status}");
            if (status == 3 || status == 4)
                throw new InvalidOperationException("Trữ đông / rã đông phôi phải dùng thao tác Đông lạnh / Rã đông (ghi vị trí ống, ngày)");
            if (status != entity.Status
                && !(EmbryoStatusTransitions.TryGetValue(entity.Status, out var nextStatuses) && nextStatuses.Contains(status)))
                throw new InvalidOperationException(
                    $"Không chuyển phôi từ '{EmbryoStatusNames.GetValueOrDefault(entity.Status, entity.Status.ToString())}' sang '{EmbryoStatusNames[status]}'");
            entity.Status = status;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService write failed"); throw; }
    }

    public async Task<bool> FreezeEmbryoAsync(Guid id, FreezeIvfEmbryoDto dto)
    {
        try
        {
            var entity = await _context.Set<IvfEmbryo>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            // Only an embryo still in the lab (culture / selected-fresh / thawed) can be vitrified. Re-freezing a
            // frozen embryo overwrote its straw location; freezing a transferred/discarded one resurrected it.
            if (entity.Status != 1 && entity.Status != 2 && entity.Status != 4)
                throw new InvalidOperationException(
                    $"Phôi đang ở trạng thái '{EmbryoStatusNames.GetValueOrDefault(entity.Status, entity.Status.ToString())}' — không đông lạnh được");
            if (string.IsNullOrWhiteSpace(dto.StrawCode))
                throw new ArgumentException("Phải nhập mã ống (straw) khi đông lạnh phôi");
            var strawCode = dto.StrawCode.Trim();
            // Same straw (in the same tank) already holding a frozen embryo of ANOTHER cycle = two couples in one straw.
            if (await _context.Set<IvfEmbryo>().AnyAsync(e => e.Id != id && !e.IsDeleted && e.Status == 3
                    && e.CycleId != entity.CycleId && e.StrawCode == strawCode && e.TankCode == dto.TankCode))
                throw new InvalidOperationException($"Ống '{strawCode}' đang chứa phôi đông lạnh của chu kỳ/cặp đôi khác");
            entity.Status = 3; // Frozen
            entity.FreezeDate = string.IsNullOrEmpty(dto.FreezeDate) ? DateTime.UtcNow : DateTime.Parse(dto.FreezeDate);
            entity.StrawCode = strawCode;
            entity.StrawColor = dto.StrawColor;
            entity.BoxCode = dto.BoxCode;
            entity.TankCode = dto.TankCode;
            entity.RackPosition = dto.RackPosition;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService write failed"); throw; }
    }

    public async Task<bool> ThawEmbryoAsync(Guid id, ThawIvfEmbryoDto dto)
    {
        try
        {
            var entity = await _context.Set<IvfEmbryo>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            // Only a FROZEN straw can be thawed: thawing an already-thawed / transferred / discarded embryo
            // made a used straw look available again.
            if (entity.Status != 3)
                throw new InvalidOperationException(
                    $"Phôi đang ở trạng thái '{EmbryoStatusNames.GetValueOrDefault(entity.Status, entity.Status.ToString())}' — chỉ rã đông được phôi đang đông lạnh");
            var thawDate = string.IsNullOrEmpty(dto.ThawDate) ? DateTime.UtcNow : DateTime.Parse(dto.ThawDate);
            if (entity.FreezeDate.HasValue && thawDate.Date < entity.FreezeDate.Value.Date)
                throw new ArgumentException("Ngày rã đông không được trước ngày đông lạnh");
            entity.Status = 4; // Thawed
            entity.ThawDate = thawDate;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService write failed"); throw; }
    }
}
