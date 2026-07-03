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

    // ── LIVE: RoleName tiếng Việt — VERIFIED vs prod /api/admin/roles 2026-07-03 (#183 Phase-2):
    // ADMIN="Quản trị hệ thống" · DOCTOR="Bác sĩ" · NURSE="Điều dưỡng" · CASHIER="Thu ngân"
    // (prod còn: "Tiếp đón"/"Dược sĩ"/"Kỹ thuật viên XN"/"Kỹ thuật viên CĐHA" — emit vào claim nhưng chưa cần hằng)
    public const string QuanTriHeThong = "Quản trị hệ thống"; // ✅ KHỚP RoleName prod (không phải "Quản trị viên")
    public const string BacSi = "Bác sĩ";
    public const string DieuDuong = "Điều dưỡng";
    public const string ThuNgan = "Thu ngân";

    // ── Orphan (VERIFIED 2026-07-03: prod Roles chỉ có 8 RoleCode → JWT KHÔNG bao giờ emit nhóm dưới;
    //    gate chứa chúng chỉ mở được nhờ role LIVE đi kèm). Muốn kích hoạt → Phương án B (#183 comment audit).
    // Phase-2 ĐÃ GỘP biến thể RadiologyManager (x15) → RadiologistManager (2026-07-03, behavior-neutral vì cả 2 orphan).
    public const string RadiologistManager = "RadiologistManager";
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
