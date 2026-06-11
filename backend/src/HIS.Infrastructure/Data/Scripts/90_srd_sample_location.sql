-- ============================================================
-- #14b (K5): ServiceRequestDetails.SampleLocation — vị trí lưu trữ mẫu
-- Thay LabRequestItem.SampleLocation (model 2 chết) cho sample storage/tracking.
-- ============================================================

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ServiceRequestDetails' AND COLUMN_NAME = 'SampleLocation'
)
BEGIN
    ALTER TABLE [dbo].[ServiceRequestDetails] ADD [SampleLocation] NVARCHAR(200) NULL;
    PRINT 'Added SampleLocation to ServiceRequestDetails';
END
GO

PRINT '90_srd_sample_location completed';
