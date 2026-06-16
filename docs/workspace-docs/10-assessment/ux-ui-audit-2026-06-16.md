# UX/UI System Audit — 2026-06-16 (`/core-ui-ux-audit` full/systemic)

> Phương pháp: **systemic** (đọc design-system + token + theme mechanism + grep pattern toàn repo qua 155 page v2 / 124 page v1),
> KHÔNG đọc từng page lẻ. Theo `audit-protocol.md` (evidence + no-overstate). **AUDIT-FIRST — chưa sửa code.** Task: #158-#164.

## 1. Executive Summary
- **Tình trạng:** Design-system v2 có **token đầy đủ + đẹp** (`--t-0..4`/`--c-pri`/`--s-*`/`--line`/`--a-cy`) + component kit `_v2kit` + layout terminal. NHƯNG **dark mode VỠ ở tầng hệ thống** + **hardcode màu/style tràn lan**.
- **Vấn đề lớn nhất:** **Dark mode không hoạt động thật cho v2.** `ThemeContext` set `body[data-theme=dark]` + App.tsx wire Antd `darkAlgorithm`, nhưng **CSS v2 KHÔNG có 1 dòng `[data-theme=dark]`** (`terminal.css`/`ab-module.css` literal "dark" = 0) → token gốc không redefine → bật dark: **chỉ widget Antd đổi tối, toàn bộ panel/chữ/border v2 vẫn sáng** → lẫn lộn, lạc hệ, mất tương phản.
- **Root-cause lớn nhất:** Design-system v2 **author LIGHT-FIRST** (`body[data-theme="light"]` tường minh, không có cặp dark) + pages dựng bằng **inline `style={{}}` hardcode hex (578 lần/61 file, 4091 inline)** thay vì token → 3 tầng chặn dark + chặn theming/redesign sau.
- **Hướng sửa ưu tiên (root-first):** **#158** (1 block token dark — đòn bẩy cao nhất, mọi component dùng-token tự flip) → **#159** (ab-* dark) → **#161** lint-guard → **#160** migrate hex→token (mechanical, batched).

## 2. UX/UI Audit Findings
| # | Lỗi | Severity | Ảnh hưởng | Vị trí (evidence) |
|---|---|---|---|---|
| F1 | **Dark mode không redefine token gốc** | **CRITICAL** | Bật dark: v2 không đổi (chỉ Antd đổi) → lẫn lộn toàn app | `terminal.css`/`ab-module.css` grep `dark`=0; chỉ `body[data-theme="light"]` (terminal.css L520+); App.tsx:714 chỉ Antd darkAlgorithm |
| F2 | **578 hex hardcode / 61 file pages-v2** (màu KHÔNG flip dark) | **CRITICAL** | Panel `#fff` ở dark chói; chữ `#64748b` mất tương phản | grep hex pages-v2 = 578; top: `#fff`×58 `#64748b`×52 `#2563eb`×31 `#dc2626`×22 (đều trùng token có sẵn) |
| F3 | **ab-module.css (1128d, component v2 chính) 0 dark variant** | **CRITICAL** | DataTable/Btn/Badge/Tabs/Card/Modal không có dark | `grep -c dark ab-module.css` = 0 |
| F4 | **Dual design-system v1(124)/v2(155)** | **HIGH** | Antd+MainLayout vs _v2kit+ab-* → look/theming khác nhau | `pages/`=124 · `pages-v2/`=155 |
| F5 | **4091 inline `style={{}}` pages-v2** | **MEDIUM** | Style rải inline → khó theme/redesign/refactor | grep `style={{` pages-v2 = 4091 |
| F6 | State loading/empty/error/success chưa chuẩn hóa đồng bộ | LOW-MED | Một số page tự dựng, lệch nhau | (cần pass sâu per-page — task #164) |

## 3. Code Design Findings
- **Reusability ⚠️:** token + `_v2kit` tốt nhưng bị **bypass** (hardcode hex + inline) → reuse thấp thực tế. `SimpleV2Page` chỉ dùng ~15/155 page; nhiều page hand-build table/modal.
- **Maintainability ⚠️⚠️:** 4091 inline + 578 hex = sửa màu/theme phải đụng hàng trăm chỗ (không single-source).
- **Scalability ⚠️⚠️:** thêm theme mới / redesign = bất khả thi với hardcode hiện tại (F1-F3-F5).
- **Refactorability ⚠️:** dual-system v1/v2 + inline → blast radius lớn.
- **Readability ✓:** token naming tốt, _v2kit rõ.

## 4. Root Cause Analysis
- **F1/F3 (SYSTEMIC):** v2 build light-first, **thiếu hẳn lớp dark** trong design-system CSS. Sửa 1 page KHÔNG đủ → cần **1 block token dark gốc** (#158) + ab-* dark (#159). *Một abstraction (token dark) sửa được phần lớn.*
- **F2/F5 (SYSTEMIC):** không có **guard/lint** chặn hardcode + pattern "copy inline style" lan truyền (kể cả code mới). → cần lint-rule (#161) + migrate (#160) + extract shared (#162). *Không có guard = tái phát.*
- **F4 (SYSTEMIC):** migration v1→v2 chưa xong (memory `feedback_new-feature-v2-only` đã chốt v2-only nhưng 124 v1 còn). → inventory + plan (#163).

## 5. Task Plan (đã tạo Issue)
| Task | Severity | Thứ tự | Dependency |
|---|---|---|---|
| #158 Dark token foundation | CRITICAL | **1** | none |
| #159 ab-* dark variants | CRITICAL | 2 | #158 |
| #161 Lint-guard hardcode màu | HIGH | 3 | sau #160 |
| #160 Migrate 578 hex→token | HIGH | 4 (batched) | #158 |
| #162 Giảm inline-style → shared | MEDIUM | 5 | #158/#160 |
| #163 Khử dual-system v1/v2 (plan) | MEDIUM | 6 | #158 |
| #164 Chuẩn hóa state (loading/empty/error/success) | LOW-MED | 7 | none |

**Đề xuất bắt đầu:** #158 (rủi-ro thấp, đòn bẩy cao nhất — 1 block CSS bật dark cho mọi component dùng-token).

## 6. Implementation
CHƯA — audit-first. Sửa sau khi user duyệt plan + chọn task (#158 trước).

## 7. Final Review (sơ bộ)
- Blind-spot/cần pass sâu hơn: contrast WCAG đo bằng công cụ (mới grep-level); per-page visual nuance (155 page) chưa soi từng cái — #164 + spot-check khi fix; responsive/a11y keyboard chưa đo sâu (follow-up nếu cần).
- Mobile portal (`portal-mobile.css`) CÓ dark riêng — tách biệt, không trong scope v2 chính.
