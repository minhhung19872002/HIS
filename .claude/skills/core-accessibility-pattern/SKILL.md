---
name: core-accessibility-pattern
description: Use this skill (portable, tech-agnostic) when building or auditing any UI for accessibility — keyboard navigation, focus management, ARIA roles/labels, color contrast, form-field labels, screen-reader text, and reduced-motion. Triggers include adding a page/form/modal/table/chart, "làm UI dễ tiếp cận / a11y / WCAG", contrast/keyboard/focus issues, or a clinical screen used by staff with varied abilities. Reusable across any web project. Do NOT use for bundle/render performance (his-fe-performance) or stack-specific component mechanics (his-fe-page-v2 implements the concrete components).
metadata:
  type: project
---

# Core — Accessibility Pattern (portable, WCAG)

> TẦNG: **A · CORE** (portable, tech-agnostic). Checklist a11y áp cho mọi UI. Hệ HIS dùng cả ngày
> bởi nhân viên y tế (điều dưỡng, BS, thu ngân, thanh tra) → bàn phím + tương phản + nhãn rõ là yêu cầu thực dụng, không chỉ tuân thủ.

## Khi nào dùng
- Thêm/sửa page, form, modal/drawer, bảng, chart, hoặc luồng nhập liệu lâm sàng.
- Có phản hồi: khó dùng bằng bàn phím, chữ mờ/tương phản kém, screen reader đọc sai/thiếu.

## Khi nào KHÔNG dùng
- Tối ưu bundle/re-render → `his-fe-performance`.
- Cơ chế component cụ thể (KpiStrip/DataTable/Drawer) → `his-fe-page-v2` (skill này chỉ đặt YÊU CẦU a11y, không dựng component).

## Checklist a11y (áp khi build/review UI)

**Bàn phím & focus**
- Mọi thao tác làm được bằng chuột phải làm được bằng bàn phím (Tab/Shift-Tab/Enter/Esc).
- Phần tử bấm được là `<button>`/`<a>` thật (hoặc `role` + `tabIndex={0}` + handler `onKeyDown` Enter/Space) — KHÔNG `div onClick` trơ.
- Modal/Drawer: focus vào trong khi mở, Esc đóng, trả focus về nút trigger khi đóng, focus không thoát ra nền (focus trap).
- Thứ tự Tab theo thứ tự đọc; không bẫy focus ngoài ý muốn.

**Ngữ nghĩa & screen reader**
- HTML ngữ nghĩa: heading theo cấp (`h1>h2>h3`), `<table>` cho dữ liệu bảng, `<label>` gắn `htmlFor` cho mọi input.
- Nút chỉ-icon phải có `aria-label`/`title` (vd nút In/Xoá/Sửa trong row action).
- Trạng thái động báo bằng `aria-live` (toast lỗi/thành công, loading) để screen reader nghe được.
- Ảnh thông tin có `alt`; ảnh trang trí `alt=""`.

**Thị giác**
- Tương phản chữ/nền ≥ 4.5:1 (text thường), ≥ 3:1 (text lớn/icon) — kiểm token màu của design system.
- KHÔNG dùng MÀU làm tín hiệu duy nhất (vd cảnh báo đỏ phải kèm chữ/icon — quan trọng với chỉ số XN bất thường).
- Tôn trọng `prefers-reduced-motion`: tắt animation mạnh (blink, auto-scroll) khi user yêu cầu.

**Form & lỗi**
- Lỗi validate gắn với field (`aria-invalid` + thông báo cạnh field), không chỉ toast chung.
- Field bắt buộc đánh dấu rõ (text + `aria-required`), không chỉ dấu sao màu.

## Quy trình áp dụng
1. Build UI/route theo `his-fe-page-v2` như bình thường.
2. Rà theo checklist trên (ưu tiên: keyboard + label + contrast).
3. Kiểm nhanh: Tab xuyên màn hình bằng bàn phím; zoom 200% không vỡ; (tuỳ chọn) chạy axe DevTools.

## Pitfalls
- **Icon-button không nhãn** → screen reader đọc "button" trống; row action HIS hay mắc.
- **Modal không trả focus** → user bàn phím "lạc" sau khi đóng.
- **Tương phản theme tối** — chữ xám trên nền tối thường < 4.5:1; kiểm token, đừng đoán.
- **Over-ARIA** — thêm `role`/`aria-*` thừa lên HTML đã ngữ nghĩa làm hại hơn lợi; ưu tiên HTML đúng trước.

## When to update
- Khi nâng chuẩn WCAG đích, đổi design tokens màu, hoặc thêm pattern UI mới (vd lịch, biểu đồ tương tác).
