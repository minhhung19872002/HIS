using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HIS.Core.Interfaces;
using HIS.Application.Services;
using HIS.Application.Workflows;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Infrastructure.Workflows;

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

        // Workflow Services - Các luồng làm việc liên kết 17 phân hệ HIS
        // Theo HIS_DataFlow_Architecture.md

        // Luồng 1: Khám bệnh Ngoại trú (OPD Flow)
        // Tiếp đón → Khám bệnh → Chỉ định → XN/CĐHA → Kho Dược → Thu ngân → BHYT
        services.AddScoped<IOPDWorkflowService, OPDWorkflowService>();

        // Luồng 2: Điều trị Nội trú (IPD Flow)
        // Khám bệnh → Nội trú → Chỉ định → XN/CĐHA/PTTT → Kho Dược → Thu ngân → BHYT → HSBA
        services.AddScoped<IIPDWorkflowService, IPDWorkflowService>();

        // Luồng 3: Phẫu thuật Thủ thuật (Surgery Flow)
        // Khoa LS → PTTT → Kho Dược → Kho Máu → Tài chính
        services.AddScoped<ISurgeryWorkflowService, SurgeryWorkflowService>();

        // Luồng 4: Xét nghiệm (Lab/LIS Flow)
        // Chỉ định → LIS → Kho Dược (vật tư) → Khám bệnh/Nội trú
        services.AddScoped<ILabWorkflowService, LabWorkflowService>();

        // Luồng 5: Chẩn đoán Hình ảnh (RIS/PACS Flow)
        // Chỉ định → RIS → PACS → Khám bệnh/Nội trú
        services.AddScoped<IImagingWorkflowService, ImagingWorkflowService>();

        // Luồng 6: Kho Dược & Phát thuốc (Pharmacy Flow)
        // Nhập kho → Xuất ngoại trú/nội trú → Chuyển kho → Kiểm soát tồn (FIFO/FEFO)
        services.AddScoped<IPharmacyWorkflowService, PharmacyWorkflowService>();

        // Luồng 7: Thanh toán & Viện phí (Billing Flow)
        // Tổng hợp chi phí → Tách theo nguồn → Thu ngân → Sổ quỹ
        services.AddScoped<IBillingWorkflowService, BillingWorkflowService>();

        // Luồng 8: Bảo hiểm Y tế (Insurance/BHYT Flow)
        // Tiếp đón → Thu ngân → BHYT → Cổng BHXH (XML 130/4210)
        services.AddScoped<IInsuranceWorkflowService, InsuranceWorkflowService>();

        // Luồng 9: Ngân hàng Máu (Blood Bank Flow)
        // Nhập máu → Xét nghiệm → Lưu kho → Yêu cầu → Cross-match → Xuất → Truyền
        services.AddScoped<IBloodBankWorkflowService, BloodBankWorkflowService>();

        // Luồng 10: Báo cáo & Thống kê (Reporting Flow)
        // Tổng hợp từ tất cả module → BC Dược / Tài chính / HSBA / BHYT
        services.AddScoped<IReportingWorkflowService, ReportingWorkflowService>();

        return services;
    }
}
