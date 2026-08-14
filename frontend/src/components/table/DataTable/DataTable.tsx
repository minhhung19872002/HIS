import React from 'react';
import { Spinner } from '../../common/Spinner/Spinner';
import { LoadingState } from '../../dataDisplay/Loading';

// ─────────────────────────── Data table ───────────────────────────

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  mono?: boolean;
  code?: boolean;
  width?: string | number;
}

export function DataTable<T>({
  columns, data, rowKey, onRowClick, actions, selected, onToggle, onToggleAll, empty = 'Không có dữ liệu',
  loading,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  selected?: Set<string> | null;
  onToggle?: (key: string) => void;
  onToggleAll?: () => void;
  empty?: React.ReactNode;
  /** true khi đang fetch: bảng rỗng → LoadingState; đang có dữ liệu (reload) → dim + chip spinner. */
  loading?: boolean;
}) {
  const allChecked = !!selected && data.length > 0 && data.every((r) => selected.has(rowKey(r)));
  const colSpan = (selected ? 1 : 0) + columns.length + (actions ? 1 : 0);
  const reloading = !!loading && data.length > 0;
  return (
    <div className={reloading ? 'ab-tbl-wrap is-reloading' : 'ab-tbl-wrap'}>
      {reloading && (
        <div className="ab-tbl-reload" role="status" aria-live="polite">
          <span className="chip"><Spinner size="sm" /> Đang tải…</span>
        </div>
      )}
      <table className="ab-tbl" aria-busy={loading || undefined}>
        <thead>
          <tr>
            {selected && (
              <th className="ck">
                <input type="checkbox" checked={allChecked} onChange={onToggleAll} />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} style={c.width !== undefined ? { width: c.width } : undefined}>{c.label}</th>
            ))}
            {actions && <th className="act">Hành động</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={colSpan} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t-2)' }}>
                {loading ? <LoadingState /> : empty}
              </td>
            </tr>
          )}
          {data.map((r) => {
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
