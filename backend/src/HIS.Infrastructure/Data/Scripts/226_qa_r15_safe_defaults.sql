-- 226 (QA round 15, 2026-10-03): discharge transfer destination + safe-default switches. Idempotent.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- "Chuyển viện" discharge: destination and reason were accepted by the DTO and dropped (no columns).
IF COL_LENGTH('dbo.Discharges','TransferToHospital') IS NULL
    ALTER TABLE dbo.Discharges ADD TransferToHospital nvarchar(500) NULL;
IF COL_LENGTH('dbo.Discharges','TransferReason') IS NULL
    ALTER TABLE dbo.Discharges ADD TransferReason nvarchar(1000) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Clinical.TelemedicineRxSafetyMode')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Clinical.TelemedicineRxSafetyMode', 'Warn', 'String',
            N'Đơn thuốc khám từ xa: Warn = lưu + trả cảnh báo dị ứng/tương tác/trùng hoạt chất; Block = chặn (400) trừ khi BS nhập lý do bỏ qua.',
            1, GETUTCDATE(), 0);
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Reception.GroupOrdersUseVisitObject')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Reception.GroupOrdersUseVisitObject', 'Off', 'String',
            N'Chỉ định theo nhóm tại tiếp đón: Off = luôn tự trả (như cũ); On = theo đối tượng lượt khám (BHYT được tách phần quỹ).',
            1, GETUTCDATE(), 0);
GO
