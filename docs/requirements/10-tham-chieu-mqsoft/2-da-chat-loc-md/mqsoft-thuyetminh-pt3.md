# Thuyết minh giải pháp phần mềm — Part 3 (Pages 75-111)
> Source: Thuyet minh giai phap phan mem.pdf
> Extracted: 2026-06-01
> Pages: 75–111 (37 pages). Pages 098, 099, 102 could not be read (image too large for API).

---

## Trang 75 — 3.16 (tiếp) Quản lý phiếu dự trù thuốc, vật tư y tế (kết)

Phần cuối bảng đặc tả usecase 3.16:

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 4. Diễn biến bệnh<br>5. Chẩn đoán<br>6. Dấu sinh tồn người bệnh<br>7. Thuốc, vật tư y tế còn tồn tại kho Bệnh viện<br>8. Trừ ảo số lượng tồn kho<br>9. Chuyển số liệu dự trù xuống kho, chờ duyệt<br>10. In phiếu dự trù thuốc, vật tư yế |
| Luồng rẽ nhánh | Chuyển phiếu lĩnh thuốc về bù tủ trực |
| Điều kiện sau | Kế thúc dự trù phiếu dự trù thuốc |
| Yêu cầu | Thuốc sử dụng chỉ có trong tủ trực, thực hiện theo y lệnh của bác sỹ |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 3.16

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Ngày y lệnh
4. Bác sỹ
5. Điều dưỡng
6. Diễn biến bệnh
7. Chẩn đoán
8. Dấu sinh tồn người bệnh
9. Thuốc vật tư y tế còn tồn kho
10. Trừ ảo số lượng tồn kho
11. Chuyển số liệu dự trù xuống kho, chờ duyệt
12. In phiếu dự trù thuốc, vật tư yế
13. [Kết thúc]

---

### 3.17. Đặc tả Quản lý phiếu xuất tủ trực thuốc, vật tư y tế

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Khi bệnh nhân có nhu cầu sử dụng thuốc tủ trực |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý phiếu dự trù thuốc, vật tư y tế thành công |

---

## Trang 76 — 3.17 (tiếp) Quản lý phiếu xuất tủ trực thuốc, vật tư y tế

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Khi bệnh nhân có nhu cầu sử dụng thuốc tủ trực |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý phiếu dự trù thuốc, vật tư y tế thành công |
| Luồng sự kiện chính | 1. Ngày y lệnh<br>2. Bác sỹ<br>3. Điều dưỡng<br>4. Diễn biến bệnh<br>5. Chẩn đoán<br>6. Dấu sinh tồn người bệnh<br>7. Thuốc, vật tư y tế còn tồn tại kho Bệnh viện<br>8. Trừ ảo số lượng tồn kho<br>9. Chuyển số liệu dự trù xuống kho, chờ duyệt<br>10. In phiếu dự trù thuốc, vật tư yế |
| Luồng rẽ nhánh | Chuyển phiếu lĩnh thuốc sử dụng cho bệnh nhân. |
| Điều kiện sau | Hoàn tất lĩnh thuốc, vật tư y tế |
| Yêu cầu | Thuốc phải tồn trong kho bệnh viện, bệnh nhân phải hiện diện trong khoa |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 77 — 3.18. Đặc tả Quản lý phiếu hoàn trả thuốc, vật tư y tế

### Biểu đồ hoạt động — 3.17 (xuất tủ trực)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Ngày y lệnh
4. Bác sỹ
5. Điều dưỡng
6. Diễn biến bệnh
7. Chẩn đoán
8. Dấu sinh tồn người bệnh
9. Thuốc vật tư y tế còn tồn kho
10. Trừ ảo số lượng tồn kho
11. Chuyển số liệu dự trù xuống kho, chờ duyệt
12. In phiếu dự trù thuốc, vật tư yế
13. [Kết thúc]

### 3.18. Đặc tả Quản lý phiếu hoàn trả thuốc, vật tư y tế

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Khi lĩnh thuốc về bệnh nhân không sử dụng hoàn trả lại thuốc về lại kho được |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý hoàn trả thành công |
| Luồng sự kiện chính | 1. Lý do hoàn trả thuốc, vật tư y tế<br>2. Ghi chú hoàn trả thuốc, vật tư y tế<br>3. Nạp thuốc, vật tư y tế đã lĩnh<br>4. Nhập số lượng cần hoàn trả<br>5. Chuyển số liệu thuốc, vật tư y tế xuống kho, chờ duyệt hoàn trả<br>6. In phiếu hoàn trả thuốc, vật tư y tế |
| Luồng rẽ nhánh | Chuyển phiếu xuất kho được |
| Điều kiện sau | Hoàn tất in phiếu hoàn trả |
| Yêu cầu | Hoàn trả phải trước khi bệnh nhân xuất viện. |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 78 — Biểu đồ hoạt động 3.18 + 4. Quản lý Khoa Xét nghiệm

### Biểu đồ hoạt động — 3.18 (hoàn trả thuốc)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Lý do hoàn trả thuốc, vật tư y tế
4. Ghi chú hoàn trả thuốc, vật tư y tế
5. Nạp thuốc, vật tư y tế đã lĩnh
6. Nhập số lượng cần hoàn trả
7. Chuyển số liệu thuốc, vật tư y tế xuống kho, chờ duyệt hoàn trả
8. In phiếu hoàn trả thuốc, vật tư y tế
9. [Kết thúc]

---

## 4. Đặc tả trường hợp sử dụng phân hệ Quản lý Khoa Xét nghiệm

### 4.1. Đặc tả Quản lý Xét nghiệm

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Quản lý khoa xét nghiệm |
| Điều kiện trước | Đăng nhập hệ thống xét nghiệm thành công |
| Luồng sự kiện chính | 1. Huyết học<br>2. Sinh hóa<br>3. Vi sinh<br>4. Miễn dịch |

---

## Trang 79 — 4.1 Quản lý Xét nghiệm (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 5. Quản lý danh mục xét nghiệm<br>6. Quản lý lấy mẫu thử<br>7. Quản lý hóa chất, vật tư tiêu hao<br>8. In phiếu kết quả<br>9. Trả lời kết quả trên mạng<br>10. Tìm kiếm thông tin xét nghiệm<br>11. Báo cáo và truy vấn thông tin xét nghiệm |
| Luồng rẽ nhánh | Trả kết quả xét nghiệm về cho khoa phòng điều trị |
| Điều kiện sau | In kết quả xét nghiệm |
| Yêu cầu | Danh sách làm xét nghiệm được khoa phòng yêu cầu chỉ định |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

*(Trang 79: chỉ có bảng, biểu đồ hoạt động ở trang tiếp)*

---

## Trang 80 — Biểu đồ hoạt động 4.1 + 4.2 Quản lý kho máu

### Biểu đồ hoạt động — 4.1 (Quản lý Xét nghiệm)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Xét nghiệm → phân nhánh: Huyết học | Sinh hóa | Vi sinh | Miễn dịch
4. Quản lý danh mục xét nghiệm
5. Quản lý lấy mẫu thử
6. Quản lý hóa chất, vật tư tiêu hao
7. In phiếu kết quả
8. Trả lời kết quả trên mạng
9. Tìm kiếm thông tin xét nghiệm
10. Báo cáo và truy vấn thông tin xét nghiệm
11. [Kết thúc]

---

### 4.2. Đặc tả Quản lý kho máu

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Cấp phát máu cho khoa phòng lĩnh máu |
| Điều kiện trước | Đăng nhập hệ thống kho máu thành công |
| Luồng sự kiện chính | 1. Nhóm máu, tứ dạng nhóm máu<br>2. Sinh hóa<br>3. Vi sinh<br>4. Cấp phát máu<br>5. Miễn dịch |

---

## Trang 81 — 4.2 Quản lý kho máu (tiếp) + 5. Quản lý Chẩn đoán hình ảnh

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 5. Sàng lọc xét nghiệm<br>6. Quản lý nhập máu<br>7. Quản lý xuất máu<br>8. In phiếu lĩnh máu<br>9. Tìm kiếm thông tin máu<br>10. Báo cáo và truy vấn thông tin máu |
| Luồng rẽ nhánh | Cấp phát máu cho khoa phòng |
| Điều kiện sau | Hoàn tất việc phát máu |
| Yêu cầu | (trống) |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 4.2 (Quản lý kho máu)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Nhóm máu, tứ dạng nhóm máu
4. Bình, hạn dùng
5. Cấp phát máu
6. Miễn dịch
7. Sàng lọc xét nghiệm
8. Quản lý nhập máu
9. Quản lý xuất máu
10. In phiếu lĩnh máu
11. Tìm kiếm thông tin máu
12. Báo cáo và truy vấn thông tin máu
13. [Kết thúc]

