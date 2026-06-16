-- 119_hr_decision_extend.sql
-- Thêm các cột mở rộng cho bảng HrDecisions: Department, Position, SignerName, Notes.
-- Idempotent: mỗi cột chỉ thêm nếu chưa tồn tại.

IF COL_LENGTH('dbo.HrDecisions', 'Department') IS NULL
    ALTER TABLE dbo.HrDecisions ADD Department NVARCHAR(200) NULL;

IF COL_LENGTH('dbo.HrDecisions', 'Position') IS NULL
    ALTER TABLE dbo.HrDecisions ADD Position NVARCHAR(200) NULL;

IF COL_LENGTH('dbo.HrDecisions', 'SignerName') IS NULL
    ALTER TABLE dbo.HrDecisions ADD SignerName NVARCHAR(200) NULL;

IF COL_LENGTH('dbo.HrDecisions', 'Notes') IS NULL
    ALTER TABLE dbo.HrDecisions ADD Notes NVARCHAR(MAX) NULL;
