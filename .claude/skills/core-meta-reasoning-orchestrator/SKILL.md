---
name: core-meta-reasoning-orchestrator
description: Use this skill (portable, tech-agnostic) as the META-REASONING ORCHESTRATOR — the reasoning preamble that, for a NON-TRIVIAL problem, (1) classifies the problem type (information-retrieval / explanation / design / architecture / planning / decision-making / risk-assessment / troubleshooting / research / security-review / optimization), (2) gauges impact LOW/MEDIUM/HIGH, (3) dispatches to the right thinking skills + techniques, (4) names load-bearing assumptions (which-if-wrong-collapses), (5) produces ≥1 alternative explanation/model, (6) states confidence. Triggers include a design/architecture/decision/planning/security/optimization/troubleshooting/research problem, "nên thiết kế/tiếp cận thế nào", "chọn phương án nào", "rủi ro gì", "phân tích giúp", or any reasoning-heavy question where the approach is not obvious. Do NOT use for trivial/execution tasks (LOW impact → answer directly) or for which-skill-for-a-CODE-task routing (SKILL-MAP.md); for the ORDER of the four thinking modes see core-synthesis-decision §Orchestration.
metadata:
  type: project
---

# Core — Meta-Reasoning Orchestrator (phân loại bài toán → kích hoạt đúng cách nghĩ)

> TẦNG: **A · CORE** (portable, tech-agnostic). **Lớp reasoning ĐỨNG TRÊN** 4 chế độ tư duy
> (`core-open-thinking` · `core-inversion-thinking` · `core-critic` · `core-synthesis-decision`).
> **Compose, KHÔNG thay** `SKILL-MAP.md` (router skill-cho-task-code) hay `workflow/workflow.md` (pipeline).
> Thứ-tự-4-mode = **chủ ở `core-synthesis-decision` §Orchestration** (ở đây chỉ link).

## Mục đích
Cho một vấn đề **suy-luận-nặng**, tự động: **phân loại → đo ảnh hưởng → chọn đúng bộ cách nghĩ → bóc giả định
→ tạo ≥1 mô hình thay thế → chấm độ tin cậy**. Chống 2 lỗi đối xứng: *dùng búa tạ cho việc vặt* (over-think) và
*trả lời nông cho vấn đề HIGH* (under-think). Cái van điều tiết = **mức ảnh hưởng (impact)**.

## Khi nào dùng
- Vấn đề Design · Architecture · Decision · Planning · Risk · Security · Optimization · Troubleshooting · Research **mà cách tiếp cận chưa hiển nhiên**.
- Câu hỏi "nên thiết kế/chọn/làm thế nào", "rủi ro gì", "phân tích/đánh giá giúp".

## Khi nào KHÔNG dùng
- Task **LOW/trivial/execution rõ ràng** (sửa UI/format/lỗi nhỏ, lệnh thực thi) → trả thẳng, bỏ nghi thức.
- Chọn **skill nào cho task-code** → `SKILL-MAP.md` (router khác lớp). Chạy **pipeline** → `workflow/workflow.md`.
- Chỉ cần **thứ tự gọi 4 chế độ tư duy** → `core-synthesis-decision` §Orchestration.

## Quy trình 6 bước (calibrated theo impact)
1. **Phân loại bài toán** (có thể đa nhóm) — theo bảng Dispatch dưới. Ghi rõ (các) loại.
2. **Đo ảnh hưởng:** **LOW** (lỗi nhỏ/UI/format) · **MEDIUM** (feature/module/workflow) · **HIGH** (kiến trúc/bảo mật/dữ liệu/chi phí/scalability). → quyết **độ sâu** (bảng Calibration).
3. **Dispatch** sang skill + kỹ thuật tương ứng (bảng Dispatch). Gọi đúng skill, không gọi thừa.
4. **Bóc giả định:** liệt kê giả định đang dùng; chỉ rõ **giả định nào nếu SAI sẽ làm SẬP kết luận** (load-bearing). *(= lõi `core-critic`.)*
5. **≥1 mô hình giải thích/giải pháp thay thế** — không khóa vào 1 hướng. *(= lõi `core-open-thinking`.)*
6. **Độ tin cậy:** kết luận + **confidence %** + phân loại luận cứ `Fact / Assumption / Speculation`.

## Calibration — impact quyết độ sâu
| Impact | Bước 3 chạy gì | Bước 4-6 |
|---|---|---|
| **LOW** | bỏ qua nghi thức; tối đa nêu 1 giả định chính + confidence | rút gọn |
| **MEDIUM** | 1-2 skill tư duy liên quan (theo Dispatch) | đủ Bước 4-6 |
| **HIGH** | full chain **Open→Inversion→Critic→Synthesis**; thay đổi Production → bọc `core-prod-change-discipline` | đủ + alt-model rõ + trigger-đảo-quyết-định |

