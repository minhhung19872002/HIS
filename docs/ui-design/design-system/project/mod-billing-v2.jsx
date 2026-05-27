// =====================================================================
// HIS Terminal · Module: VIỆN PHÍ (Billing v2)
// Hoá đơn, BHYT, thanh toán, công nợ
// =====================================================================

const BILL_STATUS = [
  { v: "draft",     l: "Tạm tính",     tone: "info" },
  { v: "pending",   l: "Chờ thanh toán", tone: "warn" },
  { v: "partial",   l: "Đặt cọc 1 phần", tone: "warn" },
  { v: "paid",      l: "Đã thanh toán",  tone: "ok" },
  { v: "refunded",  l: "Đã hoàn tiền",   tone: "info" },
  { v: "voided",    l: "Đã huỷ",         tone: "danger" },
];
const BILL_KINDS = [
  { v: "opd",     l: "Khám ngoại trú" },
  { v: "ipd",     l: "Nội trú" },
  { v: "or",      l: "Phẫu thuật" },
  { v: "lab",     l: "CLS" },
  { v: "rx",      l: "Đơn thuốc" },
];
const PAY_METHODS = [
  { v: "cash",  l: "Tiền mặt", ic: "cash" },
  { v: "card",  l: "Thẻ ngân hàng", ic: "card" },
  { v: "qr",    l: "Chuyển khoản QR", ic: "qr" },
  { v: "vnpay", l: "VNPAY", ic: "qr" },
  { v: "momo",  l: "MoMo", ic: "qr" },
];

const seedBill = () => {
  const rows = [];
  for (let i = 0; i < 56; i++) {
    const kind = rndPick(BILL_KINDS);
    const items = Array.from({length: 2+Math.floor(Math.random()*5)}, () => ({
      name: rndPick(["Khám nội tổng quát","Sinh hoá máu","CTM","Siêu âm bụng","XQ ngực","Phẫu thuật ruột thừa","Giường nội trú/ngày","Thuốc kê đơn"]),
      qty: 1+Math.floor(Math.random()*3),
      price: [60000,150000,280000,450000,800000,2400000,250000,180000][Math.floor(Math.random()*8)],
    }));
    const subtotal = items.reduce((s,i)=>s+i.qty*i.price,0);
    const bhyt = Math.random() > 0.35;
    const bhytRate = bhyt ? rndPick([80, 95, 100]) : 0;
    const bhytPay = Math.round(subtotal * bhytRate / 100);
    const patientPay = subtotal - bhytPay;
    const status = ["draft","pending","pending","partial","paid","paid","paid","paid"][i%8];
    rows.push({
      code: `INV-${String(20261022).slice(-6)}-${String(i+1).padStart(3,"0")}`,
      pid: rndPid(), patientName: rndName(i), age: rndAge(),
      kind: kind.v, kindLabel: kind.l,
      items, subtotal, bhyt, bhytRate, bhytPay, patientPay,
      issuedAt: new Date(2026, 9, 22, 7+Math.floor(i/4), (i*7)%60),
      ...(status === "paid" ? {
        paidAt: new Date(2026, 9, 22, 8+Math.floor(i/4), (i*9)%60),
        method: rndPick(PAY_METHODS).v,
        cashier: rndPick(["TT. Nguyễn Thị Linh","TT. Phạm Văn Đức","TT. Lê Thị Huyền"]),
      } : {}),
      ...(status === "partial" ? { deposit: Math.round(patientPay * 0.5) } : {}),
      status,
    });
  }
  return rows;
};

