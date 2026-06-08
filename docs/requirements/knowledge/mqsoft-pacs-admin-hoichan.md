# VRPACS — Admin & Hội chẩn Online
> Sources: 2 PDFs (33 + 9 = 42 pages)
> Extracted: 2026-06-01
> Vendor: Công ty Cổ phần Công nghệ C+ | vrpacs.com | contact@vrpacs.com | (+84) 982.603.805
> Address: Số 1, ngõ 31, đường 18M, Phường Mộ Lao, Quận Hà Đông, Thành phố Hà Nội

---

## Part 1: PACS Admin

### I. ĐĂNG NHẬP HỆ THỐNG

#### 1.1 Lựa chọn trình duyệt
Hỗ trợ các trình duyệt: Chrome, Cốc Cốc, Firefox, Microsoft Edge.

#### 1.2 Nhập địa chỉ hệ thống ADMIN
URL: `vrpacs.com` (nhập vào thanh địa chỉ trình duyệt)

#### 1.3 Nhập thông tin tài khoản, mật khẩu đăng nhập
Màn hình đăng nhập gồm:
- Username (text field)
- Password (text field)
- Checkbox "Remember me"
- Link "Forgot password"
- Nút "Log in" (màu xanh)

---

### II. HỆ THỐNG TRANG QUẢN TRỊ ADMIN

#### 2.1 Bố cục giao diện
Giao diện Admin gồm 2 vùng chính:
1. **Danh sách các chức năng quản trị** (sidebar trái) — menu dọc liệt kê tất cả module
2. **Bảng hiển thị chức năng** của từng chức năng được chọn (vùng nội dung phải)

---

#### 2.2 Các chức năng chính

### 2.2.1 Thống kê

**Chức năng Tìm kiếm** — 5 tiêu chí lọc:
1. **Theo thời gian** — date range picker (từ ngày / đến ngày / tháng / năm)
2. **Theo phòng chụp, thiết bị chụp** — dropdown chọn phòng / thiết bị
3. **Theo Bác sĩ, kỹ thuật viên** — dropdown
4. **Theo thông tin ca chụp** — text search
5. **Theo thông tin bệnh nhân** — text search

Workflow: Nhập thông tin cần tìm → Ấn nút **Tìm kiếm**

**Các loại thống kê:**

1. **Thống kê theo bảng**
   - Bảng tổng hợp theo chức năng (Thống kê chung)
   - Bảng thống kê Bác sĩ
   - Bảng Thống kê kỹ thuật viên

2. **Thống kê theo biểu đồ**
   - Biểu đồ cột (bar chart) — màu sắc phân loại theo nhóm
   - Hiển thị so sánh theo thời gian

3. **Thống kê theo chi tiết**
   - Danh sách chi tiết từng ca chụp với đầy đủ thông tin:
     - STT
     - Tên bệnh nhân
     - Mã bệnh nhân
     - Ngày chụp
     - Thời gian
     - Trạng thái
     - Phòng chụp / Thiết bị
     - Kỹ thuật viên
     - Bác sĩ đọc
     - Loại dịch vụ
     - Ghi chú

---

### 2.2.2 Chức năng Bác Sĩ

Quản lý tài khoản cho Bác sĩ và KTV (Kỹ thuật viên).

**Giao diện danh sách:** Hiển thị bảng với các cột:
- Tên đăng nhập
- Họ tên Bác sĩ
- Email
- Giới tính
- Ngày sinh
- Địa chỉ
- Quyền
- Các nút thao tác: i (thông tin) | Sửa | Xóa | Gắn nhãn | Reset mật khẩu | Khóa tài khoản

**Toolbar:** `[Tìm kiếm] [Thêm mới] [Quản lý quyền] [Thêm mới nhanh]`

#### 2.2.2.1 Tìm kiếm
- Tìm kiếm theo tên, tài khoản của bác sĩ, KTV
- Tìm kiếm theo nhóm quyền (dropdown)

#### 2.2.2.2 Thêm mới
Form **THÊM MỚI BÁC SĨ** (các trường bắt buộc đánh dấu `×`):

| Trường | Loại | Bắt buộc |
|--------|------|----------|
| Họ tên | text | ✓ |
| Giới tính | radio (Nam / Nữ) | |
| Địa chỉ | text | |
| Ngày sinh | date picker | |
| Email | text | |
| Số điện thoại | text | |
| Vị trí | text | |
| Mô tả | text | |
| Thứ tự ưu tiên | dropdown (Không / ...) | |
| userHis | text | |
| Tên đăng nhập | text | ✓ |
| Mật khẩu | password | ✓ |
| Nhập lại mật khẩu | password | ✓ |
| Quyền | dropdown "Chọn một quyền" | ✓ |
| Chữ ký | Upload image | |
| LAN Only | checkbox "Chỉ cho phép trong LAN" | |
| Signature Serial Number | text | |
| Signature User | text | |
| Signature Password | text | |

→ Ấn nút **Thêm mới** để lưu.

#### 2.2.2.3 Quản lý quyền
Chức năng **Quản lý quyền** (nhóm quyền):
- **Thêm mới quyền**: Tên quyền + Mô tả → Ấn **Thêm mới**
- **Chỉnh sửa quyền**: Điền nội dung cần chỉnh sửa → **Lưu lại**
- **Xóa quyền**: Chọn quyền → Ấn nút xóa → Click OK
- **Thêm mới nhanh**: Upload file Excel → Chọn file → Click **Thêm mới**

Form thêm mới quyền:
```
THÊM MỚI QUYỀN
Tên Quyền: [text]
Mô tả: [text]
[Thêm mới]
```

Form chỉnh sửa quyền:
```
SỬA QUYỀN
Tên quyền: [editable]
Mô tả: [editable]
[Lưu lại]
```

