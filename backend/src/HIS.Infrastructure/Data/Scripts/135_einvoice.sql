-- ============================================================
-- 135_einvoice.sql
-- Tạo bảng EInvoices (Hóa đơn điện tử HĐĐT đa NCC).
-- Idempotent: IF NOT EXISTS guard toàn bộ.
-- Audit columns dùng NVARCHAR(450) để tương thích ValueConverter whitelist.
-- KHÔNG FK cứng tới Receipts (tránh schema-drift khi bảng chưa tạo).
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'EInvoices') AND type = 'U')
BEGIN
    CREATE TABLE EInvoices (
        -- Primary key
        Id              UNIQUEIDENTIFIER    NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),

        -- Liên kết phiếu thu (nullable — không FK cứng)
        ReceiptId       UNIQUEIDENTIFIER    NULL,

        -- Nhà cung cấp: VNPT / Viettel / MISA
        Provider        NVARCHAR(50)        NOT NULL DEFAULT '',

        -- Kết quả phát hành từ NCC
        InvoiceNo       NVARCHAR(50)        NULL,   -- Số hóa đơn NCC cấp
        InvoiceCode     NVARCHAR(100)       NULL,   -- Mã CQT (cơ quan thuế)
        TemplateCode    NVARCHAR(50)        NULL,   -- Mẫu số hóa đơn
        SerialNo        NVARCHAR(50)        NULL,   -- Ký hiệu hóa đơn

        -- Trạng thái: 0=draft, 1=issued, 2=signed, 3=cancelled, 4=failed
        Status          INT                 NOT NULL DEFAULT 0,

        -- Tài chính
        TotalAmount     DECIMAL(18,2)       NOT NULL DEFAULT 0,
        TaxAmount       DECIMAL(18,2)       NULL,

        -- Thời gian phát hành
        IssuedAt        DATETIME2           NULL,

        -- Raw response từ NCC (tối đa max để giữ toàn bộ JSON gốc)
        PortalResponse  NVARCHAR(MAX)       NULL,

        -- Thông báo lỗi khi Status=4
        ErrorMessage    NVARCHAR(1000)      NULL,

        -- Audit (NVARCHAR(450) — khớp ValueConverter whitelist trong HISDbContext)
        CreatedAt       DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy       NVARCHAR(450)       NULL,
        UpdatedAt       DATETIME2           NULL,
        UpdatedBy       NVARCHAR(450)       NULL,
        IsDeleted       BIT                 NOT NULL DEFAULT 0
    );

    PRINT '+ Table EInvoices created';
END;
ELSE
BEGIN
    PRINT '~ Table EInvoices already exists — skip create';
END;

-- Index: tra cứu theo ReceiptId (thường dùng nhất)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EInvoices_ReceiptId' AND object_id = OBJECT_ID('EInvoices'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_EInvoices_ReceiptId
        ON EInvoices (ReceiptId)
        WHERE ReceiptId IS NOT NULL;
    PRINT '+ Index IX_EInvoices_ReceiptId created';
END;

-- Index: tra cứu theo Status (phát hành/chưa phát hành)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EInvoices_Status' AND object_id = OBJECT_ID('EInvoices'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_EInvoices_Status
        ON EInvoices (Status, IsDeleted, CreatedAt DESC);
    PRINT '+ Index IX_EInvoices_Status created';
END;
