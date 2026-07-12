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
 *
 * ★ FOLDER-RESTRUCTURE (his-fe-convention §4a, 2026-07): các UI primitive đã
 * DỜI về `src/components/<category>/` (actions/dataDisplay/navigation/table/
 * form/overlay) — file này giữ vai trò (a) BARREL re-export (192 importer cũ
 * `./_v2kit` nguyên vẹn) + (b) page-GLUE riêng của v2 (SimpleV2Page,
 * useListData/useTabCounts, makeStatus, fmt*, toast tk/ti/tw/te, cf).
 * Code MỚI có thể import primitive thẳng từ `components/<category>/`.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { message, Modal } from 'antd';
import TermIconCmp from '../components/layout/terminal/Icon';
import { KpiStrip, type KpiItem } from '../components/dataDisplay/KpiStrip';
import { SearchBox } from '../components/form/SearchBox';
import { Filter } from '../components/form/Filter';
import { StatusTabs, type StatusTab, type StatusTone } from '../components/navigation/Tabs';
import { DataTable, type ColumnDef } from '../components/table/DataTable';
import { Pager } from '../components/navigation/Pagination';
import { LoadingState } from '../components/dataDisplay/Loading';
import { EmptyState } from '../components/dataDisplay/EmptyState';
import { ErrorState } from '../components/dataDisplay/ErrorState';
import { DrawerShell } from '../components/overlay/DrawerShell';

// ─────────────────────────── Barrel: primitive đã dời về components/<category>/ ───────────────────────────

export * from '../components/dataDisplay/KpiStrip';        // KpiTone, KpiItem, KpiStrip
export * from '../components/navigation/Tabs';             // TopTab, TopTabs, StatusTone, StatusTab, StatusTabs
export * from '../components/form/SearchBox';              // SearchBox
export * from '../components/form/Filter';                 // Filter
export * from '../components/table/DataTable';             // ColumnDef, DataTable
export * from '../components/navigation/Pagination';       // Pager
export * from '../components/dataDisplay/Loading';         // LoadingState
export * from '../components/dataDisplay/EmptyState';      // EmptyState
export * from '../components/dataDisplay/ErrorState';      // ErrorState
export * from '../components/dataDisplay/StatusBadge';     // StatusBadge
export * from '../components/actions/ActBtn';              // ActBtn
export * from '../components/actions/Btn';                 // BtnVariant, Btn
export * from '../components/form/Options';                // OptItem, OptFieldNames, normalizeOptions, OptionsSelect, RadioField, CheckboxField, AutoCompleteField, AbSelect
export * from '../components/overlay/DrawerShell';         // DrSec, DrField, DrawerShellProps, DrawerShell
export * from '../components/overlay/ModalShell';          // ModalShellProps, ModalShell
export * from '../components/form/applyServerErrors';      // applyServerErrors
export * from '../components/overlay/CrudModal';           // CrudFieldCfg, CrudModal

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

// Re-export Icon (now in components/common/Icon) under the legacy alias `Ico`
export { Icon as Ico } from '../components/common/Icon';

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
