-- Pathology module tables (Giải phẫu bệnh & Tế bào học)
-- Idempotent: IF NOT EXISTS

USE HIS;
GO

-- PathologyRequests
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PathologyRequests')
BEGIN
    CREATE TABLE PathologyRequests (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RequestCode NVARCHAR(50) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        MedicalRecordId UNIQUEIDENTIFIER NULL,
        ExaminationId UNIQUEIDENTIFIER NULL,
        RequestingDoctorId UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        RequestDate DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Specimen
        SpecimenType NVARCHAR(50) NOT NULL DEFAULT 'biopsy',
        SpecimenSite NVARCHAR(500) NULL,
        SpecimenDescription NVARCHAR(2000) NULL,
        SpecimenCount INT NOT NULL DEFAULT 1,
        SpecimenCollectedAt DATETIME2 NULL,
        SpecimenCollectedBy UNIQUEIDENTIFIER NULL,

        -- Clinical
        ClinicalDiagnosis NVARCHAR(1000) NULL,
        ClinicalHistory NVARCHAR(2000) NULL,
        Priority NVARCHAR(20) NOT NULL DEFAULT 'normal',

        -- Status: 0=Pending, 1=Grossing, 2=Processing, 3=Completed, 4=Verified
        Status INT NOT NULL DEFAULT 0,

        -- Billing
        PatientType INT NOT NULL DEFAULT 2,
        InsuranceNumber NVARCHAR(50) NULL,
        TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        IsPaid BIT NOT NULL DEFAULT 0,
        Notes NVARCHAR(2000) NULL,

        -- Cancellation
        CancelledBy NVARCHAR(100) NULL,
        CancelledAt DATETIME2 NULL,
        CancellationReason NVARCHAR(500) NULL,

        -- BaseEntity
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,

        -- Foreign Keys
        CONSTRAINT FK_PathologyRequests_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_PathologyRequests_Users FOREIGN KEY (RequestingDoctorId) REFERENCES Users(Id),
        CONSTRAINT FK_PathologyRequests_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)
    );

    CREATE INDEX IX_PathologyRequests_RequestCode ON PathologyRequests(RequestCode);
    CREATE INDEX IX_PathologyRequests_PatientId ON PathologyRequests(PatientId);
    CREATE INDEX IX_PathologyRequests_Status ON PathologyRequests(Status);
    CREATE INDEX IX_PathologyRequests_RequestDate ON PathologyRequests(RequestDate);
    CREATE INDEX IX_PathologyRequests_SpecimenType ON PathologyRequests(SpecimenType);

    PRINT 'Created PathologyRequests table';
END
ELSE
    PRINT 'PathologyRequests table already exists';
GO

-- PathologyResults
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PathologyResults')
BEGIN
    CREATE TABLE PathologyResults (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RequestId UNIQUEIDENTIFIER NOT NULL,

        -- Đại thể
        GrossDescription NVARCHAR(MAX) NULL,
        BlockCount INT NOT NULL DEFAULT 0,
        SlideCount INT NOT NULL DEFAULT 0,

        -- Vi thể
        MicroscopicDescription NVARCHAR(MAX) NULL,

        -- Nhuộm
        StainingMethods NVARCHAR(500) NULL,
        SpecialStains NVARCHAR(MAX) NULL,

        -- IHC / Molecular
        Immunohistochemistry NVARCHAR(MAX) NULL,
        MolecularTests NVARCHAR(MAX) NULL,

        -- Kết luận
        Diagnosis NVARCHAR(2000) NULL,
        IcdCode NVARCHAR(20) NULL,
        Comments NVARCHAR(2000) NULL,

        -- Pathologist
        Pathologist NVARCHAR(200) NULL,
        PathologistId UNIQUEIDENTIFIER NULL,
        CompletedAt DATETIME2 NULL,

        -- Verification
        VerifiedBy UNIQUEIDENTIFIER NULL,
        VerifiedAt DATETIME2 NULL,
        VerifiedByName NVARCHAR(200) NULL,

        -- Images
        Images NVARCHAR(MAX) NULL,

        -- BaseEntity
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,

        -- Foreign Keys
        CONSTRAINT FK_PathologyResults_Requests FOREIGN KEY (RequestId) REFERENCES PathologyRequests(Id)
    );

    CREATE INDEX IX_PathologyResults_RequestId ON PathologyResults(RequestId);

    PRINT 'Created PathologyResults table';
END
ELSE
    PRINT 'PathologyResults table already exists';
GO

PRINT 'Pathology tables setup complete';
GO
