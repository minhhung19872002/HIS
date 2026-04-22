-- Sprint 6 Item 2.14: Tách medical supply vs office supply (VPP)
IF COL_LENGTH('dbo.MedicalSupplies', 'IsMedical') IS NULL
    ALTER TABLE [dbo].[MedicalSupplies] ADD [IsMedical] BIT NOT NULL DEFAULT 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MedicalSupplies_IsMedical')
    AND COL_LENGTH('dbo.MedicalSupplies', 'IsMedical') IS NOT NULL
BEGIN
    CREATE INDEX [IX_MedicalSupplies_IsMedical] ON [dbo].[MedicalSupplies]([IsMedical]);
END
GO
