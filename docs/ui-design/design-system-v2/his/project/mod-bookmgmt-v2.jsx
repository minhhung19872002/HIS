// =====================================================================
// HIS Terminal · Module: QUẢN LÝ ĐẶT LỊCH (BookingManagement v2)
// Tổng hợp đặt lịch toàn viện, chỉnh sửa / huỷ / dời, thống kê theo BS-khoa
// =====================================================================

const BM_DEPTS = [
  { v: "noi-tm",  l: "Khoa Nội tim mạch" },
  { v: "noi-th",  l: "Khoa Nội tổng hợp" },
  { v: "noi-tk",  l: "Khoa Nội thần kinh" },
  { v: "ngoai-th",l: "Khoa Ngoại tổng quát" },
  { v: "ngoai-ct",l: "Khoa Ngoại chấn thương" },
  { v: "san",     l: "Khoa Sản" },
  { v: "nhi",     l: "Khoa Nhi" },
  { v: "rhm",     l: "Răng Hàm Mặt" },
  { v: "tmh",     l: "Tai Mũi Họng" },
  { v: "mat",     l: "Khoa Mắt" },
  { v: "da",      l: "Da liễu" },
  { v: "ung-buou",l: "Ung bướu" },
];

const BM_DOCTORS = [
  { v: "BS01", n: "BS. Nguyễn Văn Hùng",   d: "noi-tm",   t: "TS.BS" },
  { v: "BS02", n: "BS. Trần Thị Lan",      d: "noi-tm",   t: "ThS.BS" },
  { v: "BS03", n: "BS. Lê Văn Cường",      d: "noi-th",   t: "BS.CKII" },
  { v: "BS04", n: "BS. Phạm Thị Hương",    d: "noi-tk",   t: "ThS.BS" },
  { v: "BS05", n: "BS. Vũ Quốc An",        d: "ngoai-th", t: "TS.BS" },
  { v: "BS06", n: "BS. Đặng Minh Khoa",    d: "ngoai-ct", t: "BS.CKII" },
  { v: "BS07", n: "BS. Hoàng Thị Mai",     d: "san",      t: "BS.CKI" },
  { v: "BS08", n: "BS. Bùi Văn Tuấn",      d: "nhi",      t: "ThS.BS" },
  { v: "BS09", n: "BS. Mai Thị Huệ",       d: "rhm",      t: "BS.CKI" },
  { v: "BS10", n: "BS. Lý Văn Phong",      d: "tmh",      t: "BS.CKI" },
  { v: "BS11", n: "BS. Phan Thị Nga",      d: "mat",      t: "ThS.BS" },
  { v: "BS12", n: "BS. Đỗ Quang Sơn",      d: "da",       t: "BS.CKII" },
  { v: "BS13", n: "BS. Trịnh Thu Hà",      d: "ung-buou", t: "TS.BS" },
];

const BM_STATUS = [
  { v: "scheduled",  l: "Đã đặt",     tone: "info" },
  { v: "confirmed",  l: "Xác nhận",   tone: "info" },
  { v: "checkedin",  l: "Đã đến",     tone: "ok" },
  { v: "completed",  l: "Hoàn tất",   tone: "ok" },
  { v: "cancelled",  l: "Đã huỷ",     tone: "crit" },
  { v: "noshow",     l: "Không đến",  tone: "warn" },
  { v: "rescheduled",l: "Đã dời",     tone: "warn" },
];

const BM_CHANNEL = [
  { v: "online",  l: "Online", ic: "globe" },
  { v: "phone",   l: "Tổng đài", ic: "phone" },
  { v: "walkin",  l: "Tại quầy", ic: "user" },
  { v: "app",     l: "App di động", ic: "phone" },
  { v: "partner", l: "Đối tác", ic: "globe" },
];

const BM_REASON_CANCEL = [
  "Bệnh nhân yêu cầu huỷ",
  "BS bận đột xuất",
  "Trùng lịch",
  "Sai thông tin",
  "Không đủ điều kiện khám",
  "Thiết bị/phòng không sẵn sàng",
];

