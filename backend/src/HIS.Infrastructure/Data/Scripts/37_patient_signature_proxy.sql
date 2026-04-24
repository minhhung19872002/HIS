-- QW3.9: PatientSignature proxy signer fields
-- Allow relatives to sign on behalf of patient (coma/infant/elderly).
-- Idempotent — safe to re-run.

IF COL_LENGTH('dbo.PatientSignatures', 'IsProxySignature') IS NULL
    ALTER TABLE dbo.PatientSignatures ADD IsProxySignature bit NOT NULL DEFAULT 0;

IF COL_LENGTH('dbo.PatientSignatures', 'ProxySignerName') IS NULL
    ALTER TABLE dbo.PatientSignatures ADD ProxySignerName nvarchar(200) NULL;

IF COL_LENGTH('dbo.PatientSignatures', 'ProxySignerCccd') IS NULL
    ALTER TABLE dbo.PatientSignatures ADD ProxySignerCccd nvarchar(20) NULL;

IF COL_LENGTH('dbo.PatientSignatures', 'ProxySignerRelation') IS NULL
    ALTER TABLE dbo.PatientSignatures ADD ProxySignerRelation nvarchar(50) NULL;

IF COL_LENGTH('dbo.PatientSignatures', 'ProxyReason') IS NULL
    ALTER TABLE dbo.PatientSignatures ADD ProxyReason nvarchar(500) NULL;
