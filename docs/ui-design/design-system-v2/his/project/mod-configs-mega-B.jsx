// =====================================================================
// HIS · Module configs MEGA-B — batches 11-15 (47 modules)
// =====================================================================

// ─── Shared helpers (also defined in mega-A; safe to redefine) ───
const _gM = (n, fn) => Array.from({length:n}, (_, i) => fn(i));
const _isoDateM = (d, off=0) => { const x = new Date(d); x.setDate(x.getDate()+off); return x; };
const _statBadgeM = (tone, label) => <StatusBadge tone={tone} dot>{label}</StatusBadge>;
const _gen4Lbl = {new:"Mới",processing:"Đang xử lý",done:"Hoàn tất",issue:"Có vấn đề"};
const _gen4Tone = {new:"warn",processing:"info",done:"ok",issue:"crit"};
const _gen4 = [
  {v:"new",l:"Mới",tone:"warn"},
  {v:"processing",l:"Đang xử lý",tone:"info"},
  {v:"done",l:"Hoàn tất",tone:"ok"},
  {v:"issue",l:"Có vấn đề",tone:"crit"},
];
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
const _rPatient = r => <><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>;
const _rDate = key => r => fmtDMYg(r[key]);
const _rStatus = r => _statBadgeM(r.statusTone, r.statusLbl);
const _cStatus = {key:"_status",label:"TT",render:_rStatus,width:120};

// Batch 11 — Pharmacy/Equipment
window.HospitalPharmacyConfig = _mkCfg({
  title:"Khoa Dược BV", codePrefix:"DBV", n:80,
  mkRow:i => ({ drug:rndPick(["Paracetamol 500mg","Amoxicillin 500mg","Aspirin 100mg","Insulin Mixtard","Atorvastatin 20mg","Omeprazole 20mg"]),
    category:rndPick(["Kháng sinh","Hạ sốt","Tim mạch","Tiểu đường","Tiêu hoá"]),
    qty:Math.floor(Math.random()*5000),
    minStock:500,
    location:"Kệ "+rndPick(["A","B","C"])+"-"+(1+Math.floor(Math.random()*30)),
    expiry:_isoDateM(todayG,30+Math.floor(Math.random()*700)) }),
  kpis:d => [{lbl:"Mục thuốc",val:d.length},{lbl:"Hết hàng",val:d.filter(r=>r.qty<r.minStock).length,tone:"crit"},{lbl:"Sắp hết HSD",val:d.filter(r=>(r.expiry-todayG)/86400000<60).length,tone:"warn"},{lbl:"Giá trị tồn",val:"12.4",unit:"tỷ",tone:"focus"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"drug",label:"Thuốc"},{key:"category",label:"Nhóm",width:130},{key:"qty",label:"Tồn",mono:true,width:90,render:r=><span style={{color:r.qty<r.minStock?"var(--s-crit)":"inherit",fontFamily:"var(--font-mono)"}}>{r.qty}</span>},{key:"location",label:"Vị trí",mono:true,width:110},{key:"expiry",label:"HSD",render:_rDate("expiry"),mono:true,width:100},_cStatus],
  search:["drug","category"], searchPh:"Tìm thuốc..."
});

window.MedicalSupplyConfig = _mkCfg({
  title:"Vật tư y tế", codePrefix:"VTYT", n:96,
  mkRow:i => ({ name:rndPick(["Băng gạc","Kim tiêm 23G","Catheter 18Fr","Dây truyền","Khẩu trang N95","Găng tay"]),
    category:rndPick(["Tiêu hao","Phẫu thuật","Cấp cứu","Cá nhân"]),
    qty:Math.floor(Math.random()*10000),
    unit:"chiếc",
    supplier:rndPick(["Cty A","Cty B","Cty C"]),
    cost:1000+Math.floor(Math.random()*100000) }),
  kpis:d => [{lbl:"Mục VTYT",val:d.length},{lbl:"Hết hàng",val:d.filter(r=>r.qty<100).length,tone:"crit"},{lbl:"Tổng giá trị",val:"8.2",unit:"tỷ",tone:"focus"},{lbl:"Tiêu thụ TB",val:"32K",unit:"/tuần",tone:"info"}],
  columns:[{key:"code",label:"Mã VT",code:true,width:120},{key:"name",label:"Vật tư"},{key:"category",label:"Nhóm",width:120},{key:"qty",label:"Tồn",mono:true,width:90},{key:"supplier",label:"NCC",width:120},{key:"cost",label:"Đơn giá",mono:true,width:120,render:r=>r.cost.toLocaleString("vi-VN")+" ₫"},_cStatus],
  search:["name","supplier"], searchPh:"Tìm VTYT..."
});

window.MedicalEquipmentConfig = _mkCfg({
  title:"Thiết bị y tế", codePrefix:"TB", n:60,
  mkRow:i => ({ name:rndPick(["Máy thở","Monitor BN","Máy siêu âm","CT scanner","X-quang DR","ECG","Máy gây mê"]),
    department:rndPick(["HSCC","Cấp cứu","CĐHA","Phòng mổ","Khoa Nội"]),
    serialNo:"SN-"+String(1000+i).padStart(5,"0"),
    purchaseYear:2018+i%8,
    lastMaint:_isoDateM(todayG,-Math.floor(Math.random()*180)),
    nextMaint:_isoDateM(todayG,Math.floor(Math.random()*180)) }),
  statusTabs:[{v:"new",l:"Mới",tone:"info"},{v:"processing",l:"Đang dùng",tone:"ok"},{v:"done",l:"Bảo trì",tone:"warn"},{v:"issue",l:"Hỏng",tone:"crit"}],
  kpis:d => [{lbl:"Thiết bị",val:d.length},{lbl:"Đang dùng",val:d.filter(r=>r._status==="processing").length,tone:"ok"},{lbl:"Hỏng",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"Đến hạn BT",val:d.filter(r=>(r.nextMaint-todayG)/86400000<30).length,tone:"warn"}],
  columns:[{key:"code",label:"Mã TB",code:true,width:120},{key:"name",label:"Thiết bị",width:160},{key:"serialNo",label:"S/N",mono:true,width:120},{key:"department",label:"Khoa",width:120},{key:"purchaseYear",label:"Năm",mono:true,width:70},{key:"nextMaint",label:"BT kế",render:_rDate("nextMaint"),mono:true,width:100},_cStatus],
  search:["name","serialNo","department"], searchPh:"Tìm thiết bị..."
});

