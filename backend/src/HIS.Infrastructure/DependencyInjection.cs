using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Extensions.Http;
using HIS.Core.Interfaces;
using HIS.Application.Interfaces;
using HIS.Application.Services;
using HIS.Infrastructure.Configuration;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Infrastructure.Services.HL7;

namespace HIS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Database
        services.AddDbContext<HISDbContext>(options =>
            options
                .UseSqlServer(
                    configuration.GetConnectionString("DefaultConnection"),
                    b => b.MigrationsAssembly(typeof(HISDbContext).Assembly.FullName))
                .ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning)));

        // Repositories
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Services
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<ISmsService, SmsService>();
        services.AddScoped<IResultNotificationService, ResultNotificationService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPatientService, PatientService>();

        // Phân hệ 1: Tiếp đón (Reception) - 105+ methods
        services.AddScoped<IReceptionCompleteService, ReceptionCompleteService>();

        // Phân hệ 2: Khám bệnh OPD (Examination) - 180+ methods
        services.AddScoped<IExaminationCompleteService, ExaminationCompleteService>();

        // Phân hệ 3: Điều trị Nội trú (Inpatient) - 100+ methods
        services.AddScoped<IInpatientCompleteService, InpatientCompleteService>();

        // Phân hệ 5: Kho Dược (Warehouse/Pharmacy)
        services.AddScoped<IWarehouseCompleteService, WarehouseCompleteService>();

        // Phân hệ 10: Thu ngân (Billing)
        services.AddScoped<IBillingCompleteService, BillingCompleteService>();
        services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();
        services.AddScoped<IMultiSpecialtyExamService, MultiSpecialtyExamService>();
        services.AddScoped<IPharmacyApprovalService, PharmacyApprovalService>();
        services.AddScoped<IReassignObjectService, ReassignObjectService>();
        services.AddScoped<IClinicalTemplateService, ClinicalTemplateService>();
        services.AddScoped<IAbbreviationService, AbbreviationService>();

        // Phân hệ 6: Phẫu thuật Thủ thuật (Surgery)
        // K12 Plan B TRUE module hóa (2026-05-30): tách sub-service per domain.
        services.AddScoped<HIS.Application.Services.Surgery.ISurgerySpecialService,
                           HIS.Infrastructure.Services.Surgery.SurgerySpecialServiceImpl>();
        services.AddScoped<HIS.Application.Services.Surgery.ISurgeryWaitingService,
                           HIS.Infrastructure.Services.Surgery.SurgeryWaitingServiceImpl>();
        services.AddScoped<HIS.Application.Services.Surgery.ISurgerySchedulingService,
                           HIS.Infrastructure.Services.Surgery.SurgerySchedulingServiceImpl>();
        services.AddScoped<HIS.Application.Services.Surgery.ISurgeryOperationService,
                           HIS.Infrastructure.Services.Surgery.SurgeryOperationServiceImpl>();
        services.AddScoped<HIS.Application.Services.Surgery.ISurgeryPrescriptionService,
                           HIS.Infrastructure.Services.Surgery.SurgeryPrescriptionServiceImpl>();
        services.AddScoped<ISurgeryCompleteService, SurgeryCompleteService>();

        // Phân hệ 8: Chẩn đoán hình ảnh RIS/PACS (Radiology)
        services.AddScoped<IRISCompleteService, RISCompleteService>();
        services.AddScoped<IDigitalSignatureService, DigitalSignatureService>(); // USB Token signing (Windows CryptoAPI)
        services.AddScoped<IPdfSignatureService, PdfSignatureService>(); // PDF generation and signing
        services.AddSingleton<Pkcs11SessionManager>(); // PKCS#11 session caching (singleton)
        services.AddScoped<ITokenRegistryService, TokenRegistryService>(); // Token-user mapping
        services.AddScoped<ICentralSigningService, CentralSigningService>(); // Centralized signing (NangCap6)
        services.Configure<Pkcs11Configuration>(configuration.GetSection("DigitalSignature"));

        // Phân hệ 7: Xét nghiệm LIS (Laboratory Information System)
        services.AddSingleton<HL7ConnectionManager>();
        services.AddScoped<ILISCompleteService, LISCompleteService>();
        services.AddHostedService<HL7ReceiverService>(); // TCP listener for HL7 messages

        // Phân hệ 9: Ngân hàng máu (Blood Bank)
        services.AddScoped<IBloodBankCompleteService, BloodBankCompleteService>();

        // Phân hệ 12: Giám định BHYT - XML Export
        services.AddSingleton<XmlExportService>();
        services.AddSingleton<XmlSchemaValidator>(sp =>
        {
            // XSD path relative to content root -- overridden from Program.cs if needed
            var xsdPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "xsd", "bhxh");
            return new XmlSchemaValidator(xsdPath, sp.GetRequiredService<ILogger<XmlSchemaValidator>>());
        });
        services.AddScoped<IInsuranceXmlService, InsuranceXmlService>();

        // BHXH Gateway Client (conditional: mock for dev, real HTTP for production)
        services.Configure<BhxhGatewayOptions>(configuration.GetSection(BhxhGatewayOptions.SectionName));
        var bhxhOptions = configuration.GetSection(BhxhGatewayOptions.SectionName).Get<BhxhGatewayOptions>()
            ?? new BhxhGatewayOptions();

        if (bhxhOptions.UseMock)
        {
            services.AddScoped<IBhxhGatewayClient, BhxhGatewayMockClient>();
        }
        else
        {
            services.AddHttpClient<IBhxhGatewayClient, BhxhGatewayClient>(client =>
            {
                client.BaseAddress = new Uri(bhxhOptions.BaseUrl);
                client.Timeout = TimeSpan.FromSeconds(bhxhOptions.TimeoutSeconds);
            })
            .AddPolicyHandler(HttpPolicyExtensions
                .HandleTransientHttpError()
                .WaitAndRetryAsync(
                    bhxhOptions.RetryCount,
                    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (outcome, delay, retryCount, _) =>
                    {
                        // Logged via ILogger in production
                    }))
            .AddPolicyHandler(HttpPolicyExtensions
                .HandleTransientHttpError()
                .CircuitBreakerAsync(
                    bhxhOptions.CircuitBreakerThreshold,
                    TimeSpan.FromSeconds(bhxhOptions.CircuitBreakerDurationSeconds)));
        }

        // Phân hệ: Hệ thống (System - Catalog/Finance/Statistics/Admin)
        services.AddScoped<ISystemCompleteService, SystemCompleteService>();

        // ============ Luồng 11-20: Extended Workflow Services (Real Database Implementations) ============

        // Luồng 11: Telemedicine (Khám bệnh từ xa)
        services.AddScoped<ITelemedicineService, TelemedicineServiceImpl>();

        // Luồng 12: Clinical Nutrition (Dinh dưỡng lâm sàng)
        services.AddScoped<IClinicalNutritionService, ClinicalNutritionServiceImpl>();

        // Luồng 13: Infection Control (Kiểm soát nhiễm khuẩn)
        services.AddScoped<IInfectionControlService, InfectionControlServiceImpl>();

        // Luồng 14: Rehabilitation (Vật lý trị liệu/PHCN)
        services.AddScoped<IRehabilitationService, RehabilitationServiceImpl>();

        // Luồng 15: Medical Equipment (Quản lý TTB y tế)
        services.AddScoped<IMedicalEquipmentService, MedicalEquipmentServiceImpl>();

        // Luồng 16: Medical HR (Quản lý nhân sự y tế)
        services.AddScoped<IMedicalHRService, MedicalHRServiceImpl>();

        // Luồng 17: Quality Management (Quản lý chất lượng)
        services.AddScoped<IQualityManagementService, QualityManagementServiceImpl>();

        // Luồng 18: Patient Portal (Cổng bệnh nhân)
        services.AddScoped<IPatientPortalService, PatientPortalServiceImpl>();

        // Luồng 19: Health Information Exchange (Liên thông y tế)
        services.AddScoped<IHealthExchangeService, HealthExchangeServiceImpl>();

        // Luồng 20: Mass Casualty Incident (Cấp cứu thảm họa)
        services.AddScoped<IMassCasualtyService, MassCasualtyServiceImpl>();

        // Level 6 Reconciliation Reports (Đối chiếu Level 6 - 8 báo cáo)
        services.AddScoped<IReconciliationReportService, ReconciliationReportService>();
        services.AddScoped<IClinicalDecisionSupportService, ClinicalDecisionSupportService>();

        // Data Inheritance (Kế thừa dữ liệu giữa các phân hệ - Level 6 item 1.8)
        services.AddScoped<IDataInheritanceService, DataInheritanceService>();

        // Audit Logging (Level 6 security compliance)
        services.AddScoped<IAuditLogService, AuditLogService>();

        // Tra cứu công khai HSBA đã ký số bằng CCCD + ngày sinh (không cần đăng nhập).
        // IMemoryCache: lưu token tra cứu ngắn hạn + đếm rate-limit theo IP (AddMemoryCache idempotent).
        services.AddMemoryCache();
        services.AddScoped<IPublicEmrLookupService, PublicEmrLookupService>();

        // Security Compliance (Level 6 - access control matrix, sensitive data access reports)
        services.AddScoped<ISecurityService, SecurityService>();

        // Health Check & Monitoring
        services.AddScoped<IHealthCheckService, HealthCheckService>();
        services.AddSingleton<MetricsService>();
        services.AddHttpClient(); // IHttpClientFactory for health checks

        // HL7 FHIR R4 Server & Client (Level 6 interoperability)
        services.AddScoped<IFhirService, FhirService>();
        services.AddHttpClient<IFhirClientService, FhirClientService>();

        // PDF Generation (EMR forms - HTML for browser printing)
        services.AddScoped<IPdfGenerationService, PdfGenerationService>();

        // AI report exports (Phase 3): HTML/PDF, DICOM SR, merge to RadiologyReport
        services.AddScoped<IAiReportService, AiReportService>();

        // AI vendor adapter registry (Phase 4) — singleton because provider
        // instances pool HTTP clients internally.
        services.AddSingleton<IAiProviderRegistry, AiProviderRegistry>();
        // Background worker that auto-queues AI analysis when new DICOM studies
        // arrive. Disabled by default; flip on via AiLabeling:Worklist:Enabled=true.
        services.AddHostedService<AiWorklistService>();
        services.AddHostedService<ExpiryAlertWorker>();

        // HL7 CDA R2 Document Generation (health information exchange)
        services.AddScoped<ICdaDocumentService, CdaDocumentService>();

        // Online Appointment Booking (Public - không cần đăng nhập)
        services.AddScoped<IAppointmentBookingService, AppointmentBookingService>();

        // Booking Management (Staff - cần đăng nhập)
        services.AddScoped<IBookingManagementService, BookingManagementService>();

        // NangCap22: 13 master catalogs (BV Đắk Nông tender)
        services.AddScoped<IMasterCatalogService, MasterCatalogService>();

        // F10.1 #94: DM Địa danh hành chính (Tỉnh/Huyện/Xã)
        services.AddScoped<IAdministrativeUnitService, AdministrativeUnitService>();

        // F1.8 #154: Sổ sinh đẻ + Sổ theo dõi nạo phá thai (register khoa Sản)
        services.AddScoped<IObstetricRegisterService, ObstetricRegisterService>();

        // ADR báo cáo phản ứng có hại thuốc (#5 #55-59)
        services.AddScoped<IAdrReportService, AdrReportService>();

        // Bảo lãnh viện phí (#41 #68-72)
        services.AddScoped<IBillingGuarantorService, BillingGuarantorService>();

        // Wave 2: catalog CLS DB-driven (#40 #64-67), CV365 XML (#88), worker nền
        services.AddScoped<IFunctionalDiagnosticCatalogService, FunctionalDiagnosticCatalogService>();
        services.AddScoped<ICv365XmlService, Cv365XmlService>();
        services.AddHostedService<HIS.Infrastructure.Services.Workers.BackupSchedulerWorker>(); // #128
        services.AddHostedService<HIS.Infrastructure.Services.Workers.AppointmentReminderWorker>(); // #102

        // Wave 3: kết nối HIS đa NCC (#90)
        services.AddHttpClient("MultiHisConnector", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.Add("User-Agent", "HIS-MultiConnector/1.0");
        });
        services.AddScoped<IMultiHisConnectorService, MultiHisConnectorService>();

        // Wave 4: kiosk (#103 #123-125), mua sắm tài sản (#108)
        services.AddScoped<IKioskService, KioskService>();
        services.AddScoped<IAssetProcurementService, AssetProcurementService>();

        // F3.4 #151: BN BHYT chi trả 100% thuốc đặc trị
        services.AddScoped<IBhytFullCoverageService, BhytFullCoverageService>();

        // Medical Record Archive (Lưu trữ hồ sơ bệnh án)
        services.AddScoped<IMedicalRecordArchiveService, MedicalRecordArchiveService>();

        // DQGVN National Health Data Exchange (Cong du lieu y te quoc gia)
        services.AddScoped<IDqgvnService, DqgvnService>();

        // Giải phẫu bệnh & Tế bào học (Pathology)
        services.AddScoped<IPathologyService, PathologyService>();

        // Kho lưu chủng Vi Sinh (Culture Stock)
        services.AddScoped<ICultureStockService, CultureStockService>();

        // LIS Configuration (Cấu hình máy xét nghiệm, thông số, mapping, Labconnect)
        services.AddScoped<ILisConfigService, LisConfigService>();

        // Hospital Report Service (140 reports + birth certificate)
        services.AddScoped<IHospitalReportService, HospitalReportService>();

        // NangCap5: Cổng đơn thuốc quốc gia (CQLKCB)
        services.AddScoped<INationalPrescriptionService, NationalPrescriptionService>();

        // NangCap5: Sở Y tế monitoring
        services.AddScoped<IProvincialHealthService, ProvincialHealthService>();

        // NangCap5: Chuyển giao dữ liệu
        services.AddScoped<IDataManagementService, DataManagementService>();

        // Bệnh án chuyên khoa điện tử (Specialty EMR)
        services.AddScoped<ISpecialtyEmrService, SpecialtyEmrService>();

        // Clinical Records: Partograph + Anesthesia
        services.AddScoped<IClinicalRecordService, ClinicalRecordService>();

        // Signing Workflow (Trinh ky - NangCap10 EMR #44)
        services.AddScoped<ISigningWorkflowService, SigningWorkflowService>();

        // Per-user settings (Prompt 11 Đợt 3: DefaultLabRole + generic settings)
        services.AddScoped<IUserSettingsService, UserSettingsService>();

        // NangCap11: EMR Admin (cover types, signers, signing roles, document types, completeness, etc.)
        services.AddScoped<IEmrAdminService, EmrAdminService>();

        // NangCap16: EMR Management (sharing, extract, spine, patient signature, locks, tags, images, shortcodes, auto-check, close/reopen, recovery)
        services.AddScoped<IEmrManagementService, EmrManagementService>();

        // Phân hệ 16: Báo cáo & Thống kê (Reporting) - 38 methods
        services.AddScoped<IReportingCompleteService, ReportingCompleteService>();

        // Medical Record Planning (KHTH - Ke hoach Tong hop)
        services.AddScoped<IMedicalRecordPlanningService, MedicalRecordPlanningService>();

        // NangCap12: Endpoint Security (An toan thong tin)
        services.AddScoped<IEndpointSecurityService, EndpointSecurityService>();

        // NangCap8: Phac do dieu tri (Treatment Protocols - BV San Nhi Ninh Binh)
        services.AddScoped<ITreatmentProtocolService, TreatmentProtocolService>();

        // NangCap21: HIS Đám Mây 3 Cấp - Tổng hợp đa chi nhánh (Trạm YT → Huyện → Tỉnh)
        services.AddScoped<IMultiFacilityConsolidationService, MultiFacilityConsolidationService>();

        // NangCap13: Canh bao nghiep vu (Business Alerts - 34 rules)
        services.AddScoped<IBusinessAlertService, BusinessAlertService>();

        // Y tế công cộng (Public Health - 6 modules)
        services.AddScoped<IPublicHealthService, PublicHealthService>();

        // NangCap14: BV Phoi Hai Duong - 4 new modules
        services.AddScoped<IChronicDiseaseService, ChronicDiseaseService>();
        services.AddScoped<IHospitalPharmacyService, HospitalPharmacyService>();
        services.AddScoped<IClinicalGuidanceService, ClinicalGuidanceService>();
        services.AddScoped<ITbHivManagementService, TbHivManagementService>();

        // Public Health Modules (3 new)
        services.AddScoped<IFoodSafetyService, FoodSafetyService>();
        services.AddScoped<ICommunityHealthService, CommunityHealthService>();
        services.AddScoped<IHivManagementService, HivManagementService>();

        // NangCap17: Asset/Tender Management (Tai san - CCDC)
        services.AddScoped<IAssetManagementService, AssetManagementService>();

        // NangCap17: Dao tao, Chi dao tuyen, NCKH (Training, Clinical Direction, Research)
        services.AddScoped<ITrainingResearchService, TrainingResearchService>();

        // Medinet Healthcare Modules (10 modules)
        services.AddScoped<IForensicService, ForensicService>(); // Giám định Y khoa
        services.AddScoped<ITraditionalMedicineService, TraditionalMedicineService>(); // Y học cổ truyền
        services.AddScoped<IReproductiveHealthService, ReproductiveHealthService>(); // Sức khỏe sinh sản
        services.AddScoped<IMentalHealthService, MentalHealthService>(); // Sức khỏe tâm thần
        services.AddScoped<IEnvironmentalHealthService, EnvironmentalHealthService>(); // Quản lý môi trường y tế
        services.AddScoped<ITraumaRegistryService, TraumaRegistryService>(); // Sổ chấn thương
        services.AddScoped<IPopulationHealthService, PopulationHealthServiceImpl>(); // Dân số - KHHGĐ
        services.AddScoped<IHealthEducationService, HealthEducationService>(); // Truyền thông GDSK
        services.AddScoped<IPracticeLicenseService, PracticeLicenseService>(); // Quản lý hành nghề
        services.AddScoped<IInterHospitalService, InterHospitalService>(); // Chia sẻ dữ liệu liên viện

        // NangCap17: IVF Lab Management (Phòng Lab IVF)
        services.AddScoped<IIvfLabService, IvfLabService>();

        // Supplementary Modules
        services.AddScoped<IFollowUpService, FollowUpService>(); // Tái khám
        services.AddScoped<IProcurementService, ProcurementService>(); // Dự trù mua sắm
        services.AddScoped<IImmunizationService, ImmunizationService>(); // Tiêm chủng
        services.AddScoped<IHealthCheckupService, HealthCheckupService>(); // Khám sức khỏe định kỳ
        services.AddScoped<IEpidemiologyService, EpidemiologyService>(); // Giám sát dịch tễ

        // Supplementary Module 6: Y tế trường học (School Health)
        services.AddScoped<ISchoolHealthService, SchoolHealthService>();

        // Supplementary Module 7: Y tế nghề nghiệp (Occupational Health)
        services.AddScoped<IOccupationalHealthService, OccupationalHealthService>();

        // Supplementary Module 8: Chương trình Methadone (Methadone Treatment)
        services.AddScoped<IMethadoneTreatmentService, MethadoneTreatmentService>();

        // Supplementary Module 9: Kiểm tra BHXH (BHXH Audit)
        services.AddScoped<IBhxhAuditService, BhxhAuditService>();

        // NangCap23: HSMT gói thầu BV Đa khoa (9 gap)
        services.AddScoped<HIS.Application.Services.INangCap23ConfigStore, NangCap23ConfigStore>();
        services.AddHostedService<HIS.Infrastructure.Services.Workers.Nangcap23RetryWorker>();
        services.AddHostedService<HIS.Infrastructure.Services.Workers.SampleAppointmentReminderWorker>();
        services.AddScoped<INationalPrescriptionGatewayService, NationalPrescriptionGatewayService>();
        services.AddScoped<INationalPharmacyGatewayService, NationalPharmacyGatewayService>();
        services.AddScoped<IDeAn06CertificateService, DeAn06CertificateService>();
        services.AddScoped<ILinenManagementService, LinenManagementService>();
        services.AddScoped<IFunctionalDiagnosticsService, FunctionalDiagnosticsService>();
        services.AddScoped<IZaloNotificationService, ZaloNotificationService>();
        services.AddScoped<IQualityDashboardService, QualityDashboardService>();

        // G-41/42/44: Admin modules MVP (Payroll, HR Decisions, Official Documents)
        services.AddScoped<IAdminModulesService, AdminModulesService>();

        // NangCap24: HSMT BV Đa khoa (10 gap)
        services.AddScoped<IBiometricSignatureService, BiometricSignatureService>();
        services.AddScoped<IBhxhInspectorService, BhxhInspectorService>();
        services.AddScoped<IEmrHl7ArchiveService, EmrHl7ArchiveService>();
        services.AddScoped<IEmrCloudSyncService, EmrCloudSyncService>();
        services.AddScoped<IDicomAutoSendService, DicomAutoSendService>();
        services.AddScoped<IHl7QueueService, Hl7QueueService>();
        services.AddScoped<IDicomStudyActivityService, DicomStudyActivityService>();

        // NangCap23 external gateway clients — production-first registration:
        //   * MockMode=false (default) → typed HttpClient hitting real cổng QG sandbox
        //   * MockMode=true (development override) → InMemory fake returns "MOCK-*" acks
        // Mock binding ONLY when appsettings explicitly sets the flag → an empty config
        // section in production prevents accidental mock leakage.
        var ngMock = configuration.GetValue<bool>("NationalGateway:MockMode", false);
        var zaloMock = configuration.GetValue<bool>("Zalo:MockMode", false);
        var ngTimeout = TimeSpan.FromSeconds(configuration.GetValue<int>("NationalGateway:TimeoutSeconds", 30));
        var zaloTimeout = TimeSpan.FromSeconds(configuration.GetValue<int>("Zalo:TimeoutSeconds", 15));

        // SSRF: validate base URL với allowlist trước khi register (chặn admin trỏ tới
        // internal IP/metadata endpoint qua appsettings/env override).
        HIS.Application.Services.Nangcap23ConfigValidator.EnsureSafeUrl(
            configuration["NationalGateway:Prescription:BaseUrl"] ?? "https://donthuocquocgia.vn",
            "NationalGateway:Prescription:BaseUrl");
        HIS.Application.Services.Nangcap23ConfigValidator.EnsureSafeUrl(
            configuration["NationalGateway:Pharmacy:BaseUrl"] ?? "https://duocquocgia.com.vn",
            "NationalGateway:Pharmacy:BaseUrl");
        HIS.Application.Services.Nangcap23ConfigValidator.EnsureSafeUrl(
            configuration["DeAn06:BaseUrl"] ?? "https://gdbhyt.baohiemxahoi.gov.vn",
            "DeAn06:BaseUrl");
        HIS.Application.Services.Nangcap23ConfigValidator.EnsureSafeUrl(
            configuration["Zalo:BaseUrl"] ?? "https://business.openapi.zalo.me",
            "Zalo:BaseUrl");

        // Polly circuit breaker: sau 5 lỗi liên tiếp (5xx/network/timeout), mở mạch 30s
        // → fast-fail toàn bộ request đến gateway đó → không block thread pool.
        // HandleTransientHttpError handle: HttpRequestException + 5xx + 408 timeout.
        var cbThreshold = configuration.GetValue<int>("NationalGateway:CircuitBreakerThreshold", 5);
        var cbDurationSec = configuration.GetValue<int>("NationalGateway:CircuitBreakerDurationSeconds", 30);
        Polly.IAsyncPolicy<HttpResponseMessage> circuitBreaker() =>
            Polly.Extensions.Http.HttpPolicyExtensions
                .HandleTransientHttpError()
                .CircuitBreakerAsync(cbThreshold, TimeSpan.FromSeconds(cbDurationSec));

        if (ngMock)
        {
            services.AddSingleton<HIS.Application.Services.INationalPrescriptionGatewayClient,
                HIS.Infrastructure.Services.External.InMemoryNationalPrescriptionGatewayClient>();
            services.AddSingleton<HIS.Application.Services.INationalPharmacyGatewayClient,
                HIS.Infrastructure.Services.External.InMemoryNationalPharmacyGatewayClient>();
            services.AddSingleton<HIS.Application.Services.IDeAn06GatewayClient,
                HIS.Infrastructure.Services.External.InMemoryDeAn06GatewayClient>();
        }
        else
        {
            services.AddHttpClient<HIS.Application.Services.INationalPrescriptionGatewayClient,
                HIS.Infrastructure.Services.External.HttpNationalPrescriptionGatewayClient>(c =>
            {
                c.BaseAddress = new Uri(configuration["NationalGateway:Prescription:BaseUrl"] ?? "https://donthuocquocgia.vn");
                c.Timeout = ngTimeout;
            }).AddPolicyHandler(circuitBreaker());

            services.AddHttpClient<HIS.Application.Services.INationalPharmacyGatewayClient,
                HIS.Infrastructure.Services.External.HttpNationalPharmacyGatewayClient>(c =>
            {
                c.BaseAddress = new Uri(configuration["NationalGateway:Pharmacy:BaseUrl"] ?? "https://duocquocgia.com.vn");
                c.Timeout = ngTimeout;
            }).AddPolicyHandler(circuitBreaker());

            services.AddHttpClient<HIS.Application.Services.IDeAn06GatewayClient,
                HIS.Infrastructure.Services.External.HttpDeAn06GatewayClient>(c =>
            {
                c.BaseAddress = new Uri(configuration["DeAn06:BaseUrl"] ?? "https://gdbhyt.baohiemxahoi.gov.vn");
                c.Timeout = ngTimeout;
            }).AddPolicyHandler(circuitBreaker());
        }

        if (zaloMock)
        {
            services.AddSingleton<HIS.Application.Services.IZaloOaClient,
                HIS.Infrastructure.Services.External.InMemoryZaloOaClient>();
        }
        else
        {
            services.AddHttpClient<HIS.Application.Services.IZaloOaClient,
                HIS.Infrastructure.Services.External.HttpZaloOaClient>(c =>
            {
                c.BaseAddress = new Uri(configuration["Zalo:BaseUrl"] ?? "https://business.openapi.zalo.me");
                c.Timeout = zaloTimeout;
            }).AddPolicyHandler(circuitBreaker());
        }

        // HĐĐT (E-invoice) — provider cắm-thay-được (IElectronicInvoiceProvider).
        // Endpoint/tài khoản/mật khẩu/ký hiệu/mẫu số đọc từ config "EInvoice:*" (env, KHÔNG hardcode).
        // Khi chưa cấu hình → provider.IsConfigured=false → BillingCompleteService fallback phát hành
        // nội bộ (không vỡ luồng thu ngân). BaseUrl rỗng dùng placeholder chỉ để khởi tạo HttpClient
        // (không bao giờ gọi tới khi IsConfigured=false).
        var einvUrl = configuration["EInvoice:Vnpt:BaseUrl"];
        if (string.IsNullOrWhiteSpace(einvUrl))
            einvUrl = "https://einvoice-not-configured.invalid";
        else
            HIS.Application.Services.Nangcap23ConfigValidator.EnsureSafeUrl(einvUrl, "EInvoice:Vnpt:BaseUrl");
        var einvTimeout = TimeSpan.FromSeconds(configuration.GetValue<int>("EInvoice:TimeoutSeconds", 30));
        services.AddHttpClient<HIS.Application.Services.IElectronicInvoiceProvider,
            HIS.Infrastructure.Services.External.VnptEInvoiceProvider>(c =>
        {
            c.BaseAddress = new Uri(einvUrl);
            c.Timeout = einvTimeout;
        });

        return services;
    }
}
