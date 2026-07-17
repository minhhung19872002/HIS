using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

// K3 phien 1 (2026-05-30): tach RIS Module 8 (5 region 8.1+8.2+8.3+8.4+8.5, ~1730 dong)
// khoi RISCompleteService.cs god-file (5679 dong). ZERO runtime change â€" partial class.
// Ctor + 13 DI deps + PACS config o file goc.
public partial class RISCompleteService
{
    #region 8.4 Prescriptions (Ke thuoc, vat tu)

    public async Task<List<RadiologyPrescriptionDto>> GetRadiologyPrescriptionsAsync(Guid orderItemId)
    {
        return await Task.FromResult(new List<RadiologyPrescriptionDto>());
    }

    public async Task<RadiologyPrescriptionDto> CreateRadiologyPrescriptionAsync(CreateRadiologyPrescriptionDto dto)
    {
        return new RadiologyPrescriptionDto
        {
            Id = Guid.NewGuid(),
            OrderItemId = dto.OrderItemId,
            PrescriptionDate = DateTime.Now,
            Items = dto.Items.Select(i => new RadiologyPrescriptionItemDto
            {
                Id = Guid.NewGuid(),
                ItemId = i.ItemId,
                Quantity = i.Quantity,
                Note = i.Note
            }).ToList(),
            Status = "Created",
            TotalAmount = 0
        };
    }

    public async Task<RadiologyPrescriptionDto> UpdateRadiologyPrescriptionAsync(Guid prescriptionId, UpdateRadiologyPrescriptionDto dto)
    {
        return new RadiologyPrescriptionDto
        {
            Id = prescriptionId,
            PrescriptionDate = DateTime.Now,
            Items = dto.Items.Select(i => new RadiologyPrescriptionItemDto
            {
                Id = Guid.NewGuid(),
                ItemId = i.ItemId,
                Quantity = i.Quantity
            }).ToList(),
            Status = "Updated"
        };
    }

    public async Task<bool> DeleteRadiologyPrescriptionAsync(Guid prescriptionId)
    {
        return await Task.FromResult(true);
    }

    public async Task<RadiologyPrescriptionDto> CreatePrescriptionFromNormAsync(Guid orderItemId, Guid warehouseId)
    {
        return new RadiologyPrescriptionDto
        {
            Id = Guid.NewGuid(),
            OrderItemId = orderItemId,
            PrescriptionDate = DateTime.Now,
            Items = new List<RadiologyPrescriptionItemDto>(),
            Status = "FromNorm"
        };
    }

    public async Task<RadiologyServiceNormDto> GetServiceNormAsync(Guid serviceId)
    {
        return new RadiologyServiceNormDto
        {
            Id = Guid.NewGuid(),
            ServiceId = serviceId,
            Items = new List<RadiologyNormItemDto>()
        };
    }

    public async Task<bool> UpdateServiceNormAsync(Guid serviceId, List<UpdateNormItemDto> items)
    {
        return await Task.FromResult(true);
    }

    public async Task<List<ItemSearchResultDto>> SearchItemsAsync(string keyword, Guid warehouseId, string itemType = null)
    {
        return await Task.FromResult(new List<ItemSearchResultDto>());
    }

    public async Task<ItemStockDto> CheckItemStockAsync(Guid itemId, Guid warehouseId)
    {
        return new ItemStockDto
        {
            ItemId = itemId,
            TotalStock = 0,
            AvailableStock = 0,
            ByLot = new List<ItemStockByLotDto>()
        };
    }

    #endregion

    #region 8.5 Reports

