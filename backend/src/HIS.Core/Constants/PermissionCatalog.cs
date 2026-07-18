namespace HIS.Core.Constants;

/// <summary>
/// AUTHZ-1 (#367): catalog permission code-first — SINGLE SOURCE OF TRUTH cho mã quyền.
/// Chuẩn: <c>Resource.Action</c> PascalCase (Patient.Read, Prescription.Approve). KHÔNG nhét scope
/// vào mã (không Patient.ReadAll — scope là chiều gán, thuộc AUTHZ-3 #369).
/// Seeder upsert catalog này vào bảng Permissions mỗi startup (idempotent, không xóa code cũ).
/// Gate bằng <c>[RequirePermission(PermissionCatalog.X.Y)]</c> — typo thành lỗi COMPILE.
/// </summary>
public static class PermissionCatalog
{
    // ── System / quản trị ──
    public static class System
    {
        public const string Configure = "System.Configure";
        public const string ManageUsers = "System.ManageUsers";
        public const string ManageRoles = "System.ManageRoles";
    }

    public static class Session
    {
        public const string Read = "Session.Read";
        public const string Terminate = "Session.Terminate";
    }

    public static class AuditLog
    {
        public const string Read = "AuditLog.Read";
        public const string Export = "AuditLog.Export";
    }

    // ── Lâm sàng ──
    public static class Patient
    {
        public const string Read = "Patient.Read";
        public const string Create = "Patient.Create";
        public const string Update = "Patient.Update";
        public const string Merge = "Patient.Merge";
    }

    public static class MedicalRecord
    {
        public const string Read = "MedicalRecord.Read";
        public const string Create = "MedicalRecord.Create";
        public const string Update = "MedicalRecord.Update";
        public const string Lock = "MedicalRecord.Lock";
        public const string Unlock = "MedicalRecord.Unlock";
        public const string Export = "MedicalRecord.Export";
    }

    public static class Prescription
    {
        public const string Read = "Prescription.Read";
        public const string Create = "Prescription.Create";
        public const string Update = "Prescription.Update";
        public const string Approve = "Prescription.Approve";
        public const string Cancel = "Prescription.Cancel";
    }

    public static class LabResult
    {
        public const string Read = "LabResult.Read";
        public const string Create = "LabResult.Create";
        public const string Validate = "LabResult.Validate";
        public const string Release = "LabResult.Release";
    }

    // ── Dược ──
    public static class Pharmacy
    {
        public const string Read = "Pharmacy.Read";
        public const string Dispense = "Pharmacy.Dispense";
        public const string Approve = "Pharmacy.Approve";
        public const string StockIn = "Pharmacy.StockIn";
        public const string StockOut = "Pharmacy.StockOut";
    }

    // ── Tài chính ──
    public static class Billing
    {
        public const string Read = "Billing.Read";
        public const string Collect = "Billing.Collect";
        public const string Approve = "Billing.Approve";
        public const string Refund = "Billing.Refund";
        public const string Void = "Billing.Void";
    }

    public static class Report
    {
        public const string Read = "Report.Read";
        public const string Export = "Report.Export";
    }

    // AUTHZ #432: resource bổ sung để cô lập route theo actor (Reception/Surgery/Radiology/Insurance).
    public static class Reception
    {
        public const string Read = "Reception.Read";
        public const string Update = "Reception.Update";
    }

    public static class Surgery
    {
        public const string Read = "Surgery.Read";
        public const string Create = "Surgery.Create";
        public const string Update = "Surgery.Update";
    }

    public static class Radiology
    {
        public const string Read = "Radiology.Read";
        public const string Create = "Radiology.Create";
        public const string Report = "Radiology.Report";
        public const string Approve = "Radiology.Approve";
    }

    public static class Insurance
    {
        public const string Read = "Insurance.Read";
        public const string Submit = "Insurance.Submit";
        public const string Approve = "Insurance.Approve";
    }

    /// <summary>Định nghĩa 1 permission cho seeder (mã · tên VN · module · nhạy cảm — audit đậm hơn ở AUTHZ-5).</summary>
    public sealed record PermissionDef(string Code, string Name, string Module, bool IsSensitive = false);

