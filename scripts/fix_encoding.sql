-- Fix double-encoded UTF-8 Vietnamese text in master data tables
-- These records were inserted from seed_data.sql with wrong encoding

-- ============================================
-- FIX DEPARTMENTS (6 records corrupted)
-- ============================================
UPDATE Departments SET DepartmentName = N'Khoa Cấp cứu' WHERE DepartmentCode = 'KCK';
UPDATE Departments SET DepartmentName = N'Khoa Dược' WHERE DepartmentCode = 'KD';
UPDATE Departments SET DepartmentName = N'Khoa Khám bệnh' WHERE DepartmentCode = 'KKB';
UPDATE Departments SET DepartmentName = N'Khoa Nội khoa' WHERE DepartmentCode = 'KNK';
UPDATE Departments SET DepartmentName = N'Khoa Ngoại tổng hợp' WHERE DepartmentCode = 'KNT';
UPDATE Departments SET DepartmentName = N'Khoa Xét nghiệm' WHERE DepartmentCode = 'KXN';

-- ============================================
-- FIX ROOMS (7 records corrupted)
-- ============================================
UPDATE Rooms SET RoomName = N'Phòng Nội 101' WHERE RoomCode = 'NT101';
UPDATE Rooms SET RoomName = N'Phòng Nội 102' WHERE RoomCode = 'NT102';
UPDATE Rooms SET RoomName = N'Phòng VIP 103' WHERE RoomCode = 'NT103';
UPDATE Rooms SET RoomName = N'Phòng khám 101 - Nội tổng quát' WHERE RoomCode = 'P101';
UPDATE Rooms SET RoomName = N'Phòng khám 102 - Ngoại tổng quát' WHERE RoomCode = 'P102';
UPDATE Rooms SET RoomName = N'Phòng khám 103 - Nhi khoa' WHERE RoomCode = 'P103';
UPDATE Rooms SET RoomName = N'Phòng khám 104 - Tim mạch' WHERE RoomCode = 'P104';

-- ============================================
-- FIX SERVICES (all 15 records corrupted)
-- ============================================
UPDATE Services SET ServiceName = N'Khám chuyên khoa' WHERE ServiceCode = 'KB_CK';
UPDATE Services SET ServiceName = N'Khám dịch vụ theo yêu cầu' WHERE ServiceCode = 'KB_DV';
UPDATE Services SET ServiceName = N'Khám bệnh thông thường' WHERE ServiceCode = 'KB_TQ';
UPDATE Services SET ServiceName = N'Siêu âm ổ bụng tổng quát' WHERE ServiceCode = 'SA_BUNG';
UPDATE Services SET ServiceName = N'Siêu âm tuyến giáp' WHERE ServiceCode = 'SA_GIAP';
UPDATE Services SET ServiceName = N'Siêu âm tim' WHERE ServiceCode = 'SA_TIM';
UPDATE Services SET ServiceName = N'Creatinin máu' WHERE ServiceCode = 'XN_CREATININ';
UPDATE Services SET ServiceName = N'Công thức máu' WHERE ServiceCode = 'XN_CTM';
UPDATE Services SET ServiceName = N'Đường máu mao mạch' WHERE ServiceCode = 'XN_DMM';
UPDATE Services SET ServiceName = N'Ure máu' WHERE ServiceCode = 'XN_URE';
UPDATE Services SET ServiceName = N'X-Quang cột sống' WHERE ServiceCode = 'XQ_COTSO';
UPDATE Services SET ServiceName = N'X-Quang ngực thẳng' WHERE ServiceCode = 'XQ_NGUC';
-- GOT, GPT, HbA1c are ASCII - no fix needed

-- ============================================
-- FIX ICD CODES (corrupted entries)
-- ============================================
UPDATE IcdCodes SET Name = N'Bệnh tả' WHERE Code = 'A00';
UPDATE IcdCodes SET Name = N'Tiêu chảy và viêm dạ dày-ruột' WHERE Code = 'A09';
UPDATE IcdCodes SET Name = N'Đái tháo đường typ 2' WHERE Code = 'E11';
UPDATE IcdCodes SET Name = N'Viêm mũi họng cấp' WHERE Code = 'J00';
UPDATE IcdCodes SET Name = N'Nhiễm khuẩn đường hô hấp trên cấp' WHERE Code = 'J06';
UPDATE IcdCodes SET Name = N'Viêm dạ dày và viêm tá tràng' WHERE Code = 'K29';
UPDATE IcdCodes SET Name = N'Đau lưng' WHERE Code = 'M54';

PRINT N'Encoding fix completed successfully!';
