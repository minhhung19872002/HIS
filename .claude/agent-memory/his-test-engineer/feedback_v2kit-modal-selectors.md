---
name: v2kit-modal-selectors
description: Selectors đúng cho _v2kit ModalShell và DrawerShell trong Playwright — tránh dùng role=dialog/heading
metadata:
  type: feedback
---

ModalShell (_v2kit) render qua `createPortal` — KHÔNG dùng `role=dialog` hay `role=heading`.

**Selectors đúng:**
- Overlay: `.hui-modal-wrap` (visible khi modal mở)
- Title: `.hui-modal-h .tt` → dùng `.toContainText()`
- Body: `.hui-modal-b` → scope locator vào đây để tránh match `<option>` hidden bên ngoài
- Footer buttons: `.hui-modal-f button`
- Cancel nút: `.hui-modal-f button:has-text("Hủy")`

**DrawerShell:** render `.hui-drawer-wrap` (tương tự pattern).

**Why:** ModalShell dùng `createPortal` → render vào `<body>`, không có ARIA role. Playwright `getByText('Nhóm máu')` match cả `<option value="">▾ Nhóm máu</option>` trong `<select>` hidden → luôn scope locator vào `.hui-modal-b` khi assert form labels trong modal.

**Antd Modal (OfficialDocuments):** title render trong `.ant-modal-title` — KHÔNG phải `role=heading`. Dùng `page.locator('.ant-modal-title').first()`.

**How to apply:** Mọi test liên quan đến ModalShell/_v2kit → dùng `.hui-modal-wrap` để check open/close, `.hui-modal-b` để scope form fields.

[[feedback-test-patterns]]
