using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Linq.Expressions;
using HIS.Core.Entities;
using HIS.Infrastructure.Security;

namespace HIS.Infrastructure.Data;

public partial class HISDbContext : DbContext, IDataProtectionKeyContext
{
    private readonly IDataProtectionProvider? _dataProtectionProvider;

    public HISDbContext(DbContextOptions<HISDbContext> options) : base(options)
    {
    }

    public HISDbContext(DbContextOptions<HISDbContext> options, IDataProtectionProvider dataProtectionProvider) : base(options)
    {
        _dataProtectionProvider = dataProtectionProvider;
    }

    // Quản lý bệnh nhân
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<MedicalRecord> MedicalRecords => Set<MedicalRecord>();
    public DbSet<MedicalRecordArchive> MedicalRecordArchives => Set<MedicalRecordArchive>();
    public DbSet<MedicalRecordBorrowRequest> MedicalRecordBorrowRequests => Set<MedicalRecordBorrowRequest>();
    public DbSet<Examination> Examinations => Set<Examination>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentService> AppointmentServices => Set<AppointmentService>();
    public DbSet<DoctorSchedule> DoctorSchedules => Set<DoctorSchedule>();

    // Quản lý người dùng
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    // Khoa/Phòng/Giường
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Bed> Beds => Set<Bed>();

    // Dịch vụ
    public DbSet<ServiceGroup> ServiceGroups => Set<ServiceGroup>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<ServicePrice> ServicePrices => Set<ServicePrice>();
    public DbSet<ServiceRequest> ServiceRequests => Set<ServiceRequest>();
    public DbSet<ServiceRequestDetail> ServiceRequestDetails => Set<ServiceRequestDetail>();
    public DbSet<ServiceRequestDetailParameter> ServiceRequestDetailParameters => Set<ServiceRequestDetailParameter>(); // R1

    // Thuốc/Vật tư
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<MedicalSupply> MedicalSupplies => Set<MedicalSupply>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<PrescriptionDetail> PrescriptionDetails => Set<PrescriptionDetail>();

    // Kho
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<ImportReceipt> ImportReceipts => Set<ImportReceipt>();
    public DbSet<ImportReceiptDetail> ImportReceiptDetails => Set<ImportReceiptDetail>();
    public DbSet<ExportReceipt> ExportReceipts => Set<ExportReceipt>();
    public DbSet<ExportReceiptDetail> ExportReceiptDetails => Set<ExportReceiptDetail>();

    // Viện phí
    public DbSet<Receipt> Receipts => Set<Receipt>();
    public DbSet<ReceiptDetail> ReceiptDetails => Set<ReceiptDetail>();
    public DbSet<InvoiceSummary> InvoiceSummaries => Set<InvoiceSummary>();
    public DbSet<CashBook> CashBooks => Set<CashBook>();
    public DbSet<ElectronicInvoice> ElectronicInvoices => Set<ElectronicInvoice>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<RefundDisbursement> RefundDisbursements => Set<RefundDisbursement>();
    public DbSet<PharmacyApproval> PharmacyApprovals => Set<PharmacyApproval>();
    public DbSet<PharmacyApprovalItem> PharmacyApprovalItems => Set<PharmacyApprovalItem>();
    public DbSet<PharmacyApprovalLog> PharmacyApprovalLogs => Set<PharmacyApprovalLog>();
    public DbSet<ClinicalTemplate> ClinicalTemplates => Set<ClinicalTemplate>();
    public DbSet<Abbreviation> Abbreviations => Set<Abbreviation>();
    public DbSet<PatientFlag> PatientFlags => Set<PatientFlag>();
    public DbSet<StudyShareLink> StudyShareLinks => Set<StudyShareLink>();
    public DbSet<RadiologyPermission> RadiologyPermissions => Set<RadiologyPermission>();
    public DbSet<RadiologyDispatch> RadiologyDispatches => Set<RadiologyDispatch>();
    public DbSet<ConsultationRoom> ConsultationRooms => Set<ConsultationRoom>();
    public DbSet<ConsultationParticipant> ConsultationParticipants => Set<ConsultationParticipant>();
    public DbSet<NonDicomStudy> NonDicomStudies => Set<NonDicomStudy>();
    public DbSet<NonDicomImage> NonDicomImages => Set<NonDicomImage>();
    public DbSet<EmployeeAsset> EmployeeAssets => Set<EmployeeAsset>();
    public DbSet<EmployeeAllowance> EmployeeAllowances => Set<EmployeeAllowance>();
    public DbSet<EmployeeCareerHistory> EmployeeCareerHistories => Set<EmployeeCareerHistory>();
    public DbSet<EmployeeEducation> EmployeeEducations => Set<EmployeeEducation>();
    public DbSet<EmployeeFamily> EmployeeFamilies => Set<EmployeeFamily>();
    public DbSet<EmployeeRewardDiscipline> EmployeeRewardDisciplines => Set<EmployeeRewardDiscipline>();
    public DbSet<EmployeeBankAccount> EmployeeBankAccounts => Set<EmployeeBankAccount>();
    public DbSet<EmployeeContract> EmployeeContracts => Set<EmployeeContract>();
    public DbSet<EmployeeInsuranceInfo> EmployeeInsuranceInfos => Set<EmployeeInsuranceInfo>();
    public DbSet<EmployeeUnionMembership> EmployeeUnionMemberships => Set<EmployeeUnionMembership>();
    public DbSet<LabBook> LabBooks => Set<LabBook>();
    public DbSet<LabBookGroup> LabBookGroups => Set<LabBookGroup>();
    public DbSet<LabChemical> LabChemicals => Set<LabChemical>();
    public DbSet<SampleAppointment> SampleAppointments => Set<SampleAppointment>();

    // Hàng đợi
    public DbSet<Queue> Queues => Set<Queue>();
    public DbSet<QueueTicket> QueueTickets => Set<QueueTicket>();
    public DbSet<QueueConfiguration> QueueConfigurations => Set<QueueConfiguration>();
    public DbSet<DisplayScreen> DisplayScreens => Set<DisplayScreen>();
    public DbSet<InsuranceCard> InsuranceCards => Set<InsuranceCard>();

    // Giữ giấy tờ
    public DbSet<DocumentHold> DocumentHolds => Set<DocumentHold>();

    // Di ung / Chong chi dinh
    public DbSet<Allergy> Allergies => Set<Allergy>();
    public DbSet<Contraindication> Contraindications => Set<Contraindication>();

    // Mau kham / Phieu dieu tri
    public DbSet<ExaminationTemplate> ExaminationTemplates => Set<ExaminationTemplate>();
    public DbSet<TreatmentSheet> TreatmentSheets => Set<TreatmentSheet>();
    public DbSet<ConsultationRecord> ConsultationRecords => Set<ConsultationRecord>();
    public DbSet<NursingCareSheet> NursingCareSheets => Set<NursingCareSheet>();

    // Anh benh nhan
    public DbSet<PatientPhoto> PatientPhotos => Set<PatientPhoto>();

    // The bao hiem bi khoa
    public DbSet<BlockedInsurance> BlockedInsurances => Set<BlockedInsurance>();

    // Doi tuong thanh toan khac
    public DbSet<OtherPayer> OtherPayers => Set<OtherPayer>();

    // Tam ung / Thanh toan
    public DbSet<Deposit> Deposits => Set<Deposit>();
    public DbSet<Payment> Payments => Set<Payment>();

    // Mau don thuoc / dich vu
    public DbSet<ServiceGroupTemplate> ServiceGroupTemplates => Set<ServiceGroupTemplate>();
    public DbSet<ServiceGroupTemplateItem> ServiceGroupTemplateItems => Set<ServiceGroupTemplateItem>();
    public DbSet<PrescriptionTemplate> PrescriptionTemplates => Set<PrescriptionTemplate>();
    public DbSet<PrescriptionTemplateItem> PrescriptionTemplateItems => Set<PrescriptionTemplateItem>();

    // Thu vien huong dan
    public DbSet<InstructionLibrary> InstructionLibraries => Set<InstructionLibrary>();

    // Tuong tac thuoc
    public DbSet<DrugInteraction> DrugInteractions => Set<DrugInteraction>();

    // Thong tin chan thuong
    public DbSet<InjuryInfo> InjuryInfos => Set<InjuryInfo>();

    // Cau hinh
    public DbSet<CameraConfiguration> CameraConfigurations => Set<CameraConfiguration>();
    public DbSet<WaitingRoomDisplayConfig> WaitingRoomDisplayConfigs => Set<WaitingRoomDisplayConfig>();

    // Nhat ky hoat dong
    public DbSet<ExaminationActivityLog> ExaminationActivityLogs => Set<ExaminationActivityLog>();

    // Khám sức khỏe
    public DbSet<HealthCheckContract> HealthCheckContracts => Set<HealthCheckContract>();
    public DbSet<HealthCheckPackage> HealthCheckPackages => Set<HealthCheckPackage>();
    public DbSet<HealthCheckPackageService> HealthCheckPackageServices => Set<HealthCheckPackageService>();

    // Danh mục
    public DbSet<IcdCode> IcdCodes => Set<IcdCode>();
    public DbSet<Ethnic> Ethnics => Set<Ethnic>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Province> Provinces => Set<Province>();
    public DbSet<District> Districts => Set<District>();
    public DbSet<Ward> Wards => Set<Ward>();
    public DbSet<BirthRegister> BirthRegisters => Set<BirthRegister>(); // #154: sổ sinh đẻ
    public DbSet<AbortionRegister> AbortionRegisters => Set<AbortionRegister>(); // #154: sổ nạo phá thai
    public DbSet<AdrReport> AdrReports => Set<AdrReport>(); // #5 #55-59: báo cáo ADR
    public DbSet<SponsorOrg> SponsorOrgs => Set<SponsorOrg>(); // #41 #68-72: đơn vị bảo lãnh
    public DbSet<BillingGuarantor> BillingGuarantors => Set<BillingGuarantor>(); // #41 #68-72: gán bảo lãnh
    public DbSet<FunctionalDiagnosticTestType> FunctionalDiagnosticTestTypes => Set<FunctionalDiagnosticTestType>(); // #40 #64-67
    public DbSet<FunctionalDiagnosticTemplate> FunctionalDiagnosticTemplates => Set<FunctionalDiagnosticTemplate>(); // #40 #64-67
    public DbSet<ProvincialDirective> ProvincialDirectives => Set<ProvincialDirective>(); // #47: chỉ đạo tuyến
    public DbSet<InfectiousReportSubmission> InfectiousReportSubmissions => Set<InfectiousReportSubmission>(); // #156: ca BTN đã gửi báo cáo
    public DbSet<BackupHistory> BackupHistories => Set<BackupHistory>(); // #106 #128-130: lịch sử backup
    public DbSet<RadiologyReportCoReader> RadiologyReportCoReaders => Set<RadiologyReportCoReader>(); // #139: đồng đọc RIS
    public DbSet<HisConnection> HisConnections => Set<HisConnection>(); // #90: kết nối HIS đa NCC
    public DbSet<KioskTicket> KioskTickets => Set<KioskTicket>(); // #103 #123-125: kiosk tự phục vụ
    public DbSet<AssetProcurementRequest> AssetProcurementRequests => Set<AssetProcurementRequest>(); // #108
    public DbSet<AssetProcurementRequestItem> AssetProcurementRequestItems => Set<AssetProcurementRequestItem>(); // #108
    public DbSet<PayerChangeLog> PayerChangeLogs => Set<PayerChangeLog>(); // #104 #126-127 #137: log đổi đối tượng
    public DbSet<SpecimenImage> SpecimenImages => Set<SpecimenImage>(); // #134 #133: ảnh bệnh phẩm gắn KQ XN/GPB
    public DbSet<EInvoice> EInvoices => Set<EInvoice>(); // #24: hóa đơn điện tử HĐĐT đa NCC
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    // Warehouse extensions (consignment, IU mapping, splitable, profit margin)
    public DbSet<ConsignmentStock> ConsignmentStocks => Set<ConsignmentStock>();
    public DbSet<IUMedicineConfig> IUMedicineConfigs => Set<IUMedicineConfig>();
    public DbSet<SplitablePackageConfig> SplitablePackageConfigs => Set<SplitablePackageConfig>();
    public DbSet<ProfitMarginConfig> ProfitMarginConfigs => Set<ProfitMarginConfig>();
    public DbSet<StockTake> StockTakes => Set<StockTake>();
    public DbSet<StockTakeItem> StockTakeItems => Set<StockTakeItem>();
    public DbSet<SurgeryNarrativeTemplate> SurgeryNarrativeTemplates => Set<SurgeryNarrativeTemplate>();
    public DbSet<OutpatientRecordTemplate> OutpatientRecordTemplates => Set<OutpatientRecordTemplate>();
    public DbSet<CompoundingOrder> CompoundingOrders => Set<CompoundingOrder>();
    public DbSet<CompoundingOrderItem> CompoundingOrderItems => Set<CompoundingOrderItem>();
    public DbSet<DutySchedule> DutySchedules => Set<DutySchedule>();

