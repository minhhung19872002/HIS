-- Phase 2 Batch 3: Surgery Narrative Templates + Outpatient Record Templates
-- Date: 2026-06-02
-- Idempotent: safe to run multiple times

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- 1. SurgeryNarrativeTemplates
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SurgeryNarrativeTemplates')
BEGIN
    CREATE TABLE SurgeryNarrativeTemplates (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        TemplateCode NVARCHAR(50) NOT NULL,
        TemplateName NVARCHAR(200) NOT NULL,
        SurgeryServiceId UNIQUEIDENTIFIER NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        PreOpDiagnosis NVARCHAR(500) NULL,
        PostOpDiagnosis NVARCHAR(500) NULL,
        SurgeryMethod NVARCHAR(500) NULL,
        AnesthesiaMethod NVARCHAR(200) NULL,
        NarrativeBody NVARCHAR(MAX) NULL,
        Complications NVARCHAR(MAX) NULL,
        PostOpOrders NVARCHAR(MAX) NULL,
        IsPublic BIT NOT NULL DEFAULT 0,
        CreatedByUserId UNIQUEIDENTIFIER NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL
    );
    PRINT 'Created SurgeryNarrativeTemplates';
END

-- 2. OutpatientRecordTemplates
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OutpatientRecordTemplates')
BEGIN
    CREATE TABLE OutpatientRecordTemplates (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        TemplateCode NVARCHAR(50) NOT NULL,
        TemplateName NVARCHAR(200) NOT NULL,
        DiagnosisCode NVARCHAR(20) NULL,
        DiagnosisName NVARCHAR(200) NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        ChiefComplaint NVARCHAR(MAX) NULL,
        MedicalHistory NVARCHAR(MAX) NULL,
        PhysicalExamination NVARCHAR(MAX) NULL,
        GeneralExamBody NVARCHAR(MAX) NULL,
        CardiovascularExam NVARCHAR(MAX) NULL,
        RespiratoryExam NVARCHAR(MAX) NULL,
        GiExam NVARCHAR(MAX) NULL,
        NeuroExam NVARCHAR(MAX) NULL,
        Conclusion NVARCHAR(MAX) NULL,
        TreatmentPlan NVARCHAR(MAX) NULL,
        FollowUpNotes NVARCHAR(MAX) NULL,
        IsPublic BIT NOT NULL DEFAULT 0,
        CreatedByUserId UNIQUEIDENTIFIER NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL
    );
    PRINT 'Created OutpatientRecordTemplates';
END

