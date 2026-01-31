namespace HIS.Application.Workflows;

/// <summary>
/// Định nghĩa các workflow chính liên kết 17 phân hệ HIS
/// </summary>

#region 1. OPD WORKFLOW - Luồng Khám bệnh Ngoại trú

/// <summary>
/// Luồng 1: Khám bệnh Ngoại trú (OPD Flow)
/// Liên kết: Tiếp đón → Khám bệnh → Chỉ định → XN/CĐHA → Kho Dược → Thu ngân → BHYT
/// </summary>
public interface IOPDWorkflowService
{
    // Step 1: Tiếp đón (Module 1)
    Task<VisitRegistrationResult> RegisterVisitAsync(PatientRegistrationDto request);
    Task<InsuranceVerificationResult> VerifyInsuranceAsync(string insuranceNumber);
    Task<QueueTicketResult> AssignQueueAsync(Guid visitId, Guid roomId);

    // Step 2: Khám bệnh (Module 2)
    Task<ExaminationResult> StartExaminationAsync(Guid visitId, Guid doctorId);
    Task<ExaminationResult> RecordVitalSignsAsync(Guid examinationId, VitalSignsDto vitalSigns);
    Task<ExaminationResult> RecordDiagnosisAsync(Guid examinationId, DiagnosisDto diagnosis);

    // Step 3: Chỉ định dịch vụ (Module 4)
    Task<ServiceOrderResult> CreateServiceOrderAsync(Guid examinationId, List<ServiceOrderItemDto> items);

    // Step 4: Xét nghiệm & CĐHA (Module 7, 8)
    Task<LabOrderResult> SendLabOrderAsync(Guid serviceOrderId);
    Task<ImagingOrderResult> SendImagingOrderAsync(Guid serviceOrderId);
    Task WaitForResultsAsync(Guid examinationId);

    // Step 5: Kết luận & Kê đơn
    Task<ConclusionResult> RecordConclusionAsync(Guid examinationId, ConclusionDto conclusion);
    Task<PrescriptionResult> CreatePrescriptionAsync(Guid examinationId, PrescriptionDto prescription);

    // Step 6: Xuất thuốc (Module 5)
    Task<DispenseResult> DispenseMedicineAsync(Guid prescriptionId);

    // Step 7: Thanh toán (Module 10)
    Task<InvoiceResult> GenerateInvoiceAsync(Guid visitId);
    Task<PaymentResult> ProcessPaymentAsync(Guid invoiceId, PaymentDto payment);

    // Step 8: BHYT (Module 12)
    Task<InsuranceClaimResult> SubmitInsuranceClaimAsync(Guid visitId);
}

#endregion

#region 2. IPD WORKFLOW - Luồng Điều trị Nội trú

/// <summary>
/// Luồng 2: Điều trị Nội trú (IPD Flow)
/// Liên kết: Khám bệnh → Nội trú → Chỉ định → XN/CĐHA/PTTT → Kho Dược → Thu ngân → BHYT → HSBA
/// </summary>
public interface IIPDWorkflowService
{
    // Step 1: Nhập viện (Module 3)
    Task<AdmissionResult> AdmitPatientAsync(Guid visitId, AdmissionRequestDto request);
    Task<BedAssignmentResult> AssignBedAsync(Guid admissionId, Guid bedId);

    // Step 2: Điều trị hàng ngày
    Task<TreatmentSheetResult> CreateDailyTreatmentSheetAsync(Guid admissionId, DateTime date);
    Task<MedicalOrderResult> CreateMedicalOrderAsync(Guid treatmentSheetId, MedicalOrderDto order);

    // Step 3: Chỉ định CLS (Module 4)
    Task<ServiceOrderResult> CreateInpatientServiceOrderAsync(Guid treatmentSheetId, List<ServiceOrderItemDto> items);

    // Step 4: Kê đơn thuốc nội trú
    Task<PrescriptionResult> CreateInpatientPrescriptionAsync(Guid treatmentSheetId, PrescriptionDto prescription);

    // Step 5: Tổng hợp & Xuất thuốc (Module 5)
    Task<RequisitionResult> CreateDrugRequisitionAsync(Guid wardId, DateTime date);
    Task<DispenseResult> DispenseToWardAsync(Guid requisitionId);

    // Step 6: Phẫu thuật (Module 6) - nếu có
    Task<SurgeryScheduleResult> ScheduleSurgeryAsync(Guid admissionId, SurgeryRequestDto request);
    Task<SurgeryResult> CompleteSurgeryAsync(Guid surgeryId, SurgeryRecordDto record);

    // Step 7: Theo dõi điều dưỡng
    Task<NursingCareResult> RecordNursingCareAsync(Guid admissionId, NursingCareDto care);
    Task<VitalSignsResult> RecordVitalSignsAsync(Guid admissionId, VitalSignsDto vitalSigns);

