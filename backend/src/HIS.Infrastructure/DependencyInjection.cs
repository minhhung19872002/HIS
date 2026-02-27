using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HIS.Core.Interfaces;
using HIS.Application.Services;
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
        services.AddScoped<IDigitalSignatureService, DigitalSignatureService>(); // USB Token signing
        services.AddScoped<IPdfSignatureService, PdfSignatureService>(); // PDF generation and signing

        // Phân hệ 7: Xét nghiệm LIS (Laboratory Information System)
        services.AddSingleton<HL7ConnectionManager>();
        services.AddScoped<ILISCompleteService, LISCompleteService>();
        services.AddHostedService<HL7ReceiverService>(); // TCP listener for HL7 messages

        // Phân hệ 9: Ngân hàng máu (Blood Bank)
        services.AddScoped<IBloodBankCompleteService, BloodBankCompleteService>();

        // Phân hệ 12: Giám định BHYT - XML Export
        services.AddScoped<IInsuranceXmlService, InsuranceXmlService>();

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

        // Data Inheritance (Kế thừa dữ liệu giữa các phân hệ - Level 6 item 1.8)
        services.AddScoped<IDataInheritanceService, DataInheritanceService>();

        return services;
    }
}
