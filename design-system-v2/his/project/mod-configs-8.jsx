// =====================================================================
// HIS · Module configs 8 — public health (compact mass)
// =====================================================================
const _g8 = (n, fn) => Array.from({length:n}, (_, i) => fn(i));
// Helpers (re-declared so this file is independent of configs-1)
const _isoDate = (d, off=0) => { const x = new Date(d); x.setDate(x.getDate()+off); return x; };
const _statBadge = (tone, label) => <StatusBadge tone={tone} dot>{label}</StatusBadge>;

// Public health helper - shared status template
const _phStatus = ["scheduled","done","followup","missed"];
const _phLbl = {scheduled:"Đặt lịch",done:"Hoàn thành",followup:"Theo dõi",missed:"Bỏ"};
const _phTone = {scheduled:"warn",done:"ok",followup:"focus",missed:"crit"};

const _phTabs = [
  {v:"scheduled",l:"Đặt lịch",tone:"warn"},
  {v:"done",l:"Hoàn thành",tone:"ok"},
  {v:"followup",l:"Theo dõi",tone:"focus"},
  {v:"missed",l:"Bỏ",tone:"crit"},
];

// HEALTH CHECKUP
window.HealthCheckupConfig = (() => {
  const data = _g8(96, i => ({ code:"KSK-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
    company:rndPick(["Cty TNHH ABC","Cty XYZ","UBND P.5","TH ABC","Nhân viên BV"]),
    package:rndPick(["KSK định kỳ cơ bản","KSK toàn diện","KSK lái xe","KSK xuất ngoại","KSK học đường"]),
    appointAt:_isoDate(todayG,-i%30+10), classification: rndPick(["I","II","III","IV","V"]),
    _status:_phStatus[i%4], statusLbl:_phLbl[_phStatus[i%4]], statusTone:_phTone[_phStatus[i%4]] }));
  return { data, title:"Khám sức khoẻ",
    kpis:[{lbl:"Lượt KSK/tháng",val:data.length},{lbl:"Đặt lịch",val:data.filter(r=>r._status==="scheduled").length,tone:"warn"},{lbl:"Hoàn thành",val:data.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Theo dõi sức khoẻ",val:data.filter(r=>r._status==="followup").length,tone:"focus"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã KSK",code:true,width:130},{key:"patient",label:"Người KSK",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"company",label:"Đơn vị",width:160},{key:"package",label:"Gói",width:160},{key:"appointAt",label:"Hẹn",render:r=>fmtDMYg(r.appointAt),mono:true,width:100},{key:"classification",label:"Phân loại",mono:true,width:90},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid","company","code"], searchPlaceholder:"Tìm KSK...",
    actions:[{ic:"file",title:"Hồ sơ KSK",onClick:r=>ti("Mở "+r.code)}],
    primaryAction:{label:"Đặt lịch KSK",ic:"plus",onClick:()=>ti("Form đặt KSK")} };
})();

// IMMUNIZATION
window.ImmunizationConfig = (() => {
  const data = _g8(120, i => ({ code:"TC-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:i%3?"Bé "+rndName(i).split(" ").slice(-1)[0]:rndName(i),
    age:i%3?Math.floor(Math.random()*5):rndAge(),
    vaccine:rndPick(["BCG","Lao","COVID-19 Pfizer","Sởi-Quai bị-Rubella","Rotavirus","DPT-VGB-Hib","Cúm","Viêm gan B","Pneumococcal","HPV"]),
    dose:1+Math.floor(Math.random()*4),
    appointAt:_isoDate(todayG,-i%30+5), batch:"VAC-"+String(2024+i%2)+"-"+String(101+i%200).padStart(4,"0"),
    _status:_phStatus[i%4], statusLbl:_phLbl[_phStatus[i%4]], statusTone:_phTone[_phStatus[i%4]] }));
  return { data, title:"Tiêm chủng",
    kpis:[{lbl:"Mũi/ngày",val:data.length},{lbl:"Đã tiêm",val:data.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Bỏ lịch",val:data.filter(r=>r._status==="missed").length,tone:"crit"},{lbl:"Tỷ lệ tiêm đủ",val:"94%",tone:"focus"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã TC",code:true,width:120},{key:"patient",label:"Người tiêm",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}t</div></>},{key:"vaccine",label:"Vắc-xin",width:170},{key:"dose",label:"Mũi",mono:true,width:60},{key:"batch",label:"Lô",mono:true,width:140},{key:"appointAt",label:"Lịch",render:r=>fmtDMYg(r.appointAt),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid","vaccine"], searchPlaceholder:"Tìm tiêm chủng...",
    actions:[{ic:"check",title:"Tiêm",onClick:r=>cf("Xác nhận đã tiêm "+r.vaccine+"?",()=>tk("Đã ghi nhận"))}],
    primaryAction:{label:"Đặt lịch tiêm",ic:"plus",onClick:()=>ti("Form tiêm chủng")} };
})();

// EPIDEMIOLOGY
window.EpidemiologyConfig = (() => {
  const data = _g8(56, i => {
    const s = ["new","investigating","contained","resolved"][i%4];
    return { code:"DT-"+String(2401+i).padStart(5,"0"),
      disease:rndPick(["Sốt xuất huyết","Cúm A","Tay chân miệng","COVID-19","Tả","Sởi","Sốt rét","Ho gà"]),
      area:rndPick(["P.1, Q.5","P.7, Q.10","P.12, Q.Tân Bình","H.Hóc Môn","H.Củ Chi"]),
      cases:1+Math.floor(Math.random()*40), deaths:i%5===0?Math.floor(Math.random()*3):0,
      reportedAt:_isoDate(todayG,-i),
      reporter:"BS."+rndName(i+5).split(" ").pop(),
      _status:s, statusLbl:{new:"Mới phát hiện",investigating:"Điều tra",contained:"Khống chế",resolved:"Hoàn tất"}[s], statusTone:{new:"crit",investigating:"warn",contained:"info",resolved:"ok"}[s] };
  });
  return { data, title:"Giám sát dịch tễ",
    kpis:[{lbl:"Ổ dịch/tháng",val:data.length},{lbl:"Đang điều tra",val:data.filter(r=>r._status==="investigating").length,tone:"warn"},{lbl:"Tổng ca",val:data.reduce((s,r)=>s+r.cases,0),tone:"focus"},{lbl:"Tử vong",val:data.reduce((s,r)=>s+r.deaths,0),tone:"crit"}],
    statusTabs:[{v:"new",l:"Mới",tone:"crit"},{v:"investigating",l:"Điều tra",tone:"warn"},{v:"contained",l:"Khống chế",tone:"info"},{v:"resolved",l:"Hoàn tất",tone:"ok"}],
    columns:[{key:"code",label:"Mã ổ dịch",code:true,width:130},{key:"disease",label:"Bệnh",width:140},{key:"area",label:"Khu vực",width:160},{key:"cases",label:"Ca mắc",mono:true,width:80},{key:"deaths",label:"Tử vong",mono:true,width:80,render:r=>r.deaths?<StatusBadge tone="crit">{r.deaths}</StatusBadge>:"—"},{key:"reportedAt",label:"Phát hiện",render:r=>fmtDMYg(r.reportedAt),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["disease","area","reporter"], searchPlaceholder:"Tìm ổ dịch...",
    actions:[{ic:"file",title:"Báo cáo dịch",onClick:r=>ti("Mở BC "+r.code)}],
    primaryAction:{label:"Báo dịch",ic:"plus",onClick:()=>ti("Form báo dịch")} };
})();

// Compact factory for similar public-health modules
const _phMake = (title, codePrefix, n, mkRow) => {
  const data = _g8(n, i => {
    const s = _phStatus[i%4];
    return { ...mkRow(i), code:codePrefix+"-"+String(2401+i).padStart(5,"0"),
      _status:s, statusLbl:_phLbl[s], statusTone:_phTone[s] };
  });
  return { title, data, statusTabs:_phTabs };
};

// SCHOOL HEALTH
window.SchoolHealthConfig = (() => {
  const { title, data } = _phMake("Y tế trường học","SH",80, i => ({
    student:"Học sinh "+rndName(i).split(" ").slice(-1)[0], pid:rndPid(),
    school:rndPick(["TH Lê Lợi","THCS Nguyễn Du","THPT Trần Phú","TH Nguyễn Trãi"]),
    classRoom:rndPick(["1A","2B","3C","4A","5B","6A","7B","8C","9A"]),
    ailment:rndPick(["Cận thị","Suy DD","Sâu răng","Cong vẹo cột sống","Béo phì","Khoẻ mạnh"]),
    bmi:(15+Math.random()*10).toFixed(1),
    examDate:_isoDate(todayG,-i%30),
  }));
  return { title, data,
    kpis:[{lbl:"Học sinh khám",val:data.length},{lbl:"Bệnh học đường",val:data.filter(r=>r.ailment!=="Khoẻ mạnh").length,tone:"warn"},{lbl:"Trường tham gia",val:24,tone:"focus"},{lbl:"Cần can thiệp",val:18,tone:"crit"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã KSK",code:true,width:130},{key:"student",label:"Học sinh",render:r=><><b>{r.student}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.school} · {r.classRoom}</div></>},{key:"ailment",label:"Tình trạng",width:160},{key:"bmi",label:"BMI",mono:true,width:80},{key:"examDate",label:"Ngày khám",render:r=>fmtDMYg(r.examDate),mono:true,width:110},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["student","school"], searchPlaceholder:"Tìm học sinh...",
    actions:[{ic:"file",title:"Hồ sơ HS",onClick:r=>ti("Mở HS")}],
    primaryAction:{label:"Tổ chức KSK",ic:"plus",onClick:()=>ti("Form KSK trường")} };
})();

// OCCUPATIONAL HEALTH
window.OccupationalHealthConfig = (() => {
  const { title, data } = _phMake("Sức khoẻ nghề nghiệp","OH",72, i => ({
    worker:rndName(i), pid:rndPid(),
    company:rndPick(["Cty Sản xuất Sài Gòn","KCN Tân Bình","Bệnh viện ABC","Vinashin","Cảng Cát Lái"]),
    job:rndPick(["Công nhân","Tài xế","Kỹ sư","Y tá","Hộ lý"]),
    risk:rndPick(["Bụi","Hoá chất","Ồn","Tia phóng xạ","Sinh học","Tâm lý"]),
    examType:rndPick(["KSK định kỳ","KSK đầu vào","KSK trở lại làm","Chẩn đoán BNN"]),
    examDate:_isoDate(todayG,-i%30),
  }));
  return { title, data,
    kpis:[{lbl:"Lượt khám/tháng",val:data.length},{lbl:"BNN phát hiện",val:8,tone:"crit"},{lbl:"Đơn vị tham gia",val:36,tone:"focus"},{lbl:"Hoàn thành",val:data.filter(r=>r._status==="done").length,tone:"ok"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã KSK",code:true,width:130},{key:"worker",label:"Người LĐ",render:r=><><b>{r.worker}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.job} · {r.company}</div></>},{key:"risk",label:"Yếu tố",width:130},{key:"examType",label:"Loại khám",width:150},{key:"examDate",label:"Ngày khám",render:r=>fmtDMYg(r.examDate),mono:true,width:110},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["worker","company","job"], searchPlaceholder:"Tìm người LĐ...",
    actions:[{ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Lên lịch KSK",ic:"plus",onClick:()=>ti("Form OH")} };
})();

// METHADONE TREATMENT
window.MethadoneTreatmentConfig = (() => {
  const data = _g8(64, i => {
    const s = ["enrolling","stable","unstable","discontinued"][i%4];
    return { code:"MTD-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      dose:30+Math.floor(Math.random()*200), enrolledAt:_isoDate(todayG,-30-Math.floor(Math.random()*500)),
      lastVisit:_isoDate(todayG,-Math.floor(Math.random()*30)),
      adherence:60+Math.floor(Math.random()*40),
      _status:s, statusLbl:{enrolling:"Đăng ký",stable:"Ổn định",unstable:"Không ổn định",discontinued:"Bỏ trị"}[s],
      statusTone:{enrolling:"warn",stable:"ok",unstable:"focus",discontinued:"crit"}[s] };
  });
  return { data, title:"Điều trị Methadone",
    kpis:[{lbl:"BN đang ĐT",val:data.filter(r=>["stable","unstable"].includes(r._status)).length,tone:"info"},{lbl:"Ổn định",val:data.filter(r=>r._status==="stable").length,tone:"ok"},{lbl:"Bỏ trị",val:data.filter(r=>r._status==="discontinued").length,tone:"crit"},{lbl:"Liều TB",val:90,unit:"mg",tone:"focus"}],
    statusTabs:[{v:"enrolling",l:"Đăng ký",tone:"warn"},{v:"stable",l:"Ổn định",tone:"ok"},{v:"unstable",l:"Không ổn",tone:"focus"},{v:"discontinued",l:"Bỏ trị",tone:"crit"}],
    columns:[{key:"code",label:"Mã BN",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"dose",label:"Liều (mg)",mono:true,width:100},{key:"adherence",label:"Tuân thủ",render:r=>r.adherence+"%",mono:true,width:100},{key:"lastVisit",label:"Lần cuối",render:r=>fmtDMYg(r.lastVisit),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["patient","pid"], searchPlaceholder:"Tìm BN MTD...",
    actions:[{ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Đăng ký BN",ic:"plus",onClick:()=>ti("Form MTD")} };
})();

// FOOD SAFETY
window.FoodSafetyConfig = (() => {
  const data = _g8(48, i => {
    const s = ["scheduled","inspecting","passed","violated"][i%4];
    return { code:"ATTP-"+String(2401+i).padStart(5,"0"),
      facility:rndPick(["Quán ăn ABC","Cơ sở SX bánh mỳ","Nhà hàng Hoa Mai","Bếp ăn TH","Cty thực phẩm XYZ"]),
      address:rndPick(["P.5, Q.10","P.12, Q.Tân Bình","P.7, Q.5"]),
      type:rndPick(["Quán ăn","SX-CB","Nhà hàng","Bếp ăn"]),
      inspectAt:_isoDate(todayG,-i%30),
      inspector:"BS."+rndName(i+5).split(" ").pop(),
      score:60+Math.floor(Math.random()*40),
      _status:s, statusLbl:{scheduled:"Đặt lịch",inspecting:"Đang KT",passed:"Đạt",violated:"Vi phạm"}[s],
      statusTone:{scheduled:"warn",inspecting:"info",passed:"ok",violated:"crit"}[s] };
  });
  return { data, title:"ATVSTP",
    kpis:[{lbl:"KT tháng",val:data.length},{lbl:"Đạt",val:data.filter(r=>r._status==="passed").length,tone:"ok"},{lbl:"Vi phạm",val:data.filter(r=>r._status==="violated").length,tone:"crit"},{lbl:"Đang KT",val:data.filter(r=>r._status==="inspecting").length,tone:"info"}],
    statusTabs:[{v:"scheduled",l:"Đặt lịch",tone:"warn"},{v:"inspecting",l:"Đang KT",tone:"info"},{v:"passed",l:"Đạt",tone:"ok"},{v:"violated",l:"Vi phạm",tone:"crit"}],
    columns:[{key:"code",label:"Mã KT",code:true,width:130},{key:"facility",label:"Cơ sở",render:r=><><b>{r.facility}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.address}</div></>},{key:"type",label:"Loại",width:110},{key:"score",label:"Điểm",mono:true,width:80,render:r=><span style={{color:r.score>=80?"var(--s-ok)":r.score>=60?"var(--s-warn)":"var(--s-crit)",fontFamily:"var(--font-mono)"}}>{r.score}</span>},{key:"inspector",label:"BS",width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["facility","address","inspector"], searchPlaceholder:"Tìm cơ sở...",
    actions:[{ic:"file",title:"Biên bản",onClick:r=>ti("Mở BB "+r.code)}],
    primaryAction:{label:"Lên lịch KT",ic:"plus",onClick:()=>ti("Form lịch KT")} };
})();

// COMMUNITY HEALTH
window.CommunityHealthConfig = (() => {
  const { title, data } = _phMake("Sức khoẻ cộng đồng","CH",60, i => ({
    program:rndPick(["Khám sàng lọc cộng đồng","Tư vấn dinh dưỡng","Phòng chống đột quỵ","Chăm sóc người cao tuổi","Sức khoẻ phụ nữ"]),
    area:rndPick(["P.1, Q.5","P.7, Q.10","P.12, Q.Tân Bình","H.Hóc Môn"]),
    participants:30+Math.floor(Math.random()*200),
    lead:"BS."+rndName(i+5).split(" ").pop(),
    runDate:_isoDate(todayG,-i*2),
  }));
  return { title, data,
    kpis:[{lbl:"CT/tháng",val:data.length},{lbl:"Người tham gia",val:data.reduce((s,r)=>s+r.participants,0),tone:"info"},{lbl:"Hoàn thành",val:data.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Khu vực",val:24,tone:"focus"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã CT",code:true,width:130},{key:"program",label:"Chương trình"},{key:"area",label:"Khu vực",width:160},{key:"participants",label:"SL",mono:true,width:80},{key:"lead",label:"Phụ trách",width:140},{key:"runDate",label:"Ngày",render:r=>fmtDMYg(r.runDate),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["program","area","lead"], searchPlaceholder:"Tìm CT...",
    actions:[{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Tổ chức CT",ic:"plus",onClick:()=>ti("Form CT cộng đồng")} };
})();

// HIV MANAGEMENT
window.HivManagementConfig = (() => {
  const data = _g8(80, i => {
    const s = ["enrolled","stable","art","lostFollowup"][i%4];
    return { code:"HIV-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      stage:rndPick(["Lâm sàng I","Lâm sàng II","Lâm sàng III","Lâm sàng IV"]),
      cd4:200+Math.floor(Math.random()*800),
      regimen:rndPick(["TDF+3TC+EFV","ABC+3TC+DTG","TDF+3TC+DTG","AZT+3TC+NVP"]),
      adherence:60+Math.floor(Math.random()*40),
      lastVisit:_isoDate(todayG,-Math.floor(Math.random()*30)),
      _status:s, statusLbl:{enrolled:"Đăng ký",stable:"Ổn định",art:"ART",lostFollowup:"Mất dấu"}[s],
      statusTone:{enrolled:"warn",stable:"ok",art:"info",lostFollowup:"crit"}[s] };
  });
  return { data, title:"Quản lý HIV",
    kpis:[{lbl:"BN HIV",val:data.length},{lbl:"Đang ART",val:data.filter(r=>r._status==="art").length,tone:"info"},{lbl:"Mất dấu",val:data.filter(r=>r._status==="lostFollowup").length,tone:"crit"},{lbl:"Tải lượng <50",val:"82%",tone:"ok"}],
    statusTabs:[{v:"enrolled",l:"Đăng ký",tone:"warn"},{v:"stable",l:"Ổn định",tone:"ok"},{v:"art",l:"ART",tone:"info"},{v:"lostFollowup",l:"Mất dấu",tone:"crit"}],
    columns:[{key:"code",label:"Mã BN",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"stage",label:"Giai đoạn",width:120},{key:"cd4",label:"CD4",mono:true,width:80},{key:"regimen",label:"Phác đồ",mono:true,width:140},{key:"adherence",label:"Tuân thủ",render:r=>r.adherence+"%",mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid"], searchPlaceholder:"Tìm BN HIV...",
    actions:[{ic:"phone",title:"Liên hệ",onClick:r=>tk("Đã gọi")},{ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Đăng ký BN",ic:"plus",onClick:()=>ti("Form HIV")} };
})();

// HEALTH EDUCATION
window.HealthEducationConfig = (() => {
  const { title, data } = _phMake("Truyền thông GDSK","TT",54, i => ({
    title:rndPick(["Phòng chống dịch SXH","Dinh dưỡng cho trẻ","Cai thuốc lá","Phòng chống đột quỵ","Sức khoẻ tâm thần"]),
    channel:rndPick(["Truyền hình","Báo chí","Mạng XH","Tờ rơi","Hội thảo"]),
    audience:rndPick(["Toàn dân","Phụ nữ mang thai","Người cao tuổi","Học sinh","CN"]),
    reach:1000+Math.floor(Math.random()*50000),
    runDate:_isoDate(todayG,-i*2),
  }));
  return { title, data,
    kpis:[{lbl:"Chiến dịch tháng",val:data.length},{lbl:"Tổng tiếp cận",val:(data.reduce((s,r)=>s+r.reach,0)/1000).toFixed(0),unit:"K",tone:"info"},{lbl:"Hoàn thành",val:data.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Kênh",val:5,tone:"focus"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã",code:true,width:130},{key:"title",label:"Chủ đề"},{key:"channel",label:"Kênh",width:120},{key:"audience",label:"Đối tượng",width:140},{key:"reach",label:"Tiếp cận",mono:true,width:100},{key:"runDate",label:"Ngày",render:r=>fmtDMYg(r.runDate),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["title","channel"], searchPlaceholder:"Tìm chiến dịch...",
    actions:[{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Triển khai",ic:"plus",onClick:()=>ti("Form GDSK")} };
})();

// ENVIRONMENTAL HEALTH
window.EnvironmentalHealthConfig = (() => {
  const { title, data } = _phMake("Môi trường y tế","ENV",42, i => ({
    location:rndPick(["Khoa Cấp cứu","Khoa Mổ","HSCC","Khoa Dược","Tuần hoàn nước thải"]),
    parameter:rndPick(["CO2","Bụi PM2.5","Nước thải","Tiếng ồn","Bức xạ"]),
    value:(Math.random()*200).toFixed(1),
    threshold:100,
    monitoredAt:_isoDate(todayG,-i*2),
  }));
  return { title, data,
    kpis:[{lbl:"Điểm đo",val:data.length},{lbl:"Vượt ngưỡng",val:data.filter(r=>+r.value>r.threshold).length,tone:"crit"},{lbl:"Đạt chuẩn",val:data.filter(r=>+r.value<=r.threshold).length,tone:"ok"},{lbl:"Đo/tuần",val:24,tone:"info"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã",code:true,width:130},{key:"location",label:"Vị trí",width:160},{key:"parameter",label:"Thông số",width:140},{key:"value",label:"Giá trị",render:r=><span style={{color:+r.value>r.threshold?"var(--s-crit)":"var(--s-ok)",fontFamily:"var(--font-mono)"}}>{r.value}</span>,mono:true,width:90},{key:"threshold",label:"Ngưỡng",mono:true,width:80},{key:"monitoredAt",label:"Đo",render:r=>fmtDMYg(r.monitoredAt),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["location","parameter"], searchPlaceholder:"Tìm điểm đo...",
    actions:[{ic:"file",title:"Báo cáo",onClick:r=>ti("Mở BC")}],
    primaryAction:{label:"Đo mới",ic:"plus",onClick:()=>ti("Form đo")} };
})();

// POPULATION HEALTH
window.PopulationHealthConfig = (() => {
  const { title, data } = _phMake("Dân số KHHGĐ","DS",84, i => ({
    family:rndName(i)+" hộ",
    address:rndPick(["P.1, Q.5","P.7, Q.10","P.12, Q.TB","H.Hóc Môn"]),
    members:1+Math.floor(Math.random()*7),
    woc:rndPick(["IUD","DCTC","Bao cao su","Thuốc tránh thai","Triệt sản","Khác"]),
    children:Math.floor(Math.random()*5),
    visitDate:_isoDate(todayG,-i*5),
  }));
  return { title, data,
    kpis:[{lbl:"Hộ quản lý",val:data.length},{lbl:"Tổng dân",val:data.reduce((s,r)=>s+r.members,0),tone:"info"},{lbl:"Trẻ <5T",val:data.reduce((s,r)=>s+r.children,0),tone:"focus"},{lbl:"BPTT đang dùng",val:"68%",tone:"ok"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã hộ",code:true,width:130},{key:"family",label:"Hộ",width:200},{key:"address",label:"Địa chỉ",width:160},{key:"members",label:"Số người",mono:true,width:90},{key:"woc",label:"BPTT",width:130},{key:"children",label:"Trẻ <5T",mono:true,width:80},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["family","address"], searchPlaceholder:"Tìm hộ...",
    actions:[{ic:"file",title:"Hồ sơ hộ",onClick:r=>ti("Mở hộ")}],
    primaryAction:{label:"Đăng ký hộ",ic:"plus",onClick:()=>ti("Form hộ")} };
})();

// REPRODUCTIVE HEALTH
window.ReproductiveHealthConfig = (() => {
  const { title, data } = _phMake("Sức khoẻ sinh sản","SKS",72, i => ({
    patient:rndName(i), pid:rndPid(), age:rndAge(),
    service:rndPick(["Tiền hôn nhân","Tiền thai","Khám thai","Sau sinh","Phòng K","Tư vấn TT"]),
    week:i%3 ? Math.floor(Math.random()*40) : null,
    doctor:"BS."+rndName(i+5).split(" ").pop(),
    visitDate:_isoDate(todayG,-i*2),
  }));
  return { title, data,
    kpis:[{lbl:"Lượt khám",val:data.length},{lbl:"Khám thai",val:data.filter(r=>r.service==="Khám thai").length,tone:"info"},{lbl:"Tiền hôn nhân",val:data.filter(r=>r.service==="Tiền hôn nhân").length,tone:"focus"},{lbl:"Tỷ lệ KT3 lần",val:"94%",tone:"ok"}],
    statusTabs:_phTabs,
    columns:[{key:"code",label:"Mã",code:true,width:130},{key:"patient",label:"Phụ nữ",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.age}t</div></>},{key:"service",label:"Dịch vụ",width:140},{key:"week",label:"Tuần thai",mono:true,width:100,render:r=>r.week||"—"},{key:"doctor",label:"BS",width:140},{key:"visitDate",label:"Ngày",render:r=>fmtDMYg(r.visitDate),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid"], searchPlaceholder:"Tìm BN...",
    actions:[{ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Đăng ký dịch vụ",ic:"plus",onClick:()=>ti("Form SKS")} };
})();

// MENTAL HEALTH
window.MentalHealthConfig = (() => {
  const data = _g8(48, i => {
    const s = ["intake","therapy","stable","relapse"][i%4];
    return { code:"TT-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      diagnosis:rndPick(["Trầm cảm","Rối loạn lo âu","Tâm thần phân liệt","Rối loạn lưỡng cực","Stress sau sang chấn"]),
      severity:rndPick(["Nhẹ","Vừa","Nặng"]),
      therapy:rndPick(["CBT","Thuốc","Tâm lý nhóm","ECT"]),
      lastVisit:_isoDate(todayG,-Math.floor(Math.random()*30)),
      doctor:"BS."+rndName(i+5).split(" ").pop(),
      _status:s, statusLbl:{intake:"Tiếp nhận",therapy:"Đang ĐT",stable:"Ổn định",relapse:"Tái phát"}[s], statusTone:{intake:"warn",therapy:"info",stable:"ok",relapse:"crit"}[s] };
  });
  return { data, title:"Sức khoẻ tâm thần",
    kpis:[{lbl:"BN đang ĐT",val:data.filter(r=>r._status==="therapy").length,tone:"info"},{lbl:"Tái phát",val:data.filter(r=>r._status==="relapse").length,tone:"crit"},{lbl:"Ổn định",val:data.filter(r=>r._status==="stable").length,tone:"ok"},{lbl:"BN mới/tháng",val:data.filter(r=>r._status==="intake").length,tone:"warn"}],
    statusTabs:[{v:"intake",l:"Tiếp nhận",tone:"warn"},{v:"therapy",l:"ĐT",tone:"info"},{v:"stable",l:"Ổn định",tone:"ok"},{v:"relapse",l:"Tái phát",tone:"crit"}],
    columns:[{key:"code",label:"Mã BN",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"diagnosis",label:"Chẩn đoán",width:180},{key:"severity",label:"Mức độ",width:80,render:r=><StatusBadge tone={r.severity==="Nặng"?"crit":r.severity==="Vừa"?"warn":"info"}>{r.severity}</StatusBadge>},{key:"therapy",label:"Liệu pháp",width:120},{key:"doctor",label:"BS",width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid","diagnosis"], searchPlaceholder:"Tìm BN...",
    actions:[{ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Đăng ký BN",ic:"plus",onClick:()=>ti("Form TT")} };
})();

// TRAUMA REGISTRY
window.TraumaRegistryConfig = (() => {
  const data = _g8(72, i => {
    const s = ["new","admitted","discharged","died"][i%4 === 3 && i%9 ? 1 : i%4];
    return { code:"CT-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      mechanism:rndPick(["TNGT","TNLĐ","Té cao","Đả thương","Bỏng","Đuối nước"]),
      iss:Math.floor(Math.random()*60),
      gcs:3+Math.floor(Math.random()*13),
      admittedAt:_isoDate(todayG,-i),
      hospital:rndPick(["BV Chấn thương","BV ĐK","BV Quận 11"]),
      _status:s, statusLbl:{new:"Mới nhập",admitted:"Đang ĐT",discharged:"Xuất viện",died:"Tử vong"}[s], statusTone:{new:"warn",admitted:"info",discharged:"ok",died:"crit"}[s] };
  });
  return { data, title:"Sổ chấn thương",
    kpis:[{lbl:"Ca CT/tháng",val:data.length},{lbl:"Đang ĐT",val:data.filter(r=>r._status==="admitted").length,tone:"info"},{lbl:"Tử vong",val:data.filter(r=>r._status==="died").length,tone:"crit"},{lbl:"ISS TB",val:Math.round(data.reduce((s,r)=>s+r.iss,0)/data.length),tone:"focus"}],
    statusTabs:[{v:"new",l:"Mới",tone:"warn"},{v:"admitted",l:"Đang ĐT",tone:"info"},{v:"discharged",l:"Xuất viện",tone:"ok"},{v:"died",l:"Tử vong",tone:"crit"}],
    columns:[{key:"code",label:"Mã CT",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"mechanism",label:"Cơ chế",width:140},{key:"iss",label:"ISS",mono:true,width:60},{key:"gcs",label:"GCS",mono:true,width:60},{key:"hospital",label:"BV",width:140},{key:"admittedAt",label:"Nhập",render:r=>fmtDMYg(r.admittedAt),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["patient","pid","mechanism"], searchPlaceholder:"Tìm ca CT...",
    actions:[{ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Ghi nhận",ic:"plus",onClick:()=>ti("Form sổ CT")} };
})();

// MEDICAL FORENSICS
window.MedicalForensicsConfig = (() => {
  const data = _g8(36, i => {
    const s = ["pending","examining","reported","appealed"][i%4];
    return { code:"GĐ-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      type:rndPick(["Thương tích","Tử thi","Sức khoẻ","Tâm thần","Hình sự"]),
      requester:rndPick(["CA Q.1","CA Q.5","Viện KSND","TAND","Đương sự"]),
      receivedAt:_isoDate(todayG,-i*3),
      examiner:"BS."+rndName(i+5).split(" ").pop(),
      _status:s, statusLbl:{pending:"Chờ KT",examining:"Đang KT",reported:"Có KQ",appealed:"Khiếu nại"}[s], statusTone:{pending:"warn",examining:"info",reported:"ok",appealed:"crit"}[s] };
  });
  return { data, title:"Giám định y khoa",
    kpis:[{lbl:"Hồ sơ tháng",val:data.length},{lbl:"Đang KT",val:data.filter(r=>r._status==="examining").length,tone:"info"},{lbl:"Có KQ",val:data.filter(r=>r._status==="reported").length,tone:"ok"},{lbl:"Khiếu nại",val:data.filter(r=>r._status==="appealed").length,tone:"crit"}],
    statusTabs:[{v:"pending",l:"Chờ",tone:"warn"},{v:"examining",l:"Đang KT",tone:"info"},{v:"reported",l:"Có KQ",tone:"ok"},{v:"appealed",l:"Khiếu nại",tone:"crit"}],
    columns:[{key:"code",label:"Mã GĐ",code:true,width:130},{key:"patient",label:"Đương sự",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"type",label:"Loại GĐ",width:120},{key:"requester",label:"Cơ quan YC",width:130},{key:"examiner",label:"BS GĐ",width:140},{key:"receivedAt",label:"Nhận",render:r=>fmtDMYg(r.receivedAt),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["patient","pid","requester"], searchPlaceholder:"Tìm hồ sơ GĐ...",
    actions:[{ic:"file",title:"Báo cáo GĐ",onClick:r=>ti("Mở BC")}],
    primaryAction:{label:"Tiếp nhận",ic:"plus",onClick:()=>ti("Form GĐ")} };
})();

// PATIENT PORTAL
window.PatientPortalConfig = (() => {
  const data = _g8(120, i => {
    const s = ["active","inactive","suspended"][i%3];
    return { code:"PP-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i), phone:rndPhone(),
      registeredAt:_isoDate(todayG,-Math.floor(Math.random()*365)),
      lastLogin:_isoDate(todayG,-Math.floor(Math.random()*30)),
      bookings:Math.floor(Math.random()*30),
      messages:Math.floor(Math.random()*100),
      _status:s, statusLbl:{active:"Hoạt động",inactive:"Không hoạt động",suspended:"Khoá"}[s], statusTone:{active:"ok",inactive:"muted",suspended:"crit"}[s] };
  });
  return { data, title:"Cổng bệnh nhân",
    kpis:[{lbl:"Người dùng",val:data.length},{lbl:"Hoạt động",val:data.filter(r=>r._status==="active").length,tone:"ok"},{lbl:"Lượt đặt lịch",val:data.reduce((s,r)=>s+r.bookings,0),tone:"info"},{lbl:"Tin nhắn",val:data.reduce((s,r)=>s+r.messages,0),tone:"focus"}],
    statusTabs:[{v:"active",l:"Hoạt động",tone:"ok"},{v:"inactive",l:"Không HĐ",tone:"muted"},{v:"suspended",l:"Khoá",tone:"crit"}],
    columns:[{key:"code",label:"Mã",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid} · {r.phone}</div></>},{key:"registeredAt",label:"Đăng ký",render:r=>fmtDMYg(r.registeredAt),mono:true,width:110},{key:"lastLogin",label:"Đăng nhập gần",render:r=>fmtDMYg(r.lastLogin),mono:true,width:120},{key:"bookings",label:"Đặt lịch",mono:true,width:90},{key:"messages",label:"Tin nhắn",mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:130}],
    rowKey:r=>r.code, searchKeys:["patient","pid","phone"], searchPlaceholder:"Tìm BN...",
    actions:[{ic:"x",title:"Khoá tài khoản",tone:"crit",onClick:r=>cf("Khoá "+r.patient+"?",()=>tk("Đã khoá"))}],
    primaryAction:{label:"Cấp tài khoản",ic:"plus",onClick:()=>ti("Form đăng ký")} };
})();

// SATISFACTION SURVEY
window.SatisfactionSurveyConfig = (() => {
  const data = _g8(96, i => {
    const score = 1+Math.floor(Math.random()*5);
    const s = score>=4 ? "good" : score>=3 ? "ok" : "bad";
    return { code:"KS-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      department:rndPick(["Khoa Khám","Khoa Nội","Khoa Ngoại","Cấp cứu","Sản"]),
      service:rndPick(["Khám","Cận LS","Điều trị","Tiếp đón","Y tá","Vệ sinh"]),
      score, comment:rndPick(["Hài lòng","BS rất nhiệt tình","Chờ lâu","Phòng sạch sẽ","Cần cải thiện","Tốt","Bình thường"]),
      surveyAt:_isoDate(todayG,-i%30),
      _status:s, statusLbl:{good:"Tốt",ok:"Trung bình",bad:"Kém"}[s], statusTone:{good:"ok",ok:"info",bad:"crit"}[s] };
  });
  return { data, title:"Khảo sát hài lòng",
    kpis:[{lbl:"Phiếu/tháng",val:data.length},{lbl:"Điểm TB",val:(data.reduce((s,r)=>s+r.score,0)/data.length).toFixed(1),unit:"/5",tone:"focus"},{lbl:"Tích cực",val:data.filter(r=>r._status==="good").length,tone:"ok"},{lbl:"Tiêu cực",val:data.filter(r=>r._status==="bad").length,tone:"crit"}],
    statusTabs:[{v:"good",l:"Tốt",tone:"ok"},{v:"ok",l:"TB",tone:"info"},{v:"bad",l:"Kém",tone:"crit"}],
    columns:[{key:"code",label:"Mã KS",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"department",label:"Khoa",width:130},{key:"service",label:"Dịch vụ",width:120},{key:"score",label:"Điểm",mono:true,width:70,render:r=>"⭐".repeat(r.score)},{key:"comment",label:"Nhận xét"},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","department","comment"], searchPlaceholder:"Tìm phiếu KS...",
    actions:[{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở")}],
    primaryAction:{label:"Tạo khảo sát",ic:"plus",onClick:()=>ti("Form KS")} };
})();

// HELP
window.HelpConfig = (() => {
  const data = _g8(40, i => ({
    code:"FAQ-"+String(101+i).padStart(4,"0"),
    topic:rndPick(["Tài khoản","Đặt lịch","Thanh toán","Báo cáo","HSBA","Cấu hình hệ thống"]),
    title:rndPick(["Cách đăng ký BN mới","Cách đặt lịch hẹn online","Hướng dẫn thanh toán BHYT","Xuất báo cáo tháng","Tra cứu hồ sơ BA","Cấp quyền user mới"]),
    views:50+Math.floor(Math.random()*5000),
    updatedAt:_isoDate(todayG,-i*7),
    rating:(3+Math.random()*2).toFixed(1),
    _status:"published", statusLbl:"Xuất bản", statusTone:"ok"
  }));
  return { data, title:"Trợ giúp & FAQ",
    kpis:[{lbl:"Bài viết",val:data.length},{lbl:"Lượt xem/tháng",val:data.reduce((s,r)=>s+r.views,0),tone:"info"},{lbl:"Đánh giá TB",val:"4.5",unit:"/5",tone:"ok"},{lbl:"Chủ đề",val:6,tone:"focus"}],
    columns:[{key:"code",label:"Mã",code:true,width:120},{key:"topic",label:"Chủ đề",width:130},{key:"title",label:"Tiêu đề"},{key:"views",label:"Lượt xem",mono:true,width:100},{key:"rating",label:"⭐",mono:true,width:70},{key:"updatedAt",label:"Cập nhật",render:r=>fmtDMYg(r.updatedAt),mono:true,width:110},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["title","topic"], searchPlaceholder:"Tìm bài viết...",
    actions:[{ic:"file",title:"Đọc",onClick:r=>ti("Đọc "+r.title)}],
    primaryAction:{label:"Viết bài mới",ic:"plus",onClick:()=>ti("Form bài FAQ")} };
})();
