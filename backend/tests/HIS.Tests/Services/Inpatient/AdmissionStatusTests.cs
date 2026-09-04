using HIS.Core.Constants;
using Xunit;

namespace HIS.Tests.Services.Inpatient;

/// <summary>
/// #218 (T3): điều kiện "lượt nội trú còn đang nằm viện" của các thao tác điều trị.
///
/// Đo trên API đang chạy (docs/architecture/evidence/cross/t3/t3_transfer_department.json) trước
/// khi có luật: `TransferDepartmentAsync` không đọc `Admissions.Status` lần nào, nên một bệnh nhân
/// ĐÃ XUẤT VIỆN vẫn chuyển được sang khoa khác và được xếp giường ở đó — HTTP 200, giường bị chiếm.
///
/// Bốn trạng thái kết thúc (xuất viện · chuyển viện · tử vong · bỏ về) phải chặn như nhau; lưới này
/// giữ cho không ai chỉ chặn mỗi "xuất viện" rồi bỏ sót ba cái còn lại.
/// </summary>
public class AdmissionStatusTests
{
    [Fact]
    public void Only_in_treatment_counts_as_active()
        => Assert.True(AdmissionStatus.IsActive(AdmissionStatus.InTreatment));

    [Theory]
    [InlineData(AdmissionStatus.Discharged)]
    [InlineData(AdmissionStatus.TransferredOut)]
    [InlineData(AdmissionStatus.Died)]
    [InlineData(AdmissionStatus.LeftAgainstAdvice)]
    public void Every_terminal_state_is_inactive(int status)
        => Assert.False(AdmissionStatus.IsActive(status));

    [Theory]
    [InlineData(AdmissionStatus.InTreatment, "Đang điều trị")]
    [InlineData(AdmissionStatus.Discharged, "Đã xuất viện")]
    [InlineData(AdmissionStatus.TransferredOut, "Đã chuyển viện")]
    [InlineData(AdmissionStatus.Died, "Đã tử vong")]
    [InlineData(AdmissionStatus.LeftAgainstAdvice, "Đã bỏ về")]
    public void Labels_match_the_discharge_mapping_the_running_code_uses(int status, string expected)
        => Assert.Equal(expected, AdmissionStatus.Label(status));

    [Fact]
    public void Unknown_status_is_named_rather_than_hidden()
        => Assert.Equal("Không xác định (7)", AdmissionStatus.Label(7));

    [Fact]
    public void The_numbers_match_what_discharge_writes()
    {
        // InpatientCompleteService.Discharge.cs ánh xạ DischargeType → Status:
        // 1 xuất viện → 1 · 2 chuyển viện → 2 · 3 bỏ về → 4 · 4 tử vong → 3.
        // Ghi lại thành test vì hai cặp cuối bị đảo, rất dễ chép nhầm khi thêm luật mới.
        Assert.Equal(1, AdmissionStatus.Discharged);
        Assert.Equal(2, AdmissionStatus.TransferredOut);
        Assert.Equal(3, AdmissionStatus.Died);
        Assert.Equal(4, AdmissionStatus.LeftAgainstAdvice);
    }
}
