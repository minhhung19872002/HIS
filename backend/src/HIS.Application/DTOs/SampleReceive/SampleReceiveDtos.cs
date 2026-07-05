using HIS.Application.DTOs.Examination;

namespace HIS.Application.DTOs.SampleReceive;

public class ReceiveDto
{
    public List<Guid> DetailIds { get; set; } = new();
    public string? Note { get; set; }
}

public class RejectDto
{
    public Guid DetailId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class RunDto
{
    public Guid DetailId { get; set; }
    public string? Result { get; set; }
    public string? ResultDescription { get; set; }
    public List<LabResultParameterInputDto>? Parameters { get; set; } // R1: KQ per-parameter (optional)
}

public class ReviewDto
{
    public Guid DetailId { get; set; }
    public string? Conclusion { get; set; }
}

public class CancelReceiveDto
{
    public List<Guid> DetailIds { get; set; } = new();
    public string? Reason { get; set; }
}
