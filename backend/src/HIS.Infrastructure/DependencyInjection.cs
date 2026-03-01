using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Extensions.Http;
using HIS.Core.Interfaces;
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
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(HISDbContext).Assembly.FullName)));

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

        // Phân hệ 6: Phẫu thuật Thủ thuật (Surgery)
        services.AddScoped<ISurgeryCompleteService, SurgeryCompleteService>();

        // Phân hệ 8: Chẩn đoán hình ảnh RIS/PACS (Radiology)
        services.AddScoped<IRISCompleteService, RISCompleteService>();
        services.AddScoped<IDigitalSignatureService, DigitalSignatureService>(); // USB Token signing (Windows CryptoAPI)
        services.AddScoped<IPdfSignatureService, PdfSignatureService>(); // PDF generation and signing
        services.AddSingleton<Pkcs11SessionManager>(); // PKCS#11 session caching (singleton)
        services.AddScoped<ITokenRegistryService, TokenRegistryService>(); // Token-user mapping
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

        // HL7 CDA R2 Document Generation (health information exchange)
        services.AddScoped<ICdaDocumentService, CdaDocumentService>();

        // Online Appointment Booking (Public - không cần đăng nhập)
        services.AddScoped<IAppointmentBookingService, AppointmentBookingService>();

        // Booking Management (Staff - cần đăng nhập)
        services.AddScoped<IBookingManagementService, BookingManagementService>();

        // Medical Record Archive (Lưu trữ hồ sơ bệnh án)
        services.AddScoped<IMedicalRecordArchiveService, MedicalRecordArchiveService>();

        // DQGVN National Health Data Exchange (Cong du lieu y te quoc gia)
        services.AddScoped<IDqgvnService, DqgvnService>();

        // Giải phẫu bệnh & Tế bào học (Pathology)
        services.AddScoped<IPathologyService, PathologyService>();

        // Kho lưu chủng Vi Sinh (Culture Stock)
        services.AddScoped<ICultureStockService, CultureStockService>();

        return services;
    }
}
