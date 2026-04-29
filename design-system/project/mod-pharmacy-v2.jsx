// =====================================================================
// HIS Terminal · Module: NHÀ THUỐC (Pharmacy v2)
// Cấp phát, kiểm kho, tương tác thuốc, lô + HSD
// =====================================================================

const RX_STATUS = [
  { v: "pending",   l: "Chờ duyệt",   tone: "warn" },
  { v: "verified",  l: "DS đã duyệt", tone: "info" },
  { v: "dispensed", l: "Đã cấp",      tone: "ok" },
  { v: "partial",   l: "Cấp 1 phần",  tone: "warn" },
  { v: "rejected",  l: "Từ chối",     tone: "danger" },
  { v: "returned",  l: "Trả về",      tone: "danger" },
];
const PH_TAB = [
  { v: "rx",        l: "Đơn cần cấp",  ic: "pill" },
  { v: "stock",     l: "Tồn kho",      ic: "box" },
  { v: "expire",    l: "Sắp hết HSD",  ic: "alert" },
];
const DRUGS = [
  { c: "PARA500",  n: "Paracetamol 500mg",         f: "Viên nén",   stock: 12450, low: 1000, exp: "2027-08-15", price: 800,    interact: [] },
  { c: "AMOX500",  n: "Amoxicillin 500mg",         f: "Viên nang",  stock: 4280,  low: 500,  exp: "2026-12-20", price: 2400,   interact: ["Methotrexat"] },
  { c: "CEFTRIAX", n: "Ceftriaxon 1g",             f: "Lọ tiêm",    stock: 320,   low: 100,  exp: "2027-03-30", price: 38000,  interact: [] },
  { c: "OMEPRA20", n: "Omeprazol 20mg",            f: "Viên nang",  stock: 8800,  low: 800,  exp: "2027-05-10", price: 1500,   interact: ["Clopidogrel"] },
  { c: "AMLO5",    n: "Amlodipin 5mg",             f: "Viên nén",   stock: 14200, low: 1200, exp: "2027-09-22", price: 900,    interact: [] },
  { c: "FUROS40",  n: "Furosemid 40mg",            f: "Viên nén",   stock: 5400,  low: 600,  exp: "2027-04-18", price: 600,    interact: [] },
  { c: "WARFARIN", n: "Warfarin 5mg",              f: "Viên nén",   stock: 1250,  low: 200,  exp: "2026-11-30", price: 4500,   interact: ["Aspirin","NSAIDs","Amoxicillin"] },
  { c: "ASPIRIN",  n: "Aspirin 81mg",              f: "Viên bao tan",stock: 9800, low: 800,  exp: "2027-07-12", price: 700,    interact: ["Warfarin","NSAIDs"] },
  { c: "METFOR",   n: "Metformin 850mg",           f: "Viên nén",   stock: 11200, low: 1000, exp: "2027-06-08", price: 1100,   interact: [] },
  { c: "INSGLAR",  n: "Insulin glargine 100UI/ml", f: "Bút tiêm",   stock: 180,   low: 60,   exp: "2026-12-15", price: 240000, interact: [] },
];

const seedRx = () => {
  const rows = [];
  for (let i = 0; i < 42; i++) {
    const cnt = 2+Math.floor(Math.random()*4);
    const items = rndPickN(DRUGS, cnt).map(d => ({
      drug: d, qty: 7+Math.floor(Math.random()*21),
      sig: rndPick(["Sáng 1v","x2/ngày","x3/ngày","Sáng 1v + tối 1v","Khi sốt"])
    }));
    const total = items.reduce((s,i)=>s+i.qty*i.drug.price,0);
    const status = ["pending","pending","verified","dispensed","dispensed","dispensed","partial"][i%7];
    const interactions = [];
    items.forEach((a,ai) => items.forEach((b,bi) => {
      if (ai < bi && a.drug.interact.some(x => b.drug.n.includes(x))) interactions.push({a: a.drug.n, b: b.drug.n});
    }));
    rows.push({
      code: `RX-${String(20261022).slice(-6)}-${String(i+1).padStart(3,"0")}`,
      pid: rndPid(), patientName: rndName(i), age: rndAge(), gender: rndGender(),
      doctor: rndPick(["BS. Nguyễn Văn Hùng","BS. Trần Thị Mai","BS. Lê Quang Vinh"]),
      dept: rndPick(["Nội tổng quát","Tim mạch","Tiêu hoá","Cấp cứu"]),
      issuedAt: new Date(2026, 9, 22, 7+Math.floor(i/4), (i*11)%60),
      items, total, status, interactions,
      bhyt: Math.random() > 0.3,
    });
  }
  return rows;
};

