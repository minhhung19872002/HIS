USE [HIS];
GO
IF COL_LENGTH('dbo.PortalAppointments','CheckedInAt') IS NULL ALTER TABLE dbo.PortalAppointments ADD CheckedInAt DATETIME2 NULL;
IF COL_LENGTH('dbo.HIEConnections','LastFailedConnection') IS NULL ALTER TABLE dbo.HIEConnections ADD LastFailedConnection DATETIME2 NULL;
IF COL_LENGTH('dbo.MCIEvents','ORsCleared') IS NULL ALTER TABLE dbo.MCIEvents ADD ORsCleared INT NOT NULL CONSTRAINT DF_MCIEvents_ORsCleared DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','BedsCleared') IS NULL ALTER TABLE dbo.MCIEvents ADD BedsCleared INT NOT NULL CONSTRAINT DF_MCIEvents_BedsCleared DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','ICUBedsCleared') IS NULL ALTER TABLE dbo.MCIEvents ADD ICUBedsCleared INT NOT NULL CONSTRAINT DF_MCIEvents_ICUBedsCleared DEFAULT(0);
GO
