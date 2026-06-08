# VRPACS RIS — Non-DICOM & DICOM Detail
> Sources: 2 PDFs (17 + 33 = 50 pages)
> Vendor: Công ty Cổ phần Công nghệ C+
> Website: http://www.vrpacs.com | Email: contact@vrpacs.com | Tel: (+84) 982.603.805
> Address: Số 1, ngõ 31, đường 18M, Phường Mộ Lao, Quận Hà Đông, Thành phố Hà Nội
> Extracted: 2026-06-01

---

## Part 1: RIS Non-DICOM

### 1. Đăng nhập hệ thống

#### 1.1. Lựa chọn trình duyệt
- Hỗ trợ: **Chrome**, **Cốc Cốc**, **Firefox**, **Microsoft Edge**
- Khuyến nghị: Chrome hoặc Edge

#### 1.2. Nhập địa chỉ hệ thống PACS
- URL ví dụ: `vrpacs.com`
- Giao diện URL bar: địa chỉ nhập vào thanh địa chỉ trình duyệt

#### 1.3. Nhập thông tin tài khoản, mật khẩu đăng nhập
- Màn hình login: **CLOUD PACS**
- Trường: "Nhập tài khoản" + "Nhập mật khẩu"
- Nút: **LOGIN**
- Hiển thị: Quản Tài khoản / Mật khẩu
- Hỗ trợ kỹ thuật: 0982.603.805 - 0906.182.284

#### 1.4. Cấu hình camera cho Nondicom (dành cho giao thức HTTP)
- Truy cập: `chrome://flags` (Chrome) hoặc `edge://flags` (Edge)
- Tìm kiếm flag: **"Insecure origins treated as secure"**
- Nhập địa chỉ trang Non-dicom vào ô → Enabled
- Mục đích: Cho phép trình duyệt chấp nhận và cho phép sử dụng camera từ máy (địa chỉ HTTP không phải HTTPS)
- Flag thứ hai: **"Enable Zero-Copy Video Capture"** — Camera produces a gpu-friendly buffer at capture and, if there is hardware accelerated video encoder announced the buffer — Windows

---

### 2. Hệ thống NON-DICOM

#### 2.1. Bố cục giao diện Non-DICOM

Các chức năng bố cục giao diện:
1. Các chức năng lọc các ca chụp theo máy chụp
2. Danh sách Máy chụp
3. Các chức năng lọc theo trạng thái ca chụp: **chưa đọc, đang đọc, đọc xong, đang duyệt, duyệt xong** hoặc **tất cả trạng thái**
4. Các chức năng tìm kiếm ca chụp theo trạng thái: "**Danh sách ca chụp quá hạn**" và "**Trạng thái đồng bộ His**"
5. Các chức năng tìm kiếm ca chụp theo: "**Bác sĩ chỉ định**", "**Chỉ định**", "**Bộ phận chụp**", "**Kết luận**", "**Tên đoàn khám**", "**Mã hồ sơ**"
6. Tìm kiếm theo mốc thời gian
7. Các nút lệnh: "**Xóa lọc**", "**Làm mới**", "**Thêm bệnh nhân**", "**Cài đặt**", "**tùy chỉnh chế độ hiển thị (chế độ 1/chế độ 2)**"
8. Các chức năng: "**Đổi ngôn ngữ**", "**Đổi mật khẩu**", "**Quản lý mẫu kết quả**", "**Thống kê - báo cáo**", "**Thông tin phiên bản**", "**Đăng xuất**"
9. Tab danh sách "**Chờ**", "**Đã thực hiện**"
10. Danh sách bệnh nhân dưới dạng "**Chờ**"

#### 2.2. Chức năng hệ thống

##### 2.2.1. Lọc ca chụp theo thiết bị (máy chụp)
- **Danh sách Máy** (bên trái): chọn tất cả các máy vào bộ lọc
  - All
  - CT (thư mục)
    - DUCTEST
    - CT
    - CHIENTEST
  - BV Share
  - 21312
  - XQ 2
- **Chọn một nhóm**: chọn một nhóm máy vào bộ lọc (ví dụ: All, CT)
- **Chọn máy duy nhất**: chọn máy duy nhất vào bộ lọc (ví dụ: DUCTEST)
- Chú ý: chọn bằng cách **Click chuột trái**

##### 2.2.2. Lọc ca chụp theo trạng thái ca chụp

**5 trạng thái ca chụp:**

| Trạng thái | Màu hiển thị | Mô tả |
|---|---|---|
| Chưa đọc | Đỏ (icon) | Ca chụp chưa được đọc |
| Đang đọc | Vàng (icon) | Ca chụp đang trong quá trình đọc |
| Đọc xong | Xanh lá (icon) | Ca đã đọc, chưa duyệt |
| Đang duyệt | Xanh nhạt (icon) | Đang trong quá trình duyệt kết quả |
| Duyệt xong | Xanh đậm (icon) | Đã duyệt xong — hoàn tất |
| Tất cả | — | Hiển thị tất cả |

- Chọn trạng thái cho bộ lọc: Click vào checkbox
- Có thể chọn **một hoặc nhiều** trạng thái cùng lúc

##### 2.2.3. Tìm kiếm ca chụp theo: Bác sĩ chỉ định, Chỉ định, Bộ phận chụp, Kết luận, Tên đoàn khám, Mã hồ sơ
- **Bác sĩ chỉ định**: căn tìm (theo tên bác sĩ)
- **Chỉ định**: căn tìm (theo mã ICD)
- **Bộ phận chụp**: căn tìm (theo Protocol của máy chụp)
- **Kết luận**: (theo kết luận từ bác sĩ đọc kết quả)
- **Tên đoàn khám** và **Mã hồ sơ**

