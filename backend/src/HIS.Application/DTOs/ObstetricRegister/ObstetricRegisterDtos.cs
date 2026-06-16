namespace HIS.Application.DTOs.ObstetricRegister;

public class BirthRegisterDto
{
    public Guid Id { get; set; }
    public int RegisterNo { get; set; }
    public DateTime DeliveryDate { get; set; }

    public string MotherName { get; set; } = string.Empty;
    public int MotherAge { get; set; }
    public string? MotherIdNumber { get; set; }
    public string? MotherAddress { get; set; }

    public int GestationalWeeks { get; set; }
    public string? ParaInfo { get; set; }
    public string? DeliveryMethod { get; set; }

    public int BabyCount { get; set; } = 1;
    public int BabyGender { get; set; }
    public decimal BabyWeight { get; set; }
    public string? BabyCondition { get; set; }

    public string? Attendant { get; set; }
    public string? Notes { get; set; }
}

public class AbortionRegisterDto
{
    public Guid Id { get; set; }
    public int RegisterNo { get; set; }
    public DateTime ProcedureDate { get; set; }

    public string PatientName { get; set; } = string.Empty;
    public int PatientAge { get; set; }
    public string? PatientIdNumber { get; set; }
    public string? PatientAddress { get; set; }

    public int GestationalWeeks { get; set; }
    public string? Method { get; set; }
    public string? Reason { get; set; }
    public string? Performer { get; set; }
    public string? Complications { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Báo cáo BYT tổng hợp 2 sổ Sản theo khoảng thời gian.
/// </summary>
public class ObstetricReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }

    // Sinh đẻ
    public int TotalDeliveries { get; set; }
    public int TotalBabies { get; set; }
    public int BabiesAlive { get; set; }
    public int BabiesDead { get; set; }
    public int MaleBabies { get; set; }
    public int FemaleBabies { get; set; }
    public Dictionary<string, int> DeliveriesByMethod { get; set; } = new();

    // Nạo phá thai
    public int TotalAbortions { get; set; }
    public Dictionary<string, int> AbortionsByMethod { get; set; } = new();
    public int AbortionComplications { get; set; }
}
