namespace HIS.Application.DTOs;

/// <summary>
/// DTO đọc cài đặt per-user
/// </summary>
public class UserSettingDto
{
    public string SettingKey { get; set; } = string.Empty;
    public string? SettingValue { get; set; }
}

/// <summary>
/// DTO cập nhật 1 setting per-user
/// </summary>
public class UpdateUserSettingDto
{
    public string SettingKey { get; set; } = string.Empty;
    public string? SettingValue { get; set; }
}

/// <summary>
/// DTO cho lab default roles (convenience wrapper, đọc từ UserSettings)
/// Keys: lab.default_ktv_name, lab.default_ktv_id, lab.default_approver_name, lab.default_approver_id
/// </summary>
public class LabDefaultRoleDto
{
    public string? DefaultKtvName { get; set; }
    public string? DefaultKtvId { get; set; }
    public string? DefaultApproverName { get; set; }
    public string? DefaultApproverId { get; set; }
}
