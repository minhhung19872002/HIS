import React, { useEffect, useMemo, useState } from 'react';
import * as file from '../../../services/file.service';
import dayjs from 'dayjs';
import { App as AntdApp, Input, InputNumber, Select } from 'antd';
import {
  getAppointments, confirmAppointment, cancelAppointment,
  createEPrescription, signEPrescription, sendToPharmacy,
  createAppointment, createVideoSession, endSession, getDashboard,
  createConsultation, completeConsultation,
} from '../api/telemedicine';
import type {
  TelemedicineAppointmentDto, TelePrescriptionDto, TelePrescriptionItemInput,
  CreateTelemedicineAppointmentDto, TelemedicineDashboardDto,
} from '../api/telemedicine';
import { searchMedicines } from '../../opd/api/examination';
import type { MedicineDto } from '../../opd/api/examination';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, Btn, DrawerShell, ModalShell, cf,
  type ColumnDef, type StatusTab,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { RowActions, RefreshButton } from '../../../components/actions';
import { useModalForm } from '../../../hooks/useModalForm';
import { Field } from '../../../components/form/Field';

/* Khám từ xa v2 — port of design-system-v2/his/project/Telemedicine v2.html */

type StatusKey = 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'noshow' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã đặt',         tone: 'info' },
  { v: 'waiting',   l: 'Chờ vào phòng',  tone: 'warn' },
  { v: 'ongoing',   l: 'Đang khám',      tone: 'warn' },
  { v: 'completed', l: 'Hoàn tất',       tone: 'ok' },
  { v: 'noshow',    l: 'Không tham gia', tone: 'crit' },
  { v: 'cancelled', l: 'Đã huỷ',         tone: 'crit' },
];

