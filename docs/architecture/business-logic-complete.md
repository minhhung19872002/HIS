# HIS - Hệ thống Phần mềm Bệnh viện Thông minh
## Business Logic & Danh sách Chức năng Chi tiết (Đầy đủ)

---

## Tổng quan Dự án

| Hạng mục | Nội dung |
|----------|----------|
| **Tên gói thầu** | Gói thầu số 01 - Thuê Cung cấp giải pháp và phần mềm bệnh viện thông minh HIS 6 tháng năm 2026 |
| **Chủ đầu tư** | Bệnh viện Đa khoa Nông nghiệp |
| **Nguồn vốn** | Nguồn thu sự nghiệp của Bệnh viện |
| **Hình thức hợp đồng** | Trọn gói |
| **Thời gian thực hiện** | 06 tháng |

---

# PHẦN A. QUẢN LÝ KHÁM CHỮA BỆNH

---

## 1. PHÂN HỆ QUẢN LÝ HÀNH CHÍNH, ĐÓN TIẾP
**Actor chính**: Nhân viên tiếp đón

### 1.1 Điều phối bệnh nhân vào các phòng khám

| STT | Chức năng |
|-----|-----------|
| 1 | Xem tổng số bệnh nhân khám trong ngày ở các phòng khám |
| 2 | Xem số bệnh nhân đang chờ khám ở các phòng khám |
| 3 | Xem số lượng bệnh nhân đã khám xong tại phòng khám |
| 4 | Xem số lượt khám tối đa của phòng khám |
| 5 | Xem số lượt khám Bảo hiểm tối đa của phòng khám |
| 6 | Xem số bệnh nhân đang đi làm cận lâm sàng |
| 7 | Xem bác sĩ làm việc tại phòng khám |
| 8 | Xem lịch làm việc của bác sĩ tại phòng khám |
| 9 | Hiển thị trạng thái phòng khám bằng màu sắc |

### 1.2 Hệ thống xếp hàng cho bệnh nhân vào tiếp đón

| STT | Chức năng |
|-----|-----------|
| 1 | Hệ thống cấp số thứ tự vào tiếp đón |
| 2 | Màn hình hiển thị bệnh nhân vào tiếp đón |
| 3 | Phát loa gọi bệnh nhân vào tiếp đón theo họ tên, số thứ tự |
| 4 | Hệ thống cấp số tiếp đón bằng thiết bị di động |

### 1.3 Kết nối dữ liệu BHYT để kiểm tra thẻ BHYT

| STT | Chức năng |
|-----|-----------|
| 1 | Đọc thẻ BHYT bằng QRcode |
| 2 | Cập nhật thông tin bệnh nhân theo kết quả kiểm tra dữ liệu BHYT |
| 3 | Cảnh báo thẻ hết hạn sử dụng |
| 4 | Cảnh báo thẻ đã đổi thẻ mới |

### 1.4 Chức năng cấp thẻ BHYT tạm cho bệnh nhân nhi có giấy chứng sinh

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng nhập thông tin người giám hộ |
| 2 | Chức năng nhập thông tin địa chỉ của bệnh nhân nhi |
| 3 | Cấp thẻ tạm cho bệnh nhân nhi theo công văn 3434/BYT-BH |
| 4 | Chức năng kiểm tra ngày sinh của bệnh nhân nhi đủ điều kiện cấp thẻ tạm |

### 1.5 Chức năng chụp ảnh Bệnh nhân và giấy tờ của bệnh nhân

| STT | Chức năng |
|-----|-----------|
| 1 | Chụp ảnh chân dung và hiển thị để chống mượn thẻ, khám hộ |
| 2 | Chụp ảnh chứng minh nhân dân, căn cước công dân |
| 3 | Chụp ảnh thẻ BHYT |
| 4 | Chức năng tùy chọn số lượng ảnh chụp khi tiếp đón |
| 5 | Chức năng kết nối camera |
| 6 | Chức năng tải ảnh lên |

### 1.6 Chức năng quản lý giữ/trả giấy tờ của bệnh nhân

| STT | Chức năng |
|-----|-----------|
| 1 | Quản lý giữ và trả thẻ BHYT |
| 2 | Quản lý giữ và trả thẻ giấy tờ cá nhân: CMND/CCCD/bằng lái xe |
| 3 | Quản lý giữ và trả giấy chuyển viện |
| 4 | Quản lý giữ và trả giấy tờ khác |
| 5 | Chức năng hiển thị danh sách bệnh nhân đang giữ giấy tờ |
| 6 | Chức năng in phiếu giữ giấy tờ |
| 7 | Chức năng tìm kiếm bệnh nhân |
| 8 | Chức năng in phiếu trả giấy tờ |

### 1.7 Chức năng đăng ký khám bệnh nhân BHYT, tái khám

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng đăng ký khám bệnh nhân BHYT |
| 2 | Chức năng đăng ký khám bệnh nhân BHYT bằng QRcode thẻ BHYT |
| 3 | Chức năng đăng ký khám bệnh nhân BHYT bằng 10 số thẻ BHYT mới |
| 4 | Chức năng đăng ký khám nhanh bằng mã bệnh nhân |
| 5 | Chức năng đăng ký khám nhanh bằng mã hẹn khám |
| 6 | Chức năng đăng ký bệnh nhân BHYT nhanh bằng CMND/CCCD |
| 7 | Chức năng đăng ký bệnh nhân BHYT ưu tiên |
| 8 | Chức năng đăng ký bệnh nhân BHYT bằng mã điều trị |
| 9 | Chức năng tiếp đón bệnh nhân BHYT bằng thẻ khám bệnh thông minh |
| 10 | Chức năng in phiếu khám bệnh nhân BHYT |

### 1.8 Chức năng đăng ký khám bệnh nhân viện phí, khám dịch vụ

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng đăng ký khám bệnh nhân viện phí |
| 2 | Chức năng đăng ký khám bệnh nhân dịch vụ |
| 3 | Chức năng đăng ký khám nhanh bằng mã bệnh nhân |
| 4 | Chức năng đăng ký khám bệnh cho bệnh nhân ưu tiên |
| 5 | Chức năng đăng ký bệnh nhân viện phí bằng mã điều trị |
| 6 | Đăng ký khám bệnh nhân có thẻ BHYT nhưng khám dịch vụ |
| 7 | Chức năng đăng ký khám nhanh bằng CMND/CCCD |
| 8 | Chức năng tiếp đón bệnh nhân viện phí bằng số điện thoại |
| 9 | Chức năng tiếp đón bệnh nhân viện phí bằng thẻ khám bệnh thông minh |
| 10 | Chức năng chọn đích danh bác sĩ khi tiếp đón |
| 11 | Chức năng in phiếu khám bệnh nhân viện phí |

### 1.9 Chức năng đăng ký khám đối tượng khám sức khỏe

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng đăng ký khám bệnh nhân khám sức khỏe |
| 2 | Chức năng tạo hợp đồng khám sức khỏe |
| 3 | Chức năng nhập khẩu danh sách bệnh nhân khám sức khỏe theo hợp đồng |
| 4 | Chức năng đăng ký khám bệnh nhân có bảo hiểm nhân thọ |
| 5 | Chức năng nhập khẩu dịch vụ khám và cận lâm sàng theo hợp đồng |
| 6 | Chức năng nhập khẩu dịch vụ khám và cận lâm sàng theo giới tính |
| 7 | Chức năng kết nối thiết bị đầu đọc barcode, qrcode để tiếp đón nhanh |
| 8 | Chức năng in phiếu khám sức khỏe theo hợp đồng |

### 1.10 Chức năng đăng ký khám đối tượng cấp cứu

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng đăng ký bệnh nhân BHYT cấp cứu |
| 2 | Chức năng đăng ký bệnh nhân viện phí cấp cứu |
| 3 | Chức năng đăng ký tạm cho bệnh nhân cấp cứu chưa rõ thông tin |
| 4 | Chức năng cập nhật thông tin bệnh nhân cấp cứu |
| 5 | Chức năng ghép mã bệnh nhân |
| 6 | Chức năng tạm ứng cho bệnh nhân cấp cứu |
| 7 | Chức năng ưu tiên nợ viện phí cho bệnh nhân cấp cứu |
| 8 | Chức năng khai báo thông tin thời gian đau cho bệnh nhân cấp cứu từ tiếp đón |

### 1.11 Chức năng quản lý tiếp đón khác

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng chặn tiếp đón thẻ BHYT lạm dụng quỹ |
| 2 | Chức năng đăng ký khám cho bệnh nhân có nguồn chi trả khác |
| 3 | Chức năng khai báo thông tin người thân, người giám hộ |
| 4 | Chức năng cảnh báo bệnh nhân nợ viện phí ở lần khám chữa bệnh trước |
| 5 | Chức năng chỉnh sửa thông tin đăng ký tiếp đón |
| 6 | Chức năng đổi phòng khám |
| 7 | Chức năng sửa phòng khám |
| 8 | Chức năng cảnh báo bệnh nhân chưa sử dụng hết thuốc của lần khám trước |
| 9 | Chức năng cảnh báo bệnh nhân vừa ra viện trong ngày |
| 10 | Chức năng khai báo danh sách thẻ BHYT không hợp lệ |

### 1.12 Chức năng xem lịch sử đăng ký khám

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng hiển thị lịch sử đăng ký khám gần nhất |
| 2 | Chức năng xem chi tiết chẩn đoán, dịch vụ khám của lần gần nhất |
| 3 | Chức năng tùy chọn ẩn hiện lịch sử khám |
| 4 | Chức năng tùy chọn số lượng lịch sử khám gần nhất hiển thị |

### 1.13 Chức năng chỉ định dịch vụ ở tiếp đón cho bệnh nhân

| STT | Chức năng |
|-----|-----------|
| 1 | Chỉ định dịch vụ cận lâm sàng |
| 2 | Chỉ định dịch vụ bằng nhóm dịch vụ |
| 3 | Chức năng chọn phòng thực hiện khi chỉ định dịch vụ |
| 4 | Chỉ định dịch vụ mà bác sĩ đã chọn cho bệnh nhân hẹn khám |
| 5 | Tự động chỉ định dịch vụ cho bệnh nhân khám sức khỏe |
| 6 | Sửa chỉ định dịch vụ cận lâm sàng |
| 7 | In phiếu chỉ định cho bệnh nhân |
| 8 | Tính toán thời gian, đường đi ngắn nhất của BN khi thực hiện các dịch vụ CLS (theo tiêu chí TT54) |

### 1.14 Chức năng in phiếu cho bệnh nhân

| STT | Chức năng |
|-----|-----------|
| 1 | In phiếu khám bệnh |
| 2 | In phiếu khám bệnh theo yêu cầu |
| 3 | In phiếu giữ thẻ BHYT |
| 4 | In thẻ bệnh nhân |

### 1.15 Chức năng quản lý giấy tờ

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng giữ giấy tờ của người bệnh: thẻ BHYT, giấy chuyển viện, CMND/CCCD, giấy tờ khác |
| 2 | Chức năng trả giấy tờ của người bệnh |

### 1.16 Chức năng thu tiền khám bệnh
**Actor phụ**: Cán bộ thu ngân

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng thu tạm ứng (ký quỹ) |
| 2 | Chức năng tạm thu theo dịch vụ |
| 3 | Chức năng chọn dịch vụ khi thanh toán |
| 4 | Chức năng thanh toán cho bệnh nhân viện phí |

### 1.17 Tích hợp hệ thống thẻ thông minh để tiếp đón Bệnh nhân

| STT | Chức năng |
|-----|-----------|
| 1 | Tích hợp với hệ thống thẻ khám chữa bệnh thông minh, liên thông với cổng thông tin Bảo hiểm xã hội Việt Nam |

---

## 2. PHÂN HỆ QUẢN LÝ KHÁM BỆNH BÁC SĨ ĐIỀU DƯỠNG
**Actor chính**: Bác sĩ | **Actor phụ**: Điều dưỡng

### 2.1 Màn hình chờ phòng khám Bác sĩ Điều dưỡng

