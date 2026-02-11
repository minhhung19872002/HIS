using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Data;

public class HISDbContext : DbContext
{
    public HISDbContext(DbContextOptions<HISDbContext> options) : base(options)
    {
    }

    // Quản lý bệnh nhân
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<MedicalRecord> MedicalRecords => Set<MedicalRecord>();
    public DbSet<Examination> Examinations => Set<Examination>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentService> AppointmentServices => Set<AppointmentService>();

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
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    // Xét nghiệm (LIS)
    public DbSet<LabRequest> LabRequests => Set<LabRequest>();
    public DbSet<LabRequestItem> LabRequestItems => Set<LabRequestItem>();
    public DbSet<LabResult> LabResults => Set<LabResult>();

    // Chẩn đoán hình ảnh (RIS/PACS)
    public DbSet<RadiologyRequest> RadiologyRequests => Set<RadiologyRequest>();
    public DbSet<RadiologyExam> RadiologyExams => Set<RadiologyExam>();
    public DbSet<RadiologyReport> RadiologyReports => Set<RadiologyReport>();
    public DbSet<RadiologyModality> RadiologyModalities => Set<RadiologyModality>();
    public DbSet<DicomStudy> DicomStudies => Set<DicomStudy>();

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
    public DbSet<DailyProgress> DailyProgresses => Set<DailyProgress>();
    public DbSet<NursingCare> NursingCares => Set<NursingCare>();
    public DbSet<Discharge> Discharges => Set<Discharge>();

    // Phẫu thuật (Surgery)
    public DbSet<SurgeryRequest> SurgeryRequests => Set<SurgeryRequest>();
    public DbSet<SurgerySchedule> SurgerySchedules => Set<SurgerySchedule>();
    public DbSet<SurgeryRecord> SurgeryRecords => Set<SurgeryRecord>();
    public DbSet<OperatingRoom> OperatingRooms => Set<OperatingRoom>();
    public DbSet<SurgeryTeamMember> SurgeryTeamMembers => Set<SurgeryTeamMember>();

    // Audit
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // System Administration
    public DbSet<SystemConfig> SystemConfigs => Set<SystemConfig>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<SystemLog> SystemLogs => Set<SystemLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ScheduledTask> ScheduledTasks => Set<ScheduledTask>();

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

    // Luồng 17: Quality Management
    public DbSet<QualityIndicator> QualityIndicators => Set<QualityIndicator>();
    public DbSet<QualityIndicatorValue> QualityIndicatorValues => Set<QualityIndicatorValue>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<CAPA> CAPAs => Set<CAPA>();
    public DbSet<AuditPlan> AuditPlans => Set<AuditPlan>();
    public DbSet<SatisfactionSurvey> SatisfactionSurveys => Set<SatisfactionSurvey>();

    // Luồng 18: Patient Portal
    public DbSet<PortalAccount> PortalAccounts => Set<PortalAccount>();
    public DbSet<PortalAppointment> PortalAppointments => Set<PortalAppointment>();
    public DbSet<OnlinePayment> OnlinePayments => Set<OnlinePayment>();

    // Luồng 19: Health Information Exchange
    public DbSet<HIEConnection> HIEConnections => Set<HIEConnection>();
    public DbSet<InsuranceXMLSubmission> InsuranceXMLSubmissions => Set<InsuranceXMLSubmission>();
    public DbSet<ElectronicReferral> ElectronicReferrals => Set<ElectronicReferral>();
    public DbSet<TeleconsultationRequest> TeleconsultationRequests => Set<TeleconsultationRequest>();

    // Luồng 20: Mass Casualty Incident
    public DbSet<MCIEvent> MCIEvents => Set<MCIEvent>();
    public DbSet<MCIVictim> MCIVictims => Set<MCIVictim>();
    public DbSet<MCISituationReport> MCISituationReports => Set<MCISituationReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HISDbContext).Assembly);

        // Global query filter for soft delete
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(CreateSoftDeleteFilter(entityType.ClrType));
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
