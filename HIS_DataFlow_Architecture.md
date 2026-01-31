# HIS - BUSINESS LOGIC & DATA FLOW
## Phân tích Luồng Dữ liệu & Quan hệ giữa 17 Phân hệ

---

# PHẦN 1: TỔNG QUAN KIẾN TRÚC HỆ THỐNG

## 1.1 Sơ đồ Tổng quan Phân hệ

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              HIS - HOSPITAL INFORMATION SYSTEM                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  1. TIẾP ĐÓN │───▶│ 2. KHÁM BỆNH │───▶│ 3. NỘI TRÚ   │───▶│ 6. PTTT      │  │
│  │  (Reception) │    │ (OPD Exam)   │    │ (Inpatient)  │    │ (Surgery)    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │                   │          │
│         │                   ▼                   ▼                   ▼          │
│         │            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│         │            │ 4. CHỈ ĐỊNH  │    │ 7. XÉT NGHIỆM│    │ 8. CĐHA/TDCN │  │
│         │            │ (Orders)     │    │ (LIS)        │    │ (RIS/PACS)   │  │
│         │            └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │                   │          │
│         ▼                   ▼                   ▼                   ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ 10. THU NGÂN │◀───│ 5. KHO DƯỢC  │◀───│ 9. KHO MÁU   │    │ 11. TÀI CHÍNH│  │
│  │ (Cashier)    │    │ (Pharmacy)   │    │ (Blood Bank) │    │ (Finance)    │  │
│  └──────┬───────┘    └──────────────┘    └──────────────┘    └──────┬───────┘  │
│         │                                                           │          │
│         ▼                                                           ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ 12. BHYT     │    │ 13. DANH MỤC │    │ 14. KHO/     │    │ 15. BC DƯỢC  │  │
│  │ (Insurance)  │    │ (Master Data)│    │ NHÀ THUỐC   │    │ (Pharma Rpt) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐                                           │
│  │ 16. HSBA/    │    │ 17. QUẢN TRỊ │                                           │
│  │ KHTH/BC      │    │ HỆ THỐNG     │                                           │
│  └──────────────┘    └──────────────┘                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Phân loại Phân hệ theo Chức năng

### A. Nhóm Lâm sàng (Clinical)
| Phân hệ | Vai trò | Dữ liệu chính |
|---------|---------|---------------|
| 1. Tiếp đón | Entry point - Tạo hồ sơ BN | patient, visit, insurance |
| 2. Khám bệnh | Khám ngoại trú | examination, diagnosis, prescription |
| 3. Nội trú | Điều trị nội trú | admission, treatment, nursing |
| 6. PTTT | Phẫu thuật thủ thuật | surgery, anesthesia, surgical_team |

### B. Nhóm Cận lâm sàng (Paraclinical)
| Phân hệ | Vai trò | Dữ liệu chính |
|---------|---------|---------------|
| 4. Chỉ định | Tạo yêu cầu CLS | service_order, order_item |
| 7. Xét nghiệm | Thực hiện XN | lab_order, lab_result, specimen |
| 8. CĐHA/TDCN | Thực hiện CĐHA | imaging_order, imaging_result, image |

### C. Nhóm Dược - Vật tư (Pharmacy & Supply)
| Phân hệ | Vai trò | Dữ liệu chính |
|---------|---------|---------------|
| 5. Kho Dược | Quản lý kho chính | stock, transaction, batch |
| 9. Kho Máu | Quản lý máu | blood_inventory, blood_order |
| 14. Nhà thuốc | Bán lẻ thuốc | retail_sale, dispensing |
| 15. BC Dược | Báo cáo dược | drug_report, controlled_drug_log |

### D. Nhóm Tài chính (Finance)
| Phân hệ | Vai trò | Dữ liệu chính |
|---------|---------|---------------|
| 10. Thu ngân | Thu tiền | invoice, payment, deposit |
| 11. Tài chính | Hạch toán | revenue, cost, profit |
| 12. BHYT | Giám định bảo hiểm | insurance_claim, xml_export |

### E. Nhóm Hỗ trợ (Support)
| Phân hệ | Vai trò | Dữ liệu chính |
|---------|---------|---------------|
| 13. Danh mục | Master data | service, drug, icd10, user |
| 16. HSBA/KHTH | Lưu trữ & Báo cáo | medical_record, archive, report |
| 17. Quản trị | Admin hệ thống | user, role, permission, config |

---

# PHẦN 2: LUỒNG DỮ LIỆU CHÍNH (MAIN DATA FLOWS)

