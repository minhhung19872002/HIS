# HDSD Web EMR — Part 2 (Pages 36-69)
> Source: HDSD_WebEMR.pdf
> Extracted: 2026-06-01

---

## Trang 35–36 — Danh sách tài liệu EMR & Lịch sử khám bệnh

### Hình 37: Danh sách tài liệu EMR

**URL/Context:** Màn hình DANH SÁCH TÀI LIỆU EMR (bên phải header)

**Nút hành động:**
- `+ Xem PDF Tổng hợp` (nút xanh lam, góc trên phải)

**Nội dung:** Hiển thị 1 card tài liệu:
- Icon tệp PDF lớn
- Tên: **Trang bìa**
- Ngày: (Chưa có ngày tạo)

**Ghi chú:** Đây là trang bìa hồ sơ bệnh án điện tử của bệnh nhân.

---

### Hình 38: Lịch sử khám bệnh

**URL/Context:** LỊCH SỬ KHÁM BỆNH (3)

**Danh sách lần khám** (hiển thị dạng card ngang, 3 card):

| Card | Thông tin |
|------|-----------|
| Card 1 | **Tờ hỗn hợp đa phẫu thuật** — Ngày vào viện: 12/08/2025 09:04 — Bác sĩ: Bs.CKI ĐOÀN PHÚC ĐĂNG — Khoa: PK, Chọn Bác Sĩ Ngoại — Mã ICD: K04 |
| Card 2 | **Tờ bổ huyết khởi tinh mạch qua hậu môn** — Ngày vào viện: 12/08/2025 09:04 — Bác sĩ: Bs.CKI ĐOÀN PHÚC ĐĂNG — Khoa: PK Chọn Đoàn Phức Đăng — Mã ICD: K04 |
| Card 3 | **Tờ đặt ổ** — Ngày vào viện: 04/09/2025 20:09 — Bác sĩ: Bs.CKI TRẦN QUANG VIẾT — Bác sĩ: (tên khác) — Mã ICD: K041 |

**Business Rule:** Tại mỗi lần khám bệnh trước đó, người dùng có thể xem chi tiết lại chi tiết các nội dung như: các cận lâm sàng đã thực hiện, chuẩn đoán, các thuốc được chỉ định,...

---

## Trang 36–37 — Chi tiết lịch sử khám bệnh (Hình 39–40)

### Hình 39: Chi tiết lịch sử khám bệnh

**Context:** Popup/panel tại card lịch sử khám bệnh bất kỳ

**Tabs trong popup:**
- `Thông tin điều trị`
- `Kết quả`

**Tab đang chọn:** (hiển thị thông tin điều trị)

**Nội dung Tờ điều trị:**
```
Trị và huyết khởi tinh mạch qua hậu môn
Ngày vào viện: 12/08/2025 08:04
Bác sĩ: Bs.CKI ĐOÀN PHÚC ĐĂNG
Khoa: PK, Chọn Bác Sĩ Ngoại
Mã ICD: K34
```

**Nút điều hướng:** Icon tài liệu (xem chi tiết)

---

### Hình 40: Thông tin điều trị (form)

**Context:** Sau khi nhấn icon tài liệu tại 1 lịch sử khám bệnh

**Màn hình:** THÔNG TIN VÀO VIỆN | THÔNG TIN ĐIỀU TRỊ

**Fields hiển thị (read-only):**

| Field | Giá trị ví dụ |
|-------|---------------|
| Ngày vào viện | 12/08/2025 08:04 |
| Ngày ra viện | 12/08/2025 08:36 |
| Khoa/Phòng | PK, Chọn Bác Sĩ Ngoại |
| Bác sĩ | Bs.CKI ĐOÀN PHÚC ĐĂNG |
| Chẩn đoán chính | K04 — Trị và huyết khởi tinh mạch qua hậu môn |
| Chẩn đoán kèm theo | 70:1 — Các tuyến chưa giải thích được |
| Triệu chứng lâm sàng | Ghi chú triệu chứng |
| Ghi chú | Không xác định |

**Business Rule:** Để xem thông tin điều trị của bệnh nhân, nhấn tại 1 lịch sử khám bệnh bất kỳ. Sau đó nhấn **Thông tin điều trị**.

**Để xem kết quả khám bệnh** (Toa thuốc, CĐHA–TĐCN, Xét nghiệm, Phẫu thuật thủ thuật), nhấn **Kết quả**.

---

## Trang 37–38 — Lịch sử: Toa thuốc (Hình 41–42)

### Hình 41: Lịch sử: toa thuốc

**Context:** Trang THÔNG TIN VÀO VIỆN — Tab KẾT QUẢ

**Sidebar (left nav):**
- Bệnh Án
- Chức Năng Hồ Sơ Bệnh Án
- Báo Cáo
- Hồ Sơ Bệnh Án Điện Tử
- Chữ Ký Số

**Header patient info:**
- Mã: 23050497
- Năm: 2025
- Radio: Theo đợt / Tất cả
- Nút: `← Quay Lại` | `In toàn bộ`

**Thông tin bệnh nhân:**
- Avatar tròn + badge mã `22050497` (xanh lá)
- Họ tên: **NGUYỄN THÀNH QUỐC**
- Giới tính: Không xác định
- Ngày sinh: 1992
- SĐT: 0374 38 05 80
- Địa chỉ: Không xác định
- CCCD: 083092005207

**Section:** DANH SÁCH TÀI LIỆU EMR (15) — nút `+` góc phải

**Tabs kết quả:**
- `TOA THUỐC` (đang active)
- `CĐHA - TĐCN`
- `XÉT NGHIỆM`
- `PHẪU THUẬT THỦ THUẬT`

**Card Toa thuốc:**
- Badge ID: `250810073878904608` (màu xanh nước biển)
- Icon thuốc vòng tròn
- Tên: **Toa thuốc**
- Ngày: Invalid Date
- Bác sĩ: Bs.CKI ĐOÀN PHÚC ĐĂNG

**Nút FAB:** `+` tròn xanh lam (góc dưới phải)

---

### Hình 42: Chi tiết lịch sử về toa thuốc đã cấp

**Context:** Nhấn vào card Toa thuốc

**Màn hình full:** THÔNG TIN VÀO VIỆN (hiển thị full page)

**Thông tin bệnh nhân (đầu trang):**
- Mã, Giới tính, Ngày sinh, SĐT, CCCD...

**Section:** CHI TIẾT TOA THUỐC

**Thông tin toa:**

| Field | Giá trị |
|-------|---------|
| Ngày | 13/08/2025 09:51 |
| Phòng | Khoa Ngoại Tổng hợp |
| Bác sĩ | Bs.CKI ĐOÀN PHÚC ĐĂNG |
| Chẩn đoán | K04/10 — Trị và huyết khởi tinh mạch qua hậu môn là ra mắc. Bệnh lý tăng huyết áp |
| Chỉ số bình thường (Nam) | (3.9 - 6.4) |
| Chỉ số bình thường (Nữ) | (3.9 - 6.4) |
| Điều dưỡng | NGUYỄN THỊ MỸ DUNG |
| Mẫu xét nghiệm | Máu |

**Sections tiếp theo:**
- **Triệu chứng lâm sàng:** Máu
- **Kết luận:** Không xác định

**Section:** LỜI DẪN (58) — danh sách thuốc được kê:

