-- ============================================================================
-- 40_lab_test_norms.sql
-- Định mức vật tư/hoá chất tiêu hao cho mỗi lần thực hiện xét nghiệm.
-- Idempotent: IF NOT EXISTS guards trên cả bảng và index.
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LabTestNorms')
CREATE TABLE LabTestNorms (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TestId UNIQUEIDENTIFIER NOT NULL,            -- Service.Id (xét nghiệm)
    SupplyId UNIQUEIDENTIFIER NOT NULL,          -- MedicalSupply.Id
    Quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    Unit NVARCHAR(50) NOT NULL DEFAULT N'',
    IsActive BIT NOT NULL DEFAULT 1,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LabTestNorms_Test' AND object_id = OBJECT_ID('LabTestNorms'))
CREATE INDEX IX_LabTestNorms_Test ON LabTestNorms(TestId) WHERE IsDeleted = 0;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LabTestNorms_Supply' AND object_id = OBJECT_ID('LabTestNorms'))
CREATE INDEX IX_LabTestNorms_Supply ON LabTestNorms(SupplyId) WHERE IsDeleted = 0;
