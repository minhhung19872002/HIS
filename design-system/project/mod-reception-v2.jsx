// =====================================================================
// HIS Terminal · Module: TIẾP ĐÓN (Reception v2)
// Lễ tân/quầy: queue chờ check-in, gọi số, đăng ký BN mới, BHYT verify,
// in phiếu, đổi phòng, chuyển khoa, lookup BN cũ, audit log
// Dùng HUI (modal/drawer/confirm/toast), Ico, his-mod2.css + mod-reception.css
// =====================================================================

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const RX = window.HIS;

// Components defined in mod-reception-v2-modals.jsx (loaded after this file)
// We resolve them lazily at call time via window.* lookups.
const w = () => window;

// ────────────────────────────────────────────────────────────────────
// CONSTANTS / HELPERS
// ────────────────────────────────────────────────────────────────────
const REC_STATUSES = [
  { v: "waiting",    l: "Chờ tiếp đón",    tone: "info" },
  { v: "verifying",  l: "Đang xác thực",   tone: "mag" },
  { v: "registered", l: "Đã đăng ký",      tone: "ok" },
  { v: "queued",     l: "Đã gọi số",       tone: "ok" },
  { v: "checked-in", l: "Đã check-in",     tone: "ok" },
  { v: "no-show",    l: "Không đến",       tone: "warn" },
  { v: "cancelled",  l: "Đã hủy",          tone: "off" },
];
const PRIORITY = [
  { v: "crit",   l: "Cấp cứu",      tone: "crit" },
  { v: "high",   l: "Ưu tiên",      tone: "warn" },
  { v: "norm",   l: "Thường",       tone: "info" },
];
const VISIT_TYPES = [
  { v: "kham-thuong",  l: "Khám thường",     ic: "stethoscope",   fee: 38000 },
  { v: "kham-bhyt",    l: "Khám BHYT",       ic: "shield",   fee: 0 },
  { v: "kham-vip",     l: "Khám dịch vụ",    ic: "heart",     fee: 250000 },
  { v: "kham-yc",      l: "Khám theo yêu cầu", ic: "reception",   fee: 350000 },
  { v: "tai-kham",     l: "Tái khám",        ic: "refresh",   fee: 25000 },
  { v: "cap-cuu",      l: "Cấp cứu",         ic: "alert",    fee: 0 },
  { v: "tu-van",       l: "Tư vấn",          ic: "info",     fee: 80000 },
  { v: "tiem-chung",   l: "Tiêm chủng",      ic: "flask",  fee: 50000 },
];
const DEPTS_REC = [
  { code: "NTQ", name: "Nội tổng quát",   room: "P.201", staff: 4 },
  { code: "NPK", name: "Nội tim mạch",    room: "P.202", staff: 2 },
  { code: "NTH", name: "Nội tiêu hóa",    room: "P.203", staff: 3 },
  { code: "SPK", name: "Sản phụ khoa",    room: "P.205", staff: 3 },
  { code: "NHI", name: "Nhi",             room: "P.207", staff: 4 },
  { code: "MAT", name: "Mắt",             room: "P.301", staff: 2 },
  { code: "TMH", name: "Tai Mũi Họng",    room: "P.303", staff: 3 },
  { code: "RHM", name: "Răng Hàm Mặt",    room: "P.304", staff: 2 },
  { code: "NCT", name: "Ngoại chấn thương",room: "P.305", staff: 3 },
  { code: "DLU", name: "Da liễu",         room: "P.306", staff: 2 },
  { code: "TRR", name: "Truyền nhiễm",    room: "P.401", staff: 2 },
  { code: "YHCT",name: "Y học cổ truyền", room: "P.402", staff: 2 },
];

const fmtVND = (n) => n ? n.toLocaleString("vi-VN") + " ₫" : "Miễn phí";
const fmtHM  = (d) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
const statusOfRec = (v) => REC_STATUSES.find(s => s.v === v) || REC_STATUSES[0];
const prioOf      = (v) => PRIORITY.find(s => s.v === v) || PRIORITY[2];
const today       = new Date(2026, 9, 22); // 22/10/2026

