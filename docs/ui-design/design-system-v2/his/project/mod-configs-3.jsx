// =====================================================================
// HIS · Module configs 3 — paraclinical (LIS/RIS auxiliary)
// =====================================================================

const _gen3 = (n, fn) => Array.from({length:n}, (_, i) => fn(i));

// LAB QC
window.LabQCConfig = (() => {
  const data = _gen3(54, i => {
    const tests = ["Glucose","ALT","AST","Creatinine","Hb","WBC","HbA1c","TSH","CRP","Na+","K+","Cl-"];
    const s = ["pass","warn","fail"][i%3 === 0 ? 0 : i%5 === 0 ? 2 : i%7===0?1:0];
    const t = rndPick(tests);
    return {
      code:"QC-"+String(2401+i).padStart(5,"0"),
      machine: rndPick(["AU480","Cobas 6000","Sysmex XN","Architect i2000"]),
      test: t, level: rndPick(["L1","L2","L3"]),
      mean: (10+Math.random()*100).toFixed(2),
      sd: (Math.random()*5).toFixed(2),
      cv: (1+Math.random()*5).toFixed(2),
      runDate: _isoDate(todayG, -i),
      tech: rndName(i+8),
      _status: s, statusLbl:{pass:"Đạt",warn:"Cảnh báo",fail:"Không đạt"}[s], statusTone:{pass:"ok",warn:"warn",fail:"crit"}[s],
    };
  });
  return {
    title:"QC Kiểm định LIS",
    kpis:[
      {lbl:"Lượt QC/ngày",val:data.length,sub:"toàn lab"},
      {lbl:"Đạt",val:data.filter(r=>r._status==="pass").length,tone:"ok"},
      {lbl:"Cảnh báo",val:data.filter(r=>r._status==="warn").length,tone:"warn"},
      {lbl:"Không đạt",val:data.filter(r=>r._status==="fail").length,tone:"crit"},
    ],
    statusTabs:[{v:"pass",l:"Đạt",tone:"ok"},{v:"warn",l:"Cảnh báo",tone:"warn"},{v:"fail",l:"Không đạt",tone:"crit"}],
    columns:[
      {key:"code",label:"Mã QC",code:true,width:120},
      {key:"machine",label:"Máy",width:120},
      {key:"test",label:"Xét nghiệm",width:110},
      {key:"level",label:"Mức",mono:true,width:60},
      {key:"mean",label:"Mean",mono:true,width:80},
      {key:"sd",label:"SD",mono:true,width:70},
      {key:"cv",label:"CV%",mono:true,width:70},
      {key:"runDate",label:"Ngày",render:r=>fmtDMYg(r.runDate),mono:true,width:100},
      {key:"_status",label:"Kết quả",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110},
    ],
    rowKey:r=>r.code,
    searchKeys:["test","machine","tech"],
    searchPlaceholder:"Tìm QC...",
    filters:[{key:"machine",label:"Máy",options:["AU480","Cobas 6000","Sysmex XN","Architect i2000"].map(v=>({v,l:v}))}],
    actions:[{ic:"file",title:"Biểu đồ Levey-Jennings",onClick:r=>ti("Mở chart "+r.test)}],
    primaryAction:{label:"Chạy QC mới",ic:"plus",onClick:()=>ti("Chạy QC")},
  };
})();

// MICROBIOLOGY
window.MicrobiologyConfig = (() => {
  const data = _gen3(72, i => {
    const s = ["pending","incubating","positive","negative"][i%4];
    return {
      sample:"VS-"+String(2401+i).padStart(5,"0"),
      pid: rndPid(), name: rndName(i),
      sampleType: rndPick(["Máu","Nước tiểu","Đờm","Phân","Dịch","Mủ"]),
      organism: s==="positive"?rndPick(["E.coli","S.aureus","P.aeruginosa","K.pneumoniae","Candida albicans"]):"—",
      requestDate: _isoDate(todayG, -i%14),
      doctor: "BS."+rndName(i+5).split(" ").pop(),
      _status:s,
      statusLbl:{pending:"Chờ cấy",incubating:"Đang ủ",positive:"Dương tính",negative:"Âm tính"}[s],
      statusTone:{pending:"warn",incubating:"info",positive:"crit",negative:"ok"}[s],
    };
  });
  return {
    title:"Vi sinh",
    kpis:[
      {lbl:"Mẫu trong ngày",val:data.length},
      {lbl:"Đang ủ",val:data.filter(r=>r._status==="incubating").length,tone:"info"},
      {lbl:"Dương tính",val:data.filter(r=>r._status==="positive").length,tone:"crit"},
      {lbl:"TAT trung bình",val:"42",unit:"giờ",tone:"focus"},
    ],
    statusTabs:[{v:"pending",l:"Chờ cấy",tone:"warn"},{v:"incubating",l:"Đang ủ",tone:"info"},{v:"positive",l:"Dương tính",tone:"crit"},{v:"negative",l:"Âm tính",tone:"ok"}],
    columns:[
      {key:"sample",label:"Mã mẫu",code:true,width:130},
      {key:"name",label:"Bệnh nhân",render:r=><><b>{r.name}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},
      {key:"sampleType",label:"Loại mẫu",width:100},
      {key:"organism",label:"Vi sinh vật",width:160,mono:true},
      {key:"requestDate",label:"Ngày yêu cầu",render:r=>fmtDMYg(r.requestDate),mono:true,width:120},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120},
    ],
    rowKey:r=>r.sample,
    searchKeys:["name","pid","sample","organism"],
    searchPlaceholder:"Tìm mẫu vi sinh...",
    actions:[{ic:"file",title:"Kết quả KSĐ",onClick:r=>ti("Antibiogram "+r.sample)}],
    primaryAction:{label:"Nhận mẫu",ic:"plus",onClick:()=>ti("Form nhận mẫu vi sinh")},
  };
})();