window.EquipmentConfig = _mkCfg({
  title:"Quản lý thiết bị", codePrefix:"QTB", n:50,
  mkRow:i => ({ name:rndPick(["Máy thở GE","Bơm tiêm điện","Máy điều hoà","Tủ lạnh thuốc","Máy in"]),
    location:rndPick(["Khoa Nội","HSCC","Cấp cứu","Sản","Nhi"]),
    contractor:rndPick(["Cty Bảo trì A","Cty B","NSX trực tiếp"]),
    contractEnd:_isoDateM(todayG,Math.floor(Math.random()*500)),
    cost:5000000+Math.floor(Math.random()*500000000) }),
  kpis:d => [{lbl:"Thiết bị QL",val:d.length},{lbl:"Hết HĐ <60d",val:d.filter(r=>(r.contractEnd-todayG)/86400000<60).length,tone:"warn"},{lbl:"Tổng giá trị",val:"45",unit:"tỷ",tone:"focus"},{lbl:"Lỗi/tháng",val:8,tone:"crit"}],
  columns:[{key:"code",label:"Mã QTB",code:true,width:120},{key:"name",label:"Thiết bị"},{key:"location",label:"Vị trí",width:130},{key:"contractor",label:"Đơn vị BT",width:160},{key:"contractEnd",label:"Hết HĐ",render:_rDate("contractEnd"),mono:true,width:100},{key:"cost",label:"Giá trị",mono:true,width:130,render:r=>(r.cost/1e6).toFixed(0)+"M"},_cStatus],
  search:["name","location"], searchPh:"Tìm TB..."
});

window.AssetManagementConfig = _mkCfg({
  title:"Quản lý tài sản", codePrefix:"TS", n:70,
  mkRow:i => ({ name:rndPick(["Tủ thuốc","Bàn khám","Giường BN","Xe đẩy","PC văn phòng","Máy lạnh"]),
    category:rndPick(["Nội thất","Y tế","CNTT","HVAC"]),
    department:rndPick(["Khoa Nội","Khoa Ngoại","HSCC","Phòng KH","Hành chính"]),
    purchaseDate:_isoDateM(todayG,-Math.floor(Math.random()*1500)),
    value:1000000+Math.floor(Math.random()*50000000),
    deprValue:1000000+Math.floor(Math.random()*30000000) }),
  kpis:d => [{lbl:"Tài sản",val:d.length},{lbl:"Tổng nguyên giá",val:(d.reduce((s,r)=>s+r.value,0)/1e9).toFixed(1),unit:"tỷ",tone:"focus"},{lbl:"Đã KH hết",val:d.filter(r=>r.deprValue>=r.value).length,tone:"warn"},{lbl:"Cần kiểm kê",val:24,tone:"info"}],
  columns:[{key:"code",label:"Mã TS",code:true,width:120},{key:"name",label:"Tài sản"},{key:"category",label:"Loại",width:120},{key:"department",label:"Bộ phận",width:140},{key:"purchaseDate",label:"Ngày mua",render:_rDate("purchaseDate"),mono:true,width:100},{key:"value",label:"Nguyên giá",mono:true,width:130,render:r=>(r.value/1e6).toFixed(1)+"M"},_cStatus],
  search:["name","category","department"], searchPh:"Tìm tài sản..."
});

window.SterilizationCenterConfig = _mkCfg({
  title:"Trung tâm tiệt khuẩn", codePrefix:"TK", n:80,
  mkRow:i => ({ instrument:rndPick(["Bộ DC mổ chính","Bộ DC tiểu phẫu","Pince","Kéo phẫu thuật","Catheter","Bộ DC sản"]),
    method:rndPick(["Hơi nước 121°C","Hơi nước 134°C","EO","Plasma H2O2","Bức xạ"]),
    cycleNo:"C"+String(2400+i).padStart(5,"0"),
    operator:"KTV."+rndName(i+3).split(" ").pop(),
    startAt:_isoDateM(todayG,-Math.floor(Math.random()*7)),
    biologicTest:rndPick(["Đạt","Đang ủ","Chưa làm"]) }),
  kpis:d => [{lbl:"Chu trình/ngày",val:d.length},{lbl:"Đang chạy",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"Đạt biologic",val:d.filter(r=>r.biologicTest==="Đạt").length,tone:"ok"},{lbl:"Lỗi",val:d.filter(r=>r._status==="issue").length,tone:"crit"}],
  columns:[{key:"code",label:"Mã TK",code:true,width:120},{key:"instrument",label:"Dụng cụ",width:200},{key:"method",label:"Phương pháp",width:140},{key:"cycleNo",label:"Chu trình",mono:true,width:120},{key:"operator",label:"KTV",width:130},{key:"biologicTest",label:"BT sinh học",width:120,render:r=><StatusBadge tone={r.biologicTest==="Đạt"?"ok":r.biologicTest==="Đang ủ"?"info":"warn"}>{r.biologicTest}</StatusBadge>},_cStatus],
  search:["instrument","cycleNo"], searchPh:"Tìm chu trình..."
});

// Batch 12 — Records & Signing
window.MedicalRecordArchiveConfig = _mkCfg({
  title:"Lưu trữ hồ sơ BA", codePrefix:"LT", n:120,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    bandNo:"BA-"+(2024-i%5)+"-"+String(101+i*3).padStart(5,"0"),
    dischargeDate:_isoDateM(todayG,-Math.floor(Math.random()*1500)),
    location:"Phòng "+rndPick(["A","B","C"])+"-Kệ "+(1+i%30)+"-Tập "+(1+i%50),
    pages:20+Math.floor(Math.random()*200) }),
  statusTabs:[{v:"new",l:"Đang lưu",tone:"info"},{v:"processing",l:"Mượn",tone:"warn"},{v:"done",l:"Trả",tone:"ok"},{v:"issue",l:"Mất",tone:"crit"}],
  kpis:d => [{lbl:"Hồ sơ lưu",val:d.length},{lbl:"Đang mượn",val:d.filter(r=>r._status==="processing").length,tone:"warn"},{lbl:"Lưu trữ điện tử",val:"68%",tone:"focus"},{lbl:"Mất/hỏng",val:d.filter(r=>r._status==="issue").length,tone:"crit"}],
  columns:[{key:"code",label:"Mã LT",code:true,width:120},{key:"patient",label:"BN",render:_rPatient},{key:"bandNo",label:"Số BA",mono:true,width:160},{key:"location",label:"Vị trí",mono:true},{key:"pages",label:"Số trang",mono:true,width:90},{key:"dischargeDate",label:"Xuất viện",render:_rDate("dischargeDate"),mono:true,width:110},_cStatus],
  search:["patient","pid","bandNo"], searchPh:"Tìm hồ sơ..."
});

