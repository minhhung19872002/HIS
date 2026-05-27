// =====================================================================
// HIS · Module configs 7 — integration & public health
// =====================================================================
const _g7 = (n, fn) => Array.from({length:n}, (_, i) => fn(i));

// HEALTH EXCHANGE
window.HealthExchangeConfig = (() => {
  const data = _g7(86, i => {
    const tp = rndPick(["Gửi đi","Nhận về"]);
    const s = ["pending","sent","received","failed"][i%4];
    return { code:"HIE-"+String(2401+i).padStart(5,"0"),
      type:tp, doc:rndPick(["BA tóm tắt","KQ XN","Chẩn đoán hình ảnh","Phiếu chuyển viện","Đơn thuốc"]),
      partner:rndPick(["BV ĐKKV","BV Bạch Mai","BV Chợ Rẫy","BV Tỉnh","TYT P.5","TYT P.7"]),
      patient:rndName(i), pid:rndPid(),
      sentAt:_isoDate(todayG,-i%14),
      _status:s, statusLbl:{pending:"Chờ gửi",sent:"Đã gửi",received:"Đã nhận",failed:"Lỗi"}[s], statusTone:{pending:"warn",sent:"info",received:"ok",failed:"crit"}[s] };
  });
  return { title:"Liên thông y tế HIE",
    kpis:[{lbl:"Trao đổi/tháng",val:data.length},{lbl:"Đã thành công",val:data.filter(r=>["sent","received"].includes(r._status)).length,tone:"ok"},{lbl:"Lỗi",val:data.filter(r=>r._status==="failed").length,tone:"crit"},{lbl:"Đối tác",val:18,tone:"focus"}],
    statusTabs:[{v:"pending",l:"Chờ gửi",tone:"warn"},{v:"sent",l:"Đã gửi",tone:"info"},{v:"received",l:"Đã nhận",tone:"ok"},{v:"failed",l:"Lỗi",tone:"crit"}],
    columns:[{key:"code",label:"Mã HIE",code:true,width:130},{key:"type",label:"Hướng",width:80,render:r=><StatusBadge tone={r.type==="Gửi đi"?"warn":"info"}>{r.type}</StatusBadge>},{key:"doc",label:"Loại tài liệu",width:160},{key:"partner",label:"Đối tác",width:160},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"sentAt",label:"Thời gian",render:r=>fmtDMYg(r.sentAt),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["patient","pid","partner"], searchPlaceholder:"Tìm trao đổi...",
    actions:[{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở "+r.code)},{ic:"play",title:"Gửi lại",onClick:r=>tk("Đã gửi lại")}],
    primaryAction:{label:"Gửi mới",ic:"plus",onClick:()=>ti("Form gửi HIE")} };
})();

// INTER HOSPITAL SHARING
window.InterHospitalSharingConfig = (() => {
  const data = _g7(64, i => {
    const s = ["pending","approved","sharing","completed"][i%4];
    return { code:"IHS-"+String(2401+i).padStart(5,"0"),
      target:rndPick(["BV Tỉnh ĐN","BV ĐKKV","BV Tâm Trí","BV Quận 7","BV Nhi đồng 1"]),
      shareScope:rndPick(["Toàn HSBA","Tóm tắt BA","CĐHA","XN","Lịch sử dùng thuốc"]),
      patient:rndName(i), pid:rndPid(),
      requestor:"BS."+rndName(i+5).split(" ").pop(),
      requestedAt:_isoDate(todayG,-i%14),
      consent:i%3,
      _status:s, statusLbl:{pending:"Chờ duyệt",approved:"Đã duyệt",sharing:"Đang chia sẻ",completed:"Hoàn tất"}[s], statusTone:{pending:"warn",approved:"info",sharing:"focus",completed:"ok"}[s] };
  });
  return { title:"Chia sẻ liên viện",
    kpis:[{lbl:"Yêu cầu/tháng",val:data.length},{lbl:"Chờ duyệt",val:data.filter(r=>r._status==="pending").length,tone:"warn"},{lbl:"Đang chia sẻ",val:data.filter(r=>r._status==="sharing").length,tone:"focus"},{lbl:"Hoàn tất",val:data.filter(r=>r._status==="completed").length,tone:"ok"}],
    statusTabs:[{v:"pending",l:"Chờ duyệt",tone:"warn"},{v:"approved",l:"Đã duyệt",tone:"info"},{v:"sharing",l:"Đang chia sẻ",tone:"focus"},{v:"completed",l:"Xong",tone:"ok"}],
    columns:[{key:"code",label:"Mã YC",code:true,width:130},{key:"target",label:"BV nhận",width:160},{key:"shareScope",label:"Phạm vi",width:160},{key:"patient",label:"BN",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},{key:"requestor",label:"Người YC",width:140},{key:"consent",label:"Đồng ý",render:r=>r.consent?<StatusBadge tone="ok">Có</StatusBadge>:<StatusBadge tone="warn">Chưa</StatusBadge>,width:80},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["patient","target","pid"], searchPlaceholder:"Tìm yêu cầu...",
    actions:[{ic:"check",title:"Duyệt",onClick:r=>cf("Duyệt "+r.code+"?",()=>tk("Đã duyệt"))}],
    primaryAction:{label:"YC chia sẻ",ic:"plus",onClick:()=>ti("Form yêu cầu chia sẻ")} };
})();

// EMERGENCY DISASTER
window.EmergencyDisasterConfig = (() => {
  const data = _g7(28, i => {
    const s = ["active","declared","containing","resolved"][i%4];
    return { code:"DIS-"+String(2401+i).padStart(4,"0"),
      type:rndPick(["Tai nạn giao thông","Cháy nổ","Ngộ độc","Bão lũ","Dịch bệnh","Hoá học"]),
      location:rndPick(["Q.1","Q.5","Q.7","Q.10","H.Bình Chánh","H.Củ Chi"]),
      casualties:5+Math.floor(Math.random()*100),
      severity:rndPick(["Cấp 1","Cấp 2","Cấp 3"]),
      lead:"BS."+rndName(i+5).split(" ").pop(),
      reportedAt:_isoDate(todayG,-i),
      _status:s, statusLbl:{active:"Đang xảy ra",declared:"Đã ban bố",containing:"Khống chế",resolved:"Hoàn tất"}[s], statusTone:{active:"crit",declared:"warn",containing:"info",resolved:"ok"}[s] };
  });
  return { title:"Cấp cứu / Thảm hoạ",
    kpis:[{lbl:"Sự cố tháng",val:data.length},{lbl:"Đang ứng phó",val:data.filter(r=>["active","declared","containing"].includes(r._status)).length,tone:"crit"},{lbl:"Tổng nạn nhân",val:data.reduce((s,r)=>s+r.casualties,0),tone:"warn"},{lbl:"Hoàn tất",val:data.filter(r=>r._status==="resolved").length,tone:"ok"}],
    statusTabs:[{v:"active",l:"Đang xảy ra",tone:"crit"},{v:"declared",l:"Ban bố",tone:"warn"},{v:"containing",l:"Khống chế",tone:"info"},{v:"resolved",l:"Hoàn tất",tone:"ok"}],
    columns:[{key:"code",label:"Mã sự cố",code:true,width:120},{key:"type",label:"Loại",width:160},{key:"location",label:"Địa điểm",width:140},{key:"casualties",label:"Nạn nhân",mono:true,width:90},{key:"severity",label:"Cấp độ",width:80,render:r=><StatusBadge tone={r.severity==="Cấp 3"?"crit":r.severity==="Cấp 2"?"warn":"info"}>{r.severity}</StatusBadge>},{key:"lead",label:"Chỉ huy",width:140},{key:"reportedAt",label:"Báo cáo",render:r=>fmtDMYg(r.reportedAt),mono:true,width:100},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["type","location","lead"], searchPlaceholder:"Tìm sự cố...",
    actions:[{ic:"file",title:"Báo cáo",onClick:r=>ti("Mở BC "+r.code)}],
    primaryAction:{label:"Báo sự cố",ic:"plus",onClick:()=>ti("Form báo sự cố")} };
})();

// CLINICAL GUIDANCE
window.ClinicalGuidanceConfig = (() => {
  const data = _g7(48, i => {
    const s = ["scheduled","ongoing","completed","cancelled"][i%4];
    return { code:"CDT-"+String(2401+i).padStart(4,"0"),
      lowerHosp:rndPick(["TYT P.1","TYT P.5","TYT P.7","BV Quận 11","BV H.Củ Chi"]),
      topic:rndPick(["Đào tạo cấp cứu","Hỗ trợ phẫu thuật","Hội chẩn từ xa","Chuyển giao kỹ thuật","Giám sát chất lượng"]),
      lead:"BS."+rndName(i+10).split(" ").pop(),
      duration:rndPick(["1 buổi","1 ngày","3 ngày","1 tuần"]),
      participants:3+Math.floor(Math.random()*30),
      startDate:_isoDate(todayG,-i*3),
      _status:s, statusLbl:{scheduled:"Đặt lịch",ongoing:"Đang tiến hành",completed:"Hoàn thành",cancelled:"Hủy"}[s], statusTone:{scheduled:"warn",ongoing:"info",completed:"ok",cancelled:"muted"}[s] };
  });
  return { title:"Chỉ đạo tuyến",
    kpis:[{lbl:"Hoạt động/tháng",val:data.length},{lbl:"Đang tiến hành",val:data.filter(r=>r._status==="ongoing").length,tone:"info"},{lbl:"BV được hỗ trợ",val:14,tone:"focus"},{lbl:"Hoàn tất năm",val:data.filter(r=>r._status==="completed").length,tone:"ok"}],
    statusTabs:[{v:"scheduled",l:"Đặt lịch",tone:"warn"},{v:"ongoing",l:"Đang tiến hành",tone:"info"},{v:"completed",l:"Xong",tone:"ok"},{v:"cancelled",l:"Hủy",tone:"muted"}],
    columns:[{key:"code",label:"Mã",code:true,width:120},{key:"lowerHosp",label:"Tuyến dưới",width:160},{key:"topic",label:"Nội dung",width:200},{key:"lead",label:"BS phụ trách",width:140},{key:"duration",label:"Thời gian",width:100},{key:"participants",label:"SL",mono:true,width:60},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120}],
    rowKey:r=>r.code, searchKeys:["lowerHosp","topic","lead"], searchPlaceholder:"Tìm hoạt động...",
    actions:[{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở "+r.code)}],
    primaryAction:{label:"Lên kế hoạch",ic:"plus",onClick:()=>ti("Form CDT")} };
})();

// SMS MANAGEMENT
window.SmsManagementConfig = (() => {
  const data = _g7(120, i => {
    const s = ["queued","sent","delivered","failed"][i%4];
    return { code:"SMS-"+String(2401+i).padStart(5,"0"),
      to: rndPhone(),
      template:rndPick(["Nhắc tái khám","KQ XN","Lịch hẹn","Mã OTP","Nhắc tiêm chủng","Cảm ơn"]),
      content:"Kính gửi BN, ...", sentAt:_isoDate(todayG,-i%7),
      cost:200,
      _status:s, statusLbl:{queued:"Chờ gửi",sent:"Đã gửi",delivered:"Đã nhận",failed:"Thất bại"}[s], statusTone:{queued:"warn",sent:"info",delivered:"ok",failed:"crit"}[s] };
  });
  return { title:"SMS Gateway",
    kpis:[{lbl:"SMS/ngày",val:data.length},{lbl:"Đã gửi thành công",val:data.filter(r=>r._status==="delivered").length,tone:"ok"},{lbl:"Thất bại",val:data.filter(r=>r._status==="failed").length,tone:"crit"},{lbl:"Chi phí tháng",val:"4.2",unit:"tr ₫",tone:"info"}],
    statusTabs:[{v:"queued",l:"Chờ",tone:"warn"},{v:"sent",l:"Đã gửi",tone:"info"},{v:"delivered",l:"Đã nhận",tone:"ok"},{v:"failed",l:"Thất bại",tone:"crit"}],
    columns:[{key:"code",label:"Mã SMS",code:true,width:130},{key:"to",label:"SĐT",mono:true,width:120},{key:"template",label:"Mẫu",width:150},{key:"sentAt",label:"Gửi lúc",render:r=>fmtDMYg(r.sentAt),mono:true,width:100},{key:"cost",label:"Phí",render:r=>fmtVNDg(r.cost),mono:true,width:80},{key:"_status",label:"TT",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110}],
    rowKey:r=>r.code, searchKeys:["to","template"], searchPlaceholder:"Tìm SMS...",
    actions:[{ic:"play",title:"Gửi lại",onClick:r=>tk("Đã gửi lại")}],
    primaryAction:{label:"Soạn SMS",ic:"plus",onClick:()=>ti("Form soạn SMS")} };
})();
