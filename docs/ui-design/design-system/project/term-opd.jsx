// Module: OPD (main focus) + Patient detail drawer
const { useState: useState2, useEffect: useEffect2, useMemo: useMemo2 } = React;

const OPDModule = () => {
  useLang();
  const [selectedPid, setSelectedPid] = useState2("BN-00189");
  const [filter, setFilter] = useState2("all");
  const [searchQ, setSearchQ] = useState2("");

  const filteredQueue = useMemo2(() => {
    let q = HIS_DATA.queue;
    if (filter === "waiting") q = q.filter(x => x.status === "waiting");
    if (filter === "urgent") q = q.filter(x => x.priority === "urgent");
    if (filter === "labs") q = q.filter(x => x.status === "labs");
    if (searchQ) {
      const sq = searchQ.toLowerCase();
      q = q.filter(x => {
        const p = HIS_DATA.patientById(x.pid);
        return p.name.toLowerCase().includes(sq) || x.pid.toLowerCase().includes(sq);
      });
    }
    return q;
  }, [filter, searchQ]);

  const encounter = HIS_DATA.queue.find(q => q.pid === selectedPid);
  const patient = HIS_DATA.patientById(selectedPid);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr 320px", height: "100%", minHeight: 0 }}>
      {/* LEFT: Queue */}
      <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0, background: "var(--d-2)" }}>
        <div className="panel-h" style={{ borderRadius: 0 }}>
          <span className="title">HÀNG CHỜ · <b>{filteredQueue.length}</b></span>
          <span className="actions">
            <button className="btn sm"><Icon name="plus" size={10}/> Thêm</button>
          </span>
        </div>
        <div style={{ padding: 8, borderBottom: "1px solid var(--line)", display: "flex", gap: 6 }}>
          <input className="input" placeholder="Tìm BN, mã…" value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ flex: 1 }}/>
        </div>
        <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)", display: "flex", gap: 4 }}>
          {[{ k: "all", l: "TẤT CẢ" }, { k: "waiting", l: "CHỜ" }, { k: "urgent", l: "ƯU TIÊN" }, { k: "labs", l: "CHỜ CLS" }].map(f => (
            <button key={f.k}
              className="mono up"
              onClick={() => setFilter(f.k)}
              style={{ padding: "3px 8px", borderRadius: 3, fontSize: 10, letterSpacing: "0.08em",
                background: filter === f.k ? "var(--a-cy-bg)" : "transparent",
                color: filter === f.k ? "var(--a-cy)" : "var(--t-3)" }}>
              {f.l}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {filteredQueue.map(q => {
            const p = HIS_DATA.patientById(q.pid);
            const sel = q.pid === selectedPid;
            return (
              <div key={q.pid} onClick={() => setSelectedPid(q.pid)}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--line-hair)",
                  borderLeft: sel ? "2px solid var(--a-cy)" : "2px solid transparent",
                  background: sel ? "var(--a-cy-bg)" : "transparent",
                  cursor: "pointer",
                }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="mono" style={{ fontSize: 11, color: q.priority === "urgent" ? "var(--s-crit)" : "var(--a-cy)" }}>{q.token}</span>
                  <span className="row" style={{ gap: 4 }}>
                    {q.priority === "urgent" && <span className="chip crit">ƯU TIÊN</span>}
                    <span className={`chip ${statusToChip(q.status)}`}>{statusLabel(q.status)}</span>
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--t-0)", marginTop: 4 }}>{p.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", marginTop: 2 }}>
                  {p.id} · {p.age}{p.gender === "M" ? "♂" : "♀"} · đến {q.arrived}
                </div>
                <div style={{ fontSize: 11, color: "var(--t-2)", marginTop: 4 }}>{q.reason}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER: Encounter */}
      <EncounterWorkspace patient={patient} encounter={encounter}/>

      {/* RIGHT: Patient details / history */}
      <PatientSidebar patient={patient} encounter={encounter}/>
    </div>
  );
};

