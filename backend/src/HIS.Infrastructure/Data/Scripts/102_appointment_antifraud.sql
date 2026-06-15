-- ============================================================
-- Migration 102: Appointment Anti-Fraud
-- Bảng log thử đặt lịch (BookingAttemptLogs) +
--        blacklist SĐT/IP (BookingBlacklists)
-- Idempotent: mỗi ALTER chỉ chạy khi cột chưa tồn tại
-- ============================================================

-- ---- 1. BookingAttemptLogs -----------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BookingAttemptLogs')
BEGIN
    CREATE TABLE BookingAttemptLogs (
        Id                 uniqueidentifier NOT NULL DEFAULT NEWID(),
        PhoneNumber        nvarchar(20)     NOT NULL,
        IpAddress          nvarchar(45)     NULL,          -- IPv4/IPv6, max 45 chars
        IsSuccessful       bit              NOT NULL DEFAULT 0,
        AppointmentCode    nvarchar(30)     NULL,
        BlockReason        nvarchar(200)    NULL,
        CreatedAt          datetime2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy          nvarchar(100)    NULL,
        UpdatedAt          datetime2        NULL,
        UpdatedBy          nvarchar(100)    NULL,
        IsDeleted          bit              NOT NULL DEFAULT 0,
        CONSTRAINT PK_BookingAttemptLogs PRIMARY KEY (Id)
    );

    -- Index tra cứu nhanh theo SĐT + ngày (query đếm số lần/ngày)
    CREATE INDEX IX_BookingAttemptLogs_Phone_Created
        ON BookingAttemptLogs (PhoneNumber, CreatedAt);

    -- Index tra cứu theo IP + ngày
    CREATE INDEX IX_BookingAttemptLogs_Ip_Created
        ON BookingAttemptLogs (IpAddress, CreatedAt)
        WHERE IpAddress IS NOT NULL;

    PRINT 'Created table BookingAttemptLogs';
END
ELSE
    PRINT 'Table BookingAttemptLogs already exists — skipped';

-- ---- 2. BookingBlacklists ------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BookingBlacklists')
BEGIN
    CREATE TABLE BookingBlacklists (
        Id                 uniqueidentifier NOT NULL DEFAULT NEWID(),
        BlacklistType      nvarchar(10)     NOT NULL,      -- 'Phone' | 'IP'
        Value              nvarchar(45)     NOT NULL,
        Reason             nvarchar(500)    NULL,
        ExpiresAtUtc       datetime2        NULL,          -- NULL = vĩnh viễn
        AddedBy            nvarchar(100)    NULL,
        CreatedAt          datetime2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy          nvarchar(100)    NULL,
        UpdatedAt          datetime2        NULL,
        UpdatedBy          nvarchar(100)    NULL,
        IsDeleted          bit              NOT NULL DEFAULT 0,
        CONSTRAINT PK_BookingBlacklists PRIMARY KEY (Id)
    );

    -- Unique active blacklist per (Type, Value)
    CREATE UNIQUE INDEX UX_BookingBlacklists_Type_Value_Active
        ON BookingBlacklists (BlacklistType, Value)
        WHERE IsDeleted = 0;

    -- Index cho lookup nhanh
    CREATE INDEX IX_BookingBlacklists_Value
        ON BookingBlacklists (Value);

    PRINT 'Created table BookingBlacklists';
END
ELSE
    PRINT 'Table BookingBlacklists already exists — skipped';
