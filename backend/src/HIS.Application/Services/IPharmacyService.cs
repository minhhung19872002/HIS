using System;
using System.Threading.Tasks;

namespace HIS.Application.Services
{
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
        /// <summary>Tạo phiếu điều chuyển kho. Trả về (id, transferCode) đã lưu.</summary>
        Task<(Guid Id, string TransferCode)> CreateTransferAsync(Guid fromWarehouseId, Guid toWarehouseId, string? note, string? requestedBy);
        Task<bool> ApproveTransferAsync(Guid transferId);
        Task<bool> RejectTransferAsync(Guid transferId, string? reason);
        Task<bool> ReceiveTransferAsync(Guid transferId);
    }
}