---

## 5. Đặc tả trường hợp sử dụng phân hệ Quản lý Chẩn đoán hình ảnh

*(Usecase header xuất hiện cuối trang 81)*

---

## Trang 82 — 5. Quản lý Chẩn đoán hình ảnh

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | Bác sĩ, Y tá |
| Mô tả | Quản lý khoa Chẩn đoán hình ảnh |
| Điều kiện trước | Đăng nhập hệ thống CDHA thành công |
| Luồng sự kiện chính | 1. Siêu âm<br>2. Nội soi<br>3. X-Quang<br>4. Điện tim<br>5. Điện não<br>6. CT-Scanner, Cộng hưởng từ (MRI)<br>7. Quản lý danh mục chẩn đoán hình ảnh<br>8. Quản lý phim, vật tư tiêu hao<br>9. Kết nối máy chẩn đoán hình ảnh với hệ thống<br>10. In phiếu kết quả chẩn đoán hình ảnh<br>11. Trả lời kết quả trên mạng<br>12. Lưu hình ảnh trong ứng dụng để phục vụ bệnh án<br>13. Tìm kiếm thông tin chẩn đoán hình ảnh<br>14. Báo cáo và truy vấn thông tin chẩn đoán hình ảnh |
| Luồng rẽ nhánh | Kết quả trả về cho các khoa phòng |
| Điều kiện sau | Hoàn tất trả kết quả cls |
| Yêu cầu | Danh sách trả kết quả mà phải có |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 83 — Biểu đồ hoạt động 5 + 6. Quản lý Khoa Dinh dưỡng

### Biểu đồ hoạt động — 5 (Quản lý Chẩn đoán hình ảnh)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Quản lý chẩn đoán hình ảnh → phân nhánh: Siêu âm | Nội soi | X-quang | Điện tim | Điện não | CT-Scanner | Cộng hưởng từ (MRI)
4. Quản lý danh mục chẩn đoán hình ảnh
5. Quản lý phim, vật tư tiêu hao
6. Kết nối máy chẩn đoán hình ảnh với hệ thống
7. In phiếu kết quả chẩn đoán hình ảnh
8. Trả lời kết quả trên mạng
9. Lưu hình ảnh trong ứng dụng để phục vụ bệnh án
10. Tìm kiếm thông tin chẩn đoán hình ảnh
11. Báo cáo và truy vấn thông tin chẩn đoán hình ảnh
12. [Kết thúc]

---

## 6. Đặc tả trường hợp sử dụng phân hệ Quản lý Khoa Dinh dưỡng

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Lên thực đơn xuất ăn của bệnh nhân điều trị tại bệnh viện (thực đơn thường, thực đơn bệnh lý) |
| Điều kiện trước | Đăng nhập hệ thống quản lý dinh dưỡng |

---

## Trang 84 — 6. Quản lý Khoa Dinh dưỡng (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính | 1. Danh mục (Thành phần, thực đơn,…)<br>2. Chế độ (Bình thường, Bệnh lý)<br>3. Duyệt phiếu theo y lệnh<br>4. In phiếu thực đơn<br>5. Báo cáo và truy vấn thông tin thực đơn |
| Luồng rẽ nhánh | Duyệt cấp thực đơn |
| Điều kiện sau | Hoàn tất in phiếu thực đơn |
| Yêu cầu | (không nêu cụ thể) |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 6 (Quản lý Dinh dưỡng)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Danh mục (Thành phần, thực đơn,…)
4. Chế độ (Bình thường, Bệnh lý)
5. Duyệt phiếu theo y lệnh
6. In phiếu thực đơn
7. Báo cáo và truy vấn thông tin thực đơn
8. [Kết thúc]

---

## 7. Đặc tả trường hợp sử dụng phân hệ Quản lý Dược bệnh viện

### 7.1. Đặc tả Quản lý Khoa Dược

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |

---

## Trang 85 — 7.1 Quản lý Khoa Dược (tiếp)

| Trường | Nội dung |
|--------|----------|
| Mô tả | Theo dõi nhập, xuất, tồn kho thuốc, vật tư y tế |
| Điều kiện trước | Đăng nhập hệ thống quản lý dược thành công |
| Luồng sự kiện chính | 1. Thuốc<br>2. Vật tư tiêu hao<br>3. Hóa chất<br>4. Quản lý nguyên liệu – thành phẩm<br>5. Quản lý nguồn, giá, hạn dùng, lô, số đăng ký,…<br>6. Quản lý nhập<br>7. Quản lý xuất<br>8. Quản lý tủ trực<br>9. Theo dõi công nợ<br>10. Phiếu đề nghị thanh toán<br>11. Biên bản kiểm nhập |
| Luồng rẽ nhánh | Cung cấp thuốc, vật tư y tế cho các khoa phòng |
| Điều kiện sau | Hoàn tất quá trình nhập xuất thuốc của kho dược |
| Yêu cầu | Quản lý nhập phải có hóa đơn. |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 86 — Biểu đồ hoạt động 7.1 + 7.2 Quản lý phiếu nhập kho

### Biểu đồ hoạt động — 7.1 (Quản lý Khoa Dược)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No] → phân nhánh: Thuốc | Vật tư tiêu hao | Hóa chất
3. Quản lý nguyên liệu – thành phẩm
4. Quản lý nguồn, giá, hạn dùng, lô, số đăng ký,…
5. Quản lý nhập
6. Quản lý xuất
7. Quản lý tủ trực
8. Theo dõi công nợ
9. Phiếu đề nghị thanh toán
10. Biên bản kiểm nhập
11. [Kết thúc]

---

### 7.2. Đặc tả Quản lý phiếu nhập kho

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Nhập thuốc theo hóa đơn mua về |
| Điều kiện trước | Đăng nhập hệ thống được vào quản lý phiếu nhập kho thành công |
| Luồng sự kiện chính | 1. Số, ngày phiếu<br>2. Số, ngày hóa đơn<br>3. Kho nhập<br>4. Nguồn nhập<br>5. Lý do nhập<br>6. Tên thuốc, vật tư y tế trong danh mục Bệnh viện<br>7. Chuyển số lượng nhập vào tồn kho Bệnh viện<br>8. In phiếu nhập kho |
| Luồng rẽ nhánh | Xem tồn kho, xuất cho các khoa phòng sử dụng |
| Điều kiện sau | Hoàn thành phiếu nhập |

---

## Trang 87 — Biểu đồ hoạt động 7.2 + 7.3 Quản lý phiếu xuất kho

| Trường | Nội dung |
|--------|----------|
| Yêu cầu | Thuốc vật tư nhập đúng theo hóa đơn. |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 7.2 (Quản lý phiếu nhập kho)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Số, ngày phiếu
4. Số, ngày hóa đơn
5. Kho nhập
6. Nguồn nhập
7. Lý do nhập
8. Tên thuốc, vật tư y tế trong danh mục Bệnh viện
9. Chuyển số lượng nhập vào tồn kho Bệnh viện
10. In phiếu nhập kho
11. [Kết thúc]

---

### 7.3. Đặc tả Quản lý phiếu xuất kho

*(Usecase header xuất hiện cuối trang 87)*

---

## Trang 88 — 7.3 Quản lý phiếu xuất kho (tiếp) + 7.4 Duyệt cấp theo y lệnh

#### Mô tả — Usecase 7.3

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Theo dõi xuất thuốc, vật tư y tế kho dược |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý xuất kho thành công |
| Luồng sự kiện chính | 1. Số, ngày phiếu<br>2. Kho xuất<br>3. Nạp số lượng còn tồn kho tại Bệnh viện<br>4. Chuyển số lượng xuất vào tồn kho Bệnh viện<br>5. In phiếu xuất kho |
| Luồng rẽ nhánh | Thuốc xuất kho được. |
| Điều kiện sau | Hoàn tất quá trình xuất kho |
| Yêu cầu | Quản lý xuất theo từ phiếu xuất. |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 7.3 (Quản lý phiếu xuất kho)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Số, ngày phiếu
4. Kho xuất
5. Nạp số lượng còn tồn kho tại Bệnh viện
6. Chuyển số lượng xuất vào tồn kho Bệnh viện
7. In phiếu xuất kho
8. [Kết thúc]

