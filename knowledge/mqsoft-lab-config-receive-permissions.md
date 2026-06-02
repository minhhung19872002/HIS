# Xét nghiệm — Khai báo sử dụng, Nhận mẫu bệnh phẩm, Phân quyền
> Sources: 3 PDFs (11 + 6 + 5 = 22 pages)
> Extracted: 2026-06-01
> Module: XN (Xét nghiệm / MQ LIS)
> Vendor: MQ Solutions — Điện thoại: 091 449 77 46, Email: mqsoftvn@gmail.com, Website: mqsoft.vn

---

## Part 1: Khai báo sử dụng (Lab Configuration)

### 1.1 Tổng quan — Mục lục tài liệu

Tài liệu "Khai báo danh mục sử dụng" bao gồm các phần sau (theo thứ tự):

| Phần | Nội dung | Trang |
|------|----------|-------|
| Khai báo danh mục đơn vị đo | Vào màn hình, khai báo, sửa | 3–5 |
| Khai báo Danh mục vi trùng, vi khuẩn | Vào màn hình, khai báo, sửa | 6 |
| Danh mục kháng sinh | Vào màn hình, khai báo, sửa | 7 |
| Khai báo danh mục Số Xét nghiệm* | Vào màn hình, khai báo, sửa | 8–9 |
| Khai báo danh mục Xét nghiệm* | Vào màn hình, khai báo, sửa | 10–11 |

*(dấu * = chức năng quan trọng, chi tiết hơn)*

---

### 1.2 Khai báo danh mục Đơn vị đo

#### 1.2.1 Vào màn hình khai báo "Đơn vị đo"

**Đường dẫn truy cập (3 bước):**
1. Mở phần mềm **MQ Main** (icon MQ màu tím)
2. Chọn vào phần **Xét nghiệm (MQ LIS)** trong màn hình chọn phân hệ HIS
   - Màn hình HIS hiển thị các phân hệ dưới dạng icon lớn, có các module: Viện phí, Dược, Kho dược, Khoa Nội/Ngoại/…, Xét nghiệm, v.v.
3. Nhập tài khoản, mật khẩu được cung cấp → đăng nhập vào hệ thống MQ LIS
4. Vào **C. Tiện ích** → **Danh mục** → **Đơn vị đo**

**Menu C. Tiện ích → Danh mục — các mục con:**
- Số xét nghiệm
- Xét nghiệm
- Đơn vị đo
- Đơn vị đo (HL7)
- Vi trùng
- Kháng sinh
- Khai báo khoa phòng LIS
- Khai báo mã bác sỹ LIS

#### 1.2.2 Màn hình "KHAI BÁO ĐƠN VỊ ĐO"

**Tiêu đề màn hình:** KHAI BÁO ĐƠN VỊ ĐO

**Cấu trúc màn hình:**
- **Phần trái:** Danh sách các đơn vị đo (data grid dạng bảng)
  - Cột: Mã đơn vị, Tên đơn vị, và các cột phụ
  - Dữ liệu mẫu hiển thị danh sách các đơn vị đo đã có sẵn (g, mg, mmol/L, U/L, %, v.v.)
- **Phần phải:** Thông tin chi tiết đơn vị đo (panel nhập liệu)
  - Các trường thông tin đơn vị đo cần khai báo
  - Hộp tìm kiếm: **Không tìm kiếm** (label + input text)
- **Toolbar/Actions phía trên phải:** Lưu | Bỏ qua | và các nút khác
- **Phần dưới cùng:** Thanh nút tác vụ

**Chú thích giao diện:**
1. Danh sách các đơn vị đo (left panel)
2. Thông tin đơn vị đo (right panel detail)

#### 1.2.3 Quy trình khai báo "Đơn vị đo"

**Bước thực hiện:**
1. Kiểm tra trong khung tìm kiếm nếu chưa có đơn vị đo trong danh sách thì nhấn **"Mới"** để tiến hành khai báo
2. Khai báo các thông số (nhập vào panel bên phải)
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập

#### 1.2.4 Quy trình sửa "Đơn vị đo"

**Bước thực hiện:**
1. Chọn đơn vị đo muốn chỉnh sửa trên danh sách
2. Nhấn **"Sửa"** → Chỉnh sửa thông tin cần thiết
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập hay sửa

---

### 1.3 Khai báo Danh mục Vi trùng, Vi khuẩn

#### 1.3.1 Vào màn hình khai báo "Vi trùng – Vi khuẩn"

**Đường dẫn:** Sau khi đăng nhập chương trình **Xét nghiệm (MQ LIS)**

Chọn **Tiện ích** → **Danh mục** → **Vi trùng**

**Menu đầy đủ Tiện ích → Danh mục:**
- Số xét nghiệm
- Xét nghiệm
- Đơn vị đo
- Đơn vị đo (HL7)
- Vi trùng ← (mục đang chọn, được highlight)
- Kháng sinh
- Khai báo khoa phòng LIS
- Khai báo mã bác sỹ LIS

