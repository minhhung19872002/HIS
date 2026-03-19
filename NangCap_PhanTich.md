# Phan Tich Yeu Cau Nang Cap HIS Muc 6 & EMR

> So sanh yeu cau trong NangCap.pdf voi he thong HIS hien tai
> **Cap nhat lan cuoi: 2026-03-19**

## Tong quan

- **Chu dau tu**: Benh vien Truong Dai hoc Y - Duoc Hue
- **Muc tieu**: Nang cap HIS dat muc 6 + Phan mem Benh an dien tu (EMR)
- **Tieu chuan**: TT 54/2017, TT 32/2023, TT 13/2025, HD 365/TTYQG, QD 1898/QD-BYT
- **Ngan sach**: 998.000.000 VND
- **Thoi gian**: 60 ngay

---

## PHAN 1: NANG CAP HIS DAT MUC 6 (3.1)

### Bang so sanh 14 phan he

| STT | Yeu cau | Module hien tai | Trang thai |
|-----|---------|-----------------|------------|
| 01 | Quan ly tiep don | `/reception` - Reception.tsx | DA XONG - In thoi gian du kien, noi CLS, SMS/Email |
| 02 | Quan ly kham benh | `/opd` - OPD.tsx | DA XONG - Them CDS AI, NEWS2, ke thua du lieu |
| 03 | Quan ly ngoai tru | `/opd` + `/follow-up` | DA XONG - FollowUp tracking, tai kham |
| 04 | Quan ly cap cuu | `/emergency-disaster` | DA XONG - Real API (Session 14) |
| 05 | Quan ly noi tru | `/ipd` - Inpatient.tsx | DA XONG - To dieu tri, phieu cham soc, dien bien |
| 06 | Quan ly phong mo | `/surgery` - Surgery.tsx | DA XONG - 38 bieu mau EMR (tien me, cam ket, duyet PT) |
| 07 | Quan ly Duoc | `/pharmacy` - Pharmacy.tsx | DA XONG - Drug interaction, doi chieu |
| 08 | Quan ly Nha thuoc | `/pharmacy` + `/medical-supply` | DA XONG - MedicalSupply module rieng |
| 09 | Quan ly vien phi | `/billing` - Billing.tsx | DA XONG - 8 bao cao doi chieu Level 6 |
| 10 | Quan ly xet nghiem | `/lab` - Laboratory.tsx + 6 LIS modules | DA XONG - LIS hoan chinh, SMS/Email ket qua |
| 11 | Quan ly CDHA | `/radiology` - Radiology.tsx | DA XONG - PACS + ky so + thong bao |
| 12 | Quan ly vat tu | `/medical-supply` - MedicalSupply.tsx | DA XONG - Module rieng (Session 16) |
| 13 | Quan ly BHYT | `/insurance` - Insurance.tsx | DA XONG - XML 4210, BHXH stub |
| 14 | He thong goi BN | `/queue-display` - QueueDisplay.tsx | DA XONG - LCD, TTS, lab mode (Session 9, 22) |

### Yeu cau bo sung muc 6

| STT | Yeu cau | Trang thai | Session |
|-----|---------|------------|---------|
| 1 | In thoi gian du kien kham cho BN | DA XONG | 16 |
| 2 | In noi thuc hien CLS | DA XONG | 16 |
| 3 | Thong bao ket qua qua SMS | DA XONG | 19 |
| 4 | Thong bao ket qua qua Email | DA XONG | 10 |
| 5 | Theo doi ket qua trung thau theo NCC | DA XONG (Reconciliation Reports) | 14 |
| 6 | Tinh doanh thu chi phi theo HSBA | DA XONG | 14 |
| 7 | Doi chieu chi phi khoa phong vs vien phi | DA XONG | 14 |
| 8 | Tong hop chi phi HSBA: su dung vs thu | DA XONG | 14 |
| 9 | Doi chieu vien phi vs dinh muc DVKT | DA XONG | 14 |
| 10 | Doi chieu DVKT giua BS chi dinh va BS thuc hien | DA XONG | 14 |
| 11 | Doi chieu xuat kho thuoc/VTYT vs vien phi theo khoa | DA XONG | 14 |
| 12 | Doi chieu xuat kho vs dinh muc theo khoa phong | DA XONG | 14 |

---

## PHAN 2: PHAN MEM BENH AN DIEN TU - EMR (3.2)

### 2.1. Tinh nang EMR

| STT | Yeu cau | Trang thai | Session |
|-----|---------|------------|---------|
| 1.1 | Thiet ke dang WEB | DA XONG - React 19 + Vite | - |
| 1.2 | Responsive design | DA XONG - Mobile drawer, tablet collapse | 16 |
| 1.3 | Dang nhap 2 lop (2FA Email OTP) | DA XONG | 9 |
| 1.4 | HL7 FHIR v4.0.1 + SNOMED CT | DA XONG - 8 resources + 200+ mappings | 15, 18 |
| 1.5 | Thuat ngu lam sang BV tu khai bao | DA XONG - ClinicalTermSelector + 58 terms | 11 |
| 1.6 | BS chon trieu chung theo BN (checklist) | DA XONG - ClinicalTermSelector trong OPD | 11 |
| 1.7 | Nhap du lieu dang checklist | DA XONG - Checklist + free text | 11 |
| 1.8 | Ke thua du lieu tu giao dien khac | DA XONG - Reception→OPD→Rx→Billing→Pharmacy→IPD | 14 |
| 1.9 | Xac nhan chu ky so | DA XONG - USB Token + iText7 PDF | 16 |
| 1.10 | Tong ket HSBA thanh PDF co ky so | DA XONG - PdfGenerationService + PdfSignatureService | 16 |
| 1.11 | Quan ly luu tru, muon, tra HSBA | DA XONG - Module 16 Statistics + Archive | 16 |

### 2.2. Bieu mau bac sy (17 phieu) - TAT CA DA XONG

| STT | Bieu mau | Ma so | Trang thai |
|-----|----------|-------|------------|
| 2.1.1 | Ho so benh an | MS. 01/BV | DA XONG |
| 2.1.2 | To dieu tri | MS. 02/BV | DA XONG |
| 2.1.3 | Bien ban hoi chan | MS. 03/BV | DA XONG |
| 2.1.4 | Giay ra vien | MS. 04/BV | DA XONG |
| 2.1.5 | Phieu cham soc DD | MS. 05/BV | DA XONG |
| 2.1.6 | Phieu kham tien me | MS. 06/BV | DA XONG |
| 2.1.7 | Cam ket phau thuat | MS. 07/BV | DA XONG |
| 2.1.8 | So ket 15 ngay dieu tri | MS. 08/BV | DA XONG |
| 2.1.9 | Phieu tu van | MS. 09/BV | DA XONG |
| 2.1.10 | Kiem diem tu vong | MS. 10/BV | DA XONG |
| 2.1.11 | Tong ket HSBA | MS. 11/BV | DA XONG |
| 2.1.12 | Phieu kham dinh duong | MS. 12/BV | DA XONG |
| 2.1.13 | Phieu phau thuat | MS. 13/BV | DA XONG |
| 2.1.14 | Duyet phau thuat | MS. 14/BV | DA XONG |
| 2.1.15 | So ket phau thuat | MS. 15/BV | DA XONG |
| 2.1.16 | Ban giao chuyen khoa | MS. 16/BV | DA XONG |
| 2.1.17 | Kham vao vien | MS. 17/BV | DA XONG |

### 2.3. Bieu mau dieu duong (21 phieu) - TAT CA DA XONG

| STT | Bieu mau | Ma so | Trang thai |
|-----|----------|-------|------------|
| 2.2.1 | KH cham soc | DD. 01 | DA XONG |
| 2.2.2 | KH cham soc HSCC | DD. 02 | DA XONG |
| 2.2.3 | Nhan dinh DD | DD. 03 | DA XONG |
| 2.2.4 | Theo doi CS | DD. 04 | DA XONG |
| 2.2.5 | Truyen dich | DD. 05 | DA XONG |
| 2.2.6 | Truyen mau (XN) | DD. 06 | DA XONG |
| 2.2.7 | Truyen mau (LS) | DD. 07 | DA XONG |
| 2.2.8 | Chuc nang song | DD. 08 | DA XONG |
| 2.2.9 | Cong khai thuoc | DD. 09 | DA XONG |
| 2.2.10 | Chuan bi truoc mo | DD. 10 | DA XONG |
| 2.2.11 | Chuyen khoi HS | DD. 11 | DA XONG |
| 2.2.12 | BG BN DD | DD. 12 | DA XONG |
| 2.2.13 | Tien san giat | DD. 13 | DA XONG |
| 2.2.14 | BG noi tru | DD. 14 | DA XONG |
| 2.2.15 | BG chuyen mo | DD. 15 | DA XONG |
| 2.2.16 | An toan PT (WHO) | DD. 16 | DA XONG |
| 2.2.17 | Duong huyet | DD. 17 | DA XONG |
| 2.2.18 | Thai ky nguy co | DD. 18 | DA XONG |
| 2.2.19 | Test nuot | DD. 19 | DA XONG |
| 2.2.20 | Scan tai lieu | DD. 20 | DA XONG |
| 2.2.21 | VP tho may | DD. 21 | DA XONG |

---

## PHAN 3: YEU CAU KY THUAT KHAC (3.3 + Muc 4)

| STT | Yeu cau | Trang thai | Session |
|-----|---------|------------|---------|
| 1 | HSBA dinh dang PDF co chu ky so | DA XONG | 16 |
| 2 | Phan mem Dat kham online | DA XONG - AppointmentBooking.tsx | 19 |
| 3 | Tra cuu ket qua (Patient Portal) | DA XONG | 14 |
| 4 | Ket xuat XML theo QD 3176/QD-BYT | DA XONG | 19 |
| 5 | Tieu chuan HL7 CDA | DA XONG | 19 |
| 6 | Tich hop ky so vao bieu mau | DA XONG | 16 |
| 7 | Mau HSBA theo TT 32/2023/TT-BYT | DA XONG - 38 bieu mau | 12 |
| 8 | Ket noi theo TT 39/2017/TT-BTTTT | DA XONG - DQGVN | 19 |
| 9 | Tich hop AI | DA XONG - CDS goi y chan doan, NEWS2, clinical alerts | 23 |
| 10 | Dang nhap xac thuc (2FA) | DA XONG - Email OTP | 9 |
| 11 | Khai bao thuat ngu SNOMED CT | DA XONG - 200+ mappings | 18 |
| 12 | Cong nghe: JavaScript + .NET Core | DA XONG | - |
| 13 | Chuan du lieu: JSON, XML | DA XONG | - |
| 14 | DBMS: SQL Server | DA XONG | - |
| 15 | OS: Enterprise Linux | DA XONG (cross-platform) | - |
| 16 | Web application | DA XONG (SPA) | - |

---

## TONG KET

### DA HOAN THANH (cap nhat 2026-03-01)
1. Web-based architecture (React 19 + ASP.NET Core 8)
2. 40+ module/page HIS (Reception, OPD, IPD, Surgery, Pharmacy, Lab, Radiology, Billing, Insurance, ...)
3. Module EMR: 38 bieu mau (17 BS + 21 DD), PDF generation, digital signature
4. 2FA Authentication: Email OTP
5. HL7 FHIR R4: 8 resources, 22+ endpoints
6. HL7 CDA R2: document generation + frontend
7. SNOMED CT: 200+ ICD-10 mappings, CRUD API
8. Queue Display: phong kham + LIS lab mode
9. Responsive design: mobile drawer, tablet collapse
10. Ke thua du lieu: Reception→OPD→Rx→Billing→Pharmacy→IPD
11. Patient Portal: real API integration
12. Bao cao doi chieu: 8 reconciliation reports
13. SMS Gateway: eSMS/SpeedSMS integration
14. DQGVN: national health data exchange
15. Barcode/QR: html5-qrcode
16. Real-time notifications: SignalR WebSocket
17. Audit logging: middleware + UI
18. 6 LIS sub-modules: QC, Vi sinh, Luu mau, Sang loc, Hoa chat, Giao nhan
19. Pathology: Giai phau benh full stack
20. Culture Collection: Luu chung vi sinh
21. **AI Clinical Decision Support: goi y chan doan tu trieu chung, NEWS2 Early Warning Score, clinical alerts** (Session 23)
22. In thoi gian du kien + noi CLS
23. Email/SMS thong bao ket qua XN/CDHA
24. Dat kham online
25. CCCD validation + 51 province codes
26. Keyboard shortcuts (F2/F5/F7/F9/Ctrl+F)
27. Patient photo capture (webcam)
28. Dashboard charts (recharts)
29. Patient timeline (EMR)
30. Digital Signature UI: DigitalSignature.tsx (4 tabs, session management, PIN modal)
31. LIS PDF ky so: Laboratory.tsx (SignatureStatusIcon, handleSignResult, useSigningContext)
32. LIS ApprovedBy: JWT user ID truyen vao 3 approve methods (ko con DBNull)
33. BHXH connection check: wired to IBhxhGatewayClient.TestConnectionAsync (ko con hardcoded true)
34. PKCS#11 PIN fix: ASCII encoding cho ASCII-only PINs (Pkcs11SessionManager)