| STT | Chức năng |
|-----|-----------|
| 1 | Hiển thị danh sách bệnh nhân chờ khám |
| 2 | Hiển thị danh sách bệnh nhân chờ kết luận |
| 3 | Hiển thị bệnh nhân ưu tiên |
| 4 | Phát loa gọi bệnh nhân vào phòng khám |
| 5 | Hiển thị cảnh báo khi bệnh nhân được gọi |
| 6 | Tùy chọn bệnh nhân hiển thị vào màn hình chờ |
| 7 | Hiển thị tên bác sĩ đang khám |
| 8 | Hiển thị tên phòng khám |
| 9 | Tùy chọn màu sắc cho màn hình chờ |

### 2.2 Chức năng danh sách bệnh nhân của phòng khám

| STT | Chức năng |
|-----|-----------|
| 1 | Hiển thị ảnh chân dung bệnh nhân để đối chiếu |
| 2 | Hiển thị thông tin hành chính, thẻ BHYT của bệnh nhân |
| 3 | Hiển thị màu sắc để phân biệt bệnh nhân có thẻ BHYT |
| 4 | Hiển thị màu sắc để phân biệt bệnh nhân mãn tính |
| 5 | Hiển thị màu sắc để phân biệt bệnh nhân ưu tiên |
| 6 | Cảnh báo bệnh nhân chưa thanh toán tiền khám |
| 7 | Cảnh báo bệnh nhân nợ viện phí |
| 8 | Hiển thị trạng thái của yêu cầu khám: chờ xử lý, đang xử lý, đã kết thúc |
| 9 | Hiển thị trạng thái của dịch vụ cận lâm sàng của bệnh nhân để xác định bệnh nhân đang chờ kết luận |
| 10 | Xem kết quả cận lâm sàng của bệnh nhân |
| 11 | In kết quả cận lâm sàng |

### 2.3 Chức năng khám bệnh

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng xem hồ sơ bệnh án |
| 2 | Cảnh báo số lượt khám theo phòng, theo bác sĩ |
| 3 | Chức năng Hỏi bệnh |
| 4 | Chức năng khai báo dấu hiệu sinh tồn |
| 5 | Chức năng nhập các thông tin khám toàn thân, khám bộ phận |
| 6 | Chức năng lưu mẫu thông tin thăm khám |
| 7 | Chức năng xem lịch sử khám khi khám bệnh |
| 8 | Chức năng xem thông tin dịch vụ và chi phí khám chữa bệnh ở các đợt khám trước |
| 9 | Chức năng sao chép nội dung xử lý khám ở các đợt khám trước |
| 10 | Chức năng xem lịch sử dị ứng thuốc khi khám bệnh |
| 11 | Chức năng xem thông tin chống chỉ định của bệnh nhân |
| 12 | Chức năng xem thông tin khám của các phòng khám khác |
| 13 | Tạo tờ điều trị |
| 14 | Tạo biên bản hội chẩn |
| 15 | Nhập thông tin tai nạn thương tích |
| 16 | Tạo phiếu chăm sóc |

### 2.4 Chức năng nhập chẩn đoán khám bệnh

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng nhập chẩn đoán ban đầu |
| 2 | Chức năng nhập mã bệnh chính |
| 3 | Chức năng nhập chẩn đoán bệnh chính |
| 4 | Chức năng nhập mã bệnh phụ |
| 5 | Chức năng nhập chẩn đoán bệnh phụ |
| 6 | Chức năng nhập nguyên nhân ngoài |
| 7 | Chức năng tìm kiếm bệnh theo mã ICD 10 |
| 8 | Chức năng tìm kiếm bệnh theo tên bệnh |
| 9 | Chức năng sửa tên bệnh |

### 2.5 Chức năng xử lý khám thêm

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng đổi phòng khám |
| 2 | Chức năng khám thêm |
| 3 | Chức năng chuyển khám chính |
| 4 | Chức năng khám thêm kết hợp chuyển khoa |
| 5 | Chức năng nhập chẩn đoán khi khám thêm |
| 6 | Chức năng chọn đối tượng thanh toán cho dịch vụ khám thêm |
| 7 | Chức năng chọn phòng khám thêm |
| 8 | Chức năng in phiếu khám chuyên khoa |

### 2.6 Chức năng chỉ định dịch vụ

#### 2.6.1 Chẩn đoán khi chỉ định dịch vụ

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng lấy chẩn đoán từ hồ sơ vào màn hình chỉ định |
| 2 | Chức năng nhập mã bệnh chính |
| 3 | Chức năng nhập chẩn đoán bệnh chính |
| 4 | Chức năng nhập mã bệnh phụ |
| 5 | Chức năng nhập chẩn đoán bệnh phụ |
| 6 | Chức năng nhập nguyên nhân ngoài |
| 7 | Chức năng tìm kiếm bệnh theo mã ICD 10 |
| 8 | Chức năng tìm kiếm bệnh theo tên bệnh |
| 9 | Chức năng sửa tên bệnh |

#### 2.6.2 Chọn dịch vụ để chỉ định

| STT | Chức năng |
|-----|-----------|
| 1 | Tìm kiếm dịch vụ theo cây dịch vụ |
| 2 | Tìm kiếm dịch vụ theo mã dịch vụ |
| 3 | Tìm kiếm dịch vụ theo tên dịch vụ |
| 4 | Tìm kiếm dịch vụ theo mã tương đương |
| 5 | Chỉ định dịch vụ chẩn đoán hình ảnh |
| 6 | Chỉ định dịch vụ siêu âm |
| 7 | Chỉ định dịch vụ phẫu thuật thủ thuật |
| 8 | Chỉ định dịch vụ phẫu thuật theo điều kiện |
| 9 | Tư vấn giá phẫu thuật, gói phẫu thuật |
| 10 | Chỉ định dịch vụ xét nghiệm |
| 11 | Chỉ định dịch vụ nội soi |
| 12 | Chỉ định dịch vụ thăm dò chức năng |
| 13 | Chức năng tạo nhóm dịch vụ, chỉ định dịch vụ nhanh theo nhóm dịch vụ |
| 14 | Chức năng sao chép y lệnh cận lâm sàng cũ |
| 15 | Chức năng chỉ định dịch vụ theo gói |
| 16 | Chức năng thay đổi người chỉ định |
| 17 | Chức năng nhập người tư vấn dịch vụ |
| 18 | Chức năng tự động phân tải chọn phòng thực hiện dịch vụ |
| 19 | Chức năng tự chọn phòng thực hiện dịch vụ |
| 20 | Chức năng thay đổi đối tượng thanh toán cho dịch vụ |
| 21 | Chỉ định dịch vụ có phụ thu |
| 22 | Chức năng nhập nguồn chi trả cho dịch vụ |
| 23 | Chức năng xem tổng chi phí dịch vụ |
| 24 | Chức năng xem số tiền bệnh nhân còn dư để tư vấn |

#### 2.6.3 Chức năng cảnh báo và tiện ích khác

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng cảnh báo trùng dịch vụ đã chỉ định trong ngày |
| 2 | Chức năng cảnh báo bệnh nhân hết tiền tạm ứng viện phí |
| 3 | Cảnh báo 1 số lưu ý khi chỉ định 1 số dịch vụ theo TT35 |
| 4 | Chức năng cảnh báo thời gian tái sử dụng HBA1C theo TT35 |
| 5 | Chức năng cảnh báo vượt số tiền trong gói dịch vụ |
| 6 | Chức năng chỉ định dịch vụ theo phác đồ điều trị |
| 7 | Cảnh báo chỉ định ngoài phác đồ |
| 8 | Chức năng bổ sung thông tin vào phác đồ điều trị |
| 9 | Chức năng đánh dấu chỉ định ưu tiên |
| 10 | Chức năng đánh dấu chỉ định cấp cứu |
| 11 | Chức năng đánh dấu bệnh nhân nhận kết quả cận lâm sàng qua SMS |
| 12 | Chức năng nhập ghi chú cho phiếu yêu cầu |
| 13 | Chức năng nhập ghi chú cho từng dịch vụ |
| 14 | Chức năng sửa chỉ định dịch vụ |
| 15 | Chức năng xóa chỉ định dịch vụ |
| 16 | Chức năng in phiếu chỉ định |
| 17 | Chức năng in tách chỉ định theo đối tượng thanh toán |
| 18 | Chức năng in tách chỉ định theo nhóm cha |
| 19 | Chức năng in gộp chỉ định dịch vụ |
| 20 | Tính toán thời gian, đường đi ngắn nhất của BN khi thực hiện các dịch vụ CLS (theo tiêu chí TT54) |
| 21 | Chức năng thanh toán ngay khi chỉ định dịch vụ |

### 2.7 Chức năng kê đơn thuốc - vật tư - máu

#### 2.7.1 Chẩn đoán khi kê đơn

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng lấy chẩn đoán từ hồ sơ vào màn hình kê đơn |
| 2 | Chức năng nhập mã bệnh chính |
| 3 | Chức năng nhập chẩn đoán bệnh chính |
| 4 | Chức năng nhập mã bệnh phụ |
| 5 | Chức năng nhập chẩn đoán bệnh phụ |
| 6 | Chức năng nhập nguyên nhân ngoài |
| 7 | Chức năng tìm kiếm bệnh theo mã ICD 10 |
| 8 | Chức năng tìm kiếm bệnh theo tên bệnh |
| 9 | Chức năng sửa tên bệnh |

#### 2.7.2 Kê đơn

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng chọn kho xuất |
| 2 | Kê đơn từ tủ trực |
| 3 | Kê đơn y học cổ truyền |
| 4 | Kê thuốc theo thang thuốc |
| 5 | Tính số lượng vị thuốc theo số thang |
| 6 | Kê đơn theo số ngày |
| 7 | Tính số lượng thuốc theo số ngày đơn thuốc |
| 8 | Tìm kiếm thuốc theo tên |
| 9 | Tìm kiếm thuốc theo mã |
| 10 | Tìm kiếm thuốc theo hoạt chất |
| 11 | Xem thông tin chống chỉ định của thuốc |
| 12 | Xem số lượng thuốc tồn kho khi kê đơn |
| 13 | Tự động chọn lô thuốc để xuất theo điều kiện nhập trước xuất trước hoặc hết hạn sử dụng trước, xuất trước hoặc kết hợp cả hai |
| 14 | Xem thông tin chi tiết của thuốc (quốc gia, lô thuốc, hãng sản xuất) |
| 15 | Tự động tạo hướng dẫn sử dụng cho thuốc |
| 16 | Lưu hướng dẫn sử dụng thuốc theo từng tài khoản |
| 17 | Thay đổi đối tượng thanh toán khi kê đơn |

#### 2.7.3 Kê đơn nhà thuốc

| STT | Chức năng |
|-----|-----------|
| 1 | Kê đơn mua ngoài vào nhà thuốc Bệnh viện |
| 2 | Hiển thị màu sắc để phân biệt thuốc mua ngoài |
| 3 | Tự động lựa chọn kê đơn mua ngoài cho bệnh nhân viện phí |
| 4 | Tùy chọn kê đơn có trừ tồn nhà thuốc |
| 5 | Tự nhập thông tin thuốc vào đơn nếu không có trong danh mục nhà thuốc |
| 6 | Xem tồn kho của từng nhà thuốc |
| 7 | Xem tồn kho của tất cả nhà thuốc |
| 8 | In đơn thuốc mua ngoài |

#### 2.7.4 Hỗ trợ kê đơn nhanh

| STT | Chức năng |
|-----|-----------|
| 1 | Kê đơn thuốc theo mẫu |
| 2 | Lưu mẫu đơn thuốc |
| 3 | Chia sẻ đơn thuốc mẫu |
| 4 | Sao chép đơn thuốc cũ |
| 5 | Kê đơn theo phác đồ |
| 6 | Bổ sung thông tin vào phác đồ |
| 7 | Chức năng nhập lời dặn cho đơn thuốc |
| 8 | Tạo thư viện lời dặn để nhập nhanh lời dặn |

#### 2.7.5 Cảnh báo thông minh và tiện ích khác khi kê đơn

