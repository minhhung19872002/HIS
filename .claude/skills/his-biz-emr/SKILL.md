---
name: his-biz-emr
description: Use this skill for HIS EMR (Electronic Medical Record) domain knowledge when working on EmrEditor.tsx, CentralSigning.tsx, or any medical record / digital signature code task. Contains: EMR workflow (create → fill → verify → sign → lock), ICD-10 mandatory rules, digital signature requirements (VGCA/SmartCA), bệnh án locking rules, amendment workflow, Thông tư 46/2018/TT-BYT compliance. Always read together with his-biz-reviewer. Do NOT use for prescription workflow (his-biz-opd) or lab results (his-biz-laboratory).
metadata:
  type: project
---

# HIS Domain Knowledge — EMR (Bệnh Án Điện Tử)

Đọc cùng `his-biz-reviewer` để chạy Phase 3-5 analysis trước khi code.

## Module Overview

**Mục đích:** Số hóa bệnh án bệnh nhân, đảm bảo tính pháp lý và toàn vẹn dữ liệu y tế.

**Actors:**
- Bác sĩ điều trị (Attending Doctor): tạo, điền, ký bệnh án
- Bác sĩ hội chẩn (Consulting Doctor): ký xác nhận hội chẩn
- Trưởng khoa (Department Head): ký duyệt bệnh án đặc biệt
- Điều dưỡng (Nurse): điền phần điều dưỡng, theo dõi

---

## Workflow Catalog

### Luồng chuẩn — Bệnh án ngoại trú
```
Tạo bệnh án (Create)
  → Hệ thống tạo bản ghi khi bắt đầu khám
  → Liên kết với Visit ID

Điền thông tin (Fill)
  → Bác sĩ nhập: lý do khám, bệnh sử, tiền sử
  → Nhập kết quả thăm khám
  → Nhập chẩn đoán + mã ICD-10 (BẮT BUỘC)
  → Nhập kế hoạch điều trị

Ký bệnh án (Sign)
  → Bác sĩ ký số qua VGCA/SmartCA/USB token
  → Hệ thống ghi timestamp + certificate info
  → Trạng thái chuyển SIGNED

Khóa bệnh án (Lock)
  → Sau khi ký: bệnh án không thể chỉnh sửa nội dung
  → Chỉ được thêm phụ lục (addendum)
```

### Luồng bệnh án nội trú
```
Nhập viện → Tạo bệnh án nội trú (liên kết với Admission ID)
Mỗi ngày: Điều dưỡng nhập phiếu theo dõi
           Bác sĩ nhập ghi chú tiến triển (Progress Notes)
           Ký từng ngày hoặc theo giai đoạn
Xuất viện → Bác sĩ viết Tóm tắt xuất viện (Discharge Summary)
           → Trưởng khoa ký duyệt Tóm tắt xuất viện
           → Lock toàn bộ bệnh án
```

### Luồng sửa bệnh án (Amendment)
```
Chỉ được sửa khi: bệnh án CHƯA ký
Đã ký → Chỉ được thêm Addendum (phụ lục đính chính)
Addendum phải: ghi rõ lý do, timestamp, chữ ký riêng
```

### Luồng hội chẩn
```
Bác sĩ điều trị yêu cầu hội chẩn
  → Tạo biên bản hội chẩn liên kết với bệnh án
  → Mỗi bác sĩ tham gia hội chẩn ký riêng
  → Trưởng khoa ký kết luận hội chẩn
```

---

## Business Rule Catalog

### Bắt buộc (Thông tư 46/2018/TT-BYT)
| Rule | Mô tả |
|---|---|
| R1 | Mã ICD-10 BẮT BUỘC khi có chẩn đoán — không được submit khi thiếu |
| R2 | Chữ ký số phải dùng chứng thư số hợp lệ (VGCA, SmartCA, hoặc USB token đã đăng ký) |
| R3 | Bệnh án phải ký trong vòng 24h sau khi khám (ngoại trú) |
| R4 | Bệnh án nội trú phải ký từng phần theo ngày điều trị |
| R5 | Sau khi ký: KHÔNG được chỉnh sửa nội dung, chỉ được thêm Addendum |
| R6 | Tóm tắt xuất viện nội trú phải có chữ ký Trưởng khoa |
| R7 | Bệnh án phải lưu ít nhất 10 năm (20 năm với trường hợp đặc biệt) |
| R8 | Mỗi bệnh án có mã số duy nhất, không được tái sử dụng |

### Điều kiện
| Rule | Điều kiện | Xử lý |
|---|---|---|
| R9 | Bệnh án chưa ký | Cho phép sửa toàn bộ |
| R10 | Bệnh án đã ký | Chỉ thêm Addendum, không sửa |
| R11 | Hội chẩn | Cần ký của tất cả bác sĩ tham gia |
| R12 | Bệnh nặng / ICU | Tóm tắt phải có ký Trưởng khoa hoặc Phó khoa |

### An toàn bệnh nhân (Patient Safety)
- **Chống xóa**: bệnh án không bao giờ được xóa vật lý — chỉ soft-delete với lý do
- **Audit log**: mọi thay đổi bệnh án phải ghi audit (ai, khi nào, thay đổi gì)
- **Chống giả mạo**: chữ ký số phải verify certificate trust chain
- **Phân quyền chặt**: chỉ bác sĩ điều trị (hoặc ủy quyền) mới ký được bệnh án của mình

---

## State Machine — Medical Record

```
DRAFT (đang điền)
  → [Bác sĩ submit] → PENDING_SIGN
  → [Ký số thành công] → SIGNED
  → [Sau khi ký] → LOCKED (không thể edit)

AMENDED (khi có Addendum được ký)
  → LOCKED (với addendum mới đính kèm)

INVALIDATED (bệnh án bị vô hiệu — chỉ Admin + lý do pháp lý)
```

---

## Integration Points

| Module | Chiều | Dữ liệu |
|---|---|---|
| OPD / Inpatient | → EMR | Trigger tạo bệnh án mới khi bắt đầu khám |
| LIS | → EMR | Kết quả xét nghiệm đính kèm vào bệnh án |
| RIS | → EMR | Kết quả CĐHA, link image PACS |
| Pharmacy | → EMR | Thuốc đã kê + đã cấp phát |
| BHYT | ← EMR | Dữ liệu bệnh án để thanh toán BHYT |
| Digital Signature | ↔ EMR | VGCA/SmartCA API để ký |

---

## Compliance References

- **Thông tư 46/2018/TT-BYT**: Quy định về bệnh án điện tử (nguồn luật chính)
- **Thông tư 22/2013/TT-BYT**: Hướng dẫn quản lý hồ sơ bệnh án
- **Luật An toàn thông tin mạng 2015**: Yêu cầu chữ ký số
- **Nghị định 13/2023/NĐ-CP**: Bảo vệ dữ liệu cá nhân (áp dụng cho data bệnh nhân)

## Common Mistakes Found in Code

- Cho phép submit bệnh án không có ICD-10 (R1 violation)
- Cho phép edit sau khi đã SIGNED (R5 violation) — phải block field edit
- Không verify certificate expiry khi ký
- Audit log thiếu: ghi WHO nhưng thiếu WHAT changed
- Addendum không có chữ ký riêng — gộp với bản gốc

## When to update
- Khi Bộ Y Tế cập nhật Thông tư 46
- Khi chuyển nhà cung cấp chữ ký số
- Khi thêm loại bệnh án mới (bệnh mãn tính, HIV, tâm thần)
