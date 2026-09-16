-- 209_patient_photo_content.sql
-- QA round 4 (2026-09-16): lưu chính nội dung ảnh tiếp đón vào CSDL.
--
-- Trước đây ảnh được ghi vào thư mục wwwroot/photos bên trong container. Ba vấn đề cùng lúc:
-- Dockerfile cố ý KHÔNG đưa wwwroot vào ảnh, lệnh chạy container không gắn volume nào, và
-- Program.cs chỉ phục vụ tĩnh thư mục clientapp. Kết quả: ảnh ghi ra một chỗ không ai đọc được
-- và biến mất sau mỗi lần deploy. Ảnh CCCD/chân dung tiếp đón chỉ vài trăm KB nên lưu thẳng
-- trong bảng là đủ và bền vững, không cần thêm hạ tầng.
-- Idempotent: chỉ thêm cột khi chưa có.

IF COL_LENGTH(N'dbo.PatientPhotos', N'Content') IS NULL
BEGIN
    ALTER TABLE dbo.PatientPhotos ADD Content VARBINARY(MAX) NULL;
END
