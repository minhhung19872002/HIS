import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, Filter, StatusBadge,
  DrawerShell, ActBtn,
  type ColumnDef, type TopTab, tk, te
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  linen,
  type LinenItemDto, type LinenTransactionDto, type SterilizationScheduleDto
} from '../api/nangcap23';

type TabKey = 'items' | 'tx' | 'ster';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'items', l: 'Danh mục đồ vải', ic: 'box' },
  { v: 'tx',    l: 'Giao nhận giặt',  ic: 'truck' },
  { v: 'ster',  l: 'Lịch tiệt trùng', ic: 'shield' },
];

const fmtDT = (s?: string) => s ? dayjs(s).format('DD/MM/YYYY HH:mm') : '—';

const LinenManagementV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('items');
  return (
    <div className="ab-stack" data-testid="linen-management-page">
      <TopTabs tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'items' && <ItemsPanel />}
      {tab === 'tx' && <TxPanel />}
      {tab === 'ster' && <SterPanel />}
    </div>
  );
};

const ItemsPanel: React.FC = () => {
  const [rows, setRows] = useState<LinenItemDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');

  const load = useCallback(async () => {
    try { setRows(await linen.listItems({ keyword: keyword.trim() || undefined, category: category || undefined })); }
    catch { te('Không tải được'); }
  }, [keyword, category]);
  useEffect(() => { load(); }, [load]);

  const columns: ColumnDef<LinenItemDto>[] = [
    { key: 'code', label: 'Mã', mono: true, width: 120, render: r => r.itemCode },
    { key: 'name', label: 'Tên đồ vải', render: r => r.itemName },
    { key: 'cat', label: 'Loại', width: 140, render: r => r.category },
    { key: 'unit', label: 'Đơn vị', width: 80, render: r => r.unit || '—' },
    { key: 'stock', label: 'Tồn sạch', mono: true, width: 90, render: r => <span style={{ color: r.isLowStock ? 'var(--s-crit)' : 'var(--t-1)' }}>{r.currentStock}</span> },
    { key: 'clean', label: 'Đang giặt', mono: true, width: 90, render: r => r.inCleaning },
    { key: 'repair', label: 'Đang sửa', mono: true, width: 90, render: r => r.inRepair },
    { key: 'damaged', label: 'Hư hỏng', mono: true, width: 90, render: r => r.damaged },
    { key: 'active', label: 'TT', width: 80, render: r => r.isActive ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge> : <StatusBadge tone="warn" dot>Ngừng</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng danh mục', val: rows.length },
        { lbl: 'Tồn dưới mức', val: rows.filter(r => r.isLowStock).length, tone: 'crit' },
        { lbl: 'Đang giặt', val: rows.reduce((s, r) => s + r.inCleaning, 0), tone: 'warn' },
        { lbl: 'Hư hỏng', val: rows.reduce((s, r) => s + r.damaged, 0), tone: 'info' },
      ]} />
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm mã / tên đồ vải…" minWidth={320} />
        <Filter value={category} onChange={setCategory} placeholder="— Loại —" options={[
          { v: 'Bedding', l: 'Ga giường' },
          { v: 'Clothing', l: 'Quần áo' },
          { v: 'Towel', l: 'Khăn' },
          { v: 'Drape', l: 'Khăn trải' },
          { v: 'Surgical', l: 'Đồ phẫu thuật' },
          { v: 'OperatingRoom', l: 'Phòng mổ' },
        ]} />
        <button type="button" className="ab-btn" onClick={load}><TermIcon name="rotate-cw" size={12}/> Tải lại</button>
      </div>
      <DataTable<LinenItemDto> data={rows} rowKey={r => r.id} columns={columns} />
    </>
  );
};