function PharmacyV2() {
  const [data, setData] = uS(seedRx());
  const [tab, setTab] = uS("rx");
  const [stab, setStab] = uS("all");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const counts = { all: data.length };
  RX_STATUS.forEach(s => counts[s.v] = data.filter(r => r.status === s.v).length);
  const filtered = data.filter(r => {
    if (stab !== "all" && r.status !== stab) return false;
    if (search) { const q = search.toLowerCase(); return [r.patientName, r.pid, r.code].some(x => x.toLowerCase().includes(q)); }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    today: data.length,
    pending: data.filter(r => r.status === "pending").length,
    dispensed: data.filter(r => r.status === "dispensed").length,
    interactions: data.filter(r => r.interactions.length > 0).length,
    revenue: data.reduce((s,r) => r.status === "dispensed" ? s+r.total : s, 0),
    lowStock: DRUGS.filter(d => d.stock < d.low).length,
  }), [data]);

  const update = (code, patch) => setData(p => p.map(r => r.code === code ? { ...r, ...patch } : r));
  const open = (r) => HUI.drawer(cx => <RxDrawer r={r} cx={cx} onUpdate={update}/>);
  const dispense = (r) => HUI.confirm("Cấp phát đơn thuốc?", `${r.items.length} thuốc · ${fmtVNDg(r.total)}`, () => { update(r.code, { status: "dispensed" }); tk("Đã cấp phát"); }, "ok");

  const cols = [
    { key: "code", label: "Mã đơn", code: true, render: r => <span>{r.code}{r.bhyt && <span style={{marginLeft:6,padding:"1px 5px",background:"var(--a-cy-bg)",border:"1px solid var(--a-cy-line)",color:"var(--a-cy-text)",borderRadius:3,fontSize:9,fontWeight:700}}>BHYT</span>}</span> },
    { key: "time", label: "Giờ", mono: true, render: r => fmtHMg(r.issuedAt) },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patientName}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T · {r.gender}</div></div> },
    { key: "doc", label: "BS / Khoa", render: r => <div><div style={{fontSize:12}}>{r.doctor}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.dept}</div></div> },
    { key: "items", label: "Thuốc", num: true, mono: true, render: r => `${r.items.length} loại` },
    { key: "interactions", label: "Tương tác", render: r => r.interactions.length > 0 ? <span className="ab-stat danger" style={{height:18,padding:"0 6px",fontSize:10}}>⚠ {r.interactions.length}</span> : <span style={{color:"var(--t-3)"}}>—</span> },
    { key: "total", label: "Tổng tiền", mono: true, num: true, render: r => fmtVNDg(r.total) },
    { key: "status", label: "Trạng thái", render: r => { const s = RX_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      {r.status === "pending" && <ActBtn ic="check" title="DS duyệt" onClick={()=>{update(r.code,{status:"verified"});tk("DS đã duyệt");}}/>}
      {r.status === "verified" && <ActBtn ic="pill" title="Cấp phát" onClick={()=>dispense(r)}/>}
      <ActBtn ic="eye" title="Chi tiết" onClick={()=>open(r)}/>
      <ActBtn ic="print" title="In nhãn" onClick={()=>tk("Đã in nhãn thuốc")}/>
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Đơn hôm nay", val: kpis.today, sub: "tổng" },
        { lbl: "Chờ duyệt", val: kpis.pending, sub: "DS xử lý", tone: "warn" },
        { lbl: "Đã cấp", val: kpis.dispensed, sub: `${Math.round(kpis.dispensed/kpis.today*100)}%`, tone: "ok" },
        { lbl: "Tương tác", val: kpis.interactions, sub: "đơn cảnh báo", tone: "danger" },
        { lbl: "Doanh thu", val: Math.round(kpis.revenue/1000), unit: "K", sub: "VND" },
        { lbl: "Sắp hết", val: kpis.lowStock, sub: "thuốc cần nhập", tone: "warn" },
      ]}/>
      <TopTabs tab={tab} setTab={setTab} tabs={PH_TAB} actions={<>
        <button className="ab-btn ghost" onClick={()=>tk("Mở phiếu nhập kho")}><Ico name="download" size={12}/> Nhập kho</button>
        <button className="ab-btn primary" onClick={()=>tk("Tạo đơn ngoại")}><Ico name="plus" size={12}/> Đơn ngoại <kbd>F2</kbd></button>
      </>}/>
      {tab === "rx" && <>
        <StatusTabs value={stab} onChange={setStab} tabs={RX_STATUS} counts={counts}/>
        <div className="ab-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã đơn…"/>
          <button className="ab-btn ghost" onClick={()=>{setSearch("");setStab("all");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
          <span className="spacer"/>
          <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{filtered.length} đơn</span>
        </div>
        <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
      </>}
      {tab === "stock" && <StockTab/>}
      {tab === "expire" && <ExpireTab/>}
    </div>
  );
}

