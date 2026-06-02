# Cấu hình khác — Sổ biên lai, Nhân sự, PACS Key Image
> Sources: 3 PDFs (4 + 5 + 7 = 16 pages)
> Extracted: 2026-06-01

---

## Part 1: Khai báo sổ biên lai (Receipt Book Configuration)

### 1.1 Tổng quan

Module: **VIỆN PHÍ — Khai báo sổ biên lai (Thu tiền)**

**Quy tắc khai báo:**
- Mỗi người thu tiền khai báo **2 quyển sổ**:
  1. Sổ thu tạm ứng
  2. Sổ thu viện phí
- Tên quyển sổ = tên của người đó **không dấu** → sổ thu viện phí
- Tên quyển sổ = tên của người đó **không dấu + "_TU"** → sổ thu tạm ứng
- Khi được cấp 2 quyển sổ trùng tên: dùng hậu tố `_TU` để phân biệt thu viện phí và thu tạm ứng

**Ví dụ danh sách quyển sổ** (hiển thị trong grid):
- Cột hiển thị: Ký hiệu, Tên sổ, Từ số, Đến số, Đang ghi đến, Còn lại, Ngày tạo, Người tạo

---

### 1.2 Luồng truy cập

**Bước 1:** Vào **Viện phi** → **Đăng nhập**
- Màn hình chính MQ HIS hiển thị các module dạng icon
- Chọn icon **Viện phí** (khu vực thu ngân)

**Bước 2:** Vào menu **Tiện ích** → **Khai báo sử dụng** → **Khai báo quyển sổ biên lai**
- Menu path: `Viện phí > Tiện ích > Khai báo sử dụng > Khai báo quyển sổ biên lai`
- Submenu còn có: Khóa sổ tới ngày (??/??/2024), Cấu hình bàn phím, Tùy chọn ngành dùng, Phân quyền sử dụng

**Bước 3:** Nhấn **"Mới"** để tạo quyển sổ mới

---

### 1.3 Thu tạm ứng — Quy trình khai báo

**Bước 4:** Nhập ký hiệu là tên người đó (không dấu) + `_TU` → nhấn **Enter**

**Bước 5:** Tên sổ sẽ tự động lấy thông tin nhập từ ô ký hiệu

**Bước 6:** Từ số → Nhấn **"1"**

**Bước 7:** Đến số → Nhấn **"999999"**

**Bước 8:** Chọn loại sử dụng → **"Tạm ứng"**

**Bước 9:** Lý do thu → **"Thu tạm ứng"**

**Bước 10:** Chọn người thu → Ứng với tên số đã khai báo

**Bước 11:** Tích chọn **"Khám bệnh"** với trạng thái **"Đang dùng"**

**Bước 12:** Nhấn **"Lưu"**

---

### 1.4 Thu viện phí — Quy trình khai báo

**Bước 4:** Nhập ký hiệu là tên người đó (không dấu, không hậu tố) → nhấn **Enter**

**Bước 5:** Tên sổ sẽ tự động lấy thông tin nhập từ ô ký hiệu

**Bước 6:** Từ số → Nhấn **"1"**

**Bước 7:** Đến số → Nhấn **"999999"** (hoặc **"99999"** tùy cấu hình)

**Bước 8:** Chọn loại sử dụng → **"THANH TOÁN VIỆN PHÍ"**

**Bước 9:** Lý do thu → **"Thu viện phí"** và **"Thu viện phí khoa chuyên"**

**Bước 10:** Chọn người thu → Ứng với tên sổ đã khai báo

**Bước 11:** Tích chọn **"Khám bệnh"** và **"Đang dùng"**

**Bước 12:** Nhấn **"Lưu"**

---

### 1.5 Dialog "Thông tin quyển sổ" — Chi tiết các trường

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Ký hiệu | Tên người thu (không dấu), có thể thêm `_TU` | `HUYNH THI HANH_TU` / `HUYNH THI HANH` |
| Tên sổ | Tự động điền từ ký hiệu | `HUYNH THI HANH_TU` / `HUYNH THI HANH` |
| Từ số | Số biên lai đầu tiên | `1` |
| Đến số | Số biên lai cuối cùng | `999 999` |
| Đang ghi đến | Số biên lai hiện tại đang sử dụng | `0` (mới khai báo) |
| Ngày bắt đầu | Ngày có hiệu lực | `21/11/2024` (có dropdown lịch) |
| Loại sử dụng | Checkbox multi-select — các loại sổ | Xem bên dưới |
| Lý do thu | Checkbox multi-select — mục đích thu | Xem bên dưới |
| Ngày phát hành | Ngày phát hành sổ | `21/11/2024` |
| Mã loại hóa đơn | Mã phân loại hóa đơn điện tử | (để trống hoặc nhập mã) |
| Tên loại hóa đơn | Tên phân loại hóa đơn | (để trống hoặc nhập tên) |
| Ký hiệu mẫu hóa đơn | Ký hiệu form mẫu | (để trống hoặc nhập) |
| Không khóa theo ngày Enth | Checkbox — không tự động khóa | Checkbox |
| HĐ điện tử | Checkbox — dùng hóa đơn điện tử | Checkbox |
| Điểm thu | Điểm thu tiền | `Thu Viện Phí` |
| Người thu | Tên nhân viên thu tiền | `Huỳnh Thị Hạnh` |

