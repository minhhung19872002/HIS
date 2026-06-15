-- 103: DM Địa danh hành chính — Tỉnh/Huyện/Xã (F10.1 #94)
-- Idempotent: IF NOT EXISTS guards — chạy lại không lỗi.
-- CreatedBy/UpdatedBy = NVARCHAR(max) (string, không cần ValueConverter).
-- Cấu trúc: Province (1) → District (n) → Ward (n).

-- ─── Tỉnh/Thành phố ────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Provinces')
BEGIN
    CREATE TABLE Provinces (
        Id          uniqueidentifier NOT NULL CONSTRAINT PK_Provinces PRIMARY KEY DEFAULT NEWID(),
        Code        nvarchar(20)     NOT NULL,
        Name        nvarchar(200)    NOT NULL,
        IsActive    bit              NOT NULL CONSTRAINT DF_Provinces_IsActive DEFAULT (1),
        CreatedAt   datetime2        NOT NULL,
        CreatedBy   nvarchar(max)    NULL,
        UpdatedAt   datetime2        NULL,
        UpdatedBy   nvarchar(max)    NULL,
        IsDeleted   bit              NOT NULL CONSTRAINT DF_Provinces_IsDeleted DEFAULT (0)
    );
    CREATE UNIQUE INDEX UX_Provinces_Code ON Provinces(Code) WHERE IsDeleted = 0;
    PRINT 'Created Provinces';
END
GO

-- ─── Quận/Huyện ────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Districts')
BEGIN
    CREATE TABLE Districts (
        Id          uniqueidentifier NOT NULL CONSTRAINT PK_Districts PRIMARY KEY DEFAULT NEWID(),
        Code        nvarchar(20)     NOT NULL,
        Name        nvarchar(200)    NOT NULL,
        ProvinceId  uniqueidentifier NOT NULL,
        IsActive    bit              NOT NULL CONSTRAINT DF_Districts_IsActive DEFAULT (1),
        CreatedAt   datetime2        NOT NULL,
        CreatedBy   nvarchar(max)    NULL,
        UpdatedAt   datetime2        NULL,
        UpdatedBy   nvarchar(max)    NULL,
        IsDeleted   bit              NOT NULL CONSTRAINT DF_Districts_IsDeleted DEFAULT (0),
        CONSTRAINT FK_Districts_Provinces FOREIGN KEY (ProvinceId) REFERENCES Provinces(Id)
    );
    CREATE INDEX IX_Districts_ProvinceId ON Districts(ProvinceId);
    PRINT 'Created Districts';
END
GO

-- ─── Xã/Phường/Thị trấn ──────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Wards')
BEGIN
    CREATE TABLE Wards (
        Id          uniqueidentifier NOT NULL CONSTRAINT PK_Wards PRIMARY KEY DEFAULT NEWID(),
        Code        nvarchar(20)     NOT NULL,
        Name        nvarchar(200)    NOT NULL,
        DistrictId  uniqueidentifier NOT NULL,
        IsActive    bit              NOT NULL CONSTRAINT DF_Wards_IsActive DEFAULT (1),
        CreatedAt   datetime2        NOT NULL,
        CreatedBy   nvarchar(max)    NULL,
        UpdatedAt   datetime2        NULL,
        UpdatedBy   nvarchar(max)    NULL,
        IsDeleted   bit              NOT NULL CONSTRAINT DF_Wards_IsDeleted DEFAULT (0),
        CONSTRAINT FK_Wards_Districts FOREIGN KEY (DistrictId) REFERENCES Districts(Id)
    );
    CREATE INDEX IX_Wards_DistrictId ON Wards(DistrictId);
    PRINT 'Created Wards';
END
GO

-- ─── Seed bản ghi mẫu (một số tỉnh — chỉ nếu bảng vừa tạo / còn rỗng) ──
IF NOT EXISTS (SELECT 1 FROM Provinces WHERE IsDeleted = 0)
BEGIN
    INSERT INTO Provinces (Id, Code, Name, IsActive, CreatedAt, IsDeleted)
    VALUES
        (NEWID(), N'01', N'Hà Nội',                1, GETDATE(), 0),
        (NEWID(), N'48', N'Đà Nẵng',               1, GETDATE(), 0),
        (NEWID(), N'79', N'TP. Hồ Chí Minh',       1, GETDATE(), 0),
        (NEWID(), N'66', N'Đắk Nông',              1, GETDATE(), 0),
        (NEWID(), N'60', N'Gia Lai',               1, GETDATE(), 0),
        (NEWID(), N'62', N'Đắk Lắk',              1, GETDATE(), 0),
        (NEWID(), N'56', N'Khánh Hoà',             1, GETDATE(), 0),
        (NEWID(), N'92', N'Cần Thơ',               1, GETDATE(), 0);
    PRINT 'Seeded 8 sample Provinces';
END
GO
