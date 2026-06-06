-- NangCap23 Phase 2 hardening — chặn race condition trên SystemConfigs
-- Khi 2 admin (hoặc 2 Cloud Run instance) POST /config cùng ConfigKey trong 1ms,
-- không có constraint → DB lưu 2 row trùng → FirstOrDefault trả về kết quả non-deterministic.
-- Fix: filtered UNIQUE index trên ConfigKey (WHERE IsDeleted=0).
--
-- Bắt buộc ALTER COLUMN trước: nvarchar(max) không thể làm key column trong index.
--
-- FIX 2026-06-06: script này FAIL mỗi startup với Msg 1934 (QUOTED_IDENTIFIER).
-- Nguyên nhân thật: bảng đã có FILTERED INDEX (Step 3 ở lần chạy trước) → MỌI DML
-- (UPDATE ở Step 2) bắt buộc QUOTED_IDENTIFIER ON + ANSI_NULLS ON. `SET ... ON` ở đầu
-- file chỉ áp cho batch đầu; mỗi `GO` cắt batch nên Step 2/3 mất setting khi runner
-- chạy từng batch. → set lại các SET option Ở ĐẦU MỖI batch. Step 2 cũng đổi sang
-- UPDATE trực tiếp (bỏ `UPDATE r2 SET r2.col` alias-in-SET cho rõ ràng).

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Step 1: shrink ConfigKey từ nvarchar(max) → nvarchar(200) (idempotent)
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
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
-- QUOTED_IDENTIFIER/ANSI_NULLS ON: filtered index trên bảng yêu cầu khi UPDATE.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
WITH ranked AS (
    SELECT Id,
           ROW_NUMBER() OVER (PARTITION BY ConfigKey ORDER BY UpdatedAt DESC, CreatedAt DESC, Id DESC) AS rn
    FROM dbo.SystemConfigs
    WHERE IsDeleted = 0
)
UPDATE dbo.SystemConfigs
   SET IsDeleted = 1,
       UpdatedAt = SYSUTCDATETIME()
WHERE Id IN (SELECT Id FROM ranked WHERE rn > 1);
GO

-- Step 3: UNIQUE filtered index — chỉ áp cho row active (IsDeleted=0).
-- CREATE filtered index cũng yêu cầu QUOTED_IDENTIFIER ON.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
IF NOT EXISTS (SELECT 1 FROM sys.indexes
    WHERE name = 'UX_SystemConfigs_ConfigKey_Active'
      AND object_id = OBJECT_ID('dbo.SystemConfigs'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_SystemConfigs_ConfigKey_Active]
        ON [dbo].[SystemConfigs]([ConfigKey])
        WHERE [IsDeleted] = 0;
END;
GO
