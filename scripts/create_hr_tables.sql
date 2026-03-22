-- ==============================================================
-- HR Enhancement Tables for NangCap13 Section XV
-- Idempotent script (IF NOT EXISTS)
-- ==============================================================

USE HIS;
GO

-- 1. HR Catalogs (danh muc nhan su da nang)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HRCatalogs')
BEGIN
    CREATE TABLE HRCatalogs (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CatalogType NVARCHAR(50) NOT NULL,   -- Position, JobTitle, CivilServantRank, SalaryGrade, ContractType, InsuranceType, EducationLevel, AwardType, DisciplineType, LeaveType, ShiftType, CertificateType, Ethnicity, Religion, Nationality
        Code NVARCHAR(50) NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_HRCatalogs_CatalogType ON HRCatalogs(CatalogType);
    CREATE INDEX IX_HRCatalogs_Code ON HRCatalogs(Code);
    PRINT 'Created table HRCatalogs';
END
GO

-- 2. Staff Contracts (hop dong lao dong)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StaffContracts')
BEGIN
    CREATE TABLE StaffContracts (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        StaffId UNIQUEIDENTIFIER NOT NULL,
        ContractType NVARCHAR(50) NOT NULL,   -- Probation, FixedTerm, Indefinite, Seasonal, Collaboration
        ContractNumber NVARCHAR(50) NOT NULL,
        StartDate DATE NOT NULL,
        EndDate DATE NULL,
        Terms NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,        -- 0=Active, 1=Expired, 2=Terminated, 3=Renewed
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_StaffContracts_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    CREATE INDEX IX_StaffContracts_StaffId ON StaffContracts(StaffId);
    CREATE INDEX IX_StaffContracts_Status_EndDate ON StaffContracts(Status, EndDate);
    PRINT 'Created table StaffContracts';
END
GO

-- 3. Salary Records (lich su luong)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SalaryRecords')
BEGIN
    CREATE TABLE SalaryRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        StaffId UNIQUEIDENTIFIER NOT NULL,
        SalaryGrade NVARCHAR(50) NOT NULL,
        SalaryCoefficient NVARCHAR(20) NOT NULL,
        BaseSalary DECIMAL(18,2) NOT NULL DEFAULT 0,
        Allowance DECIMAL(18,2) NOT NULL DEFAULT 0,
        EffectiveDate DATE NOT NULL,
        DecisionNumber NVARCHAR(100) NULL,
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SalaryRecords_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    CREATE INDEX IX_SalaryRecords_StaffId ON SalaryRecords(StaffId);
    CREATE INDEX IX_SalaryRecords_EffectiveDate ON SalaryRecords(EffectiveDate);
    PRINT 'Created table SalaryRecords';
END
GO

-- 4. Leave Requests (yeu cau nghi phep)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LeaveRequests')
BEGIN
    CREATE TABLE LeaveRequests (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        StaffId UNIQUEIDENTIFIER NOT NULL,
        LeaveType NVARCHAR(50) NOT NULL,      -- Annual, Sick, Maternity, Unpaid, Compassionate, Study, Other
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        TotalDays DECIMAL(5,1) NOT NULL,
        Reason NVARCHAR(500) NULL,
        Status INT NOT NULL DEFAULT 0,        -- 0=Pending, 1=Approved, 2=Rejected, 3=Cancelled
        ApprovedBy UNIQUEIDENTIFIER NULL,
        ApprovedAt DATETIME2 NULL,
        ApproverNote NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_LeaveRequests_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    CREATE INDEX IX_LeaveRequests_StaffId ON LeaveRequests(StaffId);
    CREATE INDEX IX_LeaveRequests_Status ON LeaveRequests(Status);
    CREATE INDEX IX_LeaveRequests_StartDate ON LeaveRequests(StartDate);
    PRINT 'Created table LeaveRequests';
END
GO

-- 5. Attendance Records (cham cong)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AttendanceRecords')
BEGIN
    CREATE TABLE AttendanceRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        StaffId UNIQUEIDENTIFIER NOT NULL,
        WorkDate DATE NOT NULL,
        CheckInTime DATETIME2 NULL,
        CheckOutTime DATETIME2 NULL,
        ShiftType NVARCHAR(50) NOT NULL DEFAULT 'Morning',  -- Morning, Afternoon, Night, AllDay
        WorkHours DECIMAL(5,2) NOT NULL DEFAULT 0,
        OvertimeHours DECIMAL(5,2) NOT NULL DEFAULT 0,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Present',     -- Present, Absent, Leave, Holiday, HalfDay
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AttendanceRecords_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    CREATE INDEX IX_AttendanceRecords_StaffId_WorkDate ON AttendanceRecords(StaffId, WorkDate);
    CREATE INDEX IX_AttendanceRecords_WorkDate ON AttendanceRecords(WorkDate);
    PRINT 'Created table AttendanceRecords';
END
GO

-- 6. Overtime Records (lam them gio)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OvertimeRecords')
BEGIN
    CREATE TABLE OvertimeRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        StaffId UNIQUEIDENTIFIER NOT NULL,
        OvertimeDate DATE NOT NULL,
        StartTime DATETIME2 NOT NULL,
        EndTime DATETIME2 NOT NULL,
        Hours DECIMAL(5,2) NOT NULL DEFAULT 0,
        Reason NVARCHAR(500) NULL,
        Status INT NOT NULL DEFAULT 0,        -- 0=Pending, 1=Approved, 2=Rejected
        ApprovedBy UNIQUEIDENTIFIER NULL,
        ApprovedAt DATETIME2 NULL,
        ApproverNote NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_OvertimeRecords_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    CREATE INDEX IX_OvertimeRecords_StaffId ON OvertimeRecords(StaffId);
    CREATE INDEX IX_OvertimeRecords_OvertimeDate ON OvertimeRecords(OvertimeDate);
    CREATE INDEX IX_OvertimeRecords_Status ON OvertimeRecords(Status);
    PRINT 'Created table OvertimeRecords';
END
GO

-- 7. Staff Awards (khen thuong)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StaffAwards')
BEGIN
    CREATE TABLE StaffAwards (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        StaffId UNIQUEIDENTIFIER NOT NULL,
        AwardType NVARCHAR(100) NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        AwardDate DATE NOT NULL,
        DecisionNumber NVARCHAR(100) NULL,
        Description NVARCHAR(1000) NULL,
        IssuedBy NVARCHAR(200) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_StaffAwards_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    CREATE INDEX IX_StaffAwards_StaffId ON StaffAwards(StaffId);
    PRINT 'Created table StaffAwards';
END
GO

-- 8. Staff Disciplines (ky luat)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StaffDisciplines')
BEGIN
    CREATE TABLE StaffDisciplines (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        StaffId UNIQUEIDENTIFIER NOT NULL,
        DisciplineType NVARCHAR(100) NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        DisciplineDate DATE NOT NULL,
        ExpiryDate DATE NULL,
        DecisionNumber NVARCHAR(100) NULL,
        Description NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_StaffDisciplines_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    CREATE INDEX IX_StaffDisciplines_StaffId ON StaffDisciplines(StaffId);
    PRINT 'Created table StaffDisciplines';
END
GO

-- ==============================================================
-- Seed HR Catalogs with Vietnamese defaults
-- ==============================================================

-- Only seed if table is empty
IF NOT EXISTS (SELECT 1 FROM HRCatalogs)
BEGIN
    -- Chuc vu (Position)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'Position', 'GD', N'Giám đốc', 1),
    (NEWID(), 'Position', 'PGD', N'Phó Giám đốc', 2),
    (NEWID(), 'Position', 'TK', N'Trưởng khoa', 3),
    (NEWID(), 'Position', 'PTK', N'Phó trưởng khoa', 4),
    (NEWID(), 'Position', 'TP', N'Trưởng phòng', 5),
    (NEWID(), 'Position', 'PTP', N'Phó trưởng phòng', 6),
    (NEWID(), 'Position', 'DT', N'Điều dưỡng trưởng', 7),
    (NEWID(), 'Position', 'NV', N'Nhân viên', 8);

    -- Chuc danh (JobTitle)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'JobTitle', 'BSCK2', N'Bác sĩ CKII', 1),
    (NEWID(), 'JobTitle', 'BSCK1', N'Bác sĩ CKI', 2),
    (NEWID(), 'JobTitle', 'BSNT', N'Bác sĩ nội trú', 3),
    (NEWID(), 'JobTitle', 'BS', N'Bác sĩ', 4),
    (NEWID(), 'JobTitle', 'DSCK', N'Dược sĩ chuyên khoa', 5),
    (NEWID(), 'JobTitle', 'DS', N'Dược sĩ', 6),
    (NEWID(), 'JobTitle', 'CNDD', N'Cử nhân điều dưỡng', 7),
    (NEWID(), 'JobTitle', 'DD', N'Điều dưỡng', 8),
    (NEWID(), 'JobTitle', 'NHS', N'Nữ hộ sinh', 9),
    (NEWID(), 'JobTitle', 'KTV', N'Kỹ thuật viên', 10);

    -- Ngach cong chuc (CivilServantRank)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'CivilServantRank', 'V.08.01.01', N'Bác sĩ cao cấp', 1),
    (NEWID(), 'CivilServantRank', 'V.08.01.02', N'Bác sĩ chính', 2),
    (NEWID(), 'CivilServantRank', 'V.08.01.03', N'Bác sĩ', 3),
    (NEWID(), 'CivilServantRank', 'V.08.05.13', N'Điều dưỡng hạng II', 4),
    (NEWID(), 'CivilServantRank', 'V.08.05.14', N'Điều dưỡng hạng III', 5),
    (NEWID(), 'CivilServantRank', 'V.08.05.15', N'Điều dưỡng hạng IV', 6);

    -- Bac luong (SalaryGrade)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, Description, SortOrder) VALUES
    (NEWID(), 'SalaryGrade', 'B1', N'Bậc 1', N'Hệ số 2.34', 1),
    (NEWID(), 'SalaryGrade', 'B2', N'Bậc 2', N'Hệ số 2.67', 2),
    (NEWID(), 'SalaryGrade', 'B3', N'Bậc 3', N'Hệ số 3.00', 3),
    (NEWID(), 'SalaryGrade', 'B4', N'Bậc 4', N'Hệ số 3.33', 4),
    (NEWID(), 'SalaryGrade', 'B5', N'Bậc 5', N'Hệ số 3.66', 5),
    (NEWID(), 'SalaryGrade', 'B6', N'Bậc 6', N'Hệ số 3.99', 6),
    (NEWID(), 'SalaryGrade', 'B7', N'Bậc 7', N'Hệ số 4.32', 7),
    (NEWID(), 'SalaryGrade', 'B8', N'Bậc 8', N'Hệ số 4.65', 8),
    (NEWID(), 'SalaryGrade', 'B9', N'Bậc 9', N'Hệ số 4.98', 9);

    -- Loai hop dong (ContractType)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'ContractType', 'TV', N'Thử việc', 1),
    (NEWID(), 'ContractType', 'XDTH', N'Xác định thời hạn', 2),
    (NEWID(), 'ContractType', 'KXDTH', N'Không xác định thời hạn', 3),
    (NEWID(), 'ContractType', 'TV2', N'Thời vụ', 4),
    (NEWID(), 'ContractType', 'CH', N'Cộng tác viên / Hợp đồng khoán', 5);

    -- Loai bao hiem (InsuranceType)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'InsuranceType', 'BHXH', N'Bảo hiểm xã hội', 1),
    (NEWID(), 'InsuranceType', 'BHYT', N'Bảo hiểm y tế', 2),
    (NEWID(), 'InsuranceType', 'BHTN', N'Bảo hiểm thất nghiệp', 3),
    (NEWID(), 'InsuranceType', 'BHTNLD', N'Bảo hiểm tai nạn lao động', 4);

    -- Trinh do hoc van (EducationLevel)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'EducationLevel', 'TS', N'Tiến sĩ', 1),
    (NEWID(), 'EducationLevel', 'ThS', N'Thạc sĩ', 2),
    (NEWID(), 'EducationLevel', 'DH', N'Đại học', 3),
    (NEWID(), 'EducationLevel', 'CD', N'Cao đẳng', 4),
    (NEWID(), 'EducationLevel', 'TC', N'Trung cấp', 5),
    (NEWID(), 'EducationLevel', 'SC', N'Sơ cấp', 6);

    -- Loai khen thuong (AwardType)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'AwardType', 'LDTT', N'Lao động tiên tiến', 1),
    (NEWID(), 'AwardType', 'CSTT', N'Chiến sĩ thi đua cơ sở', 2),
    (NEWID(), 'AwardType', 'BK', N'Bằng khen', 3),
    (NEWID(), 'AwardType', 'GK', N'Giấy khen', 4),
    (NEWID(), 'AwardType', 'HC', N'Huân chương', 5);

    -- Loai ky luat (DisciplineType)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'DisciplineType', 'KT', N'Khiển trách', 1),
    (NEWID(), 'DisciplineType', 'CN', N'Cảnh cáo', 2),
    (NEWID(), 'DisciplineType', 'CC', N'Cách chức', 3),
    (NEWID(), 'DisciplineType', 'BV', N'Buộc thôi việc', 4);

    -- Loai nghi phep (LeaveType)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'LeaveType', 'NP', N'Nghỉ phép năm', 1),
    (NEWID(), 'LeaveType', 'NO', N'Nghỉ ốm', 2),
    (NEWID(), 'LeaveType', 'NTS', N'Nghỉ thai sản', 3),
    (NEWID(), 'LeaveType', 'NKL', N'Nghỉ không lương', 4),
    (NEWID(), 'LeaveType', 'NVR', N'Nghỉ việc riêng', 5),
    (NEWID(), 'LeaveType', 'NHT', N'Nghỉ học tập', 6),
    (NEWID(), 'LeaveType', 'NK', N'Nghỉ khác', 7);

    -- Ca truc (ShiftType)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, Description, SortOrder) VALUES
    (NEWID(), 'ShiftType', 'S', N'Ca sáng', N'07:00 - 11:30', 1),
    (NEWID(), 'ShiftType', 'C', N'Ca chiều', N'13:30 - 17:00', 2),
    (NEWID(), 'ShiftType', 'D', N'Ca đêm', N'17:00 - 07:00', 3),
    (NEWID(), 'ShiftType', 'HC', N'Hành chính', N'07:30 - 16:30', 4),
    (NEWID(), 'ShiftType', 'T24', N'Trực 24h', N'07:00 - 07:00', 5);

    -- Loai chung chi (CertificateType)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'CertificateType', 'CCHN', N'Chứng chỉ hành nghề', 1),
    (NEWID(), 'CertificateType', 'CNNL', N'Chứng nhận năng lực', 2),
    (NEWID(), 'CertificateType', 'BLS', N'BLS (Basic Life Support)', 3),
    (NEWID(), 'CertificateType', 'ACLS', N'ACLS (Advanced Cardiac Life Support)', 4),
    (NEWID(), 'CertificateType', 'ATLS', N'ATLS (Advanced Trauma Life Support)', 5),
    (NEWID(), 'CertificateType', 'PALS', N'PALS (Pediatric Advanced Life Support)', 6);

    -- Dan toc (Ethnicity)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'Ethnicity', 'KINH', N'Kinh', 1),
    (NEWID(), 'Ethnicity', 'TAY', N'Tày', 2),
    (NEWID(), 'Ethnicity', 'THAI', N'Thái', 3),
    (NEWID(), 'Ethnicity', 'MUONG', N'Mường', 4),
    (NEWID(), 'Ethnicity', 'KHMER', N'Khmer', 5),
    (NEWID(), 'Ethnicity', 'HOA', N'Hoa', 6),
    (NEWID(), 'Ethnicity', 'NUNG', N'Nùng', 7),
    (NEWID(), 'Ethnicity', 'HMONG', N'H''Mông', 8),
    (NEWID(), 'Ethnicity', 'KHAC', N'Khác', 99);

    -- Ton giao (Religion)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'Religion', 'KTG', N'Không tôn giáo', 1),
    (NEWID(), 'Religion', 'PG', N'Phật giáo', 2),
    (NEWID(), 'Religion', 'CG', N'Công giáo', 3),
    (NEWID(), 'Religion', 'TL', N'Tin lành', 4),
    (NEWID(), 'Religion', 'CD', N'Cao Đài', 5),
    (NEWID(), 'Religion', 'HH', N'Hòa Hảo', 6),
    (NEWID(), 'Religion', 'IG', N'Hồi giáo', 7),
    (NEWID(), 'Religion', 'KH', N'Khác', 99);

    -- Quoc tich (Nationality)
    INSERT INTO HRCatalogs (Id, CatalogType, Code, Name, SortOrder) VALUES
    (NEWID(), 'Nationality', 'VN', N'Việt Nam', 1),
    (NEWID(), 'Nationality', 'US', N'Hoa Kỳ', 2),
    (NEWID(), 'Nationality', 'JP', N'Nhật Bản', 3),
    (NEWID(), 'Nationality', 'KR', N'Hàn Quốc', 4),
    (NEWID(), 'Nationality', 'CN', N'Trung Quốc', 5),
    (NEWID(), 'Nationality', 'KH', N'Khác', 99);

    PRINT 'Seeded HR Catalogs with Vietnamese defaults';
END
GO

PRINT 'HR Enhancement tables creation complete';
GO