const statusKey = (s: number): StatusKey => {
  if (s === 5) return 'noshow';
  if (s === 4) return 'cancelled';
  if (s === 3) return 'completed';
  if (s === 2) return 'ongoing';
  if (s === 1) return 'waiting';
  return 'scheduled';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—';
const fmtVND = (n: number) => n ? `${n.toLocaleString('vi-VN')} ₫` : 'Miễn phí';

const TelemedicineV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<TelemedicineAppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<TelemedicineAppointmentDto | null>(null);
  const [rxFor, setRxFor] = useState<TelemedicineAppointmentDto | null>(null); // F8: kê đơn từ buổi tele
  /* ── NEW: booking modal ── */
  const [bookingOpen, setBookingOpen] = useState(false);
  /* ── NEW: session action busy flags ── */
  const [startSessionBusy, setStartSessionBusy] = useState(false);
  /* #467: chặn double-click 'Xác nhận' bắn confirmAppointment 2 lần */
  const [confirmBusy, setConfirmBusy] = useState<string | null>(null);
  /* #352: form ghi hồ sơ khi kết thúc buổi khám từ xa */
  const [endTarget, setEndTarget] = useState<TelemedicineAppointmentDto | null>(null);
  const [endBusy, setEndBusy] = useState(false);
  const [endForm, setEndForm] = useState({
    assessment: '', diagnosisMain: '', diagnosisMainIcd: '', treatmentPlan: '', followUpInstructions: '',
  });
  const { errors: endErrors, validate: endValidate, clear: endClear } = useModalForm(
    { diagnosisMain: { required: true, label: 'chẩn đoán chính' } },
    !!endTarget,
  );
  /* ── NEW: page-level tab (list | stats) ── */
  const [pageTab, setPageTab] = useState<'list' | 'stats'>('list');
  /* ── NEW: dashboard stats ── */
  const [dashboard, setDashboard] = useState<TelemedicineDashboardDto | null>(null);
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    Promise.allSettled([
      getAppointments({
        fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        toDate:   dayjs().add(60, 'day').format('YYYY-MM-DD'),
      }),
      getDashboard(dayjs().format('YYYY-MM-DD')),
    ]).then(([apptRes, dashRes]) => {
      setRows(apptRes.status === 'fulfilled' ? (apptRes.value.data?.items || []) : []);
      if (apptRes.status === 'rejected') message.error('Không tải được danh sách lịch khám từ xa');
      setDashboard(dashRes.status === 'fulfilled' ? (dashRes.value.data || null) : null);
    }).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => { c[s.v] = rows.filter((r) => statusKey(r.status) === s.v).length; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.appointmentCode, r.patientName, r.patientCode, r.doctorName, r.chiefComplaint]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const today = dayjs().startOf('day');
  const kpis = useMemo(() => ({
    today: rows.filter((r) => dayjs(r.scheduledDate).isSame(today, 'day')).length,
    ongoing: counts.ongoing || 0,
    waiting: counts.waiting || 0,
    completed7d: rows.filter((r) =>
      statusKey(r.status) === 'completed' &&
      dayjs(r.scheduledDate).isAfter(today.subtract(7, 'day'))).length,
    noshow: counts.noshow || 0,
    total: rows.length,
  }), [rows, counts, today]);

  const onConfirm = async (r: TelemedicineAppointmentDto) => {
    if (confirmBusy) return;
    setConfirmBusy(r.id);
    try { await confirmAppointment(r.id); message.success(`Đã xác nhận · ${r.patientName}`); reload(); }
    catch { message.error('Xác nhận thất bại'); }
    finally { setConfirmBusy(null); }
  };

  const onCancel = async (r: TelemedicineAppointmentDto) => {
    try { await cancelAppointment(r.id, 'Hủy từ giao diện quản trị'); message.warning(`Đã hủy · ${r.patientName}`); reload(); }
    catch { message.error('Hủy thất bại'); }
  };

  const onJoin = (r: TelemedicineAppointmentDto) => {
    if (r.videoRoomUrl) window.open(r.videoRoomUrl, '_blank');
    else message.info('Phòng họp chưa được tạo');
  };

  /* ── NEW B: Bắt đầu phòng khám — tạo video session → mở roomUrl ── */
  const onStartSession = async (r: TelemedicineAppointmentDto) => {
    setStartSessionBusy(true);
    try {
      const res = await createVideoSession({ appointmentId: r.id });
      const roomUrl = res.data?.roomUrl;
      if (roomUrl) { window.open(roomUrl, '_blank'); reload(); }
      else message.warning('Phòng họp chưa sẵn sàng');
    } catch { message.error('Không thể tạo phiên video'); }
    finally { setStartSessionBusy(false); }
  };

  /* ── #352: Kết thúc buổi khám — PHẢI ghi chẩn đoán/kế hoạch điều trị trước khi đóng phiên.
     Trước đây chỉ gọi endSession ⇒ ca khám từ xa đóng lại mà hồ sơ KHÔNG có chẩn đoán,
     mã ICD hay kế hoạch điều trị nào (v1 gọi completeConsultation, pages/Telemedicine.tsx:261-286). */
  const onEndSession = (r: TelemedicineAppointmentDto) => {
    if (!r.sessionId) { message.warning('Không có sessionId để kết thúc'); return; }
    setEndForm({ assessment: '', diagnosisMain: '', diagnosisMainIcd: '', treatmentPlan: '', followUpInstructions: '' });
    setEndTarget(r);
  };

  const submitEndSession = async () => {
    if (!endTarget?.sessionId) return;
    if (!endValidate({ diagnosisMain: endForm.diagnosisMain.trim() })) return;
    setEndBusy(true);
    try {
      // Ghi hồ sơ TRƯỚC rồi mới đóng phiên: nếu đảo thứ tự mà bước ghi lỗi thì phiên đã đóng
      // và dữ liệu lâm sàng mất hẳn (v1 đóng phiên trước — đây là chỗ v2 làm chặt hơn).
      const c = await createConsultation({ sessionId: endTarget.sessionId, appointmentId: endTarget.id });
      const consultationId = (c.data as { id?: string } | undefined)?.id;
      if (!consultationId) throw new Error('no consultation id');

      await completeConsultation({
        consultationId,
        assessment: endForm.assessment.trim() || 'Hoàn tất qua khám từ xa',
        diagnosisMain: endForm.diagnosisMain.trim(),
        diagnosisMainIcd: endForm.diagnosisMainIcd.trim(),
        treatmentPlan: endForm.treatmentPlan.trim(),
        followUpInstructions: endForm.followUpInstructions.trim() || undefined,
      });

      await endSession(endTarget.sessionId, 'Kết thúc buổi khám');
      message.success(`Đã kết thúc buổi khám · ${endTarget.patientName}`);
      setEndTarget(null);
      reload();
      setDetail(null);
    } catch {
      message.error('Kết thúc thất bại — hồ sơ khám chưa được ghi, phiên vẫn đang mở');
    } finally { setEndBusy(false); }
  };

  const columns: ColumnDef<TelemedicineAppointmentDto>[] = [
    { key: 'code', label: 'Mã', mono: true, width: 130, render: (r) => r.appointmentCode },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {r.phone || '—'}</i>
        </div>
      ),
    },
    {
      key: 'doctor', label: 'Bác sĩ', width: 200,
      render: (r) => (
        <div className="cell-2l">
          <b>{r.doctorName}</b>
          <i>{r.doctorSpecialty || r.departmentName || '—'}</i>
        </div>
      ),
    },
    { key: 'subject', label: 'Lý do khám', render: (r) => r.chiefComplaint || r.appointmentTypeName || '—' },
    {
      key: 'when', label: 'Lịch hẹn', width: 130, mono: true,
      render: (r) => (
        <div className="cell-2l">
          <b>{fmtDMY(r.scheduledDate)}</b>
          <i>{r.scheduledTime?.slice(0, 5) || fmtHM(r.scheduledDate)} · {r.durationMinutes || 30}p</i>
        </div>
      ),
    },
    { key: 'fee', label: 'Phí', mono: true, width: 110, render: (r) => fmtVND(r.fee) },
    {
      key: 'paid', label: 'Thanh toán', width: 110,
      render: (r) => r.paymentStatus === 1 ? <span className="chip ok">Đã trả</span> : <span className="chip warn">Chưa</span>,
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="ab">
      {/* ── NEW D: Page-level tab switcher (Lịch khám | Thống kê) ── */}
      <div className="ab-tools" style={{ borderBottom: '1px solid var(--bdr)', marginBottom: 'var(--space-8)', paddingBottom: 'var(--space-4)' }}>
        <Btn variant={pageTab === 'list' ? 'primary' : 'ghost'} onClick={() => setPageTab('list')}>
          Lịch khám
        </Btn>
        <Btn variant={pageTab === 'stats' ? 'primary' : 'ghost'} onClick={() => setPageTab('stats')}>
          Thống kê
        </Btn>
      </div>

      {pageTab === 'stats' ? (
        /* ── NEW D: Stats view ── */
        <div>
          {dashboard ? (
            <>
              <KpiStrip
                items={[
                  { lbl: 'Tổng lịch hẹn', val: dashboard.totalAppointments, sub: 'hôm nay', tone: 'info' },
                  { lbl: 'Hoàn tất', val: dashboard.completedAppointments, sub: 'hoàn tất', tone: 'ok' },
                  { lbl: 'Đang khám', val: kpis.ongoing, sub: 'trực tiếp', tone: 'warn' },
                  { lbl: 'Doanh thu', val: dashboard.totalRevenue, sub: '₫', tone: 'ok' },
                ]}
              />
              <div style={{ marginTop: 'var(--space-10)', fontSize: 12.5, color: 'var(--t-2)' }}>
                TG chờ TB: <b>{dashboard.averageWaitTimeMinutes} phút</b>
                &nbsp;·&nbsp;
                TG khám TB: <b>{dashboard.averageConsultationDurationMinutes} phút</b>
                &nbsp;·&nbsp;
                Đã hủy: <b>{dashboard.cancelledAppointments}</b>
                &nbsp;·&nbsp;
                Không tham gia: <b>{dashboard.noShowAppointments}</b>
                &nbsp;·&nbsp;
                Đã kê đơn: <b>{dashboard.prescriptionsSent}</b>
              </div>
            </>
          ) : (
            <div className="ab-empty">
              <TermIcon name="search" size={20} />
              <div>Không có dữ liệu thống kê hôm nay</div>
            </div>
          )}
        </div>
      ) : (
        /* ── List view — existing content ── */
        <>
          <KpiStrip
            items={[
              { lbl: 'Hôm nay', val: kpis.today, sub: 'lịch hẹn', tone: 'info' },
              { lbl: 'Đang khám', val: kpis.ongoing, sub: 'live', tone: 'warn' },
              { lbl: 'Chờ vào phòng', val: kpis.waiting, sub: 'sẵn sàng', tone: 'warn' },
              { lbl: 'Hoàn tất 7 ngày', val: kpis.completed7d, sub: 'tuần qua', tone: 'ok' },
              { lbl: 'Không tham gia', val: kpis.noshow, sub: 'no-show', tone: 'crit' },
              { lbl: 'Tổng cộng', val: kpis.total },
            ]}
          />

          <div className="ab-tools">
            <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / BS / mã hẹn / lý do…" />
            <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); }}>
              <TermIcon name="refresh" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            <RefreshButton onRefresh={async () => { await reload() }} />
            <Btn variant="ghost" onClick={() => {
              if (!filtered.length) { message.warning('Không có dữ liệu để xuất'); return; }
              const header = 'Mã hẹn,Bệnh nhân,Bác sĩ,Ngày hẹn,Lý do,Trạng thái,URL phòng';
              const csvRows = filtered.map((r) => [
                r.appointmentCode,
                r.patientName,
                r.doctorName || '',
                r.scheduledDate ? `${dayjs(r.scheduledDate).format('DD/MM/YYYY')} ${(r.scheduledTime || '').slice(0, 5)}`.trim() : '',
                r.chiefComplaint || '',
                r.statusName || '',
                r.videoRoomUrl || '',
              ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
              const blob = new Blob(['﻿' + [header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
              file.downloadBlob(blob, `telemedicine_${dayjs().format('YYYYMMDD-HHmm')}.csv`);
              message.success(`Đã xuất ${filtered.length} dòng`);
            }}>
              <TermIcon name="download" size={12} /> Xuất CSV
            </Btn>
            {/* ── NEW A: Đặt lịch → mở booking modal (thay vì navigate) ── */}
            <Btn variant="primary" onClick={() => setBookingOpen(true)}>
              <TermIcon name="plus" size={12} /> Đặt lịch
            </Btn>
          </div>

          <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

          <DataTable<TelemedicineAppointmentDto>
            columns={columns}
            data={paged}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDetail(r)}
            actions={(r) => (
              <RowActions actions={[
                { key: 'join', icon: 'play', label: 'Vào phòng', primary: true,
                  hidden: !([0, 1].includes(r.status) && !!r.videoRoomUrl), onClick: () => onJoin(r) },
                { key: 'confirm', icon: 'check', label: 'Xác nhận', primary: true,
                  hidden: r.status !== 0, disabled: confirmBusy === r.id, onClick: () => onConfirm(r) },
                { key: 'detail', icon: 'eye', label: 'Chi tiết', onClick: () => setDetail(r) },
              ]} />
            )}
            empty={loading ? 'Đang tải…' : (
              <div className="ab-empty">
                <TermIcon name="search" size={20} />
                <div>Không có lịch khám từ xa nào</div>
              </div>
            )}
          />

          <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />
        </>
      )}

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.appointmentCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail ? `${detail.doctorName} · ${fmtDT(detail.scheduledDate)}` : ''}
        size="lg"
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <span style={{ flex: 1 }} />
            {detail.status === 0 && (
              <Btn variant="ok" onClick={() => { onConfirm(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Xác nhận
              </Btn>
            )}
            {![3, 4, 5].includes(detail.status) && (
              <Btn
                onClick={() => cf(
                  `Huỷ lịch hẹn khám từ xa của ${detail.patientName}? Thao tác không thể hoàn tác.`,
                  () => { onCancel(detail); setDetail(null); },
                  { tone: 'crit', confirm: 'Huỷ lịch hẹn' },
                )}
                style={{ color: 'var(--s-crit)' }}
              >
                <TermIcon name="x" size={12} /> Huỷ
              </Btn>
            )}
            {/* ── NEW B: Bắt đầu phòng khám — status=1 waiting ── */}
            {detail.status === 1 && (
              <Btn variant="primary" disabled={startSessionBusy} onClick={() => onStartSession(detail)}>
                <TermIcon name="play" size={12} /> Bắt đầu phòng khám
              </Btn>
            )}
            {/* ── NEW C: Kết thúc buổi khám — status=2 ongoing ── */}
            {detail.status === 2 && (
              <Btn onClick={() => onEndSession(detail)} style={{ color: 'var(--s-crit)' }}>
                <TermIcon name="x" size={12} /> Kết thúc buổi khám
              </Btn>
            )}
            {detail.sessionId && ![4, 5].includes(detail.status) && (
              <Btn variant="ok" onClick={() => setRxFor(detail)}>
                <TermIcon name="pill" size={12} /> Kê đơn thuốc
              </Btn>
            )}
            {detail.videoRoomUrl && (
              <Btn variant="primary" onClick={() => onJoin(detail)}>
                <TermIcon name="play" size={12} /> Vào phòng
              </Btn>
            )}
          </>
        ) : null}
      >
        {detail && <TelemedicineDrawerBody r={detail} />}
      </DrawerShell>

      <TeleRxModal appt={rxFor} onClose={() => setRxFor(null)} />

      {/* ── NEW A: Booking modal ── */}
      <TeleBookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} onDone={reload} />

      {/* #352: ghi hồ sơ khi kết thúc buổi khám từ xa (chẩn đoán / ICD / kế hoạch điều trị) */}
      <ModalShell
        open={!!endTarget}
        onClose={() => setEndTarget(null)}
        size="md"
        title={`Kết thúc buổi khám · ${endTarget?.patientName ?? ''}`}
        sub={endTarget ? `${endTarget.appointmentCode} · ghi hồ sơ trước khi đóng phiên` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setEndTarget(null)}>Hủy</Btn>
          <Btn variant="primary" loading={endBusy} onClick={submitEndSession}>Ghi hồ sơ &amp; kết thúc</Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <Field label="Chẩn đoán chính" required error={endErrors.diagnosisMain}>
              <Input value={endForm.diagnosisMain}
                onChange={(e) => { setEndForm((p) => ({ ...p, diagnosisMain: e.target.value })); endClear('diagnosisMain'); }}
                placeholder="Chẩn đoán xác định sau buổi khám" />
            </Field>
            <label>Mã ICD-10
              <Input value={endForm.diagnosisMainIcd} style={{ marginTop: 4 }}
                onChange={(e) => setEndForm((p) => ({ ...p, diagnosisMainIcd: e.target.value }))}
                placeholder="VD: J06.9" />
            </label>
          </div>
          <label>Kế hoạch điều trị
            <Input.TextArea rows={3} value={endForm.treatmentPlan} style={{ marginTop: 4 }}
              onChange={(e) => setEndForm((p) => ({ ...p, treatmentPlan: e.target.value }))} />
          </label>
          <label>Đánh giá
            <Input.TextArea rows={2} value={endForm.assessment} style={{ marginTop: 4 }}
              onChange={(e) => setEndForm((p) => ({ ...p, assessment: e.target.value }))}
              placeholder="Bỏ trống = 'Hoàn tất qua khám từ xa'" />
          </label>
          <label>Dặn dò tái khám
            <Input value={endForm.followUpInstructions} style={{ marginTop: 4 }}
              onChange={(e) => setEndForm((p) => ({ ...p, followUpInstructions: e.target.value }))} />
          </label>
        </div>
      </ModalShell>
    </div>
  );
};

