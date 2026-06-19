-- Add Two-Factor Authentication support
-- Run against HIS database

-- Add IsTwoFactorEnabled column to Users table
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Users') AND name = 'IsTwoFactorEnabled'
)
BEGIN
    ALTER TABLE Users ADD IsTwoFactorEnabled BIT NOT NULL DEFAULT 0;
    PRINT 'Added IsTwoFactorEnabled column to Users';
END
GO

-- Create TwoFactorOtps table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TwoFactorOtps')
BEGIN
    CREATE TABLE TwoFactorOtps (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL,
        OtpCodeHash NVARCHAR(256) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        Attempts INT NOT NULL DEFAULT 0,
        IsUsed BIT NOT NULL DEFAULT 0,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedBy NVARCHAR(450) NULL,
        UpdatedBy NVARCHAR(450) NULL,
        CONSTRAINT FK_TwoFactorOtps_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
    );

    CREATE INDEX IX_TwoFactorOtps_UserId ON TwoFactorOtps(UserId);
    CREATE INDEX IX_TwoFactorOtps_ExpiresAt ON TwoFactorOtps(ExpiresAt);
    PRINT 'Created TwoFactorOtps table';
END
GO

PRINT '2FA migration complete';
GO
