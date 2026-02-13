-- Create HIS database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'HIS')
BEGIN
    CREATE DATABASE HIS;
    PRINT 'Database HIS created successfully';
END
ELSE
BEGIN
    PRINT 'Database HIS already exists';
END
GO

USE HIS;
GO

-- Create app user (optional - can use SA for development)
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'his_app')
BEGIN
    CREATE LOGIN his_app WITH PASSWORD = N'HIS@App2024!', DEFAULT_DATABASE = HIS;
    PRINT 'Login his_app created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'his_app')
BEGIN
    CREATE USER his_app FOR LOGIN his_app;
    ALTER ROLE db_owner ADD MEMBER his_app;
    PRINT 'User his_app created and added to db_owner role';
END
GO

PRINT 'HIS Database initialization completed';
GO
