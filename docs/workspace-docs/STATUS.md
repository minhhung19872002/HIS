# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **TASK/PLAN quản lý trên GitHub Issues** (repo `minhhung19872002/HIS`): `gh issue list`.
> File này CHỈ giữ **session-state** cho hook — KHÔNG ghi backlog/plan/lịch sử dài vào đây.

> Cập nhật cuối: **2026-06-13 sáng** (phiên Claude máy C: — chiến dịch "cày hết Issues").

## Đang ở đâu
- **Đợt 24 đóng trọn**: 3 P0 + 15 endpoint deploy + re-probe prod 17/17 PASS; thêm fix nối tiếp:
  reception payment/deposit **404 khi HSBA không tồn tại** (`1d511ed`, verify prod 404 ✓), phiếu mồ côi
  `PT202606130001` đã xóa prod (guard kép).
- **Chiến dịch Issues (user: "làm hết tất cả task trong Issues")** — đã xử lý **16/29**:
  - Làm mới: **#4** nutrition persist (DietOrders reuse, `c3bab0a`) · **#26** schema-drift so CỘT EF model
    + mig 100 vá 4 cột drift thật (`aac78db`, prod missingCount=0 ✓) · **#27** bật worker nhắc hẹn prod
    (log started ✓) · **#28** popup hạn dùng thêm HospitalPharmacy (`fc1bc06`).
  - Đóng vì đã làm từ trước (verify code + commit evidence): **#3 #7 #8 #9 #10 #11 #12 #15 #16 #18 #21**
    (đa số từ wave flow-final 06/09 — issues tạo từ docs cũ bị stale).
  - **#22** → label blocked (chiều nhận KQ máy XN đã thật qua HL7 TCP; gửi worklist cần máy thật).
  - **#30**: verify 9/11 mục DONE; còn mục 7 (EMR template UI — MISSING) + mục 11 (dồn về #20).
  - **#31 đang chạy**: audit crud25 re-run prod — fix bug spec (regex "Mới" match nhầm nút "Làm mới"
    → false fail); đang chờ kết quả lần 2.
- Backup branch local cũ đã xóa theo lệnh user (`git branch -D backup/local-main-2026-06-13`).

## Blocker / cần user quyết
1. **#24 HDDT**: chờ user chọn NCC (VNPT/Viettel/MISA) + endpoint + credential ENV.
2. **#25 rotate R2**: cần quyền Cloudflare (token/dashboard) — máy không có credential.
3. **#5 ADR / #6 sơ sinh / #23 field LIS-RIS**: cần user chốt scope/danh sách field.
4. **#14 đa cơ sở Tier2+**: user đã chốt WON'T-DO Tier 2/3 (2026-06-11) — đề nghị close not-planned?
5. **#22 LIS analyzer**: blocked chờ máy xét nghiệm thật (driver gửi worklist).

## Việc kế tiếp
1. Đọc kết quả audit crud25 lần 2 → fix route còn fail thật → đóng #31.
2. #29 viết E2E bổ sung · #30 mục 7 EMR template UI · #13 KQ XN per-parameter (plan riêng) ·
   #17 T6 controller mỏng (theo batch) · #19/#20 feature lớn (plan riêng).
3. **LUÔN fetch + git log origin + gh issue list trước khi pick** (máy D làm song song).
