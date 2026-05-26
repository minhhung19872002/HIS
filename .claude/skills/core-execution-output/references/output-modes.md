# Execution output — 3 chế độ + trigger + checklist an toàn

## Bảng 3 chế độ
| Chế độ | Khi nào | Hiển thị gì |
|---|---|---|
| **CONCISE** (mặc định) | task thường | tóm tắt cụm hành động, tiến trình cấp cao; KHÔNG log thô / temp path / dump thăm dò / trace từng lệnh / poll task nền |
| **AUTO-EXPAND** | tự bật khi 1 trigger lỗi xảy ra | lệnh lỗi chính xác + stderr/stdout liên quan nguyên nhân gốc + tóm tắt hành động |
| **DEBUG** | user bật rõ / cần troubleshoot sâu / user xin log thô | full command trace + full shell output + log task nền + log thăm dò |

## Trigger tự chuyển AUTO-EXPAND
- build thất bại
- test thất bại
- lệnh exit ≠ 0
- migration thất bại
- xung đột git
- timeout
- runtime error
- thao tác nhạy cảm bảo mật
- user yêu cầu chi tiết rõ ràng

Khi expand: chỉ log liên quan nguyên nhân gốc, tránh log vô quan, kèm tóm tắt có thể hành động.

## Báo cáo thay đổi code — collapse diff mặc định
Mặc định CHỈ tóm tắt: file nào · thay đổi gì (mức cao) · lý do. KHÔNG in full diff mỗi file.
Bung diff đầy đủ chỉ khi: user yêu cầu · refactor lớn/rủi ro · security/auth · migration/schema ·
thao tác phá huỷ · debug/review · build/test fail.

## Checklist "LUÔN NÊU dù đang CONCISE" (an toàn override)
- [ ] Xoá tệp / thư mục (`rm`, xoá hàng loạt)
- [ ] `git reset --hard`, force-push, rebase, revert, xoá branch
- [ ] Migration / drop / truncate / seed DB; thay đổi schema
- [ ] Cài / gỡ package (npm, nuget, pip…)
- [ ] Đổi biến môi trường / secret / config nhạy cảm
- [ ] Cảnh báo quyền / bảo mật
- [ ] Bất kỳ thao tác khó đảo ngược / phá huỷ

## Bất biến an toàn (không bao giờ vi phạm)
1. Không che giấu lỗi nghiêm trọng.
2. Không giả mạo tiến trình.
3. Không tuyên bố thành công khi chưa verify (exit code / kết quả thật).
4. Luôn hiển thị thao tác nguy hiểm + cảnh báo bảo mật.
