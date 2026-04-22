namespace HIS.Core.Entities;

/// <summary>
/// Đơn vị đo — N1.10.
/// </summary>
public class LabMeasurementUnit : BaseEntity
{
    public string UnitCode { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public string? UnitSymbol { get; set; } // mmol/L, g/dL, UI/mL...
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Vi khuẩn / tác nhân gây bệnh — N1.10.
/// </summary>
public class LabOrganism : BaseEntity
{
    public string OrganismCode { get; set; } = string.Empty;
    public string OrganismName { get; set; } = string.Empty;
    public string? LatinName { get; set; }
    public string? GramType { get; set; } // "+", "-", "Variable"
    public string? MorphologyType { get; set; } // Cocci, Bacilli, Spirochete...
    public string? Category { get; set; } // Gram+, Gram-, Fungi, Virus, Parasite
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Kháng sinh — N1.10.
/// Dùng cho kháng sinh đồ (AST) và quản lý sử dụng kháng sinh.
/// </summary>
public class LabAntibiotic : BaseEntity
{
    public string AntibioticCode { get; set; } = string.Empty;
    public string AntibioticName { get; set; } = string.Empty;
    public string? GenericName { get; set; }
    public string? AtcCode { get; set; }
    public string? DrugClass { get; set; } // Beta-lactam, Fluoroquinolone, Aminoglycoside...
    public string? Route { get; set; } // PO, IV, IM, Topical
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
    public bool IsRestricted { get; set; } // Cần duyệt (AMS)
    public bool IsActive { get; set; } = true;
}
