// =====================================================================
// HIS Terminal · Module: PHÂN CA TRỰC v2 (Rota)
// Lịch trực tuần, đổi ca, OT, ca thiếu nhân lực
// =====================================================================

const SHIFT_TYPES = [
  { v: "morning", l: "Sáng", time: "07:00-15:00", color: "var(--a-cy-bg)", line: "var(--a-cy-line)", text: "var(--a-cy-text)" },
  { v: "evening", l: "Chiều", time: "15:00-23:00", color: "var(--a-or-bg)", line: "var(--a-or-line)", text: "var(--a-or-text)" },
  { v: "night",   l: "Đêm",   time: "23:00-07:00", color: "var(--a-mg-bg)", line: "var(--a-mg-line)", text: "var(--a-mg-text)" },
  { v: "off",     l: "Nghỉ",  time: "—",            color: "var(--d-1)",    line: "var(--line)",     text: "var(--t-3)" },
];

const STAFF_LIST = [
  { id: "BS001", name: "BS. Nguyễn Văn Hùng", role: "Trưởng khoa", dept: "Tim mạch", quota: 6 },
  { id: "BS002", name: "BS. Trần Thị Lan",    role: "Bác sĩ chính", dept: "Tim mạch", quota: 6 },
  { id: "BS003", name: "BS. Lê Quốc Anh",      role: "Bác sĩ",     dept: "Nội", quota: 7 },
  { id: "BS004", name: "BS. Phạm Hữu Nam",    role: "Bác sĩ",     dept: "Cấp cứu", quota: 8 },
  { id: "BS005", name: "BS. Đỗ Thanh Hà",      role: "Bác sĩ",     dept: "Sản", quota: 6 },
  { id: "ĐD001", name: "ĐD. Vũ Thuỳ Linh",   role: "Trưởng ĐD",  dept: "Tim mạch", quota: 7 },
  { id: "ĐD002", name: "ĐD. Bùi Mai Hương", role: "Điều dưỡng", dept: "Nội", quota: 8 },
  { id: "ĐD003", name: "ĐD. Trần Văn Thái",  role: "Điều dưỡng", dept: "Cấp cứu", quota: 8 },
  { id: "ĐD004", name: "ĐD. Lý Thuý Vy",      role: "Điều dưỡng", dept: "Sản", quota: 7 },
  { id: "ĐD005", name: "ĐD. Hoàng Thị Bích", role: "Điều dưỡng", dept: "Hồi sức", quota: 8 },
  { id: "KTV01", name: "KTV. Phan Đăng",     role: "KTV xét nghiệm", dept: "LIS", quota: 6 },
  { id: "KTV02", name: "KTV. Tô Anh Đức",   role: "KTV chẩn đoán hình ảnh", dept: "RIS", quota: 6 },
];

const DAYS = ["T2","T3","T4","T5","T6","T7","CN"];
const seedRota = () => {
  const grid = {};
  STAFF_LIST.forEach(s => {
    grid[s.id] = DAYS.map((_, di) => {
      if (s.role === "Trưởng khoa" || s.role === "Trưởng ĐD") return di === 6 ? "off" : "morning";
      const r = Math.random();
      if (r < 0.45) return "morning";
      if (r < 0.7) return "evening";
      if (r < 0.85) return "night";
      return "off";
    });
  });
  return grid;
};

