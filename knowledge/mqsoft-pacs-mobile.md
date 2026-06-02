# VRPACS — Mobile App (iOS/Android)
> Source: HDSD_MOBILE-v2.pdf (58 pages)
> Extracted: 2026-06-01
> Version: V.2.0.1
> Vendor: Công ty Cổ phần Công nghệ C+, Số 1, ngõ 31, đường 18M, Phường Mộ Lao, Quận Hà Đông, Hà Nội
> Tel: (+84) 982.603.805 | Email: contact@vrpacs.com

---

## Mục lục (Table of Contents)

```
I.   Đăng nhập hệ thống
  1.1  Lựa chọn trình duyệt
  1.2  Nhập địa chỉ hệ thống PACS
  1.3  Nhập thông tin tài khoản, mật khẩu đăng nhập

II.  Hệ thống RIS
  2.1  Bố cục giao diện
       Giao diện ban đầu khi truy cập
  2.2  Chức năng hệ thống
    2.2.1   Bộ lọc theo từng chi nhánh, cơ sở, dịch vụ và vị trí thực hiện
    2.2.2   Lọc ca chụp theo thiết bị (máy) chụp
    2.2.3   Lọc ca chụp theo trạng thái ca chụp
    2.2.5   Tìm kiếm ca chụp theo: chỉ định chụp, bộ phận chụp, kết luận bệnh
    2.2.6   Tìm kiếm ca chụp theo: mã, họ tên, ngày chụp
    2.2.7   Đăng xuất
    2.2.8   Đổi mật khẩu
    2.2.9   Mở hình ảnh
    2.2.10  Trả kết quả
    2.2.11  Trả kết quả via ảnh
    2.2.12  Sửa thông tin bệnh nhân
    2.2.13  Cập nhật thông tin ca chụp từ HIS
    2.2.14  Gửi kết quả sang HIS
    2.2.15  Cập nhật thông tin lâm sàng ca chụp
    2.2.16  Thêm vào Favorite
    2.2.17  Chia sẻ ca chụp
    2.2.18  Đính kèm thêm ảnh
    2.2.19  Xóa ca chụp
    2.2.20  Tải hình ảnh DICOM của ca chụp
    2.2.21  Tải hình ảnh DICOM của bệnh nhân
    2.2.22  Tải hình ảnh JPEG của ca chụp

III. Hệ thống PACS
  3.1  Bố cục giao diện hình ảnh
  3.2  Hiển thị danh sách series ảnh
  3.3  Chọn và xem ảnh
  3.4  Các chức năng thao tác với hình ảnh trên thanh công cụ
    3.4.1  Các tools cơ bản
    3.4.2  Chức năng xem lịch sử hình ảnh
    3.4.3  Chức năng hiệu chỉnh layout
    3.4.4  Các tools trong ứng dụng
    3.4.5  Chức năng dựng MPR
    3.4.7  Chức năng chia sẻ ca chụp
    3.4.8  Chức năng Next and Previous Series và hình ảnh trong Series
```

---

## I. Đăng Nhập Hệ Thống

### 1.1. Lựa Chọn Trình Duyệt

VRPACS Mobile chạy trên trình duyệt web của thiết bị di động (không cần cài app riêng):

- **iPhone (iOS)**: Mở trình duyệt **Safari** (icon la bàn trên màn hình chính)
- **Android**: Mở trình duyệt **Chrome** (Google Chrome)

> Ứng dụng là web app chạy trên browser — không phải native app cài từ App Store / Google Play

### 1.2. Nhập Địa Chỉ Hệ Thống PACS

- **iPhone**: Nhập URL vào thanh địa chỉ Safari (ô "Search or enter website name")
- **Android**: Nhập URL vào thanh địa chỉ Chrome ("Search or type web address")

### 1.3. Nhập Thông Tin Tài Khoản, Mật Khẩu Đăng Nhập

**Màn hình Login — "CLOUD PACS":**

```
┌─────────────────────────────────┐
│           [LOGO]                │
│         CLOUD PACS              │
│                                 │
│  [👤] Nhập tài khoản            │
│  [🔒] Nhập mật khẩu            │
│                                 │
│         [  LOGIN  ]             │
│                                 │
│  Quên Tài khoản / Mật khẩu?    │
│  📞 Hỗ trợ kỹ thuật:           │
│     0982.603.805 - 0906.182.284 │
└─────────────────────────────────┘
```

**Các trường:**
- Nhập tài khoản (username)
- Nhập mật khẩu (password)
- Nút **LOGIN** (nền tím/magenta)
- Link "Quên Tài khoản / Mật khẩu?" kèm số hotline hỗ trợ kỹ thuật

**Nền màn hình:** Tối (dark theme)
**Logo:** Hình tròn xanh dương + chấm đỏ ở giữa (logo VRPACS)

---

## II. Hệ Thống RIS

### 2.1. Bố Cục Giao Diện

#### Giao Diện Ban Đầu Khi Truy Cập

Khi mở app lần đầu, hệ thống hiển thị **menu lọc bên trái** với overlay "**Nhấn để về giao diện chính**".

