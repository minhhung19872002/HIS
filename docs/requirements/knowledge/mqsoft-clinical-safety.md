# MQSoft Clinical Safety Rules — Must-Implement for Production HIS

These are real-world clinical safety features visible in MQSoft's UI screenshots. A production Vietnamese HIS MUST have these to prevent medical errors and comply with BYT/BHXH regulations.

---

## 1. Drug Allergy Warning (Cảnh báo dị ứng thuốc)
- **Trigger:** When doctor prescribes a drug that patient has known allergy to
- **UI:** Popup dialog: "Bệnh nhân dị ứng thuốc - Có đồng ý lệnh không?" with Yes/No
- **Data source:** Patient allergy history stored in medical record (field Thuốc dị ứng accessible via F-key in OPD)
- **Scope:** OPD prescription, Inpatient Y lệnh, Emergency

## 2. Drug Interaction Database (Tương tác thuốc)
- **Standard:** QĐ 5948/QĐ-BYT dated 30/11/2021
- **Severity levels:** 1 (nhẹ), 2 (trung bình), 3 (nặng)
- **Example:** Captopril + Valsartan/Amlodipin = Level 3 (nặng), mechanism: "Tăng tích luỹ bradykinin tăng nguy cơ phù mạch"
- **UI:** Warning popup with drug pair, severity, mechanism, BYT reference
- **Database:** ~25+ common interactions visible in screenshot, likely hundreds in full DB

## 3. BHYT CLS Daily Limit (Giới hạn CLS BHYT/ngày)
- **Rule:** Cannot order BHYT-covered CLS exceeding daily limit per patient
- **UI:** Block/warning when attempting to exceed
- **Scope:** OPD and Inpatient CLS ordering

## 4. Blood Type Mismatch Warning (Cảnh báo nhóm máu)
- **Trigger:** When ordering blood transfusion with type different from patient's recorded blood type
- **UI:** Popup: "Khác nhóm máu người bệnh - Có muốn y lệnh không?"
- **Scope:** Blood product ordering (module Ngân hàng máu + Inpatient)

## 5. ICD-BHYT Protocol Compliance (Tuân thủ phác đồ)
- **Module 27 dedicated:** Database of treatment protocols mapped to ICD codes
- **Rule:** BHYT-covered drugs must match approved protocol for the diagnosed ICD
- **UI warning:** "Nhóm hoạt chất sau không có trong phác đồ điều trị ICD10: [drug name]"
- **Enforcement:** Configurable — warn vs block

## 6. Real-time Patient Debt Check (Kiểm tra công nợ)
- **Location:** Inpatient department level
- **UI:** Quick popup showing: Chi phí (total cost), Tạm ứng (deposits), Thiếu (shortage)
- **Purpose:** Prevent over-spending before advance payment

## 7. Previous Prescription Alert (Cảnh báo toa thuốc cũ)
- **Trigger:** At registration, system checks if patient has unfilled prescriptions from previous visits
- **UI:** Alert shown to reception staff

## 8. Drug Duplicate Check (Kiểm tra trùng thuốc)
- **Feature listed** in OPD 9 functions
- **Purpose:** Prevent prescribing same drug from multiple sources

## 9. BHYT Card Validation (Kiểm tra thẻ BHYT)
- **Online check:** Real-time validation against BHXH portal
- **Highlights:** Old vs new card differences
- **QR scan:** BHYT card QR code at registration

## 10. Cost Estimation Before Proceeding (Ước tính chi phí)
- **Location:** Reception, before patient goes to clinic
- **UI:** Detailed cost breakdown showing BHYT co-pay amounts per service
- **Purpose:** Patient informed consent on costs

## 11. XML Validation Before BHXH Submission (Ruler kiểm tra XML)
- **Module 26 dedicated:** Web-based tool
- **Purpose:** Validate all BHXH claim data before electronic submission
- **Output:** Error list with descriptions, exportable
