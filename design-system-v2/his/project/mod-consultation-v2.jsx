// =====================================================================
// HIS Terminal · Module: HỘI CHẨN (Consultation v2)
// =====================================================================
const CS_STATUS = [
  { v: "draft",     l: "Nháp", tone: null },
  { v: "scheduled", l: "Đã lên lịch", tone: "info" },
  { v: "ongoing",   l: "Đang diễn ra", tone: "ok" },
  { v: "completed", l: "Hoàn tất", tone: "ok" },
  { v: "cancelled", l: "Đã huỷ", tone: "crit" },
];
const CS_TYPE = [
  { v: "noi-vien",  l: "Nội viện" },
  { v: "lien-vien", l: "Liên viện" },
  { v: "online",    l: "Trực tuyến" },
];

const seedConsult = () => {
  const r = seedRand(98199);
  const list = [];
  const subjects = ["NMCT cấp phức tạp","U não chưa rõ bản chất","Sốc nhiễm khuẩn","Đa chấn thương","Đột quỵ não","K phổi giai đoạn IV","Suy gan cấp","Bạch cầu cấp","Tâm phế mạn","Bệnh hiếm gặp"];
  for (let i = 0; i < 45; i++) {
    const dayOff = -10 + Math.floor(r()*20);
    const t = new Date(todayIv); t.setDate(t.getDate() + dayOff); t.setHours(8 + Math.floor(r()*8), 0, 0, 0);
    let st;
    if (dayOff < -1) st = r() > 0.05 ? "completed" : "cancelled";
    else if (Math.abs(dayOff) < 1) st = r() > 0.5 ? "ongoing" : "scheduled";
    else st = r() > 0.05 ? "scheduled" : "draft";
    list.push({
      code: `HC.${String(2026000 + i).padStart(6,"0")}`,
      pid: rndPid(), name: rndName(i),
      subject: subjects[Math.floor(r()*subjects.length)],
      type: CS_TYPE[Math.floor(r()*CS_TYPE.length)].v,
      dept: rndPick(["Nội tim mạch","Ngoại CT","HSCC","Sản","Nhi","Ung bướu"]),
      participants: 3 + Math.floor(r()*8),
      chair: rndPick(["TS.BS Nguyễn Văn Hùng","TS.BS Vũ Quốc An","BS.CKII Đặng Minh Khoa","TS.BS Trịnh Thu Hà"]),
      apptAt: t,
      status: st,
      duration: [30,45,60,90][Math.floor(r()*4)],
      conclusion: dayOff < -1 ? rndPick(["Tiếp tục theo phác đồ","Chuyển PT cấp cứu","Chuyển tuyến trung ương","Điều chỉnh thuốc","Theo dõi sát 24h"]) : null,
    });
  }
  return list.sort((a,b) => b.apptAt - a.apptAt);
};

function ConsultationV2() {
  const [rows, setRows] = uS(seedConsult);
  const [stab, setStab] = uS("all");
  const [search, setSearch] = uS("");
  const [page, setPage] = uS(0);
  const PER = 14;
  const counts = { all: rows.length };
  CS_STATUS.forEach(s => counts[s.v] = rows.filter(r => r.status === s.v).length);
  const filtered = uM(() => {
    let r = rows;
    if (stab !== "all") r = r.filter(x => x.status === stab);
    if (search) { const q = search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q) || x.subject.toLowerCase().includes(q)); }
    return r;
  }, [rows, stab, search]);
  uE(() => setPage(0), [stab, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  const open = (r) => { const s = CS_STATUS.find(x => x.v === r.status); const t = CS_TYPE.find(x => x.v === r.type); HUI.drawer(cx => (
    <HUI.Drawer title={r.code} sub={<>{r.subject} · <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge></>} width={680} onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn ghost"><Ico name="print" size={12}/> In biên bản</button>
        {r.status === "scheduled" && <button className="ab-btn primary"><Ico name="check" size={12}/> Bắt đầu hội chẩn</button>}
      </>}>
      <DrSec title="Bệnh nhân">
        <DrField lbl="Mã BN">{r.pid}</DrField>
        <DrField lbl="Họ tên">{r.name}</DrField>
      </DrSec>
      <DrSec title="Hội chẩn">
        <DrField lbl="Chủ đề">{r.subject}</DrField>
        <DrField lbl="Loại">{t?.l}</DrField>
        <DrField lbl="Khoa chủ trì">{r.dept}</DrField>
        <DrField lbl="Chủ toạ">{r.chair}</DrField>
        <DrField lbl="Số thành viên">{r.participants}</DrField>
      </DrSec>
      <DrSec title="Thời gian">
        <DrField lbl="Lịch">{fmtDMYg(r.apptAt)} {fmtHMg(r.apptAt)}</DrField>
        <DrField lbl="Thời lượng">{r.duration} phút</DrField>
        <DrField lbl="Trạng thái"><StatusBadge tone={s.tone} dot>{s.l}</StatusBadge></DrField>
      </DrSec>
      {r.conclusion && <DrSec title="Kết luận"><DrField lbl="Hướng xử lý">{r.conclusion}</DrField></DrSec>}
    </HUI.Drawer>
  )); };
  const cols = [
    { key: "code", label: "Mã", code: true, width: 130 },
    { key: "subject", label: "Chủ đề hội chẩn", render: r => <div><div style={{fontWeight:600}}>{r.subject}</div><div style={{fontSize:11,color:"var(--t-2)"}}>BN: {r.name} · {r.pid}</div></div> },
    { key: "type", label: "Loại", width: 120, render: r => CS_TYPE.find(x => x.v === r.type)?.l },
    { key: "dept", label: "Khoa chủ trì", width: 140 },
    { key: "chair", label: "Chủ toạ", width: 200 },
    { key: "participants", label: "Số TV", width: 80, mono: true },
    { key: "appt", label: "Thời gian", width: 130, mono: true, render: r => <div><div style={{fontWeight:600}}>{fmtDMYg(r.apptAt)}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{fmtHMg(r.apptAt)} · {r.duration}p</div></div> },
    { key: "status", label: "Trạng thái", width: 120, render: r => { const s = CS_STATUS.find(x => x.v === r.status); return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>; }},
  ];
  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: "Hôm nay", val: rows.filter(r => Math.abs((r.apptAt-todayIv)/86400000)<1).length, tone: "info" },
        { lbl: "Đang diễn ra", val: counts.ongoing, tone: "ok" },
        { lbl: "Đã lên lịch", val: counts.scheduled, tone: "info" },
        { lbl: "Hoàn tất 30 ngày", val: counts.completed, tone: "ok" },
        { lbl: "Liên viện", val: rows.filter(r => r.type === "lien-vien").length, tone: "warn" },
        { lbl: "Tổng cộng", val: rows.length },
      ]}/>
      <TopTabs tab="all" setTab={()=>{}} tabs={[{ v: "all", l: `Hội chẩn (${rows.length})`, ic: "users" }]} actions={
        <>
          <button className="ab-btn ghost sm"><Ico name="download" size={12}/> Xuất Excel</button>
          <button className="ab-btn primary"><Ico name="plus" size={12}/> Tạo hội chẩn</button>
        </>
      }/>
      <div className="ab-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / mã / chủ đề..."/></div>
      <StatusTabs value={stab} onChange={setStab} tabs={CS_STATUS} counts={counts}/>
      <DataTable columns={cols} data={paged} rowKey={r => r.code} onRowClick={open}/>
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
    </div>
  );
}
window.ConsultationV2 = ConsultationV2;
