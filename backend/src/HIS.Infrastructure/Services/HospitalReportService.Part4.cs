using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class HospitalReportService
{

    private async Task FillInsuranceReport(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        try
        {
            var query = _context.InsuranceClaims.AsNoTracking()
                .Where(ic => ic.CreatedAt >= from && ic.CreatedAt < to && !ic.IsDeleted);
            if (deptId.HasValue)
                query = query.Where(ic => ic.DepartmentId == deptId);

            var data = await query
                .GroupBy(ic => ic.ClaimStatus)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count(),
                    TotalAmount = g.Sum(ic => ic.TotalAmount),
                    ApprovedAmount = g.Sum(ic => ic.InsuranceAmount)
                })
                .ToListAsync();

            var statusNames = new Dictionary<int, string> { { 0, "Cho duyet" }, { 1, "Da duyet" }, { 2, "Tu choi" }, { 3, "Da thanh toan" } };
            foreach (var d in data)
            {
                result.Data.Add(new Dictionary<string, object>
                {
                    ["status"] = statusNames.TryGetValue(d.Status, out var s) ? s : $"Trang thai {d.Status}",
                    ["claimCount"] = d.Count,
                    ["totalAmount"] = d.TotalAmount,
                    ["approvedAmount"] = d.ApprovedAmount
                });
            }
            result.Summary["totalClaims"] = data.Sum(d => d.Count);
            result.Summary["totalAmount"] = data.Sum(d => d.TotalAmount);
            result.Summary["totalApproved"] = data.Sum(d => d.ApprovedAmount);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            result.Summary["note"] = "Bang InsuranceClaims chua co du lieu";
        }
    }

    private async Task FillScheduledPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        try
        {
            var query = _context.Set<Appointment>().AsNoTracking()
                .Where(a => a.AppointmentDate >= from && a.AppointmentDate < to && !a.IsDeleted);

            var count = await query.CountAsync();
            result.Data.Add(new Dictionary<string, object> { ["type"] = "BN hen kham", ["count"] = count });
            result.Summary["totalScheduled"] = count;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            result.Summary["totalScheduled"] = 0;
        }
    }

    private async Task FillReferralPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted && e.MedicalRecord.PatientType == 1);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "BN chuyen tuyen", ["count"] = count });
        result.Summary["totalReferral"] = count;
    }

    private async Task FillExternalBloodRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        result.Data.Add(new Dictionary<string, object> { ["type"] = "So mau ngoai", ["count"] = 0 });
        result.Summary["totalExternalBlood"] = 0;
    }

    private async Task FillDiseaseAndDeathICD10(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted && e.MainIcdCode != null);
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var data = await query
            .GroupBy(e => new { e.MainIcdCode })
            .Select(g => new
            {
                g.Key.MainIcdCode,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .Take(50)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["icdCode"] = d.MainIcdCode ?? "",
                ["icdName"] = d.MainIcdCode ?? "", // ICD name lookup not available in Examination entity
                ["caseCount"] = d.Count
            });
        }
        result.Summary["totalDiagnoses"] = data.Sum(d => d.Count);
        result.Summary["uniqueIcdCodes"] = data.Count;
    }

    private async Task FillNutritionMealPortion(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Suat an dinh duong", ["count"] = 0 });
        result.Summary["totalMealPortions"] = 0;
    }

    private async Task FillForeignNationalPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted)
            .Where(e => e.MedicalRecord.Patient.NationalityCode != null && e.MedicalRecord.Patient.NationalityCode != "VN");

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "BN nuoc ngoai", ["count"] = count });
        result.Summary["totalForeignPatients"] = count;
    }

    private async Task FillMedicalRecordArchive(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        try
        {
            var query = _context.MedicalRecordArchives.AsNoTracking()
                .Where(a => a.CreatedAt >= from && a.CreatedAt < to && !a.IsDeleted);
            if (deptId.HasValue)
                query = query.Where(a => a.DepartmentId == deptId);

            var count = await query.CountAsync();
            result.Data.Add(new Dictionary<string, object> { ["type"] = "HSBA luu tru", ["count"] = count });
            result.Summary["totalArchived"] = count;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            result.Summary["totalArchived"] = 0;
        }
    }



    private async Task FillOutboundReferralSummary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillTransferOutPatients(result, from, to, deptId);
        result.ReportName = "Tong hop chuyen tuyen di";
    }

    private async Task FillDialysisMachineUsage(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // #148: dem so buoi chay than thuc tu HemodialysisSessions (thay stub count=0)
        var fromDate = from.Date;
        var toDate = to.Date;

        var query = from s in _context.HemodialysisSessions.AsNoTracking()
                    join a in _context.Admissions.AsNoTracking() on s.AdmissionId equals a.Id
                    where !s.IsDeleted && s.SessionDate >= fromDate && s.SessionDate <= toDate
                    select new { s.AdmissionId, a.DepartmentId };

        if (deptId.HasValue)
            query = query.Where(x => x.DepartmentId == deptId.Value);

        var rows = await query.ToListAsync();
        var totalSessions = rows.Count;
        var totalPatients = rows.Select(x => x.AdmissionId).Distinct().Count();

        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Su dung may loc mau",
            ["count"] = totalSessions,
            ["patientCount"] = totalPatients,
        });
        result.Summary["totalDialysisSessions"] = totalSessions;
        result.Summary["totalDialysisPatients"] = totalPatients;
    }



    public async Task<byte[]> GenerateBirthCertificateAsync(BirthCertificateDto dto)
    {
        var html = BuildBirthCertificateHtml(dto);
        return Encoding.UTF8.GetBytes(html);
    }

    private string BuildBirthCertificateHtml(BirthCertificateDto dto)
    {
        var genderText = dto.BabyGender == 1 ? "Nam" : dto.BabyGender == 2 ? "N\u1EEF" : "Kh\u00E1c";
        var deliveryMethodText = dto.DeliveryMethod ?? "Sinh th\u01B0\u1EDDng";
        var now = DateTime.Now;

        var body = new StringBuilder();
        body.AppendLine(PdfTemplateHelper.GetHospitalHeader());

        body.AppendLine(@"<div class=""form-title"">GI\u1EA4Y CH\u1EE8NG SINH</div>");
        body.AppendLine($@"<div class=""form-number"">S\u1ED1: {PdfTemplateHelper.Esc(dto.CertificateNumber ?? "...../GCS")}</div>");
        body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:15px"">Ng\u00E0y {now:dd} th\u00E1ng {now:MM} n\u0103m {now:yyyy}</div>");

        // I. Baby information
        body.AppendLine(@"<div style=""margin-bottom:10px""><strong>I. TH\u00D4NG TIN TR\u1EBA S\u01A0 SINH</strong></div>");
        body.AppendLine(@"<table style=""width:100%;margin-bottom:10px"">");
        body.AppendLine($@"<tr><td style=""width:30%""><strong>H\u1ECD v\u00E0 t\u00EAn:</strong></td><td>{PdfTemplateHelper.Esc(dto.BabyFullName)}</td></tr>");
        body.AppendLine($@"<tr><td><strong>Gi\u1EDBi t\u00EDnh:</strong></td><td>{genderText}</td></tr>");
        body.AppendLine($@"<tr><td><strong>Ng\u00E0y sinh:</strong></td><td>{dto.BabyDateOfBirth:dd/MM/yyyy}</td><td><strong>Gi\u1EDD sinh:</strong></td><td>{PdfTemplateHelper.Esc(dto.BabyTimeOfBirth)}</td></tr>");
        body.AppendLine($@"<tr><td><strong>N\u01A1i sinh:</strong></td><td colspan=""3"">{PdfTemplateHelper.Esc(dto.BabyPlaceOfBirth)}</td></tr>");
        if (dto.BabyWeight.HasValue)
            body.AppendLine($@"<tr><td><strong>C\u00E2n n\u1EB7ng:</strong></td><td>{dto.BabyWeight} gram</td><td><strong>Chi\u1EC1u d\u00E0i:</strong></td><td>{dto.BabyHeight} cm</td></tr>");
        if (!string.IsNullOrEmpty(dto.BabyEthnicName))
            body.AppendLine($@"<tr><td><strong>D\u00E2n t\u1ED9c:</strong></td><td>{PdfTemplateHelper.Esc(dto.BabyEthnicName)}</td><td><strong>Qu\u1ED1c t\u1ECBch:</strong></td><td>{PdfTemplateHelper.Esc(dto.BabyNationalityName ?? "Vi\u1EC7t Nam")}</td></tr>");
        if (dto.NumberInOrder.HasValue)
            body.AppendLine($@"<tr><td><strong>Con th\u1EE9:</strong></td><td>{dto.NumberInOrder}</td></tr>");
        body.AppendLine("</table>");

        // II. Mother information
        body.AppendLine(@"<div style=""margin-bottom:10px""><strong>II. TH\u00D4NG TIN NG\u01AF\u1EDCI M\u1EB8</strong></div>");
        body.AppendLine(@"<table style=""width:100%;margin-bottom:10px"">");
        body.AppendLine($@"<tr><td style=""width:30%""><strong>H\u1ECD v\u00E0 t\u00EAn:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherFullName)}</td></tr>");
        if (dto.MotherDateOfBirth.HasValue)
            body.AppendLine($@"<tr><td><strong>Ng\u00E0y sinh:</strong></td><td>{dto.MotherDateOfBirth:dd/MM/yyyy}</td></tr>");
        else if (dto.MotherYearOfBirth.HasValue)
            body.AppendLine($@"<tr><td><strong>N\u0103m sinh:</strong></td><td>{dto.MotherYearOfBirth}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MotherIdentityNumber))
            body.AppendLine($@"<tr><td><strong>CCCD/CMND:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherIdentityNumber)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MotherAddress))
            body.AppendLine($@"<tr><td><strong>\u0110\u1ECBa ch\u1EC9:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherAddress)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MotherOccupation))
            body.AppendLine($@"<tr><td><strong>Ngh\u1EC1 nghi\u1EC7p:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherOccupation)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MotherEthnicName))
            body.AppendLine($@"<tr><td><strong>D\u00E2n t\u1ED9c:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherEthnicName)}</td><td><strong>Qu\u1ED1c t\u1ECBch:</strong></td><td>{PdfTemplateHelper.Esc(dto.MotherNationalityName ?? "Vi\u1EC7t Nam")}</td></tr>");
        body.AppendLine("</table>");

        // III. Father information
        if (!string.IsNullOrEmpty(dto.FatherFullName))
        {
            body.AppendLine(@"<div style=""margin-bottom:10px""><strong>III. TH\u00D4NG TIN NG\u01AF\u1EDCI CHA</strong></div>");
            body.AppendLine(@"<table style=""width:100%;margin-bottom:10px"">");
            body.AppendLine($@"<tr><td style=""width:30%""><strong>H\u1ECD v\u00E0 t\u00EAn:</strong></td><td>{PdfTemplateHelper.Esc(dto.FatherFullName)}</td></tr>");
            if (dto.FatherDateOfBirth.HasValue)
                body.AppendLine($@"<tr><td><strong>Ng\u00E0y sinh:</strong></td><td>{dto.FatherDateOfBirth:dd/MM/yyyy}</td></tr>");
            else if (dto.FatherYearOfBirth.HasValue)
                body.AppendLine($@"<tr><td><strong>N\u0103m sinh:</strong></td><td>{dto.FatherYearOfBirth}</td></tr>");
            if (!string.IsNullOrEmpty(dto.FatherIdentityNumber))
                body.AppendLine($@"<tr><td><strong>CCCD/CMND:</strong></td><td>{PdfTemplateHelper.Esc(dto.FatherIdentityNumber)}</td></tr>");
            if (!string.IsNullOrEmpty(dto.FatherOccupation))
                body.AppendLine($@"<tr><td><strong>Ngh\u1EC1 nghi\u1EC7p:</strong></td><td>{PdfTemplateHelper.Esc(dto.FatherOccupation)}</td></tr>");
            body.AppendLine("</table>");
        }

        // IV. Delivery information
        body.AppendLine(@"<div style=""margin-bottom:10px""><strong>IV. TH\u00D4NG TIN SINH</strong></div>");
        body.AppendLine(@"<table style=""width:100%;margin-bottom:10px"">");
        body.AppendLine($@"<tr><td style=""width:30%""><strong>Ph\u01B0\u01A1ng ph\u00E1p sinh:</strong></td><td>{PdfTemplateHelper.Esc(deliveryMethodText)}</td></tr>");
        if (dto.GestationalWeeks.HasValue)
            body.AppendLine($@"<tr><td><strong>Tu\u1ED5i thai:</strong></td><td>{dto.GestationalWeeks} tu\u1EA7n</td></tr>");
        if (dto.ApgarScore1Min.HasValue)
            body.AppendLine($@"<tr><td><strong>Apgar 1 ph\u00FAt:</strong></td><td>{dto.ApgarScore1Min}</td><td><strong>Apgar 5 ph\u00FAt:</strong></td><td>{dto.ApgarScore5Min}</td></tr>");
        if (!string.IsNullOrEmpty(dto.DeliveryDoctor))
            body.AppendLine($@"<tr><td><strong>B\u00E1c s\u0129 \u0111\u1EE1:</strong></td><td>{PdfTemplateHelper.Esc(dto.DeliveryDoctor)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.DeliveryMidwife))
            body.AppendLine($@"<tr><td><strong>N\u1EEF h\u1ED9 sinh:</strong></td><td>{PdfTemplateHelper.Esc(dto.DeliveryMidwife)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.DeliveryNotes))
            body.AppendLine($@"<tr><td><strong>Ghi ch\u00FA:</strong></td><td colspan=""3"">{PdfTemplateHelper.Esc(dto.DeliveryNotes)}</td></tr>");
        if (!string.IsNullOrEmpty(dto.MedicalRecordCode))
            body.AppendLine($@"<tr><td><strong>S\u1ED1 HSBA:</strong></td><td>{PdfTemplateHelper.Esc(dto.MedicalRecordCode)}</td></tr>");
        body.AppendLine("</table>");

        // Signature block
        body.AppendLine(@"<div style=""display:flex;justify-content:space-between;margin-top:30px"">");
        body.AppendLine(@"<div style=""text-align:center;width:45%"">");
        body.AppendLine(@"<div><strong>NG\u01AF\u1EDCI \u0110\u1EE0</strong></div>");
        body.AppendLine(@"<div style=""font-style:italic;font-size:11px"">(K\u00FD, ghi r\u00F5 h\u1ECD t\u00EAn)</div>");
        body.AppendLine("<br/><br/><br/>");
        if (!string.IsNullOrEmpty(dto.DeliveryDoctor))
            body.AppendLine($@"<div>{PdfTemplateHelper.Esc(dto.DeliveryDoctor)}</div>");
        body.AppendLine("</div>");
        body.AppendLine(@"<div style=""text-align:center;width:45%"">");
        body.AppendLine($@"<div style=""font-style:italic"">Ng\u00E0y {now:dd} th\u00E1ng {now:MM} n\u0103m {now:yyyy}</div>");
        body.AppendLine(@"<div><strong>GI\u00C1M \u0110\u1ED0C B\u1EC6NH VI\u1EC6N</strong></div>");
        body.AppendLine(@"<div style=""font-style:italic;font-size:11px"">(K\u00FD, \u0111\u00F3ng d\u1EA5u)</div>");
        body.AppendLine("</div>");
        body.AppendLine("</div>");

        return PdfTemplateHelper.WrapHtmlPage("Gi\u1EA5y ch\u1EE9ng sinh", body.ToString());
    }

}
