// =====================================================================
// HIS Terminal · Module v2 Kit
// Shared scaffold: KPIs, top tabs, status sub-tabs, toolbar, table, drawer
// Use: <V2Page kpis={...} tabs={...} toolbar={...} table={...} actions={...} />
// or compose pieces directly.
// =====================================================================

const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR, useCallback: uCB } = React;

// ──────────── Shared helpers (used by every mod-*-v2.jsx) ────────────
// Deterministic PRNG so seeds reproduce across reloads
window.seedRand = window.seedRand || ((s) => { let x = s|0 || 1; return () => (x = (x*9301+49297)%233280) / 233280; });
var seedRand = window.seedRand;

// Reference "today" used across all mock data so timelines align
window.todayIv = window.todayIv || new Date(2026, 4, 3);
window.daysIv = window.daysIv || ((n) => { const d = new Date(window.todayIv); d.setDate(d.getDate()+n); return d; });
var todayIv = window.todayIv;
var daysIv = window.daysIv;

// ──────────── Building blocks ────────────
const KpiStrip = ({ items }) => (
  <div className="ab-kpis">
    {items.map((k, i) => (
      <div key={i} className={`ab-kpi ${k.tone||""}`}>
        <div className="lbl">{k.lbl}</div>
        <div className="val">{k.val}{k.unit && <small style={{fontSize:13,color:"var(--t-2)",marginLeft:3}}>{k.unit}</small>}</div>
        <div className="sub">{k.sub}</div>
      </div>
    ))}
  </div>
);

const TopTabs = ({ tab, setTab, tabs, actions }) => (
  <div className="ab-toptabs">
    {tabs.map(t => (
      <button key={t.v} className={tab===t.v?"on":""} onClick={()=>setTab(t.v)}>
        {t.ic && <Ico name={t.ic} size={13}/>} {t.l}
      </button>
    ))}
    <span className="spacer"/>
    {actions}
  </div>
);

const StatusTabs = ({ value, onChange, tabs, counts }) => (
  <div className="ab-stab">
    <button className={value==="all"?"on":""} onClick={()=>onChange("all")}>Tất cả <i>{counts.all||0}</i></button>
    {tabs.map(s => (
      <button key={s.v} className={value===s.v?"on":""} onClick={()=>onChange(s.v)}>
        <span className={`ab-dot ${s.tone}`}/> {s.l} <i>{counts[s.v]||0}</i>
      </button>
    ))}
  </div>
);

const SearchBox = ({ value, onChange, placeholder }) => (
  <div className="ab-search" style={{minWidth:280, flex:"1 1 280px"}}>
    <Ico name="search" size={13}/>
    <input placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/>
    {value && <button onClick={()=>onChange("")}><Ico name="x" size={11}/></button>}
  </div>
);

