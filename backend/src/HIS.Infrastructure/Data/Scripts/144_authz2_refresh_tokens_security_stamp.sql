-- 144_authz2_refresh_tokens_security_stamp.sql
-- AUTHZ-2 (#368): refresh token bền (rotation + reuse-detection) + SecurityStamp thu hồi phiên TỨC THỜI.
-- Idempotent: IF NOT EXISTS guards — chạy lại mỗi startup an toàn (không có bảng applied-migrations).
-- DB rỗng: EnsureCreated đã tạo cột/bảng từ model → các guard dưới tự SKIP. DB đã tồn tại: script này vá.

-- 1) SecurityStamp trên Users — JWT mang giá trị này; OnTokenValidated so khớp để revoke tức thời.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='SecurityStamp')
    ALTER TABLE Users ADD SecurityStamp NVARCHAR(450) NULL;
GO

-- Backfill: mọi user hiện có cần 1 stamp khác NULL để token cấp sau deploy có giá trị so khớp.
-- Idempotent: chỉ update các dòng còn NULL (lần chạy sau update 0 dòng).
UPDATE Users SET SecurityStamp = LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')) WHERE SecurityStamp IS NULL;
GO

-- 2) Bảng RefreshTokens — lưu HASH (SHA-256 hex), KHÔNG lưu plaintext. Rotation + reuse-detection.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RefreshTokens')
BEGIN
    CREATE TABLE RefreshTokens (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        UserId              UNIQUEIDENTIFIER NOT NULL,
        TokenHash           NVARCHAR(128) NOT NULL,      -- SHA-256 hex của refresh token plaintext
        ExpiresAt           DATETIME2     NOT NULL,
        CreatedByIp         NVARCHAR(64)  NULL,
        RevokedAt           DATETIME2     NULL,
        RevokedByIp         NVARCHAR(64)  NULL,
        ReplacedByTokenHash NVARCHAR(128) NULL,          -- trỏ sang token thay thế khi rotate (chuỗi family)
        ReasonRevoked       NVARCHAR(200) NULL,
        -- BaseEntity audit — nvarchar(450) để khớp ValueConverter, TRÁNH InvalidCastException Guid↔String.
        CreatedAt           DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy           NVARCHAR(450) NULL,
        UpdatedAt           DATETIME2     NULL,
        UpdatedBy           NVARCHAR(450) NULL,
        IsDeleted           BIT           NOT NULL DEFAULT 0,
        CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
    );

    -- Index tra cứu theo hash (hot-path mỗi lần /auth/refresh) — bắt buộc để không table-scan.
    CREATE INDEX IX_RefreshTokens_TokenHash ON RefreshTokens (TokenHash);
    -- Index revoke-all / dọn dẹp theo user.
    CREATE INDEX IX_RefreshTokens_UserId ON RefreshTokens (UserId);

    PRINT '144_authz2: Table RefreshTokens created.';
END
ELSE
BEGIN
    PRINT '144_authz2: Table RefreshTokens already exists — skipped.';
END
GO

-- 3) Index UserSessions.SessionToken — rotation/logout/admin-terminate tra cứu phiên theo hash refresh token.
-- Bảng UserSessions tồn tại sẵn (16_catalog_tables). Trước AUTHZ-2 chưa từng được ghi → index không tốn gì.
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserSessions')
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserSessions_SessionToken' AND object_id = OBJECT_ID('UserSessions'))
    CREATE INDEX IX_UserSessions_SessionToken ON UserSessions (SessionToken);
GO
