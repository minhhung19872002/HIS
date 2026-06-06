-- Migration 66: Tab Đoàn thể (EmployeeUnionMemberships) + CollectionReason trên ReceiptBooks
-- Tác giả: Claude Code — 2026-06-07
-- Idempotent: IF NOT EXISTS guards cho cả CREATE TABLE và ADD COLUMN

-- ============================================================
-- 1. Bảng EmployeeUnionMemberships (Tab Đoàn thể hồ sơ NV)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmployeeUnionMemberships')
BEGIN
    CREATE TABLE EmployeeUnionMemberships (
        Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID()      PRIMARY KEY,
        UserId           UNIQUEIDENTIFIER NOT NULL,
        OrganizationType NVARCHAR(100)    NOT NULL DEFAULT N'CongDoan', -- CongDoan/DoanTNCS/DangCSVN/HoiPhuNu/HoiNongDan/Khac
        MemberCode       NVARCHAR(100)    NULL,
        JoinDate         DATETIME         NULL,
        [Position]       NVARCHAR(200)    NULL,                         -- Chức vụ trong tổ chức
        MonthlyFee       DECIMAL(18,2)    NULL,                         -- Đoàn phí / hội phí tháng
        IsActive         BIT              NOT NULL DEFAULT 1,
        Note             NVARCHAR(500)    NULL,
        -- Audit columns (BaseEntity)
        CreatedAt        DATETIME         NOT NULL DEFAULT GETDATE(),
        CreatedBy        NVARCHAR(100)    NULL,
        UpdatedAt        DATETIME         NULL,
        UpdatedBy        NVARCHAR(100)    NULL,
        IsDeleted        BIT              NOT NULL DEFAULT 0,
        CONSTRAINT FK_EmployeeUnionMemberships_Users
            FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    PRINT N'Created table EmployeeUnionMemberships';
END
ELSE
    PRINT N'Table EmployeeUnionMemberships already exists — skip';

-- Soft-delete filter index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmployeeUnionMemberships_UserId' AND object_id = OBJECT_ID('EmployeeUnionMemberships'))
BEGIN
    CREATE INDEX IX_EmployeeUnionMemberships_UserId ON EmployeeUnionMemberships (UserId) WHERE IsDeleted = 0;
    PRINT N'Created index IX_EmployeeUnionMemberships_UserId';
END

-- ============================================================
-- 2. Cột CollectionReason trên bảng ReceiptBooks
-- ============================================================
IF COL_LENGTH('ReceiptBooks', 'CollectionReason') IS NULL
BEGIN
    ALTER TABLE ReceiptBooks ADD CollectionReason NVARCHAR(500) NULL;
    PRINT N'Added column ReceiptBooks.CollectionReason';
END
ELSE
    PRINT N'Column ReceiptBooks.CollectionReason already exists — skip';
