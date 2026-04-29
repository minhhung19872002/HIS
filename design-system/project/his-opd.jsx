// HIS OPD — Consultation / Khám bệnh
const { useState: useOS, useMemo: useOM } = React;

const OPDModule = () => {
  const Q = HIS.queue;
  const [sel, setSel] = useOS("BN-00142");
  const [tab, setTab] = useOS("waiting"); // waiting | in | done

  const tabs = [
    { k: "waiting", l: "Chờ khám", n: Q.filter(q => q.status === "waiting").length },
    { k: "in",      l: "Đang khám", n: Q.filter(q => q.status === "in-progress").length },
    { k: "labs",    l: "Chờ KQ",    n: Q.filter(q => ["labs","imaging"].includes(q.status)).length },
    { k: "done",    l: "Đã xong",   n: 23 },
  ];
  const filtered = tab === "waiting" ? Q.filter(q => q.status === "waiting")
                  : tab === "in" ? Q.filter(q => q.status === "in-progress")
                  : tab === "labs" ? Q.filter(q => ["labs","imaging"].includes(q.status))
                  : Q;

  const q = Q.find(x => x.pid === sel) || Q[0];
  const patient = HIS.patientById(q.pid);

  // Orders state
  const [labOrders, setLabOrders] = useOS([
    { code: "23.0501.1701", name: "CTM 20 thông số",     qty: 1 },
    { code: "23.0501.1830", name: "CRP định lượng",       qty: 1 },
    { code: "23.0501.1410", name: "Glucose máu",          qty: 1 },
    { code: "23.0501.2001", name: "Chức năng gan (AST, ALT, Albumin)", qty: 1 },
  ]);
  const [imgOrders, setImgOrders] = useOS([
    { code: "24.0001.0001", name: "Siêu âm ổ bụng tổng quát", qty: 1 },
  ]);
  const [rxOrders, setRxOrders] = useOS([
    { code: "VN-20145-15", name: "Omeprazol 20mg",   dose: "1v × 1 sáng", dur: "14 ngày", qty: 14 },
    { code: "VN-19872-22", name: "Domperidon 10mg",  dose: "1v × 3/ngày", dur: "7 ngày",  qty: 21 },
    { code: "VN-18442-08", name: "Magnesi-Al hydroxyd 400/400", dose: "2v × 3/ngày", dur: "7 ngày", qty: 42 },
  ]);

  const icd = ["K29.7", "K21.9"];
  const vitalsWarn = (key) => {
    if (key === "bp" && parseInt(q.vitals.bp) > 160) return "crit";
    if (key === "bp" && parseInt(q.vitals.bp) > 140) return "warn";
    if (key === "hr" && q.vitals.hr > 100) return "warn";
    if (key === "spo2" && q.vitals.spo2 < 95) return "crit";
    if (key === "spo2" && q.vitals.spo2 < 97) return "warn";
    return "";
  };

  return (
    <div style={{display:"flex", flexDirection:"column", flex:1, minHeight:0}}>
      <div className="opd-grid">
        {/* LEFT — queue */}
        <div className="opd-col">
          <div className="opd-col-h">
            <b>Hàng đợi khám</b>
            <span className="meta">{Q.length} lượt · P.201 Nội TQ</span>
          </div>
          <div className="opd-qtabs">
            {tabs.map(t => (
              <div key={t.k} className={"opd-qtab " + (tab===t.k?"active":"")} onClick={() => setTab(t.k)}>
                {t.l}<span className="n">{t.n}</span>
              </div>
            ))}
          </div>
          <div className="opd-qlist">
            {filtered.map(x => {
              const p = HIS.patientById(x.pid);
              const chip = x.status === "waiting" ? {bg:"var(--d-3)", c:"var(--t-2)", l:"CHỜ"}
                        : x.status === "in-progress" ? {bg:"var(--a-cy-bg)", c:"var(--a-cy)", l:"KHÁM"}
                        : x.status === "labs" ? {bg:"var(--s-warn-bg)", c:"var(--s-warn)", l:"XN"}
                        : {bg:"var(--s-mag-bg)", c:"var(--s-mag)", l:"CĐHA"};
              return (
                <div key={x.pid} className={"opd-qrow " + (sel===x.pid?"sel ":"") + (x.priority==="urgent"?"urgent":"")}
                     onClick={() => setSel(x.pid)}>
                  <div className="tok">{x.token}</div>
                  <div>
                    <div className="nm">{p.name}</div>
                    <div className="sub">{x.arrived} · {p.age}{p.gender==="M"?"N":"Nữ"} · {p.bhytClass||"—"}</div>
                    <div style={{fontSize:"var(--fs-xs)",color:"var(--t-1)",marginTop:2}}>{x.reason}</div>
                  </div>
                  <div className="stat" style={{background:chip.bg, color:chip.c}}>
                    {x.priority === "urgent" && <div style={{color:"var(--s-crit)",fontWeight:600,fontSize:9}}>● KHẨN</div>}
                    {chip.l}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — consult pane */}
        <div className="opd-col" style={{padding:0}}>
          {patient.allergy.length > 0 && (
            <div className="opd-banner">
              <Ico name="alert" size={16}/>
              DỊ ỨNG: {patient.allergy.join(", ")} · Cân nhắc kỹ khi kê đơn kháng sinh
            </div>
          )}

          <div className="opd-patient-bar">
            <div className="opd-pb-main">
              <div className="opd-pb-avatar">{patient.name.split(" ").slice(-1)[0][0]}</div>
              <div>
                <div className="opd-pb-name">{patient.name} · <span style={{color:"var(--t-2)",fontWeight:400,fontSize:14}}>{patient.id}</span></div>
                <div className="opd-pb-meta">
                  <span>{patient.age} tuổi · {patient.gender === "M" ? "Nam" : "Nữ"}</span>
                  <span>BHYT <b>{patient.bhyt}</b></span>
                  <span>Nhóm máu <b>{patient.bloodType}</b></span>
                  <span>Khám lúc <b>{q.arrived}</b></span>
                </div>
              </div>
            </div>
            <div className="opd-pb-actions">
              <button className="opd-btn-sec"><Ico name="folder" size={14}/> EMR đầy đủ</button>
              <button className="opd-btn-sec">⎙ In tóm tắt</button>
            </div>
          </div>

          <div className="opd-vitals">
            <div className={"opd-vital " + vitalsWarn("bp")}>
              <div className="lbl">Huyết áp</div>
              <div className="v">{q.vitals.bp}<small>mmHg</small></div>
            </div>
            <div className={"opd-vital " + vitalsWarn("hr")}>
              <div className="lbl">Mạch</div>
              <div className="v">{q.vitals.hr}<small>lần/p</small></div>
            </div>
            <div className="opd-vital">
              <div className="lbl">Nhiệt độ</div>
              <div className="v">{q.vitals.temp}<small>°C</small></div>
            </div>
            <div className={"opd-vital " + vitalsWarn("spo2")}>
              <div className="lbl">SpO₂</div>
              <div className="v">{q.vitals.spo2}<small>%</small></div>
            </div>
            <div className="opd-vital">
              <div className="lbl">Cân nặng</div>
              <div className="v">68<small>kg</small></div>
            </div>
            <div className="opd-vital">
              <div className="lbl">BMI</div>
              <div className="v">23.5</div>
            </div>
          </div>

          <div className="opd-consult">
            {/* MAIN: SOAP note */}
            <div className="opd-left">
              <div className="opd-soap">
                <div className="opd-soap-sec">
                  <h3>S · Lý do khám / Hỏi bệnh <span className="hint">Chủ quan</span></h3>
                  <div className="opd-note-field">
                    {q.reason}. Bệnh nhân đau vùng thượng vị 3 ngày nay, xuất hiện sau ăn, kèm ợ chua, buồn nôn nhẹ. Không nôn ra máu. Không đi ngoài phân đen. Không sốt. Đã tự uống Omeprazol 1 viên mà chưa đỡ.
                  </div>
                </div>

                <div className="opd-soap-sec">
                  <h3>O · Thăm khám lâm sàng <span className="hint">Khách quan</span></h3>
                  <div className="opd-note-field">
                    Toàn trạng: Tỉnh, tiếp xúc tốt. Da, niêm mạc hồng.
                    Tim: Nhịp đều 84 l/p, T1 T2 rõ, không tiếng thổi.
                    Phổi: Rì rào phế nang đều 2 bên.
                    Bụng: Mềm, ấn đau vùng thượng vị, không có phản ứng thành bụng. Gan lách không to.
                  </div>
                </div>

                <div className="opd-soap-sec">
                  <h3>A · Chẩn đoán <span className="hint">ICD-10</span></h3>
                  <div className="opd-icd-row">
                    {icd.map(c => {
                      const name = c === "K29.7" ? "Viêm dạ dày cấp" : c === "K21.9" ? "GERD không biến chứng" : c;
                      return (
                        <span key={c} className="opd-icd-chip">
                          <span>{c}</span>
                          <b>{name}</b>
                          <span className="x">×</span>
                        </span>
                      );
                    })}
                    <span className="opd-icd-add">+ Thêm ICD-10</span>
                  </div>
                </div>

                <div className="opd-soap-sec">
                  <h3>P · Kế hoạch điều trị <span className="hint">Chỉ định + Kê đơn</span></h3>

                  <div className="opd-orders">
                    <div className="opd-ord-card">
                      <h4>Xét nghiệm <span className="q">{labOrders.length} chỉ định</span></h4>
                      <div className="opd-ord-list">
                        {labOrders.map((o,i) => (
                          <div key={i} className="opd-ord-item">
                            <span><b>{o.name}</b> · <span className="code">{o.code}</span></span>
                            <span className="code">×{o.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div className="opd-ord-add">+ Thêm XN · F6</div>
                    </div>

                    <div className="opd-ord-card">
                      <h4>Chẩn đoán hình ảnh <span className="q">{imgOrders.length} chỉ định</span></h4>
                      <div className="opd-ord-list">
                        {imgOrders.map((o,i) => (
                          <div key={i} className="opd-ord-item">
                            <span><b>{o.name}</b> · <span className="code">{o.code}</span></span>
                            <span className="code">×{o.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div className="opd-ord-add">+ Thêm CĐHA · F7</div>
                    </div>

                    <div className="opd-ord-card" style={{gridColumn:"span 2"}}>
                      <h4>Đơn thuốc (Thông tư 52) <span className="q">{rxOrders.length} khoản · {rxOrders.reduce((s,r)=>s+r.qty,0)} đơn vị</span></h4>
                      <div className="opd-ord-list">
                        {rxOrders.map((r,i) => (
                          <div key={i} className="opd-ord-item" style={{gridTemplateColumns:"1fr auto"}}>
                            <span>
                              <b>{i+1}. {r.name}</b> · <span className="code">{r.code}</span><br/>
                              <span style={{fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>{r.dose} · {r.dur}</span>
                            </span>
                            <span className="code">SL: {r.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div className="opd-ord-add">+ Thêm thuốc · F8</div>
                    </div>
                  </div>

                  <div style={{marginTop:14}}>
                    <h3 style={{marginBottom:6, display:"block"}}><span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--t-2)"}}>Lời dặn cho BN</span></h3>
                    <textarea defaultValue={"Ăn nhẹ, tránh đồ cay, chua, cà phê, rượu bia. Uống thuốc đúng giờ, sau ăn 30 phút.\nTái khám sau 7 ngày hoặc khi có dấu hiệu bất thường (nôn máu, đi ngoài phân đen, đau dữ dội).\nLiên hệ ngay với BS khi có bất cứ triệu chứng bất thường nào."} style={{minHeight:70}}/>
                  </div>
                </div>
              </div>

              <div className="opd-actions">
                <div style={{display:"flex",gap:6,fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>
                  <span>Đã nhập: S ✓  O ✓  A ✓  P ✓</span>
                  <span>·</span>
                  <span>Tự lưu 00:12</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button className="opd-btn-sec">Lưu nháp</button>
                  <button className="opd-btn-warn opd-btn-sec">Chuyển khoa</button>
                  <button className="opd-btn-primary">
                    HOÀN TẤT KHÁM & GỬI ĐƠN
                    <span className="kbd">F2</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: summary / history */}
            <div className="opd-right" style={{borderLeft:"1px solid var(--line)"}}>
              <div className="opd-right-h">
                <b style={{fontSize:"var(--fs-md)"}}>Tóm tắt & Lịch sử</b>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",color:"var(--t-3)"}}>F4 mở rộng</span>
              </div>
              <div className="opd-right-body">
                {patient.allergy.length > 0 && (
                  <div className="opd-alert">
                    <h5>⚠ Cảnh báo dị ứng</h5>
                    {patient.allergy.map(a => <div key={a} className="a-item">• {a}</div>)}
                  </div>
                )}

                <div className="opd-vitals-spark">
                  <h5>Huyết áp — 7 lần gần nhất</h5>
                  <svg viewBox="0 0 280 60" style={{width:"100%",height:50}}>
                    {[{x:0,y:30},{x:40,y:26},{x:80,y:32},{x:120,y:28},{x:160,y:22},{x:200,y:18},{x:240,y:15}].map((p,i,a)=>(
                      i<a.length-1 && <line key={i} x1={p.x+8} y1={p.y} x2={a[i+1].x+8} y2={a[i+1].y} stroke="var(--a-cy)" strokeWidth="2"/>
                    ))}
                    {[30,26,32,28,22,18,15].map((y,i)=>(
                      <circle key={i} cx={i*40+8} cy={y} r="3" fill="var(--a-cy)"/>
                    ))}
                  </svg>
                  <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--font-mono)",fontSize:9,color:"var(--t-3)",marginTop:2}}>
                    <span>12/10: 128/80</span>
                    <span>hôm nay: <b style={{color:"var(--s-warn)"}}>138/92</b></span>
                  </div>
                </div>

                <div className="opd-hist">
                  <h5 style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>3 lần khám gần nhất</h5>
                  <div className="opd-hist-row">
                    <div className="d">12/08/2026 · BS. Linh · Nội TQ</div>
                    <div className="r">THA độ 2 · Rối loạn lipid máu · Cấp Amlodipin 5mg + Atorvastatin 20mg × 30 ngày</div>
                  </div>
                  <div className="opd-hist-row">
                    <div className="d">02/06/2026 · BS. Linh · Nội TQ</div>
                    <div className="r">THA độ 2 · Theo dõi ĐTĐ type 2 · HbA1c 7.2% · Metformin 500mg × 30 ngày</div>
                  </div>
                  <div className="opd-hist-row">
                    <div className="d">15/03/2026 · BS. Thành · Tim mạch</div>
                    <div className="r">Siêu âm tim: EF 62%, không bệnh van tim · ECG: nhịp xoang, không ST-T bất thường</div>
                  </div>
                </div>

                <div>
                  <h5 style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Thuốc đang dùng</h5>
                  <div style={{fontSize:"var(--fs-sm)",color:"var(--t-1)",padding:"6px 10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:"var(--r-2)",marginBottom:4}}>Amlodipin 5mg · 1v sáng (hết ngày 11/11)</div>
                  <div style={{fontSize:"var(--fs-sm)",color:"var(--t-1)",padding:"6px 10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:"var(--r-2)"}}>Atorvastatin 20mg · 1v tối (hết ngày 11/11)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.OPDModule = OPDModule;
