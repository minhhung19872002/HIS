// HIS Ward — Inpatient bed map
const { useState: useWS } = React;

// Generate realistic bed layout
const wardData = () => {
  const firstNames = ["Nguyễn","Trần","Lê","Phạm","Hoàng","Vũ","Đỗ","Bùi","Đặng","Ngô","Phan","Hà","Trương","Đinh"];
  const mid = ["Văn","Thị","Hữu","Minh","Thanh","Quốc","Hồng","Anh","Tuấn"];
  const lastM = ["An","Bình","Cường","Dũng","Hưng","Khánh","Long","Minh","Nam","Phúc","Quang","Sơn","Thắng","Tùng","Việt","Bảo"];
  const lastF = ["An","Bình","Cúc","Dung","Hà","Huệ","Lan","Mai","Nga","Oanh","Phương","Quỳnh","Thảo","Tuyết","Uyên","Vân","Yến"];
  const dx = [
    "J44.9 · COPD đợt cấp","I21.4 · NMCT không ST","I50.9 · Suy tim",
    "N18.5 · Suy thận mạn 4","K80.2 · Sỏi túi mật","I63.9 · Đột quỵ nhồi máu",
    "O80 · Sau sinh thường","J18.9 · Viêm phổi","E11.9 · ĐTĐ biến chứng",
    "S72.0 · Gãy cổ xương đùi","K29.7 · Viêm dạ dày","C34.9 · U phổi",
    "I10 · THA không ổn","C50.9 · U vú","K70.1 · Viêm gan cấp","M17.0 · Thoái hóa khớp gối"
  ];
  const statuses = [
    {k:"stable",w:0.55},{k:"watch",w:0.18},{k:"crit",w:0.05},
    {k:"discharge",w:0.08},{k:"empty",w:0.09},{k:"cleaning",w:0.03},{k:"maint",w:0.02}
  ];
  function r(a){return a[Math.floor(Math.random()*a.length)];}
  function weighted() {
    let x = Math.random(), s = 0;
    for (const st of statuses) { s += st.w; if (x<=s) return st.k; }
    return "stable";
  }

  // Deterministic seed
  let seed = 42;
  function rand() { seed = (seed*1664525 + 1013904223) & 0x7fffffff; return seed/0x7fffffff;}
  function rItem(a) { return a[Math.floor(rand()*a.length)];}
  function wStat() {
    let x = rand(), s = 0;
    for (const st of statuses) { s += st.w; if (x<=s) return st.k; }
    return "stable";
  }

  const floors = [
    {f: "Tầng 2", units: [
      {r:"A.201", t:"Nội TQ · 8 giường", type:"std", beds:8},
      {r:"A.202", t:"Nội TQ · 8 giường", type:"std", beds:8},
      {r:"A.203", t:"Nội TQ · 4 giường", type:"std", beds:4},
      {r:"A.205", t:"Nội TM · 4 giường", type:"std", beds:4},
      {r:"A.207", t:"Cách ly · 2 giường", type:"iso", beds:2},
      {r:"A.210", t:"Phòng VIP", type:"vip", beds:1},
    ]},
    {f: "Tầng 3", units: [
      {r:"B.301", t:"ICU · 4 giường", type:"icu", beds:4},
      {r:"B.302", t:"HSCC · 6 giường", type:"icu", beds:6},
      {r:"B.304", t:"Ngoại A · 8 giường", type:"std", beds:8},
      {r:"B.308", t:"Ngoại B · 6 giường", type:"std", beds:6},
    ]},
    {f: "Tầng 4", units: [
      {r:"C.401", t:"Sản · 8 giường", type:"std", beds:8},
      {r:"C.403", t:"Sản · 4 giường", type:"std", beds:4},
      {r:"C.405", t:"Nhi · 6 giường", type:"std", beds:6},
      {r:"C.410", t:"Sau sinh VIP", type:"vip", beds:2},
    ]},
  ];

  floors.forEach(floor => {
    floor.units.forEach(room => {
      room.bedList = Array.from({length: room.beds}, (_,i) => {
        const st = room.type==="icu" ? (rand()<0.5?"watch":rand()<0.6?"crit":"stable") : wStat();
        if (st === "empty" || st==="cleaning" || st==="maint") {
          return {n: i+1, status: st};
        }
        const gender = rand() > 0.5 ? "M" : "F";
        const last = gender==="M" ? rItem(lastM) : rItem(lastF);
        const name = `${rItem(firstNames)} ${gender==="F" ? "Thị" : rItem(mid)} ${last}`;
        const age = 20 + Math.floor(rand()*65);
        return {
          n: i+1, status: st,
          name, age, gender,
          pid: "BN-"+(10000 + Math.floor(rand()*9999)),
          dx: rItem(dx),
          dur: Math.floor(rand()*12)+1,
          vitals: {
            hr: 60 + Math.floor(rand()*60),
            bp: (100 + Math.floor(rand()*70)) + "/" + (60 + Math.floor(rand()*30)),
            spo2: 90 + Math.floor(rand()*10),
            t: (36.4 + rand()*2).toFixed(1),
          },
          doctor: "BS. " + rItem(["Linh","Phan","Thu","Tuấn","Hà","An","Quân"]),
        };
      });
    });
  });
  return floors;
};