// ────────────────────────────────────────────────────────────────────
// SEED DATA: 60+ phiên tiếp đón hôm nay
// ────────────────────────────────────────────────────────────────────
const seedReceptions = () => {
  const visits = [];
  const N = 64;
  const names = [
    "Nguyễn Văn An","Trần Thị Bình","Lê Hoàng Cường","Phạm Thị Dung","Vũ Văn Em",
    "Đặng Thị Phương","Hoàng Văn Giang","Bùi Thị Hằng","Mai Văn Khôi","Lý Thị Lan",
    "Phan Văn Minh","Đỗ Thị Nga","Trịnh Văn Oanh","Cao Thị Phúc","Dương Văn Quân",
    "Tô Thị Rồng","Nguyễn Thị Sao","Lê Văn Tùng","Phạm Thị Uyên","Vũ Văn Vinh",
    "Hoàng Thị Xuân","Trần Văn Yên","Nguyễn Văn An","Lê Thị Bích","Đỗ Văn Cương",
    "Phạm Thị Dương","Bùi Văn Hà","Mai Thị Hương","Vũ Văn Khoa","Trần Thị Lý",
  ];
  const phones = [];
  for (let i = 0; i < N; i++) phones.push("09" + String(10000000 + Math.floor(Math.random()*89999999)).slice(0,8));

  const STATUS_DIST = ["checked-in","checked-in","checked-in","registered","registered","queued","waiting","verifying","no-show","cancelled"];

  for (let i = 0; i < N; i++) {
    const code = `REC-${String(20261022).slice(-6)}-${String(1000+i).slice(-4)}`;
    const name = names[i % names.length] + (i > names.length ? " " + (i-names.length+1) : "");
    const isOld = Math.random() > 0.35;
    const pid = isOld ? `BN-${String(140 + Math.floor(Math.random()*200)).padStart(5,"0")}` : null;
    const hasBhyt = Math.random() > 0.2;
    const arrivalH = 7 + Math.floor(i / 12);
    const arrivalM = (i * 7) % 60;
    const arrived = new Date(2026, 9, 22, arrivalH, arrivalM);
    const status = STATUS_DIST[Math.floor(Math.random()*STATUS_DIST.length)];
    const dept = DEPTS_REC[Math.floor(Math.random()*DEPTS_REC.length)];
    const visitType = VISIT_TYPES[Math.floor(Math.random()* (hasBhyt? 8 : 7))];
    const priority = i < 3 ? "crit" : (i < 8 ? "high" : "norm");
    const token = `${dept.code.slice(0,1)}${String(100 + i).slice(-3)}`;
    const age = 18 + Math.floor(Math.random() * 70);
    const gender = Math.random() > 0.5 ? "F" : "M";

    visits.push({
      code,
      pid,
      patientName: name,
      phone: phones[i],
      cccd: `0${String(11000000000 + Math.floor(Math.random()*89999999999)).slice(0,11)}`,
      age, gender,
      address: ["P. Lê Lợi","P. An Tảo","P. Quang Trung","P. Hiến Nam","P. Hồng Châu","X. Trung Nghĩa"][i%6] + ", TP. Hưng Yên, T. Hưng Yên",
      hasBhyt,
      bhytNo: hasBhyt ? `HN${1+Math.floor(Math.random()*4)} ${1+Math.floor(Math.random()*4)} 08 ${String(1000000 + Math.floor(Math.random()*8999999))}` : null,
      bhytClass: hasBhyt ? `HN${1+Math.floor(Math.random()*4)}` : null,
      bhytExp: hasBhyt ? "31/12/2026" : null,
      bhytValid: hasBhyt && Math.random() > 0.06,
      visitType: visitType.v,
      visitTypeLabel: visitType.l,
      visitTypeIco: visitType.ic,
      fee: hasBhyt && visitType.v === "kham-bhyt" ? 0 : visitType.fee,
      dept: dept.code,
      deptName: dept.name,
      room: dept.room,
      token,
      priority,
      arrivedAt: arrived,
      arrivedHM: fmtHM(arrived),
      status,
      reason: ["Đau đầu, chóng mặt 3 ngày","Tái khám THA","Khám thai 28 tuần","Sốt 38.5°C","Đau bụng âm ỉ","Ho kéo dài","Tê tay phải","Đau lưng mạn","Mệt mỏi, ăn uống kém","Khó thở khi gắng sức"][i%10],
      cashier: status === "checked-in" ? "TN. Trần Liên" : null,
      payment: status === "checked-in" ? (hasBhyt ? "BHYT 80%" : "Tiền mặt") : null,
      audit: [
        { t: arrived, action: "Đến tiếp đón", by: "Hệ thống", tone: "info" },
        ...(status === "verifying" || status === "registered" || status === "queued" || status === "checked-in" ? [{ t: new Date(arrived.getTime()+2*60000), action: hasBhyt ? "Xác thực BHYT" : "Xác thực CCCD", by: "TN. Trần Liên", tone: "mag" }] : []),
        ...(status === "registered" || status === "queued" || status === "checked-in" ? [{ t: new Date(arrived.getTime()+5*60000), action: "Đăng ký tiếp đón", by: "TN. Trần Liên", tone: "ok" }] : []),
        ...(status === "queued" || status === "checked-in" ? [{ t: new Date(arrived.getTime()+8*60000), action: `Cấp số ${token} → ${dept.room}`, by: "TN. Trần Liên", tone: "ok" }] : []),
        ...(status === "checked-in" ? [{ t: new Date(arrived.getTime()+12*60000), action: "Đã check-in vào khoa", by: dept.name, tone: "ok" }] : []),
        ...(status === "no-show" ? [{ t: new Date(arrived.getTime()+45*60000), action: "Quá 30 phút không đến quầy", by: "Hệ thống", tone: "warn" }] : []),
        ...(status === "cancelled" ? [{ t: new Date(arrived.getTime()+3*60000), action: "Hủy đăng ký · BN tự về", by: "TN. Trần Liên", tone: "off" }] : []),
      ],
    });
  }
  return visits.sort((a,b) => b.arrivedAt - a.arrivedAt);
};

