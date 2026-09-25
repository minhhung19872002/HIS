-- 219 (QA round 11, 2026-09-25).
-- QA-R11 (public-health-portal / ph-programs): Community health households — the v2 form collects
-- "đối tượng đặc biệt" flags (người cao tuổi / trẻ < 5 tuổi / thai phụ / bệnh mạn tính) and the list has
-- status tabs (Đang quản lý / Tạm ngưng / Đã chuyển), but HouseholdHealthRecords had no columns for them:
-- every save silently dropped the flags and every household showed as "Đang quản lý".
-- Idempotent.
IF COL_LENGTH('dbo.HouseholdHealthRecords', 'HasElderlyMember') IS NULL
    ALTER TABLE dbo.HouseholdHealthRecords ADD HasElderlyMember BIT NOT NULL CONSTRAINT DF_HouseholdHealthRecords_HasElderlyMember DEFAULT(0);
IF COL_LENGTH('dbo.HouseholdHealthRecords', 'HasChildUnder5') IS NULL
    ALTER TABLE dbo.HouseholdHealthRecords ADD HasChildUnder5 BIT NOT NULL CONSTRAINT DF_HouseholdHealthRecords_HasChildUnder5 DEFAULT(0);
IF COL_LENGTH('dbo.HouseholdHealthRecords', 'HasPregnant') IS NULL
    ALTER TABLE dbo.HouseholdHealthRecords ADD HasPregnant BIT NOT NULL CONSTRAINT DF_HouseholdHealthRecords_HasPregnant DEFAULT(0);
IF COL_LENGTH('dbo.HouseholdHealthRecords', 'HasChronicDisease') IS NULL
    ALTER TABLE dbo.HouseholdHealthRecords ADD HasChronicDisease BIT NOT NULL CONSTRAINT DF_HouseholdHealthRecords_HasChronicDisease DEFAULT(0);
-- 0 = Đang quản lý, 1 = Tạm ngưng, 2 = Đã chuyển đi
IF COL_LENGTH('dbo.HouseholdHealthRecords', 'Status') IS NULL
    ALTER TABLE dbo.HouseholdHealthRecords ADD Status INT NOT NULL CONSTRAINT DF_HouseholdHealthRecords_Status DEFAULT(0);
GO
