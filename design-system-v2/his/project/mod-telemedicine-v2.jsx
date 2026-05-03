// =====================================================================
// HIS Terminal · Module: KHÁM TỪ XA (Telemedicine v2)
// =====================================================================
const TM_STATUS = [
  { v: "scheduled", l: "Đã đặt", tone: "info" },
  { v: "waiting",   l: "Chờ vào phòng", tone: "warn" },
  { v: "ongoing",   l: "Đang khám", tone: "ok" },
  { v: "completed", l: "Hoàn tất", tone: "ok" },
  { v: "noshow",    l: "Không tham gia", tone: "crit" },
  { v: "cancelled", l: "Đã huỷ", tone: "crit" },
];

const seedTele = () => {
  const r = seedRand(70707);
  const list = [];
  const docs = ["BS. Nguyễn Văn Hùng","BS. Trần Thị Lan","BS. Lê Văn Cường","BS. Phạm Thị Hương","BS. Vũ Quốc An"];
  const subs = ["Tăng huyết áp - tái khám","Đái tháo đường type 2","Tư vấn xét nghiệm","Đau đầu mạn tính","Bệnh mạn tính - kê đơn","Theo dõi sau phẫu thuật","Khám sức khoẻ định kỳ","Ho kéo dài","Da liễu - mụn","Tâm lý - lo âu"];
  for (let i = 0; i < 70; i++) {
    const dayOff = -5 + Math.floor(r() * 12);
    const t = new Date(todayIv); t.setDate(t.getDate() + dayOff); t.setHours(8 + Math.floor(r()*9), Math.floor(r()*4)*15, 0, 0);
    let st;
    if (dayOff < 0) st = r() > 0.85 ? "noshow" : "completed";
    else if (dayOff === 0) st = r() > 0.7 ? "ongoing" : r() > 0.4 ? "waiting" : "scheduled";
    else st = r() > 0.95 ? "cancelled" : "scheduled";
    list.push({
      code: `TM.${String(2026000 + i).padStart(6,"0")}`,
      pid: rndPid(), name: rndName(i), age: 12 + Math.floor(r()*70),
      doctor: docs[Math.floor(r()*docs.length)],
      subject: subs[Math.floor(r()*subs.length)],
      apptAt: t,
      duration: [15,20,30][Math.floor(r()*3)],
      status: st,
      platform: r() > 0.5 ? "Zoom" : "OneHealth Live",
      fee: 200000 + Math.floor(r()*4) * 100000,
      paid: ["completed","ongoing"].includes(st),
      meetingId: `${Math.floor(r()*1e10)}`.padStart(10,"0"),
    });
  }
  return list.sort((a,b) => b.apptAt - a.apptAt);
};

