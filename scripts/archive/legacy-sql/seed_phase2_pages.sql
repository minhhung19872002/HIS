-- =====================================================================
-- seed_phase2_pages.sql
-- Seed sample data for 10 empty Phase 2 specialty tables.
-- Idempotent: re-runs purge by CreatedBy='seed_phase2' marker.
-- All FK PatientId picks from existing seeded patients.
-- =====================================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

DECLARE @marker uniqueidentifier = '11112222-3333-4444-5555-66667777aaaa';
DECLARE @today datetime2 = SYSDATETIME();

-- Purge prior seed
DELETE FROM QualityIndicators       WHERE CreatedBy = @marker;
DELETE FROM HivPatients             WHERE CreatedBy = @marker;
DELETE FROM ChronicDiseaseRecords   WHERE CreatedBy = @marker;
DELETE FROM MentalHealthCases       WHERE CreatedBy = @marker;
DELETE FROM ForensicCases           WHERE CreatedBy = @marker;
DELETE FROM PrenatalRecords         WHERE CreatedBy = @marker;
DELETE FROM OccupationalHealthExams WHERE CreatedBy = @marker;
DELETE FROM VaccinationRecords      WHERE CreatedBy = @marker;
DELETE FROM PathologyRequests       WHERE CreatedBy = @marker;
DELETE FROM PortalAppointments      WHERE CreatedBy = @marker;

-- Pool of patients to link
DECLARE @pat TABLE (rn int IDENTITY(1,1), Id uniqueidentifier, FullName nvarchar(100), Gender int, DOB datetime2, Phone nvarchar(20));
INSERT INTO @pat (Id, FullName, Gender, DOB, Phone)
SELECT TOP 50 Id, FullName, Gender,
    CAST(ISNULL(DateOfBirth, DATEFROMPARTS(ISNULL(YearOfBirth, 1985), 1, 1)) AS datetime2),
    PhoneNumber
FROM Patients
WHERE IsDeleted = 0
ORDER BY NEWID();

-- =====================================================================
-- 1) QualityIndicators (15 indicators)
-- =====================================================================
;WITH idx AS (SELECT TOP 15 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.objects)
INSERT INTO QualityIndicators (
    Id, IndicatorCode, Name, Category, MeasurementType, MeasurementFrequency,
    ThresholdDirection, IsActive, CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(),
    'CL.' + RIGHT('000' + CAST(n AS varchar), 3),
    CASE n
        WHEN 1 THEN N'Tỷ lệ hài lòng BN ngoại trú'
        WHEN 2 THEN N'Tỷ lệ hài lòng BN nội trú'
        WHEN 3 THEN N'Tỷ lệ hài lòng nhân viên'
        WHEN 4 THEN N'Tỷ lệ nhiễm khuẩn bệnh viện'
        WHEN 5 THEN N'Tỷ lệ ngã/té của BN'
        WHEN 6 THEN N'Sai sót thuốc'
        WHEN 7 THEN N'Sự cố y khoa nghiêm trọng'
        WHEN 8 THEN N'Thời gian chờ khám trung bình'
        WHEN 9 THEN N'Thời gian chờ XN trung bình'
        WHEN 10 THEN N'Tỷ lệ tái nhập viện <30 ngày'
        WHEN 11 THEN N'Tử vong <48h'
        WHEN 12 THEN N'Tỷ lệ EMR đầy đủ'
        WHEN 13 THEN N'Tỷ lệ ký số EMR đúng hạn'
        WHEN 14 THEN N'Tỷ lệ kê đơn theo phác đồ'
        ELSE N'Tỷ lệ tuân thủ rửa tay'
    END,
    CASE
        WHEN n IN (1,2,3) THEN N'Hài lòng người bệnh'
        WHEN n IN (4,5,6,7) THEN N'An toàn người bệnh'
        WHEN n IN (8,9,10,11) THEN N'Hiệu quả KCB'
        ELSE N'Quy trình - HSBA'
    END,
    'Rate', 'Monthly',
    CASE WHEN n IN (1,2,3,12,13,14,15) THEN 'AtLeast' ELSE 'AtMost' END,
    1, @today, @marker, 0
FROM idx;

-- =====================================================================
-- 2) HivPatients (30 patients)
-- =====================================================================
;WITH src AS (
    SELECT TOP 30 p.rn, p.Id AS PatientId, p.FullName, p.DOB,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
)
INSERT INTO HivPatients (
    Id, PatientId, HivCode, DiagnosisDate, DiagnosisType,
    ARTStatus, WHOStage, LinkedToMethadone,
    CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(), PatientId,
    'HIV-' + FORMAT(@today, 'yyyy') + '-' + RIGHT('0000' + CAST(seq AS varchar), 4),
    DATEADD(month, -((seq * 13) % 60 + 1), @today),
    CASE seq % 3 WHEN 0 THEN 'AntiHIV' WHEN 1 THEN 'PCR' ELSE 'WesternBlot' END,
    -- ARTStatus: 0=PreART, 1=OnART, 2=Interrupted, 3=Lost (most are OnART)
    CASE WHEN seq % 10 = 0 THEN 0 WHEN seq % 10 = 1 THEN 2 WHEN seq % 10 = 2 THEN 3 ELSE 1 END,
    -- WHOStage 1-4
    ((seq * 7) % 4) + 1,
    CASE WHEN seq % 7 = 0 THEN 1 ELSE 0 END,
    @today, @marker, 0
FROM src;

-- =====================================================================
-- 3) ChronicDiseaseRecords (30 records)
-- =====================================================================
DECLARE @doctorId uniqueidentifier = (SELECT TOP 1 Id FROM Users WHERE UserType = 2 OR Username = 'admin');