function BillingV2() {
  const [data, setData] = uS(seedBill());
  const [stab, setStab] = uS("all");
  const [fKind, setFKind] = uS("");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const counts = { all: data.length };
  BILL_STATUS.forEach(s => counts[s.v] = data.filter(r => r.status === s.v).length);
  const filtered = data.filter(r => {
    if (stab !== "all" && r.status !== stab) return false;
    if (fKind && r.kind !== fKind) return false;
    if (search) { const q = search.toLowerCase(); return [r.patientName, r.pid, r.code].some(x => x.toLowerCase().includes(q)); }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const kpis = uM(() => ({
    today: data.length,
    pending: data.filter(r => r.status === "pending" || r.status === "partial").length,
    paid: data.filter(r => r.status === "paid").length,
    revenue: data.reduce((s,r)=>r.status==="paid"?s+r.patientPay:s, 0),
    bhytClaim: data.reduce((s,r)=>r.bhyt?s+r.bhytPay:s, 0),
    avgTicket: Math.round(data.reduce((s,r)=>s+r.subtotal,0)/data.length),
  }), [data]);

  const update = (code, patch) => setData(p => p.map(r => r.code === code ? { ...r, ...patch } : r));
  const open = (r) => HUI.drawer(cx => <BillDrawer r={r} cx={cx} onUpdate={update}/>);
  const pay = (r) => HUI.open(cx => <BillPayModal r={r} cx={cx} onSubmit={(method) => { update(r.code, { status: "paid", paidAt: new Date(), method, cashier: window.HIS.currentUser.name }); cx(); tk(`Đã thu ${fmtVNDg(r.patientPay)}`); }}/>);

  const cols = [
    { key: "code", label: "Mã HĐ", code: true, render: r => <span>{r.code}{r.bhyt && <span style={{marginLeft:6,padding:"1px 5px",background:"var(--a-cy-bg)",border:"1px solid var(--a-cy-line)",color:"var(--a-cy-text)",borderRadius:3,fontSize:9,fontWeight:700}}>BHYT {r.bhytRate}%</span>}</span> },
    { key: "time", label: "Lúc", mono: true, render: r => fmtHMg(r.issuedAt) },
    { key: "patient", label: "Bệnh nhân", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.patientName}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}T</div></div> },
    { key: "kind", label: "Loại", render: r => r.kindLabel },
    { key: "items", label: "Mục", num: true, mono: true, render: r => `${r.items.length}` },
    { key: "subtotal", label: "Tổng", mono: true, num: true, render: r => fmtVNDg(r.subtotal) },
    { key: "bhytPay", label: "BHYT chi trả", mono: true, num: true, render: r => r.bhyt ? <span style={{color:"var(--a-cy-text)"}}>{fmtVNDg(r.bhytPay)}</span> : <span style={{color:"var(--t-3)"}}>—</span> },
    { key: "patientPay", label: "BN trả", mono: true, num: true, render: r => <b>{fmtVNDg(r.patientPay)}</b> },
    { key: "method", label: "PT thanh toán", render: r => r.method ? <span style={{fontSize:11.5}}>{PAY_METHODS.find(p=>p.v===r.method)?.l}</span> : <span style={{color:"var(--t-3)"}}>—</span> },
    { key: "status", label: "Trạng thái", render: r => { const s = BILL_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; } },
  ];
  const actions = (r) => (
    <div className="ab-actions">
      {(r.status === "pending" || r.status === "partial") && <ActBtn ic="cash" title="Thu tiền" onClick={()=>pay(r)}/>}
      <ActBtn ic="eye" title="Chi tiết" onClick={()=>open(r)}/>
      <ActBtn ic="print" title="In hóa đơn" onClick={()=>tk("Đã in hoá đơn")}/>
      {r.status === "paid" && <ActBtn ic="refresh" title="Hoàn tiền" onClick={()=>HUI.confirm("Hoàn tiền?",`${fmtVNDg(r.patientPay)}`,()=>{update(r.code,{status:"refunded"});tk("Đã hoàn tiền");},"warn")}/>}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "HĐ hôm nay", val: kpis.today, sub: "tổng" },
        { lbl: "Chờ thu", val: kpis.pending, sub: "công nợ", tone: "warn" },
        { lbl: "Đã thu", val: kpis.paid, sub: `${Math.round(kpis.paid/kpis.today*100)}%`, tone: "ok" },
        { lbl: "Doanh thu BN", val: Math.round(kpis.revenue/1000), unit: "K", sub: "VND", tone: "ok" },
        { lbl: "BHYT đề nghị", val: Math.round(kpis.bhytClaim/1000), unit: "K", sub: "VND", tone: "info" },
        { lbl: "TB / HĐ", val: Math.round(kpis.avgTicket/1000), unit: "K", sub: "VND" },
      ]}/>
      <div className="ab-toolbar" style={{borderTop:"1px solid var(--line)"}}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên BN, mã HĐ…"/>
        <Filter value={fKind} onChange={setFKind} options={BILL_KINDS} placeholder="▾ Loại"/>
        <button className="ab-btn ghost" onClick={()=>{setSearch("");setFKind("");setStab("all");}}><Ico name="refresh" size={12}/> Bỏ lọc</button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={()=>tk("Đối soát BHYT cuối ngày")}><Ico name="check" size={12}/> Đối soát BHYT</button>
        <button className="ab-btn ghost" onClick={()=>tk("Đã xuất CSV")}><Ico name="download" size={12}/> Xuất</button>
        <button className="ab-btn primary" onClick={()=>tk("Tạo hoá đơn mới")}><Ico name="plus" size={12}/> HĐ mới <kbd>F2</kbd></button>
      </div>
      <StatusTabs value={stab} onChange={setStab} tabs={BILL_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open} actions={actions}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}

