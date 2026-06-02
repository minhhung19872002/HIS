# Thuyết minh giải pháp phần mềm — Part 2 (Pages 38-74)
> Source: Thuyet minh giai phap phan mem.pdf
> Extracted: 2026-06-01

---

## Trang 38 — Quản lý phiếu hoàn trả thuốc, vật tư y tế & Quản lý Khoa Xét nghiệm

### Use Case: Quản lý phiếu hoàn trả thuốc, vật tư y tế

**Actors:** Bác sĩ, Y tá, NVHC

**Use cases:**
- Lý do hoàn trả thuốc, vật tư y tế
- Ghi chú hoàn trả thuốc, vật tư y tế đã duyệt lãnh
- Nạp thuốc, vật tư y tế đã lãnh
- In phiếu hoàn trả thuốc, vật tư y tế
- Chuyển số liệu thuốc, vật tư y tế xuống kho, chờ duyệt hoàn trả

### Use Case: Quản lý xét nghiệm (Khoa Xét nghiệm — mục 4)

**Actors:** Bác sĩ, Y tá, NVHC

**Use cases (trục Y tá/NVHC):**
- Huyết học
- Vi sinh
- Miễn dịch
- Quản lý danh mục xét nghiệm
- Quản lý lấy mẫu thử
- Quản lý hóa chất, vật tư tiêu hao
- Tìm kiếm thông tin xét nghiệm
- In lết kết quả trên mạng
- Báo cáo và truy vấn thông tin xét nghiệm

---

## Trang 39 — Quản lý kho máu & Quản lý Chẩn đoán hình ảnh

### Use Case: Quản lý kho máu

**Actors:** NVHC, CBQL

**Use cases (NVHC):**
- Nhóm máu, từ, đang nhóm máu
- Hành, hạn dùng
- Cấp phát máu
- Miễn dịch
- Sàng lọc xét nghiệm

**Use cases (CBQL):**
- Tìm kiếm thông tin máu
- In phiếu lĩnh máu
- Quản lý xuất máu
- Báo cáo và truy vấn thông tin máu

### Use Case: Quản lý Chẩn đoán hình ảnh (mục 5)

**Actors:** Y tá, Bác sĩ, NVHC

**Chuyên ngành (Y tá):**
- Siêu âm
- Nội soi
- X-Quang
- Điện tim
- Điện não
- CT-Scanner, Cộng hưởng từ (MRI)

**Use cases (Bác sĩ/NVHC):**
- Quản lý danh mục chẩn đoán hình ảnh
- Quản lý phim, vật tư tiêu hao
- Báo cáo và truy vấn thông tin chẩn đoán hình ảnh
- Tìm kiếm thông tin chẩn đoán hình ảnh
- Lưu hình ảnh trong ứng dụng để phục vụ bệnh án
- Trả lời kết quả trên mạng
- In phiếu kết quả chẩn đoán hình ảnh
- Kết nối máy chẩn đoán hình ảnh với hệ thống

---

## Trang 40 — Quản lý Khoa Dinh dưỡng & Quản lý Dược bệnh viện

### Use Case: Quản lý Khoa Dinh dưỡng (mục 6)

**Actors:** NVHC, CBQL

**Use cases (NVHC):**
- Danh mục (Thành phần, thực đơn...)
- Chế độ (Dinh dưỡng, Bệnh lý)

**Use cases (CBQL):**
- Báo cáo và truy vấn thông tin thực đơn
- In phiếu thực đơn
- Duyệt phiếu theo y lệnh

### Use Case: Quản lý Khoa Dược (mục 7 — Quản lý Dược bệnh viện)

**Actors:** CBQL, NVHC

**Đối tượng quản lý:**
- Thuốc
- Vật tư tiêu hao
- Hóa chất
- Quản lý nguyên liệu – thành phần
- Quản lý nguồn, giá, hạn dùng, lô, số đăng ký...

**Use cases (CBQL):**
- Biên bản kiểm nhập
- Phiếu đề nghị thanh toán
- Theo dõi công nợ
- Quản lý tủ trực
- Quản lý xuất

**Use cases (NVHC):**
- Quản lý nhập

---

## Trang 41 — Quản lý phiếu nhập kho & Quản lý phiếu xuất kho

### Use Case: Quản lý phiếu nhập kho

**Actors:** CBQL, NVHC

**Use cases (NVHC/CBQL):**
- Số, ngày phiếu
- Số, ngày hóa đơn
- Kho nhập
- Nguồn nhập
- Lý do nhập
- In phiếu nhập kho
- Chuyển số lượng nhập vào tồn kho Bệnh viện
- Tên thuốc, vật tư y tế trong danh mục Bệnh viện

### Use Case: Quản lý phiếu xuất kho

**Actors:** CBQL, NVHC

**Use cases (NVHC/CBQL):**
- Số, ngày phiếu
- Kho xuất
- Nạp số lượng còn tồn kho tại Bệnh viện
- In phiếu xuất kho
- Chuyển số lượng xuất vào tồn kho Bệnh viện

---

## Trang 42 — Quản lý duyệt cấp theo y lệnh & Quản lý duyệt bù cơ số tủ trực

### Use Case: Quản lý duyệt cấp theo y lệnh

**Actors:** CBQL, NVHC

**Use cases:**
- Ngày duyệt cấp
- Khoa
- Phiếu xuất
- In phiếu duyệt cấp theo y lệnh
- Tổng hợp thành phiếu xuất kho, trừ tồn kho
- Nạp số liệu thuốc, vật tư y tế khoa dự trù

### Use Case: Quản lý duyệt bù cơ số tủ trực thuốc, vật tư y tế

**Actors:** CBQL, NVHC

**Use cases:**
- Ngày duyệt bù
- Khoa
- Phiếu bù
- In phiếu duyệt bù cơ số tủ trực thuốc, vật tư y tế
- Tổng hợp thành phiếu xuất khoa, trừ tồn kho, tăng cơ số tủ trực
- Nạp số liệu thuốc, vật tư y tế khoa đã xuất tủ trực

---

## Trang 43 — Quản lý duyệt hoàn trả thuốc, vật tư y tế & Quản lý chỉ định tạm ứng

### Use Case: Quản lý duyệt hoàn trả thuốc, vật tư y tế

**Actors:** CBQL, NVHC

**Use cases:**
- Ngày duyệt hoàn trả
- Khoa
- Phiếu hoàn trả
- In phiếu duyệt hoàn trả thuốc, vật tư y tế
- Tổng hợp thành phiếu hoàn trả, tăng tồn kho
- Nạp số liệu thuốc, vật tư y tế khoa hoàn trả kho

### Use Case: Quản lý chỉ định tạm ứng (mục 8)

**Actors:** Y tá, Bác sĩ, NVHC

**Use cases:**
- Ngày tạm ứng
- Nội dung tạm ứng
- Lần thứ?
- In phiếu tạm ứng
- Số tiền tạm ứng?

---

