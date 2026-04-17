-- ============================================================================
-- Catalog / reception / admin tables that were missing on prod, causing empty
-- pages or silent exceptions inside services that swallow errors.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserSessions')
BEGIN
    CREATE TABLE [dbo].[UserSessions] (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_UserSessions PRIMARY KEY,
        UserId          UNIQUEIDENTIFIER NOT NULL,
        SessionToken    NVARCHAR(500) NOT NULL CONSTRAINT DF_UserSessions_SessionToken DEFAULT N'',
        LoginTime       DATETIME2 NOT NULL CONSTRAINT DF_UserSessions_LoginTime DEFAULT SYSUTCDATETIME(),
        LogoutTime      DATETIME2 NULL,
        IPAddress       NVARCHAR(64) NULL,
        UserAgent       NVARCHAR(500) NULL,
        Status          INT NOT NULL CONSTRAINT DF_UserSessions_Status DEFAULT 0,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_UserSessions_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(MAX) NULL,
        UpdatedAt       DATETIME2 NULL,
        UpdatedBy       NVARCHAR(MAX) NULL,
        IsDeleted       BIT NOT NULL CONSTRAINT DF_UserSessions_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_UserSessions_UserId ON [dbo].[UserSessions](UserId);
    CREATE INDEX IX_UserSessions_LoginTime ON [dbo].[UserSessions](LoginTime DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SystemLogs')
BEGIN
    CREATE TABLE [dbo].[SystemLogs] (
        Id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SystemLogs PRIMARY KEY,
        LogType     NVARCHAR(32) NOT NULL CONSTRAINT DF_SystemLogs_LogType DEFAULT N'Info',
        LogLevel    NVARCHAR(16) NOT NULL CONSTRAINT DF_SystemLogs_LogLevel DEFAULT N'3',
        Message     NVARCHAR(MAX) NOT NULL CONSTRAINT DF_SystemLogs_Message DEFAULT N'',
        Exception   NVARCHAR(MAX) NULL,
        UserId      UNIQUEIDENTIFIER NULL,
        IPAddress   NVARCHAR(64) NULL,
        CreatedAt   DATETIME2 NOT NULL CONSTRAINT DF_SystemLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy   NVARCHAR(MAX) NULL,
        UpdatedAt   DATETIME2 NULL,
        UpdatedBy   NVARCHAR(MAX) NULL,
        IsDeleted   BIT NOT NULL CONSTRAINT DF_SystemLogs_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_SystemLogs_CreatedAt ON [dbo].[SystemLogs](CreatedAt DESC);
    CREATE INDEX IX_SystemLogs_UserId ON [dbo].[SystemLogs](UserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OtherPayers')
BEGIN
    CREATE TABLE [dbo].[OtherPayers] (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OtherPayers PRIMARY KEY,
        PayerCode       NVARCHAR(64) NOT NULL CONSTRAINT DF_OtherPayers_PayerCode DEFAULT N'',
        PayerName       NVARCHAR(256) NOT NULL CONSTRAINT DF_OtherPayers_PayerName DEFAULT N'',
        PayerType       INT NOT NULL CONSTRAINT DF_OtherPayers_PayerType DEFAULT 1,
        TaxCode         NVARCHAR(64) NULL,
        Address         NVARCHAR(500) NULL,
        PhoneNumber     NVARCHAR(64) NULL,
        Email           NVARCHAR(256) NULL,
        ContactPerson   NVARCHAR(256) NULL,
        BankAccount     NVARCHAR(64) NULL,
        BankName        NVARCHAR(256) NULL,
        CreditLimit     DECIMAL(18,2) NULL,
        CurrentDebt     DECIMAL(18,2) NULL,
        Notes           NVARCHAR(MAX) NULL,
        IsActive        BIT NOT NULL CONSTRAINT DF_OtherPayers_IsActive DEFAULT 1,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_OtherPayers_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(MAX) NULL,
        UpdatedAt       DATETIME2 NULL,
        UpdatedBy       NVARCHAR(MAX) NULL,
        IsDeleted       BIT NOT NULL CONSTRAINT DF_OtherPayers_IsDeleted DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ServiceGroupTemplates')
BEGIN
    CREATE TABLE [dbo].[ServiceGroupTemplates] (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ServiceGroupTemplates PRIMARY KEY,
        TemplateCode    NVARCHAR(64) NOT NULL CONSTRAINT DF_SGT_TemplateCode DEFAULT N'',
        TemplateName    NVARCHAR(256) NOT NULL CONSTRAINT DF_SGT_TemplateName DEFAULT N'',
        ServiceType     INT NOT NULL CONSTRAINT DF_SGT_ServiceType DEFAULT 1,
        DepartmentId    UNIQUEIDENTIFIER NULL,
        Description     NVARCHAR(MAX) NULL,
        IsPublic        BIT NOT NULL CONSTRAINT DF_SGT_IsPublic DEFAULT 0,
        CreatedByUserId UNIQUEIDENTIFIER NULL,
        IsActive        BIT NOT NULL CONSTRAINT DF_SGT_IsActive DEFAULT 1,
        SortOrder       INT NOT NULL CONSTRAINT DF_SGT_SortOrder DEFAULT 0,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_SGT_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(MAX) NULL,
        UpdatedAt       DATETIME2 NULL,
        UpdatedBy       NVARCHAR(MAX) NULL,
        IsDeleted       BIT NOT NULL CONSTRAINT DF_SGT_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_ServiceGroupTemplates_DepartmentId ON [dbo].[ServiceGroupTemplates](DepartmentId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ServiceGroupTemplateItems')
BEGIN
    CREATE TABLE [dbo].[ServiceGroupTemplateItems] (
        Id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ServiceGroupTemplateItems PRIMARY KEY,
        ServiceGroupTemplateId  UNIQUEIDENTIFIER NOT NULL,
        ServiceId               UNIQUEIDENTIFIER NOT NULL,
        Quantity                INT NOT NULL CONSTRAINT DF_SGTI_Quantity DEFAULT 1,
        DefaultRoomId           UNIQUEIDENTIFIER NULL,
        Notes                   NVARCHAR(MAX) NULL,
        SortOrder               INT NOT NULL CONSTRAINT DF_SGTI_SortOrder DEFAULT 0,
        CreatedAt               DATETIME2 NOT NULL CONSTRAINT DF_SGTI_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy               NVARCHAR(MAX) NULL,
        UpdatedAt               DATETIME2 NULL,
        UpdatedBy               NVARCHAR(MAX) NULL,
        IsDeleted               BIT NOT NULL CONSTRAINT DF_SGTI_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_ServiceGroupTemplateItems_ServiceGroupTemplateId ON [dbo].[ServiceGroupTemplateItems](ServiceGroupTemplateId);
    CREATE INDEX IX_ServiceGroupTemplateItems_ServiceId ON [dbo].[ServiceGroupTemplateItems](ServiceId);
END
GO
