-- ============================================================
-- #16 (2026-06-11): bảng InfusionRecords — phiếu theo dõi truyền dịch nội trú.
-- Persist thật thay stub echo-fake (FE modal báo "Đã ghi nhận" nhưng trước đây
-- KHÔNG lưu gì — patient-safety). Idempotent.
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InfusionRecords')
BEGIN
    CREATE TABLE [dbo].[InfusionRecords] (
        [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [AdmissionId] UNIQUEIDENTIFIER NOT NULL,
        [FluidName] NVARCHAR(300) NOT NULL DEFAULT '',
        [Volume] INT NOT NULL DEFAULT 0,
        [DropRate] INT NOT NULL DEFAULT 0,
        [StartTime] DATETIME2 NOT NULL,
        [EndTime] DATETIME2 NULL,
        [DurationMinutes] INT NULL,
        [Route] NVARCHAR(100) NULL,
        [AdditionalMedication] NVARCHAR(500) NULL,
        [StartedBy] UNIQUEIDENTIFIER NOT NULL,
        [CompletedBy] UNIQUEIDENTIFIER NULL,
        [Observations] NVARCHAR(MAX) NULL,
        [Complications] NVARCHAR(MAX) NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0,
        CONSTRAINT [FK_InfusionRecords_Admissions] FOREIGN KEY ([AdmissionId]) REFERENCES [dbo].[Admissions]([Id])
    );
    CREATE INDEX [IX_InfusionRecords_AdmissionId] ON [dbo].[InfusionRecords]([AdmissionId]);
    PRINT 'Created InfusionRecords table';
END
GO

PRINT '94_infusion_records completed';