## Trang 44 — Quản lý Viện phí & Hệ thống quản lý BHYT (mục 9)

### Use Case: Quản lý Viện phí

**Actors:** Kế toán, NVHC

**Use cases (Kế toán):**
- Dịch vụ
- Khoa phòng
- BHYT, Trẻ em < 6 tuổi
- Biên lai
- Bảng kê thu tiền
- Tìm kiếm thông tin người bệnh, biên lai
- In hóa đơn thu tiền
- Chi hoàn, miễn giá

**Use cases (NVHC):**
- Danh thu khoa, toàn viện
- Danh sách xuất viện chưa thanh toán
- Thu khám bệnh
- Thu cận lâm sàng
- Thu tiền chênh lệch
- Thu tiền dịch vụ vụ/ngoài giá
- Thu tạm ứng
- Thu thanh toán ra viện

### Use Case: Hệ thống quản lý BHYT

**Actors:** NVHC, Kế toán

**Use cases (NVHC):**
- Theo dõi kiểm tra, quyết toán mẫu 01 và 02
- Chuyển số liệu vào phần mềm BHYT

**Use cases (Kế toán):**
- Thống kê số liệu quyết toán
- Thống kê ngày khám theo số thẻ
- Báo cáo chi phí trẻ dưới 6 tuổi
- Báo cáo chi phí đa tuyến
- Báo cáo chi phí tổng hợp
- Báo cáo chi phí thuốc BHYT sử dụng
- Báo cáo chi phí điều trị bệnh nhân BHYT Nội trú
- Báo cáo chi phí khám chữa bệnh, bệnh nhân BHYT Ngoại trú

---

## Trang 45 — Quản lý Lưu trữ hồ sơ bệnh án (mục 10)

### Use Case: Quản lý Lưu trữ hồ sơ bệnh án

**Actors:** NVHC, Y tá, Bác sĩ

**Use cases:**
- Nhập vị trí hồ sơ bệnh án (NVHC)
- Quản lý mượn (Bác sĩ)
- Quản lý trả (Bác sĩ)
- Báo cáo và truy vấn thông tin hồ sơ bệnh án (Y tá)
- Tìm kiếm thông tin hồ sơ bệnh án (Bác sĩ/Y tá)

---

## Trang 46 — Quản lý Tổng hợp báo cáo (mục 11)

### Use Case: Quản lý Tổng hợp báo cáo

**Actors:** NVHC, CBQL

**Danh mục báo cáo (NVHC — bên trái):**
- Phiếu kê bổ sung thuốc, VTTH (tính từ 22-23)
- Biểu ban xác nhận thuốc, hóa chất – xuất bảng/tính từ 22-23
- Biểu ban xác nhận thuốc, hóa chất – xuất bảng/tính từ 22-23
- Số kế nhập thuốc, hóa chất, vật tư y tế hàng 22-23
- Số phụ chứng từ 22-23
- Thống kê từ viện theo thời điểm ICD10, đái liếu
- Hiệu 14.5 Báo cáo thống kê xét khai thương tích
- Tổng hợp hàng hóa ICD10 đó
- Hoạt động phòng leo – Thống kê thuốc tách nhập – xoài
- Tổng kết bào giảm bệnh
- Thống kê đơn thuốc và chi phối theo toa đó
- Thống kê nhập – chuyển viện theo thực bệnh – khoa
- Bảng danh sách CS, TS?T ở tứ cột thương tích
- Doanh thu toàn bệnh viện
- Chi tiết CS đính chính dịch vụ – thuốc Nội trú

**Danh mục báo cáo (NVHC — bên phải/giữa):**
- Bảng lệ trời khoảng từ 22-23
- Báo cáo công tác Dược BV (tính từ 22-23)
- Báo cáo đơn vị thuốc sử dụng (tính từ 22-23)
- Báo cáo các sử dụng biện chứng từ (tính từ 22-23)
- Biểu ban kiểm kê (tính từ 22-23)
- Số kết nhập thuốc, hóa chất, vật tư y tế hàng 22-23

**Use cases (CBQL — trung tâm):**
- Báo cáo trực, Bình đảo
- Quản lý động từ bệnh viện
- Báo cáo chuyển viện theo tuyến
- Số cán viên – cơ viên – chuyên viên
- Số lao trí tính từ hộ số Mắt từ từ vong

**Các báo cáo thống kê (CBQL — phải):**
- Thống kê tổi theo thương tích
- Hướng tay chuyến viên
- Bảng giá tiền
- Bằng thực đối giá nhập

**Báo cáo chi tiết (bên phải):**
- Biểu ban kiểm kế vụ tổi liên hàng (tính từ 22-23)
- Báo cáo chi phí khám chữa điều trị nội cư lý tứ từ 22-23
- Báo cáo chi phí trẻ em, tứ từ 22-23
- Danh sách chi thanh dịch vụ – thuốc Nội trú
- Tổng lợp tứ tứ dụng
- Tổng hợp đặt liệu tứ dụng
- Biểu lệ lợp tứ liệu vật tư y tứ từ liều hào
- Xuất khác: theo lý do, đa tuyến
- Nhập khoa theo phần vật tứ cung cấp
- Xuất khác: theo khoa phòng và đa tuyến
- Bảo cáo nhập liệu từ tứ của bệnh nhân
- Thống kê bảo giá tứ Khoa Dược
- Thứ kiểm/thống kê 22-23

*(Ghi chú: Trang 46 chứa biểu đồ use case rất phức tạp với hàng chục use case nối với NVHC và CBQL — nội dung trên là toàn bộ nhãn có thể đọc được từ hình)*

---

## Trang 47 — Quản lý Vật tư, trang thiết bị y tế (mục 12)

### Use Case: Quản lý Vật tư, trang thiết bị y tế

**Actors:** NVHC, CBQL

**Use cases (NVHC):**
- Báo cáo và truy vấn thông tin Vật tư, trang thiết bị y tế
- Biên bản bàn giao Vật tư, trang thiết bị y tế
- Biên bản bàn giao nhận Vật tư, trang thiết bị y tế
- Biên bản kiểm nhập Vật tư, trang thiết bị y tế
- Phiếu đề nghị thanh toán Vật tư, trang thiết bị y tế
- Theo dõi công nợ Vật tư, trang thiết bị y tế

**Use cases (CBQL):**
- Hành chính quản trị
- Trang thiết bị y tế
- Quản lý hình vật tư
- Quản lý nguồn, giá, model, số hiệu, công suất...
- Quản lý tính trạng nguồn gốc, tỷ lệ khấu hao...
- Quản lý xuất Vật tư, trang thiết bị y tế
- Quản lý nhập Vật tư, trang thiết bị y tế

---

## Trang 48 — Quản lý danh mục, Quản lý người dùng, Quản lý nhật ký & Phần V

### Use Case: Quản lý danh mục (mục 13)

**Actor:** QTHT (Quản trị hệ thống)

