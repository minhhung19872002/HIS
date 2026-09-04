-- 170: biên bản mổ phải có chỗ ghi KẾT LUẬN (#218 / T3).
--
-- `CompleteSurgeryDto` và `SurgeryExecutionDto` đều mang trường `Conclusion`, giao diện đều gửi lên,
-- nhưng `SurgeryRecords` không có cột nào tên như vậy và `CompleteSurgeryAsync` cũng không ánh xạ nó
-- đi đâu cả. Nghĩa là kết luận ca mổ bị rơi ngay trên ĐƯỜNG THUẬN, không cần tình huống lạ nào.
-- Đo được ở evidence/cross/t3/t3_surgery_transitions.json.
--
-- `SecondaryIcdCodes` cũng vậy: `SurgeryExecutionDto` có, bảng thì không.
--
-- Idempotent: chỉ thêm cột nếu chưa có. Cột nullable nên dữ liệu cũ không cần vá.
IF COL_LENGTH('dbo.SurgeryRecords', 'Conclusion') IS NULL
BEGIN
    ALTER TABLE SurgeryRecords ADD Conclusion nvarchar(max) NULL;
END
GO

IF COL_LENGTH('dbo.SurgeryRecords', 'SecondaryIcdCodes') IS NULL
BEGIN
    ALTER TABLE SurgeryRecords ADD SecondaryIcdCodes nvarchar(500) NULL;
END
GO
