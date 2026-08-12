---
name: his-biz-opd
description: Use this skill for HIS OPD (Outpatient Department) domain knowledge when working on Consultation, DoctorPortal, PrescriptionEditor, or any OPD-related code task. Contains: OPD workflow catalog (đăng ký → khám → CLS → kê đơn → thanh toán → nhận thuốc), business rule catalog (BHYT, ICD-10, kê đơn Thông tư 52), state machine (visit states), integration points (LIS/RIS/Billing/Pharmacy). Always read together with his-biz-reviewer for the analysis protocol. Do NOT use for inpatient admission workflows (use his-biz-inpatient).
metadata:
  type: project
---

# HIS Domain Knowledge — OPD (Ngoại Trú)

Đọc cùng `his-biz-reviewer` để chạy Phase 3-5 analysis trước khi code.

## Module Overview

**Mục đích:** Quản lý toàn bộ quy trình khám bệnh ngoại trú từ đăng ký đến nhận thuốc.

**Actors:**
- Nhân viên tiếp nhận (Reception): đăng ký bệnh nhân, verify BHYT
- Bác sĩ (Doctor): khám, chẩn đoán, chỉ định CLS, kê đơn
- Điều dưỡng (Nurse): đo sinh hiệu, hỗ trợ khám, nhập triage
- Thu ngân (Cashier): tính tiền, apply BHYT, thu tiền
- Dược sĩ (Pharmacist): cấp phát thuốc, kiểm tra đơn

---

## Workflow Catalog

### Luồng chuẩn (Standard)
```
Đăng ký (Register)
  → Tiếp nhận tạo hồ sơ bệnh nhân (nếu mới) hoặc tìm hồ sơ cũ
  → Verify BHYT (còn hạn? đúng tuyến?)
  → Tạo lượt khám (Visit) với mã phiếu duy nhất

Triage (Điều dưỡng)
  → Đo sinh hiệu, phân loại ưu tiên

Khám bệnh (Examination)
  → Bác sĩ nhập triệu chứng, chẩn đoán, mã ICD-10 (BẮT BUỘC)
  → Chỉ định CLS nếu cần (Lab order → LIS / Imaging order → RIS)

Cận lâm sàng (nếu có)
  → Bệnh nhân đến Lab / CĐHA thực hiện
  → Kết quả trả về phòng khám
  → Bác sĩ review kết quả → bổ sung/điều chỉnh chẩn đoán

Kê đơn (Prescribe)
  → Bác sĩ kê đơn thuốc (tên generic/biệt dược, hàm lượng, số lượng, cách dùng)
  → Hệ thống kiểm tra quy tắc BHYT đơn thuốc

Thanh toán (Payment)
  → Thu ngân tính tổng: dịch vụ khám + CLS + thuốc
  → Apply BHYT nếu đủ điều kiện
  → Bệnh nhân thanh toán phần cùng chi trả

Nhận thuốc (Dispensing)
  → Dược sĩ cấp phát theo đơn đã thanh toán
  → Cập nhật tồn kho thuốc
```

### Luồng thay thế (Alternative)
- **Bệnh nhân tự nguyện (không BHYT)**: bỏ bước verify BHYT, tính toàn phần
- **Cấp cứu nhẹ**: bỏ qua triage bình thường, vào thẳng phòng khám cấp cứu
- **Tái khám**: tìm lượt khám cũ, chỉ tạo visit mới không cần tạo hồ sơ
- **Chuyển viện đến**: cần nhận hồ sơ chuyển viện, kèm bản tóm tắt bệnh án

### Luồng ngoại lệ (Exception)
- **BHYT hết hạn**: thông báo, cho chọn tự nguyện hoặc dừng
- **Trái tuyến**: áp dụng % thanh toán thấp hơn (40-70% tùy tuyến)
- **Bệnh nhân từ chối nhập viện**: ghi chú vào hồ sơ, ký xác nhận từ chối
- **Bệnh nhân không thanh toán được**: ghi nợ (chỉ với policy bệnh viện cho phép)

---

## Business Rule Catalog

