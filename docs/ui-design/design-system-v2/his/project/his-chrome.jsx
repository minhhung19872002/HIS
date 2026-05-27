// HIS Terminal — icon set (1.5px stroke, lucide-style)
// All icons are 16px by default, currentColor stroke.
const HIS_ICONS = (() => {
  const mk = (paths, fill = false) => ({ size = 16, ...rest } = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths}
    </svg>
  );

  return {
    // Navigation
    grid: mk(<>
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </>),
    reception: mk(<>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
      <path d="M19 8v-3M17.5 6.5h3"/>
    </>),
    stethoscope: mk(<>
      <path d="M4 3v5a4 4 0 0 0 8 0V3M8 13v3a4 4 0 0 0 8 0v-1"/>
      <circle cx="18" cy="10" r="2"/>
    </>),
    users: mk(<>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </>),
    folder: mk(<>
      <path d="M4 19a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v2"/>
      <path d="m2 13 1.2 6.4A2 2 0 0 0 5.2 21h13.6a2 2 0 0 0 2-1.6L22 13H2z"/>
    </>),
    flask: mk(<>
      <path d="M10 2v7.5L4.5 18A2 2 0 0 0 6 21h12a2 2 0 0 0 1.5-3L14 9.5V2"/>
      <path d="M9 2h6M7 14h10"/>
    </>),
    scan: mk(<>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
      <path d="M7 12h10"/>
    </>),
    pill: mk(<>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
      <path d="m8.5 8.5 7 7"/>
    </>),
    receipt: mk(<>
      <path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2Z"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </>),
    bed: mk(<>
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20"/>
      <circle cx="7" cy="12" r="2"/>
    </>),
    ambulance: mk(<>
      <path d="M10 17h4M2 17h1M21 17h1"/>
      <path d="M3 7h10v10H3zM13 10h5l3 4v3h-8"/>
      <circle cx="7" cy="17" r="2"/>
      <circle cx="17" cy="17" r="2"/>
      <path d="M8 10v3M6.5 11.5h3"/>
    </>),
    scalpel: mk(<>
      <path d="m14 4 6 6-9 9-4-1-1-4 8-10z"/>
      <path d="m11 8 5 5"/>
    </>),
    calendar: mk(<>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </>),
    chart: mk(<>
      <path d="M3 3v18h18"/>
      <path d="m7 14 4-4 3 3 5-6"/>
    </>),
    box: mk(<>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
    </>),
    settings: mk(<>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </>),
    // Misc
    search: mk(<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>),
    bell: mk(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>),
    plus: mk(<><path d="M12 5v14M5 12h14"/></>),
    check: mk(<><path d="m5 12 5 5 10-11"/></>),
    x: mk(<><path d="M18 6 6 18M6 6l12 12"/></>),
    chevronR: mk(<><path d="m9 18 6-6-6-6"/></>),
    chevronD: mk(<><path d="m6 9 6 6 6-6"/></>),
    arrowR: mk(<><path d="M5 12h14M13 5l7 7-7 7"/></>),
    filter: mk(<><path d="M22 3H2l8 9.5V21l4-2v-6.5z"/></>),
    download: mk(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></>),
    print: mk(<><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></>),
    alert: mk(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></>),
    warn: mk(<><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>),
    info: mk(<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>),
    heart: mk(<><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></>),
    activity: mk(<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>),
    droplet: mk(<><path d="M12 2.69 5.64 9.05a9 9 0 1 0 12.72 0z"/></>),
    microscope: mk(<>
      <path d="M6 18h8M3 22h18M14 22a7 7 0 1 0 0-14h-1"/>
      <path d="M9 14h2M8 6h4M12 2v6"/>
      <path d="M8 6v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6"/>
    </>),
    clipboard: mk(<>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M9 12h6M9 16h4"/>
    </>),
    shield: mk(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>),
    phone: mk(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>),
    eye: mk(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>),
    clock: mk(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>),
    refresh: mk(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/></>),
    more: mk(<><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/></>),
    menu: mk(<><path d="M3 6h18M3 12h18M3 18h18"/></>),
    pencil: mk(<><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></>),
    trash: mk(<><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>),
    logout: mk(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>),
    home: mk(<><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></>),
    external: mk(<><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>),
    lock: mk(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>),
    dna: mk(<>
      <path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M2 9c6.667 6 13.333 0 20 6"/>
      <path d="m17 6-3 3M10 15l-3 3M13 12l-2 2M16 9l-2 2M8 15l-2 2"/>
    </>),
    cloud: mk(<>
      <path d="M17.5 19a4.5 4.5 0 1 0-1.42-8.77A7 7 0 1 0 3 14.55 4 4 0 0 0 6.5 19h11z"/>
    </>),
    // Modality badges for RIS
    ct: mk(<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="5"/><path d="M12 7v10M7 12h10"/></>),
    xray: mk(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 6v12M9 9l6 6M15 9l-6 6"/></>),
  };
})();

window.HIS_ICONS = HIS_ICONS;

// Icon sugar: <Ico name="grid" size={18}/>
const Ico = ({ name, size = 16, ...rest }) => {
  const C = HIS_ICONS[name];
  if (!C) return <span style={{display:"inline-block",width:size,height:size}}/>;
  return C({ size, ...rest });
};
window.Ico = Ico;


// HIS Terminal — shared chrome (rail + topbar + ticker + status bar)
// Use: <HisShell route="dashboard" crumb={["Tổng quan"]}> ...content... </HisShell>
const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR, useCallback: useCB } = React;

