namespace HIS.Core.Entities;

/// <summary>
/// Di ung - Allergy
/// </summary>
public class Allergy : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public int AllergyType { get; set; } // 1-Thuoc, 2-Thuc an, 3-Khac
    public string AllergenName { get; set; } = string.Empty; // Ten chat gay di ung
    public string? AllergenCode { get; set; } // Ma chat gay di ung
    public string? Reaction { get; set; } // Phan ung
    public int Severity { get; set; } // 1-Nhe, 2-Trung binh, 3-Nang
    public DateTime? OnsetDate { get; set; } // Ngay phat hien
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? RecordedByUserId { get; set; }
    public virtual User? RecordedBy { get; set; }
}

/// <summary>
/// Chong chi dinh - Contraindication
/// </summary>
public class Contraindication : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public int ContraindicationType { get; set; } // 1-Thuoc, 2-Thu thuat, 3-Khac
    public string ItemName { get; set; } = string.Empty; // Ten thuoc/thu thuat
    public string? ItemCode { get; set; } // Ma thuoc/thu thuat
    public string? Reason { get; set; } // Ly do chong chi dinh
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? RecordedByUserId { get; set; }
    public virtual User? RecordedBy { get; set; }
}

/// <summary>
/// Mau kham - Examination Template
/// </summary>
public class ExaminationTemplate : BaseEntity
{
    public string TemplateName { get; set; } = string.Empty;
    public string? TemplateCode { get; set; }
    public int TemplateType { get; set; } // 1-Kham tong quat, 2-Chuyen khoa...
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    // Noi dung mau
    public string? ChiefComplaintTemplate { get; set; }
    public string? PresentIllnessTemplate { get; set; }
    public string? PhysicalExamTemplate { get; set; }
    public string? SystemsReviewTemplate { get; set; }
    public string? ConclusionTemplate { get; set; }

    public bool IsPublic { get; set; } // Mau chung hay ca nhan
    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

/// <summary>
/// Phieu dieu tri - Treatment Sheet
/// </summary>
public class TreatmentSheet : BaseEntity
{
    public Guid ExaminationId { get; set; }
    public virtual Examination Examination { get; set; } = null!;

    public DateTime TreatmentDate { get; set; }
    public int Day { get; set; } // Ngay dieu tri thu may
    public string? DoctorOrders { get; set; } // Y lenh
    public string? DietOrders { get; set; } // Che do an
    public string? NursingCare { get; set; } // Cham soc dieu duong
    public string? PatientCondition { get; set; } // Tinh trang benh nhan
    public string? Notes { get; set; }

    public Guid? DoctorId { get; set; }
    public virtual User? Doctor { get; set; }
    public Guid? NurseId { get; set; }
    public virtual User? Nurse { get; set; }
}

/// <summary>
/// Bien ban hoi chan - Consultation Record
/// </summary>
public class ConsultationRecord : BaseEntity
{
    public Guid ExaminationId { get; set; }
    public virtual Examination Examination { get; set; } = null!;

    public DateTime ConsultationDate { get; set; }
    public int ConsultationType { get; set; } // 1-Hoi chan khoa, 2-Hoi chan lien khoa, 3-Hoi chan benh vien
    public string? Reason { get; set; } // Ly do hoi chan
    public string? Summary { get; set; } // Bao cao tom tat
    public string? Conclusion { get; set; } // Ket luan hoi chan
    public string? TreatmentPlan { get; set; } // Ke hoach dieu tri

    public Guid? PresidedByUserId { get; set; } // Chu tri
    public virtual User? PresidedBy { get; set; }
    public Guid? SecretaryUserId { get; set; } // Thu ky
    public virtual User? Secretary { get; set; }

    public string? Participants { get; set; } // Danh sach tham du (JSON)
}

/// <summary>
/// Phieu cham soc dieu duong - Nursing Care Sheet
/// </summary>
public class NursingCareSheet : BaseEntity
{
    public Guid ExaminationId { get; set; }
    public virtual Examination Examination { get; set; } = null!;

