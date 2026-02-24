-- ============================================================
-- RIS/PACS SEED DATA - Comprehensive
-- ============================================================
USE HIS;
GO

-- 1. RadiologyAbbreviations
INSERT INTO RadiologyAbbreviations (Id, Abbreviation, FullText, Category, IsGlobal, SortOrder, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'BT', N'Binh thuong', N'KetLuan', 1, 1, 1, 0, GETDATE()),
(NEWID(), N'KBT', N'Khong bat thuong', N'KetLuan', 1, 2, 1, 0, GETDATE()),
(NEWID(), N'TDTT', N'Ton thuong thuc the', N'MoTa', 1, 3, 1, 0, GETDATE()),
(NEWID(), N'XQNTT', N'X-Quang nguc thang: Tim phoi khong bat thuong', N'KetLuan', 1, 4, 1, 0, GETDATE()),
(NEWID(), N'SABT', N'Sieu am bung tong quat: Cac tang khong bat thuong', N'KetLuan', 1, 5, 1, 0, GETDATE()),
(NEWID(), N'CTBT', N'CT Scanner: Khong phat hien bat thuong', N'KetLuan', 1, 6, 1, 0, GETDATE()),
(NEWID(), N'VPPM', N'Viem phe quan phoi', N'MoTa', 1, 7, 1, 0, GETDATE()),
(NEWID(), N'TDDD', N'Thoat vi dia dem', N'MoTa', 1, 8, 1, 0, GETDATE()),
(NEWID(), N'SMGL', N'Soi mat, gan lon', N'MoTa', 1, 9, 1, 0, GETDATE()),
(NEWID(), N'NTDL', N'Nhip tim deu, luc bop tot', N'MoTa', 1, 10, 1, 0, GETDATE()),
(NEWID(), N'HVPL', N'Hinh anh viem phoi thuy phai', N'MoTa', 1, 11, 1, 0, GETDATE()),
(NEWID(), N'KPTT', N'Khong phat hien ton thuong', N'KetLuan', 1, 12, 1, 0, GETDATE()),
(NEWID(), N'DKTL', N'De nghi kham them lam sang', N'DeNghi', 1, 13, 1, 0, GETDATE()),
(NEWID(), N'CTCL', N'Chup CT co tiem can quang de khao sat them', N'DeNghi', 1, 14, 1, 0, GETDATE()),
(NEWID(), N'TKHD', N'Tai kham sau 1 thang de theo doi', N'DeNghi', 1, 15, 1, 0, GETDATE());
GO