**Use cases:**
- Quản lý danh mục hệ thống có thể tìm kiếm đồ danh mục dữ liệu dùng chung
- Quản lý danh mục hệ thống có thể thêm mới danh mục dữ liệu dùng chung
- Quản lý danh mục hệ thống có thể xóa danh mục dữ liệu dùng chung
- Quản lý danh mục hệ thống có thể sửa danh mục dữ liệu dùng chung

### Use Case: Quản lý người dùng (mục 14)

**Actor:** QTHT

**Use cases:**
- Quản lý tài khoản người sử dụng — phân quyền: QTHT có thể thêm mới tài khoản người sử dụng
- QTHT có thể sửa một tài khoản người sử dụng
- QTHT có thể xóa tài khoản người sử dụng
- QTHT có thể tìm kiếm đồ danh sách thủ tài khoản người sử dụng
- Phân quyền trên hệ thống: QTHT có thể sửa quyền sử dụng cho người sử dụng
- Phân quyền trên hệ thống: QTHT có thể sửa quyền sử dụng cho người sử dụng
- Phân quyền trên hệ thống: QTHT có thể liệt kê quyền sử dụng của một người sử dụng

### Use Case: Quản lý nhật ký, theo dõi thống kê hệ thống (mục 15)

**Actor:** QTHT

**Use cases:**
- Lập nhật ký hệ thống
- Theo dõi, thống kê nhật ký hệ thống
- QTHT có thể sao lưu và phục hồi dữ liệu hệ thống

---

## Phần V — ĐẶC TẢ CÁC TRƯỜNG HỢP SỬ DỤNG

### 1. Đặc tả trường hợp sử dụng phân hệ Tiếp đón bệnh nhân

---

## Trang 49 — 1.1. Đặc tả Quản lý đặt khám

### Usecase: Quản lý đặt khám

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC |
| Mô tả | Tác nhân phải đăng nhập thành công vào hệ thống |
| Điều kiện trước | Tác nhân phải đăng nhập thành công vào hệ thống |
| Luồng sự kiện chính | 1. Tác nhân đăng nhập hệ thống<br>2. Cung cấp thông tin yêu cầu khám chuyên khoa, bác sĩ khám<br>3. Chuyển thông tin đặt khám vào tiếp nhận thông tin đăng ký khám<br>4. In phiếu đặt khám |
| Luồng sự kiện rẽ nhánh | (trống) |
| Điều kiện sau | (trống) |
| Yêu cầu | (trống) |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý đặt khám

```
[Đăng nhập hệ thống] → <Đăng nhập thành công? Yes/No>
  → Yes → [Yêu cầu khám chuyên khoa]
         → [Yêu cầu bác sĩ khám]
         → [Chuyển thông tin đặt khám vào tiếp nhận thông tin đăng ký khám]
         → [In phiếu đặt khám]
         → (End)
  → No → (loop back)
```

---

### 1.2. Đặc tả Quản lý đón tiếp

#### Mô tả:

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý đón tiếp |
| Mức độ BMT | B |

---

## Trang 50 — Quản lý đón tiếp (tiếp theo)

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Khai thác thông tin đầu vào của bệnh nhân, phân luồng bệnh nhân vào Phòng khám |
| Điều kiện trước | Tác nhân phải đăng nhập thành công vào hệ thống vào màn hình làm việc tiếp đón |
| Luồng sự kiện chính | 1. Gọi người bệnh bằng loa<br>2. Quét mã vạch (Barcode)<br>3. Quản lý hình người bệnh và hình ảnh y khoa<br>4. Quản lý đối tượng<br>5. Kiểm tra tính hợp lệ của đối tượng<br>6. Thông tin dấu sinh tồn<br>7. Theo dõi quá trình điều trị<br>8. Cấp số thứ tự và phân phòng khám<br>9. In phiếu điều trị<br>10. In hóa đơn tiền khám<br>11. Tìm kiếm thông tin người bệnh tiếp đón<br>12. Báo cáo và truy vấn thông tin tiếp đón |
| Luồng rẽ nhánh | Bệnh nhân vào khám bệnh |
| Điều kiện sau | Hoàn tất việc đăng ký bệnh nhân |
| Yêu cầu | Các thông tin như hành chính phải chuẩn xác, đối tượng BHYT phải kiểm tra tính hợp lệ |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

---

## Trang 51 — Biểu đồ hoạt động Quản lý đón tiếp & 2.1. Quản lý phòng khám

### Biểu đồ hoạt động: Quản lý đón tiếp

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Vào màn hình tiếp đón]
         → [Gọi người bệnh không loa]
         → <Quản lý mã vạch (Barcode)> || <Quản lý đối tượng>
         → [Kiểm tra tinh bệnh nhân vào bệnh viện so với bệnh nhân x khoa]
         → [Thông tin] → [Theo dõi quá trình điều trị]
         → [Cấp số thứ tự và phân phòng khám]
         → [In phiếu điều trị]
         → [In hóa đơn tiền khám]
         → [Tìm kiếm thông tin người bệnh tiếp đón]
         → (End)
```

### 2. Đặc tả trường hợp sử dụng phân hệ Quản lý Bệnh nhân ngoại trú

#### 2.1. Đặc tả Quản lý phòng khám

**Mô tả:**

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý phòng khám |
| Mức độ BMT | B |
| Tác nhân | Bác sĩ, y tá hành chính |
| Mô tả | Bệnh nhân đã tiếp nhận từ tiếp đón chuyển vào danh sách chờ khám bệnh |
| Điều kiện trước | Bệnh nhân phải có trong danh sách chờ khám bệnh |
| Luồng sự kiện chính | 1. Ngày giờ khám<br>2. Bác sĩ khám, điều dưỡng, triệu chứng, chẩn đoán<br>3. In phiếu khám bệnh<br>4. In chi phí điều trị<br>5. Sổ khám bệnh<br>6. Phiếu công khám – viện phí – cls<br>7. Tìm thông tin người bệnh |
| Luồng rẽ nhánh | Nhập viện, cấp đơn, chuyển viện, điều trị ngoại trú, chỉ định cls |
| Điều kiện sau | Kết thúc khám bệnh |
| Yêu cầu | Chẩn đoán đúng bệnh, cls phù hợp với chẩn đoán |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

---

## Trang 52 — Biểu đồ hoạt động Quản lý phòng khám & 2.2. Quản lý khám sức khỏe

### Biểu đồ hoạt động: Quản lý phòng khám

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Vào màn hình khám bệnh]
         → [Ngày giờ khám]
         → [Bác sĩ điều trị] | [Điều dưỡng] | [Triệu chứng] | [Chẩn đoán]
         → [In phiếu khám bệnh]
         → [In chi phí điều trị]
         → [In tờ điều trị]
         → [Sổ khám bệnh]
         → [Đổi chiếu phòng khám – viện phí – cls]
         → [Tìm kiếm thông tin người bệnh]
         → [Báo cáo và truy vấn thông tin người bệnh]
         → (End)
```

