# 10 — Tham chiếu MQSoft (CỐT LÕI)

**Có gì:** toàn bộ tài liệu sản phẩm vendor **MQSoft** — *cùng một corpus ở 3 dạng*: PDF gốc, tri thức Markdown
đã chắt lọc, và ảnh từng trang. Đây là sản phẩm HIS tham chiếu để học nghiệp vụ + đối chiếu chức năng.

**Dùng để làm gì:** tra cứu nghiệp vụ/chức năng chuẩn của một HIS thực tế; làm cơ sở đối chiếu khi xây sản phẩm
của ta ([`../00-san-pham-cua-ta/`](../00-san-pham-cua-ta/)) và khi đóng gap thầu ([`../20-yeu-cau-nang-cap/`](../20-yeu-cau-nang-cap/)).

## Cấu trúc

| Thư mục | Có gì | Dùng khi |
|---|---|---|
| [`1-goc-pdf/`](1-goc-pdf/) | 36 PDF gốc (HDSD EMR · HIS-LIS · PACS-RIS · giới thiệu · giải pháp) | cần bản gốc đầy đủ, hình ảnh chuẩn |
| [`2-da-chat-loc-md/`](2-da-chat-loc-md/) | 25 file `.md` chắt lọc (AI thao tác trực tiếp) + [`00-muc-luc-tri-thuc.md`](2-da-chat-loc-md/00-muc-luc-tri-thuc.md) | tra cứu nhanh, để AI hỗ trợ build |
| [`3-anh-trang/`](3-anh-trang/) | Ảnh từng trang: `full/` (~672) · `thumb/` (9) | xem trực quan trang cụ thể |

## Quy trình chuẩn hóa (PDF → MD)
1. Tài liệu thô vào `1-goc-pdf/` (+ ảnh trang `3-anh-trang/`).
2. Chắt lọc nội dung → file `.md` trong `2-da-chat-loc-md/`, cập nhật `00-muc-luc-tri-thuc.md`.
3. Ưu tiên dạng `.md` cho mọi tra cứu/đối chiếu về sau (PDF chỉ là bản gốc đối chứng).