const statusToChip = (s) => ({ waiting: "ghost", "in-progress": "cy", labs: "warn", done: "ok" }[s] || "ghost");
const statusLabel = (s) => ({ waiting: "CHỜ", "in-progress": "KHÁM", labs: "CHỜ CLS", done: "XONG" }[s] || s.toUpperCase());

// ==================== ENCOUNTER WORKSPACE ====================
const EncounterWorkspace = ({ patient, encounter }) => {
  const [tab, setTab] = useState2("exam");
  const [cc, setCC] = useState2("");
  const [dx, setDx] = useState2([{ code: "O09.9", label: "Theo dõi thai kỳ nguy cơ cao - không xác định" }]);
  const [rx, setRx] = useState2([
    { drug: "Acid folic 5mg", dose: "1v × 1 lần/ngày", duration: "30 ngày", qty: 30 },
    { drug: "Canxi + D3 (Calcium-D 500mg/200IU)", dose: "1v × 2 lần/ngày", duration: "30 ngày", qty: 60 },
  ]);
  const [orders, setOrders] = useState2([
    { kind: "US", label: "Siêu âm sản 2D", status: "in-progress", acc: "ACC-88710" },
    { kind: "LAB", label: "CTM + Tổng phân tích nước tiểu", status: "pending", acc: "XN-2026-4420" },
  ]);
  const [newDrug, setNewDrug] = useState2("");

  if (!patient) return <div style={{ padding: 24, color: "var(--t-3)" }}>Chưa chọn bệnh nhân.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--d-1)" }}>
      {/* Patient banner */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--d-0)", display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <div className="mono up" style={{ fontSize: 9, color: "var(--t-3)" }}>ENCOUNTER · ENC-{encounter?.token}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
            <span className="serif" style={{ fontSize: 22 }}>{patient.name}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--t-2)" }}>
              {patient.id} · {patient.age}{patient.gender === "M" ? "♂" : "♀"} · {patient.bloodType}
            </span>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            <span className="chip">{patient.insurance}</span>
            {patient.allergy.length > 0 && (
              <span className="chip crit"><Icon name="alert" size={10}/> DỊ ỨNG: {patient.allergy.join(", ").toUpperCase()}</span>
            )}
            {encounter?.priority === "urgent" && <span className="chip crit">ƯU TIÊN</span>}
          </div>
        </div>
        <div className="spacer" style={{ flex: 1 }}/>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn"><Icon name="printer" size={12}/> In</button>
          <button className="btn danger"><Icon name="x" size={12}/> Huỷ khám</button>
          <button className="btn primary"><Icon name="check" size={12}/> Kết thúc khám</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div className={"tab " + (tab === "exam" ? "active" : "")} onClick={() => setTab("exam")}>KHÁM LÂM SÀNG</div>
        <div className={"tab " + (tab === "dx" ? "active" : "")} onClick={() => setTab("dx")}>CHẨN ĐOÁN <span className="n">{dx.length}</span></div>
        <div className={"tab " + (tab === "rx" ? "active" : "")} onClick={() => setTab("rx")}>ĐƠN THUỐC <span className="n">{rx.length}</span></div>
        <div className={"tab " + (tab === "orders" ? "active" : "")} onClick={() => setTab("orders")}>CHỈ ĐỊNH CLS <span className="n">{orders.length}</span></div>
        <div className={"tab " + (tab === "notes" ? "active" : "")} onClick={() => setTab("notes")}>GHI CHÚ</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "exam" && <ExamTab cc={cc} setCC={setCC} encounter={encounter}/>}
        {tab === "dx" && <DxTab dx={dx} setDx={setDx}/>}
        {tab === "rx" && <RxTab rx={rx} setRx={setRx} newDrug={newDrug} setNewDrug={setNewDrug}/>}
        {tab === "orders" && <OrdersTab orders={orders} setOrders={setOrders}/>}
        {tab === "notes" && <div className="ph" style={{ minHeight: 200 }}>NOTES · rich-text</div>}
      </div>
    </div>
  );
};