### Bắt buộc (Mandatory)
| Rule | Mô tả | Nguồn |
|---|---|---|
| R1 | Mã ICD-10 BẮT BUỘC khi có chẩn đoán | TT 46/2018/TT-BYT |
| R2 | Đơn thuốc BHYT ngoại trú ≤ 30 ngày/lần (trừ bệnh mãn tính theo phác đồ) | TT 52/2017/TT-BYT |
| R3 | Verify BHYT (còn hạn + đúng tuyến) TRƯỚC khi apply BHYT | QĐ 1985/QĐ-BHXH |
| R4 | Mỗi lượt khám có 1 mã phiếu duy nhất trong ngày | Quy trình BV |
| R5 | Chỉ định CLS phải từ bác sĩ — không cho tự order | Quy trình BV |
| R6 | Thanh toán chỉ được thực hiện TRƯỚC CLS (đặt cọc) hoặc SAU khi có kết quả CLS | TT 39/2018/TT-BYT |
| R7 | Kê đơn điện tử phải có chữ ký số bác sĩ | TT 52/2017/TT-BYT Điều 4 |

### Điều kiện (Conditional)
| Rule | Điều kiện | Hành động |
|---|---|---|
| R8 | Bệnh mãn tính có xác nhận | Cho phép kê đến 90 ngày/lần |
| R9 | Thuốc gây nghiện/hướng thần | Kê đơn đặc biệt, giới hạn 7-10 ngày |
| R10 | Trái tuyến huyện→tỉnh | BHYT chi trả 70% |
| R11 | Trái tuyến huyện→TW | BHYT chi trả 40% |
| R12 | Cùng chi trả BHYT | BN chi trả 5-20% tùy nhóm đối tượng |

### Phân quyền (Permission)
- Kê đơn: chỉ Bác sĩ có hành nghề hợp lệ
- Hủy lượt khám: chỉ Tiếp nhận hoặc Admin
- Điều chỉnh BHYT: chỉ Thu ngân có quyền
- Refund: chỉ Kế toán trưởng hoặc Admin

---

## State Machine — Visit (Lượt khám)

```
WAITING_REGISTER
  → [Tiếp nhận tạo] → REGISTERED
  → [Điều dưỡng nhận] → WAITING_EXAM
  → [Bác sĩ bắt đầu khám] → IN_EXAM
  → [Có chỉ định CLS] → WAITING_RESULT
  → [Có đủ kết quả CLS hoặc không có CLS] → WAITING_PAYMENT
  → [Thu ngân thu tiền xong] → PAID
  → [Dược sĩ cấp phát xong hoặc không có đơn thuốc] → COMPLETED

CANCELLED (từ bất kỳ trạng thái TRƯỚC PAID)
```

**Lỗi thường gặp:**
- Cho phép thanh toán khi visit vẫn đang WAITING_RESULT
- Không chuyển về WAITING_PAYMENT sau khi có đủ kết quả
- Cho phép hủy visit sau khi đã PAID (phải làm Refund thay vì Cancel)

---

## Integration Points

| Module | Chiều | Dữ liệu |
|---|---|---|
| LIS (Laboratory) | OPD → LIS | Lab order (test type, patient info, priority) |
| LIS → OPD | Kết quả xét nghiệm |
| RIS (Radiology) | OPD → RIS | Imaging order |
| RIS → OPD | Kết quả + image link |
| Billing | OPD → Billing | Dịch vụ đã dùng + thuốc → tính tiền |
| Pharmacy | OPD → Pharmacy | Đơn thuốc kê |
| Pharmacy → OPD | Xác nhận đã cấp phát |
| EMR | OPD → EMR | Ghi chú khám, chẩn đoán, ICD-10 |

---

## Compliance References

- **Thông tư 52/2017/TT-BYT**: Kê đơn thuốc trong điều trị ngoại trú
- **Thông tư 46/2018/TT-BYT**: Quy định bệnh án điện tử (ICD-10, chữ ký số)
- **Nghị định 146/2018/NĐ-CP**: Quy định chi tiết BHYT
- **QĐ 1985/QĐ-BHXH**: Quy trình khám chữa bệnh BHYT

## Common Mistakes Found in Code

- Không validate BHYT trước khi tạo visit (R3 violation)
- Cho thanh toán khi vẫn có CLS chưa có kết quả
- Thiếu mã ICD-10 validation khi submit đơn thuốc
- Refund nhầm với Cancel visit — hai luồng khác nhau
- State machine không block PAID → CANCELLED (phải làm Refund)

## When to update
- Khi BHYT thay đổi % thanh toán
- Khi bệnh viện thay đổi quy trình nội bộ
- Khi phát hiện lỗi nghiệp vụ mới qua testing
