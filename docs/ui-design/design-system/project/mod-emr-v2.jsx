// =====================================================================
// HIS Terminal · Module: HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EMR v2)
// Timeline khám/nội trú, ghi chú lâm sàng, ký số
// =====================================================================

const EMR_TYPES = [
  { v: "consult",  l: "Khám ngoại trú", tone: "info",  ic: "stethoscope" },
  { v: "admit",    l: "Nội trú",         tone: "mag",   ic: "bed" },
  { v: "surgery",  l: "Phẫu thuật",      tone: "warn",  ic: "scalpel" },
  { v: "lab",      l: "Xét nghiệm",      tone: "info",  ic: "flask" },
  { v: "img",      l: "Chẩn đoán hình ảnh", tone: "mag", ic: "image" },
  { v: "rx",       l: "Đơn thuốc",       tone: "ok",    ic: "pill" },
  { v: "discharge",l: "Xuất viện",       tone: "ok",    ic: "logout" },
];

const seedEmr = () => {
  const out = [];
  for (let i = 0; i < 48; i++) {
    const visits = 8 + Math.floor(Math.random()*30);
    const last = new Date(2026, 9, 22 - Math.floor(Math.random()*60));
    out.push({
      pid: rndPid(), name: rndName(i), age: rndAge(), gender: rndGender(),
      bloodType: rndPick(["A+","B+","O+","AB+","O-","A-"]),
      allergies: Math.random()>0.6 ? rndPickN(["Penicillin","NSAIDs","Hải sản","Lactose"], 1+Math.floor(Math.random()*2)) : [],
      chronic: rndPickN(["Tăng huyết áp","Đái tháo đường tip 2","Rối loạn lipid","Viêm khớp mạn","COPD"], Math.floor(Math.random()*3)),
      visits, lastVisit: last,
      bhyt: `HC4${rndPid().slice(2)}`,
      timeline: Array.from({length: 6+Math.floor(Math.random()*8)}, (_, j) => {
        const t = EMR_TYPES[j % EMR_TYPES.length];
        const d = new Date(last.getTime() - j*7*86400000);
        return {
          id: `e${i}-${j}`,
          type: t.v, typeLabel: t.l, tone: t.tone, ic: t.ic,
          date: d,
          title: t.v === "consult" ? `Khám ${rndPick(["Nội tổng quát","Tim mạch","Tiêu hoá"])}` :
                 t.v === "lab" ? `XN ${rndPick(["Sinh hoá","CTM","HbA1c","Lipid"])}` :
                 t.v === "img" ? `${rndPick(["XQ ngực","Siêu âm bụng","CT sọ não"])}` :
                 t.v === "rx" ? `Đơn thuốc ${j+1}` :
                 t.v === "admit" ? "Nhập viện Khoa Nội" :
                 t.v === "surgery" ? "Phẫu thuật cắt ruột thừa" : "Xuất viện",
          author: rndPick(["BS. Nguyễn Văn Hùng","BS. Trần Thị Mai","BS. Lê Quang Vinh"]),
          dept: rndPick(["Nội tổng quát","Tim mạch","Cấp cứu","Khoa Nội"]),
          dx: rndPick(["I10 · Tăng huyết áp","K29.7 · Viêm dạ dày","E11.9 · ĐTĐ tip 2"]),
          signed: Math.random()>0.2,
        };
      }).sort((a,b)=>b.date-a.date),
    });
  }
  return out;
};