function TelemedicineV2() {
  const [rows, setRows] = uS(seedTele);
  const [stab, setStab] = uS("all");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 16;

  const counts = { all: rows.length };
  TM_STATUS.forEach(s => counts[s.v] = rows.filter(r => r.status === s.v).length);
  const filtered = uM(() => {
    let r = rows;
    if (stab !== "all") r = r.filter(x => x.status === stab);
    if (search) { const q = search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q) || x.pid.toLowerCase().includes(q)); }
    return r;
  }, [rows, stab, search]);
  uE(() => setPage(0), [stab, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);

  const join = (r) => { setRows(p => p.map(x => x.code === r.code ? { ...x, status: "ongoing" } : x)); tk("Đang vào phòng " + r.code); };
  const complete = (r) => { setRows(p => p.map(x => x.code === r.code ? { ...x, status: "completed" } : x)); tk("Đã hoàn tất " + r.code); };
  const open = (r) => { const s = TM_STATUS.find(x => x.v === r.status); HUI.drawer(cx => (
    <HUI.Drawer title={r.code} sub={<>{r.name} · <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge></>} width={680} onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        {["scheduled","waiting"].includes(r.status) && <button className="ab-btn primary" onClick={() => { join(r); cx(); }}><Ico name="check" size={12}/> Vào phòng khám</button>}
        {r.status === "ongoing" && <button className="ab-btn primary" onClick={() => { complete(r); cx(); }}><Ico name="check" size={12}/> Kết thúc</button>}
      </>}>
      <DrSec title="Bệnh nhân">
        <DrField lbl="Mã BN">{r.pid}</DrField>
        <DrField lbl="Họ tên">{r.name}</DrField>
        <DrField lbl="Tuổi">{r.age}</DrField>
      </DrSec>
      <DrSec title="Lịch khám">
        <DrField lbl="Bác sĩ">{r.doctor}</DrField>
        <DrField lbl="Chủ đề">{r.subject}</DrField>
        <DrField lbl="Lịch hẹn">{fmtDMYg(r.apptAt)} {fmtHMg(r.apptAt)}</DrField>
        <DrField lbl="Thời lượng">{r.duration} phút</DrField>
        <DrField lbl="Nền tảng">{r.platform}</DrField>
        <DrField lbl="Meeting ID">{r.meetingId}</DrField>
      </DrSec>
      <DrSec title="Thanh toán">
        <DrField lbl="Phí khám">{fmtVNDg(r.fee)}</DrField>
        <DrField lbl="Đã thanh toán">{r.paid ? "✓ Đã thanh toán" : "Chưa thanh toán"}</DrField>
        <DrField lbl="Trạng thái"><StatusBadge tone={s.tone} dot>{s.l}</StatusBadge></DrField>
      </DrSec>
    </HUI.Drawer>
  )); };

  const cols = [
    { key: "code", label: "Mã", code: true, width: 130 },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T</div></div> },
    { key: "doctor", label: "Bác sĩ", width: 200, render: r => r.doctor },
    { key: "subject", label: "Chủ đề" },
    { key: "appt", label: "Lịch hẹn", width: 130, mono: true, render: r => <div><div style={{fontWeight:600}}>{fmtDMYg(r.apptAt)}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{fmtHMg(r.apptAt)} · {r.duration}p</div></div> },
    { key: "platform", label: "Nền tảng", width: 110, render: r => <span style={{fontSize:11,color:"var(--t-2)"}}>{r.platform}</span> },
    { key: "fee", label: "Phí", width: 100, mono: true, render: r => fmtVNDg(r.fee) },
    { key: "status", label: "Trạng thái", width: 130, render: r => { const s = TM_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];
  const actions = (r) => (
    <div className="ab-row-act">
      {["scheduled","waiting"].includes(r.status) && <ActBtn ic="check" title="Vào phòng" onClick={() => join(r)}/>}
      {r.status === "ongoing" && <ActBtn ic="check" tone="ok" title="Kết thúc" onClick={() => complete(r)}/>}
      <ActBtn ic="phone" title="Gọi BN"/>
    </div>
  );
  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Hôm nay", val: rows.filter(r => Math.abs((r.apptAt-todayIv)/86400000)<1).length, sub: "lịch hẹn", tone: "info" },
        { lbl: "Đang khám", val: counts.ongoing, tone: "ok" },
        { lbl: "Chờ vào phòng", val: counts.waiting, tone: "warn" },
        { lbl: "Hoàn tất 7 ngày", val: counts.completed, tone: "ok" },
        { lbl: "Không tham gia", val: counts.noshow, tone: "crit" },
        { lbl: "Tổng cộng", val: rows.length },
      ]}/>
      <TopTabs tab="all" setTab={()=>{}} tabs={[{ v: "all", l: `Lịch khám từ xa (${rows.length})`, ic: "globe" }]} actions={
        <>
          <button className="ab-btn ghost sm"><Ico name="download" size={12}/> Xuất Excel</button>
          <button className="ab-btn primary"><Ico name="plus" size={12}/> Đặt lịch khám từ xa</button>
        </>
      }/>
      <div className="ab-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / mã lịch hẹn..."/></div>
      <StatusTabs value={stab} onChange={setStab} tabs={TM_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}
window.TelemedicineV2 = TelemedicineV2;
