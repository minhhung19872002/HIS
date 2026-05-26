# Checklist phân tích tác động (soi trước khi sửa)

## "Thứ ăn theo" cần Grep/Read
- [ ] **Callers** trực tiếp ký hiệu/hàm/component.
- [ ] **Consumer khác layer** (FE gọi BE / BE bị FE phụ thuộc) — contract xuyên tầng.
- [ ] **Test** tham chiếu (unit/e2e/api) — sẽ đỏ nếu đổi.
- [ ] **Migration / seed / schema** nếu đụng DB.
- [ ] **DI registration** nếu thêm/đổi service (quên = 500).
- [ ] **Config / env / feature flag** liên quan.
- [ ] **Doc / work-log** mô tả hành vi cũ (cập nhật nếu cần).

## Phân loại thay đổi
- **Additive / backward-compatible** → an toàn, ưu tiên.
- **Breaking** (rename/remove/đổi kiểu/đổi chữ ký) → phải cập nhật ĐỒNG THỜI mọi dependent trong cùng thay đổi.

## Lệnh điển hình
```
Grep "<symbolName>"            # call-site khắp repo
Grep "<route|endpoint>"        # consumer của API
Grep "<fieldName>"             # nơi map DTO/field (cả FE + BE)
Glob "**/*.test.*|**/*.cy.ts"  # test liên quan
```

## Cổng nâng cẩn trọng
Đụng **patient-safety / audit / tiền / schema / xoá-ghi đè** → cân nhắc hỏi (`core-requirement-clarify`) trước khi sửa.
