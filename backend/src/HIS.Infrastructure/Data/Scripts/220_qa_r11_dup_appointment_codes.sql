-- 220 (QA round 11, 2026-09-25).
-- QA-R11 (w2-clinical-money): HK{yyyyMMddHHmmss} follow-up codes collided within one second (local DB:
-- HK20260925141825 x2). BookingManagement confirms / checks in / cancels by AppointmentCode, so a duplicate
-- acts on the wrong booking. Keep the oldest row of each duplicate code, suffix the others -2, -3, ...
-- Idempotent: re-running finds no duplicates and changes nothing (includes soft-deleted rows).
SET NOCOUNT ON; SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;
;WITH d AS (
    SELECT Id, AppointmentCode,
           ROW_NUMBER() OVER (PARTITION BY AppointmentCode ORDER BY CreatedAt, Id) AS rn
    FROM dbo.Appointments
    WHERE AppointmentCode IS NOT NULL AND AppointmentCode <> N''
)
UPDATE a
   SET a.AppointmentCode = LEFT(d.AppointmentCode, 45) + N'-' + CAST(d.rn AS nvarchar(4))
FROM dbo.Appointments a
JOIN d ON d.Id = a.Id
WHERE d.rn > 1
  AND NOT EXISTS (SELECT 1 FROM dbo.Appointments x
                  WHERE x.AppointmentCode = LEFT(d.AppointmentCode, 45) + N'-' + CAST(d.rn AS nvarchar(4)));
PRINT CONCAT('Renamed duplicate appointment codes: ', @@ROWCOUNT);
