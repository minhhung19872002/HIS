-- 117_adr_report.sql
-- Module ADR (#5 #55-59): Tạo bảng AdrReports — Phiếu báo cáo phản ứng có hại của thuốc
-- Theo Thông tư 51/2017/TT-BYT
-- Idempotent: bọc toàn bộ trong IF OBJECT_ID IS NULL
-- KHÔNG FK cứng vào Patients/Prescriptions (tránh cascade)

IF OBJECT_ID(N'dbo.AdrReports', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdrReports (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),

        -- Thông tin bệnh nhân
        PatientName         NVARCHAR(200)    NOT NULL DEFAULT '',
        PatientCode         NVARCHAR(50)     NULL,
        PatientAge          NVARCHAR(50)     NOT NULL DEFAULT '',   -- "35 tuổi" / "3 tháng"
        Gender              INT              NOT NULL DEFAULT 0,    -- 0=Không rõ, 1=Nam, 2=Nữ
        Weight              DECIMAL(10,2)    NULL,                  -- kg

        -- Liên kết đơn thuốc (tuỳ chọn, không FK cứng)
        PrescriptionId      UNIQUEIDENTIFIER NULL,

        -- Thuốc nghi ngờ
        DrugName            NVARCHAR(500)    NOT NULL DEFAULT '',   -- bắt buộc
        DrugDose            NVARCHAR(200)    NULL,
        DrugRoute           NVARCHAR(200)    NULL,

        -- Phản ứng
        ReactionDescription NVARCHAR(MAX)    NOT NULL DEFAULT '',   -- bắt buộc
        ReactionStartDate   DATETIME2        NOT NULL,
        Severity            INT              NOT NULL DEFAULT 1,    -- 1=Nhẹ, 2=Trung bình, 3=Nặng, 4=Nguy kịch/TV
        Outcome             NVARCHAR(500)    NULL,

        -- Xử trí & đánh giá
        ManagementTaken     NVARCHAR(MAX)    NULL,
        Causality           NVARCHAR(200)    NULL,

        -- Báo cáo
        ReporterName        NVARCHAR(200)    NULL,
        ReportDate          DATETIME2        NOT NULL,
        Notes               NVARCHAR(MAX)    NULL,

        -- Audit cols: NVARCHAR(450) NULL (tránh ValueConverter Guid/String)
        CreatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(450)    NULL,
        UpdatedAt           DATETIME2        NULL,
        UpdatedBy           NVARCHAR(450)    NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0,

        CONSTRAINT PK_AdrReports PRIMARY KEY (Id)
    );

    -- Index trên ReportDate để filter theo khoảng thời gian hiệu quả
    CREATE INDEX IX_AdrReports_ReportDate
        ON dbo.AdrReports (ReportDate)
        WHERE IsDeleted = 0;

    -- Index trên Severity để tổng hợp báo cáo
    CREATE INDEX IX_AdrReports_Severity
        ON dbo.AdrReports (Severity)
        WHERE IsDeleted = 0;
END
