-- 101: Cấu hình XN/CLS đặc biệt (issue #150 F2.13).
-- Bảng SpecialTestRule lưu khung thời gian cảnh báo tái chỉ định cho từng XN.
-- WindowType: 0=per-episode (1 lần/đợt điều trị), 1=N-ngày (WindowDays).
-- Fallback: nếu XN không có bản ghi → giữ nguyên Rule LAB-31 cứng 24h.
-- CreatedBy/UpdatedBy: nvarchar(max) — KHÔNG cần ValueConverter (per-convention script 99).
-- Idempotent: IF NOT EXISTS.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SpecialTestRules')
BEGIN
    CREATE TABLE SpecialTestRules (
        Id          uniqueidentifier NOT NULL CONSTRAINT PK_SpecialTestRules PRIMARY KEY,
        TestId      uniqueidentifier NOT NULL,
        WindowType  int              NOT NULL CONSTRAINT DF_SpecialTestRules_WindowType  DEFAULT (1),
        WindowDays  int              NULL,
        Note        nvarchar(max)    NULL,
        IsActive    bit              NOT NULL CONSTRAINT DF_SpecialTestRules_IsActive    DEFAULT (1),
        CreatedAt   datetime2        NOT NULL,
        CreatedBy   nvarchar(max)    NULL,
        UpdatedAt   datetime2        NULL,
        UpdatedBy   nvarchar(max)    NULL,
        IsDeleted   bit              NOT NULL CONSTRAINT DF_SpecialTestRules_IsDeleted   DEFAULT (0),
        CONSTRAINT FK_SpecialTestRules_Services FOREIGN KEY (TestId)
            REFERENCES Services(Id) ON DELETE NO ACTION
    );
    CREATE UNIQUE INDEX UIX_SpecialTestRules_TestId
        ON SpecialTestRules(TestId)
        WHERE IsDeleted = 0;
    CREATE INDEX IX_SpecialTestRules_IsActive
        ON SpecialTestRules(IsActive)
        WHERE IsDeleted = 0;
END
GO
