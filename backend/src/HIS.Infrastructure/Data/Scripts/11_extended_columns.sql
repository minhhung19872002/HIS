USE [HIS];
GO
-- PortalAppointment full fields
IF COL_LENGTH('dbo.PortalAppointments','PortalAccountId') IS NULL ALTER TABLE dbo.PortalAppointments ADD PortalAccountId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.PortalAppointments','IsPaid') IS NULL ALTER TABLE dbo.PortalAppointments ADD IsPaid BIT NOT NULL CONSTRAINT DF_PortalAppointments_IsPaid DEFAULT(0);
IF COL_LENGTH('dbo.PortalAppointments','PaymentMethod') IS NULL ALTER TABLE dbo.PortalAppointments ADD PaymentMethod NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.PortalAppointments','PaymentReference') IS NULL ALTER TABLE dbo.PortalAppointments ADD PaymentReference NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.PortalAppointments','PaidAt') IS NULL ALTER TABLE dbo.PortalAppointments ADD PaidAt DATETIME2 NULL;
IF COL_LENGTH('dbo.PortalAppointments','IsRefunded') IS NULL ALTER TABLE dbo.PortalAppointments ADD IsRefunded BIT NOT NULL CONSTRAINT DF_PortalAppointments_IsRefunded DEFAULT(0);
IF COL_LENGTH('dbo.PortalAppointments','QueueNumber') IS NULL ALTER TABLE dbo.PortalAppointments ADD QueueNumber NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.PortalAppointments','ReminderSent') IS NULL ALTER TABLE dbo.PortalAppointments ADD ReminderSent BIT NOT NULL CONSTRAINT DF_PortalAppointments_ReminderSent DEFAULT(0);
IF COL_LENGTH('dbo.PortalAppointments','ReminderSentAt') IS NULL ALTER TABLE dbo.PortalAppointments ADD ReminderSentAt DATETIME2 NULL;

-- HIEConnection full fields
IF COL_LENGTH('dbo.HIEConnections','AuthType') IS NULL ALTER TABLE dbo.HIEConnections ADD AuthType NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.HIEConnections','ClientId') IS NULL ALTER TABLE dbo.HIEConnections ADD ClientId NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.HIEConnections','ClientSecretEncrypted') IS NULL ALTER TABLE dbo.HIEConnections ADD ClientSecretEncrypted NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.HIEConnections','CertificatePath') IS NULL ALTER TABLE dbo.HIEConnections ADD CertificatePath NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HIEConnections','LastSuccessfulConnection') IS NULL ALTER TABLE dbo.HIEConnections ADD LastSuccessfulConnection DATETIME2 NULL;
IF COL_LENGTH('dbo.HIEConnections','LastFailedConnection') IS NULL ALTER TABLE dbo.HIEConnections ADD LastFailedConnection DATETIME2 NULL;
IF COL_LENGTH('dbo.HIEConnections','LastErrorMessage') IS NULL ALTER TABLE dbo.HIEConnections ADD LastErrorMessage NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.HIEConnections','IsActive') IS NULL ALTER TABLE dbo.HIEConnections ADD IsActive BIT NOT NULL CONSTRAINT DF_HIEConnections_IsActive DEFAULT(1);

-- InsuranceXMLSubmission full fields
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','ResponseAt') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD ResponseAt DATETIME2 NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','FilePath') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD FilePath NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','Checksum') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD Checksum NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','SubmittedById') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD SubmittedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','PortalTransactionId') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD PortalTransactionId NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','PortalResponse') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD PortalResponse NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','AcceptedRecords') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD AcceptedRecords INT NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','RejectedRecords') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD RejectedRecords INT NULL;
IF COL_LENGTH('dbo.InsuranceXMLSubmissions','RejectionReasons') IS NULL ALTER TABLE dbo.InsuranceXMLSubmissions ADD RejectionReasons NVARCHAR(MAX) NULL;

-- ElectronicReferral full fields
IF COL_LENGTH('dbo.ElectronicReferrals','ExaminationId') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD ExaminationId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','AdmissionId') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD AdmissionId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','ReferredById') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD ReferredById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','ToDepartment') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD ToDepartment NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','IcdCodes') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD IcdCodes NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','ClinicalSummary') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD ClinicalSummary NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','TreatmentGiven') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD TreatmentGiven NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','AttachedDocuments') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD AttachedDocuments NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','ResponseAt') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD ResponseAt DATETIME2 NULL;
IF COL_LENGTH('dbo.ElectronicReferrals','ResponseMessage') IS NULL ALTER TABLE dbo.ElectronicReferrals ADD ResponseMessage NVARCHAR(MAX) NULL;

-- TeleconsultationRequest full fields
IF COL_LENGTH('dbo.TeleconsultationRequests','AdmissionId') IS NULL ALTER TABLE dbo.TeleconsultationRequests ADD AdmissionId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.TeleconsultationRequests','AttachedFiles') IS NULL ALTER TABLE dbo.TeleconsultationRequests ADD AttachedFiles NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.TeleconsultationRequests','StartedAt') IS NULL ALTER TABLE dbo.TeleconsultationRequests ADD StartedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.TeleconsultationRequests','SessionUrl') IS NULL ALTER TABLE dbo.TeleconsultationRequests ADD SessionUrl NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.TeleconsultationRequests','ConsultantName') IS NULL ALTER TABLE dbo.TeleconsultationRequests ADD ConsultantName NVARCHAR(255) NULL;