const BillDrawer = ({ r, cx, onUpdate }) => (
  <HUI.Drawer title={`Hoá đơn · ${r.code}`} sub={`${r.patientName} · ${r.kindLabel}`} size="md" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Đóng</button>
    <button className="ab-btn" onClick={()=>tk("Đã in hoá đơn")}><Ico name="print" size={12}/> In hoá đơn</button>
    {(r.status === "pending" || r.status === "partial") && <button className="ab-btn primary" onClick={()=>{onUpdate(r.code,{status:"paid",paidAt:new Date(),method:"cash"});cx();tk(`Đã thu ${fmtVNDg(r.patientPay)}`);}}><Ico name="cash" size={12}/> Thu tiền</button>}
  </>}>
    <DrSec title="Bệnh nhân & Hoá đơn">
      <DrField lbl="Họ tên">{r.patientName}</DrField>
      <DrField lbl="Mã BN">{r.pid}</DrField>
      <DrField lbl="Loại HĐ">{r.kindLabel}</DrField>
      <DrField lbl="Phát hành">{fmtDTg(r.issuedAt)}</DrField>
      {r.bhyt && <DrField lbl="BHYT"><span className="ab-stat info" style={{height:18,padding:"0 6px",fontSize:10}}>✓ Có thẻ · Mức {r.bhytRate}%</span></DrField>}
    </DrSec>
    <DrSec title="Chi tiết khoản phí">
      <table style={{width:"100%",fontSize:12.5,borderCollapse:"collapse"}}>
        <thead><tr style={{background:"var(--d-1)",fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}><th style={{padding:"8px 10px",textAlign:"left",borderBottom:"1px solid var(--line)"}}>Khoản mục</th><th style={{padding:"8px 10px",textAlign:"right",borderBottom:"1px solid var(--line)"}}>SL</th><th style={{padding:"8px 10px",textAlign:"right",borderBottom:"1px solid var(--line)"}}>Đơn giá</th><th style={{padding:"8px 10px",textAlign:"right",borderBottom:"1px solid var(--line)"}}>Thành tiền</th></tr></thead>
        <tbody>{r.items.map((it,i) => (
          <tr key={i} style={{borderBottom:"1px solid var(--line-soft)"}}>
            <td style={{padding:"8px 10px"}}>{it.name}</td>
            <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"var(--font-mono)"}}>{it.qty}</td>
            <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"var(--font-mono)"}}>{fmtVNDg(it.price)}</td>
            <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"var(--font-mono)",fontWeight:600}}>{fmtVNDg(it.qty*it.price)}</td>
          </tr>
        ))}</tbody>
      </table>
    </DrSec>
    <DrSec title="Tổng kết tài chính">
      <div style={{padding:14,background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}>
          <span>Tổng tiền</span><span style={{fontFamily:"var(--font-mono)"}}>{fmtVNDg(r.subtotal)}</span>
        </div>
        {r.bhyt && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,color:"var(--a-cy-text)"}}>
          <span>BHYT chi trả ({r.bhytRate}%)</span><span style={{fontFamily:"var(--font-mono)"}}>−{fmtVNDg(r.bhytPay)}</span>
        </div>}
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"1px solid var(--line)",marginTop:6,fontSize:16,fontWeight:700}}>
          <span>Bệnh nhân chi trả</span><span style={{fontFamily:"var(--font-mono)",color:"var(--ac)"}}>{fmtVNDg(r.patientPay)}</span>
        </div>
        {r.deposit && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,color:"var(--t-2)"}}>
          <span>Đã đặt cọc</span><span style={{fontFamily:"var(--font-mono)"}}>{fmtVNDg(r.deposit)}</span>
        </div>}
      </div>
    </DrSec>
    {r.status === "paid" && <DrSec title="Thanh toán">
      <DrField lbl="Lúc">{fmtDTg(r.paidAt)}</DrField>
      <DrField lbl="Phương thức">{PAY_METHODS.find(p=>p.v===r.method)?.l}</DrField>
      <DrField lbl="Thu ngân">{r.cashier}</DrField>
    </DrSec>}
  </HUI.Drawer>
);

const BillPayModal = ({ r, cx, onSubmit }) => {
  const [method, setMethod] = uS("cash");
  const [amount, setAmount] = uS(r.patientPay);
  return (
    <HUI.Modal title={`Thu viện phí · ${fmtVNDg(r.patientPay)}`} sub={r.patientName} size="md" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Hủy</button>
      <button className="ab-btn primary" onClick={()=>onSubmit(method)}><Ico name="check" size={12}/> Xác nhận thu</button>
    </>}>
      <div style={{padding:"14px 18px"}}>
        <HUI.Field label="Phương thức thanh toán" required>
          <HUI.Radio name="m" value={method} onChange={setMethod} options={PAY_METHODS.map(p => ({value: p.v, label: p.l}))}/>
        </HUI.Field>
        <HUI.Field label="Số tiền nhận" required>
          <HUI.Input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} style={{fontSize:18,fontFamily:"var(--font-mono)",fontWeight:600}}/>
        </HUI.Field>
        <div style={{padding:14,background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,fontSize:13}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span>Cần thu:</span><span style={{fontFamily:"var(--font-mono)"}}>{fmtVNDg(r.patientPay)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span>BN trả:</span><span style={{fontFamily:"var(--font-mono)"}}>{fmtVNDg(amount)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,borderTop:"1px solid var(--line)",marginTop:6,fontWeight:700}}>
            <span>Tiền thừa:</span>
            <span style={{fontFamily:"var(--font-mono)",color: amount-r.patientPay > 0 ? "var(--ac)" : amount-r.patientPay < 0 ? "var(--a-rd-text)" : "var(--t-0)"}}>{fmtVNDg(amount - r.patientPay)}</span>
          </div>
        </div>
      </div>
    </HUI.Modal>
  );
};

window.BillingV2 = BillingV2;
