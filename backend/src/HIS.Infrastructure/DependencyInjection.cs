using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HIS.Core.Interfaces;
using HIS.Application.Services;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;

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
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPatientService, PatientService>();

        // Phân hệ 1: Tiếp đón (Reception) - 105+ methods
        services.AddScoped<IReceptionCompleteService, ReceptionCompleteService>();

        // Phân hệ 2: Khám bệnh OPD (Examination) - 180+ methods
        services.AddScoped<IExaminationCompleteService, ExaminationCompleteService>();

        // TODO: Workflow Services - Các luồng làm việc liên kết 17 phân hệ HIS
        // Theo HIS_DataFlow_Architecture.md

        // Luồng 1: Khám bệnh Ngoại trú (OPD Flow)
        // Tiếp đón → Khám bệnh → Chỉ định → XN/CĐHA → Kho Dược → Thu ngân → BHYT
        // services.AddScoped<IOPDWorkflowService, OPDWorkflowService>();

        // TODO: Các workflow services khác cần được hoàn thiện entities trước khi enable
        // Luồng 2: Điều trị Nội trú (IPD Flow)
        // services.AddScoped<IIPDWorkflowService, IPDWorkflowService>();

        // Luồng 3: Phẫu thuật Thủ thuật (Surgery Flow)
        // services.AddScoped<ISurgeryWorkflowService, SurgeryWorkflowService>();

        // Luồng 4: Xét nghiệm (Lab/LIS Flow)
        // services.AddScoped<ILabWorkflowService, LabWorkflowService>();

        // Luồng 5: Chẩn đoán Hình ảnh (RIS/PACS Flow)
        // services.AddScoped<IImagingWorkflowService, ImagingWorkflowService>();

        // Luồng 6: Kho Dược & Phát thuốc (Pharmacy Flow)
        // services.AddScoped<IPharmacyWorkflowService, PharmacyWorkflowService>();

        // Luồng 7: Thanh toán & Viện phí (Billing Flow)
        // services.AddScoped<IBillingWorkflowService, BillingWorkflowService>();

        // Luồng 8: Bảo hiểm Y tế (Insurance/BHYT Flow)
        // services.AddScoped<IInsuranceWorkflowService, InsuranceWorkflowService>();

        // Luồng 9: Ngân hàng Máu (Blood Bank Flow)
        // services.AddScoped<IBloodBankWorkflowService, BloodBankWorkflowService>();

        // Luồng 10: Báo cáo & Thống kê (Reporting Flow)
        // services.AddScoped<IReportingWorkflowService, ReportingWorkflowService>();

        return services;
    }
}