/* ─────────── F8: Modal kê đơn tele → ký → gửi quầy phát ─────────── */
interface RxRowDraft {
  key: number;
  medicine: MedicineDto | null;
  quantity: number;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}
const emptyRxRow = (key: number): RxRowDraft =>
  ({ key, medicine: null, quantity: 1, dosage: '', frequency: '', durationDays: 1, instructions: '' });

const TeleRxModal: React.FC<{ appt: TelemedicineAppointmentDto | null; onClose: () => void }> = ({ appt, onClose }) => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<RxRowDraft[]>([emptyRxRow(1)]);
  const [note, setNote] = useState('');
  const [options, setOptions] = useState<MedicineDto[]>([]);
  const [created, setCreated] = useState<TelePrescriptionDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appt) return;
    setRows([emptyRxRow(1)]); setNote(''); setCreated(null); setOptions([]);
  }, [appt]);

  const onSearchMedicine = (kw: string) => {
    if (!kw || kw.trim().length < 2) return;
    searchMedicines(kw.trim()).then((r) => setOptions(Array.isArray(r.data) ? r.data : [])).catch(() => setOptions([]));
  };

  const setRow = (key: number, patch: Partial<RxRowDraft>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const doCreate = async () => {
    if (!appt?.sessionId) { message.warning('Buổi khám chưa có phiên video (sessionId)'); return; }
    const items: TelePrescriptionItemInput[] = rows
      .filter((r) => r.medicine && r.quantity > 0)
      .map((r) => ({
        drugId: r.medicine!.id,
        drugCode: r.medicine!.code,
        drugName: r.medicine!.name,
        unit: r.medicine!.unit,
        quantity: r.quantity,
        dosage: r.dosage.trim() || undefined,
        frequency: r.frequency.trim() || undefined,
        durationDays: r.durationDays || undefined,
        instructions: r.instructions.trim() || undefined,
      }));
    if (!items.length) { message.warning('Chọn ít nhất 1 thuốc'); return; }
    setBusy(true);
    try {
      const r = await createEPrescription(appt.sessionId, items, note.trim() || undefined);
      setCreated(r.data);
      message.success(`Đã tạo đơn ${r.data?.prescriptionCode ?? ''}`);
    } catch { message.error('Tạo đơn thất bại'); }
    finally { setBusy(false); }
  };

  const doSign = async () => {
    if (!created) return;
    setBusy(true);
    try {
      const r = await signEPrescription(created.id);
      setCreated((c) => (c ? { ...c, status: r.data?.status ?? 'Signed' } : c));
      message.success('Đã ký đơn');
    } catch { message.error('Ký đơn thất bại'); }
    finally { setBusy(false); }
  };

  const doSend = async () => {
    if (!created) return;
    setBusy(true);
    try {
      const ok = (await sendToPharmacy(created.id)).data;
      if (ok) {
        setCreated((c) => (c ? { ...c, status: 'SentToPharmacy' } : c));
        message.success('Đã gửi đơn sang quầy phát thuốc');
      } else message.error('Gửi quầy phát thất bại');
    } catch { message.error('Gửi quầy phát thất bại'); }
    finally { setBusy(false); }
  };

  const medOptions = options.map((m) => ({
    value: m.id,
    label: `${m.code} · ${m.name}${m.unit ? ` (${m.unit})` : ''}`,
  }));

  return (
    <ModalShell
      open={!!appt}
      onClose={onClose}
      size="lg"
      title="Kê đơn thuốc khám từ xa"
      sub={appt ? `${appt.patientName} · ${appt.appointmentCode}` : ''}
      footer={
        created ? (
          <>
            <span style={{ fontSize: 12.5 }}>
              Đơn <b className="mono">{created.prescriptionCode}</b> · <span className="chip info">{created.status}</span>
            </span>
            <span style={{ flex: 1 }} />
            <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
            {created.status === 'Draft' && (
              <Btn variant="ok" disabled={busy} onClick={doSign}><TermIcon name="check" size={12} /> Ký đơn</Btn>
            )}
            {created.status !== 'SentToPharmacy' && (
              <Btn variant="primary" disabled={busy} onClick={doSend}>
                <TermIcon name="send" size={12} /> Gửi quầy phát
              </Btn>
            )}
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
            <span style={{ flex: 1 }} />
            <Btn variant="ghost" onClick={() => setRows((rs) => [...rs, emptyRxRow(Math.max(0, ...rs.map((x) => x.key)) + 1)])}>
              <TermIcon name="plus" size={12} /> Thêm dòng
            </Btn>
            <Btn variant="primary" disabled={busy} onClick={doCreate}>
              {busy ? 'Đang tạo…' : 'Tạo đơn'}
            </Btn>
          </>
        )
      }
    >
      {created ? (
        <div className="rec-section">
          <h5><TermIcon name="pill" size={11} /> ĐƠN ĐÃ TẠO</h5>
          <div className="rec-kv">
            <span>Mã đơn</span><b className="mono">{created.prescriptionCode}</b>
            <span>Trạng thái</span><span><span className="chip info">{created.status}</span></span>
            <span>Số thuốc</span><span>{created.items?.length ?? 0}</span>
          </div>
          <div style={{ marginTop: 'var(--space-10)', fontSize: 12.5, color: 'var(--t-2)' }}>
            Ký đơn rồi gửi sang quầy phát — quầy sẽ thấy đơn chờ cấp phát (mã TELE-…).
          </div>
        </div>
      ) : (
        <>
          {rows.map((r, idx) => (
            <div key={r.key} style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-end', marginBottom: 'var(--space-10)', flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 260px', minWidth: 240 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Thuốc #{idx + 1}</div>
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  placeholder="Gõ ≥2 ký tự để tìm thuốc…"
                  filterOption={false}
                  onSearch={onSearchMedicine}
                  options={medOptions}
                  value={r.medicine?.id}
                  onChange={(v) => setRow(r.key, { medicine: options.find((m) => m.id === v) ?? r.medicine })}
                  notFoundContent="Gõ để tìm trong danh mục thuốc"
                />
              </div>
              <div style={{ width: 90 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>SL</div>
                <InputNumber min={1} style={{ width: '100%' }} value={r.quantity} onChange={(v) => setRow(r.key, { quantity: v ?? 1 })} />
              </div>
              <div style={{ width: 140 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Liều dùng</div>
                <Input value={r.dosage} onChange={(e) => setRow(r.key, { dosage: e.target.value })} placeholder="1 viên/lần" />
              </div>
              <div style={{ width: 130 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Tần suất</div>
                <Input value={r.frequency} onChange={(e) => setRow(r.key, { frequency: e.target.value })} placeholder="2 lần/ngày" />
              </div>
              <div style={{ width: 90 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Số ngày</div>
                <InputNumber min={1} style={{ width: '100%' }} value={r.durationDays} onChange={(v) => setRow(r.key, { durationDays: v ?? 1 })} />
              </div>
              <div style={{ flex: '1 1 160px', minWidth: 150 }}>
                <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Hướng dẫn</div>
                <Input value={r.instructions} onChange={(e) => setRow(r.key, { instructions: e.target.value })} placeholder="Sau ăn…" />
              </div>
              {rows.length > 1 && (
                <Btn variant="ghost" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} style={{ color: 'var(--s-crit)' }}>
                  <TermIcon name="x" size={12} />
                </Btn>
              )}
            </div>
          ))}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Ghi chú đơn</div>
            <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lời dặn của bác sĩ…" />
          </div>
        </>
      )}
    </ModalShell>
  );
};

/* ─────────── NEW A: Modal đặt lịch khám từ xa ─────────── */
type BookingDraft = {
  patientId: string;
  doctorId: string;
  departmentId: string;
  appointmentType: number;
  scheduledDate: string;
  scheduledTime: string;
  chiefComplaint: string;
  notes: string;
};

const emptyBooking = (): BookingDraft => ({
  patientId: '', doctorId: '', departmentId: '',
  appointmentType: 0, scheduledDate: '', scheduledTime: '',
  chiefComplaint: '', notes: '',
});

const TeleBookingModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [draft, setDraft] = useState<BookingDraft>(emptyBooking());
  const [busy, setBusy] = useState(false);
  const { errors: bkErrors, validate: bkValidate, clear: bkClear } = useModalForm(
    {
      patientId: { required: true, label: 'mã bệnh nhân' },
      doctorId: { required: true, label: 'mã bác sĩ' },
      scheduledDate: { required: true, label: 'ngày khám' },
    },
    open,
  );

  useEffect(() => { if (!open) setDraft(emptyBooking()); }, [open]);

  const set = (patch: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const fl = (label: string, req?: boolean) => (
    <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>
      {label}{req && <span style={{ color: 'var(--s-crit)' }}> *</span>}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '4px 8px',
    border: '1px solid var(--bdr)', borderRadius: 4,
    background: 'var(--bg-1)', color: 'var(--t-1)',
  };

  const doSubmit = async () => {
    if (!bkValidate({ patientId: draft.patientId.trim(), doctorId: draft.doctorId.trim(), scheduledDate: draft.scheduledDate })) return;
    setBusy(true);
    try {
      const dto: CreateTelemedicineAppointmentDto = {
        patientId: draft.patientId.trim(),
        doctorId: draft.doctorId.trim(),
        departmentId: draft.departmentId.trim(),
        appointmentType: draft.appointmentType,
        scheduledDate: draft.scheduledDate,
        scheduledTime: draft.scheduledTime || '08:00',
        durationMinutes: 30,
        chiefComplaint: draft.chiefComplaint.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      };
      await createAppointment(dto);
      message.success('Đã đặt lịch hẹn thành công');
      onClose();
      onDone();
    } catch {
      message.error('Không thể đặt lịch hẹn. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Đặt lịch khám từ xa"
      sub="Điền thông tin để tạo lịch hẹn mới"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="primary" disabled={busy} onClick={doSubmit}>
            {busy ? 'Đang đặt…' : 'Đặt lịch'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Field label="Mã bệnh nhân" required error={bkErrors.patientId}>
            <Input value={draft.patientId} onChange={(e) => { set({ patientId: e.target.value }); bkClear('patientId'); }} placeholder="VD: P001" />
          </Field>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Field label="Mã bác sĩ" required error={bkErrors.doctorId}>
            <Input value={draft.doctorId} onChange={(e) => { set({ doctorId: e.target.value }); bkClear('doctorId'); }} placeholder="VD: D001" />
          </Field>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          {fl('Mã khoa')}
          <Input value={draft.departmentId} onChange={(e) => set({ departmentId: e.target.value })} placeholder="VD: DEP001" />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          {fl('Loại khám')}
          <Select
            style={{ width: '100%' }}
            value={draft.appointmentType}
            onChange={(v) => set({ appointmentType: v })}
            options={[
              { value: 0, label: 'Video call' },
              { value: 1, label: 'Nhắn tin (Chat)' },
              { value: 2, label: 'Điện thoại' },
            ]}
          />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <Field label="Ngày khám" required error={bkErrors.scheduledDate}>
            <input
              type="date"
              style={inputStyle}
              value={draft.scheduledDate}
              onChange={(e) => { set({ scheduledDate: e.target.value }); bkClear('scheduledDate'); }}
            />
          </Field>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          {fl('Giờ khám')}
          <input
            type="time"
            style={inputStyle}
            value={draft.scheduledTime}
            onChange={(e) => set({ scheduledTime: e.target.value })}
          />
        </div>
        <div style={{ flex: '2 1 100%' }}>
          {fl('Lý do khám')}
          <Input.TextArea
            rows={3}
            value={draft.chiefComplaint}
            onChange={(e) => set({ chiefComplaint: e.target.value })}
            placeholder="Mô tả lý do khám…"
          />
        </div>
        <div style={{ flex: '2 1 100%' }}>
          {fl('Ghi chú')}
          <Input.TextArea
            rows={2}
            value={draft.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Ghi chú thêm…"
          />
        </div>
      </div>
    </ModalShell>
  );
};

/* ─────────── TODO (E): Consultation flow (createConsultation / completeConsultation)
   skipped — requires active sessionId + encounter IDs from the session context.
   Implement in a dedicated consultation modal when session management is fully wired.
   ─────────────────────────────────────────────────────────────────────────────────── */

const TelemedicineDrawerBody: React.FC<{ r: TelemedicineAppointmentDto }> = ({ r }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l || '';
  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span className={`chip ${r.paymentStatus === 1 ? 'ok' : 'warn'}`}>
            {r.paymentStatusName || (r.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán')}
          </span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Điện thoại</span><span className="mono">{r.phone || '—'}</span>
          {r.email && (<><span>Email</span><span className="mono">{r.email}</span></>)}
          {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
          {r.gender && (<><span>Giới tính</span><span>{r.gender}</span></>)}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="stethoscope" size={11} /> BÁC SĨ & LỊCH</h5>
        <div className="rec-kv">
          <span>Bác sĩ</span><b>{r.doctorName}</b>
          <span>Chuyên khoa</span><span>{r.doctorSpecialty || r.departmentName}</span>
          <span>Loại khám</span><span>{r.appointmentTypeName}</span>
          {r.chiefComplaint && (<><span>Lý do</span><span>{r.chiefComplaint}</span></>)}
          <span>Lịch hẹn</span><span className="mono">{fmtDT(r.scheduledDate)}</span>
          <span>Thời lượng</span><span>{r.durationMinutes || 30} phút</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="play" size={11} /> PHIÊN VIDEO</h5>
        <div className="rec-kv">
          <span>Meeting URL</span>
          {r.videoRoomUrl
            ? <a className="mono" href={r.videoRoomUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--a-cy)' }}>{r.videoRoomUrl}</a>
            : <span style={{ color: 'var(--t-3)' }}>Chưa tạo</span>}
          <span>Session ID</span><span className="mono">{r.sessionId || '—'}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="dollar" size={11} /> THANH TOÁN</h5>
        <div className="rec-kv">
          <span>Phí khám</span><b className="mono" style={{ color: 'var(--a-cy)' }}>{fmtVND(r.fee)}</b>
          <span>Trạng thái</span>
          <span>
            <span className={`chip ${r.paymentStatus === 1 ? 'ok' : 'warn'}`}>
              {r.paymentStatusName || (r.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán')}
            </span>
          </span>
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
};

export default TelemedicineV2;
