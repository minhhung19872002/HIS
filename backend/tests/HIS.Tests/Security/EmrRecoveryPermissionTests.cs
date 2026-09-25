using System.Linq;
using System.Reflection;
using HIS.API.Authorization;
using HIS.API.Controllers;
using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Security;

/// <summary>
/// QA-R12: emr-management/recovery/* lists and restores deleted records hospital-wide. EmrManagementController has a
/// class-level Roles gate, so WritePermissionConvention skips it — the admin permission must sit on the actions.
/// </summary>
public class EmrRecoveryPermissionTests
{
    [Theory]
    [InlineData(nameof(EmrManagementController.GetDeletedRecords))]
    [InlineData(nameof(EmrManagementController.RestoreRecord))]
    public void Recovery_actions_require_system_configure(string action)
    {
        var method = typeof(EmrManagementController).GetMethod(action, BindingFlags.Instance | BindingFlags.Public);
        Assert.NotNull(method);
        var policies = method!.GetCustomAttributes<RequirePermissionAttribute>().Select(a => a.Policy).ToList();
        Assert.Contains(RequirePermissionAttribute.PolicyPrefix + PermissionCatalog.System.Configure, policies);
    }
}
