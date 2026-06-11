-- ============================================================
-- Seed catalog LisTestParameters (defer R1 — bảng đang rỗng).
-- Mục đích: cờ H/L/HH/LL TỰ TÍNH từ khoảng tham chiếu khi analyzer
-- KHÔNG gửi flag OBX-8 + range hiển thị cho KTV nhập tay (R1-2a/2b).
-- Khoảng tham chiếu = giá trị mặc định phổ biến (người lớn) — admin
-- chỉnh theo labo thực tế qua màn quản trị (G-22).
-- Match dịch vụ theo TÊN (LIKE) trên Services ServiceType=2 — idempotent
-- theo (ServiceId, Code); service không khớp pattern → bỏ qua.
-- ============================================================

SET NOCOUNT ON;

DECLARE @panel TABLE (
    Pattern NVARCHAR(100),
    Code NVARCHAR(50), Name NVARCHAR(200), Unit NVARCHAR(50),
    RefLow DECIMAL(18,4) NULL, RefHigh DECIMAL(18,4) NULL,
    MinMale DECIMAL(18,4) NULL, MaxMale DECIMAL(18,4) NULL,
    MinFemale DECIMAL(18,4) NULL, MaxFemale DECIMAL(18,4) NULL,
    CritLow DECIMAL(18,4) NULL, CritHigh DECIMAL(18,4) NULL,
    Seq INT
);

-- Công thức máu / tổng phân tích tế bào máu
INSERT INTO @panel VALUES
(N'%Công thức máu%', N'WBC',  N'Bạch cầu (WBC)',        N'G/L',    4,    10,   NULL, NULL, NULL, NULL, 2,    30,   1),
(N'%Công thức máu%', N'RBC',  N'Hồng cầu (RBC)',        N'T/L',    3.8,  5.8,  4.2,  5.8,  3.8,  5.4,  NULL, NULL, 2),
(N'%Công thức máu%', N'HGB',  N'Huyết sắc tố (HGB)',    N'g/L',    120,  170,  130,  170,  120,  150,  70,   200,  3),
(N'%Công thức máu%', N'HCT',  N'Hematocrit (HCT)',      N'L/L',    0.36, 0.50, 0.40, 0.50, 0.36, 0.46, NULL, NULL, 4),
(N'%Công thức máu%', N'PLT',  N'Tiểu cầu (PLT)',        N'G/L',    150,  400,  NULL, NULL, NULL, NULL, 50,   1000, 5),
(N'%Công thức máu%', N'NEU%', N'Bạch cầu trung tính %', N'%',      45,   75,   NULL, NULL, NULL, NULL, NULL, NULL, 6),
(N'%Công thức máu%', N'LYM%', N'Lympho %',              N'%',      20,   40,   NULL, NULL, NULL, NULL, NULL, NULL, 7);

-- Đơn lẻ thường gặp
INSERT INTO @panel VALUES
(N'%Glucose%',     N'GLU',   N'Glucose máu',        N'mmol/L', 3.9, 6.4,  NULL, NULL, NULL, NULL, 2.5, 25,  1),
(N'%HbA1c%',       N'HBA1C', N'HbA1c',              N'%',      4,   6,    NULL, NULL, NULL, NULL, NULL, NULL, 1),
(N'%GOT%',         N'GOT',   N'GOT (AST)',          N'U/L',    0,   40,   NULL, NULL, NULL, NULL, NULL, NULL, 1),
(N'%GOT%',         N'GPT',   N'GPT (ALT)',          N'U/L',    0,   40,   NULL, NULL, NULL, NULL, NULL, NULL, 2),
(N'%Creatinin%',   N'CRE',   N'Creatinin máu',      N'µmol/L', 53,  120,  62,   120,  53,   100,  NULL, NULL, 1),
(N'%Cholesterol%', N'CHOL',  N'Cholesterol TP',     N'mmol/L', 0,   5.2,  NULL, NULL, NULL, NULL, NULL, NULL, 1),
(N'%CRP%',         N'CRP',   N'CRP',                N'mg/L',   0,   5,    NULL, NULL, NULL, NULL, NULL, NULL, 1);