| STT | Tên xét nghiệm | Đơn vị | Ghi chú |
|-----|----------------|--------|---------|
| 94 | Định lượng Glucose (Máu) | | `+` |
| 95 | Định lượng Urê máu (Máu) | | `+` |
| 44 | Đo hoạt độ AST (GOT) (Máu) | | `+` |
| 46 | Đo hoạt độ ALT (GPT) (Máu) | | `+` |
| 6 | Định lượng Creatinin (Máu) | | `+` |
| 6 | Định lượng Creatinin (Máu) | | `+` |

*(Danh sách dài, cuộn tiếp)*

---

## Trang 38–39 — CĐHA-TĐCN (Hình 42–44)

### Hình 42 (tiếp): Lịch sử: Chuẩn đoán hình ảnh (tab CĐHA - TĐCN)

**Context:** Tab `CĐHA - TĐCN` trong kết quả khám

**Nội dung:** Danh sách card ảnh (tương tự tab toa thuốc, không có dữ liệu hiển thị trong ảnh này)

---

### Hình 43: Thông tin về CĐHA – TĐCN đã thực hiện

**Context:** Nhấn vào 1 card CĐHA

**Màn hình:** THÔNG TIN VÀO VIỆN — CHI TIẾT CĐHA – TĐCN

**Nội dung:** Card màu nền kem/vàng nhạt với thông tin kỹ thuật CĐHA đã thực hiện.

---

### Hình 44: Chi tiết về lịch sử CĐHA – TĐCN đã thực hiện

**Màn hình:** THÔNG TIN VÀO VIỆN

**Section:** CHI TIẾT CĐHA – TĐCN

**Icon và label:** CĐHA – TĐCN (icon tròn xanh với ký hiệu)

**Nội dung card chi tiết:**
```
Kết quả THĂM DÒ CHỨC NĂNG: Ngày lấy x số PK tại, 4 PK, ICD: 4 P tại. Bác sĩ thực hiện Y tế Phú Thọ
SIÊU ÂM THĂM DÒ 4 số PK tại 4 số tại bác sĩ PK. Ngay tờ B4 PK, 01/1: Bác sĩ thực hiện Y tế Phú Thọ
```

**Trường thông tin hiển thị:**

| Label | Nội dung |
|-------|----------|
| Kết luận | (nội dung kỹ thuật) |
| Đề nghị | (nội dung đề nghị) |
| Ghi chú | |

---

## Trang 40–41 — Xét nghiệm (Hình 45–46)

### Hình 45: Lịch sử: các xét nghiệm

**Context:** Tab `XÉT NGHIỆM` trong kết quả khám

**Hiển thị:** 2 card xét nghiệm (dạng card nhỏ):

| Card | Thông tin |
|------|-----------|
| Card 1 | **Xét nghiệm** — Ngày: (hiển thị ngày) — Bác sĩ: (tên bác sĩ) |
| Card 2 | **Xét nghiệm** — Ngày: (hiển thị ngày) — Bác sĩ: (tên bác sĩ) |

---

### Hình 46: Chi tiết danh sách các xét nghiệm

**Màn hình:** THÔNG TIN VÀO VIỆN — CHI TIẾT XÉT NGHIỆM

**Thông tin bệnh nhân đầu trang:**
- Badge: `23050497`
- Tên: NGUYỄN THÀNH QUỐC
- Giới tính: Không xác định, Ngày sinh: 1992, SĐT: 0374 38 05 80
- Địa chỉ: Không xác định, CCCD: 083092005207

**Section:** CHI TIẾT XÉT NGHIỆM

| Field | Giá trị |
|-------|---------|
| STT mẫu | 94 |
| Icon | Xét nghiệm (tròn xanh) |
| Ngày | 13/08/2025 09:51 |
| Phòng | Khoa Ngoại Tổng hợp |
| Bác sĩ | Bs.CKI ĐOÀN PHÚC ĐĂNG |
| Chẩn đoán | K04/10 — Trị và huyết khởi tinh mạch qua hậu môn là ra mắc. Bệnh lý tăng huyết áp |
| Chỉ số bình thường (Nam) | (3.9 - 6.4) |
| Chỉ số bình thường (Nữ) | (3.9 - 6.4) |
| Điều dưỡng | NGUYỄN THỊ MỸ DUNG |
| Mẫu xét nghiệm | Máu |

**Sections:**
- **Triệu chứng lâm sàng:** Máu
- **Kết luận:** Không xác định

**Section:** LỜI DẪN (58) — chi tiết các xét nghiệm:

| STT | Tên xét nghiệm | Đơn vị | Nút |
|-----|----------------|--------|-----|
| 94 | Định lượng Glucose (Máu) | | `+` |
| 95 | Định lượng Urê máu (Máu) | | `+` |
| 44 | Đo hoạt độ AST (GOT) (Máu) | | `+` |
| 46 | Đo hoạt độ ALT (GPT) (Máu) | | `+` |
| 6 | Định lượng Creatinin (Máu) | | `+` |
| 6 | Định lượng Creatinin (Máu) (tiếp) | | `+` |

---

## Trang 41–42 — Chi tiết xét nghiệm + Phẫu thuật thủ thuật (Hình 47–48)

### Hình 47: Chi tiết kết quả của xét nghiệm

**Màn hình:** CHI TIẾT XÉT NGHIỆM (phần trên)

**Section:** CHI TIẾT XÉT NGHIỆM

| Field | Giá trị |
|-------|---------|
| STT | 94 |
| Icon | Xét nghiệm |
| Ngày | 13/08/2025 09:51 |
| Phòng | Khoa Ngoại Tổng hợp |
| Bác sĩ | Bs.CKI ĐOÀN PHÚC ĐĂNG |
| Chẩn đoán | K04/10 — Trị và huyết khởi tinh mạch qua hậu môn là ra mắc. Bệnh lý tăng huyết áp |
| Chỉ số bình thường (Nam) | (3.9 - 6.4) |
| Chỉ số bình thường (Nữ) | (3.9 - 6.4) |
| Điều dưỡng | NGUYỄN THỊ MỸ DUNG |
| Mẫu xét nghiệm | Máu |

**Sections:**
- **Triệu chứng lâm sàng:** Máu
- **Kết luận:** Không xác định

---

### Hình 48: Lịch sử: phẫu thuật thủ thuật

**Context:** Tab `PHẪU THUẬT THỦ THUẬT` trong kết quả khám bệnh

**Hiển thị:** 1 card nhỏ với thông tin ca mổ

---

## Trang 43 — Chi tiết phẫu thuật thủ thuật + Tờ điều trị

### Hình 49: Thông tin chi tiết của phẫu thuật thủ thuật

**Màn hình:** THÔNG TIN VÀO VIỆN — CHI TIẾT PHẪU THUẬT THỦ THUẬT

**Section:** CHI TIẾT PHẪU THUẬT THỦ THUẬT

| Label | Giá trị |
|-------|---------|
| Phẫu thuật | Phẫu thuật cắt trĩ điện bằng phương pháp Milligan – Morgan hoặc Ferguson |
| Ngày | (ngày thực hiện) |
| Phòng | (phòng mổ) |
| Bác sĩ | Bs.CKI ĐOÀN PHÚC ĐĂNG |
| Chẩn đoán | Trị và huyết khởi tinh mạch qua hậu môn |
| Chẩn đoán Bảo SĐT | Trị và huyết khởi tinh mạch qua hậu môn |

**Section:** BIẾN CỐ
- (nội dung biến cố)

