-- ==============================================
-- HIS Test Data Script v2
-- Correct column names based on actual schema
-- ==============================================

USE HIS;
GO

-- ==============================================
-- 1. DEPARTMENTS (Khoa phòng)
-- ==============================================
PRINT N'=== Inserting Departments ==='

IF NOT EXISTS (SELECT 1 FROM Departments WHERE DepartmentCode = 'KKB')
INSERT INTO Departments (Id, DepartmentCode, DepartmentName, DepartmentType, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'KKB', N'Khoa Khám bệnh', 1, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Departments WHERE DepartmentCode = 'KNK')
INSERT INTO Departments (Id, DepartmentCode, DepartmentName, DepartmentType, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'KNK', N'Khoa Nội khoa', 2, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Departments WHERE DepartmentCode = 'KNT')
INSERT INTO Departments (Id, DepartmentCode, DepartmentName, DepartmentType, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'KNT', N'Khoa Ngoại tổng hợp', 2, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Departments WHERE DepartmentCode = 'KCK')
INSERT INTO Departments (Id, DepartmentCode, DepartmentName, DepartmentType, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'KCK', N'Khoa Cấp cứu', 3, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Departments WHERE DepartmentCode = 'KXN')
INSERT INTO Departments (Id, DepartmentCode, DepartmentName, DepartmentType, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'KXN', N'Khoa Xét nghiệm', 4, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Departments WHERE DepartmentCode = 'KD')
INSERT INTO Departments (Id, DepartmentCode, DepartmentName, DepartmentType, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'KD', N'Khoa Dược', 5, 1, GETDATE(), 0);

-- ==============================================
-- 2. ROOMS (Phòng khám)
-- ==============================================
PRINT N'=== Inserting Rooms ==='

DECLARE @DeptKKB UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Departments WHERE DepartmentCode = 'KKB');
DECLARE @DeptNK UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Departments WHERE DepartmentCode = 'KNK');

IF @DeptKKB IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomCode = 'P101')
    INSERT INTO Rooms (Id, RoomCode, RoomName, DepartmentId, RoomType, MaxPatients, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'P101', N'Phòng khám 101 - Nội tổng quát', @DeptKKB, 1, 50, 1, GETDATE(), 0);

    IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomCode = 'P102')
    INSERT INTO Rooms (Id, RoomCode, RoomName, DepartmentId, RoomType, MaxPatients, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'P102', N'Phòng khám 102 - Ngoại tổng quát', @DeptKKB, 1, 50, 1, GETDATE(), 0);

    IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomCode = 'P103')
    INSERT INTO Rooms (Id, RoomCode, RoomName, DepartmentId, RoomType, MaxPatients, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'P103', N'Phòng khám 103 - Nhi khoa', @DeptKKB, 1, 40, 1, GETDATE(), 0);

    IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomCode = 'P104')
    INSERT INTO Rooms (Id, RoomCode, RoomName, DepartmentId, RoomType, MaxPatients, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'P104', N'Phòng khám 104 - Tim mạch', @DeptKKB, 1, 30, 1, GETDATE(), 0);
END

-- Inpatient Rooms
IF @DeptNK IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomCode = 'NT101')
    INSERT INTO Rooms (Id, RoomCode, RoomName, DepartmentId, RoomType, MaxPatients, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'NT101', N'Phòng Nội 101', @DeptNK, 2, 6, 1, GETDATE(), 0);

    IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomCode = 'NT102')
    INSERT INTO Rooms (Id, RoomCode, RoomName, DepartmentId, RoomType, MaxPatients, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'NT102', N'Phòng Nội 102', @DeptNK, 2, 4, 1, GETDATE(), 0);

    IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomCode = 'NT103')
    INSERT INTO Rooms (Id, RoomCode, RoomName, DepartmentId, RoomType, MaxPatients, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'NT103', N'Phòng VIP 103', @DeptNK, 3, 2, 1, GETDATE(), 0);
END

-- ==============================================
-- 3. BEDS (Giường bệnh)
-- ==============================================
PRINT N'=== Inserting Beds ==='

