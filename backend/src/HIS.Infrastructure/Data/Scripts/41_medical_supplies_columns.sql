-- 41_medical_supplies_columns.sql
-- Schema repair: align MedicalSupplies table with C# entity (8 columns missing on older DBs).
-- Idempotent: each ALTER guarded by COL_LENGTH IS NULL.

IF COL_LENGTH('dbo.MedicalSupplies', 'SupplyCodeBYT') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD SupplyCodeBYT NVARCHAR(50) NULL;

IF COL_LENGTH('dbo.MedicalSupplies', 'RegistrationNumber') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD RegistrationNumber NVARCHAR(100) NULL;

IF COL_LENGTH('dbo.MedicalSupplies', 'SupplyType') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD SupplyType INT NOT NULL CONSTRAINT DF_MedicalSupplies_SupplyType DEFAULT 1;

IF COL_LENGTH('dbo.MedicalSupplies', 'SupplyGroupCode') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD SupplyGroupCode NVARCHAR(50) NULL;

IF COL_LENGTH('dbo.MedicalSupplies', 'ManufacturerCountry') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD ManufacturerCountry NVARCHAR(100) NULL;

IF COL_LENGTH('dbo.MedicalSupplies', 'IsInsuranceCovered') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD IsInsuranceCovered BIT NOT NULL CONSTRAINT DF_MedicalSupplies_IsInsuranceCovered DEFAULT 1;

IF COL_LENGTH('dbo.MedicalSupplies', 'InsurancePaymentRate') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD InsurancePaymentRate INT NOT NULL CONSTRAINT DF_MedicalSupplies_InsurancePaymentRate DEFAULT 100;

IF COL_LENGTH('dbo.MedicalSupplies', 'IsReusable') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD IsReusable BIT NOT NULL CONSTRAINT DF_MedicalSupplies_IsReusable DEFAULT 0;
