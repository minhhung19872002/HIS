-- 174: ô riêng cho LÝ DO HỦY lượt khám, thôi ghi đè lên kết luận của bác sĩ (#218 / T3).
--
-- `CancelExaminationAsync` trước đây làm đúng hai dòng:
--
--     examination.Status = 5;                  -- Cancelled
--     examination.ConclusionNote = reason;     -- ghi ĐÈ
--
-- Mà `ConclusionNote` là **kết luận khám của bác sĩ**: `CompleteExaminationAsync` và
-- `UpdateConclusionAsync` đều ghi nó từ `dto.ConclusionNotes`, và `CdaDocumentService` lấy đúng ô
-- đó làm phần diễn biến lâm sàng cho tài liệu CDA gửi hồ sơ sức khỏe quốc gia. Nên hủy một lượt
-- khám đã có kết luận là xoá mất kết luận ấy, thay bằng câu "lý do hủy".
--
-- Đo được ở evidence/cross/t3/t3_examination_cancel_revert.json: kết luận 'KET-LUAN-CUA-BAC-SI'
-- bị thay bằng 'T3EXC ly do huy' chỉ sau một lần gọi.
--
-- Chính entity này đã học bài đó một lần rồi — ngay phía trên có dòng
-- `// Yêu cầu chuyển viện — lưu có cấu trúc thay vì gộp vào ConclusionNote`. Cột dưới đây làm đúng
-- như vậy cho lý do hủy. Idempotent, nullable nên dữ liệu cũ không cần vá.
IF COL_LENGTH('dbo.Examinations', 'CancelReason') IS NULL
BEGIN
    ALTER TABLE Examinations ADD CancelReason nvarchar(1000) NULL;
END
GO
