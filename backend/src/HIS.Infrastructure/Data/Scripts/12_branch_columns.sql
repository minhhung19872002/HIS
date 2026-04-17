-- ============================================================
-- NangCap21: HIS Đám Mây 3 Cấp
-- Add BranchId columns to core entities for multi-facility support
-- ============================================================

-- 1. Patients: chi nhánh đăng ký bệnh nhân
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Patients' AND COLUMN_NAME = 'BranchId'
)
BEGIN
    ALTER TABLE [dbo].[Patients] ADD [BranchId] UNIQUEIDENTIFIER NULL;
    PRINT 'Added BranchId to Patients';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Patients_HospitalBranches_BranchId'
)
BEGIN
    ALTER TABLE [dbo].[Patients]
        ADD CONSTRAINT [FK_Patients_HospitalBranches_BranchId]
        FOREIGN KEY ([BranchId]) REFERENCES [dbo].[HospitalBranches]([Id]) ON DELETE SET NULL;
    PRINT 'Added FK_Patients_HospitalBranches_BranchId';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Patients_BranchId'
      AND object_id = OBJECT_ID('dbo.Patients')
)
BEGIN
    CREATE INDEX [IX_Patients_BranchId] ON [dbo].[Patients]([BranchId]);
    PRINT 'Added IX_Patients_BranchId';
END
GO

-- 2. QueueTickets: chi nhánh phiếu xếp hàng
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'QueueTickets' AND COLUMN_NAME = 'BranchId'
)
BEGIN
    ALTER TABLE [dbo].[QueueTickets] ADD [BranchId] UNIQUEIDENTIFIER NULL;
    PRINT 'Added BranchId to QueueTickets';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_QueueTickets_HospitalBranches_BranchId'
)
BEGIN
    ALTER TABLE [dbo].[QueueTickets]
        ADD CONSTRAINT [FK_QueueTickets_HospitalBranches_BranchId]
        FOREIGN KEY ([BranchId]) REFERENCES [dbo].[HospitalBranches]([Id]) ON DELETE SET NULL;
    PRINT 'Added FK_QueueTickets_HospitalBranches_BranchId';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_QueueTickets_BranchId'
      AND object_id = OBJECT_ID('dbo.QueueTickets')
)
BEGIN
    CREATE INDEX [IX_QueueTickets_BranchId] ON [dbo].[QueueTickets]([BranchId]);
    PRINT 'Added IX_QueueTickets_BranchId';
END
GO

-- 3. Departments: chi nhánh của khoa/phòng
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Departments' AND COLUMN_NAME = 'BranchId'
)
BEGIN
    ALTER TABLE [dbo].[Departments] ADD [BranchId] UNIQUEIDENTIFIER NULL;
    PRINT 'Added BranchId to Departments';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Departments_HospitalBranches_BranchId'
)
BEGIN
    ALTER TABLE [dbo].[Departments]
        ADD CONSTRAINT [FK_Departments_HospitalBranches_BranchId]
        FOREIGN KEY ([BranchId]) REFERENCES [dbo].[HospitalBranches]([Id]) ON DELETE SET NULL;
    PRINT 'Added FK_Departments_HospitalBranches_BranchId';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Departments_BranchId'
      AND object_id = OBJECT_ID('dbo.Departments')
)
BEGIN
    CREATE INDEX [IX_Departments_BranchId] ON [dbo].[Departments]([BranchId]);
    PRINT 'Added IX_Departments_BranchId';
END
GO

-- 4. Rooms: chi nhánh của phòng
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Rooms' AND COLUMN_NAME = 'BranchId'
)
BEGIN
    ALTER TABLE [dbo].[Rooms] ADD [BranchId] UNIQUEIDENTIFIER NULL;
    PRINT 'Added BranchId to Rooms';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Rooms_HospitalBranches_BranchId'
)
BEGIN
    ALTER TABLE [dbo].[Rooms]
        ADD CONSTRAINT [FK_Rooms_HospitalBranches_BranchId]
        FOREIGN KEY ([BranchId]) REFERENCES [dbo].[HospitalBranches]([Id]) ON DELETE SET NULL;
    PRINT 'Added FK_Rooms_HospitalBranches_BranchId';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Rooms_BranchId'
      AND object_id = OBJECT_ID('dbo.Rooms')
)
BEGIN
    CREATE INDEX [IX_Rooms_BranchId] ON [dbo].[Rooms]([BranchId]);
    PRINT 'Added IX_Rooms_BranchId';
END
GO

