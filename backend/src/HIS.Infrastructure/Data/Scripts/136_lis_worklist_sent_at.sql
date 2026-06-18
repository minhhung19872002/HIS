-- 136_lis_worklist_sent_at.sql
-- Adds WorklistSentAt to ServiceRequests to track when HL7 ORM^O01 was sent to analyzer.
-- Idempotent: COL_LENGTH guard prevents re-apply errors.

IF COL_LENGTH('ServiceRequests', 'WorklistSentAt') IS NULL
BEGIN
    ALTER TABLE ServiceRequests
        ADD WorklistSentAt DATETIME NULL;

    EXEC sp_addextendedproperty
        @name = N'MS_Description',
        @value = N'Timestamp khi gửi worklist HL7 ORM^O01 tới máy xét nghiệm (NULL = chưa gửi)',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE',  @level1name = N'ServiceRequests',
        @level2type = N'COLUMN', @level2name = N'WorklistSentAt';

    PRINT 'Added WorklistSentAt to ServiceRequests';
END
ELSE
BEGIN
    PRINT 'WorklistSentAt already exists on ServiceRequests — skipped';
END
