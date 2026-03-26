using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class IvfLabService : IIvfLabService
{
    private readonly HISDbContext _context;

    public IvfLabService(HISDbContext context)
    {
        _context = context;
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
        catch { return new List<IvfCoupleDto>(); }
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
        catch { return null; }
    }

    public async Task<IvfCoupleDto> SaveCoupleAsync(SaveIvfCoupleDto dto)
    {
        try
        {
            IvfPatientCouple entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfPatientCouple>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Couple not found");
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
        catch { return new IvfCoupleDto(); }
    }

    // ---- Cycles ----

    public async Task<List<IvfCycleDto>> GetCyclesAsync(Guid coupleId)
    {
        try
        {
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
                    StatusName = CycleStatusNames.GetValueOrDefault(c.Status, ""),
                    Protocol = c.Protocol,
                    DoctorId = c.DoctorId,
                    DoctorName = c.Doctor != null ? c.Doctor.FullName : null,
                    Notes = c.Notes,
                    EmbryoCount = c.Embryos.Count(e => !e.IsDeleted),
                    TransferCount = c.Transfers.Count(t => !t.IsDeleted)
                }).ToListAsync();
        }
        catch { return new List<IvfCycleDto>(); }
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
        catch { return null; }
    }

    public async Task<IvfCycleDto> SaveCycleAsync(SaveIvfCycleDto dto)
    {
        try
        {
            IvfCycle entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfCycle>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Cycle not found");
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
        catch { return new IvfCycleDto(); }
    }

    public async Task<bool> UpdateCycleStatusAsync(Guid id, int status)
    {
        try
        {
            var entity = await _context.Set<IvfCycle>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            entity.Status = status;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch { return false; }
    }

    // ---- OvumPickup ----

    public async Task<IvfOvumPickupDto> SaveOvumPickupAsync(SaveIvfOvumPickupDto dto)
    {
        try
        {
            IvfOvumPickup entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfOvumPickup>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("OvumPickup not found");
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
        catch { return new IvfOvumPickupDto(); }
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
        catch { return null; }
    }

    // ---- Embryos ----

    public async Task<List<IvfEmbryoDto>> GetEmbryosAsync(Guid cycleId)
    {
        try
        {
            return await _context.Set<IvfEmbryo>()
                .Where(e => e.CycleId == cycleId && !e.IsDeleted)
                .OrderBy(e => e.EmbryoCode)
                .Select(e => new IvfEmbryoDto
                {
                    Id = e.Id, CycleId = e.CycleId, EmbryoCode = e.EmbryoCode,
                    Day2Grade = e.Day2Grade, Day3Grade = e.Day3Grade, Day5Grade = e.Day5Grade,
                    Day6Grade = e.Day6Grade, Day7Grade = e.Day7Grade,
                    Status = e.Status, StatusName = EmbryoStatusNames.GetValueOrDefault(e.Status, ""),
                    FreezeDate = e.FreezeDate != null ? e.FreezeDate.Value.ToString("yyyy-MM-dd") : null,
                    ThawDate = e.ThawDate != null ? e.ThawDate.Value.ToString("yyyy-MM-dd") : null,
                    StrawCode = e.StrawCode, StrawColor = e.StrawColor,
                    BoxCode = e.BoxCode, TankCode = e.TankCode, RackPosition = e.RackPosition,
                    Notes = e.Notes, ImageUrl = e.ImageUrl
                }).ToListAsync();
        }
        catch { return new List<IvfEmbryoDto>(); }
    }

    public async Task<IvfEmbryoDto> SaveEmbryoAsync(SaveIvfEmbryoDto dto)
    {
        try
        {
            IvfEmbryo entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfEmbryo>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Embryo not found");
                entity.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
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
        catch { return new IvfEmbryoDto(); }
    }

    public async Task<bool> UpdateEmbryoStatusAsync(Guid id, int status)
    {
        try
        {
            var entity = await _context.Set<IvfEmbryo>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            entity.Status = status;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch { return false; }
    }

    public async Task<bool> FreezeEmbryoAsync(Guid id, FreezeIvfEmbryoDto dto)
    {
        try
        {
            var entity = await _context.Set<IvfEmbryo>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            entity.Status = 3; // Frozen
            entity.FreezeDate = string.IsNullOrEmpty(dto.FreezeDate) ? DateTime.UtcNow : DateTime.Parse(dto.FreezeDate);
            entity.StrawCode = dto.StrawCode;
            entity.StrawColor = dto.StrawColor;
            entity.BoxCode = dto.BoxCode;
            entity.TankCode = dto.TankCode;
            entity.RackPosition = dto.RackPosition;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch { return false; }
    }

    public async Task<bool> ThawEmbryoAsync(Guid id, ThawIvfEmbryoDto dto)
    {
        try
        {
            var entity = await _context.Set<IvfEmbryo>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            entity.Status = 4; // Thawed
            entity.ThawDate = string.IsNullOrEmpty(dto.ThawDate) ? DateTime.UtcNow : DateTime.Parse(dto.ThawDate);
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch { return false; }
    }

    // ---- Transfer ----

    public async Task<IvfTransferDto> SaveTransferAsync(SaveIvfTransferDto dto)
    {
        try
        {
            IvfEmbryoTransfer entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfEmbryoTransfer>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Transfer not found");
                entity.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                entity = new IvfEmbryoTransfer { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
                _context.Set<IvfEmbryoTransfer>().Add(entity);
            }

            entity.CycleId = dto.CycleId;
            entity.TransferDate = string.IsNullOrEmpty(dto.TransferDate) ? DateTime.UtcNow : DateTime.Parse(dto.TransferDate);
            entity.TransferType = dto.TransferType;
            entity.EmbryoCount = dto.EmbryoCount;
            entity.DoctorId = dto.DoctorId;
            entity.EmbryologistId = dto.EmbryologistId;
            entity.Notes = dto.Notes;

            await _context.SaveChangesAsync();
            return new IvfTransferDto
            {
                Id = entity.Id, CycleId = entity.CycleId,
                TransferDate = entity.TransferDate.ToString("yyyy-MM-dd"),
                TransferType = entity.TransferType,
                TransferTypeName = TransferTypeNames.GetValueOrDefault(entity.TransferType, ""),
                EmbryoCount = entity.EmbryoCount, Notes = entity.Notes,
                ResultStatus = entity.ResultStatus,
                ResultStatusName = ResultStatusNames.GetValueOrDefault(entity.ResultStatus, "")
            };
        }
        catch { return new IvfTransferDto(); }
    }

    public async Task<List<IvfTransferDto>> GetTransfersAsync(Guid cycleId)
    {
        try
        {
            return await _context.Set<IvfEmbryoTransfer>()
                .Where(t => t.CycleId == cycleId && !t.IsDeleted)
                .Include(t => t.Doctor)
                .Include(t => t.Embryologist)
                .OrderByDescending(t => t.TransferDate)
                .Select(t => new IvfTransferDto
                {
                    Id = t.Id, CycleId = t.CycleId,
                    TransferDate = t.TransferDate.ToString("yyyy-MM-dd"),
                    TransferType = t.TransferType,
                    TransferTypeName = TransferTypeNames.GetValueOrDefault(t.TransferType, ""),
                    EmbryoCount = t.EmbryoCount,
                    DoctorId = t.DoctorId, DoctorName = t.Doctor != null ? t.Doctor.FullName : null,
                    EmbryologistId = t.EmbryologistId, EmbryologistName = t.Embryologist != null ? t.Embryologist.FullName : null,
                    Notes = t.Notes, ResultStatus = t.ResultStatus,
                    ResultStatusName = ResultStatusNames.GetValueOrDefault(t.ResultStatus, "")
                }).ToListAsync();
        }
        catch { return new List<IvfTransferDto>(); }
    }

    public async Task<bool> UpdateTransferResultAsync(Guid id, int resultStatus)
    {
        try
        {
            var entity = await _context.Set<IvfEmbryoTransfer>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            entity.ResultStatus = resultStatus;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch { return false; }
    }

    // ---- SpermBank ----

    public async Task<List<IvfSpermSampleDto>> GetSpermSamplesAsync(IvfSpermSearchDto? filter = null)
    {
        try
        {
            var query = _context.Set<IvfSpermBank>()
                .Where(s => !s.IsDeleted)
                .Include(s => s.Patient)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter?.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(s =>
                    s.SampleCode.ToLower().Contains(kw) ||
                    (s.Patient != null && s.Patient.FullName.ToLower().Contains(kw)));
            }
            if (filter?.Status.HasValue == true)
                query = query.Where(s => s.Status == filter.Status.Value);

            var pageIndex = filter?.PageIndex ?? 0;
            var pageSize = filter?.PageSize ?? 20;

            return await query.OrderByDescending(s => s.CollectionDate)
                .Skip(pageIndex * pageSize).Take(pageSize)
                .Select(s => new IvfSpermSampleDto
                {
                    Id = s.Id, PatientId = s.PatientId,
                    PatientName = s.Patient != null ? s.Patient.FullName : null,
                    PatientCode = s.Patient != null ? s.Patient.PatientCode : null,
                    SampleCode = s.SampleCode,
                    CollectionDate = s.CollectionDate.ToString("yyyy-MM-dd"),
                    Volume = s.Volume, Concentration = s.Concentration,
                    Motility = s.Motility, Morphology = s.Morphology,
                    StrawCount = s.StrawCount,
                    TankCode = s.TankCode, RackPosition = s.RackPosition, BoxCode = s.BoxCode,
                    Status = s.Status, StatusName = SpermStatusNames.GetValueOrDefault(s.Status, ""),
                    ExpiryDate = s.ExpiryDate.HasValue ? s.ExpiryDate.Value.ToString("yyyy-MM-dd") : null,
                    StorageFee = s.StorageFee, Notes = s.Notes
                }).ToListAsync();
        }
        catch { return new List<IvfSpermSampleDto>(); }
    }

    public async Task<IvfSpermSampleDto> SaveSpermSampleAsync(SaveIvfSpermSampleDto dto)
    {
        try
        {
            IvfSpermBank entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfSpermBank>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Sperm sample not found");
                entity.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                entity = new IvfSpermBank { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, Status = 1 };
                _context.Set<IvfSpermBank>().Add(entity);
            }

            entity.PatientId = dto.PatientId;
            entity.SampleCode = dto.SampleCode;
            entity.CollectionDate = string.IsNullOrEmpty(dto.CollectionDate) ? DateTime.UtcNow : DateTime.Parse(dto.CollectionDate);
            entity.Volume = dto.Volume;
            entity.Concentration = dto.Concentration;
            entity.Motility = dto.Motility;
            entity.Morphology = dto.Morphology;
            entity.StrawCount = dto.StrawCount;
            entity.TankCode = dto.TankCode;
            entity.RackPosition = dto.RackPosition;
            entity.BoxCode = dto.BoxCode;
            entity.ExpiryDate = string.IsNullOrEmpty(dto.ExpiryDate) ? null : DateTime.Parse(dto.ExpiryDate);
            entity.StorageFee = dto.StorageFee;
            entity.Notes = dto.Notes;

            await _context.SaveChangesAsync();
            return new IvfSpermSampleDto
            {
                Id = entity.Id, PatientId = entity.PatientId, SampleCode = entity.SampleCode,
                CollectionDate = entity.CollectionDate.ToString("yyyy-MM-dd"),
                Volume = entity.Volume, Concentration = entity.Concentration,
                Motility = entity.Motility, Morphology = entity.Morphology,
                StrawCount = entity.StrawCount, Status = entity.Status,
                StatusName = SpermStatusNames.GetValueOrDefault(entity.Status, ""),
                StorageFee = entity.StorageFee, Notes = entity.Notes
            };
        }
        catch { return new IvfSpermSampleDto(); }
    }

    public async Task<bool> UpdateSpermStatusAsync(Guid id, int status)
    {
        try
        {
            var entity = await _context.Set<IvfSpermBank>().FindAsync(id);
            if (entity == null || entity.IsDeleted) return false;
            entity.Status = status;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch { return false; }
    }

    public async Task<List<IvfSpermSampleDto>> GetExpiringStorageAsync(int daysAhead = 30)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddDays(daysAhead);
            return await _context.Set<IvfSpermBank>()
                .Where(s => !s.IsDeleted && s.Status == 1 && s.ExpiryDate.HasValue && s.ExpiryDate <= cutoff)
                .Include(s => s.Patient)
                .OrderBy(s => s.ExpiryDate)
                .Select(s => new IvfSpermSampleDto
                {
                    Id = s.Id, PatientId = s.PatientId,
                    PatientName = s.Patient != null ? s.Patient.FullName : null,
                    PatientCode = s.Patient != null ? s.Patient.PatientCode : null,
                    SampleCode = s.SampleCode,
                    CollectionDate = s.CollectionDate.ToString("yyyy-MM-dd"),
                    StrawCount = s.StrawCount, Status = s.Status,
                    StatusName = SpermStatusNames.GetValueOrDefault(s.Status, ""),
                    ExpiryDate = s.ExpiryDate.HasValue ? s.ExpiryDate.Value.ToString("yyyy-MM-dd") : null,
                    StorageFee = s.StorageFee
                }).ToListAsync();
        }
        catch { return new List<IvfSpermSampleDto>(); }
    }

    // ---- Biopsy ----

    public async Task<List<IvfBiopsyDto>> GetBiopsiesAsync(Guid? cycleId = null, Guid? patientId = null)
    {
        try
        {
            var query = _context.Set<IvfBiopsy>().Where(b => !b.IsDeleted).AsQueryable();
            if (cycleId.HasValue)
                query = query.Where(b => b.CycleId == cycleId.Value);
            if (patientId.HasValue)
                query = query.Where(b => b.PatientId == patientId.Value);

            return await query
                .Include(b => b.Patient)
                .OrderByDescending(b => b.SentDate)
                .Select(b => new IvfBiopsyDto
                {
                    Id = b.Id, CycleId = b.CycleId, PatientId = b.PatientId,
                    PatientName = b.Patient != null ? b.Patient.FullName : null,
                    BiopsyLab = b.BiopsyLab,
                    SentDate = b.SentDate.HasValue ? b.SentDate.Value.ToString("yyyy-MM-dd") : null,
                    ResultDate = b.ResultDate.HasValue ? b.ResultDate.Value.ToString("yyyy-MM-dd") : null,
                    Result = b.Result, Notes = b.Notes
                }).ToListAsync();
        }
        catch { return new List<IvfBiopsyDto>(); }
    }

    public async Task<IvfBiopsyDto> SaveBiopsyAsync(SaveIvfBiopsyDto dto)
    {
        try
        {
            IvfBiopsy entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfBiopsy>().FindAsync(dto.Id.Value)
                    ?? throw new Exception("Biopsy not found");
                entity.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                entity = new IvfBiopsy { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
                _context.Set<IvfBiopsy>().Add(entity);
            }

            entity.CycleId = dto.CycleId;
            entity.PatientId = dto.PatientId;
            entity.BiopsyLab = dto.BiopsyLab;
            entity.SentDate = string.IsNullOrEmpty(dto.SentDate) ? null : DateTime.Parse(dto.SentDate);
            entity.ResultDate = string.IsNullOrEmpty(dto.ResultDate) ? null : DateTime.Parse(dto.ResultDate);
            entity.Result = dto.Result;
            entity.Notes = dto.Notes;

            await _context.SaveChangesAsync();
            return new IvfBiopsyDto
            {
                Id = entity.Id, CycleId = entity.CycleId, PatientId = entity.PatientId,
                BiopsyLab = entity.BiopsyLab,
                SentDate = entity.SentDate?.ToString("yyyy-MM-dd"),
                ResultDate = entity.ResultDate?.ToString("yyyy-MM-dd"),
                Result = entity.Result, Notes = entity.Notes
            };
        }
        catch { return new IvfBiopsyDto(); }
    }

    // ---- Dashboard & Reports ----

    public async Task<IvfDashboardDto> GetIvfDashboardAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1);

            var activeCycles = await _context.Set<IvfCycle>().CountAsync(c => !c.IsDeleted && c.Status >= 1 && c.Status <= 5);
            var frozenEmbryos = await _context.Set<IvfEmbryo>().CountAsync(e => !e.IsDeleted && e.Status == 3);
            var spermSamples = await _context.Set<IvfSpermBank>().CountAsync(s => !s.IsDeleted && s.Status == 1);
            var transfersThisMonth = await _context.Set<IvfEmbryoTransfer>().CountAsync(t => !t.IsDeleted && t.TransferDate >= monthStart);
            var totalCouples = await _context.Set<IvfPatientCouple>().CountAsync(c => !c.IsDeleted);
            var completedCycles = await _context.Set<IvfCycle>().CountAsync(c => !c.IsDeleted && c.Status == 6);

            // Success rate = positive transfers / total transfers with results
            var totalWithResult = await _context.Set<IvfEmbryoTransfer>().CountAsync(t => !t.IsDeleted && t.ResultStatus > 0);
            var positive = await _context.Set<IvfEmbryoTransfer>().CountAsync(t => !t.IsDeleted && t.ResultStatus == 1);
            var successRate = totalWithResult > 0 ? Math.Round((decimal)positive / totalWithResult * 100, 1) : 0;

            return new IvfDashboardDto
            {
                ActiveCycles = activeCycles,
                FrozenEmbryos = frozenEmbryos,
                SpermSamples = spermSamples,
                TransfersThisMonth = transfersThisMonth,
                SuccessRate = successRate,
                TotalCouples = totalCouples,
                CompletedCycles = completedCycles
            };
        }
        catch { return new IvfDashboardDto(); }
    }

    public async Task<IvfDailyReportDto> GetDailyReportAsync(string? date = null)
    {
        try
        {
            var reportDate = string.IsNullOrEmpty(date) ? DateTime.UtcNow.Date : DateTime.Parse(date).Date;
            var nextDay = reportDate.AddDays(1);
            var items = new List<IvfDailyReportItemDto>();

            var newCycles = await _context.Set<IvfCycle>().CountAsync(c => !c.IsDeleted && c.CreatedAt >= reportDate && c.CreatedAt < nextDay);
            if (newCycles > 0) items.Add(new IvfDailyReportItemDto { ActivityType = "Chu ky moi", Count = newCycles });

            var pickups = await _context.Set<IvfOvumPickup>().CountAsync(o => !o.IsDeleted && o.PickupDate >= reportDate && o.PickupDate < nextDay);
            if (pickups > 0) items.Add(new IvfDailyReportItemDto { ActivityType = "Choc trung (OPU)", Count = pickups });

            var transfers = await _context.Set<IvfEmbryoTransfer>().CountAsync(t => !t.IsDeleted && t.TransferDate >= reportDate && t.TransferDate < nextDay);
            if (transfers > 0) items.Add(new IvfDailyReportItemDto { ActivityType = "Chuyen phoi", Count = transfers });

            var frozen = await _context.Set<IvfEmbryo>().CountAsync(e => !e.IsDeleted && e.FreezeDate.HasValue && e.FreezeDate >= reportDate && e.FreezeDate < nextDay);
            if (frozen > 0) items.Add(new IvfDailyReportItemDto { ActivityType = "Dong lanh phoi", Count = frozen });

            var thawed = await _context.Set<IvfEmbryo>().CountAsync(e => !e.IsDeleted && e.ThawDate.HasValue && e.ThawDate >= reportDate && e.ThawDate < nextDay);
            if (thawed > 0) items.Add(new IvfDailyReportItemDto { ActivityType = "Ra dong phoi", Count = thawed });

            var sperm = await _context.Set<IvfSpermBank>().CountAsync(s => !s.IsDeleted && s.CreatedAt >= reportDate && s.CreatedAt < nextDay);
            if (sperm > 0) items.Add(new IvfDailyReportItemDto { ActivityType = "Tinh trung luu tru", Count = sperm });

            return new IvfDailyReportDto { Date = reportDate.ToString("yyyy-MM-dd"), Items = items };
        }
        catch { return new IvfDailyReportDto { Date = date }; }
    }
}