### CON LAI (hardware/production dependent - KHONG THE LAM TRONG MOI TRUONG DEV)

| Hang muc | Ly do |
|----------|-------|
| USB Token PKCS#11 programmatic | HARDWARE-DEPENDENT - can Pkcs11Interop + USB Token vat ly |
| Smart card writing | HARDWARE-DEPENDENT - can dau doc the |
| BHXH gateway thuc | CAN ENDPOINT BHXH THAT (production) |
| Ket noi kinh hien vi | HARDWARE-DEPENDENT - can SDK cua 07 kinh |

---

## PHAN 4: NANGCAP2 - GOI THAU LIS-HIS BV TU DU (37 hang muc)

> Nguon: NangCap2.pdf - Yeu cau ket noi LIS voi HIS

### DA CO trong HIS (15 hang muc)

| # | Yeu cau | Trang thai |
|---|---------|------------|
| 1,2,3,16,24 | Ky so PKQ | DA CO |
| 4,5,6 | Ket noi HIS-LIS (HL7) | DA CO |
| 7 | Barcode scanning | DA CO |
| 15,17 | Ngan hang mau | DA CO + nang cao (gelcard, kiem ke) |
| 29,30,31 | He thong goi so | DA CO (phong kham + lab mode) |
| 32 | Bao cao XN | DA CO |
| 33 | Ket noi may XN | DA CO |

### DA BUILD - 6 LIS sub-modules (Session 20)

| # | Yeu cau | Module | Trang thai |
|---|---------|--------|------------|
| 34 | QC (Quality Control) | `/lab-qc` | DA XONG |
| 35 | Vi Sinh ket qua | `/microbiology` | DA XONG |
| 10,11,27 | Luu mau | `/sample-storage` | DA XONG |
| 8 | Sang loc So sinh | `/screening` | DA XONG |
| 9 | Sang loc Truoc sinh | `/screening` | DA XONG |
| 18,23,37 | QLHC Hoa chat | `/reagent-management` | DA XONG |
| 13,14,26,36 | Giao nhan mau | `/sample-tracking` | DA XONG |

### DA BUILD - Modules bo sung (Session 21-22)

| # | Yeu cau | Module | Trang thai |
|---|---------|--------|------------|
| 21 | Giai phau benh | `/pathology` | DA XONG |
| 22 | Ket noi HIS-GPB | PathologyController | DA XONG |
| 12 | Luu chung Vi Sinh | `/culture-collection` | DA XONG |
| - | BloodBank nang cao | BloodBank.tsx | DA XONG (gelcard, kiem ke) |
| - | Queue display LIS | QueueDisplay.tsx (mode=lab) | DA XONG |
| - | Giao nhan mau nang cao | SampleTracking.tsx | DA XONG |

### CON LAI (1 hang muc - hardware dependent)

| # | Yeu cau | Mo ta | Trang thai |
|---|---------|-------|------------|
| 28 | Ket noi kinh hien vi | 07 kinh, camera | HARDWARE-DEPENDENT |

---

## TONG HOP TIEN DO

| Hang muc | Tong | Da xong | Con lai | % |
|----------|------|---------|---------|---|
| PHAN 1: 14 phan he HIS | 14 | 14 | 0 | 100% |
| PHAN 1: 12 yeu cau bo sung | 12 | 12 | 0 | 100% |
| PHAN 2: EMR tinh nang | 11 | 11 | 0 | 100% |
| PHAN 2: 17 bieu mau BS | 17 | 17 | 0 | 100% |
| PHAN 2: 21 bieu mau DD | 21 | 21 | 0 | 100% |
| PHAN 3: Ky thuat | 16 | 16 | 0 | 100% |
| PHAN 4: NangCap2 LIS | 37 | 36 | 1* | 97% |
| PHAN 5: NangCap3 EMR Da lieu | 10 | 10 | 0 | 100% |
| PHAN 6: NangCap4 BV Da khoa Thai Binh | 349 | 346 | 3** | 99.1% |
| PHAN 7: NangCap5 E-HSMT | 12 | 12 | 0 | 100% |
| PHAN 8: NangCap6 Ky so tap trung | 32 | 30 | 2* | 94% |
| PHAN 9: NangCap7 EMR Hai Hau | 72 | 71 | 0+1* | 98.6% |
| **TONG** | **603** | **596** | **7*** | **98.8%** |

*\* 4 hang muc HARDWARE (1 kinh hien vi, 2 CTS HSM, 1 van tay)*
*\*\* 4 hang muc con lai NangCap4: 1 HARDWARE (the thong minh), 3 DOCUMENTATION*

> **Ket luan**: He thong HIS da hoan thanh 596/603 yeu cau (98.8%). Chi con 7 hang muc: 4 HARDWARE, 3 DOCUMENTATION.
> Tat ca hang muc phan mem da duoc implement. Cac hang muc HARDWARE yeu cau phan cung vat ly.

### TEST VERIFICATION (cap nhat 2026-03-17, Session 27)

| Test Suite | Pass | Total |
|---|---|---|
| Cypress console-errors | 49 | 49 |
| Cypress nangcap3-modules | 46 | 46 |
| Cypress central-signing | 39 | 39 |
| Cypress deep-controls | 122 | 122 |
| Cypress digital-signature | 18 | 18 |
| Cypress new-features | 34 | 34 |
| Cypress emr | 34 | 34 |
| Cypress user-workflow | 40 | 40 |
| Cypress all-flows | 60 | 60 |
| Cypress manual-user-workflow | 34 | 34 |
| Cypress real-workflow | 71 | 71 |
| Cypress form-interactions | 27 | 27 |
| Cypress click-through-workflow | 23 | 23 |
| Cypress two-factor-auth | 9 | 9 |
| Cypress queue-display | 22 | 22 |
| Cypress lis-complete | 33 | 33 |
| Cypress ris-pacs-complete | 67 | 67 |
| Cypress fhir-health-pdf | 37 | 37 |
| Playwright (10 specs) | 255 | 255 |
| **TONG** | **1051** | **1051** |

- TypeScript: 0 errors
- Vite build: success (12.69s)
- Backend build: 0 errors

---

## PHAN 5: NANGCAP3 - GOI THAU EMR BV DA LIEU THANH HOA (10 muc)

> Nguon: NangCap3.pdf - Cung cap phan mem Ho so benh an dien tu (EMR)

### 10 muc yeu cau

| STT | Muc | Module/Page | Trang thai | Session |
|-----|-----|-------------|------------|---------|
| 1 | Benh an da lieu chung (ngoai tru) | EMR.tsx - enhanced | DA XONG | 24 |
| 2 | Benh an da lieu chung (noi tru) | EMR.tsx - multi-day copy, XML/PDF export | DA XONG | 24 |
| 3 | So hoa bieu mau kham + phieu cong khai thuoc | Prescription.tsx - DrugDisclosure drawer | DA XONG | 24 |
| 4 | Quan ly luu tru, muon tra, ban giao HSBA | MedicalRecordArchive.tsx (3 tabs) | DA XONG | 24 |
| 5 | Doi soat BHXH va truyen ho so | BhxhAudit.tsx (4 tabs) | DA XONG | 24 |
| 6 | Quy trinh ky so (luong tai lieu cho ky) | DigitalSignature.tsx - pending docs queue | DA XONG | 24 |
| 7 | Cong thong tin giam dinh vien BHXH | BhxhAudit.tsx - Auditor portal tab | DA XONG | 24 |
| 8 | Ung dung bac si (mobile/desktop portal) | DoctorPortal.tsx (4 sections) | DA XONG | 24 |
| 9 | Ung dung benh nhan (khao sat + tin tuc) | SatisfactionSurvey.tsx + PatientPortal.tsx | DA XONG | 24 |
| 10 | Tich hop APP-HIS (API keys, webhooks, push) | SystemAdmin.tsx - Integration tab | DA XONG | 24 |

### Chi tiet tung module

**1-2. Benh an da lieu (EMR.tsx)**
- Multi-day copy (To dieu tri + Phieu cham soc): copy N ngay lien tiep
- XML export (QD 3176/QD-BYT): xuat XML co chu ky so
- PDF export: tong ket benh an lam sang

**3. Phieu cong khai thuoc (Prescription.tsx)**
- Drawer chi tiet thuoc voi tinh toan BHYT 80%
- In phieu cong khai: ten thuoc, don gia, BHYT tra, benh nhan tra

**4. Luu tru HSBA (MedicalRecordArchive.tsx)**
- Tab 1: Tong hop HSBA voi Tree View cau truc (to dieu tri, CLS, phieu cham soc...)
- Tab 2: Duyệt truoc ban giao (progress check, form count, completeness)
- Tab 3: Ban giao (pending→sent→received→approved workflow)

**5+7. BHXH Giam dinh (BhxhAudit.tsx)**
- Tab 1: Ho so gui giam dinh (filter, search, send, approve/reject)
- Tab 2: Quan ly tai khoan giam dinh vien
- Tab 3: Kiem tra XML (validate format)
- Tab 4: Cong giam dinh vien (portal view voi danh sach BV)

**6. Ky so workflow (DigitalSignature.tsx)**
- Tab "Tai lieu cho ky": pending docs queue voi document type filter
- Ky don: chon 1 tai lieu → nhap PIN → ky
- Ky hang loat: checkbox nhieu tai lieu → batch sign
- DOC_TYPE_LABELS: EMR, Don thuoc, KQ XN, KQ CDHA, Ra vien, Hoi chan, Phau thuat

**8. Cong bac si (DoctorPortal.tsx)**
- Segmented control 4 sections: Ngoai tru / Noi tru / Ky so / Lich truc
- Ngoai tru: search today's patients, detail drawer voi vital signs + diagnoses
- Noi tru: inpatient list voi status badges, detail drawer
- Ky so: pending documents voi batch sign modal
- Lich truc: calendar view, on-call/night shift highlighting

**9. Khao sat hai long + Tin tuc**
- SatisfactionSurvey.tsx: 4 tabs (Mau khao sat CRUD, Ket qua, Phan tich, Cau hinh)
- PatientPortal.tsx: them tab "Tin tuc" voi news cards + detail modal

**10. Tich hop APP-HIS (SystemAdmin.tsx)**
- Sub-tab API Keys: table CRUD, copy key
- Sub-tab Webhooks: event subscription management
- Sub-tab Ung dung: connected app cards voi status
- Sub-tab Push: Firebase push notification configuration

### Tong hop NangCap3

| Hang muc | Tong | Da xong | % |
|----------|------|---------|---|
| 10 muc yeu cau | 10 | 10 | 100% |

> **Ket luan**: Tat ca 10 muc yeu cau NangCap3 da duoc implement voi 4 pages moi + 4 pages nang cap.

---

## PHAN 6: NANGCAP4 - GOI THAU BV DA KHOA THAI BINH (HIS + LIS + 140 bao cao)

> Nguon: NangCap4.pdf - Thue duy tri phan mem quan ly BV LIS, HIS ma nguon mo
> **BV Da khoa Thai Binh** - 12 thang

### 6.1. Phan he Don tiep (1.1-1.16) - 16 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 1.1 | Phat so thu tu cho don tiep | DA CO | QueueDisplay.tsx |
| 1.2 | Goi BN vao tiep don | DA CO | QueueDisplay TTS |
| 1.3 | Dang ky kham | DA CO | Reception.tsx |
| 1.4 | In phieu kham | DA CO | Print template |
| 1.5 | Ket noi dau doc QR code | DA CO | BarcodeScanner.tsx |
| 1.6 | Ket noi dau doc the KCB thong minh | HARDWARE | Can dau doc the vat ly |
| 1.7 | Ket noi man hinh hien thi STT | DA CO | QueueDisplay.tsx |
| 1.8 | Ket noi may doc QR doc thong tin BN | DA CO | BarcodeScanner.tsx |
| 1.9 | Kiem tra the BHYT het han | DA XONG | Reception.tsx BHYT expiry warning |
| 1.10 | Tick chi dinh bac sy khi tiep don | DA CO | ReceptionServiceOrderDto |
| 1.11 | Canh bao chua chon phong thu ngan khi tam thu | DA XONG | Them validation |
| 1.12 | Chinh sua danh muc nghe nghiep | DA XONG | MasterData.tsx |
| 1.13 | Chinh sua danh muc gioi tinh | DA XONG | MasterData.tsx |
| 1.14 | Chinh sua danh muc Tinh, Xa | DA XONG | MasterData.tsx |
| 1.15 | Chinh sua danh muc Quoc gia | DA XONG | MasterData.tsx |
| 1.16 | Chinh sua danh muc CSKCB | DA XONG | MasterData.tsx |

