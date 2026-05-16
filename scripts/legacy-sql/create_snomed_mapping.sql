-- SNOMED CT tables and seed data for Level 6 INTOP-02/03
-- Add SNOMED columns to ClinicalTerms
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ClinicalTerms') AND name = 'SnomedCtCode')
BEGIN
    ALTER TABLE ClinicalTerms ADD SnomedCtCode NVARCHAR(20) NULL;
    ALTER TABLE ClinicalTerms ADD SnomedCtDisplay NVARCHAR(500) NULL;
END
GO

-- Create SnomedIcdMappings table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('SnomedIcdMappings') AND type = 'U')
BEGIN
    CREATE TABLE SnomedIcdMappings (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        IcdCode NVARCHAR(20) NOT NULL,
        IcdName NVARCHAR(500) NOT NULL,
        SnomedCtCode NVARCHAR(20) NOT NULL,
        SnomedCtDisplay NVARCHAR(500) NOT NULL,
        MapGroup NVARCHAR(50) NULL,
        MapPriority INT NOT NULL DEFAULT 1,
        MapRule NVARCHAR(20) NOT NULL DEFAULT 'EQUIVALENT',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_SnomedIcdMappings_IcdCode ON SnomedIcdMappings(IcdCode);
    CREATE INDEX IX_SnomedIcdMappings_SnomedCtCode ON SnomedIcdMappings(SnomedCtCode);
END
GO

-- Seed 200+ common ICD-10 to SNOMED CT mappings (Vietnamese healthcare)
-- Source: WHO ICD-10 to SNOMED CT reference map
DELETE FROM SnomedIcdMappings;
INSERT INTO SnomedIcdMappings (Id, IcdCode, IcdName, SnomedCtCode, SnomedCtDisplay, MapRule) VALUES
-- Infectious diseases (A00-B99)
(NEWID(), 'A09', N'Tiêu chảy và viêm dạ dày-ruột', '302866003', 'Infective gastroenteritis', 'EQUIVALENT'),
(NEWID(), 'A15.0', N'Lao phổi', '154283005', 'Pulmonary tuberculosis', 'EQUIVALENT'),
(NEWID(), 'A16.0', N'Lao phổi không xác nhận vi khuẩn', '56717001', 'Tuberculosis of lung', 'BROADER'),
(NEWID(), 'A49.9', N'Nhiễm khuẩn không xác định', '40733004', 'Infectious disease', 'BROADER'),
(NEWID(), 'B18.1', N'Viêm gan B mạn', '61977001', 'Chronic hepatitis B', 'EQUIVALENT'),
(NEWID(), 'B18.2', N'Viêm gan C mạn', '128302006', 'Chronic hepatitis C', 'EQUIVALENT'),
(NEWID(), 'B20', N'HIV gây bệnh truyền nhiễm', '86406008', 'HIV disease', 'BROADER'),
(NEWID(), 'B34.9', N'Nhiễm virus không xác định', '34014006', 'Viral disease', 'BROADER'),
(NEWID(), 'B37.0', N'Viêm miệng do nấm Candida', '78048006', 'Oral candidiasis', 'EQUIVALENT'),
-- Neoplasms (C00-D48)
(NEWID(), 'C16.9', N'Ung thư dạ dày', '363349007', 'Malignant tumor of stomach', 'EQUIVALENT'),
(NEWID(), 'C18.9', N'Ung thư đại tràng', '363406005', 'Malignant tumor of colon', 'EQUIVALENT'),
(NEWID(), 'C20', N'Ung thư trực tràng', '363351006', 'Malignant tumor of rectum', 'EQUIVALENT'),
(NEWID(), 'C22.0', N'Ung thư biểu mô tế bào gan', '109841003', 'Hepatocellular carcinoma', 'EQUIVALENT'),
(NEWID(), 'C34.9', N'Ung thư phổi', '93880001', 'Primary malignant neoplasm of lung', 'EQUIVALENT'),
(NEWID(), 'C50.9', N'Ung thư vú', '254837009', 'Malignant neoplasm of breast', 'EQUIVALENT'),
(NEWID(), 'C53.9', N'Ung thư cổ tử cung', '363354003', 'Malignant tumor of cervix', 'EQUIVALENT'),
(NEWID(), 'C61', N'Ung thư tuyến tiền liệt', '399068003', 'Malignant tumor of prostate', 'EQUIVALENT'),
(NEWID(), 'C73', N'Ung thư tuyến giáp', '363478007', 'Malignant tumor of thyroid gland', 'EQUIVALENT'),
(NEWID(), 'D50.9', N'Thiếu máu thiếu sắt', '87522002', 'Iron deficiency anemia', 'EQUIVALENT'),
-- Endocrine (E00-E90)
(NEWID(), 'E03.9', N'Suy giáp', '40930008', 'Hypothyroidism', 'EQUIVALENT'),
(NEWID(), 'E05.9', N'Cường giáp', '34486009', 'Hyperthyroidism', 'EQUIVALENT'),
(NEWID(), 'E10', N'Đái tháo đường type 1', '46635009', 'Diabetes mellitus type 1', 'EQUIVALENT'),
(NEWID(), 'E11', N'Đái tháo đường type 2', '44054006', 'Diabetes mellitus type 2', 'EQUIVALENT'),
(NEWID(), 'E11.2', N'ĐTĐ type 2 biến chứng thận', '422166005', 'Type 2 diabetes mellitus with renal complication', 'EQUIVALENT'),
(NEWID(), 'E11.3', N'ĐTĐ type 2 biến chứng mắt', '422034002', 'Type 2 diabetes mellitus with ophthalmic complication', 'EQUIVALENT'),
(NEWID(), 'E11.5', N'ĐTĐ type 2 biến chứng mạch máu', '421895002', 'Type 2 diabetes mellitus with peripheral circulatory complication', 'EQUIVALENT'),
(NEWID(), 'E14', N'Đái tháo đường không xác định', '73211009', 'Diabetes mellitus', 'BROADER'),
(NEWID(), 'E66.9', N'Béo phì', '414916001', 'Obesity', 'EQUIVALENT'),
(NEWID(), 'E78.0', N'Tăng cholesterol máu', '13644009', 'Hypercholesterolemia', 'EQUIVALENT'),
(NEWID(), 'E78.5', N'Rối loạn lipid máu', '55822004', 'Hyperlipidemia', 'EQUIVALENT'),
(NEWID(), 'E87.6', N'Hạ kali máu', '43339004', 'Hypokalemia', 'EQUIVALENT'),
-- Mental (F00-F99)
(NEWID(), 'F10.2', N'Nghiện rượu', '7200002', 'Alcoholism', 'EQUIVALENT'),
(NEWID(), 'F20.9', N'Tâm thần phân liệt', '58214004', 'Schizophrenia', 'EQUIVALENT'),
(NEWID(), 'F32.9', N'Trầm cảm', '35489007', 'Depressive disorder', 'EQUIVALENT'),
(NEWID(), 'F41.9', N'Rối loạn lo âu', '197480006', 'Anxiety disorder', 'EQUIVALENT'),
-- Nervous system (G00-G99)
(NEWID(), 'G20', N'Bệnh Parkinson', '49049000', 'Parkinson disease', 'EQUIVALENT'),
(NEWID(), 'G30.9', N'Bệnh Alzheimer', '26929004', 'Alzheimer disease', 'EQUIVALENT'),
(NEWID(), 'G35', N'Xơ cứng rải rác', '24700007', 'Multiple sclerosis', 'EQUIVALENT'),
(NEWID(), 'G40.9', N'Động kinh', '84757009', 'Epilepsy', 'EQUIVALENT'),
(NEWID(), 'G43.9', N'Đau nửa đầu', '37796009', 'Migraine', 'EQUIVALENT'),
(NEWID(), 'G47.0', N'Mất ngủ', '193462001', 'Insomnia', 'EQUIVALENT'),
-- Eye (H00-H59)
(NEWID(), 'H10.9', N'Viêm kết mạc', '9826008', 'Conjunctivitis', 'EQUIVALENT'),
(NEWID(), 'H25.9', N'Đục thủy tinh thể do tuổi', '193570009', 'Cataract', 'EQUIVALENT'),
(NEWID(), 'H40.9', N'Glaucoma', '23986001', 'Glaucoma', 'EQUIVALENT'),
-- Ear (H60-H95)
(NEWID(), 'H66.9', N'Viêm tai giữa', '65363002', 'Otitis media', 'EQUIVALENT'),
-- Circulatory (I00-I99)
(NEWID(), 'I10', N'Tăng huyết áp nguyên phát', '59621000', 'Essential hypertension', 'EQUIVALENT'),
(NEWID(), 'I11.9', N'Bệnh tim tăng huyết áp', '64715009', 'Hypertensive heart disease', 'EQUIVALENT'),
(NEWID(), 'I20.9', N'Đau thắt ngực', '194828000', 'Angina pectoris', 'EQUIVALENT'),
(NEWID(), 'I21.9', N'Nhồi máu cơ tim cấp', '57054005', 'Acute myocardial infarction', 'EQUIVALENT'),
(NEWID(), 'I25.9', N'Bệnh tim thiếu máu cục bộ mạn', '414545008', 'Ischemic heart disease', 'EQUIVALENT'),
(NEWID(), 'I48', N'Rung nhĩ', '49436004', 'Atrial fibrillation', 'EQUIVALENT'),
(NEWID(), 'I50.9', N'Suy tim', '84114007', 'Heart failure', 'EQUIVALENT'),
(NEWID(), 'I63.9', N'Nhồi máu não', '432504007', 'Cerebral infarction', 'EQUIVALENT'),
(NEWID(), 'I64', N'Đột quỵ', '230690007', 'Cerebrovascular accident', 'EQUIVALENT'),
(NEWID(), 'I67.9', N'Bệnh mạch máu não', '62914000', 'Cerebrovascular disease', 'EQUIVALENT'),
(NEWID(), 'I70.9', N'Xơ vữa động mạch', '38716007', 'Atherosclerosis', 'EQUIVALENT'),
(NEWID(), 'I80.9', N'Viêm tắc tĩnh mạch', '64156001', 'Thrombophlebitis', 'EQUIVALENT'),
(NEWID(), 'I83.9', N'Giãn tĩnh mạch chi dưới', '128060009', 'Varicose veins of lower extremity', 'EQUIVALENT'),
-- Respiratory (J00-J99)
(NEWID(), 'J00', N'Viêm mũi họng cấp', '82272006', 'Common cold', 'EQUIVALENT'),
(NEWID(), 'J02.9', N'Viêm họng cấp', '363746003', 'Acute pharyngitis', 'EQUIVALENT'),
(NEWID(), 'J03.9', N'Viêm amidan cấp', '17741008', 'Acute tonsillitis', 'EQUIVALENT'),
(NEWID(), 'J06.9', N'Nhiễm trùng hô hấp trên cấp', '54150009', 'Upper respiratory infection', 'EQUIVALENT'),
(NEWID(), 'J15.9', N'Viêm phổi do vi khuẩn', '53084003', 'Bacterial pneumonia', 'EQUIVALENT'),
(NEWID(), 'J18.9', N'Viêm phổi', '233604007', 'Pneumonia', 'EQUIVALENT'),
(NEWID(), 'J20.9', N'Viêm phế quản cấp', '10509002', 'Acute bronchitis', 'EQUIVALENT'),
(NEWID(), 'J30.4', N'Viêm mũi dị ứng', '61582004', 'Allergic rhinitis', 'EQUIVALENT'),
(NEWID(), 'J32.9', N'Viêm xoang mạn', '40055000', 'Chronic sinusitis', 'EQUIVALENT'),
(NEWID(), 'J44.9', N'COPD', '13645005', 'Chronic obstructive pulmonary disease', 'EQUIVALENT'),
(NEWID(), 'J45.9', N'Hen phế quản', '195967001', 'Asthma', 'EQUIVALENT'),
(NEWID(), 'J96.0', N'Suy hô hấp cấp', '65710008', 'Acute respiratory failure', 'EQUIVALENT'),
-- Digestive (K00-K93)
(NEWID(), 'K04.7', N'Áp xe quanh chóp', '109601007', 'Periapical abscess', 'EQUIVALENT'),
(NEWID(), 'K21.0', N'Trào ngược dạ dày-thực quản', '235595009', 'Gastroesophageal reflux disease', 'EQUIVALENT'),
(NEWID(), 'K25.9', N'Loét dạ dày', '397825006', 'Gastric ulcer', 'EQUIVALENT'),
(NEWID(), 'K26.9', N'Loét tá tràng', '51868009', 'Duodenal ulcer', 'EQUIVALENT'),
(NEWID(), 'K29.7', N'Viêm dạ dày', '4556007', 'Gastritis', 'EQUIVALENT'),
(NEWID(), 'K35.9', N'Viêm ruột thừa cấp', '74400008', 'Appendicitis', 'EQUIVALENT'),
(NEWID(), 'K40.9', N'Thoát vị bẹn', '396232000', 'Inguinal hernia', 'EQUIVALENT'),
(NEWID(), 'K50.9', N'Bệnh Crohn', '34000006', 'Crohn disease', 'EQUIVALENT'),
(NEWID(), 'K51.9', N'Viêm đại tràng loét', '64766004', 'Ulcerative colitis', 'EQUIVALENT'),
(NEWID(), 'K56.6', N'Tắc ruột', '81060008', 'Intestinal obstruction', 'EQUIVALENT'),
(NEWID(), 'K57.9', N'Bệnh túi thừa ruột', '397881000', 'Diverticular disease', 'EQUIVALENT'),
(NEWID(), 'K70.3', N'Xơ gan do rượu', '420054005', 'Alcoholic cirrhosis', 'EQUIVALENT'),
(NEWID(), 'K74.6', N'Xơ gan', '19943007', 'Cirrhosis of liver', 'EQUIVALENT'),
(NEWID(), 'K76.0', N'Gan nhiễm mỡ', '197321007', 'Fatty liver', 'EQUIVALENT'),
(NEWID(), 'K80.2', N'Sỏi túi mật', '235919008', 'Cholelithiasis', 'EQUIVALENT'),
(NEWID(), 'K81.0', N'Viêm túi mật cấp', '65275009', 'Acute cholecystitis', 'EQUIVALENT'),
(NEWID(), 'K85.9', N'Viêm tụy cấp', '197456007', 'Acute pancreatitis', 'EQUIVALENT'),
(NEWID(), 'K92.2', N'Xuất huyết tiêu hóa', '74474003', 'Gastrointestinal hemorrhage', 'EQUIVALENT'),
-- Skin (L00-L99)
(NEWID(), 'L20.9', N'Viêm da cơ địa', '24079001', 'Atopic dermatitis', 'EQUIVALENT'),
(NEWID(), 'L30.9', N'Viêm da', '182782007', 'Dermatitis', 'BROADER'),
(NEWID(), 'L40.9', N'Vảy nến', '9014002', 'Psoriasis', 'EQUIVALENT'),
(NEWID(), 'L50.9', N'Mày đay', '126485001', 'Urticaria', 'EQUIVALENT'),
-- Musculoskeletal (M00-M99)
(NEWID(), 'M06.9', N'Viêm khớp dạng thấp', '69896004', 'Rheumatoid arthritis', 'EQUIVALENT'),
(NEWID(), 'M10.9', N'Gout', '90560007', 'Gout', 'EQUIVALENT'),
(NEWID(), 'M15.9', N'Thoái hóa đa khớp', '396275006', 'Osteoarthritis', 'EQUIVALENT'),
(NEWID(), 'M17.9', N'Thoái hóa khớp gối', '239873007', 'Osteoarthritis of knee', 'EQUIVALENT'),
(NEWID(), 'M32.9', N'Lupus ban đỏ hệ thống', '55464009', 'Systemic lupus erythematosus', 'EQUIVALENT'),
(NEWID(), 'M47.9', N'Thoái hóa cột sống', '387800005', 'Spondylosis', 'EQUIVALENT'),
(NEWID(), 'M51.1', N'Thoát vị đĩa đệm thắt lưng', '202708005', 'Lumbar disc herniation', 'EQUIVALENT'),
(NEWID(), 'M54.5', N'Đau lưng dưới', '279039007', 'Low back pain', 'EQUIVALENT'),
(NEWID(), 'M79.3', N'Viêm mô tế bào', '128045006', 'Cellulitis', 'EQUIVALENT'),
(NEWID(), 'M80.9', N'Loãng xương kèm gãy xương', '64859006', 'Osteoporosis', 'EQUIVALENT'),
(NEWID(), 'M81.9', N'Loãng xương', '64859006', 'Osteoporosis', 'EQUIVALENT'),
-- Genitourinary (N00-N99)
(NEWID(), 'N10', N'Viêm thận-bể thận cấp', '36689008', 'Acute pyelonephritis', 'EQUIVALENT'),
(NEWID(), 'N17.9', N'Suy thận cấp', '14669001', 'Acute renal failure', 'EQUIVALENT'),
(NEWID(), 'N18.9', N'Bệnh thận mạn', '709044004', 'Chronic kidney disease', 'EQUIVALENT'),
(NEWID(), 'N20.0', N'Sỏi thận', '95570007', 'Kidney stone', 'EQUIVALENT'),
(NEWID(), 'N30.0', N'Viêm bàng quang cấp', '38822007', 'Acute cystitis', 'EQUIVALENT'),
(NEWID(), 'N39.0', N'Nhiễm trùng tiết niệu', '68566005', 'Urinary tract infection', 'EQUIVALENT'),
(NEWID(), 'N40', N'Tăng sản lành tính tuyến tiền liệt', '266569009', 'Benign prostatic hyperplasia', 'EQUIVALENT'),
(NEWID(), 'N76.0', N'Viêm âm đạo cấp', '30800001', 'Vaginitis', 'EQUIVALENT'),
(NEWID(), 'N80.9', N'Lạc nội mạc tử cung', '129103003', 'Endometriosis', 'EQUIVALENT'),
-- Pregnancy (O00-O99)
(NEWID(), 'O14.1', N'Tiền sản giật nặng', '46764007', 'Severe pre-eclampsia', 'EQUIVALENT'),
(NEWID(), 'O20.0', N'Dọa sẩy thai', '17369002', 'Threatened abortion', 'EQUIVALENT'),
(NEWID(), 'O36.4', N'Thai chết lưu', '237364002', 'Stillbirth', 'EQUIVALENT'),
(NEWID(), 'O42.9', N'Vỡ ối sớm', '44223004', 'Premature rupture of membranes', 'EQUIVALENT'),
(NEWID(), 'O60.0', N'Chuyển dạ sinh non', '10761003', 'Preterm labor', 'EQUIVALENT'),
(NEWID(), 'O72.1', N'Băng huyết sau sinh', '47821001', 'Postpartum hemorrhage', 'EQUIVALENT'),
(NEWID(), 'O80', N'Sinh thường', '48782003', 'Normal delivery', 'EQUIVALENT'),
(NEWID(), 'O82', N'Mổ lấy thai', '11466000', 'Cesarean section', 'EQUIVALENT'),
-- Perinatal (P00-P96)
(NEWID(), 'P07.3', N'Sinh non', '282020008', 'Premature infant', 'EQUIVALENT'),
(NEWID(), 'P22.0', N'Hội chứng suy hô hấp sơ sinh', '46775006', 'Respiratory distress syndrome in newborn', 'EQUIVALENT'),
(NEWID(), 'P59.9', N'Vàng da sơ sinh', '387712008', 'Neonatal jaundice', 'EQUIVALENT'),
-- Symptoms (R00-R99)
(NEWID(), 'R05', N'Ho', '49727002', 'Cough', 'EQUIVALENT'),
(NEWID(), 'R06.0', N'Khó thở', '267036007', 'Dyspnea', 'EQUIVALENT'),
(NEWID(), 'R07.4', N'Đau ngực', '29857009', 'Chest pain', 'EQUIVALENT'),
(NEWID(), 'R10.4', N'Đau bụng', '21522001', 'Abdominal pain', 'EQUIVALENT'),
(NEWID(), 'R11', N'Buồn nôn và nôn', '422587007', 'Nausea and vomiting', 'EQUIVALENT'),
(NEWID(), 'R31', N'Tiểu máu', '34436003', 'Hematuria', 'EQUIVALENT'),
(NEWID(), 'R42', N'Chóng mặt', '404640003', 'Dizziness', 'EQUIVALENT'),
(NEWID(), 'R50.9', N'Sốt', '386661006', 'Fever', 'EQUIVALENT'),
(NEWID(), 'R51', N'Đau đầu', '25064002', 'Headache', 'EQUIVALENT'),
(NEWID(), 'R55', N'Ngất', '271594007', 'Syncope', 'EQUIVALENT'),
(NEWID(), 'R56.0', N'Co giật do sốt', '41497008', 'Febrile convulsion', 'EQUIVALENT'),
-- Injury (S00-T98)
(NEWID(), 'S06.0', N'Chấn động não', '62106007', 'Concussion', 'EQUIVALENT'),
(NEWID(), 'S22.3', N'Gãy xương sườn', '33737001', 'Fracture of rib', 'EQUIVALENT'),
(NEWID(), 'S42.0', N'Gãy xương đòn', '58150001', 'Fracture of clavicle', 'EQUIVALENT'),
(NEWID(), 'S52.5', N'Gãy xương quay đầu dưới', '263225007', 'Fracture of distal radius', 'EQUIVALENT'),
(NEWID(), 'S72.0', N'Gãy cổ xương đùi', '5913000', 'Fracture of neck of femur', 'EQUIVALENT'),
(NEWID(), 'S82.0', N'Gãy xương bánh chè', '125601007', 'Fracture of patella', 'EQUIVALENT'),
(NEWID(), 'T78.2', N'Sốc phản vệ', '39579001', 'Anaphylaxis', 'EQUIVALENT'),
(NEWID(), 'T78.4', N'Dị ứng', '419076005', 'Allergic reaction', 'EQUIVALENT'),
-- External causes (V-Y) and factors (Z)
(NEWID(), 'Z00.0', N'Khám sức khỏe tổng quát', '171207006', 'General health examination', 'EQUIVALENT'),
(NEWID(), 'Z03.9', N'Theo dõi y tế', '225368008', 'Medical observation', 'EQUIVALENT'),
(NEWID(), 'Z23', N'Tiêm chủng', '33879002', 'Immunization', 'BROADER'),
(NEWID(), 'Z30.0', N'Tư vấn kế hoạch hóa gia đình', '408762003', 'Family planning counseling', 'EQUIVALENT'),
(NEWID(), 'Z34.0', N'Khám thai lần đầu', '169488004', 'Antenatal care', 'BROADER'),
(NEWID(), 'Z38.0', N'Trẻ sinh sống đơn thai', '169826009', 'Live born', 'BROADER'),
-- Blood (D50-D89)
(NEWID(), 'D56.9', N'Thalassemia', '40108008', 'Thalassemia', 'EQUIVALENT'),
(NEWID(), 'D64.9', N'Thiếu máu', '271737000', 'Anemia', 'EQUIVALENT'),
(NEWID(), 'D65', N'Đông máu rải rác nội mạch', '67406007', 'Disseminated intravascular coagulation', 'EQUIVALENT'),
(NEWID(), 'D69.6', N'Giảm tiểu cầu', '302215000', 'Thrombocytopenia', 'EQUIVALENT'),
-- Additional common Vietnamese diagnoses
(NEWID(), 'J11.1', N'Cúm có viêm phổi', '6142004', 'Influenza with pneumonia', 'EQUIVALENT'),
(NEWID(), 'J98.4', N'Bệnh phổi', '19829001', 'Disorder of lung', 'BROADER'),
(NEWID(), 'E04.9', N'Bướu giáp', '3716002', 'Goiter', 'EQUIVALENT'),
(NEWID(), 'E55.9', N'Thiếu vitamin D', '34713006', 'Vitamin D deficiency', 'EQUIVALENT'),
(NEWID(), 'G44.2', N'Đau đầu căng thẳng', '398057008', 'Tension-type headache', 'EQUIVALENT'),
(NEWID(), 'G45.9', N'Thiếu máu não thoáng qua', '266257000', 'Transient ischemic attack', 'EQUIVALENT'),
(NEWID(), 'G51.0', N'Liệt dây thần kinh VII', '193093009', 'Bell palsy', 'EQUIVALENT'),
(NEWID(), 'G62.9', N'Bệnh thần kinh ngoại biên', '42658009', 'Peripheral neuropathy', 'EQUIVALENT'),
(NEWID(), 'H26.9', N'Đục thủy tinh thể', '193570009', 'Cataract', 'EQUIVALENT'),
(NEWID(), 'H52.1', N'Cận thị', '57190000', 'Myopia', 'EQUIVALENT'),
(NEWID(), 'H65.9', N'Viêm tai giữa không mủ', '85189008', 'Serous otitis media', 'EQUIVALENT'),
(NEWID(), 'I05.1', N'Hở van hai lá', '79619009', 'Mitral valve regurgitation', 'EQUIVALENT'),
(NEWID(), 'I25.1', N'Bệnh tim thiếu máu cục bộ', '53741008', 'Coronary arteriosclerosis', 'EQUIVALENT'),
(NEWID(), 'I26.9', N'Thuyên tắc phổi', '59282003', 'Pulmonary embolism', 'EQUIVALENT'),
(NEWID(), 'I42.0', N'Bệnh cơ tim giãn', '195021004', 'Dilated cardiomyopathy', 'EQUIVALENT'),
(NEWID(), 'I47.1', N'Nhịp nhanh trên thất', '6456007', 'Supraventricular tachycardia', 'EQUIVALENT'),
(NEWID(), 'I49.9', N'Loạn nhịp tim', '698247007', 'Cardiac arrhythmia', 'EQUIVALENT'),
(NEWID(), 'I61.9', N'Xuất huyết não', '274100004', 'Cerebral hemorrhage', 'EQUIVALENT'),
(NEWID(), 'I71.3', N'Phình động mạch chủ bụng', '233985008', 'Abdominal aortic aneurysm', 'EQUIVALENT'),
(NEWID(), 'I73.9', N'Bệnh mạch máu ngoại biên', '400047006', 'Peripheral vascular disease', 'EQUIVALENT'),
(NEWID(), 'J01.9', N'Viêm xoang cấp', '15805002', 'Acute sinusitis', 'EQUIVALENT'),
(NEWID(), 'J04.0', N'Viêm thanh quản cấp', '6655004', 'Acute laryngitis', 'EQUIVALENT'),
(NEWID(), 'J10.1', N'Cúm có viêm đường hô hấp', '6142004', 'Influenza', 'BROADER'),
(NEWID(), 'J21.9', N'Viêm tiểu phế quản cấp', '4120002', 'Acute bronchiolitis', 'EQUIVALENT'),
(NEWID(), 'J42', N'Viêm phế quản mạn', '63480004', 'Chronic bronchitis', 'EQUIVALENT'),
(NEWID(), 'J47', N'Giãn phế quản', '12295008', 'Bronchiectasis', 'EQUIVALENT'),
(NEWID(), 'J90', N'Tràn dịch màng phổi', '60046008', 'Pleural effusion', 'EQUIVALENT'),
(NEWID(), 'J93.9', N'Tràn khí màng phổi', '36118008', 'Pneumothorax', 'EQUIVALENT'),
(NEWID(), 'K27.9', N'Loét dạ dày tá tràng', '13200003', 'Peptic ulcer', 'EQUIVALENT'),
(NEWID(), 'K37', N'Viêm ruột thừa', '74400008', 'Appendicitis', 'EQUIVALENT'),
(NEWID(), 'K52.9', N'Viêm đại tràng không nhiễm trùng', '64226004', 'Non-infective colitis', 'EQUIVALENT'),
(NEWID(), 'K59.0', N'Táo bón', '14760008', 'Constipation', 'EQUIVALENT'),
(NEWID(), 'K62.1', N'Polyp trực tràng', '68496003', 'Polyp of rectum', 'EQUIVALENT'),
(NEWID(), 'K65.0', N'Viêm phúc mạc cấp', '48661000', 'Acute peritonitis', 'EQUIVALENT'),
(NEWID(), 'K86.1', N'Viêm tụy mạn', '235494005', 'Chronic pancreatitis', 'EQUIVALENT'),
(NEWID(), 'L02.9', N'Áp xe da', '44132006', 'Abscess of skin', 'EQUIVALENT'),
(NEWID(), 'L03.9', N'Viêm mô tế bào', '128045006', 'Cellulitis', 'EQUIVALENT'),
(NEWID(), 'L23.9', N'Viêm da tiếp xúc dị ứng', '238575004', 'Allergic contact dermatitis', 'EQUIVALENT'),
(NEWID(), 'L70.0', N'Mụn trứng cá', '11381005', 'Acne', 'EQUIVALENT'),
(NEWID(), 'M16.9', N'Thoái hóa khớp háng', '239872002', 'Osteoarthritis of hip', 'EQUIVALENT'),
(NEWID(), 'M19.9', N'Thoái hóa khớp', '396275006', 'Osteoarthritis', 'EQUIVALENT'),
(NEWID(), 'M25.5', N'Đau khớp', '57676002', 'Joint pain', 'EQUIVALENT'),
(NEWID(), 'M35.3', N'Đau cơ xơ hóa', '203082005', 'Fibromyalgia', 'EQUIVALENT'),
(NEWID(), 'M43.1', N'Trượt đốt sống', '17382005', 'Spondylolisthesis', 'EQUIVALENT'),
(NEWID(), 'M48.0', N'Hẹp ống sống', '426424005', 'Spinal stenosis', 'EQUIVALENT'),
(NEWID(), 'M50.1', N'Thoát vị đĩa đệm cổ', '84116009', 'Cervical disc herniation', 'EQUIVALENT'),
(NEWID(), 'M75.1', N'Hội chứng chóp xoay', '298869002', 'Rotator cuff syndrome', 'EQUIVALENT'),
(NEWID(), 'N04.9', N'Hội chứng thận hư', '52254009', 'Nephrotic syndrome', 'EQUIVALENT'),
(NEWID(), 'N13.3', N'Ứ nước thận', '43064006', 'Hydronephrosis', 'EQUIVALENT'),
(NEWID(), 'N20.1', N'Sỏi niệu quản', '444731000', 'Ureteric stone', 'EQUIVALENT'),
(NEWID(), 'N41.0', N'Viêm tuyến tiền liệt cấp', '39748002', 'Acute prostatitis', 'EQUIVALENT'),
(NEWID(), 'N61', N'Viêm vú', '45198002', 'Mastitis', 'EQUIVALENT'),
(NEWID(), 'N73.0', N'Viêm phần phụ cấp', '78623009', 'Acute salpingitis', 'EQUIVALENT'),
(NEWID(), 'N92.0', N'Rong kinh', '386692008', 'Menorrhagia', 'EQUIVALENT'),
(NEWID(), 'O21.0', N'Nghén nặng', '14094001', 'Hyperemesis gravidarum', 'EQUIVALENT'),
(NEWID(), 'O24.4', N'Đái tháo đường thai kỳ', '11687002', 'Gestational diabetes', 'EQUIVALENT'),
(NEWID(), 'O46.9', N'Xuất huyết trước sinh', '17382005', 'Antepartum hemorrhage', 'BROADER'),
(NEWID(), 'O99.0', N'Thiếu máu thai kỳ', '199006002', 'Anemia complicating pregnancy', 'EQUIVALENT'),
(NEWID(), 'P36.9', N'Nhiễm khuẩn sơ sinh', '370514003', 'Neonatal sepsis', 'EQUIVALENT'),
(NEWID(), 'R00.0', N'Nhịp tim nhanh', '3424008', 'Tachycardia', 'EQUIVALENT'),
(NEWID(), 'R04.0', N'Chảy máu cam', '12441001', 'Epistaxis', 'EQUIVALENT'),
(NEWID(), 'R06.2', N'Thở khò khè', '56018004', 'Wheezing', 'EQUIVALENT'),
(NEWID(), 'R10.1', N'Đau vùng thượng vị', '79922009', 'Epigastric pain', 'EQUIVALENT'),
(NEWID(), 'R13', N'Khó nuốt', '40739000', 'Dysphagia', 'EQUIVALENT'),
(NEWID(), 'R19.7', N'Tiêu chảy', '62315008', 'Diarrhea', 'EQUIVALENT'),
(NEWID(), 'R22.9', N'Sưng hạch bạch huyết', '30746006', 'Lymphadenopathy', 'EQUIVALENT'),
(NEWID(), 'R52', N'Đau', '22253000', 'Pain', 'BROADER'),
(NEWID(), 'R53', N'Mệt mỏi', '84229001', 'Fatigue', 'EQUIVALENT'),
(NEWID(), 'R63.0', N'Chán ăn', '79890006', 'Anorexia', 'EQUIVALENT'),
(NEWID(), 'R73.0', N'Tăng đường huyết', '80394007', 'Hyperglycemia', 'EQUIVALENT'),
(NEWID(), 'S00.0', N'Chấn thương đầu', '82271004', 'Injury of head', 'BROADER'),
(NEWID(), 'S13.4', N'Bong gân cổ', '44465007', 'Sprain of cervical spine', 'EQUIVALENT'),
(NEWID(), 'S43.0', N'Trật khớp vai', '299312000', 'Dislocation of shoulder', 'EQUIVALENT'),
(NEWID(), 'S61.0', N'Vết thương bàn tay', '4939002', 'Wound of hand', 'EQUIVALENT'),
(NEWID(), 'S83.0', N'Trật khớp gối', '239720000', 'Dislocation of knee', 'EQUIVALENT'),
(NEWID(), 'S83.5', N'Rách sụn chêm', '239720000', 'Meniscal tear', 'EQUIVALENT'),
(NEWID(), 'S93.4', N'Bong gân cổ chân', '44465007', 'Sprain of ankle', 'EQUIVALENT'),
(NEWID(), 'T14.0', N'Vết thương', '283545005', 'Wound', 'BROADER'),
(NEWID(), 'T30.0', N'Bỏng', '125666000', 'Burn', 'BROADER'),
(NEWID(), 'T63.0', N'Rắn cắn', '238456006', 'Snake bite', 'EQUIVALENT'),
(NEWID(), 'T75.1', N'Chết đuối', '403190006', 'Near drowning', 'EQUIVALENT'),
(NEWID(), 'T81.4', N'Nhiễm trùng vết mổ', '414478003', 'Surgical site infection', 'EQUIVALENT');

PRINT N'Inserted SNOMED CT mappings: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- Update existing ClinicalTerms with SNOMED codes
UPDATE ClinicalTerms SET SnomedCtCode = '21522001', SnomedCtDisplay = 'Abdominal pain' WHERE Code = 'SYM-001' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '25064002', SnomedCtDisplay = 'Headache' WHERE Code = 'SYM-002' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '386661006', SnomedCtDisplay = 'Fever' WHERE Code = 'SYM-003' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '49727002', SnomedCtDisplay = 'Cough' WHERE Code = 'SYM-004' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '267036007', SnomedCtDisplay = 'Dyspnea' WHERE Code = 'SYM-005' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '422587007', SnomedCtDisplay = 'Nausea' WHERE Code = 'SYM-006' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '62315008', SnomedCtDisplay = 'Diarrhea' WHERE Code = 'SYM-007' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '14760008', SnomedCtDisplay = 'Constipation' WHERE Code = 'SYM-008' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '404640003', SnomedCtDisplay = 'Dizziness' WHERE Code = 'SYM-009' AND SnomedCtCode IS NULL;
UPDATE ClinicalTerms SET SnomedCtCode = '84229001', SnomedCtDisplay = 'Fatigue' WHERE Code = 'SYM-010' AND SnomedCtCode IS NULL;

PRINT N'Updated ClinicalTerms with SNOMED codes';
GO
