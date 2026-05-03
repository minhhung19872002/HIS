import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getPrescriptions } from '../api/patientPortal';
import type { PrescriptionHistoryDto } from '../api/patientPortal';
import { SimpleV2Page, StatusBadge, ActBtn, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* Kê đơn v2 — list shell.
   Editor đầy đủ (search BN, search thuốc, drug interactions, ký số) ở v1
   tại route /prescription. Click "Kê đơn" chuyển sang v1. */

type StatusKey = 'active' | 'dispensed' | 'expired' | 'cancelled';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',    l: 'Đang hiệu lực', tone: 'ok' },
  { v: 'dispensed', l: 'Đã cấp phát',   tone: 'ok' },
  { v: 'expired',   l: 'Hết hạn',       tone: 'warn' },
  { v: 'cancelled', l: 'Đã hủy',        tone: 'crit' },
];
const statusKey = (s: string): StatusKey => {
  const sl = (s || '').toLowerCase();
  if (sl.includes('dispensed') || sl === 'cấp') return 'dispensed';
  if (sl.includes('expired') || sl === 'hết') return 'expired';
  if (sl.includes('cancel') || sl === 'hủy') return 'cancelled';
  return 'active';
};
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

type Row = PrescriptionHistoryDto & { patientName?: string; patientCode?: string };

const PrescriptionV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const columns: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã đơn', mono: true, width: 150, render: (r) => r.prescriptionCode },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName || '—'}</b>
          {r.patientCode && <i className="mono">{r.patientCode}</i>}
        </div>
      ),
    },
    { key: 'doctor', label: 'BS kê', width: 180, render: (r) => r.prescribedBy || '—' },
    { key: 'dept', label: 'Khoa', width: 160, render: (r) => r.department || '—' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosis || '—' },
    { key: 'items', label: 'Số thuốc', mono: true, width: 90, render: (r) => `${r.items?.length || 0} loại` },
    { key: 'date', label: 'Ngày kê', mono: true, width: 100, render: (r) => fmtDMY(r.prescribedDate) },
    {
      key: 'valid', label: 'Hiệu lực', mono: true, width: 130,
      render: (r) => `${fmtDMY(r.validFrom)} → ${fmtDMY(r.validTo)}`,
    },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<Row>
      title="Đơn thuốc"
      load={async () => {
        const r = await getPrescriptions();
        return Array.isArray(r.data) ? (r.data as Row[]) : [];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm mã đơn / BN / BS / chẩn đoán…"
      searchOf={(r) => `${r.prescriptionCode} ${r.patientName || ''} ${r.prescribedBy || ''} ${r.diagnosis || ''}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.prescribedDate).isSame(today, 'day')).length;
        const active = rows.filter((r) => statusKey(r.status) === 'active').length;
        const dispensed = rows.filter((r) => statusKey(r.status) === 'dispensed').length;
        const expired = rows.filter((r) => statusKey(r.status) === 'expired').length;
        const totalItems = rows.reduce((s, r) => s + (r.items?.length || 0), 0);
        return [
          { lbl: 'Tổng đơn', val: rows.length, sub: 'gần đây' },
          { lbl: 'Hôm nay', val: todayCount, sub: 'mới kê', tone: 'info' },
          { lbl: 'Đang hiệu lực', val: active, tone: 'ok' },
          { lbl: 'Đã cấp phát', val: dispensed, tone: 'ok' },
          { lbl: 'Hết hạn', val: expired, tone: 'warn' },
          { lbl: 'Tổng thuốc', val: totalItems, sub: 'lượt kê' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          <ActBtn ic="eye" title="Mở v1 chi tiết" onClick={() => navigate('/prescription')} />
          <ActBtn ic="print" title="In đơn" onClick={() => message.success('Đã gửi máy in')} />
        </div>
      )}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THÔNG TIN ĐƠN</h5>
            <div className="rec-kv">
              <span>Mã đơn</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.prescriptionCode}</span>
              <span>BS kê</span><b>{r.prescribedBy}</b>
              <span>Khoa</span><span>{r.department}</span>
              <span>Ngày kê</span><span>{fmtDMY(r.prescribedDate)}</span>
              <span>Hiệu lực</span><span className="mono">{fmtDMY(r.validFrom)} → {fmtDMY(r.validTo)}</span>
              {r.diagnosis && (<><span>Chẩn đoán</span><span>{r.diagnosis}</span></>)}
              {r.instructions && (<><span>Lời dặn</span><span style={{ whiteSpace: 'pre-wrap' }}>{r.instructions}</span></>)}
            </div>
          </div>
          {r.items && r.items.length > 0 && (
            <div className="rec-section">
              <h5><TermIcon name="flask" size={11} /> THUỐC ({r.items.length})</h5>
              {r.items.map((it, i) => (
                <div key={i} style={{
                  padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, fontSize: 12.5,
                }}>
                  <div>
                    <b style={{ color: 'var(--t-0)' }}>{it.drugName}</b>
                    {it.genericName && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{it.genericName}</div>}
                    <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>
                      {it.dosage} · {it.frequency}
                    </div>
                    {it.instructions && <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>{it.instructions}</div>}
                  </div>
                  <span className="mono" style={{ fontWeight: 600 }}>{it.quantity}</span>
                </div>
              ))}
            </div>
          )}
          {r.refillsAllowed != null && r.refillsAllowed > 0 && (
            <div className="rec-section">
              <h5><TermIcon name="refresh" size={11} /> CẤP LẠI</h5>
              <div className="rec-kv">
                <span>Cho phép</span><b>{r.refillsAllowed} lần</b>
                <span>Đã dùng</span><b>{r.refillsUsed || 0} lần</b>
              </div>
            </div>
          )}
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THAO TÁC</h5>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="ab-btn primary" onClick={() => navigate('/prescription')}>
                <TermIcon name="edit" size={12} /> Mở editor v1
              </button>
              <button type="button" className="ab-btn" onClick={() => message.success('Đã gửi máy in')}>
                <TermIcon name="print" size={12} /> In đơn
              </button>
              <button type="button" className="ab-btn" onClick={() => message.info('TODO: Ký số')}>
                <TermIcon name="check" size={12} /> Ký số
              </button>
            </div>
          </div>
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.prescriptionCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName || '—'}</span>
        </span>
      )}
      drawerSub={(r) => `${r.prescribedBy} · ${fmtDMY(r.prescribedDate)}`}
      toolbarRight={
        <button type="button" className="ab-btn primary" onClick={() => navigate('/prescription')}>
          <TermIcon name="plus" size={12} /> Kê đơn mới
        </button>
      }
    />
  );
};

export default PrescriptionV2;
