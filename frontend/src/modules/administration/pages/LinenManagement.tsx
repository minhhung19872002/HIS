import React, { useCallback, useState } from 'react';
import {
  KpiStrip, TopTabs, DataTable, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, useListData,
  type ColumnDef, type TopTab, type KpiItem, type StatusTone,
  tk, te, cf, fmtDTg
} from '@/_v2kit';
import {
  linen,
  type LinenItemDto, type LinenTransactionDto, type SterilizationScheduleDto
} from '../../../api/nangcap23';

type TabKey = 'items' | 'tx' | 'ster';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'items', l: 'Danh mục đồ vải', ic: 'box' },
  { v: 'tx',    l: 'Giao nhận giặt',  ic: 'refresh' },
  { v: 'ster',  l: 'Lịch tiệt trùng', ic: 'shield' },
];

const LINEN_CATEGORIES: Record<string, string> = {
  Bedding: 'Ga giường',
  Clothing: 'Quần áo BN',
  Towel: 'Khăn',
  Drape: 'Khăn trải',
  Surgical: 'Đồ phẫu thuật',
  OperatingRoom: 'Phòng mổ',
};
const LINEN_TX_TYPES: Record<string, string> = {
  Dispatch: 'Gửi đi giặt',
  Return: 'Nhận về',
  Adjust: 'Điều chỉnh',
  Discard: 'Loại bỏ',
};
const TX_STATUS_LABEL = ['Nháp', 'Đã gửi', 'Đã nhận về', 'Đã đối chiếu', 'Đã hủy'];
const STER_STATUS_LABEL = ['Đã lên lịch', 'Đang xử lý', 'Hoàn thành', 'Thất bại'];

const txTone = (s: number): StatusTone =>
  s === 3 ? 'ok' : s === 2 ? 'info' : s === 4 ? 'crit' : 'warn';
const sterTone = (s: number): StatusTone =>
  s === 2 ? 'ok' : s === 3 ? 'crit' : s === 1 ? 'warn' : 'info';

const LinenManagementV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('items');
  return (
    <div className="ab" data-testid="linen-management-page">
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'items' && <LinenItemsPanel />}
      {tab === 'tx'    && <LinenTxPanel />}
      {tab === 'ster'  && <LinenSterPanel />}
    </div>
  );
};

// ────────────────────────── Items ──────────────────────────

