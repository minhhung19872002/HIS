#!/usr/bin/env bash
# SessionEnd hook — khi kết thúc phiên, nếu working tree còn thay đổi thì nhắc cập nhật STATUS.md.
# Dùng SessionEnd (không phải Stop) để chỉ nhắc 1 lần lúc rời phiên, tránh ồn mỗi lượt.
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo '{"systemMessage":"📝 Working tree còn thay đổi — nhớ cập nhật docs/workspace-docs/STATUS.md (trạng thái · việc kế tiếp) trước khi nghỉ."}'
fi
exit 0