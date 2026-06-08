# MQSoft HIS — Deep Reference from Visual Document Analysis (2026-05-29)

MQSoft is a production Vietnamese HIS deployed at 20+ hospitals (BV Nhân Dân 115, BV TP Thủ Đức, BV Truyền máu-Huyết học, etc.). Visual analysis of 180-page intro + 36 PDF documents reveals **44 phân hệ** (not 17 as text-only extraction suggested). Critical depth reference for Vietnamese hospital workflows.

---

## 44 Modules (29 HIS-LIS-RIS + 5 Điều hành + 10 EMR)

### Key Clinical Safety Features (must-implement for production HIS)
- Drug allergy warning popup during prescribing
- Drug interaction database per QĐ 5948/BYT (severity levels 1-3)
- ICD-BHYT protocol compliance (warn when prescribing outside phác đồ)
- BHYT daily CLS limit enforcement
- Blood type mismatch warning for transfusion orders
- Real-time patient debt check at department level

### Key Integration Features
- QR scan BHYT card + CCCD at registration
- Kiosk self-registration (Đề án 06)
- 6 e-invoice partners (MISA, Viettel, Hilo, VNPT, SOFTDREAMS, Thái Sơn)
- 6 cashless payment partners (VietinBank, BIDV, MBBank, Agribank, HDBank, VNPAY) with 26+ transaction flows
- Zalo OA integration for appointment reminders
- National prescription interoperability (Liên thông đơn thuốc quốc gia)
- 11 ERP/SAP sync processes
- Đề án 06: driver license health check, birth/death certificates
- XML BHXH validation ruler before submission

### Key Clinical Workflow Details
- Inpatient: 3 types of drug orders (regular requisition, emergency cabinet, return)
- Surgery: 5 pre/post forms (pre-anesthesia, monitoring, post-anesthesia plan, psychological assessment, consent)
- Pharmacy: 5 dispensing slip types, expiry alerts on login, central compounding, consignment drugs
- Lab: 1-way vs 2-way analyzer connection, bedside result return, reagent management
- Radiology: dispatch workflow (select room → print dispatch slip), biopsy entry, ECG trace integration
- Quality dashboard: real-time wait time by visit type, CLS cost by payment type, department occupancy

### Architecture
- DES encryption for data + RSA for signatures on every API call
- Oracle Active Data Guard (Primary ↔ Standby DR)
- Multi-facility: 1 hospital managing multiple satellite clinics

---

## Comparison: MQSoft vs MediFlow

| Feature | MQSoft | MediFlow Status |
|---------|--------|-----------------|
| Drug allergy warnings | Yes (realtime) | Need to implement |
| Drug interaction DB | Yes (QĐ 5948) | Need to implement |
| ICD-BHYT protocol check | Yes | Need to implement |
| QR BHYT/CCCD scan | Yes | Need to implement |
| Cashless payment | 6 banks, 26+ flows | VNPay basic only |
| Zalo OA | Yes | Not started |
| Quality dashboard | Web real-time | Not started |
| Mobile EMR | iOS/Android native | Not started |
| Patient portal | Full (booking, results) | Not started |
| Digital signature | 4-level + fingerprint | Not started |
| ERP integration | 11 SAP flows | Not started |
| Medical incident mgmt | Web dashboard | Not started |
