// =====================================================================
// HIS · Module configs MEGA — all remaining modules (batches 9-15)
// 57 modules using compact config-driven approach
// =====================================================================

const _gM = (n, fn) => Array.from({length:n}, (_, i) => fn(i));
const _isoDateM = (d, off=0) => { const x = new Date(d); x.setDate(x.getDate()+off); return x; };
const _statBadgeM = (tone, label) => <StatusBadge tone={tone} dot>{label}</StatusBadge>;

// Generic 4-status template: scheduled/processing/done/issue
const _gen4 = [
  {v:"new",l:"Mới",tone:"warn"},
  {v:"processing",l:"Đang xử lý",tone:"info"},
  {v:"done",l:"Hoàn tất",tone:"ok"},
  {v:"issue",l:"Có vấn đề",tone:"crit"},
];
const _gen4Lbl = {new:"Mới",processing:"Đang xử lý",done:"Hoàn tất",issue:"Có vấn đề"};
const _gen4Tone = {new:"warn",processing:"info",done:"ok",issue:"crit"};

// Compact factory: produces config from minimal spec
// spec: { title, codePrefix, n, mkRow(i), columns, kpis(data), search, primary }
const _mkCfg = (spec) => {
  const data = _gM(spec.n, i => {
    const s = ["new","processing","done","issue"][i%4];
    const r = spec.mkRow(i, s);
    return { ...r, code: spec.codePrefix+"-"+String(2401+i).padStart(5,"0"),
      _status: r._status || s, statusLbl: r.statusLbl || _gen4Lbl[s], statusTone: r.statusTone || _gen4Tone[s] };
  });
  return {
    title: spec.title, data, statusTabs: spec.statusTabs || _gen4,
    kpis: typeof spec.kpis === "function" ? spec.kpis(data) : spec.kpis,
    columns: spec.columns,
    rowKey: r => r.code,
    searchKeys: spec.search || ["code"],
    searchPlaceholder: spec.searchPh || "Tìm kiếm...",
    actions: spec.actions || [{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở "+r.code)}],
    primaryAction: spec.primary || {label:"Tạo mới",ic:"plus",onClick:()=>ti("Form tạo mới")},
  };
};

// Common renderers
const _rPatient = r => <><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>;
const _rDate = key => r => fmtDMYg(r[key]);
const _rStatus = r => _statBadgeM(r.statusTone, r.statusLbl);
const _cStatus = {key:"_status",label:"TT",render:_rStatus,width:120};

// =====================================================================
// BATCH 9 — LAB & SPECIALTY (10 modules)
// =====================================================================

window.PathologyConfig = _mkCfg({
  title:"Giải phẫu bệnh", codePrefix:"GPB", n:80,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    specimen:rndPick(["Sinh thiết tuyến giáp","Sinh thiết vú","Polyp đại tràng","Khối u phổi","Hạch nách"]),
    method:rndPick(["HE","Hoá mô MD","FISH","Cắt lạnh"]),
    receivedAt:_isoDateM(todayG,-i%30),
    pathologist:"BS."+rndName(i+5).split(" ").pop() }),
  kpis:d => [{lbl:"Mẫu/tháng",val:d.length},{lbl:"Đang đọc",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"Hoàn tất",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"TAT TB",val:"3.2",unit:"ngày",tone:"focus"}],
  columns:[{key:"code",label:"Mã GPB",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"specimen",label:"Mẫu"},{key:"method",label:"Kỹ thuật",width:120},{key:"pathologist",label:"BS GPB",width:140},{key:"receivedAt",label:"Nhận",render:_rDate("receivedAt"),mono:true,width:100},_cStatus],
  search:["patient","pid","specimen"], searchPh:"Tìm mẫu GPB...",
  primary:{label:"Tiếp nhận mẫu",ic:"plus",onClick:()=>ti("Form GPB")}
});

