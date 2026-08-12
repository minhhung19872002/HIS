---
name: his-biz-billing
description: Use this skill for HIS Billing domain knowledge when working on Billing.tsx, BillingEditor.tsx, BillingGuarantors.tsx, EInvoices.tsx, QrPaymentCenter.tsx, RefundApproval.tsx, or any payment/BHYT code task. Contains: billing workflow (tính tiền → BHYT apply → thanh toán → hóa đơn), BHYT calculation rules (đúng tuyến/trái tuyến/cùng chi trả/đối tượng), refund workflow, state machine (receipt states), e-invoice (Thông tư 78/2021/TT-BTC). Always read together with his-biz-reviewer. Do NOT use for OPD registration (his-biz-opd) or Pharmacy dispensing.
metadata:
  type: project
---

# HIS Domain Knowledge — Billing (Thanh Toán & BHYT)

Đọc cùng `his-biz-reviewer` để chạy Phase 3-5 analysis trước khi code.

## Module Overview

**Mục đích:** Quản lý tính tiền, apply BHYT, thu tiền, xuất hóa đơn, hoàn tiền.

**Actors:**
- Thu ngân (Cashier): tính tiền, thu tiền, in biên lai
- Kế toán (Accountant): kiểm tra, báo cáo, refund approval
- Admin: cấu hình giá dịch vụ, BHYT rules
- Bệnh nhân: thanh toán

---

## Workflow Catalog

### Luồng chuẩn — Thanh toán ngoại trú
```
Nhận lượt khám hoàn thành (Visit = WAITING_PAYMENT)
  → Tổng hợp phí: dịch vụ khám + CLS + thuốc kê đơn
  → Kiểm tra BHYT (đủ điều kiện không?)
  → Tính phần BHYT chi trả
  → Tính phần bệnh nhân cùng chi trả
  → Thu ngân xác nhận tổng tiền với bệnh nhân
  → Bệnh nhân thanh toán (tiền mặt / chuyển khoản / QR)
  → Tạo phiếu thu (Receipt) → trạng thái PAID
  → Xuất hóa đơn điện tử (e-invoice) nếu yêu cầu
```

### Luồng chuẩn — Thanh toán nội trú (khi xuất viện)
```
Tổng hợp toàn bộ chi phí nằm viện (dịch vụ + thuốc + giường)
  → Trừ đặt cọc (deposit) đã thu lúc nhập viện
  → Apply BHYT cho toàn bộ đợt điều trị
  → Tính số tiền bệnh nhân còn nợ hoặc được hoàn
  → Thu tiền còn thiếu hoặc hoàn tiền dư
  → Tạo phiếu quyết toán (Discharge Bill)
  → Xuất hóa đơn điện tử
```

### Luồng hoàn tiền (Refund)
```
Bệnh nhân yêu cầu hoàn tiền (dịch vụ chưa thực hiện)
  → Thu ngân kiểm tra điều kiện hoàn tiền
  → Trình Kế toán trưởng phê duyệt (nếu > ngưỡng)
  → Tạo phiếu hoàn tiền
  → Cập nhật lại phiếu thu gốc
  → Xuất hóa đơn điều chỉnh
```

### Luồng ngoại lệ
- **Bệnh nhân trả góp**: chỉ với policy bệnh viện cho phép, cần cam kết
- **Thanh toán bảo lãnh (Guarantor)**: bên thứ ba trả thay, cần hợp đồng bảo lãnh
- **Nợ viện phí**: ghi nợ + theo dõi, không được xuất viện khi còn nợ (trừ exception)

---

## Business Rule Catalog — BHYT

### Tính % BHYT chi trả

| Đối tượng & Tuyến | BHYT chi trả |
|---|---|
| Đúng tuyến — hộ nghèo, cận nghèo | 100% |
| Đúng tuyến — thông thường | 80% (bệnh nhân cùng chi trả 20%) |
| Đúng tuyến — trẻ em < 6 tuổi | 100% |
| Trái tuyến — bệnh viện tuyến huyện | 70% |
| Trái tuyến — bệnh viện tuyến tỉnh | 60% |
| Trái tuyến — bệnh viện tuyến TW | 40% |
| Cấp cứu bất kể tuyến | 100% phần cấp cứu |

