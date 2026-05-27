// =====================================================================
// HIS Terminal · Module: BẢO HIỂM Y TẾ (Insurance v2)
// Quản lý hợp đồng BHYT, gửi cổng giám định, hồ sơ thanh toán BHYT
// =====================================================================

const INS_TYPES = [
  { v: "hc4", l: "BHYT bắt buộc (HC4)", rate: 80 },
  { v: "hc3", l: "BHYT hộ nghèo (HC3)", rate: 100 },
  { v: "hs",  l: "BHYT học sinh", rate: 80 },
  { v: "tn",  l: "BHYT tự nguyện", rate: 80 },
  { v: "huu", l: "BHYT hưu trí (HT2)", rate: 95 },
  { v: "tre", l: "BHYT trẻ em < 6T (TE1)", rate: 100 },
  { v: "ccb", l: "BHYT cựu chiến binh (CC1)", rate: 100 },
];

const INS_STATUS = [
  { v: "draft",     l: "Nháp",          tone: null },
  { v: "submitted", l: "Đã gửi cổng",   tone: "info" },
  { v: "approved",  l: "Đã duyệt",      tone: "ok" },
  { v: "rejected",  l: "Bị từ chối",    tone: "crit" },
  { v: "paid",      l: "Đã thanh toán", tone: "ok" },
  { v: "review",    l: "Đang giám định",tone: "warn" },
];

const INS_REASONS = [
  "Sai mã thẻ BHYT","Vượt trần thanh toán","Thiếu hồ sơ chỉ định","Sai mã ICD-10",
  "Mã dịch vụ không khớp","Trái tuyến không có giấy chuyển","Hết hạn thẻ",
];

const seedClaims = () => {
  const r = seedRand(98765);
  const list = [];
  for (let i = 0; i < 95; i++) {
    const type = INS_TYPES[Math.floor(r() * INS_TYPES.length)];
    const dayOff = -45 + Math.floor(r() * 50);
    const total = 200000 + Math.floor(r() * 9800000);
    const cov = Math.floor(total * type.rate / 100);
    const sts = r() < 0.55 ? "paid" : r() < 0.7 ? "approved" : r() < 0.83 ? "review" : r() < 0.9 ? "submitted" : r() < 0.96 ? "rejected" : "draft";
    const subAt = new Date(todayIv); subAt.setDate(subAt.getDate() + dayOff);
    list.push({
      code: `BH.${String(2026000 + i).padStart(6, "0")}`,
      pid: rndPid(), name: rndName(i),
      cardNo: `${type.v.toUpperCase()}4${String(Math.floor(r()*999999999)).padStart(9,"0")}`,
      type: type.v, rate: type.rate,
      icd: rndPick(["I10","E11","J18","K29","M54","R51","I25","N39","K35","H10"]),
      diagnosis: rndPick(["Tăng huyết áp","Đái tháo đường type 2","Viêm phổi","Viêm dạ dày","Đau lưng","Đau đầu","Bệnh mạch vành","Nhiễm khuẩn tiết niệu","Viêm ruột thừa","Viêm kết mạc"]),
      total, covered: cov, copay: total - cov,
      status: sts,
      submittedAt: ["draft"].includes(sts) ? null : subAt,
      paidAt: sts === "paid" ? new Date(subAt.getTime() + 86400000 * (5 + Math.floor(r()*15))) : null,
      rejectReason: sts === "rejected" ? rndPick(INS_REASONS) : null,
      services: Math.floor(2 + r() * 12),
      hospital: "BV Đa khoa Hồng Đức",
      contractId: `HD-${1000 + Math.floor(r() * 8)}`,
    });
  }
  return list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
};

const INS_CONTRACTS = [
  { id: "HD-1000", name: "BHXH TP. Hồ Chí Minh", code: "BHXH-HCM", validFrom: "01/01/2026", validTo: "31/12/2026", claims: 8421, paid: 12_450_000_000, status: "active" },
  { id: "HD-1001", name: "BHXH Hà Nội", code: "BHXH-HN", validFrom: "01/01/2026", validTo: "31/12/2026", claims: 1245, paid: 1_820_000_000, status: "active" },
  { id: "HD-1002", name: "BHXH Đồng Nai", code: "BHXH-DN", validFrom: "01/01/2026", validTo: "31/12/2026", claims: 642, paid: 945_000_000, status: "active" },
  { id: "HD-1003", name: "Bảo Việt Sức khoẻ", code: "BVSK-001", validFrom: "01/03/2026", validTo: "28/02/2027", claims: 312, paid: 685_000_000, status: "active" },
  { id: "HD-1004", name: "PVI Insurance", code: "PVI-005", validFrom: "01/06/2026", validTo: "31/05/2027", claims: 89, paid: 215_000_000, status: "active" },
  { id: "HD-1005", name: "Bảo Minh", code: "BM-009", validFrom: "01/01/2025", validTo: "31/12/2025", claims: 0, paid: 0, status: "expired" },
];

