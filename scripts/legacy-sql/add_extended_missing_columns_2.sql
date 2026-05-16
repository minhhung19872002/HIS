USE [HIS];
GO
-- PortalAppointments extra columns
IF COL_LENGTH('dbo.PortalAppointments','BookingCode') IS NULL ALTER TABLE dbo.PortalAppointments ADD BookingCode NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.PortalAppointments','BookingSource') IS NULL ALTER TABLE dbo.PortalAppointments ADD BookingSource NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.PortalAppointments','Priority') IS NULL ALTER TABLE dbo.PortalAppointments ADD Priority INT NULL;
IF COL_LENGTH('dbo.PortalAppointments','CheckInAt') IS NULL ALTER TABLE dbo.PortalAppointments ADD CheckInAt DATETIME2 NULL;
IF COL_LENGTH('dbo.PortalAppointments','ConfirmedAt') IS NULL ALTER TABLE dbo.PortalAppointments ADD ConfirmedAt DATETIME2 NULL;

-- HIEConnections extra columns
IF COL_LENGTH('dbo.HIEConnections','ClientSecretEncrypted') IS NULL ALTER TABLE dbo.HIEConnections ADD ClientSecretEncrypted NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.HIEConnections','Scope') IS NULL ALTER TABLE dbo.HIEConnections ADD Scope NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HIEConnections','TokenEndpoint') IS NULL ALTER TABLE dbo.HIEConnections ADD TokenEndpoint NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HIEConnections','ApiVersion') IS NULL ALTER TABLE dbo.HIEConnections ADD ApiVersion NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.HIEConnections','TimeoutSeconds') IS NULL ALTER TABLE dbo.HIEConnections ADD TimeoutSeconds INT NULL;
IF COL_LENGTH('dbo.HIEConnections','RetryCount') IS NULL ALTER TABLE dbo.HIEConnections ADD RetryCount INT NULL;
IF COL_LENGTH('dbo.HIEConnections','CreatedAt') IS NULL ALTER TABLE dbo.HIEConnections ADD CreatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.HIEConnections','UpdatedAt') IS NULL ALTER TABLE dbo.HIEConnections ADD UpdatedAt DATETIME2 NULL;

-- MCIEvents extra columns
IF COL_LENGTH('dbo.MCIEvents','BedsActivated') IS NULL ALTER TABLE dbo.MCIEvents ADD BedsActivated INT NOT NULL CONSTRAINT DF_MCIEvents_BedsActivated DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','ORActivated') IS NULL ALTER TABLE dbo.MCIEvents ADD ORActivated INT NOT NULL CONSTRAINT DF_MCIEvents_ORActivated DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','ICUBedsActivated') IS NULL ALTER TABLE dbo.MCIEvents ADD ICUBedsActivated INT NOT NULL CONSTRAINT DF_MCIEvents_ICUBedsActivated DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','VentilatorsActivated') IS NULL ALTER TABLE dbo.MCIEvents ADD VentilatorsActivated INT NOT NULL CONSTRAINT DF_MCIEvents_VentilatorsActivated DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','BloodUnitsReserved') IS NULL ALTER TABLE dbo.MCIEvents ADD BloodUnitsReserved INT NOT NULL CONSTRAINT DF_MCIEvents_BloodUnitsReserved DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','SuppliesUsedCost') IS NULL ALTER TABLE dbo.MCIEvents ADD SuppliesUsedCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_MCIEvents_SuppliesUsedCost DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','AdditionalBudget') IS NULL ALTER TABLE dbo.MCIEvents ADD AdditionalBudget DECIMAL(18,2) NOT NULL CONSTRAINT DF_MCIEvents_AdditionalBudget DEFAULT(0);
GO
