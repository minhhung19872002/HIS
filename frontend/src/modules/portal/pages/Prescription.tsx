import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getRecentPrescriptions, printExternalPrescription, type RecentPrescriptionDto } from '../../opd/api/examination';
import { SimpleV2Page, StatusBadge, ActBtn, Btn, type ColumnDef, type StatusTab } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { prescriptionEditorLink, prescriptionStatusKey, type PrescriptionStatusKey } from './prescriptionFlow';

/* Kê đơn v2 — list shell.
   Editor đầy đủ (search BN, search thuốc, drug interactions, ký số) là native
   v2 tại /v2/prescription/edit (PrescriptionEditor.tsx). Click "Kê đơn" mở nó. */

type StatusKey = PrescriptionStatusKey;
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',    l: 'Đang hiệu lực', tone: 'ok' },
  { v: 'dispensed', l: 'Đã cấp phát',   tone: 'ok' },
  { v: 'returned',  l: 'Hoàn trả',       tone: 'warn' },
  { v: 'expired',   l: 'Hết hạn',       tone: 'warn' },
  { v: 'cancelled', l: 'Đã hủy',        tone: 'crit' },
];
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

type Row = RecentPrescriptionDto;


/** Mở PDF blob ở tab mới rồi tự revoke URL sau 60s */
const openPdfBlob = (blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

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
    { key: 'doctor', label: 'BS kê', width: 180, render: (r) => r.doctorName || '—' },
    { key: 'dept', label: 'Khoa', width: 160, render: (r) => r.departmentName || '—' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosis || '—' },
    { key: 'items', label: 'Số thuốc', mono: true, width: 90, render: (r) => `${r.items?.length || 0} loại` },
    { key: 'date', label: 'Ngày kê', mono: true, width: 100, render: (r) => fmtDMY(r.prescriptionDate) },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = prescriptionStatusKey(r.status);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<Row>
      title="Đơn thuốc"
      load={async () => {
        const r = await getRecentPrescriptions({ pageSize: 100 });
        return Array.isArray(r.data) ? (r.data as Row[]) : [];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm mã đơn / BN / BS / chẩn đoán…"
      searchOf={(r) => `${r.prescriptionCode} ${r.patientName || ''} ${r.doctorName || ''} ${r.diagnosis || ''}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => prescriptionStatusKey(r.status)}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.prescriptionDate).isSame(today, 'day')).length;
        const active = rows.filter((r) => prescriptionStatusKey(r.status) === 'active').length;
        const dispensed = rows.filter((r) => prescriptionStatusKey(r.status) === 'dispensed').length;
        const returned = rows.filter((r) => prescriptionStatusKey(r.status) === 'returned').length;
        const expired = rows.filter((r) => prescriptionStatusKey(r.status) === 'expired').length;
        const totalItems = rows.reduce((s, r) => s + (r.items?.length || 0), 0);
        return [
          { lbl: 'Tổng đơn', val: rows.length, sub: 'gần đây' },
          { lbl: 'Hôm nay', val: todayCount, sub: 'mới kê', tone: 'info' },
          { lbl: 'Đang hiệu lực', val: active, tone: 'ok' },
          { lbl: 'Đã cấp phát', val: dispensed, tone: 'ok' },
          { lbl: 'Hoàn trả', val: returned, tone: 'warn' },
          { lbl: 'Hết hạn', val: expired, tone: 'warn' },
          { lbl: 'Tổng thuốc', val: totalItems, sub: 'lượt kê' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          <ActBtn ic="edit" title="Mở editor kê đơn" onClick={() => navigate(prescriptionEditorLink(r))} />
          <ActBtn ic="print" title="In đơn" onClick={async () => {
            try {
              const res = await printExternalPrescription(r.id);
              openPdfBlob(res.data as Blob);
            } catch { message.error('Không in được đơn thuốc'); }
          }} />
        </div>
      )}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THÔNG TIN ĐƠN</h5>
            <div className="rec-kv">
              <span>Mã đơn</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.prescriptionCode}</span>
              <span>BS kê</span><b>{r.doctorName || '—'}</b>
              <span>Khoa</span><span>{r.departmentName || '—'}</span>
              <span>Ngày kê</span><span>{fmtDMY(r.prescriptionDate)}</span>
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
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-10)', fontSize: 12.5,
                }}>
                  <div>
                    <b style={{ color: 'var(--t-0)' }}>{it.drugName || '—'}</b>
                    {it.genericName && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{it.genericName}</div>}
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>
                      {it.dosage} · {it.frequency}
                    </div>
                    {it.instructions && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>{it.instructions}</div>}
                  </div>
                  <span className="mono" style={{ fontWeight: 600 }}>{it.quantity}</span>
                </div>
              ))}
            </div>
          )}
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THAO TÁC</h5>
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
              <Btn variant="primary" onClick={() => navigate(prescriptionEditorLink(r))}>
                <TermIcon name="edit" size={12} /> Mở editor kê đơn
              </Btn>
              <Btn onClick={async () => {
                try {
                  const res = await printExternalPrescription(r.id);
                  openPdfBlob(res.data as Blob);
                } catch { message.error('Không in được đơn thuốc'); }
              }}>
                <TermIcon name="print" size={12} /> In đơn
              </Btn>
              <Btn onClick={() => navigate('/v2/signing-workflow')}>
                <TermIcon name="check" size={12} /> Ký số
              </Btn>
            </div>
          </div>
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{r.prescriptionCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName || '—'}</span>
        </span>
      )}
      drawerSub={(r) => `${r.doctorName || '—'} · ${fmtDMY(r.prescriptionDate)}`}
      toolbarRight={
        <Btn variant="primary" onClick={() => navigate('/v2/prescription/edit')}>
          <TermIcon name="plus" size={12} /> Kê đơn mới
        </Btn>
      }
    />
  );
};

export default PrescriptionV2;