function InsuranceV2() {
  const [tab, setTab] = uS("claims");
  const [claims, setClaims] = uS(seedClaims);
  const [stab, setStab] = uS("all");
  const [typeFilter, setTypeFilter] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const kpi = uM(() => {
    const inProg = claims.filter(c => ["submitted","review"].includes(c.status));
    const paid = claims.filter(c => c.status === "paid");
    const rej = claims.filter(c => c.status === "rejected");
    const totalCov = claims.filter(c => c.status === "paid").reduce((s,c) => s+c.covered, 0);
    const totalReq = claims.reduce((s,c) => s+c.covered, 0);
    return { total: claims.length, inProg: inProg.length, paid: paid.length, rej: rej.length, totalCov, totalReq };
  }, [claims]);

  const filtered = uM(() => {
    let r = claims;
    if (stab !== "all") r = r.filter(c => c.status === stab);
    if (typeFilter) r = r.filter(c => c.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.pid.toLowerCase().includes(q) || c.cardNo.toLowerCase().includes(q));
    }
    return r;
  }, [claims, stab, typeFilter, search]);

  const counts = { all: claims.length };
  INS_STATUS.forEach(s => counts[s.v] = claims.filter(c => c.status === s.v).length);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  uE(() => { setPage(0); }, [tab, stab, typeFilter, search]);

  const submit = (c) => { setClaims(prev => prev.map(x => x.code === c.code ? { ...x, status: "submitted", submittedAt: new Date() } : x)); tk("Đã gửi cổng giám định " + c.code); };
  const approve = (c) => { setClaims(prev => prev.map(x => x.code === c.code ? { ...x, status: "approved" } : x)); tk("Đã duyệt " + c.code); };
  const pay = (c) => { setClaims(prev => prev.map(x => x.code === c.code ? { ...x, status: "paid", paidAt: new Date() } : x)); tk("Đã ghi nhận thanh toán " + c.code); };

  const openDetail = (c) => HUI.drawer(cx => <InsuranceDrawer c={c} cx={cx}
    onSubmit={() => { submit(c); cx(); }}
    onApprove={() => { approve(c); cx(); }}
    onPay={() => { pay(c); cx(); }}
  />);

  const cols = [
    { key: "code", label: "Mã hồ sơ", code: true, width: 130 },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.cardNo}</div></div> },
    { key: "type", label: "Loại BHYT", width: 130, render: r => { const t = INS_TYPES.find(x => x.v === r.type); return <div><div style={{fontSize:12.5}}>{t.l.replace(/\(.+\)/,"").trim()}</div><div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{r.rate}% · {r.icd}</div></div>; }},
    { key: "diagnosis", label: "Chẩn đoán", render: r => r.diagnosis },
    { key: "total", label: "Tổng VP", width: 110, mono: true, render: r => fmtVNDg(r.total) },
    { key: "covered", label: "BH chi trả", width: 110, mono: true, render: r => <span style={{color:"var(--s-ok)"}}>{fmtVNDg(r.covered)}</span> },
    { key: "copay", label: "BN cùng chi", width: 110, mono: true, render: r => fmtVNDg(r.copay) },
    { key: "submitted", label: "Gửi cổng", width: 100, mono: true, render: r => r.submittedAt ? fmtDMYg(r.submittedAt) : "—" },
    { key: "status", label: "Trạng thái", width: 120, render: r => { const s = INS_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];

  const actions = (r) => (
    <div className="ab-row-act">
      {r.status === "draft" && <ActBtn ic="upload" title="Gửi cổng" onClick={() => submit(r)}/>}
      {r.status === "approved" && <ActBtn ic="check" title="Ghi nhận TT" onClick={() => pay(r)}/>}
      <ActBtn ic="print" title="In hồ sơ" onClick={() => ti("Đang in " + r.code)}/>
    </div>
  );

  uE(() => {
    const h = (e) => { if (e.key === "F2" && !e.target.closest("input,textarea,select,[contenteditable]")) { e.preventDefault(); (() => tk("Lập hồ sơ mới"))(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);


  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Tổng hồ sơ", val: kpi.total, sub: "trong 50 ngày" },
        { lbl: "Đang xử lý", val: kpi.inProg, sub: "tại cổng giám định", tone: "info" },
        { lbl: "Đã thanh toán", val: kpi.paid, sub: `${Math.round(kpi.paid/kpi.total*100)}% tổng`, tone: "ok" },
        { lbl: "Bị từ chối", val: kpi.rej, sub: `${Math.round(kpi.rej/kpi.total*100)}%`, tone: kpi.rej > 5 ? "warn" : "crit" },
        { lbl: "BH đã thu", val: fmtVNDg(kpi.totalCov), sub: "thực thanh toán", tone: "ok" },
        { lbl: "BH yêu cầu", val: fmtVNDg(kpi.totalReq), sub: "tổng đề nghị" },
      ]}/>

      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "claims",    l: `Hồ sơ BHYT (${claims.length})`, ic: "file" },
        { v: "contracts", l: `Hợp đồng (${INS_CONTRACTS.length})`, ic: "list" },
        { v: "report",    l: "Báo cáo BHYT", ic: "chart" },
      ]} actions={
        <>
          <button className="ab-btn ghost sm" onClick={() => ti("Đang xuất Excel...")}><Ico name="download" size={12}/> Excel</button>
          <button className="ab-btn ghost sm" onClick={() => ti("Đang đồng bộ với Cổng giám định BHXH...")}><Ico name="upload" size={12}/> Đồng bộ cổng</button>
          <button className="ab-btn primary"><Ico name="plus" size={12}/> Lập hồ sơ <kbd>F2</kbd></button>
        </>
      }/>

      {tab === "claims" && <>
        <div className="ab-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã / tên BN / mã thẻ..."/>
          <Filter value={typeFilter} onChange={setTypeFilter} options={INS_TYPES.map(t => ({ v: t.v, l: t.l }))} placeholder="Tất cả loại"/>
        </div>
        <StatusTabs value={stab} onChange={setStab} tabs={INS_STATUS} counts={counts}/>
        <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={openDetail} actions={actions}/>
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
      </>}

      {tab === "contracts" && <ContractsTab/>}

      {tab === "report" && <ReportTab kpi={kpi}/>}
    </div>
  );
}

