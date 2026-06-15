namespace HIS.Core.Entities;

/// <summary>
/// Hoi chan noi tru - Inpatient Consultation (bien ban hoi chan).
/// Tach rieng khoi ConsultationRecord (OPD, keyed ExaminationId) vi model noi tru giau hon:
/// keyed theo AdmissionId, thanh vien co cau truc + y kien rieng, vong doi Status 0->1->2.
/// </summary>
public class InpatientConsultation : BaseEntity
{
    public Guid AdmissionId { get; set; }

    public int ConsultationType { get; set; } // 1-Hoi chan khoa, 2-Hoi chan BV, 3-Hoi chan thuoc dau *, 4-Hoi chan PTTT
    public DateTime ConsultationDate { get; set; }
    public TimeSpan? ConsultationTime { get; set; }
    public string? Location { get; set; }

    public Guid ChairmanId { get; set; }  // Chu tri
    public Guid SecretaryId { get; set; } // Thu ky

    public string? Reason { get; set; }            // Ly do hoi chan
    public string? ClinicalFindings { get; set; }  // Tom tat lam sang
    public string? LabResults { get; set; }        // Ket qua xet nghiem
    public string? ImageResults { get; set; }      // Ket qua CDHA

    public string? Conclusion { get; set; }        // Ket luan hoi chan
    public string? Treatment { get; set; }         // Huong dieu tri

    public int Status { get; set; } // 0-Cho hoi chan, 1-Dang hoi chan, 2-Hoan thanh

    // F1.4: duyet thuoc dau * (ConsultationType=3) trinh lanh dao
    // ApprovalStatus: 0-Chua yeu cau, 1-Cho duyet, 2-Da duyet, 3-Tu choi
    public int ApprovalStatus { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovalNote { get; set; }

    public virtual ICollection<InpatientConsultationMember> Members { get; set; } = new List<InpatientConsultationMember>();
}

/// <summary>
/// Thanh vien hoi chan noi tru - tung bac si tham gia + y kien.
/// </summary>
public class InpatientConsultationMember : BaseEntity
{
    public Guid ConsultationId { get; set; }
    public virtual InpatientConsultation Consultation { get; set; } = null!;

    public Guid DoctorId { get; set; }
    public string? Opinion { get; set; } // Y kien thanh vien
}
