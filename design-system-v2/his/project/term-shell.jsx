// App shell: sidebar + command bar + module router.
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const ROUTES = [
  { id: "dashboard", t: "nav.dashboard", icon: "grid",         hot: null },
  { id: "reception", t: "nav.reception", icon: "user-plus",    hot: null },
  { id: "opd",       t: "nav.opd",       icon: "stethoscope",  hot: 8 },
  { id: "ipd",       t: "nav.ipd",       icon: "bed",          hot: null },
  { id: "surgery",   t: "nav.surgery",   icon: "scalpel",      hot: null },
  { id: "billing",   t: "nav.billing",   icon: "receipt",      hot: 3 },
  { id: "ris",       t: "nav.ris",       icon: "scan",         hot: null },
  { id: "lis",       t: "nav.lis",       icon: "flask",        hot: 2 },
];

const useLang = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force(x => x + 1);
    window.addEventListener("lang-changed", h);
    return () => window.removeEventListener("lang-changed", h);
  }, []);
};

const Sidebar = ({ route, setRoute }) => {
  useLang();
  return (
    <aside className="sb">
      <div className="sb-logo" title="HIS Terminal">HIS</div>
      {ROUTES.map(r => (
        <button key={r.id} className={"sb-item " + (route === r.id ? "active" : "")} onClick={() => setRoute(r.id)}>
          <Icon name={r.icon} size={18}/>
          {r.hot && <span className="hot">{r.hot}</span>}
          <span className="sb-tooltip">{t(r.t)}</span>
        </button>
      ))}
      <div className="sb-spacer"/>
      <button className="sb-item">
        <Icon name="settings" size={18}/>
        <span className="sb-tooltip">{t("nav.settings")}</span>
      </button>
    </aside>
  );
};

