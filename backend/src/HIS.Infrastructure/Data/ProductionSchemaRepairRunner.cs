using System.Data;
using System.Reflection;
using System.Text;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Data;

/// <summary>
/// Loads idempotent SQL scripts embedded as resources under
/// <c>HIS.Infrastructure.Data.Scripts.*.sql</c> and executes them against the configured
/// database during startup. Each script uses <c>IF NOT EXISTS</c> guards so repeated runs
/// are safe. Execution errors are logged and swallowed per-batch so a single bad script
/// does not block application startup - the legitimate migrations have already run by
/// the time this executes.
/// </summary>
public static class ProductionSchemaRepairRunner
{
    private const string ResourceNamespace = "HIS.Infrastructure.Data.Scripts.";

    public static async Task RunAsync(HISDbContext context, ILogger logger)
    {
        if (!context.Database.IsSqlServer())
            return;

        var assembly = typeof(ProductionSchemaRepairRunner).Assembly;
        var resourceNames = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(ResourceNamespace, StringComparison.Ordinal)
                        && n.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToArray();

        if (resourceNames.Length == 0)
        {
            logger.LogDebug("No schema repair scripts embedded; skipping.");
            return;
        }

        var connectionString = context.Database.GetConnectionString()
            ?? throw new InvalidOperationException("Database connection string is not configured.");

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        foreach (var resourceName in resourceNames)
        {
            var scriptName = resourceName.Substring(ResourceNamespace.Length);
            var sql = await ReadResourceAsync(assembly, resourceName);
            if (string.IsNullOrWhiteSpace(sql))
                continue;

            foreach (var batch in SplitSqlBatches(sql))
            {
                if (string.IsNullOrWhiteSpace(batch))
                    continue;

                try
                {
                    await using var cmd = connection.CreateCommand();
                    cmd.CommandType = CommandType.Text;
                    cmd.CommandText = batch;
                    cmd.CommandTimeout = 120;
                    await cmd.ExecuteNonQueryAsync();
                }
                catch (Exception ex)
                {
                    // Per-batch failure is not fatal: a later script may depend on a
                    // different set of tables and we want prod to still start.
                    logger.LogWarning(ex,
                        "Schema repair batch failed (script: {Script}). First 200 chars: {Preview}",
                        scriptName,
                        batch.Length > 200 ? batch.Substring(0, 200) : batch);
                }
            }

            logger.LogInformation("Schema repair script executed: {Script}", scriptName);
        }
    }

    private static async Task<string> ReadResourceAsync(Assembly assembly, string resourceName)
    {
        await using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null) return string.Empty;

        using var reader = new StreamReader(stream, Encoding.UTF8);
        return await reader.ReadToEndAsync();
    }

    /// <summary>
    /// SQL Server scripts use <c>GO</c> as a batch separator. <c>GO</c> is not a SQL
    /// keyword - it's a sqlcmd directive - so we must split on it manually before
    /// executing with plain ADO.NET.
    /// </summary>
    private static IEnumerable<string> SplitSqlBatches(string sql)
    {
        var lines = sql.Replace("\r\n", "\n").Split('\n');
        var batch = new StringBuilder();

        foreach (var rawLine in lines)
        {
            var line = rawLine;
            var trimmed = line.TrimStart();

            // Skip batch-separator directives and "USE <db>" statements; the target
            // database is already selected by the connection string.
            if (trimmed.StartsWith("USE ", StringComparison.OrdinalIgnoreCase))
                continue;

            if (trimmed.Equals("GO", StringComparison.OrdinalIgnoreCase)
                || trimmed.StartsWith("GO ", StringComparison.OrdinalIgnoreCase)
                || trimmed.StartsWith("GO\t", StringComparison.OrdinalIgnoreCase))
            {
                if (batch.Length > 0)
                {
                    yield return batch.ToString();
                    batch.Clear();
                }
                continue;
            }

            batch.AppendLine(line);
        }

        if (batch.Length > 0)
            yield return batch.ToString();
    }
}