##### 2.2.4. Tìm kiếm ca chụp theo: mã, họ tên, ngày chụp
- Nhập mã hoặc họ tên bệnh nhân cần tìm
- Lựa chọn ngày chụp dịch vụ: **hôm nay, hôm qua, -3 ngày...**
- Lựa chọn ngày chụp cụ thể: từ thanh công cụ, có thể nhập trực tiếp từ bàn phím hoặc click chọn vào ô hiển thị ngày tháng
- Lựa chọn ngày cần tìm: click vào ngày bắt đầu và click chọn ngày kết thúc
- Nút **Hủy bỏ tìm kiếm** (xóa bộ lọc)
- Nút **Làm mới tìm kiếm** (reset danh sách)

##### 2.2.5. Chế độ hiển thị

**Chế độ 1: Chế độ hiển thị tùy chọn**
- Giao diện hiển thị của chế độ 1, tại chế độ này sẽ phù hợp với các thiết bị có kích thước lớn
- Layout: danh sách ca chụp + panel thông tin chi tiết bên phải + viewer ảnh

**Chế độ 2: Chế độ hiển thị mặc định**
- Giao diện mặc định khi đăng nhập
- Layout đơn giản hơn: chỉ danh sách + thông tin chi tiết

##### 2.2.6. Xem thông tin, lịch sử ca chụp
Từ danh sách ca chụp, nhấn ta click chọn vào ca chụp:

1. Thông tin ca chụp của BN tại danh sách
2. Thông tin chi tiết của ca chụp: thông tin BN, mô tả, kết luận
3. Lịch sử các ca chụp của bệnh nhân
4. **Các nút tính năng:**

| Nút | Chức năng |
|---|---|
| Gửi HIS | Gửi kết quả sang HIS |
| Cập nhật từ HIS | Cập nhật ca chụp từ HIS |
| Cho phép sửa KQ | Cho phép sửa kết quả |
| Thêm chỉ định | Thêm chỉ định |
| Hủy duyệt | Hủy duyệt |
| Làm sáng | Làm sáng |
| Cập nhật | Cập nhật ca chụp |
| Chú ký | Tắt/Bật in có chữ ký |
| In phiếu | In phiếu |
| In | In kết quả bệnh nhân |

##### 2.2.7. Đăng xuất
- Chọn vào biểu tượng nhân vật góc trên bên phải → chọn **Đăng xuất**
- Menu user: Admin / Đổi ngôn ngữ / Đổi mật khẩu / Quản lý mẫu kết quả / Thống kê - báo cáo / Thông tin phiên bản / Đăng xuất

##### 2.2.8. Tính năng chuột phải
Click chuột phải vào tên bệnh nhân, menu context xuất hiện:
- Yêu cầu hội chẩn
- Cập nhật
- Hủy phiếu
- Cập nhật ca chụp
- Cập nhật ca chụp từ HIS
- Thêm chỉ định
- Cập nhật thông tin lâm sàng
- Chuyển ca chụp
- Thêm vào Favorite
- Tải xuống ca chụp
- Xóa ca chụp
- Upload File/Pathology

##### 2.2.9. Đổi mật khẩu
- Bước 1: click vào biểu tượng hình nhân góc trên bên phải → menu xuất hiện
- Bước 2: click **Đổi mật khẩu**
- Form đổi mật khẩu:
  - Mật khẩu cũ
  - Mật khẩu mới
  - Nhập lại mật khẩu mới
  - Lưu ý: Mật khẩu có ít nhất 6 ký tự, 1 chữ hoa, 1 ký tự đặc biệt, 1 số
- Nút: **Lưu**

---

### 2.3. Quy trình thực hiện một ca bệnh và trả kết quả

#### Bước 1: Chọn bệnh nhân cần thực hiện → Click double vào tên của bệnh nhân

#### Bước 2: Màn hình hiện thị ra thông báo → Nhấn chọn **Nhận đọc**

**Dialog xác nhận thực hiện ca chụp:**
- Mã phiếu: VR-17
- Máy: BLADE
- Họ tên: TEST 1 - 22
- Chỉ định: X quang Tim phổi thẳng
- Nút: **Cập nhật** | **Nhận đọc** | **Hủy**

#### Bước 3: Cho phép trình duyệt truy cập camera
- Dialog: "http://localhost:7008 muốn Sử dụng máy ảnh của bạn"
- Nút: **Cho phép** | **Chặn**
- Hệ thống sẽ hiển thị hình ảnh được chuyển trực tiếp từ máy sang hệ thống

#### Bước 4: Thực hiện thao tác với hình ảnh
- Bác sĩ (hoặc KTV) thực hiện lấy **ảnh chụp** bằng cách nhấn vào nút tròn màu đỏ trong cửa sổ khung hình
- Có thể **"Crop"** theo tỉ lệ ảnh

**Thao tác với hình ảnh (Non-DICOM camera):**
- Sau khi chụp, hình ảnh sẽ được lưu trữ tại đây
- **Xóa ảnh**: chuột phải vào ảnh đánh số → Click chọn xóa (biểu tượng hình thùng rác)
- **In ảnh riêng**: chuột phải vào ảnh đánh số → Click chọn in (biểu tượng in bên phải thùng rác)
- **In ảnh nhiều**: chuột phải vào ảnh đánh số → Click chọn in (biểu tượng tải liệu bên phải thùng rác)
- **Copy ảnh**: Có thể copy trong ca chụp hoặc copy sang ca chụp khác
- **Upload file**: Upload ảnh hoặc các file hỗ trợ vào ca chụp