    // Service packages (gói khám)
    public DbSet<ServicePackage> ServicePackages => Set<ServicePackage>();
    public DbSet<ServicePackageItem> ServicePackageItems => Set<ServicePackageItem>();

    // Insurance extensions
    public DbSet<InsuranceActivityLog> InsuranceActivityLogs => Set<InsuranceActivityLog>();
    public DbSet<IcdInsuranceMap> IcdInsuranceMaps => Set<IcdInsuranceMap>();
    public DbSet<ClinicalTerm> ClinicalTerms => Set<ClinicalTerm>();
    public DbSet<SnomedIcdMapping> SnomedIcdMappings => Set<SnomedIcdMapping>();
    public DbSet<Occupation> Occupations => Set<Occupation>();
    public DbSet<Gender> Genders => Set<Gender>();
    public DbSet<AdministrativeDivision> AdministrativeDivisions => Set<AdministrativeDivision>();
    public DbSet<HealthcareFacility> HealthcareFacilities => Set<HealthcareFacility>();

    // DQGVN - Lien thong du lieu y te quoc gia
    public DbSet<DqgvnSubmission> DqgvnSubmissions => Set<DqgvnSubmission>();

    // Giải phẫu bệnh (Pathology)
    public DbSet<PathologyRequest> PathologyRequests => Set<PathologyRequest>();
    public DbSet<PathologyResult> PathologyResults => Set<PathologyResult>();

    // Kho lưu chủng Vi Sinh (Culture Stock)
    public DbSet<CultureStock> CultureStocks => Set<CultureStock>();
    public DbSet<CultureStockLog> CultureStockLogs => Set<CultureStockLog>();

    // Xét nghiệm (LIS)
    // #14e: model 2 CLS (LabRequests/LabRequestItems/LabResults) đã gỡ — dùng ServiceRequests/ServiceRequestDetails
    public DbSet<LabAnalyzer> LabAnalyzers => Set<LabAnalyzer>();
    public DbSet<LabAnalyzerTestMapping> LabAnalyzerTestMappings => Set<LabAnalyzerTestMapping>();
    public DbSet<LabConnectionLog> LabConnectionLogs => Set<LabConnectionLog>();
    public DbSet<LabWorklist> LabWorklists => Set<LabWorklist>();
    public DbSet<LabRawResult> LabRawResults => Set<LabRawResult>();
    public DbSet<LabCriticalValueAlert> LabCriticalValueAlerts => Set<LabCriticalValueAlert>();
    public DbSet<LabCriticalValueConfig> LabCriticalValueConfigs => Set<LabCriticalValueConfig>();
    public DbSet<LabReferenceRange> LabReferenceRanges => Set<LabReferenceRange>();
    public DbSet<LabTestGroup> LabTestGroups => Set<LabTestGroup>();
    public DbSet<LabSampleType> LabSampleTypes => Set<LabSampleType>();
    public DbSet<LabTubeType> LabTubeTypes => Set<LabTubeType>();
    public DbSet<LabQCResult> LabQCResults => Set<LabQCResult>();
    public DbSet<LabConclusionTemplate> LabConclusionTemplates => Set<LabConclusionTemplate>();
    public DbSet<LabTestNorm> LabTestNorms => Set<LabTestNorm>();

    // Chẩn đoán hình ảnh (RIS/PACS)
    public DbSet<RadiologyRequest> RadiologyRequests => Set<RadiologyRequest>();
    public DbSet<RadiologyExam> RadiologyExams => Set<RadiologyExam>();
    public DbSet<RadiologyReport> RadiologyReports => Set<RadiologyReport>();
    public DbSet<RadiologyModality> RadiologyModalities => Set<RadiologyModality>();
    public DbSet<DicomStudy> DicomStudies => Set<DicomStudy>();
    // RIS/PACS - Chức năng mở rộng
    public DbSet<RadiologyDiagnosisTemplate> RadiologyDiagnosisTemplates => Set<RadiologyDiagnosisTemplate>();
    public DbSet<RadiologyAbbreviation> RadiologyAbbreviations => Set<RadiologyAbbreviation>();
    public DbSet<RadiologyDutySchedule> RadiologyDutySchedules => Set<RadiologyDutySchedule>();
    public DbSet<RadiologyTag> RadiologyTags => Set<RadiologyTag>();
    public DbSet<RadiologyRequestTag> RadiologyRequestTags => Set<RadiologyRequestTag>();
    public DbSet<RadiologyIntegrationLog> RadiologyIntegrationLogs => Set<RadiologyIntegrationLog>();
    public DbSet<RadiologyRoomAssignment> RadiologyRoomAssignments => Set<RadiologyRoomAssignment>();
    public DbSet<RadiologyDigitalSignatureConfig> RadiologyDigitalSignatureConfigs => Set<RadiologyDigitalSignatureConfig>();
    public DbSet<RadiologySignatureHistory> RadiologySignatureHistories => Set<RadiologySignatureHistory>();
    public DbSet<RadiologyLabelConfig> RadiologyLabelConfigs => Set<RadiologyLabelConfig>();
    // RIS/PACS - Capture Device (IV)
    public DbSet<RadiologyCaptureDevice> RadiologyCaptureDevices => Set<RadiologyCaptureDevice>();
    public DbSet<RadiologyWorkstation> RadiologyWorkstations => Set<RadiologyWorkstation>();
    public DbSet<RadiologyCaptureSession> RadiologyCaptureSession => Set<RadiologyCaptureSession>();
    public DbSet<RadiologyCapturedMedia> RadiologyCapturedMedia => Set<RadiologyCapturedMedia>();
    // RIS/PACS - Consultation (V)
    public DbSet<RadiologyConsultationSession> RadiologyConsultationSessions => Set<RadiologyConsultationSession>();
    public DbSet<RadiologyConsultationCase> RadiologyConsultationCases => Set<RadiologyConsultationCase>();
    public DbSet<RadiologyConsultationParticipant> RadiologyConsultationParticipants => Set<RadiologyConsultationParticipant>();
    public DbSet<RadiologyConsultationAttachment> RadiologyConsultationAttachments => Set<RadiologyConsultationAttachment>();
    public DbSet<RadiologyConsultationDiscussion> RadiologyConsultationDiscussions => Set<RadiologyConsultationDiscussion>();
    public DbSet<RadiologyConsultationImageNote> RadiologyConsultationImageNotes => Set<RadiologyConsultationImageNote>();
    public DbSet<RadiologyConsultationMinutes> RadiologyConsultationMinutes => Set<RadiologyConsultationMinutes>();
    // RIS/PACS - HL7 CDA (X)
    public DbSet<RadiologyHL7CDAConfig> RadiologyHL7CDAConfigs => Set<RadiologyHL7CDAConfig>();
    public DbSet<RadiologyHL7Message> RadiologyHL7Messages => Set<RadiologyHL7Message>();
    public DbSet<RadiologyCDADocument> RadiologyCDADocuments => Set<RadiologyCDADocument>();
    // RIS/PACS - Online Help (IX)
    public DbSet<RadiologyHelpCategory> RadiologyHelpCategories => Set<RadiologyHelpCategory>();
    public DbSet<RadiologyHelpArticle> RadiologyHelpArticles => Set<RadiologyHelpArticle>();
    public DbSet<RadiologyTroubleshooting> RadiologyTroubleshootings => Set<RadiologyTroubleshooting>();
    // RIS/PACS - CLS Screen (VII)
    public DbSet<RadiologyCLSScreenConfig> RadiologyCLSScreenConfigs => Set<RadiologyCLSScreenConfig>();
    public DbSet<RadiologyServiceDescriptionTemplate> RadiologyServiceDescriptionTemplates => Set<RadiologyServiceDescriptionTemplate>();
    // RIS/PACS - Remote PACS Servers
    public DbSet<RemotePacsServer> RemotePacsServers => Set<RemotePacsServer>();

    // Chi nhánh bệnh viện (NangCap15 1.21)
    public DbSet<HospitalBranch> HospitalBranches => Set<HospitalBranch>();

    // NangCap24 - HSMT BV Đa khoa
    public DbSet<BiometricCredential> BiometricCredentials => Set<BiometricCredential>();
    public DbSet<BiometricSignatureLog> BiometricSignatureLogs => Set<BiometricSignatureLog>();
    public DbSet<BhxhInspectorAccount> BhxhInspectorAccounts => Set<BhxhInspectorAccount>();
    public DbSet<BhxhInspectorAccessLog> BhxhInspectorAccessLogs => Set<BhxhInspectorAccessLog>();
    public DbSet<EmrCloudSyncLog> EmrCloudSyncLogs => Set<EmrCloudSyncLog>();
    public DbSet<DicomAutoSendRule> DicomAutoSendRules => Set<DicomAutoSendRule>();
    public DbSet<DicomTransmissionLog> DicomTransmissionLogs => Set<DicomTransmissionLog>();
    public DbSet<Hl7MessageQueue> Hl7MessageQueues => Set<Hl7MessageQueue>();
    public DbSet<DicomStudyActivityLog> DicomStudyActivityLogs => Set<DicomStudyActivityLog>();
    public DbSet<PacsKeyImage> PacsKeyImages => Set<PacsKeyImage>();
    public DbSet<PacsImageAnnotation> PacsImageAnnotations => Set<PacsImageAnnotation>();