// CULTURE COLLECTION
window.CultureCollectionConfig = (() => {
  const data = _gen3(40, i => {
    const s = ["active","inactive","disposed"][i%3];
    return {
      code:"CC-"+String(101+i).padStart(4,"0"),
      organism: rndPick(["E.coli ATCC 25922","S.aureus ATCC 25923","P.aeruginosa ATCC 27853","K.pneumoniae","Salmonella spp.","C.albicans"]),
      origin: rndPick(["Bệnh phẩm máu","Nước tiểu","Mủ vết mổ","Dịch hô hấp","Phân"]),
      collected: _isoDate(todayG, -i*7),
      shelfLife: 365 + Math.floor(Math.random()*365*2),
      storage: rndPick(["-80°C tủ A","-80°C tủ B","-20°C","Lyophilized"]),
      _status:s,
      statusLbl:{active:"Đang lưu",inactive:"Hết hạn",disposed:"Đã hủy"}[s],
      statusTone:{active:"ok",inactive:"warn",disposed:"muted"}[s],
    };
  });
  return {
    title:"Lưu chủng vi sinh",
    kpis:[
      {lbl:"Chủng lưu trữ",val:data.filter(r=>r._status==="active").length,tone:"ok"},
      {lbl:"Hết hạn",val:data.filter(r=>r._status==="inactive").length,tone:"warn"},
      {lbl:"Đã hủy",val:data.filter(r=>r._status==="disposed").length,tone:"muted"},
      {lbl:"Tủ -80°C",val:"2",sub:"vị trí"},
    ],
    statusTabs:[{v:"active",l:"Đang lưu",tone:"ok"},{v:"inactive",l:"Hết hạn",tone:"warn"},{v:"disposed",l:"Đã hủy",tone:"muted"}],
    columns:[
      {key:"code",label:"Mã chủng",code:true,width:110},
      {key:"organism",label:"Vi sinh vật",mono:true},
      {key:"origin",label:"Nguồn gốc",width:140},
      {key:"storage",label:"Bảo quản",width:120},
      {key:"collected",label:"Ngày thu thập",render:r=>fmtDMYg(r.collected),mono:true,width:120},
      {key:"shelfLife",label:"Hạn (ngày)",mono:true,width:100},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110},
    ],
    rowKey:r=>r.code,
    searchKeys:["organism","origin","code"],
    searchPlaceholder:"Tìm chủng...",
    actions:[{ic:"download",title:"Rút mẫu",onClick:r=>cf("Rút chủng "+r.code+"?",()=>tk("Đã rút"))}],
    primaryAction:{label:"Lưu chủng mới",ic:"plus",onClick:()=>ti("Form lưu chủng")},
  };
})();

