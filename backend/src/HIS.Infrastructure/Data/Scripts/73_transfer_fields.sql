-- Heal drift: RequestTransferAsync chỉ gộp chuỗi vào ConclusionNote,
-- rớt TransportMethod/Diagnosis/FacilityName riêng.
-- Thêm 5 cột nullable để persist đủ thông tin yêu cầu chuyển viện có cấu trúc.
-- Idempotent: COL_LENGTH guard.

SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Examinations','TransferToHospital') IS NULL
    ALTER TABLE dbo.Examinations ADD TransferToHospital NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.Examinations','TransferTransportMethod') IS NULL
    ALTER TABLE dbo.Examinations ADD TransferTransportMethod NVARCHAR(200) NULL;
GO

IF COL_LENGTH('dbo.Examinations','TransferDiagnosisCode') IS NULL
    ALTER TABLE dbo.Examinations ADD TransferDiagnosisCode NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.Examinations','TransferDiagnosisName') IS NULL
    ALTER TABLE dbo.Examinations ADD TransferDiagnosisName NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.Examinations','TransferReason') IS NULL
    ALTER TABLE dbo.Examinations ADD TransferReason NVARCHAR(1000) NULL;
GO