const StockTab = () => {
  const cols = [
    { key: "code", label: "Mã thuốc", code: true, render: r => r.c },
    { key: "n", label: "Tên thuốc", render: r => <b>{r.n}</b> },
    { key: "f", label: "Dạng", render: r => r.f },
    { key: "stock", label: "Tồn", num: true, mono: true, render: r => <span style={{color:r.stock<r.low?"var(--a-rd-text)":"var(--t-0)",fontWeight:600}}>{r.stock.toLocaleString()}</span> },
    { key: "low", label: "Min", num: true, mono: true, render: r => <span style={{color:"var(--t-2)"}}>{r.low.toLocaleString()}</span> },
    { key: "exp", label: "HSD", mono: true, render: r => r.exp },
    { key: "price", label: "Đơn giá", mono: true, num: true, render: r => fmtVNDg(r.price) },
    { key: "alert", label: "Cảnh báo", render: r => r.stock < r.low ? <span className="ab-stat danger" style={{height:18,padding:"0 6px",fontSize:10}}>SẮP HẾT</span> : <span className="ab-stat success" style={{height:18,padding:"0 6px",fontSize:10}}>OK</span> },
  ];
  return <DataTable columns={cols} data={DRUGS} rowKey={r => r.c} actions={r => (
    <div className="ab-actions">
      <ActBtn ic="plus" title="Nhập kho" onClick={()=>tk(`Nhập kho ${r.n}`)}/>
      <ActBtn ic="edit" title="Cập nhật" onClick={()=>tk("Cập nhật thông tin")}/>
    </div>
  )}/>;
};