function RotaV2() {
  const [week, setWeek] = uS(43); // tuần thứ 43 năm 2026
  const [rota, setRota] = uS(seedRota());
  const [fDept, setFDept] = uS("");
  const [search, setSearch] = uS("");
  const [pendingChanges, setPendingChanges] = uS([
    { id: "CH001", from: "BS003", to: "BS002", date: "2026-10-23", shift: "night", reason: "Việc gia đình", status: "pending" },
    { id: "CH002", from: "ĐD002", to: "ĐD005", date: "2026-10-25", shift: "evening", reason: "Khám sức khoẻ", status: "pending" },
  ]);

  const visible = STAFF_LIST.filter(s => {
    if (fDept && s.dept !== fDept) return false;
    if (search && !`${s.name} ${s.id} ${s.role}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Counts per day per shift type
  const dayStats = DAYS.map((_, di) => {
    const counts = { morning: 0, evening: 0, night: 0, off: 0 };
    visible.forEach(s => counts[rota[s.id][di]]++);
    return counts;
  });

  const totalShifts = (sid) => {
    const arr = rota[sid] || [];
    return arr.filter(x => x !== "off").length;
  };
  const otDays = (sid) => {
    const arr = rota[sid] || [];
    const total = totalShifts(sid);
    const quota = STAFF_LIST.find(s => s.id === sid).quota;
    return Math.max(0, total - quota);
  };

  const cycleShift = (sid, di) => {
    setRota(prev => {
      const arr = [...prev[sid]];
      const idx = SHIFT_TYPES.findIndex(s => s.v === arr[di]);
      arr[di] = SHIFT_TYPES[(idx+1) % 4].v;
      return { ...prev, [sid]: arr };
    });
  };

  const openSwap = () => HUI.open(cx => <SwapModal cx={cx} onSubmit={(req)=>{setPendingChanges(p=>[...p,req]);cx();tk("Đã gửi yêu cầu đổi ca");}}/>);
  const openStaffDetail = (s) => HUI.drawer(cx => <StaffShiftDrawer s={s} rota={rota[s.id]} cx={cx} totalShifts={totalShifts(s.id)} otDays={otDays(s.id)}/>);
  const approveSwap = (id) => { setPendingChanges(p => p.map(r => r.id === id ? { ...r, status: "approved" } : r)); tk("Đã duyệt đổi ca", "success"); };
  const rejectSwap = (id) => HUI.confirm("Từ chối yêu cầu?","Yêu cầu sẽ bị huỷ.",()=>{setPendingChanges(p=>p.filter(r=>r.id!==id));tk("Đã từ chối","warn");},"warn");

  const totalPlanned = visible.reduce((s, st) => s + totalShifts(st.id), 0);
  const totalQuota = visible.reduce((s, st) => s + st.quota, 0);
  const totalOT = visible.reduce((s, st) => s + otDays(st.id), 0);
  const understaffed = dayStats.filter(d => d.morning + d.evening + d.night < 6).length;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Nhân sự", val: visible.length, sub: `${[...new Set(visible.map(s=>s.dept))].length} khoa` },
        { lbl: "Ca đã xếp", val: totalPlanned, sub: `/${totalQuota} quota`, tone: "info" },
        { lbl: "Ngày OT", val: totalOT, sub: "vượt quota", tone: totalOT > 5 ? "warn" : "ok" },
        { lbl: "Yêu cầu đổi", val: pendingChanges.filter(c => c.status === "pending").length, sub: "chờ duyệt", tone: "warn" },
        { lbl: "Ca thiếu", val: understaffed, sub: "<6 NS/ngày", tone: understaffed > 0 ? "danger" : "ok" },
        { lbl: "Tuần", val: `T${week}/2026`, sub: "20-26/10/2026" },
      ]}/>
      <div className="ab-toolbar" style={{borderTop:"1px solid var(--line)"}}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm nhân sự…"/>
        <Filter value={fDept} onChange={setFDept} options={[...new Set(STAFF_LIST.map(s=>s.dept))].map(d=>({v:d,l:d}))} placeholder="▾ Khoa"/>
        <button className="ab-btn ghost" onClick={()=>setWeek(w=>w-1)}><Ico name="left" size={12}/> Tuần trước</button>
        <button className="ab-btn ghost" onClick={()=>setWeek(w=>w+1)}>Tuần sau <Ico name="right" size={12}/></button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={openSwap}><Ico name="refresh" size={12}/> Yêu cầu đổi ca</button>
        <button className="ab-btn ghost" onClick={()=>tk("Đã sao chép từ tuần trước")}><Ico name="copy" size={12}/> Copy tuần trước</button>
        <button className="ab-btn ghost" onClick={()=>tk("Đã xuất Excel")}><Ico name="download" size={12}/> Xuất Excel</button>
        <button className="ab-btn primary" onClick={()=>tk("Đã chốt lịch trực","success")}><Ico name="check" size={12}/> Chốt tuần</button>
      </div>

      <div className="ab-content" style={{padding:0}}>
        {/* Pending swap requests */}
        {pendingChanges.filter(c => c.status === "pending").length > 0 && (
          <div style={{padding:"10px 14px",background:"var(--a-or-bg)",borderBottom:"1px solid var(--a-or-line)"}}>
            <div style={{fontSize:11,color:"var(--a-or-text)",fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,fontWeight:700}}>YÊU CẦU ĐỔI CA CHỜ DUYỆT</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {pendingChanges.filter(c => c.status === "pending").map(c => {
                const fromS = STAFF_LIST.find(s => s.id === c.from);
                const toS = STAFF_LIST.find(s => s.id === c.to);
                const sh = SHIFT_TYPES.find(s => s.v === c.shift);
                return (
                  <div key={c.id} style={{padding:"6px 10px",background:"var(--bg-1)",borderRadius:4,display:"flex",alignItems:"center",gap:10,fontSize:12.5,border:"1px solid var(--line)"}}>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--t-3)"}}>{c.id}</span>
                    <span><b>{fromS.name}</b> → <b>{toS.name}</b></span>
                    <span style={{color:"var(--t-2)"}}>· Ca {sh.l} · {fmtDMYg(new Date(c.date))} · "{c.reason}"</span>
                    <span className="spacer"/>
                    <button className="ab-btn ghost" onClick={()=>rejectSwap(c.id)}><Ico name="x" size={12}/></button>
                    <button className="ab-btn primary" onClick={()=>approveSwap(c.id)}><Ico name="check" size={12}/> Duyệt</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rota grid */}
        <div style={{padding:0,overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",width:"100%",minWidth:1100,fontFamily:"var(--font-sans)",fontSize:13}}>
            <thead>
              <tr style={{background:"var(--bg-2)",borderBottom:"2px solid var(--line)"}}>
                <th style={{padding:"10px 14px",textAlign:"left",fontSize:10,color:"var(--t-2)",textTransform:"uppercase",fontFamily:"var(--font-mono)",letterSpacing:".5px",width:280,position:"sticky",left:0,background:"var(--bg-2)",zIndex:1}}>Nhân sự</th>
                {DAYS.map((d,i) => (
                  <th key={d} style={{padding:"10px 8px",textAlign:"center",fontSize:11,color:"var(--t-1)",fontFamily:"var(--font-mono)",fontWeight:700,minWidth:115}}>
                    {d}<div style={{fontSize:10,color:"var(--t-3)",fontWeight:400}}>{20+i}/10</div>
                  </th>
                ))}
                <th style={{padding:"10px 8px",textAlign:"center",fontSize:10,color:"var(--t-2)",textTransform:"uppercase",fontFamily:"var(--font-mono)",letterSpacing:".5px",width:75}}>Ca</th>
                <th style={{padding:"10px 8px",textAlign:"center",fontSize:10,color:"var(--t-2)",textTransform:"uppercase",fontFamily:"var(--font-mono)",letterSpacing:".5px",width:60}}>OT</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(s => {
                const total = totalShifts(s.id);
                const ot = otDays(s.id);
                return (
                  <tr key={s.id} style={{borderBottom:"1px solid var(--line)"}}>
                    <td style={{padding:"6px 14px",position:"sticky",left:0,background:"var(--bg-1)",zIndex:1,borderRight:"1px solid var(--line)",cursor:"pointer"}} onClick={()=>openStaffDetail(s)}>
                      <div style={{fontWeight:600,color:"var(--t-0)",fontSize:13}}>{s.name}</div>
                      <div style={{fontSize:10.5,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>{s.id} · {s.role} · {s.dept}</div>
                    </td>
                    {rota[s.id].map((shift, di) => {
                      const sh = SHIFT_TYPES.find(x => x.v === shift);
                      return (
                        <td key={di} style={{padding:4,textAlign:"center"}}>
                          <button onClick={()=>cycleShift(s.id,di)} style={{width:"100%",padding:"8px 4px",background:sh.color,border:`1px solid ${sh.line}`,borderRadius:3,cursor:"pointer",fontFamily:"var(--font-mono)",fontWeight:700,fontSize:11,color:sh.text,textTransform:"uppercase",letterSpacing:".3px"}}>
                            {sh.l}<div style={{fontSize:9.5,fontWeight:400,opacity:.9,marginTop:1}}>{sh.time}</div>
                          </button>
                        </td>
                      );
                    })}
                    <td style={{textAlign:"center",fontFamily:"var(--font-mono)",fontWeight:700,fontSize:14,color:total > s.quota ? "var(--a-or-text)" : "var(--t-1)"}}>{total}/{s.quota}</td>
                    <td style={{textAlign:"center",fontFamily:"var(--font-mono)",fontWeight:700,fontSize:14,color:ot > 0 ? "var(--a-or-text)" : "var(--t-3)"}}>{ot > 0 ? `+${ot}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:"var(--bg-2)",borderTop:"2px solid var(--line)"}}>
                <td style={{padding:"8px 14px",fontSize:10,color:"var(--t-2)",textTransform:"uppercase",fontFamily:"var(--font-mono)",letterSpacing:".5px",fontWeight:700,position:"sticky",left:0,background:"var(--bg-2)"}}>Σ NS theo ca</td>
                {dayStats.map((s,i) => {
                  const total = s.morning + s.evening + s.night;
                  return (
                    <td key={i} style={{padding:"6px 4px",fontSize:11,fontFamily:"var(--font-mono)",textAlign:"center"}}>
                      <div style={{display:"flex",justifyContent:"center",gap:4}}>
                        <span title="Sáng" style={{color:"var(--a-cy-text)",fontWeight:700}}>{s.morning}</span>
                        <span style={{color:"var(--t-3)"}}>·</span>
                        <span title="Chiều" style={{color:"var(--a-or-text)",fontWeight:700}}>{s.evening}</span>
                        <span style={{color:"var(--t-3)"}}>·</span>
                        <span title="Đêm" style={{color:"var(--a-mg-text)",fontWeight:700}}>{s.night}</span>
                      </div>
                      <div style={{fontSize:10,color:total<6?"var(--a-rd-text)":"var(--t-2)",fontWeight:700,marginTop:2}}>Σ {total}{total<6 && " ⚠"}</div>
                    </td>
                  );
                })}
                <td colSpan={2}/>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div style={{padding:"10px 14px",borderTop:"1px solid var(--line)",display:"flex",gap:14,fontSize:11.5,color:"var(--t-2)",alignItems:"center"}}>
          <span style={{fontFamily:"var(--font-mono)",textTransform:"uppercase",fontSize:10,letterSpacing:".5px"}}>Chú thích:</span>
          {SHIFT_TYPES.map(s => (
            <span key={s.v} style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{display:"inline-block",width:14,height:14,background:s.color,border:`1px solid ${s.line}`,borderRadius:2}}/>
              <span><b>{s.l}</b> {s.time !== "—" && <span style={{color:"var(--t-3)",fontFamily:"var(--font-mono)"}}>{s.time}</span>}</span>
            </span>
          ))}
          <span className="spacer"/>
          <span style={{color:"var(--t-3)"}}>Click ô để đổi ca · Click tên để xem chi tiết</span>
        </div>
      </div>
    </div>
  );
}

