import React from 'react';

/**
 * Bộ máy sắp xếp dùng chung cho MỌI bảng v2.
 *
 * Vì sao phải có: `DataTable` vốn đã có khe cắm `sortable`/`onSort`, nhưng trong 176 bảng của HIS
 * chỉ đúng MỘT bảng nối vào (`opd/FollowUp.tsx`) — và bảng đó lại sắp trên `pagedRaw`, tức chỉ sắp
 * TRANG ĐANG XEM. Sắp kiểu đó tệ hơn không sắp: người dùng bấm "Ngày ↑" rồi tin rằng dòng đầu bảng
 * là sớm nhất trong toàn bộ danh sách, trong khi nó chỉ sớm nhất trong 18 dòng đang hiện.
 *
 * Nên bộ này sắp trên TOÀN BỘ tập dữ liệu rồi mới cắt trang, và không bắt trang gọi phải khai báo
 * gì thêm: giá trị so sánh được lấy từ đúng phần chữ mà người dùng NHÌN THẤY trong ô.
 */

export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: string;
  dir: SortDir;
}

/** Giá trị so sánh đã rút gọn của một ô — tính MỘT lần cho mỗi dòng, không tính lại mỗi lần so. */
interface CellKey {
  /** Ô trống / gạch ngang — luôn nằm cuối bảng, dù đang sắp tăng hay giảm. */
  blank: boolean;
  /** Số hoặc mốc thời gian (ms) nếu đọc được, ngược lại null. */
  num: number | null;
  /** Chữ đã chuẩn hoá, dùng khi không so được bằng số. */
  text: string;
}

/**
 * Những chuỗi mà bảng dùng để nói "không có dữ liệu". Chúng phải chìm xuống cuối, vì một cột toàn
 * dấu "—" nổi lên đầu khi sắp giảm dần thì coi như cột đó vô dụng.
 */
const BLANK_TOKENS = new Set(['', '-', '--', '—', '–', '…', 'n/a', 'na', 'null', 'undefined']);

const isBlankText = (s: string) => BLANK_TOKENS.has(s.trim().toLowerCase());

/**
 * Lấy phần chữ người dùng thấy trong một ô, kể cả khi ô được dựng bằng JSX lồng nhiều lớp.
 *
 * Đây là mấu chốt khiến 176 bảng có thể sắp xếp mà không phải sửa từng cột: hầu hết cột đều có
 * `render` trả về JSX (tên bệnh nhân + số điện thoại, chip trạng thái, ngày + giờ…), và `key` của
 * cột thường là tên rút gọn ('pt', 'st', 'date') KHÔNG trùng tên trường trong dữ liệu — nên đọc
 * theo `key` là hỏng. Chữ đã hiển thị mới là thứ luôn đúng.
 */
export function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).filter(Boolean).join(' ');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode } | null;
    return nodeText(props?.children);
  }
  return '';
}

const DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
const HM = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Đọc mốc thời gian từ chữ đang hiển thị. Hỗ trợ "20/09/2026", "20/09/2026 07:30", "2026-09-20" và
 * giờ trần "07:30" (dùng cho cột giờ).
 *
 * Phải thử ngày TRƯỚC khi thử số: "20/09/2026" cũng toàn chữ số, đọc nhầm thành số thì thứ tự ngày
 * sẽ sai hoàn toàn.
 */
function parseDateLike(raw: string): number | null {
  const s = raw.trim();

  const dmy = DMY.exec(s);
  if (dmy) {
    const [, d, m, y, hh, mm, ss] = dmy;
    return Date.UTC(+y, +m - 1, +d, +(hh ?? 0), +(mm ?? 0), +(ss ?? 0));
  }

  const iso = ISO.exec(s);
  if (iso) {
    const [, y, m, d, hh, mm, ss] = iso;
    return Date.UTC(+y, +m - 1, +d, +(hh ?? 0), +(mm ?? 0), +(ss ?? 0));
  }

  const hm = HM.exec(s);
  if (hm) {
    const [, hh, mm, ss] = hm;
    return (+hh * 3600 + +mm * 60 + +(ss ?? 0)) * 1000;
  }

  return null;
}

/**
 * Đọc số từ chữ đang hiển thị, chấp nhận cách viết Việt Nam: "1.234.567", "1.234.567 ₫", "12,5",
 * "85%".
 *
 * Dấu chấm chỉ bị bỏ khi nó thật sự là dấu phân nhóm nghìn (theo sau đúng 3 chữ số), nhờ vậy "12.5"
 * vẫn là mười hai phẩy năm chứ không thành một trăm hai lăm.
 */
function parseNumberLike(raw: string): number | null {
  let t = raw.trim().replace(/[\s₫đ%+]/gu, '');
  if (t === '' || !/\d/.test(t)) return null;

  if (/\d\.\d{3}(?:\D|$)/.test(t)) t = t.replace(/\./g, '');
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');

  return /^[+-]?\d+(?:\.\d+)?$/.test(t) ? Number(t) : null;
}

/** Chuyển chữ hiển thị thành khoá so sánh. */
function keyFromText(text: string): CellKey {
  const s = text.replace(/\s+/g, ' ').trim();
  if (isBlankText(s)) return { blank: true, num: null, text: '' };
  const num = parseDateLike(s) ?? parseNumberLike(s);
  return { blank: false, num, text: s };
}