    // Dược/Cấp phát
    public DbSet<DispenseRequest> DispenseRequests => Set<DispenseRequest>();
    public DbSet<DispenseRequestItem> DispenseRequestItems => Set<DispenseRequestItem>();
    public DbSet<StockReservation> StockReservations => Set<StockReservation>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockThreshold> StockThresholds => Set<StockThreshold>();
    public DbSet<ExpiryAlert> ExpiryAlerts => Set<ExpiryAlert>();
    public DbSet<LowStockAlert> LowStockAlerts => Set<LowStockAlert>();
    public DbSet<WarehouseTransfer> WarehouseTransfers => Set<WarehouseTransfer>();
    public DbSet<WarehouseTransferItem> WarehouseTransferItems => Set<WarehouseTransferItem>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();
    public DbSet<StockAdjustmentItem> StockAdjustmentItems => Set<StockAdjustmentItem>();

    // Nội trú (IPD)
    public DbSet<Admission> Admissions => Set<Admission>();
    public DbSet<BedAssignment> BedAssignments => Set<BedAssignment>();
    public DbSet<InpatientVitalSign> InpatientVitalSigns => Set<InpatientVitalSign>();
    public DbSet<DailyProgress> DailyProgresses => Set<DailyProgress>();
    public DbSet<NursingCare> NursingCares => Set<NursingCare>();
    public DbSet<Discharge> Discharges => Set<Discharge>();
    public DbSet<NewbornRecord> NewbornRecords => Set<NewbornRecord>(); // #50-54: hồ sơ trẻ sơ sinh
    public DbSet<HemodialysisSession> HemodialysisSessions => Set<HemodialysisSession>(); // #148: phiếu theo dõi chạy thận
    public DbSet<InfusionRecord> InfusionRecords => Set<InfusionRecord>(); // #16: truyền dịch persist thật
    public DbSet<InpatientConsultation> InpatientConsultations => Set<InpatientConsultation>(); // #16: hội chẩn nội trú persist thật
    public DbSet<InpatientConsultationMember> InpatientConsultationMembers => Set<InpatientConsultationMember>();

    // Phẫu thuật (Surgery)
    public DbSet<SurgeryRequest> SurgeryRequests => Set<SurgeryRequest>();
    public DbSet<SurgerySchedule> SurgerySchedules => Set<SurgerySchedule>();
    public DbSet<SurgeryRecord> SurgeryRecords => Set<SurgeryRecord>();
    public DbSet<OperatingRoom> OperatingRooms => Set<OperatingRoom>();
    public DbSet<SurgeryTeamMember> SurgeryTeamMembers => Set<SurgeryTeamMember>();
    public DbSet<SurgeryMedicineItem> SurgeryMedicineItems => Set<SurgeryMedicineItem>(); // F1
    public DbSet<SurgerySupplyItem> SurgerySupplyItems => Set<SurgerySupplyItem>();        // F1

    // Ky so (Digital Signature)
    public DbSet<DocumentSignature> DocumentSignatures => Set<DocumentSignature>();
    public DbSet<TokenUserMapping> TokenUserMappings => Set<TokenUserMapping>();
    public DbSet<ManagedCertificate> ManagedCertificates => Set<ManagedCertificate>();
    public DbSet<SigningTransaction> SigningTransactions => Set<SigningTransaction>();
    public DbSet<SigningTotpSecret> SigningTotpSecrets => Set<SigningTotpSecret>();

    // Audit
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // HL7 CDA Documents
    public DbSet<CdaDocument> CdaDocuments => Set<CdaDocument>();

    // Khóa dịch vụ (Service Locking)
    public DbSet<LockedService> LockedServices => Set<LockedService>();

    // LIS Configuration
    public DbSet<LisAnalyzer> LisAnalyzers => Set<LisAnalyzer>();
    public DbSet<LisTestParameter> LisTestParameters => Set<LisTestParameter>();
    public DbSet<LisReferenceRange> LisReferenceRanges => Set<LisReferenceRange>();
    public DbSet<LisAnalyzerMapping> LisAnalyzerMappings => Set<LisAnalyzerMapping>();
    public DbSet<LabconnectSyncHistory> LabconnectSyncHistories => Set<LabconnectSyncHistory>();

    // System Administration
    public DbSet<SystemConfig> SystemConfigs => Set<SystemConfig>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<TwoFactorOtp> TwoFactorOtps => Set<TwoFactorOtp>();
    public DbSet<SystemLog> SystemLogs => Set<SystemLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ScheduledTask> ScheduledTasks => Set<ScheduledTask>();
    public DbSet<SmsLog> SmsLogs => Set<SmsLog>();

    // Satisfaction Survey
    public DbSet<SatisfactionSurveyTemplate> SatisfactionSurveyTemplates => Set<SatisfactionSurveyTemplate>();
    public DbSet<SatisfactionSurveyResult> SatisfactionSurveyResults => Set<SatisfactionSurveyResult>();
    public DbSet<SatisfactionSurveyCampaign> SatisfactionSurveyCampaigns => Set<SatisfactionSurveyCampaign>();
    public DbSet<SurveyFeedbackCallback> SurveyFeedbackCallbacks => Set<SurveyFeedbackCallback>();

    // Nurse Shift Handover
    public DbSet<NurseShiftHandover> NurseShiftHandovers => Set<NurseShiftHandover>();

    // Ngân hàng máu (Blood Bank)
    public DbSet<BloodUnit> BloodUnits => Set<BloodUnit>();
    public DbSet<BloodDonor> BloodDonors => Set<BloodDonor>();
    public DbSet<BloodRequest> BloodRequests => Set<BloodRequest>();
    public DbSet<BloodTransfusion> BloodTransfusions => Set<BloodTransfusion>();

    // Báo cáo (Reports)
    public DbSet<ReportTemplate> ReportTemplates => Set<ReportTemplate>();
    public DbSet<GeneratedReport> GeneratedReports => Set<GeneratedReport>();
    public DbSet<DashboardWidget> DashboardWidgets => Set<DashboardWidget>();
    public DbSet<ReportAccessLog> ReportAccessLogs => Set<ReportAccessLog>();

    // Bảo hiểm (Insurance)
    public DbSet<InsuranceClaim> InsuranceClaims => Set<InsuranceClaim>();
    public DbSet<InsuranceClaimDetail> InsuranceClaimDetails => Set<InsuranceClaimDetail>();
    public DbSet<InsuranceRejection> InsuranceRejections => Set<InsuranceRejection>();
    public DbSet<InsuranceStatistics> InsuranceStatisticsRecords => Set<InsuranceStatistics>();
    public DbSet<InsurancePriceConfig> InsurancePriceConfigs => Set<InsurancePriceConfig>();

    // Luồng 11: Telemedicine
    public DbSet<TeleAppointment> TeleAppointments => Set<TeleAppointment>();
    public DbSet<TeleSession> TeleSessions => Set<TeleSession>();
    public DbSet<TeleConsultation> TeleConsultations => Set<TeleConsultation>();
    public DbSet<TelePrescription> TelePrescriptions => Set<TelePrescription>();
    public DbSet<TelePrescriptionItem> TelePrescriptionItems => Set<TelePrescriptionItem>();
    public DbSet<TeleFeedback> TeleFeedbacks => Set<TeleFeedback>();

    // Luồng 12: Clinical Nutrition
    public DbSet<NutritionScreening> NutritionScreenings => Set<NutritionScreening>();
    public DbSet<NutritionAssessment> NutritionAssessments => Set<NutritionAssessment>();
    public DbSet<DietOrder> DietOrders => Set<DietOrder>();
    public DbSet<DietType> DietTypes => Set<DietType>();
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<MealPlanItem> MealPlanItems => Set<MealPlanItem>();
    public DbSet<NutritionMonitoring> NutritionMonitorings => Set<NutritionMonitoring>();
    public DbSet<TPNOrder> TPNOrders => Set<TPNOrder>();

    // Luồng 13: Infection Control
    public DbSet<HAICase> HAICases => Set<HAICase>();
    public DbSet<IsolationOrder> IsolationOrders => Set<IsolationOrder>();
    public DbSet<HandHygieneObservation> HandHygieneObservations => Set<HandHygieneObservation>();
    public DbSet<Outbreak> Outbreaks => Set<Outbreak>();
    public DbSet<OutbreakCase> OutbreakCases => Set<OutbreakCase>();
    public DbSet<AntibioticStewardship> AntibioticStewardships => Set<AntibioticStewardship>();

    // Luồng 14: Rehabilitation
    public DbSet<RehabReferral> RehabReferrals => Set<RehabReferral>();
    public DbSet<FunctionalAssessment> FunctionalAssessments => Set<FunctionalAssessment>();
    public DbSet<RehabTreatmentPlan> RehabTreatmentPlans => Set<RehabTreatmentPlan>();
    public DbSet<RehabSession> RehabSessions => Set<RehabSession>();

    // Luồng 15: Medical Equipment
    public DbSet<MedicalEquipment> MedicalEquipments => Set<MedicalEquipment>();
    public DbSet<MaintenanceRecord> MaintenanceRecords => Set<MaintenanceRecord>();
    public DbSet<CalibrationRecord> CalibrationRecords => Set<CalibrationRecord>();
    public DbSet<RepairRequest> RepairRequests => Set<RepairRequest>();

    // Luồng 16: Medical HR
    public DbSet<MedicalStaff> MedicalStaffs => Set<MedicalStaff>();
    public DbSet<StaffQualification> StaffQualifications => Set<StaffQualification>();
    public DbSet<DutyRoster> DutyRosters => Set<DutyRoster>();
    public DbSet<DutyShift> DutyShifts => Set<DutyShift>();
    public DbSet<ClinicAssignment> ClinicAssignments => Set<ClinicAssignment>();
    public DbSet<CMERecord> CMERecords => Set<CMERecord>();
    public DbSet<HRCatalog> HRCatalogs => Set<HRCatalog>();
    public DbSet<StaffContract> StaffContracts => Set<StaffContract>();
    public DbSet<SalaryRecord> SalaryRecords => Set<SalaryRecord>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<OvertimeRecord> OvertimeRecords => Set<OvertimeRecord>();
    public DbSet<StaffAward> StaffAwards => Set<StaffAward>();
    public DbSet<StaffDiscipline> StaffDisciplines => Set<StaffDiscipline>();

    // Luồng 17: Quality Management
    public DbSet<QualityIndicator> QualityIndicators => Set<QualityIndicator>();
    public DbSet<QualityIndicatorValue> QualityIndicatorValues => Set<QualityIndicatorValue>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<CAPA> CAPAs => Set<CAPA>();
    public DbSet<AuditPlan> AuditPlans => Set<AuditPlan>();
    public DbSet<RefillRequest> RefillRequests => Set<RefillRequest>(); // F9
    public DbSet<ServiceFeedback> ServiceFeedbacks => Set<ServiceFeedback>(); // F9
    public DbSet<SatisfactionSurvey> SatisfactionSurveys => Set<SatisfactionSurvey>();