// SCREENING (sàng lọc sơ sinh)
window.ScreeningConfig = (() => {
  const data = _gen3(95, i => {
    const s = ["pending","collected","reported","positive","followup"][i%5];
    return {
      code:"SS-"+String(2401+i).padStart(5,"0"),
      babyName: "Bé "+rndPick(["A","B","C","D","E"])+" "+rndName(i).split(" ").slice(-1)[0],
      motherName: rndName(i),
      birthDate: _isoDate(todayG, -2-Math.floor(Math.random()*15)),
      birthWeight: 2.4+Math.random()*1.6,
      tests: rndPick(["G6PD","TSH","17-OHP","PKU","Galactosemia","CAH"])+", " + rndPick(["G6PD","TSH","PKU"]),
      collectionDate: _isoDate(todayG,-i%14),
      _status:s,
      statusLbl:{pending:"Chờ lấy",collected:"Đã lấy mẫu",reported:"Có kết quả",positive:"Dương tính",followup:"Theo dõi"}[s],
      statusTone:{pending:"warn",collected:"info",reported:"ok",positive:"crit",followup:"focus"}[s],
    };
  });
  return {
    title:"Sàng lọc sơ sinh",
    kpis:[
      {lbl:"Trẻ sàng lọc/tháng",val:data.length},
      {lbl:"Đã có kết quả",val:data.filter(r=>r._status==="reported"||r._status==="positive").length,tone:"ok"},
      {lbl:"Dương tính",val:data.filter(r=>r._status==="positive").length,tone:"crit"},
      {lbl:"Cần theo dõi",val:data.filter(r=>r._status==="followup").length,tone:"focus"},
    ],
    statusTabs:[{v:"pending",l:"Chờ lấy",tone:"warn"},{v:"collected",l:"Đã lấy",tone:"info"},{v:"reported",l:"Có KQ",tone:"ok"},{v:"positive",l:"Dương tính",tone:"crit"},{v:"followup",l:"Theo dõi",tone:"focus"}],
    columns:[
      {key:"code",label:"Mã SL",code:true,width:120},
      {key:"babyName",label:"Tên trẻ",render:r=><><b>{r.babyName}</b><div style={{fontSize:11,color:"var(--t-2)"}}>Mẹ: {r.motherName}</div></>},
      {key:"birthDate",label:"Sinh",render:r=>fmtDMYg(r.birthDate),mono:true,width:100},
      {key:"birthWeight",label:"Cân nặng",render:r=>r.birthWeight.toFixed(2)+" kg",mono:true,width:100},
      {key:"tests",label:"Xét nghiệm",width:200},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:130},
    ],
    rowKey:r=>r.code,
    searchKeys:["babyName","motherName","code"],
    searchPlaceholder:"Tìm bé/mẹ...",
    actions:[{ic:"phone",title:"Báo gia đình",onClick:r=>tk("Đã gọi gia đình "+r.motherName)}],
    primaryAction:{label:"Đăng ký mới",ic:"plus",onClick:()=>ti("Form đăng ký SLSS")},
  };
})();

// SAMPLE STORAGE
window.SampleStorageConfig = (() => {
  const data = _gen3(86, i => {
    const s = ["stored","retrieved","disposed"][i%3];
    const fz = rndPick(["TÚ-1A","TÚ-1B","TÚ-2A","TÚ-2B","TÚ-3"]);
    return {
      code:"SS-"+String(2401+i).padStart(5,"0"),
      pid: rndPid(), patient: rndName(i),
      type: rndPick(["Huyết thanh","Huyết tương","Máu toàn phần","Mô bệnh","Mẫu DNA","Nước tiểu"]),
      volume: (0.5+Math.random()*4.5).toFixed(1),
      freezer: fz, position: "R"+(1+i%6)+"·C"+(1+i%9)+"·"+(1+i%10),
      collected:_isoDate(todayG,-i*3),
      tempLog: rndPick(["-80°C","-20°C","4°C"]),
      _status:s,
      statusLbl:{stored:"Đang lưu",retrieved:"Đã rút",disposed:"Đã hủy"}[s],
      statusTone:{stored:"ok",retrieved:"focus",disposed:"muted"}[s],
    };
  });
  return {
    title:"Lưu trữ mẫu sinh học",
    kpis:[
      {lbl:"Mẫu lưu trữ",val:data.filter(r=>r._status==="stored").length,tone:"ok"},
      {lbl:"5 tủ đông",val:5,sub:"hoạt động"},
      {lbl:"Nhiệt độ TB",val:"-78",unit:"°C",tone:"info"},
      {lbl:"Cảnh báo nhiệt",val:0,tone:"ok"},
    ],
    statusTabs:[{v:"stored",l:"Đang lưu",tone:"ok"},{v:"retrieved",l:"Đã rút",tone:"focus"},{v:"disposed",l:"Đã hủy",tone:"muted"}],
    columns:[
      {key:"code",label:"Mã mẫu",code:true,width:130},
      {key:"patient",label:"Bệnh nhân",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},
      {key:"type",label:"Loại mẫu",width:130},
      {key:"volume",label:"Thể tích (mL)",mono:true,width:100},
      {key:"freezer",label:"Tủ",mono:true,width:80},
      {key:"position",label:"Vị trí",mono:true,width:110},
      {key:"tempLog",label:"Nhiệt",mono:true,width:80},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110},
    ],
    rowKey:r=>r.code,
    searchKeys:["patient","pid","code","type"],
    searchPlaceholder:"Tìm mẫu...",
    filters:[{key:"freezer",label:"Tủ",options:["TÚ-1A","TÚ-1B","TÚ-2A","TÚ-2B","TÚ-3"].map(v=>({v,l:v}))}],
    actions:[{ic:"download",title:"Rút mẫu",onClick:r=>cf("Rút mẫu "+r.code+"?",()=>tk("Đã rút"))}],
    primaryAction:{label:"Nhập mẫu",ic:"plus",onClick:()=>ti("Form nhập mẫu")},
  };
})();