    // Step 8: Ra viện
    Task<DischargeResult> DischargePatientAsync(Guid admissionId, DischargeRequestDto request);

    // Step 9: Thanh toán (Module 10)
    Task<InvoiceResult> GenerateInpatientInvoiceAsync(Guid admissionId);
    Task<PaymentResult> ProcessInpatientPaymentAsync(Guid invoiceId, PaymentDto payment);

    // Step 10: BHYT & Lưu trữ (Module 12, 16)
    Task<InsuranceClaimResult> SubmitInpatientClaimAsync(Guid admissionId);
    Task<ArchiveResult> ArchiveMedicalRecordAsync(Guid admissionId);
}

#endregion

#region 3. SURGERY WORKFLOW - Luồng Phẫu thuật Thủ thuật

/// <summary>
/// Luồng 3: Phẫu thuật Thủ thuật (Surgery Flow)
/// Liên kết: Khoa lâm sàng → PTTT → Kho Dược → Kho Máu → Tài chính
/// </summary>
public interface ISurgeryWorkflowService
{
    // Step 1: Yêu cầu PTTT
    Task<SurgeryRequestResult> RequestSurgeryAsync(Guid admissionId, SurgeryRequestDto request);

    // Step 2: Hội chẩn (nếu cần)
    Task<ConsultationResult> RequestConsultationAsync(Guid surgeryRequestId);
    Task<ConsultationResult> ApproveConsultationAsync(Guid consultationId, ConsultationApprovalDto approval);

    // Step 3: Duyệt & Lên lịch
    Task<SurgeryApprovalResult> ApproveSurgeryAsync(Guid surgeryRequestId, Guid approverId);
    Task<SurgeryScheduleResult> ScheduleSurgeryAsync(Guid surgeryRequestId, SurgeryScheduleDto schedule);

    // Step 4: Chuẩn bị trước mổ
    Task<PreOpCheckResult> PerformPreOpCheckAsync(Guid surgeryScheduleId);
    Task<BloodReservationResult> ReserveBloodAsync(Guid surgeryScheduleId, BloodReservationDto request);
    Task<MaterialPreparationResult> PrepareMaterialsAsync(Guid surgeryScheduleId);

    // Step 5: Tiếp nhận vào phòng mổ
    Task<SurgeryAdmissionResult> AdmitToOperatingRoomAsync(Guid surgeryScheduleId);

    // Step 6: Thực hiện PTTT
    Task<AnesthesiaResult> RecordAnesthesiaAsync(Guid surgeryId, AnesthesiaRecordDto record);
    Task<SurgeryProgressResult> RecordSurgeryProgressAsync(Guid surgeryId, SurgeryProgressDto progress);
    Task<IntraOpMaterialResult> RecordIntraOpMaterialsAsync(Guid surgeryId, List<MaterialUsageDto> materials);

    // Step 7: Kết thúc PTTT
    Task<SurgeryCompletionResult> CompleteSurgeryAsync(Guid surgeryId, SurgeryCompletionDto completion);
    Task<RecoveryResult> TransferToRecoveryAsync(Guid surgeryId);
    Task<WardTransferResult> TransferToWardAsync(Guid surgeryId);

    // Step 8: Tính chi phí
    Task<SurgeryCostResult> CalculateSurgeryCostAsync(Guid surgeryId);
    Task<TeamFeeResult> CalculateTeamFeeAsync(Guid surgeryId);
}

#endregion

#region 4. LAB WORKFLOW - Luồng Xét nghiệm

/// <summary>
/// Luồng 4: Xét nghiệm (Lab Flow)
/// Liên kết: Chỉ định → LIS → Kho Dược (vật tư) → Khám bệnh/Nội trú
/// </summary>
public interface ILabWorkflowService
{
    // Step 1: Tiếp nhận yêu cầu
    Task<LabOrderResult> ReceiveLabOrderAsync(Guid serviceOrderId);
    Task<WorklistResult> SendToWorklistAsync(Guid labOrderId);

    // Step 2: Lấy mẫu
    Task<SpecimenCollectionResult> CollectSpecimenAsync(Guid labOrderId, SpecimenCollectionDto collection);
    Task<BarcodeResult> PrintBarcodeAsync(Guid specimenId);

    // Step 3: Tiếp nhận mẫu
    Task<SpecimenReceiveResult> ReceiveSpecimenAsync(Guid specimenId);
    Task<SpecimenRejectResult> RejectSpecimenAsync(Guid specimenId, string reason);

    // Step 4: Thực hiện XN
    Task<LabRunResult> RunTestAsync(Guid labOrderItemId);
    Task<AutoResultResult> ReceiveAutoResultAsync(Guid labOrderItemId, LabResultDto result);
    Task<ManualResultResult> EnterManualResultAsync(Guid labOrderItemId, LabResultDto result);

