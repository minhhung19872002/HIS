---
name: his-biz-inpatient
description: Use this skill for HIS Inpatient domain knowledge when working on Inpatient.tsx, TreatmentMonitorSection.tsx, HemodialysisSection.tsx, NewbornSection.tsx, or any admission/discharge/ward code task. Contains: inpatient workflow (nhập viện → phân khoa → điều trị → xuất viện), BHYT inpatient rules (đợt điều trị, giới hạn ngày), deposit workflow, discharge summary, transfer between wards, hemodialysis and newborn special sections. Always read together with his-biz-reviewer. Do NOT use for OPD consultation (his-biz-opd).
metadata:
  type: project
---

# HIS Domain Knowledge — Inpatient (Nội Trú)

Đọc cùng `his-biz-reviewer` để chạy Phase 3-5 analysis trước khi code.

## Module Overview

**Mục đích:** Quản lý toàn bộ quy trình điều trị nội trú: nhập viện, theo dõi, chuyển khoa, xuất viện.

**Actors:**
- Bác sĩ điều trị (Attending Doctor): khám, ra lệnh điều trị, viết bệnh án
- Điều dưỡng (Nurse): theo dõi sinh hiệu, thực hiện y lệnh
- Trưởng khoa (Head of Department): ký tóm tắt xuất viện, hội chẩn
- Bộ phận tiếp nhận (Admissions): làm thủ tục nhập viện, phân giường
- Thu ngân (Cashier): thu đặt cọc, quyết toán lúc xuất viện
- Điều phối giường (Bed Manager): phân bổ giường, quản lý công suất

---

## Workflow Catalog

### Luồng chuẩn — Nhập viện (Admission)
```
Bác sĩ ra chỉ định nhập viện (chuyển từ OPD/Cấp cứu)
  → Tiếp nhận làm thủ tục nhập viện
  → Verify BHYT (nội trú: đợt điều trị mới, đúng tuyến?)
  → Thu đặt cọc (Deposit) — bắt buộc trước khi vào viện
  → Phân khoa, phân giường
  → Bàn giao bệnh nhân cho Điều dưỡng khoa
  → Tạo bệnh án nội trú mới
  → Bác sĩ nhập viện viết y lệnh đầu tiên
```

### Luồng chuẩn — Điều trị (Treatment)
```
Mỗi ngày:
  Điều dưỡng: đo sinh hiệu (sáng + chiều)
             thực hiện y lệnh
             ghi phiếu theo dõi
  Bác sĩ: khám buổi sáng
          viết ghi chú tiến triển (Progress Notes)
          cập nhật y lệnh điều trị
          chỉ định CLS (Lab, CĐHA) nếu cần
          kê thuốc hàng ngày
```

### Luồng chuyển khoa (Ward Transfer)
```
Bác sĩ ra y lệnh chuyển khoa
  → Khoa cũ ghi chú bàn giao
  → Khoa mới tiếp nhận + xác nhận
  → Hệ thống cập nhật: khoa hiện tại, giường hiện tại
  → Giường cũ → trạng thái trống
  → Không được mất thông tin điều trị khoa cũ
```

### Luồng xuất viện (Discharge)
```
Bác sĩ ra y lệnh xuất viện
  → Viết tóm tắt xuất viện (Discharge Summary)
  → Trưởng khoa ký duyệt (BẮT BUỘC)
  → Tổng hợp toàn bộ chi phí điều trị
  → Thu ngân quyết toán: trừ đặt cọc, tính phần BHYT
  → Bệnh nhân thanh toán phần còn lại (hoặc hoàn tiền)
  → Cập nhật giường → EMPTY
  → In giấy ra viện + tóm tắt bệnh án
```

### Luồng ngoại lệ
- **Từ chối điều trị**: ghi cam kết từ chối có chữ ký BN/người nhà
- **Nặng xin về**: thủ tục đặc biệt, ký giấy cam kết, không được xuất viện bình thường
- **Tử vong**: quy trình đặc biệt — giấy báo tử, thủ tục pháp lý
- **Bỏ trốn viện**: ghi nhận, báo cáo, không auto-discharge

---

## Business Rule Catalog

### BHYT Nội Trú
| Rule | Mô tả |
|---|---|
| R1 | Mỗi đợt nằm viện là 1 đợt điều trị BHYT riêng |
| R2 | Chuyển viện: phải có giấy chuyển viện hợp lệ để BHYT chi trả đúng tuyến |
| R3 | Đặt cọc (deposit) thu lúc nhập viện — bắt buộc, không exception trừ cấp cứu |
| R4 | Xuất viện phải quyết toán toàn bộ chi phí — không cho xuất khi còn nợ chưa giải quyết |
| R5 | Ngày BHYT tính từ ngày nhập viện đến ngày xuất viện (tính đủ ngày, không tính theo giờ) |
| R6 | Dịch vụ kỹ thuật cao (phẫu thuật, thủ thuật đặc biệt) cần xét duyệt BHYT trước |