**Loại sử dụng (checkboxes):**
- HCDT (checkbox)
- THANH TOÁN VIỆN PHÍ (checkbox)
- TOA BÁN LẺ (checkbox)
- TAM ỨNG (checkbox)

**Lý do thu (checkboxes):**
- Thu trực tiếp
- Thu viện phí
- Thu viện phí khoa chuyên
- Thu tạm ứng
- Audit biên lai GTGT

**Tabs ở cuối dialog:**
- Dịch vụ | Tài liệu | Phiếu thu | Phiếu thu

**Trạng thái (tab cuối — radio buttons):**
- Chờ vào (radio)
- Tài trợ (radio)
- **Đang dùng** (radio, mặc định chọn)
- Phiếu thu (radio)

**Action buttons trong dialog:**
- Lưu (xanh lá — Save)
- Sửa (Edit)
- Xóa (Delete)
- Đối soát (Reconcile)

---

### 1.6 Danh sách quyển sổ — Grid columns

Grid "Danh sách đã khai báo" hiển thị:
- STT
- Ký hiệu
- Tên sổ (ví dụ: "Dương Thị Thảo Nguyên_TU", "Dương Thị Thảo Nguyên")
- Từ số / Đến số
- Các cột trạng thái (checkbox icons)
- Ngày tạo (định dạng DD/MM/YYYY)
- Người tạo (tên nhân viên)

**Vùng thông tin bổ sung bên phải (panel):**
- Đăng ký khai báo (checkbox section)
- Các tùy chọn phụ trợ

---

## Part 2: Quản lý nhân sự (HR Management)

### 2.1 Tổng quan hệ thống

**Module:** QUẢN LÝ NHÂN SỰ MQ HUMAN

**Màn hình chính — Hồ sơ nhân viên:**
- Giao diện dạng tab với 3 khu vực chính:
  1. **Số 1:** Giao diện hiển thị thông tin nhân viên
  2. **Số 2:** Các Menu hiệu chỉnh thông tin nội dung
  3. **Số 3:** Danh sách toàn bộ nhân viên

---

### 2.2 Hồ sơ nhân viên — Các tabs

#### Tab 1: Thông tin (Thông tin chi tiết cơ quan)

Màn hình **Thông tin chi tiết — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

**Phần đầu (header thông tin cơ quan):**
- Lưu ý về thay đổi nhân viên: hệ thống kiểm tra ngày thay đổi, so sánh tuổi, thông báo khi có điều kiện vi phạm (theo nội dung mô tả trong dialog thông tin)

**Bảng thông tin cơ quan (grid):**
| Cột | Mô tả |
|-----|-------|
| Loại vào số | Mã loại |
| Công chức, viên chức | Phân loại nhân sự |
| Ngày tuyển dụng | Ngày vào làm |
| Ngày vào so CBCC | Ngày vào cơ quan |
| Cơ quan tuyển dụng | Tên đơn vị tuyển dụng |
| Công việc chuyên môn được đào tạo | Mô tả vị trí chuyên môn |

**Phần thông tin chi tiết cơ quan (form):**
- Loại vào số / Công chức, viên chức (dropdown)
- Ngày tuyển dụng (date picker)
- Ngày vào so CBCC (date picker)
- Cơ quan tuyển dụng (text/dropdown)
- Công việc chuyên môn được đào tạo (text field)
- Lĩnh vực số (dropdown)
- Lý do (dropdown)
- Số quyết định (text)
- Ngày quyết định (date)
- Ngày hưởng (date)
- Hạn mức (số)
- Chức danh nghề nghiệp (dropdown)
- Giải thích số (text)
- Ngày nghỉ (date)
- Điểm số (number)

**Action buttons:**
- Mới | Sửa | Lưu | Xóa | Kết thúc

---

#### Tab 2: Thông tin tài sản

Màn hình **Thông tin tài sản — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

Tab kép: [Thông tin chi tiết, cơ quan] | **[Thông tin tài sản]** | [Thông tin phụ cấp]

