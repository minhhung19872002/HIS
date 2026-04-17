using System.Data;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
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

        var connectionString = context.Database.GetConnectionString()
            ?? throw new InvalidOperationException("Database connection string is not configured.");

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        // Phase 1: run the hand-written idempotent scripts (column-level shims, table
        // renames, seeds). These handle cases the EF model doesn't describe.
        await RunEmbeddedScriptsAsync(connection, logger);

        // Phase 2: close the gap between the EF model and the live schema by generating
        // CREATE TABLE statements for every entity whose backing table is missing. This
        // catches the long tail of tables that drifted between ad-hoc scripts and EF
        // migrations without requiring us to hand-write SQL for each one.
        await CreateMissingTablesFromModelAsync(context, connection, logger);
    }

    private static async Task RunEmbeddedScriptsAsync(SqlConnection connection, ILogger logger)
    {
        var assembly = typeof(ProductionSchemaRepairRunner).Assembly;
        var resourceNames = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(ResourceNamespace, StringComparison.Ordinal)
                        && n.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToArray();

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
                    logger.LogWarning(ex,
                        "Schema repair batch failed (script: {Script}). First 200 chars: {Preview}",
                        scriptName,
                        batch.Length > 200 ? batch.Substring(0, 200) : batch);
                }
            }

            logger.LogInformation("Schema repair script executed: {Script}", scriptName);
        }
    }

    /// <summary>
    /// Uses EF Core's migrations generator to emit the full CREATE script for the current
    /// model, then executes only the CREATE TABLE / CREATE INDEX blocks whose target does
    /// not yet exist. ALTER / DROP / FK statements are skipped so we never modify tables
    /// that pre-existed under a different schema.
    /// </summary>
    private static async Task CreateMissingTablesFromModelAsync(
        HISDbContext context, SqlConnection connection, ILogger logger)
    {
        // Discover existing tables in dbo so we can skip them.
        var existingTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using (var probe = connection.CreateCommand())
        {
            probe.CommandText = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo'";
            await using var reader = await probe.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                existingTables.Add(reader.GetString(0));
        }

        // Ask EF Core for the full CREATE script (no history table, no drops).
        string createScript;
        try
        {
            createScript = context.Database.GenerateCreateScript();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "GenerateCreateScript failed; skipping model-driven schema creation.");
            return;
        }

        // Split into individual statements (EF emits GO separators).
        var statements = SplitSqlBatches(createScript).ToList();

        // Regex to pull the target table name out of a CREATE TABLE statement.
        // Matches "CREATE TABLE [Foo]" and "CREATE TABLE [dbo].[Foo]".
        // First [word] after CREATE TABLE / ON is the target; dbo. prefix is optional.
        var createTableRegex = new Regex(
            @"CREATE\s+TABLE\s+(?:\[dbo\]\.)?\[(?<table>[^\]]+)\]",
            RegexOptions.IgnoreCase);
        var createIndexRegex = new Regex(
            @"CREATE\s+(?:UNIQUE\s+)?INDEX\s+\[[^\]]+\]\s+ON\s+(?:\[dbo\]\.)?\[(?<table>[^\]]+)\]",
            RegexOptions.IgnoreCase);

        // Collect tuples (tableName, statement, isCreateTable) so we can retry in
        // multiple passes - EF emits tables in declaration order, not dependency
        // order, so a FK reference may hit a not-yet-created parent on the first pass.
        var pending = new List<(string Table, string Statement, bool IsCreateTable)>();
        foreach (var statement in statements)
        {
            var trimmed = statement.TrimStart();
            if (!trimmed.StartsWith("CREATE TABLE", StringComparison.OrdinalIgnoreCase)
                && !trimmed.StartsWith("CREATE INDEX", StringComparison.OrdinalIgnoreCase)
                && !trimmed.StartsWith("CREATE UNIQUE", StringComparison.OrdinalIgnoreCase))
                continue;

            string? tableName = null;
            var tm = createTableRegex.Match(trimmed);
            if (tm.Success) tableName = tm.Groups["table"].Value;
            else
            {
                var im = createIndexRegex.Match(trimmed);
                if (im.Success) tableName = im.Groups["table"].Value;
            }

            if (tableName is null) continue;
            if (existingTables.Contains(tableName)) continue;

            var isCreateTable = trimmed.StartsWith("CREATE TABLE", StringComparison.OrdinalIgnoreCase);
            pending.Add((tableName, statement, isCreateTable));
        }

        var createdCount = 0;
        var lastFailures = new List<(string Table, Exception Ex, string Statement)>();

        // Regex to downgrade ON DELETE CASCADE to ON DELETE NO ACTION. SQL Server
        // rejects multiple cascade paths to the same parent, which EF does not detect
        // until DDL execution.
        var cascadeRegex = new Regex(@"ON DELETE CASCADE", RegexOptions.IgnoreCase);
        // Regex that strips inline FOREIGN KEY constraints from a CREATE TABLE body.
        // Used on the final retry when the FK target table is missing from the schema.
        var inlineFkRegex = new Regex(
            @",\s*CONSTRAINT\s+\[[^\]]+\]\s+FOREIGN\s+KEY\s*\([^)]+\)\s*REFERENCES\s+(?:\[dbo\]\.)?\[[^\]]+\]\s*\([^)]+\)(?:\s+ON\s+(?:DELETE|UPDATE)\s+(?:CASCADE|NO\s+ACTION|SET\s+NULL|SET\s+DEFAULT))*",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);

        // Retry up to 4 passes. Each pass creates more parent tables; the final pass
        // strips FK constraints entirely so tables get created even if their FK target
        // doesn't exist yet.
        for (var pass = 0; pass < 4 && pending.Count > 0; pass++)
        {
            var stillPending = new List<(string Table, string Statement, bool IsCreateTable)>();
            lastFailures.Clear();

            foreach (var (tableName, statement, isCreateTable) in pending)
            {
                string sqlToRun = statement;
                if (pass >= 1)
                    sqlToRun = cascadeRegex.Replace(sqlToRun, "ON DELETE NO ACTION");
                if (pass >= 3 && isCreateTable)
                    sqlToRun = inlineFkRegex.Replace(sqlToRun, "");

                try
                {
                    await using var cmd = connection.CreateCommand();
                    cmd.CommandType = CommandType.Text;
                    cmd.CommandText = sqlToRun;
                    cmd.CommandTimeout = 120;
                    await cmd.ExecuteNonQueryAsync();

                    if (isCreateTable)
                    {
                        existingTables.Add(tableName);
                        createdCount++;
                        logger.LogInformation("Model-driven schema repair: created table {Table} (pass {Pass})", tableName, pass + 1);
                    }
                }
                catch (Exception ex)
                {
                    stillPending.Add((tableName, statement, isCreateTable));
                    lastFailures.Add((tableName, ex, statement));
                }
            }

            // Don't early-break on "no progress" until after the FK-strip pass has
            // had its chance (pass 3).
            if (stillPending.Count == pending.Count && pass >= 3) break;
            pending = stillPending;
        }

        foreach (var (tableName, ex, statement) in lastFailures)
        {
            // Flatten to a single line so Cloud Logging doesn't split on newlines.
            var flat = statement.Replace("\r", " ").Replace("\n", " ");
            if (flat.Length > 3000) flat = flat.Substring(0, 3000) + "...";
            logger.LogWarning(ex,
                "Model-driven schema repair giving up on {Table}. STATEMENT={Statement}",
                tableName,
                flat);
        }

        logger.LogInformation(
            "Model-driven schema repair finished: created {Created} tables, {Failed} final failures.",
            createdCount, lastFailures.Count);
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
