# HDSD Desktop EMR — Part 2 (Pages 36-70)
> Source: HDSD_DesktopEMR.pdf
> Extracted: 2026-06-01

---

## Tổng quan nội dung Part 2

Part 2 bao gồm:
- Phần cuối của **Phần 1 — Các phiếu/tờ điều trị** (phiếu 1.32–1.47)
- **Phần 2 — Các hồ sơ bệnh án** (BA 2.1–2.11): nội khoa, ngoại khoa, nhi khoa, phụ khoa, sản khoa, sơ sinh, tai mũi họng, truyền nhiễm, răng hàm mặt, mắt (chấn thương), mắt (bán phần trước)

---

## PHẦN 1 (tiếp theo) — CÁC PHIẾU / TỜ ĐIỀU TRỊ

---

### 1.32. Phiếu phẫu thuật ghép giác mạc
**Trạng thái:** "Cập nhật sau"

---

### 1.33. Phiếu phẫu thuật bề mặt nhãn cầu
**Trạng thái:** "Cập nhật sau"

---

### 1.34. Phiếu phẫu thuật Glocom
**Trạng thái:** "Cập nhật sau"

---

### 1.35. Phiếu phẫu thuật lác
**Trạng thái:** "Cập nhật sau"

---

### 1.36. Phiếu phẫu thuật túi lệ
**Trạng thái:** "Cập nhật sau"

---

### 1.37. Phiếu phẫu thuật sụp mi, mộng, thể thuỷ tinh, Sapejko
**Trạng thái:** "Cập nhật sau"

---

### 1.38. Phiếu theo dõi điều trị

#### Đường dẫn mở (3 cách)

**Cách 1:** Nội trú → Hiện diện → Bệnh án EMR → Nội trú

**Cách 2:** Trong danh sách bệnh án nội trú, mở hồ sơ bệnh án → cột bên trái (Hành chính / Bệnh...) → nhóm **"STT Gáy: 9 ; Gáy: Phiếu điều trị"** → dòng **"Phiếu điều trị"** → nhấn nút `+` (thêm)

Danh sách các tờ/phiếu hiển thị trong cột bên trái của bệnh án (toàn bộ danh sách quan sát được):
| STT | Tên phiếu/giấy |
|-----|----------------|
| 0 | Giấy chuyển tuyến |
| 0 | Giấy chứng nhận PTTT |
| 0 | Giấy chứng sinh |
| 0 | Giấy ra viện |
| 0 | Mẫu khám sức khỏe |
| 0 | Phiếu khám chuyên khoa |
| 0 | Toa thuốc F3, F5 |
| 0 | Đánh giá dinh dưỡng UMC CS2 |
| 0 | Đánh giá dinh dưỡng nhi UMC |
| 0 | Đánh giá dinh dưỡng phụ nữ mang thai UMC |
| **STT Gáy: 6 ; Gáy: Chỉ định** | |
| 0 | Phiếu chỉ định |
| **STT Gáy: 9 ; Gáy: Phiếu điều trị** | |
| 0 | **Phiếu điều trị** ← (được đánh dấu bằng mũi tên đỏ) |
| **STT Gáy: 13 ; Gáy: Hồ sơ kèm bệnh án** | |
| 1 | Căn cước công dân |

**Cách 3:** Nội trú → Hiện diện → Tiện ích → Bệnh án mới (115) → Tờ điều trị

Menu Tiện ích (Cách 3) — danh sách đầy đủ các chức năng:
1. Biên bản hội chuẩn gây nghiền
2. Biên bản hội chuẩn thường
3. Tờ cam kết sơ cứu
4. Giấy xác nhận nằm viện
5. Biên bản nội khoa
6. Phiếu thao tác và chăm sóc người bệnh cấp I
7. Tích biên bản kiểm điểm tử vong
8. Biên bản và đặc điểm nguồn gốc thuốc
9. Phiếu công khai số lượng thuốc & dịch vụ
10. Bảng kiểm an toàn trước truyền máu
11. Phiếu truyền dịch
12. Phiếu tự đánh giá đau sức khỏe
13. Phiếu đánh giá tình trạng dinh dưỡng
14. Phiếu đánh giá giá một dây chứng loét
15. Biên bản hội chuẩn phẫu thuật
16. Biên bản hội chuẩn
17. Phiếu khám chuyên khoa
18. Phiếu khám tiêu hóa
19. **Tờ điều trị** ← (mục số 19, được highlight)

#### Nội dung tờ điều trị (Hình 1.38.4)

**Cấu trúc form "Tờ điều trị":**

**Header (phần đầu):**
- Thông tin hành chính của bệnh nhân (hiển thị tự động)
- Tên bác sĩ phụ trách và dấu hiệu sinh tồn

**Phần CÁC ĐỢT ĐIỀU TRỊ** (bảng danh sách):
| Cột | Mô tả |
|-----|-------|
| Số | Số thứ tự đợt |
| Ngày | Ngày giờ đợt điều trị |
| Bác sỹ | Tên bác sĩ phụ trách (VD: BSCKII. Nguyễn Thị Thư) |
| Loại | Loại điều trị (VD: Thường quê) |

*Ví dụ dữ liệu:*
- Đợt 1: 28/08/2025 10:45 — BSCKII. Nguyễn Thị Thư — Thường quê
- Đợt 1: 28/08/2025 10:48 — BSCKII. Nguyễn Thị Thư — Thường quê

**Tab "Diễn biến bệnh"** (Hình 1.38.5):
- Ô text lớn để nhập diễn biến bệnh tự do
- Có thể lấy mẫu từ mẫu sẵn trước, hoặc chọn mẫu để áp dụng cho những lần sau (nút **Mẫu** — icon hình mẫu)

**Tabs trên form:**
- **Phóng to** | **Sửa diễn biến** | **Mẫu** | **CLS**

**Tab "CLS" — Kết quả cận lâm sàng** (Hình 1.38.6):
Bảng danh sách xét nghiệm CLS đã thực hiện:
| Cột | Mô tả |
|-----|-------|
| Ngày CLS | Ngày thực hiện |
| Tên CLS | Tên xét nghiệm/cận lâm sàng |
| Kết quả | Giá trị kết quả |
| Chỉ số | Đơn vị/chỉ số tham chiếu |

