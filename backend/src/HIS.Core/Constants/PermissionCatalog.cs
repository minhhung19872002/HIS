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

    // AUTHZ #216/F2: resource cho các miền còn để [Authorize] trần ở đường ghi.
    public static class Inpatient
    {
        public const string Read = "Inpatient.Read";
        public const string Admit = "Inpatient.Admit";
        public const string Update = "Inpatient.Update";
        public const string Discharge = "Inpatient.Discharge";
        public const string Approve = "Inpatient.Approve";
    }

    public static class Catalog
    {
        public const string Read = "Catalog.Read";
        public const string Manage = "Catalog.Manage";
    }

    public static class PublicHealth
    {
        public const string Read = "PublicHealth.Read";
        public const string Update = "PublicHealth.Update";
        public const string Submit = "PublicHealth.Submit";
    }

    public static class Asset
    {
        public const string Read = "Asset.Read";
        public const string Manage = "Asset.Manage";
        public const string Approve = "Asset.Approve";
        /// <summary>Đề nghị sửa chữa/bảo trì — mọi nhân viên phải báo hỏng được, không cần quyền quản lý tài sản.</summary>
        public const string Request = "Asset.Request";
    }

    public static class Hr
    {
        public const string Read = "Hr.Read";
        public const string Manage = "Hr.Manage";
        public const string Approve = "Hr.Approve";
        /// <summary>Tự nộp đơn nghỉ phép/tăng ca của CHÍNH mình — khác hẳn quyền quản lý nhân sự.</summary>
        public const string SelfService = "Hr.SelfService";
    }

    public static class Laboratory
    {
        public const string Configure = "Laboratory.Configure";
    }

    public static class Telehealth
    {
        public const string Read = "Telehealth.Read";
        public const string Update = "Telehealth.Update";
    }

    public static class Quality
    {
        public const string Read = "Quality.Read";
        public const string Update = "Quality.Update";
    }

    public static class Nutrition
    {
        public const string Read = "Nutrition.Read";
        public const string Update = "Nutrition.Update";
        public const string Approve = "Nutrition.Approve";
    }

    public static class Rehab
    {
        public const string Read = "Rehab.Read";
        public const string Update = "Rehab.Update";
    }

    public static class Checkup
    {
        public const string Read = "Checkup.Read";
        public const string Update = "Checkup.Update";
    }

    public static class Integration
    {
        public const string Read = "Integration.Read";
        public const string Submit = "Integration.Submit";
        public const string Configure = "Integration.Configure";
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

        // AUTHZ #216/F2
        new(Inpatient.Read,        "Xem nội trú",                "Inpatient"),
        new(Inpatient.Admit,       "Nhập viện",                  "Inpatient"),
        new(Inpatient.Update,      "Cập nhật nội trú",           "Inpatient"),
        new(Inpatient.Discharge,   "Xuất viện",                  "Inpatient",     IsSensitive: true),
        new(Inpatient.Approve,     "Duyệt hội chẩn/nội trú",     "Inpatient",     IsSensitive: true),
        new(Catalog.Read,          "Xem danh mục",               "Catalog"),
        new(Catalog.Manage,        "Quản lý danh mục dùng chung","Catalog",       IsSensitive: true),
        new(PublicHealth.Read,     "Xem y tế công cộng",         "PublicHealth"),
        new(PublicHealth.Update,   "Cập nhật y tế công cộng",    "PublicHealth"),
        new(PublicHealth.Submit,   "Gửi báo cáo y tế công cộng", "PublicHealth"),
        new(Asset.Read,            "Xem tài sản/thiết bị",       "Asset"),
        new(Asset.Manage,          "Quản lý tài sản/thiết bị",   "Asset"),
        new(Asset.Approve,         "Duyệt tài sản/thanh lý",     "Asset",         IsSensitive: true),
        new(Asset.Request,         "Đề nghị sửa chữa/bảo trì",   "Asset"),
        new(Hr.Read,               "Xem nhân sự",                "HR"),
        new(Hr.Manage,             "Quản lý nhân sự",            "HR",            IsSensitive: true),
        new(Hr.Approve,            "Duyệt nghỉ phép/tăng ca",    "HR",            IsSensitive: true),
        new(Hr.SelfService,        "Tự nộp đơn nghỉ phép/tăng ca","HR"),
        new(Laboratory.Configure,  "Cấu hình LIS/máy xét nghiệm","Laboratory",    IsSensitive: true),
        new(Telehealth.Read,       "Xem khám từ xa",             "Telehealth"),
        new(Telehealth.Update,     "Thực hiện khám từ xa",       "Telehealth"),
        new(Quality.Read,          "Xem chất lượng/sự cố",       "Quality"),
        new(Quality.Update,        "Cập nhật chất lượng/sự cố",  "Quality"),
        new(Nutrition.Read,        "Xem dinh dưỡng",             "Nutrition"),
        new(Nutrition.Update,      "Cập nhật dinh dưỡng",        "Nutrition"),
        new(Nutrition.Approve,     "Duyệt suất ăn",              "Nutrition"),
        new(Rehab.Read,            "Xem phục hồi chức năng",     "Rehabilitation"),
        new(Rehab.Update,          "Cập nhật phục hồi chức năng","Rehabilitation"),
        new(Checkup.Read,          "Xem khám sức khỏe",          "Checkup"),
        new(Checkup.Update,        "Cập nhật khám sức khỏe",     "Checkup"),
        new(Integration.Read,      "Xem tích hợp/liên thông",    "Integration"),
        new(Integration.Submit,    "Gửi dữ liệu liên thông",     "Integration"),
        new(Integration.Configure, "Cấu hình kết nối liên thông","Integration",   IsSensitive: true),
    };
}
