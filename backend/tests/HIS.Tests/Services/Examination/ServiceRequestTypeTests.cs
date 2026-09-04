using HIS.Core.Constants;
using Xunit;

// Dùng chung namespace `...ExaminationFlow` với PrescriptionSafetyTests: đặt namespace
// `...Services.Examination` sẽ che mất kiểu thực thể `Examination` ở file bên cạnh.
namespace HIS.Tests.Services.ExaminationFlow;

/// <summary>
/// #217 (T2): hai bảng dùng hai từ vựng loại dịch vụ lệch nhau một bậc.
///
///   Service.ServiceType       : 1-Khám, 2-XN,   3-CĐHA, 4-TDCN, 5-PTTT
///   ServiceRequest.RequestType: 1-XN,   2-CĐHA, 3-TDCN, 4-PTTT, 5-Khác
///
/// Đường chỉ định của phòng khám từng gán thẳng `RequestType = service.ServiceType`, nên một chỉ
/// định XÉT NGHIỆM được ghi là loại "CĐHA". Bộ khớp kết quả máy phân tích lọc `RequestType == 1`
/// nên không bao giờ khớp được phiếu đó — đo được ở bài t2_lab_result_path.
/// </summary>
public class ServiceRequestTypeTests
{
    [Theory]
    [InlineData(2, ServiceRequestType.Lab)]           // XN   → XN
    [InlineData(3, ServiceRequestType.Imaging)]       // CĐHA → CĐHA
    [InlineData(4, ServiceRequestType.FunctionTest)]  // TDCN → TDCN
    [InlineData(5, ServiceRequestType.Surgery)]       // PTTT → PTTT
    public void Paraclinical_types_shift_by_one(int serviceType, int expected)
        => Assert.Equal(expected, ServiceRequestType.FromServiceType(serviceType));

    [Theory]
    [InlineData(1)]   // Khám — không có loại phiếu tương ứng
    [InlineData(0)]
    [InlineData(9)]
    public void Anything_without_a_counterpart_becomes_other(int serviceType)
        => Assert.Equal(ServiceRequestType.Other, ServiceRequestType.FromServiceType(serviceType));

    [Fact]
    public void Copying_straight_across_would_mislabel_a_lab_order()
    {
        // Đây chính là lỗi cũ: ServiceType 2 (XN) chép thẳng thành RequestType 2 (CĐHA).
        const int labServiceType = 2;
        Assert.NotEqual(labServiceType, ServiceRequestType.FromServiceType(labServiceType));
        Assert.Equal(ServiceRequestType.Lab, ServiceRequestType.FromServiceType(labServiceType));
        Assert.Equal("Chẩn đoán hình ảnh", ServiceRequestType.GetName(labServiceType));
    }

    [Fact]
    public void Names_match_the_entity_comment()
    {
        Assert.Equal("Xét nghiệm", ServiceRequestType.GetName(ServiceRequestType.Lab));
        Assert.Equal("Chẩn đoán hình ảnh", ServiceRequestType.GetName(ServiceRequestType.Imaging));
        Assert.Equal("Thăm dò chức năng", ServiceRequestType.GetName(ServiceRequestType.FunctionTest));
        Assert.Equal("Phẫu thuật - thủ thuật", ServiceRequestType.GetName(ServiceRequestType.Surgery));
        Assert.Equal("Khác", ServiceRequestType.GetName(ServiceRequestType.Other));
    }
}