window.MicrobiologyConfig = _mkCfg({
  title:"Vi sinh", codePrefix:"VS", n:96,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    specimen:rndPick(["Cấy máu","Cấy nước tiểu","Cấy đờm","Dịch ổ bụng","Phết âm đạo"]),
    organism:rndPick(["E.coli","S.aureus","K.pneumoniae","P.aeruginosa","Âm tính","Đang chờ"]),
    receivedAt:_isoDateM(todayG,-i%30),
    technologist:"KTV."+rndName(i+3).split(" ").pop() }),
  kpis:d => [{lbl:"Mẫu/ngày",val:d.length},{lbl:"Dương tính",val:d.filter(r=>r.organism!=="Âm tính"&&r.organism!=="Đang chờ").length,tone:"warn"},{lbl:"Đang ủ",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"MDR",val:5,tone:"crit"}],
  columns:[{key:"code",label:"Mã VS",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"specimen",label:"Mẫu"},{key:"organism",label:"Tác nhân",width:140},{key:"technologist",label:"KTV",width:130},{key:"receivedAt",label:"Nhận",render:_rDate("receivedAt"),mono:true,width:100},_cStatus],
  search:["patient","pid","specimen","organism"], searchPh:"Tìm mẫu VS..."
});

window.IvfLabConfig = _mkCfg({
  title:"Lab IVF", codePrefix:"IVF", n:42,
  mkRow:i => { const stages=["stim","retrieval","fert","embryo","transfer"]; const st=stages[i%5];
    return { pid:rndPid(), patient:rndName(i),
      stage:{stim:"Kích trứng",retrieval:"Chọc hút",fert:"Thụ tinh",embryo:"Phôi",transfer:"Chuyển phôi"}[st],
      eggs:i%5===1?5+Math.floor(Math.random()*15):null,
      embryos:i%5>=3?2+Math.floor(Math.random()*8):null,
      doctor:"BS."+rndName(i+5).split(" ").pop(),
      cycleDate:_isoDateM(todayG,-i*3) }; },
  kpis:d => [{lbl:"Chu kỳ",val:d.length},{lbl:"Đang ĐT",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"Tỷ lệ thành công",val:"58%",tone:"ok"},{lbl:"Phôi đông",val:120,tone:"focus"}],
  columns:[{key:"code",label:"Mã IVF",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"stage",label:"Giai đoạn",width:130},{key:"eggs",label:"Trứng",mono:true,width:80,render:r=>r.eggs||"—"},{key:"embryos",label:"Phôi",mono:true,width:80,render:r=>r.embryos||"—"},{key:"doctor",label:"BS",width:140},{key:"cycleDate",label:"Chu kỳ",render:_rDate("cycleDate"),mono:true,width:100},_cStatus],
  search:["patient","pid"], searchPh:"Tìm BN IVF..."
});

window.LabQCConfig = _mkCfg({
  title:"QC Lab", codePrefix:"QC", n:60,
  mkRow:i => ({ test:rndPick(["Glucose","ALT","AST","Creatinine","HbA1c","TSH","Hb","WBC"]),
    machine:rndPick(["Cobas 8000","Architect i2000","BC-6800","Sysmex XN-1000"]),
    level:rndPick(["L1","L2","L3"]),
    cv:(0.5+Math.random()*4).toFixed(2),
    bias:(-3+Math.random()*6).toFixed(2),
    runDate:_isoDateM(todayG,-i),
    operator:"KTV."+rndName(i+3).split(" ").pop() }),
  kpis:d => [{lbl:"QC chạy/ngày",val:d.length},{lbl:"Đạt",val:d.filter(r=>+r.cv<3).length,tone:"ok"},{lbl:"Cảnh báo",val:d.filter(r=>+r.cv>=3&&+r.cv<5).length,tone:"warn"},{lbl:"Vi phạm",val:d.filter(r=>+r.cv>=5).length,tone:"crit"}],
  columns:[{key:"code",label:"Mã QC",code:true,width:130},{key:"test",label:"Xét nghiệm",width:130},{key:"machine",label:"Máy"},{key:"level",label:"Mức",mono:true,width:60},{key:"cv",label:"CV%",mono:true,width:80},{key:"bias",label:"Bias",mono:true,width:80},{key:"operator",label:"KTV",width:130},{key:"runDate",label:"Ngày",render:_rDate("runDate"),mono:true,width:100}],
  search:["test","machine"], searchPh:"Tìm QC..."
});