*Ví dụ dữ liệu kết quả:*
- 28/08/2025 09:15 — aXPE — RBC trung bình: 40 — x/μgL
- 28/08/2025 10:03 — Sinh hóa Glucose — RBC trung bình: 5/1 — mg/dL
- 28/08/2025 10:48 — So hoá Glucose — RBC trung bình: 7 — mg/dL
- 28/08/2025 00:00 — So hoá đo ALT (GPT) — (giá trị)
- 28/08/2025 00:00 — So hoá đo ALT (GPT) — (giá trị)

**Phần thông tin chẩn đoán bệnh:**
- Chẩn đoán: [mã ICD dropdown] — [tên bệnh]
- Ghi chú CD:
- CD Kèm theo: [dropdown]
- Ghi chú CDKT: [ô nhập + nút mở rộng]

Bảng chẩn đoán kèm:
| Cột | Mô tả |
|-----|-------|
| Xóa | Checkbox xóa |
| TT | Thứ tự |
| Mã ICD | Mã bệnh ICD-10 |
| Chẩn đoán | Tên bệnh |
| Ghi chú | Ghi chú thêm |

*Ví dụ:*
- 1: K40 — Thoát vị bẹn
- 2: K30 — Khó tiêu chức năng

**Phần chỉ định CLS và thông tin về các chế độ chăm sóc, nhóm tuổi, thức ăn:**

**Phần các y lệnh thuốc cho các đợt điều trị:**
Bảng y lệnh:
| Cột | Mô tả |
|-----|-------|
| STT | Số thứ tự |
| Tên thuốc | Tên thuốc/dịch vụ |
| Liều dùng | Liều lượng |
| Đường dùng | Đường dùng thuốc |
| Thời hạn | Thời hạn sử dụng |
| Trạng thái | Trạng thái y lệnh |

**Các nghiệp vụ:** thêm, sửa, hủy, in, ...

---

### 1.39. Phiếu chăm sóc cấp 1

#### Đường dẫn
Nội trú → Hiện diện → Tiện ích → In giấy → **Phiếu chăm sóc cấp 1 – TT32**

*(Cũng có thể mở qua: Nội trú → NGOÀI TỔNG HỢP → Nhập viện → Hiện diện → menu Tiện ích → In giấy → Phiếu chăm sóc cấp 1 – TT32)*

#### Nội dung phiếu chăm sóc cấp 1 (Hình 1.39.2)

**Header:**
- Họ tên: [tên bệnh nhân]
- Mã BN: [mã số]
- Ngày sinh: [ngày/tháng/năm]
- Giới: [Nam/Nữ]
- Khoa: [tên khoa]
- Phòng: [số phòng]

**Phần bên phải header:**
- Mã hồ sơ:
- Ngày nhập: [ngày/tháng/năm]
- Ngày xuất: [ngày/tháng/năm]
- Số ngày nằm:
- Loại:

**Nội dung chính của phiếu:**
- Thông tin hành chính của bệnh nhân
- Khung bên phải: Thông tin các phiếu chăm sóc của bệnh nhân đã tạo
- Thông tin về các dấu hiệu sinh tồn của bệnh nhân
- Các nghiệp vụ của bệnh nhân

---

### 1.40. Phiếu chăm sóc cấp 2 (update sau)

#### Đường dẫn
Nội trú → Hiện diện → Tiện ích → In giấy → **Phiếu chăm sóc cấp 2 – TT32**

#### Nội dung phiếu chăm sóc cấp 2 (Hình 1.40.2)

Giống như phiếu chăm sóc cấp 1, có các nội dung chính:
- Thông tin hành chính của bệnh nhân
- Khung bên phải: Thông tin các phiếu chăm sóc của bệnh nhân đã tạo
- Thông tin về các dấu hiệu sinh tồn của bệnh nhân
- Các nghiệp vụ
- Chọn mẫu phiếu và thay đổi thành phiếu chăm sóc cấp 2

**Form chi tiết phiếu chăm sóc cấp 2 (Hình 1.40.2):**

**Header form:**
- Họ tên: CÂYTỪ75 | Họ tên: NGUYỄN 17 | Ngày: 01/03/2025 11:00 | Ngày: 11/03/2025 03:00
- Tuổi: | Mã BN: | Phòng khoa: Khoa Hồi Sức Tổng Hợp
- Chẩn đoán: [tên bệnh]
- Lần nhập thứ: | Phiếu chăm sóc cấp: 2

**Các phần trong form:**
- **Mục lâm sàng:**
  - Ý thức: (điểm số)
  - Hô hấp (tần số):
  - Tư thế nằm:
  - Da, niêm mạc:
  - Tình trạng ăn uống:
  - Tình trạng bài tiết:
  - Tình trạng vận động:
  - Dấu hiệu đặc biệt:
  - Thực hiện y lệnh:
  - Chăm sóc vệ sinh:
  - Tình trạng bệnh nhân:
  - GCS (điểm):
  - Mạch (lần/phút):
  - Huyết áp (mmHg):
  - Nhiệt độ (°C):
  - SpO2 (%):
  - Cân nặng: (kg)
  - Chiều cao nằm đường (CS2): (cm)
  - Huyết động ổn định: (Có/Không)
  - Vị trí, giờ phát hiện biến đổi đường huyết (TV): [text]
  - **Chức năng:** [ô nhập tự do]

**Nút lệnh cuối form:**
- Thêm | Sửa | Xóa | Lưu | In | Phóng | Đóng

---

### 1.41. Phiếu nhận định phân loại người bệnh tại khoa cấp cứu

#### Đường dẫn
**Phòng lưu > nghiệp vụ > Biên bản > Phiếu nhận định phân loại người bệnh tại khoa cấp cứu**

*(Hình 1.41.1)*

#### Nội dung phiếu (Hình 1.41.2)

