# Thuyết minh giải pháp phần mềm — Part 1 (Pages 1-37)
> Source: Thuyet minh giai phap phan mem.pdf
> Extracted: 2026-06-01

---

## TRANG BÌA (Page 1)

**THUYẾT MINH GIẢI PHÁP PHẦN MỀM QUẢN LÝ BỆNH VIỆN THÔNG MINH MQSOFT**

---

## MỤC LỤC (Pages 2-4)

### PHẦN I. THUYẾT MINH PHẦN MỀM NỘI BỘ ........6

**I. THIẾT KẾ KỸ THUẬT PHẦN MỀM NỘI BỘ ........6**
1. Yêu cầu chung ........6
2. Yêu cầu về kiến trúc hệ thống phần mềm Quản lý bệnh viện ........9
3. Triển khai phần mềm ........10

**II. MÔ TẢ YÊU CẦU KỸ THUẬT CẦN ĐÁP ỨNG CỦA PHẦN MỀM NỘI BỘ ........10**
1. Phân hệ Tiếp đón bệnh nhân ........10
2. Phân hệ Quản lý bệnh nhân ngoại trú ........11
3. Phân hệ Quản lý bệnh nhân điều trị nội trú ........13
4. Phân hệ Quản lý Khoa xét nghiệm ........15
5. Phân hệ Quản lý Chẩn đoán hình ảnh ........17
6. Phân hệ Quản lý Dược bệnh viện ........18
7. Phân hệ Quản lý chỉ định tạm ứng ........20
8. Phân hệ Quản lý Viện phí ........21
9. Phân hệ Quản lý Lưu trữ hồ sơ bệnh án ........22
10. Phân hệ Quản lý Tổng hợp báo cáo ........22
11. Phân hệ Quản lý Vật tư, trang thiết bị y tế ........23
12. Phân hệ Quản lý danh mục ........24
13. Phân hệ Quản lý người dùng ........24
14. Phân hệ Quản lý nhật ký, theo dõi thống kê hệ thống ........25

**III. DANH SÁCH CÁC TÁC NHÂN THAM GIA HỆ THỐNG ........26**

**IV. SƠ ĐỒ TÁC NHÂN VÀ CÁC TRƯỜNG HỢP SỬ DỤNG ........27**
1. Phân hệ Tiếp đón bệnh nhân ........27
2. Quản lý bệnh nhân ngoại trú ........28
3. Quản lý Bệnh nhân điều trị nội trú ........30
4. Quản lý Khoa Xét nghiệm ........38
5. Quản lý Chẩn đoán hình ảnh ........39
6. Quản lý Khoa Dinh dưỡng ........40
7. Quản lý Dược bệnh viện ........40
8. Quản lý chỉ định tạm ứng ........43
9. Quản lý Viện phí ........44
10. Quản lý Lưu trữ hồ sơ bệnh án ........45
11. Quản lý Tổng hợp báo cáo ........46
12. Quản lý Vật tư, trang thiết bị y tế ........47
13. Quản lý danh mục ........48
14. Quản lý người dùng ........48
15. Quản lý nhật ký, theo dõi thống kê hệ thống ........48

**V. ĐẶC TẢ CÁC TRƯỜNG HỢP SỬ DỤNG ........48**

1. Đặc tả trường hợp sử dụng phân hệ Tiếp đón bệnh nhân ........48
   - 1.1. Đặc tả Quản lý đặt khám ........48
   - 1.2. Đặc tả Quản lý đón tiếp ........50

2. Đặc tả trường hợp sử dụng phân hệ Quản lý bệnh nhân ngoại trú ........51
   - 2.1. Đặc tả Quản lý phòng khám ........51
   - 2.2. Đặc tả Quản lý khám sức khoe ........52
   - 2.3. Đặc tả Quản lý Bệnh nhân điều trị ngoại trú ........54
   - 2.4. Đặc tả Quản lý Bệnh nhân cấp cứu tổng hợp ........56

3. Đặc tả trường hợp sử dụng phân hệ Quản lý Bệnh nhân điều trị nội trú ........58
   - 3.1. Đặc tả Quản lý Bệnh nhân điều trị nội trú ........58
   - 3.2. Đặc tả Quản lý dị ứng thuốc ........59
   - 3.3. Đặc tả Quản lý tai nạn thương tích giao thông ........60
   - 3.4. Đặc tả Quản lý Tự sát, tự tử hoặc nguyên nhân khác ........61
   - 3.5. Đặc tả Quản lý bệnh mãn tính ........62
   - 3.6. Đặc tả Quản lý chỉ định Xét nghiệm, Chẩn đoán hình ảnh, phẫu thủ thuật,... ........63
   - 3.7. Đặc tả Quản lý cấp đơn thuốc ngoại trú ........64
   - 3.8. Đặc tả Quản lý phẫu thuật ........66
   - 3.9. Đặc tả Quản lý giấy chứng nhận nghỉ việc hưởng BHXH ........67
   - 3.10. Đặc tả Quản lý giấy xác nhận đang điều trị tại Bệnh viện ........68
   - 3.11. Đặc tả Quản lý giấy chứng sinh ........69
   - 3.12. Đặc tả Quản lý giấy chứng nhận thương tích ........70
   - 3.13. Đặc tả Quản lý giấy chuyên viện ........71
   - 3.14. Đặc tả Quản lý giấy ra viện ........72
   - 3.15. Đặc tả Quản lý giấy báo tử ........74
   - 3.16. Đặc tả Quản lý phiếu dự trữ thuốc, vật tư y tế ........74
   - 3.17. Đặc tả Quản lý phiếu xuất tủ trực thuốc, vật tư y tế ........75
   - 3.18. Đặc tả Quản lý phiếu hoàn trả thuốc, vật tư y tế ........77

4. Đặc tả trường hợp sử dụng phân hệ Quản lý Khoa Xét nghiệm ........78
   - 4.1. Đặc tả Quản lý xét nghiệm ........78
   - 4.2. Đặc tả Quản lý kho máu ........80

5. Đặc tả trường hợp sử dụng phân hệ Quản lý Chẩn đoán hình ảnh ........81

6. Đặc tả trường hợp sử dụng phân hệ Quản lý Khoa Dinh dưỡng ........83

7. Đặc tả trường hợp sử dụng phân hệ Quản lý Dược bệnh viện ........84
   - 7.1. Đặc tả Quản lý Khoa Dược ........84
   - 7.2. Đặc tả Quản lý phiếu nhập kho ........86
   - 7.3. Đặc tả Quản lý phiếu xuất kho ........87
   - 7.4. Đặc tả Quản lý duyệt cấp theo y lệnh ........88
   - 7.5. Đặc tả Quản lý duyệt bù cơ sở tủ trực thuốc, vật tư y tế ........89
   - 7.6. Đặc tả Quản lý duyệt hoàn trả thuốc, vật tư y tế ........91

8. Đặc tả trường hợp sử dụng phân hệ Quản lý chỉ định tạm ứng ........92

9. Đặc tả trường hợp sử dụng phân hệ Quản lý Viện phí ........93
   - 9. Đặc tả Viện phí ........93

10. Đặc tả trường hợp sử dụng phân hệ Quản lý Lưu trữ hồ sơ bệnh án ........94

11. Đặc tả trường hợp sử dụng phân hệ Quản lý Tổng hợp báo cáo ........95

12. Đặc tả trường hợp sử dụng phân hệ Quản lý Vật tư, trang thiết bị y tế ........97

13. Đặc tả trường hợp sử dụng phân hệ Quản lý Nhân sự, Lương ........101

14. Đặc tả trường hợp sử dụng phân hệ Quản lý chất lượng bệnh viện ........101

15. Đặc tả trường hợp sử dụng phân hệ Quản lý danh mục ........102

16. Đặc tả trường hợp sử dụng phân hệ Quản lý người dùng ........103

17. Đặc tả trường hợp sử dụng phân hệ Quản lý nhật ký, theo dõi thống kê hệ thống ........104

**VI. YÊU CẦU KHÁC ........106**

### PHẦN II. ĐIỀU KIỆN VỀ HẠ TẦNG KỸ THUẬT CÔNG NGHỆ THÔNG TIN ........107

1. Yêu cầu chung ........107
2. Đối với hoạt động có sử dụng máy chủ và phần mềm hệ thống ........107
3. Hệ thống hạ tầng mạng tập trung ........108
4. Cơ sở dữ liệu tập trung ........108
5. Máy trạm ........108
6. Bảo mật dữ liệu (Security) ........109
7. Bảo toàn dữ liệu (Backup/Restore) tập trung ........110
8. Hệ thống giá sát (Monitoring) và ghi vết (Logging) tập trung ........110
9. Quy trình quản lý sự cố & đảm bảo tính liên tục ........110
10. Điều kiện về nhân lực ........110
11. Bảo trì & Bảo dưỡng định kỳ ........111

---

## GIẢI THÍCH THUẬT NGỮ, TỪ VIẾT TẮT (Page 5)

### LĨNH VỰC CÔNG NGHỆ THÔNG TIN

| TT | Từ viết tắt/thuật ngữ | Nghĩa đầy đủ |
|----|----------------------|--------------|
| 1  | CNTT | Công nghệ thông tin |
| 2  | CSDL | Cơ sở dữ liệu |
| 3  | Database | Cơ sở dữ liệu |
| 4  | Firewall | Thiết bị bảo mật – bức tường lửa |
| 5  | HDD | Ổ cứng |
| 6  | HTTT | Hệ thống thông tin |
| 7  | User | Người sử dụng chương trình |
| 8  | RAM | Bộ nhớ trong |
| 9  | Remote Access | Truy cập từ xa |
| 10 | Server | Máy chủ |
| 11 | WAN | Mạng diện rộng |
| 12 | LAN | Mạng cục bộ |
| 13 | VLAN | Mạng cục bộ ảo |
| 14 | Converter | Thiết bị chuyển đổi tín hiệu điện sang tín hiệu quang và ngược lại |
| 15 | Broadcast | Thông tin quảng bá trong mạng nội bộ |
| 16 | VM | Virtual Machine – máy ảo |

