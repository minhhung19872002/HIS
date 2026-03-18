-- Create workflow tables for missing flows
-- SurgeryConsents: Cam kết phẫu thuật
-- BillingReversals: Đảo bút toán dịch vụ
-- Idempotent: IF NOT EXISTS

USE HIS;
GO

-- 1. SurgeryConsents
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SurgeryConsents')
BEGIN
    CREATE TABLE SurgeryConsents (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SurgeryId UNIQUEIDENTIFIER NOT NULL,
        ConsentType INT NOT NULL, -- 1-PT, 2-Gay me, 3-Truyen mau, 4-Thu thuat
        Diagnosis NVARCHAR(500),
        PlannedProcedure NVARCHAR(500),
        Risks NVARCHAR(MAX),
        Alternatives NVARCHAR(MAX),
        DoctorExplanation NVARCHAR(MAX),
        DoctorId UNIQUEIDENTIFIER,
        SignerName NVARCHAR(200),
        SignerRelationship NVARCHAR(100),
        SignedAt DATETIME2,
        IsSigned BIT NOT NULL DEFAULT 0,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        CONSTRAINT FK_SurgeryConsents_Surgery FOREIGN KEY (SurgeryId) REFERENCES Surgeries(Id),
        CONSTRAINT FK_SurgeryConsents_Doctor FOREIGN KEY (DoctorId) REFERENCES Users(Id)
    );

    CREATE INDEX IX_SurgeryConsents_SurgeryId ON SurgeryConsents(SurgeryId);
    CREATE INDEX IX_SurgeryConsents_ConsentType ON SurgeryConsents(SurgeryId, ConsentType);

    PRINT 'Created SurgeryConsents table';
END
GO

-- 2. BillingReversals
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BillingReversals')
BEGIN
    CREATE TABLE BillingReversals (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MedicalRecordId UNIQUEIDENTIFIER NOT NULL,
        ServiceRequestId UNIQUEIDENTIFIER,
        ServiceName NVARCHAR(500),
        OriginalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        ReversedAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        Reason NVARCHAR(500) NOT NULL,
        ReversedBy UNIQUEIDENTIFIER,
        ReversedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        Status INT NOT NULL DEFAULT 1, -- 1-Pending, 2-Approved, 3-Rejected
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100),
        CONSTRAINT FK_BillingReversals_MedicalRecord FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id),
        CONSTRAINT FK_BillingReversals_User FOREIGN KEY (ReversedBy) REFERENCES Users(Id)
    );

    CREATE INDEX IX_BillingReversals_MedicalRecord ON BillingReversals(MedicalRecordId);
    CREATE INDEX IX_BillingReversals_ReversedAt ON BillingReversals(ReversedAt);

    PRINT 'Created BillingReversals table';
END
GO

PRINT 'Workflow tables created successfully';
GO
