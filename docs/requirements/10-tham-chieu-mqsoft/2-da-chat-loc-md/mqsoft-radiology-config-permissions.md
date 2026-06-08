# CĐHA — Khai báo sử dụng, Phân quyền chụp đọc, Tường trình PTTT
> Sources: 3 PDFs (14 + 6 + 3 = 23 pages)
> Extracted: 2026-06-01
> Module: MQ RIS (Radiology Information System) — thuộc MQ Solutions HIMS

---

## Part 1: Khai báo sử dụng (Radiology Configuration)

### Tổng quan — Mục lục tài liệu

Tài liệu "CĐHA — Khai báo sử dụng" gồm 3 nhóm khai báo chính:

1. **Khai báo danh mục loại chẩn đoán hình ảnh** (trang 2–5)
   - Vào màn hình khai báo "Loại chẩn đoán hình ảnh"
   - Khai báo loại chẩn đoán hình ảnh
   - Sửa loại chẩn đoán hình ảnh

2. **Khai báo máy thực hiện** (trang 6–8)
   - Vào màn hình khai báo "Máy thực hiện"
   - Khai báo máy thực hiện
   - Sửa máy thực hiện

3. **Khai báo mẫu mô tả (Template)** (trang 9–14)
   - Vào màn hình Khai báo mẫu CĐHA
   - Khai báo mẫu mô tả
   - Chỉnh sửa mẫu mô tả
   - Sử dụng mẫu mô tả đã khai báo

---

### 1. Khai báo danh mục loại chẩn đoán hình ảnh

#### 1.1 Cách vào màn hình

**Đường dẫn:**
1. Mở phần mềm **MQ Main** (màn hình chính HIMS)
2. Chọn vào phần **Chẩn đoán hình ảnh (MQ RIS)**
3. Nhập tài khoản, mật khẩu được cung cấp
4. Vào **"3. Tiện ích"** → **"Danh mục"** → **"Loại chẩn đoán hình ảnh"**

**Vị trí menu:** Menu bar → Tiện ích → Danh mục → Loại chẩn đoán hình ảnh

#### 1.2 Màn hình "Khai báo loại chẩn đoán hình ảnh"

**Tiêu đề màn hình:** KHAI BÁO LOẠI CHẨN ĐOÁN HÌNH ẢNH

**Bố cục màn hình (4 phần):**
1. **Danh sách các loại chẩn đoán hình ảnh** — panel chính bên trái, dạng grid
2. **Dược khoa phòng** — panel bên phải trên
3. **Quầy thực hiện** — panel bên phải giữa
4. **Thông tin và tuỳ chọn của loại chẩn đoán hình ảnh** — panel bên phải dưới

**Các cột trong danh sách chính (grid trái):**
- STT (số thứ tự)
- Tên loại chẩn đoán hình ảnh
- Các cột thông tin bổ sung (tên khoa/phòng liên kết, quầy thực hiện...)

**Toolbar/Action buttons:**
- **Mới** — tạo mới loại CĐHA
- **Sửa** — chỉnh sửa loại đã chọn
- **Lưu** — lưu thông tin
- **Bỏ qua** — hủy thay đổi, không lưu

#### 1.3 Khai báo mới loại chẩn đoán hình ảnh

**Quy trình:**
1. Nhấn **"Mới"** → Điền đầy đủ thông tin loại chẩn đoán hình ảnh
2. Điền: STT, Tên loại, Khoa/Phòng, ...
3. Tích các tuỳ chọn cần thiết:
   - **Chọn hình**: tích nếu muốn chụp hình (nếu mẫu báo cáo có hình)
   - **Chụp hình**: tích nếu cho phép chụp hình
4. **Loại chẩn đoán hình ảnh do sử dụng**: chọn khoa phòng nào thì chọn (Khung số 2 đã tô đỏ). Không có thì không tích
5. Chọn **Quầy thực hiện**
6. Nhấn **"Lưu"**

