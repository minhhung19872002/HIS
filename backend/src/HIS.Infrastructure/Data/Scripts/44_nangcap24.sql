-- ============================================================
-- NangCap24 - HSMT BV Đa khoa
-- 7 tables (idempotent IF NOT EXISTS)
-- ============================================================

-- Gap #2 - WebAuthn biometric credentials
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BiometricCredentials')
BEGIN
    CREATE TABLE BiometricCredentials (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        PatientId uniqueidentifier NOT NULL,
        CredentialId nvarchar(500) NOT NULL,
        PublicKey nvarchar(max) NOT NULL,
        UserHandle nvarchar(200) NOT NULL,
        SignatureCounter bigint NOT NULL DEFAULT 0,
        AaGuid nvarchar(100) NULL,
        OwnerType nvarchar(30) NOT NULL DEFAULT 'patient',
        OwnerName nvarchar(200) NULL,
        DeviceName nvarchar(200) NULL,
        Status nvarchar(30) NOT NULL DEFAULT 'active',
        EnrolledAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        LastUsedAt datetime2 NULL,
        UsageCount int NOT NULL DEFAULT 0,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_BiometricCredentials_PatientId ON BiometricCredentials(PatientId);
    CREATE UNIQUE INDEX UX_BiometricCredentials_CredentialId ON BiometricCredentials(CredentialId);
END;
GO

-- Gap #2 - Biometric signature logs (audit)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BiometricSignatureLogs')
BEGIN
    CREATE TABLE BiometricSignatureLogs (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        CredentialId uniqueidentifier NOT NULL,
        PatientId uniqueidentifier NOT NULL,
        MedicalRecordId uniqueidentifier NULL,
        DocumentType nvarchar(100) NOT NULL,
        DocumentRef nvarchar(200) NOT NULL,
        ChallengeBase64 nvarchar(500) NOT NULL,
        ClientDataJsonBase64 nvarchar(max) NOT NULL,
        AuthenticatorDataBase64 nvarchar(max) NOT NULL,
        SignatureBase64 nvarchar(max) NOT NULL,
        IsVerified bit NOT NULL DEFAULT 0,
        VerifyError nvarchar(500) NULL,
        SignedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IpAddress nvarchar(50) NULL,
        MachineName nvarchar(100) NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_BiometricSignatureLogs_Patient_Doc ON BiometricSignatureLogs(PatientId, DocumentType);
    CREATE INDEX IX_BiometricSignatureLogs_SignedAt ON BiometricSignatureLogs(SignedAt DESC);
END;
GO

-- Gap #3 - BHXH Inspector accounts
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BhxhInspectorAccounts')
BEGIN
    CREATE TABLE BhxhInspectorAccounts (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        Username nvarchar(100) NOT NULL,
        PasswordHash nvarchar(500) NOT NULL,
        FullName nvarchar(200) NOT NULL,
        Email nvarchar(200) NULL,
        PhoneNumber nvarchar(50) NULL,
        BhxhCode nvarchar(50) NULL,
        Province nvarchar(100) NULL,
        IsActive bit NOT NULL DEFAULT 1,
        LastLoginAt datetime2 NULL,
        LastLoginIp nvarchar(50) NULL,
        LoginFailCount int NOT NULL DEFAULT 0,
        LockedUntil datetime2 NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_BhxhInspectorAccounts_Username ON BhxhInspectorAccounts(Username);
END;
GO

-- Gap #3 - Inspector access log
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BhxhInspectorAccessLogs')
BEGIN
    CREATE TABLE BhxhInspectorAccessLogs (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        InspectorAccountId uniqueidentifier NOT NULL,
        Action nvarchar(50) NOT NULL,
        MedicalRecordId uniqueidentifier NULL,
        ActionDetails nvarchar(max) NULL,
        IpAddress nvarchar(50) NULL,
        PerformedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_BhxhInspectorAccessLogs_Inspector ON BhxhInspectorAccessLogs(InspectorAccountId);
    CREATE INDEX IX_BhxhInspectorAccessLogs_Performed ON BhxhInspectorAccessLogs(PerformedAt DESC);
END;
GO

-- Gap #5 - EMR Cloud sync logs
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmrCloudSyncLogs')
BEGIN
    CREATE TABLE EmrCloudSyncLogs (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        MedicalRecordId uniqueidentifier NOT NULL,
        FileType nvarchar(50) NOT NULL,
        FileName nvarchar(500) NOT NULL,
        FileSizeBytes bigint NOT NULL,
        FileHash nvarchar(100) NULL,
        Destination nvarchar(50) NOT NULL,
        RemotePath nvarchar(500) NULL,
        Status nvarchar(20) NOT NULL DEFAULT 'pending',
        ErrorMessage nvarchar(max) NULL,
        StartedAt datetime2 NULL,
        CompletedAt datetime2 NULL,
        RetryCount int NOT NULL DEFAULT 0,
        LastRetryAt datetime2 NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_EmrCloudSyncLogs_Record ON EmrCloudSyncLogs(MedicalRecordId);
    CREATE INDEX IX_EmrCloudSyncLogs_Status ON EmrCloudSyncLogs(Status, CreatedAt DESC);
END;
GO

-- Gap #6 - DICOM auto-send rules
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DicomAutoSendRules')
BEGIN
    CREATE TABLE DicomAutoSendRules (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        RuleName nvarchar(200) NOT NULL,
        Modality nvarchar(20) NULL,
        SourceAeTitle nvarchar(50) NULL,
        DepartmentCode nvarchar(50) NULL,
        DestinationServerId uniqueidentifier NOT NULL,
        EncryptBeforeSend bit NOT NULL DEFAULT 0,
        EncryptionKeyId nvarchar(100) NULL,
        TriggerType nvarchar(30) NOT NULL DEFAULT 'on_arrival',
        ScheduleCron nvarchar(100) NULL,
        Priority int NOT NULL DEFAULT 5,
        IsActive bit NOT NULL DEFAULT 1,
        LastTriggeredAt datetime2 NULL,
        TimesTriggered int NOT NULL DEFAULT 0,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_DicomAutoSendRules_Active ON DicomAutoSendRules(IsActive, Priority);
END;
GO

-- Gap #6 - DICOM transmission logs
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DicomTransmissionLogs')
BEGIN
    CREATE TABLE DicomTransmissionLogs (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        StudyInstanceUid nvarchar(100) NOT NULL,
        DicomStudyId uniqueidentifier NULL,
        AutoSendRuleId uniqueidentifier NULL,
        DestinationServerId uniqueidentifier NOT NULL,
        DestinationName nvarchar(200) NOT NULL,
        TriggerType nvarchar(30) NOT NULL DEFAULT 'manual',
        InstanceCount int NOT NULL DEFAULT 0,
        TotalBytes bigint NOT NULL DEFAULT 0,
        WasEncrypted bit NOT NULL DEFAULT 0,
        EncryptionAlgorithm nvarchar(50) NULL,
        Status nvarchar(20) NOT NULL DEFAULT 'pending',
        ErrorMessage nvarchar(max) NULL,
        StartedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CompletedAt datetime2 NULL,
        DurationMs int NOT NULL DEFAULT 0,
        TriggeredByUserId uniqueidentifier NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_DicomTransmissionLogs_Study ON DicomTransmissionLogs(StudyInstanceUid);
    CREATE INDEX IX_DicomTransmissionLogs_Status ON DicomTransmissionLogs(Status, StartedAt DESC);
END;
GO

-- Gap #8 - HL7 message retry queue
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Hl7MessageQueues')
BEGIN
    CREATE TABLE Hl7MessageQueues (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        Direction nvarchar(20) NOT NULL,
        SourceSystem nvarchar(20) NOT NULL,
        TargetSystem nvarchar(20) NOT NULL,
        MessageType nvarchar(20) NOT NULL,
        MessageControlId nvarchar(100) NOT NULL,
        Payload nvarchar(max) NOT NULL,
        Status nvarchar(20) NOT NULL DEFAULT 'pending',
        RetryCount int NOT NULL DEFAULT 0,
        MaxRetries int NOT NULL DEFAULT 5,
        AckMessage nvarchar(max) NULL,
        ErrorMessage nvarchar(max) NULL,
        FirstTryAt datetime2 NULL,
        LastTryAt datetime2 NULL,
        NextRetryAt datetime2 NULL,
        AckedAt datetime2 NULL,
        RelatedRecordId uniqueidentifier NULL,
        Endpoint nvarchar(500) NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_Hl7MessageQueues_Status ON Hl7MessageQueues(Status, NextRetryAt);
    CREATE INDEX IX_Hl7MessageQueues_Type ON Hl7MessageQueues(MessageType, Direction);
    CREATE INDEX IX_Hl7MessageQueues_CreatedAt ON Hl7MessageQueues(CreatedAt DESC);
END;
GO

-- Gap #9 - DICOM study activity logs
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DicomStudyActivityLogs')
BEGIN
    CREATE TABLE DicomStudyActivityLogs (
        Id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        StudyInstanceUid nvarchar(100) NOT NULL,
        DicomStudyId uniqueidentifier NULL,
        RadiologyRequestId uniqueidentifier NULL,
        Action nvarchar(50) NOT NULL,
        ActionDetails nvarchar(max) NULL,
        PerformedByUserId uniqueidentifier NULL,
        PerformedByName nvarchar(200) NULL,
        MachineName nvarchar(100) NULL,
        IpAddress nvarchar(50) NULL,
        PerformedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        RelatedReportId nvarchar(100) NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(450) NULL,
        UpdatedAt datetime2 NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_DicomStudyActivityLogs_Study ON DicomStudyActivityLogs(StudyInstanceUid, PerformedAt DESC);
    CREATE INDEX IX_DicomStudyActivityLogs_Request ON DicomStudyActivityLogs(RadiologyRequestId);
    CREATE INDEX IX_DicomStudyActivityLogs_Action ON DicomStudyActivityLogs(Action, PerformedAt DESC);
END;
GO

-- Seed BHXH inspector demo
IF NOT EXISTS (SELECT 1 FROM BhxhInspectorAccounts WHERE Username = 'inspector')
BEGIN
    -- PasswordHash for "Inspector@123" via BCrypt
    INSERT INTO BhxhInspectorAccounts
        (Id, Username, PasswordHash, FullName, Email, BhxhCode, Province, IsActive)
    VALUES
        (NEWID(),
         'inspector',
         '$2a$11$4I/jQdYCNho6SXgW1MflXeNp59EZDwO/AJLnoOT7D.tq2OKyL0.1q',  -- Inspector@123 (BCrypt verified)
         N'Nguyễn Văn Giám Định',
         'inspector.demo@bhxh.gov.vn',
         'BHXH-GD-001',
         N'Hà Nội',
         1);
END;
GO

-- Fix hash seed inspector sai (đã deploy trước): chỉ cập nhật row CÒN hash cũ sai,
-- KHÔNG đụng tài khoản đã đổi mật khẩu thủ công. Idempotent.
UPDATE BhxhInspectorAccounts
   SET PasswordHash = '$2a$11$4I/jQdYCNho6SXgW1MflXeNp59EZDwO/AJLnoOT7D.tq2OKyL0.1q'
 WHERE Username = 'inspector'
   AND PasswordHash = '$2a$11$Lp3wAjcrhhPHLpkLPnxXMOEcA4Q1mzPgM.dVrwUFLLrxxYbqGzlye';
GO
