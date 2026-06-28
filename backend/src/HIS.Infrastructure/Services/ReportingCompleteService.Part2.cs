using System.Text.Json;
using HIS.Application.Common;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class ReportingCompleteService
{

    public async Task<PatientByDepartmentReportDto> GetPatientByDepartmentReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.MedicalRecords
                .Where(m => m.AdmissionDate >= fromDate && m.AdmissionDate < toDate && !m.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(m => m.DepartmentId == departmentId.Value);

            var data = await query
                .GroupBy(m => m.Department!.DepartmentName ?? "Khong xac dinh")
                .Select(g => new PatientByDepartmentItemDto
                {
                    DepartmentName = g.Key,
                    OutpatientCount = g.Count(m => m.TreatmentType == 1),
                    InpatientCount = g.Count(m => m.TreatmentType == 2),
                    EmergencyCount = g.Count(m => m.TreatmentType == 3),
                    TotalCount = g.Count()
                })
                .OrderByDescending(d => d.TotalCount)
                .ToListAsync();

            var total = data.Sum(d => d.TotalCount);
            foreach (var d in data)
                d.Percentage = total > 0 ? Math.Round(d.TotalCount * 100m / total, 1) : 0;

            return new PatientByDepartmentReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalPatients = total,
                Departments = data
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Patient by department report failed");
            return new PatientByDepartmentReportDto { FromDate = fromDate, ToDate = toDate, Departments = new List<PatientByDepartmentItemDto>() };
        }
    }

    public async Task<Top10DiseasesReportDto> GetTop10DiseasesReportAsync(DateTime fromDate, DateTime toDate, string? patientType = null)
    {
        try
        {
            var query = _context.Examinations
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt < toDate && e.MainIcdCode != null && !e.IsDeleted);

            if (!string.IsNullOrEmpty(patientType))
            {
                if (int.TryParse(patientType, out var pt))
                    query = query.Where(e => e.MedicalRecord.PatientType == pt);
            }

            var data = await query
                .GroupBy(e => new { e.MainIcdCode, e.MainDiagnosis })
                .Select(g => new
                {
                    IcdCode = g.Key.MainIcdCode,
                    IcdName = g.Key.MainDiagnosis,
                    CaseCount = g.Count(),
                    MaleCount = g.Count(e => e.MedicalRecord.Patient.Gender == 1),
                    FemaleCount = g.Count(e => e.MedicalRecord.Patient.Gender == 2)
                })
                .OrderByDescending(d => d.CaseCount)
                .Take(10)
                .ToListAsync();

            var totalDiagnoses = await query.CountAsync();

            var diseases = data.Select((d, i) => new DiseaseStatItemDto
            {
                Rank = i + 1,
                IcdCode = d.IcdCode ?? "",
                IcdName = d.IcdName ?? "",
                CaseCount = d.CaseCount,
                MaleCount = d.MaleCount,
                FemaleCount = d.FemaleCount,
                Percentage = totalDiagnoses > 0 ? Math.Round(d.CaseCount * 100m / totalDiagnoses, 1) : 0
            }).ToList();

            return new Top10DiseasesReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalDiagnoses = totalDiagnoses,
                Diseases = diseases
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Top 10 diseases report failed");
            return new Top10DiseasesReportDto { FromDate = fromDate, ToDate = toDate, Diseases = new List<DiseaseStatItemDto>() };
        }
    }

    public async Task<MortalityReportDto> GetMortalityReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var dischargeQuery = _context.Discharges
                .Where(d => d.DischargeDate >= fromDate && d.DischargeDate < toDate && !d.IsDeleted);

            if (departmentId.HasValue)
                dischargeQuery = dischargeQuery.Where(d => d.Admission.DepartmentId == departmentId.Value);

            var totalDischarges = await dischargeQuery.CountAsync();
            var totalDeaths = await dischargeQuery.CountAsync(d => d.DischargeType == 4);
            var mortalityRate = totalDischarges > 0 ? Math.Round(totalDeaths * 100m / totalDischarges, 2) : 0;

            var byDept = await dischargeQuery
                .GroupBy(d => d.Admission.Department.DepartmentName)
                .Select(g => new MortalityByDepartmentDto
                {
                    DepartmentName = g.Key,
                    DeathCount = g.Count(d => d.DischargeType == 4),
                    DischargeCount = g.Count(),
                    Rate = g.Count() > 0 ? Math.Round(g.Count(d => d.DischargeType == 4) * 100m / g.Count(), 2) : 0
                })
                .Where(d => d.DeathCount > 0)
                .OrderByDescending(d => d.DeathCount)
                .ToListAsync();

            var byCause = await dischargeQuery
                .Where(d => d.DischargeType == 4 && d.DischargeDiagnosis != null)
                .GroupBy(d => new { d.Admission.MedicalRecord.MainIcdCode, d.DischargeDiagnosis })
                .Select(g => new MortalityByCauseDto
                {
                    IcdCode = g.Key.MainIcdCode ?? "",
                    CauseOfDeath = g.Key.DischargeDiagnosis ?? "",
                    Count = g.Count()
                })
                .OrderByDescending(c => c.Count)
                .Take(10)
                .ToListAsync();

            foreach (var c in byCause)
                c.Percentage = totalDeaths > 0 ? Math.Round(c.Count * 100m / totalDeaths, 1) : 0;

            return new MortalityReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalDeaths = totalDeaths,
                TotalDischarges = totalDischarges,
                MortalityRate = mortalityRate,
                ByDepartment = byDept,
                ByCause = byCause
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Mortality report failed");
            return new MortalityReportDto { FromDate = fromDate, ToDate = toDate, ByDepartment = new List<MortalityByDepartmentDto>(), ByCause = new List<MortalityByCauseDto>() };
        }
    }

    public async Task<SurgeryStatisticsReportDto> GetSurgeryStatisticsReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.SurgeryRequests
                .Where(s => s.RequestDate >= fromDate && s.RequestDate < toDate && !s.IsDeleted);

            var total = await query.CountAsync();
            var emergencyCount = await query.CountAsync(s => s.Priority == 3);
            var electiveCount = total - emergencyCount;

            var byType = await query
                .GroupBy(s => s.SurgeryType)
                .Select(g => new SurgeryByTypeDto
                {
                    SurgeryType = g.Key,
                    Count = g.Count(),
                    Percentage = total > 0 ? Math.Round(g.Count() * 100m / total, 1) : 0
                })
                .OrderByDescending(t => t.Count)
                .ToListAsync();

            var byDoctor = await query
                .GroupBy(s => s.RequestingDoctor.FullName)
                .Select(g => new SurgeryByDoctorDto
                {
                    DoctorName = g.Key,
                    SurgeryCount = g.Count()
                })
                .OrderByDescending(d => d.SurgeryCount)
                .Take(10)
                .ToListAsync();

            var avgDuration = await _context.SurgeryRecords
                .Where(r => r.ActualDuration != null && r.CreatedAt >= fromDate && r.CreatedAt < toDate && !r.IsDeleted)
                .AverageAsync(r => (decimal?)r.ActualDuration) ?? 0;

            return new SurgeryStatisticsReportDto
            {
                FromDate = fromDate, ToDate = toDate,
                TotalSurgeries = total,
                ElectiveSurgeries = electiveCount,
                EmergencySurgeries = emergencyCount,
                MajorSurgeries = byType.FirstOrDefault(t => t.SurgeryType.Contains("lon", StringComparison.OrdinalIgnoreCase))?.Count ?? 0,
                MinorSurgeries = byType.FirstOrDefault(t => t.SurgeryType.Contains("nho", StringComparison.OrdinalIgnoreCase))?.Count ?? 0,
                AverageDurationMinutes = Math.Round(avgDuration, 0),
                ByType = byType,
                ByDoctor = byDoctor
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Surgery statistics report failed");
            return new SurgeryStatisticsReportDto { FromDate = fromDate, ToDate = toDate, ByType = new List<SurgeryByTypeDto>(), ByDoctor = new List<SurgeryByDoctorDto>() };
        }
    }

    public async Task<object> GetLabStatisticsReportAsync(DateTime fromDate, DateTime toDate, string? testType = null)
    {
        try
        {
            // #14b: đọc model 1 (SRD RequestType=1); nhóm theo nhóm dịch vụ thay SampleType (model 2 chết).
            // Status SRD: 0/1 chờ-đang xử lý · 2 có KQ · 3 hủy.
            var query = _context.ServiceRequestDetails
                .Where(d => d.CreatedAt >= fromDate && d.CreatedAt < toDate && !d.IsDeleted
                    && d.ServiceRequest.RequestType == 1 && d.Status != 3);

            if (!string.IsNullOrEmpty(testType))
                query = query.Where(d => d.Service.ServiceGroup != null && d.Service.ServiceGroup.GroupName == testType);

            var total = await query.CountAsync();
            var completed = await query.CountAsync(d => d.Status == 2);
            var pending = await query.CountAsync(d => d.Status < 2);

            var bySampleType = await query
                .GroupBy(d => d.Service.ServiceGroup != null ? d.Service.ServiceGroup.GroupName : "Khac")
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .OrderByDescending(t => t.Count)
                .ToListAsync();

            var byStatus = await query
                .GroupBy(d => d.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalTests = total,
                CompletedTests = completed,
                PendingTests = pending,
                CompletionRate = total > 0 ? Math.Round(completed * 100m / total, 1) : 0,
                BySampleType = bySampleType,
                ByStatus = byStatus
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Lab statistics report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalTests = 0 };
        }
    }

    public async Task<object> GetRadiologyStatisticsReportAsync(DateTime fromDate, DateTime toDate, string? serviceType = null)
    {
        try
        {
            var query = _context.ServiceRequestDetails
                .Where(s => s.CreatedAt >= fromDate && s.CreatedAt < toDate && !s.IsDeleted);

            var total = await query.CountAsync();
            var completed = await query.CountAsync(s => s.Status >= 3);

            var byStatus = await query
                .GroupBy(s => s.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalExams = total,
                CompletedExams = completed,
                CompletionRate = total > 0 ? Math.Round(completed * 100m / total, 1) : 0,
                ByStatus = byStatus
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Radiology statistics report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalExams = 0 };
        }
    }

    public async Task<object> GetFollowUpReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        try
        {
            var query = _context.Examinations
                .Where(e => e.FollowUpDate != null && e.FollowUpDate >= fromDate && e.FollowUpDate < toDate && !e.IsDeleted);

            if (departmentId.HasValue)
                query = query.Where(e => e.DepartmentId == departmentId.Value);

            var totalFollowUps = await query.CountAsync();
            var overdue = await query.CountAsync(e => e.FollowUpDate < DateTime.Today);

            var byDept = await query
                .GroupBy(e => e.Department.DepartmentName)
                .Select(g => new { Dept = g.Key, Count = g.Count(), Overdue = g.Count(e => e.FollowUpDate < DateTime.Today) })
                .OrderByDescending(d => d.Count)
                .ToListAsync();

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalFollowUps = totalFollowUps,
                OverdueFollowUps = overdue,
                FollowUpRate = totalFollowUps > 0 ? Math.Round((totalFollowUps - overdue) * 100m / totalFollowUps, 1) : 100,
                ByDepartment = byDept
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Follow-up report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalFollowUps = 0 };
        }
    }

    public async Task<object> GetHospitalInfectionReportAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            // Query admissions with discharge condition indicating complications
            var totalAdmissions = await _context.Admissions
                .CountAsync(a => a.AdmissionDate >= fromDate && a.AdmissionDate < toDate && !a.IsDeleted);

            var totalDischarges = await _context.Discharges
                .CountAsync(d => d.DischargeDate >= fromDate && d.DischargeDate < toDate && !d.IsDeleted);

            // Approximate: admissions with worsened condition (DischargeCondition == 4)
            var worsened = await _context.Discharges
                .CountAsync(d => d.DischargeDate >= fromDate && d.DischargeDate < toDate && d.DischargeCondition == 4 && !d.IsDeleted);

            return new
            {
                FromDate = fromDate, ToDate = toDate,
                TotalAdmissions = totalAdmissions,
                TotalDischarges = totalDischarges,
                WorsenedCases = worsened,
                InfectionRate = totalAdmissions > 0 ? Math.Round(worsened * 100m / totalAdmissions, 2) : 0
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            _logger.LogWarning(ex, "Hospital infection report failed");
            return new { FromDate = fromDate, ToDate = toDate, TotalAdmissions = 0 };
        }
    }


}