**Bố cục giao diện chính (RIS Worklist) gồm 4 vùng:**

```
┌──────────────────────────────────────────────────┐
│ [🔵LOGO] [Mã bệnh nhân] [Họ tên bệnh nhân]  [≡] │  ← Thanh tìm kiếm
│ [Hôm nay][Hôm qua][-7 ngày][-30 ngày][Tất cả]   │  ← Filter ngày
├──────────────────────────────────────────────────┤
│ TÊN BỆNH NHÂN (bold, màu xanh)                  │
│ Tuổi    [icon trạng thái]  [⋮]                   │
│         Máy chụp      Ngày giờ chụp              │
├──────────────────────────────────────────────────┤
│ TÊN BỆNH NHÂN 2                                  │
│ ...                                              │
└──────────────────────────────────────────────────┘
```

**4 thành phần chính:**
1. **Menu trái** (icon LOGO + hamburger): Lọc theo chi nhánh, nhóm dịch vụ, vị trí thực hiện, DANH SÁCH MÁY, TRẠNG THÁI CA CHỤP, THÔNG TIN CA CHỤP
2. **Các chức năng tìm kiếm theo ca chụp**: Mã bệnh nhân, họ tên bệnh nhân
3. **Menu phải** (hamburger ≡): Tìm kiếm theo ngày, các chức năng hệ thống
4. **Danh sách các ca chụp** của bệnh nhân (scrollable list)

**Icons trạng thái ca chụp trong danh sách:**
- Icon đồng hồ xoay (spinner) = chưa đọc / đang xử lý
- Icon lịch đỏ với X = có vấn đề / cần chú ý
- Icon lịch xanh = đã đọc xong / bình thường

---

### 2.2. Chức Năng Hệ Thống

#### 2.2.1. Bộ Lọc Theo Chi Nhánh, Cơ Sở, Dịch Vụ Và Vị Trí Thực Hiện

**Mở menu trái**, hiển thị panel lọc:

```
BỘ LỌC                    (1072)
Chi nhánh / Location      [dropdown]
Nhóm dịch vụ / Modality   [dropdown]
Vị trí thực hiện / Machine [dropdown]
[Tìm kiếm]  [Xóa]

DANH SÁCH MÁY
(danh sách checkbox các máy)

TRẠNG THÁI CA CHỤP
☑ Chưa đọc   ☑ Đang đọc
☑ Đọc xong   ☑ Đang duyệt
☑ Duyệt xong ☑ Tất cả

THÔNG TIN CA CHỤP
Bác sỹ chỉ định
Chỉ định
Bộ phận chụp
Kết luận
```

**Chi tiết các bộ lọc:**
- **Lọc chi nhánh**: Chọn chi nhánh/cơ sở (Ba Đình, Tây Hồ, ...)
- **Lọc nhóm dịch vụ (Modality)**: CT, MRI, DX, ...
- **Lọc vị trí thực hiện (Machine)**: Phòng 101, 102, 103...
- Sau khi chọn các tiêu chí, nhấn **Tìm kiếm** để lọc
- Nhấn **Xóa** để xóa bộ lọc

**Lưu ý**: Lựa chọn bằng cách Click chuột trái vào các ô.

#### 2.2.2. Lọc Ca Chụp Theo Thiết Bị (Máy) Chụp

Từ **DANH SÁCH MÁY** trong menu trái:
- Chọn **Tất cả** → Tất cả các máy vào bộ lọc (hiển thị số lượng: ví dụ 46)
- Chọn **một nhóm máy** → Chọn một nhóm (ví dụ CT: 20 ca)
- Chọn **máy duy nhất** → Lọc chỉ 1 máy (ví dụ DUCTEST: 19 ca)

Danh sách cây (tree): Nhóm máy > Máy cụ thể (checkbox)

#### 2.2.3. Lọc Ca Chụp Theo Trạng Thái Ca Chụp

Từ **TRẠNG THÁI CA CHỤP** trong menu trái (checkbox có màu):

| Trạng thái | Màu icon |
|-----------|----------|
| Chưa đọc  | Đỏ/cam   |
| Đang đọc  | Vàng/nháy|
| Đọc xong  | Xanh lá  |
| Đang duyệt| Xanh nhạt|
| Duyệt xong| Xanh đậm |
| Tất cả    | —        |

Có thể tick nhiều trạng thái cùng lúc để lọc kết hợp.

#### 2.2.5. Tìm Kiếm Ca Chụp Theo: Chỉ Định Chụp, Bộ Phận Chụp, Kết Luận Bệnh

Từ **THÔNG TIN CA CHỤP** trong menu trái:
- **Bác sỹ chỉ định**: Nhập chỉ định cần tìm (theo mã ICD)
- **Chỉ định**: Nhập bộ phận chụp cần tìm (theo Protocol của máy chụp)
- **Bộ phận chụp**: Lọc theo bộ phận
- **Kết luận**: Tìm theo kết luận bệnh (theo kết luận của bác sỹ đọc kết quả)

