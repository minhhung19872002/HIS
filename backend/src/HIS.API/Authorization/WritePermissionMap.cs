using HIS.Core.Constants;

namespace HIS.API.Authorization;

/// <summary>
/// AUTHZ #216/F2 — bảng KHAI BÁO gán permission cho đường GHI (POST/PUT/PATCH/DELETE).
///
/// Bối cảnh: T1 (#216) đo được 875/1467 action ghi chỉ còn <c>[Authorize]</c> trần, nghĩa là
/// "đăng nhập bất kỳ vai trò nào cũng gọi được" — KTV xét nghiệm gọi được API ghi bệnh án nếu
/// biết route. Gắn tay <c>[RequirePermission]</c> lên 875 chỗ ở 120 file cho ra một diff không
/// review nổi và rất dễ sót, nên thay vào đó quyền được khai báo TẬP TRUNG ở đây rồi
/// <see cref="WritePermissionConvention"/> gắn policy <c>perm:{code}</c> lúc dựng ApplicationModel.
/// Cơ chế thực thi vẫn là <see cref="PermissionPolicyProvider"/> + <see cref="PermissionAuthorizationHandler"/>
/// y như <see cref="RequirePermissionAttribute"/> — không thêm đường kiểm tra quyền thứ hai.
///
/// Quy tắc đọc bảng:
/// - Khóa = tên controller ĐÃ BỎ hậu tố "Controller" (đúng thứ ASP.NET đặt vào ControllerName).
/// - <c>Write</c> = quyền mặc định cho mọi action ghi của controller đó.
/// - <c>Read</c> = quyền dùng cho các action ghi thực chất chỉ ĐỌC (POST search/check/estimate…),
///   nhận diện theo tiền tố ở <see cref="ReadIshPrefixes"/>. Bỏ trống = không áp dụng luật này.
/// - <c>Overrides</c> = quyền riêng cho action cụ thể, ưu tiên cao nhất (thường là bản Approve).
///
/// Ranh giới CỐ Ý KHÔNG gate (xem <see cref="ExemptControllers"/> / <see cref="ExemptActions"/>):
/// action tự phục vụ của chính người dùng (đăng nhập, đổi mật khẩu, 2FA, WebAuthn, đánh dấu đã đọc
/// thông báo, tùy chọn cá nhân) và break-glass. Gate những cái đó bằng permission sẽ tự khóa
/// người dùng ra ngoài đúng lúc họ cần vào.
/// </summary>
public static class WritePermissionMap
{
    public sealed record Rule(string Write, string? Read = null, IReadOnlyDictionary<string, string>? Overrides = null);

    /// <summary>Tiền tố cho action POST mà bản chất là ĐỌC (tra cứu/kiểm tra/ước tính) — gate bằng quyền Read
    /// của chính resource đó thay vì quyền ghi, để không khóa nhầm người chỉ đang tra cứu.</summary>
    public static readonly string[] ReadIshPrefixes =
        { "Search", "Check", "Estimate", "Calculate", "Preview", "Query", "Lookup", "Suggest" };

    /// <summary>Controller tự phục vụ / cơ chế xác thực — giữ nguyên "chỉ cần đăng nhập".</summary>
    public static readonly HashSet<string> ExemptControllers = new(StringComparer.OrdinalIgnoreCase)
    {
        // Đăng nhập, đăng xuất, đổi mật khẩu, 2FA, WebAuthn, break-glass: chủ thể là CHÍNH user đó.
        "Auth",
        // Tùy chọn cá nhân của user đang đăng nhập.
        "UserSettings",
        // Đăng ký/thu hồi khoá sinh trắc của chính user + ký bằng khoá đó. Quyền ghi lên tài liệu
        // được ký đã gate ở controller nghiệp vụ tương ứng; gate thêm ở đây sẽ chặn cả người có quyền.
        "BiometricSignature",
    };

