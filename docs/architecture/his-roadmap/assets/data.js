/* ============================================================================
   HIS — Sơ đồ cấu trúc dữ liệu : DATA + RENDER (tách riêng khỏi HTML/CSS)
   Nguồn: HIS.Infrastructure/Data/HISDbContext.cs (485 DbSet) — đã đối chiếu 485/485.
   t(tênBảngThật, nhãnTiếngViệt)
   ============================================================================ */
const t = (n, l) => [n, l];

const BANDS = [
 {id:"found",title:"NỀN TẢNG & DANH MỤC",sub:"Tổ chức · phân quyền · danh mục dùng chung · hạ tầng hệ thống",color:"var(--found)",tag:"#475569",modules:[
   {id:"org",ic:"👤",nm:"Tổ chức & Phân quyền",desc:"Người dùng, vai trò, quyền, cây tổ chức",
    rel:"<b>Users</b> ⟶ UserRoles ⟶ Roles ⟶ RolePermissions ⟶ Permissions · HospitalBranches ⟶ Departments ⟶ Rooms ⟶ Beds",
    tables:[t("Users","Người dùng"),t("Roles","Vai trò"),t("Permissions","Quyền"),t("UserRoles","Gán vai trò"),t("RolePermissions","Quyền của vai trò"),t("UserSessions","Phiên đăng nhập"),t("TwoFactorOtps","OTP 2 lớp"),t("UserSettings","Cấu hình người dùng"),t("HospitalBranches","Chi nhánh BV"),t("Departments","Khoa"),t("Rooms","Phòng"),t("Beds","Giường")]},
   {id:"catalog",ic:"📚",nm:"Danh mục dùng chung",desc:"ICD, dịch vụ, thuốc, vật tư, hành chính…",
    rel:"Dùng bởi hầu hết phân hệ: <b>Services/ServicePrices</b> (viện phí), <b>Medicines/MedicalSupplies</b> (dược), <b>IcdCodes</b> (chẩn đoán)",
    tables:[t("IcdCodes","Mã ICD-10"),t("IcdInsuranceMaps","Map ICD–BHYT"),t("ClinicalTerms","Thuật ngữ LS"),t("SnomedIcdMappings","Map SNOMED–ICD"),t("Abbreviations","Từ viết tắt"),t("Ethnics","Dân tộc"),t("Nations","Quốc gia"),t("Countries","Nước"),t("Provinces","Tỉnh/TP"),t("Districts","Quận/Huyện"),t("Wards","Xã/Phường"),t("AdministrativeDivisions","Đơn vị hành chính"),t("Occupations","Nghề nghiệp"),t("Genders","Giới tính"),t("HealthcareFacilities","CSKCB"),t("InitialFacilities","Nơi ĐK ban đầu"),t("ServiceGroups","Nhóm dịch vụ"),t("Services","Dịch vụ"),t("ServicePrices","Giá dịch vụ"),t("ServiceGroupTemplates","Mẫu nhóm DV"),t("ServiceGroupTemplateItems","Chi tiết mẫu nhóm DV"),t("ServicePackages","Gói dịch vụ"),t("ServicePackageItems","Chi tiết gói DV"),t("Medicines","Thuốc"),t("MedicalSupplies","Vật tư y tế"),t("Manufacturers","Hãng SX"),t("Suppliers","Nhà cung cấp"),t("MedicationRoutes","Đường dùng thuốc"),t("DrugInteractions","Tương tác thuốc"),t("DrugEquivalences","Thuốc tương đương"),t("MachineCodes","Mã máy"),t("MachineServices","DV theo máy"),t("ReportServiceGroups","Nhóm DV báo cáo"),t("ReportServiceGroupTypes","Loại nhóm DV báo cáo"),t("ParaclinicalRoomPriorities","Ưu tiên phòng CLS"),t("NursingCareLevels","Cấp chăm sóc"),t("MedicalRecordTypes","Loại hồ sơ"),t("ReceiptBooks","Sổ biên lai"),t("InspectionCommittees","Hội đồng kiểm"),t("InspectionCommitteeMembers","TV hội đồng kiểm")]},
   {id:"system",ic:"⚙️",nm:"Hệ thống & Hạ tầng",desc:"Cấu hình, log, audit, thông báo, bảo mật",
    rel:"<b>AuditLog</b> ghi mọi thay đổi (patient-safety) · Notifications/SmsLogs/ZaloNotificationLogs cho đẩy tin",
    tables:[t("SystemConfigs","Cấu hình hệ thống"),t("SystemLogs","Nhật ký hệ thống"),t("AuditLogs","Nhật ký audit"),t("Notifications","Thông báo"),t("ScheduledTasks","Tác vụ định kỳ"),t("SmsLogs","Log SMS"),t("ZaloNotificationLogs","Log Zalo OA"),t("BusinessAlerts","Cảnh báo nghiệp vụ"),t("SecurityIncidents","Sự cố bảo mật"),t("EndpointDevices","Thiết bị đầu cuối"),t("InstalledSoftwareItems","Phần mềm đã cài")]}
 ]},

 {id:"clin",title:"LỚP A — LÂM SÀNG",sub:"Tiếp đón → khám → cận lâm sàng → điều trị (xoay quanh bệnh nhân)",color:"var(--clin)",tag:"#0d9488",modules:[
   {id:"reception",ic:"🛎️",nm:"Tiếp đón & Hàng đợi",desc:"Check-in, lịch hẹn, số thứ tự, màn hình chờ",
    rel:"Appointments ⟶ Queues/QueueTickets ⟶ tạo <b>MedicalRecord</b> (vào khám)",
    tables:[t("Queues","Hàng đợi"),t("QueueTickets","Vé số TT"),t("QueueConfigurations","Cấu hình hàng đợi"),t("DisplayScreens","Màn hình hiển thị"),t("WaitingRoomDisplayConfigs","Cấu hình màn chờ"),t("CameraConfigurations","Cấu hình camera"),t("Appointments","Lịch hẹn"),t("AppointmentServices","DV theo lịch hẹn"),t("DoctorSchedules","Lịch bác sĩ"),t("FollowUpAppointments","Lịch tái khám")]},
   {id:"patient",ic:"🧑‍🤝‍🧑",nm:"Bệnh nhân & Tiền sử",desc:"Hồ sơ nhân khẩu, dị ứng, chống chỉ định",
    rel:"<b>Patients</b> là gốc — 1 BN có nhiều MedicalRecords/Appointments · Allergies/Contraindications phục vụ cảnh báo an toàn",
    tables:[t("Patients","Bệnh nhân"),t("PatientPhotos","Ảnh bệnh nhân"),t("PatientFlags","Cờ đánh dấu BN"),t("Allergies","Dị ứng"),t("Contraindications","Chống chỉ định"),t("InjuryInfos","Thông tin chấn thương"),t("InsuranceCards","Thẻ BHYT")]},
   {id:"opd",ic:"🩺",nm:"Khám bệnh & Hồ sơ bệnh án",desc:"Bệnh án (hub), khám, chẩn đoán, phác đồ",
    rel:"<b>MedicalRecords</b> = trục trung tâm: thuộc Patient, chứa Examinations, link Department/Room/Doctor; PatientType (BHYT/Viện phí/DV/KSK), TreatmentType (Ngoại/Nội/Cấp cứu)",
    tables:[t("MedicalRecords","Hồ sơ bệnh án"),t("MedicalRecordArchives","Lưu trữ bệnh án"),t("MedicalRecordBorrowRequests","Mượn bệnh án"),t("Examinations","Lượt khám"),t("ExaminationTemplates","Mẫu khám"),t("ExaminationActivityLogs","Log hoạt động khám"),t("OutpatientRecordTemplates","Mẫu HS ngoại trú"),t("ConsultationRecords","Biên bản hội chẩn"),t("ConsultationRooms","Phòng hội chẩn"),t("ConsultationParticipants","TV hội chẩn"),t("TreatmentSheets","Tờ điều trị"),t("NursingCareSheets","Phiếu chăm sóc"),t("DiagnosisInterruptions","Gián đoạn chẩn đoán"),t("ClinicalTemplates","Mẫu lâm sàng"),t("ClinicalGuidanceBatches","Đợt hướng dẫn LS"),t("ClinicalGuidanceActivities","Hoạt động hướng dẫn LS"),t("TreatmentProtocols","Phác đồ điều trị"),t("TreatmentProtocolSteps","Bước phác đồ"),t("ClinicalDirections","Chỉ đạo tuyến")]},
   {id:"cls",ic:"📋",nm:"Chỉ định dịch vụ (CLS)",desc:"Y lệnh chỉ định XN/CĐHA/TDCN/thủ thuật",
    rel:"<b>ServiceRequests</b> phát sinh từ MedicalRecord ⟶ ServiceRequestDetails ⟶ phân về LIS/RIS/Pathology · LockedServices khóa DV",
    tables:[t("ServiceRequests","Phiếu chỉ định"),t("ServiceRequestDetails","Chi tiết chỉ định"),t("ServiceRequestDetailParameters","Thông số chỉ định"),t("LockedServices","Dịch vụ bị khóa")]},
   {id:"lis",ic:"🧪",nm:"Xét nghiệm (LIS)",desc:"Lấy mẫu, máy XN, kết quả, vi sinh, QC",
    rel:"ServiceRequest ⟶ LabWorklists ⟶ LabAnalyzers (HL7) ⟶ LabRawResults ⟶ cảnh báo LabCriticalValueAlerts",
    tables:[t("LabBooks","Sổ XN"),t("LabBookGroups","Nhóm sổ XN"),t("LabChemicals","Hóa chất XN"),t("SampleAppointments","Hẹn lấy mẫu"),t("LabAnalyzers","Máy XN"),t("LabAnalyzerTestMappings","Map máy–XN"),t("LabConnectionLogs","Log kết nối máy"),t("LabWorklists","Worklist XN"),t("LabRawResults","KQ thô"),t("LabCriticalValueAlerts","Cảnh báo giá trị nguy kịch"),t("LabCriticalValueConfigs","Cấu hình giá trị nguy kịch"),t("LabReferenceRanges","Khoảng tham chiếu"),t("LabTestGroups","Nhóm XN"),t("LabSampleTypes","Loại mẫu"),t("LabTubeTypes","Loại ống"),t("LabQCResults","KQ nội kiểm (QC)"),t("LabConclusionTemplates","Mẫu kết luận XN"),t("LabTestNorms","Định mức XN"),t("LabMeasurementUnits","Đơn vị đo"),t("LabOrganisms","Vi khuẩn"),t("LabAntibiotics","Kháng sinh đồ"),t("LisAnalyzers","Máy LIS"),t("LisTestParameters","Thông số XN LIS"),t("LisReferenceRanges","Khoảng tham chiếu LIS"),t("LisAnalyzerMappings","Map máy LIS"),t("LabconnectSyncHistories","LS đồng bộ LabConnect"),t("MicrobiologyCultures","Nuôi cấy vi sinh"),t("MicrobiologyOrganismFindings","Phát hiện vi sinh vật"),t("AntibioticSensitivityResults","KQ kháng sinh đồ"),t("CultureStocks","Tồn môi trường nuôi cấy"),t("CultureStockLogs","Log môi trường nuôi cấy"),t("LabResultAccessLinks","Link tra KQ XN"),t("SpecialTestRules","Quy tắc XN đặc biệt")]},
   {id:"ris",ic:"🩻",nm:"Chẩn đoán hình ảnh (RIS/PACS)",desc:"Chụp, DICOM, đọc KQ, hội chẩn ảnh, ký số",
    rel:"ServiceRequest ⟶ RadiologyRequests ⟶ RadiologyExams ⟶ DicomStudies (PACS) ⟶ RadiologyReports (ký số) · auto-send DICOM, HL7/CDA",
    tables:[t("RadiologyRequests","Phiếu CĐHA"),t("RadiologyExams","Ca chụp"),t("RadiologyReports","KQ đọc"),t("RadiologyModalities","Loại máy chụp"),t("DicomStudies","Study DICOM"),t("RadiologyDiagnosisTemplates","Mẫu chẩn đoán"),t("RadiologyAbbreviations","Viết tắt CĐHA"),t("RadiologyDutySchedules","Lịch trực CĐHA"),t("RadiologyTags","Nhãn CĐHA"),t("RadiologyRequestTags","Nhãn theo phiếu"),t("RadiologyIntegrationLogs","Log tích hợp"),t("RadiologyRoomAssignments","Phân phòng chụp"),t("RadiologyDigitalSignatureConfigs","Cấu hình ký số"),t("RadiologySignatureHistories","LS ký số"),t("RadiologyLabelConfigs","Cấu hình nhãn"),t("RadiologyCaptureDevices","Thiết bị thu hình"),t("RadiologyWorkstations","Trạm đọc"),t("RadiologyCaptureSession","Phiên thu hình"),t("RadiologyCapturedMedia","Media thu được"),t("RadiologyConsultationSessions","Phiên hội chẩn ảnh"),t("RadiologyConsultationCases","Ca hội chẩn ảnh"),t("RadiologyConsultationParticipants","TV hội chẩn ảnh"),t("RadiologyConsultationAttachments","Đính kèm hội chẩn"),t("RadiologyConsultationDiscussions","Thảo luận hội chẩn"),t("RadiologyConsultationImageNotes","Ghi chú trên ảnh"),t("RadiologyConsultationMinutes","Biên bản hội chẩn ảnh"),t("RadiologyHL7CDAConfigs","Cấu hình HL7/CDA"),t("RadiologyHL7Messages","Tin HL7"),t("RadiologyCDADocuments","Tài liệu CDA"),t("RadiologyHelpCategories","DM trợ giúp"),t("RadiologyHelpArticles","Bài trợ giúp"),t("RadiologyTroubleshootings","Khắc phục sự cố"),t("RadiologyCLSScreenConfigs","Cấu hình màn CLS"),t("RadiologyServiceDescriptionTemplates","Mẫu mô tả DV"),t("RadiologyBodyParts","Bộ phận cơ thể"),t("RadiologyProtocols","Protocol chụp"),t("RadiologyReportTemplates","Mẫu KQ"),t("RadiologyPermissions","Phân quyền CĐHA"),t("RadiologyDispatches","Điều phối CĐHA"),t("RisIcdTemplateMappings","Map ICD–mẫu"),t("RisSurgeryServiceMappings","Map PTTT–DV"),t("RemotePacsServers","PACS từ xa"),t("DicomStudyActivityLogs","Log Study DICOM"),t("DicomAutoSendRules","Quy tắc auto-send"),t("DicomTransmissionLogs","Log truyền DICOM"),t("Hl7MessageQueues","Hàng đợi HL7"),t("PacsKeyImages","Ảnh key"),t("PacsImageAnnotations","Chú thích ảnh"),t("NonDicomStudies","Study ngoài DICOM"),t("NonDicomImages","Ảnh ngoài DICOM"),t("StudyShareLinks","Link chia sẻ ảnh"),t("AiLabelingResults","KQ gán nhãn AI")]},
   {id:"patho",ic:"🔬",nm:"Giải phẫu bệnh",desc:"Phiếu & kết quả giải phẫu bệnh",
    rel:"ServiceRequest ⟶ PathologyRequests ⟶ PathologyResults",
    tables:[t("PathologyRequests","Phiếu GPB"),t("PathologyResults","KQ GPB")]},
   {id:"tdcn",ic:"📈",nm:"Thăm dò chức năng",desc:"ECG, điện não, hô hấp ký…",
    rel:"ServiceRequest ⟶ FunctionalDiagnosticTests ⟶ trả KQ vào bệnh án",
    tables:[t("FunctionalDiagnosticTests","Phiếu/KQ thăm dò chức năng")]},
   {id:"presc",ic:"💊",nm:"Kê đơn & Pha chế",desc:"Đơn thuốc, mẫu đơn, pha chế",
    rel:"MedicalRecord ⟶ Prescriptions ⟶ PrescriptionDetails ⟶ duyệt Dược (PharmacyApprovals) ⟶ phát thuốc",
    tables:[t("Prescriptions","Đơn thuốc"),t("PrescriptionDetails","Chi tiết đơn"),t("PrescriptionTemplates","Mẫu đơn"),t("PrescriptionTemplateItems","Chi tiết mẫu đơn"),t("InstructionLibraries","Thư viện lời dặn"),t("CompoundingOrders","Phiếu pha chế"),t("CompoundingOrderItems","Chi tiết pha chế"),t("IUMedicineConfigs","Cấu hình thuốc IU")]},
   {id:"ipd",ic:"🛏️",nm:"Nội trú (IPD)",desc:"Nhập viện, giường, sinh hiệu, diễn biến, ra viện",
    rel:"MedicalRecord ⟶ Admissions ⟶ BedAssignments + InpatientVitalSigns + DailyProgresses + NursingCares ⟶ Discharges",
    tables:[t("Admissions","Nhập viện"),t("BedAssignments","Phân giường"),t("InpatientVitalSigns","Sinh hiệu nội trú"),t("DailyProgresses","Diễn biến hằng ngày"),t("NursingCares","Chăm sóc ĐD"),t("Discharges","Ra viện"),t("NewbornRecords","Hồ sơ sơ sinh"),t("InfusionRecords","Truyền dịch"),t("InpatientConsultations","Hội chẩn nội trú"),t("InpatientConsultationMembers","TV hội chẩn nội trú"),t("ObservationStays","Lưu theo dõi"),t("ObservationVitals","Sinh hiệu lưu theo dõi"),t("NurseShiftHandovers","Bàn giao ca ĐD")]},
   {id:"surgery",ic:"🔪",nm:"Phẫu thuật & Gây mê",desc:"Lịch mổ, biên bản mổ, gây mê, sản đồ",
    rel:"SurgeryRequests ⟶ SurgerySchedules ⟶ SurgeryRecords (+team/vật tư/thuốc) · AnesthesiaRecords kèm theo dõi",
    tables:[t("SurgeryRequests","Đề nghị mổ"),t("SurgerySchedules","Lịch mổ"),t("SurgeryRecords","Biên bản mổ"),t("OperatingRooms","Phòng mổ"),t("SurgeryTeamMembers","Kíp mổ"),t("SurgeryMedicineItems","Thuốc dùng mổ"),t("SurgerySupplyItems","Vật tư dùng mổ"),t("SurgeryNarrativeTemplates","Mẫu tường trình mổ"),t("AnesthesiaRecords","Hồ sơ gây mê"),t("AnesthesiaMonitors","Theo dõi gây mê"),t("AnesthesiaDrugs","Thuốc gây mê"),t("AnesthesiaFluids","Dịch gây mê"),t("AnesthesiaChartEntries","Biểu đồ gây mê"),t("PartographRecords","Sản đồ (partograph)")]},
   {id:"blood",ic:"🩸",nm:"Ngân hàng máu & Truyền máu",desc:"Đơn vị máu, hiến, lĩnh, truyền",
    rel:"BloodDonors ⟶ BloodUnits ⟶ BloodRequests ⟶ BloodTransfusions (đối chiếu nhóm máu BN)",
    tables:[t("BloodUnits","Đơn vị máu"),t("BloodDonors","Người hiến máu"),t("BloodRequests","Phiếu lĩnh máu"),t("BloodTransfusions","Truyền máu")]},
   {id:"emr",ic:"✍️",nm:"HSĐT & Ký số",desc:"Bệnh án điện tử, biểu mẫu, ký số, sinh trắc",
    rel:"EmrSpines/EmrDocumentTypes cấu trúc HSĐT ⟶ SigningRequests/SigningTransactions ⟶ DocumentSignatures (USB token / sinh trắc WebAuthn)",
    tables:[t("EmrCoverTypes","Loại bìa HSĐT"),t("EmrDocumentAttachments","Đính kèm HSĐT"),t("EmrPrintLogs","Log in HSĐT"),t("EmrSignerCatalogs","DM người ký"),t("EmrSigningRoles","Vai trò ký"),t("EmrSigningOperations","Thao tác ký"),t("EmrDocumentGroups","Nhóm tài liệu"),t("EmrDocumentTypes","Loại tài liệu"),t("EmrShares","Chia sẻ HSĐT"),t("EmrShareAccessLogs","Log truy cập chia sẻ"),t("EmrExtracts","Trích sao HSĐT"),t("EmrSpines","Khung HSĐT"),t("EmrSpineSections","Mục khung HSĐT"),t("EmrDataTags","Thẻ dữ liệu HSĐT"),t("EmrImages","Ảnh HSĐT"),t("EmrAutoCheckRules","Quy tắc tự kiểm"),t("EmrCloseLogs","Log đóng HSĐT"),t("EmrAmendments","Vết sửa/finalize (TT46)"),t("EmrCloudSyncLogs","Log đồng bộ cloud"),t("SpecialtyEmrs","HSĐT chuyên khoa"),t("Shortcodes","Mã tắt"),t("DocumentSignatures","Chữ ký tài liệu"),t("DocumentLocks","Khóa tài liệu"),t("DocumentHolds","Giữ tài liệu"),t("SigningRequests","Yêu cầu ký"),t("SigningTransactions","Giao dịch ký"),t("SigningTotpSecrets","Bí mật TOTP ký"),t("ManagedCertificates","Chứng thư số"),t("TokenUserMappings","Map USB token–user"),t("CdaDocuments","Tài liệu CDA"),t("PatientSignatures","Chữ ký bệnh nhân"),t("BiometricCredentials","Vân tay/khuôn mặt"),t("BiometricSignatureLogs","Log ký sinh trắc"),t("WebAuthnCredentials","Khóa WebAuthn")]},
   {id:"rehab",ic:"🦽",nm:"Phục hồi chức năng",desc:"Chuyển PHCN, đánh giá, kế hoạch, buổi tập",
    rel:"RehabReferrals ⟶ FunctionalAssessments ⟶ RehabTreatmentPlans ⟶ RehabSessions",
    tables:[t("RehabReferrals","Chuyển PHCN"),t("FunctionalAssessments","Đánh giá chức năng"),t("RehabTreatmentPlans","Kế hoạch PHCN"),t("RehabSessions","Buổi tập PHCN")]},
   {id:"nutrition",ic:"🥗",nm:"Dinh dưỡng & Tiết chế",desc:"Sàng lọc, suất ăn, nuôi dưỡng tĩnh mạch",
    rel:"NutritionScreenings ⟶ NutritionAssessments ⟶ DietOrders/MealPlans · TPNOrders (nuôi dưỡng TM)",
    tables:[t("NutritionScreenings","Sàng lọc dinh dưỡng"),t("NutritionAssessments","Đánh giá dinh dưỡng"),t("DietOrders","Y lệnh suất ăn"),t("DietTypes","Loại suất ăn"),t("MealPlans","Thực đơn"),t("MealPlanItems","Món trong thực đơn"),t("NutritionMonitorings","Theo dõi dinh dưỡng"),t("TPNOrders","Nuôi dưỡng tĩnh mạch")]},
   {id:"infection",ic:"🦠",nm:"Kiểm soát nhiễm khuẩn",desc:"NKBV, cách ly, vệ sinh tay, ổ dịch nội viện",
    rel:"HAICases (nhiễm khuẩn BV) · IsolationOrders · HandHygieneObservations · Outbreaks ⟶ OutbreakCases · AntibioticStewardships",
    tables:[t("HAICases","Ca NKBV"),t("IsolationOrders","Lệnh cách ly"),t("HandHygieneObservations","Giám sát vệ sinh tay"),t("Outbreaks","Ổ dịch"),t("OutbreakCases","Ca trong ổ dịch"),t("AntibioticStewardships","Quản lý kháng sinh")]}
 ]},

 {id:"oper",title:"LỚP B — VẬN HÀNH",sub:"Dược · kho · trang thiết bị · tài sản · nhân sự",color:"var(--oper)",tag:"#d97706",modules:[
   {id:"pharmwh",ic:"📦",nm:"Dược & Kho",desc:"Nhập/xuất, tồn kho, duyệt phát, điều chuyển",
    rel:"ImportReceipts ⟶ InventoryItems ⟶ DispenseRequests/ExportReceipts · StockMovements/StockAdjustments cân kho · PharmacyApprovals duyệt toa",
    tables:[t("Warehouses","Kho"),t("InventoryItems","Tồn kho"),t("ImportReceipts","Phiếu nhập"),t("ImportReceiptDetails","Chi tiết nhập"),t("ExportReceipts","Phiếu xuất"),t("ExportReceiptDetails","Chi tiết xuất"),t("StockTakes","Kiểm kê"),t("StockTakeItems","Chi tiết kiểm kê"),t("StockMovements","Biến động kho"),t("StockReservations","Giữ hàng"),t("StockThresholds","Ngưỡng tồn"),t("StockAdjustments","Điều chỉnh tồn"),t("StockAdjustmentItems","Chi tiết điều chỉnh"),t("WarehouseTransfers","Điều chuyển kho"),t("WarehouseTransferItems","Chi tiết điều chuyển"),t("DispenseRequests","Yêu cầu phát thuốc"),t("DispenseRequestItems","Chi tiết phát thuốc"),t("ExpiryAlerts","Cảnh báo hạn dùng"),t("LowStockAlerts","Cảnh báo tồn thấp"),t("ConsignmentStocks","Hàng ký gửi"),t("PharmacyApprovals","Duyệt dược"),t("PharmacyApprovalItems","Chi tiết duyệt"),t("PharmacyApprovalLogs","Log duyệt dược"),t("SplitablePackageConfigs","Cấu hình tách gói"),t("ProfitMarginConfigs","Cấu hình lợi nhuận"),t("ProcurementRequests","Yêu cầu mua sắm"),t("ProcurementRequestItems","Chi tiết mua sắm")]},
   {id:"retail",ic:"🏪",nm:"Nhà thuốc bán lẻ (GPP)",desc:"Bán lẻ, khách hàng, điểm, ca, hoa hồng",
    rel:"RetailSales ⟶ RetailSaleItems · PharmacyCustomers ⟶ PharmacyPointTransactions · PharmacyShifts/Commissions",
    tables:[t("RetailSales","Đơn bán lẻ"),t("RetailSaleItems","Chi tiết bán lẻ"),t("PharmacyCustomers","Khách nhà thuốc"),t("PharmacyPointTransactions","Giao dịch điểm"),t("PharmacyShifts","Ca bán"),t("PharmacyGppRecords","Hồ sơ GPP"),t("PharmacyCommissions","Hoa hồng")]},
   {id:"asset",ic:"🛠️",nm:"Trang thiết bị & Tài sản",desc:"TTBYT, bảo trì, hiệu chuẩn, TSCĐ, đấu thầu",
    rel:"MedicalEquipments ⟶ MaintenanceRecords/CalibrationRecords/RepairRequests · FixedAssets ⟶ khấu hao/thanh lý/kiểm kê",
    tables:[t("MedicalEquipments","Thiết bị y tế"),t("MaintenanceRecords","Bảo trì"),t("CalibrationRecords","Hiệu chuẩn"),t("RepairRequests","Yêu cầu sửa"),t("FixedAssets","Tài sản cố định"),t("AssetHandovers","Bàn giao TS"),t("AssetDisposals","Thanh lý TS"),t("AssetDepreciations","Khấu hao TS"),t("AssetStocktakes","Kiểm kê TS"),t("AssetStocktakeItems","Chi tiết kiểm kê TS"),t("Tenders","Gói thầu"),t("TenderItems","Mục thầu"),t("LinenItems","Đồ vải"),t("LinenTransactions","Giao dịch đồ vải"),t("SterilizationSchedules","Lịch tiệt khuẩn")]},
   {id:"hr",ic:"👔",nm:"Nhân sự & Lương",desc:"Nhân viên, hợp đồng, trực, chấm công, lương, CCHN",
    rel:"MedicalStaffs ⟶ Employee* (hợp đồng/đào tạo/khen thưởng) · DutyRosters/AttendanceRecords ⟶ PayrollPeriods ⟶ PayrollItems",
    tables:[t("MedicalStaffs","Nhân viên y tế"),t("StaffQualifications","Bằng cấp"),t("DutyRosters","Bảng trực"),t("DutyShifts","Ca trực"),t("DutySchedules","Lịch trực"),t("ClinicAssignments","Phân công phòng khám"),t("CMERecords","Đào tạo liên tục (CME)"),t("HRCatalogs","Danh mục HR"),t("StaffContracts","Hợp đồng LĐ"),t("SalaryRecords","Bảng lương"),t("LeaveRequests","Đơn nghỉ phép"),t("AttendanceRecords","Chấm công"),t("OvertimeRecords","Tăng ca"),t("StaffAwards","Khen thưởng"),t("StaffDisciplines","Kỷ luật"),t("PayrollPeriods","Kỳ lương"),t("PayrollItems","Mục lương"),t("HrDecisions","Quyết định HR"),t("PracticeLicenses","CCHN"),t("EmployeeAssets","TS cấp NV"),t("EmployeeAllowances","Phụ cấp"),t("EmployeeCareerHistories","Quá trình công tác"),t("EmployeeEducations","Học vấn"),t("EmployeeFamilies","Quan hệ gia đình"),t("EmployeeRewardDisciplines","Khen thưởng/kỷ luật"),t("EmployeeBankAccounts","Tài khoản NH"),t("EmployeeContracts","Hợp đồng NV"),t("EmployeeInsuranceInfos","BHXH NV"),t("EmployeeUnionMemberships","Công đoàn")]}
 ]},

 {id:"fin",title:"LỚP C — TÀI CHÍNH & HÀNH CHÍNH",sub:"Viện phí · BHYT · báo cáo · chất lượng · khảo sát",color:"var(--fin)",tag:"#2563eb",modules:[
   {id:"billing",ic:"💰",nm:"Viện phí & Thanh toán",desc:"Biên lai, tạm ứng, HĐĐT, thanh toán, sổ quỹ",
    rel:"DV trong MedicalRecord ⟶ Receipts ⟶ ReceiptDetails ⟶ Payments/PaymentTransactions ⟶ ElectronicInvoices · Deposits (tạm ứng)",
    tables:[t("Receipts","Biên lai/Phiếu thu"),t("ReceiptDetails","Chi tiết thu"),t("InvoiceSummaries","Tổng hợp hóa đơn"),t("CashBooks","Sổ quỹ"),t("ElectronicInvoices","Hóa đơn điện tử"),t("PaymentTransactions","Giao dịch thanh toán"),t("Payments","Thanh toán"),t("Deposits","Tạm ứng"),t("OnlinePayments","Thanh toán online"),t("AdditionalCharges","Phụ thu"),t("OtherIncomes","Thu khác"),t("OtherPayers","Người chi trả khác"),t("TransportServices","DV vận chuyển"),t("GasolinePrices","Giá xăng dầu")]},
   {id:"insurance",ic:"🛡️",nm:"BHYT & Giám định",desc:"Giám định, hồ sơ XML, cổng BHXH, thanh tra",
    rel:"MedicalRecord (BHYT) ⟶ InsuranceClaims ⟶ InsuranceClaimDetails ⟶ InsuranceXMLSubmissions (cổng BHXH) · BhxhAudit*/Inspector* giám định",
    tables:[t("InsuranceClaims","Hồ sơ BHYT"),t("InsuranceClaimDetails","Chi tiết BHYT"),t("InsuranceRejections","Từ chối BHYT"),t("InsuranceStatisticsRecords","Thống kê BHYT"),t("InsurancePriceConfigs","Cấu hình giá BHYT"),t("InsuranceActivityLogs","Log BHYT"),t("InsuranceXMLSubmissions","Nộp XML BHYT"),t("BlockedInsurances","Thẻ BHYT chặn"),t("BhytFullCoveragePatients","BN miễn 100%"),t("BhxhAuditSessions","Phiên giám định BHXH"),t("BhxhAuditErrors","Lỗi giám định"),t("BhxhInspectorAccounts","TK thanh tra BHXH"),t("BhxhInspectorAccessLogs","Log thanh tra"),t("ElectronicReferrals","Chuyển tuyến điện tử"),t("HIEConnections","Kết nối HIE")]},
   {id:"reports",ic:"📊",nm:"Báo cáo & Dashboard",desc:"Mẫu báo cáo, báo cáo sinh ra, widget",
    rel:"ReportTemplates ⟶ GeneratedReports · DashboardWidgets · ReportAccessLogs (audit truy cập)",
    tables:[t("ReportTemplates","Mẫu báo cáo"),t("GeneratedReports","Báo cáo đã sinh"),t("DashboardWidgets","Widget dashboard"),t("ReportAccessLogs","Log truy cập báo cáo")]},
   {id:"quality",ic:"✅",nm:"Chất lượng & Sự cố",desc:"Chỉ số CL, sự cố y khoa, CAPA, kế hoạch audit",
    rel:"QualityIndicators ⟶ QualityIndicatorValues · IncidentReports ⟶ CAPAs · AuditPlans",
    tables:[t("QualityIndicators","Chỉ số chất lượng"),t("QualityIndicatorValues","Giá trị chỉ số"),t("IncidentReports","Báo cáo sự cố"),t("CAPAs","Hành động khắc phục (CAPA)"),t("AuditPlans","Kế hoạch audit")]},
   {id:"survey",ic:"⭐",nm:"Khảo sát hài lòng",desc:"Mẫu, kết quả, chiến dịch, phản hồi",
    rel:"SatisfactionSurveyTemplates ⟶ SatisfactionSurveyCampaigns ⟶ SatisfactionSurveyResults · ServiceFeedbacks/SurveyFeedbackCallbacks",
    tables:[t("SatisfactionSurveyTemplates","Mẫu khảo sát"),t("SatisfactionSurveyResults","KQ khảo sát"),t("SatisfactionSurveyCampaigns","Chiến dịch khảo sát"),t("SurveyFeedbackCallbacks","Gọi lại phản hồi"),t("SatisfactionSurveys","Khảo sát hài lòng"),t("ServiceFeedbacks","Phản hồi dịch vụ")]}
 ]},

 {id:"spec",title:"LỚP D — CHUYÊN KHOA · CỘNG ĐỒNG · TÍCH HỢP",sub:"Cổng BN · telemedicine · cổng QG · YTCC · chuyên khoa đặc thù",color:"var(--spec)",tag:"#7c3aed",modules:[
   {id:"portal",ic:"📱",nm:"Cổng bệnh nhân",desc:"Tài khoản BN, đặt lịch, nhắc thuốc, chỉ số SK",
    rel:"PortalAccounts ⟶ PortalAppointments/RefillRequests · HealthMetrics/MedicineReminders theo BN",
    tables:[t("PortalAccounts","TK cổng BN"),t("PortalAppointments","Đặt lịch online"),t("FamilyMembers","Thành viên gia đình"),t("MedicineReminders","Nhắc uống thuốc"),t("HealthMetrics","Chỉ số sức khỏe"),t("PatientQuestions","Câu hỏi của BN"),t("RefillRequests","Yêu cầu tái cấp thuốc")]},
   {id:"tele",ic:"💻",nm:"Khám từ xa (Telemedicine)",desc:"Lịch, phiên, hội chẩn, đơn từ xa",
    rel:"TeleAppointments ⟶ TeleSessions ⟶ TeleConsultations ⟶ TelePrescriptions",
    tables:[t("TeleAppointments","Lịch khám từ xa"),t("TeleSessions","Phiên video"),t("TeleConsultations","Hội chẩn từ xa"),t("TelePrescriptions","Đơn từ xa"),t("TelePrescriptionItems","Chi tiết đơn từ xa"),t("TeleFeedbacks","Phản hồi"),t("TeleconsultationRequests","Yêu cầu hội chẩn")]},
   {id:"national",ic:"🌐",nm:"Tích hợp cổng QG & Liên thông",desc:"Đơn thuốc QG, dược QG, giấy tờ, chuyển viện",
    rel:"NationalPrescriptionSubmissions/NationalPharmacyOutboundReports (cổng QG) · BirthCertificate/DeathCertificate · InterHospitalRequests",
    tables:[t("DqgvnSubmissions","Nộp dược QG (DQGVN)"),t("NationalPrescriptionSubmissions","Đơn thuốc QG"),t("NationalPharmacyOutboundReports","Báo cáo dược QG"),t("BirthCertificateRecords","Giấy chứng sinh"),t("DeathCertificateRecords","Giấy báo tử"),t("DrivingLicenseHealthChecks","KSK lái xe"),t("InterHospitalRequests","Yêu cầu liên viện"),t("OfficialDocuments","Công văn")]},
   {id:"checkup",ic:"📝",nm:"Khám sức khỏe & Gói khám",desc:"Hợp đồng KSK, gói, đợt, KSK lao động/học đường",
    rel:"HealthCheckContracts ⟶ HealthCheckPackages ⟶ HealthCheckups/HealthCheckupRecords · OccupationalHealthExams/SchoolHealthExams",
    tables:[t("HealthCheckContracts","Hợp đồng KSK"),t("HealthCheckPackages","Gói khám"),t("HealthCheckPackageServices","DV trong gói"),t("HealthCheckups","Lượt KSK"),t("HealthCheckupCampaigns","Đợt KSK"),t("HealthCheckupRecords","Hồ sơ KSK"),t("CheckupCampaignGroups","Nhóm đợt KSK"),t("OccupationalHealthExams","KSK nghề nghiệp"),t("SchoolHealthExams","KSK học đường")]},
   {id:"immun",ic:"💉",nm:"Tiêm chủng",desc:"Mũi tiêm, chiến dịch, lô vaccine",
    rel:"VaccinationCampaigns ⟶ ImmunizationBatches ⟶ VaccinationRecords",
    tables:[t("VaccinationRecords","Mũi tiêm"),t("VaccinationCampaigns","Chiến dịch tiêm"),t("ImmunizationBatches","Lô vaccine")]},
   {id:"pubhealth",ic:"🌍",nm:"Bệnh mãn tính & Y tế cộng đồng",desc:"HIV, Lao, Methadone, mãn tính, dịch tễ, tâm thần",
    rel:"Quản lý theo chương trình: HivPatients/TbHivRecords/MethadonePatients/ChronicDiseaseRecords · DiseaseCases ⟶ ContactTraces (truy vết)",
    tables:[t("ChronicDiseaseRecords","Hồ sơ bệnh mãn tính"),t("ChronicDiseaseFollowUps","Theo dõi mãn tính"),t("HivPatients","BN HIV"),t("HivLabResults","XN HIV"),t("PmtctRecords","Dự phòng lây mẹ-con"),t("TbHivRecords","Hồ sơ Lao/HIV"),t("TbHivFollowUps","Theo dõi Lao/HIV"),t("MethadonePatients","BN Methadone"),t("MethadoneDosingRecords","Cấp liều Methadone"),t("MethadoneUrineTests","XN nước tiểu"),t("DiseaseReports","Báo cáo bệnh"),t("DiseaseCases","Ca bệnh truyền nhiễm"),t("ContactTraces","Truy vết tiếp xúc"),t("OutbreakEvents","Sự kiện ổ dịch"),t("HouseholdHealthRecords","Hồ sơ SK hộ GĐ"),t("NcdScreenings","Sàng lọc bệnh KLN"),t("CommunityHealthTeams","Đội YTCC"),t("PopulationRecords","Hồ sơ dân số"),t("HealthCampaigns","Chiến dịch SK"),t("HealthEducationMaterials","Tài liệu truyền thông"),t("MentalHealthCases","Ca sức khỏe tâm thần"),t("PsychiatricAssessments","Đánh giá tâm thần")]},
   {id:"specialty",ic:"🧬",nm:"Chuyên khoa đặc thù",desc:"Sản/IVF · YHCT · pháp y · KHHGĐ",
    rel:"IvfPatientCouples ⟶ IvfCycles ⟶ IvfOvumPickups/IvfEmbryos/IvfEmbryoTransfers · ForensicCases · PrenatalRecords",
    tables:[t("ForensicCases","Ca pháp y"),t("ForensicExaminations","Giám định pháp y"),t("TraditionalMedicineTreatments","Điều trị YHCT"),t("HerbalPrescriptions","Đơn thuốc YHCT"),t("PrenatalRecords","Quản lý thai"),t("FamilyPlanningRecords","KHHGĐ"),t("IvfPatientCouples","Cặp vợ chồng IVF"),t("IvfCycles","Chu kỳ IVF"),t("IvfOvumPickups","Chọc hút trứng"),t("IvfEmbryos","Phôi"),t("IvfEmbryoTransfers","Chuyển phôi"),t("IvfSpermBanks","Ngân hàng tinh trùng"),t("IvfBiopsies","Sinh thiết phôi")]},
   {id:"mci",ic:"🚨",nm:"Cấp cứu thảm họa (MCI)",desc:"Sự kiện thảm họa, nạn nhân, báo cáo tình huống",
    rel:"MCIEvents ⟶ MCIVictims + MCISituationReports · TraumaCases",
    tables:[t("MCIEvents","Sự kiện MCI"),t("MCIVictims","Nạn nhân MCI"),t("MCISituationReports","Báo cáo tình huống"),t("TraumaCases","Ca chấn thương")]},
   {id:"env",ic:"♻️",nm:"Môi trường · Chất thải · ATTP",desc:"Chất thải, quan trắc, an toàn thực phẩm",
    rel:"WasteRecords/EnvironmentalMonitorings · FoodPoisoningIncidents/FoodSafetySamples/FoodEstablishmentInspections",
    tables:[t("WasteRecords","Chất thải y tế"),t("EnvironmentalMonitorings","Quan trắc môi trường"),t("FoodPoisoningIncidents","Ngộ độc thực phẩm"),t("FoodSafetySamples","Mẫu ATTP"),t("FoodEstablishmentInspections","Kiểm tra cơ sở TP")]},
   {id:"training",ic:"🎓",nm:"Đào tạo & NCKH",desc:"Lớp đào tạo, học viên, đề tài nghiên cứu",
    rel:"TrainingClasses ⟶ TrainingStudents · ResearchProjects",
    tables:[t("TrainingClasses","Lớp đào tạo"),t("TrainingStudents","Học viên"),t("ResearchProjects","Đề tài NCKH")]}
 ]}
];

