import React from 'react';
import dayjs from 'dayjs';
import { getPathologyRequests } from '../api/pathology';
import type { PathologyRequest } from '../api/pathology';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'pending' | 'grossing' | 'processing' | 'completed' | 'verified';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',    l: 'Chờ nhận mẫu', tone: 'info' },
  { v: 'grossing',   l: 'Cắt đại thể',  tone: 'warn' },
  { v: 'processing', l: 'Xử lý mô',      tone: 'warn' },
  { v: 'completed',  l: 'Hoàn tất',     tone: 'ok' },
  { v: 'verified',   l: 'Đã duyệt',     tone: 'ok' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'grossing' : s === 2 ? 'processing' : s === 3 ? 'completed' : s === 4 ? 'verified' : 'pending';
const SPECIMEN_LABEL: Record<string, string> = {
  biopsy: 'Sinh thiết', cytology: 'Tế bào học', pap: 'Pap', frozenSection: 'Cắt lạnh',
};
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const PathologyV2: React.FC = () => {
  const columns: ColumnDef<PathologyRequest>[] = [
    { key: 'code', label: 'Mã GPB', mono: true, width: 130, render: (r) => r.requestCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
    )},
    { key: 'specimen', label: 'Bệnh phẩm', render: (r) => (
      <div className="cell-2l">
        <b>{SPECIMEN_LABEL[r.specimenType] || r.specimenType}</b>
        <i>{r.specimenSite}</i>
      </div>
    )},
    { key: 'dx', label: 'CĐ lâm sàng', render: (r) => r.clinicalDiagnosis },
    { key: 'doctor', label: 'BS chỉ định', width: 200, render: (r) => r.requestingDoctor || '—' },
    { key: 'date', label: 'Ngày YC', mono: true, width: 100, render: (r) => fmtDMY(r.requestDate) },
    { key: 'priority', label: 'Ưu tiên', width: 90, render: (r) =>
      <span className={`chip ${r.priority === 'urgent' ? 'crit' : 'info'}`}>{r.priority === 'urgent' ? 'Khẩn' : 'Thường'}</span>
    },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    }},
  ];

  return (
    <SimpleV2Page<PathologyRequest>
      title="Phiếu giải phẫu bệnh"
      load={async () => {
        const r = await getPathologyRequests();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Array.isArray(r) ? r : ((r as any)?.items || []);
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã GPB / chẩn đoán…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.requestCode} ${r.clinicalDiagnosis}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[{
        key: 'specimen', placeholder: '▾ Loại mẫu',
        options: Object.entries(SPECIMEN_LABEL).map(([v, l]) => ({ v, l })),
        valueOf: (r) => r.specimenType,
      }]}
      kpis={(rows) => {
        const urgent = rows.filter((r) => r.priority === 'urgent').length;
        return [
          { lbl: 'Tổng phiếu', val: rows.length },
          { lbl: 'Chờ nhận', val: rows.filter((r) => r.status === 0).length, tone: 'info' },
          { lbl: 'Đang xử lý', val: rows.filter((r) => r.status >= 1 && r.status <= 2).length, tone: 'warn' },
          { lbl: 'Hoàn tất', val: rows.filter((r) => r.status === 3).length, tone: 'ok' },
          { lbl: 'Đã duyệt', val: rows.filter((r) => r.status === 4).length, tone: 'ok' },
          { lbl: 'Khẩn', val: urgent, tone: urgent > 0 ? 'crit' : 'ok' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
            <div className="rec-kv">
              <span>Họ tên</span><b>{r.patientName}</b>
              <span>Mã BN</span><span className="mono">{r.patientCode}</span>
              <span>Mã GPB</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.requestCode}</span>
              {r.gender && (<><span>Giới tính</span><span>{r.gender === 1 ? 'Nam' : 'Nữ'}</span></>)}
              {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="flask" size={11} /> BỆNH PHẨM</h5>
            <div className="rec-kv">
              <span>Loại mẫu</span><b>{SPECIMEN_LABEL[r.specimenType]}</b>
              <span>Vị trí lấy</span><span>{r.specimenSite}</span>
              <span>Ưu tiên</span><span className={`chip ${r.priority === 'urgent' ? 'crit' : 'info'}`}>{r.priority === 'urgent' ? 'Khẩn' : 'Thường'}</span>
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="stethoscope" size={11} /> CHỈ ĐỊNH</h5>
            <div className="rec-kv">
              <span>BS chỉ định</span><span>{r.requestingDoctor}</span>
              <span>Khoa</span><span>{r.departmentName || '—'}</span>
              <span>CĐ lâm sàng</span><span>{r.clinicalDiagnosis}</span>
              <span>Ngày YC</span><span>{fmtDMY(r.requestDate)}</span>
            </div>
          </div>
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.requestCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${SPECIMEN_LABEL[r.specimenType]} · ${r.specimenSite}`}
    />
  );
};

export default PathologyV2;
