# MQSoft Clinical Workflows — From Actual UI Screenshots

These workflows are verified from real screenshots in production. They represent standard Vietnamese hospital operations.

---

## Reception (Tiếp đón) — 29 pages HDSD

### Đặt khám (Appointment)
1. View appointment list → filter by date
2. Add/edit/delete appointment
3. Save → Print phiếu đặt khám
4. Export Excel

### Đăng ký khám (Registration)
1. QR scan BHYT/CCCD (Cách 1) OR manual Mã BN entry (Cách 2)
2. Auto-fill patient info from previous records
3. Select phòng khám (single or multiple rooms)
4. System checks: BHYT validity online, previous prescriptions, cost estimation
5. Print registration slip with queue number
6. Patient proceeds to clinic

**Key UI areas:** Thông tin hành chính (admin info), Lịch sử đăng ký khám (registration history), Thông tin đặt khám (appointment info), Khung tổng quát (summary: quantity, fee type, sorted by khoa/phòng/số lượng)

**Cảnh báo BN:** Color-coded warning system with notes per patient

---

## OPD Examination (Phòng khám) — 57 pages HDSD

### 7-step Clinical Flow
1. Ghi nhận chẩn đoán (Record diagnosis)
2. Chỉ định CLS/PTTT (Order labs/imaging/procedures)
3. Xem nhanh kết quả CLS (Quick view results)
4. Xem bệnh sử/BAĐT (View history/EMR)
5. Ghi nhận ICD-10 (Record ICD codes)
6. Ra toa thuốc điện tử có mã vạch (E-prescription with barcode)
7. Chuyển phòng khám/nhập viện (Transfer/admit)

### CLS Ordering (F7)
- One by one (nhập từng món)
- Batch select (chọn nhiều CLS cùng lúc)
- Package ordering (gói CLS with prices)
- Edit patient type (sửa đối tượng CLS)
- Cancel single/bulk CLS

### Prescription (F3-F5)
- Standard prescription
- Dual warehouse YHCT (2 kho)
- Change drug type (thay đổi đối tượng thuốc)
- CRUD operations
- ICD-BHYT constraint checking

### Surgery/Procedure (F4)
- Tường trình PTTT (surgery narrative)
- Select procedure images

### Treatment Decision (Xử trí)
- Lập bệnh án ngoại trú (create outpatient record)
- Hẹn tái khám (schedule follow-up)
- Nhập viện (admit to inpatient)
- Chuyển viện (transfer to another hospital)

### Payment at Clinic
- BHYT patients → Tạm ứng (advance) → Thu viện phí (collect fee after BHYT)
- Fee patients → Direct collection
- Duyệt giảm (discount approval)
- Hoàn trả tất cả / chi tiết (refund all/detail)

**Other Functions:** Comorbidities (F-key), Drug allergies, Medical history, Emergency cabinet (F10), View/print XN results, Print CĐHA results, Admission exam form, View HSBA (F12), Print outpatient HSBA, Consultation minutes

---

## Inpatient Doctor (Nội trú BS) — 36 pages HDSD

**Main screen "Hiện diện":** Patient list by department with tabs for HSBA, Tờ điều trị, CLS, Y lệnh

### Tờ điều trị (Treatment Sheet)
1. Click "Mới" (New)
2. Enter diễn biến bệnh (disease progression) — free text
3. Enter chẩn đoán + chẩn đoán kèm theo (ICD, multiple supported)
4. Y lệnh (Medical orders) — 3 types:
   - **Thường qui (Phiếu lĩnh):** Regular drug requisition — select from drug list, set dosage, auto-calculate quantity. Status: Đang nhập (drafting) / Chưa nhập (pending pharmacy)
   - **Xuất tủ trực:** Emergency drugs from ward cabinet — immediate dispensing
   - **Hoàn trả:** Return unused drugs to pharmacy
5. Chỉ định CLS (F7) — same as OPD (single/batch/cancel)
6. Click "Lưu" (Save)
7. In tờ điều trị — select treatment periods to print

**Xem Bệnh án BN:** Full medical record view with all tabs

### Phòng mổ (Operating Room) — 5 forms
1. Phiếu khám tiền mê (Pre-anesthesia assessment)
2. Phiếu theo dõi gây mê (Anesthesia monitoring — vitals timeline)
3. Kế hoạch sau gây mê – phẫu thuật (Post-anesthesia plan)
4. Phiếu khám tâm lý trước mổ (Pre-surgery psychological assessment)
5. Phiếu cam đoan PTTT (Surgery consent form)

### Specialty Features
- Sổ sinh đẻ (Birth register — obstetrics)
- Sổ theo dõi nạo phá thai (Abortion tracking)
- Chạy thận nhân tạo form (Hemodialysis: Mạch, HA Đứng/Nằm, Nhiệt độ, Nhịp thở, Tốc độ, Áp lực, PTM, Tái dịch, Biến chứng, Thuốc, Cân nặng trước/sau)

---

## Pharmacy (Dược) — 28 pages HDSD

### Kho (Warehouse)
- Nhập kho: Phiếu nhập kho, Phiếu tái nhập kho, Phiếu nhập ký gửi, Tổng hợp phiếu xuất ký gửi, Biên bản kiểm nhập
- Nhập fields: Ngày nhập, Hóa đơn, BB kiểm số, Ngày lập BB, Nhà cung cấp
- Xuất chuyển kho: Phiếu xuất chuyển kho (create/edit/delete)
- Dự trù: Phiếu dự trù → Duyệt cấp theo kho dự trù
- Duyệt cấp/bổi thuốc VTYT

### Ngoại trú BHYT
- Phát thuốc BHYT (dispense)
- Hủy phát thuốc BHYT (cancel dispensing)

**Chức năng khác:** Xem chi tiết thuốc, dịch vụ BN

---

## Laboratory (Xét nghiệm) — 50 pages HDSD total

### Lấy mẫu bệnh phẩm (Sample Collection)
1. Enter screen (OPD vs Inpatient — different workflows)
2. Select patient from queue
3. Process: Print barcode label → collect sample → confirm
4. Cancel sample if needed
5. Add tests to same sample
6. View sample history
7. Schedule future collection
8. Check reagent stock (cabinet + warehouse)

### Trả kết quả (Result Return)
1. Enter "Phiếu kết quả XN"
2. Select result approver (Người duyệt kết quả)
3. Process at lab department: Enter results → Auto-populate from analyzer (Kết quả máy) → Review → Approve
4. Process at bedside (Inpatient): Trả kết quả XN tại giường
5. Edit result form if needed
6. Result abbreviation templates (Khai báo viết tắt)
7. Manage lab reagents (Hóa chất XN): Add, edit type, track usage
8. View HSBA BN

---

## Radiology (CĐHA) — 36 pages HDSD total

### Điều phối (Dispatch)
1. View patient queue (Danh sách)
2. Select patient → Show CĐHA services ordered
3. Select execution room for each service
4. Print dispatch slip
5. Cancel dispatch if needed

### Thực hiện (Execution)
1. Enter CĐHA screen
2. Process: Select patient → Enter results (with templates) → Save
3. Result abbreviation templates
4. Dispense drugs/supplies (Xuất thuốc – VTYT)
5. Add additional services
6. Enter biopsy results (Nhập sinh thiết)

**4 modalities:** Siêu âm, Nội soi, X-Quang, CT-Scanner/MRI
