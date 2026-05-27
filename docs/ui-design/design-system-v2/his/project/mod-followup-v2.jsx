// =====================================================================
// HIS Terminal · Module: TÁI KHÁM (FollowUp v2)
// =====================================================================
const FU_STATUS = [
  { v: "scheduled", l: "Đã hẹn", tone: "info" },
  { v: "reminded",  l: "Đã nhắc", tone: "info" },
  { v: "completed", l: "Đã tái khám", tone: "ok" },
  { v: "missed",    l: "Bỏ lỡ", tone: "crit" },
  { v: "cancelled", l: "Đã huỷ", tone: "crit" },
  { v: "rescheduled", l: "Đã dời", tone: "warn" },
];

const seedFU = () => {
  const r = seedRand(33445);
  const list = [];
  const dx = ["Tăng huyết áp","Đái tháo đường","Hậu phẫu thuật","Ung bướu (theo phác đồ)","Suy thận mạn","Hen suyễn","Bệnh tim mạch","Viêm gan B"];
  const cycle = ["1 tuần","2 tuần","1 tháng","3 tháng","6 tháng"];
  for (let i = 0; i < 75; i++) {
    const dayOff = -7 + Math.floor(r()*30);
    const apptAt = new Date(todayIv); apptAt.setDate(apptAt.getDate() + dayOff); apptAt.setHours(8 + Math.floor(r()*8), 0, 0, 0);
    let st;
    if (dayOff < -1) st = r() > 0.7 ? "completed" : r() > 0.4 ? "missed" : "rescheduled";
    else if (dayOff < 2) st = r() > 0.6 ? "reminded" : "scheduled";
    else st = r() > 0.95 ? "cancelled" : "scheduled";
    list.push({
      code: `TK.${String(2026000 + i).padStart(6,"0")}`,
      pid: rndPid(), name: rndName(i), phone: rndPhone(),
      diagnosis: dx[Math.floor(r()*dx.length)],
      cycle: cycle[Math.floor(r()*cycle.length)],
      doctor: rndPick(["BS. Nguyễn Văn Hùng","BS. Trần Thị Lan","BS. Lê Văn Cường","BS. Phạm Thị Hương","BS. Vũ Quốc An"]),
      apptAt,
      lastVisit: new Date(apptAt.getTime() - 30*86400000 - Math.floor(r()*60)*86400000),
      status: st,
      remindCount: ["reminded","completed","missed"].includes(st) ? 1 + Math.floor(r()*2) : 0,
      remindChannel: r() > 0.5 ? "SMS" : "Zalo",
    });
  }
  return list.sort((a,b) => a.apptAt - b.apptAt);
};

