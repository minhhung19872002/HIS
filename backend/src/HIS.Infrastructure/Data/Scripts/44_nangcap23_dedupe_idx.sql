-- NangCap23 v2 hardening — duplicate-submission prevention
-- Filtered unique index: 1 prescription chỉ có 1 submission active (Status != 4 Cancelled)
-- → chống race condition khi 2 user/2 click cùng submit
-- Status meaning: 0=Draft, 1=Submitted, 2=Acknowledged, 3=Rejected, 4=Cancelled

SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'UX_NationalPrescriptionSubmissions_PrescriptionId_Active'
      AND object_id = OBJECT_ID('dbo.NationalPrescriptionSubmissions'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_NationalPrescriptionSubmissions_PrescriptionId_Active]
        ON [dbo].[NationalPrescriptionSubmissions]([PrescriptionId])
        WHERE [Status] <> 4 AND [IsDeleted] = 0;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'UX_NationalPharmacyReports_TypeP_Active'
      AND object_id = OBJECT_ID('dbo.NationalPharmacyOutboundReports'))
BEGIN
    -- 1 báo cáo Dược QG per ReportType+PeriodFrom+PeriodTo
    -- chống regenerate khi đã ack (Status=2)
    CREATE UNIQUE NONCLUSTERED INDEX [UX_NationalPharmacyReports_TypeP_Active]
        ON [dbo].[NationalPharmacyOutboundReports]([ReportType], [PeriodFrom], [PeriodTo])
        WHERE [Status] = 2 AND [IsDeleted] = 0;
END;
GO

-- Note: IX_NPS_Code (unique on SubmissionCode) đã tạo trong script 43 → bỏ duplicate.
-- Trên dev DB cũ EF EnsureCreated tạo column NVARCHAR(MAX), gây lỗi 1919 khi index.
-- Production prod DB column type đúng NVARCHAR(60) vì script 43 tạo trước. Đảm bảo
-- consistency: fix cột về NVARCHAR(60) nếu đang MAX (idempotent).
IF EXISTS (SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.NationalPrescriptionSubmissions')
      AND name = 'SubmissionCode' AND max_length = -1)
BEGIN
    ALTER TABLE [dbo].[NationalPrescriptionSubmissions]
        ALTER COLUMN [SubmissionCode] NVARCHAR(60) NOT NULL;
END;
GO

-- Index hỗ trợ background retry job sau này (status=1 + RetryCount < limit + age)
IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'IX_NationalPrescriptionSubmissions_Pending'
      AND object_id = OBJECT_ID('dbo.NationalPrescriptionSubmissions'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_NationalPrescriptionSubmissions_Pending]
        ON [dbo].[NationalPrescriptionSubmissions]([Status], [RetryCount], [UpdatedAt])
        WHERE [Status] IN (1, 3) AND [IsDeleted] = 0;
END;
GO
