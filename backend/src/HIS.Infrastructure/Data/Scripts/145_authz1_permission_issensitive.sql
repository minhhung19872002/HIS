-- 145_authz1_permission_issensitive.sql
-- AUTHZ-1 (#367): cột IsSensitive + unique filtered index PermissionCode trên Permissions.
-- Idempotent: chạy lại mỗi startup an toàn. DB rỗng: EnsureCreated đã tạo từ model → guard tự SKIP.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Permissions' AND COLUMN_NAME='IsSensitive')
    ALTER TABLE Permissions ADD IsSensitive BIT NOT NULL DEFAULT 0;

-- Unique filtered index: PermissionCode phải duy nhất trong các hàng chưa bị xóa mềm.
-- Ngăn concurrent-startup duplicate (seeder upsert mỗi startup). FILTERED (IsDeleted=0) để
-- soft-deleted legacy row không va chạm với code mới cùng tên.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Permissions_PermissionCode' AND object_id = OBJECT_ID('Permissions'))
    CREATE UNIQUE INDEX IX_Permissions_PermissionCode ON Permissions (PermissionCode) WHERE IsDeleted = 0;
