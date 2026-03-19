-- NangCap12: Extended Rehabilitation Tables
-- BV Phuc hoi chuc nang Dong Thap - VLTL/PHCN chuyen sau

-- Rehab Exercises catalog
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RehabExercises')
BEGIN
    CREATE TABLE RehabExercises (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(50) NOT NULL,
        Name NVARCHAR(300) NOT NULL,
        Category NVARCHAR(100) NULL, -- PT, OT, ST, Electrotherapy, Hydrotherapy
        BodyPart NVARCHAR(100) NULL, -- UpperLimb, LowerLimb, Trunk, Neck, etc.
        Description NVARCHAR(MAX) NULL,
        Instructions NVARCHAR(MAX) NULL,
        Contraindications NVARCHAR(MAX) NULL,
        DefaultSets INT NULL,
        DefaultReps INT NULL,
        DefaultDurationMinutes INT NULL,
        DifficultyLevel INT DEFAULT 1, -- 1=Easy, 2=Medium, 3=Hard
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_RehabExercises_Category ON RehabExercises(Category);
    CREATE INDEX IX_RehabExercises_Code ON RehabExercises(Code);
END

-- Rehab Session Notes (detailed per-exercise tracking)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RehabSessionNotes')
BEGIN
    CREATE TABLE RehabSessionNotes (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SessionId UNIQUEIDENTIFIER NOT NULL,
        ExerciseId UNIQUEIDENTIFIER NULL,
        ExerciseName NVARCHAR(300) NULL,
        SetsCompleted INT NULL,
        RepsCompleted INT NULL,
        DurationMinutes INT NULL,
        PainLevel INT NULL, -- 0-10 VAS
        PatientResponse NVARCHAR(500) NULL, -- Excellent, Good, Fair, Poor
        TherapistNotes NVARCHAR(MAX) NULL,
        SortOrder INT DEFAULT 0,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_RehabSessionNotes_SessionId ON RehabSessionNotes(SessionId);
END

-- Add missing columns to existing RehabReferrals if needed
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'RehabReferrals')
    AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RehabReferrals') AND name = 'Priority')
BEGIN
    ALTER TABLE RehabReferrals ADD Priority INT DEFAULT 2; -- 1=Urgent, 2=Normal, 3=Low
    ALTER TABLE RehabReferrals ADD InsuranceNumber NVARCHAR(50) NULL;
    ALTER TABLE RehabReferrals ADD ReferringDoctor NVARCHAR(200) NULL;
    ALTER TABLE RehabReferrals ADD ReferringDepartment NVARCHAR(200) NULL;
END

-- Add missing columns to existing RehabTreatmentPlans if needed
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'RehabTreatmentPlans')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RehabTreatmentPlans') AND name = 'GoalsJson')
        ALTER TABLE RehabTreatmentPlans ADD GoalsJson NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RehabTreatmentPlans') AND name = 'TherapistId')
        ALTER TABLE RehabTreatmentPlans ADD TherapistId UNIQUEIDENTIFIER NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RehabTreatmentPlans') AND name = 'TherapistName')
        ALTER TABLE RehabTreatmentPlans ADD TherapistName NVARCHAR(200) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RehabTreatmentPlans') AND name = 'ReviewDate')
        ALTER TABLE RehabTreatmentPlans ADD ReviewDate DATETIME2 NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RehabTreatmentPlans') AND name = 'DischargeDate')
        ALTER TABLE RehabTreatmentPlans ADD DischargeDate DATETIME2 NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RehabTreatmentPlans') AND name = 'DischargeSummary')
        ALTER TABLE RehabTreatmentPlans ADD DischargeSummary NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RehabTreatmentPlans') AND name = 'OutcomeScore')
        ALTER TABLE RehabTreatmentPlans ADD OutcomeScore INT NULL;
END

-- Seed sample exercises for rehabilitation hospital
IF NOT EXISTS (SELECT TOP 1 1 FROM RehabExercises)
BEGIN
    INSERT INTO RehabExercises (Id, Code, Name, Category, BodyPart, Description, DefaultSets, DefaultReps, DefaultDurationMinutes, DifficultyLevel) VALUES
    (NEWID(), 'PT-001', N'Tập vận động thụ động chi trên', 'PT', 'UpperLimb', N'Vận động thụ động khớp vai, khuỷu, cổ tay', 3, 10, 15, 1),
    (NEWID(), 'PT-002', N'Tập vận động thụ động chi dưới', 'PT', 'LowerLimb', N'Vận động thụ động khớp háng, gối, cổ chân', 3, 10, 15, 1),
    (NEWID(), 'PT-003', N'Tập đi với khung tập đi', 'PT', 'LowerLimb', N'Tập đi có hỗ trợ khung/nạng', 1, 1, 20, 2),
    (NEWID(), 'PT-004', N'Tập thăng bằng đứng', 'PT', 'Trunk', N'Tập thăng bằng tĩnh và động', 3, 5, 15, 2),
    (NEWID(), 'PT-005', N'Tập sức mạnh cơ tứ đầu', 'PT', 'LowerLimb', N'Tập tăng cường sức mạnh nhóm cơ tứ đầu đùi', 3, 15, 10, 2),
    (NEWID(), 'PT-006', N'Điện xung kích thích cơ', 'Electrotherapy', 'General', N'Kích thích điện cơ (EMS/FES)', 1, 1, 20, 1),
    (NEWID(), 'PT-007', N'Siêu âm trị liệu', 'Electrotherapy', 'General', N'Siêu âm liều điều trị', 1, 1, 10, 1),
    (NEWID(), 'PT-008', N'Laser trị liệu', 'Electrotherapy', 'General', N'Laser nội mạch hoặc ngoại vi', 1, 1, 15, 1),
    (NEWID(), 'OT-001', N'Tập chức năng tay - cầm nắm', 'OT', 'UpperLimb', N'Tập cầm nắm, xoay, bấm các dụng cụ', 3, 10, 15, 2),
    (NEWID(), 'OT-002', N'Tập sinh hoạt hàng ngày (ADL)', 'OT', 'General', N'Tập mặc quần áo, ăn uống, vệ sinh cá nhân', 1, 1, 30, 2),
    (NEWID(), 'ST-001', N'Tập nuốt (Dysphagia)', 'ST', 'Neck', N'Bài tập nuốt cho bệnh nhân khó nuốt', 3, 10, 15, 2),
    (NEWID(), 'ST-002', N'Tập phát âm - ngôn ngữ', 'ST', 'General', N'Luyện phát âm, ngôn ngữ trị liệu', 1, 1, 30, 2),
    (NEWID(), 'HY-001', N'Thủy trị liệu - bể bơi', 'Hydrotherapy', 'General', N'Tập vận động trong nước ấm', 1, 1, 30, 1),
    (NEWID(), 'PT-009', N'Tập hô hấp', 'PT', 'Trunk', N'Tập thở bụng, thở cơ hoành, ho có hiệu quả', 3, 10, 10, 1),
    (NEWID(), 'PT-010', N'Xoa bóp bấm huyệt', 'Traditional', 'General', N'Xoa bóp bấm huyệt y học cổ truyền', 1, 1, 30, 1);

    PRINT 'Seeded 15 rehabilitation exercises';
END

PRINT 'NangCap12: Rehabilitation tables created/updated successfully';
