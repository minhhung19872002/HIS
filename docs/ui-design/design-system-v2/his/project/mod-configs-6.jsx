// =====================================================================
// HIS · Module configs 6 — records / signing / management
// =====================================================================
const _g6 = (n, fn) => Array.from({length:n}, (_, i) => fn(i));

// DIGITAL SIGNATURE
window.DigitalSignatureConfig = (() => {
  const data = _g6(120, i => {
    const s = ["pending","signed","rejected","expired"][i%4];
    return { code:"SIG-"+String(2401+i).padStart(5,"0"),
      docType:rndPick(["BA điện tử","Đơn thuốc","KQ XN","Phiếu CLS","Giấy ra viện","BB hội chẩn"]),
      docCode:"DOC-"+String(101+i).padStart(5,"0"),
      patient:rndName(i), signer:"BS."+rndName(i+5).split(" ").pop(),
      certNo:"CERT-"+String(1001+i%100),
      requestAt:_isoDate(todayG,-i%14),
      _status:s, statusLbl:{pending:"Chờ ký",signed:"Đã ký",rejected:"Từ chối",expired:"Hết hạn"}[s], statusTone:{pending:"warn",signed:"ok",rejected:"crit",expired:"muted"}[s] };
  });
  return { title:"Chữ ký số",
    kpis:[{lbl:"Văn bản chờ ký",val:data.filter(r=>r._status==="pending").length,tone:"warn"},{lbl:"Đã ký hôm nay",val:data.filter(r=>r._status==="signed").length,tone:"ok"},{lbl:"Hết hạn",val:data.filter(r=>r._status==="expired").length,tone:"muted"},{lbl:"CKS hợp lệ",val:48,sub:"BS"}],
    statusTabs:[{v:"pending",l:"Chờ ký",tone:"warn"},{v:"signed",l:"Đã ký",tone:"ok"},{v:"rejected",l:"Từ chối",tone:"crit"},{v:"expired",l:"Hết hạn",tone:"muted"}],
    columns:[{key:"code",label:"Mã SIG",code:true,width:130},{key:"docType",label:"Loại VB",width:130},{key:"docCode",label:"Mã VB",mono:true,width:130},{key:"patient",label:"BN",width:160},{key:"signer",label:"Người ký",width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","docCode","signer"], searchPlaceholder:"Tìm văn bản...",
    actions:[{ic:"sign",title:"Ký",tone:"crit",onClick:r=>cf("Ký "+r.docCode+"?",()=>tk("Đã ký"))}],
    primaryAction:{label:"Tạo VB ký",ic:"plus",onClick:()=>ti("Form VB cần ký")} };
})();

// CENTRAL SIGNING
window.CentralSigningConfig = (() => {
  const data = _g6(40, i => {
    const s = ["queued","signing","done","error"][i%4];
    return { batch:"BATCH-"+String(2401+i).padStart(4,"0"),
      type:rndPick(["BA xuất viện","Phiếu CLS hàng loạt","Đơn thuốc tự động","BC tháng"]),
      docCount:10+Math.floor(Math.random()*200),
      signed:i%3?Math.floor(Math.random()*100):0,
      signer:"Hệ thống tự động",
      startedAt:_isoDate(todayG,-i%7),
      _status:s, statusLbl:{queued:"Chờ xử lý",signing:"Đang ký",done:"Hoàn tất",error:"Lỗi"}[s], statusTone:{queued:"warn",signing:"info",done:"ok",error:"crit"}[s] };
  });
  return { title:"Ký số tập trung",
    kpis:[{lbl:"Lô đang chạy",val:data.filter(r=>r._status==="signing").length,tone:"info"},{lbl:"Hoàn tất tuần",val:data.filter(r=>r._status==="done").length,tone:"ok"},{lbl:"Văn bản/ngày",val:"3,420",tone:"focus"},{lbl:"Lỗi",val:data.filter(r=>r._status==="error").length,tone:"crit"}],
    statusTabs:[{v:"queued",l:"Chờ",tone:"warn"},{v:"signing",l:"Đang ký",tone:"info"},{v:"done",l:"Xong",tone:"ok"},{v:"error",l:"Lỗi",tone:"crit"}],
    columns:[{key:"batch",label:"Mã lô",code:true,width:140},{key:"type",label:"Loại",width:200},{key:"docCount",label:"Tổng VB",mono:true,width:100},{key:"signed",label:"Đã ký",mono:true,width:100},{key:"startedAt",label:"Bắt đầu",render:r=>fmtDMYg(r.startedAt),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.batch, searchKeys:["type","batch"], searchPlaceholder:"Tìm lô ký...",
    actions:[{ic:"play",title:"Tiếp tục",onClick:r=>tk("Resumed")},{ic:"x",title:"Hủy",tone:"crit",onClick:r=>cf("Hủy lô?",()=>tk("Đã hủy"))}],
    primaryAction:{label:"Tạo lô ký",ic:"plus",onClick:()=>ti("Form lô ký")} };
})();

// SIGNING WORKFLOW
window.SigningWorkflowConfig = (() => {
  const data = _g6(36, i => {
    const s = ["draft","active","paused","retired"][i%4];
    return { code:"WF-"+String(101+i).padStart(4,"0"),
      name:rndPick(["Quy trình ký BA xuất viện","Ký KQ xét nghiệm","Ký phiếu CLS","Ký đơn thuốc","Ký BB hội chẩn","Ký giấy chuyển viện"]),
      steps:2+Math.floor(Math.random()*5), approvers:1+Math.floor(Math.random()*3),
      docsCount:50+Math.floor(Math.random()*500),
      updated:_isoDate(todayG,-i*5),
      _status:s, statusLbl:{draft:"Nháp",active:"Đang dùng",paused:"Tạm dừng",retired:"Ngưng dùng"}[s], statusTone:{draft:"warn",active:"ok",paused:"info",retired:"muted"}[s] };
  });
  return { title:"Quy trình ký",
    kpis:[{lbl:"QT hoạt động",val:data.filter(r=>r._status==="active").length,tone:"ok"},{lbl:"Tạm dừng",val:data.filter(r=>r._status==="paused").length,tone:"info"},{lbl:"VB qua QT/tháng",val:"12,840",tone:"focus"},{lbl:"Cập nhật tháng",val:7,tone:"warn"}],
    statusTabs:[{v:"draft",l:"Nháp",tone:"warn"},{v:"active",l:"Hoạt động",tone:"ok"},{v:"paused",l:"Tạm dừng",tone:"info"},{v:"retired",l:"Ngưng",tone:"muted"}],
    columns:[{key:"code",label:"Mã QT",code:true,width:120},{key:"name",label:"Tên quy trình"},{key:"steps",label:"Bước",mono:true,width:80},{key:"approvers",label:"Người duyệt",mono:true,width:120},{key:"docsCount",label:"VB qua",mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["name","code"], searchPlaceholder:"Tìm quy trình...",
    actions:[{ic:"file",title:"Sửa",onClick:r=>ti("Mở "+r.name)}],
    primaryAction:{label:"Tạo QT mới",ic:"plus",onClick:()=>ti("Form quy trình ký")} };
})();

// HR
window.HRConfig = (() => {
  const data = _g6(120, i => {
    const dept = rndPick(["Nội","Ngoại","Sản","Nhi","Cấp cứu","HSCC","Mắt","RHM","TMH","HC-NS","Tài chính","Dược"]);
    const s = ["active","leave","retired","terminated"][i%4 === 3 && i%9 ? 1 : 0];
    return { code:"NS-"+String(2401+i).padStart(5,"0"),
      name:rndName(i), dob:_isoDate(todayG,-(25+Math.floor(Math.random()*30))*365),
      gender: rndGender(),
      role:rndPick(["Bác sĩ","Điều dưỡng","KTV","Dược sĩ","HS","NV"]),
      dept, position:rndPick(["Trưởng khoa","Phó khoa","Bác sĩ","Điều dưỡng trưởng","Nhân viên"]),
      hireDate:_isoDate(todayG,-(1+Math.floor(Math.random()*15))*365),
      salary:8000000+Math.floor(Math.random()*30000000),
      _status:s, statusLbl:{active:"Đang làm",leave:"Nghỉ phép",retired:"Nghỉ hưu",terminated:"Thôi việc"}[s], statusTone:{active:"ok",leave:"info",retired:"muted",terminated:"crit"}[s] };
  });
  return { title:"Nhân sự",
    kpis:[{lbl:"Tổng NV",val:data.length},{lbl:"Đang làm việc",val:data.filter(r=>r._status==="active").length,tone:"ok"},{lbl:"Nghỉ phép",val:data.filter(r=>r._status==="leave").length,tone:"info"},{lbl:"Tuyển mới (năm)",val:18,tone:"focus"}],
    statusTabs:[{v:"active",l:"Đang làm",tone:"ok"},{v:"leave",l:"Nghỉ phép",tone:"info"},{v:"retired",l:"Hưu",tone:"muted"},{v:"terminated",l:"Thôi việc",tone:"crit"}],
    columns:[{key:"code",label:"Mã NS",code:true,width:120},{key:"name",label:"Họ tên",render:r=><><b>{r.name}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.gender} · {r.role}</div></>},{key:"dept",label:"Khoa/Phòng",width:130},{key:"position",label:"Chức vụ",width:160},{key:"hireDate",label:"Vào làm",render:r=>fmtDMYg(r.hireDate),mono:true,width:100},{key:"salary",label:"Lương",render:r=>fmtVNDg(r.salary),mono:true,width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["name","code","dept"], searchPlaceholder:"Tìm nhân sự...",
    filters:[{key:"role",label:"Chức danh",options:["Bác sĩ","Điều dưỡng","KTV","Dược sĩ","HS","NV"].map(v=>({v,l:v}))}],
    actions:[{ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở HS "+r.name)}],
    primaryAction:{label:"Thêm NS",ic:"plus",onClick:()=>ti("Form nhân sự")} };
})();

// EQUIPMENT
window.EquipmentConfig = (() => {
  const data = _g6(78, i => {
    const s = ["operating","maintenance","broken","retired"][i%4];
    return { code:"TBYT-"+String(101+i).padStart(5,"0"),
      name:rndPick(["Máy CT","Máy MRI","Máy thở","Monitor","Máy X-quang","Siêu âm","Máy điện tim","Bơm tiêm điện","Đèn mổ","Bàn mổ","Tủ sấy","Lò hấp"])+" "+rndPick(["GE","Philips","Siemens","Mindray","Drager"]),
      department:rndPick(["CĐHA","HSCC","Phẫu thuật","Cấp cứu","Khoa Nội"]),
      brand:rndPick(["GE","Philips","Siemens","Mindray","Drager"]),
      serial:"SN-"+String(100000+Math.floor(Math.random()*899999)),
      purchaseDate:_isoDate(todayG,-(1+Math.floor(Math.random()*15))*365),
      value: 100000000+Math.floor(Math.random()*5000000000),
      lastMaint:_isoDate(todayG,-Math.floor(Math.random()*180)),
      _status:s, statusLbl:{operating:"Hoạt động",maintenance:"Bảo trì",broken:"Hỏng",retired:"Thanh lý"}[s], statusTone:{operating:"ok",maintenance:"warn",broken:"crit",retired:"muted"}[s] };
  });
  return { title:"Thiết bị y tế",
    kpis:[{lbl:"Tổng thiết bị",val:data.length},{lbl:"Hoạt động",val:data.filter(r=>r._status==="operating").length,tone:"ok"},{lbl:"Đang bảo trì",val:data.filter(r=>r._status==="maintenance").length,tone:"warn"},{lbl:"Hỏng",val:data.filter(r=>r._status==="broken").length,tone:"crit"}],
    statusTabs:[{v:"operating",l:"Hoạt động",tone:"ok"},{v:"maintenance",l:"Bảo trì",tone:"warn"},{v:"broken",l:"Hỏng",tone:"crit"},{v:"retired",l:"Thanh lý",tone:"muted"}],
    columns:[{key:"code",label:"Mã TB",code:true,width:130},{key:"name",label:"Tên thiết bị"},{key:"department",label:"Khoa",width:120},{key:"brand",label:"Hãng",width:100},{key:"value",label:"Giá trị",render:r=>fmtVNDg(r.value),mono:true,width:160},{key:"lastMaint",label:"BT gần nhất",render:r=>fmtDMYg(r.lastMaint),mono:true,width:120},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["name","code","brand","serial"], searchPlaceholder:"Tìm thiết bị...",
    filters:[{key:"department",label:"Khoa",options:["CĐHA","HSCC","Phẫu thuật","Cấp cứu","Khoa Nội"].map(v=>({v,l:v}))}],
    actions:[{ic:"file",title:"Lịch sử BT",onClick:r=>ti("Mở "+r.code)},{ic:"plus",title:"Yêu cầu BT",onClick:r=>tk("Đã tạo PCT")}],
    primaryAction:{label:"Nhập TB mới",ic:"plus",onClick:()=>ti("Form nhập TBYT")} };
})();

// ASSET MANAGEMENT
window.AssetManagementConfig = (() => {
  const data = _g6(96, i => {
    const s = ["active","damaged","disposed"][i%3];
    return { code:"TS-"+String(2401+i).padStart(5,"0"),
      name:rndPick(["Bàn làm việc","Tủ hồ sơ","Máy lạnh","Quạt trần","Máy in","Máy tính","Tủ thuốc","Cáng cứu thương","Xe lăn","Đèn khám","Ghế xếp","Tủ inox"]),
      category:rndPick(["Đồ gỗ","Điện tử","Cơ khí","Y cụ","Văn phòng"]),
      department:rndPick(["KH","Cấp cứu","Khoa Nội","HC-NS","Tài chính"]),
      qty:1+Math.floor(Math.random()*20),
      purchaseDate:_isoDate(todayG,-(1+Math.floor(Math.random()*8))*365),
      value:500000+Math.floor(Math.random()*30000000),
      _status:s, statusLbl:{active:"Đang dùng",damaged:"Hỏng",disposed:"Thanh lý"}[s], statusTone:{active:"ok",damaged:"warn",disposed:"muted"}[s] };
  });
  return { title:"Tài sản - CCDC",
    kpis:[{lbl:"Tổng TS",val:data.length},{lbl:"Đang sử dụng",val:data.filter(r=>r._status==="active").length,tone:"ok"},{lbl:"Cần sửa chữa",val:data.filter(r=>r._status==="damaged").length,tone:"warn"},{lbl:"Tổng giá trị",val:"4.2",unit:"tỷ ₫",tone:"info"}],
    statusTabs:[{v:"active",l:"Đang dùng",tone:"ok"},{v:"damaged",l:"Hỏng",tone:"warn"},{v:"disposed",l:"Thanh lý",tone:"muted"}],
    columns:[{key:"code",label:"Mã TS",code:true,width:130},{key:"name",label:"Tên tài sản"},{key:"category",label:"Loại",width:100},{key:"department",label:"Đơn vị",width:120},{key:"qty",label:"SL",mono:true,width:60},{key:"value",label:"Giá trị",render:r=>fmtVNDg(r.value),mono:true,width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["name","code","department"], searchPlaceholder:"Tìm tài sản...",
    actions:[{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở "+r.code)}],
    primaryAction:{label:"Nhập TS",ic:"plus",onClick:()=>ti("Form nhập tài sản")} };
})();

// INFECTION CONTROL
window.InfectionControlConfig = (() => {
  const data = _g6(46, i => {
    const s = ["new","investigating","contained","resolved"][i%4];
    return { code:"NK-"+String(2401+i).padStart(5,"0"),
      type:rndPick(["NTBV","COVID","Sởi","Cúm A","Lao","HFMD"]),
      ward:rndPick(["Khoa Nội","Khoa Ngoại","HSCC","Sản","Nhi"]),
      cases:1+Math.floor(Math.random()*15),
      onset:_isoDate(todayG,-i),
      reporter:"BS."+rndName(i+5).split(" ").pop(),
      _status:s, statusLbl:{new:"Mới phát hiện",investigating:"Điều tra",contained:"Đã khống chế",resolved:"Hoàn tất"}[s], statusTone:{new:"crit",investigating:"warn",contained:"info",resolved:"ok"}[s] };
  });
  return { title:"Kiểm soát nhiễm khuẩn",
    kpis:[{lbl:"Ổ dịch trong tháng",val:data.length},{lbl:"Đang điều tra",val:data.filter(r=>r._status==="investigating").length,tone:"warn"},{lbl:"Cảnh báo cao",val:data.filter(r=>r._status==="new").length,tone:"crit"},{lbl:"Tỷ lệ NTBV",val:"2.1%",tone:"focus"}],
    statusTabs:[{v:"new",l:"Mới",tone:"crit"},{v:"investigating",l:"Điều tra",tone:"warn"},{v:"contained",l:"Khống chế",tone:"info"},{v:"resolved",l:"Hoàn tất",tone:"ok"}],
    columns:[{key:"code",label:"Mã sự cố",code:true,width:130},{key:"type",label:"Loại",width:100},{key:"ward",label:"Khoa",width:140},{key:"cases",label:"Số ca",mono:true,width:80},{key:"onset",label:"Khởi phát",render:r=>fmtDMYg(r.onset),mono:true,width:110},{key:"reporter",label:"BS báo cáo",width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["type","ward","reporter"], searchPlaceholder:"Tìm sự cố...",
    actions:[{ic:"file",title:"Báo cáo",onClick:r=>ti("Mở BC "+r.code)}],
    primaryAction:{label:"Báo cáo NK",ic:"plus",onClick:()=>ti("Form báo cáo NK")} };
})();

// TRAINING & RESEARCH
window.TrainingResearchConfig = (() => {
  const data = _g6(56, i => {
    const tp = i%2 ? "Đào tạo" : "NCKH";
    const s = ["planning","active","completed","cancelled"][i%4];
    return { code:(tp==="NCKH"?"NCKH-":"DT-")+String(2401+i).padStart(4,"0"),
      type:tp, title:rndPick([tp==="NCKH"?"Nghiên cứu hiệu quả ĐT":"Lớp Tập huấn ECG",tp==="NCKH"?"Khảo sát Đáng giá HBA1c":"CME Hồi sức cấp cứu",tp==="NCKH"?"Nghiên cứu COVID-19":"Đào tạo điều dưỡng mới"]),
      lead:"BS."+rndName(i+10).split(" ").pop(),
      participants: 5+Math.floor(Math.random()*60),
      hours: 4+Math.floor(Math.random()*40),
      startDate:_isoDate(todayG,-i*3),
      _status:s, statusLbl:{planning:"Lên kế hoạch",active:"Đang triển khai",completed:"Hoàn thành",cancelled:"Hủy"}[s], statusTone:{planning:"warn",active:"info",completed:"ok",cancelled:"muted"}[s] };
  });
  return { title:"Đào tạo - NCKH",
    kpis:[{lbl:"Đào tạo/tháng",val:data.filter(r=>r.type==="Đào tạo").length},{lbl:"NCKH đang chạy",val:data.filter(r=>r._status==="active"&&r.type==="NCKH").length,tone:"info"},{lbl:"Hoàn thành năm",val:data.filter(r=>r._status==="completed").length,tone:"ok"},{lbl:"Tổng giờ ĐT",val:data.reduce((s,r)=>s+r.hours,0),tone:"focus"}],
    statusTabs:[{v:"planning",l:"Kế hoạch",tone:"warn"},{v:"active",l:"Triển khai",tone:"info"},{v:"completed",l:"Hoàn thành",tone:"ok"},{v:"cancelled",l:"Hủy",tone:"muted"}],
    columns:[{key:"code",label:"Mã",code:true,width:130},{key:"type",label:"Loại",width:80,render:r=><StatusBadge tone={r.type==="NCKH"?"focus":"info"}>{r.type}</StatusBadge>},{key:"title",label:"Tiêu đề"},{key:"lead",label:"Chủ trì",width:140},{key:"participants",label:"SL",mono:true,width:60},{key:"hours",label:"Giờ",mono:true,width:60},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["title","lead","code"], searchPlaceholder:"Tìm khóa/đề tài...",
    filters:[{key:"type",label:"Loại",options:[{v:"Đào tạo",l:"Đào tạo"},{v:"NCKH",l:"NCKH"}]}],
    actions:[{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở "+r.code)}],
    primaryAction:{label:"Tạo mới",ic:"plus",onClick:()=>ti("Form ĐT/NCKH")} };
})();

// PRACTICE LICENSE
window.PracticeLicenseConfig = (() => {
  const data = _g6(64, i => {
    const expiry = _isoDate(todayG, 30+Math.floor(Math.random()*1000)-200);
    const days = Math.floor((expiry - todayG)/86400000);
    const s = days < 0 ? "expired" : days < 30 ? "warn" : "ok";
    return { code:"CCHN-"+String(2401+i).padStart(5,"0"),
      name:"BS."+rndName(i),
      role:rndPick(["Bác sĩ","Điều dưỡng","Hộ sinh","KTV","Dược sĩ"]),
      department:rndPick(["Nội","Ngoại","Sản","Nhi","Cấp cứu"]),
      issuedBy:rndPick(["Sở Y tế HCM","Sở Y tế HN","Bộ Y tế"]),
      issueDate:_isoDate(todayG,-(2+Math.floor(Math.random()*10))*365),
      expiry, daysLeft:days,
      _status:s, statusLbl:{ok:"Còn hạn",warn:"Sắp hết",expired:"Hết hạn"}[s], statusTone:{ok:"ok",warn:"warn",expired:"crit"}[s] };
  });
  return { title:"Chứng chỉ hành nghề",
    kpis:[{lbl:"Tổng CCHN",val:data.length},{lbl:"Sắp hết hạn",val:data.filter(r=>r._status==="warn").length,tone:"warn"},{lbl:"Hết hạn",val:data.filter(r=>r._status==="expired").length,tone:"crit"},{lbl:"Cập nhật năm",val:18,tone:"focus"}],
    statusTabs:[{v:"ok",l:"Còn hạn",tone:"ok"},{v:"warn",l:"Sắp hết",tone:"warn"},{v:"expired",l:"Hết hạn",tone:"crit"}],
    columns:[{key:"code",label:"Mã CCHN",code:true,width:130},{key:"name",label:"Họ tên",render:r=><><b>{r.name}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.role} · {r.department}</div></>},{key:"issuedBy",label:"Cấp bởi",width:160},{key:"issueDate",label:"Ngày cấp",render:r=>fmtDMYg(r.issueDate),mono:true,width:100},{key:"expiry",label:"Hết hạn",render:r=>fmtDMYg(r.expiry),mono:true,width:100},{key:"daysLeft",label:"Còn (ngày)",render:r=><span style={{color:r.daysLeft<0?"var(--s-crit)":r.daysLeft<30?"var(--s-warn)":"var(--s-ok)",fontFamily:"var(--font-mono)"}}>{r.daysLeft<0?"-":""}{Math.abs(r.daysLeft)}</span>,mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["name","code"], searchPlaceholder:"Tìm CCHN...",
    actions:[{ic:"plus",title:"Gia hạn",onClick:r=>ti("Form gia hạn "+r.name)}],
    primaryAction:{label:"Cấp mới",ic:"plus",onClick:()=>ti("Form CCHN mới")} };
})();

// ENDPOINT SECURITY
window.EndpointSecurityConfig = (() => {
  const data = _g6(80, i => {
    const s = ["healthy","warning","compromised","offline"][i%4];
    return { code:"DEV-"+String(101+i).padStart(5,"0"),
      hostname:rndPick(["RECEPT","DOCT","NURSE","LAB","PHAR","ER"])+"-PC-"+String(101+i),
      ip:"10.0."+(1+i%30)+"."+(1+i%200),
      type:rndPick(["Workstation","Server","Tablet","Kiosk"]),
      department:rndPick(["Tiếp đón","Khám","HSCC","Lab","Dược"]),
      av:rndPick(["Kaspersky","Bitdefender","CrowdStrike"]),
      lastSeen:_isoDate(todayG,-(i%5)),
      threats:i%5?Math.floor(Math.random()*3):0,
      _status:s, statusLbl:{healthy:"An toàn",warning:"Cảnh báo",compromised:"Bị tấn công",offline:"Offline"}[s], statusTone:{healthy:"ok",warning:"warn",compromised:"crit",offline:"muted"}[s] };
  });
  return { title:"An toàn thông tin",
    kpis:[{lbl:"Endpoint",val:data.length},{lbl:"Bị tấn công",val:data.filter(r=>r._status==="compromised").length,tone:"crit"},{lbl:"Cảnh báo",val:data.filter(r=>r._status==="warning").length,tone:"warn"},{lbl:"Patch up-to-date",val:"94%",tone:"ok"}],
    statusTabs:[{v:"healthy",l:"An toàn",tone:"ok"},{v:"warning",l:"Cảnh báo",tone:"warn"},{v:"compromised",l:"Tấn công",tone:"crit"},{v:"offline",l:"Offline",tone:"muted"}],
    columns:[{key:"code",label:"Mã DEV",code:true,width:120},{key:"hostname",label:"Hostname",mono:true,width:140},{key:"ip",label:"IP",mono:true,width:120},{key:"type",label:"Loại",width:100},{key:"department",label:"Khoa",width:120},{key:"av",label:"AV",width:110},{key:"threats",label:"Mối đe doạ",render:r=>r.threats?<StatusBadge tone="crit">{r.threats}</StatusBadge>:"—",mono:true,width:110},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["hostname","ip","department"], searchPlaceholder:"Tìm endpoint...",
    actions:[{ic:"play",title:"Quét lại",onClick:r=>tk("Đã quét "+r.hostname)},{ic:"x",title:"Cách ly",tone:"crit",onClick:r=>cf("Cách ly "+r.hostname+"?",()=>tk("Đã cách ly"))}],
    primaryAction:{label:"Quét toàn hệ thống",ic:"play",onClick:()=>ti("Triggered full scan")} };
})();
