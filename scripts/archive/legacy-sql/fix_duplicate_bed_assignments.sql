USE [HIS];
GO
;WITH cte AS (
    SELECT Id, BedId, AdmissionId, AssignedAt, ReleasedAt, Status,
           ROW_NUMBER() OVER (PARTITION BY BedId ORDER BY ISNULL(AssignedAt,'1900-01-01') DESC, CreatedAt DESC, Id DESC) AS rn
    FROM BedAssignments
    WHERE IsDeleted = 0 AND ReleasedAt IS NULL AND Status = 1 AND BedId IS NOT NULL
)
UPDATE ba
SET ReleasedAt = GETDATE(),
    Status = 0
FROM BedAssignments ba
JOIN cte x ON x.Id = ba.Id
WHERE x.rn > 1;
GO
SELECT BedId, COUNT(*) AS ActiveAssignments
FROM BedAssignments
WHERE IsDeleted=0 AND ReleasedAt IS NULL AND Status=1 AND BedId IS NOT NULL
GROUP BY BedId
HAVING COUNT(*)>1;
GO
