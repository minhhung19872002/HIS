using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K2 phien 3 (2026-05-30): tach Module 16 (HSBA & Thong ke, 12 chuc nang, ~1135 dong) khoi
// SystemCompleteService.cs god-file. ZERO runtime change — partial class.
// Ctor + DI fields o file goc SystemCompleteService.cs.
public partial class SystemCompleteService
{
    #region Module 16b: Thong ke & Bao cao HSBA (16.4-16.12)

    // 16.4 Bao cao kham benh
    public async Task<List<ExaminationStatisticsDto>> GetExaminationStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? doctorId = null)
    {
        try
        {
            var query = _context.Examinations.AsNoTracking()
                .Include(e => e.Department)
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate);
            if (departmentId.HasValue)
                query = query.Where(e => e.DepartmentId == departmentId.Value);
            if (doctorId.HasValue)
                query = query.Where(e => e.DoctorId == doctorId.Value);

            var result = await query
                .GroupBy(e => new { e.DepartmentId, e.Department.DepartmentName, Date = e.CreatedAt.Date })
                .Select(g => new ExaminationStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalExaminations = g.Count(),
                    NewPatients = g.Count(e => e.ExaminationType == 1),
                    FollowUpPatients = g.Count(e => e.ExaminationType == 2 || e.ExaminationType == 3)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExaminationStatisticsAsync");
            return new List<ExaminationStatisticsDto>();
        }
    }

    // 16.5 Bao cao nhap vien
    public async Task<List<AdmissionStatisticsDto>> GetAdmissionStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string admissionSource = null)
    {
        try
        {
            var query = _context.Admissions.AsNoTracking()
                .Include(a => a.Department)
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate);
            if (departmentId.HasValue)
                query = query.Where(a => a.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(admissionSource))
                query = query.Where(a => a.ReferralSource != null && a.ReferralSource.Contains(admissionSource));

            var result = await query
                .GroupBy(a => new { a.DepartmentId, a.Department.DepartmentName, Date = a.AdmissionDate.Date })
                .Select(g => new AdmissionStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalAdmissions = g.Count(),
                    EmergencyAdmissions = g.Count(a => a.AdmissionType == 1),
                    ElectiveAdmissions = g.Count(a => a.AdmissionType == 3)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAdmissionStatisticsAsync");
            return new List<AdmissionStatisticsDto>();
        }
    }

    // 16.6 Bao cao xuat vien
    public async Task<List<DischargeStatisticsDto>> GetDischargeStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string dischargeType = null)
    {
        try
        {
            var query = _context.Discharges.AsNoTracking()
                .Include(d => d.Admission).ThenInclude(a => a.Department)
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate);
            if (departmentId.HasValue)
                query = query.Where(d => d.Admission.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(dischargeType) && int.TryParse(dischargeType, out var dt))
                query = query.Where(d => d.DischargeType == dt);

            var result = await query
                .GroupBy(d => new { d.Admission.DepartmentId, d.Admission.Department.DepartmentName, Date = d.DischargeDate.Date })
                .Select(g => new DischargeStatisticsDto
                {
                    Date = g.Key.Date,
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalDischarges = g.Count(),
                    RecoveredCount = g.Count(d => d.DischargeCondition == 1),
                    ImprovedCount = g.Count(d => d.DischargeCondition == 2),
                    DeathCount = g.Count(d => d.DischargeCondition == 5 || d.DischargeType == 4)
                })
                .OrderBy(x => x.Date).ThenBy(x => x.DepartmentName)
                .ToListAsync();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDischargeStatisticsAsync");
            return new List<DischargeStatisticsDto>();
        }
    }

    // 16.7 Bao cao tu vong
    public async Task<List<MortalityStatisticsDto>> GetMortalityStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var deathDischarges = _context.Discharges.AsNoTracking()
                .Include(d => d.Admission).ThenInclude(a => a.Department)
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate)
                .Where(d => d.DischargeType == 4 || d.DischargeCondition == 5);
            if (departmentId.HasValue)
                deathDischarges = deathDischarges.Where(d => d.Admission.DepartmentId == departmentId.Value);

            var totalAdmissions = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .Where(a => !departmentId.HasValue || a.DepartmentId == departmentId.Value)
                .CountAsync();

            var result = await deathDischarges
                .GroupBy(d => new { d.Admission.DepartmentId, d.Admission.Department.DepartmentName })
                .Select(g => new MortalityStatisticsDto
                {
                    DepartmentId = g.Key.DepartmentId,
                    DepartmentName = g.Key.DepartmentName,
                    TotalDeaths = g.Count(),
                    DeathWithin24Hours = g.Count(d =>
                        EF.Functions.DateDiffHour(d.Admission.AdmissionDate, d.DischargeDate) <= 24),
                    DeathAfter24Hours = g.Count(d =>
                        EF.Functions.DateDiffHour(d.Admission.AdmissionDate, d.DischargeDate) > 24),
                    MortalityRate = 0
                })
                .OrderByDescending(x => x.TotalDeaths)
                .ToListAsync();

            foreach (var item in result)
            {
                if (totalAdmissions > 0)
                    item.MortalityRate = Math.Round((double)item.TotalDeaths / totalAdmissions * 100, 2);
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMortalityStatisticsAsync");
            return new List<MortalityStatisticsDto>();
        }
    }

    // 16.8 Bao cao benh theo ICD-10
    public async Task<List<DiseaseStatisticsDto>> GetDiseaseStatisticsAsync(
        DateTime fromDate, DateTime toDate, string icdChapter = null, Guid? departmentId = null)
    {
        try
        {
            var examQuery = _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .Where(e => e.MainIcdCode != null && e.MainIcdCode != "");
            if (departmentId.HasValue)
                examQuery = examQuery.Where(e => e.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(icdChapter))
                examQuery = examQuery.Where(e => e.MainIcdCode.StartsWith(icdChapter));

            var examStats = await examQuery
                .GroupBy(e => new { e.MainIcdCode, e.MainDiagnosis })
                .Select(g => new { g.Key.MainIcdCode, g.Key.MainDiagnosis, Count = g.Count() })
                .ToListAsync();

            var admissionQuery = _context.Admissions.AsNoTracking()
                .Include(a => a.MedicalRecord)
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .Where(a => a.MedicalRecord.MainIcdCode != null && a.MedicalRecord.MainIcdCode != "");
            if (departmentId.HasValue)
                admissionQuery = admissionQuery.Where(a => a.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(icdChapter))
                admissionQuery = admissionQuery.Where(a => a.MedicalRecord.MainIcdCode.StartsWith(icdChapter));

            var admissionStats = await admissionQuery
                .GroupBy(a => new { a.MedicalRecord.MainIcdCode, a.MedicalRecord.MainDiagnosis })
                .Select(g => new { g.Key.MainIcdCode, g.Key.MainDiagnosis, Count = g.Count() })
                .ToListAsync();

            var allIcds = examStats.Select(x => x.MainIcdCode)
                .Union(admissionStats.Select(x => x.MainIcdCode))
                .Distinct();

            var result = allIcds.Select(icd =>
            {
                var exam = examStats.FirstOrDefault(x => x.MainIcdCode == icd);
                var adm = admissionStats.FirstOrDefault(x => x.MainIcdCode == icd);
                var outpatient = exam?.Count ?? 0;
                var inpatient = adm?.Count ?? 0;
                return new DiseaseStatisticsDto
                {
                    IcdCode = icd,
                    IcdName = exam?.MainDiagnosis ?? adm?.MainDiagnosis ?? "",
                    TotalCases = outpatient + inpatient,
                    OutpatientCases = outpatient,
                    InpatientCases = inpatient
                };
            })
            .OrderByDescending(x => x.TotalCases)
            .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDiseaseStatisticsAsync");
            return new List<DiseaseStatisticsDto>();
        }
    }

    // 16.9 Bao cao hoat dong khoa
    public async Task<List<DepartmentActivityReportDto>> GetDepartmentActivityReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var deptQuery = _context.Departments.AsNoTracking()
                .Where(d => d.IsActive && !d.IsDeleted);
            if (departmentId.HasValue)
                deptQuery = deptQuery.Where(d => d.Id == departmentId.Value);

            var departments = await deptQuery.Select(d => new { d.Id, d.DepartmentName }).ToListAsync();

            var examCounts = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .GroupBy(e => e.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var admissionCounts = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .GroupBy(a => a.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var surgeryCounts = await _context.SurgeryRequests.AsNoTracking()
                .Include(s => s.MedicalRecord)
                .Where(s => s.CreatedAt >= fromDate && s.CreatedAt <= toDate)
                .Where(s => s.Status == 3)
                .Where(s => s.MedicalRecord != null && s.MedicalRecord.DepartmentId != null)
                .GroupBy(s => s.MedicalRecord.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            // #14b: model 1 ServiceRequests (RequestType=1 XN, loại hủy) thay LabRequests (model 2 chết)
            var labCounts = await _context.ServiceRequests.AsNoTracking()
                .Where(l => l.CreatedAt >= fromDate && l.CreatedAt <= toDate && l.RequestType == 1 && l.Status != 4)
                .GroupBy(l => (Guid?)l.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            var revenueSums = await _context.Receipts.AsNoTracking()
                .Where(r => r.CreatedAt >= fromDate && r.CreatedAt <= toDate)
                .Include(r => r.MedicalRecord)
                .Where(r => r.MedicalRecord.DepartmentId != null)
                .GroupBy(r => r.MedicalRecord.DepartmentId)
                .Select(g => new { DeptId = g.Key, Sum = g.Sum(r => r.FinalAmount) })
                .ToListAsync();

            var result = departments.Select(d => new DepartmentActivityReportDto
            {
                DepartmentId = d.Id,
                DepartmentName = d.DepartmentName,
                OutpatientVisits = examCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                InpatientAdmissions = admissionCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                Surgeries = surgeryCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                LabTests = labCounts.FirstOrDefault(x => x.DeptId == d.Id)?.Count ?? 0,
                TotalRevenue = revenueSums.FirstOrDefault(x => x.DeptId == d.Id)?.Sum ?? 0
            })
            .OrderByDescending(x => x.OutpatientVisits + x.InpatientAdmissions)
            .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentActivityReportAsync");
            return new List<DepartmentActivityReportDto>();
        }
    }

    // 16.10 Bao cao cong suat giuong benh
    public async Task<List<BedOccupancyReportDto>> GetBedOccupancyReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var bedQuery = _context.Beds.AsNoTracking()
                .Include(b => b.Room).ThenInclude(r => r.Department)
                .Where(b => b.IsActive);
            if (departmentId.HasValue)
                bedQuery = bedQuery.Where(b => b.Room.Department.Id == departmentId.Value);

            var beds = await bedQuery.ToListAsync();
            var occupiedBedIds = await _context.Set<BedAssignment>().AsNoTracking()
                .Where(ba => ba.Status == 0)
                .Select(ba => ba.BedId)
                .Distinct()
                .ToListAsync();

            var result = beds
                .GroupBy(b => new { b.Room.Department.Id, b.Room.Department.DepartmentName })
                .Select(g =>
                {
                    var total = g.Count();
                    var occupied = g.Count(b => occupiedBedIds.Contains(b.Id));
                    return new BedOccupancyReportDto
                    {
                        DepartmentId = g.Key.Id,
                        DepartmentName = g.Key.DepartmentName,
                        TotalBeds = total,
                        OccupiedBeds = occupied,
                        AvailableBeds = total - occupied,
                        OccupancyRate = total > 0 ? Math.Round((double)occupied / total * 100, 1) : 0
                    };
                })
                .OrderByDescending(x => x.OccupancyRate)
                .ToList();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBedOccupancyReportAsync");
            return new List<BedOccupancyReportDto>();
        }
    }

    // 16.11 Bao cao A1-A2-A3 (BYT)
    public async Task<BYTReportDto> GetBYTReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var hospitalConfig = await _context.SystemConfigs.AsNoTracking()
                .Where(c => c.ConfigKey == "HospitalName" || c.ConfigKey == "HospitalCode")
                .ToListAsync();

            var totalOutpatients = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .CountAsync();

            var totalInpatients = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate)
                .CountAsync();

            var totalBeds = await _context.Beds.AsNoTracking()
                .Where(b => b.IsActive)
                .CountAsync();

            return new BYTReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                HospitalName = hospitalConfig.FirstOrDefault(c => c.ConfigKey == "HospitalName")?.ConfigValue ?? "BỆNH VIỆN ĐA KHOA",
                HospitalCode = hospitalConfig.FirstOrDefault(c => c.ConfigKey == "HospitalCode")?.ConfigValue ?? "",
                TotalOutpatients = totalOutpatients,
                TotalInpatients = totalInpatients,
                TotalBeds = totalBeds
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBYTReportAsync");
            return new BYTReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                HospitalName = string.Empty,
                HospitalCode = string.Empty,
                TotalOutpatients = 0,
                TotalInpatients = 0,
                TotalBeds = 0
            };
        }
    }

    // 16.12 KPI benh vien
    public async Task<List<HospitalKPIDto>> GetHospitalKPIsAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            var totalExams = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate).CountAsync();
            var completedExams = await _context.Examinations.AsNoTracking()
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate && e.Status == 4).CountAsync();

            var totalAdmissions = await _context.Admissions.AsNoTracking()
                .Where(a => a.AdmissionDate >= fromDate && a.AdmissionDate <= toDate).CountAsync();
            var discharges = await _context.Discharges.AsNoTracking()
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate).ToListAsync();
            var deaths = discharges.Count(d => d.DischargeType == 4 || d.DischargeCondition == 5);

            var totalBeds = await _context.Beds.AsNoTracking().Where(b => b.IsActive).CountAsync();
            var occupiedBeds = await _context.Set<BedAssignment>().AsNoTracking()
                .Where(ba => ba.Status == 0).Select(ba => ba.BedId).Distinct().CountAsync();

            var avgLos = totalAdmissions > 0
                ? await _context.Discharges.AsNoTracking()
                    .Where(d => d.DischargeDate >= fromDate && d.DischargeDate <= toDate)
                    .Select(d => EF.Functions.DateDiffDay(d.Admission.AdmissionDate, d.DischargeDate))
                    .DefaultIfEmpty(0)
                    .AverageAsync()
                : 0;

            var kpis = new List<HospitalKPIDto>
            {
                new HospitalKPIDto
                {
                    KPIName = "Tỷ lệ hoàn thành khám",
                    KPICategory = "Khám bệnh",
                    TargetValue = 95,
                    ActualValue = totalExams > 0 ? Math.Round((decimal)completedExams / totalExams * 100, 1) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Công suất giường bệnh",
                    KPICategory = "Nội trú",
                    TargetValue = 85,
                    ActualValue = totalBeds > 0 ? Math.Round((decimal)occupiedBeds / totalBeds * 100, 1) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Số ngày điều trị trung bình",
                    KPICategory = "Nội trú",
                    TargetValue = 7,
                    ActualValue = Math.Round((decimal)avgLos, 1),
                    Unit = "ngày"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tỷ lệ tử vong",
                    KPICategory = "Chất lượng",
                    TargetValue = 1,
                    ActualValue = totalAdmissions > 0 ? Math.Round((decimal)deaths / totalAdmissions * 100, 2) : 0,
                    Unit = "%"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tổng lượt khám",
                    KPICategory = "Khám bệnh",
                    TargetValue = 1000,
                    ActualValue = totalExams,
                    Unit = "lượt"
                },
                new HospitalKPIDto
                {
                    KPIName = "Tổng lượt nhập viện",
                    KPICategory = "Nội trú",
                    TargetValue = 200,
                    ActualValue = totalAdmissions,
                    Unit = "lượt"
                }
            };

            foreach (var kpi in kpis)
            {
                kpi.Achievement = kpi.TargetValue > 0
                    ? Math.Round((double)(kpi.ActualValue / kpi.TargetValue * 100), 1)
                    : 0;
            }
            return kpis;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetHospitalKPIsAsync");
            return new List<HospitalKPIDto>();
        }
    }

    public async Task<byte[]> PrintStatisticsReportAsync(StatisticsReportRequest request)
    {
        try
        {
            string[] headers;
            var rows = new List<string[]>();
            var title = "BÁO CÁO THỐNG KÊ";

            switch (request.ReportType?.ToLower())
            {
                case "examination":
                    title = "BÁO CÁO KHÁM BỆNH";
                    headers = new[] { "Ngày", "Khoa", "Tổng khám", "Bệnh mới", "Tái khám" };
                    var exams = await GetExaminationStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var e in exams)
                        rows.Add(new[] { e.Date.ToString("dd/MM/yyyy"), e.DepartmentName ?? "", e.TotalExaminations.ToString(), e.NewPatients.ToString(), e.FollowUpPatients.ToString() });
                    break;
                case "admission":
                    title = "BÁO CÁO NHẬP VIỆN";
                    headers = new[] { "Ngày", "Khoa", "Tổng nhập", "Cấp cứu", "Điều trị" };
                    var adms = await GetAdmissionStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var a in adms)
                        rows.Add(new[] { a.Date.ToString("dd/MM/yyyy"), a.DepartmentName ?? "", a.TotalAdmissions.ToString(), a.EmergencyAdmissions.ToString(), a.ElectiveAdmissions.ToString() });
                    break;
                case "discharge":
                    title = "BÁO CÁO XUẤT VIỆN";
                    headers = new[] { "Ngày", "Khoa", "Tổng xuất", "Khỏi", "Đỡ", "Tử vong" };
                    var discs = await GetDischargeStatisticsAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var d in discs)
                        rows.Add(new[] { d.Date.ToString("dd/MM/yyyy"), d.DepartmentName ?? "", d.TotalDischarges.ToString(), d.RecoveredCount.ToString(), d.ImprovedCount.ToString(), d.DeathCount.ToString() });
                    break;
                case "bed":
                    title = "BÁO CÁO CÔNG SUẤT GIƯỜNG";
                    headers = new[] { "Khoa", "Tổng giường", "Đang dùng", "Còn trống", "Tỷ lệ (%)" };
                    var beds = await GetBedOccupancyReportAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var b in beds)
                        rows.Add(new[] { b.DepartmentName ?? "", b.TotalBeds.ToString(), b.OccupiedBeds.ToString(), b.AvailableBeds.ToString(), b.OccupancyRate.ToString("0.0") });
                    break;
                default:
                    title = "BÁO CÁO HOẠT ĐỘNG KHOA";
                    headers = new[] { "Khoa", "Ngoại trú", "Nội trú", "Phẫu thuật", "Xét nghiệm", "Doanh thu" };
                    var acts = await GetDepartmentActivityReportAsync(request.FromDate, request.ToDate, request.DepartmentId);
                    foreach (var a in acts)
                        rows.Add(new[] { a.DepartmentName ?? "", a.OutpatientVisits.ToString(), a.InpatientAdmissions.ToString(), a.Surgeries.ToString(), a.LabTests.ToString(), a.TotalRevenue.ToString("#,##0") });
                    break;
            }

            var subtitle = $"Từ {request.FromDate:dd/MM/yyyy} đến {request.ToDate:dd/MM/yyyy}";
            var html = PdfTemplateHelper.BuildTableReport(title, subtitle, DateTime.Now, headers, rows);
            return System.Text.Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in PrintStatisticsReportAsync");
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> ExportStatisticsReportToExcelAsync(StatisticsReportRequest request)
    {
        // Export as HTML table that can be opened in Excel
        var bytes = await PrintStatisticsReportAsync(request);
        return bytes;
    }

    #endregion
}