### Bắt buộc — Quy trình
| Rule | Mô tả |
|---|---|
| R7 | Tóm tắt xuất viện phải có chữ ký Trưởng khoa TRƯỚC khi cho xuất viện |
| R8 | Không phân giường nếu không có đặt cọc (trừ cấp cứu) |
| R9 | Chuyển khoa phải ghi đủ: lý do, khoa đến, bác sĩ nhận |
| R10 | Y lệnh điều trị phải do Bác sĩ ký — Điều dưỡng chỉ thực hiện, không được ra y lệnh |
| R11 | Mỗi giường có trạng thái: EMPTY / OCCUPIED / CLEANING / RESERVED |

### Đặc thù phân hệ con
**Hemodialysis (Lọc máu/Thận nhân tạo):**
- Mỗi ca lọc máu là 1 session riêng, có sheet riêng
- Theo dõi: cân nặng trước/sau, huyết áp trước/trong/sau, tốc độ máu, UFR
- Máy lọc máu: ghi số serial máy, số lần dùng quản lý vật tư
- Bộ lọc (dialyzer): quản lý tái sử dụng (số lần dùng, tình trạng)

**Newborn Section (Sơ sinh):**
- Hồ sơ sơ sinh TÁCH BIỆT với hồ sơ mẹ (có ID riêng ngay từ khi sinh)
- Link 2 chiều: sơ sinh → mẹ, mẹ → sơ sinh
- Khám sơ sinh: cân nặng, chiều dài, APGAR score (1 phút + 5 phút), tiêm vaccine
- Không được xuất viện sơ sinh khi mẹ chưa xuất viện (trừ trường hợp đặc biệt)

---

## State Machine — Admission (Đợt nhập viện)

```
PENDING_ADMISSION (có chỉ định nhập viện)
  → [Thu đặt cọc + phân giường] → ADMITTED
  → [Điều trị hàng ngày] → IN_TREATMENT (implicit)
  → [Chuyển khoa] → TRANSFERRED (giường cũ = EMPTY, giường mới = OCCUPIED)
  → [Bác sĩ ra y lệnh XV] → DISCHARGE_PENDING
  → [Trưởng khoa ký + quyết toán xong] → DISCHARGED
  → Giường → CLEANING → EMPTY

ABSCONDED (bỏ trốn — không qua discharge workflow)
EXPIRED (tử vong — quy trình riêng)
```

---

## State Machine — Bed

```
EMPTY → [Phân giường] → OCCUPIED → [Xuất viện] → CLEANING → EMPTY
                                  → [Chuyển khoa] → EMPTY (ngay lập tức)
RESERVED (giữ trước cho BN sắp nhập viện)
OUT_OF_SERVICE (sửa chữa, cách ly)
```

---

## Integration Points

| Module | Chiều | Dữ liệu |
|---|---|---|
| OPD / Emergency | → Inpatient | Chỉ định nhập viện, hồ sơ BN, chẩn đoán ban đầu |
| LIS | ← Inpatient | Lab orders hàng ngày |
| LIS → Inpatient | Kết quả XN |
| Billing | ← Inpatient | Tổng hợp chi phí điều trị + thuốc + giường + dịch vụ |
| Pharmacy | ← Inpatient | Thuốc theo y lệnh hàng ngày |
| EMR | ↔ Inpatient | Bệnh án nội trú, tóm tắt xuất viện |
| BHYT | ← Inpatient | Dữ liệu đợt điều trị để claim |

---

## Compliance References

- **Thông tư 43/2013/TT-BYT**: Quy định về bệnh viện và giường bệnh
- **Thông tư 39/2018/TT-BYT**: Thanh toán chi phí KCB BHYT (bao gồm nội trú)
- **QĐ 4069/QĐ-BYT**: Hướng dẫn chăm sóc người bệnh nội trú

## Common Mistakes Found in Code

- Cho phép xuất viện khi Tóm tắt chưa có chữ ký Trưởng khoa (R7 violation)
- Không thu đặt cọc trước khi phân giường (R8 violation)
- Chuyển khoa không cập nhật trạng thái giường cũ → EMPTY
- Lọc máu: không ghi số lần dùng dialyzer → không quản lý được tái sử dụng
- Sơ sinh: tạo hồ sơ gộp với mẹ thay vì ID riêng

## When to update
- Khi quy định BHYT nội trú thay đổi
- Khi thêm phân hệ con mới (ICU, phẫu thuật, ghép tạng)
- Khi phát hiện lỗ hổng quy trình xuất viện qua testing