DECLARE @RoomNT101 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Rooms WHERE RoomCode = 'NT101');
DECLARE @RoomNT102 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Rooms WHERE RoomCode = 'NT102');
DECLARE @RoomNT103 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Rooms WHERE RoomCode = 'NT103');

IF @RoomNT101 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Beds WHERE BedCode = 'G101-1')
    INSERT INTO Beds (Id, BedCode, BedName, RoomId, BedType, Status, DailyPrice, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'G101-1', N'Giường 101-1', @RoomNT101, 1, 0, 200000, 1, GETDATE(), 0);

    IF NOT EXISTS (SELECT 1 FROM Beds WHERE BedCode = 'G101-2')
    INSERT INTO Beds (Id, BedCode, BedName, RoomId, BedType, Status, DailyPrice, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'G101-2', N'Giường 101-2', @RoomNT101, 1, 0, 200000, 1, GETDATE(), 0);

    IF NOT EXISTS (SELECT 1 FROM Beds WHERE BedCode = 'G101-3')
    INSERT INTO Beds (Id, BedCode, BedName, RoomId, BedType, Status, DailyPrice, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'G101-3', N'Giường 101-3', @RoomNT101, 1, 0, 200000, 1, GETDATE(), 0);
END

IF @RoomNT102 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Beds WHERE BedCode = 'G102-1')
    INSERT INTO Beds (Id, BedCode, BedName, RoomId, BedType, Status, DailyPrice, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'G102-1', N'Giường 102-1', @RoomNT102, 1, 0, 200000, 1, GETDATE(), 0);

    IF NOT EXISTS (SELECT 1 FROM Beds WHERE BedCode = 'G102-2')
    INSERT INTO Beds (Id, BedCode, BedName, RoomId, BedType, Status, DailyPrice, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'G102-2', N'Giường 102-2', @RoomNT102, 1, 0, 200000, 1, GETDATE(), 0);
END

IF @RoomNT103 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Beds WHERE BedCode = 'G103-VIP')
    INSERT INTO Beds (Id, BedCode, BedName, RoomId, BedType, Status, DailyPrice, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'G103-VIP', N'Giường VIP 103', @RoomNT103, 2, 0, 500000, 1, GETDATE(), 0);
END

-- ==============================================
-- 4. PATIENTS (Bệnh nhân test)
-- ==============================================
PRINT N'=== Inserting Test Patients ==='

-- Patient 1
IF NOT EXISTS (SELECT 1 FROM Patients WHERE PatientCode = 'BN-2024-00001')
INSERT INTO Patients (Id, PatientCode, FullName, DateOfBirth, Gender, PhoneNumber, Address, CreatedAt, IsDeleted)
VALUES (NEWID(), 'BN-2024-00001', N'Nguyễn Văn An', '1985-05-15', 1, '0901234567', N'123 Nguyễn Trãi, Q.1, TP.HCM', GETDATE(), 0);

-- Patient 2
IF NOT EXISTS (SELECT 1 FROM Patients WHERE PatientCode = 'BN-2024-00002')
INSERT INTO Patients (Id, PatientCode, FullName, DateOfBirth, Gender, PhoneNumber, Address, CreatedAt, IsDeleted)
VALUES (NEWID(), 'BN-2024-00002', N'Trần Thị Bình', '1990-08-20', 0, '0912345678', N'456 Lê Lợi, Q.3, TP.HCM', GETDATE(), 0);

-- Patient 3
IF NOT EXISTS (SELECT 1 FROM Patients WHERE PatientCode = 'BN-2024-00003')
INSERT INTO Patients (Id, PatientCode, FullName, DateOfBirth, Gender, PhoneNumber, Address, CreatedAt, IsDeleted)
VALUES (NEWID(), 'BN-2024-00003', N'Lê Hoàng Cường', '1978-12-01', 1, '0923456789', N'789 Hai Bà Trưng, Q.10, TP.HCM', GETDATE(), 0);

