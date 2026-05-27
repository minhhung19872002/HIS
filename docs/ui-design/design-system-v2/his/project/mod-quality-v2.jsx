// =====================================================================
// HIS Terminal · Module: CHẤT LƯỢNG BV (Quality v2)
// =====================================================================
const QL_INDICATORS = [
  { code: "CL.001", name: "Tỷ lệ hài lòng BN ngoại trú", target: 90, current: 92.4, unit: "%", trend: "up", group: "Hài lòng người bệnh" },
  { code: "CL.002", name: "Tỷ lệ hài lòng BN nội trú", target: 85, current: 88.1, unit: "%", trend: "up", group: "Hài lòng người bệnh" },
  { code: "CL.003", name: "Tỷ lệ hài lòng nhân viên", target: 80, current: 76.5, unit: "%", trend: "down", group: "Hài lòng người bệnh" },
  { code: "CL.011", name: "Tỷ lệ nhiễm khuẩn BV", target: 5, current: 3.8, unit: "%", trend: "down", group: "An toàn người bệnh" },
  { code: "CL.012", name: "Tỷ lệ ngã / té của BN", target: 0.5, current: 0.32, unit: "‰", trend: "down", group: "An toàn người bệnh" },
  { code: "CL.013", name: "Sai sót thuốc", target: 0.2, current: 0.15, unit: "%", trend: "down", group: "An toàn người bệnh" },
  { code: "CL.014", name: "Sự cố y khoa nghiêm trọng", target: 0, current: 2, unit: "vụ", trend: "up", group: "An toàn người bệnh" },
  { code: "CL.021", name: "Thời gian chờ khám TB", target: 30, current: 24, unit: "phút", trend: "down", group: "Hiệu quả KCB" },
  { code: "CL.022", name: "Thời gian chờ XN TB", target: 45, current: 38, unit: "phút", trend: "down", group: "Hiệu quả KCB" },
  { code: "CL.023", name: "Tỷ lệ tái nhập viện < 30 ngày", target: 5, current: 4.2, unit: "%", trend: "down", group: "Hiệu quả KCB" },
  { code: "CL.024", name: "Tử vong < 48h", target: 0.5, current: 0.4, unit: "%", trend: "down", group: "Hiệu quả KCB" },
  { code: "CL.031", name: "Tỷ lệ EMR đầy đủ", target: 95, current: 96.8, unit: "%", trend: "up", group: "Quy trình - HSBA" },
  { code: "CL.032", name: "Tỷ lệ ký số EMR đúng hạn", target: 90, current: 89.2, unit: "%", trend: "up", group: "Quy trình - HSBA" },
];

const QL_INCIDENTS = (() => {
  const r = seedRand(28281);
  const types = ["Sai sót thuốc","Té ngã BN","Nhiễm khuẩn vết mổ","Sai mẫu XN","Phản ứng truyền máu","Thiếu thuốc cấp cứu","Sự cố thiết bị"];
  return Array.from({length: 24}, (_, i) => ({
    code: `SC.${String(2026000+i).padStart(6,"0")}`,
    type: types[Math.floor(r()*types.length)],
    severity: ["Nhẹ","Trung bình","Nặng","Rất nặng"][Math.floor(r()*4)],
    dept: rndPick(["Nội tim mạch","Ngoại CT","HSCC","Sản","Cấp cứu","Khoa Dược"]),
    reportedAt: new Date(todayIv.getTime() - Math.floor(r()*60)*86400000),
    status: ["Mới","Đang xử lý","Đã xử lý","Đóng"][Math.floor(r()*4)],
    reporter: rndName(i),
  })).sort((a,b) => b.reportedAt - a.reportedAt);
})();