**Loại tài sản: Bất động sản, hiện kim, hiện vật, tài sản cố định**

**Grid tài sản:**
| STT | Mã | Loại tài sản | Nội dung |
|-----|----|--------------|----------|
| 1 | 1 | Tài sản cố định | Xe BMW 320i 2013 (7 chỗ) |

**Form nhập tài sản:**
- STT | Mã | Loại tài sản (dropdown: "Tài sản cố định") | Nội dung (text: "Xe BMW 320i 2013 (7 chỗ)")

**Buttons:** Mới | Sửa | Lưu | Stt qua | Xóa | Kết thúc

---

#### Tab 3: Thông tin phụ cấp

Màn hình **Thông tin phụ cấp — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

**Loại phụ cấp: loại phụ cấp, cách thức, giá trị được phụ cấp, thời hạn phụ cấp...**

**Grid phụ cấp:**
| STT | Mã | Loại phụ cấp | Giá trị | Từ ngày | Đến ngày | Ghi chú |
|-----|----|--------------|---------|---------|----------|---------|
| 01 | 2 | Phụ cấp chức vụ | 0,30 | 01/01/2016 | 31/12/2020 | Công phức không TG BHTN |
| 02 | 2 | Phụ cấp thâm niên | hệ số 4 | 01/01/2016 | 31/12/2020 | |

**Form nhập phụ cấp:**
- Loại phụ cấp (dropdown: "Phụ cấp thâm niên" / các loại khác)
- Từ ngày / Đến ngày (date pickers)
- Giá trị (number)
- Ghi chú (text)
- Số quyết định (text)
- Ngày quyết định (date)

**Buttons:** Mới | Sửa | Lưu | Xóa | Kết thúc

---

### 2.3 Quá trình công tác — Chuyển bộ phận, lịch sử công tác

**Màn hình Chuyển bộ phận — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

Tabs: [Chuyển bộ phận] | [Lịch sử công tác]

#### Tab Chuyển bộ phận

**Grid lịch sử chuyển:**
| STT | Mã phòng cũ | Tên phòng cũ | Phụ Giám Đốc | Bộ phận mới | Chức vụ mới | Ngày chuyển | Số GĐ | Ngày GĐ | Người ký | Ghi chú |
|-----|-------------|--------------|--------------|-------------|-------------|-------------|-------|---------|---------|---------|
| 1 | (mã) | Ban Giám Đốc | Giám Đốc | Phòng Tổ chức cán bộ: Giám Đốc | | 01/07/2017 | | | | |
| 2 | 209 | Ban Giám Đốc | Giám Đốc | Phòng Tổ chức cán bộ: Giám Đốc | | 01/07/2017 | | | | |

**Form nhập chuyển bộ phận:**
- Mã phòng cũ | Tên phòng cũ | Phụ Giám Đốc (dropdown)
- Bộ phận mới (dropdown) | Chức vụ mới (dropdown)
- Ngày chuyển (date) | Số GĐ | Ngày GĐ
- Số quyết định (text) | Người ký (text)
- Ghi chú (text area)

**Buttons:** Mới | Sửa | Lưu | Stt qua | Xóa | Kết thúc

#### Tab Lịch sử công tác

**Grid lịch sử:**
| STT | Mã | Từ ngày | Đến ngày | Chức Vụ | Tổ chức thi gia | Ngày quyết định | Ngày hưởng | Điểm ngày | Ghi chú | Chi chú |
|-----|-----|---------|---------|---------|----------------|----------------|-----------|----------|---------|---------|
| (dữ liệu chi tiết về quá trình công tác) |

**Form chi tiết lịch sử:**
- Mã quan hệ (dropdown) | Mối quan hệ (text)
- Từ ngày / Đến ngày (dates)
- Chức vụ Thi gia (text/dropdown)
- Tổ chức thi gia (text)
- Số quyết định (text)
- Ngày quyết định (date)
- Ngày hưởng (date)
- Ghi chú (text)

---

### 2.4 Đào tạo — Bằng cấp, chuyên ngành, học vị

**Màn hình Quản lý đào tạo — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

**Grid đào tạo:**
| STT | Mã | Bằng cấp | Số hiệu | Chuyên ngành | Học vị | Trường | Ngày cấp | Năm khoa | Bằng chính | DV GĐ |
|-----|-----|----------|---------|--------------|--------|--------|----------|----------|-----------|-------|
| 1 | | Chuyên khoa II | | | Khác | | Cần Thơ | | | |

