-- =============================================================================
-- TDE (Transparent Data Encryption) Setup for HIS Database
-- =============================================================================
-- Run as SA on the SQL Server instance
-- NOTE: SQL Server Developer Edition supports TDE
-- This script is idempotent - safe to run multiple times
-- =============================================================================

USE master;
GO

-- Step 1: Create master key (if not exists)
IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'HIS_TDE_MasterKey!2026';
GO

-- Step 2: Create certificate for TDE (if not exists)
IF NOT EXISTS (SELECT * FROM sys.certificates WHERE name = 'HIS_TDE_Cert')
    CREATE CERTIFICATE HIS_TDE_Cert WITH SUBJECT = 'HIS TDE Certificate';
GO

-- Step 3: IMMEDIATELY backup certificate (CRITICAL - without this, backups are unrecoverable)
-- For Docker: /var/opt/mssql/backup/
-- For Windows: adjust path as needed
BACKUP CERTIFICATE HIS_TDE_Cert
    TO FILE = '/var/opt/mssql/backup/HIS_TDE_Cert.cer'
    WITH PRIVATE KEY (
        FILE = '/var/opt/mssql/backup/HIS_TDE_Cert_Key.pvk',
        ENCRYPTION BY PASSWORD = 'HIS_CertBackup!2026'
    );
GO

-- Step 4: Create database encryption key and enable TDE
USE HIS;
GO

IF NOT EXISTS (SELECT * FROM sys.dm_database_encryption_keys WHERE database_id = DB_ID())
BEGIN
    CREATE DATABASE ENCRYPTION KEY
        WITH ALGORITHM = AES_256
        ENCRYPTION BY SERVER CERTIFICATE HIS_TDE_Cert;
    ALTER DATABASE HIS SET ENCRYPTION ON;
END
GO

-- Step 5: Verify TDE status
-- encryption_state: 0=No key, 1=Unencrypted, 2=Encryption in progress, 3=Encrypted
SELECT db.name, dek.encryption_state, dek.key_algorithm, dek.key_length
FROM sys.dm_database_encryption_keys dek
JOIN sys.databases db ON dek.database_id = db.database_id
WHERE db.name = 'HIS';
GO

PRINT 'TDE setup complete. Verify encryption_state = 3 (Encrypted) above.';
PRINT 'IMPORTANT: Store certificate backup files securely - they are required to restore backups.';
GO
