USE [HIS];
GO
DECLARE @tbl TABLE(name SYSNAME);
INSERT INTO @tbl(name) VALUES
('TeleAppointments'),('TeleSessions'),('NutritionScreenings'),('DietOrders'),('HAICases'),('IsolationOrders'),('Outbreaks'),('RehabReferrals'),('RehabTreatmentPlans'),('RehabSessions'),('MedicalEquipments'),('RepairRequests'),('MedicalStaffs'),('IncidentReports'),('CAPAs'),('PortalAppointments'),('HIEConnections'),('InsuranceXMLSubmissions'),('ElectronicReferrals'),('TeleconsultationRequests'),('MCIEvents'),('MCIVictims'),('MCISituationReports');

DECLARE @sql NVARCHAR(MAX)='';
SELECT @sql=@sql + N'
IF COL_LENGTH('''+name+''',''CreatedBy'') IS NULL ALTER TABLE dbo.['+name+'] ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('''+name+''',''UpdatedBy'') IS NULL ALTER TABLE dbo.['+name+'] ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('''+name+''',''UpdatedAt'') IS NULL ALTER TABLE dbo.['+name+'] ADD UpdatedAt DATETIME2 NULL;'
FROM @tbl;
EXEC sp_executesql @sql;

IF COL_LENGTH('dbo.PortalAppointments','BookingFee') IS NULL ALTER TABLE dbo.PortalAppointments ADD BookingFee DECIMAL(18,2) NOT NULL CONSTRAINT DF_PortalAppointments_BookingFee DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','BloodBankAlerted') IS NULL ALTER TABLE dbo.MCIEvents ADD BloodBankAlerted BIT NOT NULL CONSTRAINT DF_MCIEvents_BloodBankAlerted DEFAULT(0);
GO
