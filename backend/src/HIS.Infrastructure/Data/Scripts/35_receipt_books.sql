-- N1.13: Sổ biên lai khai báo

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ReceiptBooks')
BEGIN
    CREATE TABLE [dbo].[ReceiptBooks] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [BookCode] NVARCHAR(30) NOT NULL,
        [BookName] NVARCHAR(255) NOT NULL,
        [ReceiptType] INT NOT NULL,
        [Series] NVARCHAR(30) NULL,
        [TemplateCode] NVARCHAR(30) NULL,
        [StartNumber] BIGINT NOT NULL,
        [EndNumber] BIGINT NOT NULL,
        [CurrentNumber] BIGINT NOT NULL,
        [FiscalYear] INT NOT NULL,
        [IssueDate] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [RegisteredDate] DATETIME2 NULL,
        [RegistrationNumber] NVARCHAR(100) NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [ClosedDate] DATETIME2 NULL,
        [ClosedReason] NVARCHAR(500) NULL,
        [DepartmentId] UNIQUEIDENTIFIER NULL,
        [CashierId] UNIQUEIDENTIFIER NULL,
        [Notes] NVARCHAR(500) NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_ReceiptBooks_Code] ON [dbo].[ReceiptBooks]([BookCode]);
    CREATE INDEX [IX_ReceiptBooks_Status_Year] ON [dbo].[ReceiptBooks]([Status], [FiscalYear]);
END
