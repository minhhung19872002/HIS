import React from 'react';
import { Link } from 'react-router-dom';
import TermIcon from './Icon';
import { getVisibleGroups } from '../../../services/menu.service';

/* Auto-extracted from TerminalLayout.tsx (#376 split) — behavior-preserving verbatim move. */

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

const Rail = React.memo(({ activeGroupId, pinnedGroupId, hoveredGroupId, onHoverGroup, onClickGroup }: RailProps) => (
  <aside className="his-rail" onMouseLeave={() => onHoverGroup(null)}>
    <Link to="/v2" className="his-rail-mark" title="HIS Terminal — Chỉ mục">HIS</Link>
    {/* #378: chỉ render group/item user có quyền thấy (fail-open khi set chưa nạp) */}
    {getVisibleGroups().map((g) => {
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
));
Rail.displayName = 'Rail';

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

const Flyout = React.memo(({ groupId, activeItemId, pinned, onClose, onTogglePin, onKeepOpen }: FlyoutProps) => {
  const g = getVisibleGroups().find((x) => x.id === groupId);
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
});
Flyout.displayName = 'Flyout';

export { Rail, Flyout };
