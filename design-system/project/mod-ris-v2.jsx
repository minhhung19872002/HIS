// =====================================================================
// HIS Terminal · Module: CHẨN ĐOÁN HÌNH ẢNH (RIS v2)
// Lịch chụp, modality (XQ/CT/MRI/SA), đọc phim, in báo cáo
// =====================================================================

const RIS_STATUS = [
  { v: "scheduled", l: "Đã lên lịch",   tone: "info" },
  { v: "checkedin", l: "Đã đến",        tone: "warn" },
  { v: "imaging",   l: "Đang chụp",     tone: "mag" },
  { v: "reading",   l: "Chờ đọc phim",  tone: "warn" },
  { v: "reported",  l: "Đã đọc",        tone: "ok" },
  { v: "cancelled", l: "Hủy",           tone: "ok" },
];
const MODALITIES = [
  { v: "XR",  l: "X-Quang",            color: "#0891b2", count: 4 },
  { v: "CT",  l: "CT-Scanner",         color: "#7c3aed", count: 2 },
  { v: "MRI", l: "Cộng hưởng từ",      color: "#db2777", count: 1 },
  { v: "US",  l: "Siêu âm",            color: "#16a34a", count: 5 },
  { v: "MAM", l: "Nhũ ảnh",            color: "#ea580c", count: 1 },
];
const RIS_PROCS = [
  { c: "XR-CHE", l: "X-Quang ngực thẳng",         m: "XR",  dur: 10 },
  { c: "XR-ABD", l: "X-Quang bụng đứng",          m: "XR",  dur: 10 },
  { c: "XR-KNE", l: "X-Quang khớp gối 2 tư thế",  m: "XR",  dur: 15 },
  { c: "CT-BRA", l: "CT sọ não không cản quang",  m: "CT",  dur: 20 },
  { c: "CT-CHE", l: "CT lồng ngực có cản quang",  m: "CT",  dur: 30 },
  { c: "CT-ABD", l: "CT bụng có cản quang",       m: "CT",  dur: 30 },
  { c: "MR-LSP", l: "MRI cột sống thắt lưng",     m: "MRI", dur: 45 },
  { c: "MR-BRA", l: "MRI sọ não",                 m: "MRI", dur: 40 },
  { c: "US-ABD", l: "Siêu âm bụng tổng quát",     m: "US",  dur: 15 },
  { c: "US-THY", l: "Siêu âm tuyến giáp",         m: "US",  dur: 10 },
  { c: "US-CAR", l: "Siêu âm tim qua thành ngực", m: "US",  dur: 25 },
];

const seedRis = () => {
  const rows = [];
  for (let i = 0; i < 56; i++) {
    const p = rndPick(RIS_PROCS);
    const t = new Date(2026, 9, 22, 7+Math.floor(i/6), (i*9)%60);
    const status = ["scheduled","checkedin","imaging","reading","reported","reported","reported","reported"][i%8];
    rows.push({
      code: `RIS-${String(20261022).slice(-6)}-${String(i+1).padStart(3,"0")}`,
      pid: rndPid(), patientName: rndName(i), age: rndAge(), gender: rndGender(),
      procCode: p.c, procName: p.l, modality: p.m, dur: p.dur,
      scheduledAt: t,
      machine: `${p.m}-${String((i%MODALITIES.find(x=>x.v===p.m).count)+1).padStart(2,"0")}`,
      orderedBy: rndPick(["BS. Nguyễn Văn Hùng","BS. Trần Thị Mai","BS. Lê Quang Vinh"]),
      reason: rndPick(["Đau ngực","Theo dõi sau mổ","Tầm soát","Đau đầu","Khám sức khoẻ","Sốt kéo dài","Đánh giá chấn thương"]),
      contrast: p.m === "CT" || p.m === "MRI" ? rndPick([true, false]) : false,
      status,
      ...(status === "reported" ? {
        readBy: rndPick(["BS. Hoàng Văn Minh","BS. Đỗ Thị Phúc","BS. Vũ Quang Hà"]),
        readAt: new Date(t.getTime()+90*60000),
        impression: rndPick(["Hình ảnh bình thường","Tổn thương nốt 8mm thuỳ trên phổi P, theo dõi","Đặc lan toả nhu mô phổi 2 bên - viêm phổi","Sỏi túi mật 12mm, không tắc nghẽn","Cột sống thoái hoá độ 2"])
      } : {}),
    });
  }
  return rows;
};

