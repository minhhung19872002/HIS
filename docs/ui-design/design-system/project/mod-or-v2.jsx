// =====================================================================
// HIS Terminal · Module: PHẪU THUẬT (OR v2)
// Lịch mổ, ekip, biên bản phẫu thuật
// =====================================================================

const OR_ROOMS = ["OR-01","OR-02","OR-03","OR-04","OR-05","OR-06"];
const OR_STATUS = [
  { v: "scheduled", l: "Đã lên lịch", tone: "info" },
  { v: "preop",     l: "Tiền phẫu",   tone: "warn" },
  { v: "ongoing",   l: "Đang mổ",     tone: "danger" },
  { v: "recovery",  l: "Hồi tỉnh",    tone: "mag" },
  { v: "completed", l: "Hoàn tất",    tone: "ok" },
  { v: "cancelled", l: "Hủy",         tone: "ok" },
];
const PROCEDURES = [
  { c: "47.0", l: "Cắt ruột thừa nội soi", dur: 60, type: "Cấp cứu" },
  { c: "53.4", l: "Mổ thoát vị bẹn", dur: 90, type: "Chương trình" },
  { c: "75.0", l: "Mổ lấy thai", dur: 45, type: "Cấp cứu" },
  { c: "08.2", l: "Phaco + IOL", dur: 30, type: "Chương trình" },
  { c: "44.4", l: "Cắt dạ dày bán phần", dur: 180, type: "Chương trình" },
  { c: "81.5", l: "Thay khớp gối", dur: 150, type: "Chương trình" },
  { c: "39.6", l: "CABG x 3 mạch", dur: 240, type: "Chương trình" },
];
const SURGEONS = ["BS. Phạm Văn Hải","BS. Lê Quốc Bảo","BS. Trần Minh Khôi","BS. Đỗ Thị Hồng"];
const ANESTH = ["BS. Nguyễn Văn Trí","BS. Vũ Thị Yến","BS. Phan Quốc Anh"];

const seedOr = () => {
  const rows = [];
  for (let i = 0; i < 32; i++) {
    const p = rndPick(PROCEDURES);
    const day = i < 16 ? 22 : 23;
    const hour = 7 + Math.floor(Math.random()*10);
    const start = new Date(2026, 9, day, hour, [0,30][Math.floor(Math.random()*2)]);
    const end = new Date(start.getTime() + p.dur*60000);
    const status = day < 22 ? "completed" : day === 22 ? rndPick(["completed","completed","ongoing","recovery","preop","scheduled"]) : "scheduled";
    rows.push({
      code: `OR-${String(20261022).slice(-6)}-${String(i+1).padStart(3,"0")}`,
      pid: rndPid(), patientName: rndName(i), age: rndAge(), gender: rndGender(),
      room: rndPick(OR_ROOMS),
      procCode: p.c, procName: p.l, procDur: p.dur, procType: p.type,
      surgeon: rndPick(SURGEONS),
      anesth: rndPick(ANESTH),
      assistants: rndPickN(SURGEONS, 1+Math.floor(Math.random()*2)),
      scrubNurse: rndPick(["ĐD. Hoàng Thị Nga","ĐD. Trần Thị Loan","ĐD. Lê Văn Bình"]),
      anesthType: rndPick(["Mê toàn thân","Mê tủy sống","Tê tại chỗ"]),
      asa: 1+Math.floor(Math.random()*4),
      start, end,
      status,
      bloodBank: Math.random()>0.6,
      preDx: rndPick(["Viêm ruột thừa cấp","Thoát vị bẹn phải","Đục thuỷ tinh thể","Sỏi mật"]),
    });
  }
  return rows;
};

