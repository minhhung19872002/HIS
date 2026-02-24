-- Add missing RIS/PACS tables
-- Generated from migration: AddRISCompleteTables

-- 1. RadiologyTags
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyTags')
BEGIN
    CREATE TABLE RadiologyTags (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Code NVARCHAR(100) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Color NVARCHAR(20) NULL,
        ParentId UNIQUEIDENTIFIER NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyTags_Parent FOREIGN KEY (ParentId) REFERENCES RadiologyTags(Id)
    );
    PRINT 'Created RadiologyTags table';
END
GO

-- 2. RadiologyRequestTags
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyRequestTags')
BEGIN
    CREATE TABLE RadiologyRequestTags (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        RadiologyRequestId UNIQUEIDENTIFIER NOT NULL,
        TagId UNIQUEIDENTIFIER NOT NULL,
        Note NVARCHAR(MAX) NULL,
        AddedByUserId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyRequestTags_Request FOREIGN KEY (RadiologyRequestId) REFERENCES RadiologyRequests(Id),
        CONSTRAINT FK_RadiologyRequestTags_Tag FOREIGN KEY (TagId) REFERENCES RadiologyTags(Id),
        CONSTRAINT FK_RadiologyRequestTags_User FOREIGN KEY (AddedByUserId) REFERENCES Users(Id)
    );
    PRINT 'Created RadiologyRequestTags table';
END
GO

-- 3. RadiologyDutySchedules
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyDutySchedules')
BEGIN
    CREATE TABLE RadiologyDutySchedules (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        DepartmentId UNIQUEIDENTIFIER NOT NULL,
        RoomId UNIQUEIDENTIFIER NULL,
        DutyDate DATETIME2 NOT NULL,
        ShiftType INT NOT NULL,
        StartTime TIME NOT NULL,
        EndTime TIME NOT NULL,
        DoctorId UNIQUEIDENTIFIER NULL,
        TechnicianId UNIQUEIDENTIFIER NULL,
        AssistantTechnicianId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,
        ApprovedBy UNIQUEIDENTIFIER NULL,
        ApprovedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyDutySchedules_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_RadiologyDutySchedules_Room FOREIGN KEY (RoomId) REFERENCES Rooms(Id),
        CONSTRAINT FK_RadiologyDutySchedules_Doctor FOREIGN KEY (DoctorId) REFERENCES Users(Id),
        CONSTRAINT FK_RadiologyDutySchedules_Technician FOREIGN KEY (TechnicianId) REFERENCES Users(Id),
        CONSTRAINT FK_RadiologyDutySchedules_AssistantTechnician FOREIGN KEY (AssistantTechnicianId) REFERENCES Users(Id)
    );
    PRINT 'Created RadiologyDutySchedules table';
END
GO

-- 4. RadiologyIntegrationLogs
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyIntegrationLogs')
BEGIN
    CREATE TABLE RadiologyIntegrationLogs (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        LogCode NVARCHAR(100) NOT NULL,
        Direction NVARCHAR(50) NOT NULL,
        MessageType NVARCHAR(100) NOT NULL,
        RadiologyRequestId UNIQUEIDENTIFIER NULL,
        PatientCode NVARCHAR(50) NULL,
        MedicalRecordCode NVARCHAR(50) NULL,
        RequestCode NVARCHAR(50) NULL,
        SentAt DATETIME2 NOT NULL,
        RequestPayload NVARCHAR(MAX) NULL,
        ResponsePayload NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,
        ErrorMessage NVARCHAR(MAX) NULL,
        RetryCount INT NOT NULL DEFAULT 0,
        LastRetryAt DATETIME2 NULL,
        SourceSystem NVARCHAR(100) NULL,
        TargetSystem NVARCHAR(100) NULL,
        TransactionId NVARCHAR(100) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyIntegrationLogs_Request FOREIGN KEY (RadiologyRequestId) REFERENCES RadiologyRequests(Id)
    );
    PRINT 'Created RadiologyIntegrationLogs table';
END
GO