**Section:** TÌNH TRẠNG
- (thông tin tình trạng)

**Section:** CHI TIẾT PHẪU THUẬT
*(nội dung đầy đủ mô tả phẫu thuật bao gồm các bước thực hiện)*

---

## Chương 7 — Tờ điều trị (Inpatient Treatment Orders)

### 7.1. Thêm mới tờ điều trị

**B1:** Chọn bệnh nhân để thêm tờ điều trị

**Hình 50: Chức năng xem thông tin hồ sơ**

**Context:** Popup khi nhấn icon `⋮` (3 chấm) trên card bệnh nhân

**Card bệnh nhân mẫu:**
```
25062077
Bệnh án ngoại       [icon]
Xem quá trình điều trị

XML8
Ngày sinh: 15/03/2000
Đối tượng: BHYT
Ngày vào khoa: 16/06/2025 15:45

BS: BSCKI. Nguyễn    Giường: NP1-1
Thị Thu
```

**Dropdown actions:**
- `Bệnh án ngoại`
- `Xem quá trình điều trị`

---

**B2:** Tại mã hình **Hồ sơ bệnh án**, nhấn vào `Tờ điều trị` để chuyển đến trang **Tờ điều trị**

**B3:** Tại màn hình **Tờ điều trị**, nhấn nút `+ Thêm` để thêm

**B4:** Nhập đầy đủ các thông tin cho **Tờ điều trị**

---

### Hình 51: Màn hình tạo mới Tờ điều trị

**URL:** (màn hình tạo mới)

**Header bệnh nhân:**
- Tên: XML8
- Mã: 25062077
- Giới tính: Nam
- Ngày sinh: 15/01/2000
- Địa chỉ: P. Linh Xuân Thành phố Thủ Đức Thành phố Hồ Chí Minh (Cũ)
- Chẩn đoán: **Đau bụng và vùng châu**

**Form tạo mới TỜ ĐIỀU TRỊ** (section đỏ highlight):

| Field | Kiểu | Giá trị mặc định/ví dụ |
|-------|------|------------------------|
| Y lệnh | Dropdown | Thường quy (phiếu bình) |
| Thời gian | DateTime picker | 07/31/2025 16:36 |
| Chẩn đoán | Dropdown | Loét dạ dày hồng tràng |
| Chẩn đoán kèm theo | Dropdown | (trống) |
| Ghi chú chẩn đoán | Textarea | (trống) |
| Chế độ chăm sóc | Dropdown | chăm sóc sau mổ |
| Chế độ ăn | Dropdown | Ăn cháo |
| Loại thức ăn | Dropdown | Bình thường |
| Nhóm tuổi | Dropdown | Người lớn |
| Diễn biến | Textarea | (trống) |
| Ghi chú | Textarea | (trống) |

**Nút action:**
- `+ Thêm` (xanh lá)
- `← Quay Lại` (xanh)

---

**B5:** Nhấn nút `+ Thêm` để lưu thông tin cho **Tờ điều trị**

---

### Hình 52: Màn hình Tờ điều trị sau khi đã tạo thành công

**Context:** Sau khi tạo thành công, màn hình edit hiện ra

**Tabs trong TỜ ĐIỀU TRỊ:**
- `Tờ điều trị` (đang active)
- `Thuốc`
- `Cận lâm sàng`

**Form TỜ ĐIỀU TRỊ** (giống tạo mới, có dữ liệu):

| Field | Giá trị |
|-------|---------|
| Y lệnh | Thường quy (phiếu bình) |
| Thời gian | 07/31/2025 16:36 |
| Chẩn đoán | Loét dạ dày hồng tràng |
| Chẩn đoán kèm theo | (trống) |
| Ghi chú chẩn đoán | (trống) |
| Chế độ chăm sóc | chăm sóc sau mổ |
| Chế độ ăn | Ăn cháo |
| Loại thức ăn | Bình thường |
| Nhóm tuổi | Người lớn |
| Diễn biến | abc |
| Ghi chú | (trống) |

**Nút action (3 nút):**
- `+ Cập Nhật` (xanh lá)
- `In` (tím)
- `← Quay Lại` (xanh)

---

## Trang 47 — Danh sách tờ điều trị (Hình 53)

### Hình 53: Danh sách các tờ điều trị đã được tạo

**Màn hình:** CÁC ĐỢT ĐIỀU TRỊ

**Header bệnh nhân:** XML8 / 25062077 (tương tự các màn hình trước)

**Thanh công cụ:**
- Nút `+ Thêm` (xanh lá)
- Nút `In` (tím, icon download)
- Nút `← Quay Lại` (xanh)
- Ô tìm kiếm (placeholder: Tìm kiếm...)

**Table danh sách:**

| Cột | Giá trị ví dụ |
|-----|---------------|
| Checkbox | □ |
| Số TT | 0 |
| Ngày ↕ | 31/07/2025 16:36 |
| Bác sĩ ↕ | BSCKI. Nguyễn Thị Thu |
| Loại ↕ | Thường quy (phiếu bình) |
| Actions | Icon edit (xanh lá) + icon delete (đỏ) |

**Pagination:** Showing 1 to 1 of 1 products — 10 per page

---

## Trang 47–48 — Chỉnh sửa tờ điều trị (7.2)

### 7.2. Chỉnh sửa thông tin cho tờ điều trị

**B1:** Tại màn hình **Tờ điều trị**, nhấn nút **edit** (icon bút chì xanh lá) tại tờ điều trị muốn cập nhật thông tin.

### Hình 54: Danh sách các tờ điều trị
*(Màn hình danh sách với highlight row đang được chọn để edit)*

---

### Hình 55: Cập nhật thông tin Tờ điều trị

**B2:** Chỉnh sửa các thông tin mong muốn, nhấn nút `+ Cập Nhật` để lưu thông tin

**Form cập nhật** (tương tự form tạo mới, ví dụ dữ liệu):

| Field | Giá trị ví dụ |
|-------|---------------|
| Y lệnh | Thường quy (phiếu bình) |
| Thời gian | 07/31/2025 16:36 |
| Chẩn đoán | Loét dạ dày hồng tràng |
| Chế độ chăm sóc | chăm sóc sau mổ |
| Chế độ ăn | Ăn cháo |
| Loại thức ăn | Sữa |
| Nhóm tuổi | Người lớn |
| Diễn biến | abcxyz |

**Nút action (3 nút):**
- `+ Cập Nhật` (xanh lá)
- `In` (tím)
- `← Quay Lại` (xanh)

---

## Trang 49 — Xóa tờ điều trị (7.3)

### 7.3. Xóa thông tin Tờ điều trị

**B1:** Nhấn nút **xóa** (icon thùng rác đỏ/cam) tại tờ điều trị muốn xóa

### Hình 56: Xóa Tờ điều trị
*(Màn hình danh sách CÁC ĐỢT ĐIỀU TRỊ với arrow chỉ vào nút delete)*

**B2:** Xuất hiện 1 thông báo xác nhận, nhấn nút **Xác nhận** để xác nhận xóa

### Hình 57: Xác nhận xóa tờ điều trị

**Dialog xác nhận:**
```
Xác nhận xóa                                      [×]

⚠️  Xác nhận xóa tờ điều trị #2507311641248900019?

        × Hủy bỏ          ✓ Xác nhận
```

---

## Trang 50 — Xóa thành công + Thêm cận lâm sàng (7.4)

### Hình 58: Xóa tờ điều trị thành công

