-- ============================================================
-- cleanup_qa_garbage_2026-06-17.sql   ⚠️ MANUAL-RUN ONLY ⚠️
-- ------------------------------------------------------------
-- Dọn bản ghi RÁC do QA probe ngày 2026-06-17 tạo (body {} -> tạo bản ghi
-- field rỗng) trên các bảng module chuyên khoa/quản trị.
-- Nguồn: docs/workspace-docs/10-assessment/prod-sweep-specialty-admin-2026-06-17.md
--
-- ⚠️ KHÔNG đặt trong Data/Scripts/ (sẽ auto-apply startup). File này CHẠY TAY.
-- ⚠️ QUY TRÌNH BẮT BUỘC:
--    1. Chạy PART A (SELECT COUNT) trước — đọc kỹ số đếm từng bảng.
--    2. Nếu count khớp kỳ vọng (rác test, field rỗng, đúng ngày) -> mới chạy PART B (DELETE).
--    3. Nếu 1 bảng count lớn bất thường -> DỪNG, kiểm tra thủ công (có thể lẫn data thật).
--
-- Signal rác: CreatedAt = 2026-06-17 AND <cột-định-danh-cốt-lõi> rỗng/Empty.
-- (Record thật luôn có cột này điền -> không bị xóa.)
-- ============================================================

DECLARE @d DATE = '2026-06-17';

-- ============================================================
-- PART A — SELECT COUNT (READ-ONLY, chạy trước, review)
-- ============================================================
SELECT 'InterHospitalRequests'      AS TableName, COUNT(*) AS GarbageCount FROM InterHospitalRequests      WHERE CAST(CreatedAt AS DATE) = @d AND (RequestType = '' OR RequestType IS NULL)
UNION ALL SELECT 'PracticeLicenses',          COUNT(*) FROM PracticeLicenses          WHERE CAST(CreatedAt AS DATE) = @d AND (HolderName = '' OR HolderName IS NULL)
UNION ALL SELECT 'AssetManagementTenders',    COUNT(*) FROM AssetManagementTenders    WHERE CAST(CreatedAt AS DATE) = @d AND (TenderName = '' OR TenderName IS NULL)
UNION ALL SELECT 'AssetProcurementRequests',  COUNT(*) FROM AssetProcurementRequests  WHERE CAST(CreatedAt AS DATE) = @d AND (Title = '' OR Title IS NULL)
UNION ALL SELECT 'SatisfactionSurveyTemplates',COUNT(*) FROM SatisfactionSurveyTemplates WHERE CAST(CreatedAt AS DATE) = @d AND (Name = '' OR Name IS NULL)
UNION ALL SELECT 'PopulationRecords',         COUNT(*) FROM PopulationRecords         WHERE CAST(CreatedAt AS DATE) = @d AND (RecordCode = '' OR RecordCode IS NULL)
UNION ALL SELECT 'HouseholdHealthRecords',    COUNT(*) FROM HouseholdHealthRecords    WHERE CAST(CreatedAt AS DATE) = @d AND (HouseholdCode = '' OR HouseholdCode IS NULL)
UNION ALL SELECT 'HealthEducationCampaigns',  COUNT(*) FROM HealthEducationCampaigns  WHERE CAST(CreatedAt AS DATE) = @d AND (CampaignName = '' OR CampaignName IS NULL)
UNION ALL SELECT 'ChronicDiseaseRecords',     COUNT(*) FROM ChronicDiseaseRecords     WHERE CAST(CreatedAt AS DATE) = @d AND (IcdCode = '' OR IcdCode IS NULL)
UNION ALL SELECT 'TbHivRecords',              COUNT(*) FROM TbHivRecords              WHERE CAST(CreatedAt AS DATE) = @d AND PatientId = '00000000-0000-0000-0000-000000000000'
UNION ALL SELECT 'IvfCouples',                COUNT(*) FROM IvfCouples                WHERE CAST(CreatedAt AS DATE) = @d AND WifePatientId = '00000000-0000-0000-0000-000000000000';
-- LƯU Ý:
--   * RetailSales (HospitalPharmacy): rác = sale không có item. Kiểm tra thủ công:
--     SELECT s.Id FROM RetailSales s WHERE CAST(s.CreatedAt AS DATE)=@d AND NOT EXISTS (SELECT 1 FROM RetailSaleItems i WHERE i.RetailSaleId = s.Id);
--   * Notifications: probe tạo "Thông báo test" (Title KHÔNG rỗng) -> KHÔNG coi là rác, KHÔNG xóa.

-- ============================================================
-- PART B — DELETE (chỉ chạy SAU KHI review PART A khớp)
-- Bỏ comment từng dòng tương ứng để xóa. Nên bọc trong BEGIN TRAN ... COMMIT.
-- ============================================================
-- BEGIN TRAN;
-- DELETE FROM InterHospitalRequests       WHERE CAST(CreatedAt AS DATE) = @d AND (RequestType = '' OR RequestType IS NULL);
-- DELETE FROM PracticeLicenses            WHERE CAST(CreatedAt AS DATE) = @d AND (HolderName = '' OR HolderName IS NULL);
-- DELETE FROM AssetManagementTenders      WHERE CAST(CreatedAt AS DATE) = @d AND (TenderName = '' OR TenderName IS NULL);
-- DELETE FROM AssetProcurementRequests    WHERE CAST(CreatedAt AS DATE) = @d AND (Title = '' OR Title IS NULL);
-- DELETE FROM SatisfactionSurveyTemplates WHERE CAST(CreatedAt AS DATE) = @d AND (Name = '' OR Name IS NULL);
-- DELETE FROM PopulationRecords           WHERE CAST(CreatedAt AS DATE) = @d AND (RecordCode = '' OR RecordCode IS NULL);
-- DELETE FROM HouseholdHealthRecords      WHERE CAST(CreatedAt AS DATE) = @d AND (HouseholdCode = '' OR HouseholdCode IS NULL);
-- DELETE FROM HealthEducationCampaigns    WHERE CAST(CreatedAt AS DATE) = @d AND (CampaignName = '' OR CampaignName IS NULL);
-- DELETE FROM ChronicDiseaseRecords       WHERE CAST(CreatedAt AS DATE) = @d AND (IcdCode = '' OR IcdCode IS NULL);
-- DELETE FROM TbHivRecords                WHERE CAST(CreatedAt AS DATE) = @d AND PatientId = '00000000-0000-0000-0000-000000000000';
-- DELETE FROM IvfCouples                  WHERE CAST(CreatedAt AS DATE) = @d AND WifePatientId = '00000000-0000-0000-0000-000000000000';
-- COMMIT;   -- (ROLLBACK nếu số dòng affected bất thường)