-- 2. RadiologyDiagnosisTemplates
INSERT INTO RadiologyDiagnosisTemplates (Id, Code, Name, Description, Conclusion, Recommendation, Gender, SortOrder, IsDefault, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'XQ_NGUC_BT', N'X-Quang nguc binh thuong', N'Phoi 2 ben sang, khong dam mo. Goc suon hoanh 2 ben nhon. Bong tim khong to. Trung that giua.', N'X-Quang nguc thang: Tim phoi khong bat thuong', N'Tai kham dinh ky', NULL, 1, 1, 1, 0, GETDATE()),
(NEWID(), N'XQ_NGUC_VP', N'X-Quang nguc viem phoi', N'Dam mo rong o thuy duoi phoi phai, ranh gioi khong ro. Goc suon hoanh phai mo. Bong tim khong to.', N'Hinh anh nghi ngo viem phoi thuy phai', N'Dieu tri noi khoa, tai chup sau 7-10 ngay', NULL, 2, 0, 1, 0, GETDATE()),
(NEWID(), N'XQ_CS_BT', N'X-Quang cot song binh thuong', N'Cac than dot song deu, khong xep, khong truot. Khe lien dot song deu.', N'X-Quang cot song: Chua thay bat thuong', N'Ket hop vat ly tri lieu neu con dau', NULL, 3, 1, 1, 0, GETDATE()),
(NEWID(), N'XQ_CS_TVDD', N'X-Quang thoai hoa cot song', N'Hep khe lien dot song L4-L5, L5-S1. Gai xuong than dot song.', N'Thoai hoa cot song that lung', N'MRI cot song that lung de danh gia chi tiet', NULL, 4, 0, 1, 0, GETDATE()),
(NEWID(), N'SA_BUNG_BT', N'Sieu am bung binh thuong', N'Gan: Kich thuoc binh thuong, nhu mo dong nhat. Tui mat: Thanh mong, khong soi. Tuy, Lach, Than binh thuong.', N'Sieu am bung tong quat: Cac tang khong bat thuong', NULL, NULL, 5, 1, 1, 0, GETDATE()),
(NEWID(), N'SA_BUNG_SM', N'Sieu am bung soi mat', N'Gan binh thuong. Tui mat co soi duong kinh 8mm, khong viem. Duong mat trong gan khong gian.', N'Soi tui mat (1 vien 8mm)', N'Theo doi, tai kham 3 thang', NULL, 6, 0, 1, 0, GETDATE()),
(NEWID(), N'SA_TIM_BT', N'Sieu am tim binh thuong', N'Buong tim kich thuoc binh thuong. Van tim hoat dong tot. EF 65%. Khong tran dich mang ngoai tim.', N'Sieu am tim: Cau truc va chuc nang binh thuong. EF 65%.', NULL, NULL, 7, 1, 1, 0, GETDATE()),
(NEWID(), N'SA_GIAP_BT', N'Sieu am tuyen giap binh thuong', N'Tuyen giap 2 thuy kich thuoc binh thuong, nhu mo dong nhat, khong nhan.', N'Sieu am tuyen giap: Binh thuong', NULL, NULL, 8, 1, 1, 0, GETDATE()),
(NEWID(), N'CT_SO_BT', N'CT so nao binh thuong', N'Nhu mo nao 2 ban cau doi xung. Nao that khong gian. Khong xuat huyet, khong noi thuong.', N'CT so nao: Khong phat hien bat thuong', N'Ket hop kham than kinh lam sang', NULL, 9, 1, 1, 0, GETDATE()),
(NEWID(), N'CT_NGUC_BT', N'CT nguc binh thuong', N'Nhu mo phoi 2 ben binh thuong. Khong tran dich mang phoi. Tim va mach mau lon binh thuong.', N'CT nguc: Khong phat hien bat thuong', NULL, NULL, 10, 1, 1, 0, GETDATE());
GO

-- 3. RadiologyServiceDescriptionTemplates
INSERT INTO RadiologyServiceDescriptionTemplates (Id, ServiceId, Name, Description, Conclusion, Notes, IsDefault, SortOrder, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), 'F20181E4-4EAB-408C-B6EA-46521396CF7E', N'XQ nguc binh thuong', N'Phoi 2 ben sang, khong dam mo. Tim khong to. Trung that giua.', N'Tim phoi binh thuong', NULL, 1, 1, 1, 0, GETDATE()),
(NEWID(), 'F20181E4-4EAB-408C-B6EA-46521396CF7E', N'XQ nguc viem phoi', N'Dam mo thuy duoi phoi phai. Goc suon hoanh phai mo.', N'Nghi ngo viem phoi phai', NULL, 0, 2, 1, 0, GETDATE()),
(NEWID(), '2C42049E-F89F-4540-B74D-04A7BC0689C2', N'XQ cot song binh thuong', N'Than dot song deu, khong xep. Khe lien dot song deu.', N'Cot song chua thay bat thuong', NULL, 1, 3, 1, 0, GETDATE()),
(NEWID(), '2C42049E-F89F-4540-B74D-04A7BC0689C2', N'XQ thoai hoa cot song', N'Gai xuong than dot song. Hep khe L4-L5.', N'Thoai hoa cot song that lung', NULL, 0, 4, 1, 0, GETDATE()),
(NEWID(), '6B5D1DDC-4EBA-4635-A728-2AB16C101200', N'SA tim binh thuong', N'Buong tim kich thuoc binh thuong. EF 65%.', N'Tim binh thuong', NULL, 1, 5, 1, 0, GETDATE()),
(NEWID(), '409AB780-9123-412A-8731-522BB82D9070', N'SA bung binh thuong', N'Gan, mat, tuy, lach, than binh thuong.', N'Bung binh thuong', NULL, 1, 6, 1, 0, GETDATE()),
(NEWID(), '409AB780-9123-412A-8731-522BB82D9070', N'SA bung soi mat', N'Gan binh thuong. Tui mat co soi.', N'Soi tui mat', NULL, 0, 7, 1, 0, GETDATE()),
(NEWID(), 'AB9ED7C5-E3AB-42FA-B475-5C12D018CE5E', N'SA tuyen giap binh thuong', N'Tuyen giap 2 thuy binh thuong, khong nhan.', N'Tuyen giap binh thuong', NULL, 1, 8, 1, 0, GETDATE());
GO