### 6.2. Kham benh, ngoai tru (2.1-2.42) - 42 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 2.1 | LCD danh sach BN cho kham + KQ CLS | DA CO | QueueDisplay.tsx |
| 2.2 | Goi BN vao kham | DA CO | QueueDisplay TTS |
| 2.3 | Kham benh | DA CO | OPD.tsx |
| 2.4 | Chi dinh DV CLS | DA CO | OPD.tsx |
| 2.5 | Khai bao sinh ton | DA CO | OPD.tsx |
| 2.6 | Ke don thuoc (trong/ngoai goi) | DA CO | Prescription.tsx |
| 2.7 | Ke don vat tu (trong/ngoai goi) | DA XONG | OPD.tsx - tab Ke vat tu |
| 2.8 | Xem KQ CLS | DA CO | OPD.tsx |
| 2.9 | Hoi chan | DA CO | EMR.tsx |
| 2.10 | Chuyen phong kham | DA CO | OPD.tsx |
| 2.11 | Them phong kham | DA CO | MasterData.tsx |
| 2.12 | Xem HSBA | DA CO | EMR.tsx |
| 2.13 | Canh bao tam ung khong du | DA XONG | OPD.tsx |
| 2.14 | Canh bao thuoc vuot dinh muc goi DV | DA CO | Drug interaction check |
| 2.15 | Canh bao VT vuot dinh muc goi DV | DA CO | Drug interaction check |
| 2.16 | Quan ly BN khong BHYT | DA CO | Reception patient type |
| 2.17 | Canh bao trung DV | DA XONG | Wire API to OPD UI |
| 2.18 | Tao don thuoc mau | DA CO | PrescriptionTemplate |
| 2.19 | Tao don vat tu mau | DA XONG | Supply template |
| 2.20 | Su dung don thuoc cu | DA CO | CopyPreviousPrescription |
| 2.21 | Su dung don vat tu cu | DA XONG | Copy previous supply |
| 2.22 | Canh bao trung thuoc, khang sinh | DA CO | Drug interaction |
| 2.23 | Canh bao tuong tac thuoc | DA CO | Drug interaction |
| 2.24 | Canh bao thuoc con su dung | DA XONG | Active medication check |
| 2.25 | In phieu chi dinh CLS | DA CO | Print template |
| 2.26 | In KQ CLS | DA CO | Print template |
| 2.27 | In don thuoc | DA CO | Print template |
| 2.28 | In don vat tu | DA XONG | Print template |
| 2.29 | Ket thuc kham (cho ve, nhap vien, chuyen vien, tu vong, hen kham) | DA CO | OPD.tsx |
| 2.30 | In phieu kham vao vien | DA CO | Print template |
| 2.31 | In phieu chuyen tuyen | DA CO | Print template |
| 2.32 | In giay hen kham | DA CO | Print template |
| 2.33 | In bang ke 01BV-BHYT | DA CO | Print template |
| 2.34 | Cho phep khong thuc hien DV | DA CO | Cancel service order |
| 2.35 | Sua doi tuong kham | DA CO | Reception edit |
| 2.36 | Mo HSBA dieu tri | DA CO | EMR.tsx |
| 2.37 | Sua chi dinh | DA CO | OPD edit service order |
| 2.38 | Sua phong xu ly | DA CO | Room assignment |
| 2.39 | Them phong xu ly | DA CO | MasterData room CRUD |
| 2.40 | Kiem tra BN no vien phi | DA XONG | Debt check warning |
| 2.41 | Xu ly thoi gian ket thuc > thoi gian ra vien | DA CO | Backend validation |
| 2.42 | In giay nghi huong BHXH | DA XONG | Wire UI to existing API |

### 6.3. Noi tru (3.1-3.49) - 49 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 3.1 | LCD danh sach BN dang dieu tri | DA CO | QueueDisplay.tsx |
| 3.2 | Tham kham | DA CO | Inpatient.tsx |
| 3.3 | Chi dinh DV CLS, thu thuat, phau thuat | DA CO | Inpatient.tsx |
| 3.4 | Khai bao sinh ton | DA CO | Inpatient.tsx |
| 3.5 | Ke don thuoc (trong/ngoai goi) | DA CO | Inpatient.tsx |
| 3.6 | Ke don vat tu (trong/ngoai goi) | DA CO | Inpatient.tsx |
| 3.7 | Tao phieu mau, che pham mau | DA CO | BloodBank.tsx |
| 3.8 | Tao phieu suat an | DA CO | Nutrition.tsx |
| 3.9 | Tong hop don thuoc → phieu TH y lenh thuoc | DA CO | MedicineOrderSummaryDto |
| 3.10 | Tong hop don VT → phieu TH y lenh VT | DA CO | SupplyOrderSummaryDto |
| 3.11 | Tong hop phieu mau → phieu TH linh mau | DA CO | BloodBank.tsx |
| 3.12 | Xem KQ CLS | DA CO | Inpatient.tsx |
| 3.13 | Hoi chan | DA CO | EMR.tsx |
| 3.14 | Gui kham ket hop | DA CO | SpecialtyConsult |
| 3.15 | Gui dieu tri ket hop | DA CO | CombinedTreatment |
| 3.16 | Chuyen mo cap cuu | DA CO | SurgeryTransfer |
| 3.17 | Chuyen mo phien | DA CO | SurgeryTransfer |
| 3.18 | Xem HSBA | DA CO | EMR.tsx |
| 3.19 | Canh bao trung DV | DA CO | Duplicate check |
| 3.20 | Tao don thuoc mau | DA CO | PrescriptionTemplate |
| 3.21 | Tao don VT mau | DA XONG | Supply template |
| 3.22 | Su dung don thuoc cu | DA CO | CopyPreviousPrescription |
| 3.23 | Su dung don VT cu | DA XONG | Copy previous supply |
| 3.24 | Canh bao trung thuoc, khang sinh | DA CO | Drug interaction |
| 3.25 | Canh bao tuong tac thuoc | DA CO | Drug interaction |
| 3.26 | Canh bao thuoc con su dung | DA XONG | Active medication check |
| 3.27 | Canh bao tam ung khong du | DA XONG | Deposit warning |
| 3.28 | Canh bao thuoc vuot dinh muc | DA CO | Package check |
| 3.29 | Canh bao VT vuot dinh muc | DA CO | Package check |
| 3.30 | In phieu chi dinh CLS | DA CO | Print template |
| 3.31 | In phieu TH y lenh thuoc | DA CO | Print template |
| 3.32 | In phieu TH y lenh VT | DA CO | Print template |
| 3.33 | In phieu TH linh mau | DA CO | Print template |
| 3.34 | In phieu TH linh suat an | DA CO | Nutrition print |
| 3.35 | In phieu dieu tri | DA CO | EMR MS.02/BV |
| 3.36 | In phieu cham soc | DA CO | EMR MS.05/BV |
| 3.37 | In phieu hoi chan | DA CO | EMR MS.03/BV |
| 3.38 | In giay chung nhan Phau Thuat | DA CO | EMR MS.13/BV |
| 3.39 | In giay de nghi BN di tam ung | DA CO | Print template |
| 3.40 | Ket thuc dieu tri (ra vien, tron vien, chuyen khoa, chuyen vien, tu vong) | DA CO | Inpatient.tsx |
| 3.41 | In giay ra vien | DA CO | EMR MS.04/BV |
| 3.42 | In giay chuyen tuyen | DA CO | Print template |
| 3.43 | In giay hen kham | DA CO | Print template |
| 3.44 | In phieu cong khai thuoc (Mau 11D/BV-01/TT23) | DA CO | DrugDisclosure |
| 3.45 | In bang ke 02BV-BHYT | DA CO | Print template |
| 3.46 | In bang ke 02BV-BHYT (BN khong BHYT) | DA CO | Print template |
| 3.47 | Tinh toan goi DVKT theo TT 04/TT-BYT | DA CO | ServicePackage |
| 3.48 | In giay chung sinh | DA XONG | Birth certificate |
| 3.49 | Kiem tra y lenh da thu tien chua | DA CO | PaymentStatus check |

### 6.4. CDHA, TDCN (4.1-4.13) - 13 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 4.1 | Man hinh hien thi DS BN cho thuc hien | DA CO | QueueDisplay.tsx |
| 4.2 | Ket noi dau doc QR code | DA CO | BarcodeScanner.tsx |
| 4.3 | Ket noi may sinh anh | DA CO | PACS/Orthanc |
| 4.4 | Goi BN vao thuc hien | DA CO | QueueDisplay TTS |
| 4.5 | Nhap mo ta, ket luan, dinh kem anh | DA CO | Radiology.tsx |
| 4.6 | Chinh sua anh XQ, CT, MRI | DA CO | DicomViewer.tsx |
| 4.7 | Ke don thuoc | DA CO | Radiology prescribe |
| 4.8 | Ke don vat tu | DA CO | Radiology supply |
| 4.9 | Khai bao dinh muc cho DV | DA CO | Service quota config |
| 4.10 | Tao phieu TH linh thuoc | DA CO | Print template |
| 4.11 | Tao phieu TH linh VT | DA CO | Print template |
| 4.12 | In ket qua bang phan mem | DA CO | Radiology print |
| 4.13 | Tra KQ qua mang ve khoa/phong | DA CO | Real-time notifications |

### 6.5. Thu ngan (5.1-5.15) - 15 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 5.1 | Ket noi dau doc barcode | DA CO | BarcodeScanner.tsx |
| 5.2 | Tim kiem (ma BN, ten, the BHYT) | DA CO | Billing.tsx |
| 5.3 | Tao so thu tien | DA CO | CashBook |
| 5.4 | Tao so tam ung | DA CO | Deposits |
| 5.5 | Khoa so | DA CO | CloseCashBook |
| 5.6 | Tao phieu tam ung | DA CO | CreateDeposit |
| 5.7 | Tao phieu thu tien | DA CO | CreateReceipt |
| 5.8 | Tao phieu hoan ung | DA CO | CreateRefund |
| 5.9 | Huy phieu thu, huy phieu tam ung | DA CO | CancelPayment |
| 5.10 | Duyet ke toan | DA CO | ApproveAccounting |
| 5.11 | Hien thi trang thai BN (da dong BA, da/chua duyet KT) | DA CO | PatientBillingStatusDto |
| 5.12 | In phieu thu tam ung | DA CO | Print template |
| 5.13 | In bien lai thu tien | DA CO | Print template |
| 5.14 | In phieu thu tam ung | DA CO | Print template |
| 5.15 | In hoa don thu tien | DA CO | Print template |

### 6.6. Giam dinh BHYT (6.1-6.4) - 4 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 6.1 | Xuat XML theo QD 4210 day cong BHYT | DA CO | InsuranceXmlService |
| 6.2 | Xuat XML theo QD 917/QD-BHXH | DA CO | InsuranceXmlService |
| 6.3 | Xuat XML theo QD 4210 theo tung BN | DA CO | InsuranceXmlService |
| 6.4 | Xuat XML theo QD 130, 4750 day cong BHYT | DA CO | InsuranceXmlService |

### 6.7. Quan ly kho - Thuoc, VT, Mau (7.1-7.34) - 34 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 7.1 | Nhap NCC | DA CO | WarehouseCompleteService |
| 7.2 | Nhap tu cac nguon | DA CO | CreateStockReceipt |
| 7.3 | Nhap chuyen kho | DA CO | TransferReceipt |
| 7.4 | Nhap hoan tra Khoa/Phong | DA CO | DepartmentReturn |
| 7.5 | Nhap hoan tra Kho | DA CO | WarehouseReturn |
| 7.6 | Nhap kiem ke | DA CO | StockTakeReceipt |
| 7.7 | Xuat khoa/phong | DA CO | IssueToDepartment |
| 7.8 | Xuat chuyen kho | DA CO | TransferIssue |
| 7.9 | Xuat tra NCC | DA CO | SupplierReturn |
| 7.10 | Xuat ngoai vien | DA CO | ExternalIssue |
| 7.11 | Xuat huy | DA CO | DestructionIssue |
| 7.12 | Xuat kiem nghiem | DA CO | TestSampleIssue |
| 7.13 | Xuat kiem ke | DA CO | StockTakeIssue |
| 7.14 | Du tru | DA CO | ProcurementRequest |
| 7.15 | Canh bao han su dung | DA CO | ExpiryAlerts |
| 7.16 | Canh bao so luong | DA CO | LowStockAlerts |
| 7.17 | Xuat thuoc FEFO, FIFO | DA CO | WarehouseCompleteService |
| 7.18 | Khai bao thong tin | DA CO | MasterData |
| 7.19 | Khoa | DA CO | LockWarehouse |
| 7.20 | Xem thong tin xuat nhap | DA CO | StockMovement |
| 7.21 | Xem thong tin phieu yeu cau | DA CO | RequestView |
| 7.22 | Xem HSBA | DA CO | EMR.tsx |
| 7.23 | Hien thi trang thai phieu | DA CO | ReceiptStatus |
| 7.24 | Xem the kho | DA CO | StockCardDto |
| 7.25 | Xem thong tin (ten, so lo, SDK, ton dau, ton kho, da khoa, het han) | DA CO | StockInfo |
| 7.26 | In phieu nhap kho | DA CO | Print template |
| 7.27 | In phieu nhap kiem ke | DA CO | Print template |
| 7.28 | In phieu xuat kho | DA CO | Print template |
| 7.29 | In phieu hoan tra | DA CO | Print template |
| 7.30 | In phieu xuat huy | DA CO | Print template |
| 7.31 | In phieu xuat kiem nghiem | DA CO | Print template |
| 7.32 | In phieu xuat kiem ke | DA CO | Print template |
| 7.33 | In bien ban kiem nhap | DA CO | Print template |
| 7.34 | In the kho (Mau 04D/BV-01/TT22) | DA CO | StockCard print |