**Context:** Sau khi xác nhận xóa

**Màn hình:** CÁC ĐỢT ĐIỀU TRỊ

**Table:** Trống (không có dữ liệu)
- Hiển thị: "Không có dữ liệu..."
- Pagination: Showing 0 - 0 of 0 products

---

### 7.4. Thêm chỉ định "Cận lâm sàng" cho tờ điều trị

**B1:** Tại trang **Tờ điều trị**, nhấn chọn tab `Cận lâm sàng` để tiếp tục

**B2:** Tại mục **Cận lâm sàng**, nhấn nút `+ Thêm` để hiển thị thêm các cận lâm sàng

### Hình 59: Mục Cận lâm sàng

**Màn hình:** TỜ ĐIỀU TRỊ — Tab `Cận lâm sàng` đang active

**Tabs:**
- `Tờ điều trị`
- `Thuốc`
- `Cận lâm sàng` (active)

**DANH SÁCH CẬN LÂM SÀNG** (table):

| Cột | Mô tả |
|-----|-------|
| Đối tượng ↕ | Loại đối tượng |
| Chỉ định ↕ | Tên xét nghiệm/dịch vụ |
| Số lượng ↕ | Số lượng |
| Ngày ↕ | Ngày chỉ định |
| Ghi chú ↕ | Ghi chú |

*(Hiển thị: Không có chỉ định nào thuộc tờ điều trị này)*

---

## Trang 51 — Form thêm Cận lâm sàng (Hình 60)

### Hình 60: Màn hình thêm dịch vụ Cận lâm sàng

**B3:** Nhập đầy đủ các thông tin, dịch vụ. Nhấn nút `+ Thêm` để thêm dịch vụ cận lâm sàng vào danh sách

**Form CẬN LÂM SÀNG** (section đỏ highlight):

| Field | Kiểu | Giá trị ví dụ |
|-------|------|---------------|
| Đối tượng | Dropdown | Thu phí |
| Thời gian | DateTime picker | 01/08/2025 09:28 |
| Dịch vụ | Dropdown | XÉT NGHIỆM PAP - A |
| Số lượng | Number | 1 |
| Ghi chú | Textarea | (trống) |

**Nút action:**
- `+ Thêm` (xanh lá)
- `← Quay Lại` (xanh)

**Section phía dưới — CẬN LÂM SÀNG (table rỗng):**

| Cột | Mô tả |
|-----|-------|
| Đối tượng ↕ | |
| Chỉ định ↕ | |
| Số lượng ↕ | |
| Ngày ↕ | |
| Ghi chú ↕ | |

*(Hiển thị 0 - 0 / 0 chỉ định)*

---

## Trang 52 — Xác nhận thêm CLS thành công (Hình 61–62)

### Hình 61: Thông báo thêm Dịch vụ thành công

**Toast notification (xanh lá, top-right):**
- Thêm mới Dịch vụ thành công ✓

**Form CẬN LÂM SÀNG:** Vẫn hiện, nhưng fields đã trống (sẵn sàng thêm tiếp)

---

### Hình 62: Danh sách chỉ định Cận lâm sàng sau khi đã thêm thành công

**Màn hình:** TỜ ĐIỀU TRỊ — Tab Cận lâm sàng

**DANH SÁCH CẬN LÂM SÀNG (table):**

| STT | Đối tượng | Chỉ định | Số lượng | Ngày | Ghi chú | Action |
|-----|-----------|----------|----------|------|---------|--------|
| 1 | Thu phí | XÉT NGHIỆM PAP - A | 1 | 01/08/2025 09:28 | | Nút delete (đỏ) |

---

## Trang 53 — Xóa CLS + Thêm thuốc (7.5–7.6)

### 7.5. Xóa chỉ định "Cận lâm sàng" trong tờ điều trị

**B1:** Tại Mục **Cận lâm sàng** của **Tờ điều trị**, nhấn nút **xóa** tại dịch vụ muốn xóa

**B2:** Xuất hiện màn hình xác nhận xóa, nhấn **Xác nhận** để xác nhận xóa dịch vụ

### Hình 63: Xác nhận xóa dịch vụ Cận lâm sàng

**Dialog:**
```
Xác nhận xóa                                    [×]

⚠️  Xác nhận xóa chỉ định - cận làm sàng
    #2508011002360000002 - XÉT NGHIỆM PAP- A?

         × Hủy bỏ        ✓ Xác nhận
```

---

### Hình 64: Đã xóa thành công dịch vụ Cận lâm sàng

**Toast (xanh lá):** Xóa thành công

**Table:** Không có chỉ định nào thuộc tờ điều trị này

---

### 7.6. Thêm chỉ định thuốc cho tờ điều trị

**B1:** Tại trang **Tờ điều trị**, chọn mục `Thuốc`

**B2:** Tại mục **Thuốc**, nhấn nút `+ Thêm` để thêm chỉ định thuốc

---

## Trang 54 — Màn hình Thuốc (Hình 65)

### Hình 65: Màn hình Tờ điều trị mục Thuốc

**Sidebar (left nav — expanded):**
- Bệnh Án ▲
  - Mẫu Bệnh Án
  - Hồ Sơ Bệnh Án
- Chức Năng Hồ Sơ Bệnh Án ▼
- Báo Cáo ▼
- Hồ Sơ Bệnh Án Điện Tử ▼
- Chữ Ký Số ▼

**Màn hình:** TỜ ĐIỀU TRỊ — Tab `Thuốc` (active)

**Tabs:**
- `Tờ điều trị`
- `Thuốc` (active, underlined)
- `Cận lâm sàng`

**DANH SÁCH THUỐC** (table rỗng):

| Cột | Mô tả |
|-----|-------|
| STT ↕ | Số thứ tự |
| Đối tượng ↕ | Thu phí / BHYT |
| Tên ↕ | Tên thuốc |
| Cách dùng ↕ | Hướng dẫn dùng |
| Kho ↕ | Tên kho |

*(Không có dữ liệu: "Không có dự trữ thuốc cho tờ điều trị này.")*

**Nút action:**
- `+ Thêm` (xanh lá, góc trên phải)
- `← Quay Lại` (xanh)

---

## Trang 55 — Form thêm thuốc (Hình 66–67)

**B3:** Nhập đầy đủ các thông tin và thuốc muốn thêm, nhấn nút `+ Thêm` để thêm vào danh sách

### Hình 66: Màn hình thêm Thuốc

**Form THUỐC** (section đỏ highlight):

| Field | Kiểu | Giá trị ví dụ |
|-------|------|---------------|
| Đối tượng | Dropdown | Thu phí |
| Kho | Combo | Kho cấp phát lẻ ×↓ |
| Thuốc | Dropdown combo | NATCL (Natri clorid 9% 100ml) (Natri Clorid) (Kho cấp phát lẻ) (3 Chai) |
| Ngày | Number | 1 |
| Lần truyền | Number | 1 |
| Mỗi lần | Number | 1 |
| Số lượng | Number | 1 |
| Cách dùng | Textarea | Ngày Tiêm truyền 1 lần: Mỗi lần 1 nước |

**Nút action:**
- `+ Thêm` (xanh lá)
- `← Quay Lại` (xanh)

---

### Hình 67: Thông báo thêm thuốc thành công

**Toast (xanh lá, top-right):** "Thêm mới dự trữ thuốc thành công" ✓

**Label dưới form:** "Thuốc đã được thêm vào danh sách"

