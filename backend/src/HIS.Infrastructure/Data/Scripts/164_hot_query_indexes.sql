-- Index cho các truy vấn nóng đang phải quét-toàn-bảng + sắp xếp.
--
-- Bối cảnh (đo trên prod AWS RDS 2026-08-15): `GET /api/examination/emr-records`
-- mất ~26 giây trong khi SQL Server chỉ tốn 63 ms CPU và đọc 395 trang. Kế hoạch
-- thực thi sinh Worktable/Workfile — tức `ORDER BY CreatedAt DESC` phải ĐỔ RA TEMPDB
-- để sắp xếp, vì Examinations chỉ có đúng index khoá chính (trên Id). Trên instance
-- nhỏ với tempdb đã gần đầy, cú spill đó nuốt trọn 25 giây.
--
-- Các bảng dưới đây đều được lọc/sắp theo CreatedAt hoặc tra theo khoá ngoại trong
-- các màn hình danh sách; index phủ (INCLUDE) giúp truy vấn EMR đọc thẳng từ index,
-- không cần key lookup và không cần sắp xếp.
--
-- Idempotent: an toàn cho ProductionSchemaRepairRunner chạy lúc startup.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Examinations: lọc CreatedAt >= @since + ORDER BY CreatedAt DESC + join MedicalRecord/Room.
IF OBJECT_ID('dbo.Examinations', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Examinations_CreatedAt' AND object_id = OBJECT_ID('dbo.Examinations'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Examinations_CreatedAt
        ON dbo.Examinations (CreatedAt DESC)
        INCLUDE (MedicalRecordId, RoomId, MainDiagnosis, MainIcdCode);
END
GO

-- MedicalRecords: join Examinations -> MedicalRecord -> Patient trong mọi màn hình bệnh án.
IF OBJECT_ID('dbo.MedicalRecords', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MedicalRecords_PatientId' AND object_id = OBJECT_ID('dbo.MedicalRecords'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_MedicalRecords_PatientId
        ON dbo.MedicalRecords (PatientId);
END
GO

-- Allergies / ChronicDiseaseRecords: tra theo danh sách PatientId của trang hiện tại.
IF OBJECT_ID('dbo.Allergies', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Allergies_PatientId' AND object_id = OBJECT_ID('dbo.Allergies'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Allergies_PatientId
        ON dbo.Allergies (PatientId);
END
GO

IF OBJECT_ID('dbo.ChronicDiseaseRecords', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ChronicDiseaseRecords_PatientId' AND object_id = OBJECT_ID('dbo.ChronicDiseaseRecords'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ChronicDiseaseRecords_PatientId
        ON dbo.ChronicDiseaseRecords (PatientId);
END
GO
