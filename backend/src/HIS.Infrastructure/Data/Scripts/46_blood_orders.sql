-- T2 (tech-debt): BloodOrders + BloodOrderItems
-- BloodBankCompleteService dùng raw SQL (INSERT/SELECT/UPDATE) tới 2 bảng này nhưng KHÔNG có
-- entity/DbSet/script nào tạo → prod có do tạo tay, env mới/local sẽ vỡ ("Invalid object name 'BloodOrders'").
-- Idempotent: IF NOT EXISTS → trên prod (bảng đã có) là NO-OP, KHÔNG alter; chỉ tạo ở env chưa có.
-- Cột khớp đúng raw SQL trong BloodBankCompleteService (GetBloodOrders/GetBloodOrder/CreateBloodOrder).

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BloodOrders')
BEGIN
    CREATE TABLE BloodOrders (
        Id                uniqueidentifier NOT NULL CONSTRAINT PK_BloodOrders PRIMARY KEY,
        OrderCode         nvarchar(50)  NULL,
        OrderDate         datetime2     NOT NULL,
        PatientId         uniqueidentifier NOT NULL,
        PatientCode       nvarchar(50)  NULL,
        PatientName       nvarchar(200) NULL,
        PatientBloodType  nvarchar(10)  NULL,
        PatientRhFactor   nvarchar(10)  NULL,
        VisitId           uniqueidentifier NULL,
        DepartmentId      uniqueidentifier NULL,
        DepartmentName    nvarchar(200) NULL,
        OrderDoctorName   nvarchar(200) NULL,
        Diagnosis         nvarchar(max) NULL,
        ClinicalIndication nvarchar(max) NULL,
        Status            nvarchar(30)  NOT NULL CONSTRAINT DF_BloodOrders_Status DEFAULT 'Pending',
        CreatedAt         datetime2     NOT NULL CONSTRAINT DF_BloodOrders_CreatedAt DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_BloodOrders_OrderDate ON BloodOrders(OrderDate DESC);
    CREATE INDEX IX_BloodOrders_PatientId ON BloodOrders(PatientId);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BloodOrderItems')
BEGIN
    CREATE TABLE BloodOrderItems (
        Id                uniqueidentifier NOT NULL CONSTRAINT PK_BloodOrderItems PRIMARY KEY,
        OrderId           uniqueidentifier NOT NULL,
        ProductTypeId     uniqueidentifier NOT NULL,
        ProductTypeName   nvarchar(200) NULL,
        BloodType         nvarchar(10)  NULL,
        RhFactor          nvarchar(10)  NULL,
        OrderedQuantity   int           NOT NULL CONSTRAINT DF_BloodOrderItems_Ordered DEFAULT 0,
        IssuedQuantity    int           NOT NULL CONSTRAINT DF_BloodOrderItems_Issued DEFAULT 0,
        TransfusedQuantity int          NOT NULL CONSTRAINT DF_BloodOrderItems_Transfused DEFAULT 0,
        Status            nvarchar(30)  NOT NULL CONSTRAINT DF_BloodOrderItems_Status DEFAULT 'Pending',
        Note              nvarchar(max) NULL
    );
    CREATE INDEX IX_BloodOrderItems_OrderId ON BloodOrderItems(OrderId);
END;
GO
