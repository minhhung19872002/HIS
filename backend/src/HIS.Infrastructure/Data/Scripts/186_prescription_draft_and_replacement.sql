-- =============================================================================
-- 186_prescription_draft_and_replacement.sql
-- Truy nguyen DON THAY THE (TT 26/2025/TT-BYT Dieu 6 khoan 9: "Truong hop can sua
-- chua, dieu chinh thuoc trong don, nguoi ke don thuc hien ke don thuoc moi thay
-- the don thuoc cu").
--
-- Them 2 cot:
--   ReplacesPrescriptionId    - don CU ma don nay thay the
--   ReplacedByPrescriptionId  - don MOI da thay the don nay (set khi don moi PHAT HANH)
--
-- KHONG dong vao 485 don dang o Status = 0. Chung duoc tao theo ngu nghia CU
-- (luu nhap = da vao hang doi duoc), duoc si co the da nhin thay / xu ly roi.
-- Doi nguoc chung ve Nhap (5) se rut don khoi quay duoc sau lung nguoi dung.
-- Chi don tao MOI ke tu day moi bat dau o trang thai Nhap.
--
-- Idempotent: IF NOT EXISTS tren tung cot.
-- =============================================================================

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME='Prescriptions' AND COLUMN_NAME='ReplacesPrescriptionId')
    ALTER TABLE Prescriptions ADD ReplacesPrescriptionId uniqueidentifier NULL;
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME='Prescriptions' AND COLUMN_NAME='ReplacedByPrescriptionId')
    ALTER TABLE Prescriptions ADD ReplacedByPrescriptionId uniqueidentifier NULL;
GO

-- Tra cuu "don nay thay the don nao" khi lan theo chuoi thay the.
-- KHONG dung filtered index (WHERE ... IS NOT NULL): filtered index doi SET QUOTED_IDENTIFIER ON,
-- ma migration runner khong bao dam SET option nao -> CREATE INDEX fail (Msg 1934).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Prescriptions_ReplacesPrescriptionId')
    CREATE INDEX IX_Prescriptions_ReplacesPrescriptionId
        ON Prescriptions(ReplacesPrescriptionId);
GO