#### 1.3.2 Màn hình "DANH MỤC VI TRÙNG, VI KHUẨN"

**Tiêu đề màn hình:** DANH MỤC VI TRÙNG, VI KHUẨN

**Cấu trúc tương tự Đơn vị đo:**
- Phần trái: Danh sách các loại vi trùng – vi khuẩn đã khai báo
- Phần phải: Thông tin chi tiết
- Hộp tìm kiếm: **Không tìm kiếm** (label + input)
- Nút tác vụ: Lưu | Bỏ qua | và các nút khác

#### 1.3.3 Quy trình khai báo "Vi trùng – Vi khuẩn"

1. Kiểm tra trong khung tìm kiếm nếu chưa có loại vi trùng – vi khuẩn trong danh sách thì nhấn **"Mới"** để tiến hành khai báo
2. Khai báo các thông số
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập

#### 1.3.4 Sửa "Vi trùng – Vi khuẩn"

1. Chọn loại vi trùng – vi khuẩn muốn chỉnh sửa trên danh sách
2. Nhấn **"Sửa"** → Chỉnh sửa thông tin cần thiết
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập hay sửa

---

### 1.4 Danh mục Kháng sinh

#### 1.4.1 Vào màn hình khai báo "Kháng sinh"

**Đường dẫn:** Sau khi đăng nhập chương trình **Xét nghiệm (MQ LIS)**

Chọn **Tiện ích** → **Danh mục** → **Kháng sinh**

**Menu Tiện ích → Danh mục (đầy đủ):**
- Danh mục
- Khai báo sử dụng
- Hóa chất xét nghiệm
- Khai báo giá trị tham chiếu hóa chất
- Cấu hình hệ thống
- Tùy chọn người dùng
- Phân quyền sử dụng
- Đổi mật khẩu
- Log Off AdminMQ

**Menu con Danh mục:**
- Số xét nghiệm
- Xét nghiệm
- Đơn vị đo
- Đơn vị đo (HL7)
- Vi trùng
- Kháng sinh ← (mục đang chọn)
- Khai báo khoa phòng LIS
- Khai báo mã bác sỹ LIS

#### 1.4.2 Màn hình "DANH MỤC VI TRÙNG, VI KHUẨN" (dùng cho Kháng sinh)

**Cấu trúc giống màn hình Vi trùng:**
- Phần trái: Danh sách kháng sinh đã khai báo
- Phần phải: Thông tin chi tiết kháng sinh
- Tìm kiếm + các nút tác vụ

#### 1.4.3 Quy trình khai báo "Kháng sinh"

1. Kiểm tra trong khung tìm kiếm nếu chưa có kháng sinh trong danh sách thì nhấn **"Mới"** để tiến hành khai báo
2. Khai báo các thông số
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập

#### 1.4.4 Sửa "Kháng sinh"

1. Chọn loại kháng sinh muốn chỉnh sửa trên danh sách
2. Nhấn **"Sửa"** → Chỉnh sửa thông tin cần thiết
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập hay sửa

---

### 1.5 Khai báo danh mục Số Xét nghiệm

> **Mô tả chức năng:** Chức năng này giúp khai báo chi tiết Số xét nghiệm, trong số Xét nghiệm tên các loại Xét nghiệm và mỗi Xét nghiệm cần khai báo các thông số chỉ tiết của mỗi Xét nghiệm đó, để khi máy Xét nghiệm trả kết quả sẽ tự điền thông tin thay đổi.
>
> Đây cũng là màn hình chức năng cho phép liên kết các chỉ định giá Xét nghiệm của chương trình quản lý Viện Phí với danh mục Xét nghiệm của chương trình Xét nghiệm để có thể tạo 1 kết nối liên hoàn giữa **Khoa phòng chỉ định Xét Nghiệm → Sử dụng phần mềm Viện Phí thu tiền → Xét nghiệm thực hiện**.

#### 1.5.1 Vào màn hình khai báo "Số xét nghiệm"

**Đường dẫn:** Sau khi đăng nhập chương trình **Xét nghiệm (MQ LIS)**

Chọn **Tiện ích** → **Danh mục** → **Số xét nghiệm**

**Menu Tiện ích → Danh mục:**
- **Số xét nghiệm** ← (mục đang chọn, highlight)
- Xét nghiệm
- Đơn vị đo
- Đơn vị đo (HL7)
- Kháng sinh

#### 1.5.2 Màn hình "KHAI BÁO SỐ XÉT NGHIỆM"

**Tiêu đề màn hình:** (hiển thị trong window title)

**Cấu trúc màn hình — Dạng cây 3 cấp bên trái:**
- Danh sách số xét nghiệm (tree/accordion)
  - Phân cấp: Số xét nghiệm → Nhóm xét nghiệm → Phân loại xét nghiệm

