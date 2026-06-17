-- 137: Seed danh mục nhân khẩu đang RỖNG trên prod — Giới tính / Dân tộc (54) / Nghề nghiệp.
-- Gốc lỗi: migration 105 chỉ seed BÊN TRONG block CREATE (IF OBJECT_ID(...) IS NULL). Trên prod
--          các bảng đã tồn tại sẵn (rỗng) nên CREATE-block bị skip ⇒ seed không bao giờ chạy.
--          Occupations thì 105 KHÔNG seed dòng nào.
-- Cách làm: seed bằng guard theo từng Code (WHERE NOT EXISTS), ĐỘC LẬP việc tạo bảng ⇒ idempotent,
--           chạy lại an toàn, chỉ INSERT Code CHƯA tồn tại — KHÔNG xóa/đụng dữ liệu người dùng đã thêm.
-- Bảng có filtered unique index UX_*_Code WHERE IsDeleted=0 ⇒ INSERT cần QUOTED_IDENTIFIER/ANSI_NULLS ON.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ─────────────────────────── Giới tính ───────────────────────────
-- Mã chuẩn BHYT: 1=Nam, 2=Nữ, 3=Khác (chưa xác định).
IF OBJECT_ID('dbo.Genders', 'U') IS NOT NULL
BEGIN
    ;WITH src(Code, Name, Note, SortOrder) AS (
        SELECT N'1', N'Nam',  NULL,                 1 UNION ALL
        SELECT N'2', N'Nữ',   NULL,                 2 UNION ALL
        SELECT N'3', N'Khác', N'Chưa xác định',     3
    )
    INSERT INTO dbo.Genders (Id, Code, Name, Note, SortOrder, IsActive, IsDeleted, CreatedAt)
    SELECT NEWID(), s.Code, s.Name, s.Note, s.SortOrder, 1, 0, SYSUTCDATETIME()
    FROM src s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Genders g WHERE g.Code = s.Code);
    PRINT N'Seed Genders: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' row(s) inserted';
END
GO

-- ─────────────────────────── Dân tộc (54 dân tộc VN) ───────────────────────────
-- Mã DANTOC theo danh mục BHXH / Tổng cục Thống kê (01..54), thứ tự chuẩn quốc gia.
IF OBJECT_ID('dbo.Ethnics', 'U') IS NOT NULL
BEGIN
    ;WITH src(Code, Name, SortOrder) AS (
        SELECT N'01', N'Kinh',           1  UNION ALL
        SELECT N'02', N'Tày',            2  UNION ALL
        SELECT N'03', N'Thái',           3  UNION ALL
        SELECT N'04', N'Hoa',            4  UNION ALL
        SELECT N'05', N'Khơ-me',         5  UNION ALL
        SELECT N'06', N'Mường',          6  UNION ALL
        SELECT N'07', N'Nùng',           7  UNION ALL
        SELECT N'08', N'H''Mông',        8  UNION ALL
        SELECT N'09', N'Dao',            9  UNION ALL
        SELECT N'10', N'Gia Rai',        10 UNION ALL
        SELECT N'11', N'Ngái',           11 UNION ALL
        SELECT N'12', N'Ê Đê',           12 UNION ALL
        SELECT N'13', N'Ba Na',          13 UNION ALL
        SELECT N'14', N'Xơ Đăng',        14 UNION ALL
        SELECT N'15', N'Sán Chay',       15 UNION ALL
        SELECT N'16', N'Cơ Ho',          16 UNION ALL
        SELECT N'17', N'Chăm',           17 UNION ALL
        SELECT N'18', N'Sán Dìu',        18 UNION ALL
        SELECT N'19', N'Hrê',            19 UNION ALL
        SELECT N'20', N'Mnông',          20 UNION ALL
        SELECT N'21', N'Ra Glai',        21 UNION ALL
        SELECT N'22', N'Xtiêng',         22 UNION ALL
        SELECT N'23', N'Bru - Vân Kiều', 23 UNION ALL
        SELECT N'24', N'Thổ',            24 UNION ALL
        SELECT N'25', N'Giáy',           25 UNION ALL
        SELECT N'26', N'Cơ Tu',          26 UNION ALL
        SELECT N'27', N'Gié Triêng',     27 UNION ALL
        SELECT N'28', N'Mạ',             28 UNION ALL
        SELECT N'29', N'Khơ Mú',         29 UNION ALL
        SELECT N'30', N'Co',             30 UNION ALL
        SELECT N'31', N'Tà Ôi',          31 UNION ALL
        SELECT N'32', N'Chơ Ro',         32 UNION ALL
        SELECT N'33', N'Kháng',          33 UNION ALL
        SELECT N'34', N'Xinh Mun',       34 UNION ALL
        SELECT N'35', N'Hà Nhì',         35 UNION ALL
        SELECT N'36', N'Chu Ru',         36 UNION ALL
        SELECT N'37', N'Lào',            37 UNION ALL
        SELECT N'38', N'La Chí',         38 UNION ALL
        SELECT N'39', N'La Ha',          39 UNION ALL
        SELECT N'40', N'Phù Lá',         40 UNION ALL
        SELECT N'41', N'La Hủ',          41 UNION ALL
        SELECT N'42', N'Lự',             42 UNION ALL
        SELECT N'43', N'Lô Lô',          43 UNION ALL
        SELECT N'44', N'Chứt',           44 UNION ALL
        SELECT N'45', N'Mảng',           45 UNION ALL
        SELECT N'46', N'Pà Thẻn',        46 UNION ALL
        SELECT N'47', N'Co Lao',         47 UNION ALL
        SELECT N'48', N'Cống',           48 UNION ALL
        SELECT N'49', N'Bố Y',           49 UNION ALL
        SELECT N'50', N'Si La',          50 UNION ALL
        SELECT N'51', N'Pu Péo',         51 UNION ALL
        SELECT N'52', N'Brâu',           52 UNION ALL
        SELECT N'53', N'Ơ Đu',           53 UNION ALL
        SELECT N'54', N'Rơ Măm',         54
    )
    INSERT INTO dbo.Ethnics (Id, Code, Name, SortOrder, IsActive, IsDeleted, CreatedAt)
    SELECT NEWID(), s.Code, s.Name, s.SortOrder, 1, 0, SYSUTCDATETIME()
    FROM src s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Ethnics e WHERE e.Code = s.Code);
    PRINT N'Seed Ethnics: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' row(s) inserted';
