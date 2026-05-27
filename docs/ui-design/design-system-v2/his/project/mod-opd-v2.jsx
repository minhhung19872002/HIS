// =====================================================================
// HIS Terminal · Module: KHÁM BỆNH (OPD v2)
// Phòng khám: encounter, kê đơn, chỉ định CLS, kết luận, chuyển khoa
// =====================================================================

const OPD_STATUSES = [
  { v: "queued",     l: "Đang chờ",      tone: "info" },
  { v: "in-progress",l: "Đang khám",     tone: "mag" },
  { v: "lab-pending",l: "Chờ CLS",       tone: "warn" },
  { v: "completed",  l: "Đã kết luận",   tone: "ok" },
  { v: "referred",   l: "Chuyển tuyến",  tone: "info" },
  { v: "admitted",   l: "Nhập viện",     tone: "ok" },
];
const OPD_DEPTS = [
  { v: "NTQ", l: "Nội tổng quát" },{ v: "NTM", l: "Nội tim mạch" },
  { v: "NTH", l: "Nội tiêu hoá" },{ v: "NHI", l: "Nhi" },
  { v: "MAT", l: "Mắt" },{ v: "TMH", l: "Tai Mũi Họng" },
  { v: "RHM", l: "Răng Hàm Mặt" },{ v: "DLU", l: "Da liễu" },
];
const OPD_DOCS = ["BS. Nguyễn Văn Hùng","BS. Trần Thị Mai","BS. Lê Quang Vinh","BS. Phạm Thị Hà","BS. Đỗ Văn Sơn","BS. Hoàng Thị Lan"];
const COMPLAINTS = ["Đau đầu, chóng mặt","Tăng huyết áp tái khám","Đau bụng vùng thượng vị","Sốt cao 3 ngày","Ho khan kéo dài","Đau khớp gối","Khó thở khi gắng sức","Đau lưng mạn","Đầy bụng khó tiêu","Đau ngực trái"];
const ICD = [
  { c: "I10",   l: "Tăng huyết áp vô căn" },
  { c: "K29.7", l: "Viêm dạ dày" },
  { c: "J06.9", l: "Nhiễm trùng đường hô hấp trên" },
  { c: "M54.5", l: "Đau lưng dưới" },
  { c: "E11.9", l: "Đái tháo đường tip 2" },
  { c: "G43.9", l: "Đau nửa đầu" },
  { c: "R51",   l: "Đau đầu" },
  { c: "K30",   l: "Khó tiêu chức năng" },
];

const seedOpd = () => {
  const rows = [];
  for (let i = 0; i < 56; i++) {
    const t = new Date(2026, 9, 22, 7 + Math.floor(i/8), (i*7)%60);
    const dept = rndPick(OPD_DEPTS);
    const status = ["queued","in-progress","lab-pending","completed","completed","completed","admitted","referred"][i%8];
    const dx = rndPick(ICD);
    rows.push({
      code: `OPD-${String(20261022).slice(-6)}-${String(i+1).padStart(3,"0")}`,
      pid: rndPid(), patientName: rndName(i), age: rndAge(), gender: rndGender(),
      dept: dept.v, deptName: dept.l,
      doctor: rndPick(OPD_DOCS),
      visitTime: t,
      complaint: rndPick(COMPLAINTS),
      dxCode: dx.c, dxName: dx.l,
      status,
      vitals: { bp: `${110+Math.floor(Math.random()*30)}/${70+Math.floor(Math.random()*15)}`, hr: 65+Math.floor(Math.random()*30), temp: (36.4+Math.random()*1.4).toFixed(1), spo2: 95+Math.floor(Math.random()*5) },
      orders: rndPickN(["Sinh hoá máu","CTM","XQ phổi thẳng","Siêu âm bụng tổng quát","Điện tim 12CĐ","HbA1c","Phân tích nước tiểu","CRP định lượng"], 1+Math.floor(Math.random()*3)),
      meds: rndPickN(["Paracetamol 500mg x 10v","Amoxicillin 500mg x 14v","Omeprazol 20mg x 14v","Amlodipin 5mg x 30v","Loratadin 10mg x 7v","Salbutamol xịt 100mcg","Vitamin B-Complex x 30v"], 1+Math.floor(Math.random()*3)),
      audit: [
        { t, action: "BN vào phòng khám", by: "Hệ thống", tone: "info" },
        ...(status !== "queued" ? [{ t: new Date(t.getTime()+5*60000), action: "BS bắt đầu khám", by: rndPick(OPD_DOCS), tone: "mag" }] : []),
        ...(status === "completed" || status === "admitted" || status === "referred" ? [{ t: new Date(t.getTime()+22*60000), action: `Kết luận: ${dx.l}`, by: rndPick(OPD_DOCS), tone: "ok" }] : []),
      ],
    });
  }
  return rows;
};

