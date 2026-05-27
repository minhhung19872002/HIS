// =====================================================================
// HIS Terminal · Module: NỘI TRÚ (Ward v2)
// Sơ đồ giường, y lệnh, vital, bàn giao ca
// =====================================================================

const WARDS = [
  { v: "NTH", l: "Khoa Nội tổng quát", beds: 24 },
  { v: "NTM", l: "Khoa Nội tim mạch",   beds: 18 },
  { v: "NGO", l: "Khoa Ngoại tổng quát", beds: 20 },
  { v: "SAN", l: "Khoa Sản",            beds: 16 },
  { v: "NHI", l: "Khoa Nhi",            beds: 22 },
  { v: "ICU", l: "Hồi sức tích cực",   beds: 8 },
];
const BED_STATUS = [
  { v: "occupied",  l: "Có BN",         tone: "info" },
  { v: "empty",     l: "Trống",         tone: "ok" },
  { v: "cleaning",  l: "Đang vệ sinh",  tone: "warn" },
  { v: "reserved",  l: "Đã đặt",        tone: "mag" },
  { v: "isolation", l: "Cách ly",       tone: "danger" },
];

const seedWard = () => {
  const beds = [];
  WARDS.forEach(w => {
    for (let i = 1; i <= w.beds; i++) {
      const r = Math.random();
      const status = r < 0.7 ? "occupied" : r < 0.85 ? "empty" : r < 0.92 ? "cleaning" : r < 0.97 ? "reserved" : "isolation";
      const room = Math.ceil(i/2);
      const bed = i % 2 === 0 ? "B" : "A";
      const adm = new Date(2026, 9, 22 - Math.floor(Math.random()*14));
      beds.push({
        id: `${w.v}-${room}${bed}`,
        ward: w.v, wardName: w.l,
        room: `P${String(room).padStart(2,"0")}`, bed,
        status,
        ...(status === "occupied" || status === "isolation" ? {
          patient: { pid: rndPid(), name: rndName(beds.length), age: rndAge(), gender: rndGender() },
          dx: rndPick(["Viêm phổi","Tăng huyết áp/ĐTĐ","Sau phẫu thuật ruột thừa","Suy tim độ 2","Viêm ruột thừa","COPD đợt cấp"]),
          doctor: rndPick(["BS. Nguyễn Văn Hùng","BS. Trần Thị Mai","BS. Lê Quang Vinh"]),
          admittedAt: adm,
          los: Math.floor((new Date(2026,9,22) - adm) / 86400000),
          vitals: { bp: `${110+Math.floor(Math.random()*30)}/${70+Math.floor(Math.random()*15)}`, hr: 65+Math.floor(Math.random()*30), temp: (36.4+Math.random()*1.4).toFixed(1), spo2: 92+Math.floor(Math.random()*8) },
          orders: rndPickN([
            {n:"Ceftriaxon 1g IV",freq:"x2/ngày"},
            {n:"Paracetamol 500mg PO",freq:"khi sốt"},
            {n:"Truyền NaCl 0.9% 500ml",freq:"60 g/p"},
            {n:"Omeprazol 40mg IV",freq:"x1/ngày"},
            {n:"Furosemid 40mg PO",freq:"x1 sáng"},
          ], 2+Math.floor(Math.random()*3)),
          alerts: Math.random()>0.7 ? rndPickN(["Sốt cao","HA tăng","Đau ngực","SpO₂ tụt"], 1) : [],
        } : {}),
      });
    }
  });
  return beds;
};

