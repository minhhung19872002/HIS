-- 208_data_handover.sql
-- QA round 4 (2026-09-16): bảng lưu biên bản bàn giao dữ liệu.
-- Trước đây màn hình bàn giao gọi một hàm stub trả DTO giả: người dùng thấy "đã tạo bàn giao"
-- nhưng không có dòng nào được lưu, tải lại trang là mất, và không có vết ai đã nhận dữ liệu
-- bệnh nhân. Idempotent: toàn bộ bọc trong IF OBJECT_ID IS NULL.

IF OBJECT_ID(N'dbo.DataHandovers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DataHandovers (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        HandoverCode        NVARCHAR(50)     NOT NULL,
        HandoverDate        DATETIME2        NOT NULL,
        RecipientName       NVARCHAR(200)    NOT NULL,
        RecipientOrganization NVARCHAR(300)  NULL,
        RecipientEmail      NVARCHAR(200)    NULL,
        -- Danh sách phân hệ bàn giao, lưu JSON mảng chuỗi
        ModulesJson         NVARCHAR(MAX)    NULL,
        TotalRecords        INT              NOT NULL DEFAULT 0,
        TotalFileSize       BIGINT           NOT NULL DEFAULT 0,
        -- Status: 0=Đang chuẩn bị, 1=Sẵn sàng, 2=Đã bàn giao, 3=Đã xác nhận
        Status              INT              NOT NULL DEFAULT 0,
        DeliveredAt         DATETIME2        NULL,
        ConfirmedAt         DATETIME2        NULL,
        ConfirmedByUserId   UNIQUEIDENTIFIER NULL,
        Remarks             NVARCHAR(MAX)    NULL,
        -- Audit cols: NVARCHAR(450) NULL (tránh ValueConverter Guid/String)
        CreatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(450)    NULL,
        UpdatedAt           DATETIME2        NULL,
        UpdatedBy           NVARCHAR(450)    NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_DataHandovers PRIMARY KEY (Id)
    );

    CREATE UNIQUE INDEX UX_DataHandovers_Code
        ON dbo.DataHandovers (HandoverCode) WHERE IsDeleted = 0;

    CREATE INDEX IX_DataHandovers_HandoverDate
        ON dbo.DataHandovers (HandoverDate DESC);
END
