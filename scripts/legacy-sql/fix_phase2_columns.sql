-- Fix CreatedBy/UpdatedBy from uniqueidentifier to nvarchar(450)
-- to match BaseEntity.CreatedBy/UpdatedBy declared as string?
-- Idempotent: only ALTER if column is uniqueidentifier.

SET QUOTED_IDENTIFIER ON;

DECLARE @sql nvarchar(max);
DECLARE @tbl nvarchar(128);

DECLARE c CURSOR LOCAL FOR
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('QualityIndicators', 'PortalAppointments')
  AND COLUMN_NAME = 'CreatedBy'
  AND DATA_TYPE = 'uniqueidentifier';

OPEN c;
FETCH NEXT FROM c INTO @tbl;
WHILE @@FETCH_STATUS = 0
BEGIN
    -- drop default constraint if any
    DECLARE @cn nvarchar(128);
    SELECT TOP 1 @cn = dc.name FROM sys.default_constraints dc
        JOIN sys.columns col ON col.default_object_id = dc.object_id
        WHERE col.object_id = OBJECT_ID(@tbl) AND col.name IN ('CreatedBy','UpdatedBy');
    IF @cn IS NOT NULL
        EXEC('ALTER TABLE ' + @tbl + ' DROP CONSTRAINT ' + @cn);

    SET @sql = 'ALTER TABLE ' + QUOTENAME(@tbl) + ' ALTER COLUMN CreatedBy nvarchar(450) NULL';
    EXEC sp_executesql @sql;
    SET @sql = 'ALTER TABLE ' + QUOTENAME(@tbl) + ' ALTER COLUMN UpdatedBy nvarchar(450) NULL';
    EXEC sp_executesql @sql;
    PRINT 'Fixed: ' + @tbl;

    FETCH NEXT FROM c INTO @tbl;
END
CLOSE c;
DEALLOCATE c;

SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('QualityIndicators', 'PortalAppointments')
  AND COLUMN_NAME IN ('CreatedBy','UpdatedBy');
