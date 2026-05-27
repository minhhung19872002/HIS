# HIS - Hospital Information System
# Hệ Thống Thông Tin Bệnh Viện

## Tổng Quan

HIS (Hospital Information System) là hệ thống quản lý thông tin bệnh viện toàn diện, hỗ trợ các quy trình khám chữa bệnh, quản lý bệnh nhân, và vận hành bệnh viện.

---

## 1. Quản Lý Bệnh Nhân (Patient Management)

### 1.1 Đăng Ký Bệnh Nhân
- Đăng ký bệnh nhân mới (thông tin cá nhân, CCCD, BHYT)
- Cập nhật thông tin bệnh nhân
- Tìm kiếm bệnh nhân (theo mã, tên, CCCD, SĐT)
- Quản lý mã bệnh nhân tự động
- Lưu trữ ảnh chân dung bệnh nhân

### 1.2 Hồ Sơ Bệnh Án
- Tạo và quản lý hồ sơ bệnh án
- Lịch sử khám bệnh
- Tiền sử bệnh
- Dị ứng thuốc
- Kết quả xét nghiệm, chẩn đoán hình ảnh

### 1.3 Thẻ BHYT
- Kiểm tra thông tin BHYT
- Xác nhận quyền lợi BHYT
- Lịch sử sử dụng BHYT

---

## 2. Tiếp Đón & Đăng Ký Khám (Reception)

### 2.1 Tiếp Đón Bệnh Nhân
- Đăng ký khám bệnh
- Chọn chuyên khoa/bác sĩ
- Cấp số thứ tự khám
- Hẹn lịch khám

### 2.2 Quản Lý Hàng Đợi
- Hiển thị danh sách chờ khám
- Gọi số thứ tự
- Chuyển phòng khám
- Thống kê thời gian chờ

### 2.3 Đặt Lịch Hẹn
- Đặt lịch hẹn online/offline
- Nhắc lịch hẹn (SMS, Email)
- Quản lý lịch hẹn bác sĩ
- Hủy/dời lịch hẹn

---

## 3. Khám Bệnh (Outpatient - OPD)

### 3.1 Khám Lâm Sàng
- Tiếp nhận bệnh nhân từ tiếp đón
- Nhập triệu chứng, sinh hiệu
- Chẩn đoán sơ bộ, chẩn đoán xác định
- Mã hóa ICD-10

### 3.2 Chỉ Định
- Chỉ định xét nghiệm
- Chỉ định chẩn đoán hình ảnh
- Chỉ định thủ thuật
- Chỉ định thuốc

### 3.3 Kê Đơn Thuốc
- Kê đơn thuốc điện tử
- Kiểm tra tương tác thuốc
- Kiểm tra dị ứng thuốc
- In đơn thuốc
- Lưu mẫu đơn thuốc thường dùng

### 3.4 Giấy Tờ
- Giấy nghỉ ốm
- Giấy chuyển viện
- Giấy hẹn tái khám
- Các giấy tờ khác

---

## 4. Nội Trú (Inpatient - IPD)

### 4.1 Nhập Viện
- Thủ tục nhập viện
- Phân giường bệnh
- Chuyển khoa/phòng
- Theo dõi tình trạng giường

### 4.2 Điều Trị Nội Trú
- Y lệnh hàng ngày
- Theo dõi sinh hiệu
- Phiếu chăm sóc
- Bảng theo dõi thuốc

### 4.3 Xuất Viện
- Thủ tục xuất viện
- Tóm tắt bệnh án
- Hướng dẫn sau xuất viện
- Hẹn tái khám

### 4.4 Quản Lý Giường
- Sơ đồ giường bệnh
- Trạng thái giường (trống, có bệnh nhân, bảo trì)
- Lịch sử sử dụng giường
- Thống kê công suất giường

---

## 5. Cận Lâm Sàng (Laboratory & Imaging)

### 5.1 Xét Nghiệm (LIS)
- Tiếp nhận mẫu xét nghiệm
- Nhập/nhận kết quả từ máy
- Duyệt kết quả
- In phiếu kết quả
- Cảnh báo giá trị bất thường

### 5.2 Chẩn Đoán Hình Ảnh (RIS/PACS)
- Đặt lịch chụp
- Lưu trữ hình ảnh DICOM
- Đọc và mô tả kết quả
- Xem hình ảnh trực tuyến

### 5.3 Thăm Dò Chức Năng
- Điện tim (ECG)
- Siêu âm
- Nội soi
- Các thăm dò khác

---

## 6. Dược (Pharmacy)

### 6.1 Quản Lý Kho Thuốc
- Nhập thuốc từ nhà cung cấp
- Xuất thuốc cho bệnh nhân
- Chuyển kho
- Kiểm kê tồn kho
- Cảnh báo hết hạn, hết thuốc

### 6.2 Cấp Phát Thuốc
- Cấp phát thuốc ngoại trú
- Cấp phát thuốc nội trú
- Hoàn trả thuốc
- Theo dõi thuốc đã cấp