-- 5. MedicalStaffs: chi nhánh của nhân viên y tế
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'MedicalStaffs' AND COLUMN_NAME = 'BranchId'
)
BEGIN
    ALTER TABLE [dbo].[MedicalStaffs] ADD [BranchId] UNIQUEIDENTIFIER NULL;
    PRINT 'Added BranchId to MedicalStaffs';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_MedicalStaffs_HospitalBranches_BranchId'
)
BEGIN
    ALTER TABLE [dbo].[MedicalStaffs]
        ADD CONSTRAINT [FK_MedicalStaffs_HospitalBranches_BranchId]
        FOREIGN KEY ([BranchId]) REFERENCES [dbo].[HospitalBranches]([Id]) ON DELETE SET NULL;
    PRINT 'Added FK_MedicalStaffs_HospitalBranches_BranchId';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_MedicalStaffs_BranchId'
      AND object_id = OBJECT_ID('dbo.MedicalStaffs')
)
BEGIN
    CREATE INDEX [IX_MedicalStaffs_BranchId] ON [dbo].[MedicalStaffs]([BranchId]);
    PRINT 'Added IX_MedicalStaffs_BranchId';
END
GO

-- 6. Seed HospitalBranches (3-tier hierarchy: Tỉnh → Huyện → Trạm YT)
IF NOT EXISTS (SELECT 1 FROM [dbo].[HospitalBranches] WHERE [BranchCode] = 'TINH001')
BEGIN
    DECLARE @tinhId UNIQUEIDENTIFIER = NEWID();
    DECLARE @huyen1Id UNIQUEIDENTIFIER = NEWID();
    DECLARE @huyen2Id UNIQUEIDENTIFIER = NEWID();
    DECLARE @tram1Id UNIQUEIDENTIFIER = NEWID();
    DECLARE @tram2Id UNIQUEIDENTIFIER = NEWID();
    DECLARE @tram3Id UNIQUEIDENTIFIER = NEWID();

    -- Tỉnh (Headquarters)
    INSERT INTO [dbo].[HospitalBranches] ([Id], [BranchCode], [BranchName], [IsHeadquarters], [IsActive], [CreatedAt], [IsDeleted])
    VALUES (@tinhId, 'TINH001', N'Bệnh viện Đa khoa Tỉnh ABC', 1, 1, GETUTCDATE(), 0);

    -- Huyện 1
    INSERT INTO [dbo].[HospitalBranches] ([Id], [BranchCode], [BranchName], [ParentBranchId], [IsHeadquarters], [IsActive], [CreatedAt], [IsDeleted])
    VALUES (@huyen1Id, 'HUYEN01', N'Trung tâm Y tế Huyện X', @tinhId, 0, 1, GETUTCDATE(), 0);

    -- Huyện 2
    INSERT INTO [dbo].[HospitalBranches] ([Id], [BranchCode], [BranchName], [ParentBranchId], [IsHeadquarters], [IsActive], [CreatedAt], [IsDeleted])
    VALUES (@huyen2Id, 'HUYEN02', N'Trung tâm Y tế Huyện Y', @tinhId, 0, 1, GETUTCDATE(), 0);

    -- Trạm YT xã A (thuộc Huyện 1)
    INSERT INTO [dbo].[HospitalBranches] ([Id], [BranchCode], [BranchName], [ParentBranchId], [IsHeadquarters], [IsActive], [CreatedAt], [IsDeleted])
    VALUES (@tram1Id, 'TRAM001', N'Trạm Y tế Xã A', @huyen1Id, 0, 1, GETUTCDATE(), 0);

    -- Trạm YT xã B (thuộc Huyện 1)
    INSERT INTO [dbo].[HospitalBranches] ([Id], [BranchCode], [BranchName], [ParentBranchId], [IsHeadquarters], [IsActive], [CreatedAt], [IsDeleted])
    VALUES (@tram2Id, 'TRAM002', N'Trạm Y tế Xã B', @huyen1Id, 0, 1, GETUTCDATE(), 0);

    -- Trạm YT xã C (thuộc Huyện 2)
    INSERT INTO [dbo].[HospitalBranches] ([Id], [BranchCode], [BranchName], [ParentBranchId], [IsHeadquarters], [IsActive], [CreatedAt], [IsDeleted])
    VALUES (@tram3Id, 'TRAM003', N'Trạm Y tế Xã C', @huyen2Id, 0, 1, GETUTCDATE(), 0);

    PRINT 'Seeded 6 HospitalBranches (3-tier hierarchy)';
END
ELSE
BEGIN
    PRINT 'HospitalBranches already seeded';
END
GO

PRINT 'NangCap21 multi-facility tables created successfully';
