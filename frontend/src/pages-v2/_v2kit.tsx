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
import { createPortal } from 'react-dom';
import { message, Modal, Form, Input, InputNumber, Select, Switch, DatePicker, Radio, Checkbox, AutoComplete } from 'antd';
import dayjs from 'dayjs';
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
          {k.unit && <small style={{ fontSize: 'var(--fs-md)', color: 'var(--t-2)', marginLeft: 'var(--space-3)' }}>{k.unit}</small>}
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
      display: 'flex', alignItems: 'center', gap: 'var(--space-8)',
      padding: '10px 14px', borderTop: '1px solid var(--line)',
      background: 'var(--d-2)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)', flexShrink: 0,
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

// ─────────────────────────── Async UI states (loading / empty / error) ───────────────────────────
// UI-AUDIT #164 — primitive CHUNG cho 4 state data-driven. Dựng trên `.ab-empty` (token-based →
// tự flip dark-mode). Dùng được cả trong ô bảng (`DataTable.empty`) lẫn block độc lập.
// Khi viết page v2 mới: success = data; rỗng = <EmptyState>; đang tải = <LoadingState>;
// lỗi = <ErrorState onRetry={reload}> (ĐỪNG nuốt lỗi thành "rỗng"). Toast (tk/ti/tw/te) = feedback hành động.

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Đang tải…' }) => (
  <div className="ab-empty">
    <span className="ab-btn-spin"><TermIcon name="refresh" size={20} /></span>
    <div>{message}</div>
  </div>
);

export const EmptyState: React.FC<{ message?: string; icon?: string; action?: React.ReactNode }> = ({
  message = 'Không có dữ liệu', icon = 'search', action,
}) => (
  <div className="ab-empty">
    <TermIcon name={icon} size={20} />
    <div>{message}</div>
    {action}
  </div>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Không tải được dữ liệu', onRetry,
}) => (
  <div className="ab-empty">
    <span style={{ color: 'var(--s-crit)' }}><TermIcon name="alert" size={20} /></span>
    <div>{message}</div>
    {onRetry && (
      <button type="button" className="ab-btn ghost sm" onClick={onRetry}>
        <TermIcon name="refresh" size={12} /> Thử lại
      </button>
    )}
  </div>
);

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
  loading?: boolean;
}> = ({ ic, title, onClick, tone, loading }) => (
  <button
    type="button"
    className="ab-iconbtn"
    title={title}
    disabled={loading}
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    style={tone === 'crit' ? { color: 'var(--s-crit)' } : tone === 'warn' ? { color: 'var(--s-warn)' } : undefined}
  >
    {loading ? <TermIcon name="refresh" size={12} /> : <TermIcon name={ic} size={12} />}
  </button>
);

// ─────────────────────────── Btn — chuẩn hoá nút ab-btn (raw <button>) ───────────────────────────
// Giữ NGUYÊN style ab-* (terminal design): chỉ componentize, không đổi class/CSS.
// Variant thực tế trong codebase: default | primary | ghost | ok | crit.
export type BtnVariant = 'default' | 'primary' | 'ghost' | 'ok' | 'crit';
export const Btn: React.FC<{
  variant?: BtnVariant;
  size?: 'sm';
  icon?: string;            // tên TermIcon (bên trái)
  iconRight?: string;       // tên TermIcon (bên phải)
  loading?: boolean;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ variant = 'default', size, icon, iconRight, loading, disabled, active, title, type = 'button', onClick, className, style, children }) => {
  const cls = ['ab-btn', variant !== 'default' ? variant : '', size === 'sm' ? 'sm' : '', active ? 'active' : '', className || '']
    .filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} title={title} disabled={disabled || loading} style={style} onClick={onClick}>
      {loading ? <span className="ab-btn-spin"><TermIcon name="refresh" size={12} /></span>
        : icon ? <TermIcon name={icon} size={12} /> : null}
      {children}
      {iconRight && !loading ? <TermIcon name={iconRight} size={12} /> : null}
    </button>
  );
};

// ─────────────────────────── Config-driven options (Select/Radio/Checkbox/AutoComplete) ───────────────────────────
// Nhận datasource JSON + fieldNames linh hoạt (label/value/disabled/group/children), thay vì hard-code <Option> trong JSX.
export interface OptItem { value: string | number; label: React.ReactNode; disabled?: boolean; group?: string; children?: OptItem[]; }
export interface OptFieldNames { label?: string; value?: string; disabled?: string; group?: string; children?: string; }

