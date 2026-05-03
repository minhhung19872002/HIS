import React from 'react';
import dayjs from 'dayjs';
import { getTbHivRecords } from '../api/tbHivManagement';
import type { TbHivRecordDto } from '../api/tbHivManagement';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

type StatusKey = 'onTreatment' | 'completed' | 'failed' | 'defaulted' | 'died';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'onTreatment', l: 'Đang điều trị', tone: 'ok' },
  { v: 'completed',   l: 'Hoàn thành',    tone: 'ok' },
  { v: 'failed',      l: 'Thất bại',      tone: 'crit' },
  { v: 'defaulted',   l: 'Bỏ trị',        tone: 'warn' },
  { v: 'died',        l: 'Tử vong',       tone: 'crit' },
];
const statusKey = (s: number): StatusKey => {
  if (s === 1) return 'completed';
  if (s === 2) return 'failed';
  if (s === 3) return 'defaulted';
  if (s === 4) return 'died';
  return 'onTreatment';
};
const TYPE_LABEL: Record<number, string> = { 0: 'TB', 1: 'HIV', 2: 'TB+HIV' };
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const TbHivManagementV2: React.FC = () => {
  const columns: ColumnDef<TbHivRecordDto>[] = [
    { key: 'code', label: 'Mã ĐK', mono: true, width: 130, render: (r) => r.registrationCode },
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
      key: 'type', label: 'Loại', width: 90,
      render: (r) => <span className={`chip ${r.recordType === 2 ? 'crit' : 'info'}`}>{TYPE_LABEL[r.recordType]}</span>,
    },
    { key: 'regimen', label: 'Phác đồ', render: (r) => r.regimen || '—' },
    { key: 'month', label: 'Tháng ĐT', mono: true, width: 90, render: (r) => `T${r.treatmentMonth || 0}` },
    {
      key: 'sputum', label: 'AFB', mono: true, width: 100,
      render: (r) => r.sputumSmearResult ? <span className="chip warn">{r.sputumSmearResult}</span> : '—',
    },
    { key: 'cd4', label: 'CD4', mono: true, width: 90, render: (r) => r.cd4Count ? `${r.cd4Count}` : '—' },
    { key: 'doctor', label: 'Bác sĩ', render: (r) => r.doctorName || '—' },
    { key: 'start', label: 'Bắt đầu', mono: true, width: 100, render: (r) => fmtDMY(r.startDate) },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<TbHivRecordDto>
      title="Bệnh nhân TB/HIV"
      load={async () => (await getTbHivRecords({ pageSize: 200 })).items}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã ĐK / phác đồ…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.registrationCode} ${r.regimen}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[
        {
          key: 'type', placeholder: '▾ Loại HS',
          options: [{ v: '0', l: 'TB' }, { v: '1', l: 'HIV' }, { v: '2', l: 'TB+HIV' }],
          valueOf: (r) => String(r.recordType),
        },
      ]}
      kpis={(rows) => {
        const tb = rows.filter((r) => r.recordType === 0).length;
        const hiv = rows.filter((r) => r.recordType === 1).length;
        const co = rows.filter((r) => r.recordType === 2).length;
        const onTreat = rows.filter((r) => r.status === 0).length;
        const defaulted = rows.filter((r) => r.status === 3).length;
        return [
          { lbl: 'Tổng HS', val: rows.length, sub: 'tất cả' },
          { lbl: 'TB đơn thuần', val: tb, sub: 'lao' },
          { lbl: 'HIV đơn thuần', val: hiv, sub: 'AIDS' },
          { lbl: 'TB+HIV', val: co, sub: 'đồng nhiễm', tone: 'crit' },
          { lbl: 'Đang điều trị', val: onTreat, tone: 'ok' },
          { lbl: 'Bỏ trị', val: defaulted, tone: 'warn' },
        ];
      }}
      drawer={(r) => <TbHivDrawerBody r={r} />}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.registrationCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${TYPE_LABEL[r.recordType]} · ${r.regimen} · BĐ ${fmtDMY(r.startDate)}`}
    />
  );
};

const TbHivDrawerBody: React.FC<{ r: TbHivRecordDto }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
      <div className="rec-kv">
        <span>Họ tên</span><b>{r.patientName}</b>
        <span>Mã BN</span><span className="mono">{r.patientCode}</span>
        <span>Mã ĐK chương trình</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.registrationCode}</span>
        {r.phoneNumber && (<><span>Điện thoại</span><span className="mono">{r.phoneNumber}</span></>)}
        {r.address && (<><span>Địa chỉ</span><span>{r.address}</span></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="activity" size={11} /> ĐIỀU TRỊ</h5>
      <div className="rec-kv">
        <span>Loại HS</span><b>{TYPE_LABEL[r.recordType]}</b>
        <span>Phác đồ</span><b>{r.regimen}</b>
        <span>Bắt đầu</span><span>{fmtDMY(r.startDate)}</span>
        <span>Tháng ĐT</span><span>T{r.treatmentMonth || 0}</span>
        {r.artRegimen && (<><span>Phác đồ ART</span><b>{r.artRegimen}</b></>)}
      </div>
    </div>
    {(r.sputumSmearResult || r.geneXpertResult) && (
      <div className="rec-section">
        <h5><TermIcon name="flask" size={11} /> XN LAO</h5>
        <div className="rec-kv">
          {r.sputumSmearResult && (<><span>AFB đờm</span><span className="chip warn">{r.sputumSmearResult}</span></>)}
          {r.geneXpertResult && (<><span>GeneXpert</span><span className="chip warn">{r.geneXpertResult}</span></>)}
        </div>
      </div>
    )}
    {(r.cd4Count != null || r.viralLoad != null) && (
      <div className="rec-section">
        <h5><TermIcon name="flask" size={11} /> XN HIV</h5>
        <div className="rec-kv">
          {r.cd4Count != null && (<><span>CD4</span><b className="mono">{r.cd4Count} cells</b></>)}
          {r.viralLoad != null && (<><span>Viral Load</span><b className="mono">{r.viralLoad} copies/ml</b></>)}
        </div>
      </div>
    )}
    {r.notes && (
      <div className="rec-section">
        <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
        <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.notes}</div>
      </div>
    )}
  </>
);

export default TbHivManagementV2;
