// HIS Terminal — shared interactive UI (modals, drawers, confirms, toasts)
// Exposes: HUI.open(content), HUI.drawer(content), HUI.confirm(...), HUI.toast(...)
// Inside modals: <HUI.Modal title size footer onClose>..</HUI.Modal>, <HUI.Drawer>..</HUI.Drawer>
// Form primitives: <HUI.Field>, <HUI.Row>, <HUI.Btn>, <HUI.Input>, <HUI.Select>, <HUI.Textarea>
// Renders to #hui-root (auto-inserted). All state-managed globally via window.__HUI_STATE.

(() => {
  const { useState: _uS, useEffect: _uE, useMemo: _uM, useRef: _uR } = React;

  // ========= store =========
  const state = {
    stack: [],          // [{id, kind:'modal'|'drawer', node, onClose}]
    toasts: [],
    listeners: new Set(),
  };
  window.__HUI_STATE = state;

  const emit = () => state.listeners.forEach(fn => fn());
  const sub = (fn) => { state.listeners.add(fn); return () => state.listeners.delete(fn); };

  let nextId = 1;
  const push = (kind, node, onClose) => {
    const id = "h" + (nextId++);
    state.stack.push({ id, kind, node, onClose });
    emit();
    return id;
  };
  const close = (id) => {
    const it = state.stack.find(x => x.id === id);
    if (!it) return;
    state.stack = state.stack.filter(x => x.id !== id);
    if (it.onClose) it.onClose();
    emit();
  };
  const closeTop = () => {
    if (state.stack.length) close(state.stack[state.stack.length - 1].id);
  };
  const closeAll = () => { state.stack = []; emit(); };

  // ========= primitives =========
  const Btn = ({ variant = "ghost", size = "md", icon, children, ...rest }) => {
    const cls = `hui-btn hui-btn-${variant} hui-btn-${size}`;
    return (
      <button className={cls} {...rest}>
        {icon && <Ico name={icon} size={size === "sm" ? 12 : 14}/>}
        {children}
      </button>
    );
  };

  const Field = ({ label, hint, required, error, children, span = 1 }) => (
    <label className={`hui-field hui-span-${span}`}>
      {label && <span className="hui-lbl">{label}{required && <i className="req">*</i>}</span>}
      {children}
      {hint && !error && <span className="hui-hint">{hint}</span>}
      {error && <span className="hui-err">{error}</span>}
    </label>
  );

  const Row = ({ cols = 2, children, gap = 10 }) => (
    <div className="hui-row" style={{gridTemplateColumns:`repeat(${cols}, 1fr)`, gap}}>{children}</div>
  );

  const Input = React.forwardRef(({ icon, suffix, ...p }, ref) => (
    <div className="hui-inp-wrap">
      {icon && <span className="pre"><Ico name={icon} size={13}/></span>}
      <input ref={ref} className="hui-inp" {...p}/>
      {suffix && <span className="suf">{suffix}</span>}
    </div>
  ));

  const Select = ({ options = [], ...p }) => (
    <div className="hui-inp-wrap">
      <select className="hui-inp hui-sel" {...p}>
        {options.map((o, i) => typeof o === "string"
          ? <option key={i} value={o}>{o}</option>
          : <option key={i} value={o.value}>{o.label}</option>)}
      </select>
      <span className="suf"><Ico name="chev-d" size={12}/></span>
    </div>
  );

  const Textarea = (p) => <textarea className="hui-inp hui-ta" {...p}/>;

  const Chk = ({ label, checked, onChange, hint }) => (
    <label className="hui-chk">
      <input type="checkbox" checked={!!checked} onChange={e => onChange && onChange(e.target.checked)}/>
      <span className="box"><Ico name="check" size={10}/></span>
      <span className="t">{label}{hint && <i className="hui-hint" style={{marginLeft:6}}>{hint}</i>}</span>
    </label>
  );

  const Radio = ({ options = [], value, onChange, name }) => (
    <div className="hui-radio-g">
      {options.map(o => {
        const v = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        const sub = typeof o === "object" ? o.sub : null;
        return (
          <label key={v} className={`hui-radio ${value === v ? "on" : ""}`}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange && onChange(v)}/>
            <span className="dot"/>
            <span className="t">
              <b>{lbl}</b>
              {sub && <i>{sub}</i>}
            </span>
          </label>
        );
      })}
    </div>
  );

  // ========= Modal shell (used inside open()) =========
  const Modal = ({ title, sub, size = "md", footer, tone, children, onClose, dense, scroll = true }) => (
    <div className={`hui-modal hui-size-${size} ${tone ? "hui-tone-" + tone : ""} ${dense ? "dense" : ""}`}>
      <header className="hui-modal-h">
        <div className="t">
          <div className="tt">{title}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <button className="hui-x" onClick={onClose} title="Đóng (Esc)">
          <Ico name="x" size={14}/>
        </button>
      </header>
      <div className={"hui-modal-b" + (scroll ? "" : " no-scroll")}>{children}</div>
      {footer && <footer className="hui-modal-f">{footer}</footer>}
    </div>
  );

  // ========= Drawer shell =========
  const Drawer = ({ title, sub, width = 560, footer, children, onClose, tabs, activeTab, onTab }) => (
    <div className="hui-drawer" style={{width}}>
      <header className="hui-drawer-h">
        <div className="t">
          <div className="tt">{title}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <button className="hui-x" onClick={onClose}><Ico name="x" size={14}/></button>
      </header>
      {tabs && (
        <nav className="hui-drawer-tabs">
          {tabs.map(t => (
            <button key={t.id} className={activeTab === t.id ? "on" : ""} onClick={() => onTab && onTab(t.id)}>
              {t.label}{t.count != null && <span className="n">{t.count}</span>}
            </button>
          ))}
        </nav>
      )}
      <div className="hui-drawer-b">{children}</div>
      {footer && <footer className="hui-drawer-f">{footer}</footer>}
    </div>
  );

  // ========= open() / drawer() / confirm() / toast() =========
  // Wrapper FC so hooks inside renderFn are legal
  const RenderHost = ({ rf, cx }) => rf(cx);

  const open = (renderFn) => {
    const id = push("modal", null, null);
    const item = state.stack.find(x => x.id === id);
    const cx = () => close(id);
    item.node = <RenderHost rf={renderFn} cx={cx}/>;
    emit();
    return cx;
  };

  const drawer = (renderFn) => {
    const id = push("drawer", null, null);
    const item = state.stack.find(x => x.id === id);
    const cx = () => close(id);
    item.node = <RenderHost rf={renderFn} cx={cx}/>;
    emit();
    return cx;
  };

  const confirm = ({ title, body, danger, confirmText = "Xác nhận", cancelText = "Hủy", onConfirm }) => {
    open((cx) => (
      <Modal title={title} size="sm" tone={danger ? "danger" : null} onClose={cx}
        footer={<>
          <Btn variant="ghost" onClick={cx}>{cancelText}</Btn>
          <Btn variant={danger ? "danger" : "primary"} onClick={() => { onConfirm && onConfirm(); cx(); }}>{confirmText}</Btn>
        </>}>
        <div className="hui-confirm-body">{body}</div>
      </Modal>
    ));
  };

  const toast = (msg, { tone = "ok", duration = 2600 } = {}) => {
    const id = "t" + (nextId++);
    state.toasts.push({ id, msg, tone });
    emit();
    setTimeout(() => {
      state.toasts = state.toasts.filter(t => t.id !== id);
      emit();
    }, duration);
  };

  // ========= root renderer =========
  const Root = () => {
    const [, force] = _uS(0);
    _uE(() => sub(() => force(n => n + 1)), []);
    _uE(() => {
      const h = (e) => {
        if (e.key === "Escape" && state.stack.length) {
          e.preventDefault();
          closeTop();
        }
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, []);

    const modals = state.stack.filter(x => x.kind === "modal");
    const drawers = state.stack.filter(x => x.kind === "drawer");
    const hasOverlay = state.stack.length > 0;

    return (
      <>
        {hasOverlay && <div className="hui-backdrop" onClick={closeTop}/>}
        {drawers.map(d => (
          <div key={d.id} className="hui-drawer-wrap" onClick={e => e.stopPropagation()}>
            {d.node}
          </div>
        ))}
        {modals.map(m => (
          <div key={m.id} className="hui-modal-wrap" onClick={e => e.stopPropagation()}>
            {m.node}
          </div>
        ))}
        <div className="hui-toasts">
          {state.toasts.map(t => (
            <div key={t.id} className={`hui-toast hui-tone-${t.tone}`}>
              <Ico name={t.tone === "err" ? "alert" : t.tone === "warn" ? "alert" : "check"} size={13}/>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  // mount root
  const mount = () => {
    let el = document.getElementById("hui-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "hui-root";
      document.body.appendChild(el);
    }
    ReactDOM.createRoot(el).render(<Root/>);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // ========= export =========
  window.HUI = {
    open, drawer, confirm, toast, closeAll, closeTop,
    Modal, Drawer, Btn, Field, Row, Input, Select, Textarea, Chk, Radio,
  };
})();