### 2.2. Đặc tả Quản lý khám sức khỏe

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý khám sức khỏe |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Danh sách bệnh nhân khám sức khỏe |
| Điều kiện trước | Đăng nhập hệ thống vào báo cáo khám sức khỏe |
| Luồng sự kiện chính | 1. Bảng danh sách bệnh nhân khám sức khỏe<br>2. Báo cáo xếp loại KSK theo đơn vị<br>3. Bảng tổng hợp số lượng khám sức khỏe theo đoàn<br>4. Báo cáo KSK theo chuẩn đoán<br>5. Bảng phân loại sức khỏe theo độ tuổi<br>6. Bảng phân loại sức khỏe theo nghề nghiệp |

---

## Trang 53 — Quản lý khám sức khỏe (tiếp theo)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 7. Báo cáo tình hình bệnh tật theo nghề nghiệp<br>8. Kết quả xét nghiệm<br>9. Báo cáo tổng hợp số liệu CLS KSK |
| Luồng rẽ nhánh | Thống kê hoạt động khám sức khỏe đoàn tại bệnh viện |
| Điều kiện sau | Kết thúc thống kê được số liệu khám sức khỏe |
| Yêu cầu | Thông tin bệnh nhân đưa vào hệ thống chính xác |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

*(Trang 53 kết thúc bằng tiêu đề "Biểu đồ hoạt động" — biểu đồ nằm ở trang 54)*

---

## Trang 54 — Biểu đồ hoạt động KSK & 2.3. Quản lý bệnh nhân cấp cứu tổng hợp

### Biểu đồ hoạt động: Quản lý khám sức khỏe

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Bảng danh sách bệnh nhân khám sức khỏe]
         → [Báo cáo xếp loại KSK theo đơn vị]
         → [Bảng tổng hợp số lượng khám sức khỏe theo đoàn]
         → [Báo cáo KSK theo chuẩn đoán]
         → [Bảng phân loại sức khỏe theo độ tuổi]
         → [Bảng phân loại sức khỏe theo nghề nghiệp]
         → [Báo cáo tình hình bệnh tật theo nghề nghiệp]
         → [Kết quả xét nghiệm]
         → [Báo cáo tổng hợp số liệu CLS KSK]
         → (End)
```

### 2.3. Đặc tả Quản lý Bệnh nhân cấp cứu tổng hợp

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý thông tin Bệnh nhân cấp cứu tổng hợp |
| Mức độ BMT | B |
| Tác nhân | Bác sĩ, y tá hành chính |
| Mô tả | Bệnh nhân vào cấp cứu |
| Điều kiện trước | Bệnh nhân được nhập trực tiếp từ cấp cứu |
| Luồng sự kiện chính | 1. Ngày giờ vào ... Ngày giờ ra điều trị ngoại |

---

## Trang 55 — Quản lý Bệnh nhân cấp cứu tổng hợp (tiếp theo)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 2. Hoạt chất<br>3. CLS, Xét nghiệm,...Phân loại (Thường quy Chẩn đoán bệnh, tìm nguyên nhân bệnh, tiên lượng và điều trị đặc hiệu theo phác đồ)<br>4. Số lượng<br>5. Liều dùng<br>6. Cảnh báo và theo dõi thống kê sử dụng ngoại phác đồ<br>7. Cấm sử dụng ngoài phác đồ |
| Luồng rẽ nhánh | Tiện ích cho việc cấp toa và điều trị bệnh nhân |
| Điều kiện sau | Giúp thao tác nhanh |
| Yêu cầu | Phát đồ tạo ra chính xác |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

---

## Trang 56 — Biểu đồ hoạt động Cấp cứu tổng hợp & 2.4. Cấp cứu tổng hợp

### Biểu đồ hoạt động: Quản lý bệnh nhân phác đồ/điều trị ngoại trú (cấp cứu tổng hợp)

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Chẩn đoán theo ICD10]
         → [Hoạt chất]
         → [CLS, Xét nghiệm,...]
         → [Phân loại (Thường quy / Chẩn đoán bệnh / Tìm nguyên nhân bệnh /
             Tiên lượng và điều trị đặc hiệu theo phác đồ)]
         → [Báo cáo KSK theo chuẩn đoán]
         → [Số lượng]
         → [Liều dùng]
         → [Cảnh báo và theo dõi thống kê sử dụng ngoại phác đồ]
         → [Cấm sử dụng ngoài phác đồ]
         → (End)
```

### 2.4. Đặc tả Quản lý Bệnh nhân cấp cứu tổng hợp

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý thông tin Bệnh nhân cấp cứu tổng hợp |
| Mức độ BMT | B |
| Tác nhân | Bác sĩ, y tá hành chính |
| Mô tả | Bệnh nhân vào cấp cứu |
| Điều kiện trước | Bệnh nhân được nhập trực tiếp từ cấp cứu |
| Luồng sự kiện chính | 1. Ngày giờ vào ... Ngày giờ ra điều trị ngoại |

---

## Trang 57 — Biểu đồ hoạt động Cấp cứu tổng hợp (tiếp theo)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 2. Nơi giới thiệu<br>3. Chẩn đoán (giới thiệu, vào, ra)<br>4. Kết quả điều trị<br>5. Tình trạng lúc ra viện<br>6. Phiếu thanh toán<br>7. Công nợ<br>8. Xem hồ sơ bệnh án điều trị ngoại trú |
| Luồng rẽ nhánh | Kết thúc điều trị cấp cứu, cấp đơn, nhập viện, chuyển viện, in phiếu thanh toán |
| Điều kiện sau | Nhập viện điều trị |
| Yêu cầu | Thông tin bệnh nhân chuẩn xác |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý Bệnh nhân cấp cứu tổng hợp

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Ngày giờ vào ... Ngày giờ ra]
         → [Chẩn đoán (giới thiệu, vào, ra)]
         → [Kết quả điều trị]
         → [Tình trạng lúc ra viện]
         → [Phiếu thanh toán]
         → [Công nợ]
         → [Xem hồ sơ bệnh án điều trị ngoại trú]
         → (End)
