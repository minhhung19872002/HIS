---
name: core-open-thinking
description: Use this skill (portable, tech-agnostic) for DIVERGENT thinking — widen the solution space by generating multiple FUNDAMENTALLY DIFFERENT (orthogonal) solution models through distinct lenses (first-principles, cross-domain analogy, constraint-relax, constraint-tighten, opposite, hybrid, do-nothing/minimal), to break anchoring on the first idea; it explicitly does NOT pick a winner — it hands off the option set + trade-off axes + decision-driver questions to convergence. Triggers include "nên tiếp cận thế nào", "có những cách nào", architecture/strategy choices, brainstorming, a novel/ill-defined problem, or only ONE option on the table (premature convergence / anchoring). Do NOT use to audit an existing artifact (core-critic), to reverse the framing (core-inversion-thinking), to choose/merge among options (core-synthesis-decision), or when the answer is genuinely constrained to one correct path.
metadata:
  type: project
---

# Core — Open Thinking (tư duy mở / phân kỳ)

> TẦNG: **A · CORE** (portable, tech-agnostic). Một trong 4 chế độ tư duy hệ thống — orchestration là
> **chủ ở `core-synthesis-decision` §Orchestration**; ở đây chỉ link.

## Mục đích
Mở rộng **không gian giải pháp:** sinh nhiều mô hình **khác nhau về bản chất** (không phải biến thể), chống
**anchoring** vào hướng đầu tiên, giữ bài toán mở đủ lâu để lựa chọn thật sự có giá trị. Mục tiêu = **breadth +
tính trực giao**, KHÔNG chọn người thắng (việc đó của `core-synthesis-decision`).

## Khi nào dùng
- Bài toán **mới / mơ hồ / nhiều ràng buộc mềm**, chưa có lời giải hiển nhiên.
- **Chỉ MỘT phương án** trên bàn cho bài toán đáng-ra-nhiều-cách → premature convergence.
- Phát hiện **anchoring** (bám ý đầu/ý người nói to nhất); trước quyết định **kiến trúc/chiến lược** dài hạn.

## Khi nào KHÔNG dùng
- Lời giải đã bị **ràng buộc về 1 đường đúng** (yêu cầu bảo mật/pháp lý bắt buộc) → mở rộng = lãng phí.
- Đã có tập phương án đủ tốt, cần **chốt** → `core-synthesis-decision`.
- Cần **audit** một artifact → `core-critic`; cần **pre-mortem/xoay khung** → `core-inversion-thinking`.
- Việc thực thi rõ ràng, đảo-ngược-được → làm thẳng.

## Input cần có
- **Bắt buộc:** phát biểu bài toán dạng câu hỏi.
- **Nên có:** ràng buộc **cứng vs mềm** (tách bạch); phương án đang-bị-anchor (để chủ động tách khỏi); ngân sách phân kỳ (cần ≥ N mô hình).

## Quy trình nội bộ
1. **Reframe** bài toán thành câu hỏi mở; **gỡ bỏ lời giải mặc định** đang anchor.
2. Sinh phương án qua **nhiều lăng kính trực giao** (ép đa dạng, không tự nhân bản 1 ý):
   first-principles · loại suy domain khác · nới ràng buộc · siết ràng buộc · làm ngược · lai-ghép · do-nothing/minimal.
3. Mỗi mô hình: **1 câu cốt lõi** + **win-condition** ("thắng trong thế giới nào").
4. **Dedup/merge** mô hình gần trùng; **gắn cờ "breadth giả"** (N ý chỉ là 1 ý đổi áo).
5. **Cụm** theo chiến lược nền; đảm bảo ≥ N **họ** thật sự khác nhau.
6. **KHÔNG chọn người thắng** — nêu **câu hỏi-phân-định** (decision-driver) + **trục đánh đổi** chung.

## Output bắt buộc
- **≥ N mô hình trực giao:** tên · cốt lõi 1 dòng · **win-condition** · chi phí/độ phức tạp thô.
- **Trục đánh đổi** (vd tốc độ↔độ-bền, đơn-giản↔linh-hoạt).
- **Câu hỏi-phân-định** (trả lời được thì loại bớt phương án).
- **Cờ breadth giả** nếu có mô hình bị merge.
- ⚠️ Tuyên bố rõ: *"chưa chọn — bàn giao tầng hội tụ (`core-critic` / `core-synthesis-decision`)"*.

## Failure modes (anti-patterns — đừng làm)
- **Phân kỳ không hội tụ** (đẻ vô số option, không bàn giao → analysis paralysis).
- **Breadth giả** (option rác cho đủ số đếm; N cái cùng một ý đổi tham số).
- **Bỏ ràng buộc cứng** → option đẹp nhưng bất khả thi.
- **Dùng khi đáp án vốn bị-ép-về-1** → đốt thời gian.

## Định vị workflow
| Thuộc tính | Giá trị |
|---|---|
| Tầng | **Phân kỳ** — đầu chu trình, lúc khung-hóa & sinh phương án, trước khi cam kết |
| Ưu tiên | **TB-CAO** khi mới/mở; **THẤP** khi đã chốt đúng hướng |
| Bài toán hợp | vấn đề ill-defined/mới, chọn kiến trúc, brainstorm, phá anchoring, đổi mới |
| Dấu hiệu bật | chỉ **một** lời giải trên bàn cho vấn đề lẽ-ra-nhiều-cách |

## Ví dụ
> "Đồng bộ kết quả LIS về HIS" (đang anchor: "viết 1 service polling DB máy LIS"). Open → 5 mô hình trực giao:
> ① **HL7 listener** (thắng khi máy hỗ trợ HL7) · ② **DB polling** (máy cũ chỉ có DB, chấp nhận trễ) · ③ **File-drop watcher**
> (máy xuất file, hạ tầng nghèo) · ④ **Vendor REST webhook** (máy đời mới, mạng ổn) · ⑤ **Middleware mua sẵn (Mirth)**
> (nhiều loại máy). Trục: chuẩn-hóa↔chi-phí-tích-hợp, realtime↔đơn-giản. Câu hỏi-phân-định: "Bao nhiêu model máy? Có HL7 không?" → **chưa chọn, bàn giao hội tụ.**

## Phản ví dụ (anti-pattern)
> ❌ "5 phương án": ① polling 5s · ② polling 10s · ③ polling có cache · ④ polling đa luồng · ⑤ polling + log → **breadth giả**:
> cả 5 là *một* mô hình (polling) đổi tham số, không lăng kính trực giao nào → Open bị trượt, vẫn kẹt trong khung bị-anchor.

## Phối hợp (LINK — không copy)
- Dùng 1/nhiều chế độ + thứ tự → `core-synthesis-decision` §Orchestration.
- Sau khi mở rộng: stress bằng `core-inversion-thinking`, audit bằng `core-critic`, chốt bằng `core-synthesis-decision`.

## When to update
- Khi thêm/bớt lăng kính phân kỳ hoặc đổi định nghĩa "trực giao". Ranh giới với các chế độ khác đổi → sửa "Khi nào KHÔNG dùng".
