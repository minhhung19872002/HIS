-- Training, Clinical Direction, Research tables (NangCap17 Module D)
-- Idempotent: IF NOT EXISTS

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TrainingClasses')
BEGIN
    CREATE TABLE TrainingClasses (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ClassCode NVARCHAR(50) NOT NULL,
        ClassName NVARCHAR(200) NOT NULL,
        TrainingType INT NOT NULL DEFAULT 1,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NULL,
        MaxStudents INT NOT NULL DEFAULT 30,
        Location NVARCHAR(200) NULL,
        InstructorId UNIQUEIDENTIFIER NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        [Description] NVARCHAR(MAX) NULL,
        CreditHours DECIMAL(10,2) NOT NULL DEFAULT 0,
        [Status] INT NOT NULL DEFAULT 1,
        Fee DECIMAL(18,2) NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_TrainingClasses_Status ON TrainingClasses([Status]);
    CREATE INDEX IX_TrainingClasses_TrainingType ON TrainingClasses(TrainingType);
    CREATE INDEX IX_TrainingClasses_StartDate ON TrainingClasses(StartDate);
    PRINT 'Created table TrainingClasses';
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TrainingStudents')
BEGIN
    CREATE TABLE TrainingStudents (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ClassId UNIQUEIDENTIFIER NOT NULL,
        StaffId UNIQUEIDENTIFIER NULL,
        ExternalName NVARCHAR(200) NULL,
        StudentType INT NOT NULL DEFAULT 1,
        AttendanceStatus INT NOT NULL DEFAULT 1,
        Score DECIMAL(5,2) NULL,
        CertificateNumber NVARCHAR(100) NULL,
        CertificateDate DATETIME2 NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TrainingStudents_Class FOREIGN KEY (ClassId) REFERENCES TrainingClasses(Id)
    );
    CREATE INDEX IX_TrainingStudents_ClassId ON TrainingStudents(ClassId);
    CREATE INDEX IX_TrainingStudents_StaffId ON TrainingStudents(StaffId);
    CREATE INDEX IX_TrainingStudents_AttendanceStatus ON TrainingStudents(AttendanceStatus);
    PRINT 'Created table TrainingStudents';
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ClinicalDirections')
BEGIN
    CREATE TABLE ClinicalDirections (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        DirectionType INT NOT NULL DEFAULT 1,
        PartnerHospital NVARCHAR(200) NOT NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NULL,
        Objectives NVARCHAR(MAX) NULL,
        [Status] INT NOT NULL DEFAULT 1,
        ResponsibleDoctorId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_ClinicalDirections_Status ON ClinicalDirections([Status]);
    CREATE INDEX IX_ClinicalDirections_DirectionType ON ClinicalDirections(DirectionType);
    PRINT 'Created table ClinicalDirections';
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ResearchProjects')
BEGIN
    CREATE TABLE ResearchProjects (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ProjectCode NVARCHAR(50) NOT NULL,
        Title NVARCHAR(500) NOT NULL,
        [Level] INT NOT NULL DEFAULT 3,
        PrincipalInvestigatorId UNIQUEIDENTIFIER NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NULL,
        Budget DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Status] INT NOT NULL DEFAULT 1,
        Abstract NVARCHAR(MAX) NULL,
        Findings NVARCHAR(MAX) NULL,
        PublicationInfo NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_ResearchProjects_Status ON ResearchProjects([Status]);
    CREATE INDEX IX_ResearchProjects_Level ON ResearchProjects([Level]);
    PRINT 'Created table ResearchProjects';
END

PRINT 'Training/Research tables created successfully';