    public DateTime CareDate { get; set; }
    public TimeSpan? CareTime { get; set; }

    // Vital signs
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? SpO2 { get; set; }

    // Care details
    public string? NursingDiagnosis { get; set; } // Chan doan dieu duong
    public string? NursingInterventions { get; set; } // Can thiep dieu duong
    public string? Evaluation { get; set; } // Danh gia
    public string? PatientResponse { get; set; } // Phan hoi benh nhan
    public string? Notes { get; set; }

    // Phân cấp chăm sóc: 1 = Cấp 1 (BN nặng, theo dõi liên tục), 2 = Cấp 2 (BN vừa, theo dõi định kỳ)
    public int? CareLevel { get; set; }

    public Guid? NurseId { get; set; }
    public virtual User? Nurse { get; set; }
}

/// <summary>
/// The bao hiem bi khoa - Blocked Insurance
/// </summary>
public class BlockedInsurance : BaseEntity
{
    public string InsuranceNumber { get; set; } = string.Empty;
    public int BlockReason { get; set; } // 1-Qua han, 2-Trai tuyen, 3-Da SD o BV khac, 4-Khac
    public string? ReasonDetail { get; set; }
    public DateTime BlockedAt { get; set; }
    public Guid BlockedByUserId { get; set; }
    public virtual User BlockedBy { get; set; } = null!;

    public DateTime? UnblockedAt { get; set; }
    public Guid? UnblockedByUserId { get; set; }
    public virtual User? UnblockedBy { get; set; }
    public string? UnblockReason { get; set; }