## 2.1 LUỒNG 1: KHÁM BỆNH NGOẠI TRÚ (OPD Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG KHÁM BỆNH NGOẠI TRÚ                                │
└─────────────────────────────────────────────────────────────────────────────────┘

[BN đến viện]
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. TIẾP ĐÓN │────▶│ Kiểm tra    │────▶│ Tạo Visit   │
│             │     │ thẻ BHYT    │     │ (lượt khám) │
└─────────────┘     └─────────────┘     └──────┬──────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ Cổng BHXH   │     │ Xếp hàng    │
                    │ (API)       │     │ phòng khám  │
                    └─────────────┘     └──────┬──────┘
                                               │
     ┌─────────────────────────────────────────┘
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 2. KHÁM    │────▶│ Hỏi bệnh    │────▶│ Khám lâm    │
│    BỆNH    │     │ Tiền sử     │     │ sàng        │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
     ┌─────────────────────────────────────────┤
     │                                         │
     ▼                                         ▼
┌─────────────┐                         ┌─────────────┐
│ 4. CHỈ ĐỊNH │                         │ Chẩn đoán   │
│    CLS      │                         │ ICD-10      │
└──────┬──────┘                         └──────┬──────┘
       │                                       │
       ├──────────────┬──────────────┐        │
       ▼              ▼              ▼        │
┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ 7. XÉT     │ │ 8. CĐHA/   │ │ Dịch vụ    ││
│    NGHIỆM  │ │    TDCN    │ │ khác       ││
└──────┬──────┘ └──────┬──────┘ └─────────────┘│
       │              │                        │
       └──────┬───────┘                        │
              ▼                                │
       ┌─────────────┐                         │
       │ Trả kết quả │◀────────────────────────┘
       │ CLS         │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
       │ Kết luận    │────▶│ Kê đơn     │────▶│ 5. KHO DƯỢC │
       │ khám bệnh   │     │ thuốc      │     │ (xuất thuốc)│
       └──────┬──────┘     └─────────────┘     └──────┬──────┘
              │                                       │
              ├───────────────────────────────────────┤
              ▼                                       ▼
       ┌─────────────┐                         ┌─────────────┐
       │ Hẹn tái     │                         │ 10. THU    │
       │ khám        │                         │     NGÂN   │
       └─────────────┘                         └──────┬──────┘
                                                      │
                                                      ▼
                                               ┌─────────────┐
                                               │ 12. BHYT   │
                                               │ (Xuất XML) │
                                               └─────────────┘