**THUỐC** (table sau khi thêm):

| STT | Đối tượng | Tên | Cách dùng | Kho |
|-----|-----------|-----|-----------|-----|
| Số | Thu phí | Natri clorid | Ngày Tiêm truyền 1 lần; Mỗi lần 1 nước | Kho cấp phát lẻ |

---

## Trang 56 — Xóa thuốc (7.7) + In tờ điều trị (7.8)

### 7.7. Xóa Thuốc khỏi Tờ điều trị

**B1:** Tại mục Thuốc của **Tờ điều trị**, nhấn nút **xóa** tại thuốc muốn xóa

**B2:** Thông báo **Xác nhận xóa** xuất hiện, nhấn **Xác nhận** để đồng ý xóa

### Hình 68: Thông báo Xác nhận xóa

**Dialog:**
```
Xác nhận xóa                                    [×]

⚠️  Xác nhận xóa dự trữ thuốc #250801092822820002
    - $Xyzal?

         × Hủy bỏ        ✓ Xác nhận
```

---

### Hình 69: Thông báo xóa dự trữ thuốc thành công

**Toast (xanh lá):** Xóa dự trữ thuốc thành công ✓

**Table THUỐC:** Trống — Thuốc đã bị xóa khỏi danh sách

---

### 7.8. In Tờ điều trị

**Cách 1:** Chọn checkbox tại các tờ điều trị muốn in, nhấn nút `In` (icon download, tím) ở thanh công cụ

**Cách 2:** In trực tiếp tại đợt điều trị

- **B1:** Tại đợt điều trị muốn in, nhấn nút **edit** (bút chì xanh lá)
- **B2:** Kéo xuống dưới cùng, tại góc dưới bên phải, nhấn nút `In` (tím)

### Hình 70: In Tờ điều trị (Cách 1)

**Màn hình CÁC ĐỢT ĐIỀU TRỊ:**

| Checkbox | Số TT | Ngày ↕ | Bác sĩ ↕ | Loại ↕ | Actions |
|----------|-------|--------|----------|--------|---------|
| ✓ (checked) | 0 | 01/08/2025 11:06 | BSCKI. Nguyễn Thị Thu | Thường quy (phiếu bình) | Edit + Delete |

**Nút `In`** được highlight với arrow chỉ vào

---

### Hình 71: In Tờ điều trị (Cách 2)

**Màn hình:** Chi tiết Tờ điều trị (form edit)

**Nút action dưới cùng:**
- `+ Cập Nhật`
- `In` ← (arrow chỉ vào)
- `← Quay Lại`

---

## Chương 8 — Ký số lãnh đạo (Digital Signature)

### Hình 72: Màn hình ký số

**Sidebar:** Hệ Thống Ký Số Bệnh Án Điện Tử

**Tìm kiếm:** (bộ lọc tìm kiếm)

**Nút:** `Tìm kiếm` (xanh lam)

**Table danh sách tài liệu chờ ký:**

| Cột | Mô tả |
|-----|-------|
| Tên | Tên tài liệu |
| Phòng | Tên phòng |
| Bệnh nhân | Tên bệnh nhân |
| STT BN | Mã số bệnh nhân |
| Ngày vào | Ngày nhập viện |
| Khoa | Tên khoa |
| CCCD | Số CCCD |
| Ngày ký | Ngày ký |
| Ngày ra | Ngày xuất viện |
| Trạng ký | Trạng thái ký số |
| Actions | Các nút hành động |

**Preview panel (right):**

Hiển thị **xem trước tài liệu trước khi ký** — PDF viewer với:
- Header bệnh viện (logo + tên)
- **GIẤY RA VIỆN**
- Thông tin đầy đủ của bệnh nhân
- Chữ ký số ở góc dưới

**Business Rule:** Người dùng có thể ký số giấy tờ như trên HIS, để đăng sử dụng. Tại màn hình này có những nội dung đáng chú ý như:

---

## Trang 58–59 — Ký số: tìm kiếm + danh sách tài liệu

### Hình 73: Thanh tìm kiếm

**Bộ lọc tìm kiếm:**

| Field | Kiểu | Giá trị ví dụ |
|-------|------|---------------|
| Ngày từ | DatePicker | 21/09/2025 |
| Ngày đến | DatePicker | 22/09/2025 |
| Giấy ra vào | Dropdown | Giấy ra vào |
| Loại hồ sơ | Dropdown | Loại hồ sơ |
| Tên/Mã | Text search | 25050497 |

**Nút:** `Tìm kiếm` (xanh lam)

**Business Rule:** Thanh tìm kiếm dựa theo các dữ liệu như: Ngày vào viện, ngày ra viện, loại giấy tờ, vai trò người ký, mã bệnh nhân

---

### Hình 74: Danh sách tài liệu

**Danh sách tài liệu (table):**

| Cột | Mô tả |
|-----|-------|
| STT | Số thứ tự |
| Tên | Tên tài liệu |
| Bệnh nhân | Tên bệnh nhân |
| Phòng | Phòng/Khoa |
| STT BN | Mã BN |
| Ngày vào | Ngày nhập viện |
| Trạng ký | Trạng thái |
| ... | ... |

**Business Rule:** Danh sách tài liệu liên quan đến bệnh nhân. Tại danh sách này cung cấp các thông tin như: Thông tin tài bệnh nhân, xem qua tài liệu trước khi ký, ký/hủy ký tài liệu. Khi chọn xem qua tài liệu, nội dung sẽ được hiển thị phía dưới danh sách:

---

### Hình 75: Ví dụ tài liệu xem trước khi in

**Xem trước tài liệu (PDF viewer embedded):**

Hiển thị **GIẤY RA VIỆN** với:
- Thông tin bệnh nhân đầy đủ
- Thông tin điều trị
- Chữ ký số điện tử của bác sĩ (hình ảnh chữ ký)
- Con dấu điện tử

---

## Phần B — Giao diện bệnh nhân (Patient Portal)

## Trang 60 — Đăng nhập bệnh nhân

### B.1. Đăng nhập

### Hình 76: Màn hình đăng nhập của bệnh nhân

**UI:** Form đăng nhập với nền gradient tím nhạt, card trắng bo tròn

**Title:** Đăng nhập
**Subtitle:** Vui lòng đăng nhập để sử dụng hệ thống

**Fields:**

| Field | Placeholder |
|-------|-------------|
| Tài Khoản | 20145579 |
| Mật Khẩu | ••• (ô có icon eye) |

**Nút:** `Đăng nhập` (nền tím đậm, full-width)

**Business Rule:**
- Tại màn hình đăng nhập chung, người dùng khi nhập tài khoản là **Mã bệnh nhân** của mình thì chương trình sẽ hiểu và chuyển thành giao diện đăng nhập cho bệnh nhân.
- **Mật khẩu** là **CCCD** của người bệnh.

---

## Trang 61 — Màn hình bệnh nhân (B.2)

### B.2. Màn hình bệnh nhân

### Hình 77: Màn hình của bệnh nhân

**Header:** Xin chào Người dùng (avatar tròn)

**Layout — 2 panel:**

**Panel trái — THÔNG TIN BỆNH NHÂN:**
```
LÂM THỊ TRÚC LINH
20145579

Giới tính: Nam
Ngày sinh: Không xác định
SDT: Không xác định
Địa chỉ: , N/A
```