const ExamTab = ({ cc, setCC, encounter }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
    <div className="col">
      <label className="label">LÝ DO KHÁM</label>
      <textarea className="input mono" style={{ height: 64, padding: 8, resize: "none" }}
        defaultValue={encounter?.reason || ""} onChange={e => setCC(e.target.value)}/>

      <label className="label" style={{ marginTop: 12 }}>TIỀN SỬ BỆNH</label>
      <textarea className="input mono" style={{ height: 80, padding: 8, resize: "none" }}
        defaultValue="Thai lần 1, 28 tuần. Không THA, không ĐTĐ. Khám thai định kỳ đủ 4 lần."/>

      <label className="label" style={{ marginTop: 12 }}>KHÁM TOÀN TRẠNG</label>
      <textarea className="input mono" style={{ height: 100, padding: 8, resize: "none" }}
        defaultValue="Tỉnh, tiếp xúc tốt. Da niêm hồng. Không phù. Tim đều, phổi trong. Bụng mềm, tử cung BCTC 24cm, tim thai 142 lần/phút đều."/>
    </div>

    <div className="col">
      <label className="label">SINH HIỆU</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricInput label="Mạch" value="78" unit="L/p"/>
        <MetricInput label="Huyết áp" value="118/76" unit="mmHg"/>
        <MetricInput label="Nhiệt độ" value="36.8" unit="°C"/>
        <MetricInput label="SpO₂" value="99" unit="%"/>
        <MetricInput label="Cân nặng" value="62" unit="kg"/>
        <MetricInput label="BCTC" value="24" unit="cm"/>
      </div>

      <label className="label" style={{ marginTop: 16 }}>BIỂU ĐỒ SINH HIỆU · 30 NGÀY</label>
      <div className="chart-grid" style={{ height: 140, borderRadius: 6, border: "1px solid var(--line)", position: "relative", overflow: "hidden" }}>
        <svg viewBox="0 0 400 140" width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
          <polyline fill="none" stroke="var(--a-cy)" strokeWidth="1.5"
            points="10,90 40,82 70,88 100,75 130,78 160,70 190,72 220,65 250,70 280,60 310,65 340,55 370,58"/>
          <polyline fill="none" stroke="var(--s-warn)" strokeWidth="1.5" strokeDasharray="3 2"
            points="10,110 40,108 70,112 100,105 130,106 160,100 190,105 220,98 250,100 280,95 310,98 340,92 370,95"/>
        </svg>
        <div className="mono" style={{ position: "absolute", bottom: 4, right: 6, fontSize: 9, color: "var(--t-3)" }}>
          <span style={{ color: "var(--a-cy)" }}>● HR</span>  <span style={{ color: "var(--s-warn)", marginLeft: 6 }}>● TEMP</span>
        </div>
      </div>
    </div>
  </div>
);

const MetricInput = ({ label, value, unit }) => (
  <div>
    <label className="label">{label}</label>
    <div className="row" style={{ gap: 0 }}>
      <input className="input mono" defaultValue={value} style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}/>
      <span className="mono" style={{ padding: "0 8px", height: 26, display: "grid", placeItems: "center", border: "1px solid var(--line)", borderLeft: 0, background: "var(--d-3)", color: "var(--t-3)", fontSize: 10, borderTopRightRadius: 4, borderBottomRightRadius: 4 }}>
        {unit}
      </span>
    </div>
  </div>
);

const DxTab = ({ dx, setDx }) => (
  <div>
    <div className="row" style={{ marginBottom: 10 }}>
      <button className="btn primary"><Icon name="plus" size={12}/> Thêm chẩn đoán</button>
      <span className="mono" style={{ fontSize: 11, color: "var(--t-3)", marginLeft: 12 }}>ICD-10</span>
    </div>
    <table className="tbl">
      <thead><tr><th style={{ width: 80 }}>MÃ</th><th>TÊN CHẨN ĐOÁN</th><th style={{ width: 100 }}>LOẠI</th><th style={{ width: 40 }}></th></tr></thead>
      <tbody>
        {dx.map((d, i) => (
          <tr key={i}>
            <td className="mono"><span className="chip cy">{d.code}</span></td>
            <td>{d.label}</td>
            <td><span className="chip">Chính</span></td>
            <td style={{ textAlign: "right" }}><button className="btn ghost sm icon"><Icon name="x" size={11}/></button></td>
          </tr>
        ))}
        <tr><td className="mono">J06.9</td><td className="muted">Nhiễm khuẩn hô hấp trên cấp, KXĐ</td><td><span className="chip ghost">Phụ</span></td><td style={{ textAlign: "right" }}><button className="btn ghost sm icon"><Icon name="x" size={11}/></button></td></tr>
      </tbody>
    </table>
  </div>
);

