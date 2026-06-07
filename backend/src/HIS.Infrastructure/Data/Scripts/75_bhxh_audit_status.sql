-- Migration 75: BhxhAuditSession — thêm cột duyệt hồ sơ và gửi cổng BHXH
-- Pre-assigned: bhxhAudit agent (parallel session 2026-06-07)
-- Idempotent: IF NOT EXISTS guards

-- ApprovedBy: người duyệt hồ sơ giám định
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'BhxhAuditSessions' AND COLUMN_NAME = 'ApprovedBy'
)
BEGIN
    ALTER TABLE BhxhAuditSessions ADD ApprovedBy UNIQUEIDENTIFIER NULL;
    PRINT 'Added BhxhAuditSessions.ApprovedBy';
END
GO

-- ApprovedAt: thời gian duyệt
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'BhxhAuditSessions' AND COLUMN_NAME = 'ApprovedAt'
)
BEGIN
    ALTER TABLE BhxhAuditSessions ADD ApprovedAt DATETIME2(7) NULL;
    PRINT 'Added BhxhAuditSessions.ApprovedAt';
END
GO

-- SubmittedBy: người gửi cổng BHXH
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'BhxhAuditSessions' AND COLUMN_NAME = 'SubmittedBy'
)
BEGIN
    ALTER TABLE BhxhAuditSessions ADD SubmittedBy UNIQUEIDENTIFIER NULL;
    PRINT 'Added BhxhAuditSessions.SubmittedBy';
END
GO

-- SubmittedAt: thời gian gửi cổng
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'BhxhAuditSessions' AND COLUMN_NAME = 'SubmittedAt'
)
BEGIN
    ALTER TABLE BhxhAuditSessions ADD SubmittedAt DATETIME2(7) NULL;
    PRINT 'Added BhxhAuditSessions.SubmittedAt';
END
GO

-- PortalTransactionId: mã giao dịch trả về từ cổng BHXH (MockMode: MOCK-...)
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'BhxhAuditSessions' AND COLUMN_NAME = 'PortalTransactionId'
)
BEGIN
    ALTER TABLE BhxhAuditSessions ADD PortalTransactionId NVARCHAR(100) NULL;
    PRINT 'Added BhxhAuditSessions.PortalTransactionId';
END
GO