const ExpireTab = () => {
  const expiring = DRUGS.filter(d => new Date(d.exp) < new Date(2027, 0, 1)).map(d => ({...d, daysLeft: Math.floor((new Date(d.exp) - new Date(2026,9,22))/86400000)}));
  return (
    <div style={{flex:1,overflow:"auto",padding:18,background:"var(--d-1)"}}>
      <div style={{padding:14,background:"var(--a-or-bg)",border:"1px solid var(--a-or-line)",borderRadius:6,marginBottom:14,fontSize:13}}>
        <b>⚠ {expiring.length} thuốc sắp hết hạn trong vòng 90 ngày</b>
        <div style={{fontSize:12,marginTop:4,color:"var(--t-1)"}}>Cần ưu tiên cấp phát hoặc làm thủ tục thanh lý</div>
      </div>
      <div style={{background:"#fff",border:"1px solid var(--line)",borderRadius:6}}>
        {expiring.map(d => (
          <div key={d.c} style={{padding:"12px 16px",borderBottom:"1px solid var(--line-soft)",display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1}}><b>{d.n}</b><div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{d.c} · Tồn {d.stock.toLocaleString()}</div></div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--font-mono)",fontWeight:700,color:d.daysLeft<60?"var(--a-rd-text)":"var(--a-or-text)"}}>{d.daysLeft} ngày</div>
              <div style={{fontSize:11,color:"var(--t-2)"}}>HSD: {d.exp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RxDrawer = ({ r, cx, onUpdate }) => (
  <HUI.Drawer title={`Đơn thuốc · ${r.code}`} sub={`${r.patientName} · ${r.dept}`} size="lg" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Đóng</button>
    <button className="ab-btn" onClick={()=>tk("Đã in nhãn thuốc")}><Ico name="print" size={12}/> In nhãn</button>
    {r.status === "pending" && <button className="ab-btn primary" onClick={()=>{onUpdate(r.code,{status:"verified"});cx();tk("DS đã duyệt");}}><Ico name="check" size={12}/> DS duyệt</button>}
    {r.status === "verified" && <button className="ab-btn primary" onClick={()=>{onUpdate(r.code,{status:"dispensed"});cx();tk("Đã cấp");}}><Ico name="pill" size={12}/> Cấp phát</button>}
  </>}>
    {r.interactions.length > 0 && <div style={{margin:"-2px 0 14px",padding:"10px 14px",background:"var(--a-rd-bg)",border:"1px solid var(--a-rd-line)",borderRadius:6,fontSize:12.5,color:"var(--a-rd-text)"}}>
      <b>⚠ Cảnh báo tương tác thuốc:</b>
      <ul style={{margin:"6px 0 0 18px",padding:0}}>{r.interactions.map((i,k) => <li key={k}>{i.a} ↔ {i.b}</li>)}</ul>
    </div>}
    <DrSec title="Bệnh nhân & BS kê đơn">
      <DrField lbl="Họ tên">{r.patientName}</DrField>
      <DrField lbl="Mã BN">{r.pid}</DrField>
      <DrField lbl="BS kê đơn">{r.doctor} · {r.dept}</DrField>
      <DrField lbl="Lúc">{fmtDTg(r.issuedAt)}</DrField>
      {r.bhyt && <DrField lbl="BHYT"><span className="ab-stat info" style={{height:18,padding:"0 6px",fontSize:10}}>✓ Có thẻ BHYT</span></DrField>}
    </DrSec>
    <DrSec title="Danh mục thuốc">
      <table style={{width:"100%",fontSize:12.5,borderCollapse:"collapse"}}>
        <thead><tr style={{background:"var(--d-1)",fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}><th style={{padding:"8px 10px",textAlign:"left",borderBottom:"1px solid var(--line)"}}>Thuốc</th><th style={{padding:"8px 10px",textAlign:"left",borderBottom:"1px solid var(--line)"}}>Liều</th><th style={{padding:"8px 10px",textAlign:"right",borderBottom:"1px solid var(--line)"}}>SL</th><th style={{padding:"8px 10px",textAlign:"right",borderBottom:"1px solid var(--line)"}}>Đơn giá</th><th style={{padding:"8px 10px",textAlign:"right",borderBottom:"1px solid var(--line)"}}>Thành tiền</th></tr></thead>
        <tbody>{r.items.map((it,i) => (
          <tr key={i} style={{borderBottom:"1px solid var(--line-soft)"}}>
            <td style={{padding:"8px 10px"}}><b>{it.drug.n}</b><div style={{fontSize:10.5,color:"var(--t-2)"}}>{it.drug.c} · {it.drug.f}</div></td>
            <td style={{padding:"8px 10px",fontSize:11.5,color:"var(--t-1)"}}>{it.sig}</td>
            <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"var(--font-mono)"}}>{it.qty}</td>
            <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"var(--font-mono)"}}>{fmtVNDg(it.drug.price)}</td>
            <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"var(--font-mono)",fontWeight:600}}>{fmtVNDg(it.qty*it.drug.price)}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr><td colSpan="4" style={{padding:"10px",textAlign:"right",fontWeight:600}}>Tổng cộng:</td><td style={{padding:"10px",textAlign:"right",fontFamily:"var(--font-mono)",fontWeight:700,fontSize:14,color:"var(--ac)"}}>{fmtVNDg(r.total)}</td></tr></tfoot>
      </table>
    </DrSec>
  </HUI.Drawer>
);

window.PharmacyV2 = PharmacyV2;