**Header form:**
- Họ BN: [tên]
- Mã BN: [mã]
- Ngày sinh: [ngày/tháng/năm]
- Tuổi: [số]
- Phòng: [tên phòng]
- Họ tên bác sĩ: TRƯƠNG NGỌC LONG
- Giới:
- Loại: [dropdown]

**Bảng danh sách dấu hiệu sinh tồn:**
| Cột | Mô tả |
|-----|-------|
| Ngày | Ngày ghi nhận |
| Giờ | Giờ ghi nhận |
| LF | Lần khám |
| Phach/Pl | Phách/Phân loại |
| Huyết áp | Chỉ số huyết áp |
| Nhịp thở | Lần/phút |
| Nhiệt độ | °C |
| SpO2 | % |
| Thuong điểm | Điểm thương tích |

*Ví dụ dữ liệu:*
- 24/10/2025 09:37 — 33 — 35 — 45/200 — 20 — 4 — (giá trị)
- ... (các dòng tiếp theo)

**Phần thông tin chi tiết (dưới bảng):**
- Tải ngọt: [dropdown] | Tính Mạch: bình thường | Mạch không đều: bình thường
- Hô hấp: bình thường | Tình Mạch: | Màu thở: không thường | Kiểu thở: bình thường
- Bất tỉnh: không | Huyết áp chuyển khoa: không
- Chuyển Khoa khác: không | Lý do: [text]
- Ngườ phụ trách bình đặt khoa: 01/10/2023 | Ngừơi nhận bình đặt: [text]
- Mã phân loại: [số]

**Thanh công cụ chính nằm dưới form**

**Nội dung chính bao gồm:**
- Thông tin hành chính của bệnh nhân
- Danh sách các phiếu đã được nhập
- Bảng dấu hiệu sinh tồn của bệnh nhân. Nhấn **Thêm** để thêm dấu hiệu sinh tồn cho bệnh nhân, các thông tin đã thêm sẽ được hiển thị tại bảng bên phải. Ngoài ra, người dùng có thể sửa thông tin, xóa thông tin.
- Thanh công cụ chính nằm dưới form

---

### 1.42. Giấy cung cấp thông tin và cam kết chung về nhập viện nội trú

#### Đường dẫn
**Nội trú → Hiện diện → Bệnh án → Phiếu cam kết nhập viện nội trú**

*(Hình 1.42.1 — mở từ danh sách bệnh án, trong nhóm phiếu)*

#### Nội dung (Hình 1.42.2)

**Nội dung chính bao gồm:**
- Bảng danh sách các phiếu đã được lập
- Thông tin hành chính của bệnh nhân
- Nhập thông tin của người khai báo

**Phần nhập liệu chi tiết:**
- Cơ sở y tế: [text]
- Số hồ sơ: [text]
- Ngày: [date]
- Các giấy tờ liên quan: [danh sách]
- Thông tin người khai báo: họ tên, quan hệ với bệnh nhân, địa chỉ, số CCCD, số điện thoại
- Ký xác nhận (chữ ký điện tử)

---

### 1.43. Giấy cam kết từ chối sử dụng dịch vụ khám bệnh, chữa bệnh
**Trạng thái:** "Cập nhật sau"

---

### 1.44. Giấy cam kết chuyển cơ sở khám bệnh, chữa bệnh
**Trạng thái:** "Cập nhật sau"

---

### 1.45. Giấy cam kết ra viện không theo chỉ định của bác sĩ (Khi chưa kết thúc việc chữa bệnh)
**Trạng thái:** "Cập nhật sau"

---

### 1.46. Phiếu điều trị trẻ sơ sinh sau sinh
**Trạng thái:** "Cập nhật sau"

---

### 1.47. Phiếu khám thai

#### Đường dẫn
**Nội khoa → Hiện diện → Bệnh án → Phiếu khám thai**

*(Hình 1.47.1)*

#### Cấu trúc form phiếu khám thai (nhiều trang)

**Tổng quan:** Form có nhiều trang (Trang 1, Trang 2, Trang 3, Trang 4)

---

#### Phiếu khám thai — Trang 1 (Hình 1.47.2)

**Tab điều hướng:** Trang 1 | Trang 2 | Trang 3 | Trang 4

**I. Thông tin lần khám trước:**
- [Ô text nhập]

**II. Hỏi bệnh:**

**2.1. Tiền sử bản thân:**
- Đã phẫu thuật: [Không / Có — dropdown]
- Chẩn đoán: [text]
- Bình thường (lúc thai phụ chưa biết): [ghi chú]

**2.2. Tiền sử bản thân (tiếp):**
- Đã phẫu thuật: Không | Có
- Chẩn đoán: [text]

**III. Hỏi bệnh (các thông tin):**
- Tình trạng sức khỏe: [text]
- Lần mang thai thứ: [số]
- Bình thường lúc thai phụ biết thai được bao lâu: [text + dropdown]

**IV. Tiền sử gia đình:**
- [Ô text]

**V. Thăm khám:**

**V.1 Dấu hiệu sinh tồn:**
- Đã khám: Không / Có
- Chiều cao (cm): [số]
- Cân nặng (kg): [số]
- BMI: [số tự tính]
- Số lần mang thai: [số]
- Số con hiện có: [số]
- Huyết áp (mmHg): [số] / [số]
- Nhịp tim (lần/phút): [số]

**Phần Thuốc đang dùng:**
- Tên sản phẩm thuốc: [dropdown + text]

---

#### Phiếu khám thai — Trang 2 (Hình 1.47.3)

**Tiếp theo của phần thăm khám:**

**Phần Phụ khoa:**
- Cổ tử cung: [Không / Có]
- Phân loại: [Nhu mô / Không phân loại / ...]
- Tình trạng phần phụ: Không có / Có
- Chiều cao tử cung: [Không / Có]
- Ngôi thai: [dropdown]
- Nghe tim thai: [Không / Có]
- Nhịp tim thai (lần/phút): [số]

**Phần Sản khoa:**
- Sức mạnh:
  - Không / Có
  - Cân nặng:
- Bình thường
- Tần số:
- Thời gian:
- Ngôi thai:
- Nghe tim thai: [Không / Có]
- Nhịp tim thai (lần/phút): [số]

