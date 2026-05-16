-- ============================================================
-- LIS SEED DATA - Comprehensive
-- ============================================================
USE HIS;
GO

-- Key IDs:
-- AnalyzerId: E307A8D8-3678-49BC-2CB4-08DE69E8B16E
-- PatientId: 8706EF84-0E32-47C4-B678-097C03E7842D
-- DeptId (Noi): B1126838-0C70-4869-ACBA-CD5AE3D41A76
-- DoctorId (Admin): 9E5309DC-ECF9-4D48-9A09-224CD15347B1

-- 0. Fix existing analyzer (IsDeleted=1 -> 0)
UPDATE LabAnalyzers SET IsDeleted = 0, IsActive = 1 WHERE Id = 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E';

-- Add more analyzers
INSERT INTO LabAnalyzers (Id, Code, Name, Manufacturer, Model, Protocol, ConnectionMethod, ConnectionType, IpAddress, Port, Status, IsActive, IsDeleted, CreatedAt, Notes) VALUES
(NEWID(), N'BC-6800', N'May huyet hoc Mindray BC-6800', N'Mindray', N'BC-6800', 2, 2, 2, N'192.168.1.50', 9100, 1, 1, 0, GETDATE(), N'May dem huyet hoc tu dong 6 thanh phan'),
(NEWID(), N'BS-800M', N'May sinh hoa Mindray BS-800M', N'Mindray', N'BS-800M', 2, 2, 2, N'192.168.1.51', 9101, 1, 1, 0, GETDATE(), N'May sinh hoa tu dong 800 test/gio'),
(NEWID(), N'CL-2000i', N'May mien dich Mindray CL-2000i', N'Mindray', N'CL-2000i', 1, 2, 2, N'192.168.1.52', 9102, 1, 1, 0, GETDATE(), N'May mien dich hoa phat quang'),
(NEWID(), N'UA-66', N'May nuoc tieu Sysmex UA-66', N'Sysmex', N'UA-66', 3, 1, 1, NULL, NULL, 1, 1, 0, GETDATE(), N'May phan tich nuoc tieu');
GO

-- 1. LabTestGroups
INSERT INTO LabTestGroups (Id, Code, Name, SortOrder, Description, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'HUYET_HOC', N'Huyet hoc', 1, N'Cac xet nghiem huyet hoc: CTM, dong mau', 1, 0, GETDATE()),
(NEWID(), N'SINH_HOA', N'Sinh hoa', 2, N'Cac xet nghiem sinh hoa: Glucose, GOT, GPT, Ure, Creatinin', 1, 0, GETDATE()),
(NEWID(), N'MIEN_DICH', N'Mien dich', 3, N'Cac xet nghiem mien dich: HBsAg, Anti-HCV, HIV', 1, 0, GETDATE()),
(NEWID(), N'NUOC_TIEU', N'Nuoc tieu', 4, N'Tong phan tich nuoc tieu', 1, 0, GETDATE()),
(NEWID(), N'DONG_MAU', N'Dong mau', 5, N'Cac xet nghiem dong mau: PT, aPTT, Fibrinogen', 1, 0, GETDATE()),
(NEWID(), N'VI_SINH', N'Vi sinh', 6, N'Cay vi khuan, khang sinh do', 1, 0, GETDATE()),
(NEWID(), N'KHI_MAU', N'Khi mau', 7, N'Khi mau dong mach: pH, pCO2, pO2, HCO3', 1, 0, GETDATE());
GO

-- 2. LabAnalyzerTestMappings (map HIS codes to analyzer codes)
DECLARE @analyzerHL7 UNIQUEIDENTIFIER = 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E';
DECLARE @svcCTM UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_CTM');
DECLARE @svcGOT UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_GOT');
DECLARE @svcGPT UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_GPT');
DECLARE @svcCREA UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_CREATININ');
DECLARE @svcURE UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_URE');
DECLARE @svcDMM UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_DMM');
DECLARE @svcHBA1C UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_HBA1C');

