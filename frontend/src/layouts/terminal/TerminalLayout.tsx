import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { ConfigProvider, Popover, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { useInterval } from '../../hooks/useInterval';
import { useTheme } from '../../contexts/ThemeContext';
import {
  CommandProvider, useCommandCtx, COMMANDS, type CmdId,
} from '../../contexts/CommandContext';
import TermIcon from './Icon';
import AiQueueBadge from '../../modules/radiology/components/AiQueueBadge';
import ErrorBoundary from '../../components/feedback/ErrorBoundary';
import { HOSPITAL_NAME } from '../../constants/hospital';
import { storage, STORAGE_KEYS } from '../../services/storage.service';
import {
  HIS_GROUPS,
  ALL_ITEMS,
  findGroupIdForPath,
  findItemForPath,
} from '../../services/menu.service';
import './terminal.css';
import './terminal-antd.css';
import './his-shell.css';
import './ab-module.css';

/* ==========================================================================
   Nav data + types + pure lookup helpers moved to services/menu.service.ts
   (HIS_GROUPS, NavGroup/NavItem, ALL_ITEMS, findGroupIdForPath, findItemForPath).
   Imported above — rendering below unchanged. #services-consolidation
   ========================================================================== */

/* ==========================================================================
   Rail — 64px left icon strip (10 groups)
   ========================================================================== */

type RailProps = {
  activeGroupId: string | null;
  pinnedGroupId: string | null;
  hoveredGroupId: string | null;
  onHoverGroup: (id: string | null) => void;
  onClickGroup: (id: string) => void;
};

const Rail: React.FC<RailProps> = ({ activeGroupId, pinnedGroupId, hoveredGroupId, onHoverGroup, onClickGroup }) => (
  <aside className="his-rail" onMouseLeave={() => onHoverGroup(null)}>
    <Link to="/v2" className="his-rail-mark" title="HIS Terminal — Chỉ mục">HIS</Link>
    {HIS_GROUPS.map((g) => {
      const active = g.id === activeGroupId;
      const pinned = g.id === pinnedGroupId;
      const hovered = g.id === hoveredGroupId;
      return (
        <button
          key={g.id}
          type="button"
          className={
            'his-rail-item'
            + (active ? ' active' : '')
            + (pinned ? ' pinned' : '')
            + (hovered ? ' hovered' : '')
          }
          title={g.label}
          onMouseEnter={() => onHoverGroup(g.id)}
          onClick={() => onClickGroup(g.id)}
        >
          <TermIcon name={g.icon} size={18} />
          {g.hot ? <span className="hot">{g.hot}</span> : null}
          <span className="lbl">{g.short}</span>
        </button>
      );
    })}
    <div className="his-rail-spacer" />
  </aside>
);

/* ==========================================================================
   Flyout — slide-out submenu (240px wide), pinnable
   ========================================================================== */

type FlyoutProps = {
  groupId: string;
  activeItemId: string | null;
  pinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onKeepOpen: () => void;
};

const Flyout: React.FC<FlyoutProps> = ({ groupId, activeItemId, pinned, onClose, onTogglePin, onKeepOpen }) => {
  const g = HIS_GROUPS.find((x) => x.id === groupId);
  if (!g) return null;
  return (
    <div
      className={'his-flyout' + (pinned ? ' pinned' : '')}
      onMouseEnter={onKeepOpen}
      onMouseLeave={() => { if (!pinned) onClose(); }}
    >
      <div className="his-flyout-head">
        <div className="his-flyout-title">
          <TermIcon name={g.icon} size={14} />
          <span>{g.label}</span>
          <span className="count">{g.items.length}</span>
        </div>
        <div className="his-flyout-actions">
          <button
            type="button"
            className={'his-flyout-pin' + (pinned ? ' on' : '')}
            onClick={onTogglePin}
            title={pinned ? 'Bỏ ghim menu' : 'Ghim menu'}
          >
            {pinned ? '◉' : '◯'}
          </button>
          {!pinned && (
            <button type="button" className="his-flyout-close" onClick={onClose} title="Đóng">×</button>
          )}
        </div>
      </div>
      <div className="his-flyout-body">
        {g.items.map((it) => (
          <Link
            key={it.id}
            to={it.path}
            className={'his-flyout-item' + (it.id === activeItemId ? ' active' : '')}
          >
            <span className="lbl">{it.label}</span>
            {it.hot ? <span className="hot">{it.hot}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
};

/* ==========================================================================
   Topbar — hospital crumb + command palette + clock/shift/user
   ========================================================================== */

function useClock() {
  const [now, setNow] = useState(new Date());
  useInterval(() => setNow(new Date()), 30_000);
  return now;
}

const DEMO_NOTIFICATIONS = [
  { t: 'crit', time: '08:42', title: 'Troponin cao',     msg: 'BN-00201 Troponin I 0.82 — CT STAT đã chỉ định' },
  { t: 'warn', time: '08:30', title: 'Kho dược',          msg: 'Omeprazol 20mg còn 580 viên (< 2.000)' },
  { t: 'info', time: '08:18', title: 'BHYT lô T10',      msg: 'Đã gửi 1.248 hồ sơ · chờ duyệt 12' },
  { t: 'ok',   time: '07:50', title: 'Backup',            msg: 'Backup DB hoàn tất · 4.2 GB · NAS-02' },
];

const Topbar: React.FC<{ crumb: string[]; onCmdK: () => void; onSwitchLayout: () => void; onLogout: () => void }> = ({
  crumb,
  onCmdK,
  onSwitchLayout,
  onLogout,
}) => {
  const now = useClock();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][now.getDay()];
  const fullName = user?.fullName || user?.username || 'Administrator';
  const initials = fullName.split(' ').filter(Boolean).slice(-2).map((x) => x[0]).join('').toUpperCase().slice(0, 2) || 'A';
  const role = user?.roles?.[0] || 'Admin';

  const notifContent = (
    <div style={{ width: 320, maxHeight: 380, overflow: 'auto', margin: -12 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e4e9f0', fontSize: 12, fontWeight: 600, color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
        <span>Thông báo</span>
        <span style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{DEMO_NOTIFICATIONS.length} mới</span>
      </div>
      {DEMO_NOTIFICATIONS.map((n, i) => (
        <div
          key={i}
          className={'alert-row ' + n.t}
          style={{ padding: '8px 14px', borderTop: i ? '1px solid #f1f4f9' : 'none' }}
        >
          <div className="alert-dt">{n.time}</div>
          <div>
            <div className="alert-who">{n.title}</div>
            <div className="alert-msg">{n.msg}</div>
          </div>
        </div>
      ))}
      <div style={{ padding: '8px 14px', borderTop: '1px solid #e4e9f0', textAlign: 'center' }}>
        <Link to="/v2/admin" style={{ color: '#2563eb', fontSize: 12, fontWeight: 500 }}>Xem tất cả →</Link>
      </div>
    </div>
  );

  const userMenu: MenuProps['items'] = [
    { key: 'profile', label: <span style={{ fontSize: 12 }}>Hồ sơ · {role}</span>, disabled: true },
    { type: 'divider' },
    { key: 'admin',    label: 'Quản trị hệ thống',      onClick: () => navigate('/v2/admin') },
    { key: 'layout',   label: 'Chuyển sang Layout cũ',  onClick: onSwitchLayout },
    { key: 'help',     label: 'Trợ giúp (F1)',           onClick: () => navigate('/v2/help') },
    { type: 'divider' },
    { key: 'logout',   label: <span style={{ color: '#dc2626' }}>Đăng xuất</span>, onClick: onLogout },
  ];

  return (
    <header className="his-topbar">
      <div className="his-tb-crumb">
        <span className="hosp">
          <TermIcon name="shield" size={14} /> {HOSPITAL_NAME}
        </span>
        {crumb.map((c, i) => (
          <React.Fragment key={i}>
            <span className="slash">/</span>
            <span className={i === crumb.length - 1 ? 'here' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <button type="button" className="his-cmd" onClick={onCmdK} title="Command palette (Ctrl+K)">
        <span className="prompt">❯</span>
        <span className="hint">Tìm BN, XN, HĐ, thuốc, phòng… (mã, tên, SĐT)</span>
        <kbd>⌘</kbd><kbd>K</kbd>
      </button>
      <div className="his-tb-right">
        <div className="his-chip-shift"><span className="dot" />CA SÁNG · {hh}:{mm}</div>
        <button type="button" className="his-tb-btn" title={isDark ? 'Chế độ Sáng' : 'Chế độ Tối'} aria-label="Đổi giao diện Sáng/Tối" onClick={toggleTheme}>
          <TermIcon name={isDark ? 'sun' : 'moon'} size={15} />
        </button>
        <button type="button" className="his-tb-btn" title="Giao ca / Làm mới" onClick={() => window.location.reload()}>
          <TermIcon name="refresh" size={15} />
        </button>
        <button type="button" className="his-tb-btn" title="Trợ giúp (F1)" onClick={() => navigate('/v2/help')}>
          <TermIcon name="info" size={15} />
        </button>
        <AiQueueBadge />
        <Popover content={notifContent} trigger="click" placement="bottomRight" styles={{ content: { padding: 12 } }}>
          <button type="button" className="his-tb-btn" title="Thông báo (có mới)">
            <TermIcon name="bell" size={15} />
            <span className="dot-alert" />
          </button>
        </Popover>
        <button type="button" className="his-tb-btn" onClick={onSwitchLayout} title="Chuyển sang Layout cũ (v1)">
          <TermIcon name="external" size={15} />
        </button>
        <div className="his-clock">
          <div>{hh}:{mm}</div>
          <div className="d">{dd}/{mo} · {wd}</div>
        </div>
        <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
          <div className="his-user" title={fullName}>
            <div className="avatar">{initials}</div>
            <div className="who">
              <span className="n">{fullName}</span>
              <span className="r">{role}</span>
            </div>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

/* ==========================================================================
   Ticker — LIVE badge + optional patient pill + scrolling realtime metrics
   ========================================================================== */

const TICKER_ITEMS: { label: string; val: string; unit?: string; cls?: 'up' | 'down' | 'warn' }[] = [
  { label: 'OPD',     val: '164', unit: 'BN',   cls: 'up' },
  { label: 'CẤP CỨU', val: '6',   unit: 'BN',   cls: 'warn' },
  { label: 'NỘI TRÚ', val: '34',  unit: 'BN' },
  { label: 'XN CHỜ',  val: '47' },
  { label: 'CĐHA',    val: '9' },
  { label: 'MỔ',      val: '7',   cls: 'up' },
  { label: 'GIƯỜNG',  val: '60%', cls: 'warn' },
  { label: 'BHYT',    val: '98.2%', cls: 'up' },
  { label: 'DOANH THU', val: '64M', unit: 'VNĐ' },
  { label: 'DƯỢC CHỜ', val: '3' },
  { label: 'HL7',     val: 'OK',  cls: 'up' },
  { label: 'PACS',    val: 'OK',  cls: 'up' },
];

type TickerPatient = {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
};

const Ticker: React.FC<{ patient: TickerPatient | null; onClearPatient: () => void }> = ({ patient, onClearPatient }) => (
  <div className="his-ticker">
    <div className="his-ticker-head"><span className="dot" />LIVE · HIS</div>
    {patient && (
      <div className="his-patient-pill" title="Bệnh nhân đang chọn">
        <span className="tk">BN</span>
        <span className="nm">{patient.name}</span>
        <span className="id">{patient.id} · {patient.age}T · {patient.gender === 'M' ? 'Nam' : 'Nữ'}</span>
        <span className="x" onClick={(e) => { e.stopPropagation(); onClearPatient(); }} title="Bỏ chọn BN">×</span>
      </div>
    )}
    <div className="his-ticker-scroll">
      {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
        <span key={i} className={'his-ticker-item ' + (t.cls || '')}>
          <span>{t.label}</span>
          <b>{t.val}{t.unit ? <span style={{ color: '#64748b', fontWeight: 400 }}> {t.unit}</span> : null}</b>
        </span>
      ))}
    </div>
  </div>
);

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

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const moduleMatches = useMemo(() => {
    if (!q) return ALL_ITEMS.slice(0, 12);
    const lq = q.toLowerCase();
    return ALL_ITEMS.filter((r) => r.label.toLowerCase().includes(lq) || r.path.toLowerCase().includes(lq)).slice(0, 12);
  }, [q]);

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
          <div className="his-cmdk-sec">Mô-đun ({ALL_ITEMS.length} trang)</div>
          {flat.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
              Không có kết quả cho "{q}"
            </div>
          ) : (
            flat.map((r, i) => (
              <div
                key={r.id}
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
          <span style={{ marginLeft: 'auto' }}>HIS · {ALL_ITEMS.length} trang</span>
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

const TerminalShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
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
  const clearPatient = () => {
    setPatient(null);
    try { storage.remove(STORAGE_KEYS.patient); } catch { /* ignore */ }
  };

  // Hover intent: slight delay so accidental pointer crossings don't flicker
  const scheduleHoverClose = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredGroupId(null), 180);
  };
  const cancelHoverClose = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  const onHoverGroup = (id: string | null) => {
    cancelHoverClose();
    if (id) setHoveredGroupId(id);
    else scheduleHoverClose();
  };

  const onClickGroup = (id: string) => {
    if (pinnedGroupId === id) {
      setPinnedGroupId(null);
    } else {
      setPinnedGroupId(id);
      setHoveredGroupId(id);
    }
  };

  // Close flyout when navigating (unless pinned)
  const [lastPath, setLastPath] = useState(location.pathname);
  useEffect(() => {
    if (location.pathname !== lastPath) {
      if (!pinnedGroupId) setHoveredGroupId(null);
      setLastPath(location.pathname);
    }
  }, [location.pathname, lastPath, pinnedGroupId]);

  const onSwitchLayout = () => {
    storage.set(STORAGE_KEYS.layoutMode, 'v1');
    let v1 = location.pathname.replace(/^\/v2/, '') || '/';
    if (v1 === '/dashboard') v1 = '/';
    navigate(v1);
  };

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
          onLogout={() => { logout(); navigate('/login'); }}
        />
        <Ticker patient={patient} onClearPatient={clearPatient} />
        <div className="his-main">
          <div className="his-content">
            <ConfigProvider
              theme={{
                token: {
                  colorPrimary: '#2563eb',
                  colorInfo: '#0284c7',
                  colorSuccess: '#16a34a',
                  colorWarning: '#d97706',
                  colorError: '#dc2626',
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
                  borderRadius: 6,
                  borderRadiusLG: 8,
                  borderRadiusSM: 4,
                  controlHeight: 34,
                  controlHeightLG: 40,
                  controlHeightSM: 26,
                  fontFamily: 'Inter, "IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 13,
                  fontSizeLG: 14,
                  fontSizeSM: 12,
                  fontSizeHeading1: 32,
                  fontSizeHeading2: 26,
                  fontSizeHeading3: 20,
                  fontSizeHeading4: 16,
                  lineHeight: 1.5,
                },
                components: {
                  Button: { fontWeight: 500, controlHeight: 34 },
                  Card: { headerBg: '#ffffff', headerHeight: 44, paddingLG: 18 },
                  Table: {
                    headerBg: '#f7f9fc',
                    headerColor: '#64748b',
                    headerSplitColor: '#e4e9f0',
                    rowHoverBg: '#f7f9fc',
                    rowSelectedBg: '#eff5ff',
                    rowSelectedHoverBg: '#e5edf7',
                    borderColor: '#f1f4f9',
                    cellPaddingBlock: 10,
                    cellPaddingInline: 14,
                    cellFontSize: 13,
                  },
                  Tag: { defaultBg: '#f1f5f9', defaultColor: '#334155' },
                  Tabs: {
                    titleFontSize: 13,
                    horizontalItemGutter: 24,
                    inkBarColor: '#2563eb',
                    itemSelectedColor: '#2563eb',
                    itemActiveColor: '#1d4ed8',
                    itemHoverColor: '#0f172a',
                  },
                  Menu: {
                    itemBg: 'transparent',
                    itemColor: '#334155',
                    itemHoverBg: '#f1f5f9',
                    itemSelectedBg: '#eff5ff',
                    itemSelectedColor: '#2563eb',
                    itemHeight: 36,
                    itemBorderRadius: 4,
                  },
                  Input: {
                    hoverBorderColor: '#bfd3fa',
                    activeBorderColor: '#2563eb',
                    activeShadow: '0 0 0 3px #eff5ff',
                  },
                  Select: { optionSelectedBg: '#eff5ff', optionSelectedColor: '#2563eb' },
                  Statistic: { titleFontSize: 11, contentFontSize: 26 },
                  Modal: { titleFontSize: 15, headerBg: '#ffffff' },
                  Descriptions: { titleColor: '#64748b', labelBg: '#f7f9fc' },
                  Drawer: { fontSizeLG: 15 },
                  Alert: { defaultPadding: '8px 12px' },
                  Segmented: {
                    itemSelectedBg: '#ffffff',
                    itemSelectedColor: '#0f172a',
                    trackBg: '#f7f9fc',
                  },
                  Form: { labelColor: '#64748b', labelFontSize: 12 },
                },
              }}
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