**Form nhập đào tạo:**
- Bằng cấp (dropdown: "Chuyên khoa II", các cấp khác)
- Số hiệu (text)
- Chuyên ngành (dropdown)
- Học vị / Bằng (dropdown)
- Trường (text)
- Tên bằng (dropdown)
- Ngày cấp → Bậc ổn II (date)
- Bặc ổn II (checkbox)
- Ngày cấp bằng (date)
- Tên bậc trung (text)
- Kế hoạch đào tạo: Tự lực (checkbox)
- Ghi chú (text)
- Đơn vị sổ học / Bằng chính (checkbox)

**Buttons:** Lưu | Sổ quá | (các button action khác)

---

### 2.5 Gia đình — Bản thân — Đoàn thể

**Màn hình Bản thân — Gia đình — Đoàn thể — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

Tabs: [Quan hệ gia đình] | [Thành gia tổ chức: Chính trị - Xã Hội, Nghề Nghiệp] | [Lịch sử bản thân]

#### Tab Quan hệ gia đình

**Grid thành viên gia đình:**
| STT | Mã | Họ tên | Năm sinh | Nghề nghiệp | Quan hệ | Địa chỉ |
|-----|-----|--------|----------|-------------|---------|---------|
| 1 | 74 | Mã tổ chức: Chính trị - Xã Hội, Nghề Nghiệp | | Con | | |

**Form nhập quan hệ gia đình:**
- Mã quan hệ (dropdown: "Con") | Tên (text: "Mã Văn Phúc")
- Năm sinh (text/dropdown: có combobox "Việt Nam") | Giới tính (radio: Nam)
- Quốc tịch (text) | Quê quán (text/dropdown)
- Nghề nghiệp (text/dropdown)
- Chức danh (text)
- Chức vụ (text)
- Số điện thoại (text) | Ghi chú (text)
- Phụ thuộc (checkbox)

**Buttons:** Mới | Lưu | Sổ quá | Xóa

#### Tab Lịch sử bản thân

**Grid:**
| STT | Mã | Mối quan hệ | Từ ngày | Đến ngày | Nội dung |
|-----|-----|-------------|---------|----------|---------|
| 1 | 1 | Trước khi được tuyển dụng | 01/01/2015 | 01/01/2015 | phó ban thường trực tỉnh Sở Y Tế |
| 2 | 2 | Sau khi được tuyển dụng | 02/01/2015 | 01/01/2017 | Trưởng phòng Kế hoạch Tổng hợp BV đa khoa Tỉnh Bạc Liêu |

**Form nhập:**
- Mã (text) | Nội dung (text: "phó ban thường trực tỉnh Sở Y Tế")
- Từ ngày (date) | Đến ngày (date)
- Ghi chú (text)

#### Tab Đoàn thể (tab con trong Quan hệ gia đình)

**Grid đoàn thể:**
| STT | Mã | Từ ngày | Đến ngày | Chức Vụ | Tổ chức thi gia | Ngày quyết định | Ngày hưởng | Ghi chú |
|-----|-----|---------|---------|---------|----------------|----------------|-----------|---------|
| 1 | | 01/01/2016 | 01/01/2017 | | Tổ chức thi gia Tỉnh Bạc Liêu | | 01/01/2016 | 0 |

---

### 2.6 Kỷ luật và Khen thưởng

**Màn hình Đánh Giá — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

**Nội dung khen thưởng hay kỷ luật**

**Grid khen thưởng/kỷ luật:**
| STT | Mã | Quyết định | Ngày kỳ | Lý do | Cấp KT-KL | Nội dung khen thưởng | Hình thức KT-KL | Ngành Kỳ QĐ |
|-----|-----|-----------|---------|-------|-----------|--------------------|-----------------|---------| 
| 1 | 3 | 51/QĐ-SYT | 19/10/2013 | Hoàn thành nhiệm vụ năm 2012 | Sổ | Sở Y tế Bạc Liêu | Giấy khen | |
| 2 | 4 | 61/QĐ-SYT | 24/02/2014 | Hoàn thành nhiệm vụ năm 2013 | Sổ | Sở Y tế Bạc Liêu | Giấy khen | |
| 3 | 5 | 62/QĐ-SYT | 13/05/2015 | Hoàn thành nhiệm vụ năm 2013 | Sổ | Sở Y tế Bạc Liêu | Giấy khen | |
| 4 | 6 | 110/QĐ-SYT | 05/03/2016 | Hoàn thành nhiệm vụ năm 2015 | Sổ | Sở Y tế Bạc Liêu | Giấy khen | |
| 5 | 7 | 837/QĐ-SYT | | Hoàn thành nhiệm vụ năm 2016 | Sổ | Sở Y tế Bạc Liêu | Giấy khen | |
| 6 | | 30/QĐ-YT | 03/03/2016 | Hoàn thành nhiệm vụ năm 2001-05 | Sổ | SYT BL | Giấy khen | |
| 7 | | 31/QĐ-YT | 22/01/2003 | Công nhận danh hiệu CSTĐCS năm 2001 | Sổ | SYT BL | Giấy khen | |
| 8 | | 380 | 18/01/2004 | Công nhận danh hiệu CSTĐCS năm 2002 | Sổ | SYT BL | Giấy khen | |
| 9 | | 379 | 19/01/2004 | Công nhận danh hiệu CSTĐCS năm 2003 | Sổ | SYT BL | Giấy khen | |
| 10 | | 381 | 06/02/2005 | Công nhận danh hiệu CSTĐCS năm 2004 | Sổ | SYT BL | Giấy khen | |
| 11 | | 381 | 34/02/2005 | Công nhận danh hiệu CSTĐCS năm 2005 | Sổ | SYT BL | Giấy khen | |
| 12 | | 382 | 06/02/2006 | Công nhận danh hiệu CSTĐCS năm 2006 | Sổ | SYT BL | Giấy khen | |
| 13 | | 384/QĐ-SYT | 21/11/2009 | Công nhận danh hiệu CSTĐCS năm 2008 | Sổ | SYT BL | Giấy khen | |