## Dispatch — 11 loại bài toán → skill (home) + kỹ thuật (inline → `references/technique-catalog.md`)
| Loại | Impact mặc định | Skill home | Kỹ thuật (catalog) |
|---|---|---|---|
| Information Retrieval | LOW | `core-verify-before-assert` | — (trả thẳng, verify nguồn) |
| Explanation | LOW | — | analogy · first-principles (Open nhẹ) |
| Design | MEDIUM | `core-open-thinking` → `core-synthesis-decision` | Alternative Designs |
| Architecture | **HIGH** | `core-inversion-thinking` + `core-critic` → `core-synthesis-decision` | Failure-Mode · Second-order Effects · Scalability Review (`his-be-scalability`) |
| Planning | MED-HIGH | `core-impact-analysis` + `core-inversion-thinking` | Dependency · Risk · Bottleneck Detection |
| Decision Making | MED-HIGH | `core-critic` + `core-synthesis-decision` (+ `core-sparring-partner` nếu là quyết-định-của-USER) | Counterargument · Tradeoff Analysis · Base-Rate Thinking |
| Risk Assessment | **HIGH** | `core-inversion-thinking` + `core-critic` | Failure-Mode · Risk Analysis |
| Troubleshooting | MEDIUM | `core-inversion-thinking` (đảo triệu-chứng→nguyên-nhân) + `core-verify-before-assert` | hypothesis-elimination · Failure-Mode |
| Research | MEDIUM | `core-open-thinking` + `core-critic` | source-triangulation · (built-in `deep-research`) |
| Security Review | **HIGH** | `core-inversion-thinking` + `core-critic` + `his-qa-anti-pattern` | Red-Team · Attack-Surface · Threat-Modeling · (built-in `security-review`) |
| Optimization | MED-HIGH | `core-critic` (đo-trước) + `his-fe-performance` / `his-be-scalability` | Bottleneck Detection · Base-Rate (typical wins) |

## Output bắt buộc (mọi đáp án suy-luận-nặng PHẢI có — dùng làm checklist review)
```
[Phân loại] <loại> · Impact: LOW/MEDIUM/HIGH
[Skill kích hoạt] <skill/kỹ thuật> + vì sao
[Phân tích] <kết quả từ skill đã chạy>
[Giả định] load-bearing: <…> | nếu-sai-sập: <…>
[Mô hình thay thế] ≥1: <…>
[Độ tin cậy] <kết luận> — confidence X% (Fact/Assumption/Speculation)
```
LOW impact được rút gọn 3 dòng (Phân loại · Kết luận · Confidence).

## Pitfalls (anti-patterns)
- **Over-think LOW:** chạy full chain cho việc format → giết velocity. (Van impact tồn tại để chặn.)
- **Phantom dispatch:** gọi "skill" không tồn tại (Threat-Modeling…) → chúng là **kỹ thuật**, không phải skill; dùng inline.
- **Router thứ 2:** lấn vai `SKILL-MAP`/`workflow.md`. Skill này chọn **cách-nghĩ**, không chọn skill-code/flow.
- **Confidence rỗng:** ghi "confidence 90%" không kèm Fact/Assumption/Speculation → vô nghĩa.
- **Quên Bước 5:** đưa 1 kết luận duy nhất, không mô hình thay thế → anchoring.

## Ví dụ (HIGH — Architecture + Optimization)
> "Báo cáo doanh thu chạy 40s — có nên chuyển sang materialized view?"
> **[Phân loại]** Optimization + Architecture · **Impact HIGH** (dữ liệu/scalability).
> **[Dispatch]** Critic (đo-trước: 40s thật do query hay do render? có index chưa?) → Inversion (điều gì làm MV hỏng: **dữ liệu báo cáo lệch thực tế khi MV refresh trễ** → sai số liệu tài chính) → Scalability (`his-be-scalability`) → Synthesis.
> **[Giả định]** load-bearing: "user chấp nhận số liệu trễ tới lần refresh"; nếu SAI (cần realtime) → MV **sập** lựa chọn.
> **[Mô hình thay thế]** ① index + query rewrite (giữ realtime) · ② read-replica · ③ cache 5' có invalidation · ④ MV refresh đêm.
> **[Độ tin cậy]** Nên thử ①(index) trước, đo lại; MV chỉ khi ① không đủ và nghiệp vụ chấp nhận trễ — confidence 70% (Assumption: chưa xem query plan thật).

## Phối hợp (LINK — không copy)
- Thứ tự gọi 4 chế độ + khi-dùng-mấy-skill → `core-synthesis-decision` §Orchestration.
- Phản biện ý/quyết-định của USER (calibrated) → `core-sparring-partner`. Chống ảo tưởng khi khẳng định → `core-verify-before-assert`.
- Thay đổi hệ Production → `core-prod-change-discipline` (≥3 phương án · self-critique · gate · báo cáo 7 phần).

## Reference
- `references/technique-catalog.md` — định nghĩa ngắn từng kỹ thuật + skill-home (Base-Rate, Tradeoff, Threat-Modeling, Bottleneck…).

## When to update
- Khi thêm/bớt loại bài toán, đổi map loại→skill, hoặc đổi ngưỡng calibration. Thứ-tự-4-mode đổi → sửa ở `core-synthesis-decision` (KHÔNG sửa ở đây).