INSERT INTO LabAnalyzerTestMappings (Id, AnalyzerId, ServiceId, HisTestCode, HisTestName, AnalyzerTestCode, AnalyzerTestName, ConversionFactor, Unit, IsActive, IsDeleted, CreatedAt) VALUES
-- CTM subtests
(NEWID(), @analyzerHL7, @svcCTM, N'WBC', N'Bach cau', N'WBC', N'White Blood Cell', 1.0, N'G/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'RBC', N'Hong cau', N'RBC', N'Red Blood Cell', 1.0, N'T/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'HGB', N'Hemoglobin', N'HGB', N'Hemoglobin', 1.0, N'g/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'HCT', N'Hematocrit', N'HCT', N'Hematocrit', 1.0, N'%', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'PLT', N'Tieu cau', N'PLT', N'Platelet', 1.0, N'G/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'MCV', N'MCV', N'MCV', N'Mean Corpuscular Volume', 1.0, N'fL', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'MCH', N'MCH', N'MCH', N'Mean Corpuscular Hemoglobin', 1.0, N'pg', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'MCHC', N'MCHC', N'MCHC', N'Mean Corpuscular Hgb Conc', 1.0, N'g/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'NEU', N'Neutrophil', N'NEU%', N'Neutrophil %', 1.0, N'%', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCTM, N'LYM', N'Lymphocyte', N'LYM%', N'Lymphocyte %', 1.0, N'%', 1, 0, GETDATE()),
-- Sinh hoa
(NEWID(), @analyzerHL7, @svcGOT, N'GOT', N'GOT (AST)', N'AST', N'Aspartate Aminotransferase', 1.0, N'U/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcGPT, N'GPT', N'GPT (ALT)', N'ALT', N'Alanine Aminotransferase', 1.0, N'U/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcCREA, N'CREATININ', N'Creatinin', N'CREA', N'Creatinine', 1.0, N'umol/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcURE, N'URE', N'Ure', N'UREA', N'Urea Nitrogen', 1.0, N'mmol/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcDMM, N'GLU', N'Glucose', N'GLU', N'Glucose', 1.0, N'mmol/L', 1, 0, GETDATE()),
(NEWID(), @analyzerHL7, @svcHBA1C, N'HBA1C', N'HbA1c', N'A1C', N'Hemoglobin A1c', 1.0, N'%', 1, 0, GETDATE());
GO

-- 3. LabConclusionTemplates
INSERT INTO LabConclusionTemplates (Id, TestCode, TemplateCode, TemplateName, ConclusionText, Condition, SortOrder, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'GLU', N'GLU_NORMAL', N'Glucose binh thuong', N'Glucose mau trong gioi han binh thuong', N'3.9<=value<=6.1', 1, 1, 0, GETDATE()),
(NEWID(), N'GLU', N'GLU_HIGH', N'Glucose tang', N'Tang glucose mau. De nghi lam them HbA1c, glucose nhan doi de xac dinh', N'value>6.1', 2, 1, 0, GETDATE()),
(NEWID(), N'GLU', N'GLU_LOW', N'Glucose ha', N'Ha glucose mau. De nghi theo doi va bo sung duong', N'value<3.9', 3, 1, 0, GETDATE()),
(NEWID(), N'HBA1C', N'HBA1C_NORMAL', N'HbA1c binh thuong', N'HbA1c trong gioi han binh thuong, chua co bang chung dai thao duong', N'value<5.7', 1, 1, 0, GETDATE()),
(NEWID(), N'HBA1C', N'HBA1C_PREDIABET', N'Tien dai thao duong', N'HbA1c trong khoang tien dai thao duong. De nghi thay doi loi song, tai kiem tra sau 3 thang', N'5.7<=value<=6.4', 2, 1, 0, GETDATE()),
(NEWID(), N'HBA1C', N'HBA1C_DIABET', N'Dai thao duong', N'HbA1c cao, phu hop chan doan dai thao duong. De nghi kham chuyen khoa noi tiet', N'value>=6.5', 3, 1, 0, GETDATE()),
(NEWID(), N'GOT', N'GOT_NORMAL', N'GOT binh thuong', N'GOT (AST) trong gioi han binh thuong', N'value<=40', 1, 1, 0, GETDATE()),
(NEWID(), N'GOT', N'GOT_HIGH', N'GOT tang', N'Tang GOT (AST). De nghi kiem tra them GPT, GGT, Bilirubin de danh gia chuc nang gan', N'value>40', 2, 1, 0, GETDATE()),
(NEWID(), N'GPT', N'GPT_NORMAL', N'GPT binh thuong', N'GPT (ALT) trong gioi han binh thuong', N'value<=40', 1, 1, 0, GETDATE()),
(NEWID(), N'GPT', N'GPT_HIGH', N'GPT tang', N'Tang GPT (ALT). Can danh gia them GOT, GGT, Bilirubin', N'value>40', 2, 1, 0, GETDATE()),
(NEWID(), N'WBC', N'WBC_NORMAL', N'Bach cau binh thuong', N'So luong bach cau trong gioi han binh thuong', N'4.0<=value<=10.0', 1, 1, 0, GETDATE()),
(NEWID(), N'WBC', N'WBC_HIGH', N'Tang bach cau', N'Tang so luong bach cau. Can kiem tra them cong thuc bach cau, CRP de xac dinh nguyen nhan', N'value>10.0', 2, 1, 0, GETDATE()),
(NEWID(), N'WBC', N'WBC_LOW', N'Giam bach cau', N'Giam so luong bach cau. Can theo doi va kiem tra lai', N'value<4.0', 3, 1, 0, GETDATE()),
(NEWID(), N'CREATININ', N'CREA_NORMAL', N'Creatinin binh thuong', N'Creatinin mau trong gioi han binh thuong. Chuc nang than on dinh.', N'value<=106', 1, 1, 0, GETDATE()),
(NEWID(), N'CREATININ', N'CREA_HIGH', N'Creatinin tang', N'Tang creatinin mau. De nghi danh gia chuc nang than them (eGFR, protein nieu)', N'value>106', 2, 1, 0, GETDATE());
GO

-- 4. LabCriticalValueConfigs
DECLARE @svcCTM2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_CTM');
DECLARE @svcGOT2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_GOT');
DECLARE @svcGPT2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_GPT');
DECLARE @svcCREA2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_CREATININ');
DECLARE @svcDMM2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_DMM');
DECLARE @svcHBA1C2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Services WHERE ServiceCode='XN_HBA1C');