    // Luồng 18: Patient Portal
    public DbSet<PortalAccount> PortalAccounts => Set<PortalAccount>();
    public DbSet<PortalAppointment> PortalAppointments => Set<PortalAppointment>();
    public DbSet<OnlinePayment> OnlinePayments => Set<OnlinePayment>();
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();
    public DbSet<MedicineReminder> MedicineReminders => Set<MedicineReminder>();
    public DbSet<HealthMetric> HealthMetrics => Set<HealthMetric>();
    public DbSet<PatientQuestion> PatientQuestions => Set<PatientQuestion>();

    // N1.07: Phòng lưu / Observation
    public DbSet<ObservationStay> ObservationStays => Set<ObservationStay>();
    public DbSet<ObservationVital> ObservationVitals => Set<ObservationVital>();

    // N1.10: LIS master catalog
    public DbSet<LabMeasurementUnit> LabMeasurementUnits => Set<LabMeasurementUnit>();
    public DbSet<LabOrganism> LabOrganisms => Set<LabOrganism>();
    public DbSet<LabAntibiotic> LabAntibiotics => Set<LabAntibiotic>();

    // Microbiology culture results (G-19)
    public DbSet<MicrobiologyCulture> MicrobiologyCultures => Set<MicrobiologyCulture>();
    public DbSet<MicrobiologyOrganismFinding> MicrobiologyOrganismFindings => Set<MicrobiologyOrganismFinding>();
    public DbSet<AntibioticSensitivityResult> AntibioticSensitivityResults => Set<AntibioticSensitivityResult>();

    // N1.11: Radiology master catalog
    public DbSet<RadiologyBodyPart> RadiologyBodyParts => Set<RadiologyBodyPart>();
    public DbSet<RadiologyProtocol> RadiologyProtocols => Set<RadiologyProtocol>();
    public DbSet<RadiologyReportTemplate> RadiologyReportTemplates => Set<RadiologyReportTemplate>();
    // G-34c: ICD → template mapping
    public DbSet<RisIcdTemplateMapping> RisIcdTemplateMappings => Set<RisIcdTemplateMapping>();
    // Prompt 8 Đợt 2: CĐHA dịch vụ ↔ mẫu tường trình PTTT
    public DbSet<RisSurgeryServiceMapping> RisSurgeryServiceMappings => Set<RisSurgeryServiceMapping>();

    // N1.13: Receipt book (sổ biên lai khai báo)
    public DbSet<ReceiptBook> ReceiptBooks => Set<ReceiptBook>();

    // NangCap22: 13 master catalogs (gói thầu BV Đắk Nông)
    public DbSet<Manufacturer> Manufacturers => Set<Manufacturer>();
    public DbSet<MedicationRoute> MedicationRoutes => Set<MedicationRoute>();
    public DbSet<AdditionalCharge> AdditionalCharges => Set<AdditionalCharge>();
    public DbSet<OtherIncome> OtherIncomes => Set<OtherIncome>();
    public DbSet<TransportService> TransportServices => Set<TransportService>();
    public DbSet<GasolinePrice> GasolinePrices => Set<GasolinePrice>();
    public DbSet<MachineCode> MachineCodes => Set<MachineCode>();
    public DbSet<MachineService> MachineServices => Set<MachineService>();
    public DbSet<InspectionCommittee> InspectionCommittees => Set<InspectionCommittee>();
    public DbSet<InspectionCommitteeMember> InspectionCommitteeMembers => Set<InspectionCommitteeMember>();
    public DbSet<NursingCareLevel> NursingCareLevels => Set<NursingCareLevel>();
    public DbSet<MedicalRecordType> MedicalRecordTypes => Set<MedicalRecordType>();
    public DbSet<ParaclinicalRoomPriority> ParaclinicalRoomPriorities => Set<ParaclinicalRoomPriority>();
    public DbSet<ReportServiceGroupType> ReportServiceGroupTypes => Set<ReportServiceGroupType>();
    public DbSet<ReportServiceGroup> ReportServiceGroups => Set<ReportServiceGroup>();

    // F10.2 #95: DM hành chính nhỏ — Occupations/Genders/Ethnics DbSet đã có sẵn (Icd.cs); chỉ thêm 2 cái mới
    public DbSet<Nation> Nations => Set<Nation>();
    public DbSet<InitialFacility> InitialFacilities => Set<InitialFacility>();

    // F3.4 #151: BN BHYT chi trả 100% thuốc đặc trị
    public DbSet<BhytFullCoveragePatient> BhytFullCoveragePatients => Set<BhytFullCoveragePatient>();

    // Luồng 19: Health Information Exchange
    public DbSet<HIEConnection> HIEConnections => Set<HIEConnection>();
    public DbSet<InsuranceXMLSubmission> InsuranceXMLSubmissions => Set<InsuranceXMLSubmission>();
    public DbSet<ElectronicReferral> ElectronicReferrals => Set<ElectronicReferral>();
    public DbSet<TeleconsultationRequest> TeleconsultationRequests => Set<TeleconsultationRequest>();

    // Luồng 20: Mass Casualty Incident
    public DbSet<MCIEvent> MCIEvents => Set<MCIEvent>();
    public DbSet<MCIVictim> MCIVictims => Set<MCIVictim>();
    public DbSet<MCISituationReport> MCISituationReports => Set<MCISituationReport>();

    // Bệnh án chuyên khoa điện tử (Specialty EMR)
    public DbSet<SpecialtyEmr> SpecialtyEmrs => Set<SpecialtyEmr>();

    // Trình ký (Signing Workflow)
    public DbSet<SigningRequest> SigningRequests => Set<SigningRequest>();

    // Per-user settings (Prompt 11 Đợt 3: DefaultLabRole + future settings)
    public DbSet<UserSetting> UserSettings => Set<UserSetting>();

    // NangCap11: EMR Admin Catalogs
    public DbSet<EmrCoverType> EmrCoverTypes => Set<EmrCoverType>();
    public DbSet<EmrDocumentAttachment> EmrDocumentAttachments => Set<EmrDocumentAttachment>();
    public DbSet<EmrPrintLog> EmrPrintLogs => Set<EmrPrintLog>();
    public DbSet<EmrSignerCatalog> EmrSignerCatalogs => Set<EmrSignerCatalog>();
    public DbSet<EmrSigningRole> EmrSigningRoles => Set<EmrSigningRole>();
    public DbSet<EmrSigningOperation> EmrSigningOperations => Set<EmrSigningOperation>();
    public DbSet<EmrDocumentGroup> EmrDocumentGroups => Set<EmrDocumentGroup>();
    public DbSet<EmrDocumentType> EmrDocumentTypes => Set<EmrDocumentType>();

    // NangCap16: EMR Management (sharing, extract, spine, signatures, locks, tags, images, shortcodes, auto-check, close)
    public DbSet<EmrShare> EmrShares => Set<EmrShare>();
    public DbSet<EmrShareAccessLog> EmrShareAccessLogs => Set<EmrShareAccessLog>();
    public DbSet<EmrExtract> EmrExtracts => Set<EmrExtract>();
    public DbSet<EmrSpine> EmrSpines => Set<EmrSpine>();
    public DbSet<EmrSpineSection> EmrSpineSections => Set<EmrSpineSection>();
    public DbSet<PatientSignature> PatientSignatures => Set<PatientSignature>();
    public DbSet<AiLabelingResult> AiLabelingResults => Set<AiLabelingResult>();
    public DbSet<DocumentLock> DocumentLocks => Set<DocumentLock>();
    public DbSet<EmrDataTag> EmrDataTags => Set<EmrDataTag>();
    public DbSet<EmrImage> EmrImages => Set<EmrImage>();
    public DbSet<Shortcode> Shortcodes => Set<Shortcode>();
    public DbSet<EmrAutoCheckRule> EmrAutoCheckRules => Set<EmrAutoCheckRule>();
    public DbSet<EmrCloseLog> EmrCloseLogs => Set<EmrCloseLog>();
    public DbSet<EmrAmendment> EmrAmendments => Set<EmrAmendment>(); // TT46: vết finalize/reopen + version

    // Partograph + Anesthesia (Clinical Records)
    public DbSet<PartographRecord> PartographRecords => Set<PartographRecord>();
    public DbSet<AnesthesiaRecord> AnesthesiaRecords => Set<AnesthesiaRecord>();
    public DbSet<AnesthesiaMonitor> AnesthesiaMonitors => Set<AnesthesiaMonitor>();
    public DbSet<AnesthesiaDrug> AnesthesiaDrugs => Set<AnesthesiaDrug>();
    public DbSet<AnesthesiaFluid> AnesthesiaFluids => Set<AnesthesiaFluid>();

    // NangCap12: WebAuthn + Endpoint Security
    public DbSet<WebAuthnCredential> WebAuthnCredentials => Set<WebAuthnCredential>();
    public DbSet<EndpointDevice> EndpointDevices => Set<EndpointDevice>();
    public DbSet<SecurityIncident> SecurityIncidents => Set<SecurityIncident>();
    public DbSet<InstalledSoftware> InstalledSoftwareItems => Set<InstalledSoftware>();

    // NangCap8: Phac do dieu tri (Treatment Protocols)
    public DbSet<TreatmentProtocol> TreatmentProtocols => Set<TreatmentProtocol>();
    public DbSet<TreatmentProtocolStep> TreatmentProtocolSteps => Set<TreatmentProtocolStep>();

    // NangCap13: Canh bao nghiep vu (Business Alerts - 34 rules)
    public DbSet<BusinessAlert> BusinessAlerts => Set<BusinessAlert>();

    // NangCap14: BV Phoi Hai Duong
    public DbSet<ChronicDiseaseRecord> ChronicDiseaseRecords => Set<ChronicDiseaseRecord>();
    public DbSet<ChronicDiseaseFollowUp> ChronicDiseaseFollowUps => Set<ChronicDiseaseFollowUp>();
    public DbSet<RetailSale> RetailSales => Set<RetailSale>();
    public DbSet<RetailSaleItem> RetailSaleItems => Set<RetailSaleItem>();
    public DbSet<PharmacyCustomer> PharmacyCustomers => Set<PharmacyCustomer>();
    public DbSet<PharmacyPointTransaction> PharmacyPointTransactions => Set<PharmacyPointTransaction>();
    public DbSet<PharmacyShift> PharmacyShifts => Set<PharmacyShift>();
    public DbSet<PharmacyGppRecord> PharmacyGppRecords => Set<PharmacyGppRecord>();
    public DbSet<PharmacyCommission> PharmacyCommissions => Set<PharmacyCommission>();
    public DbSet<ClinicalGuidanceBatch> ClinicalGuidanceBatches => Set<ClinicalGuidanceBatch>();
    public DbSet<ClinicalGuidanceActivity> ClinicalGuidanceActivities => Set<ClinicalGuidanceActivity>();
    public DbSet<TbHivRecord> TbHivRecords => Set<TbHivRecord>();
    public DbSet<TbHivFollowUp> TbHivFollowUps => Set<TbHivFollowUp>();

