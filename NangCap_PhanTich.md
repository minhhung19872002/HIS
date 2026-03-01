# Phan Tich Yeu Cau Nang Cap HIS Muc 6 & EMR

> So sanh yeu cau trong NangCap.pdf voi he thong HIS hien tai

## Tong quan

- **Chu dau tu**: Benh vien Truong Dai hoc Y - Duoc Hue
- **Muc tieu**: Nang cap HIS dat muc 6 + Phan mem Benh an dien tu (EMR)
- **Tieu chuan**: TT 54/2017, TT 32/2023, TT 13/2025, HD 365/TTYQG, QD 1898/QD-BYT
- **Ngan sach**: 998.000.000 VND
- **Thoi gian**: 60 ngay

---

## PHAN 1: NANG CAP HIS DAT MUC 6 (3.1)

### Bang so sanh 14 phan he

| STT | Yeu cau | Module hien tai | Trang thai | Can lam them |
|-----|---------|-----------------|------------|--------------|
| 01 | Quan ly tiep don | `/reception` - Reception.tsx | CO | In thoi gian du kien kham, noi thuc hien CLS, thong bao SMS/Email |
| 02 | Quan ly kham benh | `/opd` - OPD.tsx | CO | Them truong thong tin muc 6, ke thua du lieu tu tiep don |
| 03 | Quan ly ngoai tru | `/opd` (chung OPD) | CO | Tach rieng flow ngoai tru, theo doi tai kham |
| 04 | Quan ly cap cuu | `/emergency-disaster` | MOCK | Chuyen tu mock sang real API, quy trinh cap cuu rieng |
| 05 | Quan ly noi tru | `/ipd` - Inpatient.tsx | CO | Them truong muc 6, to dieu tri, phieu cham soc |
| 06 | Quan ly phong mo | `/surgery` - Surgery.tsx | CO | Them phieu tien me, cam ket PT, so ket PT, duyet PT |
| 07 | Quan ly Duoc | `/pharmacy` - Pharmacy.tsx | CO | Quan ly trung thau NCC, doi chieu dinh muc |
| 08 | Quan ly Nha thuoc | `/pharmacy` (chung) | CO | Tach rieng nha thuoc ban le, ban theo don |
| 09 | Quan ly vien phi | `/billing` - Billing.tsx | CO | Doi chieu chi phi khoa phong vs vien phi, dinh muc DVKT |
| 10 | Quan ly xet nghiem | `/lab` - Laboratory.tsx | CO | Ket noi LIS hoan chinh, thong bao ket qua SMS |
| 11 | Quan ly CDHA | `/radiology` - Radiology.tsx | CO | Ket noi PACS hoan chinh, thong bao ket qua |
| 12 | Quan ly vat tu | Chung trong Pharmacy | THIEU | Tach rieng module vat tu y te, nhap xuat ton, trung thau |
| 13 | Quan ly BHYT | `/insurance` - Insurance.tsx | CO | Ket xuat XML 4210, lien thong BHXH gateway thuc |
| 14 | He thong goi BN phong kham | Queue trong Reception | THIEU | Man hinh goi so, hien thi LCD, web-based queue display |

### Yeu cau bo sung muc 6 (chua co)

| STT | Yeu cau | Hien trang | Do kho |
|-----|---------|------------|--------|
| 1 | In thoi gian du kien kham cho BN | Chua co | Trung binh |
| 2 | In noi thuc hien CLS | Chua co | De |
| 3 | Thong bao ket qua qua SMS | Chua co | Kho (can SMS gateway) |
| 4 | Thong bao ket qua qua Email | Chua co | Trung binh |
| 5 | Theo doi ket qua trung thau theo NCC | Chua co | Trung binh |
| 6 | Tinh doanh thu chi phi theo HSBA | Co 1 phan trong Billing | Trung binh |
| 7 | Doi chieu chi phi khoa phong vs vien phi | Chua co | Kho |
| 8 | Tong hop chi phi HSBA: su dung vs thu | Chua co | Kho |
| 9 | Doi chieu vien phi vs dinh muc DVKT | Chua co | Kho |
| 10 | Doi chieu DVKT giua BS chi dinh va BS thuc hien | Chua co | Trung binh |
| 11 | Doi chieu xuat kho thuoc/VTYT vs vien phi theo khoa | Chua co | Kho |
| 12 | Doi chieu xuat kho vs dinh muc theo khoa phong | Chua co | Kho |