| STT | Chức năng |
|-----|-----------|
| 1 | Cảnh báo kê đơn ngoài phác đồ |
| 2 | Chức năng cảnh báo trùng thuốc đã kê trong ngày |
| 3 | Chức năng cảnh báo tương tác thuốc |
| 4 | Tương tác thuốc theo cấp độ, màu sắc |
| 5 | Chức năng cảnh báo số ngày đơn thuốc với hạn thẻ BHYT |
| 6 | Chức năng cảnh báo số tiền trong đơn thuốc vượt quá trần BHYT |
| 7 | Chức năng áp trần đơn thuốc theo từng đối tượng: đúng tuyến đúng CSKCB, đúng tuyến giới thiệu |
| 8 | Chức năng mở khóa trần cho từng bệnh nhân |
| 9 | Chức năng cảnh báo tiền thuốc vượt quá chi phí gói |
| 10 | Chức năng xem thông tin viện phí của bệnh nhân để tư vấn đơn thuốc |

#### 2.7.6 In ấn trong khi kê đơn thuốc

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng in đơn thuốc |
| 2 | Chức năng thiết lập số bản in tự động khi in đơn thuốc cho bệnh nhân BHYT, viện phí |
| 3 | In đơn thuốc y học cổ truyền |
| 4 | In đơn thuốc nhà thuốc |
| 5 | In đơn nhà thuốc tách theo thực phẩm chức năng, dinh dưỡng, mỹ phẩm |
| 6 | In gộp đơn thuốc BHYT và đơn thuốc nhà thuốc |
| 7 | In gộp đơn thuốc nhiều phòng khám |
| 8 | In gộp đơn thuốc nhiều kho |
| 9 | Kết thúc điều trị kết hợp kê đơn |
| 10 | In bảng kê thanh toán cùng đơn thuốc |
| 11 | In giấy hẹn khám cùng đơn thuốc |
| 12 | In giấy ra viện cùng đơn thuốc |
| 13 | In phiếu nghỉ hưởng BHXH cùng đơn thuốc |
| 14 | In bệnh án ngoại trú cùng đơn thuốc |

### 2.8 Chức năng kết luận khám bệnh

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng kết thúc khám: Cấp đơn cho về, cho về, Nhập viện, Chuyển viện, Tử vong, Hẹn khám mới, Hẹn khám tiếp, Khác... |
| 2 | Chức năng chuyển nhập viện |
| 3 | Chức năng kết thúc điều trị |
| 4 | In bảng kê thanh toán ra viện theo mẫu biểu 6556/QĐ-BYT |
| 5 | In phiếu khám bệnh vào viện |
| 6 | In phiếu chuyển tuyến |
| 7 | In giấy hẹn khám |
| 8 | In phiếu nghỉ hưởng BHXH |
| 9 | In bệnh án ngoại trú |
| 10 | In phiếu tổng kết kết quả cận lâm sàng |
| 11 | In bệnh án cấp cứu |
| 12 | In bệnh án ngoại trú khác |
| 13 | In công khai dịch vụ khám chữa bệnh |

### 2.9 Quản lý khám bệnh

| STT | Chức năng |
|-----|-----------|
| 1 | Hạch toán doanh thu khoa phòng |
| 2 | Báo cáo khám bệnh theo quyết định 4069/2001/QĐ-BYT |
| 3 | Báo cáo doanh thu khoa, phòng |
| 4 | Các mẫu biểu báo cáo khác của phân hệ khám bệnh: Sổ khám bệnh, báo cáo hoạt động khám bệnh, báo cáo cận lâm sàng, báo cáo tai nạn thương tích |
| 5 | Tính toán thời gian trung bình chờ tiếp đón, chờ khám của 1 BN (theo 83 tiêu chí chấm điểm BV) |
| 6 | Tính toán thời gian trung bình trả kết quả cận lâm sàng: Xét nghiệm, Xquang, Siêu âm... (theo 83 tiêu chí chấm điểm BV) |
| 7 | Tính toán tỷ lệ % trả kết quả đúng hẹn (theo 83 tiêu chí chấm điểm BV) |
| 8 | Tính toán tỷ lệ % trả kết quả không đúng hẹn (theo 83 tiêu chí chấm điểm BV) |
| 9 | Sẵn sàng tích hợp hệ thống Hồ sơ sức khỏe để xem lịch sử khám chữa bệnh của bệnh nhân |
| 10 | Sẵn sàng tích hợp hệ thống Thẻ khám bệnh thông minh để xem lịch sử khám chữa bệnh của bệnh nhân |

---

## 3. QUẢN LÝ ĐIỀU TRỊ NỘI TRÚ
**Actor chính**: Bác sĩ | **Actor phụ**: Điều dưỡng

### 3.1 Màn hình chờ buồng bệnh

| STT | Chức năng |
|-----|-----------|
| 1 | Hiển thị sơ đồ buồng bệnh |
| 2 | Hiển thị số giường, bệnh nhân đang sử dụng |
| 3 | Hiển thị thông tin nằm ghép |
| 4 | Hiển thị màu sắc hiển thị cho sơ đồ buồng bệnh |

### 3.2 Quản lý bệnh nhân

| STT | Chức năng |
|-----|-----------|
| 1 | Tiếp nhận bệnh nhân từ phòng khám |
| 2 | Tiếp nhận bệnh nhân từ khoa khác chuyển sang |
| 3 | Tiếp nhận điều trị kết hợp |
| 4 | Chuyển khoa cho bệnh nhân sang khoa khác điều trị |
| 5 | Chuyển điều trị kết hợp |
| 6 | Gửi khám kết hợp |
| 7 | Chuyển mổ phiên |
| 8 | Chuyển mổ cấp cứu |
| 9 | Bổ sung thẻ BHYT |
| 10 | Tự động kiểm tra thông tuyến thẻ BHYT |
| 11 | Tự động chuyển sang viện phí khi thẻ BHYT hết hạn |
| 12 | Danh sách bệnh nhân trong buồng |
| 13 | Màu sắc hiển thị phân biệt bệnh nhân có BHYT |
| 14 | Xem thông tin y lệnh của bệnh nhân theo từng ngày |
| 15 | Xem kết quả cận lâm sàng của bệnh nhân |
| 16 | In kết quả xét nghiệm tại khoa điều trị |
| 17 | In phiếu phẫu thuật thủ thuật |
| 18 | Chức năng xem tình hình viện phí chung toàn khoa lâm sàng |
| 19 | Tạo phiếu yêu cầu tạm ứng |
| 20 | Cảnh báo bệnh nhân chưa lĩnh hết thuốc khi chuyển khoa |
| 21 | Cảnh báo dịch vụ cận lâm sàng chưa có kết quả khi chuyển khoa |

### 3.3 Chức năng chỉ định dịch vụ (Nội trú)

#### 3.3.1 Chẩn đoán khi chỉ định dịch vụ
*(Tương tự mục 2.6.1 - 9 chức năng)*

#### 3.3.2 Chọn dịch vụ để chỉ định
*(Tương tự mục 2.6.2 - 24 chức năng)*

#### 3.3.3 Chức năng cảnh báo và tiện ích khác
*(Tương tự mục 2.6.3 - 21 chức năng)*

### 3.4 Chức năng kê đơn thuốc - vật tư - máu (Nội trú)

#### 3.4.1 Chẩn đoán khi kê đơn
*(Tương tự mục 2.7.1 - 9 chức năng)*

#### 3.4.2 Kê đơn

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng chọn kho xuất |
| 2 | Kê đơn từ tủ trực |
| 3 | Kê đơn y học cổ truyền |
| 4 | Kê thuốc theo thang thuốc |
| 5 | Tính số lượng vị thuốc theo số thang |
| 6 | Kê đơn theo số ngày |
| 7 | Tính số lượng thuốc theo số ngày đơn thuốc |
| 8 | Tìm kiếm thuốc theo tên |
| 9 | Tìm kiếm thuốc theo mã |
| 10 | Tìm kiếm thuốc theo hoạt chất |
| 11 | Xem thông tin chống chỉ định của thuốc |
| 12 | Xem số lượng thuốc tồn kho khi kê đơn |
| 13 | Xem thông tin hạn sử dụng |
| 14 | Xem thông tin chi tiết của thuốc (quốc gia, lô thuốc, hãng sản xuất) |
| 15 | Tự động tạo hướng dẫn sử dụng cho thuốc |
| 16 | Lưu hướng dẫn sử dụng thuốc theo từng tài khoản |
| 17 | Thay đổi đối tượng thanh toán khi kê đơn |

#### 3.4.3 Kê đơn nhà thuốc
*(Tương tự mục 2.7.3 - 8 chức năng)*

#### 3.4.4 Hỗ trợ kê đơn nhanh
*(Tương tự mục 2.7.4 - 8 chức năng)*

#### 3.4.5 Cảnh báo thông minh và tiện ích khác khi kê đơn

| STT | Chức năng |
|-----|-----------|
| 1 | Cảnh báo kê đơn ngoài phác đồ |
| 2 | Chức năng cảnh báo trùng thuốc đã kê trong ngày |
| 3 | Chức năng cảnh báo tương tác thuốc |
| 4 | Tương tác thuốc theo cấp độ, màu sắc |
| 5 | Chức năng cảnh báo thuốc trùng nhóm kháng sinh |
| 6 | Chức năng cảnh báo số ngày đơn thuốc với hạn thẻ BHYT |
| 7 | Chức năng cảnh báo số tiền trong đơn thuốc vượt quá trần BHYT |
| 8 | Chức năng áp trần đơn thuốc theo từng đối tượng: đúng tuyến đúng CSKCB, đúng tuyến giới thiệu |
| 9 | Chức năng mở khóa trần cho từng bệnh nhân |
| 10 | Chức năng cảnh báo tiền thuốc vượt quá chi phí gói |
| 11 | Chức năng xem thông tin viện phí của bệnh nhân để tư vấn đơn thuốc |

#### 3.4.6 Tổng hợp đơn thuốc

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng tổng hợp đơn thuốc thành phiếu tổng hợp y lệnh thuốc |
| 2 | Chức năng tổng hợp đơn vật tư thành phiếu tổng hợp y lệnh vật tư |
| 3 | Chức năng tự động tách phiếu tổng hợp theo kho |
| 4 | Chức năng tùy chọn tổng hợp theo buồng |
| 5 | In phiếu tra đối thuốc |
| 6 | In phiếu phát thuốc cho bệnh nhân trong phiếu lĩnh |
| 7 | In phiếu tổng hợp y lệnh thuốc |
| 8 | In phiếu tổng hợp y lệnh vật tư |

### 3.5 Chỉ định dinh dưỡng

| STT | Chức năng |
|-----|-----------|
| 1 | Chỉ định suất ăn theo món ăn |
| 2 | Chỉ định suất ăn theo buổi |
| 3 | Chỉ định suất ăn theo mức dinh dưỡng |
| 4 | Tổng hợp suất ăn |
| 5 | In phiếu tổng hợp suất ăn |

### 3.6 Thông tin điều trị

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng thăm khám |
| 2 | Chức năng mời khám chuyên khoa |
| 3 | Chức năng quản lý danh sách khám chuyên khoa |
| 4 | Chức năng xem Hồ sơ bệnh án |
| 5 | Chức năng quản lý hồ sơ trẻ sơ sinh và sản phụ |
| 6 | Chức năng xem lịch sử điều trị |
| 7 | Tạo tờ điều trị |
| 8 | Số hóa vỏ bệnh án |
| 9 | In vỏ bệnh án |
| 10 | Tạo tờ điều trị mẫu |
| 11 | Sao chép tờ điều trị |
| 12 | In tờ điều trị |
| 13 | In gộp tờ điều trị nhiều ngày |
| 14 | Khai báo thông tin dấu hiệu sinh tồn |
| 15 | In phiếu theo dõi thông tin sinh tồn |
| 16 | Biểu đồ hiển thị diễn biến sinh tồn |
| 17 | Chức năng mời hội chẩn |
| 18 | Chức năng quản lý danh sách mời hội chẩn |
| 19 | Chức năng hội chẩn thuốc dấu * |
| 20 | Chức năng hội chẩn phẫu thuật thủ thuật |
| 21 | In biên bản hội chẩn |
| 22 | Chức năng chăm sóc |
| 23 | In phiếu chăm sóc |
| 24 | In gộp chăm sóc nhiều ngày |
| 25 | Chức năng truyền dịch |
| 26 | In phiếu truyền dịch |
| 27 | Tự động tính thời gian kết thúc truyền dịch |
| 28 | Chức năng truyền máu |
| 29 | In phiếu truyền máu |
| 30 | Chức năng phản ứng thuốc |
| 31 | In phiếu phản ứng thuốc |
| 32 | Chức năng tai nạn thương tích |

