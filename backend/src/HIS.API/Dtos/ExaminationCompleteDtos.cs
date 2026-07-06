namespace HIS.API.Dtos.ExaminationComplete;

public class UpdatePhotoRequest
{
    public string PhotoBase64 { get; set; } = string.Empty;
}

public class SaveAsTemplateRequest
{
    public string TemplateName { get; set; } = string.Empty;
}

public class CancelReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class UnlockReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class RevertReasonRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SignatureRequest
{
    public string Signature { get; set; } = string.Empty;
}

public class SendNotificationRequest
{
    public string Channel { get; set; } = string.Empty; // sms, zalo, email
}