**Lưu ý quan trọng:**
- Ở phần **"Tên report"**: liên hệ phòng IT để thiết kế report và cung cấp tên report
- Nếu có tích chọn **"Chụp hình"** và **"Chọn hình"** thì sẽ được chọn số lượng hình tối đa in trên report và số lượng hình tối đa lưu trên máy

**Ví dụ — Chụp CT:**
- Dược khoa/phòng: của phòng CT Scan
- Quầy thực hiện: CT-Scanner
- Do CT chụp hình bên ngoài nên không cần tích chụp, chọn hình trên report

#### 1.4 Sửa loại chẩn đoán hình ảnh

1. Chọn loại chẩn đoán hình ảnh muốn chỉnh sửa trên danh sách
2. Nhấn **"Sửa"** → Chỉnh sửa thông tin cần thiết
3. Nhấn **"Lưu"**

**Lưu ý:**
- **Không sửa "Tên Report"** → Lỗi → Không thể in report
- Bấm **"Bỏ qua"** nếu không muốn lưu thông tin đã nhập hay sửa

---

### 2. Khai báo máy thực hiện

#### 2.1 Cách vào màn hình

**Đường dẫn:**
1. Mở phần mềm **MQ Main**
2. Chọn vào phần **Chẩn đoán hình ảnh (MQ RIS)**
3. Nhập tài khoản, mật khẩu được cung cấp
4. Vào **"3. Tiện ích"** → **"Danh mục"** → **"Máy thực hiện"**

#### 2.2 Màn hình "Khai báo máy thực hiện"

**Tiêu đề màn hình:** KHAI BÁO MÁY THỰC HIỆN (KHAI BÁO MÁY CHẨN ĐOÁN HÌNH ẢNH)

**Bố cục màn hình:**
- Danh sách bên trái: danh sách máy đã khai báo
- Panel bên phải: "Danh sách máy đã khai báo" (thông tin chi tiết)
- Footer: hiển thị tổng số máy

**Các cột trong danh sách máy:**
- STT
- Mã máy (dạng text ngắn, ví dụ: CT-LIGHT...)
- Tên máy (ví dụ: Máy chụp cắt lớp vi tính 64 dãy, ...)
- Thông tin bổ sung

**Dữ liệu mẫu quan sát được trong grid:**
| STT | Mã máy | Tên máy |
|-----|--------|---------|
| (các dòng máy CĐHA như CT, MRI, X-quang, Siêu âm...) | | |

**Action buttons:**
- **Mới** — tạo mới máy
- **Sửa** — chỉnh sửa máy đã chọn
- **Lưu** — lưu thông tin
- **Bỏ qua** — hủy thay đổi

**Bước chọn loại CĐHA khi khai báo máy:**
- Bước 5: Chọn "Loại chẩn đoán hình ảnh" muốn khai báo máy → Nhấn "Chọn"
- Một hộp thoại danh sách loại CĐHA hiện ra để lựa chọn

#### 2.3 Khai báo mới máy thực hiện

1. Nhấn **"Mới"** → Điền đầy đủ thông tin:
   - **Mã máy** (text)
   - **Tên máy** (text)
2. Nhấn **"Lưu"**

#### 2.4 Sửa máy thực hiện

1. Chọn máy thực hiện muốn chỉnh sửa trên danh sách
2. Nhấn **"Sửa"** → Chỉnh sửa thông tin cần thiết
3. Nhấn **"Lưu"**

**Ghi chú:** Bấm **"Bỏ qua"** nếu không muốn lưu thông tin đã nhập hay sửa

---

### 3. Khai báo mẫu mô tả (Template)

#### 3.1 Cách vào màn hình Khai báo mẫu CĐHA

**Đường dẫn:**
1. Mở phần mềm **MQ Main**
2. Chọn vào phần **Chẩn đoán hình ảnh (MQ RIS)**
3. Nhập tài khoản, mật khẩu được cung cấp
4. Vào **"3. Tiện ích"** → **"Khai báo sử dụng"** → **"Mẫu 1 – Template"**

**Vị trí menu:** Menu bar → Tiện ích → Khai báo sử dụng → Mẫu 1 – Template

