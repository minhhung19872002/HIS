// =====================================================================
// HIS Terminal · Module: NGÂN HÀNG MÁU (BloodBank v2)
// Hiến máu - Sàng lọc - Chế phẩm - Dự trữ - Xuất máu
// =====================================================================

const BB_BLOODS = [
  { v: "O+",  l: "O+",  pct: 42.1 },
  { v: "A+",  l: "A+",  pct: 27.4 },
  { v: "B+",  l: "B+",  pct: 19.5 },
  { v: "AB+", l: "AB+", pct: 5.8 },
  { v: "O-",  l: "O-",  pct: 2.6 },
  { v: "A-",  l: "A-",  pct: 1.8 },
  { v: "B-",  l: "B-",  pct: 0.5 },
  { v: "AB-", l: "AB-", pct: 0.3 },
];

const BB_PRODUCTS = [
  { v: "WB",   l: "Máu toàn phần",    short: "WB",  shelf: 35,  ic: "drop", desc: "350ml/450ml CPDA-1" },
  { v: "PRBC", l: "Hồng cầu lắng",    short: "PRBC", shelf: 42, ic: "drop", desc: "250ml SAGM, Hct 60-70%" },
  { v: "FFP",  l: "Huyết tương tươi", short: "FFP", shelf: 365, ic: "drop", desc: "200-250ml, đông lạnh -30°C" },
  { v: "PLT",  l: "Tiểu cầu đậm đặc", short: "PLT", shelf: 5,   ic: "drop", desc: "≥5.5×10¹⁰ tiểu cầu" },
  { v: "CRYO", l: "Cryoprecipitate",  short: "CRYO", shelf: 365, ic: "drop", desc: "10-20ml giàu fibrinogen" },
];

const BB_DONOR_STATUS = [
  { v: "screening",  l: "Sàng lọc",   tone: "info" },
  { v: "donated",    l: "Đã hiến",    tone: "ok" },
  { v: "deferred",   l: "Hoãn",       tone: "warn" },
  { v: "rejected",   l: "Loại",       tone: "crit" },
];

const BB_UNIT_STATUS = [
  { v: "quarantine", l: "Cách ly",    tone: "warn" },
  { v: "available",  l: "Khả dụng",   tone: "ok" },
  { v: "reserved",   l: "Đặt trước",  tone: "info" },
  { v: "issued",     l: "Đã xuất",    tone: "info" },
  { v: "expired",    l: "Hết hạn",    tone: "crit" },
  { v: "destroyed",  l: "Tiêu huỷ",   tone: "crit" },
];

const BB_REQ_STATUS = [
  { v: "pending",   l: "Chờ duyệt",  tone: "warn" },
  { v: "approved",  l: "Đã duyệt",   tone: "info" },
  { v: "issued",    l: "Đã cấp",     tone: "ok" },
  { v: "rejected",  l: "Từ chối",    tone: "crit" },
  { v: "cancel",    l: "Đã huỷ",     tone: "info" },
];

const BB_TEST_RESULT = [
  { v: "neg",  l: "Âm tính", tone: "ok" },
  { v: "pos",  l: "Dương tính", tone: "crit" },
  { v: "pending", l: "Chờ KQ", tone: "warn" },
  { v: "indet",l: "Nghi ngờ", tone: "warn" },
];

const BB_DEFER_REASON = [
  "Hb thấp (<125 g/L)",
  "Huyết áp cao",
  "Huyết áp thấp",
  "Cân nặng <45kg",
  "Đang dùng kháng sinh",
  "Phẫu thuật <6 tháng",
  "Có thai / cho bú",
  "Đến từ vùng có dịch",
  "Tiền sử bệnh mạn tính",
  "Mới hiến máu <90 ngày",
];

const BB_DEPTS = [
  "Khoa Cấp cứu", "Khoa Phẫu thuật", "Khoa Hồi sức tích cực",
  "Khoa Nội tim mạch", "Khoa Sản", "Khoa Nhi",
  "Khoa Ung bướu", "Khoa Chấn thương",
];

const BB_INDICATIONS = [
  "Mất máu cấp do chấn thương",
  "Phẫu thuật lớn dự kiến",
  "Thiếu máu mạn (Hb<7)",
  "DIC - Đông máu rải rác",
  "Xuất huyết tiêu hoá",
  "Băng huyết sau sinh",
  "Suy gan giai đoạn cuối",
  "Truyền tiểu cầu (PLT<10)",
  "Bệnh máu ác tính",
];

// Seed donors
const seedDonors = () => {
  const r = seedRand(1234);
  const list = [];
  for (let i = 0; i < 90; i++) {
    const status = i < 60 ? "donated" : i < 78 ? "screening" : i < 86 ? "deferred" : "rejected";
    const dayOff = -Math.floor(r() * 60);
    const blood = BB_BLOODS[Math.floor(r() * BB_BLOODS.length)].v;
    const isFirstTime = r() > 0.7;
    const totalDonated = isFirstTime ? 0 : 1 + Math.floor(r() * 12);
    list.push({
      id: `HM-${String(2026000 + i).padStart(6, "0")}`,
      name: rndName(i),
      age: 18 + Math.floor(r() * 45),
      gender: r() > 0.6 ? "Nam" : "Nữ",
      cccd: `0${String(Math.floor(r()*999999999)).padStart(9,"0")}`,
      phone: rndPhone(),
      bloodType: blood,
      address: rndPick(["P. 5, Q. 3, TP.HCM", "P. Hà Đông, Hà Nội", "P. Vĩnh Phước, Nha Trang", "TT. Bến Lức, Long An"]),
      occupation: rndPick(["Sinh viên", "Công nhân", "Nhân viên VP", "Giáo viên", "Quân nhân", "Bác sĩ", "Tự do"]),
      isFirstTime,
      totalDonated,
      lastDonation: isFirstTime ? null : daysIv(-Math.floor(r() * 365 - 90)),
      donatedAt: status === "donated" ? daysIv(dayOff) : null,
      checkInAt: status !== "donated" || r() > 0.3 ? daysIv(dayOff) : null,
      campaign: rndPick(["Hiến máu nhân đạo Quận", "Tuần lễ hồng", "Cá nhân", "Doanh nghiệp ABC"]),
      status,
      // vital signs
      vitals: {
        bp: `${110+Math.floor(r()*30)}/${70+Math.floor(r()*15)}`,
        pulse: 65 + Math.floor(r() * 25),
        weight: 50 + Math.floor(r() * 30),
        hb: status === "deferred" && r() > 0.5 ? 110 + Math.floor(r() * 14) : 130 + Math.floor(r() * 30),
        temp: (36.3 + r() * 0.6).toFixed(1),
      },
      deferReason: status === "deferred" ? rndPick(BB_DEFER_REASON) : null,
      rejectReason: status === "rejected" ? "Không đáp ứng tiêu chuẩn sức khoẻ" : null,
      volume: status === "donated" ? rndPick([350, 350, 450, 450, 450]) : null,
      bagId: status === "donated" ? `BAG-${String(50000 + i).padStart(7, "0")}` : null,
    });
  }
  return list.sort((a, b) => (b.donatedAt || b.checkInAt || 0) - (a.donatedAt || a.checkInAt || 0));
};

