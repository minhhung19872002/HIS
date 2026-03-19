namespace HIS.Core.Entities;

/// <summary>
/// Danh mục ICD-10 - IcdCode
/// </summary>
public class IcdCode : BaseEntity
{
    public string Code { get; set; } = string.Empty; // Mã ICD
    public string Name { get; set; } = string.Empty; // Tên bệnh
    public string? NameEnglish { get; set; } // Tên tiếng Anh
    public string? ChapterCode { get; set; } // Mã chương
    public string? ChapterName { get; set; } // Tên chương
    public string? GroupCode { get; set; } // Mã nhóm
    public string? GroupName { get; set; } // Tên nhóm

    public int IcdType { get; set; } // 1-Bệnh chính, 2-Nguyên nhân ngoài
    public bool IsNotifiable { get; set; } // Bệnh truyền nhiễm phải báo cáo
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục dân tộc - Ethnic
/// </summary>
public class Ethnic : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục quốc gia - Country
/// </summary>
public class Country : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? NationalityName { get; set; } // Tên quốc tịch (e.g. "Việt Nam" → "Việt Nam")
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục nghề nghiệp - Occupation
/// </summary>
public class Occupation : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục giới tính - Gender
/// </summary>
public class Gender : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Đơn vị hành chính 3 cấp - AdministrativeDivision
/// Level: 1=Tỉnh/Thành phố, 2=Quận/Huyện, 3=Xã/Phường
/// </summary>
public class AdministrativeDivision : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Level { get; set; } // 1=Tinh, 2=Huyen, 3=Xa
    public string? ParentCode { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục cơ sở khám chữa bệnh - HealthcareFacility (CSKCB)
/// </summary>
public class HealthcareFacility : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Level { get; set; } // TW, Tinh, Huyen, Xa
    public string? ProvinceCode { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Danh mục tỉnh/thành - Province
/// </summary>
public class Province : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public virtual ICollection<District> Districts { get; set; } = new List<District>();
}

/// <summary>
/// Danh mục quận/huyện - District
/// </summary>
public class District : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public Guid ProvinceId { get; set; }
    public virtual Province Province { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    public virtual ICollection<Ward> Wards { get; set; } = new List<Ward>();
}

/// <summary>
/// Danh mục xã/phường - Ward
/// </summary>
public class Ward : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public Guid DistrictId { get; set; }
    public virtual District District { get; set; } = null!;

    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Nhà cung cấp - Supplier
/// </summary>
public class Supplier : BaseEntity
{
    public string SupplierCode { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string? TaxCode { get; set; } // Mã số thuế
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? ContactPerson { get; set; }
    public string? BankAccount { get; set; }
    public string? BankName { get; set; }
    public int SupplierType { get; set; } // 1-Thuốc, 2-Vật tư, 3-Thiết bị

    public decimal TotalDebt { get; set; } // Công nợ
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Thuật ngữ lâm sàng - ClinicalTerm
/// Bệnh viện tự khai báo (NangCap EMR 1.5)
/// </summary>
public class ClinicalTerm : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? NameEnglish { get; set; }
    public string Category { get; set; } = string.Empty; // Symptom, Sign, Examination, ReviewOfSystems, Procedure, Other
    public string? BodySystem { get; set; } // Cardiovascular, Respiratory, GI, Neuro, MSK, Skin, General, etc.
    public string? Description { get; set; }
    public string? SnomedCtCode { get; set; } // SNOMED CT concept ID
    public string? SnomedCtDisplay { get; set; } // SNOMED CT preferred term
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// ICD-10 to SNOMED CT mapping table (NangCap Level 6 INTOP-02/03)
/// </summary>
public class SnomedIcdMapping : BaseEntity
{
    public string IcdCode { get; set; } = string.Empty;
    public string IcdName { get; set; } = string.Empty;
    public string SnomedCtCode { get; set; } = string.Empty;
    public string SnomedCtDisplay { get; set; } = string.Empty;
    public string? MapGroup { get; set; }
    public int MapPriority { get; set; } = 1;
    public string MapRule { get; set; } = "EQUIVALENT"; // EQUIVALENT, BROADER, NARROWER
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Khóa dịch vụ - LockedService
/// Quản lý khóa/mở khóa dịch vụ (thuốc, vật tư, DVKT)
/// </summary>
public class LockedService : BaseEntity
{
    public Guid ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceCode { get; set; } = string.Empty;
    public int ServiceType { get; set; } // 1=Thuốc, 2=Vật tư, 3=DVKT
    public string ServiceTypeName { get; set; } = string.Empty;
    public bool IsLocked { get; set; } = true;
    public string? LockReason { get; set; }
    public string? LockedBy { get; set; }
    public string? LockedByName { get; set; }
    public DateTime? LockedAt { get; set; }
    public DateTime? UnlockedAt { get; set; }
}

/// <summary>
/// Nhật ký hệ thống - AuditLog (Level 6 security audit trail)
/// Tracks medical record access and modifications per TT 54/2017, TT 32/2023
/// </summary>
public class AuditLog : BaseEntity
{
    public string TableName { get; set; } = string.Empty;  // Legacy: mapped to EntityType
    public Guid RecordId { get; set; }                     // Legacy: mapped to EntityId
    public string Action { get; set; } = string.Empty;     // Read, Create, Update, Delete, Print, Export
    public string? OldValues { get; set; }                 // JSON - previous state
    public string? NewValues { get; set; }                 // JSON - new state
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public Guid? UserId { get; set; }
    public string? Username { get; set; }

    // Level 6 audit fields
    public string? UserFullName { get; set; }              // Full name for display
    public string? EntityType { get; set; }                // Patient, Examination, Prescription, etc.
    public string? EntityId { get; set; }                  // String ID of the entity
    public string? Details { get; set; }                   // JSON with additional context
    public DateTime Timestamp { get; set; }                // Exact time of the action
    public string? Module { get; set; }                    // Reception, OPD, EMR, Pharmacy, Billing, etc.
    public string? RequestPath { get; set; }               // API endpoint path
    public string? RequestMethod { get; set; }             // HTTP method (GET, POST, PUT, DELETE)
    public int? ResponseStatusCode { get; set; }           // HTTP response status code
}

/// <summary>
/// HL7 CDA R2 Document - tai lieu lam sang CDA
/// Stores generated CDA XML documents for health information exchange
/// </summary>
public class CdaDocument : BaseEntity
{
    public string DocumentId { get; set; } = string.Empty; // CDA unique ID (OID-based)
    public int DocumentType { get; set; } // 1=DischargeSummary, 2=LabReport, 3=RadiologyReport, 4=ProgressNote, 5=ConsultationNote, 6=OperativeNote, 7=ReferralNote, 8=PrescriptionDocument
    public Guid PatientId { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public Guid? SourceEntityId { get; set; } // Examination, LabRequest, RadiologyReport, etc.
    public string CdaXml { get; set; } = string.Empty;
    public int Status { get; set; } // 0=Draft, 1=Final, 2=Signed, 3=Sent, 4=Acknowledged
    public bool IsSigned { get; set; }
    public Guid? SignedByUserId { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? ValidationErrors { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? SignedByUser { get; set; }
}

/// <summary>
/// DQGVN Submission - Lien thong du lieu y te quoc gia
/// Tracks all data submissions to the Vietnam National Health Data Exchange portal
/// </summary>
public class DqgvnSubmission : BaseEntity
{
    public int SubmissionType { get; set; } // 1-PatientDemographics, 2-Encounter, 3-Lab, 4-Radiology, 5-Prescription, 6-Discharge, 7-Death, 8-InfectiousDisease, 9-Birth, 10-Vaccination
    public Guid? PatientId { get; set; }
    public Guid? SourceEntityId { get; set; } // ExaminationId, LabRequestId, AdmissionId, etc.
    public string? RequestPayload { get; set; } // JSON sent to DQGVN
    public string? ResponsePayload { get; set; } // JSON received from DQGVN
    public int Status { get; set; } // 0=Pending, 1=Submitted, 2=Accepted, 3=Rejected, 4=Error
    public string? ErrorMessage { get; set; }
    public string? TransactionId { get; set; } // Transaction ID returned by DQGVN
    public int RetryCount { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ResponseAt { get; set; }

    public virtual Patient? Patient { get; set; }
}

/// <summary>
/// Bệnh án chuyên khoa điện tử
/// </summary>
public class SpecialtyEmr : BaseEntity
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string SpecialtyType { get; set; } = string.Empty; // surgical, internal, obstetrics, pediatrics, dental, ent, traditional, traditional_outpatient, hematology, oncology, burns, psychiatry, dermatology, ophthalmology, infectious
    public DateTime RecordDate { get; set; }
    public string? DoctorName { get; set; }
    public string? DepartmentName { get; set; }
    public string? IcdCode { get; set; }
    public string? IcdName { get; set; }
    public string FieldData { get; set; } = "{}"; // JSON data for dynamic fields
    public int Status { get; set; } // 0=Draft, 1=Completed, 2=Signed
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Bieu do chuyen da (Partograph)
/// </summary>
public class PartographRecord : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public DateTime RecordTime { get; set; }
    public decimal? CervicalDilation { get; set; } // cm
    public int? ContractionFrequency { get; set; } // per 10 min
    public int? ContractionDuration { get; set; } // seconds
    public int? FetalHeartRate { get; set; } // bpm
    public string? AmnioticFluid { get; set; } // Trong/Phan su/Mau
    public string? MouldingDegree { get; set; } // 0/+/++/+++
    public string? FetalPosition { get; set; } // LOA/LOP/ROA/ROP
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public int? MaternalPulse { get; set; }
    public decimal? Temperature { get; set; }
    public string? OxytocinDose { get; set; }
    public string? DrugGiven { get; set; }
    public string? AlertLine { get; set; } // Normal/Alert/Action
    public string? Notes { get; set; }
}

/// <summary>
/// Phieu gay me hoi suc (Anesthesia Record)
/// </summary>
public class AnesthesiaRecord : BaseEntity
{
    public Guid SurgeryId { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int AsaClass { get; set; } // 1-5
    public int MallampatiScore { get; set; } // 1-4
    public string? Allergies { get; set; }
    public string? NpoStatus { get; set; } // thoi gian nhin an
    public string AnesthesiaType { get; set; } = string.Empty; // Gay me/Gay te/Te tai cho
    public string? AirwayPlan { get; set; }
    public string? PreOpAssessment { get; set; }
    public string? RecoveryNotes { get; set; }
    public int Status { get; set; } // 0=Draft, 1=InProgress, 2=Completed
}

/// <summary>
/// Theo doi trong gay me (monitoring timeline)
/// </summary>
public class AnesthesiaMonitor : BaseEntity
{
    public Guid AnesthesiaRecordId { get; set; }
    public DateTime MonitorTime { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public int? HeartRate { get; set; }
    public int? SpO2 { get; set; }
    public int? EtCO2 { get; set; }
    public decimal? Temperature { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Thuoc dung trong gay me
/// </summary>
public class AnesthesiaDrug : BaseEntity
{
    public Guid AnesthesiaRecordId { get; set; }
    public DateTime GivenTime { get; set; }
    public string DrugName { get; set; } = string.Empty;
    public string? Dose { get; set; }
    public string? Route { get; set; } // IV/IM/SC/Inhalation
}

/// <summary>
/// Dich truyen trong gay me
/// </summary>
public class AnesthesiaFluid : BaseEntity
{
    public Guid AnesthesiaRecordId { get; set; }
    public string FluidType { get; set; } = string.Empty;
    public int? Volume { get; set; } // mL
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
}

/// <summary>
/// Vỏ bệnh án - EmrCoverType (NangCap11 - TT 32/2023)
/// 31 loại vỏ bệnh án theo Thông tư 32/2023/TT-BYT
/// </summary>
public class EmrCoverType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // NoiTru, NgoaiTru, ChuyenKhoa
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Đính kèm tài liệu bệnh án - EmrDocumentAttachment (NangCap11)
/// Lưu trữ file đính kèm (ảnh, PDF, scan) trong hồ sơ bệnh án
/// </summary>
public class EmrDocumentAttachment : BaseEntity
{
    public Guid MedicalRecordId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty; // image/jpeg, application/pdf, etc.
    public long FileSize { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? DocumentCategory { get; set; } // XN, CDHA, BenhAn, GiayTo, Khac
    public string? Description { get; set; }
    public Guid? UploadedById { get; set; }
    public string? UploadedByName { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Nhật ký in ấn - EmrPrintLog (NangCap11)
/// Theo dõi việc in và đóng dấu tài liệu y tế
/// </summary>
public class EmrPrintLog : BaseEntity
{
    public Guid MedicalRecordId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentTitle { get; set; } = string.Empty;
    public Guid? PrintedById { get; set; }
    public string? PrintedByName { get; set; }
    public DateTime PrintedAt { get; set; } = DateTime.UtcNow;
    public bool IsStamped { get; set; }
    public DateTime? StampedAt { get; set; }
    public string? StampedByName { get; set; }
    public int PrintCount { get; set; } = 1;
}

/// <summary>
/// Danh mục người ký - EmrSignerCatalog (NangCap11)
/// Quản lý danh sách người có quyền ký tài liệu y tế
/// </summary>
public class EmrSignerCatalog : BaseEntity
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; } // BS, BSCKI, BSCKII, ThS, TS, PGS, GS
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? CertificateInfo { get; set; }
    public string? SignatureImagePath { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Vai trò ký - EmrSigningRole (NangCap11)
/// Phân loại vai trò trong quy trình ký (Bác sĩ điều trị, Trưởng khoa, Giám đốc, etc.)
/// </summary>
public class EmrSigningRole : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Nghiệp vụ ký - EmrSigningOperation (NangCap11)
/// Định nghĩa nghiệp vụ ký cho từng loại tài liệu (ai ký, bắt buộc không)
/// </summary>
public class EmrSigningOperation : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? RoleId { get; set; }
    public string? RoleName { get; set; }
    public string? DocumentType { get; set; }
    public bool IsRequired { get; set; } = true;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Nhóm văn bản - EmrDocumentGroup (NangCap11)
/// Phân nhóm các loại văn bản y tế (Hồ sơ BA, Phiếu điều trị, Phiếu chăm sóc, etc.)
/// </summary>
public class EmrDocumentGroup : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; } // BenhAn, DieuTri, ChamSoc, XetNghiem, ChanDoan, Khac
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Loại văn bản - EmrDocumentType (NangCap11)
/// Danh mục các loại văn bản cụ thể (Tờ điều trị, Phiếu CSNB, Biên bản hội chẩn, etc.)
/// </summary>
public class EmrDocumentType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? GroupId { get; set; }
    public string? GroupName { get; set; }
    public string? FormTemplateKey { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Trình ký - Signing Workflow Request (NangCap10 EMR #44)
/// Luồng trình ký tài liệu y tế: phiếu điều trị, chăm sóc, đơn thuốc, v.v.
/// </summary>
public class SigningRequest : BaseEntity
{
    public string DocumentType { get; set; } = string.Empty; // TreatmentSheet, NursingCare, Prescription, etc.
    public Guid DocumentId { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string DocumentContent { get; set; } = string.Empty; // HTML content or summary
    public Guid SubmittedById { get; set; }
    public string SubmittedByName { get; set; } = string.Empty;
    public Guid AssignedToId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    public int Status { get; set; } // 0=Pending, 1=Approved, 2=Rejected, 3=Cancelled
    public string? RejectReason { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? SignatureData { get; set; } // signature certificate info
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DepartmentName { get; set; }
}

/// <summary>
/// WebAuthn/FIDO2 Credential - Xac thuc sinh trac hoc (NangCap12)
/// </summary>
public class WebAuthnCredential : BaseEntity
{
    public Guid UserId { get; set; }
    public string CredentialId { get; set; } = string.Empty; // Base64url-encoded credential ID
    public string PublicKey { get; set; } = string.Empty; // Base64url-encoded public key
    public string DeviceName { get; set; } = string.Empty; // e.g. "Windows Hello", "Touch ID"
    public string CredentialType { get; set; } = "public-key";
    public long SignCount { get; set; }
    public string? AaGuid { get; set; } // Authenticator Attestation GUID
    public bool IsActive { get; set; } = true;
    public DateTime LastUsedAt { get; set; }
    public virtual User? User { get; set; }
}

/// <summary>
/// Endpoint Device - Thiet bi dau cuoi (NangCap12 ATTT)
/// </summary>
public class EndpointDevice : BaseEntity
{
    public string Hostname { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? OperatingSystem { get; set; }
    public string? OsVersion { get; set; }
    public string? AntivirusName { get; set; }
    public string? AntivirusStatus { get; set; } // Active, Outdated, Disabled, NotInstalled
    public DateTime? AntivirusLastUpdate { get; set; }
    public string? DepartmentName { get; set; }
    public string? AssignedUser { get; set; }
    public int Status { get; set; } // 0=Offline, 1=Online, 2=Warning, 3=Critical
    public DateTime? LastSeenAt { get; set; }
    public string? AgentVersion { get; set; }
    public bool IsCompliant { get; set; } = true;
    public string? ComplianceNotes { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Security Incident - Su co an toan thong tin (NangCap12 ATTT)
/// </summary>
public class SecurityIncident : BaseEntity
{
    public string IncidentCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Severity { get; set; } // 1=Critical, 2=High, 3=Medium, 4=Low
    public int Status { get; set; } // 0=Open, 1=Investigating, 2=Contained, 3=Resolved, 4=Closed
    public string? Category { get; set; } // Malware, Phishing, Unauthorized, DataBreach, DDoS, Other
    public Guid? DeviceId { get; set; }
    public string? DeviceHostname { get; set; }
    public string? AffectedSystem { get; set; }
    public string? ReportedByName { get; set; }
    public Guid? AssignedToId { get; set; }
    public string? AssignedToName { get; set; }
    public string? Resolution { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ContainedAt { get; set; }
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
}

/// <summary>
/// Installed Software - Phan mem cai dat tren thiet bi (NangCap12 ATTT)
/// </summary>
public class InstalledSoftware : BaseEntity
{
    public Guid DeviceId { get; set; }
    public string SoftwareName { get; set; } = string.Empty;
    public string? Version { get; set; }
    public string? Publisher { get; set; }
    public DateTime? InstallDate { get; set; }
    public bool IsAuthorized { get; set; } = true;
    public string? Category { get; set; } // System, Security, Office, Medical, Browser, Other
    public string? Notes { get; set; }
}
