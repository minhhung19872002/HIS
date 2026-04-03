-- Create 3 missing RIS tables for Playwright tests
-- These tables were defined in EF Core migrations but never created in the DB

-- 1. RadiologyLabelConfigs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RadiologyLabelConfigs')
BEGIN
    CREATE TABLE RadiologyLabelConfigs (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Name NVARCHAR(MAX) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        LabelWidth INT NOT NULL,
        LabelHeight INT NOT NULL,
        TemplateHtml NVARCHAR(MAX) NULL,
        TemplateZpl NVARCHAR(MAX) NULL,
        IncludeQRCode BIT NOT NULL,
        IncludeBarcode BIT NOT NULL,
        BarcodeFormat NVARCHAR(MAX) NULL,
        ServiceTypeId UNIQUEIDENTIFIER NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        IsDefault BIT NOT NULL,
        IsActive BIT NOT NULL,
        CreatedAt DATETIME2 NOT NULL,
        CreatedBy NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(MAX) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    -- Seed default config
    INSERT INTO RadiologyLabelConfigs (Id, Name, Description, LabelWidth, LabelHeight, TemplateHtml, TemplateZpl, IncludeQRCode, IncludeBarcode, BarcodeFormat, ServiceTypeId, DepartmentId, IsDefault, IsActive, CreatedAt, IsDeleted)
    VALUES
        (NEWID(), 'Mặc định', 'Cấu hình nhãn mặc định cho tất cả loại dịch vụ', 100, 50, '<div>{{PatientName}}</div><div>{{AccessionNumber}}</div>', '^XA^FO10,10^BY3^BQN,2,6^FDQA,{{AccessionNumber}}^FS^XZ', 1, 1, 'QR', NULL, NULL, 1, 1, GETDATE(), 0),
        (NEWID(), 'CT Scan', 'Nhãn cho chụp CT', 120, 60, '<div>CT: {{ServiceName}}</div><div>{{PatientName}}</div><div>{{AccessionNumber}}</div>', '^XA^FO10,10^BY3^BQN,2,6^FDQA,{{AccessionNumber}}^FS^XZ', 1, 1, 'QR', NULL, NULL, 0, 1, GETDATE(), 0),
        (NEWID(), 'X-Quang', 'Nhãn cho chụp X-Quang thường', 100, 50, '<div>XQ: {{ServiceName}}</div><div>{{PatientName}}</div><div>{{AccessionNumber}}</div>', '^XA^FO10,10^BY2^BC^FD{{AccessionNumber}}^FS^XZ', 1, 1, 'CODE128', NULL, NULL, 0, 1, GETDATE(), 0);
END
PRINT 'RadiologyLabelConfigs: OK';

-- 2. RadiologyConsultationCases
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RadiologyConsultationCases')
BEGIN
    CREATE TABLE RadiologyConsultationCases (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        SessionId UNIQUEIDENTIFIER NOT NULL,
        RadiologyRequestId UNIQUEIDENTIFIER NOT NULL,
        OrderNumber INT NOT NULL,
        Reason NVARCHAR(MAX) NULL,
        PreliminaryDiagnosis NVARCHAR(MAX) NULL,
        Status INT NOT NULL,
        Conclusion NVARCHAR(MAX) NULL,
        Recommendation NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL,
        CreatedBy NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(MAX) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyConsultationCases_Sessions FOREIGN KEY (SessionId) REFERENCES RadiologyConsultationSessions(Id) ON DELETE CASCADE,
        CONSTRAINT FK_RadiologyConsultationCases_Requests FOREIGN KEY (RadiologyRequestId) REFERENCES RadiologyRequests(Id)
    );
    CREATE INDEX IX_RadiologyConsultationCases_SessionId ON RadiologyConsultationCases(SessionId);
    CREATE INDEX IX_RadiologyConsultationCases_RadiologyRequestId ON RadiologyConsultationCases(RadiologyRequestId);
END
PRINT 'RadiologyConsultationCases: OK';

-- 3. RadiologyHL7Messages
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RadiologyHL7Messages')
BEGIN
    CREATE TABLE RadiologyHL7Messages (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        MessageControlId NVARCHAR(MAX) NOT NULL,
        MessageType NVARCHAR(MAX) NOT NULL,
        TriggerEvent NVARCHAR(MAX) NOT NULL,
        Direction NVARCHAR(MAX) NOT NULL,
        RadiologyRequestId UNIQUEIDENTIFIER NULL,
        PatientId NVARCHAR(MAX) NULL,
        AccessionNumber NVARCHAR(MAX) NULL,
        RawMessage NVARCHAR(MAX) NOT NULL,
        ParsedData NVARCHAR(MAX) NULL,
        MessageDateTime DATETIME2 NOT NULL,
        Status INT NOT NULL,
        AckCode NVARCHAR(MAX) NULL,
        ErrorMessage NVARCHAR(MAX) NULL,
        RetryCount INT NOT NULL,
        LastRetryAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL,
        CreatedBy NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(MAX) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RadiologyHL7Messages_Requests FOREIGN KEY (RadiologyRequestId) REFERENCES RadiologyRequests(Id)
    );
    CREATE INDEX IX_RadiologyHL7Messages_RadiologyRequestId ON RadiologyHL7Messages(RadiologyRequestId);
END
PRINT 'RadiologyHL7Messages: OK';

PRINT 'All 3 RIS missing tables created successfully.';
