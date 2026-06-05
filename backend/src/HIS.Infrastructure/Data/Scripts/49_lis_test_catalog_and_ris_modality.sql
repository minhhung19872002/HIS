-- =============================================================
-- Migration 49: LIS test catalog fields + RIS modality fields + ICD-template mapping
-- G-22 (Chỉ số XN chi tiết), G-23 (XN ↔ giá viện phí), G-34 (RIS bổ sung)
-- Idempotent: IF COL_LENGTH IS NULL / IF NOT EXISTS guards
-- =============================================================

-- ---------------------------------------------------------------
-- G-22 / G-23: Bổ sung cột vào LisTestParameters
-- ---------------------------------------------------------------

-- Mã HL7 (G-22)
IF COL_LENGTH('LisTestParameters', 'Hl7Code') IS NULL
BEGIN
    ALTER TABLE LisTestParameters ADD Hl7Code NVARCHAR(50) NULL;
    PRINT 'Added LisTestParameters.Hl7Code';
END

-- Giá trị tham chiếu theo giới (bổ sung NormalMin/NormalMaxMale/Female song song ReferenceLow/High)
-- Note: ReferenceLow/High đã tồn tại (general). Thêm cột phân giới.
IF COL_LENGTH('LisTestParameters', 'NormalMinMale') IS NULL
BEGIN
    ALTER TABLE LisTestParameters ADD NormalMinMale DECIMAL(18,4) NULL;
    PRINT 'Added LisTestParameters.NormalMinMale';
END

IF COL_LENGTH('LisTestParameters', 'NormalMaxMale') IS NULL
BEGIN
    ALTER TABLE LisTestParameters ADD NormalMaxMale DECIMAL(18,4) NULL;
    PRINT 'Added LisTestParameters.NormalMaxMale';
END

IF COL_LENGTH('LisTestParameters', 'NormalMinFemale') IS NULL
BEGIN
    ALTER TABLE LisTestParameters ADD NormalMinFemale DECIMAL(18,4) NULL;
    PRINT 'Added LisTestParameters.NormalMinFemale';
END

IF COL_LENGTH('LisTestParameters', 'NormalMaxFemale') IS NULL
BEGIN
    ALTER TABLE LisTestParameters ADD NormalMaxFemale DECIMAL(18,4) NULL;
    PRINT 'Added LisTestParameters.NormalMaxFemale';
END

-- G-23: FK liên kết test parameter → dịch vụ viện phí (Services)
IF COL_LENGTH('LisTestParameters', 'ServiceId') IS NULL
BEGIN
    ALTER TABLE LisTestParameters ADD ServiceId UNIQUEIDENTIFIER NULL;
    PRINT 'Added LisTestParameters.ServiceId';
END

-- GroupId: nhóm XN (link đến LabTestGroups)
IF COL_LENGTH('LisTestParameters', 'GroupId') IS NULL
BEGIN
    ALTER TABLE LisTestParameters ADD GroupId UNIQUEIDENTIFIER NULL;
    PRINT 'Added LisTestParameters.GroupId';
END

-- ---------------------------------------------------------------
-- G-34a/b: Bổ sung cột vào RadiologyModalities
-- ---------------------------------------------------------------

-- Số ảnh tối đa in trên report
IF COL_LENGTH('RadiologyModalities', 'MaxImagesPerReport') IS NULL
BEGIN
    ALTER TABLE RadiologyModalities ADD MaxImagesPerReport INT NULL DEFAULT 4;
    PRINT 'Added RadiologyModalities.MaxImagesPerReport';
END

-- Số ảnh tối đa lưu trữ
IF COL_LENGTH('RadiologyModalities', 'MaxImagesToStore') IS NULL
BEGIN
    ALTER TABLE RadiologyModalities ADD MaxImagesToStore INT NULL DEFAULT 100;
    PRINT 'Added RadiologyModalities.MaxImagesToStore';
END

-- Mẫu kết quả mặc định theo máy chụp (FK → RadiologyReportTemplates)
IF COL_LENGTH('RadiologyModalities', 'DefaultResultTemplateId') IS NULL
BEGIN
    ALTER TABLE RadiologyModalities ADD DefaultResultTemplateId UNIQUEIDENTIFIER NULL;
    PRINT 'Added RadiologyModalities.DefaultResultTemplateId';
END

-- ---------------------------------------------------------------
-- G-34c: Bảng gán mẫu kết quả theo ICD → template
-- ---------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RisIcdTemplateMappings')
BEGIN
    CREATE TABLE RisIcdTemplateMappings (
        Id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        IcdCode             NVARCHAR(20)        NOT NULL,     -- Mã ICD-10 (vd A00, J18.9)
        IcdName             NVARCHAR(500)       NULL,         -- Tên bệnh (cache)
        TemplateId          UNIQUEIDENTIFIER    NOT NULL,     -- FK → RadiologyReportTemplates.Id
        ModalityId          UNIQUEIDENTIFIER    NULL,         -- FK → RadiologyModalities.Id (optional filter)
        SortOrder           INT                 NOT NULL DEFAULT 0,
        IsActive            BIT                 NOT NULL DEFAULT 1,
        CreatedAt           DATETIME2           NOT NULL DEFAULT GETDATE(),
        CreatedBy           NVARCHAR(200)       NULL,
        UpdatedAt           DATETIME2           NULL,
        UpdatedBy           NVARCHAR(200)       NULL,
        IsDeleted           BIT                 NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_RisIcdTemplateMappings_IcdCode ON RisIcdTemplateMappings(IcdCode) WHERE IsDeleted = 0;
    CREATE INDEX IX_RisIcdTemplateMappings_TemplateId ON RisIcdTemplateMappings(TemplateId) WHERE IsDeleted = 0;
    PRINT 'Created table RisIcdTemplateMappings';
END