### 3.7 Kết thúc điều trị

| STT | Chức năng |
|-----|-----------|
| 1 | Kiểm tra thông tuyến thẻ BHYT |
| 2 | Chức năng kết thúc điều trị: Ra viện, Trốn viện, Chuyển khoa, Chuyển viện, Tử vong, Khác |
| 3 | In giấy ra viện (lấy được cả thông tin PTTT như phương pháp PT..., thông tin nghỉ ốm (nhập số ngày được nghỉ, tính bắt đầu từ ngày ra viện +1)) |
| 4 | In giấy chuyển tuyến |
| 5 | In phiếu công khai dịch vụ kỹ thuật |
| 6 | In phiếu công khai thuốc (Mẫu 11D/BV-01/TT23) |
| 7 | In bảng kê thanh toán theo mẫu 6556 |
| 8 | In bảng kê thanh toán theo mẫu 6556 cho từng đối tượng bệnh nhân |
| 9 | In bảng kê thanh toán theo mẫu 6556 cho từng khoa lâm sàng |

### 3.8 Quản lý
**Actor phụ**: Kế hoạch tổng hợp

| STT | Chức năng |
|-----|-----------|
| 1 | Hạch toán doanh thu khoa phòng |
| 2 | Báo cáo sổ theo quyết định 4069/2001/QĐ-BYT |
| 3 | Báo cáo doanh thu khoa, phòng |
| 4 | Báo cáo hoạt động điều trị |
| 5 | Báo cáo thống kê thuốc, vật tư sử dụng |
| 6 | Các mẫu biểu báo cáo khác của phân hệ lâm sàng |
| 7 | Sẵn sàng tích hợp hệ thống Hồ sơ sức khỏe để xem lịch sử khám chữa bệnh của bệnh nhân |
| 8 | Sẵn sàng tích hợp hệ thống Thẻ khám bệnh thông minh để xem lịch sử khám chữa bệnh của bệnh nhân |

---

## 4. QUẢN LÝ CHỈ ĐỊNH LÂM SÀNG, CẬN LÂM SÀNG
**Actor chính**: Bác sĩ

### 4.1 Chẩn đoán khi chỉ định dịch vụ

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng lấy chẩn đoán từ hồ sơ vào màn hình chỉ định |
| 2 | Chức năng nhập mã bệnh chính |
| 3 | Chức năng nhập chẩn đoán bệnh chính |
| 4 | Chức năng nhập mã bệnh phụ |
| 5 | Chức năng nhập chẩn đoán bệnh phụ |
| 6 | Chức năng nhập nguyên nhân ngoài |
| 7 | Chức năng tìm kiếm bệnh theo mã ICD 10 |
| 8 | Chức năng tìm kiếm bệnh theo tên bệnh |
| 9 | Chức năng sửa tên bệnh |

### 4.2 Chọn dịch vụ để chỉ định

| STT | Chức năng |
|-----|-----------|
| 1 | Tìm kiếm dịch vụ theo cây dịch vụ |
| 2 | Tìm kiếm dịch vụ theo mã dịch vụ |
| 3 | Tìm kiếm dịch vụ theo tên dịch vụ |
| 4 | Tìm kiếm dịch vụ theo mã tương đương |
| 5 | Chỉ định dịch vụ chẩn đoán hình ảnh |
| 6 | Chỉ định dịch vụ siêu âm |
| 7 | Chỉ định dịch vụ phẫu thuật thủ thuật |
| 8 | Chỉ định dịch vụ phẫu thuật theo điều kiện |
| 9 | Tư vấn giá phẫu thuật, gói phẫu thuật |
| 10 | Chỉ định dịch vụ xét nghiệm |
| 11 | Chỉ định dịch vụ nội soi |
| 12 | Chỉ định dịch vụ thăm dò chức năng |
| 13 | Chức năng tạo nhóm dịch vụ, chỉ định dịch vụ nhanh theo nhóm dịch vụ |
| 14 | Chức năng sao chép y lệnh cận lâm sàng cũ |
| 15 | Chức năng chỉ định dịch vụ theo gói |
| 16 | Chức năng thay đổi người chỉ định |
| 17 | Chức năng nhập người tư vấn dịch vụ |
| 18 | Chức năng tự động phân tải chọn phòng thực hiện dịch vụ |
| 19 | Chức năng tự chọn phòng thực hiện dịch vụ |
| 20 | Chức năng thay đổi đối tượng thanh toán cho dịch vụ |
| 21 | Chỉ định dịch vụ có phụ thu |
| 22 | Chức năng nhập nguồn chi trả cho dịch vụ |
| 23 | Chức năng xem tổng chi phí dịch vụ |
| 24 | Chức năng xem số tiền bệnh nhân còn dư để tư vấn |

### 4.3 Chức năng cảnh báo và tiện ích khác

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng cảnh báo trùng dịch vụ đã chỉ định trong ngày |
| 2 | Chức năng cảnh báo bệnh nhân hết tiền tạm ứng viện phí |
| 3 | Cảnh báo 1 số lưu ý khi chỉ định 1 số dịch vụ theo TT35 |
| 4 | Chức năng cảnh báo thời gian tái sử dụng HBA1C theo TT35 |
| 5 | Chức năng cảnh báo vượt số tiền trong gói dịch vụ |
| 6 | Chức năng chỉ định dịch vụ theo phác đồ điều trị |
| 7 | Cảnh báo chỉ định ngoài phác đồ |
| 8 | Chức năng bổ sung thông tin vào phác đồ điều trị |
| 9 | Chức năng đánh dấu chỉ định ưu tiên |
| 10 | Chức năng đánh dấu chỉ định cấp cứu |
| 11 | Chức năng đánh dấu bệnh nhân nhận kết quả cận lâm sàng qua SMS |
| 12 | Chức năng nhập ghi chú cho phiếu yêu cầu |
| 13 | Chức năng nhập ghi chú cho từng dịch vụ |
| 14 | Chức năng sửa chỉ định dịch vụ |
| 15 | Chức năng xóa chỉ định dịch vụ |
| 16 | Chức năng in phiếu chỉ định |
| 17 | Chức năng in tách chỉ định theo đối tượng thanh toán |
| 18 | Chức năng in tách chỉ định theo nhóm cha |
| 19 | Chức năng in gộp chỉ định dịch vụ |
---

## 5. PHÂN HỆ KHO DƯỢC - VẬT TƯ
**Actor chính**: Cán bộ Quản lý kho

### 5.1 Nhập kho

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Chức năng nhập nhà cung cấp | Nhập thuốc/vật tư từ NCC theo hóa đơn, hợp đồng thầu |
| 2 | Quản lý thanh toán hóa đơn nhập nhà cung cấp | Theo dõi công nợ, thanh toán với NCC |
| 3 | Chức năng nhập từ các nguồn | Nhập từ nguồn viện trợ, tài trợ, chương trình mục tiêu |
| 4 | Chức năng nhập chuyển kho | Nhập từ kho khác chuyển sang |
| 5 | Chức năng nhập hoàn trả Khoa/phòng | Nhập thuốc/VT khoa phòng trả lại (không sử dụng hết) |
| 6 | Chức năng nhập hoàn trả Kho | Nhập thuốc/VT từ kho con trả về kho chính |
| 7 | Chức năng nhập kiểm kê | Nhập điều chỉnh tăng sau kiểm kê |
| 8 | In phiếu nhập nhà cung cấp | In phiếu nhập kho theo mẫu quy định |
| 9 | In biên bản kiểm nhập | In biên bản kiểm nhập thuốc/VT |

### 5.2 Xuất kho

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Chức năng tự động ưu tiên nhập trước xuất trước, hết hạn sử dụng trước thì xuất trước | FIFO/FEFO tự động |
| 2 | Xuất đơn thuốc ngoại trú | Xuất theo đơn thuốc BN ngoại trú |
| 3 | Xuất phiếu lĩnh nội trú | Xuất theo phiếu tổng hợp y lệnh khoa |
| 4 | Chức năng xuất khoa/phòng | Xuất cấp phát cho khoa phòng theo định mức |
| 5 | Chức năng xuất chuyển kho | Xuất chuyển sang kho khác |
| 6 | Chức năng xuất trả nhà cung cấp | Xuất trả NCC (thuốc lỗi, hết hạn...) |
| 7 | Chức năng xuất ngoại viện | Xuất cho cơ sở y tế khác |
| 8 | Chức năng xuất hủy, hỏng vỡ | Xuất hủy thuốc/VT hết hạn, hỏng |
| 9 | Chức năng xuất kiểm nghiệm | Xuất mẫu kiểm nghiệm chất lượng |
| 10 | Chức năng xuất kiểm kê | Xuất điều chỉnh giảm sau kiểm kê |
| 11 | Chức năng xuất thanh lý | Xuất thanh lý tài sản |
| 12 | Xuất bán đơn thuốc theo đơn phòng khám | Nhà thuốc bán theo đơn BS kê |
| 13 | Xuất bán đơn thuốc cho bệnh nhân tự do | Nhà thuốc bán lẻ không cần đơn |

### 5.3 Chức năng in phiếu

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | In đơn xuất bán | In hóa đơn bán thuốc nhà thuốc |
| 2 | In hướng dẫn sử dụng cho đơn xuất bán | In nhãn HDSD kèm theo |
| 3 | In đơn thuốc ngoại trú | In đơn thuốc cho BN ngoại trú |
| 4 | In phiếu lĩnh nội trú | In phiếu tổng hợp y lệnh |
| 5 | In phiếu xuất | In phiếu xuất kho chung |
| 6 | In phiếu xuất tách gây nghiện, hướng thần | In riêng theo quy định thuốc GN/HT |
| 7 | In phiếu xuất tách thuốc độc | In riêng theo quy định thuốc độc |
| 8 | In phiếu xuất chuyển kho | In phiếu điều chuyển nội bộ |

### 5.4 Tồn kho

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Tạo dự trù | Lập kế hoạch mua sắm thuốc/VT |
| 2 | Tự động dự trù theo số lượng xuất cùng kỳ | Gợi ý số lượng dựa trên lịch sử tiêu thụ |
| 3 | Quản lý đấu thầu thuốc, vật tư | Theo dõi kết quả thầu, số lượng trúng thầu |
| 4 | Quản lý tồn kho | Xem tồn theo kho/lô/hạn dùng |
| 5 | Cảnh báo tồn kho | Cảnh báo tồn tối thiểu/tối đa |
| 6 | Quản lý tồn kho theo hạn sử dụng | Phân loại theo thời hạn còn lại |
| 7 | Cảnh báo thuốc sắp hết hạn sử dụng | Cảnh báo 3/6/12 tháng trước khi hết hạn |
| 8 | Quản lý lô thuốc | Theo dõi từng lô nhập |
| 9 | Duyệt đơn thuốc ngoại trú không lĩnh | Thu hồi đơn BN không đến lĩnh |
| 10 | Quản lý kỳ kiểm kê: chốt kỳ, hủy kỳ | Quản lý chu kỳ kiểm kê định kỳ |
| 11 | In phiếu dự trù | In phiếu đề xuất mua sắm |
| 12 | In biên bản kiểm kê | In biên bản kiểm kê theo mẫu |
| 13 | In thẻ kho | In thẻ kho theo dõi NXT |
| 14 | In báo cáo nhập xuất tồn | Báo cáo NXT theo kỳ |
| 15 | In báo cáo thống kê xuất khoa phòng | Thống kê tiêu thụ theo khoa |

### 5.5 Quản lý

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Quản lý vật tư tái sử dụng | Theo dõi VT tiệt khuẩn tái sử dụng |
| 2 | Quản lý kho ký gửi | Quản lý thuốc/VT ký gửi của NCC |
| 3 | Quản lý thuốc kê theo IU | Quy đổi đơn vị IU cho insulin... |
| 4 | Quản lý thuốc, vật tư kê lẻ | Xuất lẻ từ hộp/vỉ |
| 5 | Quản lý kho lẻ | Quản lý kho xuất lẻ riêng |
| 6 | Báo cáo quản lý kho | Các báo cáo quản trị kho |
| 7 | Tính giá lợi nhuận tự động cho nhà thuốc | Tự động tính giá bán theo % lợi nhuận |
| 8 | Sẵn sàng tích hợp hóa đơn điện tử cho nhà thuốc | Kết nối hệ thống e-invoice |

