-- Seed 5 loại tài liệu biểu mẫu TT32/2023 mới (Prompt 9 Đợt 2 — defer "khai báo document-types")
-- vào danh mục EmrDocumentTypes để đưa vào luồng trình ký/ký số.
-- FormTemplateKey khớp printType đã đăng ký trong frontend PrintTemplateRenderer.tsx.
-- Idempotent: chỉ insert khi Code chưa tồn tại.

SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.EmrDocumentTypes') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.EmrDocumentTypes WHERE Code = 'MS18-PTTT-CERT')
        INSERT INTO dbo.EmrDocumentTypes (Id, Code, Name, GroupName, FormTemplateKey, IsRequired, SortOrder, IsActive, CreatedAt, IsDeleted)
        VALUES (NEWID(), N'MS18-PTTT-CERT', N'Giấy chứng nhận phẫu thuật/thủ thuật (MS.18/BV)', N'Biểu mẫu TT32', N'ls-surgery-cert', 0, 118, 1, SYSUTCDATETIME(), 0);

    IF NOT EXISTS (SELECT 1 FROM dbo.EmrDocumentTypes WHERE Code = 'MS19-DEATH-REVIEW')
        INSERT INTO dbo.EmrDocumentTypes (Id, Code, Name, GroupName, FormTemplateKey, IsRequired, SortOrder, IsActive, CreatedAt, IsDeleted)
        VALUES (NEWID(), N'MS19-DEATH-REVIEW', N'Biên bản kiểm thảo tử vong (MS.19/BV)', N'Biểu mẫu TT32', N'ls-death-review', 0, 119, 1, SYSUTCDATETIME(), 0);

    IF NOT EXISTS (SELECT 1 FROM dbo.EmrDocumentTypes WHERE Code = 'MS20-TRIAGE')
        INSERT INTO dbo.EmrDocumentTypes (Id, Code, Name, GroupName, FormTemplateKey, IsRequired, SortOrder, IsActive, CreatedAt, IsDeleted)
        VALUES (NEWID(), N'MS20-TRIAGE', N'Phiếu nhận định phân loại cấp cứu (MS.20/BV)', N'Biểu mẫu TT32', N'ls-triage-assess', 0, 120, 1, SYSUTCDATETIME(), 0);

    IF NOT EXISTS (SELECT 1 FROM dbo.EmrDocumentTypes WHERE Code = 'MS21-TRANSFER-DOC')
        INSERT INTO dbo.EmrDocumentTypes (Id, Code, Name, GroupName, FormTemplateKey, IsRequired, SortOrder, IsActive, CreatedAt, IsDeleted)
        VALUES (NEWID(), N'MS21-TRANSFER-DOC', N'Phiếu bàn giao chuyển khoa (Bác sĩ) (MS.21/BV)', N'Biểu mẫu TT32', N'ls-dept-transfer-doc', 0, 121, 1, SYSUTCDATETIME(), 0);

    IF NOT EXISTS (SELECT 1 FROM dbo.EmrDocumentTypes WHERE Code = 'DD22-TRANSFER-NURSE')
        INSERT INTO dbo.EmrDocumentTypes (Id, Code, Name, GroupName, FormTemplateKey, IsRequired, SortOrder, IsActive, CreatedAt, IsDeleted)
        VALUES (NEWID(), N'DD22-TRANSFER-NURSE', N'Phiếu bàn giao chuyển khoa (Điều dưỡng) (DD.22)', N'Biểu mẫu TT32', N'ls-dept-transfer-nurse', 0, 122, 1, SYSUTCDATETIME(), 0);
END;
GO
