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
import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Avatar, DatePicker, Input, Select } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import {
  getAccount,
  getMyAppointments,
  bookAppointment,
  getDepartments,
  getDoctors,
  getBills,
  getPatientQuestions,
  createPatientQuestion,
  answerPatientQuestion,
} from '../api/patientPortal';
import type {
  PatientAccountDto,
  OnlineAppointmentDto,
  DepartmentInfoDto,
  DoctorInfoDto,
  BillSummaryDto,
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
  type ColumnDef,
  type StatusTone,
} from '../../../pages-v2/_v2kit';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Constants ──────────────────────────────────────────────────────────────

type TabKey = 'appointments' | 'qa' | 'account';

const TABS: { v: TabKey; l: string; ic: string }[] = [
  { v: 'appointments', l: 'Lịch hẹn', ic: 'calendar' },
  { v: 'qa', l: 'Hỏi đáp', ic: 'message-square' },
  { v: 'account', l: 'Tài khoản', ic: 'user' },
];

const APPT_STATUS: Record<number, { label: string; tone: StatusTone }> = {
  1: { label: 'Yêu cầu', tone: 'info' },
  2: { label: 'Xác nhận', tone: 'ok' },
  3: { label: 'Đã check-in', tone: 'info' },
  4: { label: 'Hoàn thành', tone: 'ok' },
  5: { label: 'Đã hủy', tone: 'crit' },
  6: { label: 'Vắng mặt', tone: 'warn' },
};

const QUESTION_STATUS: Record<number, { label: string; tone: StatusTone }> = {
  1: { label: 'Chờ trả lời', tone: 'warn' },
  2: { label: 'Đã trả lời', tone: 'ok' },
  3: { label: 'Đã đóng', tone: 'info' },
};

const TIME_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '15:30'];

const APPT_TYPES = [
  { value: 'NewVisit', label: 'Khám mới' },
  { value: 'FollowUp', label: 'Tái khám' },
  { value: 'HealthCheck', label: 'Khám sức khỏe' },
  { value: 'Telemedicine', label: 'Khám từ xa' },
];

const QUESTION_CATEGORIES = ['Khám bệnh', 'Xét nghiệm', 'Thuốc', 'Bảo hiểm', 'Thủ tục', 'Khác'];

type BookForm = { departmentId?: string; doctorId?: string; date?: string; time?: string; type?: string; notes: string };
const EMPTY_BOOK: BookForm = { notes: '' };

type QuestionForm = { subject: string; category?: string; content: string };
const EMPTY_QUESTION: QuestionForm = { subject: '', content: '' };

// ─── Main Component ──────────────────────────────────────────────────────────

