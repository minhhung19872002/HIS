-- 145_authz1_permission_issensitive.sql
-- AUTHZ-1 (#367): cột IsSensitive trên Permissions (quyền nhạy cảm — audit đậm hơn ở AUTHZ-5).
-- Idempotent: chạy lại mỗi startup an toàn. DB rỗng: EnsureCreated đã tạo từ model → guard tự SKIP.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Permissions' AND COLUMN_NAME='IsSensitive')
    ALTER TABLE Permissions ADD IsSensitive BIT NOT NULL DEFAULT 0;
