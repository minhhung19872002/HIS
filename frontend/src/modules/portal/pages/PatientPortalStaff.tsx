// =====================================================================
// HIS Terminal · CỔNG BỆNH NHÂN — NHÂN VIÊN (v2)
// Issue #409 — port v1 pages/PatientPortal.tsx (staff-on-behalf, route cũ
// /patient-portal-staff) sang v2 (_v2kit/TopTabs), theo 3 nhóm nêu trong AC:
// Lịch hẹn · Hỏi đáp · Tài khoản.
//
// GHI CHÚ PHẠM VI (đã verify trước khi port — xem báo cáo cuối task):
// - v1 KHÔNG có duyệt/xếp lịch/từ chối lịch hẹn (chỉ có đặt lịch hộ + xem
//   danh sách) và backend cũng chưa có endpoint approve/reject/schedule cho
//   OnlineAppointment (chỉ có Cancel/Reschedule) → tab "Lịch hẹn" port đúng
//   những gì v1 thực có (đặt lịch hộ + danh sách), KHÔNG dựng nút giả.
// - Tab "Hỏi đáp": v1 chỉ có "đặt câu hỏi hộ BN". Nút "Trả lời" là ĐIỂM MỚI
//   hợp lệ — backend đã có sẵn PUT /portal/questions/{id}/answer
//   (AnswerPatientQuestionAsync, không giới hạn IsPortalPatient) nhưng v1 và
//   FE api client trước đây chưa từng gọi. Được phép thêm theo hướng dẫn task
//   bước 3 ("thêm function vào api nếu thiếu").
// - Tab "Tài khoản": port verbatim phần xem thông tin (v1 không có form
//   sửa/khoá tài khoản — quản trị account thật (suspend/activate hàng loạt)
//   cần endpoint admin-list riêng, backend hiện chưa có → KHÔNG dựng giả.
// =====================================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import dayjs from 'dayjs';
import { DatePicker, Input, Modal, Select } from 'antd';
import {
  getPatientAppointments,
  bookPatientAppointment,
  cancelAppointment,
  getDepartments,
  getDoctors,
  getPatientInvoices,
  getPatientQuestions,
  createPatientQuestion,
  answerPatientQuestion,
  searchStaffPortalAccounts,
} from '../api/patientPortal';
import type {
  PortalAccountLookupDto,
  PortalAppointmentRow,
  PortalInvoiceRow,
  DepartmentInfoDto,
  DoctorInfoDto,
  PatientQuestionDto,
} from '../api/patientPortal';
import {
  TopTabs,
  DataTable,
  DrawerShell,
  DrSec,
  DrField,
  ModalShell,
  ActBtn,
  Btn,
  StatusBadge,
  tk,
  te,
  tw,
  type ColumnDef,
  type StatusTone,
} from '@/_v2kit';
import { useAuth } from '../../../contexts/AuthContext';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

// ─── Constants ──────────────────────────────────────────────────────────────

type TabKey = 'appointments' | 'qa' | 'account';

const TABS: { v: TabKey; l: string; ic: string }[] = [
  { v: 'appointments', l: 'Lịch hẹn', ic: 'calendar' },
  { v: 'qa', l: 'Hỏi đáp', ic: 'message-square' },
  { v: 'account', l: 'Tài khoản', ic: 'user' },
];

// QA-R11: /portal/appointments returns a string status (HIS appointment 0..4 mapped by the API).
const APPT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  Pending: { label: 'Chờ xác nhận', tone: 'info' },
  Confirmed: { label: 'Đã xác nhận', tone: 'ok' },
  CheckedIn: { label: 'Đã đến khám', tone: 'ok' },
  NoShow: { label: 'Không đến', tone: 'warn' },
  Cancelled: { label: 'Đã hủy', tone: 'crit' },
};

// /portal/departments and /portal/doctors return the raw entity names, not DepartmentInfoDto/DoctorInfoDto.
type DeptOption = DepartmentInfoDto & { departmentName?: string; departmentCode?: string };
type DoctorOption = DoctorInfoDto & { fullName?: string };