**Form nhập khen thưởng/kỷ luật:**
- Đơn vị 1 Sổ (Bạc Liêu) (dropdown) | Danh hiệu (dropdown)
- Tên KT-KL (text) | Ghi chú (text)
- Tên thứ dùng (dropdown) | Ghi chú (text)
- Người kỳ quyết định (dropdown: "Đanh hiệu Sổ Bạc Liêu")
- Tên hình thức: Giấy khen (dropdown)
- Lưu | Lưu dụng | Tên hình thức dùng

**Tabs bổ sung:**
- Đơn vị 1 Sổ (Bạc Liêu): Danh hiệu
- Tên Tên liên (dropdown) | Lưu thứ hình thức (dropdown)

---

### 2.7 Quản lý Quá Trình Lương

**Màn hình Quản Lý Quá Trình Lương — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

**Grid quá trình lương:**
| STT | Mã ngạch | Ngạch | Ngày hưởng lương | Ngày vào số nâng lương | Ngày vào nâng lương | Bậc | Hệ số | PC/VK | CL0L |
|-----|----------|-------|-----------------|----------------------|--------------------|----|-------|-------|------|
| 1 | V.00.01.02 | Bác sĩ nhóm | 01/01/2014 | 03/01/2014 | | 01/01/2014 | 5 | 5.76 | 0 |
| 2 | V.00.01.02 | Bác sĩ nhóm | 01/01/2016 | | | 01/01/2016 | | | |

**Form nhập lương:**
- STT | Mã ngạch | Chức vụ thi bổ (dropdown)
- Ngày hưởng (date) | Từ bậc (number)
- Ngày vào nâng lương (date) | Đến bậc (number)
- Chênh lệch bảo lưu lương (date) | Thời gian nâng lương (number)
- Hạn mức / Bậc nâng lương (dropdown)
- Ngày xét nâng lương: 01/03/2017 | Từ Số (text) | Số nghị định (text) | Nhóm ngạch

---

### 2.8 Tài khoản ngân hàng

**Màn hình TÀI KHOẢN NGÂN HÀNG — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

**Grid tài khoản:**
| STT | Mã | Tên ngân hàng | Chủ nhân | Số tài khoản | Ghi chú |
|-----|-----|--------------|---------|--------------|---------|
| 1 | 1 | Đông Bank: ĐAB Bạc Liêu | (chủ nhân) | 01012546T3 | |

**Form nhập tài khoản:**
- Ngân hàng (dropdown: "Đông Bank, 000") | Chủ nhân (text: "Từu Liêu")
- Số tài khoản (text: "01012546T3")
- Ghi chú (text)
- Checkbox: Cấu nhật thông tin lên tài khoản

**Buttons:** Mới | Sửa | Lưu | Xóa | Kết thúc

---

### 2.9 Thông tin hợp đồng

**Màn hình HỢP ĐỒNG — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

**Grid hợp đồng:**
| STT | Mã | Mã hợp đồng | Ngày ký | Thời hạn | Ngày hết hạn | Trạng thái | Xử lý | Lý do | Ngày XL | Loại cam kết |
|-----|-----|------------|---------|---------|-------------|----------|-------|-------|---------|------------|
| 1 | | Hợp đồng lao động vào | 10/02/1989 | 0 | | Còn hạn | | | | Công thức |