/* Luồng xương sống (đã verify theo quan hệ entity thật: Patient → MedicalRecord → …) */
const FLOW = [
 ["🛎️","Tiếp đón / Hàng đợi"],["🩺","Khám (Bệnh án)"],["📋","Chỉ định CLS"],
 ["🧪🩻","XN / CĐHA / GPB"],["💊","Kê đơn / Dược"],["💰","Viện phí / BHYT"],
 ["🛏️🔪","Nội trú / Phẫu thuật"],["✍️","HSĐT / Ký số"],["🚪","Xuất viện"],["📊","Báo cáo / Audit"]
];

const LAYERC = {found:"#475569",clin:"#0d9488",oper:"#d97706",fin:"#2563eb",spec:"#7c3aed"};

/* (A) SƠ ĐỒ TỔNG THỂ — quan hệ giữa 5 lớp (giống ảnh mẫu: khối + mũi tên có nhãn) */
const LAYER_REL = {
 nodes:[
  {id:"found",area:"f",ic:"🧱",t:"NỀN TẢNG & DANH MỤC",d:"Danh mục dùng chung · Phân quyền · Hệ thống/Audit"},
  {id:"oper", area:"o",ic:"📦",t:"VẬN HÀNH",d:"Dược & Kho · Trang thiết bị/Tài sản · Nhân sự & Lương"},
  {id:"clin", area:"c",ic:"🩺",t:"LÂM SÀNG",d:"Tiếp đón → Khám → CLS → Điều trị → HSĐT/Ký số"},
  {id:"fin",  area:"i",ic:"💰",t:"TÀI CHÍNH & HÀNH CHÍNH",d:"Viện phí · BHYT · Báo cáo · Chất lượng"},
  {id:"spec", area:"s",ic:"🌍",t:"CHUYÊN KHOA · CỘNG ĐỒNG · TÍCH HỢP",d:"Cổng BN/QG · Telemedicine · YTCC · IVF/Sản/Pháp y"},
 ],
 edges:[
  {a:"found",b:"clin",l:"cấp danh mục · tài khoản · audit"},
  {a:"found",b:"oper",l:"DM thuốc/VT/tài sản"},
  {a:"found",b:"fin", l:"giá DV · map ICD–BHYT"},
  {a:"oper", b:"clin",l:"cấp thuốc · vật tư · thiết bị · nhân lực"},
  {a:"clin", b:"fin", l:"phát sinh chi phí DV → viện phí/BHYT"},
  {a:"clin", b:"spec",l:"dữ liệu BN ↔ chương trình chuyên khoa/YTCC"},
  {a:"fin",  b:"spec",l:"hồ sơ BHYT → cổng BHXH/QG"},
 ]
};

