using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.Mvc.Routing;
using HIS.Core.Constants;

namespace HIS.API.Authorization;

/// <summary>
/// AUTHZ #216/F2: gắn policy <c>perm:{code}</c> cho MỌI action ghi (POST/PUT/PATCH/DELETE) đang chỉ
/// có <c>[Authorize]</c> trần, theo bảng khai báo <see cref="WritePermissionMap"/>.
///
/// Chỉ chạm vào action THỰC SỰ chưa được gate — bỏ qua nguyên vẹn action đã có
/// <c>[AllowAnonymous]</c>, <c>[Authorize(Roles=…)]</c> hay <c>[RequirePermission]</c> (dù ở cấp
/// class hay method), nên không endpoint nào đang chạy bị đổi luật. Việc kiểm tra quyền vẫn do
/// <see cref="PermissionAuthorizationHandler"/> làm, y hệt đường <see cref="RequirePermissionAttribute"/>.
///
/// Những gì convention BỎ QUA vì không có trong bảng được ghi lại ở <see cref="Ungated"/> để
/// <see cref="Audit"/> in ra lúc khởi động — endpoint ghi mới thêm sau này sẽ lộ ra ngay trong log
/// thay vì âm thầm ở mức "đăng nhập là gọi được".
/// </summary>
public sealed class WritePermissionConvention : IControllerModelConvention
{
    private static readonly ConcurrentBag<string> _ungated = new();
    private static int _applied;

    /// <summary>Action ghi không tra được quyền trong bảng (định dạng "Controller.Action [VERB]").</summary>
    public static IReadOnlyCollection<string> Ungated => _ungated;

    /// <summary>Số action ghi đã được convention gắn policy.</summary>
    public static int Applied => _applied;

    public void Apply(ControllerModel controller)
    {
        if (HasAnonymous(controller.Attributes)) return;
        var controllerGated = HasExplicitGate(controller.Attributes);

        foreach (var action in controller.Actions)
        {
            var verbs = HttpMethodsOf(action);
            if (verbs.Count == 0 || verbs.All(v => v is "GET" or "HEAD" or "OPTIONS")) continue;
            if (HasAnonymous(action.Attributes)) continue;
            if (controllerGated || HasExplicitGate(action.Attributes)) continue;

            var code = WritePermissionMap.Resolve(controller.ControllerName, action.ActionName);
            if (code is null)
            {
                if (!WritePermissionMap.ExemptControllers.Contains(controller.ControllerName) &&
                    !WritePermissionMap.ExemptActions.Contains($"{controller.ControllerName}.{action.ActionName}"))
                    _ungated.Add($"{controller.ControllerName}.{action.ActionName} [{string.Join('/', verbs)}]");
                continue;
            }

            action.Filters.Add(new AuthorizeFilter(RequirePermissionAttribute.PolicyPrefix + code));
            Interlocked.Increment(ref _applied);
        }
    }

    private static bool HasAnonymous(IReadOnlyList<object> attributes)
        => attributes.OfType<IAllowAnonymous>().Any();

    /// <summary>Đã được gate tường minh = có Roles hoặc Policy (bao gồm <c>[RequirePermission]</c>,
    /// vốn là AuthorizeAttribute đặt Policy). <c>[Authorize]</c> trần KHÔNG tính.</summary>
    private static bool HasExplicitGate(IReadOnlyList<object> attributes)
        => attributes.OfType<AuthorizeAttribute>()
            .Any(a => !string.IsNullOrWhiteSpace(a.Roles) || !string.IsNullOrWhiteSpace(a.Policy));

    private static IReadOnlyList<string> HttpMethodsOf(ActionModel action)
        => action.Attributes.OfType<IActionHttpMethodProvider>()
            .SelectMany(p => p.HttpMethods)
            .Select(m => m.ToUpperInvariant())
            .Distinct()
            .ToList();

    /// <summary>
    /// Kiểm tra tính nhất quán lúc khởi động và trả về dòng tóm tắt để log:
    /// (a) mọi mã quyền dùng trong bảng phải nằm trong <see cref="PermissionCatalog.All"/> — thiếu thì
    /// seeder không tạo bản ghi Permissions và MỌI vai trò sẽ 403 ở endpoint đó;
    /// (b) liệt kê action ghi còn chưa có quyền.
    /// Ném <see cref="InvalidOperationException"/> ở (a) vì đó là lỗi cấu hình gây khóa toàn hệ thống.
    /// </summary>
    public static string Audit()
    {
        var known = PermissionCatalog.All.Select(d => d.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var used = WritePermissionMap.Rules.Values
            .SelectMany(r => new[] { r.Write, r.Read }
                .Concat(r.Overrides?.Values ?? Enumerable.Empty<string>()))
            .Where(c => c is not null)
            .Select(c => c!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var missing = used.Where(c => !known.Contains(c)).ToList();
        if (missing.Count > 0)
            throw new InvalidOperationException(
                "WritePermissionMap dùng mã quyền không có trong PermissionCatalog.All (seeder sẽ không tạo, " +
                "mọi vai trò sẽ 403): " + string.Join(", ", missing));

        return $"WritePermissionConvention: gate {_applied} action ghi theo {WritePermissionMap.Rules.Count} controller; " +
               $"{_ungated.Count} action ghi CHƯA có quyền" +
               (_ungated.IsEmpty ? "." : ": " + string.Join(", ", _ungated.OrderBy(x => x)));
    }
}
