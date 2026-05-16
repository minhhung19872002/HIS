-- Create DoctorSchedules table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DoctorSchedules')
BEGIN
    CREATE TABLE DoctorSchedules (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        DoctorId UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NOT NULL,
        RoomId UNIQUEIDENTIFIER NULL,
        ScheduleDate DATE NOT NULL,
        StartTime TIME NOT NULL,
        EndTime TIME NOT NULL,
        MaxPatients INT NOT NULL DEFAULT 30,
        SlotDurationMinutes INT NOT NULL DEFAULT 30,
        ScheduleType INT NOT NULL DEFAULT 1, -- 1-Thuong, 2-Truc, 3-Hen truoc
        Note NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        DayOfWeek INT NOT NULL DEFAULT 0, -- 0=CN, 1=T2, ..., 6=T7
        IsRecurring BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,

        CONSTRAINT FK_DoctorSchedules_Users FOREIGN KEY (DoctorId) REFERENCES Users(Id),
        CONSTRAINT FK_DoctorSchedules_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)
    );

    CREATE INDEX IX_DoctorSchedules_DoctorId ON DoctorSchedules(DoctorId);
    CREATE INDEX IX_DoctorSchedules_DepartmentId ON DoctorSchedules(DepartmentId);
    CREATE INDEX IX_DoctorSchedules_ScheduleDate ON DoctorSchedules(ScheduleDate);
    CREATE INDEX IX_DoctorSchedules_DoctorDate ON DoctorSchedules(DoctorId, ScheduleDate);

    PRINT 'Created DoctorSchedules table';
END
GO

-- Seed sample doctor schedules (admin user as doctor)
DECLARE @adminId UNIQUEIDENTIFIER;
DECLARE @deptId UNIQUEIDENTIFIER;
DECLARE @roomId UNIQUEIDENTIFIER;

SELECT TOP 1 @adminId = Id FROM Users WHERE IsDeleted = 0 AND UserType = 2;
SELECT TOP 1 @deptId = Id FROM Departments WHERE IsDeleted = 0 AND IsActive = 1 AND DepartmentType = 1;
SELECT TOP 1 @roomId = Id FROM Rooms WHERE IsDeleted = 0 AND IsActive = 1 AND DepartmentId = @deptId;

IF @adminId IS NOT NULL AND @deptId IS NOT NULL
BEGIN
    -- Morning schedule Mon-Fri for next 2 weeks
    DECLARE @date DATE = CAST(GETDATE() AS DATE);
    DECLARE @endDate DATE = DATEADD(DAY, 14, @date);

    WHILE @date <= @endDate
    BEGIN
        IF DATEPART(WEEKDAY, @date) BETWEEN 2 AND 6 -- Mon-Fri
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM DoctorSchedules WHERE DoctorId = @adminId AND ScheduleDate = @date AND IsDeleted = 0)
            BEGIN
                -- Morning shift
                INSERT INTO DoctorSchedules (Id, DoctorId, DepartmentId, RoomId, ScheduleDate, StartTime, EndTime, MaxPatients, SlotDurationMinutes, ScheduleType, DayOfWeek, IsActive, IsRecurring, CreatedAt)
                VALUES (NEWID(), @adminId, @deptId, @roomId, @date, '07:30:00', '11:30:00', 30, 30, 1, DATEPART(WEEKDAY, @date) - 1, 1, 1, GETUTCDATE());

                -- Afternoon shift
                INSERT INTO DoctorSchedules (Id, DoctorId, DepartmentId, RoomId, ScheduleDate, StartTime, EndTime, MaxPatients, SlotDurationMinutes, ScheduleType, DayOfWeek, IsActive, IsRecurring, CreatedAt)
                VALUES (NEWID(), @adminId, @deptId, @roomId, @date, '13:30:00', '16:30:00', 20, 30, 1, DATEPART(WEEKDAY, @date) - 1, 1, 1, GETUTCDATE());
            END
        END
        SET @date = DATEADD(DAY, 1, @date);
    END

    PRINT 'Seeded doctor schedules for next 2 weeks';
END
GO
