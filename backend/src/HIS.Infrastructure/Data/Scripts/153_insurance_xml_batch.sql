-- #441 (carve tu #434): luu dot xuat XML BHYT.
-- Truoc day ExportToXmlAsync ghi 14 file ra exports/xml/{batchCode} nhung tra ve
-- BatchId = Guid.NewGuid() KHONG luu o dau -> khong tra nguoc duoc BatchId ra thu muc file.
-- He qua: DownloadXmlFileAsync phai doan "thu muc moi nhat" (tai nham dot khi xuat nhieu lan)
-- va SubmitToInsurancePortalAsync gui payload gia thay vi XML that.
-- ADDITIVE — chi tao bang moi, khong sua bang cu. Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InsuranceXmlBatches')
BEGIN
    CREATE TABLE dbo.InsuranceXmlBatches (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        BatchCode NVARCHAR(100) NOT NULL,
        PeriodMonth INT NOT NULL,
        PeriodYear INT NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        FilePath NVARCHAR(500) NOT NULL,
        FileSize BIGINT NOT NULL CONSTRAINT DF_IXB_FileSize DEFAULT 0,
        TotalRecords INT NOT NULL CONSTRAINT DF_IXB_TotalRecords DEFAULT 0,
        SuccessRecords INT NOT NULL CONSTRAINT DF_IXB_SuccessRecords DEFAULT 0,
        FailedRecords INT NOT NULL CONSTRAINT DF_IXB_FailedRecords DEFAULT 0,
        FileChecksum NVARCHAR(128) NULL,
        -- 0-Da xuat, 1-Da ky so, 2-Da gui BHXH, 3-Bi tu choi
        Status INT NOT NULL CONSTRAINT DF_IXB_Status DEFAULT 0,
        SubmittedAt DATETIME2 NULL,
        SubmitTransactionId NVARCHAR(200) NULL,
        ExportTime DATETIME2 NOT NULL CONSTRAINT DF_IXB_ExportTime DEFAULT GETUTCDATE(),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_IXB_CreatedAt DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_IXB_Deleted DEFAULT 0
    );
    CREATE INDEX IX_InsuranceXmlBatches_Period ON dbo.InsuranceXmlBatches(PeriodYear, PeriodMonth, ExportTime DESC);
    CREATE UNIQUE INDEX UX_InsuranceXmlBatches_BatchCode ON dbo.InsuranceXmlBatches(BatchCode) WHERE IsDeleted = 0;
END
GO