#### 2.2.2.4 Chỉnh sửa tài khoản
**Các nút thao tác trên mỗi dòng bác sĩ:** `i | Sửa | Xóa | Gắn nhãn | Reset MK | Khóa`

**Sửa thông tin tài khoản** — Form SỬA THÔNG TIN BÁC SĨ:

| Trường | Giá trị mẫu |
|--------|------------|
| Họ tên | demo |
| Giới tính | Nam / Nữ |
| Địa chỉ | text |
| Ngày sinh | 06/12/2021 |
| Email | demo@telerad.vn |
| Số điện thoại | text |
| Vị trí | text |
| Mô tả | text |
| Thứ tự ưu tiên | Không |
| userHis | text |
| Chữ ký | Upload |
| Ảnh đại diện | Upload |

→ **Lưu lại**

**Xóa tài khoản:** Click nút Xóa → Xác nhận "Xác nhận xóa [tên]" → **Ok**

**Sửa quyền:** Click nút Tag → Tích vào các quyền cần thêm → Ấn **x** để xác nhận

**Reset mật khẩu:** Click nút Reset → Xác nhận "ĐẶT LẠI MẬT KHẨU [tên]" → **Ok**
→ Mật khẩu reset về: `Abc@123`

---

### 2.2.3 Bệnh nhân

Quản lý thông tin bệnh nhân:
- **Tìm kiếm** theo tên và email bệnh nhân
- **Tìm kiếm** theo tuổi
- **Tìm kiếm** theo giới tính
- Nút **Tìm kiếm**
- Nút **Chỉnh sửa**

---

### 2.2.4 Dịch vụ kỹ thuật

Quản lý danh sách dịch vụ kỹ thuật (chụp chiếu).
Trong chức năng **Dịch vụ kỹ thuật** gồm: **Tìm kiếm** và **Chỉnh sửa**, **Xóa** dịch vụ kỹ thuật.

---

### 2.2.5 Loại dịch vụ

Quản lý loại dịch vụ (nhóm/phân loại dịch vụ chụp chiếu).

**Toolbar:** `[Tìm kiếm] [Thêm mới]`

**Tìm kiếm:** Nhập từ khóa vào ô Từ khóa → Click Tìm kiếm

**Danh sách hiển thị:** Cột Rút gọn (tên viết tắt loại dịch vụ)
Ví dụ các loại: 0, Noi soi, SA (Siêu Âm), XQ (X-Quang), CT

**Thêm mới** — Form THÊM LOẠI DỊCH VỤ:

| Trường | Bắt buộc |
|--------|----------|
| Tên | ✓ |
| Rút gọn (tên viết tắt) | ✓ |
| Mã (mã loại dịch vụ) | ✓ |
| Trạng thái | checkbox (active = tích xanh, inactive = bỏ tích) |

→ **Thêm mới**

**Chỉnh sửa** — Form SỬA THÔNG TIN LOẠI DỊCH VỤ:
- Tên, Rút gọn, Mã, Trạng thái (editable)
→ **Lưu lại**

**Xóa dịch vụ:** Click nút Xóa → Xác nhận "Xác nhận xóa [tên]" → **Ok**

---

### 2.2.6 Mẫu kết quả

Quản lý mẫu kết quả (template) để bác sĩ đọc kết quả nhanh.

**Tìm kiếm:** Từ khóa + Lọc theo **Loại dịch vụ** (dropdown: Nội soi, Siêu Âm, XQ, CT)

**Toolbar:** `[Tìm kiếm] [Thêm mới]`

**Thêm mới mẫu kết quả** — điền thông tin vào các ô bôi đỏ → Click **Thêm mới**

Form mẫu kết quả gồm các trường:
- **Tên** (tên mẫu)
- **Dịch vụ** (chọn loại dịch vụ)
- **Kỹ thuật** (text)
- **Mô tả** (Rich text editor với toolbar: Choose heading, B, I, U, link, list, align, table, image...)
  - Nhập nội dung mô tả chi tiết (ví dụ mẫu Nội Soi Dạ Dày):
    - Thực quản: Bình thường, không thấy u loét, không giãn tĩnh mạch thực quản.
    - Dạ dày: Dịch dạ dày: trong, Như dòng dạ dày: bình thường
    - Hang vị và tiền môn vị: **Niêm mạc phù nề xung huyết**, không thấy loét, không thấy u.
    - Môn vị: **Phù nề**, không có dịch tá tràng trào ngược
    - Hành tá tràng và tá tràng: không thấy loét, tá tràng bình thường
    - Test HP:
    - Sinh thiết: Không.
- **Kết quả** (text — ví dụ: "Hiện tại chưa phát hiện hình ảnh tổn thương.")
- **Khuyến nghị** (text)
- **Giá** (number)

**Chỉnh sửa:** Click nút Sửa → Điền thông tin cần sửa lại → **Lưu lại**

**Xóa:** Click nút Xóa → Xác nhận → **Ok**

---

### 2.2.7 Backup

Quản lý các thư mục lưu trữ hình ảnh (backup/archive).

**Toolbar:** `[Tìm kiếm] [Thêm mới]`

**Tìm kiếm:** Nhập Từ khóa → Tìm kiếm

**Danh sách Backup:** Các cột: Tên | Thư mục | Thư mục backup | Trạng thái

Ví dụ bản ghi:
- Tên: **Datas**
- Thư mục: `D:\Servers\ServerTest\PacServerNew\DCM`
- Thư mục backup: `D:\PacsData`
- Trạng thái: 1

**Thêm mới** — Form THÊM MỚI THÔNG TIN BACKUP:

| Trường | Ý nghĩa |
|--------|---------|
| Tên | Tên cấu hình backup |
| Thư mục | Đường dẫn thư mục nguồn DICOM |
| Thư mục Backup | Đường dẫn thư mục đích backup |