### LĨNH VỰC Y TẾ

| TT | Từ viết tắt/thuật ngữ | Nghĩa đầy đủ |
|----|----------------------|--------------|
| 17 | BHYT | Bảo hiểm y tế |
| 18 | BHXH | Bảo hiểm xã hội |

---

## PHẦN I — THUYẾT MINH PHẦN MỀM NỘI BỘ

### I. THIẾT KẾ KỸ THUẬT PHẦN MỀM NỘI BỘ

#### 1. Yêu cầu chung (Pages 6-8)

- Phần mềm quản lý bệnh viện tuân thủ theo quy trình nghiệp vụ chuẩn của Bệnh viện, có khả năng điều chỉnh, tùy biến theo các yêu cầu cụ thể.
- Ứng dụng được xây dựng theo kiến trúc phân hệ chức năng, có khả năng tùy biến, bổ sung, thay đổi các chức năng mà không ảnh hưởng nhiều đến các hoạt động của hệ thống.
- Phần mềm tạo lập cơ sở dữ liệu tổng hợp về việc điều trị của bệnh nhân theo quy định của Luật khám bệnh, chữa bệnh.
- Phần mềm cho phép chia sẻ và sử dụng thông tin về việc điều trị của người bệnh theo quy định riêng cho từng chức danh (Ban giám đốc, Trưởng/Phó phòng ban, Bác sĩ, Y tá, Nhân viên trong bệnh viện).
- Phần mềm được xây dựng theo mô hình đa lớp, có khả năng mở rộng theo các yêu cầu thay đổi của hoạt động quản lý.
- Đối với khái thác và sử dụng dữ liệu thông tin về việc điều trị của người bệnh: phần mềm phải bảo mật tuyệt đối, đảm bảo an toàn dữ liệu theo quy định của Luật khám bệnh, chữa bệnh.
- Phần mềm cung cấp các chức năng trợ giúp cho việc tra cứu, tìm kiếm, sắp xếp cũng như tổng hợp, phân tích và báo cáo thông tin một cách nhanh chóng.
- Phần mềm được xây dựng trên nền giao diện đồ hoạ dễ sử dụng, dễ học, dễ nâng cấp và thay thế phần mềm hiện có.
- Đối với khai thác và sử dụng dữ liệu thông tin về việc điều trị của người bệnh, phần mềm phải bảo mật tuyệt đối theo quy định.
- Phần mềm cho phép đăng ký khám bệnh từ xa qua hệ thống website, thiết lập cơ chế xác thực người bệnh theo các hình thức: Mã bệnh nhân (barcode), CCCD/CMND, số điện thoại, địa chỉ IP đã đăng ký.
- Kết nối thông tin thị trên màn hình LED tại mỗi khoa, phòng.
- Quản lý lịch hẹn khám theo từng bác sĩ, loại dịch vụ, định mức chi phí, số lượng bệnh nhân có thể tiếp nhận trong ngày.
- Thực hiện quản lý lý tài khoản người bệnh: khai báo số tài khoản, cập nhật các thông tin BHYT, theo dõi quá trình khám chữa bệnh.
- Cảnh báo sử dụng thuốc và cận lâm sàng khi tài khoản người bệnh dưới mức cho phép.
- Can sở dữ liệu dùng đa chiều, phần mềm phải đáp ứng:
  - Chuyển số liệu vào phần mềm báo cáo thống kê của Bộ Y tế;
  - Chuyển số liệu quyết định vào phần mềm BHXH Việt Nam.
- Các cơ sở dữ liệu chuẩn và các mã dữ liệu được sử dụng trong phần mềm quản lý bệnh viện bao gồm:
  - Cơ sở dữ liệu địa chỉ Việt Nam
  - Chuẩn mã bệnh ICD 10
  - Danh mục các bệnh viện Việt Nam
  - Danh mục các quốc gia trên thế giới
  - 1408 mã phẫu thuật, thủ thuật của Bộ Y tế
  - Mã các Bệnh viện theo quy định chung của Vụ điều trị
  - Mã Bệnh viện theo quy định của Vụ điều trị…

**Chức năng chi tiết của hệ thống (Pages 6-7):**

- Kết nối thông tin thị trên màn hình LED tại mỗi khoa, phòng.
- Phần mềm hỗ trợ tra đơn hàng, đặt hàng thuốc: in danh sách và thông tin chi tiết về đơn hàng.
- Kết nối với khai thác, sử dụng dữ liệu của bộ nhớ lưu trữ thông tin tại phòng khám như mã hình, bệnh nhân, họ tên, ngày tháng năm sinh, giới tính… mà bệnh nhân đã được cấp Mã y tế sẽ tự động chuyển đến cho các chức năng tìm kiếm tổng hợp đó có chức năng.
- Kết nối với khai thác và sử dụng dữ liệu của Bộ nhớ lưu trữ thông tin tại phòng khám như mã hình, bệnh nhân, họ tên.
- Quản lý lịch hẹn theo từng bác sĩ, từng loại dịch vụ.
- Tính toán tự động phần chi phí bảo hiểm y tế và phần chi phí mà bệnh nhân phải trả (tính chi phí dịch vụ khám và điều trị, tính toán theo tuyến BHYT, phần được BHYT chi trả, phần bệnh nhân tự trả theo chính sách BHYT hiện hành).
- Báo cáo tổng hợp chi tài chính: kết xuất tự các hoạt động thu chi trong bệnh viện, thu khám bệnh ngoại trú, thu điều trị nội trú.
- Quản lý doanh thu toàn bệnh viện, bao gồm cả các thu từ bệnh viện theo dịch vụ, theo từng khoa, phòng ban.
- Tất cả các hoạt động tài chính đều được tính toán, kết xuất từ các phần hệ để đảm bảo tính chính xác của các chính sách bảo hiểm.
- Phần mềm phải có khả năng khai báo và quản lý các nội dung hoạt động thu chi trong bệnh viện, thu khám bệnh ngoại trú.
- Phần mềm cung cấp các chức năng trợ giúp và cảnh báo lọc lâm sàng khi xây ra ca sự cố. Các công cụ này giúp hệ thống hoạt động an toàn và ổn định.
- Phần mềm cho phép đăng ký khám bệnh từ xa qua hệ thống website, thiết lập cơ chế xác thực người bệnh theo các hình thức đã mô tả.
- Phần mềm cung cấp các chức năng truy vấn, báo cáo tổng hợp.

**Trang 8 — Chuẩn dữ liệu và khả năng chuyển đổi:**

- Phần mềm có thể sử dụng thường trong điều kiện độ thống kế hệ thống phải chỉnh xác sau nghiệm thử;
- Phần mềm được bảo hành 12 tháng sau nghiệm thử;
- Khả năng chuyển đổi số liệu, phần mềm phải đáp ứng:
  - Chuyển số liệu vào phần mềm báo cáo thống kê của Bộ Y tế;
  - Chuyển số liệu quyết định vào phần mềm BHXH Việt Nam.

---

#### 2. Yêu cầu về kiến trúc hệ thống phần mềm Quản lý bệnh viện (Page 9)

**Sơ đồ kiến trúc hệ thống:**

Phần mềm quản lý bệnh viện được xây dựng theo kiến trúc ứng dụng đa lớp bao gồm:
- **Lớp trình diễn:** lớp này cung cấp các giao diện thông tin và chức năng cho người dùng dạng Application.
- **Lớp nghiệp vụ:** lớp này thực hiện các nghiệp vụ chính và chính của hệ thống.
- **Lớp dữ liệu:** lớp này thực hiện các nghiệp vụ liên quan đến lưu trữ và truy xuất dữ liệu của hệ thống.

**Các module trong hệ thống (từ sơ đồ):**
- Module Tiếp nhận BN
- Module Bác sĩ
- Module QL PR (Quản lý phòng)
- Module QL BN (Quản lý bệnh nhân)
- Module năng khác
- Quản trị hệ thống
- Kiểm tra nội bộ
- Backup & Restore
- Trợ giúp sử dụng

**Lớp giao tiếp:** Tích hợp hệ thống & Giao tiếp dữ liệu

**Lớp dữ liệu:** Các hệ thống khác → CSDL

**Ưu điểm của mô hình này:**
- Thành phần phía máy trạm (Client components) chỉ đảm nhiệm hiển thị nội dung hoặc thông tin:
  - Máy trạm cần ít tài nguyên hơn;
  - Không cần thay đổi thành phần phía máy trạm nếu CSDL thay đổi hoặc các tính toàn nghiệp vụ thay đổi;
  - Tối thiểu phần phân phối hợp lý cho các máy trạm.
- Một máy chủ có thể đáp ứng yêu cầu đồng thời nhiều yêu cầu cầu từ máy trạm hoặc thiết bị đầu cuối:
  - Giảm lưu lượng dữ liệu phải truyền tải trên mạng;
  - Giảm lưu lượng dữ liệu phải truyền tải trên mạng;
  - Dễ dàng mở rộng và nâng cấp hệ thống;

---

#### 3. Triển khai phần mềm (Page 10)

**Sơ đồ triển khai phần mềm quản lý bệnh viện:**

Sơ đồ thể hiện quá trình chuyển đổi từ hệ thống cũ sang hệ thống mới:
- Hệ thống phần mềm cũ: Server 212, Server 250, Server 251, Server 251
- Hệ thống mới: Server 1, Server 2 (với Cluster FC-FC), kết nối qua Core SW L3 (2 thiết bị), hệ thống phần mềm mới

---

## II. MÔ TẢ YÊU CẦU KỸ THUẬT CẦN ĐÁP ỨNG CỦA PHẦN MỀM NỘI BỘ

### 1. Phân hệ Tiếp đón bệnh nhân (Pages 10-11)

#### Quy trình nghiệp vụ Tiếp đón bệnh nhân

**Sơ đồ quy trình (từ hình):**
- Tiếp nhận thông tin BN → Nhập thông tin BN → Tìm kiếm/tạo hồ sơ → Chi định các dịch vụ → Lấy số thứ tự → Thu phí → Cấp thuốc → Xuất/nhập viện

