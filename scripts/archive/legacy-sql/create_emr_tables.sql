-- Create missing EMR tables: TreatmentSheets, ConsultationRecords, NursingCareSheets
-- Idempotent: uses IF NOT EXISTS

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TreatmentSheets')
BEGIN
    CREATE TABLE TreatmentSheets (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ExaminationId UNIQUEIDENTIFIER NOT NULL,
        TreatmentDate DATETIME2 NOT NULL,
        [Day] INT NOT NULL DEFAULT 1,
        DoctorOrders NVARCHAR(MAX) NULL,
        DietOrders NVARCHAR(MAX) NULL,
        NursingCare NVARCHAR(MAX) NULL,
        PatientCondition NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        DoctorId UNIQUEIDENTIFIER NULL,
        NurseId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TreatmentSheets_Examinations FOREIGN KEY (ExaminationId) REFERENCES Examinations(Id),
        CONSTRAINT FK_TreatmentSheets_Doctor FOREIGN KEY (DoctorId) REFERENCES Users(Id),
        CONSTRAINT FK_TreatmentSheets_Nurse FOREIGN KEY (NurseId) REFERENCES Users(Id)
    );
    PRINT 'Created TreatmentSheets table';
END
ELSE
    PRINT 'TreatmentSheets table already exists';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConsultationRecords')
BEGIN
    CREATE TABLE ConsultationRecords (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ExaminationId UNIQUEIDENTIFIER NOT NULL,
        ConsultationDate DATETIME2 NOT NULL,
        ConsultationType INT NOT NULL DEFAULT 1,
        Reason NVARCHAR(MAX) NULL,
        Summary NVARCHAR(MAX) NULL,
        Conclusion NVARCHAR(MAX) NULL,
        TreatmentPlan NVARCHAR(MAX) NULL,
        PresidedByUserId UNIQUEIDENTIFIER NULL,
        SecretaryUserId UNIQUEIDENTIFIER NULL,
        Participants NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ConsultationRecords_Examinations FOREIGN KEY (ExaminationId) REFERENCES Examinations(Id),
        CONSTRAINT FK_ConsultationRecords_President FOREIGN KEY (PresidedByUserId) REFERENCES Users(Id),
        CONSTRAINT FK_ConsultationRecords_Secretary FOREIGN KEY (SecretaryUserId) REFERENCES Users(Id)
    );
    PRINT 'Created ConsultationRecords table';
END
ELSE
    PRINT 'ConsultationRecords table already exists';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NursingCareSheets')
BEGIN
    CREATE TABLE NursingCareSheets (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ExaminationId UNIQUEIDENTIFIER NOT NULL,
        CareDate DATETIME2 NOT NULL,
        CareTime TIME NULL,
        Temperature DECIMAL(5,2) NULL,
        Pulse INT NULL,
        BloodPressureSystolic INT NULL,
        BloodPressureDiastolic INT NULL,
        RespiratoryRate INT NULL,
        SpO2 DECIMAL(5,2) NULL,
        NursingDiagnosis NVARCHAR(MAX) NULL,
        NursingInterventions NVARCHAR(MAX) NULL,
        Evaluation NVARCHAR(MAX) NULL,
        PatientResponse NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        NurseId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_NursingCareSheets_Examinations FOREIGN KEY (ExaminationId) REFERENCES Examinations(Id),
        CONSTRAINT FK_NursingCareSheets_Nurse FOREIGN KEY (NurseId) REFERENCES Users(Id)
    );
    PRINT 'Created NursingCareSheets table';
END
ELSE
    PRINT 'NursingCareSheets table already exists';
GO
