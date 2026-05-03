/**
 * v2 Module Kit — typed React port of design-system/project/mod-v2-kit.jsx.
 *
 * The design pack ships an `ab-*` design language (mod-appt-booking.css)
 * used across every "v2" HTML prototype — Reports v2, Billing v2, OPD v2,
 * EMR v2, ER v2, etc. The kit is the canonical way to compose those pages
 * from KPI strip + tabs + toolbar + table + drawer detail. The frontend
 * imports `ab-module.css` (port of mod-appt-booking.css) globally via
 * TerminalLayout, so any page that uses these components picks up the
 * styles automatically.
 *
 * What changed from the prototype:
 * - `HUI.toast` / `HUI.modal` / `HUI.confirm` → Antd `message` / `Modal`.
 *   The kit exposes `tk/ti/tw/te` helpers so call-sites stay terse.
 * - `HUI.drawer` is replaced by the consumer managing drawer open state +
 *   rendering the provided `<DrawerShell>` component. This fits React
 *   declarative idiom better than the imperative `cx => ...` callback.
 * - All components are typed.
 *
 * If you're writing a new v2 page, import these components, wire your
 * data + API calls, and render them in this layout — KpiStrip + TopTabs
 * + DataTable + DrawerShell is the standard 4-piece composition.
 */
import React from 'react';
import { Drawer, Modal, message } from 'antd';
import TermIcon from '../layouts/terminal/Icon';

// ─────────────────────────── KPI strip ───────────────────────────

export type KpiTone = 'ok' | 'info' | 'warn' | 'crit' | undefined;

export interface KpiItem {
  lbl: string;
  val: number | string;
  unit?: string;
  sub?: string;
  tone?: KpiTone;
}

export const KpiStrip: React.FC<{ items: KpiItem[] }> = ({ items }) => (
  <div className="ab-kpis">
    {items.map((k, i) => (
      <div key={i} className={`ab-kpi ${k.tone ?? ''}`}>
        <div className="lbl">{k.lbl}</div>
        <div className="val">
          {k.val}
          {k.unit && <small style={{ fontSize: 13, color: 'var(--t-2)', marginLeft: 3 }}>{k.unit}</small>}
        </div>
        {k.sub && <div className="sub">{k.sub}</div>}
      </div>
    ))}
  </div>
);

// ─────────────────────────── Top tabs ───────────────────────────

export interface TopTab<T extends string> {
  v: T;
  l: string;
  ic?: string;
}