-- 4. RadiologyDigitalSignatureConfigs
INSERT INTO RadiologyDigitalSignatureConfigs (Id, SignatureType, Name, ProviderUrl, IsDefault, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'USBToken', N'USB Token - VNPT', N'https://ca.vnpt.vn', 1, 1, 0, GETDATE()),
(NEWID(), N'SmartCA', N'SmartCA - VNPT', N'https://smartca.vnpt.vn/api', 0, 1, 0, GETDATE()),
(NEWID(), N'SignServer', N'SignServer Local', N'http://localhost:8080/signserver', 0, 1, 0, GETDATE());
GO

-- 5. RadiologyWorkstations
INSERT INTO RadiologyWorkstations (Id, WorkstationCode, WorkstationName, ComputerName, IpAddress, RoomId, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'WS-XQ-01', N'May tram X-Quang 1', N'PC-XQUANG-01', N'192.168.1.101', '638A14D3-D47C-4D1B-B2C5-8C9CC722737B', 1, 0, GETDATE()),
(NEWID(), N'WS-CT-01', N'May tram CT Scanner', N'PC-CT-01', N'192.168.1.102', 'B3242DF4-ED12-4C39-809C-1E19BBD3E3F1', 1, 0, GETDATE()),
(NEWID(), N'WS-SA-01', N'May tram Sieu am 1', N'PC-SIEUAM-01', N'192.168.1.103', 'A4C4D239-914B-40E6-8B48-F97647D8262F', 1, 0, GETDATE()),
(NEWID(), N'WS-DOC-01', N'May tram Doc ket qua', N'PC-DOCTOR-01', N'192.168.1.110', NULL, 1, 0, GETDATE());
GO

-- 6. RadiologyCaptureDevices
INSERT INTO RadiologyCaptureDevices (Id, DeviceCode, DeviceName, DeviceType, Manufacturer, Model, RoomId, ConnectionType, IpAddress, Port, SupportsDicom, SupportsWorklist, SupportsMPPS, MaxExamsPerDay, AutoSelectThumbnail, SendOnlyThumbnail, Status, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'XR-CAP-01', N'May chup X-Quang ky thuat so', N'XRay', N'Shimadzu', N'RADspeed Pro', '638A14D3-D47C-4D1B-B2C5-8C9CC722737B', N'DICOM', N'192.168.1.201', 4242, 1, 1, 1, 100, 1, 0, 1, 1, 0, GETDATE()),
(NEWID(), N'CT-CAP-01', N'CT Scanner 64 lat cat', N'CT', N'Siemens', N'SOMATOM go.Top', 'B3242DF4-ED12-4C39-809C-1E19BBD3E3F1', N'DICOM', N'192.168.1.202', 4242, 1, 1, 1, 50, 1, 0, 1, 1, 0, GETDATE()),
(NEWID(), N'US-CAP-01', N'May sieu am tong hop', N'Ultrasound', N'GE', N'LOGIQ E10s', 'A4C4D239-914B-40E6-8B48-F97647D8262F', N'DICOM', N'192.168.1.203', 4242, 1, 1, 0, 80, 1, 0, 1, 1, 0, GETDATE()),
(NEWID(), N'US-CAP-02', N'May sieu am tim', N'Ultrasound', N'Philips', N'EPIQ CVx', 'A4C4D239-914B-40E6-8B48-F97647D8262F', N'DICOM', N'192.168.1.204', 4242, 1, 0, 0, 60, 1, 0, 1, 1, 0, GETDATE());
GO