function WardV2() {
  const [data, setData] = uS(seedWard());
  const [tab, setTab] = uS("grid");
  const [fWard, setFWard] = uS("");
  const [fStatus, setFStatus] = uS("");
  const [search, setSearch] = uS("");

  const filtered = data.filter(b => {
    if (fWard && b.ward !== fWard) return false;
    if (fStatus && b.status !== fStatus) return false;
    if (search && b.patient) { const q = search.toLowerCase(); return [b.patient.name, b.patient.pid, b.id].some(x => x.toLowerCase().includes(q)); }
    if (search && !b.patient) return b.id.toLowerCase().includes(search.toLowerCase());
    return true;
  });
  const kpis = uM(() => ({
    totalBeds: data.length,
    occupied: data.filter(b => b.status === "occupied" || b.status === "isolation").length,
    empty: data.filter(b => b.status === "empty").length,
    occupancy: Math.round(data.filter(b => b.status === "occupied" || b.status === "isolation").length / data.length * 100),
    alerts: data.filter(b => b.alerts && b.alerts.length).length,
    avgLos: 4.2,
  }), [data]);

  const open = (b) => HUI.drawer(cx => <BedDrawer b={b} cx={cx}/>);
  const handover = () => HUI.open(cx => <HandoverModal cx={cx}/>);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Tổng giường", val: kpis.totalBeds, sub: `${WARDS.length} khoa` },
        { lbl: "Có BN", val: kpis.occupied, sub: `${kpis.occupancy}% công suất`, tone: "info" },
        { lbl: "Trống", val: kpis.empty, sub: "sẵn sàng", tone: "ok" },
        { lbl: "Cảnh báo", val: kpis.alerts, sub: "BN cần theo dõi", tone: "danger" },
        { lbl: "TB ngày nằm", val: kpis.avgLos, unit: "ngày", sub: "/ ca" },
        { lbl: "Bàn giao ca", val: "07:00", sub: "ca sáng", tone: "info" },
      ]}/>
      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "grid", l: "Sơ đồ giường", ic: "grid" },
        { v: "list", l: "Danh sách BN", ic: "users" },
        { v: "orders", l: "Y lệnh hôm nay", ic: "clipboard" },
      ]} actions={<>
        <button className="ab-btn ghost" onClick={handover}><Ico name="users" size={12}/> Bàn giao ca <kbd>F4</kbd></button>
        <button className="ab-btn primary" onClick={()=>tk("Tạo y lệnh mới")}><Ico name="plus" size={12}/> Y lệnh mới <kbd>F2</kbd></button>
      </>}/>
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã BN, mã giường…"/>
        <Filter value={fWard} onChange={setFWard} options={WARDS.map(w => ({v:w.v,l:w.l}))} placeholder="▾ Khoa"/>
        <Filter value={fStatus} onChange={setFStatus} options={BED_STATUS} placeholder="▾ Trạng thái"/>
        <button className="ab-btn ghost" onClick={()=>{setSearch("");setFWard("");setFStatus("");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
        <span className="spacer"/>
        <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{filtered.length} giường</span>
      </div>
      {tab === "grid" && <BedGrid beds={filtered} onOpen={open}/>}
      {tab === "list" && <BedList beds={filtered.filter(b=>b.patient)} onOpen={open}/>}
      {tab === "orders" && <OrdersTab beds={data.filter(b=>b.patient)}/>}
    </div>
  );
}