window.CultureCollectionConfig = _mkCfg({
  title:"Lấy mẫu cấy", codePrefix:"LM", n:72,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    site:rndPick(["Phòng cấp cứu","Khoa Nội","HSCC","Khoa Sản","Khoa Nhi"]),
    type:rndPick(["Máu","Nước tiểu","Phân","Đờm","Dịch não tuỷ","Vết thương"]),
    collector:"ĐD."+rndName(i+2).split(" ").pop(),
    collectAt:_isoDateM(todayG,-i%30) }),
  kpis:d => [{lbl:"Mẫu/ngày",val:d.length},{lbl:"Đã đến lab",val:d.filter(r=>r._status==="processing"||r._status==="done").length,tone:"info"},{lbl:"Hỏng/từ chối",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"Tỷ lệ đạt",val:"96%",tone:"ok"}],
  columns:[{key:"code",label:"Mã LM",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"type",label:"Loại mẫu",width:130},{key:"site",label:"Nơi lấy",width:130},{key:"collector",label:"NV",width:130},{key:"collectAt",label:"Lấy",render:_rDate("collectAt"),mono:true,width:100},_cStatus],
  search:["patient","pid"], searchPh:"Tìm mẫu..."
});

window.ReagentManagementConfig = _mkCfg({
  title:"Quản lý hoá chất", codePrefix:"HC", n:64,
  mkRow:i => { const exp = _isoDateM(todayG, 30+Math.floor(Math.random()*500)-100);
    const expSoon = (exp - todayG)/86400000 < 30;
    return { name:rndPick(["Glucose Reagent","ALT/GPT Kit","HbA1c Kit","CRP Reagent","Troponin I"]),
      brand:rndPick(["Roche","Abbott","Siemens","BioRad","Mindray"]),
      lot:"LOT-"+(2024+i%2)+"-"+String(101+i%200).padStart(4,"0"),
      qty:Math.floor(Math.random()*200), unit:"hộp",
      expiry:exp,
      _status: expSoon ? "issue" : "done",
      statusLbl: expSoon ? "HSD <30 ngày" : "Tốt",
      statusTone: expSoon ? "crit" : "ok" }; },
  statusTabs:[{v:"done",l:"Tốt",tone:"ok"},{v:"issue",l:"Sắp hết HSD",tone:"crit"}],
  kpis:d => [{lbl:"Mục",val:d.length},{lbl:"Sắp hết HSD",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"Tổng tồn",val:d.reduce((s,r)=>s+r.qty,0),tone:"info"},{lbl:"Hết hàng",val:d.filter(r=>r.qty===0).length,tone:"warn"}],
  columns:[{key:"code",label:"Mã HC",code:true,width:130},{key:"name",label:"Tên hoá chất"},{key:"brand",label:"Hãng",width:120},{key:"lot",label:"Lô",mono:true,width:160},{key:"qty",label:"SL",mono:true,width:70},{key:"expiry",label:"HSD",render:_rDate("expiry"),mono:true,width:100},_cStatus],
  search:["name","lot","brand"], searchPh:"Tìm hoá chất..."
});

window.SampleStorageConfig = _mkCfg({
  title:"Lưu trữ mẫu", codePrefix:"LT", n:80,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    type:rndPick(["Huyết thanh","Huyết tương","Mô parafin","DNA","Slide"]),
    location:"Tủ "+rndPick(["A","B","C","D"])+"-"+(1+Math.floor(Math.random()*30))+"/"+(1+Math.floor(Math.random()*100)),
    temp:rndPick(["-80°C","-20°C","4°C","Phòng"]),
    storedAt:_isoDateM(todayG,-Math.floor(Math.random()*365)) }),
  kpis:d => [{lbl:"Mẫu lưu",val:d.length},{lbl:"-80°C",val:d.filter(r=>r.temp==="-80°C").length,tone:"info"},{lbl:"Quá thời hạn",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"Tủ trữ",val:120,tone:"focus"}],
  columns:[{key:"code",label:"Mã LT",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"type",label:"Loại mẫu",width:130},{key:"location",label:"Vị trí",mono:true,width:140},{key:"temp",label:"Nhiệt độ",mono:true,width:100},{key:"storedAt",label:"Lưu từ",render:_rDate("storedAt"),mono:true,width:100},_cStatus],
  search:["patient","pid","location"], searchPh:"Tìm mẫu lưu..."
});

