# 🗺️ BẢN ĐỒ TÀI LIỆU YÊU CẦU — HIS

> Vùng requirements là **bản đồ xây dựng sản phẩm HIS**: nơi tập trung *đích cần đạt*, *tài liệu tham chiếu*,
> *spec tính năng* và *mẫu nghiệp vụ* để đảm bảo chất lượng + nâng giá trị sản phẩm khi ra thị trường.
> Quy ước: thư mục đánh số `00→90` (thứ tự đọc), tên tiếng Việt tự mô tả, mỗi vùng có `README.md` riêng.

## Đọc theo thứ tự

| Vùng | Có gì | Dùng để làm gì |
|---|---|---|
| [`00-san-pham-cua-ta/`](00-san-pham-cua-ta/) | Đặc tả yêu cầu sản phẩm HIS **của ta** | **ĐÍCH** — chốt phạm vi/tính năng ta xây |
| [`10-tham-chieu-mqsoft/`](10-tham-chieu-mqsoft/) | Tài liệu sản phẩm vendor **MQSoft** (PDF gốc + MD chắt lọc + ảnh trang) | **CỐT LÕI** — học/đối chiếu sản phẩm tham chiếu |
| [`20-yeu-cau-nang-cap/`](20-yeu-cau-nang-cap/) | Gói nâng cấp/thầu **NangCap1-24** | **SPEC** — driver tính năng cần đóng |
| [`30-bieu-mau-nghiep-vu/`](30-bieu-mau-nghiep-vu/) | Biểu mẫu bệnh án chuyên khoa | **MẪU** — biểu mẫu cần triển khai/in |
| [`90-phan-tich-doi-thu/`](90-phan-tich-doi-thu/) | Tài liệu + script bóc tách của đối thủ | **THAM KHẢO** — phân tích cạnh tranh |

## Nguyên tắc

- **Cốt lõi = `10-tham-chieu-mqsoft/`** (PDF gốc + tri thức MD) — nơi chuẩn hóa dần PDF/ảnh → Markdown.
- Mỗi vùng tách rõ **`*-goc-pdf` (thô)** ↔ **`*-da-chat-loc-md` (đã xử lý, AI thao tác trực tiếp)**.
- Khi thêm tài liệu mới: đặt vào đúng vùng theo *vai trò* (đích / tham chiếu / spec / mẫu / đối thủ), cập nhật README vùng.
- Lộ trình: chuyển dần PDF/image → `.md` trong `2-da-chat-loc-md/` để dễ tra cứu + để AI hỗ trợ build.