const TxPanel: React.FC = () => {
  const [rows, setRows] = useState<LinenTransactionDto[]>([]);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<LinenTransactionDto | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await linen.searchTransactions({
        transactionType: type || undefined,
        status: status !== '' ? Number(status) : undefined,
        pageSize: 100
      }));
    } catch { te('Không tải được'); }
  }, [type, status]);
  useEffect(() => { load(); }, [load]);

  const advance = async (r: LinenTransactionDto, newStatus: number) => {
    try { await linen.updateTransactionStatus(r.id, newStatus); tk('Đã cập nhật'); load(); }
    catch { te('Cập nhật thất bại'); }
  };

  const toneOfStatus = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
    s === 3 ? 'ok' : s === 2 ? 'info' : s === 4 ? 'crit' : 'warn';

  const columns: ColumnDef<LinenTransactionDto>[] = [
    { key: 'code', label: 'Mã giao dịch', mono: true, width: 200, render: r => r.transactionCode },
    { key: 'type', label: 'Loại', width: 110, render: r => {
      const m: Record<string, string> = { Dispatch: 'Gửi đi giặt', Return: 'Nhận về', Adjust: 'Điều chỉnh', Discard: 'Loại bỏ' };
      return m[r.transactionType] || r.transactionType;
    }},
    { key: 'date', label: 'Ngày', mono: true, width: 140, render: r => fmtDT(r.transactionDate) },
    { key: 'from', label: 'Từ', width: 160, render: r => r.fromDepartmentName || r.vendorName || '—' },
    { key: 'to', label: 'Đến', width: 160, render: r => r.toDepartmentName || r.vendorName || '—' },
    { key: 'items', label: 'SL/Trọng lượng', mono: true, width: 130, render: r => `${r.totalItems} / ${r.totalWeightKg}kg` },
    { key: 'st', label: 'TT', width: 140, render: r => <StatusBadge tone={toneOfStatus(r.status)} dot>{r.statusName}</StatusBadge> },
  ];

  const actions = (r: LinenTransactionDto) => (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {r.status === 0 && <ActBtn ic="send" title="Đánh dấu đã gửi" onClick={() => advance(r, 1)} />}
      {r.status === 1 && <ActBtn ic="check" title="Nhận về" onClick={() => advance(r, 2)} />}
      {r.status === 2 && <ActBtn ic="check-circle" title="Đối chiếu xong" onClick={() => advance(r, 3)} />}
      {r.status !== 4 && <ActBtn ic="x" title="Hủy" tone="crit" onClick={() => advance(r, 4)} />}
    </span>
  );

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng', val: rows.length },
        { lbl: 'Đang ở nhà giặt', val: rows.filter(r => r.status === 1).length, tone: 'warn' },
        { lbl: 'Đã nhận về', val: rows.filter(r => r.status === 2).length, tone: 'info' },
        { lbl: 'Đã đối chiếu', val: rows.filter(r => r.status === 3).length, tone: 'ok' },
      ]} />
      <div className="ab-toolbar">
        <Filter value={type} onChange={setType} placeholder="— Loại —" options={[
          { v: 'Dispatch', l: 'Gửi đi giặt' }, { v: 'Return', l: 'Nhận về' }, { v: 'Adjust', l: 'Điều chỉnh' }, { v: 'Discard', l: 'Loại bỏ' }
        ]} />
        <Filter value={status} onChange={setStatus} placeholder="— Trạng thái —" options={[
          { v: '0', l: 'Nháp' }, { v: '1', l: 'Đã gửi' }, { v: '2', l: 'Đã nhận về' }, { v: '3', l: 'Đã đối chiếu' }, { v: '4', l: 'Đã hủy' }
        ]} />
        <button type="button" className="ab-btn" onClick={load}><TermIcon name="rotate-cw" size={12}/> Tải lại</button>
      </div>
      <DataTable<LinenTransactionDto> data={rows} rowKey={r => r.id} columns={columns} actions={actions} onRowClick={setDetail} />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={`Giao dịch ${detail?.transactionCode || ''}`}>
        {detail && (
          <div style={{ padding: 16 }}>
            <p><b>Trạng thái:</b> {detail.statusName}</p>
            <p><b>Từ:</b> {detail.fromDepartmentName || '—'}</p>
            <p><b>Đến:</b> {detail.toDepartmentName || detail.vendorName || '—'}</p>
            <p><b>Người gửi:</b> {detail.dispatcherName || '—'}</p>
            <p><b>Người nhận:</b> {detail.receiverName || '—'}</p>
            <p><b>Số mục / Trọng lượng:</b> {detail.totalItems} / {detail.totalWeightKg}kg</p>
            <p><b>Ghi chú:</b> {detail.notes || '—'}</p>
            <pre style={{ fontSize: 11, padding: 8, background: 'var(--bg-1)', maxHeight: 200, overflow: 'auto' }}>
              {(() => { try { return JSON.stringify(JSON.parse(detail.detailsJson || '[]'), null, 2); } catch { return detail.detailsJson; } })()}
            </pre>
          </div>
        )}
      </DrawerShell>
    </>
  );
};

