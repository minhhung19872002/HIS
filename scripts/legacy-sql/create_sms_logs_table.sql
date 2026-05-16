-- Create SmsLogs table for SMS delivery tracking
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SmsLogs')
BEGIN
    CREATE TABLE SmsLogs (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        PhoneNumber NVARCHAR(20) NOT NULL,
        [Message] NVARCHAR(500) NOT NULL,
        MessageType NVARCHAR(20) NOT NULL, -- OTP, Result, Booking, Reminder, Critical, Test, Queue, General
        Provider NVARCHAR(20) NOT NULL, -- esms, speedsms, dev
        Status INT NOT NULL DEFAULT 0, -- 0=Sent, 1=Failed, 2=DevMode
        ErrorMessage NVARCHAR(500) NULL,
        ProviderResponse NVARCHAR(MAX) NULL,
        PatientName NVARCHAR(200) NULL,
        RelatedEntityType NVARCHAR(50) NULL,
        RelatedEntityId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    -- Performance indexes
    CREATE INDEX IX_SmsLogs_CreatedAt ON SmsLogs (CreatedAt DESC);
    CREATE INDEX IX_SmsLogs_MessageType ON SmsLogs (MessageType, CreatedAt DESC);
    CREATE INDEX IX_SmsLogs_Status ON SmsLogs (Status, CreatedAt DESC);
    CREATE INDEX IX_SmsLogs_PhoneNumber ON SmsLogs (PhoneNumber, CreatedAt DESC);

    PRINT 'Created SmsLogs table with indexes';
END
ELSE
    PRINT 'SmsLogs table already exists';
GO
