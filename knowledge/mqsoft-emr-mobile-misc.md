# EMR Mobile, Giải pháp & Phương pháp luận, TTB-VPP
> Sources: 3 PDFs (23 + 12 + 6 = 41 pages)
> Extracted: 2026-06-01

---

## Part 1: Mobile EMR App

> Document: HƯỚNG DẪN SỬ DỤNG APP MOBILE (23 pages)
> Context: App mobile cho bác sĩ/nhân viên y tế xem và nhập hồ sơ bệnh án nội trú trên iOS/Android.
> Demo hospital: Bệnh Viện Đại Học Y Dược Buôn Ma Thuột (BUH)

---

### 1. Hướng dẫn sử dụng phần mềm

#### 1.1 Màn hình đăng nhập

Nhập thông tin tên đăng nhập và mật khẩu.

**UI Screen — Login:**
- Header: Logo bệnh viện (teal background, hình hoa/cross màu xanh-trắng), tên bệnh viện
- Field: **Tên đăng nhập** (icon khóa, placeholder "Tên đăng nhập")
- Field: **Mật khẩu** (icon khóa, placeholder "Mật khẩu")
- Button: **Đăng nhập** (teal full-width)
- Color scheme: Teal (#008080 approx) header, white card body
- Status bar: 10:05, signal + WiFi + battery icons

---

#### 1.2 Màn hình chọn khoa, bệnh án

Sau khi đăng nhập thành công, hiển thị màn hình chọn phòng ban và mẫu bệnh án.

**UI Screen — Chọn khoa:**
- Greeting: "Xin chào **Trần Tuấn Dũng**" + "Vui lòng chọn thông tin bên dưới để tiếp tục quản lý thông tin"
- Dropdown: **Chọn phòng ban** → ví dụ hiển thị "KHOA NGOẠI TỔNG HỢP" (icon building)
- Dropdown: **Chọn mẫu bệnh án** (icon cross/medical)
- Button: **Đăng nhập** (teal full-width)
- Background: decorative teal blob + hexagonal network pattern

**Bottom sheet — Chọn mẫu bệnh án:**
- Header: "Chọn mẫu bệnh án" + nút [X]
- Option: "Bệnh án ngoại khoa"
- (Scrollable list các mẫu bệnh án)

---

#### 1.3 Màn hình danh sách bệnh nhân

Hiển thị toàn bộ bệnh nhân trong khoa đang chọn.

**UI Screen — Bệnh Án (Patient List):**
- Header: "Bệnh án" (teal)
- Search bar: "Nhập tên hoặc mã bệnh nhân" (icon kính lúp)
- Counter: **Tổng cộng: (29)**
- Bottom nav: Trang chủ | Bệnh Án (active) | Phẫu thuật bệnh | Tài khoản

**Patient Card (expanded — Vũ Thị Mai Anh):**
```
1. Vũ Thị Mai Anh
[icon calendar] 23060534  [icon calendar] 26/12/2001 (22 Tuổi)
[icon person] BS.Nguyễn Thị Thai Linh
[icon medical] Mổ lấy thai cho mọt thai

Chẩn đoán: Mổ lấy thai cho mọt thai
Đối tượng: BHYT
Ngày vào viện: 18/05/2023 15:56
Ngày vào khoa: 20/05/2023 20:00
Phòng:
Giường:
Ngày sinh: 25/12/2001
Tuổi: 22
Giới tính: Nữ
Số vào viện: 23000654S
Bác sĩ: BS.Nguyễn Thị Thai Linh
Mã bệnh nhân: 23060534
Họ tên bệnh nhân: Vũ Thị Mai Anh
```
- Button: **[Chọn]** (teal outline, bên phải)

**Patient Card (collapsed — động Thị Bé Ngoan):**
```
2. động Thị Bé Ngoan
[icon] 23000425  [icon] 05/11/1988 (35 Tuổi)
[icon] BS.Nguyễn Thị Thai Linh
[icon] Mổ lấy thai cấp cứu
```
- Chevron down (collapsed)

**Patient Card (collapsed — Phạm Thị Mỹ Hạnh):**
```
3. Phạm Thị Mỹ Hạnh
[icon] 22125758  [icon] 11/11/1989 (34 Tuổi)
[icon] BS.Nguyễn Thị Thảo
[icon] Mổ lấy thai cho mọt thai
```

> Bấm vào nút chọn như hình để chọn bệnh nhân cần thao tác.

---

#### 1.4 Chọn nhập tờ điều trị

Bấm vào nút dấu ">" để bắt đầu nhập tờ điều trị.

**UI Screen — Hồ sơ bệnh án (Patient Record Menu):**
- Header back button + "Hồ sơ bệnh án"
- Patient summary: **VŨ THỊ MAI ANH** | [icon] 23060534  [icon] 25/12/2001 (22 Tuổi)

**Menu items (với icon + chevron >):**

| Icon | Tên mục | Mô tả phụ |
|------|---------|-----------|
| Clipboard/pen | **Tờ điều trị (3)** | Điều chỉnh thông tin tờ điều trị, dự trù thuốc, chỉ định – cận lâm sàng |
| Blood drop | **Phiếu truyền dịch (0)** | Thêm, cập nhật Phiếu truyền dịch |
| Stethoscope | **Phiếu chăm sóc (0)** | Thêm, cập nhật Phiếu chăm sóc |
| Flask/test | **Chỉ định – Cận lâm sàng (0)** | Xem kết quả Chẩn đoán hình ảnh, Xét nghiệm, Đơn thuốc |
| Document | **Biên bản hội chẩn** | Tóm tắt quá trình điền biên bệnh, điều trị và chăm sóc người bệnh |
| Medicine box | **Công khai thuốc** | Tóm tắt quá trình dùng thuốc |

---

#### 1.5 Nhập tờ điều trị

Nhập tờ điều trị như hình: bắt buộc nhập **ngày giờ**, **chẩn đoán**, **diễn biến**. Diễn biến có thể khai báo sẵn chọn chẩn đoán ra diễn biến đã khai báo giảm thời gian nhập lại diễn biến.

**UI Screen — Tạo mới tờ điều trị:**
- Patient header: VŨ THỊ MAI ANH | [icon] 23060534 | [icon] 25/12/2001 (22 Tuổi)
- Field: **Ngày lập** (date picker, icon calendar)
- Dropdown: **Chẩn đoán** (placeholder "Chẩn đoán")
- Dropdown: **Chẩn đoán kèm theo** (placeholder "Chẩn đoán kèm theo")
- Dropdown: **Diễn biến mẫu** (placeholder "Diễn biến mẫu")
- Text: **Diễn biến** (free text input)
- Text: **Ghi chú chẩn đoán** (placeholder "Ghi chú chẩn đoán")
- Dropdown: **Chế độ chăm sóc** (placeholder "Chế độ chăm sóc")
- Button: **Đồng ý** (teal full-width)

---

#### 1.4.1 Nhập dự trù thuốc và cận lâm sàng sau khi lưu tờ điều trị

**UI Screen — Tờ điều trị (tabs):**
- Patient: VŨ TEST EMR | [icon] 25016601 | [icon] 01/01/2000 (23 Tuổi)
- Search: "Nhập tên thuốc"
- Counter: **Tổng cộng: (9)**
- Tabs: **Phiếu lĩnh** | **Dự trù thuốc** (active) | **Từ trực**

**Danh sách dự trù thuốc (sample data):**
```
1. Sugam-BFS
   Dùng ngày 1 lần, mỗi lần 1 ống

2. Băng dính cuộn vải lụa UGOTANA 2...
   Dùng ngày 1 lần, mỗi lần 1 cuộn

3. Ceftrione 1g
   Dùng ngày 1 lần, mỗi lần 1 lọ

4. Gentamicin 80mg
   Dùng ngày 1 lần, mỗi lần 1 ống

5. Ceftrione 1g
   Dùng ngày 1 lần, mỗi lần 1 lọ

6. Diazepam-Hameln 5mg/ml injection
   Dùng ngày 1 lần, mỗi lần 1 ống

7. Anhui DeepBlue COVID-19 (SARS-CoV...)
   Dùng ngày 1 lần, mỗi lần 1 test
```
- Bottom nav: Thông tin cơ bản | Dự trù Thuốc (active) | Chỉ định – Cận lâm sàng

---

#### Nhập dự trù thuốc — Form tạo mới

**Nhập dự trù thuốc:** Chọn đối tượng sử dụng thuốc, sau đó nhập tên thuốc và số lượng. Sau khi nhập xong bấm đồng ý để lưu.

**UI Screen — Tạo mới Dự trù thuốc:**
- Patient: NGUYỄN THỊ MỸ DUNG | [icon] 23000109 | [icon] 04/11/2001 (22 Tuổi)
- Dropdown: **Đối tượng** (placeholder "Đối tượng")
- Dropdown: **Thuốc** (searchable, placeholder "Thuốc")
- Number: **Số lần** (default: 1)
- Number: **Mỗi lần** (default: 1)
- Number: **Số lượng** (default: 1)
- Text: **Cách dùng** (placeholder "Cách dùng")
- Button: **Đồng ý** (teal full-width)

---

#### Nhập tờ chỉ định — Form tạo mới

**Nhập tờ chỉ định:** Chọn đối tượng sử dụng dịch vụ sau đó nhập tên cận lâm sàng cần chỉ định, nhập số lượng chỉ định, thời gian chỉ định và nhấn đồng ý để lưu.

**UI Screen — Tạo mới Chỉ định – Cận lâm sàng:**
- Patient: NGUYỄN THỊ MỸ DUNG | [icon] 23000109 | [icon] 04/11/2001 (22 Tuổi)
- Dropdown: **Đối tượng** (placeholder "Đối tượng")
- Dropdown: **Chỉ định** (searchable, placeholder "Chỉ định")
- Datetime: **Giờ chỉ định** (datetime picker, default: 10:19)
- Number: **Số lượng** (default: 1)
- Text: **Ghi chú** (placeholder "Ghi chú")
- Button: **Đồng ý** (teal full-width)

---

### 2. Hướng dẫn in qua wifi

Các bạn vui lòng sử dụng mạng wifi **HIS OR STAFF** tại bệnh viện.

Khi đó trên điện thoại sẽ hiện thị danh sách máy in được chia sẻ qua wifi → Chọn máy in để in.

**UI Screen — Print Options (iOS native print dialog):**
- Header: Cancel | **Print Options** | [share icon] | **Print**
- **Printer:** Canon LBP223 (f4:30:8d) >
- **Presets:** None >
- **Copies:** 1 [–] [+]
- **Range:** Pages 1-2 >
- **Double-sided:** Toggle ON
- **Paper Size:** A4 >
- **Media & Quality:** Auto Select Feed, Auto Select Media Type, Normal Quality >
- **Layout:** (preview thumbnails — Page 1 of 2, Page 2 of...)

---

### 3. Hướng dẫn xem lại cận lâm sàng, đơn thuốc

#### 3.1 Xem lại cận lâm sàng

Trong màn hình bệnh nhân chọn mục: **Chỉ định – Cận lâm sàng**

**UI Screen — Hồ sơ bệnh án (highlighted: Chỉ định – Cận lâm sàng):**
- Mục được highlight bằng box đỏ
- Description: "Xem kết quả Chẩn đoán hình ảnh, Xét nghiệm, Đơn thuốc"
- (Các mục khác giống section 1.4)

---

#### 3.2 Xem đơn thuốc

Trong màn hình bệnh nhân chọn vào mục: **Công khai thuốc**

**UI Screen — Lần vào viện (Medication History):**
- Patient: NGUYỄN THỊ MỸ DUNG | [icon] 25000109 | [icon] 04/11/2001 (22 Tuổi)
- Filter: **Năm 2023** (dropdown)
- Button: **Tìm kiếm** (teal)
- Counter: danh sách các lần vào viện

**Sample data — Lần vào viện:**
```
1. Ngày vào: 08/05/2023 14:49
   BS.CKI Trần Thị Thanh Trang
   Theo dõi nhịp tim thường

2. Ngày vào: 08/05/2023 14:31
   BS. Hồ Quang Tiến
   Cần tiêm chủng phòng các bệnh nhiễm...

3. Ngày vào: 30/03/2023 15:37
   BS.CKI Trần Thị Thanh Trang
   Theo dõi nhịp tim thường

4. Ngày vào: 08/02/2023 13:00
   BS.CKI Bùi Văn Duy Phúc
   Theo dõi nhịp tim thường

5. Ngày vào: 01/01/2023 14:03
   BS.Phí Thị Thùy An
   Đao sẩy thai
```

> Sau đó chọn xem đơn thuốc của các ngày vào viện.

---

**UI Screen — Lần điều trị → Toa thuốc:**
- Patient: NGUYỄN THỊ MỸ DUNG | [icon] 23000109 | [icon] 04/11/2001 (22 Tuổi)
- Tab header: **Toa thuốc** (active)
- Counter: **Tổng cộng: (1)**

```
1. Ngày: 01/01/2023 14:58
   BS.Phí Thị Thùy An
   [Chọn] button (teal text)
```

**Bottom tabs (4 tabs):**
| Tab | Icon |
|-----|------|
| Toa thuốc (active) | pill/prescription icon |
| Cận lâm sàng | asterisk/star icon |
| Xét nghiệm | lab result icon |
| Xét nghiệm vi sinh | microbiology icon |

---

**UI Screen — Đơn thuốc PDF preview:**
- Header: BUH logo | TRƯỜNG ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT / BỆNH VIỆN ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT | QR code | Mã: 23.0006588
- Section: KHOA KHÁM BỆNH — **ĐƠN THUỐC**
- Patient info:
  - Họ và tên: NGUYỄN THỊ MỸ DUNG  Tuổi: 22  Giới tính: Nữ
  - Hộ và tên bố/mẹ/ người giám hộ: ___  Số CMND: ___
  - Mã BHYT:  Đối tượng: Dịch Vụ/Nặng
  - Địa chỉ: thôn 11  Xã Tâm Thắng Huyện Cư Jút Tỉnh Đắk Nông
  - Chẩn đoán: Đi thường ngày đầu

**Thuốc table:**
| STT | Hoạt chất (Biệt Dược) hàm lượng | Số lượng |
|-----|----------------------------------|---------|
| 1 | Cyclopor 400mg/400mg | 20 viên |
|   | 1 Cách dùng: đê ên đọc, uống 1 Viên, để 1 Viên | |

- Footer: Ngày hẹn tái khám: ___ | giờ phút ngày tháng năm | **Bác sĩ điều trị: Bs Nguyễn Thị Thảo**
- QR code "TRA CỨU KẾT QUẢ ONLINE": quét mã QR truy cập https://buh.vn, tài khoản đăng nhập, mật khẩu
- Instructions: Vui lòng mang theo đơn thuốc này khi tái khám; Tái khám ngay khi có dấu hiệu bất thường; Quý khách hàng vui lòng giữ lại thông tin này để đăng nhập
- Buttons: **[Đóng]** | **[In]**

---

### 4. Xem kết quả chẩn đoán hình ảnh

Chọn vào mục **cận lâm sàng** như hình.

**UI Screen — Lần điều trị → Cận lâm sàng (bottom tab highlighted):**
- Tabs: Toa thuốc | **Cận lâm sàng** (selected, with red box highlight) | Xét nghiệm | Xét nghiệm vi sinh

**UI Screen — Cận lâm sàng list:**
- Tab: **Cận lâm sàng** (active)
- Patient: NGUYỄN THỊ MỸ DUNG | [icon] 23000109 | [icon] 04/11/2001 (22 Tuổi)
- Counter: **Tổng cộng: (6)**

**Sample data:**
```
1. Ngày: 19/05/2023 18:54
   Siêu âm
   BS.Nguyễn Thị Thảo
   Theo dõi nhịp tim và can cơ từ...   ˅

2. Ngày: 08/05/2023 15:53
   Siêu âm
   BS.CKI Nguyễn Thị Phước
   Siêu âm thai nhi trong 3 tháng cuối   ˅

3. Ngày: 30/03/2023 15:53
   Siêu âm
   BS. Lê Triệu Quỳnh Anh
   Siêu âm Doppler thai nhi 3 tháng cuối   ˅

4. Ngày: 08/02/2023 13:24
   Siêu âm
   BS. Hồ Thị Trúc
   Siêu âm 3D/4D thai nhi   ˅

5. Ngày: 01/01/2023 14:37
   Siêu âm
   BS. Hồ Thị Trúc
   Siêu âm do chiều dài kênh cổ tử cung   ˅

6. Ngày: 01/01/2023 14:24
   ...
```

> Bấm vào dấu mũi tên để xem kết quả chẩn đoán hình ảnh.

---

**UI Screen — Kết quả Siêu âm PDF (PHIẾU TRA KẾT QUẢ SIÊU ÂM):**
- Header: BUH logo | TRƯỜNG ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT / BỆNH VIỆN ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT
- Patient: NGUYỄN THỊ MỲ DUNG, Ngày: 19/05/2023, Tuổi: 22, BS: 2001, Khoa phòng: BS. Hồ Thị Trúc

**Nội dung phiếu siêu âm:**
```
I/ TÌNH TRẠNG THAI:
II/ TÌNH TRẠNG NAU:
   Mặt trước / Sau     Nhau: 1    Bề trướng khánh: II
III/ TÌNH TRẠNG ÔI:

IV/ CHẨN ĐOÁN HÌNH ẢNH:
   - Đường kính lưỡng đỉnh (BPD): 92 mm  (97%)
   - Chu vi vòng đầu (HC): 323mm  (79%)
   - Chu vi vòng bụng (AC): 332 mm  (78%)
   - Chiều dài xương đùi (FL): 73 mm  (80%)
   - Cân nặng thai ước tính (EFW): 3827 gram (= 300gram) (39%)

V/ NHẬN XÉT:
   * Bản âm chỉ mức xét nghiệm siêu âm, không phổ hóa lần đó có với kết quả khác

KẾT LUẬN:
THEO DÕI DỰ SINH: 30 / 06 / 2023

BS ngủ: ...
```

- Attached ultrasound image: Doppler waveform and fetal ultrasound screenshot
- Buttons: **[Đóng]** | **[In]**

---

### 5. Xem kết quả xét nghiệm

Chọn vào mục **xét nghiệm** để xem danh sách các xét nghiệm đã làm.

**UI Screen — Lần điều trị → Xét nghiệm:**
- Tab: **Xét nghiệm** (active, highlighted with red box)
- Patient: NGUYỄN THỊ MỸ DUNG | [icon] 23000109 | [icon] 04/11/2001 (22 Tuổi)
- Counter: **Tổng cộng: (2)**

```
1. Ngày: 19/05/2023 14:21    [Chọn]
2. Ngày: 08/02/2023 13:53    [Chọn]
```

> Bấm vào nút chọn để xem chi tiết kết quả.

---

**UI Screen — Kết quả XÉT NGHIỆM PDF:**
- Header: BUH logo | TRƯỜNG ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT / BỆNH VIỆN ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT | QR code
- KHOA KHÁM BỆNH — **XÉT NGHIỆM**
- Patient: NGUYỄN THỊ MỲ DUNG Tuổi 22 Ngày/mẫu: 2200109 Tuổi: 22 Nơi sinh: Nữ
- Địa chỉ: thôn 11 Xã Tâm Thắng Huyện Cư Jút Tỉnh Đắk Nông
- Chẩn đoán: Đi thường ngày đầu

**Bảng kết quả xét nghiệm:**

| Chỉ tiêu xét nghiệm | Kết quả | Khoảng tham chiếu | Đơn vị |
|---------------------|---------|-------------------|--------|
| **Hình thái máu ngoại vi (Huyết đồ)** | | | |
| Hình nhuộm máu NB (Đồng bộ)... | | | |
| Thời gian prothrombin (PT; Thrombine test... | 9.90 | 9 - 1.299 | |
| INR | 0.90 | | giây/% |
| Thời gian Thromboplastin một phần hoạt hóa (APTT, Activated Partial Thromboplastin Time; (TCA/Ka; TCK) bằng tay thủ công mà, dùng tự động) | 20.4 | 23.1 - 42.3 | Tự do |
| APTT | 1.1 | 0.8 - 1.2 | |
| **Tổng phân tích tế bào máu ngoại vi (5 dòng máu):** | | | |
| WBC % | 9.4 | 4.1 - 11 | 10^9/L |
| Neu % | 74.8 | 47 - 75 | % |
| Lym % | 18.6 | 20 - 50 | % |
| Mon % | 3.90 | 0 - 10 | % |
| Eos % | 3.04 | 0 - 5 | % |
| Bas % | 0.08 | 0 - 1.2 | % |
| BASO% | | | |
| RBC | 4.38 | 4 - 6.1 | 10^12/L |
| HGB | 121 | 120 - 165 | g/L |
| HCT | 37.6 | 38 - 50 | % |
| MCV | 85.9 | 80 - 99 | fl |
| MCH | 27.6 | 27 - 33 | pg |
| MCHC | 321 | 316 - 360 | g/L |
| RDW | 13.2 | 11.5 - 14.5 | % |
| PLT | 240 | 150 - 450 | 10^9/L |

**Bảng tiếp (page 2 của PDF):**

| Chỉ tiêu | Kết quả | Khoảng tham chiếu | Đơn vị |
|----------|---------|-------------------|--------|
| (tiếp) | | 9 - 17 | fL |
| Khác | | | |
| T3 CA (ngưỡng) | | 11 - 17 | % |
| Khác | | | |
| F CA | | 13 - 40 | % |
| Tiểu cầu | | | |
| Tổng ngưỡng đặc | | | |
| Hình dạng tiểu cầu | | | |
| **Hình thái Glucose** | 5.6 | 3.9 - 6.4 | mmol/L |
| **Ác tính ALT (GPT)** | 9 | 7 - 46 | U/L |
| **Ác tính AST (PT)** | 31.1 | 10 - 40 | U/L |
| **Hình lượng T3 nền** | | | |
| **Hình lượng Creatinine** | | | |
| Hình nhuộm Creatinine (HbA1c) | 67.0 | 42 - 100 | mmol/L |
| eGFR (Hb Máu định kết kình Theo) | | | |
| (ADPKD Hình lượng cặn lồi) | | | |
| Hình lượng T3 nền | | | |
| Phôi hóa Containers | | | |
| β-HCG (Hộ tình ngoại lai khổi) | | | |

- Buttons: **[Đóng]** | **[In]**

---

### 6. Tờ chăm sóc

**UI Screen — Phiếu chăm sóc (form nhập):**
- Title: **Phiếu chăm sóc**
- Patient info dropdown (collapsed)
- Field: **Ngày điều trị** (date picker)
- Dropdown: **Mức độ chăm sóc** (placeholder "Mức độ chăm sóc")
- Text: **Da niêm** (placeholder "Da niêm")
- Checkbox: **Có tri thức**
- Dropdown: **Tri giác** (placeholder "Tri giác")
- Number: **Cân nặng** (suffix: Kg)
- Number: **Chiều cao của bệnh nhân** (suffix: cm)
- Text: **Chỉ số tính toán giữa weight và height** (placeholder "Chỉ số tính toán giữa weight và height")
- Number: **Nhiệt độ** (suffix: °C)
- Button: **Đồng ý** (teal full-width)

> Ở phiếu chăm sóc nhập đầy đủ các thông tin, in ra như phiếu chăm sóc.

---

**Printed form — PHIẾU CHĂM SÓC (landscape A4):**
- Header: TRƯỜNG ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT / BỆNH VIỆN ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT
- Phiếu số: ___ | Mã bệnh nhân: ___
- Số giường: 02 | Buồng: R10
- Họ tên bệnh nhân: **ĐÀO THỊ KIM XUYÊN (23920829)**
- Tuổi: nữ | Giới: Nữ
- Chẩn đoán: Điều trị tăng huyết lực

**Bảng chăm sóc (multi-column, by date/shift):**

| Ngày | 06/11/2023 | 07/11/2023 | 07/11/2023 |
|------|-----------|-----------|-----------|
| Giờ | 23:30 | 08:00 | 20:00 |
| **Phần chăm sóc:** | | | |
| Tỉa niêm | Hồng | Hồng | Hồng |
| Tri giác | Tỉnh, tiếp xúc tốt | Tỉnh, tiếp xúc tốt | Tỉnh, tiếp xúc tốt |
| BMI | 00 | 00 | 00 |
| Nhiệt độ (°C) | 37.0 | 37.0 | 37.0 |
| Mạch (lần) | 160/100 | 120/100 | 120/100 |
| Huyết áp (mmHg) | | | |
| Nhịp thở (lần/phút) | | | |
| Cân nặng (Kg) | | | |
| **Hộ lý vật cứu – Dịch vụ** | | | |
| Hội lý: vật cứu tụ | Không | Không | Không |
| Hội cứu: Không tự | Không | Không | Không |
| Tiêu | Bình thường | | Tự đi |
| Phần vệ sinh | Bình thường | Bình thường | Bình thường |
| **Chăm sóc diều dưỡng; Lượng giá sức chăm sóc bởi GĐSK/NVCN:** | (multi-column notes) | | |

- Footer: **Cánh báo sức** | **Diều dưỡng thực hiện** (3 signatures)

---

### 7. Phiếu dịch truyền

**UI Screen — Phiếu truyền dịch (form nhập):**
- Patient: VŨ TEST EMR | [icon] 23016601 | [icon] 01/01/2000 (23 Tuổi)
- Row 1: **Ngày truyền dịch** (date) + **Giờ** (time, default: 18:51)
- Field: **Tên dịch truyền/ hàm lượng** (text, example: "Glucoza 5%")
- Field: **Lô/ số sản xuất** (text, example: "12/2023")
- Row: **Số lượng** (number, default: 1) + **Tốc độ giọt/ph** (number, default: 30)
- Row: **Bắt đầu** (date 22/12/2023) + **Giờ** (18:51)
- Row: **Kết thúc** (date 22/12/2023) + **Giờ** (20:52)
- Section header (teal): **Chỉ số sinh tồn trước khi truyền**
- Field: **Mạch (l/p)** (default: 80) + **Huyết áp (mmHg)** (default: 120/80)
- Field: **Nhiệt độ (°C)** (default: 37) + **Nhịp thở** (default: 70)
- Section header (teal): **Chỉ số sinh tồn sau khi truyền**
- Field: **Mạch (l/p)** + **Huyết áp (mmHg)** (scrollable below)
- Button: **Đồng ý** (teal full-width)

---

**Printed form — PHIẾU THEO DÕI TRUYỀN DỊCH (landscape A4):**
- Header: TRƯỜNG ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT / BỆNH VIỆN ĐẠI HỌC Y DƯỢC BUÔN MA THUỘT
- MS: 17BV – 01 | Số vào viện: 23.0001850
- Họ tên người bệnh: VŨ TEST EMR (23016601) | Tuổi: 023 | Nam
- Số giường: 1 | Buồng: 302
- Chẩn đoán: Vô xương so và xương mặt

**Table columns:**
| NGÀY | TÊN DỊCH TRUYỀN/ HÀM LƯỢNG | SỐ LƯỢNG | LÔ/SỐ SẢN XUẤT | TỐC ĐỘ GIỌT/PH | THỜI GIAN (BẮT ĐẦU / KẾT THÚC) | BÁC SĨ CHỈ ĐỊNH | ĐIỀU DƯỠNG THỰC HIỆN |
|------|------------------------------|---------|-----------------|----------------|---------------------------------|-----------------|----------------------|
| 18/10/2023 | im | 1.0 | 12 | 2 | 62:11 / 62:13 | Trần Tuấn Dũng | BSCKI Nguyễn Vhu Tin |
| 18/10/2023 | Glucoza 5% | 1.0 | 123 | 3 | 05:27 / 05:27 | Thuốc, Vhi Thi Diên H5%mg | BSCKI Nguyễn Vhu Thi Thảo |
| 10/12/2023 | Không | 1.0 | 121220 | 20 | 21:20 / 22:00 | BSCKI Nguyễn Vhu Tin | Phạm Văn Thắng |
| 10/12/2023 | đường | 1.0 | 121220 | 30 | 21:22 / 21:50 | BSCKI Nguyễn Vhu Tin | Phạm Văn Thắng |
| 10/12/2023 | Im dịch truyền | 1.0 | 121221 | 30 | 21:35 / 22:10 | BSCKI Nguyễn Vhu Thi Thảo | Phạm Văn Thắng |

---

### Summary — Mobile App Features

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | Đăng nhập | Username/password với logo bệnh viện |
| 2 | Chọn khoa + mẫu bệnh án | Multi-department, multi-template support |
| 3 | Danh sách bệnh nhân | Search by name/code, expandable cards, 29+ patients |
| 4 | Hồ sơ bệnh án | 6-section menu per patient |
| 5 | Tờ điều trị | Tạo/sửa với chẩn đoán, diễn biến, chế độ chăm sóc |
| 6 | Dự trù thuốc | Thêm/xem theo đối tượng, tên thuốc, số lần/mỗi lần/số lượng/cách dùng |
| 7 | Chỉ định cận lâm sàng | Thêm/xem theo đối tượng, tên chỉ định, giờ, số lượng |
| 8 | Xem & in qua WiFi | iOS native print (Canon LBP223, A4, double-sided) |
| 9 | Xem CLS cũ | Danh sách theo lần điều trị, lịch sử toàn bộ |
| 10 | Xem kết quả siêu âm | PDF với ảnh siêu âm đính kèm |
| 11 | Xem kết quả xét nghiệm | Full lab report PDF với reference range |
| 12 | Tờ chăm sóc | Sinh hiệu, da niêm, tri giác, BMI, nhiệt độ, in phiếu |
| 13 | Phiếu truyền dịch | Tên dịch, lô, tốc độ, giờ bắt đầu/kết thúc, sinh tồn trước/sau |
| 14 | Công khai thuốc | Lịch sử toàn bộ theo năm, theo lần vào viện |
| 15 | Biên bản hội chẩn | Xem tổng kết |

**Bottom Navigation (4 tabs):**
- Trang chủ (home icon)
- Bệnh Án (medical record icon) — active section
- Phẫu thuật bệnh (surgery icon)
- Tài khoản (person icon)

**Sub-navigation for "Lần điều trị" (4 tabs):**
- Toa thuốc (prescription icon)
- Cận lâm sàng (asterisk icon)
- Xét nghiệm (lab icon)
- Xét nghiệm vi sinh (microbiology icon)

---

## Part 2: Giải pháp và Phương pháp luận

> Document: GIẢI PHÁP VÀ PHƯƠNG PHÁP LUẬN (12 pages)
> Context: Tài liệu tư vấn triển khai hệ thống HIS MQSoft cho bệnh viện.

---

### Mục lục

```
I.   MỤC TIÊU DỰ ÁN .................................................. 3
II.  TỔNG QUAN VỀ PHẦN MỀM QUẢN LÝ BỆNH VIỆN THÔNG MINH MQSOFT .... 3
     1. Tổng quan hệ thống ............................................. 3
     2. Công nghệ sử dụng .............................................. 5
     3. Cơ sở pháp lý .................................................. 5
     4. Yêu cầu kỹ thuật ............................................... 6
III. GIẢI PHÁP TRIỂN KHAI PHẦN MỀM QUẢN LÝ KHÁM CHỮA BỆNH ......... 7
     1. Khảo sát quy trình .............................................. 7
     2. Kiểm tra chuẩn bị máy chủ ....................................... 7
     3. Tập huấn phần mềm .............................................. 7
     4. Triển khai toàn bộ khoa phòng bệnh viện ........................... 7
     5. Tổng kết đánh giá và nghiệm thu dự án ............................ 8
     6. Hỗ trợ chăm sóc khách hàng ...................................... 8
IV.  GIẢI PHÁP BẢO TRÌ PHẦN MỀM QUẢN LÝ KHÁM CHỮA BỆNH ............ 8
     1. Mục tiêu ........................................................ 8
     2. Xác định tài nguyên ............................................. 8
     3. Lập lịch bảo trì định kỳ ......................................... 9
     4. Bảo trì và cập nhật hệ thống .................................... 9
     5. Đảm bảo an toàn dữ liệu ......................................... 10
     6. Kiểm tra và thử nghiệm .......................................... 11
     7. Đào tạo người sử dụng .......................................... 11
```

---

### I. Mục tiêu dự án

Bước vào thế kỷ XXI, sự phát triển của cuộc cách mạng khoa học và công nghệ hiện đại và sự bùng nổ của các công nghệ cao, trong đó công nghệ thông tin là yếu tố quan trọng có tác động sâu sắc đến toàn xã hội. Kinh tế tri thức với sản phẩm mũi nhọn là công nghệ thông tin đang thể hiện vai trò và sức mạnh vượt trội chi phối các hoạt động của con người.

**Mục tiêu ứng dụng CNTT trong quản lý bệnh viện:**
- Tăng cường công tác quản lý hoạt động bệnh viện dựa trên cơ sở quản lý khoa học và hiệu quả của hệ thống quản lý áp dụng công tin học
- Giúp cho người quản lý nắm được các thông tin nhanh, chính xác, bắt cứ lúc nào, tránh được quản lý quan liêu, hiệu chỉnh hoạt động ngay được các sai sót và điều chỉnh hoạt động kịp thời. Thông qua các dữ liệu và thông tin, người quản lý có thể đưa ra được những kế hoạch phù hợp và giúp cho việc điều hành thực hiện kế hoạch một cách nhanh chóng
- Giúp đơn giản hóa các thủ tục hành chính, loại bỏ bớt các hoạt động trung gian, tạo điều kiện cho các dịch vụ khám chữa bệnh nhanh chóng, thuận tiện và kịp thời
- Tăng cường chất lượng thông tin của bệnh viện các tuyến và thống nhất dữ liệu cho hoạt động quản lý ngành

---

### II. Tổng quan về phần mềm quản lý bệnh viện thông minh MQSOFT

#### 1. Tổng quan hệ thống

Hệ thống được thiết kế và xây dựng tổng thể dựa trên sự kết hợp độc đáo giữa sự tự động hóa quy trình nghiệp vụ và thông tin xuyên suốt tất cả các mảng hoạt động như Quản lý khám chữa bệnh, Quản lý xét nghiệm, Quản lý lưu trú, xử lý, truyền hình ảnh, kết nối giao tiếp bệnh nhân, báo cáo tổng hợp về cơ quan quản lý...

**Kiến trúc hệ thống — 4 nhóm phân hệ:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HẠ TẦNG BỆNH VIỆN                                 │
│  HỆ THỐNG      SERVER                    TRANG THIẾT BỊ                    │
│    MẠNG                                                                     │
│                        CƠ SỞ DỮ LIỆU Y TẾ                                 │
└─────────────────────────────────────────────────────────────────────────────┘

NHÓM QUẢN LÝ ĐIỀU TRỊ:
- Quản lý tiếp nhận
- Cấp số và gọi số
- Khám sức khỏe
- Điều trị ngoại trú
- Khoa Dược
- Nhà thuốc
- Xét nghiệm
- Chẩn đoán hình ảnh
- Thẩm định độ giao
- Suất ăn dinh dưỡng
- Kiểm soát nhiễm khuẩn
- Bác sỹ hội chẩn

NHÓM ĐIỀU HÀNH:
- Văn phòng
- Kiểm soát chất lượng
- Trang thiết bị/ Tài sản
- Nhân sự
- Kế toán tài chính

NHÓM THÔNG MINH:
- Website, App đặt khám, xem hồ sơ bệnh nhân online
- Quản lý số hóa toàn bộ hồ sơ bệnh nhân
- Chữ ký số vào hồ sơ bệnh án
- Website Dashboard quản lý chất lượng

NHÓM TÍCH HỢP HỆ THỐNG:
- Công ty tỷ
- Hệ BHXH
- Công dịch vụ
- Hệ thống PACS
- Chức năng điều chuyển ERP
- Hệ thống AI
```

**Mô tả các nhóm:**

**Nhóm quản lý điều trị:**
Quản lý xuyên suốt quá trình khám chữa bệnh ngoại trú, cũng như điều trị nội trú của bệnh nhân nhận từ khâu tiếp nhận cho đến khi xuất viện, giúp việc theo dõi thông tin bệnh án và xử lý chi phí điều trị bệnh nhân được thực hiện một cách tự động, liên tục và thông suốt.

**Nhóm điều hành:**
Quản lý toàn bộ các công tác hành chính của bộ phận các đơn vị phòng hành được được thực hiện một cách nhanh chóng từ bộ phận hành chính đến kết toán và tiến lương, cũng như quản lý đầy đủ các trang thiết bị tài sản đang sử dụng tại đơn vị.

**Nhóm thông minh:**
Quản lý toàn bộ thông tin hồ sơ bệnh án bệnh nhân giúp hỗ trợ tương tác giữa Bệnh viện và bệnh nhân thông qua hệ thống online.

**Nhóm tích hợp hệ thống:**
Tích hợp với các hệ thống thứ ba hỗ trợ cải thiện, tối ưu quy trình quản lý, đề sử dụng, thân thiện với quy trình nghiệp vụ vận hành.

---

#### 2. Công nghệ sử dụng

- **Công nghệ nền:** Microsoft platform
- **Web Servers & Application Servers:** IIS, IBM Websphere, IBM Lotus Domino, Microsoft .NET, Microsoft Office SharePoint
- **Middleware & Web Services:** J2EE/EJB, RMI, CORBA, ORBit, RMI-HOP, COM/DCOM, MTS, SOAP, DB2 XML Extender
- **Ngôn ngữ lập trình & Scripting:** Java, C, C++, JSP, ASP, ASP.NET, Java/VB Script, XML/XSL, XSL-FO, Lotus Notes Domino, HTML/DHTML, WebL, PL/SQL, VisualAge for Java, CAML, XAML, AngularJS, JQuery, PHP, CSS3, HTML5, JSON
- **Phát triển Web:** HTML/DHTML, WebL, ASP, Servlet/JSP, Java Script, VB Script, Perl, PHP, MS FrontPage, MS Visual InterDev, Macromedia Studio MX, Adobe PhotoShop, Corel Draw, Tan Dan's Autonomous DWeb
- **Hệ điều hành:** Redhat Linux, MS Windows, Novel Netware, OS/400, HP Unix, AIX, AS/400, Sun Solaris, OS/2, and VMS/VAX
- **Cơ sở dữ liệu:** Oracle, MS SQL Server, MS Access, FoxPro, MySQL, DB2, PostgreSQL, Lotus Notes Domino
- **Mạng và truyền số liệu:** Novell, Windows, Unix, Linux, Internet/Intranet, WAN/LAN, Voice over IP, low-level TCP/IP
- **Các phần mềm trên mạng:** Lotus Notes, MS Exchange
- **Công cụ phân tích & thiết kế:** Rational Rose, Rational XDE, ERWin, Oracle, UML, Visio
- **Các giải pháp và kiến trúc:** Portal server and applications Data Warehouses implementations, Web-based Applications, Client/Server Applications, eCommerce

---

#### 3. Cơ sở pháp lý

- Công ty Cổ phần MQ Solutions được thành lập vào tháng 12 năm 2015, là một công ty chuyên tư vấn, thiết kế, phát triển và cung cấp các phần mềm có bản quyền cũng như các giải pháp cho các đơn vị trong lĩnh vực y tế, được sáng lập và lãnh đạo bởi các chuyên gia công nghệ và quản lý được đào tạo tại các trường đại học trong nước và nhiều kinh nghiệm trong việc cung cấp các giải pháp CNTT
- **Giấy phép kinh doanh số** 0313186810 ngày 31 tháng 03 năm 2015  Sở kế hoạch và đầu tư thành phố Hồ Chí Minh cấp
- **Giấy chứng nhận đăng ký tác giả** Phần mềm quản lý bệnh viện thông minh-MQSOFT số 782/2017/QTG Cục bản quyền tác giả chứng nhận
- **Giấy chứng nhận đăng ký quyền tác giả** Phần mềm văn phòng điện tử-MqSmartOffice số 6309/2017/QTG Cục bản quyền tác giả chứng nhận

---

#### 4. Yêu cầu kỹ thuật

Phần mềm quản lý bệnh viện thông minh-MQSOFT đáp ứng các yêu cầu về nghị định và thông tư quản lý bệnh viện:

**Văn bản pháp quy:**
- Luật Công nghệ thông tin số 67/2006/QH11 ngày 29/6/2006
- Luật Giao dịch điện tử số 51/2005/QH11 ngày 29/11/2005
- Luật Khám bệnh, chữa bệnh số 40/2009/QH12 ngày 23/11/2009
- Nghị định 36a/NQ-CP ngày 14/10/2015 của Chính phủ phê duyệt về Chính phủ điện tử
- Nghị định 26/2007/NĐ-CP ngày 15/02/2007 quy định chi tiết thi hành Luật Giao dịch điện tử về chữ ký số và dịch vụ chứng thực chữ ký số
- Nghị định 64/2007/NĐ-CP ngày 10/4/2007 của Chính phủ về ứng dụng công nghệ thông tin trong hoạt động của cơ quan nhà nước
- Nghị định số 102/2009/NĐ-CP ngày 6/11/2009 của Chính phủ về quản lý đầu tư ứng dụng công nghệ thông tin sử dụng nguồn vốn ngân sách nhà nước
- Nghị định số 170/2013/NĐ-CP ngày 13/11/2013 sửa đổi, bổ sung một số điều của Nghị định số 26/2007/NĐ-CP ngày 15/02/2007 quy định chi tiết thi hành Luật Giao dịch điện tử và Nghị định số 106/2011/NĐ-CP ngày 23/11/2011 sửa đổi, bổ sung một số điều của Nghị định số 26/2007/NĐ-CP ngày 15/02/2007
- Nghị định số 75/2017/NĐ-CP ngày 20/6/2017 của Chính phủ quy định chức năng, nhiệm vụ, quyền hạn và cơ cấu tổ chức của Bộ Y Tế TPHCM
- Quyết định 2035/QĐ-BYT ngày 12/06/2013 của Bộ trưởng Bộ Y tế công bố Danh mục kỹ thuật và yêu cầu theo dõi thông tin trong lĩnh vực y tế
- Quyết định 4159/QĐ-BYT ngày 13/10/2014 về việc ban hành quy định về an toàn thông tin y tế điện tử tại các đơn vị trong ngành y tế
- Quyết định số 1819/QĐ-TTg ngày 26/10/2015 của Thủ tướng Chính phủ phê duyệt Chương trình quốc gia về ứng dụng công nghệ thông tin trong hoạt động của cơ quan nhà nước giai đoạn 2016-2020
- Quyết định 4210/QĐ-BYT ngày 20/09/2017 của Bộ Y tế quy định chuẩn đầu ra sử dụng trong quản lý, giám định và thanh toán chi phí khám bệnh, chữa bệnh bảo hiểm y tế
- Quyết định số 5748/QĐ-BYT ngày 22/12/2017 của Bộ trưởng Bộ Y tế phê duyệt kế hoạch ứng dụng và phát triển công nghệ thông tin năm 2019 của Bộ Y tế
- Thông tư số 06/2011/TT-BTTTT ngày 28/2/2011 của Bộ Thông tin và Truyền thông quy định việc lập và quản lý chi phí đầu tư ứng dụng công nghệ thông tin
- Thông tư 22/2013/TT-BTTTT ngày 23/12/2013 của Bộ Thông tin và Truyền thông về ban hành danh mục tiêu chuẩn kỹ thuật về ứng dụng công nghệ thông tin trong cơ quan nhà nước
- Thông tư số 53/2014/TT-BYT ngày 29/12/2014 của Bộ Y tế quy định điều kiện hoạt động y tế trên môi trường mạng
- Thông tư số 54/2017/TT-BYT ngày 29/12/2017 của Bộ Y tế ban hành Bộ Tiêu chí ứng dụng công nghệ thông tin tại các cơ sở khám bệnh, chữa bệnh

---

### III. Giải pháp triển khai phần mềm quản lý khám chữa bệnh

#### 1. Khảo sát quy trình

- Khảo sát hạ tầng phần cứng và yêu cầu bệnh viện cung cấp các thiết bị phục vụ triển khai phần mềm như: Máy chủ, máy trạm, hạ tầng mạng...
- Khảo sát quy trình tổng thể bệnh viện: HIS, PHIS, BIS, LIS, PACS/RIS
- Khảo sát quy trình chi tiết từng bộ phận: Khoa Khám bệnh, Bộ phận điều hành hệ thống phổ, Khoa Dược, Tài chính kế toán, Tổ bảo hiểm, Bộ phận hồ sơ bệnh án và bảo cáo Phòng KHTH,... và tất cả nhu cầu quản lý riêng của bệnh viện bổ trí lịch khảo sát phù hợp
- Chuẩn bị đủ dữ liệu đầu vào phần mềm theo đúng quy trình đã khảo sát tại bệnh viện
- Các văn bản mẫu theo Chương V Yêu cầu kỹ thuật trong E-HSMT
- Tiếp nhận và thống nhất ý kiến chỉnh sửa phần mềm thuộc từng bộ phận sau khi có sự thống nhất cùng ban giám đốc
- Các yêu cầu chỉnh sửa phần mềm sẽ được đáp ứng và sắp xếp thời gian demo cho bộ phận cùng đó yêu cầu

#### 2. Kiểm tra chuẩn bị máy chủ

- Chuẩn bị dữ liệu, cấu hình phần mềm theo đúng quy trình đã khảo sát tại bệnh viện
- Demo chức năng phần mềm theo các module chính sẽ vận hành tại bệnh viện theo Chương V Yêu cầu kỹ thuật trong E-HSMT
- Tiếp nhận và thống nhất ý kiến chỉnh sửa phần mềm thuộc từng bộ phận sau khi có sự thống nhất cùng ban giám đốc
- Các yêu cầu chỉnh sửa phần mềm sẽ được đáp ứng và sắp xếp thời gian demo cho bộ phận cùng đó yêu cầu
- Cài đặt máy chủ và máy trạm theo hướng dẫn sử dụng phần mềm Mqsoft
- Cài đặt phần mềm trên hệ điều hành Redhat Linux, áp dụng cơ sở dữ liệu Oracle. Cài đặt phần mềm tất cả các máy ở khoa phòng, bộ phận
- Kiểm tra (checklist) in ấn mẫu biểu tại tất cả các máy ở khoa phòng, bộ phận

#### 3. Tập huấn phần mềm

- Xây dựng phòng lab tập huấn
- Tập huấn và chia các lớp theo đối tượng sử dụng
- Bố trí giảng viên tập huấn theo lịch sắp xếp của Bệnh viện
- Chuẩn bị tài liệu tập huấn

#### 4. Triển khai toàn bộ khoa phòng bệnh viện

- Cập nhật triển khai các phần hành phần mềm MQSOFT nhằm đáp ứng ứng quy định các văn bản pháp luật, yêu cầu về mẫu khám chữa bệnh và quản lý bệnh viện, đáp ứng yêu cầu của Chương V Yêu cầu kỹ thuật E-HSMT
- Hướng dẫn trên hệ thống giao tiếp từ xa thông qua các kênh như: Ultraview, teamviewer, skype, zalo, sms, điện thoại,...
- Cấp nhật hệ thống hỗ trợ tư vấn từ Sở Y Tế

#### 5. Tổng kết đánh giá và nghiệm thu dự án

- Báo cáo đánh giá công việc đã thực hiện theo đúng yêu cầu về nghị định về quản lý khám chữa bệnh và quản lý bệnh viện
- Gửi bản giao nhân viên phụ trách tải liệu hướng dẫn, quy trình sử dụng tương ứng từng ứng dụng cho triển khai ban đầu
- Lắp biên bản nghiệm thu từng bộ phận khoa phòng tương ứng từng nội dung đang dẫn triển khai

#### 6. Hỗ trợ chăm sóc khách hàng

- Nhân viên chăm sóc khách hàng hỗ trợ bệnh viện từ xa thông qua các kênh như: Ultraview, teamviewer, skype, zalo, sms, điện thoại,...
- Cập nhật hệ thống hỗ trợ tư vấn từ Sở Y Tế

---

### IV. Giải pháp bảo trì phần mềm quản lý khám chữa bệnh

#### 1. Mục tiêu

Duy trì ổn định của hệ thống: Một trong những mục tiêu quan trọng nhất của bảo trì là đảm bảo rằng các dịch vụ quản lý bệnh nhân có thể được sử dụng một cách liên tục và không gây ra sự cố nào.

Cải thiện hiệu suất: Mục tiêu này nhằm việc tối ưu hóa hiệu suất và tối ưu hóa hệ thống.

Đáp ứng các yêu cầu từ người dùng: Bệnh viện và bệnh nhân thường có những yêu cầu và thay đổi liên tục đối với hệ thống. Mục tiêu này là làm cho phần mềm linh hoạt hơn để cung cấp các dịch vụ tốt hơn cho cả bệnh viện và bệnh nhân.

Đảm bảo tính bảo mật: Một mục tiêu quan trọng khác là đảm bảo tính bảo mật của dữ liệu bệnh nhân và tránh các cuộc tấn công từ bên ngoài.

Hỗ trợ người dùng: Đảm bảo rằng người dùng cuối có sự hỗ trợ khi gặp vấn đề với phần mềm. Mục tiêu này có thể bao gồm việc cung cấp tài liệu hướng dẫn, hệ thống hỗ trợ kỹ thuật và đào tạo bổ sung nếu cần thiết.

#### 2. Xác định tài nguyên

- **Nhân lực:** Xác định những người cần thiết cho quá trình bảo trì. Điều này bao gồm kỹ sư phần mềm, chuyên gia về bảo mật thông tin, và số lượng người vận hành và quản lý hệ thống
- **Ngân sách:** Xác định chi phí mà kế hoạch bảo trì có thể chi ra, bao gồm chi phí nhân lực, công cụ và phần mềm, phần cứng và các tài liệu hướng dẫn
- **Thời gian:** Xác định thời gian cần thiết để thực hiện các hoạt động bảo trì. Bao gồm cả thời gian dự kiến cho việc triển khai cập nhật hoặc phiên bản mới
- **Dữ liệu và tài liệu hướng dẫn:** Đảm bảo rằng có đủ dữ liệu sao lưu và tài liệu hướng dẫn chi tiết về quá trình bảo trì bản mới. Điều này giúp bảo trì tri diễn ra một cách suôn sẻ
- **Cơ sở hạ tầng mạng:** Xác định cơ sở hạ tầng mạng cần thiết để hỗ trợ việc triển khai và hoạt động của phần mềm sau khi bảo trì
- **Tài nguyên bảo mật:** Đảm bảo rằng có đủ các biện pháp bảo mật cần thiết để bảo vệ dữ liệu bệnh nhân và hệ thống trong quá trình bảo trì

#### 3. Lập lịch bảo trì định kỳ

- **Tần suất:** Xác định tần suất bảo trì cần thiết, tần suất này có thể khác nhau tùy theo loại phần mềm và yêu cầu của hệ thống
- **Lập kế hoạch:** Xác định và giữ cử cho các hoạt động bảo trì. Đảm bảo rằng lịch trình không ảnh hưởng đến hoạt động của bệnh viện và người dùng cuối
- **Thông báo cho người dùng:** Trước khi triển khai bảo trì, thông báo người dùng cuối về kế hoạch và thời gian dự kiến. Điều này giúp họ chuẩn bị và có thể ứng phó với sự gián đoạn
- **Sao lưu dữ liệu quan trọng:** Trước khi triển khai cập nhật, thực hiện sao lưu tổng quan trọng để đảm bảo bảo tính toàn vẹn trong trường hợp có sự cố xảy ra
- **Kiểm tra và thử nghiệm:** Trước khi triển khai bảo trì, hãy thực hiện các bài kiểm tra và thử nghiệm để đảm bảo rằng cập nhật không gây ra lỗi hoặc vấn đề nào
- **Ghi chép và theo dõi:** Ghi lại tất cả các hoạt động bảo trì và theo dõi tiến trình. Điều này giúp xác định và giải quyết các vấn đề xuất hiện trong tương lai
- **Đánh giá và cải tiến:** Sau khi hoàn thành bảo trì, hãy đánh giá lại các quá trình để xác định các điểm mạnh và yếu, và tìm cách cải thiện cho lần bảo trì tiếp theo

#### 4. Bảo trì và cập nhật hệ thống

- **Xác định các cập nhật cần thiết:** Theo dõi các thông tin từ nhà cung cấp phần mềm, công đồng phát triển phần mềm để xác định các cập nhật và bản vá mới, bảo mật, cải thiện hiệu suất và tính năng mới
- **Lập kế hoạch cho việc cập nhật:** Xem xét thời điểm ngày cập nhật một cách kỹ lưỡng, và quyết định khi nào thì việc cập nhật phù hợp nhất — vào cuối tuần để tránh ảnh hưởng đến hoạt động hàng ngày của bệnh viện
- **Kiểm tra cập nhật trước khi triển khai:** Trước khi triển khai cập nhật, thực hiện các bài kiểm tra và thử nghiệm để đảm bảo rằng cập nhật sẽ diễn ra một cách suôn sẻ và không gây ra các lỗi mới
- **Ghi chép và theo dõi:** Ghi lại tất cả các hoạt động cập nhật và theo dõi tiến trình, và đề gặp pháp nếu có chướng gặp phải và cách giải quyết

#### 5. Đảm bảo an toàn dữ liệu

- **Sao lưu dữ liệu định kỳ:** Thực hiện sao lưu dữ liệu theo định kỳ để đảm bảo rằng dữ liệu quan trọng không bị mất trong trường hợp có sự cố xảy ra hay hệ thống hoặc tấn công malware. Lịch trình sao lưu dữ liệu nên được xác định và tuân theo một cách nhất quán, như sao lưu hàng ngày, hàng tuần theo tần suất sử dụng và tầm quan trọng của dữ liệu
- **Mã hóa dữ liệu:** Sử dụng mã hóa để bảo vệ dữ liệu khi nó được lưu trữ và truyền tải qua mạng. Mã hóa giúp đảm bảo rằng ngay cả khi dữ liệu bị đánh cắp, người không được ủy quyền cũng không thể đọc hoặc sử dụng nó
- **Quản lý quyền truy cập:** Xác định ai có quyền truy cập vào dữ liệu và hạn chế quyền truy cập theo nguyên tắc "tối thiểu quyền hạn." Mỗi người chỉ nên có quyền truy cập vào dữ liệu cần thiết cho công việc của họ
- **Theo dõi hoạt động của hệ thống:** Sử dụng công cụ để theo dõi hoạt động của hệ thống có thể phát hiện các tình huống tấn công cao và dưới ấp lực. Điều này giúp phát hiện sớm các vấn đề bảo mật và ngăn chặn mất mát dữ liệu
- **Xác thực và xác thực:** Đảm bảo rằng hệ thống có khả năng xác thực người dùng khi xác thực bằng thông tin đăng nhập vào hệ thống. Sử dụng xác thực hai yếu tố để bảo vệ tốt hơn
- **Theo dõi hoạt động của hệ thống:** Sử dụng công cụ để theo dõi hoạt động của hệ thống có thể phát hiện các tình huống tấn công cao và dưới áp lực
- **Áp dụng các biện pháp bảo vệ khỏi virus và malware:** Sử dụng phần mềm antivirus và antimalware để ngăn chặn các tấn công từ phần mềm độc hại
- **Đào tạo nhân viên:** Đào tạo nhân viên về các quy tắc bảo mật và cách phát hiện các mối

  (đe dọa bảo mật. Nhân viên cần biết cách xử lý thông tin nhạy cảm và không chia sẻ dữ liệu với người không có quyền)
- **Xây dựng kế hoạch phòng ngừa và ứng phó với sự cố:** Lập kế hoạch để đối phó với các sự cố bảo mật, chẳng hạn như mất dữ liệu hoặc tấn công ransomware. Điều này bao gồm cả việc thiết lập phương án khôi phục dữ liệu và hệ thống
- **Liên tục đánh giá và cập nhật biện pháp bảo mật:** Theo dõi và đánh giá liên tục hiệu suất của các biện pháp bảo mật và cập nhật chúng để đối phó với các mối đe dọa mới

#### 6. Kiểm tra và thử nghiệm

- **Lập kế hoạch kiểm tra và thử nghiệm:** Xác định phạm vi và mục tiêu của từng quá trình kiểm tra và thử nghiệm của phần mềm. Đảm bảo rằng kế hoạch bao gồm các bài kiểm tra đơn vị, kiểm tra tích hợp và kiểm tra hệ thống
- **Thiết kế kịch bản thử nghiệm:** Tạo ra các kịch bản thử nghiệm chi tiết để mô phỏng các tình huống sử dụng thực tế và các tình huống đặc biệt
- **Thiết lập môi trường thử nghiệm:** Tạo môi trường thử nghiệm tương tự hoặc giống hệt với môi trường sản xuất. Điều này bao gồm việc cài đặt phần mềm, dữ liệu và cấu hình mạng từ môi trường mới
- **Thực hiện kiểm tra và thử nghiệm:** Thực hiện các kịch bản kiểm tra đã lên kế hoạch theo lịch kế hoạch. Đảm bảo rằng tất cả cả các tính năng và chức năng được kiểm tra đầy đủ
- **Ghi lại và theo dõi kết quả:** Ghi lại kết quả của các bài kiểm tra và thử nghiệm. Theo dõi các lỗi, vấn đề, và vướng mắc cần được giải quyết
- **Theo dõi tính bảo mật:** Đảm bảo rằng các biện pháp bảo mật đã được kiểm tra và xác minh. Kiểm tra tính bảo mật của phần mềm bằng cách sử dụng kiểm tra tự rò bảo mật và xác thực xác thực
- **Kiểm tra hiệu suất:** Đánh giá xem hệ thống có đáp ứng yêu cầu về hiệu suất trong các tình huống tải cao và dưới áp lực hay không
- **Tối ưu hóa và sửa lỗi:** Sau khi xác định các lỗi hoặc vấn đề, sửa chúng và thực hiện kiểm tra lại để đảm bảo rằng tất cả các vấn đề đã được giải quyết một cách hiệu quả
- **Xác nhận và phê duyệt:** Sau khi hoàn thành quá trình kiểm tra và thử nghiệm, tiến hành xác nhận và phê duyệt để đảm bảo rằng phần mềm đã sẵn sàng và đã đạt các tiêu chuẩn chất lượng trước khi triển khai vào môi trường sản xuất
- **Tạo báo cáo và tài liệu:** Tạo báo cáo về kết quả kiểm tra và thử nghiệm để tài liệu và thông báo cho các bên liên quan

#### 7. Đào tạo người sử dụng

- **Đầu tiên, xác định người dùng cần đào tạo và nhu cầu đào tạo của họ cho Bệnh viện.** Điều này nhằm xác định trình độ hiện tại của họ và những kiến thức về phần mềm cần cải thiện
- **Lập kế hoạch đào tạo:** Dựa trên nhu cầu đào tạo, lập kế hoạch đào tạo chi tiết, bao gồm nội dung, thời gian, địa điểm, và người tham gia. Xác định liệu đào tạo sẽ được tiến hành trực tiếp hoặc định kỳ
- **Tạo tài liệu đào tạo:** Tạo tài liệu hướng dẫn hoặc tài liệu tập cho người sử dụng. Đảm bảo rằng tài liệu đào tạo cung cấp thông tin đầy đủ và hướng dẫn chi tiết về cách sử dụng phần mềm
- **Thực hiện buổi đào tạo theo kế hoạch đã lên lịch.** Cung cấp thông tin chi tiết về cách sử dụng phần mềm, cũng như giải đáp mọi câu hỏi từ người học
- **Cung cấp hỗ trợ sau đào tạo:** Sau khi buổi đào tạo kết thúc, cung cấp hỗ trợ bổ sung cho người học. Điều này có thể bao gồm việc cung cấp tài liệu tham khảo, hệ thống hỗ trợ trực tuyến, và đào tạo bổ sung nếu cần thiết
- **Đánh giá và đối phó với phản hồi:** Thu thập phản hồi từ người học về chất lượng buổi đào tạo để cải thiện quy trình đào tạo
- **Đào tạo cho các tính huống đặc biệt:** Đảm bảo rằng các nhóm đặc biệt như nhân viên mới, người sử dụng có nhu cầu đặc biệt như các chứng nặng mắc chứng nào đó cũng được đào tạo theo nhu cầu đặc biệt của họ
- **Liên tục cập nhật đào tạo:** Liên tục theo rằng phần mềm và quy trình có thể thay đổi theo thời gian, vì vậy cần cập nhật đào tạo cho người sử dụng để đảm bảo họ luôn biết cách sử dụng phần mềm một cách đúng cách
- **Theo dõi việc sử dụng phần mềm:** Theo dõi việc sử dụng phần mềm sau đào tạo để đảm bảo rằng người dùng đã thực sự hiểu và sử dụng phần mềm một cách đúng cách

---

## Part 3: Trang thiết bị & Văn phòng phẩm

> Document: HƯỚNG DẪN QUẢN LÝ TRANG THIẾT BỊ VÀ VĂN PHÒNG PHẨM (6 pages)
> Context: Module quản lý kho TTB-VPP trong hệ thống MQSoft HIS (desktop Windows app)
> Chú thích: Giống Kho Dược và VTYT về giao diện

---

### Giao diện phần mềm

**Main Menu (MQ HIS desktop app):**
- Header: Hospital information management system HIMS | Công ty TNHH MQ Solutions | Liên hệ: 0987 036 336 | Copyright © 2017
- Logo: PMQ Soft (blue/white)

**Module icons (grid layout):**
| Row 1 | Row 2 |
|-------|-------|
| Bệnh nhân | Quản lý dược | Viện phí | Xét nghiệm | Chẩn đoán hình ảnh | Hệ thống bảo cảnh | Quản lý BHYT |
| Kho muc | Điều trị định mường | **Trang thiết bị/ Tài sản** (highlighted, red box) | Nhân sự | Kế toán tài chính | Quản lý lương | Nghiên cứu lâm sàng |
| Bệnh án điện tử (EMR) | Sổ sức khuyết điện tử | Sharepoint Office 365 | Quản lý hệ HISHA | Hiển thị LCD – Quy số | Version | Kết thúc |

---

### Quản lý danh mục

Nếu thiếu thì khai thêm: **Nước**, **Hàng**, **Nhà cung cấp**,...

**UI Screen — Danh mục (menu context):**
Khi mở module Trang thiết bị/ Tài sản, hiện dropdown danh mục gồm:
- (Scrollable list)
- Khai báo hàng hóa
- Nhà cung cấp
- Loại hàng hóa
- Đơn vị tính
- Nguồn kinh phí
- Phòng ban / Đơn vị
- Kho
- Nhóm hàng hóa
- Thương hiệu
- Xuất xứ
- (thêm nhiều mục khác)

---

### Nhập kho

**Menu path:** Nhập kho → Phiếu nhập kho

**UI Screen — Phiếu nhập kho (form):**

**Header bar (tabs/menu):**
```
Nhập kho | Xuất kho | Tài sản | Báo cáo | Tiện ích | A. Cửa số | B. Hướng dẫn | C. Kết thúc
```

**Sub-menu Nhập kho:**
- Phiếu nhập kho (selected)
- Phiếu tái nhập kho

**Form fields — Phiếu nhập kho:**
| Field | Value/Type |
|-------|-----------|
| Tiện ích ▼ | |
| Số phiếu | 3434 |
| Ngày | 18/11/2019 |
| Hóa đơn | C14 |
| Ngày HD | 18/11/2019 |
| Tiến số | (text field) |
| Nhà cung cấp | Không xác định |
| Từ | Nhập mới |
| Từ nghiệp vụ | (dropdown) |
| Kho | Kho Trang Thiết... (dropdown) |
| No | (text) |
| Người giao | (text) |

**Line item table:**

| Mã sổ | Tên | ĐVT | Số lượng | Đơn giá | Số tiền | Thuế | Cuốc văn chuyển |
|-------|-----|-----|---------|---------|---------|------|-----------------|
| S | Máy Tính | Cái | 7.00 | 1,125 | 7,875 | 10 | 0 |

**Footer totals:**
- Tổng cộng chưa thuế: **7,878**
- Tổng cộng có thuế: **8,666**

**Bottom form fields:**
| Field | Value |
|-------|-------|
| Mã | Tên |
| ĐVT | Cái |
| Số lượng | 7.00 |
| Đơn giá | (text) |
| Tổng tiền | 8,666 |
| Hàng SD | (text) |
| Số GĐ | (text) |
| Khấu hao | 0.00 % |
| Năm SX | 2018 ▼ |
| Bảo hành | (months) |
| Tỉnh trạng | Mới 100% |
| Nguyên giá | 8,666 |
| Hàng SD | (text) |
| Nước | Việt Nam |
| Nguồn gốc | Không xác định |

**Action buttons (bottom bar):**
- Mới | Sửa | Lưu | Thêm | Xóa | Bỏ qua | Hay | Phiếu nhập ▼ | In | Xem theo | Kết thúc

> Nhập đầy đủ thông tin: Số HĐ, nhà cung cấp, tên hàng hóa, số lượng, số tiền, thuế,...

---

### Duyệt cấp

**Menu path:** Tài sản → Duyệt cấp tài sản

**UI — Duyệt cấp tài sản menu:**
```
Tài sản | Báo cáo | ...
├── Duyệt cấp tài sản            ← selected
├── Duyệt hoàn trả tài sản
├── Danh sách những phiếu đã phát
├── Phiếu hoàn trả
├── Phiếu xuất khác
└── Phiếu xuất hoàn trả nhà cung cấp
```

**UI Screen — Duyệt cấp tài sản:**
- Form filter (cửa sổ popup)
- List: danh sách chờ duyệt — những khoa đánh phiếu lĩnh

**Workflow:**
1. **Duyệt:** trú kho, cấp trang thiết bị cho khoa
2. **Thu hồi:** thu hồi phiếu để chỉnh sửa

**Duyệt kho (UI Screen):**
- Filter popup: **Từ ngày – đến ngày**
  - Từ ngày: (date picker)
  - Đến ngày: 19/11/2019
  - Phiếu: PHIẾU PHÁT TRANG THIẾT BỊ lần 1 ▼
- Checkbox list của các phiếu:
  - PHIẾU PHÁT TRANG THIẾT BỊ lần 1
  - PHIẾU PHÁT TRANG THIẾT BỊ lần 2
  - PHIẾU PHÁT TRANG THIẾT BỊ lần 3
  - PHIẾU PHÁT TRANG THIẾT BỊ lần 4
  - PHIẾU PHÁT TRANG THIẾT BỊ lần 5
- Buttons: **[Chọn]** | **[Kết thúc]**

---

### Duyệt hoàn trả — trong tương mới

**Menu:** Duyệt hoàn trả tài sản

**UI:** Danh sách duyệt hoàn trả (tương tự giao diện duyệt cấp)
- Action buttons: **Duyệt** | **Thu hồi** | **In** | **Kết thúc** | **Danh sách chờ duyệt**

---

### Phiếu xuất kho (nếu không dùng chức năng Phiếu Lĩnh của khoa thi dùng chức năng này)

**Kho tự xuất cho khoa (trừ tồn kho):**
- Menu path: Xuất kho → Phiếu xuất (tự tồn kho)
- Giao diện tương tự danh sách/bảng

---

### Báo cáo và thẻ kho

**Menu path:** Báo cáo → Tổng hợp

**UI — Báo cáo menu (expanded Tổng hợp):**

**Submenu Tổng hợp:**
| Sub-item |
|---------|
| Phiếu nhập kho |
| Bảng nhập trang thiết bị |
| Bảng xuất trang thiết bị |

**Báo cáo menu items (full list):**
| Menu item |
|-----------|
| Phiếu kiểm kê kho |
| Số chi tiết vật tư, sản phẩm, hàng hóa |
| Số kho |
| Số kho. |
| Thẻ kho |
| Thẻ kho. |
| Thẻ kho theo khoa |
| Thẻ kho theo khoa. |
| Số theo dõi tài sản cố định và dụng cụ |
| In phiếu xuất kho |
| Biến động giá trang thiết bị |
| Báo cáo nhập xuất tồn trang thiết bị tại khoa |
| Báo cáo nhập xuất tồn kho |
| Tổng hợp phiếu xuất theo khoa |
| Thống kê nhập xuất kho theo ngày |
| Báo cáo thống kê báo hỏng, mất công cụ, dụng cụ |

> Khoa/Phòng muốn lãnh tài sản và văn phòng phẩm thì dùng chức năng: **Giao diện giống phiếu lĩnh và hoàn** (từ module nội trú)

---

### Phiếu dự trù lãnh vật tư, tài sản (từ Nội trú)

**Menu path (Nội trú module):** Nội trú → Tài sản → Phiếu dự trù lãnh vật tư, tài sản

**UI — Menu Nội trú:**
```
Nội trú | Nghiệp vụ | Báo cáo | Tiện ích | A. Cửa số | B. Hướng dẫn | C. Kết thúc
├── Nhập viện
├── Nhập khoa
├── Hiện diện
├── Khám chuyển khoa
├── Ký duyệt
├── Phẫu thuật, thủ thuật     >
├── Xuất khoa
├── Xuất viện
├── Thuốc, Vật tư y tế        >
└── Tài sản                   >
    ├── Phiếu dự trù lãnh vật tư, tài sản   ← selected
    └── Phiếu hoàn trả vật tư, tài sản
└── Dinh dưỡng                >
```

**UI Screen — Dự trù tài sản Kho Trang thiết bị (form):**
- Title: "Dự trù tài sản Kho Trang thiết bị (19/11/2019, Hậu Phẫu, PHIẾU LĨNH TRANG THIẾT BỊ Lần 1, Admin MQ)"
- Tiện ích ▼
- Số phiếu: 001
- Ghi chú: (text)

**Line item table:**
| Mã số | Tên | ĐVT | Số lượng N | → 19/11/2019 - PHIẾU LĨNH TI... |
|-------|-----|-----|-----------|--------------------------------|
| S | Máy Tính | Cái | 5.00 A | (right panel shows phiếu list) |

**Bottom form fields:**
| Field | Value |
|-------|-------|
| Đối tượng | HAO PHÍ ▼ |
| Mã | (text) |
| Tên | (text) |
| Hoạt chất | (text) |
| ĐVT | (text) |
| Kho | (dropdown) |
| Nguồn | Sự nghiệp ▼ |
| Số lượng | (number) |

**Action buttons:**
- Gởi | Mới | Sửa | Lưu | Thêm | Xóa | Bỏ qua | Hủy | In | Kết thúc | **Chuyển** (highlighted with red box + arrow)

> Bảo cáo và thể kho: tương tự module dược

---

### Summary — TTB-VPP Module Features

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 1 | Quản lý danh mục | Khai báo hàng hóa, nhà cung cấp, loại hàng, ĐVT, nguồn KP, kho, nhóm, thương hiệu, xuất xứ |
| 2 | Nhập kho | Phiếu nhập kho, phiếu tái nhập kho với đầy đủ thông tin HĐ, nhà CC, hàng hóa, SL, giá, thuế |
| 3 | Xuất kho | Phiếu xuất kho tự tồn kho cho khoa |
| 4 | Duyệt cấp | Phê duyệt phiếu lĩnh từ khoa phòng, filter theo ngày + loại phiếu |
| 5 | Duyệt hoàn trả | Phê duyệt phiếu hoàn trả tài sản |
| 6 | Phiếu lĩnh (từ khoa) | Khoa/phòng lãnh TTB-VPP thông qua module Nội trú → Tài sản |
| 7 | Dự trù tài sản | Tạo phiếu dự trù lãnh vật tư, tài sản từ nội trú với nút "Chuyển" |
| 8 | Hoàn trả | Phiếu hoàn trả vật tư, tài sản |
| 9 | Báo cáo tổng hợp | Phiếu nhập/xuất kho, bảng nhập/xuất TTB |
| 10 | Thẻ kho | Thẻ kho, thẻ kho theo khoa, số chi tiết vật tư |
| 11 | Báo cáo nhập xuất tồn | Nhập xuất tồn tại khoa, nhập xuất tồn kho |
| 12 | Kiểm kê | Phiếu kiểm kê kho |
| 13 | Theo dõi tài sản cố định | Số theo dõi tài sản cố định và dụng cụ |
| 14 | Thống kê | Nhập xuất kho theo ngày, báo hỏng/mất công cụ dụng cụ |

**Lưu ý triển khai:**
- Module TTB-VPP dùng chung giao diện với Kho Dược và VTYT
- Khoa/phòng lãnh VPP thông qua module Nội trú → Tài sản (không vào thẳng module TTB)
- Nút **Chuyển** trên phiếu dự trù = chuyển yêu cầu sang kho để duyệt cấp
- OS: Windows desktop app (legacy WinForms UI), màu xanh dương (#003399 approx)
- Tất cả thao tác có nút hủy (Hủy/Bỏ qua) trước khi lưu

---

*End of document — 41 pages extracted from 3 PDFs*
