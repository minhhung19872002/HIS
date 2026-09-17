using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace HIS.Infrastructure.Data;

/// <summary>
/// QA-R6 (double-submit): SQL Server application lock owned by the current transaction — the same
/// mechanism as the registration-code lock (ReceptionCompleteService) and the per-bed lock
/// (InpatientCompleteService.LockBedAsync), shared so one-time actions can serialize their
/// "check → write" on a business key without a schema change. The lock is released on commit/rollback.
/// </summary>
internal static class SqlAppLock
{
    private const int TimeoutErrorNumber = 50003;

    /// <summary>
    /// Opens a transaction when the context has none (relational providers only). Returns null when the
    /// caller already runs inside a transaction or the provider is not relational (unit tests) — then
    /// <see cref="AcquireAsync"/> is a no-op and the caller's own transaction scope applies.
    /// </summary>
    public static async Task<IDbContextTransaction?> BeginAsync(DbContext db)
    {
        if (!db.Database.IsRelational() || db.Database.CurrentTransaction != null) return null;
        return await db.Database.BeginTransactionAsync();
    }

    /// <summary>
    /// Takes an exclusive application lock on <paramref name="resource"/> for the current transaction.
    /// A second request on the same resource waits until the first commits, then re-reads the state.
    /// </summary>
    public static async Task AcquireAsync(DbContext db, string resource, string busyMessage, int timeoutMs = 10000)
    {
        if (!db.Database.IsRelational() || db.Database.CurrentTransaction == null) return;
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "DECLARE @r int; " +
                "EXEC @r = sp_getapplock @Resource = {0}, @LockMode = N'Exclusive', " +
                "@LockOwner = N'Transaction', @LockTimeout = {1}; " +
                "IF @r < 0 THROW " + TimeoutErrorNumber + ", N'app lock timeout', 1;",
                resource, timeoutMs);
        }
        catch (SqlException ex) when (ex.Number == TimeoutErrorNumber)
        {
            throw new InvalidOperationException(busyMessage);
        }
    }
}
