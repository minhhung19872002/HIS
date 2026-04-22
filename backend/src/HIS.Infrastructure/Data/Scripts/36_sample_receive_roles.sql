-- N1.16+17: Tách sample collect vs receive + KTV vs Reviewer

-- 1. Tách Collect vs Receive trên ServiceRequestDetails
IF COL_LENGTH('dbo.ServiceRequestDetails', 'CollectedByUserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[ServiceRequestDetails] ADD
        [CollectedByUserId] UNIQUEIDENTIFIER NULL,
        [ReceivedByUserId] UNIQUEIDENTIFIER NULL,
        [ReceivedAt] DATETIME2 NULL,
        [ReceiveStatus] INT NOT NULL DEFAULT 0,
        [RejectReason] NVARCHAR(500) NULL,
        [TechnicianUserId] UNIQUEIDENTIFIER NULL,
        [TechnicianRunAt] DATETIME2 NULL,
        [ReviewerUserId] UNIQUEIDENTIFIER NULL,
        [ReviewedAt] DATETIME2 NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'IX_SampleReceive_Status' AND object_id = OBJECT_ID('ServiceRequestDetails'))
BEGIN
    CREATE INDEX [IX_SampleReceive_Status] ON [dbo].[ServiceRequestDetails]([ReceiveStatus]);
END