/* (B) ROADMAP — cơ chế hoạt động: trục giai đoạn + nhánh (ref = id sơ đồ con) + vai trò */
const STAGES = [
 {id:"found",layer:"found",ic:"🧱",title:"NỀN TẢNG dùng chung",roles:["Toàn hệ thống"],children:[
   {label:"Danh mục dùng chung",ref:"d-found-catalog",layer:"found"},
   {label:"Tổ chức & Phân quyền",ref:"d-found-org",layer:"found"},
   {label:"Hệ thống & Audit",ref:"d-found-system",layer:"found"},
 ]},
 {id:"reception",layer:"clin",ic:"🛎️",title:"Tiếp đón & Đăng ký",roles:["Tiếp đón","Thư ký"],children:[
   {label:"Tiếp đón & Hàng đợi",ref:"d-clin-reception",layer:"clin"},
   {label:"Bệnh nhân & Tiền sử",ref:"d-clin-patient",layer:"clin"},
   {label:"Cổng BN đặt lịch online",ref:"d-spec-portal",layer:"spec",opt:true},
 ]},
 {id:"exam",layer:"clin",ic:"🩺",title:"Khám bệnh",roles:["Bác sĩ"],children:[
   {label:"Khám & Hồ sơ bệnh án",ref:"d-clin-opd",layer:"clin"},
   {label:"Khám từ xa (Telemedicine)",ref:"d-spec-tele",layer:"spec",opt:true},
 ]},
 {id:"cls",layer:"clin",ic:"📋",title:"Chỉ định & Thực hiện CLS",roles:["Bác sĩ","KTV CLS"],children:[
   {label:"Chỉ định dịch vụ (CLS)",ref:"d-clin-cls",layer:"clin"},
   {label:"Xét nghiệm (LIS)",ref:"d-clin-lis",layer:"clin"},
   {label:"Chẩn đoán hình ảnh (RIS/PACS)",ref:"d-clin-ris",layer:"clin"},
   {label:"Giải phẫu bệnh",ref:"d-clin-patho",layer:"clin"},
   {label:"Thăm dò chức năng",ref:"d-clin-tdcn",layer:"clin"},
 ]},
 {id:"pharm",layer:"clin",ic:"💊",title:"Kê đơn & Cấp phát thuốc",roles:["Bác sĩ","Dược sĩ"],children:[
   {label:"Kê đơn & Pha chế",ref:"d-clin-presc",layer:"clin"},
   {label:"Dược & Kho",ref:"d-oper-pharmwh",layer:"oper"},
   {label:"Nhà thuốc bán lẻ (GPP)",ref:"d-oper-retail",layer:"oper",opt:true},
 ]},
 {id:"inpatient",layer:"clin",ic:"🛏️",title:"Điều trị nội trú / Phẫu thuật",roles:["Bác sĩ","Điều dưỡng"],children:[
   {label:"Nội trú (IPD)",ref:"d-clin-ipd",layer:"clin"},
   {label:"Phẫu thuật & Gây mê",ref:"d-clin-surgery",layer:"clin"},
   {label:"Ngân hàng máu & Truyền máu",ref:"d-clin-blood",layer:"clin"},
   {label:"Dinh dưỡng & Tiết chế",ref:"d-clin-nutrition",layer:"clin"},
   {label:"Kiểm soát nhiễm khuẩn",ref:"d-clin-infection",layer:"clin"},
   {label:"Phục hồi chức năng",ref:"d-clin-rehab",layer:"clin",opt:true},
 ]},
 {id:"emr",layer:"clin",ic:"✍️",title:"HSĐT & Ký số",roles:["Bác sĩ","Điều dưỡng"],children:[
   {label:"HSĐT & Ký số",ref:"d-clin-emr",layer:"clin"},
 ]},
 {id:"billing",layer:"fin",ic:"💰",title:"Viện phí & BHYT",roles:["Thu ngân","Giám định BHYT"],children:[
   {label:"Viện phí & Thanh toán",ref:"d-fin-billing",layer:"fin"},
   {label:"BHYT & Giám định",ref:"d-fin-insurance",layer:"fin"},
 ]},
 {id:"discharge",layer:"fin",ic:"🚪",title:"Xuất viện & Liên thông",roles:["Bác sĩ","Thư ký"],children:[
   {label:"Ra viện (thuộc Nội trú)",ref:"d-clin-ipd",layer:"clin",opt:true},
   {label:"Cổng QG & Liên thông",ref:"d-spec-national",layer:"spec"},
 ]},
 {id:"report",layer:"fin",ic:"📊",title:"Báo cáo & Quản trị",roles:["BGĐ / KHTH"],children:[
   {label:"Báo cáo & Dashboard",ref:"d-fin-reports",layer:"fin"},
   {label:"Chất lượng & Sự cố",ref:"d-fin-quality",layer:"fin"},
   {label:"Khảo sát hài lòng",ref:"d-fin-survey",layer:"fin"},
 ]},
 {id:"ops",layer:"oper",ic:"⚙️",title:"Hỗ trợ vận hành",roles:["Phòng VTTB","HCNS"],children:[
   {label:"Nhân sự & Lương",ref:"d-oper-hr",layer:"oper"},
   {label:"Trang thiết bị & Tài sản",ref:"d-oper-asset",layer:"oper"},
 ]},
 {id:"programs",layer:"spec",ic:"🌍",title:"Chương trình chuyên khoa & cộng đồng",roles:["YTDP","Chuyên khoa"],children:[
   {label:"Tiêm chủng",ref:"d-spec-immun",layer:"spec"},
   {label:"Khám sức khỏe & Gói khám",ref:"d-spec-checkup",layer:"spec"},
   {label:"Bệnh mãn tính & YTCC",ref:"d-spec-pubhealth",layer:"spec"},
   {label:"Chuyên khoa đặc thù (IVF/Sản/Pháp y)",ref:"d-spec-specialty",layer:"spec"},
   {label:"Cấp cứu thảm họa (MCI)",ref:"d-spec-mci",layer:"spec"},
   {label:"Môi trường · Chất thải · ATTP",ref:"d-spec-env",layer:"spec"},
   {label:"Đào tạo & NCKH",ref:"d-spec-training",layer:"spec"},
 ]},
];

