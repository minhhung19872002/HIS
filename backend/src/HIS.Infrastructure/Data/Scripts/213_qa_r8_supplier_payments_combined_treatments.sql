-- 213 (QA round 8, 2026-09-17): bảng/cột cho các chỗ vòng 7 đã chặn "chưa hỗ trợ".
--
-- 1. SupplierPayments — sổ thanh toán nhà cung cấp; công nợ NCC = nhập − trả hàng − đã thanh toán.
-- 2. CombinedTreatments — điều trị kết hợp (khoa khác cùng điều trị một lượt nội trú).
-- 3. AdrReports.AdmissionId/MedicineId — phản ứng thuốc nội trú gắn lượt nhập viện/thuốc bằng cột thật
--    (trước đây gắn thẻ [ADMISSION:id]/[MEDICINE:id] trong Notes; code vẫn đọc thẻ cũ khi cột NULL).
-- Idempotent; CreatedBy/UpdatedBy nvarchar → không cần ValueConverter. Entity đọc các cột này nên script
-- phải chạy trước khi app truy vấn.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.SupplierPayments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SupplierPayments (
        Id               uniqueidentifier NOT NULL CONSTRAINT PK_SupplierPayments PRIMARY KEY,
        SupplierId       uniqueidentifier NOT NULL,
        PaymentDate      datetime2        NOT NULL,
        Amount           decimal(18,2)    NOT NULL CONSTRAINT CK_SupplierPayments_Amount CHECK (Amount > 0),
        PaymentMethod    nvarchar(50)     NULL,
        ReferenceNumber  nvarchar(100)    NULL,
        ImportReceiptId  uniqueidentifier NULL,
        Note             nvarchar(1000)   NULL,
        CreatedAt        datetime2        NOT NULL,
        CreatedBy        nvarchar(max)    NULL,
        UpdatedAt        datetime2        NULL,
        UpdatedBy        nvarchar(max)    NULL,
        IsDeleted        bit              NOT NULL CONSTRAINT DF_SupplierPayments_IsDeleted DEFAULT (0),
        CONSTRAINT FK_SupplierPayments_Suppliers_SupplierId FOREIGN KEY (SupplierId) REFERENCES dbo.Suppliers(Id),
        CONSTRAINT FK_SupplierPayments_ImportReceipts_ImportReceiptId FOREIGN KEY (ImportReceiptId) REFERENCES dbo.ImportReceipts(Id)
    );
    CREATE INDEX IX_SupplierPayments_SupplierId ON dbo.SupplierPayments(SupplierId);
    CREATE INDEX IX_SupplierPayments_ImportReceiptId ON dbo.SupplierPayments(ImportReceiptId);
END
GO

IF OBJECT_ID('dbo.CombinedTreatments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CombinedTreatments (
        Id                      uniqueidentifier NOT NULL CONSTRAINT PK_CombinedTreatments PRIMARY KEY,
        AdmissionId             uniqueidentifier NOT NULL,
        ConsultingDepartmentId  uniqueidentifier NOT NULL,
        RequestDate             datetime2        NOT NULL,
        RequestReason           nvarchar(max)    NULL,
        ConsultingDiagnosis     nvarchar(max)    NULL,
        ConsultingDoctorId      uniqueidentifier NULL,
        Status                  int              NOT NULL CONSTRAINT DF_CombinedTreatments_Status DEFAULT (0), -- 0 chờ, 1 đang ĐT, 2 hoàn thành, 3 hủy
        TreatmentResult         nvarchar(max)    NULL,
        CompletedDate           datetime2        NULL,
        CreatedAt               datetime2        NOT NULL,
        CreatedBy               nvarchar(max)    NULL,
        UpdatedAt               datetime2        NULL,
        UpdatedBy               nvarchar(max)    NULL,
        IsDeleted               bit              NOT NULL CONSTRAINT DF_CombinedTreatments_IsDeleted DEFAULT (0),
        CONSTRAINT FK_CombinedTreatments_Admissions_AdmissionId FOREIGN KEY (AdmissionId) REFERENCES dbo.Admissions(Id),
        CONSTRAINT FK_CombinedTreatments_Departments_ConsultingDepartmentId FOREIGN KEY (ConsultingDepartmentId) REFERENCES dbo.Departments(Id)
    );
    CREATE INDEX IX_CombinedTreatments_AdmissionId ON dbo.CombinedTreatments(AdmissionId);
END
GO

IF COL_LENGTH('dbo.AdrReports', 'AdmissionId') IS NULL
    ALTER TABLE dbo.AdrReports ADD AdmissionId uniqueidentifier NULL;
GO
IF COL_LENGTH('dbo.AdrReports', 'MedicineId') IS NULL
    ALTER TABLE dbo.AdrReports ADD MedicineId uniqueidentifier NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AdrReports_AdmissionId' AND object_id = OBJECT_ID('dbo.AdrReports'))
    CREATE INDEX IX_AdrReports_AdmissionId ON dbo.AdrReports(AdmissionId);
GO
-- Backfill from the round-7 note tags "[ADMISSION:<36-char guid>]" / "[MEDICINE:<guid>]" (tags are left in Notes).
UPDATE dbo.AdrReports
SET AdmissionId = TRY_CONVERT(uniqueidentifier, SUBSTRING(Notes, 12, 36))
WHERE AdmissionId IS NULL AND Notes LIKE '[[]ADMISSION:%';
GO
UPDATE dbo.AdrReports
SET MedicineId = TRY_CONVERT(uniqueidentifier, SUBSTRING(Notes, CHARINDEX('[MEDICINE:', Notes) + 10, 36))
WHERE MedicineId IS NULL AND CHARINDEX('[MEDICINE:', Notes) > 0;
GO
