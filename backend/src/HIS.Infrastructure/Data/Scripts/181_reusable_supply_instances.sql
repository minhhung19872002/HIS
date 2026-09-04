-- 181: sổ theo dõi VẬT TƯ TÁI SỬ DỤNG có thật (#218 / T3).
--
-- Cả tính năng này trước đây được **bịa ra từ hash của Id**. Đường đọc `GetReusableSuppliesAsync`
-- không đọc bản ghi nào cả — nó lấy 30 dòng danh mục `MedicalSupplies` rồi sinh số:
--
--     int current  = (s.Id.GetHashCode() & 0x7fffffff) % max;              // số lần đã tái sử dụng
--     int stat     = idx % 10 switch { ... };                              // trạng thái theo VỊ TRÍ trong danh sách
--     var lastSter = today.AddDays(-((s.Id.GetHashCode() & 0xff) % 25 + 1)); // ngày tiệt khuẩn gần nhất
--
-- kèm chú thích thành thật: "Demo: synthesize a deterministic reusable-supply list from existing
-- MedicalSupplies catalog since there is no dedicated tracking table."
--
-- Màn hình này nói cho nhân viên kiểm soát nhiễm khuẩn biết **dụng cụ nào đã tiệt khuẩn, tiệt khuẩn
-- lúc nào, và đã tái sử dụng bao nhiêu lần**. Mọi con số trên đó đang là một phép băm. Hai cửa ghi
-- (`UpdateReusableSupplyStatusAsync`, `RecordSterilizationAsync`) cũng chỉ dội lại DTO, nên bấm
-- "đã tiệt khuẩn" xong mở lại vẫn thấy y nguyên con số cũ do hash sinh ra.
--
-- `SterilizationSchedules` sẵn có KHÔNG dùng được: nó theo dõi tiệt khuẩn **khu vực/phòng**
-- (AreaType, RoomId, CultureSampleCode) thuộc gói NangCap23, không phải từng dụng cụ.
--
-- Hai bảng:
--   * `ReusableSupplyInstances` — mỗi dòng là một hiện vật cụ thể đang lưu hành.
--   * `SterilizationLogs`       — mỗi lần tiệt khuẩn một hiện vật, giữ lại để truy vết ngược khi có
--                                 sự cố nhiễm khuẩn (cần biết dụng cụ ấy đã qua những mẻ nào).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReusableSupplyInstances')
BEGIN
    CREATE TABLE ReusableSupplyInstances (
        Id                   uniqueidentifier NOT NULL PRIMARY KEY,
        -- Mã hiện vật: hai cái kìm cùng loại là hai dòng khác nhau, đếm số lần dùng riêng.
        InstanceCode         nvarchar(50)     NOT NULL,
        SupplyId             uniqueidentifier NOT NULL,
        WarehouseId          uniqueidentifier NULL,
        -- 1 sẵn sàng · 2 đang sử dụng · 3 chờ tiệt khuẩn · 4 hết hạn dùng lại
        Status               int              NOT NULL DEFAULT 1,
        MaxReuseCount        int              NOT NULL DEFAULT 10,
        CurrentReuseCount    int              NOT NULL DEFAULT 0,
        LastSterilizationAt  datetime2        NULL,
        NextSterilizationDue datetime2        NULL,
        RetiredAt            datetime2        NULL,
        RetiredReason        nvarchar(500)    NULL,
        Note                 nvarchar(500)    NULL,
        CreatedAt            datetime2        NOT NULL,
        CreatedBy            nvarchar(100)    NULL,
        UpdatedAt            datetime2        NULL,
        UpdatedBy            nvarchar(100)    NULL,
        IsDeleted            bit              NOT NULL DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_ReusableSupplyInstances_Code')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'ReusableSupplyInstances')
BEGIN
    CREATE UNIQUE INDEX UX_ReusableSupplyInstances_Code
        ON ReusableSupplyInstances(InstanceCode) WHERE IsDeleted = 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SterilizationLogs')
BEGIN
    CREATE TABLE SterilizationLogs (
        Id                 uniqueidentifier NOT NULL PRIMARY KEY,
        InstanceId         uniqueidentifier NOT NULL,
        SterilizedAt       datetime2        NOT NULL,
        -- Số lần tái sử dụng SAU mẻ này. Chụp lại tại thời điểm ghi để về sau đối chiếu được, không
        -- phải đọc động từ hiện vật — cùng lý do với giấy nghỉ ốm chụp chẩn đoán ở migration 177.
        ReuseCountAfter    int              NOT NULL,
        Method             nvarchar(100)    NULL,
        PerformedById      uniqueidentifier NULL,
        Note               nvarchar(500)    NULL,
        CreatedAt          datetime2        NOT NULL,
        CreatedBy          nvarchar(100)    NULL,
        UpdatedAt          datetime2        NULL,
        UpdatedBy          nvarchar(100)    NULL,
        IsDeleted          bit              NOT NULL DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SterilizationLogs_InstanceId')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'SterilizationLogs')
BEGIN
    CREATE INDEX IX_SterilizationLogs_InstanceId ON SterilizationLogs(InstanceId, SterilizedAt);
END
GO
