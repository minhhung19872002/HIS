// =====================================================================
// HIS · Module configs 4 — paraclinical & support compact
// =====================================================================
const _g4 = (n, fn) => Array.from({length:n}, (_, i) => fn(i));

// SAMPLE TRACKING
window.SampleTrackingConfig = (() => {
  const data = _g4(96, i => {
    const s = ["collected","transit","received","tested","reported"][i%5];
    return {
      code:"TR-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      sampleType:rndPick(["Máu","Nước tiểu","Đờm","Phân","Mô"]),
      from:rndPick(["Khoa Nội","Khoa Ngoại","Cấp cứu","Sản","Nhi"]),
      to:rndPick(["LIS A","LIS B","Vi sinh","Pathology"]),
      collectedAt:_isoDate(todayG,-i%5), arriveAt:i%3?_isoDate(todayG,-i%5):null,
      _status:s, statusLbl:{collected:"Đã lấy",transit:"Vận chuyển",received:"Đã nhận",tested:"Đã chạy",reported:"Đã trả KQ"}[s],
      statusTone:{collected:"warn",transit:"info",received:"focus",tested:"info",reported:"ok"}[s],
    };
  });
  return {
    title:"Theo dõi mẫu",
    kpis:[
      {lbl:"Mẫu trong ngày",val:data.length},
      {lbl:"Đang vận chuyển",val:data.filter(r=>r._status==="transit").length,tone:"info"},
      {lbl:"Trễ TAT",val:6,tone:"warn"},
      {lbl:"Đã trả KQ",val:data.filter(r=>r._status==="reported").length,tone:"ok"},
    ],
    statusTabs:[{v:"collected",l:"Đã lấy",tone:"warn"},{v:"transit",l:"Vận chuyển",tone:"info"},{v:"received",l:"Đã nhận",tone:"focus"},{v:"tested",l:"Đã chạy",tone:"info"},{v:"reported",l:"Trả KQ",tone:"ok"}],
    columns:[
      {key:"code",label:"Mã mẫu",code:true,width:130},
      {key:"patient",label:"Bệnh nhân",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},
      {key:"sampleType",label:"Loại mẫu",width:100},
      {key:"from",label:"Từ",width:120},
      {key:"to",label:"Đến",width:110},
      {key:"collectedAt",label:"Lấy lúc",render:r=>fmtDMYg(r.collectedAt),mono:true,width:100},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120},
    ],
    rowKey:r=>r.code, searchKeys:["patient","pid","code"], searchPlaceholder:"Tìm mẫu...",
    actions:[{ic:"file",title:"Chi tiết",onClick:r=>ti("Mở "+r.code)}],
    primaryAction:{label:"Quét mã mẫu",ic:"search",onClick:()=>ti("Quét barcode mẫu")},
  };
})();

