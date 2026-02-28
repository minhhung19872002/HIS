namespace HIS.Application.DTOs;

// ============ Session Management ============

/// <summary>Request to open a PKCS#11 signing session with USB Token PIN</summary>
public class OpenSessionRequest
{
    /// <summary>USB Token PIN entered by the doctor in the browser</summary>
    public string Pin { get; set; } = string.Empty;
}

/// <summary>Response after opening a PKCS#11 session</summary>
public class OpenSessionResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? TokenSerial { get; set; }
    public string? CaProvider { get; set; }
    public string? CertificateSubject { get; set; }
    public DateTime? SessionExpiresAt { get; set; }
}

/// <summary>Current session status for authenticated user</summary>
public class SessionStatusResponse
{
    public bool Active { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? TokenSerial { get; set; }
    public string? CaProvider { get; set; }
    public string? CertificateSubject { get; set; }

    /// <summary>Non-null if certificate expires within 30 days</summary>
    public int? ExpiryWarningDays { get; set; }
}

// ============ Single Document Signing ============

/// <summary>Request to sign a single document</summary>
public class SignDocumentRequest
{
    public Guid DocumentId { get; set; }

    /// <summary>"EMR", "Prescription", "LabResult", "Discharge", "Referral", "Radiology"</summary>
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>Optional PIN - uses cached session if null</summary>
    public string? Pin { get; set; }

    /// <summary>Signing reason (displayed in PDF signature)</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>Signing location (hospital name)</summary>
    public string Location { get; set; } = string.Empty;
}

/// <summary>Response after signing a document</summary>
public class SignDocumentResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? SignerName { get; set; }
    public string? SignedAt { get; set; }
    public string? CertificateSerial { get; set; }
    public string? CaProvider { get; set; }
    public string? TsaTimestamp { get; set; }
    public string? OcspStatus { get; set; }
    public string? SignedDocumentUrl { get; set; }
}

// ============ Batch Signing ============

/// <summary>Request to sign multiple documents in one batch (max 50)</summary>
public class BatchSignRequest
{
    public List<Guid> DocumentIds { get; set; } = new();

    /// <summary>"EMR", "Prescription", "LabResult", "Discharge", "Referral", "Radiology"</summary>
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>Optional PIN - uses cached session if null</summary>
    public string? Pin { get; set; }

    /// <summary>Signing reason (displayed in PDF signature)</summary>
    public string Reason { get; set; } = string.Empty;
}

/// <summary>Response after batch signing</summary>
public class BatchSignResponse
{
    public int Total { get; set; }
    public int Succeeded { get; set; }
    public int Failed { get; set; }
    public List<BatchSignItemResult> Results { get; set; } = new();
}

/// <summary>Result for a single document in a batch signing operation</summary>
public class BatchSignItemResult
{
    public Guid DocumentId { get; set; }
    public bool Success { get; set; }
    public string? Error { get; set; }
}

// ============ Token Management ============

/// <summary>Token info returned from token discovery</summary>
public class TokenInfoDto
{
    public string TokenSerial { get; set; } = string.Empty;
    public string TokenLabel { get; set; } = string.Empty;
    public string CaProvider { get; set; } = string.Empty;
    public string? MappedUserName { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>Request to register (map) a token to the authenticated user</summary>
public class RegisterTokenRequest
{
    public string TokenSerial { get; set; } = string.Empty;
}

// ============ Signature Info ============

/// <summary>DTO for displaying signature info in the UI</summary>
public class DocumentSignatureDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentCode { get; set; } = string.Empty;
    public string SignerName { get; set; } = string.Empty;
    public string SignedAt { get; set; } = string.Empty;
    public string CertificateSerial { get; set; } = string.Empty;
    public string CaProvider { get; set; } = string.Empty;
    public string? TsaTimestamp { get; set; }
    public string? OcspStatus { get; set; }
    public int Status { get; set; }
}