/** Chuẩn hoá mảng option thô (object/string/number) → OptItem[] theo fieldNames tuỳ biến. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeOptions(raw: any[] | undefined, fn?: OptFieldNames): OptItem[] {
  if (!raw) return [];
  const L = fn?.label || 'label', V = fn?.value || 'value', D = fn?.disabled || 'disabled', G = fn?.group, C = fn?.children;
  return raw.filter((o) => o != null).map((o) => {
    if (typeof o === 'string' || typeof o === 'number') return { value: o, label: String(o) };
    return {
      value: o[V], label: o[L] ?? o[V], disabled: o[D],
      group: G ? o[G] : o.group,
      children: C && o[C] ? normalizeOptions(o[C], fn) : undefined,
    } as OptItem;
  });
}

/** Select config-driven: options JSON + fieldNames + multiple + search + clearable + group + loading. */
export const OptionsSelect: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any; onChange?: (v: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any[]; fieldNames?: OptFieldNames;
  multiple?: boolean; showSearch?: boolean; allowClear?: boolean;
  placeholder?: string; disabled?: boolean; loading?: boolean;
  style?: React.CSSProperties; size?: 'small' | 'middle' | 'large';
}> = ({ value, onChange, options, fieldNames, multiple, showSearch = true, allowClear = true, placeholder, disabled, loading, style, size }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  const grouped = useMemo(() => {
    if (!opts.some((o) => o.group)) return undefined;
    const map = new Map<string, OptItem[]>();
    opts.forEach((o) => { const g = o.group || '—'; if (!map.has(g)) map.set(g, []); map.get(g)!.push(o); });
    return Array.from(map.entries()).map(([label, options]) => ({ label, options }));
  }, [opts]);
  return (
    <Select
      value={value} onChange={onChange}
      mode={multiple ? 'multiple' : undefined}
      showSearch={showSearch} optionFilterProp="label" allowClear={allowClear}
      placeholder={placeholder} disabled={disabled} loading={loading}
      style={{ width: '100%', ...style }} size={size}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options={(grouped as any) || (opts as any)}
    />
  );
};

/** Radio group config-driven. */
export const RadioField: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any; onChange?: (e: any) => void; options?: any[]; fieldNames?: OptFieldNames;
  disabled?: boolean; optionType?: 'default' | 'button';
}> = ({ value, onChange, options, fieldNames, disabled, optionType }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  return (
    <Radio.Group value={value} onChange={onChange} disabled={disabled} optionType={optionType}
      options={opts.map((o) => ({ label: o.label, value: o.value, disabled: o.disabled }))} />
  );
};

/** Checkbox group config-driven (multiple). */
export const CheckboxField: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any[]; onChange?: (v: any[]) => void; options?: any[]; fieldNames?: OptFieldNames; disabled?: boolean;
}> = ({ value, onChange, options, fieldNames, disabled }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  return (
    <Checkbox.Group value={value} onChange={onChange} disabled={disabled}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options={opts.map((o) => ({ label: o.label as any, value: o.value, disabled: o.disabled }))} />
  );
};

/** AutoComplete config-driven + debounce search (async datasource qua onSearch). */
export const AutoCompleteField: React.FC<{
  value?: string; onChange?: (v: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any[]; fieldNames?: OptFieldNames;
  placeholder?: string; allowClear?: boolean; disabled?: boolean; loading?: boolean;
  onSearch?: (kw: string) => void; debounce?: number; style?: React.CSSProperties;
}> = ({ value, onChange, options, fieldNames, placeholder, allowClear = true, disabled, onSearch, debounce = 300, style }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (kw: string) => {
    if (!onSearch) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(kw), debounce);
  };
  return (
    <AutoComplete
      value={value} onChange={onChange} onSearch={onSearch ? handleSearch : undefined}
      allowClear={allowClear} disabled={disabled} placeholder={placeholder}
      style={{ width: '100%', ...style }}
      options={opts.map((o) => ({ value: String(o.value), label: o.label }))}
      filterOption={onSearch ? false : (input, opt) => String(opt?.value ?? '').toLowerCase().includes(input.toLowerCase())}
    />
  );
};