const BedGrid = ({ beds, onOpen }) => (
  <div style={{flex:1,overflow:"auto",padding:18,background:"var(--d-1)"}}>
    {WARDS.map(w => {
      const wardBeds = beds.filter(b => b.ward === w.v);
      if (wardBeds.length === 0) return null;
      return (
        <div key={w.v} style={{marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <h3 style={{margin:0,fontSize:14}}>{w.l}</h3>
            <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{wardBeds.filter(b=>b.status==="occupied"||b.status==="isolation").length}/{wardBeds.length}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:8}}>
            {wardBeds.map(b => {
              const st = BED_STATUS.find(s => s.v === b.status);
              const tone = st.tone;
              const bg = tone==="info"?"var(--a-cy-bg)":tone==="ok"?"#fff":tone==="warn"?"var(--a-or-bg)":tone==="mag"?"var(--a-mg-bg)":"var(--a-rd-bg)";
              const line = tone==="info"?"var(--a-cy-line)":tone==="ok"?"var(--line)":tone==="warn"?"var(--a-or-line)":tone==="mag"?"var(--a-mg-line)":"var(--a-rd-line)";
              return (
                <div key={b.id} onClick={()=>onOpen(b)} style={{padding:10,background:bg,border:`1px solid ${line}`,borderRadius:6,cursor:"pointer",position:"relative"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:6}}>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:11,fontWeight:600,color:"var(--t-0)"}}>{b.id}</span>
                    {b.alerts?.length > 0 && <span style={{fontSize:10,color:"var(--a-rd-text)"}}>⚠</span>}
                  </div>
                  {b.patient ? <>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--t-0)",lineHeight:1.2,marginBottom:2}}>{b.patient.name}</div>
                    <div style={{fontSize:10.5,color:"var(--t-2)",marginBottom:4}}>{b.patient.age}T · {b.patient.gender}</div>
                    <div style={{fontSize:10.5,color:"var(--t-1)",lineHeight:1.3}}>{b.dx}</div>
                    <div style={{display:"flex",gap:6,marginTop:6,paddingTop:6,borderTop:"1px solid rgba(0,0,0,0.06)",fontSize:10,fontFamily:"var(--font-mono)",color:"var(--t-2)"}}>
                      <span>HA {b.vitals.bp}</span>
                      <span>·</span>
                      <span>SpO₂ {b.vitals.spo2}%</span>
                    </div>
                  </> : <div style={{fontSize:11,color:"var(--t-2)",padding:"14px 0",textAlign:"center"}}>{st.l}</div>}
                </div>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);

const BedList = ({ beds, onOpen }) => {
  const cols = [
    { key: "bed", label: "Giường", code: true, render: r => r.id },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patient.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.patient.pid} · {r.patient.age}T · {r.patient.gender}</div></div> },
    { key: "ward", label: "Khoa", render: r => r.wardName },
    { key: "dx", label: "Chẩn đoán", render: r => <span style={{color:"var(--t-1)"}}>{r.dx}</span> },
    { key: "doc", label: "BS điều trị", render: r => <span style={{fontSize:12}}>{r.doctor}</span> },
    { key: "los", label: "Ngày nằm", mono: true, num: true, render: r => `${r.los} ngày` },
    { key: "vitals", label: "Sinh hiệu mới nhất", mono: true, render: r => <span style={{fontSize:11}}>HA {r.vitals.bp} · SpO₂ {r.vitals.spo2}%</span> },
    { key: "alerts", label: "Cảnh báo", render: r => r.alerts?.length ? <span className="ab-stat danger" style={{height:18,padding:"0 6px",fontSize:10}}>⚠ {r.alerts[0]}</span> : <span style={{color:"var(--t-3)"}}>—</span> },
  ];
  return <DataTable columns={cols} data={beds} rowKey={r => r.id} onRowClick={onOpen} actions={r => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Hồ sơ giường" onClick={()=>onOpen(r)}/>
      <ActBtn ic="clipboard" title="Y lệnh" onClick={()=>tk("Mở y lệnh")}/>
      <ActBtn ic="logout" title="Xuất viện" onClick={()=>HUI.confirm("Xuất viện?",`${r.patient.name} - ${r.dx}`,()=>tk("Đã xuất viện"),"warn")}/>
    </div>
  )}/>;
};

const OrdersTab = ({ beds }) => (
  <div style={{flex:1,overflow:"auto",padding:18,background:"var(--d-1)"}}>
    <div style={{background:"#fff",border:"1px solid var(--line)",borderRadius:6}}>
      {beds.slice(0,20).map(b => (
        <div key={b.id} style={{padding:"14px 18px",borderBottom:"1px solid var(--line-soft)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <span style={{fontFamily:"var(--font-mono)",fontWeight:600,color:"var(--t-0)"}}>{b.id}</span>
            <span style={{fontWeight:600}}>{b.patient.name}</span>
            <span style={{fontSize:11,color:"var(--t-2)"}}>{b.dx}</span>
            <span className="spacer"/>
            <span style={{fontSize:11,color:"var(--t-2)"}}>{b.doctor}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:6}}>
            {b.orders.map((o,i) => (
              <div key={i} style={{padding:"6px 10px",background:"var(--d-1)",borderRadius:4,fontSize:12,display:"flex",alignItems:"center",gap:6}}>
                <Ico name="pill" size={11}/><span style={{flex:1}}>{o.n}</span><span style={{fontSize:11,color:"var(--t-2)"}}>{o.freq}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const BedDrawer = ({ b, cx }) => {
  if (!b.patient) return (
    <HUI.Drawer title={`Giường ${b.id}`} sub={b.wardName} size="md" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Đóng</button>
      <button className="ab-btn primary" onClick={()=>{cx();tk("Đã chọn giường để nhập viện");}}>Nhập viện vào giường này</button>
    </>}>
      <div style={{padding:"40px 0",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:8,color:"var(--t-3)"}}><Ico name="bed" size={48}/></div>
        <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Giường trống</div>
        <div style={{fontSize:12,color:"var(--t-2)"}}>Trạng thái: {BED_STATUS.find(s=>s.v===b.status).l}</div>
      </div>
    </HUI.Drawer>
  );
  return (
    <HUI.Drawer title={`${b.patient.name} · Giường ${b.id}`} sub={`${b.wardName} · ${b.dx}`} size="lg" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Đóng</button>
      <button className="ab-btn" onClick={()=>tk("+ Y lệnh mới")}><Ico name="plus" size={12}/> Y lệnh mới</button>
      <button className="ab-btn primary" onClick={()=>{cx();HUI.confirm("Xuất viện?",`${b.patient.name}`,()=>tk("Đã xuất viện"),"warn");}}>Xuất viện</button>
    </>}>
      <DrSec title="Sinh hiệu mới nhất">
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {[["HA",b.vitals.bp,"mmHg"],["Mạch",b.vitals.hr,"l/p"],["Nhiệt",b.vitals.temp,"°C"],["SpO₂",b.vitals.spo2,"%"]].map(([l,v,u],i)=>(
            <div key={i} style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6}}>
              <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>{l}</div>
              <div style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{v}<small style={{fontSize:11,color:"var(--t-2)",marginLeft:3,fontWeight:400}}>{u}</small></div>
            </div>
          ))}
        </div>
      </DrSec>
      <DrSec title="Y lệnh đang dùng">
        {b.orders.map((o,i) => (
          <div key={i} style={{padding:"8px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:4,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
            <Ico name="pill" size={12}/>
            <div style={{flex:1}}><b style={{fontSize:12.5}}>{o.n}</b><span style={{fontSize:11,color:"var(--t-2)",marginLeft:8}}>{o.freq}</span></div>
            <button className="ab-btn ghost sm" onClick={()=>tk(`Đã dừng ${o.n}`)}>Dừng</button>
          </div>
        ))}
      </DrSec>
      <DrSec title="Thông tin nhập viện">
        <DrField lbl="Mã BN">{b.patient.pid}</DrField>
        <DrField lbl="Tuổi/Giới">{b.patient.age} tuổi · {b.patient.gender}</DrField>
        <DrField lbl="Ngày nhập">{fmtDMYg(b.admittedAt)}</DrField>
        <DrField lbl="Số ngày nằm">{b.los} ngày</DrField>
        <DrField lbl="BS điều trị">{b.doctor}</DrField>
        <DrField lbl="Chẩn đoán">{b.dx}</DrField>
      </DrSec>
    </HUI.Drawer>
  );
};

const HandoverModal = ({ cx }) => (
  <HUI.Modal title="Bàn giao ca · Ca sáng → Ca chiều" size="md" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Hủy</button>
    <button className="ab-btn primary" onClick={()=>{cx();tk("Đã ký bàn giao ca");}}><Ico name="check" size={12}/> Ký bàn giao</button>
  </>}>
    <div style={{padding:"14px 18px"}}>
      <HUI.Field label="Ca giao" required><HUI.Select value="sang" onChange={()=>{}} options={[{value:"sang",label:"Ca sáng (07:00 - 13:00)"},{value:"chieu",label:"Ca chiều (13:00 - 19:00)"},{value:"toi",label:"Ca tối (19:00 - 07:00)"}]}/></HUI.Field>
      <HUI.Field label="Người giao"><HUI.Input defaultValue="ĐD. Phạm Thị Lan" readOnly/></HUI.Field>
      <HUI.Field label="Người nhận" required><HUI.Input placeholder="Chọn nhân viên ca tiếp theo…"/></HUI.Field>
      <HUI.Field label="Tóm tắt tình trạng BN"><HUI.Textarea rows={3} placeholder="VD: P05A sốt 38.5°C cần theo dõi mỗi 4h…"/></HUI.Field>
      <HUI.Field label="Lưu ý đặc biệt"><HUI.Textarea rows={3} placeholder="Y lệnh khẩn, BN cần theo dõi sát…"/></HUI.Field>
    </div>
  </HUI.Modal>
);

window.WardV2 = WardV2;