const BM_REASON_RESCHED = [
  "Theo yêu cầu của BN",
  "BS điều chuyển lịch",
  "Phòng khám thay đổi giờ",
  "Sự kiện đột xuất",
];

const BM_TIME_SLOTS = ["07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];

const dt = (dayOff, slot) => {
  const d = new Date(todayIv);
  d.setDate(d.getDate() + dayOff);
  const [h, m] = slot.split(":");
  d.setHours(+h, +m, 0, 0);
  return d;
};

const seedBookings = () => {
  const r = seedRand(31415);
  const list = [];
  for (let i = 0; i < 140; i++) {
    const dayOff = -10 + Math.floor(r() * 25); // -10..+15 days
    const doc = BM_DOCTORS[Math.floor(r() * BM_DOCTORS.length)];
    const slot = BM_TIME_SLOTS[Math.floor(r() * BM_TIME_SLOTS.length)];
    const apptAt = dt(dayOff, slot);
    let status;
    if (dayOff < -3) status = r() > 0.85 ? "noshow" : r() > 0.95 ? "cancelled" : "completed";
    else if (dayOff < 0) status = r() > 0.7 ? "completed" : r() > 0.4 ? "checkedin" : r() > 0.15 ? "noshow" : "cancelled";
    else if (dayOff === 0) status = r() > 0.6 ? "checkedin" : r() > 0.3 ? "confirmed" : "scheduled";
    else status = r() > 0.5 ? "confirmed" : r() > 0.85 ? "rescheduled" : r() > 0.95 ? "cancelled" : "scheduled";
    const channel = BM_CHANNEL[Math.floor(r() * BM_CHANNEL.length)].v;
    const isFollowUp = r() > 0.7;
    const fee = doc.t.startsWith("TS") ? 500000 : doc.t.startsWith("ThS") ? 350000 : 250000;
    const created = new Date(apptAt); created.setDate(created.getDate() - 1 - Math.floor(r() * 15));
    list.push({
      code: `BK.${String(2026000 + i).padStart(6, "0")}`,
      patient: {
        pid: rndPid(),
        name: rndName(i),
        age: 12 + Math.floor(r() * 70),
        gender: r() > 0.5 ? "Nam" : "Nữ",
        phone: rndPhone(),
        bhyt: r() > 0.3 ? `HC4${String(Math.floor(r()*999999)).padStart(6,"0")}` : null,
      },
      doctor: doc.v, doctorName: doc.n, dept: doc.d,
      apptAt, slot,
      status, channel,
      isFollowUp,
      symptoms: rndPick([
        "Đau ngực, khó thở khi gắng sức","Sốt cao 3 ngày, ho có đờm","Đau đầu, chóng mặt","Đau bụng vùng thượng vị",
        "Đau lưng dưới mạn tính","Khám sức khoẻ định kỳ","Đau khớp gối","Tê bì tay chân","Khó ngủ, hồi hộp",
        "Mất ngủ, lo âu","Tái khám điều chỉnh thuốc","Đau dạ dày","Ho khan kéo dài","Sốt phát ban",
      ]),
      fee,
      paid: ["completed","checkedin"].includes(status) ? fee : 0,
      note: r() > 0.7 ? "Yêu cầu BS giàu kinh nghiệm" : "",
      createdAt: created,
      createdBy: ["online"].includes(channel) ? "Tự đăng ký" : ["phone"].includes(channel) ? "TĐ. Mai" : ["app"].includes(channel) ? "App OneHealth" : "LT. Trang",
      cancelReason: status === "cancelled" ? rndPick(BM_REASON_CANCEL) : null,
      reschedFrom: status === "rescheduled" ? dt(dayOff - 3, slot) : null,
      audit: [
        { t: created.getTime(), action: `Tạo lịch hẹn (${BM_CHANNEL.find(c=>c.v===channel).l})`, by: ["online","app"].includes(channel) ? "Hệ thống" : "LT. Trang", tone: "info" },
        ...(status === "confirmed" ? [{ t: created.getTime() + 7200000, action: "Xác nhận lịch hẹn", by: "TĐ. Mai", tone: "info" }] : []),
        ...(status === "checkedin" ? [{ t: apptAt.getTime() - 600000, action: "Bệnh nhân đã đến tiếp đón", by: "LT. Trang", tone: "ok" }] : []),
        ...(status === "completed" ? [{ t: apptAt.getTime() + 1800000, action: "Hoàn tất khám", by: doc.n, tone: "ok" }] : []),
        ...(status === "cancelled" ? [{ t: apptAt.getTime() - 86400000, action: "Huỷ lịch hẹn", by: "BN", tone: "crit" }] : []),
        ...(status === "noshow" ? [{ t: apptAt.getTime() + 1800000, action: "Đánh dấu không đến", by: "Hệ thống", tone: "warn" }] : []),
      ],
    });
  }
  return list.sort((a, b) => b.apptAt - a.apptAt);
};

// MAIN
function BookingManagementV2() {
  const [bookings, setBookings] = uS(seedBookings);
  const [tab, setTab] = uS("today");
  const [stab, setStab] = uS("all");
  const [deptFilter, setDeptFilter] = uS("");
  const [docFilter, setDocFilter] = uS("");
  const [chanFilter, setChanFilter] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 16;

  // KPI
  const kpi = uM(() => {
    const today = bookings.filter(b => Math.abs((b.apptAt - todayIv)/86400000) < 1);
    const upcoming = bookings.filter(b => b.apptAt > todayIv && ["scheduled","confirmed","rescheduled"].includes(b.status));
    const cancelRate = bookings.filter(b => b.status === "cancelled").length;
    const noShowRate = bookings.filter(b => b.status === "noshow").length;
    const onlineCnt = bookings.filter(b => ["online","app"].includes(b.channel)).length;
    return { today: today.length, upcoming: upcoming.length, cancelRate, noShowRate, online: onlineCnt, total: bookings.length };
  }, [bookings]);

  const filtered = uM(() => {
    let res = bookings;
    if (tab === "today") res = res.filter(b => Math.abs((b.apptAt - todayIv)/86400000) < 1);
    else if (tab === "upcoming") res = res.filter(b => b.apptAt > todayIv && ["scheduled","confirmed","rescheduled"].includes(b.status));
    else if (tab === "past") res = res.filter(b => b.apptAt < todayIv);
    if (stab !== "all") res = res.filter(b => b.status === stab);
    if (deptFilter) res = res.filter(b => b.dept === deptFilter);
    if (docFilter) res = res.filter(b => b.doctor === docFilter);
    if (chanFilter) res = res.filter(b => b.channel === chanFilter);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(b => b.code.toLowerCase().includes(q) || b.patient.name.toLowerCase().includes(q) || b.patient.pid.toLowerCase().includes(q) || b.patient.phone.includes(q));
    }
    return res;
  }, [bookings, tab, stab, deptFilter, docFilter, chanFilter, search]);

  const counts = { all: bookings.length };
  BM_STATUS.forEach(s => counts[s.v] = bookings.filter(b => b.status === s.v).length);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  uE(() => { setPage(0); }, [tab, stab, deptFilter, docFilter, chanFilter, search]);

  // ACTIONS
  const upd = (code, patch) => setBookings(prev => prev.map(b => b.code === code ? { ...b, ...patch } : b));
  const audit = (code, action, tone="info") => upd(code, undefined) ?? setBookings(prev => prev.map(b => b.code === code ? { ...b, audit: [...b.audit, { t: Date.now(), action, by: "TĐ. Mai", tone }] } : b));

  const confirmBooking = (b) => { setBookings(prev => prev.map(x => x.code === b.code ? { ...x, status: "confirmed", audit: [...x.audit, { t: Date.now(), action: "Xác nhận lịch hẹn", by: "TĐ. Mai", tone: "info" }]} : x)); tk("Đã xác nhận " + b.code); };
  const cancelBooking = (b, reason) => { setBookings(prev => prev.map(x => x.code === b.code ? { ...x, status: "cancelled", cancelReason: reason, audit: [...x.audit, { t: Date.now(), action: "Huỷ lịch: " + reason, by: "TĐ. Mai", tone: "crit" }]} : x)); tw("Đã huỷ " + b.code); };
  const reschedBooking = (b, newDt) => { setBookings(prev => prev.map(x => x.code === b.code ? { ...x, status: "rescheduled", reschedFrom: x.apptAt, apptAt: newDt, audit: [...x.audit, { t: Date.now(), action: `Dời lịch sang ${fmtDTg(newDt)}`, by: "TĐ. Mai", tone: "warn" }]} : x)); tk("Đã dời lịch " + b.code); };
  const checkin = (b) => { setBookings(prev => prev.map(x => x.code === b.code ? { ...x, status: "checkedin", audit: [...x.audit, { t: Date.now(), action: "Tiếp đón BN tới khám", by: "LT. Trang", tone: "ok" }]} : x)); tk("Đã tiếp đón " + b.patient.name); };

  const openDetail = (b) => HUI.drawer(cx => <BookingDrawer b={b} cx={cx}
    onConfirm={() => { confirmBooking(b); cx(); }}
    onCancel={(r) => { cancelBooking(b, r); cx(); }}
    onResched={() => { cx(); openResched(b); }}
    onCheckin={() => { checkin(b); cx(); }}
  />);
  const openResched = (b) => HUI.open(cx => <ReschedModal b={b} cx={cx} onSubmit={(newDt) => { reschedBooking(b, newDt); cx(); }}/>);
  const openNew = () => HUI.open(cx => <NewBookingModal cx={cx} onSave={(nb) => { setBookings(prev => [nb, ...prev]); cx(); tk("Đã tạo lịch hẹn " + nb.code); }}/>);

  const cols = [
    { key: "code", label: "Mã", code: true, width: 130, render: r => <div>{r.code}{r.isFollowUp && <div><span className="ab-stat info" style={{height:16,padding:"0 5px",fontSize:9,marginTop:2}}>Tái khám</span></div>}</div> },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patient.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.patient.pid} · {r.patient.gender} · {r.patient.age}T · {r.patient.phone}</div></div> },
    { key: "doctor", label: "Bác sĩ / Khoa", render: r => <div><div style={{fontSize:12.5,fontWeight:500}}>{r.doctorName}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{BM_DEPTS.find(d => d.v === r.dept)?.l}</div></div> },
    { key: "appt", label: "Lịch hẹn", width: 120, mono: true, render: r => <div><div style={{fontWeight:600}}>{fmtDMYg(r.apptAt)}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{fmtHMg(r.apptAt)}</div></div> },
    { key: "channel", label: "Nguồn", width: 100, render: r => { const c = BM_CHANNEL.find(x => x.v === r.channel); return <span style={{fontSize:11,display:"inline-flex",alignItems:"center",gap:4,color:"var(--t-1)"}}><Ico name={c.ic} size={11}/>{c.l}</span>; }},
    { key: "fee", label: "Phí khám", width: 105, mono: true, render: r => fmtVNDg(r.fee) },
    { key: "status", label: "Trạng thái", width: 110, render: r => { const s = BM_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];

  const actions = (r) => (
    <div className="ab-row-act">
      {r.status === "scheduled" && <ActBtn ic="check" title="Xác nhận" onClick={() => confirmBooking(r)}/>}
      {["scheduled","confirmed","rescheduled"].includes(r.status) && r.apptAt > todayIv && <ActBtn ic="clock" title="Dời lịch" onClick={() => openResched(r)}/>}
      {["scheduled","confirmed","rescheduled"].includes(r.status) && Math.abs((r.apptAt - todayIv)/86400000) < 1 && <ActBtn ic="user" title="Tiếp đón" onClick={() => checkin(r)}/>}
      {["scheduled","confirmed","rescheduled"].includes(r.status) && <ActBtn ic="x" tone="crit" title="Huỷ lịch" onClick={() => cf("Huỷ lịch hẹn này?", () => cancelBooking(r, "BN yêu cầu huỷ"), { tone: "warn" })}/>}
      <ActBtn ic="print" title="In phiếu hẹn" onClick={() => ti("Đang in " + r.code)}/>
    </div>
  );

  uE(() => {
    const h = (e) => { if (e.key === "F2" && !e.target.closest("input,textarea,select,[contenteditable]")) { e.preventDefault(); (openNew)(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);


  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Hôm nay", val: kpi.today, sub: "lịch hẹn", tone: "info" },
        { lbl: "Sắp tới", val: kpi.upcoming, sub: "đã xác nhận", tone: "ok" },
        { lbl: "Đã huỷ", val: kpi.cancelRate, sub: `${Math.round(kpi.cancelRate/kpi.total*100)}%`, tone: kpi.cancelRate > 8 ? "warn" : null },
        { lbl: "Không đến", val: kpi.noShowRate, sub: `${Math.round(kpi.noShowRate/kpi.total*100)}%`, tone: "warn" },
        { lbl: "Đặt online/app", val: kpi.online, sub: `${Math.round(kpi.online/kpi.total*100)}%`, tone: "info" },
        { lbl: "Tổng cộng", val: kpi.total, sub: "lịch hẹn / 25 ngày" },
      ]}/>

      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "today",    l: `Hôm nay (${kpi.today})`,  ic: "clock" },
        { v: "upcoming", l: `Sắp tới (${kpi.upcoming})`, ic: "calendar" },
        { v: "past",     l: "Đã qua",                   ic: "back" },
        { v: "all",      l: "Tất cả",                   ic: "list" },
      ]} actions={
        <>
          <button className="ab-btn ghost sm" onClick={() => ti("Đang xuất Excel...")}><Ico name="download" size={12}/> Excel</button>
          <button className="ab-btn ghost sm" onClick={() => ti("Mở lịch dạng calendar")}><Ico name="calendar" size={12}/> Lịch tuần</button>
          <button className="ab-btn primary" onClick={openNew}><Ico name="plus" size={12}/> Đặt lịch <kbd>F2</kbd></button>
        </>
      }/>

      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã / tên BN / mã BN / SĐT..."/>
        <Filter value={deptFilter} onChange={(v) => { setDeptFilter(v); setDocFilter(""); }} options={BM_DEPTS} placeholder="Tất cả khoa"/>
        <Filter value={docFilter} onChange={setDocFilter} options={BM_DOCTORS.filter(d => !deptFilter || d.d === deptFilter).map(d => ({ v: d.v, l: d.n }))} placeholder="Tất cả BS"/>
        <Filter value={chanFilter} onChange={setChanFilter} options={BM_CHANNEL} placeholder="Mọi nguồn"/>
      </div>

      <StatusTabs value={stab} onChange={setStab} tabs={BM_STATUS} counts={counts}/>

      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={openDetail} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}

