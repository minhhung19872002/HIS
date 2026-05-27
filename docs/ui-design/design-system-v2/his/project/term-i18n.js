(function(){
  const DICT = {
    "nav.dashboard": { vi: "Tổng quan", en: "Dashboard" },
    "nav.reception": { vi: "Tiếp nhận", en: "Reception" },
    "nav.opd": { vi: "Khám ngoại trú", en: "Outpatient" },
    "nav.ipd": { vi: "Nội trú", en: "Inpatient" },
    "nav.surgery": { vi: "Phẫu thuật", en: "Surgery" },
    "nav.billing": { vi: "Thanh toán", en: "Billing" },
    "nav.ris": { vi: "CĐHA", en: "Imaging" },
    "nav.lis": { vi: "Xét nghiệm", en: "Lab" },
    "nav.settings": { vi: "Cài đặt", en: "Settings" },
    "c.today": { vi: "Hôm nay", en: "Today" },
    "c.search_hint": { vi: "Tìm bệnh nhân, mã BN, hoặc gõ lệnh…", en: "Search patients, MRN, or type a command…" },
    "c.patient": { vi: "Bệnh nhân", en: "Patient" },
    "c.mrn": { vi: "Mã BN", en: "MRN" },
    "c.age": { vi: "Tuổi", en: "Age" },
    "c.gender": { vi: "Giới", en: "Sex" },
    "c.status": { vi: "Trạng thái", en: "Status" },
    "c.action": { vi: "Thao tác", en: "Action" },
    "c.male": { vi: "Nam", en: "M" },
    "c.female": { vi: "Nữ", en: "F" },
    "c.close": { vi: "Đóng", en: "Close" },
    "c.save": { vi: "Lưu", en: "Save" },
    "c.cancel": { vi: "Huỷ", en: "Cancel" },
  };
  const STORE = "his.term.lang";
  window.__lang = localStorage.getItem(STORE) || "vi";
  window.t = (k) => (DICT[k] && (DICT[k][window.__lang] || DICT[k].en)) || k;
  window.setLang = (lang) => { window.__lang = lang; localStorage.setItem(STORE, lang); window.dispatchEvent(new Event("lang-changed")); };
})();
