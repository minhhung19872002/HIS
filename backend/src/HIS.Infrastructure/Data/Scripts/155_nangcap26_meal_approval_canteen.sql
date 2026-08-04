-- NangCap26 (TTYT Tinh Bien) muc XII.5 + XII.6:
--   XII.5 Duyet phieu suat an: khoa dinh duong duyet suat an tu cac khoa gui len,
--         len thuc don va TINH TIEN cho benh nhan tren thong tin dieu tri.
--   XII.6 Nha an: nhan suat an tu khoa phong -> chuan bi -> phat lai cho khoa phong.
-- ADDITIVE — chi them cot. Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) MealPlans: vet duyet + moc thoi gian nha an
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MealPlans') AND name = 'ApprovedBy')
    ALTER TABLE dbo.MealPlans ADD ApprovedBy UNIQUEIDENTIFIER NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MealPlans') AND name = 'ApprovedAt')
    ALTER TABLE dbo.MealPlans ADD ApprovedAt DATETIME2 NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MealPlans') AND name = 'RejectReason')
    ALTER TABLE dbo.MealPlans ADD RejectReason NVARCHAR(500) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MealPlans') AND name = 'PreparedAt')
    ALTER TABLE dbo.MealPlans ADD PreparedAt DATETIME2 NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MealPlans') AND name = 'DistributedAt')
    ALTER TABLE dbo.MealPlans ADD DistributedAt DATETIME2 NULL;
GO

-- 2) MealPlanItems: chong tinh tien trung khi duyet lai
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MealPlanItems') AND name = 'BilledAt')
    ALTER TABLE dbo.MealPlanItems ADD BilledAt DATETIME2 NULL;
GO

-- 3) DietTypes: map sang dich vu de tinh tien khi duyet (NULL = khong thu tien)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DietTypes') AND name = 'ServiceId')
    ALTER TABLE dbo.DietTypes ADD ServiceId UNIQUEIDENTIFIER NULL;
GO

-- 4) Index cho hang doi nha an (loc theo ngay + trang thai)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MealPlans_Date_Status' AND object_id = OBJECT_ID('dbo.MealPlans'))
    CREATE INDEX IX_MealPlans_Date_Status ON dbo.MealPlans ([Date], [Status]) INCLUDE (DepartmentId, MealType);
GO
