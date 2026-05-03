import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import * as receptionApi from '../api/reception';
import type { AdmissionDto } from '../api/reception';
import { SimpleV2Page, StatusBadge, ActBtn, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* Khám bệnh OPD v2 — list shell.
   Form khám đầy đủ (vital signs, history, exam, prescription) ở v1
   tại route /opd. Click "Khám" trên row chuyển sang v1. */

type StatusKey = 'waiting' | 'inProgress' | 'waitingResult' | 'completed';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'waiting',       l: 'Chờ khám',       tone: 'info' },
  { v: 'inProgress',    l: 'Đang khám',      tone: 'warn' },
  { v: 'waitingResult', l: 'Chờ kết quả CLS', tone: 'warn' },
  { v: 'completed',     l: 'Đã kết luận',    tone: 'ok' },
];
const statusKey = (s: number | string): StatusKey => {
  const sn = typeof s === 'number' ? s : (s === 'InProgress' ? 1 : s === 'WaitingResult' ? 2 : s === 'Completed' ? 3 : 0);
  return sn === 1 ? 'inProgress' : sn === 2 ? 'waitingResult' : sn === 3 ? 'completed' : 'waiting';
};
const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

type Row = AdmissionDto & {
  status: number | string;
  age?: number;
  genderName?: string;
  treatmentTypeName?: string;
};

const OPDV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const ageOf = (r: Row): string => {
    if (typeof r.age === 'number' && r.age > 0) return `${r.age}t`;
    if (r.dateOfBirth) {
      const d = dayjs(r.dateOfBirth);
      if (d.isValid()) return `${dayjs().diff(d, 'year')}t`;
    }
    return '—';
  };
  const genderOf = (r: Row): string => r.genderName || (typeof r.gender === 'string' ? r.gender : r.gender === 1 ? 'Nam' : r.gender === 2 ? 'Nữ' : '—');

  const columns: ColumnDef<Row>[] = [
    {
      key: 'queue', label: 'STT', mono: true, width: 80,
      render: (r) => <span className="chip cy">{r.queueCode || `#${r.queueNumber}`}</span>,
    },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {genderOf(r)} · {ageOf(r)}</i>
        </div>
      ),
    },
    { key: 'arrived', label: 'Đến lúc', mono: true, width: 80, render: (r) => fmtHM(r.admissionDate) },
    {
      key: 'dept', label: 'Khoa · Phòng',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.departmentName || '—'}</b>
          <i>{r.roomName || '—'}</i>
        </div>
      ),
    },
    { key: 'doctor', label: 'BS', width: 180, render: (r) => r.doctorName || 'Chưa phân' },
    { key: 'reason', label: 'Lý do khám', render: (r) => r.chiefComplaint || '—' },
    {
      key: 'bhyt', label: 'BHYT', width: 100,
      render: (r) => r.insuranceNumber ? <span className="chip ok">Có</span> : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<Row>
      title="Bệnh nhân chờ khám"
      load={async () => {
        const today = dayjs().format('YYYY-MM-DD');
        const res = await receptionApi.getTodayAdmissions(undefined, today);
        return Array.isArray(res.data) ? (res.data as Row[]) : [];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã / lý do khám…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.chiefComplaint || ''}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => {
        const waiting = rows.filter((r) => statusKey(r.status) === 'waiting').length;
        const inProgress = rows.filter((r) => statusKey(r.status) === 'inProgress').length;
        const completed = rows.filter((r) => statusKey(r.status) === 'completed').length;
        const bhyt = rows.filter((r) => r.insuranceNumber).length;
        const emergency = rows.filter((r) => r.isEmergency).length;
        return [
          { lbl: 'Tổng hôm nay', val: rows.length, sub: 'BN' },
          { lbl: 'Chờ khám', val: waiting, sub: 'cần gọi', tone: 'warn' },
          { lbl: 'Đang khám', val: inProgress, sub: 'live', tone: 'warn' },
          { lbl: 'Đã xong', val: completed, sub: rows.length > 0 ? `${Math.round(completed / rows.length * 100)}%` : '—', tone: 'ok' },
          { lbl: 'Có BHYT', val: bhyt, sub: rows.length > 0 ? `${Math.round(bhyt / rows.length * 100)}%` : '—' },
          { lbl: 'Cấp cứu', val: emergency, tone: 'crit' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          <ActBtn ic="stethoscope" title="Khám (mở v1)" onClick={() => navigate('/opd')} />
          <ActBtn ic="eye" title="Xem hồ sơ" onClick={() => navigate('/emr')} />
          <ActBtn ic="print" title="In phiếu" onClick={() => message.success('Đã gửi máy in')} />
        </div>
      )}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
              <span>STT</span><span><span className="chip cy mono">{r.queueCode || `#${r.queueNumber}`}</span></span>
              <span>Giới · Tuổi</span><span>{genderOf(r)} · {ageOf(r)}</span>
              <span>SĐT</span><span className="mono">{r.phoneNumber || '—'}</span>
              {r.address && (<><span>Địa chỉ</span><span>{r.address}</span></>)}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="stethoscope" size={11} /> PHIÊN KHÁM</h5>
            <div className="rec-kv">
              <span>Khoa</span><b>{r.departmentName || '—'}</b>
              <span>Phòng</span><span>{r.roomName || '—'}</span>
              <span>BS</span><span>{r.doctorName || 'Chưa phân'}</span>
              <span>Đến lúc</span><span className="mono">{fmtHM(r.admissionDate)}</span>
              {r.chiefComplaint && (<><span>Lý do khám</span><span>{r.chiefComplaint}</span></>)}
            </div>
          </div>
          {r.insuranceNumber && (
            <div className="rec-section">
              <h5><TermIcon name="dollar" size={11} /> BẢO HIỂM</h5>
              <div className="rec-kv">
                <span>Số thẻ</span><span className="mono">{r.insuranceNumber}</span>
                {r.insuranceExpireDate && (<><span>HSD</span><span>{fmtDMY(r.insuranceExpireDate)}</span></>)}
              </div>
            </div>
          )}
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THAO TÁC</h5>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="ab-btn primary" onClick={() => navigate('/opd')}>
                <TermIcon name="stethoscope" size={12} /> Mở phòng khám
              </button>
              <button type="button" className="ab-btn" onClick={() => navigate('/emr')}>
                <TermIcon name="eye" size={12} /> Xem HSBA
              </button>
              <button type="button" className="ab-btn" onClick={() => navigate('/prescription')}>
                <TermIcon name="flask" size={12} /> Kê đơn
              </button>
            </div>
          </div>
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.queueCode || `#${r.queueNumber}`}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.roomName || '—'} · ${fmtHM(r.admissionDate)}`}
    />
  );
};

export default OPDV2;
