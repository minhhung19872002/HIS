# Cổng quyết định HỎI vs TỰ-QUYẾT + mẫu câu hỏi

## Cổng quyết định (chạy cho từng ẩn số ảnh hưởng kết quả)

```
Ẩn số này…
├─ Tự verify được bằng Read/Grep?        → KHÔNG hỏi user; verify (core-verify-before-assert).
├─ Có default hiển nhiên + verify được?  → TỰ QUYẾT, ghi "Giả định: ...".
└─ Thoả ≥1 điều kiện sau → HỎI USER:
     • đổi hành vi/kết quả quan trọng
     • khó đảo ngược (xoá/ghi đè/migration phá vỡ)
     • ≥2 cách hiểu cho ra kết quả khác nhau
     • đụng patient-safety / pháp lý / tiền
```

## Mẫu câu hỏi gộp (1–2 câu, mỗi câu 2–4 option + khuyến nghị)

> Tôi cần chốt vài điểm trước khi làm [X]:
> 1. [Ẩn số A]? — (a) … *(khuyến nghị)* / (b) … / (c) …
> 2. [Ẩn số B]? — (a) … / (b) …

Ưu tiên dùng tool `AskUserQuestion` (option + recommended ở đầu). Gộp tối đa, KHÔNG hỏi rời rạc.

## Mẫu "Giả định đã chốt" (khi proceed)

> Giả định đã chốt (bác lại nếu sai):
> - [Ẩn số A] → chọn … vì … (verify tại `path`).
> - [Ẩn số B] → theo tiền lệ … .
> Tiến hành: …