#### 3.2 Màn hình "Khai báo mẫu mô tả"

**Tiêu đề màn hình:** KHAI BÁO MẪU MÔ TẢ

**Bố cục màn hình:**
- **Panel trái — "Danh sách mẫu đã khai"**: danh sách các mẫu đã khai báo
- **Panel phải — Editor**: soạn thảo nội dung mẫu mô tả
  - Phần trên: vùng soạn thảo Mô tả (text area lớn)
  - Phần dưới: vùng soạn thảo Kết luận (text area)
- **Ghi chú trên editor**: "Mô tả và Kết luận coppy – paste sang khai báo"

**Cấu trúc form khai báo mẫu mô tả:**
| Trường | Mô tả |
|--------|-------|
| Loại | Loại CĐHA (dropdown chọn từ danh mục đã khai báo) |
| Bác sĩ sử dụng | Chọn bác sĩ — hoặc "Chung" nếu dùng chung cho tất cả bác sĩ |
| Kỹ thuật | Dropdown chọn kỹ thuật chỉ định phòng khám |
| Tên mẫu | Đặt tên mẫu để phân biệt từng mẫu cho từng đối tượng |
| Đối tượng | "Tất cả", "Nam", "Nữ" — giới hạn mẫu cho đối tượng riêng |
| Nội dung Mô tả | Text area — soạn nội dung mô tả hình ảnh |
| Nội dung Kết luận | Text area — soạn nội dung kết luận |

**Action buttons:**
- **Mới** — tạo mẫu mô tả mới
- **Sửa** — chỉnh sửa mẫu đã chọn
- **Lưu** — lưu mẫu
- **Bỏ qua** — hủy, không lưu

**Toolbar trên editor (quan sát được):**
- Định dạng chữ in KT (kích thước), in đậm, in nghiêng
- Căn trái / căn giữa
- Màu nền chữ

#### 3.3 Khai báo mới mẫu mô tả

**Quy trình:**
1. Chọn loại CĐHA muốn khai báo mẫu mô tả → Nhấn **"Chọn"**
   - Hộp thoại danh sách loại CĐHA xuất hiện để chọn (ví dụ: X-quang, CT Scan, MRI, Siêu âm...)
2. Nhấn **"Mới"**
3. Điền thông tin:
   - **Bác sĩ sử dụng mẫu**: chọn "Chung" để dùng chung cho tất cả bác sĩ
   - **Kỹ thuật**: chọn đúng theo mã Kỹ thuật chỉ định phòng khám
   - **Tên mẫu**: đặt tên có ý muốn phân biệt từng mẫu cho từng đối tượng
   - **Đối tượng**: chọn "Tất cả", "Nam", hoặc "Nữ" — để mẫu chỉ sử dụng riêng cho đối tượng đó
4. Nhập **Mô tả** và **Kết luận**: copy – paste nội dung sang khai báo
   - Giao diện: có 2 text box lớn — box trên (Mô tả), box dưới (Kết luận)
   - Phần tô đỏ bên trái: **"lớn KT khai theo mã chỉ định"** (ký thuật chỉ định)
   - Phần tô đỏ bên phải: **"lớn tự đặt theo nội dung"** (tên tự do)
5. Nhấn **"Lưu"**

**Ghi chú quan trọng:**
- Một kỹ thuật có thể có **nhiều mẫu mô tả**
- Mẫu mô tả nên có cả **Mô tả** và **Kết luận**. Nên để mặc định "Không phát hiện bất thường …" hay chỉ cần "." để đây công, nếu có thay đổi thì có thể chỉnh sửa khi đưa ra kết quả
- Bấm **"Bỏ qua"** nếu không muốn lưu thông tin đã nhập

#### 3.4 Danh sách mẫu mô tả đã khai báo — các cột trong grid