const CommandBar = ({ route, onCmdOpen, onLogout }) => {
  useLang();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(i);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const here = ROUTES.find(r => r.id === route);

  const toggleLang = () => window.setLang(window.__lang === "vi" ? "en" : "vi");

  return (
    <header className="cmdbar">
      <div className="cmdbar-path">
        <span>his</span>
        <span className="slash">/</span>
        <span>workspace</span>
        <span className="slash">/</span>
        <span className="here">{here ? t(here.t) : ""}</span>
      </div>
      <div className="cmd" onClick={onCmdOpen}>
        <span className="prompt">❯</span>
        <span className="hint">{t("c.search_hint")}</span>
        <kbd>⌘</kbd><kbd>K</kbd>
      </div>
      <div className="cmdbar-right">
        <div className="chip-shift"><span className="dot"/>CA TRỰC · {hh}:{mm}</div>
        <button className="topbtn" onClick={toggleLang}>{window.__lang.toUpperCase()}</button>
        <button className="topbtn icon" title="Notifications">
          <Icon name="bell" size={15}/>
        </button>
        <div className="user" onClick={onLogout}>
          <div className="avatar">NL</div>
          <div className="who">
            <span className="n">BS Nguyễn Hoài Linh</span>
            <span className="r">Nội tổng quát · BS-01</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const StatusBar = ({ route, extra }) => (
  <footer className="statusbar">
    <span className="sb-seg ok"><span className="dot ok"/><b>ONLINE</b></span>
    <span className="sep"/>
    <span className="sb-seg">DB <b>SQL-01</b> · 2ms</span>
    <span className="sep"/>
    <span className="sb-seg">HL7 <b>ACK</b></span>
    <span className="sep"/>
    <span className="sb-seg">PACS <b>8 studies</b></span>
    <span className="sep"/>
    <span className="sb-seg">{extra || `ROUTE · ${route.toUpperCase()}`}</span>
    <div style={{ marginLeft: "auto" }}></div>
    <span className="sb-seg">v2.4.1</span>
    <span className="sep"/>
    <span className="sb-seg">© 2026 HIS</span>
  </footer>
);

// =================== COMMAND PALETTE ===================
const CommandPalette = ({ open, onClose, onNav }) => {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    if (!open) setQ("");
  }, [open]);

  const actions = useMemo(() => [
    { id: "go-dashboard", label: "Đi tới Dashboard", kind: "NAV", go: "dashboard" },
    { id: "go-reception", label: "Tiếp nhận bệnh nhân mới", kind: "NAV", go: "reception" },
    { id: "go-opd", label: "OPD - Hàng chờ khám", kind: "NAV", go: "opd" },
    { id: "go-ipd", label: "IPD - Sơ đồ giường", kind: "NAV", go: "ipd" },
    { id: "go-surgery", label: "Lịch phẫu thuật hôm nay", kind: "NAV", go: "surgery" },
    { id: "go-billing", label: "Hoá đơn chưa thanh toán", kind: "NAV", go: "billing" },
    { id: "go-ris", label: "Worklist chẩn đoán hình ảnh", kind: "NAV", go: "ris" },
    { id: "go-lis", label: "Kết quả xét nghiệm", kind: "NAV", go: "lis" },
    ...HIS_DATA.patients.map(p => ({ id: p.id, label: `${p.name} · ${p.id} · ${p.age} ${p.gender}`, kind: "PATIENT", pid: p.id })),
  ], []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return actions.slice(0, 10);
    return actions.filter(a => a.label.toLowerCase().includes(ql) || a.id.toLowerCase().includes(ql)).slice(0, 12);
  }, [q, actions]);

  const pick = (a) => {
    if (a.kind === "NAV") onNav(a.go);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ minWidth: 560, maxWidth: 640 }} onMouseDown={e => e.stopPropagation()}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, background: "var(--d-0)" }}>
          <span className="mono" style={{ color: "var(--a-cy)" }}>❯</span>
          <input
            ref={inputRef}
            className="mono"
            placeholder="Gõ để tìm bệnh nhân, chuyển module, hoặc ra lệnh…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ flex: 1, background: "transparent", border: 0, color: "var(--t-0)", fontSize: 14 }}
          />
          <kbd>ESC</kbd>
        </div>
        <div style={{ maxHeight: 380, overflow: "auto", padding: 4 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, color: "var(--t-3)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Không tìm thấy kết quả cho "{q}"</div>
          ) : (
            filtered.map(a => (
              <div key={a.id}
                onClick={() => pick(a)}
                className="mono"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 4,
                  cursor: "pointer", fontSize: 12,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--d-3)"}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                <span className="chip" style={{ background: a.kind === "NAV" ? "var(--a-cy-bg)" : "var(--s-mag-bg)", color: a.kind === "NAV" ? "var(--a-cy)" : "var(--s-mag)" }}>
                  {a.kind}
                </span>
                <span style={{ color: "var(--t-0)" }}>{a.label}</span>
                <span className="spacer"/>
                <Icon name="arrow-right" size={12}/>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== TWEAKS ====================
const ACCENTS = [
  { id: "cyan", cy: "#22d3ee", dim: "#0891b2" },
  { id: "emerald", cy: "#34d399", dim: "#059669" },
  { id: "violet", cy: "#a78bfa", dim: "#7c3aed" },
  { id: "amber", cy: "#fbbf24", dim: "#d97706" },
];

const TweaksPanel = ({ onClose }) => {
  const [density, setDensity] = useState(localStorage.getItem("his.term.density") || "compact");
  const [accent, setAccent] = useState(localStorage.getItem("his.term.accent") || "cyan");
  const [radius, setRadius] = useState(localStorage.getItem("his.term.radius") || "sharp");

  useEffect(() => {
    const r = document.documentElement;
    if (density === "compact") {
      r.style.setProperty("--row-h", "28px");
      r.style.setProperty("--ctl-h", "26px");
      r.style.setProperty("--fs-md", "13px");
    } else {
      r.style.setProperty("--row-h", "36px");
      r.style.setProperty("--ctl-h", "32px");
      r.style.setProperty("--fs-md", "14px");
    }
    localStorage.setItem("his.term.density", density);
  }, [density]);

  useEffect(() => {
    const a = ACCENTS.find(x => x.id === accent) || ACCENTS[0];
    const r = document.documentElement;
    r.style.setProperty("--a-cy", a.cy);
    r.style.setProperty("--a-cy-dim", a.dim);
    const hex = a.cy.replace("#", "");
    const rr = parseInt(hex.slice(0,2),16), gg = parseInt(hex.slice(2,4),16), bb = parseInt(hex.slice(4,6),16);
    r.style.setProperty("--a-cy-bg", `rgba(${rr},${gg},${bb},0.08)`);
    r.style.setProperty("--a-cy-line", `rgba(${rr},${gg},${bb},0.25)`);
    localStorage.setItem("his.term.accent", accent);
  }, [accent]);

  useEffect(() => {
    const r = document.documentElement;
    if (radius === "sharp") {
      r.style.setProperty("--r-1", "2px"); r.style.setProperty("--r-2", "4px");
      r.style.setProperty("--r-3", "6px"); r.style.setProperty("--r-4", "10px");
    } else {
      r.style.setProperty("--r-1", "4px"); r.style.setProperty("--r-2", "8px");
      r.style.setProperty("--r-3", "12px"); r.style.setProperty("--r-4", "16px");
    }
    localStorage.setItem("his.term.radius", radius);
  }, [radius]);

  return (
    <div className="tweaks">
      <div className="tweaks-h">
        <span>TWEAKS</span>
        <span className="spacer" style={{ flex: 1 }}/>
        <button className="topbtn icon" onClick={onClose} style={{ color: "var(--t-2)", height: 20, width: 20 }}>
          <Icon name="x" size={12}/>
        </button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <label className="label">Accent</label>
          <div className="swatch-row">
            {ACCENTS.map(a => (
              <div key={a.id}
                className={"swatch " + (accent === a.id ? "on" : "")}
                style={{ background: a.cy }}
                onClick={() => setAccent(a.id)}
              />
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label className="label">Density</label>
          <div className="seg">
            <button className={density === "compact" ? "active" : ""} onClick={() => setDensity("compact")}>Compact</button>
            <button className={density === "comfy" ? "active" : ""} onClick={() => setDensity("comfy")}>Comfy</button>
          </div>
        </div>
        <div className="tweak-row">
          <label className="label">Radius</label>
          <div className="seg">
            <button className={radius === "sharp" ? "active" : ""} onClick={() => setRadius("sharp")}>Sharp</button>
            <button className={radius === "soft" ? "active" : ""} onClick={() => setRadius("soft")}>Soft</button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Sidebar, CommandBar, StatusBar, CommandPalette, TweaksPanel, ROUTES, useLang });
