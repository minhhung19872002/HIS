namespace HIS.Application.DTOs.Examination;

public class MultiRoomRegistrationDto
{
    public Guid PatientId { get; set; }
    public int PatientType { get; set; } = 2;
    public List<Guid> RoomIds { get; set; } = new();
    public string? InsuranceNumber { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? InitialDiagnosis { get; set; }
    public int QueueType { get; set; } = 1;
}

public class MultiRoomRegistrationResultDto
{
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public List<RegisteredExamDto> Examinations { get; set; } = new();
}

public class RegisteredExamDto
{
    public Guid ExaminationId { get; set; }
    public Guid RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public int QueueNumber { get; set; }
    public int Status { get; set; }
}

public class AddFollowUpSpecialtyDto
{
    public Guid ParentExaminationId { get; set; }
    public Guid RoomId { get; set; }
    public string? Reason { get; set; }
}

public class ChangeRoomBeforeExamDto
{
    public Guid ExaminationId { get; set; }
    public Guid NewRoomId { get; set; }
    public string? Reason { get; set; }
}

public class ExamCompletionStatusDto
{
    public Guid ExaminationId { get; set; }
    public bool IsCompleted { get; set; }
    public bool IsBillPrinted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? BillPrintedAt { get; set; }
    public bool CanPrintBill { get; set; }
    public string? BlockReason { get; set; }
    public int TotalExamsInChain { get; set; }
    public int CompletedExamsInChain { get; set; }
}

public class DeleteRegistrationDto
{
    public Guid ExaminationId { get; set; }
    public string Reason { get; set; } = string.Empty;
}
