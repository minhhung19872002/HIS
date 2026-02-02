using Microsoft.Extensions.DependencyInjection;
using HIS.Application.Services;
using HIS.Application.Workflows;

namespace HIS.Application.Registration
{
    /// <summary>
    /// Đăng ký Dependency Injection cho các Workflow Services
    /// Hỗ trợ 20 luồng chính của hệ thống HIS
    /// </summary>
    public static class WorkflowServiceRegistration
    {
        /// <summary>
        /// Đăng ký tất cả Workflow Services
        /// </summary>
        public static IServiceCollection AddWorkflowServices(this IServiceCollection services)
        {
            // ============ Luồng 1-6: Đã có trong hệ thống ============

            // Luồng 1: OPD Workflow
            // services.AddScoped<IOPDWorkflowService, OPDWorkflowService>();

            // Luồng 2: IPD Workflow
            // services.AddScoped<IIPDWorkflowService, IPDWorkflowService>();

            // Luồng 3: Surgery Workflow
            // services.AddScoped<ISurgeryWorkflowService, SurgeryWorkflowService>();

            // Luồng 4: Lab Workflow
            // services.AddScoped<ILabWorkflowService, LabWorkflowService>();

            // Luồng 5: Pharmacy Workflow
            // services.AddScoped<IPharmacyWorkflowService, PharmacyWorkflowService>();

            // Luồng 6: Billing Workflow
            // services.AddScoped<IBillingWorkflowService, BillingWorkflowService>();

            // ============ Luồng 7-10: Các luồng mới ============

            // Luồng 7: RIS/PACS Workflow (Chẩn đoán hình ảnh)
            services.AddScoped<IImagingWorkflowService, RISPACSWorkflowService>();

            // Luồng 8: Blood Bank Workflow (Ngân hàng máu)
            services.AddScoped<IBloodBankWorkflowService, BloodBankWorkflowService>();

            // Luồng 9: Insurance Extended Workflow (BHYT mở rộng)
            services.AddScoped<IInsuranceWorkflowService, InsuranceExtendedWorkflowService>();

            // Luồng 10: Reporting Workflow (Báo cáo & Thống kê)
            services.AddScoped<IReportingWorkflowService, ReportingWorkflowService>();

            // ============ Luồng 11-20: Các luồng mở rộng ============

            // Luồng 11: Telemedicine Workflow (Khám bệnh từ xa)
            services.AddScoped<ITelemedicineWorkflowService, TelemedicineWorkflowServiceImpl>();

            // Luồng 12: Clinical Nutrition Workflow (Dinh dưỡng lâm sàng)
            services.AddScoped<INutritionWorkflowService, NutritionWorkflowServiceImpl>();

            // Luồng 13: Infection Control Workflow (Kiểm soát nhiễm khuẩn)
            services.AddScoped<IInfectionControlWorkflowService, InfectionControlWorkflowServiceImpl>();

            // Luồng 14: Rehabilitation Workflow (Vật lý trị liệu/PHCN)
            services.AddScoped<IRehabilitationWorkflowService, RehabilitationWorkflowServiceImpl>();

            // Luồng 15: Medical Equipment Workflow (Quản lý TTB y tế)
            services.AddScoped<IEquipmentWorkflowService, EquipmentWorkflowServiceImpl>();

            // Luồng 16: Medical HR Workflow (Quản lý nhân sự y tế)
            services.AddScoped<IMedicalHRWorkflowService, MedicalHRWorkflowServiceImpl>();

            // Luồng 17: Quality Management Workflow (Quản lý chất lượng)
            services.AddScoped<IQualityManagementWorkflowService, QualityManagementWorkflowServiceImpl>();

            // Luồng 18: Patient Portal Workflow (Cổng bệnh nhân)
            services.AddScoped<IPatientPortalWorkflowService, PatientPortalWorkflowServiceImpl>();

            // Luồng 19: Health Information Exchange Workflow (Liên thông y tế)
            services.AddScoped<IHealthExchangeWorkflowService, HealthExchangeWorkflowServiceImpl>();

            // Luồng 20: Mass Casualty Incident Workflow (Cấp cứu thảm họa)
            services.AddScoped<IMassCasualtyWorkflowService, MassCasualtyWorkflowServiceImpl>();

            return services;
        }

        /// <summary>
        /// Đăng ký tất cả Complete Services cho các module
        /// </summary>
        public static IServiceCollection AddCompleteServices(this IServiceCollection services)
        {
            // Module 1: Tiếp đón
            // services.AddScoped<IReceptionCompleteService, ReceptionCompleteService>();

            // Module 2: Khám bệnh OPD
            // services.AddScoped<IExaminationCompleteService, ExaminationCompleteService>();

            // Module 3: Nội trú IPD
            // services.AddScoped<IInpatientCompleteService, InpatientCompleteService>();

            // Module 5: Kho Dược
            // services.AddScoped<IWarehouseCompleteService, WarehouseCompleteService>();

            // Module 6: PTTT
            // services.AddScoped<ISurgeryCompleteService, SurgeryCompleteService>();

            // Module 7: Xét nghiệm LIS
            // services.AddScoped<ILISCompleteService, LISCompleteService>();

            // Module 8: CĐHA RIS
            // services.AddScoped<IRISCompleteService, RISCompleteService>();

            // Module 9: Kho máu
            // services.AddScoped<IBloodBankCompleteService, BloodBankCompleteService>();

            // Module 10: Thu ngân
            // services.AddScoped<IBillingCompleteService, BillingCompleteService>();

            // Module 12: BHYT
            // services.AddScoped<IInsuranceXmlService, InsuranceXmlService>();

            // Module 16: Báo cáo & Thống kê (MỚI)
            // services.AddScoped<IReportingCompleteService, ReportingCompleteService>();

            // Module 17: Quản trị hệ thống
            // services.AddScoped<ISystemCompleteService, SystemCompleteService>();

            // ============ Luồng 11-20: Extended Services ============

            // Module 11: Telemedicine
            services.AddScoped<ITelemedicineService, TelemedicineService>();

            // Module 12: Clinical Nutrition
            services.AddScoped<IClinicalNutritionService, ClinicalNutritionService>();

            // Module 13: Infection Control
            services.AddScoped<IInfectionControlService, InfectionControlService>();

            // Module 14: Rehabilitation
            services.AddScoped<IRehabilitationService, RehabilitationService>();

            // Module 15: Medical Equipment
            services.AddScoped<IMedicalEquipmentService, MedicalEquipmentService>();

            // Module 16: Medical HR
            services.AddScoped<IMedicalHRService, MedicalHRService>();

            // Module 17: Quality Management
            services.AddScoped<IQualityManagementService, QualityManagementService>();

            // Module 18: Patient Portal
            services.AddScoped<IPatientPortalService, PatientPortalService>();

            // Module 19: Health Information Exchange
            services.AddScoped<IHealthExchangeService, HealthExchangeService>();

            // Module 20: Mass Casualty Incident
            services.AddScoped<IMassCasualtyService, MassCasualtyService>();

            return services;
        }

        /// <summary>
        /// Đăng ký tất cả services cho HIS Application
        /// </summary>
        public static IServiceCollection AddHISApplicationServices(this IServiceCollection services)
        {
            // Core Services
            services.AddCompleteServices();

            // Workflow Services
            services.AddWorkflowServices();

            return services;
        }
    }
}