window.SampleTrackingConfig = _mkCfg({
  title:"Theo dõi mẫu", codePrefix:"TM", n:96,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    sampleType:rndPick(["Máu","Nước tiểu","Mô","Dịch","Phân"]),
    from:rndPick(["Khoa Nội","Khoa Ngoại","Sản","Nhi","ER"]),
    to:rndPick(["Lab Sinh hoá","Lab Vi sinh","GPB","XN miễn dịch"]),
    courier:"NV."+rndName(i+2).split(" ").pop(),
    sentAt:_isoDateM(todayG,-i%5) }),
  kpis:d => [{lbl:"Mẫu/ngày",val:d.length},{lbl:"Đang vận chuyển",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"Đã đến",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Sự cố",val:d.filter(r=>r._status==="issue").length,tone:"crit"}],
  columns:[{key:"code",label:"Mã TM",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"sampleType",label:"Loại",width:100},{key:"from",label:"Từ",width:120},{key:"to",label:"Đến",width:140},{key:"courier",label:"NV",width:130},{key:"sentAt",label:"Gửi",render:_rDate("sentAt"),mono:true,width:100},_cStatus],
  search:["patient","pid"], searchPh:"Tìm mẫu..."
});

window.ExternalLabConfig = _mkCfg({
  title:"XN ngoài", codePrefix:"XNN", n:48,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    test:rndPick(["NIPT","Genomic Profiling","HLA Typing","Karyotype","Whole Exome Sequencing"]),
    partner:rndPick(["Medlatec","Diag","BV Đại học Y","Lab Pháp Việt","BV Bạch Mai"]),
    cost:(2+Math.random()*15).toFixed(0)*1000000,
    sentAt:_isoDateM(todayG,-i),
    expectedDays:7+Math.floor(Math.random()*14) }),
  kpis:d => [{lbl:"YC/tháng",val:d.length},{lbl:"Đang chờ KQ",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"Hoàn tất",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Tổng phí",val:(d.reduce((s,r)=>s+r.cost,0)/1e9).toFixed(1),unit:"tỷ",tone:"focus"}],
  columns:[{key:"code",label:"Mã YC",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"test",label:"XN",width:200},{key:"partner",label:"Đối tác",width:140},{key:"cost",label:"Phí",mono:true,width:120,render:r=>r.cost.toLocaleString("vi-VN")+" ₫"},{key:"sentAt",label:"Gửi",render:_rDate("sentAt"),mono:true,width:100},_cStatus],
  search:["patient","pid","test","partner"], searchPh:"Tìm YC..."
});

window.LISConfigConfig = (() => {
  const data = _gM(36, i => ({ code:"CFG-"+String(101+i).padStart(4,"0"),
    test:rndPick(["Glucose","ALT","AST","Creatinine","HbA1c","TSH","Hb","WBC","CRP","Troponin"]),
    machine:rndPick(["Cobas 8000","Architect","BC-6800"]),
    minVal:(0.1+Math.random()*5).toFixed(1),
    maxVal:(10+Math.random()*200).toFixed(1),
    unit:rndPick(["mmol/L","U/L","g/L","%","mg/dL"]),
    panic:rndPick(["≥10","≤2","≥500","≤30"]),
    updatedAt:_isoDateM(todayG,-i*3),
    _status:"done", statusLbl:"Hoạt động", statusTone:"ok"
  }));
  return { title:"Cấu hình LIS", data,
    kpis:[{lbl:"Cấu hình XN",val:data.length},{lbl:"Máy kết nối",val:8,tone:"info"},{lbl:"Hoạt động",val:data.length,tone:"ok"},{lbl:"Cập nhật/tháng",val:12,tone:"focus"}],
    columns:[{key:"code",label:"Mã",code:true,width:120},{key:"test",label:"XN",width:140},{key:"machine",label:"Máy",width:140},{key:"minVal",label:"Min",mono:true,width:80},{key:"maxVal",label:"Max",mono:true,width:80},{key:"unit",label:"ĐV",mono:true,width:90},{key:"panic",label:"Panic",mono:true,width:100},{key:"updatedAt",label:"Cập nhật",render:_rDate("updatedAt"),mono:true,width:100}],
    rowKey:r=>r.code, searchKeys:["test","machine"], searchPlaceholder:"Tìm cấu hình XN...",
    actions:[{ic:"file",title:"Sửa",onClick:r=>ti("Sửa "+r.test)}],
    primaryAction:{label:"Thêm XN",ic:"plus",onClick:()=>ti("Form thêm XN")} };
})();

