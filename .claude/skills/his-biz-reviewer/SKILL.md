---
name: his-biz-reviewer
description: Use this skill as the PROTOCOL engine for business domain review in HIS before any code task. Read it WHENEVER a code task touches an OPD, Billing, EMR, Laboratory, Inpatient, Pharmacy, or Radiology module. Enforces 5-phase pipeline: domain identification → workflow review → business rule review → cross-module impact → compliance check (Bộ Y Tế/BHYT) → self-critic (6 roles: BA HIS, Trưởng khoa, Điều dưỡng, Thu ngân, Dược sĩ, BHYT specialist). Gate: confidence < 80% → STOP + ask mandatory questions, do NOT generate code. Proactively scans for adjacent business logic errors during fix tasks and warns the user. Read together with his-biz-<module> for domain knowledge. Do NOT use for pure UI tweaks (color/label/spacing) with zero business logic change.
metadata:
  type: project
---

# HIS Business Domain Reviewer — Protocol

Nghiệp vụ trước. Code sau.

## When to use
- Mọi code task chạm HIS module: OPD, Billing, EMR, Laboratory, Inpatient, Pharmacy, Radiology, Administration
- Khi fix bug: vừa sửa vừa scan nghiệp vụ lân cận và cảnh báo
- Khi thêm tính năng: xác nhận workflow + business rule trước khi code

## When NOT to use
- Pure UI tweak (màu, spacing, rename label) không có business logic change
- Pure rename/refactor không đổi behavior

---

## Phase 3 — Activate on Request

Khi nhận task, thực hiện theo thứ tự:

1. **Xác định module** — OPD / Billing / EMR / Lab / Inpatient / Pharmacy / Radiology
2. **Đọc `his-biz-<module>`** — lấy domain knowledge (workflow + rules)
3. **Map request vào workflow** — bước nào trong luồng chuẩn?
4. **Kiểm tra business rules** liên quan đến thay đổi
5. **Đánh giá cross-module impact** — LIS/RIS/Billing/Pharmacy có bị ảnh hưởng không?
6. **Kiểm tra compliance** — Bộ Y Tế / BHYT / bệnh án điện tử

---

## Phase 4 — Business Evaluation (bắt buộc xuất trước khi code)

```
## [DOMAIN REVIEW] <Tên module>

### Chức năng thuộc phân hệ
<module + sub-workflow cụ thể>

### Luồng hiện tại (Current flow)
<quan sát từ code — không đoán>

### Luồng đề xuất (Proposed flow)
<luồng đúng theo domain knowledge>

### Thiếu gì (What's missing)
<bước/rule chưa implement>

### Sai gì (What's wrong)
<implementation vi phạm business rule>

### Business Rules cần có
- Rule 1: <tên rule> — <mô tả>
- Rule 2: ...

### ⚠️ Phát hiện ngoài phạm vi (Proactive findings)
<lỗi/thiếu nghiệp vụ phát hiện khi đọc code, ngoài task ban đầu>
→ Đề xuất fix: <hướng sửa ngắn gọn>

### Rủi ro (Risks)
<patient safety / compliance / data integrity>

### Ảnh hưởng các module khác
<LIS/RIS/Billing/Pharmacy/EMR bị ảnh hưởng thế nào>

### Mức độ sẵn sàng (Confidence): XX%
<lý do nếu < 80%>
```

---

## Phase 5 — Confidence Gate (HARD BLOCK)

**Confidence ≥ 80%** → tiếp tục code. Ghi rõ assumptions.

**Confidence < 80%** → **DỪNG HOÀN TOÀN**. Không sinh code.

Format block bắt buộc:
```
[DOMAIN REVIEW] Confidence: XX% — Chưa đủ để code

Cần làm rõ:
1. <câu hỏi cụ thể về business rule>
2. <câu hỏi về exception handling>
→ Vui lòng trả lời trước khi tiếp tục.
```

---

## Self-Critic Mode (cuối Phase 4)

Sau khi hoàn thành assessment, đánh giá nhanh từ góc nhìn:

| Vai trò | Câu hỏi phản biện |
|---|---|
| BA HIS | Luồng đủ bước? Thiếu màn hình nào? |
| Trưởng khoa | Quy trình có đúng thực tế bệnh viện? |
| Điều dưỡng | Thao tác thuận tiện? Bước nào dư thừa? |
| Thu ngân | Tính tiền đúng chưa? BHYT apply đúng chưa? |
| Dược sĩ | Đơn thuốc hợp lệ không? Toa đủ thông tin chưa? |
| Chuyên gia BHYT | Vi phạm quy định thanh toán BHYT không? |

Nếu bất kỳ vai trò nào phát hiện rủi ro nghiệp vụ → flag trong assessment + giảm confidence score.

---

## Proactive Scanning Rule (FIX TASKS)

Khi đọc code để fix tính năng nhỏ/vừa, nếu gặp:
- Thiếu state transition
- Bỏ qua business rule check (vd: không validate BHYT, không check ICD-10)
- Sai logic tính toán
- Thiếu audit log
- Workflow chưa hoàn chỉnh (vd: payment trước khi có kết quả CLS)
- Thiếu permission check

→ **BẮT BUỘC liệt kê** trong section `⚠️ Phát hiện ngoài phạm vi`
→ **Đề xuất hướng sửa** cho mỗi phát hiện
→ **Hỏi user** có muốn sửa ngay hay tạo task sau

---

## When to update
- Khi Thông tư/Nghị định mới thay đổi business rule
- Khi phát hiện workflow exception mới qua testing
- Khi thêm HIS module mới
