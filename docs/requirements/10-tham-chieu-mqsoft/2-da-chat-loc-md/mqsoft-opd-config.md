# Khai báo sử dụng Phòng khám (OPD Configuration)
> Source: MQ - Phòng khám - Khai báo sử dụng.pdf (13 pages)
> Extracted: 2026-06-01

---

## Mục lục tài liệu

| Mục | Nội dung | Trang |
|-----|----------|-------|
| — | Vào màn hình Phòng khám (Phiếu khám bệnh) | 2 |
| 1 | Viết tắt | 4 |
| 1.1 | Khai báo viết tắt | 4 |
| 1.2 | Xóa, sửa viết tắt | 5 |
| 1.3 | Cách sử dụng viết tắt | 5 |
| 2 | Đơn thuốc mẫu | 5 |
| 2.1 | Khai báo đơn thuốc mẫu | 5 |
| 2.2 | Xem danh sách đơn thuốc mẫu đã khai báo | 7 |
| 2.3 | Xóa, sửa đơn thuốc mẫu | 8 |
| 2.4 | Cách sử dụng đơn thuốc mẫu | 8 |
| 3 | HSBA ngoại trú mẫu | 10 |
| 3.1 | Khai báo HSBA mẫu | 10 |
| 3.2 | Cách sử dụng HSBA mẫu | 11 |
| 4 | Khai báo mẫu tường trình PTTT | 12 |
| 4.1 | Khai báo tường trình PTTT mẫu | 12 |
| 4.2 | Xóa, sửa tường trình PTTT mẫu | 13 |
| 4.3 | Cách sử dụng tường trình PTTT mẫu | 13 |

---

## Vào màn hình Phòng khám (Phiếu khám bệnh)

### Quy trình truy cập

**Bước 1:** Mở phần mềm **MQ Main**

**Bước 2:** Chọn vào phần **Bệnh Nhân (MQ HIS)**
- Giao diện MQ Main hiển thị bảng điều khiển với các module: Tiếp đón, Khám bệnh, Thu ngân, Nội trú, Phẫu thuật, Dược, Xét nghiệm, CDHA, và các module khác

**Bước 3:** Nhập tài khoản, mật khẩu được cung cấp
- Hệ thống hiển thị màn hình đăng nhập "HỆ THỐNG QUẢN LÝ BỆNH NHÂN"
- Nhập username và password

**Bước 4:** Vào **"Khám bệnh"** → **"Phiếu khám bệnh"**

### UI: Menu Khám bệnh

Từ menu chính, chọn **"Khám bệnh"** để mở dropdown với các mục:

| Mục menu | Mô tả |
|----------|-------|
| Sơn lý thực hiện lệnh khám bệnh | Danh sách lệnh thực hiện |
| Sơn lý thực lệnh khám bệnh | Xử lý lệnh |
| Đăng ký khám bệnh | Đăng ký mới |
| Nhập yêu cầu khám từ khóa ngoại | Import từ nguồn ngoài |
| **Phiếu khám bệnh** | **Màn hình chính khám bệnh** |
| Hỗ sơ bệnh án | HSBA |
| Chuyển phòng khám bệnh nhân chưa chẩn | Chuyển phòng |
| Phiếu thạnh toán dịch vụ | Thanh toán |
| Đặt lịch hẹn | Lịch hẹn |
| Sơn lý SB quản cổ dọc sang | Xử lý SB |
| Đánh số người đến bằng đầu tự so | Đánh số |
| Chuyết ngừ nghiệu buổng thuộc | Chuyển nghỉ |
| Toa Bộ lệnh | Toa bộ lệnh |
| Báo cáo & thống kê | Báo cáo |
| Hồ sơ cao khẩn | Hồ sơ khẩn |
| Nghiệp phẫu thuật | PTTT |

### UI: Màn hình "Phiếu khám bệnh"

