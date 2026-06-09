-- 83: Cột TriageLevel cho ObservationStay (F3 — cấp cứu thường persist 2026-06-09).
-- Màn Cấp cứu (EmergencyDisaster) ghi mức phân loại triage 1-5 vào phiên phòng lưu.
-- Idempotent: chỉ thêm nếu chưa có.
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('ObservationStays') AND name = 'TriageLevel'
)
BEGIN
    ALTER TABLE ObservationStays ADD TriageLevel int NULL;
END
