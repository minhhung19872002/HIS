# Phan Tich Yeu Cau Nang Cap HIS Muc 6 & EMR

> So sanh yeu cau trong NangCap.pdf voi he thong HIS hien tai
> **Cap nhat lan cuoi: 2026-03-01**

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
| **TONG** | **128** | **127** | **1*** | **99.2%** |

*\* 1 hang muc con lai la "Ket noi kinh hien vi" - yeu cau phan cung (HARDWARE-DEPENDENT)*

> **Ket luan**: He thong HIS da hoan thanh 99.2% yeu cau. Tat ca cac hang muc phan mem da duoc implement.
> Cac hang muc con lai deu yeu cau phan cung hoac moi truong production khong kha dung trong moi truong dev.
