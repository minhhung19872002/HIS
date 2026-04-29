// =====================================================================
// HIS Terminal · Module: ĐẶT LỊCH KHÁM (AppointmentBooking)
// Chuẩn lễ tân: stepper đặt mới · slot grid · drawer chi tiết · audit
// CRUD lịch BS · thống kê · bulk · in phiếu hẹn
// Dùng HUI (modal/drawer/confirm/toast), Ico, his-shell css.
// =====================================================================

const { useState, useEffect, useMemo, useRef } = React;

// ─── Helpers ─────────────────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2,"0");
const fmtD = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}`;
const fmtDY = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
const dow = ["CN","T2","T3","T4","T5","T6","T7"];
const today = new Date(2026, 9, 22); // 22/10/2026 — đồng bộ với chrome
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const phoneClean = (s) => (s||"").replace(/\D/g,"");
const toastInfo = (m) => HUI.toast(m, {tone:"info"});
const toastOk = (m) => HUI.toast(m, {tone:"ok"});
const toastErr = (m) => HUI.toast(m, {tone:"err"});

// ─── Reference data ──────────────────────────────────────────────────
const DEPTS = [
  { id:"D01", code:"TIM",  name:"Tim mạch",       fee:300000 },
  { id:"D02", code:"NTQ",  name:"Nội tổng quát",   fee:200000 },
  { id:"D03", code:"NHI",  name:"Nhi khoa",        fee:200000 },
  { id:"D04", code:"SAN",  name:"Sản phụ khoa",   fee:250000 },
  { id:"D05", code:"TMH",  name:"Tai mũi họng",    fee:200000 },
  { id:"D06", code:"MAT",  name:"Mắt",             fee:200000 },
  { id:"D07", code:"DA",   name:"Da liễu",         fee:200000 },
  { id:"D08", code:"CTCH", name:"Chấn thương CH",  fee:300000 },
  { id:"D09", code:"YHCT", name:"Y học cổ truyền", fee:180000 },
];

const DOCTORS = [
  { id:"BS01", title:"BS.CKII", name:"Phạm Hải Đăng",   dept:"D01", years:18, rating:4.9, fee:500000 },
  { id:"BS02", title:"TS.BS",   name:"Hoàng Mai Anh",   dept:"D01", years:15, rating:4.8, fee:450000 },
  { id:"BS03", title:"BS.CKI",  name:"Trần Lan Hương",  dept:"D04", years:12, rating:4.7, fee:400000 },
  { id:"BS04", title:"BS",      name:"Nguyễn Thanh Hoa",dept:"D03", years:8,  rating:4.6, fee:300000 },
  { id:"BS05", title:"BS.CKI",  name:"Lê Quang Tùng",   dept:"D05", years:10, rating:4.5, fee:300000 },
  { id:"BS06", title:"BS",      name:"Vũ Thị Bích",     dept:"D02", years:6,  rating:4.4, fee:250000 },
  { id:"BS07", title:"BS.CKII", name:"Đỗ Minh Tâm",     dept:"D02", years:20, rating:4.9, fee:500000 },
  { id:"BS08", title:"BS",      name:"Phạm Thị Mai",    dept:"D06", years:7,  rating:4.5, fee:300000 },
  { id:"BS09", title:"BS.CKI",  name:"Bùi Văn Cường",   dept:"D08", years:14, rating:4.6, fee:400000 },
  { id:"BS10", title:"BS",      name:"Lý Thu Trang",    dept:"D07", years:5,  rating:4.3, fee:280000 },
  { id:"BS11", title:"BS.CKII", name:"Nguyễn Thế Vinh", dept:"D09", years:22, rating:4.8, fee:450000 },
  { id:"BS12", title:"TS.BS",   name:"Cao Thanh Bình",  dept:"D01", years:19, rating:4.9, fee:600000 },
];

const ROOMS = ["P.201","P.203","P.205","P.207","P.305","P.310","P.402","P.404","P.501","P.503"];
const CHANNELS = [
  { v:"app",   l:"App di động", tone:"info" },
  { v:"web",   l:"Cổng dịch vụ", tone:"" },
  { v:"hot",   l:"Hotline", tone:"mag" },
  { v:"reception", l:"Lễ tân tại chỗ", tone:"ghost" },
  { v:"insurance", l:"Bảo hiểm", tone:"cy" },
];
const APPT_TYPES = ["Khám lần đầu","Tái khám","Tư vấn","Khám sức khoẻ","Khám theo yêu cầu","Cấp cứu hẹn"];
const STATUSES = [
  { v:0, l:"Chờ xác nhận", tone:"warn" },
  { v:1, l:"Đã xác nhận",  tone:"info" },
  { v:2, l:"Đã đến khám",  tone:"ok"   },
  { v:3, l:"Không đến",    tone:"crit" },
  { v:4, l:"Đã hủy",       tone:"ghost"},
  { v:5, l:"Đổi lịch",     tone:"mag"  },
];
const statusOf = (v) => STATUSES.find(s => s.v === v) || STATUSES[0];

// ─── Generate slot template per doctor ───────────────────────────────
// Mỗi BS có 2 ca/ngày, slot 30'. Tạo cho 14 ngày tới.
const buildSchedule = () => {
  const out = []; // {id, doctorId, dept, room, date, slots: [{time, capacity, booked}]}
  let sid = 1;
  for (let i=0; i<14; i++) {
    const d = addDays(today, i);
    DOCTORS.forEach((dr, idx) => {
      // BS làm việc 5/7 ngày, nghỉ T7 CN nếu lẻ idx
      const wd = d.getDay();
      if ((idx % 3 === 2) && (wd === 0 || wd === 6)) return;
      // Sáng + chiều
      ["AM","PM"].forEach((shift) => {
        if ((idx + i) % 7 === 3 && shift === "PM") return; // hôm trống chiều
        const start = shift === "AM" ? 8 : 13.5;
        const end   = shift === "AM" ? 11.5 : 17;
        const slots = [];
        for (let t = start; t < end; t += 0.5) {
          const hh = Math.floor(t), mm = (t - hh) * 60;
          slots.push({ time: `${pad2(hh)}:${pad2(mm)}`, capacity: 1, booked: 0 });
        }
        out.push({
          id: `SCH-${sid++}`,
          doctorId: dr.id,
          dept: dr.dept,
          room: ROOMS[(idx + i) % ROOMS.length],
          date: dateKey(d),
          dateObj: d,
          shift,
          startTime: slots[0].time,
          endTime: `${pad2(Math.floor(end))}:${pad2((end%1)*60)}`,
          slots,
          maxPatients: slots.length,
          isRecurring: idx < 4,
          isActive: true,
        });
      });
    });
  }
  return out;
};
const SCHEDULE = buildSchedule();

// ─── Generate 80+ bookings ───────────────────────────────────────────
const PATIENTS = [
  ["Nguyễn Thị Mai","0912345678","011298005678","Hưng Yên","F",1989],
  ["Trần Văn Kế","0982221112","011285003311","Hà Nội","M",1985],
  ["Lê Thị Hoa","0911223344","011291004422","Hưng Yên","F",1991],
  ["Phạm Văn Hưng","0977889900","011279008811","Hải Dương","M",1979],
  ["Vũ Thị Bích","0903334455","011295006677","Hưng Yên","F",1995],
  ["Đỗ Minh Tâm","0988776655","011280001122","Hà Nội","M",1980],
  ["Hoàng Thu Trang","0934567890","011294003344","Hưng Yên","F",1994],
  ["Bùi Đức Anh","0965432187","011273009988","Hải Phòng","M",1973],
  ["Cao Thị Lan","0978543210","011288002233","Hưng Yên","F",1988],
  ["Lý Văn Cường","0945678123","011268007766","Hà Nam","M",1968],
  ["Đinh Thị Nga","0923456712","011296005544","Hưng Yên","F",1996],
  ["Phan Hữu Long","0937812345","011281003322","Bắc Ninh","M",1981],
  ["Tô Thị Yến","0956789012","011290007788","Hưng Yên","F",1990],
  ["Ngô Văn Phong","0918765432","011275006655","Hà Nội","M",1975],
  ["Trịnh Thanh Hoa","0929876543","011293004411","Hưng Yên","F",1993],
  ["Hồ Văn Dũng","0987612345","011277008822","Hải Dương","M",1977],
  ["Đặng Thị Hằng","0934512876","011292001199","Hưng Yên","F",1992],
  ["Mai Văn Khánh","0967832145","011270002288","Bắc Giang","M",1970],
  ["Lưu Thị Phương","0945123876","011297005566","Hưng Yên","F",1997],
  ["Trương Hữu Tài","0978234561","011286003377","Hà Nội","M",1986],
  ["Quách Thị Vân","0956123487","011294008844","Hưng Yên","F",1994],
  ["Tạ Văn Bình","0918234576","011278001166","Hải Phòng","M",1978],
  ["Bạch Thị Liên","0929345671","011289007733","Hưng Yên","F",1989],
  ["Phùng Văn Tú","0987453621","011274004499","Bắc Ninh","M",1974],
  ["Đào Thị Hương","0934621587","011291006622","Hưng Yên","F",1991],
];

const reasonsByDept = {
  D01: ["Đau ngực, khó thở","Theo dõi tăng huyết áp","Tái khám sau đặt stent","Hồi hộp đánh trống ngực","Khám tiền phẫu"],
  D02: ["Đau bụng âm ỉ","Mệt mỏi, chán ăn","Sốt 38°5 trên 3 ngày","Khám tổng quát","Theo dõi tiểu đường type 2"],
  D03: ["Trẻ ho có đờm 5 ngày","Tiêu chảy cấp","Khám sàng lọc dinh dưỡng","Sốt cao co giật","Tiêm chủng"],
  D04: ["Khám thai 22 tuần","Khám phụ khoa định kỳ","Rong kinh kéo dài","Tư vấn tiền sản","Tái khám sau sinh"],
  D05: ["Đau họng, khàn tiếng","Ù tai một bên","Viêm xoang mạn","Chảy máu cam","Khám sàng lọc TMH"],
  D06: ["Mắt đỏ ngứa","Mờ mắt khi đọc","Đo khúc xạ","Tái khám đục thuỷ tinh thể","Khô mắt"],
  D07: ["Mẩn ngứa lan rộng","Mụn trứng cá nặng","Nấm da chân","Vảy nến tái phát","Soi da định kỳ"],
  D08: ["Đau lưng cấp","Đau khớp gối","Tái khám sau bó bột","Bong gân cổ chân","Đau cổ vai gáy"],
  D09: ["Châm cứu vai gáy","Đau lưng mạn","Mất ngủ kéo dài","Kết hợp YHCT-YHHĐ","Suy nhược cơ thể"],
};

const seed = (i) => ((i * 9301 + 49297) % 233280) / 233280;
const pick = (arr, i) => arr[Math.floor(seed(i) * arr.length)];

const buildBookings = () => {
  const out = [];
  let bid = 1;
  for (let i=0; i<92; i++) {
    const p = PATIENTS[i % PATIENTS.length];
    const dept = pick(DEPTS, i+1);
    const docList = DOCTORS.filter(d => d.dept === dept.id);
    const dr = docList[Math.floor(seed(i+5) * docList.length)] || DOCTORS[0];
    // ngày: phân bổ -2..+13
    const offset = Math.floor(seed(i+11) * 16) - 2;
    const d = addDays(today, offset);
    const hh = 8 + Math.floor(seed(i+13) * 9);
    const mm = Math.random() < 0.5 ? "00" : "30";
    const status =
      offset < 0 ? (seed(i+17) < 0.7 ? 2 : (seed(i+19) < 0.6 ? 3 : 4)) :
      offset === 0 ? (seed(i+21) < 0.4 ? 2 : (seed(i+23) < 0.6 ? 1 : 0)) :
      (seed(i+25) < 0.45 ? 1 : (seed(i+27) < 0.85 ? 0 : 4));
    const ch = pick(CHANNELS, i+3);
    const insurance = seed(i+31) < 0.6;
    const code = `APT-26${pad2(d.getMonth()+1)}${pad2(d.getDate())}-${pad2(bid % 100)}${pad2(i % 100)}`;
    bid++;
    const apptType = pick(APPT_TYPES, i+7);
    const reason = pick(reasonsByDept[dept.id] || ["Khám tổng quát"], i+9);
    out.push({
      code,
      patient: p[0], phone: p[1], cccd: p[2], addr: p[3], gender: p[4],
      yob: p[5], age: 2026 - p[5],
      apptDate: dateKey(d),
      apptDateObj: d,
      apptTime: `${pad2(hh)}:${mm}`,
      dept: dept.id, deptName: dept.name,
      doctorId: dr.id, doctorName: `${dr.title} ${dr.name}`,
      room: ROOMS[i % ROOMS.length],
      apptType,
      reason,
      status,
      channel: ch.v, channelLabel: ch.l, channelTone: ch.tone,
      insurance,
      insuranceNo: insurance ? `HS4${pad2((i*7)%99)}010${pad2((i*3)%99)}${pad2(i%99)}1` : null,
      fee: dr.fee + (apptType === "Khám theo yêu cầu" ? 200000 : 0),
      note: i % 5 === 0 ? "BN có tiền sử dị ứng penicillin" : (i % 7 === 3 ? "Yêu cầu BS chỉ định riêng" : ""),
      createdAt: addDays(d, -Math.floor(seed(i+33)*5)-1),
      bookedBy: ch.v === "reception" ? "Lễ tân Trần T. Hà" : (ch.v === "hot" ? "CSKH Phạm V. Long" : "Tự đặt"),
      audit: [], // sẽ dồn dưới
    });
  }
  // Audit theo status
  out.forEach((b,i) => {
    const t0 = b.createdAt;
    b.audit = [
      { ts: t0, who: b.bookedBy, msg: `Tạo lịch hẹn qua ${b.channelLabel}`, tone: "info" },
    ];
    if (b.status >= 1) b.audit.push({ ts: addDays(t0, 1), who: "Lễ tân Trần T. Hà", msg: `Xác nhận lịch hẹn · gửi SMS đến ${b.phone}`, tone: "ok" });
    if (b.status === 2) b.audit.push({ ts: b.apptDateObj, who: "Lễ tân Nguyễn V. An", msg: "Bệnh nhân đã check-in tại quầy", tone: "ok" });
    if (b.status === 3) b.audit.push({ ts: b.apptDateObj, who: "Hệ thống", msg: "Đánh dấu không đến (quá 30' lịch hẹn)", tone: "crit" });
    if (b.status === 4) b.audit.push({ ts: addDays(t0, 2), who: i % 2 === 0 ? "Bệnh nhân (App)" : "Lễ tân Trần T. Hà", msg: i % 2 === 0 ? "Bệnh nhân hủy qua App" : "Hủy theo yêu cầu BN qua hotline", tone: "warn" });
  });
  return out.sort((a,b) => (a.apptDate+a.apptTime).localeCompare(b.apptDate+b.apptTime));
};
const ALL_BOOKINGS = buildBookings();

// ─── Stats ───────────────────────────────────────────────────────────
const calcStats = (bookings, dateStr) => {
  const dayB = bookings.filter(b => b.apptDate === dateStr);
  const wkStart = (() => { const d = new Date(dateStr); const x = new Date(d); x.setDate(d.getDate() - d.getDay()); return x; })();
  const wkEnd = addDays(wkStart, 6);
  const inWk = (b) => b.apptDateObj >= wkStart && b.apptDateObj <= wkEnd;
  const wkB = bookings.filter(inWk);
  const total = bookings.length;
  const byStatus = STATUSES.map(s => ({ ...s, n: bookings.filter(b => b.status === s.v).length }));
  const byDept = DEPTS.map(d => ({ ...d, n: bookings.filter(b => b.dept === d.id).length })).sort((a,b)=>b.n-a.n);
  const byChannel = CHANNELS.map(c => ({ ...c, n: bookings.filter(b => b.channel === c.v).length }));
  const noShow = bookings.filter(b => b.status === 3).length;
  const attended = bookings.filter(b => b.status === 2).length;
  const noShowRate = (noShow + attended) > 0 ? Math.round(noShow / (noShow + attended) * 100) : 0;
  return { total, dayCount: dayB.length, wkCount: wkB.length, byStatus, byDept, byChannel, noShow, attended, noShowRate };
};

// ─── Slot grid for 1 doctor 1 day ────────────────────────────────────
const slotsForDoctorDate = (doctorId, date) => {
  const sch = SCHEDULE.filter(s => s.doctorId === doctorId && s.date === date);
  if (sch.length === 0) return null;
  const merged = [];
  sch.forEach(s => s.slots.forEach(sl => merged.push({ ...sl, shift: s.shift, room: s.room })));
  // Đánh dấu booked theo dataset
  ALL_BOOKINGS.forEach(b => {
    if (b.doctorId === doctorId && b.apptDate === date && b.status !== 4) {
      const sl = merged.find(m => m.time === b.apptTime);
      if (sl) sl.booked = 1;
    }
  });
  return merged;
};

// =====================================================================
// MAIN
// =====================================================================
const ApptBooking = () => {
  const [bookings, setBookings] = useState(ALL_BOOKINGS);
  const [tab, setTab] = useState("bookings"); // bookings | schedules | stats
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selRows, setSelRows] = useState(new Set());
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // ──── Computed ────
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusTab !== "all" && b.status !== Number(statusTab)) return false;
      if (filterDept && b.dept !== filterDept) return false;
      if (filterDoctor && b.doctorId !== filterDoctor) return false;
      if (filterChannel && b.channel !== filterChannel) return false;
      if (filterDate && b.apptDate < filterDate) return false;
      if (filterDateTo && b.apptDate > filterDateTo) return false;
      if (search) {
        const s = search.toLowerCase();
        const blob = `${b.code} ${b.patient} ${b.phone} ${b.cccd} ${b.doctorName} ${b.deptName} ${b.reason}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [bookings, statusTab, filterDept, filterDoctor, filterChannel, filterDate, filterDateTo, search]);

  const paged = filtered.slice(page * pageSize, (page+1)*pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const stats = useMemo(() => calcStats(bookings, dateKey(today)), [bookings]);

  const tabCounts = useMemo(() => {
    const m = { all: bookings.length };
    STATUSES.forEach(s => m[s.v] = bookings.filter(b => b.status === s.v).length);
    return m;
  }, [bookings]);

  // ──── Mutators ────
  const updateBooking = (code, patch, auditMsg, auditTone="info") => {
    setBookings(prev => prev.map(b => {
      if (b.code !== code) return b;
      const nb = { ...b, ...patch };
      if (auditMsg) {
        nb.audit = [...b.audit, { ts: new Date(), who: "Lễ tân Trần T. Hà (đang đăng nhập)", msg: auditMsg, tone: auditTone }];
      }
      return nb;
    }));
  };

  const addBooking = (b) => {
    const code = `APT-26${pad2(b.apptDateObj.getMonth()+1)}${pad2(b.apptDateObj.getDate())}-${pad2(Math.floor(Math.random()*9000)+1000)}`;
    const newB = {
      ...b,
      code,
      status: 1, // Đặt qua lễ tân = xác nhận luôn
      createdAt: new Date(),
      bookedBy: "Lễ tân Trần T. Hà",
      audit: [
        { ts: new Date(), who: "Lễ tân Trần T. Hà", msg: `Tạo lịch hẹn qua ${b.channelLabel}`, tone: "info" },
        { ts: new Date(), who: "Hệ thống", msg: `Tự động xác nhận · gửi SMS đến ${b.phone}`, tone: "ok" },
      ],
    };
    setBookings(prev => [newB, ...prev]);
    return newB;
  };

  // ──── Actions ────
  const onConfirm = (b) => updateBooking(b.code, { status: 1 }, `Xác nhận lịch hẹn · gửi SMS đến ${b.phone}`, "ok");
  const onCheckin = (b) => updateBooking(b.code, { status: 2 }, "Bệnh nhân đã check-in tại quầy", "ok");
  const onNoShow  = (b) => HUI.confirm({ title:"Đánh dấu không đến?", body:<>Bệnh nhân <b>{b.patient}</b> sẽ bị đánh dấu <b>không đến</b>. Có thể ảnh hưởng đến tỉ lệ no-show của BS.</>, danger:true, confirmText:"Xác nhận no-show", onConfirm: () => { updateBooking(b.code, { status: 3 }, "Đánh dấu không đến (lễ tân)", "crit"); toastOk("Đã đánh dấu không đến"); } });
  const onCancel  = (b) => openCancelModal(b);
  const onReschedule = (b) => openReschedModal(b);
  const onPrint = (b) => openPrintModal(b);
  const onSMS  = (b) => { HUI.toast(`Đã gửi SMS nhắc lịch đến ${b.phone}`, {tone:"ok"}); updateBooking(b.code, {}, `Gửi SMS nhắc lịch đến ${b.phone}`, "info"); };

  const onBulkConfirm = () => {
    const arr = [...selRows];
    if (arr.length === 0) return toastErr("Chưa chọn lịch nào");
    HUI.confirm({
      title:`Duyệt ${arr.length} lịch hẹn?`,
      body:`Hệ thống sẽ chuyển sang trạng thái "Đã xác nhận" và gửi SMS xác nhận tới bệnh nhân.`,
      confirmText:"Duyệt hàng loạt",
      onConfirm: () => {
        arr.forEach(code => updateBooking(code, {status:1}, "Duyệt hàng loạt", "ok"));
        setSelRows(new Set());
        toastOk(`Đã duyệt ${arr.length} lịch hẹn`);
      }
    });
  };
  const onBulkSMS = () => {
    const arr = [...selRows];
    if (arr.length === 0) return toastErr("Chưa chọn lịch nào");
    arr.forEach(code => updateBooking(code, {}, "Gửi SMS nhắc lịch hàng loạt", "info"));
    toastOk(`Đã gửi SMS đến ${arr.length} bệnh nhân`);
  };

  const onResetFilter = () => { setSearch(""); setFilterDept(""); setFilterDoctor(""); setFilterChannel(""); setFilterDate(""); setFilterDateTo(""); setStatusTab("all"); setPage(0); };

  const onExport = () => {
    const header = "Mã,Ngày,Giờ,Bệnh nhân,SĐT,Khoa,Bác sĩ,Loại,Kênh,Trạng thái\n";
    const rows = filtered.map(b => `${b.code},${b.apptDate},${b.apptTime},${b.patient},${b.phone},${b.deptName},${b.doctorName},${b.apptType},${b.channelLabel},${statusOf(b.status).l}`).join("\n");
    const blob = new Blob([header+rows], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `lich-hen-${dateKey(today)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toastOk(`Đã xuất ${filtered.length} dòng`);
  };

  // ──── Modal openers ────
  const openNewBookingModal = () => HUI.open((cx) => <NewBookingWizard cx={cx} onSubmit={(b) => { const nb = addBooking(b); cx(); openDetailDrawer(nb); }} />);
  const openDetailDrawer = (b) => HUI.drawer((cx) => <BookingDrawer b={b} cx={cx} bookings={bookings} onConfirm={onConfirm} onCheckin={onCheckin} onNoShow={onNoShow} onCancel={onCancel} onReschedule={onReschedule} onPrint={onPrint} onSMS={onSMS} />);
  const openCancelModal = (b) => HUI.open((cx) => <CancelModal b={b} cx={cx} onSubmit={(reason) => { updateBooking(b.code, {status:4}, `Hủy lịch · lý do: ${reason}`, "warn"); cx(); toastOk("Đã hủy lịch hẹn"); }} />);
  const openReschedModal = (b) => HUI.open((cx) => <ReschedModal b={b} cx={cx} onSubmit={(newDate, newTime, reason) => { updateBooking(b.code, {apptDate:newDate, apptTime:newTime, status:1, apptDateObj: new Date(newDate)}, `Đổi lịch sang ${newDate} ${newTime} · ${reason}`, "mag"); cx(); toastOk("Đã đổi lịch"); } } />);
  const openPrintModal = (b) => HUI.open((cx) => <PrintModal b={b} cx={cx} />);
  const openLookupModal = () => HUI.open((cx) => <LookupModal cx={cx} bookings={bookings} onOpen={(b) => { cx(); openDetailDrawer(b); }} />);
  const openSchedFormModal = (s) => HUI.open((cx) => <SchedFormModal s={s} cx={cx} onSubmit={() => { cx(); toastOk(s ? "Đã cập nhật lịch BS" : "Đã tạo lịch BS"); }} />);

  return (
    <div className="ab">
      {/* KPI strip */}
      <div className="ab-kpis">
        <Kpi lbl="Lịch hẹn hôm nay" val={stats.dayCount} sub={`${stats.byStatus.find(s=>s.v===0)?.n||0} chờ duyệt`} />
        <Kpi lbl="Tuần này" val={stats.wkCount} sub="22-28/10" />
        <Kpi lbl="Đã đến khám" val={stats.attended} tone="ok" />
        <Kpi lbl="No-show" val={stats.noShow} sub={`${stats.noShowRate}% tỉ lệ`} tone={stats.noShowRate > 15 ? "crit" : "warn"} />
        <Kpi lbl="Slot trống tuần này" val={SCHEDULE.filter(s => s.dateObj >= today && s.dateObj <= addDays(today, 6)).reduce((acc, s) => acc + s.slots.filter(sl => sl.booked === 0).length, 0)} />
        <Kpi lbl="Đặt qua App" val={stats.byChannel.find(c=>c.v==="app")?.n || 0} sub={`${Math.round((stats.byChannel.find(c=>c.v==="app")?.n||0)/stats.total*100)}%`} tone="info"/>
      </div>

      {/* Top tabs */}
      <div className="ab-toptabs">
        <button className={tab==="bookings"?"on":""} onClick={()=>setTab("bookings")}><Ico name="calendar" size={13}/> Lịch hẹn</button>
        <button className={tab==="schedules"?"on":""} onClick={()=>setTab("schedules")}><Ico name="users" size={13}/> Lịch bác sĩ</button>
        <button className={tab==="stats"?"on":""} onClick={()=>setTab("stats")}><Ico name="chart" size={13}/> Thống kê</button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={openLookupModal}><Ico name="search" size={12}/> Tra cứu mã hẹn</button>
        <button className="ab-btn primary" onClick={openNewBookingModal}><Ico name="plus" size={12}/> Đặt lịch mới <kbd>F2</kbd></button>
      </div>

      {tab === "bookings" && (
        <BookingsTab
          filtered={filtered}
          paged={paged}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          tabCounts={tabCounts}
          statusTab={statusTab}
          setStatusTab={(t) => { setStatusTab(t); setPage(0); }}
          search={search} setSearch={(s)=>{ setSearch(s); setPage(0); }}
          filterDept={filterDept} setFilterDept={(v)=>{ setFilterDept(v); setFilterDoctor(""); setPage(0); }}
          filterDoctor={filterDoctor} setFilterDoctor={(v)=>{ setFilterDoctor(v); setPage(0); }}
          filterChannel={filterChannel} setFilterChannel={(v)=>{ setFilterChannel(v); setPage(0); }}
          filterDate={filterDate} setFilterDate={setFilterDate}
          filterDateTo={filterDateTo} setFilterDateTo={setFilterDateTo}
          selRows={selRows} setSelRows={setSelRows}
          onResetFilter={onResetFilter}
          onExport={onExport}
          onBulkConfirm={onBulkConfirm}
          onBulkSMS={onBulkSMS}
          openDetail={openDetailDrawer}
          onConfirm={onConfirm} onCheckin={onCheckin} onNoShow={onNoShow} onCancel={onCancel} onReschedule={onReschedule} onPrint={onPrint}
        />
      )}

      {tab === "schedules" && <SchedulesTab onAdd={() => openSchedFormModal(null)} onEdit={openSchedFormModal} />}

      {tab === "stats" && <StatsTab stats={stats} bookings={bookings} />}
    </div>
  );
};

// ─── KPI cell ────
const Kpi = ({ lbl, val, sub, tone }) => (
  <div className={`ab-kpi ${tone||""}`}>
    <div className="lbl">{lbl}</div>
    <div className="val">{val}</div>
    {sub && <div className="sub">{sub}</div>}
  </div>
);

// =====================================================================
// TAB 1: Bookings
// =====================================================================
const BookingsTab = (p) => {
  const allChecked = p.paged.length > 0 && p.paged.every(b => p.selRows.has(b.code));
  const someChecked = p.selRows.size > 0;
  const toggleAll = () => {
    const next = new Set(p.selRows);
    if (allChecked) p.paged.forEach(b => next.delete(b.code));
    else p.paged.forEach(b => next.add(b.code));
    p.setSelRows(next);
  };
  const toggleOne = (code) => {
    const next = new Set(p.selRows);
    next.has(code) ? next.delete(code) : next.add(code);
    p.setSelRows(next);
  };

  const docOptions = p.filterDept ? DOCTORS.filter(d => d.dept === p.filterDept) : DOCTORS;

  return (
    <div className="ab-pane">
      {/* Status sub-tabs */}
      <div className="ab-stab">
        <button className={p.statusTab==="all"?"on":""} onClick={()=>p.setStatusTab("all")}>Tất cả <i>{p.tabCounts.all}</i></button>
        {STATUSES.map(s => (
          <button key={s.v} className={p.statusTab===String(s.v)?"on":""} onClick={()=>p.setStatusTab(String(s.v))}>
            <span className={`ab-dot ${s.tone}`}/> {s.l} <i>{p.tabCounts[s.v]}</i>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="ab-toolbar">
        <div className="ab-search">
          <Ico name="search" size={13}/>
          <input placeholder="Tìm mã hẹn, tên BN, SĐT, CCCD…" value={p.search} onChange={e=>p.setSearch(e.target.value)} />
          {p.search && <button onClick={()=>p.setSearch("")}><Ico name="x" size={11}/></button>}
        </div>
        <select className="ab-sel" value={p.filterDept} onChange={e=>p.setFilterDept(e.target.value)}>
          <option value="">▾ Tất cả khoa</option>
          {DEPTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="ab-sel" value={p.filterDoctor} onChange={e=>p.setFilterDoctor(e.target.value)}>
          <option value="">▾ Tất cả bác sĩ</option>
          {docOptions.map(d => <option key={d.id} value={d.id}>{d.title} {d.name}</option>)}
        </select>
        <select className="ab-sel" value={p.filterChannel} onChange={e=>p.setFilterChannel(e.target.value)}>
          <option value="">▾ Tất cả kênh</option>
          {CHANNELS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <input type="date" className="ab-date" value={p.filterDate} onChange={e=>p.setFilterDate(e.target.value)} />
        <span className="ab-sep">→</span>
        <input type="date" className="ab-date" value={p.filterDateTo} onChange={e=>p.setFilterDateTo(e.target.value)} />
        <button className="ab-btn ghost" onClick={p.onResetFilter}><Ico name="rotate" size={12}/> Bỏ lọc</button>
        <span className="spacer"/>
        <button className="ab-btn ghost" onClick={p.onExport} title="Xuất CSV"><Ico name="download" size={12}/> Xuất</button>
      </div>

      {/* Bulk bar */}
      {someChecked && (
        <div className="ab-bulk">
          <Ico name="check" size={13}/> Đã chọn <b>{p.selRows.size}</b> lịch hẹn
          <span className="spacer"/>
          <button className="ab-btn primary" onClick={p.onBulkConfirm}>✓ Duyệt hàng loạt</button>
          <button className="ab-btn" onClick={p.onBulkSMS}><Ico name="bell" size={12}/> Gửi SMS</button>
          <button className="ab-btn ghost" onClick={()=>p.setSelRows(new Set())}>Bỏ chọn</button>
        </div>
      )}

      {/* Table */}
      <div className="ab-tbl-wrap">
        <table className="ab-tbl">
          <thead>
            <tr>
              <th className="ck"><input type="checkbox" checked={allChecked} ref={el => el && (el.indeterminate = !allChecked && someChecked)} onChange={toggleAll}/></th>
              <th>Mã hẹn</th>
              <th>Bệnh nhân</th>
              <th>Thời điểm</th>
              <th>Khoa · Bác sĩ</th>
              <th>Loại · Lý do</th>
              <th>Kênh</th>
              <th>Trạng thái</th>
              <th>BHYT</th>
              <th className="act">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {p.paged.map(b => (
              <tr key={b.code} className={p.selRows.has(b.code)?"on":""}>
                <td className="ck"><input type="checkbox" checked={p.selRows.has(b.code)} onChange={()=>toggleOne(b.code)} onClick={e=>e.stopPropagation()}/></td>
                <td className="mono code" onClick={()=>p.openDetail(b)}>{b.code}</td>
                <td onClick={()=>p.openDetail(b)}>
                  <div className="cell-2l">
                    <b>{b.patient}</b>
                    <i>{b.phone} · {b.gender==="F"?"Nữ":"Nam"} · {b.age}t</i>
                  </div>
                </td>
                <td className="mono" onClick={()=>p.openDetail(b)}>
                  <div className="cell-2l">
                    <b>{fmtD(b.apptDateObj)}</b>
                    <i>{b.apptTime} · {dow[b.apptDateObj.getDay()]}</i>
                  </div>
                </td>
                <td onClick={()=>p.openDetail(b)}>
                  <div className="cell-2l">
                    <b>{b.deptName}</b>
                    <i>{b.doctorName}</i>
                  </div>
                </td>
                <td onClick={()=>p.openDetail(b)}>
                  <div className="cell-2l">
                    <b>{b.apptType}</b>
                    <i className="trim">{b.reason}</i>
                  </div>
                </td>
                <td onClick={()=>p.openDetail(b)}><span className={`chip ${b.channelTone||"ghost"}`}>{b.channelLabel}</span></td>
                <td onClick={()=>p.openDetail(b)}><span className={`ab-stat ${statusOf(b.status).tone}`}><span className={`ab-dot ${statusOf(b.status).tone}`}/> {statusOf(b.status).l}</span></td>
                <td onClick={()=>p.openDetail(b)}>{b.insurance ? <span className="chip ok mono">{b.insuranceNo}</span> : <span style={{color:"var(--t-3)"}}>—</span>}</td>
                <td className="act">
                  <RowActions b={b} onConfirm={p.onConfirm} onCheckin={p.onCheckin} onNoShow={p.onNoShow} onCancel={p.onCancel} onReschedule={p.onReschedule} onPrint={p.onPrint} />
                </td>
              </tr>
            ))}
            {p.paged.length === 0 && (
              <tr><td colSpan={10}><div className="ab-empty"><Ico name="search" size={20}/><div>Không tìm thấy lịch hẹn nào.</div><button className="ab-btn ghost" onClick={p.onResetFilter}>Bỏ tất cả bộ lọc</button></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="ab-tbl-ft">
        <span>Tổng <b>{p.filtered.length}</b> lịch hẹn · trang <b>{p.page+1}/{p.totalPages}</b></span>
        <span className="spacer"/>
        <button className="ab-btn sm" disabled={p.page===0} onClick={()=>p.setPage(0)}>«</button>
        <button className="ab-btn sm" disabled={p.page===0} onClick={()=>p.setPage(p.page-1)}>‹</button>
        <button className="ab-btn sm" disabled={p.page>=p.totalPages-1} onClick={()=>p.setPage(p.page+1)}>›</button>
        <button className="ab-btn sm" disabled={p.page>=p.totalPages-1} onClick={()=>p.setPage(p.totalPages-1)}>»</button>
      </div>
    </div>
  );
};

const RowActions = ({ b, onConfirm, onCheckin, onNoShow, onCancel, onReschedule, onPrint }) => {
  const stop = (e) => e.stopPropagation();
  return (
    <div className="ab-actions" onClick={stop}>
      {b.status === 0 && <button className="ab-iconbtn ok" title="Xác nhận" onClick={()=>onConfirm(b)}><Ico name="check" size={12}/></button>}
      {b.status <= 1 && <button className="ab-iconbtn" title="Check-in" onClick={()=>onCheckin(b)}><Ico name="login" size={12}/></button>}
      {b.status <= 1 && <button className="ab-iconbtn" title="Đổi lịch" onClick={()=>onReschedule(b)}><Ico name="rotate" size={12}/></button>}
      <button className="ab-iconbtn" title="In phiếu hẹn" onClick={()=>onPrint(b)}><Ico name="print" size={12}/></button>
      {b.status <= 1 && <button className="ab-iconbtn warn" title="Không đến" onClick={()=>onNoShow(b)}><Ico name="alert" size={12}/></button>}
      {b.status <= 1 && <button className="ab-iconbtn crit" title="Hủy" onClick={()=>onCancel(b)}><Ico name="x" size={12}/></button>}
    </div>
  );
};

// =====================================================================
// TAB 2: Doctor schedules
// =====================================================================
const SchedulesTab = ({ onAdd, onEdit }) => {
  const [filterDept, setFilterDept] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const list = useMemo(() => {
    return SCHEDULE.filter(s => s.dateObj >= today && s.dateObj <= addDays(today, 13))
      .filter(s => !filterDept || s.dept === filterDept)
      .filter(s => !filterDoctor || s.doctorId === filterDoctor)
      .sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [filterDept, filterDoctor]);

  return (
    <div className="ab-pane">
      <div className="ab-toolbar">
        <select className="ab-sel" value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
          <option value="">▾ Tất cả khoa</option>
          {DEPTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="ab-sel" value={filterDoctor} onChange={e=>setFilterDoctor(e.target.value)}>
          <option value="">▾ Tất cả bác sĩ</option>
          {DOCTORS.map(d => <option key={d.id} value={d.id}>{d.title} {d.name}</option>)}
        </select>
        <span className="spacer"/>
        <button className="ab-btn primary" onClick={onAdd}><Ico name="plus" size={12}/> Thêm lịch BS</button>
      </div>

      <div className="ab-tbl-wrap">
        <table className="ab-tbl">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Bác sĩ</th>
              <th>Khoa</th>
              <th>Phòng</th>
              <th>Ca</th>
              <th>Đã đặt / Tối đa</th>
              <th>Lặp</th>
              <th>Trạng thái</th>
              <th className="act">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {list.map(s => {
              const dr = DOCTORS.find(d => d.id === s.doctorId);
              const dep = DEPTS.find(d => d.id === s.dept);
              const booked = s.slots.filter(sl => sl.booked > 0).length;
              return (
                <tr key={s.id}>
                  <td className="mono"><b>{fmtD(s.dateObj)}</b> <span style={{color:"var(--t-3)"}}>{dow[s.dateObj.getDay()]}</span></td>
                  <td><b>{dr?.title} {dr?.name}</b></td>
                  <td>{dep?.name}</td>
                  <td className="mono">{s.room}</td>
                  <td className="mono">{s.startTime} - {s.endTime} <span className={`chip ${s.shift==="AM"?"info":"mag"}`}>{s.shift==="AM"?"Sáng":"Chiều"}</span></td>
                  <td>
                    <div className="ab-prog">
                      <div className={`bar ${booked>=s.maxPatients?"full":booked/s.maxPatients>0.7?"warn":"ok"}`} style={{width: `${booked/s.maxPatients*100}%`}}/>
                      <span>{booked}/{s.maxPatients}</span>
                    </div>
                  </td>
                  <td>{s.isRecurring ? <span className="chip cy">Lặp</span> : <span style={{color:"var(--t-3)"}}>—</span>}</td>
                  <td>{s.isActive ? <span className="ab-stat ok"><span className="ab-dot ok"/> Hoạt động</span> : <span className="ab-stat ghost"><span className="ab-dot"/> Tạm nghỉ</span>}</td>
                  <td className="act">
                    <div className="ab-actions">
                      <button className="ab-iconbtn" title="Sửa" onClick={()=>onEdit(s)}><Ico name="edit" size={12}/></button>
                      <button className="ab-iconbtn crit" title="Xoá" onClick={()=>HUI.confirm({title:"Xoá lịch này?", body:`Lịch ngày ${fmtDY(s.dateObj)} của ${dr?.name} sẽ bị xoá.`, danger:true, confirmText:"Xoá", onConfirm: () => toastOk("Đã xoá lịch BS")})}><Ico name="trash" size={12}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ab-tbl-ft"><span>Tổng <b>{list.length}</b> ca làm việc trong 14 ngày tới</span></div>
    </div>
  );
};

// =====================================================================
// TAB 3: Stats
// =====================================================================
const StatsTab = ({ stats, bookings }) => {
  // Trend 7 ngày
  const trend = useMemo(() => {
    const arr = [];
    for (let i = -6; i <= 0; i++) {
      const d = addDays(today, i);
      const k = dateKey(d);
      const day = bookings.filter(b => b.apptDate === k);
      arr.push({
        d, k,
        total: day.length,
        attended: day.filter(b=>b.status===2).length,
        noshow: day.filter(b=>b.status===3).length,
        cancel: day.filter(b=>b.status===4).length,
      });
    }
    return arr;
  }, [bookings]);
  const max = Math.max(...trend.map(t => t.total), 10);

  return (
    <div className="ab-pane stats">
      <div className="ab-stat-grid">
        <div className="ab-stat-card big">
          <div className="h">Phân bổ trạng thái — toàn bộ {bookings.length} lịch</div>
          <div className="b">
            {stats.byStatus.map(s => (
              <div key={s.v} className="ab-stat-row">
                <span className={`ab-dot ${s.tone}`}/> 
                <span className="lbl">{s.l}</span>
                <span className="bar"><span className={s.tone} style={{width: `${s.n/bookings.length*100}%`}}/></span>
                <span className="num">{s.n}</span>
                <span className="pct">{Math.round(s.n/bookings.length*100)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ab-stat-card">
          <div className="h">Theo kênh đặt</div>
          <div className="b">
            {stats.byChannel.map(c => (
              <div key={c.v} className="ab-stat-row">
                <span className={`chip ${c.tone||"ghost"}`}>{c.l}</span>
                <span className="bar"><span className={c.tone||""} style={{width: `${c.n/bookings.length*100}%`}}/></span>
                <span className="num">{c.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ab-stat-card big">
          <div className="h">Top khoa</div>
          <div className="b">
            {stats.byDept.slice(0,9).map(d => (
              <div key={d.id} className="ab-stat-row">
                <span className="lbl">{d.name}</span>
                <span className="bar"><span style={{width: `${d.n/stats.byDept[0].n*100}%`, background:"var(--a-cy)"}}/></span>
                <span className="num">{d.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ab-stat-card big trend">
          <div className="h">Xu hướng 7 ngày qua</div>
          <div className="b">
            <div className="ab-trend">
              {trend.map((t,i) => (
                <div key={i} className="col">
                  <div className="bars">
                    <div className="b ok" style={{height: `${t.attended/max*100}%`}} title={`Đã khám: ${t.attended}`}/>
                    <div className="b crit" style={{height: `${t.noshow/max*100}%`}} title={`No-show: ${t.noshow}`}/>
                    <div className="b warn" style={{height: `${t.cancel/max*100}%`}} title={`Hủy: ${t.cancel}`}/>
                  </div>
                  <div className="lbl">{fmtD(t.d)}</div>
                  <div className="num">{t.total}</div>
                </div>
              ))}
            </div>
            <div className="lg">
              <span><span className="d ok"/>Đã đến khám</span>
              <span><span className="d crit"/>No-show</span>
              <span><span className="d warn"/>Hủy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// MODAL: New Booking Wizard (4 steps)
// =====================================================================
const NewBookingWizard = ({ cx, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    patient: "", phone: "", cccd: "", yob: "", gender: "F", addr: "Hưng Yên",
    insurance: false, insuranceNo: "",
    dept: "", doctorId: "",
    apptDate: "", apptTime: "", room: "",
    apptType: "Khám lần đầu",
    reason: "",
    note: "",
    channel: "reception", channelLabel: "Lễ tân tại chỗ", channelTone: "ghost",
  });
  const [errors, setErrors] = useState({});

  const upd = (k, v) => setData(d => ({ ...d, [k]: v }));

  // Step validation
  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!data.patient) e.patient = "Bắt buộc";
      if (!data.phone || phoneClean(data.phone).length < 10) e.phone = "SĐT không hợp lệ";
      if (!data.yob || data.yob < 1900 || data.yob > 2026) e.yob = "Năm sinh không hợp lệ";
      if (data.insurance && !data.insuranceNo) e.insuranceNo = "Nhập số thẻ BHYT";
    }
    if (step === 2) {
      if (!data.dept) e.dept = "Chọn khoa";
      if (!data.doctorId) e.doctorId = "Chọn bác sĩ";
    }
    if (step === 3) {
      if (!data.apptDate || !data.apptTime) e.slot = "Chọn slot";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s+1); };
  const prev = () => setStep(s => Math.max(1, s-1));
  const submit = () => {
    const dr = DOCTORS.find(d => d.id === data.doctorId);
    const dep = DEPTS.find(d => d.id === data.dept);
    const apptDateObj = new Date(data.apptDate);
    onSubmit({
      ...data,
      age: 2026 - Number(data.yob),
      apptDateObj,
      doctorName: `${dr.title} ${dr.name}`,
      deptName: dep.name,
      fee: dr.fee + (data.apptType === "Khám theo yêu cầu" ? 200000 : 0),
    });
  };

  // Existing patient lookup
  const [lookupPhone, setLookupPhone] = useState("");
  const onLookup = () => {
    const found = PATIENTS.find(p => p[1] === lookupPhone);
    if (found) {
      setData(d => ({ ...d, patient:found[0], phone:found[1], cccd:found[2], addr:found[3], gender:found[4], yob:found[5] }));
      toastOk("Đã tìm thấy bệnh nhân");
    } else {
      toastErr("Không tìm thấy · vui lòng nhập mới");
    }
  };

  const dr = DOCTORS.find(d => d.id === data.doctorId);
  const dep = DEPTS.find(d => d.id === data.dept);

  return (
    <HUI.Modal title="Đặt lịch khám mới" sub={`Bước ${step}/4`} size="lg" onClose={cx}
      footer={<>
        {step > 1 && <HUI.Btn variant="ghost" onClick={prev}><Ico name="chev-l" size={12}/> Quay lại</HUI.Btn>}
        <span style={{flex:1}}/>
        <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
        {step < 4 && <HUI.Btn variant="primary" onClick={next}>Tiếp tục <Ico name="chev-r" size={12}/></HUI.Btn>}
        {step === 4 && <HUI.Btn variant="primary" icon="check" onClick={submit}>Tạo lịch hẹn</HUI.Btn>}
      </>}>
      {/* Stepper */}
      <div className="hui-stepper">
        {[
          [1,"Bệnh nhân"],
          [2,"Khoa & Bác sĩ"],
          [3,"Chọn slot"],
          [4,"Xác nhận"],
        ].map(([n, lbl], i, arr) => (
          <React.Fragment key={n}>
            <div className={`step ${step === n ? "on" : step > n ? "done" : ""}`}>
              <span className="n">{step > n ? <Ico name="check" size={11}/> : n}</span>
              <span>{lbl}</span>
            </div>
            {i < arr.length-1 && <span className="sep"/>}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="wiz">
          <div className="wiz-section">
            <div className="wiz-section-h"><Ico name="search" size={13}/> Tìm bệnh nhân đã có</div>
            <div className="wiz-row" style={{gridTemplateColumns:"1fr auto"}}>
              <input className="hui-inp" placeholder="Nhập SĐT để tra cứu (vd: 0912345678)" value={lookupPhone} onChange={e=>setLookupPhone(e.target.value)}/>
              <HUI.Btn variant="soft" onClick={onLookup}><Ico name="search" size={12}/> Tra cứu</HUI.Btn>
            </div>
            <div className="wiz-hint">Hoặc nhập mới thông tin bên dưới</div>
          </div>
          <div className="wiz-row" style={{gridTemplateColumns:"2fr 1fr 1fr"}}>
            <HUI.Field label="Họ & tên" required error={errors.patient}>
              <HUI.Input placeholder="Vd: Nguyễn Thị Mai" value={data.patient} onChange={e=>upd("patient", e.target.value)}/>
            </HUI.Field>
            <HUI.Field label="Số ĐT" required error={errors.phone}>
              <HUI.Input placeholder="0xxxxxxxxx" value={data.phone} onChange={e=>upd("phone", e.target.value)}/>
            </HUI.Field>
            <HUI.Field label="Năm sinh" required error={errors.yob}>
              <HUI.Input type="number" placeholder="1990" value={data.yob} onChange={e=>upd("yob", e.target.value)}/>
            </HUI.Field>
          </div>
          <div className="wiz-row" style={{gridTemplateColumns:"1fr 1fr 2fr"}}>
            <HUI.Field label="Giới tính">
              <HUI.Select options={[{value:"F",label:"Nữ"},{value:"M",label:"Nam"}]} value={data.gender} onChange={e=>upd("gender", e.target.value)}/>
            </HUI.Field>
            <HUI.Field label="CCCD/CMND">
              <HUI.Input placeholder="012345678901" value={data.cccd} onChange={e=>upd("cccd", e.target.value)}/>
            </HUI.Field>
            <HUI.Field label="Địa chỉ">
              <HUI.Input placeholder="Tỉnh/TP" value={data.addr} onChange={e=>upd("addr", e.target.value)}/>
            </HUI.Field>
          </div>
          <div className="wiz-section" style={{marginTop:14}}>
            <div className="wiz-section-h">BHYT</div>
            <HUI.Chk label="Bệnh nhân có thẻ BHYT" checked={data.insurance} onChange={v=>upd("insurance", v)}/>
            {data.insurance && (
              <div style={{marginTop:10}}>
                <HUI.Field label="Số thẻ BHYT" required error={errors.insuranceNo}>
                  <HUI.Input placeholder="HS4..." value={data.insuranceNo} onChange={e=>upd("insuranceNo", e.target.value)}/>
                </HUI.Field>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wiz">
          <div className="wiz-row" style={{gridTemplateColumns:"1fr 1fr"}}>
            <HUI.Field label="Khoa" required error={errors.dept}>
              <HUI.Select value={data.dept} onChange={e=>{ upd("dept", e.target.value); upd("doctorId", ""); }}
                options={[{value:"",label:"-- Chọn khoa --"}, ...DEPTS.map(d=>({value:d.id,label:`${d.name} (${d.code})`}))]}/>
            </HUI.Field>
            <HUI.Field label="Loại khám">
              <HUI.Select options={APPT_TYPES} value={data.apptType} onChange={e=>upd("apptType", e.target.value)}/>
            </HUI.Field>
          </div>
          {data.dept && (
            <div className="wiz-section">
              <div className="wiz-section-h">Chọn bác sĩ {errors.doctorId && <span style={{color:"var(--s-crit)",fontSize:11,fontWeight:400}}>· {errors.doctorId}</span>}</div>
              <div className="wiz-doc-grid">
                {DOCTORS.filter(d => d.dept === data.dept).map(dr => (
                  <button key={dr.id} className={`wiz-doc ${data.doctorId===dr.id?"on":""}`} onClick={()=>upd("doctorId", dr.id)}>
                    <div className="av">{dr.name.split(" ").slice(-1)[0][0]}</div>
                    <div className="t">
                      <b>{dr.title} {dr.name}</b>
                      <i>{dr.years} năm KN · ⭐ {dr.rating} · {dr.fee.toLocaleString()}đ</i>
                    </div>
                    {data.doctorId===dr.id && <Ico name="check" size={14}/>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <HUI.Field label="Lý do khám / triệu chứng" hint="Giúp bác sĩ chuẩn bị tốt hơn">
            <HUI.Textarea rows={3} placeholder="Vd: đau ngực trái 2 ngày, khó thở khi gắng sức..." value={data.reason} onChange={e=>upd("reason", e.target.value)}/>
          </HUI.Field>
        </div>
      )}

      {step === 3 && (
        <div className="wiz">
          <SlotPicker doctorId={data.doctorId} value={{date:data.apptDate, time:data.apptTime}} onPick={(date,time)=>{ upd("apptDate", date); upd("apptTime", time); }} />
          {errors.slot && <div style={{color:"var(--s-crit)",fontSize:12,marginTop:8}}>{errors.slot}</div>}
        </div>
      )}

      {step === 4 && (
        <div className="wiz">
          <div className="hui-callout info">
            <Ico name="info" size={16}/>
            <div>Vui lòng kiểm tra lại thông tin trước khi tạo lịch. Bệnh nhân sẽ nhận SMS xác nhận sau khi tạo.</div>
          </div>
          <div className="hui-grid-info" style={{marginTop:14}}>
            <div className="c"><div className="k">Bệnh nhân</div><div className="v">{data.patient}</div><div className="s">{data.phone} · {data.gender==="F"?"Nữ":"Nam"} · {data.yob}</div></div>
            <div className="c"><div className="k">Khoa & BS</div><div className="v">{dep?.name}</div><div className="s">{dr?.title} {dr?.name}</div></div>
            <div className="c"><div className="k">Thời điểm</div><div className="v">{data.apptDate ? fmtDY(new Date(data.apptDate)) : "-"} {data.apptTime}</div><div className="s">{data.apptDate && dow[new Date(data.apptDate).getDay()]}</div></div>
            <div className="c"><div className="k">Loại khám</div><div className="v">{data.apptType}</div><div className="s">Phí: {dr?.fee.toLocaleString()}đ</div></div>
            <div className="c"><div className="k">BHYT</div><div className="v">{data.insurance ? "Có" : "Không"}</div><div className="s">{data.insuranceNo}</div></div>
            <div className="c"><div className="k">Lý do khám</div><div className="v" style={{fontSize:12,fontWeight:400}}>{data.reason || <i style={{color:"var(--t-3)"}}>Không có</i>}</div></div>
          </div>
          <HUI.Field label="Ghi chú thêm (lễ tân)" span="full" >
            <HUI.Textarea rows={2} placeholder="Vd: BN cần xe lăn, đi cùng người nhà..." value={data.note} onChange={e=>upd("note", e.target.value)}/>
          </HUI.Field>
          <div className="wiz-row" style={{gridTemplateColumns:"1fr 1fr",marginTop:10}}>
            <HUI.Field label="Kênh đặt">
              <HUI.Select options={CHANNELS.map(c => ({value:c.v, label:c.l}))} value={data.channel} onChange={e=>{ const c = CHANNELS.find(x=>x.v===e.target.value); upd("channel", c.v); upd("channelLabel", c.l); upd("channelTone", c.tone); }}/>
            </HUI.Field>
            <HUI.Field label="Người đặt">
              <HUI.Input value="Lễ tân Trần T. Hà" disabled/>
            </HUI.Field>
          </div>
        </div>
      )}
    </HUI.Modal>
  );
};

// ─── Slot picker (used in wizard + reschedule) ────
const SlotPicker = ({ doctorId, value, onPick }) => {
  const [dayIdx, setDayIdx] = useState(0);
  if (!doctorId) return <div className="hui-callout warn"><Ico name="alert" size={14}/> Hãy chọn bác sĩ ở bước trước.</div>;
  const days = []; for (let i=0; i<10; i++) days.push(addDays(today, i));
  const date = dateKey(days[dayIdx]);
  const slots = slotsForDoctorDate(doctorId, date);
  return (
    <div className="slot-picker">
      <div className="sp-days">
        {days.map((d, i) => {
          const k = dateKey(d);
          const sl = slotsForDoctorDate(doctorId, k);
          const free = sl ? sl.filter(s => s.booked === 0).length : 0;
          const total = sl ? sl.length : 0;
          return (
            <button key={i} className={`sp-day ${dayIdx===i?"on":""} ${!sl?"off":""}`} disabled={!sl} onClick={()=>setDayIdx(i)}>
              <div className="dd">{dow[d.getDay()]}</div>
              <div className="d">{fmtD(d)}</div>
              <div className="ct">{!sl ? "Nghỉ" : `${free}/${total}`}</div>
            </button>
          );
        })}
      </div>
      {slots ? (
        <>
          <div className="sp-shift-h">Sáng (08:00 - 11:30)</div>
          <div className="sp-slots">
            {slots.filter(s => s.shift === "AM").map(s => (
              <button key={s.time} className={`sp-slot ${value.date===date && value.time===s.time ? "on" : ""} ${s.booked>=s.capacity ? "full" : ""}`} disabled={s.booked>=s.capacity} onClick={()=>onPick(date, s.time)}>
                <span className="t">{s.time}</span>
                <span className="r">{s.room}</span>
              </button>
            ))}
          </div>
          {slots.some(s => s.shift === "PM") && <>
            <div className="sp-shift-h">Chiều (13:30 - 17:00)</div>
            <div className="sp-slots">
              {slots.filter(s => s.shift === "PM").map(s => (
                <button key={s.time} className={`sp-slot ${value.date===date && value.time===s.time ? "on" : ""} ${s.booked>=s.capacity ? "full" : ""}`} disabled={s.booked>=s.capacity} onClick={()=>onPick(date, s.time)}>
                  <span className="t">{s.time}</span>
                  <span className="r">{s.room}</span>
                </button>
              ))}
            </div>
          </>}
          <div className="sp-legend"><span className="lg-d free"/> Còn trống <span className="lg-d sel"/> Đang chọn <span className="lg-d full"/> Đã đặt</div>
        </>
      ) : (
        <div className="hui-callout warn"><Ico name="alert" size={14}/> Bác sĩ này không làm việc ngày {fmtDY(days[dayIdx])}. Hãy chọn ngày khác.</div>
      )}
    </div>
  );
};

// =====================================================================
// DRAWER: Booking detail
// =====================================================================
const BookingDrawer = ({ b, cx, bookings, onConfirm, onCheckin, onNoShow, onCancel, onReschedule, onPrint, onSMS }) => {
  // re-fetch live data
  const live = bookings.find(x => x.code === b.code) || b;
  const [tab, setTab] = useState("info");
  const dr = DOCTORS.find(d => d.id === live.doctorId);
  const dep = DEPTS.find(d => d.id === live.dept);
  const stat = statusOf(live.status);
  return (
    <HUI.Drawer
      title={<>
        <span style={{fontFamily:"var(--font-mono)",fontSize:13,color:"var(--a-cy)",marginRight:8}}>{live.code}</span>
        <span>{live.patient}</span>
      </>}
      sub={`${live.deptName} · ${live.doctorName} · ${fmtDY(live.apptDateObj)} ${live.apptTime}`}
      width={520}
      onClose={cx}
      tabs={[{id:"info",label:"Thông tin"},{id:"audit",label:"Lịch sử",count:live.audit.length},{id:"related",label:"Hẹn liên quan"}]}
      activeTab={tab}
      onTab={setTab}
      footer={<>
        <HUI.Btn variant="ghost" onClick={cx}>Đóng</HUI.Btn>
        <span style={{flex:1}}/>
        {live.status === 0 && <HUI.Btn variant="primary" icon="check" onClick={()=>{ onConfirm(live); }}>Xác nhận</HUI.Btn>}
        {live.status <= 1 && <HUI.Btn variant="soft" icon="login" onClick={()=>onCheckin(live)}>Check-in</HUI.Btn>}
      </>}
    >
      {tab === "info" && (
        <>
          <div className="hui-section">
            <div className="hui-section-t">Trạng thái</div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--d-1)",borderRadius:6,border:"1px solid var(--line)"}}>
              <span className={`ab-stat ${stat.tone}`} style={{fontSize:13,padding:"4px 10px"}}><span className={`ab-dot ${stat.tone}`}/> {stat.l}</span>
              <span className="spacer"/>
              <span style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)"}}>Cập nhật: {fmtDY(live.audit[live.audit.length-1].ts)}</span>
            </div>
          </div>
          <div className="hui-section">
            <div className="hui-section-t">Bệnh nhân</div>
            <div className="hui-kv">
              <div className="k">Họ tên</div><div className="v">{live.patient}</div>
              <div className="k">SĐT</div><div className="v" style={{fontFamily:"var(--font-mono)"}}>{live.phone}</div>
              <div className="k">CCCD</div><div className="v" style={{fontFamily:"var(--font-mono)"}}>{live.cccd}</div>
              <div className="k">Giới tính · Tuổi</div><div className="v">{live.gender==="F"?"Nữ":"Nam"} · {live.age} tuổi (sinh {live.yob})</div>
              <div className="k">Địa chỉ</div><div className="v">{live.addr}</div>
              <div className="k">BHYT</div><div className="v">{live.insurance ? <span className="chip ok mono">{live.insuranceNo}</span> : "Không"}</div>
            </div>
          </div>
          <div className="hui-section">
            <div className="hui-section-t">Lịch hẹn</div>
            <div className="hui-kv">
              <div className="k">Ngày · Giờ</div><div className="v" style={{fontFamily:"var(--font-mono)"}}>{fmtDY(live.apptDateObj)} · {live.apptTime} ({dow[live.apptDateObj.getDay()]})</div>
              <div className="k">Khoa</div><div className="v">{dep?.name}</div>
              <div className="k">Bác sĩ</div><div className="v">{live.doctorName}</div>
              <div className="k">Phòng</div><div className="v" style={{fontFamily:"var(--font-mono)"}}>{live.room}</div>
              <div className="k">Loại khám</div><div className="v">{live.apptType}</div>
              <div className="k">Lý do khám</div><div className="v">{live.reason || <i style={{color:"var(--t-3)"}}>—</i>}</div>
              <div className="k">Phí khám</div><div className="v" style={{fontFamily:"var(--font-mono)"}}>{live.fee.toLocaleString()}đ</div>
            </div>
          </div>
          <div className="hui-section">
            <div className="hui-section-t">Kênh đặt</div>
            <div className="hui-kv">
              <div className="k">Kênh</div><div className="v"><span className={`chip ${live.channelTone||"ghost"}`}>{live.channelLabel}</span></div>
              <div className="k">Người đặt</div><div className="v">{live.bookedBy}</div>
              <div className="k">Tạo lúc</div><div className="v" style={{fontFamily:"var(--font-mono)"}}>{fmtDY(live.createdAt)}</div>
              {live.note && <><div className="k">Ghi chú</div><div className="v">{live.note}</div></>}
            </div>
          </div>
          <div className="hui-section">
            <div className="hui-section-t">Hành động</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {live.status <= 1 && <HUI.Btn icon="rotate" onClick={()=>onReschedule(live)}>Đổi lịch</HUI.Btn>}
              <HUI.Btn icon="bell" onClick={()=>onSMS(live)}>Gửi SMS nhắc</HUI.Btn>
              <HUI.Btn icon="print" onClick={()=>onPrint(live)}>In phiếu hẹn</HUI.Btn>
              {live.status <= 1 && <HUI.Btn icon="alert" onClick={()=>onNoShow(live)}>No-show</HUI.Btn>}
              {live.status <= 1 && <HUI.Btn variant="danger" icon="x" onClick={()=>onCancel(live)}>Hủy lịch</HUI.Btn>}
            </div>
          </div>
        </>
      )}
      {tab === "audit" && (
        <div className="hui-section">
          <div className="hui-section-t">Lịch sử thay đổi · {live.audit.length} sự kiện</div>
          <div className="hui-timeline">
            {[...live.audit].reverse().map((ev, i) => (
              <div key={i} className={`ev ${ev.tone||""}`}>
                <div className="ts">{ev.ts instanceof Date ? `${fmtDY(ev.ts)} · ${pad2(ev.ts.getHours())}:${pad2(ev.ts.getMinutes())}` : ev.ts}</div>
                <div className="msg">{ev.msg}</div>
                <div className="who">{ev.who}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "related" && (
        <div className="hui-section">
          <div className="hui-section-t">Lịch hẹn khác của bệnh nhân</div>
          {(() => {
            const rel = bookings.filter(x => x.phone === live.phone && x.code !== live.code).slice(0, 8);
            if (rel.length === 0) return <div style={{color:"var(--t-2)",fontSize:12}}>Bệnh nhân chưa có lịch hẹn nào khác.</div>;
            return (
              <table className="hui-tbl">
                <thead><tr><th>Mã</th><th>Ngày</th><th>Khoa · BS</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {rel.map(r => (
                    <tr key={r.code}>
                      <td className="mono" style={{fontSize:11}}>{r.code}</td>
                      <td className="mono">{fmtD(r.apptDateObj)} {r.apptTime}</td>
                      <td><b>{r.deptName}</b><br/><i style={{color:"var(--t-2)",fontSize:11}}>{r.doctorName}</i></td>
                      <td><span className={`ab-stat ${statusOf(r.status).tone}`}>{statusOf(r.status).l}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}
    </HUI.Drawer>
  );
};

// =====================================================================
// MODALS: cancel · reschedule · print · lookup · sched form
// =====================================================================
const CancelModal = ({ b, cx, onSubmit }) => {
  const [reason, setReason] = useState("BN bận đột xuất");
  const [other, setOther] = useState("");
  const reasons = ["BN bận đột xuất","Trùng lịch","Đã khám nơi khác","Sức khoẻ không cho phép đi","Đổi sang BS khác","Khác"];
  return (
    <HUI.Modal title="Hủy lịch hẹn" sub={`${b.code} · ${b.patient}`} size="md" tone="danger" onClose={cx}
      footer={<>
        <HUI.Btn variant="ghost" onClick={cx}>Quay lại</HUI.Btn>
        <HUI.Btn variant="danger" icon="x" onClick={()=>onSubmit(reason==="Khác" ? other : reason)} disabled={reason==="Khác" && !other}>Xác nhận hủy</HUI.Btn>
      </>}>
      <div className="hui-callout warn"><Ico name="alert" size={14}/> Hành động này sẽ giải phóng slot {b.apptTime} của BS. SMS thông báo sẽ gửi tới <b>{b.phone}</b>.</div>
      <div style={{marginTop:14}}>
        <HUI.Field label="Lý do hủy" required>
          <HUI.Radio options={reasons} value={reason} onChange={setReason}/>
        </HUI.Field>
        {reason === "Khác" && (
          <HUI.Field label="Mô tả lý do" required>
            <HUI.Textarea rows={2} value={other} onChange={e=>setOther(e.target.value)}/>
          </HUI.Field>
        )}
      </div>
    </HUI.Modal>
  );
};

const ReschedModal = ({ b, cx, onSubmit }) => {
  const [pick, setPick] = useState({ date: b.apptDate, time: b.apptTime });
  const [reason, setReason] = useState("BN yêu cầu đổi");
  return (
    <HUI.Modal title="Đổi lịch hẹn" sub={`${b.code} · ${b.patient} · ${b.doctorName}`} size="lg" onClose={cx}
      footer={<>
        <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
        <HUI.Btn variant="primary" icon="check" onClick={()=>onSubmit(pick.date, pick.time, reason)} disabled={!pick.date || !pick.time}>Xác nhận đổi lịch</HUI.Btn>
      </>}>
      <div className="hui-callout info"><Ico name="info" size={14}/> Slot hiện tại: <b>{fmtDY(b.apptDateObj)} {b.apptTime}</b> · phòng {b.room}</div>
      <div style={{marginTop:12}}>
        <SlotPicker doctorId={b.doctorId} value={pick} onPick={(date, time) => setPick({date, time})}/>
      </div>
      <div style={{marginTop:14}}>
        <HUI.Field label="Lý do đổi lịch">
          <HUI.Input value={reason} onChange={e=>setReason(e.target.value)}/>
        </HUI.Field>
      </div>
    </HUI.Modal>
  );
};

const PrintModal = ({ b, cx }) => {
  const onPrint = () => { window.print(); toastInfo("Mở hộp thoại in"); };
  return (
    <HUI.Modal title="Phiếu hẹn khám" sub="Bản xem trước · A5" size="md" onClose={cx} dense
      footer={<>
        <HUI.Btn variant="ghost" onClick={cx}>Đóng</HUI.Btn>
        <HUI.Btn variant="primary" icon="print" onClick={onPrint}>In</HUI.Btn>
      </>}>
      <div className="print-paper">
        <div className="pp-h">
          <div>
            <div className="hosp">BVĐK HƯNG YÊN</div>
            <div className="addr">Số 1 Nguyễn Lương Bằng · TP. Hưng Yên · ☎ 0221-3.848.xxx</div>
          </div>
          <div className="qr"><div style={{fontFamily:"var(--font-mono)",fontSize:9,textAlign:"center"}}>QR<br/>{b.code.slice(-6)}</div></div>
        </div>
        <h1>PHIẾU HẸN KHÁM</h1>
        <div className="pp-code">{b.code}</div>
        <table className="pp-tbl">
          <tbody>
            <tr><td>Họ và tên</td><td><b>{b.patient}</b></td><td>Năm sinh</td><td>{b.yob}</td></tr>
            <tr><td>Giới tính</td><td>{b.gender==="F"?"Nữ":"Nam"}</td><td>SĐT</td><td>{b.phone}</td></tr>
            <tr><td>Địa chỉ</td><td colSpan={3}>{b.addr}</td></tr>
            <tr><td>BHYT</td><td colSpan={3}>{b.insurance ? b.insuranceNo : "Không có"}</td></tr>
          </tbody>
        </table>
        <div className="pp-box">
          <div className="row" style={{display:"flex",gap:24,fontSize:14}}>
            <div><div className="pp-lbl">NGÀY KHÁM</div><b>{fmtDY(b.apptDateObj)} ({dow[b.apptDateObj.getDay()]})</b></div>
            <div><div className="pp-lbl">GIỜ</div><b>{b.apptTime}</b></div>
            <div><div className="pp-lbl">PHÒNG</div><b>{b.room}</b></div>
          </div>
          <div style={{marginTop:8,fontSize:13}}><span className="pp-lbl" style={{display:"inline"}}>BÁC SĨ:</span> <b>{b.doctorName}</b> · {b.deptName}</div>
          <div style={{marginTop:4,fontSize:12}}><span className="pp-lbl" style={{display:"inline"}}>LOẠI KHÁM:</span> {b.apptType}</div>
        </div>
        <div className="pp-note">
          <b>Lưu ý:</b><br/>
          1. Vui lòng có mặt trước giờ hẹn 15 phút để check-in tại quầy lễ tân tầng 1.<br/>
          2. Mang theo CCCD/CMND, thẻ BHYT (nếu có) và phiếu hẹn này.<br/>
          3. Để hủy hoặc đổi lịch, gọi hotline 1900-xxx-xxx hoặc dùng App ít nhất 4h trước giờ hẹn.<br/>
          4. Lịch hẹn quá giờ 30 phút sẽ tự động hủy.
        </div>
        <div className="pp-sig">
          <div></div>
          <div>
            <div style={{fontSize:11,color:"#555"}}>Hưng Yên, ngày {b.createdAt.getDate()} tháng {b.createdAt.getMonth()+1} năm {b.createdAt.getFullYear()}</div>
            <div style={{fontWeight:600,marginTop:4}}>NGƯỜI ĐẶT LỊCH</div>
            <div style={{height:40}}/>
            <div>{b.bookedBy}</div>
          </div>
        </div>
      </div>
    </HUI.Modal>
  );
};

const LookupModal = ({ cx, bookings, onOpen }) => {
  const [q, setQ] = useState("");
  const found = q.length >= 3 ? bookings.filter(b => {
    const blob = `${b.code} ${b.patient} ${b.phone} ${b.cccd}`.toLowerCase();
    return blob.includes(q.toLowerCase());
  }).slice(0, 12) : [];
  return (
    <HUI.Modal title="Tra cứu mã hẹn" sub="Nhập mã / SĐT / CCCD / tên BN" size="md" onClose={cx}>
      <HUI.Field label="Tìm kiếm">
        <HUI.Input icon="search" placeholder="vd: APT-2610... hoặc 0912345678" autoFocus value={q} onChange={e=>setQ(e.target.value)}/>
      </HUI.Field>
      {q.length >= 3 && (
        <div className="hui-list-sel" style={{marginTop:12}}>
          {found.length === 0 && <div style={{padding:14,color:"var(--t-2)",fontSize:12,textAlign:"center"}}>Không tìm thấy lịch hẹn nào</div>}
          {found.map(b => (
            <div key={b.code} className="row" onClick={()=>onOpen(b)}>
              <div>
                <b>{b.patient}</b> · <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--a-cy)"}}>{b.code}</span>
                <div style={{fontSize:11,color:"var(--t-2)",marginTop:2}}>{b.phone} · {fmtD(b.apptDateObj)} {b.apptTime} · {b.deptName}</div>
              </div>
              <span className="meta"><span className={`ab-stat ${statusOf(b.status).tone}`}>{statusOf(b.status).l}</span></span>
            </div>
          ))}
        </div>
      )}
    </HUI.Modal>
  );
};

const SchedFormModal = ({ s, cx, onSubmit }) => {
  const [data, setData] = useState(() => s ? {
    doctorId: s.doctorId, dept: s.dept, room: s.room, date: s.date,
    startTime: s.startTime, endTime: s.endTime, maxPatients: s.maxPatients,
    slotDuration: 30, isRecurring: s.isRecurring, note: ""
  } : {
    doctorId: "", dept: "", room: ROOMS[0], date: dateKey(today),
    startTime: "08:00", endTime: "11:30", maxPatients: 30, slotDuration: 30, isRecurring: false, note: ""
  });
  const upd = (k, v) => setData(d => ({...d, [k]: v}));
  return (
    <HUI.Modal title={s ? "Sửa lịch BS" : "Thêm lịch BS"} size="md" onClose={cx}
      footer={<>
        <HUI.Btn variant="ghost" onClick={cx}>Hủy</HUI.Btn>
        <HUI.Btn variant="primary" icon="check" onClick={()=>onSubmit(data)}>{s?"Cập nhật":"Tạo lịch"}</HUI.Btn>
      </>}>
      <HUI.Row cols={2}>
        <HUI.Field label="Bác sĩ" required>
          <HUI.Select value={data.doctorId} onChange={e=>{ upd("doctorId", e.target.value); const dr=DOCTORS.find(x=>x.id===e.target.value); if (dr) upd("dept", dr.dept); }}
            options={[{value:"",label:"-- Chọn --"}, ...DOCTORS.map(d => ({value:d.id, label:`${d.title} ${d.name}`}))]}/>
        </HUI.Field>
        <HUI.Field label="Khoa" required>
          <HUI.Select value={data.dept} onChange={e=>upd("dept", e.target.value)} options={[{value:"",label:"-- Chọn --"}, ...DEPTS.map(d => ({value:d.id, label:d.name}))]}/>
        </HUI.Field>
        <HUI.Field label="Ngày" required>
          <HUI.Input type="date" value={data.date} onChange={e=>upd("date", e.target.value)}/>
        </HUI.Field>
        <HUI.Field label="Phòng">
          <HUI.Select options={ROOMS} value={data.room} onChange={e=>upd("room", e.target.value)}/>
        </HUI.Field>
        <HUI.Field label="Giờ bắt đầu" required>
          <HUI.Input type="time" value={data.startTime} onChange={e=>upd("startTime", e.target.value)}/>
        </HUI.Field>
        <HUI.Field label="Giờ kết thúc" required>
          <HUI.Input type="time" value={data.endTime} onChange={e=>upd("endTime", e.target.value)}/>
        </HUI.Field>
        <HUI.Field label="Số BN tối đa">
          <HUI.Input type="number" value={data.maxPatients} onChange={e=>upd("maxPatients", e.target.value)}/>
        </HUI.Field>
        <HUI.Field label="Thời lượng slot (phút)">
          <HUI.Select options={[15,20,30,45,60].map(v=>({value:v,label:`${v} phút`}))} value={data.slotDuration} onChange={e=>upd("slotDuration", Number(e.target.value))}/>
        </HUI.Field>
      </HUI.Row>
      <div style={{marginTop:10}}>
        <HUI.Chk label="Lặp hàng tuần (8 tuần)" checked={data.isRecurring} onChange={v=>upd("isRecurring", v)}/>
      </div>
      <div style={{marginTop:10}}>
        <HUI.Field label="Ghi chú">
          <HUI.Textarea rows={2} value={data.note} onChange={e=>upd("note", e.target.value)}/>
        </HUI.Field>
      </div>
    </HUI.Modal>
  );
};

// Mount export
window.ApptBookingV2 = ApptBooking;