const SwapModal = ({ cx, onSubmit }) => {
  const [from, setFrom] = uS("");
  const [to, setTo] = uS("");
  const [date, setDate] = uS("");
  const [shift, setShift] = uS("morning");
  const [reason, setReason] = uS("");
  return (
    <HUI.Modal title="Yêu cầu đổi ca" size="md" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Hủy</button>
      <button className="ab-btn primary" disabled={!from||!to||!date||!reason} onClick={()=>onSubmit({id:`CH${Math.random().toString(36).slice(2,5).toUpperCase()}`,from,to,date,shift,reason,status:"pending"})}><Ico name="check" size={12}/> Gửi yêu cầu</button>
    </>}>
      <div style={{padding:"14px 18px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <HUI.Field label="Người trực" required><HUI.Select value={from} onChange={setFrom} options={[{value:"",label:"-- Chọn --"},...STAFF_LIST.map(s=>({value:s.id,label:s.name}))]}/></HUI.Field>
          <HUI.Field label="Người thay" required><HUI.Select value={to} onChange={setTo} options={[{value:"",label:"-- Chọn --"},...STAFF_LIST.map(s=>({value:s.id,label:s.name}))]}/></HUI.Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <HUI.Field label="Ngày" required><HUI.Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></HUI.Field>
          <HUI.Field label="Ca" required><HUI.Select value={shift} onChange={setShift} options={SHIFT_TYPES.filter(s=>s.v!=="off").map(s=>({value:s.v,label:`${s.l} (${s.time})`}))}/></HUI.Field>
        </div>
        <HUI.Field label="Lý do" required><HUI.Textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Mô tả lý do cần đổi ca…"/></HUI.Field>
      </div>
    </HUI.Modal>
  );
};

const StaffShiftDrawer = ({ s, rota, cx, totalShifts, otDays }) => (
  <HUI.Drawer title={s.name} sub={`${s.id} · ${s.role} · ${s.dept}`} size="md" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Đóng</button>
    <button className="ab-btn"><Ico name="user" size={12}/> Hồ sơ NS</button>
    <button className="ab-btn primary"><Ico name="edit" size={12}/> Sửa lịch</button>
  </>}>
    <DrSec title="Tuần này">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
        <div style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,textAlign:"center"}}>
          <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Ca/quota</div>
          <div style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-mono)",color:totalShifts>s.quota?"var(--a-or-text)":"var(--t-0)"}}>{totalShifts}/{s.quota}</div>
        </div>
        <div style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,textAlign:"center"}}>
          <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>OT</div>
          <div style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-mono)",color:otDays>0?"var(--a-or-text)":"var(--t-0)"}}>+{otDays}</div>
        </div>
        <div style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,textAlign:"center"}}>
          <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Ngày nghỉ</div>
          <div style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{rota.filter(x=>x==="off").length}</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {DAYS.map((d,i) => {
          const sh = SHIFT_TYPES.find(x => x.v === rota[i]);
          return (
            <div key={d} style={{padding:"8px 4px",background:sh.color,border:`1px solid ${sh.line}`,borderRadius:3,textAlign:"center",fontSize:11,fontFamily:"var(--font-mono)"}}>
              <div style={{color:"var(--t-2)",fontSize:10}}>{d}</div>
              <div style={{fontWeight:700,color:sh.text,marginTop:2}}>{sh.l}</div>
            </div>
          );
        })}
      </div>
    </DrSec>
    <DrSec title="Thống kê tháng 10/2026">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
        <div style={{padding:"6px 10px",background:"var(--bg-1)",border:"1px solid var(--line)",borderRadius:4,display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--t-2)"}}>Tổng ca:</span><b style={{fontFamily:"var(--font-mono)"}}>22</b></div>
        <div style={{padding:"6px 10px",background:"var(--bg-1)",border:"1px solid var(--line)",borderRadius:4,display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--t-2)"}}>Ca đêm:</span><b style={{fontFamily:"var(--font-mono)"}}>5</b></div>
        <div style={{padding:"6px 10px",background:"var(--bg-1)",border:"1px solid var(--line)",borderRadius:4,display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--t-2)"}}>OT:</span><b style={{fontFamily:"var(--font-mono)",color:"var(--a-or-text)"}}>+3 ngày</b></div>
        <div style={{padding:"6px 10px",background:"var(--bg-1)",border:"1px solid var(--line)",borderRadius:4,display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--t-2)"}}>Phép:</span><b style={{fontFamily:"var(--font-mono)"}}>1 ngày</b></div>
      </div>
    </DrSec>
  </HUI.Drawer>
);

window.RotaV2 = RotaV2;