-- 7. RadiologyTags (fix existing + add more)
UPDATE RadiologyTags SET IsActive = 1, IsDeleted = 0 WHERE IsDeleted = 1;
INSERT INTO RadiologyTags (Id, Code, Name, Description, Color, SortOrder, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'URGENT', N'Cap cuu', N'Ca cap cuu can uu tien', N'#FF0000', 1, 1, 0, GETDATE()),
(NEWID(), N'VIP', N'VIP', N'Benh nhan VIP', N'#FFD700', 2, 1, 0, GETDATE()),
(NEWID(), N'RECHECK', N'Can kiem tra lai', N'Ket qua can review lai', N'#FFA500', 3, 1, 0, GETDATE()),
(NEWID(), N'CONTRAST', N'Co tiem thuoc can quang', N'Ca chup co tiem thuoc can quang', N'#0000FF', 4, 1, 0, GETDATE()),
(NEWID(), N'PEDIATRIC', N'Nhi khoa', N'Benh nhan nhi', N'#00FF00', 5, 1, 0, GETDATE());
GO

-- 8. RadiologyDutySchedules
INSERT INTO RadiologyDutySchedules (Id, DepartmentId, RoomId, DutyDate, ShiftType, StartTime, EndTime, DoctorId, Notes, Status, IsDeleted, CreatedAt) VALUES
(NEWID(), 'F16B6CC8-ECBA-4675-81BC-0AA4CC3FA441', '638A14D3-D47C-4D1B-B2C5-8C9CC722737B', '2026-02-23', 1, '07:00:00', '15:00:00', '9E5309DC-ECF9-4D48-9A09-224CD15347B1', N'Ca sang X-Quang', 1, 0, GETDATE()),
(NEWID(), 'F16B6CC8-ECBA-4675-81BC-0AA4CC3FA441', '638A14D3-D47C-4D1B-B2C5-8C9CC722737B', '2026-02-23', 2, '15:00:00', '22:00:00', '9E5309DC-ECF9-4D48-9A09-224CD15347B1', N'Ca chieu X-Quang', 1, 0, GETDATE()),
(NEWID(), 'F16B6CC8-ECBA-4675-81BC-0AA4CC3FA441', 'A4C4D239-914B-40E6-8B48-F97647D8262F', '2026-02-23', 1, '07:00:00', '15:00:00', '9E5309DC-ECF9-4D48-9A09-224CD15347B1', N'Ca sang Sieu am', 1, 0, GETDATE()),
(NEWID(), 'F16B6CC8-ECBA-4675-81BC-0AA4CC3FA441', 'B3242DF4-ED12-4C39-809C-1E19BBD3E3F1', '2026-02-23', 1, '07:00:00', '15:00:00', '9E5309DC-ECF9-4D48-9A09-224CD15347B1', N'Ca sang CT', 1, 0, GETDATE()),
(NEWID(), 'F16B6CC8-ECBA-4675-81BC-0AA4CC3FA441', '638A14D3-D47C-4D1B-B2C5-8C9CC722737B', '2026-02-24', 1, '07:00:00', '15:00:00', '9E5309DC-ECF9-4D48-9A09-224CD15347B1', N'Ca sang X-Quang ngay mai', 1, 0, GETDATE()),
(NEWID(), 'F16B6CC8-ECBA-4675-81BC-0AA4CC3FA441', 'A4C4D239-914B-40E6-8B48-F97647D8262F', '2026-02-24', 1, '07:00:00', '15:00:00', '9E5309DC-ECF9-4D48-9A09-224CD15347B1', N'Ca sang Sieu am ngay mai', 1, 0, GETDATE());
GO

-- 9. RadiologyRoomAssignments (assign existing requests to rooms)
INSERT INTO RadiologyRoomAssignments (Id, RadiologyRequestId, RoomId, ModalityId, QueueNumber, Status, AssignedAt, IsDeleted, CreatedAt)
SELECT NEWID(), rr.Id, '638A14D3-D47C-4D1B-B2C5-8C9CC722737B', '8BF57E94-3705-4211-A56C-10FC42F2CEEB',
  ROW_NUMBER() OVER (ORDER BY rr.RequestDate), rr.Status, rr.RequestDate, 0, GETDATE()
FROM RadiologyRequests rr WHERE rr.IsDeleted = 0;
GO

