-- QA round 3 (r3-clinical-safety): weight-based dose thresholds.
-- MedicineDoseRanges gains per-kg DAILY thresholds, expressed in the row's Unit per kg body weight
-- (e.g. Unit = 'mg' → MaxDosePerKg = 40 means at most 40 mg/kg/day). The dose check multiplies them by the
-- patient's latest recorded weight; a missing weight yields a warning, never a block.
-- Nullable, no data change. Idempotent: every ADD is guarded, a re-run is a no-op.

IF OBJECT_ID(N'dbo.MedicineDoseRanges', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.MedicineDoseRanges', N'MinDosePerKg') IS NULL
    ALTER TABLE [dbo].[MedicineDoseRanges] ADD [MinDosePerKg] DECIMAL(18,4) NULL;
GO

IF OBJECT_ID(N'dbo.MedicineDoseRanges', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.MedicineDoseRanges', N'MaxDosePerKg') IS NULL
    ALTER TABLE [dbo].[MedicineDoseRanges] ADD [MaxDosePerKg] DECIMAL(18,4) NULL;
GO
