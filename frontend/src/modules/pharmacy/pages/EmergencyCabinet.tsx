import React, { useCallback, useEffect, useState } from 'react';
import { Input, Select } from 'antd';
import dayjs from 'dayjs';
import { fmtNum as fmt } from '../../../utils/format';
import {
  getWarehouses, getStock, getStockWarnings, createCabinetIssue, getStockIssues,
} from '../api/warehouse';
import type { WarehouseDto, StockDto, StockIssueDto, CreateCabinetIssueDto } from '../api/warehouse';
import { openPrintWindow } from '../../../utils/printWindow';
import {
  KpiStrip, TopTabs, StatusBadge, Btn, Ico, tk, tw,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IssueLine {
  _key: string;
  stockId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  available: number;
  quantity: number;
}

function emptyLine(): IssueLine {
  return { _key: Math.random().toString(36).slice(2), stockId: '', itemId: '', itemCode: '', itemName: '', unit: '', available: 0, quantity: 1 };
}

const TABS = [
  { v: 'cabinets', l: 'Danh sách tủ trực' },
  { v: 'issue',    l: 'Xuất khẩn' },
  { v: 'history',  l: 'Lịch sử xuất' },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = typeof TABS[number]['v'];

const EmergencyCabinetV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('cabinets');

  // Cabinet list
  const [cabinets, setCabinets] = useState<WarehouseDto[]>([]);
  const [cabLoading, setCabLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedStock, setExpandedStock] = useState<StockDto[]>([]);
  const [warnings, setWarnings] = useState<Record<string, StockDto[]>>({});
  const [filterDept, setFilterDept] = useState('');

  // Issue form
  const [issueWh, setIssueWh] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [issueLines, setIssueLines] = useState<IssueLine[]>([emptyLine()]);
  const [whStock, setWhStock] = useState<StockDto[]>([]);
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // History
  const [history, setHistory] = useState<StockIssueDto[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histWh, setHistWh] = useState('');

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadCabinets = useCallback(async () => {
    setCabLoading(true);
    try {
      const r = await getWarehouses(4);
      const list: WarehouseDto[] = Array.isArray(r.data) ? r.data : [];
      setCabinets(list);
      // fetch low-stock warnings for all cabinets in parallel
      const warnMap: Record<string, StockDto[]> = {};
      await Promise.all(list.map(async (c) => {
        try {
          const w = await getStockWarnings(c.id);
          warnMap[c.id] = Array.isArray(w.data) ? w.data : [];
        } catch { warnMap[c.id] = []; }
      }));
      setWarnings(warnMap);
    } catch { tw('Tải danh sách tủ trực thất bại'); }
    finally { setCabLoading(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const r = await getStockIssues({ warehouseId: histWh || undefined, issueType: 12, page: 1, pageSize: 50 });
      const items = (r.data as unknown as { items?: StockIssueDto[] })?.items ?? (Array.isArray(r.data) ? r.data as unknown as StockIssueDto[] : []);
      setHistory(items);
    } catch { tw('Tải lịch sử thất bại'); }
    finally { setHistLoading(false); }
  }, [histWh]);

  useEffect(() => { loadCabinets(); }, [loadCabinets]);
  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);

  // when issue warehouse changes, load its stock
  useEffect(() => {
    if (!issueWh) { setWhStock([]); return; }
    getStock({ warehouseId: issueWh, page: 1, pageSize: 500 })
      .then((r) => {
        const items = (r.data as unknown as { items?: StockDto[] })?.items ?? (Array.isArray(r.data) ? r.data as unknown as StockDto[] : []);
        setWhStock(items.filter((s) => s.quantity > 0));
      })
      .catch(() => setWhStock([]));
  }, [issueWh]);

  const expandCabinet = async (id: string) => {
    if (expanded === id) { setExpanded(null); setExpandedStock([]); return; }
    setExpanded(id);
    try {
      const r = await getStock({ warehouseId: id, page: 1, pageSize: 200 });
      const items = (r.data as unknown as { items?: StockDto[] })?.items ?? (Array.isArray(r.data) ? r.data as unknown as StockDto[] : []);
      setExpandedStock(items);
    } catch { setExpandedStock([]); }
  };

  // ── Issue helpers ─────────────────────────────────────────────────────────────

  const updateLine = (key: string, patch: Partial<IssueLine>) => {
    setIssueLines((prev) => prev.map((l) => l._key === key ? { ...l, ...patch } : l));
  };

  const pickStock = (key: string, s: StockDto) => {
    updateLine(key, {
      stockId: s.id, itemId: s.itemId, itemCode: s.itemCode,
      itemName: s.itemName, unit: s.unit, available: s.quantity, quantity: 1,
    });
  };

  const submitIssue = async () => {
    if (!issueWh) { tw('Chọn tủ trực'); return; }
    const validLines = issueLines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) { tw('Thêm ít nhất một mặt hàng'); return; }
    setIssueSubmitting(true);
    try {
      const dto: CreateCabinetIssueDto = {
        warehouseId: issueWh,
        issueDate: new Date().toISOString(),
        notes: issueNote || 'Xuất khẩn tủ trực',
        items: validLines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, paymentSource: 1 })),
      };
      const r = await createCabinetIssue(dto);
      const issue = r.data as StockIssueDto;
      tk(`Xuất thành công — Phiếu ${issue.issueCode}`);
      printIssue(issue);
      setIssueLines([emptyLine()]);
      setIssueNote('');
      loadCabinets();
    } catch { tw('Xuất thất bại'); }
    finally { setIssueSubmitting(false); }
  };

  const printIssue = (issue: StockIssueDto) => {
    const rows = (issue.items || []).map((it, i) =>
      `<tr><td>${i + 1}</td><td>${it.itemName}</td><td style="text-align:right">${it.quantity}</td><td>${it.unit || ''}</td><td style="text-align:right">${fmt(it.unitPrice || 0)}</td><td style="text-align:right">${fmt((it.unitPrice || 0) * it.quantity)}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${issue.issueCode}</title>
<style>body{font-family:"Times New Roman",serif;padding:24px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #333;padding:4px 8px;font-size:13px}th{background:#eee}.sign{display:flex;justify-content:space-around;margin-top:60px}</style></head><body>
<h2>PHIẾU XUẤT TỦ TRỰC</h2>
<p>Số: <b>${issue.issueCode}</b> &nbsp; Ngày: ${dayjs(issue.issueDate).format('DD/MM/YYYY HH:mm')}</p>
<p>Kho: <b>${issue.warehouseName || ''}</b></p>
<p>Ghi chú: ${issue.notes || ''}</p>
<table><thead><tr><th>STT</th><th>Tên hàng</th><th>SL</th><th>ĐV</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${rows}</tbody></table>
<p style="text-align:right;margin-top:12px"><b>Tổng cộng: ${fmt(issue.totalAmount || 0)} đ</b></p>
<div class="sign"><div>Người lập</div><div>Trưởng khoa</div><div>Thủ kho</div><div>Người nhận</div></div>
</body></html>`;
    openPrintWindow(html, { focus: true, print: 'immediate' });
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const depts = [...new Set(cabinets.filter((c) => c.departmentName).map((c) => c.departmentName!))];
  const filteredCabinets = filterDept ? cabinets.filter((c) => c.departmentName === filterDept) : cabinets;
  const totalLowStock = Object.values(warnings).reduce((s, arr) => s + arr.length, 0);
  const cabinetOpts = cabinets.map((c) => ({ value: c.id, label: c.warehouseName }));
  const deptOpts = depts.map((d) => ({ v: d, l: d }));
  const whStockOpts = whStock.map((s) => ({ value: s.id, label: `${s.itemCode} · ${s.itemName} (còn ${s.quantity} ${s.unit})` }));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tủ trực', val: cabinets.length, sub: 'kho cấp cứu', tone: 'info' },
        { lbl: 'Cảnh báo tồn', val: totalLowStock, sub: 'mặt hàng thấp', tone: totalLowStock > 0 ? 'crit' : 'ok' },
      ]} />

      <TopTabs
        tabs={[...TABS]}
        tab={tab}
        setTab={setTab}
      />

      {/* ── Tab: Danh sách tủ trực ──────────────────────────────────────────── */}
      {tab === 'cabinets' && (
        <div>
          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <Select
              allowClear placeholder="Lọc theo khoa" style={{ width: 220 }} size="small"
              value={filterDept || undefined}
              onChange={(v) => setFilterDept(v ?? '')}
              options={deptOpts.map((o) => ({ value: o.v, label: o.l }))}
            />
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={loadCabinets}>Làm mới</Btn>
          </div>

          {filteredCabinets.length === 0 && !cabLoading && (
            <div style={{ padding: 80, textAlign: 'center', color: 'var(--t-2)' }}>
              Chưa có tủ trực nào được cấu hình (WarehouseType=4)
            </div>
          )}

          <div style={{ padding: 'var(--space-16)' }}>
            {filteredCabinets.map((c) => {
              const warn = warnings[c.id] || [];
              const isExp = expanded === c.id;
              return (
                <div key={c.id} className="panel" style={{ padding: 0, marginBottom: 'var(--space-12)' }}>
                  <div className="panel-h" style={{ padding: '10px 14px', borderBottom: isExp ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                    <button className="ab-iconbtn" type="button" onClick={() => expandCabinet(c.id)}>
                      <Ico name={isExp ? 'chevron-down' : 'chevron-right'} size={14} />
                    </button>
                    <b style={{ flex: 1 }}>{c.warehouseName}</b>
                    {c.departmentName && <StatusBadge tone="info">{c.departmentName}</StatusBadge>}
                    {warn.length > 0 && (
                      <StatusBadge tone="crit">
                        <TermIcon name="alert-triangle" size={11} /> {warn.length} cảnh báo tồn
                      </StatusBadge>
                    )}
                    {c.managerName && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{c.managerName}</span>}
                    <Btn variant="ghost" icon="zap" onClick={() => { setIssueWh(c.id); setTab('issue'); }}>Xuất khẩn</Btn>
                  </div>

                  {isExp && (
                    <>
                      {warn.length > 0 && (
                        <div style={{ background: 'var(--s-crit-bg, color-mix(in srgb, var(--s-crit) 10%, transparent))', padding: '6px 14px', fontSize: 'var(--fs-xs)', color: 'var(--s-crit)' }}>
                          Cảnh báo tồn thấp: {warn.map((w) => `${w.itemName} (${w.quantity} ${w.unit})`).join(' · ')}
                        </div>
                      )}
                      <table className="ab-tbl">
                        <thead>
                          <tr><th>Mã</th><th>Tên hàng</th><th>SL tồn</th><th>ĐV</th><th>Lô</th><th>HSD</th></tr>
                        </thead>
                        <tbody>
                          {expandedStock.map((s) => (
                            <tr key={s.id} style={warn.some((w) => w.id === s.id) ? { background: 'var(--s-warn-bg)' } : undefined}>
                              <td className="mono">{s.itemCode}</td>
                              <td>{s.itemName}</td>
                              <td className="mono" style={{ fontWeight: 600 }}>{s.quantity}</td>
                              <td>{s.unit}</td>
                              <td className="mono">{s.batchNumber || '—'}</td>
                              <td className="mono">{s.expiryDate ? dayjs(s.expiryDate).format('DD/MM/YYYY') : '—'}</td>
                            </tr>
                          ))}
                          {expandedStock.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--t-2)', padding: 12 }}>Tủ trống</td></tr>
                          )}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab: Xuất khẩn ──────────────────────────────────────────────────── */}
      {tab === 'issue' && (
        <div style={{ padding: 'var(--space-16)', maxWidth: 760 }}>
          <div className="panel" style={{ padding: 'var(--space-16)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-12)', marginBottom: 'var(--space-14)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 260px' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>Tủ trực</div>
                <Select
                  options={cabinetOpts} value={issueWh || undefined}
                  onChange={(v) => { setIssueWh(v); setIssueLines([emptyLine()]); }}
                  placeholder="Chọn tủ trực…" style={{ width: '100%' }} size="small"
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>Ghi chú</div>
                <Input size="small" value={issueNote} onChange={(e) => setIssueNote(e.target.value)} placeholder="Ca trực / bệnh nhân / lý do xuất…" />
              </div>
            </div>

            {/* Line items */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-12)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 600, marginBottom: 8 }}>Danh sách hàng xuất</div>
              {issueLines.map((line, idx) => (
                <div key={line._key} style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', minWidth: 18, fontWeight: 600 }}>{idx + 1}.</span>
                  <Select
                    options={whStockOpts}
                    value={line.stockId || undefined}
                    onChange={(v) => {
                      const s = whStock.find((x) => x.id === v);
                      if (s) pickStock(line._key, s);
                    }}
                    placeholder={issueWh ? 'Chọn hàng trong tủ…' : 'Chọn tủ trực trước'}
                    style={{ flex: 1 }} size="small"
                    disabled={!issueWh}
                    showSearch
                    filterOption={(input, opt) =>
                      (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                  <input
                    type="number" min={1} max={line.available || 999}
                    value={line.quantity}
                    onChange={(e) => updateLine(line._key, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    style={{ width: 64, padding: '3px 6px', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', textAlign: 'center' }}
                  />
                  {line.unit && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', minWidth: 28 }}>{line.unit}</span>}
                  {line.available > 0 && (
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', whiteSpace: 'nowrap' }}>/ {line.available}</span>
                  )}
                  {issueLines.length > 1 && (
                    <button type="button" className="ab-iconbtn" style={{ color: 'var(--s-crit)' }}
                      onClick={() => setIssueLines((prev) => prev.filter((l) => l._key !== line._key))}>
                      <TermIcon name="x" size={11} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="ab-btn ghost sm" style={{ marginTop: 4 }}
                onClick={() => setIssueLines((prev) => [...prev, emptyLine()])}>
                <TermIcon name="plus" size={11} /> Thêm dòng
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-12)', marginTop: 'var(--space-12)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)' }}>
              <Btn variant="ghost" onClick={() => { setIssueLines([emptyLine()]); setIssueNote(''); setIssueWh(''); }}>Xóa</Btn>
              <Btn variant="primary" icon="zap" disabled={issueSubmitting || !issueWh} onClick={submitIssue}>
                {issueSubmitting ? 'Đang xuất…' : 'Xuất khẩn + In phiếu'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Lịch sử ────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <Select
              allowClear placeholder="Lọc theo tủ" size="small" style={{ width: 220 }}
              value={histWh || undefined}
              onChange={(v) => setHistWh(v ?? '')}
              options={cabinetOpts}
            />
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={loadHistory}>Làm mới</Btn>
          </div>
          <table className="ab-tbl" style={{ margin: 'var(--space-16)' }}>
            <thead>
              <tr>
                <th>Số phiếu</th><th>Ngày</th><th>Tủ trực</th><th>Ghi chú</th><th>SL dòng</th><th>Tổng tiền</th><th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{h.issueCode}</td>
                  <td className="mono">{dayjs(h.issueDate).format('DD/MM/YYYY HH:mm')}</td>
                  <td>{h.warehouseName}</td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{h.notes || '—'}</td>
                  <td className="mono">{(h.items || []).length}</td>
                  <td className="mono">{fmt(h.totalAmount || 0)}</td>
                  <td>
                    <button type="button" className="ab-iconbtn" title="In phiếu" onClick={() => printIssue(h)}>
                      <TermIcon name="printer" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && !histLoading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--t-2)' }}>Chưa có phiếu xuất tủ trực</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmergencyCabinetV2;