**Quay video:**
- Chọn dấu ba chấm bên cạnh video để thực hiện thao tác với video
- Hình ảnh khi thực hiện chụp sẽ được lưu trữ tại đây

#### Bước 5 (Quy trình 1 — Cho bác sĩ đọc và trả kết quả nhanh):
Form kết luận bao gồm các trường theo thứ tự:
1. Chọn danh sách chỉ định
2. Chọn tên kỹ thuật viên chụp
3. Chọn loại mẫu kết quả: Chi định (mặc định) hoặc cá nhân
4. Chọn mẫu kết quả
5. Chọn kết quả của các bác sĩ cùng đọc ca đó
6. Kỹ thuật thăm khám
7. Nội dung chẩn đoán
8. Kết luận
9. Đề nghị
10. Các thao tác trả kết quả:
    - **Duyệt bệnh nhân**
    - **Chọn ảnh và mẫu in ảnh**
    - **Hủy phiếu**

---

### Quy trình 2: Dùng cho hội chẩn trực tuyến

**Bước 1**: Bác sĩ yêu cầu mở một cuộc hội chẩn trực tuyến
- Sau khi bác sĩ thực hiện mở một ca khó mà cần hội chẩn với một bác sĩ khác, ta thực hiện theo như sau

**Bước 2**: Bác sĩ tham gia hội chẩn
- Bác sĩ tham gia hội chẩn có thể thấy ca hội chẩn bằng cách đăng nhập vào hệ thống RIS → Tìm kiếm tên bệnh nhân → Chọn **"Live"**

**Các trạng thái hội chẩn trực tuyến:**
| Biểu tượng | Trạng thái |
|---|---|
| Live (chữ đỏ) | Bắt đầu hội chẩn |
| (biểu tượng sóng) | Đang thực hiện cuộc hội chẩn |
| (biểu tượng check) | Thực hiện xong cuộc hội chẩn |

**Chú ý**: Bác sĩ chỉ vào được phòng hội chẩn khi ca đang ở **trạng thái bắt đầu hội chẩn**

**Bước 3**: Trả kết quả
- Hệ thống sẽ hiển thị Form kết luận: Làm lần lượt theo số thứ tự như trong ảnh
  1. Chọn danh sách chỉ định
  2. Chọn tên kỹ thuật viên chụp
  3. Chọn loại mẫu kết quả: Chi định (mặc định) hoặc cá nhân
  4. Chọn mẫu kết quả
  5. Chọn kết quả của các bác sĩ cùng đọc ca đó
  6. Kỹ thuật thăm khám
  7. Nội dung chẩn đoán
  8. Kết luận
  9. Đề nghị
  10. Các thao tác trả kết quả:
      - Duyệt bệnh nhân
      - Chọn ảnh và mẫu in ảnh
      - Hủy phiếu

---

## Part 2: RIS DICOM

### Mục lục DICOM (tổng quan)
1. Bộ lọc và tìm kiếm
2. Đổi mật khẩu
3. Đổi ngôn ngữ
4. Đăng ký chữ ký số
5. Quản lý mẫu kết quả
   - 5.1 Đăng nhập hệ thống
   - 5.2 Tìm kiếm-Thêm-Sửa-Xóa cho Mẫu Kết Quả
6. Báo cáo thống kê
7. Đăng xuất tài khoản
8. Trả kết quả
9. Quy trình trả kết quả
10. Xử lý đồng bộ HIS
    - 10.1 Cập nhật ca chụp từ His
    - 10.2 Gửi kết quả sang His
11. Tải ảnh
    - 11.1 Tải ảnh của bệnh nhân, tải chuẩn DICOM, tải chuẩn JPEG
    - 11.2 Tải toàn bộ danh sách
12. Quy trình hủy kết quả
13. Xóa ca chụp
14. Các chế độ chia màn hình trong VRPACS
    - 14.1 Chia màn hình Tổng hợp
    - 14.2 Chế độ chia 2 màn hình
15. Thêm bệnh nhân
16. Chia sẻ ca chụp
17. Xem lịch sử khám
18. Cập nhật thông tin lâm sàng
19. Thêm chỉ định

---

### 1. BỘ LỌC VÀ TÌM KIẾM

**Giao diện Worklist DICOM — các thành phần:**

| Số | Thành phần | Mô tả |
|---|---|---|
| (1) | Tổng số ca chụp | Counter hiển thị tổng số ca trong danh sách |
| (2) | Danh sách Máy chụp | Panel bên trái chọn máy/modality |
| (3) | Trạng thái ca chụp | Bộ lọc theo trạng thái |
| (4) | Thông tin ca chụp | Chi tiết ca chụp đang chọn |
| (5) | Tìm kiếm Mã bệnh nhân | Ô search theo mã BN |
| (6) | Tìm kiếm Họ tên bệnh nhân | Ô search theo họ tên |
| (7) | Tìm kiếm theo ngày tháng năm | Bộ lọc thời gian |
| (8) | Tìm kiếm chi tiết | Tìm kiếm nâng cao |

**Worklist columns (bảng danh sách ca):**
- Checkbox chọn
- ## (số thứ tự)
- Thời gian chụp
- Máy chụp
- Mã
- Họ tên
- Tuổi
- Giới tính
- Trạng thái (màu icon)
- Thông tin khám

---

### 2. ĐỔI MẬT KHẨU

**Bước 1**: Click vào biểu tượng hình nhân góc bên phải màn hình
**Bước 2**: Click vào **Đổi mật khẩu**

**Form đổi mật khẩu:**
- Mật khẩu cũ
- Mật khẩu mới
- Nhập lại mật khẩu mới
- Lưu ý: Mật khẩu có ít nhất 6 ký tự, 1 chữ hoa, 1 ký tự đặc biệt, 1 số
- Nút: **Save**

