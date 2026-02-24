-- ============================================================
-- HIS Comprehensive Module Seed Data
-- Generated: 2026-02-24
-- Purpose: Seed ALL module tables with realistic Vietnamese
--          hospital data for full UI testing
-- Depends on: seed_data.sql (must run first)
-- ============================================================
SET NOCOUNT ON;
PRINT '=== HIS Module Seed Data Starting ===';

-- Reference IDs from seed_data.sql
DECLARE @AdminId UNIQUEIDENTIFIER = '9E5309DC-ECF9-4D48-9A09-224CD15347B1';
DECLARE @KhoaNoi UNIQUEIDENTIFIER = 'B1126838-0C70-4869-ACBA-CD5AE3D41A76';
DECLARE @KhoaNgoai UNIQUEIDENTIFIER = 'A5FF333B-FA29-48BE-A540-43B959CC1C70';
DECLARE @KhoaSan UNIQUEIDENTIFIER = '88566D6D-2D7E-47D8-B61D-B023E1DFB185';
DECLARE @KhoaNhi UNIQUEIDENTIFIER = '73BD3105-3B2B-433E-B1C7-B3E6115340FA';
DECLARE @KhoaCDHA UNIQUEIDENTIFIER = 'F16B6CC8-ECBA-4675-81BC-0AA4CC3FA441';
DECLARE @KhoaXN UNIQUEIDENTIFIER = '5D27B234-AEE3-413D-9B45-A7575CB5E413';
DECLARE @KhoaDuoc UNIQUEIDENTIFIER = '83D99FAC-70ED-4DB6-9280-E9AB34B35731';
DECLARE @KhoaKB UNIQUEIDENTIFIER = '96B9F79F-49EB-4249-A7B9-6F1465E219E7';
DECLARE @KhoaCC UNIQUEIDENTIFIER = '2EF7E0FD-C3C5-4D12-A4E9-A99CB2544DF1';

DECLARE @PK_101 UNIQUEIDENTIFIER = '65C7EC65-B79A-4C9D-B836-92D5392BD221';
DECLARE @PK_102 UNIQUEIDENTIFIER = '099FFCF6-C61B-4B95-91C6-75EF6B1C80D6';
DECLARE @NT101 UNIQUEIDENTIFIER = '54344D93-42DA-4937-AF86-048124E0CCDC';
DECLARE @NT102 UNIQUEIDENTIFIER = 'CD3CC485-EC28-4702-B557-0ADC9907367D';
DECLARE @NT103VIP UNIQUEIDENTIFIER = '6E01C04D-6154-4555-BB57-BDE50C14D059';

DECLARE @KhoThuocChinh UNIQUEIDENTIFIER = '89127D8A-0BDF-4F96-95F7-67BECCEBD606';
DECLARE @NhaThuoc UNIQUEIDENTIFIER = 'EF523A99-B2D5-41EE-9AE7-972B91F661DF';
DECLARE @TuTrucNoi UNIQUEIDENTIFIER = '4CA2BF69-52C7-43CD-8B46-CD643DA2FA28';
DECLARE @KhoVTYT UNIQUEIDENTIFIER = '325D8646-0B07-4111-A3A8-FB9A0D183652';

DECLARE @Pat1 UNIQUEIDENTIFIER = '076D33FB-B973-4D42-A4F6-92E0F70D294F';
DECLARE @Pat2 UNIQUEIDENTIFIER = '5F36C19E-2FD8-43E0-BFBA-59AA9BC0E6D1';
DECLARE @Pat3 UNIQUEIDENTIFIER = '31D853F4-8C56-4A2A-BD41-C2C3707A5CF0';
DECLARE @Pat4 UNIQUEIDENTIFIER = '94E61079-ED7D-4F02-9D10-AD11D9D152FD';
DECLARE @Pat5 UNIQUEIDENTIFIER = '23AB08E4-1DCA-45CB-A906-5DF54470EF2F';
DECLARE @Pat6 UNIQUEIDENTIFIER = '7AABF68D-6FBB-4501-BFF5-648974EE823C';

DECLARE @MR1 UNIQUEIDENTIFIER = '5A6B2A40-8BCB-438B-AC52-E5B7F94AD78F';
DECLARE @MR2 UNIQUEIDENTIFIER = '07DBABCD-3DBA-4520-9B5B-708226584123';
DECLARE @MR3 UNIQUEIDENTIFIER = '74E26FFA-8730-4E17-BA96-F9D08C4EE197';
DECLARE @MR4 UNIQUEIDENTIFIER = 'D02B2712-EA42-421F-A4F9-0A1030D63599';
DECLARE @MR5 UNIQUEIDENTIFIER = 'E1C4740B-1011-43A6-BB7D-F9CC74850CB0';
DECLARE @MR6 UNIQUEIDENTIFIER = 'A652736C-2EEE-4BAB-BF99-8A18E1C3873F';

DECLARE @MedPara UNIQUEIDENTIFIER = '4632E3B6-AB73-45A3-89BF-00DC01137706';
DECLARE @MedMetf UNIQUEIDENTIFIER = 'E133A0B9-4D07-4EBE-95D9-08E87ACE3DD5';
DECLARE @MedAmox UNIQUEIDENTIFIER = 'FFD589A4-B95C-41D4-A481-BF871F0C9005';
DECLARE @MedOmep UNIQUEIDENTIFIER = '7C83C709-7C9A-4175-928A-3604C7E0842A';
DECLARE @MedAmlo UNIQUEIDENTIFIER = 'B573A911-DEDC-454D-BCC5-9C1B9DDDC372';
DECLARE @MedIbu UNIQUEIDENTIFIER = '14FF19BA-DE87-4061-A3F7-181A69D5F2F1';
DECLARE @MedVitC UNIQUEIDENTIFIER = '2BE8EE19-FF28-4CDB-BA96-718D70EF5550';
DECLARE @MedCefa UNIQUEIDENTIFIER = '802E2D8C-E1B4-4F51-9709-BBDABB885EFE';
DECLARE @MedDicl UNIQUEIDENTIFIER = 'DC43E315-61C9-4C14-B6B4-DC0487B5B0F2';
DECLARE @MedLora UNIQUEIDENTIFIER = 'BA5AF79D-1273-4F95-A9ED-14FAA5FE9EEE';
DECLARE @MedAzit UNIQUEIDENTIFIER = 'F1BCF290-0F3E-4604-BBB1-E9DC1B45C9C6';