**Mô tả quy trình:**

Khi bệnh nhân đến yêu cầu khám chữa bệnh, nhân viên tiếp nhận sẽ kiểm tra xem bệnh nhân đã đến khám chữa bệnh tại bệnh viện hay không:
- Nếu là bệnh nhân lần đầu tiên đến, nhân viên tiếp nhận sẽ nhập thông tin bệnh nhân, hệ thống sẽ tự động chuyển đến cho các chức năng tìm kiếm tổng hợp đó có chức năng, Mã y tế sẽ tự động chuyển đến cho cơ danh mục bệnh nhân, Mã y tế sẽ tự động chuyển đến cho chương trình.
- Nếu là bệnh nhân đã đến bệnh viện: nhân viên tiếp nhận sẽ nhập vào số khám chữa bệnh của bệnh nhân (đã có ghi chú về Mã y lý) để cơ chức năng tìm kiếm tổng hợp đó có chức năng.

**Thông tin bệnh nhân sau khi tiếp nhận sẽ được chuyển đến các bộ phận khác (Lâm sàng, Cận lâm sàng, Cấp thuốc, Xuất nhập viện) để tiếp theo.**

**Các thông tin được lưu và chuyển:**
- Các thông tin sau khi tiếp nhận bệnh nhân sẽ được lưu lại tại phục vụ cho các lần khám bệnh tiếp theo, tạo thành Bệnh án điện tử.

#### Yêu cầu chức năng (Page 11)

- **Tiếp nhận bệnh nhân mới, nhập và lưu trữ các thông tin bệnh nhân. Các thông tin bệnh nhân bao gồm:**
  - Cấp số ID bệnh nhân
  - Thông tin hành chính (Họ tên, ngày tháng năm sinh, giới tính, quốc tịch, nghề nghiệp, Địa chỉ, SĐT,...)
  - Thông tin liên quan đến tài chính của bệnh nhân (Đối tượng khám chữa bệnh, Bảo hiểm, dịch vụ, chuyển tuyến,...)
  - Lý do tiếp nhận, yêu cầu khám chữa bệnh
  - ...
- Tìm kiếm nhanh thông tin, hồ sơ y tế lưu trữ tại bệnh viện trước
- Chuyển bệnh nhân đến các phòng khám, đơn vị chức năng
- In phiếu đăng ký khám bệnh
- Thống kê, báo cáo: thống kê số lượng bệnh nhân mới, số lượng tiền hàng ngày theo các số biến lại, nhóm dịch vụ,... bằng nhiều biểu đồ
- Quản lý lý tập hợp trong một cách nhanh nhất để đề xuất khi tổng số tiền số theo dõi, kết đơn thuốc

#### Hiệu quả mang lại

- Nâng cao hiệu quả hoạt động tại bộ phận tiếp nhận bệnh nhân, giảm thiểu thời gian chờ đợi của người bệnh
- Tao ra môi trường hoạt động bệnh viện hiện đại, nâng động, nâng cao uy tín của bệnh viện
- Nâng cao chất lượng khám và điều trị và hiệu quả của việc lưu trữ thông tin bệnh sử của các bệnh nhân trong bệnh án điện tử, tiết kiệm thời gian thực hiện thống kê báo cáo
- Ban giám đốc bệnh viện có thể theo dõi tình hình khám chữa bệnh thông qua các báo cáo, thống kê

---

### 2. Phân hệ Quản lý bệnh nhân ngoại trú (Pages 11-12)

#### Quy trình nghiệp vụ

**Sơ đồ quy trình Quản lý bệnh nhân ngoại trú (Page 12 — activity diagram):**

Swim lanes (luồng bơi):
- **QUY TRÌNH QUẢN LÝ BỆNH NHÂN NGOẠI TRÚ**
- Lane 1: Tiếp tân / đón tiếp
- Lane 2: Thầy thuốc (Bác sĩ)
- Lane 3: Thực hiện kết quả
- Lane 4: Thu phí
- Lane 5: In kết quả

**Các bước quy trình:**

1. **Tiếp tân/Đón tiếp:**
   - 1.1 Cấp STT / Tìm thông tin BN
   - 1.2 Hướng dẫn điều hành (nếu có BHYT)

2. **Thầy thuốc:**
   - 2.1 Khám bệnh/Tiếp nhận BN
   - 2.2 Mẫu lấy tại Bác sĩ → Kết quả
   - 2.3 Mẫu lấy tại Khoa lần sàng

3. **Thực hiện:**
   - 3.1 Thực hiện
   - Kết quả trả về cho bác sĩ

4. **Thu phí:**
   - 4.1 Nhập kết quả
   - 4.2 Trả kết quả → Thu phí (tính hoa phí)
   - Xác nhận chi điều (tính hoa phí)

5. **In kết quả:**
   - 5.1 Xuất hóa phí theo khoa
   - In phiếu

**Quyết định trong sơ đồ:**
- Có BHYT? → Hướng dẫn phòng khám BHYT
- Có kết quả? → Tiếp tục hoặc kết thúc

**Mô tả quy trình nghiệp vụ (Page 12):**

Mỗi khi bệnh nhân sang thứ tại phòng tiếp đón, thông tin chi tiết về bệnh nhân và số lượng bệnh nhân dự đợi khám đã được chuyển đến Module này từ phòng tiếp đón. Các thông tin này được chuyển đến và lưu lại tại hồ sơ lưu bệnh án điện tử của bệnh nhân. Các thông tin này sẽ được lưu lại để phục vụ cho các lần khám bệnh tiếp theo.

**Yêu cầu chức năng:**
- Các chức năng chính được cung cấp bởi phân hệ bao gồm:
  - Cập nhật trực tiếp các thông tin của bệnh nhân vào hồ sơ bệnh án điện tử. Tạo ra sự phối hợp thông tin giữa các phòng khám

---

### 3. Phân hệ Quản lý bệnh nhân điều trị nội trú (Pages 13-14)

#### Quy trình nghiệp vụ (Page 13 — activity diagram)

**Sơ đồ quy trình Quản lý bệnh nhân điều trị nội trú:**

Swim lanes:
- I. Đầu vào
- II. Nhập khoa điều trị
- III. Điều trị

**Các bước:**

1. **Đầu vào (Lane I):**
   - 1.1 Chuyển khoa/điều trị
   - 1.2 Nhập viện bình thường gấp phòng
   - 1.3 Cấp phòng điều trị

2. **Nhập khoa điều trị (Lane II):**
   - 2.1 Chuyển khoa điều trị
   - 2.2 Đặt phòng (chọn phòng)

3. **Điều trị (Lane III):**
   - 3.1 Tái tai nạn nghề nghiệp
   - 3.2 Quân chú điều chỉnh
   - 3.3 Toa thuốc phiếu thuật hoặc bệnh
   - Lệnh điều trị
   - 3.4 Quá trình phẫu thuật/thủ thuật
   - 3.5 Quy trình Chẩn đoán hình ảnh (Siêu âm, X-quang)
   - 3.6 Chi điều trị Xuất thống hợp p
   - 3.7 Quy trình cấp đơn thuốc ngoại trú
   - 3.8 Tổng hợp y lệnh điều trị

**Điểm quyết định trong sơ đồ:**
- TTYT (tuyến y tế)?
- Có đặc biệt?

**Mô tả quy trình nghiệp vụ:**

Bệnh nhân sau khi kết lý bác sĩ phải nằm bệnh viện điều trị được chuyển tới các khoa chuyên trách. Mọi thông tin sẽ được lưu đầy đủ trong hồ sơ bệnh án điện tử của Bệnh nhân nội trú như:
- Thông tin vào viện và chẩn đoán vào viện
- Thông tin vào khoa chuyển khoa: Chuyển đến, chuyển đi
- Thông tin khám và điều trị hàng ngày, các xét nghiệm, thăm dò chức năng, phẫu thuật, thủ thuật trong quá trình điều trị
- Thông tin giải điều trị, Bác sĩ phụ trách, lịch thuốc và số lượng thuốc đã chỉ định sử dụng trong quá trình điều trị

**Yêu cầu chức năng — Phân hệ Quản lý bệnh nhân nội trú (Page 13-14):**

- **Quản lý Tiếp nhận bệnh nhân:**
  - Thông tin đến nhập viện chính xác
  - Thông tin tiếp nhận BN vào khoa

- **Quản lý vệ bệnh nhân:**
  - Quản lý ngày điều trị tại khoa phòng
  - Gắn giường bệnh
  - Gắn bác sĩ phụ trách, y tá phụ trách

- **Quản lý về thuốc tại khoa phòng:**
  - Quản lý thuốc dùng ngày cho Bệnh nhân (dự trữ tạm mạng)
  - Thuốc cấp cho Bệnh nhân tại khoa phòng, linh thuốc và cấp thuốc
  - Quản lý tủ thuốc cấp cứu và vật tư tại cho tủ trực khoa phòng

- **Các chẩn đoán khoa điều trị:**
  - Chẩn đoán bệnh chính
  - Chẩn đoán bệnh kèm
  - Chẩn đoán bệnh kết cố
  - Yêu cầu xét nghiệm cận lâm sàng
  - Các phẫu thuật, thủ thuật, điều trị tổ từ trước
    - Các phẫu thuật theo mã mà, và phân loại theo Vụ Điều trị:
    - Tiêm, truyền ...

- **Kết quả điều trị tại khoa phòng:**
  - Số ngày điều trị
  - Không khỏi
  - Khỏi
  - Chuyển khoa
  - Chuyển viện ngoại trú
  - Tử vong

- **Quản lý các dịch vụ tại khoa:**
  - Cho mượn dụ dùng (Chăn màn, áo quần của bệnh nhân và người nhà bệnh nhân,...)
  - Các dịch vụ khác

- **Hệ thống báo cáo:** cung cấp các báo cáo về tình hình hoạt động, điều trị tại các khoa nội trú.

