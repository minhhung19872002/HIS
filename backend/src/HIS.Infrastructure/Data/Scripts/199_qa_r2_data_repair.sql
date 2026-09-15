-- QA round 2/3 (2026-09-15): repair rows written by bugs fixed in commits 52b8ea64..43743a03.
-- Runs on every startup ⇒ each statement only matches rows still in the broken state (re-run = no-op).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) Pharmacy invoices created by CreateBillingAfterDispensingAsync without RemainingAmount: the cashier
--    refused every payment ("vượt quá số tiền còn nợ 0đ"). Only plain invoices (no insurance/deposit/refund).
UPDATE dbo.InvoiceSummaries
SET RemainingAmount = TotalAmount - DiscountAmount - PaidAmount
WHERE IsDeleted = 0 AND Status = 0 AND RemainingAmount = 0
  AND InsuranceAmount = 0 AND DepositAmount = 0 AND RefundAmount = 0
  AND TotalAmount - DiscountAmount - PaidAmount > 0;
GO

-- 2) OPD/IPD prescription lines saved with TotalPrice but Amount/PatientAmount = 0 → 0đ at the cashier,
--    refunds and statements. Insurance was never split on these rows (InsuranceAmount = 0).
UPDATE dbo.PrescriptionDetails
SET Amount = TotalPrice,
    PatientAmount = CASE WHEN PatientAmount = 0 THEN TotalPrice ELSE PatientAmount END
WHERE Amount = 0 AND TotalPrice > 0 AND InsuranceAmount = 0;
GO

-- 3) Discharge never wrote MedicalRecords.DischargeDate (reports/XML read it).
UPDATE m
SET DischargeDate = d.DischargeDate
FROM dbo.MedicalRecords m
JOIN dbo.Admissions a ON a.MedicalRecordId = m.Id
JOIN dbo.Discharges d ON d.AdmissionId = a.Id AND d.IsDeleted = 0
WHERE m.DischargeDate IS NULL;
GO

-- 4) Refund receipts not linked to the medical record of the original payment/deposit.
UPDATE r
SET MedicalRecordId = COALESCE(p.MedicalRecordId, dp.MedicalRecordId)
FROM dbo.Receipts r
LEFT JOIN dbo.Receipts p ON p.Id = r.OriginalPaymentId
LEFT JOIN dbo.Deposits dp ON dp.Id = r.OriginalDepositId
WHERE r.ReceiptType = 3 AND r.MedicalRecordId IS NULL
  AND COALESCE(p.MedicalRecordId, dp.MedicalRecordId) IS NOT NULL;
GO

-- 5) Retail POS sales stored CashierId = Guid.Empty (hidden from sale history by the required Cashier join).
--    The real cashier is unknown when CreatedBy is empty: attribute to the creating user if resolvable,
--    otherwise to the built-in admin, and say so in Notes.
UPDATE r
SET CashierId = COALESCE(u.Id, adm.Id),
    Notes = CASE WHEN u.Id IS NULL
                 THEN LEFT(CONCAT(ISNULL(r.Notes + N' ', N''), N'[Dữ liệu cũ: không xác định người thu tiền]'), 1000)
                 ELSE r.Notes END
FROM dbo.RetailSales r
LEFT JOIN dbo.Users u ON CAST(u.Id AS nvarchar(50)) = r.CreatedBy
CROSS APPLY (SELECT TOP 1 Id FROM dbo.Users WHERE Username = N'admin') adm
WHERE r.CashierId = '00000000-0000-0000-0000-000000000000';
GO

-- 6) BusinessAlerts duplicated on every check call (hospital-wide alert deduped by the caller's patient):
--    keep the earliest open alert per code/title/message/entity/day, soft-delete the rest.
;WITH d AS (
    SELECT Id, ROW_NUMBER() OVER (
        PARTITION BY AlertCode, Title, Message, ISNULL(PatientId, '00000000-0000-0000-0000-000000000000'),
                     ISNULL(EntityId, '00000000-0000-0000-0000-000000000000'), CAST(CreatedAt AS date)
        ORDER BY CreatedAt) AS rn
    FROM dbo.BusinessAlerts
    WHERE IsDeleted = 0 AND Status = 0
)
UPDATE b SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME()
FROM dbo.BusinessAlerts b JOIN d ON d.Id = b.Id
WHERE d.rn > 1;
GO

-- 7) Empty disease reports created by POST /write-gap/epidemiology/reports without validation.
UPDATE dbo.DiseaseReports
SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME()
WHERE IsDeleted = 0 AND ISNULL(PatientName, N'') = N'' AND ISNULL(DiseaseCode, N'') = N''
  AND ISNULL(DiseaseName, N'') = N'' AND OnsetDate = '0001-01-01';
GO

-- 8) Vaccination rows saved without any patient (PatientId = Guid.Empty and no name).
UPDATE dbo.VaccinationRecords
SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME()
WHERE ISNULL(IsDeleted, 0) = 0 AND PatientId = '00000000-0000-0000-0000-000000000000'
  AND ISNULL(PatientName, N'') = N'';
GO

-- 9) Methadone: at most ONE dispensed dose per patient per day, enforced by the database so two concurrent
--    requests cannot both pass the service check. Both writers now fill DosingDate; old rows may only have DoseDate.
IF COL_LENGTH('dbo.MethadoneDosingRecords', 'DosingDay') IS NULL
    ALTER TABLE dbo.MethadoneDosingRecords
        ADD DosingDay AS CAST(COALESCE(DosingDate, DoseDate) AS date) PERSISTED;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_MethadoneDosing_Day' AND object_id = OBJECT_ID('dbo.MethadoneDosingRecords'))
   AND NOT EXISTS (
        SELECT 1 FROM dbo.MethadoneDosingRecords
        WHERE IsDeleted = 0 AND Status = 0 AND MethadonePatientId IS NOT NULL AND DosingDay IS NOT NULL
        GROUP BY MethadonePatientId, DosingDay HAVING COUNT(*) > 1)
    CREATE UNIQUE INDEX UX_MethadoneDosing_Day
        ON dbo.MethadoneDosingRecords (MethadonePatientId, DosingDay)
        WHERE IsDeleted = 0 AND Status = 0 AND MethadonePatientId IS NOT NULL; -- filtered index cannot reference the computed column
GO
