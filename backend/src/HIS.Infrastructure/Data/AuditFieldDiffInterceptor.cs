using System.Runtime.CompilerServices;
using System.Text.Json;
using HIS.Application.Common;
using HIS.Application.Services;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Data;

/// <summary>
/// EF Core SaveChanges interceptor that captures field-level before/after diffs for
/// mutations on a whitelisted set of sensitive entities (patient/EMR/billing/prescription),
/// and writes them as <see cref="AuditLog"/> rows with <c>Module = "FieldDiff"</c>.
/// Issue #198 (a): the existing <c>AuditLogMiddleware</c> only recorded method/path/status —
/// not WHAT changed, so who-changed-what could not be reconstructed for a patient/billing edit.
///
/// Design notes:
/// - Only <see cref="EntityState.Modified"/> entries are diffed (Added/Deleted already have an
///   implicit before/after via existence; keeping scope minimal per Issue #198).
/// - Diff capture happens in <see cref="SavingChangesAsync"/> (before the real save, PK already
///   known so no need to wait for SavedChanges); the actual audit write happens in a
///   fire-and-forget background task AFTER <see cref="SavedChangesAsync"/> succeeds, using a
///   FRESH scope/DbContext — never the same context that is mid-SaveChanges (would recurse /
///   ObjectDisposedException once the request scope tears down, same hazard documented in
///   AuditLogMiddleware).
/// - Registered as Scoped in DI (see DependencyInjection.cs) so it can resolve
///   <see cref="ICurrentUserAccessor"/> (who made the change) from the same request scope as the
///   DbContext it is attached to.
/// - Toggle: config key <c>Audit:FieldDiff:Enabled</c> (env var <c>Audit__FieldDiff__Enabled</c>),
///   default true.
/// </summary>
public class AuditFieldDiffInterceptor : SaveChangesInterceptor
{
    // Entity CLR type names considered sensitive enough to diff (Issue #198 acceptance scope:
    // patient/EMR/billing/prescription). Matched by name (not Type) so the whitelist can be
    // extended/overridden via config without a code change.
    private static readonly string[] DefaultSensitiveEntityNames =
    {
        nameof(Patient),
        nameof(MedicalRecord),
        nameof(Examination),
        nameof(Prescription),
        nameof(PrescriptionDetail),
        nameof(Receipt),
        nameof(ReceiptDetail),
        nameof(InvoiceSummary),
        nameof(ElectronicInvoice),
    };

    // Field names whose value must never be written to the audit trail as plaintext.
    private static readonly string[] MaskedFieldNameFragments =
    {
        "password", "token", "secret", "apikey", "pin", "otp"
    };

    private const int MaxFieldValueLength = 500;
    private const string MaskedValue = "***";

    // Diffs captured in SavingChangesAsync, consumed in SavedChangesAsync once the save has
    // actually committed. Keyed by DbContext instance so concurrent contexts don't cross-talk;
    // ConditionalWeakTable avoids leaking entries if SavedChangesAsync is ever skipped (e.g. save failed).
    private static readonly ConditionalWeakTable<DbContext, List<FieldChangeCapture>> PendingDiffs = new();

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ICurrentUserAccessor _currentUser;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuditFieldDiffInterceptor> _logger;
    private readonly HashSet<string> _sensitiveEntityNames;

    public AuditFieldDiffInterceptor(
        IServiceScopeFactory scopeFactory,
        ICurrentUserAccessor currentUser,
        IConfiguration configuration,
        ILogger<AuditFieldDiffInterceptor> logger)
    {
        _scopeFactory = scopeFactory;
        _currentUser = currentUser;
        _configuration = configuration;
        _logger = logger;

        var configured = configuration.GetSection("Audit:FieldDiff:SensitiveEntities").Get<string[]>();
        _sensitiveEntityNames = new HashSet<string>(
            configured is { Length: > 0 } ? configured : DefaultSensitiveEntityNames,
            StringComparer.OrdinalIgnoreCase);
    }

