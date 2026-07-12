import React, { useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import type { AxiosError } from 'axios';
import * as surgeryApi from '../api/surgery';
import type { SurgeryDto, SurgeryTeamMemberDto } from '../api/surgery';
import type { ServerValidationError } from '../../../utils/formError';
import { SimpleV2Page, StatusBadge, ActBtn, Btn, type ColumnDef, type StatusTab } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { SurgeryCabinetIssueModal } from '../../../pages-v2/shared/SurgeryCabinetIssueModal';
import { PreAnesthesiaModal, AnesthesiaMonitorModal, ConsentModal, PostAnesthesiaPlanModal } from '../../../pages-v2/shared/SurgeryFormModals';
import { openPrintWindow } from '../../../utils/printWindow';
import { buildSurgeryRecordHtml } from '../../../pages/surgery/printTemplates';
import { HOSPITAL_NAME } from '../../../constants/hospital';

/* Phẫu thuật v2 — port of OR v2.html */

type StatusKey = 'scheduled' | 'preop' | 'ongoing' | 'recovery' | 'completed' | 'cancelled';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch', tone: 'info' },
  { v: 'preop',     l: 'Tiền phẫu',   tone: 'warn' },
  { v: 'ongoing',   l: 'Đang mổ',     tone: 'crit' },
  { v: 'recovery',  l: 'Hồi tỉnh',    tone: 'warn' },
  { v: 'completed', l: 'Hoàn tất',    tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',         tone: 'crit' },
];
// Backend Status: 0 Pending/Scheduled · 1 Preop · 2 Ongoing · 3 Recovery · 4 Completed · 5 Cancelled
const statusKey = (s: number): StatusKey =>
  s === 1 ? 'preop' : s === 2 ? 'ongoing' : s === 3 ? 'recovery' : s === 4 ? 'completed' : s === 5 ? 'cancelled' : 'scheduled';
const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';

const SurgeryV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  // Refresh closure for action buttons (SimpleV2Page passes reload to actions)
  const [reloadVer, setReloadVer] = useState(0);

  const onCancel = async (r: SurgeryDto, reload: () => void) => {
    try {
      await surgeryApi.cancelSurgery(r.id, 'Hủy từ giao diện quản trị');
      message.warning(`Đã hủy ca · ${r.surgeryCode}`);
      reload();
    } catch {
      message.error('Hủy thất bại');
    }
  };

  const onApprove = async (r: SurgeryDto, reload: () => void) => {
    try {
      await surgeryApi.approveSurgery({ surgeryId: r.id, isApproved: true });
      message.success(`Đã duyệt ca · ${r.surgeryCode}`);
      reload();
    } catch (e: unknown) {
      const ax = e as AxiosError<ServerValidationError>;
      message.error(ax?.response?.data?.message || 'Duyệt thất bại');
    }
  };

  const columns: ColumnDef<SurgeryDto>[] = [
    {
      key: 'time', label: 'Giờ mổ', mono: true, width: 80,
      render: (r) => <b>{fmtHM(r.scheduledDate || r.startTime)}</b>,
    },
    { key: 'code', label: 'Mã CM', mono: true, width: 130, render: (r) => r.surgeryCode },
    { key: 'room', label: 'Phòng', mono: true, width: 110, render: (r) => r.operatingRoomName || '—' },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {r.gender || '—'}</i>
        </div>
      ),
    },
    {
      key: 'proc', label: 'Phẫu thuật',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.surgeryServiceName}</b>
          <i className="mono">{r.surgeryServiceCode} · {r.surgeryNatureName}</i>
        </div>
      ),
    },
    { key: 'surgeon', label: 'BS chính', width: 200, render: (r) => r.requestDoctorName || '—' },
    { key: 'anesth', label: 'GMHS', width: 150, render: (r) => r.anesthesiaTypeName || '—' },
    {
      key: 'class', label: 'Loại', mono: true, width: 90,
      render: (r) => (
        <span style={{
          display: 'inline-block', padding: '2px 6px',
          background: r.surgeryClass === 1 ? 'var(--s-crit-bg)' : 'var(--d-1)',
          border: '1px solid var(--line)', borderRadius: 'var(--r-1)',
          fontSize: 'var(--fs-xs)', fontWeight: 600,
        }}>{r.surgeryClassName || `L${r.surgeryClass}`}</span>
      ),
    },
    {
      key: 'duration', label: 'Dự kiến', mono: true, width: 80,
      render: (r) => r.durationMinutes ? `${r.durationMinutes}p` : '—',
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
    <SimpleV2Page<SurgeryDto>
      key={reloadVer}
      title="Ca mổ"
      load={async () => {
        // SurgerySearchDto dùng `page` (không phải `pageIndex`) — trước đây ép kiểu lỏng để
        // pass-through field sai → BE ignore. Sau khi typed, dùng đúng `page`.
        const r = await surgeryApi.getSurgeries({
          fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
          toDate:   dayjs().add(7, 'day').format('YYYY-MM-DD'),
          page: 0, pageSize: 200,
        });
        return r.data?.items || [];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã ca / tên phẫu thuật…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.surgeryCode} ${r.surgeryServiceName}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      pageSize={18}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => r.scheduledDate && dayjs(r.scheduledDate).isSame(today, 'day')).length;
        const ongoing = rows.filter((r) => r.status === 2).length;
        const completed = rows.filter((r) => r.status === 4).length;
        const cancelled = rows.filter((r) => r.status === 5).length;
        const emergency = rows.filter((r) => r.surgeryNature === 1).length;
        const avgDur = rows.filter((r) => r.durationMinutes).length > 0
          ? Math.round(rows.reduce((s, r) => s + (r.durationMinutes || 0), 0) / rows.filter((r) => r.durationMinutes).length)
          : 0;
        return [
          { lbl: 'Ca hôm nay', val: todayCount, sub: 'lịch mổ', tone: 'info' },
          { lbl: 'Đang mổ', val: ongoing, sub: 'live', tone: 'crit' },
          { lbl: 'Hoàn tất', val: completed, sub: 'tuần qua', tone: 'ok' },
          { lbl: 'Hủy', val: cancelled, tone: 'warn' },
          { lbl: 'Cấp cứu', val: emergency, tone: 'crit' },
          { lbl: 'TB mỗi ca', val: avgDur, unit: 'p' },
        ];
      }}
      rowActions={(r, reload) => (
        <div className="ab-actions">
          <ActBtn ic="eye" title="Hồ sơ ca mổ" onClick={() => { /* drawer auto-opens via row click */ }} />
          {r.status === 0 && (
            <ActBtn ic="check" title="Duyệt mổ" onClick={() => { void onApprove(r, reload); setReloadVer((v) => v + 1); }} />
          )}
          {r.status !== 5 && r.status !== 4 && (
            <ActBtn ic="x" title="Hủy ca" onClick={() => { void onCancel(r, reload); setReloadVer((v) => v + 1); }} tone="crit" />
          )}
        </div>
      )}
      drawer={(r) => <SurgeryDrawerBody r={r} />}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{r.surgeryCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.surgeryServiceName} · ${fmtDT(r.scheduledDate)}`}
    />
  );
};

const SurgeryDrawerBody: React.FC<{ r: SurgeryDto }> = ({ r }) => {
  const [cabinetOpen, setCabinetOpen]         = useState(false);
  const [preAnesthOpen, setPreAnesthOpen]     = useState(false);
  const [anesthMonOpen, setAnesthMonOpen]     = useState(false);
  const [consentOpen, setConsentOpen]         = useState(false);
  const [postAnesthOpen, setPostAnesthOpen]   = useState(false);

  return (
  <>
    {/* G-10c: Xuất tủ trực phòng mổ — SurgeryCabinetIssueModal phân đối tượng (Prompt 8 Đợt 2) */}
    <div className="rec-section" style={{ paddingBottom: 'var(--space-8)' }}>
      <Btn variant="ghost" size="sm" onClick={() => setCabinetOpen(true)}>
        <TermIcon name="package" size={12} /> Xuất tủ trực (phân đối tượng BHYT/VP/HP)
      </Btn>
      <SurgeryCabinetIssueModal
        open={cabinetOpen}
        onClose={() => setCabinetOpen(false)}
        patientName={r.patientName}
        patientCode={r.patientCode}
        surgeryId={r.id}
      />
    </div>

    {/* G-04: Phiếu phòng mổ */}
    <div className="rec-section" style={{ paddingBottom: 'var(--space-8)' }}>
      <h5 style={{ marginBottom: 'var(--space-6)' }}><TermIcon name="file-text" size={11} /> PHIẾU PHÒNG MỔ</h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
        <Btn variant="ghost" size="sm" onClick={() => setPreAnesthOpen(true)}>
          <TermIcon name="activity" size={11} /> Khám tiền mê
        </Btn>
        <Btn variant="ghost" size="sm" onClick={() => setAnesthMonOpen(true)}>
          <TermIcon name="chart" size={11} /> Theo dõi gây mê
        </Btn>
        <Btn variant="ghost" size="sm" onClick={() => setConsentOpen(true)}>
          <TermIcon name="check" size={11} /> Cam đoan PTTT
        </Btn>
        {/* Kế hoạch sau gây mê – phẫu thuật (Prompt 8 Đợt 2) */}
        <Btn variant="ghost" size="sm" onClick={() => setPostAnesthOpen(true)}>
          <TermIcon name="clipboard" size={11} /> KH sau gây mê
        </Btn>
        <Btn variant="ghost" size="sm" onClick={() => {
          openPrintWindow(
            buildSurgeryRecordHtml(
              {
                hospitalName: HOSPITAL_NAME,
                patientName: r.patientName || '',
                gender: r.gender || '',
                roomName: r.operatingRoomName || '',
                surgeryTime: r.startTime || r.scheduledDate || '',
                preOpDiagnosis: r.preOperativeDiagnosis || '',
                postOpDiagnosis: r.postOperativeDiagnosis || '',
                surgeryMethod: r.surgeryMethod || '',
                surgeryType: r.surgeryNatureName || '',
                anesthesiaMethod: r.anesthesiaTypeName || '',
                surgeonName: r.requestDoctorName || '',
                surgeryDescription: r.description || '',
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { requestCode: r.surgeryCode } as any,
            ),
            { focus: true, print: { delayMs: 500 } },
          );
        }}>
          <TermIcon name="printer" size={11} /> In phiếu PT/TT
        </Btn>
      </div>

      <PreAnesthesiaModal
        open={preAnesthOpen}
        onClose={() => setPreAnesthOpen(false)}
        surgeryId={r.id}
        patientId={r.patientId}
        patientName={r.patientName}
        surgeryCode={r.surgeryCode}
      />
      <AnesthesiaMonitorModal
        open={anesthMonOpen}
        onClose={() => setAnesthMonOpen(false)}
        surgeryId={r.id}
        patientId={r.patientId}
        patientName={r.patientName}
        surgeryCode={r.surgeryCode}
      />
      <ConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        surgeryId={r.id}
        patientName={r.patientName}
        surgeryCode={r.surgeryCode}
        plannedProcedure={r.surgeryServiceName}
        diagnosis={r.preOperativeDiagnosis}
      />
      {/* Kế hoạch sau gây mê – phẫu thuật (Prompt 8 Đợt 2) */}
      <PostAnesthesiaPlanModal
        open={postAnesthOpen}
        onClose={() => setPostAnesthOpen(false)}
        surgeryId={r.id}
        patientId={r.patientId}
        patientName={r.patientName}
        surgeryCode={r.surgeryCode}
      />
    </div>
    <div className="rec-section">
      <h5><TermIcon name="user" size={11} /> BỆNH NHÂN & CHẨN ĐOÁN</h5>
      <div className="rec-kv">
        <span>Họ tên</span><b>{r.patientName}</b>
        <span>Mã BN / Giới</span><span className="mono">{r.patientCode} · {r.gender || '—'}</span>
        <span>Hồ sơ</span><span className="mono">{r.medicalRecordCode}</span>
        {r.preOperativeDiagnosis && (<><span>CĐ trước mổ</span><span>{r.preOperativeDiagnosis} ({r.preOperativeIcdCode || '—'})</span></>)}
        {r.postOperativeDiagnosis && (<><span>CĐ sau mổ</span><span>{r.postOperativeDiagnosis} ({r.postOperativeIcdCode || '—'})</span></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="activity" size={11} /> PHẪU THUẬT</h5>
      <div className="rec-kv">
        <span>Tên phẫu thuật</span><b>{r.surgeryServiceName}</b>
        <span>Mã DV</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.surgeryServiceCode}</span>
        <span>Loại / Tính chất</span>
        <span>
          <span className="chip info">{r.surgeryClassName}</span>
          &nbsp;<span className={`chip ${r.surgeryNature === 1 ? 'crit' : 'info'}`}>{r.surgeryNatureName}</span>
        </span>
        <span>Phòng / Giờ</span><span>{r.operatingRoomName || '—'} · {fmtDT(r.scheduledDate)}</span>
        {r.durationMinutes && (<><span>Dự kiến</span><span>{r.durationMinutes} phút</span></>)}
        <span>Phương pháp vô cảm</span><span>{r.anesthesiaTypeName}</span>
        {r.surgeryMethod && (<><span>Phương pháp PT</span><span>{r.surgeryMethod}</span></>)}
      </div>
    </div>
    {r.teamMembers && r.teamMembers.length > 0 && (
      <div className="rec-section">
        <h5><TermIcon name="users" size={11} /> EKIP PHẪU THUẬT ({r.teamMembers.length})</h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
          {/* SDK type là SurgeryTeamMemberDto (có staffName); BE legacy có thể trả fullName/userName
              → giữ fallback. Widen type minimal để vẫn type-safe. */}
          {r.teamMembers.map((m: SurgeryTeamMemberDto & { fullName?: string; userName?: string }, i) =>
            <span key={i} className="chip info">{m.fullName || m.userName || m.staffName || `TV ${i + 1}`}</span>
          )}
        </div>
      </div>
    )}
    {(r.startTime || r.endTime) && (
      <div className="rec-section">
        <h5><TermIcon name="clock" size={11} /> THỜI GIAN THỰC TẾ</h5>
        <div className="rec-kv">
          {r.startTime && (<><span>Bắt đầu</span><span className="mono">{fmtDT(r.startTime)}</span></>)}
          {r.endTime && (<><span>Kết thúc</span><span className="mono">{fmtDT(r.endTime)}</span></>)}
          {r.startTime && r.endTime && (
            <>
              <span>Thực tế</span>
              <b>{dayjs(r.endTime).diff(dayjs(r.startTime), 'minute')} phút</b>
            </>
          )}
        </div>
      </div>
    )}
    {(r.description || r.conclusion) && (
      <div className="rec-section">
        <h5><TermIcon name="file-text" size={11} /> NỘI DUNG / KẾT LUẬN</h5>
        {r.description && (<div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap', marginBottom: 'var(--space-8)' }}><b>Mô tả:</b> {r.description}</div>)}
        {r.conclusion && (<div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}><b>Kết luận:</b> {r.conclusion}</div>)}
      </div>
    )}
    {r.complications && (
      <div className="rec-section">
        <h5><TermIcon name="alert" size={11} /> BIẾN CHỨNG</h5>
        <div style={{ fontSize: 12.5, color: 'var(--s-crit)', whiteSpace: 'pre-wrap' }}>{r.complications}</div>
      </div>
    )}
    <div className="rec-section">
      <h5><TermIcon name="dollar" size={11} /> CHI PHÍ</h5>
      <div className="rec-kv">
        <span>Phí dịch vụ</span><b className="mono">{(r.serviceCost || 0).toLocaleString('vi-VN')} ₫</b>
        <span>Tiền thuốc</span><b className="mono">{(r.medicineCost || 0).toLocaleString('vi-VN')} ₫</b>
      </div>
    </div>
  </>
  );
};

export default SurgeryV2;