// =====================================================================
// BATCH 10 — CLINICAL CARE (10 modules)
// =====================================================================

window.TreatmentProtocolConfig = (() => {
  const data = _gM(40, i => ({ code:"PĐT-"+String(101+i).padStart(4,"0"),
    name:rndPick(["Phác đồ Sốt xuất huyết","Tiểu đường type 2","Tăng huyết áp","Suy tim","COPD","Đột quỵ","Sepsis","Viêm phổi cộng đồng"]),
    specialty:rndPick(["Nội","Ngoại","Sản","Nhi","Cấp cứu","Hồi sức"]),
    version:"v"+(1+i%5)+"."+(i%10),
    approvedBy:"BS."+rndName(i+5).split(" ").pop(),
    approvedAt:_isoDateM(todayG,-i*10),
    usage:Math.floor(Math.random()*500),
    _status:"done", statusLbl:"Đang áp dụng", statusTone:"ok"
  }));
  return { title:"Phác đồ điều trị", data,
    kpis:[{lbl:"Phác đồ",val:data.length},{lbl:"Áp dụng/tháng",val:data.reduce((s,r)=>s+r.usage,0),tone:"info"},{lbl:"Cập nhật <90d",val:8,tone:"focus"},{lbl:"Chuyên khoa",val:6,tone:"ok"}],
    columns:[{key:"code",label:"Mã",code:true,width:120},{key:"name",label:"Phác đồ"},{key:"specialty",label:"Chuyên khoa",width:130},{key:"version",label:"Phiên bản",mono:true,width:90},{key:"approvedBy",label:"Phê duyệt",width:140},{key:"usage",label:"Lượt dùng",mono:true,width:100},{key:"approvedAt",label:"Ngày",render:_rDate("approvedAt"),mono:true,width:100}],
    rowKey:r=>r.code, searchKeys:["name","specialty"], searchPlaceholder:"Tìm phác đồ...",
    actions:[{ic:"file",title:"Xem",onClick:r=>ti("Mở "+r.name)}],
    primaryAction:{label:"Tạo phác đồ",ic:"plus",onClick:()=>ti("Form phác đồ")} };
})();

window.ClinicalGuidanceConfig = (() => {
  const data = _gM(60, i => ({ code:"HD-"+String(101+i).padStart(4,"0"),
    title:rndPick(["HD chẩn đoán Sốt xuất huyết","HD xử trí Sốc phản vệ","HD chăm sóc BN ICU","HD phòng nhiễm khuẩn","HD sàng lọc K vú","HD theo dõi tiểu đường"]),
    type:rndPick(["Hướng dẫn BYT","Khuyến cáo BV","Quy trình CK","SOP"]),
    issuer:rndPick(["BYT","BV","Khoa","Sở Y tế"]),
    issueDate:_isoDateM(todayG,-Math.floor(Math.random()*900)),
    views:Math.floor(Math.random()*3000),
    _status:"done", statusLbl:"Đang hiệu lực", statusTone:"ok"
  }));
  return { title:"Hướng dẫn lâm sàng", data,
    kpis:[{lbl:"Tài liệu",val:data.length},{lbl:"Lượt xem/tháng",val:data.reduce((s,r)=>s+r.views,0),tone:"info"},{lbl:"BYT ban hành",val:data.filter(r=>r.issuer==="BYT").length,tone:"focus"},{lbl:"Cập nhật <60d",val:12,tone:"ok"}],
    columns:[{key:"code",label:"Mã",code:true,width:120},{key:"title",label:"Tài liệu"},{key:"type",label:"Loại",width:140},{key:"issuer",label:"Ban hành",width:120},{key:"views",label:"Lượt xem",mono:true,width:100},{key:"issueDate",label:"Ngày",render:_rDate("issueDate"),mono:true,width:100}],
    rowKey:r=>r.code, searchKeys:["title","type"], searchPlaceholder:"Tìm hướng dẫn...",
    actions:[{ic:"file",title:"Đọc",onClick:r=>ti("Mở "+r.title)}],
    primaryAction:{label:"Tải lên",ic:"plus",onClick:()=>ti("Form HD")} };
})();