**Phần phải — Data grid chi tiết xét nghiệm:**
- Các cột trong bảng danh sách xét nghiệm (Hình 1 ví dụ):
  - STT
  - Tên xét nghiệm
  - Giá trị bình thường (Nam/Nữ/…)
  - Đơn vị
  - Chỉ số cảnh báo (cao/thấp)
  - Các cột cấu hình khác

**Toolbar phía trên:** Các nút tác vụ (Thêm, Sửa, Xóa, Lưu, Bỏ qua, Tìm kiếm tất cả)

**Nút đặc biệt:** Biểu tượng kính lúp (🔍) — **"nhấn vào biểu tượng này để xem tất cả xét nghiệm và tìm kiếm dễ hơn"**

#### 1.5.3 Quy trình khai báo "Số xét nghiệm"

1. Kiểm tra trong khung tìm kiếm nếu chưa có số xét nghiệm trong danh mục thì nhấn **"Mới"** để tiến hành khai báo
2. Khai báo các thông số
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập

#### 1.5.4 Sửa "Số xét nghiệm"

1. Chọn số xét nghiệm muốn chỉnh sửa trên danh sách
2. Nhấn **"Sửa"** → Chỉnh sửa thông tin cần thiết
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập hay sửa

---

### 1.6 Khai báo danh mục Xét nghiệm

#### 1.6.1 Vào màn hình khai báo "Xét nghiệm"

**Đường dẫn:** Sau khi đăng nhập chương trình **Xét nghiệm (MQ LIS)**

Chọn **Tiện ích** (hoặc menu **D. Của sổ** — phụ thuộc phiên bản) → **Danh mục** → **Xét nghiệm**

**Menu Tiện ích → Danh mục (đầy đủ theo tài liệu):**
- Số xét nghiệm
- **Xét nghiệm** ← (mục đang chọn)
- Đơn vị đo
- Đơn vị đo (HL7)
- Kháng sinh

#### 1.6.2 Màn hình "KHAI BÁO DANH MỤC XÉT NGHIỆM"

**Tiêu đề màn hình:** KHAI BÁO DANH MỤC XÉT NGHIỆM

**Cấu trúc màn hình — Phức tạp nhất trong tất cả các khai báo:**

**Phần trái — Cây danh mục xét nghiệm (3 cấp):**
- **Cấp 1:** Số xét nghiệm (Máy / Nhóm lớn)
- **Cấp 2:** Nhóm xét nghiệm (phân loại)
- **Cấp 3:** Phân loại xét nghiệm (chi tiết)

Mỗi mục được phân cấp theo số xét nghiệm, nhóm xét nghiệm, phân loại xét nghiệm. Ứng với mỗi mục được chọn sẽ thể hiện nội dung chi tiết của từng phân loại xét nghiệm bên màn hình bên phải.

**Phần phải — Data grid chi tiết xét nghiệm:**
- Bảng danh sách xét nghiệm thuộc nhóm được chọn bên trái
- Toolbar phía trên bảng: các chức năng như thêm, sửa, xóa, lưu, tìm kiếm

**Dialog "KHAI BÁO XÉT NGHIỆM" (popup khi tạo/sửa):**
Màn hình dialog chi tiết xét nghiệm với các trường:
- **Tên XN:** Tên xét nghiệm (text field)
- **Tên in:** Tên in trên phiếu kết quả (text field)
- **Đơn vị:** Dropdown đơn vị đo
- **Loại kết quả:** (dropdown — số/text/định tính/…)
- **Giá trị bình thường nam:** (text/number)
- **Giá trị bình thường nữ:** (text/number)
- **Giá trị bình thường trẻ em:** (text/number)
- **Giá trị cảnh báo thấp:** (number)
- **Giá trị cảnh báo cao:** (number)
- **Giá trị nguy hiểm thấp:** (number)
- **Giá trị nguy hiểm cao:** (number)
- **Máy XN:** Liên kết với máy xét nghiệm
- **Mã XN trên máy:** Mã tương ứng trên máy phân tích (integration point)
- **Số thứ tự in:** Thứ tự in trên phiếu kết quả
- **Phân nhóm:** Nhóm xét nghiệm
- Các checkbox cấu hình thêm

**Phía trên màn hình chính:** thanh công cụ có các chức năng như thêm, xóa, sửa, cập nhật thông tin thay đổi.

#### 1.6.3 Quy trình khai báo "Xét nghiệm"

1. Kiểm tra trong khung tìm kiếm nếu chưa có số xét nghiệm trong danh mục thì nhấn **"Mới"** để tiến hành khai báo
2. Khai báo các thông số (điền đầy đủ thông tin trong dialog)
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập

**Lưu ý đặc biệt:** Nên nhấn vào biểu tượng 🔍 (kính lúp) để xem tất cả xét nghiệm và tìm kiếm dễ hơn

#### 1.6.4 Sửa "Xét nghiệm"

