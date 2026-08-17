-- 166: Bổ sung danh mục thuốc để KB tương tác (migration 138) có thuốc mà khớp.
--
-- Bối cảnh (đo trên prod AWS 2026-08-17): danh mục `Medicines` chỉ có 19 thuốc và KHÔNG có
-- warfarin/aspirin/methotrexate/simvastatin/clarithromycin/sildenafil/nitroglycerin/colchicine…
-- Migration 138 seed KB tương tác bằng cách JOIN theo HOẠT CHẤT, nên không cặp nào khớp
-- ⇒ bảng DrugInteractions RỖNG ⇒ PrescriptionSafetyGuard (#186) KHÔNG BAO GIỜ chặn được đơn nào.
-- Kiểm chứng thực tế: POST /api/examination/check-drug-interactions với Diclofenac + Ibuprofen
-- (hai NSAID cùng nhóm) trả về [] — không một cảnh báo nào.
--
-- Cách sửa: KHÔNG tự bịa thêm cặp tương tác mới (đó là nội dung lâm sàng), mà bổ sung đúng
-- những hoạt chất mà bộ cặp ĐÃ ĐƯỢC THẨM ĐỊNH ở 138 tham chiếu tới, rồi chạy lại chính phép
-- INSERT của 138 ngay trong script này. Chạy lại ở đây là cần thiết vì script chạy theo thứ tự
-- tên file: 138 chạy TRƯỚC 166, nếu chỉ thêm thuốc thì phải chờ tới lần khởi động sau KB mới có.
--
-- Idempotent: chỉ thêm thuốc chưa có mã, chỉ thêm cặp chưa tồn tại (đối xứng A,B == B,A).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.Medicines','U') IS NULL
    RETURN;
GO

-- (1) Thuốc tối thiểu để KB an toàn có hiệu lực. Đều là hoạt chất phổ thông trong danh mục BYT.
;WITH seed(Code, Name, Ingredient, Concentration, Unit, IsAntibiotic) AS (
    SELECT N'TH_WARFARIN',      N'Warfarin 5mg',        N'Warfarin',       N'5mg',   N'Viên', 0 UNION ALL
    SELECT N'TH_ASPIRIN',       N'Aspirin 81mg',        N'Aspirin',        N'81mg',  N'Viên', 0 UNION ALL
    SELECT N'TH_METHOTREXATE',  N'Methotrexate 2.5mg',  N'Methotrexate',   N'2.5mg', N'Viên', 0 UNION ALL
    SELECT N'TH_TRIMETHOPRIM',  N'Trimethoprim 80mg',   N'Trimethoprim',   N'80mg',  N'Viên', 1 UNION ALL
    SELECT N'TH_SIMVASTATIN',   N'Simvastatin 20mg',    N'Simvastatin',    N'20mg',  N'Viên', 0 UNION ALL
    SELECT N'TH_CLARITHRO',     N'Clarithromycin 500mg',N'Clarithromycin', N'500mg', N'Viên', 1 UNION ALL
    SELECT N'TH_SPIRONO',       N'Spironolactone 25mg', N'Spironolactone', N'25mg',  N'Viên', 0 UNION ALL
    SELECT N'TH_KALICLORID',    N'Kali clorid 600mg',   N'Potassium chloride', N'600mg', N'Viên', 0 UNION ALL
    SELECT N'TH_SILDENAFIL',    N'Sildenafil 50mg',     N'Sildenafil',     N'50mg',  N'Viên', 0 UNION ALL
    SELECT N'TH_NITROGLYCERIN', N'Nitroglycerin 2.6mg', N'Nitroglycerin',  N'2.6mg', N'Viên', 0 UNION ALL
    SELECT N'TH_COLCHICINE',    N'Colchicine 1mg',      N'Colchicine',     N'1mg',   N'Viên', 0
)
INSERT INTO dbo.Medicines
    (Id, MedicineCode, MedicineName, ActiveIngredient, Concentration, MedicineType,
     Unit, PackageUnit, ConversionRate, IsNarcotic, IsPsychotropic, IsPrecursor,
     IsAntibiotic, IsControlled, UnitPrice, IsActive, CreatedAt, IsDeleted)
SELECT NEWID(), s.Code, s.Name, s.Ingredient, s.Concentration, 1,
       s.Unit, s.Unit, 1, 0, 0, 0,
       s.IsAntibiotic, 0, 0, 1, SYSUTCDATETIME(), 0
FROM seed s
WHERE NOT EXISTS (SELECT 1 FROM dbo.Medicines m WHERE m.MedicineCode = s.Code);
GO

-- (2) Chạy lại phép seed cặp tương tác của 138 để KB có hiệu lực NGAY trong lần khởi động này.
--     Danh sách cặp giữ nguyên bản 138 — không thêm/bớt nội dung lâm sàng.
IF OBJECT_ID('dbo.DrugInteractions','U') IS NOT NULL
BEGIN
    ;WITH pairs(Ai1, Ai2, Severity, IType, Descr, Reco) AS (
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
    PRINT N'166: KB tương tác thuốc bổ sung ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' cặp';
END
GO
