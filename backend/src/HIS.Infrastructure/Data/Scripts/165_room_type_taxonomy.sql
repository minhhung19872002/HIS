-- Chuẩn hoá bảng mã Rooms.RoomType + vá dữ liệu phòng bị phân loại sai.
--
-- Bối cảnh (đo trên prod AWS 2026-08-17, test bằng Chrome như người dùng thật):
-- cùng một cột `Rooms.RoomType` đang mang BA ý nghĩa khác nhau ở ba module:
--   * HIS.Core/Entities/Department.cs   : 1-Phòng khám, 2-Phòng bệnh, 3-Phòng mổ, 4-Phòng XN
--   * Services/Surgery/SurgeryWaitingServiceImpl.cs : 1-Mổ lớn, 2-Mổ nhỏ, 3-Mổ cấp cứu, 4-Mổ CK
--   * Services/RIS/RISCompleteService.cs           : 10-XRay, 11-CT, 12-MRI, 13-SA, 14-NS, 15-ECG
-- và hai chỗ dùng thêm nghĩa riêng: Reception/Registration.cs coi 3 = phòng CẤP CỨU,
-- coi 5 = phòng KHÁM SỨC KHOẺ.
--
-- Hệ quả quan sát được trên dữ liệu prod TRƯỚC khi vá:
--   * Đăng ký cấp cứu tìm `RoomType == 3` → phòng duy nhất có type 3 là "Phòng VIP 103"
--     (mã NT103 — vốn là phòng bệnh nội trú) ⇒ bệnh nhân cấp cứu bị đẩy vào phòng VIP.
--   * "Quầy tiếp đón 1/2" (TD_01, TD_02) mang type 1 = phòng khám ⇒ bệnh nhân bị xếp
--     "Chờ khám" ngay tại quầy lễ tân, và quầy lọt vào danh sách phòng khám khả dụng.
--   * Không tồn tại phòng nào có type 5 ⇒ đăng ký khám sức khoẻ luôn không có phòng.
--   * Không tồn tại phòng cấp cứu và phòng mổ thật nào.
--
-- BẢNG MÃ CHUẨN kể từ script này (đồng bộ với comment trong Department.cs):
--   1  Phòng khám            2  Phòng bệnh (nội trú)     3  Phòng mổ
--   4  Phòng CLS/xét nghiệm  5  Phòng khám sức khoẻ      6  Phòng cấp cứu
--   7  Quầy tiếp đón        10-15  Phòng CĐHA chuyên biệt (XRay/CT/MRI/SA/NS/ECG)
--
-- ★ GIẢ ĐỊNH: hệ thống đang phục vụ DEMO dự thầu, chưa triển khai cho bệnh viện cụ thể
--   nên chưa có quy ước mã phòng nào của khách hàng để tuân theo. Khi ký được hợp đồng,
--   nếu bệnh viện có bảng mã riêng thì sửa lại bảng mã tại đây + Department.cs + các chỗ
--   tra cứu theo hằng số (Registration.cs), KHÔNG rải thêm nghĩa mới cho cột này.
--
-- Idempotent: an toàn cho ProductionSchemaRepairRunner chạy lại mỗi lần khởi động.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.Rooms', 'U') IS NULL
    RETURN;
GO

-- (1) Quầy tiếp đón KHÔNG phải phòng khám → tách sang mã riêng 7.
UPDATE dbo.Rooms
   SET RoomType = 7, UpdatedAt = SYSUTCDATETIME()
 WHERE RoomCode IN ('TD_01', 'TD_02')
   AND RoomType <> 7;
GO

-- (2) "Phòng VIP 103" mã NT103 là phòng bệnh nội trú (tiền tố NT), không phải phòng mổ
--     cũng không phải phòng cấp cứu → trả về đúng nhóm phòng bệnh.
UPDATE dbo.Rooms
   SET RoomType = 2, UpdatedAt = SYSUTCDATETIME()
 WHERE RoomCode = 'NT103'
   AND RoomType <> 2;
GO

-- (3) Phòng CĐHA về đúng dải mã chuyên biệt 10-15. Trước đây cả ba mang type 4 (CLS chung)
--     nên màn danh mục phòng của RIS (lọc RoomType 10..19) KHÔNG hiện phòng nào.
--     An toàn vì RoomTypes.ForServiceType(3|4) chấp nhận CẢ type 4 LẪN dải 10-19, nên việc
--     chuyển mã không làm hỏng khâu tự chọn phòng thực hiện cho chỉ định CĐHA/TDCN.
UPDATE dbo.Rooms SET RoomType = 10, UpdatedAt = SYSUTCDATETIME()
 WHERE RoomCode = 'PCDHA_XQUANG' AND RoomType <> 10;   -- X-Quang
UPDATE dbo.Rooms SET RoomType = 11, UpdatedAt = SYSUTCDATETIME()
 WHERE RoomCode = 'PCDHA_CT'     AND RoomType <> 11;   -- CT Scanner
UPDATE dbo.Rooms SET RoomType = 13, UpdatedAt = SYSUTCDATETIME()
 WHERE RoomCode = 'PCDHA_SA'     AND RoomType <> 13;   -- Siêu âm
-- PXN_01 "Phòng lấy mẫu" GIỮ type 4: đó là phòng lấy mẫu xét nghiệm, không phải phòng CĐHA.
GO

-- (4) Bổ sung phòng cấp cứu + phòng khám sức khoẻ nếu chưa có, để hai luồng đăng ký
--     tương ứng trong ReceptionCompleteService.Registration không rơi vào nhánh fallback
--     "lấy đại một phòng đang hoạt động".
DECLARE @deptId UNIQUEIDENTIFIER = (
    SELECT TOP 1 Id FROM dbo.Departments
     WHERE IsActive = 1 AND (IsDeleted = 0 OR IsDeleted IS NULL)
     ORDER BY CASE WHEN DepartmentName LIKE N'%Khám bệnh%' THEN 0 ELSE 1 END, DepartmentName
);

IF @deptId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE RoomCode = 'PCC_01')
        INSERT INTO dbo.Rooms
            (Id, RoomCode, RoomName, RoomType, MaxPatients, MaxInsurancePatients,
             IsActive, DisplayOrder, DepartmentId, CreatedAt, IsDeleted)
        VALUES
            (NEWID(), 'PCC_01', N'Phòng Cấp cứu', 6, 20, 20,
             1, 90, @deptId, SYSUTCDATETIME(), 0);

    IF NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE RoomCode = 'PKSK_01')
        INSERT INTO dbo.Rooms
            (Id, RoomCode, RoomName, RoomType, MaxPatients, MaxInsurancePatients,
             IsActive, DisplayOrder, DepartmentId, CreatedAt, IsDeleted)
        VALUES
            (NEWID(), 'PKSK_01', N'Phòng Khám sức khoẻ', 5, 30, 0,
             1, 91, @deptId, SYSUTCDATETIME(), 0);
END
GO
