-- 180: link chia sẻ kết quả CĐHA có thật, và mẫu kết quả lưu được xuống bảng (#218 / T3).
--
-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 1. `RadiologyResultShares` — chia sẻ kết quả cho người bệnh qua QR.
--
--    `CreateShareResultQRAsync` sinh một mã chia sẻ và một mã truy cập 4 số, **không lưu cái nào**,
--    rồi trả về cho người bệnh. Phía kia, `GetSharedResultAsync(shareCode, accessCode)` **bỏ qua cả
--    hai tham số** và trả một DTO dựng sẵn:
--
--        // In production, validate share code and access code from database
--        return new RadiologyResultDto { Description = "Shared result - implement validation", ... };
--
--    Mà endpoint đọc là `[AllowAnonymous]`: `GET /api/RISComplete/shared-result/{shareCode}`. Hôm nay
--    nó chưa rò rỉ gì vì DTO dựng sẵn không chứa dữ liệu thật — nhưng đây là **một endpoint không cần
--    đăng nhập, đứng đúng chỗ kết quả chẩn đoán hình ảnh của người bệnh sẽ chảy qua, và toàn bộ cơ chế
--    bảo vệ của nó (mã chia sẻ + mã truy cập) chưa được cài**. Người nối nó vào dữ liệu thật sẽ vô
--    tình mở kết quả của mọi người bệnh cho bất kỳ ai gọi.
--
--    Bảng này lưu: mã chia sẻ, **BĂM** của mã truy cập (không lưu bản rõ), hạn dùng, cờ thu hồi, số
--    lần nhập sai và mốc khoá, cùng dấu vết truy cập để đối chiếu khi cần.
--
--    Mã truy cập 4 số chỉ có 10.000 khả năng nên **phải đếm số lần thử**: không có chốt ấy thì dò hết
--    trong vài giây.
-- ─────────────────────────────────────────────────────────────────────────────────────────────
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RadiologyResultShares')
BEGIN
    CREATE TABLE RadiologyResultShares (
        Id               uniqueidentifier NOT NULL PRIMARY KEY,
        ShareCode        nvarchar(64)     NOT NULL,
        -- SHA-256 của mã truy cập + ShareCode làm muối. KHÔNG lưu mã truy cập dạng rõ: người xem
        -- được bảng này thì cũng xem được mọi kết quả đang chia sẻ.
        AccessCodeHash   nvarchar(128)    NOT NULL,
        RadiologyReportId uniqueidentifier NOT NULL,
        ExpiresAt        datetime2        NOT NULL,
        IsRevoked        bit              NOT NULL DEFAULT 0,
        RevokedAt        datetime2        NULL,
        FailedAttempts   int              NOT NULL DEFAULT 0,
        LockedUntil      datetime2        NULL,
        AccessCount      int              NOT NULL DEFAULT 0,
        LastAccessedAt   datetime2        NULL,
        CreatedAt        datetime2        NOT NULL,
        CreatedBy        nvarchar(100)    NULL,
        UpdatedAt        datetime2        NULL,
        UpdatedBy        nvarchar(100)    NULL,
        IsDeleted        bit              NOT NULL DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_RadiologyResultShares_ShareCode')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'RadiologyResultShares')
BEGIN
    CREATE UNIQUE INDEX UX_RadiologyResultShares_ShareCode
        ON RadiologyResultShares(ShareCode) WHERE IsDeleted = 0;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 2. `RadiologyReportTemplates` — mẫu kết quả CĐHA lọc được theo dịch vụ và giới tính.
--
--    Cả cụm mẫu kết quả đang là **hardcode**: `GetResultTemplatesAsync`,
--    `GetResultTemplatesByServiceAsync`, `GetResultTemplatesByGenderAsync`,
--    `GetAllResultTemplatesAsync` đều trả về cùng một danh sách dựng trong mã
--    (`GetDefaultTemplates()`); `SaveResultTemplateAsync` không ghi gì; `DeleteResultTemplateAsync`
--    trả `true` mà không xoá. Bác sĩ soạn mẫu riêng cho khoa mình thì mất, bấm xoá thì phần mềm báo
--    xong mà mẫu vẫn còn.
--
--    Bảng `RadiologyReportTemplates` đã tồn tại (16 cột) — lại là **nhóm A**, chỉ thiếu đường ghi.
--    Nhưng nó thiếu ba cột mà chính hai đường đọc kia cần: lọc theo dịch vụ và theo giới tính không
--    thực hiện được nếu không lưu `ServiceId` và `Gender`.
-- ─────────────────────────────────────────────────────────────────────────────────────────────
IF COL_LENGTH('dbo.RadiologyReportTemplates', 'ServiceId') IS NULL
BEGIN
    ALTER TABLE RadiologyReportTemplates ADD ServiceId uniqueidentifier NULL;
    ALTER TABLE RadiologyReportTemplates ADD ServiceTypeId uniqueidentifier NULL;
    -- 'Male' · 'Female' · 'Both'. Một số mẫu chỉ dùng cho một giới (vd siêu âm tử cung phần phụ).
    ALTER TABLE RadiologyReportTemplates ADD Gender nvarchar(10) NULL;
    ALTER TABLE RadiologyReportTemplates ADD IsDefault bit NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_RadiologyReportTemplates_Code')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'RadiologyReportTemplates')
BEGIN
    CREATE UNIQUE INDEX UX_RadiologyReportTemplates_Code
        ON RadiologyReportTemplates(TemplateCode) WHERE IsDeleted = 0;
END
GO