    // Step 5: Duyệt kết quả
    Task<ResultValidationResult> ValidateResultAsync(Guid labOrderItemId, Guid validatorId);
    Task<AbnormalAlertResult> CheckAbnormalAsync(Guid labOrderItemId);

    // Step 6: Trả kết quả
    Task<ResultReleaseResult> ReleaseResultAsync(Guid labOrderId);
    Task NotifyClinicianAsync(Guid labOrderId);
}

#endregion

#region 5. IMAGING WORKFLOW - Luồng Chẩn đoán Hình ảnh

/// <summary>
/// Luồng 5: Chẩn đoán Hình ảnh (RIS/PACS Flow)
/// Liên kết: Chỉ định → RIS → PACS → Khám bệnh/Nội trú
/// </summary>
public interface IImagingWorkflowService
{
    // Step 1: Tiếp nhận yêu cầu
    Task<ImagingOrderResult> ReceiveImagingOrderAsync(Guid serviceOrderId);
    Task<ModalityWorklistResult> SendToModalityAsync(Guid imagingOrderId);

    // Step 2: Thực hiện chụp
    Task<ExamStartResult> StartExamAsync(Guid imagingOrderId, Guid modalityId);
    Task<ImageAcquisitionResult> AcquireImagesAsync(Guid imagingOrderId);
    Task<ExamCompleteResult> CompleteExamAsync(Guid imagingOrderId);

    // Step 3: Lưu trữ PACS
    Task<DicomStorageResult> StoreDicomAsync(Guid imagingOrderId, string dicomPath);

    // Step 4: Đọc kết quả
    Task<ReportAssignResult> AssignToRadiologistAsync(Guid imagingOrderId, Guid radiologistId);
    Task<ReportDraftResult> CreateReportDraftAsync(Guid imagingOrderId, RadiologyReportDto report);
    Task<ReportApprovalResult> ApproveReportAsync(Guid imagingOrderId, Guid approverId);

    // Step 5: Trả kết quả
    Task<ReportReleaseResult> ReleaseReportAsync(Guid imagingOrderId);
    Task NotifyClinicianAsync(Guid imagingOrderId);
}

#endregion

#region 6. PHARMACY WORKFLOW - Luồng Kho Dược

/// <summary>
/// Luồng 6: Kho Dược & Phát thuốc (Pharmacy Flow)
/// Liên kết: Khám bệnh/Nội trú → Kho Dược → Thu ngân → BC Dược
/// </summary>
public interface IPharmacyWorkflowService
{
    // === NHẬP KHO ===
    Task<PurchaseOrderResult> CreatePurchaseOrderAsync(PurchaseOrderDto order);
    Task<GoodsReceiptResult> ReceiveGoodsAsync(Guid purchaseOrderId, GoodsReceiptDto receipt);
    Task<QualityCheckResult> PerformQualityCheckAsync(Guid goodsReceiptId);
    Task<StockInResult> StockInAsync(Guid goodsReceiptId);

    // === XUẤT KHO NGOẠI TRÚ ===
    Task<DispenseValidationResult> ValidatePrescriptionAsync(Guid prescriptionId);
    Task<DrugInteractionResult> CheckDrugInteractionsAsync(Guid prescriptionId);
    Task<AllergyCheckResult> CheckAllergiesAsync(Guid prescriptionId, Guid patientId);
    Task<StockAvailabilityResult> CheckStockAvailabilityAsync(Guid prescriptionId);
    Task<DispenseResult> DispenseOutpatientAsync(Guid prescriptionId);

    // === XUẤT KHO NỘI TRÚ ===
    Task<RequisitionResult> CreateWardRequisitionAsync(WardRequisitionDto requisition);
    Task<RequisitionApprovalResult> ApproveRequisitionAsync(Guid requisitionId, Guid approverId);
    Task<DispenseResult> DispenseToWardAsync(Guid requisitionId);
    Task<ReturnResult> ProcessReturnAsync(Guid wardId, ReturnDto returnDto);

    // === CHUYỂN KHO ===
    Task<TransferRequestResult> CreateTransferRequestAsync(WarehouseTransferDto transfer);
    Task<TransferApprovalResult> ApproveTransferAsync(Guid transferId);
    Task<TransferCompleteResult> CompleteTransferAsync(Guid transferId);

    // === KIỂM SOÁT TỒN KHO ===
    Task<LowStockAlertResult> CheckLowStockAsync();
    Task<ExpiryAlertResult> CheckExpiryAsync(int daysAhead);
    Task<StockAdjustmentResult> AdjustStockAsync(StockAdjustmentDto adjustment);
    Task<StockTakeResult> PerformStockTakeAsync(Guid warehouseId);
}

#endregion

#region 7. BILLING WORKFLOW - Luồng Thanh toán

