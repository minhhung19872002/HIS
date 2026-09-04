-- 172: làm nốt phần đổi collation mà 143 bỏ dở (#403).
--
-- Script 143 đổi collation ba cột tìm kiếm của `Patients` sang `Latin1_General_CI_AI` để lễ tân gõ
-- KHÔNG DẤU vẫn ra kết quả. Chính header của 143 đã lường trước: *"nếu env nào đó có index chặn
-- ALTER, batch lỗi sẽ được runner log warning (không chặn startup) → xử lý tay"*. Điều đó đã xảy ra
-- và chưa ai xử lý.
--
-- Trạng thái đo được trước script này:
--     FullName        Latin1_General_CI_AI   ✔ đã đổi
--     PhoneNumber     Vietnamese_CI_AS       ✗ chưa
--     IdentityNumber  Vietnamese_CI_AS       ✗ chưa — `IX_Patients_IdentityNumber` chặn ALTER
--
-- Con trỏ trong 143 đổi `FullName` xong thì chết ở cột có index, nên hai cột còn lại không bao giờ
-- được đổi. Máy chủ log lỗi này ở **mọi lần khởi động** rồi chạy tiếp, nên nó hỏng âm thầm đã lâu.
--
-- Cách xử lý: bỏ index → ALTER → tạo lại index. Cả hai index đều là NONCLUSTERED, KHÔNG unique,
-- KHÔNG filter, một cột — nên tạo lại là khôi phục y nguyên, và vì không unique nên đổi sang
-- accent-insensitive cũng không sinh lỗi trùng khoá.
--
-- Idempotent: chỉ động vào cột nào collation còn khác đích; chạy trên máy đã đúng là không làm gì.

IF OBJECT_ID(N'dbo.Patients') IS NOT NULL
BEGIN
    DECLARE @col sysname, @idx sysname, @stmt nvarchar(max);

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT c.name
        FROM sys.columns c
        WHERE c.object_id = OBJECT_ID(N'dbo.Patients')
          AND c.name IN (N'PhoneNumber', N'IdentityNumber')
          AND c.collation_name IS NOT NULL
          AND c.collation_name <> N'Latin1_General_CI_AI';

    OPEN cur;
    FETCH NEXT FROM cur INTO @col;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @idx = N'IX_Patients_' + @col;

        -- 1. Bỏ index đang giữ cột (nếu có)
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Patients') AND name = @idx)
        BEGIN
            SET @stmt = N'DROP INDEX ' + QUOTENAME(@idx) + N' ON dbo.Patients;';
            EXEC sys.sp_executesql @stmt;
        END

        -- 2. Đổi collation, đọc kiểu + nullability từ sys.columns (không hard-code độ dài)
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

        -- 3. Tạo lại index y như cũ (nonclustered, không unique, một cột)
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Patients') AND name = @idx)
        BEGIN
            SET @stmt = N'CREATE INDEX ' + QUOTENAME(@idx) + N' ON dbo.Patients(' + QUOTENAME(@col) + N');';
            EXEC sys.sp_executesql @stmt;
        END

        PRINT N'172 (#403): Patients.' + @col + N' → Latin1_General_CI_AI (đã tạo lại ' + @idx + N')';
        FETCH NEXT FROM cur INTO @col;
    END
    CLOSE cur;
    DEALLOCATE cur;
END
GO
