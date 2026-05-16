-- NangCap6: Central Signing tables (BV Xanh Pon)
-- ManagedCertificates, SigningTransactions, SigningTotpSecrets

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ManagedCertificates')
BEGIN
    CREATE TABLE ManagedCertificates (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SerialNumber NVARCHAR(200) NOT NULL,
        SubjectName NVARCHAR(500) NOT NULL,
        IssuerName NVARCHAR(500) NOT NULL,
        CaProvider NVARCHAR(100) NOT NULL,
        ValidFrom DATETIME2 NOT NULL,
        ValidTo DATETIME2 NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        OwnerUserId UNIQUEIDENTIFIER NULL,
        Cccd NVARCHAR(20) NULL,
        SignatureImagePath NVARCHAR(500) NULL,
        StorageType NVARCHAR(50) NOT NULL DEFAULT 'Token',
        StorageIdentifier NVARCHAR(200) NULL,
        CertificateData NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ManagedCertificates_Users FOREIGN KEY (OwnerUserId) REFERENCES Users(Id)
    );
    CREATE INDEX IX_ManagedCertificates_Serial ON ManagedCertificates(SerialNumber);
    CREATE INDEX IX_ManagedCertificates_Owner ON ManagedCertificates(OwnerUserId);
    CREATE INDEX IX_ManagedCertificates_Cccd ON ManagedCertificates(Cccd);
    CREATE INDEX IX_ManagedCertificates_Active ON ManagedCertificates(IsActive, ValidTo);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SigningTransactions')
BEGIN
    CREATE TABLE SigningTransactions (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL,
        Action NVARCHAR(50) NOT NULL,
        DataType NVARCHAR(20) NOT NULL,
        Success BIT NOT NULL,
        ErrorMessage NVARCHAR(1000) NULL,
        CertificateSerial NVARCHAR(200) NULL,
        CaProvider NVARCHAR(100) NULL,
        HashAlgorithm NVARCHAR(20) NULL,
        DataSizeBytes BIGINT NOT NULL DEFAULT 0,
        DurationMs INT NOT NULL DEFAULT 0,
        IpAddress NVARCHAR(50) NULL,
        Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SigningTransactions_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    CREATE INDEX IX_SigningTransactions_Timestamp ON SigningTransactions(Timestamp DESC);
    CREATE INDEX IX_SigningTransactions_User ON SigningTransactions(UserId, Timestamp DESC);
    CREATE INDEX IX_SigningTransactions_Action ON SigningTransactions(Action, DataType);
    CREATE INDEX IX_SigningTransactions_Success ON SigningTransactions(Success, Timestamp DESC);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SigningTotpSecrets')
BEGIN
    CREATE TABLE SigningTotpSecrets (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL,
        SecretKey NVARCHAR(200) NOT NULL,
        IsEnabled BIT NOT NULL DEFAULT 0,
        LastVerifiedAt DATETIME2 NULL,
        FailedAttempts INT NOT NULL DEFAULT 0,
        LockedUntil DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SigningTotpSecrets_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    CREATE UNIQUE INDEX IX_SigningTotpSecrets_User ON SigningTotpSecrets(UserId);
END;

-- SystemConfigs table (used by appearance config)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemConfigs')
BEGIN
    CREATE TABLE SystemConfigs (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ConfigKey NVARCHAR(200) NOT NULL,
        ConfigValue NVARCHAR(MAX) NOT NULL,
        ConfigType NVARCHAR(50) NOT NULL DEFAULT 'String',
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IX_SystemConfigs_Key ON SystemConfigs(ConfigKey);
END;

PRINT 'NangCap6 Central Signing tables created successfully';
