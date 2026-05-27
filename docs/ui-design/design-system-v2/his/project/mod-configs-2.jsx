// =====================================================================
// HIS · Module configs 2 — paraclinical & support
// =====================================================================

const _gen2 = (n, fn) => Array.from({length:n}, (_, i) => fn(i));

// MEDICAL RECORD PLANNING
window.MedicalRecordPlanningConfig = (() => {
  const data = _gen2(64, i => {
    const s = ["draft","approved","in-progress","done"][i%4];
    return {
      code: "KHTH-"+String(2401+i).padStart(5,"0"),
      pid: rndPid(), name: rndName(i),
      diagnosis: rndPick(["K dạ dày","Suy tim","Đái tháo đường","Viêm phổi","Đột quỵ","Suy thận"]),
      doctor: "BS."+rndName(i+5).split(" ").pop(),
      duration: 5 + Math.floor(Math.random()*15),
      created: _isoDate(todayG, -i),
      _status: s,
      statusLbl: {draft:"Soạn thảo",approved:"Đã duyệt","in-progress":"Đang TH",done:"Hoàn thành"}[s],
      statusTone:{draft:"warn",approved:"info","in-progress":"focus",done:"ok"}[s],
    };
  });
  return {
    title:"Kế hoạch điều trị",
    kpis:[
      {lbl:"KH đang lập",val:data.filter(r=>r._status==="draft").length,tone:"warn"},
      {lbl:"Đã duyệt",val:data.filter(r=>r._status==="approved").length,tone:"info"},
      {lbl:"Đang thực hiện",val:data.filter(r=>r._status==="in-progress").length,tone:"focus"},
      {lbl:"Hoàn thành",val:data.filter(r=>r._status==="done").length,tone:"ok"},
    ],
    statusTabs:[{v:"draft",l:"Soạn thảo",tone:"warn"},{v:"approved",l:"Đã duyệt",tone:"info"},{v:"in-progress",l:"Đang TH",tone:"focus"},{v:"done",l:"Hoàn thành",tone:"ok"}],
    columns:[
      {key:"code",label:"Mã KH",code:true,width:130},
      {key:"name",label:"Bệnh nhân",render:r=><><b>{r.name}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},
      {key:"diagnosis",label:"Chẩn đoán"},
      {key:"doctor",label:"BS lập",width:140},
      {key:"duration",label:"Thời gian (ngày)",mono:true,width:130},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:130},
    ],
    rowKey:r=>r.code,
    searchKeys:["name","pid","code","diagnosis"],
    searchPlaceholder:"Tìm KH điều trị...",
    actions:[
      {ic:"check",title:"Phê duyệt",onClick:r=>cf("Duyệt KH "+r.code+"?",()=>tk("Đã duyệt "+r.code))},
      {ic:"file",title:"Xem KH",onClick:r=>ti("Mở "+r.code)},
    ],
    primaryAction:{label:"Lập KH mới",ic:"plus",onClick:()=>ti("Form lập kế hoạch")},
  };
})();

// TREATMENT PROTOCOL
window.TreatmentProtocolConfig = (() => {
  const data = _gen2(48, i => {
    const cat = ["Tim mạch","Hô hấp","Tiêu hoá","Tiết niệu","Nội tiết","Ung bướu","Truyền nhiễm","Cấp cứu"];
    const s = ["draft","active","retired"][i%3];
    return {
      code:"PD-"+String(101+i).padStart(4,"0"),
      name: rndPick(["Phác đồ tăng huyết áp","Phác đồ ĐTĐ type 2","Phác đồ COPD","Phác đồ NT đường tiểu","Phác đồ K vú","Phác đồ XHTH","Phác đồ Sốt xuất huyết","Phác đồ Viêm phổi cộng đồng"]),
      category: rndPick(cat),
      version:"v"+(1+i%5)+"."+(i%9),
      author:"BS."+rndName(i).split(" ").pop(),
      lastUpdate: _isoDate(todayG, -i*3),
      usage: 10 + Math.floor(Math.random()*200),
      _status:s,
      statusLbl:{draft:"Bản nháp",active:"Đang dùng",retired:"Ngưng dùng"}[s],
      statusTone:{draft:"warn",active:"ok",retired:"muted"}[s],
    };
  });
  return {
    title:"Phác đồ điều trị",
    kpis:[
      {lbl:"Tổng phác đồ",val:data.length},
      {lbl:"Đang sử dụng",val:data.filter(r=>r._status==="active").length,tone:"ok"},
      {lbl:"Lượt áp dụng/tháng",val:"3,420",tone:"info"},
      {lbl:"Cập nhật trong năm",val:18,tone:"focus"},
    ],
    statusTabs:[{v:"draft",l:"Bản nháp",tone:"warn"},{v:"active",l:"Đang dùng",tone:"ok"},{v:"retired",l:"Ngưng dùng",tone:"muted"}],
    columns:[
      {key:"code",label:"Mã PĐ",code:true,width:110},
      {key:"name",label:"Tên phác đồ"},
      {key:"category",label:"Chuyên khoa",width:130},
      {key:"version",label:"Phiên bản",mono:true,width:90},
      {key:"author",label:"Tác giả",width:140},
      {key:"usage",label:"Lượt dùng",mono:true,width:90},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120},
    ],
    rowKey:r=>r.code,
    searchKeys:["name","code","category","author"],
    searchPlaceholder:"Tìm phác đồ...",
    actions:[
      {ic:"file",title:"Xem chi tiết",onClick:r=>ti("Mở "+r.name)},
      {ic:"copy",title:"Tạo phiên bản mới",onClick:r=>tk("Đã tạo bản nháp v"+(parseFloat(r.version.slice(1))+0.1).toFixed(1))},
    ],
    primaryAction:{label:"Tạo phác đồ",ic:"plus",onClick:()=>ti("Form phác đồ mới")},
  };
})();

