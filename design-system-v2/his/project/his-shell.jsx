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
      { id: "reception",               href: "Reception v2.html",             label: "Tiếp đón" },
      { id: "opd",                     href: "OPD v2.html",                   label: "Khám bệnh", hot: 8 },
      { id: "telemedicine",            href: "Telemedicine v2.html",          label: "Khám từ xa" },
      { id: "prescription",            href: "Prescription v2.html",          label: "Kê đơn" },
      { id: "ipd",                     href: "Ward v2.html",                  label: "Nội trú" },
      { id: "er",                      href: "ER v2.html",                    label: "Cấp cứu", hot: 6 },
      { id: "or",                      href: "OR v2.html",                    label: "Phẫu thuật" },
      { id: "emr",                     href: "EMR v2.html",                   label: "Hồ sơ BA (EMR)" },
      { id: "specialty-emr",           href: "SpecialtyEMR v2.html",          label: "BA chuyên khoa" },
      { id: "medical-record-archive",  href: "MedicalRecordArchive v2.html",  label: "Lưu trữ HSBA" },
      { id: "medical-record-planning", href: "MedicalRecordPlanning v2.html", label: "Kế hoạch TH" },
      { id: "follow-up",               href: "FollowUp v2.html",              label: "Tái khám" },
      { id: "booking-management",      href: "BookingManagement v2.html",     label: "Quản lý đặt lịch" },
      { id: "appointment-booking",     href: "AppointmentBooking v2.html",    label: "Đặt lịch hẹn" },
      { id: "treatment-protocols",     href: "TreatmentProtocol v2.html",     label: "Phác đồ điều trị" },
      { id: "chronic-disease",         href: "ChronicDisease v2.html",        label: "Bệnh mạn tính" },
      { id: "tb-hiv",                  href: "TbHivManagement v2.html",       label: "Quản lý Lao/HIV" },
      { id: "consultation",            href: "Consultation v2.html",          label: "Hội chẩn" },
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
      { id: "lis",                href: "LIS v2.html",               label: "Xét nghiệm", hot: 3 },
      { id: "lab-qc",             href: "LabQC v2.html",             label: "QC Kiểm định" },
      { id: "microbiology",       href: "Microbiology v2.html",      label: "Vi sinh" },
      { id: "culture-collection", href: "CultureCollection v2.html", label: "Lưu chủng vi sinh" },
      { id: "screening",          href: "Screening v2.html",         label: "Sàng lọc sơ sinh" },
      { id: "sample-storage",     href: "SampleStorage v2.html",     label: "Lưu trữ mẫu" },
      { id: "sample-tracking",    href: "SampleTracking v2.html",    label: "Theo dõi mẫu" },
      { id: "reagent-management", href: "ReagentManagement v2.html", label: "Hoá chất XN" },
      { id: "lis-config",         href: "LISConfig v2.html",         label: "Cấu hình LIS" },
      { id: "ris",                href: "RIS v2.html",               label: "Chẩn đoán HA" },
      { id: "dicom-viewer",       href: "DicomViewer v2.html",       label: "DICOM Viewer" },
      { id: "pathology",          href: "Pathology v2.html",         label: "Giải phẫu bệnh" },
      { id: "ivf-lab",            href: "IvfLab v2.html",            label: "Phòng Lab IVF" },
      { id: "blood-bank",         href: "BloodBank v2.html",         label: "Ngân hàng máu" },
    ],
  },
  {
    id: "support",
    label: "Hỗ trợ điều trị",
    short: "HTĐT",
    icon: "pill",
    items: [
      { id: "pharmacy",          href: "Pharmacy v2.html",         label: "Nhà thuốc" },
      { id: "hospital-pharmacy", href: "HospitalPharmacy v2.html", label: "Nhà thuốc bệnh viện" },
      { id: "medical-supply",    href: "MedicalSupply v2.html",    label: "Vật tư y tế" },
      { id: "inventory",         href: "Inventory v2.html",        label: "Kho tổng" },
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
      { id: "billing",     href: "Billing v2.html",     label: "Viện phí", hot: 3 },
      { id: "finance",     href: "Finance v2.html",     label: "Quản lý tài chính" },
      { id: "insurance",   href: "Insurance v2.html",   label: "Giám định BHYT" },
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
      { id: "schedule",          href: "Rota v2.html",              label: "Lịch trực" },
      { id: "quality",           href: "Quality v2.html",           label: "Chất lượng BV" },
      { id: "equipment",         href: "Equipment v2.html",         label: "Thiết bị y tế" },
      { id: "asset-management",  href: "AssetManagement v2.html",   label: "Tài sản - CCDC" },
      { id: "infection-control", href: "InfectionControl v2.html",  label: "Kiểm soát nhiễm khuẩn" },
      { id: "training-research", href: "TrainingResearch v2.html",  label: "Đào tạo - NCKH" },
      { id: "practice-license",  href: "PracticeLicense v2.html",   label: "Chứng chỉ hành nghề" },
      { id: "endpoint-security", href: "EndpointSecurity v2.html",  label: "An toàn thông tin" },
      { id: "reports",           href: "Reports v2.html",           label: "Báo cáo" },
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
      { id: "patients",             href: "Patients v2.html",           label: "Hồ sơ BN (cũ)" },
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
        <button className="his-tb-btn" title="Giao ca"><Ico name="refresh" size={15}/></button>
        <button className="his-tb-btn" title="Trợ giúp"><Ico name="info" size={15}/></button>
        <button className="his-tb-btn" title="Thông báo">
          <Ico name="bell" size={15}/>
          <span className="dot-alert"/>
        </button>
        <div className="his-clock">
          <div>{hh}:{mm}</div>
          <div className="d">18/10 · T7</div>
        </div>
        <div className="his-user" title="Tài khoản">
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