const RxTab = ({ rx, setRx, newDrug, setNewDrug }) => (
  <div>
    <div className="row" style={{ marginBottom: 10, gap: 6 }}>
      <input className="input" placeholder="Tìm thuốc theo tên hoạt chất hoặc biệt dược…" value={newDrug} onChange={e => setNewDrug(e.target.value)} style={{ flex: 1 }}/>
      <button className="btn primary"
        onClick={() => { if (newDrug.trim()) { setRx([...rx, { drug: newDrug, dose: "1v × 2/ngày", duration: "7 ngày", qty: 14 }]); setNewDrug(""); } }}>
        <Icon name="plus" size={12}/> Kê đơn
      </button>
      <button className="btn"><Icon name="pill" size={12}/> Toa mẫu</button>
    </div>
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: 30 }}>#</th>
          <th>THUỐC</th>
          <th>LIỀU DÙNG</th>
          <th>ĐỢT</th>
          <th className="num">SL</th>
          <th className="num">ĐƠN GIÁ</th>
          <th className="num">THÀNH TIỀN</th>
          <th style={{ width: 40 }}></th>
        </tr>
      </thead>
      <tbody>
        {rx.map((r, i) => {
          const unitPrice = [4_500, 2_800, 12_000, 8_500][i % 4];
          return (
            <tr key={i}>
              <td className="mono dim">{String(i + 1).padStart(2, "0")}</td>
              <td>{r.drug}</td>
              <td className="mono">{r.dose}</td>
              <td className="mono">{r.duration}</td>
              <td className="num">{r.qty}</td>
              <td className="num">{unitPrice.toLocaleString()}</td>
              <td className="num">{(unitPrice * r.qty).toLocaleString()}</td>
              <td style={{ textAlign: "right" }}>
                <button className="btn ghost sm icon" onClick={() => setRx(rx.filter((_, j) => j !== i))}>
                  <Icon name="x" size={11}/>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="6" style={{ textAlign: "right", color: "var(--t-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}>TỔNG CỘNG</td>
          <td className="num mono" style={{ color: "var(--a-cy)", fontSize: 13 }}>
            {(rx.reduce((s, r, i) => s + r.qty * [4_500, 2_800, 12_000, 8_500][i % 4], 0)).toLocaleString()} ₫
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
);

const OrdersTab = ({ orders, setOrders }) => (
  <div>
    <div className="row" style={{ marginBottom: 10, gap: 6 }}>
      <button className="btn primary"><Icon name="plus" size={12}/> Chỉ định mới</button>
      <div className="seg" style={{ height: 26 }}>
        <button className="active">CĐHA</button>
        <button>XÉT NGHIỆM</button>
        <button>THỦ THUẬT</button>
      </div>
    </div>
    <table className="tbl">
      <thead><tr><th style={{ width: 60 }}>LOẠI</th><th>TÊN DỊCH VỤ</th><th>MÃ</th><th>TRẠNG THÁI</th><th style={{ width: 120 }}>HÀNH ĐỘNG</th></tr></thead>
      <tbody>
        {orders.map((o, i) => (
          <tr key={i}>
            <td><span className={`chip ${o.kind === "US" || o.kind === "CT" || o.kind === "MRI" ? "mag" : "info"}`}>{o.kind}</span></td>
            <td>{o.label}</td>
            <td className="mono">{o.acc}</td>
            <td>
              {o.status === "in-progress" && <span className="chip cy"><span className="dot cy"/> Đang thực hiện</span>}
              {o.status === "pending" && <span className="chip ghost">Chờ lấy mẫu</span>}
              {o.status === "done" && <span className="chip ok">Hoàn tất</span>}
            </td>
            <td>
              <button className="btn sm"><Icon name="eye" size={10}/> Xem</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ==================== PATIENT SIDEBAR ====================
const PatientSidebar = ({ patient, encounter }) => {
  if (!patient) return <div></div>;
  return (
    <div style={{ borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0, background: "var(--d-2)", overflow: "auto" }}>
      <div className="panel-h" style={{ borderRadius: 0 }}>
        <span className="title">THÔNG TIN BN</span>
      </div>
      <div style={{ padding: 14 }}>
        <div className="label">Liên hệ</div>
        <KV k="Điện thoại" v={patient.phone}/>
        <KV k="Địa chỉ" v={patient.address}/>

        <div className="hline" style={{ margin: "12px 0" }}/>
        <div className="label">Y tế</div>
        <KV k="Nhóm máu" v={patient.bloodType}/>
        <KV k="Bảo hiểm" v={patient.insurance}/>
        <KV k="Dị ứng" v={patient.allergy.length ? patient.allergy.join(", ") : "— Không —"} warn={patient.allergy.length > 0}/>
      </div>

      <div className="hline"/>
      <div style={{ padding: "10px 14px 6px" }} className="label">LẦN KHÁM GẦN ĐÂY</div>
      <div style={{ padding: "0 14px 14px" }}>
        <HistoryRow date="02/04/26" dr="BS Linh" dx="Viêm họng cấp" rx="3 thuốc"/>
        <HistoryRow date="11/03/26" dr="BS Linh" dx="Khám thai 24w" rx="2 thuốc"/>
        <HistoryRow date="15/02/26" dr="BS Hà" dx="Khám thai 20w" rx="2 thuốc"/>
        <HistoryRow date="18/01/26" dr="BS Hà" dx="Khám thai 16w" rx="1 thuốc"/>
      </div>

      <div className="hline"/>
      <div style={{ padding: "10px 14px 6px" }} className="label">CHỈ SỐ CƠ BẢN</div>
      <div style={{ padding: "0 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MiniStat label="HA TB" value="118/76" unit="mmHg"/>
        <MiniStat label="HR TB" value="76" unit="bpm"/>
        <MiniStat label="BMI" value="22.1" unit=""/>
        <MiniStat label="HbA1c" value="5.2" unit="%"/>
      </div>
    </div>
  );
};

const KV = ({ k, v, warn }) => (
  <div style={{ display: "grid", gridTemplateColumns: "86px 1fr", gap: 8, padding: "3px 0", fontSize: 12 }}>
    <span className="mono" style={{ color: "var(--t-3)", fontSize: 11 }}>{k}</span>
    <span style={{ color: warn ? "var(--s-crit)" : "var(--t-0)" }}>{v}</span>
  </div>
);

const HistoryRow = ({ date, dr, dx, rx }) => (
  <div style={{ padding: "6px 0", borderBottom: "1px dashed var(--line-soft)", cursor: "pointer" }}>
    <div className="row" style={{ justifyContent: "space-between" }}>
      <span className="mono" style={{ fontSize: 11, color: "var(--a-cy)" }}>{date}</span>
      <span className="mono" style={{ fontSize: 10, color: "var(--t-3)" }}>{dr}</span>
    </div>
    <div style={{ fontSize: 12, color: "var(--t-1)", marginTop: 2 }}>{dx}</div>
    <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", marginTop: 2 }}>{rx}</div>
  </div>
);

const MiniStat = ({ label, value, unit }) => (
  <div style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 4, background: "var(--d-1)" }}>
    <div className="mono" style={{ fontSize: 9, color: "var(--t-3)", textTransform: "uppercase" }}>{label}</div>
    <div className="mono" style={{ fontSize: 14, color: "var(--t-0)", marginTop: 2 }}>{value} <span style={{ fontSize: 9, color: "var(--t-3)" }}>{unit}</span></div>
  </div>
);

window.OPDModule = OPDModule;
