import React from 'react';
import dayjs from 'dayjs';
import { searchVaccinations } from '../api/immunization';
import type { Vaccination } from '../api/immunization';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'scheduled' | 'completed' | 'missed' | 'deferred';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch', tone: 'info' },
  { v: 'completed', l: 'Đã tiêm',     tone: 'ok' },
  { v: 'missed',    l: 'Bỏ lỡ',       tone: 'crit' },
  { v: 'deferred',  l: 'Hoãn',        tone: 'warn' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'completed' : s === 2 ? 'missed' : s === 3 ? 'deferred' : 'scheduled';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const ImmunizationV2: React.FC = () => {
  const columns: ColumnDef<Vaccination>[] = [
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode} · {r.gender === 1 ? 'Nam' : 'Nữ'}</i>
      </div>
    )},
    { key: 'vaccine', label: 'Vắc-xin', render: (r) => (
      <div className="cell-2l">
        <b>{r.vaccineName}</b>
        <i className="mono">{r.vaccineCode}</i>
      </div>
    )},
    { key: 'dose', label: 'Mũi', mono: true, width: 80, render: (r) => `${r.doseNumber}/${r.totalDoses}` },
    { key: 'lot', label: 'Số lô', mono: true, width: 130, render: (r) => r.lotNumber || '—' },
    { key: 'route', label: 'Đường tiêm', width: 100, render: (r) => `${r.route} · ${r.site}` },
    { key: 'when', label: 'Ngày tiêm', mono: true, width: 100, render: (r) => fmtDMY(r.vaccinationDate) },
    { key: 'next', label: 'Mũi tiếp', mono: true, width: 100, render: (r) => fmtDMY(r.nextDueDate) },
    { key: 'admin', label: 'Người tiêm', width: 180, render: (r) => r.administeredBy || '—' },
    { key: 'aefi', label: 'AEFI', width: 90, render: (r) =>
      r.adverseEvent ? <span className="chip crit">Có</span> : <span style={{ color: 'var(--t-3)' }}>—</span>
    },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<Vaccination>
      title="Hồ sơ tiêm chủng"
      load={() => searchVaccinations()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / vắc-xin / số lô…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.vaccineName} ${r.vaccineCode} ${r.lotNumber}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => {
        const aefi = rows.filter((r) => r.adverseEvent).length;
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.vaccinationDate).isSame(today, 'day')).length;
        const overdue = rows.filter((r) => r.nextDueDate && dayjs(r.nextDueDate).isBefore(today)).length;
        return [
          { lbl: 'Tổng mũi', val: rows.length },
          { lbl: 'Hôm nay', val: todayCount, tone: 'info' },
          { lbl: 'Đã tiêm', val: rows.filter((r) => r.status === 1).length, tone: 'ok' },
          { lbl: 'Bỏ lỡ', val: rows.filter((r) => r.status === 2).length, tone: 'crit' },
          { lbl: 'Quá hạn mũi sau', val: overdue, tone: 'warn' },
          { lbl: 'AEFI', val: aefi, sub: 'phản ứng', tone: aefi > 0 ? 'crit' : 'ok' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono">{r.patientCode}</span>
              <span>Giới · NS</span><span>{r.gender === 1 ? 'Nam' : 'Nữ'} · {fmtDMY(r.dateOfBirth)}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="flask" size={11} /> VẮC-XIN</h5>
            <div className="rec-kv">
              <span>Tên</span><b>{r.vaccineName}</b>
              <span>Mã</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.vaccineCode}</span>
              <span>Số lô</span><span className="mono">{r.lotNumber}</span>
              <span>Mũi</span><b>{r.doseNumber}/{r.totalDoses}</b>
              <span>Đường tiêm</span><span>{r.route}</span>
              <span>Vị trí</span><span>{r.site}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="calendar" size={11} /> THỜI GIAN</h5>
            <div className="rec-kv">
              <span>Ngày tiêm</span><span>{fmtDMY(r.vaccinationDate)}</span>
              <span>Người tiêm</span><span>{r.administeredBy}</span>
              <span>Mũi tiếp</span><span>{fmtDMY(r.nextDueDate)}</span>
            </div>
          </div>
          {r.adverseEvent && (
            <div className="rec-section">
              <h5><TermIcon name="alert" size={11} /> AEFI - PHẢN ỨNG SAU TIÊM</h5>
              <div style={{ fontSize: 12.5, color: 'var(--s-crit)', whiteSpace: 'pre-wrap' }}>{r.adverseEvent}</div>
            </div>
          )}
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
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.vaccineCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.vaccineName} · Mũi ${r.doseNumber}/${r.totalDoses}`}
    />
  );
};

export default ImmunizationV2;
