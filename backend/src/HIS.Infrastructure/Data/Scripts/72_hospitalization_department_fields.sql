-- Heal drift: Examination.RequestHospitalizationAsync chỉ lưu Reason, bỏ DepartmentId/IsEmergency/Diagnosis
-- mà OpdEditor.tsx gửi lên (modal Nhập viện có chọn khoa + checkbox cấp cứu + chẩn đoán).
-- Thêm 4 cột nullable để persist đủ thông tin yêu cầu nhập viện.
-- Idempotent: COL_LENGTH guard.

SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Examinations','HospitalizationDepartmentId') IS NULL
    ALTER TABLE dbo.Examinations ADD HospitalizationDepartmentId UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH('dbo.Examinations','HospitalizationIsEmergency') IS NULL
    ALTER TABLE dbo.Examinations ADD HospitalizationIsEmergency BIT NOT NULL CONSTRAINT DF_Examinations_HospitalizationIsEmergency DEFAULT 0;
GO

IF COL_LENGTH('dbo.Examinations','HospitalizationDiagnosisCode') IS NULL
    ALTER TABLE dbo.Examinations ADD HospitalizationDiagnosisCode NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.Examinations','HospitalizationDiagnosisName') IS NULL
    ALTER TABLE dbo.Examinations ADD HospitalizationDiagnosisName NVARCHAR(500) NULL;
GO