1. Chọn xét nghiệm muốn chỉnh sửa trên danh sách
2. Nhấn **"Sửa"** → Chỉnh sửa thông tin cần thiết

Màn hình sửa hiển thị tương tự màn hình tạo mới với các trường đã được điền sẵn giá trị hiện tại.

3. Nhấn **"Lưu"**

**Ghi chú:** Bấm "Bỏ qua" nếu không muốn lưu thông tin đã nhập hay sửa

---

### 1.7 Tổng kết menu hệ thống MQ LIS

**Menu bar đầy đủ của MQ LIS:**

| Menu | Chức năng |
|------|-----------|
| A. Cập nhật | Lấy mẫu bệnh phẩm, Xác nhận mẫu, Phiếu kết quả xét nghiệm, Khám sức khỏe, Danh sách bệnh nhân làm xét nghiệm, Sửa số thứ tự lấy mẫu, In mã vạch lấy mẫu |
| B. Báo cáo | Các báo cáo xét nghiệm |
| C. Tiện ích | Danh mục (con: Số XN, XN, Đơn vị đo, Đơn vị đo HL7, Vi trùng, Kháng sinh, Khai báo khoa phòng LIS, Khai báo mã bác sỹ LIS), Khai báo sử dụng, Hóa chất xét nghiệm, Khai báo giá trị tham chiếu hóa chất, Cấu hình hệ thống, Tùy chọn người dùng, Phân quyền sử dụng, Đổi mật khẩu, Log Off AdminMQ |
| D. Cửa sổ | Quản lý cửa sổ |
| E. Hướng dẫn | Hướng dẫn sử dụng |
| F. Kết thúc | Thoát chương trình |

---

## Part 2: Nhận mẫu bệnh phẩm (Sample Receiving)

### 2.1 Tổng quan tài liệu

**Tên tài liệu:** XÉT NGHIỆM — Nhận mẫu bệnh phẩm

**Mục lục:**

| Phần | Nội dung | Trang |
|------|----------|-------|
| 1 | Vào màn hình "Nhận mẫu" bệnh phẩm | 1 |
| 2 | Quy trình "Nhận mẫu" | 3 |
| 3 | Hủy nhận mẫu | 5 |
| Lưu ý | Các lưu ý quan trọng | 5 |

---

### 2.2 Vào màn hình "Nhận mẫu" bệnh phẩm

#### 2.2.1 Các bước truy cập

1. Mở phần mềm **MQ Main** (icon MQ màu tím)
2. Chọn vào phần **Xét nghiệm (MQ LIS)**
3. Nhập tài khoản, mật khẩu được cung cấp → đăng nhập
4. Vào **A. Cập nhật** → **"Xác nhận mẫu"**

#### 2.2.2 Menu A. Cập nhật — đầy đủ các mục con

Menu **A. Cập nhật** của MQ LIS:
- **Lấy mẫu bệnh phẩm**
- **Xác nhận mẫu** ← (chức năng nhận mẫu, được highlight/mũi tên chỉ)
- Phiếu kết quả xét nghiệm
- Khám sức khỏe
- Danh sách bệnh nhân làm xét nghiệm
- Sửa số thứ tự lấy mẫu
- In mã vạch lấy mẫu

---

### 2.3 Màn hình "XÁC NHẬN MẪU"

**Tiêu đề màn hình:** XÁC NHẬN MẪU (chữ trắng trên nền xanh lá đậm)

#### 2.3.1 Cấu trúc màn hình (trạng thái rỗng — chưa chọn BN)

**Hai tab chính:**
1. **Phiếu lấy mẫu** (tab đang active)
2. **Danh sách chờ** (tab thứ hai)

**Phần "Thông tin":**
- **Mã BN:** (text input — nhập mã bệnh nhân)
- **Họ và tên:** (text field hiển thị tên BN sau khi chọn)

**Phần "Đặt lịch":**
(phần thông tin ngày đặt lịch)

**Phần "Thông tin lấy mẫu":**
- **Ngày lấy mẫu:** Date/time picker — ví dụ: `26/11/2024 12:13` + dropdown giờ `STT` (số thứ tự)
- **Ngày xác nhận:** (date field)
- **Nhân viên xác nhận:** (text field)

**Data grid — bảng danh sách xét nghiệm của BN:**

| Cột | Mô tả |
|-----|-------|
| STT | Số thứ tự |
| Tên xét nghiệm chỉ định | Tên XN được chỉ định |
| Số lượng | Số lượng mẫu |
| Số lượng (2) | (cột phụ) |
| Đơn vị | Đơn vị mẫu |
| Phòng | Phòng xét nghiệm thực hiện |
| Bình phẩm | Loại bình/ống chứa mẫu |
| Id | Mã định danh |

**Nút tác vụ phía dưới:**
- **Lưu** (nút chính)
- **Lưu lại** (nút phụ)
- **Hủy** (X)
- **Cài đặt mới** (hoặc nút cấu hình)