/** Native select style ab-sel (giữ NGUYÊN look terminal) nhưng nhận options JSON config-driven — thay raw <select> trong form/modal. */
export const AbSelect: React.FC<{
  value?: string | number; onChange?: (v: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any[]; fieldNames?: OptFieldNames;
  placeholder?: string; disabled?: boolean; style?: React.CSSProperties; className?: string;
}> = ({ value, onChange, options, fieldNames, placeholder, disabled, style, className }) => {
  const opts = useMemo(() => normalizeOptions(options, fieldNames), [options, fieldNames]);
  return (
    <select className={className || 'ab-sel'} value={value as string} disabled={disabled} style={style}
      onChange={(e) => onChange?.(e.target.value)}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {opts.map((o) => <option key={String(o.value)} value={o.value as string} disabled={o.disabled}>{o.label as string}</option>)}
    </select>
  );
};

// ─────────────────────────── Drawer section / field ───────────────────────────

export const DrSec: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <section style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-10)' }}>
      <h4 style={{
        margin: 0, fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)',
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
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 'var(--space-10)', padding: '4px 0', fontSize: 12.5 }}>
    <div style={{ color: 'var(--t-2)' }}>{lbl}</div>
    <div style={{ color: 'var(--t-0)' }}>{children}</div>
  </div>
);

// ─────────────────────────── Drawer + Modal shells ───────────────────────────
// Terminal-style popups (hui-modal / hui-drawer) matching the Claude design
// mock. Rendered via portal to <body> with a backdrop, Esc-to-close and body
// scroll-lock. CSS lives in layouts/terminal/ab-module.css.

const DRAWER_WIDTH: Record<NonNullable<DrawerShellProps['size']>, number> = {
  sm: 360, md: 480, lg: 640, xl: 820, '2xl': 1040,
};