window.RehabilitationConfig = _mkCfg({
  title:"Phục hồi chức năng", codePrefix:"PHCN", n:72,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    diagnosis:rndPick(["Liệt nửa người","Thoát vị đĩa đệm","Gãy xương","Phẫu thuật khớp","Chấn thương sọ não"]),
    therapy:rndPick(["Vật lý trị liệu","Hoạt động trị liệu","Ngôn ngữ trị liệu","Châm cứu"]),
    sessions:1+Math.floor(Math.random()*30),
    therapist:"KTV."+rndName(i+3).split(" ").pop(),
    startDate:_isoDateM(todayG,-i*2) }),
  kpis:d => [{lbl:"BN PHCN",val:d.length},{lbl:"Đang ĐT",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"Buổi tập/ngày",val:48,tone:"focus"},{lbl:"Hồi phục tốt",val:"73%",tone:"ok"}],
  columns:[{key:"code",label:"Mã PHCN",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"diagnosis",label:"Chẩn đoán"},{key:"therapy",label:"Liệu pháp",width:160},{key:"sessions",label:"Buổi",mono:true,width:70},{key:"therapist",label:"KTV",width:140},_cStatus],
  search:["patient","pid","diagnosis"], searchPh:"Tìm BN PHCN..."
});

window.NutritionConfig = _mkCfg({
  title:"Dinh dưỡng", codePrefix:"DD", n:60,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    diet:rndPick(["Cơm thường","Cháo","Súp","Lỏng","Đặc biệt - tiểu đường","Đặc biệt - thận"]),
    bmi:(15+Math.random()*15).toFixed(1),
    risk:rndPick(["Bình thường","SDD","Béo phì","Suy kiệt"]),
    nutritionist:"KTV."+rndName(i+3).split(" ").pop(),
    assessDate:_isoDateM(todayG,-i*2) }),
  kpis:d => [{lbl:"BN tư vấn",val:d.length},{lbl:"Suy DD",val:d.filter(r=>r.risk==="SDD"||r.risk==="Suy kiệt").length,tone:"crit"},{lbl:"Cần can thiệp",val:d.filter(r=>r._status==="processing").length,tone:"warn"},{lbl:"Suất ăn/ngày",val:680,tone:"focus"}],
  columns:[{key:"code",label:"Mã DD",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"diet",label:"Khẩu phần",width:170},{key:"bmi",label:"BMI",mono:true,width:80},{key:"risk",label:"Nguy cơ",width:120,render:r=><StatusBadge tone={r.risk==="SDD"||r.risk==="Suy kiệt"?"crit":r.risk==="Béo phì"?"warn":"ok"}>{r.risk}</StatusBadge>},{key:"nutritionist",label:"KTV",width:140},_cStatus],
  search:["patient","pid"], searchPh:"Tìm BN..."
});

window.ChronicDiseaseConfig = _mkCfg({
  title:"Quản lý bệnh mạn tính", codePrefix:"BMT", n:120,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    disease:rndPick(["Tiểu đường","Tăng huyết áp","COPD","Suy tim","Hen phế quản","Suy thận mạn"]),
    severity:rndPick(["Nhẹ","Vừa","Nặng"]),
    lastVisit:_isoDateM(todayG,-Math.floor(Math.random()*60)),
    nextVisit:_isoDateM(todayG,Math.floor(Math.random()*60)),
    adherence:60+Math.floor(Math.random()*40),
    doctor:"BS."+rndName(i+5).split(" ").pop() }),
  statusTabs:[{v:"new",l:"Mới",tone:"warn"},{v:"processing",l:"Theo dõi",tone:"info"},{v:"done",l:"Ổn định",tone:"ok"},{v:"issue",l:"Mất kiểm soát",tone:"crit"}],
  kpis:d => [{lbl:"BN mạn tính",val:d.length},{lbl:"Mất kiểm soát",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"Tuân thủ tốt",val:d.filter(r=>r.adherence>=80).length,tone:"ok"},{lbl:"Hẹn hôm nay",val:18,tone:"focus"}],
  columns:[{key:"code",label:"Mã BMT",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"disease",label:"Bệnh",width:140},{key:"severity",label:"Mức",width:80,render:r=><StatusBadge tone={r.severity==="Nặng"?"crit":r.severity==="Vừa"?"warn":"ok"}>{r.severity}</StatusBadge>},{key:"adherence",label:"Tuân thủ",render:r=>r.adherence+"%",mono:true,width:90},{key:"nextVisit",label:"Hẹn",render:_rDate("nextVisit"),mono:true,width:100},_cStatus],
  search:["patient","pid","disease"], searchPh:"Tìm BN mạn tính..."
});

