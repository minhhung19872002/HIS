-- ============================================================
-- 130_lis_test_parameter_extra_fields.sql
-- Bổ sung các cột còn thiếu trong LisTestParameters (#23):
--   SampleTypeId, PrintUnit, Description
--   (NormalMin/MaxMale/Female, Hl7Code đã có sẵn từ seed 93)
-- Idempotent: dùng IF COL_LENGTH IS NULL guard
-- ============================================================

-- SampleTypeId — FK → LabSampleTypes (nullable)
IF COL_LENGTH('LisTestParameters', 'SampleTypeId') IS NULL
BEGIN
    ALTER TABLE LisTestParameters
        ADD SampleTypeId UNIQUEIDENTIFIER NULL;
    PRINT '+ LisTestParameters.SampleTypeId added';
END;

-- PrintUnit — đơn vị hiển thị trên phiếu in (có thể khác Unit)
IF COL_LENGTH('LisTestParameters', 'PrintUnit') IS NULL
BEGIN
    ALTER TABLE LisTestParameters
        ADD PrintUnit NVARCHAR(50) NULL;
    PRINT '+ LisTestParameters.PrintUnit added';
END;

-- Description — mô tả / ghi chú cho kỹ thuật viên
IF COL_LENGTH('LisTestParameters', 'Description') IS NULL
BEGIN
    ALTER TABLE LisTestParameters
        ADD [Description] NVARCHAR(500) NULL;
    PRINT '+ LisTestParameters.Description added';
END;

-- FK constraint (chỉ thêm nếu cột và bảng đích tồn tại)
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_LisTestParameters_LabSampleTypes_SampleTypeId'
)
AND OBJECT_ID('LabSampleTypes', 'U') IS NOT NULL
AND COL_LENGTH('LisTestParameters', 'SampleTypeId') IS NOT NULL
BEGIN
    ALTER TABLE LisTestParameters
        ADD CONSTRAINT FK_LisTestParameters_LabSampleTypes_SampleTypeId
        FOREIGN KEY (SampleTypeId) REFERENCES LabSampleTypes(Id)
        ON DELETE SET NULL;
    PRINT '+ FK LisTestParameters -> LabSampleTypes added';
END;