// Seed blood units (chế phẩm)
const seedUnits = (donors) => {
  const r = seedRand(5555);
  const list = [];
  let id = 70000;
  donors.filter(d => d.status === "donated").forEach(d => {
    // each donor donation usually generates 2-3 products
    const prods = ["PRBC", "FFP", r() > 0.5 ? "PLT" : "CRYO"];
    prods.forEach(p => {
      const prod = BB_PRODUCTS.find(x => x.v === p);
      const collectedAt = d.donatedAt;
      const expDays = prod.shelf;
      const exp = new Date(collectedAt); exp.setDate(exp.getDate() + expDays);
      const status = exp < todayIv ? "expired" : id < 70015 ? "quarantine" : id < 70065 ? "available" : id < 70075 ? "reserved" : id < 70085 ? "issued" : "available";
      list.push({
        id: `BU-${String(id++).padStart(7, "0")}`,
        donorId: d.id,
        donorName: d.name,
        bagId: d.bagId,
        bloodType: d.bloodType,
        product: p,
        volume: p === "PRBC" ? 250 : p === "FFP" ? 220 : p === "PLT" ? 50 : 20,
        collectedAt, exp, status,
        location: rndPick(["Tủ A1", "Tủ A2", "Tủ B1", "Tủ B2 (-30°C)", "Tủ PLT (22°C)", "Tủ Cryo (-30°C)"]),
        // screening tests
        tests: {
          hiv: status === "quarantine" ? "pending" : r() > 0.005 ? "neg" : "pos",
          hbv: status === "quarantine" ? "pending" : r() > 0.008 ? "neg" : "pos",
          hcv: status === "quarantine" ? "pending" : r() > 0.005 ? "neg" : "pos",
          syph: status === "quarantine" ? "pending" : r() > 0.003 ? "neg" : "pos",
          alt: status === "quarantine" ? "pending" : r() > 0.05 ? "neg" : "indet",
        },
      });
    });
  });
  return list;
};

