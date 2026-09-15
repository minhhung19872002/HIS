-- 195: Seed role PATIENT_APP_SERVICE — tài khoản dịch vụ của BFF app hỗ trợ người bệnh.
-- Trước đây BFF chạy bằng tài khoản `admin` (đọc/ghi toàn bộ HIS) trên một VM dùng chung nhiều dự án.
-- Role này KHÔNG nằm trong RoleMatrix (PermissionCatalogSeeder) nên KHÔNG được gán permission nào;
-- AuthService map RoleCode → role claim "PatientAppService" để qua được cửa /api/portal, và
-- ExternalActorScopeMiddleware nhốt nó trong đúng các route BFF gọi. User gắn role này tạo qua
-- màn quản trị người dùng — mật khẩu KHÔNG nằm trong repo. Idempotent (IF NOT EXISTS).
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'PATIENT_APP_SERVICE')
BEGIN
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'PATIENT_APP_SERVICE', N'Tài khoản dịch vụ app người bệnh',
            N'Chỉ dùng cho HIS.PatientApp.Api gọi HIS. Không cấp cho người dùng.', SYSUTCDATETIME(), 0);
END
