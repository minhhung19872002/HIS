import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmtNum as fmt } from '../../../utils/format';
import { DatePicker, Input, Modal, type InputRef } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../../../services/apiClient';
import { openPrintWindow } from '../../../utils/printWindow';
import { searchPrescriptionByCode, type DispensePrescriptionLookupDto } from '../api/examination';
import { PharmacyExpiryBanner } from '../../pharmacy/components/PharmacyExpiryBanner';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, tk, ti, tw, Ico,
  type ColumnDef,
} from '../../../pages-v2/_v2kit';

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
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeVal, setBarcodeVal] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const barcodeInputRef = useRef<InputRef>(null);

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
    const ids = Array.from(selected);
    // #352: giữ lại các dòng vừa phát để in tem NGAY — sau khi load() chúng nhảy sang tab "Đã phát"
    const dispensedRows = rows.filter((r) => ids.includes(r.prescriptionId));
    try {
      for (const id of ids) {
        await apiClient.post(`/warehousecomplete/issues/dispense-outpatient/${id}`);
      }
      tk(`Đã phát ${ids.length} đơn`);
      setPrintCount((c) => c + ids.length);
      setSelected(new Set());
      if (dispensedRows.length > 0) printLabels(dispensedRows); // 1 tài liệu gộp, không mở N cửa sổ
      load();
    } catch { tw('Phát thuốc thất bại'); }
  };

  /** #352: phát 1 đơn NGAY TẠI DÒNG rồi TỰ MỞ tem in (v1 pages/DispensingCounter.tsx:288-302).
   *  v2 trước đây: dòng chờ phát không có nút phát nào, phát xong dòng nhảy sang tab "Đã phát"
   *  nên dược sĩ phải đổi tab, tìm lại dòng rồi bấm in tay — bước dễ bị bỏ qua ở quầy đông,
   *  mà tem là nhãn hướng dẫn liều dùng dán lên thuốc giao cho bệnh nhân. */
  const dispenseAndPrint = async (r: DispenseRow) => {
    try {
      await apiClient.post(`/warehousecomplete/issues/dispense-outpatient/${r.prescriptionId}`);
      tk(`Đã phát đơn ${r.prescriptionCode}`);
      setPrintCount((c) => c + 1);
      printLabels(r); // in ngay, không để dược sĩ phải tự nhớ
      setSelected((prev) => { const n = new Set(prev); n.delete(r.prescriptionId); return n; });
      load();
    } catch { tw('Phát thuốc thất bại'); }
  };

  const handleCancel = async (id: string) => {
    // #13: route cũ /warehousecomplete/issues/{id}/cancel KHÔNG tồn tại → dùng nhánh chuẩn
    // /pharmacy/cancel-dispensed/{prescriptionId} (hoàn tồn kho + reset trạng thái đơn).
    try { await apiClient.post(`/pharmacy/cancel-dispensed/${id}`, { reason: 'Hủy phát tại quầy' }); tk('Đã hủy phát'); load(); }
    catch { tw('Hủy thất bại'); }
  };

  const handleBarcodeSearch = async () => {
    const code = barcodeVal.trim();
    if (!code) { tw('Nhập mã đơn hoặc quét barcode'); return; }
    setBarcodeLoading(true);
    try {
      // request wrapper (examination.ts dùng @/utils/request) trả { success, data } — chấp nhận cả 2 shape
      const res = (await searchPrescriptionByCode(code)) as unknown as DispensePrescriptionLookupDto & { data?: DispensePrescriptionLookupDto };
      const p: DispensePrescriptionLookupDto = res?.data ?? res;
      const row: DispenseRow = {
        prescriptionId: p.id,
        prescriptionCode: p.prescriptionCode,
        patientCode: p.patientCode ?? '',
        patientName: p.patientName ?? '',
        gender: p.gender,
        prescribedAt: p.prescribedAt || p.prescriptionDate,
        doctorName: p.doctorName,
        totalItems: p.items?.length ?? 0,
        totalAmount: p.totalAmount,
        insuranceType: p.insuranceType || 'Thu phí',
        isDispensed: p.isDispensed,
        items: (p.items ?? []).map((it) => ({ ...it, medicineName: it.medicineName ?? '' })),
      };
      setBarcodeOpen(false);
      setBarcodeVal('');
      setDetail(row);
      tk(`Tìm thấy đơn ${p.prescriptionCode}`);
    } catch {
      tw('Không tìm thấy đơn thuốc với mã này');
    } finally {
      setBarcodeLoading(false);
    }
  };

  /** #352: in tem cho 1 HOẶC NHIỀU đơn — batch gộp vào MỘT tài liệu thay vì mở N cửa sổ in. */
  const printLabels = (rowOrRows: DispenseRow | DispenseRow[]) => {
    // tên khác `rows` state ở ngoài để khỏi che biến
    const targets = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    if (targets.length === 0) return;
    const title = targets.length === 1 ? `Tem thuốc ${targets[0].patientCode}` : `Tem thuốc (${targets.length} đơn)`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<!-- #352: sửa CSS hỏng do sweep design-token — 'var(--space-10)'px không phải giá trị CSS hợp lệ
     nên trình duyệt bỏ qua, tem in ra mất padding/margin. Cửa sổ in là document RIÊNG,
     không có biến CSS của app → phải dùng px tuyệt đối như v1. -->
<style>body{font-family:Arial;margin:0;padding:10px}.label{border:1px solid #000;padding:8px 12px;margin-bottom:8px;width:260px}.label h3{margin:0 0 4px;font-size:13px}.label p{margin:2px 0;font-size:11px}.barcode{font-family:'Libre Barcode 128',monospace;font-size:32px;text-align:center}@media print{.no-print{display:none}}</style></head>
<body><div class="no-print" style="margin-bottom:12px"><button onclick="window.print()">In</button> <button onclick="window.close()">Đóng</button></div>
${targets.map((row) => row.items.map((it) => `<div class="label"><h3>${it.medicineName}</h3><p><strong>BN:</strong> ${row.patientName} (${row.patientCode})</p><p><strong>SL:</strong> ${it.quantity} ${it.unit || ''} × ${it.days || 1} ngày</p><p><strong>Cách dùng:</strong> ${it.dosage || '-'}</p><p class="barcode">*${row.prescriptionCode}*</p></div>`).join('')).join('')}
</body></html>`;
    openPrintWindow(html, { features: 'width=400,height=600' });
  };

  const cols: ColumnDef<DispenseRow>[] = [
    { key: 'code', label: 'Mã đơn', code: true, render: (r) => r.prescriptionCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
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
      {/* #352 P4: parity v1 — cảnh báo HSD thuốc khi vào quầy phát (safety-notice) */}
      <PharmacyExpiryBanner asModalOnFirstVisit sessionKey="pharmacy-module-expiry-shown" />
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
        <Btn variant="ghost" onClick={() => { setSearch(''); load(); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => { setBarcodeOpen(true); setTimeout(() => barcodeInputRef.current?.focus(), 100); }}>
          <Ico name="qr" size={12} /> Quét barcode
        </Btn>
        {stab === 'pending' && selected.size > 0 && (
          <Btn variant="primary" onClick={handleDispense}>
            <Ico name="check" size={12} /> Phát {selected.size} đơn
          </Btn>
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
            {/* #352: phát + in tem trong 1 thao tác cho dòng đang chờ */}
            {!r.isDispensed && (
              <ActBtn ic="check" title="Phát đơn + in tem" onClick={() => dispenseAndPrint(r)} />
            )}
            <ActBtn ic="print" title="In tem" onClick={() => printLabels(r)} />
            {r.isDispensed && (
              <ActBtn ic="refresh" title="Hủy phát" tone="warn" onClick={() => handleCancel(r.prescriptionId)} />
            )}
          </div>
        )}
        empty={loading ? 'Đang tải…' : (stab === 'pending' ? 'Không còn đơn chờ phát' : 'Chưa phát đơn nào')}
      />

      <Modal
        open={barcodeOpen}
        title="Quét / nhập mã đơn thuốc"
        onCancel={() => { setBarcodeOpen(false); setBarcodeVal(''); }}
        onOk={handleBarcodeSearch}
        okText="Tìm đơn"
        cancelText="Đóng"
        confirmLoading={barcodeLoading}
        destroyOnHidden
        width={400}
      >
        <p style={{ fontSize: 'var(--fs-md)', color: 'var(--t-2)', marginBottom: 'var(--space-12)' }}>
          Nhập mã đơn thuốc hoặc để máy quét barcode tự điền vào ô bên dưới.
        </p>
        <Input
          ref={barcodeInputRef}
          placeholder="VD: RX20240601001 hoặc ID đơn"
          value={barcodeVal}
          onChange={(e) => setBarcodeVal(e.target.value)}
          onPressEnter={handleBarcodeSearch}
          size="large"
          allowClear
        />
      </Modal>

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? `Đơn ${detail.prescriptionCode}` : ''}
        sub={detail ? `${detail.patientName} · ${detail.patientCode}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
          {detail && <>
            <Btn onClick={() => printLabels(detail)}>
              <Ico name="print" size={12} /> In tem
            </Btn>
            {!detail.isDispensed && (
              <Btn variant="primary" onClick={async () => {
                try {
                  await apiClient.post(`/warehousecomplete/issues/dispense-outpatient/${detail.prescriptionId}`);
                  tk('Đã phát'); setDetail(null); load();
                } catch { tw('Phát thất bại'); }
              }}>
                <Ico name="check" size={12} /> Phát đơn này
              </Btn>
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
