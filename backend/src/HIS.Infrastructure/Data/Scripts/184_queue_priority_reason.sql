-- 184: lý do ưu tiên cho vé xếp hàng, phục vụ "lấy STT ưu tiên ngoại trú" qua app di động.
--
-- HSMT app mobile (docs/mobile/NangCapMobileApp.pdf, muc I.2 #3) yeu cau: "Ket noi voi HIS lay
-- STT uu tien ngoai tru". Khao sat (docs/features/patient-app/00-his-api-inventory.md §11.4 GAP 13,
-- 14) cho thay:
--   * QueueTicket DA CO cot Priority (0 Thuong / 1 Uu tien / 2 Cap cuu) va CallNextAsync da goi
--     dung thu tu uu tien.
--   * NHUNG loi vao cho di dong (IssueQueueTicketMobileAsync) hard-code Priority = 0, nen app
--     khong the xin so uu tien.
--   * Va khong co truong nao ghi LY DO uu tien.
--
-- Hai cot them vao:
--   * PriorityReason   — 1 Nguoi cao tuoi, 2 Tre em duoi 6 tuoi, 3 Phu nu co thai,
--                        4 Nguoi khuyet tat nang, 5 Nguoi co cong, 6 Cap cuu, 9 Khac.
--   * PriorityVerified — da doi chieu duoc bang du lieu trong HIS hay chua.
--
-- Vi sao can PriorityVerified: tuoi thi suy ra duoc tu ngay sinh trong ho so nen doi chieu duoc
-- ngay va dat = 1. Con "dang co thai" hay "khuyet tat nang" thi app khong tu kiem duoc, nen ve van
-- duoc cap so uu tien (khong thi tinh nang thanh vo nghia) NHUNG dat = 0 de quay le tan nhin thay
-- va xac minh luc goi. Neu cho ai khai gi cung duoc ma khong danh dau, nguoi uu tien THAT se bi
-- thiet vi ai cung khai uu tien.
--
-- Ve cu khong bi anh huong: PriorityReason NULL nghia la khong ghi nhan ly do, PriorityVerified
-- mac dinh 0.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.QueueTickets', 'PriorityReason') IS NULL
BEGIN
    ALTER TABLE QueueTickets ADD PriorityReason int NULL;
END
GO

IF COL_LENGTH('dbo.QueueTickets', 'PriorityVerified') IS NULL
BEGIN
    ALTER TABLE QueueTickets ADD PriorityVerified bit NOT NULL
        CONSTRAINT DF_QueueTickets_PriorityVerified DEFAULT 0;
END
GO

-- Ve uu tien da cap truoc khi co migration nay deu do nhan vien le tan tao truc tiep tren may
-- tram, tuc da qua mat nguoi that. Danh dau da xac minh de danh sach cho khong hien mot loat
-- canh bao "chua xac minh" cho nhung ve von khong co van de gi.
UPDATE QueueTickets
SET PriorityVerified = 1
WHERE Priority > 0 AND PriorityVerified = 0;
GO