    public bool IsBlocked { get; set; } = true;
    public string? Notes { get; set; }
}

/// <summary>
/// Anh benh nhan - Patient Photo
/// </summary>
public class PatientPhoto : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public int PhotoType { get; set; } // 1-Chan dung, 2-CCCD, 3-The BHYT, 4-Khac
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string? MimeType { get; set; }
    public long? FileSize { get; set; }
    public DateTime CapturedAt { get; set; }
    public Guid? CapturedByUserId { get; set; }
    public virtual User? CapturedBy { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Doi tuong thanh toan khac - Other Payer
/// </summary>
public class OtherPayer : BaseEntity
{
    public string PayerCode { get; set; } = string.Empty;
    public string PayerName { get; set; } = string.Empty;
    public int PayerType { get; set; } // 1-Cong ty, 2-To chuc, 3-Ca nhan
    public string? TaxCode { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? ContactPerson { get; set; }
    public string? BankAccount { get; set; }
    public string? BankName { get; set; }
    public decimal? CreditLimit { get; set; }
    public decimal? CurrentDebt { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Tam ung - Deposit
/// </summary>
public class Deposit : BaseEntity
{
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }

    public Guid? PatientId { get; set; }
    public virtual Patient? Patient { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    public decimal Amount { get; set; }
    public int PaymentMethod { get; set; } // 1-Tien mat, 2-Chuyen khoan, 3-The, 4-QR
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }

    public Guid ReceivedByUserId { get; set; }
    public virtual User ReceivedBy { get; set; } = null!;

    // #218/T3 (2026-09-04): chú thích cũ ghi "1-Active, 2-Used, 3-Refunded" — SAI cả ba giá trị và
    // bỏ sót giá trị 5. Mã đang chạy: `BillingCompleteService.Payments` ghi 3 = "Đã sử dụng hết" và
    // 5 = "Đã hủy". Đối chiếu dữ liệu thật: 117 phiếu ở trạng thái 2 mà tổng SỐ DƯ CÒN LẠI là
    // 32.185.000đ — nếu 2 nghĩa là "Used" thì số dư đã phải bằng 0.
    // Ai đọc "2-Used" rồi viết một câu gác coi 2 là "đã dùng xong" sẽ chặn nhầm toàn bộ phiếu tạm
    // ứng đang còn tiền. Từ vựng đúng ở HIS.Core.Constants.DepositStatus — dùng nó, đừng đọc số ở đây.
    public int Status { get; set; } // xem DepositStatus: 2-Đã xác nhận, 3-Đã dùng hết, 5-Đã hủy (1 không có đường ghi nào)
    public decimal UsedAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    // #188: optimistic concurrency token — chống double-use số dư tạm ứng khi 2 thao tác trừ đồng thời.
    public byte[]? RowVersion { get; set; }

    // ── Nộp tiền tạm ứng thu tại khoa về quỹ bệnh viện ──────────────────────────────────────
    // #218/T3 (migration 182): trước đây `CreateDepartmentDepositAsync` đọc thật, cộng tổng tiền
    // thật, rồi KHÔNG ghi gì — điều dưỡng nộp tiền, phần mềm in mã biên lai, không dòng nào ghi lại
    // rằng số tiền ấy đã nộp. Nộp lại đúng những phiếu ấy lần nữa vẫn được.
    //
    // Cố ý KHÔNG mượn `Status` ở trên làm dấu đã-nộp: cột đó đang có lệch nghĩa ĐÃ BIẾT mà chưa sửa
    // (xem chú thích ngay trên nó). Thêm nghĩa thứ ba vào là lặp lại đúng hình dạng đã làm hỏng số
    // liệu tử vong ở migration 178.
    public Guid? HandoverBatchId { get; set; }
    public DateTime? HandoverAt { get; set; }
}

/// <summary>
/// Một đợt nộp tiền tạm ứng thu tại khoa về quỹ bệnh viện.
/// #218/T3 (migration 182): trước đây cả hai đầu của việc bàn giao tiền này đều là vỏ rỗng —
/// `CreateDepartmentDepositAsync` không ghi, và `ReceiveDepartmentDepositAsync` có chú thích thẳng
/// thắn `// No DepartmentDeposit table - return stub confirming receipt` rồi trả "đã tiếp nhận" kèm
/// `TotalAmount = 0`.
/// </summary>
public class DepartmentDepositBatch : BaseEntity
{
    public string ReceiptCode { get; set; } = string.Empty;

    public Guid DepartmentId { get; set; }
    public Guid? SubmittedById { get; set; }
    public DateTime SubmittedAt { get; set; }

    public int DepositCount { get; set; }
    public decimal TotalAmount { get; set; }

    public Guid? ReceivedById { get; set; }
    public DateTime? ReceivedAt { get; set; }

    public string? Note { get; set; }
}

// Entity `Payment` (bang dbo.Payments) da bo: day la so phieu thu RIENG cua Tiep don, khong
// writer nao khac dung va khong man hinh nao doc -> tien thu o tiep don khong len so quy va
// doanh thu. Tiep don nay ghi thang vao `Receipt` — so phieu thu duy nhat cua benh vien.
// Du lieu cu da chuyen bang script Data/Scripts/159_merge_reception_payments_into_receipts.sql;
// BANG dbo.Payments VAN GIU trong DB de doi chieu, chi bo mapping phia code.

/// <summary>
/// Mau gom dich vu - Service Group Template
/// </summary>
public class ServiceGroupTemplate : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public int ServiceType { get; set; } // 1-XN, 2-CDHA, 3-TDCN, 4-Mixed
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }
    public string? Description { get; set; }
    public bool IsPublic { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    public virtual ICollection<ServiceGroupTemplateItem> Items { get; set; } = new List<ServiceGroupTemplateItem>();
}

/// <summary>
/// Chi tiet mau gom dich vu - Service Group Template Item
/// </summary>
public class ServiceGroupTemplateItem : BaseEntity
{
    public Guid ServiceGroupTemplateId { get; set; }
    public virtual ServiceGroupTemplate ServiceGroupTemplate { get; set; } = null!;

    public Guid ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    public int Quantity { get; set; } = 1;
    public Guid? DefaultRoomId { get; set; }
    public virtual Room? DefaultRoom { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>
/// Mau don thuoc - Prescription Template
/// </summary>
public class PrescriptionTemplate : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public int PrescriptionType { get; set; } // 1-Ngoai tru, 2-Noi tru, 3-YHCT
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? Description { get; set; }
    public bool IsPublic { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    public virtual ICollection<PrescriptionTemplateItem> Items { get; set; } = new List<PrescriptionTemplateItem>();
}

/// <summary>
/// Chi tiet mau don thuoc - Prescription Template Item
/// </summary>
public class PrescriptionTemplateItem : BaseEntity
{
    public Guid PrescriptionTemplateId { get; set; }
    public virtual PrescriptionTemplate PrescriptionTemplate { get; set; } = null!;

    public Guid MedicineId { get; set; }
    public virtual Medicine Medicine { get; set; } = null!;

    public decimal Quantity { get; set; }
    public int Days { get; set; }
    public string? Dosage { get; set; }
    public string? Frequency { get; set; }
    public string? Route { get; set; }
    public string? UsageInstructions { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>
/// Thu vien huong dan su dung - Instruction Library
/// </summary>
public class InstructionLibrary : BaseEntity
{
    public string Code { get; set; } = string.Empty; // Ma huong dan
    public string Category { get; set; } = string.Empty; // Category
    public string Title { get; set; } = string.Empty;
    public string Instruction { get; set; } = string.Empty; // Noi dung huong dan
    public string? Description { get; set; } // Mo ta chi tiet
    public string Content { get; set; } = string.Empty;
    public string? ShortCode { get; set; } // Ma ngan de goi nhanh
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
}

/// <summary>
/// Tuong tac thuoc - Drug Interaction
/// </summary>
public class DrugInteraction : BaseEntity
{
    public Guid Medicine1Id { get; set; }
    public virtual Medicine Medicine1 { get; set; } = null!;

    public Guid Medicine2Id { get; set; }
    public virtual Medicine Medicine2 { get; set; } = null!;

    public int Severity { get; set; } // 1-Nhe, 2-Trung binh, 3-Nang, 4-Chong chi dinh tuyet doi
    public string? InteractionType { get; set; }
    public string? Description { get; set; }
    public string? Recommendation { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Mau tuong trinh phau thuat — SurgeryNarrativeTemplate (MQSoft muc 4)
/// BS tao template tuong trinh cho cac loai phau thuat thuong gap, tai su dung khi viet tuong trinh moi.
/// </summary>
public class SurgeryNarrativeTemplate : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public Guid? SurgeryServiceId { get; set; }
    public virtual Service? SurgeryService { get; set; }
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }
    public string? PreOpDiagnosis { get; set; }
    public string? PostOpDiagnosis { get; set; }
    public string? SurgeryMethod { get; set; }
    public string? AnesthesiaMethod { get; set; }
    public string? NarrativeBody { get; set; }
    public string? Complications { get; set; }
    public string? PostOpOrders { get; set; }
    public bool IsPublic { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

/// <summary>
/// Mau HSBA ngoai tru — OutpatientRecordTemplate (MQSoft muc 3)
/// BS tao template benh an mau cho cac benh thuong gap (ICD), fill nhanh khi kham.
/// </summary>
public class OutpatientRecordTemplate : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? MedicalHistory { get; set; }
    public string? PhysicalExamination { get; set; }
    public string? GeneralExamBody { get; set; }
    public string? CardiovascularExam { get; set; }
    public string? RespiratoryExam { get; set; }
    public string? GiExam { get; set; }
    public string? NeuroExam { get; set; }
    public string? Conclusion { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? FollowUpNotes { get; set; }
    public bool IsPublic { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public virtual User? CreatedByUser { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

/// <summary>
/// Lich truc BS / booking doctor schedule — DutySchedule (K5)
/// </summary>
public class DutySchedule : BaseEntity
{
    public Guid DoctorId { get; set; }
    public virtual User? Doctor { get; set; }
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }
    public DateTime Date { get; set; }
    public int ShiftType { get; set; } // 1-Sang, 2-Chieu, 3-Toi, 4-24h
    public Guid? RoomId { get; set; }
    public virtual Room? Room { get; set; }
    public string? Notes { get; set; }
}

// Note: HealthCheckContract, HealthCheckPackage already defined elsewhere

/// <summary>
/// Nhat ky hoat dong kham benh - Examination Activity Log
/// </summary>
public class ExaminationActivityLog : BaseEntity
{
    public Guid ExaminationId { get; set; }
    public virtual Examination Examination { get; set; } = null!;

    public string ActionType { get; set; } = string.Empty; // START, UPDATE, ORDER, PRESCRIPTION, COMPLETE, etc.
    public string ActivityType { get; set; } = string.Empty;
    public string ActionDescription { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }

    public Guid? UserId { get; set; }
    public virtual User? User { get; set; }
    public DateTime ActionTime { get; set; }
    public DateTime ActivityTime { get; set; }
    public string? IpAddress { get; set; }
}

/// <summary>
/// Thong tin chan thuong - Injury Info
/// </summary>
public class InjuryInfo : BaseEntity
{
    public Guid ExaminationId { get; set; }
    public virtual Examination Examination { get; set; } = null!;

    public DateTime? InjuryDate { get; set; }
    public TimeSpan? InjuryTime { get; set; }
    public string? InjuryLocation { get; set; } // Noi xay ra
    public string? InjuryCause { get; set; } // Nguyen nhan
    public int InjuryType { get; set; } // 1-TNGT, 2-TNLD, 3-TNSH, 4-Khac
    public string? InjuryDescription { get; set; }
    public string? FirstAid { get; set; } // So cuu ban dau
    public bool IsReportedToPolice { get; set; }
    public string? PoliceReportNumber { get; set; }
    public string? Notes { get; set; }

    // F1.6 — Truong phap ly TNGT (Bieu 14.5 SYT)
    public bool? HelmetWorn { get; set; }         // Deo mu bao hiem: null=chua ro, true=co, false=khong
    public string? AlcoholLevel { get; set; }     // Nong do con: "0", "<0.25", "0.25-<0.4", ">=0.4" (mg/L khi tho)
    public string? VehicleTypeSelf { get; set; }  // Phuong tien nguoi nan nhan dang dieu khien
    public string? VehicleTypeCauser { get; set; }// Phuong tien gay tai nan
    public string? VehicleTypeVictim { get; set; }// Phuong tien bi tai nan (khac)
}

/// <summary>
/// Cau hinh camera - Camera Configuration
/// </summary>
public class CameraConfiguration : BaseEntity
{
    public string WorkstationId { get; set; } = string.Empty;
    public string? DeviceId { get; set; }
    public string? DeviceName { get; set; }
    public int Resolution { get; set; } = 2; // 1-Low, 2-Medium, 3-High
    public int PhotoCountLimit { get; set; } = 5;
    public bool AutoCapture { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Cau hinh hien thi phong cho - Waiting Room Display Configuration
/// </summary>
public class WaitingRoomDisplayConfig : BaseEntity
{
    public Guid RoomId { get; set; }
    public virtual Room Room { get; set; } = null!;

    public string? DisplayTitle { get; set; }
    public int DisplayRows { get; set; } = 10;
    public int RefreshIntervalSeconds { get; set; } = 5;
    public bool ShowPatientName { get; set; } = true;
    public bool ShowPatientCode { get; set; } = true;
    public bool ShowQueueNumber { get; set; } = true;
    public bool ShowWaitingTime { get; set; } = true;
    public string? CustomMessage { get; set; }
    public string? AnnouncementVoice { get; set; }
    public bool EnableVoiceCall { get; set; } = true;
    public int CallIntervalSeconds { get; set; } = 30;
    public bool IsActive { get; set; } = true;
}