---

### 7.4. Đặc tả Quản lý duyệt cấp theo y lệnh

*(Usecase header xuất hiện cuối trang 88)*

---

## Trang 89 — 7.4 Duyệt cấp theo y lệnh (tiếp) + 7.5 Duyệt bù cơ số tủ trực

#### Mô tả — Usecase 7.4

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Xuất thuốc, vật tư y tế ra khỏi kho theo danh sách khoa phòng chuyển lên. |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý duyệt cấp theo y lệnh thành công |
| Luồng sự kiện chính | 1. Ngày duyệt cấp<br>2. Khoa<br>3. Phiếu xuất<br>4. Nạp số liệu thuốc, vật tư y tế khoa dự trữ<br>5. Tổng hợp thành phiếu xuất kho, trừ tồn kho<br>6. In phiếu duyệt cấp theo y lệnh |
| Luồng rẽ nhánh | Thuốc xuất ra khỏi kho. |
| Điều kiện sau | Hoàn tất quá trình duyệt theo y lệnh trong phiếu lĩnh thuốc, vật tư y tế |
| Yêu cầu | Danh sách duyệt thuốc phải được khoa phòng chuyển lên kho được |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 7.4 (Duyệt cấp theo y lệnh)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Ngày duyệt cấp
4. Khoa
5. Phiếu xuất
6. Nạp số liệu thuốc, vật tư y tế khoa dự trữ
7. Tổng hợp thành phiếu xuất kho, trừ tồn kho
8. In phiếu duyệt cấp theo y lệnh
9. [Kết thúc]

---

### 7.5. Đặc tả Quản lý duyệt bù cơ số tủ trực thuốc, vật tư y tế

*(Usecase header xuất hiện cuối trang 89)*

---

## Trang 90 — 7.5 Duyệt bù cơ số tủ trực (tiếp)

#### Mô tả — Usecase 7.5

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Xuất thuốc, vật tư y tế ra khỏi kho theo danh sách khoa phòng chuyển lên. |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý duyệt cấp theo y lệnh |
| Luồng sự kiện chính | 1. Ngày duyệt bù<br>2. Khoa<br>3. Phiếu bù<br>4. Nạp số liệu thuốc, vật tư y tế khoa đã xuất từ trực<br>5. Tổng hợp thành phiếu xuất kho, trừ tồn kho, tăng cơ số tủ trực<br>6. In phiếu duyệt bù cơ số tủ trực thuốc, vật tư y tế |
| Luồng rẽ nhánh | Thuốc được xuất ra khỏi kho bù vào cơ số tủ trực |
| Điều kiện sau | Hoàn tất quá trình duyệt theo y lệnh trong phiếu lĩnh thuốc, vật tư y tế |
| Yêu cầu | (không nêu) |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 7.5 (Duyệt bù cơ số tủ trực)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Ngày duyệt bù
4. Khoa
5. Phiếu bù
6. Nạp số liệu thuốc, vật tư y tế khoa đã xuất từ trực
7. Tổng hợp thành phiếu xuất kho, trừ tồn kho, tăng cơ số tủ trực
8. In phiếu duyệt bù cơ số tủ trực thuốc, vật tư y tế
9. [Kết thúc]

---

## Trang 91 — 7.6. Đặc tả Quản lý duyệt hoàn trả thuốc, vật tư y tế

#### Mô tả — Usecase 7.6

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Duyệt phiếu hoàn trả khi khoa phòng chuyển phiếu lên kho |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý duyệt hoàn trả thành công |
| Luồng sự kiện chính | 1. Ngày duyệt hoàn trả<br>2. Khoa<br>3. Phiếu hoàn trả<br>4. Nạp số liệu thuốc, vật tư y tế khoa hoàn trả<br>5. Tổng hợp thành phiếu hoàn trả, tăng tồn kho |
| Luồng rẽ nhánh | Thuốc được thu hồi về lại kho |
| Điều kiện sau | Hoàn tất duyệt hoàn trả |
| Yêu cầu | Nhận thuốc hoàn trả. |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

*(Biểu đồ hoạt động ở trang tiếp)*

---

## Trang 92 — Biểu đồ hoạt động 7.6 + 8. Quản lý Chi định tạm ứng

### Biểu đồ hoạt động — 7.6 (Duyệt hoàn trả thuốc)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Ngày duyệt hoàn trả
4. Khoa
5. Phiếu hoàn trả
6. Nạp số liệu thuốc, vật tư y tế khoa hoàn trả
7. Tổng hợp thành phiếu hoàn trả, tăng tồn kho
8. In phiếu duyệt hoàn trả thuốc, vật tư y tế
9. [Kết thúc]

---

## 8. Đặc tả trường hợp sử dụng phân hệ Quản lý Chi định tạm ứng

#### Mô tả — Usecase 8

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Bệnh nhân điều trị sử dụng dịch vụ, thuốc được chỉ định đồng tạm ứng |
| Điều kiện trước | Đăng nhập hệ thống vào chỉ định tạm ứng thành công |
| Luồng sự kiện chính | 1. Ngày tạm ứng<br>2. Nội dung tạm ứng<br>3. Lần thứ?<br>4. Số tiền tạm ứng?<br>5. In phiếu tạm ứng |
| Luồng rẽ nhánh | Chuyển danh sách thu tạm ứng ra viện phí |
| Điều kiện sau | Kết thúc chỉ định tạm ứng in phiếu đề nghị tạm ứng |
| Yêu cầu | Bệnh nhân đang điều trị |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 93 — Biểu đồ hoạt động 8 + 9. Quản lý Viện phí

### Biểu đồ hoạt động — 8 (Quản lý Chỉ định tạm ứng)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Ngày tạm ứng
4. Nội dung tạm ứng
5. Lần thứ?
6. Số tiền tạm ứng?
7. In phiếu tạm ứng
8. [Kết thúc]

---

## 9. Đặc tả trường hợp sử dụng phân hệ Quản lý Viện phí

### 9.1. Đặc tả Quản lý Viện phí

#### Mô tả — Usecase

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | Kế toán, NVHC |
| Mô tả | Quản lý thu viện phí của bệnh viện |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý viện phí thành công |
| Luồng sự kiện chính | 1. Thu khám bệnh<br>2. Thu cận lâm sàng<br>3. Thu tiền chênh lệch<br>4. Thu tiền dịch vụ,ngoài giờ<br>5. Thu tạm ứng<br>6. Thu thanh toán ra viện<br>7. Chi hoàn, miễn giải<br>8. Tự hóa đơn thu tiền<br>9. Tìm kiếm thông tin người bệnh, biên lai<br>10. Bảng kê thu tiền<br>11. Biên lai<br>12. BHYT, Trẻ em<6 tuổi,…<br>13. Khoa phòng<br>14. Dịch vụ<br>15. Miễn giảm |

---

## Trang 94 — 9.1 Quản lý Viện phí (tiếp) + 10. Lưu trữ hồ sơ bệnh án

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 16. Doanh thu khoa, toàn viện<br>17. Danh sách xuất viện phí, in báo cáo thi chi |
| Luồng rẽ nhánh | In biên lai cho bệnh nhân |
| Điều kiện sau | Kết thúc thu viện phí, in báo cáo thu chi |
| Yêu cầu | Thu theo danh sách chuyển xuống từ khoa phòng |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

*(Biểu đồ hoạt động của Quản lý Viện phí không hiển thị riêng — nằm trong luồng tổng hợp trang 97)*

---

## 10. Đặc tả trường hợp sử dụng phân hệ Quản lý Lưu trữ hồ sơ bệnh án

#### Mô tả — Usecase 10

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | NVHC, Y tá, Bác sĩ |
| Mô tả | Lưu trữ hồ sơ bệnh án khi bác sĩ điều trị kết thúc hồ sơ. |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý lưu trữ hồ sơ bệnh án |
| Luồng sự kiện chính | 1. Nhập vị trí hồ sơ bệnh án<br>2. Quản lý mượn<br>3. Quản lý trả<br>4. Tìm kiếm thông tin hồ sơ bệnh án<br>5. Báo cáo và truy vấn thông tin hồ sơ bệnh án |
| Luồng rẽ nhánh | Báo cáo và truy vấn thông tin hồ sơ bệnh án |
| Điều kiện sau | Thống kê hồ sơ lưu trữ |
| Yêu cầu | Hồ sơ lưu trữ theo hệ thống. |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 95 — Biểu đồ hoạt động 10 + 11. Quản lý Tổng hợp báo cáo

