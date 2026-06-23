---
name: core-inversion-thinking
description: Use this skill (portable, tech-agnostic) to apply INVERSION — instead of asking how to make a goal SUCCEED, ask what would GUARANTEE its failure / what would break the result, enumerate those failure-modes exhaustively, then map each back to a forward "avoid / ensure / test" directive and surface the non-obvious insight that only the reversed view reveals. Three modes: failure-inversion (pre-mortem), goal-inversion (backward-chaining from the desired end-state), assumption-inversion (assume the opposite of a load-bearing assumption). Triggers include "làm sao để X chắc chắn chạy", "điều gì có thể hỏng", "pre-mortem", a high failure-cost decision, a single dominant frame / success-only thinking, being stuck, or debugging "cái gì gây ra hiện tượng này". Do NOT use to audit a concrete artifact (core-critic), to generate many diverse options (core-open-thinking), or to choose/merge a final answer (core-synthesis-decision).
metadata:
  type: project
---

# Core — Inversion Thinking (tư duy đảo ngược / pre-mortem engine)

> TẦNG: **A · CORE** (portable, tech-agnostic). Một trong 4 chế độ tư duy hệ thống — orchestration là
> **chủ ở `core-synthesis-decision` §Orchestration**; ở đây chỉ link.

## Mục đích
Thay vì hỏi "làm sao để G **thành công**", đảo câu hỏi: "điều gì **đảm bảo ¬G** (thất bại / phá hỏng kết quả)?"
rồi **thiết kế để tránh đúng những điều đó**. Khai thác insight chỉ lộ khi nhìn ngược — bắt failure-mode &
đường-đi **phi hiển nhiên** mà tư duy xuôi bỏ sót. Đây là **1 phép biến đổi** (xoay khung), không phải breadth.

## Khi nào dùng
- Mục tiêu rõ nhưng **đường đi không hiển nhiên** HOẶC **chi phí thất bại cao**.
- **Đồng thuận quá nhanh** vào một hướng — chưa ai liệt kê cách nó hỏng (success-only thinking).
- Bị **kẹt/bí** (tư duy xuôi đã cạn); hoặc **debug** (đảo từ triệu chứng về nguyên nhân khả dĩ).

## Khi nào KHÔNG dùng
- Bài toán đơn giản, đảo-ngược-được, rủi ro thấp → đảo chỉ thêm nhiễu.
- Đã có failure-list đầy đủ → chuyển `core-critic` / hành động.
- Cần **đánh giá độ đúng của 1 artifact cụ thể** → `core-critic`.
- Cần **nhiều phương án mới đa dạng** → `core-open-thinking` (đảo chỉ cho 1 phép xoay, không cho breadth).

## Input cần có
- **Bắt buộc:** mục tiêu G **hoặc** plan/candidate P.
- **Nên có:** stakes / chi-phí-thất-bại; giả định chịu lực chính; end-state mong muốn (cho mode backward).

## Quy trình nội bộ
1. Phát biểu rõ **G** (hoặc P) và "thành công nghĩa là gì".
2. **Chọn mode đảo:**
   - **A — Failure-inversion (pre-mortem):** "Giả sử đã thất bại hoàn toàn. Điều gì gây ra?" → liệt kê cạn.
   - **B — Goal-inversion (backward):** xuất phát từ end-state, hỏi lùi "ngay trước đó điều gì PHẢI đúng?" đệ quy về hiện tại.
   - **C — Assumption-inversion:** lấy giả định chịu lực, **giả định điều ngược lại đúng**, xem hệ quả.
3. **Sinh tập đảo cho cạn** (đừng dừng ở 2–3 cái hiển nhiên).
4. **Ánh xạ ngược mỗi mục đảo → 1 directive xuôi:** *tránh X* / *đảm bảo Y* / *kiểm chứng giả định Z*.
5. Lọc **insight phi hiển nhiên** — thứ chỉ xuất hiện nhờ nhìn ngược.
6. Xếp directive **theo đòn bẩy** (mục nào tránh được nhiều thất bại nhất).

## Output bắt buộc
- **Danh sách đảo** (failure-modes / điều-kiện-end-state / giả-định-ngược) — đã liệt kê cạn.
- **Bảng ánh xạ:** mỗi mục đảo → directive xuôi (avoid/ensure/test).
- **Giả định cần bẻ gãy** (mode C).
- **Top insight phi hiển nhiên** tư duy xuôi đã bỏ sót.
- ⚠️ Nêu rõ: *"đây là failure-map, KHÔNG phải phán xét artifact cụ thể"* (ranh giới với `core-critic`).

## Failure modes (anti-patterns — đừng làm)
- **Đảo cơ học/tautology** ("đừng làm sai") → 0 insight.
- **Nhầm thành Critic:** bắt đầu chê artifact cụ thể thay vì xoay khung.
- **List thất bại đáng sợ mà không có directive** → gieo lo, không hành động được.
- **Đối xứng giả** (tưởng "điều ngược lại" tự động đúng/hữu ích); **cầu toàn** (coi "tránh MỌI failure" là khả thi → paralysis); **over-apply** cho bài tầm thường.

## Định vị workflow
| Thuộc tính | Giá trị |
|---|---|
| Tầng | **Xoay-khung / Stress** — giữa phân kỳ & hội tụ; hoặc khi bí |
| Ưu tiên | **TB-CAO**, tăng theo chi-phí-thất-bại + mức single-frame |
| Bài toán hợp | quyết định rủi ro cao, "làm sao không hỏng", debug, planning backward, phá khung cố định |
| Dấu hiệu bật | một khung tư duy **độc tôn** / chỉ nghĩ thành công, chưa ai liệt kê đường hỏng |

## Ví dụ
> G = "Triển khai cho 1000 user **không downtime giờ cao điểm**." Mode A — "làm gì để CHẮC CHẮN sập giờ cao điểm?":
> ① deploy 8h sáng; ② không rollback; ③ migration khóa bảng nóng; ④ min-instances=0 (cold start); ⑤ không load-test; ⑥ pool nhỏ.
> Ánh xạ xuôi: ①→deploy 2h sáng; ②→blue-green + 1-click rollback; ③→migration online/idempotent; ④→min-instances≥2; ⑤→load-test trước; ⑥→tăng pool + đo.
> **Insight ẩn:** rủi ro lớn nhất là **cửa sổ deploy + cold start**, thứ plan xuôi không hề nhắc.

## Phản ví dụ (anti-pattern)
> ❌ G="tăng doanh thu" → "vậy đừng làm giảm doanh thu, đừng mất khách" → đảo **cơ học, tautology**, không ra failure-mode
> cụ thể nào, không directive đòn bẩy. Inversion thật phải ra đường-hỏng **cụ thể, phi hiển nhiên** (vd "churn dồn tháng 13 do hợp đồng năm").

## Phối hợp (LINK — không copy)
- Dùng 1/nhiều chế độ + thứ tự → `core-synthesis-decision` §Orchestration.
- Sau khi có directive mitigation → audit bằng `core-critic`; cần thêm phương án mới → `core-open-thinking`.

## When to update
- Khi thêm/bớt mode đảo hoặc đổi cách ánh-xạ-ngược. Ranh giới với `core-critic`/`core-open-thinking` đổi → sửa "Khi nào KHÔNG dùng".