    // Y tế công cộng (Public Health)
    public DbSet<HealthCheckup> HealthCheckups => Set<HealthCheckup>();
    public DbSet<VaccinationRecord> VaccinationRecords => Set<VaccinationRecord>();
    public DbSet<VaccinationCampaign> VaccinationCampaigns => Set<VaccinationCampaign>();
    public DbSet<DiseaseReport> DiseaseReports => Set<DiseaseReport>();
    public DbSet<OutbreakEvent> OutbreakEvents => Set<OutbreakEvent>();
    public DbSet<SchoolHealthExam> SchoolHealthExams => Set<SchoolHealthExam>();
    public DbSet<OccupationalHealthExam> OccupationalHealthExams => Set<OccupationalHealthExam>();
    public DbSet<MethadonePatient> MethadonePatients => Set<MethadonePatient>();
    public DbSet<MethadoneDosingRecord> MethadoneDosingRecords => Set<MethadoneDosingRecord>();
    public DbSet<MethadoneUrineTest> MethadoneUrineTests => Set<MethadoneUrineTest>();

    // An toàn vệ sinh thực phẩm (Food Safety)
    public DbSet<FoodPoisoningIncident> FoodPoisoningIncidents => Set<FoodPoisoningIncident>();
    public DbSet<FoodSafetySample> FoodSafetySamples => Set<FoodSafetySample>();
    public DbSet<FoodEstablishmentInspection> FoodEstablishmentInspections => Set<FoodEstablishmentInspection>();

    // Sức khỏe cộng đồng (Community Health / WHO PEN NCD)
    public DbSet<HouseholdHealthRecord> HouseholdHealthRecords => Set<HouseholdHealthRecord>();
    public DbSet<NcdScreening> NcdScreenings => Set<NcdScreening>();
    public DbSet<CommunityHealthTeam> CommunityHealthTeams => Set<CommunityHealthTeam>();

    // Quản lý HIV/AIDS
    public DbSet<HivPatient> HivPatients => Set<HivPatient>();
    public DbSet<HivLabResult> HivLabResults => Set<HivLabResult>();
    public DbSet<PmtctRecord> PmtctRecords => Set<PmtctRecord>();

    // Medinet: Giám định Y khoa (Medical Forensics)
    public DbSet<ForensicCase> ForensicCases => Set<ForensicCase>();
    public DbSet<ForensicExamination> ForensicExaminations => Set<ForensicExamination>();

    // Medinet: Y học cổ truyền (Traditional Medicine)
    public DbSet<TraditionalMedicineTreatment> TraditionalMedicineTreatments => Set<TraditionalMedicineTreatment>();
    public DbSet<HerbalPrescription> HerbalPrescriptions => Set<HerbalPrescription>();

    // Medinet: Sức khỏe sinh sản (Reproductive Health)
    public DbSet<PrenatalRecord> PrenatalRecords => Set<PrenatalRecord>();
    public DbSet<FamilyPlanningRecord> FamilyPlanningRecords => Set<FamilyPlanningRecord>();

    // Medinet: Sức khỏe tâm thần (Mental Health)
    public DbSet<MentalHealthCase> MentalHealthCases => Set<MentalHealthCase>();
    public DbSet<PsychiatricAssessment> PsychiatricAssessments => Set<PsychiatricAssessment>();

    // Medinet: Quản lý môi trường y tế (Environmental Health)
    public DbSet<WasteRecord> WasteRecords => Set<WasteRecord>();
    public DbSet<EnvironmentalMonitoring> EnvironmentalMonitorings => Set<EnvironmentalMonitoring>();

    // Medinet: Sổ chấn thương (Trauma Registry)
    public DbSet<TraumaCase> TraumaCases => Set<TraumaCase>();

    // Medinet: Dân số - KHHGĐ (Population Health)
    public DbSet<PopulationRecord> PopulationRecords => Set<PopulationRecord>();

    // Medinet: Truyền thông GDSK (Health Education)
    public DbSet<HealthCampaign> HealthCampaigns => Set<HealthCampaign>();
    public DbSet<HealthEducationMaterial> HealthEducationMaterials => Set<HealthEducationMaterial>();

    // Medinet: Quản lý hành nghề (Practice License Management)
    public DbSet<PracticeLicense> PracticeLicenses => Set<PracticeLicense>();

    // Medinet: Chia sẻ dữ liệu liên viện (Inter-Hospital Sharing)
    public DbSet<InterHospitalRequest> InterHospitalRequests => Set<InterHospitalRequest>();

    // NangCap17: Asset/Tender Management (Tai san - CCDC)
    public DbSet<Tender> Tenders => Set<Tender>();
    public DbSet<TenderItem> TenderItems => Set<TenderItem>();
    public DbSet<FixedAsset> FixedAssets => Set<FixedAsset>();
    public DbSet<AssetHandover> AssetHandovers => Set<AssetHandover>();
    public DbSet<AssetDisposal> AssetDisposals => Set<AssetDisposal>();
    public DbSet<AssetDepreciation> AssetDepreciations => Set<AssetDepreciation>();
    public DbSet<AssetStocktake> AssetStocktakes => Set<AssetStocktake>();
    public DbSet<AssetStocktakeItem> AssetStocktakeItems => Set<AssetStocktakeItem>();

    // NangCap17: Dao tao, Chi dao tuyen, NCKH
    public DbSet<TrainingClass> TrainingClasses => Set<TrainingClass>();
    public DbSet<TrainingStudent> TrainingStudents => Set<TrainingStudent>();
    public DbSet<ClinicalDirection> ClinicalDirections => Set<ClinicalDirection>();
    public DbSet<ResearchProject> ResearchProjects => Set<ResearchProject>();

    // NangCap17: IVF Lab Management (Phòng Lab IVF)
    public DbSet<IvfPatientCouple> IvfPatientCouples => Set<IvfPatientCouple>();
    public DbSet<IvfCycle> IvfCycles => Set<IvfCycle>();
    public DbSet<IvfOvumPickup> IvfOvumPickups => Set<IvfOvumPickup>();
    public DbSet<IvfEmbryo> IvfEmbryos => Set<IvfEmbryo>();
    public DbSet<IvfEmbryoTransfer> IvfEmbryoTransfers => Set<IvfEmbryoTransfer>();
    public DbSet<IvfSpermBank> IvfSpermBanks => Set<IvfSpermBank>();
    public DbSet<IvfBiopsy> IvfBiopsies => Set<IvfBiopsy>();

    // Supplementary Modules
    public DbSet<FollowUpAppointment> FollowUpAppointments => Set<FollowUpAppointment>();
    public DbSet<ProcurementRequest> ProcurementRequests => Set<ProcurementRequest>();
    public DbSet<ProcurementRequestItem> ProcurementRequestItems => Set<ProcurementRequestItem>();
    public DbSet<ImmunizationBatch> ImmunizationBatches => Set<ImmunizationBatch>();
    public DbSet<HealthCheckupCampaign> HealthCheckupCampaigns => Set<HealthCheckupCampaign>();
    public DbSet<HealthCheckupRecord> HealthCheckupRecords => Set<HealthCheckupRecord>();
    public DbSet<CheckupCampaignGroup> CheckupCampaignGroups => Set<CheckupCampaignGroup>();
    public DbSet<DiseaseCase> DiseaseCases => Set<DiseaseCase>();
    public DbSet<ContactTrace> ContactTraces => Set<ContactTrace>();

    // Supplementary Module 9: Kiểm tra BHXH (BHXH Audit)
    public DbSet<BhxhAuditSession> BhxhAuditSessions => Set<BhxhAuditSession>();
    public DbSet<BhxhAuditError> BhxhAuditErrors => Set<BhxhAuditError>();
    // Import CSV giam dinh BHXH (Issue #97/#121/#122 — migration 129)
    public DbSet<BhxhAuditImport> BhxhAuditImports => Set<BhxhAuditImport>();

    // NangCap18: New entities
    public DbSet<DiagnosisInterruption> DiagnosisInterruptions => Set<DiagnosisInterruption>();
    public DbSet<AnesthesiaChartEntry> AnesthesiaChartEntries => Set<AnesthesiaChartEntry>();
    public DbSet<DrugEquivalence> DrugEquivalences => Set<DrugEquivalence>();
    public DbSet<LabResultAccessLink> LabResultAccessLinks => Set<LabResultAccessLink>();

    // G-41/42/44: Admin modules MVP (Payroll, HR Decisions, Official Documents)
    public DbSet<PayrollPeriod> PayrollPeriods => Set<PayrollPeriod>();
    public DbSet<PayrollItem> PayrollItems => Set<PayrollItem>();
    public DbSet<HrDecision> HrDecisions => Set<HrDecision>();
    public DbSet<OfficialDocument> OfficialDocuments => Set<OfficialDocument>();