```

### Chi tiết Luồng OPD:

| Bước | Phân hệ | Action | Input | Output | Ghi chú |
|------|---------|--------|-------|--------|---------|
| 1 | Tiếp đón | Đăng ký khám | Thẻ BHYT/CCCD | visit_id | Tạo hoặc tìm patient |
| 2 | Tiếp đón | Kiểm tra BHYT | Số thẻ BHYT | insurance_status | Gọi API cổng BHXH |
| 3 | Tiếp đón | Xếp hàng | visit_id, room_id | queue_number | Cấp số thứ tự |
| 4 | Khám bệnh | Gọi BN | queue_number | - | Gọi loa + màn hình |
| 5 | Khám bệnh | Hỏi khám | visit_id | examination | Nhập triệu chứng, tiền sử |
| 6 | Khám bệnh | Chẩn đoán | examination_id | diagnosis | ICD-10 chính + phụ |
| 7 | Chỉ định | Chỉ định CLS | diagnosis | service_order[] | Tạo phiếu yêu cầu |
| 8 | XN/CĐHA | Thực hiện | service_order | result | Trả kết quả về khám |
| 9 | Khám bệnh | Kết luận | results[] | conclusion | Quyết định điều trị |
| 10 | Khám bệnh | Kê đơn | diagnosis | prescription | Tạo đơn thuốc |
| 11 | Kho Dược | Xuất thuốc | prescription | dispensing | FIFO/FEFO |
| 12 | Thu ngân | Thanh toán | visit_id | invoice | Thu tiền |
| 13 | BHYT | Xuất XML | invoice | xml_4210 | Gửi cổng BHXH |

---

## 2.2 LUỒNG 2: ĐIỀU TRỊ NỘI TRÚ (IPD Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG ĐIỀU TRỊ NỘI TRÚ                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

[Từ Khám bệnh/Cấp cứu]
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Chỉ định   │────▶│ 3. NỘI TRÚ  │────▶│ Tiếp nhận  │
│ nhập viện   │     │             │     │ vào khoa   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
     ┌─────────────────────────────────────────┘
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Phân giường │────▶│ Tờ điều trị │────▶│ Y lệnh     │
│ buồng bệnh  │     │ hàng ngày   │     │ hàng ngày  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
     ┌────────────────┬────────────────┬───────┴───────┬────────────────┐
     │                │                │               │                │
     ▼                ▼                ▼               ▼                ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Chỉ định   │ │ Kê đơn     │ │ Chỉ định   │ │ Chỉ định   │ │ Chăm sóc   │
│ CLS        │ │ thuốc/VT   │ │ PTTT       │ │ dinh dưỡng │ │ điều dưỡng │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────────────┘ └─────────────┘
       │              │               │
       │              │               ▼
       │              │        ┌─────────────┐
       │              │        │ 6. PTTT    │
       │              │        │ (Phẫu thuật)│
       │              │        └──────┬──────┘
       │              │               │
       ▼              ▼               │
┌─────────────┐ ┌─────────────┐       │
│ 7. XN      │ │ 5. KHO DƯỢC │       │
│ 8. CĐHA    │ │ (Phiếu lĩnh)│       │
└──────┬──────┘ └──────┬──────┘       │
       │              │               │
       └──────┬───────┴───────────────┘
              │
              ▼
       ┌─────────────┐
       │ Theo dõi    │◀──────── [Lặp hàng ngày cho đến khi ra viện]
       │ diễn biến   │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
       │ Kết thúc    │────▶│ Ra viện/    │────▶│ 10. THU    │
       │ điều trị    │     │ Chuyển viện │     │     NGÂN   │
       └─────────────┘     └─────────────┘     └──────┬──────┘
                                                      │
                                                      ▼
                                               ┌─────────────┐
                                               │ 12. BHYT   │
                                               │ 16. HSBA   │
                                               └─────────────┘
```

### Chi tiết Luồng IPD:

| Bước | Phân hệ | Action | Input | Output | Tần suất |
|------|---------|--------|-------|--------|----------|
| 1 | Nội trú | Tiếp nhận | visit_id | admission_id | 1 lần |
| 2 | Nội trú | Phân giường | admission_id | bed_assignment | 1 lần (có thể đổi) |
| 3 | Nội trú | Tờ điều trị | admission_id | treatment_sheet | Hàng ngày |
| 4 | Chỉ định | Y lệnh CLS | treatment_sheet | service_order[] | Hàng ngày |
| 5 | Khám bệnh | Kê đơn | treatment_sheet | prescription | Hàng ngày |
| 6 | Kho Dược | Tổng hợp | prescription[] | requisition | 1-2 lần/ngày |
| 7 | Kho Dược | Xuất thuốc | requisition | dispensing | 1-2 lần/ngày |
| 8 | XN/CĐHA | Thực hiện | service_order | result | Theo y lệnh |
| 9 | PTTT | Phẫu thuật | surgery_order | surgery_record | Theo lịch mổ |
| 10 | Nội trú | Theo dõi | admission_id | vital_signs, nursing | Nhiều lần/ngày |
| 11 | Nội trú | Ra viện | admission_id | discharge | 1 lần |
| 12 | Thu ngân | Thanh toán | admission_id | invoice | 1 lần |
| 13 | BHYT | Xuất XML | invoice | xml_130 | 1 lần |
| 14 | HSBA | Lưu trữ | admission_id | archive | 1 lần |

---

## 2.3 LUỒNG 3: PHẪU THUẬT THỦ THUẬT (Surgery Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG PHẪU THUẬT THỦ THUẬT                               │
└─────────────────────────────────────────────────────────────────────────────────┘