-- 10. RadiologyHelpCategories
DECLARE @catCDHA UNIQUEIDENTIFIER = NEWID();
DECLARE @catXQ UNIQUEIDENTIFIER = NEWID();
DECLARE @catSA UNIQUEIDENTIFIER = NEWID();
DECLARE @catPACS UNIQUEIDENTIFIER = NEWID();

INSERT INTO RadiologyHelpCategories (Id, Code, Name, Description, SortOrder, IsActive, IsDeleted, CreatedAt) VALUES
(@catCDHA, N'CDHA_GENERAL', N'Huong dan chung CDHA', N'Cac huong dan chung ve chan doan hinh anh', 1, 1, 0, GETDATE()),
(@catXQ, N'XQUANG', N'X-Quang', N'Huong dan su dung may X-Quang', 2, 1, 0, GETDATE()),
(@catSA, N'SIEUAM', N'Sieu am', N'Huong dan su dung may sieu am', 3, 1, 0, GETDATE()),
(@catPACS, N'PACS', N'He thong PACS', N'Huong dan su dung PACS va DICOM Viewer', 4, 1, 0, GETDATE());

-- 11. RadiologyHelpArticles
INSERT INTO RadiologyHelpArticles (Id, CategoryId, Title, Summary, Content, ArticleType, SortOrder, ViewCount, IsPublished, IsDeleted, CreatedAt) VALUES
(NEWID(), @catCDHA, N'Quy trinh tiep nhan benh nhan CDHA', N'Huong dan quy trinh tiep nhan BN tu khi co chi dinh den khi tra ket qua', N'1. Benh nhan den quay tiep nhan voi phieu chi dinh\n2. Kiem tra thong tin BN tren he thong\n3. Gan phong chup/sieu am\n4. Goi BN vao phong\n5. Thuc hien ky thuat\n6. Bac si doc ket qua\n7. Tra ket qua cho BN', N'Guide', 1, 0, 1, 0, GETDATE()),
(NEWID(), @catXQ, N'Huong dan chup X-Quang nguc', N'Ky thuat chup X-Quang nguc thang', N'Tu the: BN dung thang, 2 tay chong hong\nKhoang cach: 180cm\nKV: 110-120\nmAs: 3-5\nChu y: BN hit sau va nhin tho', N'Guide', 1, 0, 1, 0, GETDATE()),
(NEWID(), @catSA, N'Huong dan sieu am bung', N'Ky thuat sieu am bung tong quat', N'Chuan bi: BN nhin an 6-8 gio\nDau do: Convex 3.5MHz\nThu tu: Gan -> Mat -> Tuy -> Lach -> Than -> Bang quang\nChu y: Danh gia kich thuoc, echo, dich tu do', N'Guide', 1, 0, 1, 0, GETDATE()),
(NEWID(), @catPACS, N'Huong dan su dung DICOM Viewer', N'Cach mo va xem anh DICOM tren he thong PACS', N'1. Chon benh nhan tu danh sach\n2. Click vao study can xem\n3. Su dung cong cu: Zoom, Pan, Window/Level\n4. Do luong: Khoang cach, Goc, Dien tich\n5. So sanh voi phim cu (neu co)', N'Guide', 1, 0, 1, 0, GETDATE()),
(NEWID(), @catPACS, N'Xu ly loi ket noi PACS', N'Cac loi thuong gap khi ket noi PACS va cach xu ly', N'Loi 1: Khong ket noi duoc PACS -> Kiem tra mang, kiem tra IP/Port\nLoi 2: Khong hien anh -> Kiem tra AE Title\nLoi 3: Anh bi den -> Dieu chinh Window/Level\nLoi 4: Thieu study -> Verify tu may chup', N'FAQ', 2, 0, 1, 0, GETDATE());
GO

-- 12. RadiologyLabelConfigs
INSERT INTO RadiologyLabelConfigs (Id, Name, Description, LabelWidth, LabelHeight, IncludeQRCode, IncludeBarcode, BarcodeFormat, IsDefault, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'Nhan CDHA tieu chuan', N'Nhan dan phim CDHA kich thuoc tieu chuan', 100, 50, 1, 1, N'CODE128', 1, 1, 0, GETDATE()),
(NEWID(), N'Nhan CDHA nho', N'Nhan nho cho sieu am', 70, 30, 0, 1, N'CODE128', 0, 1, 0, GETDATE()),
(NEWID(), N'Nhan QR ket qua', N'Nhan QR code tra ket qua online', 60, 60, 1, 0, NULL, 0, 1, 0, GETDATE());
GO