→ **Thêm mới**

**Chỉnh sửa** — Form SỬA THÔNG TIN BACKUP:
- Tên, Thư mục, Thư mục backup (editable)
→ **Lưu lại**

**Xóa:** Click nút Xóa → Xác nhận "Xác nhận xóa [Tên]" → **Ok**

---

### 2.2.8 Cấu hình

Quản lý cấu hình hệ thống (hiển thị tên bệnh viện, địa chỉ, số điện thoại cho trang RIS).

**Tìm kiếm:** Nhập Từ khóa → Tìm kiếm

**Thêm mới cấu hình** — Form THÊM MỚI CẤU HÌNH:

| Trường | Ý nghĩa |
|--------|---------|
| Mã | Mã cấu hình |
| Tên | Tên hiển thị |
| Giá trị | Giá trị cấu hình |

→ **Thêm mới**

Ví dụ bản ghi đã có:
- Tên: **Virtual Reality PACS System**
- Giá trị: `0`

**Chỉnh sửa** — Form SỬA THÔNG TIN CẤU HÌNH → **Lưu lại**

**Xóa:** Click nút Xóa → Xác nhận "Xác nhận xóa [HospitalName]" → **Ok**

---

### 2.2.9 Máy chụp Pacs

Quản lý các máy chụp (DICOM nodes/modalities) kết nối với hệ thống PACS.

**Tìm kiếm:** Lọc theo Từ khóa, theo **Dịch vụ** và theo **Loại** (dropdown: Tất cả / SCP / WorkList / Share / Favorite)

**Toolbar:** `[Tìm kiếm] [Thêm mới] [Phân mẫu cho máy chủ]`

**Danh sách máy chụp:** Các cột: Tên | Tên đầy đủ | Loại | Thư mục | StartMode | State

Ví dụ bản ghi: Tên: **Default**, Tên đầy đủ: Default, Loại: SCP, Thư mục: `PacServerNew\DICOM\SCP_DATA/SCP_1`, StartMode: 0, State: 0

**Thêm mới** — Form đầy đủ (các ô đỏ là bắt buộc):

| Trường | Ý nghĩa |
|--------|---------|
| Tên | Tên máy chụp |
| LoginName | Tên đăng nhập |
| HospitalPort | Cổng kết nối |
| Chọn Phù Suit | Chọn file/đường dẫn |
| Modality | Loại thiết bị (CT/MR/XR/US...) |
| ModalityType | Loại modality |
| Nhãy Information | Thông tin nút |
| MachineCode | Mã máy |
| Chọn Bệnh viện | Liên kết bệnh viện |
| Chọn Mẫu | Chọn số mẫu (1+) |

→ **Lưu lại** hoặc **Thêm mới**

**Chỉnh sửa:** Click nút Sửa → sửa thông tin → **Lưu lại**

**Xóa:** Click nút Xóa → Xác nhận "Xác nhận xóa [Default]" → **Ok**

#### Phân mẫu cho máy chủ
Click **Phân mẫu cho máy chủ** → chọn máy chủ mới → Chọn **Phân mẫu mới**

**Màn hình PHẦN MẪU TEMPLATE:**
- Cột trái: Danh sách tên máy chụp (VD: XQ.2 – DIACROS02, DIACROS02, CT – CTx_CMAPTent, 21/GT – Heba, DICOM5/NRICS – DICOM5/NRICS, IELOM/NRICS – IELOM/NRICS, ADMIN-Upload – ADMIN-Upload, DUCTBST – DUCTBST)
- Cột phải: Danh sách mẫu kết quả (có thể chọn 1 hoặc nhiều mẫu):
  - KẾT QUẢ QUANG
  - PHẾU CHỤP CÊ LỚP VI Tầng
  - KẾT QUẢ A QUANG
  - CHỤP CHE – PHẾU CHỤP CÔNG NGHIỆP
  - KẾT QUẢ A QUANG
  - NỘI SOI – KẾT QUẢ NỘI SOI
  - KẾT QUẢ A QUANG
  - Tìm phổi
  - Ở bung

Workflow phân mẫu:
1. **Chọn máy chủ** (cột trái)
2. **Chọn 1 hoặc nhiều mẫu kết quả** (cột phải)
3. Mỗi mẫu có nút **Xóa bỏ gắn mẫu kết quả** (×)
4. **Chỉnh sửa trực tiếp mẫu kết quả** (icon edit)

Đối với **Máy chủ mới** → Chọn **Phân mẫu mới**:
1. Chọn lọc theo nhóm dịch vụ
2. Chọn ICD cần phân mẫu
3. Chọn mẫu kết quả → Bấm **Thêm mới**

---

### 2.2.10 Khu vực

Quản lý cơ sở/khu vực bệnh viện (tương ứng với thư mục cấp cao nhất ở trang RIS).

**Tìm kiếm:** Nhập từ khóa → Tìm kiếm

**Danh sách khu vực:** Các cột: Mã khu vực | Tên | Mô tả | Thứ tự | Trạng thái

**Thêm mới cơ sở** — Form THÊM MỚI CƠ SỞ:

| Trường | Ý nghĩa |
|--------|---------|
| Tên | Tên cơ sở/khu vực |
| Mô tả | Mô tả thêm |
| Thứ tự | Số thứ tự hiển thị |
| Cơ sở | Dropdown chọn cơ sở cha |

→ **Thêm mới**

**Chỉnh sửa** — Form CẬP NHẬT THÔNG TIN:
- Tên, Mô tả, Thứ tự, Cơ sở (ví dụ: TRUNG TÂM CĐHA)
→ **Lưu lại**

**Vô hiệu hóa khu vực:** Click vào nút checkbox → Xác nhận "Xác nhận vô hiệu hóa [tên]" → **Ok**

**Xóa:** Click nút Xóa → Xác nhận → **Ok**

