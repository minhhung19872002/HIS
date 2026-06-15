-- 104_injury_info_legal_fields.sql
-- F1.6: Them truong phap ly TNGT vao InjuryInfos (Bieu 14.5 SYT)
-- Idempotent: dung IF NOT EXISTS(SELECT * FROM sys.columns ...)

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InjuryInfos') AND name = 'HelmetWorn')
    ALTER TABLE InjuryInfos ADD HelmetWorn BIT NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InjuryInfos') AND name = 'AlcoholLevel')
    ALTER TABLE InjuryInfos ADD AlcoholLevel NVARCHAR(20) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InjuryInfos') AND name = 'VehicleTypeSelf')
    ALTER TABLE InjuryInfos ADD VehicleTypeSelf NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InjuryInfos') AND name = 'VehicleTypeCauser')
    ALTER TABLE InjuryInfos ADD VehicleTypeCauser NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InjuryInfos') AND name = 'VehicleTypeVictim')
    ALTER TABLE InjuryInfos ADD VehicleTypeVictim NVARCHAR(100) NULL;
