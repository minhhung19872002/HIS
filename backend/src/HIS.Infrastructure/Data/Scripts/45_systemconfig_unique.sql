-- NangCap23 Phase 2 hardening — chặn race condition trên SystemConfigs
-- Khi 2 admin (hoặc 2 Cloud Run instance) POST /config cùng ConfigKey trong 1ms,
-- không có constraint → DB lưu 2 row trùng → FirstOrDefault trả về kết quả non-deterministic.
-- Fix: filtered UNIQUE index trên ConfigKey (WHERE IsDeleted=0).
--
-- Bắt buộc ALTER COLUMN trước: nvarchar(max) không thể làm key column trong index.

SET QUOTED_IDENTIFIER ON;
GO

-- Step 1: shrink ConfigKey từ nvarchar(max) → nvarchar(200) (idempotent)
IF EXISTS (SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.SystemConfigs')
      AND name = 'ConfigKey' AND max_length = -1)
BEGIN
    ALTER TABLE [dbo].[SystemConfigs]
        ALTER COLUMN [ConfigKey] NVARCHAR(200) NOT NULL;
END;
GO

-- Step 2: dọn dẹp duplicate hiện có (nếu có) — giữ row mới nhất per ConfigKey,
-- soft-delete các bản cũ trùng. Bắt buộc trước khi tạo unique index.
WITH ranked AS (
    SELECT Id, ConfigKey,
           ROW_NUMBER() OVER (PARTITION BY ConfigKey ORDER BY UpdatedAt DESC, CreatedAt DESC, Id DESC) AS rn
    FROM dbo.SystemConfigs
    WHERE IsDeleted = 0
)
UPDATE r2
   SET r2.IsDeleted = 1,
       r2.UpdatedAt = SYSUTCDATETIME()
FROM ranked r
JOIN dbo.SystemConfigs r2 ON r2.Id = r.Id
WHERE r.rn > 1;
GO

-- Step 3: UNIQUE filtered index — chỉ áp cho row active (IsDeleted=0)
IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'UX_SystemConfigs_ConfigKey_Active'
      AND object_id = OBJECT_ID('dbo.SystemConfigs'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_SystemConfigs_ConfigKey_Active]
        ON [dbo].[SystemConfigs]([ConfigKey])
        WHERE [IsDeleted] = 0;
END;
GO
