namespace HIS.Core.Entities;

/// <summary>
/// Sổ sinh đẻ (Birth register) — #154 F1.8. Register pháp lý khoa Sản:
/// mỗi record = 1 ca sinh. Nhập tay (không chỉ đếm trong tiền sử). Soft-delete IsDeleted.
/// </summary>
public class BirthRegister : BaseEntity
{
    public int RegisterNo { get; set; }            // số thứ tự sổ
    public DateTime DeliveryDate { get; set; }     // ngày giờ sinh

    // Sản phụ
    public string MotherName { get; set; } = string.Empty;
    public int MotherAge { get; set; }
    public string? MotherIdNumber { get; set; }    // CCCD/CMND
    public string? MotherAddress { get; set; }

    public int GestationalWeeks { get; set; }      // tuổi thai (tuần)
    public string? ParaInfo { get; set; }          // PARA / số lần sinh
    public string? DeliveryMethod { get; set; }    // Đẻ thường / Mổ / Forceps / Giác hút

    // Trẻ
    public int BabyCount { get; set; } = 1;        // số con (sinh đôi...)
    public int BabyGender { get; set; }            // 1=Nam, 2=Nữ, 0=chưa rõ
    public decimal BabyWeight { get; set; }        // gram
    public string? BabyCondition { get; set; }     // Sống / Chết / Dị tật

    public string? Attendant { get; set; }         // BS/NHS đỡ đẻ
    public string? Notes { get; set; }
}

/// <summary>
/// Sổ theo dõi nạo phá thai (Abortion register) — #154 F1.8. Register pháp lý khoa Sản:
/// mỗi record = 1 ca. Nhập tay. Soft-delete IsDeleted.
/// </summary>
public class AbortionRegister : BaseEntity
{
    public int RegisterNo { get; set; }            // số thứ tự sổ
    public DateTime ProcedureDate { get; set; }    // ngày thực hiện

    public string PatientName { get; set; } = string.Empty;
    public int PatientAge { get; set; }
    public string? PatientIdNumber { get; set; }   // CCCD/CMND
    public string? PatientAddress { get; set; }

    public int GestationalWeeks { get; set; }      // tuổi thai (tuần)
    public string? Method { get; set; }            // Hút / Nạo / Thuốc
    public string? Reason { get; set; }            // lý do
    public string? Performer { get; set; }         // người thực hiện
    public string? Complications { get; set; }     // tai biến / biến chứng
    public string? Notes { get; set; }
}