function FollowUpV2() {
  const [rows, setRows] = uS(seedFU);
  const [stab, setStab] = uS("all");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 16;
  const counts = { all: rows.length };
  FU_STATUS.forEach(s => counts[s.v] = rows.filter(r => r.status === s.v).length);
  const filtered = uM(() => {
    let r = rows;
    if (stab !== "all") r = r.filter(x => x.status === stab);
    if (search) { const q = search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q) || x.pid.toLowerCase().includes(q)); }
    return r;
  }, [rows, stab, search]);
  uE(() => setPage(0), [stab, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);

  const remind = (r, channel = "SMS") => { setRows(p => p.map(x => x.code === r.code ? { ...x, status: "reminded", remindCount: x.remindCount + 1, remindChannel: channel } : x)); tk(`Đã gửi nhắc ${channel} cho ${r.name}`); };
  const open = (r) => { const s = FU_STATUS.find(x => x.v === r.status); HUI.drawer(cx => (
    <HUI.Drawer title={r.code} sub={<>{r.name} · <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge></>} width={680} onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        {["scheduled","reminded"].includes(r.status) && <>
          <button className="ab-btn ghost" onClick={() => { remind(r, "SMS"); cx(); }}><Ico name="globe" size={12}/> Nhắc SMS</button>
          <button className="ab-btn ghost" onClick={() => { remind(r, "Zalo"); cx(); }}><Ico name="globe" size={12}/> Nhắc Zalo</button>
        </>}
        <button className="ab-btn primary" onClick={() => { ti("Đang gọi " + r.phone); cx(); }}><Ico name="phone" size={12}/> Gọi BN</button>
      </>}>
      <DrSec title="Bệnh nhân">
        <DrField lbl="Mã BN">{r.pid}</DrField>
        <DrField lbl="Họ tên">{r.name}</DrField>
        <DrField lbl="Điện thoại">{r.phone}</DrField>
      </DrSec>
      <DrSec title="Bệnh lý theo dõi">
        <DrField lbl="Chẩn đoán">{r.diagnosis}</DrField>
        <DrField lbl="Chu kỳ tái khám">{r.cycle}</DrField>
        <DrField lbl="Bác sĩ phụ trách">{r.doctor}</DrField>
      </DrSec>
      <DrSec title="Lịch hẹn">
        <DrField lbl="Hẹn tái khám">{fmtDMYg(r.apptAt)} {fmtHMg(r.apptAt)}</DrField>
        <DrField lbl="Khám gần nhất">{fmtDMYg(r.lastVisit)}</DrField>
        <DrField lbl="Số lần nhắc">{r.remindCount > 0 ? `${r.remindCount} (${r.remindChannel})` : "Chưa nhắc"}</DrField>
        <DrField lbl="Trạng thái"><StatusBadge tone={s.tone} dot>{s.l}</StatusBadge></DrField>
      </DrSec>
    </HUI.Drawer>
  )); };
  const remindAll = () => { const due = rows.filter(r => r.status === "scheduled" && (r.apptAt - todayIv) < 86400000*3); due.forEach(r => remind(r)); ti(`Đã gửi nhắc ${due.length} BN`); };

  const cols = [
    { key: "code", label: "Mã", code: true, width: 130 },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{r.pid} · {r.phone}</div></div> },
    { key: "diagnosis", label: "Bệnh lý", render: r => <div>{r.diagnosis}<div style={{fontSize:11,color:"var(--t-2)"}}>Chu kỳ: {r.cycle}</div></div> },
    { key: "doctor", label: "Bác sĩ", width: 180 },
    { key: "apptAt", label: "Hẹn tái khám", width: 130, mono: true, render: r => <div><div style={{fontWeight:600}}>{fmtDMYg(r.apptAt)}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{fmtHMg(r.apptAt)}</div></div> },
    { key: "lastVisit", label: "Khám gần nhất", width: 110, mono: true, render: r => fmtDMYg(r.lastVisit) },
    { key: "remind", label: "Nhắc", width: 80, mono: true, render: r => r.remindCount > 0 ? `${r.remindCount} (${r.remindChannel})` : "—" },
    { key: "status", label: "Trạng thái", width: 110, render: r => { const s = FU_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];
  const actions = (r) => (
    <div className="ab-row-act">
      {["scheduled","reminded"].includes(r.status) && <>
        <ActBtn ic="phone" title="Gọi" onClick={() => ti("Đang gọi " + r.phone)}/>
        <ActBtn ic="globe" title="Nhắc SMS" onClick={() => remind(r, "SMS")}/>
      </>}
    </div>
  );
  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Hẹn 7 ngày tới", val: rows.filter(r => r.status === "scheduled" && (r.apptAt-todayIv) < 7*86400000 && (r.apptAt-todayIv) > 0).length, tone: "info" },
        { lbl: "Đã nhắc", val: counts.reminded, tone: "info" },
        { lbl: "Đã tái khám", val: counts.completed, tone: "ok" },
        { lbl: "Bỏ lỡ", val: counts.missed, tone: "crit" },
        { lbl: "Tỷ lệ tuân thủ", val: `${Math.round(counts.completed/(counts.completed+counts.missed)*100)}%`, tone: "ok" },
        { lbl: "Tổng kế hoạch", val: rows.length },
      ]}/>
      <TopTabs tab="all" setTab={()=>{}} tabs={[{ v: "all", l: `Lịch tái khám (${rows.length})`, ic: "calendar" }]} actions={
        <>
          <button className="ab-btn ghost sm" onClick={remindAll}><Ico name="globe" size={12}/> Nhắc hàng loạt</button>
          <button className="ab-btn ghost sm"><Ico name="download" size={12}/> Xuất Excel</button>
          <button className="ab-btn primary"><Ico name="plus" size={12}/> Lập kế hoạch tái khám</button>
        </>
      }/>
      <div className="ab-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / SĐT / mã..."/></div>
      <StatusTabs value={stab} onChange={setStab} tabs={FU_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}
window.FollowUpV2 = FollowUpV2;
