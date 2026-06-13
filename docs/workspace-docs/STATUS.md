# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **TASK/PLAN quản lý trên GitHub Issues** (repo `minhhung19872002/HIS`): `gh issue list`.
> File này CHỈ giữ **session-state** cho hook — KHÔNG ghi backlog/plan/lịch sử dài vào đây.

> Cập nhật cuối: **2026-06-13 sáng** (phiên Claude máy C: — chiến dịch "cày hết Issues").

## Đang ở đâu
- **Fix phát thuốc ngoại trú trừ kho (`de9b05c`, PUSHED+DEPLOYED+VERIFY PROD)**: test e2e prod
  (`prod-e2e-flow-test-2026-06-13.md`) bắt nhánh fallback `CompleteDispensing` (đơn NULL-kho) chỉ flip
  status mà KHÔNG tạo phiếu xuất / KHÔNG trừ kho → thất thoát kho + cancel-dispensed 400. Fix: luôn đi
  qua `DispenseOutpatientPrescriptionAsync` (resolve kho lẻ WarehouseType=2 nếu đơn chưa gán; không có →
  400) + cancel legacy-fallback. Smoke local 9/9 (trừ đúng 15, hoàn đúng). **Verify prod SEED005
  `39722354`: cancel(legacy 400→200) → dispense(200) → cancel(200) — 3/3 PASS**, bản ghi về cancelled sạch.
  ⚠️ **Còn 31 bản ghi legacy cùng lỗi trên prod (24 SEED 0-item + 7 DT có-item)** — toàn test data, stock
  chưa từng bị trừ (không thất thoát thật); CHỜ user duyệt có reset về accepted không (không tự bulk-mutate).

- **Đợt 24 đóng trọn**: 3 P0 + 15 endpoint deploy + re-probe prod 17/17 PASS; thêm fix nối tiếp:
  reception payment/deposit **404 khi HSBA không tồn tại** (`1d511ed`, verify prod 404 ✓), phiếu mồ côi
  `PT202606130001` đã xóa prod (guard kép).
- **Chiến dịch Issues (user: "làm hết tất cả task trong Issues")** — đã xử lý **22/29** (19 closed):
  - **#13 ✅** per-parameter KQ XN (`b448306`): plan phát hiện hạ tầng ĐÃ CÓ từ mig 87 (bảng params +
    3 writer dual-write + FHIR + DQGVN) → chỉ làm 4 gap đọc/hiển thị: reader API trả parameters[] ·
    Laboratory v2 drawer tô màu flag · print thêm cột Cờ · DQGVN verify OK. Smoke local 3 params
    N/L/H đúng. **Deploy đang chạy — cần verify prod sau deploy.**
  - **#19 plan posted** (module HrDecision ĐÃ CÓ MVP — plan mở rộng 22 loại QĐ + người ký + print +
    01A-TS; 4 câu hỏi chờ user trong issue) · **#20 plan posted** (PNG proxy PACS đã có, gap = mobile
    viewer nhẹ + gallery + print helper; 3 câu hỏi chờ user) · **#17 scoped 5 batch** (phiên riêng).
  - **#29 ✅** wave-ui-all.spec.ts 5 PASS + 1 skip-có-log, suite cũ 9/9 (agent test) · **#30 ✅** 10/11 mục
    (mục 7 EMR template UI vừa làm: OpdEditor áp mẫu/lưu mẫu/quản lý — reuse /clinical-narratives; mục 11
    → #20) · **#31 ✅** audit crud25 re-run prod SẠCH 0 fail thật (3 false-fail là bug spec đã fix: regex
    "Làm mới", closeOverlay backdrop, navigate-as-create; 404 pttt-mapping là contract chủ đích) — commit
    `8202090`.
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
1. Verify prod sau deploy `b448306` (per-parameter lab): GET LISComplete order detail có parameters[].
2. Còn mở 9 issue: **#5 #6 #23** chờ user chốt scope · **#24 #25** blocked credential ·
   **#22** blocked máy XN · **#17** làm theo 5 batch đã ghi trong issue (phiên riêng) ·
   **#19 #20** implement theo plan đã đăng sau khi user trả lời open questions.
3. **LUÔN fetch + git log origin + gh issue list trước khi pick** (máy D làm song song).