function EmrV2() {
  const [data] = uS(seedEmr());
  const [search, setSearch] = uS("");
  const [fGender, setFGender] = uS("");
  const [fChronic, setFChronic] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const filtered = uM(() => data.filter(p => {
    if (fGender && p.gender !== fGender) return false;
    if (fChronic && !p.chronic.some(c => c.includes(fChronic))) return false;
    if (search) { const q = search.toLowerCase(); return [p.name, p.pid, p.bhyt].some(x => x.toLowerCase().includes(q)); }
    return true;
  }), [data, search, fGender, fChronic]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    total: data.length,
    chronic: data.filter(p => p.chronic.length > 0).length,
    allergic: data.filter(p => p.allergies.length > 0).length,
    avgVisits: Math.round(data.reduce((s,p)=>s+p.visits,0)/data.length),
    todayUpdated: 23,
    pendingSign: data.reduce((s,p)=>s+p.timeline.filter(t=>!t.signed).length,0),
  }), [data]);

  const open = (p) => HUI.drawer(cx => <EmrDrawer p={p} cx={cx}/>);
  const cols = [
    { key: "pid", label: "Mã BN", code: true, render: r => r.pid },
    { key: "name", label: "Họ tên", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.age}T · {r.gender} · {r.bloodType}</div></div> },
    { key: "bhyt", label: "BHYT", mono: true, render: r => r.bhyt },
    { key: "chronic", label: "Bệnh nền", render: r => r.chronic.length === 0 ? <span style={{color:"var(--t-3)"}}>—</span> : <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{r.chronic.slice(0,2).map(c => <span key={c} className="ab-stat info" style={{height:18,padding:"0 6px",fontSize:10}}>{c}</span>)}{r.chronic.length>2 && <span style={{fontSize:11,color:"var(--t-2)"}}>+{r.chronic.length-2}</span>}</div> },
    { key: "allergies", label: "Dị ứng", render: r => r.allergies.length === 0 ? <span style={{color:"var(--t-3)"}}>—</span> : <span className="ab-stat danger" style={{height:18,padding:"0 6px",fontSize:10}}>⚠ {r.allergies.join(", ")}</span> },
    { key: "visits", label: "Lượt KB", mono: true, num: true, render: r => r.visits },
    { key: "last", label: "Lần cuối", mono: true, render: r => fmtDMYg(r.lastVisit) },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem hồ sơ" onClick={() => open(r)}/>
      <ActBtn ic="print" title="In hồ sơ" onClick={() => tk("Đã xuất PDF")}/>
      <ActBtn ic="lock" title="Khoá hồ sơ" onClick={() => HUI.confirm("Khoá hồ sơ?","Hồ sơ sẽ chỉ đọc.",()=>tk("Đã khoá hồ sơ"),"warn")}/>
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Tổng hồ sơ", val: kpis.total, sub: "đang theo dõi" },
        { lbl: "Cập nhật hôm nay", val: kpis.todayUpdated, sub: "ghi chú", tone: "info" },
        { lbl: "Bệnh mạn tính", val: kpis.chronic, sub: `${Math.round(kpis.chronic/kpis.total*100)}% BN`, tone: "warn" },
        { lbl: "Có dị ứng", val: kpis.allergic, sub: "cần lưu ý", tone: "warn" },
        { lbl: "Lượt KB / BN", val: kpis.avgVisits, sub: "trung bình" },
        { lbl: "Chờ ký số", val: kpis.pendingSign, sub: "ghi chú", tone: "danger" },
      ]}/>
      <div className="ab-toolbar" style={{borderTop:"1px solid var(--line)"}}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã BN, mã BHYT…"/>
        <Filter value={fGender} onChange={setFGender} options={[{v:"Nam",l:"Nam"},{v:"Nữ",l:"Nữ"}]} placeholder="▾ Giới tính"/>
        <Filter value={fChronic} onChange={setFChronic} options={[{v:"Tăng huyết áp",l:"Tăng huyết áp"},{v:"Đái tháo đường",l:"ĐTĐ tip 2"},{v:"COPD",l:"COPD"}]} placeholder="▾ Bệnh nền"/>
        <button className="ab-btn ghost" onClick={()=>{setSearch("");setFGender("");setFChronic("");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={()=>tk("Đã xuất CSV")}><Ico name="download" size={12}/> Xuất</button>
        <button className="ab-btn primary" onClick={()=>tk("Tạo hồ sơ mới")}><Ico name="plus" size={12}/> Hồ sơ mới <kbd>F2</kbd></button>
      </div>
      <DataTable columns={cols} data={paged} rowKey={r => r.pid} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}

const EmrDrawer = ({ p, cx }) => {
  const [tab, setTab] = uS("timeline");
  return (
    <HUI.Drawer title={`Hồ sơ bệnh án · ${p.name}`} sub={`${p.pid} · ${p.age}T · ${p.gender} · ${p.bloodType}`} size="lg" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Đóng</button>
      <button className="ab-btn" onClick={()=>tk("Đã xuất PDF")}><Ico name="download" size={12}/> Xuất PDF</button>
      <button className="ab-btn primary" onClick={()=>tk("+ Ghi chú lâm sàng")}><Ico name="plus" size={12}/> Thêm ghi chú</button>
    </>}>
      {p.allergies.length > 0 && <div style={{margin:"-2px 0 14px",padding:"8px 12px",background:"var(--a-rd-bg)",border:"1px solid var(--a-rd-line)",borderRadius:6,fontSize:12.5,color:"var(--a-rd-text)"}}><b>⚠ DỊ ỨNG:</b> {p.allergies.join(", ")} — Lưu ý khi kê đơn</div>}
      <div style={{display:"flex",gap:0,marginBottom:14,borderBottom:"1px solid var(--line)"}}>
        {[["timeline","Diễn biến"],["demo","Hành chính"],["chronic","Bệnh nền"],["sign","Chữ ký số"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{background:"none",border:"none",padding:"8px 14px",fontSize:12.5,fontWeight:tab===v?600:400,color:tab===v?"var(--t-0)":"var(--t-2)",borderBottom:tab===v?"2px solid var(--ac)":"2px solid transparent",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      {tab === "timeline" && <div>{p.timeline.map(e => (
        <div key={e.id} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"1px solid var(--line-soft)"}}>
          <div style={{flexShrink:0,width:36,height:36,borderRadius:6,background:`var(--a-${e.tone==="ok"?"em":e.tone==="warn"?"or":e.tone==="info"?"cy":"mg"}-bg)`,border:`1px solid var(--a-${e.tone==="ok"?"em":e.tone==="warn"?"or":e.tone==="info"?"cy":"mg"}-line)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name={e.ic} size={16}/></div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
              <span style={{fontWeight:600,color:"var(--t-0)",fontSize:13}}>{e.title}</span>
              <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{fmtDMYg(e.date)}</span>
              {e.signed ? <span className="ab-stat success" style={{height:18,padding:"0 6px",fontSize:10}}>✓ Ký số</span> : <span className="ab-stat warn" style={{height:18,padding:"0 6px",fontSize:10}}>Chờ ký</span>}
            </div>
            <div style={{fontSize:12,color:"var(--t-1)"}}>{e.dx}</div>
            <div style={{fontSize:11,color:"var(--t-2)",marginTop:2}}>{e.author} · {e.dept}</div>
          </div>
        </div>
      ))}</div>}
      {tab === "demo" && <div>
        <DrField lbl="Họ tên">{p.name}</DrField>
        <DrField lbl="Mã BN">{p.pid}</DrField>
        <DrField lbl="Tuổi/Giới">{p.age} tuổi · {p.gender}</DrField>
        <DrField lbl="Nhóm máu">{p.bloodType}</DrField>
        <DrField lbl="Mã BHYT">{p.bhyt}</DrField>
        <DrField lbl="Tổng lượt KB">{p.visits}</DrField>
      </div>}
      {tab === "chronic" && <div>
        {p.chronic.length === 0 ? <div style={{color:"var(--t-3)",padding:"20px 0",textAlign:"center"}}>Không có bệnh nền</div> : p.chronic.map(c => <div key={c} style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,marginBottom:6}}><b>{c}</b> <span style={{color:"var(--t-2)",fontSize:11,marginLeft:6}}>Đang điều trị</span></div>)}
      </div>}
      {tab === "sign" && <div>
        <div style={{padding:14,background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,marginBottom:12}}>
          <div style={{fontSize:12,color:"var(--t-2)",marginBottom:6}}>CHỮ KÝ SỐ ĐANG SỬ DỤNG</div>
          <div style={{fontSize:13,fontWeight:600}}>BS. Nguyễn Văn Hùng</div>
          <div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)",marginTop:4}}>SHA256: a3f4...e9b2</div>
          <div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>Hiệu lực: 01/01/2026 → 31/12/2027</div>
        </div>
        <button className="ab-btn primary" onClick={()=>tk(`Đã ký ${p.timeline.filter(t=>!t.signed).length} ghi chú`)}><Ico name="check" size={12}/> Ký tất cả ghi chú chờ ký</button>
      </div>}
    </HUI.Drawer>
  );
};

window.EmrV2 = EmrV2;