**Phần Tim:**
- Nhịp tim thai: Không / Có
- Cân nặng: [số]
- Tim đều: Không / Có

**V. Các xét nghiệm/Cận lâm sàng:**

Bảng danh sách xét nghiệm với checkboxes:
| Cột 1 | Cột 2 | Cột 3 | Cột 4 |
|-------|-------|-------|-------|
| Xét nghiệm máu | Không/Có | Siêu âm | Không/Có |
| ... | ... | ... | ... |

Các mục cận lâm sàng (2 cột song song):
- Glucose máu: Không/Có | Tiểu đường thai kỳ: Không/Có
- Siêu âm Thai kỳ Glucose: Không/Có | Siêu âm Doppler: Không/Có
- RBG trung bình: Không/Có | 5q Siêu âm Glucose Glucose: Không/Có
- Tổng phân tích nước tiểu: Không/Có | Điện tim: Không/Có
- Nhóm máu: Không/Có | Đường huyết lúc đói: Không/Có
- MRX Siêu âm Glucose: Không/Có | Cân nặng Siêu âm Glucose: Không/Có

**VI. Chẩn đoán:**
- Chẩn đoán: [text]
- Bệnh kèm theo: [text]

---

#### Phiếu khám thai — Trang 3 (Hình 1.47.4)

**Các phần trên trang 3:**

**VII. Kế hoạch điều trị:**
- [Ô text lớn]
- Hướng điều trị cho các đợt điều trị: [text]
- Tỷ lệ đặc điểm cho kỳ đến sinh đặt mổ: [checkbox + text]

**VIII. Tiền lượng:**
- [Ô text]

**IX. Lần khám lại tiếp theo:**
- Ngày giờ: [date/time picker]
- Ghi chú: [text]

---

#### Phiếu khám thai — Trang 4 (Hình 1.47.5)

**Thanh công cụ:**
- Thêm | Sửa | Xóa | Lưu | In | Phóng | Đóng (nút lưu màu đặc biệt)

---

## PHẦN 2 — CÁC HỒ SƠ BỆNH ÁN (BA)

---

### 2.1. Bệnh án nội khoa

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án khoa nội cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án nội khoa** để thực hiện chức năng này.

*(Hình 2.1.1: Mẫu bệnh án nội khoa — danh sách bệnh nhân nội trú với các cột)*

#### Cấu trúc hồ sơ bệnh án nội khoa (nhiều trang)

**Hướng dẫn nhập thông tin bệnh án:**

**Hồ sơ bệnh án nội khoa — Trang 1 (tổng quát, Hình 2.1.2):**
- Thông tin hành chính của bệnh nhân (phần trên)
- Bệnh lý do nhập: thời gian vào viện và hỏi thông tin bệnh về bệnh lý và tiền sử bệnh

**Hướng dẫn nhập thăm tiền sử dị ứng (Hình 2.1.3):**
Bảng nhập tiền sử dị ứng với các câu hỏi chuẩn:
1. Loan tình trạng: (5 câu hỏi lâm sàng về tình trạng dị ứng)
   - Liên quan đến dị ứng: Không / Có — Liên quan đến dị ứng tham chiếu từ [text]
2. Đã từng sử dụng hoặc chuẩn hóa phản ứng nào?
   - Liên quan: Không / Có — Liên quan tham chiếu từ [text]
3. Đã từng dùng hoặc đang dùng loại thuốc nào?
   - Liên quan: Không / Có — Liên quan: [text]
4. Đã từng cài đặt hoặc chuẩn hóa phải báo dị ứng này?
   - [Không / Có]
5. Tiền sử có chẩn đoán dị ứng đồng tháng này thường đến?

**Hồ sơ bệnh án nội khoa — Trang 2 (Hình 2.1.4) — Khám bệnh:**

Bao gồm nội dung tóm tắt thông tin bệnh án của bệnh nhân. Người dùng dùng cập nhật tóm tắt lại tất cả thông tin bệnh án của bệnh nhân.

**Hồ sơ bệnh án nội khoa — Trang 3 (Hình 2.1.4 — Tổng kết):**
Nhập thông tin chuẩn đoán bệnh, tiên lượng và hướng điều trị

**Hồ sơ bệnh án nội khoa — Trang 4 (Hình 2.1.5):**
Tổng kết bác sĩ sẽ tổng kết và nhập thông tin bệnh án của người bệnh

**Thao tác:**
Sau khi đã kiểm tra và nhập đầy đủ thông tin, nhấn lưu để lưu lại các thông tin này.

---

### 2.2. Bệnh án ngoại khoa

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án khoa ngoại cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án ngoại khoa** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án ngoại khoa (nhiều trang)

**Hồ sơ bệnh án ngoại khoa — Trang 2 (Hình 2.2.1):**
- Thông tin hành chính
- Thông tin về bệnh lý và tiền sử bệnh
- Kết quả xét nghiệm CLS

**Hồ sơ bệnh án ngoại khoa — Trang 3 (Hình 2.2.2):**
- Thông tin kết luận bệnh
- Hướng điều trị và kế hoạch phẫu thuật
- Phần chẩn đoán phân biệt
- Tiên lượng

**Hồ sơ bệnh án ngoại khoa — Trang 4 (Hình 2.2.2 — tiếp):**
- Phần tổng kết

---

### 2.3. Bệnh án nhi khoa

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án nhi khoa cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án nhi khoa** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án nhi khoa (nhiều trang)

**Hồ sơ bệnh án nhi khoa — Trang 2 (Hình 2.3.1):**
- Thông tin hành chính bệnh nhân nhi
- Thông tin lý do vào viện
- Tiền sử bản thân và gia đình
- Quá trình bệnh lý
- Kết quả xét nghiệm CLS (bảng)

**Hồ sơ bệnh án nhi khoa — Trang 3 (Hình 2.3.2):**
- Kết quả khám tổng quát
- Khám theo hệ cơ quan
- Chẩn đoán