#### 2.2.6. Tìm Kiếm Ca Chụp Theo: Mã, Họ Tên, Ngày Chụp

**Thanh tìm kiếm trên cùng (top bar):**
```
[🔵] [Mã bệnh nhân] [Họ tên bệnh nhân]  [≡]
```
- **Ô trái**: Nhập mã bệnh nhân cần tìm
- **Ô phải**: Nhập họ tên bệnh nhân cần tìm

**Menu phải (≡) — Filter theo ngày:**
```
[Hôm nay] [Hôm qua] [-7 ngày] [-30 ngày] [Tất cả]
[DD/MM/YYYY] ☐  [DD/MM/YYYY]   [×] [🔍]
```
- Nút preset: **Hôm nay**, **Hôm qua**, **-7 ngày**, **-30 ngày**, **Tất cả**
- Chọn khoảng ngày tùy chỉnh: Click vào ngày bắt đầu, click chọn ngày kết thúc trên calendar
- Calendar hiển thị dạng tháng với các ngày (Su, Mo, Tu, We, Th, Fr, Sa)
- Nút **[×]** để hủy bỏ tìm kiếm
- Nút **[×]** hủy + icon user để reset

**Hủy bỏ tìm kiếm:**
1. Click icon **≡** (menu phải) → dropdown hiện ra
2. Click **×** bên cạnh date range để xóa điều kiện ngày

#### 2.2.7. Đăng Xuất

Click vào biểu tượng **👤 (user icon)** góc trên phải → dropdown menu:
- **Đổi mật khẩu**
- **Hướng dẫn sử dụng**
- **Đăng xuất** ← chọn để logout

#### 2.2.8. Đổi Mật Khẩu

Click biểu tượng **👤** góc trên bên phải → chọn **Đổi mật khẩu**

**Dialog Đổi mật khẩu:**
```
┌─────────────────────────────────────────────┐
│ Đổi mật khẩu                              × │
│                                             │
│  Mật khẩu cũ                          [🚫] │
│  Mật khẩu mới                         [🚫] │
│  Nhập lại mật khẩu mới                [🚫] │
│                                             │
│  Lưu ý: Mật khẩu có ít nhất 6 ký tự,      │
│  1 chữ hoa, 1 ký tự đặc biệt, 1 số        │
│                                    [💾 Save]│
└─────────────────────────────────────────────┘
```

**Quy trình:**
1. Nhập mật khẩu cũ
2. Nhập mật khẩu mới
3. Nhập lại mật khẩu mới (xác nhận)
4. Click **Save**

**Yêu cầu mật khẩu:** Ít nhất 6 ký tự, 1 chữ hoa, 1 ký tự đặc biệt, 1 số

#### 2.2.9. Mở Hình Ảnh

**Cách 1:** Nhấn vào **tên bệnh nhân** trong danh sách (tên in đậm màu xanh)

**Cách 2:** Click vào **dấu 3 chấm (⋮)** bên phải ca chụp → menu contextual hiện ra → chọn **Mở ca chụp**

**Context Menu (3 chấm ⋮) — danh sách đầy đủ các action:**
```
📁 Mở ca chụp
📖 Nhận đọc
🗑 Hủy phiếu
✏️ Cập nhật ca chụp
📋 Cập nhật ca chụp từ HIS
📤 Gửi kết quả sang HIS
🔬 Cập nhật thông tin lâm sàng
📎 Đính kèm File
🔀 Chuyển ca chụp
⭐ Thêm vào Favorite
⬇️ Tải chuẩn Dicom
👤 Tải ảnh của bệnh nhân
📥 Tải chuẩn JPEG
🗑 Xóa ca chụp
```

#### 2.2.10. Trả Kết Quả

**Cách 1:** Click **dấu 3 chấm (⋮)** → chọn **Nhận đọc**

**Cách 2:** Mở hình ảnh → chọn **biểu tượng 📋** trên thanh công cụ view hình ảnh

**QUY TRÌNH TRẢ KẾT QUẢ — Làm lần lượt theo số thứ tự:**

**Form trả kết quả (hiển thị các trường theo thứ tự):**

```
┌─────────────────────────────────────────────────────┐
│ [Tên bệnh nhân] -                          − ⬆ ×   │
│                                                     │
│ Danh sách chỉ định  [1]    Kỹ thuật viên       [2] │
│ [Chọn chỉ định    ▼]      [Chọn kỹ thuật viên    ] │
│                                                     │
│ Mẫu kết quả ☑ Chỉ định  ○ Cá nhân           [3]   │
│ [Chọn mẫu        ▼] [4]  [Kết quả bác sĩ do... ▼][5]│
│                                                     │
│ Kỹ thuật thăm khám                          [6]    │
│ [                                                 ] │
│                                                     │
│ Mô tả hình ảnh                                     │
│ AI ▼  B  I  U  Paragraph ▼  🔗  ⋮                 │
│ [                                             ] [7] │
│                                                     │
│ Kết luận                                    [8]    │
│ [                                                 ] │
│                                                     │
│ Khuyến nghị                                 [9]    │
│ [                                                 ] │
│                                                     │
│ [💾 Lưu (đọc)]  [✏️ Đọc xong]  [✅ Duyệt]  [10]  │
│ [🖼 Chọn ảnh]               [❌ Hủy phiếu]        │
└─────────────────────────────────────────────────────┘
```