---

### 2.2.11 Thư mục

Quản lý thư mục lưu trữ images (nằm bên trong các cơ sở, tương ứng với thư mục cấp 2 ở trang RIS).

**Tìm kiếm:** Từ khóa + Lọc theo **loại thư mục** (dropdown: Tất cả / Normal / Upload / Favorite / HỘI CHẨN (TeleHealth))

**Danh sách hiển thị:** Tên thư mục | Loại

**Thêm mới thư mục** — Form THÊM MỚI THƯ MỤC:

| Trường | Mô tả |
|--------|-------|
| Tên | Tên thư mục |
| Vị trí | Đường dẫn vị trí |
| Loại thư mục | Normal / Share / Upload |
| Thứ tự | Số thứ tự |
| Cơ sở | Chọn cơ sở cha (dropdown) |

**Lưu ý quan trọng — 3 loại thư mục:**
| Loại | Thứ tự mặc định | Ý nghĩa |
|------|-----------------|---------|
| **Normal** | Số thứ tự bình thường | Thư mục lưu trữ thông thường |
| **Share** | 900 | Thư mục chia sẻ |
| **Upload** | 950 | Thư mục upload từ ngoài |

→ **Thêm mới**

**Chỉnh sửa** — Form CẬP NHẬT THÔNG TIN THƯ MỤC:
- Tên, Vị trí, Loại thư mục, Cơ sở, Thứ tự (editable)
→ **Lưu lại**

**Vô hiệu hóa:** Click vào checkbox → Xác nhận → **Ok**

**Xóa:** Click nút Xóa → Xác nhận "Xác nhận xóa [BVDKCP]" → **Ok**

---

### 2.2.12 Phân quyền Bác sĩ

Quản lý quyền truy cập của từng người dùng (bác sĩ, KTV) trên RIS.

**Danh sách quyền có thể phân:**

| Quyền | Mô tả |
|-------|-------|
| Chi xem | Chỉ xem ca chụp |
| Đọc kết quả | Được đọc/nhập kết quả |
| Duyệt kết quả | Được duyệt kết quả |
| Hội chẩn | Tham gia hội chẩn |
| Hủy hội chẩn | Hủy phiên hội chẩn |
| Chỉnh sửa kết quả | Sửa kết quả đã nhập |
| Xóa ca chụp | Xóa ca chụp khỏi hệ thống |
| Cập nhật thông tin từ HIS | Đồng bộ thông tin từ HIS |
| Chia sẻ ca chụp | Chia sẻ hình ảnh |
| Thống kê báo cáo | Xem thống kê |
| Hủy duyệt ca bất kỳ | Hủy duyệt không giới hạn |

**Tìm kiếm:** Nhập họ tên hoặc email Bác sĩ cần tìm → hoặc lọc theo nhóm quyền → Click **Tìm kiếm**

**Dropdown nhóm quyền:**
- Tất cả
- DoctorOnlyRead
- DoctorApproved
- Technician
- SuperAdmin
- Hội chẩn
- View Only
- AABBCC

**Giao diện phân quyền** — Bảng ma trận:
- Hàng = Máy chụp (Khu vực + Tên máy)
- Cột = Các quyền: Chi xem | Đọc | Duyệt | Hội c | Cập nhật từ HIS | Chia se ca chụp | Thống kê | Chia | Hủy duyệt

**Thêm mới phân quyền:**
- Click **Thêm mới** → Chọn cột bên phải là máy chụp, hàng là các quyền của người dùng
- Cột bên phải: danh sách máy chụp (khu vực + máy)
- Hàng bên dưới: các quyền tương ứng (checkbox)
- Ấn nút: Tích checkbox quyền muốn cấp

**Phân quyền theo nhóm:** Click **Phân quyền theo nhóm** → Tích vào quyền tương ứng → Ấn **Lưu lại**

**Chỉnh sửa quyền bác sĩ:** Click nút Sửa → Tích vào các quyền cần sửa lại → **Lưu lại**

---

### 2.2.13 Mẫu in kết quả

Quản lý các mẫu in của bệnh viện (print templates).

**Tìm kiếm:** Nhập từ khóa → Click **Tìm kiếm**

**Thêm mới mẫu in** — Form THÊM MỚI MẪU IN:

| Trường | Ý nghĩa |
|--------|---------|
| Tên | Tên mẫu in |
| Tiêu đề 1 | Dòng tiêu đề 1 |
| Tiêu đề 2 | Dòng tiêu đề 2 |
| Bệnh viện | Tên bệnh viện |
| Khoa phòng | Tên khoa/phòng |
| Địa chỉ | Địa chỉ bệnh viện |
| Điện thoại | Số điện thoại |
| Ghi chú | Ghi chú thêm |
| Mẫu Layout | Tên file layout |
| Logo | Upload image |

→ **Thêm mới**

**Chỉnh sửa** — Form SỬA THÔNG TIN BÁC SĨ (dùng chung form):
Ví dụ bản ghi:
- Tên: **AAA**
- Tiêu đề 1: VRT Q&A
- Bệnh viện: Công ty cổ phần Công nghệ C+
- Khoa phòng: Khoa Chẩn đoán hình ảnh
- Địa chỉ: Số 1, ngõ 31, đường 18M, Phường Mộ Lao, Quận Hà Đông
- Mẫu Layout: Template
→ **Lưu lại**

**Xóa:** Click nút Xóa → Xác nhận "Xác nhận xóa [AAA]" → **Ok**

---

### 2.2.14 ICD

Quản lý danh mục ICD (International Classification of Diseases) — khi bác sĩ chọn ICD trong HIS, hệ thống sẽ tự động gắn mẫu kết quả tương ứng.

