"""Nối sắp xếp cho mọi bảng v2 đang tự cắt trang trước khi đưa dữ liệu vào `DataTable`.

Vì sao cần chạy hàng loạt: `DataTable` sắp trên đúng tập dòng mà nó nhận được. Trang nào cắt trang
sẵn rồi mới truyền vào thì bảng chỉ sắp được 18 dòng đang hiện — người dùng bấm "Ngày ↑" và tin
rằng dòng đầu bảng là sớm nhất của cả danh sách, trong khi không phải. Nên phải đổi thành truyền
TOÀN BỘ danh sách đã lọc + `page`/`perPage` để bảng tự cắt SAU khi sắp.

    const paged = filtered.slice(page * PER, (page + 1) * PER);   ← xoá
    <DataTable data={paged} />                                    ← data={filtered} page perPage

Chạy: python scripts/wire-grid-sort.py [--apply]
Không có --apply thì chỉ in ra dự định, không ghi gì.
"""
from __future__ import annotations

import io
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"

# const paged = <nguồn>.slice(page * <PER>, (page + 1) * <PER>);
PAGED_DECL = re.compile(
    r"^[ \t]*const paged = ([A-Za-z_$][\w$.]*)\.slice\(\s*page \* ([A-Za-z_$][\w$]*),\s*"
    r"\(page \+ 1\) \* \2\s*\);[ \t]*\r?\n",
    re.MULTILINE,
)


def rewrite(text: str) -> tuple[str, str] | None:
    m = PAGED_DECL.search(text)
    if not m:
        return None
    source, per = m.group(1), m.group(2)

    if "data={paged}" not in text:
        return None

    # `paged` dùng ở chỗ nào khác ngoài khai báo và ô data → để nguyên, không tự đoán.
    others = [
        u for u in re.finditer(r"\bpaged\b", text)
        if not (m.start() <= u.start() < m.end())
        and text[max(0, u.start() - 6):u.start()] != "data={"
    ]
    if others:
        return None, f"bỏ qua: `paged` còn được dùng {len(others)} chỗ khác"

    has_set_page = re.search(r"\bsetPage\b", text) is not None

    def replace_data(mo: re.Match[str]) -> str:
        indent = mo.group(1)
        if indent is None:  # nằm chung dòng với thuộc tính khác
            extra = f" page={{page}} perPage={{{per}}}"
            if has_set_page:
                extra += " onSortChange={() => setPage(0)}"
            return f"data={{{source}}}{extra}"
        extra = f"\n{indent}page={{page}}\n{indent}perPage={{{per}}}"
        if has_set_page:
            extra += f"\n{indent}onSortChange={{() => setPage(0)}}"
        return f"{indent}data={{{source}}}{extra}"

    out = re.sub(r"(?:^([ \t]+))?data=\{paged\}", replace_data, text, flags=re.MULTILINE)
    out = PAGED_DECL.sub("", out, count=1)
    return out, f"data={{{source}}} + page/perPage={per}"


def main() -> int:
    apply = "--apply" in sys.argv
    changed = skipped = 0
    for path in sorted(SRC.rglob("*.tsx")):
        text = io.open(path, encoding="utf-8").read()
        result = rewrite(text)
        if result is None:
            continue
        new, note = result
        rel = path.relative_to(SRC.parent)
        if new is None:
            print(f"  SKIP {rel} — {note}")
            skipped += 1
            continue
        if apply:
            io.open(path, "w", encoding="utf-8", newline="").write(new)
        print(f"  {'OK  ' if apply else 'WILL'} {rel} — {note}")
        changed += 1
    print(f"\n{changed} tệp đổi, {skipped} tệp bỏ qua. {'ĐÃ GHI' if apply else 'chạy thử, chưa ghi'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
