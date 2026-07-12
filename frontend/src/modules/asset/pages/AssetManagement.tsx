import React, { useEffect, useMemo, useState } from 'react';
import { fmtNum as fmt } from '../../../utils/format';
import dayjs from 'dayjs';
import { Form, Input, DatePicker, Tabs, Select, Checkbox } from 'antd';
import { getAssets, getAssetDashboard, saveAsset, getAssetQrCode, getStocktakes, createStocktake, completeStocktake, approveStocktake, updateStocktakeItem, printStocktake, getDepreciationReport } from '../api/assetManagement';
import type { FixedAssetDto, AssetDashboardDto, AssetQrCodeDto, AssetStocktakeDto, AssetStocktakeItemDto, DepreciationReportDto } from '../api/assetManagement';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal, ModalShell,
  DrawerShell, DrSec, DrField, useTabCounts, tk, ti, te,
  type ColumnDef, type CrudFieldCfg,
} from '../../../pages-v2/_v2kit';

const ASSET_FIELDS: CrudFieldCfg[] = [
  { key: 'assetCode', label: 'Mã tài sản', required: true, disabledOnEdit: true, placeholder: 'VD: TS-...' },
  { key: 'assetName', label: 'Tên tài sản', required: true },
  { key: 'serialNumber', label: 'Số serial' },
  { key: 'purchaseDate', label: 'Ngày mua', type: 'date', required: true },
  { key: 'originalValue', label: 'Nguyên giá (đ)', type: 'number', required: true },
  { key: 'currentValue', label: 'Giá trị còn lại (đ)', type: 'number', placeholder: 'Bỏ trống = bằng nguyên giá' },
  { key: 'usefulLifeMonths', label: 'Thời gian khấu hao (tháng)', type: 'number' },
  { key: 'depreciationMethod', label: 'Phương pháp khấu hao', type: 'select', options: [
    { value: 1, label: 'Đường thẳng' }, { value: 2, label: 'Số dư giảm dần' }] },
  { key: 'locationDescription', label: 'Vị trí' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Đang dùng' }, { value: 1, label: 'Hỏng' }, { value: 2, label: 'Sửa chữa' },
    { value: 3, label: 'Chờ thanh lý' }, { value: 4, label: 'Đã thanh lý' }, { value: 5, label: 'Đã chuyển' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const STATUS_LABEL: Record<number, string> = {
  0: 'Đang dùng', 1: 'Hỏng', 2: 'Sửa chữa', 3: 'Chờ thanh lý', 4: 'Đã thanh lý', 5: 'Đã chuyển',
};

type SKey = 'inuse' | 'broken' | 'repair' | 'pending' | 'disposed';
const STATUS_TABS = [
  { v: 'inuse' as SKey,    l: 'Đang dùng',     tone: 'ok' as const },
  { v: 'broken' as SKey,   l: 'Hỏng',          tone: 'crit' as const },
  { v: 'repair' as SKey,   l: 'Sửa chữa',      tone: 'warn' as const },
  { v: 'pending' as SKey,  l: 'Chờ thanh lý',  tone: 'warn' as const },
  { v: 'disposed' as SKey, l: 'Đã thanh lý',   tone: 'info' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'inuse' : n === 1 ? 'broken' : n === 2 ? 'repair' : n === 3 ? 'pending' : 'disposed';

const PER = 18;

const STOCKTAKE_STATUS: Record<number, string> = { 1: 'Nháp', 2: 'Đang kiểm', 3: 'Đã kiểm', 4: 'Đã duyệt' };

const AssetManagementV2: React.FC = () => {
  const [moduleTab, setModuleTab] = useState<'assets' | 'stocktake'>('assets');
  const [items, setItems] = useState<FixedAssetDto[]>([]);
  const [dash, setDash] = useState<AssetDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<FixedAssetDto | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [qrData, setQrData] = useState<AssetQrCodeDto | null>(null);
  // Stocktake state
  const [stocktakes, setStocktakes] = useState<AssetStocktakeDto[]>([]);
  const [stocktakeDetail, setStocktakeDetail] = useState<AssetStocktakeDto | null>(null);
  const [newStocktakeOpen, setNewStocktakeOpen] = useState(false);
  const [stocktakeForm] = Form.useForm();
  // Stocktake item inline edit
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm] = Form.useForm();
  const [itemSaving, setItemSaving] = useState(false);
  // Depreciation report drawer
  const [deprOpen, setDeprOpen] = useState(false);
  const [deprLoading, setDeprLoading] = useState(false);
  const [deprItems, setDeprItems] = useState<DepreciationReportDto[]>([]);

  const openCreate = () => { setCrudInit({ status: 0, depreciationMethod: 1, originalValue: 0, currentValue: 0, usefulLifeMonths: 60 }); setCrudOpen(true); };
  const openEdit = (r: FixedAssetDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const showQr = async (r: FixedAssetDto) => {
    try { const d = await getAssetQrCode(r.id); if (d) setQrData(d); else te('Không lấy được mã QR'); }
    catch { te('Không lấy được mã QR'); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [r, d, sk] = await Promise.all([
        getAssets({ keyword: search, pageSize: 200 }),
        getAssetDashboard(),
        getStocktakes(),
      ]);
      setItems(r.items || []);
      setDash(d);
      setStocktakes(sk);
    } catch { ti('Không tải được tài sản'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fDept && r.departmentName !== fDept) return false;
      if (!k) return true;
      return [r.assetCode, r.assetName, r.serialNumber, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<FixedAssetDto>[] = [
    { key: 'code', label: 'Mã TS', code: true, render: (r) => r.assetCode },
    { key: 'name', label: 'Tên tài sản', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.assetName}</div>
        {r.serialNumber && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>SN: {r.serialNumber}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'orig', label: 'Nguyên giá', mono: true, render: (r) => fmt(r.originalValue) },
    { key: 'cur', label: 'Còn lại', mono: true, render: (r) => {
      const ratio = r.originalValue ? r.currentValue / r.originalValue : 0;
      const tone = ratio < 0.2 ? 'var(--a-rd-text)' : ratio < 0.5 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{fmt(r.currentValue)}</span>;
    } },
    { key: 'date', label: 'Mua', mono: true, render: (r) => dayjs(r.purchaseDate).format('DD/MM/YYYY') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: FixedAssetDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="qr" title="QR/Barcode" onClick={() => showQr(r)} />
    </div>
  );

  const totalValue = items.reduce((s, r) => s + (r.currentValue || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng TS', val: dash?.totalAssets ?? items.length, sub: 'tất cả' },
        { lbl: 'Đang dùng', val: dash?.inUseCount ?? counts.inuse, sub: `${Math.round(((counts.inuse || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Hỏng / Sửa', val: (dash?.brokenCount ?? counts.broken) + (counts.repair || 0), sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Tổng giá trị còn', val: Math.round(totalValue / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Tabs
          activeKey={moduleTab}
          onChange={(k) => setModuleTab(k as 'assets' | 'stocktake')}
          size="small"
          style={{ marginBottom: 0 }}
          items={[
            { key: 'assets', label: 'Danh sách tài sản' },
            { key: 'stocktake', label: `Kiểm kê (${stocktakes.length})` },
          ]}
        />
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        {moduleTab === 'assets' && <>
          <Btn variant="ghost" icon="activity" onClick={async () => {
            setDeprOpen(true);
            setDeprLoading(true);
            setDeprItems([]);
            try {
              const now = new Date();
              const result = await getDepreciationReport({ month: now.getMonth() + 1, year: now.getFullYear(), pageSize: 100 });
              setDeprItems(result.items || []);
            } catch {
              te('Không tải được báo cáo khấu hao');
              setDeprOpen(false);
            } finally {
              setDeprLoading(false);
            }
          }}>Khấu hao</Btn>
          <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm TS</Btn>
        </>}
        {moduleTab === 'stocktake' && (
          <Btn variant="primary" icon="plus" onClick={() => setNewStocktakeOpen(true)}>Tạo phiếu kiểm kê</Btn>
        )}
      </div>

      {moduleTab === 'assets' && <>
        <div style={{ display: 'flex', gap: 'var(--space-8)', padding: '8px 16px', borderBottom: '1px solid var(--line)' }}>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm mã TS / tên / serial…" />
          <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
          <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>Bỏ lọc</Btn>
        </div>
        <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />
        <DataTable<FixedAssetDto>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={actions}
          empty={loading ? 'Đang tải…' : 'Chưa có tài sản'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {moduleTab === 'stocktake' && (
        <DataTable<AssetStocktakeDto>
          columns={[
            { key: 'code', label: 'Mã phiếu', code: true, render: (r) => r.stocktakeCode },
            { key: 'title', label: 'Tiêu đề', render: (r) => r.title },
            { key: 'date', label: 'Ngày KK', mono: true, render: (r) => dayjs(r.stocktakeDate).format('DD/MM/YYYY') },
            { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || 'Toàn viện' },
            { key: 'items', label: 'Số TS', mono: true, render: (r) => r.totalItems },
            { key: 'found', label: 'Có mặt', mono: true, render: (r) => <span style={{ color: 'var(--s-ok)' }}>{r.foundCount}</span> },
            { key: 'miss', label: 'Thiếu', mono: true, render: (r) => r.missingCount > 0 ? <span style={{ color: 'var(--s-crit)' }}>{r.missingCount}</span> : '—' },
            { key: 'st', label: 'Trạng thái', render: (r) => {
              const tone = r.status === 4 ? 'ok' : r.status === 3 ? 'info' : r.status === 2 ? 'warn' : undefined;
              return <StatusBadge tone={tone} dot>{STOCKTAKE_STATUS[r.status] || '—'}</StatusBadge>;
            } },
          ] as ColumnDef<AssetStocktakeDto>[]}
          data={stocktakes}
          rowKey={(r) => r.id}
          onRowClick={setStocktakeDetail}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setStocktakeDetail(r)} />
              {r.status === 1 && (
                <ActBtn ic="check" title="Hoàn thành kiểm kê" onClick={async () => {
                  try { const u = await completeStocktake(r.id); setStocktakes((p) => p.map((x) => x.id === r.id ? u : x)); tk('Đã hoàn thành kiểm kê'); }
                  catch { te('Lỗi khi hoàn thành kiểm kê'); }
                }} />
              )}
              {r.status === 3 && (
                <ActBtn ic="check" title="Duyệt phiếu" onClick={async () => {
                  try { const u = await approveStocktake(r.id); setStocktakes((p) => p.map((x) => x.id === r.id ? u : x)); tk('Đã duyệt phiếu kiểm kê'); }
                  catch { te('Lỗi khi duyệt phiếu'); }
                }} />
              )}
            </div>
          )}
          empty={loading ? 'Đang tải…' : 'Chưa có phiếu kiểm kê'}
        />
      )}

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.assetName : ''}
        sub={sel ? `${sel.assetCode}${sel.serialNumber ? ` · SN ${sel.serialNumber}` : ''}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="qr" onClick={() => { if (sel) showQr(sel); }}>Mã QR</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Chỉnh sửa</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Mã TS"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.assetCode}</span></DrField>
            <DrField lbl="Tên">{sel.assetName}</DrField>
            {sel.serialNumber && <DrField lbl="Serial"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.serialNumber}</span></DrField>}
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Vị trí">{sel.locationDescription || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Tài chính">
            <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
              <Line label="Nguyên giá" value={`${fmt(sel.originalValue)} đ`} bold />
              <Line label="Hao mòn lũy kế" value={`−${fmt(sel.accumulatedDepreciation)} đ`} tone="warn" />
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
              <Line label="Giá trị còn lại" value={`${fmt(sel.currentValue)} đ`} bold tone="ok" />
              <Line label="Hao mòn / tháng" value={`${fmt(sel.monthlyDepreciation)} đ`} />
            </div>
          </DrSec>
          <DrSec title="Khấu hao">
            <DrField lbl="Mua">{dayjs(sel.purchaseDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Thời gian KH"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.usefulLifeMonths} tháng</span></DrField>
            <DrField lbl="Phương pháp">{sel.depreciationMethod === 1 ? 'Đường thẳng' : 'Số dư giảm dần'}</DrField>
            {sel.tenderName && <DrField lbl="Gói thầu">{sel.tenderName}</DrField>}
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật tài sản' : 'Thêm tài sản cố định'}
        fields={ASSET_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          await saveAsset(v as Partial<FixedAssetDto>);
          tk(editing ? 'Đã cập nhật tài sản' : 'Đã thêm tài sản');
          load();
        }}
      />

      {/* Stocktake detail drawer */}
      <DrawerShell
        open={!!stocktakeDetail}
        onClose={() => { setStocktakeDetail(null); setEditingItemId(null); }}
        size="lg"
        title={stocktakeDetail ? `Phiếu ${stocktakeDetail.stocktakeCode}` : ''}
        sub={stocktakeDetail ? `${stocktakeDetail.title} · ${stocktakeDetail.departmentName || 'Toàn viện'}` : ''}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setStocktakeDetail(null); setEditingItemId(null); }}>Đóng</Btn>
            {stocktakeDetail && (
              <Btn icon="printer" onClick={async () => {
                try { await printStocktake(stocktakeDetail.id); }
                catch { te('Không thể in phiếu kiểm kê'); }
              }}>In phiếu</Btn>
            )}
          </div>
        }
      >
        {stocktakeDetail && <>
          <DrSec title="Thông tin phiếu">
            <DrField lbl="Mã phiếu"><span style={{ fontFamily: 'var(--font-mono)' }}>{stocktakeDetail.stocktakeCode}</span></DrField>
            <DrField lbl="Tiêu đề">{stocktakeDetail.title}</DrField>
            <DrField lbl="Ngày kiểm kê">{dayjs(stocktakeDetail.stocktakeDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Khoa">{stocktakeDetail.departmentName || 'Toàn viện'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={stocktakeDetail.status === 4 ? 'ok' : stocktakeDetail.status === 3 ? 'info' : 'warn'} dot>
                {STOCKTAKE_STATUS[stocktakeDetail.status]}
              </StatusBadge>
            </DrField>
            <DrField lbl="Tổng TS"><span style={{ fontFamily: 'var(--font-mono)' }}>{stocktakeDetail.totalItems}</span></DrField>
            <DrField lbl="Có mặt"><span style={{ color: 'var(--s-ok)', fontFamily: 'var(--font-mono)' }}>{stocktakeDetail.foundCount}</span></DrField>
            {stocktakeDetail.missingCount > 0 && (
              <DrField lbl="Thiếu"><span style={{ color: 'var(--s-crit)', fontFamily: 'var(--font-mono)' }}>{stocktakeDetail.missingCount}</span></DrField>
            )}
            {stocktakeDetail.notes && <DrField lbl="Ghi chú">{stocktakeDetail.notes}</DrField>}
          </DrSec>
          <DrSec title={`Danh sách tài sản (${stocktakeDetail.items.length})${stocktakeDetail.status < 4 ? ' — click dòng để chỉnh sửa' : ''}`}>
            <table className="ab-tbl">
              <thead>
                <tr>
                  <th>Mã TS</th><th>Tên</th><th>Serial</th><th>Vị trí</th>
                  <th>Có mặt</th><th>Tình trạng</th><th>Ghi chú</th>
                  {stocktakeDetail.status < 4 && <th style={{ width: 60 }}></th>}
                </tr>
              </thead>
              <tbody>
                {stocktakeDetail.items.map((it) => {
                  const isEditing = editingItemId === it.id;
                  if (isEditing) {
                    return (
                      <tr key={it.id} style={{ background: 'var(--d-2)' }}>
                        <td className="mono">{it.assetCode}</td>
                        <td>{it.assetName}</td>
                        <td className="mono">{it.serialNumber || '—'}</td>
                        <td>{it.locationDescription || '—'}</td>
                        <td className="center">
                          <Checkbox
                            defaultChecked={it.isFound}
                            onChange={(e) => editItemForm.setFieldValue('isFound', e.target.checked)}
                          />
                        </td>
                        <td>
                          <Select
                            defaultValue={it.conditionStatus}
                            size="small"
                            style={{ width: 100 }}
                            onChange={(v) => editItemForm.setFieldValue('conditionStatus', v)}
                            options={[
                              { value: 1, label: 'Tốt' },
                              { value: 2, label: 'Xuống cấp' },
                              { value: 3, label: 'Hỏng' },
                            ]}
                          />
                        </td>
                        <td>
                          <Input
                            size="small"
                            defaultValue={it.remark || ''}
                            onChange={(e) => editItemForm.setFieldValue('remark', e.target.value)}
                            placeholder="Ghi chú…"
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                            <Btn
                              variant="primary"
                              style={{ padding: '2px 8px', fontSize: 'var(--fs-sm)' }}
                              disabled={itemSaving}
                              onClick={async () => {
                                setItemSaving(true);
                                try {
                                  const vals = editItemForm.getFieldsValue() as { isFound?: boolean; conditionStatus?: number; remark?: string };
                                  const updated: AssetStocktakeItemDto = await updateStocktakeItem(
                                    stocktakeDetail.id, it.id,
                                    {
                                      isFound: vals.isFound ?? it.isFound,
                                      conditionStatus: vals.conditionStatus ?? it.conditionStatus,
                                      remark: vals.remark ?? it.remark,
                                    },
                                  );
                                  // Update local state
                                  setStocktakeDetail((prev) => prev ? {
                                    ...prev,
                                    items: prev.items.map((x) => x.id === it.id ? { ...x, ...updated } : x),
                                    foundCount: prev.items.map((x) => x.id === it.id ? { ...x, ...updated } : x).filter((x) => x.isFound).length,
                                    missingCount: prev.items.map((x) => x.id === it.id ? { ...x, ...updated } : x).filter((x) => !x.isFound).length,
                                  } : prev);
                                  setEditingItemId(null);
                                  tk('Đã cập nhật');
                                } catch { te('Cập nhật thất bại'); }
                                finally { setItemSaving(false); }
                              }}
                            >Lưu</Btn>
                            <Btn variant="ghost" style={{ padding: '2px 8px', fontSize: 'var(--fs-sm)' }} onClick={() => setEditingItemId(null)}>Hủy</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={it.id}
                      style={{ cursor: stocktakeDetail.status < 4 ? 'pointer' : undefined }}
                      onClick={() => {
                        if (stocktakeDetail.status < 4) {
                          editItemForm.setFieldsValue({ isFound: it.isFound, conditionStatus: it.conditionStatus, remark: it.remark });
                          setEditingItemId(it.id);
                        }
                      }}
                    >
                      <td className="mono">{it.assetCode}</td>
                      <td>{it.assetName}</td>
                      <td className="mono">{it.serialNumber || '—'}</td>
                      <td>{it.locationDescription || '—'}</td>
                      <td>{it.isFound ? <span style={{ color: 'var(--s-ok)' }}>Có</span> : <span style={{ color: 'var(--s-crit)' }}>Thiếu</span>}</td>
                      <td>{it.conditionStatus === 1 ? 'Tốt' : it.conditionStatus === 2 ? 'Xuống cấp' : 'Hỏng'}</td>
                      <td>{it.remark || '—'}</td>
                      {stocktakeDetail.status < 4 && <td style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Sửa</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Hidden form used only for holding field values during inline edit */}
            <Form form={editItemForm} style={{ display: 'none' }}>
              <Form.Item name="isFound" />
              <Form.Item name="conditionStatus" />
              <Form.Item name="remark" />
            </Form>
          </DrSec>
        </>}
      </DrawerShell>

      {/* Tạo phiếu kiểm kê */}
      <ModalShell
        open={newStocktakeOpen}
        onClose={() => setNewStocktakeOpen(false)}
        title="Tạo phiếu kiểm kê tài sản"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setNewStocktakeOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={async () => {
            try {
              const v = await stocktakeForm.validateFields();
              const dto = {
                title: v.title as string,
                stocktakeDate: v.stocktakeDate ? dayjs(v.stocktakeDate as Parameters<typeof dayjs>[0]).format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10),
                notes: v.notes as string | undefined,
                items: [],
              };
              const result = await createStocktake(dto);
              setStocktakes((p) => [result, ...p]);
              tk(`Đã tạo phiếu ${result.stocktakeCode} — ${result.totalItems} tài sản được tự động nạp`);
              setNewStocktakeOpen(false);
              stocktakeForm.resetFields();
            } catch { te('Tạo phiếu kiểm kê thất bại'); }
          }}>Tạo phiếu</Btn>
        </>}
      >
        <Form form={stocktakeForm} layout="vertical">
          <Form.Item name="title" label="Tiêu đề phiếu" rules={[{ required: true }]}>
            <Input placeholder="VD: Kiểm kê quý 2/2026 — Khoa Nội" />
          </Form.Item>
          <Form.Item name="stocktakeDate" label="Ngày kiểm kê" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Hệ thống sẽ tự động nạp toàn bộ tài sản cố định hiện có vào phiếu kiểm kê. Sau khi tạo, bạn có thể cập nhật trạng thái từng tài sản.
          </p>
        </Form>
      </ModalShell>

      {/* Báo cáo khấu hao */}
      <DrawerShell
        open={deprOpen}
        onClose={() => setDeprOpen(false)}
        size="lg"
        title={`Báo cáo khấu hao tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
        sub={deprLoading ? 'Đang tải…' : `${deprItems.length} tài sản`}
        footer={<Btn variant="ghost" onClick={() => setDeprOpen(false)}>Đóng</Btn>}
      >
        {deprLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải báo cáo khấu hao…</div>}
        {!deprLoading && deprItems.length === 0 && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Không có dữ liệu khấu hao tháng này</div>
        )}
        {!deprLoading && deprItems.length > 0 && (
          <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr>
                <th>Mã TS</th><th>Tên tài sản</th><th>Khoa</th>
                <th>Đầu kỳ (đ)</th><th>Khấu hao (đ)</th><th>Cuối kỳ (đ)</th>
              </tr>
            </thead>
            <tbody>
              {deprItems.map((d) => (
                <tr key={d.fixedAssetId}>
                  <td className="mono">{d.assetCode}</td>
                  <td>{d.assetName}</td>
                  <td>{d.departmentName || '—'}</td>
                  <td className="mono">{fmt(d.openingValue)}</td>
                  <td className="mono" style={{ color: 'var(--a-or-text)' }}>−{fmt(d.depreciationAmount)}</td>
                  <td className="mono" style={{ color: d.closingValue < d.openingValue * 0.2 ? 'var(--a-rd-text)' : undefined }}>
                    {fmt(d.closingValue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={3}>Tổng cộng</td>
                <td className="mono">{fmt(deprItems.reduce((s, d) => s + d.openingValue, 0))}</td>
                <td className="mono" style={{ color: 'var(--a-or-text)' }}>
                  −{fmt(deprItems.reduce((s, d) => s + d.depreciationAmount, 0))}
                </td>
                <td className="mono">{fmt(deprItems.reduce((s, d) => s + d.closingValue, 0))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </DrawerShell>

      <ModalShell
        open={!!qrData}
        onClose={() => setQrData(null)}
        title="Mã QR tài sản"
        sub={qrData ? `${qrData.assetCode} · ${qrData.assetName}` : ''}
        size="sm"
        footer={<Btn variant="ghost" onClick={() => setQrData(null)}>Đóng</Btn>}
      >
        {qrData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <DrField lbl="Mã TS"><span style={{ fontFamily: 'var(--font-mono)' }}>{qrData.assetCode}</span></DrField>
            <DrField lbl="Tên">{qrData.assetName}</DrField>
            {qrData.departmentName && <DrField lbl="Khoa">{qrData.departmentName}</DrField>}
            {qrData.serialNumber && <DrField lbl="Serial"><span style={{ fontFamily: 'var(--font-mono)' }}>{qrData.serialNumber}</span></DrField>}
            <DrField lbl="Nội dung QR">
              <code style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 'var(--fs-sm)',
                padding: 'var(--space-10)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
                {qrData.qrContent}
              </code>
            </DrField>
          </div>
        )}
      </ModalShell>
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode; tone?: 'ok' | 'crit' | 'info' | 'warn'; bold?: boolean }> = ({ label, value, tone, bold }) => {
  const color = tone === 'ok' ? 'var(--a-em-text)'
    : tone === 'crit' ? 'var(--a-rd-text)'
    : tone === 'info' ? 'var(--a-cy-text)'
    : tone === 'warn' ? 'var(--a-or-text)'
    : 'var(--t-0)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400, color }}>
      <span>{label}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
};

export default AssetManagementV2;
