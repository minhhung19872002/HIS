# 20 — Yêu cầu nâng cấp / gói thầu (SPEC)

**Có gì:** các gói **NangCap1–24** (PDF) — danh sách tính năng/yêu cầu từ các đợt nâng cấp & gói thầu.

**Dùng để làm gì:** **driver tính năng** — mỗi gói NangCapNN là một tập yêu cầu cần đóng (gap-closing).
Khi triển khai một gói: đọc PDF → liệt kê gap so với codebase → implement → đánh dấu `[NN]` trên menu → viết docs.

## Nội dung
- `NangCap.pdf`, `NangCap2.pdf` … `NangCap24.pdf` — từng gói yêu cầu.

## Bảng tra gói NangCap

> Trạng thái: **✅ Đã xong** (có doc/đối chiếu chi tiết) · **🟢 Đã tích hợp** (module/entity có trong codebase theo `MODULE_MAP §2.4`, chưa đối chiếu từng hạng mục).
> Nguồn: `docs/roadmap/nangcap-phan-tich.md` (gói 1–4) · `docs/architecture/MODULE_MAP.md §2.4` (gói 5–23) · `docs/features/nangcap23|24/` · menu `[NN]`.

| Gói | Phân hệ / chủ đề | Khách hàng | Trạng thái | Nguồn / ghi chú |
|---|---|---|---|---|
| **1** (`NangCap.pdf`) | HSMT tổng — nâng HIS **mức 6** + EMR (TT 54/2017, 32/2023, 13/2025) | BV ĐH Y Dược Huế | ✅ Đã xong | 14 phân hệ + bổ sung mức 6 + EMR đều DA XONG — `nangcap-phan-tich.md` PHẦN 1–3 |
| **2** | Kết nối **LIS–HIS** (37 hạng mục) | BV Tứ Dữ | ✅ 100% (37/37) | `nangcap-phan-tich.md` PHẦN 4 |
| **3** | **EMR Da liễu** (10 hạng mục) | – | ✅ 100% (10/10) | PHẦN 5 |
| **4** | Gói thầu BV Đa khoa Thái Bình (349 hạng mục) | BV Thái Bình | 🟢 ~99% (346/349) | còn 1 phần cứng (thẻ thông minh) + 3 tài liệu — PHẦN 6 |
| **5** | Đơn thuốc QG · Y tế dự phòng · Quản lý dữ liệu | Tổng quát | 🟢 Đã tích hợp | MODULE_MAP |
| **6** | Ký số tập trung · EMR Admin | Tổng quát | 🟢 Đã tích hợp | `DigitalSignature.cs` |
| **7–9** | Giai đoạn setup | – | 🟢 Đã tích hợp | (setup phases) |
| **10** | Luồng trình ký (Signing Workflow) | – | 🟢 Đã tích hợp | `DocumentHold.cs` |
| **11** | EMR Admin | – | 🟢 Đã tích hợp | MODULE_MAP |
| **12** | Bảo mật endpoint | – | 🟢 Đã tích hợp | MODULE_MAP |
| **13** | Cảnh báo nghiệp vụ (34 rule) | – | 🟢 Đã tích hợp | MODULE_MAP |
| **14** | Bệnh mạn tính · Nhà thuốc BV · Phác đồ · Lao/HIV | BV Phổi Hải Dương | 🟢 Đã tích hợp | `ChronicDisease/HospitalPharmacy/ClinicalGuidance/TbHivManagement.cs` |
| **15** | RIS 21 tính năng · PACS · 30 mẫu EMR chuyên khoa | – | 🟢 Đã tích hợp | MODULE_MAP |
| **16** | Quản lý EMR (10 tính năng) | BV Cam Ranh | 🟢 Đã tích hợp | `EmrManagement.cs` |
| **17** | Tài sản · Đào tạo · IVF | – | 🟢 Đã tích hợp | `AssetManagement/TrainingResearch/IvfLab.cs` |
| **18** | Thực thể mở rộng | – | 🟢 Đã tích hợp | `NangCap18Entities.cs` |
| **19** | Cổng bệnh nhân (4 tính năng) | TTYT Quảng Hòa | 🟢 Đã tích hợp | MODULE_MAP |
| **20** | LIS-HIS · Giải phẫu bệnh · Kho cấy | – | 🟢 Đã tích hợp | `Pathology/CultureStock/LabCatalog.cs` |
| **21** | Đa cơ sở 3 cấp | – | 🟢 Đã tích hợp | MODULE_MAP |
| **22** | 13 danh mục master | BV Đắk Nông | 🟢 Đã tích hợp | `MasterCatalogs.cs` |
| **23** | 9 gap (Đơn thuốc QG · Dược QG · Đề án 06 · Linen · FDT · Zalo · Quality dashboard) | BV Đa khoa | ✅ Đã xong | `docs/features/nangcap23/` (bộ docs đầy đủ) · `NangCap23Entities.cs` |
| **24** | 10 gap (Biometric/WebAuthn · Inspector Portal BHXH · EMR HL7/Cloud sync · DICOM auto-send · HL7 queue · VietQR…) | BV Đa khoa | ✅ Đã xong | `docs/features/nangcap24/` · menu `[24]` |

## Lộ trình
- **Đối chiếu sâu gói 🟢** (5–22): khi cần, mở PDF → checklist từng hạng mục vs codebase để nâng lên ✅ (hiện chỉ xác nhận *đã tích hợp module*, chưa soát từng mục).
- Chuẩn hóa dần mỗi gói PDF → `NangCapNN.md` (tóm tắt yêu cầu + checklist gap) trong vùng này hoặc `2-da-chat-loc-md/`.
- Cập nhật cột Trạng thái khi đóng thêm gap / thêm khách hàng mới.
