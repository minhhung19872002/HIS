-- Migration 58: Official Documents (G-44)
-- Bảng công văn đến/đi: số CV, loại, ngày, nơi gửi/nhận, trích yếu, người xử lý, hạn xử lý, trạng thái, file đính kèm.
-- Idempotent — chạy nhiều lần không lỗi.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OfficialDocuments')
BEGIN
    CREATE TABLE [dbo].[OfficialDocuments] (
        [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [DocumentNumber] NVARCHAR(100)    NOT NULL,   -- Số công văn
        -- 0=Đến, 1=Đi
        [DocumentType]   INT              NOT NULL DEFAULT 0,
        [DocumentDate]   DATE             NOT NULL,
        [Sender]         NVARCHAR(300)    NULL,        -- Nơi gửi (loại Đến)
        [Receiver]       NVARCHAR(300)    NULL,        -- Nơi nhận (loại Đi)
        [Summary]        NVARCHAR(500)    NOT NULL,    -- Trích yếu
        [Handler]        NVARCHAR(200)    NULL,        -- Người xử lý
        [Deadline]       DATE             NULL,        -- Hạn xử lý
        -- 0=Mới, 1=Đang xử lý, 2=Hoàn thành, 3=Lưu
        [Status]         INT              NOT NULL DEFAULT 0,
        [AttachmentPath] NVARCHAR(500)    NULL,        -- Đường dẫn file đính kèm
        [CreatedBy]      UNIQUEIDENTIFIER NULL,
        [CreatedAt]      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]      DATETIME2        NULL,
        CONSTRAINT [PK_OfficialDocuments] PRIMARY KEY ([Id])
    );
    CREATE INDEX [IX_OfficialDocuments_DocumentType] ON [dbo].[OfficialDocuments] ([DocumentType]);
    CREATE INDEX [IX_OfficialDocuments_Status]       ON [dbo].[OfficialDocuments] ([Status]);
    CREATE INDEX [IX_OfficialDocuments_Deadline]     ON [dbo].[OfficialDocuments] ([Deadline]) WHERE [Deadline] IS NOT NULL;
    PRINT 'Created table OfficialDocuments';
END
GO
