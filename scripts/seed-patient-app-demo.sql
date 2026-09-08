-- ============================================================================
-- Du lieu mau cho app benh nhan (HSMT I.2 #5) — CHI DUNG O MOI TRUONG DEMO/DEV.
--
-- Tao mot benh nhan co du: mot luot kham, mot phieu xet nghiem co chi so va co
-- chi so bat thuong, mot phieu chan doan hinh anh, mot phieu tham do chuc nang,
-- mot dot kham suc khoe hop dong, va mot don thuoc.
--
-- Chay:
--   docker exec -i his-sqlserver /opt/mssql-tools18/bin/sqlcmd \
--     -S localhost -U sa -P '<mat khau>' -C -d HIS \
--     -i scripts/seed-patient-app-demo.sql
--
-- Idempotent: chay lai nhieu lan khong sinh ban ghi trung (khoa co dinh).
-- KHONG dat trong Data/Scripts/ vi thu muc do tu chay khi khoi dong — du lieu
-- demo khong duoc phep di theo ban production.
-- ============================================================================

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

DECLARE @PatientId       uniqueidentifier = 'AAAA0001-0000-0000-0000-000000000001';
DECLARE @MedicalRecordId uniqueidentifier = 'AAAA0002-0000-0000-0000-000000000001';
DECLARE @ExaminationId   uniqueidentifier = 'AAAA0003-0000-0000-0000-000000000001';
DECLARE @SrId            uniqueidentifier = 'AAAA0004-0000-0000-0000-000000000001';
DECLARE @SrdId           uniqueidentifier = 'AAAA0005-0000-0000-0000-000000000001';
DECLARE @RadReqId        uniqueidentifier = 'AAAA0006-0000-0000-0000-000000000001';
DECLARE @RadExamId       uniqueidentifier = 'AAAA0007-0000-0000-0000-000000000001';
DECLARE @RadReportId     uniqueidentifier = 'AAAA0008-0000-0000-0000-000000000001';
DECLARE @StudyId         uniqueidentifier = 'AAAA0009-0000-0000-0000-000000000001';
DECLARE @FdtId           uniqueidentifier = 'AAAA0010-0000-0000-0000-000000000001';
DECLARE @CampaignId      uniqueidentifier = 'AAAA0011-0000-0000-0000-000000000001';
DECLARE @CheckupId       uniqueidentifier = 'AAAA0012-0000-0000-0000-000000000001';
DECLARE @PrescriptionId  uniqueidentifier = 'AAAA0013-0000-0000-0000-000000000001';
DECLARE @AdmissionId     uniqueidentifier = 'AAAA0014-0000-0000-0000-000000000001';
DECLARE @IpRecordId      uniqueidentifier = 'AAAA0015-0000-0000-0000-000000000001';
DECLARE @IpSrId          uniqueidentifier = 'AAAA0016-0000-0000-0000-000000000001';
DECLARE @IpSrdId         uniqueidentifier = 'AAAA0017-0000-0000-0000-000000000001';
DECLARE @IpRxId          uniqueidentifier = 'AAAA0018-0000-0000-0000-000000000001';
DECLARE @IpTicketId      uniqueidentifier = 'AAAA0019-0000-0000-0000-000000000001';

DECLARE @Phone nvarchar(20) = N'0900000001';
DECLARE @Now datetime2 = SYSUTCDATETIME();

-- Tham chieu: lay bat ky ban ghi hop le dang co trong he thong.
DECLARE @DoctorId     uniqueidentifier = (SELECT TOP 1 Id FROM Users WHERE IsDeleted = 0 ORDER BY CreatedAt);
DECLARE @DepartmentId uniqueidentifier = (SELECT TOP 1 Id FROM Departments WHERE IsDeleted = 0 ORDER BY DepartmentCode);
DECLARE @RoomId       uniqueidentifier = (SELECT TOP 1 Id FROM Rooms WHERE IsDeleted = 0 ORDER BY RoomCode);
DECLARE @LabServiceId uniqueidentifier = (SELECT TOP 1 Id FROM Services WHERE ServiceType = 2 AND IsDeleted = 0 ORDER BY ServiceCode);
DECLARE @ImgServiceId uniqueidentifier = (SELECT TOP 1 Id FROM Services WHERE ServiceType = 3 AND IsDeleted = 0 ORDER BY ServiceCode);
DECLARE @ModalityId   uniqueidentifier = (SELECT TOP 1 Id FROM RadiologyModalities WHERE IsDeleted = 0 ORDER BY ModalityCode);
DECLARE @MedicineId   uniqueidentifier = (SELECT TOP 1 Id FROM Medicines WHERE IsDeleted = 0 ORDER BY MedicineName);
DECLARE @BedId        uniqueidentifier = (SELECT TOP 1 Id FROM Beds WHERE IsDeleted = 0 ORDER BY BedName);

IF @ImgServiceId IS NULL SET @ImgServiceId = @LabServiceId;

IF @DoctorId IS NULL OR @DepartmentId IS NULL OR @RoomId IS NULL OR @LabServiceId IS NULL
BEGIN
    RAISERROR (N'Thieu du lieu danh muc goc (Users/Departments/Rooms/Services). Chay seed chinh cua HIS truoc.', 16, 1);
    RETURN;
END

-- ---------------------------------------------------------------- benh nhan
IF NOT EXISTS (SELECT 1 FROM Patients WHERE Id = @PatientId)
    INSERT INTO Patients (Id, PatientCode, FullName, DateOfBirth, Gender, PhoneNumber,
                          IdentityNumber, Address, CreatedAt, IsDeleted, FingerprintNotCollected)
    VALUES (@PatientId, N'BN-DEMO-APP', N'Nguyễn Văn Demo', '1975-04-12', 1, @Phone,
            N'001075000001', N'12 Đường Demo, Phường 1, Quận 1', @Now, 0, 0);
ELSE
    UPDATE Patients SET PhoneNumber = @Phone, IsDeleted = 0 WHERE Id = @PatientId;

IF NOT EXISTS (SELECT 1 FROM MedicalRecords WHERE Id = @MedicalRecordId)
    INSERT INTO MedicalRecords (Id, MedicalRecordCode, PatientId, AdmissionDate,
                                InsuranceFiveYearContinuous, CreatedAt, IsDeleted)
    VALUES (@MedicalRecordId, N'HS-DEMO-APP', @PatientId, DATEADD(day, -3, @Now), 0, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM Examinations WHERE Id = @ExaminationId)
    INSERT INTO Examinations (Id, MedicalRecordId, DepartmentId, RoomId, DoctorId, StartTime, EndTime,
                              ChiefComplaint, MainDiagnosis, TreatmentPlan, Status,
                              IsBillPrinted, HospitalizationIsEmergency, CreatedAt, IsDeleted)
    VALUES (@ExaminationId, @MedicalRecordId, @DepartmentId, @RoomId, @DoctorId,
            DATEADD(day, -3, @Now), DATEADD(day, -3, @Now),
            N'Mệt mỏi, ăn kém 2 tuần', N'Viêm dạ dày cấp (K29.1)',
            N'Điều trị ngoại trú, tái khám sau 7 ngày', 2, 0, 0, @Now, 0);

-- ----------------------------------------------------------- xet nghiem
IF NOT EXISTS (SELECT 1 FROM ServiceRequests WHERE Id = @SrId)
    INSERT INTO ServiceRequests (Id, RequestCode, RequestDate, MedicalRecordId, ExaminationId,
                                 DoctorId, DepartmentId, RequestType, IsEmergency, IsPriority, Status,
                                 Quantity, UnitPrice, TotalPrice, TotalAmount, InsuranceAmount,
                                 PatientAmount, IsPaid, CreatedAt, IsDeleted)
    VALUES (@SrId, N'XN-DEMO-APP', DATEADD(day, -3, @Now), @MedicalRecordId, @ExaminationId,
            @DoctorId, @DepartmentId, 1, 0, 0, 2,
            1, 120000, 120000, 120000, 96000, 24000, 1, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM ServiceRequestDetails WHERE Id = @SrdId)
    INSERT INTO ServiceRequestDetails (Id, ServiceRequestId, ServiceId, Quantity, UnitPrice, Amount,
                                       InsuranceAmount, PatientAmount, PatientType, InsurancePaymentRate,
                                       Result, Conclusion, ResultDate, Status, IsSampleCollected,
                                       ReceiveStatus, CreatedAt, IsDeleted)
    VALUES (@SrdId, @SrId, @LabServiceId, 1, 120000, 120000, 96000, 24000, 1, 80,
            N'Đã có kết quả', N'Men gan tăng nhẹ, đề nghị theo dõi',
            DATEADD(day, -2, @Now), 2, 1, 1, @Now, 0);

-- Ba chi so, trong do mot chi so vuot khoang tham chieu: du de kiem tra ca
-- duong tinh lan am tinh cua co "bat thuong".
IF NOT EXISTS (SELECT 1 FROM ServiceRequestDetailParameters WHERE ServiceRequestDetailId = @SrdId)
    INSERT INTO ServiceRequestDetailParameters
        (Id, ServiceRequestDetailId, ParameterCode, ParameterName, Value, NumericValue, Unit,
         ReferenceMin, ReferenceMax, ReferenceRange, Flag, SequenceNumber, CreatedAt, IsDeleted)
    VALUES
        (NEWID(), @SrdId, N'AST', N'AST (GOT)',  N'68',   68,   N'U/L', 5,   40,  N'5 - 40',   N'H', 1, @Now, 0),
        (NEWID(), @SrdId, N'ALT', N'ALT (GPT)',  N'32',   32,   N'U/L', 5,   41,  N'5 - 41',   N'N', 2, @Now, 0),
        (NEWID(), @SrdId, N'GLU', N'Glucose',    N'5.4',  5.4,  N'mmol/L', 3.9, 6.4, N'3.9 - 6.4', N'N', 3, @Now, 0);

-- --------------------------------------------------- chan doan hinh anh
IF NOT EXISTS (SELECT 1 FROM RadiologyRequests WHERE Id = @RadReqId)
    INSERT INTO RadiologyRequests (Id, RequestCode, PatientId, ExaminationId, MedicalRecordId,
                                   RequestDate, ServiceId, RequestingDoctorId, Priority, Status,
                                   ClinicalInfo, BodyPart, Contrast, PatientType,
                                   TotalAmount, InsuranceAmount, PatientAmount, IsPaid, CreatedAt, IsDeleted)
    VALUES (@RadReqId, N'CDHA-DEMO-APP', @PatientId, @ExaminationId, @MedicalRecordId,
            DATEADD(day, -3, @Now), @ImgServiceId, @DoctorId, 1, 5,
            N'Đau thượng vị', N'Bụng tổng quát', 0, 1,
            250000, 200000, 50000, 1, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM RadiologyExams WHERE Id = @RadExamId)
    INSERT INTO RadiologyExams (Id, RadiologyRequestId, ExamCode, ExamName, ExamDate, ModalityId,
                                RoomId, AccessionNumber, Status, CreatedAt, IsDeleted)
    VALUES (@RadExamId, @RadReqId, N'CHUP-DEMO-APP', N'Siêu âm ổ bụng tổng quát',
            DATEADD(day, -3, @Now), @ModalityId, @RoomId, N'ACC-DEMO-APP', 2, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM RadiologyReports WHERE Id = @RadReportId)
    INSERT INTO RadiologyReports (Id, RadiologyExamId, RadiologistId, Findings, Impression,
                                  Recommendations, ReportDate, Status, CreatedAt, IsDeleted)
    VALUES (@RadReportId, @RadExamId, @DoctorId,
            N'Gan kích thước bình thường, nhu mô đều. Túi mật thành mỏng, không sỏi. Thận hai bên không ứ nước.',
            N'Siêu âm ổ bụng trong giới hạn bình thường',
            N'Tái khám khi có triệu chứng mới', DATEADD(day, -2, @Now), 2, @Now, 0);

-- Study nay khong co anh that trong PACS: dat NumberOfImages = 0 de app hien
-- dung "chua co hinh anh" thay vi bay ra mot khung xem anh rong.
IF NOT EXISTS (SELECT 1 FROM DicomStudies WHERE Id = @StudyId)
    INSERT INTO DicomStudies (Id, RadiologyExamId, StudyInstanceUID, StudyDate, StudyDescription,
                              AccessionNumber, NumberOfSeries, NumberOfImages, Status, IsArchived,
                              CreatedAt, IsDeleted)
    VALUES (@StudyId, @RadExamId, N'1.2.826.0.1.3680043.8.498.DEMO.APP.0001',
            DATEADD(day, -3, @Now), N'Sieu am o bung tong quat', N'ACC-DEMO-APP',
            0, 0, 1, 0, @Now, 0);

-- ------------------------------------------------- tham do chuc nang
IF NOT EXISTS (SELECT 1 FROM FunctionalDiagnosticTests WHERE Id = @FdtId)
    INSERT INTO FunctionalDiagnosticTests (Id, TestCode, PatientId, MedicalRecordId, ExaminationId,
                                           TestType, PerformingDoctorId, PerformingDoctorName,
                                           PerformedAt, DeviceName, ClinicalIndication, Findings,
                                           Conclusion, Recommendation, MeasurementsJson, ImagesJson,
                                           Status, CreatedAt, IsDeleted)
    VALUES (@FdtId, N'TDCN-DEMO-APP', @PatientId, @MedicalRecordId, @ExaminationId,
            N'ECG', @DoctorId, N'BS. Trần Thị Demo',
            DATEADD(day, -3, @Now), N'Nihon Kohden ECG-2350',
            N'Kiểm tra thường quy', N'Nhịp xoang đều, không thấy ST chênh',
            N'Điện tim trong giới hạn bình thường', N'Không cần can thiệp',
            N'{"Tần số tim":"78 lần/phút","Khoảng PR":"0.16 s","Khoảng QT":"0.38 s","Trục điện tim":"+45 độ"}',
            N'[]', 3, @Now, 0);

-- ------------------------------------------- kham suc khoe hop dong
IF NOT EXISTS (SELECT 1 FROM HealthCheckupCampaigns WHERE Id = @CampaignId)
    INSERT INTO HealthCheckupCampaigns (Id, CampaignCode, CampaignName, OrganizationName,
                                        StartDate, EndDate, Status, TotalRegistered, TotalCompleted,
                                        PackageDescription, CreatedAt, IsDeleted)
    VALUES (@CampaignId, N'KSK-DEMO-APP', N'Khám sức khoẻ định kỳ 2026',
            N'Công ty TNHH Demo Việt Nam', DATEADD(day, -30, @Now), DATEADD(day, -20, @Now),
            2, 120, 118, N'Gói khám sức khoẻ định kỳ theo Thông tư 32', @Now, 0);

IF NOT EXISTS (SELECT 1 FROM HealthCheckupRecords WHERE Id = @CheckupId)
    INSERT INTO HealthCheckupRecords (Id, CampaignId, PatientId, EmployeeName, EmployeeCode,
                                      Department, CheckupDate, ResultSummary, CertificateIssued,
                                      CertificateNumber, Classification, DoctorId, Notes,
                                      BloodPressure, Height, Weight, BMI, VisionLeft, VisionRight,
                                      HearingResult, CreatedAt, IsDeleted)
    VALUES (@CheckupId, @CampaignId, @PatientId, N'Nguyễn Văn Demo', N'NV-DEMO-001',
            N'Phòng Kỹ thuật', DATEADD(day, -25, @Now),
            N'Sức khoẻ ổn định. Men gan tăng nhẹ, cần theo dõi.', 1,
            N'GCN-DEMO-2026-001', N'B', @DoctorId,
            N'Hạn chế rượu bia, tái khám men gan sau 3 tháng',
            N'125/80', 168, 66, 23.4, N'10/10', N'10/10', N'Bình thường', @Now, 0);

-- ------------------------------------------------------------ don thuoc
IF @MedicineId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Prescriptions WHERE Id = @PrescriptionId)
BEGIN
    INSERT INTO Prescriptions (Id, PrescriptionCode, PrescriptionDate, MedicalRecordId, ExaminationId,
                               DoctorId, DepartmentId, PrescriptionType, Diagnosis, TotalDays,
                               TotalTangs, TotalAmount, InsuranceAmount, PatientAmount, Status,
                               IsDispensed, PaymentCategory, DrugOrderType, CreatedAt, IsDeleted)
    VALUES (@PrescriptionId, N'DT-DEMO-APP', DATEADD(day, -3, @Now), @MedicalRecordId, @ExaminationId,
            @DoctorId, @DepartmentId, 1, N'Viêm dạ dày cấp (K29.1)', 7,
            0, 185000, 148000, 37000, 1, 0, 1, 1, @Now, 0);

    INSERT INTO PrescriptionDetails (Id, PrescriptionId, MedicineId, Quantity, DispensedQuantity,
                                     UnitPrice, Amount, InsuranceAmount, PatientAmount, PatientType,
                                     InsurancePaymentRate, Dosage, Frequency, Days, Unit,
                                     UsageInstructions, TotalPrice, Status, CreatedAt, IsDeleted)
    VALUES (NEWID(), @PrescriptionId, @MedicineId, 14, 0,
            13214, 185000, 148000, 37000, 1, 80,
            N'1 viên', N'2 lần/ngày', 7, N'Viên',
            N'Uống sau ăn 30 phút, sáng và tối', 185000, 0, @Now, 0);
