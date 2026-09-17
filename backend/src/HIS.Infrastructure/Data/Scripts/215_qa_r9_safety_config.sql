-- 215 · QA-R9 safety: make the patient-safety switches visible/editable in the v2 system-config screen.
-- Every row is seeded with the value the code ALREADY uses when the row is missing, so behaviour does not change.
-- Idempotent: every statement is guarded, a second run changes nothing.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Practice-licence (CCHN) gate on prescribing/ordering (RequirePracticeLicense → DoctorLicenseService).
-- Block = refuse only on positive evidence (licence expired/suspended/revoked); missing data only warns.
-- Warn  = never refuse; the same finding is returned as a warning (banner + X-Practice-License-Warning header).
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Clinical.PracticeLicenseGateMode')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Clinical.PracticeLicenseGateMode', 'Block', 'String',
            N'Cổng CCHN khi kê đơn/chỉ định: Block = CHẶN khi CCHN đã hết hạn/đình chỉ/thu hồi (thiếu dữ liệu chỉ cảnh báo); Warn = chỉ cảnh báo, không chặn.',
            1, GETUTCDATE(), 0);
GO

-- Inpatient deposit block before orders/prescriptions (InpatientCompleteService.CheckDepositEnforceBlockAsync), default OFF.
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Billing.DepositEnforceBlock')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Billing.DepositEnforceBlock', 'false', 'Boolean',
            N'Nội trú: true = CHẶN chỉ định/kê đơn khi số dư tạm ứng dưới ngưỡng Billing.DepositMinThreshold; false = không chặn.',
            1, GETUTCDATE(), 0);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Billing.DepositMinThreshold')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Billing.DepositMinThreshold', '0', 'Number',
            N'Ngưỡng tạm ứng tối thiểu (VND) dùng khi Billing.DepositEnforceBlock = true.',
            1, GETUTCDATE(), 0);
GO
