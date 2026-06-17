# v2 Theming — dùng CSS token, KHÔNG hardcode màu hex

> Bối cảnh: UI-AUDIT (#158–#165). Dark-mode v2 chỉ flip đúng khi component **dùng token**,
> không hardcode `#hex`. Lint-guard `#161` cảnh báo mọi hex literal trong `pages-v2/` + `components/`.

## Quy tắc
- **Màu nền / chữ / viền / state** → luôn dùng `var(--token)`, KHÔNG viết `#fff`, `#0f172a`, `#16a34a`...
- Token gốc định nghĩa ở `terminal.css` (`:root` = light; `body[data-theme="dark"]` redefine cho dark — #158).
- ab-* component dùng token ở `ab-module.css` (#159).

## Bảng token hay dùng
| Mục đích | Token | Ghi chú |
|---|---|---|
| Nền sâu / panel | `--bg`, `--d-1`, `--d-2` | nền theo lớp |
| Chữ | `--t-0` (đậm nhất) → `--t-4` (mờ) | hierarchy |
| Đường kẻ | `--line`, `--line-2` | border |
| Primary | `--c-pri`, `--a-cy` | accent |
| State chữ | `--s-crit-tx` `--s-warn-tx` `--s-ok-tx` `--s-info-tx` | light=đậm, dark=sáng |
| State nền | `--s-crit` `--s-warn` `--s-ok` `--s-info` (+ `-bg`) | badge/banner |

## Khi THẬT SỰ cần hardcode (whitelist)
Chỉ các trường hợp KHÔNG theo theme: **chart series** (recharts), **brand-color** (logo/ngân hàng),
**biểu mẫu in A4** (màu giấy/mực), **DICOM overlay**, **standalone portal**. Khi đó thêm comment ngay trên dòng:

```tsx
// eslint-disable-next-line no-restricted-syntax -- chart series cố định xuyên theme
const COLORS = ['#0891b2', '#db2777', '#ea580c'];
```

Các file print/dicom-viewer/standalone-portal đã được `eslint.config.js` ignore sẵn (không cần disable từng dòng).

## Utility classes giảm inline-style (#162)
Inline-style lặp ≥3 → dùng utility class (`ab-module.css`, mỗi class emit CSS y hệt inline → byte-identical):

| className | thay cho | className | thay cho |
|---|---|---|---|
| `ab-u-wfull` | `width:'100%'` | `ab-u-strong` | `fontWeight:600,color:t-0` |
| `ab-u-flex1` | `flex:1` | `ab-u-meta` | `fontSize:11,color:t-2` |
| `ab-u-mono` | `fontFamily:mono` | `ab-u-meta-mono` | meta + mono |
| `ab-u-muted` | `color:t-2` | `ab-u-meta12` | `fontSize:12,color:t-2` |
| `ab-u-faint` | `color:t-3` | `ab-u-b` | `fontWeight:600` |
| `ab-u-accent` | `color:a-cy` | `ab-u-fg` | `color:t-0` |
| `ab-u-crit`* | `color:s-crit` | `ab-u-bt` | `borderTop:1px solid line` |

> *KHÔNG dùng `ab-u-crit` (hay utility-color) trên `<Btn>`/`.ab-btn`: `.ab-btn:hover` (specificity cao hơn) sẽ
> ghi đè màu khi hover → giữ INLINE `style={{color:'var(--s-crit)'}}` cho nút (giống `ActBtn`).

Khi có element đã có `className` → merge: `className="mono ab-u-muted"`. Element có `className` ĐỘNG → giữ inline.

## Lộ trình lint-guard (#161 → #165)
- **Hiện tại:** rule mức `warn` — `npm run lint` vẫn xanh, hex cũ hiện dưới dạng warning (backlog #165).
- **Sau khi #165 dọn hết ~270 hex residual off-palette:** flip rule sang `error` + gỡ phần `ignores` không cần,
  để mọi hex mới làm fail lint.
