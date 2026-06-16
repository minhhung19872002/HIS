-- 129_bhxh_audit_import.sql
-- Import danh sach giam dinh BHXH tu file Excel/CSV ben ngoai
-- Idempotent: dung IF NOT EXISTS guard

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BhxhAuditImports')
BEGIN
    CREATE TABLE BhxhAuditImports (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        -- Dinh danh lo import
        ImportBatchCode NVARCHAR(50)  NOT NULL,          -- Ma lo: IMPORT-YYYYMMDD-HHMMSS
        ImportedAt      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        ImportedByUserId UNIQUEIDENTIFIER NULL,
        FileName        NVARCHAR(500) NULL,
        -- Du lieu tung dong tu file
        RowNumber       INT           NOT NULL,           -- STT dong trong file (1-based)
        MaHoSo          NVARCHAR(100) NOT NULL,           -- Ma ho so giam dinh
        MaBenhNhan      NVARCHAR(50)  NULL,
        HoTen           NVARCHAR(200) NULL,
        SoTheBHYT      NVARCHAR(50)  NULL,
        NgayVao         DATETIME2     NULL,
        NgayRa          DATETIME2     NULL,
        MaKhoa          NVARCHAR(50)  NULL,
        TenKhoa         NVARCHAR(200) NULL,
        MaChanDoan      NVARCHAR(50)  NULL,
        TienVienPhi     DECIMAL(18,2) NOT NULL DEFAULT 0,
        TienBHYT        DECIMAL(18,2) NOT NULL DEFAULT 0,
        TienBenhNhan    DECIMAL(18,2) NOT NULL DEFAULT 0,
        -- Trang thai tu file BHXH
        TrangThaiGiamDinh INT         NOT NULL DEFAULT 0, -- 0=ChuaDuyet, 1=DaDuyet, 2=TuChoi
        GhiChu          NVARCHAR(500) NULL,
        -- Ket qua xu ly
        IsValid         BIT           NOT NULL DEFAULT 1,
        ValidationError NVARCHAR(500) NULL,
        -- Audit
        CreatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        IsDeleted       BIT           NOT NULL DEFAULT 0,
        CreatedBy       NVARCHAR(450) NULL,
        UpdatedBy       NVARCHAR(450) NULL
    );

    CREATE INDEX IX_BhxhAuditImports_ImportBatchCode ON BhxhAuditImports(ImportBatchCode);
    CREATE INDEX IX_BhxhAuditImports_MaHoSo          ON BhxhAuditImports(MaHoSo);
    CREATE INDEX IX_BhxhAuditImports_TrangThaiGiamDinh ON BhxhAuditImports(TrangThaiGiamDinh);
    CREATE INDEX IX_BhxhAuditImports_ImportedAt       ON BhxhAuditImports(ImportedAt);
END
GO

-- them index trang thai neu bang da ton tai nhung thieu index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BhxhAuditImports_TrangThaiGiamDinh' AND object_id = OBJECT_ID('BhxhAuditImports'))
BEGIN
    CREATE INDEX IX_BhxhAuditImports_TrangThaiGiamDinh ON BhxhAuditImports(TrangThaiGiamDinh);
END
GO