/// <summary>
/// Luồng 7: Thanh toán & Viện phí (Billing Flow)
/// Liên kết: Tất cả module → Thu ngân → Tài chính → BHYT
/// </summary>
public interface IBillingWorkflowService
{
    // === TỔNG HỢP CHI PHÍ ===
    Task<ChargeCollectionResult> CollectChargesAsync(Guid visitId);
    Task<ChargeCollectionResult> CollectInpatientChargesAsync(Guid admissionId);
    Task<ChargeSplitResult> SplitChargesByPayerAsync(Guid chargeCollectionId);

    // === TẠM ỨNG (Nội trú) ===
    Task<DepositResult> CreateDepositAsync(Guid admissionId, DepositDto deposit);
    Task<DepositBalanceResult> CheckDepositBalanceAsync(Guid admissionId);
    Task<DepositAlertResult> AlertLowDepositAsync(Guid admissionId);

    // === THANH TOÁN ===
    Task<InvoiceResult> GenerateInvoiceAsync(Guid chargeCollectionId);
    Task<InvoicePreviewResult> PreviewInvoiceAsync(Guid visitId);
    Task<PaymentResult> ProcessCashPaymentAsync(Guid invoiceId, decimal amount);
    Task<PaymentResult> ProcessCardPaymentAsync(Guid invoiceId, CardPaymentDto payment);
    Task<PaymentResult> ProcessBankTransferAsync(Guid invoiceId, BankTransferDto transfer);

    // === HOÀN TRẢ ===
    Task<RefundResult> ProcessRefundAsync(Guid paymentId, RefundRequestDto request);
    Task<DepositRefundResult> RefundDepositAsync(Guid admissionId);

    // === SỔ QUỸ ===
    Task<CashBookResult> RecordCashBookEntryAsync(CashBookEntryDto entry);
    Task<ShiftCloseResult> CloseShiftAsync(Guid cashierId);
    Task<DailyCloseResult> CloseDailyAsync(DateTime date);
}

#endregion

#region 8. INSURANCE WORKFLOW - Luồng BHYT

/// <summary>
/// Luồng 8: Bảo hiểm Y tế (Insurance Flow)
/// Liên kết: Tiếp đón → Thu ngân → BHYT → Cổng BHXH
/// </summary>
public interface IInsuranceWorkflowService
{
    // === XÁC MINH BHYT ===
    Task<InsuranceVerificationResult> VerifyInsuranceCardAsync(string cardNumber);
    Task<RightRouteResult> CheckRightRouteAsync(string cardNumber, string facilityCode);
    Task<ContinuousYearsResult> CheckContinuous5YearsAsync(string cardNumber);

    // === TÍNH CHI PHÍ BHYT ===
    Task<InsuranceCalculationResult> CalculateInsuranceCoverageAsync(Guid visitId);
    Task<CopaymentResult> CalculateCopaymentAsync(Guid visitId);
    Task<CeilingCheckResult> CheckInsuranceCeilingAsync(Guid visitId);

    // === XUẤT XML ===
    Task<XmlGenerationResult> GenerateXml130Async(Guid admissionId);
    Task<XmlGenerationResult> GenerateXml4210Async(Guid visitId);
    Task<XmlValidationResult> ValidateXmlAsync(Guid xmlId);

    // === GỬI CỔNG BHXH ===
    Task<PortalSubmissionResult> SubmitToPortalAsync(Guid xmlId);
    Task<PortalResponseResult> CheckPortalResponseAsync(Guid submissionId);
    Task<RejectionHandleResult> HandleRejectionAsync(Guid submissionId, string reason);

    // === GIÁM ĐỊNH ===
    Task<ClaimReviewResult> ReviewClaimAsync(Guid claimId);
    Task<ClaimApprovalResult> ApproveClaimAsync(Guid claimId);
    Task<ClaimRejectionResult> RejectClaimAsync(Guid claimId, string reason);
}

#endregion

#region 9. BLOOD BANK WORKFLOW - Luồng Ngân hàng Máu

/// <summary>
/// Luồng 9: Ngân hàng Máu (Blood Bank Flow)
/// Liên kết: PTTT/Nội trú → Kho Máu → Thu ngân
/// </summary>
public interface IBloodBankWorkflowService
{
    // === NHẬP MÁU ===
    Task<BloodReceiptResult> ReceiveBloodUnitsAsync(BloodReceiptDto receipt);
    Task<BloodTestResult> PerformBloodTestsAsync(Guid bloodUnitId);
    Task<BloodApprovalResult> ApproveBloodUnitAsync(Guid bloodUnitId);
    Task<BloodStorageResult> StoreBloodUnitAsync(Guid bloodUnitId);

    // === YÊU CẦU MÁU ===
    Task<BloodRequestResult> CreateBloodRequestAsync(BloodRequestDto request);
    Task<CrossMatchResult> PerformCrossMatchAsync(Guid bloodRequestId, Guid bloodUnitId);
    Task<BloodReservationResult> ReserveBloodAsync(Guid bloodRequestId);

