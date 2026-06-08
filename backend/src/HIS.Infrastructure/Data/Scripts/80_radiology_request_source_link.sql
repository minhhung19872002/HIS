-- 80: link RadiologyRequest -> ServiceRequestDetail (FLOW-3 #14d, audit luồng nghiệp vụ #8).
-- Phiếu CĐHA model 4 nay sinh tự động từ điều phối model 1 khi mark-performed; cột này là
-- idempotent guard tránh tạo trùng. Idempotent.
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RadiologyRequests') AND name = 'SourceServiceRequestDetailId'
)
BEGIN
    ALTER TABLE RadiologyRequests ADD SourceServiceRequestDetailId uniqueidentifier NULL;
    CREATE INDEX IX_RadiologyRequests_SourceServiceRequestDetailId
        ON RadiologyRequests(SourceServiceRequestDetailId);
END