Màn hình "Khai báo mẫu" — panel danh sách bên trái hiển thị:
| Cột | Ý nghĩa |
|-----|---------|
| Loại | Loại CĐHA (X-quang, CT, MRI, ...) |
| Tên mẫu | Tên mẫu mô tả |
| Kỹ thuật | Kỹ thuật chỉ định tương ứng |
| Bác sĩ | Bác sĩ được gán / "Chung" |
| Đối tượng | Tất cả / Nam / Nữ |

Quan sát dữ liệu mẫu trong grid (radcfg_13.png) — nhiều mẫu đã được khai báo cho các loại:
- Chụp (nhiều dòng)
- Siêu âm (nhiều dòng)
- MRI (nhiều dòng)
- Các loại CĐHA khác

**Dữ liệu grid mẫu (nội dung mẫu quan sát):**
- Mỗi dòng chứa tên mẫu + loại CĐHA tương ứng
- Cột nội dung mô tả và kết luận hiển thị tóm tắt text

#### 3.5 Chỉnh sửa mẫu mô tả

1. Ở màn hình "Khai báo mẫu", chọn **"Danh sách mẫu đã khai"**
2. Ở đây sẽ hiện ra danh sách mẫu mô tả đã khai, chọn mẫu mô tả muốn chỉnh sửa (nhấn 2 lần vào mẫu muốn chỉnh sửa)
3. Sau khi chọn, sẽ chuyển sang màn hình **"Khai báo mẫu"** → Nhấn **"Sửa"** → Tiến hành chỉnh sửa

**Ví dụ nội dung mẫu hiển thị trong editor (quan sát được từ radcfg_13.png):**
```
KHỚP CỔ BÀN CHÂN:
Các xương cổ chân (sên, gót, hộp, ghe, chêm, xương bàn chân và các đốt ngón chân bình thường về vị trí). Không thấy hình ảnh nứt vỡ, gãy xương. Không thấy dầu hiệu phá hủy xương.
Khe khớp cổ bàn chân bình thường.
Phần mềm quanh khớp:
- Các đầu xương: Bình thường, gai xương bình thường
- Khe khớp: Bình thường (không thấy dịch)
- Phần mềm quanh khớp: Bình thường, không sưng nề
KẾT LUẬN:
Không thấy bất thường trên hình x-quang cổ bàn chân
```

4. Sau khi chỉnh sửa xong → Nhấn **"Lưu"**

**Ghi chú:** Bấm **"Bỏ qua"** nếu không muốn lưu thông tin đã sửa

#### 3.6 Sử dụng mẫu mô tả đã khai báo

**Khi thực hiện trả kết quả CĐHA:**

1. Vào màn hình thực hiện kỹ thuật CĐHA tương ứng
   - Menu: Tiện ích → (danh sách các kỹ thuật CĐHA) để chọn đúng kỹ thuật
2. Thực hiện quy trình **"Trả kết quả CĐHA"**
3. Tích vào ô **"Mẫu mới"**
4. Nhấn **"Mô tả"**

**Giao diện màn hình trả kết quả (quan sát từ radcfg_14.png):**
- Màn hình "HIẾU KHI" (tên màn hình kỹ thuật viên nhập kết quả)
- Hiển thị thông tin bệnh nhân
- Có ô chọn mẫu mô tả
- Vùng nhập Mô tả và Kết luận

**Lưu ý quan trọng:**
- Khi không muốn sử dụng mẫu mô tả đã khai báo, vẫn phải nhấn **"Mô tả"** để nhập được nội dung vào mô tả, kết luận và để nghị.
- Ký hiệu nhà phân phối/tích hợp: **PACIFICCROSS**

---

## Part 2: Phân quyền chụp đọc (Capture/Read Permissions)

### Tổng quan — Mục lục tài liệu

Tài liệu "CĐHA — Phân quyền chụp đọc" gồm 5 bước:
1. Vào màn hình phân quyền RIS (CĐHA)
2. Tìm user "doc" (người đọc, trả kết quả) hoặc "chụp" (Người thực hiện kỹ thuật)
3. Sao chép quyền của user "chụp" / "doc"
4. Dán vào tài khoản người dùng thật
5. Nhấn "Lưu"

---