// ── Detail drawer ──
const BookingDrawer = ({ b, cx, onConfirm, onCancel, onResched, onCheckin }) => {
  const [tab, setTab] = uS("info");
  const stat = BM_STATUS.find(s => s.v === b.status);
  const chan = BM_CHANNEL.find(c => c.v === b.channel);
  const isUpcoming = ["scheduled","confirmed","rescheduled"].includes(b.status);
  const isToday = Math.abs((b.apptAt - todayIv)/86400000) < 1;
  return (
    <HUI.Drawer
      title={b.code}
      sub={<>{b.patient.name} · <StatusBadge tone={stat.tone} dot>{stat.l}</StatusBadge></>}
      width={680} onClose={cx}
      tabs={[{ id: "info", label: "Thông tin" }, { id: "audit", label: `Lịch sử (${b.audit.length})` }]}
      activeTab={tab} onTab={setTab}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn" onClick={() => ti("Đang in " + b.code)}><Ico name="print" size={12}/> In phiếu</button>
        {isUpcoming && <>
          <button className="ab-btn" onClick={() => cf("Huỷ lịch hẹn này?", () => onCancel("BN yêu cầu huỷ"), { tone: "warn" })}><Ico name="x" size={12}/> Huỷ lịch</button>
          <button className="ab-btn" onClick={onResched}><Ico name="clock" size={12}/> Dời lịch</button>
          {b.status === "scheduled" && <button className="ab-btn primary" onClick={onConfirm}><Ico name="check" size={12}/> Xác nhận</button>}
          {isToday && <button className="ab-btn primary" onClick={onCheckin}><Ico name="user" size={12}/> Tiếp đón</button>}
        </>}
      </>}>
      {tab === "info" && <>
        <DrSec title="Bệnh nhân">
          <DrField lbl="Họ tên">{b.patient.name}</DrField>
          <DrField lbl="Mã BN"><b style={{fontFamily:"var(--font-mono)"}}>{b.patient.pid}</b></DrField>
          <DrField lbl="Giới · Tuổi">{b.patient.gender} · {b.patient.age} tuổi</DrField>
          <DrField lbl="Điện thoại"><span style={{fontFamily:"var(--font-mono)"}}>{b.patient.phone}</span></DrField>
          {b.patient.bhyt && <DrField lbl="BHYT"><span style={{fontFamily:"var(--font-mono)"}}>{b.patient.bhyt}</span></DrField>}
        </DrSec>
        <DrSec title="Lịch hẹn">
          <DrField lbl="Ngày giờ"><b style={{fontFamily:"var(--font-mono)",fontSize:14}}>{fmtDTg(b.apptAt)}</b></DrField>
          <DrField lbl="Bác sĩ">{b.doctorName}</DrField>
          <DrField lbl="Khoa">{BM_DEPTS.find(d => d.v === b.dept)?.l}</DrField>
          <DrField lbl="Loại khám">{b.isFollowUp ? "Tái khám" : "Khám mới"}</DrField>
          <DrField lbl="Triệu chứng">{b.symptoms}</DrField>
          {b.note && <DrField lbl="Ghi chú">{b.note}</DrField>}
        </DrSec>
        <DrSec title="Đặt lịch">
          <DrField lbl="Nguồn"><span style={{display:"inline-flex",alignItems:"center",gap:6}}><Ico name={chan.ic} size={12}/> {chan.l}</span></DrField>
          <DrField lbl="Người đặt">{b.createdBy}</DrField>
          <DrField lbl="Thời điểm">{fmtDTg(b.createdAt)}</DrField>
          <DrField lbl="Phí khám"><b style={{fontFamily:"var(--font-mono)"}}>{fmtVNDg(b.fee)}</b></DrField>
          {b.paid > 0 && <DrField lbl="Đã thanh toán"><span style={{color:"var(--s-ok)",fontFamily:"var(--font-mono)"}}>{fmtVNDg(b.paid)}</span></DrField>}
        </DrSec>
        {b.cancelReason && <DrSec title="Lý do huỷ"><div style={{padding:"10px 12px",background:"var(--a-em-bg)",border:"1px solid var(--a-em-line)",borderRadius:6,fontSize:13,color:"var(--s-crit)"}}>{b.cancelReason}</div></DrSec>}
        {b.reschedFrom && <DrSec title="Đã dời từ"><div style={{padding:"10px 12px",background:"var(--a-mg-bg)",border:"1px solid var(--a-mg-line)",borderRadius:6,fontSize:13,color:"var(--s-warn)"}}>{fmtDTg(b.reschedFrom)} → {fmtDTg(b.apptAt)}</div></DrSec>}
      </>}
      {tab === "audit" && <DrSec title={`Nhật ký · ${b.audit.length} sự kiện`}>{b.audit.map((a,i) => <AuditLine key={i} entry={a}/>)}</DrSec>}
    </HUI.Drawer>
  );
};