### Giới hạn BHYT
| Rule | Mô tả |
|---|---|
| R1 | BHYT chỉ chi trả trong danh mục thuốc, vật tư, dịch vụ được phê duyệt |
| R2 | Một đợt điều trị nội trú BHYT: giới hạn số ngày theo bệnh |
| R3 | Không dùng BHYT cho dịch vụ theo yêu cầu (dịch vụ tự nguyện) |
| R4 | Thẻ BHYT phải còn hạn tại thời điểm khám, không áp dụng hồi tố |
| R5 | Cùng chi trả có mức tối đa/năm theo quy định (không vượt 6 tháng lương) |

### Bắt buộc
- R6: Mọi dịch vụ phải có đơn giá được phê duyệt trước khi tính tiền
- R7: Phiếu thu phải có đủ: mã phiếu, ngày giờ, tên bệnh nhân, danh sách dịch vụ, tổng tiền, phần BN/BHYT
- R8: Refund chỉ được thực hiện cho dịch vụ CHƯA thực hiện (không refund dịch vụ đã làm)
- R9: Hóa đơn điện tử phải xuất trong ngày thanh toán (TT 78/2021/TT-BTC)

---

## State Machine — Receipt (Phiếu Thu)

```
DRAFT (đang tính tiền)
  → [Thu ngân xác nhận] → CONFIRMED
  → [Bệnh nhân thanh toán] → PAID
  → [Xuất e-invoice thành công] → INVOICED
  
REFUND_REQUESTED (từ PAID)
  → [Kế toán phê duyệt] → REFUNDED
  → [Cập nhật hóa đơn] → INVOICE_ADJUSTED

CANCELLED (chỉ từ DRAFT hoặc CONFIRMED — trước khi thu tiền)
```

**Lỗi thường gặp:**
- Cho Refund khi dịch vụ đã thực hiện
- Không chặn cancel khi đã PAID
- Tính BHYT khi thẻ đã hết hạn
- Không trừ đặt cọc khi quyết toán nội trú

---

## State Machine — Guarantor Bill

```
OPEN → PARTIALLY_PAID → FULLY_PAID
     → OVERDUE (quá hạn cam kết)
```

---

## Integration Points

| Module | Chiều | Dữ liệu |
|---|---|---|
| OPD / Inpatient | → Billing | Danh sách dịch vụ, thuốc cần tính tiền |
| BHYT System | ↔ Billing | Verify thẻ, lookup % chi trả |
| E-Invoice Portal | Billing → | Dữ liệu hóa đơn (mã số thuế BV, thông tin BN) |
| Pharmacy | → Billing | Danh sách thuốc đã cấp phát + giá |
| Accounting | ← Billing | Báo cáo doanh thu, nợ viện phí |

---

## Compliance References

- **Thông tư 39/2018/TT-BYT**: Quy trình thanh toán chi phí KCB BHYT
- **Nghị định 146/2018/NĐ-CP**: Chi tiết về mức chi trả BHYT
- **Thông tư 78/2021/TT-BTC**: Hóa đơn điện tử
- **QĐ 4210/QĐ-BYT**: Danh mục thuốc BHYT
- **TT 14/2019/TT-BYT**: Danh mục dịch vụ kỹ thuật BHYT

## Common Mistakes Found in Code

- Tính BHYT không check thẻ hết hạn (R4 violation)
- Không tính mức tối đa cùng chi trả/năm
- Refund không yêu cầu approval khi số tiền lớn
- Thanh toán bảo lãnh không liên kết với guarantor contract
- Không xuất e-invoice sau PAID (vi phạm TT 78)

## When to update
- Khi BHYT thay đổi % hoặc danh mục chi trả
- Khi thay đổi nhà cung cấp hóa đơn điện tử
- Khi bệnh viện thay đổi chính sách hoàn tiền