**Form nhập hợp đồng:**
- Ngày ký (date: "10/02/1989") | Thời hạn 20 (number)
- Ngày hết hạn (date) | Loại cam kết (dropdown: "Đồng Bảo Mật Thông Tin")
- Tên hợp đồng (text: "Hợp Đồng Làm Việc") | Thời hạn → Ngày Kỳ:20 | Ngày kết thúc
- Hồ dụng (text) | Số quyết định (text: "#2020L-HLVSY")
- Ngày dụng (date)

**Buttons:** Mới | Sửa | Lưu | Xóa | Kết thúc

---

### 2.10 Thông tin BHXH — BHYT

**Màn hình BHXH — BHYT — Mã số: 00001 — Họ tên: MÃ QUỐC THIÊN**

**Grid BHXH/BHYT:**
| STT | Mã | Số BHXH | Số BHYT | Ngày cấp | Ngày dùng | Mã KCB | Mã KCB |
|-----|-----|---------|---------|---------|---------|--------|--------|
| 1 | | 1096002018 | | 01/01/2017 | 01/01/2017 | | |

**Form nhập BHXH/BHYT:**
- Ngày cấp số (date: "01/01/2017") | Ngày đóng (date)
- Số BHXH (text: "1096002018") | Mã Nội KCB (dropdown)
- Đến ngày KCB (date)
- Số bảo hiểm xã hội: "1096002018"
- Checkbox: Ẩn thông tin

**Buttons:** Mới | Sửa | Lưu | Xóa | Kết thúc

---

### 2.11 Cấu trúc màn hình chính Hồ sơ nhân viên

**Tab bar (Số 2 — menu hiệu chỉnh):**
Màn hình lý lịch nhân viên có thanh tab chứa các nhóm chức năng:
1. Thông tin (cơ bản, tài sản, phụ cấp)
2. Công tác (chuyển bộ phận, lịch sử)
3. Đào tạo (bằng cấp, học vị)
4. Gia đình (quan hệ, đoàn thể, bản thân)
5. Khen thưởng / Kỷ luật
6. Lương (quá trình lương)
7. Ngân hàng (tài khoản)
8. Hợp đồng
9. BHXH / BHYT

**Thanh công cụ (toolbar) Số 3 — Danh sách nhân viên:**
- Nút in (in danh sách)
- Nút xuất Excel
- Nút tìm kiếm / bộ lọc
- Thêm mới nhân viên

---

## Part 3: Tạo và in ảnh key từ Cloud (PACS Key Image)

### 3.1 Tổng quan hệ thống

**Hệ thống:** VRPACS V.2
**Nhà cung cấp:** Công ty Cổ phần Công nghệ C+
- Địa chỉ: Số 1, ngõ 31, đường 18M, Phường Mộ Lao, Quận Hà Đông, Thành phố Hà Nội
- Điện thoại: (+84) 982.603.805
- Email: contact@vrpacs.com
- Website: http://www.vrpacs.com

**Tài liệu:** Tài liệu hướng dẫn sử dụng VRPACS (V.2)

---

### 3.2 Phần I: Tạo ảnh key (Key Image)

#### Bước 1: Chọn bệnh nhân và mở ca chụp

**Luồng:**
1. Chọn bệnh nhân → Mở ca chụp → **Chọn ảnh cần tạo ảnh key**

**Có 2 cách tạo key image:**
- 1.1 Tạo key theo cả ảnh (toàn bộ)
- 1.2 Tạo key theo tỷ lệ **crop** (cắt vùng quan tâm)

**Giao diện VRPACS Viewer:**
- Phần mềm DICOM viewer hiển thị ảnh y tế (minh họa: ảnh vú — BREAST, Dynamic FatSap SAG Pro P)
- Thông tin bệnh nhân hiển thị: Age: 06/39, ngày chụp: 11/02/2024, 17:00:00.907
- Metadata DICOM: ECHELO.SH Smart, Dynamic FatSap SAG Pro P, BREAST, Image 14/98
- Thông tin kỹ thuật: Color, Matrix: 0/20/224/0, Echo time: 3.4 ms, Repetition time: 9.3 ms
- Slice thickness: 2 mm, Zoom 1:93, WW/WL: 2202/176

---

#### Bước 2: Tạo Crop Key

**Bước 2.1:** Chọn **Crop Custom**
**Bước 2.2:** Chọn **tỷ lệ muốn chọn** (lựa chọn tỷ lệ crop)
**Bước 2.3:** Click **Send to HIS**

**Minh họa:**
- Ảnh DICOM với vùng crop được đánh dấu
- Annotation "Chưa biết là gì" (nhãn annotation mẫu)
- Sau khi crop: measurement hiển thị "87.43 mm"

---

#### Bước 3: Xác nhận và lưu key image