-- Patient 4
IF NOT EXISTS (SELECT 1 FROM Patients WHERE PatientCode = 'BN-2024-00004')
INSERT INTO Patients (Id, PatientCode, FullName, DateOfBirth, Gender, PhoneNumber, Address, CreatedAt, IsDeleted)
VALUES (NEWID(), 'BN-2024-00004', N'Phạm Thị Dung', '1995-03-25', 0, '0934567890', N'321 CMT8, Q.TB, TP.HCM', GETDATE(), 0);

-- Patient 5
IF NOT EXISTS (SELECT 1 FROM Patients WHERE PatientCode = 'BN-2024-00005')
INSERT INTO Patients (Id, PatientCode, FullName, DateOfBirth, Gender, PhoneNumber, Address, CreatedAt, IsDeleted)
VALUES (NEWID(), 'BN-2024-00005', N'Hoàng Minh Đức', '2000-07-10', 1, '0945678901', N'654 Trần Hưng Đạo, Q.5, TP.HCM', GETDATE(), 0);

-- Patient 6 - Insurance patient
IF NOT EXISTS (SELECT 1 FROM Patients WHERE PatientCode = 'BN-2024-00006')
INSERT INTO Patients (Id, PatientCode, FullName, DateOfBirth, Gender, PhoneNumber, Address, InsuranceNumber, CreatedAt, IsDeleted)
VALUES (NEWID(), 'BN-2024-00006', N'Võ Thị Én', '1982-11-30', 0, '0956789012', N'987 Điện Biên Phủ, Q.BT, TP.HCM', 'DN4790012345678', GETDATE(), 0);

-- ==============================================
-- 5. MEDICAL RECORDS (Hồ sơ bệnh án)
-- ==============================================
PRINT N'=== Inserting Medical Records ==='

DECLARE @Patient1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Patients WHERE PatientCode = 'BN-2024-00001');
DECLARE @Patient2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Patients WHERE PatientCode = 'BN-2024-00002');
DECLARE @Patient3 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Patients WHERE PatientCode = 'BN-2024-00003');
DECLARE @Patient4 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Patients WHERE PatientCode = 'BN-2024-00004');
DECLARE @Patient5 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Patients WHERE PatientCode = 'BN-2024-00005');
DECLARE @Patient6 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Patients WHERE PatientCode = 'BN-2024-00006');

DECLARE @Room101 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Rooms WHERE RoomCode = 'P101');
DECLARE @Room102 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Rooms WHERE RoomCode = 'P102');
DECLARE @Room103 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Rooms WHERE RoomCode = 'P103');

-- MR 1 - Outpatient
IF @Patient1 IS NOT NULL AND @Room101 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00001')
INSERT INTO MedicalRecords (Id, MedicalRecordCode, PatientId, AdmissionDate, PatientType, TreatmentType, RoomId, DepartmentId, InitialDiagnosis, Status, IsClosed, CreatedAt, IsDeleted)
VALUES (NEWID(), 'HS-2024-00001', @Patient1, GETDATE(), 1, 1, @Room101, @DeptKKB, N'Đau đầu, sốt nhẹ', 1, 0, GETDATE(), 0);

-- MR 2 - Outpatient
IF @Patient2 IS NOT NULL AND @Room101 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00002')
INSERT INTO MedicalRecords (Id, MedicalRecordCode, PatientId, AdmissionDate, PatientType, TreatmentType, RoomId, DepartmentId, InitialDiagnosis, Status, IsClosed, CreatedAt, IsDeleted)
VALUES (NEWID(), 'HS-2024-00002', @Patient2, GETDATE(), 1, 1, @Room101, @DeptKKB, N'Ho khan, khó thở', 1, 0, GETDATE(), 0);

-- MR 3 - Outpatient
IF @Patient3 IS NOT NULL AND @Room101 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00003')
INSERT INTO MedicalRecords (Id, MedicalRecordCode, PatientId, AdmissionDate, PatientType, TreatmentType, RoomId, DepartmentId, InitialDiagnosis, Status, IsClosed, CreatedAt, IsDeleted)
VALUES (NEWID(), 'HS-2024-00003', @Patient3, GETDATE(), 1, 1, @Room101, @DeptKKB, N'Đau bụng, buồn nôn', 1, 0, GETDATE(), 0);

