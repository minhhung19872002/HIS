// HIS Billing — Invoicing + BHYT claims
const { useState: useBS } = React;

const BillingModule = () => {
  const invoices = [
    {id:"HD-2026-4018", pid:"BN-00201", dt:"hôm nay 11:30", kind:"OPD", stat:"pend", total:1842000, bhyt:1473600, pay:368400, ward:"OPD-03"},
    {id:"HD-2026-4017", pid:"BN-00142", dt:"hôm nay 11:12", kind:"OPD", stat:"paid", total:486000, bhyt:388800, pay:0, ward:"OPD-01"},
    {id:"HD-2026-4016", pid:"BN-00256", dt:"hôm nay 10:48", kind:"OPD", stat:"bhyt-pend", total:1240000, bhyt:1240000, pay:0, ward:"OPD-05"},
    {id:"HD-2026-4015", pid:"BN-00189", dt:"hôm nay 10:15", kind:"OPD", stat:"paid", total:324000, bhyt:259200, pay:64800, ward:"OPD-02"},
    {id:"HD-2026-4014", pid:"BN-00234", dt:"hôm nay 09:50", kind:"IPD", stat:"draft", total:8420000, bhyt:6736000, pay:1684000, ward:"Nội A.205"},
    {id:"HD-2026-4013", pid:"BN-00278", dt:"hôm nay 09:22", kind:"CC", stat:"bhyt-pend", total:4680000, bhyt:4680000, pay:0, ward:"Cấp cứu"},
    {id:"HD-2026-4012", pid:"BN-00166", dt:"hôm nay 08:58", kind:"OPD", stat:"paid", total:218000, bhyt:174400, pay:43600, ward:"OPD-04"},
  ];
  const [sel, setSel] = useBS("HD-2026-4018");
  const [tab, setTab] = useBS("all");
  const [pay, setPay] = useBS("bank");

  const counts = {
    all: invoices.length,
    draft: invoices.filter(x=>x.stat==="draft").length,
    pend: invoices.filter(x=>x.stat==="pend").length,
    paid: invoices.filter(x=>x.stat==="paid").length,
    bhyt: invoices.filter(x=>x.stat==="bhyt-pend").length,
  };
  const filtered = tab==="all" ? invoices
                  : tab==="bhyt" ? invoices.filter(x=>x.stat==="bhyt-pend")
                  : invoices.filter(x=>x.stat===tab);

  const inv = invoices.find(x => x.id === sel);
  const p = HIS.patientById(inv.pid);

  // Line items for selected invoice
  const lines = {
    kham: [
      {code:"KB-001", nm:"Khám nội tổng quát", sub:"BS. Nguyễn Linh · 08:55", qty:1, price:38700, bhyt:"100%", bhytAmt:38700, pay:0},
    ],
    xn: [
      {code:"XN-3012", nm:"Tổng phân tích máu 18 TS", sub:"XN-2026-4419 · Cobas 8000", qty:1, price:72000, bhyt:"100%", bhytAmt:72000, pay:0},
      {code:"XN-3045", nm:"Sinh hoá máu 10 TS", sub:"Glu, Cre, AST, ALT, BUN...", qty:1, price:156000, bhyt:"100%", bhytAmt:156000, pay:0},
      {code:"XN-3301", nm:"Troponin I định lượng", sub:"Kết quả: 0.82 ng/mL · HH", qty:1, price:224000, bhyt:"80%", bhytAmt:179200, pay:44800},
      {code:"XN-3102", nm:"CK-MB định lượng", sub:"Kết quả: 38 U/L · H", qty:1, price:98000, bhyt:"80%", bhytAmt:78400, pay:19600},
    ],
    cdha: [
      {code:"CD-2001", nm:"Chụp XQ ngực thẳng (CR)", sub:"IMG-2026-1188 · CĐHA", qty:1, price:48000, bhyt:"100%", bhytAmt:48000, pay:0},
      {code:"CD-4010", nm:"Điện tim 12 đạo trình", sub:"ECG-2026-1982", qty:1, price:28000, bhyt:"100%", bhytAmt:28000, pay:0},
    ],
    thuoc: [
      {code:"VN-12800-04", nm:"Aspirin 81mg", sub:"30 viên · đủ 30 ngày", qty:30, price:42000, bhyt:"80%", bhytAmt:33600, pay:8400},
      {code:"VN-13301-22", nm:"Atorvastatin 20mg", sub:"30 viên · đủ 30 ngày", qty:30, price:72000, bhyt:"80%", bhytAmt:57600, pay:14400},
      {code:"VN-16800-11", nm:"Bisoprolol 2.5mg", sub:"30 viên · đủ 30 ngày", qty:30, price:48000, bhyt:"80%", bhytAmt:38400, pay:9600},
      {code:"VN-11720-16", nm:"Metformin 500mg", sub:"60 viên · đủ 30 ngày", qty:60, price:24000, bhyt:"80%", bhytAmt:19200, pay:4800},
    ],
    dv: [
      {code:"DV-501", nm:"Giường khám cấp cứu (2h)", sub:"08:45 – 10:35", qty:1, price:168000, bhyt:"80%", bhytAmt:134400, pay:33600},
      {code:"DV-108", nm:"Vật tư y tế tiêu hao", sub:"kim tiêm, bông, gạc, nước muối", qty:1, price:36000, bhyt:"80%", bhytAmt:28800, pay:7200},
    ],
  };
  const allLines = [...lines.kham, ...lines.xn, ...lines.cdha, ...lines.thuoc, ...lines.dv];
  const total = allLines.reduce((s,x)=>s + x.price*x.qty, 0);
  const bhytAmt = allLines.reduce((s,x)=>s + x.bhytAmt*x.qty, 0);
  const payAmt = allLines.reduce((s,x)=>s + x.pay*x.qty, 0);

  const renderSection = (title, list, cnt, subtotal) => (
    <div className="bill-card">
      <div className="bill-card-h">
        <span>{title} <span className="n">· {list.length} dòng</span></span>
        <span className="t">{subtotal.toLocaleString("vi-VN")} ₫</span>
      </div>
      <div className="bill-line bill-line-head">
        <span>Mã</span>
        <span>Nội dung</span>
        <span style={{textAlign:"right"}}>SL</span>
        <span style={{textAlign:"right"}}>BHYT</span>
        <span style={{textAlign:"right"}}>Đơn giá</span>
        <span style={{textAlign:"right"}}>BHYT trả</span>
        <span style={{textAlign:"right"}}>BN trả</span>
      </div>
      {list.map((l,i) => (
        <div key={i} className="bill-line">
          <span className="code">{l.code}</span>
          <span>
            <span className="nm">{l.nm}</span>
            <small>{l.sub}</small>
          </span>
          <span className="num">{l.qty}</span>
          <span className="num pay-ok">{l.bhyt}</span>
          <span className="num">{(l.price*l.qty).toLocaleString("vi-VN")}</span>
          <span className="num pay-ok">{(l.bhytAmt*l.qty).toLocaleString("vi-VN")}</span>
          <span className={"num " + (l.pay===0?"pay-no":"")}>{(l.pay*l.qty).toLocaleString("vi-VN")}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bill-wrap">
      <div className="bill-top">
        <div className="bill-kpi"><div className="l">Hoá đơn hôm nay</div><div className="v">218</div><div className="s">+12 vs hôm qua</div></div>
        <div className="bill-kpi"><div className="l">Doanh thu</div><div className="v">412<small>M₫</small></div><div className="s">tiến độ 82%</div></div>
        <div className="bill-kpi"><div className="l">BHYT (thanh toán)</div><div className="v">284<small>M₫</small></div><div className="s">68.9%</div></div>
        <div className="bill-kpi"><div className="l">Chờ duyệt BHYT</div><div className="v" style={{color:"var(--s-warn)"}}>38<small>M₫</small></div><div className="s crit">8 HS lệch mã</div></div>
        <div className="bill-kpi"><div className="l">Công nợ BN</div><div className="v">4.2<small>M₫</small></div><div className="s crit">3 quá hạn</div></div>
        <div className="bill-kpi"><div className="l">Thu ngân đang mở</div><div className="v">4<small>/6</small></div><div className="s">quầy 1–3, 5</div></div>
      </div>

      <div className="bill-body">
        {/* Invoice list */}
        <div className="bill-list">
          <div className="bill-list-h">
            <div className="bill-seg">
              <div className={"bill-seg-i " + (tab==="all"?"on":"")} onClick={()=>setTab("all")}>Tất cả</div>
              <div className={"bill-seg-i " + (tab==="draft"?"on":"")} onClick={()=>setTab("draft")}>Nháp {counts.draft}</div>
              <div className={"bill-seg-i " + (tab==="pend"?"on":"")} onClick={()=>setTab("pend")}>Chờ TT {counts.pend}</div>
              <div className={"bill-seg-i " + (tab==="bhyt"?"on":"")} onClick={()=>setTab("bhyt")}>BHYT {counts.bhyt}</div>
              <div className={"bill-seg-i " + (tab==="paid"?"on":"")} onClick={()=>setTab("paid")}>Đã TT {counts.paid}</div>
            </div>
          </div>
          <div className="bill-list-body">
            {filtered.map(x => {
              const xp = HIS.patientById(x.pid);
              const stLbl = {draft:"NHÁP",pend:"CHỜ TT",paid:"✓ ĐÃ TT","bhyt-pend":"CHỜ BHYT"}[x.stat];
              return (
                <div key={x.id} className={"bill-inv " + (sel===x.id?"sel":"")} onClick={()=>setSel(x.id)}>
                  <div className="bill-inv-row1">
                    <span className="bill-inv-id">{x.id}</span>
                    <span className={"bill-inv-stat " + x.stat}>{stLbl}</span>
                  </div>
                  <div className="bill-inv-pt">{xp.name}</div>
                  <div className="bill-inv-meta">
                    <span>BN <b>{x.pid}</b></span>
                    <span>{x.dt}</span>
                    <span>{x.kind}</span>
                    <span>{x.ward}</span>
                    <span>BHYT <b>{xp.bhytClass}</b></span>
                  </div>
                  <div className="bill-inv-amt">
                    {x.total.toLocaleString("vi-VN")} ₫
                    {x.pay > 0 && <div className="pay">BN trả: {x.pay.toLocaleString("vi-VN")} ₫</div>}
                    {x.pay === 0 && x.stat !== "draft" && <div className="pay">BHYT 100%</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice detail */}
        <div className="bill-detail">
          <div className="bill-detail-h">
            <div>
              <div className="bill-detail-tit">{inv.id}</div>
              <div className="bill-detail-sub">
                <span>Xuất <b>{inv.dt}</b></span>
                <span>·</span>
                <span>Thu ngân <b>Nguyễn T. Mai (Q.02)</b></span>
                <span>·</span>
                <span>Kỳ VT <b>2026-10</b></span>
                <span>·</span>
                <span>Đợt XML <b>#42</b></span>
              </div>
              <div style={{marginTop:10, display:"flex", gap:14, alignItems:"center"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"var(--a-cy-bg)",color:"var(--a-cy)",display:"grid",placeItems:"center",fontWeight:600,fontSize:20,border:"1px solid var(--a-cy-line)"}}>
                  {p.name.split(" ").slice(-1)[0][0]}
                </div>
                <div>
                  <div style={{fontSize:16, fontWeight:600, color:"var(--t-0)"}}>{p.name}</div>
                  <div style={{fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--t-2)", marginTop:2, display:"flex", gap:10}}>
                    <span><b style={{color:"var(--t-0)", fontFamily:"var(--font-sans)"}}>{p.id}</b></span>
                    <span>{p.age}t · {p.gender==="M"?"Nam":"Nữ"}</span>
                    <span>CCCD {p.cccd}</span>
                    <span>SĐT {p.phone}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"flex", gap:6}}>
              <button className="opd-btn-sec">⎙ In hóa đơn</button>
              <button className="opd-btn-sec">✉ Gửi email</button>
              <button className="opd-btn-sec">📋 Sao chép</button>
              <button className="opd-btn-sec">⋯</button>
            </div>
          </div>

          <div className="bill-detail-body">
            {renderSection("1. Công khám", lines.kham, 1, lines.kham.reduce((s,x)=>s+x.price*x.qty, 0))}
            {renderSection("2. Xét nghiệm", lines.xn, lines.xn.length, lines.xn.reduce((s,x)=>s+x.price*x.qty, 0))}
            {renderSection("3. Chẩn đoán hình ảnh + TDCN", lines.cdha, 2, lines.cdha.reduce((s,x)=>s+x.price*x.qty, 0))}
            {renderSection("4. Thuốc theo đơn", lines.thuoc, lines.thuoc.length, lines.thuoc.reduce((s,x)=>s+x.price*x.qty, 0))}
            {renderSection("5. Dịch vụ khác · VTYT", lines.dv, lines.dv.length, lines.dv.reduce((s,x)=>s+x.price*x.qty, 0))}
          </div>
        </div>

        {/* Payment */}
        <div className="bill-pay">
          <div className="bill-pay-h">Thanh toán</div>
          <div className="bill-pay-body">
            <div className="bhyt-card">
              <div className="h">
                <span className="t">BHYT · {p.bhytClass} · Hạng I</span>
                <span className="bill-inv-stat paid">✓ XÁC THỰC</span>
              </div>
              <div className="num">{p.bhyt}</div>
              <div className="meta">
                <span>Nơi ĐKKCB: <b>BVĐK HY</b></span>
                <span>Hiệu lực: <b>31/12/2026</b></span>
                <span>Mức <b>80%</b></span>
              </div>
              <div className="v-ok">
                <Ico name="check" size={14}/>
                Kết nối Cổng BHXH · phản hồi 0.8s · OK
              </div>
            </div>

            <div className="bill-summary">
              <div className="bill-sum-row"><span className="l">Tổng chi phí</span><span className="v">{total.toLocaleString("vi-VN")} ₫</span></div>
              <div className="bill-sum-row"><span className="l">+ VAT 5% (DV ngoài)</span><span className="v">0 ₫</span></div>
              <div className="bill-sum-row ded"><span className="l">− BHYT 80% chi trả</span><span className="v">− {bhytAmt.toLocaleString("vi-VN")} ₫</span></div>
              <div className="bill-sum-row ded"><span className="l">− Miễn giảm (KM 65+)</span><span className="v">− 0 ₫</span></div>
              <div className="bill-sum-row sep tot"><span className="l">BN phải trả</span><span className="v">{payAmt.toLocaleString("vi-VN")} ₫</span></div>
            </div>

            <div style={{fontFamily:"var(--font-mono)", fontSize:"var(--fs-xxs)", textTransform:"uppercase", color:"var(--t-2)", letterSpacing:"0.08em", marginBottom:8, fontWeight:600}}>Phương thức</div>
            <div className="pay-method">
              <div className={"pay-tile " + (pay==="cash"?"on":"")} onClick={()=>setPay("cash")}>
                <span className="ic">💵</span>
                Tiền mặt
              </div>
              <div className={"pay-tile " + (pay==="bank"?"on":"")} onClick={()=>setPay("bank")}>
                <span className="ic">💳</span>
                Thẻ ATM/POS
              </div>
              <div className={"pay-tile " + (pay==="qr"?"on":"")} onClick={()=>setPay("qr")}>
                <span className="ic">◱</span>
                QR VietQR
              </div>
              <div className={"pay-tile " + (pay==="ewallet"?"on":"")} onClick={()=>setPay("ewallet")}>
                <span className="ic">◯</span>
                Momo / ZaloPay
              </div>
            </div>

            <div style={{marginTop:14, padding:"10px", background:"var(--d-1)", border:"1px solid var(--line)", borderRadius:"var(--r-2)"}}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Gửi hóa đơn điện tử</div>
              <div style={{fontSize:"var(--fs-sm)",color:"var(--t-0)",marginBottom:2}}>hoangcuong58@gmail.com</div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--a-cy)"}}>0901 223 344 · Zalo</div>
            </div>
          </div>

          <div className="bill-pay-foot">
            <button>✓ Xác nhận thanh toán · {payAmt.toLocaleString("vi-VN")} ₫ (F10)</button>
            <div className="sec-row">
              <button>Lưu nháp</button>
              <button>Hoãn</button>
              <button>Tách hóa đơn</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.BillingModule = BillingModule;