---

### 2.4 Quy trình "Nhận mẫu" (chi tiết từng bước)

#### Bước 1: Truy cập tab Danh sách chờ

Trên màn hình **XÁC NHẬN MẪU**:
- Vào tab **"Danh sách chờ"** → Nhấn **"Xem"**
- Danh sách chờ hiển thị các BN đang chờ lấy mẫu tại khoa/phòng nội trú

**Dữ liệu trong bảng danh sách chờ (Bước 1):**
Hiển thị các cột bao gồm: ngày/giờ, thông tin BN, khoa phòng, trạng thái mẫu

#### Bước 2: Chọn bệnh nhân

- Nhấn vào **biểu tượng chức năng** (dấu tích/checkmark icon) để chọn BN
- Danh sách BN được chọn hiển thị với cột **checkbox** ở đầu mỗi hàng

**Bảng danh sách BN trong Bước 2:**

| Cột | Nội dung |
|-----|----------|
| Checkbox chọn | Tích chọn BN |
| STT | Số thứ tự |
| Họ tên BN | Tên bệnh nhân (ví dụ: ẩn danh vì bảo mật) |
| Khoa | Khoa phòng |
| Ngày vào | Ngày nhập viện |
| Xét nghiệm | Tên XN được chỉ định |

#### Bước 3: Kiểm tra thông tin

- Sau khi chọn BN, kiểm tra lại thông tin XN của BN trong tab **"Phiếu lấy mẫu"**
- Thông tin hiển thị:
  - **Mã BN:** (ví dụ: 24087564)
  - **Họ và tên:** (ví dụ: BN CÓ BẢO Lần 01)
  - **Ngày lấy mẫu:** với STT và thời gian cụ thể
  - **Nhân viên xác nhận:** (tên nhân viên nhận mẫu)
  - **Danh sách XN đã chỉ định** hiển thị trong bảng với 2 nhóm:

**Nhóm 1: Số Hóa máu (ví dụ)**
- Hàng 1: Sinh hóa máu Hồ Quỳnh (Rồng nghiệm) — 28/11/2024 08:03 — BHT: Đ.Nội — Số lượng: 1 — 40,000: Bs Hoàng Quốc Anh — KHOA NỘI TIM MẠCH — Hầu cổng (EDTA) — Đóng mẫu

**Nhóm 2: Số Hóa sinh**
- Hàng 1: Sn hoạt độ ALT (GPT) [Máy] — 28/11/2024 08:03 — BHT: Đ.Nội — 23000: Bs Hoàng Quốc Anh — KHOA NỘI TIM MẠCH — Hầu cổng [Serum] — Hầu đỏ
- Hàng 2: Sn hoạt độ AST (GOT) [Máy] — 28/11/2024 08:03 — BHT: Đ.Nội — 23000: Bs Hoàng Quốc Anh — KHOA NỘI TIM MẠCH — Hầu cổng [Serum] — Hầu đỏ

#### Bước 4: Lưu xác nhận mẫu

- Nhấn **"Lưu"** để xác nhận đã lấy mẫu

#### Bước 5: Kết quả sau khi Lưu

- BN sẽ được hiển thị trong **"Danh sách chờ"** với trạng thái **"Đã xác nhận"**
- Thông tin hiển thị trong tab Danh sách chờ sau khi xác nhận:

**Cột trong tab Danh sách chờ (trạng thái Đã xác nhận):**

| Cột | Nội dung |
|-----|----------|
| Chọn | Checkbox |
| Ngày lấy mẫu | Ngày/giờ lấy mẫu |
| Barcode | Mã barcode mẫu |
| Khoa | Khoa phòng |
| Mã BN | Mã bệnh nhân |
| Họ tên | Tên bệnh nhân |
| **Ngày nhận mẫu** | **Ngày/giờ nhận mẫu** (cột được highlight đỏ — quan trọng) |
| Nhân viên xác nhận | Tên nhân viên đã xác nhận |

**Ví dụ dữ liệu sau xác nhận:**
- Cột Ngày nhận mẫu: `28/11/2024 10:04`
- Nhân viên xác nhận: `AdminMQ`

---

### 2.5 Hủy nhận mẫu

#### Quy trình hủy:

1. Vào tab **"Danh sách chờ"** → chọn trạng thái **"Đã xác nhận"**
2. Chọn BN muốn hủy nhận mẫu (tích checkbox)
3. Nhấn **"Hủy"**

**Màn hình khi hủy:**
- Tab Danh sách chờ hiển thị bộ lọc: Chưa xác nhận | **Đã xác nhận** (active)
- Các cột: Chọn | Ngày lấy mẫu | Barcode | Khoa | Mã BN | Họ tên | Ngày nhận mẫu | Nhân viên xác nhận
- Nút **"Hủy"** ở toolbar phía dưới

---

### 2.6 Lưu ý quan trọng về Nhận mẫu

