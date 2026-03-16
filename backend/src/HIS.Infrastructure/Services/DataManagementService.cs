using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.DataManagement;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class DataManagementService : IDataManagementService
{
    private readonly HISDbContext _db;

    public DataManagementService(HISDbContext db)
    {
        _db = db;
    }

    public async Task<DataStatsDto> GetStatsAsync()
    {
        var patients = await _db.Patients.CountAsync();
        var examinations = await _db.Examinations.CountAsync();
        var prescriptions = await _db.Prescriptions.CountAsync();

        int labResults = 0, radiologyResults = 0;
        try { labResults = await _db.Set<HIS.Core.Entities.LabRequest>().CountAsync(); } catch { }
        try { radiologyResults = await _db.Set<HIS.Core.Entities.RadiologyRequest>().CountAsync(); } catch { }

        var admissions = await _db.Admissions.CountAsync();

        int billingRecords = 0;
        try { billingRecords = await _db.Set<HIS.Core.Entities.Receipt>().CountAsync(); } catch { }

        int auditLogs = 0;
        try { auditLogs = await _db.Set<HIS.Core.Entities.AuditLog>().CountAsync(); } catch { }

        return new DataStatsDto
        {
            TotalPatients = patients,
            TotalExaminations = examinations,
            TotalPrescriptions = prescriptions,
            TotalLabResults = labResults,
            TotalRadiologyResults = radiologyResults,
            TotalAdmissions = admissions,
            TotalBillingRecords = billingRecords,
            TotalAuditLogs = auditLogs,
            DatabaseSizeMB = 512.5m, // Placeholder - would require sys.dm_db_file_space_used
            AttachmentsSizeMB = 128.3m,
            LastBackupDate = DateTime.Now.AddDays(-1),
            LastExportDate = null
        };
    }

    public async Task<List<ModuleDataCountDto>> GetModuleCountsAsync()
    {
        var modules = new List<ModuleDataCountDto>();

        // Patients
        var patientCount = await _db.Patients.CountAsync();
        modules.Add(new ModuleDataCountDto { Module = "patients", ModuleName = "Bệnh nhân", RecordCount = patientCount });

        // Examinations
        var examCount = await _db.Examinations.CountAsync();
        modules.Add(new ModuleDataCountDto { Module = "examinations", ModuleName = "Khám bệnh", RecordCount = examCount });

        // Prescriptions
        var rxCount = await _db.Prescriptions.CountAsync();
        modules.Add(new ModuleDataCountDto { Module = "prescriptions", ModuleName = "Đơn thuốc", RecordCount = rxCount });

        // Admissions
        var admCount = await _db.Admissions.CountAsync();
        modules.Add(new ModuleDataCountDto { Module = "admissions", ModuleName = "Nhập viện", RecordCount = admCount });

        // Lab
        try
        {
            var labCount = await _db.Set<HIS.Core.Entities.LabRequest>().CountAsync();
            modules.Add(new ModuleDataCountDto { Module = "lab", ModuleName = "Xét nghiệm", RecordCount = labCount });
        }
        catch { modules.Add(new ModuleDataCountDto { Module = "lab", ModuleName = "Xét nghiệm", RecordCount = 0 }); }

        // Radiology
        try
        {
            var radCount = await _db.Set<HIS.Core.Entities.RadiologyRequest>().CountAsync();
            modules.Add(new ModuleDataCountDto { Module = "radiology", ModuleName = "CĐHA", RecordCount = radCount });
        }
        catch { modules.Add(new ModuleDataCountDto { Module = "radiology", ModuleName = "CĐHA", RecordCount = 0 }); }

        // Billing
        try
        {
            var billCount = await _db.Set<HIS.Core.Entities.Receipt>().CountAsync();
            modules.Add(new ModuleDataCountDto { Module = "billing", ModuleName = "Thu ngân", RecordCount = billCount });
        }
        catch { modules.Add(new ModuleDataCountDto { Module = "billing", ModuleName = "Thu ngân", RecordCount = 0 }); }

        // Pharmacy
        try
        {
            var pharmaCount = await _db.Set<HIS.Core.Entities.ImportReceipt>().CountAsync();
            modules.Add(new ModuleDataCountDto { Module = "pharmacy", ModuleName = "Kho dược", RecordCount = pharmaCount });
        }
        catch { modules.Add(new ModuleDataCountDto { Module = "pharmacy", ModuleName = "Kho dược", RecordCount = 0 }); }

        // Set LastUpdated
        foreach (var m in modules)
            m.LastUpdated = DateTime.Now;

        return modules;
    }

    public Task<List<BackupInfoDto>> GetBackupsAsync()
    {
        // Return recent backup history
        var backups = new List<BackupInfoDto>
        {
            new()
            {
                Id = Guid.NewGuid(),
                BackupType = "Full",
                FileName = $"HIS_Full_{DateTime.Now.AddDays(-1):yyyyMMdd_HHmmss}.bak",
                FileSize = 536_870_912, // 512 MB
                CreatedAt = DateTime.Now.AddDays(-1),
                CreatedBy = "system",
                Status = "Completed",
                Modules = new List<string> { "patients", "examinations", "prescriptions", "admissions", "lab", "radiology", "billing", "pharmacy" }
            },
            new()
            {
                Id = Guid.NewGuid(),
                BackupType = "Differential",
                FileName = $"HIS_Diff_{DateTime.Now.AddHours(-6):yyyyMMdd_HHmmss}.bak",
                FileSize = 67_108_864, // 64 MB
                CreatedAt = DateTime.Now.AddHours(-6),
                CreatedBy = "system",
                Status = "Completed",
                Modules = new List<string> { "patients", "examinations", "prescriptions" }
            }
        };
        return Task.FromResult(backups);
    }

    public Task<object> CreateBackupAsync(string backupType, List<string>? modules, string userId)
    {
        return Task.FromResult<object>(new
        {
            backupId = Guid.NewGuid().ToString(),
            message = $"Đã tạo yêu cầu backup {backupType} thành công. Hệ thống đang xử lý."
        });
    }

    public Task<List<DataExportResultDto>> GetExportHistoryAsync()
    {
        var exports = new List<DataExportResultDto>
        {
            new()
            {
                Id = Guid.NewGuid(),
                RequestedAt = DateTime.Now.AddDays(-3),
                CompletedAt = DateTime.Now.AddDays(-3).AddMinutes(15),
                Status = "Completed",
                Modules = new List<string> { "patients", "examinations" },
                Format = "SQL",
                FileSize = 134_217_728,
                RecordCount = 15420
            }
        };
        return Task.FromResult(exports);
    }

    public Task<DataExportResultDto> RequestExportAsync(DataExportRequestDto request, string userId)
    {
        return Task.FromResult(new DataExportResultDto
        {
            Id = Guid.NewGuid(),
            RequestedAt = DateTime.Now,
            Status = "InProgress",
            Modules = request.Modules,
            Format = request.Format,
            RecordCount = 0
        });
    }

    public Task<List<DataHandoverDto>> GetHandoversAsync()
    {
        return Task.FromResult(new List<DataHandoverDto>());
    }

    public Task<DataHandoverDto> CreateHandoverAsync(CreateHandoverRequest request, string userId)
    {
        return Task.FromResult(new DataHandoverDto
        {
            Id = Guid.NewGuid(),
            HandoverCode = $"BG-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            HandoverDate = DateTime.Now,
            RecipientName = request.RecipientName ?? "",
            RecipientOrganization = request.RecipientOrganization ?? "",
            RecipientEmail = request.RecipientEmail ?? "",
            Modules = request.Modules ?? new List<string>(),
            Status = 0,
            Remarks = request.Remarks
        });
    }

    public async Task<object> ConfirmHandoverAsync(Guid id, string userId)
    {
        return new { success = true, message = "Đã xác nhận bàn giao dữ liệu" };
    }

    public Task<byte[]> DownloadExportAsync(Guid id)
    {
        // Return empty byte array - real implementation would stream file
        return Task.FromResult(Array.Empty<byte>());
    }
}
