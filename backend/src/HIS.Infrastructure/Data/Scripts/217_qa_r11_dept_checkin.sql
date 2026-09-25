-- 217 (QA round 11, 2026-09-25): "Kế hoạch TH › Điểm danh" — POST /api/medical-record-planning/attendance/check-in
-- used to write nothing (Success=true even for a non-existent department). One row per department per VN day.
-- Uniqueness: plain (non-filtered) unique index — check-ins are never soft-deleted, and a filtered index would
-- break every sqlcmd session writing the table (error 1934, see 204/211). The service also checks before insert.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MedicalRecordDeptCheckIns')
BEGIN
    CREATE TABLE MedicalRecordDeptCheckIns (
        Id            uniqueidentifier NOT NULL PRIMARY KEY,
        DepartmentId  uniqueidentifier NOT NULL,
        CheckInDate   datetime2        NOT NULL,
        CheckInTime   datetime2        NOT NULL,
        CheckInById   uniqueidentifier NULL,
        CheckInByName nvarchar(200)    NULL,
        Note          nvarchar(1000)   NULL,
        CreatedAt     datetime2        NOT NULL,
        CreatedBy     nvarchar(100)    NULL,
        UpdatedAt     datetime2        NULL,
        UpdatedBy     nvarchar(100)    NULL,
        IsDeleted     bit              NOT NULL DEFAULT 0,
        CONSTRAINT FK_MedicalRecordDeptCheckIns_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)
    );
END
GO

-- Draft of this script created a filtered index locally; replace it with the plain one.
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_MedicalRecordDeptCheckIns_Dept_Date'
           AND object_id = OBJECT_ID('MedicalRecordDeptCheckIns') AND has_filter = 1)
    DROP INDEX UX_MedicalRecordDeptCheckIns_Dept_Date ON MedicalRecordDeptCheckIns;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_MedicalRecordDeptCheckIns_Dept_Date'
               AND object_id = OBJECT_ID('MedicalRecordDeptCheckIns'))
    CREATE UNIQUE INDEX UX_MedicalRecordDeptCheckIns_Dept_Date ON MedicalRecordDeptCheckIns(DepartmentId, CheckInDate);
GO