**17 bước trả kết quả chi tiết:**
1. Chọn danh sách chỉ định
2. Chọn kỹ thuật viên
3. Chọn loại mẫu kết quả: **Chỉ định** (mặc định) hoặc **Cá nhân**
4. Chọn mẫu
5. Chọn bác sĩ cùng đọc ca đó
6. Kỹ thuật thăm khám
7. Nội dung chẩn đoán (Mô tả hình ảnh) — rich text editor có: AI, Bold, Italic, Underline, Paragraph, Link
8. Kết luận
9. Đề nghị / Khuyến nghị
10. Các thao tác trả kết quả: Duyệt, bình nhận, chọn ảnh và mẫu in ảnh, hủy phiếu
11. Chọn ảnh
12. Lấy ảnh từ series ảnh vừa chọn
13. Chọn ảnh để in
14. Chọn mẫu
15. Lựa chọn 1 trong 4 mẫu in
16. Lưu
17. Duyệt

Sau khi nhập đầy đủ thông tin → chọn **Duyệt** → **In phiếu (In thường hoặc in gọn)**

**Sau khi Duyệt — các action button:**
```
[✏️ Sửa (duyệt)] [🖊 Ký số] [☑] [🖨️ In] [🖨️ In Gọn] [📋 Copy kết quả] [⬜ Gộp kết quả]
[🗑 Hủy duyệt]
```

#### 2.2.11. Trả Kết Quả Via Ảnh

**Cách 1:** Click **dấu 3 chấm (⋮)** → chọn **Nhận đọc**

**Cách 2:** Mở hình ảnh → click **biểu tượng 📋** trong view hình ảnh

**QUY TRÌNH TRẢ KẾT QUẢ VIA ẢNH (15 bước):**
1. Chọn danh sách chỉ định
2. Chọn kỹ thuật viên
3. Chọn loại mẫu kết quả: Chỉ định hoặc Cá nhân
4. Chọn mẫu kết quả
5. Chọn bác sĩ cùng đọc ca đầy
6. Kỹ thuật chụp
7. Nội dung chẩn đoán
8. Kết luận
9. Đề nghị
10. Chọn ảnh
11. Chọn series ảnh cần in
12. Lấy ảnh từ series ảnh vừa chọn
13. Chọn ảnh để in
14. Chọn mẫu (1 trong 4 mẫu in)
15. Lưu + Duyệt

Sau khi nhập đầy đủ thông tin → chọn **Duyệt**

#### 2.2.12. Sửa Thông Tin Bệnh Nhân

Click **dấu 3 chấm (⋮)** → chọn **Cập nhật ca chụp**

**Form Cập nhật ca chụp (13 trường):**

```
┌──────────────────────────────────────────────────────┐
│ Cập nhật ca chụp                                   × │
│                                                      │
│ Trường thông tin | Thông tin hiện tại | Thông tin cập nhật │
│ ─────────────────|──────────────────|──────────────── │
│ Mã               | 1617680624467    | [16176b...] [Thêm] │
│ Họ tên           | NGUYEN THI NHUAN | [NGUYEN TH...] [2] │
│ Tuổi             | 0                | [0          ] [3] │
│ Giới tính        | F                | [F          ] [4] │
│ Địa chỉ          |                  | [           ] [5] │
│ BHXH             |                  | [           ] [6] │
│ Chẩn đoán ban đầu|                  | [           ] [7] │
│ Bộ phận chụp     |                  | [           ] [8] │
│ Khoa chỉ định    |                  | [           ] [9] │
│ Bác sỹ chỉ định  |                  | [           ][10] │
│ Buồng            |                  | [           ][11] │
│ Giường           |                  | [           ][12] │
│ Yêu cầu chụp     |                  | [           ][13] │
│                                      [💾 Cập nhật][14]  │
└──────────────────────────────────────────────────────┘
```

**13 trường thông tin:**
1. Mã bệnh nhân
2. Họ và tên của bệnh nhân
3. Tuổi: Tuổi của bệnh nhân
4. Giới tính: Nam, nữ hoặc khác
5. Địa chỉ: Địa chỉ, nơi ở của bệnh nhân
6. BHXH: Mã bảo hiểm xã hội của bệnh nhân
7. Chẩn đoán ban đầu
8. Bộ phận chụp
9. Khoa chỉ định
10. Bác sỹ chỉ định
11. Buồng
12. Giường
13. Yêu cầu ca chụp

Thay đổi thông tin trong phần **Thông tin cập nhật** sau đó chọn **Cập nhật** để cập nhật.

#### 2.2.13. Cập Nhật Thông Tin Ca Chụp Từ HIS

Click **dấu 3 chấm (⋮)** → chọn **Cập nhật ca chụp từ HIS**