const WardModule = () => {
  const floors = React.useMemo(() => wardData(), []);
  const [sel, setSel] = useWS(null);
  const [floorFilter, setFloorFilter] = useWS("all");

  // Compute stats
  const allBeds = floors.flatMap(f => f.units.flatMap(u => u.bedList));
  const stats = {
    total: allBeds.length,
    occ: allBeds.filter(b => b.status !== "empty" && b.status !== "cleaning" && b.status !== "maint").length,
    crit: allBeds.filter(b => b.status === "crit").length,
    watch: allBeds.filter(b => b.status === "watch").length,
    empty: allBeds.filter(b => b.status === "empty").length,
    discharge: allBeds.filter(b => b.status === "discharge").length,
    cleaning: allBeds.filter(b => b.status === "cleaning").length,
  };
  const occPct = Math.round(stats.occ / stats.total * 100);

  const selBed = sel ? allBeds.find(b => `${b.room}-${b.n}` === sel) : null;

  const floorsToShow = floorFilter === "all" ? floors : floors.filter(f => f.f === floorFilter);

  const BedCell = ({bed, room}) => {
    const key = `${room.r}-${bed.n}`;
    if (bed.status === "empty") {
      return (
        <div className={"bed empty " + (sel===key?"sel":"")} onClick={()=>setSel(key)}>
          <div className="bed-num">{room.r}-{String(bed.n).padStart(2,'0')}</div>
          <div className="bed-placeholder">Trống</div>
        </div>
      );
    }
    if (bed.status === "cleaning") {
      return (
        <div className={"bed cleaning " + (sel===key?"sel":"")} onClick={()=>setSel(key)}>
          <div className="bed-num">{room.r}-{String(bed.n).padStart(2,'0')}</div>
          <div className="bed-placeholder">Vệ sinh</div>
        </div>
      );
    }
    if (bed.status === "maint") {
      return (
        <div className={"bed maint " + (sel===key?"sel":"")} onClick={()=>setSel(key)}>
          <div className="bed-num">{room.r}-{String(bed.n).padStart(2,'0')}</div>
          <div className="bed-placeholder">Bảo trì</div>
        </div>
      );
    }
    const isoClass = room.type==="iso" ? " iso" : "";
    return (
      <div className={"bed occ " + bed.status + isoClass + " " + (sel===key?"sel":"")} onClick={()=>setSel(key)}>
        <div className="bed-num">
          <span>{room.r}-{String(bed.n).padStart(2,'0')}</span>
          <span style={{
            fontSize:8,
            background: bed.status==="crit"?"var(--s-crit)":bed.status==="watch"?"var(--s-warn)":bed.status==="discharge"?"var(--s-ok)":"var(--a-cy)",
            color:"#fff",
            padding:"1px 4px",
            borderRadius:2,
          }}>{bed.status==="crit"?"CC":bed.status==="watch"?"TD":bed.status==="discharge"?"XV":"ON"}</span>
        </div>
        <div className="bed-name">{bed.name}</div>
        <div className="bed-meta">
          <span>{bed.age}t·{bed.gender}</span>
          <span className="dur">{bed.dur}d</span>
        </div>
      </div>
    );
  };

  return (
    <div className="ward-wrap">
      <div className="ward-top">
        <div className="ward-kpi"><div className="l">Tổng giường</div><div className="v">{stats.total}</div></div>
        <div className="ward-kpi"><div className="l">Đang sử dụng</div><div className="v">{stats.occ} <small>· {occPct}%</small></div></div>
        <div className="ward-kpi crit"><div className="l">Nguy kịch</div><div className="v">{stats.crit}</div></div>
        <div className="ward-kpi warn"><div className="l">Theo dõi</div><div className="v">{stats.watch}</div></div>
        <div className="ward-kpi ok"><div className="l">Chờ xuất viện</div><div className="v">{stats.discharge}</div></div>
        <div className="ward-kpi"><div className="l">Trống</div><div className="v">{stats.empty}</div></div>
        <div className="ward-kpi"><div className="l">LOS trung bình</div><div className="v">4.2 <small>ngày</small></div></div>
        <div className="ward-kpi"><div className="l">Nhập viện hôm nay</div><div className="v">8</div></div>
      </div>

      <div className="ward-sub">
        <div className={"ward-chip " + (floorFilter==="all"?"on":"")} onClick={()=>setFloorFilter("all")}>Toàn bệnh viện <span className="c">{stats.total}</span></div>
        {floors.map(f => {
          const n = f.units.reduce((s,u) => s + u.beds, 0);
          return <div key={f.f} className={"ward-chip " + (floorFilter===f.f?"on":"")} onClick={()=>setFloorFilter(f.f)}>{f.f} <span className="c">{n}</span></div>;
        })}
        <div style={{flex:1}}/>
        <div className="ward-chip">
          <Ico name="stethoscope" size={13}/>
          Đi buồng: <b style={{color:"var(--a-cy)",marginLeft:4}}>BS. Nguyễn Linh</b>
        </div>
        <div className="ward-chip">
          <Ico name="stethoscope" size={13}/>
          ĐD trưởng: <b style={{color:"var(--a-cy)",marginLeft:4}}>Lê Thị Hà</b>
        </div>
      </div>

      <div className="ward-body">
        <div className="ward-map">
          {floorsToShow.map(floor => {
            const floorBeds = floor.units.flatMap(u => u.bedList);
            const fOcc = floorBeds.filter(b => !["empty","cleaning","maint"].includes(b.status)).length;
            return (
              <div key={floor.f} className="ward-floor">
                <div className="ward-floor-h">
                  <div className="ward-floor-t">
                    {floor.f}
                    <small>· {floor.units.length} phòng · {floorBeds.length} giường</small>
                  </div>
                  <div className="ward-floor-sum">
                    <span>Sử dụng <b>{fOcc}/{floorBeds.length}</b> ({Math.round(fOcc/floorBeds.length*100)}%)</span>
                    <span>Nguy kịch <b style={{color:"var(--s-crit)"}}>{floorBeds.filter(b => b.status==="crit").length}</b></span>
                    <span>Trống <b>{floorBeds.filter(b => b.status==="empty").length}</b></span>
                  </div>
                </div>
                {floor.units.map(room => (
                  <div key={room.r} className="ward-row">
                    <div className={"ward-room-lbl " + (room.type==="icu"?"icu":room.type==="vip"?"vip":room.type==="iso"?"iso":"")}>
                      <div className="r">{room.r}</div>
                      <div className="t">{room.t.split(" · ")[0]}</div>
                    </div>
                    <div className="ward-beds" style={{gridTemplateColumns: `repeat(${Math.max(room.beds, 4)}, 1fr)`}}>
                      {room.bedList.map(bed => <BedCell key={bed.n} bed={bed} room={room}/>)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Detail */}
        <div className="ward-detail">
          {selBed ? (
            <>
              <div className="ward-detail-h">
                <div className="ward-detail-t">Giường {sel}</div>
                <div className="ward-detail-sub">
                  <span>Tình trạng <b style={{color: selBed.status==="crit"?"var(--s-crit)":selBed.status==="watch"?"var(--s-warn)":"var(--s-ok)"}}>{{stable:"Ổn định",watch:"Theo dõi",crit:"Nguy kịch",discharge:"Chờ XV"}[selBed.status] || "—"}</b></span>
                  <span>Nằm viện <b>{selBed.dur} ngày</b></span>
                </div>
              </div>
              <div className="ward-detail-body">
                <div className="ward-sec">
                  <div className="ward-sec-h">Bệnh nhân</div>
                  <div style={{display:"flex", gap:12}}>
                    <div style={{width:48,height:48,borderRadius:"50%",background:"var(--a-cy-bg)",color:"var(--a-cy)",display:"grid",placeItems:"center",fontSize:20,fontWeight:600,border:"1px solid var(--a-cy-line)"}}>
                      {selBed.name.split(" ").slice(-1)[0][0]}
                    </div>
                    <div>
                      <div style={{fontSize:16,fontWeight:600,color:"var(--t-0)"}}>{selBed.name}</div>
                      <div style={{fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--t-2)", marginTop:2}}>
                        {selBed.pid} · {selBed.age}t · {selBed.gender==="M"?"Nam":"Nữ"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ward-sec">
                  <div className="ward-sec-h">Chẩn đoán</div>
                  <div style={{fontSize:"var(--fs-sm)",padding:"8px 10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:"var(--r-2)"}}>
                    {selBed.dx}
                  </div>
                </div>
                <div className="ward-sec">
                  <div className="ward-sec-h">Sinh hiệu mới nhất</div>
                  <div className="ward-vitals">
                    <div className={"ward-vital " + (parseInt(selBed.vitals.bp) > 160 ? "crit" : parseInt(selBed.vitals.bp) > 140 ? "warn" : "")}>
                      <div className="l">HA</div>
                      <div className="v">{selBed.vitals.bp}</div>
                    </div>
                    <div className={"ward-vital " + (selBed.vitals.hr > 110 || selBed.vitals.hr < 50 ? "warn" : "")}>
                      <div className="l">Mạch</div>
                      <div className="v">{selBed.vitals.hr}</div>
                    </div>
                    <div className={"ward-vital " + (selBed.vitals.spo2 < 92 ? "crit" : selBed.vitals.spo2 < 95 ? "warn" : "")}>
                      <div className="l">SpO₂</div>
                      <div className="v">{selBed.vitals.spo2}%</div>
                    </div>
                    <div className="ward-vital">
                      <div className="l">T°</div>
                      <div className="v">{selBed.vitals.t}</div>
                    </div>
                    <div className="ward-vital">
                      <div className="l">NH</div>
                      <div className="v">18</div>
                    </div>
                    <div className="ward-vital">
                      <div className="l">V. tiểu</div>
                      <div className="v">1.2<small style={{fontSize:10,color:"var(--t-3)"}}>L/h</small></div>
                    </div>
                  </div>
                </div>
                <div className="ward-sec">
                  <div className="ward-sec-h">BS phụ trách</div>
                  <div style={{fontSize:"var(--fs-sm)"}}>
                    <b>{selBed.doctor}</b> · khoa Nội A<br/>
                    <span style={{color:"var(--t-2)", fontSize:"var(--fs-xs)"}}>Điều dưỡng: Phạm T. Hoa · ca ngày</span>
                  </div>
                </div>
                <div className="ward-sec">
                  <div className="ward-sec-h">Y lệnh hôm nay</div>
                  <div style={{fontSize:"var(--fs-sm)", lineHeight:1.7}}>
                    • Furosemide 40mg IV × 1 (09:00)<br/>
                    • Bisoprolol 2.5mg PO × sáng<br/>
                    • Atorvastatin 20mg PO × tối<br/>
                    • Theo dõi cân nặng, V. nước tiểu 3h/lần<br/>
                    • Chụp XQ ngực sáng mai<br/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:14}}>
                  <button className="opd-btn-sec" style={{height:36}}>Mở EMR</button>
                  <button className="opd-btn-primary" style={{height:36}}>+ Y lệnh</button>
                  <button className="opd-btn-sec" style={{height:36}}>Chuyển giường</button>
                  <button className="opd-btn-sec" style={{height:36}}>Xuất viện</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{padding:40, textAlign:"center", color:"var(--t-3)"}}>
              <div style={{fontSize:48,marginBottom:12}}>🛏</div>
              <div style={{fontSize:"var(--fs-sm)"}}>Chọn một giường trên sơ đồ để xem chi tiết</div>
            </div>
          )}
        </div>
      </div>

      <div className="ward-legend">
        <div className="ward-legend-i"><div className="ward-legend-sw" style={{background:"var(--s-ok)"}}/>Ổn định</div>
        <div className="ward-legend-i"><div className="ward-legend-sw" style={{background:"var(--s-warn)"}}/>Theo dõi</div>
        <div className="ward-legend-i"><div className="ward-legend-sw" style={{background:"var(--s-crit)"}}/>Nguy kịch</div>
        <div className="ward-legend-i"><div className="ward-legend-sw" style={{background:"#bae6fd"}}/>Vệ sinh</div>
        <div className="ward-legend-i"><div className="ward-legend-sw" style={{background:"#fef3c7",border:"1px dashed #fde68a"}}/>Bảo trì</div>
        <div className="ward-legend-i"><div className="ward-legend-sw" style={{background:"var(--d-1)",border:"1px dashed var(--line)"}}/>Trống</div>
        <div style={{flex:1}}/>
        <div className="ward-legend-i">Cập nhật tự động mỗi 15s từ monitor đầu giường</div>
      </div>
    </div>
  );
};

window.WardModule = WardModule;