const SterPanel: React.FC = () => {
  const [rows, setRows] = useState<SterilizationScheduleDto[]>([]);
  const [areaType, setAreaType] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    try {
      setRows(await linen.searchSchedules({
        areaType: areaType || undefined,
        status: status !== '' ? Number(status) : undefined
      }));
    } catch { te('Không tải được'); }
  }, [areaType, status]);
  useEffect(() => { load(); }, [load]);

  const advance = async (r: SterilizationScheduleDto, newStatus: number, cult?: string) => {
    try { await linen.updateScheduleStatus(r.id, newStatus, cult); tk('Đã cập nhật'); load(); }
    catch { te('Cập nhật thất bại'); }
  };

  const toneOfStatus = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
    s === 2 ? 'ok' : s === 1 ? 'warn' : s === 3 ? 'crit' : s === 4 ? 'info' : 'info';

  const columns: ColumnDef<SterilizationScheduleDto>[] = [
    { key: 'code', label: 'Mã lịch', mono: true, width: 200, render: r => r.scheduleCode },
    { key: 'date', label: 'Lúc', mono: true, width: 140, render: r => fmtDT(r.scheduledAt) },
    { key: 'area', label: 'Khu vực', render: r => `${r.areaType} ${r.roomName ? '· ' + r.roomName : ''}` },
    { key: 'method', label: 'PP', width: 140, render: r => r.sterilizationMethod },
    { key: 'staff', label: 'Nhân viên', width: 160, render: r => r.assignedStaff || '—' },
    { key: 'culture', label: 'Cấy KQ', width: 100, render: r => r.cultureResult || '—' },
    { key: 'st', label: 'TT', width: 140, render: r => <StatusBadge tone={toneOfStatus(r.status)} dot>{r.statusName}</StatusBadge> },
  ];

  const actions = (r: SterilizationScheduleDto) => (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {r.status === 0 && <ActBtn ic="play" title="Bắt đầu" onClick={() => advance(r, 1)} />}
      {r.status === 1 && <ActBtn ic="check" title="Hoàn thành" onClick={() => advance(r, 2, 'Pass')} />}
      {r.status === 1 && <ActBtn ic="x" title="Thất bại" tone="crit" onClick={() => advance(r, 3, 'Fail')} />}
    </span>
  );

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng lịch', val: rows.length },
        { lbl: 'Đã lên lịch', val: rows.filter(r => r.status === 0).length, tone: 'info' },
        { lbl: 'Đang xử lý', val: rows.filter(r => r.status === 1).length, tone: 'warn' },
        { lbl: 'Hoàn thành', val: rows.filter(r => r.status === 2).length, tone: 'ok' },
      ]} />
      <div className="ab-toolbar">
        <Filter value={areaType} onChange={setAreaType} placeholder="— Khu vực —" options={[
          { v: 'OperatingRoom', l: 'Phòng mổ' }, { v: 'ICU', l: 'ICU' }, { v: 'Ward', l: 'Phòng bệnh' },
          { v: 'Pharmacy', l: 'Khoa dược' }, { v: 'Other', l: 'Khác' }
        ]} />
        <Filter value={status} onChange={setStatus} placeholder="— Trạng thái —" options={[
          { v: '0', l: 'Đã lên lịch' }, { v: '1', l: 'Đang xử lý' }, { v: '2', l: 'Hoàn thành' }, { v: '3', l: 'Thất bại' }
        ]} />
        <button type="button" className="ab-btn" onClick={load}><TermIcon name="rotate-cw" size={12}/> Tải lại</button>
      </div>
      <DataTable<SterilizationScheduleDto> data={rows} rowKey={r => r.id} columns={columns} actions={actions} />
    </>
  );
};

export default LinenManagementV2;