**Tìm kiếm:** Từ khóa + Lọc theo **Dịch vụ** (dropdown: Nội soi, Siêu Âm, XQ, CT) → Click **Tìm kiếm**

**Toolbar:** `[Tìm kiếm] [Thêm mới] [Quản lý mẫu ICD]`

**Danh sách ICD:** Các cột: STT | Tên | Loại dịch vụ | Mẫu | Trạng thái

Ví dụ bản ghi:
- CHỤP CT SCANNER 64 LỚI → PHẾU CHỤP LỚP VI Tầng
- SIÊU ÂM TIM → KẾT QUẢ A QUANG
- CHỤP CT SCANNER 128 LỚP → PHẾU CHỤP LỚP VI Tầng
- abbb (mã bbb) → KẾT QUẢ A QUANG
- khởi → abcd
- CHỤP VÀ LƯTPHONG PACH CHO NGU NGOC NGUANG TRONG SANG → KẾT QUẢ A QUANG
- CHỤP VÀ IN MỘT NHIẾU TIEU CHÍ HOE NGU NGE HÒN NÊN → KẾT QUẢ A QUANG
- SIÊU ÂM TUYỂN LÁN nhỏ → KẾT QUẢ A QUANG

**Thêm mới ICD** — Form THÊM MỚI ICD:

| Trường | Bắt buộc |
|--------|----------|
| Mã (1) | ✓ |
| Tên (2) | ✓ |
| Loại dịch vụ (3) | ✓ |

→ **Thêm mới** (4)

**Lưu ý:** Dấu `*` là bắt buộc. Phần **Chọn bệnh viện** (18): nếu khi gán bệnh viện mà **không** có loại dịch vụ theo yêu cầu → vui lòng xem mục 2.2.7 để tạo mới. Phần **Chọn mẫu in** (19): dịch vụ được tạo từ chức năng **Mẫu in kết quả**, nếu khi gán mẫu mà **không** có loại dịch vụ theo yêu cầu → vui lòng xem mục 2.2.13 để tạo mới.

**Phân mẫu kết quả cho ICD:** Click icon Phân mẫu → chọn icon chỉnh sửa ICD

**Chỉnh sửa ICD** — Form CẬP NHẬT ICD:
1. Tên ICD
2. Loại dịch vụ
3. Ấn **Cập nhật**

**Vô hiệu hóa ICD:** Click vào icon Toggle → Xác nhận "Ngừng hoạt động CT0045?" → **Ok**

**Quản lý mẫu ICD:**
Màn hình PHẦN MẪU ICD:
- **Cột trái:** Lọc theo nhóm dịch vụ → Chọn ICD cần phân mẫu (VD: CHỤP CT SCANNER 64 LỚP, SIÊU ÂM TIM, CHỤP CT SCANNER 128 LỚP, abbb, khởi...)
- **Cột phải (thêm mẫu):** Danh sách mẫu kết quả hiện có gán cho ICD này:
  - KẾT QUẢ QUANG
  - PHẾU CHỤP CÊ LỚP VI Tầng
  - KẾT QUẢ A QUANG
  - CHỤP CHE – PHẾU CHỤP CÔNG NGHIỆP
  - NỘI SOI – KẾT QUẢ NỘI SOI
  - Tìm phổi / Ở bung
- Mỗi mẫu có nút **Xóa bỏ gắn mẫu kết quả** (×) và **Chỉnh sửa trực tiếp mẫu kết quả** (icon edit)

Workflow phân mẫu ICD:
- **ICD mới tạo:** Chọn **Phân mẫu mới**
  1. Chọn lọc theo nhóm dịch vụ (KẾT QUẢ A QUANG, PHẾU CHỤP CÊ LỚP VI Tầng, NỘI SOI – KẾT QUẢ NỘI SOI...)
  2. Chọn ICD cần phân (cột trái)
  3. Chọn mẫu kết quả (cột phải, tích chọn)
- **ICD đã được phân mẫu kết quả:** Chọn **Chỉnh sửa**
  1. Lọc nhóm dịch vụ (cột trái)
  2. Chọn ICD cần sửa (cột trái)
  3. Chọn lại mẫu kết quả mới (cột phải)

---

### 2.2.15 Vật tư

Quản lý vật tư tiêu hao (thuốc cản quang, phim, vật tư y tế...).

**Tìm kiếm:** Nhập Keyword → Click **Tìm kiếm**

**Toolbar:** `[Tìm kiếm] [Thêm mới]`

**Thêm mới vật tư** — Form THÊM MỚI VẬT TƯ:

| Trường | Ý nghĩa |
|--------|---------|
| Tên | Tên vật tư |
| Loại | Dropdown chọn loại (ví dụ: Drug) |
| Giá | Số tiền (VND) |

→ **Thêm mới**

**Chỉnh sửa** — Form CẬP NHẬT THÔNG TIN:
Ví dụ:
- Tên: **Thuốc cản quang**
- Loại: **Drug**
- Giá: **180000**
- Trạng thái: checkbox (active)
→ **Lưu lại**

**Vô hiệu hóa:** Click vào checkbox → vô hiệu hóa vật tư

**Xóa:** Click nút Xóa → Xác nhận "Xác nhận xóa Thuốc cản quang" → **Ok**

---

### Tổng hợp Menu Sidebar Admin VRPACS

```
Vrpacs Admin
├── Thống Kê
├── Bác Sĩ
├── Bệnh Nhân
├── Loại Dịch Vụ
├── Mẫu Kết Quả
├── Backup
├── Cấu Hình
├── Máy chụp PACS
├── Khu Vực
├── Thư Mục
├── Phân Quyền Bác Sĩ
├── Mẫu In Kết Quả
├── ICD
└── Vật Tư
```

---

## Part 2: Hội chẩn Online

> Source: VRPACS V.2 — Tài liệu hướng dẫn sử dụng MODULE HỘI CHẨN (9 trang)
> Vendor: Công ty Cổ phần Công nghệ C+

