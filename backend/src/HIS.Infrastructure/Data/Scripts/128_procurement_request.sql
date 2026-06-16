-- 128_procurement_request.sql
-- Workflow de xuat - du tru - to trinh - duyet mua sam tai san / vat tu (#108)
-- Entity: AssetProcurementRequest (khac ProcurementRequests cua warehouse module)
-- Idempotent: toan bo trong IF OBJECT_ID IS NULL
-- Audit cols: NVARCHAR(450) NULL (tranh InvalidCastException Guid/String ValueConverter)

-- ─── 1. AssetProcurementRequests ─────────────────────────────────────────────

IF OBJECT_ID(N'dbo.AssetProcurementRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AssetProcurementRequests (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        RequestNo       NVARCHAR(50)     NOT NULL,           -- DX-2026-XXXXXX / DT-... / MS-...
        Title           NVARCHAR(500)    NOT NULL,
        RequestType     INT              NOT NULL DEFAULT 1, -- 1=DeXuat, 2=DuTru, 3=MuaSam
        DepartmentId    UNIQUEIDENTIFIER NULL,
        DepartmentName  NVARCHAR(200)    NULL,
        RequesterId     UNIQUEIDENTIFIER NULL,
        RequesterName   NVARCHAR(200)    NULL,
        Reason          NVARCHAR(MAX)    NULL,
        Status          INT              NOT NULL DEFAULT 0, -- 0=DuThao,1=ChoXetDuyet,2=DaDuyet,3=TuChoi,4=HoanTat
        TotalAmount     DECIMAL(18,2)    NULL,
        ApproverId      UNIQUEIDENTIFIER NULL,
        ApproverName    NVARCHAR(200)    NULL,
        ApprovedAt      DATETIME2        NULL,
        Note            NVARCHAR(MAX)    NULL,
        -- Audit cols: NVARCHAR(450) NULL (tranh InvalidCastException Guid/String)
        CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(450)    NULL,
        UpdatedAt       DATETIME2        NULL,
        UpdatedBy       NVARCHAR(450)    NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_AssetProcurementRequests PRIMARY KEY (Id)
    );

    CREATE INDEX IX_AssetProcurementRequests_Status
        ON dbo.AssetProcurementRequests (Status) WHERE IsDeleted = 0;

    CREATE INDEX IX_AssetProcurementRequests_DepartmentId
        ON dbo.AssetProcurementRequests (DepartmentId) WHERE IsDeleted = 0;

    CREATE UNIQUE INDEX UX_AssetProcurementRequests_RequestNo
        ON dbo.AssetProcurementRequests (RequestNo);
END

-- ─── 2. AssetProcurementRequestItems ─────────────────────────────────────────

IF OBJECT_ID(N'dbo.AssetProcurementRequestItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AssetProcurementRequestItems (
        Id                        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        AssetProcurementRequestId UNIQUEIDENTIFIER NOT NULL,
        ItemName                  NVARCHAR(300)    NOT NULL,
        Unit                      NVARCHAR(50)     NULL,
        Quantity                  DECIMAL(18,4)    NOT NULL DEFAULT 0,
        UnitPrice                 DECIMAL(18,2)    NULL,
        Amount                    DECIMAL(18,2)    NULL,   -- = Quantity * UnitPrice (denormalized)
        Specification             NVARCHAR(500)    NULL,
        -- Audit cols
        CreatedAt                 DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy                 NVARCHAR(450)    NULL,
        UpdatedAt                 DATETIME2        NULL,
        UpdatedBy                 NVARCHAR(450)    NULL,
        IsDeleted                 BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_AssetProcurementRequestItems PRIMARY KEY (Id),
        CONSTRAINT FK_AssetProcurementRequestItems_AssetProcurementRequests
            FOREIGN KEY (AssetProcurementRequestId) REFERENCES dbo.AssetProcurementRequests(Id)
    );

    CREATE INDEX IX_AssetProcurementRequestItems_RequestId
        ON dbo.AssetProcurementRequestItems (AssetProcurementRequestId);
END
