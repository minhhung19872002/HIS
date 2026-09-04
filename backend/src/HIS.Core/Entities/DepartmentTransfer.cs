namespace HIS.Core.Entities;

/// <summary>
/// Lich su CHUYEN KHOA cua mot luot noi tru.
///
/// Truoc 2026-09-04, `DepartmentTransferDto` mang bon truong ban giao lam sang
/// (TransferReason, DiagnosisOnTransfer, TreatmentSummary, ReceivingDoctorId) nhung
/// `TransferDepartmentAsync` KHONG doc truong nao, va khong co bang nao chua chung.
/// Bac si viet tom tat dieu tri luc ban giao xong no bay mat, ma API van tra 200 kem
/// mot AdmissionDto hop le. Do duoc o evidence/cross/t3/t3_transfer_department.json:
/// do 22 cot chu cua Admissions + MedicalRecords, khong cot nao giu lai chuoi ban giao.
///
/// Bang nay giu lai ban giao do, dong thoi cho biet mot luot noi tru da di qua nhung khoa nao.
/// </summary>
public class DepartmentTransfer : BaseEntity
{
    public Guid AdmissionId { get; set; }

    public Guid FromDepartmentId { get; set; }
    public Guid? FromRoomId { get; set; }
    public Guid? FromBedId { get; set; }

    public Guid ToDepartmentId { get; set; }
    public Guid? ToRoomId { get; set; }
    public Guid? ToBedId { get; set; }

    public DateTime TransferredAt { get; set; }

    /// <summary>Bac si tiep nhan o khoa den.</summary>
    public Guid? ReceivingDoctorId { get; set; }

    public string? TransferReason { get; set; }
    public string? DiagnosisOnTransfer { get; set; }

    /// <summary>Tom tat qua trinh dieu tri tai khoa cu — phan ban giao quan trong nhat.</summary>
    public string? TreatmentSummary { get; set; }
}