    // NangCap23: HSMT gói thầu BV Đa khoa (gap #1-9)
    public DbSet<NationalPrescriptionSubmission> NationalPrescriptionSubmissions => Set<NationalPrescriptionSubmission>();
    public DbSet<NationalPharmacyOutboundReport> NationalPharmacyOutboundReports => Set<NationalPharmacyOutboundReport>();
    public DbSet<BirthCertificateRecord> BirthCertificateRecords => Set<BirthCertificateRecord>();
    public DbSet<DeathCertificateRecord> DeathCertificateRecords => Set<DeathCertificateRecord>();
    public DbSet<DrivingLicenseHealthCheck> DrivingLicenseHealthChecks => Set<DrivingLicenseHealthCheck>();
    public DbSet<LinenItem> LinenItems => Set<LinenItem>();
    public DbSet<LinenTransaction> LinenTransactions => Set<LinenTransaction>();
    public DbSet<SterilizationSchedule> SterilizationSchedules => Set<SterilizationSchedule>();
    public DbSet<FunctionalDiagnosticTest> FunctionalDiagnosticTests => Set<FunctionalDiagnosticTest>();
    public DbSet<ZaloNotificationLog> ZaloNotificationLogs => Set<ZaloNotificationLog>();
    public DbSet<SpecialTestRule> SpecialTestRules => Set<SpecialTestRule>(); // #150 F2.13: khung thời gian XN đặc biệt

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HISDbContext).Assembly);

        // Fix Discharge FK: DischargedBy is the FK for DischargedBy_User navigation
        // NangCap23: fix non-conventional navigation FK mappings
        modelBuilder.Entity<BirthCertificateRecord>()
            .HasOne(b => b.Mother).WithMany().HasForeignKey(b => b.MotherPatientId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<BirthCertificateRecord>()
            .HasOne(b => b.MedicalRecord).WithMany().HasForeignKey(b => b.MedicalRecordId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DeathCertificateRecord>()
            .HasOne(d => d.Patient).WithMany().HasForeignKey(d => d.PatientId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DeathCertificateRecord>()
            .HasOne(d => d.MedicalRecord).WithMany().HasForeignKey(d => d.MedicalRecordId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DrivingLicenseHealthCheck>()
            .HasOne(d => d.Patient).WithMany().HasForeignKey(d => d.PatientId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DrivingLicenseHealthCheck>()
            .HasOne(d => d.Examination).WithMany().HasForeignKey(d => d.ExaminationId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<FunctionalDiagnosticTest>()
            .HasOne(f => f.Patient).WithMany().HasForeignKey(f => f.PatientId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<FunctionalDiagnosticTest>()
            .HasOne(f => f.MedicalRecord).WithMany().HasForeignKey(f => f.MedicalRecordId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<FunctionalDiagnosticTest>()
            .HasOne(f => f.Examination).WithMany().HasForeignKey(f => f.ExaminationId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<LinenTransaction>()
            .HasOne(t => t.FromDepartment).WithMany().HasForeignKey(t => t.FromDepartmentId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<LinenTransaction>()
            .HasOne(t => t.ToDepartment).WithMany().HasForeignKey(t => t.ToDepartmentId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SterilizationSchedule>()
            .HasOne(s => s.Department).WithMany().HasForeignKey(s => s.DepartmentId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SterilizationSchedule>()
            .HasOne(s => s.Room).WithMany().HasForeignKey(s => s.RoomId).OnDelete(DeleteBehavior.NoAction);

        // DrugInteraction: 2 FK -> Medicines (avoid SQL Server multiple cascade paths error)
        modelBuilder.Entity<DrugInteraction>()
            .HasOne(d => d.Medicine1).WithMany().HasForeignKey(d => d.Medicine1Id).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DrugInteraction>()
            .HasOne(d => d.Medicine2).WithMany().HasForeignKey(d => d.Medicine2Id).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<NationalPrescriptionSubmission>()
            .HasOne(n => n.Prescription).WithMany().HasForeignKey(n => n.PrescriptionId).OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Discharge>()
            .HasOne(d => d.DischargedBy_User)
            .WithMany()
            .HasForeignKey(d => d.DischargedBy)
            .OnDelete(DeleteBehavior.NoAction);

        // Fix Receipt FK: DiscountApprovedBy is the real FK for DiscountApprovedByUser
        // navigation. Without this, EF would create a shadow DiscountApprovedByUserId
        // column that doesn't exist in the DB → 500 on /api/portal/bills.
        modelBuilder.Entity<Receipt>()
            .HasOne(r => r.DiscountApprovedByUser)
            .WithMany()
            .HasForeignKey(r => r.DiscountApprovedBy)
            .OnDelete(DeleteBehavior.NoAction);

        // Examination self-ref: ParentExaminationId is FK to another Examination
        // (used for "Khám thêm chuyên khoa khác" multi-specialty workflow)
        modelBuilder.Entity<Examination>()
            .HasOne(e => e.ParentExamination)
            .WithMany()
            .HasForeignKey(e => e.ParentExaminationId)
            .OnDelete(DeleteBehavior.NoAction);

        // Fix PathologyResult FKs: navigation properties don't match FK column names
        // EF would otherwise create shadow columns PathologistUserId/VerifiedByUserId
        // that don't exist in the SQL Server schema.
        modelBuilder.Entity<PathologyResult>()
            .HasOne(r => r.PathologistUser)
            .WithMany()
            .HasForeignKey(r => r.PathologistId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PathologyResult>()
            .HasOne(r => r.VerifiedByUser)
            .WithMany()
            .HasForeignKey(r => r.VerifiedBy)
            .OnDelete(DeleteBehavior.NoAction);

        // Fix LabQCResult FK: PerformedByUser navigation → PerformedBy column
        modelBuilder.Entity<LabQCResult>()
            .HasOne(r => r.PerformedByUser)
            .WithMany()
            .HasForeignKey(r => r.PerformedBy)
            .OnDelete(DeleteBehavior.NoAction);

        // Fix ConsultationRecord FKs: explicit entity properties vs EF shadow property convention
        modelBuilder.Entity<ConsultationRecord>()
            .HasOne(c => c.PresidedBy)
            .WithMany()
            .HasForeignKey(c => c.PresidedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ConsultationRecord>()
            .HasOne(c => c.Secretary)
            .WithMany()
            .HasForeignKey(c => c.SecretaryUserId)
            .OnDelete(DeleteBehavior.NoAction);

        // #14e: FK config LabRequest/LabRequestItem/LabResult đã gỡ cùng entity (model 2 CLS)

        // Digital Signature indexes and FK mappings
        modelBuilder.Entity<DocumentSignature>()
            .HasIndex(ds => new { ds.DocumentId, ds.DocumentType })
            .HasDatabaseName("IX_DocumentSignatures_DocumentId_DocumentType");
        modelBuilder.Entity<DocumentSignature>()
            .HasIndex(ds => ds.SignedByUserId)
            .HasDatabaseName("IX_DocumentSignatures_SignedByUserId");
        modelBuilder.Entity<DocumentSignature>()
            .HasOne(ds => ds.SignedByUser)
            .WithMany()
            .HasForeignKey(ds => ds.SignedByUserId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<TokenUserMapping>()
            .HasIndex(t => t.TokenSerial)
            .IsUnique()
            .HasDatabaseName("IX_TokenUserMappings_TokenSerial");
        modelBuilder.Entity<TokenUserMapping>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.NoAction);

        // CDA Document FK mappings
        modelBuilder.Entity<CdaDocument>()
            .HasOne(c => c.Patient)
            .WithMany()
            .HasForeignKey(c => c.PatientId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<CdaDocument>()
            .HasOne(c => c.SignedByUser)
            .WithMany()
            .HasForeignKey(c => c.SignedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<CdaDocument>()
            .HasIndex(c => c.PatientId)
            .HasDatabaseName("IX_CdaDocuments_PatientId");
        modelBuilder.Entity<CdaDocument>()
            .HasIndex(c => c.DocumentType)
            .HasDatabaseName("IX_CdaDocuments_DocumentType");
        modelBuilder.Entity<CdaDocument>()
            .HasIndex(c => c.Status)
            .HasDatabaseName("IX_CdaDocuments_Status");

        // LIS Configuration FK mappings
        modelBuilder.Entity<LisReferenceRange>()
            .HasOne(r => r.TestParameter)
            .WithMany(t => t.ReferenceRanges)
            .HasForeignKey(r => r.TestParameterId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LisAnalyzerMapping>()
            .HasOne(m => m.Analyzer)
            .WithMany()
            .HasForeignKey(m => m.AnalyzerId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<LisAnalyzerMapping>()
            .HasOne(m => m.TestParameter)
            .WithMany(t => t.AnalyzerMappings)
            .HasForeignKey(m => m.HisTestParameterId)
            .OnDelete(DeleteBehavior.Cascade);

        // NangCap18: DrugEquivalence has two FKs to Medicine - prevent cascade
        modelBuilder.Entity<DrugEquivalence>()
            .HasOne(d => d.Medicine)
            .WithMany()
            .HasForeignKey(d => d.MedicineId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DrugEquivalence>()
            .HasOne(d => d.EquivalentMedicine)
            .WithMany()
            .HasForeignKey(d => d.EquivalentMedicineId)
            .OnDelete(DeleteBehavior.NoAction);

        // T1 Phase 1B (2026-05-30): explicit Fluent FK trùng convention EF infer (zero
        // runtime change) — pattern POC để mở rộng cho 168 nav `User` còn lại.
        // Xem plan-T1-fluent-fk-13-entity.md cho triage rule.
        // 3 entity POC dưới đây: FK property tên match nav qua convention — explicit hoá
        // để code self-documenting + immune to convention drift trong EF Core future.
        // Verify trước khi add: `<NavName>` ↔ `<NavName>Id` hoặc `<NavName>UserId`.
        modelBuilder.Entity<ChronicDiseaseRecord>()
            .HasOne(c => c.Doctor)
            .WithMany()
            .HasForeignKey(c => c.DoctorId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ClinicalGuidanceBatch>()
            .HasOne(c => c.LeadDoctor)
            .WithMany()
            .HasForeignKey(c => c.LeadDoctorId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Abbreviation>()
            .HasOne(a => a.OwnerUser)
            .WithMany()
            .HasForeignKey(a => a.OwnerUserId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<BloodRequest>()
            .HasOne(b => b.RequestingDoctor)
            .WithMany()
            .HasForeignKey(b => b.RequestingDoctorId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<BloodTransfusion>()
            .HasOne(b => b.Nurse)
            .WithMany()
            .HasForeignKey(b => b.NurseId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<BloodTransfusion>()
            .HasOne(b => b.Doctor)
            .WithMany()
            .HasForeignKey(b => b.DoctorId)
            .OnDelete(DeleteBehavior.NoAction);

        // T1 Phase 1C scale-up (2026-05-30): bulk 144 Fluent FK explicit trùng convention.
        // ZERO runtime change — Fluent config trùng EF Core convention infer (cùng FK column,
        // cùng DeleteBehavior từ global cascade override). Code self-documenting + immune
        // to convention drift trong EF Core future. Convention-mismatch entity (FK property
        // tên khác nav) defer Phase 2 (cần ALTER schema + smoke-test prod).
        // Xem plan-T1-fluent-fk-13-entity.md cho triage rule + verify script.
        //
        // ⚠️ WARNING — shadow FK landmine (bug 2026-05-30 login prod 500):
        // Các dòng dưới dùng pattern `.HasOne(x => x.User).WithMany()` KHÔNG truyền inverse
        // collection. Pattern này HỢP LỆ chỉ khi `User` entity (HIS.Core/Entities/User.cs)
        // KHÔNG có `ICollection<X>` tương ứng. Nếu ai đó thêm inverse collection vào User
        // (vd: `public virtual ICollection<TwoFactorOtp> TwoFactorOtps { get; set; }`),
        // EF sẽ coi đó là relationship THỨ 2 → tạo SHADOW FK `UserId1` (vì `UserId` đã dùng)
        // → SqlException "Invalid column name 'UserId1'" khi query Include.
        // Reference: commit 48aed7e fix UserRole.User (vì User.UserRoles inverse tồn tại).
        // RULE: thêm `ICollection<X>` vào User.cs → PHẢI đổi `.WithMany()` thành
        // `.WithMany(u => u.Xs)` cho relationship tương ứng dưới đây.
        // Xem docs/workspace-docs/conventions/ef-fluent-fk.md cho checklist convention.
        modelBuilder.Entity<Admission>().HasOne(a => a.AdmittingDoctor).WithMany().HasForeignKey(a => a.AdmittingDoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Allergy>().HasOne(a => a.RecordedBy).WithMany().HasForeignKey(a => a.RecordedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<AntibioticStewardship>().HasOne(a => a.ReviewedBy).WithMany().HasForeignKey(a => a.ReviewedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Appointment>().HasOne(a => a.Doctor).WithMany().HasForeignKey(a => a.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<AuditPlan>().HasOne(a => a.LeadAuditor).WithMany().HasForeignKey(a => a.LeadAuditorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<BhxhAuditSession>().HasOne(b => b.Auditor).WithMany().HasForeignKey(b => b.AuditorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<BlockedInsurance>().HasOne(b => b.BlockedBy).WithMany().HasForeignKey(b => b.BlockedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<BlockedInsurance>().HasOne(b => b.UnblockedBy).WithMany().HasForeignKey(b => b.UnblockedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<CAPA>().HasOne(c => c.AssignedTo).WithMany().HasForeignKey(c => c.AssignedToId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<CAPA>().HasOne(c => c.VerifiedBy).WithMany().HasForeignKey(c => c.VerifiedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<CashBook>().HasOne(c => c.Cashier).WithMany().HasForeignKey(c => c.CashierId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ClinicalDirection>().HasOne(c => c.ResponsibleDoctor).WithMany().HasForeignKey(c => c.ResponsibleDoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ClinicalTemplate>().HasOne(c => c.OwnerUser).WithMany().HasForeignKey(c => c.OwnerUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ConsultationParticipant>().HasOne(c => c.User).WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ConsultationRoom>().HasOne(c => c.HostUser).WithMany().HasForeignKey(c => c.HostUserId).OnDelete(DeleteBehavior.NoAction);
        // #16: hội chẩn nội trú — member là con của consultation (xóa cha → xóa con).
        modelBuilder.Entity<InpatientConsultationMember>().HasOne(m => m.Consultation).WithMany(c => c.Members).HasForeignKey(m => m.ConsultationId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Contraindication>().HasOne(c => c.RecordedBy).WithMany().HasForeignKey(c => c.RecordedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DailyProgress>().HasOne(d => d.Doctor).WithMany().HasForeignKey(d => d.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Deposit>().HasOne(d => d.ReceivedBy).WithMany().HasForeignKey(d => d.ReceivedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DietOrder>().HasOne(d => d.OrderedBy).WithMany().HasForeignKey(d => d.OrderedById).OnDelete(DeleteBehavior.NoAction);

        // #188: optimistic concurrency token (chống oversell tồn kho + double-use số dư). SQL Server rowversion auto-managed,
        // EF tự đưa vào WHERE khi UPDATE → 2 ghi đồng thời lên cùng 1 dòng → DbUpdateConcurrencyException (map 409 ở DomainExceptionFilter).
        modelBuilder.Entity<InventoryItem>().Property(e => e.RowVersion).IsRowVersion();
        modelBuilder.Entity<Deposit>().Property(e => e.RowVersion).IsRowVersion();
        modelBuilder.Entity<InvoiceSummary>().Property(e => e.RowVersion).IsRowVersion();
        modelBuilder.Entity<DiseaseCase>().HasOne(d => d.Investigator).WithMany().HasForeignKey(d => d.InvestigatorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DoctorSchedule>().HasOne(d => d.Doctor).WithMany().HasForeignKey(d => d.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DutyRoster>().HasOne(d => d.CreatedBy).WithMany().HasForeignKey(d => d.CreatedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ElectronicReferral>().HasOne(e => e.ReferredBy).WithMany().HasForeignKey(e => e.ReferredById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeAllowance>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeAsset>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeBankAccount>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeCareerHistory>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeContract>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeEducation>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeFamily>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeInsuranceInfo>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeRewardDiscipline>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EmployeeUnionMembership>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Examination>().HasOne(e => e.Doctor).WithMany().HasForeignKey(e => e.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ExaminationActivityLog>().HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ExaminationTemplate>().HasOne(e => e.CreatedByUser).WithMany().HasForeignKey(e => e.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<FollowUpAppointment>().HasOne(f => f.Doctor).WithMany().HasForeignKey(f => f.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<FunctionalAssessment>().HasOne(f => f.AssessedBy).WithMany().HasForeignKey(f => f.AssessedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<HAICase>().HasOne(h => h.ReportedBy).WithMany().HasForeignKey(h => h.ReportedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<HandHygieneObservation>().HasOne(h => h.ObservedBy).WithMany().HasForeignKey(h => h.ObservedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<HealthCheckContract>().HasOne(h => h.CreatedByUser).WithMany().HasForeignKey(h => h.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<HealthCheckupRecord>().HasOne(h => h.Doctor).WithMany().HasForeignKey(h => h.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<IncidentReport>().HasOne(i => i.Investigator).WithMany().HasForeignKey(i => i.InvestigatorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<IncidentReport>().HasOne(i => i.ReportedBy).WithMany().HasForeignKey(i => i.ReportedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<InstructionLibrary>().HasOne(i => i.CreatedByUser).WithMany().HasForeignKey(i => i.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<InsuranceClaim>().HasOne(i => i.Doctor).WithMany().HasForeignKey(i => i.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<InsuranceXMLSubmission>().HasOne(i => i.SubmittedBy).WithMany().HasForeignKey(i => i.SubmittedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<IsolationOrder>().HasOne(i => i.OrderedBy).WithMany().HasForeignKey(i => i.OrderedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<IvfCycle>().HasOne(i => i.Doctor).WithMany().HasForeignKey(i => i.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<IvfEmbryoTransfer>().HasOne(i => i.Doctor).WithMany().HasForeignKey(i => i.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<IvfEmbryoTransfer>().HasOne(i => i.Embryologist).WithMany().HasForeignKey(i => i.EmbryologistId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<IvfOvumPickup>().HasOne(i => i.PerformedBy).WithMany().HasForeignKey(i => i.PerformedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MaintenanceRecord>().HasOne(m => m.PerformedBy).WithMany().HasForeignKey(m => m.PerformedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ManagedCertificate>().HasOne(m => m.OwnerUser).WithMany().HasForeignKey(m => m.OwnerUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MCIEvent>().HasOne(m => m.IncidentCommander).WithMany().HasForeignKey(m => m.IncidentCommanderId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MCISituationReport>().HasOne(m => m.ReportedBy).WithMany().HasForeignKey(m => m.ReportedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MCIVictim>().HasOne(m => m.TriagedBy).WithMany().HasForeignKey(m => m.TriagedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MedicalRecord>().HasOne(m => m.Doctor).WithMany().HasForeignKey(m => m.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MedicalRecordArchive>().HasOne(m => m.ArchivedBy).WithMany().HasForeignKey(m => m.ArchivedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MedicalRecordBorrowRequest>().HasOne(m => m.ApprovedBy).WithMany().HasForeignKey(m => m.ApprovedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MedicalRecordBorrowRequest>().HasOne(m => m.RequestedBy).WithMany().HasForeignKey(m => m.RequestedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<MedicalStaff>().HasOne(m => m.User).WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<NonDicomStudy>().HasOne(n => n.PerformedByUser).WithMany().HasForeignKey(n => n.PerformedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Notification>().HasOne(n => n.TargetUser).WithMany().HasForeignKey(n => n.TargetUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<NursingCare>().HasOne(n => n.Nurse).WithMany().HasForeignKey(n => n.NurseId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<NursingCareSheet>().HasOne(n => n.Nurse).WithMany().HasForeignKey(n => n.NurseId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<NutritionAssessment>().HasOne(n => n.AssessedBy).WithMany().HasForeignKey(n => n.AssessedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<NutritionMonitoring>().HasOne(n => n.RecordedBy).WithMany().HasForeignKey(n => n.RecordedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<NutritionScreening>().HasOne(n => n.ScreenedBy).WithMany().HasForeignKey(n => n.ScreenedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ObservationStay>().HasOne(o => o.Doctor).WithMany().HasForeignKey(o => o.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Outbreak>().HasOne(o => o.DetectedBy).WithMany().HasForeignKey(o => o.DetectedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PathologyRequest>().HasOne(p => p.RequestingDoctor).WithMany().HasForeignKey(p => p.RequestingDoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PatientFlag>().HasOne(p => p.CreatedByUser).WithMany().HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PatientPhoto>().HasOne(p => p.CapturedBy).WithMany().HasForeignKey(p => p.CapturedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Payment>().HasOne(p => p.ReceivedBy).WithMany().HasForeignKey(p => p.ReceivedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PharmacyCommission>().HasOne(p => p.Doctor).WithMany().HasForeignKey(p => p.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PharmacyGppRecord>().HasOne(p => p.RecordedBy).WithMany().HasForeignKey(p => p.RecordedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PharmacyShift>().HasOne(p => p.Cashier).WithMany().HasForeignKey(p => p.CashierId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PortalAppointment>().HasOne(p => p.Doctor).WithMany().HasForeignKey(p => p.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Prescription>().HasOne(p => p.Doctor).WithMany().HasForeignKey(p => p.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PrescriptionTemplate>().HasOne(p => p.CreatedByUser).WithMany().HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ProcurementRequest>().HasOne(p => p.ApprovedBy).WithMany().HasForeignKey(p => p.ApprovedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ProcurementRequest>().HasOne(p => p.RequestedBy).WithMany().HasForeignKey(p => p.RequestedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<QualityIndicatorValue>().HasOne(q => q.RecordedBy).WithMany().HasForeignKey(q => q.RecordedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<QueueTicket>().HasOne(q => q.CalledByUser).WithMany().HasForeignKey(q => q.CalledByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyAbbreviation>().HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyCaptureSession>().HasOne(r => r.Operator).WithMany().HasForeignKey(r => r.OperatorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyCLSScreenConfig>().HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyConsultationAttachment>().HasOne(r => r.UploadedByUser).WithMany().HasForeignKey(r => r.UploadedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyConsultationDiscussion>().HasOne(r => r.Participant).WithMany().HasForeignKey(r => r.ParticipantId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyConsultationImageNote>().HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyConsultationMinutes>().HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyConsultationParticipant>().HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyConsultationSession>().HasOne(r => r.Leader).WithMany().HasForeignKey(r => r.LeaderId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyConsultationSession>().HasOne(r => r.Organizer).WithMany().HasForeignKey(r => r.OrganizerId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyConsultationSession>().HasOne(r => r.Secretary).WithMany().HasForeignKey(r => r.SecretaryId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyDiagnosisTemplate>().HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyDispatch>().HasOne(r => r.DispatchedByUser).WithMany().HasForeignKey(r => r.DispatchedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyDutySchedule>().HasOne(r => r.AssistantTechnician).WithMany().HasForeignKey(r => r.AssistantTechnicianId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyDutySchedule>().HasOne(r => r.Doctor).WithMany().HasForeignKey(r => r.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyDutySchedule>().HasOne(r => r.Technician).WithMany().HasForeignKey(r => r.TechnicianId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyExam>().HasOne(r => r.Technician).WithMany().HasForeignKey(r => r.TechnicianId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyHelpArticle>().HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyPermission>().HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.NoAction);
        // G-36: RadiologyPermission.Modality (optional FK → RadiologyModalities)
        modelBuilder.Entity<RadiologyPermission>().HasOne(r => r.Modality).WithMany().HasForeignKey(r => r.ModalityId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<RadiologyReport>().HasOne(r => r.ApprovedByUser).WithMany().HasForeignKey(r => r.ApprovedBy).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyReport>().HasOne(r => r.Radiologist).WithMany().HasForeignKey(r => r.RadiologistId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyRequest>().HasOne(r => r.RequestingDoctor).WithMany().HasForeignKey(r => r.RequestingDoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyRequestTag>().HasOne(r => r.AddedByUser).WithMany().HasForeignKey(r => r.AddedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyRoomAssignment>().HasOne(r => r.AssignedByUser).WithMany().HasForeignKey(r => r.AssignedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologyServiceDescriptionTemplate>().HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RadiologySignatureHistory>().HasOne(r => r.SignedByUser).WithMany().HasForeignKey(r => r.SignedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Receipt>().HasOne(r => r.Cashier).WithMany().HasForeignKey(r => r.CashierId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RehabReferral>().HasOne(r => r.AcceptedBy).WithMany().HasForeignKey(r => r.AcceptedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RehabReferral>().HasOne(r => r.ReferredBy).WithMany().HasForeignKey(r => r.ReferredById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RehabSession>().HasOne(r => r.Therapist).WithMany().HasForeignKey(r => r.TherapistId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RehabTreatmentPlan>().HasOne(r => r.CreatedBy).WithMany().HasForeignKey(r => r.CreatedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RepairRequest>().HasOne(r => r.AssignedTo).WithMany().HasForeignKey(r => r.AssignedToId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RepairRequest>().HasOne(r => r.RequestedBy).WithMany().HasForeignKey(r => r.RequestedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ReportAccessLog>().HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ResearchProject>().HasOne(r => r.PrincipalInvestigator).WithMany().HasForeignKey(r => r.PrincipalInvestigatorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RetailSale>().HasOne(r => r.Cashier).WithMany().HasForeignKey(r => r.CashierId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ServiceGroupTemplate>().HasOne(s => s.CreatedByUser).WithMany().HasForeignKey(s => s.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ServiceRequest>().HasOne(s => s.Doctor).WithMany().HasForeignKey(s => s.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ServiceRequestDetail>().HasOne(s => s.ResultUser).WithMany().HasForeignKey(s => s.ResultUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SigningTotpSecret>().HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SigningTransaction>().HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<StudyShareLink>().HasOne(s => s.CreatedByUser).WithMany().HasForeignKey(s => s.CreatedByUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SurgeryRequest>().HasOne(s => s.RequestingDoctor).WithMany().HasForeignKey(s => s.RequestingDoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SurgerySchedule>().HasOne(s => s.Anesthesiologist).WithMany().HasForeignKey(s => s.AnesthesiologistId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SurgerySchedule>().HasOne(s => s.Surgeon).WithMany().HasForeignKey(s => s.SurgeonId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SurgeryTeamMember>().HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SystemLog>().HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TbHivRecord>().HasOne(t => t.Doctor).WithMany().HasForeignKey(t => t.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TeleAppointment>().HasOne(t => t.Doctor).WithMany().HasForeignKey(t => t.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TeleconsultationRequest>().HasOne(t => t.RequestedBy).WithMany().HasForeignKey(t => t.RequestedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TPNOrder>().HasOne(t => t.OrderedBy).WithMany().HasForeignKey(t => t.OrderedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TrainingClass>().HasOne(t => t.Instructor).WithMany().HasForeignKey(t => t.InstructorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TrainingStudent>().HasOne(t => t.Staff).WithMany().HasForeignKey(t => t.StaffId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TreatmentSheet>().HasOne(t => t.Doctor).WithMany().HasForeignKey(t => t.DoctorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TreatmentSheet>().HasOne(t => t.Nurse).WithMany().HasForeignKey(t => t.NurseId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TwoFactorOtp>().HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<UserRole>().HasOne(u => u.User).WithMany(usr => usr.UserRoles).HasForeignKey(u => u.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<UserSession>().HasOne(u => u.User).WithMany().HasForeignKey(u => u.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<WebAuthnCredential>().HasOne(w => w.User).WithMany().HasForeignKey(w => w.UserId).OnDelete(DeleteBehavior.NoAction);

        // #50-54: NewbornRecord.MotherAdmission — NoAction de tranh multiple cascade paths
        modelBuilder.Entity<NewbornRecord>().HasOne(n => n.MotherAdmission).WithMany().HasForeignKey(n => n.MotherAdmissionId).OnDelete(DeleteBehavior.NoAction);

        // #148: HemodialysisSession.Admission — NoAction de tranh multiple cascade paths
        modelBuilder.Entity<HemodialysisSession>().HasOne(h => h.Admission).WithMany().HasForeignKey(h => h.AdmissionId).OnDelete(DeleteBehavior.NoAction);

        // G-34b: RadiologyModality.DefaultResultTemplate (optional FK → RadiologyReportTemplate)
        modelBuilder.Entity<RadiologyModality>()
            .HasOne(m => m.DefaultResultTemplate)
            .WithMany()
            .HasForeignKey(m => m.DefaultResultTemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        // G-34c: RisIcdTemplateMapping FKs
        modelBuilder.Entity<RisIcdTemplateMapping>()
            .HasOne(r => r.Template)
            .WithMany()
            .HasForeignKey(r => r.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RisIcdTemplateMapping>()
            .HasOne(r => r.Modality)
            .WithMany()
            .HasForeignKey(r => r.ModalityId)
            .OnDelete(DeleteBehavior.SetNull);

        // G-22/23: LisTestParameter FKs for new navigation properties
        modelBuilder.Entity<LisTestParameter>()
            .HasOne(t => t.Group)
            .WithMany()
            .HasForeignKey(t => t.GroupId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<LisTestParameter>()
            .HasOne(t => t.Service)
            .WithMany()
            .HasForeignKey(t => t.ServiceId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<LisTestParameter>()
            .HasOne(t => t.SampleType)
            .WithMany()
            .HasForeignKey(t => t.SampleTypeId)
            .OnDelete(DeleteBehavior.SetNull);

        // Column-level encryption for Patient PII (SEC-02: Data encryption at rest)
        if (_dataProtectionProvider != null)
        {
            var encryptedConverter = new EncryptedStringConverter(_dataProtectionProvider);
            modelBuilder.Entity<Patient>(entity =>
            {
                entity.Property(p => p.IdentityNumber).HasConversion(encryptedConverter);
                entity.Property(p => p.PhoneNumber).HasConversion(encryptedConverter);
                entity.Property(p => p.Email).HasConversion(encryptedConverter);
                entity.Property(p => p.InsuranceNumber).HasConversion(encryptedConverter);
                // NangCap21 - Chi nhánh đăng ký (nullable FK)
                entity.HasOne(p => p.Branch).WithMany().HasForeignKey(p => p.BranchId).OnDelete(DeleteBehavior.SetNull);
            });

            // NangCap21 - QueueTicket chi nhánh
            modelBuilder.Entity<QueueTicket>(entity =>
            {
                entity.HasOne(q => q.Branch).WithMany().HasForeignKey(q => q.BranchId).OnDelete(DeleteBehavior.SetNull);
            });

            // NangCap21 - Department chi nhánh
            modelBuilder.Entity<Department>(entity =>
            {
                entity.HasOne(d => d.Branch).WithMany().HasForeignKey(d => d.BranchId).OnDelete(DeleteBehavior.SetNull);
            });

            // NangCap21 - Room chi nhánh
            modelBuilder.Entity<Room>(entity =>
            {
                entity.HasOne(r => r.Branch).WithMany().HasForeignKey(r => r.BranchId).OnDelete(DeleteBehavior.SetNull);
            });

            // NangCap21 - MedicalStaff chi nhánh
            modelBuilder.Entity<MedicalStaff>(entity =>
            {
                entity.HasOne(m => m.Branch).WithMany().HasForeignKey(m => m.BranchId).OnDelete(DeleteBehavior.SetNull);
            });
        }

        // Handle legacy uniqueidentifier columns stored in CreatedBy/UpdatedBy
        // Many tables have uniqueidentifier type for these columns but entity uses string?
        var stringToGuidConverter = new ValueConverter<string?, Guid?>(
            v => string.IsNullOrWhiteSpace(v) ? null : Guid.Parse(v),
            v => v.HasValue ? v.Value.ToString() : null);

        // Tables with uniqueidentifier CreatedBy/UpdatedBy columns
        var tablesWithGuidAudit = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Prescription", "PrescriptionDetail", "Medicine",
            "CAPA", "DicomStudy", "DietOrder", "ElectronicReferral",
            "Notification",
            "HAICase", "HIEConnection", "IncidentReport", "InsuranceXMLSubmission",
            "IsolationOrder", "MCIEvent", "MCISituationReport", "MCIVictim",
            "MedicalEquipment", "MedicalStaff", "NutritionScreening", "Outbreak",
            "PortalAppointment", "RadiologyExam", "RadiologyModality",
            "RadiologyReport", "RadiologyRequest", "RehabReferral",
            "RehabSession", "RehabTreatmentPlan", "RepairRequest",
            "SigningRequest", // mig 04: CreatedBy/UpdatedBy uniqueidentifier — lộ khi submit-chain set CreatedBy (2026-06-12)
            "TeleAppointment", "TeleconsultationRequest", "TeleSession",
            "AiLabelingResult"
        };

        // Global query filter for soft delete + apply audit converters
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(CreateSoftDeleteFilter(entityType.ClrType));

                // Apply string->Guid converter for entities with uniqueidentifier audit columns
                // Skip entities that shadow CreatedBy with a navigation property (e.g. RehabTreatmentPlan, DutySchedule)
                // #197(b): hand-list UNION schema-derived (GuidAuditSchemaRegistry, probe ở Program.cs)
                // — bảng mới có uniqueidentifier CreatedBy/UpdatedBy tự nhận converter, khỏi sửa list tay.
                if (tablesWithGuidAudit.Contains(entityType.ClrType.Name)
                    || GuidAuditSchemaRegistry.Contains(entityType.GetTableName()))
                {
                    var createdByProp = entityType.FindProperty(nameof(BaseEntity.CreatedBy));
                    if (createdByProp != null && createdByProp.ClrType == typeof(string))
                    {
                        modelBuilder.Entity(entityType.ClrType)
                            .Property(nameof(BaseEntity.CreatedBy))
                            .HasConversion(stringToGuidConverter);
                    }
                    var updatedByProp = entityType.FindProperty(nameof(BaseEntity.UpdatedBy));
                    if (updatedByProp != null && updatedByProp.ClrType == typeof(string))
                    {
                        modelBuilder.Entity(entityType.ClrType)
                            .Property(nameof(BaseEntity.UpdatedBy))
                            .HasConversion(stringToGuidConverter);
                    }
                }
            }
        }

        // NangCap25 fix: PaymentTransaction.Patient là required-navigation; khi Patient bị
        // soft-delete, filtered Include biến txn "biến mất" (EF required-end + query filter →
        // INNER JOIN) → confirm 500 / getById 404 / txn rớt khỏi báo cáo đối soát. Cấu hình
        // navigation optional → LEFT JOIN đúng, txn luôn tìm thấy dù BN đã xóa mềm.
        modelBuilder.Entity<PaymentTransaction>()
            .Navigation(t => t.Patient)
            .IsRequired(false);

        // Global FK cascade override: ALL Cascade FKs -> NoAction to avoid SQL Server
        // "multiple cascade paths" errors on entities with 2+ FKs to the same target
        // (e.g. DrugInteraction, IvfPatientCouples, BirthCertificateRecord). Safer for
        // healthcare data — never auto-cascade-delete medical records.
        foreach (var fk in modelBuilder.Model.GetEntityTypes().SelectMany(t => t.GetForeignKeys()))
        {
            if (fk.DeleteBehavior == DeleteBehavior.Cascade)
            {
                fk.DeleteBehavior = DeleteBehavior.ClientNoAction;
            }
        }
    }

    private static LambdaExpression CreateSoftDeleteFilter(Type type)
    {
        var parameter = System.Linq.Expressions.Expression.Parameter(type, "e");
        var property = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
        var condition = System.Linq.Expressions.Expression.Equal(property, System.Linq.Expressions.Expression.Constant(false));
        return System.Linq.Expressions.Expression.Lambda(condition, parameter);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.Id = entry.Entity.Id == Guid.Empty ? Guid.NewGuid() : entry.Entity.Id;
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
