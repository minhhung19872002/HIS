-- 187: so thu tu GIU SAN cho lich hen (dat lich tren app co STT ngay, khong doi den noi moi boc so).
--
-- Quyet dinh nghiep vu (user, 2026-09-11):
--   * Nguoi dat lich duoc cap so THU TU NGAY LUC DAT, va la so som nhat trong ngay.
--   * Den ngay kham ho TU DONG vao hang doi tu dau ngay, khong phai check-in tai quay.
--
-- Cach danh so: MOT day so dung chung cho moi (phong, ngay, loai hang doi) — xem
-- AppointmentQueueAllocator. So ke tiep = MAX(so da giu trong Appointments, so ve da cap trong
-- QueueTickets) + 1. Nho vay khach boc so tai quay hom do nhan so tiep sau, khong bao gio trung
-- voi so da giu; va vi lich hen dat truc ngay kham nen ho giu cac so dau ngay.
--
-- Ba cot them vao Appointments:
--   * QueueNumber   — so da giu (NULL = lich chua gan phong, van boc so tai quay nhu cu).
--   * QueueCode     — ma ve hien thi, VD "B007" (dung ma se hien tren bang goi so).
--   * QueueTicketId — ve hang doi that da sinh ra tu lich hen nay; chot chong tao ve hai lan.
--
-- Chi so duy nhat (loc NULL) chan hai lich hen cung phong/cung ngay om cung mot so khi hai nguoi
-- bam dat cung luc; ben goi bat DbUpdateException roi cap lai so ke tiep.
--
-- LUU Y khi thao tac tay tren bang Appointments: SQL Server doi SET QUOTED_IDENTIFIER ON cho MOI
-- lenh INSERT/UPDATE/DELETE vao bang co FILTERED INDEX. Ung dung khong anh huong (SqlClient bat san
-- tuy chon nay), nhung script chay bang sqlcmd phai tu dat, neu khong se gap loi Msg 1934.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.Appointments', 'QueueNumber') IS NULL
BEGIN
    ALTER TABLE Appointments ADD QueueNumber int NULL;
END
GO

IF COL_LENGTH('dbo.Appointments', 'QueueCode') IS NULL
BEGIN
    ALTER TABLE Appointments ADD QueueCode nvarchar(20) NULL;
END
GO

IF COL_LENGTH('dbo.Appointments', 'QueueTicketId') IS NULL
BEGIN
    ALTER TABLE Appointments ADD QueueTicketId uniqueidentifier NULL;
END
GO

-- Tra cuu "lich hen cua phong X ngay Y" chay o ca ba cho: cap so, worker dau ngay, va buoc boc so
-- tai quay (phai biet so nao da bi giu).
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_Appointments_Room_Date_Queue' AND object_id = OBJECT_ID('dbo.Appointments'))
BEGIN
    CREATE INDEX IX_Appointments_Room_Date_Queue
        ON Appointments (RoomId, AppointmentDate)
        INCLUDE (QueueNumber, QueueCode, QueueTicketId, Status);
END
GO

-- Hai lich hen con hieu luc khong duoc om cung mot so trong cung phong/cung ngay.
-- Loc IsDeleted = 0 va Status < 3: lich da huy / khong den tra lai so cho nguoi khac.
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UX_Appointments_Room_Date_QueueNumber' AND object_id = OBJECT_ID('dbo.Appointments'))
BEGIN
    CREATE UNIQUE INDEX UX_Appointments_Room_Date_QueueNumber
        ON Appointments (RoomId, AppointmentDate, QueueNumber)
        WHERE QueueNumber IS NOT NULL AND IsDeleted = 0 AND Status < 3;
END
GO
