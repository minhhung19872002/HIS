import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { searchExaminations } from '../api/examination';
import type { ExaminationDto } from '../api/examination';
import { SimpleV2Page, StatusBadge, ActBtn, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* HSBA điện tử v2 — port of EMR v2.html (BN list) */

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
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const EMRV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const columns: ColumnDef<ExaminationDto>[] = [
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}</i>
        </div>
      ),
    },
    { key: 'date', label: 'Ngày khám', mono: true, width: 130, render: (r) => fmtDT(r.examinationDate) },
    { key: 'queue', label: 'STT', mono: true, width: 70, render: (r) => r.queueNumber },
    { key: 'room', label: 'Phòng', width: 200, render: (r) => r.roomName || '—' },
    { key: 'doctor', label: 'Bác sĩ', width: 200, render: (r) => r.doctorName || '—' },
    {
      key: 'dx', label: 'Chẩn đoán',
      render: (r) => r.diagnosisCode ? (
        <div className="cell-2l">
          <b>{r.diagnosisName}</b>
          <i className="mono">{r.diagnosisCode}</i>
        </div>
      ) : <span style={{ color: 'var(--t-3)' }}>Chưa CĐ</span>,
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
    <SimpleV2Page<ExaminationDto>
      title="Hồ sơ bệnh án điện tử"
      load={async () => {
        const r = await searchExaminations({
          fromDate: dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
          toDate:   dayjs().add(1, 'day').format('YYYY-MM-DD'),
          pageIndex: 1, pageSize: 200,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((r as any)?.data?.items || []) as ExaminationDto[];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã / chẩn đoán / phòng…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.diagnosisName || ''} ${r.diagnosisCode || ''} ${r.roomName || ''}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.examinationDate).isSame(today, 'day')).length;
        const completed = rows.filter((r) => r.status === 4).length;
        const inProgress = rows.filter((r) => r.status === 1).length;
        const withDx = rows.filter((r) => r.diagnosisCode).length;
        const pending = rows.filter((r) => r.status === 2 || r.status === 3).length;
        return [
          { lbl: 'Tổng HS', val: rows.length, sub: '60 ngày' },
          { lbl: 'Hôm nay', val: todayCount, sub: 'mới', tone: 'info' },
          { lbl: 'Đang khám', val: inProgress, tone: 'warn' },
          { lbl: 'Chờ CLS/KL', val: pending, sub: 'cần xử lý', tone: 'warn' },
          { lbl: 'Có chẩn đoán', val: withDx, sub: 'đã ICD', tone: 'ok' },
          { lbl: 'Hoàn tất', val: completed, tone: 'ok' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          <ActBtn ic="eye" title="Xem chi tiết v1" onClick={() => navigate('/emr')} />
          <ActBtn ic="print" title="In HS" onClick={() => message.success('Đã gửi PDF')} />
        </div>
      )}
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
              <span>Ngày khám</span><span className="mono">{fmtDT(r.examinationDate)}</span>
              <span>Phòng</span><b>{r.roomName || '—'}</b>
              <span>Bác sĩ</span><span>{r.doctorName || 'Chưa phân'}</span>
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
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THAO TÁC</h5>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="ab-btn primary" onClick={() => navigate('/emr')}>
                <TermIcon name="eye" size={12} /> Mở HS chi tiết
              </button>
              <button type="button" className="ab-btn" onClick={() => message.success('Đã gửi PDF')}>
                <TermIcon name="print" size={12} /> In hồ sơ
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
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.patientCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.roomName || '—'} · ${fmtDMY(r.examinationDate)}`}
    />
  );
};

export default EMRV2;