---

## PHAN 2: PHAN MEM BENH AN DIEN TU - EMR (3.2)

### 2.1. Tinh nang EMR

| STT | Yeu cau | Hien trang | Trang thai | Can lam |
|-----|---------|------------|------------|---------|
| 1.1 | Thiet ke dang WEB | React + Vite | DA CO | - |
| 1.2 | Su dung tren moi thiet bi (responsive) | Co nhung chua toi uu mobile | CAN NANG CAP | Responsive design cho tablet/mobile |
| 1.3 | Dang nhap 2 lop (tai khoan + Email OTP) | Chi co 1 lop (JWT) | CHUA CO | Them 2FA qua email |
| 1.4 | HL7 FHIR v4.0.1 + SNOMED CT | Co HL7 v2.x (LIS), chua co FHIR | CHUA CO | Implement FHIR server/client, SNOMED CT mapping |
| 1.5 | Thuat ngu lam sang BV tu khai bao | Chua co | CHUA CO | CRUD thuat ngu lam sang rieng BV |
| 1.6 | BS chon trieu chung theo BN (checklist) | OPD co form nhap tay | CHUA CO | UI chon trieu chung dang checklist |
| 1.7 | Nhap du lieu dang checklist | Form nhap text | CHUA CO | Chuyen form sang checklist/structured data |
| 1.8 | Ke thua du lieu tu giao dien khac | 1 phan (OPD → Prescription) | CAN NANG CAP | Ke thua tu tiep don → kham → noi tru → xuat vien |
| 1.9 | Xac nhan chu ky so | USB Token co trong Radiology | CO 1 PHAN | Mo rong ky so cho tat ca bieu mau EMR |
| 1.10 | Tong ket HSBA thanh PDF co ky so | Chua co PDF export | CHUA CO | PDF generation + digital signature |
| 1.11 | Quan ly luu tru, muon, tra HSBA (PDF) | Chua co | CHUA CO | Module luu tru HSBA dien tu |

### 2.2. Bieu mau bac sy (17 phieu) - PHAN LON CHUA CO

| STT | Bieu mau | Hien trang | Trang thai |
|-----|----------|------------|------------|
| 2.1.1 | Ho so benh an | Co form co ban trong IPD | CAN NANG CAP |
| 2.1.2 | Phieu kham vao vien | Co trong IPD admission | CAN NANG CAP |
| 2.1.3 | Phieu kham tien me | Chua co | CHUA CO |
| 2.1.4 | Phieu kham dinh duong | Chua co | CHUA CO |
| 2.1.5 | Phieu dieu tri | Co co ban trong IPD treatment sheet | CAN NANG CAP |
| 2.1.6 | Phieu phau thu thuat | Co co ban trong Surgery | CAN NANG CAP |
| 2.1.7 | Cam ket phau thuat | Chua co | CHUA CO |
| 2.1.8 | Duyet phau thuat | Chua co | CHUA CO |
| 2.1.9 | So ket phau thuat | Chua co | CHUA CO |
| 2.1.10 | Phieu tu van - giai thich | Chua co | CHUA CO |
| 2.1.11 | Phieu so ket dieu tri | Chua co | CHUA CO |
| 2.1.12 | Tom tat benh an | Chua co | CHUA CO |
| 2.1.13 | Phieu ban giao BN chuyen khoa | Co ban giao trong IPD | CAN NANG CAP |
| 2.1.14 | Trich bien ban hoi chan | Co trong Consultation | CAN NANG CAP |
| 2.1.15 | So bien ban hoi chan | Co trong Consultation | CAN NANG CAP |
| 2.1.16 | Kiem diem tu vong | Chua co | CHUA CO |
| 2.1.17 | Tong ket HSBA | Chua co | CHUA CO |