const LinenItemsPanel: React.FC = () => {
  const { rows: items, loading } = useListData<LinenItemDto>(
    useCallback(() => linen.listItems({}), []),
    useCallback(() => te('Không tải được'), []),
  );
  const [sel, setSel] = useState<LinenItemDto | null>(null);

  const kpis: KpiItem[] = [
    { lbl: 'Tổng danh mục', val: items.length },
    { lbl: 'Tồn dưới mức',  val: items.filter((i) => i.isLowStock).length, tone: 'crit' },
    { lbl: 'Đang giặt',     val: items.reduce((s, i) => s + i.inCleaning, 0), tone: 'warn' },
    { lbl: 'Hư hỏng',       val: items.reduce((s, i) => s + i.damaged, 0), tone: 'info' },
  ];

  const columns: ColumnDef<LinenItemDto>[] = [
    { key: 'itemCode', label: 'Mã', mono: true, code: true, width: 120 },
    { key: 'itemName', label: 'Tên đồ vải', render: (r) => <b>{r.itemName}</b> },
    { key: 'category', label: 'Loại', width: 140,
      render: (r) => LINEN_CATEGORIES[r.category] || r.category },
    { key: 'unit', label: 'Đơn vị', width: 80 },
    { key: 'currentStock', label: 'Tồn sạch', mono: true, width: 100,
      render: (r) => (
        <span style={{ color: r.isLowStock ? 'var(--s-crit)' : 'var(--t-1)', fontWeight: 600 }}>
          {r.currentStock}
        </span>
      ) },
    { key: 'inCleaning', label: 'Đang giặt', mono: true, width: 100 },
    { key: 'inRepair',   label: 'Đang sửa', mono: true, width: 100 },
    { key: 'damaged',    label: 'Hư hỏng', mono: true, width: 100 },
    { key: 'isActive',   label: 'TT', width: 110,
      render: (r) => r.isActive
        ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
        : <StatusBadge tone="warn" dot>Ngừng</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<LinenItemDto> rowKey={(r) => r.id} data={items} columns={columns} onRowClick={setSel} loading={loading} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Đồ vải · ${sel.itemName}` : ''}
        sub={sel ? sel.itemCode : ''}
      >
        {sel && <>
          <DrSec title="Thông tin">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.itemCode}</span></DrField>
            <DrField lbl="Tên">{sel.itemName}</DrField>
            <DrField lbl="Loại">{LINEN_CATEGORIES[sel.category] || sel.category}</DrField>
            <DrField lbl="Đơn vị">{sel.unit}</DrField>
            <DrField lbl="Trạng thái">
              {sel.isActive
                ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
                : <StatusBadge tone="warn" dot>Ngừng</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title="Tồn kho">
            <DrField lbl="Tồn sạch">
              <span style={{ fontFamily: 'var(--font-mono)', color: sel.isLowStock ? 'var(--s-crit)' : 'var(--t-0)', fontWeight: 600 }}>{sel.currentStock}</span>
              {sel.isLowStock && <StatusBadge tone="crit"> Dưới mức</StatusBadge>}
            </DrField>
            <DrField lbl="Đang giặt"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.inCleaning}</span></DrField>
            <DrField lbl="Đang sửa"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.inRepair}</span></DrField>
            <DrField lbl="Hư hỏng"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.damaged}</span></DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Transactions ──────────────────────────

const LinenTxPanel: React.FC = () => {
  const { rows, loading, reload } = useListData<LinenTransactionDto>(
    useCallback(() => linen.searchTransactions({ pageSize: 200 }), []),
    useCallback(() => te('Không tải được'), []),
  );
  const [sel, setSel] = useState<LinenTransactionDto | null>(null);
  // #467: guard double-submit THEO TỪNG DÒNG — khoá toàn panel sẽ nuốt im lặng cú click
  // ở dòng khác (nút dòng đó vẫn sáng nhưng bấm không có gì xảy ra).
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const advance = async (r: LinenTransactionDto, ns: number) => {
    if (busy.has(r.id)) return;
    setBusy((prev) => new Set(prev).add(r.id));
    try { await linen.updateTransactionStatus(r.id, ns); tk('Đã cập nhật trạng thái giao dịch'); reload(); }
    catch { te('Cập nhật thất bại'); }
    finally { setBusy((prev) => { const n = new Set(prev); n.delete(r.id); return n; }); }
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng giao dịch',  val: rows.length },
    { lbl: 'Đang ở nhà giặt', val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
    { lbl: 'Đã nhận về',      val: rows.filter((r) => r.status === 2).length, tone: 'info' },
    { lbl: 'Đã đối chiếu',    val: rows.filter((r) => r.status === 3).length, tone: 'ok' },
  ];

  const columns: ColumnDef<LinenTransactionDto>[] = [
    { key: 'transactionCode', label: 'Mã giao dịch', mono: true, code: true, width: 200 },
    { key: 'transactionType', label: 'Loại', width: 110,
      render: (r) => LINEN_TX_TYPES[r.transactionType] || r.transactionType },
    { key: 'transactionDate', label: 'Ngày', mono: true, width: 140,
      render: (r) => fmtDTg(r.transactionDate) },
    { key: 'from', label: 'Từ', render: (r) => r.fromDepartmentName || '—' },
    { key: 'to',   label: 'Đến',
      render: (r) => r.toDepartmentName || r.vendorName || '—' },
    { key: 'items', label: 'SL / Trọng lượng', mono: true, width: 160,
      render: (r) => `${r.totalItems} mục · ${r.totalWeightKg}kg` },
    { key: 'status', label: 'TT', width: 130,
      render: (r) => <StatusBadge tone={txTone(r.status)} dot>{r.statusName || TX_STATUS_LABEL[r.status]}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<LinenTransactionDto>
        rowKey={(r) => r.id} data={rows} columns={columns} onRowClick={setSel} loading={loading}
        actions={(r) => (
          <>
            {r.status === 0 && <ActBtn ic="external" title="Đánh dấu đã gửi" loading={busy.has(r.id)} onClick={() => advance(r, 1)} />}
            {r.status === 1 && <ActBtn ic="check"    title="Nhận về"         loading={busy.has(r.id)} onClick={() => advance(r, 2)} />}
            {r.status === 2 && <ActBtn ic="check"    title="Đối chiếu xong"  loading={busy.has(r.id)} onClick={() => advance(r, 3)} />}
            {r.status !== 4 && r.status !== 3 && (
              <ActBtn ic="x" title="Hủy" tone="crit" loading={busy.has(r.id)}
                onClick={() => cf(`Hủy giao dịch đồ vải ${r.transactionCode}? Thao tác không thể hoàn tác.`,
                  () => { void advance(r, 4); }, { tone: 'crit', confirm: 'Xác nhận hủy' })} />
            )}
          </>
        )}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Giao dịch · ${sel.transactionCode}` : ''}
        sub={sel ? (LINEN_TX_TYPES[sel.transactionType] || sel.transactionType) : ''}
      >
        {sel && <>
          <DrSec title="Giao dịch">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.transactionCode}</span></DrField>
            <DrField lbl="Loại">{LINEN_TX_TYPES[sel.transactionType] || sel.transactionType}</DrField>
            <DrField lbl="Ngày"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtDTg(sel.transactionDate)}</span></DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={txTone(sel.status)} dot>{sel.statusName || TX_STATUS_LABEL[sel.status]}</StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Điều chuyển">
            <DrField lbl="Từ">{sel.fromDepartmentName || '—'}</DrField>
            <DrField lbl="Đến">{sel.toDepartmentName || sel.vendorName || '—'}</DrField>
            <DrField lbl="Số lượng"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.totalItems} mục</span></DrField>
            <DrField lbl="Trọng lượng"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.totalWeightKg} kg</span></DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Sterilization ──────────────────────────

