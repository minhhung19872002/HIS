-- Migration 111: Add VSATTP-specific fields to HealthCheckups (F10.5 KSK chuyen biet)
-- Additive only: ADD nullable columns with IF NOT EXISTS guard.
-- Applied by ProductionSchemaRepairRunner on startup.

IF COL_LENGTH('HealthCheckups', 'FoodHandlerRole') IS NULL
BEGIN
    ALTER TABLE HealthCheckups
        ADD FoodHandlerRole NVARCHAR(200) NULL;
END

IF COL_LENGTH('HealthCheckups', 'FoodSafetyConclusion') IS NULL
BEGIN
    ALTER TABLE HealthCheckups
        ADD FoodSafetyConclusion NVARCHAR(MAX) NULL;
END