// Seed requests (yêu cầu xuất máu)
const seedRequests = (units) => {
  const r = seedRand(8888);
  const list = [];
  for (let i = 0; i < 40; i++) {
    const status = i < 4 ? "pending" : i < 9 ? "approved" : i < 32 ? "issued" : i < 36 ? "rejected" : "cancel";
    const dayOff = -Math.floor(r() * 30);
    const product = BB_PRODUCTS[Math.floor(r() * BB_PRODUCTS.length)].v;
    const blood = BB_BLOODS[Math.floor(r() * BB_BLOODS.length)].v;
    const qty = 1 + Math.floor(r() * 4);
    const dept = BB_DEPTS[Math.floor(r() * BB_DEPTS.length)];
    const issuedUnits = status === "issued"
      ? units.filter(u => u.product === product && u.bloodType === blood && u.status !== "expired").slice(0, qty).map(u => u.id)
      : [];
    const urgent = i < 10 || r() > 0.7;
    const created = daysIv(dayOff);
    list.push({
      code: `XM.${String(2026000 + i).padStart(6, "0")}`,
      patient: {
        pid: rndPid(),
        name: rndName(i + 30),
        age: 30 + Math.floor(r() * 50),
        gender: r() > 0.5 ? "Nam" : "Nữ",
        bloodType: blood,
      },
      dept, urgent,
      indication: BB_INDICATIONS[Math.floor(r() * BB_INDICATIONS.length)],
      product, qty,
      bloodType: blood,
      doctor: `BS. ${rndName(i + 60)}`,
      createdAt: created,
      status,
      approvedBy: status === "approved" || status === "issued" ? "BS. Linh (NHM)" : null,
      approvedAt: status === "approved" || status === "issued" ? daysIv(dayOff) : null,
      issuedUnits,
      issuedAt: status === "issued" ? daysIv(dayOff) : null,
      rejectReason: status === "rejected" ? "Không đủ chỉ định lâm sàng" : null,
      crossmatch: status === "issued" ? "Hoà hợp" : status === "approved" ? "Đang thực hiện" : null,
      audit: [
        { t: created.getTime(), action: "Tạo phiếu yêu cầu", by: `BS. ${rndName(i+60)}`, tone: "info" },
        ...(status !== "pending" && status !== "cancel" ? [{ t: created.getTime() + 1800000, action: status === "rejected" ? "Từ chối phiếu" : "Duyệt phiếu", by: "BS. Linh (NHM)", tone: status === "rejected" ? "crit" : "ok" }] : []),
        ...(status === "issued" ? [{ t: created.getTime() + 3600000, action: `Cấp ${issuedUnits.length} đơn vị máu`, by: "DS. Hoa (NHM)", tone: "ok" }] : []),
      ],
    });
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
};

// ============ MAIN ============
function BloodBankV2() {
  const [donors, setDonors] = uS(seedDonors);
  const [units, setUnits] = uS(() => seedUnits(donors));
  const [requests, setRequests] = uS(() => seedRequests(units));
  const [tab, setTab] = uS("inventory");
  const [stab, setStab] = uS("all");
  const [bloodFilter, setBloodFilter] = uS("");
  const [productFilter, setProductFilter] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 14;

  // KPI
  const kpi = uM(() => {
    const byBlood = {};
    BB_BLOODS.forEach(b => byBlood[b.v] = units.filter(u => u.bloodType === b.v && u.status === "available").length);
    const totalAvailable = units.filter(u => u.status === "available").length;
    const inQuarantine = units.filter(u => u.status === "quarantine").length;
    const expiringSoon = units.filter(u => u.status === "available" && (u.exp - todayIv) / 86400000 < 7).length;
    const expired = units.filter(u => u.status === "expired").length;
    const pendingReq = requests.filter(r => r.status === "pending").length;
    const urgentReq = requests.filter(r => r.urgent && (r.status === "pending" || r.status === "approved")).length;
    const todayDonors = donors.filter(d => d.donatedAt && Math.abs((d.donatedAt - todayIv)/86400000) < 1).length;
    return { byBlood, totalAvailable, inQuarantine, expiringSoon, expired, pendingReq, urgentReq, todayDonors };
  }, [donors, units, requests]);

  // ── filtered data per tab ──
  const filteredDonors = uM(() => {
    let res = donors;
    if (stab !== "all") res = res.filter(d => d.status === stab);
    if (bloodFilter) res = res.filter(d => d.bloodType === bloodFilter);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(d => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.cccd.includes(q) || d.phone.includes(q));
    }
    return res;
  }, [donors, stab, bloodFilter, search]);

  const filteredUnits = uM(() => {
    let res = units;
    if (stab !== "all") res = res.filter(u => u.status === stab);
    if (bloodFilter) res = res.filter(u => u.bloodType === bloodFilter);
    if (productFilter) res = res.filter(u => u.product === productFilter);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(u => u.id.toLowerCase().includes(q) || u.donorName.toLowerCase().includes(q) || (u.bagId || "").toLowerCase().includes(q));
    }
    return res;
  }, [units, stab, bloodFilter, productFilter, search]);

  const filteredReqs = uM(() => {
    let res = requests;
    if (stab !== "all") res = res.filter(r => r.status === stab);
    if (bloodFilter) res = res.filter(r => r.bloodType === bloodFilter);
    if (productFilter) res = res.filter(r => r.product === productFilter);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(r => r.code.toLowerCase().includes(q) || r.patient.name.toLowerCase().includes(q) || r.patient.pid.toLowerCase().includes(q));
    }
    return res;
  }, [requests, stab, bloodFilter, productFilter, search]);

  uE(() => { setPage(0); setStab("all"); }, [tab]);
  uE(() => { setPage(0); }, [stab, bloodFilter, productFilter, search]);

  const isDonors = tab === "donors";
  const isUnits = tab === "inventory";
  const isReqs = tab === "requests";

  const list = isDonors ? filteredDonors : isUnits ? filteredUnits : filteredReqs;
  const totalPages = Math.max(1, Math.ceil(list.length / PER));
  const paged = list.slice(page*PER, (page+1)*PER);

  const counts = (() => {
    if (isDonors) { const c = { all: donors.length }; BB_DONOR_STATUS.forEach(s => c[s.v] = donors.filter(d => d.status === s.v).length); return c; }
    if (isUnits) { const c = { all: units.length }; BB_UNIT_STATUS.forEach(s => c[s.v] = units.filter(u => u.status === s.v).length); return c; }
    const c = { all: requests.length }; BB_REQ_STATUS.forEach(s => c[s.v] = requests.filter(r => r.status === s.v).length); return c;
  })();

  const statusTabs = isDonors ? BB_DONOR_STATUS : isUnits ? BB_UNIT_STATUS : BB_REQ_STATUS;

  // ── ACTIONS ──
  const releaseUnit = (uid) => {
    setUnits(prev => prev.map(u => u.id === uid ? {
      ...u, status: "available",
      tests: { ...u.tests, hiv: "neg", hbv: "neg", hcv: "neg", syph: "neg", alt: "neg" },
    } : u));
    tk("Đã thả đơn vị " + uid + " khỏi cách ly");
  };

  const approveReq = (code) => {
    setRequests(prev => prev.map(r => r.code === code ? {
      ...r, status: "approved", approvedBy: "BS. Linh (NHM)", approvedAt: new Date(),
      crossmatch: "Đang thực hiện",
      audit: [...r.audit, { t: Date.now(), action: "Duyệt phiếu yêu cầu", by: "BS. Linh (NHM)", tone: "ok" }],
    } : r));
    tk("Đã duyệt phiếu " + code);
  };
  const rejectReq = (code, reason) => {
    setRequests(prev => prev.map(r => r.code === code ? {
      ...r, status: "rejected", rejectReason: reason,
      audit: [...r.audit, { t: Date.now(), action: "Từ chối: " + reason, by: "BS. Linh (NHM)", tone: "crit" }],
    } : r));
    tw("Đã từ chối phiếu " + code);
  };
  const issueReq = (req, unitIds) => {
    setRequests(prev => prev.map(r => r.code === req.code ? {
      ...r, status: "issued", issuedAt: new Date(), issuedUnits: unitIds, crossmatch: "Hoà hợp",
      audit: [...r.audit, { t: Date.now(), action: `Cấp ${unitIds.length} đơn vị máu`, by: "DS. Hoa (NHM)", tone: "ok" }],
    } : r));
    setUnits(prev => prev.map(u => unitIds.includes(u.id) ? { ...u, status: "issued" } : u));
    tk(`Đã cấp ${unitIds.length} đơn vị · Phiếu ${req.code}`);
  };

  const recordDonation = (donor) => {
    setDonors(prev => prev.map(d => d.id === donor.id ? {
      ...d, status: "donated", donatedAt: new Date(),
      volume: 450, bagId: `BAG-${String(60000 + Math.floor(Math.random()*1000)).padStart(7,"0")}`,
    } : d));
    tk("Đã ghi nhận hiến máu thành công · " + donor.name);
  };
  const deferDonor = (donor, reason) => {
    setDonors(prev => prev.map(d => d.id === donor.id ? { ...d, status: "deferred", deferReason: reason } : d));
    tw("Đã hoãn hiến máu · " + donor.name);
  };

  const openNewDonor = () => HUI.open(cx => <NewDonorModal cx={cx} onSave={(d) => {
    setDonors(prev => [d, ...prev]); cx(); tk("Đã đăng ký người hiến máu " + d.name);
  }}/>);
  const openDonor = (d) => HUI.drawer(cx => <DonorDrawer d={d} cx={cx}
    onDonate={() => { recordDonation(d); cx(); }}
    onDefer={(r) => { deferDonor(d, r); cx(); }}/>);
  const openUnit = (u) => HUI.drawer(cx => <UnitDrawer u={u} cx={cx} onRelease={() => { releaseUnit(u.id); cx(); }} donors={donors}/>);
  const openReq = (r) => HUI.drawer(cx => <RequestDrawer req={r} cx={cx}
    onApprove={() => { approveReq(r.code); cx(); }}
    onReject={(reason) => { rejectReq(r.code, reason); cx(); }}
    onIssue={() => { cx(); openIssueModal(r); }}
    units={units}/>);
  const openIssueModal = (req) => HUI.open(cx => <IssueModal cx={cx} req={req} units={units}
    onSubmit={(unitIds) => { issueReq(req, unitIds); cx(); }}/>);
  const openNewReq = () => HUI.open(cx => <NewRequestModal cx={cx} onSave={(r) => {
    setRequests(prev => [r, ...prev]); cx(); tk("Đã tạo phiếu yêu cầu " + r.code);
  }}/>);

  // ── COLUMNS ──
  const donorCols = [
    { key: "id", label: "Mã HM", code: true, width: 130, render: r => r.id },
    { key: "name", label: "Họ tên", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.gender} · {r.age}T · {r.occupation}</div></div> },
    { key: "blood", label: "Nhóm máu", width: 80, render: r => <BloodTag t={r.bloodType}/> },
    { key: "phone", label: "ĐT", width: 110, mono: true, render: r => r.phone },
    { key: "cccd", label: "CCCD", width: 130, mono: true, render: r => r.cccd },
    { key: "history", label: "Lượt hiến", width: 90, render: r => <div style={{fontSize:12}}>{r.totalDonated}{r.isFirstTime && <span className="ab-stat info" style={{height:18,padding:"0 6px",fontSize:10,marginLeft:4}}>Lần đầu</span>}</div> },
    { key: "campaign", label: "Đợt", render: r => <span style={{fontSize:11,color:"var(--t-2)"}}>{r.campaign}</span> },
    { key: "status", label: "Trạng thái", width: 110, render: r => { const s = BB_DONOR_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
    { key: "date", label: "Ngày", width: 95, mono: true, render: r => fmtDMYg(r.donatedAt || r.checkInAt) },
  ];
  const donorActions = (r) => (
    <div className="ab-row-act">
      {r.status === "screening" && <>
        <ActBtn ic="check" title="Ghi nhận hiến máu" onClick={() => recordDonation(r)}/>
        <ActBtn ic="alert" tone="crit" title="Hoãn / loại" onClick={() => cf("Hoãn hiến máu cho người này?", () => deferDonor(r, "Sàng lọc không đạt"), { tone: "warn" })}/>
      </>}
      <ActBtn ic="print" title="In phiếu" onClick={() => ti("Đang in phiếu " + r.id)}/>
    </div>
  );

  const unitCols = [
    { key: "id", label: "Mã đơn vị", code: true, width: 140, render: r => r.id },
    { key: "blood", label: "Nhóm", width: 70, render: r => <BloodTag t={r.bloodType}/> },
    { key: "product", label: "Chế phẩm", width: 130, render: r => { const p = BB_PRODUCTS.find(x => x.v === r.product); return <span style={{fontSize:12}}>{p.l} <span style={{color:"var(--t-2)",marginLeft:4}}>({p.short})</span></span>; }},
    { key: "vol", label: "TT", width: 70, mono: true, render: r => r.volume + "ml" },
    { key: "donor", label: "Người hiến", render: r => <div><div style={{fontSize:12.5}}>{r.donorName}</div><div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{r.donorId}</div></div> },
    { key: "loc", label: "Vị trí", width: 130, render: r => <span style={{fontSize:11,color:"var(--t-2)"}}>{r.location}</span> },
    { key: "exp", label: "HSD", width: 95, render: r => {
      const days = Math.floor((r.exp - todayIv) / 86400000);
      if (days < 0) return <StatusBadge tone="crit">Quá hạn</StatusBadge>;
      if (days < 7) return <StatusBadge tone="crit">{days}n</StatusBadge>;
      if (days < 14) return <StatusBadge tone="warn">{days}n</StatusBadge>;
      return <span style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--t-2)"}}>{days}n</span>;
    }},
    { key: "tests", label: "Sàng lọc", width: 130, render: r => {
      if (r.status === "quarantine") return <StatusBadge tone="warn">Đang chờ KQ</StatusBadge>;
      const ok = ["hiv","hbv","hcv","syph","alt"].every(k => r.tests[k] === "neg");
      return ok ? <StatusBadge tone="ok" dot>Đạt 5/5</StatusBadge> : <StatusBadge tone="crit" dot>Có dương tính</StatusBadge>;
    }},
    { key: "status", label: "Trạng thái", width: 105, render: r => { const s = BB_UNIT_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];
  const unitActions = (r) => (
    <div className="ab-row-act">
      {r.status === "quarantine" && <ActBtn ic="check" title="Thả khỏi cách ly" onClick={() => cf("Thả đơn vị này khỏi cách ly?", () => releaseUnit(r.id))}/>}
      <ActBtn ic="qrcode" title="In nhãn" onClick={() => ti("Đang in nhãn " + r.id)}/>
    </div>
  );

  const reqCols = [
    { key: "code", label: "Mã phiếu", code: true, width: 130, render: r => <div>{r.code}{r.urgent && <div><span className="ab-stat crit" style={{height:16,padding:"0 5px",fontSize:9,marginTop:2}}>KHẨN</span></div>}</div> },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patient.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.patient.pid} · {r.patient.gender} · {r.patient.age}T</div></div> },
    { key: "blood", label: "Nhóm", width: 70, render: r => <BloodTag t={r.bloodType}/> },
    { key: "product", label: "Chế phẩm", width: 110, render: r => { const p = BB_PRODUCTS.find(x => x.v === r.product); return <span style={{fontSize:12}}>{p.short}</span>; }},
    { key: "qty", label: "SL", width: 50, mono: true, render: r => r.qty + "đv" },
    { key: "dept", label: "Khoa yêu cầu", render: r => <div><div style={{fontSize:12}}>{r.dept}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.doctor}</div></div> },
    { key: "ind", label: "Chỉ định", render: r => <span style={{fontSize:11,color:"var(--t-1)"}}>{r.indication}</span> },
    { key: "date", label: "Tạo lúc", width: 95, mono: true, render: r => fmtDMYg(r.createdAt) },
    { key: "status", label: "TT", width: 110, render: r => { const s = BB_REQ_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];
  const reqActions = (r) => (
    <div className="ab-row-act">
      {r.status === "pending" && <>
        <ActBtn ic="check" title="Duyệt" onClick={() => approveReq(r.code)}/>
        <ActBtn ic="x" tone="crit" title="Từ chối" onClick={() => cf("Từ chối phiếu này?", () => rejectReq(r.code, "Không đủ chỉ định"), { tone: "warn" })}/>
      </>}
      {r.status === "approved" && <ActBtn ic="check" title="Cấp máu" onClick={() => openIssueModal(r)}/>}
      <ActBtn ic="print" title="In phiếu" onClick={() => ti("Đang in " + r.code)}/>
    </div>
  );

  uE(() => {
    const h = (e) => {
      if (e.target.closest("input,textarea,select,[contenteditable]")) return;
      if (e.key === "F2") { e.preventDefault(); (isReqs ? openNewReq : openNewDonor)(); return; }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);


  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Tổng đv khả dụng", val: kpi.totalAvailable, sub: `Cách ly ${kpi.inQuarantine}` },
        { lbl: "Hôm nay hiến máu", val: kpi.todayDonors, sub: "người", tone: "ok" },
        { lbl: "Sắp hết hạn", val: kpi.expiringSoon, sub: "< 7 ngày", tone: kpi.expiringSoon > 5 ? "warn" : null },
        { lbl: "Đã hết hạn", val: kpi.expired, sub: "cần xử lý", tone: kpi.expired > 0 ? "crit" : null },
        { lbl: "Phiếu chờ duyệt", val: kpi.pendingReq, sub: `Khẩn ${kpi.urgentReq}`, tone: kpi.urgentReq > 0 ? "crit" : kpi.pendingReq > 0 ? "warn" : null },
        { lbl: "Tổng kho lưu", val: units.length, sub: "đơn vị" },
      ]}/>

      {/* Blood inventory by group */}
      <div style={{display:"flex",gap:6,padding:"10px 14px",background:"var(--d-1)",borderTop:"1px solid var(--line)",borderBottom:"1px solid var(--line)"}}>
        <div style={{fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)",alignSelf:"center",marginRight:8}}>Tồn kho theo nhóm:</div>
        {BB_BLOODS.map(b => {
          const n = kpi.byBlood[b.v] || 0;
          const tone = n === 0 ? "crit" : n < 3 ? "warn" : "ok";
          return (
            <button key={b.v} onClick={() => { setTab("inventory"); setStab("available"); setBloodFilter(bloodFilter === b.v ? "" : b.v); }}
              style={{
                display:"flex",alignItems:"center",gap:6,padding:"6px 12px",border:"1px solid var(--line)",borderRadius:6,background:"#fff",cursor:"pointer",
                ...(bloodFilter === b.v ? {borderColor:"var(--s-info)",background:"var(--a-cy-bg)"} : {})
              }}>
              <BloodTag t={b.v}/>
              <span style={{fontSize:14,fontWeight:700,fontFamily:"var(--font-mono)",color: tone === "crit" ? "var(--s-crit)" : tone === "warn" ? "var(--s-warn)" : "var(--t-0)"}}>{n}</span>
              <span style={{fontSize:10,color:"var(--t-2)"}}>đv</span>
            </button>
          );
        })}
      </div>

      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "inventory", l: `Kho máu (${units.length})`, ic: "package" },
        { v: "donors",    l: `Người hiến (${donors.length})`, ic: "user" },
        { v: "requests",  l: `Yêu cầu xuất máu (${requests.length})`, ic: "list" },
      ]} actions={
        <>
          <button className="ab-btn ghost sm" onClick={openNewDonor}><Ico name="user" size={12}/> Đăng ký HM</button>
          <button className="ab-btn ghost sm" onClick={openNewReq}><Ico name="plus" size={12}/> Tạo yêu cầu xuất</button>
          <button className="ab-btn ghost sm" onClick={() => ti("Mở module kiểm kê")}><Ico name="list" size={12}/> Kiểm kê</button>
          <button className="ab-btn primary" onClick={isReqs ? openNewReq : openNewDonor}><Ico name="plus" size={12}/> {isReqs ? "Yêu cầu mới" : "Đăng ký HM"} <kbd>F2</kbd></button>
        </>
      }/>

      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={isDonors ? "Tìm tên / mã HM / CCCD / ĐT…" : isUnits ? "Tìm mã đơn vị / túi máu / người hiến…" : "Tìm mã phiếu / mã BN / tên BN…"}/>
        <Filter value={bloodFilter} onChange={setBloodFilter} options={BB_BLOODS} placeholder="Tất cả nhóm máu"/>
        {(isUnits || isReqs) && <Filter value={productFilter} onChange={setProductFilter} options={BB_PRODUCTS.map(p => ({ v: p.v, l: p.l }))} placeholder="Tất cả chế phẩm"/>}
      </div>

      <StatusTabs value={stab} onChange={setStab} tabs={statusTabs} counts={counts}/>

      <DataTable
        columns={isDonors ? donorCols : isUnits ? unitCols : reqCols}
        data={paged}
        rowKey={r => isDonors ? r.id : isUnits ? r.id : r.code}
        onRowClick={isDonors ? openDonor : isUnits ? openUnit : openReq}
        actions={isDonors ? donorActions : isUnits ? unitActions : reqActions}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={list.length} perPage={PER}/>
    </div>
  );
}