// Esc-to-close + body scroll lock while a popup is open.
function usePopup(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

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
}) => {
  usePopup(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className="hui-drawer-backdrop" onClick={onClose} />
      <div className="hui-drawer-wrap">
        <div className="hui-drawer" style={{ width: DRAWER_WIDTH[size] }}>
          <header className="hui-drawer-h">
            <div className="t">
              <div className="tt">{title}</div>
              {sub && <div className="sub">{sub}</div>}
            </div>
            <button type="button" className="hui-x" onClick={onClose} title="Đóng (Esc)">
              <TermIcon name="x" size={14} />
            </button>
          </header>
          <div className="hui-drawer-b">{children}</div>
          {footer && <footer className="hui-drawer-f">{footer}</footer>}
        </div>
      </div>
    </>,
    document.body,
  );
};

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'danger';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  open, onClose, title, sub, size = 'md', tone, footer, children,
}) => {
  usePopup(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className="hui-backdrop" onClick={onClose} />
      <div className="hui-modal-wrap" onClick={onClose}>
        <div
          className={`hui-modal hui-size-${size}${tone ? ' hui-tone-' + tone : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="hui-modal-h">
            <div className="t">
              <div className="tt">{title}</div>
              {sub && <div className="sub">{sub}</div>}
            </div>
            <button type="button" className="hui-x" onClick={onClose} title="Đóng (Esc)">
              <TermIcon name="x" size={14} />
            </button>
          </header>
          <div className="hui-modal-b">{children}</div>
          {footer && <footer className="hui-modal-f">{footer}</footer>}
        </div>
      </div>
    </>,
    document.body,
  );
};

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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─────────────────────────── List-data hooks (shared boilerplate) ───────────────────────────
// #206 (REFAC FE-3): ~95% các page list v2 hand-roll lặp cùng một khối state quản lý dữ liệu
// (rows + loading + error + load() + useEffect) và một useMemo đếm tab. Hai hook dưới trích
// đúng khối đó để page custom dùng lại MÀ KHÔNG phải ép vào SimpleV2Page (vốn hạn chế: drawer
// read-only, không footer, không CRUD). Hành vi y hệt code inline → adopt 1:1 behavior-preserving.

/**
 * Vòng đời tải danh sách: rows + loading + error + reload. Tương đương đúng khối hand-roll
 * `const [rows]=useState([]); const [loading]=useState(true); ... load(); useEffect(()=>load(),[])`
 * — cùng pattern reload `useCallback`/`useEffect` mà SimpleV2Page đã dùng. `loader`/`onError` PHẢI
 * ổn định (memo hoá bằng useCallback, hoặc hàm module-level) để tránh refetch-loop; tải lúc mount
 * và khi gọi reload(). Tự bọc mảng rỗng nếu API trả non-array (defensive, giống SimpleV2Page).
 */
export function useListData<T>(
  loader: () => Promise<T[]>,
  onError?: () => void,
): {
  rows: T[];
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  loading: boolean;
  error: boolean;
  reload: () => void;
} {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reload = useCallback(() => {
    setLoading(true); setError(false);
    loader()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => { setRows([]); setError(true); onError?.(); })
      .finally(() => setLoading(false));
  }, [loader, onError]);
  useEffect(() => { reload(); }, [reload]);
  return { rows, setRows, loading, error, reload };
}

/**
 * Đếm số dòng theo từng status tab: `{ all, [tab.v]: count, ... }`. Tương đương useMemo đếm tab
 * lặp ở mọi page có StatusTabs. `tabs` chỉ cần field `v` (tab key); `statusOf` map row → tab key.
 */
export function useTabCounts<T>(
  rows: T[],
  tabs: { v: string }[],
  statusOf: (row: T) => string,
): Record<string, number> {
  return useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    tabs.forEach((t) => { c[t.v] = rows.filter((r) => statusOf(r) === t.v).length; });
    return c;
  }, [rows, tabs, statusOf]);
}

// ─────────────────────────── statusConfigs (gom config status-tab lặp ~50 page) ───────────────────────────
// #206: mỗi page khai báo lặp bộ-ba `STATUS_TABS[{v,l,tone}]` + `toneOf(n)` + `labelOf(n)` + `keyOf(n)`
// cho 1 enum status. `makeStatus` gom về 1 khai báo nguồn, suy ra cả 4 — behavior-preserving khi adopt 1:1.
export interface StatusDef<K extends string> {
  value: number;        // mã status số từ API
  key: K;               // tab key (client-side tab filter / statusOf)
  tab: string;          // nhãn ngắn trên StatusTabs
  label?: string;       // nhãn đầy đủ (badge/chi tiết) — mặc định = tab
  tone: StatusTone;
}
export function makeStatus<K extends string>(defs: StatusDef<K>[]): {
  defs: StatusDef<K>[];
  tabs: StatusTab<K>[];
  keyOf: (value: number) => string;
  toneOf: (value: number) => StatusTone;
  labelOf: (value: number) => string;
} {
  const byValue = new Map<number, StatusDef<K>>(defs.map((d) => [d.value, d]));
  return {
    defs,
    tabs: defs.map((d) => ({ v: d.key, l: d.tab, tone: d.tone })),
    keyOf: (value) => byValue.get(value)?.key ?? '',
    toneOf: (value) => byValue.get(value)?.tone ?? 'info',
    labelOf: (value) => { const d = byValue.get(value); return d ? (d.label ?? d.tab) : '—'; },
  };
}

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
  headerActions?: (reload: () => void) => React.ReactNode;  // nút Thêm... cần reload sau khi tạo
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
  toolbarRight, headerActions,
  emptyMessage,
}: SimpleV2PageProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stab, setStab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<T | null>(null);

  const reload = useCallback(() => {
    setLoading(true); setError(false);
    load().then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => { setRows([]); setError(true); })  // UI-AUDIT #164: surface lỗi, đừng nuốt thành "rỗng"
      .finally(() => setLoading(false));
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
        {headerActions && headerActions(reload)}
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
        empty={loading ? <LoadingState />
          : error ? <ErrorState onRetry={reload} />
          : <EmptyState message={emptyMessage || `Không có ${title.toLowerCase()} nào`} />}
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

// ─────────────────────────── CRUD (validate + focus + lỗi BE) ───────────────────────────
// Map lỗi validate BACKEND (authoritative) về đúng field Antd Form + cuộn/focus field lỗi.
// Hỗ trợ ModelState `{errors:{Field:[msg]}}` lẫn custom `{field,message}`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyServerErrors(form: any, e: any): boolean {
  const d = e?.response?.data;
  if (!d) return false;
  const raw = d.errors || (d.field ? { [d.field]: [d.message || 'Không hợp lệ'] } : null);
  if (raw && typeof raw === 'object') {
    const fields = Object.entries(raw).filter(([k]) => k && k.toLowerCase() !== 'dto')
      .map(([k, v]) => ({ name: k.charAt(0).toLowerCase() + k.slice(1), errors: (Array.isArray(v) ? v : [String(v)]) as string[] }));
    if (fields.length) { form.setFields(fields); try { form.scrollToField(fields[0].name); } catch { /* ignore */ } return true; }
  }
  return false;
}

export interface CrudFieldCfg {
  key: string; label: string;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'autocomplete' | 'switch' | 'date' | 'password';
  required?: boolean;
  // datasource JSON (config-driven) — phần tử {value,label,disabled,group,children} hoặc tuỳ biến qua fieldNames
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any[];
  fieldNames?: OptFieldNames;
  placeholder?: string; disabledOnEdit?: boolean;
  showSearch?: boolean; allowClear?: boolean;        // select/multiselect
  onSearch?: (kw: string) => void; debounce?: number; // autocomplete async datasource
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: any[];
}

/** Modal CRUD tái dùng: Antd Form + validate (rules) + scrollToFirstError + map lỗi BE → field + focus.
 *  Date field tự convert string↔dayjs; submit trả values (date dạng 'YYYY-MM-DD'). */
export const CrudModal: React.FC<{
  open: boolean; onClose: () => void; title: string; sub?: string;
  fields: CrudFieldCfg[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial?: Record<string, any> | null;   // có id = sửa; null/{} = thêm
  size?: 'sm' | 'md' | 'lg' | 'xl';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (values: Record<string, any>, editing: boolean) => Promise<void>;
}> = ({ open, onClose, title, sub, fields, initial, size = 'md', onSubmit }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const editing = !!(initial && initial.id);
  const dateKeys = useMemo(() => fields.filter((f) => f.type === 'date').map((f) => f.key), [fields]);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (initial && Object.keys(initial).length) {
      const v = { ...initial };
      dateKeys.forEach((k) => { if (v[k]) v[k] = dayjs(v[k]); });
      form.setFieldsValue(v);
    }
  }, [open, initial, form, dateKeys]);
  const submit = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let v: Record<string, any>;
    try { v = await form.validateFields(); } catch { return; }  // client UX: hiện lỗi inline + focus field lỗi
    dateKeys.forEach((k) => { if (v[k] && dayjs.isDayjs(v[k])) v[k] = v[k].format('YYYY-MM-DD'); });
    if (initial?.id) v.id = initial.id;
    setSaving(true);
    try { await onSubmit(v, editing); onClose(); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (e: any) { if (!applyServerErrors(form, e)) message.error(e?.response?.data?.message || 'Lưu thất bại'); }
    finally { setSaving(false); }
  };
  return (
    <ModalShell open={open} onClose={onClose} title={title} sub={sub} size={size}
      footer={<>
        <button type="button" className="ab-btn" onClick={onClose}>Huỷ</button>
        <button type="button" className="ab-btn primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </>}>
      <Form form={form} layout="vertical" scrollToFirstError requiredMark>
        {fields.map((f) => (
          <Form.Item key={f.key} name={f.key} label={f.label}
            valuePropName={f.type === 'switch' ? 'checked' : undefined}
            rules={f.rules || (f.required ? [{ required: true, message: `Nhập ${f.label}` }] : undefined)}>
            {f.type === 'select' ? <OptionsSelect options={f.options} fieldNames={f.fieldNames} showSearch={f.showSearch ?? true} allowClear={f.allowClear ?? true} placeholder={f.placeholder} />
              : f.type === 'multiselect' ? <OptionsSelect multiple options={f.options} fieldNames={f.fieldNames} showSearch={f.showSearch ?? true} allowClear={f.allowClear ?? true} placeholder={f.placeholder} />
              : f.type === 'radio' ? <RadioField options={f.options} fieldNames={f.fieldNames} />
              : f.type === 'checkbox' ? <CheckboxField options={f.options} fieldNames={f.fieldNames} />
              : f.type === 'autocomplete' ? <AutoCompleteField options={f.options} fieldNames={f.fieldNames} placeholder={f.placeholder} onSearch={f.onSearch} debounce={f.debounce} allowClear={f.allowClear ?? true} />
              : f.type === 'number' ? <InputNumber style={{ width: '100%' }} placeholder={f.placeholder} />
              : f.type === 'switch' ? <Switch />
              : f.type === 'date' ? <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              : f.type === 'textarea' ? <Input.TextArea rows={3} placeholder={f.placeholder} />
              : f.type === 'password' ? <Input.Password placeholder={f.placeholder} />
              : <Input disabled={editing && f.disabledOnEdit} placeholder={f.placeholder} />}
          </Form.Item>
        ))}
      </Form>
    </ModalShell>
  );
};
