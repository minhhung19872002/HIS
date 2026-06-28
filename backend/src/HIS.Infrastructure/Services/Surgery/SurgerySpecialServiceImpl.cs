using Microsoft.EntityFrameworkCore;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services.Surgery;

/// <summary>
/// K12 POC Step 1 (2026-05-30, Plan B TRUE module hóa):
/// Implementation `ISurgerySpecialService` — Anesthesia Chart + Surgery Profit (NangCap18).
/// Logic copy 1-1 từ `SurgeryCompleteService` cũ (3 method).
/// Facade `SurgeryCompleteService` delegate xuống service này.
/// </summary>
public class SurgerySpecialServiceImpl : ISurgerySpecialService
{
    private readonly HISDbContext _context;

    public SurgerySpecialServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    public async Task<bool> SaveAnesthesiaChartAsync(HIS.Application.DTOs.NangCap18.SaveAnesthesiaChartDto dto, Guid userId)
    {
        var schedule = await _context.Set<SurgerySchedule>().FindAsync(dto.SurgeryId);
        if (schedule == null)
            throw new InvalidOperationException("Không tìm thấy lịch phẫu thuật");

        var existing = await _context.Set<AnesthesiaChartEntry>()
            .Where(e => e.SurgeryScheduleId == dto.SurgeryId && !e.IsDeleted)
            .ToListAsync();
        foreach (var e in existing)
            e.IsDeleted = true;

        foreach (var entry in dto.Entries)
        {
            var entity = new AnesthesiaChartEntry
            {
                Id = entry.Id ?? Guid.NewGuid(),
                SurgeryScheduleId = dto.SurgeryId,
                TimeMinutes = entry.TimeMinutes,
                HeartRate = entry.HeartRate,
                SystolicBP = entry.SystolicBP,
                DiastolicBP = entry.DiastolicBP,
                SpO2 = entry.SpO2,
                Temperature = entry.Temperature,
                EtCO2 = entry.EtCO2,
                Drug = entry.Drug,
                DoseGiven = entry.DoseGiven,
                Notes = entry.Notes,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.Set<AnesthesiaChartEntry>().Add(entity);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<HIS.Application.DTOs.NangCap18.AnesthesiaChartDto> GetAnesthesiaChartAsync(Guid surgeryId)
    {
        var schedule = await _context.Set<SurgerySchedule>()
            .Include(s => s.SurgeryRequest)
                .ThenInclude(r => r.Patient)
            .Include(s => s.SurgeryRecord)
            .FirstOrDefaultAsync(s => s.Id == surgeryId);

        var entries = await _context.Set<AnesthesiaChartEntry>()
            .Where(e => e.SurgeryScheduleId == surgeryId && !e.IsDeleted)
            .OrderBy(e => e.TimeMinutes)
            .Select(e => new HIS.Application.DTOs.NangCap18.AnesthesiaChartEntryDto
            {
                Id = e.Id,
                TimeMinutes = e.TimeMinutes,
                HeartRate = e.HeartRate,
                SystolicBP = e.SystolicBP,
                DiastolicBP = e.DiastolicBP,
                SpO2 = e.SpO2,
                Temperature = e.Temperature,
                EtCO2 = e.EtCO2,
                Drug = e.Drug,
                DoseGiven = e.DoseGiven,
                Notes = e.Notes
            })
            .ToBoundedListAsync("SurgerySpecialServiceImpl.GetAnesthesiaChartAsync");

        return new HIS.Application.DTOs.NangCap18.AnesthesiaChartDto
        {
            SurgeryId = surgeryId,
            PatientName = schedule?.SurgeryRequest?.Patient?.FullName,
            ProcedureName = schedule?.SurgeryRequest?.PlannedProcedure,
            SurgeryStart = schedule?.SurgeryRecord?.ActualStartTime,
            SurgeryEnd = schedule?.SurgeryRecord?.ActualEndTime,
            AnesthesiaType = schedule?.SurgeryRequest?.AnesthesiaType,
            Entries = entries
        };
    }

    public async Task<HIS.Application.DTOs.NangCap18.SurgeryProfitDto> CalculateSurgeryProfitAsync(Guid surgeryId)
    {
        var schedule = await _context.Set<SurgerySchedule>()
            .Include(s => s.SurgeryRequest)
            .Include(s => s.SurgeryRecord)
            .FirstOrDefaultAsync(s => s.Id == surgeryId);

        if (schedule == null)
            throw new InvalidOperationException("Không tìm thấy lịch phẫu thuật");

        var medicalRecordId = schedule.SurgeryRequest?.MedicalRecordId;
        decimal revenue = 0;
        if (medicalRecordId.HasValue)
        {
            revenue = await _context.ServiceRequestDetails
                .Where(d => d.ServiceRequest.MedicalRecordId == medicalRecordId.Value && !d.IsDeleted)
                .SumAsync(d => (decimal?)d.Amount) ?? 0;
        }

        decimal supplyCost = 0;
        decimal drugCost = 0;

        if (medicalRecordId.HasValue)
        {
            var exportDetails = await _context.ExportReceiptDetails
                .Include(d => d.ExportReceipt)
                .Where(d => d.ExportReceipt.MedicalRecordId == medicalRecordId.Value && !d.IsDeleted)
                .ToListAsync();

            supplyCost = exportDetails.Where(d => d.SupplyId.HasValue).Sum(d => d.Quantity * d.UnitPrice);
            drugCost = exportDetails.Where(d => d.MedicineId.HasValue).Sum(d => d.Quantity * d.UnitPrice);
        }

        var duration = schedule.SurgeryRecord?.ActualDuration ?? schedule.EstimatedDuration ?? 60;
        var teamSize = 1 + (schedule.AssistantIds?.Split(',').Length ?? 0) + (schedule.AnesthesiologistId.HasValue ? 1 : 0) + (schedule.NurseIds?.Split(',').Length ?? 0);
        decimal staffCost = teamSize * (duration / 60m) * 200000;

        decimal overheadCost = revenue * 0.10m;

        decimal totalCost = supplyCost + drugCost + staffCost + overheadCost;
        decimal profit = revenue - totalCost;
        decimal profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return new HIS.Application.DTOs.NangCap18.SurgeryProfitDto
        {
            SurgeryId = surgeryId,
            ProcedureName = schedule.SurgeryRequest?.PlannedProcedure,
            Revenue = revenue,
            SupplyCost = supplyCost,
            DrugCost = drugCost,
            StaffCost = staffCost,
            OverheadCost = overheadCost,
            Profit = profit,
            ProfitMargin = Math.Round(profitMargin, 2)
        };
    }
}
