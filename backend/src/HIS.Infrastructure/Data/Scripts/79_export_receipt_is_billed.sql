-- 79: cờ IsBilled trên ExportReceipts (audit luồng nghiệp vụ 2026-06-06 #17).
-- Guard idempotent cho auto-call CreateBillingAfterDispensingAsync sau khi phát thuốc —
-- tránh cộng tiền thuốc 2 lần vào InvoiceSummary. Idempotent.
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('ExportReceipts') AND name = 'IsBilled'
)
BEGIN
    ALTER TABLE ExportReceipts ADD IsBilled bit NOT NULL CONSTRAINT DF_ExportReceipts_IsBilled DEFAULT (0);
END