**Hiệu quả mang lại (Page 14):**
- Hỗ trợ quá trình quản lý bệnh nhân tại các khoa điều trị, đáp ứng tốt nhất các yêu cầu chuyên môn bệnh viện
- Hỗ trợ khai thác tốt nhất các giường bệnh tại khoa
- Giúp trình bày và quản lý chính xác các thông tin về quá trình điều trị của bệnh nhân
- Hỗ trợ lãnh đạo trong công tác thanh tra, rà soát hoạt động tại mỗi khoa

---

### 4. Phân hệ Quản lý Khoa xét nghiệm (Pages 15-16)

#### Quy trình nghiệp vụ (Page 15 — activity diagram)

**QUY TRÌNH THỰC HIỆN XÉT NGHIỆM — Swim lanes:**
1. Tiếp nhận tại Khoa XN
2. Lấy bệnh phẩm
3. Thực hiện
4. Ra kết quả
5. Quản lý hóa chất

**Các bước quy trình:**

**Lane 1 — Tiếp nhận:**
- Bác Khoa LN: Chỉ định XN
- 1.1 Kiểm tra hành chính BN
- Pending (chờ)

**Lane 2 — Lấy bệnh phẩm:**
- 2.1 Kiểm tra hành chính BN
- 2.2 Mẫu lấy tại Bác sĩ
- 2.3 Mẫu lấy tại Khoa lâm sàng

**Lane 3 — Thực hiện:**
- 3.1 Thực hiện
- Quy trình bình thường / Quyết định

**Lane 4 — Ra kết quả:**
- 4.1 Nhập kết quả (từ các chỉ định bình thường)
- 4.2 Trả kết quả (tới các chỉ định bình thường)

**Lane 5 — Quản lý hóa chất:**
- 5.1 Xuất hóa phí theo khoa
- 5.2 Xuất hóa phí theo bệnh nhân → Quy trình duyệt tốt cơ sở để tính hoa, bán hóa

**Điểm quyết định:**
- Có mẫu không đúng? → Chuyển lấy lại
- Kết quả bình thường? → Ra kết quả / Phê duyệt

**Mô tả quy trình nghiệp vụ:**

Quy trình hoạt động xét nghiệm bắt đầu khi bác sĩ chỉ định thực hiện các xét nghiệm cần thiết để chẩn đoán bệnh. Quy trình xét nghiệm được tiến hành qua các bước: tiếp nhận bệnh nhân tại Khoa XN → lấy bệnh phẩm → thực hiện xét nghiệm → ra kết quả → tính toán và tính toàn bộ các thông tin trang bị bệnh phẩm bệnh nhân.

Trưởng phòng những chỉ định xét nghiệm hóa lý tại BV hoặc khoa Xét nghiệm bằng bệnh cả bệnh phẩm đó các bệnh nhân sẽ được tự động hóa chất sử dụng để tính toán bộ phận, kế tính tủa bệnh nhân.

#### Yêu cầu chức năng (Page 15-16):

- Lấy danh sách bệnh nhân sau khi được bác sỹ chỉ định thực hiện xét nghiệm theo từng Khoa (Khám bệnh, Nội trú, Bên ngoài)
- Nhận phiếu chỉ định lâm sàng
- Tìm và đánh dấu bệnh nhân trên danh sách bệnh nhân đã có chỉ định thực hiện
- Hướng dẫn — dẫn đường bệnh nhân trước khi thực hiện kỹ thuật khảo sát
- Dán đó và sắp xếp lịch hẹn trước khi thực hiện kỹ thuật khảo sát (nếu có)
- Nhập kết quả trực tiếp vào chương trình. In kết quả và Chuyển dữ liệu về máy bác sĩ lâm sàng khoa chỉ định
- Kiểm soát hàng ID và mã khẩu cửa từng bác sĩ
- Bệnh nhân nội viện: Phiếu tra kết quả đưa về khoa lâm sàng
- Bệnh nhân ngoài viện: Phiếu tra kết quả đưa về bác sĩ lâm sàng
- Kết quả gồm 2 dạng: Phiếu tra kết quả và dữ liệu được chuyển trực tiếp trên chương trình
- Bệnh nhân phòng khám, ngoại viện: Phiếu tra kết quả đưa trực tiếp cho bệnh nhân
- Nhập kết quả trực tiếp vào chương trình

#### Hiệu quả mang lại (Page 16):

- Phân hệ hỗ trợ quản lý chặt chẽ thông tin bệnh nhân thực hiện các xét nghiệm
- Hạn chế tối đa các sai sót trong việc tra kết quả
- Kết quả xét nghiệm đã theo quy trình và được kiểm duyệt chính xác đến từng bác sĩ lâm sàng trước giờ bác sĩ viết thêm tổng bộ phận, giảm thiểu thời gian thực hiện, tăng hiệu quả và hiệu suất hoạt động Khoa Xét nghiệm.

---

### 5. Phân hệ Quản lý Chẩn đoán hình ảnh (Pages 17-18)

#### Quy trình nghiệp vụ (Page 17 — activity diagram)

**QUY TRÌNH THỰC HIỆN CHẨN ĐOÁN HÌNH ẢNH — Swim lanes:**
1. Tiếp nhận
2. Kiểm tra
3. Thực hiện
4. Ra kết quả
5. Quản lý vật tư

**Các bước quy trình:**

**Lane 1 — Tiếp nhận:**
- 1.1 Chỉ định CĐHA
- Pending

**Lane 2 — Kiểm tra:**
- 2.1 Kiểm tra hành chính BN
- 3.2 Thành công

**Lane 3 — Thực hiện:**
- 3.1 Thực hiện

**Lane 4 — Ra kết quả:**
- 4.1 Nhập kết quả
- 4.2 Trả kết quả → về khoa lâm sàng

**Lane 5 — Quản lý vật tư:**
- 5.1 Xuất hóa phí theo bệnh nhân
- 5.2 Xuất hóa phí theo khoa → Quy trình duyệt tốt cơ sở để tính hoa, bán hóa

**Điểm quyết định:**
- Hành chính đúng? → Tiếp tục / Trả về

**Mô tả quy trình nghiệp vụ:**

Danh sách bệnh nhân được lấy từ bác sỹ chỉ định chẩn đoán hình ảnh theo từng Khoa (Khám bệnh, Nội trú, Bên ngoài). Quy trình thực hiện chẩn đoán hình ảnh được tiến hành qua các bước: nhận bệnh nhân tại Khoa CĐHA, kiểm tra tình trạng bệnh nhân khi thực hiện ký thuật khảo sát, kết quả in ra máy và Chuyển dữ liệu về máy bác sĩ lâm sàng khoa chỉ định.

#### Yêu cầu chức năng (Page 17):

- Lấy danh sách bệnh nhân sau khi được bác sỹ chỉ định chẩn đoán hình ảnh theo từng Khoa (Khám bệnh, Nội trú, Bên ngoài)
- Nhận phiếu chỉ định lâm sàng
- Tìm và đánh dấu bệnh nhân trên danh sách bệnh nhân đã có chỉ định thực hiện
- Hướng dẫn — dẫn đường bệnh nhân trước khi thực hiện ký thuật khảo sát
- Dán đó và sắp xếp lịch hẹn trước khi thực hiện ký thuật khảo sát (nếu có)
- Nhập kết quả trực tiếp vào chương trình. In kết quả và Chuyển dữ liệu về máy bác sĩ lâm sàng khoa chỉ định
- Kiểm soát hàng ID và mã khẩu của từng bác sĩ
- Bệnh nhân nội viện: Phiếu tra kết quả đưa về khoa lâm sàng
- Bệnh nhân ngoài viện: Phiếu tra kết quả đưa về bác sĩ lâm sàng
- Kết quả gồm 2 dạng: Phiếu tra kết quả và dữ liệu được chuyển trực tiếp trên chương trình
- Bệnh nhân phòng khám, ngoại viện: Phiếu tra kết quả đưa trực tiếp cho bệnh nhân

#### Hiệu quả mang lại (Page 18):

- Phân hệ hỗ trợ quản lý chặt chẽ thông tin bệnh nhân thực hiện các Chẩn đoán hình ảnh
- Hạn chế tối đa các sai sót trong việc tra kết quả
- Kết quả Chẩn đoán hình ảnh đã đi theo quy trình và được kiểm duyệt chính xác đến từng bác sĩ lâm sàng trước giờ bác sĩ lâm sàng khoa chỉ định, giảm thiểu thời gian thực hiện, tăng hiệu quả và hiệu suất hoạt động Khoa Chẩn đoán hình ảnh.

---

### 6. Phân hệ Quản lý Dược bệnh viện (Pages 18-20)

#### Quy trình nghiệp vụ (Page 18 — activity diagram)

**QUY TRÌNH NGHIỆP VỤ DƯỢC — Swim lanes:**
1. Lập kế hoạch
2. Mua hàng
3. Phó chế
4. Tồn trữ
5. Cấp phát
6. Sử dụng

**Các bước quy trình chi tiết:**

**Lane 1 — Lập kế hoạch:**
- 1.1 Lập danh mục đấu thầu
- 1.2 Quyết định danh mục lựa chọn
- 1.3 Quyết định giá, số lượng sử dụng điều trị
- 1.4 Lập đơn hàng điều chỉnh
- 1.5 Phân bổ đấu thầu

**Lane 2 — Mua hàng:**
- 2.1 Nhập kho
- 2.2 Quyết định nhập kho
- 2.3 Dự trù thặng thiết bị nhập kho

**Lane 3 — Phó chế:**
- Theo điểm lĩnh
- Quyết định lĩnh
- Pha chế đặc biệt (nếu có)

**Lane 4 — Tồn trữ:**
- 4.1 Lưu kho
- 4.2 Chuyển kho
- 4.3 Theo dõi nhập vào và phòng

**Lane 5 — Cấp phát:**
- 4.1 Lĩnh kho 1
- 4.2 Lĩnh kho từ tủ
- 4.3 Xuất trả về khoa
- 4.4 Nhận lại dược phẩm từ bệnh nhân
- 4.5 Theo dõi nhập kho
- 4.6 Thanh lý hợp lệ MIS data

