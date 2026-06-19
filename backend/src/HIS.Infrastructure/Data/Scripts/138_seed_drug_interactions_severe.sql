-- 138: Seed KB tương tác thuốc NGHIÊM TRỌNG (#186) — danh sách cặp chống-chỉ-định/nặng phổ biến, theo HOẠT CHẤT.
-- Vì sao: bảng DrugInteractions RỖNG ⇒ enforce (#186) không chặn được gì. Seed các cặp nguy hiểm đã được công nhận rộng rãi.
-- Cách làm: resolve hoạt chất → MedicineId (mọi thuốc cùng hoạt chất, mọi brand/hàm lượng). Idempotent:
--           chỉ INSERT cặp CHƯA tồn tại (đối xứng A,B == B,A) ⇒ chạy lại an toàn, KHÔNG đụng KB người dùng tự thêm.
-- Enforce: PrescriptionSafetyGuard chặn LƯU đơn khi Severity>=3 (3-Nặng, 4-CCĐ) — BS phải nhập OverrideReason để bỏ qua.
-- Lưu ý: catalog thuốc mỏng/đặt tên hoạt chất khác (vd "Acetylsalicylic") ⇒ seed match ít là BÌNH THƯỜNG;
--        bệnh viện mở rộng KB qua import CSV (ImportDrugInteractionsAsync) — đây chỉ là bộ tối thiểu an toàn.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.DrugInteractions','U') IS NOT NULL AND OBJECT_ID('dbo.Medicines','U') IS NOT NULL
BEGIN
    ;WITH pairs(Ai1, Ai2, Severity, IType, Descr, Reco) AS (
        -- Hoạt chất 1, Hoạt chất 2 (khớp LIKE %..%, không phân biệt hoa thường theo collation mặc định)
        SELECT N'warfarin',      N'aspirin',        3, N'Dược lực', N'Tăng nguy cơ xuất huyết nghiêm trọng',                 N'Tránh phối hợp; nếu buộc dùng phải theo dõi INR sát' UNION ALL
        SELECT N'warfarin',      N'ibuprofen',      3, N'Dược lực', N'NSAID làm tăng nguy cơ chảy máu khi dùng kháng đông',  N'Tránh phối hợp; cân nhắc paracetamol thay NSAID' UNION ALL
        SELECT N'warfarin',      N'diclofenac',     3, N'Dược lực', N'NSAID làm tăng nguy cơ chảy máu khi dùng kháng đông',  N'Tránh phối hợp; cân nhắc paracetamol thay NSAID' UNION ALL
        SELECT N'methotrexate',  N'trimethoprim',   4, N'Dược lực', N'Tăng độc tính huyết học/ức chế tủy nặng (CCĐ)',         N'Chống chỉ định phối hợp' UNION ALL
        SELECT N'simvastatin',   N'clarithromycin', 3, N'Dược động', N'Tăng nồng độ statin → tiêu cơ vân (rhabdomyolysis)',   N'Ngưng statin trong đợt dùng macrolid hoặc đổi kháng sinh' UNION ALL
        SELECT N'spironolactone',N'potassium',      3, N'Dược lực', N'Tăng kali máu nguy hiểm',                              N'Theo dõi kali máu; tránh bổ sung kali khi dùng lợi tiểu giữ kali' UNION ALL
        SELECT N'sildenafil',    N'nitroglycerin',  4, N'Dược lực', N'Tụt huyết áp nặng/đe doạ tính mạng (CCĐ với nitrat)',  N'Chống chỉ định phối hợp với nitrat' UNION ALL
        SELECT N'clarithromycin',N'colchicine',     4, N'Dược động', N'Tăng độc tính colchicin nặng (có thể tử vong)',       N'Chống chỉ định ở bệnh nhân suy gan/thận'
    )
    INSERT INTO dbo.DrugInteractions
        (Id, Medicine1Id, Medicine2Id, Severity, InteractionType, Description, Recommendation, IsActive, CreatedAt, IsDeleted)
    SELECT NEWID(), m1.Id, m2.Id, p.Severity, p.IType, p.Descr, p.Reco, 1, SYSUTCDATETIME(), 0
    FROM pairs p
    JOIN dbo.Medicines m1 ON m1.ActiveIngredient LIKE N'%' + p.Ai1 + N'%' AND ISNULL(m1.IsDeleted, 0) = 0
    JOIN dbo.Medicines m2 ON m2.ActiveIngredient LIKE N'%' + p.Ai2 + N'%' AND ISNULL(m2.IsDeleted, 0) = 0
    WHERE m1.Id <> m2.Id
      AND NOT EXISTS (
            SELECT 1 FROM dbo.DrugInteractions di
            WHERE (di.Medicine1Id = m1.Id AND di.Medicine2Id = m2.Id)
               OR (di.Medicine1Id = m2.Id AND di.Medicine2Id = m1.Id));
    PRINT N'Seed DrugInteractions (severe, #186): ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' row(s) inserted';
END
GO