// ============== ROUTES (87 pages, 11 groups) ==============
// Each leaf: { id, href, label, hot? }
// id is used for active-state detection; href is the .html filename we'll render.
const HIS_GROUPS = [
  {
    id: "overview",
    label: "Tổng quan",
    short: "TỔNG",
    icon: "grid",
    items: [
      { id: "dashboard",      href: "Dashboard.html",        label: "Tổng quan" },
      { id: "dashboard-3cap", href: "Dashboard3Cap v2.html",    label: "Dashboard 3 Cấp" },
      { id: "queue-display",  href: "QueueDisplay v2.html",     label: "Màn hình xếp hàng" },
    ],
  },
  {
    id: "clinical",
    label: "Lâm sàng",
    short: "LS",
    icon: "stethoscope",
    hot: 8,
    items: [
      { id: "reception",               href: "Reception v2.html",          label: "Tiếp đón" },
      { id: "opd",                     href: "OPD v2.html",                label: "Khám bệnh", hot: 8 },
      { id: "telemedicine",            href: "Telemedicine v2.html",       label: "Khám từ xa" },
      { id: "prescription",            href: "Prescription v2.html",       label: "Kê đơn" },
      { id: "ipd",                     href: "Ward v2.html",               label: "Nội trú" },
      { id: "er",                      href: "ER v2.html",                 label: "Cấp cứu", hot: 6 },
      { id: "or",                      href: "OR v2.html",                 label: "Phẫu thuật" },
      { id: "emr",                     href: "EMR v2.html",                label: "Hồ sơ BA (EMR)" },
      { id: "specialty-emr",           href: "SpecialtyEMR v2.html",          label: "BA chuyên khoa" },
      { id: "medical-record-archive",  href: "MedicalRecordArchive v2.html",  label: "Lưu trữ HSBA" },
      { id: "medical-record-planning", href: "MedicalRecordPlanning v2.html", label: "Kế hoạch TH" },
      { id: "follow-up",               href: "FollowUp v2.html",           label: "Tái khám" },
      { id: "booking-management",      href: "BookingManagement v2.html",  label: "Quản lý đặt lịch" },
      { id: "appointment-booking",     href: "AppointmentBooking v2.html", label: "Đặt lịch hẹn" },
      { id: "treatment-protocols",     href: "TreatmentProtocol v2.html",     label: "Phác đồ điều trị" },
      { id: "chronic-disease",         href: "ChronicDisease v2.html",        label: "Bệnh mạn tính" },
      { id: "tb-hiv",                  href: "TbHivManagement v2.html",       label: "Quản lý Lao/HIV" },
      { id: "consultation",            href: "Consultation v2.html",       label: "Hội chẩn" },
      { id: "doctor-portal",           href: "DoctorPortal v2.html",          label: "Cổng bác sĩ" },
    ],
  },
  {
    id: "paraclinical",
    label: "Cận lâm sàng",
    short: "CLS",
    icon: "flask",
    hot: 3,
    items: [
      { id: "lis",                href: "LIS v2.html",            label: "Xét nghiệm", hot: 3 },
      { id: "lab-qc",             href: "LabQC v2.html",             label: "QC Kiểm định" },
      { id: "microbiology",       href: "Microbiology v2.html",      label: "Vi sinh" },
      { id: "culture-collection", href: "CultureCollection v2.html", label: "Lưu chủng vi sinh" },
      { id: "screening",          href: "Screening v2.html",         label: "Sàng lọc sơ sinh" },
      { id: "sample-storage",     href: "SampleStorage v2.html",     label: "Lưu trữ mẫu" },
      { id: "sample-tracking",    href: "SampleTracking v2.html",    label: "Theo dõi mẫu" },
      { id: "reagent-management", href: "ReagentManagement v2.html", label: "Hoá chất XN" },
      { id: "lis-config",         href: "LISConfig v2.html",         label: "Cấu hình LIS" },
      { id: "ris",                href: "RIS v2.html",            label: "Chẩn đoán HA" },
      { id: "dicom-viewer",       href: "DicomViewer v2.html",       label: "DICOM Viewer" },
      { id: "pathology",          href: "Pathology v2.html",         label: "Giải phẫu bệnh" },
      { id: "ivf-lab",            href: "IvfLab v2.html",            label: "Phòng Lab IVF" },
      { id: "blood-bank",      href: "BloodBank v2.html",     label: "Ngân hàng máu" },
    ],
  },
  {
    id: "support",
    label: "Hỗ trợ điều trị",
    short: "HTĐT",
    icon: "pill",
    items: [
      { id: "pharmacy",          href: "Pharmacy v2.html",      label: "Nhà thuốc" },
      { id: "hospital-pharmacy", href: "HospitalPharmacy v2.html", label: "Nhà thuốc bệnh viện" },
      { id: "medical-supply",    href: "MedicalSupply v2.html",    label: "Vật tư y tế" },
      { id: "inventory",         href: "Inventory v2.html",     label: "Kho tổng" },
      { id: "nutrition",         href: "Nutrition v2.html",        label: "Dinh dưỡng" },
      { id: "rehabilitation",    href: "Rehabilitation v2.html",   label: "VLTL / PHCN" },
      { id: "traditional-medicine", href: "TraditionalMedicine v2.html", label: "Y học cổ truyền" },
    ],
  },
  {
    id: "finance",
    label: "Tài chính",
    short: "TC",
    icon: "receipt",
    hot: 3,
    items: [
      { id: "billing",     href: "Billing v2.html",  label: "Viện phí", hot: 3 },
      { id: "finance",     href: "Finance v2.html",     label: "Quản lý tài chính" },
      { id: "insurance",   href: "Insurance v2.html", label: "Giám định BHYT" },
      { id: "bhxh-audit",  href: "BhxhAudit v2.html",   label: "BHXH kiểm tra" },
      { id: "procurement", href: "Procurement v2.html", label: "Đề xuất - Dự trù" },
    ],
  },
  {
    id: "records",
    label: "Hồ sơ & Ký số",
    short: "HS",
    icon: "folder",
    items: [
      { id: "digital-signature", href: "DigitalSignature v2.html", label: "Chữ ký số" },
      { id: "central-signing",   href: "CentralSigning v2.html",   label: "Ký số tập trung" },
      { id: "signing-workflow",  href: "SigningWorkflow v2.html",  label: "Quy trình ký" },
      { id: "master-data",       href: "MasterData v2.html",       label: "Danh mục" },
    ],
  },
  {
    id: "management",
    label: "Quản trị & Vận hành",
    short: "QT",
    icon: "settings",
    items: [
      { id: "admin",             href: "Admin v2.html",             label: "Quản trị hệ thống" },
      { id: "hr",                href: "HR v2.html",                label: "Nhân sự" },
      { id: "schedule",          href: "Rota v2.html",           label: "Lịch trực" },
      { id: "quality",           href: "Quality v2.html",        label: "Chất lượng BV" },
      { id: "equipment",         href: "Equipment v2.html",         label: "Thiết bị y tế" },
      { id: "asset-management",  href: "AssetManagement v2.html",   label: "Tài sản - CCDC" },
      { id: "infection-control", href: "InfectionControl v2.html",  label: "Kiểm soát nhiễm khuẩn" },
      { id: "training-research", href: "TrainingResearch v2.html",  label: "Đào tạo - NCKH" },
      { id: "practice-license",  href: "PracticeLicense v2.html",   label: "Chứng chỉ hành nghề" },
      { id: "endpoint-security", href: "EndpointSecurity v2.html",  label: "An toàn thông tin" },
      { id: "reports",           href: "Reports v2.html",        label: "Báo cáo" },
    ],
  },
  {
    id: "integration",
    label: "Liên thông",
    short: "LT",
    icon: "cloud",
    items: [
      { id: "health-exchange",      href: "HealthExchange v2.html",     label: "Liên thông y tế HIE" },
      { id: "inter-hospital",       href: "InterHospitalSharing v2.html", label: "Chia sẻ liên viện" },
      { id: "emergency-disaster",   href: "EmergencyDisaster v2.html",  label: "Cấp cứu / thảm hoạ" },
      { id: "clinical-guidance",    href: "ClinicalGuidance v2.html",   label: "Chỉ đạo tuyến" },
      { id: "sms-management",       href: "SmsManagement v2.html",      label: "SMS Gateway" },
    ],
  },
  {
    id: "public-health",
    label: "Y tế công cộng",
    short: "YTCC",
    icon: "shield",
    items: [
      { id: "health-checkup",       href: "HealthCheckup v2.html",      label: "Khám sức khoẻ" },
      { id: "immunization",         href: "Immunization v2.html",       label: "Tiêm chủng" },
      { id: "epidemiology",         href: "Epidemiology v2.html",       label: "Giám sát dịch tễ" },
      { id: "school-health",        href: "SchoolHealth v2.html",       label: "Y tế trường học" },
      { id: "occupational-health",  href: "OccupationalHealth v2.html", label: "SK nghề nghiệp" },
      { id: "methadone-treatment",  href: "MethadoneTreatment v2.html", label: "Điều trị Methadone" },
      { id: "food-safety",          href: "FoodSafety v2.html",         label: "ATVSTP" },
      { id: "community-health",     href: "CommunityHealth v2.html",    label: "SK cộng đồng" },
      { id: "hiv-management",       href: "HivManagement v2.html",      label: "Quản lý HIV" },
      { id: "health-education",     href: "HealthEducation v2.html",    label: "Truyền thông GDSK" },
      { id: "environmental-health", href: "EnvironmentalHealth v2.html", label: "Môi trường y tế" },
      { id: "population-health",    href: "PopulationHealth v2.html",   label: "Dân số KHHGĐ" },
      { id: "reproductive-health",  href: "ReproductiveHealth v2.html", label: "SK sinh sản" },
      { id: "mental-health",        href: "MentalHealth v2.html",       label: "SK tâm thần" },
      { id: "trauma-registry",      href: "TraumaRegistry v2.html",     label: "Sổ chấn thương" },
      { id: "medical-forensics",    href: "MedicalForensics v2.html",   label: "Giám định y khoa" },
    ],
  },
  {
    id: "portals",
    label: "Cổng & Dịch vụ",
    short: "CỔNG",
    icon: "users",
    items: [
      { id: "patient-portal",       href: "PatientPortal v2.html",      label: "Cổng bệnh nhân" },
      { id: "satisfaction-survey",  href: "SatisfactionSurvey v2.html", label: "Khảo sát hài lòng" },
      { id: "help",                 href: "Help v2.html",               label: "Trợ giúp" },
      { id: "patients",             href: "Patients v2.html",        label: "Hồ sơ BN" },
    ],
  },
];