const LinenSterPanel: React.FC = () => {
  const { rows, loading, reload } = useListData<SterilizationScheduleDto>(
    useCallback(() => linen.searchSchedules({}), []),
    useCallback(() => te('Không tải được'), []),
  );
  const [sel, setSel] = useState<SterilizationScheduleDto | null>(null);
  // #467: guard double-submit theo từng dòng (xem ghi chú ở LinenTxPanel).
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const advance = async (r: SterilizationScheduleDto, ns: number, cult?: string) => {
    if (busy.has(r.id)) return;
    setBusy((prev) => new Set(prev).add(r.id));
    try { await linen.updateScheduleStatus(r.id, ns, cult); tk('Đã cập nhật'); reload(); }
    catch { te('Cập nhật thất bại'); }
    finally { setBusy((prev) => { const n = new Set(prev); n.delete(r.id); return n; }); }
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng lịch',   val: rows.length },
    { lbl: 'Đã lên lịch', val: rows.filter((r) => r.status === 0).length, tone: 'info' },
    { lbl: 'Đang xử lý',  val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
    { lbl: 'Hoàn thành',  val: rows.filter((r) => r.status === 2).length, tone: 'ok' },
  ];

  const columns: ColumnDef<SterilizationScheduleDto>[] = [
    { key: 'scheduleCode', label: 'Mã lịch', mono: true, code: true, width: 200 },
    { key: 'scheduledAt',  label: 'Lúc', mono: true, width: 140,
      render: (r) => fmtDTg(r.scheduledAt) },
    { key: 'area', label: 'Khu vực',
      render: (r) => `${r.areaType} · ${r.roomName || '—'}` },
    { key: 'sterilizationMethod', label: 'Phương pháp', width: 160 },
    { key: 'assignedStaff', label: 'Nhân viên', width: 160 },
    { key: 'cultureResult', label: 'Cấy KQ', width: 100,
      render: (r) => r.cultureResult === 'Pass'
        ? <StatusBadge tone="ok" dot>Pass</StatusBadge>
        : r.cultureResult === 'Fail'
          ? <StatusBadge tone="crit" dot>Fail</StatusBadge>
          : '—' },
    { key: 'status', label: 'TT', width: 130,
      render: (r) => <StatusBadge tone={sterTone(r.status)} dot>{r.statusName || STER_STATUS_LABEL[r.status]}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<SterilizationScheduleDto>
        rowKey={(r) => r.id} data={rows} columns={columns} onRowClick={setSel} loading={loading}
        actions={(r) => (
          <>
            {r.status === 0 && <ActBtn ic="external" title="Bắt đầu" loading={busy.has(r.id)} onClick={() => advance(r, 1)} />}
            {r.status === 1 && <ActBtn ic="check" title="Hoàn thành (Pass)" loading={busy.has(r.id)} onClick={() => advance(r, 2, 'Pass')} />}
            {r.status === 1 && <ActBtn ic="x" title="Thất bại" tone="crit" loading={busy.has(r.id)} onClick={() => advance(r, 3, 'Fail')} />}
          </>
        )}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Lịch tiệt trùng · ${sel.scheduleCode}` : ''}
        sub={sel ? `${sel.areaType} · ${sel.roomName || '—'}` : ''}
      >
        {sel && <>
          <DrSec title="Lịch">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.scheduleCode}</span></DrField>
            <DrField lbl="Thời gian"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtDTg(sel.scheduledAt)}</span></DrField>
            <DrField lbl="Khu vực">{sel.areaType} · {sel.roomName || '—'}</DrField>
            <DrField lbl="Phương pháp">{sel.sterilizationMethod}</DrField>
            <DrField lbl="Nhân viên">{sel.assignedStaff || '—'}</DrField>
            <DrField lbl="Thời lượng"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.durationMinutes} phút</span></DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={sterTone(sel.status)} dot>{sel.statusName || STER_STATUS_LABEL[sel.status]}</StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Kết quả cấy">
            <DrField lbl="Mã mẫu cấy"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.cultureSampleCode || '—'}</span></DrField>
            <DrField lbl="Kết quả">
              {sel.cultureResult === 'Pass'
                ? <StatusBadge tone="ok" dot>Pass</StatusBadge>
                : sel.cultureResult === 'Fail'
                  ? <StatusBadge tone="crit" dot>Fail</StatusBadge>
                  : '—'}
            </DrField>
            <DrField lbl="Ghi chú">{sel.notes || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </>
  );
};

export default LinenManagementV2;