**Sau khi tạo ảnh key xong:** Nhấn vào nút **Làm mới**

---

#### Bước 4: Ảnh key xuất hiện trong series keyimage

**Sau khi Send to HIS:**
- Ảnh key sẽ xuất hiện trong **seri ảnh keyimage** (series riêng trong DICOM viewer)
- Panel trái hiển thị metadata: Invalid date, Laterality, ImageLaterality, ViewPosition
- Image counter: 1/8 (ảnh đầu trong series 8 ảnh)
- Measurement annotation: "Chưa biết là gì" + "87.43 mm"
- Zoom: 1.00, WW/WL: 255/128

---

#### Bước 5: Xóa ảnh key

**Bước 5.1:** Chọn **Gallery** (tab Gallery trong panel trái)
**Bước 5.2:** Chọn ảnh muốn xóa → nhấn **Delete** → Thông báo xóa thành công

**Giao diện xóa:**
- Gallery panel hiển thị thumbnails của các key images
- Toolbar có nút: play, Delete (đỏ), forward
- Confirmation dialog: "Thông báo xóa thành công"

---

### 3.3 Phần II: Đọc duyệt có ảnh key

#### Bước 1: Chọn ảnh key và mẫu in

**Cách chọn ảnh:**
- Nhấn vào nhút → **chọn ảnh**
- Lưu ý: Chọn trước khi duyệt kết quả

**Giao diện duyệt (bên phải DICOM viewer):**
Dialog **Đọc kết quả** bao gồm:
- **Họ tên bệnh nhân** (text display)
- **Tuổi / Giới tính** (display)
- **Đối tượng BHYT** (display)
- **Mã bệnh viện** (display)
- **Chỉ định khám** (text area — nội dung chỉ định)
- **Thể tích:** (measurement field)
- **Kết quả:** (text area chính — nhập mô tả kết quả)
- **Kết luận:** (text area — nhập kết luận)
- **Đề xuất:** (text area — đề xuất điều trị)
- Buttons phía dưới: **Lưu** | **Cancel**

**Nội dung mẫu trong dialog đọc kết quả:**
- Phần mô tả kết quả: "Tuyến vú phải: tuyến vú bình thường, nhu mô tuyến vú không tăng sinh nhiều, độ sáng giảm..." (nội dung minh họa)
- Kết luận: "BI-RADS 2..." (kết quả phân loại BI-RADS)

---

#### Bước 2: Chọn ảnh trong Select Images

**Bước 2.1:** Trong phần **Select Images** — chọn những ảnh cần hiển thị:
- Lưu ý: dùng **chuột phải** để chọn hoặc bỏ chọn — hộp chọn, **số thứ tự** (thứ tự hiển thị trên phim in)

**Giao diện Select Images (panel phải trên):**
- Hiển thị thumbnails các ảnh DICOM: ảnh vú từ nhiều góc độ (frontal, lateral, MLO, CC)
- Thumbnails được đánh số thứ tự
- Có thể chọn nhiều ảnh cùng lúc bằng chuột phải

**Bước 2.2:** Sau đó chọn **Select template print(0)** → Chọn mẫu in 1
- Mẫu số 2 từ trái qua hàng trên:
  - 2.1: **Chọn mẫu 1**
  - 2.2: **Save**

---

#### Bước 3: Giao diện Select template print

**Màn hình Select template print:**
- Hiển thị 2 cột: [Select images] | [Select template print (1)]
- Phần trái: Danh sách thumbnails ảnh đã chọn
- Phần phải: Preview mẫu in với layout đã chọn (được highlight viền đỏ)

**Lưu ý quan trọng:**
> "Hệ thống sẽ lưu lại lần chọn mẫu đầu tiên và đối với máy đang dùng, sau khi sang máy khác sẽ chọn lại, ngược lại đối với những bệnh viện ko dùng ảnh key sẽ phải chọn lại mẫu nếu không không hiển thị được **Cannot template**"

**Mẫu phim in mẫu số 1 (preview):**

*Mẫu 1 (layout dọc — 4 ảnh):*
```
BỆNH VIỆN ĐA KHOA ABC               [barcode]
KHOA CHẨN ĐOÁN HÌNH ẢNH             Mã:12312521213

KẾT QUẢ SIÊU ÂM
Họ tên Nguyễn Văn A    Tuổi 20   Giới tính Nam
Địa chỉ ABC
Đối tượng BHYT
Chỉ định: ABC

Gan không to bình thường, nhu mô gan đều không tăng...
[Mô tả chi tiết kết quả]

Kết luận Phulys hướng - Siêu âm (mô - Hướng lái sau vi)
[4 ảnh DICOM nhỏ theo hàng ngang]
Hà Nội, ngày       tháng    năm
                   BÁC SĨ CHUYÊN KHOA
                   BS.CN.NGUYỄN MINH
```