### Biểu đồ hoạt động — 10 (Lưu trữ hồ sơ bệnh án)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Nhập vị trí hồ sơ bệnh án
4. Quản lý mượn
5. Quản lý trả
6. Tìm kiếm thông tin hồ sơ bệnh án
7. Báo cáo và truy vấn thông tin hồ sơ bệnh án
8. [Kết thúc]

---

## 11. Đặc tả trường hợp sử dụng phân hệ Quản lý Tổng hợp báo cáo

#### Mô tả — Usecase 11

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Thống kê các biểu mẫu báo cáo |
| Điều kiện trước | Đăng nhập vào hệ thống báo cáo |
| Luồng sự kiện chính | 1. Báo cáo trực lãnh đạo.<br>2. Thống kê bệnh viện theo tuyến.<br>3. Báo cáo chuyển viện.<br>4. Sổ vào viện – ra viện – chuyển viện.<br>5. Thống kê số bệnh án an tử vong.<br>6. Thống kê kế theo tháng.<br>7. Thống tin chuyển viện.<br>8. Thống kê ra viện theo mã bệnh ICD10, đối tượng.<br>9. Biểu 14.5 Báo cáo thống kê tài an thương tích.<br>10. Tổng hợp khám bệnh theo ICD10<br>11. Thống kê ICD10 theo lượt khám.<br>12. Lưu hành bệnh án.<br>13. Thống kê nhập xuất theo lô.<br>14. Thống kê dùng thuốc và chỉ định theo bác sỹ.Thống kê nhập khẩu – chuyển viện theo nhóm bệnh – khoa.<br>15. Bảng phụ cấp PTTT chi tiết theo khoa.<br>16. Doanh thu toàn bệnh viện.<br>17. Chỉ định CLS – Bác sĩ – Viện phí.<br>18. Danh sách chỉ định dịch vụ – thuốc Nội trú.<br>19. Danh sách chỉ hoàn tạm ứng. |

---

## Trang 96 — 11. Tổng hợp báo cáo (tiếp — danh sách báo cáo đầy đủ)

| Luồng sự kiện chính (tiếp) | |
|---|---|
| 20. | Tổng hợp tổng tạm ứng. |
| 21. | Tìm thông tin thu tạm ứng. |
| 22. | Bảng kê thu tạm ứng. |
| 23. | Bảng kê thu hoàn trả. |
| 24. | Xuất kho chi tiết theo khoa phòng sử dụng. |
| 25. | Báo cáo nhập xuất tồn kho biên lại sử dụng. |
| 26. | Báo cáo tình trạng tồn kho thuốc (từng lô, từng kho, từng loại). |
| 27. | Danh sách BN sử dụng thuốc theo ICD10. |
| 28. | Nhập kho theo nhà cung cấp. |
| 29. | Báo cáo xuất chuyển kho. |
| 30. | Xuất kho theo thao khoa phòng và đối tượng. |
| 31. | Xổ thoá thao khoa phòng và đối tượng.Xuất kho theo ly do. |
| 32. | Số theo dõi xuất kho chi tiết bệnh nhân. |
| 33. | Thống kê đơn thuốc bệnh nhân theo tháng. |
| 34. | Báo cáo tổng hợp theo khu vực tiếp nhận và điều trị. |
| 35. | Báo cáo sử dụng thuốc tại Khoa. |
| 36. | Báo cáo còn tồn kho. |
| 37. | Thể kho (thông tư 22-23). |
| 38. | Báo cáo công cộng Dược BV (thông tư 22-23). |
| 39. | Báo cáo bổ sung phòng thống kê theo tháng tồn thuốc (thông tư 22-23). |
| 40. | Báo cáo sử dụng dược chất, hoạt chất (thông tư 22-23). |
| 41. | Báo cáo sử dụng hóa chất (thông tư 22-23). |
| 42. | Báo cáo sử dụng kháng sinh (thông tư 22-23). |
| 43. | Biên bản kiểm kê tiêu hao. |
| 44. | Biên bản kiểm kê vật tư y tế tiêu hao (thông tư 22-23). |
| 45. | Biên bản kiểm kê hóa chất (thông tư 22-23). |
| 46. | Biên bản các nhận thuốc, hóa chất, … mặt hàng/vỡ (thông tư 22-23). |
| 47. | Biên bản thanh lý thuốc, hóa chất, VTYT tiêu hao (thông tư 22-23). |
| 48. | Sổ hộp hồi đồng thuốc và điều trị (thông tư 22-23). |
| 49. | Sổ kiểm nhập thuốc, hóa chất, VTYT tiêu hao (thông tư 22-23). |
| 50. | Sổ pha chế (thông tư 22-23). |
| 51. | Phiếu hoàn trả thuốc, hóa chất, VTTH (thông tư 22-23). |
| 52. | Phiếu lĩnh thuốc. |
| 53. | Bảng giá thuốc. |
| 54. | Bảng theo dõi giá nhập. |
| Luồng rẽ nhánh | Thống kê được báo cáo hoạt động của bệnh viện |
| Điều kiện sau | Kết thúc lấy báo cáo |
| Yêu cầu | Các báo cáo phải theo mẫu biểu chuẩn của bệnh viện. |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 97 — Biểu đồ tổng hợp Báo cáo (activity diagram phức tạp)

Trang 97 chứa một biểu đồ hoạt động lớn (activity diagram tổng hợp) cho toàn bộ phân hệ Quản lý tổng hợp báo cáo. Biểu đồ có nhiều swim lane / nhánh song song:

**Các luồng song song từ Đăng nhập hệ thống:**

Nhánh trái (Báo cáo lãnh đạo/tổng hợp):
- Báo cáo trực lãnh đạo
- Quản lý thông tin bệnh nhân
- Báo cáo chuyển viện
- Chi tiếm BN tỷ vụ / đặc điểm
- Thống kê kê toán mã bệnh ICD10, đối tượng
- Biểu 14.5 Báo cáo thống kê tài an thương tích
- Tổng hợp khám bệnh theo ICD10
- Thống kê ICD10 theo lượt khám
- Hoạt động phòng khu – thống kê chuyển viện dịch chuyển nghiệm nhận từ thống kê thông tin
- Thống kê nhập vào theo lô và vào hiệu quả theo thống kê dịch

Nhánh giữa (Dược/kho):
- Đăng nhập hệ thống (chung)
- Bảng kê thu tạm ứng
- Bảng kê thu (danh các phiếu xuất kho)
- In tờ rõ vào kho, xuất thống kê
- Bảng báo cáo nhập thống kê, kho cùng danh sách thuốc theo ICD10
- Nhập kho theo nhà cung cấp
- In phiếu xuất kho dịch chuyển
- Xuất kho theo khoa phòng và đối tượng
- Xổ thoá theo ly do
- Số theo dõi xuất kho chi tiết bệnh nhân
- Thống kê đơn thuốc bệnh nhân theo tháng
- Báo cáo tổng hợp theo khu vực tiếp nhận & điều trị
- Báo cáo sử dụng thuốc tại Khoa
- Báo cáo còn tồn kho
- Thể kho (thông tư 22-23)
- Báo cáo công cộng dược BV (TT 22-23)
- Báo cáo bổ sung phòng thống kê theo tháng tồn thuốc (TT 22-23)
- Báo cáo sử dụng dược chất, hoạt chất (TT 22-23)
- Báo cáo sử dụng hóa chất (TT 22-23)
- Báo cáo sử dụng kháng sinh (TT 22-23)
- Biên bản kiểm kê tiêu hao
- VTYT tiêu hao (TT 22-23)
- Biên bản các nhận thuốc, hóa chất, mặt hàng/vỡ (TT 22-23)
- Biên bản thanh lý thuốc, hóa chất, VTYT (TT 22-23)
- Sổ hội đồng thuốc & điều trị (TT 22-23)
- Sổ kiểm nhập (TT 22-23)
- Sổ pha chế (TT 22-23)
- Phiếu hoàn trả thuốc, VTTH (TT 22-23)
- Phiếu lĩnh thuốc
- Bảng giá thuốc
- Bảng theo dõi giá nhập