// REAGENT MANAGEMENT
window.ReagentManagementConfig = (() => {
  const data = _g4(58, i => {
    const stock = Math.floor(Math.random()*200);
    const s = stock < 20 ? "low" : stock < 50 ? "warn" : "ok";
    return {
      code:"RGT-"+String(101+i).padStart(4,"0"),
      name:rndPick(["Glucose Reagent","ALT Substrate","HbA1c Buffer","CRP Latex","TSH Antibody","Hemolysin","Diluent CN-free","Probe Cleaner"])+" "+rndPick(["500mL","1L","2L","250mL"]),
      brand:rndPick(["Roche","Beckman","Abbott","Siemens","Sysmex"]),
      machine:rndPick(["AU480","Cobas 6000","Sysmex XN","Architect i2000"]),
      stock, unit:"chai", expiry:_isoDate(todayG,30+Math.floor(Math.random()*400)),
      lot:"LOT-"+(2024+i%2)+"-"+String(100+i%500).padStart(4,"0"),
      price: 500000+Math.floor(Math.random()*5000000),
      _status:s, statusLbl:{ok:"Đủ",warn:"Sắp hết",low:"Hết hàng"}[s], statusTone:{ok:"ok",warn:"warn",low:"crit"}[s],
    };
  });
  return {
    title:"Hoá chất xét nghiệm",
    kpis:[
      {lbl:"Mã hoá chất",val:data.length},
      {lbl:"Hết hàng",val:data.filter(r=>r._status==="low").length,tone:"crit"},
      {lbl:"Sắp hết",val:data.filter(r=>r._status==="warn").length,tone:"warn"},
      {lbl:"Tổng giá trị",val:"3.2",unit:"tỷ ₫",tone:"info"},
    ],
    statusTabs:[{v:"ok",l:"Đủ",tone:"ok"},{v:"warn",l:"Sắp hết",tone:"warn"},{v:"low",l:"Hết hàng",tone:"crit"}],
    columns:[
      {key:"code",label:"Mã",code:true,width:120},
      {key:"name",label:"Tên hoá chất"},
      {key:"brand",label:"Hãng",width:100},
      {key:"machine",label:"Máy",width:120},
      {key:"stock",label:"Tồn",mono:true,width:80},
      {key:"lot",label:"Lô",mono:true,width:140},
      {key:"expiry",label:"Hạn",render:r=>fmtDMYg(r.expiry),mono:true,width:100},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110},
    ],
    rowKey:r=>r.code, searchKeys:["name","brand","code","lot"], searchPlaceholder:"Tìm hoá chất...",
    filters:[{key:"machine",label:"Máy",options:["AU480","Cobas 6000","Sysmex XN","Architect i2000"].map(v=>({v,l:v}))}],
    actions:[{ic:"plus",title:"Đặt thêm",onClick:r=>ti("Đặt PO "+r.name)}],
    primaryAction:{label:"Nhập kho",ic:"plus",onClick:()=>ti("Form nhập hoá chất")},
  };
})();

// LIS CONFIG
window.LISConfigConfig = (() => {
  const data = _g4(40, i => {
    const s = ["active","inactive","draft"][i%3];
    return {
      code:"CFG-"+String(101+i).padStart(4,"0"),
      name:rndPick(["Mapping LIS↔Máy AU480","Workflow Vi sinh","Cảnh báo HbA1c","Range tham chiếu Nội","Quy tắc lặp mẫu","Auto-validation rule","Cấu hình QC L1","Format kết quả"]),
      type:rndPick(["Mapping","Workflow","Range","Rule","QC","Format"]),
      module:rndPick(["LIS","Vi sinh","Pathology"]),
      updated:_isoDate(todayG,-i*5), updatedBy:"BS."+rndName(i+9).split(" ").pop(),
      _status:s, statusLbl:{active:"Hoạt động",inactive:"Tạm tắt",draft:"Bản nháp"}[s], statusTone:{active:"ok",inactive:"muted",draft:"warn"}[s],
    };
  });
  return {
    title:"Cấu hình LIS",
    kpis:[
      {lbl:"Cấu hình hoạt động",val:data.filter(r=>r._status==="active").length,tone:"ok"},
      {lbl:"Bản nháp",val:data.filter(r=>r._status==="draft").length,tone:"warn"},
      {lbl:"Cập nhật tuần",val:7,tone:"focus"},
      {lbl:"Người chỉnh sửa",val:5,tone:"info"},
    ],
    statusTabs:[{v:"active",l:"Hoạt động",tone:"ok"},{v:"inactive",l:"Tạm tắt",tone:"muted"},{v:"draft",l:"Nháp",tone:"warn"}],
    columns:[
      {key:"code",label:"Mã",code:true,width:120},
      {key:"name",label:"Tên cấu hình"},
      {key:"type",label:"Loại",width:110},
      {key:"module",label:"Module",width:110},
      {key:"updated",label:"Cập nhật",render:r=>fmtDMYg(r.updated),mono:true,width:100},
      {key:"updatedBy",label:"Bởi",width:130},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110},
    ],
    rowKey:r=>r.code, searchKeys:["name","code","type"], searchPlaceholder:"Tìm cấu hình...",
    actions:[{ic:"file",title:"Sửa",onClick:r=>ti("Mở "+r.name)}],
    primaryAction:{label:"Tạo cấu hình",ic:"plus",onClick:()=>ti("Form cấu hình LIS")},
  };
})();