// Flatten for lookups
const HIS_ROUTES = HIS_GROUPS.flatMap(g => g.items.map(it => ({ ...it, groupId: g.id, icon: g.icon })));
window.HIS_ROUTES = HIS_ROUTES;
window.HIS_GROUPS = HIS_GROUPS;

// Helper: find group containing a route id
const groupOf = (routeId) => HIS_GROUPS.find(g => g.items.some(it => it.id === routeId));

// ============== RAIL (group-level) ==============
const Rail = ({ active, onHoverGroup, onLeaveGroup, pinnedGroup }) => {
  const activeGroupId = groupOf(active)?.id;
  return (
    <aside className="his-rail">
      <a href="index.html" className="his-rail-mark" title="HIS Terminal">HIS</a>
      {HIS_GROUPS.map(g => {
        const isActive = g.id === activeGroupId;
        const isPinned = g.id === pinnedGroup;
        return (
          <button
            key={g.id}
            className={"his-rail-item " + (isActive ? "active " : "") + (isPinned ? "pinned" : "")}
            title={g.label}
            onMouseEnter={() => onHoverGroup(g.id)}
            onClick={() => onHoverGroup(g.id, true)}
          >
            <Ico name={g.icon} size={18}/>
            {g.hot && <span className="hot">{g.hot}</span>}
            <span className="lbl">{g.short}</span>
          </button>
        );
      })}
      <div className="his-rail-spacer"/>
    </aside>
  );
};

