USE [HIS];
GO
IF COL_LENGTH('dbo.HIEConnections','CreatedAt') IS NULL ALTER TABLE dbo.HIEConnections ADD CreatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','CreatedAt') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD CreatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','CreatedAt') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD CreatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.TeleconsultationRequests','CreatedAt') IS NULL ALTER TABLE dbo.TeleconsultationRequests ADD CreatedAt DATETIME2 NULL;
GO
