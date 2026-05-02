import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, tw, Ico,
  type ColumnDef,
} from './_v2kit';

interface DispenseRow {
  prescriptionId: string;
  prescriptionCode: string;
  patientCode: string;
  patientName: string;
  patientAge?: number;
  gender?: number;
  prescribedAt: string;
  doctorName?: string;
  totalItems: number;
  totalAmount: number;
  insuranceType: string;
  isDispensed: boolean;
  items: { id: string; medicineName: string; quantity: number; unit?: string; dosage?: string; days?: number }[];
}

const COUNTER_OPTIONS = [
  { v: 'quay1', l: 'Quầy 1 — BHYT' },
  { v: 'quay2', l: 'Quầy 2 — Thu phí' },
  { v: 'quay3', l: 'Quầy 3 — Dịch vụ' },
  { v: 'quay4', l: 'Quầy 4 — YHCT' },
  { v: 'quay5', l: 'Quầy 5 — Cấp cứu' },
];

type SKey = 'pending' | 'dispensed';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Chưa phát',  tone: 'warn' as const },
  { v: 'dispensed' as SKey, l: 'Đã phát',    tone: 'ok' as const },
];

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

const DispensingCounterV2: React.FC = () => {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [counter, setCounter] = useState('quay1');
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey>('pending');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DispenseRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<DispenseRow | null>(null);
  const [printCount, setPrintCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Array<Record<string, unknown>>>('/examination/prescriptions/recent', {
        params: {
          pageSize: 100,
          fromDate: date.startOf('day').toISOString(),
          toDate: date.endOf('day').toISOString(),
          keyword: search || undefined,
        },
      });
      const mapped: DispenseRow[] = (data || []).map((p) => ({
        prescriptionId: (p.id || p.prescriptionId) as string,
        prescriptionCode: (p.prescriptionCode || p.code || '') as string,
        patientCode: (p.patientCode || '') as string,
        patientName: (p.patientName || '') as string,
        gender: p.gender as number | undefined,
        prescribedAt: (p.prescribedAt || p.prescriptionDate || p.createdAt || new Date().toISOString()) as string,
        doctorName: (p.doctorName || p.prescribedBy) as string | undefined,
        totalItems: ((p.items as unknown[]) || []).length,
        totalAmount: (p.totalAmount || 0) as number,
        insuranceType: (p.insuranceType || p.diagnosis || 'Thu phí') as string,
        isDispensed: Boolean(p.isDispensed),
        items: ((p.items as unknown[]) || []) as DispenseRow['items'],
      }));
      setRows(mapped);
    } catch { ti('Không tải được danh sách đơn thuốc'); setRows([]); }
    finally { setLoading(false); }
  }, [date, search]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => stab === 'pending' ? !r.isDispensed : r.isDispensed),
    [rows, stab],
  );

  const counts = useMemo(() => ({
    pending: rows.filter((r) => !r.isDispensed).length,
    dispensed: rows.filter((r) => r.isDispensed).length,
    all: rows.length,
  }) as Record<string, number>, [rows]);

  const handleDispense = async () => {
    if (selected.size === 0) { tw('Chưa chọn đơn thuốc'); return; }
    try {
      for (const id of Array.from(selected)) {
        await apiClient.post(`/warehousecomplete/issues/dispense-outpatient/${id}`);
      }
      tk(`Đã phát ${selected.size} đơn`);
      setPrintCount((c) => c + selected.size);
      setSelected(new Set());
      load();
    } catch { tw('Phát thuốc thất bại'); }
  };

  const handleCancel = async (id: string) => {
    try { await apiClient.post(`/warehousecomplete/issues/${id}/cancel`); tk('Đã hủy phát'); load(); }
    catch { tw('Hủy thất bại'); }
  };

  const printLabels = (row: DispenseRow) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Tem thuốc ${row.patientCode}</title>
