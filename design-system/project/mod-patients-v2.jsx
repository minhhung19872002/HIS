// =====================================================================
// HIS Terminal · Module: HỒ SƠ BỆNH NHÂN MASTER (Patients v2)
// BN master, BHYT, lịch sử, khoá thẻ
// =====================================================================

const PT_STATUS = [
  { v: "active",    l: "Đang hoạt động", tone: "ok" },
  { v: "inactive",  l: "Ngừng hoạt động", tone: "info" },
  { v: "blocked",   l: "Khoá thẻ",        tone: "danger" },
  { v: "deceased",  l: "Đã mất",          tone: "info" },
];

const seedPatients = () => {
  const rows = [];
  const seenPids = new Set();
  for (let i = 0; i < 64; i++) {
    const status = i < 50 ? "active" : i < 58 ? "inactive" : i < 62 ? "blocked" : "deceased";
    const visits = 1+Math.floor(Math.random()*40);
    const totalSpent = visits * (200000 + Math.floor(Math.random()*1500000));
    let pid = rndPid();
    while (seenPids.has(pid)) pid = rndPid();
    seenPids.add(pid);
    rows.push({
      pid,
      name: rndName(i),
      age: rndAge(),
      gender: rndGender(),
      bloodType: rndPick(["A+","B+","O+","AB+","O-","A-","B-","AB-"]),
      dob: `${1950+Math.floor(Math.random()*70)}-${String(1+Math.floor(Math.random()*12)).padStart(2,"0")}-${String(1+Math.floor(Math.random()*28)).padStart(2,"0")}`,
      cccd: `0${30+Math.floor(Math.random()*30)}${rndPick(["2","4","6"])}${String(Math.floor(Math.random()*10000000)).padStart(7,"0")}`,
      bhyt: Math.random() > 0.2 ? `HC4${rndPid().slice(2)}-${Math.floor(Math.random()*10)}` : null,
      bhytExp: Math.random() > 0.85 ? "2026-12-31" : "2027-12-31",
      phone: `09${Math.floor(Math.random()*100000000).toString().padStart(8,"0")}`,
      email: Math.random() > 0.5 ? `${rndName(i).toLowerCase().replace(/[^a-z]/g,"")}@example.com` : null,
      address: rndPick(["Phường 1, Quận 3","Phường 7, Quận 5","Xã Nghĩa An","TT. Bến Lức","Phường Hưng Lộc"])+", "+rndPick(["TP.HCM","Hưng Yên","Long An","Cần Thơ"]),
      visits,
      totalSpent,
      lastVisit: new Date(2026, 9, 22 - Math.floor(Math.random()*120)),
      registeredAt: new Date(2018+Math.floor(Math.random()*7), Math.floor(Math.random()*12), 1+Math.floor(Math.random()*28)),
      status,
      tags: rndPickN(["VIP","Bệnh mạn tính","Cao tuổi","Trẻ em","Dị ứng","Nguy cơ cao"], Math.floor(Math.random()*3)),
    });
  }
  return rows;
};

