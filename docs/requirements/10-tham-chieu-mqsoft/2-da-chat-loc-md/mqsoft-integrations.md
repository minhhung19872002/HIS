# MQSoft Integration Details — From 89-page KTM Doc + Screenshots

MQSoft has mature integrations with Vietnamese-specific systems. These represent the integration landscape a production HIS needs.

---

## 1. Cashless Payment (Thanh toán KTM) — 89 pages HDSD

**Partners:** VietinBank (VTB), BIDV, MBBank, Agribank, HDBank, VNPAY

### Payment Flow
1. Cashier creates billing (THU VIỆN PHÍ THEO BẢNG KÊ)
2. System generates QR code (MQPay)
3. Patient scans QR with banking app
4. App shows: "Chưa thanh toán" → Patient confirms → "Đã thanh toán"
5. Transaction details: ID thanh toán, Mã BN, Họ tên, Địa chỉ, Giao dịch (MQPay), Ngày, Đơn vị thụ hưởng, Tổng tiền
6. System auto-updates billing status
7. Print receipt with QR code + barcode

### QR PAY Embedded in Clinical Modules
- Siêu âm worklist: QR PAY column per patient
- X-Quang worklist: QR PAY column per patient
- Allows payment BEFORE performing CLS

### 26+ Transaction Flows (every combination of)
- **Action:** Đăng ký khám (registration), CLS, Tạm ứng (advance), BV01/BV02 forms, Hoàn trả (refund), Khám 2 chuyên khoa
- **Patient type:** Thu phí (fee), Dịch vụ (service), BHYT, BHYT phụ thu (surcharge)
- **Location:** Regular clinic, Phòng tiêm ngừa (vaccination), Phòng khám ngoại, Phòng lọc (screening)

**Receipt types (with QR):** Phiếu thu viện phí, Phiếu tạm ứng, Phiếu hoàn trả

---

## 2. E-Invoice (Hóa đơn điện tử)

**6 Partners:** MISA, S-Invoice Viettel, Hilo, VNPT, SOFTDREAMS, Thái Sơn

**Features:**
- Configuration: pattern number, serial number per partner
- Batch issuance (multiple invoices at once)
- Single issuance (per patient)
- XML log files by patient
- Integration visible in pharmacy module (Nhà thuốc)

---

## 3. Zalo OA (Official Account)

**Use case:** Appointment reminders and result notifications
- Automated messages: "Xin chào [Tên]. Cảm ơn Quý khách có mã khách hàng [Mã] đã sử dụng dịch vụ của PKĐK [name] vào ngày [date]. Quý khách có thể xem kết quả khám bệnh tại đây."
- Button: "Xem kết quả" (View results) — links to patient portal
- Template-based messaging (Template ID visible in screenshots)
- Deployed at PKĐK Đại Phước

---

## 4. ERP/SAP Integration — 11 Processes

1. Kết nối kho HIS↔ERP (Warehouse sync)
2. Đồng bộ Data HIS→ERP (Data sync)
3. Hàng giao bán từ ERP→HIS (Goods from ERP)
4. Hàng ký gửi (Consignment goods)
5. Bán hàng nội trú HIS→ERP (Inpatient sales sync)
6. Bán hàng ngoại trú HIS→ERP (Outpatient sales sync)
7. Khám chữa bệnh cho đoàn (Group health check sync)
8. BN miễn giảm, xuất bán hàng tài trợ (Charity/discount sync)
9. Nghiệp vụ kho: nhập xuất HIS→ERP (Warehouse import/export)
10. Bán hàng tự ERP đồng bộ qua HIS (Sales from ERP to HIS)
11. Đồng bộ giữa SAP-ERP-LabConn (SAP-ERP-Lab connector)

---

## 5. Đề án 06 (National Digital Government)

- **KSK lái xe:** Driver license health check integrated with national system
- **Giấy khai sinh điện tử:** Digital birth certificate
- **Giấy chứng tử điện tử:** Digital death certificate
- **Kiosk:** Physical kiosk with CCCD scan for self-registration

---

## 6. PACS/RIS (VRPACS by C+ Technology, Hanoi)

**Integration:** HL7 standard 2-way connection HIS↔PACS

### VRPACS Features (from 7 PDFs)
- **RIS DICOM:** Filter/search, result templates CRUD, statistics, HIS sync (update+send), DICOM/JPEG download, cancel results, split screen, history, clinical update
- **RIS Non-DICOM:** Camera HTTP capture, 5 statuses, HIS sync
- **DICOM Viewer:** Brightness, zoom, scroll, measure, MPR (8 tool groups), 3D (rotate/clip), annotations, share, key images
- **Admin:** Statistics, BS management, services, result templates, backup, PACS cameras, zones, permissions, print templates
- **Online Consultation:** Create room → Video conference → Screen share → Record → Share case → End
- **Mobile (iOS/Android):** Full RIS+PACS with 22+ features
- **Key Images:** Create and print key diagnostic images from cloud

---

## 7. National Prescription Interop (Liên thông đơn thuốc quốc gia)

- Integration with BYT national prescription system
- Prescriptions formatted per BYT header standards
- Visible in pharmacy reporting module

---

## 8. BHXH XML Export

- **Standard:** QĐ 4210/BYT
- **Forms:** Mẫu 79, 80 HĐ, 19, 20, 21
- **Ruler (Module 26):** Web-based XML validation tool before submission
- **Error handling:** Export error descriptions for correction

---

## 9. Security Architecture

- **Encryption:** DES for JSON payload, RSA for digital signature
- **Sequence:** Client (encrypt DES + sign RSA) → Server (decrypt → verify → process → encrypt DES response) → Client (decrypt DES)
- **Audit:** Log CĐHA (radiology actions), Log hành chính (admin actions) — detailed tracking tables
- **Backup:** Oracle Active Data Guard: MQSOFTPRM (Data Center) ↔ MQSOFTSTB (Disaster Recovery)