Nhánh phải (Viện phí/thu chi):
- Doanh thu toàn bệnh viện
- Chỉ định CLS – Bác sĩ – Viện phí
- Danh sách chỉ định dịch vụ – thuốc Nội trú
- Danh sách chỉ hoàn tạm ứng
- Tổng hợp tổng tạm ứng
- Tìm thông tin thu tạm ứng
- Bảng kê thu tạm ứng
- Bảng kê thu hoàn trả

---

## 12. Đặc tả trường hợp sử dụng phân hệ Quản lý Vật tư, trang thiết bị y tế

#### Mô tả — Usecase 12

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Quản lý lý nhập xuất vật tư, trang thiết bị y tế |
| Điều kiện trước | Đăng nhập hệ thống quản lý trang thiết bị y tế |
| Luồng sự kiện chính | 1. Danh mục<br>2. Quản lý hình<br>3. Quản lý nguồn, giá, model, số hiệu, công suất,…<br>4. Quản lý tình trạng, nguồn gốc, tỷ lệ khấu hao,…<br>5. Quản lý nhập<br>6. Quản lý xuất<br>7. Theo dõi công nợ<br>8. Phiếu đề nghị thanh toán<br>9. Biên bản kiểm nhập<br>10. Biên bản bàn giao nhận<br>11. Biên bản bàn giao<br>12. Dụng cụ kém theo |

---

## Trang 098 — [KHÔNG ĐỌC ĐƯỢC — ảnh quá lớn]

> Trang này không thể đọc do kích thước ảnh vượt giới hạn API. Nội dung có thể là phần tiếp theo của Usecase 12 (Vật tư, trang thiết bị y tế) và/hoặc biểu đồ hoạt động tương ứng.

---

## Trang 099 — [KHÔNG ĐỌC ĐƯỢC — ảnh quá lớn]

> Trang này không thể đọc do kích thước ảnh vượt giới hạn API. Nội dung có thể là phần 13. Quản lý Nhân sự và biểu đồ hoạt động tương ứng.

---

## Trang 100 — 13. Quản lý Nhân sự (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 1. Danh mục<br>2. Quyết định học việc, thử việc.<br>3. Quyết định hợp đồng<br>4. Quyết định tiếp nhận và bổ nhiệm người lao động<br>5. Cập nhật hồ sơ nhân viên<br>6. Chính sửa hợp đồng, phụ cấp thêm(nếu có)<br>7. Cập nhật quá trình công tác<br>8. Cập nhật kết quả đào tạo, quá trình đào tạo tại cơ quan<br>9. Cập nhật thông tin gia cảnh<br>10. Cập nhật thông tin sức khỏe<br>11. Cập nhật thông tin đoàn đảng, đoàn<br>12. Mẫu khai thêm gia BHXH 01A-TS<br>13. Danh sách lao động đề nghị cấp sổ A01a-BHXH<br>14. Tạo sổ liêu cần hợp<br>15. Cập nhật thông tin sổ số BHXH, BHYT<br>16. Tạo sổ liêu cần khoá phòng<br>17. Chám công khoá phòng<br>18. Quyết định luân chuyển, bổ nhiệm chức vụ<br>19. Quyết định đi học chuyên môn<br>20. Quyết định đi học nước ngoài<br>21. Quyết định nghỉ không hưởng, thời kiểm nhiệm, thời vụ,… |
| Luồng rẽ nhánh | Thống kê, chấm công, lên bảng lương cho nhân viên |
| Điều kiện sau | Hoàn tất nhập liệu thông tin của nhân nhân viên |
| Yêu cầu | Thông kê, chấm công, lên bảng lương cho nhân viên |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 101 — Biểu đồ hoạt động 13 (Nhân sự) + 14. Quản lý Chất lượng bệnh viện

### Biểu đồ hoạt động — 13 (Quản lý Nhân sự)

Các luồng song song (swim lanes) sau khi Đăng nhập hệ thống:

**Nhóm Hành chính/Hợp đồng:**
- Danh mục
- Quyết định học việc, thử việc
- Quyết định hợp đồng lao động
- Quyết định tiếp nhận và bổ nhiệm người lao động
- Cập nhật hồ sơ nhân viên
- Chính sửa hợp đồng, phụ cấp thêm (nếu có)
- Cập nhật quá trình công tác

**Nhóm Đào tạo/Gia cảnh:**
- Cập nhật kết quả đào tạo, quá trình đào tạo tại cơ quan
- Cập nhật thông tin gia cảnh
- Cập nhật thông tin sức khỏe
- Chám công khoá phòng
- Quyết định luân chuyển, bổ nhiệm chức vụ
- Quyết định đi học chuyên môn
- Quyết định đi học nước ngoài
- Danh sách bình bầu thi đua khen thưởng (tập thể, cá nhân)

**Nhóm BHXH/BHYT:**
- Cập nhật thông tin đoàn đảng, đoàn
- Mẫu khai thêm gia BHXH 01A-TS
- Danh sách lao động đề nghị cấp sổ A01a-BHXH
- Cập nhật thông tin sổ số BHXH, BHYT
- Tạo sổ liêu cán bộ phòng

**Nhóm Tổ chức:**
- [Kết thúc chung]

---

## 14. Đặc tả trường hợp sử dụng phân hệ Quản lý Chất lượng bệnh viện

#### Mô tả — Usecase 14

**Usecase: Đặc tả trường hợp sử dụng phân hệ Quản lý Chất lượng bệnh viện**

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | CBQL, NVHC |
| Mô tả | Quản lý công văn |
| Điều kiện trước | Đăng nhập hệ thống quản lý công văn |
| Luồng sự kiện chính | 1. Danh mục<br>2. Công văn Đến<br>3. Công văn đi<br>4. Soạn công văn<br>5. Mượn công văn<br>6. Tra công văn<br>7. Phân quyền<br>8. Duyệt nội dung<br>9. Báo cáo thống kê |
| Luồng rẽ nhánh | Thống kê báo cáo công văn |
| Điều kiện sau | Kiểm soát công văn |
| Yêu cầu | (không nêu) |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

---

## Trang 102 — [KHÔNG ĐỌC ĐƯỢC — ảnh quá lớn]

> Trang này không thể đọc do kích thước ảnh vượt giới hạn API. Nội dung có thể là biểu đồ hoạt động 14 (Quản lý Chất lượng/Công văn) và phần đầu usecase 15 (Quản lý Danh mục dùng chung).

---

## Trang 103 — 15. Quản lý Danh mục dùng chung (tiếp) + 16. Quản lý Người dùng

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính | 2. Quản lý danh mục hệ thống có thể sửa danh mục dữ liệu dùng chung<br>3. Quản lý danh mục hệ thống có thể xóa danh mục dữ liệu dùng chung<br>4. Quản lý danh mục hệ thống có thể tìm kiếm/tiết kê danh mục dữ liệu dùng chung |
| Luồng rẽ nhánh | Danh mục khai báo xong các chương trình mới sử dụng được |
| Điều kiện sau | Hoàn tất khai báo danh mục |
| Yêu cầu | Danh mục phải chuẩn xác. |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 15 (Quản lý Danh mục dùng chung)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. Quản lý danh mục hệ thống có thể thêm mới danh mục dữ liệu dùng chung
3. Quản lý danh mục hệ thống có thể sửa danh mục dữ liệu dùng chung
4. Quản lý danh mục hệ thống có thể xóa danh mục dữ liệu dùng chung
5. Quản lý danh mục hệ thống có thể tìm kiếm/liệt kê danh mục dữ liệu dùng chung
6. [Kết thúc]

---

## 16. Đặc tả trường hợp sử dụng phân hệ Quản lý Người dùng

#### Mô tả — Usecase 16

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | QTHT |
| Mô tả | Phân quyền, theo tùng user sử dụng chương trình. |
| Điều kiện trước | Đăng nhập hệ thống vào quản lý người dùng thành công. |
| Luồng sự kiện chính | 1. Quản lý tài khoản người sử dụng – phía quản trị, QTHT có thêm một mới tài khoản người sử dụng<br>2. QTHT có thể sửa một tài khoản người sử dụng<br>3. QTHT có thể xóa một tài khoản người sử dụng<br>4. QTHT có thể tìm kiếm liệt kê danh sách tài khoản người sử dụng |

---

## Trang 104 — 16. Quản lý Người dùng (tiếp)