    /// <summary>
    /// Danh sách khai báo TƯỜNG MINH cho seeder upsert (không reflection — thứ tự ổn định, review bằng diff PR).
    /// Thêm permission mới = thêm const + thêm dòng ở đây.
    /// </summary>
    public static readonly IReadOnlyList<PermissionDef> All = new List<PermissionDef>
    {
        new(System.Configure,      "Cấu hình hệ thống",          "System",        IsSensitive: true),
        new(System.ManageUsers,    "Quản lý người dùng",         "System",        IsSensitive: true),
        new(System.ManageRoles,    "Quản lý vai trò & quyền",    "System",        IsSensitive: true),
        new(Session.Read,          "Xem phiên đăng nhập",        "System",        IsSensitive: true),
        new(Session.Terminate,     "Chấm dứt phiên đăng nhập",   "System",        IsSensitive: true),
        new(AuditLog.Read,         "Xem nhật ký audit",          "System",        IsSensitive: true),
        new(AuditLog.Export,       "Xuất nhật ký audit",         "System",        IsSensitive: true),

        new(Patient.Read,          "Xem bệnh nhân",              "Patient"),
        new(Patient.Create,        "Tạo bệnh nhân",              "Patient"),
        new(Patient.Update,        "Sửa bệnh nhân",              "Patient"),
        new(Patient.Merge,         "Gộp hồ sơ bệnh nhân",        "Patient",       IsSensitive: true),

        new(MedicalRecord.Read,    "Xem bệnh án",                "MedicalRecord"),
        new(MedicalRecord.Create,  "Tạo bệnh án",                "MedicalRecord"),
        new(MedicalRecord.Update,  "Sửa bệnh án",                "MedicalRecord"),
        new(MedicalRecord.Lock,    "Khóa bệnh án",               "MedicalRecord", IsSensitive: true),
        new(MedicalRecord.Unlock,  "Mở khóa bệnh án",            "MedicalRecord", IsSensitive: true),
        new(MedicalRecord.Export,  "Xuất/trích lục bệnh án",     "MedicalRecord", IsSensitive: true),

        new(Prescription.Read,     "Xem đơn thuốc",              "Prescription"),
        new(Prescription.Create,   "Kê đơn thuốc",               "Prescription"),
        new(Prescription.Update,   "Sửa đơn thuốc",              "Prescription"),
        new(Prescription.Approve,  "Duyệt đơn thuốc",            "Prescription",  IsSensitive: true),
        new(Prescription.Cancel,   "Hủy đơn thuốc",              "Prescription"),

        new(LabResult.Read,        "Xem kết quả xét nghiệm",     "Laboratory"),
        new(LabResult.Create,      "Nhập kết quả xét nghiệm",    "Laboratory"),
        new(LabResult.Validate,    "Duyệt kết quả xét nghiệm",   "Laboratory",    IsSensitive: true),
        new(LabResult.Release,     "Phát hành kết quả XN",       "Laboratory",    IsSensitive: true),

        new(Pharmacy.Read,         "Xem kho dược",               "Pharmacy"),
        new(Pharmacy.Dispense,     "Cấp phát thuốc",             "Pharmacy"),
        new(Pharmacy.Approve,      "Duyệt phiếu dược",           "Pharmacy",      IsSensitive: true),
        new(Pharmacy.StockIn,      "Nhập kho dược",              "Pharmacy"),
        new(Pharmacy.StockOut,     "Xuất kho dược",              "Pharmacy"),

        new(Billing.Read,          "Xem viện phí",               "Billing"),
        new(Billing.Collect,       "Thu phí",                    "Billing"),
        new(Billing.Approve,       "Duyệt miễn giảm/phê duyệt viện phí", "Billing", IsSensitive: true),
        new(Billing.Refund,        "Hoàn tiền",                  "Billing",       IsSensitive: true),
        new(Billing.Void,          "Hủy phiếu thu",              "Billing",       IsSensitive: true),

        new(Report.Read,           "Xem báo cáo",                "Report"),
        new(Report.Export,         "Xuất báo cáo",               "Report"),

        // AUTHZ #432
        new(Reception.Read,        "Xem tiếp đón",               "Reception"),
        new(Reception.Update,      "Cập nhật tiếp đón",          "Reception"),
        new(Surgery.Read,          "Xem phẫu thuật",             "Surgery"),
        new(Surgery.Create,        "Lên lịch phẫu thuật",        "Surgery"),
        new(Surgery.Update,        "Cập nhật phẫu thuật",        "Surgery"),
        new(Radiology.Read,        "Xem CĐHA",                   "Radiology"),
        new(Radiology.Create,      "Chụp/tạo ca CĐHA",           "Radiology"),
        new(Radiology.Report,      "Đọc kết quả CĐHA",           "Radiology"),
        new(Radiology.Approve,     "Duyệt kết quả CĐHA",         "Radiology",     IsSensitive: true),
        new(Insurance.Read,        "Xem BHYT/BHXH",              "Insurance"),
        new(Insurance.Submit,      "Gửi hồ sơ BHYT",             "Insurance"),
        new(Insurance.Approve,     "Duyệt giám định BHYT",       "Insurance",     IsSensitive: true),
    };
}
