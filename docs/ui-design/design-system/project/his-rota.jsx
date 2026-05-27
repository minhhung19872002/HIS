// HIS Staff Rota / Lịch trực
const { useState: useRs } = React;

const RotaModule = () => {
  const [dept, setDept] = useRs("Nội TQ");

  // Week: 20-26/10/2026, today = 23/10 (Thu, day index 3)
  const days = [
    {d:20, n:"T2", date:"T2 20/10", wk:false},
    {d:21, n:"T3", date:"T3 21/10", wk:false},
    {d:22, n:"T4", date:"T4 22/10", wk:false},
    {d:23, n:"T5", date:"T5 23/10", wk:false, today:true},
    {d:24, n:"T6", date:"T6 24/10", wk:false},
    {d:25, n:"T7", date:"T7 25/10", wk:true},
    {d:26, n:"CN", date:"CN 26/10", wk:true},
  ];

  // Shift types:
  // m = Sáng 07-15, a = Chiều 15-23, n = Đêm 23-07
  // d = Trực 24h, o = Nghỉ, l = Phép, e = Đào tạo
  const rosterByDept = {
    "Nội TQ": [
      {nm:"TS.BS Nguyễn Hoài Linh", ro:"Trưởng khoa", sh:["m","m","m","m","m","o","d"]},
      {nm:"BS. Trần Thu Hương", ro:"BS. chính", sh:["m","m","d","m","m","a","o"]},
      {nm:"BS. Đỗ Văn Tiến", ro:"BS. điều trị", sh:["a","a","m","a","a","o","m"]},
      {nm:"BS. Lê Quốc Hùng", ro:"BS. điều trị", sh:["o","m","m","n","n","n","o"]},
      {nm:"BS. Phạm Minh", ro:"BS. nội trú", sh:["m","o","a","m","l","l","l"]},
      {nm:"ĐDT. Nguyễn Thu Trang", ro:"ĐD trưởng", sh:["m","m","m","m","m","o","o"]},
      {nm:"ĐD. Trần Mai Anh", ro:"Điều dưỡng", sh:["m","a","n","m","a","d","o"]},
      {nm:"ĐD. Phạm Thu Hà", ro:"Điều dưỡng", sh:["n","o","m","a","n","o","m"]},
      {nm:"ĐD. Lê Thị Mây", ro:"Điều dưỡng", sh:["a","m","o","n","m","a","n"]},
      {nm:"ĐD. Vũ Thị Linh", ro:"Điều dưỡng", sh:["o","n","a","m","o","m","a"]},
      {nm:"HS. Đỗ Thị Kim", ro:"Hộ lý", sh:["m","m","m","m","m","o","o"]},
    ],
    "Ngoại CT": [
      {nm:"TS.BS Trần Văn Khải", ro:"Trưởng khoa", sh:["m","m","m","e","e","o","d"]},
      {nm:"BS. Nguyễn Tiến Hùng", ro:"PT viên", sh:["m","m","m","m","m","d","o"]},
      {nm:"BS. Lê Văn Phong", ro:"PT viên", sh:["m","m","m","a","m","o","m"]},
      {nm:"BS. Vũ Đức Dũng", ro:"PT viên", sh:["a","a","a","m","a","o","o"]},
      {nm:"ĐD. Hoàng Thu", ro:"ĐD trưởng", sh:["m","m","m","m","m","o","o"]},
      {nm:"ĐD. Nguyễn Lan", ro:"Điều dưỡng", sh:["m","a","n","m","d","o","o"]},
      {nm:"ĐD. Bùi Hoa", ro:"Điều dưỡng", sh:["n","o","m","a","n","a","o"]},
    ],
    "Sản PK": [
      {nm:"BS. Vũ Thu Mai", ro:"Trưởng khoa", sh:["m","m","m","m","m","o","d"]},
      {nm:"BS. Phạm Thu Hà", ro:"BS. điều trị", sh:["m","m","d","m","m","a","o"]},
      {nm:"BS. Nguyễn Trang", ro:"BS. điều trị", sh:["a","a","m","a","a","m","o"]},
      {nm:"ĐD. Lê Huyền", ro:"NHS trưởng", sh:["m","m","m","m","m","o","o"]},
      {nm:"ĐD. Trần Ngọc", ro:"Nữ hộ sinh", sh:["m","a","n","m","a","d","o"]},
      {nm:"ĐD. Đặng Chi", ro:"Nữ hộ sinh", sh:["n","o","m","a","n","o","m"]},
    ],
    "CC / ER": [
      {nm:"BS. Nguyễn Minh Quang", ro:"Trưởng CC", sh:["d","o","m","m","d","o","m"]},
      {nm:"BS. Trần Thu (BS trực)", ro:"BS. CC", sh:["n","m","n","d","m","d","n"]},
      {nm:"BS. Lê Hùng", ro:"BS. CC", sh:["m","d","a","m","n","m","d"]},
      {nm:"BS. Bùi An", ro:"BS. CC nội trú", sh:["a","n","o","a","a","n","o"]},
      {nm:"ĐD. Phạm Hoa", ro:"ĐD trưởng CC", sh:["m","m","m","m","m","o","o"]},
      {nm:"ĐD. Ngô Quỳnh", ro:"Điều dưỡng CC", sh:["m","a","n","d","m","a","n"]},
      {nm:"ĐD. Đỗ Thảo", ro:"Điều dưỡng CC", sh:["n","m","o","n","a","d","m"]},
    ],
    "ICU / HSCC": [
      {nm:"TS.BS Lê Quốc An", ro:"Trưởng HSCC", sh:["m","m","m","m","e","o","d"]},
      {nm:"BS. Phạm Nghĩa", ro:"BS. HSCC", sh:["m","d","a","m","m","o","n"]},
      {nm:"BS. Vũ Khanh", ro:"BS. HSCC", sh:["n","m","n","d","a","d","m"]},
      {nm:"BS. Nguyễn Hải", ro:"BS. HSCC", sh:["a","n","m","n","m","a","o"]},
      {nm:"ĐD. Trần Minh", ro:"ĐD trưởng ICU", sh:["m","m","m","m","m","o","o"]},
      {nm:"ĐD. Hoàng Linh", ro:"Điều dưỡng ICU", sh:["m","a","d","m","n","o","a"]},
      {nm:"ĐD. Lê Kim", ro:"Điều dưỡng ICU", sh:["n","m","o","a","d","m","n"]},
      {nm:"ĐD. Bùi Hằng", ro:"Điều dưỡng ICU", sh:["o","n","m","n","a","n","d"]},
    ],
  };

  const depts = Object.keys(rosterByDept);
  const roster = rosterByDept[dept];

  const shLabel = {
    m: ["Sáng", "07:00–15:00"],
    a: ["Chiều", "15:00–23:00"],
    n: ["Đêm", "23:00–07:00"],
    d: ["Trực 24h", "07:00–07:00"],
    o: ["Nghỉ", ""],
    l: ["Phép", ""],
    e: ["Đào tạo", ""],
  };

  // Calc stats
  const hoursPerStaff = roster.map(s => {
    const h = s.sh.reduce((acc,x) => acc + (x==="m"||x==="a"||x==="n"?8:x==="d"?24:0), 0);
    return {...s, h};
  });

  // Coverage per day (count of present = m,a,n,d per day)
  const coverageByDay = days.map((_,di) => roster.filter(r => ["m","a","n","d"].includes(r.sh[di])).length);

  const conflicts = [
    {w:false, who:"BS. Phạm Minh", issue:"3 ngày phép liên tiếp T6-CN chưa có BS thay", when:"T6 24/10 – CN 26/10"},
    {w:true,  who:"ĐD. Trần Mai Anh", issue:"Đêm T4 → Sáng T5 (thiếu 8h nghỉ quy định)", when:"22→23/10"},
    {w:true,  who:"BS. Trần Thu", issue:"Đã trực 3 ca trong tuần · vượt khuyến cáo", when:"Tuần 43"},
  ];

  const totalHours = hoursPerStaff.reduce((a,b)=>a+b.h,0);
  const avgHours = (totalHours/hoursPerStaff.length).toFixed(1);
  const understaffedDays = coverageByDay.filter(c => c < 5).length;

  return (
    <div className="ro-wrap">
      <div className="ro-top">
        <div className="week">
          Tuần 43 · 20/10 – 26/10/2026
          <small>1 tuần trước · 1 tuần sau →</small>
        </div>
        <div style={{flex:1}}/>
        <div className="dept-tabs">
          {depts.map(d => (
            <button key={d} className={d===dept?"a":""} onClick={()=>setDept(d)}>{d}</button>
          ))}
        </div>
        <button className="btn">📋 Mẫu</button>
        <button className="btn">📊 Xuất Excel</button>
        <button className="btn primary">+ Thêm ca trực</button>
      </div>

      <div className="ro-kpis">
        <div className="ro-kpi">
          <div className="l">Nhân viên · Khoa</div>
          <div className="v">{roster.length}</div>
          <div className="s">{dept}</div>
        </div>
        <div className="ro-kpi">
          <div className="l">Tổng giờ tuần</div>
          <div className="v">{totalHours}h</div>
          <div className="s">TB {avgHours}h/người</div>
        </div>
        <div className="ro-kpi ok">
          <div className="l">Hôm nay trực</div>
          <div className="v">{coverageByDay[3]}</div>
          <div className="s">T5 23/10 · ca sáng</div>
        </div>
        <div className="ro-kpi warn">
          <div className="l">Ngày thiếu người</div>
          <div className="v">{understaffedDays}</div>
          <div className="s">&lt; 5 NV / ca</div>
        </div>
        <div className="ro-kpi crit">
          <div className="l">Cảnh báo xung đột</div>
          <div className="v">{conflicts.length}</div>
          <div className="s">cần xử lý</div>
        </div>
      </div>

      <div className="ro-body">
        <div className="ro-main">
          <div className="ro-grid-wrap">
            <div className="ro-grid-h">
              <div className="t">Lịch trực – {dept}</div>
              <div style={{flex:1}}/>
              <div className="s">Kéo-thả để di chuyển ca · click để sửa</div>
            </div>
            <div className="ro-grid">
              <table>
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    {days.map(d => (
                      <th key={d.d} className={d.today?"today":d.wk?"weekend":""}>
                        <div className="dn">{d.n} <small>{d.d}/10</small></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hoursPerStaff.map((s,si) => (
                    <tr key={s.nm}>
                      <td className="staff-cell">
                        <div className="nm">{s.nm}</div>
                        <div className="ro">{s.ro} · {s.h}h tuần</div>
                      </td>
                      {s.sh.map((x, di) => (
                        <td key={di} className={days[di].today?"today":""}>
                          <div className={"sh " + x + ((si===6 && di===3)||(si===1 && di===2)?" conflict":"")}>
                            <span>{shLabel[x][0]}</span>
                            <span className="time">{shLabel[x][1]}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ro-legend">
              <span className="it"><span className="sw" style={{background:"#fff7e6",borderColor:"#f59e0b"}}/>Sáng 07–15</span>
              <span className="it"><span className="sw" style={{background:"#e0f2fe",borderColor:"#0284c7"}}/>Chiều 15–23</span>
              <span className="it"><span className="sw" style={{background:"#ede9fe",borderColor:"#7c3aed"}}/>Đêm 23–07</span>
              <span className="it"><span className="sw" style={{background:"#fee2e2",borderColor:"#dc2626"}}/>Trực 24h</span>
              <span className="it"><span className="sw" style={{background:"#f1f5f9",borderColor:"#cbd5e1"}}/>Nghỉ</span>
              <span className="it"><span className="sw" style={{background:"#fef3c7",borderColor:"#d97706"}}/>Phép</span>
              <span className="it"><span className="sw" style={{background:"#fce7f3",borderColor:"#db2777"}}/>Đào tạo</span>
              <span style={{marginLeft:"auto",color:"var(--s-crit)",fontWeight:500}}>⚠ Ô nháy đỏ = xung đột lịch</span>
            </div>
          </div>

          <div className="ro-grid-wrap">
            <div className="ro-grid-h">
              <div className="t">Phân bổ giờ làm · theo tuần</div>
              <div className="s" style={{marginLeft:"auto"}}>Vạch tham chiếu: 40h (tối đa theo luật LĐ: 48h + phụ trội)</div>
            </div>
            {hoursPerStaff.slice(0,8).map(s => {
              const pct = Math.min((s.h/60)*100, 100);
              const cls = s.h > 48 ? "over" : s.h > 40 ? "high" : "";
              return (
                <div className="ro-hours" key={s.nm}>
                  <div className="row">
                    <span className="nm">{s.nm} <span style={{color:"var(--t-2)",fontWeight:400,fontSize:11}}>· {s.ro}</span></span>
                    <span className="v">{s.h}h / 40h{s.h>48?" ⚠":""}</span>
                  </div>
                  <div className="bar">
                    <div className={"fill " + cls} style={{width: pct+"%"}}/>
                    <div className="ref" style={{left: (40/60*100)+"%"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="ro-side">
          <div className="ro-card">
            <div className="ro-card-h">
              <span>⚡ Đang trực · hôm nay 10:24</span>
              <span className="n">Ca sáng</span>
            </div>
            {roster.filter(r => ["m","d"].includes(r.sh[3])).slice(0,8).map(r => (
              <div className="ro-now" key={r.nm}>
                <div className="av">{r.nm.split(" ").slice(-1)[0][0]}</div>
                <div>
                  <div className="nm">{r.nm}</div>
                  <div className="ro">{r.ro}</div>
                </div>
                <span className={"st " + r.sh[3]}>{r.sh[3]==="m"?"SÁNG":"TRỰC 24H"}</span>
              </div>
            ))}
          </div>

          <div className="ro-card">
            <div className="ro-card-h">
              <span>🚨 Cảnh báo xung đột</span>
              <span className="n">{conflicts.length} mục</span>
            </div>
            {conflicts.map((c,i) => (
              <div className="ro-confl" key={i}>
                <div className={"ic " + (c.w?"w":"")}>!</div>
                <div>
                  <div className="hd">{c.who}</div>
                  <div style={{fontSize:11,color:"var(--t-1)",marginTop:2}}>{c.issue}</div>
                  <div className="dt">{c.when}</div>
                </div>
                <button>Sửa</button>
              </div>
            ))}
          </div>

          <div className="ro-card">
            <div className="ro-card-h">
              <span>Hành động nhanh</span>
            </div>
            <div className="ro-card-body">
              <div className="ro-qa">
                <button>
                  <span className="ic">📋</span>
                  Sao chép tuần trước
                  <span className="k">⌘ D</span>
                </button>
                <button>
                  <span className="ic">🔄</span>
                  Đổi ca 2 NV
                  <span className="k">⌘ S</span>
                </button>
                <button>
                  <span className="ic">🏖️</span>
                  Duyệt đơn phép
                  <span className="k">3 chờ</span>
                </button>
                <button>
                  <span className="ic">📞</span>
                  Gọi NV thay
                  <span className="k">F8</span>
                </button>
                <button>
                  <span className="ic">🤖</span>
                  Tự động sinh lịch
                  <span className="k">AI gợi ý</span>
                </button>
                <button>
                  <span className="ic">📤</span>
                  Gửi thông báo NV
                  <span className="k">SMS/Zalo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.RotaModule = RotaModule;