const PatientPortalStaffV2: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('appointments');
  const [loading, setLoading] = useState(true);

  const [account, setAccount] = useState<PatientAccountDto | null>(null);
  const [appointments, setAppointments] = useState<OnlineAppointmentDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfoDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorInfoDto[]>([]);
  const [bills, setBills] = useState<BillSummaryDto[]>([]);
  const [questions, setQuestions] = useState<PatientQuestionDto[]>([]);

  const [bookOpen, setBookOpen] = useState(false);
  const [bookForm, setBookForm] = useState<BookForm>(EMPTY_BOOK);
  const [booking, setBooking] = useState(false);
  const [apptDetail, setApptDetail] = useState<OnlineAppointmentDto | null>(null);

  const [askOpen, setAskOpen] = useState(false);
  const [askForm, setAskForm] = useState<QuestionForm>(EMPTY_QUESTION);
  const [asking, setAsking] = useState(false);
  const [qDetail, setQDetail] = useState<PatientQuestionDto | null>(null);
  const [answerTarget, setAnswerTarget] = useState<PatientQuestionDto | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answering, setAnswering] = useState(false);

  // ── Load data (verbatim Promise.allSettled pattern from v1) ────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, apptRes, deptRes, docRes, billRes, qRes] = await Promise.allSettled([
        getAccount(),
        getMyAppointments(),
        getDepartments(),
        getDoctors(),
        getBills(),
        getPatientQuestions(),
      ]);
      if (accRes.status === 'fulfilled') setAccount(accRes.value.data ?? null);
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data ?? []);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data ?? []);
      if (docRes.status === 'fulfilled') setDoctors(docRes.value.data ?? []);
      if (billRes.status === 'fulfilled') setBills(billRes.value.data ?? []);
      if (qRes.status === 'fulfilled') setQuestions(qRes.value.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // ── Appointments tab ─────────────────────────────────────────────────────
  const apptColumns: ColumnDef<OnlineAppointmentDto>[] = [
    { key: 'date', label: 'Ngày', width: 110, render: (r) => (r.preferredDate ? dayjs(r.preferredDate).format('DD/MM/YYYY') : '—') },
    { key: 'time', label: 'Giờ', width: 80, render: (r) => r.preferredTime || '—' },
    { key: 'doctor', label: 'Bác sĩ', render: (r) => r.doctorName || '—' },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName },
    { key: 'type', label: 'Loại', width: 130, render: (r) => r.appointmentTypeName || '—' },
    {
      key: 'status', label: 'Trạng thái', width: 140, render: (r) => {
        const s = APPT_STATUS[r.status] || { label: r.statusName || 'N/A', tone: 'info' as StatusTone };
        return <StatusBadge tone={s.tone} dot>{s.label}</StatusBadge>;
      },
    },
  ];

  const openBook = () => { setBookForm({ ...EMPTY_BOOK }); setBookOpen(true); };

  // handleBookAppointment — verbatim mapping từ v1
  const onBook = async () => {
    if (!bookForm.departmentId) { te('Vui lòng chọn khoa'); return; }
    if (!bookForm.date) { te('Vui lòng chọn ngày'); return; }
    if (!bookForm.time) { te('Vui lòng chọn giờ'); return; }
    if (!bookForm.type) { te('Vui lòng chọn loại khám'); return; }
    setBooking(true);
    try {
      await bookAppointment({
        appointmentType: bookForm.type,
        departmentId: bookForm.departmentId,
        doctorId: bookForm.doctorId,
        preferredDate: bookForm.date,
        preferredTime: bookForm.time,
        chiefComplaint: bookForm.notes,
        isFirstVisit: bookForm.type === 'NewVisit',
        insuranceUsed: false,
        notes: bookForm.notes,
      });
      tk('Đã đặt lịch hẹn thành công');
      setBookOpen(false);
      try {
        const res = await getMyAppointments();
        setAppointments(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      te('Không thể đặt lịch hẹn. Vui lòng thử lại.');
    } finally {
      setBooking(false);
    }
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

  const openAsk = () => { setAskForm({ ...EMPTY_QUESTION }); setAskOpen(true); };

  // handleCreateQuestion — verbatim mapping từ v1
  const onAsk = async () => {
    if (!askForm.subject.trim()) { te('Vui lòng nhập chủ đề'); return; }
    if (!askForm.content.trim()) { te('Vui lòng nhập nội dung'); return; }
    setAsking(true);
    try {
      await createPatientQuestion({ subject: askForm.subject, content: askForm.content, category: askForm.category });
      tk('Đã gửi câu hỏi');
      setAskOpen(false);
      try {
        const res = await getPatientQuestions();
        setQuestions(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      te('Không thể gửi câu hỏi.');
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

  // ── Account tab (verbatim view-only từ v1, không có form sửa) ───────────────
  const unpaidBills = bills.filter((b) => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'PartialPaid');

  return (
    <div className="ab-module">
      <div className="ab-header">
        <h2 className="ab-title">Cổng bệnh nhân (Nhân viên)</h2>
      </div>

      <TopTabs<TabKey> tabs={TABS} tab={tab} setTab={setTab} />

      {tab === 'appointments' && (
        <>
          <div className="ab-tools">
            <span className="spacer" />
            <Btn variant="primary" icon="plus" onClick={openBook}>Đặt lịch mới</Btn>
          </div>
          <DataTable<OnlineAppointmentDto>
            columns={apptColumns}
            data={appointments}
            rowKey={(r) => r.id}
            onRowClick={setApptDetail}
            empty={loading ? 'Đang tải…' : 'Chưa có lịch hẹn nào'}
          />
        </>
      )}

      {tab === 'qa' && (
        <>
          <div className="ab-tools">
            <span className="spacer" />
            <Btn variant="primary" icon="plus" onClick={openAsk}>Đặt câu hỏi</Btn>
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
          {account ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)', marginBottom: 'var(--space-16)' }}>
                <Avatar size={72} icon={<UserOutlined />} src={account.avatarUrl} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{account.fullName}</div>
                  <StatusBadge tone={account.accountStatus === 1 ? 'ok' : account.accountStatus === 2 ? 'crit' : 'info'} dot>
                    {account.accountStatusName || '—'}
                  </StatusBadge>
                </div>
              </div>
              <DrSec title="Thông tin liên hệ">
                <DrField lbl="SĐT">{account.phone}</DrField>
                <DrField lbl="Email">{account.email || '—'}</DrField>
                <DrField lbl="Địa chỉ">{account.address || '—'}</DrField>
              </DrSec>
              <DrSec title="Thông tin cá nhân">
                <DrField lbl="Ngày sinh">{account.dateOfBirth ? dayjs(account.dateOfBirth).format('DD/MM/YYYY') : '—'}</DrField>
                <DrField lbl="CCCD">{account.idNumber || '—'}</DrField>
                <DrField lbl="BHYT">{account.healthInsurance?.cardNumber || 'Không có'}</DrField>
                <DrField lbl="Liên kết BN">
                  {account.isLinkedToPatient
                    ? <StatusBadge tone="ok" dot>{`Đã liên kết (${account.patientCode || ''})`}</StatusBadge>
                    : <StatusBadge tone="warn" dot>Chưa liên kết</StatusBadge>}
                </DrField>
                <DrField lbl="Đăng nhập gần nhất">{account.lastLoginAt ? dayjs(account.lastLoginAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
              </DrSec>
              <DrSec title="Hóa đơn chưa thanh toán">
                {unpaidBills.length > 0 ? unpaidBills.map((b) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span>{`Hóa đơn ${b.billCode} — ${b.billDate ? dayjs(b.billDate).format('DD/MM/YYYY') : '—'}`}</span>
                    <b style={{ color: 'var(--clr-crit)' }}>{(b.amountDue ?? 0).toLocaleString('vi-VN')} VND</b>
                  </div>
                )) : <div style={{ color: 'var(--t-2)', fontSize: 12.5 }}>Không có hóa đơn chưa thanh toán</div>}
              </DrSec>
            </>
          ) : (
            <div style={{ color: 'var(--t-2)' }}>Chưa có thông tin tài khoản</div>
          )}
        </div>
      )}

      {/* Appointment detail drawer */}
      <DrawerShell open={!!apptDetail} onClose={() => setApptDetail(null)} title="Chi tiết lịch hẹn" size="md">
        {apptDetail && (
          <DrSec title="Thông tin lịch hẹn">
            <DrField lbl="Bệnh nhân">{apptDetail.patientName}</DrField>
            <DrField lbl="Ngày hẹn">{apptDetail.preferredDate ? dayjs(apptDetail.preferredDate).format('DD/MM/YYYY') : '—'}</DrField>
            <DrField lbl="Giờ">{apptDetail.preferredTime}</DrField>
            <DrField lbl="Khoa">{apptDetail.departmentName}</DrField>
            <DrField lbl="Bác sĩ">{apptDetail.doctorName || '—'}</DrField>
            <DrField lbl="Lý do">{apptDetail.chiefComplaint || '—'}</DrField>
            <DrField lbl="Trạng thái">{apptDetail.statusName}</DrField>
            {apptDetail.confirmationCode && <DrField lbl="Mã xác nhận">{apptDetail.confirmationCode}</DrField>}
            {apptDetail.notes && <DrField lbl="Ghi chú">{apptDetail.notes}</DrField>}
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
        <DrField lbl="Khoa *">
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn khoa"
            value={bookForm.departmentId}
            onChange={(v) => setBookForm({ ...bookForm, departmentId: v })}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </DrField>
        <DrField lbl="Bác sĩ">
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn bác sĩ (không bắt buộc)"
            allowClear
            value={bookForm.doctorId}
            onChange={(v) => setBookForm({ ...bookForm, doctorId: v })}
            options={doctors.map((d) => ({ value: d.id, label: d.title ? `${d.title} ${d.name} - ${d.specialty}` : `${d.name} - ${d.specialty}` }))}
          />
        </DrField>
        <DrField lbl="Ngày *">
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={bookForm.date ? dayjs(bookForm.date) : null}
            onChange={(d) => setBookForm({ ...bookForm, date: d ? d.format('YYYY-MM-DD') : undefined })}
          />
        </DrField>
        <DrField lbl="Giờ *">
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn giờ"
            value={bookForm.time}
            onChange={(v) => setBookForm({ ...bookForm, time: v })}
            options={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
          />
        </DrField>
        <DrField lbl="Loại khám *">
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
        <DrField lbl="Chủ đề *">
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
        <DrField lbl="Nội dung *">
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
        <DrField lbl="Trả lời *">
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
