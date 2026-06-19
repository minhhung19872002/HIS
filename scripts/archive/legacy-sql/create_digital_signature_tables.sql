-- Digital Signature tables for PKCS#11 USB Token signing
-- Idempotent: uses IF NOT EXISTS

USE HIS;
GO

-- DocumentSignatures: Cross-module signature tracking
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DocumentSignatures')
BEGIN
    CREATE TABLE DocumentSignatures (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        DocumentId UNIQUEIDENTIFIER NOT NULL,
        DocumentType NVARCHAR(50) NOT NULL,
        DocumentCode NVARCHAR(100) NOT NULL DEFAULT '',
        SignedByUserId UNIQUEIDENTIFIER NOT NULL,
        SignedAt DATETIME2 NOT NULL,
        CertificateSubject NVARCHAR(500) NOT NULL DEFAULT '',
        CertificateIssuer NVARCHAR(500) NOT NULL DEFAULT '',
        CertificateSerial NVARCHAR(200) NOT NULL DEFAULT '',
        CertificateValidFrom DATETIME2 NOT NULL,
        CertificateValidTo DATETIME2 NOT NULL,
        CaProvider NVARCHAR(50) NOT NULL DEFAULT '',
        TokenSerial NVARCHAR(100) NOT NULL DEFAULT '',
        TsaTimestamp NVARCHAR(100) NULL,
        TsaUrl NVARCHAR(500) NULL,
        OcspStatus NVARCHAR(50) NULL,
        OcspCheckedAt DATETIME2 NULL,
        SignatureValue NVARCHAR(MAX) NOT NULL DEFAULT '',
        SignedDocumentPath NVARCHAR(500) NULL,
        HashAlgorithm NVARCHAR(20) NOT NULL DEFAULT 'SHA-256',
        Status INT NOT NULL DEFAULT 0,
        RevokeReason NVARCHAR(500) NULL,
        RevokedAt DATETIME2 NULL,
        RevokedByUserId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_DocumentSignatures_DocumentId_DocumentType ON DocumentSignatures(DocumentId, DocumentType);
    CREATE INDEX IX_DocumentSignatures_SignedByUserId ON DocumentSignatures(SignedByUserId);

    PRINT 'Created DocumentSignatures table';
END
GO

-- TokenUserMappings: Maps physical USB Token to user accounts
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TokenUserMappings')
BEGIN
    CREATE TABLE TokenUserMappings (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TokenSerial NVARCHAR(100) NOT NULL,
        TokenLabel NVARCHAR(200) NOT NULL DEFAULT '',
        CaProvider NVARCHAR(50) NOT NULL DEFAULT '',
        UserId UNIQUEIDENTIFIER NOT NULL,
        FirstRegisteredAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        LastUsedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IX_TokenUserMappings_TokenSerial ON TokenUserMappings(TokenSerial);

    PRINT 'Created TokenUserMappings table';
END
GO