/* (C) LUỒNG NGHIỆP VỤ THEO VAI TRÒ — mỗi bước trỏ tới 1 phân hệ có thật (click → drawer) */
const ROLEFLOWS = [
 {ic:"🩺",nm:"Bác sĩ",layer:"clin",d:"Khám · chỉ định · kê đơn · ký HSĐT",steps:[
   ["Nhận BN từ hàng đợi","d-clin-reception"],["Khám & ghi bệnh án","d-clin-opd"],["Chỉ định CLS","d-clin-cls"],
   ["Xem KQ XN/CĐHA","d-clin-lis"],["Kê đơn thuốc","d-clin-presc"],["Y lệnh điều trị nội trú","d-clin-ipd"],
   ["Ký số HSĐT","d-clin-emr"],["Duyệt xuất viện","d-clin-ipd"]]},
 {ic:"👩‍⚕️",nm:"Điều dưỡng",layer:"clin",d:"Thực hiện y lệnh · chăm sóc · bàn giao ca",steps:[
   ["Nhận ca trực","d-clin-ipd"],["Thực hiện y lệnh","d-clin-ipd"],["Phát thuốc","d-oper-pharmwh"],
   ["Ghi sinh hiệu","d-clin-ipd"],["Truyền dịch/máu","d-clin-blood"],["Suất ăn dinh dưỡng","d-clin-nutrition"],
   ["Bàn giao ca","d-clin-ipd"]]},
 {ic:"🔬",nm:"KTV Cận lâm sàng",layer:"clin",d:"Lấy mẫu/chụp · chạy máy · trả KQ",steps:[
   ["Nhận chỉ định","d-clin-cls"],["Lấy mẫu (XN)","d-clin-lis"],["Chụp CĐHA (DICOM)","d-clin-ris"],
   ["Chạy máy (HL7)","d-clin-lis"],["Trả kết quả","d-clin-ris"],["Nội kiểm QC","d-clin-lis"]]},
 {ic:"💊",nm:"Dược sĩ",layer:"oper",d:"Duyệt toa · cấp phát · kho · hạn dùng",steps:[
   ["Nhận toa","d-clin-presc"],["Duyệt dược","d-oper-pharmwh"],["Xuất/Phát thuốc","d-oper-pharmwh"],
   ["Cập nhật tồn kho","d-oper-pharmwh"],["Theo dõi hạn dùng","d-oper-pharmwh"],["Bán lẻ (GPP)","d-oper-retail"]]},
 {ic:"🧾",nm:"Thư ký y khoa",layer:"clin",d:"Nhập hồ sơ · lịch mổ · in giấy tờ",steps:[
   ["Tiếp nhận/nhập hồ sơ","d-clin-reception"],["Chuẩn bị bệnh án","d-clin-opd"],["Lên lịch mổ","d-clin-surgery"],
   ["In giấy tờ/biểu mẫu","d-clin-emr"],["Liên thông giấy tờ QG","d-spec-national"]]},
 {ic:"💰",nm:"Thu ngân",layer:"fin",d:"Tạm ứng · thu phí · HĐĐT · đối soát",steps:[
   ["Tạm thu/Tạm ứng","d-fin-billing"],["Thu viện phí","d-fin-billing"],["Xuất HĐĐT","d-fin-billing"],
   ["Hoàn tiền (nếu hủy)","d-fin-billing"],["Đối soát & Khóa bill","d-fin-billing"]]},
 {ic:"🛡️",nm:"Giám định BHYT",layer:"fin",d:"Xác thực thẻ · áp quyền lợi · quyết toán",steps:[
   ["Xác thực thẻ BHYT","d-fin-insurance"],["Áp quyền lợi","d-fin-insurance"],["Lập hồ sơ BHYT","d-fin-insurance"],
   ["Nộp XML cổng BHXH","d-fin-insurance"],["Giám định/Quyết toán","d-fin-insurance"]]},
 {ic:"🏥",nm:"Quản lý khoa/phòng",layer:"clin",d:"Phân giường · điều phối · công suất",steps:[
   ["Phân giường","d-clin-ipd"],["Điều phối phòng/giường","d-clin-ipd"],["Phân công trực","d-oper-hr"],
   ["Theo dõi công suất","d-fin-reports"]]},
 {ic:"📊",nm:"BGĐ / KHTH",layer:"fin",d:"Dashboard · thống kê · báo cáo · audit",steps:[
   ["Dashboard","d-fin-reports"],["Thống kê / KPI","d-fin-reports"],["Báo cáo BHYT (C79/C80)","d-fin-insurance"],
   ["Chất lượng & Sự cố","d-fin-quality"],["Kiểm tra Audit","d-found-system"]]},
];


