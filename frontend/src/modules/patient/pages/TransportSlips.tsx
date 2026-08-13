import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../../../services/apiClient';
import {
  transportSlipApi,
  type PatientTransportSlipDto,
  type TransportSlipFilter,
} from '../../../api/nangcap27';
import {
  KpiStrip, SearchBox, Filter, DataTable, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, fmtVNDg, fmtDTg, tk, te, tw,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

const { RangePicker } = DatePicker;

/* NangCap27 G1 — Phiếu vận chuyển người bệnh (HSMT 4.1.8/4.1.30, 10.1.9/.11,
   11.1.12/.14, 18.2.9/.11, 18.3.12/.14).
   Danh mục dịch vụ vận chuyển + giá xăng lấy từ /master-catalog/* (NangCap22),
   trang này chỉ lập/duyệt/hoàn thành/hủy PHIẾU. */

interface TransportServiceOption {
  id: string;
  code: string;
  name: string;
  /** 1 = theo km, 2 = theo lượt */
  calculationType: number;
  unitPrice: number;
  gasolineFactor?: number;
}

interface PatientOption {
  id: string;
  patientCode: string;
  fullName: string;
}

interface GasolinePriceOption {
  id: string;
  fuelType: string;
  pricePerLitre: number;
  effectiveFrom: string;
}

const STATUS_OPTIONS = [
  { v: '0', l: 'Nháp' },
  { v: '1', l: 'Đã duyệt' },
  { v: '2', l: 'Hoàn thành' },
  { v: '3', l: 'Đã hủy' },
];

const statusTone = (status: number): 'info' | 'ok' | 'warn' | 'crit' =>
  status === 0 ? 'warn' : status === 1 ? 'info' : status === 2 ? 'ok' : 'crit';

/** Interceptor có thể đã bóc envelope {success,data} — chấp nhận cả 2 dạng. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrapItems = <T,>(payload: any): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload.items)) return payload.items as T[];
  if (payload.data) return unwrapItems<T>(payload.data);
  return [];
};

const TransportSlipsV2: React.FC = () => {
  const [data, setData] = useState<PatientTransportSlipDto[]>([]);
  const [services, setServices] = useState<TransportServiceOption[]>([]);
  const [fuels, setFuels] = useState<GasolinePriceOption[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([dayjs().subtract(30, 'day'), dayjs()]);
  const [filterStatus, setFilterStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<PatientTransportSlipDto | null>(null);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filter: TransportSlipFilter = {};
      if (range?.[0]) filter.fromDate = range[0].toISOString();
      if (range?.[1]) filter.toDate = range[1].toISOString();
      if (filterStatus) filter.status = Number(filterStatus);
      if (keyword) filter.keyword = keyword;
      setData(await transportSlipApi.list(filter));
    } catch { te('Tải danh sách phiếu vận chuyển thất bại'); }
    finally { setLoading(false); }
  }, [range, filterStatus, keyword]);

  useEffect(() => { load(); }, [load]);

  // Danh mục dịch vụ vận chuyển + giá xăng — nạp 1 lần, dùng cho form lập phiếu.
  useEffect(() => {
    apiClient.get('/master-catalog/transport-services')
      .then(r => setServices(unwrapItems<TransportServiceOption>(r.data)))
      .catch(() => tw('Không tải được danh mục dịch vụ vận chuyển'));
    apiClient.get('/master-catalog/gasoline-prices')
      .then(r => setFuels(unwrapItems<GasolinePriceOption>(r.data)))
      .catch(() => tw('Không tải được danh mục giá xăng'));
  }, []);

  const searchPatients = useCallback((kw: string) => {
    if (!kw || kw.trim().length < 2) return;
    apiClient.post('/patients/search', { keyword: kw.trim(), page: 1, pageSize: 20 })
      .then(r => setPatients(unwrapItems<PatientOption>(r.data)))
      .catch(() => { /* gõ dở dang — không làm phiền người dùng bằng toast */ });
  }, []);

  // Danh mục seed sẵn dòng nhưng ĐƠN GIÁ = 0 (giá do BV phê duyệt) → nêu rõ ngay ở nhãn chọn,
  // tránh lập phiếu 0đ mà tưởng đã tính tiền.
  const serviceOptions = useMemo(
    () => services.map(s => ({
      value: s.id,
      label: `${s.name}${s.calculationType === 1 ? ' (theo km)' : ' (theo lượt)'}`
        + (s.unitPrice > 0 ? '' : ' — ⚠ chưa có đơn giá'),
    })),
    [services],
  );

  const patientOptions = useMemo(
    () => patients.map(p => ({ value: p.id, label: `${p.patientCode} — ${p.fullName}` })),
    [patients],
  );

  /** Mỗi loại nhiên liệu chỉ hiện 1 lần (danh mục lưu theo từng đợt điều chỉnh giá). */
  const fuelOptions = useMemo(() => {
    const seen = new Map<string, GasolinePriceOption>();
    fuels.forEach(f => {
      const prev = seen.get(f.fuelType);
      if (!prev || dayjs(f.effectiveFrom).isAfter(dayjs(prev.effectiveFrom))) seen.set(f.fuelType, f);
    });
    return [...seen.values()].map(f => ({
      value: f.fuelType,
      label: `${f.fuelType} — ${fmtVNDg(f.pricePerLitre)}/lít`,
    }));
  }, [fuels]);

  const fields: CrudFieldCfg[] = [
    {
      key: 'patientId', label: 'Người bệnh', type: 'autocomplete', required: true,
      options: patientOptions, onSearch: searchPatients, debounce: 300,
      placeholder: 'Gõ mã BN hoặc họ tên (≥ 2 ký tự)…',
    },
    {
      key: 'transportServiceId', label: 'Dịch vụ vận chuyển', type: 'select', required: true,
      options: serviceOptions, placeholder: 'Chọn dịch vụ trong danh mục',
    },
    {
      key: 'fuelType', label: 'Loại nhiên liệu', type: 'select', options: fuelOptions,
      placeholder: 'Chọn đúng loại xe dùng — bỏ trống sẽ không tính được tiền xăng',
    },
    { key: 'transportDate', label: 'Ngày vận chuyển', type: 'date', required: true },
    { key: 'fromPlace', label: 'Nơi đi', required: true, placeholder: 'VD: Khoa Cấp cứu' },
    { key: 'toPlace', label: 'Nơi đến', required: true, placeholder: 'VD: BV Đa khoa tỉnh' },
    { key: 'distanceKm', label: 'Số km', type: 'number', placeholder: 'Bỏ trống nếu tính theo lượt' },
    { key: 'reason', label: 'Lý do vận chuyển', type: 'textarea' },
    { key: 'vehiclePlate', label: 'Biển số xe' },
    { key: 'driverName', label: 'Lái xe' },
    { key: 'escortStaff', label: 'NV y tế đi kèm' },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
  ];

  const openCreate = () => {
    setEditing({ transportDate: dayjs().format('YYYY-MM-DD'), distanceKm: 0 });
    setModalOpen(true);
  };

  const openEdit = (row: PatientTransportSlipDto) => {
    if (row.status !== 0) { tw('Chỉ sửa được phiếu ở trạng thái Nháp'); return; }
    setEditing({
      id: row.id,
      patientId: row.patientId,
      transportServiceId: row.transportServiceId,
      fuelType: row.fuelType,
      transportDate: dayjs(row.transportDate).format('YYYY-MM-DD'),
      fromPlace: row.fromPlace,
      toPlace: row.toPlace,
      distanceKm: row.distanceKm,
      reason: row.reason,
      vehiclePlate: row.vehiclePlate,
      driverName: row.driverName,
      escortStaff: row.escortStaff,
      note: row.note,
    });
    setModalOpen(true);
  };

  const submit = async (values: Record<string, unknown>) => {
    await transportSlipApi.save({
      id: values.id as string | undefined,
      patientId: values.patientId as string,
      transportServiceId: values.transportServiceId as string,
      fuelType: values.fuelType as string | undefined,
      transportDate: values.transportDate ? dayjs(values.transportDate as string).toISOString() : undefined,
      fromPlace: values.fromPlace as string,
      toPlace: values.toPlace as string,
      distanceKm: Number(values.distanceKm ?? 0),
      reason: values.reason as string | undefined,
      vehiclePlate: values.vehiclePlate as string | undefined,
      driverName: values.driverName as string | undefined,
      escortStaff: values.escortStaff as string | undefined,
      note: values.note as string | undefined,
    });
    tk('Đã lưu phiếu vận chuyển');
    await load();
  };

  /** Bọc chung 3 hành động chuyển trạng thái để không lặp try/catch/reload. */
  const runAction = async (
    action: () => Promise<PatientTransportSlipDto>,
    okMsg: string,
  ) => {
    try {
      await action();
      tk(okMsg);
      await load();
      setDetail(null);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      te(err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const printSlip = (s: PatientTransportSlipDto) => {
    const w = window.open('', '_blank');
    if (!w) { tw('Trình duyệt chặn cửa sổ in'); return; }
    const money = (n: number) => fmtVNDg(n);
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${s.slipCode}</title>
<style>body{font-family:"Times New Roman",serif;padding:32px;font-size:13.5pt}
h1{text-align:center;font-size:17pt;margin:16px 0}.row{margin:5px 0}
table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #000;padding:6px}
.sig{display:flex;justify-content:space-around;margin-top:48px;text-align:center}</style></head><body>
<h1>PHIẾU VẬN CHUYỂN NGƯỜI BỆNH</h1>
<div class="row"><b>Số phiếu:</b> ${s.slipCode} — <b>Ngày:</b> ${dayjs(s.transportDate).format('DD/MM/YYYY HH:mm')}</div>
<div class="row"><b>Người bệnh:</b> ${s.patientName ?? ''} (${s.patientCode ?? ''})</div>
<div class="row"><b>Khoa:</b> ${s.departmentName ?? ''}</div>
<div class="row"><b>Nơi đi:</b> ${s.fromPlace} &nbsp;&nbsp; <b>Nơi đến:</b> ${s.toPlace}</div>
<div class="row"><b>Lý do:</b> ${s.reason ?? ''}</div>
<div class="row"><b>Biển số xe:</b> ${s.vehiclePlate ?? ''} — <b>Lái xe:</b> ${s.driverName ?? ''}</div>
<div class="row"><b>NV y tế đi kèm:</b> ${s.escortStaff ?? ''}</div>
<table><tr><th>Dịch vụ</th><th>Cách tính</th><th>Số km</th><th>Đơn giá</th><th>Tiền DV</th><th>Tiền xăng</th><th>Tổng</th></tr>
<tr><td>${s.transportServiceName ?? ''}</td><td>${s.calculationType === 1 ? 'Theo km' : 'Theo lượt'}</td>
<td style="text-align:center">${s.calculationType === 1 ? s.distanceKm : '-'}</td>
<td style="text-align:right">${money(s.unitPrice)}</td><td style="text-align:right">${money(s.serviceAmount)}</td>
<td style="text-align:right">${money(s.fuelAmount)}${s.fuelType ? `<br/><small>${s.fuelType}</small>` : ''}</td>
<td style="text-align:right"><b>${money(s.totalAmount)}</b></td></tr></table>
<div class="sig"><div><b>Người lập phiếu</b><br/><i>(Ký, ghi rõ họ tên)</i></div>
<div><b>Lãnh đạo duyệt</b><br/><i>(Ký, ghi rõ họ tên)</i></div></div>
</body></html>`);
    w.document.close();
    w.print();
  };

  const cols: ColumnDef<PatientTransportSlipDto>[] = [
    { key: 'code', label: 'Số phiếu', render: (r) => (
      <span style={{ fontFamily: 'var(--font-mono)' }}>{r.slipCode}</span>
    ) },
    { key: 'date', label: 'Ngày VC', render: (r) => fmtDTg(r.transportDate) },
    { key: 'pt', label: 'Người bệnh', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName ?? '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode ?? ''}</div>
      </div>
    ) },
    { key: 'route', label: 'Hành trình', render: (r) => `${r.fromPlace} → ${r.toPlace}` },
    { key: 'svc', label: 'Dịch vụ', render: (r) => r.transportServiceName || '—' },
    { key: 'km', label: 'Số km', render: (r) => (r.calculationType === 1 ? r.distanceKm : '—') },
    { key: 'total', label: 'Thành tiền', render: (r) => (
      r.totalAmount > 0
        ? fmtVNDg(r.totalAmount)
        : <StatusBadge tone="warn">Chưa có đơn giá</StatusBadge>
    ) },
    { key: 'status', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={statusTone(r.status)}>{r.statusName}</StatusBadge>
    ) },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phiếu', val: data.length, sub: 'kỳ này' },
        { lbl: 'Chờ duyệt', val: data.filter(d => d.status === 0).length, sub: 'nháp', tone: 'warn' },
        { lbl: 'Đã duyệt', val: data.filter(d => d.status === 1).length, sub: 'chờ hoàn thành', tone: 'info' },
        { lbl: 'Tổng chi phí', val: fmtVNDg(data.filter(d => d.status !== 3).reduce((s, d) => s + d.totalAmount, 0)), sub: 'trừ phiếu hủy' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <RangePicker format="DD/MM/YYYY" value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
        <Filter value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} placeholder="▾ Trạng thái" />
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Số phiếu / nơi đi-đến / lái xe…" />
        <Btn variant="ghost" icon="x" onClick={() => {
          setKeyword(''); setFilterStatus(''); setRange([dayjs().subtract(30, 'day'), dayjs()]);
        }}>Reset</Btn>
        <span className="spacer" />
        <Btn variant="primary" icon="plus" onClick={openCreate}>Lập phiếu</Btn>
      </div>

      <DataTable<PatientTransportSlipDto>
        columns={cols} data={data} rowKey={(r) => r.id} loading={loading}
        onRowClick={setDetail}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="eye" title="Xem" onClick={() => setDetail(r)} />
            <ActBtn ic="print" title="In phiếu" onClick={() => printSlip(r)} />
            {r.status === 0 && <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />}
            {r.status === 0 && (
              <ActBtn ic="check" title="Duyệt" onClick={() =>
                runAction(() => transportSlipApi.approve(r.id), 'Đã duyệt phiếu')} />
            )}
            {r.status === 1 && (
              <ActBtn ic="check" title="Hoàn thành" onClick={() =>
                runAction(() => transportSlipApi.complete(r.id), 'Đã hoàn thành phiếu')} />
            )}
            {r.status !== 2 && r.status !== 3 && (
              <ActBtn ic="x" title="Hủy" onClick={() =>
                runAction(() => transportSlipApi.cancel(r.id, 'Hủy trên màn hình phiếu vận chuyển'), 'Đã hủy phiếu')} />
            )}
          </div>
        )}
        empty="Chưa có phiếu vận chuyển"
      />

      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? 'Sửa phiếu vận chuyển' : 'Lập phiếu vận chuyển'}
        sub="Đơn giá và tiền xăng lấy theo danh mục tại thời điểm lập phiếu"
        size="lg"
        fields={fields}
        initial={editing}
        onSubmit={submit}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? `Phiếu ${detail.slipCode}` : ''}
        sub={detail ? `${detail.patientName ?? ''} · ${detail.statusName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
          {detail && <Btn variant="primary" icon="print" onClick={() => printSlip(detail)}>In phiếu</Btn>}
        </>}
      >
        {detail && <>
          <DrSec title="Người bệnh">
            <DrField lbl="Họ tên">{detail.patientName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.patientCode || '—'}</span></DrField>
            <DrField lbl="Khoa">{detail.departmentName || '—'}</DrField>
          </DrSec>
          <DrSec title="Hành trình">
            <DrField lbl="Ngày vận chuyển">{fmtDTg(detail.transportDate)}</DrField>
            <DrField lbl="Nơi đi">{detail.fromPlace}</DrField>
            <DrField lbl="Nơi đến">{detail.toPlace}</DrField>
            <DrField lbl="Lý do">{detail.reason || '—'}</DrField>
            <DrField lbl="Biển số xe">{detail.vehiclePlate || '—'}</DrField>
            <DrField lbl="Lái xe">{detail.driverName || '—'}</DrField>
            <DrField lbl="NV y tế đi kèm">{detail.escortStaff || '—'}</DrField>
          </DrSec>
          <DrSec title="Chi phí">
            <DrField lbl="Dịch vụ">{detail.transportServiceName || '—'}</DrField>
            <DrField lbl="Cách tính">{detail.calculationType === 1 ? 'Theo km' : 'Theo lượt'}</DrField>
            <DrField lbl="Số km">{detail.calculationType === 1 ? detail.distanceKm : '—'}</DrField>
            <DrField lbl="Đơn giá">{fmtVNDg(detail.unitPrice)}</DrField>
            <DrField lbl="Tiền dịch vụ">{fmtVNDg(detail.serviceAmount)}</DrField>
            <DrField lbl="Loại nhiên liệu">{detail.fuelType || '—'}</DrField>
            <DrField lbl="Giá xăng">{detail.fuelPricePerLitre ? fmtVNDg(detail.fuelPricePerLitre) : '—'}</DrField>
            <DrField lbl="Tiền xăng">{fmtVNDg(detail.fuelAmount)}</DrField>
            <DrField lbl="Tổng cộng"><b>{fmtVNDg(detail.totalAmount)}</b></DrField>
          </DrSec>
          <DrSec title="Duyệt">
            <DrField lbl="Trạng thái"><StatusBadge tone={statusTone(detail.status)}>{detail.statusName}</StatusBadge></DrField>
            <DrField lbl="Người duyệt">{detail.approvedByName || '—'}</DrField>
            <DrField lbl="Thời điểm duyệt">{detail.approvedAt ? fmtDTg(detail.approvedAt) : '—'}</DrField>
            <DrField lbl="Lý do hủy">{detail.cancelReason || '—'}</DrField>
            <DrField lbl="Ghi chú">{detail.note || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default TransportSlipsV2;
