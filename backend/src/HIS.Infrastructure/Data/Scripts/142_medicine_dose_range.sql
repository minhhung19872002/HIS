-- #214 [SAFE-3] Dose-range validation cho thuoc nguy co cao
-- Bang cau hinh nguong lieu (max don lieu / max ngay) theo thuoc + duong dung + nhom tuoi.
-- SEED RONG: duoc si BV nhap gia tri lieu chuan that (KHONG bia so lieu lam sang).
-- Bang rong -> khong canh bao (advisory, khong ket lam sang). Idempotent.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MedicineDoseRanges')
BEGIN
    CREATE TABLE [dbo].[MedicineDoseRanges] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [MedicineId] UNIQUEIDENTIFIER NOT NULL,
        [RouteCode] NVARCHAR(20) NULL,
        [AgeGroup] INT NOT NULL DEFAULT 0,
        [IsRenalAdjusted] BIT NOT NULL DEFAULT 0,
        [MaxSingleDose] DECIMAL(18,4) NULL,
        [MaxDailyDose] DECIMAL(18,4) NULL,
        [Unit] NVARCHAR(50) NULL,
        [SevereMultiplier] DECIMAL(9,2) NOT NULL DEFAULT 1.5,
        [Note] NVARCHAR(500) NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_MedicineDoseRanges_MedicineId] ON [dbo].[MedicineDoseRanges]([MedicineId]);
    CREATE INDEX [IX_MedicineDoseRanges_Active] ON [dbo].[MedicineDoseRanges]([IsActive], [MedicineId]);
END
GO
