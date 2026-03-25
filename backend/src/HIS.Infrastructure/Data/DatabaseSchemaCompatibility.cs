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

        await EnsureStringColumnLengthAsync(context, "Patients", "IdentityNumber", 450);
        await EnsureStringColumnLengthAsync(context, "Patients", "PhoneNumber", 450);
        await EnsureStringColumnLengthAsync(context, "Patients", "Email", 450);
        await EnsureStringColumnLengthAsync(context, "Patients", "InsuranceNumber", 450);

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

        await using var tableExistsCommand = connection.CreateCommand();
        tableExistsCommand.CommandText = """
            SELECT COUNT(1)
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = @tableName
            """;

        var tableNameParam = tableExistsCommand.CreateParameter();
        tableNameParam.ParameterName = "@tableName";
        tableNameParam.Value = tableName;
        tableExistsCommand.Parameters.Add(tableNameParam);

        var tableExists = Convert.ToInt32(await tableExistsCommand.ExecuteScalarAsync()) > 0;
        if (!tableExists)
            return;

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

    private static async Task EnsureStringColumnLengthAsync(HISDbContext context, string tableName, string columnName, int minLength)
    {
        var connectionString = context.Database.GetConnectionString()
            ?? throw new InvalidOperationException("Database connection string is not configured.");

        await using var connection = new SqlConnection(connectionString);
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();

        await using var metadataCommand = connection.CreateCommand();
        metadataCommand.CommandText = """
            SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName AND COLUMN_NAME = @columnName
            """;

        var tableParam = metadataCommand.CreateParameter();
        tableParam.ParameterName = "@tableName";
        tableParam.Value = tableName;
        metadataCommand.Parameters.Add(tableParam);

        var columnParam = metadataCommand.CreateParameter();
        columnParam.ParameterName = "@columnName";
        columnParam.Value = columnName;
        metadataCommand.Parameters.Add(columnParam);

        await using var reader = await metadataCommand.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return;

        var dataType = reader.GetString(0);
        var currentLength = reader.IsDBNull(1) ? -1 : reader.GetInt32(1);
        if (!dataType.Equals("nvarchar", StringComparison.OrdinalIgnoreCase))
            return;

        if (currentLength == -1 || currentLength >= minLength)
            return;

        await reader.DisposeAsync();

        var escapedTable = $"[{tableName.Replace("]", "]]")}]";
        var escapedColumn = $"[{columnName.Replace("]", "]]")}]";
        await using var alterCommand = connection.CreateCommand();
        alterCommand.CommandText = $"ALTER TABLE {escapedTable} ALTER COLUMN {escapedColumn} NVARCHAR({minLength}) NULL;";
        await alterCommand.ExecuteNonQueryAsync();
    }
}
