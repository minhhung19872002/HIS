// =====================================================================
// HIS Terminal · Module: CẤP CỨU (ER v2)
// Triage 5 mức, hồi sức, chuyển khoa, tử vong
// =====================================================================

const TRIAGE = [
  { v: 1, l: "Mức 1 · Hồi sức", tone: "danger", color: "#dc2626", desc: "Đe doạ tính mạng — xử trí ngay" },
  { v: 2, l: "Mức 2 · Khẩn cấp", tone: "warn",  color: "#ea580c", desc: "Trong vòng 10 phút" },
  { v: 3, l: "Mức 3 · Cấp",     tone: "warn",  color: "#ca8a04", desc: "Trong vòng 30 phút" },
  { v: 4, l: "Mức 4 · Bán cấp", tone: "info",  color: "#0891b2", desc: "Trong vòng 60 phút" },
  { v: 5, l: "Mức 5 · Không cấp", tone: "ok",  color: "#16a34a", desc: "Có thể chờ > 60 phút" },
];
const ER_STATUS = [
  { v: "triage",    l: "Đang phân loại",   tone: "warn" },
  { v: "treating",  l: "Đang xử trí",      tone: "danger" },
  { v: "observing", l: "Theo dõi",         tone: "info" },
  { v: "admitted",  l: "Chuyển nội trú",   tone: "ok" },
  { v: "discharged",l: "Cho về",           tone: "ok" },
  { v: "referred",  l: "Chuyển tuyến",     tone: "info" },
];
const COMPLAINTS_ER = ["Đau ngực dữ dội","Khó thở cấp","Chấn thương đầu","Tai nạn giao thông","Đau bụng cấp","Co giật","Sốt cao + co giật","Ngất xỉu","Bỏng độ 2","Vết thương dao đâm","Đột quỵ nghi ngờ","Ngộ độc thuốc"];

const seedEr = () => {
  const rows = [];
  for (let i = 0; i < 36; i++) {
    const t = new Date(2026, 9, 22, Math.floor(Math.random()*24), Math.floor(Math.random()*60));
    const triage = Math.random() < 0.08 ? 1 : Math.random() < 0.25 ? 2 : Math.random() < 0.55 ? 3 : Math.random() < 0.85 ? 4 : 5;
    const status = ["triage","treating","observing","observing","admitted","discharged","referred"][Math.floor(Math.random()*7)];
    rows.push({
      code: `ER-${String(20261022).slice(-6)}-${String(i+1).padStart(3,"0")}`,
      pid: rndPid(), patientName: rndName(i), age: rndAge(), gender: rndGender(),
      arrivalTime: t, triage, status,
      complaint: rndPick(COMPLAINTS_ER),
      vitals: { bp: `${triage<=2?80+Math.floor(Math.random()*40):110+Math.floor(Math.random()*30)}/${60+Math.floor(Math.random()*20)}`, hr: triage<=2?100+Math.floor(Math.random()*40):65+Math.floor(Math.random()*30), temp: (36+Math.random()*3).toFixed(1), spo2: triage<=2?85+Math.floor(Math.random()*10):92+Math.floor(Math.random()*8) },
      mode: rndPick(["115","Tự đến","Người nhà","Chuyển tuyến"]),
      doctor: rndPick(["BS. Phan Văn Tâm","BS. Đỗ Thị Linh","BS. Nguyễn Đức Long"]),
      bed: triage <= 3 ? `CC-${String(i%8+1).padStart(2,"0")}` : null,
      gcs: triage <= 2 ? 8+Math.floor(Math.random()*5) : 14+Math.floor(Math.random()*2),
    });
  }
  return rows;
};

