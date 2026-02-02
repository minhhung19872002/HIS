using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<HISDbContext>();

        // Ensure database is created
        await context.Database.EnsureCreatedAsync();

        // Seed roles
        if (!await context.Roles.AnyAsync())
        {
            var roles = new List<Role>
            {
                new() { Id = Guid.NewGuid(), RoleCode = "ADMIN", RoleName = "Quản trị viên", Description = "Quản trị hệ thống" },
                new() { Id = Guid.NewGuid(), RoleCode = "DOCTOR", RoleName = "Bác sĩ", Description = "Bác sĩ khám chữa bệnh" },
                new() { Id = Guid.NewGuid(), RoleCode = "NURSE", RoleName = "Điều dưỡng", Description = "Điều dưỡng" },
                new() { Id = Guid.NewGuid(), RoleCode = "RECEPTIONIST", RoleName = "Tiếp đón", Description = "Nhân viên tiếp đón" },
                new() { Id = Guid.NewGuid(), RoleCode = "PHARMACIST", RoleName = "Dược sĩ", Description = "Dược sĩ" },
                new() { Id = Guid.NewGuid(), RoleCode = "LAB_TECH", RoleName = "KTV Xét nghiệm", Description = "Kỹ thuật viên xét nghiệm" },
                new() { Id = Guid.NewGuid(), RoleCode = "CASHIER", RoleName = "Thu ngân", Description = "Nhân viên thu ngân" },
            };

            await context.Roles.AddRangeAsync(roles);
            await context.SaveChangesAsync();
        }

        // Get admin role
        var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleCode == "ADMIN");

        // Seed admin user
        if (!await context.Users.AnyAsync())
        {
            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                FullName = "Administrator",
                Email = "admin@his.local",
                EmployeeCode = "NV00001",
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            await context.Users.AddAsync(adminUser);
            await context.SaveChangesAsync();

            // Assign admin role
            if (adminRole != null)
            {
                var userRole = new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = adminUser.Id,
                    RoleId = adminRole.Id,
                    CreatedAt = DateTime.UtcNow
                };
                await context.UserRoles.AddAsync(userRole);
                await context.SaveChangesAsync();
            }
        }

        // Seed departments
        if (!await context.Departments.AnyAsync())
        {
            var departments = new List<Department>
            {
                new() { Id = Guid.NewGuid(), DepartmentCode = "ADMIN", DepartmentName = "Phòng Hành chính", DepartmentType = 0, IsActive = true },
                new() { Id = Guid.NewGuid(), DepartmentCode = "NOI", DepartmentName = "Khoa Nội", DepartmentType = 1, IsActive = true },
                new() { Id = Guid.NewGuid(), DepartmentCode = "NGOAI", DepartmentName = "Khoa Ngoại", DepartmentType = 1, IsActive = true },
                new() { Id = Guid.NewGuid(), DepartmentCode = "SAN", DepartmentName = "Khoa Sản", DepartmentType = 1, IsActive = true },
                new() { Id = Guid.NewGuid(), DepartmentCode = "NHI", DepartmentName = "Khoa Nhi", DepartmentType = 1, IsActive = true },
                new() { Id = Guid.NewGuid(), DepartmentCode = "LAB", DepartmentName = "Khoa Xét nghiệm", DepartmentType = 2, IsActive = true },
                new() { Id = Guid.NewGuid(), DepartmentCode = "CDHA", DepartmentName = "Khoa CĐHA", DepartmentType = 2, IsActive = true },
                new() { Id = Guid.NewGuid(), DepartmentCode = "DUOC", DepartmentName = "Khoa Dược", DepartmentType = 3, IsActive = true },
            };

            await context.Departments.AddRangeAsync(departments);
            await context.SaveChangesAsync();
        }

        // Seed permissions
        if (!await context.Permissions.AnyAsync())
        {
            var permissions = new List<Permission>
            {
                // System
                new() { Id = Guid.NewGuid(), PermissionCode = "SYSTEM.MANAGE", PermissionName = "Quản lý hệ thống", Module = "System" },
                new() { Id = Guid.NewGuid(), PermissionCode = "SYSTEM.CONFIG", PermissionName = "Cấu hình hệ thống", Module = "System" },

                // Users
                new() { Id = Guid.NewGuid(), PermissionCode = "USER.VIEW", PermissionName = "Xem người dùng", Module = "User" },
                new() { Id = Guid.NewGuid(), PermissionCode = "USER.CREATE", PermissionName = "Tạo người dùng", Module = "User" },
                new() { Id = Guid.NewGuid(), PermissionCode = "USER.EDIT", PermissionName = "Sửa người dùng", Module = "User" },
                new() { Id = Guid.NewGuid(), PermissionCode = "USER.DELETE", PermissionName = "Xóa người dùng", Module = "User" },

                // Patients
                new() { Id = Guid.NewGuid(), PermissionCode = "PATIENT.VIEW", PermissionName = "Xem bệnh nhân", Module = "Patient" },
                new() { Id = Guid.NewGuid(), PermissionCode = "PATIENT.CREATE", PermissionName = "Tạo bệnh nhân", Module = "Patient" },
                new() { Id = Guid.NewGuid(), PermissionCode = "PATIENT.EDIT", PermissionName = "Sửa bệnh nhân", Module = "Patient" },

                // Reception
                new() { Id = Guid.NewGuid(), PermissionCode = "RECEPTION.VIEW", PermissionName = "Xem tiếp đón", Module = "Reception" },
                new() { Id = Guid.NewGuid(), PermissionCode = "RECEPTION.CREATE", PermissionName = "Đăng ký khám", Module = "Reception" },

                // Examination
                new() { Id = Guid.NewGuid(), PermissionCode = "EXAM.VIEW", PermissionName = "Xem khám bệnh", Module = "Examination" },
                new() { Id = Guid.NewGuid(), PermissionCode = "EXAM.CREATE", PermissionName = "Thực hiện khám", Module = "Examination" },

                // Pharmacy
                new() { Id = Guid.NewGuid(), PermissionCode = "PHARMACY.VIEW", PermissionName = "Xem dược", Module = "Pharmacy" },
                new() { Id = Guid.NewGuid(), PermissionCode = "PHARMACY.DISPENSE", PermissionName = "Cấp phát thuốc", Module = "Pharmacy" },

                // Laboratory
                new() { Id = Guid.NewGuid(), PermissionCode = "LAB.VIEW", PermissionName = "Xem xét nghiệm", Module = "Laboratory" },
                new() { Id = Guid.NewGuid(), PermissionCode = "LAB.RESULT", PermissionName = "Nhập kết quả XN", Module = "Laboratory" },

                // Billing
                new() { Id = Guid.NewGuid(), PermissionCode = "BILLING.VIEW", PermissionName = "Xem viện phí", Module = "Billing" },
                new() { Id = Guid.NewGuid(), PermissionCode = "BILLING.COLLECT", PermissionName = "Thu phí", Module = "Billing" },

                // Reports
                new() { Id = Guid.NewGuid(), PermissionCode = "REPORT.VIEW", PermissionName = "Xem báo cáo", Module = "Report" },
                new() { Id = Guid.NewGuid(), PermissionCode = "REPORT.EXPORT", PermissionName = "Xuất báo cáo", Module = "Report" },
            };

            await context.Permissions.AddRangeAsync(permissions);
            await context.SaveChangesAsync();

            // Assign all permissions to admin role
            if (adminRole != null)
            {
                var rolePermissions = permissions.Select(p => new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = adminRole.Id,
                    PermissionId = p.Id,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                await context.RolePermissions.AddRangeAsync(rolePermissions);
                await context.SaveChangesAsync();
            }
        }

        // Seed medicines
        if (!await context.Medicines.AnyAsync())
        {
            var medicines = new List<Medicine>
            {
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "PARA500",
                    MedicineName = "Paracetamol 500mg",
                    ActiveIngredient = "Paracetamol",
                    Concentration = "500mg",
                    MedicineType = 1,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 500,
                    InsurancePrice = 450,
                    ServicePrice = 500,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1-2 viên/lần",
                    DefaultUsage = "Uống sau ăn",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "AMOX500",
                    MedicineName = "Amoxicillin 500mg",
                    ActiveIngredient = "Amoxicillin",
                    Concentration = "500mg",
                    MedicineType = 1,
                    IsAntibiotic = true,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 2000,
                    InsurancePrice = 1800,
                    ServicePrice = 2000,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1 viên x 3 lần/ngày",
                    DefaultUsage = "Uống sau ăn",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "IBU400",
                    MedicineName = "Ibuprofen 400mg",
                    ActiveIngredient = "Ibuprofen",
                    Concentration = "400mg",
                    MedicineType = 1,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 1500,
                    InsurancePrice = 1200,
                    ServicePrice = 1500,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1 viên x 2-3 lần/ngày",
                    DefaultUsage = "Uống sau ăn no",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "OMEP20",
                    MedicineName = "Omeprazole 20mg",
                    ActiveIngredient = "Omeprazole",
                    Concentration = "20mg",
                    MedicineType = 1,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 3000,
                    InsurancePrice = 2500,
                    ServicePrice = 3000,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1 viên/ngày",
                    DefaultUsage = "Uống trước ăn 30 phút",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "LORAT10",
                    MedicineName = "Loratadine 10mg",
                    ActiveIngredient = "Loratadine",
                    Concentration = "10mg",
                    MedicineType = 1,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 2500,
                    InsurancePrice = 2000,
                    ServicePrice = 2500,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1 viên/ngày",
                    DefaultUsage = "Uống bất kỳ lúc nào",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "METF500",
                    MedicineName = "Metformin 500mg",
                    ActiveIngredient = "Metformin",
                    Concentration = "500mg",
                    MedicineType = 1,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 800,
                    InsurancePrice = 700,
                    ServicePrice = 800,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1 viên x 2 lần/ngày",
                    DefaultUsage = "Uống sau ăn",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "AMLO5",
                    MedicineName = "Amlodipine 5mg",
                    ActiveIngredient = "Amlodipine",
                    Concentration = "5mg",
                    MedicineType = 1,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 1200,
                    InsurancePrice = 1000,
                    ServicePrice = 1200,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1 viên/ngày",
                    DefaultUsage = "Uống buổi sáng",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "ATOR20",
                    MedicineName = "Atorvastatin 20mg",
                    ActiveIngredient = "Atorvastatin",
                    Concentration = "20mg",
                    MedicineType = 1,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 5000,
                    InsurancePrice = 4500,
                    ServicePrice = 5000,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1 viên/ngày",
                    DefaultUsage = "Uống buổi tối",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "CEFIX200",
                    MedicineName = "Cefixime 200mg",
                    ActiveIngredient = "Cefixime",
                    Concentration = "200mg",
                    MedicineType = 1,
                    IsAntibiotic = true,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 8000,
                    InsurancePrice = 7000,
                    ServicePrice = 8000,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1 viên x 2 lần/ngày",
                    DefaultUsage = "Uống sau ăn",
                    IsActive = true
                },
                new() {
                    Id = Guid.NewGuid(),
                    MedicineCode = "VITC500",
                    MedicineName = "Vitamin C 500mg",
                    ActiveIngredient = "Acid Ascorbic",
                    Concentration = "500mg",
                    MedicineType = 1,
                    Unit = "Viên",
                    RouteCode = "UONG",
                    RouteName = "Uống",
                    UnitPrice = 300,
                    InsurancePrice = 250,
                    ServicePrice = 300,
                    IsInsuranceCovered = true,
                    InsurancePaymentRate = 100,
                    DefaultDosage = "1-2 viên/ngày",
                    DefaultUsage = "Uống sau ăn",
                    IsActive = true
                },
            };

            await context.Medicines.AddRangeAsync(medicines);
            await context.SaveChangesAsync();
        }
    }
}