END

-- ============================================================ NOI TRU
-- Mot dot nam vien dang dieu tri, co: don thuoc noi tru (bang cong khai thuoc),
-- mot chi dinh can lam sang chua co ket qua, va mot ve xep hang tai phong thuc
-- hien de kiem so thu tu.

IF NOT EXISTS (SELECT 1 FROM MedicalRecords WHERE Id = @IpRecordId)
    INSERT INTO MedicalRecords (Id, MedicalRecordCode, PatientId, AdmissionDate,
                                InsuranceFiveYearContinuous, CreatedAt, IsDeleted)
    VALUES (@IpRecordId, N'HS-DEMO-NT', @PatientId, DATEADD(day, -5, @Now), 0, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM Admissions WHERE Id = @AdmissionId)
    INSERT INTO Admissions (Id, PatientId, MedicalRecordId, AdmissionDate, AdmissionType,
                            AdmittingDoctorId, DepartmentId, RoomId, BedId, Status,
                            ReasonForAdmission, DiagnosisOnAdmission, CreatedAt, IsDeleted)
    VALUES (@AdmissionId, @PatientId, @IpRecordId, DATEADD(day, -5, @Now), 3,
            @DoctorId, @DepartmentId, @RoomId, @BedId, 0,
            N'Đau bụng dữ dội, sốt cao', N'Viêm ruột thừa cấp (K35.8)', @Now, 0);