**Panel phải — THÔNG TIN VÀO VIỆN:**
- Ô tìm kiếm: nhập năm (2025)
- Nút `Tìm kiếm` (xanh lam)

**Bảng THÔNG TIN VÀO VIỆN (table):**

| Cột | Giá trị ví dụ |
|-----|---------------|
| Ngày | 17/4/2025 |
| Bác sĩ | BSCKI. Võ Huy Hùng |
| Khoa | PK Tai Mũi Họng (P026) |
| Mã ICD | J32 |
| Chẩn đoán | Sau phẫu thuật nội soi mũi xoang |
| Thao tác | `Xem chi tiết` (xanh, icon eye) |

**Rows ví dụ:**

| Ngày | Bác sĩ | Khoa | ICD | Chẩn đoán |
|------|--------|------|-----|-----------|
| 17/4/2025 | BSCKI. Võ Huy Hùng | PK Tai Mũi Họng (P026) | J32 | Sau phẫu thuật nội soi mũi xoang |
| 5/4/2025 | BSCKI. Võ Huy Hùng | PK Tai Mũi Họng (P025) | J32 | Sau phẫu thuật mổ khe giữa, nạo sàng, ngạch trán |
| 31/3/2025 | BSCKI. Võ Huy Hùng | Khoa Tai Mũi Họng | J32 | Viêm xoang mạn tính |
| 27/3/2025 | BSCKI. Võ Huy Hùng | PK Tai Mũi Họng (P026) | J32 | Viêm đa xoang |
| 19/3/2025 | BSCKI. Nguyễn Thị Thu | PK Tai Mũi Họng (P026) | J32 | Viêm đa xoang |
| 12/3/2025 | BSCKI. Nguyễn Thị Thu | PK Tai Mũi Họng (P026) | J32 | Viêm đa xoang |

**Pagination:** (phân trang)

**FAB:** `+` (xanh lam, góc dưới phải)

---

### Hình 78: Thông tin bệnh nhân (card)

**Card:**
```
THÔNG TIN BỆNH NHÂN

LÂM THỊ TRÚC LINH
20145579

Giới tính: Nam
Ngày sinh: Không xác định
SDT: Không xác định
Địa chỉ: , N/A
```

---

## Trang 62 — Lần điều trị + Chi tiết kết quả

### Hình 79: Các lần điều trị tại bệnh viện

**Bảng lịch sử điều trị:**

| Ngày | Bác sĩ | Khoa | Mã ICD | Chẩn đoán | Thao tác |
|------|--------|------|--------|-----------|----------|
| 17/4/2025 | BSCKI. Võ Huy Hùng | PK Tai Mũi Họng (P026) | J32 | Sau phẫu thuật nội soi mũi xoang | `Xem chi tiết` |
| 5/4/2025 | BSCKI. Võ Huy Hùng | PK Tai Mũi Họng (P025) | J32 | Sau phẫu thuật mổ khe giữa, nạo sàng, ngạch trán | `Xem chi tiết` |
| 31/3/2025 | BSCKI. Võ Huy Hùng | PK Tai Mũi Họng (P026) | J32 | Viêm xoang mạn tính | `Xem chi tiết` |
| 27/3/2025 | BSCKI. Võ Huy Hùng | PK Tai Mũi Họng (P026) | J32 | Viêm đa xoang | `Xem chi tiết` |
| 19/3/2025 | BSCKI. Nguyễn Thị Thu | PK Tai Mũi Họng (P026) | J32 | Viêm đa xoang | `Xem chi tiết` |
| 12/3/2025 | BSCKI. Nguyễn Thị Thu | PK Tai Mũi Họng (P026) | J32 | Viêm đa xoang | `Xem chi tiết` |

**Business Rule:** Tại mỗi lần điều trị, người bệnh có thể xem lại các thông tin bệnh án của mình khi nhấn nút `Xem chi tiết`.

---

### Hình 80: Thông tin điều trị - Toa thuốc

**Màn hình:** THÔNG TIN VÀO VIỆN | KẾT QUẢ

**Tabs:**
- `Toa thuốc` (active)
- `CĐHA - TDCN`
- `Xét nghiệm`
- `Phẫu thuật thủ thuật`

**Table (Toa thuốc):**

| Ngày | Bác sĩ | Thao tác |
|------|--------|---------|
| 12/03/2025 09:22 | BSCKI. Nguyễn Thị Phạm | `In thuốc` (tím) |

---

### Hình 81: Thông tin điều trị - CĐHA

**Tab `CĐHA - TDCN`** active

**Nhóm:**
- (hiển thị danh sách)

**Table:**

| Ngày ↕ | Kỹ thuật ↕ | Bác sĩ ↕ | Thao tác |
|--------|------------|----------|---------|
| 12/02/2025 07:12 | Chụp X quang Đứng (Ở thẳng áp quang) ở hay 1 phim | BSCKI. Nguyễn Thị Thứ | `In thuốc` |
| 12/02/2025 07:12 | Chụp X quang Ổi (Ở thẳng áp quang) ở hay 1 phim | BSCKI. Nguyễn Thị Thứ | `In thuốc` |

---

## Trang 63 — Xét nghiệm + PTTT (Hình 82–83)

### Hình 82: Thông tin điều trị - Xét nghiệm

**Tab `Xét nghiệm`** active

**Table:**

| Ngày | Barcode | Thao tác |
|------|---------|---------|
| 12/02/2025 07:12 | (barcode ID) | `In thuốc` (tím) |

---

### Hình 83: Thông tin điều trị - PTTT

**Tab `Phẫu thuật thủ thuật`** active

**Table:**

| Ngày | Chẩn đoán | Thao tác |
|------|-----------|---------|
| (trống — không có dữ liệu) | | |

---

### 2.1. Thông tin điều trị - Toa thuốc

**Business Rule:**
- Sau khi bệnh nhân chọn lại đợt điều trị. Tại **Toa thuốc**, bệnh nhân có thể thấy được các lần cấp thuốc bằng cách nhấn nút `In thuốc` tại **Toa thuốc** muốn coi.
- Lúc này, bệnh nhân sẽ được chuyển đến màn hình với thông tin chi tiết về **Toa thuốc** đã được kê.
- **Nội dung chính** của màn hình này bao gồm:
  - Thông tin hành chính của bệnh nhân
  - Thông tin chuẩn đoán vào viện của đợt điều trị
  - Chi tiết toa thuốc và lời dặn của bác sĩ

---

## Trang 64 — Chi tiết toa thuốc bệnh nhân (Hình 84)

### Hình 84: Thông tin chi tiết toa thuốc đã được kê

**Màn hình:** THÔNG TIN VÀO VIỆN | KẾT QUẢ | TOA THUỐC

**Layout đầy đủ:**

**Panel trái — THÔNG TIN BỆNH NHÂN:**
```
LÂM THỊ TRÚC LINH
20145579

Giới tính: Nam
Ngày sinh: Không xác định
SDT: Không xác định
Địa chỉ: , N/A
```

**Panel phải — THÔNG TIN VÀO VIỆN:**
- Ô nhập: 20145579
- Năm: 2025
- Nút `←` (Quay Lại) (full-width)

**Bảng THÔNG TIN VÀO VIỆN | KẾT QUẢ | TOA THUỐC:**

**Header thông tin toa:**