Màn hình chính gồm các khu vực:
- **Khu vực trái**: Danh sách bệnh nhân (grid) theo phòng/ngày
- **Khu vực giữa**: Thông tin khám bệnh, chẩn đoán, đơn thuốc
- **Khu vực phải**: Thông tin chi tiết bệnh nhân, ICD, chỉ định dịch vụ

---

## 1. Viết tắt

### 1.1 Khai báo viết tắt

Chức năng "Viết tắt" cho phép bác sĩ định nghĩa các cụm từ viết tắt để nhập nhanh trong quá trình khám bệnh.

**Quy trình khai báo:**

1. Vào **"Tiện ích"** → **"Viết tắt"**

### UI: Menu Tiện ích

| Mục menu | Chức năng |
|----------|-----------|
| Nghiệp vụ | Nghiệp vụ chung |
| Thông tin khám bệnh | Cấu hình thông tin |
| Thông tin đăng ký khám bệnh | Cấu hình đăng ký |
| Thuốc để sử dụng | Danh mục thuốc |
| Cận lâm sàng thứ sử dùng | Danh mục CLS |
| **Đơn mẫu** | **Đơn thuốc mẫu** |
| Đơn mẫu mua nguyên nhập tại lúc | Đơn mẫu đặc biệt |
| Kết tặt | Viết tắt |
| Phiếu mẫu dùng tạng bổng tập tận | Phiếu mẫu |
| Phiếu thi đết đẳng thuốc - VTYT | Phiếu thuốc |
| Hồ sơ và các khám | HSBA |
| Chỉ định lên khóa | Chỉ định khóa |
| Tường thuật – Tiếu phẫu | Tường thuật PTTT |
| Số mẫu đề giải cổ đóng | Số mẫu |
| Đánh sách người bệnh đề kết hố sơ sổ | Danh sách BN |
| Phòng mổ | Phòng mổ |
| Số chức năng | Số chức năng |

2. Ở cửa sổ **"Viết tắt"** vừa hiện ra → Nhấn **"Mới"** → Từ viết tắt, từ đầy đủ
3. Nhấn **"Lưu"**

### UI: Cửa sổ Viết tắt

- **Tiêu đề cửa sổ**: Viết tắt
- **Danh sách viết tắt**: Grid hiển thị các viết tắt đã khai báo
- **Nút "Mới"**: Tạo viết tắt mới
- **Nút "Lưu"**: Lưu viết tắt
- **Fields nhập liệu**:
  - Viết tắt (từ ngắn)
  - Từ đầy đủ / nội dung thay thế

### 1.2 Xóa, sửa viết tắt

**Sửa:**
1. Chọn từ viết tắt muốn sửa trong danh sách hoặc từ vừa khai báo xong
2. Nhấn **"Sửa"**
3. Tích chọn thêm thuốc muốn thêm → Nhấn **"Lưu"**

**Xóa:**
1. Chọn từ viết tắt muốn xóa trong danh sách hoặc từ vừa khai báo xong
2. Nhấn **"Hủy"**

### 1.3 Cách sử dụng viết tắt

Viết tắt có thể sử dụng ở các ô:
- **Ghi chú thuốc**
- **Ghi chú bạn**
- **Chẩn đoán sơ bộ, triệu chứng lâm sàng**

**Thao tác sử dụng:**
- Nhập từ viết tắt → Nhấn **F2** (phím tắt tra cứu viết tắt)
- Hệ thống sẽ tự động thay thế từ viết tắt bằng nội dung đầy đủ

---

## 2. Đơn thuốc mẫu

Đơn thuốc mẫu được sử dụng để kê đơn thuốc dựa trên mã ICD tương ứng lúc tạo mẫu.

### 2.1 Khai báo đơn thuốc mẫu

**Bước 1:** Vào **"Tiện ích"** → **"Đơn mẫu"**

**Bước 2:** Ở cửa sổ **"Đơn mẫu"** vừa hiện ra → Nhấn **"Tiếp"** → Nhập bệnh, khoa phòng

