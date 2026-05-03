import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { getEquipment } from '../api/equipment';
import type { EquipmentDto } from '../api/equipment';
import { SimpleV2Page, StatusBadge, ActBtn, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* Trang thiết bị y tế v2 */

type StatusKey = 'operational' | 'maintenance' | 'broken' | 'decommissioned';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'operational',    l: 'Hoạt động',    tone: 'ok' },
  { v: 'maintenance',    l: 'Bảo trì',      tone: 'warn' },
  { v: 'broken',         l: 'Hỏng',         tone: 'crit' },
  { v: 'decommissioned', l: 'Thanh lý',     tone: 'info' },
];
const statusKey = (s: number): StatusKey =>
  s === 2 ? 'maintenance' : s === 3 ? 'broken' : s === 4 ? 'decommissioned' : 'operational';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtVND = (n?: number) => n != null ? `${n.toLocaleString('vi-VN')} ₫` : '—';

const EquipmentV2: React.FC = () => {
  const { message } = AntdApp.useApp();

  const columns: ColumnDef<EquipmentDto>[] = [
    { key: 'code', label: 'Mã TB', mono: true, width: 130, render: (r) => r.equipmentCode },
    {
      key: 'name', label: 'Tên / Hãng',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.name}</b>
          <i>{r.manufacturer} · {r.model}</i>
        </div>
      ),
    },
    { key: 'cat', label: 'Loại', width: 140, render: (r) => r.categoryName || r.category },
    { key: 'serial', label: 'Serial', mono: true, width: 130, render: (r) => r.serialNumber },
    {
      key: 'risk', label: 'Risk', width: 80,
      render: (r) => <span className={`chip ${r.riskClass === 'III' ? 'crit' : r.riskClass === 'II' ? 'warn' : 'info'}`}>{r.riskClass}</span>,
    },
    {
      key: 'dept', label: 'Khoa · Phòng',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.departmentName}</b>
          <i>{r.roomName || r.locationName || '—'}</i>
        </div>
      ),
    },
    {
      key: 'maint', label: 'Bảo trì kế tiếp', mono: true, width: 130,
      render: (r) => {
        if (!r.nextMaintenanceDate) return '—';
        const days = dayjs(r.nextMaintenanceDate).diff(dayjs(), 'day');
        const color = days < 0 ? 'var(--s-crit)' : days < 30 ? 'var(--s-warn)' : 'var(--t-1)';
        return <span style={{ color }}>{fmtDMY(r.nextMaintenanceDate)}</span>;
      },
    },
    {
      key: 'warranty', label: 'Bảo hành', mono: true, width: 110,
      render: (r) => {
        if (!r.warrantyExpiry) return '—';
        const days = dayjs(r.warrantyExpiry).diff(dayjs(), 'day');
        return days < 0
          ? <span className="chip crit">Hết</span>
          : days < 90
            ? <span className="chip warn">{fmtDMY(r.warrantyExpiry)}</span>
            : <span style={{ color: 'var(--t-1)' }}>{fmtDMY(r.warrantyExpiry)}</span>;
      },
    },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.operationalStatus);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{r.operationalStatusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<EquipmentDto>
      title="Trang thiết bị y tế"
      load={async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await getEquipment({ page: 1, pageSize: 200 } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((r as any)?.data?.items || []) as EquipmentDto[];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm mã TB / tên / model / serial…"
      searchOf={(r) => `${r.equipmentCode} ${r.name} ${r.model} ${r.serialNumber} ${r.manufacturer}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.operationalStatus)}
      filters={[{
        key: 'risk', placeholder: '▾ Risk class',
        options: [{ v: 'I', l: 'Class I' }, { v: 'II', l: 'Class II' }, { v: 'III', l: 'Class III' }],
        valueOf: (r) => r.riskClass,
      }]}
      kpis={(rows) => {
        const today = dayjs();
        const operational = rows.filter((r) => r.operationalStatus === 1).length;
        const maint = rows.filter((r) => r.operationalStatus === 2).length;
        const broken = rows.filter((r) => r.operationalStatus === 3).length;
        const overdueMaint = rows.filter((r) => r.nextMaintenanceDate && dayjs(r.nextMaintenanceDate).isBefore(today, 'day')).length;
        const expiringWarranty = rows.filter((r) => r.warrantyExpiry && dayjs(r.warrantyExpiry).diff(today, 'day') < 90 && dayjs(r.warrantyExpiry).diff(today, 'day') >= 0).length;
        const expiredWarranty = rows.filter((r) => r.warrantyExpiry && dayjs(r.warrantyExpiry).isBefore(today, 'day')).length;
        return [
          { lbl: 'Tổng TB', val: rows.length },
          { lbl: 'Hoạt động', val: operational, sub: rows.length > 0 ? `${Math.round(operational / rows.length * 100)}%` : '—', tone: 'ok' },
          { lbl: 'Bảo trì', val: maint, tone: 'warn' },
          { lbl: 'Hỏng', val: broken, tone: 'crit' },
          { lbl: 'Quá hạn BT', val: overdueMaint, tone: 'crit' },
          { lbl: 'Hết BH', val: expiredWarranty, sub: `+${expiringWarranty} sắp hết`, tone: 'warn' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          <ActBtn ic="eye" title="Chi tiết" onClick={() => message.info(`Chi tiết ${r.equipmentCode}`)} />
          <ActBtn ic="check" title="Lên lịch bảo trì" onClick={() => message.success('Đã lên lịch BT')} />
        </div>
      )}
      drawer={(r) => <EquipmentDrawerBody r={r} />}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.equipmentCode}</span>
          <span style={{ fontSize: 14 }}>{r.name}</span>
        </span>
      )}
      drawerSub={(r) => `${r.manufacturer} · ${r.model} · ${r.departmentName}`}
    />
  );
};

const EquipmentDrawerBody: React.FC<{ r: EquipmentDto }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="activity" size={11} /> THIẾT BỊ</h5>
      <div className="rec-kv">
        <span>Mã TB</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.equipmentCode}</span>
        <span>Tên</span><b>{r.name}</b>
        {r.nameEnglish && (<><span>Tên EN</span><span>{r.nameEnglish}</span></>)}
        <span>Loại</span><span>{r.categoryName || r.category}</span>
        <span>Hãng / Model</span><b>{r.manufacturer} · {r.model}</b>
        <span>Serial</span><span className="mono">{r.serialNumber}</span>
        {r.assetNumber && (<><span>Mã tài sản</span><span className="mono">{r.assetNumber}</span></>)}
        <span>Risk class</span>
        <span><span className={`chip ${r.riskClass === 'III' ? 'crit' : r.riskClass === 'II' ? 'warn' : 'info'}`}>{r.riskClassName || r.riskClass}</span></span>
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="user" size={11} /> VỊ TRÍ</h5>
      <div className="rec-kv">
        <span>Khoa</span><b>{r.departmentName}</b>
        {r.roomName && (<><span>Phòng</span><span>{r.roomName}</span></>)}
        {r.locationName && (<><span>Vị trí</span><span>{r.locationName}</span></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="dollar" size={11} /> MUA SẮM</h5>
      <div className="rec-kv">
        <span>Ngày mua</span><span>{fmtDMY(r.purchaseDate)}</span>
        <span>Giá mua</span><b className="mono">{fmtVND(r.purchasePrice)}</b>
        {r.supplier && (<><span>Nhà cung cấp</span><span>{r.supplier}</span></>)}
        {r.purchaseOrderNumber && (<><span>Số PO</span><span className="mono">{r.purchaseOrderNumber}</span></>)}
        {r.expectedLifeYears && (<><span>Tuổi thọ dự kiến</span><span>{r.expectedLifeYears} năm</span></>)}
        {r.currentValue != null && (<><span>Giá trị hiện tại</span><b className="mono">{fmtVND(r.currentValue)}</b></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="check" size={11} /> BẢO HÀNH & BẢO TRÌ</h5>
      <div className="rec-kv">
        <span>Hết bảo hành</span><span>{fmtDMY(r.warrantyExpiry)}</span>
        <span>BT lần cuối</span><span>{fmtDMY(r.lastMaintenanceDate)}</span>
        <span>BT kế tiếp</span>
        <b style={{ color: r.nextMaintenanceDate && dayjs(r.nextMaintenanceDate).isBefore(dayjs(), 'day') ? 'var(--s-crit)' : 'var(--t-0)' }}>{fmtDMY(r.nextMaintenanceDate)}</b>
        {r.lastCalibrationDate && (<><span>Hiệu chuẩn lần cuối</span><span>{fmtDMY(r.lastCalibrationDate)}</span></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="info" size={11} /> CHỨNG NHẬN</h5>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {r.fdaClearance && <span className="chip ok">FDA: {r.fdaClearance}</span>}
        {r.ceMarking && <span className="chip ok">CE Marking</span>}
        {!r.fdaClearance && !r.ceMarking && <span style={{ color: 'var(--t-3)' }}>Chưa có chứng nhận</span>}
      </div>
    </div>
  </>
);

export default EquipmentV2;
