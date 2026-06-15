namespace HIS.Application.DTOs.AdministrativeUnit;

public class ProvinceDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class DistrictDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid ProvinceId { get; set; }
    public string? ProvinceName { get; set; }
    public bool IsActive { get; set; } = true;
}

public class WardDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid DistrictId { get; set; }
    public string? DistrictName { get; set; }
    public bool IsActive { get; set; } = true;
}
