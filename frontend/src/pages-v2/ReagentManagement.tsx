import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getReagents, createReagent, updateReagent, deleteReagent, getReagentAlerts, getReagentUsageHistory } from '../api/reagent';
import type { Reagent, ReagentAlert, ReagentUsage } from '../api/reagent';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, te, cf, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const REAGENT_FIELDS: CrudFieldCfg[] = [
  { key: 'code', label: 'Mã hoá chất', required: true, disabledOnEdit: true },
  { key: 'name', label: 'Tên hoá chất', required: true },
  { key: 'manufacturer', label: 'Nhà sản xuất' },
  { key: 'lotNumber', label: 'Số lô', required: true },
  { key: 'catalogNumber', label: 'Catalog' },
  { key: 'unit', label: 'Đơn vị' },
  { key: 'quantity', label: 'Số lượng', type: 'number', required: true },
  { key: 'minimumStock', label: 'Tồn tối thiểu', type: 'number' },
  { key: 'storageCondition', label: 'Điều kiện bảo quản' },
  { key: 'receivedDate', label: 'Ngày nhận', type: 'date' },
  { key: 'expiryDate', label: 'Hạn dùng', type: 'date', required: true },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Sẵn dùng' }, { value: 1, label: 'Đang dùng' }, { value: 2, label: 'Sắp hết' },
    { value: 3, label: 'Hết hạn' }, { value: 4, label: 'Đã huỷ' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const STATUS_LABEL: Record<number, string> = {
  0: 'Sẵn dùng', 1: 'Đang dùng', 2: 'Sắp hết', 3: 'Hết hạn', 4: 'Đã hủy',
};

type SKey = 'available' | 'inuse' | 'lowstock' | 'expired';
const STATUS_TABS = [
  { v: 'available' as SKey, l: 'Sẵn dùng',  tone: 'ok' as const },
  { v: 'inuse' as SKey,     l: 'Đang dùng', tone: 'info' as const },
  { v: 'lowstock' as SKey,  l: 'Sắp hết',   tone: 'warn' as const },
  { v: 'expired' as SKey,   l: 'Hết hạn',   tone: 'crit' as const },
];

const sKey = (r: Reagent): SKey => {
  if (r.isExpired || r.status === 3) return 'expired';
  if (r.isLowStock || r.status === 2) return 'lowstock';
  if (r.status === 1) return 'inuse';
  return 'available';
};

const PER = 18;

const ReagentManagementV2: React.FC = () => {
  const [items, setItems] = useState<Reagent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fAna, setFAna] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Reagent | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ReagentAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyReagent, setHistoryReagent] = useState<Reagent | null>(null);
  const [usageHistory, setUsageHistory] = useState<ReagentUsage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getReagents({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as Reagent[];
      setItems(list);
    } catch { setItems([]); ti('Không tải được danh sách hóa chất'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const analyzers = useMemo(() => {
    const set = new Set(items.map((r) => r.analyzerName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r) !== stab) return false;
      if (fAna && r.analyzerName !== fAna) return false;
      if (!k) return true;
      return [r.code, r.name, r.lotNumber, r.manufacturer]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fAna]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<Reagent>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.code },
    { key: 'name', label: 'Tên hóa chất', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.name}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.manufacturer}</div>
      </div>
    ) },
    { key: 'lot', label: 'Lô', code: true, render: (r) => r.lotNumber },
    { key: 'ana', label: 'Máy XN', render: (r) => r.analyzerName || '—' },
    { key: 'qty', label: 'Tồn', mono: true, render: (r) => {
      const ratio = r.quantity ? r.remainingQuantity / r.quantity : 0;
      const tone = r.isLowStock ? 'var(--a-or-text)' : ratio > 0.5 ? 'var(--a-em-text)' : 'var(--t-0)';
      return (
        <div>
          <div style={{ color: tone, fontWeight: 600 }}>{r.remainingQuantity}/{r.quantity}</div>
          <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{r.unit}</div>
        </div>
      );
    } },
    { key: 'min', label: 'Min', mono: true, render: (r) => `${r.minimumStock}` },
    { key: 'exp', label: 'HSD', mono: true, render: (r) => {
      const d = dayjs(r.expiryDate);
      const expired = r.isExpired || d.isBefore(dayjs());
      const soon = !expired && d.diff(dayjs(), 'day') < 30;
      return <span style={{ color: expired ? 'var(--a-rd-text)' : soon ? 'var(--a-or-text)' : undefined }}>
        {d.format('DD/MM/YYYY')}
      </span>;
    } },
    { key: 'st', label: 'TT', render: (r) => {
      const k = sKey(r);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const openAlerts = async () => {
    setAlertsOpen(true);
    setAlertsLoading(true);
    try {
      const data = await getReagentAlerts();
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setAlerts(list as ReagentAlert[]);
    } catch { te('Không tải được cảnh báo'); setAlerts([]); }
    finally { setAlertsLoading(false); }
  };

  const openHistory = async (r: Reagent) => {
    setHistoryReagent(r);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await getReagentUsageHistory({ reagentId: r.id });
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setUsageHistory(list as ReagentUsage[]);
    } catch { te('Không tải được lịch sử'); setUsageHistory([]); }
    finally { setHistoryLoading(false); }
  };

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ status: 0, quantity: 0, minimumStock: 0, unit: 'test' }); setCrudOpen(true); };
  const openEdit = (r: Reagent) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const del = (r: Reagent) => cf(`Xoá hoá chất "${r.name}"?`, async () => {
    try { await deleteReagent(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const actions = (r: Reagent) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Cập nhật" onClick={() => openEdit(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng SKU', val: items.length, sub: 'tất cả' },
        { lbl: 'Sẵn dùng', val: counts.available || 0, sub: 'kho lab', tone: 'ok' },
        { lbl: 'Sắp hết', val: counts.lowstock || 0, sub: 'cần đặt', tone: 'warn' },
        { lbl: 'Hết hạn', val: counts.expired || 0, sub: 'cần hủy', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm mã / tên / lô…" />
        <Filter value={fAna} onChange={setFAna} options={analyzers} placeholder="▾ Máy XN" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFAna(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={openAlerts}>
          <Ico name="alert" size={12} /> Cảnh báo
        </Btn>
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Nhập kho
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Reagent>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hóa chất'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.name : ''}
        sub={sel ? `${sel.code} · Lô ${sel.lotNumber}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { if (sel) { openHistory(sel); setSel(null); } }}>
            <Ico name="activity" size={12} /> Lịch sử
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Cập nhật
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.code}</span></DrField>
            <DrField lbl="Tên hóa chất">{sel.name}</DrField>
            <DrField lbl="Hãng">{sel.manufacturer}</DrField>
            <DrField lbl="Số lô"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.lotNumber}</span></DrField>
            {sel.catalogNumber && <DrField lbl="Catalog">{sel.catalogNumber}</DrField>}
            <DrField lbl="Máy XN">{sel.analyzerName || '—'}</DrField>
            <DrField lbl="XN dùng">{sel.testNames?.join(', ') || '—'}</DrField>
          </DrSec>
          <DrSec title="Kho">
            <div style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--t-2)' }}>Còn lại</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: sel.isLowStock ? 'var(--a-or-text)' : 'var(--a-em-text)' }}>
                  {sel.remainingQuantity} / {sel.quantity} {sel.unit}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--t-2)' }}>Đã dùng</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{sel.usedQuantity} {sel.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--t-2)' }}>Min stock</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{sel.minimumStock} {sel.unit}</span>
              </div>
            </div>
            <DrField lbl="HSD">
              <span style={{ color: sel.isExpired ? 'var(--a-rd-text)' : undefined, fontFamily: 'var(--font-mono)' }}>
                {dayjs(sel.expiryDate).format('DD/MM/YYYY')}
              </span>
            </DrField>
            <DrField lbl="Bảo quản">{sel.storageCondition}</DrField>
            <DrField lbl="Nhận">{dayjs(sel.receivedDate).format('DD/MM/YYYY')}</DrField>
            {sel.openedDate && <DrField lbl="Mở">{dayjs(sel.openedDate).format('DD/MM/YYYY')}</DrField>}
            {sel.stabilityDays && <DrField lbl="Ổn định">{sel.stabilityDays} ngày sau mở</DrField>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>

      {/* Drawer Cảnh báo */}
      <DrawerShell
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        size="lg"
        title="Cảnh báo hoá chất"
        sub="Hết hạn · Sắp hết · Tồn thấp"
        footer={<Btn variant="ghost" onClick={() => setAlertsOpen(false)}>Đóng</Btn>}
      >
        {alertsLoading
          ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-2)' }}>Đang tải…</div>
          : alerts.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-2)' }}>Không có cảnh báo</div>
            : alerts.map((a) => (
              <div key={a.id} style={{
                display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start',
              }}>
                <StatusBadge tone={a.severity === 'critical' ? 'crit' : 'warn'}>
                  {a.type === 'expired' ? 'Hết hạn' : a.type === 'expiringSoon' ? 'Sắp hết hạn' : 'Tồn thấp'}
                </StatusBadge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t-0)' }}>{a.reagentName}</div>
                  <div style={{ fontSize: 12, color: 'var(--t-1)', marginTop: 2 }}>{a.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>Lô: {a.lotNumber}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {dayjs(a.createdAt).format('DD/MM HH:mm')}
                </div>
              </div>
            ))
        }
      </DrawerShell>

      {/* Drawer Lịch sử dùng */}
      <DrawerShell
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); setHistoryReagent(null); setUsageHistory([]); }}
        size="lg"
        title={historyReagent ? `Lịch sử dùng · ${historyReagent.name}` : 'Lịch sử dùng'}
        sub={historyReagent ? `Lô ${historyReagent.lotNumber}` : ''}
        footer={<Btn variant="ghost" onClick={() => { setHistoryOpen(false); setHistoryReagent(null); setUsageHistory([]); }}>Đóng</Btn>}
      >
        {historyLoading
          ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-2)' }}>Đang tải…</div>
          : usageHistory.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-2)' }}>Chưa có lịch sử dùng</div>
            : usageHistory.map((u) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t-0)' }}>{u.testName}</div>
                  <div style={{ fontSize: 12, color: 'var(--t-2)' }}>{u.analyzerName} · {u.operatorName}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{u.testCode}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>−{u.quantityUsed}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
                    {dayjs(u.usageDate).format('DD/MM/YYYY HH:mm')}
                  </div>
                </div>
              </div>
            ))
        }
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật hoá chất' : 'Nhập kho hoá chất'}
        fields={REAGENT_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateReagent(String(crudInit.id), v);
          else await createReagent(v);
          tk(editing ? 'Đã cập nhật hoá chất' : 'Đã nhập kho');
          load();
        }}
      />
    </div>
  );
};

export default ReagentManagementV2;
