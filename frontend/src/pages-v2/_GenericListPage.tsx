import React from 'react';
import { useNavigate } from 'react-router-dom';
import TermIcon from '../layouts/terminal/Icon';

export type ColumnDef<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  width?: string;
};

export type StatDef = {
  label: string;
  value: number | string;
  tone?: 'warn' | 'cy' | 'ok' | 'crit';
};

export type GenericListPageProps<T extends { id: string }> = {
  title: string;
  v1Path: string;
  items: T[];
  loading: boolean;
  keyword: string;
  onKeywordChange: (k: string) => void;
  onSearch: () => void;
  searchPlaceholder?: string;
  columns: ColumnDef<T>[];
  selectedId?: string;
  onSelect: (item: T) => void;
  detailTitle: string;
  detailFields: { label: string; value: React.ReactNode }[] | null;
  stats: StatDef[];
  emptyText?: string;
};

export function GenericListPage<T extends { id: string }>(props: GenericListPageProps<T>) {
  const navigate = useNavigate();
  const {
    title, v1Path, items, loading, keyword, onKeywordChange, onSearch,
    searchPlaceholder = 'Tìm kiếm...', columns, selectedId, onSelect,
    detailTitle, detailFields, stats, emptyText = 'Không có dữ liệu',
  } = props;

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">{title} · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 220 }} placeholder={searchPlaceholder}
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }} />
            <button className="btn primary" type="button" onClick={onSearch}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate(v1Path)}>
              <TermIcon name="layers" size={12} />Mở v1
            </button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>{emptyText}</div> : (
              <table className="tbl">
                <thead><tr>{columns.map((c) => <th key={c.key} style={{ width: c.width }}>{c.label}</th>)}</tr></thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className={selectedId === row.id ? 'sel' : ''}
                      onClick={() => onSelect(row)}
                      style={{ cursor: 'pointer' }}
                    >
                      {columns.map((c) => <td key={c.key} className={c.className}>{c.render(row)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Tổng quan</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
                  <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{s.label}</div>
                  <div style={{
                    fontSize: 22, fontWeight: 600, marginTop: 4,
                    color: s.tone === 'warn' ? 'var(--s-warn)'
                      : s.tone === 'cy' ? 'var(--a-cy)'
                      : s.tone === 'ok' ? 'var(--s-ok)'
                      : s.tone === 'crit' ? 'var(--s-crit)'
                      : 'var(--t-0)',
                  }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết</span>
            <span className="sub">{detailTitle}</span>
          </div>
          <div className="panel-body pad">
            {!detailFields ? <div className="ph">Chọn dòng để xem chi tiết</div> : (
              <div className="stack-sm">
                {detailFields.map((f, i) => (
                  <div key={i}>
                    <div className="label">{f.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--t-0)' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
