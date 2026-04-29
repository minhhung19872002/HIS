// HIS Pharmacy — Rx dispensing queue
const { useState: usePS } = React;

const RxModule = () => {
  const queue = [
    {id:"RX-8801", num:"112", pid:"BN-00278", stat:"urg", ward:"CẤP CỨU", dx:"J96.0 · Suy hô hấp cấp", doc:"BS. Trần Thu", total:284000, bhyt:80, items:5, urgent:true},
    {id:"RX-8802", num:"113", pid:"BN-00201", stat:"chk", ward:"OPD-03", dx:"I25.9 · I10 · E78.5", doc:"BS. Nguyễn Linh", total:186000, bhyt:80, items:4, urgent:false},
    {id:"RX-8803", num:"114", pid:"BN-00142", stat:"pick", ward:"OPD-01", dx:"J06.9 · Viêm đường HH trên", doc:"BS. Phan Quân", total:78000, bhyt:80, items:3, urgent:false},
    {id:"RX-8804", num:"115", pid:"BN-00256", stat:"pick", ward:"OPD-05", dx:"O80 · Thai 36w + THA thai kỳ", doc:"BS. Vũ Lan", total:320000, bhyt:100, items:6, urgent:false},
    {id:"RX-8805", num:"116", pid:"BN-00189", stat:"wait", ward:"OPD-02", dx:"J20.9 · Viêm phế quản cấp", doc:"BS. Đỗ Hưng", total:142000, bhyt:80, items:4, urgent:false},
    {id:"RX-8806", num:"117", pid:"BN-00166", stat:"wait", ward:"OPD-04", dx:"M17.1 · Thoái hoá khớp gối", doc:"BS. Lê Anh", total:96000, bhyt:80, items:3, urgent:false},
    {id:"RX-8807", num:"118", pid:"BN-00234", stat:"done", ward:"OPD-03", dx:"K29.7 · Viêm dạ dày", doc:"BS. Nguyễn Linh", total:58000, bhyt:80, items:2, urgent:false},
  ];
  const [sel, setSel] = usePS("RX-8802");
  const [tab, setTab] = usePS("all");

  const counts = {
    all: queue.length,
    wait: queue.filter(x=>x.stat==="wait").length,
    pick: queue.filter(x=>x.stat==="pick").length,
    chk: queue.filter(x=>x.stat==="chk").length,
    done: queue.filter(x=>x.stat==="done").length,
  };
  const filtered = tab==="all" ? queue : queue.filter(x=>x.stat===tab);

  const sRx = queue.find(x => x.id === sel);
  const p = HIS.patientById(sRx.pid);

  // Rx line items (for selected)
  const items = [
    {nm:"Aspirin 81mg", code:"VN-12800-04", dose:"Uống 1 viên × sáng sau ăn", days:30, qty:30, unit:"viên", price:42000, done:true},
    {nm:"Atorvastatin 20mg", code:"VN-13301-22", dose:"Uống 1 viên × tối sau ăn", days:30, qty:30, unit:"viên", price:72000, done:true},
    {nm:"Bisoprolol 2.5mg", code:"VN-16800-11", dose:"Uống 1 viên × sáng", days:30, qty:30, unit:"viên", price:48000, done:false, alert:"Kiểm tra mạch < 55 ngưng"},
    {nm:"Metformin 500mg", code:"VN-11720-16", dose:"Uống 1 viên × 2 lần/ngày", days:30, qty:60, unit:"viên", price:24000, done:false, sub:true, subReason:"Hết lô 25103 — thay lô 25109 (cùng hoạt chất)"},
  ];
  const subtotal = items.reduce((s,i) => s+i.price, 0);
  const bhytPct = sRx.bhyt;
  const bhytAmt = Math.round(subtotal * bhytPct/100);
  const patientAmt = subtotal - bhytAmt;

  return (
    <div className="rx-wrap">
      <div className="rx-top">
        <div className="rx-kpi"><div className="l">Hàng chờ</div><div className="v">{queue.filter(x=>x.stat!=="done").length}</div></div>
        <div className="rx-kpi crit"><div className="l">Khẩn · ưu tiên</div><div className="v">{queue.filter(x=>x.urgent).length}</div></div>
        <div className="rx-kpi warn"><div className="l">Lấy thuốc</div><div className="v">{counts.pick}</div></div>
        <div className="rx-kpi"><div className="l">Kiểm lại</div><div className="v">{counts.chk}</div></div>
        <div className="rx-kpi ok"><div className="l">Đã giao hôm nay</div><div className="v">186</div></div>
        <div className="rx-kpi"><div className="l">TB thời gian</div><div className="v">7<small style={{fontSize:11,color:"var(--t-3)",fontWeight:400}}>ph</small></div></div>
        <div className="rx-kpi warn"><div className="l">Thuốc sắp hết</div><div className="v">12</div></div>
        <div className="rx-kpi crit"><div className="l">Quá hạn</div><div className="v">2</div></div>
      </div>

      <div className="rx-body">
        {/* Queue */}
        <div className="rx-queue">
          <div className="rx-toolbar">
            <div className="rx-seg">
              <div className={"rx-seg-i " + (tab==="all"?"on":"")} onClick={()=>setTab("all")}>Tất cả<span className="n">{counts.all}</span></div>
              <div className={"rx-seg-i " + (tab==="wait"?"on":"")} onClick={()=>setTab("wait")}>Chờ<span className="n">{counts.wait}</span></div>
              <div className={"rx-seg-i " + (tab==="pick"?"on":"")} onClick={()=>setTab("pick")}>Lấy<span className="n">{counts.pick}</span></div>
              <div className={"rx-seg-i " + (tab==="chk"?"on":"")} onClick={()=>setTab("chk")}>Kiểm<span className="n">{counts.chk}</span></div>
              <div className={"rx-seg-i " + (tab==="done"?"on":"")} onClick={()=>setTab("done")}>Xong<span className="n">{counts.done}</span></div>
            </div>
            <div style={{flex:1}}/>
            <input type="text" placeholder="Quét mã đơn / CCCD..." style={{height:28,border:"1px solid var(--line)",borderRadius:"var(--r-2)",padding:"0 10px",fontSize:"var(--fs-sm)",width:200}}/>
            <button className="opd-btn-sec" style={{height:28,padding:"0 10px"}}>⎌ Gọi số</button>
          </div>

          {sRx.urgent && (
            <div className="rx-alert-row">
              ⚠ <b>Đơn khẩn CẤP CỨU</b> — bệnh nhân trong khu ICU · ưu tiên phát ngay · hạn 10p
            </div>
          )}

          <div className="rx-list">
            {filtered.map(r => {
              const rp = HIS.patientById(r.pid);
              const label = {wait:"CHỜ",pick:"LẤY",chk:"KIỂM",done:"XONG"}[r.stat];
              return (
                <div key={r.id} className={"rx-row " + (sel===r.id?"sel":"")} onClick={()=>setSel(r.id)}>
                  <div className="num">{r.num}</div>
                  <div>
                    <div className="pname">
                      {r.urgent && <span className="rx-badge urg">KHẨN</span>}
                      <span className={"rx-badge " + r.stat}>{label}</span>
                      {rp.name}
                    </div>
                    <div className="pmeta">
                      <span>BN <b>{r.pid}</b></span>
                      <span>{rp.age}t · {rp.gender==="M"?"Nam":"Nữ"}</span>
                      <span>BHYT <b>{rp.bhytClass}</b></span>
                      <span>· {r.ward}</span>
                      <span>CĐ <b>{r.dx}</b></span>
                      <span>· {r.doc}</span>
                      <span>· {r.items} thuốc</span>
                    </div>
                  </div>
                  <div className="rx-end">
                    <div className="amt">{r.total.toLocaleString("vi-VN")}<span className="cc"> ₫</span></div>
                    <div className="bhyt">BHYT −{r.bhyt}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="rx-detail">
          <div className="rx-detail-h">
            <div className="rx-detail-num">
              <div className="big">#{sRx.num} <small>/ 142</small></div>
              <div style={{flex:1}}/>
              <span className={"rx-badge chk"} style={{padding:"3px 8px",fontSize:11,borderRadius:"var(--r-1)",background:"var(--a-cy-bg)",color:"var(--a-cy)",fontFamily:"var(--font-mono)",letterSpacing:"0.04em"}}>● ĐANG KIỂM</span>
            </div>
            <div className="rx-detail-pt">{p.name}</div>
            <div className="rx-detail-meta">
              <span><b>{p.id}</b></span>
              <span>{p.age}t · {p.gender==="M"?"Nam":"Nữ"}</span>
              <span>BHYT <b>{p.bhytClass}</b> · {p.bhyt}</span>
              <span>SĐT {p.phone}</span>
              <span>Dị ứng: <b style={{color:"var(--s-crit)"}}>Aspirin, Sulfa</b></span>
            </div>
            <div className="rx-dx">
              <div className="lbl">Chẩn đoán</div>
              <div>I25.9 · I10 · E78.5 — BTMM mạn · THA độ 2 · RLLM</div>
            </div>
          </div>

          <div className="rx-detail-body">
            {items.map((it, i) => (
              <div key={i} className={"rx-item " + (it.done?"done":"") + (it.sub?" sub":"")}>
                <div className="idx">{i+1}</div>
                <div>
                  <div className="rx-item-nm">{it.nm}</div>
                  <div className="rx-item-sub">
                    <span className="code">{it.code}</span> · {it.dose}
                    {it.sub && <><br/><span className="alert">⚠ THAY LÔ:</span> {it.subReason}</>}
                    {it.alert && <><br/><span className="alert">ℹ Lưu ý:</span> {it.alert}</>}
                  </div>
                </div>
                <div className="rx-item-qty">
                  {it.qty}<br/>
                  <small>{it.unit} · {it.days}ng</small>
                </div>
                <div className="rx-item-price">{it.price.toLocaleString("vi-VN")} ₫</div>
                <div className="rx-item-check">{it.done?"✓":""}</div>
              </div>
            ))}
          </div>

          <div className="rx-sum">
            <div className="rx-sum-row"><span className="lbl">Tạm tính</span><span className="val">{subtotal.toLocaleString("vi-VN")} ₫</span></div>
            <div className="rx-sum-row pay"><span className="lbl">BHYT đồng chi trả · {bhytPct}%</span><span className="val">− {bhytAmt.toLocaleString("vi-VN")} ₫</span></div>
            <div className="rx-sum-row tot"><span className="lbl">Bệnh nhân phải trả</span><span className="val">{patientAmt.toLocaleString("vi-VN")} ₫</span></div>
          </div>

          <div className="rx-actions">
            <button>In đơn</button>
            <button>Hoàn</button>
            <button className="p">✓ Kiểm xong · Giao thuốc (F10)</button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.RxModule = RxModule;
