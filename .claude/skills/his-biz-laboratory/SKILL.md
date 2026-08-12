---
name: his-biz-laboratory
description: Use this skill for HIS Laboratory (LIS) domain knowledge when working on Laboratory.tsx, SampleReceive.tsx, SampleTracking.tsx, AnalyzerInbox.tsx, CultureCollection.tsx, LISConfig.tsx, LisCatalogAdmin.tsx, ReagentManagement.tsx, or any LIS code task. Contains: LIS workflow (order → receive → process → validate → result → deliver), sample tracking rules, result validation (delta check, critical value), culture workflow, analyzer integration, BHYT lab coverage. Always read together with his-biz-reviewer. Do NOT use for Radiology/PACS imaging (different workflow).
metadata:
  type: project
---

# HIS Domain Knowledge — Laboratory (LIS)

Đọc cùng `his-biz-reviewer` để chạy Phase 3-5 analysis trước khi code.

## Module Overview

**Mục đích:** Quản lý toàn bộ quy trình xét nghiệm: từ nhận order → thu mẫu → phân tích → trả kết quả.

**Actors:**
- Bác sĩ (Doctor): ra chỉ định xét nghiệm (order)
- Điều dưỡng / KTV lấy mẫu (Phlebotomist): thu mẫu bệnh nhân
- Kỹ thuật viên xét nghiệm (Lab Technician): thực hiện phân tích
- Bác sĩ xét nghiệm / Trưởng khoa XN (Lab Doctor): validate kết quả, ký duyệt
- Hệ thống máy phân tích (Analyzer): gửi kết quả tự động (HL7/ASTM)

---

## Workflow Catalog

### Luồng chuẩn — Xét nghiệm thông thường
```
Bác sĩ ra chỉ định (Lab Order)
  → Hệ thống tạo Order với mã barcode duy nhất
  → Điều dưỡng/KTV in nhãn barcode → gán nhãn vào ống mẫu

Thu mẫu (Sample Collection)
  → KTV lấy mẫu bệnh nhân
  → Scan barcode xác nhận → trạng thái COLLECTED

Nhận mẫu tại Lab (Sample Receive)
  → Lab scan nhận mẫu → trạng thái RECEIVED
  → Kiểm tra điều kiện mẫu (loại ống, thể tích, bảo quản)
  → Reject mẫu nếu không đạt → yêu cầu lấy lại

Phân tích (Processing)
  → Đưa mẫu vào máy phân tích hoặc làm thủ công
  → Máy gửi kết quả qua HL7/ASTM → Analyzer Inbox
  → KTV nhận kết quả từ Analyzer Inbox

Kiểm tra kết quả (Validation)
  → KTV kiểm tra delta check (so sánh với kết quả trước)
  → Kiểm tra critical value (giá trị nguy hiểm)
  → Bác sĩ XN verify và ký duyệt

Trả kết quả (Result Delivery)
  → Kết quả available trên HIS
  → Thông báo tự động đến bác sĩ điều trị
  → Bác sĩ điều trị review kết quả trong bệnh án
```

### Luồng cấy vi khuẩn (Culture)
```
Nhận mẫu nuôi cấy (blood, urine, wound, CSF...)
  → Cấy vào môi trường
  → Ủ 24-72h (hoặc lâu hơn với TB)
  → Đọc kết quả sơ bộ sau 24h → cập nhật interim result
  → Kết quả kháng sinh đồ (sensitivity) sau 48-72h
  → Bác sĩ XN ký kết quả cuối
→ KHÔNG trả kết quả một lần — phải có quy trình interim/final
```

### Luồng ngoại lệ
- **Mẫu bị reject**: ghi lý do, thông báo bác sĩ, yêu cầu lấy mẫu lại
- **Critical value**: ngay lập tức thông báo (phone call + ghi log) đến bác sĩ điều trị
- **Repeat test**: khi kết quả bất thường — KTV có thể làm lại trước khi trả
- **Add-on test**: thêm xét nghiệm vào mẫu đã lấy (nếu mẫu còn đủ)

---

## Business Rule Catalog