**Dialog:**
```
┌──────────────────────────────────────────────┐
│ Cập nhật ca chụp từ HIS                    × │
│ Mã chỉ định  [Mã chỉ định                  ] │
│                               [💾 Cập nhật]  │
└──────────────────────────────────────────────┘
```
- Nhập mã chỉ định → Click **Cập nhật** để lấy thông tin từ HIS về

#### 2.2.14. Gửi Kết Quả Sang HIS

Click **dấu 3 chấm (⋮)** → chọn **Gửi kết quả sang HIS**

Hệ thống tự động gửi kết quả PACS/RIS sang hệ thống HIS tích hợp.

#### 2.2.15. Cập Nhật Thông Tin Lâm Sàng Ca Chụp

Click **dấu 3 chấm (⋮)** → chọn **Cập nhật thông tin lâm sàng**

**Dialog Ghi chú (rich text editor):**
```
┌──────────────────────────────────────────────┐
│ Ghi chú                                    × │
│ Normal ÷  B  I  U  🔗  ≡  ≡               │
│ Tx                                           │
│ ┌────────────────────────────────────────┐   │
│ │                                        │   │
│ │  [1] Vùng nhập thông tin lâm sàng      │   │
│ │                                        │   │
│ └────────────────────────────────────────┘   │
│                              [2] [💾 Lưu]    │
└──────────────────────────────────────────────┘
```
- Nhập thông tin lâm sàng vào vùng text (có toolbar định dạng: Normal, Bold, Italic, Underline, Link, List)
- Click **Lưu** để lưu

#### 2.2.16. Thêm Vào Favorite

Click **dấu 3 chấm (⋮)** → chọn **Thêm vào Favorite**

Đánh dấu ca chụp vào danh sách yêu thích để xem nhanh.

#### 2.2.17. Chia Sẻ Ca Chụp

Click **dấu 3 chấm (⋮)** → chọn **Chuyển ca chụp** (tên menu)

**Dialog Chia sẻ ca chụp:**
```
┌──────────────────────────────────────────────┐
│ Chia sẻ ca chụp                            × │
│ BV Share                                     │
│                                              │
│  ☐  BV XanhPon   ← Chọn bệnh viện cần chia sẻ│
│                                              │
│                              [2] [💾 Lưu]    │
└──────────────────────────────────────────────┘
```
- Chọn máy/bệnh viện cần chia sẻ (ví dụ: BV 103, BV XanhPon...)
- Click **Lưu**
- Hệ thống chia sẻ ca chụp sang cơ sở y tế khác trong mạng lưới VRPACS

#### 2.2.18. Đính Kèm Thêm Ảnh

Click **dấu 3 chấm (⋮)** → chọn **Đính kèm File**

- Upload file đính kèm thêm vào ca chụp
- Trạng thái sau khi upload thành công: **✅ Upload Success!**

#### 2.2.19. Xóa Ca Chụp

Click **dấu 3 chấm (⋮)** → chọn **Xóa ca chụp**

> **NOTE: Chỉ xóa được những ca khi chưa Hội chẩn (hiển thị màu đỏ)**

#### 2.2.20. Tải Hình Ảnh DICOM Của Ca Chụp

Click **dấu 3 chấm (⋮)** → chọn **Tải chuẩn Dicom**

Tải toàn bộ DICOM images của ca chụp này về thiết bị.

#### 2.2.21. Tải Hình Ảnh DICOM Của Bệnh Nhân

Click **dấu 3 chấm (⋮)** → chọn **Tải ảnh của bệnh nhân**

Tải toàn bộ DICOM images của bệnh nhân (tất cả ca chụp) về thiết bị.

#### 2.2.22. Tải Hình Ảnh JPEG Của Ca Chụp

Click **dấu 3 chấm (⋮)** → chọn **Tải chuẩn JPEG**

Tải hình ảnh JPEG (đã convert từ DICOM) của ca chụp về thiết bị.

---

## III. Hệ Thống PACS

### 3.1. Bố Cục Giao Diện Hình Ảnh

Khi mở hình ảnh, giao diện PACS viewer trên mobile gồm 3 phần:

```
┌─────────────────────────────────────────────────────┐
│  [⊞] [☀] [←] [○] [🖊] [📐] [↩] [⛶]          [1] │  ← Thanh công cụ (đỏ)
├─────────────────────────────────────────────────────┤
│ HO THI LANHD          BV DK CLC TINH THAI BINH     │
│ Age:undefined         LOGIQ57                       │
│ 885730                Sieu am o bung (gan mat, tuy,  │
│                       lach, than, bang quang)        │
│                       1/6   ACC: 12104060016        │
├─────────────────────────────────────────────────────┤
│                                                     │
│                 [DICOM IMAGE VIEW]             [3]  │
│                                                     │
│                                        Zoom: 24%   │
│                                        W/L: 256/127│
│ undefinedmA                            Thickness:  │
│ ET: undefined ms                       NaNmm       │
├─────────────────────────────────────────────────────┤
│ [thumbnail]  0%   0%   0%     [series thumb]   [2] │  ← Series panel (vàng)
│  [|◄]  [◄]  [•••]  [►]  [►|]                      │  ← Navigation bar
└─────────────────────────────────────────────────────┘
```