    // === XUẤT MÁU ===
    Task<BloodIssueResult> IssueBloodAsync(Guid bloodRequestId);
    Task<TransfusionRecordResult> RecordTransfusionAsync(Guid bloodIssueId, TransfusionDto transfusion);
    Task<TransfusionReactionResult> RecordReactionAsync(Guid transfusionId, ReactionDto reaction);

    // === KIỂM SOÁT ===
    Task<BloodExpiryAlertResult> CheckBloodExpiryAsync();
    Task<BloodInventoryResult> CheckBloodInventoryAsync();
    Task<BloodDiscardResult> DiscardExpiredBloodAsync(Guid bloodUnitId);
}

#endregion

#region 10. REPORTING WORKFLOW - Luồng Báo cáo

/// <summary>
/// Luồng 10: Báo cáo & Thống kê
/// Liên kết: Tất cả module → BC Dược / HSBA / Tài chính
/// </summary>
public interface IReportingWorkflowService
{
    // === BÁO CÁO DƯỢC (Module 15) ===
    Task<DrugUsageReportResult> GenerateDrugUsageReportAsync(DateRange range);
    Task<ControlledDrugReportResult> GenerateControlledDrugReportAsync(DateRange range);
    Task<ExpiryReportResult> GenerateExpiryReportAsync(DateRange range);
    Task<StockReportResult> GenerateStockReportAsync(DateTime asOfDate);

    // === BÁO CÁO TÀI CHÍNH (Module 11) ===
    Task<RevenueReportResult> GenerateRevenueReportAsync(DateRange range);
    Task<CostReportResult> GenerateCostReportAsync(DateRange range);
    Task<ProfitReportResult> GenerateProfitReportAsync(DateRange range);
    Task<DebtReportResult> GenerateDebtReportAsync(DateTime asOfDate);

    // === BÁO CÁO HSBA (Module 16) ===
    Task<MedicalRecordReportResult> GenerateMedicalRecordStatsAsync(DateRange range);
    Task<DiagnosisReportResult> GenerateDiagnosisStatsAsync(DateRange range);
    Task<DepartmentReportResult> GenerateDepartmentStatsAsync(DateRange range);

    // === BÁO CÁO BHYT ===
    Task<InsuranceClaimReportResult> GenerateInsuranceClaimReportAsync(DateRange range);
    Task<RejectionReportResult> GenerateRejectionReportAsync(DateRange range);

    // === BÁO CÁO QUẢN TRỊ ===
    Task<DashboardResult> GenerateDashboardAsync();
    Task<KPIReportResult> GenerateKPIReportAsync(DateRange range);
}

#endregion

#region Supporting DTOs and Results

// Các DTO và Result classes cơ bản
public record DateRange(DateTime From, DateTime To);

// Patient Registration
public record PatientRegistrationDto(string? PatientCode, string FullName, DateTime? DateOfBirth, int Gender,
    string? IdentityNumber, string? PhoneNumber, string? InsuranceNumber, int PatientType, Guid? DepartmentId);

public record VisitRegistrationResult(bool Success, Guid? VisitId, string? PatientCode, int QueueNumber, string? Message);
public record InsuranceVerificationResult(bool IsValid, string? Message, decimal? CoverageRate, DateTime? ExpireDate);
public record QueueTicketResult(bool Success, int QueueNumber, string? RoomName, int EstimatedWaitMinutes);

// Examination
public record VitalSignsDto(decimal? Temperature, int? Pulse, int? BPSystolic, int? BPDiastolic,
    int? RespiratoryRate, decimal? Height, decimal? Weight, decimal? SpO2);
public record DiagnosisDto(string MainIcdCode, string MainDiagnosis, List<string>? SubIcdCodes, string? SubDiagnosis);
public record ConclusionDto(int ConclusionType, string? Note, DateTime? FollowUpDate, string? TreatmentPlan);
public record ExaminationResult(bool Success, Guid? ExaminationId, string? Message);
public record ConclusionResult(bool Success, string? Message);

// Service Orders
public record ServiceOrderItemDto(Guid ServiceId, int Quantity, string? Note, int? Priority);
public record ServiceOrderResult(bool Success, Guid? ServiceOrderId, List<Guid>? OrderItemIds, string? Message);

