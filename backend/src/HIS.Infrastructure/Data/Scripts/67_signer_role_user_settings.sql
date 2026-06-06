-- Migration 67: SignerRole trên SigningRequests + bảng UserSettings (generic per-user settings)
-- Tác giả: Claude Code — 2026-06-07
-- Idempotent: IF NOT EXISTS / COL_LENGTH IS NULL guards

-- ============================================================
-- 1. Cột SignerRole trên bảng SigningRequests
--    Lưu vai trò người ký (KTV, Bác sĩ, Trưởng khoa, ...)
--    để lọc form trình ký theo vai trò.
-- ============================================================
IF COL_LENGTH('SigningRequests', 'SignerRole') IS NULL
BEGIN
    ALTER TABLE SigningRequests ADD SignerRole NVARCHAR(100) NULL;
    PRINT N'Added column SigningRequests.SignerRole';
END
ELSE
    PRINT N'Column SigningRequests.SignerRole already exists — skip';

-- ============================================================
-- 2. Bảng UserSettings (generic key-value per-user)
--    Dùng cho DefaultLabRole (KTV / Người duyệt), viewer config,
--    và các setting per-user khác trong tương lai.
--    SettingKey examples:
--      lab.default_ktv_name   — tên KTV mặc định
--      lab.default_ktv_id     — userId KTV mặc định
--      lab.default_approver_name
--      lab.default_approver_id
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserSettings')
BEGIN
    CREATE TABLE UserSettings (
        Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID()  PRIMARY KEY,
        UserId       UNIQUEIDENTIFIER NOT NULL,
        SettingKey   NVARCHAR(200)    NOT NULL,
        SettingValue NVARCHAR(2000)   NULL,
        -- Audit columns (BaseEntity)
        CreatedAt    DATETIME         NOT NULL DEFAULT GETDATE(),
        CreatedBy    NVARCHAR(100)    NULL,
        UpdatedAt    DATETIME         NULL,
        UpdatedBy    NVARCHAR(100)    NULL,
        IsDeleted    BIT              NOT NULL DEFAULT 0,
        CONSTRAINT FK_UserSettings_Users
            FOREIGN KEY (UserId) REFERENCES Users(Id),
        CONSTRAINT UQ_UserSettings_UserId_Key
            UNIQUE (UserId, SettingKey)
    );
    PRINT N'Created table UserSettings';
END
ELSE
    PRINT N'Table UserSettings already exists — skip';

-- Index for fast per-user lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserSettings_UserId' AND object_id = OBJECT_ID('UserSettings'))
BEGIN
    CREATE INDEX IX_UserSettings_UserId ON UserSettings (UserId) WHERE IsDeleted = 0;
    PRINT N'Created index IX_UserSettings_UserId';
END
