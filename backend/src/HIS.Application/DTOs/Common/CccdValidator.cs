namespace HIS.Application.DTOs;

public class CccdValidationResultDto
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Province { get; set; }
    public int? Gender { get; set; } // 0=Nam, 1=Nu
    public int? BirthCentury { get; set; } // 19xx or 20xx
}

/// <summary>
/// Vietnamese CCCD (Citizen Identity Card) validator
/// Format: PPG C YYNNNNNN (12 digits)
/// PP = Province code (01-96)
/// G = Gender + Century digit
/// C = Century check
/// YY = Birth year (last 2 digits)
/// NNNNNN = Random sequence
/// </summary>
public static class CccdValidator
{
    // Vietnamese province codes (01-96)
    private static readonly Dictionary<string, string> ProvinceCodes = new()
    {
        ["001"] = "Hà Nội", ["002"] = "Hà Giang", ["004"] = "Cao Bằng",
        ["006"] = "Bắc Kạn", ["008"] = "Tuyên Quang", ["010"] = "Lào Cai",
        ["011"] = "Điện Biên", ["012"] = "Lai Châu", ["014"] = "Sơn La",
        ["015"] = "Yên Bái", ["017"] = "Hoà Bình", ["019"] = "Thái Nguyên",
        ["020"] = "Lạng Sơn", ["022"] = "Quảng Ninh", ["024"] = "Bắc Giang",
        ["025"] = "Phú Thọ", ["026"] = "Vĩnh Phúc", ["027"] = "Bắc Ninh",
        ["030"] = "Hải Dương", ["031"] = "Hải Phòng", ["033"] = "Hưng Yên",
        ["034"] = "Thái Bình", ["035"] = "Hà Nam", ["036"] = "Nam Định",
        ["037"] = "Ninh Bình", ["038"] = "Thanh Hoá", ["040"] = "Nghệ An",
        ["042"] = "Hà Tĩnh", ["044"] = "Quảng Bình", ["045"] = "Quảng Trị",
        ["046"] = "Thừa Thiên Huế", ["048"] = "Đà Nẵng", ["049"] = "Quảng Nam",
        ["051"] = "Quảng Ngãi", ["052"] = "Bình Định", ["054"] = "Phú Yên",
        ["056"] = "Khánh Hoà", ["058"] = "Ninh Thuận", ["060"] = "Bình Thuận",
        ["062"] = "Kon Tum", ["064"] = "Gia Lai", ["066"] = "Đắk Lắk",
        ["067"] = "Đắk Nông", ["068"] = "Lâm Đồng", ["070"] = "Bình Phước",
        ["072"] = "Tây Ninh", ["074"] = "Bình Dương", ["075"] = "Đồng Nai",
        ["077"] = "Bà Rịa - Vũng Tàu", ["079"] = "TP. Hồ Chí Minh",
        ["080"] = "Long An", ["082"] = "Tiền Giang", ["083"] = "Bến Tre",
        ["084"] = "Trà Vinh", ["086"] = "Vĩnh Long", ["087"] = "Đồng Tháp",
        ["089"] = "An Giang", ["091"] = "Kiên Giang", ["092"] = "Cần Thơ",
        ["093"] = "Hậu Giang", ["094"] = "Sóc Trăng", ["095"] = "Bạc Liêu",
        ["096"] = "Cà Mau"
    };

    public static CccdValidationResultDto Validate(string? cccd)
    {
        if (string.IsNullOrWhiteSpace(cccd))
            return new CccdValidationResultDto { IsValid = false, ErrorMessage = "Số CCCD không được để trống" };

        var cleaned = cccd.Trim().Replace(" ", "");

        // Must be exactly 12 digits
        if (cleaned.Length != 12 || !cleaned.All(char.IsDigit))
            return new CccdValidationResultDto { IsValid = false, ErrorMessage = "CCCD phải có đúng 12 chữ số" };

        // Extract parts
        var provinceCode = cleaned[..3];
        var genderCenturyDigit = int.Parse(cleaned[3].ToString());
        var birthYearSuffix = cleaned[4..6];

        // Validate province code
        if (!ProvinceCodes.TryGetValue(provinceCode, out var provinceName))
            return new CccdValidationResultDto { IsValid = false, ErrorMessage = $"Mã tỉnh/thành '{provinceCode}' không hợp lệ" };

        // Gender + century: 0,1=Nam 20th; 2,3=Nữ 20th; 4,5=Nam 21st; 6,7=Nữ 21st; 8,9=Nam 22nd
        int gender = genderCenturyDigit % 2 == 0 ? 0 : 1; // 0=male, 1=female (even=male, odd=female)
        int birthCentury;
        if (genderCenturyDigit <= 1) birthCentury = 1900;
        else if (genderCenturyDigit <= 3) birthCentury = 1900;
        else if (genderCenturyDigit <= 5) birthCentury = 2000;
        else if (genderCenturyDigit <= 7) birthCentury = 2000;
        else birthCentury = 2100;

        // Correct gender interpretation: 0,1=20th century; 2,3=20th century; etc
        // Even digits (0,2,4,6,8) = Male, Odd digits (1,3,5,7,9) = Female
        gender = genderCenturyDigit % 2 == 0 ? 0 : 1;

        return new CccdValidationResultDto
        {
            IsValid = true,
            Province = provinceName,
            Gender = gender,
            BirthCentury = birthCentury + int.Parse(birthYearSuffix)
        };
    }
}