function OpdV2() {
  const [data, setData] = uS(seedOpd());
  const [tab, setTab] = uS("queue");
  const [stab, setStab] = uS("all");
  const [search, setSearch] = uS("");
  const [fDept, setFDept] = uS("");
  const [fDoc, setFDoc] = uS("");
  const [page, setPage] = uS(0);
  const [sel, setSel] = uS(new Set());
  const PER = 18;

  const counts = uM(() => {
    const c = { all: data.length };
    OPD_STATUSES.forEach(s => c[s.v] = data.filter(r => r.status === s.v).length);
    return c;
  }, [data]);
  const filtered = uM(() => data.filter(r => {
    if (stab !== "all" && r.status !== stab) return false;
    if (fDept && r.dept !== fDept) return false;
    if (fDoc && r.doctor !== fDoc) return false;
    if (search) { const q = search.toLowerCase(); return [r.patientName, r.pid, r.code, r.complaint].some(x => x.toLowerCase().includes(q)); }
    return true;
  }), [data, stab, fDept, fDoc, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    today: data.length,
    inProgress: data.filter(r => r.status === "in-progress").length,
    queued: data.filter(r => r.status === "queued").length,
    completed: data.filter(r => r.status === "completed").length,
    admitted: data.filter(r => r.status === "admitted").length,
    avgTime: 18,
  }), [data]);

  const update = (code, patch, action, tone="info") => setData(p => p.map(r => r.code === code ? { ...r, ...patch, audit: [...r.audit, { t: new Date(), action, by: window.HIS.currentUser.name, tone }] } : r));

  const openDetail = (r) => HUI.drawer(cx => <OpdDrawer r={r} cx={cx} onUpdate={update}/>);
  const openOrder = (r) => HUI.open(cx => <OpdOrderModal r={r} cx={cx} onSubmit={(orders) => { update(r.code, { orders, status: "lab-pending" }, `Chỉ định ${orders.length} CLS`, "warn"); cx(); tk("Đã gửi chỉ định CLS"); }}/>);
  const openConclude = (r) => HUI.open(cx => <OpdConcludeModal r={r} cx={cx} onSubmit={(d) => { update(r.code, { ...d, status: "completed" }, `Kết luận: ${d.dxName}`, "ok"); cx(); tk("Đã lưu kết luận"); }}/>);
  const callNext = () => { const n = data.find(r => r.status === "queued"); if (!n) return ti("Hết hàng đợi"); update(n.code, { status: "in-progress" }, "Bắt đầu khám", "mag"); tk(`Mời ${n.patientName} vào phòng`); };

  const cols = [
    { key: "code", label: "Mã KB", code: true, render: r => r.code },
    { key: "time", label: "Giờ", mono: true, render: r => fmtHMg(r.visitTime) },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patientName}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T · {r.gender}</div></div> },
    { key: "dept", label: "Khoa", render: r => r.deptName },
    { key: "doc", label: "Bác sĩ", render: r => <span style={{fontSize:12}}>{r.doctor}</span> },
    { key: "complaint", label: "Lý do", render: r => <span style={{color:"var(--t-1)"}}>{r.complaint}</span> },
    { key: "dx", label: "Chẩn đoán", mono: true, render: r => r.status === "completed" || r.status === "admitted" ? <span><b>{r.dxCode}</b> · {r.dxName}</span> : <span style={{color:"var(--t-3)"}}>—</span> },
    { key: "status", label: "Trạng thái", render: r => { const s = OPD_STATUSES.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      {r.status === "queued" && <ActBtn ic="play" title="Bắt đầu khám" onClick={() => update(r.code, { status: "in-progress" }, "Bắt đầu khám", "mag")}/>}
      {r.status === "in-progress" && <ActBtn ic="flask" title="Chỉ định CLS" onClick={() => openOrder(r)}/>}
      {(r.status === "in-progress" || r.status === "lab-pending") && <ActBtn ic="check" title="Kết luận" onClick={() => openConclude(r)}/>}
      <ActBtn ic="eye" title="Xem chi tiết" onClick={() => openDetail(r)}/>
      <ActBtn ic="print" title="In phiếu" onClick={() => tk("Đã in phiếu khám")}/>
    </div>
  );

  uE(() => {
    const h = (e) => { if (e.key === "F2" && !e.target.closest("input,textarea,select,[contenteditable]")) { e.preventDefault(); (() => tk("Tạo encounter mới"))(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  uE(() => {
    const h = (e) => {
      if (e.target.closest("input,textarea,select,[contenteditable]")) return;
      if (e.key === "F3") { e.preventDefault(); (callNext)(); return; }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);



  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Hôm nay", val: kpis.today, sub: "lượt khám" },
        { lbl: "Đang khám", val: kpis.inProgress, sub: "phòng", tone: "info" },
        { lbl: "Đang chờ", val: kpis.queued, sub: "hàng đợi", tone: "warn" },
        { lbl: "Đã kết luận", val: kpis.completed, sub: `${Math.round(kpis.completed/Math.max(kpis.today,1)*100)}%`, tone: "ok" },
        { lbl: "Nhập viện", val: kpis.admitted, sub: "ca", tone: "ok" },
        { lbl: "TB / ca", val: kpis.avgTime, unit: "p", sub: "tốt" },
      ]}/>
      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "queue", l: "Hàng đợi khám", ic: "users" },
        { v: "rooms", l: "Sơ đồ phòng", ic: "grid" },
      ]} actions={<>
        <button className="ab-btn ok" onClick={callNext}><Ico name="bell" size={12}/> Mời BN tiếp <kbd>F3</kbd></button>
        <button className="ab-btn primary" onClick={()=>tk("Tạo encounter mới")}><Ico name="plus" size={12}/> Encounter mới <kbd>F2</kbd></button>
      </>}/>
      {tab === "queue" && <>
        <StatusTabs value={stab} onChange={setStab} tabs={OPD_STATUSES} counts={counts}/>
        <div className="ab-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã BN, mã KB, chẩn đoán…"/>
          <Filter value={fDept} onChange={setFDept} options={OPD_DEPTS} placeholder="▾ Khoa"/>
          <Filter value={fDoc} onChange={setFDoc} options={OPD_DOCS.map(d => ({v:d,l:d}))} placeholder="▾ Bác sĩ"/>
          <button className="ab-btn ghost" onClick={()=>{setSearch("");setFDept("");setFDoc("");setStab("all");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
          <span className="spacer"/>
          <button className="ab-btn ghost" onClick={()=>tk(`Đã xuất ${filtered.length} dòng`)}><Ico name="download" size={12}/> Xuất</button>
        </div>
        <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={openDetail} actions={actions}/>
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
      </>}
      {tab === "rooms" && <OpdRoomsTab data={data}/>}
    </div>
  );
}

const OpdDrawer = ({ r, cx, onUpdate }) => (
  <HUI.Drawer title={`Phiếu khám · ${r.code}`} sub={`${r.patientName} · ${r.pid}`} size="lg" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Đóng</button>
    <button className="ab-btn" onClick={()=>tk("Đã in phiếu khám")}><Ico name="print" size={12}/> In phiếu khám</button>
    {r.status !== "completed" && <button className="ab-btn primary" onClick={()=>{onUpdate(r.code,{status:"completed"},"Hoàn tất khám","ok");cx();tk("Đã hoàn tất");}}>Hoàn tất khám</button>}
  </>}>
    <DrSec title="Thông tin bệnh nhân">
      <DrField lbl="Họ tên">{r.patientName}</DrField>
      <DrField lbl="Mã BN / Tuổi">{r.pid} · {r.age} tuổi · {r.gender}</DrField>
      <DrField lbl="Khoa khám">{r.deptName}</DrField>
      <DrField lbl="Bác sĩ">{r.doctor}</DrField>
      <DrField lbl="Lý do khám">{r.complaint}</DrField>
    </DrSec>
    <DrSec title="Sinh hiệu">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {[["HA",r.vitals.bp,"mmHg"],["Mạch",r.vitals.hr,"l/p"],["Nhiệt",r.vitals.temp,"°C"],["SpO₂",r.vitals.spo2,"%"]].map(([l,v,u],i)=>(
          <div key={i} style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6}}>
            <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{v}<small style={{fontSize:11,color:"var(--t-2)",marginLeft:3,fontWeight:400}}>{u}</small></div>
          </div>
        ))}
      </div>
    </DrSec>
    <DrSec title="Chỉ định cận lâm sàng" action={r.status!=="completed" && <button className="ab-btn sm ghost" onClick={()=>tk("+ Thêm chỉ định")}><Ico name="plus" size={11}/> Thêm</button>}>
      {r.orders.length === 0 ? <div style={{color:"var(--t-3)",fontSize:12}}>Chưa có chỉ định</div> :
        r.orders.map((o,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"var(--d-1)",borderRadius:4,marginBottom:4,fontSize:12.5}}>
            <Ico name="flask" size={12}/> <span style={{flex:1}}>{o}</span>
            <span className="ab-stat info" style={{height:18,padding:"0 6px",fontSize:10}}>Đang chờ</span>
          </div>
        ))
      }
    </DrSec>
    <DrSec title="Đơn thuốc" action={r.status!=="completed" && <button className="ab-btn sm ghost" onClick={()=>tk("+ Thêm thuốc")}><Ico name="plus" size={11}/> Thêm</button>}>
      {r.meds.map((m,i)=>(<div key={i} style={{padding:"7px 10px",background:"var(--d-1)",borderRadius:4,marginBottom:4,fontSize:12.5}}><Ico name="pill" size={12}/> <span style={{marginLeft:6}}>{m}</span></div>))}
    </DrSec>
    {(r.status==="completed"||r.status==="admitted") && <DrSec title="Kết luận">
      <DrField lbl="Mã ICD-10"><b style={{fontFamily:"var(--font-mono)"}}>{r.dxCode}</b></DrField>
      <DrField lbl="Chẩn đoán">{r.dxName}</DrField>
    </DrSec>}
    <DrSec title="Lịch sử (Audit)">{r.audit.map((e,i)=><AuditLine key={i} entry={e}/>)}</DrSec>
  </HUI.Drawer>
);

