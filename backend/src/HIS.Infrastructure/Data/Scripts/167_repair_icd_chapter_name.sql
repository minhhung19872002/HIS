-- 167: Chuẩn hoá IcdCodes.ChapterName theo ChapterCode (T1 #216 phát hiện F5).
-- Triệu chứng: 8/41 dòng local + prod bị mojibake double-UTF8 ("Bá»‡nh nhiá»…m trÃ¹ng vÃ  kÃ½ sinh trÃ¹ng"),
-- do một đường seed CŨ (không còn trong repo) ghi UTF-8 qua kết nối không Unicode — cùng dạng hỏng đã
-- xử lý ở 98_repair_mojibake_legacy_text.sql. Đồng thời cùng một ChapterCode đang mang 2 tên khác nhau
-- ("Bệnh nhiễm trùng" vs bản đầy đủ) => tên chương không còn là hàm của mã chương.
-- Cách sửa: ChapterName là thuộc tính DẪN XUẤT từ ChapterCode, nên set lại theo bảng chuẩn ICD-10
-- (22 chương, Bộ Y tế). Vừa hết mojibake vừa hết lệch tên. KHÔNG đụng Code/Name của từng mã bệnh.
-- Idempotent: guard `<> N'<tên chuẩn>'` — collation CI_AS phân biệt dấu nên dòng đã đúng không bị update;
-- chạy lần 2 = 0 rows. Env sạch = 0 rows.

IF OBJECT_ID('dbo.IcdCodes', 'U') IS NOT NULL
BEGIN
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh nhiễm trùng và ký sinh trùng'
        WHERE ChapterCode = 'I'     AND ChapterName <> N'Bệnh nhiễm trùng và ký sinh trùng';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bướu tân sinh'
        WHERE ChapterCode = 'II'    AND ChapterName <> N'Bướu tân sinh';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh của máu, cơ quan tạo máu và các rối loạn liên quan đến cơ chế miễn dịch'
        WHERE ChapterCode = 'III'   AND ChapterName <> N'Bệnh của máu, cơ quan tạo máu và các rối loạn liên quan đến cơ chế miễn dịch';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh nội tiết, dinh dưỡng và chuyển hóa'
        WHERE ChapterCode = 'IV'    AND ChapterName <> N'Bệnh nội tiết, dinh dưỡng và chuyển hóa';
    UPDATE dbo.IcdCodes SET ChapterName = N'Rối loạn tâm thần và hành vi'
        WHERE ChapterCode = 'V'     AND ChapterName <> N'Rối loạn tâm thần và hành vi';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh hệ thần kinh'
        WHERE ChapterCode = 'VI'    AND ChapterName <> N'Bệnh hệ thần kinh';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh mắt và phần phụ'
        WHERE ChapterCode = 'VII'   AND ChapterName <> N'Bệnh mắt và phần phụ';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh tai và xương chũm'
        WHERE ChapterCode = 'VIII'  AND ChapterName <> N'Bệnh tai và xương chũm';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh hệ tuần hoàn'
        WHERE ChapterCode = 'IX'    AND ChapterName <> N'Bệnh hệ tuần hoàn';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh hệ hô hấp'
        WHERE ChapterCode = 'X'     AND ChapterName <> N'Bệnh hệ hô hấp';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh hệ tiêu hóa'
        WHERE ChapterCode = 'XI'    AND ChapterName <> N'Bệnh hệ tiêu hóa';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh da và mô dưới da'
        WHERE ChapterCode = 'XII'   AND ChapterName <> N'Bệnh da và mô dưới da';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh hệ cơ - xương - khớp và mô liên kết'
        WHERE ChapterCode = 'XIII'  AND ChapterName <> N'Bệnh hệ cơ - xương - khớp và mô liên kết';
    UPDATE dbo.IcdCodes SET ChapterName = N'Bệnh hệ sinh dục - tiết niệu'
        WHERE ChapterCode = 'XIV'   AND ChapterName <> N'Bệnh hệ sinh dục - tiết niệu';
    UPDATE dbo.IcdCodes SET ChapterName = N'Thai nghén, sinh đẻ và hậu sản'
        WHERE ChapterCode = 'XV'    AND ChapterName <> N'Thai nghén, sinh đẻ và hậu sản';
    UPDATE dbo.IcdCodes SET ChapterName = N'Một số bệnh lý xuất phát trong thời kỳ chu sinh'
        WHERE ChapterCode = 'XVI'   AND ChapterName <> N'Một số bệnh lý xuất phát trong thời kỳ chu sinh';
    UPDATE dbo.IcdCodes SET ChapterName = N'Dị tật bẩm sinh, biến dạng và bất thường về nhiễm sắc thể'
        WHERE ChapterCode = 'XVII'  AND ChapterName <> N'Dị tật bẩm sinh, biến dạng và bất thường về nhiễm sắc thể';
    UPDATE dbo.IcdCodes SET ChapterName = N'Triệu chứng, dấu hiệu và những phát hiện lâm sàng, cận lâm sàng bất thường, không phân loại ở phần khác'
        WHERE ChapterCode = 'XVIII' AND ChapterName <> N'Triệu chứng, dấu hiệu và những phát hiện lâm sàng, cận lâm sàng bất thường, không phân loại ở phần khác';
    UPDATE dbo.IcdCodes SET ChapterName = N'Vết thương, ngộ độc và hậu quả của một số nguyên nhân bên ngoài'
        WHERE ChapterCode = 'XIX'   AND ChapterName <> N'Vết thương, ngộ độc và hậu quả của một số nguyên nhân bên ngoài';
    UPDATE dbo.IcdCodes SET ChapterName = N'Nguyên nhân ngoại sinh của bệnh tật và tử vong'
        WHERE ChapterCode = 'XX'    AND ChapterName <> N'Nguyên nhân ngoại sinh của bệnh tật và tử vong';
    UPDATE dbo.IcdCodes SET ChapterName = N'Các yếu tố ảnh hưởng đến tình trạng sức khỏe và tiếp xúc dịch vụ y tế'
        WHERE ChapterCode = 'XXI'   AND ChapterName <> N'Các yếu tố ảnh hưởng đến tình trạng sức khỏe và tiếp xúc dịch vụ y tế';
    UPDATE dbo.IcdCodes SET ChapterName = N'Mã dành cho mục đích đặc biệt'
        WHERE ChapterCode = 'XXII'  AND ChapterName <> N'Mã dành cho mục đích đặc biệt';
END
