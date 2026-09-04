using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K-wave5: tach tu IvfLabService.cs — Transfer/SpermBank/Biopsy/Dashboard & Reports (~355 dong).
public partial class IvfLabService
{
    // ---- Transfer ----

    public async Task<IvfTransferDto> SaveTransferAsync(SaveIvfTransferDto dto)
    {
        try
        {
            IvfEmbryoTransfer entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfEmbryoTransfer>().FindAsync(dto.Id.Value)
                    ?? throw new KeyNotFoundException("Transfer not found");
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
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new IvfTransferDto(); }
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
                }).ToBoundedListAsync("IvfLab.GetTransfers");
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new List<IvfTransferDto>(); }
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
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return false; }
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
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new List<IvfSpermSampleDto>(); }
    }

    public async Task<IvfSpermSampleDto> SaveSpermSampleAsync(SaveIvfSpermSampleDto dto)
    {
        try
        {
            IvfSpermBank entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfSpermBank>().FindAsync(dto.Id.Value)
                    ?? throw new KeyNotFoundException("Sperm sample not found");
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
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new IvfSpermSampleDto(); }
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
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return false; }
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
                }).ToBoundedListAsync("IvfLab.GetExpiringStorage");
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new List<IvfSpermSampleDto>(); }
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
                }).ToBoundedListAsync("IvfLab.GetBiopsies");
        }
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new List<IvfBiopsyDto>(); }
    }

    public async Task<IvfBiopsyDto> SaveBiopsyAsync(SaveIvfBiopsyDto dto)
    {
        try
        {
            IvfBiopsy entity;
            if (dto.Id.HasValue && dto.Id != Guid.Empty)
            {
                entity = await _context.Set<IvfBiopsy>().FindAsync(dto.Id.Value)
                    ?? throw new KeyNotFoundException("Biopsy not found");
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
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new IvfBiopsyDto(); }
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
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new IvfDashboardDto(); }
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
        catch (Exception ex) { _logger.LogWarning(ex, "IvfLabService thao tác thất bại, trả giá trị mặc định"); return new IvfDailyReportDto { Date = date }; }
    }
}
