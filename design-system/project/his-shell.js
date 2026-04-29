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
      { id: "dashboard-3cap", href: "Dashboard3Cap.html",    label: "Dashboard 3 Cấp" },
      { id: "queue-display",  href: "QueueDisplay.html",     label: "Màn hình xếp hàng" },
    ],
  },
  {
    id: "clinical",
    label: "Lâm sàng",
    short: "LS",
    icon: "stethoscope",
    hot: 8,
    items: [
      { id: "reception",               href: "Reception.html",             label: "Tiếp đón" },
      { id: "opd",                     href: "OPD.html",                   label: "Khám bệnh", hot: 8 },
      { id: "telemedicine",            href: "Telemedicine.html",          label: "Khám từ xa" },
      { id: "prescription",            href: "Prescription.html",          label: "Kê đơn" },
      { id: "ipd",                     href: "Ward.html",                  label: "Nội trú" },
      { id: "er",                      href: "ER.html",                    label: "Cấp cứu", hot: 6 },
      { id: "or",                      href: "OR.html",                    label: "Phẫu thuật" },
      { id: "emr",                     href: "EMR.html",                   label: "Hồ sơ BA (EMR)" },
      { id: "specialty-emr",           href: "SpecialtyEMR.html",          label: "BA chuyên khoa" },
      { id: "medical-record-archive",  href: "MedicalRecordArchive.html",  label: "Lưu trữ HSBA" },
      { id: "medical-record-planning", href: "MedicalRecordPlanning.html", label: "Kế hoạch TH" },
      { id: "follow-up",               href: "FollowUp.html",              label: "Tái khám" },
      { id: "booking-management",      href: "BookingManagement.html",     label: "Quản lý đặt lịch" },
      { id: "appointment-booking",     href: "AppointmentBooking.html",    label: "Đặt lịch hẹn" },
      { id: "treatment-protocols",     href: "TreatmentProtocol.html",     label: "Phác đồ điều trị" },
      { id: "chronic-disease",         href: "ChronicDisease.html",        label: "Bệnh mạn tính" },
      { id: "tb-hiv",                  href: "TbHivManagement.html",       label: "Quản lý Lao/HIV" },
      { id: "consultation",            href: "Consultation.html",          label: "Hội chẩn" },
      { id: "doctor-portal",           href: "DoctorPortal.html",          label: "Cổng bác sĩ" },
    ],
  },
  {
    id: "paraclinical",
    label: "Cận lâm sàng",
    short: "CLS",
    icon: "flask",
    hot: 3,
    items: [
      { id: "lis",                href: "LIS.html",               label: "Xét nghiệm", hot: 3 },
      { id: "lab-qc",             href: "LabQC.html",             label: "QC Kiểm định" },
      { id: "microbiology",       href: "Microbiology.html",      label: "Vi sinh" },
      { id: "culture-collection", href: "CultureCollection.html", label: "Lưu chủng vi sinh" },
      { id: "screening",          href: "Screening.html",         label: "Sàng lọc sơ sinh" },
      { id: "sample-storage",     href: "SampleStorage.html",     label: "Lưu trữ mẫu" },
      { id: "sample-tracking",    href: "SampleTracking.html",    label: "Theo dõi mẫu" },
      { id: "reagent-management", href: "ReagentManagement.html", label: "Hoá chất XN" },
      { id: "lis-config",         href: "LISConfig.html",         label: "Cấu hình LIS" },
      { id: "ris",                href: "RIS.html",               label: "Chẩn đoán HA" },
      { id: "dicom-viewer",       href: "DicomViewer.html",       label: "DICOM Viewer" },
      { id: "pathology",          href: "Pathology.html",         label: "Giải phẫu bệnh" },
      { id: "ivf-lab",            href: "IvfLab.html",            label: "Phòng Lab IVF" },
      { id: "blood-bank",         href: "BloodBank.html",         label: "Ngân hàng máu" },
    ],
  },
  {
    id: "support",
    label: "Hỗ trợ điều trị",
    short: "HTĐT",
    icon: "pill",
    items: [
      { id: "pharmacy",          href: "Pharmacy.html",         label: "Nhà thuốc" },
      { id: "hospital-pharmacy", href: "HospitalPharmacy.html", label: "Nhà thuốc bệnh viện" },
      { id: "medical-supply",    href: "MedicalSupply.html",    label: "Vật tư y tế" },
      { id: "inventory",         href: "Inventory.html",        label: "Kho tổng" },
      { id: "nutrition",         href: "Nutrition.html",        label: "Dinh dưỡng" },
      { id: "rehabilitation",    href: "Rehabilitation.html",   label: "VLTL / PHCN" },
      { id: "traditional-medicine", href: "TraditionalMedicine.html", label: "Y học cổ truyền" },
    ],
  },
  {
    id: "finance",
    label: "Tài chính",
    short: "TC",
    icon: "receipt",
    hot: 3,
    items: [
      { id: "billing",     href: "Billing.html",     label: "Viện phí", hot: 3 },
      { id: "finance",     href: "Finance.html",     label: "Quản lý tài chính" },
      { id: "insurance",   href: "Insurance.html",   label: "Giám định BHYT" },
      { id: "bhxh-audit",  href: "BhxhAudit.html",   label: "BHXH kiểm tra" },
      { id: "procurement", href: "Procurement.html", label: "Đề xuất - Dự trù" },
    ],
  },
  {
    id: "records",
    label: "Hồ sơ & Ký số",
    short: "HS",
    icon: "folder",
    items: [
      { id: "digital-signature", href: "DigitalSignature.html", label: "Chữ ký số" },
      { id: "central-signing",   href: "CentralSigning.html",   label: "Ký số tập trung" },
      { id: "signing-workflow",  href: "SigningWorkflow.html",  label: "Quy trình ký" },
      { id: "master-data",       href: "MasterData.html",       label: "Danh mục" },
    ],
  },
  {
    id: "management",
    label: "Quản trị & Vận hành",
    short: "QT",
    icon: "settings",
    items: [
      { id: "admin",             href: "Admin.html",             label: "Quản trị hệ thống" },
      { id: "hr",                href: "HR.html",                label: "Nhân sự" },
      { id: "schedule",          href: "Rota.html",              label: "Lịch trực" },
      { id: "quality",           href: "Quality.html",           label: "Chất lượng BV" },
      { id: "equipment",         href: "Equipment.html",         label: "Thiết bị y tế" },
      { id: "asset-management",  href: "AssetManagement.html",   label: "Tài sản - CCDC" },
      { id: "infection-control", href: "InfectionControl.html",  label: "Kiểm soát nhiễm khuẩn" },
      { id: "training-research", href: "TrainingResearch.html",  label: "Đào tạo - NCKH" },
      { id: "practice-license",  href: "PracticeLicense.html",   label: "Chứng chỉ hành nghề" },
      { id: "endpoint-security", href: "EndpointSecurity.html",  label: "An toàn thông tin" },
      { id: "reports",           href: "Reports.html",           label: "Báo cáo" },
    ],
  },
  {
    id: "integration",
    label: "Liên thông",
    short: "LT",
    icon: "cloud",
    items: [
      { id: "health-exchange",      href: "HealthExchange.html",     label: "Liên thông y tế HIE" },
      { id: "inter-hospital",       href: "InterHospitalSharing.html", label: "Chia sẻ liên viện" },
      { id: "emergency-disaster",   href: "EmergencyDisaster.html",  label: "Cấp cứu / thảm hoạ" },
      { id: "clinical-guidance",    href: "ClinicalGuidance.html",   label: "Chỉ đạo tuyến" },
      { id: "sms-management",       href: "SmsManagement.html",      label: "SMS Gateway" },
    ],
  },
  {
    id: "public-health",
    label: "Y tế công cộng",
    short: "YTCC",
    icon: "shield",
    items: [
      { id: "health-checkup",       href: "HealthCheckup.html",      label: "Khám sức khoẻ" },
      { id: "immunization",         href: "Immunization.html",       label: "Tiêm chủng" },
      { id: "epidemiology",         href: "Epidemiology.html",       label: "Giám sát dịch tễ" },
      { id: "school-health",        href: "SchoolHealth.html",       label: "Y tế trường học" },
      { id: "occupational-health",  href: "OccupationalHealth.html", label: "SK nghề nghiệp" },
      { id: "methadone-treatment",  href: "MethadoneTreatment.html", label: "Điều trị Methadone" },
      { id: "food-safety",          href: "FoodSafety.html",         label: "ATVSTP" },
      { id: "community-health",     href: "CommunityHealth.html",    label: "SK cộng đồng" },
      { id: "hiv-management",       href: "HivManagement.html",      label: "Quản lý HIV" },
      { id: "health-education",     href: "HealthEducation.html",    label: "Truyền thông GDSK" },
      { id: "environmental-health", href: "EnvironmentalHealth.html", label: "Môi trường y tế" },
      { id: "population-health",    href: "PopulationHealth.html",   label: "Dân số KHHGĐ" },
      { id: "reproductive-health",  href: "ReproductiveHealth.html", label: "SK sinh sản" },
      { id: "mental-health",        href: "MentalHealth.html",       label: "SK tâm thần" },
      { id: "trauma-registry",      href: "TraumaRegistry.html",     label: "Sổ chấn thương" },
      { id: "medical-forensics",    href: "MedicalForensics.html",   label: "Giám định y khoa" },
    ],
  },
  {
    id: "portals",
    label: "Cổng & Dịch vụ",
    short: "CỔNG",
    icon: "users",
    items: [
      { id: "patient-portal",       href: "PatientPortal.html",      label: "Cổng bệnh nhân" },
      { id: "satisfaction-survey",  href: "SatisfactionSurvey.html", label: "Khảo sát hài lòng" },
      { id: "help",                 href: "Help.html",               label: "Trợ giúp" },
      { id: "patients",             href: "Patients.html",           label: "Hồ sơ BN (cũ)" },
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