// ── Reschedule modal ──
const ReschedModal = ({ b, cx, onSubmit }) => {
  const [day, setDay] = uS(1);
  const [slot, setSlot] = uS(b.slot);
  const [reason, setReason] = uS(BM_REASON_RESCHED[0]);
  const submit = () => {
    const newDt = dt(day, slot);
    onSubmit(newDt);
  };
  return (
    <HUI.Modal title={`Dời lịch hẹn ${b.code}`} size="md" onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Huỷ</button>
        <button className="ab-btn primary" onClick={submit}><Ico name="check" size={12}/> Dời lịch</button>
      </>}>
      <div style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,marginBottom:12,fontSize:13}}>
        <div><b>{b.patient.name}</b> · {b.patient.pid}</div>
        <div style={{color:"var(--t-2)",marginTop:4}}>{b.doctorName} · {fmtDTg(b.apptAt)}</div>
      </div>
      <HUI.Row cols={2}>
        <HUI.Field label="Ngày mới">
          <HUI.Select value={day} onChange={e => setDay(+e.target.value)} options={Array.from({length: 14}, (_, i) => ({ value: i+1, label: fmtDMYg(dt(i+1, "00:00")) + ` (T${dt(i+1,"00:00").getDay()===0?"CN":dt(i+1,"00:00").getDay()+1})` }))}/>
        </HUI.Field>
        <HUI.Field label="Giờ mới">
          <HUI.Select value={slot} onChange={e => setSlot(e.target.value)} options={BM_TIME_SLOTS}/>
        </HUI.Field>
      </HUI.Row>
      <HUI.Field label="Lý do dời lịch" required>
        <HUI.Select value={reason} onChange={e => setReason(e.target.value)} options={BM_REASON_RESCHED}/>
      </HUI.Field>
    </HUI.Modal>
  );
};

