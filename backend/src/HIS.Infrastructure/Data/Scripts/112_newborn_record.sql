-- 112_newborn_record.sql
-- Module So sinh noi tru (#50-54): tao bang NewbornRecords
-- Idempotent: bao boc toan bo trong IF OBJECT_ID IS NULL

IF OBJECT_ID(N'dbo.NewbornRecords', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NewbornRecords (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        MotherAdmissionId   UNIQUEIDENTIFIER NOT NULL,
        BirthDate           DATE             NOT NULL,
        BirthTime           TIME(7)          NOT NULL,
        Gender              INT              NOT NULL DEFAULT 0,
        BirthWeight         DECIMAL(10,2)    NOT NULL DEFAULT 0,  -- gram
        BirthLength         DECIMAL(10,2)    NOT NULL DEFAULT 0,  -- cm
        HeadCircumference   DECIMAL(10,2)    NOT NULL DEFAULT 0,  -- cm
        ApgarScore1Min      INT              NOT NULL DEFAULT 0,
        ApgarScore5Min      INT              NOT NULL DEFAULT 0,
        ApgarScore10Min     INT              NULL,
        DeliveryMethod      NVARCHAR(200)    NULL,
        Complications       NVARCHAR(MAX)    NULL,
        InitialExamFindings NVARCHAR(MAX)    NULL,
        VitaminKGiven       NVARCHAR(200)    NULL,
        HepBVaccine         NVARCHAR(200)    NULL,
        NewbornAdmissionId  UNIQUEIDENTIFIER NULL,
        Status              INT              NOT NULL DEFAULT 0,  -- 0=Dang theo doi, 2=Da xuat
        DischargeDate       DATETIME2        NULL,
        -- Audit cols: NVARCHAR(450) NULL (tranh ValueConverter Guid/String)
        CreatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(450)    NULL,
        UpdatedAt           DATETIME2        NULL,
        UpdatedBy           NVARCHAR(450)    NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_NewbornRecords PRIMARY KEY (Id),
        CONSTRAINT FK_NewbornRecords_Admissions
            FOREIGN KEY (MotherAdmissionId) REFERENCES dbo.Admissions(Id)
    );

    CREATE INDEX IX_NewbornRecords_MotherAdmissionId
        ON dbo.NewbornRecords (MotherAdmissionId);
END
