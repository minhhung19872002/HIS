-- Create Appointments and AppointmentServices tables
USE HIS;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Appointments')
BEGIN
    CREATE TABLE Appointments (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AppointmentCode NVARCHAR(50) NOT NULL,
        AppointmentDate DATETIME2 NOT NULL,
        AppointmentTime TIME NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PreviousMedicalRecordId UNIQUEIDENTIFIER NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        RoomId UNIQUEIDENTIFIER NULL,
        DoctorId UNIQUEIDENTIFIER NULL,
        AppointmentType INT NOT NULL DEFAULT 1,
        Reason NVARCHAR(500) NULL,
        Note NVARCHAR(500) NULL,
        Notes NVARCHAR(1000) NULL,
        Status INT NOT NULL DEFAULT 0,
        IsReminderSent BIT NOT NULL DEFAULT 0,
        ReminderSentAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_Appointments_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_Appointments_MedicalRecords FOREIGN KEY (PreviousMedicalRecordId) REFERENCES MedicalRecords(Id),
        CONSTRAINT FK_Appointments_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_Appointments_Rooms FOREIGN KEY (RoomId) REFERENCES Rooms(Id),
        CONSTRAINT FK_Appointments_Doctors FOREIGN KEY (DoctorId) REFERENCES Users(Id)
    );
    CREATE INDEX IX_Appointments_PatientId ON Appointments(PatientId);
    CREATE INDEX IX_Appointments_AppointmentDate ON Appointments(AppointmentDate);
    CREATE INDEX IX_Appointments_Status ON Appointments(Status);
    CREATE INDEX IX_Appointments_AppointmentCode ON Appointments(AppointmentCode);
    PRINT 'Created table Appointments';
END
ELSE
    PRINT 'Table Appointments already exists';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AppointmentServices')
BEGIN
    CREATE TABLE AppointmentServices (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AppointmentId UNIQUEIDENTIFIER NOT NULL,
        ServiceId UNIQUEIDENTIFIER NOT NULL,
        Quantity INT NOT NULL DEFAULT 1,
        Note NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AppointmentServices_Appointments FOREIGN KEY (AppointmentId) REFERENCES Appointments(Id),
        CONSTRAINT FK_AppointmentServices_Services FOREIGN KEY (ServiceId) REFERENCES Services(Id)
    );
    CREATE INDEX IX_AppointmentServices_AppointmentId ON AppointmentServices(AppointmentId);
    PRINT 'Created table AppointmentServices';
END
ELSE
    PRINT 'Table AppointmentServices already exists';
GO
