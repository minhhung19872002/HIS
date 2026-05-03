import React from 'react';
import dayjs from 'dayjs';
import { searchPatients } from '../api/hivManagement';
import type { HivPatient } from '../api/hivManagement';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* HIV/AIDS management v2 */

type StatusKey = 'active' | 'transferred' | 'lost' | 'deceased';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',      l: 'Đang điều trị', tone: 'ok' },
  { v: 'transferred', l: 'Đã chuyển',     tone: 'info' },
  { v: 'lost',        l: 'Mất dấu',       tone: 'warn' },
  { v: 'deceased',    l: 'Tử vong',       tone: 'crit' },
];
const statusKey = (s: number): StatusKey => {
  if (s === 1) return 'transferred';
  if (s === 2) return 'deceased';
  if (s === 3) return 'lost';
  return 'active';
};
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const HivManagementV2: React.FC = () => {
  const columns: ColumnDef<HivPatient>[] = [
    { key: 'code', label: 'Mã HIV', mono: true, width: 130, render: (r) => r.hivCode || r.patientCode },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.fullName}</b>
          <i className="mono">{r.patientCode} · {r.gender === 1 ? 'Nam' : 'Nữ'} · {r.dateOfBirth ? dayjs().diff(dayjs(r.dateOfBirth), 'year') + 't' : '—'}</i>
        </div>
      ),
    },
    {
      key: 'art', label: 'ART', width: 130,
      render: (r) => <span className={`chip ${r.artStatus === 'OnART' ? 'ok' : 'warn'}`}>{r.artStatus}</span>,
    },
    {
      key: 'stage', label: 'WHO', width: 70, mono: true,
      render: (r) => <span className={`chip ${r.whoStage >= 3 ? 'crit' : r.whoStage === 2 ? 'warn' : 'info'}`}>{r.whoStage}</span>,
    },
    { key: 'cd4', label: 'CD4', mono: true, width: 90,
      render: (r) => r.lastCd4Count ? `${r.lastCd4Count} cells` : '—' },
    { key: 'vl', label: 'VL', mono: true, width: 110,
      render: (r) => r.lastViralLoad != null
        ? <span style={{ color: r.viralSuppressed ? '#15803d' : 'var(--s-warn)' }}>{r.lastViralLoad}</span>
        : '—' },
    {
      key: 'coinfection', label: 'Đồng nhiễm', width: 130,
      render: (r) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {r.tbCoinfection && <span className="chip warn">TB</span>}
          {r.hbvCoinfection && <span className="chip warn">HBV</span>}
          {r.hcvCoinfection && <span className="chip warn">HCV</span>}
          {!r.tbCoinfection && !r.hbvCoinfection && !r.hcvCoinfection && <span style={{ color: 'var(--t-3)' }}>—</span>}
        </div>
      ),
    },
    { key: 'doctor', label: 'BS phụ trách', render: (r) => r.assignedDoctorName || '—' },
    {
      key: 'next', label: 'Hẹn tiếp', mono: true, width: 100,
      render: (r) => fmtDMY(r.nextAppointmentDate),
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
    <SimpleV2Page<HivPatient>
      title="Bệnh nhân HIV"
      load={() => searchPatients()}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm tên BN / mã HIV / CCCD…"
      searchOf={(r) => `${r.fullName} ${r.patientCode} ${r.hivCode} ${r.cccd || ''} ${r.phone || ''}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      filters={[
        {
          key: 'art', placeholder: '▾ ART status',
          options: [
            { v: 'OnART', l: 'Đang ART' },
            { v: 'PreART', l: 'Tiền ART' },
            { v: 'Interrupted', l: 'Gián đoạn' },
          ],
          valueOf: (r) => r.artStatus,
        },
      ]}
      kpis={(rows) => {
        const onArt = rows.filter((r) => r.artStatus === 'OnART').length;
        const suppressed = rows.filter((r) => r.viralSuppressed).length;
        const tbCoinfected = rows.filter((r) => r.tbCoinfection).length;
        const pmtct = rows.filter((r) => r.pmtctEnrolled).length;
        const lost = rows.filter((r) => r.status === 3).length;
        return [
          { lbl: 'Tổng BN', val: rows.length, sub: 'đăng ký' },
          { lbl: 'Đang ART', val: onArt, sub: rows.length > 0 ? `${Math.round(onArt / rows.length * 100)}%` : '—', tone: 'ok' },
          { lbl: 'VL ức chế', val: suppressed, sub: '<200 copies', tone: 'ok' },
          { lbl: 'Đồng nhiễm TB', val: tbCoinfected, sub: 'cần theo dõi', tone: 'warn' },
          { lbl: 'PMTCT', val: pmtct, sub: 'thai phụ' },
          { lbl: 'Mất dấu', val: lost, sub: 'cần liên hệ', tone: 'crit' },
        ];
      }}
      drawer={(r) => <HivPatientDrawerBody r={r} />}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.hivCode || r.patientCode}</span>
          <span style={{ fontSize: 14 }}>{r.fullName}</span>
        </span>
      )}
      drawerSub={(r) => `WHO ${r.whoStage} · ${r.artStatus} · CĐ ${fmtDMY(r.diagnosisDate)}`}
    />
  );
};

const HivPatientDrawerBody: React.FC<{ r: HivPatient }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
      <div className="rec-kv">
        <span>Họ tên</span><b>{r.fullName}</b>
        <span>Mã BN</span><span className="mono">{r.patientCode}</span>
        <span>Mã HIV</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.hivCode || '—'}</span>
        <span>Giới · Tuổi</span><span>{r.gender === 1 ? 'Nam' : 'Nữ'} · {r.dateOfBirth ? dayjs().diff(dayjs(r.dateOfBirth), 'year') : '—'}t</span>
        {r.phone && (<><span>Điện thoại</span><span className="mono">{r.phone}</span></>)}
        {r.cccd && (<><span>CCCD</span><span className="mono">{r.cccd}</span></>)}
        {r.address && (<><span>Địa chỉ</span><span>{r.address}</span></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="activity" size={11} /> ĐIỀU TRỊ ART</h5>
      <div className="rec-kv">
        <span>Trạng thái ART</span><span><span className="chip ok">{r.artStatus}</span></span>
        <span>Phác đồ</span><b>{r.currentRegimen || '—'}</b>
        <span>Bắt đầu ART</span><span>{fmtDMY(r.artStartDate)}</span>
        <span>Giai đoạn WHO</span><b>{r.whoStage}</b>
        <span>Tuân thủ</span><span className={`chip ${r.adherenceStatus === 'Good' ? 'ok' : r.adherenceStatus === 'Fair' ? 'warn' : 'crit'}`}>{r.adherenceStatus}</span>
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="flask" size={11} /> KẾT QUẢ XN GẦN NHẤT</h5>
      <div className="rec-kv">
        <span>CD4</span><b className="mono">{r.lastCd4Count || '—'} cells</b>
        <span>Ngày XN CD4</span><span>{fmtDMY(r.lastCd4Date)}</span>
        <span>Viral Load</span>
        <b className="mono" style={{ color: r.viralSuppressed ? '#15803d' : 'var(--s-warn)' }}>{r.lastViralLoad || '—'} copies/ml</b>
        <span>Ngày XN VL</span><span>{fmtDMY(r.lastViralLoadDate)}</span>
        <span>Ức chế virus</span>
        <span>{r.viralSuppressed ? <span className="chip ok">Đã ức chế</span> : <span className="chip warn">Chưa ức chế</span>}</span>
      </div>
    </div>
    {(r.tbCoinfection || r.hbvCoinfection || r.hcvCoinfection || r.isPregnant) && (
      <div className="rec-section">
        <h5><TermIcon name="alert" size={11} /> ĐỒNG NHIỄM / ĐẶC BIỆT</h5>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {r.tbCoinfection && <span className="chip warn">Đồng nhiễm TB</span>}
          {r.hbvCoinfection && <span className="chip warn">Đồng nhiễm HBV</span>}
          {r.hcvCoinfection && <span className="chip warn">Đồng nhiễm HCV</span>}
          {r.isPregnant && <span className="chip info">Đang mang thai</span>}
          {r.pmtctEnrolled && <span className="chip ok">PMTCT</span>}
        </div>
      </div>
    )}
    <div className="rec-section">
      <h5><TermIcon name="stethoscope" size={11} /> CHĂM SÓC</h5>
      <div className="rec-kv">
        <span>BS phụ trách</span><span>{r.assignedDoctorName || '—'}</span>
        <span>Cơ sở</span><span>{r.facilityName || '—'}</span>
        <span>Hẹn tiếp</span><span>{fmtDMY(r.nextAppointmentDate)}</span>
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

export default HivManagementV2;
