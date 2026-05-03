import React from 'react';
import dayjs from 'dayjs';
import { searchExaminations } from '../api/examination';
import type { ExaminationDto } from '../api/examination';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'waiting' | 'inProgress' | 'waitingResult' | 'concluding' | 'completed';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'waiting',       l: 'Chờ khám',     tone: 'info' },
  { v: 'inProgress',    l: 'Đang khám',    tone: 'warn' },
  { v: 'waitingResult', l: 'Chờ CLS',      tone: 'warn' },
  { v: 'concluding',    l: 'Chờ kết luận', tone: 'warn' },
  { v: 'completed',     l: 'Hoàn tất',     tone: 'ok' },
];
const statusKey = (s: number): StatusKey =>
  s === 1 ? 'inProgress' : s === 2 ? 'waitingResult' : s === 3 ? 'concluding' : s === 4 ? 'completed' : 'waiting';
const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const DoctorPortalV2: React.FC = () => {
  const columns: ColumnDef<ExaminationDto>[] = [
    { key: 'queue', label: 'STT', mono: true, width: 80, render: (r) =>
      <span className="chip cy">{r.queueNumber}</span>
    },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode}</i>
      </div>
    )},
    { key: 'room', label: 'Phòng khám', render: (r) => r.roomName || '—' },
    { key: 'time', label: 'Giờ khám', mono: true, width: 100, render: (r) => fmtHM(r.examinationDate) },
    { key: 'date', label: 'Ngày', mono: true, width: 100, render: (r) => fmtDMY(r.examinationDate) },
    { key: 'doctor', label: 'Bác sĩ', width: 200, render: (r) => r.doctorName || 'Chưa phân' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) =>
      r.diagnosisName ? (
        <div className="cell-2l">
          <b>{r.diagnosisName}</b>
          <i className="mono">{r.diagnosisCode}</i>
        </div>
      ) : <span style={{ color: 'var(--t-3)' }}>Chưa CĐ</span>
    },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<ExaminationDto>
      title="Cổng bác sĩ"
      load={async () => {
        const r = await searchExaminations({
          fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
          toDate:   dayjs().add(1, 'day').format('YYYY-MM-DD'),
          pageIndex: 1, pageSize: 200,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((r as any)?.data?.items || (r as any)?.data || []) as ExaminationDto[];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã / chẩn đoán…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.diagnosisName || ''} ${r.diagnosisCode || ''}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.examinationDate).isSame(today, 'day')).length;
        const completed = rows.filter((r) => r.status === 4).length;
        const inProgress = rows.filter((r) => r.status === 1).length;
        const withDx = rows.filter((r) => r.diagnosisCode).length;
        return [
          { lbl: 'Hôm nay', val: todayCount, sub: 'lượt khám', tone: 'info' },
          { lbl: 'Đang khám', val: inProgress, tone: 'warn' },
          { lbl: 'Chờ CLS/KL', val: rows.filter((r) => r.status === 2 || r.status === 3).length, tone: 'warn' },
          { lbl: 'Hoàn tất', val: completed, tone: 'ok' },
          { lbl: 'Có chẩn đoán', val: withDx, sub: 'đã ICD', tone: 'ok' },
          { lbl: 'Tổng cộng', val: rows.length, sub: '7 ngày' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
              <span>STT</span><span><span className="chip cy mono">{r.queueNumber}</span></span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="stethoscope" size={11} /> KHÁM</h5>
            <div className="rec-kv">
              <span>Phòng</span><b>{r.roomName || '—'}</b>
              <span>Bác sĩ</span><span>{r.doctorName || 'Chưa phân'}</span>
              <span>Ngày khám</span><span>{fmtDMY(r.examinationDate)}</span>
              <span>Giờ khám</span><span>{fmtHM(r.examinationDate)}</span>
            </div>
          </div>
          {r.diagnosisCode && (
            <div className="rec-section">
              <h5><TermIcon name="file-text" size={11} /> CHẨN ĐOÁN</h5>
              <div className="rec-kv">
                <span>Mã ICD</span><b className="mono">{r.diagnosisCode}</b>
                <span>Tên</span><span>{r.diagnosisName}</span>
              </div>
            </div>
          )}
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.patientCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.roomName || '—'} · STT ${r.queueNumber}`}
    />
  );
};

export default DoctorPortalV2;
