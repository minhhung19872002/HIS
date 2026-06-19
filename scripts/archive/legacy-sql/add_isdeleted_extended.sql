USE [HIS];
GO
DECLARE @tbl TABLE(name SYSNAME);
INSERT INTO @tbl(name) VALUES
('TeleAppointments'),('TeleSessions'),('NutritionScreenings'),('DietOrders'),('HAICases'),('IsolationOrders'),('Outbreaks'),('RehabReferrals'),('RehabTreatmentPlans'),('RehabSessions'),('MedicalEquipments'),('RepairRequests'),('MedicalStaffs'),('IncidentReports'),('CAPAs'),('PortalAppointments'),('HIEConnections'),('InsuranceXMLSubmissions'),('ElectronicReferrals'),('TeleconsultationRequests'),('MCIEvents'),('MCIVictims'),('MCISituationReports');

DECLARE @sql NVARCHAR(MAX)='';
SELECT @sql=@sql + N'IF COL_LENGTH('''+name+''',''IsDeleted'') IS NULL ALTER TABLE dbo.['+name+'] ADD IsDeleted BIT NOT NULL CONSTRAINT DF_'+name+'_IsDeleted DEFAULT(0);'+CHAR(10)
FROM @tbl;
EXEC sp_executesql @sql;
GO
