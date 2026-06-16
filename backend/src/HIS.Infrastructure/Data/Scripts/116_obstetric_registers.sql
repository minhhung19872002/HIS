-- 116_obstetric_registers.sql
-- Module So San khoa (#154 F1.8): So sinh de (BirthRegisters) + So theo doi nao pha thai (AbortionRegisters)
-- Register phap ly nhap tay, standalone (khong FK Patient). Idempotent IF OBJECT_ID IS NULL.

IF OBJECT_ID(N'dbo.BirthRegisters', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BirthRegisters (
        Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        RegisterNo       INT              NOT NULL DEFAULT 0,
        DeliveryDate     DATETIME2        NOT NULL,
        MotherName       NVARCHAR(200)    NOT NULL DEFAULT N'',
        MotherAge        INT              NOT NULL DEFAULT 0,
        MotherIdNumber   NVARCHAR(50)     NULL,
        MotherAddress    NVARCHAR(500)    NULL,
        GestationalWeeks INT              NOT NULL DEFAULT 0,
        ParaInfo         NVARCHAR(100)    NULL,
        DeliveryMethod   NVARCHAR(100)    NULL,
        BabyCount        INT              NOT NULL DEFAULT 1,
        BabyGender       INT              NOT NULL DEFAULT 0,
        BabyWeight       DECIMAL(10,2)    NOT NULL DEFAULT 0,  -- gram
        BabyCondition    NVARCHAR(200)    NULL,
        Attendant        NVARCHAR(200)    NULL,
        Notes            NVARCHAR(MAX)    NULL,
        -- Audit cols: NVARCHAR(450) NULL (tranh ValueConverter Guid/String)
        CreatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy        NVARCHAR(450)    NULL,
        UpdatedAt        DATETIME2        NULL,
        UpdatedBy        NVARCHAR(450)    NULL,
        IsDeleted        BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_BirthRegisters PRIMARY KEY (Id)
    );

    CREATE INDEX IX_BirthRegisters_DeliveryDate ON dbo.BirthRegisters (DeliveryDate);
END

IF OBJECT_ID(N'dbo.AbortionRegisters', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AbortionRegisters (
        Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        RegisterNo       INT              NOT NULL DEFAULT 0,
        ProcedureDate    DATETIME2        NOT NULL,
        PatientName      NVARCHAR(200)    NOT NULL DEFAULT N'',
        PatientAge       INT              NOT NULL DEFAULT 0,
        PatientIdNumber  NVARCHAR(50)     NULL,
        PatientAddress   NVARCHAR(500)    NULL,
        GestationalWeeks INT              NOT NULL DEFAULT 0,
        Method           NVARCHAR(100)    NULL,
        Reason           NVARCHAR(500)    NULL,
        Performer        NVARCHAR(200)    NULL,
        Complications    NVARCHAR(MAX)    NULL,
        Notes            NVARCHAR(MAX)    NULL,
        -- Audit cols
        CreatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy        NVARCHAR(450)    NULL,
        UpdatedAt        DATETIME2        NULL,
        UpdatedBy        NVARCHAR(450)    NULL,
        IsDeleted        BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_AbortionRegisters PRIMARY KEY (Id)
    );

    CREATE INDEX IX_AbortionRegisters_ProcedureDate ON dbo.AbortionRegisters (ProcedureDate);
END
