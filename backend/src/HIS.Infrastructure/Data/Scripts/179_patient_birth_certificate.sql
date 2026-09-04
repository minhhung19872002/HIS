-- 179: số giấy khai sinh của bệnh nhân (#218 / T3).
--
-- `CreateTemporaryInsuranceDto` mang `BirthCertificateNumber` từ giao diện xuống, nhưng `Patients`
-- không có ô nào để giữ. Trẻ sơ sinh chưa có CCCD, giấy khai sinh là giấy tờ định danh duy nhất —
-- không lưu thì mỗi lần trẻ đến khám lại đẻ ra một hồ sơ bệnh nhân mới.
--
-- Cột này là PII cùng loại với `IdentityNumber`/`InsuranceNumber` nên được **mã hoá tại chỗ** bằng
-- `EncryptedStringConverter` (khai trong `HISDbContext`). Vì mã hoá không tra được bằng `=` dưới
-- SQL, việc tra dùng `PatientPiiLookup.FindByBirthCertificateNumberDecryptedAsync` — đúng khuôn ba
-- hàm tra PII đã có sẵn. Do đó KHÔNG đánh index trên cột này: index trên bản mã vô dụng.
--
-- Rộng 400: bản mã dài hơn bản rõ nhiều lần.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.Patients', 'BirthCertificateNumber') IS NULL
BEGIN
    ALTER TABLE Patients ADD BirthCertificateNumber nvarchar(400) NULL;
END
GO