// ── Blood type tag ──
const BloodTag = ({ t }) => {
  const isNeg = t.endsWith("-");
  return <span style={{
    display:"inline-flex",alignItems:"center",justifyContent:"center",
    minWidth:38,height:22,padding:"0 6px",
    borderRadius:4,fontWeight:700,fontSize:11,fontFamily:"var(--font-mono)",
    background: isNeg ? "var(--a-em-bg)" : "var(--a-cy-bg)",
    color: isNeg ? "var(--s-crit)" : "var(--s-info)",
    border: `1px solid ${isNeg ? "var(--a-em-line)" : "var(--a-cy-line)"}`,
  }}>{t}</span>;
};

// ============ DONOR DRAWER ============
const DonorDrawer = ({ d, cx, onDonate, onDefer }) => {
  const [tab, setTab] = uS("info");
  const v = d.vitals;
  const isOk = v.hb >= 125 && +v.temp < 37.5 && v.weight >= 45;
  return (
    <HUI.Drawer
      title={d.name}
      sub={<>{d.id} · <BloodTag t={d.bloodType}/> · {d.gender} · {d.age}T</>}
      width={640}
      onClose={cx}
      tabs={[{ id: "info", label: "Hành chính" }, { id: "vital", label: "Sàng lọc" }, { id: "history", label: "Lịch sử" }]}
      activeTab={tab} onTab={setTab}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn" onClick={() => ti("Đã in phiếu " + d.id)}><Ico name="print" size={12}/> In phiếu HM</button>
        {d.status === "screening" && <>
          <button className="ab-btn" onClick={() => cf("Hoãn hiến máu?", () => onDefer("Sàng lọc không đạt"), { tone: "warn" })}><Ico name="alert" size={12}/> Hoãn</button>
          <button className="ab-btn primary" onClick={onDonate}><Ico name="check" size={12}/> Ghi nhận hiến máu</button>
        </>}
      </>}>
      {tab === "info" && (
        <DrSec title="Thông tin hành chính">
          <DrField lbl="Họ tên">{d.name}</DrField>
          <DrField lbl="Mã HM"><b style={{fontFamily:"var(--font-mono)"}}>{d.id}</b></DrField>
          <DrField lbl="Giới · Tuổi">{d.gender} · {d.age} tuổi</DrField>
          <DrField lbl="Nhóm máu"><BloodTag t={d.bloodType}/></DrField>
          <DrField lbl="CCCD"><span style={{fontFamily:"var(--font-mono)"}}>{d.cccd}</span></DrField>
          <DrField lbl="Điện thoại"><span style={{fontFamily:"var(--font-mono)"}}>{d.phone}</span></DrField>
          <DrField lbl="Nghề nghiệp">{d.occupation}</DrField>
          <DrField lbl="Địa chỉ">{d.address}</DrField>
          <DrField lbl="Đợt hiến">{d.campaign}</DrField>
        </DrSec>
      )}
      {tab === "vital" && <>
        <DrSec title="Dấu hiệu sinh tồn" action={<StatusBadge tone={isOk ? "ok" : "warn"} dot>{isOk ? "Đạt tiêu chuẩn" : "Chưa đạt"}</StatusBadge>}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
            <VitalCard lbl="Huyết áp" v={v.bp} unit="mmHg" warn={!v.bp.match(/^1[12]\d\/[78]\d/)}/>
            <VitalCard lbl="Mạch" v={v.pulse} unit="lần/phút" warn={v.pulse < 60 || v.pulse > 100}/>
            <VitalCard lbl="Nhiệt độ" v={v.temp} unit="°C" warn={+v.temp >= 37.5}/>
            <VitalCard lbl="Cân nặng" v={v.weight} unit="kg" warn={v.weight < 45}/>
            <VitalCard lbl="Hb" v={v.hb} unit="g/L" warn={v.hb < 125}/>
          </div>
        </DrSec>
        {d.deferReason && (
          <DrSec title="Lý do hoãn">
            <div style={{padding:"10px 12px",background:"var(--a-em-bg)",border:"1px solid var(--a-em-line)",borderRadius:6,fontSize:13,color:"var(--s-warn)"}}>{d.deferReason}</div>
          </DrSec>
        )}
        {d.status === "donated" && (
          <DrSec title="Kết quả hiến máu">
            <DrField lbl="Túi máu"><b style={{fontFamily:"var(--font-mono)"}}>{d.bagId}</b></DrField>
            <DrField lbl="Thể tích"><b style={{fontFamily:"var(--font-mono)"}}>{d.volume} ml</b></DrField>
            <DrField lbl="Lúc hiến">{fmtDTg(d.donatedAt)}</DrField>
          </DrSec>
        )}
      </>}
      {tab === "history" && (
        <DrSec title="Lịch sử hiến máu">
          <DrField lbl="Tổng số lần"><b style={{fontFamily:"var(--font-mono)",fontSize:18}}>{d.totalDonated}</b> {d.isFirstTime && <span className="ab-stat info" style={{height:18,padding:"0 6px",fontSize:10,marginLeft:8}}>Lần đầu hiến</span>}</DrField>
          {d.lastDonation && <DrField lbl="Lần gần nhất">{fmtDMYg(d.lastDonation)}</DrField>}
          {d.totalDonated > 0 && (
            <div style={{marginTop:10,padding:"10px 12px",background:"var(--a-em-bg)",border:"1px solid var(--a-em-line)",borderRadius:6}}>
              <div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em"}}>Khen thưởng</div>
              <div style={{fontSize:13,color:"var(--t-0)",marginTop:4}}>
                {d.totalDonated >= 30 ? "🏆 Bằng khen Bộ trưởng Y tế (30+ lần)" :
                 d.totalDonated >= 20 ? "🥇 Giấy khen UBND Tỉnh (20+ lần)" :
                 d.totalDonated >= 10 ? "🥈 Giấy khen của Hội CTĐ (10+ lần)" :
                 d.totalDonated >= 3  ? "🎗 Người hiến máu thường xuyên" : "—"}
              </div>
            </div>
          )}
        </DrSec>
      )}
    </HUI.Drawer>
  );
};

