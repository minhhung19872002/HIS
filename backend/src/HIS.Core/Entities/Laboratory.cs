namespace HIS.Core.Entities;

/// <summary>
/// Phiếu yêu cầu xét nghiệm
/// </summary>
public class LabRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty;
    public Guid? ExaminationId { get; set; }
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid RequestingDoctorId { get; set; }
    public Guid? RoomId { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime RequestDate { get; set; }
    public int Priority { get; set; } // 1=Normal, 2=Urgent, 3=Emergency
    public int Status { get; set; } // 0=Pending, 1=SampleCollected, 2=Processing, 3=Completed, 4=Approved, 5=Cancelled
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? ClinicalInfo { get; set; }
    public int PatientType { get; set; } // 1=BHYT, 2=Viện phí, 3=Dịch vụ
    public string? InsuranceNumber { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
    public bool IsPaid { get; set; }
    public string? Notes { get; set; }
    public string? CancelledBy { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }
    public virtual Examination? Examination { get; set; }
    public virtual User? RequestingDoctor { get; set; }
    public virtual Room? Room { get; set; }
    public virtual Department? Department { get; set; }
    public virtual User? CreatedByUser { get; set; }
    public virtual User? ApprovedByUser { get; set; }
    public virtual ICollection<LabRequestItem> Items { get; set; } = new List<LabRequestItem>();
}

/// <summary>
/// Chi tiết xét nghiệm trong phiếu yêu cầu
/// </summary>
public class LabRequestItem : BaseEntity
{
    public Guid LabRequestId { get; set; }
    public Guid ServiceId { get; set; }
    public string TestCode { get; set; } = string.Empty; // Ma xet nghiem
    public string TestName { get; set; } = string.Empty; // Ten xet nghiem
    public string? SampleType { get; set; } // Máu, Nước tiểu, Phân, Dịch...
    public string? SampleBarcode { get; set; }
    public string? SampleLocation { get; set; }
    public string? SampleCondition { get; set; }
    public DateTime? SampleCollectedAt { get; set; }
    public Guid? SampleCollectedBy { get; set; }
    public DateTime? ProcessingStartAt { get; set; }
    public DateTime? ProcessingEndAt { get; set; }
    public Guid? ProcessedBy { get; set; }
    public int Status { get; set; } // 0=Pending, 1=SampleCollected, 2=Processing, 3=Completed, 4=Approved, 5=Rejected
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal PatientPrice { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? RejectedAt { get; set; }
    public Guid? RejectedBy { get; set; }
    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }
    public string? TechnicianNote { get; set; }

    // Navigation
    public virtual LabRequest? LabRequest { get; set; }
    public virtual Service? Service { get; set; }
    public virtual User? CollectedByUser { get; set; }
    public virtual User? ProcessedByUser { get; set; }
    public virtual User? ApprovedByUser { get; set; }
    public virtual User? RejectedByUser { get; set; }
    public virtual ICollection<LabResult> Results { get; set; } = new List<LabResult>();
}

/// <summary>
/// Kết quả xét nghiệm
/// </summary>
public class LabResult : BaseEntity
{
    public Guid LabRequestItemId { get; set; }
    public string ParameterCode { get; set; } = string.Empty;
    public string ParameterName { get; set; } = string.Empty;
    public int SequenceNumber { get; set; }
    public string? Result { get; set; }
    public string? ResultValue { get; set; } // Gia tri ket qua (string)
    public DateTime? ResultDate { get; set; } // Ngay tra ket qua
    public int Status { get; set; } // 0=Pending, 1=Completed, 2=Approved
    public decimal? NumericResult { get; set; }
    public string? TextResult { get; set; }
    public string? Unit { get; set; }
    public decimal? ReferenceMin { get; set; }
    public decimal? ReferenceMax { get; set; }
    public string? ReferenceRange { get; set; }
    public string? ReferenceText { get; set; }
    public bool IsAbnormal { get; set; }
    public int? AbnormalType { get; set; } // 1=High, 2=Low, 3=Critical
    public string? MachineCode { get; set; }
    public string? MachineName { get; set; }
    public string? MethodName { get; set; }
    public DateTime? ResultedAt { get; set; }
    public Guid? ResultedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public bool IsCritical { get; set; }
    public bool RequiresFollowUp { get; set; }
    public string? Notes { get; set; }
    public string? InterpretationNote { get; set; }
    public string? PreviousResult { get; set; }
    public DateTime? PreviousResultDate { get; set; }

    // Navigation
    public virtual LabRequestItem? LabRequestItem { get; set; }
    public virtual User? ResultedByUser { get; set; }
    public virtual User? ApprovedByUser { get; set; }
}

/// <summary>
/// Mẫu đặt trước thuốc/vật tư
/// </summary>
public class StockReservation : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid? BatchId { get; set; }
    public decimal Quantity { get; set; }
    public string ReferenceType { get; set; } = string.Empty; // Prescription, LabRequest, etc.
    public Guid ReferenceId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int Status { get; set; } // 0=Active, 1=Used, 2=Released, 3=Expired
    public string? Notes { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual InventoryItem? Batch { get; set; }
}

/// <summary>
/// Cảnh báo thuốc hết hạn
/// </summary>
public class ExpiryAlert : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid InventoryItemId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public decimal Quantity { get; set; }
    public int AlertLevel { get; set; } // 1=Critical (<1 month), 2=Warning (1-3 months), 3=Info (3-6 months)
    public int Status { get; set; } // 0=New, 1=Acknowledged, 2=Resolved, 3=Ignored
    public DateTime? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedBy { get; set; }
    public string? ActionTaken { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}

/// <summary>
/// Cảnh báo tồn kho thấp
/// </summary>
public class LowStockAlert : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal CurrentQuantity { get; set; }
    public decimal MinimumQuantity { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal SuggestedOrderQuantity { get; set; }
    public int AlertLevel { get; set; } // 1=Critical, 2=Warning, 3=Info
    public int Status { get; set; } // 0=New, 1=Acknowledged, 2=Ordered, 3=Resolved
    public DateTime? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedBy { get; set; }
    public string? ActionTaken { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
}

/// <summary>
/// Phiếu chuyển kho
/// </summary>
public class WarehouseTransfer : BaseEntity
{
    public string TransferCode { get; set; } = string.Empty;
    public Guid FromWarehouseId { get; set; }
    public Guid ToWarehouseId { get; set; }
    public DateTime TransferDate { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Approved, 2=InTransit, 3=Received, 4=Cancelled
    public decimal TotalAmount { get; set; }
    public string? RequestedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public Guid? DeliveredBy { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public Guid? ReceivedBy { get; set; }
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }

    // Navigation
    public virtual Warehouse? FromWarehouse { get; set; }
    public virtual Warehouse? ToWarehouse { get; set; }
    public virtual ICollection<WarehouseTransferItem> Items { get; set; } = new List<WarehouseTransferItem>();
}

/// <summary>
/// Chi tiết phiếu chuyển kho
/// </summary>
public class WarehouseTransferItem : BaseEntity
{
    public Guid WarehouseTransferId { get; set; }
    public Guid MedicineId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal RequestedQuantity { get; set; }
    public decimal? DeliveredQuantity { get; set; }
    public decimal? ReceivedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual WarehouseTransfer? WarehouseTransfer { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}

/// <summary>
/// Phiếu điều chỉnh tồn kho
/// </summary>
public class StockAdjustment : BaseEntity
{
    public string AdjustmentCode { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateTime AdjustmentDate { get; set; }
    public int AdjustmentType { get; set; } // 1=Inventory, 2=Damage, 3=Expired, 4=Error, 5=Other
    public int Status { get; set; } // 0=Pending, 1=Approved, 2=Cancelled
    public string? Reason { get; set; }
    public decimal TotalDifferenceAmount { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public string? ApprovalNotes { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Warehouse? Warehouse { get; set; }
    public virtual ICollection<StockAdjustmentItem> Items { get; set; } = new List<StockAdjustmentItem>();
}

/// <summary>
/// Chi tiết phiếu điều chỉnh
/// </summary>
public class StockAdjustmentItem : BaseEntity
{
    public Guid StockAdjustmentId { get; set; }
    public Guid MedicineId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal SystemQuantity { get; set; }
    public decimal ActualQuantity { get; set; }
    public decimal DifferenceQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DifferenceAmount { get; set; }
    public string? Reason { get; set; }

    // Navigation
    public virtual StockAdjustment? StockAdjustment { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}

/// <summary>
/// Lịch sử xuất nhập kho
/// </summary>
public class StockMovement : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public int MovementType { get; set; } // 1=Import, 2=Export, 3=Transfer, 4=Adjust, 5=Return
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? ReferenceType { get; set; } // ImportReceipt, ExportReceipt, Transfer, Adjustment
    public Guid? ReferenceId { get; set; }
    public string? ReferenceCode { get; set; }
    public DateTime MovementDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}

/// <summary>
/// Cài đặt ngưỡng tồn kho
/// </summary>
public class StockThreshold : BaseEntity
{
    public Guid MedicineId { get; set; }
    public Guid? WarehouseId { get; set; }
    public decimal MinimumQuantity { get; set; }
    public decimal MaximumQuantity { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal ReorderQuantity { get; set; }
    public bool IsActive { get; set; }

    // Navigation
    public virtual Medicine? Medicine { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
}

/// <summary>
/// Yêu cầu cấp phát thuốc
/// </summary>
public class DispenseRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty;
    public Guid PrescriptionId { get; set; }
    public Guid PatientId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateTime RequestDate { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Processing, 2=Dispensed, 3=PartialDispensed, 4=Cancelled
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public Guid? DispensedBy { get; set; }
    public DateTime? DispensedAt { get; set; }
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }

    // Navigation
    public virtual Prescription? Prescription { get; set; }
    public virtual Patient? Patient { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual User? DispensedByUser { get; set; }
    public virtual ICollection<DispenseRequestItem> Items { get; set; } = new List<DispenseRequestItem>();
}

/// <summary>
/// Chi tiết cấp phát thuốc
/// </summary>
public class DispenseRequestItem : BaseEntity
{
    public Guid DispenseRequestId { get; set; }
    public Guid PrescriptionDetailId { get; set; }
    public Guid MedicineId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal OrderedQuantity { get; set; }
    public decimal DispensedQuantity { get; set; }
    public decimal? ReturnedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Dispensed, 2=PartialDispensed, 3=OutOfStock, 4=Returned
    public string? Notes { get; set; }

    // Navigation
    public virtual DispenseRequest? DispenseRequest { get; set; }
    public virtual PrescriptionDetail? PrescriptionDetail { get; set; }
    public virtual Medicine? Medicine { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
}