### 1. Hai nhóm quyền cơ bản trong RIS

#### Nhóm quyền "Chụp" — Người thực hiện kỹ thuật

Quan sát từ màn hình **QUẢN LÝ NGƯỜI DÙNG** với user mẫu "Chup":

**Cây quyền (Permission tree) bên phải — Quyền được tích:**

**Báo cáo:**
- Thống kê bệnh nhân thực hiện cận lâm sàng
- Thống kê danh sách bệnh nhân thực hiện nội trú, ngoại trú lẻ
- Thống kê danh sách bệnh nhân thực hiện x-quang
- Danh sách bệnh nhân nhân thực hiện cận lâm sàng
- Thống kê bệnh nhân nhân thực hiện x-quang
- Thống kê bệnh nhân nhân thực hiện x-quang
- Thống kê bệnh nhân nhận - hoàn
- Tổng kết chuyển viện sau khi ẩn hình thái học lan của người thứ 1

**Bảo cáo thuốc phần:**
- Cho biết sử dụng thuốc phần
- Thống hoa sử dụng thuốc phần
- Báo cáo 06 - Hoạt động cận lâm sàng

**Cập nhật (nhóm chính cho người chụp):**
- Siêu âm - AImage Controls
- Siêu âm - OmniShow
- Siêu âm - Video
- MRI
- Siêu âm - Camera Net
- Nội soi - AImage Controls  
- Nội soi - OmniShow
- **CT Scan** ← được tích
- **Camera Net** ← được tích

**Đặc điểm quyền "Chụp":**
- Có quyền **Cập nhật** cho các modality cụ thể (CT Scan, Camera Net, Siêu âm, MRI, Nội soi...)
- **KHÔNG có** quyền đọc/trả kết quả (đó là quyền "Doc")
- Tập trung vào capture/acquisition image

#### Nhóm quyền "Doc" — Người đọc, trả kỹ thuật

Quan sát từ màn hình **QUẢN LÝ NGƯỜI DÙNG** với user mẫu "Doc":

**Cây quyền (Permission tree) bên phải — Quyền được tích:**

**Báo cáo:**
- Thống kê bệnh nhân thực hiện cận lâm sàng
- Thống kê danh sách bệnh nhân thực hiện nội trú, ngoại trú lẻ
- Thống kê danh sách bệnh nhân thực hiện x-quang
- Danh sách bệnh nhân nhân thực hiện cận lâm sàng
- Thống kê bệnh nhân nhận thực hiện x-quang
- Thống kê bệnh nhân nhân thực hiện x-quang
- Thống kê bệnh nhân nhận - hoàn
- Tổng kết chuyển viện sau khi ẩn hình thái học lan

**Bảo cáo thuốc phần:**
- Cho biết sử dụng thuốc phần
- Thống hoa 06 - Hoạt động cận lâm sàng

**Cập nhật (nhóm chính cho người đọc):**
- **X-quang** ← được tích
- **CT Scan** ← được tích
- **MRI** ← được tích (quan sát từ radperm_03.png)

**Đặc điểm quyền "Doc":**
- Có quyền **Cập nhật** cho các loại CĐHA cần đọc và trả kết quả
- Tập trung vào interpret/report — đọc và trả kỹ thuật
- So với "Chụp": quyền khác ở phần Cập nhật (doc đọc kết quả, chụp thực hiện kỹ thuật chụp)

---

### 2. Cách vào màn hình phân quyền RIS (CĐHA)

**Đường dẫn:**
- Từ menu chính MQ RIS (CĐHA): **Nghiệp vụ** → **Cấu số** → **Hướng dẫn** → **Kết thúc** (menu bar)
- Hoặc: Menu → **Quản trị người dùng**

**Cụ thể từ radperm_04.png — menu Nghiệp vụ mở ra:**
- Quản trị viên đăng
- Phân biệt rõ ràng
- Cài thông số
- Các hướng dẫn đặng
- Tập chuyển người dùng
- **Quản lý người dùng** ← mục cần chọn
- In mới xem
- Logoff (Admin) Ctrl+L

