// HIS EMR — Electronic Medical Record (bệnh án điện tử)
const { useState: useES } = React;

const EMRModule = () => {
  const p = HIS.patientById("BN-00201"); // Lê Hoàng Cường — rich case
  const [tab, setTab] = useES("overview");

  const tabs = [
    { k: "overview", l: "Tổng quan" },
    { k: "timeline", l: "Dòng thời gian", n: 42 },
    { k: "vitals", l: "Sinh hiệu" },
    { k: "labs", l: "Xét nghiệm", n: 18 },
    { k: "imaging", l: "Chẩn đoán hình ảnh", n: 6 },
    { k: "meds", l: "Thuốc" },
    { k: "notes", l: "Ghi chú" },
    { k: "docs", l: "Tài liệu", n: 24 },
  ];

  return (
    <div className="emr-wrap">
      {/* Patient strip */}
      <div className="emr-patient-strip">
        <div className="emr-avatar-l">{p.name.split(" ").slice(-1)[0][0]}</div>
        <div>
          <div className="emr-pname">{p.name}</div>
          <div className="emr-pmeta">
            <span><b>{p.id}</b></span>
            <span>{p.age} tuổi · {p.gender==="M"?"Nam":"Nữ"}</span>
            <span>Sinh {p.dob}</span>
            <span>Nhóm máu <b>{p.bloodType}</b></span>
            <span className="pill">{p.bhytClass} · {p.bhyt}</span>
            <span>SĐT {p.phone}</span>
            <span>{p.address.new}</span>
          </div>
        </div>
        <div className="emr-alerts">
          <div className="emr-alert">
            <Ico name="alert" size={14}/>
            Dị ứng: Aspirin, Sulfa
          </div>
          <div className="emr-alert warn">
            ⚠ THA độ 2 · ĐTĐ type 2
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button className="opd-btn-sec" style={{height:32}}>⎙ Xuất EMR</button>
          <button className="opd-btn-primary" style={{height:32, padding:"0 14px"}}>+ Thêm ghi chú</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="emr-tabs">
        {tabs.map(t => (
          <div key={t.k} className={"emr-tab " + (tab===t.k?"on":"")} onClick={()=>setTab(t.k)}>
            {t.l} {t.n && <span className="n">{t.n}</span>}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="emr-body">
        <div className="emr-col-3">
          {/* Problem list */}
          <div className="emr-card">
            <div className="emr-card-h">
              <span>Danh sách vấn đề</span>
              <span className="meta">cập nhật 18/10</span>
            </div>
            <div className="emr-card-b" style={{padding:"4px 14px"}}>
              <div className="emr-prob-row">
                <span className="code">I25.9</span>
                <div>
                  <div style={{fontWeight:500}}>Bệnh tim thiếu máu cục bộ mạn</div>
                  <div style={{fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>Chẩn đoán 02/2024 · theo dõi định kỳ</div>
                </div>
                <span className="stat" style={{background:"var(--s-warn-bg)",color:"var(--s-warn)"}}>ĐIỀU TRỊ</span>
              </div>
              <div className="emr-prob-row">
                <span className="code">I50.9</span>
                <div>
                  <div style={{fontWeight:500}}>Suy tim không đặc hiệu</div>
                  <div style={{fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>NYHA II · EF 48%</div>
                </div>
                <span className="stat" style={{background:"var(--s-warn-bg)",color:"var(--s-warn)"}}>ĐIỀU TRỊ</span>
              </div>
              <div className="emr-prob-row">
                <span className="code">E78.5</span>
                <div>
                  <div style={{fontWeight:500}}>Rối loạn lipid máu</div>
                  <div style={{fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>LDL-C 4.2 · HDL-C 1.1</div>
                </div>
                <span className="stat" style={{background:"var(--s-warn-bg)",color:"var(--s-warn)"}}>ĐIỀU TRỊ</span>
              </div>
              <div className="emr-prob-row">
                <span className="code">J20.9</span>
                <div>
                  <div style={{fontWeight:500}}>Viêm phế quản cấp</div>
                  <div style={{fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>03/2025 · điều trị 10 ngày</div>
                </div>
                <span className="stat" style={{background:"var(--s-ok-bg)",color:"var(--s-ok)"}}>KHỎI</span>
              </div>
            </div>
          </div>

          {/* Meds */}
          <div className="emr-card">
            <div className="emr-card-h">
              <span>Thuốc đang dùng</span>
              <span className="meta">4 đơn · tái khám 25/10</span>
            </div>
            <div className="emr-card-b" style={{padding:"4px 14px"}}>
              {[
                {nm:"Aspirin 81mg",dose:"1v sáng",code:"VN-12800-04",until:"ngày 11/11"},
                {nm:"Atorvastatin 20mg",dose:"1v tối",code:"VN-13301-22",until:"ngày 11/11"},
                {nm:"Bisoprolol 2.5mg",dose:"1v sáng",code:"VN-16800-11",until:"ngày 11/11"},
                {nm:"Metformin 500mg",dose:"1v × 2/ngày",code:"VN-11720-16",until:"ngày 11/11"},
              ].map(m => (
                <div key={m.code} className="emr-med-row">
                  <div>
                    <div className="emr-med-nm">{m.nm}</div>
                    <div className="emr-med-sub">{m.dose} · <span style={{fontFamily:"var(--font-mono)",color:"var(--t-3)"}}>{m.code}</span></div>
                  </div>
                  <div className="emr-med-d">đến<br/>{m.until}</div>
                  <button className="opd-btn-sec" style={{height:26,padding:"0 8px",fontSize:"var(--fs-xs)"}}>Kê lại</button>
                </div>
              ))}
            </div>
          </div>

          {/* Vitals */}
          <div className="emr-card">
            <div className="emr-card-h">
              <span>Sinh hiệu mới nhất</span>
              <span className="meta">hôm nay 08:02</span>
            </div>
            <div className="emr-card-b">
              <div className="emr-vitals-grid">
                <div className="emr-v-cell"><div className="lbl">HA</div><div className="val" style={{color:"var(--s-crit)"}}>162/98</div></div>
                <div className="emr-v-cell"><div className="lbl">Mạch</div><div className="val">102</div></div>
                <div className="emr-v-cell"><div className="lbl">SpO₂</div><div className="val" style={{color:"var(--s-warn)"}}>94%</div></div>
                <div className="emr-v-cell"><div className="lbl">T°</div><div className="val">37.0</div></div>
                <div className="emr-v-cell"><div className="lbl">Cân</div><div className="val">71 <small>kg</small></div></div>
                <div className="emr-v-cell"><div className="lbl">BMI</div><div className="val">26.1</div></div>
              </div>
              <div style={{marginTop:10, background:"var(--d-1)", border:"1px solid var(--line)", padding:"10px", borderRadius:"var(--r-2)"}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",textTransform:"uppercase",color:"var(--t-2)",marginBottom:6,letterSpacing:"0.08em"}}>HA — 30 ngày gần nhất (tâm thu)</div>
                <svg viewBox="0 0 300 60" style={{width:"100%",height:60}}>
                  <line x1="0" y1="20" x2="300" y2="20" stroke="var(--line)" strokeDasharray="2,3"/>
                  <line x1="0" y1="40" x2="300" y2="40" stroke="var(--line)" strokeDasharray="2,3"/>
                  <polyline
                    fill="none" stroke="var(--a-cy)" strokeWidth="1.5"
                    points="0,30 10,28 20,32 30,35 40,30 50,25 60,22 70,28 80,30 90,27 100,24 110,20 120,22 130,28 140,32 150,30 160,27 170,24 180,22 190,25 200,28 210,30 220,27 230,24 240,22 250,20 260,18 270,15 280,12 290,10 300,8"
                  />
                  <circle cx="300" cy="8" r="3" fill="var(--s-crit)"/>
                </svg>
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--font-mono)",fontSize:9,color:"var(--t-3)",marginTop:2}}>
                  <span>18/9: 118</span>
                  <span style={{color:"var(--s-crit)"}}>hôm nay: 162 mmHg ⚠</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="emr-col-2">
          {/* Timeline */}
          <div className="emr-card">
            <div className="emr-card-h">
              <span>Dòng thời gian chăm sóc</span>
              <span className="meta">42 mục · 2024–nay</span>
            </div>
            <div className="emr-card-b">
              <div className="emr-tl-row visit">
                <div className="emr-tl-date">Hôm nay<br/>08:02</div>
                <div className="emr-tl-bar"/>
                <div>
                  <div className="emr-tl-title">
                    <span className="emr-tl-tag" style={{background:"var(--a-cy-bg)",color:"var(--a-cy)"}}>OPD</span>
                    Khám Nội TQ · BS. Linh
                  </div>
                  <div className="emr-tl-sub">Đau ngực trái lan vai, khó thở · nghi ngờ hội chứng vành cấp · chuyển cấp cứu · Troponin I tăng (0.82 ng/mL)</div>
                </div>
              </div>
              <div className="emr-tl-row lab">
                <div className="emr-tl-date">Hôm nay<br/>08:25</div>
                <div className="emr-tl-bar"/>
                <div>
                  <div className="emr-tl-title">
                    <span className="emr-tl-tag" style={{background:"var(--s-mag-bg)",color:"var(--s-mag)"}}>LAB</span>
                    Sinh hoá máu + Troponin I · STAT
                  </div>
                  <div className="emr-tl-sub">Troponin I <b style={{color:"var(--s-crit)"}}>0.82 ng/mL (HH)</b> · CK-MB 38 U/L (H) · ECG nhịp xoang 102 · XN-2026-4419</div>
                </div>
              </div>
              <div className="emr-tl-row visit">
                <div className="emr-tl-date">12/08/26</div>
                <div className="emr-tl-bar"/>
                <div>
                  <div className="emr-tl-title">
                    <span className="emr-tl-tag" style={{background:"var(--a-cy-bg)",color:"var(--a-cy)"}}>OPD</span>
                    Tái khám THA + RLLP
                  </div>
                  <div className="emr-tl-sub">HA 128/80 · kiểm soát tốt · tiếp tục Amlodipin + Atorvastatin</div>
                </div>
              </div>
              <div className="emr-tl-row adm">
                <div className="emr-tl-date">15–22/05/25</div>
                <div className="emr-tl-bar"/>
                <div>
                  <div className="emr-tl-title">
                    <span className="emr-tl-tag" style={{background:"var(--s-warn-bg)",color:"var(--s-warn)"}}>IPD</span>
                    Nhập viện · Suy tim mất bù
                  </div>
                  <div className="emr-tl-sub">7 ngày điều trị · Furosemide IV · xuất viện ổn định · EF tăng từ 42% lên 48%</div>
                </div>
              </div>
              <div className="emr-tl-row proc">
                <div className="emr-tl-date">28/02/24</div>
                <div className="emr-tl-bar"/>
                <div>
                  <div className="emr-tl-title">
                    <span className="emr-tl-tag" style={{background:"var(--s-crit-bg)",color:"var(--s-crit)"}}>PCI</span>
                    Đặt stent LAD (BV Bạch Mai)
                  </div>
                  <div className="emr-tl-sub">Stent phủ thuốc DES · hẹp LAD 90% → kết quả TIMI III · xuất viện 3 ngày</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent labs */}
          <div className="emr-card">
            <div className="emr-card-h">
              <span>Xét nghiệm gần nhất</span>
              <span className="meta">XN-2026-4419 · hôm nay</span>
            </div>
            <div className="emr-card-b" style={{padding:0}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"var(--fs-sm)"}}>
                <thead>
                  <tr style={{background:"var(--d-1)"}}>
                    <th style={{padding:"8px 12px",textAlign:"left",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid var(--line)"}}>Chỉ số</th>
                    <th style={{padding:"8px 12px",textAlign:"right",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid var(--line)"}}>Kết quả</th>
                    <th style={{padding:"8px 12px",textAlign:"left",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xxs)",color:"var(--t-2)",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid var(--line)"}}>Tham chiếu</th>
                  </tr>
                </thead>
                <tbody>
                  {HIS.labRows["XN-2026-4419"].map(r => (
                    <tr key={r.name}>
                      <td style={{padding:"6px 12px",borderBottom:"1px solid var(--line-hair)"}}>{r.name}</td>
                      <td style={{padding:"6px 12px",borderBottom:"1px solid var(--line-hair)",textAlign:"right",fontFamily:"var(--font-mono)",fontWeight:600,color:r.flag==="HH"?"var(--s-crit)":r.flag==="H"?"var(--s-warn)":"var(--t-0)"}}>
                        {r.value} {r.unit}
                        {r.flag && <span style={{marginLeft:6,fontSize:9,padding:"1px 5px",borderRadius:"var(--r-1)",background:r.flag==="HH"?"var(--s-crit-bg)":"var(--s-warn-bg)",color:r.flag==="HH"?"var(--s-crit)":"var(--s-warn)"}}>{r.flag}</span>}
                      </td>
                      <td style={{padding:"6px 12px",borderBottom:"1px solid var(--line-hair)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--t-2)"}}>{r.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.EMRModule = EMRModule;
