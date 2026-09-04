"""T3 (#218) — DÒ cái thói quen đã gây ra ba lỗi trong đợt: MƯỢN Ô TRẠNG THÁI CỦA TÍNH NĂNG KHÁC.

Ba lần trong đợt này, cùng một cách hỏng ở ba module khác nhau, ba người viết khác nhau:

* §20 — đóng hồ sơ bệnh án ghi `Examinations.Status = 5` với ý "đã đóng", trong khi 5 là **"Hủy"**;
* §24 — chú thích `Admissions.Status` nói `1-Chuyển khoa(legacy), 2-Xuất viện`, còn mã đang chạy
  ánh xạ `Ra viện→1, Chuyển viện→2`, tức nói ngược;
* §28 — gửi Cổng ĐTQG ghi `Prescriptions.Status = 1` với ý "đã gửi", trong khi 1 là **"Đã duyệt"**
  (dược sĩ duyệt cấp phát), và "hủy gửi" ghi `4` = **"Hủy"**, voiding luôn đơn thuốc.

Ba lỗi rời rạc thì vá ba lần. Nhưng ba lần cùng một hình dạng thì đó là một **thói quen**: cần một
trạng thái mới thì mượn tạm ô sẵn có thay vì thêm một ô. Script này biến việc "tình cờ tìm ra" thành
"đã rà".

**Cách dò.** Mỗi chỗ gán `x.Status = <số>;` mà có chú thích ngay sau đều là một lời khai: người viết
đang nói con số đó nghĩa là gì. Gom mọi lời khai theo cặp *(tên biến, giá trị)*; nếu cùng một cặp mà
có hai lời khai **mâu thuẫn** thì hoặc hai chỗ đang nói về hai thực thể khác nhau (vô hại), hoặc một
trong hai đang mượn ô của cái kia (đúng lỗi cần tìm).

Script **không tự kết luận** — nó chỉ thu hẹp từ hàng nghìn dòng xuống một danh sách ngắn để đọc
bằng mắt. Chạy lần đầu 2026-09-04: 14 cặp, đọc hết thì 13 là trùng tên biến chung chung
(`entity`, `request`, `session`, `d`, `e` dùng cho nhiều thực thể khác nhau), và 1 là chính §20 —
nghĩa là **không còn trường hợp thứ tư nào chưa vá**.

Không cần API hay DB — chỉ đọc mã nguồn.
"""
import collections, io, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "..",
                                    "backend", "src", "HIS.Infrastructure", "Services"))

ASSIGN = re.compile(r'\b(\w+)\.Status\s*=\s*(\d+)\s*;\s*//\s*(.+)')

# Tên biến quá chung, dùng cho nhiều thực thể khác nhau nên mâu thuẫn là chuyện đương nhiên.
GENERIC = {"entity", "item", "obj", "result", "d", "e", "s", "x", "r", "b", "p", "t"}


def main():
    if not os.path.isdir(ROOT):
        raise SystemExit("khong thay thu muc Services: %s" % ROOT)

    by_pair = collections.defaultdict(set)
    for dirpath, _, filenames in os.walk(ROOT):
        for filename in sorted(filenames):
            if not filename.endswith(".cs"):
                continue
            path = os.path.join(dirpath, filename)
            text = io.open(path, encoding="utf-8-sig", errors="replace").read()
            for var, value, comment in ASSIGN.findall(text):
                label = comment.strip().split("(")[0].strip().rstrip(".")[:40]
                by_pair[(var.lower(), value)].add((label, os.path.relpath(path, ROOT)))

    suspicious = []
    for (var, value), claims in sorted(by_pair.items()):
        labels = {label for label, _ in claims}
        if len(labels) > 1:
            suspicious.append((var, value, sorted(claims)))

    strong = [row for row in suspicious if row[0] not in GENERIC]

    print("Số cặp (biến, giá trị) có lời khai mâu thuẫn: %d" % len(suspicious))
    print("Trong đó tên biến ĐỦ CỤ THỂ để đáng đọc:       %d\n" % len(strong))

    for var, value, claims in strong:
        print("  %s.Status = %s" % (var, value))
        for label, where in claims:
            print("      // %-34s  %s" % (label, where))
        print()

    print("Script chỉ THU HẸP phạm vi, không tự kết luận: hai chỗ nói khác nhau có thể chỉ là hai")
    print("thực thể khác nhau trùng tên biến. Phải mở từng chỗ ra đọc mới biết đâu là mượn ô thật.")


if __name__ == "__main__":
    main()