DECLARE @Now DATETIME2 = GETDATE();
DECLARE @Today DATE = CAST(GETDATE() AS DATE);

-- Lookup users
DECLARE @DrAn UNIQUEIDENTIFIER = COALESCE((SELECT TOP 1 Id FROM Users WHERE Username = N'bsannn'), @AdminId);
DECLARE @DrBinh UNIQUEIDENTIFIER = COALESCE((SELECT TOP 1 Id FROM Users WHERE Username = N'bsbinh'), @AdminId);
DECLARE @DrCuong UNIQUEIDENTIFIER = COALESCE((SELECT TOP 1 Id FROM Users WHERE Username = N'bscuong'), @AdminId);
DECLARE @DrDung UNIQUEIDENTIFIER = COALESCE((SELECT TOP 1 Id FROM Users WHERE Username = N'bsdung'), @AdminId);
DECLARE @DrEm UNIQUEIDENTIFIER = COALESCE((SELECT TOP 1 Id FROM Users WHERE Username = N'bsem'), @AdminId);
DECLARE @NsPhuong UNIQUEIDENTIFIER = COALESCE((SELECT TOP 1 Id FROM Users WHERE Username = N'ddphuong'), @AdminId);
DECLARE @PhOanh UNIQUEIDENTIFIER = COALESCE((SELECT TOP 1 Id FROM Users WHERE Username = N'dsoanh'), @AdminId);
DECLARE @CsMai UNIQUEIDENTIFIER = COALESCE((SELECT TOP 1 Id FROM Users WHERE Username = N'tnmai'), @AdminId);

-- Pre-declare IDs
DECLARE @Rx1 UNIQUEIDENTIFIER = 'A1000001-0001-0001-0001-000000000001';
DECLARE @Rx2 UNIQUEIDENTIFIER = 'A1000002-0001-0001-0001-000000000001';
DECLARE @Rx3 UNIQUEIDENTIFIER = 'A1000003-0001-0001-0001-000000000001';
DECLARE @Rx4 UNIQUEIDENTIFIER = 'A1000004-0001-0001-0001-000000000001';
DECLARE @Rx5 UNIQUEIDENTIFIER = 'A1000005-0001-0001-0001-000000000001';
DECLARE @Rx6 UNIQUEIDENTIFIER = 'A1000006-0001-0001-0001-000000000001';
DECLARE @Rx7 UNIQUEIDENTIFIER = 'A1000007-0001-0001-0001-000000000001';
DECLARE @Rx8 UNIQUEIDENTIFIER = 'A1000008-0001-0001-0001-000000000001';

DECLARE @Adm1 UNIQUEIDENTIFIER = 'C1000001-0001-0001-0001-000000000001';
DECLARE @Adm2 UNIQUEIDENTIFIER = 'C1000002-0001-0001-0001-000000000001';
DECLARE @Adm3 UNIQUEIDENTIFIER = 'C1000003-0001-0001-0001-000000000001';
DECLARE @Adm4 UNIQUEIDENTIFIER = 'C1000004-0001-0001-0001-000000000001';
DECLARE @Adm5 UNIQUEIDENTIFIER = 'C1000005-0001-0001-0001-000000000001';

-- ============================================================
-- SECTION 1: PRESCRIPTIONS (CreatedBy is uniqueidentifier!)
-- ============================================================
PRINT 'Section 1: Prescriptions...';

