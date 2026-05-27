// =====================================================================
// HIS Terminal · Module: XÉT NGHIỆM (LIS v2)
// Mẫu, kết quả, QC, đối chứng tham chiếu
// =====================================================================

const LIS_STATUS = [
  { v: "ordered",   l: "Đã chỉ định",  tone: "info" },
  { v: "collected", l: "Đã lấy mẫu",   tone: "warn" },
  { v: "running",   l: "Đang chạy",    tone: "mag" },
  { v: "verified",  l: "Đã duyệt",     tone: "ok" },
  { v: "rejected",  l: "Từ chối mẫu",  tone: "danger" },
];
const LIS_TESTS = [
  { c: "GLU",   l: "Glucose máu",          unit: "mmol/L", ref: "3.9 - 6.1",  group: "Sinh hoá" },
  { c: "HBA1C", l: "HbA1c",                unit: "%",      ref: "< 5.7",      group: "Sinh hoá" },
  { c: "CHOL",  l: "Cholesterol toàn phần", unit: "mmol/L", ref: "< 5.2",      group: "Sinh hoá" },
  { c: "CREA",  l: "Creatinin",            unit: "µmol/L", ref: "59 - 104",   group: "Sinh hoá" },
  { c: "ALT",   l: "ALT (GPT)",            unit: "U/L",    ref: "< 41",       group: "Sinh hoá" },
  { c: "WBC",   l: "Bạch cầu",             unit: "10⁹/L",  ref: "4 - 10",     group: "Huyết học" },
  { c: "HGB",   l: "Hemoglobin",           unit: "g/L",    ref: "120 - 160",  group: "Huyết học" },
  { c: "PLT",   l: "Tiểu cầu",             unit: "10⁹/L",  ref: "150 - 400",  group: "Huyết học" },
  { c: "CRP",   l: "CRP định lượng",       unit: "mg/L",   ref: "< 5",        group: "Miễn dịch" },
  { c: "TSH",   l: "TSH",                  unit: "µIU/mL", ref: "0.4 - 4",    group: "Miễn dịch" },
];

const seedLis = () => {
  const rows = [];
  for (let i = 0; i < 64; i++) {
    const t = rndPick(LIS_TESTS);
    const status = ["ordered","collected","running","verified","verified","verified","verified"][Math.floor(Math.random()*7)];
    const ordered = new Date(2026, 9, 22, 6+Math.floor(Math.random()*12), Math.floor(Math.random()*60));
    const refLow = parseFloat(t.ref.split(/[ -<]+/).filter(Boolean)[0]) || 0;
    const refHigh = parseFloat(t.ref.split(/[ -<]+/).filter(Boolean)[1] || t.ref.split(/[ -<]+/).filter(Boolean)[0]) || 100;
    const v = (refLow + Math.random()*(refHigh-refLow)*1.4 - refHigh*0.2);
    const flag = v > refHigh ? "H" : v < refLow ? "L" : "N";
    rows.push({
      code: `LAB-${String(20261022).slice(-6)}-${String(i+1).padStart(3,"0")}`,
      pid: rndPid(), patientName: rndName(i), age: rndAge(), gender: rndGender(),
      testCode: t.c, testName: t.l, unit: t.unit, ref: t.ref, group: t.group,
      orderedAt: ordered,
      ...(status !== "ordered" && status !== "rejected" ? { collectedAt: new Date(ordered.getTime()+15*60000) } : {}),
      ...(status === "verified" ? { 
        result: t.c === "WBC" || t.c === "HGB" ? Math.round(v*10)/10 : v.toFixed(2),
        flag,
        verifiedAt: new Date(ordered.getTime()+90*60000),
        verifiedBy: rndPick(["KTV. Lê Thị Hồng","KTV. Phạm Văn Đức","BS. Trần Mai"])
      } : {}),
      sample: rndPick(["Máu TM","Máu MM","Nước tiểu","Phân"]),
      machine: rndPick(["AU680","XN-1000","Cobas 6000"]),
      status,
      stat: Math.random() > 0.85,
      orderedBy: rndPick(["BS. Nguyễn Văn Hùng","BS. Trần Thị Mai","BS. Phạm Tâm"]),
    });
  }
  return rows;
};

