#!/usr/bin/env bash
# Stop hook — kêu chuông terminal khi Claude kết thúc lượt (tiện khi build lâu / rời máy).
# Bell ra stderr để không lẫn vào stdout (stdout dành cho JSON hook output).
printf '\a' >&2
exit 0