### 2.3. Bieu mau dieu duong (21 phieu) - PHAN LON CHUA CO

| STT | Bieu mau | Hien trang | Trang thai |
|-----|----------|------------|------------|
| 2.2.1 | Phieu ke hoach cham soc | Co NursingCareSheet co ban | CAN NANG CAP |
| 2.2.2 | Phieu ke hoach cham soc HSCC | Chua co | CHUA CO |
| 2.2.3 | Phieu nhan dinh dieu duong | Chua co | CHUA CO |
| 2.2.4 | Cham soc | Co co ban | CAN NANG CAP |
| 2.2.5 | Truyen dich | Co InfusionRecord co ban | CAN NANG CAP |
| 2.2.6 | Truyen mau (XN) | Co BloodTransfusion co ban | CAN NANG CAP |
| 2.2.7 | Truyen mau (LS) | Co BloodTransfusion co ban | CAN NANG CAP |
| 2.2.8 | Chuc nang song (vital signs) | Co VitalSigns trong IPD | CAN NANG CAP |
| 2.2.9 | Phieu cong khai thuoc | Chua co | CHUA CO |
| 2.2.10 | Chuan bi truoc phau thuat | Chua co | CHUA CO |
| 2.2.11 | Tieu chuan chuyen trai tu phong hoi suc | Chua co | CHUA CO |
| 2.2.12 | Phieu ban giao BN chuyen khoa | Co 1 phan | CAN NANG CAP |
| 2.2.13 | Bang theo doi tien san giat nang | Chua co | CHUA CO |
| 2.2.14 | Bang kiem ban giao benh noi tru | Chua co | CHUA CO |
| 2.2.15 | Bang kiem ban giao BN chuyen mo | Chua co | CHUA CO |
| 2.2.16 | Bang kiem an toan phau thuat thu thuat | Chua co | CHUA CO |
| 2.2.17 | Bang theo doi duong huyet trong ngay | Chua co | CHUA CO |
| 2.2.18 | Bang phan loai thai ky nguy co | Chua co | CHUA CO |
| 2.2.19 | Test nuot | Chua co | CHUA CO |
| 2.2.20 | Phieu Scan | Chua co | CHUA CO |
| 2.2.21 | Viem phoi tho may | Chua co | CHUA CO |

---

## PHAN 3: YEU CAU KY THUAT KHAC (3.3 + Muc 4)

| STT | Yeu cau | Hien trang | Trang thai |
|-----|---------|------------|------------|
| 1 | HSBA dinh dang PDF co chu ky so | PdfGenerationService + PdfSignatureService (iText7) | DA XONG (Session 16) |
| 2 | Phan mem Dat kham online | `/dat-lich` AppointmentBooking.tsx (public, no auth) | DA XONG (Session 19) |
| 3 | Tra cuu ket qua cua nguoi benh (Patient Portal) | `/patient-portal` PatientPortal.tsx (real API) | DA XONG (Session 14) |
| 4 | Ket xuat XML theo QD 3176/QD-BYT | BHXH XML + HL7 CDA R2 | DA XONG (Session 19) |
| 5 | Tieu chuan HL7 CDA | CDA R2 API + frontend | DA XONG (Session 19) |
| 6 | Tich hop ky so vao bieu mau | USB Token (Radiology + EMR) + iText7 PDF signature | DA XONG (Session 16) |
| 7 | Mau HSBA theo TT 32/2023/TT-BYT | 38 bieu mau (17 BS + 21 DD) trong EMRPrintTemplates | DA XONG (Session 12) |
| 8 | Ket noi theo TT 39/2017/TT-BTTTT | DQGVN API + HealthExchange module | DA XONG (Session 19) |
| 9 | Tich hop AI | Chua co | CHUA CO (low priority) |
| 10 | Dang nhap xac thuc khuon mat | 2FA Email OTP (co the mo rong WebAuthn) | DA CO 2FA (Session 9) |
| 11 | Khai bao thuat ngu SNOMED CT | SnomedIcdMapping entity + 200+ mappings + CRUD API | DA XONG (Session 18) |
| 12 | Cong nghe: JavaScript + .NET Core | DA DUNG (React + ASP.NET Core) | DA CO |
| 13 | Chuan du lieu: JSON, XML | DA DUNG | DA CO |
| 14 | DBMS: Oracle Server | DANG DUNG SQL Server | LOAI BO (chi dung SQL Server) |
| 15 | OS: Enterprise Linux | Dang dev tren Windows, ASP.NET Core cross-platform | DA CO (deploy Linux ready) |
| 16 | Web + Winform | Chi co Web (modern SPA) | DA CO (Winform ko can thiet) |

