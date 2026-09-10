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
        new() { AlertCode = "OPD-01", Category = "OPD", Title = "Dị ứng thuốc", Description = "Cảnh báo khi kê đơn thuốc BN có tiền sử dị ứng", DefaultSeverity = 1, Module = "OPD" },
        new() { AlertCode = "OPD-02", Category = "OPD", Title = "Tương tác thuốc", Description = "Cảnh báo tương tác giữa các thuốc đang kê", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-03", Category = "OPD", Title = "Chống chỉ định", Description = "Cảnh báo chống chỉ định dựa trên chẩn đoán", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-04", Category = "OPD", Title = "Trùng đơn thuốc", Description = "Cảnh báo trùng đơn thuốc trong 7 ngày", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "OPD-05", Category = "OPD", Title = "Liều quá cao", Description = "Cảnh báo vượt liều tối đa cho phép", DefaultSeverity = 1, Module = "OPD" },
        new() { AlertCode = "OPD-06", Category = "OPD", Title = "Liều quá thấp", Description = "Cảnh báo dưới liều điều trị tối thiểu", DefaultSeverity = 3, Module = "OPD" },
        new() { AlertCode = "OPD-07", Category = "OPD", Title = "Thuốc hết hạn trong kho", Description = "Cảnh báo thuốc hết hạn khi cấp phát", DefaultSeverity = 1, Module = "Pharmacy" },
        new() { AlertCode = "OPD-08", Category = "OPD", Title = "Quá hẹn tái khám", Description = "Cảnh báo BN quá hẹn tái khám >7 ngày", DefaultSeverity = 3, Module = "OPD" },
        new() { AlertCode = "OPD-09", Category = "OPD", Title = "Kết quả XN bất thường", Description = "Cảnh báo giá trị xét nghiệm bất thường/nguy kịch", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "OPD-10", Category = "OPD", Title = "Sinh hiệu bất thường", Description = "Cảnh báo chỉ số sinh hiệu ngoài giới hạn", DefaultSeverity = 1, Module = "OPD" },

        // Inpatient (11-24)
        new() { AlertCode = "IPD-11", Category = "Inpatient", Title = "Nguy cơ ngã", Description = "Cảnh báo nguy cơ ngã cho BN >65 tuổi", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-12", Category = "Inpatient", Title = "Nguy cơ loét tì đè", Description = "Cảnh báo nguy cơ loét dựa trên Braden Scale", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-13", Category = "Inpatient", Title = "Nguy cơ suy dinh dưỡng", Description = "Cảnh báo suy dinh dưỡng theo NRS-2002/MUST", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-14", Category = "Inpatient", Title = "Nguy cơ nhiễm khuẩn BV", Description = "Cảnh báo NKBV dựa trên thiết bị/thời gian", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-15", Category = "Inpatient", Title = "Nằm viện dài", Description = "Cảnh báo thời gian nằm viện >21 ngày", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-16", Category = "Inpatient", Title = "Y lệnh chưa thực hiện", Description = "Cảnh báo y lệnh quá hạn >4 giờ", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-17", Category = "Inpatient", Title = "Thuốc chưa phát", Description = "Cảnh báo đơn thuốc chưa cấp phát >2 giờ", DefaultSeverity = 2, Module = "Pharmacy" },
        new() { AlertCode = "IPD-18", Category = "Inpatient", Title = "BN nặng chưa hội chẩn", Description = "Cảnh báo ICU >48h không hội chẩn", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-19", Category = "Inpatient", Title = "Truyền dịch sắp hết", Description = "Cảnh báo truyền dịch còn <30 phút", DefaultSeverity = 3, Module = "Inpatient" },
        new() { AlertCode = "IPD-20", Category = "Inpatient", Title = "Cấy máu dương tính", Description = "Cảnh báo kết quả cấy máu dương tính - xử trí ngay", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "IPD-21", Category = "Inpatient", Title = "Điểm NEWS2 cao", Description = "Cảnh báo điểm NEWS2 >= 5", DefaultSeverity = 1, Module = "Inpatient" },
        new() { AlertCode = "IPD-22", Category = "Inpatient", Title = "BN cần xuất viện", Description = "Cảnh báo điều trị hoàn tất, chờ xuất viện", DefaultSeverity = 3, Module = "Inpatient" },
        new() { AlertCode = "IPD-23", Category = "Inpatient", Title = "Giường sắp đầy", Description = "Cảnh báo công suất giường >85%", DefaultSeverity = 2, Module = "Inpatient" },
        new() { AlertCode = "IPD-24", Category = "Inpatient", Title = "Bảo hiểm sắp hết hạn", Description = "Cảnh báo BHYT hết hạn trong thời gian nằm viện", DefaultSeverity = 2, Module = "Insurance" },

        // Radiology (25-28)
        new() { AlertCode = "RAD-25", Category = "Radiology", Title = "Phụ nữ mang thai", Description = "Cảnh báo BN nữ 15-49 tuổi chụp bức xạ", DefaultSeverity = 1, Module = "Radiology" },
        new() { AlertCode = "RAD-26", Category = "Radiology", Title = "Dị ứng thuốc cản quang", Description = "Cảnh báo tiền sử dị ứng thuốc cản quang", DefaultSeverity = 1, Module = "Radiology" },
        new() { AlertCode = "RAD-27", Category = "Radiology", Title = "Liều bức xạ tích luỹ", Description = "Cảnh báo vượt ngưỡng bức xạ năm", DefaultSeverity = 2, Module = "Radiology" },
        new() { AlertCode = "RAD-28", Category = "Radiology", Title = "Kết quả CĐHA nguy hiểm", Description = "Cảnh báo kết quả CĐHA khẩn cần xử trí ngay", DefaultSeverity = 1, Module = "Radiology" },

        // Lab (29-31)
        new() { AlertCode = "LAB-29", Category = "Lab", Title = "Giá trị nguy hiểm", Description = "Cảnh báo giá trị XN nguy kịch (panic values)", DefaultSeverity = 1, Module = "Lab" },
        new() { AlertCode = "LAB-30", Category = "Lab", Title = "Mẫu bị từ chối", Description = "Cảnh báo mẫu XN bị từ chối do chất lượng", DefaultSeverity = 2, Module = "Lab" },
        new() { AlertCode = "LAB-31", Category = "Lab", Title = "XN trùng lặp", Description = "Cảnh báo chỉ định XN trùng trong 24h", DefaultSeverity = 2, Module = "Lab" },

        // Pharmacy (32)
        new() { AlertCode = "PHAR-32", Category = "Pharmacy", Title = "Tồn kho thấp", Description = "Cảnh báo thuốc/VT dưới ngưỡng tối thiểu", DefaultSeverity = 2, Module = "Pharmacy" },

        // Billing (33-34)
        new() { AlertCode = "BILL-33", Category = "Billing", Title = "Vượt trần BHXH", Description = "Cảnh báo vượt hạn mức BHYT năm", DefaultSeverity = 1, Module = "Billing" },
        new() { AlertCode = "BILL-34", Category = "Billing", Title = "Chưa thanh toán", Description = "Cảnh báo công nợ quá hạn >3 ngày", DefaultSeverity = 2, Module = "Billing" },

        // Inline safety (35-39)
        new() { AlertCode = "BLOOD-35", Category = "BloodBank", Title = "Khác nhóm máu", Description = "Cảnh báo nhóm máu/Rh khác giữa BN và yêu cầu truyền máu", DefaultSeverity = 1, Module = "BloodBank" },
        new() { AlertCode = "BHYT-36", Category = "BHYT", Title = "Vượt giới hạn CLS/ngày", Description = "Cảnh báo vượt giới hạn số lượng CLS BHYT/ngày", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "BHYT-37", Category = "BHYT", Title = "Ngoài phác đồ BHYT", Description = "Cảnh báo thuốc/dịch vụ ngoài phác đồ BHYT theo mã ICD", DefaultSeverity = 2, Module = "OPD" },
        new() { AlertCode = "REG-38", Category = "Registration", Title = "Đơn thuốc chưa lĩnh", Description = "Cảnh báo BN còn đơn thuốc cũ chưa lĩnh tại quầy", DefaultSeverity = 2, Module = "Reception" },
        new() { AlertCode = "REG-39", Category = "Registration", Title = "Ước tính chi phí", Description = "Ước tính chi phí dịch vụ trước khi khám", DefaultSeverity = 3, Module = "Reception" },

        // OPD operational (40)
        new() { AlertCode = "OPD-40", Category = "OPD", Title = "Quá tải lượt khám", Description = $"Cảnh báo BS hoặc phòng khám vượt ngưỡng {ClinicOverloadThreshold} lượt/ngày", DefaultSeverity = 2, Module = "OPD" },
    };
}
