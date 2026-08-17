namespace HIS.Core.Common;

/// <summary>
/// Bảng mã <c>Room.RoomType</c> và phép ánh xạ từ <c>Service.ServiceType</c> sang loại phòng
/// thực hiện được dịch vụ đó.
///
/// Vì sao cần lớp này: hai cột trên là HAI bảng mã KHÁC NHAU nhưng code cũ so sánh trực tiếp
/// <c>room.RoomType == service.ServiceType</c> ở 3 chỗ (ExaminationCompleteService.ServiceOrders,
/// ReceptionCompleteService.OrdersBilling ×2). Chúng chỉ trùng nghĩa ngẫu nhiên tại giá trị 1:
///
///   ServiceType : 1-Khám  2-Xét nghiệm  3-CĐHA        4-TDCN  5-PTTT
///   RoomType    : 1-Khám  2-Phòng bệnh  3-Phòng mổ    4-CLS   5-Khám sức khoẻ
///
/// ⇒ chỉ định XÉT NGHIỆM bị gán vào PHÒNG BỆNH nội trú, chỉ định CĐHA bị gán vào PHÒNG MỔ,
/// chỉ định PHẪU THUẬT bị gán vào phòng KHÁM SỨC KHOẺ. Ánh xạ tường minh ở đây thay cho phép
/// so sánh ngầm đó.
/// </summary>
public static class RoomTypes
{
    public const int Examination = 1;      // Phòng khám
    public const int Inpatient = 2;        // Phòng bệnh (nội trú)
    public const int Operating = 3;        // Phòng mổ
    public const int Paraclinical = 4;     // Phòng CLS / lấy mẫu / xét nghiệm chung
    public const int HealthCheckup = 5;    // Phòng khám sức khoẻ
    public const int Emergency = 6;        // Phòng cấp cứu
    public const int ReceptionDesk = 7;    // Quầy tiếp đón

    /// <summary>Dải mã dành riêng cho phòng CĐHA chuyên biệt: 10-XRay, 11-CT, 12-MRI, 13-Siêu âm, 14-Nội soi, 15-ECG.</summary>
    public const int ImagingFirst = 10;
    public const int ImagingLast = 19;

    /// <summary>
    /// Các loại phòng có thể thực hiện một dịch vụ. Trả về mảng rỗng khi không xác định được,
    /// để caller tự chọn cách xử lý thay vì âm thầm khớp nhầm phòng.
    /// </summary>
    public static int[] ForServiceType(int serviceType) => serviceType switch
    {
        1 => new[] { Examination },                       // Khám bệnh
        2 => new[] { Paraclinical },                      // Xét nghiệm — phòng lấy mẫu/CLS
        3 => ImagingRoomTypes(),                          // CĐHA — phòng CLS hoặc phòng CĐHA chuyên biệt
        4 => ImagingRoomTypes(),                          // Thăm dò chức năng — dùng chung nhóm CLS/thiết bị
        5 => new[] { Operating },                         // Phẫu thuật, thủ thuật
        _ => System.Array.Empty<int>(),
    };

    /// <summary>Nhóm phòng làm được CĐHA/TDCN: phòng CLS chung + toàn bộ dải phòng chuyên biệt.</summary>
    private static int[] ImagingRoomTypes()
    {
        var types = new int[1 + (ImagingLast - ImagingFirst + 1)];
        types[0] = Paraclinical;
        for (var i = 0; i <= ImagingLast - ImagingFirst; i++) types[i + 1] = ImagingFirst + i;
        return types;
    }
}