**3 vùng giao diện:**
- **Phần 1 (đỏ)**: Thanh công cụ phía trên — các tools thao tác hình ảnh
- **Phần 2 (vàng)**: Danh sách series hình ảnh của ca chụp (phía dưới)
- **Phần 3 (xanh)**: Cửa sổ hiển thị hình ảnh (vùng chính)

**DICOM Info overlay:**
- Góc trên trái: Tên bệnh nhân, tuổi, mã bệnh nhân
- Góc trên phải: Tên bệnh viện, máy chụp, chỉ định, số ảnh hiện tại/tổng
- Góc dưới trái: mA, ET (exposure time)
- Góc dưới phải: Zoom %, W/L (Window/Level), Thickness

**Navigation bar dưới cùng:**
- `|◄` — về đầu series
- `◄` — ảnh trước
- `•••` — mở tools panel
- `►` — ảnh tiếp theo
- `►|` — về cuối series

### 3.2. Hiển Thị Danh Sách Series Ảnh

**Series panel** (vùng vàng, phía dưới):
- Hiển thị danh sách thumbnail của các series trong ca chụp
- Mỗi thumbnail hiển thị: ảnh đại diện + số lượng ảnh trong series
- Series đang xem được highlight (viền đỏ)

**Thumbnail series** khi phóng to:
- Hiển thị ảnh preview của series
- Có nhãn số lượng ảnh

### 3.3. Chọn Và Xem Ảnh

Từ danh sách series, chọn vào khung hình series muốn xem để xem ảnh.

- Tap vào series thumbnail → ảnh DICOM đó load vào viewport chính
- Swipe/navigate bằng nút `◄` / `►` để xem ảnh tiếp/trước
- Ảnh hiển thị thông tin DICOM overlay ở 4 góc

### 3.4. Các Chức Năng Thao Tác Với Hình Ảnh Trên Thanh Công Cụ

#### 3.4.1. Các Tools Cơ Bản

**Thanh công cụ chính (top toolbar):**

| Icon | Tên | Chức năng |
|------|-----|-----------|
| ⊞ | Chia Layout | Chọn layout hiển thị (1x1, 1x2, 2x2...) |
| ☀ | Chỉnh Window/Level | Điều chỉnh độ sáng/tương phản DICOM |
| ≋ | Cuộn hình ảnh | Pan/scroll hình ảnh |
| 🖊 | Đo khoảng cách | Measurement tool |
| ✕ | Xóa phép đo, vẽ | Xóa annotations/measurements |

**Mở rộng tools (click `•••` trên navigation bar):**

Hiện thị grid các tools:
```
[↺] [↻] [↔] [↕] [⊙] [+]
[🔍] [📐] [⬜] [✏] [⚓] [💎]
[A▾] [C▾] [≡▾] [⊞] [↗]
```

#### 3.4.2. Chức Năng Xem Lịch Sử Hình Ảnh

Xem lịch sử các lần chụp trước của bệnh nhân để so sánh.
*(Truy cập từ toolbar — icon lịch sử)*

#### 3.4.3. Chức Năng Hiệu Chỉnh Layout

Click **biểu tượng ⊞ (Chia Layout)** → hiện layout picker:

```
┌─────────────────────────────────────────┐
│ [⊞] 1  ← icon layout (đang chọn)      │
│                                         │
│  ┌──┬──┬──┐                            │
│  │  │  │  │  ← Grid layout picker      │
│  ├──┼──┼──┤     (matrix NxM)           │
│  │  │  │  │                            │
│  └──┴──┴──┘                            │
└─────────────────────────────────────────┘
```

Chọn vào các ô để chỉnh Layout cho Study:
- **1x1**: 1 viewport (mặc định)
- **1x2**: 2 viewports ngang
- **2x1**: 2 viewports dọc
- **2x2**: 4 viewports
- Và các layout khác trong grid

#### 3.4.4. Các Tools Trong Ứng Dụng

**Click `•••`** trên navigation bar → mở tool panel đầy đủ:

```
Row 1: [↺Xoay trái 90°] [↻Xoay phải 90°] [↔Lật trái/phải] [↕Lật trên/dưới] [⊙Đo diện tích,tỷ trọng] [+Xoay tự do]
Row 2: [🔍] [📐] [⬜] [✏] [⚓] [💎]
Row 3: [A▾] [C▾] [≡▾] [⊞] [↗]
```

**Chi tiết các tools:**

