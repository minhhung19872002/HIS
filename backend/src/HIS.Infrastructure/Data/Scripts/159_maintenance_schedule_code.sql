-- NangCap26 XVII.7 (bo sung sau test): MA PHIEU KE HOACH BAO DUONG.
--
-- Ho so trang thiet bi y te theo TT 08/2019: moi ke hoach/phieu bao duong phai co SO
-- de tra cuu - ky duyet - luu tru. Truoc day MaintenanceRecords khong co cot ma phieu
-- nen DTO tra ScheduleCode = null, giao dien phai fallback ten thiet bi.
--
-- ADDITIVE - chi them cot + backfill du lieu cu. Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) Cot ma phieu
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaintenanceRecords') AND name = 'ScheduleCode')
    ALTER TABLE dbo.MaintenanceRecords ADD ScheduleCode NVARCHAR(50) NULL;
GO

-- 2) Backfill ban ghi cu: BD + yyyyMMdd cua ngay len lich + so thu tu trong ngay.
--    Chi dien cho dong dang NULL -> chay lai khong doi ma da cap.
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaintenanceRecords') AND name = 'ScheduleCode')
BEGIN
    ;WITH numbered AS (
        SELECT Id,
               CONCAT('BD', FORMAT(ScheduledDate, 'yyyyMMdd'), '-',
                      RIGHT('0000' + CAST(ROW_NUMBER() OVER (PARTITION BY CAST(ScheduledDate AS DATE)
                                                             ORDER BY CreatedAt, Id) AS VARCHAR(4)), 4)) AS NewCode
        FROM dbo.MaintenanceRecords
        WHERE ScheduleCode IS NULL
    )
    UPDATE mr SET mr.ScheduleCode = n.NewCode
    FROM dbo.MaintenanceRecords mr
    JOIN numbered n ON n.Id = mr.Id;
END
GO

-- 3) Chu ky bao duong dinh ky (Monthly/Quarterly/SemiAnnual/Annual) — ho so TTBYT phai ghi
--    ke hoach lap lai bao lau mot lan; truoc day form co nhap nhung khong co cho luu.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaintenanceRecords') AND name = 'Frequency')
    ALTER TABLE dbo.MaintenanceRecords ADD Frequency NVARCHAR(30) NULL;
GO

-- 4) Chong trung ma (bo qua dong NULL de khong chan ban ghi cu neu backfill loi)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_MaintenanceRecords_ScheduleCode' AND object_id = OBJECT_ID('dbo.MaintenanceRecords'))
    CREATE UNIQUE INDEX UX_MaintenanceRecords_ScheduleCode
        ON dbo.MaintenanceRecords(ScheduleCode)
        WHERE ScheduleCode IS NOT NULL;
GO