### UI: Cửa sổ Đơn mẫu — Bước nhập thông tin mẫu

**Thông tin cần nhập:**

| Trường | Mô tả | Bắt buộc |
|--------|-------|----------|
| Nhập bệnh | Tên bệnh / mã ICD liên kết với đơn mẫu | Có |
| Khoa phòng | Khoa/phòng áp dụng đơn mẫu này | Có |

**Nút thao tác:**
- **"Tiếp"**: Tiến sang bước chọn thuốc
- **"Hủy"**: Hủy tạo mẫu

**Bước 3:** Tích chọn những hoạt chất muốn sử dụng trong đơn thuốc mẫu → Nhấn **"Thêm"**

### UI: Cửa sổ Chọn thuốc cho Đơn mẫu

- **Danh sách thuốc** (grid bên trái/giữa): Toàn bộ danh mục thuốc của cơ sở
- **Grid columns** (danh sách thuốc để chọn):
  - STT
  - Tên hoạt chất / tên thuốc
  - Hàm lượng / nồng độ
  - Đơn vị
  - Ghi chú

- **Thao tác**: Tích checkbox vào thuốc muốn thêm vào mẫu → Nhấn **"Thêm"**

**Bước 4:** Sau khi nhấn "Thêm", những thuốc được chọn sẽ hiện ở danh sách phía trên

**Bước 5:** Trỏ chuột tới ô muốn chinh sửa và nhấn để nhập số lượng thuốc dùng sáng, trưa, chiều, tối, số ngày sử dụng, số lượng và ghi chú thuốc

### UI: Grid Đơn thuốc mẫu — Thông tin liều dùng

| Cột | Mô tả |
|-----|-------|
| Tên thuốc / hoạt chất | Tên thuốc đã chọn |
| Sáng | Số lượng dùng buổi sáng |
| Trưa | Số lượng dùng buổi trưa |
| Chiều | Số lượng dùng buổi chiều |
| Tối | Số lượng dùng buổi tối |
| Số ngày | Số ngày sử dụng |
| Số lượng | Tổng số lượng (tự tính hoặc nhập thủ công) |
| Ghi chú | Ghi chú cách dùng |

**Bước 6 (Bước 5 trong hướng dẫn):** Sau khi nhập thông tin sử dụng có thể chọn thuốc được sử dụng ở đâu như **ngoại trú, nội trú, cả nội và ngoại trú hay phòng lưu**

### UI: Tùy chọn phạm vi sử dụng đơn mẫu

| Tùy chọn | Mô tả |
|----------|-------|
| Ngoại trú | Đơn mẫu chỉ dùng cho bệnh nhân ngoại trú |
| Nội trú | Đơn mẫu chỉ dùng cho bệnh nhân nội trú |
| Cả nội và ngoại trú | Áp dụng cho cả hai loại |
| Phòng lưu | Áp dụng cho phòng lưu bệnh nhân |

**Bước 7:** Nhấn **"Lưu"**

---

### 2.2 Xem danh sách đơn thuốc mẫu đã khai báo

**Bước 1:** Ở cửa sổ **"Đơn mẫu"** → Chọn **"Danh sách"**

**Bước 2:** Để xem chi tiết → Nhấn 2 lần vào ô xám tương ứng với đơn thuốc mẫu muốn xem

### UI: Màn hình Danh sách Đơn mẫu

- **Grid columns** (danh sách đơn mẫu):
  - STT
  - Tên đơn mẫu / tên bệnh
  - Mã ICD liên kết
  - Khoa phòng áp dụng
  - Số loại thuốc trong đơn

- **Thao tác**: Double-click vào dòng để xem chi tiết

---

### 2.3 Xóa, sửa đơn thuốc mẫu

Chọn đơn thuốc mẫu muốn sửa trong danh sách hoặc đơn thuốc vừa khai báo xong.

