# Test E2E luồng nghiệp vụ CHẠY THẬT trên prod · 2026-06-13

> Khác với sweep (probe validate). Đây là chạy thật: lấy bản ghi đang ở đúng trạng thái trên prod, đẩy qua từng bước, verify lưu DB. Token admin, gọi tuần tự (concurrency thấp — bắn song song nhiều dễ làm kẹt connection pool tab).

## Golden path OPD (1 BN thật: Huỳnh Bảo Linh, phòng Nội tổng quát) — ✅ CHẠY THÔNG
| Bước | Endpoint | KQ | Verify |
|---|---|---|---|
| Bắt đầu khám | POST examination/{id}/start | **200** | exam Chờ khám → đang khám |
| Sinh hiệu | PUT examination/{id}/vital-signs | **200** | BMI auto = 22.04 (lưu) |
| Chẩn đoán | POST examination/{id}/diagnoses (ICD J00) | **200** | tạo diagnosis id thật |
| Tìm dịch vụ | GET examination/services/search | **200** | trả DV thật (Siêu âm tim 250k, ổ bụng 150k…) |
| Chỉ định CLS | POST examination/service-orders (Siêu âm ổ bụng) | **200** | tạo ServiceRequest `eba7fba3` |
| Verify worklist | GET examination/{id}/service-orders | **200** | DV "Chờ thực hiện" hiện trong danh sách |

→ Tiếp đón → khám → sinh hiệu → chẩn đoán → chỉ định CLS **lưu thật + chảy sang worklist CLS/viện phí**. (Thu tiền đã verify riêng đợt trước: 200 + idempotency.)

## Các luồng khác (chạy thật trên seed đúng trạng thái)
| Luồng | Test | KQ |
|---|---|---|
| Dược – phát thuốc | POST pharmacy/prescriptions/{id}/dispense (đơn "accepted" RX…SEED005) | **200 success** ✅ |
| LIS | GET LISComplete/orders/pending (23 order) + GET orders/{id} | **200**, load chi tiết OK |
| RIS | (worklist load qua sweep) | OK |
| Phẫu thuật | GET waiting-lists (3) / schedule | **200** (không có ca đã-lên-lịch để chuyển trạng thái lúc test — thiếu data, không phải lỗi) |
| Nội trú | GET pending-admissions | **200**, count=0 (không có ca chờ nhập lúc test); vital-signs/orders đã validate ở sweep |
| Worklist phòng khám | GET rooms/active (11 phòng) + room/{id}/patients | **200**, BN thật theo phòng |

## ⚠️ Điểm cần verify (không chặn, nhưng nên kiểm)
- **Dược dispense không có "phiếu xuất" để hoàn:** sau khi dispense 200, gọi `cancel-dispensed/{id}` → 400 "Không tìm thấy phiếu xuất cho đơn thuốc này". → Nghi **CompleteDispensing đổi status nhưng KHÔNG tạo phiếu xuất kho / không trừ kho** (hoặc seed005 không gắn tồn kho thật). Claude Code kiểm `DispenseOutpatientPrescriptionAsync` có thực sự ghi WarehouseIssue + trừ tồn cho đơn ngoại trú không; nếu không thì thất thoát kho.
- Data test còn lại: đơn RX…SEED005 giờ ở trạng thái dispensed (không hoàn được do không có phiếu xuất). Exam Huỳnh Bảo Linh đã start + có 1 chỉ định Siêu âm (eba7fba3) — bản ghi test, có thể hủy chỉ định nếu cần.

## VÒNG 2 (2026-06-14, sau fix de9b05c + 1d511ed) — verify + test thêm luồng
**Verify 2 fix đã đạt:**
- Dược dispense trừ kho: dispense 200 → `cancel-dispensed` giờ **200**, trả phiếu hoàn `HT-20260614160445` có `warehouseId` → dispense ĐÃ tạo phiếu xuất + trừ kho (hoàn được). ✅ (đóng nghi vấn vòng 1)
- Reception billing/payment MR giả → **404** "Không tìm thấy hồ sơ bệnh án" ✅ (hết phiếu mồ côi).

**Test thêm (chạy thật):**
| Luồng | Test | KQ |
|---|---|---|
| LIS nhập KQ | POST orders/enter-result (labTestItemId + per-parameter GLU) | **200** ✅ |
| BHYT tạo hồ sơ | POST insurance/claims/create/{examId} | **200**, maLk `BHYT-20260614160627` ✅ |
| BHYT sinh XML | POST insurance/xml/generate/xml1 (month/year + maLkList) | **200**, XML1 data thật (maBn/hoTen/ngaySinh) ✅ |

