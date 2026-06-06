-- Prompt 8 Đợt 2: Khai báo dịch vụ CĐHA ↔ mẫu tường trình PTTT
-- Idempotent: IF NOT EXISTS guard trên cả bảng và cột

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'RisSurgeryServiceMappings'
)
BEGIN
    CREATE TABLE [dbo].[RisSurgeryServiceMappings] (
        [Id]                           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [RadiologyServiceId]           UNIQUEIDENTIFIER NOT NULL,
        [RadiologyServiceName]         NVARCHAR(300)    NOT NULL,
        [SurgeryNarrativeTemplateId]   UNIQUEIDENTIFIER NULL,
        [SurgeryNarrativeTemplateName] NVARCHAR(300)    NULL,
        [Notes]                        NVARCHAR(1000)   NULL,
        [SortOrder]                    INT              NOT NULL DEFAULT 0,
        [IsActive]                     BIT              NOT NULL DEFAULT 1,
        [IsDeleted]                    BIT              NOT NULL DEFAULT 0,
        [CreatedAt]                    DATETIME2        NULL,
        [CreatedBy]                    NVARCHAR(100)    NULL,
        [UpdatedAt]                    DATETIME2        NULL,
        [UpdatedBy]                    NVARCHAR(100)    NULL
    );

    PRINT 'Created table RisSurgeryServiceMappings';
END
ELSE
BEGIN
    PRINT 'Table RisSurgeryServiceMappings already exists — skipping CREATE';
END
