---
name: core-requirement-clarify
description: Use this skill (portable, tech-agnostic) at the START of any feature/edit/migration/test task to understand the requirement correctly before coding — detect ambiguity/missing info, decide proceed-with-stated-assumption vs STOP-and-ask, and ask good batched clarifying questions. Triggers include a vague/underspecified request, ≥2 reasonable interpretations leading to different results, or a change that is hard to reverse / touches patient-safety / money / schema. Do NOT use for facts you can verify yourself in the codebase (use core-verify-before-assert), nor for clearly-specified tasks with an obvious verifiable default.
metadata:
  type: project
---

# Core — Requirement Clarify (portable)

> TẦNG: **A · CORE** (discipline, tech-agnostic). Guardrail **pre-flight #1** — chạy trước mọi code-gen.

## (2) Vấn đề skill giải quyết
Yêu cầu mơ hồ/thiếu thông tin → AI tự đoán → build sai → tốn vòng sửa. Skill chuẩn hoá: **phát hiện
ẩn số ảnh hưởng kết quả** và **quyết định HỎI hay tự-quyết-có-ghi-giả-định**, để hiểu đúng trước khi code.

## (3) Vì sao AI hay fail ở đây
- Thiên về "trả lời nhanh/hữu ích" → chọn default ngầm mà không nói ra.
- Ngại hỏi → đoán phạm vi, đoán nơi lưu dữ liệu, đoán v1/v2.
- Gộp nhiều cách hiểu khác nhau thành một rồi làm lệch ý.
- Hoặc thái cực ngược: hỏi quá nhiều câu vụn vặt → làm phiền, chậm.

## (4) Khi nào dùng (kích hoạt)
- Đầu MỌI task feature/sửa/migration/test (bước hiểu yêu cầu).
- Prompt thiếu một trong: đối tượng, phạm vi, định dạng I/O, ràng buộc, tiêu chí "done".
- Có **≥2 cách hiểu hợp lý** dẫn tới kết quả KHÁC nhau.
- Thay đổi **khó đảo ngược** / đụng **an toàn bệnh nhân, pháp lý, tiền, schema, xoá dữ liệu**.

## (5) Khi nào KHÔNG dùng
- Yêu cầu đã rõ + có default hiển nhiên **verify được trong code** (→ tự quyết, ghi giả định 1 dòng).
- Ẩn số có thể tự trả lời bằng Read/Grep → đó là việc của **`core-verify-before-assert`**, KHÔNG hỏi user.
- Câu hỏi thuần thông tin / chitchat.

## (6) Workflow
1. **Tách** "đã biết chắc" vs "đang suy đoán" từ prompt + ngữ cảnh repo.
2. **Liệt kê ẩn số** chỉ ở mức **ảnh hưởng kết quả** (bỏ qua chi tiết vụn vặt).
3. **Phân loại từng ẩn số** qua cổng quyết định (7).
4. Nếu cần hỏi → **gộp tất cả vào tối đa 1–2 câu**, mỗi câu kèm 2–4 option + 1 khuyến nghị (dùng tool `AskUserQuestion`). KHÔNG hỏi rời từng cái.
5. Nếu tự quyết → ghi **"Giả định: …"** ở đầu trước khi code; user có thể bác sau.

## (7) Quy tắc & giới hạn an toàn (CỔNG QUYẾT ĐỊNH)
**HỎI khi** thoả ≥1: (a) đổi hành vi/kết quả quan trọng · (b) khó đảo ngược · (c) ≥2 cách hiểu cho kết quả khác nhau · (d) đụng patient-safety/pháp lý/tiền/xoá-ghi đè dữ liệu.
**Ngược lại → proceed-with-stated-assumption.**
- Tối đa ~1–2 vòng hỏi; không biến hỏi thành cách né làm.
- KHÔNG hỏi điều tự verify được bằng code.

## (8) Input kỳ vọng
Prompt của user + ngữ cảnh repo (CLAUDE.md, code liên quan).

## (9) Output kỳ vọng
Một trong hai: **(A)** 1–2 câu hỏi gộp có option (qua `AskUserQuestion`); hoặc **(B)** khối "Giả định đã chốt: …" rồi tiến hành.

## (10) Ví dụ (HIS)
- "Thêm trường Z vào màn kê đơn": v1 hay v2? → feature mới mặc định **v2** (verify được qua conflict-rule SKILL-MAP) → tự quyết. "Lưu Z vào đâu" → đổi schema/đụng DTO backend → **HỎI**.
- "Làm nút HSBA hoạt động": có ≥2 nghĩa (mở form tạo? in? xuất?) → HỎI gộp 1 câu nhiều option.
- "Sửa lại cho đúng": quá mơ hồ ("đúng" theo tiêu chí nào) → HỎI.

## (11) Anti-pattern / lỗi điển hình
- Hỏi 5 câu lặt vặt rời rạc thay vì gộp.
- Hỏi điều đọc code là biết (vd tên endpoint đã có) → phải tự verify.
- Im lặng đoán rồi build sai cả buổi.
- Over-ask cho task nhỏ rõ ràng.

## (12) Tích hợp + cấu trúc tệp
- **Pipeline pre-flight:** skill này (#1) → `core-verify-before-assert` (#2) → `core-impact-analysis` (#3) → code theo `core-minimal-change`.
- Dùng tool `AskUserQuestion` cho output (A).
- `references/clarify-gate.md` — cổng quyết định + mẫu câu hỏi gộp.

## When to update
- Khi cổng quyết định HỎI/tự-quyết hoặc cách hỏi gộp thay đổi.