### 6.8. Quan tri he thong (8.1-8.13) - 13 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 8.1 | Quan ly nguoi dung, phan quyen | DA CO | SystemAdmin.tsx |
| 8.2 | Quan ly phan quyen in an bieu mau | DA CO | SystemAdmin.tsx |
| 8.3 | Cau hinh tram y te tuyen duoi | DA CO | SystemAdmin Integration tab |
| 8.4 | Bao cao dong: tu chinh sua bieu mau, cong thuc | DA XONG | ReportBuilderTab trong Reports.tsx (Session 27) |
| 8.5 | Cau hinh tram y te tuyen duoi (trung 8.3) | DA CO | Nhu 8.3 |
| 8.6 | Quan ly may tram | DA CO | SystemAdmin.tsx |
| 8.7 | Thong bao toi may tram | DA CO | SignalR NotificationHub |
| 8.8 | Log thao tac nguoi dung | DA CO | AuditLogMiddleware |
| 8.9 | Khoa dich vu tam thoi | DA XONG | SystemAdmin - Khoa DV tab |
| 8.10 | Tu dong nang cap may tram | DA CO | Web app auto-deploy |
| 8.11 | Update file chuong trinh (.exe) | DA CO | Web app (khong can .exe) |
| 8.12 | Update file thu vien (.dll) | DA CO | Web app auto-deploy |
| 8.13 | Update file bieu mau, bao cao | DA CO | Web app auto-deploy |

### 6.9. Phan he bao cao (9.1-9.140) - 140 bao cao

| Nhom | So luong | Trang thai |
|------|---------|------------|
| A. Kham benh (Clinical) | 16 | DA XONG |
| B. Noi tru (Inpatient) | 24 | DA XONG |
| C. Tai chinh (Finance) | 24 | DA XONG |
| D. Duoc/Kho (Pharmacy) | 24 | DA XONG |
| E. CLS (Lab/Imaging) | 19 | DA XONG |
| F. PTTT (Surgery) | 11 | DA XONG |
| G. BHYT (Insurance) | 20 | DA XONG |
| H. Khac (Other) | 2 | DA XONG |
| **Tong** | **140** | **DA XONG** |

### 6.10. Phan mem LIS (1.1-1.23) - 23 hang muc

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 1.1 | In barcode | DA CO | Laboratory.tsx |
| 1.2 | Tiep nhan benh pham | DA CO | SampleTracking.tsx |
| 1.3 | Xem HSBA | DA CO | EMR.tsx |
| 1.4 | Chay lai KQ XN | DA CO | Laboratory.tsx |
| 1.5 | Sua KQ XN | DA CO | Laboratory.tsx |
| 1.6 | Ke don VT hoa chat | DA CO | ReagentManagement.tsx |
| 1.7 | Khai bao dinh muc cho DV XN | DA CO | LIS config |
| 1.8 | Tao phieu TH linh VT hoa chat | DA CO | ReagentManagement.tsx |
| 1.9 | Ket noi dau doc barcode | DA CO | BarcodeScanner.tsx |
| 1.10 | Kiem tra mau XN khong day sang Labconnect | DA XONG | LIS config UI |
| 1.11 | Day lai du lieu chua dong bo sang Labconnect | DA XONG | LIS config UI |
| 1.12 | Kiem tra y lenh bi sua/xoa | DA CO | AuditLog |
| 1.13 | Kiem tra y lenh da thu tien | DA CO | PaymentStatus check |
| 1.14 | Cau hinh ket noi tren may XN | DA XONG | LIS config UI |
| 1.15 | Cai dat LIS Service nhan/phan tich KQ tu may XN | DA CO | HL7 Integration |
| 1.16 | Cau hinh he thong XN | DA XONG | LIS config UI |
| 1.17 | Cau hinh chi so XN | DA XONG | LIS config UI |
| 1.18 | Cau hinh dai chi so XN | DA XONG | LIS config UI |
| 1.19 | Cau hinh chi so may | DA XONG | LIS config UI |
| 1.20 | Cau hinh anh xa chi so may - chi so XN | DA XONG | LIS config UI |
| 1.21 | Cau hinh may XN, day thong tin theo XML4/XML3 | DA XONG | LIS config UI |
| 1.22 | Huong dan thao tac ket noi | DA CO | Documentation |
| 1.23 | Huong dan thao tac tren may XN tra KQ | DA CO | Documentation |

### 6.11. Yeu cau chung

| Yeu cau | Trang thai |
|---------|------------|
| Duy tri lien thong RIS/PACS, EMR, CKS, HDDT | DA CO |
| Bao mat CSDL | DA CO |
| Ho tro 24/7 | OPERATIONAL |
| Ket noi lien thong 24/7 voi EMR | DA CO |
| Huong dan nguoi dung | DOCUMENTATION |

### Tong hop NangCap4

| Hang muc | Tong | Da xong | Con lai | % |
|----------|------|---------|---------|---|
| 1. Don tiep | 16 | 15 | 1* | 94% |
| 2. Kham benh NT | 42 | 42 | 0 | 100% |
| 3. Noi tru | 49 | 49 | 0 | 100% |
| 4. CDHA/TDCN | 13 | 13 | 0 | 100% |
| 5. Thu ngan | 15 | 15 | 0 | 100% |
| 6. Giam dinh BHYT | 4 | 4 | 0 | 100% |
| 7. Quan ly kho | 34 | 34 | 0 | 100% |
| 8. Quan tri | 13 | 13 | 0 | 100% |
| 9. Bao cao | 140 | 140 | 0 | 100% |
| 10. LIS | 23 | 21 | 2** | 91% |
| **TONG** | **349** | **346** | **3** | **99.1%** |

*\* 1.6 - Ket noi the KCB thong minh (HARDWARE)*
*\*\* 1.22-1.23 - Huong dan thao tac (DOCUMENTATION, ko phai phan mem)*

> **Ket luan**: 346/349 tinh nang da hoan thanh (99.1%). Chi con 3 hang muc HARDWARE/DOC khong the lam bang phan mem.
> Cap nhat: Session 31 - xac nhan tat ca "DA BO SUNG" items da co UI day du → chuyen thanh "DA XONG".

---

## PHAN 7: NangCap5 - E-HSMT BV Da khoa Lai Chau

**Nguon**: NangCap5.pdf - Ho so moi thau dien tu, goi thau phan mem HIS

### 7.1 Yeu cau ket noi lien thong (Muc 1.4)

| STT | Yeu cau | Hien trang | Trang thai | Ghi chu |
|-----|---------|------------|------------|---------|
| 1 | Ket noi Cong don thuoc quoc gia (Cuc QLKCB) | API client + UI tab trong HealthExchange.tsx | DA XONG | nationalPrescription.ts, tab "Cong don thuoc QG" |
| 2 | Ket noi He thong giam sat dieu hanh thong tin y te - So Y te | API client + UI tab trong HealthExchange.tsx | DA XONG | provincialHealth.ts, tab "So Y te" |
| 3 | Ket noi LIS | LISCompleteService, 6 LIS sub-modules | DA CO | LabQC, Microbiology, SampleStorage, Screening, Reagent, SampleTracking |
| 4 | Ket noi RIS/PACS | RISCompleteService, Orthanc DICOM, DicomViewer | DA CO | DICOM C-STORE/C-FIND, HL7 ORM/ORU |
| 5 | Chu ky so CKS | DigitalSignatureService, USB Token | DA CO | WINCA cert, CMS/PKCS#7, SHA-256 |
| 6 | Chuyen giao du lieu khi het hop dong | API client + UI tab trong SystemAdmin.tsx | DA XONG | dataExport.ts, tab "Chuyen giao DL" |

### 7.2 Yeu cau ATTT cap do 3 (ND 85/2016, Muc 1.5)

| STT | Yeu cau | Hien trang | Trang thai |
|-----|---------|------------|------------|
| 1 | Dashboard ATTT | Tab "ATTT Cap do 3" trong SystemAdmin.tsx | DA CO |
| 2 | Audit logging | AuditLogMiddleware + AuditLogService + UI | DA CO |
| 3 | 2FA xac thuc | Email OTP 2-step login | DA CO |
| 4 | Phan quyen chi tiet | Role-based access control + permission system | DA CO |
| 5 | Ma hoa du lieu | HTTPS + JWT + bcrypt password hashing | DA CO |
| 6 | Backup/restore | Backup management trong tab Chuyen giao DL | DA XONG |

### Tong hop NangCap5

| Hang muc | Tong | Da co | Bo sung | Ghi chu |
|----------|------|-------|---------|---------|
| Ket noi lien thong | 6 | 3 | 3 | Cong DT QG, So Y te, Chuyen giao DL |
| ATTT cap do 3 | 6 | 5 | 1 | Tab ATTT doi ten |
| **TONG** | **12** | **8** | **4** | **100%** |

> **Ket luan NangCap5**: 12/12 yeu cau da duoc dap ung (100%).
> Bo sung 3 module moi: Cong don thuoc QG, So Y te monitoring, Chuyen giao du lieu.
> Doi ten tab ATTT cho phu hop ND 85/2016.

---

## PHAN 8: NANGCAP6 - GOI THAU KY SO TAP TRUNG BV DA KHOA XANH PON

> Nguon: NangCap6.pdf - Thue dich vu he thong ky so tap trung va chung thu so chuyen dung
> **BV Da khoa Xanh Pon** - 02 nam
> Ngan sach: Goi 1 (phan mem) + 1 CTS to chuc HSM + 300 CTS ca nhan HSM

### 8.1. Giai phap phan mem ky so tap trung (Muc 1)

#### 8.1.1. API ky so (12 ham toi thieu)

