-- 214 (QA round 9, 2026-09-17): dọn mẫu rác do script quét tạo trước khi có kiểm tra tên (QA-R4, 16/09).
--
-- Chỉ đụng dòng CHẮC CHẮN là rác — đủ cả 3 điều kiện: tên trống, DepartmentId = GUID toàn số 0 (giao diện không
-- bao giờ gửi giá trị này), không có dòng thuốc/dịch vụ nào (kể cả dòng đã xóa). Mẫu như vậy không dùng được.
-- Xóa MỀM (IsDeleted = 1, IsActive = 0) để có thể khôi phục. Idempotent: chạy lại không đổi gì.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.PrescriptionTemplates', 'U') IS NOT NULL AND OBJECT_ID('dbo.PrescriptionTemplateItems', 'U') IS NOT NULL
BEGIN
    UPDATE t
       SET t.IsDeleted = 1,
           t.IsActive = 0,
           t.UpdatedAt = SYSUTCDATETIME(),
           t.UpdatedBy = N'migration-214'
      FROM dbo.PrescriptionTemplates t
     WHERE t.IsDeleted = 0
       AND LTRIM(RTRIM(ISNULL(t.TemplateName, N''))) = N''
       AND t.DepartmentId = '00000000-0000-0000-0000-000000000000'
       AND NOT EXISTS (SELECT 1 FROM dbo.PrescriptionTemplateItems i WHERE i.PrescriptionTemplateId = t.Id);
END
GO

IF OBJECT_ID('dbo.ServiceGroupTemplates', 'U') IS NOT NULL AND OBJECT_ID('dbo.ServiceGroupTemplateItems', 'U') IS NOT NULL
BEGIN
    UPDATE t
       SET t.IsDeleted = 1,
           t.IsActive = 0,
           t.UpdatedAt = SYSUTCDATETIME(),
           t.UpdatedBy = N'migration-214'
      FROM dbo.ServiceGroupTemplates t
     WHERE t.IsDeleted = 0
       AND LTRIM(RTRIM(ISNULL(t.TemplateName, N''))) = N''
       AND t.DepartmentId = '00000000-0000-0000-0000-000000000000'
       AND NOT EXISTS (SELECT 1 FROM dbo.ServiceGroupTemplateItems i WHERE i.ServiceGroupTemplateId = t.Id);
END
GO
