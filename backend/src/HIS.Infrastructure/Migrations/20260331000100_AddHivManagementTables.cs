using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using HIS.Infrastructure.Data;

#nullable disable

namespace HIS.Infrastructure.Migrations
{
    [DbContext(typeof(HISDbContext))]
    [Migration("20260331000100_AddHivManagementTables")]
    public partial class AddHivManagementTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
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

            migrationBuilder.Sql("""
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

            migrationBuilder.Sql("""
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

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[dbo].[PmtctRecords]', N'U') IS NOT NULL
                    DROP TABLE [dbo].[PmtctRecords];
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[dbo].[HivLabResults]', N'U') IS NOT NULL
                    DROP TABLE [dbo].[HivLabResults];
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[dbo].[HivPatients]', N'U') IS NOT NULL
                    DROP TABLE [dbo].[HivPatients];
                """);
        }
    }
}