**Smell nhỏ vòng 2 (không chặn):**
- `xml/generate/xml1` nếu gửi `maLkList` mà THIẾU month/year → 400 "Year, Month, and Day ... un-representable DateTime" (lỗi dựng DateTime(0,0,0)) thay vì message rõ "thiếu kỳ quyết toán". Nên validate trước khi dựng DateTime.
- RIS `orders` (worklist nhập KQ CĐHA) trả rỗng với query status=0 → chỉ định X-Quang vừa tạo ở OPD chưa surface sang RIS worklist (có thể do chưa check-in tại phòng CĐHA — đúng quy trình, KHÔNG hẳn lỗi). Cần 1 ca CĐHA đã tiếp nhận để test nhập KQ; tạm chưa drive được.
- LIS: enter-result trả success nhưng GET orders/{id} detail không echo lại giá trị KQ (KQ đọc qua endpoint khác) — chưa confirm-lưu qua đường này, nhưng enter 200.

## VÒNG 3 (2026-06-14) — xử lý smell còn lại
- **Smell #1 (xml1 validate DateTime) — ĐÃ FIX + DEPLOY + VERIFY PROD 3/3** (`ded43da`). Root-cause: `InsuranceXmlService.GetClaimsForExport`
  luôn dựng `new DateTime(config.Year, config.Month, 1)` khi `FromDate`/`ToDate` null → caller chỉ gửi
  `MaLkList` (Month=0/Year=0) ⇒ `DateTime(0,0,1)` ⇒ ArgumentOutOfRange ⇒ 400 opaque. Fix: thêm guard
  `hasValidPeriod = Year>0 && Month∈[1,12]`, chỉ suy khoảng ngày khi kỳ hợp lệ; nếu không thì lọc theo
  `MaLkList`/`FromDate`/`ToDate`. Fix CENTRAL → áp cho mọi xml type dùng helper. `dotnet build` 0 errors.
  ⚠️ Chờ user duyệt commit + deploy rồi re-test prod (gửi `maLkList` không kèm month/year → kỳ vọng 200).
- **Smell #2 (LIS enter-result echo):** doc đã ghi "KQ đọc qua endpoint khác" — KHÔNG mở rộng scope; per-parameter
  reader (`GET LISComplete/orders/{id}` → `parameters[]`) là đường đọc chuẩn (issue #13, deploy `b448306`).
  Verify payload sống còn treo vì prod hiện không còn order LIS (test data clear).
- **Smell #3 (RIS worklist rỗng):** quy trình — cần 1 ca CĐHA đã tiếp nhận tại phòng để surface; không phải bug.

## Kết luận
Các luồng nghiệp vụ cốt lõi **chạy thật end-to-end + lưu DB**: tiếp đón → khám (sinh hiệu/chẩn đoán) → chỉ định CLS → nhập KQ XN → kê đơn/phát thuốc (trừ kho) → viện phí/thu tiền → BHYT (claim + XML). Không luồng nào gặp lỗi opaque/503. 2 nghi vấn vòng 1 đã đóng. Còn vài smell nhỏ (xml1 validate DateTime, RIS cần ca đã tiếp nhận để test nhập KQ) — không chặn vận hành.

## PROMPT (paste cho Claude Code)
```
Verify nghi vấn từ test E2E prod (docs/workspace-docs/10-assessment/prod-e2e-flow-test-2026-06-13.md):
Dược – phát thuốc ngoại trú: POST pharmacy/prescriptions/{id}/dispense trả 200 nhưng cancel-dispensed báo "Không tìm thấy phiếu xuất". Kiểm CompleteDispensing → DispenseOutpatientPrescriptionAsync (PharmacyController.cs:437 / WarehouseCompleteService issues/dispense-outpatient): có tạo WarehouseIssue + trừ tồn kho FEFO thật cho đơn ngoại trú không? Nếu chỉ đổi status đơn mà không ghi phiếu xuất/không trừ kho → sửa để dispense tạo phiếu xuất + trừ tồn (như đã làm cho nội trú), và cancel-dispensed hoàn được. Viết test chứng minh tồn kho giảm sau dispense.
KHÔNG commit/push tới khi tôi duyệt.
```