---

### 3. ĐỔI NGÔN NGỮ

**B1**: Click vào biểu tượng hình nhân
**B2**: Click chọn "Đổi ngôn ngữ"

Menu user hiển thị:
- Dr. Admin
- Đổi ngôn ngữ
- Đổi mật khẩu
- Đăng ký chữ ký số
- Quản lý mẫu kết quả
- Quản lý mẫu cam kết
- Thống kê - báo cáo
- Hướng dẫn sử dụng
- Đăng xuất

---

### 4. ĐĂNG KÝ CHỮ KÝ SỐ

**B1**: Click vào biểu tượng hình nhân
**B2**: Click "Đăng ký chữ ký số"
**B3**: Điền thông tin rồi chọn "Đăng ký"

**Form Đăng ký chữ ký số:**
- AppId: [ô nhập]
- Secret: [ô nhập]
- Nút: **Đăng ký** | **Thay đổi**

---

### 5. QUẢN LÝ MẪU KẾT QUẢ

#### 5.1 Đăng nhập hệ thống

**B1**: Click chuột trái vào Thông tin tài khoản
**B2**: Clink chọn mục "Quản lý mẫu kết quả"

**Tại trang Quản lý mẫu kết quả sẽ hiện thị:**
1. Nhập "**Từ khóa**"
2. Chọn "**Chọn dịch vụ**"
3. Chọn **Tìm kiếm**
4. Thêm mới **Mẫu kết quả**
5. Danh sách các **mẫu kết quả** được gắn theo tài khoản

#### 5.2.1 Tìm kiếm

**Tìm kiếm theo từ khóa:**
- **B1**: Nhập từ khóa cần tìm
- **B2**: Click chọn mục **Tìm kiếm**
- Sau đó danh sách sẽ hiển thị các thông tin lọc được

**Tìm kiếm theo dịch vụ:**
- **B1**: Chọn 1 trong danh sách các dịch vụ có sẵn
- **B2**: Clink chọn **tìm kiếm**
- Sau đó danh sách sẽ hiển thị các thông tin lọc được

#### 5.2.2 Thêm mới

**B1**: Chọn mục **Thêm mới**
- Sau đó sẽ hiển thị form thông tin để thêm mới:

**Form thêm mẫu kết quả:**
1. Nhập **tên mẫu kết quả**
2. Chọn **1 loại dịch vụ** có sẵn (chú ý: mũi tên cuộn xuống trong phần ô vuông)
3. Nhập **Kỹ thuật**
4. Nhập **Mô tả**
5. Nhập **Kết quả**
6. Click chọn **"Thêm mới"**

**Editor text (Rich Text Editor)** cho Mô tả/Kết quả:
- Toolbar: AI ▼ | **B** *I* U | Paragraph ▼ | link | danh sách | căn lề | thêm
- Hỗ trợ định dạng: Bold, Italic, Underline, Paragraph, danh sách, căn lề

#### 5.2.3 Sửa mẫu kết quả

**B1**: Chọn vào phần đã được đánh dấu đầu như ảnh dưới (click vào row mẫu)
- Sau đó sẽ xuất hiện form thông tin

**B2**: Chỉnh sửa theo mong muốn
- Form hiển thị: Tiêu đề + editor + các trường đã có

**B3**: Click chọn **"Lưu lại"** để lưu các thông tin đã thay đổi

#### 5.2.4 Xóa mẫu kết quả

**B1**: Chọn mẫu cần xóa
**B2**: Sau đó hiển thị thông báo
- Chọn **"OK"** để xác nhận xóa
- Chọn **"Cancel"** để không xóa

---

### 6. BÁO CÁO THỐNG KÊ

**B1**: Click vào biểu tượng hình nhân
**B2**: Click chọn "**Thống kê báo cáo**"

**Bộ lọc Search (bên trái):**
- Cột thời gian
- Chi nhánh
- Nhóm dịch vụ
- Vị trí thực hiện
- Chẩn đoán
- Bác sĩ duyệt
- Kỹ thuật viên
- Dịch vụ ICD
- Tình trạng
- Loại đối tượng
- Ca chụp quá hạn

**Bảng Thống Kê (bên phải):**
- Thống kê chung
- Thống kê bác sĩ
- Thống kê KTV
- Thống kê theo thời gian
- Thống kê chi tiết

**Xuất dữ liệu:** Xuất Excel, in phiếu

---

### 7. ĐĂNG XUẤT TÀI KHOẢN

**B1**: Click vào biểu tượng hình nhân
**B2**: Click chọn "**Đăng xuất**"

---

### 8. TRẢ KẾT QUẢ

**Cách 1**: Click chuột phải vào bệnh nhân cần trả kết quả → chọn **"Nhận đọc"**

**Context menu chuột phải gồm:**
- Mở ca chụp
- Nhận đọc
- Hủy phiếu
- Cho phép sửa kết quả
- Tham khảo DrAid™ AI
- Cập nhật ca chụp
- Cập nhật ca chụp từ HIS
- Thêm chỉ định
- Ghi chú
- Đính kèm File/Pathology
- Chia sẻ ca chụp
- Gửi ca chụp
- Chuyển ca chụp
- Thêm vào Favorite
- Tải xuống ca chụp
- Xóa ca chụp

**Cách 2**: Click chuột phải vào bệnh nhân cần trả kết quả → chọn **"Mở ca chụp"**
- Click vào biểu tượng [đọc kết quả] để đọc kết quả

---

### 9. QUY TRÌNH TRẢ KẾT QUẢ (DICOM)

