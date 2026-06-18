-- ============================================================
-- cleanup_qa_garbage_2026-06-17.sql   ⚠️ MANUAL-RUN ONLY ⚠️
-- ------------------------------------------------------------
-- Dọn bản ghi RÁC do QA probe ngày 2026-06-17 tạo (body {} -> tạo bản ghi field rỗng).
-- Nguồn: docs/workspace-docs/10-assessment/prod-sweep-specialty-admin-2026-06-17.md
--
-- ✅ ĐÃ CHẠY trên prod 2026-06-18: xóa 7 record rác (1/bảng × 7 bảng) + 1 child follow-up.
--    Verify sau xóa: REMAINING_GARBAGE = 0. 5 bảng còn lại = 0 (probe 204/echo, không persist).
--
-- ⚠️ KHÔNG đặt trong Data/Scripts/ (sẽ auto-apply startup). File này CHẠY TAY (idempotent).
-- ⚠️ Khi chạy: sqlcmd cần SET QUOTED_IDENTIFIER ON (bảng có filtered index).
-- ⚠️ Quy trình: chạy PART A (đếm) -> review -> PART B (xóa). Signal rác: CreatedAt=2026-06-17
--    AND cột-định-danh-cốt-lõi rỗng/Empty (record thật luôn có cột này điền).
-- ============================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
DECLARE @d DATE = '2026-06-17';

-- ============================================================
-- PART A — SELECT COUNT (READ-ONLY, chạy trước, review)
-- ============================================================
SELECT 'Tenders'                     AS TableName, COUNT(*) AS GarbageCount FROM Tenders                     WHERE CAST(CreatedAt AS DATE)=@d AND (TenderName='' OR TenderName IS NULL)
UNION ALL SELECT 'PracticeLicenses',           COUNT(*) FROM PracticeLicenses           WHERE CAST(CreatedAt AS DATE)=@d AND (HolderName='' OR HolderName IS NULL)
UNION ALL SELECT 'AssetProcurementRequests',   COUNT(*) FROM AssetProcurementRequests   WHERE CAST(CreatedAt AS DATE)=@d AND (Title='' OR Title IS NULL)
UNION ALL SELECT 'SatisfactionSurveyTemplates',COUNT(*) FROM SatisfactionSurveyTemplates WHERE CAST(CreatedAt AS DATE)=@d AND (Name='' OR Name IS NULL)
UNION ALL SELECT 'HealthCampaigns',            COUNT(*) FROM HealthCampaigns            WHERE CAST(CreatedAt AS DATE)=@d AND (Title='' OR Title IS NULL)
UNION ALL SELECT 'HouseholdHealthRecords',     COUNT(*) FROM HouseholdHealthRecords     WHERE CAST(CreatedAt AS DATE)=@d AND (HouseholdCode='' OR HouseholdCode IS NULL)
UNION ALL SELECT 'ChronicDiseaseRecords',      COUNT(*) FROM ChronicDiseaseRecords      WHERE CAST(CreatedAt AS DATE)=@d AND (IcdCode='' OR IcdCode IS NULL);
-- 5 bảng probe-204/echo = 0 rác (không persist): InterHospitalRequests, IvfPatientCouples,
--   PopulationRecords, ProcurementRequests, TbHivRecords. Notifications = "Thông báo test" (KHÔNG rác).

-- ============================================================
-- PART B — DELETE (chạy SAU khi review PART A). Idempotent (re-run -> 0 dòng).
-- ============================================================
-- ChronicDiseaseRecords có FK child ChronicDiseaseFollowUps -> xóa child trước.
DELETE FROM ChronicDiseaseFollowUps WHERE ChronicDiseaseRecordId IN (SELECT Id FROM ChronicDiseaseRecords WHERE CAST(CreatedAt AS DATE)=@d AND (IcdCode='' OR IcdCode IS NULL));
DELETE FROM ChronicDiseaseRecords       WHERE CAST(CreatedAt AS DATE)=@d AND (IcdCode='' OR IcdCode IS NULL);
DELETE FROM Tenders                     WHERE CAST(CreatedAt AS DATE)=@d AND (TenderName='' OR TenderName IS NULL);
DELETE FROM PracticeLicenses            WHERE CAST(CreatedAt AS DATE)=@d AND (HolderName='' OR HolderName IS NULL);
DELETE FROM AssetProcurementRequests    WHERE CAST(CreatedAt AS DATE)=@d AND (Title='' OR Title IS NULL);
DELETE FROM SatisfactionSurveyTemplates WHERE CAST(CreatedAt AS DATE)=@d AND (Name='' OR Name IS NULL);
DELETE FROM HealthCampaigns             WHERE CAST(CreatedAt AS DATE)=@d AND (Title='' OR Title IS NULL);
DELETE FROM HouseholdHealthRecords      WHERE CAST(CreatedAt AS DATE)=@d AND (HouseholdCode='' OR HouseholdCode IS NULL);
