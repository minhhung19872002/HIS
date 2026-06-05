-- Migration 55: RIS per-modality permission (G-36)
-- Thêm cột ModalityId vào RadiologyPermissions để lưu quyền theo từng máy chụp cụ thể.
-- Backward-compat: nullable — row không có ModalityId = áp dụng cho TẤT CẢ máy (hành vi cũ).
-- Idempotent — chạy nhiều lần không lỗi.

IF COL_LENGTH('RadiologyPermissions', 'ModalityId') IS NULL
BEGIN
    ALTER TABLE RadiologyPermissions ADD ModalityId UNIQUEIDENTIFIER NULL;
    PRINT 'Added RadiologyPermissions.ModalityId';
END
GO

-- Index để tăng tốc tra cứu quyền theo user + modality
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_RadiologyPermissions_UserId_ModalityId'
      AND object_id = OBJECT_ID('RadiologyPermissions')
)
BEGIN
    CREATE INDEX IX_RadiologyPermissions_UserId_ModalityId
        ON RadiologyPermissions (UserId, ModalityId)
        WHERE IsActive = 1;
    PRINT 'Created index IX_RadiologyPermissions_UserId_ModalityId';
END
GO