// ============== FLYOUT (group submenu) ==============
const Flyout = ({ groupId, active, onClose, pinned, onTogglePin }) => {
  const g = HIS_GROUPS.find(x => x.id === groupId);
  if (!g) return null;
  return (
    <div
      className={"his-flyout " + (pinned ? "pinned" : "")}
      onMouseLeave={() => { if (!pinned) onClose(); }}
    >
      <div className="his-flyout-head">
        <div className="his-flyout-title">
          <Ico name={g.icon} size={14}/>
          <span>{g.label}</span>
          <span className="count">{g.items.length}</span>
        </div>
        <div className="his-flyout-actions">
          <button
            className={"his-flyout-pin " + (pinned ? "on" : "")}
            onClick={onTogglePin}
            title={pinned ? "Bỏ ghim" : "Ghim menu"}
          >
            {pinned ? "◉" : "◯"}
          </button>
          {!pinned && <button className="his-flyout-close" onClick={onClose} title="Đóng">×</button>}
        </div>
      </div>
      <div className="his-flyout-body">
        {g.items.map(it => (
          <a
            key={it.id}
            href={it.href}
            className={"his-flyout-item " + (it.id === active ? "active" : "")}
          >
            <span className="lbl">{it.label}</span>
            {it.hot && <span className="hot">{it.hot}</span>}
          </a>
        ))}
      </div>
    </div>
  );
};