> **Lưu ý 1:** Không ràng buộc việc BN nội trú đã lấy mẫu tại khoa nhưng chưa xác nhận "Nhận mẫu" thì không thực hiện XN được.
>
> *(Nghĩa là: với BN nội trú, hệ thống KHÔNG bắt buộc phải có bước "Xác nhận nhận mẫu" mới cho phép thực hiện XN và nhập kết quả)*

> **Lưu ý 2:** Trong danh sách chờ của "Phiếu kết quả XN" vẫn sẽ hiển thị tên BN nội trú dù chưa xác nhận đã nhận mẫu.
>
> *(Nghĩa là: BN nội trú sẽ xuất hiện trong danh sách chờ của màn hình nhập kết quả XN dù chưa qua bước xác nhận nhận mẫu)*

**Tóm tắt business rule:**
- BN **ngoại trú**: Bắt buộc phải qua bước nhận mẫu → mới thực hiện XN
- BN **nội trú**: KHÔNG bắt buộc xác nhận nhận mẫu → vẫn có thể thực hiện XN (vẫn hiện trong danh sách chờ kết quả)

---

## Part 3: Phân quyền (Lab Permissions)

### 3.1 Tổng quan tài liệu

**Tên tài liệu:** XÉT NGHIỆM — Phân quyền KTV và Người duyệt

**Mục lục:**

| Phần | Nội dung | Trang |
|------|----------|-------|
| Phân quyền KTV – Người duyệt KQ | Quy trình phân quyền | 1–2 |
| Lưu ý | Các lưu ý quan trọng | 2 |
| Phân quyền chức năng mới "Xác nhận mẫu" | Phân quyền riêng cho chức năng mới | 3–4 |

**Hai loại quyền trong module XN:**
1. **KTV** (Kỹ thuật viên) — người trả kết quả XN
2. **Người duyệt KQ** (Người duyệt kết quả) — người ký duyệt/phê duyệt kết quả XN

---

### 3.2 Phân quyền KTV – Người duyệt KQ

#### 3.2.1 Truy cập màn hình phân quyền

**Đường dẫn:** Vào **"Quản lý người dùng"**

Xét nghiệm (LIS) → **Tiện ích** → **"Phân quyền sử dụng"**

**Menu Tiện ích (đầy đủ):**
- Danh mục
- Khai báo sử dụng
- Hóa chất xét nghiệm
- Khai báo giá trị tham chiếu hóa chất
- Cấu hình hệ thống
- Tùy chọn người dùng
- **Phân quyền sử dụng** ← (mục đang chọn)
- Đổi mật khẩu
- Log Off AdminMQ

#### 3.2.2 Màn hình "QUẢN LÝ NGƯỜI DÙNG"

**Tiêu đề:** QUẢN LÝ NGƯỜI DÙNG

**Cấu trúc màn hình:**

**Panel trái — Cây người dùng:**
Danh sách tài khoản người dùng trong hệ thống XN, hiển thị dạng cây phân cấp theo nhóm.

**Danh sách tài khoản mẫu (từ ảnh thực tế):**
- Quản trị cơ sở dữ liệu
  - AdminMQ (1)
- Ban Giám Đốc (template_BGD)
  - Bà Hoàng Thị Thảo (thoannt)
  - Phạm Kim Phượng (phuongnmt)
  - BaCSG Đoàn Minh Khoa (khounmt)
  - Bùi Trường Nam (nam00283)
  - Bùi Văn Đạt (dat00571)
- CN. (nhóm Cử nhân/kỹ thuật viên):
  - Bùi Thị Hồng Vân (van00029)
  - Bùi Thị Thanh Tuyền (tuyen00249)
  - Đặng Thành Long (long00027)
  - Đào Hoàng Thảo Vy (vy00720)
  - Hồ Trung Kiên (kien00057)
  - Lê Thị Hồng Ngọc (ngoc00028)
  - Lê Trần Khánh Xuân (xuan00207)
  - Lộc Thị Hoa (hoa01138)
  - Mai Thị Hồng Thu (thu00140)
  - Nguyễn Hoàng Tùng (tung00059)
  - Nguyễn Thị Diễm Thắm (tham00603)
  - Nguyễn Thị Kim Phụng (phung00218)
  - Nguyễn Thị Mỹ Huyền Trân (tran00201)
  - Phạm Huy Hf Hoa (hoa00738)
  - Phạm Thị Thúy Trang (trang00008)
  - Trần Văn Hùng (hung00140)
  - Võ Thị Nhu Ngọc (ngoc00026)
  - Vũ Mạnh Kha (kha00058)
- Khoa Xét Nghiệm (xn)
- Liên Thông (benthong)
- Nguyễn Minh Tuyền (tuyen03)
- Nguyễn Thị (thiv00003)
- Nguyễn Việt Phú (phu00130)
- Phạm Đình Th (thv00003)
- Phạm Minh Vương (vuong00055)
- Phạm Minh Khang (khang00469)
- Phòng Bảo Hiểm (baohiem)
- Quản lý hệ thống - Admin (template_Admin)
- Trần Lam Việt (loc)
- Trần Nam Giang (giang00008)