**Màn hình:** QUẢN LÝ NGƯỜI DÙNG

**Bố cục:**
- **Panel trái — "Quản lý người dùng"**: cây danh sách người dùng theo nhóm/vai trò
- **Panel phải — "Quyền"**: cây quyền 2 cấp (Báo cáo → sub-items, Cập nhật → sub-items)
- **Toolbar**: các icon thao tác
- **Ô tìm kiếm**: "Tìm người dùng" — gõ text, nhấn icon kính lúp để tìm
- **Thanh trạng thái**: "Chức năng sử dụng (3/74)" — hiển thị số quyền đã cấp / tổng quyền

---

### 3. Tìm user "doc" hoặc "chụp" để sao chép quyền

**Quy trình:**
1. Vào màn hình **QUẢN LÝ NGƯỜI DÙNG**
2. Tìm trong ô tìm kiếm — gõ **"doc"** (để tìm user mẫu Người đọc) hoặc **"chup"** (Người chụp)
3. Nhấn vào **icon kính lúp** để tìm kiếm
4. Kết quả: user mẫu "doc" / "chup" xuất hiện trong danh sách bên trái

**Màn hình tìm "doc":**
- Danh sách trái: **Quản lý trị thống → doc** (user mẫu Doc được highlight xanh)
- Panel quyền bên phải: hiển thị quyền của user doc

**Màn hình tìm "chup":**
- Danh sách trái: **Quản lý trị thống → Chụp Chụp** (user mẫu Chup được highlight xanh)
- Panel quyền bên phải: hiển thị quyền của user chup

---

### 4. Sao chép quyền của user "chụp" / "doc"

**Quy trình:**
1. Chọn user mẫu (doc hoặc chup) trong danh sách bên trái
2. Nhấn vào **icon "Sao chép quyền"** trên toolbar (icon giống clipboard/copy)
3. Hệ thống sao chép toàn bộ cây quyền của user mẫu đó

---

### 5. Dán vào tài khoản người dùng thật

**Quy trình:**
1. Xóa thông tin trong ô tìm kiếm → Nhấn vào **icon kính lúp** để load lại thông tin danh sách người dùng thật
2. **Màn hình QUẢN LÝ NGƯỜI DÙNG** hiển thị danh sách đầy đủ người dùng thật:
   - Ví dụ: Admin, Bạn Gái Siêu (template_BQS), Bà Cao Bài Nhân (user004), Bà Đặng Măc Đặn (user030b), Bà Đặng Thị Anh Thu (bai0036), Bà Đặng Thị Thanh (user021), Bà Hoàng Diệu.com (user003E7), **Bà Hoàng Thị Thanh Thu (user0040)** (đang được chọn — highlight vàng), Bà Huỳnh Thị Thảm (bua00031), Bà Lê Thị Anh Thu (bai00014)
3. **Chọn người dùng thật** muốn dán quyền (nhấn chọn trong danh sách)
4. Nhấn vào **icon "Dán quyền"** (icon paste) để dán quyền

---

### 6. Nhấn "Lưu"

**Quy trình:**
1. Sau khi dán quyền xong → Nhấn vào **icon Lưu** (icon đĩa mềm)
2. Hệ thống hiển thị tooltip xác nhận: **"Lưu quyền đã chọn cho người dùng tương ứng"**
3. Thanh trạng thái cập nhật: "Chức năng sử dụng (0/74)" → sau khi lưu cho user mới

---

### 7. Tổng kết mô hình phân quyền RIS

| Vai trò | User mẫu | Quyền chính | Không có quyền |
|---------|----------|-------------|----------------|
| Người thực hiện kỹ thuật (chụp) | "Chup" / "Chụp Chụp" | Cập nhật: CT Scan, Camera Net, Siêu âm (AImage Controls, OmniShow, Video), MRI, Nội soi | Đọc/trả kết quả độc lập |
| Người đọc, trả kỹ thuật (doc) | "doc" / "Đọc Đọc" | Cập nhật: X-quang, CT Scan, MRI | Capture/acquisition |