-- Điện giải đồ
INSERT INTO @panel VALUES
(N'%Điện giải%', N'NA', N'Natri (Na+)',  N'mmol/L', 135, 145, NULL, NULL, NULL, NULL, 120, 160, 1),
(N'%Điện giải%', N'K',  N'Kali (K+)',    N'mmol/L', 3.5, 5.0, NULL, NULL, NULL, NULL, 2.5, 6.5, 2),
(N'%Điện giải%', N'CL', N'Clo (Cl-)',    N'mmol/L', 98,  106, NULL, NULL, NULL, NULL, NULL, NULL, 3);

-- Sinh hóa máu (bộ 12 chỉ số)
INSERT INTO @panel VALUES
(N'%Sinh hóa máu%', N'GLU',  N'Glucose máu',     N'mmol/L', 3.9, 6.4,  NULL, NULL, NULL, NULL, 2.5, 25,  1),
(N'%Sinh hóa máu%', N'URE',  N'Ure máu',         N'mmol/L', 2.5, 7.5,  NULL, NULL, NULL, NULL, NULL, NULL, 2),
(N'%Sinh hóa máu%', N'CRE',  N'Creatinin máu',   N'µmol/L', 53,  120,  62,   120,  53,   100,  NULL, NULL, 3),
(N'%Sinh hóa máu%', N'GOT',  N'GOT (AST)',       N'U/L',    0,   40,   NULL, NULL, NULL, NULL, NULL, NULL, 4),
(N'%Sinh hóa máu%', N'GPT',  N'GPT (ALT)',       N'U/L',    0,   40,   NULL, NULL, NULL, NULL, NULL, NULL, 5),
(N'%Sinh hóa máu%', N'CHOL', N'Cholesterol TP',  N'mmol/L', 0,   5.2,  NULL, NULL, NULL, NULL, NULL, NULL, 6),
(N'%Sinh hóa máu%', N'TG',   N'Triglycerid',     N'mmol/L', 0,   1.7,  NULL, NULL, NULL, NULL, NULL, NULL, 7),
(N'%Sinh hóa máu%', N'HDL',  N'HDL-Cholesterol', N'mmol/L', 0.9, 99,   NULL, NULL, NULL, NULL, NULL, NULL, 8),
(N'%Sinh hóa máu%', N'LDL',  N'LDL-Cholesterol', N'mmol/L', 0,   3.4,  NULL, NULL, NULL, NULL, NULL, NULL, 9),
(N'%Sinh hóa máu%', N'NA',   N'Natri (Na+)',     N'mmol/L', 135, 145,  NULL, NULL, NULL, NULL, 120, 160,  10),
(N'%Sinh hóa máu%', N'K',    N'Kali (K+)',       N'mmol/L', 3.5, 5.0,  NULL, NULL, NULL, NULL, 2.5, 6.5,  11),
(N'%Sinh hóa máu%', N'CL',   N'Clo (Cl-)',       N'mmol/L', 98,  106,  NULL, NULL, NULL, NULL, NULL, NULL, 12);

INSERT INTO LisTestParameters
    (Id, Code, Name, Unit, ReferenceLow, ReferenceHigh,
     NormalMinMale, NormalMaxMale, NormalMinFemale, NormalMaxFemale,
     CriticalLow, CriticalHigh, Hl7Code, DataType, SortOrder,
     ServiceId, IsActive, CreatedAt, IsDeleted)
SELECT NEWID(), p.Code, p.Name, p.Unit, p.RefLow, p.RefHigh,
       p.MinMale, p.MaxMale, p.MinFemale, p.MaxFemale,
       p.CritLow, p.CritHigh, p.Code, N'Numeric', p.Seq,
       s.Id, 1, GETUTCDATE(), 0
FROM Services s
INNER JOIN @panel p ON s.ServiceName LIKE p.Pattern
WHERE s.IsDeleted = 0 AND s.ServiceType = 2
  AND NOT EXISTS (
      SELECT 1 FROM LisTestParameters x
      WHERE x.ServiceId = s.Id AND x.Code = p.Code AND x.IsDeleted = 0
  );

PRINT '93_seed_lis_test_parameters: seeded ' + CONVERT(varchar(10), @@ROWCOUNT) + ' parameter rows';
GO
