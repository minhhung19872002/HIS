import React from 'react';
import dayjs from 'dayjs';
import { searchPrenatal } from '../api/reproductiveHealth';
import type { PrenatalRecord } from '../api/reproductiveHealth';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'active' | 'delivered' | 'completed' | 'cancelled';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',    l: 'Đang theo dõi', tone: 'ok' },
  { v: 'delivered', l: 'Đã sinh',       tone: 'ok' },
  { v: 'completed', l: 'Hoàn tất',      tone: 'info' },
  { v: 'cancelled', l: 'Hủy',           tone: 'crit' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'delivered' : s === 2 ? 'completed' : s === 3 ? 'cancelled' : 'active';
const RISK_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { low: 'ok', medium: 'warn', high: 'crit', very_high: 'crit' };
const RISK_LABEL: Record<string, string> = { low: 'Thấp', medium: 'TB', high: 'Cao', very_high: 'Rất cao' };
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const ReproductiveHealthV2: React.FC = () => {
  const columns: ColumnDef<PrenatalRecord>[] = [
    { key: 'code', label: 'Mã HS', mono: true, width: 130, render: (r) => r.recordCode },
    { key: 'patient', label: 'Sản phụ', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
    )},
    { key: 'gw', label: 'Tuần thai', mono: true, width: 90, render: (r) => `${r.gestationalWeeks}t` },
    { key: 'gp', label: 'PARA', mono: true, width: 100, render: (r) => `G${r.gravida || 0}P${r.para || 0}` },
    { key: 'edd', label: 'Dự sinh', mono: true, width: 100, render: (r) => fmtDMY(r.expectedDeliveryDate) },
    { key: 'risk', label: 'Mức rủi ro', width: 110, render: (r) =>
      <span className={`chip ${RISK_TONE[r.riskLevel] || 'info'}`}>{RISK_LABEL[r.riskLevel] || r.riskLevel}</span>
    },
    { key: 'visits', label: 'Số lần khám', mono: true, width: 100, render: (r) => r.visitCount || 0 },
    { key: 'last', label: 'Khám gần nhất', mono: true, width: 110, render: (r) => fmtDMY(r.lastVisitDate) },
    { key: 'doctor', label: 'BS', width: 180, render: (r) => r.doctorName || '—' },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<PrenatalRecord>
      title="Hồ sơ thai phụ"
      load={() => searchPrenatal()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm sản phụ / mã HS…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.recordCode}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[{
        key: 'risk', placeholder: '▾ Mức rủi ro',
        options: Object.entries(RISK_LABEL).map(([v, l]) => ({ v, l })),
        valueOf: (r) => r.riskLevel,
      }]}
      kpis={(rows) => {
        const highRisk = rows.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'very_high').length;
        const dueIn30 = rows.filter((r) => r.expectedDeliveryDate && dayjs(r.expectedDeliveryDate).diff(dayjs(), 'day') <= 30 && dayjs(r.expectedDeliveryDate).diff(dayjs(), 'day') >= 0).length;
        return [
          { lbl: 'Tổng HS', val: rows.length },
          { lbl: 'Đang TD', val: rows.filter((r) => r.status === 0).length, tone: 'ok' },
          { lbl: 'Rủi ro cao', val: highRisk, tone: 'crit' },
          { lbl: 'Sinh ≤30d', val: dueIn30, tone: 'warn' },
          { lbl: 'Đã sinh', val: rows.filter((r) => r.status === 1).length, tone: 'ok' },
          { lbl: 'TB tuần thai', val: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.gestationalWeeks, 0) / rows.length) : 0, unit: 't' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> SẢN PHỤ</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã</span><span className="mono">{r.patientCode}</span>
              <span>Mã HS</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.recordCode}</span>
              {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
              {r.bloodType && (<><span>Nhóm máu</span><b>{r.bloodType}</b></>)}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="heart" size={11} /> THAI KỲ</h5>
            <div className="rec-kv">
              <span>Tuần thai</span><b>{r.gestationalWeeks} tuần</b>
              <span>PARA</span><b>G{r.gravida}P{r.para}</b>
              <span>Dự sinh</span><span>{fmtDMY(r.expectedDeliveryDate)}</span>
              <span>Mức rủi ro</span><span><span className={`chip ${RISK_TONE[r.riskLevel]}`}>{RISK_LABEL[r.riskLevel]}</span></span>
              <span>Số lần khám</span><b>{r.visitCount || 0}</b>
              <span>Khám gần nhất</span><span>{fmtDMY(r.lastVisitDate)}</span>
              <span>BS phụ trách</span><span>{r.doctorName}</span>
            </div>
          </div>
          {r.notes && (
            <div className="rec-section">
              <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
              <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.notes}</div>
            </div>
          )}
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.recordCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.gestationalWeeks} tuần · G${r.gravida}P${r.para} · ${RISK_LABEL[r.riskLevel]}`}
    />
  );
};

export default ReproductiveHealthV2;