---

### Mục lục Module Hội chẩn

```
1.   HỘI CHẨN
1.1.   Hội chẩn trực tuyến (dành cho Nondicom)
1.2.   Video conference (Hội chẩn DICOM)
1.2.1.   Một số thao tác tại Video Conference
1.2.2.   Giao diện của hệ thống
1.2.3.   Chức năng chia layout
1.2.4.   Lựa chọn micro
1.2.5.   Chia sẻ màn hình
1.2.6.   Quay màn hình cuộc hội chẩn
1.2.7.   Chia sẻ ca hội chẩn
1.2.8.   Kết thúc hội chẩn
```

---

### 1. HỘI CHẨN

Module Hội chẩn của VRPACS cung cấp 2 hình thức hội chẩn từ xa:

| Hình thức | Đối tượng | Entry point |
|-----------|-----------|-------------|
| Hội chẩn trực tuyến (Nondicom) | Ca chụp không dùng DICOM viewer | Trang nondicom — màn hình đọc duyệt |
| Video Conference (Hội chẩn DICOM) | Ca chụp DICOM mở trong Viewer | VRPACS Viewer — toolbar |

---

### 1.1. Hội chẩn trực tuyến (dành cho Nondicom)

**Mô tả:** Dành cho các ca chụp được xem tại địa chỉ nondicom (không dùng DICOM viewer).

**Luồng thao tác:**
1. Truy cập địa chỉ nondicom.
2. Chọn ca chụp cần hội chẩn.
3. Tại màn hình diện đọc/duyệt cho ca chụp, chọn chức năng **Tạo phòng hội chẩn**.
   - Biểu tượng: **hình máy bay giấy** (nằm trong khu vực panel bên phải).

**Giao diện màn hình Nondicom Viewer:**
- Panel trái: Cây thư mục PACS (ALL → C+ PACS → ADMIN → minhNET / ADMIN-Upuat / CT / CHIENTEST22 / DUCTEST)
- Bộ lọc: Lọc theo trạng thái (Chờ đọc, Đang đọc, Đọc xong, Duyệt xong, Tiêu cục) và Lọc theo thông tin (Chỉ định, Bộ phận chụp, Kỹ thuật viên)
- Panel kết quả: Mẫu kết quả (dropdown chọn mẫu), Nơi Sau Đợt Tràng R (text), Kỹ thuật thăm khám, Mô tả hình ảnh (rich text editor với toolbar: A↑ / B I U / Choose heading / link / ảnh / danh sách / căn chỉnh)
- Panel phải: Hình ảnh ca chụp + nút yêu cầu hội chẩn (biểu tượng máy bay giấy màu xanh dương, nằm góc phải màn hình)
- Bottom bar: Lưu (Lbc) | Đọc xong | Duyệt | Chọn mẫu in | Hủy phiếu
- Timestamp toolbar: Hôm nay / Hôm qua / 3 Ngày / 7 Ngày / Tất cả / Date range picker
- Máy chụp selector, Kỹ thuật viên selector (phía trên danh sách)

**Lưu ý:**
- Nút yêu cầu hội chẩn chỉ hiển thị khi đang xem chi tiết ca chụp.

---

### 1.2. Video Conference (Hội chẩn DICOM)

**Mô tả:** Hội chẩn ca DICOM trực tiếp từ trong VRPACS Viewer, kết hợp xem ảnh DICOM và video call đa điểm cầu.

**Cách mở:**
1. Mở ca chụp DICOM trong giao diện **VIEWER**.
2. Trên toolbar Viewer (góc phải trên), nhấn chọn công cụ **Video Conference**.
   - Biểu tượng: **hình máy quay** (camera icon).
   - Tooltip: "Video Conference".
3. Hệ thống mở giao diện cuộc hội chẩn.

**Thông tin hiển thị trên toolbar Viewer:**
- Tên nghiên cứu (ví dụ: "Revolution ACTs")
- Loại scan (ví dụ: "Recon 2: 5MM KHONG THUOC ABDOMEN")
- Số lượng ảnh (ví dụ: "Image: 1/273")
- Các icon toolbar: Share (<), Video Conference (camera), Layout (grid), Copy, History (clock), Close (×), Settings (gear)

---

### 1.2.1. Một số thao tác tại Video Conference

Các thao tác chính trong cuộc hội chẩn (xem các mục 1.2.2 → 1.2.8 bên dưới):

| Thao tác | Mô tả |
|----------|-------|
| Chia layout | Thay đổi bố cục hiển thị các điểm cầu |
| Lựa chọn micro | Đổi thiết bị microphone |
| Chia sẻ màn hình | Share màn hình máy tính |
| Quay màn hình | Ghi lại toàn bộ cuộc hội chẩn dạng video |
| Chia sẻ ca hội chẩn | Copy đường dẫn mời điểm cầu khác tham gia |
| Kết thúc hội chẩn | Host kết thúc, tất cả điểm cầu thoát |

---

### 1.2.2. Giao diện của hệ thống

**Tên giao diện:** KHÁM CHỮA BỆNH TRỰC TUYẾN

**Cấu trúc layout mặc định (6 vùng đánh số):**

| Vùng | Nội dung |
|------|----------|
| 1 | Logo, địa chỉ và tên của điểm cầu trung tâm tạo hội chẩn |
| 2 | Danh sách thiết bị hình ảnh của các điểm cầu tham gia hội chẩn (thumbnail strip trên cùng) |
| 3 | Màn hình trung tâm của cuộc hội chẩn (khu vực lớn giữa) |
| 4 | Hình ảnh của điểm cầu trung tâm (camera feed) |
| 5 | Vị trí hiển thị hình ảnh của các điểm cầu khác |
| 6 | Thanh công cụ chính (bottom toolbar) |