Sau khi chọn một trong hai cách trên, hệ thống sẽ hiển thị Form kết luận như sau:
**Làm lần lượt theo số thứ tự như trong ảnh:**

1. Chọn danh sách chỉ định
2. Chọn tên kỹ thuật viên chụp
3. Chọn loại mẫu kết quả: **Chi định** (mặc định) hoặc **Cá nhân**
4. Chọn mẫu kết quả
5. Chọn kết quả của các bác sĩ cùng đọc ca đó
6. Kỹ thuật thăm khám
7. Nội dung chẩn đoán
8. Kết luận
9. Đề nghị
10. Các thao tác trả kết quả:
    - **Duyệt bệnh nhân**
    - **Chọn ảnh và mẫu in ảnh**
    - **Hủy phiếu**

**Form trả kết quả — chi tiết UI:**
```
[Tên bệnh nhân] - [Chỉ định] (...)           x

[1] Đang đọc  [ ] Đọc xong  [ ] Đang hội chẩn x  [ ] Hội chẩn x  [ ] Đang duyệt  [ ] Duyệt xong

[2] Danh sách chỉ định     [3] Kỹ thuật viên
    Chọn chỉ định ▼            Chọn kỹ thuật viên ▼

[4] Chọn vật tư                              ^
    Mẫu kết quả: [x] Chi định  [x] Cá nhân
    Chọn mẫu ▼            Kết quả lấy từ đọc khác ▼

[6] Kỹ thuật thăm khám
[text area]

[7] Chẩn đoán:

[8] Mô tả hình ảnh
AI ▼ B I U Paragraph ▼ [...]
[rich text editor area]

[9] Kết luận
[text area]

[10] Khuyến nghị
[text area]

[Chọn ảnh]  [Lưu (đọc)]  [Đọc xong]  [Duyệt]  [Hủy phiếu]
```

**Status bar trên cùng của form:**
- Đang đọc → Đọc xong → Đang hội chẩn x → Hội chẩn x → Đang duyệt → Duyệt xong

**Sau khi điền đủ thông tin người dùng chọn Duyệt → in phiếu (in thường hoặc in gọn):**

Thanh hành động sau duyệt:
- Sửa (chuyển) | Ký số | In | In Gọn | Copy kết quả | Cóp kết quả | Hủy duyệt

---

### 10. XỬ LÝ ĐỒNG BỘ HIS

#### 10.1 Cập nhật ca chụp từ His

**B1**: Click chuột phải vào bệnh nhân → chọn **cập nhật ca chụp từ His**

**Context menu (DICOM):**
- Mở ca chụp
- Nhận đọc
- Hủy phiếu
- Cho phép sửa kết quả
- Tham khảo DrAid™ AI
- Cập nhật ca chụp
- **Cập nhật ca chụp từ HIS** ← (highlighted)
- Thêm chỉ định
- Ghi chú
- Đính kèm File/Pathology
- Chia sẻ ca chụp
- Gửi ca chụp
- Chuyển ca chụp
- Thêm vào Favorite
- Tải xuống ca chụp
- Xóa ca chụp

#### 10.2 Gửi kết quả sang His

**Trên form trả kết quả:**
- Button bar: **Duyệt kết quả** | Hủy duyệt | **Gửi kết quả sang HIS** | In có chữ ký | In | Thêm chỉ định | Thêm mẫu kết

**Sample gửi sang HIS:**
```
Chỉ định:    Chụp Xquang răng toàn cảnh
Kỹ thuật:    PANOREX
Mô tả:       Hình ảnh mất lên tục XHD vùng cẩm
             Hình ảnh mất lên tục XHD CỐ LỒI CẦU (T)
Kết luận:    GÃY XHD VÙNG CẨM + CỔ LỒI CẦU (T)
Khuyến nghị:
             06:57 12/04/2022
             Bác sĩ
             Phạm Văn Minh
[Phạm Văn Minh]  lc 06:57 12/04/2022
```

---

### 11. TẢI ẢNH

#### 11.1 Tải ảnh của bệnh nhân, tải chuẩn DICOM, tải chuẩn JPEG

**B1**: click chuột phải vào bệnh nhân cần tải ảnh → chọn **"Tải xuống ca chụp"**

**Dialog "Tải xuống ca chụp":**
```
[x] Mã hóa thông tin    [x] Ảnh JPG kèm thông tin

[Tải chuẩn Dicom]  [Tải ảnh của bệnh nhân]  [Tải chuẩn JPEG]
```

**Worklist columns hiển thị khi tải:**
- ##, Thời gian chụp, Máy chụp, Mã, Họ tên, Tuổi, Giới tính, Trạng thái

#### 11.2 Tải toàn bộ danh sách

**B1**: Click chuột trái vào biểu tượng bánh răng cưa → Chọn **Tải toàn bộ danh sách**

**Menu bánh răng cưa (settings):**
- Loại màn: Ngang
- Màn hình: Một
- Tổng hợp: Đơn
- Giải mã tải về: Không / Không / Không
- In toàn bộ danh sách
- Duyệt toàn bộ danh sách
- Thêm bệnh nhân
- **Tải toàn bộ danh sách**
- Chọn Modality

**B2**: Chọn tải ảnh (chọn tích xanh để mã hóa thông tin)
```
Tải danh sách chỉ định

[x] Mã hóa thông tin    [x] Ảnh JPG kèm thông tin

[Tải chuẩn JPEG]    [Tải chuẩn DICOM]    [Trở lại]
```

---

### 12. QUY TRÌNH HỦY KẾT QUẢ
**Dùng trong trường hợp (Bệnh nhân đã chụp và gửi hình ảnh lên PACS)**

