-- 223 (QA round 12, 2026-09-25): clinical rule switches — every rule WARNS by default.
-- NNN · QA-R12 clinical: admin switches for the round-12 clinical rules (v2 system-config screen).
-- Safe defaults: every rule only WARNS until an admin sets Block. Idempotent: every statement is guarded.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- TT 52/2017/TT-BYT: narcotic (N) and psychotropic/precursor (H) drugs on their own prescription
-- (OPD prescription + inpatient take-home "toa về"). ControlledDrugRxGuard.
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Clinical.ControlledDrugSeparateRxMode')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Clinical.ControlledDrugSeparateRxMode', 'Warn', 'String',
            N'Đơn ngoại trú/toa về kê thuốc gây nghiện/hướng thần/tiền chất CHUNG với thuốc thường (TT 52/2017): Warn = vẫn lưu, bác sĩ thấy cảnh báo; Block = CHẶN lưu/phát hành, phải tách đơn N/H riêng.',
            1, GETUTCDATE(), 0);
GO

-- TT 52/2017/TT-BYT: acute course limit — narcotic ≤ 7 days, psychotropic/precursor ≤ 10 days (OPD prescription).
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Clinical.ControlledDrugDaysLimitMode')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Clinical.ControlledDrugDaysLimitMode', 'Warn', 'String',
            N'Số ngày kê thuốc kiểm soát (gây nghiện > 7 ngày, hướng thần/tiền chất > 10 ngày): Warn = chỉ cảnh báo; Block = CHẶN trừ khi bác sĩ nhập lý do bỏ qua (bệnh mạn tính/ung thư/AIDS, tối đa 30 ngày).',
            1, GETUTCDATE(), 0);
GO

-- Lab 4-eyes: the user releasing a result (final approve / 1-step approve) entered or pre-approved it.
-- Off = old behaviour; Warn = release + warning + note on the order; Block = 400, someone else must approve.
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Lab.SeparateApproverMode')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Lab.SeparateApproverMode', 'Warn', 'String',
            N'Xét nghiệm - nguyên tắc 2 người: người duyệt chính thức đã tự nhập/duyệt sơ bộ kết quả. Off = không kiểm; Warn = vẫn duyệt, cảnh báo + ghi chú phiếu; Block = CHẶN, phải người khác duyệt (phòng XN 1 KTV nên để Warn/Off).',
            1, GETUTCDATE(), 0);
GO
