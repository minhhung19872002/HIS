// Module: Dashboard (doctor's command deck)
const Dashboard = ({ goPatient, goRoute }) => {
  useLang();
  const inProgress = HIS_DATA.queue.find(q => q.status === "in-progress");
  const waiting = HIS_DATA.queue.filter(q => q.status === "waiting");
  const urgent = HIS_DATA.queue.filter(q => q.priority === "urgent");

  return (
    <div style={{ padding: 12, display: "grid", gap: 10, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", gridTemplateRows: "auto 1fr 1fr", height: "100%" }}>
      {/* Hero strip */}
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: "var(--d-0)", border: "1px solid var(--line)", borderRadius: 8 }}>
        <div>
          <div className="mono up" style={{ fontSize: 10, color: "var(--t-3)" }}>Thứ Bảy · 18/04/2026 · 08:42</div>
          <div className="serif" style={{ fontSize: 22, color: "var(--t-0)", marginTop: 2 }}>
            Chào buổi sáng, <span style={{ color: "var(--a-cy)" }}>BS Linh</span>.
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--t-2)", marginTop: 4 }}>
            {waiting.length} bệnh nhân đang chờ · {urgent.length} ưu tiên · Ca trực bắt đầu 07:00 → 15:00
          </div>
        </div>
        <div className="spacer" style={{ flex: 1 }}/>
        <div style={{ display: "flex", gap: 8 }}>
          <KPI label="HÀNG CHỜ OPD" value={waiting.length} sub="patients" trend="-2" />
          <KPI label="ĐANG NỘI TRÚ" value="47" sub="/ 60 giường" trend="+3" />
          <KPI label="PHẪU THUẬT" value="9" sub="hôm nay" trend="0" />
          <KPI label="CẢNH BÁO" value="3" sub="signal" trend="+1" warn />
        </div>
      </div>

      {/* Current patient */}
      <div className="panel" style={{ gridColumn: "1 / 3", gridRow: "2 / 4" }}>
        <div className="panel-h">
          <span className="dot cy"/>
          <span className="title">ĐANG KHÁM · <b>{inProgress?.token}</b></span>
          <span className="sub">{inProgress?.reason}</span>
          <span className="actions">
            <button className="btn sm" onClick={() => goRoute("opd")}>Mở hồ sơ →</button>
          </span>
        </div>
        <div className="panel-body pad">
          {inProgress && (() => {
            const p = HIS_DATA.patientById(inProgress.pid);
            return (
              <div>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="serif" style={{ fontSize: 22, color: "var(--t-0)" }}>{p.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--t-2)", marginTop: 2 }}>
                      {p.id} · {p.age}{p.gender === "M" ? "♂" : "♀"} · {p.bloodType} · {p.insurance}
                    </div>
                  </div>
                  <div className="row">
                    {p.allergy.length > 0 && (
                      <span className="chip crit"><Icon name="alert" size={11}/> Dị ứng: {p.allergy.join(", ")}</span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  <Vital icon="heart" label="HUYẾT ÁP" value={inProgress.vitals.bp} unit="mmHg" state="ok" />
                  <Vital icon="activity" label="NHỊP TIM" value={inProgress.vitals.hr} unit="bpm" state="ok" />
                  <Vital icon="thermometer" label="NHIỆT ĐỘ" value={inProgress.vitals.temp} unit="°C" state="ok" />
                  <Vital icon="droplet" label="SpO₂" value={inProgress.vitals.spo2} unit="%" state="ok" />
                </div>

                <div className="hline" style={{ margin: "14px 0 10px" }}/>

                <div className="label">TIMELINE HÔM NAY</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--t-1)", lineHeight: 1.9 }}>
                  <div><span style={{ color: "var(--t-3)" }}>07:55</span>  Tiếp nhận · tầng 1 · quầy 3</div>
                  <div><span style={{ color: "var(--t-3)" }}>08:12</span>  Sinh hiệu · ĐD Hương</div>
                  <div><span style={{ color: "var(--t-3)" }}>08:18</span>  Vào phòng khám 201 <span className="chip cy sm">HIỆN TẠI</span></div>
                  <div><span style={{ color: "var(--t-3)" }}>08:25</span>  — Hỏi bệnh: thai 28w, khám định kỳ</div>
                  <div><span style={{ color: "var(--t-3)" }}>08:31</span>  — Chỉ định Siêu âm sản <span className="chip mag sm">ACC-88710</span></div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Vital alerts */}
      <div className="panel" style={{ gridColumn: "3 / 4", gridRow: "2 / 3" }}>
        <div className="panel-h">
          <span className="dot crit"/>
          <span className="title">CẢNH BÁO SINH HIỆU</span>
          <span className="sub">3 signals</span>
        </div>
        <div className="panel-body">
          <AlertRow sev="crit" pt="Nguyễn Thị M." room="P.301-3" msg="SpO₂ 88% ↓" age="2 phút" />
          <AlertRow sev="warn" pt="Lê Hoàng Cường" room="OPD · hàng chờ" msg="HA 162/98 ↑" age="5 phút" />
          <AlertRow sev="warn" pt="Bùi Thị O." room="P.303-4" msg="Nhiệt độ 38.9°C" age="18 phút" />
        </div>
      </div>

      {/* Pending labs */}
      <div className="panel" style={{ gridColumn: "4 / 5", gridRow: "2 / 3" }}>
        <div className="panel-h">
          <span className="dot warn"/>
          <span className="title">LAB CHỜ DUYỆT</span>
          <span className="sub">4 kết quả</span>
          <span className="actions"><button className="btn sm" onClick={() => goRoute("lis")}>Tất cả →</button></span>
        </div>
        <div className="panel-body">
          {HIS_DATA.labs.filter(l => l.status === "verified" && l.abnormal > 0).slice(0, 4).map(l => (
            <div key={l.id} style={{ padding: "8px 10px", borderBottom: "1px solid var(--line-hair)", cursor: "pointer" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--t-0)" }}>{l.pt}</span>
                <span className="chip warn">{l.abnormal} abn</span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", marginTop: 2 }}>{l.panel} · {l.id}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="panel" style={{ gridColumn: "3 / 5", gridRow: "3 / 4" }}>
        <div className="panel-h">
          <span className="title">LỊCH HÔM NAY</span>
          <span className="sub">5 events</span>
        </div>
        <div className="panel-body pad">
          <TLRow time="09:00" what="Giao ban khoa" where="P.Họp A2" />
          <TLRow time="10:30" what="Hội chẩn ca BN-00102" where="Khoa Nội" active />
          <TLRow time="13:00" what="Phẫu thuật · mổ thoát vị bẹn" where="OR-1" chip="Surgery" />
          <TLRow time="14:30" what="Gặp TS.BS Hoàng" where="Văn phòng 408" />
          <TLRow time="15:00" what="Kết ca trực" where="—" />
        </div>
      </div>
    </div>
  );
};

const KPI = ({ label, value, sub, trend, warn }) => (
  <div style={{ padding: "6px 12px", borderLeft: "1px solid var(--line)", minWidth: 110 }}>
    <div className="mono up" style={{ fontSize: 9, color: "var(--t-3)" }}>{label}</div>
    <div className="mono" style={{ fontSize: 24, color: warn ? "var(--s-warn)" : "var(--t-0)", lineHeight: 1.1, marginTop: 2 }}>{value}</div>
    <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", marginTop: 2 }}>
      {sub} <span style={{ color: trend === "0" ? "var(--t-3)" : (trend.startsWith("+") ? "var(--s-ok)" : "var(--s-crit)") }}>{trend}</span>
    </div>
  </div>
);

const Vital = ({ icon, label, value, unit, state }) => (
  <div style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 6, background: "var(--d-1)" }}>
    <div className="row" style={{ color: "var(--t-3)" }}>
      <Icon name={icon} size={12}/>
      <span className="mono up" style={{ fontSize: 9 }}>{label}</span>
    </div>
    <div className="mono" style={{ fontSize: 22, color: state === "crit" ? "var(--s-crit)" : state === "warn" ? "var(--s-warn)" : "var(--t-0)", marginTop: 4 }}>
      {value} <span style={{ fontSize: 11, color: "var(--t-3)" }}>{unit}</span>
    </div>
  </div>
);

const AlertRow = ({ sev, pt, room, msg, age }) => (
  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line-hair)", cursor: "pointer" }}>
    <div className="row" style={{ justifyContent: "space-between" }}>
      <span className="row">
        <span className={`dot ${sev}`}/>
        <span style={{ fontSize: 12 }}>{pt}</span>
      </span>
      <span className={`chip ${sev}`}>{msg}</span>
    </div>
    <div className="mono" style={{ fontSize: 10, color: "var(--t-3)", marginTop: 2 }}>{room} · {age}</div>
  </div>
);

const TLRow = ({ time, what, where, active, chip }) => (
  <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--line-soft)" }}>
    <span className="mono" style={{ fontSize: 11, color: active ? "var(--a-cy)" : "var(--t-2)" }}>{time}</span>
    <div>
      <div style={{ fontSize: 12, color: active ? "var(--t-0)" : "var(--t-1)" }}>{what}</div>
      <div className="mono" style={{ fontSize: 10, color: "var(--t-3)" }}>{where}</div>
    </div>
    {chip && <span className="chip mag">{chip}</span>}
    {active && <span className="chip cy">NOW</span>}
  </div>
);

window.Dashboard = Dashboard;