// ────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────
function ReceptionV2() {
  const [visits, setVisits] = useState(seedReceptions);
  const [tab, setTab] = useState("queue"); // queue | now | stats
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterVisitType, setFilterVisitType] = useState("");
  const [filterBhyt, setFilterBhyt] = useState("");
  const [page, setPage] = useState(0);
  const [selRows, setSelRows] = useState(new Set());
  const PAGE_SIZE = 14;

  // ──── Filters ────
  const filtered = useMemo(() => {
    return visits.filter(v => {
      if (statusTab !== "all" && v.status !== statusTab) return false;
      if (filterDept && v.dept !== filterDept) return false;
      if (filterPriority && v.priority !== filterPriority) return false;
      if (filterVisitType && v.visitType !== filterVisitType) return false;
      if (filterBhyt === "y" && !v.hasBhyt) return false;
      if (filterBhyt === "n" && v.hasBhyt) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [v.code, v.patientName, v.phone, v.cccd, v.bhytNo, v.token, v.pid].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visits, statusTab, search, filterDept, filterPriority, filterVisitType, filterBhyt]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page*PAGE_SIZE, (page+1)*PAGE_SIZE);

  const tabCounts = useMemo(() => {
    const c = { all: visits.length };
    REC_STATUSES.forEach(s => { c[s.v] = visits.filter(v => v.status === s.v).length; });
    return c;
  }, [visits]);

  // ──── KPIs ────
  const kpis = useMemo(() => ({
    today: visits.length,
    waiting: visits.filter(v => v.status === "waiting" || v.status === "verifying").length,
    registered: visits.filter(v => v.status === "registered" || v.status === "queued" || v.status === "checked-in").length,
    bhyt: visits.filter(v => v.hasBhyt && (v.status === "registered" || v.status === "queued" || v.status === "checked-in")).length,
    noShow: visits.filter(v => v.status === "no-show").length,
    avgWait: 8,
  }), [visits]);

  // ──── Mutations ────
  const updateVisit = (code, patch, action, tone = "info") => {
    setVisits(prev => prev.map(v => v.code === code
      ? { ...v, ...patch, audit: [...v.audit, { t: new Date(), action, by: RX.currentUser.name, tone }] }
      : v));
  };
  const addVisit = (data) => {
    const code = `REC-261022-${String(2000 + visits.length).slice(-4)}`;
    const arrived = new Date();
    const dept = DEPTS_REC.find(d => d.code === data.dept) || DEPTS_REC[0];
    const visitType = VISIT_TYPES.find(t => t.v === data.visitType) || VISIT_TYPES[0];
    const tokenNum = 100 + visits.filter(v => v.dept === data.dept).length;
    const newVisit = {
      code,
      pid: data.pid || `BN-${String(50000 + visits.length).slice(-5)}`,
      patientName: data.patientName,
      phone: data.phone,
      cccd: data.cccd,
      age: data.age, gender: data.gender,
      address: data.address || "",
      hasBhyt: !!data.bhytNo,
      bhytNo: data.bhytNo,
      bhytClass: data.bhytClass,
      bhytExp: data.bhytExp,
      bhytValid: !!data.bhytNo,
      visitType: data.visitType,
      visitTypeLabel: visitType.l,
      visitTypeIco: visitType.ic,
      fee: data.fee || visitType.fee,
      dept: data.dept,
      deptName: dept.name,
      room: dept.room,
      token: `${dept.code.slice(0,1)}${String(tokenNum).slice(-3)}`,
      priority: data.priority || "norm",
      arrivedAt: arrived,
      arrivedHM: fmtHM(arrived),
      status: "registered",
      reason: data.reason || "",
      payment: null, cashier: null,
      audit: [
        { t: arrived, action: "Đăng ký tiếp đón", by: RX.currentUser.name, tone: "ok" },
        { t: new Date(arrived.getTime()+1000), action: `Cấp số ${dept.code.slice(0,1)}${String(tokenNum).slice(-3)} → ${dept.room}`, by: RX.currentUser.name, tone: "ok" },
      ],
    };
    setVisits(prev => [newVisit, ...prev]);
    return newVisit;
  };

  const onCallNext = () => {
    const next = visits.filter(v => v.status === "registered").sort((a,b) => a.arrivedAt - b.arrivedAt)[0];
    if (!next) { HUI.toast("Hàng đợi trống", { tone: "info" }); return; }
    updateVisit(next.code, { status: "queued" }, `Gọi số ${next.token}`, "ok");
    HUI.toast(`Đang gọi số ${next.token} · ${next.patientName} → ${next.room}`, { tone: "ok" });
  };
  const onCheckin = (v) => updateVisit(v.code, { status: "checked-in", payment: v.hasBhyt ? "BHYT 80%" : "Tiền mặt", cashier: RX.currentUser.name }, "Check-in vào khoa", "ok");
  const onNoShow  = (v) => updateVisit(v.code, { status: "no-show" }, "Đánh dấu không đến", "warn");
  const onCancel  = (v) => updateVisit(v.code, { status: "cancelled" }, "Hủy đăng ký", "off");
  const onPrint   = (v) => openPrintModal(v);
  const onMoveDept= (v) => openMoveDeptModal(v);
  const onPay     = (v) => openPayModal(v);

  // ──── Modal openers ────
  const openNewVisitWizard = () => HUI.open(cx => <window.NewVisitWizard cx={cx} onSubmit={(d) => { const nv = addVisit(d); cx(); openPrintModal(nv); HUI.toast(`Đã đăng ký ${nv.patientName} · số ${nv.token}`, {tone:"ok"}); }} />);
  const openDetailDrawer  = (v) => HUI.drawer(cx => <window.VisitDrawer v={v} cx={cx} visits={visits} onCheckin={onCheckin} onNoShow={onNoShow} onCancel={onCancel} onPrint={onPrint} onMoveDept={onMoveDept} onPay={onPay} />);
  const openPrintModal    = (v) => HUI.open(cx => <window.PrintTicketModal v={v} cx={cx} />);
  const openMoveDeptModal = (v) => HUI.open(cx => <window.MoveDeptModal v={v} cx={cx} onSubmit={(newDept, newRoom, reason) => { const d = DEPTS_REC.find(x => x.code === newDept); updateVisit(v.code, { dept: newDept, deptName: d.name, room: newRoom || d.room }, `Chuyển khoa → ${d.name} (${newRoom || d.room}) · ${reason}`, "mag"); cx(); HUI.toast("Đã chuyển khoa", {tone:"ok"}); }} />);
  const openPayModal      = (v) => HUI.open(cx => <window.PayModal v={v} cx={cx} onSubmit={(method) => { updateVisit(v.code, { status: "checked-in", payment: method, cashier: RX.currentUser.name }, `Thu phí · ${method} · ${fmtVND(v.fee)}`, "ok"); cx(); HUI.toast("Đã thu phí và check-in", {tone:"ok"}); }} />);
  const openLookupModal   = () => HUI.open(cx => <window.LookupBNModal cx={cx} onPick={(p) => { cx(); openNewVisitWithPatient(p); }} />);
  const openNewVisitWithPatient = (p) => HUI.open(cx => <window.NewVisitWizard cx={cx} prefill={p} onSubmit={(d) => { const nv = addVisit(d); cx(); openPrintModal(nv); }} />);
  const openBhytVerify    = () => HUI.open(cx => <window.BhytVerifyModal cx={cx} />);
  const openBulkPrint     = () => {
    const sel = visits.filter(v => selRows.has(v.code));
    if (sel.length === 0) { HUI.toast("Chưa chọn phiên nào", {tone:"warn"}); return; }
    HUI.toast(`Đã in ${sel.length} phiếu hẹn`, {tone:"ok"});
    setSelRows(new Set());
  };
  const onResetFilter = () => { setSearch(""); setFilterDept(""); setFilterPriority(""); setFilterVisitType(""); setFilterBhyt(""); setStatusTab("all"); setPage(0); };
  const onExport = () => HUI.toast(`Đã xuất ${filtered.length} dòng (CSV)`, {tone:"ok"});

  // F2 = đặt mới
  useEffect(() => {
    const h = (e) => {
      if (e.key === "F2") { e.preventDefault(); openNewVisitWizard(); }
      if (e.key === "F3") { e.preventDefault(); onCallNext(); }
      if (e.key === "F4") { e.preventDefault(); openLookupModal(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className="ab">
      {/* KPI strip */}
      <div className="ab-kpis">
        <div className="ab-kpi"><div className="lbl">Hôm nay</div><div className="val">{kpis.today}</div><div className="sub">phiên tiếp đón</div></div>
        <div className="ab-kpi warn"><div className="lbl">Đang chờ</div><div className="val">{kpis.waiting}</div><div className="sub">quầy lễ tân</div></div>
        <div className="ab-kpi ok"><div className="lbl">Đã đăng ký</div><div className="val">{kpis.registered}</div><div className="sub">{Math.round(kpis.registered/Math.max(kpis.today,1)*100)}%</div></div>
        <div className="ab-kpi ok"><div className="lbl">Có BHYT</div><div className="val">{kpis.bhyt}</div><div className="sub">{Math.round(kpis.bhyt/Math.max(kpis.today,1)*100)}%</div></div>
        <div className="ab-kpi crit"><div className="lbl">Không đến</div><div className="val">{kpis.noShow}</div><div className="sub">{Math.round(kpis.noShow/Math.max(kpis.today,1)*100)}%</div></div>
        <div className="ab-kpi info"><div className="lbl">Chờ TB</div><div className="val">{kpis.avgWait}<small>p</small></div><div className="sub">tốt</div></div>
      </div>

      {/* Top tabs */}
      <div className="ab-toptabs">
        <button className={tab==="queue"?"on":""} onClick={()=>setTab("queue")}><Ico name="users" size={13}/> Hàng đợi tiếp đón</button>
        <button className={tab==="now"?"on":""} onClick={()=>setTab("now")}><Ico name="bell" size={13}/> Bảng gọi số</button>
        <button className={tab==="stats"?"on":""} onClick={()=>setTab("stats")}><Ico name="chart" size={13}/> Thống kê</button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={openBhytVerify}><Ico name="shield" size={12}/> Tra cứu BHYT</button>
        <button className="ab-btn ghost" onClick={openLookupModal}><Ico name="search" size={12}/> Tìm BN cũ <kbd>F4</kbd></button>
        <button className="ab-btn ok" onClick={onCallNext}><Ico name="bell" size={12}/> Gọi số tiếp <kbd>F3</kbd></button>
        <button className="ab-btn primary" onClick={openNewVisitWizard}><Ico name="plus" size={12}/> Đăng ký mới <kbd>F2</kbd></button>
      </div>

      {tab === "queue" && (
        <QueueTab
          paged={paged} filtered={filtered} totalPages={totalPages} page={page} setPage={setPage}
          statusTab={statusTab} setStatusTab={setStatusTab} tabCounts={tabCounts}
          search={search} setSearch={setSearch}
          filterDept={filterDept} setFilterDept={setFilterDept}
          filterPriority={filterPriority} setFilterPriority={setFilterPriority}
          filterVisitType={filterVisitType} setFilterVisitType={setFilterVisitType}
          filterBhyt={filterBhyt} setFilterBhyt={setFilterBhyt}
          onResetFilter={onResetFilter} onExport={onExport}
          selRows={selRows} setSelRows={setSelRows}
          openDetail={openDetailDrawer}
          onCheckin={onCheckin} onNoShow={onNoShow} onCancel={onCancel} onPrint={onPrint} onMoveDept={onMoveDept} onPay={onPay}
          onBulkPrint={openBulkPrint}
        />
      )}
      {tab === "now" && <NowServingTab visits={visits} onCallNext={onCallNext} onCheckin={onCheckin}/>}
      {tab === "stats" && <StatsTab visits={visits} kpis={kpis}/>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// TAB: Queue (filter table)
// ────────────────────────────────────────────────────────────────────
const QueueTab = (p) => {
  const toggleAll = () => {
    if (p.selRows.size === p.paged.length) p.setSelRows(new Set());
    else p.setSelRows(new Set(p.paged.map(v => v.code)));
  };
  const toggleOne = (code) => {
    const s = new Set(p.selRows);
    s.has(code) ? s.delete(code) : s.add(code);
    p.setSelRows(s);
  };
  return (
    <div className="ab-stack">
      {/* Status sub-tabs */}
      <div className="ab-stab">
        <button className={p.statusTab==="all"?"on":""} onClick={()=>p.setStatusTab("all")}>Tất cả <i>{p.tabCounts.all}</i></button>
        {REC_STATUSES.map(s => (
          <button key={s.v} className={p.statusTab===s.v?"on":""} onClick={()=>p.setStatusTab(s.v)}>
            <span className={`ab-dot ${s.tone}`}/> {s.l} <i>{p.tabCounts[s.v]||0}</i>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="ab-tools">
        <div className="ab-search">
          <Ico name="search" size={13}/>
          <input placeholder="Tìm theo tên BN, SĐT, CCCD, mã BN, BHYT, số thứ tự…" value={p.search} onChange={e=>p.setSearch(e.target.value)}/>
          {p.search && <button onClick={()=>p.setSearch("")}><Ico name="x" size={11}/></button>}
        </div>
        <select className="ab-sel" value={p.filterDept} onChange={e=>p.setFilterDept(e.target.value)}>
          <option value="">▾ Tất cả khoa</option>
          {DEPTS_REC.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
        <select className="ab-sel" value={p.filterPriority} onChange={e=>p.setFilterPriority(e.target.value)}>
          <option value="">▾ Mức ưu tiên</option>
          {PRIORITY.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <select className="ab-sel" value={p.filterVisitType} onChange={e=>p.setFilterVisitType(e.target.value)}>
          <option value="">▾ Hình thức khám</option>
          {VISIT_TYPES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <select className="ab-sel" value={p.filterBhyt} onChange={e=>p.setFilterBhyt(e.target.value)}>
          <option value="">▾ BHYT</option>
          <option value="y">Có BHYT</option>
          <option value="n">Không BHYT</option>
        </select>
        <button className="ab-btn ghost" onClick={p.onResetFilter}><Ico name="refresh" size={12}/> Bỏ lọc</button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={p.onExport} title="Xuất CSV"><Ico name="download" size={12}/> Xuất</button>
      </div>

      {/* Bulk bar */}
      {p.selRows.size > 0 && (
        <div className="ab-bulk">
          <Ico name="check" size={13}/> Đã chọn <b>{p.selRows.size}</b> phiên
          <span className="spacer"/>
          <button className="ab-btn primary" onClick={p.onBulkPrint}><Ico name="print" size={12}/> In hàng loạt</button>
          <button className="ab-btn ghost" onClick={()=>p.setSelRows(new Set())}>Bỏ chọn</button>
        </div>
      )}

      {/* Table */}
      <div className="ab-tbl-wrap">
        <table className="ab-tbl">
          <thead>
            <tr>
              <th className="ck"><input type="checkbox" checked={p.selRows.size === p.paged.length && p.paged.length>0} onChange={toggleAll}/></th>
              <th>STT</th>
              <th>Bệnh nhân</th>
              <th>Đến lúc</th>
              <th>Khoa · phòng</th>
              <th>Hình thức</th>
              <th>BHYT</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Phí</th>
              <th className="act">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {p.paged.map(v => (
              <tr key={v.code} className={p.selRows.has(v.code)?"on":""}>
                <td className="ck"><input type="checkbox" checked={p.selRows.has(v.code)} onChange={()=>toggleOne(v.code)} onClick={e=>e.stopPropagation()}/></td>
                <td onClick={()=>p.openDetail(v)}><span className={`rec-token ${v.priority==="crit"?"crit":v.priority==="high"?"high":"norm"} ${v.status==="checked-in"?"done":""}`}>{v.token}</span></td>
                <td onClick={()=>p.openDetail(v)}>
                  <div className="cell-2l">
                    <b>{v.patientName}</b>
                    <span>{v.gender==="F"?"Nữ":"Nam"} · {v.age}t · <span className="mono">{v.phone}</span></span>
                  </div>
                </td>
                <td className="mono" onClick={()=>p.openDetail(v)}>{v.arrivedHM}</td>
                <td onClick={()=>p.openDetail(v)}>
                  <div className="cell-2l">
                    <b>{v.deptName}</b>
                    <span className="mono">{v.room}</span>
                  </div>
                </td>
                <td onClick={()=>p.openDetail(v)}>{v.visitTypeLabel}</td>
                <td onClick={()=>p.openDetail(v)}>{v.hasBhyt ? <span className="chip ok mono">{v.bhytClass}</span> : <span style={{color:"var(--t-3)"}}>—</span>}</td>
                <td onClick={()=>p.openDetail(v)}><span className={`chip ${prioOf(v.priority).tone}`}>{prioOf(v.priority).l}</span></td>
                <td onClick={()=>p.openDetail(v)}><span className={`ab-stat ${statusOfRec(v.status).tone}`}><span className={`ab-dot ${statusOfRec(v.status).tone}`}/> {statusOfRec(v.status).l}</span></td>
                <td className="mono" onClick={()=>p.openDetail(v)}>{fmtVND(v.fee)}</td>
                <td className="act">
                  <RowActionsRec v={v} onCheckin={p.onCheckin} onNoShow={p.onNoShow} onCancel={p.onCancel} onPrint={p.onPrint} onMoveDept={p.onMoveDept} onPay={p.onPay}/>
                </td>
              </tr>
            ))}
            {p.paged.length === 0 && (
              <tr><td colSpan={11}><div className="ab-empty"><Ico name="search" size={20}/><div>Không có phiên tiếp đón nào.</div><button className="ab-btn ghost" onClick={p.onResetFilter}>Bỏ lọc</button></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="ab-tbl-ft">
        <span>Tổng <b>{p.filtered.length}</b> phiên · trang <b>{p.page+1}/{p.totalPages}</b></span>
        <span className="spacer"/>
        <button className="ab-btn sm" disabled={p.page===0} onClick={()=>p.setPage(0)}>«</button>
        <button className="ab-btn sm" disabled={p.page===0} onClick={()=>p.setPage(p.page-1)}>‹</button>
        <button className="ab-btn sm" disabled={p.page>=p.totalPages-1} onClick={()=>p.setPage(p.page+1)}>›</button>
        <button className="ab-btn sm" disabled={p.page>=p.totalPages-1} onClick={()=>p.setPage(p.totalPages-1)}>»</button>
      </div>
    </div>
  );
};

const RowActionsRec = ({ v, onCheckin, onNoShow, onCancel, onPrint, onMoveDept, onPay }) => {
  const stop = (e) => e.stopPropagation();
  return (
    <div className="ab-actions" onClick={stop}>
      {(v.status === "registered" || v.status === "queued") && v.fee > 0 && <button className="ab-iconbtn ok" title="Thu phí" onClick={()=>onPay(v)}><Ico name="receipt" size={12}/></button>}
      {(v.status === "registered" || v.status === "queued") && v.fee === 0 && <button className="ab-iconbtn ok" title="Check-in" onClick={()=>onCheckin(v)}><Ico name="check" size={12}/></button>}
      <button className="ab-iconbtn" title="In phiếu" onClick={()=>onPrint(v)}><Ico name="print" size={12}/></button>
      {v.status !== "checked-in" && v.status !== "cancelled" && <button className="ab-iconbtn" title="Chuyển khoa" onClick={()=>onMoveDept(v)}><Ico name="refresh" size={12}/></button>}
      {(v.status === "registered" || v.status === "queued" || v.status === "waiting") && <button className="ab-iconbtn warn" title="Không đến" onClick={()=>onNoShow(v)}><Ico name="alert" size={12}/></button>}
      {v.status !== "checked-in" && v.status !== "cancelled" && <button className="ab-iconbtn crit" title="Hủy" onClick={()=>onCancel(v)}><Ico name="x" size={12}/></button>}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// TAB: Now Serving (gọi số theo khoa)
// ────────────────────────────────────────────────────────────────────
const NowServingTab = ({ visits, onCallNext, onCheckin }) => {
  const byDept = useMemo(() => {
    const m = {};
    DEPTS_REC.forEach(d => {
      const list = visits.filter(v => v.dept === d.code);
      m[d.code] = {
        ...d,
        current: list.find(v => v.status === "queued"),
        next: list.filter(v => v.status === "registered").sort((a,b)=>a.arrivedAt-b.arrivedAt)[0],
        waiting: list.filter(v => v.status === "registered").length,
        done: list.filter(v => v.status === "checked-in").length,
      };
    });
    return m;
  }, [visits]);

  return (
    <div className="ab-stack" style={{padding: "16px 14px", overflow:"auto"}}>
      <div style={{fontSize:11, color:"var(--t-2)", fontWeight:600, letterSpacing:0.5, textTransform:"uppercase", marginBottom:10}}>BẢNG GỌI SỐ THEO KHOA · {fmtHM(new Date())}</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14}}>
        {DEPTS_REC.map(d => {
          const info = byDept[d.code];
          return (
            <div key={d.code} style={{background:"#fff", border:"1px solid var(--line)", borderRadius:8, overflow:"hidden"}}>
              <div style={{padding:"10px 14px", background:"var(--d-1)", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <div>
                  <b style={{fontSize:13, color:"var(--t-0)"}}>{d.name}</b>
                  <span style={{fontSize:11, color:"var(--t-2)", marginLeft:6, fontFamily:"var(--font-mono)"}}>{d.room}</span>
                </div>
                <span className="chip info">{d.staff} BS</span>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontSize:10.5, color:"var(--t-2)", textTransform:"uppercase", letterSpacing:0.4, fontWeight:600}}>Đang gọi</div>
                {info.current ? (
                  <>
                    <div style={{fontFamily:"var(--font-mono)", fontSize:36, fontWeight:700, color:"var(--a-cy)", lineHeight:1, margin:"4px 0"}}>{info.current.token}</div>
                    <div style={{fontSize:13, fontWeight:600, color:"var(--t-0)"}}>{info.current.patientName}</div>
                    <div style={{fontSize:11, color:"var(--t-2)"}}>{info.current.gender==="F"?"Nữ":"Nam"} · {info.current.age}t · {info.current.reason}</div>
                  </>
                ) : (
                  <div style={{fontFamily:"var(--font-mono)", fontSize:36, fontWeight:700, color:"var(--t-3)", lineHeight:1, margin:"4px 0"}}>—</div>
                )}
              </div>
              <div style={{padding:"10px 16px", borderTop:"1px solid var(--line-soft)", background:"var(--d-1)", display:"flex", gap:14, fontSize:11.5}}>
                <span><b style={{color:"var(--t-0)"}}>{info.waiting}</b> chờ</span>
                <span><b style={{color:"var(--t-0)"}}>{info.done}</b> đã khám</span>
                <span className="spacer" style={{flex:1}}/>
                {info.next && <span style={{color:"var(--t-2)"}}>Tiếp: <b className="mono" style={{color:"var(--a-cy)"}}>{info.next.token}</b></span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// TAB: Stats
// ────────────────────────────────────────────────────────────────────
const StatsTab = ({ visits, kpis }) => {
  const byHour = useMemo(() => {
    const m = {};
    for (let h = 7; h <= 17; h++) m[h] = 0;
    visits.forEach(v => {
      const h = v.arrivedAt.getHours();
      if (m[h] !== undefined) m[h]++;
    });
    return m;
  }, [visits]);
  const maxH = Math.max(...Object.values(byHour), 1);

  const byDept = useMemo(() => {
    const m = {};
    DEPTS_REC.forEach(d => m[d.code] = 0);
    visits.forEach(v => { m[v.dept] = (m[v.dept]||0)+1; });
    return m;
  }, [visits]);
  const maxD = Math.max(...Object.values(byDept), 1);

  const byVisitType = useMemo(() => {
    const m = {};
    VISIT_TYPES.forEach(t => m[t.v] = 0);
    visits.forEach(v => { m[v.visitType] = (m[v.visitType]||0)+1; });
    return m;
  }, [visits]);

  return (
    <div className="ab-stack" style={{padding:"16px 14px", gap:14, overflow:"auto"}}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
        <ChartCard title="LƯỢT TIẾP ĐÓN THEO GIỜ">
          <div style={{display:"flex", alignItems:"flex-end", gap:6, height:160, padding:"0 10px"}}>
            {Object.entries(byHour).map(([h,n]) => (
              <div key={h} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4}}>
                <span style={{fontSize:10, color:"var(--t-2)", fontFamily:"var(--font-mono)"}}>{n}</span>
                <div style={{width:"100%", height:`${(n/maxH)*120}px`, background:"linear-gradient(180deg, var(--a-cy) 0%, var(--a-cy-dim) 100%)", borderRadius:"3px 3px 0 0", minHeight:2}}/>
                <span style={{fontSize:10, color:"var(--t-3)", fontFamily:"var(--font-mono)"}}>{h}h</span>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="THEO HÌNH THỨC KHÁM">
          <div style={{display:"flex", flexDirection:"column", gap:8, padding:"0 6px"}}>
            {VISIT_TYPES.map(t => {
              const n = byVisitType[t.v] || 0;
              const pct = visits.length ? Math.round(n/visits.length*100) : 0;
              return (
                <div key={t.v}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3}}>
                    <span>{t.l}</span>
                    <span className="mono"><b>{n}</b> · {pct}%</span>
                  </div>
                  <div style={{height:7, background:"var(--d-3)", borderRadius:4, overflow:"hidden"}}>
                    <div style={{width:`${pct}%`, height:"100%", background:"var(--a-cy)"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
      <ChartCard title="THEO KHOA · 12 KHOA">
        <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"6px 24px", padding:"0 6px"}}>
          {DEPTS_REC.map(d => {
            const n = byDept[d.code] || 0;
            const pct = (n/maxD)*100;
            return (
              <div key={d.code}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3}}>
                  <span>{d.name} <span style={{color:"var(--t-3)", marginLeft:4, fontFamily:"var(--font-mono)"}}>{d.room}</span></span>
                  <span className="mono"><b>{n}</b></span>
                </div>
                <div style={{height:7, background:"var(--d-3)", borderRadius:4, overflow:"hidden"}}>
                  <div style={{width:`${pct}%`, height:"100%", background:"linear-gradient(90deg, var(--a-cy) 0%, var(--a-cy-dim) 100%)"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div style={{background:"#fff", border:"1px solid var(--line)", borderRadius:8, padding:"14px 16px"}}>
    <div style={{fontSize:11, color:"var(--t-2)", fontWeight:600, letterSpacing:0.5, textTransform:"uppercase", marginBottom:14}}>{title}</div>
    {children}
  </div>
);

window.ReceptionV2 = ReceptionV2;
