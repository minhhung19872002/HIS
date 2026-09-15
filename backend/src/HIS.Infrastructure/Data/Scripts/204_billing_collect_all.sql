-- QA round 3 (r3-billing, 2026-09-15): the v2 cashier collects services + medicines + bed days from one invoice.
-- Runs on every startup ⇒ fully idempotent (DDL guarded; the data backfill only runs in the batch that adds the column).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) Prescriptions.IsPaid — a prescription had no paid flag, so the cashier listed a medicine as "unpaid" until it
--    was dispensed and never after (paid or not). Backfill: prescriptions already paid through a prescription QR
--    (the gateway recorded the money, nothing flagged the prescription).
IF COL_LENGTH('dbo.Prescriptions', 'IsPaid') IS NULL
BEGIN
    ALTER TABLE dbo.Prescriptions ADD IsPaid bit NOT NULL CONSTRAINT DF_Prescriptions_IsPaid DEFAULT 0;
    EXEC(N'
        UPDATE p SET IsPaid = 1
        FROM dbo.Prescriptions p
        WHERE p.IsPaid = 0
          AND EXISTS (SELECT 1 FROM dbo.PaymentTransactions t
                      WHERE t.ReferenceType = N''prescription'' AND t.ReferenceId = p.Id AND t.Status = 1);');
END
GO

-- 2) ReceiptDetails now link each collected line to its receipt (paid state, reversal on cancel/refund).
--    The table had no index on its lookup columns.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReceiptDetails_ReceiptId' AND object_id = OBJECT_ID('dbo.ReceiptDetails'))
    CREATE INDEX IX_ReceiptDetails_ReceiptId ON dbo.ReceiptDetails (ReceiptId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReceiptDetails_ServiceRequestDetailId' AND object_id = OBJECT_ID('dbo.ReceiptDetails'))
    CREATE INDEX IX_ReceiptDetails_ServiceRequestDetailId ON dbo.ReceiptDetails (ServiceRequestDetailId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReceiptDetails_PrescriptionDetailId' AND object_id = OBJECT_ID('dbo.ReceiptDetails'))
    CREATE INDEX IX_ReceiptDetails_PrescriptionDetailId ON dbo.ReceiptDetails (PrescriptionDetailId);
GO

-- 3) Review S6: the invoice ledger, pre-discharge check and cashier lists look rows up per medical record /
--    prescription / admission / gateway receipt on every call — none of these lookup columns had an index.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ServiceRequests_MedicalRecordId' AND object_id = OBJECT_ID('dbo.ServiceRequests'))
    CREATE INDEX IX_ServiceRequests_MedicalRecordId ON dbo.ServiceRequests (MedicalRecordId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Prescriptions_MedicalRecordId' AND object_id = OBJECT_ID('dbo.Prescriptions'))
    CREATE INDEX IX_Prescriptions_MedicalRecordId ON dbo.Prescriptions (MedicalRecordId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionDetails_PrescriptionId' AND object_id = OBJECT_ID('dbo.PrescriptionDetails'))
    CREATE INDEX IX_PrescriptionDetails_PrescriptionId ON dbo.PrescriptionDetails (PrescriptionId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Receipts_MedicalRecordId' AND object_id = OBJECT_ID('dbo.Receipts'))
    CREATE INDEX IX_Receipts_MedicalRecordId ON dbo.Receipts (MedicalRecordId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BedAssignments_AdmissionId' AND object_id = OBJECT_ID('dbo.BedAssignments'))
    CREATE INDEX IX_BedAssignments_AdmissionId ON dbo.BedAssignments (AdmissionId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PaymentTransactions_ReceiptId' AND object_id = OBJECT_ID('dbo.PaymentTransactions'))
    CREATE INDEX IX_PaymentTransactions_ReceiptId ON dbo.PaymentTransactions (ReceiptId);
GO

-- 4) Plain (non-filtered) indexes only: a filtered index makes every INSERT/UPDATE on the table fail in sessions
--    with QUOTED_IDENTIFIER OFF (sqlcmd default, ops/repair scripts). Replace the filtered versions an earlier
--    run of this script created.
IF EXISTS (SELECT 1 FROM sys.indexes WHERE has_filter = 1 AND object_id = OBJECT_ID('dbo.ReceiptDetails') AND name = 'IX_ReceiptDetails_ServiceRequestDetailId')
BEGIN DROP INDEX IX_ReceiptDetails_ServiceRequestDetailId ON dbo.ReceiptDetails; CREATE INDEX IX_ReceiptDetails_ServiceRequestDetailId ON dbo.ReceiptDetails (ServiceRequestDetailId); END
GO
IF EXISTS (SELECT 1 FROM sys.indexes WHERE has_filter = 1 AND object_id = OBJECT_ID('dbo.ReceiptDetails') AND name = 'IX_ReceiptDetails_PrescriptionDetailId')
BEGIN DROP INDEX IX_ReceiptDetails_PrescriptionDetailId ON dbo.ReceiptDetails; CREATE INDEX IX_ReceiptDetails_PrescriptionDetailId ON dbo.ReceiptDetails (PrescriptionDetailId); END
GO
IF EXISTS (SELECT 1 FROM sys.indexes WHERE has_filter = 1 AND object_id = OBJECT_ID('dbo.Receipts') AND name = 'IX_Receipts_MedicalRecordId')
BEGIN DROP INDEX IX_Receipts_MedicalRecordId ON dbo.Receipts; CREATE INDEX IX_Receipts_MedicalRecordId ON dbo.Receipts (MedicalRecordId); END
GO
IF EXISTS (SELECT 1 FROM sys.indexes WHERE has_filter = 1 AND object_id = OBJECT_ID('dbo.PaymentTransactions') AND name = 'IX_PaymentTransactions_ReceiptId')
BEGIN DROP INDEX IX_PaymentTransactions_ReceiptId ON dbo.PaymentTransactions; CREATE INDEX IX_PaymentTransactions_ReceiptId ON dbo.PaymentTransactions (ReceiptId); END
GO