// Lab
public record LabOrderResult(bool Success, Guid? LabOrderId, string? Message);
public record WorklistResult(bool Success, string? WorklistId, string? Message);
public record SpecimenCollectionDto(Guid LabOrderItemId, string SpecimenType, DateTime CollectionTime, Guid CollectorId);
public record SpecimenCollectionResult(bool Success, Guid? SpecimenId, string? Barcode, string? Message);
public record BarcodeResult(bool Success, string? BarcodeImage, string? Message);
public record SpecimenReceiveResult(bool Success, DateTime? ReceivedAt, string? Message);
public record SpecimenRejectResult(bool Success, string? Message);
public record LabRunResult(bool Success, string? Message);
public record LabResultDto(Guid LabOrderItemId, string? ResultValue, string? Unit, string? ReferenceRange, bool? IsAbnormal);
public record AutoResultResult(bool Success, string? Message);
public record ManualResultResult(bool Success, string? Message);
public record ResultValidationResult(bool Success, Guid? ValidatorId, DateTime? ValidatedAt, string? Message);
public record AbnormalAlertResult(bool HasAbnormal, List<string>? AbnormalItems, string? Message);
public record ResultReleaseResult(bool Success, DateTime? ReleasedAt, string? Message);

// Imaging
public record ImagingOrderResult(bool Success, Guid? ImagingOrderId, string? Message);
public record ModalityWorklistResult(bool Success, string? StudyInstanceUid, string? Message);
public record ExamStartResult(bool Success, DateTime? StartTime, string? Message);
public record ImageAcquisitionResult(bool Success, int? ImageCount, string? Message);
public record ExamCompleteResult(bool Success, DateTime? EndTime, string? Message);
public record DicomStorageResult(bool Success, string? StudyPath, string? Message);
public record ReportAssignResult(bool Success, Guid? RadiologistId, string? Message);
public record RadiologyReportDto(Guid ImagingOrderId, string Findings, string Impression, string? Recommendation);
public record ReportDraftResult(bool Success, Guid? ReportId, string? Message);
public record ReportApprovalResult(bool Success, DateTime? ApprovedAt, string? Message);
public record ReportReleaseResult(bool Success, DateTime? ReleasedAt, string? Message);

// Prescription
public record PrescriptionDto(List<PrescriptionItemDto> Items, string? Note);
public record PrescriptionItemDto(Guid MedicineId, decimal Quantity, string Dosage, string Frequency, int Days, string? Note);
public record PrescriptionResult(bool Success, Guid? PrescriptionId, string? Message);

// Dispensing
public record DispenseValidationResult(bool IsValid, List<string>? Errors, List<string>? Warnings);
public record DrugInteractionResult(bool HasInteraction, List<string>? Interactions);
public record AllergyCheckResult(bool HasAllergy, List<string>? Allergies);
public record StockAvailabilityResult(bool IsAvailable, List<string>? UnavailableItems);
public record DispenseResult(bool Success, Guid? DispenseId, string? Message);

// Admission
public record AdmissionRequestDto(Guid VisitId, Guid DepartmentId, string AdmissionDiagnosis, string? Note);
public record AdmissionResult(bool Success, Guid? AdmissionId, string? Message);
public record BedAssignmentResult(bool Success, string? BedName, string? RoomName, string? Message);
public record TreatmentSheetResult(bool Success, Guid? TreatmentSheetId, string? Message);
public record MedicalOrderDto(int OrderType, string OrderContent, string? Note);
public record MedicalOrderResult(bool Success, Guid? OrderId, string? Message);
public record DischargeRequestDto(int DischargeType, int TreatmentResult, string? DischargeDiagnosis, string? Note);
public record DischargeResult(bool Success, DateTime? DischargeTime, string? Message);
public record NursingCareDto(string CareType, string CareContent, DateTime CareTime);
public record NursingCareResult(bool Success, Guid? NursingCareId, string? Message);
public record VitalSignsResult(bool Success, Guid? VitalSignsId, string? Message);

// Surgery
public record SurgeryRequestDto(Guid AdmissionId, Guid ServiceId, string SurgeryName, int SurgeryType, string? Note);
public record SurgeryRequestResult(bool Success, Guid? SurgeryRequestId, string? Message);
public record ConsultationResult(bool Success, Guid? ConsultationId, string? Message);
public record ConsultationApprovalDto(bool IsApproved, string? Note);
public record SurgeryApprovalResult(bool Success, DateTime? ApprovedAt, string? Message);
public record SurgeryScheduleDto(DateTime ScheduledTime, Guid OperatingRoomId, int EstimatedDuration, List<Guid> TeamMemberIds);
public record SurgeryScheduleResult(bool Success, Guid? ScheduleId, DateTime? ScheduledTime, string? Message);
public record PreOpCheckResult(bool IsPassed, List<string>? Issues, string? Message);
public record BloodReservationDto(string BloodType, int Units, string? Note);
public record BloodReservationResult(bool Success, List<Guid>? ReservedUnitIds, string? Message);
public record MaterialPreparationResult(bool Success, string? Message);
public record SurgeryAdmissionResult(bool Success, DateTime? AdmittedAt, string? Message);
public record AnesthesiaRecordDto(string AnesthesiaType, DateTime StartTime, DateTime? EndTime, string? Note);
public record AnesthesiaResult(bool Success, Guid? AnesthesiaRecordId, string? Message);
public record SurgeryProgressDto(string Stage, string Description, DateTime Time);
public record SurgeryProgressResult(bool Success, string? Message);
public record MaterialUsageDto(Guid ItemId, decimal Quantity, string? Note);
public record IntraOpMaterialResult(bool Success, string? Message);
public record SurgeryCompletionDto(DateTime EndTime, string Findings, string Procedure, string? Complications);
public record SurgeryCompletionResult(bool Success, string? Message);
public record RecoveryResult(bool Success, Guid? RecoveryId, string? Message);
public record WardTransferResult(bool Success, DateTime? TransferTime, string? Message);
public record SurgeryResult(bool Success, Guid? SurgeryRecordId, string? Message);
public record SurgeryCostResult(bool Success, decimal? TotalCost, string? Message);
public record TeamFeeResult(bool Success, decimal? TotalFee, string? Message);