window.ScreeningConfig = _mkCfg({
  title:"Sàng lọc", codePrefix:"SL", n:80,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i), age:rndAge(),
    program:rndPick(["Sàng lọc K vú","Sàng lọc K cổ tử cung","Sàng lọc K đại tràng","Tăng huyết áp","Tiểu đường","Loãng xương"]),
    result:rndPick(["Âm tính","Dương tính","Nghi ngờ","Cần tái KT"]),
    screenDate:_isoDateM(todayG,-i*2),
    doctor:"BS."+rndName(i+5).split(" ").pop() }),
  kpis:d => [{lbl:"Sàng lọc/tháng",val:d.length},{lbl:"Dương tính",val:d.filter(r=>r.result==="Dương tính").length,tone:"crit"},{lbl:"Cần tái KT",val:d.filter(r=>r.result==="Cần tái KT").length,tone:"warn"},{lbl:"Phát hiện sớm",val:24,tone:"focus"}],
  columns:[{key:"code",label:"Mã SL",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"program",label:"Chương trình"},{key:"result",label:"Kết quả",width:120,render:r=><StatusBadge tone={r.result==="Dương tính"?"crit":r.result==="Nghi ngờ"||r.result==="Cần tái KT"?"warn":"ok"}>{r.result}</StatusBadge>},{key:"doctor",label:"BS",width:140},{key:"screenDate",label:"Ngày",render:_rDate("screenDate"),mono:true,width:100},_cStatus],
  search:["patient","pid","program"], searchPh:"Tìm sàng lọc..."
});

window.InfectionControlConfig = _mkCfg({
  title:"Kiểm soát nhiễm khuẩn", codePrefix:"KSNK", n:48,
  mkRow:i => ({ ward:rndPick(["Khoa Nội A","Ngoại B","HSCC","Sản","Nhi"]),
    type:rndPick(["VAP","CAUTI","CLABSI","SSI","C.diff"]),
    patientCount:1+Math.floor(Math.random()*5),
    organism:rndPick(["MRSA","ESBL+ E.coli","KPC K.pneumoniae","Acinetobacter MDR","C.diff"]),
    detectedAt:_isoDateM(todayG,-i*3),
    actionTaken:rndPick(["Cách ly","Khử khuẩn","Đào tạo","Cập nhật quy trình"]) }),
  kpis:d => [{lbl:"Ca NK BV/tháng",val:d.length},{lbl:"MDR",val:d.filter(r=>r.organism.includes("MRSA")||r.organism.includes("ESBL")||r.organism.includes("KPC")||r.organism.includes("MDR")).length,tone:"crit"},{lbl:"Đang xử lý",val:d.filter(r=>r._status==="processing").length,tone:"warn"},{lbl:"Đã khống chế",val:d.filter(r=>r._status==="done").length,tone:"ok"}],
  columns:[{key:"code",label:"Mã KSNK",code:true,width:130},{key:"ward",label:"Khoa",width:130},{key:"type",label:"Loại NK",width:90},{key:"organism",label:"Tác nhân",width:160},{key:"patientCount",label:"BN",mono:true,width:60},{key:"actionTaken",label:"Xử trí",width:140},{key:"detectedAt",label:"Phát hiện",render:_rDate("detectedAt"),mono:true,width:100},_cStatus],
  search:["ward","organism"], searchPh:"Tìm ca NK..."
});

