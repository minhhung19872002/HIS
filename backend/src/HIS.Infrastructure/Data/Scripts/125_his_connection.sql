-- ============================================================================
-- 125_his_connection.sql
-- Bảng HisConnections: quản trị endpoint HIS bên thứ ba / đa cơ sở.
-- Idempotent: dùng IF NOT EXISTS / COL_LENGTH guards.
-- KHÔNG lưu secret — chỉ lưu tên key (ApiKeyRef) trỏ đến SystemConfig.
-- Audit columns (CreatedBy/UpdatedBy) NVARCHAR(450) — khớp ValueConverter whitelist.
-- ============================================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'HisConnections' AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[HisConnections] (
        [Id]            UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        [Name]          NVARCHAR(200)       NOT NULL,
        [Provider]      NVARCHAR(100)       NULL,        -- Vendor: VNPT, Viettel, Custom, …
        [BaseUrl]       NVARCHAR(500)       NOT NULL,    -- https://his.hospital-b.vn/api
        [AuthType]      NVARCHAR(50)        NULL,        -- ApiKey | Bearer | Basic | None
        [ApiKeyRef]     NVARCHAR(200)       NULL,        -- Tên key trong SystemConfigs — KHÔNG phải secret
        [IsActive]      BIT                 NOT NULL DEFAULT 1,
        [LastCheckedAt] DATETIME2           NULL,
        [LastStatus]    NVARCHAR(20)        NULL,        -- Online | Offline | Unknown
        [Notes]         NVARCHAR(1000)      NULL,
        -- BaseEntity audit
        [CreatedAt]     DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy]     NVARCHAR(450)       NULL,
        [UpdatedAt]     DATETIME2           NULL,
        [UpdatedBy]     NVARCHAR(450)       NULL,
        [IsDeleted]     BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT [PK_HisConnections] PRIMARY KEY CLUSTERED ([Id] ASC)
    );

    -- Index thường dùng: tìm kết nối đang hoạt động
    CREATE NONCLUSTERED INDEX [IX_HisConnections_IsActive_IsDeleted]
        ON [dbo].[HisConnections] ([IsActive] ASC, [IsDeleted] ASC);

    PRINT 'Created table HisConnections';
END
ELSE
BEGIN
    -- Bảo đảm idempotent: thêm cột mới nếu bảng đã tồn tại từ lần deploy trước
    IF COL_LENGTH('dbo.HisConnections', 'Notes') IS NULL
        ALTER TABLE [dbo].[HisConnections] ADD [Notes] NVARCHAR(1000) NULL;

    IF COL_LENGTH('dbo.HisConnections', 'ApiKeyRef') IS NULL
        ALTER TABLE [dbo].[HisConnections] ADD [ApiKeyRef] NVARCHAR(200) NULL;

    PRINT 'Table HisConnections already exists — skipped create, checked column guards';
END
GO