[Từ Khoa Lâm sàng]
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Chỉ định   │────▶│ Hội chẩn   │────▶│ Duyệt mổ   │
│ PTTT       │     │ (nếu cần)  │     │            │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Lên lịch   │
                                        │ mổ         │
                                        └──────┬──────┘
                                               │
     ┌─────────────────────────────────────────┘
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 6. PTTT    │────▶│ Tiếp nhận  │────▶│ Chuẩn bị   │
│ (Phòng mổ) │     │ BN vào mổ  │     │ trước mổ   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
     ┌─────────────────────────────────────────┘
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Gây mê/    │────▶│ Thực hiện  │────▶│ Kê thuốc/  │
│ Gây tê     │     │ PTTT       │     │ VT trong mổ│
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ 5. KHO DƯỢC │
                                        │ (Xuất VT mổ)│
                                        └──────┬──────┘
                                               │
     ┌─────────────────────────────────────────┘
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Kết thúc   │────▶│ Hồi tỉnh   │────▶│ Chuyển về  │
│ PTTT       │     │            │     │ khoa LS    │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ Tính công  │────▶│ 11. TÀI    │
│ ekip mổ    │     │ CHÍNH      │
└─────────────┘     └─────────────┘
```

---

## 2.4 LUỒNG 4: XÉT NGHIỆM (Lab Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            LUỒNG XÉT NGHIỆM                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

[Từ Phòng khám/Khoa LS]
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 4. CHỈ ĐỊNH │────▶│ Phiếu yêu  │────▶│ Gửi Worklist│
│             │     │ cầu XN     │     │ (2-way LIS) │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            7. XÉT NGHIỆM (LIS)                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                        │
│  │ Lấy mẫu    │────▶│ In Barcode │────▶│ Tiếp nhận  │                        │
│  │ bệnh phẩm  │     │ ống nghiệm │     │ mẫu        │                        │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                        │
│                                                 │                               │
│       ┌─────────────────────────────────────────┘                               │
│       │                                                                         │
│       ▼                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                        │
│  │ Chạy máy   │────▶│ Nhận KQ từ │────▶│ Duyệt KQ   │                        │
│  │ XN         │     │ máy (Auto) │     │ (BS XN)    │                        │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                        │
│                             │                   │                               │
│                             ▼                   │                               │
│                      ┌─────────────┐            │                               │
│                      │ Cảnh báo   │            │                               │
│                      │ bất thường │            │                               │
│                      └─────────────┘            │                               │
│                                                 │                               │
└─────────────────────────────────────────────────┼───────────────────────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │ Trả KQ về  │
                                           │ Khoa LS    │
                                           └─────────────┘
```

---

## 2.5 LUỒNG 5: KHO DƯỢC & PHÁT THUỐC (Pharmacy Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG KHO DƯỢC & PHÁT THUỐC                              │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │         NGUỒN NHẬP KHO              │
                    ├─────────────────────────────────────┤
                    │ • Nhà cung cấp (theo thầu)          │
                    │ • Chuyển kho nội bộ                 │
                    │ • Hoàn trả từ khoa                  │
                    │ • Nguồn viện trợ/tài trợ            │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         5. KHO DƯỢC CHÍNH                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ Nhập kho   │────▶│ Kiểm nhập  │────▶│ Lưu kho    │────▶│ Quản lý    │   │
│  │            │     │ (QC)       │     │ (Lô/HSD)   │     │ tồn kho    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘   │
│                                                                     │          │
│  ┌──────────────────────────────────────────────────────────────────┘          │
│  │                                                                              │
│  │    ┌─────────────────────────────────────────────────────────────┐          │
│  │    │                    XUẤT KHO                                 │          │
│  │    ├─────────────────────────────────────────────────────────────┤          │
│  │    │                                                             │          │
│  │    │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │          │
│  │    │  │ Xuất ngoại   │  │ Xuất nội trú │  │ Xuất khoa    │   │          │
│  │    │  │ trú (đơn)    │  │ (phiếu lĩnh) │  │ phòng        │   │          │
│  │    │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │          │
│  │    │          │                  │                  │           │          │
│  │    └──────────┼──────────────────┼──────────────────┼───────────┘          │
│  │               │                  │                  │                       │
│  └───────────────┼──────────────────┼──────────────────┼───────────────────────┘
                   │                  │                  │
                   ▼                  ▼                  ▼
            ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
            │ Quầy phát  │    │ Khoa Lâm   │    │ Tủ trực    │
            │ thuốc      │    │ sàng       │    │ khoa       │
            └─────────────┘    └─────────────┘    └─────────────┘