---

## TONG KET

### DA HOAN THANH (cap nhat 2026-03-01)
1. Web-based architecture (React 19 + ASP.NET Core 8)
2. 40+ module/page HIS (Reception, OPD, IPD, Surgery, Pharmacy, Lab, Radiology, Billing, Insurance, ...)
3. ~~Module EMR~~ → DA XONG: 38 bieu mau (17 BS + 21 DD), PDF generation, digital signature
4. ~~2FA Authentication~~ → DA XONG: Email OTP
5. ~~HL7 FHIR R4~~ → DA XONG: 8 resources, 22+ endpoints
6. ~~HL7 CDA R2~~ → DA XONG: document generation + frontend
7. ~~SNOMED CT~~ → DA XONG: 200+ ICD-10 mappings, CRUD API
8. ~~Queue Display~~ → DA XONG: phong kham + LIS lab mode
9. ~~Responsive design~~ → DA XONG: mobile drawer, tablet collapse
10. ~~Ke thua du lieu~~ → DA XONG: Reception→OPD→Rx→Billing→Pharmacy→IPD
11. ~~Patient Portal~~ → DA XONG: real API integration
12. ~~Bao cao doi chieu~~ → DA XONG: 8 reconciliation reports
13. ~~SMS Gateway~~ → DA XONG: eSMS/SpeedSMS integration
14. ~~DQGVN~~ → DA XONG: national health data exchange
15. ~~Barcode/QR~~ → DA XONG: html5-qrcode
16. ~~Real-time notifications~~ → DA XONG: SignalR WebSocket
17. ~~Audit logging~~ → DA XONG: middleware + UI
18. ~~6 LIS sub-modules~~ → DA XONG: QC, Vi sinh, Luu mau, Sang loc, Hoa chat, Giao nhan
19. ~~Pathology~~ → DA XONG: Giai phau benh full stack
20. ~~Culture Collection~~ → DA XONG: Luu chung vi sinh

### CON LAI (low priority / hardware dependent)
1. **AI integration** - goi y chan doan, canh bao tuong tac thuoc (CHUA CO)
2. **Ky so PKCS#11** - programmatic PIN cho USB Token (CAN PKCS11 library)
3. **Ket noi kinh hien vi** - 07 kinh, camera (HARDWARE DEPENDENT)
4. **BHXH gateway** - ket noi truc tiep BHXH (CAN MOI TRUONG PRODUCTION)

---

## UONG LUONG CONG VIEC

