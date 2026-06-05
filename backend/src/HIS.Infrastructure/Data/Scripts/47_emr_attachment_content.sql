USE [HIS];
GO
-- B3.4 (so hoa HSBA): them cot FileContent (VARBINARY(MAX)) vao EmrDocumentAttachments
-- de luu BYTES file dinh kem ngay trong DB (DB blob) thay vi chi metadata.
-- Idempotent: chi ADD khi chua co cot. NULL = ban ghi metadata cu (khong co bytes).
IF COL_LENGTH('dbo.EmrDocumentAttachments','FileContent') IS NULL
    ALTER TABLE dbo.EmrDocumentAttachments ADD FileContent VARBINARY(MAX) NULL;
GO