| Icon | Tên | Mô tả |
|------|-----|-------|
| ↺ | Xoay trái 90° | Xoay ảnh sang trái 90 độ |
| ↻ | Xoay phải 90° | Xoay ảnh sang phải 90 độ |
| ↔ | Lật trái/phải | Flip horizontal |
| ↕ | Lật trên/dưới | Flip vertical |
| ⊙ | Đo diện tích, tỷ trọng | ROI measurement (HU density) |
| + | Xoay tự do | Free rotation |
| 🔍 | Zoom | Phóng to/thu nhỏ |
| 📐 | Đo khoảng cách | Distance measurement |
| ⬜ | ROI rectangle | Vẽ vùng ROI hình chữ nhật |
| ✏ | Annotation | Ghi chú/vẽ tự do |
| ⚓ | Anchor | Đặt điểm neo |
| 💎 | (tool đặc biệt) | — |
| A▾ | Annotation menu | Menu chú thích |
| C▾ | Colormap | Chọn bảng màu |
| ≡▾ | Preset W/L | Chọn preset Window/Level |
| ⊞ | Layout | Chia layout viewport |
| ↗ | Chia sẻ | Share ca chụp |

#### 3.4.5. Chức Năng Dựng MPR

**MPR (Multi-Planar Reconstruction)** — Dựng lại mặt phẳng từ dữ liệu 3D (CT/MRI):
- Truy cập từ toolbar hoặc tool panel
- Hỗ trợ dựng MPR cho ảnh CT/MRI với nhiều lát cắt
- Hiển thị 3 mặt phẳng: Axial, Sagittal, Coronal

#### 3.4.7. Chức Năng Chia Sẻ Ca Chụp (từ PACS Viewer)

**Click icon ↗ (chia sẻ)** trong tool panel → mở dialog chia sẻ:
- Chia sẻ ca chụp sang bệnh viện/cơ sở khác trong mạng lưới
- Chọn đích nhận → Lưu

#### 3.4.8. Chức Năng Next And Previous Series Và Hình Ảnh Trong Series

**Navigation trong Series:**
- **`►|` (Next Series)**: Chuyển sang series tiếp theo
- **`|◄` (Previous Series)**: Chuyển về series trước
- **`►` (Next Image)**: Ảnh tiếp theo trong series
- **`◄` (Previous Image)**: Ảnh trước trong series
- **`•••`** giữa: Mở tools panel

Thanh navigation ở dưới cùng viewport cho phép duyệt nhanh qua toàn bộ series và ảnh trong series.

---

## Tổng Hợp Tính Năng — Feature Matrix

### Authentication & Security
| Feature | Có |
|---------|-----|
| Web-based (Browser app, không cần install) | ✅ |
| Login form (username + password) | ✅ |
| Đổi mật khẩu trong app | ✅ |
| Password policy (6+ ký tự, uppercase, special, number) | ✅ |
| Đăng xuất | ✅ |
| Hỗ trợ iOS Safari | ✅ |
| Hỗ trợ Android Chrome | ✅ |
| Forgot password (gọi hotline) | ✅ |

### RIS Worklist
| Feature | Có |
|---------|-----|
| Danh sách ca chụp (worklist) | ✅ |
| Tìm kiếm theo mã bệnh nhân | ✅ |
| Tìm kiếm theo họ tên bệnh nhân | ✅ |
| Filter theo ngày: Hôm nay, Hôm qua, -7 ngày, -30 ngày, Tất cả | ✅ |
| Filter ngày tùy chỉnh (calendar picker) | ✅ |
| Filter theo chi nhánh/cơ sở | ✅ |
| Filter theo nhóm dịch vụ (Modality: CT, MRI, DX...) | ✅ |
| Filter theo vị trí thực hiện (Machine/Phòng) | ✅ |
| Filter theo thiết bị máy chụp (cây hierarchical) | ✅ |
| Filter theo trạng thái: Chưa đọc, Đang đọc, Đọc xong, Đang duyệt, Duyệt xong | ✅ |
| Filter theo chỉ định chụp (ICD) | ✅ |
| Filter theo bộ phận chụp (Protocol) | ✅ |
| Filter theo kết luận bệnh | ✅ |
| Hiển thị tổng số ca (counter) | ✅ |
| Icon trạng thái trực quan trên từng ca | ✅ |

### Ca Chụp Actions
| Feature | Có |
|---------|-----|
| Mở ca chụp (xem DICOM) | ✅ |
| Nhận đọc (claim study) | ✅ |
| Hủy phiếu | ✅ |
| Cập nhật thông tin ca chụp (13 trường) | ✅ |
| Cập nhật ca chụp từ HIS (theo mã chỉ định) | ✅ |
| Gửi kết quả sang HIS | ✅ |
| Cập nhật thông tin lâm sàng (ghi chú rich text) | ✅ |
| Đính kèm File | ✅ |
| Chuyển/Chia sẻ ca chụp sang bệnh viện khác | ✅ |
| Thêm vào Favorite | ✅ |
| Tải DICOM của ca chụp | ✅ |
| Tải DICOM của bệnh nhân (toàn bộ) | ✅ |
| Tải JPEG của ca chụp | ✅ |
| Xóa ca chụp (chỉ ca chưa Hội chẩn) | ✅ |