function OrV2() {
  const [data, setData] = uS(seedOr());
  const [tab, setTab] = uS("schedule");
  const [stab, setStab] = uS("all");
  const [fRoom, setFRoom] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const today = data.filter(r => r.start.getDate() === 22);
  const counts = { all: today.length };
  OR_STATUS.forEach(s => counts[s.v] = today.filter(r => r.status === s.v).length);
  const filtered = today.filter(r => {
    if (stab !== "all" && r.status !== stab) return false;
    if (fRoom && r.room !== fRoom) return false;
    if (search) { const q = search.toLowerCase(); return [r.patientName, r.pid, r.code, r.procName].some(x => x.toLowerCase().includes(q)); }
    return true;
  }).sort((a,b)=>a.start-b.start);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    today: today.length,
    ongoing: today.filter(r => r.status === "ongoing").length,
    completed: today.filter(r => r.status === "completed").length,
    rooms: OR_ROOMS.length,
    avgDur: 95,
    cancelled: today.filter(r => r.status === "cancelled").length,
  }), [data]);

  const update = (code, patch) => setData(p => p.map(r => r.code === code ? { ...r, ...patch } : r));
  const open = (r) => HUI.drawer(cx => <OrDrawer r={r} cx={cx} onUpdate={update}/>);
  const newCase = () => HUI.open(cx => <OrNewModal cx={cx} onSubmit={() => { cx(); tk("Đã thêm ca mổ"); }}/>);

  const cols = [
    { key: "time", label: "Giờ mổ", mono: true, render: r => <b>{fmtHMg(r.start)}</b> },
    { key: "code", label: "Mã CM", code: true, render: r => r.code },
    { key: "room", label: "Phòng", mono: true, render: r => r.room },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patientName}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T · {r.gender}</div></div> },
    { key: "proc", label: "Phẫu thuật", render: r => <div><div style={{fontWeight:500,color:"var(--t-0)"}}>{r.procName}</div><div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{r.procCode} · {r.procType}</div></div> },
    { key: "surgeon", label: "PTV chính", render: r => <span style={{fontSize:12}}>{r.surgeon}</span> },
    { key: "anesth", label: "GMHS", render: r => <span style={{fontSize:12}}>{r.anesth}<span style={{fontSize:11,color:"var(--t-2)",marginLeft:6}}>{r.anesthType}</span></span> },
    { key: "asa", label: "ASA", mono: true, num: true, render: r => <span style={{display:"inline-block",padding:"2px 6px",background:r.asa>=3?"var(--a-or-bg)":"var(--d-1)",border:"1px solid var(--line)",borderRadius:3,fontSize:11,fontWeight:600}}>ASA {r.asa}</span> },
    { key: "dur", label: "Dự kiến", mono: true, render: r => `${r.procDur}p` },
    { key: "status", label: "Trạng thái", render: r => { const s = OR_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Hồ sơ ca mổ" onClick={()=>open(r)}/>
      {r.status === "preop" && <ActBtn ic="play" title="Bắt đầu mổ" onClick={()=>{update(r.code,{status:"ongoing"});tk("Bắt đầu phẫu thuật");}}/>}
      {r.status === "ongoing" && <ActBtn ic="check" title="Kết thúc" onClick={()=>{update(r.code,{status:"recovery"});tk("Đã chuyển hồi tỉnh");}}/>}
      <ActBtn ic="x" title="Hủy" onClick={()=>HUI.confirm("Hủy ca mổ?","",()=>{update(r.code,{status:"cancelled"});tk("Đã hủy");},"warn")}/>
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Ca mổ hôm nay", val: kpis.today, sub: `/ ${kpis.rooms} phòng` },
        { lbl: "Đang mổ", val: kpis.ongoing, sub: "live", tone: "danger" },
        { lbl: "Đã hoàn tất", val: kpis.completed, sub: `${Math.round(kpis.completed/Math.max(kpis.today,1)*100)}%`, tone: "ok" },
        { lbl: "Hủy", val: kpis.cancelled, sub: "ca", tone: "warn" },
        { lbl: "TB mỗi ca", val: kpis.avgDur, unit: "p", sub: "đúng dự kiến" },
        { lbl: "Tổng tuần", val: 124, sub: "+12% so tuần trước", tone: "info" },
      ]}/>
      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "schedule", l: "Lịch mổ hôm nay", ic: "calendar" },
        { v: "rooms", l: "Sơ đồ phòng mổ", ic: "grid" },
      ]} actions={<>
        <button className="ab-btn ghost" onClick={()=>tk("Xuất lịch tuần")}><Ico name="download" size={12}/> Lịch tuần</button>
        <button className="ab-btn primary" onClick={newCase}><Ico name="plus" size={12}/> Lên lịch mổ <kbd>F2</kbd></button>
      </>}/>
      {tab === "schedule" && <>
        <StatusTabs value={stab} onChange={setStab} tabs={OR_STATUS} counts={counts}/>
        <div className="ab-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã ca, tên phẫu thuật…"/>
          <Filter value={fRoom} onChange={setFRoom} options={OR_ROOMS.map(r=>({v:r,l:r}))} placeholder="▾ Phòng"/>
          <button className="ab-btn ghost" onClick={()=>{setSearch("");setFRoom("");setStab("all");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
          <span className="spacer"/>
          <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{filtered.length} ca</span>
        </div>
        <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
      </>}
      {tab === "rooms" && <RoomsBoard data={today} onOpen={open}/>}
    </div>
  );
}

