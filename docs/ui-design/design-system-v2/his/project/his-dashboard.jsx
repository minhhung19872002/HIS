// HIS Dashboard — clinical overview
const { useState: useDS, useMemo: useDM, useEffect: useDE } = React;

const DashModule = () => {
  const kpis = HIS.reports.daily;
  const er = HIS.erQueue;
  const opd = HIS.queue;
  const beds = HIS.wards.flatMap(w => w.rooms.flatMap(r => r.beds));
  const bedOcc = beds.filter(b => b.status === "occupied").length;
  const bedTotal = beds.length;
  const critical = beds.filter(b => b.severity === "critical").length;

  return (
    <div className="his-content" style={{padding: 14}}>
      {/* Top metrics strip */}
      <div className="dash-top">
        {kpis.map((k, i) => <KpiCard key={i} k={k}/>)}
      </div>

      {/* Main 3-col grid */}
      <div className="dash-grid">
        <div className="dash-col">
          <ErSnapshot rows={er}/>
          <OpdFlow rows={opd}/>
        </div>
        <div className="dash-col">
          <BedMapMini beds={beds} occ={bedOcc} total={bedTotal} critical={critical}/>
          <OrBoard/>
          <PharmacyAlerts/>
        </div>
        <div className="dash-col">
          <ShiftBoard/>
          <AlertsPanel/>
          <BhytCard/>
        </div>
      </div>
    </div>
  );
};