const VitalCard = ({ lbl, v, unit, warn }) => (
  <div style={{padding:"10px 12px",background: warn ? "var(--a-em-bg)" : "var(--d-1)",border: `1px solid ${warn ? "var(--a-em-line)" : "var(--line)"}`,borderRadius:6}}>
    <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em"}}>{lbl}</div>
    <div style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-mono)",color: warn ? "var(--s-warn)" : "var(--t-0)"}}>{v} <small style={{fontSize:11,fontWeight:400,color:"var(--t-2)"}}>{unit}</small></div>
  </div>
);

// ============ UNIT DRAWER ============
const UnitDrawer = ({ u, cx, onRelease, donors }) => {
  const [tab, setTab] = uS("info");
  const days = Math.floor((u.exp - todayIv) / 86400000);
  const product = BB_PRODUCTS.find(x => x.v === u.product);
  const status = BB_UNIT_STATUS.find(x => x.v === u.status);
  const donor = donors.find(d => d.id === u.donorId);
  return (
    <HUI.Drawer
      title={u.id}
      sub={<><BloodTag t={u.bloodType}/> · {product.l} · {u.volume}ml</>}
      width={640}
      onClose={cx}
      tabs={[{ id: "info", label: "Thông tin" }, { id: "tests", label: "Sàng lọc" }, { id: "donor", label: "Người hiến" }]}
      activeTab={tab} onTab={setTab}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn" onClick={() => ti("Đã in nhãn " + u.id)}><Ico name="qrcode" size={12}/> In nhãn vạch</button>
        {u.status === "quarantine" && <button className="ab-btn primary" onClick={onRelease}><Ico name="check" size={12}/> Thả khỏi cách ly</button>}
      </>}>
      {tab === "info" && (
        <DrSec title="Thông tin đơn vị" action={<StatusBadge tone={status.tone} dot>{status.l}</StatusBadge>}>
          <DrField lbl="Mã đơn vị"><b style={{fontFamily:"var(--font-mono)"}}>{u.id}</b></DrField>
          <DrField lbl="Mã túi"><span style={{fontFamily:"var(--font-mono)"}}>{u.bagId}</span></DrField>
          <DrField lbl="Nhóm máu"><BloodTag t={u.bloodType}/></DrField>
          <DrField lbl="Chế phẩm">{product.l} <span style={{color:"var(--t-2)",marginLeft:6}}>({product.short})</span></DrField>
          <DrField lbl="Mô tả"><span style={{fontSize:12,color:"var(--t-2)"}}>{product.desc}</span></DrField>
          <DrField lbl="Thể tích"><b style={{fontFamily:"var(--font-mono)"}}>{u.volume} ml</b></DrField>
          <DrField lbl="Vị trí lưu"><span style={{fontFamily:"var(--font-mono)"}}>{u.location}</span></DrField>
          <DrField lbl="Ngày thu thập">{fmtDMYg(u.collectedAt)}</DrField>
          <DrField lbl="Hạn sử dụng">{fmtDMYg(u.exp)} {days < 0 ? <StatusBadge tone="crit" style={{marginLeft:8}}>Quá hạn</StatusBadge> : days < 7 ? <StatusBadge tone="crit" style={{marginLeft:8}}>{days}n</StatusBadge> : <span style={{color:"var(--t-2)",marginLeft:6}}>còn {days} ngày</span>}</DrField>
        </DrSec>
      )}
      {tab === "tests" && (
        <DrSec title="Kết quả sàng lọc">
          <TestRow lbl="HIV (Anti-HIV 1/2)" v={u.tests.hiv}/>
          <TestRow lbl="HBV (HBsAg)" v={u.tests.hbv}/>
          <TestRow lbl="HCV (Anti-HCV)" v={u.tests.hcv}/>
          <TestRow lbl="Giang mai (Syphilis)" v={u.tests.syph}/>
          <TestRow lbl="Men gan (ALT)" v={u.tests.alt}/>
        </DrSec>
      )}
      {tab === "donor" && donor && (
        <>
          <DrSec title="Người hiến">
            <DrField lbl="Họ tên">{donor.name}</DrField>
            <DrField lbl="Mã HM"><b style={{fontFamily:"var(--font-mono)"}}>{donor.id}</b></DrField>
            <DrField lbl="Giới · Tuổi">{donor.gender} · {donor.age} tuổi</DrField>
            <DrField lbl="Nhóm máu"><BloodTag t={donor.bloodType}/></DrField>
            <DrField lbl="ĐT"><span style={{fontFamily:"var(--font-mono)"}}>{donor.phone}</span></DrField>
            <DrField lbl="Tổng số lần">{donor.totalDonated} lần</DrField>
          </DrSec>
        </>
      )}
    </HUI.Drawer>
  );
};

