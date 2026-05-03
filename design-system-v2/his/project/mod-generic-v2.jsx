// =====================================================================
// HIS · Generic Module v2 builder
// Renders a full v2 page from a config object.
// Use: window.GenericV2Page(config) returns a React component.
//
// config = {
//   title: string,
//   icon: string,
//   kpis: [{lbl,val,unit,sub,tone}],
//   filterTabs: [{v,l,ic}],          // top tabs
//   statusTabs: [{v,l,tone}],        // sub status tabs
//   columns: [{key,label,render?,mono?,code?,width?}],
//   data: [...rows],
//   rowKey: row -> string,
//   searchKeys: ['col1','col2'],     // fields to search across
//   searchPlaceholder: "...",
//   filters: [{key, label, options:[{v,l}]}],
//   actions: [{ic,title,tone?,onClick(row)}],   // row actions
//   bulkActions: [{label, ic, tone?, onClick(selectedKeys)}],
//   primaryAction: {label, ic, onClick()},      // top-right
//   drawerSections: row -> [{title,fields:[{lbl,val}], rows?, action?}],
//   itemDot: row -> tone string for status dot in table
// }
// =====================================================================
window.GenericV2Page = function(cfg) {
  return function GenericPage() {
    const [tab, setTab] = uS(cfg.filterTabs?.[0]?.v || "all");
    const [status, setStatus] = uS("all");
    const [q, setQ] = uS("");
    const [filterVals, setFilterVals] = uS({});
    const [sel, setSel] = uS(new Set());
    const [page, setPage] = uS(0);
    const perPage = 25;
    const [drawerRow, setDrawerRow] = uS(null);

    const counts = uM(() => {
      const c = { all: cfg.data.length };
      cfg.statusTabs?.forEach(s => { c[s.v] = cfg.data.filter(r => r._status === s.v).length; });
      return c;
    }, []);

    const filtered = uM(() => {
      let rows = cfg.data;
      if (status !== "all") rows = rows.filter(r => r._status === status);
      if (q) {
        const ql = q.toLowerCase();
        rows = rows.filter(r => (cfg.searchKeys || Object.keys(r)).some(k => String(r[k] || "").toLowerCase().includes(ql)));
      }
      Object.entries(filterVals).forEach(([k, v]) => { if (v) rows = rows.filter(r => String(r[k]) === v); });
      return rows;
    }, [tab, status, q, filterVals]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const pageRows = filtered.slice(page * perPage, (page + 1) * perPage);
    uE(() => { if (page >= totalPages) setPage(0); }, [totalPages]);

    const toggle = (k) => { const s = new Set(sel); s.has(k) ? s.delete(k) : s.add(k); setSel(s); };
    const toggleAll = () => {
      const allOn = pageRows.length > 0 && pageRows.every(r => sel.has(cfg.rowKey(r)));
      const s = new Set(sel);
      if (allOn) pageRows.forEach(r => s.delete(cfg.rowKey(r)));
      else pageRows.forEach(r => s.add(cfg.rowKey(r)));
      setSel(s);
    };

    const rowActions = cfg.actions ? (r) => (
      <div style={{display:"flex",gap:4}}>
        {cfg.actions.map((a, i) => (
          <ActBtn key={i} ic={a.ic} title={a.title} tone={a.tone} onClick={() => a.onClick(r)} />
        ))}
        <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setDrawerRow(r)} />
      </div>
    ) : (r) => <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setDrawerRow(r)} />;

    return (
      <div className="ab-shell">
        <KpiStrip items={cfg.kpis || []} />

        {cfg.filterTabs && (
          <TopTabs tab={tab} setTab={setTab} tabs={cfg.filterTabs}
            actions={cfg.primaryAction && (
              <button className="ab-btn primary" onClick={cfg.primaryAction.onClick}>
                <Ico name={cfg.primaryAction.ic || "plus"} size={12} /> {cfg.primaryAction.label}
              </button>
            )} />
        )}

        <div className="ab-toolbar">
          <SearchBox value={q} onChange={setQ} placeholder={cfg.searchPlaceholder || "Tìm kiếm..."} />
          {cfg.filters?.map(f => (
            <Filter key={f.key} value={filterVals[f.key] || ""} onChange={v => setFilterVals(s => ({...s, [f.key]: v}))}
              options={f.options} placeholder={f.label} />
          ))}
          <span style={{flex:1}}/>
          {sel.size > 0 && (
            <>
              <span style={{fontSize:12,color:"var(--t-2)"}}>{sel.size} đã chọn</span>
              {cfg.bulkActions?.map((b, i) => (
                <button key={i} className={`ab-btn ${b.tone||"ghost"} sm`} onClick={() => { b.onClick(Array.from(sel)); setSel(new Set()); }}>
                  <Ico name={b.ic} size={12} /> {b.label}
                </button>
              ))}
              <button className="ab-btn ghost sm" onClick={() => setSel(new Set())}>Bỏ chọn</button>
            </>
          )}
          <button className="ab-btn ghost sm" onClick={() => ti("Xuất Excel: " + filtered.length + " dòng")}>
            <Ico name="download" size={12}/> Xuất
          </button>
          <button className="ab-btn ghost sm" onClick={() => window.print()}>
            <Ico name="printer" size={12}/> In
          </button>
        </div>

        {cfg.statusTabs && <StatusTabs value={status} onChange={setStatus} tabs={cfg.statusTabs} counts={counts} />}

        <DataTable columns={cfg.columns} data={pageRows} rowKey={cfg.rowKey}
          onRowClick={(r) => setDrawerRow(r)}
          actions={rowActions}
          selected={sel} onToggle={toggle} onToggleAll={toggleAll}
          empty="Không có dữ liệu khớp bộ lọc" />

        <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={perPage} />

        {drawerRow && (
          <div className="ab-drawer-mask" onClick={() => setDrawerRow(null)}>
            <aside className="ab-drawer" onClick={e => e.stopPropagation()}>
              <header>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:"var(--t-2)",fontFamily:"var(--font-mono)",letterSpacing:".06em"}}>
                    {cfg.drawerCode ? cfg.drawerCode(drawerRow) : cfg.rowKey(drawerRow)}
                  </div>
                  <h3 style={{margin:"4px 0 0",fontSize:16}}>
                    {cfg.drawerTitle ? cfg.drawerTitle(drawerRow) : (drawerRow[cfg.columns[0].key] || cfg.rowKey(drawerRow))}
                  </h3>
                </div>
                <button className="ab-iconbtn" onClick={() => setDrawerRow(null)}><Ico name="x" size={12}/></button>
              </header>
              <div className="body">
                {(cfg.drawerSections ? cfg.drawerSections(drawerRow) : [
                  { title: "Thông tin", fields: cfg.columns.map(c => ({ lbl: c.label, val: c.render ? c.render(drawerRow) : drawerRow[c.key] })) }
                ]).map((sec, i) => (
                  <DrSec key={i} title={sec.title} action={sec.action}>
                    {sec.fields?.map((f, j) => <DrField key={j} lbl={f.lbl}>{f.val}</DrField>)}
                    {sec.body}
                  </DrSec>
                ))}
              </div>
              <footer>
                <button className="ab-btn ghost" onClick={() => setDrawerRow(null)}>Đóng</button>
                {cfg.actions?.[0] && (
                  <button className="ab-btn primary" onClick={() => { cfg.actions[0].onClick(drawerRow); setDrawerRow(null); }}>
                    <Ico name={cfg.actions[0].ic} size={12}/> {cfg.actions[0].title}
                  </button>
                )}
              </footer>
            </aside>
          </div>
        )}
      </div>
    );
  };
};
