// =====================================================================
// HIS · 59 module configs — generic v2 pages
// Each module reads from his-data.js or generates its own sample dataset.
// =====================================================================

const _gen = (n, fn) => Array.from({length:n}, (_, i) => fn(i));
const _isoDate = (d, off=0) => { const x = new Date(d); x.setDate(x.getDate()+off); return x; };
const _today = todayG;
const _tones = ["ok","warn","crit","info","muted","focus"];

// shared columns
const _statBadge = (tone, label) => <StatusBadge tone={tone} dot>{label}</StatusBadge>;

// =====================================================================
// SPECIALTY EMR
// =====================================================================
window.SpecialtyEMRConfig = (() => {
  const types = ["Tim mạch","Sản khoa","Nhi khoa","Mắt","Răng-Hàm-Mặt","Tai-Mũi-Họng","Ung bướu","Da liễu","Tâm thần","Truyền nhiễm"];
  const ws = ["draft","signed","reviewed","archived"];
  const ts = { draft:"warn", signed:"info", reviewed:"focus", archived:"muted" };
  const data = _gen(86, i => {
    const s = ws[i%4];
    return {
      code: "BACK-" + String(2401+i).padStart(5,"0"),
      pid: rndPid(), name: rndName(i), age: rndAge(), gender: rndGender(),
      type: rndPick(types), department: rndPick(["TM","SK","NHI","RHM","TMH","UB"]),
      doctor: "BS." + rndName(i+10).split(" ").pop(),
      created: _isoDate(_today, -i),
      _status: s, statusLbl: {draft:"Nháp",signed:"Đã ký",reviewed:"Đã duyệt",archived:"Lưu trữ"}[s], statusTone: ts[s],
    };
  });
  return {
    title: "Bệnh án chuyên khoa",
    kpis: [
      { lbl:"Tổng BA", val:data.length, sub:"đang quản lý" },
      { lbl:"Đang nháp", val:data.filter(r=>r._status==="draft").length, tone:"warn", sub:"chưa ký" },
      { lbl:"Đã ký số", val:data.filter(r=>r._status==="signed").length, tone:"ok", sub:"hôm nay" },
      { lbl:"10 chuyên khoa", val:types.length, sub:"phân loại" },
    ],
    filterTabs: [{v:"all",l:"Tất cả",ic:"folder"},{v:"mine",l:"Của tôi",ic:"user"},{v:"recent",l:"Gần đây",ic:"clock"}],
    statusTabs: [{v:"draft",l:"Nháp",tone:"warn"},{v:"signed",l:"Đã ký",tone:"info"},{v:"reviewed",l:"Đã duyệt",tone:"focus"},{v:"archived",l:"Lưu trữ",tone:"muted"}],
    columns: [
      { key:"code", label:"Mã BA", code:true, width:130 },
      { key:"name", label:"Bệnh nhân", render:r => <><b>{r.name}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.gender} · {r.age}t</div></> },
      { key:"type", label:"Chuyên khoa", width:140 },
      { key:"doctor", label:"Bác sĩ phụ trách", width:160 },
      { key:"created", label:"Tạo", render:r=>fmtDMYg(r.created), mono:true, width:100 },
      { key:"_status", label:"Trạng thái", render:r=>_statBadge(r.statusTone, r.statusLbl), width:120 },
    ],
    rowKey: r => r.code,
    searchKeys: ["name","pid","code","doctor"],
    searchPlaceholder: "Tìm theo tên BN, mã BA, bác sĩ...",
    filters: [
      { key:"type", label:"Chuyên khoa", options:types.map(t=>({v:t,l:t})) },
      { key:"department", label:"Khoa", options:[{v:"TM",l:"Tim mạch"},{v:"SK",l:"Sản"},{v:"NHI",l:"Nhi"},{v:"RHM",l:"RHM"}] },
    ],
    actions: [
      { ic:"file", title:"Mở BA", onClick:r=>ti("Mở "+r.code) },
      { ic:"sign", title:"Ký số", tone:"crit", onClick:r=>cf("Ký số bệnh án "+r.code+"?", ()=>tk("Đã ký "+r.code)) },
      { ic:"printer", title:"In BA", onClick:r=>ti("In "+r.code) },
    ],
    bulkActions: [
      { label:"Lưu trữ", ic:"archive", onClick:k=>cf(`Lưu trữ ${k.length} BA?`, ()=>tk("Đã lưu trữ")) },
      { label:"Ký hàng loạt", ic:"sign", tone:"primary", onClick:k=>tk(`Đã ký ${k.length} BA`) },
    ],
    primaryAction: { label:"Tạo bệnh án mới", ic:"plus", onClick:()=>ti("Mở form tạo BA chuyên khoa") },
    drawerCode: r=>r.code,
    drawerTitle: r=>r.name,
    drawerSections: r => [
      { title:"Bệnh nhân", fields:[{lbl:"Mã BN",val:r.pid},{lbl:"Họ tên",val:r.name},{lbl:"Giới · Tuổi",val:r.gender+" · "+r.age},{lbl:"Khoa",val:r.department}] },
      { title:"Bệnh án", fields:[{lbl:"Mã BA",val:r.code},{lbl:"Chuyên khoa",val:r.type},{lbl:"Bác sĩ",val:r.doctor},{lbl:"Ngày tạo",val:fmtDMYg(r.created)},{lbl:"Trạng thái",val:_statBadge(r.statusTone,r.statusLbl)}] },
    ],
  };
})();