---

## 6. PHÂN HỆ PHẪU THUẬT THỦ THUẬT
**Actor chính**: Bác sĩ | **Actor phụ**: Điều dưỡng

### 6.1 Quản lý PTTT

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Duyệt mổ | Duyệt yêu cầu mổ từ khoa lâm sàng |
| 2 | Lên lịch mổ | Sắp xếp lịch mổ theo phòng mổ, ekip |
| 3 | Tiếp nhận bệnh nhân chuyển mổ | Tiếp nhận BN từ khoa điều trị |
| 4 | Danh sách bệnh nhân thực hiện PTTT | Quản lý DS BN theo ngày/phòng mổ |
| 5 | Trạng thái phân biệt PTTT chờ thực hiện, đang thực hiện, đã hoàn thành | Màu sắc phân biệt trạng thái |
| 6 | Báo cáo thống kê PTTT | Báo cáo số ca mổ theo loại/khoa/BS |
| 7 | Chức năng khai báo tiền công tham gia PTTT | Nhập tiền công ekip mổ |
| 8 | Tính toán lợi nhuận phẫu thuật thủ thuật | Doanh thu - Chi phí = Lợi nhuận |
| 9 | Tính công phẫu thuật, thủ thuật theo QĐ 73 cho ekip tham gia phẫu thuật | Phân chia tiền công theo vai trò trong ekip |
| 10 | Tính toán chi phí cuộc mổ có thay ekip mổ, không thay ekip mổ (Thông tư 37) | Tính giá theo quy định TT37 |
| 11 | Quản lý định mức thuốc gói phẫu thuật thủ thuật | Định mức thuốc theo loại PTTT |
| 12 | Quản lý định mức vật tư gói phẫu thuật thủ thuật | Định mức VT theo loại PTTT |

### 6.2 Màn hình chờ phòng mổ

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Hiển thị danh sách bệnh nhân chờ PTTT | DS BN xếp hàng chờ mổ |
| 2 | Hiển thị kỹ thuật mổ, thời gian mổ | Thông tin ca mổ dự kiến |

### 6.3 Thực hiện PTTT

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Chức năng nhập chẩn đoán trước mổ | Nhập chẩn đoán trước phẫu thuật |
| 2 | Chức năng nhập chẩn đoán sau mổ | Nhập chẩn đoán sau phẫu thuật |
| 3 | Chức năng nhập thông tin PTTT (kỹ thuật mổ, phương pháp gây mê, ...) | Nhập chi tiết kỹ thuật mổ |
| 4 | Nhập thông tin mô tả | Mô tả diễn biến ca mổ |
| 5 | Nhập thông tin kết luận | Kết luận sau mổ |
| 6 | Nhập thông tin thời gian thực hiện | Giờ bắt đầu, kết thúc, thời gian mổ |
| 7 | Khai báo thông tin phẫu thuật, thủ thuật theo TT50 | BS gây mê, phụ mê, phương pháp vô cảm, PP PT... |
| 8 | In phiếu chứng nhận PTTT | In giấy chứng nhận đã PT |
| 9 | In giải trình phẫu thuật thủ thuật | In tường trình PT |
| 10 | In thông tin hành chính các biểu mẫu | Bảng kiểm an toàn, phiếu PTTT, phiếu XN giải phẫu bệnh sinh thiết, trích biên bản hội chẩn PT, biên bản hội chẩn PT, bảng kiểm chuẩn bị BN trước PT, bảng câu hỏi tiền phẫu, phiếu GMHS, phiếu theo dõi bệnh nhân chăm sóc cấp I sau phẫu thuật |
| 11 | In phiếu thực hiện và công khai thuốc (in theo tờ điều trị) | In chi tiết thuốc/VT sử dụng |
| 12 | Liên thông XML 4210 bảng 5 về thông tin PHAU_THUAT | Xuất dữ liệu XML cho BHXH |

### 6.4 Chỉ định dịch vụ trong PTTT

#### 6.4.1 Chẩn đoán khi chỉ định dịch vụ

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Chức năng lấy chẩn đoán từ y lệnh vào màn hình xử lý PTTT | Đồng bộ chẩn đoán từ khoa LS |
| 2 | Chức năng nhập chẩn đoán trước phẫu thuật | Nhập CĐ trước mổ |
| 3 | Chức năng nhập mã bệnh chính | Nhập mã ICD-10 chính |
| 4 | Chức năng nhập chẩn đoán bệnh chính | Nhập tên bệnh chính |
| 5 | Chức năng nhập mã bệnh phụ | Nhập mã ICD-10 phụ |
| 6 | Chức năng nhập chẩn đoán bệnh phụ | Nhập tên bệnh phụ |
| 7 | Chức năng nhập chẩn đoán sau phẫu thuật | Nhập CĐ sau mổ |
| 8 | Chức năng tìm kiếm bệnh theo mã ICD 10 | Tìm theo mã |
| 9 | Chức năng tìm kiếm bệnh theo tên bệnh | Tìm theo tên |
| 10 | Chức năng sửa tên bệnh | Chỉnh sửa tên bệnh |

#### 6.4.2 Chọn dịch vụ để chỉ định

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Tìm kiếm dịch vụ theo cây dịch vụ | Chọn từ danh mục cây |
| 2 | Tìm kiếm dịch vụ theo mã dịch vụ | Tìm theo mã DV |
| 3 | Tìm kiếm dịch vụ theo tên dịch vụ | Tìm theo tên DV |
| 4 | Tìm kiếm dịch vụ theo mã tương đương | Tìm theo mã BYT |
| 5 | Chỉ định dịch vụ chẩn đoán hình ảnh | Chỉ định CĐHA trong mổ |
| 6 | Chỉ định dịch vụ siêu âm | Chỉ định siêu âm trong mổ |
| 7 | Chỉ định dịch vụ phẫu thuật thủ thuật cùng ekip thực hiện theo TT37 | PTTT cùng ekip - tính 1 lần công |
| 8 | Chỉ định dịch vụ phẫu thuật thủ thuật khác ekip thực hiện theo TT37 | PTTT khác ekip - tính riêng công |
| 9 | Chỉ định dịch vụ phẫu thuật thủ thuật ngoài ekip | PTTT do đội khác thực hiện |
| 10 | Chỉ định dịch vụ phẫu thuật theo điều kiện | PTTT có điều kiện đi kèm |
| 11 | Tư vấn giá phẫu thuật, gói phẫu thuật | Báo giá cho BN trước mổ |
| 12 | Chỉ định dịch vụ xét nghiệm | Chỉ định XN trong/sau mổ |
| 13 | Chỉ định dịch vụ nội soi | Chỉ định nội soi |
| 14 | Chỉ định dịch vụ thăm dò chức năng | Chỉ định TDCN |
| 15 | Chức năng tạo nhóm dịch vụ, chỉ định dịch vụ nhanh theo nhóm dịch vụ | Gom nhóm DV thường dùng |
| 16 | Chức năng sao chép y lệnh cận lâm sàng cũ | Copy từ lần trước |
| 17 | Chức năng chỉ định dịch vụ theo gói | Chỉ định theo gói PTTT |
| 18 | Chức năng thay đổi người chỉ định | Đổi BS chỉ định |
| 19 | Chức năng nhập người tư vấn dịch vụ | Ghi nhận BS tư vấn |
| 20 | Chức năng tự động phân tải chọn phòng thực hiện dịch vụ | Tự động chọn phòng |
| 21 | Chức năng tự chọn phòng thực hiện dịch vụ | Chọn phòng thủ công |
| 22 | Chức năng thay đổi đối tượng thanh toán cho dịch vụ | Đổi BHYT/VP/DV |
| 23 | Chỉ định dịch vụ có phụ thu | DV có phụ thu thêm |
| 24 | Chức năng nhập nguồn chi trả cho dịch vụ | Chọn nguồn chi trả |
| 25 | Chức năng xem tổng chi phí dịch vụ | Xem tổng tiền |
| 26 | Chức năng xem số tiền bệnh nhân còn dư để tư vấn | Xem số dư tạm ứng |

#### 6.4.3 Chức năng cảnh báo và tiện ích khác

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Chức năng cảnh báo trùng dịch vụ đã chỉ định trong ngày | Cảnh báo trùng DV |
| 2 | Chức năng cảnh báo bệnh nhân hết tiền tạm ứng viện phí | Cảnh báo hết tiền |
| 3 | Cảnh báo 1 số lưu ý khi chỉ định 1 số dịch vụ theo TT35 | Cảnh báo theo quy định |
| 4 | Chức năng cảnh báo thời gian tái sử dụng HBA1C theo TT35 | Cảnh báo XN HbA1c |
| 5 | Chức năng cảnh báo vượt số tiền trong gói dịch vụ | Cảnh báo vượt gói |
| 6 | Chức năng chỉ định dịch vụ theo phác đồ điều trị | Chỉ định theo phác đồ |
| 7 | Cảnh báo chỉ định ngoài phác đồ | Cảnh báo ngoài phác đồ |
| 8 | Chức năng bổ sung thông tin vào phác đồ điều trị | Cập nhật phác đồ |
| 9 | Chức năng đánh dấu chỉ định ưu tiên | Đánh dấu ưu tiên |
| 10 | Chức năng đánh dấu chỉ định cấp cứu | Đánh dấu cấp cứu |
| 11 | Chức năng đánh dấu bệnh nhân nhận kết quả cận lâm sàng qua SMS | Gửi KQ qua SMS |
| 12 | Chức năng nhập ghi chú cho phiếu yêu cầu | Nhập ghi chú phiếu |
| 13 | Chức năng nhập ghi chú cho từng dịch vụ | Nhập ghi chú từng DV |
| 14 | Chức năng sửa chỉ định dịch vụ | Sửa chỉ định |
| 15 | Chức năng xóa chỉ định dịch vụ | Xóa chỉ định |
| 16 | Chức năng in phiếu chỉ định | In phiếu CĐ |
| 17 | Chức năng in tách chỉ định theo đối tượng thanh toán | In tách theo đối tượng |
| 18 | Chức năng in tách chỉ định theo nhóm cha | In tách theo nhóm |
| 19 | Chức năng in gộp chỉ định dịch vụ | In gộp nhiều CĐ |

### 6.5 Kê thuốc, vật tư trong PTTT

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Tạo thuốc, vật tư đi kèm gói phẫu thuật thủ thuật | Kê thuốc/VT trong gói |
| 2 | Tạo thuốc, vật tư ngoài gói phẫu thuật thủ thuật | Kê thuốc/VT ngoài gói |
| 3 | Cảnh báo tiền thuốc, vật tư vượt quá gói PTTT | Cảnh báo vượt định mức |
| 4 | Chức năng nhập chẩn đoán bệnh chính | Nhập CĐ chính |
| 5 | Chức năng nhập chẩn đoán bệnh phụ | Nhập CĐ phụ |
| 6 | Chức năng nhập nguyên nhân ngoài | Nhập nguyên nhân |
| 7 | Chức năng chọn kho xuất | Chọn kho phát thuốc/VT |
| 8 | Kê đơn từ tủ trực | Kê từ tủ trực phòng mổ |
| 9 | Tìm kiếm thuốc theo tên | Tìm theo tên |
| 10 | Tìm kiếm thuốc theo mã | Tìm theo mã |
| 11 | Tìm kiếm thuốc theo hoạt chất | Tìm theo hoạt chất |
| 12 | Xem thông tin chống chỉ định của thuốc | Xem CCĐ |
| 13 | Xem số lượng thuốc tồn kho khi kê đơn | Xem tồn kho |
| 14 | Xem thông tin hạn sử dụng | Xem HSD |
| 15 | Xem thông tin chi tiết của thuốc (quốc gia, lô thuốc, hãng sản xuất) | Xem chi tiết thuốc |
| 16 | Tự động tạo hướng dẫn sử dụng cho thuốc | Tự động HDSD |
| 17 | Lưu hướng dẫn sử dụng thuốc theo từng tài khoản | Lưu HDSD theo user |
| 18 | Thay đổi đối tượng thanh toán khi kê đơn | Đổi đối tượng TT |
| 19 | Kê đơn thuốc theo mẫu | Dùng mẫu đơn sẵn |
| 20 | Lưu mẫu đơn thuốc | Lưu mẫu mới |
| 21 | Chia sẻ đơn thuốc mẫu | Chia sẻ cho đồng nghiệp |
| 22 | Sao chép đơn thuốc cũ | Copy đơn trước |
| 23 | Chức năng cảnh báo trùng thuốc đã kê trong ngày | Cảnh báo trùng |
| 24 | Chức năng cảnh báo tương tác thuốc | Cảnh báo tương tác |
| 25 | Tương tác thuốc theo cấp độ, màu sắc | Phân cấp tương tác |
| 26 | Chức năng cảnh báo thuốc trùng nhóm kháng sinh | Cảnh báo trùng KS |