function QualityV2() {
  const [tab, setTab] = uS("kpi");
  const groups = [...new Set(QL_INDICATORS.map(i => i.group))];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Chỉ số đạt", val: QL_INDICATORS.filter(i => i.trend === "up" ? i.current >= i.target : i.current <= i.target).length, sub: `/${QL_INDICATORS.length} chỉ số`, tone: "ok" },
        { lbl: "Sự cố tháng", val: QL_INCIDENTS.length },
        { lbl: "Sự cố nặng", val: QL_INCIDENTS.filter(i => ["Nặng","Rất nặng"].includes(i.severity)).length, tone: "crit" },
        { lbl: "Đang xử lý", val: QL_INCIDENTS.filter(i => i.status === "Đang xử lý").length, tone: "warn" },
        { lbl: "Hài lòng BN", val: "92.4%", tone: "ok" },
        { lbl: "Đánh giá CL BV", val: "4.2/5", sub: "BYT 2025", tone: "ok" },
      ]}/>
      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "kpi", l: "Bộ chỉ số chất lượng", ic: "chart" },
        { v: "incidents", l: `Sự cố y khoa (${QL_INCIDENTS.length})`, ic: "alert" },
        { v: "audit", l: "Đánh giá định kỳ", ic: "file" },
      ]}/>
      {tab === "kpi" && <div style={{padding:"0 18px 16px"}}>
        {groups.map(g => (
          <div key={g} style={{marginTop:14,border:"1px solid var(--line)",background:"var(--d-1)",borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",background:"var(--d-2)",fontSize:12,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-1)",fontWeight:600,borderBottom:"1px solid var(--line)"}}>{g}</div>
            <div>
              {QL_INDICATORS.filter(i => i.group === g).map(ind => {
                const ok = ind.trend === "up" ? ind.current >= ind.target : ind.current <= ind.target;
                const pct = Math.min(100, (ind.current / Math.max(ind.target, ind.current)) * 100);
                return (
                  <div key={ind.code} style={{display:"grid",gridTemplateColumns:"100px 1fr 220px 120px 90px",gap:14,padding:"12px 14px",borderBottom:"1px solid var(--line)",alignItems:"center",fontSize:13}}>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--t-2)"}}>{ind.code}</div>
                    <div style={{fontWeight:500,color:"var(--t-0)"}}>{ind.name}</div>
                    <div style={{position:"relative",height:8,background:"var(--d-2)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,background:ok?"var(--s-ok)":"var(--s-crit)"}}/>
                    </div>
                    <div style={{fontFamily:"var(--font-mono)",fontWeight:600,textAlign:"right"}}>{ind.current}{ind.unit} <span style={{color:"var(--t-2)",fontWeight:400}}>/ {ind.target}{ind.unit}</span></div>
                    <div style={{textAlign:"right"}}><StatusBadge tone={ok?"ok":"crit"} dot>{ok?"Đạt":"Chưa đạt"}</StatusBadge></div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>}
      {tab === "incidents" && <DataTable columns={[
        { key: "code", label: "Mã sự cố", code: true, width: 130 },
        { key: "type", label: "Loại sự cố" },
        { key: "severity", label: "Mức độ", width: 120, render: r => <StatusBadge tone={r.severity === "Rất nặng" ? "crit" : r.severity === "Nặng" ? "crit" : r.severity === "Trung bình" ? "warn" : "info"}>{r.severity}</StatusBadge> },
        { key: "dept", label: "Khoa", width: 160 },
        { key: "reporter", label: "Người báo cáo", width: 200 },
        { key: "reportedAt", label: "Báo cáo lúc", width: 130, mono: true, render: r => fmtDMYg(r.reportedAt) },
        { key: "status", label: "Trạng thái", width: 130, render: r => <StatusBadge tone={r.status === "Đóng" || r.status === "Đã xử lý" ? "ok" : r.status === "Đang xử lý" ? "warn" : "info"} dot>{r.status}</StatusBadge> },
      ]} data={QL_INCIDENTS} rowKey={r => r.code}/>}
      {tab === "audit" && <div style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {[
          { title: "Đánh giá CL BV theo BYT", date: "Q4/2025", score: "4.2/5", status: "Hoàn tất" },
          { title: "Audit kiểm soát NK", date: "T11/2025", score: "92%", status: "Hoàn tất" },
          { title: "Audit an toàn thuốc", date: "T11/2025", score: "88%", status: "Hoàn tất" },
          { title: "Audit hồ sơ BA", date: "T12/2025", score: "Đang thực hiện", status: "Đang triển khai" },
        ].map((a, i) => (
          <div key={i} style={{border:"1px solid var(--line)",background:"var(--d-1)",borderRadius:8,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>{a.title}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--t-2)"}}><span>Kỳ {a.date}</span><StatusBadge tone={a.status === "Hoàn tất" ? "ok" : "warn"} dot>{a.status}</StatusBadge></div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:24,fontWeight:600,color:"var(--c-pri)",marginTop:10}}>{a.score}</div>
          </div>
        ))}
      </div>}
    </div>
  );
}
window.QualityV2 = QualityV2;