-- MCIEvent full fields
IF COL_LENGTH('dbo.MCIEvents','ReportedToAuthority') IS NULL ALTER TABLE dbo.MCIEvents ADD ReportedToAuthority BIT NOT NULL CONSTRAINT DF_MCIEvents_ReportedToAuthority DEFAULT(0);
IF COL_LENGTH('dbo.MCIEvents','ReportedAt') IS NULL ALTER TABLE dbo.MCIEvents ADD ReportedAt DATETIME2 NULL;
-- Fix type for ORsCleared to bit
IF COL_LENGTH('dbo.MCIEvents','ORsCleared') IS NOT NULL
BEGIN
    DECLARE @type NVARCHAR(128) = TYPE_NAME((SELECT user_type_id FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MCIEvents') AND name='ORsCleared'));
    IF @type <> 'bit'
    BEGIN
        ALTER TABLE dbo.MCIEvents DROP CONSTRAINT DF_MCIEvents_ORsCleared;
        ALTER TABLE dbo.MCIEvents DROP COLUMN ORsCleared;
        ALTER TABLE dbo.MCIEvents ADD ORsCleared BIT NOT NULL CONSTRAINT DF_MCIEvents_ORsCleared DEFAULT(0);
    END
END
ELSE
    ALTER TABLE dbo.MCIEvents ADD ORsCleared BIT NOT NULL CONSTRAINT DF_MCIEvents_ORsCleared DEFAULT(0);

-- MCIVictim full fields
IF COL_LENGTH('dbo.MCIVictims','TriagedById') IS NULL ALTER TABLE dbo.MCIVictims ADD TriagedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.MCIVictims','BodyAreasAffected') IS NULL ALTER TABLE dbo.MCIVictims ADD BodyAreasAffected NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.MCIVictims','AdmissionId') IS NULL ALTER TABLE dbo.MCIVictims ADD AdmissionId UNIQUEIDENTIFIER NULL;

-- MCISituationReport full fields
IF COL_LENGTH('dbo.MCISituationReports','TotalArrived') IS NULL ALTER TABLE dbo.MCISituationReports ADD TotalArrived INT NOT NULL CONSTRAINT DF_MCIRep_TotalArrived DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','RedCount') IS NULL ALTER TABLE dbo.MCISituationReports ADD RedCount INT NOT NULL CONSTRAINT DF_MCIRep_RedCount DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','YellowCount') IS NULL ALTER TABLE dbo.MCISituationReports ADD YellowCount INT NOT NULL CONSTRAINT DF_MCIRep_YellowCount DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','GreenCount') IS NULL ALTER TABLE dbo.MCISituationReports ADD GreenCount INT NOT NULL CONSTRAINT DF_MCIRep_GreenCount DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','BlackCount') IS NULL ALTER TABLE dbo.MCISituationReports ADD BlackCount INT NOT NULL CONSTRAINT DF_MCIRep_BlackCount DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','InED') IS NULL ALTER TABLE dbo.MCISituationReports ADD InED INT NOT NULL CONSTRAINT DF_MCIRep_InED DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','InOR') IS NULL ALTER TABLE dbo.MCISituationReports ADD InOR INT NOT NULL CONSTRAINT DF_MCIRep_InOR DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','InICU') IS NULL ALTER TABLE dbo.MCISituationReports ADD InICU INT NOT NULL CONSTRAINT DF_MCIRep_InICU DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','Admitted') IS NULL ALTER TABLE dbo.MCISituationReports ADD Admitted INT NOT NULL CONSTRAINT DF_MCIRep_Admitted DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','Discharged') IS NULL ALTER TABLE dbo.MCISituationReports ADD Discharged INT NOT NULL CONSTRAINT DF_MCIRep_Discharged DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','Transferred') IS NULL ALTER TABLE dbo.MCISituationReports ADD Transferred INT NOT NULL CONSTRAINT DF_MCIRep_Transferred DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','Deceased') IS NULL ALTER TABLE dbo.MCISituationReports ADD Deceased INT NOT NULL CONSTRAINT DF_MCIRep_Deceased DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','BedsAvailable') IS NULL ALTER TABLE dbo.MCISituationReports ADD BedsAvailable INT NOT NULL CONSTRAINT DF_MCIRep_BedsAvailable DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','ORsInUse') IS NULL ALTER TABLE dbo.MCISituationReports ADD ORsInUse INT NOT NULL CONSTRAINT DF_MCIRep_ORsInUse DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','VentilatorsInUse') IS NULL ALTER TABLE dbo.MCISituationReports ADD VentilatorsInUse INT NOT NULL CONSTRAINT DF_MCIRep_VentInUse DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','BloodSupplyStatus') IS NULL ALTER TABLE dbo.MCISituationReports ADD BloodSupplyStatus NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.MCISituationReports','CriticalSupplyIssues') IS NULL ALTER TABLE dbo.MCISituationReports ADD CriticalSupplyIssues NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.MCISituationReports','DoctorsOnDuty') IS NULL ALTER TABLE dbo.MCISituationReports ADD DoctorsOnDuty INT NOT NULL CONSTRAINT DF_MCIRep_DocOnDuty DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','NursesOnDuty') IS NULL ALTER TABLE dbo.MCISituationReports ADD NursesOnDuty INT NOT NULL CONSTRAINT DF_MCIRep_NurseOnDuty DEFAULT(0);
IF COL_LENGTH('dbo.MCISituationReports','ImmediateNeeds') IS NULL ALTER TABLE dbo.MCISituationReports ADD ImmediateNeeds NVARCHAR(MAX) NULL;
GO
