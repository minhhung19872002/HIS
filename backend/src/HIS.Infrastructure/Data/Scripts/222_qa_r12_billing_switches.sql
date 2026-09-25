-- 222 (QA round 12, 2026-09-25): billing/reception switches — defaults keep today's behaviour + cashier warnings.
-- QA-R12 (r12-money): billing / reception money switches, seeded with SAFE defaults.
-- Every key is also read with the same default when the row is missing, so behaviour does not depend on this script.
-- Idempotent: every statement is guarded, a second run changes nothing.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Exam fee (công khám) at registration (ExamFeeAutoOrder). Off = current behaviour: no fee line is created and the
--    cashier sees "Lượt khám chưa có công khám" (InvoiceLedger warning). On = one exam-service order per new exam.
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Reception.AutoExamFee')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Reception.AutoExamFee', 'Off', 'String',
            N'Tiếp đón tự tạo công khám: Off = KHÔNG tạo (thu ngân thấy cảnh báo "Lượt khám chưa có công khám"); On = mỗi lượt khám/phòng khám mới tự có 1 dòng dịch vụ khám (giá danh mục, tách BHYT).',
            1, GETUTCDATE(), 0);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Reception.AutoExamFeeServiceCode')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Reception.AutoExamFeeServiceCode', '', 'String',
            N'Mã dịch vụ khám (Services.ServiceType = 1) dùng khi Reception.AutoExamFee = On; để trống = dịch vụ khám đang hoạt động đầu tiên theo thứ tự hiển thị, rồi rẻ nhất (khám thường).',
            1, GETUTCDATE(), 0);
GO

-- 2. Ward-cabinet issues (ExportType 12) in the invoice. Off = current behaviour (not charged) + cashier warning with
--    the unbilled amount. Not On by default: charging them would raise the amount due on records already collected.
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Billing.BillCabinetIssues')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Billing.BillCabinetIssues', 'Off', 'String',
            N'Tính tiền thuốc xuất tủ trực vào viện phí: Off = không tính, thu ngân thấy cảnh báo số tiền chưa tính; On = thành dòng thuốc (giá danh mục, tách BHYT).',
            1, GETUTCDATE(), 0);
GO

-- 3+4. Bill what the patient kept: UNPAID medicine lines at min(prescribed, dispensed) once issued, minus approved
--    patient returns. Paid lines are never re-priced (refund suggestion instead) and a cut never pushes the charges
--    below money already collected on the record → no paid receipt changes.
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Billing.BillDispensedQuantity')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Billing.BillDispensedQuantity', 'Off', 'String',
            N'Tiền thuốc theo số lượng thực cấp: On = dòng CHƯA thu tính theo SL đã cấp (không quá SL kê) trừ SL hoàn trả đã duyệt; dòng đã thu giữ nguyên, hiện gợi ý hoàn tiền; Off = luôn tính theo SL kê.',
            1, GETUTCDATE(), 0);
GO

-- 5. Split bed days at the BHYT card expiry. Off = current behaviour (whole assignment follows the card on its start
--    date) + cashier warning with the BHYT amount after expiry. Not On by default: it would raise the patient share of
--    stays already collected.
IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'Billing.SplitBedDaysAtCardExpiry')
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), 'Billing.SplitBedDaysAtCardExpiry', 'Off', 'String',
            N'Tách ngày giường tại ngày hết hạn thẻ BHYT: Off = cả đợt giường theo thẻ ngày bắt đầu, thu ngân thấy cảnh báo; On = các đêm sau ngày hết hạn không được BHYT chi trả (cả bảng kê lẫn hồ sơ giám định).',
            1, GETUTCDATE(), 0);
GO