**Nguyên tắc phân quyền:**
- Quyền được cấu hình theo **cây quyền 2 cấp**: Báo cáo (thống kê) và Cập nhật (thực hiện nghiệp vụ)
- Mỗi modality (X-quang, CT Scan, MRI, Siêu âm, Nội soi...) là một node quyền riêng trong "Cập nhật"
- Sử dụng **user mẫu** (doc/chup) để sao chép quyền nhanh cho nhiều nhân viên
- Workflow: Tìm user mẫu → Sao chép quyền → Tìm user thật → Dán quyền → Lưu
- Thanh trạng thái luôn hiển thị số quyền đã cấp / tổng số quyền hệ thống (VD: 3/74, 0/74)

**Các icon toolbar quan trọng trong QUẢN LÝ NGƯỜI DÙNG:**
- Icon tìm kiếm (kính lúp) — tìm user
- Icon sao chép quyền — copy quyền từ user đã chọn
- Icon dán quyền (paste) — dán quyền vào user đích
- Icon lưu (đĩa mềm) — lưu quyền đã cấp

---

## Part 3: Khai báo CĐHA nhập tường trình PTTT (Surgery Report)

### Tổng quan

Tài liệu "Khai báo CĐHA nhập tường trình PTTT" hướng dẫn cách khai báo để kỹ thuật viên/bác sĩ CĐHA có thể nhập nội dung tường trình Phẫu thuật - Thủ thuật (PTTT) ngay trong màn hình trả kết quả CĐHA.

**Tiêu đề tài liệu:** Khai báo dịch vụ CĐHA nhập tường trình PTTT

---

### 1. Cách vào màn hình khai báo

**Đường dẫn:**
1. Vào **RIS – Chẩn đoán hình ảnh**
2. Menu bar → **Tiện ích** → **Danh mục** → **"Danh mục giá viện phí thực hiện chẩn đoán hình ảnh"**

**Chi tiết menu Danh mục (quan sát từ radiology_02.png):**
- Loại chẩn đoán hình ảnh
- Máy thực hiện
- Kỹ thuật thực hiện chẩn đoán hình ảnh ← **mục này**
- Hình thức thực hiện
- Danh mục chụp / nội soi
- Phòng thực hiện
- Nhóm phòng thực hiện
- Mẫu hồ sơ
- Kết quả
- Nhiều phòng cùng số thứ tự

**Mục cần chọn cụ thể:** "Danh mục giá viện phí thực hiện chẩn đoán hình ảnh"

---

### 2. Màn hình "Ảnh ba Giá Viện Phí"

**Tiêu đề màn hình:** ẢNH BA GIÁ VIỆN PHÍ (quan sát từ surgery_02.png)

**Bố cục màn hình:**
- **Panel trái**: cây danh mục loại CĐHA để lọc (Nội soi, Siêu âm, ...)
- **Panel phải — Grid chính**: danh sách dịch vụ CĐHA với các cột:

**Các cột trong grid dịch vụ:**
| Cột | Mô tả |
|-----|-------|
| Mã dịch vụ | Mã tự sinh (VD: GL070017, GL070022...) |
| Tên dịch vụ | Tên đầy đủ của dịch vụ CĐHA |
| Tên dịch vụ (2) | Tên rút gọn / tên khác |
| Đơn vị tính | ĐV tính |
| Đơn giá | Giá dịch vụ (số) |
| Cột bổ sung | (thông tin giá bổ sung) |

**Dữ liệu mẫu quan sát được (nhiều dòng dịch vụ):**
- Nhiều dịch vụ CĐHA với mã GL0700xx
- Tên dịch vụ tiếng Việt đầy đủ
- Cột biểu tượng ở cuối mỗi dòng (icon nhỏ)

**Toolbar bên phải màn hình:**
- Các icon chức năng (quan sát icon ở góc phải)

---

### 3. Quy trình khai báo PTTT cho dịch vụ CĐHA