function RisV2() {
  const [data, setData] = uS(seedRis());
  const [tab, setTab] = uS("queue");
  const [stab, setStab] = uS("all");
  const [fMod, setFMod] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const counts = { all: data.length };
  RIS_STATUS.forEach(s => counts[s.v] = data.filter(r => r.status === s.v).length);
  const filtered = data.filter(r => {
    if (stab !== "all" && r.status !== stab) return false;
    if (fMod && r.modality !== fMod) return false;
    if (search) { const q = search.toLowerCase(); return [r.patientName, r.pid, r.code, r.procName].some(x => x.toLowerCase().includes(q)); }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    total: data.length,
    reading: data.filter(r => r.status === "reading").length,
    reported: data.filter(r => r.status === "reported").length,
    contrast: data.filter(r => r.contrast).length,
    avgRead: 28,
    backlog: data.filter(r => r.status === "reading").length,
  }), [data]);

  const update = (code, patch) => setData(p => p.map(r => r.code === code ? { ...r, ...patch } : r));
  const open = (r) => HUI.drawer(cx => <RisDrawer r={r} cx={cx} onUpdate={update}/>);
  const openRead = (r) => HUI.open(cx => <RisReadModal r={r} cx={cx} onSubmit={(impression) => { update(r.code, { status: "reported", impression, readBy: window.HIS.currentUser.name, readAt: new Date() }); cx(); tk("Đã ký báo cáo"); }}/>);

  const cols = [
    { key: "code", label: "Mã RIS", code: true, render: r => r.code },
    { key: "time", label: "Giờ", mono: true, render: r => fmtHMg(r.scheduledAt) },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patientName}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T · {r.gender}</div></div> },
    { key: "mod", label: "Modality", render: r => { const m = MODALITIES.find(x => x.v === r.modality); return <span style={{display:"inline-block",padding:"2px 8px",background:m.color,color:"#fff",borderRadius:3,fontSize:11,fontWeight:700,fontFamily:"var(--font-mono)"}}>{m.v}</span>; } },
    { key: "proc", label: "Kỹ thuật", render: r => <div><div style={{fontWeight:500,color:"var(--t-0)"}}>{r.procName}</div><div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{r.procCode}{r.contrast && <span style={{marginLeft:6,color:"var(--a-mg-text)"}}>+ Cản quang</span>}</div></div> },
    { key: "machine", label: "Máy", mono: true, render: r => r.machine },
    { key: "reason", label: "Lý do CĐ", render: r => <span style={{color:"var(--t-1)",fontSize:12}}>{r.reason}</span> },
    { key: "doc", label: "BS chỉ định", render: r => <span style={{fontSize:12}}>{r.orderedBy}</span> },
    { key: "status", label: "Trạng thái", render: r => { const s = RIS_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      {r.status === "checkedin" && <ActBtn ic="play" title="Bắt đầu chụp" onClick={()=>{update(r.code,{status:"imaging"});tk("Bắt đầu chụp");}}/>}
      {r.status === "imaging" && <ActBtn ic="check" title="Hoàn tất chụp" onClick={()=>{update(r.code,{status:"reading"});tk("Đã chuyển BS đọc phim");}}/>}
      {r.status === "reading" && <ActBtn ic="edit" title="Đọc phim" onClick={()=>openRead(r)}/>}
      <ActBtn ic="eye" title="Chi tiết" onClick={()=>open(r)}/>
      <ActBtn ic="print" title="In phiếu" onClick={()=>tk("Đã in phiếu KQ")}/>
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Tổng ca", val: kpis.total, sub: "hôm nay" },
        { lbl: "Chờ đọc phim", val: kpis.reading, sub: "backlog", tone: "warn" },
        { lbl: "Đã có KQ", val: kpis.reported, sub: `${Math.round(kpis.reported/kpis.total*100)}%`, tone: "ok" },
        { lbl: "Có cản quang", val: kpis.contrast, sub: "ca cần chuẩn bị", tone: "info" },
        { lbl: "TB đọc phim", val: kpis.avgRead, unit: "p", sub: "đạt mục tiêu", tone: "ok" },
        { lbl: "Modality", val: MODALITIES.length, sub: `${MODALITIES.reduce((s,m)=>s+m.count,0)} máy`, tone: "info" },
      ]}/>
      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "queue", l: "Hàng đợi chụp", ic: "users" },
        { v: "machines", l: "Sơ đồ máy", ic: "grid" },
      ]} actions={<>
        <button className="ab-btn ghost" onClick={()=>tk("Xem worklist DICOM")}><Ico name="image" size={12}/> DICOM Worklist</button>
        <button className="ab-btn primary" onClick={()=>tk("Tạo chỉ định CĐHA")}><Ico name="plus" size={12}/> Chỉ định CĐHA <kbd>F2</kbd></button>
      </>}/>
      {tab === "queue" && <>
        <StatusTabs value={stab} onChange={setStab} tabs={RIS_STATUS} counts={counts}/>
        <div className="ab-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã RIS, kỹ thuật…"/>
          <Filter value={fMod} onChange={setFMod} options={MODALITIES.map(m=>({v:m.v,l:`${m.v} · ${m.l}`}))} placeholder="▾ Modality"/>
          <button className="ab-btn ghost" onClick={()=>{setSearch("");setFMod("");setStab("all");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
          <span className="spacer"/>
          <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{filtered.length} ca</span>
        </div>
        <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
      </>}
      {tab === "machines" && <RisMachinesBoard data={data}/>}
    </div>
  );
}

