using System.Reflection;
using HIS.API.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Xunit;

namespace HIS.Tests.Security;

/// <summary>
/// <see cref="WritePermissionMap"/> resolves permissions by controller/action NAME. A typo in a key does not
/// fail anything — the action silently keeps the controller default (QA-R6/R7 added overrides that tighten
/// lab approval, prescribing and quality management; a misspelt one would leave the hole open).
/// </summary>
public sealed class WritePermissionMapTests
{
    private static readonly Dictionary<string, Type> Controllers = typeof(WritePermissionMap).Assembly
        .GetTypes()
        .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(ControllerBase).IsAssignableFrom(t)
                    && t.Name.EndsWith("Controller", StringComparison.Ordinal))
        .GroupBy(t => t.Name[..^"Controller".Length], StringComparer.OrdinalIgnoreCase)
        .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

    private static IEnumerable<MethodInfo> WriteActions(Type controller) => controller
        .GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
        .Where(m => m.GetCustomAttributes<HttpMethodAttribute>()
            .SelectMany(a => a.HttpMethods)
            .Any(v => v is not ("GET" or "HEAD" or "OPTIONS")));

    [Fact]
    public void Every_rule_names_an_existing_controller()
    {
        var unknown = WritePermissionMap.Rules.Keys.Where(k => !Controllers.ContainsKey(k)).ToList();
        Assert.Empty(unknown);
    }

    [Fact]
    public void Every_override_names_an_existing_write_action()
    {
        var missing = new List<string>();
        foreach (var (controllerName, rule) in WritePermissionMap.Rules)
        {
            if (rule.Overrides is null || !Controllers.TryGetValue(controllerName, out var type)) continue;
            var actions = WriteActions(type).Select(m => m.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            missing.AddRange(rule.Overrides.Keys.Where(a => !actions.Contains(a)).Select(a => $"{controllerName}.{a}"));
        }
        Assert.Empty(missing);
    }

    [Theory]
    [InlineData("LISComplete", "FinalApproveLabResult", PermissionCatalog.LabResult.Validate)]
    [InlineData("ExaminationComplete", "CreatePrescription", PermissionCatalog.Prescription.Create)]
    [InlineData("InpatientComplete", "PrescribeByTemplate", PermissionCatalog.Prescription.Create)]
    [InlineData("InpatientComplete", "CreateEmergencyCabinetPrescription", PermissionCatalog.Inpatient.Update)]
    [InlineData("BusinessAlert", "SaveSpecialTestRule", PermissionCatalog.System.Configure)]
    [InlineData("InfectionControl", "ConfirmHAICase", PermissionCatalog.System.Configure)]
    [InlineData("InfectionControl", "ReportHAI", PermissionCatalog.Quality.Update)]
    [InlineData("Quality", "CreateIncident", PermissionCatalog.Quality.Update)]
    public void Sensitive_actions_resolve_to_the_intended_permission(string controller, string action, string expected)
        => Assert.Equal(expected, WritePermissionMap.Resolve(controller, action));
}
