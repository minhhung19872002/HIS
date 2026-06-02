---
name: core-ui-aesthetics
description: Use this portable, tech-agnostic skill when generating, refactoring, or reviewing any UI to give it deliberate aesthetic taste and visual polish — above generic "AI-slop" output — WITHOUT sacrificing usability, accessibility, or performance. Triggers include building/editing a page, screen, component, form, table, dashboard, modal, or landing page; a "make it look better / có gu thẩm mỹ hơn / less generic / more polished / pro hơn" request; or reviewing a UI diff for visual quality. Encodes craft principles (spacing scale & rhythm, typographic hierarchy, restrained color palette & contrast, alignment/grid, clear visual hierarchy with one focal action, consistency via design tokens, restraint/anti-clutter, domain-appropriate density, polished interaction states & subtle motion, microcopy tidiness) plus a UX guardrail (aesthetics never override legibility, contrast/WCAG, touch targets, focus/keyboard, affordance, or speed) and a pre-build + self-review "taste" checklist to avoid settling for the first generic layout. Tech-agnostic — bind to the project's design system (token CSS + component kit) when one exists. Do NOT use for accessibility mechanics alone (core-accessibility-pattern), bundle/render performance (his-fe-performance), or library selection (his-fe-library-policy); pair with the stack's UI skill (e.g. his-fe-page-v2 / his-fe-convention).
metadata:
  type: core
---

# Core — UI Aesthetics & Visual Taste (portable)

> TẦNG: **A · CORE** (portable, tech-agnostic, KHÔNG token tầng). Nâng UI từ **"generic / AI-slop"**
> lên **có gu thẩm mỹ** — mà **KHÔNG hại trải nghiệm** (usability/a11y/perf). Áp cho mọi dự án/stack.

## Tinh thần (chống "AI-slop")
AI mặc định cho ra UI **đại trà**: nhiều box/viền, khoảng cách tuỳ tiện, phân cấp mờ, màu loè loẹt.
"Gu" = **chủ đích + tiết chế + nhất quán**, KHÔNG nhận layout generic đầu tiên. Đẹp phục vụ **rõ ràng**,
không phải trang trí. Quy tắc vàng: **"remove until it breaks"** (bớt cho tới khi hỏng mới thôi).

## Khi nào dùng
- Tạo/sửa/review bất kỳ UI: page, màn hình, component, form, bảng, dashboard, modal, landing.
- Yêu cầu "đẹp hơn / có gu / bớt generic / pro hơn".

## Khi nào KHÔNG dùng
- Chỉ a11y cơ chế → `core-accessibility-pattern`. Hiệu năng render/bundle → `his-fe-performance`.
- Chọn thư viện → `his-fe-library-policy`. Code BE → `his-be-*`.

## 10 nguyên tắc craft (áp khi dựng UI)
1. **Spacing có thang** — dùng scale (4/8px…), KHÔNG số lẻ tuỳ tiện. Whitespace rộng rãi; **proximity**: gần = liên quan, xa = tách nhóm. Giữ vertical rhythm.
2. **Phân cấp typography** — thang cỡ giới hạn (vd 12/14/16/20/28), phân cấp bằng **size/weight/color** chứ không nhiều font; line-height 1.4–1.6; line-length 45–80 ký tự.
3. **Màu tiết chế** — 1 primary + neutral + semantic (ok/warn/crit/info); tỷ lệ ~**60/30/10**; màu **mang nghĩa**, không trang trí; tránh gradient/đổ bóng loè loẹt.
4. **Căn lề & lưới** — mọi thứ bám grid, cạnh thẳng hàng, căn quang học (optical) khi cần.
5. **Hệ phân cấp thị giác** — mỗi view **một focal action** (primary) nổi bật; secondary mờ đi (ghost/link); dùng size/contrast/vị trí dẫn mắt.
6. **Nhất quán = design token** — tái dùng token/biến (radius, shadow, border, màu, spacing) + component sẵn có; KHÔNG chế style một-lần.
7. **Tiết chế (anti-clutter)** — ít viền/box hơn (dùng spacing + nền nhạt để phân nhóm), bóng/divider **subtle**; bỏ icon/emoji/đường kẻ thừa.
8. **Mật độ hợp domain** — app nghiệp vụ/lâm sàng = **dày, hiệu quả** (như terminal `ab-*`); landing/consumer = thoáng. Match sản phẩm, đừng bê style trái domain.
9. **Trạng thái & motion** — hover/focus/active/disabled rõ; loading = skeleton/spinner; empty có hướng dẫn; transition **150–250ms ease**, có mục đích (không animation gây trễ thao tác).
10. **Microcopy & pixel** — nhãn ngắn rõ, casing nhất quán, icon căn baseline với chữ, gọn gàng tới pixel.

## UX guardrail — thẩm mỹ KHÔNG được đánh đổi (BẮT BUỘC)
- **Tương phản/đọc được** (WCAG AA: text ≥ 4.5:1) — KHÔNG chữ xám-nhạt-trên-nền-sáng "cho đẹp".
- **Target chạm** ≥ 40px, **focus/keyboard** thấy rõ, **affordance** (nút trông bấm được).
- **Hiệu năng** (không animation/shadow nặng gây giật), **đừng phá pattern quen** (vị trí nút, luồng) chỉ để khác lạ.
- Phân vân giữa "trendy đẹp" và "rõ ràng dùng được" → **chọn rõ ràng** (pair `core-accessibility-pattern`, `core-error-loading-state`).

## Checklist "taste" (trước khi dựng + self-review trước khi báo xong)
- [ ] Phân cấp rõ? Có **đúng 1 focal action**? Secondary đã mờ đi?
- [ ] Spacing theo thang? Whitespace đủ? Nhóm bằng proximity (bớt viền)?
- [ ] Palette tiết chế (≤1 primary + neutral + semantic)? Contrast đạt AA?
- [ ] Mọi cạnh thẳng hàng theo grid? Typography ≤ 4–5 bậc?
- [ ] Tái dùng token/component (nhất quán radius/shadow/border)? Không style một-lần?
- [ ] Có gì **bỏ bớt được** không (remove until it breaks)?
- [ ] Trạng thái (loading/empty/error/hover/focus) đủ + motion subtle?

## Bind vào design system của dự án (portable → cụ thể)
Khi dự án có design system: **lấy token/primitive từ đó**, đừng tự chế.
- VD **HIS**: token `ab-*` trong `frontend/src/layouts/terminal/ab-module.css` (`--t-0/--t-2`, `--line`, `--a-cy`, `--s-ok/warn/crit`, `--font-mono`…) + primitive `_v2kit` (`KpiStrip/StatusTabs/DataTable/DrawerShell/ModalShell/Btn/StatusBadge`). Áp 10 nguyên tắc **bên trong** hệ này (mật độ "terminal", màu semantic có sẵn) — KHÔNG bê style consumer/landing vào màn nghiệp vụ. Xem `his-fe-page-v2`, `his-fe-convention`.
- Dự án khác: tìm token CSS + component kit của họ, áp cùng 10 nguyên tắc + guardrail.

## Liên quan
`core-accessibility-pattern` (a11y) · `core-error-loading-state` (states) · `core-architecture-consistency` (theo tiền lệ) · `core-minimal-change` (đừng over-style) · `his-fe-page-v2` / `his-fe-convention` (áp vào HIS) · `his-fe-performance` (nếu polish gây chậm).