// DICOM VIEWER
window.DicomViewerConfig = (() => {
  const data = _g4(48, i => {
    const s = ["new","viewed","reported","archived"][i%4];
    return {
      study:"ST-"+String(2401+i).padStart(5,"0"),
      pid:rndPid(), patient:rndName(i),
      modality:rndPick(["CT","MR","CR","DR","US","XA","NM"]),
      bodyPart:rndPick(["Đầu","Ngực","Bụng","Cột sống","Chi","Tim","Mạch máu"]),
      images: 30+Math.floor(Math.random()*500),
      studyDate:_isoDate(todayG,-i),
      reader:i%2?"BS."+rndName(i+3).split(" ").pop():null,
      _status:s, statusLbl:{new:"Chưa đọc",viewed:"Đang đọc",reported:"Đã đọc",archived:"Lưu trữ"}[s],
      statusTone:{new:"warn",viewed:"info",reported:"ok",archived:"muted"}[s],
    };
  });
  return {
    title:"DICOM Viewer",
    kpis:[
      {lbl:"Studies hôm nay",val:data.length},
      {lbl:"Chờ đọc",val:data.filter(r=>r._status==="new").length,tone:"warn"},
      {lbl:"Đã đọc",val:data.filter(r=>r._status==="reported").length,tone:"ok"},
      {lbl:"Tổng dung lượng",val:"284",unit:"GB",tone:"info"},
    ],
    statusTabs:[{v:"new",l:"Chưa đọc",tone:"warn"},{v:"viewed",l:"Đang đọc",tone:"info"},{v:"reported",l:"Đã đọc",tone:"ok"},{v:"archived",l:"Lưu trữ",tone:"muted"}],
    columns:[
      {key:"study",label:"Mã study",code:true,width:130},
      {key:"patient",label:"Bệnh nhân",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},
      {key:"modality",label:"Modality",mono:true,width:90},
      {key:"bodyPart",label:"Bộ phận",width:110},
      {key:"images",label:"Số ảnh",mono:true,width:80},
      {key:"studyDate",label:"Ngày",render:r=>fmtDMYg(r.studyDate),mono:true,width:100},
      {key:"reader",label:"Đọc bởi",width:140},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:110},
    ],
    rowKey:r=>r.study, searchKeys:["patient","pid","study"], searchPlaceholder:"Tìm study...",
    actions:[{ic:"eye",title:"Mở DICOM",onClick:r=>ti("Mở viewer "+r.study)},{ic:"file",title:"Tạo report",onClick:r=>ti("Form report")}],
    primaryAction:{label:"Import CD",ic:"plus",onClick:()=>ti("Import DICOM")},
  };
})();

// PATHOLOGY
window.PathologyConfig = (() => {
  const data = _g4(54, i => {
    const s = ["pending","processing","reported","positive"][i%4];
    return {
      code:"GP-"+String(2401+i).padStart(5,"0"), pid:rndPid(), patient:rndName(i),
      organ:rndPick(["Vú","Đại tràng","Phổi","Gan","Tử cung","Tuyến giáp","Da","Hạch"]),
      type:rndPick(["Sinh thiết","Tế bào học","Khối phẫu thuật","Tế bào dịch"]),
      doctor:"BS."+rndName(i+5).split(" ").pop(),
      received:_isoDate(todayG,-i*2),
      _status:s, statusLbl:{pending:"Chờ xử lý",processing:"Đang đọc",reported:"Đã trả KQ",positive:"Ác tính"}[s], statusTone:{pending:"warn",processing:"info",reported:"ok",positive:"crit"}[s],
    };
  });
  return {
    title:"Giải phẫu bệnh",
    kpis:[
      {lbl:"Mẫu/tháng",val:data.length},
      {lbl:"Chờ xử lý",val:data.filter(r=>r._status==="pending").length,tone:"warn"},
      {lbl:"Ác tính",val:data.filter(r=>r._status==="positive").length,tone:"crit"},
      {lbl:"TAT TB",val:"5.2",unit:"ngày",tone:"info"},
    ],
    statusTabs:[{v:"pending",l:"Chờ xử lý",tone:"warn"},{v:"processing",l:"Đang đọc",tone:"info"},{v:"reported",l:"Trả KQ",tone:"ok"},{v:"positive",l:"Ác tính",tone:"crit"}],
    columns:[
      {key:"code",label:"Mã GPB",code:true,width:130},
      {key:"patient",label:"Bệnh nhân",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>{r.pid}</div></>},
      {key:"organ",label:"Cơ quan",width:120},
      {key:"type",label:"Loại mẫu",width:140},
      {key:"doctor",label:"BS chỉ định",width:160},
      {key:"received",label:"Nhận mẫu",render:r=>fmtDMYg(r.received),mono:true,width:100},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:120},
    ],
    rowKey:r=>r.code, searchKeys:["patient","pid","code","organ"], searchPlaceholder:"Tìm mẫu GPB...",
    actions:[{ic:"file",title:"KQ vi thể",onClick:r=>ti("Mở "+r.code)}],
    primaryAction:{label:"Nhận mẫu",ic:"plus",onClick:()=>ti("Form nhận mẫu GPB")},
  };
})();

