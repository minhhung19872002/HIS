import React from 'react';
import dayjs from 'dayjs';
import { searchCases } from '../api/mentalHealth';
import type { MentalHealthCase } from '../api/mentalHealth';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'active' | 'stable' | 'remission' | 'discharged';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',     l: 'Đang điều trị', tone: 'warn' },
  { v: 'stable',     l: 'Ổn định',       tone: 'ok' },
  { v: 'remission',  l: 'Thuyên giảm',   tone: 'ok' },
  { v: 'discharged', l: 'Đã xuất viện',  tone: 'info' },
];
const statusKey = (s: number): StatusKey => {
  if (s === 1) return 'stable';
  if (s === 2) return 'remission';
  if (s === 3) return 'discharged';
  return 'active';
};
const TYPE_LABEL: Record<string, string> = {
  schizophrenia: 'Tâm thần phân liệt',
  depression: 'Trầm cảm',
  anxiety: 'Lo âu',
  bipolar: 'Rối loạn lưỡng cực',
  ptsd: 'PTSD',
  substance: 'Lạm dụng chất',
};
const SEVERITY_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { mild: 'ok', moderate: 'warn', severe: 'crit' };
const SEVERITY_LABEL: Record<string, string> = { mild: 'Nhẹ', moderate: 'TB', severe: 'Nặng' };
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const MentalHealthV2: React.FC = () => {
  const columns: ColumnDef<MentalHealthCase>[] = [
    { key: 'code', label: 'Mã ca', mono: true, width: 130, render: (r) => r.caseCode },
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
      key: 'type', label: 'Loại bệnh', width: 180,
      render: (r) => <span className="chip info">{TYPE_LABEL[r.caseType] || r.caseType}</span>,
    },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosis },
    {
      key: 'severity', label: 'Mức độ', width: 90,
      render: (r) => <span className={`chip ${SEVERITY_TONE[r.severity] || 'info'}`}>{SEVERITY_LABEL[r.severity] || r.severity}</span>,
    },
    {
      key: 'adherence', label: 'Tuân thủ', width: 100,
      render: (r) => <span className={`chip ${r.adherenceLevel === 'good' ? 'ok' : r.adherenceLevel === 'moderate' ? 'warn' : 'crit'}`}>{r.adherenceLevel}</span>,
    },
    { key: 'doctor', label: 'BS Tâm thần', width: 200, render: (r) => r.psychiatristName || '—' },
    { key: 'next', label: 'Hẹn tiếp', mono: true, width: 100, render: (r) => fmtDMY(r.nextFollowUpDate) },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<MentalHealthCase>
      title="Ca tâm thần"
      load={() => searchCases()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã / chẩn đoán…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.caseCode} ${r.diagnosis}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[
        {
          key: 'severity', placeholder: '▾ Mức độ',
          options: [{ v: 'mild', l: 'Nhẹ' }, { v: 'moderate', l: 'TB' }, { v: 'severe', l: 'Nặng' }],
          valueOf: (r) => r.severity,
        },
      ]}
      kpis={(rows) => {
        const severe = rows.filter((r) => r.severity === 'severe').length;
        const poor = rows.filter((r) => r.adherenceLevel === 'poor').length;
        const remission = rows.filter((r) => r.status === 2).length;
        return [
          { lbl: 'Tổng ca', val: rows.length, sub: 'tất cả' },
          { lbl: 'Đang ĐT', val: rows.filter((r) => r.status === 0).length, tone: 'warn' },
          { lbl: 'Nặng', val: severe, sub: 'cần ưu tiên', tone: 'crit' },
          { lbl: 'Tuân thủ kém', val: poor, sub: 'cần tư vấn', tone: 'crit' },
          { lbl: 'Thuyên giảm', val: remission, tone: 'ok' },
          { lbl: 'Ổn định', val: rows.filter((r) => r.status === 1).length, tone: 'ok' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono">{r.patientCode}</span>
              <span>Mã ca</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.caseCode}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="stethoscope" size={11} /> CHẨN ĐOÁN & ĐIỀU TRỊ</h5>
            <div className="rec-kv">
              <span>Loại bệnh</span><b>{TYPE_LABEL[r.caseType] || r.caseType}</b>
              <span>Chẩn đoán</span><span>{r.diagnosis}</span>
              <span>Mức độ</span><span className={`chip ${SEVERITY_TONE[r.severity]}`}>{SEVERITY_LABEL[r.severity]}</span>
              <span>BS Tâm thần</span><span>{r.psychiatristName}</span>
              <span>Bắt đầu</span><span>{fmtDMY(r.startDate)}</span>
              <span>Đánh giá gần nhất</span><span>{fmtDMY(r.lastAssessmentDate)}</span>
              <span>Hẹn tiếp</span><span>{fmtDMY(r.nextFollowUpDate)}</span>
              <span>Tuân thủ</span><span className={`chip ${r.adherenceLevel === 'good' ? 'ok' : 'warn'}`}>{r.adherenceLevel}</span>
            </div>
          </div>
          {r.medications && (
            <div className="rec-section">
              <h5><TermIcon name="flask" size={11} /> THUỐC ĐIỀU TRỊ</h5>
              <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.medications}</div>
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
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.caseCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${TYPE_LABEL[r.caseType]} · ${SEVERITY_LABEL[r.severity]}`}
    />
  );
};

export default MentalHealthV2;