-- Don thuoc noi tru (PrescriptionType = 2) -> bang cong khai thuoc
IF @MedicineId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Prescriptions WHERE Id = @IpRxId)
BEGIN
    INSERT INTO Prescriptions (Id, PrescriptionCode, PrescriptionDate, MedicalRecordId,
                               DoctorId, DepartmentId, PrescriptionType, Diagnosis, TotalDays,
                               TotalTangs, TotalAmount, InsuranceAmount, PatientAmount, Status,
                               IsDispensed, PaymentCategory, DrugOrderType, CreatedAt, IsDeleted)
    VALUES (@IpRxId, N'DT-DEMO-NT', DATEADD(day, -4, @Now), @IpRecordId,
            @DoctorId, @DepartmentId, 2, N'Viêm ruột thừa cấp (K35.8)', 3,
            0, 96000, 76800, 19200, 2, 1, 1, 1, @Now, 0);

    INSERT INTO PrescriptionDetails (Id, PrescriptionId, MedicineId, Quantity, DispensedQuantity,
                                     UnitPrice, Amount, InsuranceAmount, PatientAmount, PatientType,
                                     InsurancePaymentRate, Dosage, Frequency, Days, Unit,
                                     UsageInstructions, TotalPrice, Status, CreatedAt, IsDeleted)
    VALUES (NEWID(), @IpRxId, @MedicineId, 6, 6,
            16000, 96000, 76800, 19200, 1, 80,
            N'1 lọ', N'2 lần/ngày', 3, N'Lọ',
            N'Tiêm tĩnh mạch chậm, sáng và chiều', 96000, 2, @Now, 0);