// CHRONIC DISEASE
window.ChronicDiseaseConfig = (() => {
  const dz = ["Tăng huyết áp","Đái tháo đường","COPD","Hen phế quản","Suy tim","Suy thận","Gout","Viêm khớp"];
  const data = _gen2(150, i => {
    const s = ["stable","monitor","unstable","critical"][i%4];
    return {
      pid: rndPid(), name: rndName(i), age: rndAge(), gender: rndGender(),
      disease: rndPick(dz),
      duration: 1 + Math.floor(Math.random()*15),
      doctor:"BS."+rndName(i+3).split(" ").pop(),
      lastVisit:_isoDate(todayG,-Math.floor(Math.random()*60)),
      nextVisit:_isoDate(todayG,Math.floor(Math.random()*30)),
      adherence: 60 + Math.floor(Math.random()*40),
      _status:s,
      statusLbl:{stable:"Ổn định",monitor:"Theo dõi",unstable:"Không ổn định",critical:"Cảnh báo"}[s],
      statusTone:{stable:"ok",monitor:"info",unstable:"warn",critical:"crit"}[s],
    };
  });
  return {
    title:"Bệnh mạn tính",
    kpis:[
      {lbl:"BN quản lý",val:data.length,sub:"đang theo dõi"},
      {lbl:"Cần cảnh báo",val:data.filter(r=>r._status==="critical").length,tone:"crit"},
      {lbl:"Tái khám 7 ngày",val:42,tone:"focus"},
      {lbl:"Tuân thủ TB",val:"82%",tone:"ok"},
    ],
    statusTabs:[{v:"stable",l:"Ổn định",tone:"ok"},{v:"monitor",l:"Theo dõi",tone:"info"},{v:"unstable",l:"Không ổn định",tone:"warn"},{v:"critical",l:"Cảnh báo",tone:"crit"}],
    columns:[
      {key:"pid",label:"Mã BN",code:true,width:110},
      {key:"name",label:"Họ tên",render:r=><><b>{r.name}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.gender} · {r.age}t</div></>},
      {key:"disease",label:"Bệnh chính",width:160},
      {key:"duration",label:"Năm bệnh",mono:true,width:90},
      {key:"adherence",label:"Tuân thủ",render:r=><span style={{color:r.adherence>80?"var(--s-ok)":r.adherence>60?"var(--s-warn)":"var(--s-crit)",fontFamily:"var(--font-mono)"}}>{r.adherence}%</span>,width:100},
      {key:"nextVisit",label:"Tái khám",render:r=>fmtDMYg(r.nextVisit),mono:true,width:100},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:130},
    ],
    rowKey:r=>r.pid+"-"+r.disease,
    searchKeys:["name","pid","disease","doctor"],
    searchPlaceholder:"Tìm BN mạn tính...",
    filters:[{key:"disease",label:"Bệnh",options:dz.map(v=>({v,l:v}))}],
    actions:[
      {ic:"phone",title:"Nhắc tái khám",onClick:r=>tk("Đã nhắn SMS "+r.name)},
      {ic:"file",title:"Xem hồ sơ",onClick:r=>ti("Mở HS "+r.pid)},
    ],
    primaryAction:{label:"Đăng ký BN",ic:"plus",onClick:()=>ti("Đăng ký BN mạn tính")},
  };
})();

