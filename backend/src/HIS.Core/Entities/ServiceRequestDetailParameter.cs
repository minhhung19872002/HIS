namespace HIS.Core.Entities;

/// <summary>
/// R1 (conformance 2026-06-09): chỉ số con của 1 kết quả XN (gắn ServiceRequestDetail — model 1, nguồn-sự-thật
/// FLOW-1/FLOW-4). Mỗi dịch vụ XN (vd "Công thức máu") có N chỉ số (WBC/RBC/HGB…) với giá trị / đơn vị /
/// khoảng tham chiếu / cờ cao-thấp. `ServiceRequestDetail.Result` (chuỗi) GIỮ NGUYÊN làm tóm tắt/legacy;
/// bảng này thuần additive cho hiển thị per-parameter + tô cờ ở màn khám/in phiếu.
/// </summary>
public class ServiceRequestDetailParameter : BaseEntity
{
    public Guid ServiceRequestDetailId { get; set; }
    public virtual ServiceRequestDetail? ServiceRequestDetail { get; set; }

    public string ParameterCode { get; set; } = string.Empty;
    public string ParameterName { get; set; } = string.Empty;
    public string? Value { get; set; }            // giá trị (string — cả số lẫn text/enum)
    public decimal? NumericValue { get; set; }    // parse được thì điền (để so sánh + tô cờ)
    public string? Unit { get; set; }
    public decimal? ReferenceMin { get; set; }
    public decimal? ReferenceMax { get; set; }
    public string? ReferenceRange { get; set; }   // text hiển thị (vd "3.5–5.0")
    public string? Flag { get; set; }             // N / H / L / HH(critical high) / LL(critical low)
    public int SequenceNumber { get; set; }
}
