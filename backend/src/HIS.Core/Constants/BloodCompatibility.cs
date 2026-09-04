using System;
using System.Collections.Generic;
using System.Linq;

namespace HIS.Core.Constants;

/// <summary>
/// Đối chiếu tương thích nhóm máu cho CHẾ PHẨM CHỨA HỒNG CẦU.
///
/// <para>Đo trước khi có lớp này (evidence/cross/t3/t3_blood_transitions.json): gán được túi **B+**
/// cho bệnh nhân **A+**, và gán được túi Rh+ cho bệnh nhân Rh−. Không nơi nào trong hệ thống đối
/// chiếu ABO/Rh — máy chủ không tính, giao diện chỉ có một ô chọn "Phù hợp / Không phù hợp" do người
/// dùng tự chọn. Truyền nhầm nhóm hồng cầu gây tan máu cấp, có thể tử vong, và không đảo ngược
/// được.</para>
///
/// <para><b>Phạm vi cố ý hẹp.</b> Chỉ quyết định cho <b>khối hồng cầu</b> và <b>máu toàn phần</b>,
/// nơi luật ABO là luật cứng và không tranh cãi. Huyết tương (FFP), tiểu cầu (PLT) và tủa lạnh
/// (CRYO) có luật KHÁC — huyết tương gần như ngược lại với hồng cầu — nên lớp này **không kết luận**
/// cho chúng, thà không chặn còn hơn chặn sai một chỉ định đúng.</para>
///
/// <para><b>Không biết thì không chặn.</b> Nhóm máu bệnh nhân hoặc của túi mà trống thì trả
/// <see cref="BloodMatch.Unknown"/>. Trong cấp cứu chảy máu ồ ạt, nhóm máu bệnh nhân thường chưa có
/// kết quả và vẫn phải truyền được máu O — chặn ở đây là gây hại chứ không phải ngăn hại.</para>
/// </summary>
public static class BloodCompatibility
{
    public enum BloodMatch
    {
        /// <summary>Hợp — được phép truyền.</summary>
        Compatible,
        /// <summary>Không hợp — phải chặn.</summary>
        Incompatible,
        /// <summary>Không đủ dữ kiện để kết luận (thiếu nhóm máu, hoặc chế phẩm không phải hồng cầu).</summary>
        Unknown,
    }

    /// <summary>Mã chế phẩm CÓ chứa hồng cầu — chỉ những mã này mới áp luật ABO ở đây.</summary>
    public static readonly HashSet<string> RedCellProductCodes =
        new(StringComparer.OrdinalIgnoreCase) { "RBC", "WB" };

    /// <summary>Người nhận nhóm nào nhận được hồng cầu nhóm nào.</summary>
    private static readonly Dictionary<string, string[]> RedCellDonorsFor = new()
    {
        ["O"] = new[] { "O" },
        ["A"] = new[] { "A", "O" },
        ["B"] = new[] { "B", "O" },
        ["AB"] = new[] { "A", "B", "AB", "O" },
    };

    /// <summary>
    /// Chuẩn hoá chuỗi nhóm máu về O / A / B / AB. Trả null nếu không đọc được.
    /// Dữ liệu thật có cả "A", "a", "A+", "AB-" nên cắt bỏ phần Rh dính kèm.
    /// </summary>
    public static string? NormalizeAbo(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = new string(raw.Trim().ToUpperInvariant().Where(char.IsLetter).ToArray());
        return s is "O" or "A" or "B" or "AB" ? s : null;
    }

    /// <summary>
    /// Chuẩn hoá yếu tố Rh về true (dương) / false (âm) / null (không rõ).
    /// Nhận "+", "-", "POS", "NEG", "POSITIVE", "NEGATIVE", và cả "A+" / "O-".
    /// </summary>
    public static bool? NormalizeRh(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = raw.Trim().ToUpperInvariant();
        if (s.Contains('-') || s.StartsWith("NEG")) return false;
        if (s.Contains('+') || s.StartsWith("POS")) return true;
        return null;
    }

    /// <summary>
    /// Túi máu này có truyền được cho người bệnh này không.
    ///
    /// <param name="productCode">Mã chế phẩm (RBC · WB · FFP · PLT · CRYO). Không phải hồng cầu thì
    /// trả <see cref="BloodMatch.Unknown"/>.</param>
    /// </summary>
    public static BloodMatch Check(
        string? productCode,
        string? recipientAbo, string? recipientRh,
        string? donorAbo, string? donorRh)
    {
        if (string.IsNullOrWhiteSpace(productCode) || !RedCellProductCodes.Contains(productCode.Trim()))
            return BloodMatch.Unknown;

        var rAbo = NormalizeAbo(recipientAbo);
        var dAbo = NormalizeAbo(donorAbo);
        if (rAbo == null || dAbo == null) return BloodMatch.Unknown;

        // Máu toàn phần mang cả hồng cầu lẫn huyết tương của người cho nên phải ĐÚNG nhóm,
        // không áp bảng "nhận được từ" rộng hơn của khối hồng cầu.
        if (string.Equals(productCode.Trim(), "WB", StringComparison.OrdinalIgnoreCase))
        {
            if (rAbo != dAbo) return BloodMatch.Incompatible;
        }
        else if (!RedCellDonorsFor[rAbo].Contains(dAbo))
        {
            return BloodMatch.Incompatible;
        }

        var rRh = NormalizeRh(recipientRh);
        var dRh = NormalizeRh(donorRh);
        // Người bệnh Rh ÂM không được nhận hồng cầu Rh DƯƠNG. Chiều ngược lại thì được.
        // Thiếu một trong hai thông tin thì không kết luận phần Rh, nhưng phần ABO ở trên vẫn giữ.
        if (rRh == false && dRh == true) return BloodMatch.Incompatible;

        return BloodMatch.Compatible;
    }

    /// <summary>Câu giải thích cho người dùng khi không hợp.</summary>
    public static string Describe(string? recipientAbo, string? recipientRh, string? donorAbo, string? donorRh)
        => $"Người bệnh nhóm {NormalizeAbo(recipientAbo) ?? "?"}{RhSign(recipientRh)} "
           + $"không nhận được túi máu nhóm {NormalizeAbo(donorAbo) ?? "?"}{RhSign(donorRh)}.";

    private static string RhSign(string? raw) => NormalizeRh(raw) switch
    {
        true => "+",
        false => "−",
        _ => "",
    };
}