// TB-HIV
window.TbHivManagementConfig = (() => {
  const data = _gen2(80, i => {
    const dz = i%2 ? "Lao" : "HIV";
    const phase = dz==="Lao" ? rndPick(["Tấn công","Duy trì","Hoàn tất","Bỏ trị"]) : rndPick(["Theo dõi","ARV","Kháng thuốc","Mất dấu"]);
    const s = phase==="Bỏ trị"||phase==="Mất dấu" ? "crit" : phase==="Hoàn tất" ? "ok" : phase==="Kháng thuốc" ? "warn" : "info";
    return {
      pid: rndPid(), name: rndName(i),
      disease: dz,
      phase,
      regimen: dz==="Lao" ? rndPick(["2RHZE/4RH","6E2HRZ/6HE","Phác đồ MDR"]) : rndPick(["TDF+3TC+EFV","ABC+3TC+DTG","TDF+3TC+DTG"]),
      startDate: _isoDate(todayG, -30 - Math.floor(Math.random()*500)),
      facility: rndPick(["TYT P.1","TYT P.5","BV Nhiệt đới","TT KSBT"]),
      _status: s,
      statusLbl: phase, statusTone: s,
    };
  });
  return {
    title:"Quản lý Lao / HIV",
    kpis:[
      {lbl:"BN Lao",val:data.filter(r=>r.disease==="Lao").length},
      {lbl:"BN HIV",val:data.filter(r=>r.disease==="HIV").length},
      {lbl:"Mất dấu / Bỏ trị",val:data.filter(r=>r._status==="crit").length,tone:"crit"},
      {lbl:"Kháng thuốc",val:data.filter(r=>r._status==="warn").length,tone:"warn"},
    ],
    statusTabs:[{v:"info",l:"Đang điều trị",tone:"info"},{v:"warn",l:"Kháng thuốc",tone:"warn"},{v:"ok",l:"Hoàn tất",tone:"ok"},{v:"crit",l:"Bỏ/mất dấu",tone:"crit"}],
    columns:[
      {key:"pid",label:"Mã BN",code:true,width:110},
      {key:"name",label:"Họ tên",render:r=><b>{r.name}</b>},
      {key:"disease",label:"Bệnh",width:80,render:r=><StatusBadge tone={r.disease==="Lao"?"warn":"crit"}>{r.disease}</StatusBadge>},
      {key:"phase",label:"Giai đoạn",width:130},
      {key:"regimen",label:"Phác đồ",width:160,mono:true},
      {key:"facility",label:"Cơ sở quản lý",width:130},
      {key:"startDate",label:"Bắt đầu",render:r=>fmtDMYg(r.startDate),mono:true,width:100},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120},
    ],
    rowKey:r=>r.pid+"-"+r.disease,
    searchKeys:["name","pid","regimen","facility"],
    searchPlaceholder:"Tìm BN Lao/HIV...",
    filters:[{key:"disease",label:"Bệnh",options:[{v:"Lao",l:"Lao"},{v:"HIV",l:"HIV"}]}],
    actions:[
      {ic:"phone",title:"Liên hệ",onClick:r=>tk("Gọi "+r.name)},
      {ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở HS "+r.pid)},
    ],
    primaryAction:{label:"Đăng ký BN mới",ic:"plus",onClick:()=>ti("Đăng ký Lao/HIV")},
  };
})();

// DOCTOR PORTAL
window.DoctorPortalConfig = (() => {
  const data = _gen2(28, i => {
    const dept = rndPick(["Nội","Ngoại","Sản","Nhi","TMH","RHM","Mắt","HSCC","Cấp cứu"]);
    const s = ["online","busy","offline"][i%3];
    return {
      code:"BS-"+String(101+i).padStart(4,"0"),
      name:"BS."+rndName(i),
      dept, level: rndPick(["BS","ThS","TS","PGS","GS"]),
      patientsToday: Math.floor(Math.random()*40),
      patientsMonth: 200 + Math.floor(Math.random()*500),
      rating: (4 + Math.random()).toFixed(1),
      _status:s,
      statusLbl:{online:"Online",busy:"Đang bận",offline:"Offline"}[s],
      statusTone:{online:"ok",busy:"warn",offline:"muted"}[s],
    };
  });
  return {
    title:"Cổng bác sĩ",
    kpis:[
      {lbl:"BS đang trực",val:data.filter(r=>r._status==="online").length,tone:"ok"},
      {lbl:"Đang bận",val:data.filter(r=>r._status==="busy").length,tone:"warn"},
      {lbl:"Tổng BN/ngày",val:data.reduce((s,r)=>s+r.patientsToday,0),tone:"info"},
      {lbl:"Đánh giá TB",val:"4.6",unit:"/5",tone:"focus"},
    ],
    statusTabs:[{v:"online",l:"Online",tone:"ok"},{v:"busy",l:"Bận",tone:"warn"},{v:"offline",l:"Offline",tone:"muted"}],
    columns:[
      {key:"code",label:"Mã BS",code:true,width:100},
      {key:"name",label:"Họ tên",render:r=><><b>{r.name}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.level} · {r.dept}</div></>},
      {key:"patientsToday",label:"BN hôm nay",mono:true,width:110},
      {key:"patientsMonth",label:"BN/tháng",mono:true,width:100},
      {key:"rating",label:"Đánh giá",mono:true,width:90},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110},
    ],
    rowKey:r=>r.code,
    searchKeys:["name","code","dept"],
    searchPlaceholder:"Tìm bác sĩ...",
    filters:[{key:"dept",label:"Khoa",options:["Nội","Ngoại","Sản","Nhi","TMH","RHM","Mắt","HSCC","Cấp cứu"].map(v=>({v,l:v}))}],
    actions:[{ic:"phone",title:"Liên hệ",onClick:r=>tk("Gọi "+r.name)},{ic:"file",title:"Lịch trực",onClick:r=>ti("Lịch "+r.name)}],
    primaryAction:{label:"Phân công",ic:"plus",onClick:()=>ti("Form phân công BS")},
  };
})();