-- MR 4 - Different room
IF @Patient4 IS NOT NULL AND @Room102 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00004')
INSERT INTO MedicalRecords (Id, MedicalRecordCode, PatientId, AdmissionDate, PatientType, TreatmentType, RoomId, DepartmentId, InitialDiagnosis, Status, IsClosed, CreatedAt, IsDeleted)
VALUES (NEWID(), 'HS-2024-00004', @Patient4, GETDATE(), 1, 1, @Room102, @DeptKKB, N'Đau khớp gối', 1, 0, GETDATE(), 0);

-- MR 5 - Different room
IF @Patient5 IS NOT NULL AND @Room103 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00005')
INSERT INTO MedicalRecords (Id, MedicalRecordCode, PatientId, AdmissionDate, PatientType, TreatmentType, RoomId, DepartmentId, InitialDiagnosis, Status, IsClosed, CreatedAt, IsDeleted)
VALUES (NEWID(), 'HS-2024-00005', @Patient5, GETDATE(), 1, 1, @Room103, @DeptKKB, N'Viêm họng, sổ mũi', 1, 0, GETDATE(), 0);

-- MR 6 - Inpatient
DECLARE @RoomNT101_2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Rooms WHERE RoomCode = 'NT101');
DECLARE @BedG1011 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Beds WHERE BedCode = 'G101-1');

IF @Patient6 IS NOT NULL AND @RoomNT101_2 IS NOT NULL AND @BedG1011 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00006')
BEGIN
    INSERT INTO MedicalRecords (Id, MedicalRecordCode, PatientId, AdmissionDate, PatientType, TreatmentType, RoomId, BedId, DepartmentId, InitialDiagnosis, Status, IsClosed, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'HS-2024-00006', @Patient6, DATEADD(DAY, -2, GETDATE()), 2, 2, @RoomNT101_2, @BedG1011, @DeptNK, N'Viêm phổi cấp, J18.9', 1, 0, GETDATE(), 0);

    -- Update bed status to occupied
    UPDATE Beds SET Status = 1 WHERE Id = @BedG1011;
END

-- ==============================================
-- 6. EXAMINATIONS (Khám bệnh)
-- ==============================================
PRINT N'=== Inserting Examinations ==='

DECLARE @MR1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00001');
DECLARE @MR2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00002');
DECLARE @MR3 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00003');
DECLARE @MR4 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00004');
DECLARE @MR5 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM MedicalRecords WHERE MedicalRecordCode = 'HS-2024-00005');

-- Exam 1 - Waiting
IF @MR1 IS NOT NULL AND @Room101 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Examinations WHERE MedicalRecordId = @MR1)
INSERT INTO Examinations (Id, MedicalRecordId, RoomId, DepartmentId, QueueNumber, Status, ExaminationType, ChiefComplaint, CreatedAt, IsDeleted)
VALUES (NEWID(), @MR1, @Room101, @DeptKKB, 1, 1, 1, N'Đau đầu, sốt nhẹ', GETDATE(), 0);

-- Exam 2 - Waiting
IF @MR2 IS NOT NULL AND @Room101 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Examinations WHERE MedicalRecordId = @MR2)
INSERT INTO Examinations (Id, MedicalRecordId, RoomId, DepartmentId, QueueNumber, Status, ExaminationType, ChiefComplaint, CreatedAt, IsDeleted)
VALUES (NEWID(), @MR2, @Room101, @DeptKKB, 2, 1, 1, N'Ho khan, khó thở', GETDATE(), 0);

-- Exam 3 - In Progress (đang khám)
IF @MR3 IS NOT NULL AND @Room101 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Examinations WHERE MedicalRecordId = @MR3)
INSERT INTO Examinations (Id, MedicalRecordId, RoomId, DepartmentId, QueueNumber, Status, ExaminationType, ChiefComplaint, StartTime, CreatedAt, IsDeleted)
VALUES (NEWID(), @MR3, @Room101, @DeptKKB, 3, 2, 1, N'Đau bụng, buồn nôn', DATEADD(MINUTE, -10, GETDATE()), GETDATE(), 0);