```

---

## Trang 58 — 3. Phân hệ Quản lý Bệnh nhân điều trị nội trú

### 3.1. Đặc tả Quản lý Bệnh nhân điều trị nội trú

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý Bệnh nhân điều trị nội trú |
| Mức độ BMT | B |
| Tác nhân | Bác sĩ, Y tá |
| Mô tả | Khi bệnh nhân vào khoa bệnh nhân cập số vào viện, nhập khoa đó bệnh nhân hiện diện trong khoa. Lúc này mới bắt đầu nhập dữ liệu bệnh nhân điều trị nội trú |
| Điều kiện trước | (trống) |
| Luồng sự kiện chính | 1. Nhận bệnh<br>2. Nhập khoa<br>3. Quản lý tủ trực điều trị nội trú<br>4. Chỉ định khám chuyên khoa điều trị nội trú<br>5. Tổng hợp y lệnh điều trị nội trú<br>6. Phiếu công khai thuốc & dịch vụ điều trị nội trú<br>7. Phiếu thanh toán dịch vụ điều trị nội trú<br>8. Xem hồ sơ bệnh án điều trị nội trú<br>9. Tìm kiếm thông tin người bệnh trong và sau điều trị nội trú<br>10. Thống kê danh sách nhập xuất viện<br>11. Báo cáo và truy vấn thông tin điều trị nội trú |
| Luồng rẽ nhánh | Kết thúc hồ sơ bệnh nhân nội trú, chuyển bệnh nhân khoa khác, chuyển viện |
| Điều kiện sau | Hoàn tất hồ sơ điều trị nội trú |
| Yêu cầu | Các thông tin nhập liệu chính như chữ linh, cls, thuốc – phẫu thuật,... in chi phí điều trị nội trú, tiền giường... |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

---

## Trang 59 — Biểu đồ hoạt động Nội trú & 3.2. Quản lý dị ứng thuốc

### Biểu đồ hoạt động: Quản lý Bệnh nhân điều trị nội trú

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Nhận bệnh]
         → [Nhập khoa]
         → [Quản lý tủ trực điều trị nội trú]
         → [Chỉ định khám chuyên khoa điều trị nội trú] → [Tổng hợp y lệnh điều trị nội trú]
         → [Phiếu công khai thuốc & dịch vụ điều trị nội trú]
         → [Phiếu thanh toán dịch vụ điều trị nội trú]
         → [Xem hồ sơ bệnh án điều trị nội trú]
         → [Tìm kiếm thông tin người bệnh trong và sau điều trị nội trú]
         → [Thống kê danh sách nhập xuất viện]
         → [Báo cáo và truy vấn thông tin điều trị nội trú]
         → (End)
```

### 3.2. Đặc tả Quản lý dị ứng thuốc

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý dị ứng thuốc |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Quản lý dị ứng thuốc giúp bác sĩ sử dụng khi cấp đơn hay dự trù thuốc |
| Điều kiện trước | Đăng nhập hệ thống vào đơn thuốc đã thành công |
| Luồng sự kiện chính | 1. Xác định người bệnh<br>2. Hoạt chất<br>3. Mức độ dị ứng thuốc<br>4. Kiểm tra và thông báo dị ứng thuốc khi bác sĩ ra y lệnh |
| Luồng rẽ nhánh | Một bệnh nhân có nhiều thuốc dị ứng |
| Điều kiện sau | Hoàn tất nhập liệu về dị ứng thuốc |
| Yêu cầu | Tên hoạt chất phải chính xác |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

---

## Trang 60 — Biểu đồ hoạt động Dị ứng thuốc & 3.3. Quản lý tai nạn thương tích giao thông

### Biểu đồ hoạt động: Quản lý dị ứng thuốc

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Xác định người bệnh]
         → [Hoạt chất]
         → [Mức độ dị ứng thuốc]
         → [Kiểm tra và thông báo dị ứng thuốc khi bác sĩ ra y lệnh]
         → (End)
```

### 3.3. Đặc tả Quản lý tai nạn thương tích giao thông

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý tai nạn thương tích giao thông |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Khi bệnh nhân tại nạn thương tích giao thông vào cần nhập các thông tin chính xác về vụ tai nạn |
| Điều kiện trước | Đăng nhập hệ thống |
| Luồng sự kiện chính | 1. Địa điểm, thời gian xảy ra tai nạn<br>2. Sơ cấp cứu ban đầu?<br>3. Phương tiện (đưa nạn nhân đến viện, sử dụng khi bị tai nạn, gây tai nạn)<br>4. Thông tin về sử dụng mũ bảo hiểm<br>5. Thông tin về sử dụng rượu bia<br>6. Tình trạng thương tích<br>7. Xử trí (Nhập viện, mổ cấp cứu, tử vong)<br>8. In phiếu |
| Luồng rẽ nhánh | Tiếp tục điều trị |
| Điều kiện sau | Hoàn tất nhập các thông tin về tai nạn thương tích vào giao thông |
| Yêu cầu | Các thông tin chính xác điều kiện để báo cáo về vụ điều trị tai nạn thương tích |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút |

---

## Trang 61 — Biểu đồ hoạt động TNGT & 3.4. Quản lý Tự sát, tự tử hoặc nguyên nhân khác

### Biểu đồ hoạt động: Quản lý tai nạn thương tích giao thông

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Địa điểm, thời gian xảy ra tai nạn]
         → [Sơ cấp cứu ban đầu?]
         → [Phương tiện (đưa nạn nhân đến viện, sử dụng khi bị tai nạn, gây tai nạn)]
         → [Thông tin về sử dụng mũ bảo hiểm]
         → [Thông tin về sử dụng rượu bia]
         → [Tình trạng thương tích]
         → [Xử trí (Nhập viện, mổ cấp cứu, tử vong)]
         → [In phiếu]
         → (End)
```

### 3.4. Đặc tả Quản lý Tự sát, tự tử hoặc nguyên nhân khác

| Trường | Nội dung |
|--------|----------|
| Usecase | Quản lý Tự sát, tự tử hoặc nguyên nhân khác |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |

---

## Trang 62 — Quản lý Tự sát (tiếp) & 3.5. Quản lý bệnh mãn tính

### Quản lý Tự sát, tự tử hoặc nguyên nhân khác (tiếp)

| Trường | Nội dung |
|--------|----------|
| Mô tả | Bệnh nhân tự sát cần khai thác các thông tin |
| Điều kiện trước | Đăng nhập vào hệ thống thành công vào màn hình nhập liệu tự sát |
| Luồng sự kiện chính | 1. Thời điểm xảy ra tự sát<br>2. Nguyên nhân xảy ra<br>3. Hình thức tự sát<br>4. Tình trạng tự sát |
| Luồng rẽ nhánh | Kết thúc hồ sơ |
| Điều kiện sau | Hoàn tất nhập liệu các thông tin tự sát |
| Yêu cầu | Các thông tin nhập liệu theo luồng sự kiện chính |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý Tự sát

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Thời điểm xảy ra tự sát]
         → [Nguyên nhân xảy ra]
         → [Hình thức tự sát]
         → [Tình trạng tự sát]
         → (End)
```

### 3.5. Đặc tả Quản lý bệnh mãn tính

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống — phần tiêu đề) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Theo dõi bệnh mãn tính khi bệnh nhân điều trị |
| Điều kiện trước | Đăng nhập hệ thống thành công |
| Luồng sự kiện chính | 1. Tên bệnh theo chẩn đoán ICD10<br>2. Ghi chú về bệnh mãn tính<br>3. Trình bày bệnh mãn tính khi Bác sỹ theo hồ sơ bệnh án người bệnh |

---

## Trang 63 — Quản lý bệnh mãn tính (tiếp) & 3.6. Quản lý Xét nghiệm, Chẩn đoán hình ảnh, phẫu thuật,...

### Quản lý bệnh mãn tính (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng rẽ nhánh | Kết thúc mắc bệnh mãn tính |
| Điều kiện sau | ICD10 theo chuẩn theo bộ y tế |
| Yêu cầu | Thông tin chính xác |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý bệnh mãn tính

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Tên bệnh theo chẩn đoán ICD10]
         → [Ghi chú về bệnh mãn tính]
         → [Trình bày bệnh mãn tính khi Bác sỹ theo hồ sơ bệnh án người bệnh]
         → (End)
```