### 6.6 Kê đơn máu trong PTTT

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Chức năng lấy chẩn đoán từ hồ sơ vào màn hình chỉ định | Đồng bộ CĐ |
| 2 | Chức năng nhập mã bệnh chính | Nhập mã ICD-10 |
| 3 | Chức năng nhập chẩn đoán bệnh chính | Nhập tên bệnh |
| 4 | Chức năng nhập mã bệnh phụ | Nhập mã phụ |
| 5 | Chức năng nhập chẩn đoán bệnh phụ | Nhập tên phụ |
| 6 | Chức năng nhập nguyên nhân ngoài | Nhập nguyên nhân |
| 7 | Chức năng tìm kiếm bệnh theo mã ICD 10 | Tìm theo mã |
| 8 | Chức năng tìm kiếm bệnh theo tên bệnh | Tìm theo tên |
| 9 | Chức năng sửa tên bệnh | Sửa tên |
| 10 | Chức năng chọn kho máu | Chọn ngân hàng máu |
| 11 | Chức năng chọn máu và chế phẩm máu | Chọn loại máu/chế phẩm |
| 12 | Chức năng xem tồn của kho máu khi kê đơn máu | Xem tồn kho máu |

---

## 7. QUẢN LÝ XÉT NGHIỆM (LIS)
**Actor chính**: Kỹ thuật viên | **Actor phụ**: Bác sĩ

### 7.1 Kết nối máy xét nghiệm

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Kết nối máy xét nghiệm 1 chiều | Chỉ nhận KQ từ máy XN |
| 2 | Kết nối máy xét nghiệm 2 chiều | Gửi worklist + nhận KQ |
| 3 | Chức năng giao tiếp với máy xét nghiệm qua cổng Com | Kết nối RS232/COM port |
| 4 | Chức năng giao tiếp với máy xét nghiệm qua cổng RJ45, RJ11... | Kết nối mạng LAN |
| 5 | Chức năng terminal đón nhận raw, view raw, kiểm tra raw từ máy xét nghiệm | Xem dữ liệu thô từ máy |
| 6 | Tích hợp các protocol máy xét nghiệm: HL7, ASTM1381, ASTM1394, ASCII, Advia, Hitachi, AU, Rapidbind... | Hỗ trợ đa giao thức |
| 7 | Kết nối xét nghiệm theo chuẩn RS232 | Cổng nối tiếp |
| 8 | Kết nối xét nghiệm theo chuẩn TCP IP Server, TCP IP Client | Kết nối qua mạng TCP/IP |

### 7.2 Lấy mẫu xét nghiệm

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Chức năng gọi bệnh nhân vào lấy mẫu | Gọi số/tên BN |
| 2 | Chức năng in barcode | In barcode dán ống nghiệm |
| 3 | Chức năng tiếp nhận bệnh phẩm | Xác nhận nhận mẫu từ khoa |
| 4 | Kết nối đầu đọc barcode | Quét barcode ống mẫu |

### 7.3 Thực hiện xét nghiệm

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Chức năng xem Hồ sơ bệnh án | Xem thông tin lâm sàng BN |
| 2 | Chức năng chạy lại 1 kết quả xét nghiệm hoặc nhiều kết quả xét nghiệm | Rerun mẫu |
| 3 | Chức năng sửa kết quả xét nghiệm | Chỉnh sửa KQ nếu cần |
| 4 | Chức năng kê đơn vật tư hóa chất | Kê VT/hóa chất sử dụng |
| 5 | Cảnh báo kết quả xét nghiệm bất thường, nằm ngoài giới hạn cho phép | Cảnh báo KQ bất thường (critical value) |
| 6 | Kết nối đầu đọc barcode | Quét barcode ống mẫu |
| 7 | Nhập kết quả xét nghiệm | Nhập KQ thủ công |
| 8 | Chức năng trả kết quả từng phần | Trả KQ từng XN xong trước |
| 9 | Chức năng in kết quả từng phần | In KQ từng phần |
| 10 | In kết quả xét nghiệm bằng phần mềm | In phiếu KQ XN |
| 11 | Trả kết quả xét nghiệm qua mạng về khoa/phòng | Gửi KQ về khoa điều trị |

### 7.4 Quản lý

| STT | Chức năng | Mô tả chi tiết |
|-----|-----------|----------------|
| 1 | Hệ thống sổ xét nghiệm: Sinh hóa, vi sinh, huyết học, nước tiểu theo QĐ 4069... | Sổ sách theo quy định BYT |
| 2 | Hệ thống báo cáo thống kê xét nghiệm | BC số lượng XN theo loại/ngày/khoa |
| 3 | Hệ thống báo cáo doanh thu xét nghiệm: Doanh thu theo thu tiền, doanh thu theo trả kết quả thực tế | BC doanh thu khoa XN |
| 4 | Liên thông với XML 130/QĐ-BYT bảng 4 lấy thông tin mã máy xét nghiệm | Xuất XML BHXH bảng 4 |
| 5 | Chức năng khai báo định mức cho dịch vụ xét nghiệm | Định mức hóa chất/VT cho mỗi XN |
| 6 | Tính toán hóa chất sử dụng trong xét nghiệm | Tính tiêu hao hóa chất |
| 7 | Chức năng tạo phiếu tổng hợp lĩnh vật tư hóa chất | Tạo phiếu lĩnh VT/HC |
| 8 | Sẵn sàng tích hợp hệ thống kho dữ liệu của Sở y tế về đồng bộ kết quả CLS | Liên thông SYT |

---
---

## 8. QUẢN LÝ CHẨN ĐOÁN HÌNH ẢNH, THĂM DÒ CHỨC NĂNG (RIS/PACS)
**Actor chính**: Bác sĩ/Kỹ thuật viên

### 8.1 Kết nối với màn hình hiển thị danh sách Người bệnh chờ thực hiện

| STT | Chức năng |
|-----|-----------|
| 1 | Hiển thị danh sách bệnh nhân chờ thực hiện |
| 2 | Phát loa gọi bệnh nhân vào thực hiện |

### 8.2 Kết nối với các máy sinh ảnh

| STT | Chức năng |
|-----|-----------|
| 1 | Kết nối với hệ thống PACS cho phép kỹ thuật viên xem ảnh ngay trên RIS |
| 2 | Chức năng chỉnh sửa ảnh Xquang, Cắt lớp vi tính, Cộng hưởng từ |
| 3 | Sẵn sàng kết nối hệ thống full PACS theo chuẩn HL7 |
| 4 | Kết nối với các máy sinh ảnh khác (siêu âm, nội soi) |

### 8.3 Thực hiện chẩn đoán hình ảnh, thăm dò chức năng

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng tạo mẫu trả kết quả CĐHA theo loại dịch vụ |
| 2 | Chức năng tạo mẫu trả kết quả CĐHA theo dịch vụ |
| 3 | Chức năng tạo mẫu trả kết quả CĐHA theo giới tính |
| 4 | Chức năng đổi mẫu kết quả CĐHA |
| 5 | Chức năng nhập mô tả, kết luận và ghi chú |
| 6 | Chức năng đính kèm ảnh |
| 7 | In kết quả bằng phần mềm |
| 8 | Trả kết quả qua mạng về khoa/phòng (Gồm: Mô tả, kết luận, hình ảnh và ghi chú) |

### 8.4 Kê thuốc, vật tư

#### 8.4.1 Chẩn đoán khi kê đơn

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng lấy chẩn đoán từ hồ sơ vào màn hình kê đơn |
| 2 | Chức năng nhập mã bệnh chính |
| 3 | Chức năng nhập chẩn đoán bệnh chính |
| 4 | Chức năng nhập mã bệnh phụ |
| 5 | Chức năng nhập chẩn đoán bệnh phụ |
| 6 | Chức năng nhập nguyên nhân ngoài |
| 7 | Chức năng tìm kiếm bệnh theo mã ICD 10 |
| 8 | Chức năng tìm kiếm bệnh theo tên bệnh |
| 9 | Chức năng sửa tên bệnh |

#### 8.4.2 Kê đơn

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng chọn kho xuất |
| 2 | Kê đơn từ tủ trực |
| 3 | Tìm kiếm thuốc theo tên |
| 4 | Tìm kiếm thuốc theo mã |
| 5 | Tìm kiếm thuốc theo hoạt chất |
| 6 | Xem thông tin chống chỉ định của thuốc |
| 7 | Xem số lượng thuốc tồn kho khi kê đơn |
| 8 | Xem thông tin hạn sử dụng |
| 9 | Xem thông tin chi tiết của thuốc (quốc gia, lô thuốc, hãng sản xuất) |
| 10 | Tự động tạo hướng dẫn sử dụng cho thuốc |
| 11 | Lưu hướng dẫn sử dụng thuốc theo từng tài khoản |
| 12 | Thay đổi đối tượng thanh toán khi kê đơn |

#### 8.4.3 Hỗ trợ kê đơn nhanh

| STT | Chức năng |
|-----|-----------|
| 1 | Kê đơn thuốc theo mẫu |
| 2 | Lưu mẫu đơn thuốc |
| 3 | Chia sẻ đơn thuốc mẫu |
| 4 | Sao chép đơn thuốc cũ |
| 5 | Kê đơn theo phác đồ |
| 6 | Bổ sung thông tin vào phác đồ |
| 7 | Chức năng nhập lời dặn cho đơn thuốc |
| 8 | Tạo thư viện lời dặn để nhập nhanh lời dặn |

#### 8.4.5 Cảnh báo thông minh và tiện ích khác khi kê đơn

| STT | Chức năng |
|-----|-----------|
| 1 | Cảnh báo kê đơn ngoài phác đồ |
| 2 | Chức năng cảnh báo trùng thuốc đã kê trong ngày |
| 3 | Chức năng cảnh báo tương tác thuốc |
| 4 | Tương tác thuốc theo cấp độ, màu sắc |
| 5 | Chức năng cảnh báo thuốc trùng nhóm kháng sinh |
| 6 | Chức năng cảnh báo tiền thuốc vượt quá chi phí gói |

### 8.5 Quản lý

| STT | Chức năng |
|-----|-----------|
| 1 | Báo cáo doanh thu CĐHA |
| 2 | Sổ siêu âm theo QĐ4069 |
| 3 | Sổ chẩn đoán hình ảnh có phân chia theo từng loại dịch vụ |
| 4 | Sổ chẩn đoán hình ảnh theo QĐ4069 |
| 5 | Sổ thăm dò chức năng theo QĐ4069 |
| 6 | Quản lý định mức thuốc, vật tư tiêu hao |
| 7 | Báo cáo doanh thu theo chi phí gốc |
| 8 | Sẵn sàng tích hợp hệ thống kho dữ liệu của Sở y tế về đồng bộ kết quả CLS |

---

## 9. PHÂN HỆ QUẢN LÝ MÁU, CHẾ PHẨM MÁU
**Actor chính**: Cán bộ quản lý

| STT | Chức năng |
|-----|-----------|
| 1 | Quản lý nhập máu từ nhà cung cấp |
| 2 | In phiếu nhập máu từ nhà cung cấp |
| 3 | Quản lý yêu cầu xuất kho máu |
| 4 | Quản lý tồn kho máu |
| 5 | Quản lý hoạt động kiểm kê |
| 6 | Hệ thống báo cáo kho máu: thẻ kho, phiếu nhập, xuất, biên bản kiểm kê, kiểm nhập, nhập xuất tồn kho máu |
| 7 | Chỉ định máu, chế phẩm máu |
| 8 | In phiếu lĩnh máu tổng hợp |
| 9 | In phiếu lĩnh máu theo từng bệnh nhân |
| 10 | Kết nối thiết bị QRcode, Barcode để đọc túi máu |