**Panel phải — Danh sách quyền (3 cột):**
Sau khi chọn tài khoản và nhấn biểu tượng chức năng (edit icon), màn hình phân quyền hiển thị dialog với:

**Dialog "KHAI BÁO NGƯỜI DÙNG":**
- **Ô "Nhận viên"** (trái): Danh sách nhân viên có thể là Người duyệt kết quả XN
- **Ô "KTV"** (phải): Danh sách nhân viên là KTV (kỹ thuật viên trả kết quả)

**Ý nghĩa 2 ô:**
- Nhập tên nhân viên ở ô **"Nhận viên"** → mặc định họ là **người duyệt kết quả** XN
- Nhập tên nhân viên ở ô **"KTV"** → mặc định họ là **KTV trả kết quả** XN

#### 3.2.3 Quy trình phân quyền KTV – Người duyệt

1. Chọn tài khoản muốn chỉnh sửa trên danh sách quản lý người dùng (panel trái)
2. Nhấn vào **biểu tượng chức năng** (edit icon — hình bút/chỉnh sửa)
3. Trong dialog "KHAI BÁO NGƯỜI DÙNG":
   - Nhập tên nhân viên ở ô **"Nhận viên"** → mặc định là người duyệt kết quả XN
   - Nhập tên nhân viên ở ô **"KTV"** → mặc định là KTV trả kết quả XN
4. Nhấn **"Lưu"** để hoàn tất

---

### 3.3 Lưu ý quan trọng về Phân quyền

> **Lưu ý:** Khi nhập họ tên người dùng ở ô "KTV" mà không thấy danh sách hiện ra, có thể nhập ở ô "Nhận viên" copy mã ở ô "Nhận viên" paste ở ô "KTV" → Enter để cập nhật thông tin KTV.
>
> *(Nhớ xóa thông tin đã nhập ở ô "Nhận viên" nếu người đó không có quyền duyệt kết quả)*

**Tóm tắt business rule phân quyền:**

| Vai trò | Ô khai báo | Quyền hạn |
|---------|-----------|-----------|
| Người duyệt kết quả XN | Ô "Nhận viên" | Ký duyệt/phê duyệt kết quả xét nghiệm |
| KTV (Kỹ thuật viên) | Ô "KTV" | Nhập và trả kết quả xét nghiệm |

**Trường hợp người vừa là KTV vừa là Người duyệt:** Nhập tên vào cả 2 ô.

---

### 3.4 Phân quyền chức năng mới "Xác nhận mẫu"

> Đây là chức năng **mới** được thêm vào — cần phân quyền riêng biệt.

#### 3.4.1 Quy trình phân quyền chức năng "Xác nhận mẫu"

**Thực hiện tại màn hình "Quản lý người dùng" (Phân quyền sử dụng):**

1. Chọn tài khoản muốn phân quyền
2. **Tích chọn** chức năng **"Xác nhận mẫu"** trong danh sách quyền
3. Nhấn **"Lưu"**

#### 3.4.2 Màn hình phân quyền chức năng

**Màn hình:** QUẢN LÝ NGƯỜI DÙNG (cùng màn hình với phân quyền KTV)

**Danh sách chức năng có thể phân quyền (hiển thị dạng checklist):**
- Danh sách bao gồm tất cả chức năng của module XN
- Chức năng **"Xác nhận mẫu"** được highlight/đánh dấu là mục mới cần tích chọn thủ công

**Lưu ý giao diện:** Màn hình phân quyền hiển thị dạng cây checklist với 2 panel:
- Panel trái: Danh sách user
- Panel phải: Danh sách chức năng với checkbox để tích

#### 3.4.3 Danh sách tài khoản hiện tại trong hệ thống XN (từ ảnh thực tế)

Màn hình "QUẢN LÝ NGƯỜI DÙNG" cho thấy danh sách tài khoản thực tế:

**Nhóm quản trị:**
- Quản trị cơ sở dữ liệu
- AdminMQ (1)

**Ban Giám Đốc (template_BGD):**
- Bà Hoàng Thị Thảo (thoannt)
- Phạm Kim Phượng (phuongnmt)
- BaCSG Đoàn Minh Khoa (khounmt)
- Bùi Trường Nam (nam00283)
- Bùi Văn Đạt (dat00571)

