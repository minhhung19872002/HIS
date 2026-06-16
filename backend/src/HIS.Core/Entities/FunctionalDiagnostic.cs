using HIS.Core.Entities;

namespace HIS.Core.Entities;

/// <summary>
/// Loại thăm dò chức năng (VD: Điện tim, Điện não, Siêu âm, Nội soi...).
/// Catalog DB-driven thay thế hardcode GetTestTypes() cũ.
/// </summary>
public class FunctionalDiagnosticTestType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Mẫu kết quả thăm dò chức năng — liên kết với 1 loại TDCN.
/// </summary>
public class FunctionalDiagnosticTemplate : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid TestTypeId { get; set; }
    /// <summary>Nội dung mẫu kết quả (text/HTML).</summary>
    public string? Content { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation (optional — không load mặc định)
    public FunctionalDiagnosticTestType? TestType { get; set; }
}