**Hồ sơ bệnh án nhi khoa — Trang 4 (Hình 2.3.3):**
- Kế hoạch điều trị
- Tiên lượng
- Hướng dẫn điều trị

---

### 2.4. Bệnh án phụ khoa

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án phụ khoa cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án phụ khoa** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án phụ khoa (nhiều trang)

**Hồ sơ bệnh án phụ khoa — Trang 2 (Hình 2.4.1):**
- Thông tin hành chính
- Lý do vào viện
- Tiền sử sản phụ khoa (số lần sinh, số lần phá thai, số lần mổ...)
- Đặc điểm kinh nguyệt
- Tình trạng hôn nhân
- Tiền sử phụ khoa
- Tiền sử gia đình
- Tình trạng toàn thân

**Hồ sơ bệnh án phụ khoa — Trang 3 (Hình 2.4.2):**
- Kết quả xét nghiệm CLS (bảng danh sách với checkbox chọn)
- Khám phụ khoa chi tiết
- Chẩn đoán

**Hồ sơ bệnh án phụ khoa — Trang 4 (Hình 2.4.3):**
- Hướng điều trị
- Kế hoạch phẫu thuật (nếu có)
- Tiên lượng
- Phần tổng kết

---

### 2.5. Bệnh án sản khoa

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án sản khoa cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án sản khoa** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án sản khoa (nhiều trang)

**Hồ sơ bệnh án sản khoa — Trang 2 (Hình 2.5.1):**
- Thông tin hành chính bệnh nhân sản
- Kinh nguyệt: ngày đầu kỳ kinh cuối, chu kỳ, số ngày hành kinh
- Tiền sử sản khoa:
  - Số lần mang thai (Para): [số]
  - Số lần sinh thường: [số]
  - Số lần sinh mổ: [số]
  - Số lần phá thai: [số]
  - Số con hiện có: [số]
- Tiền sử bệnh: [text]
- Tình trạng thai nghén lần này
- Bảng danh sách các lần khám thai trước (cột: Ngày khám, Tuổi thai, Cân nặng, Kết quả)
- Thông tin xét nghiệm, siêu âm thai kỳ

**Hồ sơ bệnh án sản khoa — Trang 3 (Hình 2.5.2):**
- Khám sản khoa chi tiết:
  - Chiều cao tử cung (cm): [số]
  - Vòng bụng (cm): [số]
  - Ngôi thai: [dropdown]
  - Phần trình diện: [dropdown]
  - Tim thai (lần/phút): [số]
  - Cơn go tử cung: [Không / Có]
  - Ối: [Nguyên / Vỡ]
  - Cổ tử cung: xóa độ [số], mở [số] cm
  - Khung chậu: [Bình thường / Hẹp]
  - Ước tính trọng lượng thai (gram): [số]
- Kết quả CLS (danh sách với kết quả)

**Hồ sơ bệnh án sản khoa — Trang 4 (Hình 2.5.3):**
- Chẩn đoán nhập viện
- Hướng xử trí
- Tiên lượng
- Kế hoạch theo dõi

---

### 2.6. Bệnh án sơ sinh

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án sơ sinh cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án sơ sinh** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án sơ sinh (nhiều trang)

**Hồ sơ bệnh án sơ sinh — Trang 2 (Hình 2.6.1):**
- Thông tin hành chính của trẻ sơ sinh
- Thông tin người mẹ:
  - Họ tên mẹ: [text]
  - Tuổi mẹ: [số]
  - Ngày sinh mẹ: [date]
  - Địa chỉ mẹ: [text]
- Thông tin sinh:
  - Ngày giờ sinh: [datetime]
  - Tuổi thai (tuần): [số]
  - Cân nặng lúc sinh (gram): [số]
  - Chiều dài (cm): [số]
  - Vòng đầu (cm): [số]
  - Vòng ngực (cm): [số]
  - APGAR 1 phút: [số/10]
  - APGAR 5 phút: [số/10]
  - Giới tính: [Nam/Nữ]
  - Loại sinh: [Thường/Mổ/Forceps/Giác hút]
- Tình trạng khi sinh:
  - Khóc ngay: [Có/Không]
  - Màu da: [Hồng/Tím/Vàng/Xanh]
  - Dị tật: [Không/Có — text]
- Bảng danh sách các xét nghiệm sơ sinh (cột: STT, Tên XN, Kết quả, Ngày)

**Hồ sơ bệnh án sơ sinh — Trang 3 (Hình 2.6.2):**
- Khám lâm sàng sơ sinh chi tiết (theo hệ cơ quan)
- Chẩn đoán
- Hướng điều trị
- Tiên lượng

**Hồ sơ bệnh án sơ sinh — Trang 4 (Hình 2.6.3):**
- Phần tổng kết
- Kết quả điều trị
- Ngày ra viện

---

### 2.7. Bệnh án tai mũi họng

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án tai mũi họng cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án tai mũi họng** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án tai mũi họng (nhiều trang)

**Hồ sơ bệnh án tai mũi họng — Trang 2 (Hình 2.7.1):**

Có hình ảnh giải phẫu minh họa (4 hình vẽ cơ quan tai mũi họng để chú thích vị trí tổn thương):
- Hình vẽ 1: Mặt ngoài tai
- Hình vẽ 2: Sơ đồ màng nhĩ (trống tai)
- Hình vẽ 3: Cấu trúc mũi
- Hình vẽ 4: Hầu họng

**Phần khám tai:**
- Tai phải / Tai trái
- Vành tai: [Bình thường / Bất thường]
- Ống tai: [Bình thường / Bất thường]
- Màng nhĩ: [Bình thường / Thủng / ...]
- Thính lực:
  - Tai phải (dB): [số]
  - Tai trái (dB): [số]

**Phần khám mũi:**
- Mũi ngoài: [Bình thường / Bất thường]
- Cuốn mũi: [Bình thường / Phì đại]
- Vách ngăn: [Thẳng / Vẹo sang phải / Vẹo sang trái]
- Niêm mạc: [Hồng / Nhợt / Xung huyết]
- Dịch: [Không / Có — loại dịch]

