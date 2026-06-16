-- 121_provincial_directive.sql
-- Module Chỉ đạo tuyến (#47): tạo bảng ProvincialDirectives
-- Idempotent: bao bọc toàn bộ trong IF OBJECT_ID IS NULL

IF OBJECT_ID(N'dbo.ProvincialDirectives', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProvincialDirectives (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        Title           NVARCHAR(500)    NOT NULL,
        DirectiveNo     NVARCHAR(100)    NULL,
        Content         NVARCHAR(MAX)    NULL,
        IssueDate       DATETIME2        NOT NULL,
        FromLevel       NVARCHAR(200)    NULL,
        ToLevel         NVARCHAR(200)    NULL,
        Status          INT              NOT NULL DEFAULT 0,  -- 0=Mới, 1=Đang thực hiện, 2=Hoàn thành, 3=Hết hiệu lực
        Notes           NVARCHAR(MAX)    NULL,
        -- Audit cols: NVARCHAR(450) NULL (tránh ValueConverter Guid/String)
        CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(450)    NULL,
        UpdatedAt       DATETIME2        NULL,
        UpdatedBy       NVARCHAR(450)    NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_ProvincialDirectives PRIMARY KEY (Id)
    );

    CREATE INDEX IX_ProvincialDirectives_IssueDate
        ON dbo.ProvincialDirectives (IssueDate DESC);

    CREATE INDEX IX_ProvincialDirectives_Status
        ON dbo.ProvincialDirectives (Status)
        WHERE IsDeleted = 0;
END
