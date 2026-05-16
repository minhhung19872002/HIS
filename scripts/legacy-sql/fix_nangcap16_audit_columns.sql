-- Fix NangCap16 audit columns to match BaseEntity string user ids.
-- The application stores CreatedBy/UpdatedBy as strings, but several EMR tables
-- were created with UNIQUEIDENTIFIER columns, causing InvalidCastException when
-- EF materializes existing rows.

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;

DECLARE @sql nvarchar(max) = N'';

;WITH target_tables AS (
    SELECT v.TableName
    FROM (VALUES
        ('EmrShares'),
        ('EmrShareAccessLogs'),
        ('EmrExtracts'),
        ('EmrSpines'),
        ('EmrSpineSections'),
        ('PatientSignatures'),
        ('DocumentLocks'),
        ('EmrDataTags'),
        ('EmrImages'),
        ('Shortcodes'),
        ('EmrAutoCheckRules'),
        ('EmrCloseLogs')
    ) v(TableName)
)
SELECT @sql = @sql + '
IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = ''' + TableName + '''
      AND COLUMN_NAME = ''CreatedBy''
      AND DATA_TYPE = ''uniqueidentifier''
)
BEGIN
    ALTER TABLE dbo.' + QUOTENAME(TableName) + ' ALTER COLUMN CreatedBy NVARCHAR(450) NULL;
END;

IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = ''' + TableName + '''
      AND COLUMN_NAME = ''UpdatedBy''
      AND DATA_TYPE = ''uniqueidentifier''
)
BEGIN
    ALTER TABLE dbo.' + QUOTENAME(TableName) + ' ALTER COLUMN UpdatedBy NVARCHAR(450) NULL;
END;
'
FROM target_tables;

EXEC sp_executesql @sql;

PRINT 'Fixed NangCap16 CreatedBy/UpdatedBy column types.';
