# MQSoft EMR Forms & Digital Signature — From Desktop EMR + CKS Documents

The EMR forms represent Vietnamese hospital documentation standards (TT32, BYT templates). The 22 specialty BA types are required for different clinical departments.

---

## HSBA Nội trú Structure (7-Tab Digital Form)

From screenshots of Module 37 digitization:
- **Trang 1:** Administrative info (Mã BN, Họ tên, Tuổi, Giới, Địa chỉ, BHYT, Ngày vào viện, Khoa, Giường, Chẩn đoán)
- **Trang 2:** Câu hỏi quản lý, Tiền sử bản thân, Clinical assessment
- **Trang 3:** Công xét nghiệm (lab results summary), Phương pháp điều trị, Tình trạng ra viện
- **Trang 4-7:** Additional clinical pages

## Tờ điều trị (Daily Treatment Sheet)

### Desktop EMR Layout — Split View
- **Left panel:** Patient list with date filter
- **Right panel:** Treatment details — date/time, diagnosis, disease progression (diễn biến), Y lệnh (medical orders), medications with dosage

### Web EMR Layout — Sidebar Navigation
- BỆNH ÁN: Mẫu Bệnh Án, Hồ Sơ Bệnh Án
- CHỨC NĂNG: Tờ Điều Trị, Phiếu Truyền Dịch, Phiếu Chăm Sóc
- TRA CỨU: Hồ Sơ Bệnh Nhân, Thông Tin Bệnh Nhân

### Web EMR Form Fields
Y lệnh (dropdown), Thời gian, Chẩn đoán, Chẩn đoán kèm theo, Ghi chú chẩn đoán, Chế độ chăm sóc, Chế độ ăn, Loại thức ăn, Nhóm tuổi

### CLS Ordering Form
Đối tượng, Thời gian, Dịch vụ, Số lượng, Ghi chú

### Drug Ordering Form
Đối tượng, Kho, Thuốc, Ngày/lần, Mỗi lần, Số lượng, Cách dùng

---

## 47 Medical Form Templates (Phiếu/Giấy tờ y khoa)

### Implemented Forms with Screenshots
1. Tóm tắt HSBA (Medical record summary)
2. Tường trình PTTT (Surgery narrative report)
3. Bàn giao NB — Bác sĩ version (Doctor patient handoff)
4. Bàn giao NB — Điều dưỡng version (Nurse patient handoff)
5. Phiếu gây mê hồi sức — 4 pages (Anesthesia record)
6. Phiếu theo dõi truyền dịch (Infusion monitoring) — protocol list with timing, solutions, volumes
7. Tờ điều trị (Daily treatment sheet)
8. Phiếu chăm sóc cấp 1 TT32 (Level 1 nursing care per Circular 32)
9. Phiếu chăm sóc cấp 2 TT32 (Level 2 nursing care)
10. Phiếu nhận định cấp cứu (Emergency assessment)
11. Cam kết nhập viện (Admission consent)
12. Phiếu khám thai — 4 pages (Prenatal examination)
13. Biên bản hội chẩn (Consultation minutes)
14. Biên bản kiểm thảo tử vong (Death review minutes)
15. Phiếu khám vào viện (Admission examination form)
16-47. (+32 more forms marked "Cập nhật sau" in documentation)

### Phiếu chăm sóc cấp 1 TT32 Fields (from screenshot)
- Toàn thân (General condition)
- Da, niêm mạc (Skin, mucous membranes)
- Tri giác (Consciousness)
- Hô hấp: Khó thở, Thở Oxy, Hóc (Respiratory)
- Tuần hoàn: Tình chất mạch (Circulation)
- Vệ sinh cá nhân: Tình trạng (Personal hygiene)
- Thần kinh: Trạng thái (Neurology)
- GDSK: Nhu cầu tư vấn (Health education)
- Giấc ngủ, nghỉ ngơi (Sleep/rest)
- Vận động, phản (Motor function)
- Nước nhập/xuất, Tổng nhập/xuất (Fluid I/O)
- Dấu sinh tồn: SpO2, Mạch, Huyết áp, Nhiệt độ (Vitals)
- Chẩn đoán (Diagnosis)
- Mục tiêu (Nursing goals)
- GHI CHÚ BÀN GIAO (Handoff notes)

---

## 22 Specialty Medical Record Types (Bệnh án chuyên khoa)

Each has 4-7 page templates with specialty-specific fields:

1. **Nội** (Internal Medicine)
2. **Ngoại** (Surgery)
3. **Nhi** (Pediatrics)
4. **Phụ khoa** (Gynecology)
5. **Sản khoa** (Obstetrics) — includes birth register, partograph
6. **Sơ sinh** (Neonatology)
7. **TMH** (ENT)
8. **Truyền nhiễm** (Infectious Disease)
9. **RHM** (Dental)
10. **Mắt — Thường** (Ophthalmology — General)
11. **Mắt — Glaucoma** (Ophthalmology — Glaucoma)
12. **Mắt — Tật khúc xạ** (Ophthalmology — Refractive)
13. **Tâm thần** (Psychiatry)
14. **Da liễu** (Dermatology)
15. **Bỏng** (Burns)
16. **Ung bướu** (Oncology)
17. **Huyết học** (Hematology)
18. **YHCT — Nội** (Traditional Medicine — Internal)
19. **YHCT — Ngoại** (Traditional Medicine — Surgery)
20. **YHCT — Châm cứu** (Traditional Medicine — Acupuncture)
21. **YHCT — Phụ** (Traditional Medicine — Gynecology)
22. **Ngoại trú** (Outpatient) — 3 subtypes: Thường, RHM, Mắt

---

## Digital Signature (Chữ ký số CKS) — 17 pages HDSD

### 4-Level Signing Flow
1. BS làm BA ký (Attending physician signs)
2. BS tổng kết ký (Summarizing physician signs)
3. Trưởng khoa ký (Department head signs)
4. Lãnh đạo (Giám đốc) ký (Hospital director signs)

### Giấy ra viện (Discharge Letter) Flow
- User trưởng khoa: Mở form → Nhập đầy đủ thông tin → Ký số trưởng khoa (button "Ký CKS")
- → Xong → Trình ký số lãnh đạo
- Lãnh đạo: Filter by (Từ ngày→Đến ngày, Loại giấy: giấy ra viện/giấy chứng nhận PTTT..., Trạng thái: Chờ ký/Tất cả/Đã ký)
- → Check chọn ô vuông → Click "Ký CKS" → Hoàn thành

### Signing Table Columns
Trạng thái, Bác sĩ ký, Bác sĩ, Trưởng khoa ký, Trưởng khoa, Giám đốc ký, Giám đốc, Mã BN, Họ tên, Ngày sinh

### Storage
PDF signed files at `pdf\[type]\sign\[id]_[timestamp]_rpt_[formname]_signed.pdf`

### Actions
Ký CKS (Sign), Hủy CKS (Cancel signature), Xem CKS (View signature)

### Patient Biometric Fingerprint
Device integration for patient to sign medical records with fingerprint

---

## Tổng kết hồ sơ (Record Summary)

### Checklist of 20+ Documents in Complete Medical Record
- Trang 1-4 (HSBA pages)
- Phiếu kết quả CDM
- Phiếu kết quả xét nghiệm
- Various clinical forms
- Each with page count and scan status

**Printed version:** Formal "Giấy cam kết sử dụng dịch vụ" format with hospital header