const OpdOrderModal = ({ r, cx, onSubmit }) => {
  const [picks, setPicks] = uS(new Set(r.orders));
  const opts = ["Sinh hoá máu cơ bản","Công thức máu","X-Quang phổi thẳng","X-Quang ngực nghiêng","Siêu âm bụng","Siêu âm tim","ECG 12 chuyển đạo","HbA1c","Phân tích nước tiểu","CRP","Định lượng glucose","Lipid máu","Chức năng gan","Chức năng thận"];
  const t = (o) => { const s = new Set(picks); s.has(o)?s.delete(o):s.add(o); setPicks(s); };
  return (
    <HUI.Modal title="Chỉ định cận lâm sàng" sub={`${r.patientName} · ${r.code}`} size="md" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Hủy</button>
      <button className="ab-btn primary" onClick={()=>onSubmit([...picks])} disabled={picks.size===0}>Gửi chỉ định ({picks.size})</button>
    </>}>
      <div style={{padding:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {opts.map(o => (
          <label key={o} className={`hui-radio ${picks.has(o)?"on":""}`} style={{padding:"8px 10px"}}>
            <input type="checkbox" checked={picks.has(o)} onChange={()=>t(o)}/>
            <span className="dot"/>
            <span className="t"><b>{o}</b></span>
          </label>
        ))}
      </div>
    </HUI.Modal>
  );
};

const OpdConcludeModal = ({ r, cx, onSubmit }) => {
  const [dx, setDx] = uS(r.dxCode);
  const [note, setNote] = uS("");
  const [plan, setPlan] = uS("kê đơn");
  const cur = ICD.find(x => x.c === dx) || ICD[0];
  return (
    <HUI.Modal title="Kết luận khám" sub={r.patientName} size="md" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Hủy</button>
      <button className="ab-btn primary" onClick={()=>onSubmit({dxCode: cur.c, dxName: cur.l, note, plan})}><Ico name="check" size={12}/> Lưu kết luận</button>
    </>}>
      <div style={{padding:"14px 18px"}}>
        <HUI.Field label="Chẩn đoán (ICD-10)" required>
          <HUI.Select value={dx} onChange={e=>setDx(e.target.value)} options={ICD.map(i => ({value:i.c, label:`${i.c} · ${i.l}`}))}/>
        </HUI.Field>
        <HUI.Field label="Hướng xử trí" required>
          <HUI.Radio name="plan" value={plan} onChange={setPlan} options={[
            {value:"kê đơn", label:"Kê đơn về", sub:"Điều trị ngoại trú"},
            {value:"nhập viện", label:"Nhập viện", sub:"Chuyển khoa nội trú"},
            {value:"chuyển tuyến", label:"Chuyển tuyến", sub:"BV tuyến trên"},
            {value:"tái khám", label:"Hẹn tái khám", sub:"7-14 ngày"},
          ]}/>
        </HUI.Field>
        <HUI.Field label="Ghi chú lâm sàng"><HUI.Textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Mô tả thêm về tình trạng và hướng dẫn…"/></HUI.Field>
      </div>
    </HUI.Modal>
  );
};

