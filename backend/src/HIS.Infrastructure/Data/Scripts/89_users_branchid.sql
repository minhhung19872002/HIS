-- ============================================================
-- R3 Tier 1 (multi-facility): Users.BranchId + one-time backfill
-- - Users.BranchId NULL = toàn viện (Admin/HQ), không giới hạn.
-- - Backfill chạy MỘT LẦN (guard theo "chưa có row nào có branch")
--   để re-run startup không re-stamp dữ liệu NULL về sau.
-- ============================================================

-- 1. Users.BranchId (nullable, FK, index) — pattern y hệt 12_branch_columns.sql
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'BranchId'
)
BEGIN
    ALTER TABLE [dbo].[Users] ADD [BranchId] UNIQUEIDENTIFIER NULL;
    PRINT 'Added BranchId to Users';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Users_HospitalBranches_BranchId'
)
BEGIN
    ALTER TABLE [dbo].[Users]
        ADD CONSTRAINT [FK_Users_HospitalBranches_BranchId]
        FOREIGN KEY ([BranchId]) REFERENCES [dbo].[HospitalBranches]([Id]) ON DELETE SET NULL;
    PRINT 'Added FK_Users_HospitalBranches_BranchId';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Users_BranchId'
      AND object_id = OBJECT_ID('dbo.Users')
)
BEGIN
    CREATE INDEX [IX_Users_BranchId] ON [dbo].[Users]([BranchId]);
    PRINT 'Added IX_Users_BranchId';
END
GO

-- 2. One-time backfill Users.BranchId từ Department.BranchId
--    (chỉ khi CHƯA user nào có branch — tránh re-stamp khi admin đã chỉnh tay)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [BranchId] IS NOT NULL)
BEGIN
    UPDATE u SET u.[BranchId] = d.[BranchId]
    FROM [dbo].[Users] u
    INNER JOIN [dbo].[Departments] d ON d.[Id] = u.[DepartmentId]
    WHERE u.[BranchId] IS NULL AND d.[BranchId] IS NOT NULL;
    PRINT 'Backfilled Users.BranchId from Departments.BranchId';
END
GO

-- 3. One-time backfill Patients/QueueTickets cũ (BranchId NULL toàn bộ từ NangCap21)
--    về chi nhánh HQ (IsHeadquarters=1) — chỉ chạy khi chưa row nào có branch.
IF NOT EXISTS (SELECT 1 FROM [dbo].[Patients] WHERE [BranchId] IS NOT NULL)
BEGIN
    DECLARE @hqId UNIQUEIDENTIFIER =
        (SELECT TOP 1 [Id] FROM [dbo].[HospitalBranches]
         WHERE [IsHeadquarters] = 1 AND [IsActive] = 1 AND [IsDeleted] = 0
         ORDER BY [CreatedAt]);
    IF @hqId IS NOT NULL
    BEGIN
        UPDATE [dbo].[Patients] SET [BranchId] = @hqId WHERE [BranchId] IS NULL;
        UPDATE [dbo].[QueueTickets] SET [BranchId] = @hqId WHERE [BranchId] IS NULL;
        PRINT 'Backfilled Patients/QueueTickets.BranchId to HQ branch';
    END
    ELSE
        PRINT 'No HQ branch found - skip Patients/QueueTickets backfill';
END
GO

PRINT 'R3 Tier 1: Users.BranchId migration completed';