export function TopTabs<T extends string>({
  tab, setTab, tabs, actions,
}: {
  tab: T;
  setTab: (v: T) => void;
  tabs: TopTab<T>[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="ab-toptabs">
      {tabs.map((t) => (
        <button key={t.v} className={tab === t.v ? 'on' : ''} onClick={() => setTab(t.v)} type="button">
          {t.ic && <TermIcon name={t.ic} size={13} />} {t.l}
        </button>
      ))}
      <span className="spacer" />
      {actions}
    </div>
  );
}

// ───────────────────────── Status sub-tabs ─────────────────────────

export type StatusTone = 'ok' | 'info' | 'warn' | 'crit';

export interface StatusTab<T extends string> {
  v: T;
  l: string;
  tone: StatusTone;
}

export function StatusTabs<T extends string>({
  value, onChange, tabs, counts,
}: {
  value: T | 'all';
  onChange: (v: T | 'all') => void;
  tabs: StatusTab<T>[];
  counts: Record<string, number>;
}) {
  return (
    <div className="ab-stab">
      <button type="button" className={value === 'all' ? 'on' : ''} onClick={() => onChange('all')}>
        Tất cả <i>{counts.all || 0}</i>
      </button>
      {tabs.map((s) => (
        <button key={s.v} type="button" className={value === s.v ? 'on' : ''} onClick={() => onChange(s.v)}>
          <span className={`ab-dot ${s.tone}`} /> {s.l} <i>{counts[s.v] || 0}</i>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────── Search box ───────────────────────────

export const SearchBox: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minWidth?: number | string;
}> = ({ value, onChange, placeholder, minWidth = 280 }) => (
  <div className="ab-search" style={{ minWidth, flex: `1 1 ${typeof minWidth === 'number' ? minWidth + 'px' : minWidth}` }}>
    <TermIcon name="search" size={13} />
    <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    {value && (
      <button type="button" onClick={() => onChange('')}>
        <TermIcon name="x" size={11} />
      </button>
    )}
  </div>
);

// ─────────────────────────── Filter (select) ───────────────────────────

export const Filter: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => (
  <select className="ab-sel" value={value} onChange={(e) => onChange(e.target.value)}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

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
}) {
  const allChecked = !!selected && data.length > 0 && data.every((r) => selected.has(rowKey(r)));
  const colSpan = (selected ? 1 : 0) + columns.length + (actions ? 1 : 0);
  return (
    <div className="ab-tbl-wrap">
      <table className="ab-tbl">
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
              <td colSpan={colSpan} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t-2)' }}>{empty}</td>
            </tr>
          )}
          {data.map((r) => {
            const k = rowKey(r);
            const on = !!selected && selected.has(k);
            return (
              <tr key={k} className={on ? 'on' : ''}>
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

// ─────────────────────────── Pager ───────────────────────────

export const Pager: React.FC<{
  page: number;
  totalPages: number;
  setPage: (next: number | ((p: number) => number)) => void;
  total: number;
  perPage: number;
}> = ({ page, totalPages, setPage, total, perPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderTop: '1px solid var(--line)',
      background: '#fff', fontSize: 12, color: 'var(--t-2)', flexShrink: 0,
    }}>
      <span>
        Hiển thị <b style={{ color: 'var(--t-0)' }}>
          {page * perPage + 1}–{Math.min((page + 1) * perPage, total)}
        </b> / {total}
      </span>
      <span style={{ flex: 1 }} />
      <button type="button" className="ab-btn ghost sm" onClick={() => setPage(0)} disabled={page === 0}>«</button>
      <button type="button" className="ab-btn ghost sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{page + 1}/{totalPages}</span>
      <button type="button" className="ab-btn ghost sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
      <button type="button" className="ab-btn ghost sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
    </div>
  );
};

// ─────────────────────────── Status badge ───────────────────────────

export const StatusBadge: React.FC<{
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
}> = ({ tone = 'info', children, dot }) => (
  <span className={`ab-stat ${tone}`}>
    {dot && <span className={`ab-dot ${tone}`} />}
    {children}
  </span>
);

// ─────────────────────────── Action icon button ───────────────────────────

export const ActBtn: React.FC<{
  ic: string;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: 'crit' | 'warn';
}> = ({ ic, title, onClick, tone }) => (
  <button
    type="button"
    className="ab-iconbtn"
    title={title}
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    style={tone === 'crit' ? { color: 'var(--s-crit)' } : tone === 'warn' ? { color: 'var(--s-warn)' } : undefined}
  >
    <TermIcon name={ic} size={12} />
  </button>
);

// ─────────────────────────── Drawer section / field ───────────────────────────

export const DrSec: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <section style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <h4 style={{
        margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-2)',
      }}>{title}</h4>
      {action}
    </div>
    {children}
  </section>
);

export const DrField: React.FC<{
  lbl: string;
  children: React.ReactNode;
}> = ({ lbl, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, padding: '4px 0', fontSize: 12.5 }}>
    <div style={{ color: 'var(--t-2)' }}>{lbl}</div>
    <div style={{ color: 'var(--t-0)' }}>{children}</div>
  </div>
);

// ─────────────────────────── Drawer + Modal shells ───────────────────────────

const DRAWER_WIDTH: Record<NonNullable<DrawerShellProps['size']>, number | string> = {
  sm: 360, md: 480, lg: 640, xl: 820, '2xl': 1040,
};

export interface DrawerShellProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const DrawerShell: React.FC<DrawerShellProps> = ({
  open, onClose, title, sub, size = 'lg', footer, children,
}) => (
  <Drawer
    open={open}
    onClose={onClose}
    width={DRAWER_WIDTH[size]}
    title={(
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{sub}</div>
        )}
      </div>
    )}
    footer={footer ? (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>
    ) : undefined}
    styles={{ body: { padding: 0 } }}
  >
    {children}
  </Drawer>
);

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const MODAL_WIDTH: Record<NonNullable<ModalShellProps['size']>, number> = {
  sm: 380, md: 520, lg: 720,
};

export const ModalShell: React.FC<ModalShellProps> = ({
  open, onClose, title, size = 'md', footer, children,
}) => (
  <Modal
    open={open}
    onCancel={onClose}
    width={MODAL_WIDTH[size]}
    title={title}
    footer={footer ? (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>
    ) : null}
  >
    {children}
  </Modal>
);

// ─────────────────────────── Helpers ───────────────────────────

export const fmtVNDg = (n: number | null | undefined): string =>
  n ? n.toLocaleString('vi-VN') + ' ₫' : 'Miễn phí';

export const fmtHMg = (d: Date | string | null | undefined): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const fmtDMYg = (d: Date | string | null | undefined): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export const fmtDTg = (d: Date | string | null | undefined): string => {
  if (!d) return '—';
  return `${fmtDMYg(d)} ${fmtHMg(d)}`;
};

// ─────────────────────────── Toast helpers (Antd message wrapper) ───────────────────────────

export const tk = (msg: string): void => { void message.success(msg); };
export const ti = (msg: string): void => { void message.info(msg); };
export const tw = (msg: string): void => { void message.warning(msg); };
export const te = (msg: string): void => { void message.error(msg); };

