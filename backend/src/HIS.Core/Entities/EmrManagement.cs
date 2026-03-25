namespace HIS.Core.Entities;

/// <summary>
/// Chia se benh an noi vien - B.1.2 EmrShare
/// ShareType: 1=WholeRecord, 2=IndividualForm
/// </summary>
public class EmrShare : BaseEntity
{
    public Guid ExaminationId { get; set; } // Ma kham benh
    public string SharedByUserId { get; set; } = string.Empty; // Nguoi chia se
    public string? SharedToUserId { get; set; } // Chia se cho user cu the
    public Guid? SharedToDepartmentId { get; set; } // Chia se cho khoa
    public int ShareType { get; set; } // 1=WholeRecord, 2=IndividualForm
    public string? FormType { get; set; } // Loai to phieu (khi ShareType=2)
    public DateTime? ExpiresAt { get; set; } // Het han chia se
    public int AccessCount { get; set; } // So lan truy cap
    public bool IsRevoked { get; set; } // Da thu hoi
    public string? Note { get; set; } // Ghi chu
}

/// <summary>
/// Nhat ky truy cap chia se BA - EmrShareAccessLog
/// </summary>
public class EmrShareAccessLog : BaseEntity
{
    public Guid EmrShareId { get; set; } // FK den EmrShare
    public virtual EmrShare EmrShare { get; set; } = null!;

    public string AccessedByUserId { get; set; } = string.Empty; // Nguoi truy cap
    public DateTime AccessedAt { get; set; } // Thoi gian truy cap
    public string Action { get; set; } = string.Empty; // View/Edit/Print
}

/// <summary>
/// Trich luc benh an chong sao chep - B.1.3 EmrExtract
/// ExtractType: 1=Full, 2=Partial
/// </summary>
public class EmrExtract : BaseEntity
{
    public Guid ExaminationId { get; set; } // Ma kham benh
    public string ExtractedByUserId { get; set; } = string.Empty; // Nguoi trich luc
    public int ExtractType { get; set; } // 1=Full, 2=Partial
    public string? FormTypes { get; set; } // Cac loai to phieu (comma separated)
    public string WatermarkText { get; set; } = string.Empty; // Watermark chong sao chep
    public string AccessCode { get; set; } = string.Empty; // Ma truy cap
    public DateTime? ExpiresAt { get; set; } // Het han truy cap
    public int AccessCount { get; set; } // So lan truy cap
    public int MaxAccessCount { get; set; } // So lan truy cap toi da
    public bool IsRevoked { get; set; } // Da thu hoi
    public string? Note { get; set; } // Ghi chu
}

/// <summary>
/// Gay benh an (Spine) - B.1.5 EmrSpine
/// Cau truc gay BA tuy chinh
/// </summary>
public class EmrSpine : BaseEntity
{
    public string Name { get; set; } = string.Empty; // Ten gay BA
    public string Code { get; set; } = string.Empty; // Ma gay BA
    public int SortOrder { get; set; } // Thu tu sap xep
    public string? Description { get; set; } // Mo ta
    public bool IsDefault { get; set; } // Gay mac dinh
    public bool IsActive { get; set; } = true;

    public virtual ICollection<EmrSpineSection> Sections { get; set; } = new List<EmrSpineSection>();
}

/// <summary>
/// Muc trong gay benh an - EmrSpineSection
/// </summary>
public class EmrSpineSection : BaseEntity
{
    public Guid EmrSpineId { get; set; } // FK den EmrSpine
    public virtual EmrSpine EmrSpine { get; set; } = null!;