/* ===== BỔ SUNG cho site nhiều trang (ref = id module ngắn) ===== */

/* (D) FLOWS — hành trình bệnh nhân (12 luồng chính, từ luong_nghiep_vu.md, ref→module có thật) */
const FLOWS = [
 {id:"opd",ic:"🩺",name:"Khám ngoại trú",layer:"clin",desc:"BN ngoại trú → tiếp nhận → khám → kê toa → thanh toán → nhận thuốc → về",
  steps:[["Tiếp đón","reception"],["Khám & bệnh án","opd"],["Chỉ định CLS","cls"],["XN/CĐHA","lis"],["Kê đơn","presc"],["Viện phí/BHYT","billing"],["Nhận thuốc","pharmwh"]],related:["followup","lab","billing"]},
 {id:"followup",ic:"🔁",name:"Tái khám & bệnh mãn tính",layer:"clin",desc:"BN tái khám → xác nhận lịch hẹn → khám → kê toa → thanh toán → về",
  steps:[["Lịch tái khám","reception"],["Khám","opd"],["Kê đơn","presc"],["Viện phí","billing"]],related:["opd","pubhealth"]},
 {id:"ed",ic:"🚑",name:"Cấp cứu",layer:"clin",desc:"BN cấp cứu → tiếp nhận → xử trí → CLS → theo dõi → nhập viện → nội trú → xuất viện",
  steps:[["Tiếp đón cấp cứu","reception"],["Khám/xử trí","opd"],["CLS","cls"],["Lưu theo dõi","ipd"],["Nhập viện","ipd"],["Viện phí","billing"]],related:["inpatient","surgery","blood"]},
 {id:"inpatient",ic:"🛏️",name:"Nội trú",layer:"clin",desc:"BN nội trú → nhập viện → tạm ứng → điều trị → quyết toán → xuất viện",
  steps:[["Nhập viện","ipd"],["Tạm ứng","billing"],["Điều trị/chăm sóc","ipd"],["HSĐT/Ký số","emr"],["Quyết toán","billing"],["Xuất viện","ipd"]],related:["surgery","blood","nutrition","infection"]},
 {id:"surgery",ic:"🔪",name:"Phẫu thuật & thủ thuật",layer:"clin",desc:"BN PT theo lịch → khám tiền mê → nhập viện → mổ → hậu phẫu → xuất viện",
  steps:[["Đề nghị mổ","surgery"],["Lịch mổ","surgery"],["Gây mê & mổ","surgery"],["Hậu phẫu","ipd"],["Viện phí","billing"]],related:["inpatient","blood","emr"]},
 {id:"lab",ic:"🧪",name:"Xét nghiệm (LIS)",layer:"clin",desc:"BN chỉ định XN → lấy mẫu → chạy máy → trả KQ → khám lại → về",
  steps:[["Chỉ định","cls"],["Lấy mẫu","lis"],["Chạy máy (HL7)","lis"],["Trả KQ","lis"],["Khám lại","opd"]],related:["cls","imaging","opd"]},
 {id:"imaging",ic:"🩻",name:"Chẩn đoán hình ảnh (RIS/PACS)",layer:"clin",desc:"BN chỉ định CĐHA → chụp → đọc KQ → duyệt → về",
  steps:[["Chỉ định","cls"],["Chụp (DICOM)","ris"],["Đọc & ký KQ","ris"],["Khám lại","opd"]],related:["cls","lab","emr"]},
 {id:"immun",ic:"💉",name:"Tiêm chủng",layer:"spec",desc:"BN tiêm vaccine → sàng lọc → tiêm → theo dõi phản ứng → về",
  steps:[["Tiếp đón","reception"],["Sàng lọc","opd"],["Tiêm (lô vaccine)","immun"],["Theo dõi","immun"]],related:["checkup","pubhealth"]},
 {id:"transfusion",ic:"🩸",name:"Truyền máu",layer:"clin",desc:"BN nhận máu → đối chiếu tương thích → xác nhận truyền → theo dõi",
  steps:[["Lĩnh máu","blood"],["Đối chiếu nhóm máu","blood"],["Truyền máu","blood"],["Theo dõi","ipd"]],related:["inpatient","surgery"]},
 {id:"checkup",ic:"📝",name:"Khám sức khỏe & gói khám",layer:"spec",desc:"BN KSK → thực hiện gói → tổng hợp KQ → in kết luận → về",
  steps:[["Hợp đồng/gói","checkup"],["Thực hiện DV","cls"],["Tổng hợp KQ","checkup"],["Viện phí","billing"]],related:["immun","opd"]},
 {id:"billing",ic:"💰",name:"Viện phí & BHYT",layer:"fin",desc:"BN → tổng hợp chi phí → thanh toán → xuất HĐĐT → quyết toán BHYT",
  steps:[["Tổng hợp chi phí","billing"],["Thanh toán/HĐĐT","billing"],["Áp BHYT","insurance"],["Nộp XML BHXH","insurance"]],related:["insurance","reports"]},
 {id:"discharge",ic:"🚪",name:"Xuất viện & kết thúc",layer:"fin",desc:"BN → kiểm tra điều kiện ra viện → trả giường → khóa hồ sơ → xuất viện",
  steps:[["Kiểm tra nợ/đơn/CLS","billing"],["Ra viện","ipd"],["Khóa HSĐT","emr"],["Liên thông QG","national"]],related:["inpatient","emr","national"]},
];

