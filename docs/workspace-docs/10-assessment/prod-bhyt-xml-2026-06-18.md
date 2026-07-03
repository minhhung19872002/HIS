# Test BHYT nâng cao: sinh XML giám định 1-15 · 2026-06-18

> Verify bộ sinh XML BHYT (XML1-15) + validate/preview trên prod. Token admin.

## ✅ Chạy được (không endpoint nào hỏng)
- **XML generate 1–15** (trừ 12 không có route): tất cả **HTTP 200, không crash** với body `{month,year[,maLkList]}`.
- `validate/before-export` → 200 (ct=1) · `xml/preview` → 200 (ct=1) · `xml1` (thông tin chung) → 200 ct=1.
- Trước đó: `claims/create/{examId}` 200 (tạo maLk), `submit` 200 (mock cổng BHXH).

## 🟡 CHƯA verify được — nghi under-reporting (cần data thật)
- Toàn prod chỉ có **1 hồ sơ BHYT** (`BHYT-20260614160627`, tháng 6; tháng 3-5 = 0 claim).
- Claim này tạo từ exam `fafd9edb` (Huỳnh Bảo Linh) — exam ĐÃ có **đơn Paracetamol + chỉ định siêu âm/X-quang/creatinin**.
- NHƯNG sinh **XML2 (thuốc) = 0 dòng, XML3 (DVKT/dịch vụ) = 0 dòng, XML7 (giám định) = 0** — cả khi lọc theo maLk lẫn cả kỳ tháng.
- → **Nghi `claims/create/{examId}` KHÔNG gom thuốc/dịch vụ của lượt khám vào hồ sơ BHYT** (hoặc cần bước attach detail riêng chưa chạy). Nếu đúng: file XML xuất cổng BHXH **thiếu dòng thuốc + DVKT** → giám định thiếu → **thất thu BHYT**. Đây là rủi ro tiền, cần khẳng định bằng claim có data thật.

## PROMPT cho Claude Code (paste)
```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern) + docs/workspace-docs/10-assessment/prod-bhyt-xml-2026-06-18.md. KHÔNG commit/push tới khi tôi duyệt.

Verify nghi vấn BHYT under-reporting:
1. Tạo 1 lượt khám BHYT đầy đủ (chẩn đoán + ≥1 chỉ định DVKT + ≥1 đơn thuốc), rồi POST claims/create/{examinationId}.
2. Sinh XML2 (thuốc) + XML3 (DVKT) cho claim đó. Kỳ vọng: XML2 có ≥1 dòng thuốc, XML3 có ≥1 dòng dịch vụ KHỚP với đơn/chỉ định.
3. Nếu XML2/XML3 = 0 (như quan sát prod hiện tại: claim từ exam có đơn+DV nhưng XML2/3 rỗng) → BUG: sửa generator/claim-detail để gom đúng thuốc (từ Prescription) + DVKT (từ ServiceRequest) của lượt khám vào XML2/XML3. Đối chiếu format XML BHYT 4750/QĐ-BYT (mã thuốc, số lượng, đơn giá, thành tiền, tỷ lệ BHYT).
4. Viết test: claim đầy đủ → XML2/XML3 đủ dòng + tổng tiền khớp bảng kê.

Lưu ý: prod hiện chỉ 1 claim sparse → tạo data test đầy đủ để khẳng định. KHÔNG để XML xuất thiếu dòng (thất thu giám định).
```