    private bool IsEnabled() => _configuration.GetValue("Audit:FieldDiff:Enabled", true);

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (IsEnabled() && eventData.Context is DbContext context)
            {
                var captured = CaptureFieldDiffs(context);
                if (captured.Count > 0)
                    PendingDiffs.AddOrUpdate(context, captured);
            }
        }
        catch (Exception ex)
        {
            // Capturing the diff must never break the actual save.
            AuditWriteMetrics.RecordFailure(ex);
            _logger.LogWarning(ex, "Audit field-diff capture failed (SavingChangesAsync)");
        }

        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is DbContext context && PendingDiffs.TryGetValue(context, out var captured))
        {
            PendingDiffs.Remove(context);
            if (captured.Count > 0)
                FlushDiffsFireAndForget(captured);
        }

        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    private List<FieldChangeCapture> CaptureFieldDiffs(DbContext context)
    {
        var changes = new List<FieldChangeCapture>();

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Modified) continue;
            if (!_sensitiveEntityNames.Contains(entry.Entity.GetType().Name)) continue;

            var oldValues = new Dictionary<string, object?>();
            var newValues = new Dictionary<string, object?>();

            foreach (var property in entry.Properties)
            {
                if (!property.IsModified) continue;
                if (property.Metadata.IsPrimaryKey()) continue;

                var name = property.Metadata.Name;
                var oldValue = property.OriginalValue;
                var newValue = property.CurrentValue;
                if (Equals(oldValue, newValue)) continue; // IsModified can be a superset (bulk attach)

                if (IsMaskedField(name))
                {
                    oldValues[name] = MaskedValue;
                    newValues[name] = MaskedValue;
                }
                else
                {
                    oldValues[name] = Truncate(oldValue);
                    newValues[name] = Truncate(newValue);
                }
            }

            if (oldValues.Count == 0) continue;

            var entityId = entry.Property(nameof(BaseEntity.Id)).CurrentValue is Guid id ? id : Guid.Empty;
            changes.Add(new FieldChangeCapture(
                entry.Entity.GetType().Name,
                entityId,
                JsonSerializer.Serialize(oldValues),
                JsonSerializer.Serialize(newValues)));
        }

        return changes;
    }

    private static bool IsMaskedField(string propertyName)
    {
        foreach (var fragment in MaskedFieldNameFragments)
        {
            if (propertyName.Contains(fragment, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    private static object? Truncate(object? value)
    {
        if (value is string s && s.Length > MaxFieldValueLength)
            return s[..MaxFieldValueLength] + "...";
        return value;
    }

    private void FlushDiffsFireAndForget(List<FieldChangeCapture> changes)
    {
        // Snapshot the current user BEFORE the background task runs — ICurrentUserAccessor reads
        // HttpContext, which is only valid for the lifetime of the current request scope.
        var userId = _currentUser.UserId ?? string.Empty;
        var userName = _currentUser.UserName ?? "system";

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var auditService = scope.ServiceProvider.GetService<IAuditLogService>();
                if (auditService == null) return;

                var now = DateTime.UtcNow;
                var entries = changes.Select(c => new AuditLog
                {
                    Id = Guid.NewGuid(),
                    UserId = Guid.TryParse(userId, out var uid) ? uid : null,
                    Username = userName,
                    UserFullName = userName,
                    Action = "FieldUpdate",
                    TableName = c.EntityType,
                    EntityType = c.EntityType,
                    RecordId = c.EntityId,
                    EntityId = c.EntityId.ToString(),
                    OldValues = c.OldValuesJson,
                    NewValues = c.NewValuesJson,
                    Timestamp = now,
                    Module = "FieldDiff",
                    CreatedAt = now,
                    CreatedBy = userId,
                    IsDeleted = false
                }).ToList();

                await auditService.WriteManyAsync(entries);
            }
            catch (Exception ex)
            {
                AuditWriteMetrics.RecordFailure(ex);
                _logger.LogWarning(ex, "Audit field-diff background write failed for {Count} entities", changes.Count);
            }
        });
    }

    private sealed record FieldChangeCapture(string EntityType, Guid EntityId, string OldValuesJson, string NewValuesJson);
}
