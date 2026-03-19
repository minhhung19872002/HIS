-- Signing Workflow (Trinh ky) - NangCap10 EMR #44
-- Luong trinh ky tai lieu y te: phieu dieu tri, cham soc, don thuoc, v.v.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SigningRequests')
CREATE TABLE SigningRequests (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DocumentType NVARCHAR(100) NOT NULL,
    DocumentId UNIQUEIDENTIFIER NOT NULL,
    DocumentTitle NVARCHAR(500) NOT NULL,
    DocumentContent NVARCHAR(MAX),
    SubmittedById UNIQUEIDENTIFIER NOT NULL,
    SubmittedByName NVARCHAR(200) NOT NULL,
    AssignedToId UNIQUEIDENTIFIER NOT NULL,
    AssignedToName NVARCHAR(200) NOT NULL,
    Status INT NOT NULL DEFAULT 0,
    RejectReason NVARCHAR(1000),
    SignedAt DATETIME2,
    SignatureData NVARCHAR(MAX),
    PatientId UNIQUEIDENTIFIER,
    PatientName NVARCHAR(200),
    DepartmentName NVARCHAR(200),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CreatedBy UNIQUEIDENTIFIER,
    UpdatedAt DATETIME2,
    UpdatedBy UNIQUEIDENTIFIER,
    IsDeleted BIT NOT NULL DEFAULT 0
);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SigningRequests_Status')
    CREATE INDEX IX_SigningRequests_Status ON SigningRequests(Status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SigningRequests_AssignedToId')
    CREATE INDEX IX_SigningRequests_AssignedToId ON SigningRequests(AssignedToId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SigningRequests_SubmittedById')
    CREATE INDEX IX_SigningRequests_SubmittedById ON SigningRequests(SubmittedById);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SigningRequests_DocumentType')
    CREATE INDEX IX_SigningRequests_DocumentType ON SigningRequests(DocumentType);

PRINT 'SigningRequests table created successfully';