const TestRow = ({ lbl, v }) => {
  const t = BB_TEST_RESULT.find(x => x.v === v);
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 110px",gap:10,padding:"8px 0",borderBottom:"1px dashed var(--line-soft)",fontSize:13}}>
      <span>{lbl}</span>
      <StatusBadge tone={t.tone} dot>{t.l}</StatusBadge>
    </div>
  );
};

// ============ REQUEST DRAWER ============
const RequestDrawer = ({ req, cx, onApprove, onReject, onIssue, units }) => {
  const [tab, setTab] = uS("info");
  const stat = BB_REQ_STATUS.find(x => x.v === req.status);
  const product = BB_PRODUCTS.find(x => x.v === req.product);
  const issuedUnits = units.filter(u => req.issuedUnits.includes(u.id));
  return (
    <HUI.Drawer
      title={req.code}
      sub={<>{req.urgent && <span className="ab-stat crit" style={{height:18,padding:"0 6px",fontSize:10,marginRight:6}}>KHẨN</span>}<StatusBadge tone={stat.tone} dot>{stat.l}</StatusBadge></>}
      width={680}
      onClose={cx}
      tabs={[{ id: "info", label: "Thông tin" }, { id: "issued", label: `Đã cấp (${issuedUnits.length})` }, { id: "audit", label: `Lịch sử (${req.audit.length})` }]}
      activeTab={tab} onTab={setTab}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn" onClick={() => ti("Đang in " + req.code)}><Ico name="print" size={12}/> In phiếu</button>
        {req.status === "pending" && <>
          <button className="ab-btn" onClick={() => cf("Từ chối phiếu?", () => onReject("Không đủ chỉ định"), { tone: "warn" })}><Ico name="x" size={12}/> Từ chối</button>
          <button className="ab-btn primary" onClick={onApprove}><Ico name="check" size={12}/> Duyệt</button>
        </>}
        {req.status === "approved" && <button className="ab-btn primary" onClick={onIssue}><Ico name="check" size={12}/> Cấp máu</button>}
      </>}>
      {tab === "info" && <>
        <DrSec title="Thông tin bệnh nhân">
          <DrField lbl="Họ tên">{req.patient.name}</DrField>
          <DrField lbl="Mã BN"><b style={{fontFamily:"var(--font-mono)"}}>{req.patient.pid}</b></DrField>
          <DrField lbl="Giới · Tuổi">{req.patient.gender} · {req.patient.age} tuổi</DrField>
          <DrField lbl="Nhóm máu"><BloodTag t={req.patient.bloodType}/></DrField>
        </DrSec>
        <DrSec title="Yêu cầu cấp máu">
          <DrField lbl="Khoa yêu cầu">{req.dept}</DrField>
          <DrField lbl="BS chỉ định">{req.doctor}</DrField>
          <DrField lbl="Chế phẩm">{product.l} ({product.short})</DrField>
          <DrField lbl="Số lượng"><b style={{fontFamily:"var(--font-mono)"}}>{req.qty} đơn vị</b></DrField>
          <DrField lbl="Chỉ định">{req.indication}</DrField>
          <DrField lbl="Thời gian tạo">{fmtDTg(req.createdAt)}</DrField>
          {req.crossmatch && <DrField lbl="Phản ứng chéo">{req.crossmatch}</DrField>}
          {req.approvedBy && <DrField lbl="Người duyệt">{req.approvedBy} · {fmtDTg(req.approvedAt)}</DrField>}
          {req.rejectReason && <DrField lbl="Lý do từ chối"><span style={{color:"var(--s-crit)"}}>{req.rejectReason}</span></DrField>}
        </DrSec>
      </>}
      {tab === "issued" && (
        <div style={{padding:"14px 20px"}}>
          {issuedUnits.length === 0 ? <div style={{color:"var(--t-2)",textAlign:"center",padding:"30px 0",fontSize:13}}>Chưa cấp đơn vị máu nào</div> :
          <table className="ab-tbl" style={{width:"100%"}}>
            <thead><tr><th>Mã đơn vị</th><th>Nhóm</th><th>Chế phẩm</th><th>Thể tích</th><th>HSD</th></tr></thead>
            <tbody>{issuedUnits.map(u => (
              <tr key={u.id}>
                <td className="code">{u.id}</td>
                <td><BloodTag t={u.bloodType}/></td>
                <td>{BB_PRODUCTS.find(x => x.v === u.product).short}</td>
                <td className="mono">{u.volume}ml</td>
                <td className="mono" style={{fontSize:11}}>{fmtDMYg(u.exp)}</td>
              </tr>
            ))}</tbody>
          </table>}
        </div>
      )}
      {tab === "audit" && (
        <DrSec title={`Nhật ký · ${req.audit.length} sự kiện`}>
          {req.audit.map((a, i) => <AuditLine key={i} entry={a}/>)}
        </DrSec>
      )}
    </HUI.Drawer>
  );
};

