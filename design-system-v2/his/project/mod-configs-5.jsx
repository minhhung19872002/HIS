// =====================================================================
// HIS · Module configs 5 — support / finance / records  (compact)
// =====================================================================
const _g5 = (n, fn) => Array.from({length:n}, (_, i) => fn(i));
const _mk = (cfg) => cfg;

// HOSPITAL PHARMACY
window.HospitalPharmacyConfig = _mk((() => {
  const data = _g5(72, i => {
    const s = ["pending","preparing","dispensed","returned"][i%4];
    return { code:"NTBV-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      ward:rndPick(["Khoa Nội","Khoa Ngoại","Cấp cứu","Sản","Nhi","HSCC"]),
      doses:1+Math.floor(Math.random()*8), value: 100000+Math.floor(Math.random()*5000000),
      requestAt:_isoDate(todayG,-i%7),
      _status:s, statusLbl:{pending:"Chờ xử lý",preparing:"Đang soạn",dispensed:"Đã cấp",returned:"Hoàn trả"}[s],
      statusTone:{pending:"warn",preparing:"info",dispensed:"ok",returned:"focus"}[s] };
  });
  return { title:"Nhà thuốc bệnh viện",
    kpis:[{lbl:"Đơn/ngày",val:data.length},{lbl:"Chờ xử lý",val:data.filter(r=>r._status==="pending").length,tone:"warn"},{lbl:"Đã cấp",val:data.filter(r=>r._status==="dispensed").length,tone:"ok"},{lbl:"Doanh thu",val:"245",unit:"tr ₫",tone:"info"}],
    statusTabs:[{v:"pending",l:"Chờ",tone:"warn"},{v:"preparing",l:"Soạn",tone:"info"},{v:"dispensed",l:"Đã cấp",tone:"ok"},{v:"returned",l:"Hoàn trả",tone:"focus"}],
    columns:[{key:"code",label:"Mã đơn",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"ward",label:"Khoa",width:120},{key:"doses",label:"Số khoản",mono:true,width:90},{key:"value",label:"Giá trị",render:r=>fmtVNDg(r.value),mono:true,width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid","code"], searchPlaceholder:"Tìm đơn...",
    actions:[{ic:"file",title:"Soạn thuốc",onClick:r=>ti("Soạn "+r.code)}],
    primaryAction:{label:"Tạo đơn",ic:"plus",onClick:()=>ti("Tạo đơn nội trú")} };
})());

// MEDICAL SUPPLY
window.MedicalSupplyConfig = _mk((() => {
  const data = _g5(86, i => {
    const stock = Math.floor(Math.random()*500);
    const s = stock<10?"low":stock<50?"warn":"ok";
    return { code:"VTYT-"+String(101+i).padStart(5,"0"),
      name:rndPick(["Bơm tiêm 5mL","Găng tay y tế","Kim luồn 22G","Băng gạc vô trùng","Khẩu trang N95","Dây truyền dịch","Catheter Foley","Ống nội khí quản"]),
      unit:rndPick(["Cái","Hộp","Cuộn","Gói"]), stock, minStock:50,
      price:1000+Math.floor(Math.random()*200000),
      supplier:rndPick(["B.Braun","BD","Nipro","Terumo","Vinasun"]),
      lot:"L-"+String(2024+i%2)+"-"+String(101+i).padStart(4,"0"),
      expiry:_isoDate(todayG,90+Math.floor(Math.random()*900)),
      _status:s, statusLbl:{ok:"Đủ",warn:"Sắp hết",low:"Hết hàng"}[s], statusTone:{ok:"ok",warn:"warn",low:"crit"}[s] };
  });
  return { title:"Vật tư y tế",
    kpis:[{lbl:"Mã VTYT",val:data.length},{lbl:"Hết hàng",val:data.filter(r=>r._status==="low").length,tone:"crit"},{lbl:"Sắp hết",val:data.filter(r=>r._status==="warn").length,tone:"warn"},{lbl:"Tổng tồn",val:"1.8",unit:"tỷ ₫",tone:"info"}],
    statusTabs:[{v:"ok",l:"Đủ",tone:"ok"},{v:"warn",l:"Sắp hết",tone:"warn"},{v:"low",l:"Hết hàng",tone:"crit"}],
    columns:[{key:"code",label:"Mã",code:true,width:130},{key:"name",label:"Tên VTYT"},{key:"stock",label:"Tồn",mono:true,width:80},{key:"unit",label:"ĐVT",width:70},{key:"price",label:"Đơn giá",render:r=>fmtVNDg(r.price),mono:true,width:130},{key:"supplier",label:"NCC",width:110},{key:"expiry",label:"HSD",render:r=>fmtDMYg(r.expiry),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["name","code","supplier"], searchPlaceholder:"Tìm VTYT...",
    actions:[{ic:"plus",title:"Đặt hàng",onClick:r=>ti("Đặt PO "+r.name)}],
    primaryAction:{label:"Nhập kho",ic:"plus",onClick:()=>ti("Nhập VTYT")} };
})());

// NUTRITION
window.NutritionConfig = _mk((() => {
  const data = _g5(48, i => {
    const s = ["ordered","prepared","served","completed"][i%4];
    return { code:"DD-"+String(2401+i).padStart(4,"0"), pid:rndPid(), patient:rndName(i),
      ward:rndPick(["Khoa Nội","Khoa Ngoại","HSCC","Sản"]),
      diet:rndPick(["Cháo loãng","Cơm thường","ĐTĐ","Lọc thận","Thấp muối","Truyền"]),
      meals:rndPick(["Sáng+Trưa+Tối","Sáng+Trưa","3 bữa+phụ","Truyền 24h"]),
      kcal:1200+Math.floor(Math.random()*1500),
      doctor:"BS."+rndName(i+5).split(" ").pop(),
      _status:s, statusLbl:{ordered:"Đã chỉ định",prepared:"Đang nấu",served:"Đã phục vụ",completed:"Hoàn thành"}[s], statusTone:{ordered:"warn",prepared:"info",served:"ok",completed:"muted"}[s] };
  });
  return { title:"Dinh dưỡng",
    kpis:[{lbl:"Khẩu phần/ngày",val:data.length},{lbl:"Đang nấu",val:data.filter(r=>r._status==="prepared").length,tone:"info"},{lbl:"Đặc biệt",val:18,tone:"focus"},{lbl:"BN ĐTĐ",val:24,tone:"warn"}],
    statusTabs:[{v:"ordered",l:"CĐ",tone:"warn"},{v:"prepared",l:"Nấu",tone:"info"},{v:"served",l:"Phục vụ",tone:"ok"},{v:"completed",l:"Xong",tone:"muted"}],
    columns:[{key:"code",label:"Mã CĐ",code:true,width:120},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"ward",label:"Khoa",width:120},{key:"diet",label:"Chế độ",width:130},{key:"meals",label:"Bữa",width:160},{key:"kcal",label:"Calo",mono:true,width:80},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid","code","diet"], searchPlaceholder:"Tìm khẩu phần...",
    actions:[{ic:"file",title:"Sửa",onClick:r=>ti("Sửa "+r.code)}],
    primaryAction:{label:"Chỉ định mới",ic:"plus",onClick:()=>ti("Form chế độ ăn")} };
})());

// REHABILITATION
window.RehabilitationConfig = _mk((() => {
  const data = _g5(64, i => {
    const s = ["scheduled","ongoing","completed","stopped"][i%4];
    return { code:"PHCN-"+String(2401+i).padStart(4,"0"), pid:rndPid(), patient:rndName(i),
      condition:rndPick(["Liệt nửa người","TKKĐ","Sau phẫu thuật","Vẹo cột sống","Liệt VII","Đau lưng"]),
      method:rndPick(["VLTL","Châm cứu","Vận động","Sóng ngắn","Điện trị liệu","Thuỷ trị liệu"]),
      sessions:1+Math.floor(Math.random()*30), totalSessions:20+Math.floor(Math.random()*40),
      kts:"KTV."+rndName(i+5).split(" ").pop(),
      _status:s, statusLbl:{scheduled:"Đặt lịch",ongoing:"Đang điều trị",completed:"Kết thúc",stopped:"Tạm ngưng"}[s], statusTone:{scheduled:"warn",ongoing:"info",completed:"ok",stopped:"muted"}[s] };
  });
  return { title:"VLTL / PHCN",
    kpis:[{lbl:"BN đang điều trị",val:data.filter(r=>r._status==="ongoing").length,tone:"info"},{lbl:"Đặt lịch",val:data.filter(r=>r._status==="scheduled").length,tone:"warn"},{lbl:"Kết thúc tháng",val:data.filter(r=>r._status==="completed").length,tone:"ok"},{lbl:"Số liệu trình",val:"1,420",tone:"focus"}],
    statusTabs:[{v:"scheduled",l:"Đặt lịch",tone:"warn"},{v:"ongoing",l:"Đang ĐT",tone:"info"},{v:"completed",l:"Kết thúc",tone:"ok"},{v:"stopped",l:"Ngưng",tone:"muted"}],
    columns:[{key:"code",label:"Mã PHCN",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"condition",label:"Tình trạng",width:160},{key:"method",label:"Phương pháp",width:140},{key:"sessions",label:"Buổi",render:r=>r.sessions+"/"+r.totalSessions,mono:true,width:80},{key:"kts",label:"KTV",width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["patient","pid","code","kts"], searchPlaceholder:"Tìm BN PHCN...",
    actions:[{ic:"file",title:"Lịch trình",onClick:r=>ti("Mở "+r.code)}],
    primaryAction:{label:"Đăng ký mới",ic:"plus",onClick:()=>ti("Form PHCN")} };
})());

// TRADITIONAL MEDICINE
window.TraditionalMedicineConfig = _mk((() => {
  const data = _g5(56, i => {
    const s = ["scheduled","treating","completed"][i%3];
    return { code:"YHCT-"+String(2401+i).padStart(4,"0"), pid:rndPid(), patient:rndName(i),
      condition:rndPick(["Đau lưng","Mất ngủ","Liệt VII","Đau khớp","Suy nhược","Stress"]),
      treatment:rndPick(["Châm cứu","Bấm huyệt","Cứu","Thuốc thang","Xông thuốc","Giác hơi"]),
      sessions:1+Math.floor(Math.random()*15), totalSessions:10+Math.floor(Math.random()*30),
      practitioner:"BS."+rndName(i+8).split(" ").pop(),
      _status:s, statusLbl:{scheduled:"Đặt lịch",treating:"Đang điều trị",completed:"Hoàn tất"}[s], statusTone:{scheduled:"warn",treating:"info",completed:"ok"}[s] };
  });
  return { title:"Y học cổ truyền",
    kpis:[{lbl:"BN đang ĐT",val:data.filter(r=>r._status==="treating").length,tone:"info"},{lbl:"Hoàn tất tháng",val:data.filter(r=>r._status==="completed").length,tone:"ok"},{lbl:"Châm cứu",val:142,tone:"focus"},{lbl:"Thuốc thang",val:"86",unit:"thang",tone:"warn"}],
    statusTabs:[{v:"scheduled",l:"Đặt lịch",tone:"warn"},{v:"treating",l:"Đang ĐT",tone:"info"},{v:"completed",l:"Hoàn tất",tone:"ok"}],
    columns:[{key:"code",label:"Mã",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"condition",label:"Tình trạng",width:140},{key:"treatment",label:"Phương pháp",width:140},{key:"sessions",label:"Buổi",render:r=>r.sessions+"/"+r.totalSessions,mono:true,width:80},{key:"practitioner",label:"BS",width:140},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid","code"], searchPlaceholder:"Tìm BN YHCT...",
    actions:[{ic:"file",title:"Hồ sơ",onClick:r=>ti("Mở "+r.code)}],
    primaryAction:{label:"Đăng ký",ic:"plus",onClick:()=>ti("Form YHCT")} };
})());

// FINANCE
window.FinanceConfig = _mk((() => {
  const data = _g5(80, i => {
    const tp = rndPick(["Thu","Chi"]);
    const s = ["pending","approved","posted","rejected"][i%4];
    return { code:"FIN-"+String(2401+i).padStart(5,"0"),
      type:tp, category:rndPick(["Thu viện phí","Thu BHYT","Lương","Mua thuốc","Mua VT","Chi điện nước","Khấu hao","Đầu tư"]),
      amount:tp==="Thu"?(1000000+Math.floor(Math.random()*30000000)):-(500000+Math.floor(Math.random()*20000000)),
      date:_isoDate(todayG,-i%30),
      account:rndPick(["VCB-3210","TCB-8842","Tiền mặt","BIDV-7720"]),
      creator:rndName(i+10),
      _status:s, statusLbl:{pending:"Chờ duyệt",approved:"Đã duyệt",posted:"Đã ghi sổ",rejected:"Từ chối"}[s], statusTone:{pending:"warn",approved:"info",posted:"ok",rejected:"crit"}[s] };
  });
  return { title:"Quản lý tài chính",
    kpis:[{lbl:"Tổng thu",val:"3.45",unit:"tỷ",tone:"ok"},{lbl:"Tổng chi",val:"2.18",unit:"tỷ",tone:"warn"},{lbl:"Chênh lệch",val:"+1.27",unit:"tỷ",tone:"focus"},{lbl:"Chờ duyệt",val:data.filter(r=>r._status==="pending").length,tone:"warn"}],
    statusTabs:[{v:"pending",l:"Chờ duyệt",tone:"warn"},{v:"approved",l:"Đã duyệt",tone:"info"},{v:"posted",l:"Ghi sổ",tone:"ok"},{v:"rejected",l:"Từ chối",tone:"crit"}],
    columns:[{key:"code",label:"Mã CT",code:true,width:130},{key:"type",label:"Loại",width:60,render:r=><StatusBadge tone={r.type==="Thu"?"ok":"warn"}>{r.type}</StatusBadge>},{key:"category",label:"Khoản mục",width:160},{key:"amount",label:"Số tiền",render:r=><span style={{color:r.amount>0?"var(--s-ok)":"var(--s-crit)",fontFamily:"var(--font-mono)"}}>{r.amount>0?"+":""}{fmtVNDg(Math.abs(r.amount))}</span>,mono:true,width:160},{key:"date",label:"Ngày",render:r=>fmtDMYg(r.date),mono:true,width:100},{key:"account",label:"Tài khoản",width:120},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["category","code","creator"], searchPlaceholder:"Tìm chứng từ...",
    filters:[{key:"type",label:"Loại",options:[{v:"Thu",l:"Thu"},{v:"Chi",l:"Chi"}]}],
    actions:[{ic:"check",title:"Duyệt",onClick:r=>cf("Duyệt "+r.code+"?",()=>tk("Đã duyệt"))}],
    primaryAction:{label:"Tạo chứng từ",ic:"plus",onClick:()=>ti("Form chứng từ")} };
})());

// BHXH AUDIT
window.BhxhAuditConfig = _mk((() => {
  const data = _g5(60, i => {
    const s = ["new","reviewing","approved","rejected","appealed"][i%5];
    return { code:"BHXH-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      cardNo:"DN"+rndPick(["1","4"])+"3322"+String(101+i).padStart(7,"0"),
      visitType:rndPick(["Ngoại trú","Nội trú","Cấp cứu"]),
      claimAmount:100000+Math.floor(Math.random()*30000000),
      paidAmount:50000+Math.floor(Math.random()*25000000),
      issuesCount:i%4,
      auditor:i%2?"GĐ."+rndName(i+5).split(" ").pop():null,
      visitDate:_isoDate(todayG,-i%30),
      _status:s, statusLbl:{new:"Mới",reviewing:"Đang duyệt",approved:"Đạt",rejected:"Từ chối",appealed:"Khiếu nại"}[s], statusTone:{new:"warn",reviewing:"info",approved:"ok",rejected:"crit",appealed:"focus"}[s] };
  });
  return { title:"BHXH kiểm tra",
    kpis:[{lbl:"Hồ sơ tháng",val:data.length},{lbl:"Đạt",val:data.filter(r=>r._status==="approved").length,tone:"ok"},{lbl:"Bị từ chối",val:data.filter(r=>r._status==="rejected").length,tone:"crit"},{lbl:"Cần khiếu nại",val:data.filter(r=>r._status==="appealed").length,tone:"focus"}],
    statusTabs:[{v:"new",l:"Mới",tone:"warn"},{v:"reviewing",l:"Đang duyệt",tone:"info"},{v:"approved",l:"Đạt",tone:"ok"},{v:"rejected",l:"Từ chối",tone:"crit"},{v:"appealed",l:"Khiếu nại",tone:"focus"}],
    columns:[{key:"code",label:"Mã HS",code:true,width:130},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.cardNo}</div></>},{key:"visitType",label:"Loại",width:90},{key:"claimAmount",label:"Đề nghị",render:r=>fmtVNDg(r.claimAmount),mono:true,width:140},{key:"paidAmount",label:"Đã chi trả",render:r=>fmtVNDg(r.paidAmount),mono:true,width:140},{key:"issuesCount",label:"Lỗi",render:r=>r.issuesCount?<StatusBadge tone="crit">{r.issuesCount}</StatusBadge>:"—",mono:true,width:60},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","cardNo","code"], searchPlaceholder:"Tìm hồ sơ BHXH...",
    actions:[{ic:"file",title:"Xem chi tiết",onClick:r=>ti("Mở "+r.code)},{ic:"check",title:"Duyệt",tone:"crit",onClick:r=>cf("Duyệt "+r.code+"?",()=>tk("Đã duyệt"))}],
    primaryAction:{label:"Khiếu nại",ic:"plus",onClick:()=>ti("Form khiếu nại BHXH")} };
})());