// IVF LAB
window.IvfLabConfig = (() => {
  const data = _g4(28, i => {
    const s = ["ovulation","retrieval","fertilized","embryo","transfer","frozen"][i%6];
    return {
      cycle:"IVF-"+String(2401+i).padStart(5,"0"),
      pid:rndPid(), patient:rndName(i+1), partnerName:rndName(i+2),
      protocol:rndPick(["IVF","ICSI","IUI","FET"]),
      day:1+Math.floor(Math.random()*10),
      embryoQuality:rndPick(["1AA","2AA","2AB","3BB","—"]),
      doctor:"BS."+rndName(i).split(" ").pop(),
      _status:s, statusLbl:{ovulation:"Kích trứng",retrieval:"Chọc trứng",fertilized:"Thụ tinh",embryo:"Nuôi phôi",transfer:"Chuyển phôi",frozen:"Đông phôi"}[s],
      statusTone:{ovulation:"info",retrieval:"warn",fertilized:"focus",embryo:"info",transfer:"ok",frozen:"muted"}[s],
    };
  });
  return {
    title:"Phòng Lab IVF",
    kpis:[
      {lbl:"Chu kỳ đang chạy",val:data.length},
      {lbl:"Chuyển phôi/tháng",val:data.filter(r=>r._status==="transfer").length,tone:"ok"},
      {lbl:"Tỷ lệ phôi tốt",val:"68%",tone:"focus"},
      {lbl:"Tỷ lệ có thai",val:"42%",tone:"info"},
    ],
    statusTabs:[{v:"ovulation",l:"Kích trứng",tone:"info"},{v:"retrieval",l:"Chọc trứng",tone:"warn"},{v:"fertilized",l:"Thụ tinh",tone:"focus"},{v:"embryo",l:"Nuôi phôi",tone:"info"},{v:"transfer",l:"Chuyển phôi",tone:"ok"},{v:"frozen",l:"Đông",tone:"muted"}],
    columns:[
      {key:"cycle",label:"Mã chu kỳ",code:true,width:130},
      {key:"patient",label:"Cặp đôi",render:r=><><b>{r.patient}</b><div style={{fontSize:11,color:"var(--t-2)"}}>+ {r.partnerName}</div></>},
      {key:"protocol",label:"Phác đồ",mono:true,width:90},
      {key:"day",label:"Ngày",mono:true,width:70},
      {key:"embryoQuality",label:"Chất lượng phôi",mono:true,width:130},
      {key:"doctor",label:"BS điều trị",width:140},
      {key:"_status",label:"Trạng thái",render:r=>_statBadge(r.statusTone,r.statusLbl),width:130},
    ],
    rowKey:r=>r.cycle, searchKeys:["patient","partnerName","cycle"], searchPlaceholder:"Tìm chu kỳ IVF...",
    actions:[{ic:"file",title:"Mở chu kỳ",onClick:r=>ti("Mở "+r.cycle)}],
    primaryAction:{label:"Chu kỳ mới",ic:"plus",onClick:()=>ti("Form chu kỳ IVF")},
  };
})();
