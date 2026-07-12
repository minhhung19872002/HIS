import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, message, theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  CommandProvider, useCommandCtx, COMMANDS, type CmdId,
} from '../../../contexts/CommandContext';
import TermIcon from './Icon';
import IdleLockScreen from './IdleLockScreen';
import { Rail, Flyout } from './Sidebar';
import { Topbar } from './TopBar';
import { Ticker, type TickerPatient } from './PatientContextBar';
import ErrorBoundary from '../../feedback/ErrorBoundary';
import { storage, STORAGE_KEYS } from '../../../services/storage.service';
import {
  HIS_GROUPS,
  ALL_ITEMS,
  findGroupIdForPath,
  findItemForPath,
} from '../../../services/menu.service';
import { v2Routes } from '../../../router/routeConfigs';
import { usePermission } from '../../../hooks/usePermission';
import './terminal.css';
import './terminal-antd.css';
import './his-shell.css';
import './ab-module.css';

/* ==========================================================================
   Nav data + types + pure lookup helpers moved to services/menu.service.ts
   (HIS_GROUPS, NavGroup/NavItem, ALL_ITEMS, findGroupIdForPath, findItemForPath).
   Imported above — rendering below unchanged. #services-consolidation
   ========================================================================== */

/* Command-palette source (#382): mọi trang /v2 điều hướng được — union menu
   (ALL_ITEMS, có label thân thiện) + TẤT CẢ v2Routes (phủ cả trang không có
   mục menu). Dedup theo path; giữ label menu khi trùng. `permission` từ
   route.meta (hiện trống — điền ở #378) để CmdK lọc theo can(). */
type PaletteItem = { label: string; path: string; groupId?: string; permission?: string };
const PALETTE_ITEMS: PaletteItem[] = (() => {
  const byPath = new Map<string, PaletteItem>();
  ALL_ITEMS.forEach((it) => byPath.set(it.path, { label: it.label, path: it.path, groupId: it.groupId }));
  v2Routes.forEach((r) => {
    if (r.redirect || r.index || !r.meta?.title) return;
    const path = '/v2/' + r.path.replace(/^\/+/, '');
    if (!byPath.has(path)) byPath.set(path, { label: r.meta.title, path, groupId: r.meta.group, permission: r.meta.permission });
  });
  return Array.from(byPath.values());
})();

/* ==========================================================================
   Status bar — dark bottom strip with version + module + chips + kbd hints
   ========================================================================== */

const StatusBar: React.FC<{ moduleLabel: string; runCommand: (id: CmdId) => void }> = ({ moduleLabel, runCommand }) => {
  const { has } = useCommandCtx();
  return (
    <footer className="his-status">
      <span className="seg ok"><span className="seg-dot" /><b>HIS 4.2.1</b></span>
      <span className="sep" />
      <span className="seg">MODULE: <b>{moduleLabel.toUpperCase()}</b></span>
      <span className="sep" />
      <span className="seg ok">BHYT: <b>OK</b></span>
      <span className="sep" />
      <span className="seg ok">HL7: <b>2.5</b></span>
      <span className="sep" />
      <span className="seg ok">PACS: <b>CONNECT</b></span>
      <span className="sep" />
      <span className="seg warn">ĐỒNG BỘ BYT: <b>15p TRƯỚC</b></span>
      <span className="spacer" />
      {COMMANDS.map((c) => {
        const enabled = c.pageOwned ? has(c.id) : true;
        return (
          <button
            key={c.id}
            type="button"
            className={'seg his-status-cmd' + (enabled ? '' : ' off')}
            onClick={() => runCommand(c.id)}
            title={enabled ? `${c.label} (${c.keyHint})` : `${c.label} (${c.keyHint}) — chưa khả dụng ở trang này`}
            style={{
              background: 'none', border: 'none', font: 'inherit', color: 'inherit',
              cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.4, padding: 0,
            }}
          >
            <kbd>{c.keyHint}</kbd> {c.label}
          </button>
        );
      })}
    </footer>
  );
};

/* ==========================================================================
   CmdK palette — Ctrl/Cmd+K opens, Esc closes, filters modules + patients
   ========================================================================== */

type CmdKProps = {
  open: boolean;
  onClose: () => void;
};

