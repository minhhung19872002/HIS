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
        await EnsureHivManagementTablesAsync(context);
        await EnsureTrainingResearchTablesAsync(context);
    }

    private static async Task EnsureHivManagementTablesAsync(HISDbContext context)
    {
        await ExecuteNonQueryAsync(context, """
            IF OBJECT_ID(N'[dbo].[HivPatients]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[HivPatients]
                (
                    [Id] UNIQUEIDENTIFIER NOT NULL,
                    [PatientId] UNIQUEIDENTIFIER NOT NULL,
                    [HivCode] NVARCHAR(64) NOT NULL,
                    [DiagnosisDate] DATETIME2 NOT NULL,
                    [DiagnosisType] NVARCHAR(32) NOT NULL,
                    [ConfirmationDate] DATETIME2 NULL,
                    [CurrentARTRegimen] NVARCHAR(256) NULL,
                    [ARTStartDate] DATETIME2 NULL,
                    [ARTStatus] INT NOT NULL,
                    [WHOStage] INT NOT NULL,
                    [LastCD4Count] INT NULL,
                    [LastCD4Date] DATETIME2 NULL,
                    [LastViralLoad] DECIMAL(18,2) NULL,
                    [LastViralLoadDate] DATETIME2 NULL,
                    [IsVirallySuppressed] BIT NULL,
                    [CoInfections] NVARCHAR(MAX) NULL,
                    [ReferralSource] NVARCHAR(256) NULL,
                    [LinkedToMethadone] BIT NOT NULL CONSTRAINT [DF_HivPatients_LinkedToMethadone] DEFAULT(0),
                    [MethadonePatientId] UNIQUEIDENTIFIER NULL,
                    [NextAppointmentDate] DATETIME2 NULL,
                    [CreatedAt] DATETIME2 NOT NULL,
                    [CreatedBy] NVARCHAR(450) NULL,
                    [UpdatedAt] DATETIME2 NULL,
                    [UpdatedBy] NVARCHAR(450) NULL,
                    [IsDeleted] BIT NOT NULL CONSTRAINT [DF_HivPatients_IsDeleted] DEFAULT(0),
                    CONSTRAINT [PK_HivPatients] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_HivPatients_Patients_PatientId] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]) ON DELETE NO ACTION,
                    CONSTRAINT [FK_HivPatients_MethadonePatients_MethadonePatientId] FOREIGN KEY ([MethadonePatientId]) REFERENCES [dbo].[MethadonePatients]([Id]) ON DELETE NO ACTION
                );

                CREATE UNIQUE INDEX [IX_HivPatients_HivCode] ON [dbo].[HivPatients]([HivCode]);
                CREATE INDEX [IX_HivPatients_PatientId] ON [dbo].[HivPatients]([PatientId]);
                CREATE INDEX [IX_HivPatients_MethadonePatientId] ON [dbo].[HivPatients]([MethadonePatientId]);
            END
            """);

        await ExecuteNonQueryAsync(context, """
            IF OBJECT_ID(N'[dbo].[HivLabResults]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[HivLabResults]
                (
                    [Id] UNIQUEIDENTIFIER NOT NULL,
                    [HivPatientId] UNIQUEIDENTIFIER NOT NULL,
                    [TestDate] DATETIME2 NOT NULL,
                    [TestType] NVARCHAR(64) NOT NULL,
                    [Result] NVARCHAR(256) NULL,
                    [Unit] NVARCHAR(64) NULL,
                    [IsAbnormal] BIT NULL,
                    [LabName] NVARCHAR(256) NULL,
                    [OrderedBy] NVARCHAR(256) NULL,
                    [CreatedAt] DATETIME2 NOT NULL,
                    [CreatedBy] NVARCHAR(450) NULL,
                    [UpdatedAt] DATETIME2 NULL,
                    [UpdatedBy] NVARCHAR(450) NULL,
                    [IsDeleted] BIT NOT NULL CONSTRAINT [DF_HivLabResults_IsDeleted] DEFAULT(0),
                    CONSTRAINT [PK_HivLabResults] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_HivLabResults_HivPatients_HivPatientId] FOREIGN KEY ([HivPatientId]) REFERENCES [dbo].[HivPatients]([Id]) ON DELETE CASCADE
                );

                CREATE INDEX [IX_HivLabResults_HivPatientId] ON [dbo].[HivLabResults]([HivPatientId]);
                CREATE INDEX [IX_HivLabResults_TestDate] ON [dbo].[HivLabResults]([TestDate]);
            END
            """);

        await ExecuteNonQueryAsync(context, """
            IF OBJECT_ID(N'[dbo].[PmtctRecords]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[PmtctRecords]
                (
                    [Id] UNIQUEIDENTIFIER NOT NULL,
                    [HivPatientId] UNIQUEIDENTIFIER NOT NULL,
                    [PregnancyId] UNIQUEIDENTIFIER NULL,
                    [GestationalAgeAtDiagnosis] INT NULL,
                    [ARTDuringPregnancy] BIT NOT NULL CONSTRAINT [DF_PmtctRecords_ARTDuringPregnancy] DEFAULT(0),
                    [DeliveryDate] DATETIME2 NULL,
                    [DeliveryMode] NVARCHAR(64) NULL,
                    [InfantProphylaxis] BIT NOT NULL CONSTRAINT [DF_PmtctRecords_InfantProphylaxis] DEFAULT(0),
                    [InfantHivTestDate] DATETIME2 NULL,
                    [InfantHivTestResult] NVARCHAR(64) NULL,
                    [BreastfeedingStatus] NVARCHAR(64) NULL,
                    [CreatedAt] DATETIME2 NOT NULL,
                    [CreatedBy] NVARCHAR(450) NULL,
                    [UpdatedAt] DATETIME2 NULL,
                    [UpdatedBy] NVARCHAR(450) NULL,
                    [IsDeleted] BIT NOT NULL CONSTRAINT [DF_PmtctRecords_IsDeleted] DEFAULT(0),
                    CONSTRAINT [PK_PmtctRecords] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_PmtctRecords_HivPatients_HivPatientId] FOREIGN KEY ([HivPatientId]) REFERENCES [dbo].[HivPatients]([Id]) ON DELETE CASCADE
                );

                CREATE INDEX [IX_PmtctRecords_HivPatientId] ON [dbo].[PmtctRecords]([HivPatientId]);
                CREATE INDEX [IX_PmtctRecords_DeliveryDate] ON [dbo].[PmtctRecords]([DeliveryDate]);
            END
            """);
    }

    private static async Task EnsureTrainingResearchTablesAsync(HISDbContext context)
    {
        await ExecuteNonQueryAsync(context, """
            IF OBJECT_ID(N'[dbo].[TrainingClasses]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[TrainingClasses]
                (
                    [Id] UNIQUEIDENTIFIER NOT NULL,
                    [ClassCode] NVARCHAR(64) NOT NULL,
                    [ClassName] NVARCHAR(256) NOT NULL,
                    [TrainingType] INT NOT NULL CONSTRAINT [DF_TrainingClasses_TrainingType] DEFAULT(1),
                    [StartDate] DATETIME2 NOT NULL,
                    [EndDate] DATETIME2 NULL,
                    [MaxStudents] INT NOT NULL CONSTRAINT [DF_TrainingClasses_MaxStudents] DEFAULT(30),
                    [Location] NVARCHAR(256) NULL,
                    [InstructorId] UNIQUEIDENTIFIER NULL,
                    [DepartmentId] UNIQUEIDENTIFIER NULL,
                    [Description] NVARCHAR(MAX) NULL,
                    [CreditHours] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TrainingClasses_CreditHours] DEFAULT(0),
                    [Status] INT NOT NULL CONSTRAINT [DF_TrainingClasses_Status] DEFAULT(1),
                    [Fee] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_TrainingClasses_Fee] DEFAULT(0),
                    [CreatedAt] DATETIME2 NOT NULL,
                    [CreatedBy] NVARCHAR(450) NULL,
                    [UpdatedAt] DATETIME2 NULL,
                    [UpdatedBy] NVARCHAR(450) NULL,
                    [IsDeleted] BIT NOT NULL CONSTRAINT [DF_TrainingClasses_IsDeleted] DEFAULT(0),
                    CONSTRAINT [PK_TrainingClasses] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_TrainingClasses_Users_InstructorId] FOREIGN KEY ([InstructorId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION,
                    CONSTRAINT [FK_TrainingClasses_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [dbo].[Departments]([Id]) ON DELETE NO ACTION
                );

                CREATE UNIQUE INDEX [IX_TrainingClasses_ClassCode] ON [dbo].[TrainingClasses]([ClassCode]);
                CREATE INDEX [IX_TrainingClasses_InstructorId] ON [dbo].[TrainingClasses]([InstructorId]);
                CREATE INDEX [IX_TrainingClasses_DepartmentId] ON [dbo].[TrainingClasses]([DepartmentId]);
                CREATE INDEX [IX_TrainingClasses_StartDate] ON [dbo].[TrainingClasses]([StartDate]);
            END
            """);

        await ExecuteNonQueryAsync(context, """
            IF OBJECT_ID(N'[dbo].[TrainingStudents]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[TrainingStudents]
                (
                    [Id] UNIQUEIDENTIFIER NOT NULL,
                    [ClassId] UNIQUEIDENTIFIER NOT NULL,
                    [TrainingClassId] UNIQUEIDENTIFIER NULL,
                    [StaffId] UNIQUEIDENTIFIER NULL,
                    [ExternalName] NVARCHAR(256) NULL,
                    [StudentType] INT NOT NULL CONSTRAINT [DF_TrainingStudents_StudentType] DEFAULT(1),
                    [AttendanceStatus] INT NOT NULL CONSTRAINT [DF_TrainingStudents_AttendanceStatus] DEFAULT(1),
                    [Score] DECIMAL(18,2) NULL,
                    [CertificateNumber] NVARCHAR(128) NULL,
                    [CertificateDate] DATETIME2 NULL,
                    [Notes] NVARCHAR(MAX) NULL,
                    [CreatedAt] DATETIME2 NOT NULL,
                    [CreatedBy] NVARCHAR(450) NULL,
                    [UpdatedAt] DATETIME2 NULL,
                    [UpdatedBy] NVARCHAR(450) NULL,
                    [IsDeleted] BIT NOT NULL CONSTRAINT [DF_TrainingStudents_IsDeleted] DEFAULT(0),
                    CONSTRAINT [PK_TrainingStudents] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_TrainingStudents_TrainingClasses_ClassId] FOREIGN KEY ([ClassId]) REFERENCES [dbo].[TrainingClasses]([Id]) ON DELETE CASCADE,
                    CONSTRAINT [FK_TrainingStudents_TrainingClasses_TrainingClassId] FOREIGN KEY ([TrainingClassId]) REFERENCES [dbo].[TrainingClasses]([Id]) ON DELETE NO ACTION,
                    CONSTRAINT [FK_TrainingStudents_Users_StaffId] FOREIGN KEY ([StaffId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION
                );

                CREATE INDEX [IX_TrainingStudents_ClassId] ON [dbo].[TrainingStudents]([ClassId]);
                CREATE INDEX [IX_TrainingStudents_TrainingClassId] ON [dbo].[TrainingStudents]([TrainingClassId]);
                CREATE INDEX [IX_TrainingStudents_StaffId] ON [dbo].[TrainingStudents]([StaffId]);
                CREATE INDEX [IX_TrainingStudents_AttendanceStatus] ON [dbo].[TrainingStudents]([AttendanceStatus]);
            END
            """);
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

    private static async Task ExecuteNonQueryAsync(HISDbContext context, string sql)
    {
        var connectionString = context.Database.GetConnectionString()
            ?? throw new InvalidOperationException("Database connection string is not configured.");

        await using var connection = new SqlConnection(connectionString);
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync();
    }
}
