-- QA round 3 (r3-leftovers-a, 2026-09-15): columns the clinical/support screens already send or display but
-- that had nowhere to live, plus two data normalisations. Idempotent — every step checks current state.
--
-- 1) DietOrders.FeedingRoute / MealFrequency / IncludeSnacks — the v2 diet-order form collects "Đường nuôi",
--    "Số bữa / ngày", "Có bữa phụ"; they were dropped and every order read back as Oral.
-- 2) RehabSessions.Location — "Địa điểm" of a scheduled session was dropped.
-- 3) TraumaCases.Status / AttendingDoctor — the registry form's status (Nhập viện/ICU/Khoa/Xuất viện/Tử vong)
--    and attending doctor were dropped. Status backfilled once from the stored outcome/discharge/ICU flags.
-- 4) InterHospitalRequests.Direction ('outgoing' | 'incoming') — without it every request looked outgoing and
--    the "Xử lý" (respond) action for incoming requests never appeared.
-- 5) SatisfactionSurveyResults.CampaignId — survey export filtered by campaign returned every result.
-- 6) HAICases.Status 'Closed' → 'Resolved' — the close endpoint wrote 'Closed' while every reader treats
--    'Resolved' as the terminal state, so closed cases stayed "active".
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ===== 1. DietOrders =====
IF OBJECT_ID('dbo.DietOrders', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.DietOrders', 'FeedingRoute') IS NULL
        ALTER TABLE dbo.DietOrders ADD FeedingRoute nvarchar(20) NULL;
    IF COL_LENGTH('dbo.DietOrders', 'MealFrequency') IS NULL
        ALTER TABLE dbo.DietOrders ADD MealFrequency int NULL;
    IF COL_LENGTH('dbo.DietOrders', 'IncludeSnacks') IS NULL
        ALTER TABLE dbo.DietOrders ADD IncludeSnacks bit NULL;
END
GO

-- ===== 2. RehabSessions =====
IF OBJECT_ID('dbo.RehabSessions', 'U') IS NOT NULL AND COL_LENGTH('dbo.RehabSessions', 'Location') IS NULL
    ALTER TABLE dbo.RehabSessions ADD Location nvarchar(200) NULL;
GO

-- ===== 3. TraumaCases =====
IF OBJECT_ID('dbo.TraumaCases', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.TraumaCases', 'Status') IS NULL
        ALTER TABLE dbo.TraumaCases ADD Status int NULL; -- 0 nhập viện · 1 ICU · 2 khoa · 3 xuất viện · 4 tử vong
    IF COL_LENGTH('dbo.TraumaCases', 'AttendingDoctor') IS NULL
        ALTER TABLE dbo.TraumaCases ADD AttendingDoctor nvarchar(200) NULL;
END
GO

-- Backfill only rows never given a status (re-run matches nothing).
IF COL_LENGTH('dbo.TraumaCases', 'Status') IS NOT NULL
    EXEC(N'
        UPDATE dbo.TraumaCases SET Status =
            CASE
                WHEN Outcome IN (N''died'', N''deceased'') THEN 4
                WHEN DischargeDate IS NOT NULL OR Outcome IN (N''discharged'', N''transferred'', N''absconded'') THEN 3
                WHEN IcuAdmission = 1 THEN 1
                ELSE 0
            END
        WHERE Status IS NULL;');
GO

-- ===== 4. InterHospitalRequests.Direction =====
IF OBJECT_ID('dbo.InterHospitalRequests', 'U') IS NOT NULL AND COL_LENGTH('dbo.InterHospitalRequests', 'Direction') IS NULL
    ALTER TABLE dbo.InterHospitalRequests ADD Direction nvarchar(10) NOT NULL
        CONSTRAINT DF_InterHospitalRequests_Direction DEFAULT N'outgoing' WITH VALUES;
GO

-- ===== 5. SatisfactionSurveyResults.CampaignId =====
IF OBJECT_ID('dbo.SatisfactionSurveyResults', 'U') IS NOT NULL AND COL_LENGTH('dbo.SatisfactionSurveyResults', 'CampaignId') IS NULL
    ALTER TABLE dbo.SatisfactionSurveyResults ADD CampaignId uniqueidentifier NULL;
GO

IF COL_LENGTH('dbo.SatisfactionSurveyResults', 'CampaignId') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SatisfactionSurveyResults_CampaignId' AND object_id = OBJECT_ID('dbo.SatisfactionSurveyResults'))
    CREATE NONCLUSTERED INDEX IX_SatisfactionSurveyResults_CampaignId ON dbo.SatisfactionSurveyResults (CampaignId, CreatedAt);
GO

-- ===== 6. HAICases 'Closed' → 'Resolved' =====
IF OBJECT_ID('dbo.HAICases', 'U') IS NOT NULL
    UPDATE dbo.HAICases SET Status = N'Resolved' WHERE Status = N'Closed';
GO