const RoomsBoard = ({ data, onOpen }) => (
  <div style={{flex:1,overflow:"auto",padding:18,background:"var(--d-1)"}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      {OR_ROOMS.map(rm => {
        const cases = data.filter(c => c.room === rm).sort((a,b)=>a.start-b.start);
        const live = cases.find(c => c.status === "ongoing");
        return (
          <div key={rm} style={{background:"#fff",border:`1px solid ${live?"var(--a-rd-line)":"var(--line)"}`,borderRadius:8,padding:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <h4 style={{margin:0,fontSize:14}}>{rm}</h4>
              {live ? <StatusBadge tone="danger" dot>ĐANG MỔ</StatusBadge> : <StatusBadge tone="ok">Sẵn sàng</StatusBadge>}
            </div>
            {cases.length === 0 ? <div style={{color:"var(--t-3)",fontSize:12,padding:"10px 0"}}>Không có ca</div> :
              cases.map(c => (
                <div key={c.code} onClick={()=>onOpen(c)} style={{padding:"8px 10px",background:c.status==="ongoing"?"var(--a-rd-bg)":"var(--d-1)",border:"1px solid var(--line)",borderRadius:4,marginBottom:4,fontSize:11.5,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontFamily:"var(--font-mono)"}}>{fmtHMg(c.start)}</b><span style={{color:"var(--t-2)"}}>{c.procDur}p</span></div>
                  <div style={{fontWeight:600,marginTop:2}}>{c.patientName}</div>
                  <div style={{color:"var(--t-2)",fontSize:11}}>{c.procName}</div>
                </div>
              ))
            }
          </div>
        );
      })}
    </div>
  </div>
);

const OrDrawer = ({ r, cx, onUpdate }) => (
  <HUI.Drawer title={`Ca mổ · ${r.code}`} sub={`${r.patientName} · ${r.procName}`} size="lg" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Đóng</button>
    <button className="ab-btn" onClick={()=>tk("Đã in biên bản")}><Ico name="print" size={12}/> Biên bản phẫu thuật</button>
    {r.status === "ongoing" && <button className="ab-btn primary" onClick={()=>{onUpdate(r.code,{status:"recovery"});cx();tk("Chuyển hồi tỉnh");}}>Kết thúc · Chuyển hồi tỉnh</button>}
  </>}>
    <DrSec title="Bệnh nhân & Chẩn đoán">
      <DrField lbl="Họ tên">{r.patientName}</DrField>
      <DrField lbl="Mã BN / Tuổi">{r.pid} · {r.age}T · {r.gender}</DrField>
      <DrField lbl="Chẩn đoán trước mổ">{r.preDx}</DrField>
      <DrField lbl="Phân loại ASA"><span style={{padding:"2px 8px",background:"var(--a-or-bg)",border:"1px solid var(--a-or-line)",borderRadius:4,fontWeight:600,fontFamily:"var(--font-mono)"}}>ASA {r.asa}</span></DrField>
    </DrSec>
    <DrSec title="Phẫu thuật">
      <DrField lbl="Tên phẫu thuật">{r.procName}</DrField>
      <DrField lbl="Mã ICD-9-CM"><b style={{fontFamily:"var(--font-mono)"}}>{r.procCode}</b></DrField>
      <DrField lbl="Loại">{r.procType}</DrField>
      <DrField lbl="Phòng / Giờ">{r.room} · {fmtDTg(r.start)}</DrField>
      <DrField lbl="Dự kiến">{r.procDur} phút</DrField>
      <DrField lbl="Phương pháp vô cảm">{r.anesthType}</DrField>
      {r.bloodBank && <DrField lbl="Máu dự trữ"><span className="ab-stat danger" style={{height:18,padding:"0 6px",fontSize:10}}>✓ Đã đặt máu</span></DrField>}
    </DrSec>
    <DrSec title="Ekip phẫu thuật">
      <div style={{display:"grid",gridTemplateColumns:"160px 1fr",gap:"6px 12px",fontSize:13}}>
        <div style={{color:"var(--t-2)"}}>PTV chính:</div><div><b>{r.surgeon}</b></div>
        <div style={{color:"var(--t-2)"}}>PTV phụ:</div><div>{r.assistants.join(" · ")}</div>
        <div style={{color:"var(--t-2)"}}>BS gây mê:</div><div><b>{r.anesth}</b></div>
        <div style={{color:"var(--t-2)"}}>Dụng cụ viên:</div><div>{r.scrubNurse}</div>
      </div>
    </DrSec>
    {(r.status === "completed" || r.status === "ongoing") && <DrSec title="Theo dõi trong mổ">
      <div style={{padding:12,background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,fontSize:12,color:"var(--t-1)",lineHeight:1.7}}>
        <div>{fmtHMg(r.start)} · Bắt đầu mổ · BS {r.surgeon}</div>
        <div>{fmtHMg(new Date(r.start.getTime()+10*60000))} · Khởi mê thành công · {r.anesthType}</div>
        <div>{fmtHMg(new Date(r.start.getTime()+25*60000))} · Tiếp cận ổ phúc mạc</div>
        {r.status === "completed" && <div>{fmtHMg(r.end)} · Đóng vết mổ · Mất máu ~50ml</div>}
      </div>
    </DrSec>}
  </HUI.Drawer>
);

const OrNewModal = ({ cx, onSubmit }) => (
  <HUI.Modal title="Lên lịch ca mổ mới" size="md" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Hủy</button>
    <button className="ab-btn primary" onClick={onSubmit}><Ico name="check" size={12}/> Lên lịch</button>
  </>}>
    <div style={{padding:"14px 18px"}}>
      <HUI.Field label="Bệnh nhân" required><HUI.Input placeholder="Tìm BN theo mã hoặc tên…"/></HUI.Field>
      <HUI.Field label="Phẫu thuật" required><HUI.Select options={[{value:"",label:"-- Chọn --"},...PROCEDURES.map(p=>({value:p.c,label:`${p.c} · ${p.l} (${p.dur}p)`}))]}/></HUI.Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <HUI.Field label="Phòng mổ" required><HUI.Select options={OR_ROOMS.map(r=>({value:r,label:r}))}/></HUI.Field>
        <HUI.Field label="Ngày giờ" required><HUI.Input type="datetime-local"/></HUI.Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <HUI.Field label="PTV chính"><HUI.Select options={SURGEONS.map(s=>({value:s,label:s}))}/></HUI.Field>
        <HUI.Field label="BS gây mê"><HUI.Select options={ANESTH.map(s=>({value:s,label:s}))}/></HUI.Field>
      </div>
      <HUI.Field label="Phương pháp vô cảm"><HUI.Radio name="anth" value="general" onChange={()=>{}} options={[{value:"general",label:"Mê toàn thân"},{value:"spinal",label:"Mê tủy sống"},{value:"local",label:"Tê tại chỗ"}]}/></HUI.Field>
      <HUI.Field label="Ghi chú"><HUI.Textarea rows={3} placeholder="Lưu ý gì cho ekip…"/></HUI.Field>
    </div>
  </HUI.Modal>
);

window.OrV2 = OrV2;