END
GO

-- ─────────────────────────── Nghề nghiệp ───────────────────────────
-- Nhóm nghề nghiệp phổ biến dùng cho hồ sơ BHYT / khai báo (mã 01..20). Bệnh viện tự bổ sung qua UI.
IF OBJECT_ID('dbo.Occupations', 'U') IS NOT NULL
BEGIN
    ;WITH src(Code, Name, SortOrder) AS (
        SELECT N'01', N'Nông dân',                1  UNION ALL
        SELECT N'02', N'Công nhân',               2  UNION ALL
        SELECT N'03', N'Cán bộ, công chức',       3  UNION ALL
        SELECT N'04', N'Viên chức',               4  UNION ALL
        SELECT N'05', N'Giáo viên',               5  UNION ALL
        SELECT N'06', N'Nhân viên y tế',          6  UNION ALL
        SELECT N'07', N'Học sinh, sinh viên',     7  UNION ALL
        SELECT N'08', N'Quân nhân',               8  UNION ALL
        SELECT N'09', N'Công an',                 9  UNION ALL
        SELECT N'10', N'Hưu trí',                 10 UNION ALL
        SELECT N'11', N'Nội trợ',                 11 UNION ALL
        SELECT N'12', N'Kinh doanh, buôn bán',    12 UNION ALL
        SELECT N'13', N'Lái xe',                  13 UNION ALL
        SELECT N'14', N'Thợ thủ công',            14 UNION ALL
        SELECT N'15', N'Ngư dân',                 15 UNION ALL
        SELECT N'16', N'Lâm nghiệp',              16 UNION ALL
        SELECT N'17', N'Xây dựng',                17 UNION ALL
        SELECT N'18', N'Lao động tự do',          18 UNION ALL
        SELECT N'19', N'Nhân viên văn phòng',     19 UNION ALL
        SELECT N'20', N'Khác',                    20
    )
    INSERT INTO dbo.Occupations (Id, Code, Name, SortOrder, IsActive, IsDeleted, CreatedAt)
    SELECT NEWID(), s.Code, s.Name, s.SortOrder, 1, 0, SYSUTCDATETIME()
    FROM src s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Occupations o WHERE o.Code = s.Code);
    PRINT N'Seed Occupations: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' row(s) inserted';
END
GO