-- Exam 4 - Different room (P102)
IF @MR4 IS NOT NULL AND @Room102 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Examinations WHERE MedicalRecordId = @MR4)
INSERT INTO Examinations (Id, MedicalRecordId, RoomId, DepartmentId, QueueNumber, Status, ExaminationType, ChiefComplaint, CreatedAt, IsDeleted)
VALUES (NEWID(), @MR4, @Room102, @DeptKKB, 1, 1, 1, N'Đau khớp gối', GETDATE(), 0);

-- Exam 5 - Different room (P103)
IF @MR5 IS NOT NULL AND @Room103 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Examinations WHERE MedicalRecordId = @MR5)
INSERT INTO Examinations (Id, MedicalRecordId, RoomId, DepartmentId, QueueNumber, Status, ExaminationType, ChiefComplaint, CreatedAt, IsDeleted)
VALUES (NEWID(), @MR5, @Room103, @DeptKKB, 1, 1, 1, N'Viêm họng, sổ mũi', GETDATE(), 0);

-- ==============================================
-- 7. MEDICINES (Thuốc)
-- ==============================================
PRINT N'=== Inserting Medicines ==='

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'PARA500')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'PARA500', N'Paracetamol 500mg', N'Paracetamol', N'500mg', N'Viên', 500, 400, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'AMOX500')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, IsAntibiotic, CreatedAt, IsDeleted)
VALUES (NEWID(), 'AMOX500', N'Amoxicillin 500mg', N'Amoxicillin', N'500mg', N'Viên', 2000, 1500, 1, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'OMEP20')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'OMEP20', N'Omeprazole 20mg', N'Omeprazole', N'20mg', N'Viên', 3000, 2500, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'LORA10')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'LORA10', N'Loratadine 10mg', N'Loratadine', N'10mg', N'Viên', 1500, 1200, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'DICLOF50')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'DICLOF50', N'Diclofenac 50mg', N'Diclofenac', N'50mg', N'Viên', 800, 600, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'METF500')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'METF500', N'Metformin 500mg', N'Metformin', N'500mg', N'Viên', 1000, 800, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'AMLO5')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'AMLO5', N'Amlodipine 5mg', N'Amlodipine', N'5mg', N'Viên', 2500, 2000, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'CEFA500')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, IsAntibiotic, CreatedAt, IsDeleted)
VALUES (NEWID(), 'CEFA500', N'Cefadroxil 500mg', N'Cefadroxil', N'500mg', N'Viên', 3500, 3000, 1, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'AZIT250')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, IsAntibiotic, CreatedAt, IsDeleted)
VALUES (NEWID(), 'AZIT250', N'Azithromycin 250mg', N'Azithromycin', N'250mg', N'Viên', 5000, 4000, 1, 1, GETDATE(), 0);

IF NOT EXISTS (SELECT 1 FROM Medicines WHERE MedicineCode = 'IBUP400')
INSERT INTO Medicines (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, Unit, UnitPrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
VALUES (NEWID(), 'IBUP400', N'Ibuprofen 400mg', N'Ibuprofen', N'400mg', N'Viên', 1200, 1000, 1, GETDATE(), 0);

-- ==============================================
-- Summary
-- ==============================================
PRINT N'=== Data Summary ==='
SELECT 'Departments' AS TableName, COUNT(*) AS RecordCount FROM Departments WHERE IsDeleted = 0
UNION ALL
SELECT 'Rooms', COUNT(*) FROM Rooms WHERE IsDeleted = 0
UNION ALL
SELECT 'Beds', COUNT(*) FROM Beds WHERE IsDeleted = 0
UNION ALL
SELECT 'Patients', COUNT(*) FROM Patients WHERE IsDeleted = 0
UNION ALL
SELECT 'MedicalRecords', COUNT(*) FROM MedicalRecords WHERE IsDeleted = 0
UNION ALL
SELECT 'Examinations', COUNT(*) FROM Examinations WHERE IsDeleted = 0
UNION ALL
SELECT 'Medicines', COUNT(*) FROM Medicines WHERE IsDeleted = 0;

PRINT N'=== Test Data Insertion Complete ==='
GO
