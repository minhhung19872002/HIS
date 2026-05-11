// =====================================================================
// HIS Terminal · DANH MỤC TÀI CHÍNH (Finance Catalogs) — v2
// 4 tabs: Phụ thu · Thu khác · Vận chuyển BN · Giá xăng dầu
// Bound to /api/master-catalog/{additional-charges,other-incomes,
// transport-services,gasoline-prices}
// =====================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Input, InputNumber, Select, DatePicker, Switch } from 'antd';
import dayjs from 'dayjs';
import * as api from '../api/masterCatalog';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, fmtVNDg, tk, te, cf, Ico,
  type ColumnDef,
} from './_v2kit';

type TabKey = 'surcharge' | 'other' | 'transport' | 'fuel';

type AnyRow =
  | (api.AdditionalChargeDto & { _kind: 'surcharge' })
  | (api.OtherIncomeDto & { _kind: 'other' })
  | (api.TransportServiceDto & { _kind: 'transport' })
  | (api.GasolinePriceDto & { _kind: 'fuel' });

const PER = 15;

const FUEL_TYPES = [
  'RON 95-III', 'RON 95-V', 'E5 RON 92-II', 'Diesel 0.05S-II', 'Diesel 0.001S-V', 'Dầu hỏa',
];
const CALC_TYPES = [
  { value: 1, label: 'Theo km' },
  { value: 2, label: 'Theo lượt' },
];

// ----- Save / edit form state (loosely typed; per-tab fields) -----
type EditState = Record<string, unknown> & { id?: string };

const FinanceCatalogsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('surcharge');
  const [surcharge, setSurcharge] = useState<api.AdditionalChargeDto[]>([]);
  const [other, setOther] = useState<api.OtherIncomeDto[]>([]);
  const [transport, setTransport] = useState<api.TransportServiceDto[]>([]);
  const [fuel, setFuel] = useState<api.GasolinePriceDto[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editIsNew, setEditIsNew] = useState(false);

  useEffect(() => { setSearch(''); setPage(0); }, [tab]);

  const reload = async (which?: TabKey) => {
    try {
      if (!which || which === 'surcharge') setSurcharge(await api.getAdditionalCharges());
      if (!which || which === 'other')     setOther(await api.getOtherIncomes());
      if (!which || which === 'transport') setTransport(await api.getTransportServices());
      if (!which || which === 'fuel')      setFuel(await api.getGasolinePrices());
    } catch { te('Không tải được danh mục'); }
  };
  useEffect(() => { reload(); }, []);

  // ----- Derived rows for current tab -----
  const rows = useMemo<AnyRow[]>(() => {
    switch (tab) {
      case 'surcharge': return surcharge.map((r) => ({ ...r, _kind: 'surcharge' as const }));
      case 'other':     return other.map((r) => ({ ...r, _kind: 'other' as const }));
      case 'transport': return transport.map((r) => ({ ...r, _kind: 'transport' as const }));
      case 'fuel':      return fuel.map((r) => ({ ...r, _kind: 'fuel' as const }));
    }
  }, [tab, surcharge, other, transport, fuel]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) => {
      const blob = `${(r as { code?: string }).code || ''} ${(r as { name?: string }).name || ''} ${(r as { fuelType?: string }).fuelType || ''} ${(r as { note?: string }).note || ''}`;
      return blob.toLowerCase().includes(k);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageData = filtered.slice(page * PER, (page + 1) * PER);

  // ----- KPIs per tab -----
  const kpis = useMemo(() => {
    if (tab === 'surcharge') {
      const active = surcharge.filter((r) => r.isActive).length;
      const inactive = surcharge.length - active;
      const avgPrice = surcharge.length
        ? Math.round(surcharge.reduce((s, r) => s + (r.price || 0), 0) / surcharge.length)
        : 0;
      return [
        { lbl: 'Tổng mục phụ thu', val: surcharge.length, sub: 'trong danh mục' },
        { lbl: 'Đang áp dụng',     val: active,            sub: 'hoạt động',   tone: 'ok' as const },
        { lbl: 'Tạm dừng',         val: inactive,          sub: 'không thu',   tone: 'warn' as const },
        { lbl: 'Giá TB',           val: fmtVNDg(avgPrice), sub: '/mục',        tone: 'info' as const },
      ];
    }
    if (tab === 'other') {
      const active = other.filter((r) => r.isActive).length;
      const totalRev = other.reduce((s, r) => s + (r.price || 0), 0);
      return [
        { lbl: 'Tổng khoản',   val: other.length,       sub: 'thu khác' },
        { lbl: 'Đang áp dụng', val: active,             sub: 'hoạt động', tone: 'ok' as const },
        { lbl: 'Tạm dừng',     val: other.length - active, sub: 'không thu', tone: 'warn' as const },
        { lbl: 'Tổng giá NK',  val: fmtVNDg(totalRev),  sub: 'niêm yết',  tone: 'info' as const },
      ];
    }
    if (tab === 'transport') {
      const active = transport.filter((r) => r.isActive).length;
      const byKm = transport.filter((r) => r.calculationType === 1).length;
      const avgKm = transport.length
        ? Math.round(transport.reduce((s, r) => s + (r.unitPrice || 0), 0) / transport.length)
        : 0;
      return [
        { lbl: 'Tổng tuyến',     val: transport.length, sub: 'khung giá VC' },
        { lbl: 'Tính theo km',   val: byKm,             sub: 'cự ly',         tone: 'info' as const },
        { lbl: 'Đang áp dụng',   val: active,           sub: 'hoạt động',     tone: 'ok' as const },
        { lbl: 'Giá đơn vị TB',  val: fmtVNDg(avgKm),   sub: '/km hoặc lượt', tone: 'info' as const },
      ];
    }
    // fuel
    const types = new Set(fuel.map((r) => r.fuelType)).size;
    const latest = fuel
      .slice()
      .sort((a, b) => (b.effectiveFrom || '').localeCompare(a.effectiveFrom || ''))[0];
    const ron95 = fuel.find((r) => r.fuelType?.startsWith('RON 95'));
    return [
      { lbl: 'Loại nhiên liệu', val: types,                                         sub: 'đang theo dõi' },
      { lbl: 'Giá RON 95',      val: ron95 ? fmtVNDg(ron95.pricePerLitre) : '—',    sub: 'mới nhất', tone: 'info' as const },
      { lbl: 'Cập nhật cuối',   val: latest?.effectiveFrom ? dayjs(latest.effectiveFrom).format('DD/MM/YYYY') : '—', sub: 'hiệu lực từ', tone: 'ok' as const },
      { lbl: 'Tổng bản ghi',    val: fuel.length,                                   sub: 'lịch sử giá' },
    ];
  }, [tab, surcharge, other, transport, fuel]);

  // ----- Tabs definition -----
  const tabsDef = [
    { v: 'surcharge' as const, ic: 'receipt',   l: `Phụ thu (${surcharge.length})` },
    { v: 'other' as const,     ic: 'plus',      l: `Thu khác (${other.length})` },
    { v: 'transport' as const, ic: 'ambulance', l: `Vận chuyển BN (${transport.length})` },
    { v: 'fuel' as const,      ic: 'flask',     l: `Giá xăng dầu (${fuel.length})` },
  ];

  // ----- Columns per tab -----
  const cols: ColumnDef<AnyRow>[] = useMemo(() => {
    if (tab === 'surcharge' || tab === 'other') {
      return [
        { key: 'code', label: 'Mã', mono: true, code: true, width: 160 },
        { key: 'name', label: tab === 'surcharge' ? 'Tên phụ thu' : 'Tên khoản thu' },
        { key: 'unit', label: 'ĐVT', width: 80, render: (r) => (r as api.AdditionalChargeDto).unit || '—' },
        { key: 'price', label: 'Số tiền', width: 140, render: (r) => {
          const p = (r as api.AdditionalChargeDto).price;
          return <span className="mono" style={{ fontWeight: 600 }}>{p ? fmtVNDg(p) : <i style={{ color: 'var(--t-3)' }}>Theo TT</i>}</span>;
        } },
        { key: 'effectiveFrom', label: 'Áp dụng từ', mono: true, width: 130,
          render: (r) => {
            const d = (r as api.AdditionalChargeDto).effectiveFrom;
            return d ? dayjs(d).format('DD/MM/YYYY') : '—';
          } },
        { key: 'isActive', label: 'Trạng thái', width: 130, render: (r) => (
          (r as api.AdditionalChargeDto).isActive
            ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
            : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge>
        ) },
      ];
    }
    if (tab === 'transport') {
      return [
        { key: 'code', label: 'Mã', mono: true, code: true, width: 140 },
        { key: 'name', label: 'Tuyến vận chuyển' },
        { key: 'calculationType', label: 'Cách tính', width: 130, render: (r) => {
          const v = (r as api.TransportServiceDto).calculationType;
          return <StatusBadge tone={v === 1 ? 'info' : 'ok'}>{v === 1 ? 'Theo km' : 'Theo lượt'}</StatusBadge>;
        } },
        { key: 'unitPrice', label: 'Đơn giá', width: 140, render: (r) => (
          <span className="mono" style={{ fontWeight: 600 }}>{fmtVNDg((r as api.TransportServiceDto).unitPrice)}</span>
        ) },
        { key: 'gasolineFactor', label: 'Hệ số xăng', mono: true, width: 110, render: (r) => (r as api.TransportServiceDto).gasolineFactor ?? '—' },
        { key: 'isActive', label: 'Trạng thái', width: 130, render: (r) => (
          (r as api.TransportServiceDto).isActive
            ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
            : <StatusBadge tone="info" dot>Tạm dừng</StatusBadge>
        ) },
      ];
    }
    // fuel
    return [
      { key: 'fuelType',      label: 'Loại nhiên liệu', render: (r) => <b>{(r as api.GasolinePriceDto).fuelType}</b> },
      { key: 'pricePerLitre', label: 'Giá / lít', width: 160, render: (r) => (
        <span className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{fmtVNDg((r as api.GasolinePriceDto).pricePerLitre)}</span>
      ) },
      { key: 'issuedBy',      label: 'Nguồn', width: 130, render: (r) => (r as api.GasolinePriceDto).issuedBy || '—' },
      { key: 'effectiveFrom', label: 'Hiệu lực từ', mono: true, width: 130, render: (r) => (
        (r as api.GasolinePriceDto).effectiveFrom ? dayjs((r as api.GasolinePriceDto).effectiveFrom).format('DD/MM/YYYY') : '—'
      ) },
      { key: 'note', label: 'Ghi chú', render: (r) => (
        <span style={{ color: 'var(--t-2)', fontSize: 12 }}>{(r as api.GasolinePriceDto).note || '—'}</span>
      ) },
    ];
  }, [tab]);

  // ----- Open drawer for create / edit -----
  const openDrawer = (row?: AnyRow) => {
    if (row) { setEdit({ ...row } as EditState); setEditIsNew(false); }
    else {
      const seed: EditState =
        tab === 'surcharge' || tab === 'other'
          ? { code: '', name: '', unit: 'lượt', price: 0, isActive: true, sortOrder: rows.length + 1 }
          : tab === 'transport'
          ? { code: '', name: '', calculationType: 1, unitPrice: 0, gasolineFactor: 1, isActive: true, sortOrder: rows.length + 1 }
          : { fuelType: 'RON 95-III', pricePerLitre: 0, effectiveFrom: dayjs().format('YYYY-MM-DD'), issuedBy: 'PVOIL' };
      setEdit(seed);
      setEditIsNew(true);
    }
  };

  // ----- Save handler -----
  const handleSave = async () => {
    if (!edit) return;
    try {
      if (tab === 'surcharge') {
        await api.saveAdditionalCharge(edit as Partial<api.AdditionalChargeDto>);
      } else if (tab === 'other') {
        await api.saveOtherIncome(edit as Partial<api.OtherIncomeDto>);
      } else if (tab === 'transport') {
        await api.saveTransportService(edit as Partial<api.TransportServiceDto>);
      } else {
        await api.saveGasolinePrice(edit as Partial<api.GasolinePriceDto>);
      }
      tk(editIsNew ? 'Đã thêm' : 'Đã cập nhật');
      setEdit(null);
      reload(tab);
    } catch { te('Lưu thất bại'); }
  };

  // ----- Delete -----
  const handleDelete = (row: AnyRow) => {
    const label = (row as { name?: string; fuelType?: string }).name
      || (row as { fuelType?: string }).fuelType
      || (row as { code?: string }).code
      || row.id;
    cf(`Xoá "${label}"?`, async () => {
      try {
        if (tab === 'surcharge') await api.deleteAdditionalCharge(row.id);
        else if (tab === 'other') await api.deleteOtherIncome(row.id);
        else if (tab === 'transport') await api.deleteTransportService(row.id);
        else await api.deleteGasolinePrice(row.id);
        tk('Đã xoá');
        reload(tab);
      } catch { te('Xoá thất bại'); }
    }, { tone: 'crit', confirm: 'Xoá' });
  };

  // ----- CSV export -----
  const exportCsv = () => {
    const header = cols.map((c) => c.label).join(',');
    const body = filtered.map((r) => cols.map((c) => {
      const v = (r as unknown as Record<string, unknown>)[c.key];
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\n');
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finance-catalog-${tab}-${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    tk('Đã xuất CSV');
  };

  // ----- Row actions -----
  const rowAct = (r: AnyRow) => (
    <>
      <ActBtn ic="edit" title="Sửa" onClick={() => openDrawer(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete(r)} />
    </>
  );

  return (
    <div className="ab">
      <KpiStrip items={kpis} />
      <TopTabs tab={tab} setTab={setTab} tabs={tabsDef} />
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm theo mã, tên, ghi chú…" />
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={exportCsv}>
          <Ico name="download" size={12} /> Xuất CSV
        </button>
        <button className="ab-btn primary" type="button" onClick={() => openDrawer()}>
          <Ico name="plus" size={12} /> Thêm mới
        </button>
      </div>
      <DataTable
        columns={cols}
        data={pageData}
        rowKey={(r) => r.id}
        onRowClick={(r) => openDrawer(r)}
        actions={rowAct}
        empty={search ? 'Không khớp từ khoá.' : 'Chưa có dữ liệu. Thêm bản ghi đầu tiên ở góc phải.'}
      />
      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!edit}
        onClose={() => setEdit(null)}
        size="lg"
        title={editIsNew
          ? 'Thêm bản ghi mới'
          : `Sửa: ${(edit?.name as string) || (edit?.fuelType as string) || (edit?.code as string) || ''}`}
        sub={`Mục: ${tabsDef.find((t) => t.v === tab)?.l.split(' (')[0]}`}
        footer={(
          <>
            <button className="ab-btn ghost" type="button" onClick={() => setEdit(null)}>Huỷ</button>
            <button className="ab-btn primary" type="button" onClick={handleSave}>
              <Ico name="check" size={12} /> {editIsNew ? 'Tạo mới' : 'Lưu'}
            </button>
          </>
        )}
      >
        {edit && <EditForm tab={tab} edit={edit} setEdit={setEdit} />}
      </DrawerShell>
    </div>
  );
};

// ----- Drawer form body -----
const EditForm: React.FC<{ tab: TabKey; edit: EditState; setEdit: (e: EditState) => void }>
  = ({ tab, edit, setEdit }) => {
  const set = (k: string, v: unknown) => setEdit({ ...edit, [k]: v });

  if (tab === 'surcharge' || tab === 'other') {
    return (
      <DrSec title="Thông tin">
        <DrField lbl="Mã">
          <Input value={edit.code as string || ''} onChange={(e) => set('code', e.target.value)} placeholder="VD: PT-NGOAIGIO" />
        </DrField>
        <DrField lbl="Tên">
          <Input value={edit.name as string || ''} onChange={(e) => set('name', e.target.value)} placeholder={tab === 'surcharge' ? 'Tên phụ thu' : 'Tên khoản thu'} />
        </DrField>
        <DrField lbl="Đơn vị tính">
          <Input value={edit.unit as string || ''} onChange={(e) => set('unit', e.target.value)} placeholder="lượt / ngày / gói…" />
        </DrField>
        <DrField lbl="Số tiền (VND)">
          <InputNumber
            value={edit.price as number ?? 0}
            min={0}
            step={1000}
            style={{ width: '100%' }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => Number((v || '').replace(/[^\d]/g, '')) as 0}
            onChange={(v) => set('price', v ?? 0)}
          />
        </DrField>
        <DrField lbl="Áp dụng từ">
          <DatePicker
            value={edit.effectiveFrom ? dayjs(edit.effectiveFrom as string) : null}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            onChange={(d) => set('effectiveFrom', d ? d.toISOString() : null)}
          />
        </DrField>
        <DrField lbl="Đến">
          <DatePicker
            value={edit.effectiveTo ? dayjs(edit.effectiveTo as string) : null}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            onChange={(d) => set('effectiveTo', d ? d.toISOString() : null)}
          />
        </DrField>
        <DrField lbl="Ghi chú">
          <Input.TextArea value={edit.note as string || ''} onChange={(e) => set('note', e.target.value)} rows={2} />
        </DrField>
        <DrField lbl="Thứ tự">
          <InputNumber value={edit.sortOrder as number ?? 0} min={0} onChange={(v) => set('sortOrder', v ?? 0)} style={{ width: '100%' }} />
        </DrField>
        <DrField lbl="Hoạt động">
          <Switch checked={!!edit.isActive} onChange={(v) => set('isActive', v)} />
        </DrField>
      </DrSec>
    );
  }

  if (tab === 'transport') {
    return (
      <DrSec title="Thông tin">
        <DrField lbl="Mã">
          <Input value={edit.code as string || ''} onChange={(e) => set('code', e.target.value)} placeholder="VD: XCC-TINH" />
        </DrField>
        <DrField lbl="Tên tuyến">
          <Input value={edit.name as string || ''} onChange={(e) => set('name', e.target.value)} />
        </DrField>
        <DrField lbl="Cách tính">
          <Select
            value={edit.calculationType as number ?? 1}
            options={CALC_TYPES}
            style={{ width: '100%' }}
            onChange={(v) => set('calculationType', v)}
          />
        </DrField>
        <DrField lbl="Đơn giá (VND)">
          <InputNumber
            value={edit.unitPrice as number ?? 0}
            min={0}
            step={1000}
            style={{ width: '100%' }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => Number((v || '').replace(/[^\d]/g, '')) as 0}
            onChange={(v) => set('unitPrice', v ?? 0)}
          />
        </DrField>
        <DrField lbl="Hệ số xăng">
          <InputNumber value={edit.gasolineFactor as number ?? 1} min={0} step={0.1} style={{ width: '100%' }} onChange={(v) => set('gasolineFactor', v ?? 1)} />
        </DrField>
        <DrField lbl="Ghi chú">
          <Input.TextArea value={edit.note as string || ''} onChange={(e) => set('note', e.target.value)} rows={2} />
        </DrField>
        <DrField lbl="Thứ tự">
          <InputNumber value={edit.sortOrder as number ?? 0} min={0} onChange={(v) => set('sortOrder', v ?? 0)} style={{ width: '100%' }} />
        </DrField>
        <DrField lbl="Hoạt động">
          <Switch checked={!!edit.isActive} onChange={(v) => set('isActive', v)} />
        </DrField>
      </DrSec>
    );
  }

  // fuel
  return (
    <DrSec title="Thông tin">
      <DrField lbl="Loại nhiên liệu">
        <Select
          value={edit.fuelType as string || FUEL_TYPES[0]}
          options={FUEL_TYPES.map((t) => ({ value: t, label: t }))}
          style={{ width: '100%' }}
          onChange={(v) => set('fuelType', v)}
        />
      </DrField>
      <DrField lbl="Giá / lít (VND)">
        <InputNumber
          value={edit.pricePerLitre as number ?? 0}
          min={0}
          step={100}
          style={{ width: '100%' }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => Number((v || '').replace(/[^\d]/g, '')) as 0}
          onChange={(v) => set('pricePerLitre', v ?? 0)}
        />
      </DrField>
      <DrField lbl="Hiệu lực từ">
        <DatePicker
          value={edit.effectiveFrom ? dayjs(edit.effectiveFrom as string) : dayjs()}
          format="DD/MM/YYYY"
          style={{ width: '100%' }}
          onChange={(d) => set('effectiveFrom', (d || dayjs()).toISOString())}
        />
      </DrField>
      <DrField lbl="Đơn vị ban hành">
        <Input value={edit.issuedBy as string || ''} onChange={(e) => set('issuedBy', e.target.value)} placeholder="PVOIL / Petrolimex…" />
      </DrField>
      <DrField lbl="Ghi chú">
        <Input.TextArea value={edit.note as string || ''} onChange={(e) => set('note', e.target.value)} rows={2} />
      </DrField>
    </DrSec>
  );
};

export default FinanceCatalogsV2;
