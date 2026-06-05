-- Migration 57: HR Decisions (G-42)
-- Bảng quyết định nhân sự: bổ nhiệm, điều động, nâng lương, khen thưởng, kỷ luật, thôi việc, đi học.
-- Idempotent — chạy nhiều lần không lỗi.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'HrDecisions')
BEGIN
    CREATE TABLE [dbo].[HrDecisions] (
        [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [DecisionNumber] NVARCHAR(50)     NOT NULL,   -- Số QĐ
        -- 0=Bổ nhiệm, 1=Điều động, 2=Nâng lương, 3=Khen thưởng, 4=Kỷ luật, 5=Thôi việc, 6=Đi học
        [DecisionType]   INT              NOT NULL DEFAULT 0,
        [StaffId]        NVARCHAR(100)    NOT NULL,
        [StaffCode]      NVARCHAR(50)     NULL,
        [StaffName]      NVARCHAR(200)    NULL,
        [EffectiveDate]  DATE             NOT NULL,
        [Summary]        NVARCHAR(500)    NOT NULL,   -- Trích yếu
        [Content]        NVARCHAR(MAX)    NULL,        -- Nội dung đầy đủ
        -- 0=Dự thảo, 1=Hiệu lực, 2=Hủy
        [Status]         INT              NOT NULL DEFAULT 0,
        [CreatedBy]      UNIQUEIDENTIFIER NULL,
        [CreatedAt]      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]      DATETIME2        NULL,
        CONSTRAINT [PK_HrDecisions] PRIMARY KEY ([Id])
    );
    CREATE INDEX [IX_HrDecisions_StaffId]      ON [dbo].[HrDecisions] ([StaffId]);
    CREATE INDEX [IX_HrDecisions_DecisionType] ON [dbo].[HrDecisions] ([DecisionType]);
    CREATE INDEX [IX_HrDecisions_Status]       ON [dbo].[HrDecisions] ([Status]);
    PRINT 'Created table HrDecisions';
END
GO
