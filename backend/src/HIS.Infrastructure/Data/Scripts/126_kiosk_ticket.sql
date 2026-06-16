-- 126_kiosk_ticket.sql
-- Tạo bảng KioskTickets cho module self-service kiosk (Issues #103 #123 #124 #125).
-- BN tự cấp số qua màn hình kiosk bằng CCCD/thẻ BHYT, không cần login.
-- Idempotent: dùng OBJECT_ID / COL_LENGTH guard cho mọi thao tác.

-- ── Tạo bảng nếu chưa có ─────────────────────────────────────────────────────
IF OBJECT_ID('KioskTickets', 'U') IS NULL
BEGIN
    CREATE TABLE KioskTickets (
        Id               UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
        TicketNumber     NVARCHAR(20)      NOT NULL,
        SequenceNumber   INT               NOT NULL,
        IssueDate        DATE              NOT NULL,   -- ngày VN local (chỉ date, không time)
        CitizenId        NVARCHAR(20)      NULL,
        InsuranceCard    NVARCHAR(50)      NULL,
        PatientName      NVARCHAR(200)     NULL,
        DepartmentId     UNIQUEIDENTIFIER  NULL,
        RoomId           UNIQUEIDENTIFIER  NULL,
        ServiceType      NVARCHAR(30)      NULL,       -- OPD / LAB / IMAGING / PHARMACY
        Status           INT               NOT NULL DEFAULT 0,  -- 0=Chờ 1=Đã gọi 2=Hoàn tất 3=Hủy
        IssuedAt         DATETIME2         NOT NULL,   -- UTC timestamp
        CalledAt         DATETIME2         NULL,
        Note             NVARCHAR(500)     NULL,
        PatientId        UNIQUEIDENTIFIER  NULL,
        -- Audit (BaseEntity)
        CreatedAt        DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy        NVARCHAR(450)     NULL,
        UpdatedAt        DATETIME2         NULL,
        UpdatedBy        NVARCHAR(450)     NULL,
        IsDeleted        BIT               NOT NULL DEFAULT 0,
        CONSTRAINT PK_KioskTickets PRIMARY KEY (Id)
    );
    PRINT '126: Table KioskTickets created';
END
ELSE
BEGIN
    PRINT '126: Table KioskTickets already exists — skipped create';
END

-- ── Index IssuedAt + DepartmentId (query hàng chờ hôm nay theo khoa) ─────────
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('KioskTickets')
      AND name = 'IX_KioskTickets_IssuedAt_DepartmentId'
)
BEGIN
    CREATE INDEX IX_KioskTickets_IssuedAt_DepartmentId
        ON KioskTickets (IssuedAt, DepartmentId)
        INCLUDE (TicketNumber, SequenceNumber, Status, PatientName);
    PRINT '126: Index IX_KioskTickets_IssuedAt_DepartmentId created';
END
ELSE
BEGIN
    PRINT '126: Index IX_KioskTickets_IssuedAt_DepartmentId already exists — skipped';
END

-- ── Index IssueDate (reset số thứ tự theo ngày) ──────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('KioskTickets')
      AND name = 'IX_KioskTickets_IssueDate'
)
BEGIN
    CREATE INDEX IX_KioskTickets_IssueDate
        ON KioskTickets (IssueDate, DepartmentId, SequenceNumber);
    PRINT '126: Index IX_KioskTickets_IssueDate created';
END
ELSE
BEGIN
    PRINT '126: Index IX_KioskTickets_IssueDate already exists — skipped';
END

-- ── FK DepartmentId (nếu Departments tồn tại) ────────────────────────────────
IF OBJECT_ID('Departments', 'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM sys.foreign_keys
       WHERE name = 'FK_KioskTickets_Departments_DepartmentId'
   )
BEGIN
    ALTER TABLE KioskTickets
        ADD CONSTRAINT FK_KioskTickets_Departments_DepartmentId
        FOREIGN KEY (DepartmentId) REFERENCES Departments(Id);
    PRINT '126: FK_KioskTickets_Departments_DepartmentId created';
END

-- ── FK PatientId (nếu Patients tồn tại) ──────────────────────────────────────
IF OBJECT_ID('Patients', 'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM sys.foreign_keys
       WHERE name = 'FK_KioskTickets_Patients_PatientId'
   )
BEGIN
    ALTER TABLE KioskTickets
        ADD CONSTRAINT FK_KioskTickets_Patients_PatientId
        FOREIGN KEY (PatientId) REFERENCES Patients(Id);
    PRINT '126: FK_KioskTickets_Patients_PatientId created';
END
