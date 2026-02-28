-- DQGVN Submissions table
-- Cong du lieu y te quoc gia (Vietnam National Health Data Exchange)
-- Tracks all data submissions to the national health data portal

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DqgvnSubmissions')
BEGIN
    CREATE TABLE DqgvnSubmissions (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SubmissionType INT NOT NULL,           -- 1=PatientDemographics, 2=Encounter, 3=Lab, 4=Radiology, 5=Prescription, 6=Discharge, 7=Death, 8=InfectiousDisease, 9=Birth, 10=Vaccination
        PatientId UNIQUEIDENTIFIER NULL,
        SourceEntityId UNIQUEIDENTIFIER NULL,  -- ExaminationId, LabRequestId, AdmissionId, etc.
        RequestPayload NVARCHAR(MAX) NULL,     -- JSON sent to DQGVN
        ResponsePayload NVARCHAR(MAX) NULL,    -- JSON received from DQGVN
        Status INT NOT NULL DEFAULT 0,         -- 0=Pending, 1=Submitted, 2=Accepted, 3=Rejected, 4=Error
        ErrorMessage NVARCHAR(2000) NULL,
        TransactionId NVARCHAR(200) NULL,      -- Transaction ID returned by DQGVN
        RetryCount INT NOT NULL DEFAULT 0,
        SubmittedAt DATETIME2 NULL,
        ResponseAt DATETIME2 NULL,

        -- BaseEntity fields
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,

        -- Foreign keys
        CONSTRAINT FK_DqgvnSubmissions_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );

    PRINT 'Created DqgvnSubmissions table';
END
ELSE
    PRINT 'DqgvnSubmissions table already exists';
GO

SET QUOTED_IDENTIFIER ON;
GO

-- Performance indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DqgvnSubmissions_Status' AND object_id = OBJECT_ID('DqgvnSubmissions'))
    CREATE INDEX IX_DqgvnSubmissions_Status ON DqgvnSubmissions (Status) INCLUDE (SubmissionType, CreatedAt);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DqgvnSubmissions_SubmissionType' AND object_id = OBJECT_ID('DqgvnSubmissions'))
    CREATE INDEX IX_DqgvnSubmissions_SubmissionType ON DqgvnSubmissions (SubmissionType, Status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DqgvnSubmissions_PatientId' AND object_id = OBJECT_ID('DqgvnSubmissions'))
    CREATE INDEX IX_DqgvnSubmissions_PatientId ON DqgvnSubmissions (PatientId) WHERE PatientId IS NOT NULL;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DqgvnSubmissions_CreatedAt' AND object_id = OBJECT_ID('DqgvnSubmissions'))
    CREATE INDEX IX_DqgvnSubmissions_CreatedAt ON DqgvnSubmissions (CreatedAt DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DqgvnSubmissions_TransactionId' AND object_id = OBJECT_ID('DqgvnSubmissions'))
    CREATE INDEX IX_DqgvnSubmissions_TransactionId ON DqgvnSubmissions (TransactionId) WHERE TransactionId IS NOT NULL;

PRINT 'DQGVN indexes created/verified';
GO
