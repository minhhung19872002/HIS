-- AUTHZ-5 (#371): AuditLogs bất biến — index composite + trigger chặn UPDATE/DELETE.
-- ADDITIVE — không đổi schema hiện tại, chỉ thêm index và trigger mới.
-- Idempotent (IF NOT EXISTS / IF OBJECT_ID cho mọi object).
--
-- Mục đích bảo mật:
--   - Audit log KHÔNG được sửa/xóa bởi app thông thường (TT 54/2017, NĐ 13/2023).
--   - Trigger chặn mọi UPDATE trực tiếp (không bao giờ cần cập nhật audit log đã ghi).
--   - Trigger chặn DELETE, TRỪ KHI caller đặt CONTEXT_INFO = 0x52455445 ('RETE') trước khi xóa.
--     Pattern này dành cho retention/archive job tương lai (AUTHZ-5 retention phase).
--
-- Index bổ sung:
--   - IX_AuditLogs_EntityType_EntityId_Timestamp: tra cứu lịch sử entity + lọc theo thời gian
--     (bảng audit phổ biến query: "tất cả sự kiện trên BN/HSB X trong khoảng ngày Y-Z").
--     Index hiện có IX_AuditLogs_EntityType_EntityId thiếu Timestamp → không cover RANGE scan tốt.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ===== 1. Index composite (EntityType, EntityId, Timestamp DESC) =====
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_AuditLogs_EntityType_EntityId_Timestamp'
      AND object_id = OBJECT_ID('dbo.AuditLogs')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_AuditLogs_EntityType_EntityId_Timestamp
        ON dbo.AuditLogs (EntityType, EntityId, [Timestamp] DESC)
        INCLUDE (Action, UserId, Module);
    PRINT 'Created IX_AuditLogs_EntityType_EntityId_Timestamp';
END
GO

-- ===== 2. Trigger chặn UPDATE =====
-- AuditLogs không bao giờ cần cập nhật — mọi UPDATE đều là vi phạm bất biến.
IF OBJECT_ID('dbo.trg_AuditLogs_NoUpdate', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_AuditLogs_NoUpdate;
GO

CREATE TRIGGER dbo.trg_AuditLogs_NoUpdate
ON dbo.AuditLogs
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    RAISERROR(
        N'AuditLogs is append-only: UPDATE is not permitted (immutability requirement per TT 54/2017). '
        N'Contact the DBA to perform authorized schema maintenance.',
        16, 1
    );
    ROLLBACK TRANSACTION;
END
GO

-- ===== 3. Trigger chặn DELETE (cho phép retention job qua CONTEXT_INFO) =====
-- Retention/archive job PHẢI đặt CONTEXT_INFO = 0x52455445 ('RETE') trước câu DELETE:
--   SET CONTEXT_INFO 0x52455445000000000000000000000000  -- 128 bytes, đầu 4 = 'RETE'
--   DELETE FROM dbo.AuditLogs WHERE ... (điều kiện retention)
--   SET CONTEXT_INFO 0x00000000000000000000000000000000  -- reset về 0
-- Nếu KHÔNG đặt cờ này, DELETE bị từ chối và transaction bị rollback.
IF OBJECT_ID('dbo.trg_AuditLogs_NoDelete', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_AuditLogs_NoDelete;
GO

CREATE TRIGGER dbo.trg_AuditLogs_NoDelete
ON dbo.AuditLogs
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    -- 4 byte đầu CONTEXT_INFO = 0x52455445 ('RETE') → authorized retention job → cho phép.
    DECLARE @ctx VARBINARY(128) = CONTEXT_INFO();
    IF @ctx IS NULL OR LEFT(@ctx, 4) <> 0x52455445
    BEGIN
        RAISERROR(
            N'AuditLogs is append-only: DELETE is not permitted. '
            N'Authorized retention job must SET CONTEXT_INFO 0x52455445... before DELETE.',
            16, 1
        );
        ROLLBACK TRANSACTION;
    END
END
GO