**Panel điểm cầu (bên trái):**
- "ĐIỂM CẦU TRUNG TÂM" — hiển thị tên/label điểm cầu chủ
- VCAM — placeholder khi camera chưa kích hoạt ("Please run iVCam")
- Thông tin điểm cầu: Địa điểm, Bác sĩ, Chức vụ, Modalite, Service name
- "ĐIỂM CẦU KẾT NỐI" — danh sách điểm cầu remote đã tham gia
- Thumbnail "Please run iVCam" + tên điểm cầu (VD: "ADMIN 1")

**Lưu ý kỹ thuật:**
- Cơ chế có thể kéo thả hình ảnh để đáp ứng nhu cầu khác nhau.
- iVCam là ứng dụng dùng điện thoại làm webcam cho máy tính.

---

### 1.2.3. Chức năng chia layout

**Mục đích:** Thay đổi cách chia màn hình khi có nhiều điểm cầu tham gia.

**Vị trí:** Thanh công cụ chính (bottom toolbar) — biểu tượng **ô lưới** (grid icon).

**Thao tác:**
1. Tại thanh công cụ, nhấn vào **biểu tượng ô lưới**.
2. Chọn layout mong muốn từ menu.
3. Kéo thả hình ảnh của các điểm cầu để hiển thị tại layout mới.

**Ví dụ layout:**
- Layout 1 điểm cầu: 1 khung lớn chiếm toàn màn hình.
- Layout 2 điểm cầu: Chia đôi màn hình — "Please run iVCam" (trái) | "VCAM" (phải).
- Layout nhiều điểm cầu: Chia đa ô.

**Lưu ý:** Cơ chế kéo thả cho phép đổi vị trí các hình ảnh giữa các ô tự do.

---

### 1.2.4. Lựa chọn micro

**Mục đích:** Đổi thiết bị microphone đang sử dụng trong cuộc hội chẩn.

**Vị trí:** Thanh công cụ chính — **biểu tượng hình bánh răng** góc trên hình micro.

**Thao tác:**
1. Nhấn vào biểu tượng bánh răng tại góc cửa hình micro.
2. Dropdown danh sách microphone hiển thị.
3. Chọn microphone mong muốn.

**Danh sách microphone ví dụ (từ screenshot):**
- Default - Microphone (x2zSoft iVCam) ← đang được chọn
- Communications - Microphone (x2zSoft iVCam)
- Microphone (x2zSoft iVCam)
- Default - Microphone (x2zSoft iVCam) (mục thứ 4, làm mờ)

---

### 1.2.5. Chia sẻ màn hình

**Mục đích:** Chia sẻ nội dung màn hình máy tính với tất cả điểm cầu trong cuộc hội chẩn.

**Vị trí:** Thanh công cụ chính — **chức năng chia sẻ màn hình** (screen share icon).

**Thao tác:**
1. Nhấn chọn chức năng chia sẻ màn hình trên thanh công cụ.
2. Cửa sổ **"Choose what to share"** hiện ra (hộp thoại browser):
   - Tab: **Microsoft Edge tab** | **Window** | **Entire Screen**
   - Danh sách cửa sổ đang mở (thumbnails)
   - Checkbox "Share tab audio"
   - Nút **Share** (màu xanh) và **Cancel**
3. Lựa chọn màn hình/cửa sổ cần chia sẻ.
4. Nhấn nút **Share** để bắt đầu chia sẻ.

**Sau khi chia sẻ:**
- Hình ảnh được chia sẻ hiển thị trên màn hình trung tâm của cuộc hội chẩn.
- Các điểm cầu khác **có thể kéo thả** để xem hình ảnh.
- Thanh trạng thái chia sẻ hiển thị: `sharing https://dantri.com.vn to ... [Stop sharing] [View tab: dantri.com.vn]`
- Nhấn **"Stop sharing"** để kết thúc chia sẻ màn hình.

**Ghi chú:**
- Bước 1: Nhấn chọn chức năng chia sẻ màn hình.
- Bước 2: Lựa chọn màn hình cần chia sẻ rồi nhấn nút **Share**.

---

### 1.2.6. Quay màn hình cuộc hội chẩn

**Mục đích:** Ghi lại toàn bộ cuộc hội chẩn dưới dạng video.

**Thao tác:**
1. Tại thanh công cụ, nhấn **chức năng quay video** (biểu tượng hình **nút play** ▶).
2. Thao tác tương tự như chia sẻ màn hình — chọn cửa sổ/màn hình cần ghi.

**Giao diện chọn nội dung quay (từ screenshot):**
- Hộp thoại "Choose what to share":
  - Tab: Microsoft Edge tab | **Window** | Entire Screen
  - Cửa sổ có thể chọn:
    - Vrpacs Admin
    - Tin tức Việt Nam và quốc tế nóng, nhanh, cập nhật... → 18/05/2023 (3 tuổi) / 2022-07-509
    - Vrpacs Admin (lặp lại, nhiều cửa sổ)
    - VRPACS-RIS
    - VRPACS-RIS-NONDICOM (màu xanh, đang active)
    - (...thêm cửa sổ)
  - "Select a tab to preview" (khung preview bên phải)
  - Checkbox "Share tab audio"
  - Nút Share / Cancel

**Ghi chú:**
- Vùng "Không có dữ liệu" / "Hãy thử video trong danh sách video để hiển thị" — hiển thị khi chưa có video nào được ghi.

---

### 1.2.7. Chia sẻ ca hội chẩn

**Mục đích:** Mời các điểm cầu khác tham gia vào phòng hội chẩn đang diễn ra.

**Vị trí:** Thanh công cụ — **biểu tượng chia sẻ** (share icon — hình mũi tên có 3 điểm nối).