const QUESTION_STATUS: Record<number, { label: string; tone: StatusTone }> = {
  1: { label: 'Chờ trả lời', tone: 'warn' },
  2: { label: 'Đã trả lời', tone: 'ok' },
  3: { label: 'Đã đóng', tone: 'info' },
};

const TIME_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '15:30'];

// Values = CreatePortalAppointmentDto.VisitType (the HIS booking has no tele-visit type — use the Telemedicine page).
const APPT_TYPES = [
  { value: 'New', label: 'Khám mới' },
  { value: 'FollowUp', label: 'Tái khám' },
  { value: 'HealthCheck', label: 'Khám sức khỏe' },
];

const QUESTION_CATEGORIES = ['Khám bệnh', 'Xét nghiệm', 'Thuốc', 'Bảo hiểm', 'Thủ tục', 'Khác'];

type BookForm = { departmentId?: string; doctorId?: string; date?: string; time?: string; type?: string; notes: string };
const EMPTY_BOOK: BookForm = { notes: '' };

type QuestionForm = { accountId?: string; subject: string; category?: string; content: string };
const EMPTY_QUESTION: QuestionForm = { subject: '', content: '' };

const accountLabel = (a: PortalAccountLookupDto) =>
  `${a.patientCode ? `${a.patientCode} — ` : ''}${a.patientName || 'Chưa liên kết hồ sơ'} · ${a.maskedPhone || '—'}`;

// ─── Main Component ──────────────────────────────────────────────────────────