**Thêm thuốc vào mẫu:**
1. Chọn đơn thuốc mẫu muốn sửa trong danh sách hoặc đơn thuốc vừa khai báo xong
2. Nhấn **"Sửa"**
3. Tích chọn thêm thuốc muốn thêm → Nhấn **"Thêm"**

**Xóa thuốc khỏi mẫu:**
- Khi đang khai báo mẫu hoặc chỉnh sửa mẫu muốn xóa thuốc bất kì
- Nhấn chọn thuốc muốn xóa trên danh sách thuốc đã thêm
- Nhấn **"Xóa"**

**Hủy đơn mẫu:**
1. Chọn đơn thuốc mẫu muốn sửa trong danh sách hoặc đơn thuốc vừa khai báo xong
2. Chọn **"Hủy"**
3. Nhấn **"Đồng ý"** → hủy

---

### 2.4 Cách sử dụng đơn thuốc mẫu

**Quy trình sử dụng khi khám bệnh:**

1. Khi khám bệnh, cho toa thuốc BHYT – Thu phí **(F3)**
2. Nhấn **"Mới"**
3. Nhấn **"Mẫu"**
4. Chọn đơn thuốc mẫu đã khai báo
5. Sau khi chọn đơn thuốc mẫu muốn sử dụng, có thể chỉnh sửa số lượng uống sáng, trưa, chiều, tối, số ngày và số lượng tổng ngay trên danh sách thuốc trước khi nhấn chọn

**Tính năng tự động cập nhật:**
- Có thể chỉnh sửa số ngày trực tiếp trên ô **"Số ngày"**, chương trình sẽ tự động cập nhật ở danh sách bên dưới cùng như số lượng tổng của từng loại thuốc được kê

6. Nhấn **"Chọn"**

**Bước 7 (tham khảo):** Đơn thuốc mẫu đã được lấy ra cửa sổ kê đơn thuốc BHYT – Thu phí (Toa F3 – F5). Có thể thêm, bớt, chỉnh sửa đơn (như hướng dẫn: Thêm, xóa, sửa đơn thuốc)

---

## 3. HSBA ngoại trú mẫu

HSBA ngoại trú mẫu (Hồ sơ bệnh án ngoại trú mẫu) dùng để khai báo sẵn nội dung HSBA theo từng loại bệnh, áp dụng khi tạo HSBA ngoại trú cho bệnh nhân.

### 3.1 Khai báo HSBA mẫu

**Bước 1:** Nhấn **"Ngoại trú"** → Nhấn vào biểu tượng chức năng **"Khai báo mẫu BA"**

### UI: Màn hình HSBA ngoại trú — Khu vực "Ngoại trú"

- Nút **"Ngoại trú"** ở thanh công cụ phía trên
- Biểu tượng **"Khai báo mẫu BA"** (icon trong toolbar của khu vực ngoại trú)

**Bước 2:** Nhập tên bệnh (mã ICD bệnh) muốn khai báo mẫu

**Bước 3:** Nhập thông tin HSBA

### UI: Form Khai báo HSBA mẫu (Nội dung HSBA ngoại trú)

Các trường thông tin trong mẫu HSBA ngoại trú bao gồm:

| STT | Trường thông tin HSBA | Mô tả |
|-----|----------------------|-------|
| 1 | Tên bệnh (mã ICD) | Bệnh liên kết với mẫu HSBA này |
| 2 | Lý do đến khám | Lý do bệnh nhân đến khám |
| 3 | Hỏi bệnh (Anamnesis) | Tiền sử, bệnh sử |
| 4 | Khám bệnh | Kết quả thăm khám lâm sàng |
| 5 | Chẩn đoán | Chẩn đoán xác định |
| 6 | Hướng xử lý | Hướng điều trị, xử lý |
| 7 | Tóm tắt bệnh án | Tóm tắt toàn bộ HSBA |
| 8 | Ghi chú khác | Thông tin bổ sung |