### 3.6. Đặc tả Quản lý Xét nghiệm, Chẩn đoán hình ảnh, phẫu thuật,...

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Yêu cầu thực hiện XN, Thăm dò chức năng, CDHA,... |
| Điều kiện trước | Đăng nhập hệ thống thành công |
| Luồng sự kiện chính | 1. Ngày chỉ định<br>2. Chẩn đoán<br>3. Bác sỹ chỉ định<br>4. Tình trạng người bệnh<br>5. Nơi thực hiện<br>6. Nội dung chỉ định<br>7. Ghi chú vị trí thực hiện (nếu có)<br>8. Tạo gói dịch vụ, phác đồ điều trị theo mã ICD 10<br>9. In phiếu chỉ định |

---

## Trang 64 — Biểu đồ hoạt động Chỉ định XN/CĐHA & 3.7. Quản lý cấp đơn thuốc ngoại trú

### Quản lý Xét nghiệm, CĐHA, phẫu thuật (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng rẽ nhánh | Bệnh nhân đi làm xét nghiệm, Chẩn đoán hình ảnh, phẫu thuật... |
| Điều kiện sau | Có kết quả xét nghiệm, chẩn đoán hình ảnh, phẫu thuật |
| Yêu cầu | Các xét nghiệm, chẩn đoán hình ảnh, phẫu thuật phải được khai báo chuẩn theo giá viện phí thông tư áp dụng cho bệnh viện |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý Chỉ định Xét nghiệm/CĐHA

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Bệnh nhân]
         → [Ngày chỉ định] | [Chẩn đoán] | [Nơi thực hiện] | [Nội dung chỉ định]
         → [Bác sĩ chỉ định]         → [Tình trạng người bệnh]
         → [Ghi chú vị trí thực hiện (nếu có)]
         → [Tạo gói dịch vụ, phác đồ điều trị theo mã ICD 10]
         → [In phiếu chỉ định]
         → (End)
```

### 3.7. Đặc tả Quản lý cấp đơn thuốc ngoại trú

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Nhập tên thuốc hoặc mã thuốc |
| Điều kiện trước | Đăng nhập vào hệ thống và đơn thuốc thành công |

---

## Trang 65 — Quản lý cấp đơn thuốc ngoại trú (tiếp theo)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính | 1. Ngày đơn thuốc<br>2. Chẩn đoán<br>3. Dấu sinh tồn người bệnh<br>4. Tên Bác sĩ<br>5. Tên thuốc<br>6. Lời dặn<br>7. Cảnh báo trùng thuốc, hoạt chất<br>8. Cảnh báo tương tác thuốc<br>9. Kiểm tra định mức chi phí đơn thuốc<br>10. Tạo đơn thuốc mẫu theo ICD10<br>11. In đơn thuốc |
| Luồng rẽ nhánh | In chi phí điều trị ngoại trú |
| Điều kiện sau | Kết thúc khám bệnh chuyển chi phí, chuyển vào quầy phát thuốc |
| Yêu cầu | Cấp đơn thuốc sau khi đã chẩn đoán được bệnh |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý cấp đơn thuốc ngoại trú

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Ngày đơn thuốc]
         → [Chẩn đoán]
         → [Dấu sinh tồn người bệnh]
         → [Tên Bác sĩ]
         → [Tên thuốc]
         → [Lời dặn]
         → [Cảnh báo trùng thuốc, hoạt chất]
         → [Cảnh báo tương tác thuốc]
         → [Kiểm tra định mức chi phí đơn thuốc]
         → [Tạo đơn thuốc mẫu theo ICD10]
         → [In đơn thuốc]
         → (End)
```

---

## Trang 66 — 3.8. Đặc tả Quản lý phẫu thuật

### 3.8. Đặc tả Quản lý phẫu thuật

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Lên chi phí cho bệnh nhân, thống kê danh sách nhân viên làm phẫu thuật, theo dõi tình phẫu thuật của bệnh nhân trong quá trình điều trị và quá trình tái khám bệnh nhân được tốt hơn |
| Điều kiện trước | Đăng nhập hệ thống vào nhập liệu phẫu thuật thành công |
| Luồng sự kiện chính | 1. Ngày giờ bắt đầu ... kết thúc phẫu thuật<br>2. Khoa, phòng<br>3. Phòng mổ<br>4. Chẩn đoán trước và sau phẫu thuật<br>5. Phương pháp phẫu thuật<br>6. Phẫu thuật viên chính và y bác sỹ trong phẫu thuật<br>7. Tường trình phẫu thuật<br>8. Tình hình phẫu thuật<br>9. Tai biến?<br>10. Tử vong?<br>11. Thuốc, vật tư trong phẫu thuật<br>12. Phiếu thanh quyết toán<br>13. In phiếu phẫu thuật |
| Luồng rẽ nhánh | Thống kê được danh sách bệnh nhân làm thủ phẫu thuật |
| Điều kiện sau | Bệnh nhân phải có chỉ định phẫu thuật |
| Yêu cầu | Thủ thuật phẫu thuật phải có trong danh mục phẫu thuật của bộ y tế |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

---

## Trang 67 — Biểu đồ hoạt động Phẫu thuật & 3.9. Giấy chứng nhận nghỉ việc hưởng BHXH

### Biểu đồ hoạt động: Quản lý phẫu thuật

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Ngày giờ bắt đầu ... kết thúc phẫu thuật]
         → [Khoa, phòng]
         → [Phòng mổ]
         → [Chẩn đoán trước và sau phẫu thuật]
         → [Phương pháp phẫu thuật]
         → [Phẫu thuật viên chính và y bác sỹ trong phẫu thuật]
         → [Tường trình phẫu thuật]
         → [Tình hình phẫu thuật]
         → [Tai biến?]
         → [Tử vong?]
         → [Thuốc, vật tư trong phẫu thuật]
         → [Phiếu thanh quyết toán]
         → [In phiếu phẫu thuật]
         → (End)
