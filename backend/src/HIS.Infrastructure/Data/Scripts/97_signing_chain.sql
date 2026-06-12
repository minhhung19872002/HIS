-- 97: Trình ký nhiều cấp từ EMR (plan-emr-signing-chain.md, 2026-06-12).
-- (1) SigningRequests thêm cột chain (additive, row cũ ChainId NULL = single-level behavior cũ).
-- (2) Seed EmrSigningOperations: chuỗi ký mặc định theo documentType (bảng đang rỗng — admin chỉnh sau).
-- (3) Seed EmrSignerCatalogs từ Users active (bác sĩ + admin) để picker có dữ liệu.
-- Idempotent toàn bộ.

-- (1) Cột chain
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SigningRequests') AND name = 'ChainId')
    ALTER TABLE SigningRequests ADD ChainId uniqueidentifier NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SigningRequests') AND name = 'StepOrder')
    ALTER TABLE SigningRequests ADD StepOrder int NOT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SigningRequests') AND name = 'TotalSteps')
    ALTER TABLE SigningRequests ADD TotalSteps int NOT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SigningRequests') AND name = 'MedicalRecordId')
    ALTER TABLE SigningRequests ADD MedicalRecordId uniqueidentifier NULL;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('SigningRequests') AND name = 'IX_SigningRequests_ChainId')
    CREATE INDEX IX_SigningRequests_ChainId ON SigningRequests(ChainId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('SigningRequests') AND name = 'IX_SigningRequests_Document')
    CREATE INDEX IX_SigningRequests_Document ON SigningRequests(DocumentType, DocumentId);

-- (2) Seed chuỗi ký mặc định theo documentType — chỉ khi bảng CHƯA có dòng nào (giữ config admin)
IF NOT EXISTS (SELECT * FROM EmrSigningOperations WHERE IsDeleted = 0)
BEGIN
    DECLARE @now datetime2 = GETUTCDATE();
    INSERT INTO EmrSigningOperations (Id, Code, Name, RoleId, RoleName, DocumentType, IsRequired, SortOrder, IsActive, CreatedAt, IsDeleted)
    SELECT NEWID(), c.Code, c.Name, r.Id, r.Name, c.DocumentType, 1, c.SortOrder, 1, @now, 0
    FROM (VALUES
        -- MS-01 Tóm tắt bệnh án ra viện
        ('SUM-BSDT', N'Bác sĩ điều trị ký tóm tắt BA',      'summary',         'BSDT', 1),
        ('SUM-TK',   N'Trưởng khoa duyệt tóm tắt BA',        'summary',         'TK',   2),
        ('SUM-GD',   N'Lãnh đạo duyệt tóm tắt BA',           'summary',         'GD',   3),
        -- Giấy ra viện
        ('DIS-BSDT', N'Bác sĩ điều trị ký giấy ra viện',     'discharge',       'BSDT', 1),
        ('DIS-TK',   N'Trưởng khoa duyệt giấy ra viện',      'discharge',       'TK',   2),
        ('DIS-GD',   N'Lãnh đạo duyệt giấy ra viện',         'discharge',       'GD',   3),
        -- Giấy chuyển viện
        ('REF-BSDT', N'Bác sĩ điều trị ký giấy chuyển viện', 'referral',        'BSDT', 1),
        ('REF-TK',   N'Trưởng khoa duyệt giấy chuyển viện',  'referral',        'TK',   2),
        ('REF-GD',   N'Lãnh đạo duyệt giấy chuyển viện',     'referral',        'GD',   3),
        -- GCN phẫu thuật (TT32)
        ('SC-BSDT',  N'Phẫu thuật viên ký GCN phẫu thuật',   'ls-surgery-cert', 'BSDT', 1),
        ('SC-TK',    N'Trưởng khoa duyệt GCN phẫu thuật',    'ls-surgery-cert', 'TK',   2),
        -- Biên bản hội chẩn
        ('CON-BSDT', N'Thư ký hội chẩn ký biên bản',         'consultation',    'BSDT', 1),
        ('CON-TK',   N'Chủ tọa (trưởng khoa) duyệt biên bản','consultation',    'TK',   2),
        -- Biên bản kiểm thảo tử vong
        ('DR-BSDT',  N'Bác sĩ điều trị ký kiểm thảo tử vong','deathreview',     'BSDT', 1),
        ('DR-TK',    N'Trưởng khoa duyệt kiểm thảo tử vong', 'deathreview',     'TK',   2),
        ('DR-GD',    N'Lãnh đạo duyệt kiểm thảo tử vong',    'deathreview',     'GD',   3)
    ) AS c(Code, Name, DocumentType, RoleCode, SortOrder)
    LEFT JOIN EmrSigningRoles r ON r.Code = c.RoleCode AND r.IsDeleted = 0;
END

-- (3) Seed danh mục người ký từ Users active — chỉ khi bảng CHƯA có dòng nào
IF NOT EXISTS (SELECT * FROM EmrSignerCatalogs WHERE IsDeleted = 0)
BEGIN
    INSERT INTO EmrSignerCatalogs (Id, UserId, UserName, FullName, Title, DepartmentId, DepartmentName, IsActive, CreatedAt, IsDeleted)
    SELECT NEWID(), u.Id, u.Username, u.FullName, u.Title, u.DepartmentId, d.DepartmentName, 1, GETUTCDATE(), 0
    FROM Users u
    LEFT JOIN Departments d ON d.Id = u.DepartmentId
    WHERE u.IsActive = 1 AND u.IsDeleted = 0
      AND (u.UserType = 1 OR u.UserType = 6
           OR EXISTS (SELECT 1 FROM UserRoles ur JOIN Roles ro ON ro.Id = ur.RoleId
                      WHERE ur.UserId = u.Id AND ro.RoleCode IN ('ADMIN', 'DOCTOR')));
END