window.MedicalRecordPlanningConfig = _mkCfg({
  title:"Kế hoạch hồ sơ BA", codePrefix:"KHHS", n:48,
  mkRow:i => ({ name:rndPick(["Mẫu BA Nội","Mẫu BA Ngoại","Mẫu BA Sản","Mẫu BA Nhi","Mẫu phiếu chỉ định","Mẫu phiếu xét nghiệm"]),
    version:"v"+(1+i%3)+"."+(i%10),
    department:rndPick(["Tất cả","Nội","Ngoại","Sản","Nhi"]),
    fields:30+Math.floor(Math.random()*70),
    approvedBy:"BS."+rndName(i+5).split(" ").pop(),
    approvedAt:_isoDateM(todayG,-Math.floor(Math.random()*500)) }),
  kpis:d => [{lbl:"Mẫu",val:d.length},{lbl:"Đang dùng",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Bản nháp",val:d.filter(r=>r._status==="new").length,tone:"warn"},{lbl:"Cập nhật <30d",val:8,tone:"focus"}],
  columns:[{key:"code",label:"Mã KH",code:true,width:120},{key:"name",label:"Mẫu BA"},{key:"version",label:"v",mono:true,width:80},{key:"department",label:"Áp dụng",width:120},{key:"fields",label:"Trường",mono:true,width:80},{key:"approvedBy",label:"Phê duyệt",width:140},{key:"approvedAt",label:"Ngày",render:_rDate("approvedAt"),mono:true,width:100},_cStatus],
  search:["name"], searchPh:"Tìm mẫu BA..."
});

window.DigitalSignatureConfig = _mkCfg({
  title:"Chữ ký số", codePrefix:"CKS", n:80,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    document:rndPick(["BA xuất viện","Phiếu chỉ định CT","Đơn thuốc","Biên bản hội chẩn","Giấy chuyển viện"]),
    signer:"BS."+rndName(i+5).split(" ").pop(),
    certType:rndPick(["VNPT","Viettel","FPT","BCA"]),
    signedAt:_isoDateM(todayG,-i%30) }),
  kpis:d => [{lbl:"Tài liệu/ngày",val:d.length},{lbl:"Đang chờ ký",val:d.filter(r=>r._status==="new").length,tone:"warn"},{lbl:"Đã ký",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Lỗi xác thực",val:d.filter(r=>r._status==="issue").length,tone:"crit"}],
  columns:[{key:"code",label:"Mã CKS",code:true,width:120},{key:"patient",label:"BN",render:_rPatient},{key:"document",label:"Tài liệu"},{key:"signer",label:"Người ký",width:140},{key:"certType",label:"CA",width:80},{key:"signedAt",label:"Ký",render:_rDate("signedAt"),mono:true,width:100},_cStatus],
  search:["patient","document","signer"], searchPh:"Tìm tài liệu..."
});

window.CentralSigningConfig = _mkCfg({
  title:"Ký tập trung", codePrefix:"KTT", n:60,
  mkRow:i => ({ docType:rndPick(["BA xuất viện","Báo cáo tháng","Quyết định BS","Hợp đồng","Công văn"]),
    department:rndPick(["Khoa Nội","Khoa Ngoại","Phòng KH","Phòng TC-HC","BGĐ"]),
    submittedBy:"BS."+rndName(i+5).split(" ").pop(),
    waitingFor:rndPick(["BS Trưởng khoa","PGĐ Y khoa","GĐ BV","BS phụ trách"]),
    submittedAt:_isoDateM(todayG,-i),
    priority:rndPick(["Bình thường","Cao","Khẩn"]) }),
  kpis:d => [{lbl:"Đang chờ ký",val:d.filter(r=>r._status==="new"||r._status==="processing").length,tone:"warn"},{lbl:"Khẩn",val:d.filter(r=>r.priority==="Khẩn").length,tone:"crit"},{lbl:"Ký hôm nay",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Quá hạn",val:6,tone:"crit"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"docType",label:"Loại tài liệu",width:160},{key:"department",label:"Phòng",width:130},{key:"waitingFor",label:"Chờ ký bởi",width:140},{key:"priority",label:"Ưu tiên",width:100,render:r=><StatusBadge tone={r.priority==="Khẩn"?"crit":r.priority==="Cao"?"warn":"info"}>{r.priority}</StatusBadge>},{key:"submittedAt",label:"Gửi",render:_rDate("submittedAt"),mono:true,width:100},_cStatus],
  search:["docType","submittedBy"], searchPh:"Tìm tài liệu..."
});

window.SigningWorkflowConfig = _mkCfg({
  title:"Quy trình ký", codePrefix:"QTK", n:36,
  mkRow:i => ({ name:rndPick(["BA xuất viện","Đơn thuốc gây nghiện","Phiếu chuyển viện","Biên bản hội chẩn","HĐ vật tư"]),
    steps:2+Math.floor(Math.random()*5),
    avgTime:1+Math.floor(Math.random()*48),
    creator:"BS."+rndName(i+5).split(" ").pop(),
    createdAt:_isoDateM(todayG,-i*15) }),
  kpis:d => [{lbl:"Quy trình",val:d.length},{lbl:"Đang dùng",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Bước TB",val:Math.round(d.reduce((s,r)=>s+r.steps,0)/d.length),tone:"info"},{lbl:"Thời gian TB",val:Math.round(d.reduce((s,r)=>s+r.avgTime,0)/d.length),unit:"giờ",tone:"focus"}],
  columns:[{key:"code",label:"Mã QT",code:true,width:120},{key:"name",label:"Quy trình"},{key:"steps",label:"Bước",mono:true,width:80},{key:"avgTime",label:"TG TB (h)",mono:true,width:110},{key:"creator",label:"Tạo bởi",width:140},{key:"createdAt",label:"Ngày tạo",render:_rDate("createdAt"),mono:true,width:100},_cStatus],
  search:["name"], searchPh:"Tìm quy trình..."
});

window.DoctorPortalConfig = _mkCfg({
  title:"Cổng bác sĩ", codePrefix:"BS", n:84,
  mkRow:i => ({ name:"BS."+rndName(i),
    specialty:rndPick(["Nội","Ngoại","Sản","Nhi","TMH","Mắt","Da liễu"]),
    license:"GP-"+String(10000+i).padStart(6,"0"),
    todayPatients:Math.floor(Math.random()*40),
    pendingNotes:Math.floor(Math.random()*15),
    lastLogin:_isoDateM(todayG,-Math.floor(Math.random()*7)) }),
  kpis:d => [{lbl:"BS đăng nhập",val:d.length},{lbl:"BN hôm nay",val:d.reduce((s,r)=>s+r.todayPatients,0),tone:"info"},{lbl:"Ghi chú chờ",val:d.reduce((s,r)=>s+r.pendingNotes,0),tone:"warn"},{lbl:"BS online",val:32,tone:"ok"}],
  columns:[{key:"code",label:"Mã BS",code:true,width:120},{key:"name",label:"Tên BS",width:200},{key:"specialty",label:"CK",width:100},{key:"license",label:"GP hành nghề",mono:true,width:140},{key:"todayPatients",label:"BN h.nay",mono:true,width:100},{key:"pendingNotes",label:"GC chờ",mono:true,width:90},{key:"lastLogin",label:"Đăng nhập",render:_rDate("lastLogin"),mono:true,width:100},_cStatus],
  search:["name","specialty"], searchPh:"Tìm BS..."
});

// Batch 13 — HR & Training
window.HRConfig = _mkCfg({
  title:"Nhân sự", codePrefix:"NS", n:120,
  mkRow:i => ({ name:rndName(i),
    role:rndPick(["BS","ĐD","KTV","HC","Bảo vệ","Tài xế"]),
    department:rndPick(["Khoa Nội","Khoa Ngoại","HSCC","Sản","Nhi","Hành chính","Tài chính"]),
    contractType:rndPick(["Biên chế","HĐ dài hạn","HĐ ngắn hạn","Thử việc"]),
    joinDate:_isoDateM(todayG,-Math.floor(Math.random()*3000)),
    salary:8000000+Math.floor(Math.random()*30000000) }),
  statusTabs:[{v:"new",l:"Mới",tone:"warn"},{v:"processing",l:"Thử việc",tone:"info"},{v:"done",l:"Chính thức",tone:"ok"},{v:"issue",l:"Nghỉ việc",tone:"crit"}],
  kpis:d => [{lbl:"Nhân sự",val:d.length},{lbl:"Bác sĩ",val:d.filter(r=>r.role==="BS").length,tone:"info"},{lbl:"Điều dưỡng",val:d.filter(r=>r.role==="ĐD").length,tone:"focus"},{lbl:"Mới tuyển/tháng",val:8,tone:"warn"}],
  columns:[{key:"code",label:"Mã NV",code:true,width:120},{key:"name",label:"Họ tên",width:200},{key:"role",label:"VT",width:80},{key:"department",label:"Bộ phận",width:140},{key:"contractType",label:"HĐ",width:120},{key:"joinDate",label:"Vào làm",render:_rDate("joinDate"),mono:true,width:100},_cStatus],
  search:["name","department","role"], searchPh:"Tìm NV..."
});

window.HumanResourcesConfig = window.HRConfig;

window.TrainingConfig = _mkCfg({
  title:"Đào tạo", codePrefix:"DT", n:60,
  mkRow:i => ({ name:rndPick(["Tập huấn ICU","CME hô hấp","Tin học y tế","Kỹ năng giao tiếp","Cập nhật BHYT","An toàn truyền máu"]),
    type:rndPick(["Nội bộ","CME","Bên ngoài","E-learning"]),
    instructor:"BS."+rndName(i+5).split(" ").pop(),
    duration:1+Math.floor(Math.random()*40),
    participants:5+Math.floor(Math.random()*100),
    startDate:_isoDateM(todayG,-i*5+30) }),
  kpis:d => [{lbl:"Khoá ĐT",val:d.length},{lbl:"Tham dự/tháng",val:d.reduce((s,r)=>s+r.participants,0),tone:"info"},{lbl:"CME tích luỹ",val:1240,tone:"focus"},{lbl:"Hoàn thành",val:d.filter(r=>r._status==="done").length,tone:"ok"}],
  columns:[{key:"code",label:"Mã ĐT",code:true,width:120},{key:"name",label:"Khoá",width:200},{key:"type",label:"Loại",width:110},{key:"instructor",label:"GV",width:140},{key:"duration",label:"Số giờ",mono:true,width:80},{key:"participants",label:"Tham dự",mono:true,width:90},{key:"startDate",label:"Khai giảng",render:_rDate("startDate"),mono:true,width:110},_cStatus],
  search:["name","instructor"], searchPh:"Tìm khoá ĐT..."
});

window.TrainingResearchConfig = _mkCfg({
  title:"Đào tạo · NCKH", codePrefix:"NC", n:42,
  mkRow:i => ({ title:rndPick(["Hiệu quả phác đồ X trong điều trị Y","Đánh giá kết quả phẫu thuật","Khảo sát dịch tễ","Nghiên cứu lâm sàng pha 3","Sàng lọc gen"]),
    pi:"BS."+rndName(i+5).split(" ").pop(),
    type:rndPick(["Đề tài cơ sở","Cấp Sở","Cấp Bộ","Hợp tác QT"]),
    budget:50+Math.floor(Math.random()*500),
    startDate:_isoDateM(todayG,-Math.floor(Math.random()*900)),
    publications:Math.floor(Math.random()*5) }),
  kpis:d => [{lbl:"Đề tài",val:d.length},{lbl:"Đang thực hiện",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"Bài báo",val:d.reduce((s,r)=>s+r.publications,0),tone:"focus"},{lbl:"Tổng KP",val:(d.reduce((s,r)=>s+r.budget,0)/1000).toFixed(1),unit:"tỷ",tone:"ok"}],
  columns:[{key:"code",label:"Mã NC",code:true,width:120},{key:"title",label:"Đề tài"},{key:"pi",label:"Chủ nhiệm",width:140},{key:"type",label:"Cấp",width:120},{key:"budget",label:"KP (tr)",mono:true,width:100},{key:"publications",label:"Bài báo",mono:true,width:90},_cStatus],
  search:["title","pi"], searchPh:"Tìm đề tài..."
});

window.PerformanceEvaluationConfig = _mkCfg({
  title:"Đánh giá hiệu suất", codePrefix:"DG", n:96,
  mkRow:i => ({ name:rndName(i),
    role:rndPick(["BS","ĐD","KTV"]),
    department:rndPick(["Khoa Nội","Khoa Ngoại","HSCC","Sản","Nhi"]),
    period:"Q"+(1+i%4)+"/2026",
    score:60+Math.floor(Math.random()*40),
    rating:rndPick(["A","B","C","D"]),
    evaluator:"BS."+rndName(i+5).split(" ").pop() }),
  statusTabs:[{v:"new",l:"Chờ ĐG",tone:"warn"},{v:"processing",l:"Đang ĐG",tone:"info"},{v:"done",l:"Đã duyệt",tone:"ok"},{v:"issue",l:"Khiếu nại",tone:"crit"}],
  kpis:d => [{lbl:"Lượt ĐG/quý",val:d.length},{lbl:"Xếp loại A",val:d.filter(r=>r.rating==="A").length,tone:"ok"},{lbl:"Xếp loại D",val:d.filter(r=>r.rating==="D").length,tone:"crit"},{lbl:"Điểm TB",val:Math.round(d.reduce((s,r)=>s+r.score,0)/d.length),tone:"focus"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"name",label:"NV",width:180},{key:"role",label:"VT",width:70},{key:"department",label:"Khoa",width:130},{key:"period",label:"Kỳ",mono:true,width:90},{key:"score",label:"Điểm",mono:true,width:80},{key:"rating",label:"XL",mono:true,width:60,render:r=><StatusBadge tone={r.rating==="A"?"ok":r.rating==="B"?"info":r.rating==="C"?"warn":"crit"}>{r.rating}</StatusBadge>},_cStatus],
  search:["name","department"], searchPh:"Tìm NV..."
});

window.PracticeLicenseConfig = _mkCfg({
  title:"Giấy phép hành nghề", codePrefix:"GPHN", n:80,
  mkRow:i => ({ name:"BS."+rndName(i),
    licenseNo:"GP-"+String(10000+i).padStart(6,"0"),
    specialty:rndPick(["Nội","Ngoại","Sản","Nhi","TMH","Mắt","RHM"]),
    issueDate:_isoDateM(todayG,-Math.floor(Math.random()*2000)),
    expiryDate:_isoDateM(todayG,Math.floor(Math.random()*1500)),
    cmeHours:0+Math.floor(Math.random()*120) }),
  statusTabs:[{v:"new",l:"Mới",tone:"info"},{v:"processing",l:"Đang HN",tone:"ok"},{v:"done",l:"Đã gia hạn",tone:"ok"},{v:"issue",l:"Hết hạn",tone:"crit"}],
  kpis:d => [{lbl:"BS có GP",val:d.length},{lbl:"Sắp hết hạn",val:d.filter(r=>(r.expiryDate-todayG)/86400000<90).length,tone:"warn"},{lbl:"Hết hạn",val:d.filter(r=>r.expiryDate<todayG).length,tone:"crit"},{lbl:"Đủ CME",val:d.filter(r=>r.cmeHours>=48).length,tone:"ok"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"name",label:"Bác sĩ",width:200},{key:"licenseNo",label:"Số GP",mono:true,width:140},{key:"specialty",label:"CK",width:80},{key:"expiryDate",label:"Hết hạn",render:_rDate("expiryDate"),mono:true,width:100},{key:"cmeHours",label:"CME",mono:true,width:80,render:r=><span style={{color:r.cmeHours>=48?"var(--s-ok)":"var(--s-warn)",fontFamily:"var(--font-mono)"}}>{r.cmeHours}</span>},_cStatus],
  search:["name","licenseNo"], searchPh:"Tìm BS..."
});

// Batch 14 — Integrations & Infra
window.ApiGatewayConfig = _mkCfg({
  title:"API Gateway", codePrefix:"API", n:48,
  mkRow:i => ({ endpoint:rndPick(["/api/patients","/api/encounters","/api/lab","/api/billing","/api/insurance","/api/auth"]),
    method:rndPick(["GET","POST","PUT","DELETE"]),
    consumer:rndPick(["EMR Web","Mobile App","BHXH","Lab","HIS"]),
    callsToday:1000+Math.floor(Math.random()*50000),
    avgLatency:50+Math.floor(Math.random()*500),
    errorRate:(Math.random()*5).toFixed(2) }),
  statusTabs:[{v:"new",l:"Mới",tone:"info"},{v:"processing",l:"Hoạt động",tone:"ok"},{v:"done",l:"Ổn định",tone:"ok"},{v:"issue",l:"Lỗi",tone:"crit"}],
  kpis:d => [{lbl:"Endpoint",val:d.length},{lbl:"Calls/ngày",val:d.reduce((s,r)=>s+r.callsToday,0).toLocaleString("vi-VN"),tone:"info"},{lbl:"Lỗi",val:d.filter(r=>+r.errorRate>2).length,tone:"crit"},{lbl:"Latency TB",val:Math.round(d.reduce((s,r)=>s+r.avgLatency,0)/d.length),unit:"ms",tone:"focus"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"endpoint",label:"Endpoint",mono:true,width:200},{key:"method",label:"Method",mono:true,width:80},{key:"consumer",label:"Consumer",width:120},{key:"callsToday",label:"Calls",mono:true,width:100},{key:"avgLatency",label:"Latency",mono:true,width:90,render:r=>r.avgLatency+"ms"},{key:"errorRate",label:"Lỗi%",mono:true,width:80,render:r=><span style={{color:+r.errorRate>2?"var(--s-crit)":"var(--s-ok)",fontFamily:"var(--font-mono)"}}>{r.errorRate}%</span>},_cStatus],
  search:["endpoint","consumer"], searchPh:"Tìm API..."
});

window.HL7MonitorConfig = _mkCfg({
  title:"HL7 Monitor", codePrefix:"HL7", n:80,
  mkRow:i => ({ msgType:rndPick(["ADT^A01","ADT^A03","ORM^O01","ORU^R01","DFT^P03","SIU^S12"]),
    sender:rndPick(["LIS","RIS","EMR","Pharmacy","Billing"]),
    receiver:rndPick(["EMR","HIS Core","BHXH","DataLake"]),
    sentAt:new Date(todayG-i*60000),
    size:1+Math.floor(Math.random()*50) }),
  statusTabs:[{v:"new",l:"Đang gửi",tone:"info"},{v:"processing",l:"Xử lý",tone:"warn"},{v:"done",l:"Thành công",tone:"ok"},{v:"issue",l:"Thất bại",tone:"crit"}],
  kpis:d => [{lbl:"Tin nhắn/ngày",val:d.length+"K"},{lbl:"Thành công",val:Math.round(d.filter(r=>r._status==="done").length/d.length*100)+"%",tone:"ok"},{lbl:"Thất bại",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"Throughput",val:"1.2K",unit:"/phút",tone:"focus"}],
  columns:[{key:"code",label:"Mã msg",code:true,width:130},{key:"msgType",label:"Loại",mono:true,width:110},{key:"sender",label:"Từ",width:100},{key:"receiver",label:"Đến",width:120},{key:"size",label:"KB",mono:true,width:80},{key:"sentAt",label:"Gửi",render:r=>fmtHMg(r.sentAt),mono:true,width:90},_cStatus],
  search:["msgType","sender"], searchPh:"Tìm HL7..."
});

window.IntegrationStatusConfig = _mkCfg({
  title:"Trạng thái tích hợp", codePrefix:"INT", n:36,
  mkRow:i => ({ system:rndPick(["BHXH Core","DCS DataLake","Lab Cobas","RIS Carestream","ePrescription","TeleHealth","Bệnh án ĐT BYT"]),
    type:rndPick(["REST API","HL7","SFTP","Database","File"]),
    lastSync:_isoDateM(todayG,-Math.floor(Math.random()*7)),
    uptime:(95+Math.random()*5).toFixed(2) }),
  statusTabs:[{v:"new",l:"Khởi tạo",tone:"warn"},{v:"processing",l:"Đang đồng bộ",tone:"info"},{v:"done",l:"Online",tone:"ok"},{v:"issue",l:"Offline",tone:"crit"}],
  kpis:d => [{lbl:"Hệ thống TH",val:d.length},{lbl:"Online",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Offline",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"Uptime TB",val:(d.reduce((s,r)=>s+ +r.uptime,0)/d.length).toFixed(2)+"%",tone:"focus"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"system",label:"Hệ thống",width:200},{key:"type",label:"Loại",width:110},{key:"uptime",label:"Uptime",mono:true,width:90,render:r=>r.uptime+"%"},{key:"lastSync",label:"Sync cuối",render:_rDate("lastSync"),mono:true,width:110},_cStatus],
  search:["system"], searchPh:"Tìm hệ thống..."
});

window.InterHospitalSharingConfig = _mkCfg({
  title:"Chia sẻ liên BV", codePrefix:"LBV", n:72,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    fromHospital:rndPick(["BV ĐK Hưng Yên","BV Bạch Mai","BV Việt Đức","BV Chợ Rẫy"]),
    toHospital:rndPick(["BV ĐK Hưng Yên","BV Bạch Mai","BV Việt Đức","BV K"]),
    docType:rndPick(["Hồ sơ BA","Phim CT","Kết quả XN","Tóm tắt BA"]),
    sentAt:_isoDateM(todayG,-i) }),
  kpis:d => [{lbl:"Lượt CS",val:d.length},{lbl:"Đến BV",val:d.filter(r=>r.toHospital==="BV ĐK Hưng Yên").length,tone:"info"},{lbl:"Gửi đi",val:d.filter(r=>r.fromHospital==="BV ĐK Hưng Yên").length,tone:"focus"},{lbl:"Sự cố",val:d.filter(r=>r._status==="issue").length,tone:"crit"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"patient",label:"BN",render:_rPatient},{key:"docType",label:"Tài liệu",width:130},{key:"fromHospital",label:"Từ BV",width:160},{key:"toHospital",label:"Đến BV",width:160},{key:"sentAt",label:"Gửi",render:_rDate("sentAt"),mono:true,width:100},_cStatus],
  search:["patient","fromHospital","toHospital"], searchPh:"Tìm chia sẻ..."
});

window.HealthExchangeConfig = _mkCfg({
  title:"Trao đổi y tế HIE", codePrefix:"HIE", n:60,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    docType:rndPick(["CCD","CDA","FHIR Bundle","DICOM","Lab Result"]),
    direction:rndPick(["Inbound","Outbound"]),
    partner:rndPick(["BV TW","BHXH","Sở Y tế","Phòng khám","Trạm Y tế"]),
    exchangedAt:_isoDateM(todayG,-i) }),
  kpis:d => [{lbl:"Trao đổi/tháng",val:d.length},{lbl:"FHIR",val:d.filter(r=>r.docType==="FHIR Bundle").length,tone:"info"},{lbl:"DICOM",val:d.filter(r=>r.docType==="DICOM").length,tone:"focus"},{lbl:"Lỗi",val:d.filter(r=>r._status==="issue").length,tone:"crit"}],
  columns:[{key:"code",label:"Mã HIE",code:true,width:120},{key:"patient",label:"BN",render:_rPatient},{key:"docType",label:"Loại",width:120,render:r=><code style={{fontFamily:"var(--font-mono)",fontSize:11,padding:"2px 6px",background:"var(--surf-3)",borderRadius:3}}>{r.docType}</code>},{key:"direction",label:"Chiều",width:90},{key:"partner",label:"Đối tác",width:140},{key:"exchangedAt",label:"Ngày",render:_rDate("exchangedAt"),mono:true,width:100},_cStatus],
  search:["patient","partner"], searchPh:"Tìm HIE..."
});

window.EndpointSecurityConfig = _mkCfg({
  title:"Bảo mật Endpoint", codePrefix:"SEC", n:80,
  mkRow:i => ({ device:"PC-"+String(1000+i).padStart(4,"0"),
    user:rndName(i),
    department:rndPick(["Khoa Nội","HSCC","Phòng KH","Hành chính"]),
    osVer:rndPick(["Win 10 22H2","Win 11 23H2","Ubuntu 22.04","macOS 14"]),
    avStatus:rndPick(["Active","Outdated","Disabled"]),
    lastScan:_isoDateM(todayG,-Math.floor(Math.random()*30)) }),
  statusTabs:[{v:"new",l:"Mới",tone:"info"},{v:"processing",l:"Bình thường",tone:"ok"},{v:"done",l:"Tốt",tone:"ok"},{v:"issue",l:"Cảnh báo",tone:"crit"}],
  kpis:d => [{lbl:"Thiết bị",val:d.length},{lbl:"Cảnh báo",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"AV outdated",val:d.filter(r=>r.avStatus==="Outdated").length,tone:"warn"},{lbl:"AV disabled",val:d.filter(r=>r.avStatus==="Disabled").length,tone:"crit"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"device",label:"Thiết bị",mono:true,width:120},{key:"user",label:"Người dùng",width:160},{key:"department",label:"Bộ phận",width:130},{key:"osVer",label:"OS",mono:true,width:130},{key:"avStatus",label:"AV",width:100,render:r=><StatusBadge tone={r.avStatus==="Active"?"ok":r.avStatus==="Outdated"?"warn":"crit"}>{r.avStatus}</StatusBadge>},_cStatus],
  search:["device","user"], searchPh:"Tìm thiết bị..."
});

window.BhxhAuditConfig = _mkCfg({
  title:"Giám định BHXH", codePrefix:"GĐ", n:96,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    bhytNo:"DN"+String(2024)+rndPid().split("-")[1],
    claimAmount:50000+Math.floor(Math.random()*5000000),
    auditedAmount:50000+Math.floor(Math.random()*5000000),
    auditDate:_isoDateM(todayG,-i%30),
    auditor:"GĐ."+rndName(i+5).split(" ").pop(),
    issue:rndPick(["Đạt","Sai mã ICD","Thiếu chứng từ","Khám nhiều lần","Đạt"]) }),
  kpis:d => [{lbl:"Hồ sơ GĐ/tháng",val:d.length},{lbl:"Đạt",val:d.filter(r=>r.issue==="Đạt").length,tone:"ok"},{lbl:"Vi phạm",val:d.filter(r=>r.issue!=="Đạt").length,tone:"crit"},{lbl:"Số tiền GĐ",val:(d.reduce((s,r)=>s+r.claimAmount,0)/1e9).toFixed(1),unit:"tỷ",tone:"focus"}],
  columns:[{key:"code",label:"Mã GĐ",code:true,width:130},{key:"patient",label:"BN",render:_rPatient},{key:"bhytNo",label:"Số thẻ",mono:true,width:160},{key:"claimAmount",label:"Đề nghị",mono:true,width:110,render:r=>(r.claimAmount/1000).toFixed(0)+"K"},{key:"auditedAmount",label:"Duyệt",mono:true,width:110,render:r=>(r.auditedAmount/1000).toFixed(0)+"K"},{key:"issue",label:"Kết luận",width:140,render:r=><StatusBadge tone={r.issue==="Đạt"?"ok":"crit"}>{r.issue}</StatusBadge>},{key:"auditor",label:"GĐ",width:130},_cStatus],
  search:["patient","pid","bhytNo"], searchPh:"Tìm hồ sơ GĐ..."
});

window.SmsManagementConfig = _mkCfg({
  title:"Quản lý SMS", codePrefix:"SMS", n:80,
  mkRow:i => ({ recipient:rndName(i),
    phone:rndPhone(),
    template:rndPick(["Nhắc lịch khám","KQ XN sẵn sàng","Xác nhận đặt lịch","Cảnh báo sức khoẻ","Khảo sát"]),
    sentAt:_isoDateM(todayG,-i%5),
    cost:300 }),
  statusTabs:[{v:"new",l:"Đang gửi",tone:"info"},{v:"processing",l:"Đã gửi",tone:"ok"},{v:"done",l:"Đã đọc",tone:"ok"},{v:"issue",l:"Lỗi",tone:"crit"}],
  kpis:d => [{lbl:"SMS/ngày",val:d.length},{lbl:"Đã gửi",val:d.filter(r=>r._status==="done"||r._status==="processing").length,tone:"ok"},{lbl:"Lỗi",val:d.filter(r=>r._status==="issue").length,tone:"crit"},{lbl:"Chi phí",val:(d.reduce((s,r)=>s+r.cost,0)/1e6).toFixed(1),unit:"M ₫",tone:"focus"}],
  columns:[{key:"code",label:"Mã SMS",code:true,width:130},{key:"recipient",label:"Người nhận",width:180},{key:"phone",label:"SĐT",mono:true,width:130},{key:"template",label:"Mẫu",width:170},{key:"cost",label:"Chi phí",mono:true,width:90,render:r=>r.cost+"đ"},{key:"sentAt",label:"Gửi",render:_rDate("sentAt"),mono:true,width:100},_cStatus],
  search:["recipient","phone"], searchPh:"Tìm SMS..."
});

// Batch 15 — Finance/dashboards/misc
window.FinanceConfig = _mkCfg({
  title:"Tài chính BV", codePrefix:"TC", n:60,
  mkRow:i => ({ category:rndPick(["Doanh thu KCB","Doanh thu BHYT","Chi phí thuốc","Lương","Vật tư","Đầu tư TSCĐ"]),
    period:rndPick(["T9/2026","T10/2026","T11/2026","Q3/2026"]),
    amount:1000000+Math.floor(Math.random()*5000000000),
    note:rndPick(["Đã quyết toán","Chờ duyệt","Đã chi","Phát sinh"]) }),
  kpis:d => [{lbl:"Doanh thu",val:"248",unit:"tỷ",tone:"ok"},{lbl:"Chi phí",val:"212",unit:"tỷ",tone:"warn"},{lbl:"Lợi nhuận",val:"36",unit:"tỷ",tone:"focus"},{lbl:"BHYT trả",val:"68%",tone:"info"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"category",label:"Hạng mục"},{key:"period",label:"Kỳ",mono:true,width:110},{key:"amount",label:"Số tiền",mono:true,width:140,render:r=>(r.amount/1e6).toFixed(1)+"M"},{key:"note",label:"Ghi chú",width:140},_cStatus],
  search:["category"], searchPh:"Tìm hạng mục..."
});

window.DashboardConfigDup = _mkCfg({
  title:"Dashboard tổng hợp", codePrefix:"DB", n:24,
  mkRow:i => ({ widget:rndPick(["KPI ngày","Lưu lượng BN","Doanh thu","Cảnh báo lâm sàng","Tồn kho","Hồ sơ BA chờ ký"]),
    type:rndPick(["Card","Chart","Table","Map"]),
    refresh:rndPick(["1 phút","5 phút","1 giờ","Real-time"]),
    owner:rndPick(["BGĐ","Quản lý","BS Trưởng khoa","Hành chính"]) }),
  kpis:d => [{lbl:"Widget",val:d.length},{lbl:"Real-time",val:d.filter(r=>r.refresh==="Real-time").length,tone:"info"},{lbl:"Đang dùng",val:d.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Người dùng",val:84,tone:"focus"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"widget",label:"Widget"},{key:"type",label:"Loại",width:100},{key:"refresh",label:"Refresh",mono:true,width:120},{key:"owner",label:"Chủ sở hữu",width:140},_cStatus],
  search:["widget"], searchPh:"Tìm widget..."
});
window.Dashboard3CapConfig = window.DashboardConfigDup;

window.DicomViewerConfig = _mkCfg({
  title:"DICOM Viewer", codePrefix:"DCM", n:60,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    studyType:rndPick(["CT","MRI","X-quang","Siêu âm","Mammography"]),
    bodyPart:rndPick(["Đầu","Ngực","Bụng","Khớp","Cột sống"]),
    images:50+Math.floor(Math.random()*500),
    studyDate:_isoDateM(todayG,-i%30),
    radiologist:"BS."+rndName(i+5).split(" ").pop() }),
  kpis:d => [{lbl:"Study/ngày",val:d.length},{lbl:"Đang đọc",val:d.filter(r=>r._status==="processing").length,tone:"info"},{lbl:"Tổng ảnh",val:d.reduce((s,r)=>s+r.images,0).toLocaleString("vi-VN"),tone:"focus"},{lbl:"Hoàn tất",val:d.filter(r=>r._status==="done").length,tone:"ok"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"patient",label:"BN",render:_rPatient},{key:"studyType",label:"Loại",width:100},{key:"bodyPart",label:"Vị trí",width:100},{key:"images",label:"Ảnh",mono:true,width:80},{key:"radiologist",label:"BS đọc",width:140},{key:"studyDate",label:"Ngày",render:_rDate("studyDate"),mono:true,width:100},_cStatus],
  search:["patient","pid"], searchPh:"Tìm study..."
});

window.QueueDisplayConfig = _mkCfg({
  title:"Hiển thị hàng đợi", codePrefix:"HD", n:24,
  mkRow:i => ({ location:rndPick(["Sảnh chính","Khoa Khám","CĐHA","Lab","Thu ngân"]),
    screenSize:rndPick(["32''","43''","55''","65''"]),
    waiting:Math.floor(Math.random()*40),
    avgWait:5+Math.floor(Math.random()*30),
    serviceCount:1+Math.floor(Math.random()*8) }),
  kpis:d => [{lbl:"Màn hình",val:d.length},{lbl:"Đang chờ",val:d.reduce((s,r)=>s+r.waiting,0),tone:"warn"},{lbl:"Thời gian chờ TB",val:Math.round(d.reduce((s,r)=>s+r.avgWait,0)/d.length),unit:"phút",tone:"focus"},{lbl:"Hoạt động",val:d.filter(r=>r._status==="done").length,tone:"ok"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"location",label:"Vị trí",width:160},{key:"screenSize",label:"KT",mono:true,width:80},{key:"waiting",label:"Chờ",mono:true,width:80},{key:"avgWait",label:"TG TB",mono:true,width:90,render:r=>r.avgWait+"p"},{key:"serviceCount",label:"DV",mono:true,width:70},_cStatus],
  search:["location"], searchPh:"Tìm màn hình..."
});

window.EmergencyDisasterConfig = _mkCfg({
  title:"Ứng phó thảm hoạ", codePrefix:"TH", n:24,
  mkRow:i => ({ event:rndPick(["Diễn tập cháy nổ","Sẵn sàng đón nhiều BN","Bão lụt","TNGT lớn","Dịch bệnh"]),
    level:rndPick(["Cấp 1","Cấp 2","Cấp 3","Cấp 4"]),
    leader:"BS."+rndName(i+5).split(" ").pop(),
    activatedAt:_isoDateM(todayG,-i*30),
    duration:1+Math.floor(Math.random()*48),
    affected:Math.floor(Math.random()*200) }),
  statusTabs:[{v:"new",l:"Kích hoạt",tone:"crit"},{v:"processing",l:"Đang ƯP",tone:"warn"},{v:"done",l:"Kết thúc",tone:"ok"},{v:"issue",l:"Báo cáo",tone:"info"}],
  kpis:d => [{lbl:"Sự kiện",val:d.length},{lbl:"Đang ƯP",val:d.filter(r=>r._status==="processing").length,tone:"warn"},{lbl:"Diễn tập/năm",val:d.filter(r=>r.event==="Diễn tập cháy nổ").length,tone:"focus"},{lbl:"Người bị ảnh hưởng",val:d.reduce((s,r)=>s+r.affected,0),tone:"crit"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"event",label:"Sự kiện",width:200},{key:"level",label:"Cấp",mono:true,width:80,render:r=><StatusBadge tone={r.level==="Cấp 4"?"crit":r.level==="Cấp 3"?"warn":"info"}>{r.level}</StatusBadge>},{key:"leader",label:"Chỉ huy",width:140},{key:"affected",label:"Bị AH",mono:true,width:80},{key:"activatedAt",label:"Kích hoạt",render:_rDate("activatedAt"),mono:true,width:110},_cStatus],
  search:["event","leader"], searchPh:"Tìm sự kiện..."
});

window.NationalHealthProgramConfig = _mkCfg({
  title:"Chương trình QG", codePrefix:"CTQG", n:36,
  mkRow:i => ({ name:rndPick(["TCMR Quốc gia","Phòng chống Lao","Phòng chống HIV","Sức khoẻ tâm thần","Dinh dưỡng QG","Dân số"]),
    targetUnit:"BN",
    target:1000+Math.floor(Math.random()*10000),
    achieved:500+Math.floor(Math.random()*9000),
    coordinator:"BS."+rndName(i+5).split(" ").pop(),
    period:"2026" }),
  kpis:d => [{lbl:"Chương trình",val:d.length},{lbl:"Tỷ lệ đạt",val:Math.round(d.reduce((s,r)=>s+r.achieved/r.target,0)/d.length*100)+"%",tone:"ok"},{lbl:"Mục tiêu năm",val:d.reduce((s,r)=>s+r.target,0).toLocaleString("vi-VN"),tone:"focus"},{lbl:"Đã đạt",val:d.reduce((s,r)=>s+r.achieved,0).toLocaleString("vi-VN"),tone:"info"}],
  columns:[{key:"code",label:"Mã CT",code:true,width:130},{key:"name",label:"Chương trình"},{key:"target",label:"Mục tiêu",mono:true,width:100},{key:"achieved",label:"Đạt",mono:true,width:100},{key:"coordinator",label:"Phụ trách",width:140},_cStatus],
  search:["name"], searchPh:"Tìm CTQG..."
});

window.ComplaintsConfig = _mkCfg({
  title:"Khiếu nại · Phản ánh", codePrefix:"KN", n:48,
  mkRow:i => ({ complainant:rndName(i), phone:rndPhone(),
    subject:rndPick(["Thái độ NV","Chờ lâu","Chất lượng KCB","Phí","Vệ sinh","Khác"]),
    department:rndPick(["Khoa Khám","Cấp cứu","Khoa Nội","Thu ngân","Bảo vệ"]),
    severity:rndPick(["Nhẹ","Vừa","Nghiêm trọng"]),
    submittedAt:_isoDateM(todayG,-i*2) }),
  statusTabs:[{v:"new",l:"Mới",tone:"warn"},{v:"processing",l:"Đang xử lý",tone:"info"},{v:"done",l:"Đã giải quyết",tone:"ok"},{v:"issue",l:"Khiếu nại lại",tone:"crit"}],
  kpis:d => [{lbl:"KN/tháng",val:d.length},{lbl:"Mới",val:d.filter(r=>r._status==="new").length,tone:"warn"},{lbl:"Nghiêm trọng",val:d.filter(r=>r.severity==="Nghiêm trọng").length,tone:"crit"},{lbl:"Đã giải quyết",val:d.filter(r=>r._status==="done").length,tone:"ok"}],
  columns:[{key:"code",label:"Mã KN",code:true,width:120},{key:"complainant",label:"Người KN",render:r=><><b>{r.complainant}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.phone}</div></>},{key:"subject",label:"Nội dung",width:140},{key:"department",label:"Khoa/Phòng",width:140},{key:"severity",label:"Mức",width:100,render:r=><StatusBadge tone={r.severity==="Nghiêm trọng"?"crit":r.severity==="Vừa"?"warn":"info"}>{r.severity}</StatusBadge>},{key:"submittedAt",label:"Ngày",render:_rDate("submittedAt"),mono:true,width:100},_cStatus],
  search:["complainant","subject"], searchPh:"Tìm KN..."
});

window.PatientSatisfactionConfig = _mkCfg({
  title:"Hài lòng BN", codePrefix:"HL", n:96,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    score:1+Math.floor(Math.random()*5),
    department:rndPick(["Khoa Khám","Cấp cứu","Khoa Nội","Khoa Ngoại","Sản"]),
    feedback:rndPick(["Rất hài lòng","Tốt","Bình thường","Cần cải thiện"]),
    submittedAt:_isoDateM(todayG,-i%30) }),
  kpis:d => [{lbl:"Phản hồi/tháng",val:d.length},{lbl:"Điểm TB",val:(d.reduce((s,r)=>s+r.score,0)/d.length).toFixed(1),unit:"/5",tone:"focus"},{lbl:"5★",val:d.filter(r=>r.score===5).length,tone:"ok"},{lbl:"Cần cải thiện",val:d.filter(r=>r.score<=2).length,tone:"crit"}],
  columns:[{key:"code",label:"Mã",code:true,width:120},{key:"patient",label:"BN",render:_rPatient},{key:"department",label:"Khoa",width:130},{key:"score",label:"Điểm",mono:true,width:80,render:r=><span style={{color:r.score>=4?"var(--s-ok)":r.score===3?"var(--s-warn)":"var(--s-crit)",fontFamily:"var(--font-mono)"}}>{r.score}★</span>},{key:"feedback",label:"Đánh giá",width:160},{key:"submittedAt",label:"Ngày",render:_rDate("submittedAt"),mono:true,width:100},_cStatus],
  search:["patient","pid"], searchPh:"Tìm phản hồi..."
});
window.PatientSurveyConfig = _mkCfg({
  title:"Khảo sát BN", codePrefix:"KS", n:80,
  mkRow:i => ({ pid:rndPid(), patient:rndName(i),
    survey:rndPick(["KS sau xuất viện","KS sau khám","KS dịch vụ thu ngân","KS chất lượng KCB"]),
    completion:50+Math.floor(Math.random()*51),
    score:60+Math.floor(Math.random()*40),
    sentAt:_isoDateM(todayG,-i*2) }),
  kpis:d => [{lbl:"Phiếu/tháng",val:d.length},{lbl:"Hoàn thành",val:d.filter(r=>r.completion===100).length,tone:"ok"},{lbl:"Tỷ lệ trả lời",val:Math.round(d.reduce((s,r)=>s+r.completion,0)/d.length)+"%",tone:"focus"},{lbl:"Điểm TB",val:Math.round(d.reduce((s,r)=>s+r.score,0)/d.length),tone:"info"}],
  columns:[{key:"code",label:"Mã KS",code:true,width:120},{key:"patient",label:"BN",render:_rPatient},{key:"survey",label:"Khảo sát"},{key:"completion",label:"HT%",mono:true,width:80,render:r=>r.completion+"%"},{key:"score",label:"Điểm",mono:true,width:80},{key:"sentAt",label:"Gửi",render:_rDate("sentAt"),mono:true,width:100},_cStatus],
  search:["patient","pid"], searchPh:"Tìm khảo sát..."
});
