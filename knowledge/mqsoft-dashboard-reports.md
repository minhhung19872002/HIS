# MQSoft Dashboard & Reporting — From Web Dashboard Screenshots

The quality dashboard metrics and reporting structure represent what hospital leadership actually uses for management decisions. The 54+ BYT reports are regulatory requirements.

---

## Quality Dashboard (Module 41 — Web-based)

### Dashboard 1: Số lượng BN khám bệnh (Patient Flow)
- KPI cards: Đăng ký (426), Chưa khám (141), Đang làm CLS (71), Có kết quả CLS (121), Khám xong (93), BHYT (355), Dịch vụ (71)
- Table: Breakdown by clinic room (Phòng Khám Da Liễu 2, Nội 3, Tạo Hình Thẩm Mỹ, etc.) with counts per status
- Pie chart: BHYT 83% vs Dịch vụ 17%
- Time series: Patient volume trend

### Dashboard 2: Thời gian chờ khám (Wait Time)
- Table by visit type: KHAM, KHAM+TDCN, KHAM+XN, KHAM+XN+CDHA, KHAM+XN+TDCN
- Columns: Số lượt, Thời gian tối thiểu, Thời gian tối đa, Thời gian trung bình
- Example: KHAM+XN = 63 visits, min 4min, max 61min, avg 23min
- Bar chart: min/max/avg per visit type
- Pie chart: Distribution (tối đa 47.99%, trung bình 32.97%, tối thiểu 19.04%)

### Dashboard 3: Chi phí xét nghiệm (Lab Cost)
- Table by test type: Di truyền học, Giải phẫu bệnh, Hóa sinh (1,040 BHYT + 478 DV), Huyết học (356 BHYT + 94 DV), Vi sinh (62 BHYT + 143 DV)
- Columns by payment type: BHYT, Dịch vụ, Miễn, Tiền chùng, Hao phí, Thu phí, Bảo lãnh viện phí, Khám sức khỏe, Dịch vụ sao, Từ thiện
- Pie chart: BHYT 64.35% vs Dịch vụ 32.53% vs Thu phí 3.12%
- Bar chart: Cost by test type and payment source

### Dashboard 4: Cận lâm sàng (CLS)
- Detailed breakdown by service type: Siêu âm, X-Quang, Nội soi, etc.
- Same multi-column payment type analysis
- Department-level statistics

---

## Hospital Quality Management (Module 22 — Desktop)

### Department Statistics Table
- Rows: Nội, Ngoại, Tim mạch, Gây mê hồi sức, Sản, Nhi, Liên chuyên khoa, Khoa Khám bệnh (with room breakdown)
- Columns: Bệnh cũ, Nhập viện, Chuyển viện VĐN, Chuyển viện TYC, Tử vong, Tạm viện, Theo dõi, Biến chứng

---

## Report System (Module 25) — 54+ Templates

### Báo cáo viện phí (Billing — 14+ reports)
- Revenue reports by department, service type, payment type
- Doanh thu hoạt động BV (Hospital operation revenue)
- Doanh thu thực hiện chỉ lệnh (Order execution revenue)

### Báo cáo khám bệnh (Examination — 14+ reports)
- Patient volume by period, department, diagnosis
- Visit type distribution

### Báo cáo dược (Pharmacy — 18+ reports)
- Nhập xuất tồn (Stock movement)
- Tình hình xuất thuốc khoa dược (Drug dispensing by pharmacy)
- Supplier analysis
- BHYT drug usage
- Narcotics tracking
- Drug bidding reports

### Báo cáo CĐHA/Xét nghiệm (Radiology/Lab — 10+ reports)
- PTTT statistics
- Patient volume by modality
- Nhập liệu (Data entry)
- Nhiễm khuẩn (Infection)

### Báo cáo quyết toán BHXH (Insurance Settlement)
- Mẫu 79, 80 HĐ (Settlement forms)
- Mẫu 19, 20, 21 (Reporting forms)
- Quyết toán BN Ngân sách (Budget patient settlement)
- Nhập liệu ErrsRules (Error rules data entry)

### Báo cáo KSK đoàn (Group Health Check — 11 reports)
- Various group health check analysis reports

---

## Pharmacy-Specific Reports (from screenshot tree)

Deep tree structure with 18+ sub-reports:
- Báo cáo tổng hợp (Summary)
- Stock movement reports
- Supplier analysis
- BHYT drug usage tracking
- Narcotic substance tracking
- Drug bidding/procurement reports
- Consignment tracking
- Expiry monitoring

---

## Medical Incident Dashboard (Module 39 — Web)

- Trang chủ (Homepage) with 4 widgets:
  1. Thông báo (Notifications) — meeting invitations, event notices
  2. Tổng số sự cố (Total incidents) — Pie chart: Bắt buộc vs Tự nguyện
  3. WHO - Thông tin An toàn người bệnh (WHO Patient Safety bulletins)
  4. Bản tin An toàn y tế (Safety newsletters) — numbered issues by date

---

## Client List (Deployed Hospitals)

**Private:** PK 115, BV ĐH Buôn Mê Thuột, BV ĐH Y Tân Tạo, BV Quốc Tế Đột Quỵ S.I.S Cần Thơ, PK Minh Tâm, PK Đại Phước, PK Saigon Healthcare

**Public:** BV Truyền máu-Huyết học, BV Nhân Dân 115, BV TP Thủ Đức, BV Quận 7, BV An Bình, BV Quận Tân Bình, BV ĐH Y Dược CS2, BV Huyện Củ Chi, BV Huyện Nhà Bè, BV TX Buôn Hồ Đắk Lắk, TTYT Buôn Đôn, TTYT Ea Kar, TT CSSKSS Bình Dương, TTYT Võ Nhai Thái Nguyên