INSERT INTO LabCriticalValueConfigs (Id, ServiceId, TestCode, CriticalLow, CriticalHigh, PanicLow, PanicHigh, RequireAcknowledgment, AcknowledgmentTimeoutMinutes, NotificationMethod, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), @svcCTM2, N'WBC', 1.0, 30.0, 0.5, 50.0, 1, 30, N'Phone,SMS', 1, 0, GETDATE()),
(NEWID(), @svcCTM2, N'HGB', 70, 200, 50, 220, 1, 30, N'Phone,SMS', 1, 0, GETDATE()),
(NEWID(), @svcCTM2, N'PLT', 50, 1000, 20, 1500, 1, 30, N'Phone,SMS', 1, 0, GETDATE()),
(NEWID(), @svcDMM2, N'GLU', 2.0, 25.0, 1.5, 33.0, 1, 15, N'Phone,SMS', 1, 0, GETDATE()),
(NEWID(), @svcGOT2, N'GOT', NULL, 200, NULL, 500, 1, 30, N'Phone', 1, 0, GETDATE()),
(NEWID(), @svcGPT2, N'GPT', NULL, 200, NULL, 500, 1, 30, N'Phone', 1, 0, GETDATE()),
(NEWID(), @svcCREA2, N'CREATININ', NULL, 500, NULL, 1000, 1, 30, N'Phone', 1, 0, GETDATE()),
(NEWID(), @svcHBA1C2, N'HBA1C', NULL, 14.0, NULL, 18.0, 1, 60, N'Phone', 1, 0, GETDATE());
GO

