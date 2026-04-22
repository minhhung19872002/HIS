namespace HIS.Core.Entities;

/// <summary>
/// Mẫu nội dung lâm sàng chung — Sprint 3 Item 2.1.
/// Dùng cho HSBA ngoại trú mẫu, tường trình PTTT mẫu, các mẫu văn bản y khoa khác.
/// Phân biệt bằng TemplateType + filter theo IcdCode / DepartmentId / Scope.
/// </summary>
public class ClinicalTemplate : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;

    /// <summary>
    /// 1 = HSBA ngoại trú mẫu
    /// 2 = Tường trình PTTT mẫu
    /// 3 = Kết luận khám mẫu
    /// 4 = Diễn biến bệnh mẫu (dùng trong tờ điều trị nội trú)
    /// 5 = Hội chẩn mẫu
    /// 6 = Cam kết mẫu
    /// 7 = Giấy chứng nhận mẫu
    /// </summary>
    public int TemplateType { get; set; }

    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    /// <summary>0=Tất cả, 1=Nam, 2=Nữ</summary>
    public int Gender { get; set; }

    /// <summary>Tuổi tối thiểu (áp dụng cho mẫu nhi khoa / người lớn)</summary>
    public int? MinAgeYears { get; set; }
    public int? MaxAgeYears { get; set; }

    /// <summary>Nội dung template — HTML hoặc plain text với placeholder {{field}}</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>Danh sách thành viên mặc định — JSON array [{roleId, name, role}] dùng cho PTTT</summary>
    public string? DefaultMembersJson { get; set; }

    public bool IsPublic { get; set; }
    public Guid? OwnerUserId { get; set; }
    public virtual User? OwnerUser { get; set; }

    public bool IsActive { get; set; } = true;
    public int UsageCount { get; set; }
    public int SortOrder { get; set; }
}