**Bước 4:** Nhấn **"Lưu mẫu"**

---

### 3.2 Cách sử dụng HSBA mẫu

**Bước 1:** Nhấn **"Ngoại trú"** → Nhấn **"Mẫu"**

**Bước 2:** Chương trình sẽ hiện hộp thoại thông báo:
> **"Có muốn lấy mẫu bệnh án mặc định không? Bệnh nhân đã có dữ liệu trước đó sẽ bị ghi đè."**

### UI: Hộp thoại xác nhận lấy HSBA mẫu

- **Tiêu đề**: Thông báo
- **Nội dung**: "Có muốn lấy mẫu bệnh nhân mặc định không? Bệnh nhân đã có dữ liệu trước đó sẽ bị ghi đè."
- **Nút "Yes"**: Xác nhận lấy mẫu (dữ liệu cũ sẽ bị ghi đè)
- **Nút "No"**: Hủy, không áp dụng mẫu

**Kết quả:** Nhấn **"Yes"** → Hệ thống áp dụng mẫu HSBA tương ứng với mã ICD bệnh hiện tại của bệnh nhân vào form HSBA ngoại trú

---

## 4. Khai báo mẫu tường trình PTTT

Mẫu tường trình PTTT (Phẫu thuật – Thủ thuật) dùng để chuẩn bị sẵn nội dung tường trình theo từng loại phẫu thuật/thủ thuật.

### 4.1 Khai báo tường trình PTTT mẫu

**Bước 1:** Ở màn hình HIS – Bệnh nhân → Chọn **"Nội trú"** → **"PTTT"** → **"Khai báo mẫu PTTT"**

### UI: Menu Nội trú → PTTT

| Mục menu | Chức năng |
|----------|-----------|
| Phẫu thuật – thủ thuật | Màn hình chính PTTT |
| Chuyện phòng | Chuyển phòng |
| Nhập thuốc | Nhập thuốc |
| **Khai báo mẫu PTTT** | **Khai báo mẫu tường trình** |

**Bước 2:** Nhập thông tin tường trình PTTT mẫu:
- Tên bệnh (mã ICD)
- Tên mẫu
- Khoa phòng sử dụng
- Tủ trực (tủ dụng cụ)
- Tên BS (Bác sĩ thực hiện)
- Có thể chọn tên thành viên thực hiện PTTT (danh sách thành viên ê-kíp)

### UI: Form Khai báo mẫu tường trình PTTT

**Khu vực trái — Thông tin chung:**

| Trường | Mô tả | Bắt buộc |
|--------|-------|----------|
| Tên bệnh / ICD | Bệnh liên kết với PTTT | Có |
| Tên mẫu | Tên mẫu tường trình PTTT | Có |
| Khoa phòng sử dụng | Khoa/phòng áp dụng mẫu | Có |
| Tủ trực | Tủ dụng cụ phẫu thuật | Không |
| Tên BS | Bác sĩ thực hiện PTTT | Không |
| Thành viên | Danh sách ê-kíp phẫu thuật | Không |

**Khu vực phải — Nội dung tường trình PTTT:**

Danh sách (tree/list) các mẫu PTTT đã khai báo với cấu trúc phân cấp theo loại PTTT:
- PTTT theo chuyên khoa
- PTTT theo loại thủ thuật

**Nội dung tường trình** (text area lớn ở giữa):
- Phương pháp vô cảm
- Tư thế bệnh nhân
- Chuẩn bị dụng cụ
- Các bước tiến hành
- Kết quả phẫu thuật
- Tai biến / biến chứng (nếu có)
- Ghi chú

**Bước 3:** Nhấn **"Lưu"**

---

### 4.2 Xóa, sửa tường trình PTTT mẫu

**Thêm mẫu mới:**
- Nhấn mới thêm mẫu mới, thực hiện tuần tự các bước khai báo mẫu