export const cf = (
  prompt: string,
  fn: () => void,
  opts: { title?: string; tone?: 'info' | 'warn' | 'crit'; confirm?: string } = {},
): void => {
  Modal.confirm({
    title: opts.title || 'Xác nhận',
    content: prompt,
    okText: opts.confirm || 'Đồng ý',
    cancelText: 'Hủy',
    okType: opts.tone === 'crit' ? 'danger' : 'primary',
    onOk: () => fn(),
  });
};

// Re-export Icon for consumers so they don't need the layout import
export { default as Ico } from '../layouts/terminal/Icon';

// ─────────────────────────── SimpleV2Page helper ───────────────────────────
//
// Templated single-list v2 page used across ~15 specialty modules
// (ChronicDisease, HivManagement, MentalHealth, Immunization, …) where the
// shape is always: KPI strip + filter toolbar + StatusTabs + DataTable +
// detail Drawer. Pages with custom layouts (HR roster, Emergency triage,
// Equipment maintenance) hand-build instead.
//
// Pages provide a synchronous loader that returns rows + KPI metadata,
// columns, drawer renderer, and optional status tabs.

import TermIconCmp from '../layouts/terminal/Icon';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface SimpleV2PageProps<T> {
  title: string;                                                   // Page title (for plus button)
  load: () => Promise<T[]>;                                        // Async data loader
  rowKey: (row: T) => string;
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  searchOf?: (row: T) => string;                                   // string used for substring match
  statusTabs?: StatusTab<string>[];                                // optional status tabs
  statusOf?: (row: T) => string;                                   // map row → tab key
  filters?: { key: string; placeholder: string; options: { v: string; l: string }[]; valueOf: (row: T) => string }[];
  kpis: (rows: T[]) => KpiItem[];
  pageSize?: number;
  rowActions?: (row: T, reload: () => void) => React.ReactNode;
  drawer?: (row: T) => React.ReactNode;
  drawerTitle?: (row: T) => React.ReactNode;
  drawerSub?: (row: T) => string;
  toolbarRight?: React.ReactNode;
  emptyMessage?: string;
}

export function SimpleV2Page<T>({
  title, load, rowKey, columns,
  searchPlaceholder = 'Tìm kiếm…', searchOf,
  statusTabs, statusOf,
  filters = [],
  kpis,
  pageSize = 16,
  rowActions, drawer, drawerTitle, drawerSub,
  toolbarRight,
  emptyMessage,
}: SimpleV2PageProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<T | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    load().then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([])).finally(() => setLoading(false));
  }, [load]);
  useEffect(() => { reload(); }, [reload]);

  const counts = useMemo(() => {
    if (!statusTabs || !statusOf) return { all: rows.length };
    const c: Record<string, number> = { all: rows.length };
    statusTabs.forEach((s) => { c[s.v] = rows.filter((r) => statusOf(r) === s.v).length; });
    return c;
  }, [rows, statusTabs, statusOf]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusTabs && statusOf && stab !== 'all' && statusOf(r) !== stab) return false;
    for (const f of filters) {
      const v = filterValues[f.key];
      if (v && f.valueOf(r) !== v) return false;
    }
    if (search.trim() && searchOf) {
      const q = search.toLowerCase();
      if (!searchOf(r).toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, stab, statusTabs, statusOf, filters, filterValues, search, searchOf]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="ab">
      <KpiStrip items={kpis(rows)} />

      <div className="ab-tools">
        {searchOf && (
          <SearchBox value={search} onChange={setSearch} placeholder={searchPlaceholder} />
        )}
        {filters.map((f) => (
          <Filter
            key={f.key}
            value={filterValues[f.key] || ''}
            onChange={(v) => setFilterValues({ ...filterValues, [f.key]: v })}
            options={f.options}
            placeholder={f.placeholder}
          />
        ))}
        <button type="button" className="ab-btn ghost" onClick={() => {
          setSearch(''); setFilterValues({}); setStab('all'); setPage(0);
        }}>
          <TermIconCmp name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={reload}>
          <TermIconCmp name="refresh" size={12} /> Làm mới
        </button>
        {toolbarRight}
      </div>

      {statusTabs && (
        <StatusTabs<string>
          value={stab}
          onChange={setStab}
          tabs={statusTabs}
          counts={counts}
        />
      )}

      <DataTable<T>
        columns={columns}
        data={paged}
        rowKey={rowKey}
        onRowClick={drawer ? (r) => setDetail(r) : undefined}
        actions={rowActions ? (r) => rowActions(r, reload) : undefined}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIconCmp name="search" size={20} />
            <div>{emptyMessage || `Không có ${title.toLowerCase()} nào`}</div>
          </div>
        )}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={pageSize} />

      {drawer && (
        <DrawerShell
          open={!!detail}
          onClose={() => setDetail(null)}
          title={detail ? (drawerTitle ? drawerTitle(detail) : title) : ''}
          sub={detail && drawerSub ? drawerSub(detail) : ''}
          size="lg"
        >
          {detail && drawer(detail)}
        </DrawerShell>
      )}
    </div>
  );
}
