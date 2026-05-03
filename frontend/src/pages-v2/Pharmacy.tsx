import React, { useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as pharmacyApi from '../api/pharmacy';
import type { PendingPrescription } from '../api/pharmacy';
import { SimpleV2Page, StatusBadge, ActBtn, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* Nhà thuốc v2 — port of Pharmacy v2.html (RX dispensing tab) */

type StatusKey = 'pending' | 'accepted' | 'dispensing' | 'completed' | 'rejected';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',    l: 'Chờ duyệt',    tone: 'warn' },
  { v: 'accepted',   l: 'DS đã nhận',   tone: 'info' },
  { v: 'dispensing', l: 'Đang cấp',     tone: 'warn' },
  { v: 'completed',  l: 'Đã cấp',       tone: 'ok' },
  { v: 'rejected',   l: 'Hoàn',         tone: 'crit' },
];
const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';
const fmtVND = (n: number) => `${(n || 0).toLocaleString('vi-VN')} ₫`;

const PharmacyV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const [reloadVer, setReloadVer] = useState(0);

  const onAccept = async (r: PendingPrescription, reload: () => void) => {
    try {
      await pharmacyApi.acceptPrescription(r.id);
      message.success(`DS đã nhận · ${r.prescriptionCode}`);
      reload();
    } catch {
      message.error('Nhận thất bại');
    }
  };

  const onComplete = async (r: PendingPrescription, reload: () => void) => {
    modal.confirm({
      title: 'Cấp phát đơn thuốc?',
      content: `${r.itemsCount} thuốc · ${fmtVND(r.totalAmount)}`,
      okText: 'Cấp phát', cancelText: 'Hủy',
      onOk: async () => {
        try {
          await pharmacyApi.completeDispensing(r.id);
          message.success('Đã cấp phát');
          reload();
        } catch {
          message.error('Cấp phát thất bại');
        }
      },
    });
  };

  const onReject = async (r: PendingPrescription, reload: () => void) => {
    try {
      await pharmacyApi.rejectPrescription(r.id, 'Hoàn từ giao diện cấp phát');
      message.warning(`Đã hoàn · ${r.prescriptionCode}`);
      reload();
    } catch {
      message.error('Hoàn thất bại');
    }
  };

  const columns: ColumnDef<PendingPrescription>[] = [
    {
      key: 'code', label: 'Mã đơn', mono: true, width: 150,
      render: (r) => (
        <span>
          {r.prescriptionCode}
          {r.priority === 'urgent' && (
            <span style={{
              marginLeft: 6, padding: '1px 5px',
              background: 'var(--s-crit-bg, #fee2e2)', color: 'var(--s-crit, #b91c1c)',
              border: '1px solid #fca5a5', borderRadius: 3,
              fontSize: 9, fontWeight: 700,
            }}>STAT</span>
          )}
        </span>
      ),
    },
    { key: 'time', label: 'Giờ', mono: true, width: 80, render: (r) => fmtHM(r.createdDate) },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}</i>
        </div>
      ),
    },
    {
      key: 'doctor', label: 'BS / Khoa',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.doctorName}</b>
          <i>{r.department}</i>
        </div>
      ),
    },
    { key: 'items', label: 'Thuốc', mono: true, width: 90, render: (r) => `${r.itemsCount} loại` },
    { key: 'total', label: 'Tổng tiền', mono: true, width: 130, render: (r) => fmtVND(r.totalAmount) },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const tab = STATUS_TABS.find((t) => t.v === r.status);
        return <StatusBadge tone={tab?.tone} dot>{tab?.l || r.status}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<PendingPrescription>
      key={reloadVer}
      title="Đơn cần cấp phát"
      load={async () => {
        const r = await pharmacyApi.getPendingPrescriptions();
        return Array.isArray(r.data) ? r.data : [];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã đơn / bác sĩ…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.prescriptionCode} ${r.doctorName}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => r.status}
      pageSize={18}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.createdDate).isSame(today, 'day')).length;
        const pending = rows.filter((r) => r.status === 'pending').length;
        const completed = rows.filter((r) => r.status === 'completed').length;
        const urgent = rows.filter((r) => r.priority === 'urgent').length;
        const revenue = rows.filter((r) => r.status === 'completed').reduce((s, r) => s + (r.totalAmount || 0), 0);
        return [
          { lbl: 'Đơn hôm nay', val: todayCount, sub: 'cần cấp', tone: 'info' },
          { lbl: 'Chờ duyệt', val: pending, sub: 'DS xử lý', tone: 'warn' },
          { lbl: 'Đã cấp', val: completed, sub: rows.length > 0 ? `${Math.round(completed / rows.length * 100)}%` : '—', tone: 'ok' },
          { lbl: 'STAT', val: urgent, sub: 'ưu tiên', tone: 'crit' },
          { lbl: 'Doanh thu', val: Math.round(revenue / 1_000_000), unit: 'tr', sub: 'VND' },
          { lbl: 'Tổng đơn', val: rows.length },
        ];
      }}
      rowActions={(r, reload) => (
        <div className="ab-actions">
          {r.status === 'pending' && <ActBtn ic="check" title="DS duyệt" onClick={() => onAccept(r, reload)} />}
          {(r.status === 'accepted' || r.status === 'dispensing') && (
            <ActBtn ic="check" title="Cấp phát" onClick={() => onComplete(r, reload)} />
          )}
          <ActBtn ic="print" title="In nhãn" onClick={() => message.success('Đã in nhãn thuốc')} />
          {r.status !== 'completed' && r.status !== 'rejected' && (
            <ActBtn ic="x" title="Hoàn" onClick={() => onReject(r, reload)} tone="crit" />
          )}
        </div>
      )}
      drawer={(r) => <RxDrawerBody r={r} />}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.prescriptionCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.doctorName} · ${r.department} · ${fmtDT(r.createdDate)}`}
      toolbarRight={
        <>
          <button type="button" className="ab-btn ghost" onClick={() => message.info('TODO: Phiếu nhập kho')}>
            <TermIcon name="download" size={12} /> Nhập kho
          </button>
          <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Đơn ngoại trú')}>
            <TermIcon name="plus" size={12} /> Đơn ngoại
          </button>
        </>
      }
    />
  );
};

const RxDrawerBody: React.FC<{ r: PendingPrescription }> = ({ r }) => {
  const [items, setItems] = useState<pharmacyApi.MedicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setLoading(true);
    pharmacyApi.getMedicationItems(r.id)
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [r.id]);

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> ĐƠN THUỐC</h5>
        <div className="rec-kv">
          <span>Mã đơn</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.prescriptionCode}</span>
          <span>Bệnh nhân</span><b>{r.patientName} · {r.patientCode}</b>
          <span>BS chỉ định</span><span>{r.doctorName}</span>
          <span>Khoa</span><span>{r.department}</span>
          <span>Ngày kê</span><span>{fmtDT(r.createdDate)}</span>
          <span>Số thuốc</span><b>{r.itemsCount} loại</b>
          <span>Tổng tiền</span><b className="mono" style={{ color: 'var(--a-cy)' }}>{fmtVND(r.totalAmount)}</b>
          <span>Ưu tiên</span><span className={`chip ${r.priority === 'urgent' ? 'crit' : 'info'}`}>{r.priority === 'urgent' ? 'STAT' : 'Thường'}</span>
        </div>
      </div>
      <div className="rec-section">
        <h5><TermIcon name="flask" size={11} /> DANH MỤC THUỐC</h5>
        {loading && <div style={{ textAlign: 'center', padding: 16, color: 'var(--t-2)' }}>Đang tải…</div>}
        {!loading && items.length === 0 && <div style={{ color: 'var(--t-3)', fontSize: 12 }}>Chưa có thuốc</div>}
        {!loading && items.length > 0 && (
          <div style={{ fontSize: 12.5 }}>
            {items.map((it) => (
              <div key={it.id} style={{
                padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center',
              }}>
                <div>
                  <b style={{ color: 'var(--t-0)' }}>{it.medicationName}</b>
                  <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
                    <span className="mono">{it.medicationCode}</span> · {it.dosage}
                  </div>
                  {it.instruction && <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>{it.instruction}</div>}
                </div>
                <span className="mono" style={{ fontWeight: 600 }}>{it.quantity} {it.unit}</span>
                {it.dispensedQuantity > 0 && (
                  <span className="chip ok mono">{it.dispensedQuantity} đã cấp</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default PharmacyV2;
