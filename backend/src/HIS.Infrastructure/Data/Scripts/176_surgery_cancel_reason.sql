-- 176: ô riêng cho LÝ DO HỦY / TỪ CHỐI phiếu mổ, thôi ghi đè ghi chú lâm sàng (#218 / T3).
--
-- `RejectSurgeryAsync` và `CancelSurgeryAsync` đều làm đúng bốn dòng như nhau:
--
--     request.Status = 4;
--     request.Notes = reason;      -- ghi ĐÈ
--
-- `SurgeryRequests.Notes` là ghi chú lâm sàng của phiếu mổ: ghi lúc tạo phiếu từ `dto.Notes`, đọc
-- ra làm `Description` của phiếu. Hủy hoặc từ chối một ca mổ là xoá mất ghi chú ấy.
--
-- Cùng dạng với §27 (lý do hủy lượt khám ghi đè kết luận của bác sĩ), và cũng như ở đó, chính
-- entity này đã học bài một lần rồi — `Surgery.cs` dòng 48 ghi "Tường trình PTTT … tách khỏi
-- sentinel Notes (migration 78)".
--
-- Idempotent, nullable nên dữ liệu cũ không cần vá.
IF COL_LENGTH('dbo.SurgeryRequests', 'CancelReason') IS NULL
BEGIN
    ALTER TABLE SurgeryRequests ADD CancelReason nvarchar(1000) NULL;
END
GO