const ContractsTab = () => {
  const cols = [
    { key: "id", label: "Mã HĐ", code: true, width: 90 },
    { key: "name", label: "Đơn vị BH", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.code}</div></div> },
    { key: "valid", label: "Hiệu lực", width: 200, mono: true, render: r => `${r.validFrom} → ${r.validTo}` },
    { key: "claims", label: "Hồ sơ", width: 100, mono: true, render: r => r.claims.toLocaleString("vi-VN") },
    { key: "paid", label: "Đã chi trả", width: 160, mono: true, render: r => fmtVNDg(r.paid) },
    { key: "status", label: "Trạng thái", width: 110, render: r => <StatusBadge tone={r.status==="active"?"ok":"warn"} dot>{r.status==="active"?"Đang hiệu lực":"Hết hạn"}</StatusBadge> },
  ];
  return <DataTable columns={cols} data={INS_CONTRACTS} rowKey={r => r.id}/>;
};

const ReportTab = ({ kpi }) => (
  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
    <ReportCard title="Tỷ lệ duyệt hồ sơ" rows={[
      ["Đã duyệt + thanh toán", kpi.paid + Math.floor(kpi.total*0.1), "ok"],
      ["Đang giám định", kpi.inProg, "info"],
      ["Bị từ chối", kpi.rej, "crit"],
      ["Tỷ lệ duyệt", `${Math.round((kpi.paid)/(kpi.total)*100)}%`, "ok"],
    ]}/>
    <ReportCard title="Giá trị BHYT thanh toán" rows={[
      ["Tổng yêu cầu", fmtVNDg(kpi.totalReq), null],
      ["Đã thanh toán", fmtVNDg(kpi.totalCov), "ok"],
      ["Còn lại đang xử lý", fmtVNDg(kpi.totalReq - kpi.totalCov), "info"],
      ["Tỷ lệ thu hồi", `${Math.round(kpi.totalCov/kpi.totalReq*100)}%`, "ok"],
    ]}/>
    <ReportCard title="Lý do từ chối phổ biến" rows={INS_REASONS.slice(0,5).map((r, i) => [r, `${5-i} HS`, i < 2 ? "crit" : "warn"])}/>
    <ReportCard title="Phân loại theo nhóm BHYT" rows={INS_TYPES.slice(0,5).map(t => [t.l.replace(/\(.+\)/,"").trim(), `${Math.floor(Math.random()*30+5)} HS · ${t.rate}%`, null])}/>
  </div>
);

