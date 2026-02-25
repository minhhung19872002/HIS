USE [HIS];
GO
;WITH cte AS (
    SELECT Id, BedId, AssignedAt,
           ROW_NUMBER() OVER (PARTITION BY BedId ORDER BY ISNULL(AssignedAt,'19000101') DESC, Id DESC) AS rn
    FROM BedAssignments
    WHERE BedId IS NOT NULL AND Status = 0
)
UPDATE ba
SET Status = 1,
    ReleasedAt = ISNULL(ReleasedAt, GETDATE())
FROM BedAssignments ba
JOIN cte x ON x.Id = ba.Id
WHERE x.rn > 1;
GO
SELECT BedId, COUNT(*) AS Cnt
FROM BedAssignments
WHERE BedId IS NOT NULL AND Status = 0
GROUP BY BedId
HAVING COUNT(*) > 1;
GO
