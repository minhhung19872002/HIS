-- 151: Dedup legacy UPPER-CASE permission codes (AUTHZ #432).
-- Canonical catalog = PascalCase `Resource.Action` (PermissionCatalog.cs). Bộ mã all-caps cũ
-- (PATIENT.VIEW, BILLING.COLLECT, SYSTEM.CONFIG, ...) do DatabaseSeeder cũ seed, KHÔNG endpoint BE
-- nào dùng ([RequirePermission] đều PascalCase — đã verify), gây trùng casing trong /me/permissions.
-- Xoá chúng + role-link. Idempotent (DELETE = no-op nếu đã hết).
-- COLLATE case-sensitive: chỉ khớp mã all-caps (Patient.Read <> PATIENT.READ) → KHÔNG đụng PascalCase.

DELETE rp
FROM RolePermissions rp
INNER JOIN Permissions p ON rp.PermissionId = p.Id
WHERE p.PermissionCode COLLATE Latin1_General_CS_AS = UPPER(p.PermissionCode) COLLATE Latin1_General_CS_AS
  AND p.PermissionCode LIKE '%.%';

DELETE FROM Permissions
WHERE PermissionCode COLLATE Latin1_General_CS_AS = UPPER(PermissionCode) COLLATE Latin1_General_CS_AS
  AND PermissionCode LIKE '%.%';
