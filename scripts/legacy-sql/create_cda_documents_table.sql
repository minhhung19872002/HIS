-- Create CdaDocuments table for HL7 CDA R2 document storage
-- Idempotent: uses IF NOT EXISTS

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CdaDocuments')
BEGIN
    CREATE TABLE CdaDocuments (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        DocumentId NVARCHAR(200) NOT NULL,
        DocumentType INT NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        MedicalRecordId UNIQUEIDENTIFIER NULL,
        SourceEntityId UNIQUEIDENTIFIER NULL,
        CdaXml NVARCHAR(MAX) NOT NULL,
        Status INT NOT NULL DEFAULT 0,
        IsSigned BIT NOT NULL DEFAULT 0,
        SignedByUserId UNIQUEIDENTIFIER NULL,
        SignedAt DATETIME2 NULL,
        ValidationErrors NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_CdaDocuments_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_CdaDocuments_Users FOREIGN KEY (SignedByUserId) REFERENCES Users(Id)
    );

    CREATE INDEX IX_CdaDocuments_PatientId ON CdaDocuments(PatientId);
    CREATE INDEX IX_CdaDocuments_DocumentType ON CdaDocuments(DocumentType);
    CREATE INDEX IX_CdaDocuments_Status ON CdaDocuments(Status);
    CREATE INDEX IX_CdaDocuments_CreatedAt ON CdaDocuments(CreatedAt);

    PRINT 'Created CdaDocuments table with indexes';
END
ELSE
BEGIN
    PRINT 'CdaDocuments table already exists';
END
GO
