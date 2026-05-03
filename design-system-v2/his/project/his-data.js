// ============================================
// HIS Terminal — Shared Seed Data
// Single source of truth for all modules.
// ============================================
window.HIS = (function(){

const HOSPITAL = {
  name: "BVĐK Tỉnh Hưng Yên",
  code: "01-001-HY",
  tier: "Tuyến tỉnh (Hạng I)",
  date: "Thứ Bảy, 18/10/2026",
  shift: "Ca sáng · 07:00 → 15:00",
};

// ============== STAFF ==============
const staff = [
  { id: "BS01", name: "TS.BS Nguyễn Hoài Linh", role: "Trưởng khoa Nội",  dept: "Nội TQ",   onDuty: true,  phone: "0912 111 222" },
  { id: "BS02", name: "BS. Phạm Thu Hà",        role: "Bác sĩ Sản",       dept: "Sản PK",   onDuty: true,  phone: "0912 222 333" },
  { id: "BS03", name: "TS.BS Trần Văn Khải",    role: "Trưởng khoa Ngoại",dept: "Ngoại CT", onDuty: true,  phone: "0912 333 444" },
  { id: "BS04", name: "BS. Lê Thanh Minh",      role: "Bác sĩ Mắt",       dept: "Mắt",      onDuty: true,  phone: "0912 444 555" },
  { id: "BS05", name: "BS. Vũ Ngọc Đạt",        role: "Chẩn đoán hình ảnh",dept: "CĐHA",    onDuty: false, phone: "0912 555 666" },
  { id: "DD01", name: "ĐD. Nguyễn Thu Trang",   role: "Điều dưỡng trưởng", dept: "Nội A",   onDuty: true,  phone: "0913 111 222" },
  { id: "DD02", name: "ĐD. Trần Mai Anh",       role: "Điều dưỡng",        dept: "Nội A",   onDuty: true,  phone: "0913 222 333" },
  { id: "DD03", name: "ĐD. Phạm Thị Lan",       role: "Điều dưỡng",        dept: "Cấp cứu", onDuty: true,  phone: "0913 333 444" },
  { id: "KTV01", name: "KTV. Đỗ Quang Tuấn",    role: "KTV Xét nghiệm",    dept: "LIS",     onDuty: true,  phone: "0914 111 222" },
  { id: "KTV02", name: "KTV. Hoàng Văn Nam",    role: "KTV CĐHA",          dept: "CĐHA",    onDuty: true,  phone: "0914 222 333" },
  { id: "DS01", name: "DS. Nguyễn Thị Hương",   role: "Dược sĩ lâm sàng",  dept: "Dược",    onDuty: true,  phone: "0915 111 222" },
  { id: "TN01", name: "Trần Thị Liên",           role: "Thu ngân",          dept: "Tài vụ",  onDuty: true,  phone: "0916 111 222" },
];
const staffById = (id) => staff.find(s => s.id === id);

const currentUser = { id: "BS01", name: "BS. Linh", role: "Khoa Nội · P.201", avatar: "L" };

// ============== PATIENTS ==============
// Expanded - now with TT52 Rx, ICD10 history, admin address new/old, vitals time-series
const patients = [
  { id: "BN-00142", name: "Nguyễn Văn An",    age: 54, gender: "M", phone: "0912 345 678", bhyt: "HN4 5 08 1234567", bhytClass: "HN4", insuredBy: "HT",  bhytExp: "31/12/2026", allergy: ["Penicillin"], bloodType: "O+",
    address:    { new: "P. Lê Hồng Phong, TP. Hưng Yên, T. Hưng Yên", old: "P. Lê Hồng Phong, TP. Hưng Yên, T. Hưng Yên" },
    icdHist: ["I10", "E11.9"], dob: "12/03/1971", job: "Công nhân" },
  { id: "BN-00189", name: "Trần Thị Bình",    age: 32, gender: "F", phone: "0987 654 321", bhyt: "HN3 5 08 9876543", bhytClass: "HN3", insuredBy: "HT",  bhytExp: "31/12/2026", allergy: [], bloodType: "A+",
    address:    { new: "X. Trưng Trắc, H. Văn Lâm, T. Hưng Yên", old: "X. Ngọc Lâm, H. Mỹ Hào, T. Hưng Yên" },
    icdHist: ["O09.9"], dob: "08/07/1993", job: "Giáo viên" },
  { id: "BN-00201", name: "Lê Hoàng Cường",   age: 67, gender: "M", phone: "0901 223 344", bhyt: "HN2 5 08 1122334", bhytClass: "HN2", insuredBy: "HT",  bhytExp: "30/06/2026", allergy: ["Aspirin","Sulfa"], bloodType: "B+",
    address:    { new: "P. Hiến Nam, TP. Hưng Yên, T. Hưng Yên", old: "P. Hiến Nam, TP. Hưng Yên, T. Hưng Yên" },
    icdHist: ["I25.9", "I50.9", "E78.5"], dob: "15/11/1958", job: "Hưu trí" },
  { id: "BN-00223", name: "Phạm Minh Dũng",   age: 45, gender: "M", phone: "0933 445 566", bhyt: "—",              bhytClass: null,  insuredBy: null,  bhytExp: null, allergy: [], bloodType: "AB+",
    address:    { new: "P. Quang Trung, TP. Hưng Yên, T. Hưng Yên", old: "P. Quang Trung, TP. Hưng Yên, T. Hưng Yên" },
    icdHist: [], dob: "22/05/1980", job: "Kinh doanh" },
  { id: "BN-00256", name: "Hoàng Thị Em",     age: 28, gender: "F", phone: "0977 889 900", bhyt: "HN1 5 08 3344556", bhytClass: "HN1", insuredBy: "TB",  bhytExp: "31/12/2026", allergy: [], bloodType: "O-",
    address:    { new: "X. Yên Phú, H. Yên Mỹ, T. Hưng Yên", old: "X. Yên Phú, H. Yên Mỹ, T. Hưng Yên" },
    icdHist: ["J06.9"], dob: "02/10/1997", job: "Công nhân" },
  { id: "BN-00278", name: "Vũ Thanh Phong",   age: 71, gender: "M", phone: "0944 556 677", bhyt: "HN5 5 08 5566778", bhytClass: "HN5", insuredBy: "HT",  bhytExp: "31/12/2026", allergy: ["Iodine"], bloodType: "A-",
    address:    { new: "X. Liên Nghĩa, H. Văn Giang, T. Hưng Yên", old: "X. Liên Nghĩa, H. Văn Giang, T. Hưng Yên" },
    icdHist: ["E11.9", "E78.5", "I10"], dob: "30/01/1954", job: "Hưu trí" },
  { id: "BN-00301", name: "Đặng Thu Giang",   age: 38, gender: "F", phone: "0966 778 899", bhyt: "—",              bhytClass: null,  insuredBy: null,  bhytExp: null, allergy: [], bloodType: "B-",
    address:    { new: "P. An Tảo, TP. Hưng Yên, T. Hưng Yên", old: "P. An Tảo, TP. Hưng Yên, T. Hưng Yên" },
    icdHist: ["R05"], dob: "11/09/1987", job: "Văn phòng" },
  { id: "BN-00312", name: "Bùi Quang Huy",    age: 52, gender: "M", phone: "0955 889 977", bhyt: "HN2 5 08 7788997", bhytClass: "HN2", insuredBy: "HT",  bhytExp: "31/12/2026", allergy: [], bloodType: "O+",
    address:    { new: "X. Nhân Quyền, H. Bình Giang, T. Hưng Yên", old: "X. Nhân Quyền, H. Bình Giang, T. Hải Dương" },
    icdHist: ["M54.5"], dob: "14/04/1973", job: "Lái xe" },
  // IPD patients
  { id: "BN-00088", name: "Phạm Văn Khánh",   age: 62, gender: "M", phone: "0987 001 122", bhyt: "HN2 5 08 8801122", bhytClass: "HN2", insuredBy: "HT",  bhytExp: "31/12/2026", allergy: [], bloodType: "B+",
    address:    { new: "X. Dị Sử, H. Mỹ Hào, T. Hưng Yên", old: "X. Dị Sử, H. Mỹ Hào, T. Hưng Yên" },
    icdHist: ["J18.9", "J44.1"], dob: "03/02/1963", job: "Hưu trí" },
  { id: "BN-00102", name: "Nguyễn Thị Mây",   age: 74, gender: "F", phone: "0987 002 233", bhyt: "HN5 5 08 1002233", bhytClass: "HN5", insuredBy: "HT",  bhytExp: "31/12/2026", allergy: ["Penicillin"], bloodType: "A+",
    address:    { new: "P. Lam Sơn, TP. Hưng Yên, T. Hưng Yên", old: "P. Lam Sơn, TP. Hưng Yên, T. Hưng Yên" },
    icdHist: ["J44.1", "J44.0", "I50.9"], dob: "18/06/1951", job: "Hưu trí" },
  { id: "BN-00141", name: "Đặng Thị Lý",      age: 68, gender: "F", phone: "0987 003 344", bhyt: "HN2 5 08 1003344", bhytClass: "HN2", insuredBy: "HT",  bhytExp: "31/12/2026", allergy: [], bloodType: "O+",
    address:    { new: "X. Ngọc Long, H. Yên Mỹ, T. Hưng Yên", old: "X. Ngọc Long, H. Yên Mỹ, T. Hưng Yên" },
    icdHist: ["I63.9", "I10"], dob: "04/03/1957", job: "Nội trợ" },
  { id: "BN-00168", name: "Trần Văn Quân",    age: 48, gender: "M", phone: "0987 004 455", bhyt: "HN4 5 08 1004455", bhytClass: "HN4", insuredBy: "HT",  bhytExp: "31/12/2026", allergy: [], bloodType: "O+",
    address:    { new: "X. Tân Quang, H. Văn Lâm, T. Hưng Yên", old: "X. Tân Quang, H. Văn Lâm, T. Hưng Yên" },
    icdHist: ["S72.0"], dob: "21/08/1977", job: "Công nhân" },
  { id: "BN-00173", name: "Lê Minh Ron",      age: 55, gender: "M", phone: "0987 005 566", bhyt: "—",              bhytClass: null,  insuredBy: null,  bhytExp: null, allergy: [], bloodType: "A+",
    address:    { new: "P. Minh Khai, TP. Hưng Yên, T. Hưng Yên", old: "P. Minh Khai, TP. Hưng Yên, T. Hưng Yên" },
    icdHist: ["K80.2"], dob: "02/12/1970", job: "Kinh doanh" },
];
const patientById = (id) => patients.find(p => p.id === id) || patients[0];

// ============== OPD QUEUE ==============
const queue = [
  { pid: "BN-00142", token: "A012", arrived: "07:42", priority: "normal", status: "waiting",      reason: "Đau thượng vị 3 ngày",      room: "P.201", dept: "Nội TQ",  vitals: { bp: "138/92", hr: 84, temp: 37.2, spo2: 98 } },
  { pid: "BN-00189", token: "A013", arrived: "07:55", priority: "normal", status: "in-progress",  reason: "Khám thai 28 tuần",          room: "P.205", dept: "Sản PK",  vitals: { bp: "118/76", hr: 78, temp: 36.8, spo2: 99 } },
  { pid: "BN-00201", token: "A014", arrived: "08:02", priority: "urgent", status: "waiting",      reason: "Khó thở, đau ngực trái",     room: "P.201", dept: "Nội TQ",  vitals: { bp: "162/98", hr: 102, temp: 37.0, spo2: 94 } },
  { pid: "BN-00223", token: "A015", arrived: "08:10", priority: "normal", status: "waiting",      reason: "Tái khám THA",                room: "P.201", dept: "Nội TQ",  vitals: { bp: "142/88", hr: 76, temp: 36.7, spo2: 98 } },
  { pid: "BN-00256", token: "A016", arrived: "08:18", priority: "normal", status: "labs",         reason: "Chóng mặt, buồn nôn",        room: "P.201", dept: "Nội TQ",  vitals: { bp: "108/68", hr: 88, temp: 37.1, spo2: 99 } },
  { pid: "BN-00278", token: "A017", arrived: "08:25", priority: "normal", status: "waiting",      reason: "Đái tháo đường - tái khám",  room: "P.201", dept: "Nội TQ",  vitals: { bp: "134/82", hr: 72, temp: 36.6, spo2: 97 } },
  { pid: "BN-00301", token: "A018", arrived: "08:33", priority: "normal", status: "imaging",      reason: "Ho kéo dài 2 tuần",          room: "P.201", dept: "Nội TQ",  vitals: { bp: "122/78", hr: 80, temp: 37.4, spo2: 97 } },
  { pid: "BN-00312", token: "A019", arrived: "08:40", priority: "normal", status: "waiting",      reason: "Đau lưng mạn",                room: "P.305", dept: "Ngoại CT",vitals: { bp: "128/84", hr: 74, temp: 36.8, spo2: 98 } },
];

// ============== WARDS / BEDS ==============
const wards = [
  { id: "W-I", name: "Khoa Nội A", shortName: "Nội A", head: "BS01",
    rooms: [
      { id: "P.301", beds: [
        { n: "301-1", patient: { id: "BN-00088" }, status: "occupied", severity: "stable",     los: 3, admit: "15/10" },
        { n: "301-2", patient: null, status: "free",     severity: null, los: 0, admit: null },
        { n: "301-3", patient: { id: "BN-00102" }, status: "occupied", severity: "critical",   los: 5, admit: "13/10" },
        { n: "301-4", patient: null, status: "cleaning", severity: null, los: 0, admit: null },
      ]},
      { id: "P.302", beds: [
        { n: "302-1", patient: { id: "BN-00115" }, status: "occupied", severity: "monitoring", los: 2, admit: "16/10" },
        { n: "302-2", patient: { id: "BN-00121" }, status: "occupied", severity: "stable",     los: 7, admit: "11/10" },
        { n: "302-3", patient: null, status: "free",     severity: null, los: 0, admit: null },
        { n: "302-4", patient: { id: "BN-00133" }, status: "occupied", severity: "stable",     los: 1, admit: "17/10" },
      ]},
      { id: "P.303", beds: [
        { n: "303-1", patient: { id: "BN-00141" }, status: "occupied", severity: "monitoring", los: 4, admit: "14/10" },
        { n: "303-2", patient: null, status: "reserved", severity: null, los: 0, admit: null },
        { n: "303-3", patient: { id: "BN-00145" }, status: "occupied", severity: "stable",     los: 2, admit: "16/10" },
        { n: "303-4", patient: { id: "BN-00159" }, status: "occupied", severity: "critical",   los: 3, admit: "15/10" },
      ]},
    ]},
  { id: "W-N", name: "Khoa Ngoại chấn thương", shortName: "Ngoại CT", head: "BS03",
    rooms: [
      { id: "P.501", beds: [
        { n: "501-1", patient: { id: "BN-00162" }, status: "occupied", severity: "stable", los: 1, admit: "17/10" },
        { n: "501-2", patient: null, status: "free", severity: null, los: 0, admit: null },
        { n: "501-3", patient: { id: "BN-00168" }, status: "occupied", severity: "monitoring", los: 4, admit: "14/10" },
        { n: "501-4", patient: null, status: "free", severity: null, los: 0, admit: null },
      ]},
      { id: "P.502", beds: [
        { n: "502-1", patient: { id: "BN-00173" }, status: "occupied", severity: "stable", los: 0, admit: "18/10" },
        { n: "502-2", patient: { id: "BN-00179" }, status: "occupied", severity: "stable", los: 2, admit: "16/10" },
        { n: "502-3", patient: null, status: "cleaning", severity: null, los: 0, admit: null },
        { n: "502-4", patient: null, status: "free", severity: null, los: 0, admit: null },
      ]},
    ]},
  { id: "W-S", name: "Khoa Sản", shortName: "Sản", head: "BS02",
    rooms: [
      { id: "P.701", beds: [
        { n: "701-1", patient: { id: "BN-00188" }, status: "occupied", severity: "stable", los: 1, admit: "17/10" },
        { n: "701-2", patient: { id: "BN-00195" }, status: "occupied", severity: "stable", los: 2, admit: "16/10" },
        { n: "701-3", patient: null, status: "free", severity: null, los: 0, admit: null },
        { n: "701-4", patient: null, status: "free", severity: null, los: 0, admit: null },
      ]},
    ]},
  { id: "W-CC", name: "Khoa Hồi sức tích cực (ICU)", shortName: "ICU", head: "BS03",
    rooms: [
      { id: "ICU-1", beds: [
        { n: "ICU1-1", patient: { id: "BN-00102" }, status: "occupied", severity: "critical", los: 2, admit: "16/10" },
        { n: "ICU1-2", patient: { id: "BN-00159" }, status: "occupied", severity: "critical", los: 1, admit: "17/10" },
        { n: "ICU1-3", patient: null, status: "reserved", severity: null, los: 0, admit: null },
        { n: "ICU1-4", patient: null, status: "free", severity: null, los: 0, admit: null },
      ]},
    ]},
];
// Fill extra display names for IPD beds so the map prints something sensible
const bedPatientNames = {
  "BN-00115": { name: "Lê Văn Tiến", dx: "ĐTĐ type 2 biến chứng" },
  "BN-00121": { name: "Trần Thị Hậu", dx: "Suy tim NYHA III" },
  "BN-00133": { name: "Vũ Văn Dũng",  dx: "Viêm dạ dày cấp" },
  "BN-00145": { name: "Hoàng Văn Nam",dx: "Tăng HA độ 3" },
  "BN-00159": { name: "Bùi Thị Oanh", dx: "Viêm tụy cấp" },
  "BN-00162": { name: "Phạm Ngọc Pha",dx: "Hậu phẫu ruột thừa" },
  "BN-00179": { name: "Đỗ Văn Sơn",   dx: "Thoát vị bẹn P" },
  "BN-00188": { name: "Nguyễn Thị Uyên", dx: "Hậu sản thường" },
  "BN-00195": { name: "Phạm Thị Vân", dx: "Hậu mổ đẻ" },
};
const bedPatientResolve = (bedPatient) => {
  if (!bedPatient) return null;
  const full = patientById(bedPatient.id);
  if (full) return { id: full.id, name: full.name, dx: full.icdHist[0] || "—" };
  const extra = bedPatientNames[bedPatient.id];
  if (extra) return { id: bedPatient.id, name: extra.name, dx: extra.dx };
  return { id: bedPatient.id, name: "—", dx: "—" };
};

// ============== OR ==============
const orRooms = ["OR-1","OR-2","OR-3","OR-4"];
const orSchedule = [
  { or: "OR-1", start: "07:30", end: "09:30", pid: "BN-00168", proc: "Kết hợp xương đùi P", procCode: "43.1", surgeon: "BS03", anesth: "BS05", status: "done",        pre: "ASA II" },
  { or: "OR-1", start: "10:00", end: "12:00", pid: "BN-00173", proc: "Cắt túi mật nội soi", procCode: "51.23", surgeon: "BS03", anesth: "BS05", status: "in-progress", pre: "ASA II" },
  { or: "OR-1", start: "13:30", end: "15:00", pid: "BN-00179", proc: "Mổ thoát vị bẹn P",   procCode: "53.04", surgeon: "BS03", anesth: "BS05", status: "scheduled",   pre: "ASA I" },
  { or: "OR-2", start: "08:00", end: "10:30", pid: "BN-00195", proc: "Mổ đẻ chủ động",       procCode: "74.1",  surgeon: "BS02", anesth: "BS05", status: "done",        pre: "ASA II" },
  { or: "OR-2", start: "11:00", end: "12:30", pid: "BN-00211", proc: "Mổ u xơ tử cung",      procCode: "68.29", surgeon: "BS02", anesth: "BS05", status: "scheduled",   pre: "ASA II" },
  { or: "OR-3", start: "07:30", end: "10:00", pid: "BN-00220", proc: "Phaco 2 mắt · IOL",    procCode: "13.41", surgeon: "BS04", anesth: "BS05", status: "done",        pre: "ASA I" },
  { or: "OR-3", start: "10:30", end: "11:30", pid: "BN-00229", proc: "Phaco P · IOL",        procCode: "13.41", surgeon: "BS04", anesth: "BS05", status: "in-progress", pre: "ASA I" },
  { or: "OR-4", start: "09:00", end: "13:00", pid: "BN-00234", proc: "Thay khớp háng P",     procCode: "81.51", surgeon: "BS03", anesth: "BS05", status: "scheduled",   pre: "ASA III" },
  { or: "OR-4", start: "14:00", end: "15:30", pid: "BN-00241", proc: "Nội soi khớp gối T",   procCode: "80.86", surgeon: "BS03", anesth: "BS05", status: "scheduled",   pre: "ASA II" },
];

// ============== LAB ==============
const labs = [
  { id: "XN-2026-4419", pid: "BN-00201", panel: "Sinh hoá máu + Troponin I", ward: "OPD",  priority: "STAT",    collected: "08:20", analyzer: "Cobas 8000", status: "running",  tat: "30p", abnormal: 2, orderedBy: "BS01" },
  { id: "XN-2026-4418", pid: "BN-00142", panel: "CTM + CRP",                  ward: "OPD",  priority: "Routine", collected: "08:05", analyzer: "XN-550",     status: "verified", tat: "—",   abnormal: 1, orderedBy: "BS01" },
  { id: "XN-2026-4417", pid: "BN-00256", panel: "Beta-hCG định lượng",        ward: "OPD",  priority: "Routine", collected: "07:58", analyzer: "Cobas 6000", status: "running",  tat: "1h",  abnormal: 0, orderedBy: "BS01" },
  { id: "XN-2026-4416", pid: "BN-00278", panel: "HbA1c + Glucose + Lipid",    ward: "OPD",  priority: "Routine", collected: "07:40", analyzer: "Cobas 6000", status: "verified", tat: "—",   abnormal: 2, orderedBy: "BS01" },
  { id: "XN-2026-4415", pid: "BN-00189", panel: "TPTNT + Cấy NT",              ward: "OPD",  priority: "Routine", collected: "07:22", analyzer: "Urisys",     status: "verified", tat: "—",   abnormal: 0, orderedBy: "BS02" },
  { id: "XN-2026-4414", pid: "BN-00088", panel: "Khí máu động mạch",           ward: "ICU",  priority: "STAT",    collected: "07:00", analyzer: "Radiometer", status: "verified", tat: "—",   abnormal: 1, orderedBy: "BS01" },
  { id: "XN-2026-4413", pid: "BN-00301", panel: "AFP + CEA + CA 19-9",         ward: "OPD",  priority: "Routine", collected: "06:40", analyzer: "Cobas 8000", status: "pending",  tat: "4h",  abnormal: 0, orderedBy: "BS01" },
  { id: "XN-2026-4412", pid: "BN-00102", panel: "Đông máu PT/APTT/INR",        ward: "IPD",  priority: "Routine", collected: "06:30", analyzer: "Sysmex CS",  status: "verified", tat: "—",   abnormal: 1, orderedBy: "BS01" },
  { id: "XN-2026-4411", pid: "BN-00141", panel: "Troponin I lặp (3h)",         ward: "IPD",  priority: "STAT",    collected: "06:00", analyzer: "Cobas 8000", status: "verified", tat: "—",   abnormal: 1, orderedBy: "BS01" },
  { id: "XN-2026-4410", pid: "BN-00159", panel: "Amylase + Lipase + CRP",      ward: "ICU",  priority: "STAT",    collected: "05:40", analyzer: "Cobas 6000", status: "verified", tat: "—",   abnormal: 2, orderedBy: "BS01" },
];

// Lab result rows for one detail example (XN-2026-4419 — Troponin case)
const labRows = {
  "XN-2026-4419": [
    { name: "Glucose",     value: "8.2",   unit: "mmol/L", ref: "3.9 - 5.6",   flag: "H" },
    { name: "Ure",         value: "5.1",   unit: "mmol/L", ref: "2.5 - 7.5",   flag: "" },
    { name: "Creatinine",  value: "92",    unit: "µmol/L", ref: "62 - 106",    flag: "" },
    { name: "AST (SGOT)",  value: "28",    unit: "U/L",    ref: "< 37",        flag: "" },
    { name: "ALT (SGPT)",  value: "31",    unit: "U/L",    ref: "< 41",        flag: "" },
    { name: "Natri",       value: "138",   unit: "mmol/L", ref: "135 - 145",   flag: "" },
    { name: "Kali",        value: "4.2",   unit: "mmol/L", ref: "3.5 - 5.0",   flag: "" },
    { name: "Troponin I",  value: "0.82",  unit: "ng/mL",  ref: "< 0.04",      flag: "HH" },
    { name: "CK-MB",       value: "38",    unit: "U/L",    ref: "< 25",        flag: "H" },
    { name: "NT-proBNP",   value: "124",   unit: "pg/mL",  ref: "< 125",       flag: "" },
  ],
};

// ============== RIS / PACS ==============
const studies = [
  { id: "ACC-88712", pid: "BN-00201", modality: "CT",   body: "Ngực - cản quang",     ordered: "08:14", priority: "STAT",    status: "in-progress", refDr: "BS01", tech: "KTV02" },
  { id: "ACC-88711", pid: "BN-00088", modality: "CR",   body: "X-quang ngực PA",      ordered: "07:52", priority: "Routine", status: "completed",   refDr: "BS01", tech: "KTV02" },
  { id: "ACC-88710", pid: "BN-00189", modality: "US",   body: "Siêu âm sản",          ordered: "07:45", priority: "Routine", status: "reported",    refDr: "BS02", tech: "KTV02" },
  { id: "ACC-88709", pid: "BN-00102", modality: "CT",   body: "CT Ngực HRCT",         ordered: "07:10", priority: "Routine", status: "reported",    refDr: "BS01", tech: "KTV02" },
  { id: "ACC-88708", pid: "BN-00133", modality: "MRI",  body: "Cộng hưởng từ ổ bụng", ordered: "06:55", priority: "Routine", status: "scheduled",   refDr: "BS05", tech: "KTV02" },
  { id: "ACC-88707", pid: "BN-00141", modality: "MRI",  body: "MRI sọ não",           ordered: "06:30", priority: "STAT",    status: "completed",   refDr: "BS01", tech: "KTV02" },
  { id: "ACC-88706", pid: "BN-00145", modality: "CR",   body: "X-quang cột sống TL",  ordered: "06:15", priority: "Routine", status: "reported",    refDr: "BS03", tech: "KTV02" },
  { id: "ACC-88705", pid: "BN-00301", modality: "CR",   body: "X-quang ngực PA",      ordered: "06:00", priority: "Routine", status: "reported",    refDr: "BS01", tech: "KTV02" },
];

// ============== INVOICES / BILLING ==============
const invoices = [
  { id: "HD-2026-00872", pid: "BN-00142", date: "18/10", items: 8,  total: 2_340_000,  paid: 0,          status: "unpaid",  kind: "OPD",     bhytPct: 80 },
  { id: "HD-2026-00871", pid: "BN-00189", date: "18/10", items: 3,  total: 680_000,    paid: 680_000,    status: "paid",    kind: "OPD",     bhytPct: 80 },
  { id: "HD-2026-00870", pid: "BN-00088", date: "18/10", items: 22, total: 12_480_000, paid: 8_000_000,  status: "partial", kind: "IPD",     bhytPct: 80 },
  { id: "HD-2026-00869", pid: "BN-00173", date: "17/10", items: 14, total: 18_960_000, paid: 0,          status: "unpaid",  kind: "Surgery", bhytPct: 0 },
  { id: "HD-2026-00868", pid: "BN-00278", date: "17/10", items: 5,  total: 1_240_000,  paid: 1_240_000,  status: "paid",    kind: "OPD",     bhytPct: 80 },
  { id: "HD-2026-00867", pid: "BN-00102", date: "17/10", items: 18, total: 7_650_000,  paid: 7_650_000,  status: "paid",    kind: "IPD",     bhytPct: 100 },
  { id: "HD-2026-00866", pid: "BN-00256", date: "16/10", items: 6,  total: 2_100_000,  paid: 0,          status: "unpaid",  kind: "OPD",     bhytPct: 100 },
  { id: "HD-2026-00865", pid: "BN-00301", date: "16/10", items: 4,  total: 950_000,    paid: 950_000,    status: "paid",    kind: "OPD",     bhytPct: 0 },
  { id: "HD-2026-00864", pid: "BN-00201", date: "16/10", items: 11, total: 4_320_000,  paid: 3_000_000,  status: "partial", kind: "OPD",     bhytPct: 95 },
  { id: "HD-2026-00863", pid: "BN-00312", date: "15/10", items: 7,  total: 1_820_000,  paid: 1_820_000,  status: "paid",    kind: "OPD",     bhytPct: 80 },
];

const invoiceLines = {
  "HD-2026-00872": [
    { type: "KB",  code: "17.0120.0001", name: "Khám bệnh (Hạng I)",       qty: 1,  price: 42_100,  },
    { type: "XN",  code: "23.0501.1701", name: "Tổng phân tích tế bào máu",qty: 1,  price: 82_400,  },
    { type: "XN",  code: "23.0501.1830", name: "CRP định lượng",            qty: 1,  price: 64_500,  },
    { type: "XN",  code: "23.0501.1410", name: "Glucose máu",               qty: 1,  price: 21_500,  },
    { type: "CĐHA",code: "24.0001.0001", name: "Siêu âm ổ bụng tổng quát", qty: 1,  price: 43_900,  },
    { type: "THUỐC",code:"VN-20145-15",  name: "Omeprazol 20mg",            qty: 14, price: 4_500,   },
    { type: "THUỐC",code:"VN-19872-22",  name: "Domperidon 10mg",           qty: 21, price: 2_800,   },
    { type: "THUỐC",code:"VN-18442-08",  name: "Magnesi-Al hydroxyd",       qty: 42, price: 38_500,  },
  ],
};

// ============== PHARMACY / RX ==============
// Thông tư 52 style order items
const rxPending = [
  { id: "RX-2026-3340", pid: "BN-00189", bsId: "BS02", createdAt: "08:45", items: [
    { code: "VN-14220-12", drug: "Acid folic 5mg",               dose: "1v × 1/ngày",  route: "uống", duration: "30 ngày", qty: 30, price: 2_200 },
    { code: "VN-13200-09", drug: "Calcium-D 500mg/200IU",         dose: "1v × 2/ngày",  route: "uống", duration: "30 ngày", qty: 60, price: 3_400 },
  ], status: "pending" },
  { id: "RX-2026-3339", pid: "BN-00278", bsId: "BS01", createdAt: "08:32", items: [
    { code: "VN-11720-16", drug: "Metformin 500mg",               dose: "1v × 2/ngày",  route: "uống", duration: "30 ngày", qty: 60, price: 1_800 },
    { code: "VN-12345-08", drug: "Gliclazide MR 30mg",            dose: "1v × 1/ngày",  route: "uống", duration: "30 ngày", qty: 30, price: 5_200 },
    { code: "VN-13301-22", drug: "Atorvastatin 20mg",             dose: "1v × 1 (tối)", route: "uống", duration: "30 ngày", qty: 30, price: 3_800 },
    { code: "VN-12800-04", drug: "Aspirin 81mg",                   dose: "1v × 1/ngày",  route: "uống", duration: "30 ngày", qty: 30, price: 1_200 },
  ], status: "pending" },
  { id: "RX-2026-3338", pid: "BN-00142", bsId: "BS01", createdAt: "08:18", items: [
    { code: "VN-20145-15", drug: "Omeprazol 20mg",                dose: "1v × 1 (sáng)",route: "uống", duration: "14 ngày", qty: 14, price: 4_500 },
    { code: "VN-19872-22", drug: "Domperidon 10mg",                dose: "1v × 3/ngày",  route: "uống", duration: "7 ngày",  qty: 21, price: 2_800 },
    { code: "VN-18442-08", drug: "Magnesi-Al hydroxyd 400/400",    dose: "2v × 3/ngày",  route: "uống", duration: "7 ngày",  qty: 42, price: 38_500 },
  ], status: "dispensing" },
  { id: "RX-2026-3337", pid: "BN-00312", bsId: "BS03", createdAt: "07:55", items: [
    { code: "VN-15332-19", drug: "Meloxicam 7.5mg",               dose: "1v × 2/ngày",  route: "uống", duration: "7 ngày",  qty: 14, price: 4_200 },
    { code: "VN-16201-11", drug: "Paracetamol 500mg",              dose: "1v × 3/ngày",  route: "uống", duration: "5 ngày",  qty: 15, price: 450 },
    { code: "VN-18500-02", drug: "Tolperison 50mg",                dose: "1v × 2/ngày",  route: "uống", duration: "10 ngày", qty: 20, price: 3_300 },
  ], status: "dispensed" },
  { id: "RX-2026-3336", pid: "BN-00301", bsId: "BS01", createdAt: "07:32", items: [
    { code: "VN-19500-07", drug: "Dextromethorphan 15mg",         dose: "1v × 3/ngày",  route: "uống", duration: "5 ngày", qty: 15, price: 1_200 },
    { code: "VN-17210-14", drug: "Loratadin 10mg",                 dose: "1v × 1/ngày",  route: "uống", duration: "5 ngày", qty: 5,  price: 2_800 },
  ], status: "dispensed" },
];

// ============== INVENTORY ==============
const inventory = [
  { id: "VN-14220-12", name: "Acid folic 5mg",              kind: "Thuốc",  unit: "viên", stock: 4_820,  reorder: 2_000,  lot: "LOT-2411A", exp: "10/2027", supplier: "Traphaco" },
  { id: "VN-13200-09", name: "Calcium-D 500mg/200IU",        kind: "Thuốc",  unit: "viên", stock: 2_410,  reorder: 3_000,  lot: "LOT-2503B", exp: "07/2028", supplier: "DHG" },
  { id: "VN-11720-16", name: "Metformin 500mg",               kind: "Thuốc",  unit: "viên", stock: 12_800, reorder: 5_000,  lot: "LOT-2502C", exp: "03/2028", supplier: "Boston" },
  { id: "VN-12345-08", name: "Gliclazide MR 30mg",            kind: "Thuốc",  unit: "viên", stock: 1_220,  reorder: 1_500,  lot: "LOT-2501D", exp: "05/2027", supplier: "Servier" },
  { id: "VN-13301-22", name: "Atorvastatin 20mg",             kind: "Thuốc",  unit: "viên", stock: 6_200,  reorder: 2_000,  lot: "LOT-2411E", exp: "01/2028", supplier: "Pfizer" },
  { id: "VN-20145-15", name: "Omeprazol 20mg",                kind: "Thuốc",  unit: "viên", stock: 580,    reorder: 2_000,  lot: "LOT-2410F", exp: "02/2027", supplier: "Stada" },
  { id: "VN-19872-22", name: "Domperidon 10mg",                kind: "Thuốc",  unit: "viên", stock: 3_120,  reorder: 1_000,  lot: "LOT-2503G", exp: "09/2027", supplier: "DHG" },
  { id: "VN-18442-08", name: "Magnesi-Al hydroxyd 400/400",    kind: "Thuốc",  unit: "gói",  stock: 980,    reorder: 500,    lot: "LOT-2412H", exp: "08/2027", supplier: "Traphaco" },
  { id: "VN-15332-19", name: "Meloxicam 7.5mg",               kind: "Thuốc",  unit: "viên", stock: 2_600,  reorder: 1_000,  lot: "LOT-2502I", exp: "06/2027", supplier: "Stella" },
  { id: "VN-16201-11", name: "Paracetamol 500mg",              kind: "Thuốc",  unit: "viên", stock: 48_200, reorder: 20_000, lot: "LOT-2503J", exp: "11/2028", supplier: "DHG" },
  { id: "VT-GĂNG-001",  name: "Găng tay cao su vô trùng (đôi)", kind: "Vật tư", unit: "đôi",  stock: 12_400, reorder: 5_000,  lot: "LOT-2502K", exp: "—",       supplier: "VNR" },
  { id: "VT-KIM-007",   name: "Kim luồn 20G",                    kind: "Vật tư", unit: "chiếc",stock: 380,    reorder: 1_000,  lot: "LOT-2502L", exp: "—",       supplier: "B.Braun" },
  { id: "VT-BĂNG-003",  name: "Băng gạc vô trùng 10×10cm",       kind: "Vật tư", unit: "gói",  stock: 2_800,  reorder: 1_000,  lot: "LOT-2501M", exp: "—",       supplier: "VNR" },
];

// ============== ER TRIAGE ==============
const erQueue = [
  { id: "CC-2026-0812", pid: "BN-00201", arrived: "06:48", ess: "ESI-2", complaint: "Đau ngực trái lan vai, khó thở",     room: "CC-1", nurse: "DD03", doctor: "BS01", status: "active",    vitals: { bp: "162/98", hr: 102, rr: 22, temp: 37.0, spo2: 94 } },
  { id: "CC-2026-0813", pid: "BN-00159", arrived: "05:21", ess: "ESI-1", complaint: "Hôn mê, đau bụng dữ dội - nghi viêm tụy", room: "CC-Hồi sức", nurse: "DD03", doctor: "BS01", status: "resuscitation", vitals: { bp: "88/56", hr: 128, rr: 28, temp: 38.2, spo2: 91 } },
  { id: "CC-2026-0814", pid: "BN-00414", arrived: "07:02", ess: "ESI-3", complaint: "Té ngã - chấn thương đầu nhẹ",        room: "CC-2", nurse: "DD03", doctor: null,   status: "waiting",   vitals: { bp: "128/82", hr: 88,  rr: 18, temp: 36.8, spo2: 98 } },
  { id: "CC-2026-0815", pid: "BN-00415", arrived: "07:45", ess: "ESI-3", complaint: "Sốt cao 39°C, trẻ 3 tuổi",              room: "CC-Nhi", nurse: "DD03", doctor: null,   status: "waiting",   vitals: { bp: "—",      hr: 140, rr: 32, temp: 39.1, spo2: 97 } },
  { id: "CC-2026-0816", pid: "BN-00416", arrived: "08:12", ess: "ESI-4", complaint: "Đau răng hàm dưới",                      room: "—",    nurse: "DD03", doctor: null,   status: "waiting",   vitals: { bp: "126/80", hr: 80,  rr: 16, temp: 36.7, spo2: 99 } },
  { id: "CC-2026-0817", pid: "BN-00417", arrived: "08:30", ess: "ESI-2", complaint: "Co giật toàn thể 2 phút - sau cơn tỉnh", room: "CC-1", nurse: "DD03", doctor: null,   status: "triaging",  vitals: { bp: "142/90", hr: 108, rr: 20, temp: 37.4, spo2: 96 } },
];

// ============== APPOINTMENTS ==============
const appointments = [
  { time: "09:00", pid: "BN-00312", dept: "Ngoại CT", reason: "Tái khám đau lưng",    doctor: "BS03", status: "confirmed" },
  { time: "09:30", pid: "BN-00278", dept: "Nội TQ",   reason: "Tái khám ĐTĐ",          doctor: "BS01", status: "confirmed" },
  { time: "10:00", pid: "BN-00189", dept: "Sản PK",   reason: "Khám thai 32w",        doctor: "BS02", status: "confirmed" },
  { time: "10:30", pid: "BN-00256", dept: "Sản PK",   reason: "Test thai",             doctor: "BS02", status: "confirmed" },
  { time: "11:00", pid: "BN-00201", dept: "Nội TQ",   reason: "Tái khám THA",          doctor: "BS01", status: "confirmed" },
  { time: "13:30", pid: "BN-00142", dept: "Nội TQ",   reason: "Kết quả xét nghiệm",   doctor: "BS01", status: "tentative" },
  { time: "14:00", pid: "BN-00301", dept: "Nội TQ",   reason: "X-quang + tái khám",   doctor: "BS01", status: "confirmed" },
  { time: "14:30", pid: "BN-00223", dept: "Tim mạch", reason: "Siêu âm tim",           doctor: "BS01", status: "confirmed" },
];

// ============== TICKER KPIs (shown top) ==============
const ticker = [
  { label: "OPD HÔM NAY",   val: "187",   unit: "BN", cls: "up" },
  { label: "NỘI TRÚ",        val: "47/60", unit: "", cls: "warn" },
  { label: "ICU",            val: "2/4",   unit: "", cls: "up" },
  { label: "OR ĐANG MỔ",    val: "2",     unit: "/4", cls: "up" },
  { label: "CC",             val: "6",     unit: "BN", cls: "warn" },
  { label: "LAB CHỜ",       val: "3",     unit: "XN", cls: "" },
  { label: "CĐHA CHỜ",      val: "2",     unit: "",   cls: "" },
  { label: "HD CHƯA THU",  val: "3",     unit: "",   cls: "down" },
  { label: "DT/NGÀY",       val: "124.8", unit: "TR", cls: "up" },
  { label: "BHYT GIÁM ĐỊNH", val: "98.2",  unit: "%",  cls: "up" },
  { label: "KHO HẾT",       val: "2",     unit: "SKU",cls: "down" },
  { label: "SẮP HẾT HẠN",   val: "5",     unit: "SKU",cls: "warn" },
];

// ============== REPORTS / KPI ==============
const reports = {
  daily: [
    { k: "Lượt khám OPD", v: 187, delta: "+12%", spark: [150,162,170,168,175,182,187] },
    { k: "Bệnh nhân nội trú", v: 47, delta: "+2", spark: [42,43,45,44,46,45,47] },
    { k: "Ca phẫu thuật", v: 9, delta: "+1", spark: [6,7,8,8,7,8,9] },
    { k: "Doanh thu (triệu ₫)", v: 124.8, delta: "+8.4%", spark: [98,108,112,105,118,116,124.8] },
    { k: "Thời gian chờ TB (phút)", v: 18, delta: "-3", spark: [24,22,21,19,20,21,18] },
    { k: "BHYT giám định OK", v: 98.2, delta: "+0.4%", spark: [96,97,97.5,97,97.8,98,98.2] },
  ],
};

module_exports = undefined;

return {
  HOSPITAL, currentUser,
  staff, staffById,
  patients, patientById,
  queue, wards, bedPatientResolve,
  orRooms, orSchedule,
  labs, labRows,
  studies,
  invoices, invoiceLines,
  rxPending,
  inventory,
  erQueue,
  appointments,
  ticker,
  reports,
};
})();

// ============== Clock / mini helpers ==============
window.HIS_UTIL = {
  money: (n) => n.toLocaleString("vi-VN"),
  moneyShort: (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " tr";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
    return String(n);
  },
  sevLabel: (s) => ({ stable: "ỔN ĐỊNH", monitoring: "THEO DÕI", critical: "NGUY KỊCH" }[s] || "—"),
  sevChip: (s) => ({ stable: "ok", monitoring: "warn", critical: "crit" }[s] || "ghost"),
  sevColor: (s) => ({ stable: "var(--s-ok)", monitoring: "var(--s-warn)", critical: "var(--s-crit)" }[s] || "var(--t-4)"),
  statusChip: (s) => ({ waiting: "ghost", "in-progress": "cy", labs: "warn", imaging: "mag", done: "ok" }[s] || "ghost"),
  statusLabel: (s) => ({ waiting: "CHỜ", "in-progress": "KHÁM", labs: "CHỜ XN", imaging: "CHỜ CĐHA", done: "XONG" }[s] || s.toUpperCase()),
  essChip: (e) => ({ "ESI-1": "crit", "ESI-2": "crit", "ESI-3": "warn", "ESI-4": "info", "ESI-5": "ghost" }[e] || "ghost"),
};