```

### Business Rules Kho Dược:

| Rule | Mô tả | Trigger |
|------|-------|---------|
| FIFO | Nhập trước xuất trước | Auto khi xuất |
| FEFO | Hết hạn trước xuất trước | Auto khi xuất |
| Min Stock Alert | Cảnh báo tồn tối thiểu | Realtime check |
| Expiry Alert | Cảnh báo sắp hết hạn | Daily job |
| Batch Tracking | Theo dõi theo lô | Mọi giao dịch |
| Controlled Drug | Sổ theo dõi thuốc GN/HT | Mọi giao dịch |

---

## 2.6 LUỒNG 6: THANH TOÁN & BHYT (Billing & Insurance Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG THANH TOÁN & BHYT                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

[Kết thúc điều trị]
     │
     ▼
┌─────────────┐
│ Tổng hợp   │
│ chi phí    │
└──────┬──────┘
       │
       ├──────────────────────────────────────────────────────────┐
       │                                                          │
       ▼                                                          ▼
┌─────────────────────────────────────┐                 ┌─────────────────────────┐
│           CHI PHÍ                   │                 │      NGUỒN CHI TRẢ      │
├─────────────────────────────────────┤                 ├─────────────────────────┤
│ • Tiền khám                         │                 │ • BHYT (theo tỷ lệ)     │
│ • Tiền giường                       │                 │ • Viện phí (BN tự trả)  │
│ • Tiền thuốc/VTTH                   │                 │ • Dịch vụ yêu cầu       │
│ • Tiền XN/CĐHA/TDCN                 │                 │ • Nguồn khác (BHNT...)  │
│ • Tiền PTTT                         │                 │                         │
│ • Tiền vận chuyển                   │                 │                         │
└──────────────────┬──────────────────┘                 └────────────┬────────────┘
                   │                                                 │
                   └─────────────────────┬───────────────────────────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │ Tách chi phí│
                                  │ theo nguồn  │
                                  └──────┬──────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
       ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
       │ Phần BHYT  │            │ Phần BN    │            │ Phần nguồn │
       │ chi trả    │            │ tự trả     │            │ khác       │
       └──────┬──────┘            └──────┬──────┘            └─────────────┘
              │                          │
              │                          ▼
              │                   ┌─────────────┐
              │                   │ 10. THU    │
              │                   │     NGÂN   │
              │                   └──────┬──────┘
              │                          │
              │                          ▼
              │                   ┌─────────────┐
              │                   │ Thu tiền   │
              │                   │ • Tạm ứng  │
              │                   │ • Thanh toán│
              │                   │ • Hoàn ứng │
              │                   └──────┬──────┘
              │                          │
              ▼                          ▼
       ┌─────────────┐            ┌─────────────┐
       │ 12. BHYT   │            │ In hóa đơn │
       │ Giám định  │            │ Biên lai   │
       └──────┬──────┘            └─────────────┘
              │
              ▼
       ┌─────────────┐
       │ Xuất XML   │
       │ 130/4750/  │
       │ 3176/4210  │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │ Gửi cổng   │
       │ BHXH       │
       └─────────────┘
```

### Tỷ lệ BHYT chi trả:

| Đối tượng | Đúng tuyến | Trái tuyến TW | Trái tuyến tỉnh |
|-----------|------------|---------------|-----------------|
| Thông thường | 80% | 40% | 60% |
| Hộ nghèo | 100% | 100% | 100% |
| Trẻ em <6 tuổi | 100% | 100% | 100% |
| Hưu trí | 95% | 40% | 60% |

---

# PHẦN 3: MA TRẬN QUAN HỆ GIỮA CÁC PHÂN HỆ

## 3.1 Ma trận Tương tác (Interaction Matrix)

```
              │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │ 15 │ 16 │ 17 │
──────────────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
1. Tiếp đón  │ -  │ W  │ W  │ R  │ R  │    │    │    │    │ W  │    │ R  │ R  │    │    │    │ R  │
2. Khám bệnh │ R  │ -  │ W  │ W  │ W  │ W  │ R  │ R  │    │ W  │    │    │ R  │    │    │ W  │ R  │
3. Nội trú   │ R  │ R  │ -  │ W  │ W  │ W  │ R  │ R  │ W  │ W  │    │    │ R  │    │    │ W  │ R  │
4. Chỉ định  │    │ R  │ R  │ -  │ R  │ R  │ W  │ W  │    │    │    │    │ R  │    │    │    │ R  │
5. Kho Dược  │    │ R  │ R  │    │ -  │ R  │    │    │    │ W  │ W  │    │ R  │ W  │ W  │    │ R  │
6. PTTT      │    │ R  │ R  │ R  │ W  │ -  │ W  │ W  │ W  │ W  │ W  │    │ R  │    │    │ W  │ R  │
7. Xét nghiệm│    │ W  │ W  │ R  │ W  │ R  │ -  │    │    │    │    │ W  │ R  │    │    │    │ R  │
8. CĐHA/TDCN │    │ W  │ W  │ R  │ W  │ R  │    │ -  │    │    │    │ W  │ R  │    │    │    │ R  │
9. Kho Máu   │    │    │ R  │    │    │ R  │    │    │ -  │    │    │    │ R  │    │    │    │ R  │
10. Thu ngân │ R  │ R  │ R  │    │ R  │ R  │    │    │    │ -  │ W  │ W  │ R  │    │    │    │ R  │
11. Tài chính│    │    │    │    │ R  │ R  │    │    │    │ R  │ -  │    │ R  │    │    │ W  │ R  │
12. BHYT     │ R  │    │    │    │    │    │ R  │ R  │    │ R  │    │ -  │ R  │    │    │    │ R  │
13. Danh mục │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ -  │ R  │ R  │ R  │ R  │
14. Nhà thuốc│    │    │    │    │ R  │    │    │    │    │ W  │    │    │ R  │ -  │ W  │    │ R  │
15. BC Dược  │    │    │    │    │ R  │    │    │    │    │    │    │    │ R  │ R  │ -  │    │ R  │
16. HSBA/KHTH│    │ R  │ R  │    │    │ R  │    │    │    │    │ R  │    │ R  │    │    │ -  │ R  │
17. Quản trị │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ R  │ W  │ R  │ R  │ R  │ -  │

Chú thích: R = Read (đọc dữ liệu), W = Write (ghi dữ liệu), - = chính nó
```

