# Checklist phạm vi tối thiểu (YAGNI)

## Trước khi viết
- [ ] Phát biểu 1 câu: "Thay đổi NHỎ NHẤT để yêu cầu đạt done là …".
- [ ] Liệt kê file CHẮC CHẮN phải đụng. File khác = ngoài phạm vi.
- [ ] Có abstraction/option/tham số nào "cho tương lai" không? → bỏ.
- [ ] Có tiền lệ trong codebase để bám theo không? → bám, đừng phát minh.

## Tín hiệu "ĐANG LÀM QUÁ" (dừng lại)
- Định "nhân tiện" refactor / đổi tên / format ngoài yêu cầu.
- Thêm generic/`options`/config/flag chưa ai cần.
- Tạo abstraction song song với cái đã có (vi phạm reuse).
- Đụng file/khu vực không liên quan trực tiếp.
- Diff lớn bất thường so với độ phức tạp yêu cầu.

## Soi diff cuối
- [ ] Mỗi dòng đổi phục vụ TRỰC TIẾP yêu cầu? Không → bỏ.
- [ ] Feature / refactor / format đã TÁCH riêng (không trộn)?
- [ ] Nợ kỹ thuật phát hiện được → ghi **đề xuất riêng**, không sửa kèm.

## Nguyên tắc
đủ-đúng-an-toàn trước → rồi mới tối thiểu. Ưu tiên maintainability thực dụng hơn hoàn hảo lý thuyết.
