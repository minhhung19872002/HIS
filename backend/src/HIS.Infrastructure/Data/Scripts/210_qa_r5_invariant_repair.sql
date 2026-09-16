-- 210 (QA round 5, 2026-09-16): sửa các dòng dữ liệu vi phạm bất biến nghiệp vụ.
--
-- Vòng 5 chạy một bộ kiểm tra bất biến bằng SQL (tiền · kho · trạng thái) và tìm ra năm nhóm dòng hỏng.
-- Nguyên nhân của tất cả đều đã được sửa trong code ở các vòng trước (chặn số lượng ≤ 0 khi chỉ định,
-- khoá theo từng giường khi phân giường, quy ước giờ VN) — đây chỉ là dọn phần dữ liệu đã lỡ ghi.
--
-- Chạy một lần, chốt bằng DataFixMarkers; các mệnh đề WHERE cũng không còn khớp sau khi đã sửa nên
-- chạy lại lần nữa cũng không làm hỏng thêm.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.DataFixMarkers', N'U') IS NULL
    CREATE TABLE dbo.DataFixMarkers (
        Name      NVARCHAR(200)  NOT NULL CONSTRAINT PK_DataFixMarkers PRIMARY KEY,
        AppliedAt DATETIME2      NOT NULL CONSTRAINT DF_DataFixMarkers_AppliedAt DEFAULT SYSUTCDATETIME(),
        Note      NVARCHAR(4000) NULL
    );
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DataFixMarkers WHERE Name = N'210_qa_r5_invariant_repair')
BEGIN
    DECLARE @note NVARCHAR(4000) = N'';

    ------------------------------------------------------------------------------------------------
    -- 1. Dòng chỉ định dịch vụ có số lượng <= 0 (thành tiền âm hoặc bằng 0).
    --    Một dòng chỉ định số lượng âm chưa bao giờ là chỉ định thật: nó sinh ra khoản tiền âm trong
    --    mọi báo cáo doanh thu. Xoá mềm rồi tính lại tổng của phiếu cha từ các dòng còn lại.
    ------------------------------------------------------------------------------------------------
    DECLARE @badDetails TABLE (Id UNIQUEIDENTIFIER PRIMARY KEY, ServiceRequestId UNIQUEIDENTIFIER);
    INSERT INTO @badDetails (Id, ServiceRequestId)
    SELECT Id, ServiceRequestId FROM dbo.ServiceRequestDetails
    WHERE IsDeleted = 0 AND (Quantity <= 0 OR Amount < 0);

    UPDATE d SET d.IsDeleted = 1, d.UpdatedAt = SYSUTCDATETIME(), d.UpdatedBy = N'migration-210'
    FROM dbo.ServiceRequestDetails d JOIN @badDetails b ON b.Id = d.Id;
    SET @note = @note + N'srd_deleted=' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N'; ';

    UPDATE r SET
        r.TotalAmount     = ISNULL(v.SumAmount, 0),
        r.InsuranceAmount = ISNULL(v.SumIns, 0),
        r.PatientAmount   = ISNULL(v.SumPat, 0),
        r.UpdatedAt = SYSUTCDATETIME(), r.UpdatedBy = N'migration-210'
    FROM dbo.ServiceRequests r
    JOIN (SELECT DISTINCT ServiceRequestId FROM @badDetails) b ON b.ServiceRequestId = r.Id
    OUTER APPLY (
        SELECT SUM(d.Amount) AS SumAmount, SUM(d.InsuranceAmount) AS SumIns, SUM(d.PatientAmount) AS SumPat
        FROM dbo.ServiceRequestDetails d WHERE d.ServiceRequestId = r.Id AND d.IsDeleted = 0
    ) v;
    SET @note = @note + N'srq_recalc=' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N'; ';

    ------------------------------------------------------------------------------------------------
    -- 2. Dòng xuất kho có số lượng <= 0.
    --    Đường xuất kho trừ tồn bằng `Quantity`, nên một dòng âm đã CỘNG nhầm vào tồn. Trả lại đúng
    --    phần đã cộng thừa trước khi xoá mềm dòng, để sổ kho và tồn thực khớp nhau.
    ------------------------------------------------------------------------------------------------
    UPDATE inv SET
        inv.Quantity = CASE WHEN inv.Quantity + e.Quantity < 0 THEN 0 ELSE inv.Quantity + e.Quantity END,
        inv.UpdatedAt = SYSUTCDATETIME(), inv.UpdatedBy = N'migration-210'
    FROM dbo.InventoryItems inv
    JOIN dbo.ExportReceiptDetails e ON e.InventoryItemId = inv.Id
    WHERE e.IsDeleted = 0 AND e.Quantity < 0;
    SET @note = @note + N'stock_reversed=' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N'; ';

    UPDATE dbo.ExportReceiptDetails SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'migration-210'
    WHERE IsDeleted = 0 AND Quantity <= 0;
    SET @note = @note + N'erd_deleted=' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N'; ';

    ------------------------------------------------------------------------------------------------
    -- 3. Phân giường: trả giường trước khi nhận giường (ReleasedAt < AssignedAt).
    --    Dư âm của thời kỳ lẫn giờ UTC và giờ VN (đã thống nhất ở migration 205). Số ngày nằm tính ra
    --    số âm, nên tiền giường của các lượt này sai. Đưa ReleasedAt về đúng bằng AssignedAt (0 ngày).
    ------------------------------------------------------------------------------------------------
    UPDATE dbo.BedAssignments SET ReleasedAt = AssignedAt, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'migration-210'
    WHERE ReleasedAt IS NOT NULL AND ReleasedAt < AssignedAt;
    SET @note = @note + N'bed_released_fixed=' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N'; ';

    ------------------------------------------------------------------------------------------------
    -- 4. Một giường mang nhiều phân giường còn hiệu lực cùng lúc.
    --    Sinh ra trước khi có khoá theo từng giường. Giữ lần phân gần nhất, đóng các lần cũ hơn với
    --    trạng thái 2 (chuyển giường) và mốc trả = lúc lần mới được phân.
    ------------------------------------------------------------------------------------------------
    ;WITH ranked AS (
        SELECT Id, BedId, AssignedAt,
               ROW_NUMBER() OVER (PARTITION BY BedId ORDER BY AssignedAt DESC, Id DESC) AS rn,
               MAX(AssignedAt) OVER (PARTITION BY BedId) AS NewestAssignedAt
        FROM dbo.BedAssignments WHERE Status = 0
    )
    UPDATE ba SET ba.Status = 2, ba.ReleasedAt = r.NewestAssignedAt,
                  ba.UpdatedAt = SYSUTCDATETIME(), ba.UpdatedBy = N'migration-210'
    FROM dbo.BedAssignments ba JOIN ranked r ON r.Id = ba.Id
    WHERE r.rn > 1;
    SET @note = @note + N'bed_dup_closed=' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N'; ';

    ------------------------------------------------------------------------------------------------
    -- 5. Ra viện trước khi vào viện.
    --    Phần lớn lệch dưới 2 giây (ghi cùng một giao dịch), một trường hợp lệch 10 ngày. Cả hai đều
    --    làm số ngày điều trị âm; đưa mốc ra viện lên bằng mốc vào viện.
    ------------------------------------------------------------------------------------------------
    UPDATE d SET d.DischargeDate = a.AdmissionDate, d.UpdatedAt = SYSUTCDATETIME(), d.UpdatedBy = N'migration-210'
    FROM dbo.Discharges d JOIN dbo.Admissions a ON a.Id = d.AdmissionId
    WHERE d.DischargeDate < a.AdmissionDate;
    SET @note = @note + N'discharge_fixed=' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N'; ';

    INSERT INTO dbo.DataFixMarkers (Name, Note) VALUES (N'210_qa_r5_invariant_repair', @note);
END
GO