// ── New booking modal ──
const NewBookingModal = ({ cx, onSave }) => {
  const [form, setForm] = uS({
    pid: "", name: "", age: 35, gender: "Nam", phone: "", bhyt: "",
    dept: BM_DEPTS[0].v, doctor: BM_DOCTORS[0].v, day: 1, slot: "08:00",
    isFollowUp: false, symptoms: "", note: "",
    channel: "walkin",
  });
  const [err, setErr] = uS({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const docs = BM_DOCTORS.filter(d => d.d === form.dept);
  uE(() => { if (docs[0] && form.doctor !== docs[0].v && !docs.find(d => d.v === form.doctor)) setForm(p => ({ ...p, doctor: docs[0].v })); }, [form.dept]);

  const save = () => {
    const e = {};
    if (!form.pid.trim()) e.pid = "Bắt buộc";
    if (!form.name.trim()) e.name = "Bắt buộc";
    if (!form.phone.match(/^0\d{9}$/)) e.phone = "SĐT không hợp lệ";
    if (!form.symptoms.trim()) e.symptoms = "Mô tả triệu chứng";
    setErr(e);
    if (Object.keys(e).length > 0) { tw("Vui lòng kiểm tra"); return; }
    const doc = BM_DOCTORS.find(d => d.v === form.doctor);
    const apptAt = dt(form.day, form.slot);
    const fee = doc.t.startsWith("TS") ? 500000 : doc.t.startsWith("ThS") ? 350000 : 250000;
    const code = `BK.${String(2026900 + Math.floor(Math.random()*100)).padStart(6,"0")}`;
    onSave({
      code,
      patient: { pid: form.pid, name: form.name, age: form.age, gender: form.gender, phone: form.phone, bhyt: form.bhyt || null },
      doctor: doc.v, doctorName: doc.n, dept: doc.d,
      apptAt, slot: form.slot,
      status: "scheduled", channel: form.channel,
      isFollowUp: form.isFollowUp,
      symptoms: form.symptoms, fee, paid: 0, note: form.note,
      createdAt: new Date(), createdBy: "LT. Trang",
      cancelReason: null, reschedFrom: null,
      audit: [{ t: Date.now(), action: `Tạo lịch hẹn (${BM_CHANNEL.find(c=>c.v===form.channel).l})`, by: "LT. Trang", tone: "info" }],
    });
  };

  return (
    <HUI.Modal title="Đặt lịch hẹn mới" size="lg" onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Huỷ</button>
        <button className="ab-btn primary" onClick={save}><Ico name="check" size={12}/> Tạo lịch hẹn</button>
      </>}>
      <h4 style={{margin:"0 0 8px",fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>Bệnh nhân</h4>
      <HUI.Row cols={3}>
        <HUI.Field label="Mã BN" required error={err.pid}><HUI.Input value={form.pid} onChange={e => set("pid", e.target.value)} placeholder="BN-xxxxx" icon="search"/></HUI.Field>
        <HUI.Field label="Họ tên" required error={err.name}><HUI.Input value={form.name} onChange={e => set("name", e.target.value)}/></HUI.Field>
        <HUI.Field label="Điện thoại" required error={err.phone}><HUI.Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="09xxxxxxxx"/></HUI.Field>
        <HUI.Field label="Tuổi"><HUI.Input type="number" value={form.age} onChange={e => set("age", +e.target.value)}/></HUI.Field>
        <HUI.Field label="Giới"><HUI.Select value={form.gender} onChange={e => set("gender", e.target.value)} options={["Nam","Nữ"]}/></HUI.Field>
        <HUI.Field label="BHYT (nếu có)"><HUI.Input value={form.bhyt} onChange={e => set("bhyt", e.target.value)} placeholder="HC4..."/></HUI.Field>
      </HUI.Row>
      <h4 style={{margin:"16px 0 8px",fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>Lịch khám</h4>
      <HUI.Row cols={2}>
        <HUI.Field label="Khoa" required><HUI.Select value={form.dept} onChange={e => set("dept", e.target.value)} options={BM_DEPTS.map(d => ({ value: d.v, label: d.l }))}/></HUI.Field>
        <HUI.Field label="Bác sĩ" required><HUI.Select value={form.doctor} onChange={e => set("doctor", e.target.value)} options={docs.map(d => ({ value: d.v, label: `${d.t} ${d.n.replace("BS. ","")}` }))}/></HUI.Field>
        <HUI.Field label="Ngày">
          <HUI.Select value={form.day} onChange={e => set("day", +e.target.value)} options={Array.from({length: 14}, (_, i) => ({ value: i+1, label: fmtDMYg(dt(i+1, "00:00")) }))}/>
        </HUI.Field>
        <HUI.Field label="Giờ"><HUI.Select value={form.slot} onChange={e => set("slot", e.target.value)} options={BM_TIME_SLOTS}/></HUI.Field>
        <HUI.Field label="Loại khám"><HUI.Select value={form.isFollowUp ? "1" : "0"} onChange={e => set("isFollowUp", e.target.value === "1")} options={[{ value: "0", label: "Khám mới" }, { value: "1", label: "Tái khám" }]}/></HUI.Field>
        <HUI.Field label="Nguồn đặt"><HUI.Select value={form.channel} onChange={e => set("channel", e.target.value)} options={BM_CHANNEL.map(c => ({ value: c.v, label: c.l }))}/></HUI.Field>
        <HUI.Field label="Triệu chứng / Lý do" span={2} required error={err.symptoms}><HUI.Textarea rows={2} value={form.symptoms} onChange={e => set("symptoms", e.target.value)}/></HUI.Field>
        <HUI.Field label="Ghi chú" span={2}><HUI.Input value={form.note} onChange={e => set("note", e.target.value)} placeholder="Tuỳ chọn"/></HUI.Field>
      </HUI.Row>
    </HUI.Modal>
  );
};

window.BookingManagementV2 = BookingManagementV2;
