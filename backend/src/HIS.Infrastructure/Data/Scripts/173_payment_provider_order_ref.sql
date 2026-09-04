-- 173: lưu MÃ ĐƠN gửi cho nhà cung cấp thanh toán, để callback khớp CHÍNH XÁC (#218 / T3).
--
-- ZaloPay bắt buộc `app_trans_id` có dạng `yyMMdd_xxxxxx`, nên mã đơn gửi đi được ghép từ ngày cộng
-- **6 ký tự cuối** của `TxnRef`. Khi callback về, hệ thống tra ngược bằng `TxnRef.EndsWith(suffix)`.
--
-- Vấn đề: `TxnRef` = `HIS` + `yyyyMMddHHmmss` + 4 số ngẫu nhiên, nên 6 ký tự cuối chỉ là
-- **giây + số ngẫu nhiên** — phần ngày trong `app_trans_id` bị bỏ qua hoàn toàn. Hai giao dịch tạo
-- ở cùng giây-trong-phút với cùng số ngẫu nhiên sẽ đụng nhau dù cách nhau nhiều tháng, và
-- `FirstOrDefault` (không `ORDER BY`) chọn bừa một cái.
--
-- Đo được ở evidence/cross/t3/t3_payment_gateway.json: một callback mang ngày HÔM NAY đã xác nhận
-- một giao dịch **8 tháng tuổi** chỉ vì trùng 6 ký tự cuối. Không gian phân biệt chỉ có
-- 60 giây × 9.000 số ngẫu nhiên = 540.000 tổ hợp, nên đụng nhau là chuyện sớm muộn.
--
-- Cột này giữ nguyên văn mã đơn đã gửi cho nhà cung cấp, để callback tra khớp tuyệt đối thay vì
-- khớp đuôi. Idempotent, nullable nên dữ liệu cũ không cần vá.
IF COL_LENGTH('dbo.PaymentTransactions', 'ProviderOrderRef') IS NULL
BEGIN
    ALTER TABLE PaymentTransactions ADD ProviderOrderRef nvarchar(100) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PaymentTransactions_ProviderOrderRef')
   AND COL_LENGTH('dbo.PaymentTransactions', 'ProviderOrderRef') IS NOT NULL
BEGIN
    CREATE INDEX IX_PaymentTransactions_ProviderOrderRef
        ON PaymentTransactions(ProviderOrderRef);
END
GO
