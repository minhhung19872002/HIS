-- Create Surgery Tables for HIS Database
-- Run this script against HIS database on localhost\DOTNET

-- 1. Create OperatingRooms table (need first for foreign key)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OperatingRooms' AND xtype='U')
BEGIN
    CREATE TABLE OperatingRooms (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RoomCode NVARCHAR(50) NOT NULL,
        RoomName NVARCHAR(200) NOT NULL,
        RoomType INT NOT NULL DEFAULT 1,
        Status INT NOT NULL DEFAULT 1,
        Equipment NVARCHAR(MAX) NULL,
        Capacity INT NULL,
        Location NVARCHAR(500) NULL,
        Description NVARCHAR(1000) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created table OperatingRooms';

    -- Insert sample operating rooms
    INSERT INTO OperatingRooms (Id, RoomCode, RoomName, RoomType, Status, Location, IsActive, CreatedAt)
    VALUES
        (NEWID(), 'PM01', N'Phòng mổ 1 - Đa khoa', 1, 1, N'Tầng 3, Khu A', 1, GETDATE()),
        (NEWID(), 'PM02', N'Phòng mổ 2 - Cấp cứu', 3, 1, N'Tầng 3, Khu A', 1, GETDATE()),
        (NEWID(), 'PM03', N'Phòng mổ nhỏ', 2, 1, N'Tầng 3, Khu B', 1, GETDATE());
    PRINT 'Inserted sample operating rooms';
END
ELSE
    PRINT 'Table OperatingRooms already exists';

-- 2. Create SurgeryRequests table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SurgeryRequests' AND xtype='U')
BEGIN
    CREATE TABLE SurgeryRequests (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RequestCode NVARCHAR(50) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        ExaminationId UNIQUEIDENTIFIER NULL,
        MedicalRecordId UNIQUEIDENTIFIER NULL,
        RequestDate DATETIME2 NOT NULL DEFAULT GETDATE(),
        SurgeryType NVARCHAR(200) NOT NULL,
        RequestingDoctorId UNIQUEIDENTIFIER NOT NULL,
        Priority INT NOT NULL DEFAULT 1,
        Status INT NOT NULL DEFAULT 0,
        PreOpDiagnosis NVARCHAR(1000) NULL,
        PreOpIcdCode NVARCHAR(20) NULL,
        PlannedProcedure NVARCHAR(1000) NULL,
        EstimatedDuration INT NULL,
        AnesthesiaType INT NULL,
        Notes NVARCHAR(MAX) NULL,
        SpecialRequirements NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SurgeryRequests_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_SurgeryRequests_Users FOREIGN KEY (RequestingDoctorId) REFERENCES Users(Id)
    );
    PRINT 'Created table SurgeryRequests';
END
ELSE
    PRINT 'Table SurgeryRequests already exists';

-- 3. Create SurgerySchedules table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SurgerySchedules' AND xtype='U')
BEGIN
    CREATE TABLE SurgerySchedules (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SurgeryRequestId UNIQUEIDENTIFIER NOT NULL,
        OperatingRoomId UNIQUEIDENTIFIER NOT NULL,
        ScheduledDate DATE NOT NULL,
        ScheduledTime TIME NOT NULL,
        ScheduledDateTime DATETIME2 NOT NULL,
        EstimatedDuration INT NULL,
        SurgeonId UNIQUEIDENTIFIER NOT NULL,
        AssistantIds NVARCHAR(MAX) NULL,
        AnesthesiologistId UNIQUEIDENTIFIER NULL,
        NurseIds NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CancellationReason NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SurgerySchedules_SurgeryRequests FOREIGN KEY (SurgeryRequestId) REFERENCES SurgeryRequests(Id),
        CONSTRAINT FK_SurgerySchedules_OperatingRooms FOREIGN KEY (OperatingRoomId) REFERENCES OperatingRooms(Id),
        CONSTRAINT FK_SurgerySchedules_Surgeons FOREIGN KEY (SurgeonId) REFERENCES Users(Id)
    );
    PRINT 'Created table SurgerySchedules';
END
ELSE
    PRINT 'Table SurgerySchedules already exists';

-- 4. Create SurgeryRecords table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SurgeryRecords' AND xtype='U')
BEGIN
    CREATE TABLE SurgeryRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SurgeryScheduleId UNIQUEIDENTIFIER NOT NULL,
        ActualStartTime DATETIME2 NULL,
        ActualEndTime DATETIME2 NULL,
        ActualDuration INT NULL,
        ProcedurePerformed NVARCHAR(1000) NULL,
        ProcedureCode NVARCHAR(50) NULL,
        Findings NVARCHAR(MAX) NULL,
        Complications NVARCHAR(MAX) NULL,
        BloodLoss DECIMAL(10,2) NULL,
        Specimens NVARCHAR(MAX) NULL,
        PostOpDiagnosis NVARCHAR(1000) NULL,
        PostOpIcdCode NVARCHAR(20) NULL,
        PostOpInstructions NVARCHAR(MAX) NULL,
        PostOpCare NVARCHAR(MAX) NULL,
        Result INT NULL,
        Notes NVARCHAR(MAX) NULL,
        IsApproved BIT NOT NULL DEFAULT 0,
        ApprovedBy UNIQUEIDENTIFIER NULL,
        ApprovedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SurgeryRecords_SurgerySchedules FOREIGN KEY (SurgeryScheduleId) REFERENCES SurgerySchedules(Id)
    );
    PRINT 'Created table SurgeryRecords';
END
ELSE
    PRINT 'Table SurgeryRecords already exists';

-- 5. Create SurgeryTeamMembers table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SurgeryTeamMembers' AND xtype='U')
BEGIN
    CREATE TABLE SurgeryTeamMembers (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SurgeryRecordId UNIQUEIDENTIFIER NOT NULL,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Role INT NOT NULL,
        RoleName NVARCHAR(200) NULL,
        JoinedAt DATETIME2 NULL,
        LeftAt DATETIME2 NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SurgeryTeamMembers_SurgeryRecords FOREIGN KEY (SurgeryRecordId) REFERENCES SurgeryRecords(Id),
        CONSTRAINT FK_SurgeryTeamMembers_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    PRINT 'Created table SurgeryTeamMembers';
END
ELSE
    PRINT 'Table SurgeryTeamMembers already exists';

-- Verify tables created
SELECT 'Tables created:' AS Info;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Surgery%' OR TABLE_NAME = 'OperatingRooms';
