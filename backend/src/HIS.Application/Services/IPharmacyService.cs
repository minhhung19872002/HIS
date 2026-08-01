using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HIS.Application.Services
{
    /// <summary>Issue #436: một dòng thuốc khi tạo phiếu điều chuyển kho.
    /// Nhận MedicineId (v2) hoặc MedicationCode (v1 legacy) — service tự resolve code → id.</summary>
    public record TransferItemInput(Guid? MedicineId, string? MedicationCode, decimal Quantity, string? BatchNumber, string? Note);

    /// <summary>Issue #202: kết quả CompleteDispensing để controller map đúng HTTP status verbatim.</summary>
    public class PharmacyDispenseResultDto
    {
        /// <summary>Không tìm thấy đơn thuốc → 404.</summary>
        public bool NotFound { get; set; }
        /// <summary>Đơn chưa gán kho + không có kho lẻ mặc định → 400 + Message.</summary>
        public bool NoWarehouse { get; set; }
        public string? Message { get; set; }
    }

    /// <summary>
    /// Issue #202: service cho PharmacyController (nhà thuốc/quầy phát) — bỏ HISDbContext khỏi controller.
    /// Giữ nguyên logic FEFO/trừ kho (đi qua IWarehouseCompleteService) + response shape + status code.
    /// </summary>
    public interface IPharmacyService
    {
        // Pending prescriptions + dispensing
        Task<object> GetPendingPrescriptionsAsync();
        Task<bool> AcceptPrescriptionAsync(Guid prescriptionId);
        Task<bool> RejectPrescriptionAsync(Guid prescriptionId, string? reason);
        Task<object> GetMedicationItemsAsync(Guid prescriptionId);
        Task<PharmacyDispenseResultDto> CompleteDispensingAsync(Guid prescriptionId, Guid userId);
        Task<int?> UpdateDispensedQuantityAsync(Guid itemId, decimal quantity, string? batchNumber);

        // Alerts
        Task<object> GetAlertsAsync(bool? acknowledged);
        Task<bool> AcknowledgeAlertAsync(Guid alertId);
        Task<bool> ResolveAlertAsync(Guid alertId);

        // Inventory
        Task<object> GetInventoryItemsAsync(string? warehouseId);
        Task<object> GetInventoryHistoryAsync(Guid medicationId);

        // Reports + ADR + drug label
        Task<object> GetAdrReportsAsync();
        /// <summary>Tạo bản ghi ADR (PharmacyGppRecord RecordType=1). Trả về record đã lưu để controller compose response.</summary>
        Task<HIS.Core.Entities.PharmacyGppRecord> CreateAdrReportAsync(string? onsetDate, string? description, string? reactionType, string? medicationName, string? outcome, Guid? userId);
        Task<object> CancelDispensedPrescriptionAsync(Guid prescriptionId, string reason, Guid userId);
        Task<object> CreateBillingAfterDispensingAsync(Guid issueId, Guid userId);
        /// <summary>In nhãn thuốc → HTML. null = không tìm thấy đơn.</summary>
        Task<string?> PrintDrugLabelAsync(Guid prescriptionId);

        // Transfers
        Task<object> GetTransferRequestsAsync(string? status);
        /// <summary>Tạo phiếu điều chuyển kho (kèm dòng thuốc nếu có — #436). Trả về (id, transferCode) đã lưu.
        /// Lỗi nghiệp vụ (kho trùng / thuốc không có trong kho gửi / vượt tồn) → InvalidOperationException.</summary>
        Task<(Guid Id, string TransferCode)> CreateTransferAsync(Guid fromWarehouseId, Guid toWarehouseId, string? note, string? requestedBy, IReadOnlyList<TransferItemInput>? items = null);
        Task<bool> ApproveTransferAsync(Guid transferId);
        Task<bool> RejectTransferAsync(Guid transferId, string? reason);
        Task<bool> ReceiveTransferAsync(Guid transferId);

        // Medication reconciliation (#438) — READ-ONLY, phase 1 chỉ báo cáo
        /// <summary>Đối chiếu y lệnh thuốc nội trú vs cấp phát thực tế theo ĐỢT ĐIỀU TRỊ
        /// (khoá MedicalRecordId + MedicineId). Lọc theo HSBA hoặc khoa + khoảng ngày kê.</summary>
        Task<HIS.Application.DTOs.Pharmacy.MedicationReconciliationResultDto> GetMedicationReconciliationAsync(
            Guid? medicalRecordId, Guid? departmentId, DateTime? fromDate, DateTime? toDate);
    }
}
