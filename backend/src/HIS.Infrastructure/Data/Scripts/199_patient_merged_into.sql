-- 199: Patients.MergedIntoPatientId — ghép hồ sơ ghi lại hồ sơ đích.
-- Trước đây ghép chỉ xoá mềm hồ sơ nguồn, không lưu đã ghép vào ai: app hỗ trợ người bệnh (và mọi hệ thống
-- giữ id bệnh nhân) không có cách nào đi theo người sang hồ sơ còn lại → người bệnh thấy lịch sử khám trống.
-- Đo trên prod 15/09. Không khai báo khoá ngoại (cột tham chiếu mềm, chỉ đọc bởi /api/patients/merge-successors).
-- Idempotent.
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON; -- filtered index below requires it (sqlcmd defaults OFF)

IF COL_LENGTH(N'dbo.Patients', N'MergedIntoPatientId') IS NULL
BEGIN
    ALTER TABLE dbo.Patients ADD MergedIntoPatientId uniqueidentifier NULL;
END
GO

SET QUOTED_IDENTIFIER ON;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Patients_MergedIntoPatientId' AND object_id = OBJECT_ID(N'dbo.Patients'))
BEGIN
    CREATE INDEX IX_Patients_MergedIntoPatientId ON dbo.Patients(MergedIntoPatientId) WHERE MergedIntoPatientId IS NOT NULL;
END
GO