**Xóa:**
1. Chọn tường trình PTTT mẫu muốn xóa trên danh sách lịch sử mẫu tường trình PTTT đã khai
2. Nhấn **"Hủy"**
3. Nhấn **"Yes"** (trong hộp thoại xác nhận)

### UI: Hộp thoại xác nhận xóa PTTT mẫu

- **Tiêu đề**: Thông báo
- **Nội dung**: Xác nhận xóa mẫu tường trình
- **Nút "Yes"**: Xác nhận xóa
- **Nút "No"**: Hủy, giữ nguyên

**Sửa:**
1. Chọn tường trình PTTT mẫu muốn sửa trên danh sách lịch sử mẫu tường trình PTTT đã khai
2. Nhấn **"Sửa"**
3. Sửa thông tin trên mẫu PTTT (thêm khoa phòng, chỉnh sửa nội dung tường trình, ...)
4. Nhấn **"Lưu"**

---

### 4.3 Cách sử dụng tường trình PTTT mẫu

Sau khi được chỉ định dịch vụ PTTT, ở màn hình "Phiếu kết quả":

1. Nhấn **"Phẫu thuật – thủ thuật"** (F6) → Nhấn **"Chọn mẫu"**
2. Ở hộp thoại **"Danh mục mẫu tường trình PTTT"** vừa hiện lên, chọn tên mẫu PTTT đã khai báo tương ứng với mã ICD bệnh của BN → Nhấn **"Chọn"**

### UI: Hộp thoại Danh mục mẫu tường trình PTTT

- **Tiêu đề**: Danh mục mẫu tường trình PTTT
- **Danh sách mẫu PTTT** (grid/tree bên phải):
  - Hiển thị theo phân cấp theo chuyên khoa / loại PTTT
  - Cột: Tên mẫu, Khoa phòng, Bác sĩ
- **Tìm kiếm**: Ô tìm kiếm theo tên mẫu / ICD
- **Nút "Chọn"**: Áp dụng mẫu được chọn vào tường trình hiện tại
- **Nút "Hủy"**: Đóng hộp thoại không áp dụng

**Kết quả:** Nội dung tường trình PTTT mẫu được tự động điền vào form tường trình của bệnh nhân. Bác sĩ có thể chỉnh sửa lại nội dung trước khi lưu.

---

## Tóm tắt chức năng và phím tắt quan trọng

| Chức năng | Đường dẫn menu | Phím tắt |
|-----------|---------------|----------|
| Mở Phiếu khám bệnh | Khám bệnh → Phiếu khám bệnh | — |
| Khai báo Viết tắt | Tiện ích → Viết tắt | — |
| Sử dụng Viết tắt khi nhập liệu | Nhập từ viết tắt | **F2** |
| Khai báo Đơn thuốc mẫu | Tiện ích → Đơn mẫu | — |
| Kê đơn BHYT – Thu phí | Trong phiếu khám | **F3** |
| Chọn Đơn thuốc mẫu khi kê đơn | Trong form kê đơn → Mẫu | — |
| Toa F3 – F5 (đơn thuốc mẫu) | Trong form kê đơn | **F3 – F5** |
| Khai báo HSBA mẫu | Ngoại trú → Khai báo mẫu BA | — |
| Sử dụng HSBA mẫu | Ngoại trú → Mẫu | — |
| Khai báo PTTT mẫu | Nội trú → PTTT → Khai báo mẫu PTTT | — |
| Chọn mẫu PTTT khi tường trình | Phẫu thuật – thủ thuật (F6) → Chọn mẫu | **F6** |

---

## Business Rules & Lưu ý triển khai

### Viết tắt
- Viết tắt được dùng ở 3 nơi: ghi chú thuốc, ghi chú bạn (bệnh nhân), chẩn đoán sơ bộ và triệu chứng lâm sàng
- Phím **F2** để tra cứu và áp dụng viết tắt
- Mỗi người dùng có thể có bộ viết tắt riêng (phụ thuộc tài khoản đăng nhập)

