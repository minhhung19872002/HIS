import React, { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import type { AxiosError } from 'axios';
import * as surgeryApi from '../api/surgery';
import type { SurgeryDto, SurgeryTeamMemberDto, OperatingRoomDto, SurgeryScheduleDto } from '../api/surgery';
import type { ServerValidationError } from '../../../utils/formError';
import { SimpleV2Page, StatusBadge, Btn, DrawerShell, DataTable, cf, tk, tw, type ColumnDef, type StatusTab } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { RowActions } from '../../../components/actions';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { SurgeryCabinetIssueModal } from './SurgeryCabinetIssueModal';
import { PreAnesthesiaModal, AnesthesiaMonitorModal, ConsentModal, PostAnesthesiaPlanModal } from './SurgeryFormModals';
import { SurgeryRequestCreateModal } from './SurgeryRequestCreateModal';
import { SurgeryScheduleModal } from './SurgeryScheduleModal';
import { SurgeryStartModal } from './SurgeryStartModal';
import { SurgeryPrintFormModal } from './SurgeryPrintFormModal';

/* Phẫu thuật v2 — port of OR v2.html */

type StatusKey = 'pending' | 'approved' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
// Backend GetStatusName (SurgeryRequest.Status): 0 Chờ duyệt · 1 Đã duyệt · 2 Đang thực hiện · 3 Hoàn thành · 4 Hủy · 5 Hoãn
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',   l: 'Chờ duyệt',      tone: 'warn' },
  { v: 'approved',  l: 'Đã duyệt',       tone: 'info' },
  { v: 'ongoing',   l: 'Đang thực hiện', tone: 'crit' },
  { v: 'completed', l: 'Hoàn thành',     tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',            tone: 'crit' },
  { v: 'postponed', l: 'Hoãn',           tone: 'warn' },
];
const statusKey = (s: number): StatusKey =>
  s === 1 ? 'approved' : s === 2 ? 'ongoing' : s === 3 ? 'completed' : s === 4 ? 'cancelled' : s === 5 ? 'postponed' : 'pending';
const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';

const SurgeryV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  // Refresh closure for action buttons (SimpleV2Page passes reload to actions)
  const [reloadVer, setReloadVer] = useState(0);
  // #467: guard double-submit trên nút "Hoàn thành ca mổ" (id ca đang xử lý)
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // #409: workflow modals (port v1 create-request / schedule-OR / start-surgery)
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<SurgeryDto | null>(null);
  const [startTarget, setStartTarget] = useState<SurgeryDto | null>(null);
  // reload() closure comes from SimpleV2Page per-row — stash the one active when a modal opened
  const scheduleReloadRef = useRef<() => void>(() => {});
  const startReloadRef = useRef<() => void>(() => {});

  // #352 parity v1 tab "Phòng mổ" — OR status board (drawer, không phá layout SimpleV2Page)
  const [orOpen, setOrOpen] = useState(false);
  const [orLoading, setOrLoading] = useState(false);
  const [orRooms, setOrRooms] = useState<OperatingRoomDto[]>([]);
  const [orToday, setOrToday] = useState<Map<string, number>>(new Map());
  const openOrBoard = async () => {
    setOrOpen(true);
    setOrLoading(true);
    try {
      const [rooms, sched] = await Promise.allSettled([
        surgeryApi.getOperatingRooms(),
        surgeryApi.getSurgerySchedule(dayjs().format('YYYY-MM-DD')),
      ]);
      if (rooms.status === 'fulfilled') setOrRooms(Array.isArray(rooms.value.data) ? rooms.value.data : []);
      else tw(friendlyErrorMessage(rooms.reason, 'Không tải được danh sách phòng mổ'));
      const counts = new Map<string, number>();
      if (sched.status === 'fulfilled') {
        (sched.value.data as SurgeryScheduleDto[] | undefined)?.forEach((s) => {
          counts.set(s.operatingRoomId, (counts.get(s.operatingRoomId) || 0) + (s.surgeries?.length || 0));
        });
      } else {
        tw(friendlyErrorMessage(sched.reason, 'Không tải được lịch mổ hôm nay'));
      }
      setOrToday(counts);
    } catch (e) { tw(friendlyErrorMessage(e, 'Không tải được trạng thái phòng mổ')); }
    finally { setOrLoading(false); }
  };

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

  // #409: hoàn thành ca mổ — VERBATIM v1 handleCompleteSurgery (confirm → completeSurgery endTime=now)
  const onComplete = (r: SurgeryDto, reload: () => void) => {
    cf(`Xác nhận hoàn thành ca phẫu thuật ${r.surgeryCode} - ${r.patientName}?`, () => {
      if (actionBusy) return;
      setActionBusy(r.id);
      void (async () => {
        try {
          await surgeryApi.completeSurgery({
            surgeryId: r.id,
            endTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
          });
          tk('Hoàn thành phẫu thuật thành công');
          reload();
        } catch {
          tw('Có lỗi xảy ra khi hoàn thành phẫu thuật');
        } finally {
          setActionBusy(null);
        }
      })();
    }, { title: 'Hoàn thành phẫu thuật', confirm: 'Xác nhận' });
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
        const completed = rows.filter((r) => r.status === 3).length;
        const cancelled = rows.filter((r) => r.status === 4).length;
        // BE getSurgeries: SurgeryNature = Priority; "Cấp cứu" khi Priority === 3 (SurgeryNatureName)
        const emergency = rows.filter((r) => r.surgeryNature === 3).length;
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
        // Gate theo request.Status stream mà getSurgeries trả (BE SurgeryRequest.Status):
        // 0 Chờ duyệt · 1 Đã duyệt/lên lịch · 2 Đang thực hiện · 3 Hoàn thành · 4 Hủy · 5 Hoãn.
        // getSurgeries KHÔNG map operatingRoomName → không gate theo phòng được; ở trạng thái
        // "Đã duyệt" (1) cho phép cả Lên lịch (tạo SurgerySchedule) lẫn Bắt đầu (start ca).
        <RowActions actions={[
          { key: 'view', icon: 'eye', label: 'Hồ sơ ca mổ', primary: true, onClick: () => { /* drawer auto-opens via row click */ } },
          { key: 'approve', icon: 'check', label: 'Duyệt mổ', hidden: r.status !== 0,
            confirm: `Duyệt ca mổ ${r.surgeryCode}?`,
            onClick: () => { void onApprove(r, reload); setReloadVer((v) => v + 1); } },
          { key: 'schedule', icon: 'calendar', label: 'Lên lịch', hidden: r.status !== 1,
            onClick: () => { setScheduleTarget(r); scheduleReloadRef.current = reload; } },
          { key: 'start', icon: 'activity', label: 'Bắt đầu', hidden: r.status !== 1,
            onClick: () => { setStartTarget(r); startReloadRef.current = reload; } },
          { key: 'complete', icon: 'check', label: 'Hoàn thành ca mổ', hidden: r.status !== 2,
            disabled: actionBusy === r.id,
            onClick: () => onComplete(r, reload) },
          { key: 'cancel', icon: 'x', label: 'Hủy ca', tone: 'danger', hidden: !(r.status === 0 || r.status === 1),
            confirm: `Hủy ca mổ ${r.surgeryCode}? Thao tác không thể hoàn tác.`,
            onClick: () => { void onCancel(r, reload); setReloadVer((v) => v + 1); } },
        ]} />
      )}
      headerActions={(reload) => (
        <>
          <Btn variant="ghost" size="sm" onClick={() => { void openOrBoard(); }}>
            <TermIcon name="grid" size={12} /> Phòng mổ
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <TermIcon name="plus" size={12} /> Tạo yêu cầu
          </Btn>
          <SurgeryRequestCreateModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={() => { setCreateOpen(false); reload(); }}
          />
          <SurgeryScheduleModal
            open={!!scheduleTarget}
            onClose={() => setScheduleTarget(null)}
            surgery={scheduleTarget}
            onScheduled={() => { setScheduleTarget(null); scheduleReloadRef.current(); }}
          />
          <SurgeryStartModal
            open={!!startTarget}
            onClose={() => setStartTarget(null)}
            surgery={startTarget}
            onStarted={() => { setStartTarget(null); startReloadRef.current(); }}
          />
          {/* #352: bảng trạng thái phòng mổ (parity v1 tab "Phòng mổ" pages/Surgery.tsx:1154-1201) */}
          <DrawerShell
            open={orOpen}
            onClose={() => setOrOpen(false)}
            size="lg"
            title="Trạng thái phòng mổ"
            sub={`Theo dõi trạng thái + số ca hôm nay · ${dayjs().format('DD/MM/YYYY')}`}
            footer={<Btn variant="ghost" onClick={() => setOrOpen(false)}>Đóng</Btn>}
          >
            <DataTable<OperatingRoomDto>
              columns={[
                { key: 'code', label: 'Mã phòng', code: true, width: 110, render: (r) => r.code },
                { key: 'name', label: 'Tên phòng', render: (r) => (
                  <div className="cell-2l">
                    <b>{r.name}</b>
                    {r.description && <i>{r.description}</i>}
                  </div>
                ) },
                { key: 'type', label: 'Loại', width: 150, render: (r) => r.roomTypeName || (
                  r.roomType === 1 ? 'Phòng mổ lớn' : r.roomType === 2 ? 'Phòng mổ nhỏ' : r.roomType === 3 ? 'Phòng mổ cấp cứu' : 'Phòng mổ chuyên khoa'
                ) },
                { key: 'st', label: 'Trạng thái', width: 140, render: (r) => r.status === 0
                  ? <StatusBadge tone="ok" dot>{r.statusName || 'Trống'}</StatusBadge>
                  : <StatusBadge tone="warn" dot>{r.statusName || 'Đang sử dụng'}</StatusBadge> },
                { key: 'cur', label: 'Ca hiện tại', render: (r) => r.currentPatientName || '—' },
                { key: 'today', label: 'Ca hôm nay', mono: true, width: 100,
                  render: (r) => orToday.get(r.id) ?? 0 },
              ]}
              data={orRooms} rowKey={(r) => r.id}
              loading={orLoading}
              empty="Chưa có phòng mổ"
            />
          </DrawerShell>
        </>
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
  const [printOpen, setPrintOpen]             = useState(false);

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
        <Btn variant="ghost" size="sm" onClick={() => setPrintOpen(true)}>
          <TermIcon name="printer" size={11} /> In phiếu PT/TT
        </Btn>
      </div>
      <SurgeryPrintFormModal open={printOpen} onClose={() => setPrintOpen(false)} surgery={r} />

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
          &nbsp;<span className={`chip ${r.surgeryNature === 3 ? 'crit' : 'info'}`}>{r.surgeryNatureName}</span>
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
