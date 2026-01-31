namespace HIS.Core.Entities;

/// <summary>
/// Bệnh nhân - Patient
/// </summary>
public class Patient : BaseEntity
{
    public string PatientCode { get; set; } = string.Empty; // Mã bệnh nhân
    public string FullName { get; set; } = string.Empty; // Họ tên
    public DateTime? DateOfBirth { get; set; } // Ngày sinh
    public int? YearOfBirth { get; set; } // Năm sinh (nếu không biết ngày cụ thể)
    public int Gender { get; set; } // Giới tính: 1-Nam, 2-Nữ, 3-Khác
    public string? IdentityNumber { get; set; } // CCCD/CMND
    public string? PhoneNumber { get; set; } // Số điện thoại
    public string? Email { get; set; }

    // Địa chỉ
    public string? Address { get; set; } // Địa chỉ chi tiết
    public string? WardCode { get; set; } // Mã xã/phường
    public string? WardName { get; set; }
    public string? DistrictCode { get; set; } // Mã quận/huyện
    public string? DistrictName { get; set; }
    public string? ProvinceCode { get; set; } // Mã tỉnh/thành
    public string? ProvinceName { get; set; }
    public string? CountryCode { get; set; } // Mã quốc gia

    // Nghề nghiệp
    public string? Occupation { get; set; }
    public string? Workplace { get; set; }

    // Dân tộc
    public string? EthnicCode { get; set; }
    public string? EthnicName { get; set; }

    // Quốc tịch
    public string? NationalityCode { get; set; }
    public string? NationalityName { get; set; }

    // Thông tin BHYT
    public string? InsuranceNumber { get; set; } // Số thẻ BHYT
    public DateTime? InsuranceExpireDate { get; set; } // Ngày hết hạn
    public string? InsuranceFacilityCode { get; set; } // Mã CSKCB ban đầu
    public string? InsuranceFacilityName { get; set; }

    // Người giám hộ (cho trẻ em)
    public string? GuardianName { get; set; }
    public string? GuardianPhone { get; set; }
    public string? GuardianRelationship { get; set; }

    // Tiền sử
    public string? MedicalHistory { get; set; } // Tiền sử bệnh
    public string? AllergyHistory { get; set; } // Dị ứng
    public string? FamilyHistory { get; set; } // Tiền sử gia đình

    // Ảnh
    public string? PhotoPath { get; set; } // Ảnh chân dung

    // Navigation properties
    public virtual ICollection<MedicalRecord> MedicalRecords { get; set; } = new List<MedicalRecord>();
    public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