/** Chuyển giá trị thô (do cột tự khai qua `sortValue`) thành khoá so sánh. */
function keyFromValue(value: unknown): CellKey {
  if (value === null || value === undefined) return { blank: true, num: null, text: '' };
  if (typeof value === 'number') {
    return Number.isNaN(value)
      ? { blank: true, num: null, text: '' }
      : { blank: false, num: value, text: String(value) };
  }
  if (typeof value === 'boolean') return { blank: false, num: value ? 1 : 0, text: String(value) };
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? { blank: true, num: null, text: '' } : { blank: false, num: t, text: value.toISOString() };
  }
  return keyFromText(String(value));
}

/**
 * So chữ theo tiếng Việt, có hiểu số nằm trong chuỗi ("A-9" đứng trước "A-10", không phải sau).
 * Tạo một lần vì `Intl.Collator` khá đắt.
 */
const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

function compareKeys(a: CellKey, b: CellKey, dir: SortDir): number {
  // Ô trống luôn ở cuối — KHÔNG đảo theo chiều sắp, nên xử lý trước khi nhân dấu.
  if (a.blank && b.blank) return 0;
  if (a.blank) return 1;
  if (b.blank) return -1;

  const raw = a.num !== null && b.num !== null ? a.num - b.num : collator.compare(a.text, b.text);
  return dir === 'asc' ? raw : -raw;
}

/** Phần khai báo cột mà bộ sắp xếp cần biết — giữ tối thiểu để không buộc phụ thuộc ngược. */
export interface SortableColumn<T> {
  key: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined;
}

/** Khoá so sánh của một ô: ưu tiên `sortValue` cột tự khai, sau đó tới chữ đang hiển thị. */
export function cellSortKey<T>(col: SortableColumn<T>, row: T): CellKey {
  if (col.sortValue) return keyFromValue(col.sortValue(row));
  if (col.render) return keyFromText(nodeText(col.render(row)));
  return keyFromValue((row as Record<string, unknown>)[col.key]);
}

/**
 * Sắp toàn bộ `rows` theo cột đang chọn.
 *
 * Khoá so sánh được tính TRƯỚC một lần cho mỗi dòng (decorate–sort–undecorate) thay vì tính trong
 * hàm so sánh: hàm so sánh chạy O(n·log n) lần, mà mỗi lần tính khoá lại phải gọi `render` của cột
 * và duyệt cây JSX.
 *
 * Trả lại chính `rows` khi không có cột nào được chọn hoặc cột đó không tồn tại — thứ tự gốc do
 * máy chủ trả về được giữ nguyên.
 */
export function sortRows<T>(
  rows: readonly T[],
  columns: readonly SortableColumn<T>[],
  sort: SortState | null,
): readonly T[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.key === sort.key);
  if (!col) return rows;

  const decorated = rows.map((row, index) => ({ row, index, key: cellSortKey(col, row) }));
  decorated.sort((a, b) => compareKeys(a.key, b.key, sort.dir) || a.index - b.index);
  return decorated.map((d) => d.row);
}

/**
 * Vòng bấm tiêu đề cột: tăng → giảm → bỏ sắp (về thứ tự gốc).
 *
 * Có nấc "bỏ sắp" vì nhiều bảng có thứ tự mặc định mang nghĩa riêng (mới nhất lên đầu, thứ tự chờ
 * khám…) — bấm nhầm một cột rồi không quay lại được thứ tự đó thì rất khó chịu.
 */
export function nextSort(current: SortState | null, key: string): SortState | null {
  if (!current || current.key !== key) return { key, dir: 'asc' };
  if (current.dir === 'asc') return { key, dir: 'desc' };
  return null;
}

/**
 * Sắp xếp cho những bảng dựng TAY (`<table className="ab-tbl">`) — loại nằm trong drawer, trong
 * tab phụ, không đi qua `DataTable`.
 *
 * Dùng chung đúng bộ máy so sánh ở trên, nên hai loại bảng không bao giờ ra hai kết quả khác nhau
 * cho cùng một dữ liệu.
 *
 * ```tsx
 * const s = useSortableRows(schedules, { ngay: (r) => r.scheduleDate, bacsi: (r) => r.doctorName });
 * <tr><SortTh s={s} k="ngay">Ngày</SortTh><SortTh s={s} k="bacsi">Bác sĩ</SortTh></tr>
 * {s.rows.map(...)}
 * ```
 *
 * KHÔNG dùng cho bảng dòng chứng từ (đơn thuốc, dòng hoá đơn, phiếu xuất kho): ở đó thứ tự dòng là
 * một phần nội dung chứ không phải cách trình bày, sắp lại là làm sai tài liệu.
 */
export interface RowSorter<T> {
  /** Dòng đã sắp — dùng thay cho mảng gốc khi render. */
  rows: T[];
  state: SortState | null;
  toggle: (key: string) => void;
}

export function useSortableRows<T>(
  rows: readonly T[],
  accessors: Record<string, (row: T) => unknown>,
): RowSorter<T> {
  const [state, setState] = React.useState<SortState | null>(null);

  // Tính thẳng như `DataTable`: `accessors` cũng là object dựng mới mỗi lần render.
  let sorted = rows as T[];
  if (state) {
    const acc = accessors[state.key];
    if (acc) {
      const columns: SortableColumn<T>[] = [{
        key: state.key,
        sortValue: (row) => acc(row) as string | number | boolean | Date | null | undefined,
      }];
      sorted = sortRows(rows, columns, state) as T[];
    }
  }

  const toggle = React.useCallback((key: string) => {
    setState((cur) => nextSort(cur, key));
  }, []);

  return { rows: sorted, state, toggle };
}
