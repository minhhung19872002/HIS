# MQSoft HIS — 44 Phân hệ (Corrected from Visual Analysis)

Text-only extraction previously identified only 17 modules. Visual reading of 180-page "GIỚI THIỆU MQSOFT" PDF reveals **44 phân hệ** total, organized into 3 groups per TT 54/2017. This is the authoritative module list.

---

## A. HIS-LIS-RIS (29 phân hệ)

| # | Module | Key Features |
|---|--------|-------------|
| 1 | Tiếp đón | QR BHYT/CCCD scan, BHYT online check, cost estimation, drug alert from previous visits, multi-room registration |
| 2 | Cấp số gọi số thông minh | Kiosk hardware, Đề án 06 CCCD, ticket QR, 4 patient types (BHXH/thông tuyến/thu phí/trái tuyến) |
| 3 | Khám sức khỏe đoàn | 7 types: company, batch XN, batch vitals, driver license DA06, employment, TT14 adults+children (dental chart), food safety |
| 4 | Phòng khám | 7-step flow, CLS packages with pricing, drug allergy warning, BHYT CLS daily limit, blood type mismatch alert |
| 5 | Ngoại trú | 9 functions: treatment info, monitoring, CLS orders, prescriptions (BHYT/fee/external), inventory check, drug duplicates, outpatient cabinet, follow-up, surgery records |
| 6 | Cấp cứu tổng hợp | 9 functions similar to OPD + accident/injury management, emergency drug cabinet, transfer forms 01/02BV |
| 7 | Nội trú | 9 functions: admission confirm, advance payment, consultation, order consolidation, view records, print requisition/dispensing slips, service transparency form, payment form XML 4210 |
| 8 | Lưu trữ HSBA | THƯ VIỆN HSBA-SCAN: scan paper records, document count by type (Siêu âm, X-Quang, CT...), borrow/return tracking |
| 9 | Sắp lịch phòng mổ | Patient info, procedure type, anesthesia method, surgeon/anesthetist assignment, timing |
| 10 | Phòng giường | Room/bed registration, bed layout diagram, pricing by 5 categories (BHYT/Bảo hiểm/Chính sách/Dịch vụ/Nước ngoài) |
| 11 | Kho Dược | Import (regular/re-import/consignment), transfer, requisition+approval, 5 dispensing slip types, expiry alerts, central compounding, drug interaction DB (QĐ 5948), 18+ reports, national prescription interop |
| 12 | Nhà thuốc | Retail dispensing, e-invoice (Thái Sơn), discharge payment, charity fund management |
| 13 | Viện phí | Multi-column price catalog, billing by bảng kê, advance payments, POS integration, 6 e-invoice partners |
| 14 | Xét nghiệm | Barcode sample collection (OPD+inpatient), result return (lab/bedside), auto machine import (1-way/2-way), result templates, reagent management, multiple result form types |
| 15 | Ngân hàng máu | Blood product management |
| 16 | (continued from 15) | Extended blood bank features |
| 17 | CĐHA + PACS | 4 modalities (Siêu âm/Nội soi/X-Quang/CT-MRI), dispatch workflow, result templates, DICOM/HL7 2-way, QR on results, ECG trace, endoscopy images |
| 18 | Thăm dò chức năng | ECG, EEG, Endoscopy, supplies management, PACS connection |
| 19 | Dinh dưỡng | 4-step: create → approve → print → statistics meal orders by department |
| 20 | Kiểm soát nhiễm khuẩn | Separate warehouse: catalog, procurement, import/export, department requisition approval |
| 21 | Kết nối máy XN tự động | 1-way (manual tube→analyzer→auto result) vs 2-way (barcode→auto queue→auto result) |
| 22 | Chất lượng BV | Desktop dashboard with department statistics (admissions, transfers, deaths, etc.) |
| 23 | Quản trị người dùng | Role-based access, granular function tree permissions |
| 24 | Danh mục dùng chung | ICD-10, PTTT 1408 codes, administrative areas (Tỉnh/Quận/Xã), ethnic groups, staff, BYT report forms |
| 25 | Báo cáo tổng hợp | 54+ templates: viện phí (14+), khám bệnh (14+), dược, CĐHA/XN, BHXH (mẫu 79/80/19/20/21), KSK đoàn (11) |
| 26 | Ruler kiểm tra XML | Web-based BHXH XML validation before submission, error export |
| 27 | Phác đồ điều trị | Protocol database by ICD, warning when prescribing outside protocol, BHYT enforcement |
| 28 | Hóa đơn điện tử | 6 partners (MISA, S-Invoice Viettel, Hilo, VNPT, SOFTDREAMS, Thái Sơn), batch/single issuance |
| 29 | Liên thông BYT (Đề án 06) | Driver license health check, birth/death certificate digital forms |

## B. Quản lý điều hành (5 phân hệ)

| # | Module | Key Features |
|---|--------|-------------|
| 30 | Vật tư y tế | Full supply chain: catalog → procurement → import/re-import/return → export → department approval → ward cabinet → supplier return → recall → expiry management |
| 31 | Trang thiết bị y tế | Asset lifecycle: import → deploy (depreciation start) → transfer → depreciation calculation → maintenance → revaluation → recall → disposal |
| 32 | Văn phòng phẩm | Import from supplier, department requisitions, distribution, reports |
| 33 | Nhân sự | Detailed employee info, time/attendance tracking, reports |
| 34 | Chỉ đạo tuyến + NCKH | Healthcare network direction, research project tracking |

## C. EMR + Tích hợp (10+ phân hệ)

| # | Module | Key Features |
|---|--------|-------------|
| 35 | Tích hợp ERP | 11 sync processes HIS↔ERP/SAP (warehouse, OPD sales, inpatient sales, consignment, group health check, charity, SAP-ERP-LabConn) |
| 36 | Website BN (Patient Portal) | Online booking (room/slot/price), health check packages (e-commerce cards), view results (prescriptions/XN/CĐHA with QR), medical record view, CCCD QR verification |
| 37 | Số hóa HSBA | 7-tab inpatient HSBA, 47 medical forms, 22 specialty BA types, treatment sheet, TT32 nursing forms, infusion monitoring, record summary (20+ form checklist) |
| 38 | Chữ ký số | 4 levels (BS→BS tổng kết→Trưởng khoa→Lãnh đạo), patient biometric fingerprint, PDF signed storage, view/cancel CKS |
| 39 | Sự cố y khoa | Web dashboard: incident reporting (mandatory/voluntary), WHO patient safety bulletins, safety newsletters |
| 40 | Lịch hẹn + nhắc nhở | Zalo OA integration: automated appointment confirmation, test result notification |
| 41 | Dashboard chất lượng (Web) | Real-time: patient flow metrics, wait time by visit type, XN cost by payment type, CLS statistics, department occupancy. Pie/bar/trend charts |
| 42 | Mobile EMR | iOS/Android: login → select department/BA type → select patient → 6 sections (treatment sheet, infusion, nursing, CLS orders, consultation minutes, drug transparency). WiFi print |
| 43 | Thanh toán KTM | 6 banks (VietinBank/BIDV/MBBank/Agribank/HDBank/VNPAY), QR embedded in CLS modules, 26+ transaction flows, QR receipts |
| 44 | Quản lý nhiều CSYT | 1 hospital managing multiple satellite clinics (e.g., BV TP Thủ Đức + 5 PK) |
