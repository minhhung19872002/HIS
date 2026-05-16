-- Create ClinicalTerms table and seed common Vietnamese medical terms
-- Thuat ngu lam sang - BV tu khai bao (NangCap EMR 1.5)

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ClinicalTerms')
BEGIN
    CREATE TABLE ClinicalTerms (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(50) NOT NULL,
        Name NVARCHAR(500) NOT NULL,
        NameEnglish NVARCHAR(500) NULL,
        Category NVARCHAR(50) NOT NULL,  -- Symptom, Sign, Examination, ReviewOfSystems, Procedure, Other
        BodySystem NVARCHAR(50) NULL,    -- General, Cardiovascular, Respiratory, GI, Neuro, MSK, Skin, ENT, Eye, Urogenital
        Description NVARCHAR(1000) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedBy NVARCHAR(450) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL
    );
    CREATE INDEX IX_ClinicalTerms_Category ON ClinicalTerms(Category);
    CREATE INDEX IX_ClinicalTerms_BodySystem ON ClinicalTerms(BodySystem);
    PRINT 'Created ClinicalTerms table';
END
GO

-- Seed common symptoms (Trieu chung)
INSERT INTO ClinicalTerms (Id, Code, Name, NameEnglish, Category, BodySystem, SortOrder) VALUES
-- General symptoms
(NEWID(), 'SYM-G01', N'Sốt', 'Fever', 'Symptom', 'General', 1),
(NEWID(), 'SYM-G02', N'Sốt cao', 'High fever', 'Symptom', 'General', 2),
(NEWID(), 'SYM-G03', N'Ớn lạnh', 'Chills', 'Symptom', 'General', 3),
(NEWID(), 'SYM-G04', N'Mệt mỏi', 'Fatigue', 'Symptom', 'General', 4),
(NEWID(), 'SYM-G05', N'Sụt cân', 'Weight loss', 'Symptom', 'General', 5),
(NEWID(), 'SYM-G06', N'Chán ăn', 'Anorexia', 'Symptom', 'General', 6),
(NEWID(), 'SYM-G07', N'Đau đầu', 'Headache', 'Symptom', 'General', 7),
(NEWID(), 'SYM-G08', N'Chóng mặt', 'Dizziness', 'Symptom', 'General', 8),
(NEWID(), 'SYM-G09', N'Phù', 'Edema', 'Symptom', 'General', 9),
(NEWID(), 'SYM-G10', N'Vã mồ hôi', 'Diaphoresis', 'Symptom', 'General', 10),

-- Respiratory symptoms
(NEWID(), 'SYM-R01', N'Ho khan', 'Dry cough', 'Symptom', 'Respiratory', 11),
(NEWID(), 'SYM-R02', N'Ho có đàm', 'Productive cough', 'Symptom', 'Respiratory', 12),
(NEWID(), 'SYM-R03', N'Khó thở', 'Dyspnea', 'Symptom', 'Respiratory', 13),
(NEWID(), 'SYM-R04', N'Đau ngực khi thở', 'Pleuritic chest pain', 'Symptom', 'Respiratory', 14),
(NEWID(), 'SYM-R05', N'Khò khè', 'Wheezing', 'Symptom', 'Respiratory', 15),
(NEWID(), 'SYM-R06', N'Đau họng', 'Sore throat', 'Symptom', 'Respiratory', 16),
(NEWID(), 'SYM-R07', N'Nghẹt mũi', 'Nasal congestion', 'Symptom', 'Respiratory', 17),
(NEWID(), 'SYM-R08', N'Chảy mũi', 'Rhinorrhea', 'Symptom', 'Respiratory', 18),
(NEWID(), 'SYM-R09', N'Ho ra máu', 'Hemoptysis', 'Symptom', 'Respiratory', 19),

-- Cardiovascular symptoms
(NEWID(), 'SYM-C01', N'Đau ngực', 'Chest pain', 'Symptom', 'Cardiovascular', 20),
(NEWID(), 'SYM-C02', N'Hồi hộp', 'Palpitations', 'Symptom', 'Cardiovascular', 21),
(NEWID(), 'SYM-C03', N'Khó thở khi nằm', 'Orthopnea', 'Symptom', 'Cardiovascular', 22),
(NEWID(), 'SYM-C04', N'Phù chân', 'Pedal edema', 'Symptom', 'Cardiovascular', 23),
(NEWID(), 'SYM-C05', N'Tím tái', 'Cyanosis', 'Symptom', 'Cardiovascular', 24),

