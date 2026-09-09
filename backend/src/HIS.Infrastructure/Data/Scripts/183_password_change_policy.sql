-- 183: buộc đổi mật khẩu lần đầu / khi hết hạn (#216 TC-PERM-015).
--
-- T1 đợt 2 ghi nhận: "CHƯA CÓ TÍNH NĂNG — không cột MustChangePassword/PasswordChangedAt trong
-- Users, không file backend nào nhắc tới". User chốt: làm.
--
-- Hai cột:
--   * MustChangePassword — cờ đặt khi admin tạo user / reset mật khẩu / đặt hộ mật khẩu (tức mật
--     khẩu hiện tại là thứ NGƯỜI KHÁC biết). Xoá khi chính user đổi xong.
--   * PasswordChangedAt  — mốc để tính hết hạn theo Auth:PasswordMaxAgeDays.
--
-- BACKFILL CÓ CHỦ ĐÍCH: user đang có sẵn nhận PasswordChangedAt = lúc chạy migration và
-- MustChangePassword = 0. Nghĩa là đồng hồ hết hạn bắt đầu chạy từ ngày deploy, KHÔNG ai bị buộc
-- đổi ngay khi lên bản mới. Để NULL thì mọi tài khoản đang dùng thật sẽ bị chặn sáng hôm sau —
-- một thay đổi hành vi không ai đồng ý.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.Users', 'MustChangePassword') IS NULL
BEGIN
    ALTER TABLE Users ADD MustChangePassword bit NOT NULL CONSTRAINT DF_Users_MustChangePassword DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Users', 'PasswordChangedAt') IS NULL
BEGIN
    ALTER TABLE Users ADD PasswordChangedAt datetime2 NULL;
END
GO

-- Chỉ điền cho dòng còn trống: chạy lại migration không được đẩy mốc của ai về hiện tại.
UPDATE Users SET PasswordChangedAt = GETUTCDATE() WHERE PasswordChangedAt IS NULL;
GO