**Nhóm CN. (Cử nhân / KTV):**
- Bùi Thị Hồng Vân (van00029)
- Bùi Thị Thanh Tuyền (tuyen00249)
- Đặng Thành Long (long00027)
- Đào Hoàng Thảo Vy (vy00720)
- Hồ Trung Kiên (kien00057)
- Lê Thị Hồng Ngọc (ngoc00028)
- Lê Trần Khánh Xuân (xuan00207)
- Lộc Thị Hoa (hoa01138)
- Mai Thị Hồng Thu (thu00140)
- Nguyễn Hoàng Tùng (tung00059)
- Nguyễn Thị Diễm Thắm (tham00603)
- Nguyễn Thị Kim Phụng (phung00218)
- Nguyễn Thị Mỹ Huyền Trân (tran00201)
- Phạm Huy Hf Hoa (hoa00738)
- Phạm Thị Thúy Trang (trang00008)
- Trần Văn Hùng (hung00140)
- Võ Thị Nhu Ngọc (ngoc00026)
- Vũ Mạnh Kha (kha00058)

**Các nhóm/cá nhân khác:**
- Khoa Xét Nghiệm (xn)
- Liên Thông (benthong)
- Nguyễn Minh Tuyền (tuyen03)
- Nguyễn Thị (thiv00003)
- Nguyễn Việt Phú (phu00130)
- Phạm Đình Th (thv00003)
- Phạm Minh Vương (vuong00055)
- Phạm Minh Khang (khang00469)
- Phòng Bảo Hiểm (baohiem)
- Quản lý hệ thống - Admin (template_Admin)
- Trần Lam Việt (loc)
- Trần Nam Giang (giang00008)

---

## Phụ lục: Sơ đồ luồng quy trình XN tổng hợp

### Luồng khai báo (một lần setup)

```
1. Khai báo Đơn vị đo
        ↓
2. Khai báo Vi trùng – Vi khuẩn
        ↓
3. Khai báo Kháng sinh
        ↓
4. Khai báo Số Xét nghiệm (liên kết máy XN với viện phí)
        ↓
5. Khai báo chi tiết Xét nghiệm (giá trị bình thường, đơn vị, cảnh báo)
        ↓
6. Phân quyền KTV và Người duyệt KQ
        ↓
7. Phân quyền chức năng "Xác nhận mẫu"
```

### Luồng vận hành hàng ngày (Nhận mẫu)

```
BN đến khoa/phòng → Lấy mẫu bệnh phẩm
        ↓
Nhân viên XN vào A. Cập nhật → Xác nhận mẫu
        ↓
Tab "Danh sách chờ" → Xem
        ↓
Chọn BN (click biểu tượng chức năng)
        ↓
Kiểm tra thông tin XN của BN
        ↓
Nhấn "Lưu" → Trạng thái: "Đã xác nhận"
        ↓
BN hiển thị trong màn hình "Phiếu kết quả XN" → KTV nhập kết quả
        ↓
Người duyệt KQ phê duyệt kết quả
```

### Lưu ý quan trọng về ngoại lệ BN nội trú

```
BN nội trú → Chưa qua bước "Xác nhận mẫu"
        ↓
Vẫn hiển thị trong "Phiếu kết quả XN" (danh sách chờ)
        ↓
KTV có thể nhập kết quả KHÔNG cần xác nhận nhận mẫu trước
```

---

## Phụ lục: Mapping quyền → Chức năng

| Quyền/Role | Chức năng được phép |
|-----------|---------------------|
| AdminMQ | Toàn bộ chức năng bao gồm khai báo danh mục |
| Người duyệt KQ (Nhận viên) | Phê duyệt/ký kết quả XN |
| KTV (KTV) | Nhập kết quả, lấy mẫu, in phiếu |
| Tài khoản có quyền "Xác nhận mẫu" | Xác nhận đã nhận mẫu bệnh phẩm từ khoa/phòng |
| Template BGD | Xem báo cáo, tra cứu |

---

## Phụ lục: Integration Points (Điểm tích hợp)

### Liên kết Viện Phí ↔ XN

- **Số Xét nghiệm** là cầu nối giữa:
  - Khoa phòng chỉ định → Viện Phí thu tiền → Xét nghiệm thực hiện
- Khi khai báo Số Xét nghiệm, cần liên kết với **chỉ định giá XN** trong module Viện Phí
- Máy XN trả kết quả → hệ thống tự điền thông tin thay đổi (LIS interface)

### Liên kết Máy XN (Analyzer Interface)

- Mỗi xét nghiệm khai báo có trường **"Mã XN trên máy"** → mapping với code máy phân tích
- Hỗ trợ chuẩn **HL7** (có mục Đơn vị đo HL7 riêng)
- Barcode mẫu: In từ menu **"In mã vạch lấy mẫu"** (trong A. Cập nhật)

### Liên kết HIS – LIS

- **Khoa phòng chỉ định:** Bác sĩ tại khoa dùng HIS chỉ định XN → LIS nhận chỉ định
- **Danh sách chờ** trong Xác nhận mẫu hiển thị BN từ tất cả khoa/phòng (cả ngoại trú + nội trú)
- Sau khi KTV nhập và người duyệt phê duyệt kết quả → kết quả trả về HIS (bác sĩ xem trên HIS)