const ReportCard = ({ title, rows }) => (
  <div style={{border:"1px solid var(--line)",background:"var(--d-1)",borderRadius:8,padding:14}}>
    <h4 style={{margin:"0 0 10px",fontSize:12,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>{title}</h4>
    {rows.map((row, i) => (
      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom: i < rows.length-1 ? "1px solid var(--line)" : "none",fontSize:13}}>
        <span style={{color:"var(--t-1)"}}>{row[0]}</span>
        <span style={{fontFamily:"var(--font-mono)",fontWeight:600,color: row[2]==="ok"?"var(--s-ok)":row[2]==="crit"?"var(--s-crit)":row[2]==="info"?"var(--s-info)":row[2]==="warn"?"var(--s-warn)":"var(--t-0)"}}>{row[1]}</span>
      </div>
    ))}
  </div>
);

const InsuranceDrawer = ({ c, cx, onSubmit, onApprove, onPay }) => {
  const stat = INS_STATUS.find(s => s.v === c.status);
  const type = INS_TYPES.find(t => t.v === c.type);
  return (
    <HUI.Drawer
      title={c.code}
      sub={<>{c.name} · <StatusBadge tone={stat.tone} dot>{stat.l}</StatusBadge></>}
      width={620} onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn"><Ico name="print" size={12}/> In hồ sơ</button>
        {c.status === "draft" && <button className="ab-btn primary" onClick={onSubmit}><Ico name="upload" size={12}/> Gửi cổng GĐ</button>}
        {c.status === "submitted" && <button className="ab-btn primary" onClick={onApprove}><Ico name="check" size={12}/> Đánh dấu đã duyệt</button>}
        {c.status === "approved" && <button className="ab-btn primary" onClick={onPay}><Ico name="check" size={12}/> Ghi nhận TT</button>}
      </>}>
      <DrSec title="Bệnh nhân & thẻ BHYT">
        <DrField lbl="Họ tên">{c.name}</DrField>
        <DrField lbl="Mã BN"><b style={{fontFamily:"var(--font-mono)"}}>{c.pid}</b></DrField>
        <DrField lbl="Số thẻ BHYT"><b style={{fontFamily:"var(--font-mono)"}}>{c.cardNo}</b></DrField>
        <DrField lbl="Loại thẻ">{type.l}</DrField>
        <DrField lbl="Tỷ lệ chi trả"><b>{c.rate}%</b></DrField>
      </DrSec>
      <DrSec title="Khám chữa bệnh">
        <DrField lbl="Mã ICD-10"><span style={{fontFamily:"var(--font-mono)"}}>{c.icd}</span></DrField>
        <DrField lbl="Chẩn đoán">{c.diagnosis}</DrField>
        <DrField lbl="Số dịch vụ">{c.services}</DrField>
        <DrField lbl="Cơ sở KCB">{c.hospital}</DrField>
      </DrSec>
      <DrSec title="Chi phí">
        <DrField lbl="Tổng viện phí"><b style={{fontFamily:"var(--font-mono)"}}>{fmtVNDg(c.total)}</b></DrField>
        <DrField lbl="BH chi trả"><span style={{color:"var(--s-ok)",fontFamily:"var(--font-mono)",fontWeight:600}}>{fmtVNDg(c.covered)}</span></DrField>
        <DrField lbl="BN cùng chi trả"><span style={{fontFamily:"var(--font-mono)"}}>{fmtVNDg(c.copay)}</span></DrField>
      </DrSec>
      {c.submittedAt && <DrSec title="Tiến trình">
        <DrField lbl="Gửi cổng GĐ">{fmtDTg(c.submittedAt)}</DrField>
        {c.paidAt && <DrField lbl="Đã thanh toán"><span style={{color:"var(--s-ok)"}}>{fmtDTg(c.paidAt)}</span></DrField>}
        <DrField lbl="Hợp đồng">{c.contractId}</DrField>
      </DrSec>}
      {c.rejectReason && <DrSec title="Lý do từ chối">
        <div style={{padding:"10px 12px",background:"var(--a-em-bg)",border:"1px solid var(--a-em-line)",borderRadius:6,fontSize:13,color:"var(--s-crit)"}}>{c.rejectReason}</div>
      </DrSec>}
    </HUI.Drawer>
  );
};

window.InsuranceV2 = InsuranceV2;
