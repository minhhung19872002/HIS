-- 108: Vá drift cho DM hành chính nhỏ (#95) — Occupations/Genders/Ethnics ĐÃ tồn tại sẵn ở prod
-- nên 105 (IF OBJECT_ID IS NULL) bỏ qua, không thêm cột Note/SortOrder mà entity yêu cầu.
-- Idempotent: chỉ ADD cột khi chưa có.
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.Occupations', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Occupations') AND name = 'Note')
    ALTER TABLE dbo.Occupations ADD [Note] NVARCHAR(500) NULL;
GO

IF OBJECT_ID('dbo.Genders', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Genders') AND name = 'Note')
    ALTER TABLE dbo.Genders ADD [Note] NVARCHAR(500) NULL;
GO

IF OBJECT_ID('dbo.Ethnics', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Ethnics') AND name = 'Note')
    ALTER TABLE dbo.Ethnics ADD [Note] NVARCHAR(500) NULL;
GO

IF OBJECT_ID('dbo.Ethnics', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Ethnics') AND name = 'SortOrder')
    ALTER TABLE dbo.Ethnics ADD [SortOrder] INT NOT NULL DEFAULT 0;
GO