### Bắt buộc
| Rule | Mô tả |
|---|---|
| R1 | Mỗi order có mã barcode duy nhất — không được trùng |
| R2 | Mẫu chỉ được nhận khi có order từ bác sĩ — không walk-in không order |
| R3 | Kết quả PHẢI được bác sĩ XN ký trước khi trả cho bác sĩ điều trị |
| R4 | Critical value phải được thông báo NGAY LẬP TỨC và ghi log ai thông báo lúc nào |
| R5 | Reject mẫu phải ghi đủ: lý do, ai reject, thời gian |
| R6 | Delta check: so sánh với kết quả trước đó trong 30 ngày — cảnh báo nếu chênh lệch > ngưỡng |
| R7 | Kết quả đã ký không được sửa — chỉ được tạo kết quả bổ sung (amended report) |

### Điều kiện
| Rule | Điều kiện | Xử lý |
|---|---|---|
| R8 | BHYT | Chỉ các xét nghiệm trong danh mục BHYT mới được apply BHYT |
| R9 | Cấy vi khuẩn | Phải có interim result trước final result |
| R10 | Add-on test | Chỉ cho phép khi mẫu chưa bị hủy và đủ thể tích |
| R11 | Xét nghiệm cấp cứu (STAT) | Ưu tiên xử lý trước — có flag riêng, TAT < 1h |

### Thời gian xử lý (TAT — Turnaround Time)
| Loại xét nghiệm | TAT chuẩn |
|---|---|
| CBC (công thức máu) | < 1h |
| Sinh hóa thông thường | < 2h |
| Cấy vi khuẩn sơ bộ | < 24h |
| Kháng sinh đồ | < 48-72h |
| Xét nghiệm STAT | < 1h |

---

## State Machine — Lab Order

```
ORDERED (bác sĩ chỉ định)
  → [KTV gắn nhãn] → LABELED
  → [KTV lấy mẫu] → COLLECTED
  → [Lab nhận mẫu] → RECEIVED
  → [Mẫu không đạt] → REJECTED (→ yêu cầu lấy lại → ORDERED mới)
  → [Đang phân tích] → IN_PROGRESS
  → [Có kết quả từ máy] → RESULT_PENDING
  → [Bác sĩ XN ký] → VALIDATED
  → [Kết quả trả về HIS] → RESULTED

CANCELLED (từ ORDERED/LABELED — trước khi lấy mẫu, bác sĩ hủy)
AMENDED (sau RESULTED, bác sĩ XN thêm ghi chú/đính chính)
```

---

## Integration Points

| Module | Chiều | Dữ liệu |
|---|---|---|
| OPD / Inpatient | → LIS | Lab order (test type, priority, patient context) |
| LIS | → OPD/Inpatient | Kết quả xét nghiệm (structured data) |
| Analyzer (HL7/ASTM) | → LIS | Raw results từ máy phân tích |
| Billing | ← LIS | Danh sách xét nghiệm đã thực hiện để tính tiền |
| EMR | ← LIS | Kết quả đính kèm vào bệnh án |
| BHYT | ← LIS | Mã xét nghiệm để claim BHYT |

---

## Compliance References

- **Thông tư 14/2020/TT-BYT**: Quy định danh mục xét nghiệm BHYT
- **TCVN ISO 15189**: Tiêu chuẩn phòng xét nghiệm y tế
- **QĐ 1631/QĐ-BYT**: Hướng dẫn quy trình kỹ thuật xét nghiệm
- **ASTM E1381 / HL7 v2.x**: Giao thức truyền dữ liệu từ máy phân tích

## Common Mistakes Found in Code

- Trả kết quả chưa được bác sĩ XN ký (R3 violation)
- Không ghi log khi thông báo critical value (R4 violation)
- Cho phép sửa kết quả đã ký thay vì tạo amended report (R7 violation)
- Culture workflow: trả final result mà không có interim result trước
- Analyzer Inbox: không xử lý trường hợp máy gửi kết quả trùng lặp (duplicate)
- Không validate đủ điều kiện mẫu trước khi nhận (loại ống sai, mẫu vỡ)

## When to update
- Khi tích hợp loại máy phân tích mới
- Khi danh mục xét nghiệm BHYT thay đổi
- Khi phát hiện lỗ hổng delta check qua testing