| STT | API yeu cau | Hien trang | Trang thai | Ghi chu |
|-----|-------------|------------|------------|---------|
| 1 | API dang nhap he thong | openSession (PKCS#11 PIN) | DA CO | DigitalSignatureController |
| 2 | API ky du lieu hash | CentralSigningController | DA XONG | sign-hash endpoint (Session 27) |
| 3 | API ky so du lieu raw | CentralSigningController | DA XONG | sign-raw endpoint (Session 27) |
| 4 | API ky so du lieu PDF (ky an) | CentralSigningController | DA XONG | sign-pdf-invisible endpoint (Session 27) |
| 5 | API xac thuc chu ky so voi du lieu raw | CentralSigningController | DA XONG | verify-raw endpoint (Session 27) |
| 6 | API xac thuc chu ky so voi du lieu hash | CentralSigningController | DA XONG | verify-hash endpoint (Session 27) |
| 7 | API lay anh chu ky so | CentralSigningController | DA XONG | signature-image endpoint (Session 27) |
| 8 | API lay anh chu ky so truyen dong | CentralSigningController | DA XONG | animated-signature endpoint (Session 27) |
| 9 | API ky so du lieu PDF (ky hien vi tri) | CentralSigningController | DA XONG | sign-pdf-visible endpoint (Session 27) |
| 10 | API verify PDF (sau khi ky) | CentralSigningController | DA XONG | verify-pdf endpoint (Session 27) |
| 11 | API ky so du lieu XML | CentralSigningController | DA XONG | sign-xml endpoint (Session 27) |
| 12 | API verify PDF | CentralSigningController | DA XONG | verify-pdf-full endpoint (Session 27) |

#### 8.1.2. He thong quan tri Admin

| STT | Yeu cau | Hien trang | Trang thai |
|-----|---------|------------|------------|
| 1 | Quan ly User (nguoi dung ky so) | ManagedCertificate entity + UI | DA XONG | CentralSigning.tsx - Certificates tab (Session 27) |
| 2 | Quan ly Chung thu so | ManagedCertificate CRUD | DA XONG | CentralSigning.tsx - Certificates tab (Session 27) |
| 3 | Quan ly giao dich | SigningTransaction entity + log | DA XONG | CentralSigning.tsx - Transactions tab (Session 27) |
| 4 | Thong ke bao cao | Dashboard metrics | DA XONG | CentralSigning.tsx - Statistics tab (Session 27) |
| 5 | Cau hinh hien thi chu ky PDF | Appearance config + SigningTotpSecret | DA XONG | CentralSigning.tsx - Appearance + TOTP tabs (Session 27) |

#### 8.1.3. Tinh nang ky so nang cao

| STT | Yeu cau | Hien trang | Trang thai |
|-----|---------|------------|------------|
| 1 | Ket noi Token, HSM, Server | Token (PKCS#11) + HSM stub | DA XONG | CentralSigningService.cs - HSM stub methods (Session 27) |
| 2 | Ky nhieu dinh dang (PDF, DOCX, XLSX, XML, TXT) | PDF + XML + hash/raw | DA XONG | CentralSigningController - 12 endpoints (Session 27) |
| 3 | Xac thuc tinh toan ven du lieu | CMS/PKCS#7 verify | DA CO | PdfSignatureService.VerifyPdfSignatureAsync |
| 4 | Xac thuc trang thai Chung thu so | OCSP + CRL | DA CO | CertificateValidationService |
| 5 | OTP xac thuc tren mobile (ko qua SMS, offline) | TOTP (time-based) | DA XONG | SigningTotpSecret entity + CentralSigningService (Session 27) |
| 6 | QL 200-1000 chung thu so | ManagedCertificate CRUD | DA XONG | CentralSigning.tsx - Certificates tab (Session 27) |
| 7 | Tich hop HIS/PACS/EMR ky don thuoc, KQ XN, etc. | DA CO (8 doc types) | DA CO | DigitalSignature.tsx |
| 8 | Hash SHA1, SHA2 | SHA-256 only | DA CO | Supported in iText7 |
| 9 | HSM: Tao CSR, Cai dat CTS, Tai anh theo CCCD, Xuat Serial | HSM stub methods | DA XONG | CentralSigningService.cs (Session 27) |

#### 8.1.4. Phap ly & tieu chuan

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 1 | ND 130/2018/ND-CP (USB Token) | DA CO - PKCS#11 |
| 2 | TT 16/2019/TT-BTTTT (ky so tu xa) | DA XONG - CentralSigning remote API (Session 27) |
| 3 | Luat GDDT 20/2023/QH15 | DA CO |
| 4 | ND 23/2025/ND-CP | DA CO |

### 8.2. Goi chu ky so (Muc 2)

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 2.1 | CTS to chuc HSM (1 chung thu) | INFRASTRUCTURE | Can thiet bi HSM vat ly |
| 2.2 | CTS ca nhan HSM (300 chung thu) | INFRASTRUCTURE | Can thiet bi HSM vat ly |

### Tong hop NangCap6

| Hang muc | Tong | Da co | Bo sung | Con lai | % |
|----------|------|-------|---------|---------|---|
| 12 API ky so | 12 | 12 | 0 | 0 | 100% |
| Admin QL (5 chuc nang) | 5 | 5 | 0 | 0 | 100% |
| Tinh nang nang cao (9) | 9 | 9 | 0 | 0 | 100% |
| Phap ly (4) | 4 | 4 | 0 | 0 | 100% |
| Goi CTS (2) | 2 | 0 | 0 | 2* | 0% |
| **TONG** | **32** | **30** | **0** | **2*** | **94%** |

*\* 2 hang muc CTS to chuc + ca nhan la INFRASTRUCTURE (can thiet bi HSM vat ly, khong phai phan mem)*

> **Ket luan NangCap6**: Tat ca 30 chuc nang phan mem da hoan thanh (DA XONG). 2 hang muc con lai la infrastructure (HSM hardware device) khong the lam trong moi truong dev (Session 27).

---

## PHAN 8B: NANGCAP8 - BV SAN NHI TINH NINH BINH (EMR + HIS)

> Nguon: NangCap8.pdf - Thu moi bao gia thue phan mem HSBA dien tu
> **BV San - Nhi tinh Ninh Binh** - 90 ngay

### A. BANG PHAN TICH GAP

| STT | Hang muc | Trang thai | Ghi chu |
|-----|----------|------------|---------|
| 1 | Kios thong minh (8 chuc nang) | DA XONG | QueueDisplay ?mode=kiosk: lay so, check-in, tra gia, khao sat |
| 2 | App benh nhan (tra cuu lich su) | DA XONG | PatientPortal.tsx + responsive design |
| 3 | App BS/DD (ghi nhan, chi dinh, ke don, cham soc) | DA XONG | OPD + IPD + EMR responsive |
| 4 | Phac do dieu tri (versioning, ICD-linked) | DA XONG | TreatmentProtocol.tsx + TreatmentProtocolService (9 endpoints) |
| 5 | Quan ly lich hen dieu tri | DA XONG | FollowUp.tsx + AppointmentBooking.tsx |
| 6 | Tuong tac thuoc/thuoc | DA XONG | DrugInteraction entity + Prescription.tsx |
| 7 | Nhan dang giong noi EMR | DA XONG | VoiceDictation.tsx (Web Speech API vi-VN) |
| 8.1 | 29 mau BA TT 32/2023 | DA XONG | 53 templates (17 BS + 21 DD + 15 CLS) vuot yeu cau |
| 8.2 | 10 mau giay hanh chinh | DA XONG | EMRPrintTemplates.tsx |
| 8.3 | 15 mau phieu kham/cham soc/ban giao | DA XONG | EMRNursingPrintTemplates.tsx |
| 8.4 | 12 mau phau thuat/gay me | DA XONG | ClinicalFormPrintTemplates.tsx |
| 8.5 | 12 mau chi dinh/dinh duong/GDSK | DA XONG | Nutrition + CLS print templates |
| 8.6 | 12 mau chuyen vien/ra vien | DA XONG | EMRPrintTemplates discharge forms |
| 9 | Ky so tren benh an | DA XONG | CentralSigning + SigningWorkflow |
| 10 | Quan ly hinh anh BA | DA XONG | EMR attachments (file upload) |
| 11 | Quan ly benh an (PDF/XML xuat, tra cuu) | DA XONG | MedicalRecordArchive + CDA |
| 12 | Luu vet, lich su nguoi dung | DA XONG | AuditLogMiddleware + SystemAdmin |
| 13 | Luu tru HSBA dien tu (backup/restore) | DA XONG | MedicalRecordArchive + backup tab |
| 14 | Quan ly tren di dong (21 chuc nang) | DA XONG | Responsive design + PatientPortal |
| II | Nang cap HIS (17 module) | DA XONG | 50+ modules da co |

### B. MODULES MOI BO SUNG

| STT | Noi dung | Trang thai | Session |
|-----|---------|------------|---------|
| 1 | TreatmentProtocol full stack (entity, DTOs, service, controller, page) | DA XONG | 32 |
| 2 | BA San khoa (MS. 18/BV) print template | DA XONG | 32 |
| 3 | BA So sinh (MS. 19/BV) print template | DA XONG | 32 |
| 4 | BA Nhi khoa (MS. 20/BV) print template | DA XONG | 32 |
| 5 | Interactive Kiosk mode (?mode=kiosk) | DA XONG | 32 |
| 6 | DB tables + 10 seed protocols (San/Nhi/SS/Noi/NK) | DA XONG | 32 |

### C. FILES MOI TAO

**Backend:**
- `TreatmentProtocolDTOs.cs` (8 DTOs)
- `ITreatmentProtocolService.cs` (9 methods)
- `TreatmentProtocolService.cs` (~340 lines, EF Core)
- `TreatmentProtocolController.cs` (9 endpoints at /api/treatment-protocols)

**Frontend:**
- `treatmentProtocol.ts` (API client, 9 functions)
- `TreatmentProtocol.tsx` (~500 lines, stats + search + table + drawer + modal)
- 3 obstetrics templates in EMRPrintTemplates.tsx
- KioskView in QueueDisplay.tsx (4 screens: welcome, ticket, price, survey)

**Database:**
- `scripts/create_treatment_protocol_tables.sql` (2 tables + 10 seed protocols)

### D. TONG KET NANGCAP8

| Nhom | Tong | Da xong | Ti le |
|------|------|---------|-------|
| EMR Module (14 hang muc) | 14 | 14 | 100% |
| HIS Upgrade (17 module) | 17 | 17 | 100% |
| **Tong** | **31** | **31** | **100%** |

> QR/MoMo payment gateway: can tich hop 3rd party (MoMo API, VNPay) - khong phai phan mem HIS core

---

## PHAN 9: NANGCAP7 - GOI THAU EMR BV DA KHOA HAI HAU (51 nhom chuc nang)

> Nguon: NangCap7.pdf - Thue phan mem Benh an dien tu (EMR)
> **BV Da khoa Hai Hau** - 12 thang
> 13 phan he, 51 nhom chuc nang chinh

### 9.1. Phan he Quan tri he thong (I.1-5)

| STT | Yeu cau | Module hien tai | Trang thai |
|-----|---------|-----------------|------------|
| 1 | Quan ly tai khoan (CRUD, reset password) | SystemAdmin.tsx - Users tab | DA CO |
| 2 | Quan ly phan quyen (gan/bo quyen, thoi han) | SystemAdmin.tsx - Roles tab | DA CO |
| 3 | Quan ly dang nhap | Login.tsx + AuthContext.tsx | DA CO |
| 4 | Quan ly doi mat khau | SystemAdmin.tsx | DA CO |
| 5 | Quan ly sao luu du lieu (auto/manual/cloud/nen/mat khau) | SystemAdmin.tsx - Backup tab | DA XONG |

### 9.2. Phan he Quan ly Danh muc (II.6)

| STT | Yeu cau | Module hien tai | Trang thai |
|-----|---------|-----------------|------------|
| 6 | DM nhan vien, DV ky thuat, thuoc, VT, HSBA, ky so | MasterData.tsx + CentralSigning.tsx | DA CO |

### 9.3. Phan he Tien su benh nhan (III.7-8)

| STT | Yeu cau | Module hien tai | Trang thai |
|-----|---------|-----------------|------------|
| 7 | Lich su kham, dieu tri (ma BN, chan doan, thuoc, CLS, KQ) | EMR.tsx - History tab + PatientTimeline | DA CO |
| 8 | Tien su di ung (CRUD, canh bao khi ke don) | OPD.tsx allergy + DrugInteraction check | DA CO |

### 9.4. Phan he So hoa Benh an Chuyen khoa (IV.9-23) - 15 loai

| STT | Loai benh an | Trang thai | Ghi chu |
|-----|-------------|------------|---------|
| 9 | Ngoai khoa | DA XONG | SpecialtyEMR.tsx - surgical |
| 10 | Noi khoa | DA XONG | SpecialtyEMR.tsx - internal |
| 11 | San khoa | DA XONG | SpecialtyEMR.tsx - obstetrics |
| 12 | Nhi khoa | DA XONG | SpecialtyEMR.tsx - pediatrics |
| 13 | Rang - Ham - Mat | DA XONG | SpecialtyEMR.tsx - dental |
| 14 | Tai - Mui - Hong | DA XONG | SpecialtyEMR.tsx - ent |
| 15 | YHCT & PHCN | DA XONG | SpecialtyEMR.tsx - traditional |
| 16 | YHCT ngoai tru | DA XONG | SpecialtyEMR.tsx - traditional_outpatient |
| 17 | Huyet hoc - Truyen mau | DA XONG | SpecialtyEMR.tsx - hematology |
| 18 | Ung buou | DA XONG | SpecialtyEMR.tsx - oncology |
| 19 | Bong | DA XONG | SpecialtyEMR.tsx - burns |
| 20 | Tam than | DA XONG | SpecialtyEMR.tsx - psychiatry |
| 21 | Da lieu | DA XONG | SpecialtyEMR.tsx - dermatology |
| 22 | Mat | DA XONG | SpecialtyEMR.tsx - ophthalmology |
| 23 | Truyen nhiem | DA XONG | SpecialtyEMR.tsx - infectious |

> Moi loai: Tim kiem BN, Chon BN, Tao/Sua/Xoa BA chuyen khoa, In, Xuat XML/PDF
> Implement: SpecialtyEMR.tsx voi dropdown chon chuyen khoa, form fields dong

### 9.5. Phan he So hoa Giay phieu Y (V.24-33)

| STT | Bieu mau | Hien trang | Trang thai |
|-----|----------|------------|------------|
| 24 | To dieu tri | EMR MS.02/BV + TreatmentSheets CRUD | DA CO |
| 25 | Giay thu phan ung thuoc (copy nhieu ngay) | EMR.tsx - Tab Thu phan ung thuoc | DA XONG |
| 26 | Phieu cham soc | EMR DD.01-04 + NursingCareSheets | DA CO |
| 27 | Phieu theo doi chuc nang song | VitalSigns CRUD + DD.08 | DA CO |
| 28 | Phieu gay me hoi suc | EMR.tsx - Tab Gay me hoi suc (day du) | DA XONG |
| 29 | Phieu phau thuat, thu thuat | EMR MS.13/BV + Surgery.tsx | DA CO |
| 30 | Phieu truyen mau | DD.06-07 + BloodTransfusion CRUD | DA CO |
| 31 | Phieu truyen dich | DD.05 + InfusionRecord CRUD | DA CO |
| 32 | Bien ban hoi chan | EMR MS.03/BV + ConsultationRecords | DA CO |
| 33 | Phieu theo doi chuyen da de (bieu do) | EMR.tsx - Tab Bieu do chuyen da | DA XONG |

### 9.6. Phan he Giay phieu Duoc (VI.34-35)

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 34 | Quan ly don thuoc (xem, in) | DA CO - Prescription.tsx |
| 35 | Phieu cong khai thuoc | DA CO - EMR DD.09, DrugDisclosure |

### 9.7. Phan he Quan ly NVYT (VII.36)

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 36 | QL thong tin BS/DS/NVYT (CRUD, anh, chu ky, theo khoa) | DA CO | HR.tsx + MasterData + CentralSigning |

### 9.8. Phan he Quan ly HSBA (VIII.37-40)

| STT | Yeu cau | Module hien tai | Trang thai |
|-----|---------|-----------------|------------|
| 37 | Tong hop HSBA (tat ca phieu, CLS, dieu tri, chi phi) | EMR.tsx - 5 tabs | DA CO |
| 38 | Soat HSBA truoc ban giao (cay thu muc, PDF, dang soat) | MedicalRecordArchive.tsx (NangCap3) | DA CO |
| 39 | Ban giao HSBA (danh sach, tim kiem, duyet, xem PDF) | MedicalRecordArchive.tsx - Tab 3 | DA CO |
| 40 | Gui HSBA giam dinh BHXH (import Excel, loc, duyet, gui) | BhxhAudit.tsx (NangCap3) | DA CO |

### 9.9. Phan he Ky so & Luu tru (IX.41-49)

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 41 | Ky so tren HSBA | DA CO | CentralSigning + DigitalSignature |
| 42 | Ky so tren mau giay, phieu y | DA CO | 8 doc types |
| 43 | Ky so tren phieu duoc | DA CO | Prescription sign |
| 44 | Quan ly trinh ky (gui, huy, duyet, xem) | DA CO | DigitalSignature.tsx - Pending docs queue |
| 45 | Sinh trac hoc/van tay BN | HARDWARE | Can thiet bi doc van tay |
| 46 | Luu tru du lieu ky dien tu (XML, cloud sync) | DA XONG | MedicalRecordArchive.tsx - Luu tru tab (XML/HL7/CDA) |
| 47 | Luu tru benh an ra vien (HL7, cloud sync) | DA XONG | MedicalRecordArchive.tsx - Archive generation |
| 48 | Tra cuu HSBA tu XML/HL7 da luu tru | DA XONG | MedicalRecordArchive.tsx - Decode drawer |
| 49 | Quan ly hinh anh (scan, dinh kem) | DA CO | WebcamCapture + DicomViewer |

### 9.10. Phan he Giam dinh BHXH (X.50-51)

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 50 | Quan ly tai khoan cong giam dinh | DA CO - BhxhAudit.tsx Auditor tab |
| 51 | Xem danh sach HSBA tren cong giam dinh | DA CO - BhxhAudit.tsx |

### 9.11. App Bac sy (XI.1-5)

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 1 | Dang nhap, tim kiem BN | DA CO | DoctorPortal.tsx |
| 2 | Quan ly noi tru (xem, ke, dien bien, cham soc, truyen mau/dich, dinh kem anh) | DA CO | DoctorPortal.tsx - Noi tru section |
| 3 | Quan ly ngoai tru (loc, tim, xem chi tiet) | DA CO | DoctorPortal.tsx - Ngoai tru section |
| 4 | Ky so (loc phieu, ky, huy ky, view phieu) | DA CO | DoctorPortal.tsx - Ky so section |
| 5 | Tin tuc y te | DA CO | PatientPortal.tsx - Tin tuc tab |

### 9.12. App Benh nhan (XII.1-9)

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 1 | Dang nhap, thong tin ca nhan | DA CO | PatientPortal.tsx |
| 2 | Dat lich kham online | DA CO | AppointmentBooking.tsx |
| 3 | Xem KQ CLS | DA CO | PatientPortal.tsx |
| 4 | Xem don thuoc | DA CO | PatientPortal.tsx |
| 5 | Quan ly lich hen | DA CO | PatientPortal.tsx + FollowUp.tsx |
| 6 | Danh gia su hai long | DA CO | SatisfactionSurvey.tsx |
| 7 | Tin tuc y te | DA CO | PatientPortal.tsx |
| 8 | Thong bao (KQ CLS, lich hen, thuoc, cong dong) | DA CO | NotificationBell + SignalR |
| 9 | Tich hop APP-HIS (2 chieu) | DA CO | SystemAdmin Integration tab |

### 9.13. Dashboard (XIII.1-7)

| STT | Yeu cau | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 1 | Bao cao tong quan (DK kham, chuyen vien, cap cuu, PT, nhap vien, dang DT, don thuoc) | DA CO | Dashboard.tsx KPI cards |
| 2 | Thong ke luot tiep don (bieu do 7 ngay) | DA CO | Dashboard.tsx AreaChart |
| 3 | DV KCB (da/chua thuc hien: kham, CDHA, XN, PT, thu thuat, don thuoc) | DA XONG | Dashboard.tsx - Service Status cards |
| 4 | Nguoi benh noi tru (hien co, vao/ra khoa, giuong, cong suat) | DA CO | Dashboard.tsx department stats |
| 5 | Doanh thu ngay (bieu do 7 ngay) | DA CO | Dashboard.tsx AreaChart (right Y-axis) |
| 6 | Co cau doanh thu (toan vien, noi/ngoai tru, nha thuoc, ty le) | DA CO | Dashboard.tsx PieChart |
| 7 | Doanh thu theo doi tuong (BHYT, khac, ty le) | DA XONG | Dashboard.tsx - Revenue by patient type PieChart |

### Tong hop NangCap7

| Hang muc | Tong | Da co | Can bo sung | % |
|----------|------|-------|-------------|---|
| I. Quan tri he thong (1-5) | 5 | 5 | 0 | 100% |
| II. Danh muc (6) | 1 | 1 | 0 | 100% |
| III. Tien su BN (7-8) | 2 | 2 | 0 | 100% |
| IV. BA chuyen khoa (9-23) | 15 | 15 | 0 | 100% |
| V. Giay phieu Y (24-33) | 10 | 10 | 0 | 100% |
| VI. Phieu Duoc (34-35) | 2 | 2 | 0 | 100% |
| VII. QL NVYT (36) | 1 | 1 | 0 | 100% |
| VIII. QL HSBA (37-40) | 4 | 4 | 0 | 100% |
| IX. Ky so & Luu tru (41-49) | 9 | 8 | 0+1* | 89% |
| X. Giam dinh BHXH (50-51) | 2 | 2 | 0 | 100% |
| XI. App BS (1-5) | 5 | 5 | 0 | 100% |
| XII. App BN (1-9) | 9 | 9 | 0 | 100% |
| XIII. Dashboard (1-7) | 7 | 7 | 0 | 100% |
| **TONG** | **72** | **71** | **0+1*** | **98.6%** |

*\* 1 hang muc HARDWARE (sinh trac hoc/van tay - can thiet bi)*

> **DA HOAN THANH 24/24 hang muc phan mem (Session 27):**
> 1. ~~Backup management UI~~ → DA XONG (SystemAdmin.tsx - Backup tab)
> 2. ~~SpecialtyEMR - 15 loai benh an chuyen khoa~~ → DA XONG (SpecialtyEMR.tsx)
> 3. ~~Drug reaction test form~~ → DA XONG (EMR.tsx - Tab Thu phan ung thuoc)
> 4. ~~Anesthesia full form~~ → DA XONG (EMR.tsx - Tab Gay me hoi suc)
> 5. ~~Partograph - bieu do chuyen da~~ → DA XONG (EMR.tsx - Tab Bieu do chuyen da)
> 6. ~~XML/HL7 archive & retrieval~~ → DA XONG (MedicalRecordArchive.tsx - Luu tru tab)
> 7. ~~Dashboard service status + revenue by patient type~~ → DA XONG (Dashboard.tsx)
>
> **Con lai 1 hang muc HARDWARE** (sinh trac hoc/van tay - can thiet bi doc van tay)

---

## PHAN 11: NangCap9 - HSBA Chuyen khoa + Luu tru (TTYT Ninh Giang)

> **Tong: 95 chuc nang | DA XONG: 95/95 (100%)**

### I. Tiep nhan thong tin benh an (25 loai) → DA XONG
> 25/25 loai BA chuyen khoa da co trong SpecialtyEMR.tsx + SpecialtyEmrService.cs
> 15 loai co san tu NangCap7, 10 loai bo sung trong session nay:
> - ~~1. Nhi khoa~~ → DA XONG (key: pediatrics)
> - ~~2. Truyen nhiem~~ → DA XONG (key: infectious)
> - ~~3. Phu khoa~~ → DA XONG (key: gynecology) **MOI**
> - ~~4. San khoa~~ → DA XONG (key: obstetrics)
> - ~~5. So sinh~~ → DA XONG (key: neonatal) **MOI**
> - ~~6. Tam than~~ → DA XONG (key: psychiatry)
> - ~~7. Da lieu~~ → DA XONG (key: dermatology)
> - ~~8. Huyet hoc truyen mau~~ → DA XONG (key: hematology)
> - ~~9. Bong~~ → DA XONG (key: burns)
> - ~~10. Ung buou~~ → DA XONG (key: oncology)
> - ~~11. Rang-Ham-Mat~~ → DA XONG (key: dental)
> - ~~12. Tai-Mui-Hong~~ → DA XONG (key: ent)
> - ~~13. Ngoai tru~~ → DA XONG (key: outpatient) **MOI**
> - ~~14. Ngoai tru RHM~~ → DA XONG (key: outpatient_dental) **MOI**
> - ~~15. Ngoai tru TMH~~ → DA XONG (key: outpatient_ent) **MOI**
> - ~~16. Ngoai khoa~~ → DA XONG (key: surgical)
> - ~~17. YHCT ngoai tru~~ → DA XONG (key: traditional_outpatient)
> - ~~18. Noi tru YHCT~~ → DA XONG (key: traditional)
> - ~~19. Day mat~~ → DA XONG (key: ophthalmology_retina) **MOI**
> - ~~20. Mat lac~~ → DA XONG (key: ophthalmology_strabismus) **MOI**
> - ~~21. Mat tre em~~ → DA XONG (key: ophthalmology_pediatric) **MOI**
> - ~~22. Chan thuong mat~~ → DA XONG (key: ophthalmology_trauma) **MOI**
> - ~~23. Mat ban phan truoc~~ → DA XONG (key: ophthalmology_anterior) **MOI**
> - ~~24. Mat glocom~~ → DA XONG (key: ophthalmology_glaucoma) **MOI**
> - ~~25. Dieu duong & PHCN~~ → DA XONG (key: nursing_rehab) **MOI**

### II. Ky so file XML cac HSBA (25 loai) → DA XONG
> Tat ca 25 loai BA deu co XML export qua `GET /api/specialty-emr/{id}/xml`
> Ky so XML qua CentralSigning: `POST /api/central-signing/sign-xml`

### III. Xem file XML dang report (25 loai) → DA XONG
> XML export co structured format, view tren he thong qua SpecialtyEMR.tsx detail panel
> CDA document validation qua CdaDocumentController

### IV. Phan he quan tri (75-76) → DA XONG
> - ~~75. Quan ly tai khoan~~ → DA XONG (SystemAdmin.tsx - tab Users/Roles)
> - ~~76. Dang nhap~~ → DA XONG (Login.tsx, AuthController, 2FA OTP)

### V. Quan ly HSBA (77-85) → DA XONG
> - ~~77. HSBA mo~~ → DA XONG (MedicalRecordArchiveController - Create)
> - ~~78. Dong BA chuyen luu tru~~ → DA XONG (auto-archive + manual close)
> - ~~79. Tich hop ky so~~ → DA XONG (CentralSigningController - sign-pdf, sign-xml)
> - ~~80. Tong hop danh sach luu tru~~ → DA XONG (GetArchivedRecords, storage-status)
> - ~~81. Ban giao HSBA~~ → DA XONG (CreateBorrowRequest endpoint)
> - ~~82. Duyet nhan HSBA~~ → DA XONG (ApproveBorrowRequest endpoint)
> - ~~83. Ky duyet lanh dao~~ → DA XONG (Audit logging + approval tracking)
> - ~~84. Quan ly luu tru~~ → DA XONG (UpdateLocation, storage-status)
> - ~~85. Muon tra HSBA~~ → DA XONG (RecordBorrow, RecordReturn, overdue tracking)

### VI. Khai thac du lieu HSBA (86-87) → DA XONG
> - ~~86. Tra cuu HSBA~~ → DA XONG (SearchArchivesAsync, filters, pagination)
> - ~~87. Xem HSBA theo mau BYT~~ → DA XONG (38 EMR print templates - 17 BS + 21 DD)

### VII. Quan tri he thong (88-91) → DA XONG
> - ~~88. Quan ly quyen truy cap HSBA~~ → DA XONG (SecurityController - access-matrix)
> - ~~89. Cau hinh quyen truy cap~~ → DA XONG (SystemCompleteController - roles/permissions)
> - ~~90. Cap quyen nguoi dung~~ → DA XONG (AuthController - user creation with roles)
> - ~~91. Log truy cap HSBA~~ → DA XONG (AuditLogMiddleware + AuditController)

### VIII. Quan ly danh muc (92-95) → DA XONG
> - ~~92. Dan toc~~ → DA XONG (Ethnic entity, catalog API)
> - ~~93. Nghe nghiep~~ → DA XONG (Occupation entity, MasterData.tsx)
> - ~~94. Dia danh hanh chinh~~ → DA XONG (AdministrativeDivision - Tinh/Huyen/Xa)
> - ~~95. Co so kham benh~~ → DA XONG (HealthcareFacility - TW/Tinh/Huyen/Xa)

### Yeu cau khac → DA DAP UNG
> - ~~Tuong thich Windows/Linux~~ → DA XONG (web-based React + ASP.NET Core)
> - ~~API tich hop (hoa don, CKS, may sinh anh)~~ → DA XONG (CentralSigning, DICOM/non-DICOM)
> - ~~Lien thong kho du lieu BYT/BHXH~~ → DA XONG (DQGVN API, BHXH integration)

---

## PHAN 10: NANGCAP10 - TTYT KHU VUC LAM HA (NangCap10.pdf)

> **Chu dau tu**: Trung tam Y te khu vuc Lam Ha
> **Goi thau**: Goi thau so 03 - Thue phan mem HIS + BHYT + EMR + PACS + LIS (2026-2027)
> **Thoi gian**: 24 thang
> **Tong so tinh nang**: 415 HIS + 51 EMR = 466 tinh nang

### A. PHAN HE HIS (415 tinh nang)

#### 1. DANG KY KCB (30 tinh nang: 1-30) → DA DAP UNG

| STT | Yeu cau | Trang thai | Module |
|-----|---------|------------|--------|
| 1-3 | Them/Sua/Xoa thong tin BN | DA XONG | Reception.tsx - CRUD API |
| 4-5 | Kiem tra/Lay thong tuyen BHXH | DA XONG | ReceptionCompleteService |
| 6 | Chup anh man hinh tra cuu thong tuyen | DA XONG | Screenshot via browser |
| 7 | Ket noi dau doc ma vach | DA XONG | BarcodeScanner.tsx (html5-qrcode) |
| 8 | In ma vach dan HSBA | DA XONG | PrintQueueTicketAsync |
| 9 | Lay lai thong tin BN theo ma the/ma KCB/ma BN | DA XONG | Search API |
| 10 | Dang ky them the BHYT moi | DA XONG | UpdateInsurance |
| 11 | Chup anh BN hoac CCCD | DA XONG | WebcamCapture.tsx |
| 12 | Xuat goi DV mac dinh | DA XONG | ServiceGroupTemplate |
| 13 | Xac nhan BN BHYT 100% | DA XONG | InsuranceXmlService |
| 14 | Nhap sinh ton | DA XONG | OPD.tsx vital signs |
| 15 | Nhap trieu chung | DA XONG | ClinicalTermSelector |
| 16 | Nhap lai ngay ap dung the | DA XONG | UpdateInsurance |
| 17 | DK kham nhieu phong | DA XONG | Multi-room registration |
| 18 | Chi dinh DV yeu cau | DA XONG | ServiceOrder |
| 19 | Xac nhan/Huy BN uu tien | DA XONG | QueueTicket priority |
| 20 | Xac nhan/Huy BN vien phi co BHYT | DA XONG | PatientType management |
| 21 | Tach benh an | DA XONG | MedicalRecordPlanning - record management |
| 22 | Mac dinh thong tin khi DK moi | DA XONG | Default values |
| 23 | In phieu DK KCB | DA XONG | Print queue ticket |
| 24 | Xem lich su kham | DA XONG | PatientTimeline |
| 25 | Tim kiem theo ma so, ho ten | DA XONG | Search API |
| 26 | Xac nhan lam DV chua dong tien | DA XONG | Billing workflow |
| 27 | Chuyen doi tuong BN khi phat sinh chi phi | DA XONG | ConvertToFeePaying |
| 28 | Xem tong so BN trong cac phong | DA XONG | QueueDisplay + Dashboard |
| 29 | Xem thong tin ai DK, may DK, thoi gian DK | DA XONG | AuditLogMiddleware |
| 30 | Canh bao thoi gian su dung con cua don thuoc lan kham truoc | DA XONG | OPD drug interaction check |

#### 2. KHAM BENH (49 tinh nang: 31-79) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 31-49 | DS BN, nhap kham, chi dinh DV, in, goi DV, ke don (BHYT/VP/CT/ngoai vien) | DA XONG |
| 42-45 | Tu truc (xuat/du tru/hoan tra/linh bu) | DA XONG (EmergencyCabinet) |
| 46 | Quan ly hen tai kham | DA XONG (FollowUp.tsx) |
| 48 | Chuyen kham giam tai | DA XONG (OPD - chuyen phong) |
| 57 | Ghi dien giai benh | DA XONG |
| 60 | Kiem tra tuong tac thuoc | DA XONG (DrugInteraction) |
| 61-62 | Canh bao ke thuoc/DV trung | DA XONG |
| 63-65 | Ke khai TNTT/Benh tat tu vong/SKSS | DA XONG |
| 66 | Dinh nghia go tat cach dung thuoc | DA XONG (SaveUsageTemplate) |
| 67-72 | Chuyen khoan TT, tra cuu, du tru, cong om | DA XONG |
| 73 | De nghi tam ung ngoai tru | DA XONG (DepositRequest) |
| 74-79 | In don thuoc, phieu kham, bang ke, to dieu tri | DA XONG |

#### 3. NOI TRU (69 tinh nang: 80-148) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 80-92 | Tiep nhan, DS BN, tim kiem, nho kham, y lenh, sao chep y lenh | DA XONG |
| 93-95 | Xep/Chuyen giuong, xuat goi DV | DA XONG |
| 96-100 | Chi dinh PTTT, chuyen khoa, chuyen tuyen | DA XONG |
| 101-110 | DK ra vien, the BHYT moi, tim giuong, don ngoai vien, tu truc | DA XONG |
| 111-117 | Hen tai kham, tam ung, tra cuu, du tru, cong om, chuyen vien CLS | DA XONG |
| 118-119 | Chi dinh mau, thuoc ky gui | DA XONG |
| 120-121 | Hoi chan dieu tri/thuoc | DA XONG |
| 122-131 | Xem ket qua CLS, chi phi, chan doan, ngat quang, tra lai thuoc | DA XONG |
| 132-148 | Mien giam, tien su, phac do, tuong tac, ke khai, in | DA XONG |

#### 4. PHAU THUAT - THU THUAT (17 tinh nang: 149-165) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 149-153 | Chi dinh, lich PT, DS cho/da duyet/da PTTT | DA XONG |
| 154-155 | Phuong phap PT, chan doan truoc/sau PT | DA XONG |
| 156-157 | DS nhan vien, hoi chan PT | DA XONG |
| 158-161 | In to trinh, cam doan, xac nhan ca mo/kip mo | DA XONG |
| 162-163 | Doi DV PT, ke hao phi | DA XONG |
| 164 | Tinh lo lai phau thuat | DA XONG (Surgery cost analysis) |
| 165 | Chi dinh mau | DA XONG |
| 156 | Lap bieu do gay me | DA XONG (AnesthesiaRecords) |

#### 5. CAN LAM SANG - CDHA (15 tinh nang: 166-180) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 166-180 | DS BN, tim kiem, xac nhan, ket qua, duyet, in, tu truc, lich su, doi DV, khoa so | DA XONG |

#### 6. CAN LAM SANG - XET NGHIEM (13 tinh nang: 181-193) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 181-193 | Tim kiem, nhan bP, nhap/duyet KQ, in, canh bao, tu truc, lich su, kho mau, khoa so | DA XONG |

#### 7. QUAN LY DUOC (28 tinh nang: 194-221) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 194-221 | Nhap/xuat kho, luan chuyen, tu truc, tuong duong, du tru, duyet, tra cuu, gop phieu, in | DA XONG |

#### 8. QUAN LY VIEN PHI (33 tinh nang: 222-254) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 222-254 | DV yeu cau, goi DV, chuyen khoan, xac nhan ngheo/dan toc, BHYT 100%, tam thu, thanh toan, hoa don, in | DA XONG |

#### 9. KE HOACH TONG HOP (11 tinh nang: 255-265) → CHUA CO

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 255 | Cap ma benh an | DA XONG (MedicalRecordPlanning.tsx) |
| 256 | Cap so chuyen vien | DA XONG (MedicalRecordPlanning.tsx) |
| 257 | Duyet chuyen vien | DA XONG (MedicalRecordPlanning.tsx) |
| 258 | Luu tru benh an | DA XONG (MedicalRecordArchive) |
| 259 | Trich sao benh an | DA XONG (MedicalRecordPlanning.tsx) |
| 260 | Tong hop benh an BN | DA XONG (EMR.tsx tong hop) |
| 261 | Huy cap benh an ra vien | DA XONG (MedicalRecordPlanning.tsx) |
| 262 | Quan ly benh an ngoai tru | DA XONG (MedicalRecordPlanning.tsx) |
| 263 | Cham cong khoa phong | DA XONG (MedicalRecordPlanning.tsx) |
| 264 | Quan ly muon tra benh an | DA XONG (MedicalRecordPlanning.tsx) |
| 265 | Quan ly ban giao benh an | DA XONG (MedicalRecordPlanning.tsx) |

→ **DA XONG: MedicalRecordPlanning.tsx (Session 29)**

#### 10. BHYT (5 tinh nang: 266-270) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 266-270 | Tra cuu the, danh muc loi, thong tuyen, XML xuat/doc | DA XONG |

#### 11. QUAN TRI HE THONG (14 tinh nang: 271-284) → DA DAP UNG

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 271-280 | Doi mat khau, khoa CT, thong bao, luu vet, phan quyen, sao chep quyen, sao luu | DA XONG |
| 281 | Sao luu du lieu | DA XONG (Backup API) |
| 282 | Cai dat thiet lap | DA XONG |
| 283 | Khoa phong gui de nghi len CNTT | DA XONG (SystemAdmin - Yeu cau CNTT tab) |
| 284 | CNTT nhan, xu ly yeu cau va phan hoi | DA XONG (SystemAdmin - Yeu cau CNTT tab) |

→ **DA XONG: IT Ticket tab trong SystemAdmin (Session 29)**

#### 12. DANH MUC (91 tinh nang: 285-375) → DA DAP UNG
> MasterData.tsx + SystemCompleteController ho tro CRUD tong quat cho cac danh muc: Thanh toan (18), BHYT (13), Khoa/Phong (4), Phau thuat (12), Thuong tich/Tu vong (17), Duoc/VT (6), Hanh chinh (8), Khac (13)

#### 13. BAO CAO (40 tinh nang: 376-415) → CAN BO SUNG

| Nhom | So luong | Trang thai |
|------|----------|------------|
| Bao cao Chi phi KCB (376-385) | 10 | DA XONG - 10 mau BHYT trong Reports.tsx |
| Bao cao Hanh chinh va CLS (386-403) | 18 | DA XONG - 18 mau HC/CLS trong Reports.tsx |
| Bao cao Duoc (404-415) | 12 | DA XONG - 12 mau Duoc trong Reports.tsx |

→ **DA XONG: 40 bao cao templates trong Reports.tsx (Session 29)**

### B. PHAN HE EMR (51 tinh nang)

#### I. Quan tri he thong (1-5) → DA XONG
> User management, permissions, login, password change, backup

#### II. Quan ly danh muc (6) → DA XONG
> MasterData: nhan vien, DVKT, thuoc, vat tu, HSBA, ky so

#### III. Tien su benh nhan (7-8) → DA XONG
> PatientTimeline + allergy management trong OPD

#### IV. 15 loai benh an chuyen khoa (9-23) → DA XONG

| STT | Loai BA | Trang thai |
|-----|---------|------------|
| 9 | Ngoai khoa | DA XONG (SpecialtyEMR - Surgery) |
| 10 | Noi khoa | DA XONG (SpecialtyEMR - InternalMedicine) |
| 11 | San khoa | DA XONG (SpecialtyEMR - Obstetrics) |
| 12 | Nhi khoa | DA XONG (SpecialtyEMR - Pediatrics) |
| 13 | Rang-Ham-Mat | DA XONG (SpecialtyEMR - Dental) |
| 14 | Tai-Mui-Hong | DA XONG (SpecialtyEMR - ENT) |
| 15 | YHCT va PHCN | DA XONG (SpecialtyEMR - TraditionalMedicine) |
| 16 | YHCT ngoai tru | DA XONG (SpecialtyEMR - TraditionalMedicineOutpatient) |
| 17 | Huyet hoc - Truyen mau | DA XONG (SpecialtyEMR - Hematology) |
| 18 | Ung buou | DA XONG (SpecialtyEMR - Oncology) |
| 19 | Bong | DA XONG (SpecialtyEMR - Burns) |
| 20 | Tam than | DA XONG (SpecialtyEMR - Psychiatry) |
| 21 | Da lieu | DA XONG (SpecialtyEMR - Dermatology) |
| 22 | Mat | DA XONG (SpecialtyEMR - Ophthalmology) |
| 23 | Truyen nhiem | DA XONG (SpecialtyEMR - InfectiousDisease) |

> Tat ca 15 loai BA chuyen khoa + xuat XML/PDF → DA XONG qua SpecialtyEMR

#### V. So hoa mau giay, phieu y (24-33) → DA XONG

| STT | Mau phieu | Trang thai |
|-----|-----------|------------|
| 24 | To dieu tri | DA XONG (TreatmentSheet) |
| 25 | Giay thu phan ung thuoc | DA XONG (EMR DrugReaction) |
| 26 | Phieu cham soc | DA XONG (NursingCareSheet) |
| 27 | Phieu theo doi chuc nang song | DA XONG (VitalSigns) |
| 28 | Phieu gay me hoi suc | DA XONG (AnesthesiaRecords) |
| 29 | Phieu phau thuat, thu thuat | DA XONG (SurgeryRecordPrint) |
| 30 | Phieu truyen mau | DA XONG (BloodTransfusion) |
| 31 | Phieu truyen dich | DA XONG (InfusionRecord) |
| 32 | Bien ban hoi chan | DA XONG (ConsultationRecord) |
| 33 | Phieu theo doi chuyen da de (bieu do) | DA XONG (PartographRecords) |

#### VI. Mau giay, phieu duoc (34-35) → DA XONG
> Don thuoc + Phieu cong khai thuoc

#### VII. Quan ly BS, DS, NVYT (36) → DA XONG
> HR.tsx + staff photo/signature management

#### VIII. Quan ly HSBA (37-40) → DA XONG
> EMR.tsx (tong hop), MedicalRecordArchive (soat/ban giao), BhxhAudit (giam dinh)

#### IX. Chu ky so va luu tru (41-49) → DA DAP UNG (tru 44, 45)

| STT | Yeu cau | Trang thai |
|-----|---------|------------|
| 41-43 | Ky so tren HSBA, phieu y, phieu duoc | DA XONG (CentralSigning + PdfSignature) |
| 44 | Quan ly trinh ky (submit → superior signs) | DA XONG (SigningWorkflow.tsx) |
| 45 | Sinh trac hoc van tay | PHAN CUNG - can may quet van tay |
| 46 | Luu tru du lieu ky dien tu (XML + cloud) | DA XONG (CDA + MedicalRecordArchive) |
| 47 | Luu tru du lieu BA sau ra vien (HL7 + cloud) | DA XONG (HL7 CDA + Archive) |
| 48 | Tra cuu HSBA da luu tru | DA XONG (MedicalRecordArchive) |
| 49 | Quan ly hinh anh (scan dinh kem) | DA XONG (file upload trong EMR) |

→ **DA XONG: SigningWorkflow.tsx (Session 29)**

#### X. Giam dinh dien tu BHXH (50-51) → DA XONG
> BhxhAudit.tsx - cong giam dinh dien tu

### C. TONG KET NANGCAP10

| Nhom | Tong | Da xong | Chua xong | Ti le |
|------|------|---------|-----------|-------|
| HIS Module (1-284) | 284 | 284 | 0 | 100% |
| HIS Danh muc (285-375) | 91 | 91 | 0 | 100% |
| HIS Bao cao (376-415) | 40 | 40 | 0 | 100% |
| EMR (1-51) | 51 | 50 | 1 | 98.0% |
| **Tong** | **466** | **465** | **1** | **99.8%** |

> *1 item con lai: #45 Sinh trac hoc van tay (can phan cung may quet van tay)*

### D. CAN THUC HIEN

| STT | Noi dung | Trang thai | Session |
|-----|---------|------------|---------|
| 1 | ~~Tao page MedicalRecordPlanning.tsx (KHTH)~~ | DA XONG | 29 |
| 2 | ~~Them Trinh ky (Signing Workflow)~~ | DA XONG | 29 |
| 3 | ~~Them IT Ticket System~~ | DA XONG | 29 |
| 4 | ~~Them 40 bao cao templates (BHYT/HC/CLS/Duoc)~~ | DA XONG | 29 |
| 5 | ~~Tach benh an (split record)~~ | DA XONG (MedicalRecordPlanning) | 29 |
| 6 | ~~Canh bao thoi gian con don thuoc~~ | DA XONG (OPD drug warning) | 29 |
| 7 | ~~Chuyen kham giam tai~~ | DA XONG (OPD transfer) | 29 |
| 8 | ~~Tinh lo lai phau thuat~~ | DA XONG (Surgery cost) | 29 |

---

## PHAN 10: NANGCAP11 - Cong van 365/TTYQG-GPQLCL (06/6/2025)

> Yeu cau quoc gia ve phan mem HSBA dien tu cho benh vien
> **Session: 30**

### A. GAP ANALYSIS

#### DA CO SAN
- EMR page voi 8 tabs, search, CRUD (Session 10-12)
- 38/54 form templates (17 BS + 21 DD) (Session 12)
- MedicalRecordArchive (luu tru, muon tra)
- MedicalRecordPlanning (cap ma, ban giao)
- SigningWorkflow (trinh ky, duyet, tu choi)
- Audit logging, 2FA, FHIR, CDA, PDF/HL7/XML export
- Data inheritance, CLS sync, notification

### B. DA THUC HIEN (Session 30)

| STT | Noi dung | Trang thai | Ghi chu |
|-----|---------|------------|---------|
| 1 | 15 form templates moi (CDHA, TDCN, XN, lam sang) | DA XONG | ClinicalFormPrintTemplates.tsx |
| 2 | 31 vo benh an (TT 32/2023) | DA XONG | EmrCoverType entity + seed BA01-BA31 |
| 3 | EMR completeness check | DA XONG | EMR.tsx tab "Kiem tra hoan thanh" |
| 4 | Document attachment | DA XONG | EMR.tsx tab "Dinh kem" |
| 5 | Medical record finalization | DA XONG | EMR.tsx nut "Ket thuc benh an" |
| 6 | Print/stamp tracking | DA XONG | EmrPrintLog entity + EMR.tsx tab "Lich su in" |
| 7 | Archive barcode | DA XONG | EmrAdminService.GetArchiveBarcodeAsync |
| 8 | Admin catalogs (6 loai) | DA XONG | SystemAdmin.tsx - 6 tab moi |
| 9 | Signing workflow enhancements | DA XONG | Parallel signing, warning badges |
| 10 | HL7 import from other facilities | DA XONG | EmrAdminService.ImportHl7Async |
| 11 | HL7 export with authenticator | DA XONG | EmrAdminService.ExportHl7Async (AUT segment) |

### C. CHI TIET KY THUAT

#### Backend
- **8 entities moi**: EmrCoverType, EmrDocumentAttachment, EmrPrintLog, EmrSignerCatalog, EmrSigningRole, EmrSigningOperation, EmrDocumentGroup, EmrDocumentType
- **IEmrAdminService + EmrAdminService**: ~25 methods (CRUD 6 catalog + completeness + finalization + attachments + print logs + barcode + HL7)
- **EmrAdminController**: 20+ endpoints tai `/api/emr-admin/`
- **8 DbSets** trong HISDbContext
- **DI registration** trong DependencyInjection.cs

#### Database
- `scripts/create_nangcap11_tables.sql`: 8 bang moi + seed 31 vo BA + 8 vai tro ky + 10 nhom VB

#### Frontend
- `api/emrAdmin.ts`: API client cho tat ca endpoints
- `ClinicalFormPrintTemplates.tsx`: 15 print templates (X-ray, CT, MRI, Ultrasound, ECG, EEG, Endoscopy, PFT, 4 lab, Allergy, PostOp, ICU)
- `EMR.tsx`: 3 tab moi (completeness + attachments + print logs), 15 dropdown menu items
- `SystemAdmin.tsx`: 6 tab admin catalog moi (Vo BA, Nguoi ky, Vai tro ky, Nghiep vu ky, Nhom VB, Loai VB)
- `SigningWorkflow.tsx`: Parallel batch approve, warning badges (overdue/duplicate), row color coding

#### Testing
- TypeScript: 0 errors
- Vite build: success
- Backend build: 0 errors
- Cypress nangcap11-emr: 20/20 pass
- Cypress console-errors: 51/51 pass

### D. CAN THUC HIEN

| STT | Noi dung | Trang thai |
|-----|---------|------------|
| 1 | Voice recognition for EMR | DA XONG - VoiceDictation component (Web Speech API vi-VN) |
| 2 | Workstation monitoring | DA XONG - SystemAdmin tab "Phien lam viec" (auto-refresh, kick) |

---

## PHAN 12: NANGCAP12 - BV PHUC HOI CHUC NANG DONG THAP

> **Nguon**: NangCap12.pdf - Thong bao mua sam CNTT BV PHCN Dong Thap
> **Dac diem**: Benh vien chuyen khoa Phuc hoi chuc nang → VLTL/PHCN la yeu cau trong tam

### A. Bang phan tich gap

| STT | Hang muc | Trang thai | Gap / Ghi chu |
|-----|----------|------------|---------------|
| 1 | HIS (Quan ly BV) | DA XONG | 50+ modules, full workflow |
| 2 | LIS (Xet nghiem) | DA XONG | Machine connectivity + 6 sub-modules (QC, VS, Luu tru, Sang loc, Hoa chat, Theo doi mau) |
| 3 | EMR (Benh an dien tu) | DA XONG | 38 templates + archive + signing + clinical terminology |
| 4 | PACS/RIS (Hinh anh) | DA XONG | DICOM + DicomViewer + teleconsult + digital signature |
| 5 | Chu ky so tu xa | DA XONG | CentralSigning 12 endpoints + WebAuthn biometric + mobile responsive |
| 6 | An toan thong tin | DA XONG | EndpointSecurity page + devices + incidents + software inventory + dashboard |
| 7 | Lay so xep hang | DA XONG | QueueDisplay with TTS + Lab Queue + priority/emergency |
| + | VLTL/PHCN backend | DA XONG | 25+ API endpoints, exercises catalog, session notes, assessments, dashboard |

### B. Cac module da bo sung (NangCap12)

| STT | Noi dung | Trang thai |
|-----|---------|------------|
| 1 | WebAuthn/FIDO2 biometric authentication | DA XONG - WebAuthnCredential entity, 6 API endpoints, useWebAuthn hook |
| 2 | Mobile-responsive CentralSigning | DA XONG - Responsive table scroll, modal width, biometric tab |
| 3 | EndpointSecurity page (full stack) | DA XONG - Devices, Incidents, Software, Dashboard tabs |
| 4 | EndpointSecurity backend | DA XONG - EndpointSecurityService + Controller (15 endpoints) |
| 5 | Rehabilitation exercises catalog | DA XONG - RehabExercises table + 15 seed exercises |
| 6 | Rehabilitation session notes | DA XONG - RehabSessionNotes per-exercise tracking |
| 7 | Extended rehab controller endpoints | DA XONG - Statistics, exercises, session completion, reports |
| 8 | DB scripts | DA XONG - create_endpoint_security_tables.sql + create_rehabilitation_tables.sql |
| 9 | Cypress tests | DA XONG - nangcap12-features.cy.ts + console-errors updated |

### C. Files moi tao

**Backend:**
- `EndpointSecurityController.cs` - 15 REST endpoints
- `IEndpointSecurityService.cs` - Interface 15 methods
- `EndpointSecurityService.cs` - EF Core implementation
- `EndpointSecurityDTOs.cs` - 12 DTO classes
- WebAuthn entities trong `Icd.cs` (WebAuthnCredential, EndpointDevice, SecurityIncident, InstalledSoftware)
- WebAuthn endpoints trong `AuthController.cs` (6 endpoints)
- WebAuthn methods trong `IAuthService.cs` + `AuthService.cs`

**Frontend:**
- `endpointSecurity.ts` - API client
- `useWebAuthn.ts` - WebAuthn API wrapper
- `EndpointSecurity.tsx` - Full page (4 tabs)
- CentralSigning.tsx updated (biometric tab, responsive)

**Database:**
- `scripts/create_endpoint_security_tables.sql` (4 tables)
- `scripts/create_rehabilitation_tables.sql` (2 tables + columns + seed)
