using HIS.Core.Constants;
using Xunit;
using static HIS.Core.Constants.BloodCompatibility;

namespace HIS.Tests.Services.BloodBank;

/// <summary>
/// #218 (T3): đối chiếu tương thích nhóm máu cho chế phẩm chứa hồng cầu.
///
/// Đo trên API đang chạy (docs/architecture/evidence/cross/t3/t3_blood_transitions.json) trước khi
/// có lớp này: gán được túi **B+** cho bệnh nhân **A+**, và gán được túi Rh+ cho bệnh nhân Rh−.
/// Không nơi nào trong hệ thống đối chiếu ABO/Rh — máy chủ không tính, giao diện chỉ có một ô chọn
/// "Phù hợp / Không phù hợp" do người dùng tự chọn.
///
/// Lưới này neo cả hai chiều, vì sai chiều nào cũng gây hại: bỏ lọt một cặp không tương thích có thể
/// gây tan máu cấp; chặn nhầm một cặp hợp lệ có thể làm chậm truyền máu cấp cứu.
/// </summary>
public class BloodCompatibilityTests
{
    // ── Chiều "phải cho qua" ────────────────────────────────────────────────

    [Theory]
    [InlineData("O", "O")]
    [InlineData("A", "A")]
    [InlineData("A", "O")]
    [InlineData("B", "B")]
    [InlineData("B", "O")]
    [InlineData("AB", "A")]
    [InlineData("AB", "B")]
    [InlineData("AB", "AB")]
    [InlineData("AB", "O")]
    public void Red_cells_the_recipient_can_receive(string recipient, string donor)
        => Assert.Equal(BloodMatch.Compatible, Check("RBC", recipient, "+", donor, "+"));

    [Fact]
    public void An_Rh_positive_recipient_may_receive_Rh_negative_blood()
        => Assert.Equal(BloodMatch.Compatible, Check("RBC", "A", "+", "O", "-"));

    [Fact]
    public void O_negative_goes_to_anyone()
        => Assert.Equal(BloodMatch.Compatible, Check("RBC", "AB", "+", "O", "-"));

    // ── Chiều "phải chặn" ───────────────────────────────────────────────────

    [Theory]
    [InlineData("O", "A")]
    [InlineData("O", "B")]
    [InlineData("O", "AB")]
    [InlineData("A", "B")]
    [InlineData("A", "AB")]
    [InlineData("B", "A")]
    [InlineData("B", "AB")]
    public void Red_cells_the_recipient_cannot_receive(string recipient, string donor)
        => Assert.Equal(BloodMatch.Incompatible, Check("RBC", recipient, "+", donor, "+"));

    [Fact]
    public void An_Rh_negative_recipient_must_not_receive_Rh_positive_blood()
        => Assert.Equal(BloodMatch.Incompatible, Check("RBC", "O", "-", "O", "+"));

    [Fact]
    public void Whole_blood_must_match_exactly_even_where_red_cells_would_be_allowed()
    {
        // Khối hồng cầu O cho người nhóm A là hợp; máu TOÀN PHẦN thì không, vì nó mang theo cả
        // huyết tương của người cho.
        Assert.Equal(BloodMatch.Compatible, Check("RBC", "A", "+", "O", "+"));
        Assert.Equal(BloodMatch.Incompatible, Check("WB", "A", "+", "O", "+"));
        Assert.Equal(BloodMatch.Compatible, Check("WB", "A", "+", "A", "+"));
    }

    // ── Chiều "không kết luận" ──────────────────────────────────────────────

    [Theory]
    [InlineData("FFP")]
    [InlineData("PLT")]
    [InlineData("CRYO")]
    public void Non_red_cell_products_are_left_undecided(string product)
    {
        // Huyết tương gần như ngược lại với hồng cầu, tiểu cầu và tủa lạnh lại khác nữa. Áp luật
        // hồng cầu vào đây sẽ chặn nhầm chỉ định đúng, nên lớp này cố ý không kết luận.
        Assert.Equal(BloodMatch.Unknown, Check(product, "A", "+", "B", "+"));
    }

    [Theory]
    [InlineData(null, "+", "O", "+")]
    [InlineData("", "+", "O", "+")]
    [InlineData("A", "+", null, "+")]
    public void An_unknown_blood_group_never_blocks(string? rAbo, string rRh, string? dAbo, string dRh)
    {
        // Cấp cứu chảy máu ồ ạt: nhóm máu người bệnh thường chưa có kết quả. Chặn ở đây là gây hại
        // chứ không phải ngăn hại.
        Assert.Equal(BloodMatch.Unknown, Check("RBC", rAbo, rRh, dAbo, dRh));
    }

    [Fact]
    public void A_missing_Rh_still_lets_the_ABO_verdict_stand()
    {
        // Thiếu Rh thì bỏ qua phần Rh, nhưng phần ABO vẫn phải có hiệu lực.
        Assert.Equal(BloodMatch.Incompatible, Check("RBC", "A", null, "B", null));
        Assert.Equal(BloodMatch.Compatible, Check("RBC", "A", null, "O", null));
    }

    // ── Chuẩn hoá dữ liệu thật ──────────────────────────────────────────────

    [Theory]
    [InlineData("A", "A")]
    [InlineData(" a ", "A")]
    [InlineData("A+", "A")]
    [InlineData("ab-", "AB")]
    [InlineData("O+", "O")]
    [InlineData("x", null)]
    [InlineData("", null)]
    public void Abo_is_read_out_of_whatever_the_field_actually_holds(string raw, string? expected)
        => Assert.Equal(expected, NormalizeAbo(raw));

    [Theory]
    [InlineData("+", true)]
    [InlineData("-", false)]
    [InlineData("Positive", true)]
    [InlineData("NEG", false)]
    [InlineData("A+", true)]
    [InlineData("O-", false)]
    [InlineData("?", null)]
    public void Rh_is_read_out_of_whatever_the_field_actually_holds(string raw, bool? expected)
        => Assert.Equal(expected, NormalizeRh(raw));

    [Fact]
    public void The_refusal_names_both_groups_so_the_nurse_can_see_the_mismatch()
        => Assert.Equal("Người bệnh nhóm A+ không nhận được túi máu nhóm B+.",
            Describe("A", "+", "B", "+"));
}
