-- 85: Bảng RefillRequests + ServiceFeedbacks cho Cổng bệnh nhân (F9 — 2026-06-09).
-- Trước đây RequestRefill/SubmitFeedback chỉ trả DTO, không lưu. Idempotent.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RefillRequests')
BEGIN
    CREATE TABLE RefillRequests (
        Id                 uniqueidentifier NOT NULL CONSTRAINT PK_RefillRequests PRIMARY KEY,
        PrescriptionId     uniqueidentifier NOT NULL,
        DeliveryOption     nvarchar(50)     NOT NULL CONSTRAINT DF_RefillRequests_DeliveryOption DEFAULT ('Pickup'),
        DeliveryAddress    nvarchar(500)    NULL,
        DeliveryPhone      nvarchar(50)     NULL,
        PreferredPharmacyId uniqueidentifier NULL,
        Notes              nvarchar(max)    NULL,
        Status             nvarchar(50)     NOT NULL CONSTRAINT DF_RefillRequests_Status DEFAULT ('Pending'),
        RequestedAt        datetime2        NOT NULL,
        CreatedAt          datetime2        NOT NULL,
        CreatedBy          nvarchar(max)    NULL,
        UpdatedAt          datetime2        NULL,
        UpdatedBy          nvarchar(max)    NULL,
        IsDeleted          bit              NOT NULL CONSTRAINT DF_RefillRequests_IsDeleted DEFAULT (0)
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ServiceFeedbacks')
BEGIN
    CREATE TABLE ServiceFeedbacks (
        Id              uniqueidentifier NOT NULL CONSTRAINT PK_ServiceFeedbacks PRIMARY KEY,
        PatientId       uniqueidentifier NOT NULL,
        VisitId         uniqueidentifier NOT NULL,
        OverallRating   int              NOT NULL CONSTRAINT DF_ServiceFeedbacks_Overall DEFAULT (0),
        DoctorRating    int              NOT NULL CONSTRAINT DF_ServiceFeedbacks_Doctor DEFAULT (0),
        StaffRating     int              NOT NULL CONSTRAINT DF_ServiceFeedbacks_Staff DEFAULT (0),
        FacilityRating  int              NOT NULL CONSTRAINT DF_ServiceFeedbacks_Facility DEFAULT (0),
        WaitTimeRating  int              NOT NULL CONSTRAINT DF_ServiceFeedbacks_WaitTime DEFAULT (0),
        Comments        nvarchar(max)    NULL,
        WouldRecommend  bit              NOT NULL CONSTRAINT DF_ServiceFeedbacks_Recommend DEFAULT (0),
        SubmittedAt     datetime2        NOT NULL,
        CreatedAt       datetime2        NOT NULL,
        CreatedBy       nvarchar(max)    NULL,
        UpdatedAt       datetime2        NULL,
        UpdatedBy       nvarchar(max)    NULL,
        IsDeleted       bit              NOT NULL CONSTRAINT DF_ServiceFeedbacks_IsDeleted DEFAULT (0)
    );
END
