-- Gop phieu thu cua Tiep don (bang Payments) vao SO PHIEU THU CHUNG (bang Receipts).
-- Nghiep vu: moi khoan thu — tiep don, quay vien phi hay khoa — deu phai nam trong MOT so
-- duy nhat thi moi chot duoc ca thu ngan va len bao cao doanh thu.
-- Truoc day Tiep don ghi vao Payments ma KHONG man hinh nao doc, nen tien thu o tiep don
-- bien mat khoi so quy va doanh thu.
-- ADDITIVE — khong xoa bang Payments (giu de doi chieu). Idempotent: chay lai khong nhan ban.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL AND OBJECT_ID('dbo.Receipts', 'U') IS NOT NULL
BEGIN
    INSERT INTO dbo.Receipts
    (
        Id, ReceiptCode, ReceiptDate, PatientId, MedicalRecordId, ReceiptType, PaymentMethod,
        Amount, Discount, FinalAmount, Note, Status, CashierId, CashBookId,
        CreatedAt, CreatedBy, UpdatedAt, UpdatedBy, IsDeleted, DiscountReasonCode
    )
    SELECT
        p.Id,
        p.ReceiptNumber,
        p.ReceiptDate,
        COALESCE(p.PatientId, mr.PatientId),
        p.MedicalRecordId,
        -- Payments.Status: 1-Paid, 2-Cancelled, 3-Refunded.
        -- Receipts tach thanh ReceiptType (2-Thanh toan, 3-Hoan tra) + Status (1-Da thu, 2-Da huy).
        CASE WHEN p.Status = 3 THEN 3 ELSE 2 END,
        p.PaymentMethod,
        p.TotalAmount,
        p.DiscountAmount,
        p.TotalAmount - p.DiscountAmount,
        LTRIM(RTRIM(
            N'Thu phi kham tai tiep don (chuyen tu bang Payments)'
            + CASE WHEN NULLIF(LTRIM(RTRIM(p.TransactionReference)), '') IS NULL
                   THEN N'' ELSE N' - GD ' + p.TransactionReference END
        )),
        CASE WHEN p.Status = 2 THEN 2 ELSE 1 END,
        p.ReceivedByUserId,
        NULL,
        p.CreatedAt,
        p.CreatedBy,
        p.UpdatedAt,
        p.UpdatedBy,
        p.IsDeleted,
        0
    FROM dbo.Payments p
    LEFT JOIN dbo.MedicalRecords mr ON mr.Id = p.MedicalRecordId
    WHERE
        -- Idempotent: bo qua dong da chuyen (theo Id hoac theo so bien lai)
        NOT EXISTS (SELECT 1 FROM dbo.Receipts r WHERE r.Id = p.Id)
        AND NOT EXISTS (SELECT 1 FROM dbo.Receipts r WHERE r.ReceiptCode = p.ReceiptNumber)
        -- Receipts.PatientId va CashierId la NOT NULL + co FK: chi chuyen dong du dieu kien,
        -- dong thieu du lieu de lai trong Payments de doi chieu thu cong.
        AND COALESCE(p.PatientId, mr.PatientId) IS NOT NULL
        AND EXISTS (SELECT 1 FROM dbo.Patients pt WHERE pt.Id = COALESCE(p.PatientId, mr.PatientId))
        AND EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Id = p.ReceivedByUserId);
END
GO