**B1**: Hủy duyệt kết quả trên PACS
- Click chuột phải vào bệnh nhân rồi chọn **"Hủy duyệt"**
- Hoặc click chuột vào "Hủy duyệt"

**B2**: Hủy duyệt trên HIS
**B3**: Thông báo cho Bác sĩ đọc lại kết quả

---

### 13. XÓA CA CHỤP

**Lưu ý**: Chức năng "Xóa ca chụp" áp dụng cho ca chụp ở trạng thái **"Chưa đọc"**, nếu ca chụp đang ở trạng thái khác hãy hủy về trạng thái chưa đọc.

**B1**: Click chuột phải vào ca chụp cần xóa
**B2**: Chọn **"Xóa ca chụp"**

---

### 14. CÁC CHẾ ĐỘ CHIA MÀN HÌNH TRONG VRPACS

#### 14.1 Chia màn hình Tổng hợp

Chế độ này cho phép hiển thị giao diện **Worklist** và giao diện **Viewer** hiển thị trên cùng 1 cửa sổ giao diện.

**Chọn Tổng hợp** để chuyển sang chế độ chia màn hình:
**B1**: Chọn mục **Cài đặt**
**B2**: Tại mục **Tổng hợp** đang ở chế độ **Đơn** → chuyển sang chế độ **Tổng hợp**

**Menu Cài đặt (bánh răng):**
- Loại màn: **Ngang** (button)
- Màn hình: **Một** (button)
- Tổng hợp: **Đơn** → **Tổng hợp**
- Giải mã tải về: Không / Không / Không
- In toàn bộ danh sách
- Duyệt toàn bộ danh sách
- Thêm bệnh nhân
- Tải toàn bộ danh sách
- Chọn Modality

**Giao diện Tổng hợp — 3 khu vực:**
1. Danh sách bệnh nhân (Worklist — bên trái)
2. Phần đọc-tra kết quả bệnh nhân (giữa)
3. View ảnh bệnh nhân (phải)

Clink chuột trái vào bệnh nhân để mở ảnh bệnh nhân bên phải.

**Lưu ý**: Khi chọn cấu hình **Tổng hợp** ta không thể chọn các chế độ **Loại Màn**, **Màn Hình**.

#### 14.2 Chế độ chia 2 màn hình

Chế độ này cho phép hiển thị giao diện **worklist** và giao diện **Viewer** hiển thị trên 2 màn hình khác nhau.

**Để bật được chế độ 2 màn hình cần có 2 màn hình được kết nối vào cùng 1 CPU.**
Sau khi kết nối cần thực hiện các bước cài đặt sau:

**Bước 1**: Ấn tổ hợp phím **Windows + P**
**Bước 2**: Chọn **Extend**

**Bước 3**: Click vào **Màn hình** để chuyển sang chế độ 2 màn hình
**B1**: Chọn mục **Cài đặt**
**B2**: Tại mục **Màn hình** đang ở chế độ **Đơn** → chuyển sang chế độ **2 màn hình**

**Chế độ 2 màn hình sẽ hiển thị như sau:**
- **Màn hình 1**: Worklist (danh sách bệnh nhân)
- **Màn hình 2**: Viewer (xem ảnh)

**Bước 4**: Mở và xem ảnh
**Note**: Mở ảnh sau đó kéo sang màn hình thứ 2. Chỉ cần mở ảnh của bệnh nhân tiếp theo để xem ảnh (không cần tắt cửa sổ viewer ảnh).

#### 14.3 Chế độ chia bổ cục ngang-dọc

Cách mở màn hình ngang:
**B1**: Chọn **Loại màn: Ngang** (trong menu cài đặt)

**Giao diện bổ cục ngang sẽ là:**
1. Danh sách bệnh nhân (Worklist)
2. Thông tin hành chính của bệnh nhân
3. Phần Đọc-Tra kết quả cho bệnh nhân
4. Lịch sử khám của bệnh nhân

**Ở loại màn hình đọc:**
(hiển thị cả 4 khu vực trên theo layout ngang)

---

### 15. THÊM BỆNH NHÂN

**B1**: Click vào biểu tượng bánh răng cưa
**B2**: chọn "**Thêm bệnh nhân**"

**Form THÊM CA CHỤP:**
```
Thêm mới: [x]
Mã:        [ô nhập]
Họ tên:    [ô nhập]          Tuổi:    [ô]    Giới tính: [ô]
Bkhoa:     [ô]   Địa chỉ:   [ô]              Điện thoại: [ô]
Bộ phận chụp: [ô]   Chẩn đoán ban đầu: [ô]
Khoa chỉ định: [ô]                        Bác sỹ chỉ định: [ô]
Buồng:     [ô]   Giường:    [ô]           Tên chỉ định:    [ô]
Máy chụp:  [ô]

                                                          [+ Create]
```

**B3**: Điền thông tin rồi chọn **"Create"**

---

### 16. CHIA SẺ CA CHỤP

**B1**: Chọn **"Chia sẻ"** (tab trong header của ca chụp)

Tab bar của ca chụp:
`Thông tin | Cập nhật | In phiếu | Thêm chỉ định | Cập nhật ca chụp từ HIS | Chia sẻ | Lịch sử | Lâm sàng`

**B2**: chọn thời gian và mật khẩu → **Tạo liên kết**

**Dialog Chia sẻ ca chụp:**
```
Chia sẻ theo: (•) Khoảng thời gian (phút)
              ( ) Mốc thời gian

[30 phút]  [120 phút]  [1 ngày]  [7 ngày]

Thời gian (phút):  120          [icon]

Mật khẩu:         [ô nhập]

                              [Tạo liên kết]
```