// ============== TOPBAR ==============
const useClock = () => {
  const [now, setNow] = useS(new Date());
  useE(() => {
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);
  return now;
};

const Topbar = ({ crumb = [], onCmdK, patient, onClearPatient }) => {
  const now = useClock();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const me = HIS.currentUser;

  return (
    <header className="his-topbar">
      <div className="his-tb-crumb">
        <span className="hosp"><Ico name="shield" size={14}/> BVĐK HƯNG YÊN</span>
        {crumb.map((c, i) => (
          <React.Fragment key={i}>
            <span className="slash">/</span>
            <span className={i === crumb.length - 1 ? "here" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="his-cmd" onClick={onCmdK}>
        <span className="prompt">❯</span>
        <span className="hint">Tìm BN, XN, HĐ, thuốc, phòng… (mã, tên, SĐT)</span>
        <kbd>⌘</kbd><kbd>K</kbd>
      </div>
      <div className="his-tb-right">
        <div className="his-chip-shift"><span className="dot"/>CA SÁNG · {hh}:{mm}</div>
        <button className="his-tb-btn" title="Giao ca" onClick={() => window.__shellPopups && window.__shellPopups.openHandoff()}><Ico name="refresh" size={15}/></button>
        <button className="his-tb-btn" title="Trợ giúp" onClick={() => window.__shellPopups && window.__shellPopups.openHelp()}><Ico name="info" size={15}/></button>
        <button className="his-tb-btn" title="Thông báo" onClick={() => window.__shellPopups && window.__shellPopups.openNotifications()}>
          <Ico name="bell" size={15}/>
          <span className="dot-alert"/>
        </button>
        <div className="his-clock">
          <div>{hh}:{mm}</div>
          <div className="d">18/10 · T7</div>
        </div>
        <div className="his-user" title="Tài khoản" onClick={() => window.__shellPopups && window.__shellPopups.openUser()} style={{cursor:"pointer"}}>
          <div className="avatar">{me.avatar}</div>
          <div className="who">
            <span className="n">{me.name}</span>
            <span className="r">{me.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

// ============== TICKER ==============
const Ticker = ({ patient, onClearPatient }) => (
  <div className="his-ticker">
    <div className="his-ticker-head"><span className="dot"/>LIVE · HIS.HY</div>
    {patient && (
      <div className="his-patient-pill" title="Bệnh nhân đang chọn">
        <span className="tk">BN</span>
        <span className="nm">{patient.name}</span>
        <span className="id">{patient.id} · {patient.age}T · {patient.gender === "M" ? "Nam" : "Nữ"}</span>
        <span className="x" onClick={onClearPatient}>×</span>
      </div>
    )}
    <div className="his-ticker-scroll">
      {[...HIS.ticker, ...HIS.ticker].map((t, i) => (
        <span key={i} className={"his-ticker-item " + (t.cls || "")}>
          <span>{t.label}</span>
          <b>{t.val}{t.unit && <span style={{color:"#64748b",fontWeight:400}}> {t.unit}</span>}</b>
        </span>
      ))}
    </div>
  </div>
);

// ============== STATUS BAR ==============
const StatusBar = ({ active }) => {
  const here = HIS_ROUTES.find(r => r.id === active);
  return (
    <footer className="his-status">
      <span className="seg ok"><span className="dot ok" style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:"#4ade80"}}/><b>HIS 4.2.1</b></span>
      <span className="sep"/>
      <span className="seg">MODULE: <b>{(here?.label || "—").toUpperCase()}</b></span>
      <span className="sep"/>
      <span className="seg ok">BHYT: <b>OK</b></span>
      <span className="sep"/>
      <span className="seg ok">HL7: <b>2.5</b></span>
      <span className="sep"/>
      <span className="seg ok">PACS: <b>CONNECT</b></span>
      <span className="sep"/>
      <span className="seg warn">ĐỒNG BỘ BYT: <b>15p TRƯỚC</b></span>
      <span className="spacer"/>
      <span className="seg"><kbd>F1</kbd> Trợ giúp</span>
      <span className="seg"><kbd>⌘</kbd><kbd>K</kbd> Lệnh</span>
      <span className="seg"><kbd>F2</kbd> Lưu</span>
      <span className="seg"><kbd>Esc</kbd> Hủy</span>
    </footer>
  );
};

// ============== CMD-K PALETTE ==============
const CmdK = ({ open, onClose }) => {
  const [q, setQ] = useS("");
  const inputRef = useR(null);
  useE(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  useE(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;

  const matches = HIS_ROUTES.filter(r => !q || r.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  const patientMatches = q.length >= 2
    ? HIS.patients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase())).slice(0, 4)
    : [];

  return (
    <div className="his-cmdk-backdrop" onClick={onClose}>
      <div className="his-cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="his-cmdk-in">
          <span className="prompt">❯</span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm module, bệnh nhân, hành động…"/>
          <kbd>ESC</kbd>
        </div>
        <div className="his-cmdk-body">
          {patientMatches.length > 0 && <>
            <div className="his-cmdk-sec">Bệnh nhân</div>
            {patientMatches.map(p => (
              <a key={p.id} href={`EMR.html?pid=${p.id}`} className="his-cmdk-row">
                <span className="ico"><Ico name="users" size={15}/></span>
                <span className="lbl">{p.name}</span>
                <span className="sub">{p.id} · {p.age}T</span>
              </a>
            ))}
          </>}
          <div className="his-cmdk-sec">Mô-đun ({HIS_ROUTES.length} trang)</div>
          {matches.map(r => (
            <a key={r.id} href={r.href} className="his-cmdk-row">
              <span className="ico"><Ico name={r.icon} size={15}/></span>
              <span className="lbl">{r.label}</span>
              <span className="sub">{r.href}</span>
            </a>
          ))}
        </div>
        <div className="his-cmdk-ft">
          <span>↑↓ chọn</span>
          <span>↵ mở</span>
          <span>ESC đóng</span>
          <span style={{marginLeft:"auto"}}>HIS · {HIS_ROUTES.length} trang</span>
        </div>
      </div>
    </div>
  );
};

// ============== SHELL ==============
const HisShell = ({ route, crumb = [], children }) => {
  const [cmdKOpen, setCmdKOpen] = useS(false);
  const [patient, setPatient] = useS(null);
  const [flyoutGroup, setFlyoutGroup] = useS(null);
  const [pinnedGroup, setPinnedGroup] = useS(() => {
    // Pin no longer persists across pages — keeps the flyout from eating
    // 240px of horizontal space on every load.
    try { localStorage.removeItem("his.pinnedGroup"); } catch {}
    return null;
  });
  const hoverTimer = useR(null);

  useE(() => {
    const stored = localStorage.getItem("his.patient");
    if (stored) {
      const p = HIS.patientById(stored);
      if (p) setPatient(p);
    }
    const params = new URLSearchParams(location.search);
    const pid = params.get("pid");
    if (pid) {
      const p = HIS.patientById(pid);
      if (p) { setPatient(p); localStorage.setItem("his.patient", pid); }
    }
  }, []);

  useE(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdKOpen(v => !v);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const clearPatient = () => { setPatient(null); localStorage.removeItem("his.patient"); };

  const handleHoverGroup = (gid, isClick = false) => {
    clearTimeout(hoverTimer.current);
    if (isClick) {
      // Click toggles pin
      if (pinnedGroup === gid) {
        setPinnedGroup(null);
        setFlyoutGroup(null);
        try { localStorage.removeItem("his.pinnedGroup"); } catch {}
      } else {
        setPinnedGroup(gid);
        setFlyoutGroup(gid);
        try { localStorage.setItem("his.pinnedGroup", gid); } catch {}
      }
    } else {
      setFlyoutGroup(gid);
    }
  };

  const handleLeaveFlyout = () => {
    hoverTimer.current = setTimeout(() => {
      if (!pinnedGroup) setFlyoutGroup(null);
    }, 120);
  };

  const togglePin = () => {
    if (pinnedGroup === flyoutGroup) {
      setPinnedGroup(null);
      try { localStorage.removeItem("his.pinnedGroup"); } catch {}
    } else {
      setPinnedGroup(flyoutGroup);
      try { localStorage.setItem("his.pinnedGroup", flyoutGroup); } catch {}
    }
  };

  // Show flyout either on hover OR when pinned
  const activeFlyout = flyoutGroup || pinnedGroup;

  return (
    <div className={"his-app " + (pinnedGroup ? "has-pinned" : "")}>
      <Rail
        active={route}
        onHoverGroup={handleHoverGroup}
        onLeaveGroup={handleLeaveFlyout}
        pinnedGroup={pinnedGroup}
      />
      {activeFlyout && (
        <Flyout
          groupId={activeFlyout}
          active={route}
          onClose={handleLeaveFlyout}
          pinned={pinnedGroup === activeFlyout}
          onTogglePin={togglePin}
        />
      )}
      <Topbar crumb={crumb} onCmdK={() => setCmdKOpen(true)} patient={patient} onClearPatient={clearPatient}/>
      <Ticker patient={patient} onClearPatient={clearPatient}/>
      <main className="his-main">{children}</main>
      <StatusBar active={route}/>
      <CmdK open={cmdKOpen} onClose={() => setCmdKOpen(false)}/>
    </div>
  );
};

window.HisShell = HisShell;

// ============== SHARED SHELL POPUPS (bell · help · handoff · user) ==============
window.__shellPopups = {
  openNotifications: () => {
    const items = [
      { t: "crit", dt: "vừa xong", msg: "BN-00201 · Troponin I = 0.82 ng/mL (×20 ref)" },
      { t: "warn", dt: "2 phút", msg: "OR-3 chuẩn bị sẵn sàng cho Cắt ruột thừa nội soi" },
      { t: "info", dt: "5 phút", msg: "Kết quả huyết học BN-00159 đã có" },
      { t: "warn", dt: "8 phút", msg: "KHO DƯỢC · Omeprazol 20mg dưới ngưỡng" },
      { t: "info", dt: "12 phút", msg: "Họp giao ban 14:30 · phòng 201" },
      { t: "ok",   dt: "1 giờ", msg: "Backup DB hoàn tất · 4.2 GB" },
    ];
    HUI.drawer((cx) => (
      <HUI.Drawer title="Thông báo" sub={`${items.length} chưa đọc`} width={420} onClose={cx}
        footer={<HUI.Btn variant="primary" onClick={() => { HUI.toast("Đã đánh dấu tất cả là đã đọc", {tone:"ok"}); cx(); }}>Đánh dấu đã đọc</HUI.Btn>}>
        <div style={{padding:"4px 0"}}>
          {items.map((a,i) => (
            <div key={i} className={"alert-row " + a.t}>
              <div className="alert-dt mono">{a.dt}</div>
              <div className="alert-bd"><div className="alert-msg">{a.msg}</div></div>
            </div>
          ))}
        </div>
      </HUI.Drawer>
    ));
  },

  openHelp: () => {
    HUI.open((cx) => (
      <HUI.Modal title="Phím tắt & trợ giúp" size="md" onClose={cx}
        footer={<HUI.Btn variant="primary" onClick={cx}>Đã hiểu</HUI.Btn>}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,fontSize:12}}>
          <div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"#64748b",letterSpacing:"0.06em",marginBottom:6}}>ĐIỀU HƯỚNG</div>
            {[["⌘K","Tìm kiếm tổng"],["Alt+1..9","Chuyển khoa"],["Esc","Đóng popup"],["/","Focus tìm kiếm"]].map(([k,v]) => (
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f1f5f9"}}><kbd style={{fontFamily:"var(--font-mono)",fontSize:11,background:"#f1f5f9",padding:"1px 6px",borderRadius:3}}>{k}</kbd><span>{v}</span></div>
            ))}
          </div>
          <div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"#64748b",letterSpacing:"0.06em",marginBottom:6}}>THAO TÁC</div>
            {[["Ctrl+S","Lưu"],["Ctrl+Enter","Ký & duyệt"],["Ctrl+P","In"],["Ctrl+N","Tạo mới"]].map(([k,v]) => (
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f1f5f9"}}><kbd style={{fontFamily:"var(--font-mono)",fontSize:11,background:"#f1f5f9",padding:"1px 6px",borderRadius:3}}>{k}</kbd><span>{v}</span></div>
            ))}
          </div>
        </div>
        <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #e4e9f0",fontSize:11,color:"#64748b"}}>
          <b style={{color:"#0f172a"}}>HIS Terminal v3</b> · © 2026 BVĐK Hưng Yên · Hotline hỗ trợ <b className="mono" style={{color:"#2563eb"}}>0221-3.848.xxx</b>
        </div>
      </HUI.Modal>
    ));
  },

  openHandoff: () => {
    HUI.open((cx) => (
      <HUI.Modal title="Giao ca · Sáng → Chiều" sub="14:00 · 22/10/2026" size="md" onClose={cx}
        footer={<>
          <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
          <HUI.Btn variant="primary" icon="check" onClick={() => { HUI.toast("Đã xác nhận giao ca · ký điện tử", {tone:"ok"}); cx(); }}>Ký & xác nhận</HUI.Btn>
        </>}>
        <div style={{marginBottom:12,padding:"10px 12px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,fontSize:12,color:"#a16207"}}>
          <b>3 BN nặng cần bàn giao</b> · BN-00201 (STEMI), BN-00067 (sốc NK), BN-00088 (suy hô hấp)
        </div>
        <HUI.Field label="Ghi chú giao ca" required>
          <HUI.Textarea rows={4} defaultValue="BN-00201 đã dùng Heparin 5000 UI · theo dõi APTT 4h. BN-00067 duy trì Noradrenalin 0.1 mcg/kg/ph. BN-00088 SpO₂ 94-96% dưới NIV."/>
        </HUI.Field>
        <HUI.Field label="Người nhận ca">
          <HUI.Select options={["BS. Nguyễn Thị Lan","BS. Phạm Thị Mai","BS. Trần Văn Hải"]}/>
        </HUI.Field>
      </HUI.Modal>
    ));
  },

  openUser: () => {
    HUI.open((cx) => (
      <HUI.Modal title="Tài khoản" size="sm" onClose={cx}
        footer={<>
          <HUI.Btn variant="ghost" onClick={() => { HUI.toast("Đã đăng xuất (mô phỏng)", {tone:"info"}); cx(); }}>Đăng xuất</HUI.Btn>
          <HUI.Btn variant="primary" onClick={cx}>Đóng</HUI.Btn>
        </>}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:44,height:44,borderRadius:6,background:"#2563eb",color:"#fff",display:"grid",placeItems:"center",fontSize:16,fontWeight:700}}>TH</div>
          <div>
            <div style={{fontSize:14,fontWeight:600}}>BS. Trần Thị Hoa</div>
            <div style={{fontSize:11,color:"#64748b",fontFamily:"var(--font-mono)"}}>BS.CKI · Nội Tim mạch · EMP-00142</div>
          </div>
        </div>
        <div style={{display:"grid",gap:2,fontSize:13}}>
          {[
            ["Đổi mật khẩu","lock"],
            ["Chứng chỉ & chữ ký số","shield"],
            ["Lịch trực cá nhân","calendar"],
            ["Cài đặt thông báo","bell"],
          ].map(([t,ic]) => (
            <div key={t} onClick={() => { HUI.toast(`Mở: ${t}`, {tone:"info"}); cx(); }} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:4,cursor:"pointer",color:"#334155"}} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <Ico name={ic} size={14}/><span>{t}</span>
            </div>
          ))}
        </div>
      </HUI.Modal>
    ));
  },
};