| Field | Giá trị |
|-------|---------|
| Ngày | 12/03/2025 08:22 |
| Phòng | PK Tai Mũi Họng (P026) |
| Bác sĩ | BSCKI. Nguyễn Thị Thu |
| Chẩn đoán chính | J32 |
| (tên chẩn đoán) | Viêm đa xoang |
| Chẩn đoán kèm theo | (trống) |
| Triệu chứng lâm sàng | đau đầu, đau mũi |
| Kết luận | (trống) |

**LỜI DẪN (bảng thuốc):**

| Thứ tự | Thuốc | Hoạt chất | Đơn vị | Đường dùng | Số lượng | Số ngày | Cách dùng |
|--------|-------|-----------|--------|------------|----------|---------|-----------|
| 1 | Ba-Mentin 1000mg + 62.5mg | Amoxicillin + Acid Clavulanic | Viên | Uống | 14 | 7 | Uống ngày 2 lần, lấy Viên |
| 2 | Medrol 16mg | Methyl prednislon | Viên | Uống | 5 | 5 | Uống ngày 1 lần, lấy Viên |
| 3 | Etheso 40mg | Esomeprazol | Viên | Uống | 5 | 5 | Uống ngày 1 lần, lấy Viên |
| 4 | Medovent 30mg | Ambroxol | Viên | Uống | 21 | 7 | Uống ngày 3 lần, lấy Viên |
| 5 | Pharbacol 650mg | Paracetamol | Viên | Uống | 15 | 5 | Uống ngày 3 lần, lấy Viên |
| 6 | Aerius 5mg | Desloratadine | Viên | Uống | 7 | 7 | Uống ngày 1 lần, lấy Viên |

**Pagination:** (có nhiều trang thuốc)

---

## Trang 65 — CĐHA bệnh nhân (2.2)

### 2.2. Thông tin điều trị - CĐHA

**Business Rule:**
- Sau khi bệnh nhân chọn lại đợt điều trị. Tại **CDHA-TDCN**, bệnh nhân có thể thấy được các chỉ định thuộc nhóm **CĐHA**
- Khi nhấn nút `>` thì sẽ mở ra thông tin về kỹ thuật đã được sử dụng

### Hình 85: Các nhóm thuộc CĐHA

**Nhóm danh mục:**
- > X quang
- > Nội soi
- > Điện tim
- > CT Scan

---

### Hình 86: Danh sách các kỹ thuật được chỉ định

**Sau khi expand "X quang":**

**Table:**

| Ngày ↕ | Kỹ thuật ↕ | Bác sĩ ↕ | Thao tác |
|--------|------------|----------|---------|
| 12/02/2025 07:12 | Chụp X quang Đứng (Ở thẳng áp quang) ở hay 1 phim | BSCKI. Âu Thị Cẩm Lệ | `In thuốc` |
| 12/02/2025 07:12 | Chụp X quang (Ở thẳng áp quang) ở hay 1 phim | BSCKI. Âu Thị Cẩm Lệ | `In thuốc` |

---

## Trang 66 — Xét nghiệm bệnh nhân (2.3)

### 2.3. Thông tin điều trị - Xét nghiệm

**Business Rule:**
- Sau khi bệnh nhân chọn lại đợt điều trị. Tại **Xét nghiệm**, bệnh nhân có thể xem lại các xét nghiệm mà bản thân đã làm.
- Khi nhấn nút `Chi tiết`, bệnh nhân sẽ được chuyển đến màn hình chứa các thông tin và kết quả của xét nghiệm này.

---

## Trang 66–67 — Chi tiết kết quả xét nghiệm (Hình 87)

### Hình 87: Thông tin chi tiết và kết quả xét nghiệm

**Màn hình:** THÔNG TIN VÀO VIỆN | KẾT QUẢ | XÉT NGHIỆM

**Layout:**
- Panel trái: THÔNG TIN BỆNH NHÂN (LÂM THỊ TRÚC LINH / 20145579)
- Panel phải: THÔNG TIN VÀO VIỆN với ô tìm kiếm + nút Quay Lại

**Bảng THÔNG TIN VÀO VIỆN | KẾT QUẢ | XÉT NGHIỆM:**

**Thông tin phiếu:**

| Field | Giá trị |
|-------|---------|
| Ngày | (ngày xét nghiệm) |
| Phòng | (tên phòng) |
| Bác sĩ | (tên bác sĩ) |
| Chẩn đoán chính | (mã ICD + tên) |
| Chỉ số bình thường (Nam) | (giá trị) |
| Chỉ số bình thường (Nữ) | (giá trị) |
| Triệu chứng lâm sàng | |
| Kết luận | |
| Điều dưỡng thực hiện | |
| Mẫu xét nghiệm | |

**LỜI DẪN (bảng kết quả xét nghiệm):**

| Thứ tự | Tên xét nghiệm | Kết quả | Đơn vị | Chỉ số bình thường (Nam) | Chỉ số bình thường (Nữ) | Bác sĩ | Khoa |
|--------|----------------|---------|--------|--------------------------|--------------------------|--------|------|
| 1 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | | K/uL | 4.1 - 10.9 | 4.1 - 10.9 | | |
| 2 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 6.67 | K/uL | 4.1 - 10.9 | 4.1 - 10.9 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |
| 3 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 3.48 | K/uL | 1.50 - 7.00 | 1.50 - 7.00 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |
| 4 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 2.64 | K/uL | 1 - 3.7 | 1 - 3.7 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |
| 5 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 0.03 | K/uL | 0 - 0.1 | 0 - 0.1 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |
| 6 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 0.40 | K/uL | 0 - 0.7 | 0 - 0.7 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |
| 7 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 0.11 | K/uL | 0 - 0.4 | 0 - 0.4 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |
| 8 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 52.2 | %N | 40 - 74 | 40 - 74 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |
| 9 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 39.8 | %L | 25 - 45 | 25 - 45 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |
| 10 | Tổng phân tích tế bào máu ngoại vi (bằng máy đếm laser) | 0.4 | %B | 0 - 1.5 | 0 - 1.5 | BSCKI. Âu Thị Cẩm Lệ | Khoa Tai Mũi Họng |

**Pagination:** Trang 1 / nhiều trang (rows 1–10 hiển thị, còn nhiều trang)

---

## Trang 67–68 — Tra cứu file hồ sơ bệnh nhân (B.3)

### B.3. Tra cứu file hồ sơ của bệnh nhân

### Hình 88: Màn hình tra cứu file hồ sơ của bệnh nhân

**Sidebar:** Tra Cứu Thông Tin ▼

**Tab navigation:**
- `Tra cứu` (active)
- `Hướng dẫn Thành Công...`
- `Lịch hẹn`

**Panel trái — Thông tin bệnh nhân:**

**Badge:** Mã bệnh nhân

**Avatar:** Tròn (default)

**Thông tin:**
```
NGUYỄN MẠNH HOÀNG
(tên bệnh nhân đăng nhập)
```

**Sub-info:**
```
TP địa chỉ: (địa chỉ)
Địa chỉ: 10 địa chỉ phường, Quận Tây, TP. Thủ Đức
(thông tin liên hệ)
Tuổi: 25
```

**Chọn hồ sơ:** Dropdown

**Panel phải — Danh sách các file hồ sơ:**

**Business Rule của màn hình:**
- Thông tin người bệnh
- File hồ sơ: Hiển thị danh sách các file hồ sơ của bệnh nhân đã có ký số. Trường hợp người bệnh chưa xác thực thì sẽ không thể coi được thông tin từ giấy tờ này.
- Xác thực CCCD: Bệnh nhân cần phải xác thực CCCD của người bệnh để có thể xem chi tiết các giấy tờ. Có 2 cách để xác thực CCCD:
  - Nhập CCCD trực tiếp
  - Quét mã QR trên CCCD