*Mẫu 2 (layout tương tự với ảnh lớn hơn):*
- Layout giống Mẫu 1 nhưng ảnh DICOM được hiển thị lớn hơn và rõ hơn

---

#### Bước 4: In phiếu kết quả có ảnh key

**Sau khi duyệt như bình thường → In** — Phiếu in như hình dưới:

**Mẫu phiếu in thực tế:**

```
BỆNH VIỆN ĐA KHOA SẦN ĐÀN              [logo bệnh viện]
Địa chỉ: Thôn, Thôn Sầu — Tân Bình — Bắc Giang
Điện thoại: 0914.245.213

PHIẾU CHỤP CẮT LỚP VI TÍNH
Họ đệm:                    Tuổi: 70
Phổi:
Địa chỉ:

KẾT QUẢ

KỸ THUẬT: Chụp cắt lớp vi tính từ nền phổi đến đỉnh phổi. Cắt lớp 5mm. Tái tạo
các lớp 5 trên phổi ngang, mặt bên và mặt trước sau. Khoảng cách (inter-space) khoảng
6,3 mm và 4,5 mm phần khoảng và đo khoảng 6 mm. Tuyến thường thụ
nhưng co.

Phổi: Xẻ: Nhu mô phổi bình thường, nhu mô vùy bình thường. Không thể bệnh lý
thực thể. Không dầy phổi phổi. Không có nước màng phổi 2 bên. Tuyến thường không dầy.

[...]

Kết luận Phulys hướng - Siêu phổi mô - Hướng chỉnh sau vi
{Chú ý: dấu in màu hồng} Kết quả này chỉ có giá trị trong 6 tháng kể từ ngày ký.
                                       Bạc Liêu, 24 tháng 03 năm 2014
                                       Kết luận bác sĩ: (chữ ký + họ tên)

[2 ảnh DICOM phim X-quang/CT kích thước lớn]
```

**Trang 2 của phiếu in:**
- Tiêu đề: **PHIẾU CHỤP CẮT LỚP VI TÍNH** (lặp lại header)
- Phần ảnh: 2 ảnh DICOM kích thước lớn (ảnh vú/ngực từ PACS cloud)
- Header: BỆNH VIỆN ĐA KHOA SẦN ĐÀN + logo + địa chỉ

---

### 3.4 Workflow tổng hợp PACS Key Image

```
1. Chọn bệnh nhân trong HIS/PACS
      ↓
2. Mở ca chụp trong VRPACS Viewer
      ↓
3. Duyệt ảnh DICOM — Chọn ảnh muốn đánh dấu là key image
      ↓
4a. Tạo key toàn ảnh: (không crop)
    → Click Send to HIS
4b. Tạo key theo crop:
    → Crop Custom → Chọn tỷ lệ → Send to HIS
      ↓
5. Ảnh key xuất hiện trong series "keyimage" riêng
      ↓
6. Nhấn "Làm mới" để refresh
      ↓
7. Mở dialog Đọc kết quả
      ↓
8. Nhấp vào ảnh → chọn ảnh cần in (chuột phải để chọn/bỏ chọn)
      ↓
9. Select template print → chọn mẫu in (Mẫu 1)
      ↓
10. Save → In phiếu kết quả có ảnh key
```

---

### 3.5 Lưu ý kỹ thuật PACS

- **Hệ thống lưu mẫu in:** Mẫu được lưu theo máy — khi chuyển sang máy khác phải chọn lại
- **Bệnh viện không dùng ảnh key:** Nếu không chọn lại mẫu sẽ hiện lỗi **"Cannot template"**
- **Chuột phải:** Dùng để chọn/bỏ chọn ảnh trong Select Images (không phải chuột trái)
- **Số thứ tự ảnh:** Quyết định vị trí ảnh trên phim in
- **Xóa key image:** Dùng chức năng Gallery → chọn ảnh → Delete
- **Series keyimage:** Ảnh key được lưu thành một series DICOM riêng, tách biệt với ảnh gốc

---

### 3.6 Tích hợp với HIS

- **Send to HIS:** Nút gửi ảnh key từ VRPACS Viewer sang module RIS/PACS của HIS
- **Liên kết bệnh nhân:** Qua mã bệnh nhân / accession number của ca chụp
- **Đọc kết quả trong HIS:** Dialog đọc kết quả tích hợp trực tiếp trong viewer (panel phải)
- **In từ HIS:** Phiếu kết quả được in từ module in ấn của HIS với template đã cấu hình

---

*Hết tài liệu*