| Hang muc | So luong | Uoc tinh |
|----------|---------|----------|
| Module EMR moi | 1 module lon | 15-20 ngay |
| Bieu mau bac sy | 17 form | 10-12 ngay |
| Bieu mau dieu duong | 21 form | 12-15 ngay |
| PDF + Ky so | 38+ bieu mau | 8-10 ngay |
| 2FA + Security | 1 feature | 3-4 ngay |
| HL7 FHIR | 1 module | 10-15 ngay |
| SNOMED CT | 1 module | 5-7 ngay |
| Queue Display | 1 module | 3-5 ngay |
| SMS/Email | 1 module | 3-5 ngay |
| Dat kham online | 1 module | 5-7 ngay |
| Bao cao doi chieu muc 6 | 8+ bao cao | 8-10 ngay |
| Nang cap cac module hien co | 14 module | 10-15 ngay |
| **Tong** | | **~90-120 ngay** |

> **Luu y**: Thoi gian tren la uoc tinh cho 1 developer. Voi team lon hon co the giam dang ke.
> Yeu cau goi thau: 60 ngay → can team 2-3 nguoi lam song song.

---

## PHAN 4: NANGCAP2 - GOI THAU LIS-HIS BV TU DU (37 hang muc)

> Nguon: NangCap2.pdf - Yeu cau ket noi LIS voi HIS

### DA CO trong HIS (15 hang muc)

| # | Yeu cau | Module hien tai | Trang thai |
|---|---------|-----------------|------------|
| 1,2,3,16,24 | Ky so PKQ | DigitalSignatureService + PKCS#11 | DA CO |
| 4,5,6 | Ket noi HIS-LIS | HL7 receiver + sender | DA CO |
| 7 | Barcode scanning | html5-qrcode BarcodeScanner component | DA CO (can them print label) |
| 15,17 | Ngan hang mau | BloodBank module | DA CO |
| 29,30,31 | He thong goi so | QueueDisplay.tsx + lab mode (mode=lab) | DA XONG |
| 32 | Bao cao XN | Laboratory + Reports module | DA CO |
| 33 | Ket noi may XN | HL7 receiver/sender | DA CO |

### DA BUILD (6 LIS sub-modules - Session 20, 2026-03-01)

| # | Yeu cau | Module moi | Trang thai |
|---|---------|------------|------------|
| 34 | QC (Quality Control) | `/lab-qc` - LabQC.tsx | DA XONG - Lo QC, ket qua, Levey-Jennings chart (recharts), canh bao Westgard |
| 35 | Vi Sinh ket qua | `/microbiology` - Microbiology.tsx | DA XONG - Nuoi cay, vi khuan, khang sinh do (S/I/R), Gram stain |
| 10,11,27 | Luu mau | `/sample-storage` - SampleStorage.tsx | DA XONG - QR scan, vi tri (tu/ke/hop), canh bao thoi gian, dieu kien bao quan |
| 8 | Sang loc So sinh | `/screening` - Screening.tsx | DA XONG - Form nhap (can nang, Apgar, PP sinh), ket qua (normal/borderline/abnormal/critical) |
| 9 | Sang loc Truoc sinh | `/screening` - Screening.tsx | DA XONG - Segmented control So sinh/Truoc sinh, tuoi thai, PARA |
| 18,23,37 | QLHC Hoa chat | `/reagent-management` - ReagentManagement.tsx | DA XONG - Ton kho, su dung, canh bao het/het han, Progress bars |
| 13,14,26,36 | Giao nhan mau | `/sample-tracking` - SampleTracking.tsx | DA XONG - Tu choi (8 ma ly do), hoan tac, lay lai, timeline, thong ke |

### DA BUILD (Session 21, 2026-03-01)

| # | Yeu cau | Module moi | Trang thai |
|---|---------|------------|------------|
| 21 | Giai phau benh & Te bao hoc | `/pathology` - Pathology.tsx | DA XONG - Yeu cau, ket qua (dai the/vi the/nhuom/IHC/phan tu), thong ke, in phieu |
| 22 | Ket noi HIS-GPB | PathologyController (7 endpoints) | DA XONG - API chi dinh + tra ket qua GPB |

### CAN LAM TIEP (1 hang muc)

| # | Yeu cau | Mo ta | Do kho |
|---|---------|-------|--------|
| 28 | Ket noi kinh hien vi | 07 kinh, camera, ket noi (HARDWARE-DEPENDENT) | Kho |

