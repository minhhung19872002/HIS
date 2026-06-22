using System.ComponentModel.DataAnnotations;

namespace HIS.Application.Common;

/// <summary>
/// Validation: bắt buộc <see cref="Guid"/> khác <see cref="Guid.Empty"/>.
/// Bỏ qua <c>null</c> (field optional <c>Guid?</c> không truyền → hợp lệ; cần bắt buộc-có thì thêm <c>[Required]</c>).
/// Dùng cho required-id trong request DTO để chặn id rỗng → auto-400 <c>VALIDATION_FAILED</c>
/// thay vì 500/not-found ngầm. Behavior-preserving: không flow hợp lệ nào gửi <c>Guid.Empty</c> cho required-id.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter, AllowMultiple = false)]
public sealed class NotEmptyGuidAttribute : ValidationAttribute
{
    public NotEmptyGuidAttribute() : base("Trường {0} không được rỗng.") { }

    public override bool IsValid(object? value)
    {
        if (value is null) return true;          // null → để [Required] xử lý (optional Guid? bỏ qua)
        if (value is Guid g) return g != Guid.Empty;
        return true;                              // không phải Guid → không phận sự
    }
}