-- GI symptoms
(NEWID(), 'SYM-D01', N'Đau bụng', 'Abdominal pain', 'Symptom', 'GI', 25),
(NEWID(), 'SYM-D02', N'Buồn nôn', 'Nausea', 'Symptom', 'GI', 26),
(NEWID(), 'SYM-D03', N'Nôn', 'Vomiting', 'Symptom', 'GI', 27),
(NEWID(), 'SYM-D04', N'Tiêu chảy', 'Diarrhea', 'Symptom', 'GI', 28),
(NEWID(), 'SYM-D05', N'Táo bón', 'Constipation', 'Symptom', 'GI', 29),
(NEWID(), 'SYM-D06', N'Đầy hơi', 'Bloating', 'Symptom', 'GI', 30),
(NEWID(), 'SYM-D07', N'Nôn ra máu', 'Hematemesis', 'Symptom', 'GI', 31),
(NEWID(), 'SYM-D08', N'Đi ngoài phân đen', 'Melena', 'Symptom', 'GI', 32),

-- Neurological symptoms
(NEWID(), 'SYM-N01', N'Tê bì tay chân', 'Numbness/tingling', 'Symptom', 'Neuro', 33),
(NEWID(), 'SYM-N02', N'Yếu liệt', 'Weakness/paralysis', 'Symptom', 'Neuro', 34),
(NEWID(), 'SYM-N03', N'Co giật', 'Seizures', 'Symptom', 'Neuro', 35),
(NEWID(), 'SYM-N04', N'Hôn mê', 'Coma', 'Symptom', 'Neuro', 36),
(NEWID(), 'SYM-N05', N'Mất ý thức', 'Loss of consciousness', 'Symptom', 'Neuro', 37),

-- MSK symptoms
(NEWID(), 'SYM-M01', N'Đau khớp', 'Arthralgia', 'Symptom', 'MSK', 38),
(NEWID(), 'SYM-M02', N'Sưng khớp', 'Joint swelling', 'Symptom', 'MSK', 39),
(NEWID(), 'SYM-M03', N'Đau lưng', 'Back pain', 'Symptom', 'MSK', 40),
(NEWID(), 'SYM-M04', N'Đau cơ', 'Myalgia', 'Symptom', 'MSK', 41),

-- Skin symptoms
(NEWID(), 'SYM-S01', N'Phát ban', 'Rash', 'Symptom', 'Skin', 42),
(NEWID(), 'SYM-S02', N'Ngứa', 'Pruritus', 'Symptom', 'Skin', 43),
(NEWID(), 'SYM-S03', N'Nổi mề đay', 'Urticaria', 'Symptom', 'Skin', 44),

-- Physical examination signs (Dau hieu kham lam sang)
(NEWID(), 'SGN-G01', N'Thiếu máu', 'Anemia', 'Sign', 'General', 1),
(NEWID(), 'SGN-G02', N'Vàng da', 'Jaundice', 'Sign', 'General', 2),
(NEWID(), 'SGN-G03', N'Hạch to', 'Lymphadenopathy', 'Sign', 'General', 3),
(NEWID(), 'SGN-C01', N'Ran phổi', 'Lung crackles', 'Sign', 'Respiratory', 4),
(NEWID(), 'SGN-C02', N'Ran ngáy', 'Rhonchi', 'Sign', 'Respiratory', 5),
(NEWID(), 'SGN-C03', N'Giảm rì rào phế nang', 'Decreased breath sounds', 'Sign', 'Respiratory', 6),
(NEWID(), 'SGN-H01', N'Tiếng thổi tim', 'Heart murmur', 'Sign', 'Cardiovascular', 7),
(NEWID(), 'SGN-H02', N'Nhịp tim không đều', 'Irregular heart rhythm', 'Sign', 'Cardiovascular', 8),
(NEWID(), 'SGN-D01', N'Bụng chướng', 'Abdominal distension', 'Sign', 'GI', 9),
(NEWID(), 'SGN-D02', N'Phản ứng thành bụng', 'Abdominal guarding', 'Sign', 'GI', 10),
(NEWID(), 'SGN-D03', N'Gan to', 'Hepatomegaly', 'Sign', 'GI', 11),
(NEWID(), 'SGN-D04', N'Lách to', 'Splenomegaly', 'Sign', 'GI', 12),
(NEWID(), 'SGN-N01', N'Cứng gáy', 'Neck stiffness', 'Sign', 'Neuro', 13),
(NEWID(), 'SGN-N02', N'Babinski dương tính', 'Positive Babinski', 'Sign', 'Neuro', 14);

PRINT 'Seeded clinical terms: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows';
GO
