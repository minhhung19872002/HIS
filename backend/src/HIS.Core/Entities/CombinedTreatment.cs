namespace HIS.Core.Entities;

/// <summary>
/// Dieu tri ket hop (mig 213): mot khoa khac cung tham gia dieu tri mot luot noi tru.
/// Status: 0 = cho tiep nhan, 1 = dang dieu tri, 2 = hoan thanh, 3 = da huy.
/// </summary>
public class CombinedTreatment : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public Guid ConsultingDepartmentId { get; set; }
    public DateTime RequestDate { get; set; }
    public string? RequestReason { get; set; }
    public string? ConsultingDiagnosis { get; set; }
    public Guid? ConsultingDoctorId { get; set; }
    public int Status { get; set; }
    public string? TreatmentResult { get; set; }
    public DateTime? CompletedDate { get; set; }
}