**Kết quả tạo liên kết:**
```
[QR Code image]                     [copy icon]

URL:    http://telerad.vn:1234/?auth=3zTRPmKyHX06dHIXBtnmdT0sd8RD+TZ
        vw4MQF6lyQu/&parameters=MlMFQHDjlwMTUSODUmNjM4MTI2ODI0MzIoMTY2NTY4&lim
        e=V2VkIE2YiAyMDIzIDEzOjA1CjE0IEdN      [copy icon]

Mật khẩu:                                       [copy icon]
```

---

### 17. XEM LỊCH SỬ KHÁM

**Chọn "lịch sử"** (tab trong header)

**Lịch sử khám bao gồm 2 tab:**
- **Tả hồ sơ bệnh nhân**: Lịch sử toàn bộ bệnh nhân
- **Tả hồ sơ ca chụp**: Chi tiết ca chụp hiện tại

**Hiển thị dạng timeline:**
```
v 26/03/2022  Chụp Xquang Blondeau  [Tả hồ sơ ca chụp]
  Mô tả:
  Kết luận:                                    [ảnh ký]
  Hình ảnh:
  Chi tiết.

v 26/03/2022  Chụp Xquang Hirtz  [Tả hồ sơ ca chụp]
  Mô tả:
  Kết luận:                                    [ảnh ký]
  Hình ảnh:
  Chi tiết.

v 26/03/022  [Tả hồ sơ ca chụp]
  Mô tả:
  Kết luận:                                    [ảnh ký]
  Hình ảnh:
```

---

### 18. CẬP NHẬT THÔNG TIN LÂM SÀNG

**B1**: Chọn **"cập nhật"** (tab trong header)

Header tabs: `Thông tin | Cập nhật | In phiếu | Thêm chỉ định | Cập nhật ca chụp từ HIS | Chia sẻ | Lịch sử | Lâm sàng`

**Thông tin bệnh nhân hiển thị trong tab Thông tin:**
```
Họ tên:    [tên bệnh nhân]          Tuổi: 48    Giới tinh: Nữ
Mã bệnh nhân: 22015985              Mã khám sức khỏe:
Email:                              SĐT:
Địa chỉ:   [địa chỉ]

Chẩn đoán:                          Bác sỹ: Hứa Kim Thư
Chỉ định:  Chụp Xquang Blondeau
Khoa:      Cấp Cứu                  Mã lần khám: [mã]
KTV/ĐDV/Thư ký: [tên]
```

**B2**: Thêm thông tin rồi chọn **"Lưu"**

**Form "Cập nhật ca chụp" — các trường:**

| Trường thông tin | Thông tin hiện tại | Thông tin cập nhật |
|---|---|---|
| Mã | 22015985 | 22015985 [Thêm mới] |
| Họ tên | [tên] | [ô nhập] |
| Tuổi | 48 | 48 |
| Giới tính | F | F |
| Địa chỉ | [địa chỉ] | [ô nhập] |
| Số điện thoại | — | [ô nhập] |
| BHXH | — | [ô nhập] |
| Chẩn đoán ban đầu | — | [ô nhập] |
| Bộ phận chụp | — | [ô nhập] |
| Khoa chỉ định | Cấp Cứu | Cấp Cứu |
| Bác sỹ chỉ định | [tên] | [ô nhập] |
| Buồng | Khoa Cấp Cứu | Khoa Cấp Cứu |
| Giường | — | [ô nhập] |
| Yêu cầu chụp | Chụp Xquang Blondeau | [ô nhập] |

Nút: **[Lưu]**

---

### 19. THÊM CHỈ ĐỊNH

**B1**: Chọn **"Thêm chỉ định"** (tab trong header)
**B2**: điền tên chỉ định rồi **"Thêm mới"**

**Dialog Thêm chỉ định:**
```
Thêm chỉ định                                    x

Không tìm thấy chỉ định, tạo chỉ định mới?

Tên chỉ định:   [ô nhập tên chỉ định]

[Thêm mới]
```

---

## Tổng hợp: Mapping trạng thái ca chụp (Non-DICOM & DICOM)

### Trạng thái ca chụp — 5 bước workflow

| Trạng thái | Giá trị | Màu | Mô tả nghiệp vụ |
|---|---|---|---|
| Chưa đọc | CHUA_DOC | Đỏ | Ca mới từ HIS/worklist, chưa ai nhận đọc |
| Đang đọc | DANG_DOC | Vàng/Cam | KTV/Bác sĩ đã nhận đọc, đang nhập liệu |
| Đọc xong | DOC_XONG | Xanh lá nhạt | Đã hoàn thành nhập liệu, chưa duyệt |
| Đang duyệt | DANG_DUYET | Xanh nhạt | Bác sĩ cấp cao đang xem xét duyệt |
| Duyệt xong | DUYET_XONG | Xanh đậm | Đã duyệt — kết quả chính thức, có thể gửi HIS |
| Tất cả | ALL | — | Filter không theo trạng thái |

### Luồng trạng thái

```
[HIS tạo chỉ định] 
    → Chưa đọc
    → (KTV nhận đọc) → Đang đọc
    → (KTV lưu kết quả) → Đọc xong
    → (BS duyệt) → Đang duyệt
    → (BS xác nhận) → Duyệt xong
    → (Gửi HIS) → HIS nhận kết quả
```

### HIS Sync — Đồng bộ 2 chiều

**RIS ← HIS (Cập nhật ca chụp từ HIS):**
- Khi có thay đổi thông tin chỉ định trên HIS
- Cách 1: Click chuột phải → "Cập nhật ca chụp từ HIS"
- Cách 2: Button trong header ca chụp: "Cập nhật ca chụp từ HIS"
- Nhập mã chỉ định → Tìm kiếm → Cập nhật