window.SpecialtyEMRConfig = _mkCfg({
  title:"EMR chuyên khoa", codePrefix:"CKEMR", n:120,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    specialty:rndPick(["Tim mạch","Ung bướu","Nội tiết","Thần kinh","Da liễu","Mắt","TMH","Răng-Hàm-Mặt"]),
    visitType:rndPick(["Khám lần đầu","Tái khám","Hội chẩn","Cấp cứu"]),
    doctor:"BS."+rndName(i+5).split(" ").pop(),
    visitDate:_isoDateM(todayG,-i%30) }),
  kpis:d => [{lbl:"Lượt khám CK",val:d.length},{lbl:"Tim mạch",val:d.filter(r=>r.specialty==="Tim mạch").length,tone:"info"},{lbl:"Ung bướu",val:d.filter(r=>r.specialty==="Ung bướu").length,tone:"focus"},{lbl:"Hội chẩn",val:d.filter(r=>r.visitType==="Hội chẩn").length,tone:"warn"}],
  columns:[{key:"code",label:"Mã EMR",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"specialty",label:"Chuyên khoa",width:140},{key:"visitType",label:"Loại khám",width:130},{key:"doctor",label:"BS",width:140},{key:"visitDate",label:"Ngày",render:_rDate("visitDate"),mono:true,width:100},_cStatus],
  search:["patient","pid","specialty"], searchPh:"Tìm EMR CK..."
});

window.TraditionalMedicineConfig = _mkCfg({
  title:"Y học cổ truyền", codePrefix:"YHCT", n:54,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    diagnosis:rndPick(["Khí huyết hư","Tỳ vị hư","Can dương vượng","Thận âm hư","Phong hàn"]),
    therapy:rndPick(["Châm cứu","Bấm huyệt","Thuốc thang","Xông hơi","Cứu ngải"]),
    sessions:1+Math.floor(Math.random()*20),
    physician:"BS."+rndName(i+5).split(" ").pop(),
    startDate:_isoDateM(todayG,-i*2) }),
  kpis:d => [{lbl:"BN YHCT",val:d.length},{lbl:"Châm cứu/ngày",val:32,tone:"info"},{lbl:"Đang ĐT",val:d.filter(r=>r._status==="processing").length,tone:"focus"},{lbl:"Hài lòng",val:"94%",tone:"ok"}],
  columns:[{key:"code",label:"Mã YHCT",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"diagnosis",label:"Chẩn đoán YHCT"},{key:"therapy",label:"Liệu pháp",width:130},{key:"sessions",label:"Buổi",mono:true,width:70},{key:"physician",label:"BS",width:140},_cStatus],
  search:["patient","pid"], searchPh:"Tìm BN YHCT..."
});

window.TbHivManagementConfig = _mkCfg({
  title:"Lao · HIV", codePrefix:"LH", n:72,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    coInfection:rndPick(["TB+HIV","TB only","HIV only","TB-MDR+HIV"]),
    regimen:rndPick(["2HRZE/4HR","2HRZE/4HR + ART","6HRZE-MDR + ART","Cá thể"]),
    duration:6+Math.floor(Math.random()*18),
    adherence:60+Math.floor(Math.random()*40),
    lastVisit:_isoDateM(todayG,-Math.floor(Math.random()*30)),
    doctor:"BS."+rndName(i+5).split(" ").pop() }),
  statusTabs:[{v:"new",l:"Mới",tone:"warn"},{v:"processing",l:"Đang ĐT",tone:"info"},{v:"done",l:"Hoàn thành",tone:"ok"},{v:"issue",l:"Mất dấu/MDR",tone:"crit"}],
  kpis:d => [{lbl:"BN Lao+HIV",val:d.filter(r=>r.coInfection==="TB+HIV").length,tone:"crit"},{lbl:"Tổng ĐT",val:d.length},{lbl:"Tuân thủ ≥80%",val:d.filter(r=>r.adherence>=80).length,tone:"ok"},{lbl:"MDR",val:d.filter(r=>r.coInfection.includes("MDR")).length,tone:"warn"}],
  columns:[{key:"code",label:"Mã",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"coInfection",label:"Đồng nhiễm",width:130},{key:"regimen",label:"Phác đồ",width:170},{key:"adherence",label:"Tuân thủ",render:r=>r.adherence+"%",mono:true,width:90},{key:"lastVisit",label:"Lần cuối",render:_rDate("lastVisit"),mono:true,width:100},_cStatus],
  search:["patient","pid"], searchPh:"Tìm BN..."
});