const CmdK: React.FC<CmdKProps> = ({ open, onClose }) => {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { can } = usePermission();

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // Chỉ hiện trang user có quyền (can() hiện stub=true → no-op tới #378).
  const allowed = useMemo(() => PALETTE_ITEMS.filter((r) => !r.permission || can(r.permission)), [can]);

  const moduleMatches = useMemo(() => {
    if (!q) return allowed.slice(0, 12);
    const lq = q.toLowerCase();
    return allowed.filter((r) => r.label.toLowerCase().includes(lq) || r.path.toLowerCase().includes(lq)).slice(0, 12);
  }, [q, allowed]);

  const flat = moduleMatches;

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      else if (e.key === 'Enter') {
        const row = flat[active];
        if (row) { navigate(row.path); onClose(); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, active, flat, navigate, onClose]);

  if (!open) return null;
  return (
    <div className="his-cmdk-backdrop" onClick={onClose}>
      <div className="his-cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="his-cmdk-in">
          <span className="prompt">❯</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            placeholder="Tìm module, bệnh nhân, hành động…"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="his-cmdk-body">
          <div className="his-cmdk-sec">Mô-đun ({PALETTE_ITEMS.length} trang)</div>
          {flat.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
              Không có kết quả cho "{q}"
            </div>
          ) : (
            flat.map((r, i) => (
              <div
                key={r.path}
                className={'his-cmdk-row' + (i === active ? ' active' : '')}
                onClick={() => { navigate(r.path); onClose(); }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="ico"><TermIcon name="arrow-right" size={14} /></span>
                <span className="lbl">{r.label}</span>
                <span className="sub">{r.path}</span>
              </div>
            ))
          )}
        </div>
        <div className="his-cmdk-ft">
          <span>↑↓ chọn</span>
          <span>↵ mở</span>
          <span>ESC đóng</span>
          <span style={{ marginLeft: 'auto' }}>HIS · {PALETTE_ITEMS.length} trang</span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   TerminalLayout — shell wrapping /v2/* routes
   ========================================================================== */

// Fallback DOM generic cho trang list chưa đăng ký handler riêng (pure helpers).
function clickToolbarPrimary(): boolean {
  const btn = document.querySelector<HTMLButtonElement>('.ab-toolbar .ab-btn.primary, .ab-tools .ab-btn.primary');
  if (btn) { btn.click(); return true; }
  return false;
}
function focusSearch(): boolean {
  const input = document.querySelector<HTMLInputElement>('.ab-search input');
  if (input) { input.focus(); input.select(); return true; }
  return false;
}

/**
 * Theme cho vùng nội dung v2 (ConfigProvider lồng trong shell). #381 dark+compact.
 * - Light mode: token/components giữ NGUYÊN palette sáng đang dùng (behavior-preserving).
 * - Dark mode: bỏ token bề-mặt sáng để `darkAlgorithm` tự sinh; giữ brand + shape.
 * - Compact: thêm `compactAlgorithm` + bỏ các height/padding hardcode để thuật toán thu gọn.
 */
function buildContentTheme(isDark: boolean, isCompact: boolean): ThemeConfig {
  const { darkAlgorithm, defaultAlgorithm, compactAlgorithm } = antdTheme;
  const algorithm = [
    isDark ? darkAlgorithm : defaultAlgorithm,
    isCompact ? compactAlgorithm : null,
  ].filter(Boolean) as ThemeConfig['algorithm'];

  const token: ThemeConfig['token'] = {
    colorPrimary: '#2563eb',
    colorInfo: '#0284c7',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    fontFamily: 'Inter, "IBM Plex Sans", system-ui, sans-serif',
    fontSize: 13,
    fontSizeLG: 14,
    fontSizeSM: 12,
    fontSizeHeading1: 32,
    fontSizeHeading2: 26,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    lineHeight: 1.5,
    // Chiều cao control cố định chỉ khi KHÔNG compact (compactAlgorithm mới thu nhỏ được).
    ...(isCompact ? {} : { controlHeight: 34, controlHeightLG: 40, controlHeightSM: 26 }),
    // Palette bề-mặt sáng chỉ áp ở light; dark để darkAlgorithm tự sinh.
    ...(isDark
      ? {}
      : {
          colorText: '#0f172a',
          colorTextSecondary: '#334155',
          colorTextTertiary: '#64748b',
          colorBorder: '#e4e9f0',
          colorBorderSecondary: '#edf1f6',
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f7f9fc',
          colorBgElevated: '#ffffff',
          colorFillAlter: '#f1f5f9',
          colorFillContent: '#f1f5f9',
        }),
  };

  const components: ThemeConfig['components'] = {
    Button: { fontWeight: 500, ...(isCompact ? {} : { controlHeight: 34 }) },
    Card: { paddingLG: 18, ...(isCompact ? {} : { headerHeight: 44 }), ...(isDark ? {} : { headerBg: '#ffffff' }) },
    Table: {
      cellFontSize: 13,
      ...(isCompact ? {} : { cellPaddingBlock: 10, cellPaddingInline: 14 }),
      ...(isDark
        ? {}
        : {
            headerBg: '#f7f9fc',
            headerColor: '#64748b',
            headerSplitColor: '#e4e9f0',
            rowHoverBg: '#f7f9fc',
            rowSelectedBg: '#eff5ff',
            rowSelectedHoverBg: '#e5edf7',
            borderColor: '#f1f4f9',
          }),
    },
    Tabs: {
      titleFontSize: 13,
      horizontalItemGutter: 24,
      inkBarColor: '#2563eb',
      itemSelectedColor: '#2563eb',
      itemActiveColor: '#1d4ed8',
      ...(isDark ? {} : { itemHoverColor: '#0f172a' }),
    },
    Statistic: { titleFontSize: 11, contentFontSize: 26 },
    Modal: { titleFontSize: 15, ...(isDark ? {} : { headerBg: '#ffffff' }) },
    Drawer: { fontSizeLG: 15 },
    Alert: { defaultPadding: '8px 12px' },
    Form: { labelFontSize: 12, ...(isDark ? {} : { labelColor: '#64748b' }) },
    // Nhóm token thuần-màu sáng: chỉ áp ở light, dark để algorithm sinh.
    ...(isDark
      ? {}
      : {
          Menu: {
            itemBg: 'transparent',
            itemColor: '#334155',
            itemHoverBg: '#f1f5f9',
            itemSelectedBg: '#eff5ff',
            itemSelectedColor: '#2563eb',
            itemHeight: 36,
            itemBorderRadius: 4,
          },
          Tag: { defaultBg: '#f1f5f9', defaultColor: '#334155' },
          Input: {
            hoverBorderColor: '#bfd3fa',
            activeBorderColor: '#2563eb',
            activeShadow: '0 0 0 3px #eff5ff',
          },
          Select: { optionSelectedBg: '#eff5ff', optionSelectedColor: '#2563eb' },
          Descriptions: { titleColor: '#64748b', labelBg: '#f7f9fc' },
          Segmented: {
            itemSelectedBg: '#ffffff',
            itemSelectedColor: '#0f172a',
            trackBg: '#f7f9fc',
          },
        }),
  };

  return { algorithm, token, components };
}

const TerminalShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, isCompact } = useTheme();
  const contentTheme = useMemo(() => buildContentTheme(isDark, isCompact), [isDark, isCompact]);
  const { invoke, has } = useCommandCtx();

  const activeItem = useMemo(() => findItemForPath(location.pathname), [location.pathname]);
  const activeGroupId = activeItem?.groupId ?? findGroupIdForPath(location.pathname);

  const [pinnedGroupId, setPinnedGroupId] = useState<string | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Command keys (F1/F2/F3/F4/F8/F5/Esc + Ctrl+K/S/F/P) + palette ---- */
  const [cmdKOpen, setCmdKOpen] = useState(false);

  const runCommand = useCallback((id: CmdId) => {
    switch (id) {
      case 'help':
        navigate('/v2/help');
        return;
      case 'commandPalette':
        setCmdKOpen((v) => !v);
        return;
      case 'cancel':
        if (cmdKOpen) { setCmdKOpen(false); return; }
        if (hoveredGroupId && !pinnedGroupId) { setHoveredGroupId(null); return; }
        invoke('cancel');
        return;
      case 'new':
        if (invoke('new')) return;
        if (clickToolbarPrimary()) return;
        message.info('Phím F3 · Thêm mới chưa khả dụng ở trang này');
        return;
      case 'search':
        if (invoke('search')) return;
        if (focusSearch()) return;
        setCmdKOpen(true);            // fallback: mở ô lệnh (có thanh tìm)
        return;
      case 'save':
        if (invoke('save')) return;
        message.info('Phím F2 · Lưu chưa khả dụng ở trang này');
        return;
      case 'print':
        if (invoke('print')) return;
        message.info('Phím F8 · In chưa khả dụng ở trang này');
        return;
      case 'refresh':
        if (invoke('refresh')) return;
        window.location.reload();
        return;
      default:
        return;
    }
  }, [navigate, cmdKOpen, hoveredGroupId, pinnedGroupId, invoke]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key;
      if (e.metaKey || e.ctrlKey) {
        const lk = k.toLowerCase();
        if (lk === 'k') { e.preventDefault(); runCommand('commandPalette'); return; }
        if (cmdKOpen) return;               // để CmdK tự xử lý khi đang mở
        if (lk === 's') { e.preventDefault(); runCommand('save'); return; }
        if (lk === 'f') { e.preventDefault(); runCommand('search'); return; }
        if (lk === 'p') { e.preventDefault(); runCommand('print'); return; }
        return;
      }
      if (e.altKey) return;
      if (cmdKOpen && k !== 'Escape') return; // CmdK lo Arrow/Enter khi mở
      switch (k) {
        case 'F1': e.preventDefault(); runCommand('help'); break;
        case 'F2': e.preventDefault(); runCommand('save'); break;
        case 'F3': e.preventDefault(); runCommand('new'); break;
        case 'F4': e.preventDefault(); runCommand('search'); break;
        case 'F8': e.preventDefault(); runCommand('print'); break;
        case 'F5':
          if (has('refresh')) { e.preventDefault(); runCommand('refresh'); }
          break;                            // else: để trình duyệt tải lại trang
        case 'Escape': runCommand('cancel'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [runCommand, cmdKOpen, has]);

  /* ---- Patient ticker context: URL ?pid= or localStorage his.patient ---- */
  const [patient, setPatient] = useState<TickerPatient | null>(null);
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const urlPid = params.get('pid');
      if (urlPid) {
        const fake: TickerPatient = {
          id: urlPid.toUpperCase(),
          name: 'Bệnh nhân ' + urlPid,
          age: 45,
          gender: 'M',
        };
        setPatient(fake);
        storage.set(STORAGE_KEYS.patient, fake);
        return;
      }
      const stored = storage.getRaw(STORAGE_KEYS.patient);
      if (stored) setPatient(JSON.parse(stored));
    } catch { /* ignore bad json */ }
  }, [location.search]);
  // #386: callbacks ổn định (useCallback) để Rail/Flyout memo hiệu quả — sidebar
  // không re-render khi điều hướng trong cùng group.
  const clearPatient = useCallback(() => {
    setPatient(null);
    try { storage.remove(STORAGE_KEYS.patient); } catch { /* ignore */ }
  }, []);

  // Hover intent: slight delay so accidental pointer crossings don't flicker
  const scheduleHoverClose = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredGroupId(null), 180);
  }, []);
  const cancelHoverClose = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const onHoverGroup = useCallback((id: string | null) => {
    cancelHoverClose();
    if (id) setHoveredGroupId(id);
    else scheduleHoverClose();
  }, [cancelHoverClose, scheduleHoverClose]);

  const onClickGroup = useCallback((id: string) => {
    setPinnedGroupId((prev) => (prev === id ? null : id));
    setHoveredGroupId((prev) => (prev === id ? prev : id));
  }, []);

  // Close flyout when navigating (unless pinned)
  const [lastPath, setLastPath] = useState(location.pathname);
  useEffect(() => {
    if (location.pathname !== lastPath) {
      if (!pinnedGroupId) setHoveredGroupId(null);
      setLastPath(location.pathname);
    }
  }, [location.pathname, lastPath, pinnedGroupId]);

  const onSwitchLayout = useCallback(() => {
    storage.set(STORAGE_KEYS.layoutMode, 'v1');
    let v1 = location.pathname.replace(/^\/v2/, '') || '/';
    if (v1 === '/dashboard') v1 = '/';
    navigate(v1);
  }, [location.pathname, navigate]);

  const onLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Breadcrumb = [group label, active item label]
  const crumb = useMemo(() => {
    const group = HIS_GROUPS.find((g) => g.id === activeGroupId);
    const parts: string[] = [];
    if (group) parts.push(group.label);
    if (activeItem) parts.push(activeItem.label);
    if (!parts.length) parts.push('Chỉ mục');
    return parts;
  }, [activeGroupId, activeItem]);

  const moduleLabel = activeItem?.label ?? '—';
  const visibleGroupId = hoveredGroupId || pinnedGroupId;
  const showFlyout = visibleGroupId !== null;
  const flyoutPinned = pinnedGroupId !== null && pinnedGroupId === visibleGroupId;

  return (
    <div className="his-terminal">
      <IdleLockScreen />
      <div className={'his-app' + (flyoutPinned ? ' has-pinned' : '')}>
        <Rail
          activeGroupId={activeGroupId}
          pinnedGroupId={pinnedGroupId}
          hoveredGroupId={hoveredGroupId}
          onHoverGroup={onHoverGroup}
          onClickGroup={onClickGroup}
        />
        {showFlyout && visibleGroupId && (
          <Flyout
            groupId={visibleGroupId}
            activeItemId={activeItem?.id ?? null}
            pinned={flyoutPinned}
            onClose={() => setHoveredGroupId(null)}
            onTogglePin={() => setPinnedGroupId(flyoutPinned ? null : visibleGroupId)}
            onKeepOpen={cancelHoverClose}
          />
        )}
        <Topbar
          crumb={crumb}
          onCmdK={() => setCmdKOpen(true)}
          onSwitchLayout={onSwitchLayout}
          onLogout={onLogout}
        />
        <Ticker patient={patient} onClearPatient={clearPatient} />
        <div className="his-main">
          <div className="his-content">
            <ConfigProvider
              theme={contentTheme}
            >
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </ConfigProvider>
          </div>
        </div>
        <StatusBar moduleLabel={moduleLabel} runCommand={runCommand} />
      </div>
      <CmdK open={cmdKOpen} onClose={() => setCmdKOpen(false)} />
    </div>
  );
};

const TerminalLayout: React.FC = () => (
  <CommandProvider>
    <TerminalShell />
  </CommandProvider>
);

export default TerminalLayout;
