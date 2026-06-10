-- R2 (2026-06-11): Portal bệnh nhân tự đăng nhập — account đăng ký tồn tại TRƯỚC khi link hồ sơ BN.
-- PortalAccounts.PatientId NOT NULL + FK làm POST /portal/register luôn 500 (FK conflict với Guid.Empty)
-- → nới cột thành NULL (FK giữ nguyên — NULL được phép qua FK).
-- Idempotent: chỉ ALTER khi cột đang NOT NULL.

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PortalAccounts' AND COLUMN_NAME = 'PatientId' AND IS_NULLABLE = 'NO'
)
BEGIN
    DECLARE @fk sysname;
    SELECT @fk = fk.name
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
    WHERE fk.parent_object_id = OBJECT_ID('PortalAccounts') AND c.name = 'PatientId';

    IF @fk IS NOT NULL
        EXEC('ALTER TABLE PortalAccounts DROP CONSTRAINT [' + @fk + ']');

    ALTER TABLE PortalAccounts ALTER COLUMN PatientId uniqueidentifier NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PortalAccounts_Patient')
        ALTER TABLE PortalAccounts WITH NOCHECK
            ADD CONSTRAINT FK_PortalAccounts_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id);

    PRINT '88: PortalAccounts.PatientId -> NULLABLE (FK re-created)';
END
ELSE
    PRINT '88: PortalAccounts.PatientId already nullable - skip';