const OpdRoomsTab = ({ data }) => (
  <div style={{flex:1,overflow:"auto",padding:18,background:"var(--d-1)"}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
      {OPD_DEPTS.map(d => {
        const inProg = data.filter(r => r.dept === d.v && r.status === "in-progress");
        const wait = data.filter(r => r.dept === d.v && r.status === "queued").length;
        return (
          <div key={d.v} style={{background:"#fff",border:"1px solid var(--line)",borderRadius:8,padding:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <h4 style={{margin:0,fontSize:14}}>{d.l}</h4>
              <span className="ab-stat info">{wait} chờ</span>
            </div>
            {inProg.length === 0 ? <div style={{color:"var(--t-3)",fontSize:12,padding:"10px 0"}}>Phòng trống</div> :
              inProg.map(r => (
                <div key={r.code} style={{padding:"8px 10px",background:"var(--a-cy-bg)",border:"1px solid var(--a-cy-line)",borderRadius:4,marginBottom:4,fontSize:12}}>
                  <div style={{fontWeight:600}}>{r.patientName}</div>
                  <div style={{color:"var(--t-2)",fontSize:11}}>{r.doctor} · {fmtHMg(r.visitTime)}</div>
                </div>
              ))
            }
          </div>
        );
      })}
    </div>
  </div>
);

window.OpdV2 = OpdV2;
