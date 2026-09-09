#!/usr/bin/env bash
# Đưa ảnh chụp của app người bệnh vào trình xem evidence.
#
# Có hai chỗ chứa ảnh, và cố ý là hai chỗ khác nhau:
#
#   docs/features/patient-app/screenshots/{android71,ios12}/   ← COMMIT vào repo
#       Bộ ảnh của hồ sơ nghiệm thu. Phải đi cùng repo thì bên nghiệm thu mới xem được, và phải
#       ổn định để bảng đối chiếu trỏ vào được.
#
#   docs/architecture/evidence/spec-app/                       ← KHÔNG commit (.gitignore:216)
#       Bản sao cho trình xem evidence đọc. Repo cố ý không giữ ảnh ở đây (phình binary +
#       push-race không merge được) nên mỗi máy tự sinh lại bằng chính script này.
#
# Quy trình đầy đủ:
#   1. Chụp trên máy ảo Android 7.1.1 (API 25) — đúng ngưỡng HSMT, không dùng bản Android đời mới:
#        cd mobile/patient_app
#        fvm flutter drive --driver=test_driver/integration_test.dart \
#                          --target=integration_test/screenshots_test.dart -d <thiết bị>
#        cp screenshots/TC-APP-*.png ../../docs/features/patient-app/screenshots/android71/
#   2. Với iOS 12: tải hiện vật `anh-man-hinh-ios` của workflow `mobile-patient-app.yml` (macOS
#      runner là đường duy nhất build được iOS từ máy Windows) rồi bung vào `screenshots/ios12/`.
#   3. bash scripts/collect-patient-app-evidence.sh
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dossier="$repo_root/docs/features/patient-app/screenshots"
dst="$repo_root/docs/architecture/evidence/spec-app"

mkdir -p "$dst"

# Chỉ nhận ảnh đặt tên đúng quy ước §2 của docs/architecture/evidence/README.md. Ảnh đặt tên khác
# (ví dụ bộ chụp cũ `android-01-login.png`) không khớp task nào nên chép sang chỉ làm nhiễu viewer.
copied=0
shopt -s nullglob
for dir in "$dossier"/android71 "$dossier"/ios12; do
  [ -d "$dir" ] || continue
  for file in "$dir"/TC-APP-*__s*__*.png; do
    cp -f "$file" "$dst/"
    copied=$((copied + 1))
  done
done

if [ "$copied" -eq 0 ]; then
  echo "Không tìm thấy ảnh nào tên dạng TC-APP-<NNN>__s<NN>__<state>.png trong $dossier" >&2
  echo "Chạy bộ chụp trước — xem phần chú thích đầu file này." >&2
  exit 1
fi

echo "Đã chép $copied ảnh sang $dst"

cd "$repo_root/docs/architecture/evidence"
node gen-manifest.mjs

echo
echo "Xong. Mở docs/architecture/evidence/index.html rồi vào phân hệ 'App mobile hỗ trợ người bệnh'."