### Trả Kết Quả (Reporting)
| Feature | Có |
|---------|-----|
| Form trả kết quả đầy đủ | ✅ |
| Chọn chỉ định | ✅ |
| Chọn kỹ thuật viên | ✅ |
| Mẫu kết quả theo chỉ định hoặc cá nhân | ✅ |
| Chọn bác sĩ cùng đọc | ✅ |
| Kỹ thuật thăm khám | ✅ |
| Mô tả hình ảnh (rich text editor với AI, B/I/U, paragraph) | ✅ |
| Kết luận | ✅ |
| Khuyến nghị/Đề nghị | ✅ |
| Lưu (đọc) — save draft | ✅ |
| Đọc xong | ✅ |
| Duyệt | ✅ |
| Hủy phiếu | ✅ |
| Chọn ảnh để in | ✅ |
| Chọn mẫu in (4 mẫu) | ✅ |
| In thường / In gọn | ✅ |
| Ký số | ✅ |
| Copy kết quả | ✅ |
| Gộp kết quả | ✅ |
| Hủy duyệt | ✅ |
| Sửa (sau khi duyệt) | ✅ |

### PACS Viewer
| Feature | Có |
|---------|-----|
| Xem ảnh DICOM | ✅ |
| DICOM info overlay (4 góc) | ✅ |
| Zoom in/out | ✅ |
| Window/Level adjustment | ✅ |
| Pan (cuộn hình) | ✅ |
| Xoay trái 90° / phải 90° | ✅ |
| Lật ngang (Flip horizontal) | ✅ |
| Lật dọc (Flip vertical) | ✅ |
| Xoay tự do | ✅ |
| Đo khoảng cách | ✅ |
| Đo diện tích, tỷ trọng (HU) | ✅ |
| ROI Rectangle | ✅ |
| Annotation/vẽ tự do | ✅ |
| Xóa phép đo, vẽ | ✅ |
| Xem lịch sử hình ảnh | ✅ |
| Hiệu chỉnh layout (1x1, 1x2, 2x2...) | ✅ |
| Colormap (bảng màu) | ✅ |
| W/L Preset | ✅ |
| MPR (Multi-Planar Reconstruction) | ✅ |
| Chia sẻ ca chụp từ viewer | ✅ |
| Danh sách series ảnh (thumbnail strip) | ✅ |
| Navigate series (Next/Previous series) | ✅ |
| Navigate ảnh trong series (Next/Previous image) | ✅ |
| Hiển thị số ảnh hiện tại / tổng | ✅ |
| Multiframe navigation (•••) | ✅ |

---

## Luồng Sử Dụng Điển Hình (Typical Workflows)

### Workflow 1: Bác Sỹ Đọc Kết Quả On Mobile
1. Mở Safari/Chrome → nhập URL VRPACS
2. Đăng nhập (username/password)
3. Worklist hiện ra → lọc theo "Chưa đọc" + Modality cần đọc
4. Click tên bệnh nhân → xem DICOM images
5. Dùng tools (W/L, zoom, đo...) để đọc ảnh
6. Click icon 📋 → form trả kết quả
7. Điền đầy đủ: chỉ định → KTV → mô tả → kết luận → đề nghị
8. Chọn ảnh in → chọn mẫu in
9. Duyệt → In phiếu

### Workflow 2: Chia Sẻ Ca Với Bệnh Viện Khác
1. Từ worklist → click ⋮ → Chuyển ca chụp
2. Chọn bệnh viện đích → Lưu
3. Ca chụp được chia sẻ sang BV kia

### Workflow 3: Cập Nhật Thông Tin Từ HIS
1. Từ worklist → click ⋮ → Cập nhật ca chụp từ HIS
2. Nhập mã chỉ định
3. Click Cập nhật → hệ thống pull data từ HIS

### Workflow 4: Tải DICOM Về Thiết Bị
1. Từ worklist → click ⋮ → Tải chuẩn Dicom
2. DICOM files được download về thiết bị di động

---

## Ghi Chú Kỹ Thuật

### Platform
- **Deployment**: Web application (PWA-style) — không cần cài từ App Store
- **iOS**: Safari browser
- **Android**: Chrome browser
- **URL**: Nhập địa chỉ server PACS vào thanh địa chỉ

### DICOM Viewer Capabilities
- Render DICOM images trong browser
- Hỗ trợ ultrasound (US), X-ray (CR/DX), CT, MRI
- Overlay thông tin DICOM header
- W/L (Window Center/Width) real-time adjustment
- Zoom percentage display
- Slice thickness display
- MPR reconstruction (axial/sagittal/coronal)

### HIS Integration
- Pull thông tin bệnh nhân từ HIS theo mã chỉ định
- Push kết quả đọc về HIS
- Đồng bộ 2 chiều HIS ↔ PACS

### Multi-Hospital Support
- Chia sẻ ca chụp giữa các bệnh viện trong cùng hệ thống
- Filter theo chi nhánh/cơ sở
- Cấu hình BV Share (danh sách bệnh viện có thể chia sẻ)

### Reporting
- Rich text editor với AI assist
- 4 mẫu in report
- Ký số điện tử
- In thường / In gọn
- Copy/Gộp kết quả (multi-study reporting)