// ============ HUI INJECTED ============
// HIS Terminal — shared interactive UI (modals, drawers, confirms, toasts)
// Exposes: HUI.open(content), HUI.drawer(content), HUI.confirm(...), HUI.toast(...)
// Inside modals: <HUI.Modal title size footer onClose>..</HUI.Modal>, <HUI.Drawer>..</HUI.Drawer>
// Form primitives: <HUI.Field>, <HUI.Row>, <HUI.Btn>, <HUI.Input>, <HUI.Select>, <HUI.Textarea>
// Renders to #hui-root (auto-inserted). All state-managed globally via window.__HUI_STATE.

(() => {
  const { useState: _uS, useEffect: _uE, useMemo: _uM, useRef: _uR } = React;

  // ========= store =========
  const state = {
    stack: [],          // [{id, kind:'modal'|'drawer', node, onClose}]
    toasts: [],
    listeners: new Set(),
  };
  window.__HUI_STATE = state;

  const emit = () => state.listeners.forEach(fn => fn());
  const sub = (fn) => { state.listeners.add(fn); return () => state.listeners.delete(fn); };

  let nextId = 1;
  const push = (kind, node, onClose) => {
    const id = "h" + (nextId++);
    state.stack.push({ id, kind, node, onClose });
    emit();
    return id;
  };
  const close = (id) => {
    const it = state.stack.find(x => x.id === id);
    if (!it) return;
    state.stack = state.stack.filter(x => x.id !== id);
    if (it.onClose) it.onClose();
    emit();
  };
  const closeTop = () => {
    if (state.stack.length) close(state.stack[state.stack.length - 1].id);
  };
  const closeAll = () => { state.stack = []; emit(); };

  // ========= primitives =========
  const Btn = ({ variant = "ghost", size = "md", icon, children, ...rest }) => {
    const cls = `hui-btn hui-btn-${variant} hui-btn-${size}`;
    return (
      <button className={cls} {...rest}>
        {icon && <Ico name={icon} size={size === "sm" ? 12 : 14}/>}
        {children}
      </button>
    );
  };

  const Field = ({ label, hint, required, error, children, span = 1 }) => (
    <label className={`hui-field hui-span-${span}`}>
      {label && <span className="hui-lbl">{label}{required && <i className="req">*</i>}</span>}
      {children}
      {hint && !error && <span className="hui-hint">{hint}</span>}
      {error && <span className="hui-err">{error}</span>}
    </label>
  );

  const Row = ({ cols = 2, children, gap = 10 }) => (
    <div className="hui-row" style={{gridTemplateColumns:`repeat(${cols}, 1fr)`, gap}}>{children}</div>
  );

  const Input = React.forwardRef(({ icon, suffix, ...p }, ref) => (
    <div className="hui-inp-wrap">
      {icon && <span className="pre"><Ico name={icon} size={13}/></span>}
      <input ref={ref} className="hui-inp" {...p}/>
      {suffix && <span className="suf">{suffix}</span>}
    </div>
  ));

  const Select = ({ options = [], ...p }) => (
    <div className="hui-inp-wrap">
      <select className="hui-inp hui-sel" {...p}>
        {options.map((o, i) => typeof o === "string"
          ? <option key={i} value={o}>{o}</option>
          : <option key={i} value={o.value}>{o.label}</option>)}
      </select>
      <span className="suf"><Ico name="chev-d" size={12}/></span>
    </div>
  );

  const Textarea = (p) => <textarea className="hui-inp hui-ta" {...p}/>;

  const Chk = ({ label, checked, onChange, hint }) => (
    <label className="hui-chk">
      <input type="checkbox" checked={!!checked} onChange={e => onChange && onChange(e.target.checked)}/>
      <span className="box"><Ico name="check" size={10}/></span>
      <span className="t">{label}{hint && <i className="hui-hint" style={{marginLeft:6}}>{hint}</i>}</span>
    </label>
  );

  const Radio = ({ options = [], value, onChange, name }) => (
    <div className="hui-radio-g">
      {options.map(o => {
        const v = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        const sub = typeof o === "object" ? o.sub : null;
        return (
          <label key={v} className={`hui-radio ${value === v ? "on" : ""}`}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange && onChange(v)}/>
            <span className="dot"/>
            <span className="t">
              <b>{lbl}</b>
              {sub && <i>{sub}</i>}
            </span>
          </label>
        );
      })}
    </div>
  );

  // ========= Modal shell (used inside open()) =========
  const Modal = ({ title, sub, size = "md", footer, tone, children, onClose, dense, scroll = true }) => (
    <div className={`hui-modal hui-size-${size} ${tone ? "hui-tone-" + tone : ""} ${dense ? "dense" : ""}`}>
      <header className="hui-modal-h">
        <div className="t">
          <div className="tt">{title}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <button className="hui-x" onClick={onClose} title="Đóng (Esc)">
          <Ico name="x" size={14}/>
        </button>
      </header>
      <div className={"hui-modal-b" + (scroll ? "" : " no-scroll")}>{children}</div>
      {footer && <footer className="hui-modal-f">{footer}</footer>}
    </div>
  );

  // ========= Drawer shell =========
  const Drawer = ({ title, sub, width = 560, footer, children, onClose, tabs, activeTab, onTab }) => (
    <div className="hui-drawer" style={{width}}>
      <header className="hui-drawer-h">
        <div className="t">
          <div className="tt">{title}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <button className="hui-x" onClick={onClose}><Ico name="x" size={14}/></button>
      </header>
      {tabs && (
        <nav className="hui-drawer-tabs">
          {tabs.map(t => (
            <button key={t.id} className={activeTab === t.id ? "on" : ""} onClick={() => onTab && onTab(t.id)}>
              {t.label}{t.count != null && <span className="n">{t.count}</span>}
            </button>
          ))}
        </nav>
      )}
      <div className="hui-drawer-b">{children}</div>
      {footer && <footer className="hui-drawer-f">{footer}</footer>}
    </div>
  );

  // ========= open() / drawer() / confirm() / toast() =========
  // Wrapper FC so hooks inside renderFn are legal
  const RenderHost = ({ rf, cx }) => rf(cx);

  const open = (renderFn) => {
    const id = push("modal", null, null);
    const item = state.stack.find(x => x.id === id);
    const cx = () => close(id);
    item.node = <RenderHost rf={renderFn} cx={cx}/>;
    emit();
    return cx;
  };

  const drawer = (renderFn) => {
    const id = push("drawer", null, null);
    const item = state.stack.find(x => x.id === id);
    const cx = () => close(id);
    item.node = <RenderHost rf={renderFn} cx={cx}/>;
    emit();
    return cx;
  };

  const confirm = ({ title, body, danger, confirmText = "Xác nhận", cancelText = "Hủy", onConfirm }) => {
    open((cx) => (
      <Modal title={title} size="sm" tone={danger ? "danger" : null} onClose={cx}
        footer={<>
          <Btn variant="ghost" onClick={cx}>{cancelText}</Btn>
          <Btn variant={danger ? "danger" : "primary"} onClick={() => { onConfirm && onConfirm(); cx(); }}>{confirmText}</Btn>
        </>}>
        <div className="hui-confirm-body">{body}</div>
      </Modal>
    ));
  };

  const toast = (msg, { tone = "ok", duration = 2600 } = {}) => {
    const id = "t" + (nextId++);
    state.toasts.push({ id, msg, tone });
    emit();
    setTimeout(() => {
      state.toasts = state.toasts.filter(t => t.id !== id);
      emit();
    }, duration);
  };

  // ========= root renderer =========
  const Root = () => {
    const [, force] = _uS(0);
    _uE(() => sub(() => force(n => n + 1)), []);
    _uE(() => {
      const h = (e) => {
        if (e.key === "Escape" && state.stack.length) {
          e.preventDefault();
          closeTop();
        }
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, []);

    const modals = state.stack.filter(x => x.kind === "modal");
    const drawers = state.stack.filter(x => x.kind === "drawer");
    const hasOverlay = state.stack.length > 0;

    return (
      <>
        {hasOverlay && <div className="hui-backdrop" onClick={closeTop}/>}
        {drawers.map(d => (
          <div key={d.id} className="hui-drawer-wrap"
               onClick={e => { if (e.target === e.currentTarget) close(d.id); }}>
            {d.node}
          </div>
        ))}
        {modals.map(m => (
          <div key={m.id} className="hui-modal-wrap"
               onClick={e => { if (e.target === e.currentTarget) close(m.id); }}>
            {m.node}
          </div>
        ))}
        <div className="hui-toasts">
          {state.toasts.map(t => (
            <div key={t.id} className={`hui-toast hui-tone-${t.tone}`}>
              <Ico name={t.tone === "err" ? "alert" : t.tone === "warn" ? "alert" : "check"} size={13}/>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  // mount root
  const mount = () => {
    let el = document.getElementById("hui-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "hui-root";
      document.body.appendChild(el);
    }
    ReactDOM.createRoot(el).render(<Root/>);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // ========= export =========
  window.HUI = {
    open, drawer, confirm, toast, closeAll, closeTop,
    Modal, Drawer, Btn, Field, Row, Input, Select, Textarea, Chk, Radio,
  };
})();

