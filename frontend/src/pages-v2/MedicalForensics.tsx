import React from 'react';
import dayjs from 'dayjs';
import { searchCases } from '../api/forensic';
import type { ForensicCase } from '../api/forensic';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'pending' | 'examining' | 'completed' | 'approved';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',   l: 'Chờ giám định', tone: 'warn' },
  { v: 'examining', l: 'Đang giám định', tone: 'warn' },
  { v: 'completed', l: 'Hoàn tất',      tone: 'ok' },
  { v: 'approved',  l: 'Đã duyệt',      tone: 'ok' },
];
const statusKey = (s: number): StatusKey => s === 0 ? 'pending' : s === 1 ? 'examining' : s === 2 ? 'completed' : 'approved';
const TYPE_LABEL: Record<string, string> = {
  disability: 'Tỉ lệ tổn thương', driver: 'Lái xe', employment: 'Tuyển dụng', insurance: 'Bảo hiểm', court: 'Tố tụng',
};
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const MedicalForensicsV2: React.FC = () => {
  const columns: ColumnDef<ForensicCase>[] = [
    { key: 'code', label: 'Mã GĐ', mono: true, width: 130, render: (r) => r.caseCode },
    { key: 'patient', label: 'Đối tượng', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
    )},
    { key: 'type', label: 'Loại', width: 160, render: (r) => <span className="chip info">{TYPE_LABEL[r.caseType] || r.caseType}</span> },
    { key: 'org', label: 'Tổ chức yêu cầu', render: (r) => r.requestingOrganization },
    { key: 'purpose', label: 'Mục đích', render: (r) => r.purpose },
    { key: 'date', label: 'Ngày YC', mono: true, width: 100, render: (r) => fmtDMY(r.requestDate) },
    { key: 'pct', label: 'Tỉ lệ', mono: true, width: 80, render: (r) => r.disabilityPercent != null ? `${r.disabilityPercent}%` : '—' },
    { key: 'examiner', label: 'BS giám định', width: 180, render: (r) => r.examinerName || '—' },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<ForensicCase>
      title="Hồ sơ giám định pháp y"
      load={() => searchCases()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm tên / mã / tổ chức / mục đích…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.caseCode} ${r.requestingOrganization} ${r.purpose}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[{
        key: 'type', placeholder: '▾ Loại',
        options: Object.entries(TYPE_LABEL).map(([v, l]) => ({ v, l })),
        valueOf: (r) => r.caseType,
      }]}
      kpis={(rows) => [
        { lbl: 'Tổng HS', val: rows.length },
        { lbl: 'Chờ GĐ', val: rows.filter((r) => r.status === 0).length, tone: 'warn' },
        { lbl: 'Đang GĐ', val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
        { lbl: 'Hoàn tất', val: rows.filter((r) => r.status === 2).length, tone: 'ok' },
        { lbl: 'Đã duyệt', val: rows.filter((r) => r.status === 3).length, tone: 'ok' },
        { lbl: 'TB tổn thương', val: rows.filter((r) => r.disabilityPercent).length > 0
          ? Math.round(rows.reduce((s, r) => s + (r.disabilityPercent || 0), 0) / rows.filter((r) => r.disabilityPercent).length)
          : 0, unit: '%' },
      ]}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> ĐỐI TƯỢNG</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã</span><span className="mono">{r.patientCode}</span>
              <span>Mã GĐ</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.caseCode}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="file-text" size={11} /> YÊU CẦU GIÁM ĐỊNH</h5>
            <div className="rec-kv">
              <span>Loại</span><b>{TYPE_LABEL[r.caseType]}</b>
              <span>Tổ chức YC</span><span>{r.requestingOrganization}</span>
              <span>Mục đích</span><span>{r.purpose}</span>
              <span>Ngày YC</span><span>{fmtDMY(r.requestDate)}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="check" size={11} /> KẾT QUẢ</h5>
            <div className="rec-kv">
              <span>BS giám định</span><span>{r.examinerName || '—'}</span>
              {r.disabilityPercent != null && (<><span>Tỉ lệ tổn thương</span><b>{r.disabilityPercent}%</b></>)}
              {r.conclusion && (<><span>Kết luận</span><span>{r.conclusion}</span></>)}
              {r.approvedBy && (<><span>Người duyệt</span><span>{r.approvedBy} · {fmtDMY(r.approvedAt)}</span></>)}
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
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.caseCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${TYPE_LABEL[r.caseType]} · ${r.requestingOrganization}`}
    />
  );
};

export default MedicalForensicsV2;