```

### 3.9. Đặc tả Quản lý giấy chứng nhận nghỉ việc hưởng BHXH

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | Bác sĩ, Y tá, NVHC |
| Mô tả | Cấp giấy nghỉ phép theo mẫu BHXH quy định |

---

## Trang 68 — Quản lý giấy BHXH (tiếp) & 3.10. Giấy xác nhận đang điều trị tại Bệnh viện

### Quản lý giấy chứng nhận nghỉ việc hưởng BHXH (tiếp)

| Trường | Nội dung |
|--------|----------|
| Điều kiện trước | Đăng nhập hệ thống vào quản lý giấy chứng nhận nghỉ việc thành công |
| Luồng sự kiện chính | 1. Thời gian nghỉ việc hưởng BHXH<br>2. Lý do giấy nghỉ hưởng BHXH<br>3. In giấy nghỉ hưởng BHXH |
| Luồng rẽ nhánh | In giấy nghỉ hưởng BHXH |
| Điều kiện sau | Hoàn tất in giấy nghỉ hưởng BHXH |
| Yêu cầu | Các thông tin theo mẫu giấy nghỉ phép quy định |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý giấy chứng nhận nghỉ việc hưởng BHXH

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Thời gian nghỉ việc hưởng BHXH]
         → [Lý do giấy nghỉ hưởng BHXH]
         → [In giấy nghỉ hưởng BHXH]
         → (End)
```

### 3.10. Đặc tả Quản lý giấy xác nhận đang điều trị tại Bệnh viện

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý giấy xác nhận đang điều trị thành công |
| Luồng sự kiện chính | 1. Ngày vào, ngày ra điều trị tại Bệnh viện<br>2. Chẩn đoán |

---

## Trang 69 — Giấy xác nhận đang điều trị (tiếp) & 3.11. Quản lý giấy chứng sinh

### Giấy xác nhận đang điều trị tại Bệnh viện (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 3. Hướng điều trị<br>4. Bác sỹ điều trị |
| Luồng rẽ nhánh | In giấy xác nhận đang điều trị kết thúc |
| Điều kiện sau | Thông tin bệnh nhân chuẩn xác |
| Yêu cầu | Hoàn tất luồng sự kiện chính |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Giấy xác nhận đang điều trị tại Bệnh viện

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Ngày vào, ngày ra điều trị tại Bệnh viện]
         → [Chẩn đoán]
         → [Hướng điều trị]
         → [Bác sỹ điều trị]
         → [In giấy xác nhận đang điều trị]
         → (End)
```

### 3.11. Đặc tả Quản lý giấy chứng sinh

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Nhập thông tin của con |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý giấy chứng sinh thành công |
| Luồng sự kiện chính | 1. Dự định đặt tên con<br>2. Sức khỏe của con<br>3. Nguồn đỡ đẻ<br>4. Lãnh đạo ký<br>5. In giấy chứng sinh |

---

## Trang 70 — Giấy chứng sinh (tiếp) & 3.12. Giấy chứng nhận thương tích

### Quản lý giấy chứng sinh (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng rẽ nhánh | Thống kê báo cáo giấy chứng sinh |
| Điều kiện sau | Kết thúc in giấy chứng sinh |
| Yêu cầu | Thông tin trẻ sơ sinh phải nhập chính xác theo hồ sơ |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý giấy chứng sinh

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Dự định đặt tên con]
         → [Sức khỏe của con]
         → [Nguồn đỡ đẻ]
         → [Lãnh đạo ký]
         → [In giấy chứng sinh]
         → (End)
```

### 3.12. Đặc tả Quản lý giấy chứng nhận thương tích

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Nhập thông tin thương tích của bệnh nhân theo mẫu quy định |
| Điều kiện trước | Đăng nhập hệ thống vào chứng nhận thương tích thành công |
| Luồng sự kiện chính | 1. Lý do vào viện<br>2. Chẩn đoán<br>3. Điều trị<br>4. Tình trạng thương tích lúc vào viện<br>5. Tình trạng thương tích lúc ra viện<br>6. Bác sỹ điều trị<br>7. In giấy chứng nhận thương tích |
| Luồng rẽ nhánh | Thống kê thương tích |
| Điều kiện sau | In giấy chứng nhận thương tích |
| Yêu cầu | Hoàn thành các thông tin theo luồng sự kiện chính |

---

## Trang 71 — Biểu đồ hoạt động Thương tích & 3.13. Quản lý giấy chuyển viện

### Biểu đồ hoạt động: Quản lý giấy chứng nhận thương tích

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Lý do vào viện]
         → [Chẩn đoán]
         → [Điều trị]
         → [Tình trạng thương tích lúc vào viện]
         → [Tình trạng thương tích lúc ra viện]
         → [Bác sỹ điều trị]
         → [In giấy chứng nhận thương tích]
         → (End)
```

### 3.13. Đặc tả Quản lý giấy chuyển viện

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Nhập thông tin bệnh nhân chuyển viện |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý giấy chuyển viện thành công |
| Luồng sự kiện chính | 1. Chẩn đoán<br>2. Phương pháp thủ thuật, thuốc đã sử dụng trong điều trị<br>3. Bác sỹ điều trị<br>4. Tình trạng người bệnh lúc chuyển viện<br>5. Lý do chuyển viện<br>6. Hướng điều trị<br>7. Chuyển viện hồi<br>8. Phương tiện vận chuyển<br>9. In giấy chuyển viện |
| Luồng rẽ nhánh | In giấy chuyển viện |
| Điều kiện sau | Kết thúc in giấy chuyển viện |
| Yêu cầu | Thông tin chuyển viện chính xác |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút |

---

## Trang 72 — Biểu đồ hoạt động Chuyển viện & 3.14. Quản lý giấy ra viện

### Biểu đồ hoạt động: Quản lý giấy chuyển viện

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Dấu hiệu lâm sàng]
         → [Các xét nghiệm]
         → [Chẩn đoán]
         → [Phương pháp thủ thuật, thuốc đã sử dụng trong điều trị]
         → [Bác sỹ điều trị]
         → [Tình trạng người bệnh lúc chuyển viện]
         → [Lý do chuyển viện]
         → [Hướng điều trị]
         → [Chuyển viện hồi]
         → [Phương tiện vận chuyển]
         → [In giấy chuyển viện]
         → (End)
```

### 3.14. Đặc tả Quản lý giấy ra viện

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Khi kết thúc điều trị cho bệnh nhân về bệnh viện cấp giấy ra viện cho bệnh nhân |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý giấy ra viện thành công |
| Luồng sự kiện chính | 1. Ngày vào, ngày ra điều trị tại Bệnh viện<br>2. Khoa xuất viện<br>3. Chẩn đoán<br>4. Phương pháp điều trị<br>5. Tình trạng người bệnh lúc xuất viện |

---

## Trang 73 — Giấy ra viện (tiếp) & Biểu đồ hoạt động & 3.15. Quản lý giấy báo tử