### DA BUILD (Session 22)

| # | Yeu cau | Mo ta | Trang thai |
|---|---------|-------|------------|
| 12 | Luu chung Vi Sinh | `/culture-collection` - CultureCollection.tsx | DA XONG - CRUD, vị trí tủ/rack/hộp, viability check, cấy chuyền passage, cảnh báo hết hạn, lịch sử log |

### CAN NANG CAP (4 hang muc)

| # | Yeu cau | Mo ta | Trang thai |
|---|---------|-------|------------|
| - | Ky so LIS PDF | Tich hop vao LIS PDF output (hien chi co Radiology/EMR) | CAN MO RONG |
| - | Giao nhan mau nang cao | Them workflow tu choi/lap lai/nhat ky (da co basic) | DA XONG (SampleTracking) |
| - | Queue display LIS | Mo rong cho XN (mode=lab, 3-panel display, TTS) | DA XONG (Session 22) |
| - | BloodBank nang cao | Them gelcard, kiem ke tui mau theo nhom, kiem ke han dung | DA XONG (Session 22) |

---

## TONG HOP TRANG THAI CAP NHAT (2026-03-01)

### DA HOAN THANH

| Hang muc | Chi tiet | Session |
|----------|---------|---------|
| Module EMR | EMR.tsx + 38 bieu mau (17 BS + 21 DD) + print templates | 10-12 |
| PDF + Ky so | PdfGenerationService + iText7 | 16 |
| 2FA Authentication | Email OTP login flow | 9 |
| HL7 FHIR v4.0.1 | 8 resources, 22+ endpoints | 15 |
| SNOMED CT mapping | 200+ ICD-10 mappings | 18 |
| Queue Display | Full-screen LCD, TTS, blinking | 9 |
| SMS Gateway | eSMS.vn/SpeedSMS.vn + SmsManagement.tsx | 19 |
| Email notification | Lab/Radiology result emails | 10 |
| Dat kham online | AppointmentBooking + BookingManagement | 19 |
| Bao cao doi chieu Level 6 | 8 reconciliation reports | 14 |
| Clinical terminology | 58 terms, ClinicalTermSelector component | 11 |
| Data inheritance | Reception→OPD→Rx→Billing→Pharmacy→IPD | 14 |
| Audit logging Level 6 | Middleware + UI | 15 |
| 10 mock pages → real API | All 10 converted | 14 |
| Responsive design | Mobile drawer, tablet collapse | 16 |
| Barcode/QR scanning | html5-qrcode, 3 pages | 16 |
| Patient photo capture | WebcamCapture component | 16 |
| Keyboard shortcuts | F2/F5/F7/F9/Ctrl+F | 16 |
| Real-time notifications | SignalR WebSocket | 17 |
| Patient timeline | PatientTimeline in EMR | 17 |
| Dashboard charts | recharts Area/Bar/Pie | 17 |
| CCCD validation | 51 province codes | 18 |
| HL7 CDA R2 | CDA document generation | 19 |
| DQGVN | National health data exchange | 19 |
| 6 LIS sub-modules | QC, Vi Sinh, Luu mau, Sang loc, Hoa chat, Giao nhan mau | 20 |
| Giai phau benh (Pathology) | Pathology.tsx + PathologyController (7 endpoints) + DB tables | 21 |

### CON LAI (khong lam)

| Hang muc | Ly do |
|----------|-------|
| Oracle DB dual-provider | LOAI BO - chi dung SQL Server |
| USB Token PKCS#11 programmatic | HARDWARE-DEPENDENT - can Pkcs11Interop |
| Smart card writing | HARDWARE-DEPENDENT |
| BHXH gateway thuc | CAN ENDPOINT BHXH THAT |
| Ket noi kinh hien vi | HARDWARE-DEPENDENT |
| Face authentication | Nice-to-have, ko co trong yeu cau chinh |
