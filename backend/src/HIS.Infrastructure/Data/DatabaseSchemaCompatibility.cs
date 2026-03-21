using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Data;

public static class DatabaseSchemaCompatibility
{
    public static async Task EnsureLegacySchemaAsync(HISDbContext context)
    {
        if (!context.Database.IsSqlServer())
            return;

        await EnsureColumnAsync(context, "TeleSessions", "DurationMinutes", "INT NULL");
        await EnsureColumnAsync(context, "TeleSessions", "IsRecorded", "BIT NULL");
        await EnsureColumnAsync(context, "TeleSessions", "ConnectionQuality", "NVARCHAR(MAX) NULL");
        await EnsureColumnAsync(context, "TeleSessions", "CreatedAt", "DATETIME2 NULL");
    }

    private static async Task EnsureColumnAsync(HISDbContext context, string tableName, string columnName, string sqlDefinition)
    {
        var connectionString = context.Database.GetConnectionString()
            ?? throw new InvalidOperationException("Database connection string is not configured.");

        await using var connection = new SqlConnection(connectionString);
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();

        await using var existsCommand = connection.CreateCommand();
        existsCommand.CommandText = """
            SELECT COUNT(1)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName AND COLUMN_NAME = @columnName
            """;

        var tableParam = existsCommand.CreateParameter();
        tableParam.ParameterName = "@tableName";
        tableParam.Value = tableName;
        existsCommand.Parameters.Add(tableParam);

        var columnParam = existsCommand.CreateParameter();
        columnParam.ParameterName = "@columnName";
        columnParam.Value = columnName;
        existsCommand.Parameters.Add(columnParam);

        var exists = Convert.ToInt32(await existsCommand.ExecuteScalarAsync()) > 0;
        if (exists)
            return;

        var escapedTable = $"[{tableName.Replace("]", "]]")}]";
        var escapedColumn = $"[{columnName.Replace("]", "]]")}]";
        await using var alterCommand = connection.CreateCommand();
        alterCommand.CommandText = $"ALTER TABLE {escapedTable} ADD {escapedColumn} {sqlDefinition};";
        await alterCommand.ExecuteNonQueryAsync();
    }
}
