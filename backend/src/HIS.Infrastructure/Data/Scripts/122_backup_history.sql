-- 122_backup_history.sql
-- Module Backup & Restore (#106 #128 #129 #130): tạo bảng BackupHistories
-- Idempotent: toàn bộ bọc trong IF OBJECT_ID IS NULL

IF OBJECT_ID(N'dbo.BackupHistories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BackupHistories (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        FileName        NVARCHAR(500)    NOT NULL,
        FilePath        NVARCHAR(1000)   NULL,
        SizeBytes       BIGINT           NOT NULL DEFAULT 0,
        -- BackupType: 0=Manual, 1=Scheduled
        BackupType      INT              NOT NULL DEFAULT 0,
        -- Destination: "Local" | "NAS" | "Cloud"
        Destination     NVARCHAR(50)     NULL,
        -- Status: 0=Running, 1=Success, 2=Failed
        Status          INT              NOT NULL DEFAULT 0,
        StartedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CompletedAt     DATETIME2        NULL,
        ErrorMessage    NVARCHAR(MAX)    NULL,
        -- Audit cols: NVARCHAR(450) NULL (tránh ValueConverter Guid/String)
        CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(450)    NULL,
        UpdatedAt       DATETIME2        NULL,
        UpdatedBy       NVARCHAR(450)    NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_BackupHistories PRIMARY KEY (Id)
    );

    CREATE INDEX IX_BackupHistories_StartedAt
        ON dbo.BackupHistories (StartedAt DESC);

    CREATE INDEX IX_BackupHistories_Status_BackupType
        ON dbo.BackupHistories (Status, BackupType);
END