---
## 5.1 Quy tắc Nghiệp vụ Chính (tiếp theo)

### B. Quy tắc Khám bệnh
```
RULE_EXAM_001: Bắt buộc chẩn đoán
- Phải có ít nhất 1 mã ICD-10 chính
- Mã ICD phải hợp lệ và đang hoạt động

RULE_EXAM_002: Kê đơn thuốc
- Kiểm tra tương tác thuốc (drug-drug interaction)
- Kiểm tra dị ứng thuốc của BN
- Kiểm tra chống chỉ định theo chẩn đoán
- Cảnh báo trùng thuốc trong ngày
- Cảnh báo vượt trần BHYT

RULE_EXAM_003: Chỉ định CLS
- Kiểm tra trùng DV trong ngày
- Cảnh báo DV theo TT35 (HbA1c mỗi 3 tháng)
- Tính đường đi ngắn nhất theo TT54
- Cảnh báo vượt gói DV
```

### C. Quy tắc Nội trú
```
RULE_IPD_001: Nhập viện
- Phải có chỉ định nhập viện từ BS
- Phải có chẩn đoán vào viện
- Kiểm tra giường trống

RULE_IPD_002: Chuyển khoa
- Phải có y lệnh chuyển khoa
- Hoàn thành y lệnh thuốc ngày hiện tại
- Cảnh báo CLS chưa có kết quả

RULE_IPD_003: Ra viện
- Phải có kết luận điều trị
- Hoàn thành thanh toán hoặc xác nhận nợ
- Kiểm tra thông tuyến BHYT
- Xuất XML tự động (TT48)
```

### D. Quy tắc Kho Dược
```
RULE_PHAR_001: Xuất thuốc
- FIFO: Nhập trước xuất trước
- FEFO: Hết hạn trước xuất trước (ưu tiên hơn FIFO)
- Không xuất thuốc hết hạn
- Không xuất thuốc đã khóa

RULE_PHAR_002: Kiểm soát tồn kho
- Cảnh báo tồn tối thiểu
- Cảnh báo thuốc sắp hết hạn (30/60/90 ngày)
- Khóa lô thuốc recall

RULE_PHAR_003: Thuốc kiểm soát đặc biệt
- Thuốc gây nghiện: Sổ riêng, BS có chứng chỉ mới được kê
- Thuốc hướng thần: Sổ riêng
- Thuốc có dấu (*): Phải hội chẩn
```

### E. Quy tắc BHYT
```
RULE_INS_001: Kiểm tra thông tuyến
- Gọi API BHXH trước khi đăng ký
- Lưu mã xác nhận thông tuyến
- Kiểm tra lại khi ra viện (nội trú)

RULE_INS_002: Tính chi phí BHYT
- Áp dụng tỷ lệ theo đối tượng
- Tách chi phí trong/ngoài danh mục
- Tính đồng chi trả BN
- Áp trần thanh toán

RULE_INS_003: Xuất XML
- XML 130/4750/3176 cho BN BHYT
- XML 4210 (cũ) vẫn hỗ trợ
- Tự động đẩy cổng khi ra viện
- Lưu checksum để đối chiếu
```
