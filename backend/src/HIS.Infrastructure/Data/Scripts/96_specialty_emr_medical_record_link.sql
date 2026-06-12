-- 96: Cột MedicalRecordId cho SpecialtyEmrs (TT46 follow-up 2026-06-12).
-- Bệnh án chuyên khoa trước đây chỉ link PatientId (standalone) nên EmrLockGuard không xác định
-- được HSBA nào để chặn sửa khi đã kết thúc (ghi chú trong plan-emr-tt46-immutability.md).
-- Cột nullable: record cũ/caller chưa có context HSBA giữ NULL (không bị guard) — backward-compat.
-- Idempotent: cột / FK / index chỉ thêm nếu chưa có.
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('SpecialtyEmrs') AND name = 'MedicalRecordId'
)
BEGIN
    ALTER TABLE SpecialtyEmrs ADD MedicalRecordId uniqueidentifier NULL;
END

IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys WHERE name = 'FK_SpecialtyEmrs_MedicalRecords_MedicalRecordId'
)
BEGIN
    ALTER TABLE SpecialtyEmrs WITH NOCHECK
        ADD CONSTRAINT FK_SpecialtyEmrs_MedicalRecords_MedicalRecordId
        FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id);
END

IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE object_id = OBJECT_ID('SpecialtyEmrs') AND name = 'IX_SpecialtyEmrs_MedicalRecordId'
)
BEGIN
    CREATE INDEX IX_SpecialtyEmrs_MedicalRecordId ON SpecialtyEmrs(MedicalRecordId);
END