/* (E) RELATED_X — liên kết chéo giữa phân hệ (ngoài "cùng lớp"); app.js gộp thêm phân hệ cùng lớp */
const RELATED_X = {
 reception:["patient","opd","billing","portal"],
 opd:["cls","presc","emr","ipd","billing"],
 cls:["lis","ris","patho","tdcn","opd"],
 lis:["cls","ris","patho","infection"],
 ris:["cls","lis","emr"],
 presc:["pharmwh","opd","retail"],
 pharmwh:["presc","retail","asset"],
 ipd:["opd","surgery","blood","nutrition","infection","billing","emr"],
 surgery:["ipd","blood","emr","asset"],
 blood:["ipd","surgery","lis"],
 emr:["opd","ipd","national","reports"],
 billing:["insurance","reports","opd","ipd"],
 insurance:["billing","reports","national"],
 reports:["billing","insurance","quality"],
 portal:["reception","tele","national"],
 national:["emr","insurance","presc"],
 immun:["checkup","pubhealth"],
 pubhealth:["immun","checkup","specialty"],
};

/* (F) NOTES — ghi chú nghiệp vụ/lưu ý từng phân hệ (app.js có fallback theo lớp nếu trống) */
const NOTES = {
 opd:["MedicalRecord là hub trung tâm: PatientType (BHYT/Viện phí/DV/KSK), TreatmentType (Ngoại/Nội/Cấp cứu).","Bắt buộc kiểm tra dị ứng/chống chỉ định (Allergy/Contraindication) trước khi kê đơn."],
 cls:["ServiceRequest sinh từ MedicalRecord → phân về LIS/RIS/Pathology/TDCN theo loại dịch vụ.","LockedService để khóa dịch vụ đã chốt, tránh sửa sau thanh toán."],
 lis:["KQ nguy kịch (LabCriticalValueAlert) phải cảnh báo ngay — an toàn người bệnh.","Máy XN nối qua HL7 (LabWorklist → LabRawResult); QC bắt buộc trước khi trả KQ.","Vi sinh: nuôi cấy → định danh → kháng sinh đồ (AntibioticSensitivityResult)."],
 ris:["Auto-send DICOM (DicomAutoSendRule) tới PACS; đọc KQ → ký số (RadiologyReport).","Hỗ trợ hội chẩn ảnh + xuất HL7/CDA cho liên thông."],
 presc:["Đơn → duyệt dược (PharmacyApproval) → phát thuốc; kiểm tương tác thuốc (DrugInteraction)."],
 pharmwh:["Xuất theo hạn dùng; cảnh báo ExpiryAlert/LowStockAlert.","Mọi biến động ghi StockMovement để truy vết tồn kho."],
 ipd:["Vòng đời: Admission → BedAssignment → DailyProgress/NursingCare → Discharge.","Sinh hiệu (InpatientVitalSign), truyền dịch (InfusionRecord) ghi nhận thật, không stub."],
 surgery:["SurgeryRequest → SurgerySchedule → SurgeryRecord (+ kíp/vật tư/thuốc) + AnesthesiaRecord.","Vật tư/thuốc dùng trong mổ tính vào viện phí."],
 blood:["Đối chiếu nhóm máu/Rh của bệnh nhân trước truyền — an toàn truyền máu.","BloodDonor → BloodUnit → BloodRequest → BloodTransfusion."],
 emr:["Ký số qua USB token/TOTP hoặc sinh trắc WebAuthn (PatientSignature/BiometricCredential).","Finalize/khóa nội dung HSĐT dùng EmrFinalizedAt (TT46), KHÔNG dùng IsClosed (billing chiếm)."],
 billing:["Khóa viện phí dùng MedicalRecord.IsClosed (KHÔNG nhầm với khóa EMR).","Nhiều nguồn chi trả: BHYT + tiền mặt + bảo lãnh; tách/gộp bill; HĐĐT sau thanh toán."],
 insurance:["Giám định qua cổng BHXH (InsuranceXMLSubmission); đúng/trái/thông tuyến ảnh hưởng mức hưởng.","BhxhAudit*/Inspector* phục vụ thanh tra BHXH."],
 reports:["Tổng hợp số liệu vận hành; ReportAccessLog audit truy cập báo cáo."],
 org:["Phân quyền theo Role/Permission; mọi mutation phải có CreatedBy là user thật (≠ Guid.Empty)."],
 system:["AuditLog ghi mọi thay đổi (HSBA/viện phí) phục vụ truy vết & pháp lý."],
};

/* (G) CLUSTERS — tách cụm lớn thành sub-topic (điền ở Phase 3) */
const CLUSTERS = [];