| Trường | Nội dung |
|--------|----------|
| Luồng sự kiện chính (tiếp) | 5. Phân quyền trên hệ thống, QTHT có thể thêm quyền sử dụng cho người sử dụng.<br>6. Phân quyền trên hệ thống, QTHT có thể xóa quyền sử dụng cho người sử dụng.<br>7. Phân quyền trên hệ thống, QTHT có thể sửa quyền sử dụng cho người sử dụng.<br>8. Phân quyền trên hệ thống, QTHT có thể liệt kê quyền sử dụng của một người sử dụng |
| Luồng rẽ nhánh | Cấp user sử dụng chương trình |
| Điều kiện sau | Hoàn tất việc cấp user |
| Yêu cầu | Cấp user chính xác user |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 16 (Quản lý Người dùng)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. Quản lý tài khoản người sử dụng – phía quản trị, QTHT có thêm một mới tài khoản người sử dụng
3. QTHT có thể sửa một tài khoản người sử dụng
4. QTHT có thể xóa một tài khoản người sử dụng
5. QTHT có thể tìm kiếm liệt kê danh sách tài khoản người sử dụng
6. Phân quyền trên hệ thống, QTHT có thể thêm quyền sử dụng cho người sử dụng
7. Phân quyền trên hệ thống, QTHT có thể xóa quyền sử dụng cho người sử dụng
8. Phân quyền trên hệ thống, QTHT có thể sửa quyền sử dụng cho người sử dụng
9. Phân quyền trên hệ thống, QTHT có thể liệt kê quyền sử dụng của một người sử dụng
10. [Kết thúc]

---

## 17. Đặc tả trường hợp sử dụng phân hệ Quản lý Nhật ký, theo dõi thống kê hệ thống

*(Usecase header xuất hiện cuối trang 104)*

---

## Trang 105 — 17. Quản lý Nhật ký, theo dõi hệ thống

#### Mô tả — Usecase 17

| Trường | Nội dung |
|--------|----------|
| Mức độ BMT | B |
| Tác nhân | QTHT |
| Mô tả | Theo dõi thống kê hệ thống |
| Điều kiện trước | Đăng nhập hệ thống thành công |
| Luồng sự kiện chính | 1. Lập nhật ký hệ thống<br>2. Theo dõi, thống kê nhật ký hệ thống<br>3. QTHT có thể sao lưu và phục hồi dữ liệu hệ thống |
| Luồng rẽ nhánh | (không nêu) |
| Điều kiện sau | Hoàn tất luồng sự kiện chính |
| Yêu cầu | QTHT phải tìm hiểu sau về hệ thống chương trình |
| Giao diện | Các danh sách thể hiện dạng grid, các form nhập thông tin cần có các nút Thêm mới, Chỉnh sửa,… hỗ trợ thao tác nhập bằng phím tắt. |

### Biểu đồ hoạt động — 17 (Nhật ký hệ thống)

Luồng tuần tự:
1. Đăng nhập hệ thống
2. [Quyết định: Yes/No]
3. Lập nhật ký hệ thống
4. Theo dõi, thống kê nhật ký hệ thống
5. QTHT có thể sao lưu và phục hồi dữ liệu hệ thống
6. [Kết thúc]

---

## Phần VI — YÊU CẦU KHÁC

## Trang 106 — VI. Yêu cầu khác

### Bảng tổng hợp yêu cầu hệ thống

| STT | Mô tả yêu cầu cần đáp ứng |
|-----|---------------------------|
| **I** | **Yêu cầu chung** |
| 1 | Giao diện người dùng thiết kế dạng Winform |
| 2 | Phần mềm hoạt động thông suốt, ổn định, có khả năng đáp ứng số lượng truy cập lớn tại cùng một thời điểm |
| 3 | Phần mềm có khả năng khai thác dữ liệu khác nhau: đồ thị, bảng, có thể mở hình máy chủ ứng dụng CSDL |
| 4 | Phần mềm cho phép cài đặt trọng hệ thống ha tầng mạng được phân vùng bảo mật nhiều lớp |
| 5 | Phần mềm cho phép cài đặt và vận hành ổn định trên môi trường hệ điều hành Windows (phiên bản XP/7/8/8.1/10) |
| 6 | Cho phép cài đặt và vận hành ổn định trên môi trường hệ điều hành Windows (phiên bản XP/7/8.1/10) |
| **II** | **Yêu cầu về lưu trữ** |
| 1 | Cơ sở dữ liệu có khả năng lưu trữ với dung lượng lớn, trong thời gian lâu dài |
| 2 | Cơ bộ chứa các loại dữ liệu khác nhau: đồ thị, cấu trúc, đồ thị phi cấu trúc (dưới dạng tập tin như hình ảnh, văn bản, bảng tính,…) |
| 3 | Chuẩn hóa dữ liệu theo chuẩn Unicode |
| **III** | **Yêu cầu về giao diện phần mềm** |
| 1 | Giao diện thiết kế đám bảo các tiêu chí: tiện dụng, thẩm mỹ, khoa học |
| 2 | Hỗ trợ hiển thị tiếng Việt chuẩn Unicode |
| 3 | Hỗ trợ các thao tác nhập liệu với các phím tắt để tăng tốc độ nhập liệu |
| **IV** | **Yêu cầu về kết nối thiết bị** |
| 1 | Phần mềm hỗ trợ kết nối với các máy in, máy quét mã,… |
| **V** | **Yêu cầu về khai thác, vận hành** |
| 1 | Cho phép sao lưu dữ liệu định kỳ và đột xuất |
| 2 | Cho phép phục hồi dữ liệu khi hệ thống gặp sự cố |

---

## Phần II — ĐIỀU KIỆN VỀ HẠ TẦNG KỸ THUẬT CÔNG NGHỆ THÔNG TIN

## Trang 107 — Phần II: Điều kiện về hạ tầng kỹ thuật CNTT

### 1. Yêu cầu chung

Kiến trúc hạ tầng và triển khai hạ tầng kỹ thuật Công Nghệ Thông Tin đáp ứng các yêu cầu sau:
- Hiệu năng (Capacity)
- Sẵn sàng/ Khả dụng (Availability)
- Dịch vụ liên tục (Continuity)
- Bảo mật (Security)
- Bảo trì & bảo dưỡng định kỳ

### 2. Đối với hoạt động cơ sở dụng máy chủ và phần mềm hệ thống

**a. Bảo đảm hạ tầng máy chủ và các thiết bị đi kèm có đủ công suất, hiệu năng, tốc độ xử lý truyền xuất dữ liệu, đáp ứng yêu cầu triển khai các hoạt động y tế trên môi trường mạng:**

- i. Bộ vi xử lý trung tâm: ít nhất 8 core và tốc độ từ 3Ghz trở lên.
- ii. Bộ nhớ: ít nhất 192GB.
- iii. Ổ cứng: SSD Enterprise với khả năng ghi ngẫu nhiên ít nhất 1000iops/queue, và bao gồm ít nhất 4 ổ cứng hoạt động đồng thời với cơ chế raid 10.

**b. Bảo đảm hệ thống máy chủ có tổ tính sẵn sàng cao, cơ chế dự phòng linh hoạt để hoạt động liên tục:**

- **b.1: Phương án truyền thống (3-Tier – Hình bên trái):**
  - i. Có ít nhất 2 máy chủ hoạt động đồng thời và hỗ trợ ảo hóa.
  - ii. Có ít nhất 2 hệ thống lưu trữ (SAN) và chuyển mạch lưu trữ (SAN switch) hoạt động đồng thời và đồng bộ.
  - iii. Có ít nhất 2 thiết bị chuyển mạch trung tâm (core switch) hoạt động đồng thời và băng thông từng thiết bị.

- **b.2: Phương án hạ tầng hội tụ (Hyperconverged Infrastructure (HCI) – Hình bên phải):**
  - i. Có ít nhất 3 máy chủ hoạt động đồng thời và hỗ trợ ảo hóa.
  - ii. Có ít nhất 2 thiết bị chuyển mạch trung tâm (core switch) hoạt động đồng thời và băng thông **10Gbps**.
  - iii. Thiết bị được cấu hình có tính chịu lỗi (failover) và sẵn sàng (HA).

**c. Bảo đảm hệ thống phần mềm hệ thống cài đặt trên các phần mềm mã nguồn mở hoặc các phần mềm mã nguồn mở được dùng rộng rãi trong nước và quốc tế.**

**Hình minh họa:** Figure. 3-Tier vs. HCI (b.1: Phương án truyền thống 3-Tier — Hình bên trái)

