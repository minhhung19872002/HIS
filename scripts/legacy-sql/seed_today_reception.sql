-- =====================================================================
-- seed_today_reception.sql
-- Seed 30 fresh Patients + matching MedicalRecords + QueueTickets
-- stamped today, for the /v2/reception page demo.
-- Patients have full clean data (FullName, Gender, DOB, Phone, BHYT,
-- Address) so the table renders meaningful rows instead of "—".
-- Idempotent: re-runs purge prior seed via marker (CreatedBy column).
-- =====================================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;

DECLARE @today date     = CAST(SYSDATETIME() AS date);
DECLARE @baseTime datetime2 = DATEADD(hour, 7, CAST(@today AS datetime2)); -- 07:00 today
DECLARE @marker nvarchar(50) = N'seed_today_reception';

-- ─── Purge prior seed (so re-runs don't pile up) ───
DELETE qt FROM QueueTickets qt
WHERE CAST(qt.IssueDate AS date) = @today AND qt.CreatedBy = @marker;

DELETE mr FROM MedicalRecords mr
WHERE CAST(mr.AdmissionDate AS date) = @today AND mr.CreatedBy = @marker;

DELETE p FROM Patients p WHERE p.CreatedBy = @marker;

-- ─── Pick reception rooms (Khoa Khám bệnh) ───
DECLARE @rooms TABLE (rn int IDENTITY(1,1), RoomId uniqueidentifier, DepartmentId uniqueidentifier, RoomCode nvarchar(50));
INSERT INTO @rooms (RoomId, DepartmentId, RoomCode)
SELECT TOP 6 r.Id, r.DepartmentId, r.RoomCode
FROM Rooms r
JOIN Departments d ON d.Id = r.DepartmentId
WHERE r.IsActive = 1
  AND (d.DepartmentName LIKE N'%Khám bệnh%' OR r.RoomCode LIKE 'P10%')
ORDER BY r.RoomCode;

DECLARE @roomCount int = (SELECT COUNT(*) FROM @rooms);
IF @roomCount = 0
BEGIN
    INSERT INTO @rooms (RoomId, DepartmentId, RoomCode)
    SELECT TOP 6 r.Id, r.DepartmentId, r.RoomCode FROM Rooms r WHERE r.IsActive = 1 ORDER BY r.RoomCode;
    SET @roomCount = (SELECT COUNT(*) FROM @rooms);
END;

-- ─── 30 Vietnamese patient names ───
DECLARE @names TABLE (rn int IDENTITY(1,1), FullName nvarchar(100), Gender int, YearOfBirth int);
INSERT INTO @names (FullName, Gender, YearOfBirth) VALUES
(N'Nguyễn Văn An',     1, 1985),
(N'Trần Thị Bình',     2, 1990),
(N'Lê Hoàng Cường',    1, 1978),
(N'Phạm Thị Dung',     2, 1992),
(N'Vũ Văn Em',         1, 1955),
(N'Đặng Thị Phương',   2, 1988),
(N'Hoàng Văn Giang',   1, 1972),
(N'Bùi Thị Hằng',      2, 1995),
(N'Mai Văn Khôi',      1, 1980),
(N'Lý Thị Lan',        2, 1965),
(N'Phan Văn Minh',     1, 1983),
(N'Đỗ Thị Nga',        2, 1991),
(N'Trịnh Văn Oanh',    1, 1970),
(N'Cao Thị Phúc',      2, 1987),
(N'Dương Văn Quân',    1, 1976),
(N'Tô Thị Rồng',       2, 1993),
(N'Nguyễn Thị Sao',    2, 1968),
(N'Lê Văn Tùng',       1, 1984),
(N'Phạm Thị Uyên',     2, 1996),
(N'Vũ Văn Vinh',       1, 1979),
(N'Hoàng Thị Xuân',    2, 1962),
(N'Trần Văn Yên',      1, 1981),
(N'Nguyễn Văn Bảo',    1, 1989),
(N'Lê Thị Bích',       2, 1994),
(N'Đỗ Văn Cương',      1, 1973),
(N'Phạm Thị Dương',    2, 1986),
(N'Bùi Văn Hà',        1, 1977),
(N'Mai Thị Hương',     2, 1998),
(N'Vũ Văn Khoa',       1, 1971),
(N'Trần Thị Lý',       2, 1985);

DECLARE @addresses TABLE (rn int IDENTITY(1,1), Address nvarchar(200));
INSERT INTO @addresses (Address) VALUES
(N'12 Lê Lợi, P. Bến Nghé, Q.1, TP. Hồ Chí Minh'),
(N'45 Nguyễn Trãi, P. Phạm Ngũ Lão, Q.1, TP. Hồ Chí Minh'),
(N'78 Trần Hưng Đạo, P. Cầu Ông Lãnh, Q.1, TP. Hồ Chí Minh'),
(N'120 Hai Bà Trưng, P. Đa Kao, Q.1, TP. Hồ Chí Minh'),
(N'34 Võ Văn Tần, P. 6, Q.3, TP. Hồ Chí Minh'),
(N'56 Lý Tự Trọng, P. Bến Thành, Q.1, TP. Hồ Chí Minh');

-- ─── Insert 30 fresh Patients with full data ───
;WITH new_patients AS (
    SELECT
        n.rn,
        NEWID() AS PatientId,
        N'BN' + FORMAT(@today, 'yyyyMMdd') + RIGHT('0000' + CAST(n.rn AS varchar), 4) AS PatientCode,
        n.FullName,
        n.Gender,
        n.YearOfBirth,
        DATEFROMPARTS(n.YearOfBirth, ((ABS(CHECKSUM(NEWID())) % 12) + 1), ((ABS(CHECKSUM(NEWID())) % 28) + 1)) AS DateOfBirth,
        '0' + CAST((900000000 + (ABS(CHECKSUM(NEWID())) % 99999999)) AS varchar) AS Phone,
        -- 12-digit CCCD
        CAST(79 AS varchar) + RIGHT('0000000000' + CAST(ABS(CHECKSUM(NEWID())) % 9999999999 AS varchar), 10) AS Cccd,
        -- BHYT for 70% of them
        CASE WHEN n.rn % 10 NOT IN (0, 1, 2) THEN
            'HN' + CAST(1 + (ABS(CHECKSUM(NEWID())) % 4) AS varchar)
            + CAST(1 + (ABS(CHECKSUM(NEWID())) % 4) AS varchar)
            + '08'
            + RIGHT('0000000' + CAST(ABS(CHECKSUM(NEWID())) % 9999999 AS varchar), 7)
        ELSE NULL END AS Bhyt,
        a.Address
    FROM @names n
    CROSS APPLY (
        SELECT TOP 1 a.Address FROM @addresses a WHERE a.rn = ((n.rn - 1) % 6) + 1
    ) a
)
INSERT INTO Patients (
    Id, PatientCode, FullName, Gender, DateOfBirth, YearOfBirth,
    PhoneNumber, IdentityNumber, InsuranceNumber, Address,
    CreatedAt, CreatedBy, IsDeleted
)
SELECT
    PatientId, PatientCode, FullName, Gender, DateOfBirth, YearOfBirth,
    Phone, Cccd, Bhyt, Address,
    @baseTime, @marker, 0
FROM new_patients;

-- ─── Build the MedicalRecord set ───
;WITH src AS (
    SELECT
        p.rn, p.Id AS PatientId,
        r.RoomId, r.DepartmentId, r.RoomCode,
        DATEADD(minute, (p.rn - 1) * 16, @baseTime) AS arrivedAt,
        CASE
            WHEN p.rn % 10 IN (0,1,2,3,4) THEN 0  -- Waiting (chờ tiếp đón)
            WHEN p.rn % 10 IN (5,6) THEN 1        -- InProgress
            WHEN p.rn % 10 IN (7,8) THEN 2        -- WaitingResult
            ELSE 3                                 -- Completed
        END AS recStatus,
        CASE
            WHEN p.rn % 20 = 0 THEN 3            -- Emergency
            WHEN p.rn % 20 IN (1,2,3,4,5) THEN 2 -- Paid
            ELSE 1                                -- BHYT
        END AS treatType,
        CASE
            WHEN p.rn % 20 = 0 THEN 2
            WHEN p.rn % 20 IN (1,2,3,4,5) THEN 2
            ELSE 1
        END AS patType
    FROM (SELECT ROW_NUMBER() OVER (ORDER BY CreatedAt) AS rn, Id FROM Patients WHERE CreatedBy = @marker) p
    CROSS APPLY (
        SELECT TOP 1 r2.RoomId, r2.DepartmentId, r2.RoomCode
        FROM @rooms r2 WHERE r2.rn = ((p.rn - 1) % @roomCount) + 1
    ) r
)
INSERT INTO MedicalRecords (
    Id, MedicalRecordCode, PatientId, AdmissionDate,
    PatientType, TreatmentType, DepartmentId, RoomId,
    Status, IsClosed, CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(),
    N'MR' + FORMAT(arrivedAt, 'yyyyMMddHHmmss') + RIGHT('0000' + CAST(rn AS varchar), 4),
    PatientId, arrivedAt,
    patType, treatType, DepartmentId, RoomId,
    recStatus, 0, arrivedAt, @marker, 0
FROM src;

-- ─── Insert matching QueueTickets ───
;WITH today_mr AS (
    SELECT
        mr.Id AS MedicalRecordId, mr.PatientId, mr.RoomId, mr.AdmissionDate, mr.Status, mr.TreatmentType,
        ROW_NUMBER() OVER (PARTITION BY mr.RoomId ORDER BY mr.AdmissionDate) AS roomSeq
    FROM MedicalRecords mr
    WHERE CAST(mr.AdmissionDate AS date) = @today AND mr.CreatedBy = @marker
),
room_letter AS (
    SELECT r.RoomId, r.RoomCode,
        -- Distinct token prefix per room: take 2nd char of RoomCode if all start with P,
        -- otherwise first char.
        CASE
            WHEN r.RoomCode LIKE 'P10%' THEN 'P' + SUBSTRING(r.RoomCode, 4, 1)  -- P101→P1, P102→P2, …
            ELSE UPPER(LEFT(r.RoomCode, 1))
        END AS prefix
    FROM @rooms r
)
INSERT INTO QueueTickets (
    Id, TicketNumber, QueueNumber, IssueDate, QueueType, Priority, Status,
    PatientId, MedicalRecordId, RoomId, CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(),
    rl.prefix + RIGHT('000' + CAST(t.roomSeq AS varchar), 3) AS TicketNumber,
    t.roomSeq AS QueueNumber,
    t.AdmissionDate AS IssueDate,
    CASE WHEN t.TreatmentType = 3 THEN 3 ELSE 1 END AS QueueType,
    CASE WHEN t.TreatmentType = 3 THEN 1 ELSE 2 END AS Priority,
    CASE
        WHEN t.Status = 0 THEN 0    -- waiting
        WHEN t.Status = 1 THEN 2    -- called/serving
        WHEN t.Status = 2 THEN 2    -- in progress
        ELSE 3                       -- completed
    END AS Status,
    t.PatientId, t.MedicalRecordId, t.RoomId,
    t.AdmissionDate, @marker, 0
FROM today_mr t
JOIN room_letter rl ON rl.RoomId = t.RoomId;

-- ─── Report ───
SELECT
    (SELECT COUNT(*) FROM Patients WHERE CreatedBy = @marker) AS seeded_patients,
    (SELECT COUNT(*) FROM MedicalRecords WHERE CAST(AdmissionDate AS date) = @today AND CreatedBy = @marker) AS today_medical_records,
    (SELECT COUNT(*) FROM QueueTickets WHERE CAST(IssueDate AS date) = @today AND CreatedBy = @marker) AS today_queue_tickets;