-- 3. Seed: Surgery narrative templates (common procedures)
IF NOT EXISTS (SELECT 1 FROM SurgeryNarrativeTemplates WHERE TemplateCode = 'PTTT-CAT-RT')
BEGIN
    INSERT INTO SurgeryNarrativeTemplates (Id, TemplateCode, TemplateName, PreOpDiagnosis, PostOpDiagnosis, SurgeryMethod, AnesthesiaMethod, NarrativeBody, PostOpOrders, IsPublic, IsActive, SortOrder)
    VALUES
    (NEWID(), 'PTTT-CAT-RT', N'Cắt ruột thừa nội soi', N'Viêm ruột thừa cấp', N'Viêm ruột thừa cấp', N'Cắt ruột thừa nội soi 3 trocar', N'Mê NKQ', N'Bệnh nhân nằm ngửa, gây mê NKQ. Bơm hơi ổ bụng qua kim Veress tại rốn. Đặt 3 trocar (10mm rốn, 5mm hạ sườn trái, 5mm hố chậu trái). Thám sát ổ bụng: ruột thừa viêm, sung huyết. Phẫu tích mạc treo ruột thừa bằng dao siêu âm. Kẹp clip gốc ruột thừa x2, cắt. Lấy ruột thừa qua trocar rốn. Rửa ổ bụng. Kiểm tra cầm máu. Đóng các lỗ trocar.', N'Kháng sinh IV 48h. Giảm đau. Ăn lỏng sau 6h. Rút dẫn lưu khi <50ml/24h.', 1, 1, 1),
    (NEWID(), 'PTTT-SINH-TM', N'Mổ lấy thai', N'Thai đủ tháng ngôi ngược / Sẹo mổ cũ', N'Thai sống, đủ tháng', N'Mổ lấy thai đường ngang đoạn dưới', N'Tê tủy sống', N'Bệnh nhân nằm ngửa, tê tủy sống L3-L4. Rạch da ngang trên vệ (Pfannenstiel). Mở thành bụng theo lớp. Rạch ngang đoạn dưới tử cung. Lấy thai — bé trai/gái, khóc ngay, APGAR 8/9. Bóc rau, kiểm tra buồng tử cung sạch. Khâu tử cung 2 lớp Vicryl 1/0. Kiểm tra cầm máu. Đóng thành bụng theo lớp.', N'Oxytocin 10UI/500ml RL. Kháng sinh IV 24h. Giảm đau. Cho bú sớm. Vận động sớm sau 6h.', 1, 1, 2),
    (NEWID(), 'PTTT-THOAT-VI', N'Thoát vị bẹn nội soi (TEP/TAPP)', N'Thoát vị bẹn', N'Thoát vị bẹn gián tiếp/trực tiếp', N'Đặt lưới nội soi TAPP', N'Mê NKQ', N'Bệnh nhân nằm ngửa, gây mê NKQ. Bơm hơi ổ bụng. Đặt 3 trocar. Rạch phúc mạc phía trên lỗ bẹn sâu. Phẫu tích túi thoát vị, đẩy về ổ bụng. Đặt lưới polypropylene 15x10cm phủ kín lỗ bẹn sâu + tam giác Hesselbach. Cố định lưới bằng tacker. Khâu lại phúc mạc.', N'Kháng sinh dự phòng 1 liều. Giảm đau uống. Ăn uống bình thường. Hạn chế gắng sức 2 tuần.', 1, 1, 3),
    (NEWID(), 'PTTT-DUC-TTT', N'Phaco đục thể thủy tinh', N'Đục thể thủy tinh', N'Đục thể thủy tinh — đã đặt IOL', N'Phaco + đặt IOL hậu phòng', N'Tê tại chỗ (Tetracaine 0.5%)', N'Sát trùng vùng mắt. Tê tại chỗ Tetracaine 0.5%. Mở mi. Rạch giác mạc 2.4mm lúc 10h. Bơm viscoelastic. Xé bao trước liên tục (CCC) đường kính ~5.5mm. Thủy phân tách, thủy tách. Tán nhuyễn nhân bằng phaco (divide & conquer). Hút sạch chất nhân và vỏ. Đặt IOL gấp hậu phòng (công suất theo sinh trắc). Hút viscoelastic. Kiểm tra vết mổ kín. Tra kháng sinh + corticoid.', N'Tra thuốc kháng sinh + kháng viêm 4 lần/ngày x 4 tuần. Tái khám ngày 1, 7, 30.', 1, 1, 4),
    (NEWID(), 'PTTT-NOS-DD', N'Nội soi dạ dày — sinh thiết', N'Viêm loét dạ dày tá tràng', N'Viêm loét dạ dày tá tràng (kết quả sinh thiết chờ)', N'Nội soi dạ dày tá tràng + sinh thiết', N'Tiền mê Midazolam IV', N'Bệnh nhân nằm nghiêng trái. Tiền mê Midazolam 2mg IV. Đưa ống nội soi qua miệng. Thực quản: niêm mạc hồng, không giãn TM. Tâm vị đóng kín. Dạ dày: niêm mạc sung huyết vùng hang vị, ổ loét 8mm bờ cong nhỏ — sinh thiết 2 mẫu (CLO + GPB). Tá tràng: hành tá tràng bình thường. Rút ống. BN tỉnh, dung nạp tốt.', N'Nhịn ăn 2h sau thủ thuật. PPI x 4 tuần. Chờ kết quả sinh thiết. Tái khám sau 2 tuần.', 1, 1, 5);
    PRINT 'Seeded 5 surgery narrative templates';
END