    public string FormType { get; set; } = string.Empty; // Loai to phieu
    public string FormName { get; set; } = string.Empty; // Ten to phieu
    public int SortOrder { get; set; } // Thu tu sap xep
    public bool IsRequired { get; set; } // Bat buoc
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Chu ky dien tu benh nhan - B.1.7 PatientSignature
/// </summary>
public class PatientSignature : BaseEntity
{
    public Guid PatientId { get; set; } // FK den Patient
    public Guid? ExaminationId { get; set; } // FK den Examination (optional)
    public string DocumentType { get; set; } = string.Empty; // Loai tai lieu
    public string SignatureData { get; set; } = string.Empty; // Du lieu chu ky (base64 image)
    public DateTime SignedAt { get; set; } // Thoi gian ky
    public string? DeviceInfo { get; set; } // Thong tin thiet bi
    public string? IpAddress { get; set; } // Dia chi IP
    public string? VerificationCode { get; set; } // Ma xac thuc
    public bool IsVerified { get; set; } // Da xac thuc
}

/// <summary>
/// Khoa to phieu - B.1.11 DocumentLock
/// </summary>
public class DocumentLock : BaseEntity
{
    public string DocumentType { get; set; } = string.Empty; // Loai tai lieu
    public Guid DocumentId { get; set; } // ID tai lieu
    public string LockedByUserId { get; set; } = string.Empty; // Nguoi khoa
    public string? LockedByUserName { get; set; } // Ten nguoi khoa
    public DateTime LockedAt { get; set; } // Thoi gian khoa
    public DateTime ExpiresAt { get; set; } // Het han khoa
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// The du lieu - B.1.13 EmrDataTag
/// DataType: Text/Number/Date/Boolean/List
/// </summary>
public class EmrDataTag : BaseEntity
{
    public string Code { get; set; } = string.Empty; // Ma the
    public string Name { get; set; } = string.Empty; // Ten the
    public string? Description { get; set; } // Mo ta
    public string DataType { get; set; } = string.Empty; // Text/Number/Date/Boolean/List
    public string? DefaultValue { get; set; } // Gia tri mac dinh
    public string? Category { get; set; } // Phan loai
    public string? FormType { get; set; } // Loai to phieu ap dung
    public int SortOrder { get; set; } // Thu tu sap xep
    public bool IsSystem { get; set; } // The he thong (khong xoa duoc)
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Thu vien hinh anh - B.1.20 EmrImage
/// </summary>
public class EmrImage : BaseEntity
{
    public string Title { get; set; } = string.Empty; // Tieu de
    public string? Description { get; set; } // Mo ta
    public string ImageData { get; set; } = string.Empty; // Du lieu hinh anh (base64 hoac path)
    public string? Category { get; set; } // Phan loai
    public Guid? DepartmentId { get; set; } // Khoa
    public string UploadedByUserId { get; set; } = string.Empty; // Nguoi upload
    public string? Tags { get; set; } // Tags (comma separated)
    public string? Annotations { get; set; } // Chu thich (JSON)
    public bool IsShared { get; set; } // Chia se cho tat ca
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Ma tat - B.1.22 Shortcode
/// </summary>
public class Shortcode : BaseEntity
{
    public string Code { get; set; } = string.Empty; // Ma tat
    public string FullText { get; set; } = string.Empty; // Noi dung day du
    public string? Category { get; set; } // Phan loai
    public Guid? DepartmentId { get; set; } // Khoa (null = tat ca)
    public string? UserId { get; set; } // User (null = tat ca)
    public bool IsGlobal { get; set; } // Ma tat toan cuc
    public int SortOrder { get; set; } // Thu tu sap xep
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Quy tac kiem tra thieu sot BA - B.1.25 EmrAutoCheckRule
/// RuleType: RequiredForm/RequiredField/RequiredSignature/DataValidation
/// Severity: 1=Warning, 2=Error
/// </summary>
public class EmrAutoCheckRule : BaseEntity
{
    public string RuleName { get; set; } = string.Empty; // Ten quy tac
    public string RuleType { get; set; } = string.Empty; // RequiredForm/RequiredField/RequiredSignature/DataValidation
    public string? FormType { get; set; } // Loai to phieu ap dung
    public string? FieldName { get; set; } // Ten truong (khi RuleType=RequiredField)
    public string ErrorMessage { get; set; } = string.Empty; // Thong bao loi
    public int Severity { get; set; } // 1=Warning, 2=Error
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } // Thu tu kiem tra
}

/// <summary>
/// Nhat ky dong ho so BA - B.2.5 EmrCloseLog
/// Status: 1=Closed, 2=Reopened, 3=Archived
/// </summary>
public class EmrCloseLog : BaseEntity
{
    public Guid ExaminationId { get; set; } // Ma kham benh
    public string ClosedByUserId { get; set; } = string.Empty; // Nguoi dong
    public DateTime ClosedAt { get; set; } // Thoi gian dong
    public int Status { get; set; } // 1=Closed, 2=Reopened, 3=Archived
    public string? ValidationErrors { get; set; } // Loi khi dong (JSON)
    public string? Note { get; set; } // Ghi chu
}