**Phần khám họng:**
- Amidan: [Bình thường / To độ 1 / To độ 2 / To độ 3]
- Thành sau họng: [Bình thường / Xung huyết / ...]
- Thanh quản: [Bình thường / Bất thường]

**Danh sách CLS (bảng danh sách xét nghiệm + kết quả)**

**Hồ sơ bệnh án tai mũi họng — Trang 3 (Hình 2.7.2):**
- Tiếp tục phần khám chi tiết
- Kết quả nội soi (nếu có)
- Bảng danh sách CLS đã thực hiện (Ngày, Tên CLS, Kết quả)

**Hồ sơ bệnh án tai mũi họng — Trang 4 (Hình 2.7.3):**
- Chẩn đoán
- Hướng điều trị / kế hoạch phẫu thuật
- Tiên lượng
- Phần tổng kết (kết quả điều trị, ra viện)

---

### 2.8. Bệnh án truyền nhiễm

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án truyền nhiễm cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án truyền nhiễm** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án truyền nhiễm (nhiều trang)

**Hồ sơ bệnh án truyền nhiễm — Trang 2 (Hình 2.8.1):**
- Thông tin hành chính
- Lý do vào viện
- Tiền sử bệnh truyền nhiễm:
  - Các bệnh đã mắc: [danh sách checkbox]
  - Tiêm chủng: [Đầy đủ / Không đầy đủ / Chưa tiêm]
  - Tiếp xúc với nguồn lây: [Không / Có — text mô tả]
  - Yếu tố dịch tễ: [text]
  - Địa điểm lây nhiễm: [text]
- Quá trình bệnh:
  - Ngày khởi phát: [date]
  - Diễn biến bệnh: [text]
- Triệu chứng chính:
  | Triệu chứng | Có / Không | Ghi chú |
  |-------------|------------|---------|
  | Sốt | | |
  | Ho | | |
  | Tiêu chảy | | |
  | Phát ban | | |
  | ... | | |

**Hồ sơ bệnh án truyền nhiễm — Trang 3 (Hình 2.8.2):**
- Khám thực thể:
  - Tổng trạng
  - Dấu hiệu sinh tồn
  - Khám từng hệ cơ quan
- Xét nghiệm vi sinh (cột: Loại XN, Ngày lấy mẫu, Kết quả, Kháng sinh đồ)
- Danh sách CLS
- Chẩn đoán (ICD-10)

**Hồ sơ bệnh án truyền nhiễm — Trang 4 (Hình 2.8.3):**
- Hướng điều trị và cách ly
- Tiên lượng
- Báo cáo dịch tễ (nếu bệnh thuộc nhóm A/B)
- Phần tổng kết

---

### 2.9. Bệnh án răng hàm mặt

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án răng hàm mặt cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án răng hàm mặt** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án răng hàm mặt (nhiều trang)

**Hồ sơ bệnh án răng hàm mặt — Trang 2 (Hình 2.9.1):**

Đặc biệt: Có **sơ đồ răng** (hình vẽ) để đánh dấu các răng tổn thương — bao gồm:
- Sơ đồ 4 phần (góc phần tư) thể hiện 32 răng
- Ký hiệu tình trạng từng răng: Sâu (C), Nhổ (X), Mão (K), Trám (A/O), v.v.
- Hình vẽ minh họa: các góc nhìn răng hàm trên, răng hàm dưới

**Nội dung form:**
- Lý do vào viện
- Tiền sử bệnh:
  - Bệnh toàn thân: [text]
  - Dị ứng thuốc: [Không / Có — text]
  - Tiền sử can thiệp RHM: [text]
- Khám toàn thân:
  - Tổng trạng
  - Dấu hiệu sinh tồn
- Khám ngoài mặt:
  - Mặt: [Cân đối / Không cân đối]
  - Sưng nề: [Không / Có — vị trí]
  - Hạch: [Không / Có — vị trí, kích thước]
- Khám trong miệng:
  - Niêm mạc miệng: [Bình thường / Loét / Phù nề]
  - Lưỡi: [Bình thường / Bất thường]
  - Nướu: [Bình thường / Viêm / Tụt lợi]

**Sơ đồ răng chi tiết** (Hình 2.9.1):
- Phần răng vĩnh viễn (18 răng mỗi hàm): 18-17-16-15-14-13-12-11 / 21-22-23-24-25-26-27-28
- Hàm dưới: 48-47-46-45-44-43-42-41 / 31-32-33-34-35-36-37-38
- Tình trạng từng răng (dropdown hoặc ký hiệu)

**Hồ sơ bệnh án răng hàm mặt — Trang 3 (Hình 2.9.2):**
- Kết quả X-quang / Cận lâm sàng
- Chẩn đoán:
  - Chẩn đoán xác định
  - Chẩn đoán phân biệt
- Kế hoạch điều trị từng răng

**Hồ sơ bệnh án răng hàm mặt — Trang 4 (Hình 2.9.3):**
- Diễn biến điều trị (theo từng lần)
- Kết quả điều trị
- Hướng dẫn sau điều trị
- Phần tổng kết

---

### 2.10. Bệnh án mắt (Chấn thương)

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án mắt (chấn thương) cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án mắt (chấn thương)** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án mắt (chấn thương) (nhiều trang)

**Hồ sơ bệnh án mắt (chấn thương) — Trang 2 (Hình 2.10.1):**
- Thông tin hành chính
- Lý do vào viện / hoàn cảnh chấn thương:
  - Thời gian xảy ra: [datetime]
  - Nguyên nhân: [dropdown — Dị vật / Va đập / Hóa chất / Nhiệt / Tia UV / Khác]
  - Mô tả hoàn cảnh: [text]
  - Sơ cứu trước nhập viện: [Không / Có — text]

**Phần 1. Mắt phải — Khám:**
- Thị lực: [số] (không kính / có kính)
- Nhãn áp (mmHg): [số]
- Tình trạng mi mắt: [text]
- Kết mạc: [text]
- Giác mạc: [text]
- Tiền phòng: [text]
- Đồng tử: [số] mm, phản xạ: [+/-]
- Thể thủy tinh: [Trong / Đục / Lệch]
- Dịch kính: [Trong / Xuất huyết / Đục]
- Đáy mắt: [text]
- Vận nhãn: [Bình thường / Hạn chế]

