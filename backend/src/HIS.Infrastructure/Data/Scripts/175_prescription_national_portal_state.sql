-- 175: ô riêng cho trạng thái GỬI CỔNG ĐƠN THUỐC QUỐC GIA (#218 / T3).
--
-- `Prescriptions.Status` là trạng thái DUYỆT VÀ CẤP PHÁT THUỐC, ghi rõ trên entity:
--     0-Chờ duyệt · 1-Đã duyệt · 2-Đã cấp phát · 3-Hoàn trả · 4-Hủy
--
-- `NationalPrescriptionService` lại dùng đúng ô đó để ghi trạng thái gửi lên Cổng ĐTQG:
--     SubmitAsync → Status = 1 · RetrySubmissionAsync → Status = 1 · CancelSubmissionAsync → Status = 4
--
-- Đo được ở evidence/cross/t3/t3_national_prescription.json (0/3):
--   * gửi một đơn `0 Chờ duyệt` lên cổng ⇒ thành `1 Đã duyệt`, BỎ QUA bước duyệt của dược sĩ;
--   * gửi lại một đơn `2 Đã cấp phát` ⇒ kéo lùi về `1 Đã duyệt`, thuốc đã ra khỏi quầy mà hệ thống
--     lại bảo chưa phát;
--   * bấm "hủy GỬI lên cổng" ⇒ `Status = 4` = **Hủy**, tức voiding luôn đơn thuốc của bệnh nhân.
--
-- Ba cột dưới đây tách hẳn trạng thái gửi ra khỏi trạng thái cấp phát.
-- NationalPortalStatus: NULL/0 = chưa gửi · 1 = đã gửi · 2 = gửi lỗi · 3 = đã hủy gửi.
-- Idempotent, nullable nên dữ liệu cũ không cần vá.
IF COL_LENGTH('dbo.Prescriptions', 'NationalPortalStatus') IS NULL
BEGIN
    ALTER TABLE Prescriptions ADD NationalPortalStatus int NULL;
END
GO

IF COL_LENGTH('dbo.Prescriptions', 'NationalPortalTransactionId') IS NULL
BEGIN
    ALTER TABLE Prescriptions ADD NationalPortalTransactionId nvarchar(100) NULL;
END
GO

IF COL_LENGTH('dbo.Prescriptions', 'NationalPortalSubmittedAt') IS NULL
BEGIN
    ALTER TABLE Prescriptions ADD NationalPortalSubmittedAt datetime2 NULL;
END
GO
