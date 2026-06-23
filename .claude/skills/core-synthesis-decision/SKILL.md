---
name: core-synthesis-decision
description: Use this skill (portable, tech-agnostic) for the CONVERGENCE / closing step — synthesize divergent options (open-thinking) + audit findings (critic) + failure-maps (inversion) into ONE defensible decision: define decision criteria, score candidates by win-condition, graft the best ideas from runners-up, then state the chosen option + rationale + residual risks + confidence. It is ALSO the canonical OWNER of how the four thinking modes orchestrate (when to use 1/2/3/4 skills, and the order Open→Inversion→Critic→Synthesis). Triggers include "chốt phương án", "chọn cái nào", closing a design/architecture decision after exploration, or needing to combine multiple analyses into a single action. Do NOT use to generate options (core-open-thinking), to audit one artifact (core-critic), or to pre-mortem / reverse the framing (core-inversion-thinking).
metadata:
  type: project
---

# Core — Synthesis & Decision (hội tụ / chốt quyết định + orchestration)

> TẦNG: **A · CORE** (portable, tech-agnostic). **CHỦ DUY NHẤT** của §Orchestration cho 4 chế độ tư duy
> (`core-open-thinking` · `core-inversion-thinking` · `core-critic` · skill này) — nơi khác chỉ **LINK** (`../../REGISTRY.md`).

## Mục đích
Khép pha phân-kỳ-đánh-giá: gộp **options** (Open) + **findings** (Critic) + **failure-map** (Inversion) thành
**1 quyết định bảo vệ được** — có tiêu chí, có lý do, có rủi ro tồn dư, có confidence. Không sinh thêm option,
không audit lại từ đầu; **chọn + ghép + chốt**.

## Khi nào dùng
- Đã có **≥2 phương án** (hoặc 1 phương án + findings/failure-map) và cần **ra quyết định/hành động**.
- Cuối một vòng thiết kế/kiến trúc sau khi đã mở rộng + stress + audit.
- Cần **gộp nhiều phân tích** (nhiều agent/nhiều lăng kính) thành một kết luận thống nhất.

## Khi nào KHÔNG dùng
- Chưa có phương án nào → `core-open-thinking` trước.
- Cần tìm lỗi của 1 bản cụ thể → `core-critic`; cần pre-mortem → `core-inversion-thinking`.
- Quyết định trivial/đảo-ngược-được → chốt thẳng, không cần skill.

## Input cần có
- **Bắt buộc:** tập phương án **hoặc** (phương án + findings/failure-map); mục tiêu + ràng buộc cứng.
- **Nên có:** tiêu chí quyết định (nếu chưa có → tự rút từ ràng buộc + win-condition); stakes/độ-đảo-ngược.

## Quy trình nội bộ
1. **Chuẩn hóa input:** liệt kê phương án + gắn kèm findings (Critic) & failure-mode (Inversion) liên quan từng cái.
2. **Rút tiêu chí quyết định** (từ ràng buộc cứng + win-condition + rủi ro) — 3–6 tiêu chí, có trọng số thô.
3. **Chấm** mỗi phương án theo tiêu chí; loại phương án vi phạm ràng buộc cứng / có Blocker chưa giải.
4. **Ghép (graft):** lấy ý hay nhất từ phương án á-quân ghép vào phương án dẫn đầu (nếu tương thích).
5. **Quyết:** nêu phương án chọn + **vì sao thắng** + **vì sao loại** các phương án khác.
6. **Rủi ro tồn dư + điều kiện đảo quyết định** ("nếu X xảy ra thì chọn lại Y") + **confidence**.

## Output bắt buộc
- **Bảng quyết định:** phương án × tiêu chí (điểm) + lý do loại.
- **Phương án chọn** + bản ghép (nếu có) + rationale.
- **Rủi ro tồn dư** + **trigger đảo quyết định** + **confidence %**.
- Phân loại `Fact / Assumption / Speculation` cho các luận cứ then chốt.

## Failure modes (anti-patterns — đừng làm)
- **Giả hội tụ:** chọn theo cảm tính, không tiêu chí, không lý-do-loại.
- **Trung bình hóa** (gộp mọi option thành "cái lai" nhạt mất win-condition).
- **Bỏ qua Blocker** của Critic để chọn phương án đẹp; **chốt khi chưa có đủ phương án** (nên Open trước).
- **Quyết treo** (liệt kê mãi không chốt) — vi phạm chính mục đích skill.

## Định vị workflow
| Thuộc tính | Giá trị |
|---|---|
| Tầng | **Hội tụ-cuối / Đóng** — sau Open(+Inversion+Critic) |
| Ưu tiên | **CAO** khi đã đủ input để quyết; **0** khi chưa có phương án |
| Bài toán hợp | chốt kiến trúc/chiến lược, gộp nhiều phân tích, ra hành động |
| Dấu hiệu bật | có ≥2 phương án (hoặc options + findings) + áp lực phải quyết |

