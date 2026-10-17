-- 227: BlueContract (cổng hợp đồng / mua sắm, https://bluecontract.bluestar.com.vn) integration. Idempotent.
-- (1) Phiếu nhập NCC lưu Số hợp đồng + Số QĐ trúng thầu: cổng ghép phiếu với hợp đồng theo (Số QĐ + MST NCC), thêm
--     Số HĐ khi một NCC có nhiều hợp đồng. Trước đây DTO nhận ContractNumber rồi bỏ (không có cột).
-- (2) Role BLUECONTRACT_SERVICE — tài khoản dịch vụ của BlueContract gọi /api/integration/bluecontract/*. Không có
--     permission nào; ExternalActorScopeMiddleware nhốt nó trong đúng tiền tố đó. User tạo qua màn quản trị — mật
--     khẩu KHÔNG nằm trong repo.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.ImportReceipts','ContractNumber') IS NULL
    ALTER TABLE dbo.ImportReceipts ADD ContractNumber nvarchar(100) NULL;
IF COL_LENGTH('dbo.ImportReceipts','BidDecisionNumber') IS NULL
    ALTER TABLE dbo.ImportReceipts ADD BidDecisionNumber nvarchar(100) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'BLUECONTRACT_SERVICE')
BEGIN
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'BLUECONTRACT_SERVICE', N'Tài khoản dịch vụ BlueContract',
            N'Chỉ dùng cho cổng BlueContract đọc tồn kho / phiếu nhập qua /api/integration/bluecontract. Không cấp cho người dùng.',
            SYSUTCDATETIME(), 0);
END
GO