### Đơn thuốc mẫu
- Đơn thuốc mẫu được liên kết với **mã ICD** — khi bác sĩ chẩn đoán ICD trùng với ICD của mẫu, hệ thống có thể tự gợi ý hoặc cho phép chọn mẫu
- Mỗi đơn mẫu cần khai báo **khoa phòng** để lọc đúng mẫu cho từng khoa
- Có thể thiết lập phạm vi áp dụng: ngoại trú / nội trú / cả hai / phòng lưu
- Thông tin liều dùng (sáng/trưa/chiều/tối + số ngày) lưu sẵn trong mẫu, có thể chỉnh khi dùng
- Khi chọn mẫu để kê đơn, chương trình tự tính lại tổng số lượng khi thay đổi số ngày

### HSBA ngoại trú mẫu
- Mẫu HSBA gắn với **mã ICD** bệnh, áp dụng khi bác sĩ khám bệnh có cùng chẩn đoán ICD
- Khi áp dụng mẫu, dữ liệu HSBA cũ của lần khám sẽ bị **ghi đè** — hệ thống cảnh báo trước
- Xác nhận bằng **"Yes"** → áp dụng mẫu; **"No"** → giữ nguyên dữ liệu cũ

### Tường trình PTTT mẫu
- Mẫu tường trình PTTT được chọn dựa trên **mã ICD bệnh** của bệnh nhân
- Truy cập từ màn hình nội trú (không phải ngoại trú)
- Sau khi chọn mẫu, nội dung được tự động điền vào form tường trình — bác sĩ chỉnh sửa trước khi lưu
- Phím tắt vào màn hình Phẫu thuật – thủ thuật: **F6**

---

## Cross-module References

| Module liên quan | Tương tác |
|-----------------|-----------|
| **Khám bệnh (OPD)** | Module chính — Phiếu khám bệnh là nơi sử dụng Viết tắt, Đơn thuốc mẫu, HSBA mẫu |
| **Thu ngân / BHYT** | Kê đơn thuốc F3–F5 kết nối với module thu ngân, tính chi phí BHYT và thu phí |
| **Nội trú (IPD)** | Tường trình PTTT mẫu thuộc module nội trú — màn hình "Nội trú → PTTT" |
| **Dược (Pharmacy)** | Đơn thuốc mẫu chứa danh mục thuốc từ module Dược — hoạt chất, hàm lượng, đơn vị |
| **ICD / Chẩn đoán** | Viết tắt, Đơn mẫu, HSBA mẫu, PTTT mẫu đều liên kết với mã ICD |
| **Tiếp đón (Reception)** | Quy trình bắt đầu từ Tiếp đón → Khám bệnh → Thu ngân |

---

## Danh sách màn hình (Screens Inventory)

| Màn hình | Loại | Truy cập qua |
|----------|------|-------------|
| Phiếu khám bệnh | Main window | Khám bệnh → Phiếu khám bệnh |
| Cửa sổ Viết tắt | Dialog/Form | Tiện ích → Viết tắt |
| Cửa sổ Đơn mẫu (tạo mới) | Wizard dialog | Tiện ích → Đơn mẫu → Tiếp |
| Danh sách Đơn mẫu | Grid view | Tiện ích → Đơn mẫu → Danh sách |
| Form HSBA ngoại trú mẫu | Form | Ngoại trú → Khai báo mẫu BA |
| Hộp thoại xác nhận HSBA mẫu | Confirm dialog | Ngoại trú → Mẫu |
| Form Khai báo PTTT mẫu | Form + Tree | Nội trú → PTTT → Khai báo mẫu PTTT |
| Danh mục mẫu PTTT | Selection dialog | F6 → Chọn mẫu |
| Hộp thoại xác nhận xóa PTTT | Confirm dialog | Hủy mẫu PTTT |
