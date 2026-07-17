using System;
using System.Collections.Generic;

namespace HIS.Application.Common;

/// <summary>
/// Truy cập thông tin người dùng hiện tại từ HTTP context theo claim CANONICAL,
/// gom về một nơi thay cho các <c>GetCurrentUserId/Name</c> tự cài rải rác (mỗi service
/// đọc claim khác nhau — NameIdentifier vs "sub" — gây audit/CreatedBy sai). Xem #200 (REFAC-1).
/// Canonical = <see cref="System.Security.Claims.ClaimTypes.NameIdentifier"/> (do AuthService phát khi login).
/// </summary>
public interface ICurrentUserAccessor
{
    /// <summary>Giá trị claim NameIdentifier (user id dạng chuỗi); <c>null</c> nếu chưa đăng nhập.</summary>
    string? UserId { get; }

    /// <summary><see cref="UserId"/> parse sang <see cref="Guid"/>; <c>null</c> nếu thiếu/không hợp lệ.</summary>
    Guid? UserGuid { get; }

    /// <summary>Tên hiển thị: <c>ClaimTypes.Name</c>, fallback <c>JwtClaims.FullName</c>.</summary>
    string? UserName { get; }

    /// <summary>Đã xác thực hay chưa.</summary>
    bool IsAuthenticated { get; }

    /// <summary>Danh sách role (<c>ClaimTypes.Role</c>); rỗng nếu không có.</summary>
    IReadOnlyList<string> Roles { get; }

    /// <summary>AUTHZ-3 (#369): chi nhánh của user (claim <c>branchId</c>); <c>null</c> = không giới hạn (toàn viện / user không gắn branch / background job).</summary>
    Guid? BranchId { get; }
}
