-- Expand Patient PII columns to accommodate encrypted values
-- Data Protection API encrypted strings are ~200+ chars
-- Run AFTER enabling column-level encryption in HISDbContext

USE HIS;
GO

ALTER TABLE Patients ALTER COLUMN IdentityNumber NVARCHAR(500);
ALTER TABLE Patients ALTER COLUMN PhoneNumber NVARCHAR(500);
ALTER TABLE Patients ALTER COLUMN Email NVARCHAR(500);
ALTER TABLE Patients ALTER COLUMN InsuranceNumber NVARCHAR(500);

PRINT 'Patient PII columns expanded for encrypted data storage';
GO
