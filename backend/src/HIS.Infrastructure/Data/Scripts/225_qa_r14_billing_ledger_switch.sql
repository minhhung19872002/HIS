-- 225 (QA round 14, 2026-10-03): BHYT ledger vs claim switch. Default Off = old behaviour + cashier warning.
-- Idempotent: guarded insert.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Billing.LedgerUsesVisitPricing')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Billing.LedgerUsesVisitPricing', 'Off', 'String',
            N'Thu ngân tính phần BHYT theo hồ sơ giám định: Off = theo tỷ lệ lưu lúc chỉ định + cảnh báo khi lệch; On = các dòng chưa thu tính theo BhytVisitPricing (mức hưởng cả lượt, ngưỡng 15% lương cơ sở, giá BHYT). Dòng đã thu không đổi.',
            1, GETUTCDATE(), 0);
GO