-- 4. Seed: Outpatient record templates (common diagnoses)
IF NOT EXISTS (SELECT 1 FROM OutpatientRecordTemplates WHERE TemplateCode = 'HSBA-THA')
BEGIN
    INSERT INTO OutpatientRecordTemplates (Id, TemplateCode, TemplateName, DiagnosisCode, DiagnosisName, ChiefComplaint, MedicalHistory, PhysicalExamination, GeneralExamBody, CardiovascularExam, Conclusion, TreatmentPlan, FollowUpNotes, IsPublic, IsActive, SortOrder)
    VALUES
    (NEWID(), 'HSBA-THA', N'Tăng huyết áp nguyên phát', 'I10', N'Tăng huyết áp nguyên phát', N'Đau đầu, chóng mặt, đo HA cao', N'Tiền sử THA __ năm, đang uống thuốc __. Tiền sử gia đình: __. Không hút thuốc / hút __ điếu/ngày. Không uống rượu / uống __ đơn vị/tuần.', N'Tỉnh, tiếp xúc tốt. Da niêm mạc hồng. Không phù.', N'Tổng trạng trung bình. BMI __. Không thiếu máu.', N'Tim đều, T1-T2 rõ, không tiếng thổi. HA __/__ mmHg. Mạch __ lần/phút.', N'Tăng huyết áp độ __ (ESC/ESH). Nguy cơ tim mạch: __. Biến chứng cơ quan đích: __', N'1. Thay đổi lối sống: giảm muối <5g/ngày, tập thể dục 150 phút/tuần\n2. Thuốc: __ (liều __)\n3. Theo dõi HA tại nhà 2 lần/ngày', N'Tái khám sau 2-4 tuần. XN lại: creatinine, kali, lipid máu, ECG.', 1, 1, 1),
    (NEWID(), 'HSBA-DTD2', N'Đái tháo đường type 2', 'E11', N'Đái tháo đường type 2', N'Khát nước nhiều, tiểu nhiều, sụt cân / Phát hiện đường huyết cao tình cờ', N'Tiền sử ĐTĐ __ năm, đang dùng __. HbA1c gần nhất __%. Biến chứng: __. Tiền sử gia đình: __', N'Tỉnh, tiếp xúc tốt. Da khô / bình thường. Chân: cảm giác __, mạch mu chân __', N'Tổng trạng __. BMI __. Vòng bụng __ cm.', N'Tim đều, không tiếng thổi. HA __/__ mmHg.', N'ĐTĐ type 2, kiểm soát __ (tốt/trung bình/kém). HbA1c mục tiêu < __%. Biến chứng: __', N'1. Chế độ ăn: __ kcal/ngày, giảm tinh bột\n2. Thuốc: __ (liều __)\n3. Tự theo dõi đường huyết mao mạch __ lần/tuần', N'Tái khám sau 1-3 tháng. XN: HbA1c, creatinine, microalbumin niệu, lipid, khám mắt.', 1, 1, 2),
    (NEWID(), 'HSBA-VIEM-HONG', N'Viêm họng cấp', 'J02.9', N'Viêm họng cấp, không đặc hiệu', N'Đau họng __ ngày, sốt, nuốt đau', N'Không tiền sử dị ứng thuốc. Không bệnh nền đặc biệt.', N'Tỉnh, tiếp xúc tốt. Họng đỏ, amidan __. Hạch cổ __', N'Tổng trạng tốt. Nhiệt độ __°C.', N'Tim phổi bình thường. HA __/__ mmHg.', N'Viêm họng cấp (virus / vi khuẩn). Centor score: __', N'1. Nghỉ ngơi, uống nước đủ\n2. Giảm đau hạ sốt: Paracetamol 500mg x 3-4 lần/ngày\n3. Kháng sinh (nếu Centor ≥3): __', N'Tái khám nếu sốt >3 ngày hoặc triệu chứng nặng hơn.', 1, 1, 3),
    (NEWID(), 'HSBA-VIEM-DA-DAY', N'Viêm dạ dày', 'K29.7', N'Viêm dạ dày, không đặc hiệu', N'Đau thượng vị __ ngày, ợ chua, buồn nôn', N'Tiền sử viêm dạ dày __. Dùng NSAIDs: __. H.pylori: __. Hút thuốc: __', N'Tỉnh, tiếp xúc tốt. Bụng mềm, ấn đau thượng vị.', N'Tổng trạng tốt. Không thiếu máu.', N'Tim phổi bình thường.', N'Viêm dạ dày (HP+/HP-). Loét: __. Biến chứng: __', N'1. Chế độ ăn: tránh chua cay, rượu bia, NSAIDs\n2. PPI: __ x 2 lần/ngày x __ tuần\n3. Diệt HP (nếu +): bộ 3/bộ 4 __ ngày', N'Tái khám sau 4-8 tuần. Nội soi kiểm tra (nếu loét >2cm hoặc HP+).', 1, 1, 4),
    (NEWID(), 'HSBA-THOAI-HOA', N'Thoái hóa khớp gối', 'M17.1', N'Thoái hóa khớp gối nguyên phát, hai bên', N'Đau khớp gối __ tháng, tăng khi vận động, cứng khớp buổi sáng <30 phút', N'Tiền sử thoái hóa khớp __ năm. Điều trị: __. Tiêm nội khớp: __', N'Tỉnh, tiếp xúc tốt. Khớp gối: sưng __, lục khục __, tầm vận động __', N'Tổng trạng __. BMI __. Dáng đi __', N'Tim phổi bình thường.', N'Thoái hóa khớp gối K/L grade __. Biến dạng: __. Mức độ: __', N'1. Giảm cân (nếu BMI >25)\n2. Vật lý trị liệu: tập cơ tứ đầu đùi\n3. Giảm đau: Paracetamol ± NSAIDs (chú ý dạ dày)\n4. Glucosamine (nếu giai đoạn sớm)', N'Tái khám sau 4 tuần. X-quang khớp gối nếu chưa có. Cân nhắc tiêm HA nội khớp.', 1, 1, 5);
    PRINT 'Seeded 5 outpatient record templates';
END

COMMIT TRANSACTION;
PRINT 'Phase 2 Batch 3 migration completed successfully.';
GO