-- 13. RadiologyCLSScreenConfigs (for admin user)
INSERT INTO RadiologyCLSScreenConfigs (Id, UserId, PageSize, AutoLoadTemplate, ShowPatientHistory, EnableShortcuts, IsDeleted, CreatedAt) VALUES
(NEWID(), '9E5309DC-ECF9-4D48-9A09-224CD15347B1', 20, 1, 1, 1, 0, GETDATE());
GO

-- 14. RadiologyHL7CDAConfigs
INSERT INTO RadiologyHL7CDAConfigs (Id, ConfigName, HL7Version, CDAVersion, SendingApplication, SendingFacility, ReceivingApplication, ReceivingFacility, ConnectionType, ServerAddress, ServerPort, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'HIS to PACS HL7', N'2.5', N'R2', N'HIS', N'BVDK', N'PACS', N'ORTHANC', N'TCP', N'localhost', 2575, 1, 0, GETDATE()),
(NEWID(), N'HIS to LIS HL7', N'2.5', N'R2', N'HIS', N'BVDK', N'LIS', N'HL7SPY', N'TCP', N'localhost', 2576, 1, 0, GETDATE());
GO

-- 15. RadiologyTroubleshootings
INSERT INTO RadiologyTroubleshootings (Id, ErrorCode, ErrorTitle, ErrorDescription, Symptoms, Causes, Solution, RelatedModule, Severity, SortOrder, IsActive, IsDeleted, CreatedAt) VALUES
(NEWID(), N'RIS-001', N'Khong ket noi duoc PACS server', N'He thong bao loi khi truy van study tu PACS', N'Bao loi Connection refused hoac Timeout', N'1. PACS server tat\n2. Sai IP/Port\n3. Firewall chan', N'1. Kiem tra PACS server dang chay\n2. Kiem tra IP/Port trong cau hinh\n3. Mo port 4242 va 8042 tren firewall', N'PACS', 2, 1, 1, 0, GETDATE()),
(NEWID(), N'RIS-002', N'Anh DICOM khong hien thi', N'Mo DICOM Viewer nhung khong thay anh', N'Man hinh den hoac bao No images', N'1. Study chua duoc gui len PACS\n2. AE Title sai\n3. Loi WADO', N'1. Verify study tu may chup\n2. Kiem tra AE Title khop voi cau hinh\n3. Khoi dong lai Orthanc', N'DICOM', 2, 2, 1, 0, GETDATE()),
(NEWID(), N'RIS-003', N'Khong in duoc ket qua', N'Click In nhung khong ra phieu ket qua', N'Khong co phan hoi khi nhan In', N'1. May in mat ket noi\n2. Trinh duyet chan popup\n3. Loi template', N'1. Kiem tra may in\n2. Cho phep popup trong trinh duyet\n3. Kiem tra mau in trong cau hinh', N'Print', 1, 3, 1, 0, GETDATE()),
(NEWID(), N'RIS-004', N'Loi chu ky so USB Token', N'Khong ky duoc ket qua bang USB Token', N'Bao loi Token not found hoac Certificate expired', N'1. USB Token chua cam\n2. Driver chua cai\n3. Certificate het han', N'1. Cam USB Token va cho nhan dien\n2. Cai driver VNPT CA\n3. Lien he nha cung cap gia han Certificate', N'Signature', 2, 4, 1, 0, GETDATE()),
(NEWID(), N'RIS-005', N'Worklist khong gui duoc den may chup', N'May chup khong nhan duoc thong tin benh nhan tu worklist', N'May chup khong hien BN can chup', N'1. May chup chua bat DICOM Worklist\n2. Sai AE Title\n3. Mang bi ngat', N'1. Kiem tra cau hinh Worklist tren may chup\n2. Doi chieu AE Title giua HIS va may chup\n3. Kiem tra ket noi mang', N'Worklist', 2, 5, 1, 0, GETDATE());
GO

PRINT 'RIS/PACS seed completed successfully!';
