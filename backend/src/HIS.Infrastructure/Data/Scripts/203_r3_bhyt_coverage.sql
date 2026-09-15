-- 203 · R3 BHYT: insurance computed at order time + claims generated from real records.
-- Idempotent: every statement is guarded, a second run changes nothing.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON; -- filtered index below
GO

-- 1) Configuration read by BhytVisitPricing / BhytCoverageCalculator (visible in the system-config screen).
--    BHYT.HospitalLevel is facility-specific, so it is seeded EMPTY (= not configured → trái-tuyến reductions are
--    not applied and a warning is attached). Set 1 trung ương · 2 tỉnh · 3 huyện · 4 xã.
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'BHYT.HospitalLevel')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'BHYT.HospitalLevel', '', 'Number',
            N'Tuyến chuyên môn của bệnh viện cho mức hưởng BHYT trái tuyến: 1-Trung ương, 2-Tỉnh, 3-Huyện, 4-Xã. Để trống = chưa cấu hình (không giảm mức hưởng trái tuyến).',
            1, GETUTCDATE(), 0);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'BHYT.BaseSalary')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'BHYT.BaseSalary', '2340000', 'Number',
            N'Lương cơ sở (VND) — ngưỡng 15% cho lần KCB được BHYT chi trả 100% và trần DVKT (40 tháng lương cơ sở).',
            1, GETUTCDATE(), 0);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'BHYT.CostCeiling')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'BHYT.CostCeiling', '', 'Number',
            N'Trần thanh toán BHYT cho một DVKT (VND). Để trống = 40 × lương cơ sở.',
            1, GETUTCDATE(), 0);
GO

-- 2) One live claim per ClaimCode (MA_LK). The old per-second code collided on double-click.
--    Guarded: skipped while live duplicates still exist (reported by the app, not deleted here).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_InsuranceClaims_ClaimCode_Live' AND object_id = OBJECT_ID('dbo.InsuranceClaims'))
   AND NOT EXISTS (SELECT ClaimCode FROM dbo.InsuranceClaims WHERE IsDeleted = 0 GROUP BY ClaimCode HAVING COUNT(*) > 1)
    CREATE UNIQUE INDEX UX_InsuranceClaims_ClaimCode_Live ON dbo.InsuranceClaims (ClaimCode) WHERE IsDeleted = 0;
GO

-- 3) Lookup of a record's claim on lock / manual create.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InsuranceClaims_MedicalRecordId' AND object_id = OBJECT_ID('dbo.InsuranceClaims'))
    CREATE INDEX IX_InsuranceClaims_MedicalRecordId ON dbo.InsuranceClaims (MedicalRecordId) WHERE MedicalRecordId IS NOT NULL;
GO