    public async Task<RadiologyRevenueReportDto> GetRevenueReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? departmentId = null,
        string serviceType = null)
    {
        var requests = await _context.RadiologyRequests
            .Where(r => r.RequestDate >= fromDate && r.RequestDate <= toDate)
            .ToListAsync();

        return new RadiologyRevenueReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalRevenue = requests.Sum(r => r.TotalAmount),
            InsuranceRevenue = requests.Sum(r => r.InsuranceAmount),
            PatientRevenue = requests.Sum(r => r.PatientAmount),
            TotalExams = requests.Count,
            ByServiceType = new List<RevenueByServiceTypeDto>(),
            ByDay = new List<RevenueByDayDto>(),
            ByDoctor = new List<RevenueByDoctorDto>()
        };
    }

    public async Task<UltrasoundRegisterDto> GetUltrasoundRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        return new UltrasoundRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = 0,
            Items = new List<UltrasoundRegisterItemDto>()
        };
    }

    public async Task<RadiologyRegisterDto> GetRadiologyRegisterByTypeAsync(
        DateTime fromDate,
        DateTime toDate,
        string serviceType)
    {
        return new RadiologyRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            ServiceType = serviceType,
            TotalExams = 0,
            Items = new List<RadiologyRegisterItemDto>()
        };
    }

    public async Task<RadiologyRegisterDto> GetRadiologyRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        return new RadiologyRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = 0,
            Items = new List<RadiologyRegisterItemDto>()
        };
    }

    public async Task<FunctionalTestRegisterDto> GetFunctionalTestRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        return new FunctionalTestRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = 0,
            Items = new List<FunctionalTestRegisterItemDto>()
        };
    }

    public async Task<ConsumptionNormReportDto> GetConsumptionNormReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? serviceId = null)
    {
        return new ConsumptionNormReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            ByService = new List<ConsumptionByServiceDto>()
        };
    }

    public async Task<RadiologyRevenueReportDto> GetRevenueByBaseCostReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? departmentId = null)
    {
        return await GetRevenueReportAsync(fromDate, toDate, departmentId);
    }

    public async Task<SyncResultToDoHDto> SyncResultToDoHAsync(Guid resultId)
    {
        return new SyncResultToDoHDto
        {
            ResultId = resultId,
            SyncStatus = "Success",
            SyncTime = DateTime.Now
        };
    }

    public async Task<RadiologyStatisticsDto> GetStatisticsAsync(
        DateTime fromDate,
        DateTime toDate,
        string serviceType = null)
    {
        var requests = await _context.RadiologyRequests
            .Where(r => r.RequestDate >= fromDate && r.RequestDate <= toDate)
            .ToListAsync();

        return new RadiologyStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalOrders = requests.Count,
            TotalExams = requests.Count,
            CompletedExams = requests.Count(r => r.Status >= 3),
            PendingExams = requests.Count(r => r.Status < 3),
            AverageTATMinutes = 30,
            ByServiceType = new List<StatisticsByServiceTypeDto>(),
            ByDay = new List<StatisticsByDayDto>(),
            ByModality = new List<StatisticsByModalityDto>()
        };
    }

    public async Task<byte[]> ExportReportToExcelAsync(string reportType, DateTime fromDate, DateTime toDate, object parameters = null)
    {
        return await Task.FromResult(new byte[0]);
    }

    #endregion

    #region F2.8 Favorite — Ca chup yeu thich

    public async Task<FavoriteToggleResultDto> ToggleFavoriteAsync(Guid requestId, Guid userId)
    {
        var existing = await _context.RadiologyStudyFavorites
            .FirstOrDefaultAsync(f => f.RequestId == requestId && f.UserId == userId);

        if (existing != null)
        {
            _context.RadiologyStudyFavorites.Remove(existing);
            await _context.SaveChangesAsync();
            return new FavoriteToggleResultDto { IsFavorited = false, RequestId = requestId };
        }

        var favorite = new RadiologyStudyFavorite
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RequestId = requestId,
            CreatedAt = DateTime.UtcNow,
        };
        _context.RadiologyStudyFavorites.Add(favorite);
        await _context.SaveChangesAsync();
        return new FavoriteToggleResultDto { IsFavorited = true, RequestId = requestId };
    }

    public async Task<List<RadiologyFavoriteDto>> GetFavoritesAsync(Guid userId)
    {
        var favorites = await _context.RadiologyStudyFavorites
            .Where(f => f.UserId == userId)
            .Join(_context.RadiologyRequests,
                f => f.RequestId,
                r => r.Id,
                (f, r) => new { f, r })
            .Join(_context.Patients,
                x => x.r.PatientId,
                p => p.Id,
                (x, p) => new { x.f, x.r, p })
            .Join(_context.Services,
                x => x.r.ServiceId,
                s => s.Id,
                (x, s) => new RadiologyFavoriteDto
                {
                    Id = x.f.Id,
                    UserId = x.f.UserId,
                    RequestId = x.f.RequestId,
                    RequestCode = x.r.RequestCode,
                    PatientName = x.p.FullName,
                    PatientCode = x.p.PatientCode,
                    ServiceName = s.ServiceName,
                    RequestDate = x.r.RequestDate,
                    Status = x.r.Status,
                    CreatedAt = x.f.CreatedAt,
                })
            .OrderByDescending(dto => dto.CreatedAt)
            .ToBoundedListAsync("RIS.GetFavorites");

        return favorites;
    }

    public async Task<bool> IsFavoritedAsync(Guid requestId, Guid userId)
    {
        return await _context.RadiologyStudyFavorites
            .AnyAsync(f => f.RequestId == requestId && f.UserId == userId);
    }

    #endregion
}