// ============== KPI CARD ==============
const KpiCard = ({ k }) => {
  const upish = k.delta && k.delta.startsWith("+");
  const downish = k.delta && k.delta.startsWith("-");
  const negSpark = k.k.includes("chờ");
  const color = (upish && !negSpark) || (downish && negSpark) ? "#16a34a"
              : (downish && !negSpark) || (upish && negSpark) ? "#dc2626" : "#64748b";
  const max = Math.max(...k.spark);
  const min = Math.min(...k.spark);
  const w = 100, h = 28;
  const pts = k.spark.map((v, i) => {
    const x = (i / (k.spark.length - 1)) * w;
    const y = h - ((v - min) / ((max - min) || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="kpi">
      <div className="kpi-lbl">{k.k}</div>
      <div className="kpi-row">
        <div className="kpi-val tab-num">{k.v}</div>
        <div className="kpi-delta mono" style={{color}}>{k.delta}</div>
      </div>
      <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/>
        <polyline points={`${pts} ${w},${h} 0,${h}`} fill={color} opacity="0.08"/>
      </svg>
    </div>
  );
};

// ============== ER ==============
const ErSnapshot = ({ rows }) => {
  const esi1 = rows.filter(r => r.ess === "ESI-1").length;
  const esi2 = rows.filter(r => r.ess === "ESI-2").length;
  const esi3plus = rows.filter(r => !["ESI-1","ESI-2"].includes(r.ess)).length;
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Cấp cứu · <b>trực</b></span>
        <span className="sub">· {rows.length} BN đang có mặt</span>
        <div className="actions">
          <a href="ER.html" className="btn sm">Mở triage →</a>
        </div>
      </div>
      <div className="panel-body pad">
        <div className="er-chips">
          <span className="er-chip crit"><b>{esi1}</b><span>ESI-1 Hồi sức</span></span>
          <span className="er-chip crit"><b>{esi2}</b><span>ESI-2 Khẩn</span></span>
          <span className="er-chip warn"><b>{esi3plus}</b><span>ESI 3–5</span></span>
        </div>
        <table className="tbl" style={{marginTop: 10}}>
          <thead><tr>
            <th>ESI</th><th>Bệnh nhân</th><th>Triệu chứng</th><th>Phòng</th><th className="num">SpO₂</th>
          </tr></thead>
          <tbody>
            {rows.slice(0, 5).map(r => {
              const p = HIS.patientById(r.pid);
              const critChip = r.ess === "ESI-1" || r.ess === "ESI-2" ? "crit" : r.ess === "ESI-3" ? "warn" : "info";
              return (
                <tr key={r.id}>
                  <td><span className={"chip " + critChip}>{r.ess}</span></td>
                  <td><b style={{fontWeight:600}}>{p ? p.name : "—"}</b><div style={{color:"#64748b",fontSize:10,fontFamily:"var(--font-mono)"}}>{r.arrived} · {r.pid}</div></td>
                  <td style={{whiteSpace:"normal",color:"#334155",fontSize:12}}>{r.complaint}</td>
                  <td className="mono">{r.room}</td>
                  <td className="num" style={{color: r.vitals.spo2 < 95 ? "#dc2626" : "#0f172a"}}>{r.vitals.spo2}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============== OPD FLOW ==============
const OpdFlow = ({ rows }) => {
  const waiting = rows.filter(r => r.status === "waiting").length;
  const inprog = rows.filter(r => r.status === "in-progress").length;
  const labs = rows.filter(r => r.status === "labs").length;
  const imaging = rows.filter(r => r.status === "imaging").length;
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Luồng <b>khám bệnh</b></span>
        <span className="sub">· 07:00 — hiện tại</span>
        <div className="actions">
          <a href="OPD.html" className="btn sm">Mở OPD →</a>
        </div>
      </div>
      <div className="panel-body pad">
        <div className="flow">
          <div className="flow-step"><div className="flow-v">{waiting}</div><div className="flow-l">Chờ khám</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step"><div className="flow-v">{inprog}</div><div className="flow-l">Đang khám</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step"><div className="flow-v">{labs}</div><div className="flow-l">Chờ XN</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step"><div className="flow-v">{imaging}</div><div className="flow-l">Chờ CĐHA</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step done"><div className="flow-v">94</div><div className="flow-l">Xong</div></div>
        </div>
        <div className="opd-depts">
          {[
            { d: "Nội TQ", n: 74, wait: 18 },
            { d: "Ngoại CT", n: 32, wait: 12 },
            { d: "Sản PK", n: 24, wait: 8 },
            { d: "Mắt", n: 18, wait: 22 },
            { d: "Nhi", n: 28, wait: 26 },
            { d: "RHM", n: 11, wait: 6 },
          ].map(d => (
            <div key={d.d} className="dept-row">
              <span className="dept-n">{d.d}</span>
              <div className="dept-bar">
                <div className="dept-bar-fill" style={{width: (d.n / 80 * 100) + "%", background: d.wait > 20 ? "#d97706" : "#2563eb"}}/>
              </div>
              <span className="dept-v mono">{d.n}</span>
              <span className="dept-w mono" style={{color: d.wait > 20 ? "#d97706" : "#64748b"}}>{d.wait}p</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============== BED MAP MINI ==============
const BedMapMini = ({ beds, occ, total, critical }) => {
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Nội trú · <b>bed map</b></span>
        <span className="sub">· {occ}/{total} giường</span>
        <div className="actions">
          <a href="Ward.html" className="btn sm">Mở ward →</a>
        </div>
      </div>
      <div className="panel-body pad">
        <div className="bed-grid">
          {beds.map((b, i) => {
            const cls = b.status === "free" ? "free" : b.status === "cleaning" ? "clean" : b.status === "reserved" ? "res"
                      : b.severity === "critical" ? "crit" : b.severity === "monitoring" ? "warn" : "occ";
            return <div key={i} className={"bed " + cls} title={b.n + " · " + b.status}></div>;
          })}
        </div>
        <div className="bed-legend">
          <span><span className="sw occ"/>Điều trị <b>{occ - critical - beds.filter(b=>b.severity==="monitoring").length}</b></span>
          <span><span className="sw warn"/>Theo dõi <b>{beds.filter(b=>b.severity==="monitoring").length}</b></span>
          <span><span className="sw crit"/>Nguy kịch <b>{critical}</b></span>
          <span><span className="sw free"/>Trống <b>{beds.filter(b=>b.status==="free").length}</b></span>
          <span><span className="sw clean"/>Vệ sinh</span>
          <span><span className="sw res"/>Đặt trước</span>
        </div>
      </div>
    </div>
  );
};

// ============== OR ==============
const OrBoard = () => {
  const rows = HIS.orSchedule;
  const doing = rows.filter(r => r.status === "in-progress").length;
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Phòng mổ · <b>hôm nay</b></span>
        <span className="sub">· {doing}/4 đang mổ · {rows.length} ca</span>
        <div className="actions">
          <a href="OR.html" className="btn sm">Mở lịch →</a>
        </div>
      </div>
      <div className="panel-body pad">
        {HIS.orRooms.map(or => {
          const items = rows.filter(r => r.or === or);
          return (
            <div key={or} className="or-row">
              <div className="or-lbl mono">{or}</div>
              <div className="or-track">
                {items.map((it, i) => {
                  const [sh, sm] = it.start.split(":").map(Number);
                  const [eh, em] = it.end.split(":").map(Number);
                  const startM = (sh - 7) * 60 + sm;
                  const endM = (eh - 7) * 60 + em;
                  const totalM = 10 * 60;
                  const left = (startM / totalM) * 100;
                  const width = ((endM - startM) / totalM) * 100;
                  const p = HIS.patientById(it.pid);
                  const stColor = it.status === "done" ? "#f1f5f9" : it.status === "in-progress" ? "#eff5ff" : "#fffbeb";
                  const stBorder = it.status === "done" ? "#e4e9f0" : it.status === "in-progress" ? "#bfd3fa" : "#fde68a";
                  const stText = it.status === "done" ? "#64748b" : it.status === "in-progress" ? "#1d4ed8" : "#a16207";
                  return (
                    <div key={i} className="or-slot" style={{left: left+"%", width: width+"%", background: stColor, borderColor: stBorder, color: stText}}>
                      <span className="mono" style={{fontSize:9}}>{it.start}</span>
                      <span style={{fontSize:10,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.proc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="or-axis">
          {["7","8","9","10","11","12","13","14","15","16","17"].map(h => <span key={h}>{h}h</span>)}
        </div>
      </div>
    </div>
  );
};

// ============== PHARMACY ALERTS ==============
const PharmacyAlerts = () => {
  const rx = HIS.rxPending;
  const pending = rx.filter(r => r.status === "pending").length;
  const lowStock = HIS.inventory.filter(i => i.stock < i.reorder).slice(0, 3);
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Dược · <b>{pending} đơn chờ</b></span>
        <div className="actions">
          <a href="Pharmacy.html" className="btn sm">Mở →</a>
        </div>
      </div>
      <div className="panel-body" style={{padding: "8px 14px 10px"}}>
        <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"#64748b",margin:"4px 0",letterSpacing:"0.06em"}}>TỒN KHO THẤP</div>
        {lowStock.map(i => (
          <div key={i.id} className="stock-row">
            <span className="stock-n">{i.name}</span>
            <span className="mono" style={{color:"#dc2626"}}>{i.stock.toLocaleString("vi-VN")} {i.unit}</span>
            <span className="mono" style={{color:"#94a3b8",fontSize:10}}>min {i.reorder.toLocaleString("vi-VN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== SHIFT ==============
const ShiftBoard = () => {
  const onDuty = HIS.staff.filter(s => s.onDuty);
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Ca trực · <b>sáng</b></span>
        <span className="sub">· {onDuty.length} người</span>
        <div className="actions">
          <a href="Schedule.html" className="btn sm">Rota →</a>
        </div>
      </div>
      <div className="panel-body" style={{padding: "4px 0"}}>
        {onDuty.slice(0, 7).map(s => (
          <div key={s.id} className="staff-row">
            <div className="staff-av" style={{background: s.role.includes("Bác sĩ") || s.role.includes("Trưởng khoa") ? "#eff5ff" : s.role.includes("Điều") ? "#f0fdf4" : s.role.includes("KTV") ? "#fffbeb" : "#f5f3ff", color: s.role.includes("Bác sĩ") || s.role.includes("Trưởng khoa") ? "#2563eb" : s.role.includes("Điều") ? "#15803d" : s.role.includes("KTV") ? "#a16207" : "#6d28d9"}}>
              {s.name.split(" ").slice(-1)[0][0]}
            </div>
            <div className="staff-nm">
              <div className="staff-n">{s.name}</div>
              <div className="staff-r mono">{s.role} · {s.dept}</div>
            </div>
            <span className="chip ok">TRỰC</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== ALERTS ==============
const AlertsPanel = () => {
  const alerts = [
    { t: "crit",  dt: "08:42", who: "BN-00201 Lê Hoàng Cường",  msg: "Troponin I = 0.82 ng/mL (×20 ref) — CT ngực STAT đã chỉ định" },
    { t: "warn",  dt: "08:30", who: "KHO DƯỢC",                   msg: "Omeprazol 20mg còn 580 v (< min 2.000) — đề nghị đặt hàng" },
    { t: "warn",  dt: "08:18", who: "BN-00088 Phạm Văn Khánh",    msg: "SpO₂ 91% · kéo dài 15 phút — đã gọi BS trực" },
    { t: "info",  dt: "08:05", who: "BHYT",                        msg: "Lô hồ sơ T10 · đã gửi 1.248 hồ sơ · chờ duyệt 12" },
    { t: "ok",    dt: "07:50", who: "SAO LƯU",                    msg: "Backup DB hoàn tất · 4.2 GB · lưu tại NAS-02" },
  ];
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Cảnh báo · <b>sự kiện</b></span>
        <div className="actions">
          <button className="btn sm ghost">Xem hết</button>
        </div>
      </div>
      <div className="panel-body" style={{padding: "4px 0"}}>
        {alerts.map((a, i) => (
          <div key={i} className={"alert-row " + a.t}>
            <div className="alert-dt mono">{a.dt}</div>
            <div className="alert-bd">
              <div className="alert-who">{a.who}</div>
              <div className="alert-msg">{a.msg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== BHYT ==============
const BhytCard = () => (
  <div className="panel">
    <div className="panel-h">
      <span className="title">BHYT · <b>giám định</b></span>
    </div>
    <div className="panel-body pad">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <div style={{fontSize:10,color:"#64748b",fontFamily:"var(--font-mono)",letterSpacing:"0.06em"}}>HỒ SƠ T10</div>
          <div style={{fontSize:22,fontWeight:700,color:"#0f172a",fontVariantNumeric:"tabular-nums"}}>1.248</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"#64748b",fontFamily:"var(--font-mono)",letterSpacing:"0.06em"}}>TỶ LỆ DUYỆT</div>
          <div style={{fontSize:22,fontWeight:700,color:"#16a34a",fontVariantNumeric:"tabular-nums"}}>98.2%</div>
        </div>
      </div>
      <div style={{height:6,background:"#f1f5f9",borderRadius:3,overflow:"hidden",display:"flex"}}>
        <div style={{width:"98.2%",background:"#16a34a"}}/>
        <div style={{width:"1.2%",background:"#d97706"}}/>
        <div style={{width:"0.6%",background:"#dc2626"}}/>
      </div>
      <div style={{marginTop:8,display:"flex",justifyContent:"space-between",fontFamily:"var(--font-mono)",fontSize:10,color:"#64748b"}}>
        <span><span style={{color:"#16a34a"}}>■</span> Đạt 1.226</span>
        <span><span style={{color:"#d97706"}}>■</span> Sửa 15</span>
        <span><span style={{color:"#dc2626"}}>■</span> Từ chối 7</span>
      </div>
      <div style={{marginTop:12,padding:"10px 12px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,fontSize:12,color:"#a16207"}}>
        <b>12 hồ sơ cần bổ sung</b> · hạn nộp 25/10 · xem chi tiết trong Viện phí
      </div>
    </div>
  </div>
);

window.DashModule = DashModule;
