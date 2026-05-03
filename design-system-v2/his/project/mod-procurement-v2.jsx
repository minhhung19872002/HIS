// =====================================================================
// HIS Terminal · Module: ĐỀ XUẤT - DỰ TRÙ (Procurement v2)
// =====================================================================
const PC_STATUS = [
  { v: "draft", l: "Nháp", tone: null },
  { v: "review", l: "Chờ duyệt", tone: "warn" },
  { v: "approved", l: "Đã duyệt", tone: "info" },
  { v: "ordered", l: "Đã đặt hàng", tone: "info" },
  { v: "received", l: "Đã nhập kho", tone: "ok" },
  { v: "rejected", l: "Bị từ chối", tone: "crit" },
];

const seedProc = () => {
  const r = seedRand(56789);
  const list = [];
  const cats = ["Thuốc","Vật tư y tế","Hoá chất XN","Dụng cụ phòng mổ","Thiết bị y tế","Văn phòng phẩm"];
  for (let i = 0; i < 60; i++) {
    const dayOff = -30 + Math.floor(r()*40);
    const t = new Date(todayIv); t.setDate(t.getDate() + dayOff);
    const sts = r() > 0.5 ? "received" : r() > 0.3 ? "ordered" : r() > 0.2 ? "approved" : r() > 0.12 ? "review" : r() > 0.05 ? "draft" : "rejected";
    const itemCount = 3 + Math.floor(r() * 12);
    const total = itemCount * (500000 + Math.floor(r()*8000000));
    list.push({
      code: `DT.${String(2026000 + i).padStart(6,"0")}`,
      title: `Dự trù ${cats[Math.floor(r()*cats.length)]} ${["Q1","Q2","Q3","Q4"][Math.floor(r()*4)]}/2026`,
      dept: rndPick(["Khoa Dược","Khoa Nội tim mạch","Khoa Ngoại","HSCC","Khoa Sản","Khoa Nhi","Khoa Cấp cứu","Khoa Xét nghiệm","Khoa CĐHA"]),
      proposer: rndName(i),
      itemCount,
      total,
      submittedAt: t,
      status: sts,
      vendor: ["Mediplantex","Pymepharco","Sanofi VN","Bayer VN","BMS","Kangda Med"][Math.floor(r()*6)],
      priority: ["Thường","Khẩn","Đột xuất"][Math.floor(r()*3)],
    });
  }
  return list.sort((a,b) => b.submittedAt - a.submittedAt);
};

function ProcurementV2() {
  const [rows, setRows] = uS(seedProc);
  const [stab, setStab] = uS("all");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 16;
  const counts = { all: rows.length };
  PC_STATUS.forEach(s => counts[s.v] = rows.filter(r => r.status === s.v).length);
  const filtered = uM(() => {
    let r = rows;
    if (stab !== "all") r = r.filter(x => x.status === stab);
    if (search) { const q = search.toLowerCase(); r = r.filter(x => x.title.toLowerCase().includes(q) || x.code.toLowerCase().includes(q) || x.dept.toLowerCase().includes(q)); }
    return r;
  }, [rows, stab, search]);
  uE(() => setPage(0), [stab, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const approve = (r) => { setRows(p => p.map(x => x.code === r.code ? { ...x, status: "approved" } : x)); tk("Đã duyệt " + r.code); };
  const open = (r) => { const s = PC_STATUS.find(x => x.v === r.status); HUI.drawer(cx => (
    <HUI.Drawer title={r.code} sub={<>{r.title} · <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge></>} width={680} onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        {r.status === "review" && <button className="ab-btn primary" onClick={() => { approve(r); cx(); }}><Ico name="check" size={12}/> Duyệt đề xuất</button>}
        <button className="ab-btn ghost"><Ico name="print" size={12}/> In phiếu</button>
      </>}>
      <DrSec title="Thông tin đề xuất">
        <DrField lbl="Mã đề xuất">{r.code}</DrField>
        <DrField lbl="Tên đề xuất">{r.title}</DrField>
        <DrField lbl="Khoa đề xuất">{r.dept}</DrField>
        <DrField lbl="Người đề xuất">{r.proposer}</DrField>
        <DrField lbl="Ngày đề xuất">{fmtDMYg(r.submittedAt)}</DrField>
        <DrField lbl="Ưu tiên"><StatusBadge tone={r.priority==="Đột xuất"?"crit":r.priority==="Khẩn"?"warn":null}>{r.priority}</StatusBadge></DrField>
      </DrSec>
      <DrSec title="Chi tiết hàng hoá">
        <DrField lbl="Số mục">{r.itemCount} mục</DrField>
        <DrField lbl="Tổng giá trị">{fmtVNDg(r.total)}</DrField>
        <DrField lbl="Nhà cung cấp">{r.vendor}</DrField>
      </DrSec>
      <DrSec title="Trạng thái">
        <DrField lbl="Trạng thái"><StatusBadge tone={s.tone} dot>{s.l}</StatusBadge></DrField>
      </DrSec>
    </HUI.Drawer>
  )); };
  const cols = [
    { key: "code", label: "Mã", code: true, width: 130 },
    { key: "title", label: "Tên đề xuất", render: r => <div><div style={{fontWeight:600}}>{r.title}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.dept} · {r.proposer}</div></div> },
    { key: "items", label: "Mục", width: 90, mono: true, render: r => `${r.itemCount} mục` },
    { key: "total", label: "Tổng giá trị", width: 130, mono: true, render: r => fmtVNDg(r.total) },
    { key: "vendor", label: "NCC", width: 130, render: r => r.vendor },
    { key: "priority", label: "Ưu tiên", width: 100, render: r => <StatusBadge tone={r.priority==="Đột xuất"?"crit":r.priority==="Khẩn"?"warn":null}>{r.priority}</StatusBadge> },
    { key: "submittedAt", label: "Đề xuất", width: 110, mono: true, render: r => fmtDMYg(r.submittedAt) },
    { key: "status", label: "Trạng thái", width: 130, render: r => { const s = PC_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];
  const actions = (r) => (
    <div className="ab-row-act">
      {r.status === "review" && <ActBtn ic="check" tone="ok" title="Duyệt" onClick={() => approve(r)}/>}
      <ActBtn ic="print" title="In phiếu"/>
    </div>
  );
  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Tổng đề xuất", val: rows.length },
        { lbl: "Chờ duyệt", val: counts.review, tone: "warn" },
        { lbl: "Đã duyệt", val: counts.approved + counts.ordered + counts.received, tone: "info" },
        { lbl: "Đã nhập kho", val: counts.received, tone: "ok" },
        { lbl: "Tổng giá trị", val: fmtVNDg(rows.reduce((s,r) => s + r.total, 0)) },
      ]}/>
      <TopTabs tab="all" setTab={()=>{}} tabs={[{ v: "all", l: `Đề xuất / Dự trù (${rows.length})`, ic: "list" }]} actions={
        <>
          <button className="ab-btn ghost sm"><Ico name="download" size={12}/> Xuất Excel</button>
          <button className="ab-btn primary"><Ico name="plus" size={12}/> Lập đề xuất</button>
        </>
      }/>
      <div className="ab-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Tìm mã / tên / khoa..."/></div>
      <StatusTabs value={stab} onChange={setStab} tabs={PC_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}
window.ProcurementV2 = ProcurementV2;