const Filter = ({ value, onChange, options, placeholder }) => (
  <select className="ab-sel" value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

// ──────────── Generic table ────────────
// columns: [{ key, label, render?, mono?, code?, width? }]
// data: array of rows
// rowKey: fn(row) -> string
// onRowClick: fn(row)
// actions: fn(row) -> JSX (right-aligned action buttons)
// selected: Set | null (null = no checkbox col)
// onToggle: fn(rowKey)
// onToggleAll: fn()
const DataTable = ({ columns, data, rowKey, onRowClick, actions, selected, onToggle, onToggleAll, empty = "Không có dữ liệu" }) => {
  const allChecked = selected && data.length > 0 && data.every(r => selected.has(rowKey(r)));
  return (
    <div className="ab-tbl-wrap">
      <table className="ab-tbl">
        <thead>
          <tr>
            {selected && <th className="ck"><input type="checkbox" checked={allChecked} onChange={onToggleAll}/></th>}
            {columns.map(c => <th key={c.key} style={c.width?{width:c.width}:undefined}>{c.label}</th>)}
            {actions && <th className="act">Hành động</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr><td colSpan={(selected?1:0)+columns.length+(actions?1:0)} style={{padding:"40px 20px",textAlign:"center",color:"var(--t-2)"}}>{empty}</td></tr>
          )}
          {data.map(r => {
            const k = rowKey(r);
            const on = selected && selected.has(k);
            return (
              <tr key={k} className={on?"on":""}>
                {selected && (
                  <td className="ck"><input type="checkbox" checked={on} onChange={(e)=>{e.stopPropagation();onToggle(k);}}/></td>
                )}
                {columns.map(c => (
                  <td key={c.key} className={`${c.mono?"mono":""} ${c.code?"code":""}`} onClick={onRowClick?()=>onRowClick(r):undefined}>
                    {c.render ? c.render(r) : r[c.key]}
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
};

// ──────────── Pagination ────────────
const Pager = ({ page, totalPages, setPage, total, perPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderTop:"1px solid var(--line)",background:"#fff",fontSize:12,color:"var(--t-2)",flexShrink:0}}>
      <span>Hiển thị <b style={{color:"var(--t-0)"}}>{page*perPage+1}–{Math.min((page+1)*perPage,total)}</b> / {total}</span>
      <span style={{flex:1}}/>
      <button className="ab-btn ghost sm" onClick={()=>setPage(0)} disabled={page===0}>«</button>
      <button className="ab-btn ghost sm" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>‹</button>
      <span style={{fontFamily:"var(--font-mono)",fontSize:11.5}}>{page+1}/{totalPages}</span>
      <button className="ab-btn ghost sm" onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1}><Ico name="chevronR" size={11}/></button>
      <button className="ab-btn ghost sm" onClick={()=>setPage(totalPages-1)} disabled={page>=totalPages-1}>»</button>
    </div>
  );
};

// ──────────── Helpers ────────────
const fmtVNDg = (n) => n ? n.toLocaleString("vi-VN") + " ₫" : "Miễn phí";
const fmtHMg  = (d) => d ? `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` : "—";
const fmtDMYg = (d) => d ? `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}` : "—";
const fmtDTg  = (d) => d ? `${fmtDMYg(d)} ${fmtHMg(d)}` : "—";
const todayG  = new Date(2026, 9, 22);

const StatusBadge = ({ tone, children, dot }) => (
  <span className={`ab-stat ${tone||"info"}`}>{dot && <span className={`ab-dot ${tone}`}/>}{children}</span>
);

// Action icon button (in row)
const ActBtn = ({ ic, title, onClick, tone }) => (
  <button className="ab-iconbtn" title={title} onClick={(e)=>{e.stopPropagation();onClick(e);}} style={tone==="crit"?{color:"var(--s-crit)"}:undefined}>
    <Ico name={ic} size={12}/>
  </button>
);

// Drawer body sections
const DrSec = ({ title, children, action }) => (
  <section style={{padding:"14px 20px",borderBottom:"1px solid var(--line-soft)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <h4 style={{margin:0,fontSize:11,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>{title}</h4>
      {action}
    </div>
    {children}
  </section>
);
const DrField = ({ lbl, children }) => (
  <div style={{display:"grid",gridTemplateColumns:"110px 1fr",gap:10,padding:"4px 0",fontSize:12.5}}>
    <div style={{color:"var(--t-2)"}}>{lbl}</div>
    <div style={{color:"var(--t-0)"}}>{children}</div>
  </div>
);

// Audit log line
const AuditLine = ({ entry }) => (
  <div style={{display:"flex",gap:10,padding:"6px 0",fontSize:12,borderBottom:"1px dashed var(--line-soft)"}}>
    <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--t-3)",minWidth:42}}>{fmtHMg(new Date(entry.t))}</span>
    <span className={`ab-dot ${entry.tone||"info"}`} style={{marginTop:6}}/>
    <span style={{flex:1}}>
      <span style={{color:"var(--t-0)"}}>{entry.action}</span>
      {entry.by && <span style={{color:"var(--t-2)",marginLeft:6,fontSize:11}}>· {entry.by}</span>}
    </span>
  </div>
);

// Names + utility data
const VN_NAMES = [
  "Nguyễn Văn An","Trần Thị Bình","Lê Hoàng Cường","Phạm Thị Dung","Vũ Văn Em","Đặng Thị Phương",
  "Hoàng Văn Giang","Bùi Thị Hằng","Mai Văn Khôi","Lý Thị Lan","Phan Văn Minh","Đỗ Thị Nga",
  "Trịnh Văn Oanh","Cao Thị Phúc","Dương Văn Quân","Tô Thị Rồng","Nguyễn Thị Sao","Lê Văn Tùng",
  "Phạm Thị Uyên","Vũ Văn Vinh","Hoàng Thị Xuân","Trần Văn Yên","Lê Thị Bích","Đỗ Văn Cương",
  "Phạm Thị Dương","Bùi Văn Hà","Mai Thị Hương","Vũ Văn Khoa","Trần Thị Lý","Nguyễn Văn Phong",
  "Đặng Thị Quỳnh","Hoàng Văn Sơn","Bùi Thị Trang","Mai Văn Tuấn","Lý Thị Vân","Phan Văn Xuân",
];
const rndName = (i) => VN_NAMES[i % VN_NAMES.length];
const rndPhone = () => "09" + Math.floor(10000000 + Math.random()*89999999);
const rndPid = () => "BN-" + String(140 + Math.floor(Math.random()*200)).padStart(5,"0");
const rndAge = () => 18 + Math.floor(Math.random()*70);
const rndGender = () => Math.random()>0.5 ? "Nam" : "Nữ";
const rndPick = (arr) => arr[Math.floor(Math.random()*arr.length)];
const rndPickN = (arr, n) => { const c=[...arr]; const r=[]; for(let i=0;i<n&&c.length;i++) r.push(c.splice(Math.floor(Math.random()*c.length),1)[0]); return r; };

// Basic confirm helper wrapper
const cf = (msg, fn, opts={}) => HUI.confirm({ title: opts.title || "Xác nhận", message: msg, tone: opts.tone || "info", confirmText: opts.confirm || "Đồng ý", cancelText: "Hủy", onConfirm: fn });

// Toast wrappers
const tk = (msg) => HUI.toast(msg, { tone: "ok" });
const ti = (msg) => HUI.toast(msg, { tone: "info" });
const tw = (msg) => HUI.toast(msg, { tone: "warn" });
const te = (msg) => HUI.toast(msg, { tone: "crit" });

// Export to window
Object.assign(window, {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, DrSec, DrField, AuditLine,
  fmtVNDg, fmtHMg, fmtDMYg, fmtDTg, todayG,
  VN_NAMES, rndName, rndPhone, rndPid, rndAge, rndGender, rndPick, rndPickN,
  cf, tk, ti, tw, te,
});