---

## 10. PHÂN HỆ THU NGÂN
**Actor chính**: Cán bộ thu ngân

### 10.1 Giao dịch

| STT | Chức năng |
|-----|-----------|
| 1 | Kết nối đầu đọc barcode |
| 2 | Chức năng tìm kiếm (theo mã bệnh nhân, theo tên bệnh nhân, theo thẻ BHYT) |
| 3 | Chức năng kiểm tra thông tuyến thẻ BHYT |
| 4 | Chức năng tạo phiếu tạm ứng tiền cho người bệnh |
| 5 | Chức năng tạo phiếu thu tạm ứng tiền từ khoa lâm sàng |
| 6 | Chức năng tạo phiếu thu tiền cho người bệnh |
| 7 | Chức năng tạo phiếu hoàn ứng cho người bệnh |
| 8 | Chức năng hủy phiếu thu tiền, hủy phiếu tạm ứng |
| 9 | Chức năng tạm khóa hồ sơ |
| 10 | Chức năng duyệt kế toán |
| 11 | Chức năng hiển thị trạng thái bệnh nhân: (Đã đóng bệnh án, Đã duyệt kế toán, chưa duyệt kế toán) |
| 12 | Chức năng miễn giảm theo hóa đơn |
| 13 | Chức năng miễn giảm theo từng dịch vụ |

### 10.2 Chức năng in ấn, báo cáo

| STT | Chức năng |
|-----|-----------|
| 1 | In bảng kê thanh toán theo mẫu 6556 |
| 2 | In bảng kê thanh toán tách theo đối tượng |
| 3 | In bảng kê thanh toán theo khoa |
| 4 | In phiếu tạm ứng theo dịch vụ |
| 5 | In phiếu thu tạm ứng |
| 6 | In biên lai thu tiền |
| 7 | In hóa đơn từ phần mềm |
| 8 | In phiếu thu hoàn ứng |

### 10.3 Quản lý thu ngân

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng tạo sổ thu tiền |
| 2 | Chức năng tạo sổ tạm ứng |
| 3 | Chức năng khóa sổ |
| 4 | Chức năng phân quyền sổ |
| 5 | Sẵn sàng tích hợp hóa đơn điện tử |
| 6 | Báo cáo thu tiền ngoại trú |
| 7 | Báo cáo thu tiền nội trú |
| 8 | Báo cáo thu tiền tạm ứng |
| 9 | Báo cáo sử dụng sổ thu chi |

---

## 11. PHÂN HỆ QUẢN LÝ TÀI CHÍNH
**Actor chính**: Cán bộ quản lý tài chính

| STT | Chức năng |
|-----|-----------|
| 1 | Hạch toán doanh thu, chi phí từng khoa phòng chỉ định: BHYT, Viện phí, Dịch vụ |
| 2 | Hạch toán doanh thu khoa phòng thực hiện: BHYT, Viện phí, Dịch vụ... |
| 3 | Hạch toán doanh thu dịch vụ kỹ thuật theo: BHYT, Viện phí, Dịch vụ... |
| 4 | Hạch toán doanh thu theo nhóm dịch vụ: Xét nghiệm, CĐHA, TDCN, PTTT... |
| 5 | Hạch toán doanh thu theo hóa đơn bệnh nhân BHYT, Viện phí, Dịch vụ... đối tượng nội trú, ngoại trú |
| 6 | Hạch toán doanh thu tạm ứng, hoàn ứng đối tượng nội trú, ngoại trú |
| 7 | Hệ thống báo cáo thống kê chi phí: chi phí của bệnh nhân (thuốc, vật tư hao phí trong gói dịch vụ), chi phí khoa phòng |
| 8 | Hạch toán doanh thu, lợi nhuận phẫu thuật thủ thuật |
| 9 | Sẵn sàng tích hợp hệ thống phần mềm kế toán |

---

## 12. GIÁM ĐỊNH BHYT
**Actor chính**: Cán bộ giám định

| STT | Chức năng |
|-----|-----------|
| 1 | Kết xuất dữ liệu XML theo QĐ 4210 (bảng 1,2,3,4,5) |
| 2 | Kết xuất dữ liệu XML theo QĐ 917 |
| 3 | Kết xuất dữ liệu XML thông tuyến |
| 4 | Kết xuất dữ liệu XML Bệnh nhân không có BHYT |
| 5 | Kết xuất dữ liệu XML QĐ 4210 tự động |
| 6 | Kết xuất dữ liệu XML QĐ 4210 tự động BN ra viện theo TT48 |
| 7 | XML4210 tự động đẩy cổng BHXH |
| 8 | Kết xuất XML QĐ 4210 từng bệnh nhân đang điều trị |
| 9 | Kết xuất dữ liệu XML theo quyết định 130/QĐ-BYT |
| 10 | Kết xuất dữ liệu XML theo quyết định 130/QĐ-BYT tự động đẩy cổng BHXH |
| 11 | Kết xuất dữ liệu XML theo quyết định 4750/QĐ-BYT |
| 12 | Kết xuất dữ liệu XML theo quyết định 4750/QĐ-BYT tự động đẩy cổng BHXH |
| 13 | Kết xuất dữ liệu XML theo quyết định 3176/QĐ-BYT |
| 14 | Kết xuất dữ liệu XML theo quyết định 3176/QĐ-BYT tự động đẩy cổng BHXH |
| 15 | Kết xuất dữ liệu XML theo công văn 2076/BHXH-CNTT |
| 16 | Duyệt giám định BHYT |
| 17 | Khóa giám định BHYT |
| 18 | Kết xuất mẫu biểu báo cáo BHYT: 19,20,21,79,80 theo quyết định 1399/QĐ-BHXH, file mềm gửi cổng theo công văn 3360/BHXH-CSYT |
| 19 | Kết xuất báo cáo tổng hợp chi phí khám bệnh, chữa bệnh của người tham gia bảo hiểm y tế theo Thông tư số 102/2018/TT-BTC |

---

## 13. QUẢN LÝ DANH MỤC DÙNG CHUNG
**Actor chính**: Quản trị hệ thống

| STT | Chức năng |
|-----|-----------|
| 1 | Quản lý danh mục khám bệnh: thông tin mã tương đương, bảng giá, thông tin mã giá TT37, TT15 |
| 2 | Quản lý danh mục xét nghiệm: thông tin mã tương đương, bảng giá, thông tin mã giá TT37, TT15 |
| 3 | Quản lý danh mục chẩn đoán hình ảnh: thông tin mã tương đương, bảng giá, thông tin mã giá TT37, TT15 |
| 4 | Quản lý danh mục thăm dò chức năng: thông tin mã tương đương, bảng giá, thông tin mã giá TT37, TT15 |
| 5 | Quản lý danh mục phẫu thuật thủ thuật: thông tin mã tương đương, bảng giá, thông tin mã giá TT37, TT15, loại PTTT |
| 6 | Quản lý danh mục ngày giường: thông tin mã tương đương, bảng giá, thông tin mã giá TT37, TT15 |
| 7 | Quản lý danh mục vận chuyển: thông tin mã tương đương, bảng giá, thông tin mã giá TT37, TT15 |
| 8 | Quản lý danh mục khoa, phòng, kho theo QĐ BYT: Mã khoa theo BYT, Mã phòng theo BYT |
| 9 | Quản lý danh mục đường dùng BYT: Mã đường dùng theo BYT, tên đường dùng |
| 10 | Quản lý danh mục hoạt chất, mã hoạt chất BYT: mã hoạt chất theo BYT, tên hoạt chất, mã hoạt chất TT40 |
| 11 | Quản lý danh mục thuốc: mã tương đương, số đăng ký, thông tin thầu, thông tin thuốc |
| 12 | Quản lý danh mục vật tư: mã tương đương, số đăng ký, thông tin thầu, thông tin vật tư |
| 13 | Quản lý danh mục người dùng: mã user, tên nhân viên, chức danh, số chứng chỉ hành nghề |
| 14 | Quản lý danh mục ICD10 theo quy định BYT |
| 15 | Quản lý danh mục kết quả điều trị |
| 16 | Quản lý danh mục mã nhóm dịch vụ |
| 17 | Quản lý danh mục máy y tế: mã máy, tên máy, seri, nguồn mua... |

---

## 14. PHÂN HỆ QUẢN LÝ KHO, NHÀ THUỐC (Thuốc, vật tư và máu)
**Actor chính**: Cán bộ quản lý kho

### 14.1 Quản lý danh mục của kho

| STT | Chức năng |
|-----|-----------|
| 1 | Quản lý danh mục thuốc, vật tư, hàng hóa |
| 2 | Quản lý danh mục kho |
| 3 | Quản lý danh mục đơn vị |
| 4 | Quản lý danh mục hoạt chất |
| 5 | Quản lý danh mục biệt dược |
| 6 | Quản lý danh mục đường dùng |
| 7 | Quản lý danh mục nước sản xuất |
| 8 | Quản lý danh mục hãng sản xuất |
| 9 | Quản lý danh mục nhà cung cấp |
| 10 | Quản lý danh mục đơn vị tính |
| 11 | Quản lý danh mục khách hàng, khách lẻ, đối tác |
| 12 | Quản lý danh mục đường dùng |
| 13 | Quản lý danh mục nguồn chương trình |
| 14 | Quản lý danh mục báo cáo |
| 15 | Quản lý danh mục nhóm dược lý |
| 16 | Quản lý danh mục nhóm quản lý |
| 17 | Quản lý danh mục tiểu nhóm dược lý |
| 18 | Quản lý danh mục ATC |
| 19 | Quản lý danh mục nghiên cứu |
| 20 | Quản lý danh mục quy chế |
| 21 | Quản lý danh mục Lý do xuất khác |

### 14.2 Chức năng quản lý

| STT | Chức năng |
|-----|-----------|
| 1 | Chức năng nhập nhà cung cấp |
| 2 | Chức năng nhập đầu kỳ |
| 3 | Chức năng nhập từ các nguồn |
| 4 | Chức năng nhập chuyển kho |
| 5 | Chức năng nhập hoàn trả Khoa/phòng |
| 6 | Chức năng nhập hoàn trả Kho |
| 7 | Chức năng nhập kiểm kê |
| 8 | Chức năng xuất khoa/phòng |
| 9 | Chức năng xuất chuyển kho |
| 10 | Chức năng xuất trả nhà cung cấp |
| 11 | Chức năng xuất ngoại viện |
| 12 | Chức năng xuất hủy, hỏng vỡ |
| 13 | Chức năng xuất kiểm nghiệm |
| 14 | Chức năng xuất kiểm kê |
| 15 | Chức năng dự trù |
| 16 | Chức năng cảnh báo hạn sử dụng, xuất thuốc/vật tư hết hạn sử dụng |
| 17 | Chức năng cảnh báo số lượng tồn kho dưới mức tối thiểu |
| 18 | Chức năng thu hồi phiếu thuốc, vật tư BN không lĩnh |
| 19 | Quản lý tất cả các loại phiếu nhập |
| 20 | Quản lý tất cả các loại phiếu xuất |
| 21 | Quản lý kỳ kiểm kê: chốt kỳ, hủy kỳ |
| 22 | Quản lý tủ trực thuốc, vật tư theo cơ số |
| 23 | Quản lý tủ trực thuốc, vật tư theo bệnh nhân |
| 24 | Chức năng xuất thuốc theo cơ chế: Hạn sử dụng hết trước thì xuất trước, nhập trước xuất trước |
| 25 | Chức năng khai báo thông tin |
| 26 | Chức năng khóa thuốc, vật tư tồn kho |
| 27 | Chức năng khóa thuốc, vật tư nhập nhà cung cấp |
| 28 | Chức năng xem thông tin xuất nhập |
| 29 | Chức năng xem thông tin phiếu yêu cầu |
| 30 | Chức năng xem hồ sơ bệnh án |
| 31 | Chức năng tích hợp liên thông nhà thuốc lên cổng dược quốc gia |
| 32 | Chức năng tích hợp liên thông đơn thuốc lên cổng đơn thuốc quốc gia |
| 33 | Sẵn sàng tích hợp hệ thống kho dữ liệu của Sở y tế về đồng bộ dữ liệu thuốc |
| 34 | Chức năng hiển thị trạng thái phiếu |
| 35 | Chức năng xem thẻ kho theo ngày |
| 36 | Chức năng xem thẻ kho theo giai đoạn |
| 37 | Chức năng xem thông tin (Tên, Số lô, Số đăng ký, Số lượng tồn đầu, Số lượng tồn kho, Thuốc đã khóa, Thuốc hết hạn) |

