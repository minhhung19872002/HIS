-- K5 Remaining: MedicalRecordArchive borrow + DutySchedules
-- Idempotent

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- 1. MedicalRecordArchives: add borrow/loan tracking
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MedicalRecordArchives') AND name = 'IsOnLoan')
BEGIN
    ALTER TABLE MedicalRecordArchives ADD IsOnLoan BIT NOT NULL DEFAULT 0;
    ALTER TABLE MedicalRecordArchives ADD BorrowedByUserId UNIQUEIDENTIFIER NULL;
    ALTER TABLE MedicalRecordArchives ADD BorrowedAt DATETIME2 NULL;
    ALTER TABLE MedicalRecordArchives ADD ReturnedAt DATETIME2 NULL;
    ALTER TABLE MedicalRecordArchives ADD BorrowReason NVARCHAR(500) NULL;
    PRINT 'Added borrow columns to MedicalRecordArchives';
END

-- 2. DutySchedules
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DutySchedules')
BEGIN
    CREATE TABLE DutySchedules (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        DoctorId UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        Date DATETIME2 NOT NULL,
        ShiftType INT NOT NULL DEFAULT 1,
        RoomId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(500) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL
    );
    PRINT 'Created DutySchedules';
END

COMMIT TRANSACTION;
GO