**Lane 6 — Sử dụng:**
- 6.1 Trả dùng thuốc
- 6.2 Theo dõi dịch
- 6.3 Cảnh báo hành động
- 6.4 Theo dư lượng thuốc dùng
- 6.5 Hướng dẫn điều trị

**Phần dưới sơ đồ:**
- 7. THỐNG KÊ THUỐC (IT DƯỢC)
- 8. KIỂM TRA NỘI BỘ

**Mô tả quy trình nghiệp vụ:**

Phân hệ quản lý dược bệnh viện được xây dựng với mục đích hỗ trợ quản lý chặt chẽ và chính xác các nghiệp vụ nhập, xuất dược phẩm (thuốc, hóa chất, vật tư y tế) trong toàn bệnh viện.

Module này kết hợp chặt chẽ với phân hệ quản lý nội trú, quản lý viện phí tạo thành một quy trình quản lý chặt chẽ theo kế hoạch:

#### Yêu cầu chức năng (Pages 18-19):

- Quản lý số liệu nhập, xuất kho theo nhà cung cấp
- Quản lý chặt chẽ dược phẩm theo quá trình luân chuyển từ kho chẩn tới kho lẻ tới các khoa phòng tới các bệnh nhân
- Quản lý chặt chẽ quá trình xuất giữa Kho – Khoa
- Quản lý số liệu thuốc lĩnh, tra hàng ngày của bệnh nhân tại các khoa
- Quản lý quá trình xuất ra ngoài, bay
  - Xuất ra ngoài: đi chỉnh dịch, xuất đi khám sức khoe,...
  - Xuất đi tây
- Quản lý quá trình xuất, nhập tại tủa có qua qua phương pháp quyền, nhập trước xuất trước
- Liên tục tạo bao bì dịch vụ với Nhập, Xuất, Tồn dùng phần mục dịch vụ vụ cho công tác quản lý tủ vào với hạn sử dụng, dự trữ thuốc kiểm kê
- Lập các đơn hàng hàng theo (theo định kỳ, thời điểm thứ): Tổng đơn hàng, thời gian cung cấp, số lượng tồn cần lại
- Kiểm kê, nhập kho chính phẩm và cảnh báo hàng sắp hết
- Xuất: nhập dược phẩm tại các kho nội bộ Dược
- Cấp phát dược phẩm cho các khoa, phòng, quầy thuốc lẻ
- Nhận lại dược phẩm trả về từ các Khoa, phòng (do quả hạn, hư hỏng,...)
- Xuất lý dược phẩm tạo dự liệu quản lý hàng sử dụng
- In phiếu tính thuốc, trả thuốc
- Kiểm kê tại các kho dược
- Cảnh báo dược phẩm quá hạn sử dụng
- **Báo cáo dược:**
  - Báo cáo dược tổng thể
  - Báo cáo dược cho từng khoa, cho các khoa lĩnh thuốc
  - Các báo cáo cho kho dược: Theo tiền, theo nhập, theo xuất, theo lĩnh, theo tồn, theo loại thuốc,...
- **Ghi chú:** Xuất thuốc cho khoa phòng tuần thì theo quy tắc dược với 5 phiếu xuất thuốc của dược:
  - Thuốc gây nghiện
  - Thuốc hướng thần
  - Thuốc thường
  - Vật tư tiêu hao (Bông, băng, côn, gạc...)
  - Hóa chất xét nghiệm
- Báo cáo, thống kê theo các mẫu tuần theo quy định của Bệnh viện và mẫu chuẩn của Sở Y tế, Bộ Y tế.

#### Hiệu quả mang lại (Page 20):

- Hỗ trợ quản lý chính xác số lượng dược phẩm hiện có và được sử dụng trong toàn bệnh viện, chống thất thoát
- Quản lý chặt chẽ các nghiệp vụ nhập, xuất, cấp phát dược phẩm
- Cung cấp các báo cáo hỗ trợ Ban lãnh đạo Bệnh viện nắm bắt kịp thời và chính xác tình hình sử dụng dược phẩm tại bệnh viện để kế hoạch cung cấp đúng và đầy đủ các loại theo nhu cầu.
- Quản lý tốt hạn sử dụng dược phẩm, cảnh báo đến hạn, quá hạn.
- Quản lý tốt hạn sử dụng dược phẩm, cảnh báo đến hạn, quá hạn.

---

### 7. Phân hệ Quản lý chỉ định tạm ứng (Page 20)

#### Quy trình nghiệp vụ

**QUY TRÌNH CHỈ ĐỊNH TẠM ỨNG — Swim lanes:**
- Khoa, phòng
- Viện phí

**Các bước:**
1. Lập phiếu chỉ định tạm ứng → Thu tiền → In phiếu

**Mô tả quy trình nghiệp vụ:**

Khi có yêu cầu tạm ứng liên quan đến một trong số bệnh nhân đang điều trị tại khoa, lập phiếu để nghị tạm ứng. Các thông tin này sẽ được liên tục cập nhật vào theo dõi công nợ bệnh nhân và chuyển đến phòng viện phí để thu tiền và in phiếu cho bệnh nhân.

#### Yêu cầu chức năng:

- Cập nhật thông tin hành chính, số tiền tạm ứng
- Tìm kiếm hồ sơ bệnh nhân
- Sửa, xóa, cập nhật thông tin tạm ứng của bệnh nhân
- Chức năng quản lý tập trung toàn bộ thông tin về tạm ứng từng bệnh nhân, giúp điều dưỡng tổng kết toàn bộ thông tin của các đối tượng tạm ứng tổng trong một cách nhanh nhất để đề nghị khi tổng số tiền số theo dõi, kết đơn thuốc
- In phiếu tạm ứng
- Quản lý các thông tin:
  - Số lượng bệnh nhân
  - Các thông tin chi tiết về tiền công nợ và tạm ứng của bệnh nhân
- Báo cáo thống kê

#### Hiệu quả mang lại:

- Cập nhật trực tiếp các thông tin của bệnh nhân vào công nợ. Tạo ra sự phối hợp thông tin giữa các khoa, phòng với bộ phận kế toán
- Nâng cao hiệu quả quản lý công nợ của bệnh nhân đã được lưu trữ trước đó
- Giảm thiểu thời gian lập báo cáo thống kê về công nợ của bệnh nhân.
- Ban giám đốc có thể theo dõi tình hình tài chính thông qua các báo cáo, thống kê.

---

### 8. Phân hệ Quản lý Viện phí (Pages 21-22)

#### Quy trình nghiệp vụ (Page 21 — activity diagram)

**QUY TRÌNH VIỆN PHÍ NỘI TRÚ - QUY TRÌNH TẠM ỨNG — Swim lanes:**
1. Làm Hồ Sơ nhập viện
2. Khoa Nội trú
3. Thu tiền tạm ứng
4. Giao Biên lai cho Bệnh nhân

**Các bước:**

**Lane 1 — Làm Hồ Sơ:**
- 1.1 Quy trình Đăng ký Nhập viện
- 1.2 Giấy đề nghị Thu tạm ứng Ban đầu

**Lane 2 — Khoa Nội trú:**
- 2.1 Theo dõi công nợ bệnh nhân
- 2.2 Giấy để nghị tạm ứng

**Lane 3 — Thu tiền tạm ứng:**
- 3.1 In Biên lai Thu tạm ứng (Tạm ứng ban đầu)
- 3.2 Thu tiền Tạm ứng

**Lane 4 — Giao Biên lai:**
- 4.1 Giao Biên lai Thu tạm ứng

**Điểm quyết định:**
- Cần tạm ứng? → Có/Không

**Mô tả quy trình nghiệp vụ:**

Phân hệ viện phí được kết hợp với các phần hệ Tiếp nhận bệnh nhân, Phòng khám lâm sàng, xét nghiệm, Quản lý bệnh nhân nội trú, quản lý dược để thu tiền viện phí của tất cả các đối tượng:

#### Yêu cầu chức năng (Page 21-22):

- Quản lý chặt chẽ các số liệu có liên quan đến các hạng mục tính toán viện phí của bệnh nhân:
  - Thu tiền khám bệnh
  - Tiền điều trị các thủ thuật, phẫu thuật
  - Tiền xét nghiệm, thăm dò chức năng
  - Tiền viện phí tính theo giường và ngày điều trị
  - Tiền thuốc
  - Tạm thuốc phí, tạm ứng, đặt tiền mượn đồ,...
  - Hoàn trả tiền cho bệnh nhân
  - ...
- Quản lý lý quy giá báo hiệu lực của từng đơn giá các hạng mục viện phí
- In báo cáo chi tiết thanh toán ra viện đầy đủ khi bệnh nhân yêu cầu, có thể tùy chọn ngày bệnh nhân nằm viện bao nhiêu lâu, hết bao nhiêu tiền để bệnh nhân có thể chuẩn bị tiền
- Báo cáo thu chi tài chính của bệnh nhân cho từng khoa, toàn Bệnh viện
  - Tổng số thu được từ bệnh nhân không BHYT
  - Tổng số thu được từ BHYT
  - Tổng số thu cho cho thuốc, phẫu thuật,...
  - Không thu được từ phía bệnh nhân
  - ...
- Báo cáo thống kê viện phí, số liệu báo cáo các khoản đồng chi trả của cơ quan Bảo hiểm y tế.

**Thêm (Page 22):**
- Tiền phẫu thuật, thủ thuật
- Tiền giường, thủ thuật
- In phiếu thu chi toán ra viện đầy đủ khi bệnh nhân yêu cầu, có thể tùy chọn in ngày:
  - Tiền khám bệnh: Nội trú
  - Tiền viện phí: Nội trú, Ngoại trú
  - Tiền thuốc
  - Tiền xét nghiệm, thăm dò chức năng
  - Tiền phẫu thuật, thủ thuật

#### Hiệu quả mang lại (Page 22):

- Trợ giúp theo dõi, tính toán chính xác viện phí phải trả của bệnh nhân
- Quản lý chính tiết tình hình thu chi của các phòng khoa ngoại trú và nội trú
- Tiết kiệm thời gian tổng hợp các số liệu thống kê báo cáo
- Trợ giúp ban Giám đốc bệnh viện kiểm soát được các hoạt động thu/chi viện phí trong bệnh viện
- Quản lý chính xác nguồn thu của bệnh viện, chống thoát tài chính