    /// <summary>Action tự phục vụ nằm trong controller có gate — "Controller.Action" (đã bỏ hậu tố).</summary>
    public static readonly HashSet<string> ExemptActions = new(StringComparer.OrdinalIgnoreCase)
    {
        "Notification.MarkAsRead",
        "Notification.MarkAllAsRead",
        "SystemComplete.ChangePassword",   // đổi mật khẩu của chính mình
        "SystemComplete.CreateItTicket",   // bất kỳ nhân viên nào cũng phải báo được sự cố IT
    };

    public static readonly IReadOnlyDictionary<string, Rule> Rules = new Dictionary<string, Rule>(StringComparer.OrdinalIgnoreCase)
    {
        // ── Khám bệnh / bệnh án ──
        ["ExaminationComplete"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read, new Dictionary<string, string>
        {
            ["ApplyPrescriptionTemplate"] = PermissionCatalog.Prescription.Create,
        }),
        ["ClinicalRecord"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read),
        ["ClinicalDecisionSupport"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read),
        ["MultiSpecialtyExam"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read, new Dictionary<string, string>
        {
            ["RegisterMultiRooms"] = PermissionCatalog.Reception.Update,
            ["ChangeRoom"] = PermissionCatalog.Reception.Update,
            ["DeleteRegistration"] = PermissionCatalog.Reception.Update,
            ["PrintBill"] = PermissionCatalog.Billing.Collect,
            ["CancelPrintBill"] = PermissionCatalog.Billing.Collect,
        }),
        ["TraditionalMedicine"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read),
        ["ObstetricRegister"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read),
        ["FollowUp"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read),
        ["Patients"] = new(PermissionCatalog.Patient.Update, PermissionCatalog.Patient.Read, new Dictionary<string, string>
        {
            ["Create"] = PermissionCatalog.Patient.Create,
        }),
        ["PatientFlag"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read),
        ["MedicalRecordPlanning"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read, new Dictionary<string, string>
        {
            ["ApproveHandover"] = PermissionCatalog.MedicalRecord.Lock,
            ["ApproveTransfer"] = PermissionCatalog.MedicalRecord.Lock,
            ["CreateRecordCopy"] = PermissionCatalog.MedicalRecord.Export,
        }),

        // ── Nội trú ──
        ["InpatientComplete"] = new(PermissionCatalog.Inpatient.Update, PermissionCatalog.Inpatient.Read, new Dictionary<string, string>
        {
            ["AdmitFromOpd"] = PermissionCatalog.Inpatient.Admit,
            ["AdmitFromDepartment"] = PermissionCatalog.Inpatient.Admit,
            ["ApproveConsultation"] = PermissionCatalog.Inpatient.Approve,
        }),
        ["ObservationStay"] = new(PermissionCatalog.Inpatient.Update, PermissionCatalog.Inpatient.Read),

        // ── Tiếp đón / đăng ký ──
        ["ReceptionComplete"] = new(PermissionCatalog.Reception.Update, PermissionCatalog.Reception.Read, new Dictionary<string, string>
        {
            ["CreateDeposit"] = PermissionCatalog.Billing.Collect,
            ["CreateEmergencyDeposit"] = PermissionCatalog.Billing.Collect,
            ["CreatePayment"] = PermissionCatalog.Billing.Collect,
            ["ExportReport"] = PermissionCatalog.Report.Export,
        }),
        ["BookingManagement"] = new(PermissionCatalog.Reception.Update, PermissionCatalog.Reception.Read),
        ["Kiosk"] = new(PermissionCatalog.Reception.Update, PermissionCatalog.Reception.Read),
        ["PatientTransportSlip"] = new(PermissionCatalog.Inpatient.Update, PermissionCatalog.Inpatient.Read),

        // ── Phẫu thuật ──
        ["SurgeryComplete"] = new(PermissionCatalog.Surgery.Update, PermissionCatalog.Surgery.Read, new Dictionary<string, string>
        {
            ["CreateSurgeryRequest"] = PermissionCatalog.Surgery.Create,
            ["ScheduleSurgery"] = PermissionCatalog.Surgery.Create,
        }),

        // ── Chẩn đoán hình ảnh / RIS ──
        ["RISComplete"] = new(PermissionCatalog.Radiology.Create, PermissionCatalog.Radiology.Read, new Dictionary<string, string>
        {
            ["ApproveResult"] = PermissionCatalog.Radiology.Approve,
            ["BulkApproveResults"] = PermissionCatalog.Radiology.Approve,
            ["ApproveMinutes"] = PermissionCatalog.Radiology.Approve,
            ["ApproveDutySchedule"] = PermissionCatalog.Radiology.Approve,
            ["BulkExportDicom"] = PermissionCatalog.MedicalRecord.Export,
        }),
        ["RadiologyDispatch"] = new(PermissionCatalog.Radiology.Create, PermissionCatalog.Radiology.Read),
        ["NonDicom"] = new(PermissionCatalog.Radiology.Create, PermissionCatalog.Radiology.Read),
        ["DicomAutoSend"] = new(PermissionCatalog.Radiology.Create, PermissionCatalog.Radiology.Read),
        ["DicomStudyActivity"] = new(PermissionCatalog.Radiology.Create, PermissionCatalog.Radiology.Read),
        ["AiLabeling"] = new(PermissionCatalog.Radiology.Create, PermissionCatalog.Radiology.Read),
        ["StudyShare"] = new(PermissionCatalog.MedicalRecord.Export, PermissionCatalog.Radiology.Read),
        ["RisCatalog"] = new(PermissionCatalog.Catalog.Manage, PermissionCatalog.Catalog.Read),

        // ── Xét nghiệm / LIS ──
        ["LISComplete"] = new(PermissionCatalog.LabResult.Create, PermissionCatalog.LabResult.Read, new Dictionary<string, string>
        {
            ["RejectSample"] = PermissionCatalog.LabResult.Validate,
            ["RetrieveSample"] = PermissionCatalog.LabResult.Validate,
            ["RejectInboxResult"] = PermissionCatalog.LabResult.Validate,
        }),
        ["LisConfig"] = new(PermissionCatalog.Laboratory.Configure, PermissionCatalog.LabResult.Read),
        ["SampleCollection"] = new(PermissionCatalog.LabResult.Create, PermissionCatalog.LabResult.Read),
        ["SpecimenImage"] = new(PermissionCatalog.LabResult.Create, PermissionCatalog.LabResult.Read),
        ["CultureStock"] = new(PermissionCatalog.LabResult.Create, PermissionCatalog.LabResult.Read),
        ["LabCancelChain"] = new(PermissionCatalog.LabResult.Validate, PermissionCatalog.LabResult.Read),
        ["LabResultEvaluation"] = new(PermissionCatalog.LabResult.Validate, PermissionCatalog.LabResult.Read),
        ["FunctionalDiagnostics"] = new(PermissionCatalog.LabResult.Create, PermissionCatalog.LabResult.Read),
        ["FunctionalDiagnosticCatalog"] = new(PermissionCatalog.Catalog.Manage, PermissionCatalog.Catalog.Read),
        ["IvfLab"] = new(PermissionCatalog.LabResult.Create, PermissionCatalog.LabResult.Read),

        // ── Dược ──
        ["Pharmacy"] = new(PermissionCatalog.Pharmacy.Dispense, PermissionCatalog.Pharmacy.Read, new Dictionary<string, string>
        {
            ["ApproveTransfer"] = PermissionCatalog.Pharmacy.Approve,
            ["RejectTransfer"] = PermissionCatalog.Pharmacy.Approve,
            ["RejectPrescription"] = PermissionCatalog.Pharmacy.Approve,
            ["CreateTransfer"] = PermissionCatalog.Pharmacy.StockOut,
            ["ReceiveTransfer"] = PermissionCatalog.Pharmacy.StockIn,
            // Dược sĩ lập hóa đơn ngay sau khi cấp phát — coi là một nhịp của việc cấp phát,
            // không mở cho họ toàn bộ quyền thu tiền (đặt cọc, thu viện phí).
            ["CreateBillingAfterDispensing"] = PermissionCatalog.Pharmacy.Dispense,
            ["CreateAdrReport"] = PermissionCatalog.Quality.Update,
        }),
        ["PharmacyApproval"] = new(PermissionCatalog.Pharmacy.Approve, PermissionCatalog.Pharmacy.Read),
        ["PharmacyEnhancement"] = new(PermissionCatalog.Pharmacy.Dispense, PermissionCatalog.Pharmacy.Read),
        ["HospitalPharmacy"] = new(PermissionCatalog.Pharmacy.Dispense, PermissionCatalog.Pharmacy.Read),
        ["WarehouseComplete"] = new(PermissionCatalog.Pharmacy.StockIn, PermissionCatalog.Pharmacy.Read),
        ["MedicineDoseRange"] = new(PermissionCatalog.Catalog.Manage, PermissionCatalog.Prescription.Read),
        ["AdrReport"] = new(PermissionCatalog.Quality.Update, PermissionCatalog.Quality.Read),

        // ── Viện phí / BHYT ──
        ["BillingGuarantor"] = new(PermissionCatalog.Billing.Collect, PermissionCatalog.Billing.Read),
        ["PaymentGateway"] = new(PermissionCatalog.Billing.Collect, PermissionCatalog.Billing.Read),
        ["BhytFullCoverage"] = new(PermissionCatalog.Insurance.Submit, PermissionCatalog.Insurance.Read),
        ["EInvoice"] = new(PermissionCatalog.Billing.Collect, PermissionCatalog.Billing.Read, new Dictionary<string, string>
        {
            // Hủy hóa đơn đã phát hành = hủy chứng từ tiền, không phải một nhịp thu tiền.
            ["Cancel"] = PermissionCatalog.Billing.Void,
            ["SaveConfig"] = PermissionCatalog.System.Configure,
            ["SyncStatus"] = PermissionCatalog.Billing.Read,
        }),
        ["BhxhAudit"] = new(PermissionCatalog.Insurance.Submit, PermissionCatalog.Insurance.Read, new Dictionary<string, string>
        {
            ["ApproveSession"] = PermissionCatalog.Insurance.Approve,
        }),

        // ── Y tế công cộng / chương trình mục tiêu ──
        ["PublicHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["CommunityHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["ProvincialHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read, new Dictionary<string, string>
        {
            ["SubmitReport"] = PermissionCatalog.PublicHealth.Submit,
            ["SubmitInfectious"] = PermissionCatalog.PublicHealth.Submit,
        }),
        ["Epidemiology"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["Immunization"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["SchoolHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["OccupationalHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["EnvironmentalHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["FoodSafety"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["PopulationHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["HealthEducation"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["ChronicDisease"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["TbHiv"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["HivManagement"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["Methadone"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["MentalHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["ReproductiveHealth"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["MCI"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["TraumaRegistry"] = new(PermissionCatalog.PublicHealth.Update, PermissionCatalog.PublicHealth.Read),
        ["Forensic"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read),

        // ── Tài sản · thiết bị · vật tư ──
        ["AssetManagement"] = new(PermissionCatalog.Asset.Manage, PermissionCatalog.Asset.Read, new Dictionary<string, string>
        {
            ["ApproveDisposal"] = PermissionCatalog.Asset.Approve,
            ["AwardTender"] = PermissionCatalog.Asset.Approve,
        }),
        ["AssetProcurement"] = new(PermissionCatalog.Asset.Manage, PermissionCatalog.Asset.Read),
        ["Equipment"] = new(PermissionCatalog.Asset.Manage, PermissionCatalog.Asset.Read, new Dictionary<string, string>
        {
            ["ApproveMaintenance"] = PermissionCatalog.Asset.Approve,
            ["RejectMaintenance"] = PermissionCatalog.Asset.Approve,
            // Ai cũng phải báo được thiết bị hỏng.
            ["CreateRepairRequest"] = PermissionCatalog.Asset.Request,
        }),
        ["Procurement"] = new(PermissionCatalog.Asset.Manage, PermissionCatalog.Asset.Read),
        ["LinenManagement"] = new(PermissionCatalog.Asset.Manage, PermissionCatalog.Asset.Read),
        ["OfficeSupply"] = new(PermissionCatalog.Asset.Manage, PermissionCatalog.Asset.Read),

        // ── Nhân sự · đào tạo ──
        ["MedicalHR"] = new(PermissionCatalog.Hr.Manage, PermissionCatalog.Hr.Read, new Dictionary<string, string>
        {
            ["ApproveLeave"] = PermissionCatalog.Hr.Approve,
            ["ApproveOvertime"] = PermissionCatalog.Hr.Approve,
            // Nhân viên nào cũng phải tự nộp được đơn nghỉ phép / đăng ký tăng ca của chính mình.
            ["CreateLeaveRequest"] = PermissionCatalog.Hr.SelfService,
            ["CreateOvertime"] = PermissionCatalog.Hr.SelfService,
        }),
        ["PracticeLicense"] = new(PermissionCatalog.Hr.Manage, PermissionCatalog.Hr.Read),
        ["TrainingResearch"] = new(PermissionCatalog.Hr.Manage, PermissionCatalog.Hr.Read),

        // ── Chất lượng · an toàn người bệnh ──
        ["Quality"] = new(PermissionCatalog.Quality.Update, PermissionCatalog.Quality.Read),
        ["SatisfactionSurvey"] = new(PermissionCatalog.Quality.Update, PermissionCatalog.Quality.Read),
        ["InfectionControl"] = new(PermissionCatalog.Quality.Update, PermissionCatalog.Quality.Read),
        ["BusinessAlert"] = new(PermissionCatalog.Quality.Update, PermissionCatalog.Quality.Read),

        // ── Dinh dưỡng · phục hồi chức năng · khám sức khỏe ──
        ["Nutrition"] = new(PermissionCatalog.Nutrition.Update, PermissionCatalog.Nutrition.Read, new Dictionary<string, string>
        {
            ["ApproveMealPlan"] = PermissionCatalog.Nutrition.Approve,
            ["RejectMealPlan"] = PermissionCatalog.Nutrition.Approve,
        }),
        ["Rehabilitation"] = new(PermissionCatalog.Rehab.Update, PermissionCatalog.Rehab.Read),
        ["HealthCheckup"] = new(PermissionCatalog.Checkup.Update, PermissionCatalog.Checkup.Read),
        ["CheckupContract"] = new(PermissionCatalog.Checkup.Update, PermissionCatalog.Checkup.Read),

        // ── Khám từ xa · liên viện ──
        ["Telemedicine"] = new(PermissionCatalog.Telehealth.Update, PermissionCatalog.Telehealth.Read, new Dictionary<string, string>
        {
            ["CreatePrescription"] = PermissionCatalog.Prescription.Create,
            ["SignPrescription"] = PermissionCatalog.Prescription.Create,
            ["SendPrescriptionToPharmacy"] = PermissionCatalog.Prescription.Create,
        }),
        ["VideoConsultation"] = new(PermissionCatalog.Telehealth.Update, PermissionCatalog.Telehealth.Read),
        ["InterHospital"] = new(PermissionCatalog.Telehealth.Update, PermissionCatalog.Telehealth.Read),

        // ── Liên thông · tích hợp · thông báo ──
        ["HIE"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),
        ["MultiHisConnector"] = new(PermissionCatalog.Integration.Configure, PermissionCatalog.Integration.Read),
        ["CdaDocument"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),
        ["EmrHl7Archive"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),
        ["EmrCloudSync"] = new(PermissionCatalog.Integration.Configure, PermissionCatalog.Integration.Read),
        ["NationalPrescription"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),
        ["Dqgvn"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),
        ["DeAn06"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),
        ["Sms"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),
        ["ZaloNotification"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),
        ["Notification"] = new(PermissionCatalog.Integration.Submit, PermissionCatalog.Integration.Read),

        // ── Danh mục dùng chung · hệ thống · báo cáo ──
        ["MasterCatalog"] = new(PermissionCatalog.Catalog.Manage, PermissionCatalog.Catalog.Read),
        ["AdministrativeUnit"] = new(PermissionCatalog.Catalog.Manage, PermissionCatalog.Catalog.Read),
        ["Abbreviation"] = new(PermissionCatalog.Catalog.Manage, PermissionCatalog.Catalog.Read, new Dictionary<string, string>
        {
            ["IncrementUsage"] = PermissionCatalog.Catalog.Read,
        }),
        ["ClinicalTemplate"] = new(PermissionCatalog.Catalog.Manage, PermissionCatalog.Catalog.Read, new Dictionary<string, string>
        {
            ["IncrementUsage"] = PermissionCatalog.Catalog.Read,
        }),
        ["ClinicalGuidance"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read),
        ["TreatmentProtocol"] = new(PermissionCatalog.Catalog.Manage, PermissionCatalog.Catalog.Read),
        ["SystemComplete"] = new(PermissionCatalog.System.Configure, PermissionCatalog.Report.Read),
        ["HospitalReport"] = new(PermissionCatalog.Report.Export, PermissionCatalog.Report.Read),

        // WriteGap gom nhiều nghiệp vụ rời — gán từng action, không có mặc định an toàn nào cho cả nhóm.
        ["WriteGap"] = new(PermissionCatalog.MedicalRecord.Update, PermissionCatalog.MedicalRecord.Read, new Dictionary<string, string>
        {
            ["CloseHAI"] = PermissionCatalog.Quality.Update,
            ["InvestigateHAI"] = PermissionCatalog.Quality.Update,
            ["CreateAuditSession"] = PermissionCatalog.Insurance.Submit,
            ["CreateDiseaseReport"] = PermissionCatalog.PublicHealth.Update,
            ["CreateInterHospitalRequest"] = PermissionCatalog.Telehealth.Update,
            ["RejectSample"] = PermissionCatalog.LabResult.Validate,
            ["RetrieveSample"] = PermissionCatalog.LabResult.Validate,
            ["StoreSample"] = PermissionCatalog.LabResult.Create,
            ["UndoRejectSample"] = PermissionCatalog.LabResult.Validate,
            ["SaveDoctorSchedule"] = PermissionCatalog.Hr.Manage,
        }),
    };

    /// <summary>
    /// Quyền cần có cho một action ghi, hoặc <c>null</c> nếu action được miễn hoặc controller chưa
    /// có trong bảng. Thứ tự ưu tiên: miễn trừ → override theo action → luật "POST nhưng là đọc" → mặc định.
    /// </summary>
    public static string? Resolve(string controllerName, string actionName)
    {
        if (ExemptControllers.Contains(controllerName)) return null;
        if (ExemptActions.Contains($"{controllerName}.{actionName}")) return null;
        if (!Rules.TryGetValue(controllerName, out var rule)) return null;

        if (rule.Overrides is not null && rule.Overrides.TryGetValue(actionName, out var over)) return over;

        if (rule.Read is not null &&
            ReadIshPrefixes.Any(p => actionName.StartsWith(p, StringComparison.Ordinal)))
            return rule.Read;

        return rule.Write;
    }
}
