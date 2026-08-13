# Kết quả kiểm thử production NangCap27

- Ngày kiểm thử: 13/08/2026 (Asia/Ho_Chi_Minh)
- Frontend: `https://his-psi.vercel.app`
- API: `https://his-api.thankfulcoast-bd0486a9.southeastasia.azurecontainerapps.io/api`
- Nguồn yêu cầu: `NangCap27.docx` (đã đọc và kiểm tra trực quan đủ 24 trang render)

## Kết luận

Các chức năng chính của NangCap27 đã qua smoke test, kiểm thử API sâu, kiểm tra tuyến giao diện và kiểm tra bản in A4. Bốn lỗi thực tế tìm thấy đã được sửa trong mã nguồn và vượt qua kiểm thử cục bộ. Bản production hiện tại chưa chứa các bản sửa này; cần triển khai cả backend và frontend rồi chạy lại bốn điểm kiểm tra sau triển khai.

## Phạm vi và kết quả

| Hạng mục | Kết quả |
|---|---:|
| Smoke API/UI production | 6/6 đạt |
| API nghiệp vụ sâu NangCap27 | 44/44 đạt |
| Design/load audit | 106/106 tuyến chạy hết |
| Interactive audit production | 104 tuyến đã chạy; tuyến còn lại phát hiện lỗi và đạt sau khi sửa cục bộ |
| Interactive retest cục bộ SMS + Sức khỏe sinh sản | 2/2 đạt |
| Biểu mẫu A4 | 12/12 render; không tràn ngang, không trang trắng |
| Unit test frontend | 39/39 đạt |
| Test backend | 18/18 đạt, 1 test DICOM được skip theo cấu hình sẵn |
| Frontend production build | Đạt |
| TypeScript + lint các file sửa | Đạt, 0 lỗi/0 cảnh báo |
| Backend build | Đạt khi dùng output riêng (output mặc định bị tiến trình HIS local giữ DLL) |

## Lỗi đã sửa

1. `GET /api/hospital-pharmacy/sales` trả 500 trên production.
   - Log Azure Container Apps xác nhận SQL Server error 468: xung đột `Vietnamese_CI_AS` và `Latin1_General_CI_AI` trong biểu thức `CASE`.
   - Đã tách hai cột tên bệnh nhân trong projection SQL và chọn giá trị fallback sau khi materialize.
   - Đã thêm regression test cho bệnh nhân liên kết và khách vãng lai.

2. Trang SMS Gateway crash với `Cannot read properties of undefined (reading 'toFixed')`.
   - Nguyên nhân: màn v2 lưu nguyên `AxiosResponse` thay vì `response.data`.
   - Đã sửa balance, stats, logs và kiểm tra kết nối dùng dữ liệu đúng kiểu.

3. Trang Sức khỏe sinh sản vào màn 500 với `Cannot read properties of undefined (reading 'toLowerCase')`.
   - Nguyên nhân: dữ liệu lịch sử có các trường mã/tên bệnh nhân null dù contract TypeScript khai báo string.
   - Đã chuẩn hóa ba trường tìm kiếm tại biên API cho cả thai sản, kế hoạch hóa gia đình và danh sách nguy cơ cao.

4. Mẫu “Tổng kết hồ sơ bệnh án” sinh trang 2 hoàn toàn trắng.
   - Đã thu gọn spacing chỉ cho mẫu này và khối chữ ký.
   - PDF sau sửa còn đúng 1 trang, nội dung đầy đủ đến hai chữ ký.

## Dữ liệu kiểm thử

- Dữ liệu công ty/hợp đồng khám sức khỏe dùng cho CRUD đã được dọn sạch.
- Hai phiếu vận chuyển audit còn lại do quy tắc nghiệp vụ không cho xóa khi đã rời trạng thái nháp:
  - `VC202608130001` — Đã hủy — `1187162d-ad39-49ef-ac24-01508ed6ef0f`
  - `VC202608130002` — Hoàn thành — `c97efb10-374d-4b3f-ae9a-8a54ecdddd26`

## Checklist sau triển khai

1. Gọi `GET /api/hospital-pharmacy/sales?pageIndex=0&pageSize=20`, kỳ vọng HTTP 200.
2. Mở `/v2/sms-management`, kỳ vọng dashboard hiển thị và không có page error.
3. Mở `/v2/reproductive-health`, nhập từ khóa tìm kiếm, kỳ vọng không vào ErrorBoundary.
4. In “Bệnh án tổng quát”, kỳ vọng PDF 1 trang và không có trang trắng.

Lưu ý: các 404 khi dùng token admin để audit Patient Portal và khi bác sĩ không có roster tháng được phân loại là dữ liệu/ngữ cảnh xác thực, không phải lỗi NangCap27. Các cảnh báo bundle size/codec Cornerstone của Vite là cảnh báo tồn tại sẵn, không làm build thất bại.