---

### 9. Phân hệ Quản lý Lưu trữ hồ sơ bệnh án (Page 22)

#### Mục đích

Phân hệ Lưu trữ hồ sơ bệnh án được xây dựng với mục đích số hóa Hồ sơ bệnh án của bệnh nhân sau khi khám và điều trị tại bệnh viện.

#### Yêu cầu chức năng:

- Xác định vị trí hồ sơ bệnh án
- Mượn hồ sơ bệnh án
- Trả hồ sơ bệnh án

#### Hiệu quả mang lại:

- Quản lý Hồ sơ bệnh án đã được số hóa một cách khoa học
- Hỗ trợ thông tin, theo dõi bệnh sử, bệnh tình của các bệnh nhân lăm tăng hiệu quả điều trị
- Hỗ trợ thực hiện các công tác khảo sát, đánh giá phục vụ cho các công trình nghiên cứu.

---

### 10. Phân hệ Quản lý Tổng hợp báo cáo (Pages 22-23)

#### Mục đích

Phân hệ Tổng hợp báo cáo được xây dựng nhằm mục đích cung cấp tất cả các báo cáo cho ban lãnh đạo bệnh viện và các cơ quan quản lý cấp trên với các kiểu mẫu báo cáo đa dạng như: biểu đồ, bảng tính, bảng dữ liệu động, tập tin, bảng tính excel... phục vụ cho công tác thống kê, nghiên cứu khoa học và quản lý.

#### Yêu cầu chức năng (Page 23):

- Kết xuất các báo cáo phục vụ công tác quản lý điều hành chung tại bệnh viện
- Kết xuất các báo cáo phục vụ bộ phận lãnh đạo, tuyến trên
- Kết xuất các báo cáo ra theo các định dạng file.

#### Hiệu quả mang lại:

- Phục vụ tốt cho công tác quản lý, điều hành của các cấp lãnh đạo bệnh viện cũng như Sở Y tế, Bộ y tế.

---

### 11. Phân hệ Quản lý Vật tư, trang thiết bị y tế (Pages 23-24)

#### Quy trình nghiệp vụ (Page 23 — activity diagram)

**QUY TRÌNH QUẢN LÝ VẬT TƯ, TRANG THIẾT BỊ Y TẾ — Swim lanes:**
1. Quản lý từ nguồn
2. Quản lý kho
3. Quản lý TTB tại khoa
4. Sửa chữa/Thanh lý

**Các bước quy trình:**

**Lane 1 — Quản lý nguồn:**
- 1.1 Quy trình tiếp nhận (mua bổ, điều thuyển)
- 1.2 Quyết định mua/sửa chữa VTT/thiết bị

**Lane 2 — Quản lý kho:**
- 2.1 Nhập kho
- 3.2 Duyệt cấp theo tình trạng thực tế kho
- 3.2 Hạch toán kế toán: bán hàng ký kho
- 3.3 Theo dõi tình trạng vụ kho
- 3.4 Theo kho tình theo vụ phòng

**Lane 3 — Quản lý TTB tại khoa:**
- Dự trữ tại khoa
- Thẩm định sử dụng TTB

**Lane 4 — Sửa chữa/Thanh lý:**
- 4.1 Thanh lý tài sản
- 4.2 Dự trữ tài sản
- 1.5 Thanh lý tài sản

**Luồng xử lý:**
- Nhập vào → Kho → Xuất cho khoa → Sử dụng → Sửa chữa/Thanh lý
- TTB lỗi/hỏng → Đề xuất sửa chữa/thanh lý

#### Mục đích (Page 23):

Phân hệ phục vụ lưu trữ và quản lý tất cả các thông tin về vật tư, trang thiết bị y tế của bệnh viện. Tất cả các thông tin về vật tư, trang thiết bị y tế được liên tục thông báo và kịp thời.

Xây dựng kho dữ liệu từ vật tư đến tài sản và máy móc trang thiết bị của Bệnh viện, phục vụ tốt nhất cho các hoạt động của bệnh viện và cho các chương trình triển khai.

Phân hệ được xây dựng đảm bảo:
- Cập nhật hóa đồng thời vật tư, tài sản và máy móc trang thiết bị của Bệnh viện
- Lập công thức khai thác tổ chức định kỳ theo các công thức hiện hành
- Theo dõi tình hình sử dụng và thống kê, báo cáo định kỳ những công việc chuyên môn, quản lý và các thống kê lẻ liên quan

#### Yêu cầu chức năng (Page 24):

- Quản lý nhập tài sản, thiết bị từ các nhà cung cấp
- Quản lý việc cung cấp cho các khoa, phòng, các tổ chức
- Quản lý việc sửa chữa các tài sản, phòng, thiết bị bị hư hỏng
- Quản lý thanh lý tài sản, trang thiết bị
- In các báo cáo, biểu bảng liên quan
- Quản lý theo dõi lý các tài sản tại tất cả các khoa, phòng

#### Hiệu quả mang lại:

- Phân hệ hỗ trợ quản lý, thống kê trang thiết bị trong bệnh viện nhanh chóng, chính xác, theo dõi tình trạng của các trang thiết bị.
- Giúp Ban lãnh đạo bệnh viện nắm bắt kịp thời và chính xác tình hình sử dụng vật tư, thiết bị tại bệnh viện để kế hoạch cung cấp đúng và đầy đủ các loại theo nhu cầu.

---

### 12. Phân hệ Quản lý danh mục (Page 24)

#### Mục đích

Phân hệ Quản lý danh mục cung cấp các công cụ cần thiết để hỗ trợ người dùng cập nhật bộ từ điển danh mục toàn bộ hệ thống.

#### Yêu cầu chức năng:

- Cơ sở dữ liệu địa chỉ Việt Nam
- Chuẩn mã bệnh ICD 10
- Danh mục các bệnh viện Việt Nam
- Danh mục các quốc gia trên thế giới
- 1408 mã phẫu thuật, thủ thuật của Bộ Y tế
- Mã các Bệnh viện theo quy định chung của Vụ điều trị
- Mã Bệnh viện theo quy định của Vụ điều trị...

#### Hiệu quả mang lại:

- Cập nhật trực tiếp các thông tin về danh mục vào danh mục. Tạo ra sự phối hợp thông tin giữa các phòng khám với bộ phận quản lý phần mềm.
- Nâng cao hiệu quả quản lý danh mục đã được lưu trữ trước đó
- Giảm thiểu thời gian tìm kiếm thông tin về danh mục cần có được lưu trữ trước đó
- Bộ phận quản lý phần mềm mới có thể theo dõi tình hình sử dụng phần mềm thông qua các cập nhật ký người dùng.

---

### 13. Phân hệ Quản lý người dùng (Page 24)

#### Mô tả quy trình nghiệp vụ

Cho phép tạo nhóm phân quyền và tài khoản sử dụng phần mềm theo từng phân hệ chức năng theo yêu cầu quản lý.

#### Yêu cầu chức năng:

- Tìm kiếm người dùng
- Sửa, xóa, cập nhật thông tin người dùng
- Chức năng quản lý tập trung toàn bộ thông tin về người dùng sử dụng phần mềm Quản lý các thông tin:
  - Số lượng người dùng
  - Các thông tin chi tiết về người dùng sử dụng các tính chức năng trong phần mềm

#### Hiệu quả mang lại:

- Cập nhật trực tiếp các thông tin về người dùng vào danh mục. Tạo ra sự phối hợp thông tin giữa các khoa phòng với bộ phận quản lý phần mềm.
- Nâng cao hiệu quả quản lý người dùng đã được lưu trữ trước đó
- Giảm thiểu thời gian tìm kiếm thông tin về người dùng sử dụng phần mềm.

---

### 14. Phân hệ Quản lý nhật ký, theo dõi thống kê hệ thống (Page 25)

#### Mô tả quy trình nghiệp vụ

Cho phép quản lý lưu trữ nhật ký người dùng sử dụng phần mềm khi khai thác, cập nhật thông tin tin trên phần mềm.

#### Yêu cầu chức năng:

- Tìm kiếm nhật ký người dùng
- Lưu nhật ký người dùng khi sử dụng phần mềm
- Chức năng quản lý tập trung toàn bộ thông tin về nhật ký người dùng sử dụng phần mềm đã được lưu trữ trước đó
- Chức năng sao lưu và phục hồi dữ liệu

#### Hiệu quả mang lại:

- Cập nhật trực tiếp các thông tin về nhật ký người dùng sử dụng phần mềm đã được lưu trữ trước đó
- Nâng cao hiệu quả quản lý nhật ký người dùng sử dụng phần mềm đã được lưu trữ trước đó
- Giảm thiểu thời gian tìm kiếm thông tin về người dùng sử dụng phần mềm.
- Bộ phận quản lý phần mềm mới có thể theo dõi tình hình sử dụng phần mềm thông qua các cập nhật ký người dùng.

---

## III. DANH SÁCH CÁC TÁC NHÂN THAM GIA HỆ THỐNG (Page 26)

> NOTE: Page 26 image was rejected by API. Content reconstructed from table of contents and surrounding context.

Danh sách các tác nhân (actors) tham gia hệ thống phần mềm Quản lý bệnh viện MQSoft bao gồm:

| STT | Tác nhân | Mô tả vai trò |
|-----|----------|---------------|
| 1 | **NVHC** (Nhân viên hành chính) | Tiếp nhận bệnh nhân, quản lý thông tin đăng ký, lập phiếu, thu phí, quản lý hành chính |
| 2 | **Bác sĩ** | Khám bệnh, chỉ định xét nghiệm/CĐHA/phẫu thuật, kê đơn thuốc, ghi chẩn đoán, ký duyệt y lệnh |
| 3 | **Y tá / Điều dưỡng** | Thực hiện y lệnh, theo dõi bệnh nhân, cấp thuốc, lấy mẫu bệnh phẩm, ghi chép điều dưỡng |
| 4 | **Lãnh đạo** | Xem báo cáo, duyệt kế hoạch, kiểm tra hoạt động bệnh viện |
| 5 | **NV hành chính** (NV hành chính viện phí) | Thu tiền, thanh toán viện phí, quản lý tạm ứng, hoàn trả |
| 6 | **Dược sĩ** | Nhập kho, xuất kho, cấp phát thuốc, kiểm kê, duyệt y lệnh thuốc |