-- 5. RadiologyDigitalSignatureConfigs
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyDigitalSignatureConfigs')
BEGIN
    CREATE TABLE RadiologyDigitalSignatureConfigs (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        SignatureType NVARCHAR(50) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        ProviderUrl NVARCHAR(500) NULL,
        ApiKey NVARCHAR(500) NULL,
        ApiSecret NVARCHAR(500) NULL,
        CertificatePath NVARCHAR(500) NULL,
        CertificatePassword NVARCHAR(500) NULL,
        IsDefault BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        ConfigJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created RadiologyDigitalSignatureConfigs table';
END
GO

-- 6. RadiologySignatureHistories
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologySignatureHistories')
BEGIN
    CREATE TABLE RadiologySignatureHistories (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        RadiologyReportId UNIQUEIDENTIFIER NOT NULL,
        SignedByUserId UNIQUEIDENTIFIER NOT NULL,
        SignatureType NVARCHAR(50) NOT NULL,
        SignedAt DATETIME2 NOT NULL,
        CertificateSerial NVARCHAR(100) NULL,
        CertificateSubject NVARCHAR(500) NULL,
        CertificateIssuer NVARCHAR(500) NULL,
        CertificateValidFrom DATETIME2 NULL,
        CertificateValidTo DATETIME2 NULL,
        SignatureValue NVARCHAR(MAX) NULL,
        SignedDocumentPath NVARCHAR(500) NULL,
        Status INT NOT NULL DEFAULT 0,
        RejectReason NVARCHAR(MAX) NULL,
        TransactionId NVARCHAR(100) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologySignatureHistories_Report FOREIGN KEY (RadiologyReportId) REFERENCES RadiologyReports(Id),
        CONSTRAINT FK_RadiologySignatureHistories_User FOREIGN KEY (SignedByUserId) REFERENCES Users(Id)
    );
    PRINT 'Created RadiologySignatureHistories table';
END
GO

-- 7. RadiologyDiagnosisTemplates
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyDiagnosisTemplates')
BEGIN
    CREATE TABLE RadiologyDiagnosisTemplates (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Code NVARCHAR(100) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Conclusion NVARCHAR(MAX) NULL,
        Recommendation NVARCHAR(MAX) NULL,
        ServiceTypeId UNIQUEIDENTIFIER NULL,
        ServiceId UNIQUEIDENTIFIER NULL,
        Gender NVARCHAR(10) NULL,
        MinAge INT NULL,
        MaxAge INT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsDefault BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedByUserId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyDiagnosisTemplates_Service FOREIGN KEY (ServiceId) REFERENCES Services(Id),
        CONSTRAINT FK_RadiologyDiagnosisTemplates_User FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id)
    );
    PRINT 'Created RadiologyDiagnosisTemplates table';
END
GO

-- 8. RadiologyAbbreviations
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyAbbreviations')
BEGIN
    CREATE TABLE RadiologyAbbreviations (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Abbreviation NVARCHAR(50) NOT NULL,
        FullText NVARCHAR(MAX) NOT NULL,
        Category NVARCHAR(100) NULL,
        ServiceTypeId UNIQUEIDENTIFIER NULL,
        IsGlobal BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedByUserId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyAbbreviations_User FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id)
    );
    PRINT 'Created RadiologyAbbreviations table';
END
GO

-- 9. RadiologyCaptureDevices
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyCaptureDevices')
BEGIN
    CREATE TABLE RadiologyCaptureDevices (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        DeviceCode NVARCHAR(100) NOT NULL,
        DeviceName NVARCHAR(255) NOT NULL,
        DeviceType NVARCHAR(100) NOT NULL,
        Manufacturer NVARCHAR(255) NULL,
        Model NVARCHAR(255) NULL,
        SerialNumber NVARCHAR(100) NULL,
        RoomId UNIQUEIDENTIFIER NULL,
        ConnectionType NVARCHAR(50) NOT NULL DEFAULT 'TCP',
        IpAddress NVARCHAR(50) NULL,
        Port INT NULL,
        ComPort NVARCHAR(20) NULL,
        BaudRate INT NULL,
        FolderPath NVARCHAR(500) NULL,
        AETitle NVARCHAR(50) NULL,
        SupportsDicom BIT NOT NULL DEFAULT 0,
        SupportsWorklist BIT NOT NULL DEFAULT 0,
        SupportsMPPS BIT NOT NULL DEFAULT 0,
        MaxExamsPerDay INT NOT NULL DEFAULT 100,
        AutoSelectThumbnail BIT NOT NULL DEFAULT 1,
        SendOnlyThumbnail BIT NOT NULL DEFAULT 0,
        DefaultFrameFormat NVARCHAR(50) NULL,
        VideoFormat NVARCHAR(50) DEFAULT 'MP4',
        Status INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        LastCommunication DATETIME2 NULL,
        ConfigJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyCaptureDevices_Room FOREIGN KEY (RoomId) REFERENCES Rooms(Id)
    );
    PRINT 'Created RadiologyCaptureDevices table';
END
GO

-- 10. RadiologyWorkstations
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyWorkstations')
BEGIN
    CREATE TABLE RadiologyWorkstations (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        WorkstationCode NVARCHAR(100) NOT NULL,
        WorkstationName NVARCHAR(255) NOT NULL,
        ComputerName NVARCHAR(255) NULL,
        IpAddress NVARCHAR(50) NULL,
        RoomId UNIQUEIDENTIFIER NULL,
        DefaultDeviceId UNIQUEIDENTIFIER NULL,
        HotkeysConfig NVARCHAR(MAX) NULL,
        BrightnessLevel INT NULL,
        ContrastLevel INT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyWorkstations_Room FOREIGN KEY (RoomId) REFERENCES Rooms(Id),
        CONSTRAINT FK_RadiologyWorkstations_Device FOREIGN KEY (DefaultDeviceId) REFERENCES RadiologyCaptureDevices(Id)
    );
    PRINT 'Created RadiologyWorkstations table';
END
GO

