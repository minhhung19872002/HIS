"""#219/T4 — thêm mã `error` cho các phản hồi lỗi viết tay ở controller.

#219 muốn lỗi có MỘT hình dạng để giao diện chỉ viết một error-handler. Đo thực tế
(`t4_error_envelope.py`) cho ra **3 hình dạng**:

    {error, message}          ← DomainExceptionFilter, chiếm đa số
    {error, field, message}   ← model-binding (thêm `field`, vẫn là siêu tập của trên)
    {message}                 ← các `NotFound(new { message = ... })` viết tay ở controller

Cái lệch thật là hình dạng thứ ba: thiếu `error` nên FE không đọc được mã lỗi, phải đoán theo HTTP
status hoặc theo chuỗi tiếng Việt.

Phép sửa THUẦN BỔ SUNG — chỉ thêm trường `error`, không đụng `message`:
    NotFound(new { message = X })   → NotFound(new { error = "NOT_FOUND", message = X })
    BadRequest(new { message = X }) → BadRequest(new { error = "VALIDATION_FAILED", message = X })

Mã dùng đúng chuỗi mà DomainExceptionFilter đang phát, để hai đường hội tụ về cùng bộ mã.
Người đọc `message` cũ không bị ảnh hưởng.

    python add_error_code_to_handwritten.py --dry
    python add_error_code_to_handwritten.py --apply
"""
import io, os, re, sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = r"D:\Source\HIS\backend\src\HIS.API\Controllers"

PATTERNS = [
    (re.compile(r'NotFound\(new \{ message = '), 'NotFound(new { error = "NOT_FOUND", message = ', "NOT_FOUND"),
    (re.compile(r'BadRequest\(new \{ message = '), 'BadRequest(new { error = "VALIDATION_FAILED", message = ', "VALIDATION_FAILED"),
]


def main(apply: bool):
    tally = Counter()
    touched = 0
    for fn in sorted(os.listdir(ROOT)):
        if not fn.endswith(".cs"):
            continue
        p = os.path.join(ROOT, fn)
        src = io.open(p, encoding="utf-8-sig").read()
        out = src
        per_file = Counter()
        for rx, repl, code in PATTERNS:
            out, n = rx.subn(repl, out)
            if n:
                per_file[code] += n
                tally[code] += n
        if per_file:
            touched += 1
            print("%-46s %s" % (fn, dict(per_file)))
            if apply:
                io.open(p, "w", encoding="utf-8", newline="").write(out)
    print("\n== %d file · %d NOT_FOUND · %d VALIDATION_FAILED ==" %
          (touched, tally["NOT_FOUND"], tally["VALIDATION_FAILED"]))


if __name__ == "__main__":
    main(apply="--apply" in sys.argv)