IF NOT EXISTS (SELECT 1 FROM Prescriptions WHERE Id = @Rx1)
BEGIN
    INSERT INTO Prescriptions (Id, PrescriptionCode, PrescriptionDate, MedicalRecordId, DoctorId, DepartmentId, WarehouseId, Diagnosis, IcdCode, DiagnosisName, PrescriptionType, TotalDays, TotalTangs, TotalAmount, InsuranceAmount, PatientAmount, Status, IsDispensed, Note, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    (@Rx1, N'DT20260224001', DATEADD(HOUR,-2,@Now), @MR1, @DrAn, @KhoaNoi, @KhoThuocChinh, N'Viêm dạ dày cấp', N'K29.7', N'Viêm dạ dày', 1, 7, 0, 56000, 44800, 11200, 0, 0, N'Đơn thuốc ngoại trú - chờ duyệt', @Now, @AdminId, 0),
    (@Rx2, N'DT20260224002', DATEADD(HOUR,-1,@Now), @MR2, @DrBinh, @KhoaNgoai, @KhoThuocChinh, N'Nhiễm khuẩn hô hấp trên', N'J06.9', N'NKHHT cấp', 1, 5, 0, 95000, 76000, 19000, 1, 0, N'Đơn đã duyệt - chờ phát thuốc', @Now, @AdminId, 0),
    (@Rx3, N'DT20260224003', DATEADD(DAY,-1,@Now), @MR3, @DrAn, @KhoaNoi, @KhoThuocChinh, N'Tăng huyết áp', N'I10', N'THA vô căn', 1, 30, 0, 135000, 108000, 27000, 2, 0, N'Đang phát thuốc', @Now, @AdminId, 0),
    (@Rx4, N'DT20260224004', DATEADD(DAY,-2,@Now), @MR4, @DrDung, @KhoaNhi, @KhoThuocChinh, N'Viêm phế quản cấp', N'J20.9', N'VPQ cấp', 1, 7, 0, 78000, 62400, 15600, 3, 1, N'Đã phát thuốc xong', DATEADD(DAY,-2,@Now), @AdminId, 0),
    (@Rx5, N'DT20260224005', DATEADD(DAY,-3,@Now), @MR5, @DrAn, @KhoaNoi, @KhoThuocChinh, N'Đau thắt lưng', N'M54.5', N'ĐTL', 1, 10, 0, 55000, 44000, 11000, 3, 1, N'Hoàn thành', DATEADD(DAY,-3,@Now), @AdminId, 0),
    (@Rx6, N'DT20260224006', @Now, @MR6, @DrCuong, @KhoaSan, @KhoThuocChinh, N'Thiếu máu thiếu sắt', N'D50.9', N'Thiếu máu', 1, 30, 0, 45000, 36000, 9000, 0, 0, N'Chờ duyệt', @Now, @AdminId, 0),
    (@Rx7, N'DT20260224007', DATEADD(DAY,-1,@Now), @MR1, @DrAn, @KhoaNoi, @TuTrucNoi, N'Viêm dạ dày - nội trú', N'K29.7', N'VDD nội trú', 2, 5, 0, 120000, 96000, 24000, 1, 0, N'Đơn nội trú đã duyệt', @Now, @AdminId, 0),
    (@Rx8, N'DT20260224008', DATEADD(HOUR,-3,@Now), @MR5, @DrBinh, @KhoaNgoai, @KhoThuocChinh, N'Đau nửa đầu', N'G43.9', N'Migraine', 1, 14, 0, 84000, 67200, 16800, 1, 0, N'Chờ phát', @Now, @AdminId, 0);
    PRINT '  8 Prescriptions created.';
END
ELSE PRINT '  Prescriptions already exist.';

-- ============================================================
-- SECTION 2: PRESCRIPTION DETAILS (CreatedBy uniqueidentifier)
-- ============================================================
PRINT 'Section 2: PrescriptionDetails...';

DECLARE @RxD1 UNIQUEIDENTIFIER = 'B1000001-0001-0001-0001-000000000001';
IF NOT EXISTS (SELECT 1 FROM PrescriptionDetails WHERE Id = @RxD1)
BEGIN
    INSERT INTO PrescriptionDetails (Id, PrescriptionId, MedicineId, Quantity, DispensedQuantity, Unit, UnitPrice, Amount, InsuranceAmount, PatientAmount, PatientType, InsurancePaymentRate, Dosage, Frequency, Route, [Usage], Days, TotalPrice, MorningDose, NoonDose, EveningDose, NightDose, Status, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    (@RxD1, @Rx1, @MedOmep, 14, 0, N'Viên', 1200, 16800, 13440, 3360, 1, 80, N'20mg', N'2 lần/ngày', N'Uống', N'Uống trước ăn 30 phút', 7, 16800, 1, 0, 1, 0, 0, @Now, @AdminId, 0),
    ('B1000002-0001-0001-0001-000000000001', @Rx1, @MedPara, 21, 0, N'Viên', 800, 16800, 13440, 3360, 1, 80, N'500mg', N'3 lần/ngày', N'Uống', N'Uống khi đau', 7, 16800, 1, 1, 1, 0, 0, @Now, @AdminId, 0),
    ('B1000003-0001-0001-0001-000000000001', @Rx2, @MedAmox, 15, 0, N'Viên', 1800, 27000, 21600, 5400, 1, 80, N'500mg', N'3 lần/ngày', N'Uống', N'Uống sau ăn', 5, 27000, 1, 1, 1, 0, 0, @Now, @AdminId, 0),
    ('B1000004-0001-0001-0001-000000000001', @Rx2, @MedPara, 15, 0, N'Viên', 800, 12000, 9600, 2400, 1, 80, N'500mg', N'3 lần/ngày', N'Uống', N'Uống khi sốt >38.5', 5, 12000, 1, 1, 1, 0, 0, @Now, @AdminId, 0),
    ('B1000005-0001-0001-0001-000000000001', @Rx2, @MedVitC, 10, 0, N'Viên', 500, 5000, 4000, 1000, 1, 80, N'500mg', N'2 lần/ngày', N'Uống', N'Uống sau ăn', 5, 5000, 1, 0, 1, 0, 0, @Now, @AdminId, 0),
    ('B1000006-0001-0001-0001-000000000001', @Rx3, @MedAmlo, 30, 15, N'Viên', 1500, 45000, 36000, 9000, 1, 80, N'5mg', N'1 lần/ngày', N'Uống', N'Uống sáng', 30, 45000, 1, 0, 0, 0, 2, @Now, @AdminId, 0),
    ('B1000007-0001-0001-0001-000000000001', @Rx3, @MedMetf, 60, 30, N'Viên', 900, 54000, 43200, 10800, 1, 80, N'500mg', N'2 lần/ngày', N'Uống', N'Uống sau ăn', 30, 54000, 1, 0, 1, 0, 2, @Now, @AdminId, 0),
    ('B1000008-0001-0001-0001-000000000001', @Rx4, @MedAzit, 3, 3, N'Viên', 3000, 9000, 7200, 1800, 1, 80, N'250mg', N'1 lần/ngày', N'Uống', N'Uống xa bữa ăn', 3, 9000, 0, 0, 1, 0, 3, @Now, @AdminId, 0),
    ('B1000009-0001-0001-0001-000000000001', @Rx4, @MedPara, 21, 21, N'Viên', 800, 16800, 13440, 3360, 1, 80, N'500mg', N'3 lần/ngày', N'Uống', N'Uống khi sốt', 7, 16800, 1, 1, 1, 0, 3, @Now, @AdminId, 0),
    ('B1000010-0001-0001-0001-000000000001', @Rx5, @MedDicl, 20, 20, N'Viên', 1000, 20000, 16000, 4000, 1, 80, N'50mg', N'2 lần/ngày', N'Uống', N'Uống sau ăn', 10, 20000, 1, 0, 1, 0, 3, @Now, @AdminId, 0),
    ('B1000011-0001-0001-0001-000000000001', @Rx5, @MedPara, 30, 30, N'Viên', 800, 24000, 19200, 4800, 1, 80, N'500mg', N'3 lần/ngày', N'Uống', N'Uống khi đau', 10, 24000, 1, 1, 1, 0, 3, @Now, @AdminId, 0),
    ('B1000012-0001-0001-0001-000000000001', @Rx6, @MedVitC, 60, 0, N'Viên', 500, 30000, 24000, 6000, 1, 80, N'500mg', N'2 lần/ngày', N'Uống', N'Uống sau ăn', 30, 30000, 1, 0, 1, 0, 0, @Now, @AdminId, 0),
    ('B1000013-0001-0001-0001-000000000001', @Rx7, @MedOmep, 10, 0, N'Viên', 1200, 12000, 9600, 2400, 1, 80, N'20mg', N'2 lần/ngày', N'Uống', N'Trước ăn', 5, 12000, 1, 0, 1, 0, 0, @Now, @AdminId, 0),
    ('B1000014-0001-0001-0001-000000000001', @Rx8, @MedIbu, 28, 0, N'Viên', 1100, 30800, 24640, 6160, 1, 80, N'400mg', N'2 lần/ngày', N'Uống', N'Uống sau ăn no', 14, 30800, 1, 0, 1, 0, 0, @Now, @AdminId, 0);
    PRINT '  14 PrescriptionDetails created.';
END
ELSE PRINT '  PrescriptionDetails already exist.';

-- ============================================================
-- SECTION 3: ADMISSIONS (CreatedBy is nvarchar)
-- ============================================================
PRINT 'Section 3: Admissions...';

IF NOT EXISTS (SELECT 1 FROM Admissions WHERE Id = @Adm1)
BEGIN
    DECLARE @Bed1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Beds WHERE RoomId = @NT101 ORDER BY BedCode);
    DECLARE @Bed2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Beds WHERE RoomId = @NT102 ORDER BY BedCode);
    DECLARE @Bed3 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Beds WHERE RoomId = @NT103VIP ORDER BY BedCode);

    INSERT INTO Admissions (Id, PatientId, MedicalRecordId, AdmissionDate, AdmissionType, AdmittingDoctorId, DepartmentId, RoomId, BedId, Status, DiagnosisOnAdmission, ReasonForAdmission, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    (@Adm1, @Pat1, @MR1, DATEADD(DAY,-3,@Now), 1, @DrAn, @KhoaNoi, @NT101, @Bed1, 0, N'Viêm phổi nặng', N'Sốt cao, khó thở, ho đờm đục', @Now, N'admin', 0),
    (@Adm2, @Pat2, @MR2, DATEADD(DAY,-5,@Now), 1, @DrBinh, @KhoaNgoai, @NT102, @Bed2, 0, N'Sỏi túi mật', N'Đau bụng hạ sườn phải, buồn nôn', @Now, N'admin', 0),
    (@Adm3, @Pat5, @MR5, DATEADD(DAY,-1,@Now), 2, @DrAn, @KhoaNoi, @NT103VIP, @Bed3, 0, N'Suy tim độ II', N'Khó thở khi gắng sức, phù chi dưới', @Now, N'admin', 0),
    (@Adm4, @Pat3, @MR3, DATEADD(DAY,-10,@Now), 1, @DrDung, @KhoaNhi, @NT101, NULL, 2, N'Viêm phế quản cấp', N'Ho, sốt 5 ngày', @Now, N'admin', 0),
    (@Adm5, @Pat6, @MR6, DATEADD(DAY,-7,@Now), 1, @DrCuong, @KhoaSan, @NT102, NULL, 1, N'Dọa sảy thai', N'Ra huyết âm đạo, đau bụng dưới', @Now, N'admin', 0);
    PRINT '  5 Admissions created.';

    -- BedAssignments
    IF @Bed1 IS NOT NULL
    BEGIN
        INSERT INTO BedAssignments (Id, AdmissionId, BedId, AssignedAt, ReleasedAt, Status, CreatedAt, CreatedBy, IsDeleted)
        VALUES
        (NEWID(), @Adm1, @Bed1, DATEADD(DAY,-3,@Now), NULL, 1, @Now, N'admin', 0),
        (NEWID(), @Adm2, @Bed2, DATEADD(DAY,-5,@Now), NULL, 1, @Now, N'admin', 0),
        (NEWID(), @Adm3, @Bed3, DATEADD(DAY,-1,@Now), NULL, 1, @Now, N'admin', 0);
        PRINT '  3 BedAssignments created.';
    END
END
ELSE PRINT '  Admissions already exist.';

-- ============================================================
-- SECTION 4: PAYMENTS
-- ============================================================
PRINT 'Section 4: Payments...';

IF (SELECT COUNT(*) FROM Payments) = 0
BEGIN
    INSERT INTO Payments (Id, ReceiptNumber, ReceiptDate, PatientId, MedicalRecordId, TotalAmount, InsuranceAmount, PatientAmount, DiscountAmount, PaidAmount, ChangeAmount, PaymentMethod, Notes, ReceivedByUserId, Status, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    (NEWID(), N'HD20260223001', DATEADD(DAY,-1,@Now), @Pat1, @MR1, 250000, 200000, 50000, 0, 50000, 0, 1, N'Viện phí khám - Nguyễn Văn An', @CsMai, 1, @Now, N'admin', 0),
    (NEWID(), N'HD20260223002', DATEADD(DAY,-1,@Now), @Pat2, @MR2, 180000, 144000, 36000, 0, 36000, 0, 1, N'Khám + XN - Trần Thị Bình', @CsMai, 1, @Now, N'admin', 0),
    (NEWID(), N'HD20260223003', DATEADD(DAY,-1,@Now), @Pat3, @MR3, 550000, 440000, 110000, 0, 110000, 0, 2, N'Viện phí nội trú - Lê Hoàng Cường', @CsMai, 1, @Now, N'admin', 0),
    (NEWID(), N'HD20260223004', DATEADD(DAY,-1,@Now), @Pat4, @MR4, 95000, 76000, 19000, 0, 19000, 0, 1, N'Tiền thuốc - Phạm Thị Dung', @CsMai, 1, @Now, N'admin', 0),
    (NEWID(), N'HD20260224001', @Now, @Pat5, @MR5, 350000, 280000, 70000, 0, 100000, 30000, 1, N'Tạm ứng nội trú - Hoàng Minh Đức', @CsMai, 0, @Now, N'admin', 0),
    (NEWID(), N'HD20260224002', @Now, @Pat6, @MR6, 200000, 160000, 40000, 0, 50000, 10000, 1, N'Khám + siêu âm - Võ Thị En', @CsMai, 0, @Now, N'admin', 0),
    (NEWID(), N'HD20260224003', @Now, @Pat1, @MR1, 120000, 96000, 24000, 0, 24000, 0, 1, N'Thuốc ngoại trú', @CsMai, 0, @Now, N'admin', 0),
    (NEWID(), N'HD20260224004', @Now, @Pat3, @MR3, 450000, 360000, 90000, 0, 100000, 10000, 1, N'Viện phí ra viện', @CsMai, 0, @Now, N'admin', 0);
    PRINT '  8 Payments created.';
END
ELSE PRINT '  Payments already exist.';

-- ============================================================
-- SECTION 5: INSURANCE CLAIMS
-- ============================================================
PRINT 'Section 5: InsuranceClaims...';

IF (SELECT COUNT(*) FROM InsuranceClaims) = 0
BEGIN
    INSERT INTO InsuranceClaims (Id, ClaimCode, PatientId, MedicalRecordId, InsuranceNumber, ServiceDate, TreatmentType, MainDiagnosisCode, MainDiagnosisName, TotalAmount, InsuranceAmount, PatientAmount, OutOfPocketAmount, InsurancePaymentRate, InsuranceType, DepartmentId, DoctorId, ClaimStatus, Note, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    (NEWID(), N'BH20260223001', @Pat1, @MR1, N'DN4010012345678', DATEADD(DAY,-1,@Now), 1, N'K29.7', N'Viêm dạ dày', 250000, 200000, 50000, 0, 80, 1, @KhoaNoi, @DrAn, 2, N'Đã gửi BHXH', @Now, N'admin', 0),
    (NEWID(), N'BH20260223002', @Pat2, @MR2, N'GD7920098765432', DATEADD(DAY,-1,@Now), 2, N'K80.2', N'Sỏi túi mật', 3500000, 2800000, 700000, 0, 80, 1, @KhoaNgoai, @DrBinh, 1, N'Chờ duyệt BHXH', @Now, N'admin', 0),
    (NEWID(), N'BH20260224001', @Pat3, @MR3, N'TE0100155554444', @Now, 1, N'J06.9', N'NKHHT cấp', 180000, 180000, 0, 0, 100, 3, @KhoaNhi, @DrDung, 0, N'Mới tạo', @Now, N'admin', 0),
    (NEWID(), N'BH20260220001', @Pat5, @MR5, N'HN0100199998888', DATEADD(DAY,-4,@Now), 3, N'I50', N'Suy tim', 5000000, 4000000, 1000000, 0, 80, 1, @KhoaNoi, @DrAn, 3, N'BHXH đã duyệt', @Now, N'admin', 0),
    (NEWID(), N'BH20260218001', @Pat1, @MR1, N'DN4010012345678', DATEADD(DAY,-6,@Now), 1, N'I10', N'Tăng huyết áp', 135000, 108000, 27000, 0, 80, 1, @KhoaNoi, @DrAn, 4, N'Từ chối - thiếu giấy tờ', @Now, N'admin', 0);
    PRINT '  5 InsuranceClaims created.';
END
ELSE PRINT '  InsuranceClaims already exist.';

-- ============================================================
-- SECTION 6: IMPORT RECEIPTS (warehouse purchase history)
-- ============================================================
PRINT 'Section 6: ImportReceipts...';

IF (SELECT COUNT(*) FROM ImportReceipts) = 0
BEGIN
    INSERT INTO ImportReceipts (Id, ReceiptCode, ReceiptDate, WarehouseId, ImportType, SupplierCode, SupplierName, InvoiceNumber, InvoiceDate, TotalAmount, Discount, Vat, FinalAmount, Note, Status, ApprovedBy, ApprovedAt, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    (NEWID(), N'NK20260210001', DATEADD(DAY,-14,@Now), @KhoThuocChinh, 1, N'NCC001', N'Công ty CP Dược phẩm Hà Nội', N'HD-HNP-2026-0045', DATEADD(DAY,-14,@Now), 25000000, 500000, 2450000, 26950000, N'Nhập thuốc định kỳ tháng 2/2026', 2, @PhOanh, DATEADD(DAY,-14,@Now), @Now, N'admin', 0),
    (NEWID(), N'NK20260215001', DATEADD(DAY,-9,@Now), @KhoThuocChinh, 1, N'NCC002', N'Công ty TNHH Dược phẩm Sài Gòn', N'SP-2026-00123', DATEADD(DAY,-9,@Now), 15000000, 0, 1500000, 16500000, N'Nhập kháng sinh bổ sung', 2, @PhOanh, DATEADD(DAY,-9,@Now), @Now, N'admin', 0),
    (NEWID(), N'NK20260220001', DATEADD(DAY,-4,@Now), @KhoVTYT, 2, N'NCC003', N'Công ty CP Trang thiết bị Y tế Việt Nhật', N'VN-VTYT-2026-089', DATEADD(DAY,-4,@Now), 8000000, 0, 800000, 8800000, N'Nhập vật tư y tế tiêu hao', 2, @PhOanh, DATEADD(DAY,-4,@Now), @Now, N'admin', 0),
    (NEWID(), N'NK20260224001', @Now, @KhoThuocChinh, 1, N'NCC004', N'Pharbaco', N'PB-2026-00456', @Now, 12000000, 200000, 1180000, 12980000, N'Nhập thuốc bổ sung - chờ duyệt', 0, NULL, NULL, @Now, N'admin', 0);
    PRINT '  4 ImportReceipts created.';
END
ELSE PRINT '  ImportReceipts already exist.';

-- ============================================================
-- SECTION 7: EXPORT RECEIPTS (dispensing history)
-- ============================================================
PRINT 'Section 7: ExportReceipts...';

IF (SELECT COUNT(*) FROM ExportReceipts) = 0
BEGIN
    INSERT INTO ExportReceipts (Id, ReceiptCode, ReceiptDate, WarehouseId, ExportType, PatientId, MedicalRecordId, PrescriptionId, TotalAmount, Note, Status, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    (NEWID(), N'XK20260222001', DATEADD(DAY,-2,@Now), @KhoThuocChinh, 1, @Pat4, @MR4, @Rx4, 30700, N'Xuất thuốc theo đơn DT20260224004', 2, @Now, N'admin', 0),
    (NEWID(), N'XK20260221001', DATEADD(DAY,-3,@Now), @KhoThuocChinh, 1, @Pat5, @MR5, @Rx5, 44000, N'Xuất thuốc theo đơn DT20260224005', 2, @Now, N'admin', 0),
    (NEWID(), N'XK20260223001', DATEADD(DAY,-1,@Now), @KhoThuocChinh, 2, NULL, NULL, NULL, 250000, N'Xuất chuyển kho -> Tủ trực Khoa Nội', 2, @Now, N'admin', 0),
    (NEWID(), N'XK20260224001', @Now, @KhoThuocChinh, 1, @Pat3, @MR3, @Rx3, 99000, N'Đang xuất thuốc THA', 1, @Now, N'admin', 0);
    PRINT '  4 ExportReceipts created.';
END
ELSE PRINT '  ExportReceipts already exist.';

-- ============================================================
-- SECTION 8: BLOOD BANK DATA
-- ============================================================
PRINT 'Section 8: Blood Bank...';

-- Blood Product Types
IF (SELECT COUNT(*) FROM BloodProductTypes) = 0
BEGIN
    DECLARE @BPT1 UNIQUEIDENTIFIER = NEWID();
    DECLARE @BPT2 UNIQUEIDENTIFIER = NEWID();
    DECLARE @BPT3 UNIQUEIDENTIFIER = NEWID();
    DECLARE @BPT4 UNIQUEIDENTIFIER = NEWID();

    INSERT INTO BloodProductTypes (Id, Code, Name, Description, ShelfLifeDays, MinTemperature, MaxTemperature, StandardVolume, Unit, Price, InsurancePrice, IsActive)
    VALUES
    (@BPT1, N'WB', N'Máu toàn phần', N'Whole Blood - máu toàn phần bảo quản', 35, 2, 6, 350, N'ml', 500000, 400000, 1),
    (@BPT2, N'RBC', N'Khối hồng cầu', N'Packed Red Blood Cells - khối hồng cầu đậm đặc', 42, 2, 6, 250, N'ml', 600000, 480000, 1),
    (@BPT3, N'FFP', N'Huyết tương tươi đông lạnh', N'Fresh Frozen Plasma', 365, -25, -18, 200, N'ml', 400000, 320000, 1),
    (@BPT4, N'PLT', N'Khối tiểu cầu', N'Platelet Concentrate', 5, 20, 24, 50, N'ml', 700000, 560000, 1);
    PRINT '  4 BloodProductTypes created.';

    -- Blood Suppliers
    DECLARE @BS1 UNIQUEIDENTIFIER = NEWID();
    INSERT INTO BloodSuppliers (Id, Code, Name, Address, Phone, Email, ContactPerson, License, LicenseExpiryDate, IsActive)
    VALUES
    (@BS1, N'VNRC-HN', N'Viện Huyết học - Truyền máu Trung ương', N'Số 1 Phạm Văn Bạch, Cầu Giấy, Hà Nội', N'024.3868.4131', N'info@nihbt.org.vn', N'PGS.TS Nguyễn Hà Thanh', N'BYT-HTTM-001', '2028-12-31', 1),
    (NEWID(), N'VNRC-HCM', N'BV Truyền máu - Huyết học TP.HCM', N'201B Nguyễn Chí Thanh, Q.5, TP.HCM', N'028.3957.1342', N'contact@bthh.org.vn', N'TS. Phù Chí Dũng', N'BYT-HTTM-002', '2028-12-31', 1);
    PRINT '  2 BloodSuppliers created.';

    -- Blood Bags
    INSERT INTO BloodBags (Id, BagCode, Barcode, BloodType, RhFactor, ProductTypeId, Volume, Unit, CollectionDate, ExpiryDate, DonorCode, DonorName, SupplierId, Status, StorageLocation, Temperature, TestResults, IsTestPassed, Note, CreatedAt, CreatedBy)
    VALUES
    (NEWID(), N'MU20260210001', N'2026021000001', N'A', N'+', @BPT1, 350, N'ml', DATEADD(DAY,-14,@Now), DATEADD(DAY,21,@Now), N'NHM001', N'Nguyễn Văn Hùng', @BS1, N'Available', N'Tủ lạnh A - Ngăn 1', 4, N'HIV(-), HBV(-), HCV(-), Syphilis(-)', 1, N'Máu toàn phần', @Now, N'admin'),
    (NEWID(), N'MU20260210002', N'2026021000002', N'O', N'+', @BPT1, 350, N'ml', DATEADD(DAY,-14,@Now), DATEADD(DAY,21,@Now), N'NHM002', N'Trần Thị Lan', @BS1, N'Available', N'Tủ lạnh A - Ngăn 1', 4, N'HIV(-), HBV(-), HCV(-), Syphilis(-)', 1, N'Máu toàn phần', @Now, N'admin'),
    (NEWID(), N'MU20260215001', N'2026021500001', N'B', N'+', @BPT2, 250, N'ml', DATEADD(DAY,-9,@Now), DATEADD(DAY,33,@Now), N'NHM003', N'Lê Minh Tuấn', @BS1, N'Available', N'Tủ lạnh A - Ngăn 2', 4, N'HIV(-), HBV(-), HCV(-), Syphilis(-)', 1, N'Khối hồng cầu', @Now, N'admin'),
    (NEWID(), N'MU20260215002', N'2026021500002', N'AB', N'+', @BPT3, 200, N'ml', DATEADD(DAY,-9,@Now), DATEADD(DAY,356,@Now), N'NHM004', N'Phạm Thu Hà', @BS1, N'Available', N'Tủ đông B', -20, N'HIV(-), HBV(-), HCV(-), Syphilis(-)', 1, N'Huyết tương tươi đông lạnh', @Now, N'admin'),
    (NEWID(), N'MU20260220001', N'2026022000001', N'O', N'-', @BPT1, 350, N'ml', DATEADD(DAY,-4,@Now), DATEADD(DAY,31,@Now), N'NHM005', N'Hoàng Đức Anh', @BS1, N'Available', N'Tủ lạnh B - Ngăn 2', 4, N'HIV(-), HBV(-), HCV(-), Syphilis(-)', 1, N'Máu nhóm hiếm O-', @Now, N'admin'),
    (NEWID(), N'MU20260220002', N'2026022000002', N'A', N'+', @BPT2, 250, N'ml', DATEADD(DAY,-4,@Now), DATEADD(DAY,38,@Now), N'NHM001', N'Nguyễn Văn Hùng', @BS1, N'Reserved', N'Tủ lạnh A - Ngăn 3', 4, N'HIV(-), HBV(-), HCV(-), Syphilis(-)', 1, N'Đặt trước cho PT', @Now, N'admin'),
    (NEWID(), N'MU20260101001', N'2026010100001', N'B', N'+', @BPT1, 350, N'ml', DATEADD(DAY,-54,@Now), DATEADD(DAY,-19,@Now), N'NHM003', N'Lê Minh Tuấn', @BS1, N'Expired', N'Hủy', 4, N'HIV(-), HBV(-), HCV(-), Syphilis(-)', 1, N'Hết hạn - đã hủy', @Now, N'admin'),
    (NEWID(), N'MU20260205001', N'2026020500001', N'O', N'+', @BPT1, 350, N'ml', DATEADD(DAY,-19,@Now), DATEADD(DAY,16,@Now), N'NHM002', N'Trần Thị Lan', @BS1, N'Transfused', N'Đã sử dụng', 4, N'HIV(-), HBV(-), HCV(-), Syphilis(-)', 1, N'Đã truyền cho BN', @Now, N'admin');
    PRINT '  8 BloodBags created.';

    -- Blood Orders
    INSERT INTO BloodOrders (Id, OrderCode, OrderDate, PatientId, PatientCode, PatientName, PatientBloodType, PatientRhFactor, DepartmentId, DepartmentName, OrderDoctorName, Diagnosis, ClinicalIndication, Status, CreatedAt)
    VALUES
    (NEWID(), N'YC20260220001', DATEADD(DAY,-4,@Now), @Pat5, N'BN005', N'Hoàng Minh Đức', N'O', N'+', @KhoaNoi, N'Khoa Nội', N'BS. Nguyễn Văn An', N'Suy tim + thiếu máu', N'Hb < 7g/dL, cần truyền máu cấp', N'Completed', @Now),
    (NEWID(), N'YC20260224001', @Now, @Pat2, N'BN002', N'Trần Thị Bình', N'A', N'+', @KhoaNgoai, N'Khoa Ngoại', N'BS. Trần Thị Bình', N'Sỏi túi mật viêm', N'Dự trữ cho phẫu thuật cắt túi mật', N'Approved', @Now),
    (NEWID(), N'YC20260224002', @Now, @Pat1, N'BN001', N'Nguyễn Văn An', N'A', N'+', @KhoaNoi, N'Khoa Nội', N'BS. Nguyễn Văn An', N'Viêm phổi nặng + thiếu máu', N'Truyền máu hỗ trợ', N'Pending', @Now);
    PRINT '  3 BloodOrders created.';
END
ELSE PRINT '  Blood Bank data already exists.';

-- ============================================================
-- SECTION 9: EXAMINATIONS (to link with prescriptions)
-- ============================================================
PRINT 'Section 9: Examinations...';

DECLARE @Exam1 UNIQUEIDENTIFIER = 'AA000001-0001-0001-0001-000000000001';
IF NOT EXISTS (SELECT 1 FROM Examinations WHERE Id = @Exam1)
BEGIN
    INSERT INTO Examinations (Id, MedicalRecordId, ExaminationType, QueueNumber, StartTime, DepartmentId, RoomId, DoctorId, ChiefComplaint, PresentIllness, PhysicalExamination, Temperature, Pulse, BloodPressureSystolic, BloodPressureDiastolic, RespiratoryRate, Weight, Height, SpO2, InitialDiagnosis, MainDiagnosis, MainIcdCode, TreatmentPlan, Status, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    (@Exam1, @MR1, 1, 1, DATEADD(HOUR,-3,@Now), @KhoaNoi, @PK_101, @DrAn, N'Đau bụng thượng vị 3 ngày', N'BN đau bụng vùng thượng vị, buồn nôn, ợ chua, không sốt', N'Bụng mềm, ấn đau thượng vị, gan lách không to', 37.0, 80, 125, 80, 18, 65, 168, 98, N'Viêm dạ dày cấp', N'Viêm dạ dày cấp', N'K29.7', N'Omeprazole + Paracetamol, tái khám sau 7 ngày', 3, @Now, N'admin', 0),
    ('AA000002-0001-0001-0001-000000000001', @MR2, 1, 2, DATEADD(HOUR,-2,@Now), @KhoaNgoai, @PK_102, @DrBinh, N'Sốt, ho, đau họng 5 ngày', N'BN sốt 38.5, ho có đờm trắng, đau họng, chảy mũi', N'Họng đỏ, amidan sưng, phổi trong', 38.5, 90, 120, 75, 20, 55, 160, 97, N'Nhiễm khuẩn hô hấp trên', N'NKHHT cấp', N'J06.9', N'Amoxicillin + Paracetamol + Vitamin C', 3, @Now, N'admin', 0),
    ('AA000003-0001-0001-0001-000000000001', @MR3, 1, 3, DATEADD(DAY,-1,@Now), @KhoaNoi, @PK_101, @DrAn, N'Đau đầu, chóng mặt', N'BN đau đầu vùng chẩm, chóng mặt khi đứng lên, HA cao', N'Tim đều, phổi trong, không phù', 36.8, 78, 155, 95, 16, 70, 172, 99, N'Tăng huyết áp', N'Tăng huyết áp vô căn', N'I10', N'Amlodipine + Metformin, theo dõi HA hàng ngày', 3, @Now, N'admin', 0),
    ('AA000004-0001-0001-0001-000000000001', @MR4, 1, 1, DATEADD(DAY,-2,@Now), @KhoaNhi, @PK_102, @DrDung, N'Ho, sốt, khó thở', N'Trẻ 5 tuổi, ho khan 4 ngày, sốt 38°C, khó thở nhẹ', N'Phổi ran ẩm 2 bên, họng đỏ', 38.0, 100, 95, 60, 25, 18, 110, 96, N'Viêm phế quản cấp', N'VPQ cấp', N'J20.9', N'Azithromycin + giảm sốt, nebulizer', 3, @Now, N'admin', 0),
    ('AA000005-0001-0001-0001-000000000001', @MR5, 1, 2, DATEADD(DAY,-3,@Now), @KhoaNoi, @PK_101, @DrAn, N'Đau lưng 2 tuần', N'BN đau vùng thắt lưng 2 bên, tăng khi cúi gập, giảm khi nghỉ', N'Cột sống thắt lưng hạn chế vận động, Lasegue (-)', 36.5, 76, 120, 75, 16, 72, 175, 99, N'Đau thắt lưng', N'Đau thắt lưng do thoái hóa', N'M54.5', N'Diclofenac + Paracetamol + vật lý trị liệu', 3, @Now, N'admin', 0);
    PRINT '  5 Examinations created.';
END
ELSE PRINT '  Examinations already exist.';

-- ============================================================
-- SUMMARY
-- ============================================================
PRINT '';
PRINT '=== HIS Module Seed Data Complete ===';

DECLARE @cnt INT;
SELECT @cnt = COUNT(*) FROM Prescriptions WHERE IsDeleted = 0; PRINT '  Prescriptions: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM PrescriptionDetails WHERE IsDeleted = 0; PRINT '  PrescriptionDetails: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM Admissions WHERE IsDeleted = 0; PRINT '  Admissions: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM BedAssignments WHERE IsDeleted = 0; PRINT '  BedAssignments: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM Payments WHERE IsDeleted = 0; PRINT '  Payments: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM InsuranceClaims WHERE IsDeleted = 0; PRINT '  InsuranceClaims: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM ImportReceipts WHERE IsDeleted = 0; PRINT '  ImportReceipts: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM ExportReceipts WHERE IsDeleted = 0; PRINT '  ExportReceipts: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM BloodProductTypes; PRINT '  BloodProductTypes: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM BloodBags; PRINT '  BloodBags: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM BloodOrders; PRINT '  BloodOrders: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM Examinations WHERE IsDeleted = 0; PRINT '  Examinations: ' + CAST(@cnt AS VARCHAR);

PRINT '=== Done ===';
GO
