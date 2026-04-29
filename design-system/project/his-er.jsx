// HIS ER Triage
const { useState: useEs } = React;

const ERModule = () => {
  const patients = [
    {id:"ER-0042", name:"Lê Hoàng Cường", pid:"BN-00201", age:67, gender:"M", triage:"P1", wait:3, chief:"Đau ngực trái dữ dội lan vai, khó thở, SpO₂ 94%", tags:["STEMI?","ĐTĐ"], vitals:{hr:112,bp:"162/98",spo2:94,t:"37.0",rr:22,gcs:15}, arrived:"08:02", mews:6, gcs:15},
    {id:"ER-0043", name:"Trần Thị Lan", pid:"BN-00312", age:42, gender:"F", triage:"P2", wait:8, chief:"Sốt cao 40°C · co giật · rigor", tags:["SỐT XH?"], vitals:{hr:128,bp:"96/56",spo2:96,t:"40.1",rr:24,gcs:14}, arrived:"07:58", mews:7, gcs:14},
    {id:"ER-0044", name:"Phạm Văn Hùng", pid:"BN-00418", age:34, gender:"M", triage:"P2", wait:12, chief:"TNGT · chấn thương sọ não kín · nôn 2 lần", tags:["CT GẤP"], vitals:{hr:88,bp:"140/88",spo2:98,t:"36.8",rr:18,gcs:13}, arrived:"07:48", mews:4, gcs:13},
    {id:"ER-0045", name:"Nguyễn Thị Mai", pid:"BN-00523", age:28, gender:"F", triage:"P3", wait:24, chief:"Đau bụng RHC 8h · nôn 3 lần · sốt nhẹ", tags:["VRT?"], vitals:{hr:98,bp:"118/74",spo2:98,t:"37.6",rr:18,gcs:15}, arrived:"07:35", mews:2, gcs:15},
    {id:"ER-0046", name:"Đỗ Văn Bình", pid:"BN-00189", age:56, gender:"M", triage:"P3", wait:32, chief:"Đau thượng vị, ợ chua, buồn nôn 6h", tags:[], vitals:{hr:84,bp:"136/82",spo2:99,t:"36.6",rr:16,gcs:15}, arrived:"07:20", mews:1, gcs:15},
    {id:"ER-0047", name:"Hoàng Thị Em", pid:"BN-00678", age:19, gender:"F", triage:"P4", wait:48, chief:"Đau đầu 2 ngày, không giảm với paracetamol", tags:[], vitals:{hr:72,bp:"112/70",spo2:99,t:"36.9",rr:16,gcs:15}, arrived:"07:05", mews:0, gcs:15},
    {id:"ER-0048", name:"Vũ Quang Long", pid:"BN-00789", age:41, gender:"M", triage:"P4", wait:55, chief:"Ho có đàm, sốt nhẹ 2 ngày", tags:[], vitals:{hr:78,bp:"122/76",spo2:98,t:"37.4",rr:18,gcs:15}, arrived:"06:55", mews:1, gcs:15},
    {id:"ER-0049", name:"Bùi Thanh Hà", pid:"BN-00823", age:33, gender:"F", triage:"P5", wait:78, chief:"Vết thương phần mềm ở chân, xin thay băng", tags:[], vitals:{hr:68,bp:"108/66",spo2:99,t:"36.5",rr:14,gcs:15}, arrived:"06:18", mews:0, gcs:15},
  ];

  const [sel, setSel] = useEs("ER-0042");
  const e = patients.find(x => x.id === sel);

  const counts = {
    p1: patients.filter(p => p.triage==="P1").length,
    p2: patients.filter(p => p.triage==="P2").length,
    p3: patients.filter(p => p.triage==="P3").length,
    p4: patients.filter(p => p.triage==="P4").length,
    p5: patients.filter(p => p.triage==="P5").length,
  };
  const waitClass = (w, lvl) => {
    const thr = {P1:5,P2:10,P3:30,P4:60,P5:120}[lvl];
    if (w > thr) return "over";
    if (w > thr*0.7) return "warn";
    return "ok";
  };

  return (
    <div className="er-wrap">
      <div className="er-top">
        <div className="er-level p1"><div className="l">P1 · Nguy kịch</div><div className="v">{counts.p1}</div><div className="d">≤ 5 phút · LIFE</div></div>
        <div className="er-level p2"><div className="l">P2 · Rất khẩn</div><div className="v">{counts.p2}</div><div className="d">≤ 10 phút</div></div>
        <div className="er-level p3"><div className="l">P3 · Khẩn</div><div className="v">{counts.p3}</div><div className="d">≤ 30 phút</div></div>
        <div className="er-level p4"><div className="l">P4 · Ít khẩn</div><div className="v">{counts.p4}</div><div className="d">≤ 60 phút</div></div>
        <div className="er-level p5"><div className="l">P5 · Không khẩn</div><div className="v">{counts.p5}</div><div className="d">≤ 120 phút</div></div>
        <div className="er-meta">
          <span><span className="g"></span>GIÁM SÁT LIVE</span>
          <span>BS trực: <span className="big">BS. Trần Thu</span></span>
          <span>ĐDT: <span className="big">Phạm Hoa</span></span>
          <span>Giường CC <span className="big">6/8</span></span>
          <span>Phòng mổ sẵn <span className="big">OR-02, OR-04</span></span>
          <span style={{marginLeft:"auto", color:"#22c55e"}}>08:42:18</span>
        </div>
      </div>

      <div className="er-body">
        {/* Waiting */}
        <div className="er-wait">
          <div className="er-wait-h">
            <span>Hàng chờ cấp cứu · {patients.length} BN</span>
            <span>Sắp xếp: Mức → Thời gian</span>
          </div>
          {patients.map(p => (
            <div key={p.id} className={"er-pt " + (sel===p.id?"sel":"")} onClick={()=>setSel(p.id)}>
              <div className="er-pt-head">
                <div>
                  <div className="er-pt-tags">
                    <span className={"er-pt-tag " + p.triage.toLowerCase()}>{p.triage}</span>
                    {p.tags.map(t => <span key={t} className="er-pt-tag spec">{t}</span>)}
                  </div>
                  <div className="er-pt-name">{p.name}</div>
                </div>
                <div className={"er-pt-wait " + waitClass(p.wait, p.triage)}>
                  {p.wait}<small style={{fontSize:10, marginLeft:1, opacity:0.8}}>ph</small>
                </div>
              </div>
              <div className="er-pt-comp">{p.chief}</div>
              <div className="er-pt-meta">
                <span>{p.id}</span>
                <span>{p.age}t · {p.gender==="M"?"Nam":"Nữ"}</span>
                <span>đến {p.arrived}</span>
                <span>MEWS {p.mews}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="er-detail">
          <div className="er-d-top">
            <div style={{display:"flex", alignItems:"center", gap:14, marginBottom:6}}>
              <span className={"er-pt-tag " + e.triage.toLowerCase()} style={{fontSize:12, padding:"3px 10px"}}>{e.triage} · NGUY KỊCH</span>
              <span style={{color:"#9aa4ad",fontFamily:"var(--font-mono)",fontSize:12}}>{e.id} · đến {e.arrived} · chờ {e.wait}p</span>
            </div>
            <div className="er-d-name">{e.name}</div>
            <div className="er-d-meta">
              <span><b>{e.pid}</b></span>
              <span>{e.age}t · {e.gender==="M"?"Nam":"Nữ"}</span>
              <span>CCCD 035958404281</span>
              <span>BHYT <b>HN2</b> · 80%</span>
              <span>Đến: <b>Tự đến (người nhà)</b></span>
              <span>Tiền sử: <b>THA, ĐTĐ, stent LAD 2024</b></span>
              <span>Dị ứng: <b style={{color:"#ef4444"}}>Aspirin, Sulfa</b></span>
            </div>
          </div>

          <div className="er-vitals">
            <div className="er-vital warn"><div className="l">HA mmHg</div><div className="v">162/98</div><div className="t">MAP 119</div></div>
            <div className="er-vital warn"><div className="l">Mạch bpm</div><div className="v">{e.vitals.hr}</div><div className="t">xoang đều</div></div>
            <div className="er-vital warn"><div className="l">SpO₂</div><div className="v">{e.vitals.spo2}<small>%</small></div><div className="t">khí trời</div></div>
            <div className="er-vital ok"><div className="l">T°</div><div className="v">{e.vitals.t}</div><div className="t">nách</div></div>
            <div className="er-vital ok"><div className="l">Nhịp thở</div><div className="v">{e.vitals.rr}</div><div className="t">lần/phút</div></div>
            <div className="er-vital ok"><div className="l">GCS</div><div className="v">{e.vitals.gcs}</div><div className="t">E4V5M6</div></div>
          </div>

          <div className="er-scores">
            <div className="er-score crit">
              <div className="l">MEWS · điểm cảnh báo sớm</div>
              <div className="v">{e.mews}<small style={{fontSize:14,color:"#9aa4ad",fontWeight:400,marginLeft:6}}>/9</small></div>
              <div className="i"><b>≥ 5 Báo BS HSCC</b> · gọi kíp trực</div>
            </div>
            <div className="er-score warn">
              <div className="l">HEART score (đau ngực)</div>
              <div className="v">7<small style={{fontSize:14,color:"#9aa4ad",fontWeight:400,marginLeft:6}}>/10</small></div>
              <div className="i">Nguy cơ MACE 30 ngày: <b>12–16.6%</b></div>
            </div>
            <div className="er-score crit">
              <div className="l">TIMI · NMCT không ST</div>
              <div className="v">4<small style={{fontSize:14,color:"#9aa4ad",fontWeight:400,marginLeft:6}}>/7</small></div>
              <div className="i">30-ngày: <b>19.9%</b> · chỉ định PCI</div>
            </div>
          </div>

          <div className="er-actions">
            <div className="er-timeline">
              <h4>Dòng thời gian xử trí</h4>
              <div className="er-tl-row done"><span className="t">08:02</span><span>✓ Đến cấp cứu · phân loại P1</span></div>
              <div className="er-tl-row done"><span className="t">08:04</span><span>✓ Đo sinh hiệu · lấy bệnh sử</span></div>
              <div className="er-tl-row done"><span className="t">08:06</span><span>✓ ECG 12 đạo trình (STEMI loại trừ)</span></div>
              <div className="er-tl-row done"><span className="t">08:10</span><span>✓ Đặt đường truyền, oxy 3L/p canuyn</span></div>
              <div className="er-tl-row done"><span className="t">08:18</span><span>✓ Lấy máu Troponin I, CK-MB, CTM, sinh hoá</span></div>
              <div className="er-tl-row active"><span className="t">08:35</span><span>● Đang chờ KQ XN (HH) · BS. Linh khám lần 2</span></div>
              <div className="er-tl-row"><span className="t">—</span><span>○ Hội chẩn Tim mạch (BS. Hùng)</span></div>
              <div className="er-tl-row"><span className="t">—</span><span>○ Chụp MSCT ĐMV cản quang</span></div>
              <div className="er-tl-row"><span className="t">—</span><span>○ Quyết định: điều trị nội / can thiệp PCI</span></div>
            </div>

            <div>
              <h4>Hành động nhanh</h4>
              <div className="er-cmd">
                <button className="crit">
                  <span className="k">F1</span>
                  🚨 Kích hoạt Code STEMI
                </button>
                <button className="warn">
                  <span className="k">F2</span>
                  📞 Gọi HSCC (x1234)
                </button>
                <button className="p">
                  <span className="k">F3</span>
                  💊 Kê y lệnh cấp cứu
                </button>
                <button>
                  <span className="k">F4</span>
                  🧪 Chỉ định XN STAT
                </button>
                <button>
                  <span className="k">F5</span>
                  📷 Chỉ định CĐHA
                </button>
                <button>
                  <span className="k">F6</span>
                  🛏 Đặt giường ICU
                </button>
                <button>
                  <span className="k">F7</span>
                  🔄 Chuyển khoa Nội TM
                </button>
                <button>
                  <span className="k">F8</span>
                  ✍ Ghi chú xử trí
                </button>
                <button>
                  <span className="k">F9</span>
                  📋 Nhập viện HSCC
                </button>
                <button>
                  <span className="k">F10</span>
                  ✓ Hoàn tất triage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ERModule = ERModule;
