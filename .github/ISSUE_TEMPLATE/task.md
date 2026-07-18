---
name: HIS task (with DoD checklist)
about: Standard task/feature/bug/tech-debt with a materialized Definition-of-Done checklist
title: "[MODULE][P?] <short imperative title>"
labels: []
---

## Bối cảnh / Vấn đề
<!-- Vì sao cần task này; hiện trạng; link tài liệu/issue liên quan -->

## Mục tiêu
<!-- 1 câu: kết quả cần đạt -->

## ✅ DoD checklist (điều kiện hoàn thành — tick `- [x]` khi ĐÃ xong + có bằng chứng)
<!-- Cơ chế: .claude/workflow/dod-checklist.md — materialize khi tạo → tick khi làm → self-verify trước READY_FOR_PUSH.
     Chỉ giữ các mục task này THỰC SỰ chạm tới; xoá mục không liên quan. Mirror sang TodoWrite khi làm. -->
- [ ] <tiêu chí done đo được #1>
- [ ] <tiêu chí done đo được #2>
- [ ] 🔴 BUILD-GATE xanh trên tier chạm tới (FE `npm run build` EXIT 0 · BE `dotnet build` 0 error)
- [ ] 🔴 (nếu chạm money/drug/schema/contract/patient-safety) ≥1 test PASS + giữ nguyên các check an toàn
- [ ] 🔴 (nếu thêm service/controller) đã đăng ký DI trong `DependencyInjection.cs`
- [ ] 🔴 (nếu sửa `.claude` governance) `bash .claude/lint.sh` = LINT OK
- [ ] 🔴 Self-verify pass: đọc lại từng mục trên, mỗi mục PASS + bằng chứng (`file:line`/output lệnh) hoặc để trống = CHƯA xong

## Non-goals (rõ ràng NGOÀI phạm vi — chống scope-creep)
- <việc KHÔNG làm trong task này>

## Rủi ro / Rollback
<!-- blast-radius; nếu chạm prod (money/schema/contract/patient-safety) → ≥3 phương án + cách revert -->