// Pharmacy
public record PurchaseOrderDto(Guid SupplierId, List<PurchaseOrderItemDto> Items, string? Note);
public record PurchaseOrderItemDto(Guid ItemId, decimal Quantity, decimal UnitPrice);
public record PurchaseOrderResult(bool Success, Guid? PurchaseOrderId, string? Message);
public record GoodsReceiptDto(string InvoiceNumber, DateTime InvoiceDate, List<GoodsReceiptItemDto> Items);
public record GoodsReceiptItemDto(Guid ItemId, decimal Quantity, string BatchNumber, DateTime ExpiryDate, decimal UnitPrice);
public record GoodsReceiptResult(bool Success, Guid? GoodsReceiptId, string? Message);
public record QualityCheckResult(bool IsPassed, List<string>? Issues, string? Message);
public record StockInResult(bool Success, string? Message);
public record WardRequisitionDto(Guid WardId, DateTime Date, List<RequisitionItemDto> Items);
public record RequisitionItemDto(Guid ItemId, decimal Quantity, string? Note);
public record RequisitionResult(bool Success, Guid? RequisitionId, string? Message);
public record RequisitionApprovalResult(bool Success, string? Message);
public record ReturnDto(List<ReturnItemDto> Items, string Reason);
public record ReturnItemDto(Guid ItemId, decimal Quantity, string? BatchNumber);
public record ReturnResult(bool Success, Guid? ReturnId, string? Message);
public record WarehouseTransferDto(Guid FromWarehouseId, Guid ToWarehouseId, List<TransferItemDto> Items);
public record TransferItemDto(Guid ItemId, decimal Quantity, string? BatchNumber);
public record TransferRequestResult(bool Success, Guid? TransferId, string? Message);
public record TransferApprovalResult(bool Success, string? Message);
public record TransferCompleteResult(bool Success, string? Message);
public record LowStockAlertResult(bool HasAlerts, List<LowStockItemDto>? Items);
public record LowStockItemDto(Guid ItemId, string ItemName, decimal CurrentStock, decimal MinStock);
public record ExpiryAlertResult(bool HasAlerts, List<ExpiryItemDto>? Items);
public record ExpiryItemDto(Guid ItemId, string ItemName, string BatchNumber, DateTime ExpiryDate, decimal Quantity);
public record StockAdjustmentDto(Guid WarehouseId, List<AdjustmentItemDto> Items, string Reason);
public record AdjustmentItemDto(Guid ItemId, decimal AdjustmentQuantity, string? Note);
public record StockAdjustmentResult(bool Success, Guid? AdjustmentId, string? Message);
public record StockTakeResult(bool Success, Guid? StockTakeId, string? Message);

// Billing
public record ChargeCollectionResult(bool Success, Guid? ChargeCollectionId, decimal? TotalAmount, string? Message);
public record ChargeSplitResult(bool Success, decimal? InsuranceAmount, decimal? PatientAmount, decimal? OtherAmount, string? Message);
public record DepositDto(decimal Amount, string PaymentMethod, string? Note);
public record DepositResult(bool Success, Guid? DepositId, decimal? Balance, string? Message);
public record DepositBalanceResult(decimal Balance, decimal TotalCharges, decimal RequiredDeposit, bool IsLow);
public record DepositAlertResult(bool ShouldAlert, string? Message);
public record InvoiceResult(bool Success, Guid? InvoiceId, string? InvoiceNumber, decimal? TotalAmount, string? Message);
public record InvoicePreviewResult(decimal TotalAmount, decimal InsuranceAmount, decimal PatientAmount, List<InvoiceLineDto>? Lines);
public record InvoiceLineDto(string Description, decimal Quantity, decimal UnitPrice, decimal Amount);
public record PaymentDto(decimal Amount, string PaymentMethod, string? Reference);
public record CardPaymentDto(string CardNumber, string CardType, decimal Amount, string? Reference);
public record BankTransferDto(string BankName, string AccountNumber, decimal Amount, string Reference);
public record PaymentResult(bool Success, Guid? PaymentId, string? ReceiptNumber, string? Message);
public record RefundRequestDto(decimal Amount, string Reason);
public record RefundResult(bool Success, Guid? RefundId, string? Message);
public record DepositRefundResult(bool Success, decimal? RefundAmount, string? Message);
public record CashBookEntryDto(DateTime Date, string EntryType, decimal Amount, string Description);
public record CashBookResult(bool Success, string? Message);
public record ShiftCloseResult(bool Success, decimal? TotalReceipts, decimal? TotalRefunds, decimal? Balance, string? Message);
public record DailyCloseResult(bool Success, string? Message);