function PatientsV2() {
  const [data, setData] = uS(seedPatients());
  const [stab, setStab] = uS("all");
  const [fGender, setFGender] = uS("");
  const [fBhyt, setFBhyt] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const counts = { all: data.length };
  PT_STATUS.forEach(s => counts[s.v] = data.filter(r => r.status === s.v).length);
  const filtered = data.filter(r => {
    if (stab !== "all" && r.status !== stab) return false;
    if (fGender && r.gender !== fGender) return false;
    if (fBhyt === "yes" && !r.bhyt) return false;
    if (fBhyt === "no" && r.bhyt) return false;
    if (search) { const q = search.toLowerCase(); return [r.name, r.pid, r.cccd, r.phone, r.bhyt||""].some(x => x.toLowerCase().includes(q)); }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    total: data.length,
    active: data.filter(r => r.status === "active").length,
    bhyt: data.filter(r => r.bhyt).length,
    vip: data.filter(r => r.tags.includes("VIP")).length,
    newThisMonth: 12,
    blocked: data.filter(r => r.status === "blocked").length,
  }), [data]);

  const update = (pid, patch) => setData(p => p.map(r => r.pid === pid ? { ...r, ...patch } : r));
  const open = (r) => HUI.drawer(cx => <PatientDrawer r={r} cx={cx} onUpdate={update}/>);
  const create = () => HUI.open(cx => <PatientNewModal cx={cx} onSubmit={() => { cx(); tk("Đã tạo BN mới"); }}/>);

  const cols = [
    { key: "pid", label: "Mã BN", code: true, render: r => r.pid },
    { key: "name", label: "Họ tên", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.age}T · {r.gender} · {r.bloodType} · DOB: {r.dob}</div></div> },
    { key: "tags", label: "Nhãn", render: r => r.tags.length === 0 ? <span style={{color:"var(--t-3)"}}>—</span> : <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{r.tags.map(t => <span key={t} className={`ab-stat ${t==="VIP"?"warn":"info"}`} style={{height:18,padding:"0 6px",fontSize:10}}>{t}</span>)}</div> },
    { key: "cccd", label: "CCCD", mono: true, render: r => r.cccd },
    { key: "bhyt", label: "BHYT", mono: true, render: r => r.bhyt ? <span>{r.bhyt}<div style={{fontSize:10,color:r.bhytExp==="2026-12-31"?"var(--a-or-text)":"var(--t-2)"}}>HSD: {r.bhytExp}</div></span> : <span style={{color:"var(--t-3)"}}>Không</span> },
    { key: "phone", label: "SĐT", mono: true, render: r => r.phone },
    { key: "visits", label: "Lượt KB", num: true, mono: true, render: r => r.visits },
    { key: "spent", label: "Tổng chi", num: true, mono: true, render: r => fmtVNDg(r.totalSpent) },
    { key: "last", label: "Lần cuối", mono: true, render: r => fmtDMYg(r.lastVisit) },
    { key: "status", label: "Trạng thái", render: r => { const s = PT_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Hồ sơ" onClick={()=>open(r)}/>
      <ActBtn ic="edit" title="Sửa thông tin" onClick={()=>tk("Mở form sửa BN")}/>
      {r.status === "active" ? 
        <ActBtn ic="lock" title="Khoá thẻ" onClick={()=>HUI.confirm("Khoá thẻ BN?","BN sẽ không thể tiếp nhận khám.",()=>{update(r.pid,{status:"blocked"});tk("Đã khoá thẻ");},"warn")}/> :
        <ActBtn ic="unlock" title="Mở khoá" onClick={()=>{update(r.pid,{status:"active"});tk("Đã mở khoá");}}/>
      }
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Tổng BN", val: kpis.total.toLocaleString(), sub: "trong CSDL" },
        { lbl: "Đang hoạt động", val: kpis.active, sub: `${Math.round(kpis.active/kpis.total*100)}%`, tone: "ok" },
        { lbl: "Có BHYT", val: kpis.bhyt, sub: `${Math.round(kpis.bhyt/kpis.total*100)}%`, tone: "info" },
        { lbl: "VIP", val: kpis.vip, sub: "thẻ vàng", tone: "warn" },
        { lbl: "Mới tháng này", val: kpis.newThisMonth, sub: "đăng ký", tone: "ok" },
        { lbl: "Bị khoá", val: kpis.blocked, sub: "cần xử lý", tone: "danger" },
      ]}/>
      <div className="ab-toolbar" style={{borderTop:"1px solid var(--line)"}}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên, mã BN, CCCD, SĐT, BHYT…"/>
        <Filter value={fGender} onChange={setFGender} options={[{v:"Nam",l:"Nam"},{v:"Nữ",l:"Nữ"}]} placeholder="▾ Giới tính"/>
        <Filter value={fBhyt} onChange={setFBhyt} options={[{v:"yes",l:"Có BHYT"},{v:"no",l:"Không BHYT"}]} placeholder="▾ BHYT"/>
        <button className="ab-btn ghost" onClick={()=>{setSearch("");setFGender("");setFBhyt("");setStab("all");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={()=>tk("Đã xuất CSV")}><Ico name="download" size={12}/> Xuất</button>
        <button className="ab-btn primary" onClick={create}><Ico name="plus" size={12}/> BN mới <kbd>F2</kbd></button>
      </div>
      <StatusTabs value={stab} onChange={setStab} tabs={PT_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.pid} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}

const PatientDrawer = ({ r, cx, onUpdate }) => (
  <HUI.Drawer title={r.name} sub={`${r.pid} · ${r.age}T · ${r.gender} · ${r.bloodType}`} size="lg" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Đóng</button>
    <button className="ab-btn" onClick={()=>tk("Đã in thẻ BN")}><Ico name="print" size={12}/> In thẻ BN</button>
    <button className="ab-btn primary" onClick={()=>tk("Sửa hồ sơ")}><Ico name="edit" size={12}/> Sửa thông tin</button>
  </>}>
    {r.tags.length > 0 && <div style={{margin:"-2px 0 14px",display:"flex",gap:6,flexWrap:"wrap"}}>{r.tags.map(t => <span key={t} className={`ab-stat ${t==="VIP"?"warn":"info"}`}>{t}</span>)}</div>}
    <DrSec title="Thông tin hành chính">
      <DrField lbl="Họ tên">{r.name}</DrField>
      <DrField lbl="Mã BN"><b style={{fontFamily:"var(--font-mono)"}}>{r.pid}</b></DrField>
      <DrField lbl="Ngày sinh">{r.dob}</DrField>
      <DrField lbl="Giới / Tuổi">{r.gender} · {r.age} tuổi</DrField>
      <DrField lbl="Nhóm máu">{r.bloodType}</DrField>
      <DrField lbl="CCCD">{r.cccd}</DrField>
      <DrField lbl="Điện thoại">{r.phone}</DrField>
      {r.email && <DrField lbl="Email">{r.email}</DrField>}
      <DrField lbl="Địa chỉ">{r.address}</DrField>
    </DrSec>
    <DrSec title="Bảo hiểm y tế">
      {r.bhyt ? <>
        <DrField lbl="Mã thẻ"><b style={{fontFamily:"var(--font-mono)"}}>{r.bhyt}</b></DrField>
        <DrField lbl="Hạn sử dụng">{r.bhytExp}{r.bhytExp === "2026-12-31" && <span className="ab-stat warn" style={{marginLeft:8,height:18,padding:"0 6px",fontSize:10}}>Sắp hết hạn</span>}</DrField>
        <DrField lbl="Mức hưởng">95% (theo phân tuyến)</DrField>
      </> : <div style={{color:"var(--t-2)",fontSize:13}}>Bệnh nhân chưa đăng ký BHYT</div>}
    </DrSec>
    <DrSec title="Thống kê khám chữa bệnh">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        <div style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6}}>
          <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Tổng lượt KB</div>
          <div style={{fontSize:20,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{r.visits}</div>
        </div>
        <div style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6}}>
          <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Tổng chi</div>
          <div style={{fontSize:16,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{fmtVNDg(r.totalSpent)}</div>
        </div>
        <div style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6}}>
          <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Lần cuối</div>
          <div style={{fontSize:14,fontWeight:600,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{fmtDMYg(r.lastVisit)}</div>
        </div>
      </div>
    </DrSec>
    <DrSec title="Hoạt động gần đây">
      {Array.from({length:5}).map((_,i) => {
        const d = new Date(r.lastVisit.getTime() - i*15*86400000);
        const types = [["Khám ngoại trú","var(--a-cy-bg)","var(--a-cy-line)"],["Xét nghiệm","var(--a-mg-bg)","var(--a-mg-line)"],["Đơn thuốc","var(--a-em-bg)","var(--a-em-line)"]];
        const tt = types[i%3];
        return (
          <div key={i} style={{padding:"8px 12px",background:tt[0],border:`1px solid ${tt[1]}`,borderRadius:4,marginBottom:4,fontSize:12.5,display:"flex",justifyContent:"space-between"}}>
            <span><b>{["Khám tim mạch","Sinh hoá máu","Đơn Amlodipin","Khám tổng quát","Siêu âm bụng"][i]}</b><span style={{color:"var(--t-2)",marginLeft:8}}>BS. Nguyễn Văn Hùng</span></span>
            <span style={{fontFamily:"var(--font-mono)",color:"var(--t-2)"}}>{fmtDMYg(d)}</span>
          </div>
        );
      })}
    </DrSec>
  </HUI.Drawer>
);

const PatientNewModal = ({ cx, onSubmit }) => (
  <HUI.Modal title="Đăng ký bệnh nhân mới" size="md" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Hủy</button>
    <button className="ab-btn primary" onClick={onSubmit}><Ico name="check" size={12}/> Tạo hồ sơ</button>
  </>}>
    <div style={{padding:"14px 18px"}}>
      <HUI.Field label="Họ tên" required><HUI.Input placeholder="Nguyễn Văn A"/></HUI.Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <HUI.Field label="Ngày sinh" required><HUI.Input type="date"/></HUI.Field>
        <HUI.Field label="Giới tính" required><HUI.Select options={[{value:"",label:"-- Chọn --"},{value:"Nam",label:"Nam"},{value:"Nữ",label:"Nữ"}]}/></HUI.Field>
        <HUI.Field label="Nhóm máu"><HUI.Select options={["A+","B+","O+","AB+","O-","A-","B-","AB-","Chưa rõ"].map(b=>({value:b,label:b}))}/></HUI.Field>
      </div>
      <HUI.Field label="CCCD" required><HUI.Input placeholder="0xx-xxxxxxxxx"/></HUI.Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <HUI.Field label="Mã BHYT"><HUI.Input placeholder="HC4..."/></HUI.Field>
        <HUI.Field label="Hạn BHYT"><HUI.Input type="date"/></HUI.Field>
      </div>
      <HUI.Field label="Điện thoại" required><HUI.Input placeholder="09xx xxx xxx"/></HUI.Field>
      <HUI.Field label="Email"><HUI.Input type="email" placeholder="email@..."/></HUI.Field>
      <HUI.Field label="Địa chỉ" required><HUI.Textarea rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh"/></HUI.Field>
    </div>
  </HUI.Modal>
);

window.PatientsV2 = PatientsV2;
