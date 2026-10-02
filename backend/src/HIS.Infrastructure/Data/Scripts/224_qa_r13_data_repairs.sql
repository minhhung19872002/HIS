-- 224 (QA round 13, 2026-10-03): data repairs for bugs fixed in round 13. Idempotent: every statement is guarded.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Lab orders: sample collection / analyzer results never raised ServiceRequests.Status, so an order whose every
-- active line already has a result stayed at 0 ("chưa thực hiện") and could be cancelled from OPD/ward, hiding
-- the result. Raise those headers to 3 (completed) — same rule the manual result entry already applies.
UPDATE sr SET sr.Status = 3, sr.UpdatedAt = GETUTCDATE()
FROM dbo.ServiceRequests sr
WHERE sr.RequestType = 1 AND sr.IsDeleted = 0 AND sr.Status IN (0, 1, 2)
  AND EXISTS (SELECT 1 FROM dbo.ServiceRequestDetails d
              WHERE d.ServiceRequestId = sr.Id AND d.IsDeleted = 0 AND d.Status <> 3)
  AND NOT EXISTS (SELECT 1 FROM dbo.ServiceRequestDetails d
                  WHERE d.ServiceRequestId = sr.Id AND d.IsDeleted = 0 AND d.Status <> 3
                    AND (d.Result IS NULL OR d.Result = ''));
GO

-- Retail pharmacy POS accepted any GUID as the buyer (e.g. a warehouse id) — drop links to non-existent patients.
UPDATE dbo.RetailSales SET PatientId = NULL
WHERE PatientId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Patients p WHERE p.Id = RetailSales.PatientId);
GO