// Insurance
public record RightRouteResult(bool IsRightRoute, string? RouteType, string? Message);
public record ContinuousYearsResult(bool IsContinuous5Years, int? ContinuousYears, string? Message);
public record InsuranceCalculationResult(bool Success, decimal? InsuranceAmount, decimal? PatientAmount, decimal? CoverageRate, string? Message);
public record CopaymentResult(bool Success, decimal? CopaymentAmount, string? Message);
public record CeilingCheckResult(bool IsOverCeiling, decimal? CurrentAmount, decimal? Ceiling, string? Message);
public record XmlGenerationResult(bool Success, Guid? XmlId, string? XmlContent, string? Message);
public record XmlValidationResult(bool IsValid, List<string>? Errors, string? Message);
public record PortalSubmissionResult(bool Success, string? SubmissionId, string? Message);
public record PortalResponseResult(bool Success, string? Status, string? Message);
public record RejectionHandleResult(bool Success, string? Message);
public record ClaimReviewResult(bool Success, string? Message);
public record ClaimApprovalResult(bool Success, string? Message);
public record ClaimRejectionResult(bool Success, string? Message);
public record InsuranceClaimResult(bool Success, Guid? ClaimId, string? Message);

// Blood Bank
public record BloodReceiptDto(string SupplierCode, List<BloodUnitDto> Units);
public record BloodUnitDto(string BagCode, string BloodType, string RhFactor, decimal Volume, DateTime CollectionDate, DateTime ExpiryDate);
public record BloodReceiptResult(bool Success, int? UnitsReceived, string? Message);
public record BloodTestResult(bool IsPassed, List<string>? TestResults, string? Message);
public record BloodApprovalResult(bool Success, string? Message);
public record BloodStorageResult(bool Success, string? StorageLocation, string? Message);
public record BloodRequestDto(Guid PatientId, string BloodType, string RhFactor, int Units, string? Urgency, string? Indication);
public record BloodRequestResult(bool Success, Guid? RequestId, string? Message);
public record CrossMatchResult(bool IsCompatible, string? Message);
public record BloodIssueResult(bool Success, List<Guid>? IssuedUnitIds, string? Message);
public record TransfusionDto(Guid BloodUnitId, DateTime StartTime, DateTime? EndTime, string? Note);
public record TransfusionRecordResult(bool Success, Guid? TransfusionId, string? Message);
public record ReactionDto(string ReactionType, string Severity, string? Treatment);
public record TransfusionReactionResult(bool Success, string? Message);
public record BloodExpiryAlertResult(bool HasAlerts, List<BloodExpiryItemDto>? Items);
public record BloodExpiryItemDto(Guid BloodUnitId, string BagCode, string BloodType, DateTime ExpiryDate);
public record BloodInventoryResult(Dictionary<string, int>? Inventory, string? Message);
public record BloodDiscardResult(bool Success, string? Message);

// Archive
public record ArchiveResult(bool Success, Guid? ArchiveId, string? ArchiveCode, string? Message);

// Reporting
public record DrugUsageReportResult(bool Success, object? ReportData, string? Message);
public record ControlledDrugReportResult(bool Success, object? ReportData, string? Message);
public record ExpiryReportResult(bool Success, object? ReportData, string? Message);
public record StockReportResult(bool Success, object? ReportData, string? Message);
public record RevenueReportResult(bool Success, object? ReportData, string? Message);
public record CostReportResult(bool Success, object? ReportData, string? Message);
public record ProfitReportResult(bool Success, object? ReportData, string? Message);
public record DebtReportResult(bool Success, object? ReportData, string? Message);
public record MedicalRecordReportResult(bool Success, object? ReportData, string? Message);
public record DiagnosisReportResult(bool Success, object? ReportData, string? Message);
public record DepartmentReportResult(bool Success, object? ReportData, string? Message);
public record InsuranceClaimReportResult(bool Success, object? ReportData, string? Message);
public record RejectionReportResult(bool Success, object? ReportData, string? Message);
public record DashboardResult(bool Success, object? DashboardData, string? Message);
public record KPIReportResult(bool Success, object? KPIData, string? Message);

#endregion
