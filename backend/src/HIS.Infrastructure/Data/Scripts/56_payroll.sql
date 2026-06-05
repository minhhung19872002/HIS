-- Migration 56: Payroll Periods and Items (G-41)
-- Bảng kỳ lương và dòng lương per nhân viên.
-- Idempotent — chạy nhiều lần không lỗi.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PayrollPeriods')
BEGIN
    CREATE TABLE [dbo].[PayrollPeriods] (
        [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [PeriodCode]  NVARCHAR(20)     NOT NULL,   -- VD: 2026-06
        [Year]        INT              NOT NULL,
        [Month]       INT              NOT NULL,
        [Status]      INT              NOT NULL DEFAULT 0, -- 0=Draft, 1=Approved
        [ApprovedBy]  NVARCHAR(100)    NULL,
        [ApprovedAt]  DATETIME2        NULL,
        [Notes]       NVARCHAR(500)    NULL,
        [CreatedBy]   UNIQUEIDENTIFIER NULL,
        [CreatedAt]   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]   DATETIME2        NULL,
        CONSTRAINT [PK_PayrollPeriods] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [UX_PayrollPeriods_YearMonth] ON [dbo].[PayrollPeriods] ([Year], [Month]);
    PRINT 'Created table PayrollPeriods';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PayrollItems')
BEGIN
    CREATE TABLE [dbo].[PayrollItems] (
        [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [PeriodId]         UNIQUEIDENTIFIER NOT NULL,
        [StaffId]          NVARCHAR(100)    NOT NULL, -- ref to StaffProfiles / HR staff code
        [StaffCode]        NVARCHAR(50)     NULL,
        [StaffName]        NVARCHAR(200)    NULL,
        [DepartmentName]   NVARCHAR(200)    NULL,
        [WorkDays]         DECIMAL(5,1)     NOT NULL DEFAULT 0, -- số công (từ attendance hoặc nhập tay)
        [BaseSalary]       DECIMAL(18,2)    NOT NULL DEFAULT 0, -- lương cơ bản (hệ số × mức lương cơ sở)
        [Allowance]        DECIMAL(18,2)    NOT NULL DEFAULT 0, -- phụ cấp tổng
        [OtherIncome]      DECIMAL(18,2)    NOT NULL DEFAULT 0, -- thu nhập khác
        [BhxhDeduction]    DECIMAL(18,2)    NOT NULL DEFAULT 0, -- khấu trừ BHXH/BHYT/BHTN (mặc định 10.5%)
        [OtherDeduction]   DECIMAL(18,2)    NOT NULL DEFAULT 0, -- khấu trừ khác
        [NetSalary]        DECIMAL(18,2)    NOT NULL DEFAULT 0, -- thực lãnh
        [Notes]            NVARCHAR(500)    NULL,
        [CreatedAt]        DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]        DATETIME2        NULL,
        CONSTRAINT [PK_PayrollItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PayrollItems_Period] FOREIGN KEY ([PeriodId]) REFERENCES [dbo].[PayrollPeriods]([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_PayrollItems_PeriodId] ON [dbo].[PayrollItems] ([PeriodId]);
    CREATE INDEX [IX_PayrollItems_StaffId]  ON [dbo].[PayrollItems] ([StaffId]);
    PRINT 'Created table PayrollItems';
END
GO