;WITH src AS (
    SELECT TOP 30 p.rn, p.Id AS PatientId,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
), icds AS (
    SELECT icd_v, icd_label, idx FROM (VALUES
        ('I10', N'Tăng huyết áp vô căn', 1),
        ('E11.9', N'Đái tháo đường tip 2', 2),
        ('K29.7', N'Viêm dạ dày', 3),
        ('J45.9', N'Hen suyễn', 4),
        ('M81.0', N'Loãng xương', 5),
        ('I25.10', N'Bệnh tim TMCB mạn', 6),
        ('N18.3', N'Suy thận mạn GĐ 3', 7),
        ('K70.30', N'Xơ gan rượu', 8)
    ) t(icd_v, icd_label, idx)
)
INSERT INTO ChronicDiseaseRecords (
    Id, PatientId, IcdCode, IcdName, DiagnosisDate, Status,
    DoctorId, FollowUpIntervalDays, CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(), s.PatientId,
    i.icd_v, i.icd_label,
    DATEADD(month, -((s.seq * 5) % 36), @today),
    CASE s.seq % 10 WHEN 0 THEN 'Closed' WHEN 1 THEN 'Removed' WHEN 2 THEN 'NeedFollowUp' ELSE 'Active' END,
    @doctorId,
    CASE s.seq % 4 WHEN 0 THEN 30 WHEN 1 THEN 60 WHEN 2 THEN 90 ELSE 180 END,
    @today, @marker, 0
FROM src s
CROSS APPLY (SELECT TOP 1 icd_v, icd_label FROM icds WHERE idx = ((s.seq - 1) % 8) + 1) i;

-- =====================================================================
-- 4) MentalHealthCases (25 cases)
-- =====================================================================
;WITH src AS (
    SELECT TOP 25 p.rn, p.Id AS PatientId, p.FullName,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
)
INSERT INTO MentalHealthCases (
    Id, CaseCode, PatientId, PatientName, Severity, CaseType,
    AdherenceLevel, Status, CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(),
    'TT-' + FORMAT(@today, 'yyyyMMdd') + '-' + RIGHT('000' + CAST(seq AS varchar), 3),
    PatientId, FullName,
    CASE seq % 3 WHEN 0 THEN 'severe' WHEN 1 THEN 'moderate' ELSE 'mild' END,
    CASE seq % 6
        WHEN 0 THEN 'depression' WHEN 1 THEN 'anxiety' WHEN 2 THEN 'schizophrenia'
        WHEN 3 THEN 'bipolar' WHEN 4 THEN 'ptsd' ELSE 'substance' END,
    CASE seq % 3 WHEN 0 THEN 'good' WHEN 1 THEN 'moderate' ELSE 'poor' END,
    CASE seq % 8 WHEN 0 THEN 3 WHEN 1 THEN 2 WHEN 2 THEN 1 ELSE 0 END,
    @today, @marker, 0
FROM src;

-- =====================================================================
-- 5) ForensicCases (20 cases)
-- =====================================================================
;WITH src AS (
    SELECT TOP 20 p.rn, p.Id AS PatientId, p.FullName,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
)
INSERT INTO ForensicCases (
    Id, CaseCode, CaseType, PatientId, PatientName, Status,
    CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(),
    'GD-' + FORMAT(@today, 'yyyyMMdd') + '-' + RIGHT('000' + CAST(seq AS varchar), 3),
    CASE seq % 5
        WHEN 0 THEN 'disability' WHEN 1 THEN 'driver' WHEN 2 THEN 'employment'
        WHEN 3 THEN 'insurance' ELSE 'court' END,
    PatientId, FullName,
    CASE seq % 4 WHEN 0 THEN 3 WHEN 1 THEN 2 WHEN 2 THEN 1 ELSE 0 END,
    @today, @marker, 0
FROM src;

-- =====================================================================
-- 6) PrenatalRecords (25 thai phụ — pick female patients)
-- =====================================================================
;WITH src AS (
    SELECT TOP 25 p.rn, p.Id AS PatientId, p.FullName,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
    WHERE p.Gender = 2
)
INSERT INTO PrenatalRecords (
    Id, RecordCode, PatientId, PatientName,
    Gravida, Para, GestationalAge, RiskLevel, Status,
    CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(),
    'TP-' + FORMAT(@today, 'yyyyMMdd') + '-' + RIGHT('000' + CAST(seq AS varchar), 3),
    PatientId, FullName,
    (seq % 4) + 1,
    (seq % 3),
    8 + ((seq * 3) % 32),  -- weeks 8-40
    CASE seq % 5 WHEN 0 THEN 'high' WHEN 1 THEN 'very_high' WHEN 2 THEN 'medium' ELSE 'low' END,
    CASE seq % 8 WHEN 0 THEN 1 WHEN 1 THEN 2 ELSE 0 END,
    @today, @marker, 0
FROM src;

-- =====================================================================
-- 7) OccupationalHealthExams (30 exams) — minimal required cols
-- =====================================================================
;WITH src AS (SELECT TOP 30 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS seq FROM sys.objects)
INSERT INTO OccupationalHealthExams (
    Id, ExamType, Status, CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(),
    CASE seq % 3 WHEN 0 THEN 'periodic' WHEN 1 THEN 'preEmployment' ELSE 'postExposure' END,
    CASE seq % 4 WHEN 0 THEN 3 WHEN 1 THEN 2 WHEN 2 THEN 1 ELSE 0 END,
    @today, @marker, 0
FROM src;

-- =====================================================================
-- 8) VaccinationRecords (30 mũi tiêm)
-- =====================================================================
;WITH src AS (
    SELECT TOP 30 p.rn, p.Id AS PatientId, p.FullName, p.Gender, p.DOB,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
), vacs AS (
    SELECT vac_v, vac_label, idx FROM (VALUES
        ('BCG', N'BCG (Lao)', 1),
        ('VGB', N'Viêm gan B sơ sinh', 2),
        ('5IN1', N'5 trong 1 (DPT-VGB-Hib)', 3),
        ('OPV', N'Bại liệt uống', 4),
        ('SOI', N'Sởi', 5),
        ('SR', N'Sởi-Rubella', 6),
        ('VAR', N'Thủy đậu', 7),
        ('MMR', N'Quai bị-Sởi-Rubella', 8),
        ('CV19', N'COVID-19', 9),
        ('FLU', N'Cúm mùa', 10)
    ) t(vac_v, vac_label, idx)
)
INSERT INTO VaccinationRecords (
    Id, PatientId, VaccineCode, VaccinationDate,
    BatchNumber, LotNumber, Manufacturer,
    PatientName, PatientAge, PatientGender,
    InjectionSite, AdministeredByName, FacilityName,
    Status, IsEPI, ConsentGiven, AefiSeverity,
    CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(), s.PatientId, v.vac_v,
    DATEADD(day, -((s.seq * 11) % 60), @today),
    'BAT' + RIGHT('0000' + CAST(s.seq AS varchar), 4),
    'LOT2025' + RIGHT('00' + CAST(s.seq AS varchar), 2),
    CASE s.seq % 3 WHEN 0 THEN 'GSK' WHEN 1 THEN 'Pfizer' ELSE 'Sanofi' END,
    s.FullName,
    DATEDIFF(YEAR, s.DOB, @today),
    CASE s.Gender WHEN 1 THEN 'M' WHEN 2 THEN 'F' ELSE 'O' END,
    CASE s.seq % 3 WHEN 0 THEN N'Cánh tay trái' WHEN 1 THEN N'Cánh tay phải' ELSE N'Đùi' END,
    'BS. Trần Thị Mai', N'BV ĐK ABC',
    CASE s.seq % 5 WHEN 0 THEN 0 WHEN 1 THEN 2 WHEN 2 THEN 3 ELSE 1 END,
    CASE WHEN v.idx <= 8 THEN 1 ELSE 0 END,
    1, 0,
    @today, @marker, 0
FROM src s
CROSS APPLY (SELECT TOP 1 vac_v, idx FROM vacs WHERE idx = ((s.seq - 1) % 10) + 1) v;

-- =====================================================================
-- 9) PathologyRequests (25 requests)
-- =====================================================================
;WITH src AS (
    SELECT TOP 25 p.rn, p.Id AS PatientId,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
)
INSERT INTO PathologyRequests (
    Id, RequestCode, PatientId, RequestingDoctorId, RequestDate,
    SpecimenType, SpecimenCount, Priority, Status,
    PatientType, TotalAmount, IsPaid,
    CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(),
    'GPB-' + FORMAT(@today, 'yyyyMMdd') + '-' + RIGHT('000' + CAST(seq AS varchar), 3),
    PatientId, @doctorId,
    DATEADD(day, -((seq * 7) % 30), @today),
    CASE seq % 4 WHEN 0 THEN 'biopsy' WHEN 1 THEN 'cytology' WHEN 2 THEN 'pap' ELSE 'frozenSection' END,
    1 + (seq % 3),
    CASE seq % 5 WHEN 0 THEN 'urgent' ELSE 'normal' END,
    CASE seq % 5 WHEN 0 THEN 4 WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 1 ELSE 0 END,
    1,
    CAST(500000 + ((seq * 100000) % 1500000) AS decimal(18,2)),
    CASE seq % 3 WHEN 0 THEN 0 ELSE 1 END,
    @today, @marker, 0
FROM src;

-- =====================================================================
-- 10) PortalAppointments (30 online appointments)
-- =====================================================================
;WITH src AS (
    SELECT TOP 30 p.rn, p.Id AS PatientId,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
)
INSERT INTO PortalAppointments (
    Id, PatientId, AppointmentDate, IsDeleted,
    BookingFee, IsPaid, IsRefunded, ReminderSent,
    CreatedAt, CreatedBy
)
SELECT
    NEWID(), PatientId,
    DATEADD(day, -10 + ((seq * 2) % 30), @today),
    0,
    CAST(50000 + ((seq * 25000) % 200000) AS decimal(18,2)),
    CASE seq % 3 WHEN 0 THEN 0 ELSE 1 END,
    0,
    CASE seq % 4 WHEN 0 THEN 0 ELSE 1 END,
    @today, @marker
