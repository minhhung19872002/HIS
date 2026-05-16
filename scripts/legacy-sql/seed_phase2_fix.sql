-- Fix seed: re-seed Quality + Portal (now nvarchar) + enrich OccupationalHealth
SET QUOTED_IDENTIFIER ON;

DECLARE @markerId uniqueidentifier = '11112222-3333-4444-5555-66667777aaaa';
DECLARE @markerStr nvarchar(50) = N'seed_phase2_str';
DECLARE @today datetime2 = SYSDATETIME();

-- Purge prior seed (any marker variant)
DELETE FROM QualityIndicators       WHERE CreatedBy = @markerStr OR Name LIKE N'%hài lòng%' OR Name LIKE N'%nhiễm khuẩn%' OR Name LIKE N'%sai sót%';
DELETE FROM PortalAppointments      WHERE CreatedBy = @markerStr;
DELETE FROM OccupationalHealthExams WHERE CreatedBy = CAST(@markerId AS nvarchar(50));

-- ==== QualityIndicators (15) — now CreatedBy nvarchar ====
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
    1, @today, @markerStr, 0
FROM idx;

-- ==== PortalAppointments (re-seed with nvarchar marker + extra fields) ====
DECLARE @pat TABLE (rn int IDENTITY(1,1), Id uniqueidentifier);
INSERT INTO @pat (Id) SELECT TOP 50 Id FROM Patients WHERE IsDeleted = 0 ORDER BY NEWID();

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
    @today, @markerStr
FROM src;

-- ==== OccupationalHealthExams (30 exams with full data) ====
;WITH src AS (
    SELECT TOP 30 p.rn, p.Id AS PatientId,
        ROW_NUMBER() OVER (ORDER BY p.rn) AS seq
    FROM @pat p
)
INSERT INTO OccupationalHealthExams (
    Id, PatientId,
    EmployeeName, EmployeeCode, CompanyName, CompanyTaxCode,
    Department, JobTitle, HazardExposure, ExposureYears,
    ExamDate, ExamType, GeneralHealth,
    Classification, DoctorName, Status,
    CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(), s.PatientId,
    N'NLĐ ' + RIGHT('000' + CAST(s.seq AS varchar), 3),
    'NV' + RIGHT('00000' + CAST(s.seq AS varchar), 5),
    CASE s.seq % 5
        WHEN 0 THEN N'Công ty TNHH Sài Gòn Steel'
        WHEN 1 THEN N'Công ty CP Dệt May Hưng Phát'
        WHEN 2 THEN N'Công ty TNHH Hóa chất Petro'
        WHEN 3 THEN N'Công ty CP Xi măng Bình Minh'
        ELSE N'Công ty TNHH Điện tử Samsung'
    END,
    '0' + RIGHT('000000000' + CAST(ABS(CHECKSUM(NEWID())) % 999999999 AS varchar), 9),
    CASE s.seq % 4
        WHEN 0 THEN N'Sản xuất' WHEN 1 THEN N'Bảo trì' WHEN 2 THEN N'Văn phòng' ELSE N'Kho bãi'
    END,
    CASE s.seq % 5
        WHEN 0 THEN N'Công nhân vận hành máy' WHEN 1 THEN N'Kỹ thuật viên'
        WHEN 2 THEN N'Nhân viên kế toán' WHEN 3 THEN N'Quản đốc' ELSE N'Lái xe nâng'
    END,
    CASE s.seq % 6
        WHEN 0 THEN N'Bụi, Tiếng ồn' WHEN 1 THEN N'Hóa chất, Bức xạ'
        WHEN 2 THEN N'Tiếng ồn, Rung' WHEN 3 THEN N'Bụi silic, Hóa chất'
        WHEN 4 THEN N'Nhiệt độ cao' ELSE N'Tia X, Bụi'
    END,
    1 + (s.seq % 25),
    DATEADD(day, -((s.seq * 7) % 90), @today),
    CASE s.seq % 3 WHEN 0 THEN 'Periodic' WHEN 1 THEN 'PreEmployment' ELSE 'PostExposure' END,
    CASE s.seq % 4 WHEN 0 THEN N'Tốt' WHEN 1 THEN N'Khá' WHEN 2 THEN N'TB' ELSE N'Yếu' END,
    CASE s.seq % 5
        WHEN 0 THEN N'Đủ sức khỏe' WHEN 1 THEN N'Hạn chế'
        WHEN 2 THEN N'Không đủ' ELSE N'Đủ sức khỏe'
    END,
    'BS. Trần Thị Mai',
    CASE s.seq % 4 WHEN 0 THEN 3 WHEN 1 THEN 2 WHEN 2 THEN 1 ELSE 0 END,
    @today, CAST(@markerId AS nvarchar(50)), 0
FROM src s;

SELECT
    (SELECT COUNT(*) FROM QualityIndicators WHERE CreatedBy = @markerStr) AS quality,
    (SELECT COUNT(*) FROM PortalAppointments WHERE CreatedBy = @markerStr) AS portal,
    (SELECT COUNT(*) FROM OccupationalHealthExams) AS occupational;
