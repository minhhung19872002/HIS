namespace HIS.Core.Constants;

/// <summary>
/// Nguồn hằng DUY NHẤT cho tên role dùng trong <c>[Authorize(Roles = ...)]</c> (BE).
/// Mục tiêu (#183 Phase-1): gom 521 literal rải ở 47 controller về 1 nơi để typo role
/// trở thành lỗi COMPILE thay vì cấp/chặn quyền sai im lặng.
///
/// ⚠️ GIÁ TRỊ chuỗi ở đây PHẢI khớp BYTE-IDENTICAL với literal cũ — KHÔNG đổi chính tả
/// trong Phase-1 (đổi sai = khóa user). Việc gộp biến thể ("1 chính tả/role") = Phase-2,
/// cần xác nhận role thật trong bảng Users/Roles của PROD trước (xem #183).
///
/// Role-claim của JWT (xem AuthService.GenerateJwtToken) = RoleName (chuỗi VN trong DB)
/// + tên tiếng Anh map từ RoleCode. Vì vậy tập role THỰC SỰ cấp quyền (LIVE) hôm nay chỉ là
/// các hằng nhóm "LIVE" bên dưới + RoleName VN thật. Các hằng nhóm "nghi chết" hiện không
/// được pipeline sinh ra (gate vô hiệu) trừ khi prod có custom-role trùng tên — cần rà ở Phase-2.
/// </summary>
public static class RoleNames
{
    // ── LIVE: tên tiếng Anh sinh từ RoleCode (AuthService.RoleCodeToEnglishRoles) ──
    public const string Admin = "Admin";                 // ADMIN
    public const string Manager = "Manager";             // ADMIN
    public const string Director = "Director";           // ADMIN
    public const string Doctor = "Doctor";               // DOCTOR
    public const string Nurse = "Nurse";                 // NURSE
    public const string Receptionist = "Receptionist";   // RECEPTIONIST
    public const string Pharmacist = "Pharmacist";       // PHARMACIST
    public const string PharmacyManager = "PharmacyManager"; // PHARMACIST
    public const string Cashier = "Cashier";             // CASHIER
    public const string Accountant = "Accountant";       // CASHIER

    // ── LIVE: RoleName tiếng Việt (DatabaseSeeder) — dùng trực tiếp trong vài [Authorize] ──
    public const string QuanTriHeThong = "Quản trị hệ thống"; // ⚠ Description của ADMIN ≠ RoleName "Quản trị viên"; Phase-2 rà khớp data
    public const string BacSi = "Bác sĩ";
    public const string DieuDuong = "Điều dưỡng";
    public const string ThuNgan = "Thu ngân";

    // ── Nghi "chết" (không nằm trong pipeline claim hiện tại) — Phase-2 verify vs prod ──
    // Cặp biến thể CẦN GỘP ở Phase-2: RadiologistManager (x66) vs RadiologyManager (x15)
    public const string RadiologistManager = "RadiologistManager";
    public const string RadiologyManager = "RadiologyManager";
    public const string Radiologist = "Radiologist";
    public const string BloodBankManager = "BloodBankManager";
    public const string BloodBankStaff = "BloodBankStaff";
    public const string Technician = "Technician";
    public const string WarehouseManager = "WarehouseManager";
    public const string WarehouseStaff = "WarehouseStaff";
    public const string CatalogManager = "CatalogManager";
    public const string LabManager = "LabManager";
    public const string LabReceptionist = "LabReceptionist";
    public const string LabReviewer = "LabReviewer";
    public const string DepartmentHead = "DepartmentHead";
    public const string MedicalRecordManager = "MedicalRecordManager";
    public const string StatisticsOfficer = "StatisticsOfficer";
    public const string SurgeryManager = "SurgeryManager";
    public const string PharmacyHead = "PharmacyHead";
    public const string InsuranceManager = "InsuranceManager";
    public const string InsuranceOfficer = "InsuranceOfficer";
    public const string BhxhInspector = "BhxhInspector";
    public const string Midwife = "Midwife";
    public const string IT = "IT";
    public const string Procurement = "Procurement";
    public const string PortalPatient = "PortalPatient";
    public const string InfectionControl = "InfectionControl";
    public const string HRManager = "HRManager";
    public const string AssetManager = "AssetManager";
}