FROM src;

-- ─── Report ───
SELECT 'QualityIndicators' AS t, COUNT(*) AS n FROM QualityIndicators WHERE CreatedBy = @marker
UNION ALL SELECT 'HivPatients', COUNT(*) FROM HivPatients WHERE CreatedBy = @marker
UNION ALL SELECT 'ChronicDiseaseRecords', COUNT(*) FROM ChronicDiseaseRecords WHERE CreatedBy = @marker
UNION ALL SELECT 'MentalHealthCases', COUNT(*) FROM MentalHealthCases WHERE CreatedBy = @marker
UNION ALL SELECT 'ForensicCases', COUNT(*) FROM ForensicCases WHERE CreatedBy = @marker
UNION ALL SELECT 'PrenatalRecords', COUNT(*) FROM PrenatalRecords WHERE CreatedBy = @marker
UNION ALL SELECT 'OccupationalHealthExams', COUNT(*) FROM OccupationalHealthExams WHERE CreatedBy = @marker
UNION ALL SELECT 'VaccinationRecords', COUNT(*) FROM VaccinationRecords WHERE CreatedBy = @marker
UNION ALL SELECT 'PathologyRequests', COUNT(*) FROM PathologyRequests WHERE CreatedBy = @marker
UNION ALL SELECT 'PortalAppointments', COUNT(*) FROM PortalAppointments WHERE CreatedBy = @marker
ORDER BY t;