// ============ NEW DONOR MODAL ============
const NewDonorModal = ({ cx, onSave }) => {
  const [form, setForm] = uS({
    name: "", age: 25, gender: "Nam", cccd: "", phone: "", bloodType: "O+",
    address: "", occupation: "", campaign: "Hiến máu nhân đạo Quận",
    bp: "120/80", pulse: 75, weight: 60, hb: 140, temp: "36.5",
  });
  const [err, setErr] = uS({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Bắt buộc";
    if (!form.cccd.match(/^\d{9,12}$/)) e.cccd = "CCCD 9-12 số";
    if (!form.phone.match(/^0\d{9}$/)) e.phone = "SĐT không hợp lệ";
    setErr(e);
    if (Object.keys(e).length > 0) { tw("Vui lòng kiểm tra lại"); return; }
    onSave({
      id: `HM-${String(2026900 + Math.floor(Math.random()*100)).padStart(6,"0")}`,
      ...form,
      isFirstTime: true, totalDonated: 0, lastDonation: null,
      donatedAt: null, checkInAt: new Date(),
      status: "screening",
      vitals: { bp: form.bp, pulse: +form.pulse, weight: +form.weight, hb: +form.hb, temp: form.temp },
    });
  };

  return (
    <HUI.Modal title="Đăng ký người hiến máu" size="lg" onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Huỷ</button>
        <button className="ab-btn primary" onClick={save}><Ico name="check" size={12}/> Đăng ký + bắt đầu sàng lọc</button>
      </>}>
      <h4 style={{margin:"0 0 8px",fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>Thông tin hành chính</h4>
      <HUI.Row cols={2}>
        <HUI.Field label="Họ tên" required error={err.name}><HUI.Input value={form.name} onChange={e => set("name", e.target.value)}/></HUI.Field>
        <HUI.Field label="Tuổi"><HUI.Input type="number" value={form.age} onChange={e => set("age", +e.target.value)}/></HUI.Field>
        <HUI.Field label="Giới tính"><HUI.Select value={form.gender} onChange={e => set("gender", e.target.value)} options={["Nam","Nữ"]}/></HUI.Field>
        <HUI.Field label="Nhóm máu" required><HUI.Select value={form.bloodType} onChange={e => set("bloodType", e.target.value)} options={BB_BLOODS.map(b => ({ value: b.v, label: b.l }))}/></HUI.Field>
        <HUI.Field label="CCCD" required error={err.cccd}><HUI.Input value={form.cccd} onChange={e => set("cccd", e.target.value)} placeholder="9-12 chữ số"/></HUI.Field>
        <HUI.Field label="Điện thoại" required error={err.phone}><HUI.Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="09xxxxxxxx"/></HUI.Field>
        <HUI.Field label="Nghề nghiệp"><HUI.Input value={form.occupation} onChange={e => set("occupation", e.target.value)}/></HUI.Field>
        <HUI.Field label="Đợt hiến"><HUI.Input value={form.campaign} onChange={e => set("campaign", e.target.value)}/></HUI.Field>
        <HUI.Field label="Địa chỉ" span={2}><HUI.Input value={form.address} onChange={e => set("address", e.target.value)}/></HUI.Field>
      </HUI.Row>
      <h4 style={{margin:"16px 0 8px",fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>Sinh hiệu sàng lọc</h4>
      <HUI.Row cols={5}>
        <HUI.Field label="Huyết áp"><HUI.Input value={form.bp} onChange={e => set("bp", e.target.value)}/></HUI.Field>
        <HUI.Field label="Mạch (l/p)"><HUI.Input type="number" value={form.pulse} onChange={e => set("pulse", e.target.value)}/></HUI.Field>
        <HUI.Field label="Cân (kg)"><HUI.Input type="number" value={form.weight} onChange={e => set("weight", e.target.value)}/></HUI.Field>
        <HUI.Field label="Hb (g/L)"><HUI.Input type="number" value={form.hb} onChange={e => set("hb", e.target.value)}/></HUI.Field>
        <HUI.Field label="Nhiệt độ (°C)"><HUI.Input value={form.temp} onChange={e => set("temp", e.target.value)}/></HUI.Field>
      </HUI.Row>
    </HUI.Modal>
  );
};

// ============ NEW REQUEST MODAL ============
const NewRequestModal = ({ cx, onSave }) => {
  const [form, setForm] = uS({
    pid: "", name: "", age: 35, gender: "Nam", bloodType: "O+",
    dept: BB_DEPTS[0], doctor: "BS. ", indication: BB_INDICATIONS[0],
    product: "PRBC", qty: 2, urgent: false,
  });
  const [err, setErr] = uS({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = () => {
    const e = {};
    if (!form.pid.trim()) e.pid = "Bắt buộc";
    if (!form.name.trim()) e.name = "Bắt buộc";
    if (form.qty < 1) e.qty = "≥1";
    setErr(e);
    if (Object.keys(e).length > 0) { tw("Kiểm tra lại"); return; }
    const code = `XM.${String(2026100 + Math.floor(Math.random()*900)).padStart(6,"0")}`;
    onSave({
      code,
      patient: { pid: form.pid, name: form.name, age: form.age, gender: form.gender, bloodType: form.bloodType },
      dept: form.dept, urgent: form.urgent,
      indication: form.indication,
      product: form.product, qty: form.qty,
      bloodType: form.bloodType,
      doctor: form.doctor,
      createdAt: new Date(),
      status: "pending",
      approvedBy: null, approvedAt: null, issuedUnits: [], issuedAt: null,
      rejectReason: null, crossmatch: null,
      audit: [{ t: Date.now(), action: "Tạo phiếu yêu cầu", by: form.doctor, tone: "info" }],
    });
  };

  return (
    <HUI.Modal title="Phiếu yêu cầu xuất máu" size="lg" onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Huỷ</button>
        <button className="ab-btn primary" onClick={save}><Ico name="check" size={12}/> Trình duyệt</button>
      </>}>
      <h4 style={{margin:"0 0 8px",fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>Bệnh nhân</h4>
      <HUI.Row cols={3}>
        <HUI.Field label="Mã BN" required error={err.pid}><HUI.Input value={form.pid} onChange={e => set("pid", e.target.value)} placeholder="BN-xxxxx"/></HUI.Field>
        <HUI.Field label="Họ tên" required error={err.name}><HUI.Input value={form.name} onChange={e => set("name", e.target.value)}/></HUI.Field>
        <HUI.Field label="Nhóm máu" required><HUI.Select value={form.bloodType} onChange={e => set("bloodType", e.target.value)} options={BB_BLOODS.map(b => ({ value: b.v, label: b.l }))}/></HUI.Field>
        <HUI.Field label="Tuổi"><HUI.Input type="number" value={form.age} onChange={e => set("age", +e.target.value)}/></HUI.Field>
        <HUI.Field label="Giới"><HUI.Select value={form.gender} onChange={e => set("gender", e.target.value)} options={["Nam","Nữ"]}/></HUI.Field>
        <HUI.Field label=""><label style={{display:"flex",alignItems:"center",gap:8,paddingTop:24,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={form.urgent} onChange={e => set("urgent", e.target.checked)}/> ⚠ Yêu cầu KHẨN</label></HUI.Field>
      </HUI.Row>
      <h4 style={{margin:"16px 0 8px",fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>Yêu cầu</h4>
      <HUI.Row cols={2}>
        <HUI.Field label="Khoa yêu cầu" required><HUI.Select value={form.dept} onChange={e => set("dept", e.target.value)} options={BB_DEPTS}/></HUI.Field>
        <HUI.Field label="Bác sĩ chỉ định" required><HUI.Input value={form.doctor} onChange={e => set("doctor", e.target.value)}/></HUI.Field>
        <HUI.Field label="Chế phẩm" required><HUI.Select value={form.product} onChange={e => set("product", e.target.value)} options={BB_PRODUCTS.map(p => ({ value: p.v, label: p.l }))}/></HUI.Field>
        <HUI.Field label="Số lượng" required error={err.qty}><HUI.Input type="number" value={form.qty} onChange={e => set("qty", +e.target.value)} suffix="đơn vị"/></HUI.Field>
        <HUI.Field label="Chỉ định lâm sàng" span={2} required>
          <HUI.Select value={form.indication} onChange={e => set("indication", e.target.value)} options={BB_INDICATIONS}/>
        </HUI.Field>
      </HUI.Row>
    </HUI.Modal>
  );
};

// ============ ISSUE MODAL (cấp đơn vị máu) ============
const IssueModal = ({ cx, req, units, onSubmit }) => {
  const compatibleUnits = units.filter(u =>
    u.product === req.product &&
    u.bloodType === req.bloodType &&
    u.status === "available"
  );
  const [selected, setSelected] = uS(new Set(compatibleUnits.slice(0, req.qty).map(u => u.id)));

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const submit = () => {
    if (selected.size !== req.qty) { tw(`Cần chọn đúng ${req.qty} đơn vị (đang chọn ${selected.size})`); return; }
    onSubmit([...selected]);
  };

  return (
    <HUI.Modal title={`Cấp máu cho phiếu ${req.code}`} size="lg" onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Huỷ</button>
        <button className="ab-btn primary" onClick={submit}><Ico name="check" size={12}/> Cấp {selected.size}/{req.qty} đơn vị</button>
      </>}>
      <div style={{padding:"10px 12px",background:"var(--a-cy-bg)",border:"1px solid var(--a-cy-line)",borderRadius:6,marginBottom:12,fontSize:13}}>
        <div><b>{req.patient.name}</b> · {req.patient.pid} · <BloodTag t={req.patient.bloodType}/></div>
        <div style={{marginTop:4,color:"var(--t-2)",fontSize:12}}>Yêu cầu: <b>{req.qty} đơn vị</b> · {BB_PRODUCTS.find(x => x.v === req.product).l} · {req.indication}</div>
      </div>

      <h4 style={{margin:"0 0 8px",fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>Đơn vị tương thích ({compatibleUnits.length})</h4>
      {compatibleUnits.length === 0 ? (
        <div style={{padding:"24px 12px",textAlign:"center",color:"var(--s-warn)",fontSize:13,background:"var(--a-em-bg)",border:"1px solid var(--a-em-line)",borderRadius:6}}>
          ⚠ Không có đơn vị tương thích. Vui lòng kiểm tra lại nhóm máu / chế phẩm hoặc tìm nguồn dự phòng.
        </div>
      ) : (
        <div style={{maxHeight:380,overflow:"auto",border:"1px solid var(--line)",borderRadius:6}}>
          <table className="ab-tbl" style={{width:"100%",margin:0}}>
            <thead style={{position:"sticky",top:0,background:"var(--d-1)",zIndex:1}}>
              <tr><th style={{width:30}}></th><th>Mã đơn vị</th><th>Nhóm</th><th>TT</th><th>Vị trí</th><th>HSD</th></tr>
            </thead>
            <tbody>{compatibleUnits.map(u => {
              const days = Math.floor((u.exp - todayIv)/86400000);
              const on = selected.has(u.id);
              return (
                <tr key={u.id} className={on?"on":""} onClick={() => toggle(u.id)} style={{cursor:"pointer"}}>
                  <td><input type="checkbox" checked={on} onChange={() => {}}/></td>
                  <td className="code">{u.id}</td>
                  <td><BloodTag t={u.bloodType}/></td>
                  <td className="mono">{u.volume}ml</td>
                  <td style={{fontSize:11,color:"var(--t-2)"}}>{u.location}</td>
                  <td><StatusBadge tone={days < 7 ? "crit" : days < 14 ? "warn" : "info"}>{days}n</StatusBadge></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </HUI.Modal>
  );
};

window.BloodBankV2 = BloodBankV2;
