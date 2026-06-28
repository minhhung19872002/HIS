using HIS.Application.DTOs.BusinessAlert;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public partial class BusinessAlertService
{
    // =====================================================================
    // HELPERS
    // =====================================================================

    private BusinessAlertDto CreateAlert(string alertCode, string category, int severity, string module,
        string title, string message, Guid? patientId, Guid? examinationId, Guid? admissionId)
    {
        return new BusinessAlertDto
        {
            Id = Guid.NewGuid(),
            AlertCode = alertCode,
            Category = category,
            Severity = severity,
            SeverityLabel = severity switch { 1 => "Critical", 2 => "Warning", _ => "Info" },
            SeverityColor = severity switch { 1 => "red", 2 => "orange", _ => "blue" },
            Module = module,
            Title = title,
            Message = message,
            PatientId = patientId,
            ExaminationId = examinationId,
            AdmissionId = admissionId,
            Status = 0,
            StatusLabel = "New",
            CreatedAt = DateTime.UtcNow,
        };
    }

    private async Task PersistNewAlertsAsync(List<BusinessAlertDto> alerts, Guid? patientId)
    {
        if (!alerts.Any()) return;

        try
        {
            // Avoid duplicate alerts: check if same alert code + patient already exists today
            var today = DateTime.UtcNow.Date;
            var existingCodes = await _context.BusinessAlerts
                .Where(a => a.PatientId == patientId
                    && a.CreatedAt >= today
                    && a.Status < 2) // Not resolved
                .Select(a => a.AlertCode + "|" + a.Title)
                .ToListAsync();

            foreach (var alertDto in alerts)
            {
                var key = alertDto.AlertCode + "|" + alertDto.Title;
                if (existingCodes.Contains(key)) continue;

                var entity = new BusinessAlert
                {
                    Id = alertDto.Id,
                    AlertCode = alertDto.AlertCode,
                    Category = alertDto.Category,
                    Title = alertDto.Title,
                    Message = alertDto.Message,
                    Severity = alertDto.Severity,
                    Module = alertDto.Module,
                    PatientId = alertDto.PatientId,
                    ExaminationId = alertDto.ExaminationId,
                    AdmissionId = alertDto.AdmissionId,
                    Status = 0,
                    CreatedAt = DateTime.UtcNow,
                };
                _context.BusinessAlerts.Add(entity);
                existingCodes.Add(key);
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BusinessAlert: Error persisting alerts");
        }
    }

    private static BusinessAlertDto MapToDto(BusinessAlert a)
    {
        return new BusinessAlertDto
        {
            Id = a.Id,
            AlertCode = a.AlertCode,
            Category = a.Category,
            Title = a.Title,
            Message = a.Message,
            Severity = a.Severity,
            SeverityLabel = a.Severity switch { 1 => "Critical", 2 => "Warning", _ => "Info" },
            SeverityColor = a.Severity switch { 1 => "red", 2 => "orange", _ => "blue" },
            Module = a.Module,
            PatientId = a.PatientId,
            ExaminationId = a.ExaminationId,
            AdmissionId = a.AdmissionId,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            Status = a.Status,
            StatusLabel = a.Status switch { 0 => "New", 1 => "Acknowledged", 2 => "Resolved", 3 => "Ignored", _ => "Unknown" },
            AcknowledgedAt = a.AcknowledgedAt,
            AcknowledgedBy = a.AcknowledgedBy,
            ActionTaken = a.ActionTaken,
            Details = a.Details,
            CreatedAt = a.CreatedAt,
        };
    }

    private static AlertCheckResultDto BuildResult(List<BusinessAlertDto> alerts)
    {
        return new AlertCheckResultDto
        {
            NewAlerts = alerts,
            TotalNewAlerts = alerts.Count,
            CriticalCount = alerts.Count(a => a.Severity == 1),
            WarningCount = alerts.Count(a => a.Severity == 2),
            InfoCount = alerts.Count(a => a.Severity == 3),
        };
    }

    // =====================================================================
    // RULES CATALOG (34 rules)
    // =====================================================================

    private static readonly List<BusinessAlertRuleDto> AlertRules = new()
    {
        // OPD (1-10)
        new() { AlertCode = "OPD-01", Category = "OPD", Title = "Di ung thuoc", Description = "Canh bao khi ke don thuoc BN co tien su di ung", DefaultSeverity = 1, Module = "OPD" },
        new() { AlertCode = "OPD-02", Category = "OPD", Title = "Tuong tac thuoc", Description = "Canh bao tuong tac giua cac thuoc dang ke", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-03", Category = "OPD", Title = "Chong chi dinh", Description = "Canh bao chong chi dinh dua tren chan doan", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-04", Category = "OPD", Title = "Trung don thuoc", Description = "Canh bao trung don thuoc trong 7 ngay", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-05", Category = "OPD", Title = "Lieu qua cao", Description = "Canh bao vuot lieu toi da cho phep", DefaultSeverity = 1, Module = "OPD" },
        new() { AlertCode = "OPD-06", Category = "OPD", Title = "Lieu qua thap", Description = "Canh bao duoi lieu dieu tri toi thieu", DefaultSeverity = 3, Module = "OPD" },
        new() { AlertCode = "OPD-07", Category = "OPD", Title = "Thuoc het han trong kho", Description = "Canh bao thuoc het han khi cap phat", DefaultSeverity = 1, Module = "Pharmacy" },
        new() { AlertCode = "OPD-08", Category = "OPD", Title = "Qua hen tai kham", Description = "Canh bao BN qua hen tai kham >7 ngay", DefaultSeverity = 3, Module = "OPD" },
        new() { AlertCode = "OPD-09", Category = "OPD", Title = "Ket qua XN bat thuong", Description = "Canh bao gia tri xet nghiem bat thuong/nguy kich", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "OPD-10", Category = "OPD", Title = "Sinh hieu bat thuong", Description = "Canh bao chi so sinh hieu ngoai gioi han", DefaultSeverity = 1, Module = "OPD" },

        // Inpatient (11-24)
        new() { AlertCode = "IPD-11", Category = "Inpatient", Title = "Nguy co nga", Description = "Canh bao nguy co nga cho BN >65 tuoi", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-12", Category = "Inpatient", Title = "Nguy co loet ti de", Description = "Canh bao nguy co loet dua tren Braden Scale", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-13", Category = "Inpatient", Title = "Nguy co suy dinh duong", Description = "Canh bao suy dinh duong theo NRS-2002/MUST", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-14", Category = "Inpatient", Title = "Nguy co nhiem khuan BV", Description = "Canh bao NKBV dua tren thiet bi/thoi gian", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-15", Category = "Inpatient", Title = "Nam vien dai", Description = "Canh bao thoi gian nam vien >21 ngay", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-16", Category = "Inpatient", Title = "Y lenh chua thuc hien", Description = "Canh bao y lenh qua han >4 gio", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-17", Category = "Inpatient", Title = "Thuoc chua phat", Description = "Canh bao don thuoc chua cap phat >2 gio", DefaultSeverity = 2, Module = "Pharmacy" },
        new() { AlertCode = "IPD-18", Category = "Inpatient", Title = "BN nang chua hoi chan", Description = "Canh bao ICU >48h khong hoi chan", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-19", Category = "Inpatient", Title = "Truyen dich sap het", Description = "Canh bao truyen dich con <30 phut", DefaultSeverity = 3, Module = "Inpatient" },
        new() { AlertCode = "IPD-20", Category = "Inpatient", Title = "Cay mau duong tinh", Description = "Canh bao ket qua cay mau duong tinh - xu tri ngay", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "IPD-21", Category = "Inpatient", Title = "Diem NEWS2 cao", Description = "Canh bao diem NEWS2 >= 5", DefaultSeverity = 1, Module = "Inpatient" },
        new() { AlertCode = "IPD-22", Category = "Inpatient", Title = "BN can xuat vien", Description = "Canh bao dieu tri hoan tat, cho xuat vien", DefaultSeverity = 3, Module = "Inpatient" },
        new() { AlertCode = "IPD-23", Category = "Inpatient", Title = "Giuong sap day", Description = "Canh bao cong suat giuong >85%", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-24", Category = "Inpatient", Title = "Bao hiem sap het han", Description = "Canh bao BHYT het han trong thoi gian nam vien", DefaultSeverity = 2, Module = "Insurance" },

        // Radiology (25-28)
        new() { AlertCode = "RAD-25", Category = "Radiology", Title = "Phu nu mang thai", Description = "Canh bao BN nu 15-49 tuoi chup buc xa", DefaultSeverity = 1, Module = "Radiology" },
        new() { AlertCode = "RAD-26", Category = "Radiology", Title = "Di ung thuoc can quang", Description = "Canh bao tien su di ung thuoc can quang", DefaultSeverity = 1, Module = "Radiology" },
        new() { AlertCode = "RAD-27", Category = "Radiology", Title = "Lieu buc xa tich luy", Description = "Canh bao vuot nguong buc xa nam", DefaultSeverity = 2, Module = "Radiology" },
        new() { AlertCode = "RAD-28", Category = "Radiology", Title = "Ket qua CDHA nguy hiem", Description = "Canh bao ket qua CDHA khan can xu tri ngay", DefaultSeverity = 1, Module = "Radiology" },

        // Lab (29-31)
        new() { AlertCode = "LAB-29", Category = "Lab", Title = "Gia tri nguy hiem", Description = "Canh bao gia tri XN nguy kich (panic values)", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "LAB-30", Category = "Lab", Title = "Mau bi tu choi", Description = "Canh bao mau XN bi tu choi do chat luong", DefaultSeverity = 2, Module = "Lab" },
        new() { AlertCode = "LAB-31", Category = "Lab", Title = "XN trung lap", Description = "Canh bao chi dinh XN trung trong 24h", DefaultSeverity = 2, Module = "Lab" },

        // Pharmacy (32)
        new() { AlertCode = "PHAR-32", Category = "Pharmacy", Title = "Ton kho thap", Description = "Canh bao thuoc/VT duoi nguong toi thieu", DefaultSeverity = 2, Module = "Pharmacy" },

        // Billing (33-34)
        new() { AlertCode = "BILL-33", Category = "Billing", Title = "Vuot tran BHXH", Description = "Canh bao vuot han muc BHYT nam", DefaultSeverity = 1, Module = "Billing" },
        new() { AlertCode = "BILL-34", Category = "Billing", Title = "Chua thanh toan", Description = "Canh bao cong no qua han >3 ngay", DefaultSeverity = 2, Module = "Billing" },

        // Inline safety (35-39)
        new() { AlertCode = "BLOOD-35", Category = "BloodBank", Title = "Khac nhom mau", Description = "Canh bao nhom mau/Rh khac giua BN va yeu cau truyen mau", DefaultSeverity = 1, Module = "BloodBank" },
        new() { AlertCode = "BHYT-36", Category = "BHYT", Title = "Vuot gioi han CLS/ngay", Description = "Canh bao vuot gioi han so luong CLS BHYT/ngay", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "BHYT-37", Category = "BHYT", Title = "Ngoai phac do BHYT", Description = "Canh bao thuoc/dich vu ngoai phac do BHYT theo ma ICD", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "REG-38", Category = "Registration", Title = "Don thuoc chua linh", Description = "Canh bao BN con don thuoc cu chua linh tai quay", DefaultSeverity = 2, Module = "Reception" },
        new() { AlertCode = "REG-39", Category = "Registration", Title = "Uoc tinh chi phi", Description = "Uoc tinh chi phi dich vu truoc khi kham", DefaultSeverity = 3, Module = "Reception" },

        // OPD operational (40)
        new() { AlertCode = "OPD-40", Category = "OPD", Title = "Qua tai luot kham", Description = $"Canh bao BS hoac phong kham vuot nguong {ClinicOverloadThreshold} luot/ngay", DefaultSeverity = 2, Module = "OPD" },
    };
}
