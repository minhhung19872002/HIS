namespace HIS.Core.Constants;

/// <summary>
/// Nguồn hằng DUY NHẤT cho <c>User.UserType</c> (loại nhân sự).
///
/// ⚠️ Trước đây bảng mã này chỉ tồn tại dưới dạng COMMENT ở <c>User.cs</c>, và 3 service đã
/// lọc nhầm <c>UserType == 2</c> (Điều dưỡng) trong khi comment ngay cạnh ghi "Bác sĩ" —
/// hậu quả là màn đặt lịch cho bệnh nhân chọn điều dưỡng thay vì bác sĩ, còn khoa nào không
/// có điều dưỡng thì dropdown rỗng dù khoa đó CÓ bác sĩ. Dùng hằng ở đây thay cho số trần
/// để lỗi kiểu đó thành lỗi đọc-được thay vì sai im lặng.
/// </summary>
public static class UserTypes
{
    public const int Doctor = 1;        // Bác sĩ
    public const int Nurse = 2;         // Điều dưỡng
    public const int Technician = 3;    // Kỹ thuật viên
    public const int Pharmacist = 4;    // Dược sĩ
    public const int Employee = 5;      // Nhân viên (mặc định khi tạo qua màn quản trị)
    public const int Admin = 6;         // Quản trị hệ thống

    /// <summary>Tên hiển thị tiếng Việt; trả "Khác (N)" cho giá trị lạ thay vì rỗng.</summary>
    public static string Name(int userType) => userType switch
    {
        Doctor => "Bác sĩ",
        Nurse => "Điều dưỡng",
        Technician => "Kỹ thuật viên",
        Pharmacist => "Dược sĩ",
        Employee => "Nhân viên",
        Admin => "Quản trị hệ thống",
        _ => $"Khác ({userType})",
    };

    /// <summary>Giá trị hợp lệ để validate đầu vào từ client.</summary>
    public static bool IsValid(int userType) => userType >= Doctor && userType <= Admin;
}