- Chọn hồ sơ: Hiển thị danh sách các giấy tờ của người bệnh.

---

## Trang 68 — Xem PDF hồ sơ sau khi xác thực (Hình 89)

### Hình 89: Nội dung của tra cứu sau khi xác thực

**Màn hình:** Tra Cứu Thông Tin — Tab tra cứu

**Layout sau xác thực thành công:**

**Sidebar trái:**
- `Tra Cứu Thông Tin ▼`

**Chọn hồ sơ:** Dropdown — "Tra cứu Thành Công (2024-10-...)"

**Xem PDF (right panel):**

**PDF Viewer** với toolbar:
```
≡  e168e8f5-98be-4...    1 / 1    — 61% +    [controls: rotate, download, etc.]
```

**Nội dung PHIẾU KẾT QUẢ XÉT NGHIỆM — HÓA SINH:**

```
Số: ...
Mã BN: 1000080
Họ và tên: NGUYỄN MẠNH HOÀNG
Tuổi sinh: 20
Giới tính: Nam
Địa chỉ: 10 địa chỉ phường Tam Phú, Quận Tây Đức, TP. Thủ Đức, Thành phố Hồ Chí Minh
Bác sĩ điều trị: BS.CKI. LÊ THỊ THU PHƯƠNG
Khoa phòng: Phòng khám Tai Mũi Họng non nước 1
```

**Bảng kết quả xét nghiệm (HÓA SINH):**

| STT | TÊN XÉT NGHIỆM | KẾT QUẢ | CHỈ SỐ BÌNH THƯỜNG |
|-----|----------------|---------|-------------------|
| | Creatinin | 2.11 | (1.01 - 1.2 mg/dl) |
| | Glucose | ... | (3.9 - 5.5 mmol/l) |
| | ... | ... | ... |
| | Điện giải đồ (Na, K, Cl) | | |
| | Na | 1.5 | (1,000-1,500) |
| | K | 4.0 | (Neg Neg) |
| | Cl | Negative | (Neg Neg) |
| | pH | 4.8 | (3.50 - 7.5) |
| | NO | Negative | (Neg Neg) |
| | Bạ | 1.003 | (1,000-1,030) |
| | Uy | 2+ | (Neg Neg) |
| | Có Albumin niệu/UACR | 37.5 | (70 - 100 mg/l) |
| | Creatinine tiền niệu | 1 | (< 90 mg/l) |

**Business Rule:**
- Người bệnh xem được PDF phiếu kết quả xét nghiệm sau khi xác thực CCCD thành công.
- Nội dung PDF hiển thị đúng phiếu kết quả từ hệ thống HIS.

---

## Tổng hợp — Cấu trúc tính năng Web EMR (Part 2)

### A. Giao diện bác sĩ / nhân viên y tế (pp. 35–59)

| Tính năng | Màn hình | Mô tả |
|-----------|----------|-------|
| Danh sách tài liệu EMR | Hình 37 | Card PDF tài liệu, nút xem tổng hợp |
| Lịch sử khám bệnh | Hình 38 | Danh sách 3 card lần khám |
| Chi tiết lịch sử khám | Hình 39–40 | Tab Thông tin điều trị + Kết quả |
| Lịch sử toa thuốc | Hình 41–42 | Tab TOA THUỐC, chi tiết toa |
| Lịch sử CĐHA-TĐCN | Hình 43–44 | Tab CĐHA-TĐCN, chi tiết kỹ thuật |
| Lịch sử xét nghiệm | Hình 45–46 | Tab XÉT NGHIỆM, danh sách+chi tiết |
| Chi tiết kết quả XN | Hình 47 | Bảng kết quả chi tiết từng chỉ số |
| Lịch sử PTTT | Hình 48–49 | Tab PHẪU THUẬT THỦ THUẬT |
| Tờ điều trị — Thêm mới | Hình 50–51–52 | Form tạo Y lệnh, CĐ, chế độ ăn |
| Tờ điều trị — Danh sách | Hình 53–54 | Table CÁC ĐỢT ĐIỀU TRỊ |
| Tờ điều trị — Cập nhật | Hình 55 | Form edit + nút Cập Nhật |
| Tờ điều trị — Xóa | Hình 56–57–58 | Delete + confirm dialog |
| Cận lâm sàng — Thêm | Hình 59–60–61–62 | Form thêm dịch vụ CLS |
| Cận lâm sàng — Xóa | Hình 63–64 | Delete + confirm dialog |
| Thuốc — Thêm | Hình 65–66–67 | Form thêm thuốc (kho, liều dùng) |
| Thuốc — Xóa | Hình 68–69 | Delete + confirm dialog |
| In tờ điều trị | Hình 70–71 | Cách 1: checkbox batch, Cách 2: từng tờ |
| Ký số lãnh đạo | Hình 72–75 | PDF viewer + tìm kiếm + ký/hủy ký |

### B. Giao diện bệnh nhân (Patient Portal) (pp. 60–68)

| Tính năng | Màn hình | Mô tả |
|-----------|----------|-------|
| Đăng nhập bệnh nhân | Hình 76 | Tài khoản = Mã BN, mật khẩu = CCCD |
| Dashboard bệnh nhân | Hình 77–78–79 | Thông tin cá nhân + lịch sử vào viện |
| Toa thuốc bệnh nhân | Hình 80–84 | Xem chi tiết toa: thuốc, cách dùng |
| CĐHA bệnh nhân | Hình 81–85–86 | Nhóm kỹ thuật + danh sách chỉ định |
| Xét nghiệm bệnh nhân | Hình 82–83–87 | Kết quả xét nghiệm chi tiết từng chỉ số |
| PTTT bệnh nhân | Hình 83 | Danh sách phẫu thuật thủ thuật |
| Tra cứu hồ sơ | Hình 88–89 | Xác thực CCCD → xem PDF hồ sơ ký số |

### Business Rules tổng hợp

1. **Bệnh nhân đăng nhập:** Tài khoản = Mã bệnh nhân, Mật khẩu = CCCD. Hệ thống tự nhận diện và chuyển giao diện phù hợp.
2. **Tờ điều trị:** Bao gồm 3 tab: Tờ điều trị (Y lệnh, CĐ, chế độ ăn) + Thuốc (kho, liều) + Cận lâm sàng (dịch vụ xét nghiệm/CĐHA).
3. **Ký số lãnh đạo:** Xem preview PDF trước khi ký. Tìm kiếm theo ngày vào/ra, loại giấy tờ, vai trò, mã BN.
4. **Tra cứu hồ sơ bệnh nhân:** Bắt buộc xác thực CCCD (nhập trực tiếp hoặc quét QR) trước khi xem nội dung file hồ sơ đã ký số.
5. **Lịch sử khám bệnh:** Bệnh nhân xem được đầy đủ: toa thuốc, CĐHA, xét nghiệm, phẫu thuật của mỗi lần khám.
6. **Xác nhận xóa:** Mọi thao tác xóa (tờ điều trị, thuốc, CLS) đều có dialog xác nhận với ID cụ thể.
7. **Toast thông báo:** Mọi thao tác thêm/xóa/cập nhật đều có toast xanh lá góc trên phải thông báo kết quả.
