-- =============================================================================
-- 143: Tìm bệnh nhân KHÔNG DẤU (#403) — đổi collation cột search sang accent-insensitive
--
-- Vấn đề: EF `.Contains(keyword)` sinh `LIKE N'%kw%'` theo collation cột (mặc định
-- Vietnamese_CI_AS / SQL_Latin1_General_CP1_CI_AS) → accent-SENSITIVE: gõ "nguyen van an"
-- không ra "Nguyễn Văn An". Lễ tân VN gõ không dấu là hành vi mặc định (deal-breaker demo).
--
-- Chọn Latin1_General_CI_AI (KHÔNG phải Vietnamese_CI_AI) — đã verify trên SQL Server 2022:
--   N'Nguyễn' = N'Nguyen' COLLATE Vietnamese_CI_AI      → 1 (ok)
--   N'Đức'    = N'Duc'    COLLATE Vietnamese_CI_AI      → 0 (FAIL — đ là chữ cái riêng)
--   N'Nguyễn' = N'Nguyen' COLLATE Latin1_General_CI_AI  → 1
--   N'Đức'    = N'Duc'    COLLATE Latin1_General_CI_AI  → 1
--   N'Phượng' = N'Phuong' COLLATE Latin1_General_CI_AI  → 1
-- Vietnamese_CI_AI sẽ trượt mọi tên có Đ/đ (Đỗ, Đặng, Đức, Điệp...) — rất phổ biến.
-- Trade-off: ORDER BY FullName xếp đ/ơ/ư theo Latin1 thay vì bảng chữ cái VN — chấp nhận được.
--
-- Idempotent: chỉ ALTER khi collation hiện tại khác đích; đọc kiểu/nullability từ sys.columns
-- nên không hard-code độ dài cột. Không có index nào trên 3 cột này (đã kiểm kê 2026-07-10:
-- Patients chỉ có IX_Patients_BranchId) — nếu env nào đó có index chặn ALTER, batch lỗi sẽ
-- được runner log warning (không chặn startup) → xử lý tay.
-- =============================================================================

IF OBJECT_ID(N'dbo.Patients') IS NOT NULL
BEGIN
    DECLARE @col sysname, @stmt nvarchar(max);

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT c.name
        FROM sys.columns c
        WHERE c.object_id = OBJECT_ID(N'dbo.Patients')
          AND c.name IN (N'FullName', N'PhoneNumber', N'IdentityNumber')
          AND c.collation_name IS NOT NULL
          AND c.collation_name <> N'Latin1_General_CI_AI';

    OPEN cur;
    FETCH NEXT FROM cur INTO @col;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @stmt = N'ALTER TABLE dbo.Patients ALTER COLUMN ' + QUOTENAME(c.name) + N' '
            + t.name
            + CASE
                WHEN t.name IN (N'nvarchar', N'nchar')
                    THEN N'(' + CASE WHEN c.max_length = -1 THEN N'MAX' ELSE CAST(c.max_length / 2 AS nvarchar(10)) END + N')'
                WHEN t.name IN (N'varchar', N'char')
                    THEN N'(' + CASE WHEN c.max_length = -1 THEN N'MAX' ELSE CAST(c.max_length AS nvarchar(10)) END + N')'
                ELSE N''
              END
            + N' COLLATE Latin1_General_CI_AI '
            + CASE WHEN c.is_nullable = 1 THEN N'NULL' ELSE N'NOT NULL' END + N';'
        FROM sys.columns c
        JOIN sys.types t ON t.user_type_id = c.user_type_id
        WHERE c.object_id = OBJECT_ID(N'dbo.Patients') AND c.name = @col;

        EXEC sys.sp_executesql @stmt;
        PRINT N'143 (#403): đã đổi collation Patients.' + @col + N' → Latin1_General_CI_AI';

        FETCH NEXT FROM cur INTO @col;
    END
    CLOSE cur;
    DEALLOCATE cur;
END
