-- 152: Seed role IMAGING_TECH (KTV Chẩn đoán hình ảnh) — AUTHZ #432.
-- RoleMatrix (PermissionCatalogSeeder) đã có entry IMAGING_TECH (Radiology.Read/Create + Patient.Read +
-- Report.Read) → role×permission tự gán mỗi startup sau khi role tồn tại. Idempotent (IF NOT EXISTS).
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'IMAGING_TECH')
BEGIN
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'IMAGING_TECH', N'KTV Chẩn đoán hình ảnh', N'Kỹ thuật viên chẩn đoán hình ảnh (RIS/PACS)', SYSUTCDATETIME(), 0);
END
