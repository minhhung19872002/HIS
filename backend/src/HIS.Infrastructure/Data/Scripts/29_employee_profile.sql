-- Sprint 6 Item 2.13: HR employee profile 9 tab

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeAssets')
BEGIN
    CREATE TABLE [dbo].[EmployeeAssets] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [AssetType] NVARCHAR(30) NOT NULL DEFAULT 'HienKim',
        [AssetName] NVARCHAR(255) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [Value] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Location] NVARCHAR(255) NULL,
        [AcquiredAt] DATETIME2 NULL,
        [DocumentUrl] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_EmployeeAssets_User] ON [dbo].[EmployeeAssets]([UserId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeAllowances')
BEGIN
    CREATE TABLE [dbo].[EmployeeAllowances] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [AllowanceType] NVARCHAR(100) NOT NULL,
        [PaymentMethod] NVARCHAR(20) NOT NULL DEFAULT 'Monthly',
        [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Rate] DECIMAL(8,4) NULL,
        [EffectiveFrom] DATETIME2 NOT NULL,
        [EffectiveTo] DATETIME2 NULL,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_EmployeeAllowances_User] ON [dbo].[EmployeeAllowances]([UserId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeCareerHistories')
BEGIN
    CREATE TABLE [dbo].[EmployeeCareerHistories] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [FromDepartmentId] UNIQUEIDENTIFIER NULL,
        [FromDepartmentName] NVARCHAR(255) NULL,
        [FromPosition] NVARCHAR(100) NULL,
        [ToDepartmentId] UNIQUEIDENTIFIER NULL,
        [ToDepartmentName] NVARCHAR(255) NULL,
        [ToPosition] NVARCHAR(100) NULL,
        [TransferDate] DATETIME2 NOT NULL,
        [DecisionNumber] NVARCHAR(50) NULL,
        [Reason] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_EmployeeCareerHistories_User] ON [dbo].[EmployeeCareerHistories]([UserId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeEducations')
BEGIN
    CREATE TABLE [dbo].[EmployeeEducations] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Degree] NVARCHAR(100) NOT NULL,
        [Major] NVARCHAR(200) NOT NULL,
        [School] NVARCHAR(255) NULL,
        [GraduatedAt] DATETIME2 NULL,
        [CertificateNumber] NVARCHAR(100) NULL,
        [DocumentUrl] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_EmployeeEducations_User] ON [dbo].[EmployeeEducations]([UserId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeFamilies')
BEGIN
    CREATE TABLE [dbo].[EmployeeFamilies] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Relation] NVARCHAR(50) NOT NULL,
        [FullName] NVARCHAR(255) NOT NULL,
        [DateOfBirth] DATETIME2 NULL,
        [Occupation] NVARCHAR(100) NULL,
        [PhoneNumber] NVARCHAR(20) NULL,
        [IdentityNumber] NVARCHAR(20) NULL,
        [IsDependent] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_EmployeeFamilies_User] ON [dbo].[EmployeeFamilies]([UserId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeRewardDisciplines')
BEGIN
    CREATE TABLE [dbo].[EmployeeRewardDisciplines] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Type] NVARCHAR(20) NOT NULL DEFAULT 'reward',
        [Title] NVARCHAR(255) NOT NULL,
        [DecisionNumber] NVARCHAR(50) NULL,
        [DecisionDate] DATETIME2 NOT NULL,
        [Amount] DECIMAL(18,2) NULL,
        [Reason] NVARCHAR(500) NULL,
        [DecidedBy] NVARCHAR(255) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_EmployeeRewardDisciplines_User] ON [dbo].[EmployeeRewardDisciplines]([UserId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeBankAccounts')
BEGIN
    CREATE TABLE [dbo].[EmployeeBankAccounts] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [BankName] NVARCHAR(100) NOT NULL,
        [AccountNumber] NVARCHAR(30) NOT NULL,
        [AccountHolder] NVARCHAR(255) NOT NULL,
        [BranchName] NVARCHAR(255) NULL,
        [IsPrimary] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_EmployeeBankAccounts_User] ON [dbo].[EmployeeBankAccounts]([UserId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeContracts')
BEGIN
    CREATE TABLE [dbo].[EmployeeContracts] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [ContractNumber] NVARCHAR(50) NOT NULL,
        [ContractType] NVARCHAR(30) NOT NULL DEFAULT 'FixedTerm',
        [StartDate] DATETIME2 NOT NULL,
        [EndDate] DATETIME2 NULL,
        [Position] NVARCHAR(100) NULL,
        [BaseSalary] DECIMAL(18,2) NULL,
        [SalaryGrade] DECIMAL(8,2) NULL,
        [SalaryCoefficient] DECIMAL(8,4) NULL,
        [DocumentUrl] NVARCHAR(500) NULL,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_EmployeeContracts_User] ON [dbo].[EmployeeContracts]([UserId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmployeeInsuranceInfos')
BEGIN
    CREATE TABLE [dbo].[EmployeeInsuranceInfos] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL UNIQUE,
        [SocialInsuranceNumber] NVARCHAR(20) NULL,
        [SocialInsuranceStartDate] DATETIME2 NULL,
        [HealthInsuranceNumber] NVARCHAR(20) NULL,
        [HealthInsuranceStartDate] DATETIME2 NULL,
        [HealthInsuranceEndDate] DATETIME2 NULL,
        [HealthInsuranceFacilityCode] NVARCHAR(20) NULL,
        [MonthlyEmployeeContribution] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [MonthlyEmployerContribution] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
END
GO