**RIS → HIS (Gửi kết quả sang HIS):**
- Khi bác sĩ duyệt kết quả xong
- Button: "Gửi kết quả sang HIS" (hoặc "Gửi HIS")
- Kết quả gồm: Chỉ định + Kỹ thuật + Mô tả + Kết luận + Khuyến nghị + Timestamp + Chữ ký bác sĩ

### Thông tin ca chụp — Data Model

**Patient/Study fields:**
- Họ tên
- Mã bệnh nhân
- Tuổi
- Giới tính
- Email
- Địa chỉ
- SĐT
- BHXH
- Mã khám sức khỏe
- Mã lần khám

**Study/Order fields:**
- Mã phiếu (VR-xxx)
- Máy chụp (Modality)
- Chẩn đoán ban đầu
- Chỉ định (tên dịch vụ)
- Khoa chỉ định
- Bác sỹ chỉ định
- Bộ phận chụp
- Buồng
- Giường
- Yêu cầu chụp
- Thời gian chụp
- KTV/ĐDV/Thư ký

**Result fields:**
- Danh sách chỉ định (có thể nhiều)
- Kỹ thuật viên chụp
- Loại mẫu kết quả: Chi định | Cá nhân
- Mẫu kết quả (template)
- Kỹ thuật thăm khám
- Chẩn đoán
- Mô tả hình ảnh (rich text)
- Kết luận
- Khuyến nghị/Đề nghị
- Timestamp duyệt
- Bác sĩ duyệt (chữ ký số)

### Tính năng đặc biệt

**DrAid™ AI Integration:**
- Menu chuột phải: "Tham khảo DrAid™ AI"
- Hỗ trợ đọc ảnh AI cho ca chụp

**Chữ ký số:**
- Đăng ký: AppId + Secret
- Bật/Tắt in có chữ ký (button "Chú ký" trong Non-DICOM)
- In phiếu kết quả có chữ ký số

**Chia sẻ ca chụp:**
- Tạo link chia sẻ với thời hạn (30 phút / 120 phút / 1 ngày / 7 ngày / tùy chỉnh phút)
- Bảo vệ bằng mật khẩu (tùy chọn)
- Tạo QR Code tự động
- URL có token auth và parameters mã hóa

**Tải ảnh:**
- Tải chuẩn DICOM (file .dcm có thể mã hóa thông tin)
- Tải ảnh của bệnh nhân (ảnh gốc)
- Tải chuẩn JPEG (có thể kèm thông tin)
- Tải toàn bộ danh sách (batch download)
- Tùy chọn: Mã hóa thông tin + Ảnh JPG kèm thông tin

**Hội chẩn trực tuyến (Non-DICOM):**
- Bác sĩ yêu cầu mở cuộc hội chẩn
- Bác sĩ khác tham gia qua đăng nhập hệ thống → tìm BN → chọn "Live"
- 3 trạng thái: Live (bắt đầu) / Đang thực hiện / Xong

**Upload File/Pathology:**
- Đính kèm file bổ sung vào ca chụp (từ context menu)

**Favorite:**
- Thêm ca chụp vào danh sách Favorite để theo dõi nhanh

### Permissions — Menu user (DICOM)

| Mục menu | Quyền/Chức năng |
|---|---|
| Đổi ngôn ngữ | Thay đổi ngôn ngữ UI |
| Đổi mật khẩu | Tự đổi mật khẩu cá nhân |
| Đăng ký chữ ký số | Đăng ký AppId + Secret cho chữ ký số |
| Quản lý mẫu kết quả | CRUD mẫu kết quả (template) theo dịch vụ |
| Quản lý mẫu cam kết | Quản lý mẫu cam kết bệnh nhân |
| Thống kê - báo cáo | Xem báo cáo thống kê |
| Hướng dẫn sử dụng | Tài liệu hướng dẫn |
| Đăng xuất | Đăng xuất khỏi hệ thống |

### Báo cáo thống kê — Chi tiết bộ lọc

**Search filters:**
- Cột thời gian (date range)
- Chi nhánh
- Nhóm dịch vụ
- Vị trí thực hiện
- Chẩn đoán
- Bác sĩ duyệt
- Kỹ thuật viên
- Dịch vụ ICD
- Tình trạng
- Loại đối tượng
- Ca chụp quá hạn

**Tabs thống kê:**
- Thống kê chung
- Thống kê bác sĩ
- Thống kê KTV
- Thống kê theo thời gian
- Thống kê chi tiết

**Export:** Xuất Excel, in phiếu

### Non-DICOM — Chế độ camera (iVCam integration)

**Yêu cầu:** Phần mềm **iVCam** chạy trên máy
- Dialog: "Please run iVCam" khi camera chưa kết nối
- Khi kết nối thành công: hiển thị live feed từ camera

**Các thao tác camera:**
- Chụp ảnh: nhấn nút tròn đỏ
- Crop ảnh: chọn tỉ lệ crop
- Quay video: nút record (dấu ba chấm bên cạnh)
- Xóa ảnh: chuột phải → xóa
- In ảnh riêng lẻ: chuột phải → in (in biểu tượng riêng)
- In nhiều ảnh: chuột phải → in (biểu tượng tài liệu)
- Copy ảnh: trong ca chụp hoặc sang ca khác
- Upload file bổ sung

**Lưu trữ:** Hình ảnh khi thực hiện chụp sẽ được lưu trữ tại đây (thumbnail gallery)

**Một số thao tác với màn hình:**
- Mở toàn màn hình
- Xóa video
- Tải xuống