**Thao tác:**
1. Nhấn chức năng chia sẻ trên thanh công cụ.
2. Popup **Share** hiển thị:
   - URL đường dẫn phòng hội chẩn: `https://pacs-medim.vn:/joinstream... Expand`
   - Nút **Copy** (màu xanh, góc phải)
3. Nhấn biểu tượng **copy** để sao chép đường dẫn.
4. Gửi đường dẫn cho các điểm cầu khác (qua tin nhắn, email, v.v.).
5. Điểm cầu nhận được đường dẫn, truy cập URL để tham gia cuộc hội chẩn.

**URL mẫu:** `https://pacs-medim.vn:/joinstream/[session-id]`

**Ghi chú:**
- Nhấn chức năng chia sẻ để hiển thị đường dẫn truy cập.
- Nhấn biểu tượng copy để sao chép đường dẫn gửi cho các điểm cầu một cách dễ dàng.

---

### 1.2.8. Kết thúc hội chẩn

**Mục đích:** Host kết thúc toàn bộ cuộc hội chẩn, tất cả điểm cầu thoát.

**Vị trí:** Thanh công cụ chính — **biểu tượng điện thoại màu đỏ** (end call icon).

**Toolbar bottom bar (từ trái sang phải):**

| Biểu tượng | Chức năng |
|-----------|-----------|
| Bánh răng (⚙) | Cài đặt / Lựa chọn micro |
| Microphone (🎤) | Bật/tắt micro |
| Camera/Màn hình (📺) | Quay màn hình / Chia sẻ màn hình |
| Play (▶) | Quay màn hình cuộc hội chẩn |
| Điện thoại đỏ (🔴) | Kết thúc hội chẩn |

**Thao tác:**
1. Nhấn chức năng **kết thúc hội chẩn** (biểu tượng hình điện thoại màu đỏ).
2. Xác nhận kết thúc.

**Business rules:**
- **Chỉ có người tạo hội chẩn mới có thể kết thúc hội chẩn** (host-only end).
- Khi người tạo hội chẩn kết thúc, **các điểm cầu khác sẽ tự động thoát khỏi cuộc hội chẩn**.
- Điểm cầu thường (non-host) không có quyền kết thúc — chỉ có thể tự rời phòng.

---

### Tổng hợp: Luồng hội chẩn DICOM đầy đủ

```
[Bác sĩ A mở ca DICOM trong Viewer]
         ↓
[Click icon Video Conference (camera) trên toolbar]
         ↓
[Hệ thống mở giao diện "Khám Chữa Bệnh Trực Tuyến"]
         ↓
[Bác sĩ A = Host / Điểm cầu trung tâm]
         ↓
[Chia sẻ đường dẫn phòng → Copy URL → Gửi cho bác sĩ B, C...]
         ↓
[Bác sĩ B, C truy cập URL → Tự động tham gia phòng hội chẩn]
         ↓
[Host có thể:]
  ├── Chia layout (ô lưới)
  ├── Chọn micro (bánh răng)
  ├── Chia sẻ màn hình (screen share)
  └── Quay màn hình (record)
         ↓
[Kết thúc: Host nhấn icon điện thoại đỏ]
         ↓
[Tất cả điểm cầu tự động thoát]
```

---

### Tổng hợp: Luồng hội chẩn Nondicom

```
[Bác sĩ mở ca tại địa chỉ nondicom]
         ↓
[Vào màn hình diện đọc/duyệt ca chụp]
         ↓
[Nhấn nút "Tạo phòng hội chẩn" (icon máy bay giấy góc phải)]
         ↓
[Phòng hội chẩn được tạo]
         ↓
[Chia sẻ đường dẫn cho các điểm cầu khác]
         ↓
[Tiến hành hội chẩn (video conference)]
```

---

### Bảng tổng hợp tất cả chức năng Module Hội chẩn

| STT | Chức năng | Mô tả | Điều kiện |
|-----|-----------|-------|-----------|
| 1 | Tạo phòng hội chẩn (Nondicom) | Tạo phòng hội chẩn từ màn hình đọc nondicom | Đang xem ca chụp nondicom |
| 2 | Tạo phòng hội chẩn (DICOM) | Mở Video Conference từ Viewer | Đang xem ca DICOM trong Viewer |
| 3 | Chia layout | Thay đổi bố cục màn hình hội chẩn | Trong phòng hội chẩn |
| 4 | Lựa chọn micro | Chọn thiết bị microphone | Trong phòng hội chẩn |
| 5 | Chia sẻ màn hình | Share màn hình/cửa sổ cho điểm cầu khác | Trong phòng hội chẩn |
| 6 | Quay màn hình | Ghi video toàn bộ cuộc hội chẩn | Trong phòng hội chẩn |
| 7 | Chia sẻ ca hội chẩn | Copy URL phòng → mời điểm cầu | Trong phòng hội chẩn (host) |
| 8 | Kết thúc hội chẩn | Đóng phòng, tất cả điểm cầu thoát | Host only |

---

### Ghi chú kỹ thuật triển khai

| Thông số | Giá trị / Ghi chú |
|----------|-------------------|
| Giao thức video | WebRTC (browser-based, không cần plugin) |
| Camera support | iVCam (điện thoại làm webcam) hoặc webcam thật |
| URL phòng hội chẩn | `https://pacs-medim.vn:/joinstream/[session-id]` |
| Số điểm cầu | Không giới hạn rõ ràng trong tài liệu (tối thiểu 2) |
| Quyền kết thúc | Chỉ host / người tạo phòng |
| Screen share | Hỗ trợ tab, cửa sổ, toàn màn hình |
| Record | Có — ghi video cuộc hội chẩn |
| Drag & drop | Có — kéo thả hình ảnh điểm cầu giữa các ô layout |
| Audio device | Có thể chọn từ dropdown (hỗ trợ nhiều microphone) |

