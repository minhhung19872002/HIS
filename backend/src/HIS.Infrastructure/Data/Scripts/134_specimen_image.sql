-- ============================================================
-- 134_specimen_image.sql
-- Bảng SpecimenImages: gắn ảnh kính hiển vi / upload vào KQ XN / GPB
-- Issues: #134 (gắn ảnh), #133/#113 (web-upload + webcam fallback)
-- Idempotent: IF NOT EXISTS guard
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SpecimenImages')
BEGIN
    CREATE TABLE [dbo].[SpecimenImages] (
        [Id]                    UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,

        -- Gắn vào phiếu GPB (PathologyRequest) hoặc KQ GPB (PathologyResult) hoặc chi tiết XN
        [PathologyRequestId]    UNIQUEIDENTIFIER NULL,
        [PathologyResultId]     UNIQUEIDENTIFIER NULL,
        [ServiceRequestDetailId] UNIQUEIDENTIFIER NULL,

        -- Denorm để query nhanh theo đơn dịch vụ
        [ServiceRequestId]      UNIQUEIDENTIFIER NULL,

        -- File storage
        [ImagePath]             NVARCHAR(500) NULL,
        [ThumbnailBase64]       NVARCHAR(MAX) NULL,
        [FileName]              NVARCHAR(255) NULL,
        [MimeType]              NVARCHAR(100) NULL,
        [FileSize]              BIGINT NOT NULL DEFAULT 0,

        -- Metadata
        [Caption]               NVARCHAR(500) NULL,
        [CapturedAt]            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        -- Nguồn: microscope | manual | webcam
        [Source]                NVARCHAR(50) NOT NULL DEFAULT 'manual',

        -- Kính hiển vi
        [Magnification]         NVARCHAR(20) NULL,

        -- Display
        [SortOrder]             INT NOT NULL DEFAULT 0,
        [IncludeInReport]       BIT NOT NULL DEFAULT 1,

        -- Audit (NVARCHAR — không phải uniqueidentifier, không cần ValueConverter whitelist)
        [CreatedAt]             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy]             NVARCHAR(450) NULL,
        [UpdatedAt]             DATETIME2 NULL,
        [UpdatedBy]             NVARCHAR(450) NULL,
        [IsDeleted]             BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_SpecimenImages_PathologyResult]
        ON [dbo].[SpecimenImages]([PathologyResultId])
        WHERE [PathologyResultId] IS NOT NULL;

    CREATE INDEX [IX_SpecimenImages_ServiceRequestDetail]
        ON [dbo].[SpecimenImages]([ServiceRequestDetailId])
        WHERE [ServiceRequestDetailId] IS NOT NULL;

    CREATE INDEX [IX_SpecimenImages_ServiceRequest]
        ON [dbo].[SpecimenImages]([ServiceRequestId])
        WHERE [ServiceRequestId] IS NOT NULL;

    CREATE INDEX [IX_SpecimenImages_CapturedAt]
        ON [dbo].[SpecimenImages]([CapturedAt] DESC);

    PRINT '+ Table SpecimenImages created (migration 134)';
END
ELSE
BEGIN
    PRINT '= Table SpecimenImages already exists — skipped';
END;
GO