---

## Trang 108 — Hạ tầng mạng LAN + CSDL

### (Tiếp tục phần 2c & mục 3, 4)

**c. (tiếp) Phương án b.2 HCI:**
- i. Có ít nhất 2 máy chủ hoạt động đồng thời và hỗ trợ ảo hóa.
- ii. Có ít nhất 2 hệ thống lưu trữ (SAN) và chuyển mạch lưu trữ (SAN switch) hoạt động đồng thời và đồng bộ.
- iii. Có ít nhất 2 thiết bị chuyển mạch trung tâm (core switch) hoạt động đồng thời và băng thông từng thiết bị.

### 3. Hệ thống mạng tập trung

**a.** Hệ thống mạng (mạng viễn thông, mạng internet, mạng điện rộng, mạng nội bộ) và các kết nối khác) được thiết kế, triển khai khai phủ hợp, có bộ thống đáp ứng mục đích sử dụng; trường hợp hợp đồng ghi rõ ở Điều 16 của Luật viễn thông.

**b.** Sử dụng các thiết bị chuyển mạch cho doanh nghiệp:
- i. Có tính năng giám sát và quản lý từ trung tâm.
- ii. Hỗ trợ Spanning Tree Protocol.
- iii. Hỗ trợ Storm Control.
- iv. Hỗ trợ Port Channel với Protocol LACP.

**c.** Phương án dự phòng đầy đủ bảo đảm hoạt động của hệ thống mạng:
- i. Có ít nhất 2 core-switch layer 3.
- ii. Các switch access có ít nhất 2 đường uplink về core switch.
- iii. Băng thông tối thiểu cho switch core và uplink access switch là 1Gbps.
- iv. Có thiết bị dự phòng thay thế để sẵn cho các switch access.
- v. Phần mềm phân tích, quản lý giám sát và ghi vết (log) phải có bản quyền hoặc các phần mềm mã nguồn mở dùng rộng rãi trong nước và quốc tế.

**d.** Phần mềm phân tích, quản lý giám sát và ghi vết (log) phải có bản quyền hoặc các phần mềm mã nguồn mở dùng rộng rãi trong nước và quốc tế.

### 4. Cơ sở dữ liệu tập trung

**a.** Cơ sở dữ liệu sử dụng cho các hoạt động y tế trên môi trường mạng phải ổn định; xử lý, lưu trữ nguồn gốc dữ liệu rõ ràng hosting được mã nguồn mở dùng rộng rãi trong nước và quốc tế.

**b.** Hệ quản trị cơ sở dữ liệu mã nguồn gốc, xử lý rõ ràng hosting được mã nguồn mở dùng rộng rãi trong nước và quốc tế.

---

## Trang 109 — Bảo mật hệ thống (Security)

**c.** Cơ sở dữ liệu đảm bảo tính an toàn, nhất quán, đảm bảo đồng bộ (clustering), bảo đảm an toàn tải sản dữ liệu bệnh viện.

### 5. Máy trạm

**a.** Số lượng: có đủ máy trạm đáp ứng nhu cầu triển khai.

**b.** Cấu hình: đáp ứng cho các hoạt động y tế trên mọi môi trường mạng với cấu hình:

| Thành phần | Yêu cầu tối thiểu |
|------------|-------------------|
| b) Bộ xử lý | c) 3.0 GHz hoặc nhanh hơn |
| d) RAM | e) 4 GB hoặc nhỉnh hơn |
| f) Hệ điều hành | g) Windows 10 home trở lên |
| h) Dung lượng đĩa cứng | i) 500 GB trở lên |

**c.** Phần mềm: đảm bảo hệ điều hành và phần mềm hệ thống cài đặt trên các máy trạm có bản quyền hoặc các phần mềm mã nguồn mở được dùng rộng rãi trong nước và quốc tế.

**d.** Phần mềm diệt virus: có cài đặt phần mềm diệt virus.

### 6. Bảo mật dữ liệu (Security)

**a.** Có cơ chế giải pháp và phân quyền truy cập đối với các tài nguyên cơ sở dữ liệu.

**b.** Có hệ thống ghi nhật ký truy cập đối với các tài nguyên cơ sở dữ liệu.

**c.** Bảo đảm có thuật toán mã hóa phù hợp yêu cầu bảo mật và khả năng xử lý của hệ thống.

**d.** Các cơ giải pháp ghi nhật ký bộ phận kiểm soát các hành thức tấn công vào hệ thống dữ liệu theo đúng đơn quy định.

**e.** Các cơ giải pháp ghi nhật ký bộ phận lưu lưu hệ quản lý cơ sở dữ liệu theo đúng đơn quy định.

**f.** Rà soát, cập nhật các bản vá, các bản sửa lỗi hệ quản trị cơ sở dữ liệu theo đúng kỳ và theo khuyến cáo của nhà cung cấp.

**g.** Bảo đảm có thuật toán mã hóa phù hợp yêu cầu bảo mật và khả năng xử lý của hệ thống.

**h.** Rà soát, cập nhật các bản vá, các bản sửa lỗi hệ quản trị cơ sở dữ liệu theo đúng kỳ và theo khuyến cáo của nhà cung cấp.

**i.** Bảo đảm có biện pháp kỹ thuật để phép kiểm soát các cuộc tấn công vào hệ thống mạng.

**j.** Có biện pháp phát hiện và phòng chống xâm nhập, phòng chống phát tán mã độc hại vào hệ thống.

**k.** Có chính sách cập nhật định kỳ các bản vá và vá lỗ hệ thống, cập nhật căn hồi cho các máy tính kết nối với mạng.

**l.** Có biên pháp bảo đảm an toàn thông tin cho các máy tính kết nối với mạng.

**m.** Bảo đảm an toàn, an ninh về mặt vật lý tại trí đặt các hệ thống máy chủ.

---

## Trang 110 — Tiếp tục bảo mật + Backup/Restore + Monitoring + Nhân lực

**n.** Các trang thiết bị mạng, an ninh, bảo mật, phần mềm chống vi rút, công cụ phân tích mạng được quản lý điều đặt trong mạng của cơ quan phải có nguồn gốc, xuất xứ rõ ràng.

### 7. Bảo toàn dữ liệu (Backup/Restore) tập trung

**a.** Có quy trình quản lý sự cố, trong đó phải quy định rõ trách nhiệm của các bộ phận liên quan, chi tiết các bước được thực hiện bảo gồm cả việc thông báo người sử dụng cũng như việc thông báo công nghệ thông tin tin; trường hợp hợp đồng ghi rõ công nghệ thông tin tin thuê ngoài thì thì phải cung cấp dịch vụ phải phải thực hiện quy trình xử lý sự cố.

**b.** Định kỳ rà soát, cập nhật các sự cố và phương án xử lý lý cho quy trình quản lý sự cố.

**c.** Áp dụng các giải pháp kỹ thuật để phát hiện, xử lý kịp thời các cuộc tấn công vào hệ thống mạng.

**d.** Có biện pháp phòng chống rủi ro và thảm họa công nghệ thông tin một cách cơ hệ thống nhằm bảo chế tối đa những rủi ro tới đã nhằm hoạt động y tế trên mọi môi trường mạng.

### 8. Hệ thống giám sát (Monitoring) và ghi vết (Logging) tập trung

**a.** Hệ thống giám sát và ghi vết và cảnh báo thường trên toàn bộ ha tầng kỹ thuật Công Nghệ Thông Tin.

**b.** Giao tiếp, phân tích và dự đoán trước các xu hướng lỗi có thể xảy ra OTT.

**c.** Ghi nhận, phân tích và dự đoán trước các xu hướng lỗi có thể xảy ra.

**d.** Cần cơ bộ các bên cung ứng dịch vụ/ đã thay cải tiến, khắc phục sự cố.

### 9. Quy trình quản lý sự cố & đảm bảo liên tục

**a.** Có quy trình quản lý sự cố, trong đó phải quy định rõ trách nhiệm của các bộ phận liên quan, chi tiết các bước được thực hiện bảo gồm cả việc thông báo người sử dụng cũng như việc thông báo công nghệ thông tin tin; trường hợp hợp đồng ghi rõ công nghệ thông tin tin thuê ngoài thì thì phải cung cấp dịch vụ phải phải thực hiện quy trình xử lý sự cố.

**b.** Định kỳ rà soát, cập nhật các sự cố và phương án xử lý cho quy trình quản lý sự cố.

