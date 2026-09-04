-- 169: phiếu HOÀN TRẢ phải nhớ nó hoàn cho cái gì (#218 / T3).
--
-- `CreateRefundDto` nhận `OriginalDepositId` / `OriginalPaymentId`, và `RefundDto` trả hai trường đó
-- về cho người gọi — nhưng chúng chưa bao giờ được LƯU: `Receipts` không có cột nào giữ chúng. Hệ
-- quả đo được ở evidence/cross/t3/t3_deposit_transitions.json: số dư khả dụng của phiếu tạm ứng
-- tính bằng `Amount - UsedAmount`, mà đường hoàn tiền không đụng vào `UsedAmount` ở bất kỳ bước nào
-- (kể cả lúc xác nhận CHI). Nên cùng một phiếu tạm ứng 1.000.000đ hoàn được nhiều lần: đo thực tế
-- chi ra **2.000.000đ**.
--
-- Có hai cột này thì (a) ràng buộc được tổng hoàn ≤ số dư, và (b) một phiếu hoàn truy ngược được về
-- nguồn của nó — trước đây chỉ có câu ghi chú tiếng Việt, máy không đọc được.
--
-- Idempotent: chỉ thêm cột nếu chưa có. Cột nullable nên dữ liệu cũ không cần vá.
IF COL_LENGTH('dbo.Receipts', 'OriginalDepositId') IS NULL
BEGIN
    ALTER TABLE Receipts ADD OriginalDepositId uniqueidentifier NULL;
END
GO

IF COL_LENGTH('dbo.Receipts', 'OriginalPaymentId') IS NULL
BEGIN
    ALTER TABLE Receipts ADD OriginalPaymentId uniqueidentifier NULL;
END
GO

-- Chỉ mục phục vụ đúng câu hỏi "phiếu tạm ứng này đã hoàn bao nhiêu rồi", chạy mỗi lần tạo phiếu
-- hoàn. Cố ý KHÔNG dùng filtered index (`WHERE ... IS NOT NULL`): loại đó đòi QUOTED_IDENTIFIER ON
-- lúc tạo, mà bộ chạy migration không đảm bảo điều đó — hỏng ở đây là hỏng lúc khởi động máy chủ.
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Receipts_OriginalDepositId')
   AND COL_LENGTH('dbo.Receipts', 'OriginalDepositId') IS NOT NULL
BEGIN
    CREATE INDEX IX_Receipts_OriginalDepositId ON Receipts(OriginalDepositId);
END
GO
