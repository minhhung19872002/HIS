-- 171: ba bảng của ngân hàng máu chưa từng có script tạo (#218 / T3).
--
-- `BloodBagAssignments`, `BloodIssueReceipts`, `BloodIssueItems` được `BloodBankCompleteService`
-- đọc/ghi bằng SQL trần, nhưng KHÔNG có entity, KHÔNG có DbSet, và KHÔNG có script nào trong repo
-- tạo ra chúng. Chúng tồn tại ở máy dev và trên prod vì có người tạo tay — đúng kiểu vấn đề mà
-- `46_blood_orders.sql` đã ghi lại ở phần đầu của nó cho một cặp bảng khác.
--
-- Hệ quả: dựng một môi trường mới (máy lập trình viên mới, môi trường kiểm thử, khôi phục thảm hoạ)
-- thì mọi đường gán túi máu, xuất máu và truyền máu đều hỏng ngay với "Invalid object name".
--
-- Script này chép ĐÚNG hình dạng đang chạy ở máy dev và prod, không siết thêm ràng buộc: mục tiêu
-- là để môi trường mới dựng lên giống hệt môi trường hiện có, chứ không phải sửa thiết kế. Riêng
-- khoá chính được đặt TÊN tường minh (bản tạo tay đang mang tên tự sinh `PK__BloodBag__...`) và
-- thêm chỉ mục cho đúng các cột mà mã nguồn tra cứu.
--
-- Idempotent: chỉ tạo nếu chưa có, nên chạy trên máy đang có bảng là không làm gì.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BloodBagAssignments')
BEGIN
    CREATE TABLE BloodBagAssignments (
        Id                   uniqueidentifier NOT NULL CONSTRAINT PK_BloodBagAssignments PRIMARY KEY,
        OrderItemId          uniqueidentifier NULL,
        BloodBagId           uniqueidentifier NULL,
        BagCode              nvarchar(100)    NULL,
        BloodType            nvarchar(10)     NULL,
        RhFactor             nvarchar(20)     NULL,
        Volume               decimal(10,2)    NULL,
        ExpiryDate           datetime2        NULL,
        CrossMatchResult     nvarchar(200)    NULL,
        CrossMatchDate       datetime2        NULL,
        TransfusionStatus    nvarchar(50)     NULL,
        TransfusionStartTime datetime2        NULL,
        TransfusionEndTime   datetime2        NULL,
        TransfusionNote      nvarchar(max)    NULL
    );
    -- Mọi thao tác truyền máu đều tra theo đúng cặp này.
    CREATE INDEX IX_BloodBagAssignments_OrderItem_Bag
        ON BloodBagAssignments(OrderItemId, BloodBagId);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BloodIssueReceipts')
BEGIN
    CREATE TABLE BloodIssueReceipts (
        Id           uniqueidentifier NOT NULL CONSTRAINT PK_BloodIssueReceipts PRIMARY KEY,
        ReceiptCode  nvarchar(100)    NULL,
        IssueDate    datetime2        NULL,
        DepartmentId uniqueidentifier NULL,
        RequestedBy  nvarchar(200)    NULL,
        IssuedBy     nvarchar(200)    NULL,
        Status       nvarchar(50)     NULL,
        TotalBags    int              NULL,
        Note         nvarchar(max)    NULL,
        CreatedAt    datetime2        NULL
    );
    CREATE INDEX IX_BloodIssueReceipts_IssueDate ON BloodIssueReceipts(IssueDate);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BloodIssueItems')
BEGIN
    CREATE TABLE BloodIssueItems (
        Id              uniqueidentifier NOT NULL CONSTRAINT PK_BloodIssueItems PRIMARY KEY,
        ReceiptId       uniqueidentifier NULL,
        BloodBagId      uniqueidentifier NULL,
        BagCode         nvarchar(100)    NULL,
        BloodType       nvarchar(10)     NULL,
        RhFactor        nvarchar(20)     NULL,
        ProductTypeName nvarchar(200)    NULL,
        Volume          decimal(10,2)    NULL,
        ExpiryDate      datetime2        NULL,
        PatientId       uniqueidentifier NULL,
        PatientCode     nvarchar(50)     NULL,
        PatientName     nvarchar(200)    NULL
    );
    CREATE INDEX IX_BloodIssueItems_ReceiptId ON BloodIssueItems(ReceiptId);
    -- Bộ gác "xuất lại chính túi vừa xuất" (#218) tra theo cột này ở mỗi lần xuất máu.
    CREATE INDEX IX_BloodIssueItems_BloodBagId ON BloodIssueItems(BloodBagId);
END
GO
