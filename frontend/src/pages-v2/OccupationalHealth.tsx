import React from 'react';
import dayjs from 'dayjs';
import { searchOccExams } from '../api/occupationalHealth';
import type { OccExam } from '../api/occupationalHealth';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'pending' | 'inProgress' | 'completed' | 'certified';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',    l: 'Chờ khám',  tone: 'info' },
  { v: 'inProgress', l: 'Đang khám', tone: 'warn' },
  { v: 'completed',  l: 'Hoàn tất',  tone: 'ok' },
  { v: 'certified',  l: 'Đã cấp GCN', tone: 'ok' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'inProgress' : s === 2 ? 'completed' : s === 3 ? 'certified' : 'pending';
const TYPE_LABEL: Record<string, string> = {
  periodic: 'Định kỳ', preEmployment: 'Trước tuyển', postExposure: 'Sau phơi nhiễm',
};
const CLASS_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { pass: 'ok', restricted: 'warn', fail: 'crit' };
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const OccupationalHealthV2: React.FC = () => {
  const columns: ColumnDef<OccExam>[] = [
    { key: 'code', label: 'Mã khám', mono: true, width: 130, render: (r) => r.examCode },
    { key: 'patient', label: 'Người lao động', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode} · {r.gender === 1 ? 'Nam' : 'Nữ'}</i></div>
    )},
    { key: 'company', label: 'Công ty / Bộ phận', render: (r) => (
      <div className="cell-2l"><b>{r.companyName}</b><i>{r.department} · {r.occupation}</i></div>
    )},
    { key: 'type', label: 'Loại khám', width: 130, render: (r) =>
      <span className="chip info">{TYPE_LABEL[r.examType] || r.examType}</span>
    },
    { key: 'hazards', label: 'Yếu tố nguy cơ', width: 180, render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(r.hazardTypes || []).slice(0, 3).map((h) => <span key={h} className="chip warn">{h}</span>)}
        {(r.hazardTypes || []).length > 3 && <span style={{ color: 'var(--t-3)' }}>+{r.hazardTypes.length - 3}</span>}
      </div>
    )},
    { key: 'date', label: 'Ngày khám', mono: true, width: 100, render: (r) => fmtDMY(r.examDate) },
    { key: 'class', label: 'Phân loại', width: 110, render: (r) =>
      r.classification ? <span className={`chip ${CLASS_TONE[r.classification] || 'info'}`}>{r.classification}</span> : '—'
    },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<OccExam>
      title="Khám sức khỏe nghề nghiệp"
      load={() => searchOccExams()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm tên / mã / công ty…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.examCode} ${r.companyName} ${r.occupation}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[{
        key: 'type', placeholder: '▾ Loại khám',
        options: Object.entries(TYPE_LABEL).map(([v, l]) => ({ v, l })),
        valueOf: (r) => r.examType,
      }]}
      kpis={(rows) => {
        const disease = rows.filter((r) => r.occupationalDisease).length;
        const restricted = rows.filter((r) => r.classification === 'restricted' || r.classification === 'fail').length;
        const companies = new Set(rows.map((r) => r.companyName)).size;
        return [
          { lbl: 'Tổng khám', val: rows.length },
          { lbl: 'Đang khám', val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
          { lbl: 'Cần TD', val: restricted, tone: 'warn' },
          { lbl: 'Bệnh NN', val: disease, sub: 'phát hiện', tone: 'crit' },
          { lbl: 'Đã cấp GCN', val: rows.filter((r) => r.status === 3).length, tone: 'ok' },
          { lbl: 'Số đơn vị', val: companies },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> NGƯỜI LAO ĐỘNG</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã</span><span className="mono">{r.patientCode}</span>
              <span>Mã khám</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.examCode}</span>
              <span>Giới tính</span><span>{r.gender === 1 ? 'Nam' : 'Nữ'}</span>
              <span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="activity" size={11} /> ĐƠN VỊ / NGHỀ NGHIỆP</h5>
            <div className="rec-kv">
              <span>Công ty</span><b>{r.companyName}</b>
              <span>Mã CT</span><span className="mono">{r.companyCode}</span>
              <span>Bộ phận</span><span>{r.department}</span>
              <span>Nghề nghiệp</span><span>{r.occupation}</span>
              <span>Số năm phơi nhiễm</span><b>{r.yearsOfExposure} năm</b>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="alert" size={11} /> YẾU TỐ NGUY CƠ</h5>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(r.hazardTypes || []).map((h) => <span key={h} className="chip warn">{h}</span>)}
              {(r.hazardTypes || []).length === 0 && <span style={{ color: 'var(--t-3)' }}>Không có</span>}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="flask" size={11} /> KẾT QUẢ KHÁM</h5>
            <div className="rec-kv">
              <span>Loại khám</span><b>{TYPE_LABEL[r.examType]}</b>
              <span>Ngày khám</span><span>{fmtDMY(r.examDate)}</span>
              <span>BS khám</span><span>{r.examDoctor}</span>
              {r.spirometryResult && (<><span>Hô hấp ký</span><span>{r.spirometryResult}</span></>)}
              {r.audiometryResult && (<><span>Thính lực</span><span>{r.audiometryResult}</span></>)}
              {r.bloodLeadLevel && (<><span>Chì máu</span><span>{r.bloodLeadLevel} µg/dL</span></>)}
              {r.classification && (<><span>Phân loại SK</span><span className={`chip ${CLASS_TONE[r.classification]}`}>{r.classification}</span></>)}
              {r.occupationalDisease && (<><span>Bệnh NN</span><b style={{ color: 'var(--s-crit)' }}>{r.occupationalDisease}</b></>)}
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
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.examCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.companyName} · ${r.occupation}`}
    />
  );
};

export default OccupationalHealthV2;