// =====================================================================
// MEDICAL RECORD ARCHIVE
// =====================================================================
window.MedicalRecordArchiveConfig = (() => {
  const data = _gen(120, i => {
    const yr = 2020 + (i%6);
    const stored = ["physical","scanned","both"][i%3];
    const s = ["pending","stored","retrieved"][i%3];
    return {
      box: "BOX-"+yr+"-"+String(101+i).padStart(4,"0"),
      pid: rndPid(), name: rndName(i),
      year: yr, dept: rndPick(["KH","NB","NH","NK","SP","NHI","HSCC"]),
      pages: 20 + Math.floor(Math.random()*180),
      shelf: "Kệ "+String.fromCharCode(65+i%6)+"-"+(1+i%30),
      stored, storedLbl: {physical:"Bản giấy",scanned:"Bản scan",both:"Cả hai"}[stored],
      _status: s, statusLbl:{pending:"Chờ lưu",stored:"Đã lưu",retrieved:"Đã rút"}[s],
      statusTone:{pending:"warn",stored:"ok",retrieved:"focus"}[s],
      lastUse: _isoDate(_today, -Math.floor(Math.random()*365)),
    };
  });
  return {
    title: "Lưu trữ HSBA",
    kpis: [
      { lbl:"Tổng hồ sơ", val:data.length+",340", sub:"toàn kho" },
      { lbl:"Chờ lưu", val:data.filter(r=>r._status==="pending").length, tone:"warn" },
      { lbl:"Đã rút mượn", val:data.filter(r=>r._status==="retrieved").length, tone:"focus" },
      { lbl:"Đã scan", val:data.filter(r=>r.stored!=="physical").length, tone:"ok" },
    ],
    filterTabs: [{v:"all",l:"Tất cả",ic:"archive"},{v:"recent",l:"Mới rút",ic:"clock"}],
    statusTabs:[{v:"pending",l:"Chờ lưu",tone:"warn"},{v:"stored",l:"Đã lưu",tone:"ok"},{v:"retrieved",l:"Đã rút",tone:"focus"}],
    columns:[
      { key:"box", label:"Mã hộp", code:true, width:140 },
      { key:"name", label:"Bệnh nhân", render:r=><><b>{r.name}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></> },
      { key:"year", label:"Năm", width:70, mono:true },
      { key:"dept", label:"Khoa", width:80 },
      { key:"pages", label:"Trang", width:70, mono:true },
      { key:"shelf", label:"Vị trí", width:110 },
      { key:"storedLbl", label:"Hình thức", width:100 },
      { key:"_status", label:"Trạng thái", render:r=>_statBadge(r.statusTone,r.statusLbl), width:110 },
    ],
    rowKey: r=>r.box,
    searchKeys:["name","pid","box","shelf"],
    searchPlaceholder:"Tìm theo BN, mã hộp, kệ...",
    filters:[
      { key:"year", label:"Năm", options:_gen(6,i=>({v:2020+i,l:String(2020+i)})) },
      { key:"dept", label:"Khoa", options:["KH","NB","NH","NK","SP","NHI","HSCC"].map(v=>({v,l:v})) },
    ],
    actions:[
      { ic:"download", title:"Rút hồ sơ", onClick:r=>cf("Rút hồ sơ "+r.box+"?", ()=>tk("Đã rút "+r.box)) },
      { ic:"file", title:"Xem scan", onClick:r=>ti("Mở bản scan "+r.box) },
    ],
    primaryAction:{ label:"Nhập kho mới", ic:"plus", onClick:()=>ti("Form nhập kho hồ sơ") },
    drawerSections:r=>[
      { title:"Hộp lưu trữ", fields:[{lbl:"Mã hộp",val:r.box},{lbl:"Năm",val:r.year},{lbl:"Khoa",val:r.dept},{lbl:"Vị trí",val:r.shelf},{lbl:"Hình thức",val:r.storedLbl}] },
      { title:"Bệnh nhân", fields:[{lbl:"Mã BN",val:r.pid},{lbl:"Họ tên",val:r.name},{lbl:"Số trang",val:r.pages}] },
      { title:"Lịch sử", fields:[{lbl:"Lần dùng cuối",val:fmtDMYg(r.lastUse)},{lbl:"Trạng thái",val:_statBadge(r.statusTone,r.statusLbl)}] },
    ],
  };
})();