<style>body{font-family:Arial;margin:0;padding:10px}.label{border:1px solid #000;padding:8px 12px;margin-bottom:8px;width:260px}.label h3{margin:0 0 4px;font-size:13px}.label p{margin:2px 0;font-size:11px}.barcode{font-family:'Libre Barcode 128',monospace;font-size:32px;text-align:center}@media print{.no-print{display:none}}</style></head>
<body><div class="no-print" style="margin-bottom:12px"><button onclick="window.print()">In</button> <button onclick="window.close()">Đóng</button></div>
${row.items.map((it) => `<div class="label"><h3>${it.medicineName}</h3><p><strong>BN:</strong> ${row.patientName} (${row.patientCode})</p><p><strong>SL:</strong> ${it.quantity} ${it.unit || ''} × ${it.days || 1} ngày</p><p><strong>Cách dùng:</strong> ${it.dosage || '-'}</p><p class="barcode">*${row.prescriptionCode}*</p></div>`).join('')}
</body></html>`;
    const win = window.open('', '_blank', 'width=400,height=600');
    win?.document.write(html); win?.document.close();
  };

  const cols: ColumnDef<DispenseRow>[] = [
    { key: 'code', label: 'Mã đơn', code: true, render: (r) => r.prescriptionCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {r.patientCode} {r.gender !== undefined && `· ${r.gender === 1 ? 'Nam' : 'Nữ'}`}
        </div>
      </div>
    ) },
    { key: 'doc', label: 'BS kê đơn', render: (r) => r.doctorName || '—' },
    { key: 'time', label: 'Kê lúc', mono: true, render: (r) => dayjs(r.prescribedAt).format('HH:mm') },
    { key: 'ins', label: 'Đối tượng', render: (r) => <StatusBadge tone="info">{r.insuranceType}</StatusBadge> },
    { key: 'items', label: 'SL thuốc', mono: true, render: (r) => r.totalItems },
    { key: 'amt', label: 'Tổng tiền', mono: true, render: (r) => fmt(r.totalAmount) },
  ];

  const togglePending = (id: string) => {
    const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n);
  };
  const toggleAll = () => {
    if (filtered.every((r) => selected.has(r.prescriptionId))) {
      const n = new Set(selected); filtered.forEach((r) => n.delete(r.prescriptionId)); setSelected(n);
    } else {
      const n = new Set(selected); filtered.forEach((r) => n.add(r.prescriptionId)); setSelected(n);
    }
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đơn hôm nay', val: rows.length, sub: dayjs(date).format('DD/MM/YYYY') },
        { lbl: 'Chưa phát', val: counts.pending || 0, sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Đã phát', val: counts.dispensed || 0, sub: 'hoàn tất', tone: 'ok' },
        { lbl: 'In phiên này', val: printCount, sub: 'tem in', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <DatePicker value={date} onChange={(v) => v && setDate(v)} format="DD/MM/YYYY" />
        <Filter value={counter} onChange={setCounter} options={COUNTER_OPTIONS} placeholder="▾ Quầy" />
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã BN / tên / mã đơn…" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); load(); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Quét barcode')}>
          <Ico name="qr" size={12} /> Quét barcode
        </button>
        {stab === 'pending' && selected.size > 0 && (
          <button className="ab-btn primary" type="button" onClick={handleDispense}>
            <Ico name="check" size={12} /> Phát {selected.size} đơn
          </button>
        )}
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v as SKey); setSelected(new Set()); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<DispenseRow>
        columns={cols} data={filtered} rowKey={(r) => r.prescriptionId}
        onRowClick={setDetail}
        selected={stab === 'pending' ? selected : null}
        onToggle={togglePending} onToggleAll={toggleAll}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
            <ActBtn ic="print" title="In tem" onClick={() => printLabels(r)} />
            {r.isDispensed && (
              <ActBtn ic="refresh" title="Hủy phát" tone="warn" onClick={() => handleCancel(r.prescriptionId)} />
            )}
          </div>
        )}
        empty={loading ? 'Đang tải…' : (stab === 'pending' ? 'Không còn đơn chờ phát' : 'Chưa phát đơn nào')}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? `Đơn ${detail.prescriptionCode}` : ''}
        sub={detail ? `${detail.patientName} · ${detail.patientCode}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
          {detail && <>
            <button type="button" className="ab-btn" onClick={() => printLabels(detail)}>
              <Ico name="print" size={12} /> In tem
            </button>
            {!detail.isDispensed && (
              <button type="button" className="ab-btn primary" onClick={async () => {
                try {
                  await apiClient.post(`/warehousecomplete/issues/dispense-outpatient/${detail.prescriptionId}`);
                  tk('Đã phát'); setDetail(null); load();
                } catch { tw('Phát thất bại'); }
              }}>
                <Ico name="check" size={12} /> Phát đơn này
              </button>
            )}
          </>}
        </>}
      >
        {detail && <>
          <DrSec title="Thông tin đơn">
            <DrField lbl="Mã đơn"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.prescriptionCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{detail.patientName} · {detail.patientCode}</DrField>
            <DrField lbl="Giới tính">{detail.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
            <DrField lbl="BS kê đơn">{detail.doctorName || '—'}</DrField>
            <DrField lbl="Đối tượng">{detail.insuranceType}</DrField>
            <DrField lbl="Kê lúc">{dayjs(detail.prescribedAt).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Tổng tiền"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(detail.totalAmount)} đ</span></DrField>
            <DrField lbl="Trạng thái">
              {detail.isDispensed
                ? <StatusBadge tone="ok" dot>Đã phát</StatusBadge>
                : <StatusBadge tone="warn" dot>Chưa phát</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title={`Mặt hàng (${detail.items.length})`}>
            <table className="ab-tbl">
              <thead><tr><th>Thuốc</th><th>SL</th><th>ĐVT</th><th>Cách dùng</th><th>Ngày</th></tr></thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.medicineName}</td>
                    <td className="mono">{it.quantity}</td>
                    <td>{it.unit || '—'}</td>
                    <td>{it.dosage || '—'}</td>
                    <td className="mono">{it.days || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default DispensingCounterV2;