-- 11. RadiologyConsultationSessions
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyConsultationSessions')
BEGIN
    CREATE TABLE RadiologyConsultationSessions (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        SessionCode NVARCHAR(100) NOT NULL,
        Title NVARCHAR(500) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        ScheduledStartTime DATETIME2 NOT NULL,
        ScheduledEndTime DATETIME2 NOT NULL,
        ActualStartTime DATETIME2 NULL,
        ActualEndTime DATETIME2 NULL,
        OrganizerId UNIQUEIDENTIFIER NOT NULL,
        LeaderId UNIQUEIDENTIFIER NULL,
        SecretaryId UNIQUEIDENTIFIER NULL,
        Status INT NOT NULL DEFAULT 0,
        MeetingUrl NVARCHAR(500) NULL,
        QRCodeData NVARCHAR(MAX) NULL,
        RecordingPath NVARCHAR(500) NULL,
        IsRecording BIT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyConsultationSessions_Organizer FOREIGN KEY (OrganizerId) REFERENCES Users(Id),
        CONSTRAINT FK_RadiologyConsultationSessions_Leader FOREIGN KEY (LeaderId) REFERENCES Users(Id),
        CONSTRAINT FK_RadiologyConsultationSessions_Secretary FOREIGN KEY (SecretaryId) REFERENCES Users(Id)
    );
    PRINT 'Created RadiologyConsultationSessions table';
END
GO

-- 12. RadiologyHL7CDAConfigs
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyHL7CDAConfigs')
BEGIN
    CREATE TABLE RadiologyHL7CDAConfigs (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        ConfigName NVARCHAR(255) NOT NULL,
        HL7Version NVARCHAR(20) NOT NULL DEFAULT '2.5',
        CDAVersion NVARCHAR(20) NOT NULL DEFAULT 'R2',
        SendingApplication NVARCHAR(100) NOT NULL,
        SendingFacility NVARCHAR(100) NOT NULL,
        ReceivingApplication NVARCHAR(100) NOT NULL,
        ReceivingFacility NVARCHAR(100) NOT NULL,
        ConnectionType NVARCHAR(50) NOT NULL DEFAULT 'MLLP',
        ServerAddress NVARCHAR(255) NULL,
        ServerPort INT NULL,
        FilePath NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        ConfigJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created RadiologyHL7CDAConfigs table';
END
GO

-- 13. RadiologyHelpCategories
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyHelpCategories')
BEGIN
    CREATE TABLE RadiologyHelpCategories (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Code NVARCHAR(100) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        IconClass NVARCHAR(100) NULL,
        ParentId UNIQUEIDENTIFIER NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyHelpCategories_Parent FOREIGN KEY (ParentId) REFERENCES RadiologyHelpCategories(Id)
    );
    PRINT 'Created RadiologyHelpCategories table';
END
GO

-- 14. RadiologyHelpArticles
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyHelpArticles')
BEGIN
    CREATE TABLE RadiologyHelpArticles (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        CategoryId UNIQUEIDENTIFIER NOT NULL,
        Title NVARCHAR(500) NOT NULL,
        Summary NVARCHAR(MAX) NULL,
        Content NVARCHAR(MAX) NOT NULL,
        VideoUrl NVARCHAR(500) NULL,
        ArticleType NVARCHAR(50) NOT NULL DEFAULT 'Guide',
        SortOrder INT NOT NULL DEFAULT 0,
        ViewCount INT NOT NULL DEFAULT 0,
        IsPublished BIT NOT NULL DEFAULT 1,
        CreatedByUserId UNIQUEIDENTIFIER NULL,
        PublishedAt DATETIME2 NULL,
        Tags NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyHelpArticles_Category FOREIGN KEY (CategoryId) REFERENCES RadiologyHelpCategories(Id),
        CONSTRAINT FK_RadiologyHelpArticles_User FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id)
    );
    PRINT 'Created RadiologyHelpArticles table';
END
GO

-- 15. RadiologyTroubleshootings
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyTroubleshootings')
BEGIN
    CREATE TABLE RadiologyTroubleshootings (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        ErrorCode NVARCHAR(100) NOT NULL,
        ErrorTitle NVARCHAR(500) NOT NULL,
        ErrorDescription NVARCHAR(MAX) NULL,
        Symptoms NVARCHAR(MAX) NULL,
        Causes NVARCHAR(MAX) NULL,
        Solution NVARCHAR(MAX) NOT NULL,
        RelatedModule NVARCHAR(100) NULL,
        Severity INT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created RadiologyTroubleshootings table';
END
GO

-- 16. RadiologyCLSScreenConfigs
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RadiologyCLSScreenConfigs')
BEGIN
    CREATE TABLE RadiologyCLSScreenConfigs (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        DefaultFilters NVARCHAR(MAX) NULL,
        ColumnSettings NVARCHAR(MAX) NULL,
        PageSize INT NOT NULL DEFAULT 20,
        AutoLoadTemplate BIT NOT NULL DEFAULT 1,
        ShowPatientHistory BIT NOT NULL DEFAULT 1,
        EnableShortcuts BIT NOT NULL DEFAULT 1,
        CustomSettings NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(255) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyCLSScreenConfigs_User FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    PRINT 'Created RadiologyCLSScreenConfigs table';
END
GO

PRINT 'All RIS tables created successfully!';
