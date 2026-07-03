# E2E các luồng còn lại trên prod · 2026-06-17

> Tiếp tục chạy thật các luồng chưa drive: hoàn tất OPD (kê đơn + complete), RIS nhập KQ, thử nội trú & phẫu thuật. Token admin, gọi tuần tự.

## ✅ Chạy thông (lưu thật)
| Luồng | Bước | KQ |
|---|---|---|
| OPD hoàn tất | POST examination/prescriptions (Paracetamol) | **200** (đơn `1065c70d`) |
| OPD hoàn tất | POST examination/{id}/complete (conclusionType=1 "Cấp đơn cho về") | **200** (lưu kết luận) |
| CĐHA (RIS) | GET orders?fromDate..toDate (50 order) → GET orders/{id} → POST results/enter (đủ field) | **200** (result `093a8c71`, order RAD…SEED005) |

→ OPD giờ trọn vòng: start→sinh hiệu→chẩn đoán→chỉ định CLS→**kê đơn→hoàn tất**. RIS nhập KQ chạy được.

## 🔴 Finding thật (cần fix)
1. **RIS `EnterRadiologyResultDto` over-validate** — nhập KQ CĐHA text-only bị chặn: lần lượt 400 `"The AttachedImages field is required"` → thêm `attachedImages:[]` → 400 `"The TechnicianNote field is required"`. Phải gửi ĐỦ `attachedImages + technicianNote + note + description + conclusion` mới 200. Các field non-nullable (List/string không `?`) bị NRT-validation bắt buộc → KTV nhập KQ chữ (không ảnh) sẽ bị chặn vô lý. **Fix:** cho `AttachedImages`, `TechnicianNote`, `Note` thành optional (`?` + default rỗng), chỉ bắt buộc Description/Conclusion (hoặc theo nghiệp vụ).
2. **RIS `GET /orders` rỗng khi không truyền date** — `GET /api/RISComplete/orders` (không param) → `data:[]`; nhưng `?fromDate=&toDate=` → **50 order**. Worklist CĐHA mặc định không lọc sẽ TRỐNG (caller/màn nào không set ngày sẽ tưởng không có ca). **Fix:** mặc định trả ca hôm nay/đang chờ khi thiếu date, đừng trả rỗng.
3. **Insurance `xml/generate/xml1`** — gửi `maLkList` mà thiếu month/year → 400 `"Year, Month, and Day ... un-representable DateTime"` (lỗi dựng `DateTime(0,0,0)`) thay vì message rõ. **Fix:** validate kỳ quyết toán trước khi dựng DateTime; nếu có maLkList thì không bắt buộc kỳ.

## ⚪ Chưa drive được (THIẾU DATA ở trạng thái cần — KHÔNG phải lỗi endpoint)
- **Nội trú**: `GET inpatient/patients` (cả 3 khoa Nội/Ngoại/Khám) → **0 ca đang điều trị** trên prod → không có admission để drive vitals/order/discharge. Endpoint vital-signs/service-orders/discharge đã validate sạch ở sweep. → cần seed 1 ca nhập viện hoặc E2E test để phủ.
- **Phẫu thuật**: `services/search?keyword=phẫu thuật` rỗng + `schedule` 0 ca → không có dịch vụ PT/ca đã lên lịch để drive `requests→schedule→complete`. Endpoint create đã validate (cần payload đủ). → cần seed dịch vụ PT + 1 ca.

## Ghi chú cleanup
Data test tạo khi drive (trên seed patient): exam `fafd9edb` (Huỳnh Bảo Linh) đã start+chẩn đoán+chỉ định+kê đơn `1065c70d`+complete; RIS result `093a8c71` trên order seed RAD…SEED005. Low-impact (seed), Claude Code có thể bỏ qua hoặc dọn.

## PROMPT cho Claude Code (paste)
```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern, his-be-module-scaffold) + docs/workspace-docs/10-assessment/prod-e2e-remaining-flows-2026-06-17.md. Sửa 3 lỗi từ E2E prod + bổ sung phủ test 2 luồng thiếu data. KHÔNG commit/push tới khi tôi duyệt.

P0:
1. RIS EnterRadiologyResultDto (RISCompleteController results/enter): các field AttachedImages/TechnicianNote/Note đang bắt buộc do non-nullable → nhập KQ CĐHA text-only (không ảnh) bị 400. Cho optional (nullable + default []/""), chỉ bắt buộc field nghiệp vụ thật (Description/Conclusion). Verify: POST results/enter chỉ với {orderItemId,description,conclusion} → 200.
2. RIS GET /orders (RISCompleteController:400): không truyền date trả [] (có 50 order khi truyền date range). Đặt default = ca hôm nay/đang chờ khi thiếu fromDate/toDate. Verify: GET /orders không param → trả ca trong ngày, không rỗng.
3. Insurance xml/generate/xml1: gửi maLkList mà thiếu month/year → "un-representable DateTime". Validate kỳ trước khi dựng DateTime; nếu có maLkList thì kỳ là optional. Verify cả 2 path (month/year và maLkList-only) → 200.

P1 (phủ test luồng thiếu data — để verify được E2E):
4. Nội trú & Phẫu thuật: hiện prod 0 ca nội trú đang ĐT + 0 dịch vụ PT/ca lên lịch → không drive được E2E. Hoặc (a) seed idempotent 1 ca nhập viện + 1 dịch vụ PT + 1 ca PT đã lên lịch (Data/Scripts), hoặc (b) viết E2E test (Cypress/integration) phủ admission→bed→order→vital→discharge và surgery request→schedule→start→complete. Báo cách chọn.

BUILD-GATE: dotnet build 0 error + npm run build EXIT 0. Verify từng cái bằng gọi thật. Báo cáo từng mục.
```