### Giấy ra viện (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 6. Lời dặn của thầy thuốc<br>7. Bác sỹ điều trị<br>8. Ngày phẫu thuật<br>9. Phẫu thuật viên chính<br>10. Phương pháp phẫu thuật<br>11. Ngày tái khám?<br>12. In giấy ra viện |
| Luồng rẽ nhánh | Kết thúc đợt vào viện của bệnh nhân |
| Điều kiện sau | Kết thúc đợt và Kết thúc đợt vào viện của bệnh nhân cấp giấy ra viện |
| Yêu cầu | Bệnh nhân phải kết thúc khám bệnh |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý giấy ra viện

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Ngày vào, ngày ra điều trị tại bệnh viện]
         → [Khoa xuất viện]
         → [Chẩn đoán]
         → [Phương pháp điều trị]
         → [Tình trạng người bệnh lúc xuất viện]
         → [Lời dặn thầy thuốc]
         → [Bác sỹ điều trị]
         → [Ngày phẫu thuật]
         → [Phẫu thuật viên chính]
         → [Phương pháp phẫu thuật]
         → [Ngày tái khám]
         → [In giấy ra viện]
         → (End)
```

### 3.15. Đặc tả Quản lý giấy báo tử

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |

---

## Trang 74 — Quản lý giấy báo tử & 3.16. Quản lý phiếu dự trù thuốc, vật tư y tế

### Quản lý giấy báo tử (tiếp)

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Khi bệnh nhân tử vong nhập quản lý giấy báo tử |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý giấy báo tử |
| Luồng sự kiện chính | 1. Ngày giờ giấy báo tử<br>2. Chẩn đoán<br>3. Nguyên nhân<br>4. In giấy báo tử |
| Luồng rẽ nhánh | Xuất viện |
| Điều kiện sau | Kết thúc hồ sơ bệnh án |
| Yêu cầu | Hoàn tất các thông tin tử vong |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,... hỗ trợ thao tác nhập bằng phím tắt |

### Biểu đồ hoạt động: Quản lý giấy báo tử

```
[Đăng nhập hệ thống] → <Thành công? Yes/No>
  → Yes → [Ngày giờ giấy báo tử]
         → [Chẩn đoán]
         → [Nguyên nhân]
         → [In giấy báo tử]
         → (End)
```

### 3.16. Đặc tả Quản lý phiếu dự trù thuốc, vật tư y tế

| Trường | Nội dung |
|--------|----------|
| Usecase | (trống) |
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Khi bệnh nhân có nhu cầu sử dụng thuốc tủ trực |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý phiếu dự trù thuốc, vật tư y tế thành công |
| Luồng sự kiện chính | 1. Ngày y lệnh<br>2. Bác sĩ<br>3. Điều dưỡng |

*(Trang 74 là trang cuối của phạm vi pages 38-74 — usecase 3.16 tiếp tục ở trang 75+)*

---

## Tổng hợp Actors (Tác nhân) xuất hiện trong toàn bộ phần này

| Tác nhân | Viết tắt | Vai trò |
|----------|----------|---------|
| Nhân viên hành chính | NVHC | Tiếp đón, nhập liệu, in phiếu, quản lý danh mục |
| Cán bộ quản lý | CBQL | Duyệt, tổng hợp, báo cáo quản trị |
| Quản trị hệ thống | QTHT | Quản lý người dùng, phân quyền, danh mục, nhật ký |
| Bác sĩ | Bác sĩ | Chỉ định, chẩn đoán, kê đơn, phẫu thuật, ký giấy |
| Y tá / Điều dưỡng | Y tá | Tiếp nhận, nhập liệu CLS, phát thuốc, chăm sóc |
| Kế toán | Kế toán | Thanh toán, viện phí, BHYT, quyết toán |

---

## Tổng hợp các module use case trong phần này (Pages 38-74)

| # | Module | Trang |
|---|--------|-------|
| — | Quản lý phiếu hoàn trả thuốc, vật tư y tế | 38 |
| 4 | Quản lý Khoa Xét nghiệm | 38 |
| — | Quản lý kho máu | 39 |
| 5 | Quản lý Chẩn đoán hình ảnh | 39 |
| 6 | Quản lý Khoa Dinh dưỡng | 40 |
| 7 | Quản lý Dược bệnh viện (Khoa Dược) | 40 |
| — | Quản lý phiếu nhập kho | 41 |
| — | Quản lý phiếu xuất kho | 41 |
| — | Quản lý duyệt cấp theo y lệnh | 42 |
| — | Quản lý duyệt bù cơ số tủ trực | 42 |
| — | Quản lý duyệt hoàn trả thuốc, vật tư y tế | 43 |
| 8 | Quản lý chỉ định tạm ứng | 43 |
| 9 | Quản lý Viện phí | 44 |
| — | Hệ thống quản lý BHYT | 44 |
| 10 | Quản lý Lưu trữ hồ sơ bệnh án | 45 |
| 11 | Quản lý Tổng hợp báo cáo | 46 |
| 12 | Quản lý Vật tư, trang thiết bị y tế | 47 |
| 13 | Quản lý danh mục | 48 |
| 14 | Quản lý người dùng | 48 |
| 15 | Quản lý nhật ký, theo dõi thống kê hệ thống | 48 |
| V.1.1 | UC: Quản lý đặt khám | 49 |
| V.1.2 | UC: Quản lý đón tiếp | 49-51 |
| V.2.1 | UC: Quản lý phòng khám | 51-52 |
| V.2.2 | UC: Quản lý khám sức khỏe | 52-54 |
| V.2.3 | UC: Quản lý Bệnh nhân cấp cứu tổng hợp | 54-57 |
| V.2.4 | UC: Quản lý Bệnh nhân cấp cứu tổng hợp (phác đồ) | 56 |
| V.3.1 | UC: Quản lý Bệnh nhân điều trị nội trú | 58-59 |
| V.3.2 | UC: Quản lý dị ứng thuốc | 59-60 |
| V.3.3 | UC: Quản lý tai nạn thương tích giao thông | 60-61 |
| V.3.4 | UC: Quản lý Tự sát, tự tử hoặc nguyên nhân khác | 61-62 |
| V.3.5 | UC: Quản lý bệnh mãn tính | 62-63 |
| V.3.6 | UC: Quản lý Xét nghiệm, Chẩn đoán hình ảnh, phẫu thuật | 63-64 |
| V.3.7 | UC: Quản lý cấp đơn thuốc ngoại trú | 64-65 |
| V.3.8 | UC: Quản lý phẫu thuật | 66-67 |
| V.3.9 | UC: Quản lý giấy chứng nhận nghỉ việc hưởng BHXH | 67-68 |
| V.3.10 | UC: Quản lý giấy xác nhận đang điều trị tại BV | 68-69 |
| V.3.11 | UC: Quản lý giấy chứng sinh | 69-70 |
| V.3.12 | UC: Quản lý giấy chứng nhận thương tích | 70-71 |
| V.3.13 | UC: Quản lý giấy chuyển viện | 71-72 |
| V.3.14 | UC: Quản lý giấy ra viện | 72-73 |
| V.3.15 | UC: Quản lý giấy báo tử | 73-74 |
| V.3.16 | UC: Quản lý phiếu dự trù thuốc, vật tư y tế | 74 (tiếp tục) |
