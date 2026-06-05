-- =============================================================
-- Migration 53: Pharmacy Requisition (Du tru noi bo khoa/kho con)
-- Adds LinkedExportReceiptId column to PharmacyApprovals so that
-- when ApprovalType=1 is approved, the generated transfer issue
-- ExportReceipt ID is stored for lookup and printing.
-- Idempotent: COL_LENGTH IS NULL guard.
-- =============================================================

IF COL_LENGTH('PharmacyApprovals', 'LinkedExportReceiptId') IS NULL
BEGIN
    ALTER TABLE PharmacyApprovals
    ADD LinkedExportReceiptId uniqueidentifier NULL;
    PRINT 'Added PharmacyApprovals.LinkedExportReceiptId';
END
ELSE
BEGIN
    PRINT 'PharmacyApprovals.LinkedExportReceiptId already exists — skipped';
END