-- 5. Add more LabOrders (different patients, different statuses)
DECLARE @pat1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Patients WHERE PatientCode IS NOT NULL ORDER BY CreatedAt);
DECLARE @pat2 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Patients WHERE PatientCode IS NOT NULL ORDER BY NEWID());
DECLARE @pat3 UNIQUEIDENTIFIER = (SELECT Id FROM Patients WHERE Id = '9412E970-CD28-4C46-8CB6-0321CC30EBFA');
DECLARE @deptNoi UNIQUEIDENTIFIER = 'B1126838-0C70-4869-ACBA-CD5AE3D41A76';
DECLARE @doctor UNIQUEIDENTIFIER = '9E5309DC-ECF9-4D48-9A09-224CD15347B1';

DECLARE @ord4 UNIQUEIDENTIFIER = NEWID();
DECLARE @ord5 UNIQUEIDENTIFIER = NEWID();
DECLARE @ord6 UNIQUEIDENTIFIER = NEWID();
DECLARE @ord7 UNIQUEIDENTIFIER = NEWID();

-- New orders with various statuses
INSERT INTO LabOrders (Id, OrderCode, PatientId, OrderDepartmentId, OrderDoctorId, Diagnosis, IcdCode, Status, IsPriority, IsEmergency, SampleBarcode, SampleType, Notes, OrderedAt, CreatedAt, IsDeleted) VALUES
(@ord4, N'XN202602230001', @pat1, @deptNoi, @doctor, N'Kham suc khoe dinh ky', N'Z00', 0, 0, 0, NULL, N'BLOOD', N'Xet nghiem dinh ky', GETDATE(), GETDATE(), 0),
(@ord5, N'XN202602230002', @pat2, @deptNoi, @doctor, N'Tang huyet ap', N'I10', 1, 0, 0, N'BC2602230002', N'BLOOD', N'BN tang huyet ap, xet nghiem theo doi', GETDATE(), GETDATE(), 0),
(@ord6, N'XN202602230003', @pat3, @deptNoi, @doctor, N'Dai thao duong type 2', N'E11', 2, 1, 0, N'BC2602230003', N'BLOOD', N'BN DTD - kiem tra HbA1c va glucose', GETDATE(), GETDATE(), 0),
(@ord7, N'XN202602230004', @pat1, @deptNoi, @doctor, N'Viem gan B', N'B18.1', 3, 0, 0, N'BC2602230004', N'SERUM', N'Theo doi viem gan B man', DATEADD(HOUR, -2, GETDATE()), DATEADD(HOUR, -2, GETDATE()), 0);

-- Order items for new orders
INSERT INTO LabOrderItems (Id, LabOrderId, TestCode, TestName, TestGroupName, SampleTypeName, Unit, ReferenceRange, NormalMin, NormalMax, CriticalLow, CriticalHigh, CreatedAt) VALUES
-- Order 4: Kham suc khoe (pending)
(NEWID(), @ord4, N'CTM', N'Cong thuc mau 18 thong so', N'Huyet hoc', N'Mau toan phan', NULL, NULL, NULL, NULL, NULL, NULL, GETDATE()),
(NEWID(), @ord4, N'GLU', N'Glucose mau', N'Sinh hoa', N'Huyet thanh', N'mmol/L', N'3.9-6.1', 3.9, 6.1, 2.0, 25.0, GETDATE()),
(NEWID(), @ord4, N'GOT', N'GOT (AST)', N'Sinh hoa', N'Huyet thanh', N'U/L', N'0-40', 0, 40, NULL, 200, GETDATE()),
(NEWID(), @ord4, N'GPT', N'GPT (ALT)', N'Sinh hoa', N'Huyet thanh', N'U/L', N'0-40', 0, 40, NULL, 200, GETDATE()),
-- Order 5: Tang huyet ap (collected)
(NEWID(), @ord5, N'CREATININ', N'Creatinin mau', N'Sinh hoa', N'Huyet thanh', N'umol/L', N'62-106', 62, 106, NULL, 500, GETDATE()),
(NEWID(), @ord5, N'URE', N'Ure mau', N'Sinh hoa', N'Huyet thanh', N'mmol/L', N'2.5-7.5', 2.5, 7.5, NULL, 30, GETDATE()),
(NEWID(), @ord5, N'GLU', N'Glucose mau', N'Sinh hoa', N'Huyet thanh', N'mmol/L', N'3.9-6.1', 3.9, 6.1, 2.0, 25.0, GETDATE()),
-- Order 6: DTD (processing - has some results)
(NEWID(), @ord6, N'HBA1C', N'HbA1c', N'Sinh hoa', N'Mau toan phan', N'%', N'4.0-6.0', 4.0, 6.0, NULL, 14.0, GETDATE()),
(NEWID(), @ord6, N'GLU', N'Glucose mau', N'Sinh hoa', N'Huyet thanh', N'mmol/L', N'3.9-6.1', 3.9, 6.1, 2.0, 25.0, GETDATE()),
(NEWID(), @ord6, N'CREATININ', N'Creatinin mau', N'Sinh hoa', N'Huyet thanh', N'umol/L', N'62-106', 62, 106, NULL, 500, GETDATE()),
-- Order 7: Viem gan B (completed with results)
(NEWID(), @ord7, N'GOT', N'GOT (AST)', N'Sinh hoa', N'Huyet thanh', N'U/L', N'0-40', 0, 40, NULL, 200, GETDATE()),
(NEWID(), @ord7, N'GPT', N'GPT (ALT)', N'Sinh hoa', N'Huyet thanh', N'U/L', N'0-40', 0, 40, NULL, 200, GETDATE());