**Bước 1:** Vào RIS → Tiện ích → Danh mục → "Danh mục giá viện phí thực hiện chẩn đoán hình ảnh"

**Bước 2:** Chọn đúng loại CĐHA (Nội soi, Siêu âm, ...) ở panel trái

**Bước 3:** Tìm kiếm tên dịch vụ CĐHA ở khung tìm kiếm

**Bước 4:** Chọn dịch vụ CĐHA muốn khai báo PTTT → Nhấn vào **biểu tượng** (icon) tương ứng trên dòng dịch vụ đó

**Bước 5:** Tìm kiếm tên PTTT → Nhấn **"Enter"**

**Bước 6:** Nhấn **"Lưu"**

---

### 4. Kết quả sau khai báo

Sau khi khai báo xong:
- Khi kỹ thuật viên/bác sĩ CĐHA thực hiện trả kết quả dịch vụ đó, màn hình sẽ **tự động hiện thêm phần nhập tường trình PTTT**
- Bác sĩ có thể nhập đầy đủ tường trình phẫu thuật thủ thuật ngay trong màn hình CĐHA
- Dữ liệu tường trình PTTT được lưu liên kết với kết quả CĐHA của bệnh nhân

---

### 5. Lưu ý triển khai

- Chỉ những dịch vụ CĐHA **đã được khai báo liên kết PTTT** mới hiện phần nhập tường trình
- Dịch vụ CĐHA thường cần khai báo PTTT: Nội soi (dạ dày, đại tràng...), các thủ thuật can thiệp dưới hướng dẫn siêu âm, các phẫu thuật có gây mê/gây tê...
- Tên PTTT tìm kiếm ở bước 5 phải khớp với danh mục PTTT đã có trong hệ thống

---

## Phụ lục: Tóm tắt tất cả màn hình và đường dẫn menu

| Chức năng | Đường dẫn menu | Màn hình |
|-----------|----------------|---------|
| Khai báo loại CĐHA | Tiện ích → Danh mục → Loại chẩn đoán hình ảnh | KHAI BÁO LOẠI CHẨN ĐOÁN HÌNH ẢNH |
| Khai báo máy thực hiện | Tiện ích → Danh mục → Máy thực hiện | KHAI BÁO MÁY THỰC HIỆN |
| Khai báo mẫu mô tả | Tiện ích → Khai báo sử dụng → Mẫu 1 – Template | KHAI BÁO MẪU MÔ TẢ |
| Phân quyền chụp/đọc | Nghiệp vụ → Quản lý người dùng | QUẢN LÝ NGƯỜI DÙNG |
| Khai báo CĐHA nhập PTTT | Tiện ích → Danh mục → Danh mục giá viện phí thực hiện CĐHA | ẢNH BA GIÁ VIỆN PHÍ |

## Phụ lục: Các nút hành động chung toàn module

| Nút | Chức năng | Ghi chú |
|-----|-----------|---------|
| Mới | Tạo bản ghi mới | |
| Sửa | Chỉnh sửa bản ghi đã chọn | |
| Lưu | Lưu thông tin | |
| Bỏ qua | Hủy, không lưu thay đổi | Dùng khi không muốn lưu thông tin đã nhập hay sửa |
| Chọn | Xác nhận chọn item từ popup list | |

## Phụ lục: Các modality CĐHA trong hệ thống MQ RIS

| Modality | Tên tiếng Việt | Ghi chú quyền |
|----------|---------------|---------------|
| X-quang | X-quang | Quyền doc |
| CT Scan | Chụp cắt lớp vi tính | Quyền cả chụp và doc |
| MRI | Cộng hưởng từ | Quyền cả chụp và doc |
| Siêu âm | Siêu âm | Quyền chụp: AImage Controls, OmniShow, Video, Camera Net |
| Nội soi | Nội soi | Quyền chụp: AImage Controls, OmniShow |
| Camera Net | Camera Network | Quyền chụp |
| DirectShow | DirectShow | Sub-option của Siêu âm/Nội soi |
| Video | Video capture | Sub-option của Siêu âm |