const PatientPortalStaffV2: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useTabState<TabKey>('appointments');
  const [loading, setLoading] = useState(true);

  // QA-R11: staff act on behalf of ONE selected portal account (was: GET /portal/account = empty stub for staff,
  // hospital-wide appointments/bills, and a booking with no patient that the API could not accept).
  const [selected, setSelected] = useState<PortalAccountLookupDto | null>(null);
  const [appointments, setAppointments] = useState<PortalAppointmentRow[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [bills, setBills] = useState<PortalInvoiceRow[]>([]);
  const [questions, setQuestions] = useState<PatientQuestionDto[]>([]);

  const [bookOpen, setBookOpen] = useState(false);
  const [bookForm, setBookForm] = useState<BookForm>(EMPTY_BOOK);
  const [booking, setBooking] = useState(false);
  const [apptDetail, setApptDetail] = useState<PortalAppointmentRow | null>(null);

  const [askOpen, setAskOpen] = useState(false);
  const [askForm, setAskForm] = useState<QuestionForm>(EMPTY_QUESTION);
  const [asking, setAsking] = useState(false);
  const [portalAccounts, setPortalAccounts] = useState<PortalAccountLookupDto[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const accountSearchSeq = useRef(0);
  const [qDetail, setQDetail] = useState<PatientQuestionDto | null>(null);
  const [answerTarget, setAnswerTarget] = useState<PatientQuestionDto | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answering, setAnswering] = useState(false);

  // ── Load data (verbatim Promise.allSettled pattern from v1) ────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, docRes, qRes] = await Promise.allSettled([
        getDepartments(),
        getDoctors(),
        getPatientQuestions(),
      ]);
      if (deptRes.status === 'fulfilled') setDepartments((deptRes.value.data ?? []) as DeptOption[]);
      if (docRes.status === 'fulfilled') setDoctors((docRes.value.data ?? []) as DoctorOption[]);
      if (qRes.status === 'fulfilled') setQuestions(qRes.value.data ?? []);
      // #467 — nhánh rejected trước đây bị nuốt hoàn toàn: gom 1 cảnh báo nêu rõ phần nào thiếu
      const settled: PromiseSettledResult<unknown>[] = [deptRes, docRes, qRes];
      const labels = ['danh sách khoa', 'danh sách bác sĩ', 'câu hỏi'];
      const failed = labels.filter((_, i) => settled[i].status === 'rejected');
      if (failed.length > 0) {
        const first = settled.find((r) => r.status === 'rejected');
        tw(`Không tải được ${failed.join(', ')}. ${friendlyErrorMessage(
          first && first.status === 'rejected' ? first.reason : undefined,
          'Dữ liệu hiển thị có thể chưa đầy đủ, vui lòng tải lại trang.',
        )}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Appointments + invoices of the selected patient (history included so cancelled/visited rows show too).
  const selectedPatientId = selected?.patientId ?? undefined;
  const loadPatientData = useCallback(async () => {
    if (!selectedPatientId) { setAppointments([]); setBills([]); return; }
    const [apptRes, billRes] = await Promise.allSettled([
      getPatientAppointments(selectedPatientId, true),
      getPatientInvoices(selectedPatientId),
    ]);
    setAppointments(apptRes.status === 'fulfilled' ? apptRes.value.data ?? [] : []);
    setBills(billRes.status === 'fulfilled' ? billRes.value.data ?? [] : []);
    const failed = [apptRes, billRes].find((r) => r.status === 'rejected');
    if (failed && failed.status === 'rejected') tw(friendlyErrorMessage(failed.reason, 'Không tải được lịch hẹn / hóa đơn của người bệnh'));
  }, [selectedPatientId]);
  useEffect(() => { void loadPatientData(); }, [loadPatientData]);

  // ── Appointments tab ─────────────────────────────────────────────────────
  const apptColumns: ColumnDef<PortalAppointmentRow>[] = [
    { key: 'code', label: 'Mã hẹn', width: 140, mono: true, render: (r) => r.appointmentCode || '—' },
    { key: 'date', label: 'Ngày', width: 110, render: (r) => (r.appointmentDate ? dayjs(r.appointmentDate).format('DD/MM/YYYY') : '—') },
    { key: 'time', label: 'Giờ', width: 80, render: (r) => (r.appointmentTime && r.appointmentTime !== '00:00:00' ? r.appointmentTime.slice(0, 5) : '—') },
    { key: 'doctor', label: 'Bác sĩ', render: (r) => r.doctorName || '—' },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    {
      key: 'status', label: 'Trạng thái', width: 140, render: (r) => {
        const s = APPT_STATUS[r.status] || { label: r.status || 'N/A', tone: 'info' as StatusTone };
        return <StatusBadge tone={s.tone} dot>{s.label}</StatusBadge>;
      },
    },
  ];

  const openBook = () => {
    if (!selected?.patientId) { te('Chọn tài khoản người bệnh (đã liên kết hồ sơ) trước khi đặt lịch hộ'); return; }
    setBookForm({ ...EMPTY_BOOK });
    setBookOpen(true);
  };

  // QA-R11: send the fields the API reads (CreatePortalAppointmentDto) + the patient; the API now books a real
  // HIS appointment (slot capacity, same-day duplicate, queue number) and returns its validation message.
  const onBook = async () => {
    if (!selected?.patientId) { te('Chưa chọn người bệnh'); return; }
    if (!bookForm.departmentId) { te('Vui lòng chọn khoa'); return; }
    if (!bookForm.date) { te('Vui lòng chọn ngày'); return; }
    if (!bookForm.time) { te('Vui lòng chọn giờ'); return; }
    if (!bookForm.type) { te('Vui lòng chọn loại khám'); return; }
    setBooking(true);
    try {
      await bookPatientAppointment(selected.patientId, {
        appointmentDate: bookForm.date,
        appointmentTime: `${bookForm.time}:00`,
        departmentId: bookForm.departmentId,
        doctorId: bookForm.doctorId,
        visitType: bookForm.type,
        reasonForVisit: bookForm.notes,
        symptoms: '',
      });
      tk('Đã đặt lịch hẹn thành công');
      setBookOpen(false);
      void loadPatientData();
    } catch (err) {
      te(friendlyErrorMessage(err, 'Không thể đặt lịch hẹn. Vui lòng thử lại.'));
    } finally {
      setBooking(false);
    }
  };

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const onCancelAppt = (r: PortalAppointmentRow) => {
    if (cancellingId) return;
    Modal.confirm({
      title: 'Hủy lịch hẹn',
      content: `Hủy lịch hẹn ${r.appointmentCode || ''} ngày ${dayjs(r.appointmentDate).format('DD/MM/YYYY')}?`,
      okText: 'Hủy lịch',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        setCancellingId(r.id);
        try {
          await cancelAppointment(r.id, 'Nhân viên hủy hộ người bệnh');
          tk('Đã hủy lịch hẹn');
          void loadPatientData();
        } catch (err) {
          te(friendlyErrorMessage(err, 'Không hủy được lịch hẹn'));
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  // ── Q&A tab ──────────────────────────────────────────────────────────────
  const qColumns: ColumnDef<PatientQuestionDto>[] = [
    { key: 'subject', label: 'Chủ đề', render: (r) => r.subject },
    { key: 'category', label: 'Danh mục', width: 120, render: (r) => r.category || '—' },
    {
      key: 'status', label: 'Trạng thái', width: 130, render: (r) => {
        const s = QUESTION_STATUS[r.status] || { label: r.statusName || 'N/A', tone: 'info' as StatusTone };
        return <StatusBadge tone={s.tone} dot>{s.label}</StatusBadge>;
      },
    },
    { key: 'createdAt', label: 'Ngày gửi', width: 110, render: (r) => (r.createdAt ? dayjs(r.createdAt).format('DD/MM/YYYY') : '—') },
    { key: 'answeredByName', label: 'Người trả lời', width: 150, render: (r) => r.answeredByName || '—' },
  ];

  // QA-R8: a question belongs to a portal account — staff pick it (GET /portal/staff/accounts, phone masked).
  const loadPortalAccounts = useCallback(async (keyword?: string) => {
    const seq = ++accountSearchSeq.current;
    setAccountsLoading(true);
    try {
      const res = await searchStaffPortalAccounts(keyword?.trim());
      if (seq === accountSearchSeq.current) setPortalAccounts(res.data ?? []);
    } catch (e) {
      if (seq === accountSearchSeq.current) {
        setPortalAccounts([]);
        tw(friendlyErrorMessage(e, 'Không tải được danh sách tài khoản cổng bệnh nhân'));
      }
    } finally {
      if (seq === accountSearchSeq.current) setAccountsLoading(false);
    }
  }, []);

  const openAsk = () => { setAskForm({ ...EMPTY_QUESTION }); setAskOpen(true); void loadPortalAccounts(); };

  // handleCreateQuestion — verbatim mapping từ v1
  const onAsk = async () => {
    if (!askForm.accountId) { te('Vui lòng chọn tài khoản người bệnh'); return; }
    if (!askForm.subject.trim()) { te('Vui lòng nhập chủ đề'); return; }
    if (!askForm.content.trim()) { te('Vui lòng nhập nội dung'); return; }
    setAsking(true);
    try {
      await createPatientQuestion({
        accountId: askForm.accountId,
        subject: askForm.subject.trim(),
        content: askForm.content.trim(),
        category: askForm.category,
      });
      tk('Đã gửi câu hỏi');
      setAskOpen(false);
      try {
        const res = await getPatientQuestions();
        setQuestions(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch (err) {
      // QA-R7: the API now refuses a question without an existing portal account — show its reason.
      te(friendlyErrorMessage(err, 'Không thể gửi câu hỏi.'));
    } finally {
      setAsking(false);
    }
  };

  const openAnswer = (q: PatientQuestionDto) => { setAnswerText(q.answer || ''); setAnswerTarget(q); };

  // onAnswer — ĐIỂM MỚI: gọi endpoint backend đã có sẵn nhưng chưa từng wired lên FE
  const onAnswer = async () => {
    if (!answerTarget) return;
    if (!answerText.trim()) { te('Vui lòng nhập nội dung trả lời'); return; }
    setAnswering(true);
    try {
      await answerPatientQuestion(answerTarget.id, {
        answeredBy: user?.id,
        answeredByName: user?.fullName,
        answer: answerText,
      });
      tk('Đã gửi trả lời');
      setAnswerTarget(null);
      setQDetail(null);
      try {
        const res = await getPatientQuestions();
        setQuestions(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      te('Không thể gửi trả lời.');
    } finally {
      setAnswering(false);
    }
  };

  // ── Account tab (view-only: the selected portal account + its unpaid invoices) ───────
  const unpaidBills = bills.filter((b) => b.paymentStatus !== 'Paid');
  useEffect(() => { void loadPortalAccounts(); }, [loadPortalAccounts]);

  return (
    <div className="ab-module">
      <div className="ab-header">
        <h2 className="ab-title">Cổng bệnh nhân (Nhân viên)</h2>
      </div>

      <div className="ab-tools">
        <span style={{ fontSize: 12, color: 'var(--t-2)' }}>Người bệnh</span>
        <Select
          style={{ width: 420 }}
          showSearch
          allowClear
          filterOption={false}
          loading={accountsLoading}
          placeholder="Chọn tài khoản cổng BN (mã BN / họ tên / 3 số cuối SĐT)"
          value={selected?.id}
          onSearch={(kw) => void loadPortalAccounts(kw)}
          onChange={(v) => setSelected(portalAccounts.find((a) => a.id === v) ?? null)}
          notFoundContent={accountsLoading ? 'Đang tìm…' : 'Không có tài khoản phù hợp'}
          options={portalAccounts.map((a) => ({ value: a.id, label: accountLabel(a) }))}
        />
      </div>

      <TopTabs<TabKey> tabs={TABS} tab={tab} setTab={setTab} />

      {tab === 'appointments' && (
        <>
          <div className="ab-tools">
            <span className="spacer" />
            <Btn variant="primary" icon="plus" onClick={openBook}>Đặt lịch mới</Btn>
          </div>
          <DataTable<PortalAppointmentRow>
            columns={apptColumns}
            data={appointments}
            rowKey={(r) => r.id}
            onRowClick={setApptDetail}
            actions={(r) => (r.status === 'Pending' || r.status === 'Confirmed'
              ? <ActBtn ic="x" title="Hủy lịch hẹn" onClick={() => onCancelAppt(r)} />
              : null)}
            empty={!selected ? 'Chọn người bệnh để xem lịch hẹn' : 'Chưa có lịch hẹn nào'}
          />
        </>
      )}

      {tab === 'qa' && (
        <>
          <div className="ab-tools">
            <span className="spacer" />
            {/* QA-R8: a question must belong to a patient portal account — the ask modal now has an account picker. */}
            <Btn variant="primary" icon="plus" onClick={openAsk}
              title="Đặt câu hỏi hộ người bệnh (chọn tài khoản app của người bệnh)">Đặt câu hỏi</Btn>
          </div>
          <DataTable<PatientQuestionDto>
            columns={qColumns}
            data={questions}
            rowKey={(r) => r.id}
            onRowClick={setQDetail}
            actions={(r) => (r.status === 1
              ? <ActBtn ic="message-square" title="Trả lời" onClick={() => openAnswer(r)} />
              : null)}
            empty={loading ? 'Đang tải…' : 'Chưa có câu hỏi nào'}
          />
        </>
      )}

      {tab === 'account' && (
        <div style={{ padding: 'var(--space-16) 0' }}>
          {selected ? (
            <>
              <DrSec title="Tài khoản cổng bệnh nhân">
                <DrField lbl="Người bệnh"><b>{selected.patientName || '—'}</b></DrField>
                <DrField lbl="Mã BN">{selected.patientCode || '—'}</DrField>
                <DrField lbl="SĐT">{selected.maskedPhone || '—'}</DrField>
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={selected.status === 'Active' ? 'ok' : 'warn'} dot>{selected.status || '—'}</StatusBadge>
                </DrField>
                <DrField lbl="Liên kết BN">
                  {selected.patientId
                    ? <StatusBadge tone="ok" dot>{`Đã liên kết (${selected.patientCode || ''})`}</StatusBadge>
                    : <StatusBadge tone="warn" dot>Chưa liên kết</StatusBadge>}
                </DrField>
              </DrSec>
              <DrSec title="Hóa đơn chưa thanh toán">
                {unpaidBills.length > 0 ? unpaidBills.map((b) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span>{`Hóa đơn ${b.invoiceCode} — ${b.invoiceDate ? dayjs(b.invoiceDate).format('DD/MM/YYYY') : '—'}`}</span>
                    <b style={{ color: 'var(--clr-crit)' }}>{(b.totalAmount ?? 0).toLocaleString('vi-VN')} VND</b>
                  </div>
                )) : <div style={{ color: 'var(--t-2)', fontSize: 12.5 }}>Không có hóa đơn chưa thanh toán</div>}
              </DrSec>
            </>
          ) : (
            <div style={{ color: 'var(--t-2)' }}>Chọn tài khoản người bệnh ở trên để xem thông tin</div>
          )}
        </div>
      )}

      {/* Appointment detail drawer */}
      <DrawerShell open={!!apptDetail} onClose={() => setApptDetail(null)} title="Chi tiết lịch hẹn" size="md">
        {apptDetail && (
          <DrSec title="Thông tin lịch hẹn">
            <DrField lbl="Mã hẹn">{apptDetail.appointmentCode || '—'}</DrField>
            <DrField lbl="Bệnh nhân">{apptDetail.patientName || selected?.patientName || '—'}</DrField>
            <DrField lbl="Ngày hẹn">{apptDetail.appointmentDate ? dayjs(apptDetail.appointmentDate).format('DD/MM/YYYY') : '—'}</DrField>
            <DrField lbl="Giờ">{apptDetail.appointmentTime && apptDetail.appointmentTime !== '00:00:00' ? apptDetail.appointmentTime.slice(0, 5) : '—'}</DrField>
            <DrField lbl="Khoa">{apptDetail.departmentName || '—'}</DrField>
            <DrField lbl="Phòng">{apptDetail.roomNumber || '—'}</DrField>
            <DrField lbl="Bác sĩ">{apptDetail.doctorName || '—'}</DrField>
            <DrField lbl="Lý do">{apptDetail.reasonForVisit || '—'}</DrField>
            <DrField lbl="Trạng thái">{APPT_STATUS[apptDetail.status]?.label ?? apptDetail.status}</DrField>
            {apptDetail.queueNumber != null && <DrField lbl="Số thứ tự">{apptDetail.queueNumber}</DrField>}
          </DrSec>
        )}
      </DrawerShell>

      {/* Book appointment modal */}
      <ModalShell
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Đặt lịch hẹn"
        footer={(
          <>
            <Btn onClick={() => setBookOpen(false)}>Hủy</Btn>
            <Btn variant="primary" onClick={onBook} loading={booking}>Đặt lịch</Btn>
          </>
        )}
      >
        <DrField lbl="Khoa" required>
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn khoa"
            value={bookForm.departmentId}
            onChange={(v) => setBookForm({ ...bookForm, departmentId: v })}
            options={departments.map((d) => ({ value: d.id, label: d.departmentName ?? d.name }))}
          />
        </DrField>
        <DrField lbl="Bác sĩ">
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn bác sĩ (không bắt buộc)"
            allowClear
            value={bookForm.doctorId}
            onChange={(v) => setBookForm({ ...bookForm, doctorId: v })}
            options={doctors.map((d) => {
              const name = d.fullName ?? d.name;
              const spec = d.specialty ? ` - ${d.specialty}` : '';
              return { value: d.id, label: d.title ? `${d.title} ${name}${spec}` : `${name}${spec}` };
            })}
          />
        </DrField>
        <DrField lbl="Ngày" required>
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={bookForm.date ? dayjs(bookForm.date) : null}
            onChange={(d) => setBookForm({ ...bookForm, date: d ? d.format('YYYY-MM-DD') : undefined })}
          />
        </DrField>
        <DrField lbl="Giờ" required>
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn giờ"
            value={bookForm.time}
            onChange={(v) => setBookForm({ ...bookForm, time: v })}
            options={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
          />
        </DrField>
        <DrField lbl="Loại khám" required>
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn loại khám"
            value={bookForm.type}
            onChange={(v) => setBookForm({ ...bookForm, type: v })}
            options={APPT_TYPES}
          />
        </DrField>
        <DrField lbl="Ghi chú">
          <Input.TextArea
            rows={2}
            placeholder="Mô tả triệu chứng hoặc lý do khám..."
            value={bookForm.notes}
            onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
          />
        </DrField>
      </ModalShell>

      {/* Ask question modal */}
      <ModalShell
        open={askOpen}
        onClose={() => setAskOpen(false)}
        title="Đặt câu hỏi"
        footer={(
          <>
            <Btn onClick={() => setAskOpen(false)}>Hủy</Btn>
            <Btn variant="primary" onClick={onAsk} loading={asking}>Gửi</Btn>
          </>
        )}
      >
        <DrField lbl="Tài khoản người bệnh" required>
          <Select
            style={{ width: '100%' }}
            showSearch
            allowClear
            filterOption={false}
            loading={accountsLoading}
            placeholder="Tìm theo mã BN / họ tên / 3 số cuối SĐT"
            value={askForm.accountId}
            onSearch={(kw) => void loadPortalAccounts(kw)}
            onChange={(v) => setAskForm({ ...askForm, accountId: v })}
            notFoundContent={accountsLoading ? 'Đang tìm…' : 'Không có tài khoản phù hợp'}
            options={portalAccounts.map((a) => ({ value: a.id, label: accountLabel(a) }))}
          />
        </DrField>
        <DrField lbl="Chủ đề" required>
          <Input
            placeholder="Nhập chủ đề câu hỏi"
            value={askForm.subject}
            onChange={(e) => setAskForm({ ...askForm, subject: e.target.value })}
          />
        </DrField>
        <DrField lbl="Danh mục">
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn danh mục"
            allowClear
            value={askForm.category}
            onChange={(v) => setAskForm({ ...askForm, category: v })}
            options={QUESTION_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </DrField>
        <DrField lbl="Nội dung" required>
          <Input.TextArea
            rows={4}
            placeholder="Mô tả chi tiết câu hỏi của bạn..."
            value={askForm.content}
            onChange={(e) => setAskForm({ ...askForm, content: e.target.value })}
          />
        </DrField>
      </ModalShell>

      {/* Question detail drawer */}
      <DrawerShell open={!!qDetail} onClose={() => setQDetail(null)} title={qDetail?.subject || 'Câu hỏi'} size="md">
        {qDetail && (
          <DrSec title="Nội dung">
            <DrField lbl="Danh mục">{qDetail.category || '—'}</DrField>
            <DrField lbl="Ngày gửi">{qDetail.createdAt ? dayjs(qDetail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Trạng thái">{qDetail.statusName}</DrField>
            <DrField lbl="Câu hỏi">{qDetail.content}</DrField>
            {qDetail.answer && (
              <DrField lbl="Trả lời">
                <div>{qDetail.answer}</div>
                <div style={{ color: 'var(--t-2)', fontSize: 11 }}>
                  {qDetail.answeredByName} · {qDetail.answeredAt ? dayjs(qDetail.answeredAt).format('DD/MM/YYYY HH:mm') : ''}
                </div>
              </DrField>
            )}
            {qDetail.status === 1 && (
              <div style={{ marginTop: 'var(--space-12)' }}>
                <Btn variant="primary" icon="message-square" onClick={() => openAnswer(qDetail)}>Trả lời câu hỏi</Btn>
              </div>
            )}
          </DrSec>
        )}
      </DrawerShell>

      {/* Answer modal — ĐIỂM MỚI, gọi answerPatientQuestion (backend có sẵn) */}
      <ModalShell
        open={!!answerTarget}
        onClose={() => setAnswerTarget(null)}
        title="Trả lời câu hỏi"
        sub={answerTarget?.subject}
        footer={(
          <>
            <Btn onClick={() => setAnswerTarget(null)}>Hủy</Btn>
            <Btn variant="primary" onClick={onAnswer} loading={answering}>Gửi trả lời</Btn>
          </>
        )}
      >
        <DrField lbl="Câu hỏi">{answerTarget?.content}</DrField>
        <DrField lbl="Trả lời" required>
          <Input.TextArea
            rows={4}
            placeholder="Nhập nội dung trả lời..."
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          />
        </DrField>
      </ModalShell>
    </div>
  );
};

export default PatientPortalStaffV2;
