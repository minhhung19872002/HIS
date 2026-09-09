import React from 'react';
import { Spinner } from '../../common/Spinner/Spinner';
import { LoadingState } from '../../dataDisplay/Loading';
import { nextSort, sortRows, type SortState } from './sorting';

export type { SortDir, SortState } from './sorting';

// ─────────────────────────── Data table ───────────────────────────

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  mono?: boolean;
  code?: boolean;
  width?: string | number;

  /**
   * Mặc định MỌI cột đều sắp xếp được. Đặt `false` cho cột không có nghĩa khi sắp (ô toàn nút bấm,
   * ảnh, ô ghép nhiều thứ không so sánh được).
   */
  sortable?: boolean;
  /**
   * Giá trị so sánh do cột tự khai — chỉ cần khi chữ hiển thị không phản ánh đúng thứ tự (ví dụ ô
   * hiện "3 ngày trước" nhưng phải sắp theo mốc thời gian thật).
   */
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined;

  /**
   * Trang tự giữ trạng thái sắp xếp. Chỉ dùng khi việc sắp phải chạy ở máy chủ; còn lại cứ để
   * `DataTable` tự lo, vì trang tự sắp rất dễ sắp nhầm trên tập ĐÃ CẮT TRANG.
   */
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export function DataTable<T>({
  columns, data, rowKey, onRowClick, actions, selected, onToggle, onToggleAll, empty = 'Không có dữ liệu',
  loading, sortable = true, defaultSort = null, page, perPage, onSortChange, sortScope = 'all',
}: {
  columns: ColumnDef<T>[];
  /**
   * TOÀN BỘ dòng sau khi lọc — KHÔNG cắt trang sẵn.
   *
   * Muốn cắt trang thì truyền thêm `page` + `perPage` để bảng tự cắt SAU khi sắp. Tự cắt ở ngoài
   * rồi mới đưa vào đây nghĩa là chỉ sắp được đúng trang đang xem, và người dùng sẽ tin nhầm rằng
   * dòng đầu bảng là lớn nhất của cả danh sách.
   */
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  selected?: Set<string> | null;
  onToggle?: (key: string) => void;
  /**
   * Chọn/bỏ chọn cả trang. Nhận đúng những dòng ĐANG HIỆN (đã sắp, đã cắt trang) — trang gọi không
   * tự dựng lại được tập này nữa vì thứ tự do bảng quyết định.
   */
  onToggleAll?: (visibleRows: T[]) => void;
  empty?: React.ReactNode;
  /** true khi đang fetch: bảng rỗng → LoadingState; đang có dữ liệu (reload) → dim + chip spinner. */
  loading?: boolean;
  /** Tắt sắp xếp cho cả bảng (bảng chỉ đọc, thứ tự cố định mang nghĩa nghiệp vụ). */
  sortable?: boolean;
  /** Cột sắp mặc định khi mở trang. */
  defaultSort?: SortState | null;
  /** Trang hiện tại (0-based) — chỉ cần khi muốn bảng tự cắt trang. */
  page?: number;
  /** Số dòng mỗi trang — chỉ cần khi muốn bảng tự cắt trang. */
  perPage?: number;
  /** Gọi khi người dùng đổi cột sắp — trang thường dùng để quay về trang đầu. */
  onSortChange?: (sort: SortState | null) => void;
  /**
   * Phạm vi sắp xếp.
   *
   * `'all'` (mặc định): bảng cầm toàn bộ dữ liệu, sắp xong mới cắt trang.
   *
   * `'page'`: bảng phân trang ở MÁY CHỦ nên chỉ cầm được trang đang tải — sắp chỉ có tác dụng
   * trong trang đó. Đặt cờ này để bảng nói thẳng điều đó ra màn hình; im lặng thì người dùng sẽ
   * tin rằng dòng đầu bảng là lớn nhất của cả danh sách, và đó là hiểu nhầm do mình gây ra.
   */
  sortScope?: 'all' | 'page';
}) {
  const [sort, setSort] = React.useState<SortState | null>(defaultSort);

  // Tính thẳng, KHÔNG `useMemo`: `columns` là mảng dựng mới ở mỗi lần render của trang gọi nên
  // không làm dependency được, và nhét nó vào ref rồi đọc trong lúc render là phạm quy tắc hook.
  // Chi phí ở đây gần như bằng không khi chưa chọn cột nào — `sortRows` trả ngay mảng gốc.
  const sorted = sortable && sort ? sortRows(data, columns, sort) : data;
  const from = (page ?? 0) * (perPage ?? 0);
  const view = perPage === undefined ? (sorted as T[]) : (sorted as T[]).slice(from, from + perPage);

  const toggleSort = (key: string) => {
    const next = nextSort(sort, key);
    setSort(next);
    onSortChange?.(next);
  };

  const allChecked = !!selected && view.length > 0 && view.every((r) => selected.has(rowKey(r)));
  const colSpan = (selected ? 1 : 0) + columns.length + (actions ? 1 : 0);
  const reloading = !!loading && view.length > 0;
  return (
    <div className={reloading ? 'ab-tbl-wrap is-reloading' : 'ab-tbl-wrap'}>
      {reloading && (
        <div className="ab-tbl-reload" role="status" aria-live="polite">
          <span className="chip"><Spinner size="sm" /> Đang tải…</span>
        </div>
      )}
      {sort && sortScope === 'page' && (
        <div className="ab-tbl-sortnote" role="note">
          Đang sắp theo “{columns.find((c) => c.key === sort.key)?.label ?? sort.key}” trong phạm vi
          trang đang tải — danh sách này phân trang ở máy chủ, đổi trang sẽ sắp lại theo trang mới.
        </div>
      )}
      <table className="ab-tbl" aria-busy={loading || undefined}>
        <thead>
          <tr>
            {selected && (
              <th className="ck">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => onToggleAll?.(view)}
                />
              </th>
            )}

            {columns.map((c) => {
              // Cột tự giữ trạng thái (`onSort`) thì tôn trọng trang gọi; còn lại bảng tự lo.
              const controlled = !!c.onSort;
              const canSort = controlled || (sortable && c.sortable !== false);
              const dir = controlled
                ? c.sortDirection ?? null
                : sort?.key === c.key ? sort.dir : null;
              const onActivate = controlled ? c.onSort : () => toggleSort(c.key);

              return (
                <th
                  key={c.key}
                  style={c.width !== undefined ? { width: c.width } : undefined}
                  className={canSort ? 'sortable' : undefined}
                  onClick={canSort ? onActivate : undefined}
                  // Bàn phím phải bấm được: đây là điều khiển thật, không phải nhãn trang trí.
                  tabIndex={canSort ? 0 : undefined}
                  aria-sort={canSort ? (dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none') : undefined}
                  onKeyDown={canSort ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate?.(); }
                  } : undefined}
                  title={canSort ? `Sắp xếp theo ${c.label}` : undefined}
                >
                  {canSort ? (
                    <span className="ab-th-sort">
                      <span>{c.label} </span>

                      <span
                        className={`ab-sort-icon ${dir || ''}`}
                        aria-hidden="true"
                      >
                        {dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '↕'}
                      </span>
                    </span>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}

            {actions && <th className="act">Hành động</th>}
          </tr>
        </thead>
        <tbody>
          {view.length === 0 && (
            <tr>
              <td colSpan={colSpan} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t-2)' }}>
                {loading ? <LoadingState /> : empty}
              </td>
            </tr>
          )}
          {view.map((r) => {
            const k = rowKey(r);
            const on = !!selected && selected.has(k);
            return (
              <tr
                key={k}
                className={on ? 'on' : ''}
                data-row-clickable={onRowClick ? 'true' : undefined}
              >
                {selected && (
                  <td className="ck">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => { e.stopPropagation(); onToggle?.(k); }}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`${c.mono ? 'mono' : ''} ${c.code ? 'code' : ''}`.trim()}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                  >
                    {c.render ? c.render(r) : (r as Record<string, unknown>)[c.key] as React.ReactNode}
                  </td>
                ))}
                {actions && <td className="act">{actions(r)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
