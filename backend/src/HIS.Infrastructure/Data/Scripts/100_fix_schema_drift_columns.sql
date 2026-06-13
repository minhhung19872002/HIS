-- 100: Fix schema drift — 4 cột EF model expect nhưng DB thiếu (issue #26, checker so cột mới bắt được).
-- Mọi query EF đụng các bảng này trước đó CRASH "Invalid column name" (bị nuốt thành empty/500 upstream).
-- Idempotent: IF NOT EXISTS từng cột.

-- 1) LabCriticalValueAlerts.AcknowledgedByUserId — shadow FK từ nav AcknowledgedByUser (User)
--    (cột AcknowledgedBy cũ vẫn giữ; shadow do EF auto-sinh vì nav không khai HasForeignKey)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'LabCriticalValueAlerts' AND COLUMN_NAME = 'AcknowledgedByUserId')
BEGIN
    ALTER TABLE dbo.LabCriticalValueAlerts ADD AcknowledgedByUserId uniqueidentifier NULL;
END
GO

-- 2) LabTestNorms.ServiceId — shadow FK từ nav Service (FK thật là TestId nhưng không khai Fluent)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'LabTestNorms' AND COLUMN_NAME = 'ServiceId')
BEGIN
    ALTER TABLE dbo.LabTestNorms ADD ServiceId uniqueidentifier NULL;
END
GO

-- 3) Suppliers.TotalDebt — công nợ NCC (entity có từ trước, thiếu migration)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'Suppliers' AND COLUMN_NAME = 'TotalDebt')
BEGIN
    ALTER TABLE dbo.Suppliers ADD TotalDebt decimal(18,2) NOT NULL CONSTRAINT DF_Suppliers_TotalDebt DEFAULT 0;
END
GO

-- 4) WebAuthnCredentials.IsDeleted — BaseEntity soft-delete (bảng tạo trước khi chuẩn hóa)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'WebAuthnCredentials' AND COLUMN_NAME = 'IsDeleted')
BEGIN
    ALTER TABLE dbo.WebAuthnCredentials ADD IsDeleted bit NOT NULL CONSTRAINT DF_WebAuthnCredentials_IsDeleted DEFAULT 0;
END
GO