function LisV2() {
  const [data, setData] = uS(seedLis());
  const [stab, setStab] = uS("all");
  const [fGroup, setFGroup] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const counts = { all: data.length };
  LIS_STATUS.forEach(s => counts[s.v] = data.filter(r => r.status === s.v).length);
  const filtered = data.filter(r => {
    if (stab !== "all" && r.status !== stab) return false;
    if (fGroup && r.group !== fGroup) return false;
    if (search) { const q = search.toLowerCase(); return [r.patientName, r.pid, r.code, r.testName].some(x => x.toLowerCase().includes(q)); }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    total: data.length,
    verified: data.filter(r => r.status === "verified").length,
    pending: data.filter(r => r.status === "ordered" || r.status === "collected" || r.status === "running").length,
    abnormal: data.filter(r => r.flag && r.flag !== "N").length,
    stat: data.filter(r => r.stat).length,
    tat: 42,
  }), [data]);

  const update = (code, patch) => setData(p => p.map(r => r.code === code ? { ...r, ...patch } : r));
  const open = (r) => HUI.drawer(cx => <LisDrawer r={r} cx={cx} onUpdate={update}/>);
  const verify = (r) => HUI.confirm("Duyệt kết quả?", `${r.testName} = ${r.result} ${r.unit}`, () => { update(r.code, { status: "verified" }); tk("Đã duyệt"); }, "ok");

  const cols = [
    { key: "code", label: "Mã XN", code: true, render: r => <span>{r.code}{r.stat && <span style={{marginLeft:6,padding:"1px 5px",background:"var(--a-rd-bg)",border:"1px solid var(--a-rd-line)",color:"var(--a-rd-text)",borderRadius:3,fontSize:9,fontWeight:700}}>STAT</span>}</span> },
    { key: "time", label: "CĐ lúc", mono: true, render: r => fmtHMg(r.orderedAt) },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patientName}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T · {r.gender}</div></div> },
    { key: "test", label: "Xét nghiệm", render: r => <div><div style={{fontWeight:500,color:"var(--t-0)"}}>{r.testName}</div><div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{r.testCode} · {r.group}</div></div> },
    { key: "sample", label: "Mẫu", render: r => <span style={{fontSize:12}}>{r.sample}</span> },
    { key: "result", label: "Kết quả", mono: true, num: true, render: r => r.result == null ? <span style={{color:"var(--t-3)"}}>—</span> : <span style={{fontWeight:700,color:r.flag==="N"?"var(--t-0)":r.flag==="H"?"var(--a-rd-text)":"var(--a-cy-text)"}}>{r.result}<small style={{marginLeft:3,fontSize:10,color:"var(--t-2)",fontWeight:400}}>{r.unit}</small>{r.flag !== "N" && <span style={{marginLeft:4,fontSize:10,fontWeight:700}}>{r.flag}</span>}</span> },
    { key: "ref", label: "Tham chiếu", mono: true, render: r => <span style={{fontSize:11,color:"var(--t-2)"}}>{r.ref}</span> },
    { key: "machine", label: "Máy", mono: true, render: r => r.machine },
    { key: "status", label: "Trạng thái", render: r => { const s = LIS_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      {r.status === "ordered" && <ActBtn ic="check" title="Đánh dấu đã lấy mẫu" onClick={()=>{update(r.code,{status:"collected",collectedAt:new Date()});tk("Đã ghi nhận lấy mẫu");}}/>}
      {r.status === "running" && r.result && <ActBtn ic="check" title="Duyệt kết quả" onClick={()=>verify(r)}/>}
      <ActBtn ic="eye" title="Chi tiết" onClick={()=>open(r)}/>
      <ActBtn ic="print" title="In phiếu" onClick={()=>tk("Đã in phiếu KQ")}/>
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Tổng XN", val: kpis.total, sub: "hôm nay" },
        { lbl: "Đã duyệt", val: kpis.verified, sub: `${Math.round(kpis.verified/kpis.total*100)}%`, tone: "ok" },
        { lbl: "Đang chờ", val: kpis.pending, sub: "trong quy trình", tone: "warn" },
        { lbl: "Bất thường", val: kpis.abnormal, sub: "H/L flags", tone: "danger" },
        { lbl: "STAT", val: kpis.stat, sub: "ưu tiên", tone: "danger" },
        { lbl: "TAT", val: kpis.tat, unit: "p", sub: "đạt mục tiêu", tone: "ok" },
      ]}/>
      <div className="ab-toolbar" style={{borderTop:"1px solid var(--line)"}}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã XN, tên xét nghiệm…"/>
        <Filter value={fGroup} onChange={setFGroup} options={[{v:"Sinh hoá",l:"Sinh hoá"},{v:"Huyết học",l:"Huyết học"},{v:"Miễn dịch",l:"Miễn dịch"}]} placeholder="▾ Nhóm"/>
        <button className="ab-btn ghost" onClick={()=>{setSearch("");setFGroup("");setStab("all");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={()=>tk("Xem QC chart")}><Ico name="chart" size={12}/> QC hôm nay</button>
        <button className="ab-btn ghost" onClick={()=>tk("Đã xuất CSV")}><Ico name="download" size={12}/> Xuất</button>
        <button className="ab-btn primary" onClick={()=>tk("Tạo chỉ định mới")}><Ico name="plus" size={12}/> Chỉ định <kbd>F2</kbd></button>
      </div>
      <StatusTabs value={stab} onChange={setStab} tabs={LIS_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}

const LisDrawer = ({ r, cx, onUpdate }) => (
  <HUI.Drawer title={`Phiếu xét nghiệm · ${r.code}`} sub={`${r.patientName} · ${r.testName}`} size="md" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Đóng</button>
    <button className="ab-btn" onClick={()=>tk("Đã in phiếu KQ")}><Ico name="print" size={12}/> In phiếu</button>
    {r.status === "running" && r.result && <button className="ab-btn primary" onClick={()=>{onUpdate(r.code,{status:"verified"});cx();tk("Đã duyệt");}}><Ico name="check" size={12}/> Duyệt KQ</button>}
  </>}>
    <DrSec title="Bệnh nhân">
      <DrField lbl="Họ tên">{r.patientName}</DrField>
      <DrField lbl="Mã BN">{r.pid}</DrField>
      <DrField lbl="Tuổi/Giới">{r.age} tuổi · {r.gender}</DrField>
      <DrField lbl="BS chỉ định">{r.orderedBy}</DrField>
    </DrSec>
    <DrSec title="Thông tin xét nghiệm">
      <DrField lbl="Tên XN">{r.testName}</DrField>
      <DrField lbl="Mã XN"><b style={{fontFamily:"var(--font-mono)"}}>{r.testCode}</b> · {r.group}</DrField>
      <DrField lbl="Mẫu">{r.sample}</DrField>
      <DrField lbl="Máy phân tích">{r.machine}</DrField>
      <DrField lbl="CĐ lúc">{fmtDTg(r.orderedAt)}</DrField>
      {r.collectedAt && <DrField lbl="Lấy mẫu lúc">{fmtDTg(r.collectedAt)}</DrField>}
    </DrSec>
    {r.result != null && <DrSec title="Kết quả">
      <div style={{padding:14,background:r.flag==="N"?"var(--a-em-bg)":"var(--a-rd-bg)",border:`1px solid ${r.flag==="N"?"var(--a-em-line)":"var(--a-rd-line)"}`,borderRadius:6,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10}}>
          <span style={{fontSize:32,fontWeight:800,fontFamily:"var(--font-mono)",color:r.flag==="N"?"var(--a-em-text)":"var(--a-rd-text)"}}>{r.result}</span>
          <span style={{fontSize:14,color:"var(--t-1)"}}>{r.unit}</span>
          {r.flag !== "N" && <span style={{padding:"3px 8px",background:r.flag==="H"?"var(--a-rd-text)":"var(--a-cy-text)",color:"#fff",borderRadius:3,fontSize:11,fontWeight:700}}>{r.flag === "H" ? "↑ CAO" : "↓ THẤP"}</span>}
        </div>
        <div style={{fontSize:12,color:"var(--t-2)",marginTop:4}}>Tham chiếu: {r.ref} {r.unit}</div>
      </div>
      {r.verifiedAt && <DrField lbl="Duyệt lúc">{fmtDTg(r.verifiedAt)} · {r.verifiedBy}</DrField>}
    </DrSec>}
  </HUI.Drawer>
);

window.LisV2 = LisV2;
