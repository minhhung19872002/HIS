-- QA round 3 (r3-security, 2026-09-15): schema for the security leftovers. Runs on every startup → idempotent.
--  A. NotificationReads      — per-user read state for broadcast notifications (TargetUserId NULL). Before, one
--                              user opening a broadcast flipped Notifications.IsRead for the whole hospital.
--  B. StudyShareLinks        — failed password attempts + lockout (anonymous /study-share/access brute force).
--  C. KioskTickets           — unique ticket number per VN day + department (count+1 race on the anonymous kiosk).
--  D. InterHospitalRequests  — unique RequestCode (LV-yyyy-NNNN was Count()+1).
--  E. MedicalRecordArchives  — unique ArchiveCode (was LT{date}{Random 1000-9999}).
--  F. LabResultAccessLinks   — unique AccessToken (anonymous SMS lab-result reader looks rows up by token).
-- Every unique index is created only when no duplicates exist (PRINT + skip otherwise — never fails startup).
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

-- ------------------------------------------------------------
-- A. NotificationReads
-- ------------------------------------------------------------
IF OBJECT_ID(N'dbo.NotificationReads', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NotificationReads (
        Id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_NotificationReads PRIMARY KEY,
        NotificationId UNIQUEIDENTIFIER NOT NULL,
        UserId         UNIQUEIDENTIFIER NOT NULL,
        ReadAt         DATETIME2        NOT NULL CONSTRAINT DF_NotificationReads_ReadAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_NotificationReads_Notifications FOREIGN KEY (NotificationId) REFERENCES dbo.Notifications (Id)
    );
    PRINT 'Created NotificationReads';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_NotificationReads_Notification_User' AND object_id = OBJECT_ID(N'dbo.NotificationReads'))
    CREATE UNIQUE INDEX UX_NotificationReads_Notification_User ON dbo.NotificationReads (NotificationId, UserId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_NotificationReads_User' AND object_id = OBJECT_ID(N'dbo.NotificationReads'))
    CREATE INDEX IX_NotificationReads_User ON dbo.NotificationReads (UserId) INCLUDE (NotificationId);
GO

-- ------------------------------------------------------------
-- B. StudyShareLinks lockout
-- ------------------------------------------------------------
IF COL_LENGTH(N'dbo.StudyShareLinks', N'FailedAttemptCount') IS NULL
    ALTER TABLE dbo.StudyShareLinks ADD FailedAttemptCount INT NOT NULL CONSTRAINT DF_StudyShareLinks_FailedAttemptCount DEFAULT (0);
GO
IF COL_LENGTH(N'dbo.StudyShareLinks', N'LockedUntil') IS NULL
    ALTER TABLE dbo.StudyShareLinks ADD LockedUntil DATETIME2 NULL;
GO

-- ------------------------------------------------------------
-- C. KioskTickets: one ticket number per VN day + department
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_KioskTickets_Day_Dept_Number' AND object_id = OBJECT_ID(N'dbo.KioskTickets'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.KioskTickets GROUP BY IssueDate, DepartmentId, TicketNumber HAVING COUNT(*) > 1)
        PRINT 'SKIP UX_KioskTickets_Day_Dept_Number: duplicate ticket numbers exist';
    ELSE
        CREATE UNIQUE INDEX UX_KioskTickets_Day_Dept_Number ON dbo.KioskTickets (IssueDate, DepartmentId, TicketNumber);
END
GO

-- ------------------------------------------------------------
-- D. InterHospitalRequests.RequestCode (nvarchar(max) cannot be indexed → nvarchar(50) when data fits)
-- ------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.InterHospitalRequests') AND name = N'RequestCode' AND max_length = -1)
   AND NOT EXISTS (SELECT 1 FROM dbo.InterHospitalRequests WHERE LEN(RequestCode) > 50)
    ALTER TABLE dbo.InterHospitalRequests ALTER COLUMN RequestCode NVARCHAR(50) NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_InterHospitalRequests_RequestCode' AND object_id = OBJECT_ID(N'dbo.InterHospitalRequests'))
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.InterHospitalRequests') AND name = N'RequestCode' AND max_length > 0)
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.InterHospitalRequests GROUP BY RequestCode HAVING COUNT(*) > 1)
        PRINT 'SKIP UX_InterHospitalRequests_RequestCode: duplicate request codes exist';
    ELSE
        CREATE UNIQUE INDEX UX_InterHospitalRequests_RequestCode ON dbo.InterHospitalRequests (RequestCode);
END
GO

-- ------------------------------------------------------------
-- E. MedicalRecordArchives.ArchiveCode
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_MedicalRecordArchives_ArchiveCode' AND object_id = OBJECT_ID(N'dbo.MedicalRecordArchives'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.MedicalRecordArchives GROUP BY ArchiveCode HAVING COUNT(*) > 1)
        PRINT 'SKIP UX_MedicalRecordArchives_ArchiveCode: duplicate archive codes exist';
    ELSE
        CREATE UNIQUE INDEX UX_MedicalRecordArchives_ArchiveCode ON dbo.MedicalRecordArchives (ArchiveCode);
END
GO

-- ------------------------------------------------------------
-- F. LabResultAccessLinks.AccessToken (43-char base64url token; nvarchar(max) → nvarchar(128))
-- ------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.LabResultAccessLinks') AND name = N'AccessToken' AND max_length = -1)
   AND NOT EXISTS (SELECT 1 FROM dbo.LabResultAccessLinks WHERE LEN(AccessToken) > 128)
    ALTER TABLE dbo.LabResultAccessLinks ALTER COLUMN AccessToken NVARCHAR(128) NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_LabResultAccessLinks_AccessToken' AND object_id = OBJECT_ID(N'dbo.LabResultAccessLinks'))
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.LabResultAccessLinks') AND name = N'AccessToken' AND max_length > 0)
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.LabResultAccessLinks GROUP BY AccessToken HAVING COUNT(*) > 1)
        PRINT 'SKIP UX_LabResultAccessLinks_AccessToken: duplicate tokens exist';
    ELSE
        CREATE UNIQUE INDEX UX_LabResultAccessLinks_AccessToken ON dbo.LabResultAccessLinks (AccessToken);
END
GO
