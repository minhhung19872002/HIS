import type { ReactNode } from 'react';
import { compareBy, type SortableColumn } from './sorting';

/**
 * Gắn `sorter` cho MỌI cột của một bảng `<Table>` Antd, dùng đúng bộ so sánh của `DataTable`.
 *
 * Vì sao cần: phần lớn màn v2 đã chuyển sang `DataTable` (mặc định cột nào cũng sắp được), nhưng
 * vẫn còn một số bảng Antd nằm trong modal/tab phụ. Khai `sorter` tay cho từng cột ở đó vừa dài
 * vừa dễ ra kết quả khác `DataTable` cho cùng một dữ liệu — ngày kiểu Việt Nam, tiền "1.234.567",
 * chữ có dấu mỗi nơi hiểu một kiểu.
 *
 * Cột được suy ra khoá so sánh theo thứ tự: `dataIndex` (giá trị thô trong dữ liệu) → `render`
 * (chữ người dùng nhìn thấy). Cột không có cả hai — cột toàn nút bấm — được bỏ qua.
 *
 * Cột đã tự khai `sorter` thì giữ nguyên, và cột nào KHÔNG nên sắp (ô nhập liệu, số thứ tự dòng
 * chứng từ) thì khai `sorter: false` để hàm này bỏ qua.
 *
 * Kiểu tham số cố tình để lỏng (`C` là chính kiểu phần tử của mảng truyền vào, trả lại đúng kiểu
 * đó): buộc theo `ColumnsType<T>` của Antd khiến `tsc` phải suy luận qua một union rất nặng, đủ để
 * làm bung heap khi cả repo cùng biên dịch.
 */
export function withSorters<C>(columns: readonly C[]): C[] {
  return columns.map((column) => {
    const col = column as AntdColumnLike;

    // Cột nhóm (có `children`) chỉ là tiêu đề gộp — sắp xếp nằm ở các cột con.
    if (Array.isArray(col.children)) {
      return { ...col, children: withSorters(col.children) } as C;
    }

    if (col.sorter !== undefined) return column;
    // Cột không có tiêu đề là cột nút bấm — không có gì để sắp, mà gắn `sorter` vào thì Antd lại
    // vẽ mũi tên sắp xếp lên một ô trống.
    if (typeof col.title === 'string' && col.title.trim() === '') return column;
    if (col.title === undefined) return column;

    const sortable = sortableColumnOf(col);
    return sortable ? ({ ...col, sorter: compareBy(sortable) } as C) : column;
  });
}

/** Phần khai báo cột của Antd mà hàm trên thực sự đụng tới. */
interface AntdColumnLike {
  title?: unknown;
  key?: string | number;
  dataIndex?: string | number | readonly (string | number)[];
  render?: (value: unknown, record: unknown, index: number) => unknown;
  sorter?: unknown;
  children?: unknown;
}

/** Mô tả cột theo cách `sorting.ts` hiểu; trả `null` khi cột không có gì để so sánh. */
function sortableColumnOf(col: AntdColumnLike): SortableColumn<unknown> | null {
  const key = String(col.key ?? (Array.isArray(col.dataIndex) ? col.dataIndex.join('.') : col.dataIndex ?? ''));

  if (col.dataIndex !== undefined) {
    const path = Array.isArray(col.dataIndex)
      ? (col.dataIndex as readonly (string | number)[])
      : [col.dataIndex as string | number];
    return { key, sortValue: (row) => valueAt(row, path) };
  }

  if (col.render) {
    // Không có `dataIndex` thì Antd truyền chính bản ghi vào chỗ `value`. Chỉ số dòng truyền 0 —
    // cột đánh số thứ tự vì thế sắp vô nghĩa, nên cột đó phải tự khai `sorter: false`.
    const render = col.render;
    return { key, render: (row) => render(row, row, 0) as ReactNode };
  }

  return null;
}

function valueAt(
  row: unknown,
  path: readonly (string | number)[],
): string | number | boolean | Date | null | undefined {
  let cur: unknown = row;
  for (const seg of path) {
    if (cur === null || cur === undefined) return null;
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  if (cur === null || cur === undefined) return null;
  if (typeof cur === 'string' || typeof cur === 'number' || typeof cur === 'boolean' || cur instanceof Date) return cur;
  return String(cur);
}