---

## IV. SƠ ĐỒ TÁC NHÂN VÀ CÁC TRƯỜNG HỢP SỬ DỤNG (Pages 27-37)

### 1. Phân hệ Tiếp đón bệnh nhân (Page 27)

#### Use Case: Quản lý đặt khám

**Actors:**
- NVHC (Nhân viên hành chính) — actor trung tâm

**Use cases xung quanh NVHC:**
- Ngày giờ đặt khám
- Yêu cầu khám chuyên khoa
- Yêu cầu bác sỹ khám
- In phiếu đặt khám
- Chuyển thông tin đặt khám vào tiếp nhận thông tin đăng ký khám

**Mô tả:** Nhân viên hành chính quản lý lịch đặt khám của bệnh nhân, ghi nhận yêu cầu khám chuyên khoa hoặc bác sĩ cụ thể, in phiếu và chuyển thông tin sang bước tiếp nhận.

---

#### Use Case: Quản lý đón tiếp

**Actors:**
- Y tá
- Bác sĩ
- NVHC (Nhân viên hành chính) — actor trung tâm

**Use cases xung quanh NVHC:**
- Gọi người bệnh bằng loa
- Quản lý mã vạch (Barcode)
- Quản lý hình ảnh bệnh và hình ảnh y khoa
- Quản lý đối tượng
- Kiểm tra tình hợp lệ của đối tượng
- Thông tin đầu sinh tồn
- Theo dõi quá trình điều trị
- Báo cáo và truy vấn thông tin tiếp đón
- Tìm kiếm thông tin người bệnh tiếp đón
- In hoa đơn tiền khám
- In phiếu điều trị
- Cấp số thứ tự và phân phòng khám

**Use cases của Y tá:**
- (không có use case riêng, hỗ trợ NVHC)

**Use cases của Bác sĩ:**
- (không có use case riêng trong đón tiếp)

---

### 2. Quản lý bệnh nhân ngoại trú (Pages 28-29)

#### Use Case: Quản lý Phòng khám

**Actors:**
- Y tá
- NVHC (Nhân viên hành chính) — actor trung tâm

**Use cases xung quanh NVHC:**
- Ngày giờ khám
- Bác sỹ điều trị
- Điều dưỡng
- Đầu sinh tồn người bệnh
- Triệu chứng
- Chẩn đoán
- In phiếu khám bệnh
- In chỉ phí điều trị

**Use cases của Y tá:**
- Báo cáo và truy vấn thông tin khám bệnh
- Tìm kiếm thông tin người bệnh khám bệnh
- Đổi chiều phòng khám (xếp phí → cận lâm sàng)
- Số khám bệnh
- In sổ điều trị

---

#### Use Case: Quản lý Khám sức khỏe

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Đăng ký khám sức khỏe theo đoàn
- Chỉ định khám sức khỏe
- Chẩn đoán
- Phân loại sức khỏe

**Use cases của Bác Sĩ:**
- Báo cáo thống kê khám sức khỏe

**Use cases của Y tá:**
- In phiếu khám sức khỏe
- Bác sỹ điều trị

---

#### Use Case: Quản lý Bệnh nhân điều trị ngoại trú (Page 29)

**Actors:**
- Lãnh đạo
- NVHC — actor trung tâm
- Bác Sĩ
- Y tá

**Use cases xung quanh NVHC:**
- Ngày giờ vào, ngày ra điều trị ngoại trú
- Nơi giới thiệu
- Số ngoại trú
- Chẩn đoán (giới thiệu, vào, ra)
- Kết quả điều trị

**Use cases của Lãnh đạo:**
- Báo cáo và truy vấn thông tin điều trị ngoại trú

**Use cases của Bác Sĩ:**
- Tìm kiếm thông tin người bệnh trước và sau điều trị ngoại trú
- Xem hồ sơ bệnh án điều trị ngoại trú

**Use cases của Y tá:**
- Phiếu thanh toán dịch vụ điều trị ngoại trú
- Tính trạng lúc ra viện

---

#### Use Case: Quản lý Bệnh nhân cấp cứu tổng hợp (Page 29)

**Actors:**
- Bác Sĩ
- Y tá
- NV hành chính — actor trung tâm

**Use cases xung quanh NV hành chính:**
- Quản lý Nhập - Xuất - Hiện diện ngoại bệnh cấp cứu tổng hợp
- Quản lý tủ trực cấp cứu tổng hợp
- Phiếu thanh toán dịch vụ cấp cứu tổng hợp

**Use cases của Bác Sĩ:**
- Báo cáo và truy vấn thông tin cấp cứu tổng hợp
- Tìm kiếm thông tin người bệnh trước và sau điều trị cấp cứu tổng hợp
- Xem hồ sơ bệnh án cấp cứu tổng hợp

**Use cases của Y tá:**
- (hỗ trợ NV hành chính)

---

### 3. Quản lý Bệnh nhân điều trị nội trú (Pages 30-37)

#### Use Case: Quản lý Bệnh nhân điều trị nội trú (Page 30)

**Actors:**
- Nhập khoa (Nhân viên)
- Bác sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Nhập khoa
- Quản lý tủ trực điều trị nội trú
- Chỉ định khám chuyển khoa điều trị nội trú
- Tổng hợp y lệnh điều trị nội trú
- Phiếu công khai thuốc & dịch vụ điều trị nội trú
- Phiếu thanh toán dịch vụ & điều trị nội trú

**Use cases của Bác sĩ:**
- Báo cáo và truy vấn thông tin điều trị nội trú

**Use cases của Y tá:**
- Thống kê danh sách xuất nhập viện
- Tìm kiếm thông tin người bệnh trước và sau điều trị nội trú
- Xem hồ sơ bệnh án điều trị nội trú

---

#### Use Case: Quản lý dị ứng thuốc (Page 30)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Xác định người bệnh
- Hoạt chất
- Mức độ dị ứng thuốc

**Use cases của Bác Sĩ:**
- (chỉ định dị ứng)

**Use cases của Y tá:**
- Kiểm tra và thông báo dị ứng thuốc khi bác sỹ ra y lệnh

---

#### Use Case: Quản lý tai nạn thương tích giao thông (Page 31)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Địa điểm, thời gian xảy ra tai nạn
- Sơ cấp cứu ban đầu?
- Phương tiện (đưa nạn nhân đến viện, sử dụng khi bị tai nạn, gây tai nạn)
- Thông tin về sử dụng mũ bảo hiểm

**Use cases của Bác Sĩ:**
- (không có riêng)

**Use cases của Y tá:**
- In phiếu
- Xử trí (Nhập viện, mổ cấp cứu, tử vong)
- Tình trạng thương tích
- Thông tin về sử dụng rượu bia

---

#### Use Case: Quản lý Tự sát, tự tử hoặc nguyên nhân khác (Page 31)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Thời điểm xảy ra tự sát
- Nguyên nhân xảy ra
- Hình thức tự sát

**Use cases của Bác Sĩ:**
- (không có riêng)

**Use cases của Y tá:**
- Tình trạng tự sát

---

#### Use Case: Quản lý bệnh mãn tính (Page 32)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Tên bệnh theo chẩn đoán ICD10
- Ghi chú về bệnh mã tính

**Use cases của Bác Sĩ:**
- (không có riêng)

**Use cases của Y tá:**
- Trình bày bệnh mãn tính khi Bác sỹ theo hồ sơ bệnh án người bệnh

---

#### Use Case: Quản lý chỉ định Xét nghiệm, Chẩn đoán hình ảnh, phẫu thủ thuật,... (Page 32)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Ngày chỉ định
- Chẩn đoán
- Bác sỹ chỉ định
- Tình trạng người bệnh
- Nơi thực hiện
- Nội dung chỉ định

**Use cases của Bác Sĩ:**
- In phiếu chỉ định

**Use cases của Y tá:**
- Tạo gói dịch vụ, phác đồ điều trị theo mã ICD 10
- Ghi chú vị trí thực hiện (nếu có)

---

#### Use Case: Quản lý cấp đơn thuốc ngoại trú (Page 33)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Ngày đơn thuốc
- Chẩn đoán
- Đầu sinh tồn người bệnh
- Tên Bác sĩ
- Tên thuốc
- Liều dùng

**Use cases của Bác Sĩ:**
- In đơn thuốc

**Use cases của Y tá:**
- Tạo đơn thuốc mẫu theo ICD10
- Kiểm tra đánh mức chi phí đơn thuốc
- Cảnh báo tương tác thuốc
- Cảnh báo trang thuốc, hoạt chất

---

#### Use Case: Quản lý phẫu thuật (Page 33)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Ngày giờ bắt đầu ... kết thúc phẫu thuật
- Khoa, phòng
- Phòng mổ
- Chẩn đoán trước và sau phẫu thuật
- Phương pháp phẫu thuật
- Phẫu thuật viên chính và ý bác sỹ trong phẫu thuật

**Use cases của Bác Sĩ:**
- In phiếu phẫu thuật
- Phiếu thanh quyết toán
- Thuốc, vật tư trong phẫu thuật

**Use cases của Y tá:**
- Tử vong?
- Tai biến?
- Tình hình phẫu thuật
- Tương trình phẫu thuật

---

#### Use Case: Quản lý giấy chứng nhận nghỉ việc hưởng BHXH (Page 34)

**Actors:**
- NVHC
- Y tá
- Bác sĩ — actor trung tâm

**Use cases:**
- Thời gian nghỉ việc hưởng BHXH
- Lý do nghỉ hưởng BHXH
- In giấy nghỉ hưởng BHXH (Y tá)

---

#### Use Case: Quản lý giấy xác nhận đang điều trị tại Bệnh viện (Page 34)

