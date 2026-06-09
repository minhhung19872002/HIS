-- 86: Seed CCHN (PracticeLicenses) cho nhân sự đang hoạt động (B1 edge — siết chặn khám 2026-06-09).
-- B1 nay chặn BS chưa có CCHN khi bắt đầu khám → nhân sự demo/thật cần có record CCHN hợp lệ,
-- nếu không mọi luồng khám sẽ bị chặn. CheckDoctorCertificationAsync match theo HolderName == User.FullName.
-- Idempotent: chỉ seed cho user chưa có license 'doctor' trùng HolderName.

INSERT INTO PracticeLicenses (Id, LicenseCode, LicenseType, HolderName, Cccd, Specialty, IssuingAuthority,
    IssueDate, ExpiryDate, Status, CreatedAt, IsDeleted)
SELECT NEWID(),
       'CCHN-' + RIGHT('000000' + CAST(ABS(CHECKSUM(u.Id)) % 1000000 AS varchar), 6),
       'doctor',
       u.FullName,
       u.EmployeeCode,
       N'Đa khoa',
       N'Sở Y tế',
       DATEADD(year, -3, SYSDATETIME()),
       DATEADD(year, 5, SYSDATETIME()),
       0,           -- 0 = active
       SYSDATETIME(),
       0
FROM Users u
WHERE u.IsDeleted = 0
  AND u.FullName IS NOT NULL AND LTRIM(RTRIM(u.FullName)) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM PracticeLicenses l
      WHERE l.IsDeleted = 0 AND l.LicenseType = 'doctor' AND l.HolderName = u.FullName
  );