function ErV2() {
  const [data, setData] = uS(seedEr());
  const [stab, setStab] = uS("all");
  const [fTriage, setFTriage] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const counts = { all: data.length };
  ER_STATUS.forEach(s => counts[s.v] = data.filter(r => r.status === s.v).length);
  const filtered = data.filter(r => {
    if (stab !== "all" && r.status !== stab) return false;
    if (fTriage && r.triage !== Number(fTriage)) return false;
    if (search) { const q = search.toLowerCase(); return [r.patientName, r.pid, r.code, r.complaint].some(x => x.toLowerCase().includes(q)); }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    today: data.length,
    critical: data.filter(r => r.triage <= 2).length,
    treating: data.filter(r => r.status === "treating").length,
    avgWait: 8,
    admitted: data.filter(r => r.status === "admitted").length,
    referred: data.filter(r => r.status === "referred").length,
  }), [data]);

  const update = (code, patch) => setData(p => p.map(r => r.code === code ? { ...r, ...patch } : r));
  const open = (r) => HUI.drawer(cx => <ErDrawer r={r} cx={cx} onUpdate={update}/>);

  const cols = [
    { key: "triage", label: "Triage", render: r => { const t = TRIAGE.find(x => x.v === r.triage); return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",background:t.color,color:"#fff",borderRadius:4,fontSize:11,fontWeight:700,fontFamily:"var(--font-mono)"}}>{r.triage}</span>; } },
    { key: "code", label: "Mã CC", code: true, render: r => r.code },
    { key: "time", label: "Đến", mono: true, render: r => fmtHMg(r.arrivalTime) },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patientName}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T · {r.gender}</div></div> },
    { key: "complaint", label: "Lý do", render: r => <span style={{color:"var(--t-1)"}}>{r.complaint}</span> },
    { key: "mode", label: "Đường vào", render: r => <span style={{fontSize:11.5}}>{r.mode}</span> },
    { key: "vitals", label: "Sinh hiệu", mono: true, render: r => <span style={{fontSize:11}}>HA {r.vitals.bp} · SpO₂ {r.vitals.spo2}%</span> },
    { key: "bed", label: "Giường", mono: true, render: r => r.bed || <span style={{color:"var(--t-3)"}}>—</span> },
    { key: "status", label: "Trạng thái", render: r => { const s = ER_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={()=>open(r)}/>
      {r.status === "treating" && <ActBtn ic="bed" title="Chuyển nội trú" onClick={()=>HUI.confirm("Chuyển nội trú?",`${r.patientName} - ${r.complaint}`,()=>{update(r.code,{status:"admitted"});tk("Đã chuyển nội trú");},"info")}/>}
      <ActBtn ic="logout" title="Cho về" onClick={()=>HUI.confirm("Cho BN ra về?","",()=>{update(r.code,{status:"discharged"});tk("Đã cho ra về");},"warn")}/>
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Hôm nay", val: kpis.today, sub: "ca cấp cứu" },
        { lbl: "Mức 1-2", val: kpis.critical, sub: "nguy kịch", tone: "danger" },
        { lbl: "Đang xử trí", val: kpis.treating, sub: "phòng hồi sức", tone: "warn" },
        { lbl: "Chuyển nội trú", val: kpis.admitted, sub: "ca", tone: "info" },
        { lbl: "Chuyển tuyến", val: kpis.referred, sub: "BV tuyến trên" },
        { lbl: "Chờ TB", val: kpis.avgWait, unit: "p", sub: "đạt mục tiêu", tone: "ok" },
      ]}/>
      <div className="ab-toolbar" style={{borderTop:"1px solid var(--line)"}}>
        <button className="ab-btn danger" onClick={()=>tk("Tiếp nhận ca cấp cứu mới")} style={{background:"#dc2626",color:"#fff",borderColor:"#b91c1c"}}><Ico name="ambulance" size={12}/> Tiếp nhận CC <kbd>F2</kbd></button>
        <button className="ab-btn ghost" onClick={()=>tk("Đã kích hoạt code blue")}><Ico name="alert" size={12}/> Code Blue</button>
        <span style={{height:24,width:1,background:"var(--line)",margin:"0 4px"}}/>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã CC, triệu chứng…"/>
        <Filter value={fTriage} onChange={setFTriage} options={TRIAGE.map(t=>({v:String(t.v),l:t.l}))} placeholder="▾ Triage"/>
        <span className="spacer"/>
        <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>Cập nhật {fmtHMg(new Date())}</span>
      </div>
      <StatusTabs value={stab} onChange={setStab} tabs={ER_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}

const ErDrawer = ({ r, cx, onUpdate }) => {
  const t = TRIAGE.find(x => x.v === r.triage);
  return (
    <HUI.Drawer title={`Ca cấp cứu · ${r.code}`} sub={`${r.patientName} · ${r.pid}`} size="lg" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Đóng</button>
      <button className="ab-btn" onClick={()=>tk("Đã in hồ sơ CC")}><Ico name="print" size={12}/> In hồ sơ</button>
      <button className="ab-btn primary" onClick={()=>{cx();HUI.confirm("Chuyển nội trú?","",()=>{onUpdate(r.code,{status:"admitted"});tk("Đã chuyển");},"info");}}>Chuyển nội trú</button>
    </>}>
      <div style={{padding:"10px 14px",background:t.color,color:"#fff",borderRadius:6,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:24,fontWeight:800,fontFamily:"var(--font-mono)"}}>{r.triage}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{t.l}</div>
            <div style={{fontSize:11,opacity:0.9}}>{t.desc}</div>
          </div>
        </div>
      </div>
      <DrSec title="Sinh hiệu hiện tại">
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
          {[["HA",r.vitals.bp,"mmHg"],["Mạch",r.vitals.hr,"l/p"],["Nhiệt",r.vitals.temp,"°C"],["SpO₂",r.vitals.spo2,"%"],["GCS",r.gcs,"/15"]].map(([l,v,u],i)=>(
            <div key={i} style={{padding:"8px 10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6}}>
              <div style={{fontSize:9.5,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>{l}</div>
              <div style={{fontSize:16,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{v}<small style={{fontSize:10,color:"var(--t-2)",marginLeft:2,fontWeight:400}}>{u}</small></div>
            </div>
          ))}
        </div>
      </DrSec>
      <DrSec title="Thông tin tiếp nhận">
        <DrField lbl="Lý do vào CC">{r.complaint}</DrField>
        <DrField lbl="Đường vào">{r.mode}</DrField>
        <DrField lbl="Giờ đến">{fmtDTg(r.arrivalTime)}</DrField>
        <DrField lbl="BS phụ trách">{r.doctor}</DrField>
        {r.bed && <DrField lbl="Giường CC">{r.bed}</DrField>}
      </DrSec>
      <DrSec title="Xử trí ban đầu">
        <div style={{padding:12,background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,fontSize:12.5,color:"var(--t-1)",lineHeight:1.6}}>
          {r.triage <= 2 ? "Thiết lập đường truyền tĩnh mạch · Oxy mask 6L/p · Theo dõi monitor liên tục · Hội chẩn CK ngay" : "Khám lâm sàng · Chỉ định CLS cấp · Theo dõi sinh hiệu mỗi 15 phút"}
        </div>
      </DrSec>
    </HUI.Drawer>
  );
};

window.ErV2 = ErV2;
