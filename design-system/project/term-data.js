// Shared mock data for the HIS Terminal prototype.
window.HIS_DATA = (function(){
  const patients = [
    { id: "BN-00142", name: "Nguyễn Văn An", age: 54, gender: "M", phone: "0912 345 678", insurance: "BHYT HN4-54321", allergy: ["Penicillin"], bloodType: "O+", address: "Ba Đình, Hà Nội" },
    { id: "BN-00189", name: "Trần Thị Bình", age: 32, gender: "F", phone: "0987 654 321", insurance: "BHYT HN3-98765", allergy: [], bloodType: "A+", address: "Cầu Giấy, Hà Nội" },
    { id: "BN-00201", name: "Lê Hoàng Cường", age: 67, gender: "M", phone: "0901 223 344", insurance: "BHYT HN2-11223", allergy: ["Aspirin","Sulfa"], bloodType: "B+", address: "Hai Bà Trưng, Hà Nội" },
    { id: "BN-00223", name: "Phạm Minh Dũng", age: 45, gender: "M", phone: "0933 445 566", insurance: "Dịch vụ", allergy: [], bloodType: "AB+", address: "Đống Đa, Hà Nội" },
    { id: "BN-00256", name: "Hoàng Thị Em", age: 28, gender: "F", phone: "0977 889 900", insurance: "BHYT HN1-33445", allergy: [], bloodType: "O-", address: "Thanh Xuân, Hà Nội" },
    { id: "BN-00278", name: "Vũ Thanh Phong", age: 71, gender: "M", phone: "0944 556 677", insurance: "BHYT HN5-55667", allergy: ["Iodine"], bloodType: "A-", address: "Long Biên, Hà Nội" },
    { id: "BN-00301", name: "Đặng Thu Giang", age: 38, gender: "F", phone: "0966 778 899", insurance: "Dịch vụ", allergy: [], bloodType: "B-", address: "Hà Đông, Hà Nội" },
    { id: "BN-00312", name: "Bùi Quang Huy", age: 52, gender: "M", phone: "0955 889 977", insurance: "BHYT HN2-77889", allergy: [], bloodType: "O+", address: "Tây Hồ, Hà Nội" },
  ];

  const queue = [
    { pid: "BN-00142", token: "A012", arrived: "07:42", priority: "normal", status: "waiting", reason: "Đau thượng vị 3 ngày", vitals: { bp: "138/92", hr: 84, temp: 37.2, spo2: 98 } },
    { pid: "BN-00189", token: "A013", arrived: "07:55", priority: "normal", status: "in-progress", reason: "Khám thai 28 tuần", vitals: { bp: "118/76", hr: 78, temp: 36.8, spo2: 99 } },
    { pid: "BN-00201", token: "A014", arrived: "08:02", priority: "urgent", status: "waiting", reason: "Khó thở, đau ngực trái", vitals: { bp: "162/98", hr: 102, temp: 37.0, spo2: 94 } },
    { pid: "BN-00223", token: "A015", arrived: "08:10", priority: "normal", status: "waiting", reason: "Tái khám THA", vitals: { bp: "142/88", hr: 76, temp: 36.7, spo2: 98 } },
    { pid: "BN-00256", token: "A016", arrived: "08:18", priority: "normal", status: "labs", reason: "Chóng mặt, buồn nôn", vitals: { bp: "108/68", hr: 88, temp: 37.1, spo2: 99 } },
    { pid: "BN-00278", token: "A017", arrived: "08:25", priority: "normal", status: "waiting", reason: "Đái tháo đường - tái khám", vitals: { bp: "134/82", hr: 72, temp: 36.6, spo2: 97 } },
    { pid: "BN-00301", token: "A018", arrived: "08:33", priority: "normal", status: "waiting", reason: "Ho kéo dài 2 tuần", vitals: { bp: "122/78", hr: 80, temp: 37.4, spo2: 97 } },
    { pid: "BN-00312", token: "A019", arrived: "08:40", priority: "normal", status: "waiting", reason: "Đau lưng mạn", vitals: { bp: "128/84", hr: 74, temp: 36.8, spo2: 98 } },
  ];

  const wards = [
    { id: "W-I", name: "Khoa Nội A", shortName: "Nội A", beds: 24,
      rooms: [
        { id: "P.301", beds: [
          { n: "301-1", patient: { name: "Phạm Văn K.", id: "BN-00088", dx: "Viêm phổi cộng đồng" }, status: "occupied", severity: "stable", los: 3 },
          { n: "301-2", patient: null, status: "free", severity: null, los: 0 },
          { n: "301-3", patient: { name: "Nguyễn Thị M.", id: "BN-00102", dx: "Đợt cấp COPD" }, status: "occupied", severity: "critical", los: 5 },
          { n: "301-4", patient: null, status: "cleaning", severity: null, los: 0 },
        ]},
        { id: "P.302", beds: [
          { n: "302-1", patient: { name: "Lê Văn T.", id: "BN-00115", dx: "ĐTĐ type 2 biến chứng" }, status: "occupied", severity: "monitoring", los: 2 },
          { n: "302-2", patient: { name: "Trần Thị H.", id: "BN-00121", dx: "Suy tim NYHA III" }, status: "occupied", severity: "stable", los: 7 },
          { n: "302-3", patient: null, status: "free", severity: null, los: 0 },
          { n: "302-4", patient: { name: "Vũ Văn D.", id: "BN-00133", dx: "Viêm dạ dày cấp" }, status: "occupied", severity: "stable", los: 1 },
        ]},
        { id: "P.303", beds: [
          { n: "303-1", patient: { name: "Đặng Thị L.", id: "BN-00141", dx: "TBMN nhẹ" }, status: "occupied", severity: "monitoring", los: 4 },
          { n: "303-2", patient: null, status: "reserved", severity: null, los: 0 },
          { n: "303-3", patient: { name: "Hoàng Văn N.", id: "BN-00145", dx: "Tăng HA độ 3" }, status: "occupied", severity: "stable", los: 2 },
          { n: "303-4", patient: { name: "Bùi Thị O.", id: "BN-00159", dx: "Viêm tụy cấp" }, status: "occupied", severity: "critical", los: 3 },
        ]},
      ]},
    { id: "W-N", name: "Khoa Ngoại", shortName: "Ngoại", beds: 20,
      rooms: [
        { id: "P.501", beds: [
          { n: "501-1", patient: { name: "Phạm Ngọc P.", id: "BN-00162", dx: "Hậu phẫu ruột thừa" }, status: "occupied", severity: "stable", los: 1 },
          { n: "501-2", patient: null, status: "free", severity: null, los: 0 },
          { n: "501-3", patient: { name: "Trần Văn Q.", id: "BN-00168", dx: "Gãy xương đùi P" }, status: "occupied", severity: "monitoring", los: 4 },
          { n: "501-4", patient: null, status: "free", severity: null, los: 0 },
        ]},
        { id: "P.502", beds: [
          { n: "502-1", patient: { name: "Lê Minh R.", id: "BN-00173", dx: "Sỏi mật - chờ PT" }, status: "occupied", severity: "stable", los: 0 },
          { n: "502-2", patient: { name: "Đỗ Văn S.", id: "BN-00179", dx: "Thoát vị bẹn P" }, status: "occupied", severity: "stable", los: 2 },
          { n: "502-3", patient: null, status: "cleaning", severity: null, los: 0 },
          { n: "502-4", patient: null, status: "free", severity: null, los: 0 },
        ]},
      ]},
    { id: "W-S", name: "Khoa Sản", shortName: "Sản", beds: 16,
      rooms: [
        { id: "P.701", beds: [
          { n: "701-1", patient: { name: "Nguyễn Thị U.", id: "BN-00188", dx: "Hậu sản thường" }, status: "occupied", severity: "stable", los: 1 },
          { n: "701-2", patient: { name: "Phạm Thị V.", id: "BN-00195", dx: "Hậu mổ đẻ" }, status: "occupied", severity: "stable", los: 2 },
          { n: "701-3", patient: null, status: "free", severity: null, los: 0 },
          { n: "701-4", patient: null, status: "free", severity: null, los: 0 },
        ]},
      ]},
  ];

  const orSchedule = [
    { or: "OR-1", start: "07:30", end: "09:30", pt: "Trần Văn Q.", pid: "BN-00168", proc: "Kết hợp xương đùi P", surgeon: "BS Khải", status: "done" },
    { or: "OR-1", start: "10:00", end: "12:00", pt: "Lê Minh R.", pid: "BN-00173", proc: "Cắt túi mật nội soi", surgeon: "BS Khải", status: "in-progress" },
    { or: "OR-1", start: "13:30", end: "15:00", pt: "Đỗ Văn S.", pid: "BN-00179", proc: "Mổ thoát vị bẹn", surgeon: "BS Khải", status: "scheduled" },
    { or: "OR-2", start: "08:00", end: "10:30", pt: "Phạm Thị V.", pid: "BN-00195", proc: "Mổ đẻ chủ động", surgeon: "BS Hà", status: "done" },
    { or: "OR-2", start: "11:00", end: "12:30", pt: "Nguyễn Thu A.", pid: "BN-00211", proc: "Mổ u xơ tử cung", surgeon: "BS Hà", status: "scheduled" },
    { or: "OR-3", start: "07:30", end: "10:00", pt: "Vũ Văn X.", pid: "BN-00220", proc: "Phaco - IOL 2 mắt", surgeon: "BS Minh", status: "done" },
    { or: "OR-3", start: "10:30", end: "11:30", pt: "Lê Thị Y.", pid: "BN-00229", proc: "Phaco P", surgeon: "BS Minh", status: "in-progress" },
    { or: "OR-4", start: "09:00", end: "13:00", pt: "Hoàng Văn Z.", pid: "BN-00234", proc: "Thay khớp háng P", surgeon: "BS Khải", status: "scheduled" },
    { or: "OR-4", start: "14:00", end: "15:30", pt: "Bùi Thị B.", pid: "BN-00241", proc: "Nội soi khớp gối T", surgeon: "BS Khải", status: "scheduled" },
  ];

  const invoices = [
    { id: "HD-2026-00872", pt: "Nguyễn Văn An", pid: "BN-00142", date: "18/04", items: 8, total: 2_340_000, paid: 0, status: "unpaid", kind: "OPD" },
    { id: "HD-2026-00871", pt: "Trần Thị Bình", pid: "BN-00189", date: "18/04", items: 3, total: 680_000, paid: 680_000, status: "paid", kind: "OPD" },
    { id: "HD-2026-00870", pt: "Phạm Văn K.", pid: "BN-00088", date: "18/04", items: 22, total: 12_480_000, paid: 8_000_000, status: "partial", kind: "IPD" },
    { id: "HD-2026-00869", pt: "Lê Minh R.", pid: "BN-00173", date: "17/04", items: 14, total: 18_960_000, paid: 0, status: "unpaid", kind: "Surgery" },
    { id: "HD-2026-00868", pt: "Vũ Thanh Phong", pid: "BN-00278", date: "17/04", items: 5, total: 1_240_000, paid: 1_240_000, status: "paid", kind: "OPD" },
    { id: "HD-2026-00867", pt: "Nguyễn Thị M.", pid: "BN-00102", date: "17/04", items: 18, total: 7_650_000, paid: 7_650_000, status: "paid", kind: "IPD" },
    { id: "HD-2026-00866", pt: "Hoàng Thị Em", pid: "BN-00256", date: "16/04", items: 6, total: 2_100_000, paid: 0, status: "unpaid", kind: "OPD" },
    { id: "HD-2026-00865", pt: "Đặng Thu Giang", pid: "BN-00301", date: "16/04", items: 4, total: 950_000, paid: 950_000, status: "paid", kind: "OPD" },
  ];

  const studies = [
    { id: "ACC-88712", pt: "Lê Hoàng Cường", pid: "BN-00201", modality: "CT", body: "Ngực - cản quang", ordered: "08:14", priority: "STAT", status: "in-progress", refDr: "BS Linh" },
    { id: "ACC-88711", pt: "Phạm Văn K.", pid: "BN-00088", modality: "CR", body: "X-quang ngực PA", ordered: "07:52", priority: "Routine", status: "completed", refDr: "BS Linh" },
    { id: "ACC-88710", pt: "Trần Thị Bình", pid: "BN-00189", modality: "US", body: "Siêu âm sản", ordered: "07:45", priority: "Routine", status: "reported", refDr: "BS Hà" },
    { id: "ACC-88709", pt: "Nguyễn Thị M.", pid: "BN-00102", modality: "CT", body: "CT Scan Ngực HRCT", ordered: "07:10", priority: "Routine", status: "reported", refDr: "BS Linh" },
    { id: "ACC-88708", pt: "Vũ Văn D.", pid: "BN-00133", modality: "MRI", body: "Cộng hưởng từ ổ bụng", ordered: "06:55", priority: "Routine", status: "scheduled", refDr: "BS Đạt" },
    { id: "ACC-88707", pt: "Đặng Thị L.", pid: "BN-00141", modality: "MRI", body: "MRI sọ não", ordered: "06:30", priority: "STAT", status: "completed", refDr: "BS Linh" },
    { id: "ACC-88706", pt: "Hoàng Văn N.", pid: "BN-00145", modality: "CR", body: "X-quang cột sống TL", ordered: "06:15", priority: "Routine", status: "reported", refDr: "BS Khải" },
  ];

  const labs = [
    { id: "XN-2026-4419", pt: "Lê Hoàng Cường", pid: "BN-00201", panel: "Sinh hoá máu + Troponin I", priority: "STAT", collected: "08:20", status: "running", tat: "30p", abnormal: 2 },
    { id: "XN-2026-4418", pt: "Nguyễn Văn An", pid: "BN-00142", panel: "CTM + CRP", priority: "Routine", collected: "08:05", status: "verified", tat: "—", abnormal: 1 },
    { id: "XN-2026-4417", pt: "Hoàng Thị Em", pid: "BN-00256", panel: "Beta-hCG định lượng", priority: "Routine", collected: "07:58", status: "running", tat: "1h", abnormal: 0 },
    { id: "XN-2026-4416", pt: "Vũ Thanh Phong", pid: "BN-00278", panel: "HbA1c + Glucose + Lipid", priority: "Routine", collected: "07:40", status: "verified", tat: "—", abnormal: 2 },
    { id: "XN-2026-4415", pt: "Trần Thị Bình", pid: "BN-00189", panel: "TPTNT + Cấy NT", priority: "Routine", collected: "07:22", status: "verified", tat: "—", abnormal: 0 },
    { id: "XN-2026-4414", pt: "Phạm Văn K.", pid: "BN-00088", panel: "Khí máu động mạch", priority: "STAT", collected: "07:00", status: "verified", tat: "—", abnormal: 1 },
    { id: "XN-2026-4413", pt: "Đặng Thu Giang", pid: "BN-00301", panel: "AFP + CEA + CA 19-9", priority: "Routine", collected: "06:40", status: "pending", tat: "4h", abnormal: 0 },
  ];

  const patientById = (id) => patients.find(p => p.id === id);

  return { patients, queue, wards, orRooms: ["OR-1","OR-2","OR-3","OR-4"], orSchedule, invoices, studies, labs, patientById };
})();
