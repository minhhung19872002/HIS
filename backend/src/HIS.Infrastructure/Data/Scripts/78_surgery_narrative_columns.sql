-- Migration 78: tách tường trình PTTT khỏi sentinel Notes → cột riêng trên SurgeryRequests.
-- Lý do: SurgeryReportModal (OPD-inline PTTT, MS.PT-02) đang pack [TUONGTRINH]/[KETLUAN]/[HINHCHINH]/[HINHPHU]
--        vào SurgeryRequest.Notes (sentinel) — vừa xấu vừa khó truy vấn/in. Thêm cột thật + backfill row cũ.
-- Additive + backward-compat: Notes giữ nguyên (FE chưa đổi); service create đã parse sentinel → cột mới.
-- Idempotent: COL_LENGTH guard + backfill chỉ chạy trên row cột còn NULL.
-- Auto-applied by ProductionSchemaRepairRunner on startup.

SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.SurgeryRequests','SurgeryReport') IS NULL
    ALTER TABLE dbo.SurgeryRequests ADD SurgeryReport NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH('dbo.SurgeryRequests','Conclusion') IS NULL
    ALTER TABLE dbo.SurgeryRequests ADD Conclusion NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH('dbo.SurgeryRequests','AttachedImageUrls') IS NULL
    ALTER TABLE dbo.SurgeryRequests ADD AttachedImageUrls NVARCHAR(MAX) NULL;
GO

-- Backfill tường trình từ [TUONGTRINH] ... (đến hết dòng). '+ CHAR(10)' đảm bảo luôn có ký tự kết dòng.
UPDATE dbo.SurgeryRequests
SET SurgeryReport = LTRIM(RTRIM(
    SUBSTRING(Notes,
        CHARINDEX('[TUONGTRINH]', Notes) + 12,
        CHARINDEX(CHAR(10), Notes + CHAR(10), CHARINDEX('[TUONGTRINH]', Notes)) - (CHARINDEX('[TUONGTRINH]', Notes) + 12))))
WHERE SurgeryReport IS NULL AND Notes IS NOT NULL AND CHARINDEX('[TUONGTRINH]', Notes) > 0;
GO

-- Backfill kết luận từ [KETLUAN] ...
UPDATE dbo.SurgeryRequests
SET Conclusion = LTRIM(RTRIM(
    SUBSTRING(Notes,
        CHARINDEX('[KETLUAN]', Notes) + 9,
        CHARINDEX(CHAR(10), Notes + CHAR(10), CHARINDEX('[KETLUAN]', Notes)) - (CHARINDEX('[KETLUAN]', Notes) + 9))))
WHERE Conclusion IS NULL AND Notes IS NOT NULL AND CHARINDEX('[KETLUAN]', Notes) > 0;
GO