-- Add results for order 6 (partially)
UPDATE LabOrderItems SET Result = N'7.8', ResultStatus = 2, ResultEnteredAt = GETDATE() WHERE LabOrderId = @ord6 AND TestCode = 'HBA1C';
UPDATE LabOrderItems SET Result = N'8.5', ResultStatus = 2, ResultEnteredAt = GETDATE() WHERE LabOrderId = @ord6 AND TestCode = 'GLU';

-- Add results for order 7 (completed)
UPDATE LabOrderItems SET Result = N'85', ResultStatus = 2, ResultEnteredAt = DATEADD(HOUR, -1, GETDATE()) WHERE LabOrderId = @ord7 AND TestCode = 'GOT';
UPDATE LabOrderItems SET Result = N'92', ResultStatus = 2, ResultEnteredAt = DATEADD(HOUR, -1, GETDATE()) WHERE LabOrderId = @ord7 AND TestCode = 'GPT';
GO

-- 6. LabConnectionLogs (sample connection logs)
INSERT INTO LabConnectionLogs (Id, AnalyzerId, EventTime, EventType, EventDescription, IsSuccess, IsDeleted, CreatedAt) VALUES
(NEWID(), 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E', DATEADD(HOUR, -3, GETDATE()), 1, N'Connected to HL7Spy analyzer on localhost:2575', 1, 0, GETDATE()),
(NEWID(), 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E', DATEADD(HOUR, -2, GETDATE()), 2, N'Sent worklist for patient BN-001', 1, 0, GETDATE()),
(NEWID(), 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E', DATEADD(HOUR, -1, GETDATE()), 3, N'Received result: GLU=6.1 mmol/L, HBA1C=5.8%', 1, 0, GETDATE()),
(NEWID(), 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E', DATEADD(MINUTE, -30, GETDATE()), 4, N'Connection lost - timeout after 30s', 0, 0, GETDATE()),
(NEWID(), 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E', DATEADD(MINUTE, -25, GETDATE()), 1, N'Reconnected to HL7Spy analyzer', 1, 0, GETDATE()),
(NEWID(), 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E', DATEADD(MINUTE, -20, GETDATE()), 3, N'Received result: GOT=85 U/L, GPT=92 U/L', 1, 0, GETDATE()),
(NEWID(), 'E307A8D8-3678-49BC-2CB4-08DE69E8B16E', DATEADD(MINUTE, -10, GETDATE()), 3, N'Received result: WBC=8.5 G/L, RBC=4.8 T/L, HGB=145 g/L, PLT=250 G/L', 1, 0, GETDATE());
GO

PRINT 'LIS seed completed successfully!';