END

-- Chi dinh can lam sang cua dot noi tru, chua co ket qua
IF NOT EXISTS (SELECT 1 FROM ServiceRequests WHERE Id = @IpSrId)
    INSERT INTO ServiceRequests (Id, RequestCode, RequestDate, MedicalRecordId,
                                 DoctorId, DepartmentId, ExecuteRoomId, RequestType,
                                 IsEmergency, IsPriority, Status,
                                 Quantity, UnitPrice, TotalPrice, TotalAmount, InsuranceAmount,
                                 PatientAmount, IsPaid, CreatedAt, IsDeleted)
    VALUES (@IpSrId, N'XN-DEMO-NT', @Now, @IpRecordId,
            @DoctorId, @DepartmentId, @RoomId, 1,
            0, 0, 0,
            1, 90000, 90000, 90000, 72000, 18000, 1, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM ServiceRequestDetails WHERE Id = @IpSrdId)
    INSERT INTO ServiceRequestDetails (Id, ServiceRequestId, ServiceId, Quantity, UnitPrice, Amount,
                                       InsuranceAmount, PatientAmount, PatientType, InsurancePaymentRate,
                                       Status, IsSampleCollected, ReceiveStatus, CreatedAt, IsDeleted)
    VALUES (@IpSrdId, @IpSrId, @LabServiceId, 1, 90000, 90000, 72000, 18000, 1, 80,
            0, 0, 0, @Now, 0);

-- Ve xep hang tai phong thuc hien, de app hien duoc so thu tu cua chi dinh tren
IF NOT EXISTS (SELECT 1 FROM QueueTickets WHERE Id = @IpTicketId)
    INSERT INTO QueueTickets (Id, TicketNumber, QueueNumber, IssueDate, PatientId, RoomId,
                              QueueType, Priority, PriorityVerified, Status, Notes, CreatedAt, IsDeleted)
    VALUES (@IpTicketId, N'C042', 42, @Now, @PatientId, @RoomId,
            3, 0, 0, 0, N'Demo', @Now, 0);

SELECT N'Da tao du lieu demo cho benh nhan' AS Ket_qua,
       (SELECT PatientCode FROM Patients WHERE Id = @PatientId) AS Ma_benh_nhan,
       @Phone AS So_dien_thoai;