**c.** Áp dụng các giải pháp kỹ thuật để phát hiện, xử lý kịp thời các cuộc tấn công vào hệ thống mạng.

**d.** Có biện pháp phòng chống rủi ro và thảm họa công nghệ thông tin một cách cơ hệ thống nhằm bảo chế tối đa những rủi ro tới đã nhằm hoạt động y tế trên mọi môi trường mạng.

### 10. Điều kiện về nhân lực

**a.** Bảo đảm nhân lực phụ trách về công nghệ thông tin (về số lượng, trình độ) đáp ứng được yêu cầu chuyển viện y tế trên mọi môi trường mạng của cơ quan:
- Đối với các cơ quan sự nghiệp hạng 1, các trường đại học hạng 1 và các trường đại học phải có phòng công nghệ thông tin, tới thiểu 5 người, trong đó số người có trình độ đại học từ cao đẳng 60% tổng số nhân lực.
- Đối với các cơ quan sự nghiệp hạng 2, hạng 3 của ngành y tế bảo đảm phải có tổ công nghệ thông tin từ trường cấp tỉnh lên.

---

## Trang 111 — Nhân lực CNTT (tiếp) + Mục 11: Bảo trì & Bảo dưỡng định kỳ

**b.** Xây dựng kế hoạch và tổ chức đào tạo nâng cao trình độ công nghệ thông tin cho nhân lực tham gia vào hoạt động y tế trên mọi môi trường mạng.

**c.** Trường hợp thuê nhân lực bên ngoài, nhân lực tham gia hoạt động y tế trên mọi môi trường mạng của đơn vị được thuê phải đáp ứng yêu cầu chuyên môn nghiệp vụ, trong hợp đồng có điều khoản cam kết an toàn bảo mật thông tin.

**d.** Điều kiện vệ bảo đảm an toàn, an ninh thông tin.

**e.** Có chính sách về an toàn, bảo mật thông tin phù hợp với quy định về an toàn, bảo mật hệ thống công nghệ thông tin của Nhà nước và quy chế an toàn bảo mật thông tin của cơ quan.

### 11. Bảo trì & Bảo dưỡng định kỳ

**a.** Bảo trì và khắc phục khi sự cố phát sinh, đảm bảo hệ thống hoạt động liên tục 24/7.

**b.** Chuyên gia kỹ thuật vận hành & khắc phục sự cố phát sinh 24/7.

**c.** Bảo trì định kỳ hàng tháng.

**d.** Bảo trị dự phòng định kỳ hàng tháng.

**e.** Tối ưu hiệu năng hạ tầng theo thực tế vận hành hàng tháng.

**f.** Kiểm thử hệ thống toàn diện mỗi 6 tháng (giả lập thảm họa & khôi phục).

---

## Tổng hợp — Danh sách tất cả Usecase/Module (Part 3, trang 75-111)

### Nhóm Phân hệ Nội trú (tiếp từ Part 1 & 2)

| Số | Usecase / Module | Tác nhân | Mức độ BMT |
|----|-----------------|----------|------------|
| 3.16 | Quản lý phiếu dự trù thuốc, vật tư y tế | NVHC, Y tá, Bác sĩ | B |
| 3.17 | Quản lý phiếu xuất tủ trực thuốc, vật tư y tế | NVHC, Y tá, Bác sĩ | B |
| 3.18 | Quản lý phiếu hoàn trả thuốc, vật tư y tế | NVHC, Y tá, Bác sĩ | B |

### Nhóm Phân hệ Xét nghiệm

| Số | Usecase / Module | Tác nhân | Mức độ BMT |
|----|-----------------|----------|------------|
| 4.1 | Quản lý Xét nghiệm (Huyết học, Sinh hóa, Vi sinh, Miễn dịch) | NVHC, Y tá, Bác sĩ | B |
| 4.2 | Quản lý kho máu | CBQL, NVHC | B |

### Nhóm Phân hệ Chẩn đoán hình ảnh

| Số | Usecase / Module | Tác nhân | Mức độ BMT |
|----|-----------------|----------|------------|
| 5 | Quản lý Chẩn đoán hình ảnh (Siêu âm, Nội soi, X-Quang, Điện tim, Điện não, CT-Scanner, MRI) | Bác sĩ, Y tá | B |

### Nhóm Phân hệ Dinh dưỡng

| Số | Usecase / Module | Tác nhân | Mức độ BMT |
|----|-----------------|----------|------------|
| 6 | Quản lý Khoa Dinh dưỡng | CBQL, NVHC | B |

### Nhóm Phân hệ Dược bệnh viện

| Số | Usecase / Module | Tác nhân | Mức độ BMT |
|----|-----------------|----------|------------|
| 7.1 | Quản lý Khoa Dược | CBQL, NVHC | B |
| 7.2 | Quản lý phiếu nhập kho | CBQL, NVHC | B |
| 7.3 | Quản lý phiếu xuất kho | CBQL, NVHC | B |
| 7.4 | Quản lý duyệt cấp theo y lệnh | CBQL, NVHC | B |
| 7.5 | Quản lý duyệt bù cơ số tủ trực thuốc, vật tư y tế | CBQL, NVHC | B |
| 7.6 | Quản lý duyệt hoàn trả thuốc, vật tư y tế | CBQL, NVHC | B |

### Nhóm Phân hệ Viện phí & Tạm ứng

| Số | Usecase / Module | Tác nhân | Mức độ BMT |
|----|-----------------|----------|------------|
| 8 | Quản lý Chỉ định tạm ứng | NVHC, Y tá, Bác sĩ | B |
| 9.1 | Quản lý Viện phí | Kế toán, NVHC | B |

### Nhóm Phân hệ Lưu trữ & Báo cáo

| Số | Usecase / Module | Tác nhân | Mức độ BMT |
|----|-----------------|----------|------------|
| 10 | Quản lý Lưu trữ hồ sơ bệnh án | NVHC, Y tá, Bác sĩ | B |
| 11 | Quản lý Tổng hợp báo cáo (54 loại báo cáo) | CBQL, NVHC | B |

### Nhóm Phân hệ Hỗ trợ

| Số | Usecase / Module | Tác nhân | Mức độ BMT |
|----|-----------------|----------|------------|
| 12 | Quản lý Vật tư, trang thiết bị y tế | CBQL, NVHC | B |
| 13 | Quản lý Nhân sự | CBQL, NVHC | B |
| 14 | Quản lý Chất lượng bệnh viện / Công văn | CBQL, NVHC | B |
| 15 | Quản lý Danh mục dùng chung | CBQL | B |
| 16 | Quản lý Người dùng | QTHT | B |
| 17 | Quản lý Nhật ký, theo dõi thống kê hệ thống | QTHT | B |

---

## Phụ lục — Yêu cầu hạ tầng kỹ thuật tóm tắt

### Máy chủ (3-Tier)
- CPU: ≥ 8 core, ≥ 3 GHz
- RAM: ≥ 192 GB
- Disk: SSD Enterprise, ≥ 1000 IOPS/queue, RAID 10 (≥ 4 ổ)
- HA: ≥ 2 máy chủ active-active, ≥ 2 SAN + SAN switch

### Máy chủ (HCI — Hyperconverged)
- ≥ 3 node HCI hoạt động đồng thời
- Core switch: ≥ 2 thiết bị, băng thông **10 Gbps**
- Failover + HA

### Mạng LAN tập trung
- Core switch layer 3: ≥ 2 (dự phòng)
- Access switch: ≥ 2 uplink về core
- Uplink bandwidth: ≥ 1 Gbps
- Hỗ trợ: STP, Storm Control, Port Channel LACP

### Máy trạm (client)
- CPU: ≥ 3.0 GHz
- RAM: ≥ 4 GB
- OS: Windows 10 Home trở lên
- HDD: ≥ 500 GB

### Bảo mật
- Phân quyền truy cập CSDL
- Audit log / nhật ký truy cập
- Mã hóa dữ liệu nhạy cảm
- IDS/IPS (phát hiện và phòng chống xâm nhập)
- Phần mềm diệt virus
- Cập nhật bản vá định kỳ

### Bảo trì & Vận hành
- Hỗ trợ 24/7
- Bảo trì định kỳ hàng tháng
- Kiểm thử DR (disaster recovery) 6 tháng/lần
- Nhân lực CNTT: ≥ 5 người (hạng 1), tỷ lệ đại học ≥ 60%
