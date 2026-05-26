# SKILL.md — khung copy-paste

Sao chép khối dưới vào `.claude/skills/<name>/SKILL.md`, thay `<...>` và xoá ghi chú.

```markdown
---
name: <name-kebab-case>          # PHẢI trùng tên thư mục
description: Use this skill when <WHAT + ngữ cảnh>. Triggers include <trigger cụ thể: path, tên hàm, từ khoá VI/EN>. Do NOT use for <tình huống> (<skill-khác>).
metadata:
  type: project
# allowed-tools: Read, Grep, Edit   # (tùy chọn) bỏ comment nếu cần giới hạn tool
---

# <Tiêu đề ngắn>

<1–2 câu mục đích: skill này chuẩn hoá việc gì, bám pattern/file nào.>

## Khi nào dùng
- <tình huống cụ thể 1>
- <tình huống cụ thể 2>

## Khi nào KHÔNG dùng
- <tình huống> → `<skill-anh-em>` (<lý do ngắn>)

## Vị trí code mẫu (đọc trước khi viết)
- `<path/tới/file-tham-chiếu>` — <vai trò>

## Quy trình chuẩn
1. <bước 1, path thật>
2. <bước 2>
3. <build/verify>

## Pitfalls
- <lỗi đã dính thật → cách tránh>

## Reference
- `references/<file>` — <mô tả> (nếu tách template/script)

## When to update
- <khi nào cần sửa lại skill này>
```

## Mẹo viết `description` mạnh
- Mở đầu: `Use this skill when …` (ngôi thứ 3).
- Nhồi trigger Claude dễ match: tên file, route, tên class/hàm, từ khoá tiếng Việt + Anh.
- Kết bằng `Do NOT use for … (skill-khác)` để tránh chồng lấn.
- ≤ 1024 ký tự; cụ thể luôn thắng chung chung.