### 6.3 Quản Lý Thuốc
- Danh mục thuốc
- Giá thuốc
- Hàm lượng, đơn vị
- Nhóm thuốc BHYT

---

## 7. Viện Phí & Thanh Toán (Billing)

### 7.1 Tính Viện Phí
- Tính phí dịch vụ
- Tính phí thuốc
- Áp dụng BHYT
- Miễn giảm phí

### 7.2 Thu Tiền
- Thu tiền tạm ứng
- Thu tiền thanh toán
- Hoàn tiền
- In hóa đơn, biên lai

### 7.3 Công Nợ
- Theo dõi công nợ bệnh nhân
- Đối soát BHYT
- Báo cáo doanh thu

---

## 8. Báo Cáo & Thống Kê (Reports)

### 8.1 Báo Cáo Hoạt Động
- Số lượt khám theo ngày/tháng/năm
- Số bệnh nhân nội trú
- Công suất sử dụng giường
- Thời gian khám trung bình

### 8.2 Báo Cáo Tài Chính
- Doanh thu theo khoa/phòng
- Doanh thu theo dịch vụ
- Báo cáo BHYT
- Báo cáo thuế

### 8.3 Báo Cáo Y Tế
- Báo cáo bệnh truyền nhiễm
- Thống kê theo ICD-10
- Báo cáo sử dụng thuốc
- Các báo cáo bộ Y tế

---

## 9. Quản Trị Hệ Thống (System Administration)

### 9.1 Quản Lý Người Dùng
- Tạo/sửa/xóa tài khoản
- Phân quyền theo vai trò
- Đăng nhập/đăng xuất
- Lịch sử hoạt động

### 9.2 Quản Lý Danh Mục
- Danh mục khoa/phòng
- Danh mục dịch vụ
- Danh mục ICD-10
- Danh mục giá

### 9.3 Cấu Hình Hệ Thống
- Cấu hình thông tin bệnh viện
- Cấu hình in ấn
- Cấu hình email/SMS
- Sao lưu dữ liệu

---

## 10. Yêu Cầu Kỹ Thuật

### 10.1 Kiến Trúc Hệ Thống
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React JS      │────▶│   .NET Core     │────▶│   SQL Server    │
│   Frontend      │     │   Backend API   │     │   Database      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 10.2 Backend (.NET Core)
- .NET 8.0
- Entity Framework Core
- JWT Authentication
- RESTful API
- AutoMapper
- FluentValidation

### 10.3 Frontend (React JS)
- React 18+
- TypeScript
- Ant Design / Material UI
- Redux Toolkit
- React Router
- Axios

### 10.4 Database (SQL Server)
- Server: localhost\DOTNET
- Database: HIS
- SQL Server 2019+

### 10.5 Bảo Mật
- Mã hóa mật khẩu (BCrypt)
- JWT Token
- HTTPS
- Phân quyền RBAC
- Audit Log

---

## 11. Giai Đoạn Phát Triển

### Phase 1: Core (Nền tảng)
- Quản lý người dùng, phân quyền
- Quản lý danh mục cơ bản
- Quản lý bệnh nhân
- Tiếp đón, đăng ký khám

### Phase 2: OPD (Khám ngoại trú)
- Khám bệnh
- Chỉ định, kê đơn
- Thanh toán cơ bản

### Phase 3: CLS (Cận lâm sàng)
- Xét nghiệm
- Chẩn đoán hình ảnh
- Thăm dò chức năng

### Phase 4: IPD (Nội trú)
- Nhập viện, xuất viện
- Y lệnh, chăm sóc
- Quản lý giường

### Phase 5: Pharmacy (Dược)
- Quản lý kho thuốc
- Cấp phát thuốc

### Phase 6: Advanced (Nâng cao)
- Báo cáo, thống kê
- Tích hợp BHYT
- Tích hợp máy xét nghiệm

---

## 12. API Endpoints (Thiết kế sơ bộ)

### Authentication
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

### Patients
- GET /api/patients
- GET /api/patients/{id}
- POST /api/patients
- PUT /api/patients/{id}
- DELETE /api/patients/{id}

### Appointments
- GET /api/appointments
- POST /api/appointments
- PUT /api/appointments/{id}
- DELETE /api/appointments/{id}

### Medical Records
- GET /api/medical-records/patient/{patientId}
- POST /api/medical-records
- PUT /api/medical-records/{id}

### Prescriptions
- GET /api/prescriptions/{id}
- POST /api/prescriptions
- PUT /api/prescriptions/{id}

### Billing
- GET /api/billing/patient/{patientId}
- POST /api/billing/calculate
- POST /api/billing/payment

---

## Ghi Chú

- Tài liệu này sẽ được cập nhật trong quá trình phát triển
- Mỗi module sẽ có tài liệu chi tiết riêng
- Tuân thủ quy định của Bộ Y tế Việt Nam
