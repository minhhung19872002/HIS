import React from 'react';
import dayjs from 'dayjs';
import { getChronicRecords } from '../api/chronicDisease';
import type { ChronicRecordDto } from '../api/chronicDisease';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'active' | 'followup' | 'closed' | 'removed';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',   l: 'Đang điều trị', tone: 'ok' },
  { v: 'followup', l: 'Cần tái khám',  tone: 'warn' },
  { v: 'closed',   l: 'Đã đóng',       tone: 'info' },
  { v: 'removed',  l: 'Đã loại',       tone: 'crit' },
];
const statusKey = (s: number): StatusKey => {
  if (s === 1) return 'followup';
  if (s === 2) return 'closed';
  if (s === 3) return 'removed';
  return 'active';
};
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const ChronicDiseaseV2: React.FC = () => {
  const columns: ColumnDef<ChronicRecordDto>[] = [
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}{r.phoneNumber ? ` · ${r.phoneNumber}` : ''}</i>
        </div>
      ),
    },
    {
      key: 'dx', label: 'ICD · Bệnh',
      render: (r) => (
        <div className="cell-2l">
          <b className="mono" style={{ color: 'var(--a-cy)' }}>{r.icdCode}</b>
          <i>{r.icdName}</i>
        </div>
      ),
    },
    { key: 'dxDate', label: 'Ngày CĐ', mono: true, width: 100, render: (r) => fmtDMY(r.diagnosisDate) },
    { key: 'doctor', label: 'BS phụ trách', width: 200, render: (r) => r.doctorName || '—' },
    { key: 'cycle', label: 'Chu kỳ', mono: true, width: 90, render: (r) => `${r.followUpIntervalDays}d` },
    {
      key: 'next', label: 'Tái khám tiếp', mono: true, width: 110,
      render: (r) => {
        if (!r.nextFollowUpDate) return '—';
        const days = dayjs(r.nextFollowUpDate).diff(dayjs(), 'day');
        const overdue = days < 0;
        return <span style={{ color: overdue ? 'var(--s-crit)' : days <= 7 ? 'var(--s-warn)' : 'var(--t-1)' }}>{fmtDMY(r.nextFollowUpDate)}</span>;
      },
    },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<ChronicRecordDto>
      title="Bệnh mạn tính"
      load={async () => (await getChronicRecords({ pageSize: 200 })).items}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm tên BN / mã / ICD / bệnh…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.icdCode} ${r.icdName}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => {
        const overdue = rows.filter((r) => r.nextFollowUpDate && dayjs(r.nextFollowUpDate).isBefore(dayjs(), 'day')).length;
        const due7 = rows.filter((r) => r.nextFollowUpDate && dayjs(r.nextFollowUpDate).diff(dayjs(), 'day') <= 7 && dayjs(r.nextFollowUpDate).diff(dayjs(), 'day') >= 0).length;
        const closed = rows.filter((r) => r.status === 2 || r.status === 3).length;
        const newThisMonth = rows.filter((r) => dayjs(r.diagnosisDate).isAfter(dayjs().startOf('month'))).length;
        return [
          { lbl: 'Tổng HS', val: rows.length, sub: 'tất cả' },
          { lbl: 'Cần tái khám', val: rows.filter((r) => r.status === 1).length, sub: 'sắp đến', tone: 'warn' },
          { lbl: 'Quá hạn', val: overdue, sub: 'cần liên hệ', tone: 'crit' },
          { lbl: '7 ngày tới', val: due7, sub: 'tái khám', tone: 'info' },
          { lbl: 'Mới tháng', val: newThisMonth, tone: 'ok' },
          { lbl: 'Đã đóng', val: closed, sub: 'kết thúc' },
        ];
      }}
      drawer={(r) => <ChronicDrawerBody r={r} />}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.icdCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.icdName} · CĐ ${fmtDMY(r.diagnosisDate)}`}
    />
  );
};

const ChronicDrawerBody: React.FC<{ r: ChronicRecordDto }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
      <div className="rec-kv">
        <span>Họ tên</span><b>{r.patientName}</b>
        <span>Mã BN</span><span className="mono">{r.patientCode}</span>
        {r.phoneNumber && (<><span>Điện thoại</span><span className="mono">{r.phoneNumber}</span></>)}
        {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="stethoscope" size={11} /> CHẨN ĐOÁN</h5>
      <div className="rec-kv">
        <span>ICD</span><b className="mono" style={{ color: 'var(--a-cy)' }}>{r.icdCode}</b>
        <span>Tên bệnh</span><span>{r.icdName}</span>
        <span>Ngày CĐ</span><span>{fmtDMY(r.diagnosisDate)}</span>
        <span>BS phụ trách</span><span>{r.doctorName || '—'}</span>
        <span>Khoa</span><span>{r.departmentName || '—'}</span>
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="calendar" size={11} /> THEO DÕI</h5>
      <div className="rec-kv">
        <span>Chu kỳ</span><b>{r.followUpIntervalDays} ngày</b>
        <span>Tái khám tiếp</span><span className="mono">{fmtDMY(r.nextFollowUpDate)}</span>
      </div>
    </div>
    {r.notes && (
      <div className="rec-section">
        <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
        <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.notes}</div>
      </div>
    )}
  </>
);

export default ChronicDiseaseV2;
