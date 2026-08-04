using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Reception;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap26 — Liên thông XIX.1 #1: kiểm tra lạm dụng thẻ BHYT (KCB nhiều lần).
/// Chỉ sinh CẢNH BÁO cho nhân viên tiếp đón — KHÔNG tự chặn tiếp nhận,
/// quyết định vẫn thuộc về nhân viên y tế.
/// </summary>
public partial class ReceptionCompleteService
{
    // Khóa cấu hình trong SystemConfig — cho phép mỗi CSYT tự chỉnh ngưỡng.
    private const string CfgPerDay = "CardAbuse.MaxVisitsPerDay";
    private const string CfgPerPeriod = "CardAbuse.MaxVisitsPerPeriod";
    private const string CfgFacilities = "CardAbuse.MaxDistinctFacilities";
    private const string CfgPeriodDays = "CardAbuse.PeriodDays";

    public async Task<CardAbuseCheckResultDto> CheckCardAbuseAsync(string insuranceNumber, DateTime? fromDate)
    {
        if (string.IsNullOrWhiteSpace(insuranceNumber))
            throw new InvalidOperationException("Thiếu số thẻ BHYT để kiểm tra.");

        var card = insuranceNumber.Trim();

        var thresholdPerDay = await GetIntConfigAsync(CfgPerDay, 2);
        var thresholdPerPeriod = await GetIntConfigAsync(CfgPerPeriod, 6);
        var thresholdFacilities = await GetIntConfigAsync(CfgFacilities, 3);
        var periodDays = await GetIntConfigAsync(CfgPeriodDays, 30);

        var since = fromDate ?? DateTime.Today.AddDays(-periodDays);

        // Nguồn nội bộ. Lịch sử cổng BHXH / liên thông tỉnh được bổ sung ở lớp
        // gateway (đã có sẵn API riêng) — ở đây gom phần dữ liệu chắc chắn có.
        var records = await _context.MedicalRecords.AsNoTracking()
            .Where(m => m.InsuranceNumber == card && !m.IsDeleted && m.AdmissionDate >= since)
            .OrderByDescending(m => m.AdmissionDate)
            .Select(m => new CardAbuseVisitDto
            {
                VisitDate = m.AdmissionDate,
                FacilityCode = m.InsuranceFacilityCode,
                FacilityName = null,
                RecordCode = m.MedicalRecordCode,
                DiagnosisCode = m.MainIcdCode,
                DiagnosisName = m.MainDiagnosis,
                Source = "NoiBo"
            })
            .Take(200)
            .ToListAsync();

        var today = DateTime.Today;
        var visitsToday = records.Count(v => v.VisitDate.Date == today);
        var visitsInPeriod = records.Count;
        var distinctFacilities = records
            .Where(v => !string.IsNullOrWhiteSpace(v.FacilityCode))
            .Select(v => v.FacilityCode!)
            .Distinct().Count();

        // Mức 2 (đỏ): vượt ngưỡng ngày HOẶC vượt cả 2 ngưỡng kỳ + số cơ sở.
        // Mức 1 (vàng): vượt 1 trong 2 ngưỡng kỳ.
        var reasons = new List<string>();
        if (visitsToday > thresholdPerDay) reasons.Add($"{visitsToday} lượt trong hôm nay (ngưỡng {thresholdPerDay})");
        if (visitsInPeriod > thresholdPerPeriod) reasons.Add($"{visitsInPeriod} lượt trong {periodDays} ngày (ngưỡng {thresholdPerPeriod})");
        if (distinctFacilities > thresholdFacilities) reasons.Add($"{distinctFacilities} cơ sở khác nhau (ngưỡng {thresholdFacilities})");

        int level;
        if (visitsToday > thresholdPerDay || reasons.Count >= 2) level = 2;
        else if (reasons.Count == 1) level = 1;
        else level = 0;

        return new CardAbuseCheckResultDto
        {
            InsuranceNumber = card,
            AlertLevel = level,
            Message = level == 0
                ? "Không phát hiện dấu hiệu lạm dụng thẻ."
                : $"Thẻ có dấu hiệu KCB nhiều lần: {string.Join("; ", reasons)}.",
            VisitsToday = visitsToday,
            VisitsInPeriod = visitsInPeriod,
            DistinctFacilities = distinctFacilities,
            ThresholdPerDay = thresholdPerDay,
            ThresholdPerPeriod = thresholdPerPeriod,
            ThresholdFacilities = thresholdFacilities,
            PeriodDays = periodDays,
            Visits = records
        };
    }

    private async Task<int> GetIntConfigAsync(string key, int fallback)
    {
        var raw = await _context.SystemConfigs.AsNoTracking()
            .Where(c => c.ConfigKey == key && c.IsActive)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync();
        return int.TryParse(raw, out var v) && v > 0 ? v : fallback;
    }
}
