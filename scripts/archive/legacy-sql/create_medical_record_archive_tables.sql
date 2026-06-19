-- Create Medical Record Archive & Borrow Request tables
-- Luu tru ho so benh an va muon/tra HSBA
USE HIS;
GO

-- 1. MedicalRecordArchives - Luu tru HSBA
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MedicalRecordArchives')
BEGIN
    CREATE TABLE MedicalRecordArchives (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ArchiveCode NVARCHAR(50) NOT NULL,
        MedicalRecordId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        Diagnosis NVARCHAR(500) NULL,
        TreatmentResult NVARCHAR(200) NULL,
        AdmissionDate DATETIME2 NULL,
        DischargeDate DATETIME2 NULL,
        StorageLocation NVARCHAR(200) NULL,
        ShelfNumber NVARCHAR(50) NULL,
        BoxNumber NVARCHAR(50) NULL,
        Status INT NOT NULL DEFAULT 0, -- 0=Cho luu, 1=Da luu, 2=Dang muon, 3=Da huy
        ArchivedDate DATETIME2 NULL,
        ArchivedById UNIQUEIDENTIFIER NULL,
        ArchiveYear INT NOT NULL DEFAULT YEAR(GETDATE()),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MedicalRecordArchives_MedicalRecords FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id),
        CONSTRAINT FK_MedicalRecordArchives_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_MedicalRecordArchives_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_MedicalRecordArchives_ArchivedBy FOREIGN KEY (ArchivedById) REFERENCES Users(Id)
    );
    CREATE INDEX IX_MedicalRecordArchives_ArchiveCode ON MedicalRecordArchives(ArchiveCode);
    CREATE INDEX IX_MedicalRecordArchives_MedicalRecordId ON MedicalRecordArchives(MedicalRecordId);
    CREATE INDEX IX_MedicalRecordArchives_PatientId ON MedicalRecordArchives(PatientId);
    CREATE INDEX IX_MedicalRecordArchives_ArchiveYear ON MedicalRecordArchives(ArchiveYear);
    CREATE INDEX IX_MedicalRecordArchives_Status ON MedicalRecordArchives(Status);
    PRINT 'Created table MedicalRecordArchives';
END
ELSE
    PRINT 'Table MedicalRecordArchives already exists';
GO

-- 2. MedicalRecordBorrowRequests - Muon/tra HSBA
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MedicalRecordBorrowRequests')
BEGIN
    CREATE TABLE MedicalRecordBorrowRequests (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RequestCode NVARCHAR(50) NOT NULL,
        MedicalRecordArchiveId UNIQUEIDENTIFIER NOT NULL,
        RequestedById UNIQUEIDENTIFIER NOT NULL,
        RequestDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        Purpose NVARCHAR(500) NULL,
        ExpectedReturnDate DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0, -- 0=Cho duyet, 1=Da duyet, 2=Tu choi, 3=Dang muon, 4=Da tra
        ApprovedById UNIQUEIDENTIFIER NULL,
        ApprovedDate DATETIME2 NULL,
        RejectReason NVARCHAR(500) NULL,
        BorrowedDate DATETIME2 NULL,
        ReturnedDate DATETIME2 NULL,
        Note NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MedicalRecordBorrowRequests_Archives FOREIGN KEY (MedicalRecordArchiveId) REFERENCES MedicalRecordArchives(Id),
        CONSTRAINT FK_MedicalRecordBorrowRequests_RequestedBy FOREIGN KEY (RequestedById) REFERENCES Users(Id),
        CONSTRAINT FK_MedicalRecordBorrowRequests_ApprovedBy FOREIGN KEY (ApprovedById) REFERENCES Users(Id)
    );
    CREATE INDEX IX_MedicalRecordBorrowRequests_ArchiveId ON MedicalRecordBorrowRequests(MedicalRecordArchiveId);
    CREATE INDEX IX_MedicalRecordBorrowRequests_RequestedById ON MedicalRecordBorrowRequests(RequestedById);
    CREATE INDEX IX_MedicalRecordBorrowRequests_Status ON MedicalRecordBorrowRequests(Status);
    PRINT 'Created table MedicalRecordBorrowRequests';
END
ELSE
    PRINT 'Table MedicalRecordBorrowRequests already exists';
GO
