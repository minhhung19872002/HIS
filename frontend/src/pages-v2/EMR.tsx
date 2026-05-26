import React from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { searchExaminations } from '../api/examination';
import type { ExaminationDto } from '../api/examination';
import { SimpleV2Page, ActBtn, type ColumnDef } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   HSBA điện tử v2 — record-centric (theo mock EMR v2):
   danh sách theo BỆNH NHÂN (gộp các lượt khám), cột Lượt KB / Lần cuối /
   Chẩn đoán gần nhất. Không có status-tab (mock dùng filter).
   Nguồn: searchExaminations (gộp client theo patientId).
   ──────────────────────────────────────────────────────────── */

interface PatientRecord {
  id: string;                 // patientId
  patientCode: string;
  patientName: string;
  visits: number;
  lastVisit: string;
  lastDiagnosisName?: string;
  lastDiagnosisCode?: string;
  lastRoomName?: string;
  lastDoctorName?: string;
}

const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');

// Gộp các lượt khám thành 1 dòng / bệnh nhân.
const groupByPatient = (exams: ExaminationDto[]): PatientRecord[] => {
  const map = new Map<string, PatientRecord>();
  for (const e of exams) {
    const key = e.patientId || e.patientCode;
    const cur = map.get(key);
    const isNewer = !cur || dayjs(e.examinationDate).isAfter(dayjs(cur.lastVisit));
    if (!cur) {
      map.set(key, {
        id: key,
        patientCode: e.patientCode,
        patientName: e.patientName,
        visits: 1,
        lastVisit: e.examinationDate,
        lastDiagnosisName: e.diagnosisName,
        lastDiagnosisCode: e.diagnosisCode,
        lastRoomName: e.roomName,
        lastDoctorName: e.doctorName,
      });
    } else {
      cur.visits += 1;
      if (isNewer) {
        cur.lastVisit = e.examinationDate;
        cur.lastDiagnosisName = e.diagnosisName;
        cur.lastDiagnosisCode = e.diagnosisCode;
        cur.lastRoomName = e.roomName;
        cur.lastDoctorName = e.doctorName;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => dayjs(b.lastVisit).valueOf() - dayjs(a.lastVisit).valueOf());
};

const EMRV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const columns: ColumnDef<PatientRecord>[] = [
    { key: 'code', label: 'Mã BN', mono: true, code: true, width: 150, render: (r) => r.patientCode },
    {
      key: 'name', label: 'Họ tên',
      render: (r) => (
        <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.lastRoomName || '—'}</i></div>
      ),
    },
    {
      key: 'dx', label: 'Chẩn đoán gần nhất',
      render: (r) => r.lastDiagnosisCode ? (
        <div className="cell-2l"><b>{r.lastDiagnosisName}</b><i className="mono">{r.lastDiagnosisCode}</i></div>
      ) : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    { key: 'doctor', label: 'BS gần nhất', width: 180, render: (r) => r.lastDoctorName || '—' },
    { key: 'visits', label: 'Lượt KB', mono: true, width: 90, render: (r) => r.visits },
    { key: 'last', label: 'Lần cuối', mono: true, width: 110, render: (r) => fmtDMY(r.lastVisit) },
  ];

  return (
    <SimpleV2Page<PatientRecord>
      title="Hồ sơ bệnh án điện tử"
      load={async () => {
        const r = await searchExaminations({
          fromDate: dayjs().subtract(180, 'day').format('YYYY-MM-DD'),
          toDate:   dayjs().add(1, 'day').format('YYYY-MM-DD'),
          pageIndex: 1, pageSize: 300,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exams = ((r as any)?.data?.items || []) as ExaminationDto[];
        return groupByPatient(exams);
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã / chẩn đoán…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.lastDiagnosisName || ''} ${r.lastDiagnosisCode || ''}`}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayUpdated = rows.filter((r) => dayjs(r.lastVisit).isSame(today, 'day')).length;
        const withDx = rows.filter((r) => r.lastDiagnosisCode).length;
        const totalVisits = rows.reduce((s, r) => s + r.visits, 0);
        const avgVisits = rows.length > 0 ? Math.round(totalVisits / rows.length * 10) / 10 : 0;
        const multiVisit = rows.filter((r) => r.visits >= 2).length;
        return [
          { lbl: 'Tổng hồ sơ', val: rows.length, sub: 'đang theo dõi' },
          { lbl: 'Cập nhật hôm nay', val: todayUpdated, sub: 'có lượt khám', tone: 'info' },
          { lbl: 'Tổng lượt khám', val: totalVisits, sub: '180 ngày' },
          { lbl: 'Lượt KB / BN', val: avgVisits, sub: 'trung bình' },
          { lbl: 'Tái khám ≥2 lần', val: multiVisit, sub: 'BN', tone: 'warn' },
          { lbl: 'Có chẩn đoán', val: withDx, sub: 'đã ICD', tone: 'ok' },
        ];
      }}
      rowActions={(r) => (
        <div className="ab-actions">
          <ActBtn ic="eye" title="Mở hồ sơ" onClick={() => navigate('/emr')} />
          <ActBtn ic="print" title="In HS" onClick={() => message.success('Đã gửi PDF')} />
        </div>
      )}
      drawer={(r) => (
        <div style={{ padding: 18 }}>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
              <span>Lượt khám</span><b>{r.visits}</b>
              <span>Lần cuối</span><span className="mono">{fmtDMY(r.lastVisit)}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="stethoscope" size={11} /> LƯỢT KHÁM GẦN NHẤT</h5>
            <div className="rec-kv">
              <span>Phòng</span><b>{r.lastRoomName || '—'}</b>
              <span>Bác sĩ</span><span>{r.lastDoctorName || 'Chưa phân'}</span>
              <span>Chẩn đoán</span><span>{r.lastDiagnosisName || '—'}{r.lastDiagnosisCode ? ` (${r.lastDiagnosisCode})` : ''}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="info" size={11} /> THAO TÁC</h5>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="ab-btn primary" onClick={() => navigate('/emr')}>
                <TermIcon name="eye" size={12} /> Mở HS chi tiết
              </button>
              <button type="button" className="ab-btn" onClick={() => message.success('Đã gửi PDF')}>
                <TermIcon name="print" size={12} /> In hồ sơ
              </button>
              <button type="button" className="ab-btn" onClick={() => navigate('/v2/signing-workflow')}>
                <TermIcon name="check" size={12} /> Ký số
              </button>
            </div>
          </div>
        </div>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.patientCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.visits} lượt khám · lần cuối ${fmtDMY(r.lastVisit)}`}
    />
  );
};

export default EMRV2;
