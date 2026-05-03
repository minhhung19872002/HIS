import React from 'react';
import dayjs from 'dayjs';
import { searchSchoolExams } from '../api/schoolHealth';
import type { SchoolExam } from '../api/schoolHealth';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'pending' | 'completed' | 'needsFollowUp';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',         l: 'Chờ khám',     tone: 'info' },
  { v: 'completed',       l: 'Đã khám',      tone: 'ok' },
  { v: 'needsFollowUp',   l: 'Cần theo dõi', tone: 'warn' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'completed' : s === 2 ? 'needsFollowUp' : 'pending';
const NUTRITION_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  normal: 'ok', underweight: 'warn', overweight: 'warn', obese: 'crit', stunted: 'crit',
};
const NUTRITION_LABEL: Record<string, string> = {
  normal: 'Bình thường', underweight: 'Suy DD', overweight: 'Thừa cân', obese: 'Béo phì', stunted: 'Thấp còi',
};
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const SchoolHealthV2: React.FC = () => {
  const columns: ColumnDef<SchoolExam>[] = [
    { key: 'student', label: 'Học sinh', render: (r) => (
      <div className="cell-2l">
        <b>{r.studentName}</b>
        <i className="mono">{r.studentCode} · {r.gender === 1 ? 'Nam' : 'Nữ'}</i>
      </div>
    )},
    { key: 'school', label: 'Trường · Lớp', render: (r) => (
      <div className="cell-2l"><b>{r.schoolName}</b><i>{r.grade} · {r.className} · {r.academicYear}</i></div>
    )},
    { key: 'bmi', label: 'BMI', mono: true, width: 130, render: (r) =>
      <span style={{ color: r.bmi >= 25 ? 'var(--s-warn)' : r.bmi < 18 ? 'var(--s-warn)' : 'var(--t-1)' }}>
        {r.bmi?.toFixed(1)} ({r.height}/{r.weight}kg)
      </span>
    },
    { key: 'nutrition', label: 'Dinh dưỡng', width: 130, render: (r) =>
      <span className={`chip ${NUTRITION_TONE[r.nutritionStatus] || 'info'}`}>{NUTRITION_LABEL[r.nutritionStatus] || r.nutritionStatus}</span>
    },
    { key: 'flags', label: 'Phát hiện', width: 200, render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {r.visionFlag && <span className="chip warn">Mắt</span>}
        {r.hearingFlag && <span className="chip warn">Tai</span>}
        {r.dentalFlag && <span className="chip warn">Răng</span>}
        {r.scoliosisFlag && <span className="chip crit">Cong vẹo</span>}
        {!r.visionFlag && !r.hearingFlag && !r.dentalFlag && !r.scoliosisFlag &&
          <span style={{ color: 'var(--t-3)' }}>—</span>}
      </div>
    )},
    { key: 'date', label: 'Ngày khám', mono: true, width: 100, render: (r) => fmtDMY(r.examDate) },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<SchoolExam>
      title="Khám sức khỏe học đường"
      load={() => searchSchoolExams()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm HS / mã / trường / lớp…"
      searchOf={(r) => `${r.studentName} ${r.studentCode} ${r.schoolName} ${r.className}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => {
        const followup = rows.filter((r) => r.status === 2).length;
        const flagged = rows.filter((r) => r.visionFlag || r.hearingFlag || r.dentalFlag || r.scoliosisFlag).length;
        const malnutrition = rows.filter((r) => r.nutritionStatus !== 'normal').length;
        const schools = new Set(rows.map((r) => r.schoolName)).size;
        return [
          { lbl: 'Tổng HS', val: rows.length },
          { lbl: 'Đã khám', val: rows.filter((r) => r.status === 1).length, tone: 'ok' },
          { lbl: 'Cần TD', val: followup, tone: 'warn' },
          { lbl: 'Có vấn đề', val: flagged, tone: 'warn' },
          { lbl: 'DD bất thường', val: malnutrition, tone: 'warn' },
          { lbl: 'Trường khám', val: schools },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> HỌC SINH</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.studentName}</b>
              <span>Mã HS</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.studentCode}</span>
              <span>Giới tính</span><span>{r.gender === 1 ? 'Nam' : 'Nữ'}</span>
              <span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span>
              <span>Trường</span><b>{r.schoolName}</b>
              <span>Lớp</span><span>{r.grade} · {r.className} · {r.academicYear}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="activity" size={11} /> NHÂN TRẮC</h5>
            <div className="rec-kv">
              <span>Cao</span><b>{r.height} cm</b>
              <span>Cân</span><b>{r.weight} kg</b>
              <span>BMI</span><b>{r.bmi?.toFixed(1)}</b>
              <span>Dinh dưỡng</span><span className={`chip ${NUTRITION_TONE[r.nutritionStatus]}`}>{NUTRITION_LABEL[r.nutritionStatus]}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="flask" size={11} /> KHÁM CHUYÊN KHOA</h5>
            <div className="rec-kv">
              <span>Thị lực</span><span>L: {r.visionLeft} · R: {r.visionRight} {r.visionFlag && <span className="chip warn">Bất thường</span>}</span>
              <span>Thính lực</span><span>{r.hearingFlag ? <span className="chip warn">Bất thường</span> : 'Bình thường'}</span>
              <span>Răng miệng</span><span>{r.dentalFlag ? <span className="chip warn">Bất thường</span> : 'Bình thường'}</span>
              <span>Cong vẹo CS</span><span>{r.scoliosisFlag ? <span className="chip crit">Có</span> : 'Không'}</span>
            </div>
          </div>
          {r.recommendations && (
            <div className="rec-section">
              <h5><TermIcon name="info" size={11} /> KHUYẾN NGHỊ</h5>
              <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.recommendations}</div>
            </div>
          )}
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.studentCode}</span>
          <span style={{ fontSize: 14 }}>{r.studentName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.schoolName} · ${r.grade}-${r.className}`}
    />
  );
};

export default SchoolHealthV2;