**Phần 2. Mắt trái — Khám:** (cấu trúc tương tự mắt phải)

**Hồ sơ bệnh án mắt (chấn thương) — Trang 3 (Hình 2.10.2):**
- Khám toàn thân phối hợp (chấn thương đầu, gãy xương...)
- Kết quả CLS:
  - X-quang hốc mắt
  - CT scan
  - Siêu âm mắt
  - XN máu

**Hồ sơ bệnh án mắt (chấn thương) — Trang 4 (Hình 2.10.3) — (Trang 3 trên tài liệu):**
- Tiếp tục phần khám chi tiết từng cấu trúc mắt
- 2 cột song song: Mắt phải | Mắt trái
- Các mục chi tiết cho từng cấu trúc giải phẫu

**Hồ sơ bệnh án mắt (chấn thương) — Trang 5 (Hình 2.10.4):**
- Chẩn đoán:
  - Chẩn đoán lâm sàng: [text]
  - Mã ICD-10: [dropdown]
  - Chẩn đoán phân biệt: [text]
- Hướng điều trị:
  - Điều trị nội khoa: [text]
  - Phẫu thuật: [Không / Có — loại PT]
  - Tiên lượng: [text]

**Hồ sơ bệnh án mắt (chấn thương) — Trang 6 (Hình 2.10.5):**
- Phần tổng kết:
  - Kết quả điều trị
  - Thị lực ra viện
  - Hướng dẫn sau ra viện
  - Tái khám

---

### 2.11. Bệnh án mắt (Bán phần trước)

#### Mục đích
Hỗ trợ cho bác sĩ nhập thông tin các bệnh án mắt (Bán phần trước) cho bệnh nhân

#### Đường dẫn
- **Link 1:** Nội trú → Hiện diện → Bệnh án EMR → Bệnh án
- **Link 2:** Nội trú → Hồ sơ bệnh án → Đăng nhập → Bệnh án → Bệnh án

**Lưu ý:** Cần chọn bệnh nhân có mẫu bệnh án là **bệnh án mắt (Bán phần trước)** để thực hiện chức năng này.

**Hướng dẫn nhập thông tin:** Tham khảo qua cách nhập tại bệnh án nội khoa

#### Cấu trúc hồ sơ bệnh án mắt (bán phần trước) — 6 trang

**Trang 2 (Hình 2.11.1):**
- Thông tin hành chính bệnh nhân
- Lý do nhập viện
- Tiền sử bệnh mắt:
  - Bệnh mắt trước đây: [Không / Có]
  - Phẫu thuật mắt: [Không / Có — loại]
  - Kính: [Không đeo / Kính cận / Kính lão / Kính tiếp xúc]
  - Tiền sử bệnh toàn thân (Đái tháo đường, Tăng HA...): [text]
- Khám bán phần trước mắt phải:
  - Thị lực: không kính / có kính
  - Nhãn áp: [số] mmHg
  - Mi mắt
  - Kết mạc
  - Giác mạc
  - Tiền phòng (độ sâu, tế bào)
  - Mống mắt
  - Đồng tử
  - Thể thủy tinh

**Trang 3 (Hình 2.11.2):**
- Khám bán phần trước chi tiết (2 cột Mắt phải / Mắt trái):
  - Thị lực (không kính): P: [số] | T: [số]
  - Thị lực (có kính): P: [số] | T: [số]
  - Nhãn áp (mmHg): P: [số] | T: [số]
  - Nhãn áp non contact: P: [số] | T: [số]
  - Vị trí nhãn cầu: [Bình thường/Lồi/Lõm]
  - Vận nhãn: [Bình thường/Hạn chế]
  - Mi trên: [Bình thường/Sụp]
  - Mi dưới: [Bình thường/Lộn/Quặm]
  - Lệ đạo: [Thông/Tắc]
  - Kết mạc: [text]
  - Vùng rìa: [text]
  - Giác mạc: [Trong/Đục — mô tả]
  - Tiền phòng: [text]
  - Mống mắt: [text]
  - Đồng tử: [số] mm, [Tròn/Méo], phản xạ [+/-]
  - Thể thủy tinh: [Trong/Đục — độ]

**Trang 4 (Hình 2.11.3):**
*(Form tiếp tục với nhiều mục khám chuyên sâu hơn — 2 cột song song)*

Các mục bổ sung:
- Góc tiền phòng (soi góc): P / T
- Vùng trabecula: P / T
- Tế bào nội mô (Specular microscopy):
  - Số tế bào/mm²: P: [số] | T: [số]
  - Diện tích tế bào (μm²): P: | T:
  - Hệ số biến thiên (%CV): P: | T:
  - % tế bào lục giác: P: | T:
- Kính hiển vi sinh học:
  - Phần phụ mắt: P / T
- Kiểm tra thị giác màu: P / T
- Khúc xạ kế tự động (Auto-Refractor):
  - Cầu (D): P: | T:
  - Trụ (D): P: | T:
  - Trục (°): P: | T:
- Đo khúc xạ chủ quan:
  - Kính cầu (D): P: | T:
  - Kính trụ (D): P: | T:
  - Trục (°): P: | T:
  - Thị lực có kính tốt nhất: P: | T:
- Đo độ cong giác mạc (Keratometry):
  - K1 (D/mm): P: | T:
  - K2 (D/mm): P: | T:
  - Trục K1 (°): P: | T:
- Địa hình giác mạc (Corneal Topography)
- Khúc xạ giác mạc trung tâm: P: | T:
- Phương án điều trị kính:
  - Kính đơn tiêu
  - Kính đa tiêu
  - Kính tiếp xúc mềm
  - Kính tiếp xúc cứng (RGP)
  - Orthokeratology

**Trang 5 (Hình 2.11.4):**
*(Tiếp tục — các mục khám đặc thù bán phần trước)*

