// =====================================================================
// HIS Terminal · Module: KÊ ĐƠN (Prescription v2)
// =====================================================================
const PR_STATUS = [
  { v: "draft", l: "Nháp", tone: null },
  { v: "signed", l: "Đã ký", tone: "info" },
  { v: "dispensed", l: "Đã cấp phát", tone: "ok" },
  { v: "cancelled", l: "Đã huỷ", tone: "crit" },
  { v: "review", l: "Chờ duyệt", tone: "warn" },
];

const PR_DRUGS = [
  { code: "PA001", name: "Paracetamol 500mg", form: "Viên nén" },
  { code: "AM001", name: "Amoxicillin 500mg", form: "Viên nang" },
  { code: "AS001", name: "Atorvastatin 20mg", form: "Viên nén" },
  { code: "MT001", name: "Metformin 500mg", form: "Viên nén" },
  { code: "AM002", name: "Amlodipine 5mg", form: "Viên nén" },
  { code: "OM001", name: "Omeprazole 20mg", form: "Viên nang" },
  { code: "EN001", name: "Enalapril 10mg", form: "Viên nén" },
  { code: "DI001", name: "Diclofenac 50mg", form: "Viên nén" },
];

const seedPresc = () => {
  const r = seedRand(40404);
  const list = [];
  const docs = ["BS. Nguyễn Văn Hùng","BS. Trần Thị Lan","BS. Lê Văn Cường","BS. Phạm Thị Hương"];
  const dx = ["I10 · Tăng huyết áp","E11 · Đái tháo đường","J18 · Viêm phổi","K29 · Viêm dạ dày","M54 · Đau lưng","R51 · Đau đầu"];
  for (let i = 0; i < 90; i++) {
    const t = new Date(todayIv); t.setDate(t.getDate() - Math.floor(r()*10)); t.setHours(8 + Math.floor(r()*9), Math.floor(r()*60), 0, 0);
    const sts = r() > 0.5 ? "dispensed" : r() > 0.3 ? "signed" : r() > 0.15 ? "review" : r() > 0.05 ? "draft" : "cancelled";
    const items = Array.from({length: 2 + Math.floor(r()*5)}, () => {
      const d = PR_DRUGS[Math.floor(r() * PR_DRUGS.length)];
      const days = [3,5,7,10,14,28][Math.floor(r()*6)];
      const qty = days * (1 + Math.floor(r()*2));
      return { ...d, qty, days, dose: `${1 + Math.floor(r()*2)} viên × ${1 + Math.floor(r()*3)} lần/ngày` };
    });
    const total = items.reduce((s, it) => s + it.qty * (1500 + Math.floor(r()*3000)), 0);
    list.push({
      code: `DT.${String(2026000 + i).padStart(6,"0")}`,
      pid: rndPid(), name: rndName(i), age: 25 + Math.floor(r()*55),
      doctor: docs[Math.floor(r()*docs.length)],
      diagnosis: dx[Math.floor(r()*dx.length)],
      issuedAt: t,
      status: sts,
      items, total,
      bhytCovered: r() > 0.3,
      type: r() > 0.7 ? "Tái khám" : "Khám mới",
    });
  }
  return list.sort((a,b) => b.issuedAt - a.issuedAt);
};