### 14.3 Chức năng in ấn, báo cáo

| STT | Chức năng |
|-----|-----------|
| 1 | In phiếu nhập kho |
| 2 | In phiếu nhập kiểm kê |
| 3 | In phiếu xuất kho |
| 4 | In phiếu hoàn trả |
| 5 | In phiếu xuất hủy |
| 6 | In phiếu xuất kiểm nghiệm |
| 7 | In phiếu xuất kiểm kê |
| 8 | In biên bản kiểm nhập |
| 9 | In thẻ kho (Mẫu 04D/BV-01/TT22) |
| 10 | Chức năng quản lý lô thuốc |
| 11 | Chức năng quản lý lô vật tư |

---

## 15. PHÂN HỆ BÁO CÁO DƯỢC
**Actor chính**: Cán bộ quản lý dược

| STT | Chức năng |
|-----|-----------|
| 15.1 | Sổ theo dõi xuất, nhập, tồn kho thuốc gây nghiện, hướng thần, tiền chất làm thuốc (phụ lục VIII - TT20/2017; TT27/2024) |
| 15.2 | Sổ theo dõi xuất, nhập, tồn kho thuốc dạng phối hợp có chứa chất gây nghiện, thuốc dạng phối hợp có chứa chất hướng thần, thuốc dạng phối hợp có chứa tiền chất, thuốc độc, nguyên liệu độc làm thuốc, thuốc và dược chất thuộc danh mục chất bị cấm sử dụng trong một số ngành, lĩnh vực (phụ lục XVIII - TT20/2017; TT27/2024) |
| 15.3 | Báo cáo xuất, nhập, tồn kho, sử dụng thuốc GN, HT, TC, thuốc phóng xạ, thuốc dạng phối hợp có chứa tiền chất (phụ lục X - TT20/2017; TT27/2024) |
| 15.4 | Sổ theo dõi thông tin chi tiết khách hàng (phụ lục XXI) |
| 15.5 | Báo cáo công tác khoa Dược bệnh viện (Mẫu 10D/BV-01/TT22) |
| 15.6 | Báo cáo sử dụng thuốc (Mẫu 05D/BV-01/TT22) |
| 15.7 | Báo cáo sử dụng kháng sinh (Mẫu 06D/BV-01/TT22) |
| 15.8 | Báo cáo sử dụng hóa chất (Mẫu 08D/BV-01/TT22) |
| 15.9 | Báo cáo sử dụng vật tư y tế tiêu hao (Mẫu 09D/BV-01/TT22) |
| 15.10 | Biên bản kiểm kê thuốc (Mẫu 11D/BV-01/TT22) |
| 15.11 | Biên bản kiểm kê hóa chất (Mẫu 12D/BV-01/TT22) |
| 15.12 | Biên bản kiểm kê vật tư y tế tiêu hao (Mẫu 13D/BV-01/TT22) |
| 15.13 | Biên bản xác nhận thuốc/hóa chất/vật tư y tế tiêu hao mất/hỏng/vỡ (Mẫu 14D/BV-01/TT22) |
| 15.14 | Thống kê 15 ngày sử dụng thuốc, hóa chất, vật tư y tế tiêu hao (Mẫu 16D/BV-01/TT23) |
| 15.15 | Báo cáo xuất nhập tồn kho |
| 15.16 | Báo cáo tồn kho toàn viện |
| 15.17 | Báo cáo xuất nhập theo khoa phòng |

---

## 16. QUẢN LÝ HỒ SƠ BỆNH ÁN, QUẢN LÝ KẾ HOẠCH TỔNG HỢP, BÁO CÁO THỐNG KÊ
**Actor chính**: Kế hoạch tổng hợp

### 16.1 Quản lý kho bệnh án, quản lý nhập kho, quản lý mượn/trả hồ sơ bệnh án

| STT | Chức năng |
|-----|-----------|
| 1 | Duyệt lưu trữ bệnh án: vị trí lưu trữ, nơi lưu trữ (HSBA phải qua KHTH mới xuống kho lưu trữ) |
| 2 | Có bước ký nhận hồ sơ giữa Khoa điều trị và P.KHTH (BN xuất viện thì danh sách chờ nằm tại P.KHTH) |
| 3 | Yêu cầu vị trí lưu trữ và số lưu trữ phải liên tục |
| 4 | Cấp số vào viện tự động sinh theo khoa đầu tiên |
| 5 | Cấp số lưu trữ tự động sinh theo khoa cuối cùng (định dạng số lưu trữ YYXXXXXXXX, trong đó YY là năm, XXXXXXXX tăng từ 1 theo năm) |
| 6 | Tự động reset số lưu trữ theo năm hoặc tăng liên tục |
| 7 | Tìm kiếm nhanh theo số lưu trữ, mã bệnh nhân... |
| 8 | Báo cáo thống kê bệnh án: đã lưu trữ, chưa lưu trữ, bao gồm các thông tin lưu trữ của bệnh án |

### 16.2 Báo cáo KHTH

| STT | Chức năng |
|-----|-----------|
| 1 | Hệ thống biểu mẫu báo cáo thống kê TT27 BYT (tình hình bệnh tật tử vong, hoạt động khám bệnh, hoạt động điều trị, hoạt động PTTT, Hoạt động cận lâm sàng, hoạt động tài chính...) |
| 2 | Hệ thống báo cáo kế hoạch tổng hợp |
| 3 | Hệ thống báo cáo giao ban, thống kê toàn bộ hoạt động bệnh viện |
| 4 | Hệ thống dashboard hiển thị số liệu hoạt động của bệnh viện |

---

## 17. QUẢN LÝ QUẢN TRỊ HỆ THỐNG
**Actor chính**: Quản trị hệ thống

| STT | Chức năng |
|-----|-----------|
| 1 | Quản lý người dùng, phân quyền người dùng |
| 2 | Quản lý, phân quyền in ấn các biểu mẫu, giấy tờ, báo cáo |
| 3 | Chức năng báo cáo động: cho phép tự sửa các biểu mẫu, giấy tờ, báo cáo. Tự đặt công thức vào báo cáo |
| 4 | Quản lý máy trạm |
| 5 | Chức năng thông báo tới các máy trạm |
| 6 | Ghi log, tra cứu log các thao tác người dùng |
| 7 | Khóa dịch vụ (tạm thời không cho phép bác sĩ chỉ định dịch vụ/thuốc/vật tư... vì lý do nào đó. VD: máy hỏng, thuốc để dành) |
| 8 | Cập nhật các biểu mẫu, báo cáo |
| 9 | Quản lý, điều chỉnh các tham số cấu hình hệ thống |
| 10 | Quản lý, điều chỉnh các tham số của cấu hình tài khoản người dùng |

---

# PHẦN B. YÊU CẦU KỸ THUẬT CHUNG

## Tuân thủ Quy chuẩn

| STT | Văn bản | Nội dung |
|-----|---------|----------|
| 1 | TT 22/2023/TT-BTTTT | Tiêu chuẩn kỹ thuật ứng dụng CNTT trong cơ quan nhà nước |
| 2 | TT 54/2017/TT-BYT | Bộ tiêu chí ứng dụng CNTT tại cơ sở KCB |
| 3 | TT 13/2025/TT-BYT | Hướng dẫn triển khai hồ sơ bệnh án điện tử |
| 4 | QĐ 5969/QĐ-BYT | Kế hoạch ứng dụng CNTT của BYT 2021-2025 |
| 5 | QĐ 3074/QĐ-BYT | Nhóm thông tin cơ bản về y tế trong CSDL quốc gia về BH |
| 6 | QĐ 130/QĐ-BYT | Chuẩn định dạng dữ liệu đầu ra phục vụ giám định, thanh toán BHYT |
| 7 | QĐ 4750/QĐ-BYT | Sửa đổi, bổ sung QĐ 130 |
| 8 | QĐ 3176/QĐ-BYT | Sửa đổi, bổ sung QĐ 4750 |

## Yêu cầu Hạ tầng

| Hạng mục | Yêu cầu |
|----------|---------|
| Hệ quản trị CSDL | Microsoft SQL Server / Oracle / PostgreSQL hoặc tương đương |
| Ngôn ngữ lập trình | .NET / Java hoặc tương đương |
| Hệ điều hành Server | Microsoft Windows Server / Linux hoặc tương đương |

## Yêu cầu Phi chức năng

| Hạng mục | Yêu cầu |
|----------|---------|
| Tốc độ | Truyền tải ổn định, đọc/ghi tức thời, không có độ trễ |
| Ổn định | Ít phát sinh lỗi trong quá trình sử dụng |
| Bản quyền | Có đăng ký sở hữu trí tuệ |
| Bảo hành | Hỗ trợ 24/7, khắc phục lỗi nhỏ trong 24h, lỗi hệ thống trong 48h |
| Khả năng nâng cấp | Mở rộng module, tính năng theo quy định BYT và BHXH |
| Chuyển đổi dữ liệu | Hoàn thành trong 5 ngày kể từ ngày HĐ có hiệu lực |
| Quyền sở hữu dữ liệu | Dữ liệu thuộc sở hữu của Chủ đầu tư |

---

# PHẦN C. GHI CHÚ CHO DEVELOPER

## Các API/Integration cần tích hợp

| STT | Hệ thống | Mô tả |
|-----|----------|-------|
| 1 | Cổng BHXH Việt Nam | Kiểm tra thẻ BHYT, gửi hồ sơ giám định, XML 130/4750/3176/4210 |
| 2 | Hệ thống Hồ sơ sức khỏe điện tử | Đồng bộ dữ liệu sức khỏe |
| 3 | Thẻ khám bệnh thông minh | Đọc/ghi thẻ smartcard |
| 4 | Hệ thống LIS | Kết nối máy xét nghiệm (HL7, ASTM1381, ASTM1394, ASCII, Advia, Hitachi, AU, Rapidbind, RS232, TCP/IP) |
| 5 | Hệ thống RIS/PACS | Kết nối CĐHA theo chuẩn HL7, DICOM |
| 6 | Cổng dược quốc gia | Liên thông nhà thuốc |
| 7 | Cổng đơn thuốc quốc gia | Liên thông đơn thuốc |
| 8 | Kho dữ liệu Sở Y tế | Đồng bộ kết quả CLS, dữ liệu thuốc |
| 9 | Hóa đơn điện tử | Tích hợp xuất hóa đơn |
| 10 | Phần mềm kế toán | Tích hợp hạch toán |

## Các tiêu chuẩn dữ liệu cần tuân thủ

| Tiêu chuẩn | Mô tả |
|------------|-------|
| ICD-10 | Mã bệnh quốc tế |
| Danh mục thuốc BYT | Mã thuốc theo BYT |
| Danh mục VTYT BYT | Mã vật tư theo BYT |
| Danh mục dịch vụ kỹ thuật | Mã dịch vụ theo BYT |
| XML 130/4750/3176 | Chuẩn dữ liệu đầu ra BHYT mới |
| XML 4210 | Chuẩn dữ liệu BHYT cũ |
| TT37, TT15 | Giá dịch vụ kỹ thuật |
| TT35 | Quy định về chỉ định CLS |
| TT50 | Quy định về PTTT |
| QĐ 4069/2001/QĐ-BYT | Mẫu sổ sách y tế |
| TT20/2017, TT27/2024 | Mẫu biểu dược |
| TT27 BYT | Báo cáo thống kê y tế |

---

*Tài liệu được trích xuất đầy đủ từ Chương V - Yêu cầu Kỹ thuật gói thầu HIS Bệnh viện Đa khoa Nông nghiệp*

**TỔNG KẾT:**
- **17 phân hệ chính**
- **~680+ chức năng chi tiết** (đã liệt kê đầy đủ theo PDF gốc)
- **Tuân thủ các quy định BYT, BHXH hiện hành**
