-- NangCap26 (TTYT Tinh Bien) muc XVII.3 / XVII.4 / XVII.7:
--   XVII.3 Trang cap tai san: khoa/phong yeu cau cap tai san tu kho TTB
--   XVII.4 Duyet yeu cau trang cap
--   XVII.7 Duyet ke hoach bao duong
-- Tai su dung AssetProcurementRequest voi RequestType = 4 (TrangCap) — khong tao bang moi.
-- MaintenanceRecords bo sung cot duyet.
-- ADDITIVE — chi them cot. Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) MaintenanceRecords: duyet ke hoach bao duong (XVII.7)
--    ApprovalStatus: 0=Cho duyet, 1=Da duyet, 2=Tu choi
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaintenanceRecords') AND name = 'ApprovalStatus')
    ALTER TABLE dbo.MaintenanceRecords ADD ApprovalStatus INT NOT NULL CONSTRAINT DF_MaintRec_ApprovalStatus DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaintenanceRecords') AND name = 'ApprovedBy')
    ALTER TABLE dbo.MaintenanceRecords ADD ApprovedBy UNIQUEIDENTIFIER NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaintenanceRecords') AND name = 'ApprovedAt')
    ALTER TABLE dbo.MaintenanceRecords ADD ApprovedAt DATETIME2 NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaintenanceRecords') AND name = 'ApprovalNote')
    ALTER TABLE dbo.MaintenanceRecords ADD ApprovalNote NVARCHAR(500) NULL;
GO

-- 2) AssetProcurementRequests: vet cap phat khi trang cap (XVII.4)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AssetProcurementRequests') AND name = 'IssuedAt')
    ALTER TABLE dbo.AssetProcurementRequests ADD IssuedAt DATETIME2 NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AssetProcurementRequests') AND name = 'IssuedBy')
    ALTER TABLE dbo.AssetProcurementRequests ADD IssuedBy UNIQUEIDENTIFIER NULL;
GO

-- 3) Ke hoach bao duong chua duyet -> mac dinh cho duyet (du lieu cu van chay binh thuong)
--    Khong doi Status nghiep vu, chi set ApprovalStatus.
GO