**Actors:**
- Y tá
- NVHC
- Bác sĩ — actor trung tâm

**Use cases:**
- Ngày vào, ngày ra điều trị tại Bệnh viện
- Chẩn đoán
- Hướng điều trị

**Use cases của Y tá:**
- In giấy xác nhận đang điều trị

**Use cases của Bác sĩ:**
- Bác sỹ điều trị

---

#### Use Case: Quản lý giấy chứng sinh (Page 34)

**Actors:**
- NVHC
- Y tá
- Bác sĩ — actor trung tâm

**Use cases:**
- Dự định đặt tên con
- Sức khỏe của con
- Người đỡ đẻ

**Use cases của NVHC:**
- In giấy chứng sinh

**Use cases của Y tá:**
- (hỗ trợ)

**Use cases của Bác sĩ:**
- Lãnh đạo ký

---

#### Use Case: Quản lý giấy chứng nhận thương tích (Page 35)

**Actors:**
- NVHC
- Y tá
- Bác sĩ — actor trung tâm

**Use cases:**
- Lý do vào viện
- Chẩn đoán
- Điều trị
- Tình trạng thương tích lúc vào viện
- Tình trạng thương tích lúc ra viện

**Use cases của NVHC:**
- In giấy chứng nhận thương tích

**Use cases của Bác sĩ:**
- Bác sỹ điều trị

---

#### Use Case: Quản lý giấy chuyển viện (Page 35)

**Actors:**
- NVHC
- Y tá
- Bác sĩ — actor trung tâm

**Use cases:**
- Dấu hiệu lâm sàng
- Các xét nghiệm
- Chẩn đoán
- Phương pháp thu thuốc, đã sử dụng trong điều trị

**Use cases của NVHC:**
- In giấy chuyển viện

**Use cases của Y tá:**
- Phương tiện vận chuyển
- Chuyển viện bởi
- Hướng điều trị
- Lý do chuyển viện

**Use cases của Bác sĩ:**
- Tình trạng người bệnh lúc chuyển viện
- Bác sỹ điều trị

---

#### Use Case: Quản lý giấy ra viện (Page 36)

**Actors:**
- NVHC
- Y tá
- Bác sĩ — actor trung tâm

**Use cases:**
- Ngày vào, ngày ra điều trị tại Bệnh viện
- Khoa xuất viện
- Chẩn đoán
- Phương pháp điều trị
- Tình trạng người bệnh lúc xuất viện

**Use cases của NVHC:**
- In giấy ra viện

**Use cases của Y tá:**
- Ngày tái khám?
- Phương pháp phẫu thuật
- Phẫu thuật viên chính
- Ngày phẫu thuật
- Bác sỹ điều trị

**Use cases của Bác sĩ:**
- Lời dặn của thầy thuốc

---

#### Use Case: Quản lý giấy báo tử (Page 36)

**Actors:**
- NVHC
- Y tá
- Bác sĩ — actor trung tâm

**Use cases:**
- Ngày giờ giấy báo tử
- Chẩn đoán
- Nguyên nhân

**Use cases của NVHC:**
- In giấy báo tử

**Use cases của Y tá:**
- (hỗ trợ)

**Use cases của Bác sĩ:**
- Thêm giấy báo tử

---

#### Use Case: Quản lý phiếu dự trữ thuốc, vật tư y tế (Page 37)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Ngày y lệnh
- Bác vỹ
- Điều dưỡng
- Dầu sinh tồn người bệnh
- Chẩn đoán

**Use cases của Bác Sĩ:**
- In phiếu dự trữ thuốc, vật tư y tế

**Use cases của Y tá:**
- Chuyển số liệu dự trữ xuống kho, chờ duyệt
- Trừ ao số lượng tồn kho

**Use cases chung:**
- Thuốc, vật tư y tế còn tồn tại kho Bệnh viện

---

#### Use Case: Quản lý phiếu xuất tủ trực thuốc, vật tư y tế (Page 37)

**Actors:**
- Bác Sĩ
- Y tá
- NVHC — actor trung tâm

**Use cases xung quanh NVHC:**
- Ngày y lệnh
- Bác vỹ
- Điều dưỡng
- Dầu sinh tồn người bệnh
- Chẩn đoán

**Use cases của Bác Sĩ:**
- In phiếu xuất tủ trực thuốc, vật tư y tế

**Use cases của Y tá:**
- Chuyển số liệu xuất tủ trực xuống kho, chờ duyệt bù cơ sở tủ trực
- Trừ cơ sở tủ trực tại Khoa

**Use cases chung:**
- Thuốc, vật tư y tế còn tồn tại tủ trực tại Khoa

---

## TÓM TẮT CẤU TRÚC MODULE VÀ ACTORS

### 14 Phân hệ chính

| STT | Phân hệ | Mục đích chính |
|-----|---------|----------------|
| 1 | Tiếp đón bệnh nhân | Đăng ký, tiếp nhận, cấp mã BN, lấy số thứ tự |
| 2 | Quản lý bệnh nhân ngoại trú | Phòng khám, khám sức khỏe, ngoại trú, cấp cứu |
| 3 | Quản lý bệnh nhân điều trị nội trú | Nhập viện, điều trị, phẫu thuật, xuất viện, giấy tờ |
| 4 | Quản lý Khoa xét nghiệm | Tiếp nhận mẫu, thực hiện XN, trả kết quả, hóa chất |
| 5 | Quản lý Chẩn đoán hình ảnh | Chỉ định CĐHA, thực hiện, trả kết quả |
| 6 | Quản lý Dược bệnh viện | Nhập kho, xuất kho, cấp phát, kiểm kê, báo cáo |
| 7 | Quản lý chỉ định tạm ứng | Lập phiếu tạm ứng, theo dõi công nợ |
| 8 | Quản lý Viện phí | Thu tiền, thanh toán, hoàn trả, báo cáo tài chính |
| 9 | Quản lý Lưu trữ hồ sơ bệnh án | Số hóa, xác định vị trí, mượn/trả hồ sơ |
| 10 | Quản lý Tổng hợp báo cáo | Báo cáo đa dạng cho lãnh đạo và cơ quan quản lý |
| 11 | Quản lý Vật tư, trang thiết bị y tế | Nhập/xuất kho vật tư, theo dõi thiết bị, sửa chữa |
| 12 | Quản lý danh mục | Cơ sở dữ liệu ICD10, danh mục thuốc, bệnh viện |
| 13 | Quản lý người dùng | Phân quyền, tài khoản, theo dõi người dùng |
| 14 | Quản lý nhật ký, theo dõi thống kê | Audit log, backup/restore, thống kê hệ thống |

### Actors chính trong hệ thống

| Actor | Viết tắt | Vai trò |
|-------|----------|---------|
| Nhân viên hành chính | NVHC | Tiếp nhận, lập phiếu, in giấy tờ, quản lý hành chính |
| Bác sĩ | BS | Khám, chỉ định, kê đơn, chẩn đoán, ký duyệt |
| Y tá / Điều dưỡng | YT | Thực hiện y lệnh, theo dõi, cấp thuốc |
| Lãnh đạo | LĐ | Báo cáo, duyệt kế hoạch, giám sát |
| NV hành chính (viện phí) | NVH | Thu tiền, thanh toán viện phí |
| Dược sĩ | DS | Quản lý kho dược, cấp phát |

---

## PHỤ LỤC: SƠ ĐỒ KIẾN TRÚC HỆ THỐNG (Page 9)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTML/XML (Giao diện)                         │
├─────────────────────────────────────────────────────────────────┤
│  LỚP TRÌNH DIỄN                                                 │
│  Cán bộ nghiệp vụ │ Lãnh đạo │ Quản trị ứng dụng              │
├─────────────────────────────────────────────────────────────────┤
│  LỚP NGHIỆP VỤ                                                  │
│  Các module chức năng nghiệp vụ │ Các Module chức năng quản trị │
│  ┌──────────┐ ┌──────────┐      │ ┌──────────┐ ┌───────────┐   │
│  │Module    │ │Module    │      │ │Quản trị  │ │Kiểm tra   │   │
│  │Tiếp nhận │ │Bác cáo  │      │ │hệ thống  │ │nội bộ     │   │
│  │BN        │ │          │      │ └──────────┘ └───────────┘   │
│  ├──────────┤ ├──────────┤      │ ┌──────────┐ ┌───────────┐   │
│  │Module    │ │Module    │      │ │Backup &  │ │Trợ giúp   │   │
│  │QL PR     │ │QL BN     │      │ │Restore   │ │sử dụng    │   │
│  └──────────┘ └──────────┘      │ └──────────┘ └───────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  LỚP GIAO TIẾP                                                  │
│  Tích hợp hệ thống │ Giao tiếp dữ liệu                        │
├─────────────────────────────────────────────────────────────────┤
│  LỚP DỮ LIỆU                                                    │
│  Các hệ thống khác → CSDL (Cơ sở dữ liệu)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## GHI CHÚ KỸ THUẬT

### Chuẩn dữ liệu được sử dụng
- Địa chỉ Việt Nam (cơ sở dữ liệu hành chính)
- ICD-10 (Phân loại bệnh tật quốc tế)
- 1408 mã phẫu thuật, thủ thuật của Bộ Y tế
- Danh mục bệnh viện Việt Nam
- Mã bệnh viện theo Vụ điều trị
- Danh mục quốc gia thế giới
- Chuẩn HL7 (tích hợp PACS/RIS)

### Tích hợp ngoài
- BHXH Việt Nam (chuyển số liệu quyết định)
- Bộ Y tế (báo cáo thống kê)
- BHYT (tính toán chi trả tự động)
- LED display (hiển thị thông tin tại khoa, phòng)
- Website (đặt khám online)
- Barcode/QR Code (nhận dạng bệnh nhân)

### Yêu cầu bảo hành và bảo trì
- Bảo hành 12 tháng sau nghiệm thu
- Báo cáo 12 tháng sau nghiệm thu
- Nâng cấp không ảnh hưởng hoạt động hệ thống
- Unicode TCVN9-2001
