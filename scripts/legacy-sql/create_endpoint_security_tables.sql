-- NangCap12: Endpoint Security Tables
-- BV Phuc hoi chuc nang Dong Thap - An toan thong tin

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WebAuthnCredentials')
BEGIN
    CREATE TABLE WebAuthnCredentials (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL,
        CredentialId NVARCHAR(500) NOT NULL,
        PublicKey NVARCHAR(MAX) NOT NULL,
        DeviceName NVARCHAR(200) NOT NULL DEFAULT '',
        CredentialType NVARCHAR(50) DEFAULT 'public-key',
        SignCount BIGINT DEFAULT 0,
        AaGuid NVARCHAR(100) NULL,
        IsActive BIT DEFAULT 1,
        LastUsedAt DATETIME2 DEFAULT GETUTCDATE(),
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_WebAuthnCredentials_UserId ON WebAuthnCredentials(UserId);
    CREATE INDEX IX_WebAuthnCredentials_CredentialId ON WebAuthnCredentials(CredentialId);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EndpointDevices')
BEGIN
    CREATE TABLE EndpointDevices (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Hostname NVARCHAR(200) NOT NULL,
        IpAddress NVARCHAR(50) NULL,
        MacAddress NVARCHAR(50) NULL,
        OperatingSystem NVARCHAR(100) NULL,
        OsVersion NVARCHAR(100) NULL,
        AntivirusName NVARCHAR(200) NULL,
        AntivirusStatus NVARCHAR(50) NULL,
        AntivirusLastUpdate DATETIME2 NULL,
        DepartmentName NVARCHAR(200) NULL,
        AssignedUser NVARCHAR(200) NULL,
        Status INT DEFAULT 0,
        LastSeenAt DATETIME2 NULL,
        AgentVersion NVARCHAR(50) NULL,
        IsCompliant BIT DEFAULT 1,
        ComplianceNotes NVARCHAR(500) NULL,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_EndpointDevices_Status ON EndpointDevices(Status);
    CREATE INDEX IX_EndpointDevices_Hostname ON EndpointDevices(Hostname);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SecurityIncidents')
BEGIN
    CREATE TABLE SecurityIncidents (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        IncidentCode NVARCHAR(50) NOT NULL,
        Title NVARCHAR(500) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Severity INT DEFAULT 3,
        Status INT DEFAULT 0,
        Category NVARCHAR(50) NULL,
        DeviceId UNIQUEIDENTIFIER NULL,
        DeviceHostname NVARCHAR(200) NULL,
        AffectedSystem NVARCHAR(200) NULL,
        ReportedByName NVARCHAR(200) NULL,
        AssignedToId UNIQUEIDENTIFIER NULL,
        AssignedToName NVARCHAR(200) NULL,
        Resolution NVARCHAR(MAX) NULL,
        ResolvedAt DATETIME2 NULL,
        ContainedAt DATETIME2 NULL,
        RootCause NVARCHAR(MAX) NULL,
        CorrectiveAction NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_SecurityIncidents_Status ON SecurityIncidents(Status);
    CREATE INDEX IX_SecurityIncidents_Severity ON SecurityIncidents(Severity);
    CREATE INDEX IX_SecurityIncidents_CreatedAt ON SecurityIncidents(CreatedAt DESC);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InstalledSoftwareItems')
BEGIN
    CREATE TABLE InstalledSoftwareItems (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        DeviceId UNIQUEIDENTIFIER NOT NULL,
        SoftwareName NVARCHAR(300) NOT NULL,
        Version NVARCHAR(100) NULL,
        Publisher NVARCHAR(200) NULL,
        InstallDate DATETIME2 NULL,
        IsAuthorized BIT DEFAULT 1,
        Category NVARCHAR(50) NULL,
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_InstalledSoftwareItems_DeviceId ON InstalledSoftwareItems(DeviceId);
    CREATE INDEX IX_InstalledSoftwareItems_IsAuthorized ON InstalledSoftwareItems(IsAuthorized);
END

PRINT 'NangCap12: Endpoint Security tables created successfully';
