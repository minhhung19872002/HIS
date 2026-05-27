// =====================================================================
// HIS Terminal · Module: BÁO CÁO & PHÂN TÍCH v2 (Reports)
// BC ngày/tháng, KPI, drill-down, export
// =====================================================================

const REPORT_CATEGORIES = [
  { id: "operational", l: "Vận hành", icon: "activity", color: "var(--a-cy-text)" },
  { id: "clinical",    l: "Lâm sàng", icon: "stethoscope", color: "var(--a-em-text)" },
  { id: "financial",   l: "Tài chính", icon: "dollar", color: "var(--a-or-text)" },
  { id: "regulatory",  l: "Báo cáo BYT", icon: "shield", color: "var(--a-mg-text)" },
];

const REPORT_LIST = [
  // Vận hành
  { id: "RPT-001", cat: "operational", name: "Báo cáo lượt khám ngày", period: "Hằng ngày", lastRun: "06:00 hôm nay", schedule: "Tự động", scope: "Toàn viện", owner: "Phòng KHTH" },
  { id: "RPT-002", cat: "operational", name: "Tỷ lệ lấp đầy giường bệnh", period: "Hằng ngày", lastRun: "06:00 hôm nay", schedule: "Tự động", scope: "Khoa nội trú", owner: "Phòng KHTH" },
  { id: "RPT-003", cat: "operational", name: "Thời gian chờ khám OPD", period: "Tuần", lastRun: "T2 tuần này", schedule: "Tự động", scope: "Khoa khám bệnh", owner: "Phòng QLCL" },
  { id: "RPT-004", cat: "operational", name: "Báo cáo cấp cứu - Triage", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Khoa Cấp cứu", owner: "TK Cấp cứu" },
  { id: "RPT-005", cat: "operational", name: "Lịch trực và OT nhân sự", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Toàn viện", owner: "P. Tổ chức" },

  // Lâm sàng
  { id: "RPT-101", cat: "clinical", name: "Top 20 chẩn đoán phổ biến (ICD-10)", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Toàn viện", owner: "Phòng KHTH" },
  { id: "RPT-102", cat: "clinical", name: "Tỷ lệ tử vong trong viện", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Toàn viện", owner: "Phòng QLCL" },
  { id: "RPT-103", cat: "clinical", name: "Báo cáo phẫu thuật & thủ thuật", period: "Tuần", lastRun: "T2 tuần này", schedule: "Hàng tuần", scope: "Khoa Ngoại+Phẫu thuật", owner: "TK Ngoại" },
  { id: "RPT-104", cat: "clinical", name: "Tỷ lệ tái nhập viện 30 ngày", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Toàn viện", owner: "Phòng QLCL" },
  { id: "RPT-105", cat: "clinical", name: "Báo cáo nhiễm khuẩn bệnh viện", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Toàn viện", owner: "Khoa KSNK" },

  // Tài chính
  { id: "RPT-201", cat: "financial", name: "Doanh thu theo khoa", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Toàn viện", owner: "P. TCKT" },
  { id: "RPT-202", cat: "financial", name: "Công nợ BHYT", period: "Tuần", lastRun: "T2 tuần này", schedule: "Hàng tuần", scope: "Toàn viện", owner: "P. TCKT" },
  { id: "RPT-203", cat: "financial", name: "Báo cáo viện phí - Phương thức TT", period: "Hằng ngày", lastRun: "06:00 hôm nay", schedule: "Tự động", scope: "Quầy thu", owner: "P. TCKT" },
  { id: "RPT-204", cat: "financial", name: "Chi tiêu tồn kho dược phẩm", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Khoa Dược", owner: "TK Dược" },

  // BYT
  { id: "RPT-301", cat: "regulatory", name: "Báo cáo tháng - Bộ Y tế", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Toàn viện", owner: "Phòng KHTH" },
  { id: "RPT-302", cat: "regulatory", name: "BC bệnh truyền nhiễm (TT 54)", period: "Hằng ngày", lastRun: "06:00 hôm nay", schedule: "Tự động", scope: "Toàn viện", owner: "Khoa KSNK" },
  { id: "RPT-303", cat: "regulatory", name: "Báo cáo dịch vụ kỹ thuật", period: "Quý", lastRun: "01/10/2026", schedule: "Hàng quý", scope: "Toàn viện", owner: "P. KHTH" },
  { id: "RPT-304", cat: "regulatory", name: "Báo cáo BHYT giám định", period: "Tháng", lastRun: "01/10/2026", schedule: "Hàng tháng", scope: "Toàn viện", owner: "P. TCKT" },
];

function ReportsV2() {
  const [activeCat, setActiveCat] = uS("operational");
  const [search, setSearch] = uS("");
  const [period, setPeriod] = uS("month"); // day, week, month, year

  const filtered = REPORT_LIST.filter(r => {
    if (activeCat && r.cat !== activeCat) return false;
    if (search && !`${r.id} ${r.name} ${r.scope} ${r.owner}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const open = (r) => HUI.drawer(cx => <ReportDrawer r={r} cx={cx}/>);
  const exportCSV = () => tk("Đã xuất CSV", "success");

  // KPI snapshot for current period
  const kpiData = {
    visits: 1284,
    visitsTrend: +8.4,
    revenue: 2840000000,
    revenueTrend: +5.2,
    occupancy: 87,
    occupancyTrend: +2.1,
    avgWait: 24,
    avgWaitTrend: -3.5,
    surgeries: 47,
    surgeriesTrend: +12,
    ipdLOS: 4.8,
    ipdLOSTrend: -0.3,
    mortality: 0.42,
    mortalityTrend: -0.05,
    bhytClaim: 1850000000,
    bhytClaimTrend: +6.8,
  };
  const Trend = ({v, inverse}) => {
    const positive = inverse ? v < 0 : v > 0;
    return <span style={{fontSize:11,fontFamily:"var(--font-mono)",color:positive?"var(--a-em-text)":(v===0?"var(--t-3)":"var(--a-rd-text)")}}>{v>0?"▲":v<0?"▼":"─"} {Math.abs(v).toFixed(1)}%</span>;
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Báo cáo có sẵn", val: REPORT_LIST.length, sub: `${REPORT_CATEGORIES.length} nhóm` },
        { lbl: "Đã chạy hôm nay", val: 7, sub: "tự động", tone: "ok" },
        { lbl: "Lịch chạy", val: 4, sub: "trong 24h tới", tone: "info" },
        { lbl: "Báo cáo BYT", val: 4, sub: "định kỳ", tone: "info" },
        { lbl: "Cảnh báo dữ liệu", val: 0, sub: "không có", tone: "ok" },
      ]}/>

      {/* KPI Dashboard */}
      <div style={{padding:"14px 18px",borderTop:"1px solid var(--line)",borderBottom:"1px solid var(--line)",background:"var(--bg-1)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".5px",fontWeight:700}}>BẢNG KPI · {period === "day" ? "HÔM NAY" : period === "week" ? "TUẦN NÀY" : period === "month" ? "THÁNG 10/2026" : "NĂM 2026"}</div>
          <div style={{display:"flex",gap:0,border:"1px solid var(--line)",borderRadius:4,overflow:"hidden"}}>
            {[["day","Ngày"],["week","Tuần"],["month","Tháng"],["year","Năm"]].map(([v,l]) => (
              <button key={v} onClick={()=>setPeriod(v)} style={{padding:"4px 12px",background:period===v?"var(--bg-2)":"transparent",border:"none",borderRight:"1px solid var(--line)",cursor:"pointer",fontSize:11,fontFamily:"var(--font-mono)",color:period===v?"var(--t-0)":"var(--t-2)",fontWeight:period===v?700:400}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          <KpiCard label="Lượt khám" value={kpiData.visits.toLocaleString()} trend={<Trend v={kpiData.visitsTrend}/>} sub="vs kỳ trước"/>
          <KpiCard label="Doanh thu" value={fmtVNDg(kpiData.revenue)} trend={<Trend v={kpiData.revenueTrend}/>} sub="vs kỳ trước"/>
          <KpiCard label="Lấp đầy giường" value={`${kpiData.occupancy}%`} trend={<Trend v={kpiData.occupancyTrend}/>} sub="vs kỳ trước"/>
          <KpiCard label="Chờ khám TB" value={`${kpiData.avgWait} phút`} trend={<Trend v={kpiData.avgWaitTrend} inverse/>} sub="vs kỳ trước"/>
          <KpiCard label="Phẫu thuật" value={kpiData.surgeries} trend={<Trend v={kpiData.surgeriesTrend}/>} sub="ca thực hiện"/>
          <KpiCard label="LOS nội trú" value={`${kpiData.ipdLOS} ngày`} trend={<Trend v={kpiData.ipdLOSTrend} inverse/>} sub="trung bình"/>
          <KpiCard label="Tỷ lệ tử vong" value={`${kpiData.mortality}%`} trend={<Trend v={kpiData.mortalityTrend} inverse/>} sub="trong viện"/>
          <KpiCard label="Thanh quyết toán BHYT" value={fmtVNDg(kpiData.bhytClaim)} trend={<Trend v={kpiData.bhytClaimTrend}/>} sub="đã duyệt"/>
        </div>
      </div>

      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm báo cáo…"/>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={exportCSV}><Ico name="download" size={12}/> Xuất danh sách</button>
        <button className="ab-btn primary" onClick={()=>HUI.open(cx => <ScheduleModal cx={cx}/>)}><Ico name="plus" size={12}/> Tạo báo cáo mới</button>
      </div>

      {/* Categories */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid var(--line)",overflowX:"auto",background:"var(--bg-1)"}}>
        {REPORT_CATEGORIES.map(c => {
          const count = REPORT_LIST.filter(r => r.cat === c.id).length;
          const active = activeCat === c.id;
          return (
            <button key={c.id} onClick={()=>setActiveCat(c.id)} style={{padding:"10px 18px",background:active?"var(--bg-2)":"transparent",border:"none",borderBottom:active?`2px solid ${c.color}`:"2px solid transparent",cursor:"pointer",fontSize:13,color:active?"var(--t-0)":"var(--t-2)",fontWeight:active?700:500,display:"flex",alignItems:"center",gap:8,fontFamily:"var(--font-sans)"}}>
              <Ico name={c.icon} size={14} color={active?c.color:"var(--t-2)"}/>
              {c.l}
              <span className="ab-stat info" style={{height:18,padding:"0 6px",fontSize:10,marginLeft:4,background:active?c.color+"20":"var(--d-1)",color:active?c.color:"var(--t-2)",borderColor:"var(--line)"}}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Reports list */}
      <div style={{padding:14,display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
        {filtered.map(r => {
          const cat = REPORT_CATEGORIES.find(c => c.id === r.cat);
          return (
            <div key={r.id} onClick={()=>open(r)} style={{padding:"12px 14px",background:"var(--bg-1)",border:"1px solid var(--line)",borderRadius:6,cursor:"pointer",transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--t-2)";e.currentTarget.style.background="var(--bg-2)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line)";e.currentTarget.style.background="var(--bg-1)";}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <Ico name={cat.icon} size={14} color={cat.color}/>
                    <span style={{fontSize:10.5,color:"var(--t-3)",fontFamily:"var(--font-mono)",letterSpacing:".4px"}}>{r.id}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--t-0)",lineHeight:1.3}}>{r.name}</div>
                </div>
                <span className="ab-stat info" style={{height:20,padding:"0 8px",fontSize:10}}>{r.period}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:11.5,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>
                <div><span style={{color:"var(--t-3)"}}>Phạm vi:</span> {r.scope}</div>
                <div><span style={{color:"var(--t-3)"}}>Sở hữu:</span> {r.owner}</div>
                <div><span style={{color:"var(--t-3)"}}>Lần chạy:</span> {r.lastRun}</div>
                <div><span style={{color:"var(--t-3)"}}>Lịch:</span> {r.schedule}</div>
              </div>
              <div style={{display:"flex",gap:6,marginTop:10,paddingTop:8,borderTop:"1px dashed var(--line)"}}>
                <button className="ab-btn ghost" onClick={(e)=>{e.stopPropagation();tk("Đang chạy báo cáo…");}} style={{flex:1,fontSize:11.5}}><Ico name="play" size={12}/> Chạy ngay</button>
                <button className="ab-btn ghost" onClick={(e)=>{e.stopPropagation();tk("Đã xuất PDF");}} style={{flex:1,fontSize:11.5}}><Ico name="download" size={12}/> Tải PDF</button>
                <button className="ab-btn ghost" onClick={(e)=>{e.stopPropagation();open(r);}} style={{flex:1,fontSize:11.5}}><Ico name="eye" size={12}/> Xem</button>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{padding:"40px 18px",textAlign:"center",color:"var(--t-3)",fontSize:13}}>Không tìm thấy báo cáo phù hợp</div>
      )}
    </div>
  );
}

const KpiCard = ({ label, value, trend, sub }) => (
  <div style={{padding:"10px 12px",background:"var(--bg-2)",border:"1px solid var(--line)",borderRadius:6}}>
    <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>{label}</div>
    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
      <div style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{value}</div>
      {trend}
    </div>
    {sub && <div style={{fontSize:10,color:"var(--t-3)",fontFamily:"var(--font-mono)",marginTop:2}}>{sub}</div>}
  </div>
);

const ReportDrawer = ({ r, cx }) => {
  // Mock chart data
  const days = Array.from({length:30},(_,i)=>i+1);
  const values = days.map(() => 800 + Math.floor(Math.random()*600));
  const maxV = Math.max(...values);
  return (
    <HUI.Drawer title={r.name} sub={`${r.id} · ${REPORT_CATEGORIES.find(c=>c.id===r.cat).l}`} size="xl" onClose={cx} footer={<>
      <button className="ab-btn ghost" onClick={cx}>Đóng</button>
      <button className="ab-btn"><Ico name="settings" size={12}/> Cấu hình</button>
      <button className="ab-btn"><Ico name="refresh" size={12}/> Chạy lại</button>
      <button className="ab-btn"><Ico name="download" size={12}/> Tải Excel</button>
      <button className="ab-btn primary" onClick={()=>tk("Đang gửi email…")}><Ico name="send" size={12}/> Gửi báo cáo</button>
    </>}>
      <DrSec title="Tóm tắt báo cáo">
        <DrField lbl="Phạm vi">{r.scope}</DrField>
        <DrField lbl="Sở hữu">{r.owner}</DrField>
        <DrField lbl="Chu kỳ">{r.period}</DrField>
        <DrField lbl="Lịch chạy">{r.schedule}</DrField>
        <DrField lbl="Lần chạy gần nhất">{r.lastRun}</DrField>
        <DrField lbl="Số bản ghi">1.284 dòng dữ liệu</DrField>
      </DrSec>
      <DrSec title="Biểu đồ xu hướng (30 ngày qua)">
        <div style={{padding:"14px 12px",background:"var(--bg-1)",border:"1px solid var(--line)",borderRadius:6}}>
          <svg width="100%" height={200} viewBox="0 0 600 200" preserveAspectRatio="none" style={{display:"block"}}>
            {/* Grid */}
            {[0,1,2,3,4].map(i => <line key={i} x1={0} y1={i*45+10} x2={600} y2={i*45+10} stroke="var(--line)" strokeWidth={0.5} strokeDasharray="2 4"/>)}
            {/* Bars */}
            {values.map((v,i) => {
              const h = (v / maxV) * 170;
              const x = i * (600/30) + 2;
              const w = (600/30) - 4;
              return <rect key={i} x={x} y={190-h} width={w} height={h} fill="var(--a-cy-line)" opacity={0.7}/>;
            })}
            {/* Trend line */}
            <polyline points={values.map((v,i)=>`${i*(600/30)+(600/30)/2},${190-(v/maxV)*170}`).join(" ")} fill="none" stroke="var(--a-em-text)" strokeWidth={1.5}/>
          </svg>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"var(--t-3)",fontFamily:"var(--font-mono)"}}>
            <span>22/09</span><span>06/10</span><span>22/10</span>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:10}}>
          <div style={{padding:"8px 10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:4}}>
            <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Trung bình</div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{Math.round(values.reduce((s,x)=>s+x,0)/values.length).toLocaleString()}</div>
          </div>
          <div style={{padding:"8px 10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:4}}>
            <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Cao nhất</div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--a-em-text)"}}>{maxV.toLocaleString()}</div>
          </div>
          <div style={{padding:"8px 10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:4}}>
            <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Thấp nhất</div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--a-rd-text)"}}>{Math.min(...values).toLocaleString()}</div>
          </div>
          <div style={{padding:"8px 10px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:4}}>
            <div style={{fontSize:10,color:"var(--t-2)",fontFamily:"var(--font-mono)",textTransform:"uppercase"}}>Tổng</div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:"var(--font-mono)",color:"var(--t-0)"}}>{values.reduce((s,x)=>s+x,0).toLocaleString()}</div>
          </div>
        </div>
      </DrSec>
      <DrSec title="Top 5 khoa/phòng">
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {[["Khoa Nội",284,"#7DD3C0"],["Khoa Cấp cứu",218,"#E89999"],["Khoa Sản",176,"#C8B8E0"],["Khoa Tim mạch",148,"#FFB99B"],["Khoa Ngoại",112,"#94C9D6"]].map(([d,v,c],i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:"var(--bg-1)",border:"1px solid var(--line)",borderRadius:4}}>
              <span style={{width:140,fontSize:12.5,color:"var(--t-1)",fontWeight:500}}>{d}</span>
              <div style={{flex:1,height:14,background:"var(--d-1)",borderRadius:2,overflow:"hidden"}}>
                <div style={{width:`${v/284*100}%`,height:"100%",background:c}}/>
              </div>
              <span style={{width:50,textAlign:"right",fontSize:12,fontFamily:"var(--font-mono)",fontWeight:700,color:"var(--t-0)"}}>{v}</span>
            </div>
          ))}
        </div>
      </DrSec>
    </HUI.Drawer>
  );
};

const ScheduleModal = ({ cx }) => (
  <HUI.Modal title="Tạo báo cáo mới" size="md" onClose={cx} footer={<>
    <button className="ab-btn ghost" onClick={cx}>Hủy</button>
    <button className="ab-btn primary" onClick={()=>{cx();tk("Đã tạo báo cáo");}}><Ico name="check" size={12}/> Tạo & lưu</button>
  </>}>
    <div style={{padding:"14px 18px"}}>
      <HUI.Field label="Tên báo cáo" required><HUI.Input placeholder="VD: Báo cáo doanh thu khoa Nội"/></HUI.Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <HUI.Field label="Nhóm báo cáo" required><HUI.Select options={REPORT_CATEGORIES.map(c=>({value:c.id,label:c.l}))}/></HUI.Field>
        <HUI.Field label="Chu kỳ" required><HUI.Select options={[{value:"day",label:"Hằng ngày"},{value:"week",label:"Hàng tuần"},{value:"month",label:"Hàng tháng"},{value:"quarter",label:"Hàng quý"}]}/></HUI.Field>
      </div>
      <HUI.Field label="Phạm vi"><HUI.Select options={[{value:"all",label:"Toàn viện"},{value:"dept",label:"Theo khoa"},{value:"unit",label:"Đơn vị cụ thể"}]}/></HUI.Field>
      <HUI.Field label="Người sở hữu" required><HUI.Input placeholder="Phòng/khoa chịu trách nhiệm"/></HUI.Field>
      <HUI.Field label="Định dạng xuất"><HUI.Select options={[{value:"pdf",label:"PDF"},{value:"xlsx",label:"Excel (XLSX)"},{value:"csv",label:"CSV"}]}/></HUI.Field>
      <HUI.Field label="Email nhận"><HUI.Input placeholder="email1@..., email2@..."/></HUI.Field>
    </div>
  </HUI.Modal>
);

window.ReportsV2 = ReportsV2;
