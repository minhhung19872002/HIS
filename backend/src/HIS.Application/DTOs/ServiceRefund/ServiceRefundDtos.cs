namespace HIS.Application.DTOs.ServiceRefund;

public class RequeueDto
{
    public List<Guid> ServiceRequestDetailIds { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
    public bool KeepAsPaid { get; set; } = true; // true = kế thừa đã TT, false = chờ TT lại
}