function PrescriptionV2() {
  const [rows, setRows] = uS(seedPresc);
  const [stab, setStab] = uS("all");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 16;
  const counts = { all: rows.length };
  PR_STATUS.forEach(s => counts[s.v] = rows.filter(r => r.status === s.v).length);
  const filtered = uM(() => {
    let r = rows;
    if (stab !== "all") r = r.filter(x => x.status === stab);
    if (search) { const q = search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q) || x.pid.toLowerCase().includes(q)); }
    return r;
  }, [rows, stab, search]);
  uE(() => setPage(0), [stab, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const sign = (r) => { setRows(p => p.map(x => x.code === r.code ? { ...x, status: "signed" } : x)); tk("Đã ký số " + r.code); };
  const dispense = (r) => { setRows(p => p.map(x => x.code === r.code ? { ...x, status: "dispensed" } : x)); tk("Đã cấp phát " + r.code); };
  const open = (r) => HUI.drawer(cx => (
    <HUI.Drawer title={r.code} sub={<>{r.name} · <StatusBadge tone={PR_STATUS.find(s=>s.v===r.status).tone} dot>{PR_STATUS.find(s=>s.v===r.status).l}</StatusBadge></>} width={680} onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn"><Ico name="print" size={12}/> In đơn</button>
        {r.status === "draft" && <button className="ab-btn primary" onClick={() => { sign(r); cx(); }}><Ico name="check" size={12}/> Ký số</button>}
        {r.status === "signed" && <button className="ab-btn primary" onClick={() => { dispense(r); cx(); }}><Ico name="check" size={12}/> Cấp phát</button>}
      </>}>
      <DrSec title="Bệnh nhân & chẩn đoán">
        <DrField lbl="Họ tên">{r.name} · {r.age}T</DrField>
        <DrField lbl="Mã BN"><b style={{fontFamily:"var(--font-mono)"}}>{r.pid}</b></DrField>
        <DrField lbl="Bác sĩ">{r.doctor}</DrField>
        <DrField lbl="Chẩn đoán">{r.diagnosis}</DrField>
        <DrField lbl="Loại">{r.type}</DrField>
        <DrField lbl="Ngày kê">{fmtDTg(r.issuedAt)}</DrField>
      </DrSec>
      <DrSec title={`Danh mục thuốc (${r.items.length})`}>
        <table style={{width:"100%",fontSize:12.5,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"var(--d-2)",color:"var(--t-2)",textTransform:"uppercase",fontSize:10}}>
            <th style={{padding:"6px 8px",textAlign:"left"}}>Tên thuốc</th><th style={{padding:"6px 8px",textAlign:"left"}}>Cách dùng</th><th style={{padding:"6px 8px",textAlign:"right"}}>SL</th><th style={{padding:"6px 8px",textAlign:"right"}}>Ngày</th>
          </tr></thead>
          <tbody>{r.items.map((it,i) => (
            <tr key={i} style={{borderBottom:"1px solid var(--line)"}}>
              <td style={{padding:"8px"}}><div style={{fontWeight:600}}>{it.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{it.code} · {it.form}</div></td>
              <td style={{padding:"8px"}}>{it.dose}</td>
              <td style={{padding:"8px",textAlign:"right",fontFamily:"var(--font-mono)"}}>{it.qty}</td>
              <td style={{padding:"8px",textAlign:"right",fontFamily:"var(--font-mono)"}}>{it.days}</td>
            </tr>
          ))}</tbody>
        </table>
      </DrSec>
      <DrSec title="Thanh toán">
        <DrField lbl="Tổng tiền"><b style={{fontFamily:"var(--font-mono)",fontSize:14}}>{fmtVNDg(r.total)}</b></DrField>
        <DrField lbl="BHYT chi trả">{r.bhytCovered ? "Có" : "Không"}</DrField>
      </DrSec>
    </HUI.Drawer>
  ));
  const cols = [
    { key: "code", label: "Mã đơn", code: true, width: 130 },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T</div></div> },
    { key: "doctor", label: "Bác sĩ", width: 180 },
    { key: "diagnosis", label: "Chẩn đoán" },
    { key: "items", label: "Số thuốc", width: 90, mono: true, render: r => `${r.items.length} loại` },
    { key: "issuedAt", label: "Ngày kê", width: 130, mono: true, render: r => fmtDTg(r.issuedAt) },
    { key: "total", label: "Tổng tiền", width: 110, mono: true, render: r => fmtVNDg(r.total) },
    { key: "status", label: "Trạng thái", width: 120, render: r => { const s = PR_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];
  const actions = (r) => (
    <div className="ab-row-act">
      {r.status === "draft" && <ActBtn ic="check" title="Ký số" onClick={() => sign(r)}/>}
      {r.status === "signed" && <ActBtn ic="check" tone="ok" title="Cấp phát" onClick={() => dispense(r)}/>}
      <ActBtn ic="print" title="In đơn"/>
    </div>
  );
  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Đơn hôm nay", val: rows.filter(r => Math.abs((r.issuedAt-todayIv)/86400000)<1).length, tone: "info" },
        { lbl: "Đã ký số", val: counts.signed, tone: "info" },
        { lbl: "Đã cấp phát", val: counts.dispensed, tone: "ok" },
        { lbl: "Chờ duyệt", val: counts.review, tone: "warn" },
        { lbl: "Đã huỷ", val: counts.cancelled, tone: "crit" },
        { lbl: "Tổng cộng", val: rows.length },
      ]}/>
      <TopTabs tab="all" setTab={()=>{}} tabs={[{ v: "all", l: `Đơn thuốc (${rows.length})`, ic: "pill" }]} actions={
        <>
          <button className="ab-btn ghost sm"><Ico name="download" size={12}/> Xuất Excel</button>
          <button className="ab-btn primary"><Ico name="plus" size={12}/> Kê đơn mới</button>
        </>
      }/>
      <div className="ab-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / mã đơn..."/></div>
      <StatusTabs value={stab} onChange={setStab} tabs={PR_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}
window.PrescriptionV2 = PrescriptionV2;
