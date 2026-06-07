-- Migration 74: Thêm CareLevel vào NursingCareSheets + seed document-type ls-admission-consent
--
-- 1) Cột CareLevel (int nullable): 1 = Chăm sóc cấp 1 (BN nặng), 2 = Chăm sóc cấp 2 (BN vừa)
--    Null = chưa phân cấp (tương thích ngược với phiếu chăm sóc cũ)
--
-- 2) Seed EmrDocumentType cho "Giấy cam kết nhập viện nội trú" (LS-05)
--    FormTemplateKey = 'ls-admission-consent' đã được đăng ký trong PrintTemplateRenderer.tsx
--
-- Idempotent: COL_LENGTH guard cho cột; WHERE NOT EXISTS guard cho seed.

SET QUOTED_IDENTIFIER ON;
GO

-- 1) Thêm cột CareLevel vào NursingCareSheets
IF COL_LENGTH('dbo.NursingCareSheets','CareLevel') IS NULL
    ALTER TABLE dbo.NursingCareSheets ADD CareLevel INT NULL;
GO

-- 2) Seed document-type cho giấy cam kết nhập viện nội trú
IF OBJECT_ID('dbo.EmrDocumentTypes') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.EmrDocumentTypes WHERE Code = 'LS05-ADMISSION-CONSENT')
        INSERT INTO dbo.EmrDocumentTypes (Id, Code, Name, GroupName, FormTemplateKey, IsRequired, SortOrder, IsActive, CreatedAt, IsDeleted)
        VALUES (NEWID(), N'LS05-ADMISSION-CONSENT', N'Giấy cam kết nhập viện nội trú (LS-05)', N'Biểu mẫu lâm sàng', N'ls-admission-consent', 1, 105, 1, SYSUTCDATETIME(), 0);
END;
GO