## §Orchestration — phối hợp 4 chế độ tư duy (CHỦ; nơi khác chỉ link)

### Bảng so sánh
| Tiêu chí | 🟢 open-thinking | 🟡 inversion-thinking | 🔴 critic | 🔵 synthesis-decision |
|---|---|---|---|---|
| Mục tiêu | mở rộng tập phương án trực giao | đảo khung → tìm điều làm THẤT BẠI | audit 1 artifact đã có | gộp + chốt 1 quyết định |
| Đối tượng | không-gian giải pháp | mục tiêu / khung bài toán | 1 artifact tồn tại | tập phương án + findings |
| Hướng | phân kỳ-tạo | xoay 180° (1 phép) | hội tụ-phá | hội tụ-đóng |
| Thời điểm | đầu (khung hóa) | giữa (stress / khi bí) | cuối-trước-commit (gate) | cuối (đóng) |
| Đầu ra | ≥N mô hình + trade-off + câu hỏi-phân-định | failure-map + directive xuôi | findings xếp severity + verdict | bảng quyết định + phương án chọn |
| Rủi ro lạm dụng | phân kỳ không chốt, breadth giả | đảo cơ học, paralysis | nihilism, bikeshedding | giả hội tụ, trung bình hóa |
| Ưu tiên | TB-CAO khi mới; THẤP khi đã chốt | TB-CAO theo chi-phí-thất-bại | CAO/BLOCKING khi khó-đảo-ngược | CAO khi đủ input |

### Dùng mấy skill?
- **1 skill:** chỉ Critic (có artifact, sắp commit) · chỉ Inversion (mục tiêu rõ, rủi ro cao, pre-mortem / khi bí) · chỉ Open (vấn đề mới, đang sinh ý) · chỉ Synthesis (đã có sẵn các option, chỉ cần chốt).
- **2 skill:** Open→Critic (sinh rồi prune — phổ biến nhất) · Open→Inversion (sinh rồi stress/phá khung) · Inversion→Critic (pre-mortem → audit mitigation) · {bất kỳ}→Synthesis (khép quyết định).
- **3–4 skill (high-stakes / mới / khó-đảo-ngược):** chuỗi đầy đủ.

### Thứ tự tối ưu: **Open → Inversion → Critic → Synthesis**
1. **Open** mở rộng (thêm option lúc đầu là rẻ nhất). 2. **Inversion** stress + bẻ giả định-khung (bắt lỗi mức-khung trước khi đánh giá tốn kém). 3. **Critic** audit candidate đã-khung-hóa-tốt-nhất (đánh giá đắt → để cuối). 4. **Synthesis** chốt.
> Critic để **cuối-trước-chốt** vì critique option sẽ-bị-loại là lãng phí, và critique *trước* inversion bỏ sót lỗi mức-khung.

### Vòng lặp & anti-pattern điều phối
- Critic ra **BLOCK + lỗi mức-khung** → quay lại **Open** (regenerate), không vá tại chỗ. Có sẵn 1 artifact (không sinh mới) → bỏ Open: **Inversion→Critic→Synthesis**.
- ❌ Critic **trước** trên 1 ý bị-anchor (tối ưu cục bộ khung sai) · ❌ Open **sau** khi đã cam kết tài nguyên sâu (churn) · ❌ chạy Critic & Open **song song** cùng artifact (một bên giết, một bên nhân → xung đột; phải tuần tự) · ❌ cả 4 cho quyết định **trivial**.
- Ưu tiên động: ↑khó-đảo-ngược→nâng Critic (blocking) · ↑mới/mơ hồ→nâng Open · ↑chi-phí-thất-bại+single-frame→nâng Inversion.

## Ví dụ
> Sau Open (5 cách sync LIS) + Inversion (failure: phụ thuộc 1 vendor, mất bản ghi khi mạng rớt) + Critic (HL7 listener: Major — cần buffer/ack):
> Synthesis rút tiêu chí {số-loại-máy, có-HL7, độ-tin-cậy, chi-phí-maintain}; chấm → chọn **HL7 listener + hàng đợi buffer** (graft ý "file-drop fallback" từ á-quân cho máy cũ).
> Rủi ro tồn dư: vendor không chuẩn HL7 → trigger đảo: nếu >30% máy không HL7 → chuyển Middleware (Mirth). Confidence 75%.

## Phản ví dụ (anti-pattern)
> ❌ "Cả 5 cách đều hay, mình làm cái lai gồm tất cả cho chắc." → **trung bình hóa**: gộp mất win-condition, hệ thống ôm 5 cơ chế,
> không tiêu chí, không lý-do-loại, không rủi ro tồn dư → quyết định không bảo vệ được.

## When to update
- Khi đổi tiêu-chí/cách-chấm, HOẶC khi thêm/bớt chế độ tư duy / đổi thứ tự orchestration (sửa **Ở ĐÂY**; nơi khác chỉ cập nhật link).
