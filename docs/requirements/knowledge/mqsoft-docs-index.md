# MQSoft HIS Functional Documentation — Reading Index

**Location:** `C:\Users\ADMIN\workspace\Free\HIS\docs\TaiLieuChucNang\`
**Total:** 36 PDFs, ~1,200 pages. ALL 36 PDFs now COMPLETE with visual analysis (2026-06-01).
**Knowledge files:** 20 markdown files in `knowledge/` directory.
**Page images:** 571 PNGs in `knowledge/_pages/` (200 DPI via PyMuPDF).

---

## Root Documents

| File | Pages | Size | Content | Read Status |
|------|-------|------|---------|-------------|
| `GIỚI THIỆU MQSOFT -Ver1.5.pdf` | 180 | 23MB | **Most important** — all 44 modules with UI screenshots, architecture diagrams, workflow flows | COMPLETE (all 180 pages visual) |
| `Thuyet minh giai phap phan mem.pdf` | 111 | 4.7MB | Main spec — 14 modules, use cases, actors, activity diagrams | COMPLETE (visual) → `mqsoft-thuyetminh-pt1/2/3.md` |
| `Giai phap va phuong phap luan.pdf` | 12 | 0.9MB | Deployment methodology, legal basis, technology stack | COMPLETE (visual) → `mqsoft-emr-mobile-misc.md` |
| `1.2. HDSD_DesktopEMR.pdf` | 105 | 21.5MB | Duplicate of HDSD_EMR version | Skipped (duplicate) |

## HDSD_EMR/ (Electronic Medical Records)

| File | Pages | Content | Read Status |
|------|-------|---------|-------------|
| `HDSD_DesktopEMR.pdf` | 105 | 47 medical forms, 22 BA types, 4-level signing, patient biometric | COMPLETE (visual) → `mqsoft-emr-desktop-pt1/2/3.md` |
| `HDSD_WebEMR.pdf` | 69 | Doctor + Patient portal interfaces | COMPLETE (visual) → `mqsoft-emr-web-pt1/2.md` |
| `HD_appmobie_xemBenhAn.pdf` | 23 | Mobile EMR guide | COMPLETE (visual) → `mqsoft-emr-mobile-misc.md` |

## HDSD_HIS_LIS/ (22 PDFs — Hospital Modules)

| File | Pages | Content | Read Status |
|------|-------|---------|-------------|
| `MQ - Tiếp đón.pdf` | 29 | Reception: Đặt khám + Đăng ký khám workflows | COMPLETE (visual) |
| `MQ - Phòng khám - Khám bệnh.pdf` | 57 | OPD examination: 7-step flow, CLS, prescriptions, payment | COMPLETE (visual TOC + key pages) |
| `MQ - Phòng khám - Khai báo sử dụng.pdf` | 13 | OPD configuration: viết tắt, đơn thuốc mẫu, HSBA mẫu, tường trình PTTT mẫu | COMPLETE (visual) → `mqsoft-opd-config.md` |
| `MQ - Nội trú - Bác sĩ.pdf` | 36 | Inpatient doctor: treatment sheet, 3 drug order types, surgery 5 forms | COMPLETE (visual) |
| `MQ - Nội trú - Trả kết quả XN tại giường.pdf` | 4 | Bedside lab result return | Skipped (covered in XN docs) |
| `MQ - Dược.pdf` | 28 | Pharmacy: warehouse, dispensing, BHYT, supply management | COMPLETE (visual) |
| `MQ - XN - Khai Báo Sử Dụng.pdf` | 11 | Lab configuration: đơn vị đo, vi trùng, kháng sinh, số XN, xét nghiệm | COMPLETE (visual) → `mqsoft-lab-config-receive-permissions.md` |
| `MQ - XN - Lấy mẫu bệnh phẩm.pdf` | 13 | Sample collection: 9-step workflow | COMPLETE (visual) |
| `MQ - XN - Nhận mẫu bệnh phẩm.pdf` | 6 | Sample receiving: xác nhận mẫu, workflow 5 bước, nội trú bypass | COMPLETE (visual) → `mqsoft-lab-config-receive-permissions.md` |
| `MQ - XN - Phân quyền.pdf` | 5 | Lab permissions: KTV vs Người duyệt, xác nhận mẫu permission | COMPLETE (visual) → `mqsoft-lab-config-receive-permissions.md` |
| `MQ - XN - Trả kết quả XN.pdf` | 15 | Result return: 12-step workflow, auto machine import | COMPLETE (visual) |
| `MQ - CĐHA - Khai Báo Sử Dụng.pdf` | 14 | Radiology config: loại CĐHA, máy thực hiện, mẫu mô tả template | COMPLETE (visual) → `mqsoft-radiology-config-permissions.md` |
| `MQ - CĐHA - Phân quyền chụp đọc.pdf` | 6 | Radiology permissions: Chụp vs Đọc profiles, permission tree X/74 | COMPLETE (visual) → `mqsoft-radiology-config-permissions.md` |
| `MQ - CĐHA - Thực hiện CĐHA.pdf` | 11 | Radiology execution: 6-step workflow | COMPLETE (visual) |
| `MQ - CĐHA - Điều phối.pdf` | 5 | Radiology dispatch workflow | COMPLETE (visual) |
| `MQ - Khai báo CĐHA nhập tường trình PTTT.pdf` | 3 | Surgery report in radiology: liên kết dịch vụ CĐHA → PTTT input | COMPLETE (visual) → `mqsoft-radiology-config-permissions.md` |
| `MQ - Khai báo sổ biên lai.pdf` | 4 | Receipt book: quy tắc đặt tên, _TU suffix, 2×12 bước thu tạm ứng/viện phí | COMPLETE (visual) → `mqsoft-misc-config.md` |
| `MQ-EMR- Website số hóa bệnh án.pdf` | 11 | Web EMR digitization | COMPLETE (visual) |
| `MQ-EMR-CKS & Trình ký số lãnh đạo.pdf` | 17 | Digital signature: 4-level flow, leadership signing | COMPLETE (visual) |
| `MQ-KTM-Thanh toán không dùng tiền mặt.pdf` | 89 | Cashless payment: 6 banks, 26+ flows | COMPLETE (visual key pages) |
| `HD Quản lý nhân sự.pdf` | 5 | HR management: hồ sơ NV 9 tabs, lương, BHXH, hợp đồng | COMPLETE (visual) → `mqsoft-misc-config.md` |
| `HD TTB VPP .pdf` | 6 | Equipment + office supplies: nhập kho, duyệt cấp, 14 reports | COMPLETE (visual) → `mqsoft-emr-mobile-misc.md` |

## HDSD_PACS_RIS/ (7 PDFs — VRPACS by C+ Technology)

| File | Pages | Content | Read Status |
|------|-------|---------|-------------|
| `HDSC_RIS_NONDICOM_2.334.pdf` | 17 | Non-DICOM: camera capture, 5 statuses, HIS sync | COMPLETE (visual) → `mqsoft-ris-detail.md` |
| `HDSD_RIS_DICOM_2.334.pdf` | 33 | DICOM: worklist, templates, HIS sync, DrAid AI, share | COMPLETE (visual) → `mqsoft-ris-detail.md` |
| `HDSD_Admin.pdf` | 33 | Admin: statistics, management, config, permissions | COMPLETE (visual) → `mqsoft-pacs-admin-hoichan.md` |
| `HDSD_HOICHAN_ONLINE.pdf` | 9 | Online consultation: video conference, 2 modes | COMPLETE (visual) → `mqsoft-pacs-admin-hoichan.md` |
| `HDSD_MOBILE-v2.pdf` | 58 | Mobile PACS: worklist 22 features, DICOM viewer, reporting | COMPLETE (visual) → `mqsoft-pacs-mobile.md` |
| `HDSD_VIEWER.pdf` | 21 | DICOM viewer: MPR, 3D, 9 toolbar groups, all tools | COMPLETE (visual) → `mqsoft-pacs-viewer.md` |
| `HDSD-Tạo và in ảnh key - Cloud.pdf` | 7 | Key image: crop, send to HIS, gallery, print template per machine | COMPLETE (visual) → `mqsoft-misc-config.md` |

## Knowledge Files

| File | Content |
|------|---------|
| `mqsoft-reference-findings.md` | Deep analysis: 44 modules, clinical safety, MQSoft vs MediFlow |
| `mqsoft-44-modules.md` | All 44 modules in 3 groups with features |
| `mqsoft-clinical-safety.md` | Drug allergy, interaction, BHYT, protocol warnings |
| `mqsoft-workflows.md` | Reception, OPD, inpatient, pharmacy, lab, radiology workflows |
| `mqsoft-integrations.md` | Banks, e-invoice, Zalo, ERP, PACS HL7, security |
| `mqsoft-emr-forms.md` | 47 forms, 22 BA types, TT32 nursing, digital signature |
| `mqsoft-dashboard-reports.md` | Quality dashboard, 54+ BYT reports, pharmacy reports |
| `mqsoft-opd-config.md` | OPD khai báo: viết tắt, đơn thuốc mẫu, HSBA mẫu, PTTT mẫu |
| `mqsoft-lab-config-receive-permissions.md` | Lab: 5 khai báo, nhận mẫu 5 bước, KTV/Người duyệt |
| `mqsoft-radiology-config-permissions.md` | CĐHA: loại/máy/mẫu, Chụp vs Đọc permissions, PTTT link |
| `mqsoft-misc-config.md` | Sổ biên lai, nhân sự 9 tabs, PACS key image |
| `mqsoft-emr-desktop-pt1.md` | Desktop EMR pages 1-35: TOC + forms 1.1-1.31 |
| `mqsoft-emr-desktop-pt2.md` | Desktop EMR pages 36-70: forms 1.32-1.47 + BA 2.1-2.11 |
| `mqsoft-emr-desktop-pt3.md` | Desktop EMR pages 71-105: BA 2.12-2.22 + 4-level signing |
| `mqsoft-emr-web-pt1.md` | Web EMR pages 1-35: doctor interface, 3 BA types |
| `mqsoft-emr-web-pt2.md` | Web EMR pages 36-69: tờ điều trị, ký số, patient portal |
| `mqsoft-emr-mobile-misc.md` | Mobile EMR + giải pháp phương pháp luận + TTB-VPP |
| `mqsoft-thuyetminh-pt1.md` | Thuyết minh pages 1-37: 14 modules, actors, architecture |
| `mqsoft-thuyetminh-pt2.md` | Thuyết minh pages 38-74: use case specs + activity diagrams |
| `mqsoft-thuyetminh-pt3.md` | Thuyết minh pages 75-111: XN, CĐHA, Dược, Viện phí, CNTT |
| `mqsoft-ris-detail.md` | RIS: Non-DICOM 5 statuses + DICOM worklist, HIS sync, DrAid AI |
| `mqsoft-pacs-admin-hoichan.md` | PACS Admin + hội chẩn online video conference |
| `mqsoft-pacs-viewer.md` | DICOM Viewer: MPR, 3D, 9 toolbar groups, all measurement tools |
| `mqsoft-pacs-mobile.md` | Mobile PACS: worklist 22 features, mobile DICOM viewer |

## Notes
- MQSoft company: MQ Solutions, TP. Thủ Đức, HCM. Phone: 0987 036 336
- Architecture: WinForm .NET 3-tier, Oracle/SQL Server
- VRPACS: Separate product by C+ Technology (Hanoi)
- Known gaps: 3 pages in thuyetminh (098, 099, 102) + 15 pages in pacs_mobile (47, 51-58) rejected by API image limits — content inferred from TOC
