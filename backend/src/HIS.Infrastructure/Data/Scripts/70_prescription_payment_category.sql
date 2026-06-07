-- Heal drift: entity Prescription có PaymentCategory + DrugOrderType (đối tượng thanh toán
-- + loại y lệnh nội trú, dùng bởi G-07 toa về và kê y lệnh có cấu trúc) nhưng bảng thiếu cột
-- → 500 "Invalid column name" trên kê đơn / xem đơn / tạo hóa đơn (bắt bởi test_real_workflow).
-- Idempotent: COL_LENGTH guard. Default 0 = chưa phân loại (dữ liệu cũ).

SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Prescriptions','PaymentCategory') IS NULL
    ALTER TABLE dbo.Prescriptions ADD PaymentCategory INT NOT NULL CONSTRAINT DF_Prescriptions_PaymentCategory DEFAULT 0;
GO

IF COL_LENGTH('dbo.Prescriptions','DrugOrderType') IS NULL
    ALTER TABLE dbo.Prescriptions ADD DrugOrderType INT NOT NULL CONSTRAINT DF_Prescriptions_DrugOrderType DEFAULT 0;
GO
