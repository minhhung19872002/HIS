namespace HIS.Core.Entities;

/// <summary>
/// Cross-module signature tracking entity.
/// Records every digital signature across all document types (EMR, Prescription, Lab, Discharge, Referral, Radiology).
/// </summary>
public class DocumentSignature : BaseEntity
{
    /// <summary>ID of the document being signed (EMR form, prescription, lab result, etc.)</summary>
    public Guid DocumentId { get; set; }

    /// <summary>Document type: "EMR", "Prescription", "LabResult", "Discharge", "Referral", "Radiology"</summary>
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>Human-readable document code</summary>
    public string DocumentCode { get; set; } = string.Empty;

    // Signer info
    public Guid SignedByUserId { get; set; }
    public virtual User? SignedByUser { get; set; }
    public DateTime SignedAt { get; set; }

    // Certificate info
    public string CertificateSubject { get; set; } = string.Empty;
    public string CertificateIssuer { get; set; } = string.Empty;
    public string CertificateSerial { get; set; } = string.Empty;
    public DateTime CertificateValidFrom { get; set; }
    public DateTime CertificateValidTo { get; set; }

    /// <summary>CA provider: "VNPT-CA", "Viettel-CA", "BKAV-CA", "FPT-CA"</summary>
    public string CaProvider { get; set; } = string.Empty;

    /// <summary>Physical token serial number</summary>
    public string TokenSerial { get; set; } = string.Empty;

    // TSA (Timestamp Authority)
    /// <summary>ISO 8601 timestamp from TSA server</summary>
    public string? TsaTimestamp { get; set; }
    public string? TsaUrl { get; set; }

    // OCSP (Online Certificate Status Protocol)
    /// <summary>OCSP status: "Good", "Revoked", "Unknown"</summary>
    public string? OcspStatus { get; set; }
    public DateTime? OcspCheckedAt { get; set; }

    // Signature data
    /// <summary>Base64-encoded CMS/PKCS#7 signature value</summary>
    public string SignatureValue { get; set; } = string.Empty;

    /// <summary>Path to the signed PDF file on disk</summary>
    public string? SignedDocumentPath { get; set; }

    public string HashAlgorithm { get; set; } = "SHA-256";

    // Revocation
    /// <summary>0 = Active, 1 = Revoked</summary>
    public int Status { get; set; }
    public string? RevokeReason { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid? RevokedByUserId { get; set; }
}

/// <summary>
/// Maps physical USB Token serial numbers to user accounts.
/// Enables auto-recognition of tokens on subsequent uses.
/// </summary>
public class TokenUserMapping : BaseEntity
{
    /// <summary>Token serial number from PKCS#11 token info</summary>
    public string TokenSerial { get; set; } = string.Empty;

    /// <summary>Token label from PKCS#11</summary>
    public string TokenLabel { get; set; } = string.Empty;

    /// <summary>Detected CA provider: "VNPT-CA", "Viettel-CA", "BKAV-CA", "FPT-CA"</summary>
    public string CaProvider { get; set; } = string.Empty;

    public Guid UserId { get; set; }
    public virtual User? User { get; set; }

    public DateTime FirstRegisteredAt { get; set; }
    public DateTime LastUsedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