Đặc biệt nhiều trường dữ liệu chuyên sâu, mỗi mục đều có 2 cột Phải/Trái:
- Đánh giá màng phim nước mắt (Tear Film):
  - BUT (Break-up time) (giây): P: | T:
  - Schirmer I (5 phút) (mm): P: | T:
  - Schirmer II (5 phút) (mm): P: | T:
  - Staining giác mạc (Oxford scale): P: | T:
  - Staining kết mạc: P: | T:
- Chiều dày giác mạc (Pachymetry):
  - Trung tâm (μm): P: | T:
  - Điểm mỏng nhất (μm): P: | T:
- Nội soi tiền phòng:
  - Tế bào: P: | T:
  - Vẩn đục (Flare): P: | T:
  - Fibrin: P: | T:
  - Xuất huyết: P: | T:
  - Mủ: P: | T:
  - Dính mống-giác mạc trước: P: | T:
  - Dính mống-thể thủy tinh sau: P: | T:
  - Nếp gấp Descemet: P: | T:
  - Kết tủa giác mạc (KPs): P: | T:
- Đo nhãn áp tư thế nằm: P: | T:

**Trang 6 (Hình 2.11.5):**
- Phần tổng kết:
  - Bảng danh sách CLS đã thực hiện
  - Chẩn đoán xác định
  - Chẩn đoán phân biệt
  - Hướng điều trị
  - Tiên lượng: [Tốt / Khá / Trung bình / Xấu]
  - Kết quả điều trị
  - Thị lực lúc ra viện: P: | T:
  - Ghi chú

---

## PHỤ LỤC — SƠ ĐỒ ĐIỀU HƯỚNG TỔNG QUÁT

### Các đường dẫn chính đến hồ sơ bệnh án (BA)

| Loại BA | Đường dẫn Link 1 | Đường dẫn Link 2 |
|---------|-----------------|-----------------|
| Nội khoa | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Ngoại khoa | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Nhi khoa | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Phụ khoa | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Sản khoa | Nội khoa → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Sơ sinh | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Tai mũi họng | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Truyền nhiễm | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Răng hàm mặt | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Mắt (chấn thương) | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |
| Mắt (Bán phần trước) | Nội trú → Hiện diện → BA EMR → BA | Nội trú → Hồ sơ BA → Đăng nhập → BA → BA |

**Lưu ý chung:** Cần chọn đúng **mẫu bệnh án** (loại BA) khi đăng ký nhập viện để hệ thống hiển thị đúng form bệnh án tương ứng.

---

### Phiếu theo dõi điều trị — Đường dẫn đầy đủ (tóm tắt)

| Cách | Đường dẫn |
|------|-----------|
| Cách 1 | Nội trú → Hiện diện → Bệnh án EMR → Nội trú |
| Cách 2 | Danh sách bệnh án → Mở hồ sơ → Cột trái → STT Gáy 9 → Phiếu điều trị → nút + |
| Cách 3 | Nội trú → Hiện diện → Tiện ích → Bệnh án mới (115) → Tờ điều trị |

---

### Tóm tắt các loại phiếu/tờ điều trị (Part 2)

| Số | Tên phiếu | Trạng thái |
|----|-----------|------------|
| 1.32 | Phiếu phẫu thuật ghép giác mạc | Cập nhật sau |
| 1.33 | Phiếu phẫu thuật bề mặt nhãn cầu | Cập nhật sau |
| 1.34 | Phiếu phẫu thuật Glocom | Cập nhật sau |
| 1.35 | Phiếu phẫu thuật lác | Cập nhật sau |
| 1.36 | Phiếu phẫu thuật túi lệ | Cập nhật sau |
| 1.37 | Phiếu phẫu thuật sụp mi, mộng, thể thuỷ tinh, Sapejko | Cập nhật sau |
| 1.38 | Phiếu theo dõi điều trị | Có đầy đủ |
| 1.39 | Phiếu chăm sóc cấp 1 (TT32) | Có đầy đủ |
| 1.40 | Phiếu chăm sóc cấp 2 (TT32) | Có đầy đủ |
| 1.41 | Phiếu nhận định phân loại người bệnh tại khoa cấp cứu | Có đầy đủ |
| 1.42 | Giấy cung cấp thông tin và cam kết chung về nhập viện nội trú | Có đầy đủ |
| 1.43 | Giấy cam kết từ chối sử dụng DVKB, chữa bệnh | Cập nhật sau |
| 1.44 | Giấy cam kết chuyển cơ sở KBCB | Cập nhật sau |
| 1.45 | Giấy cam kết ra viện không theo chỉ định BS | Cập nhật sau |
| 1.46 | Phiếu điều trị trẻ sơ sinh sau sinh | Cập nhật sau |
| 1.47 | Phiếu khám thai (4 trang) | Có đầy đủ |

### Tóm tắt các loại hồ sơ bệnh án (Part 2)

| Số | Loại bệnh án | Số trang | Đặc điểm nổi bật |
|----|-------------|----------|-----------------|
| 2.1 | Nội khoa | 4 trang | Tiền sử dị ứng chi tiết |
| 2.2 | Ngoại khoa | 4 trang | Kế hoạch phẫu thuật |
| 2.3 | Nhi khoa | 4 trang | Thông tin phát triển trẻ |
| 2.4 | Phụ khoa | 4 trang | Tiền sử sản phụ khoa |
| 2.5 | Sản khoa | 4 trang | Theo dõi thai kỳ, bảng lần khám trước |
| 2.6 | Sơ sinh | 4 trang | APGAR, thông tin sinh |
| 2.7 | Tai mũi họng | 4 trang | Hình vẽ giải phẫu 4 góc nhìn để chú thích |
| 2.8 | Truyền nhiễm | 4 trang | Dịch tễ, cách ly, báo cáo |
| 2.9 | Răng hàm mặt | 4 trang | Sơ đồ răng 32 chiếc để đánh dấu |
| 2.10 | Mắt (chấn thương) | 6 trang | Hoàn cảnh chấn thương, khám từng mắt |
| 2.11 | Mắt (bán phần trước) | 6 trang | Specular microscopy, Topography, Tear film |