const RisMachinesBoard = ({ data }) => (
  <div style={{flex:1,overflow:"auto",padding:18,background:"var(--d-1)"}}>
    {MODALITIES.map(m => (
      <div key={m.v} style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{padding:"3px 10px",background:m.color,color:"#fff",borderRadius:3,fontSize:11,fontWeight:700,fontFamily:"var(--font-mono)"}}>{m.v}</span>
          <h4 style={{margin:0,fontSize:14}}>{m.l}</h4>
        </div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${m.count},1fr)`,gap:12}}>
          {Array.from({length: m.count}).map((_,i) => {
            const machine = `${m.v}-${String(i+1).padStart(2,"0")}`;
            const cases = data.filter(c => c.machine === machine).sort((a,b)=>a.scheduledAt-b.scheduledAt);
            const live = cases.find(c => c.status === "imaging");
            return (
              <div key={machine} style={{background:"#fff",border:`1px solid ${live?m.color:"var(--line)"}`,borderRadius:6,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <b style={{fontFamily:"var(--font-mono)",fontSize:12}}>{machine}</b>
                  {live ? <span className="ab-stat danger" style={{height:18,padding:"0 6px",fontSize:10}}>● ĐANG CHỤP</span> : <span className="ab-stat success" style={{height:18,padding:"0 6px",fontSize:10}}>Sẵn sàng</span>}
                </div>
                {cases.slice(0,3).map(c => (
                  <div key={c.code} style={{padding:"6px 8px",background:"var(--d-1)",borderRadius:3,marginBottom:3,fontSize:11}}>
                    <span style={{fontFamily:"var(--font-mono)",fontWeight:600}}>{fmtHMg(c.scheduledAt)}</span> · {c.patientName}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

const RisDrawer = ({ r, cx, onUpdate }) => {
  const m = MODALITIES.find(x => x.v === r.modality);
  return (
    <HUI.Drawer title={`Phiếu CĐHA · ${r.code}`} sub={`${r.patientName} · ${r.procName}`} size="lg" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Đóng</button>
      <button className="ab-btn" onClick={()=>tk("Đã in phiếu KQ")}><Ico name="print" size={12}/> In phiếu</button>
      <button className="ab-btn" onClick={()=>tk("Mở DICOM viewer")}><Ico name="image" size={12}/> Xem ảnh</button>
    </>}>
      <DrSec title="Bệnh nhân">
        <DrField lbl="Họ tên">{r.patientName}</DrField>
        <DrField lbl="Mã BN">{r.pid}</DrField>
        <DrField lbl="Tuổi/Giới">{r.age} tuổi · {r.gender}</DrField>
        <DrField lbl="BS chỉ định">{r.orderedBy}</DrField>
        <DrField lbl="Lý do">{r.reason}</DrField>
      </DrSec>
      <DrSec title="Kỹ thuật">
        <DrField lbl="Modality"><span style={{padding:"2px 8px",background:m.color,color:"#fff",borderRadius:3,fontWeight:700,fontFamily:"var(--font-mono)"}}>{m.v}</span> · {m.l}</DrField>
        <DrField lbl="Tên kỹ thuật">{r.procName}</DrField>
        <DrField lbl="Mã"><b style={{fontFamily:"var(--font-mono)"}}>{r.procCode}</b></DrField>
        <DrField lbl="Máy">{r.machine}</DrField>
        <DrField lbl="Thời gian dự kiến">{r.dur} phút</DrField>
        {r.contrast && <DrField lbl="Cản quang"><span className="ab-stat warn" style={{height:18,padding:"0 6px",fontSize:10}}>⚠ Có dùng cản quang</span></DrField>}
      </DrSec>
      {r.status === "reported" && <DrSec title="Báo cáo đọc phim">
        <div style={{padding:14,background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,fontSize:13,lineHeight:1.6,color:"var(--t-1)"}}>{r.impression}</div>
        <div style={{marginTop:8,fontSize:11,color:"var(--t-2)"}}>{r.readBy} · {fmtDTg(r.readAt)}</div>
      </DrSec>}
    </HUI.Drawer>
  );
};

const RisReadModal = ({ r, cx, onSubmit }) => {
  const [imp, setImp] = uS("");
  return (
    <HUI.Modal title="Đọc phim · Báo cáo CĐHA" sub={`${r.patientName} · ${r.procName}`} size="md" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Hủy</button>
      <button className="ab-btn primary" onClick={()=>onSubmit(imp)} disabled={!imp.trim()}><Ico name="check" size={12}/> Ký & lưu báo cáo</button>
    </>}>
      <div style={{padding:"14px 18px"}}>
        <HUI.Field label="Mô tả hình ảnh"><HUI.Textarea rows={5} placeholder="Mô tả chi tiết các đặc điểm trên phim…"/></HUI.Field>
        <HUI.Field label="Kết luận / Impression" required><HUI.Textarea rows={3} value={imp} onChange={e=>setImp(e.target.value)} placeholder="Kết luận của BS đọc phim…"/></HUI.Field>
        <HUI.Field label="Khuyến nghị"><HUI.Textarea rows={2} placeholder="Đề nghị thêm xét nghiệm, theo dõi…"/></HUI.Field>
      </div>
    </HUI.Modal>
  );
};

window.RisV2 = RisV2;
