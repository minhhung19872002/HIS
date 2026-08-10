import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  getBookingDepartments, getBookingDoctors, getAvailableSlots,
  bookAppointment, lookupAppointment, cancelBooking,
} from '../api/appointmentBooking';
import type {
  BookingDepartmentDto, BookingDoctorDto, BookingSlotResult,
  BookingTimeSlot, BookingResultDto, BookingStatusDto,
} from '../api/appointmentBooking';
import { AbSelect, Btn, LoadingState, StatusBadge, Ico, tk, ti, tw, cf } from '@/_v2kit';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../../constants/hospital';

/* ==========================================================================
   Đặt lịch khám online (public, /dat-lich) — #456 port v1 Antd → v2kit.
   Standalone: ngoài ProtectedRoute/TerminalLayout, bệnh nhân không cần login.
   4 bước: khoa/BS/ngày + slot → thông tin BN → xác nhận → kết quả;
   kèm tra cứu + hủy lịch bằng mã hẹn/SĐT.
   ========================================================================== */

const STEPS = ['Chọn khoa & ngày', 'Thông tin cá nhân', 'Xác nhận', 'Hoàn tất'];

// Input text native theo token ab (DoD: không dùng Antd trực tiếp)
const Inp: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    style={{
      width: '100%', height: 30, padding: '0 10px',
      background: 'var(--d-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
      font: 'inherit', fontSize: 12, color: 'var(--t-0)',
      ...props.style,
    }}
  />
);

const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({ label, required, error, children }) => (
  <div {...(error ? { 'data-fld-err': '' } : {})}>
    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>
      {label}{required && <span style={{ color: 'var(--s-crit)' }}> *</span>}
    </div>
    {children}
    {error && <div style={{ fontSize: 10.5, color: 'var(--s-crit)', marginTop: 3 }}>{error}</div>}
  </div>
);

interface FormState {
  departmentId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentType: number;
  patientName: string;
  phoneNumber: string;
  email: string;
  dateOfBirth: string;
  gender?: number;
  identityNumber: string;
  address: string;
  reason: string;
}

const EMPTY_FORM: FormState = {
  departmentId: '', doctorId: '', appointmentDate: '', appointmentType: 2,
  patientName: '', phoneNumber: '', email: '', dateOfBirth: '',
  gender: undefined, identityNumber: '', address: '', reason: '',
};

const statusTone = (s: number): 'ok' | 'info' | 'warn' | 'crit' =>
  s === 2 ? 'ok' : s === 1 ? 'info' : s === 3 ? 'crit' : 'warn';

export default function AppointmentBookingPublic() {
  const [mode, setMode] = useState<'book' | 'lookup'>('book');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errs, setErrs] = useState<Partial<Record<keyof FormState, string>>>({});
  const [departments, setDepartments] = useState<BookingDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctorDto[]>([]);
  const [slots, setSlots] = useState<BookingSlotResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingTimeSlot | null>(null);
  const [result, setResult] = useState<BookingResultDto | null>(null);
  // lookup
  const [lookupCode, setLookupCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResults, setLookupResults] = useState<BookingStatusDto[]>([]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrs((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => {
    getBookingDepartments().then(setDepartments).catch(() => tw('Không tải được danh sách khoa'));
  }, []);

  const onDepartmentChange = async (departmentId: string) => {
    setForm((f) => ({ ...f, departmentId, doctorId: '' }));
    setDoctors([]); setSlots(null); setSelectedSlot(null);
    if (!departmentId) return;
    try { setDoctors(await getBookingDoctors(departmentId)); } catch { /* BS là tùy chọn */ }
  };

  const loadSlots = async () => {
    if (!form.appointmentDate) { tw('Chọn ngày khám trước'); return; }
    setLoading(true);
    try {
      setSlots(await getAvailableSlots(form.appointmentDate, form.departmentId || undefined, form.doctorId || undefined));
    } catch { tw('Không thể tải khung giờ'); } finally { setLoading(false); }
  };

  const validateStep0 = () => {
    const e: typeof errs = {};
    if (!form.departmentId) e.departmentId = 'Chọn khoa khám';
    if (!form.appointmentDate) e.appointmentDate = 'Chọn ngày khám';
    setErrs(e);
    if (Object.keys(e).length) return false;
    if (!selectedSlot) { tw('Vui lòng chọn khung giờ'); return false; }
    return true;
  };

  const validateStep1 = () => {
    const e: typeof errs = {};
    if (!form.patientName.trim()) e.patientName = 'Nhập họ tên';
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Nhập số điện thoại';
    else if (!/^0\d{9,10}$/.test(form.phoneNumber.trim())) e.phoneNumber = 'SĐT không hợp lệ (10-11 số, bắt đầu bằng 0)';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleBook = async () => {
    if (!validateStep1() || !selectedSlot) return;
    setLoading(true);
    try {
      const r = await bookAppointment({
        patientName: form.patientName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        identityNumber: form.identityNumber || undefined,
        address: form.address || undefined,
        appointmentDate: form.appointmentDate,
        appointmentTime: selectedSlot.startTime,
        departmentId: form.departmentId,
        doctorId: form.doctorId || undefined,
        appointmentType: form.appointmentType,
        reason: form.reason || undefined,
      });
      if (r.success) { setResult(r); setStep(3); tk('Đặt lịch thành công!'); }
      else tw(r.message || 'Không thể đặt lịch');
    } catch { tw('Không thể đặt lịch — thử lại sau'); } finally { setLoading(false); }
  };

  const handleLookup = async () => {
    if (!lookupCode && !lookupPhone) { tw('Nhập mã hẹn hoặc số điện thoại'); return; }
    setLoading(true);
    try {
      const rs = await lookupAppointment(lookupCode || undefined, lookupPhone || undefined);
      setLookupResults(rs);
      if (rs.length === 0) ti('Không tìm thấy lịch hẹn');
    } catch { tw('Lỗi tra cứu'); } finally { setLoading(false); }
  };

  const handleCancel = async (code: string) => {
    if (!lookupPhone) { tw('Cần nhập SĐT để xác thực hủy'); return; }
    try {
      await cancelBooking(code, lookupPhone, 'Bệnh nhân tự hủy');
      tk('Đã hủy lịch hẹn');
      void handleLookup();
    } catch { tw('Không thể hủy (SĐT không khớp hoặc lịch đã hoàn thành)'); }
  };

  const resetBooking = () => {
    setForm(EMPTY_FORM); setSlots(null); setSelectedSlot(null); setResult(null); setStep(0); setErrs({});
  };

  const deptName = useMemo(() => departments.find((d) => d.id === form.departmentId)?.name, [departments, form.departmentId]);
  const doctorName = useMemo(() => doctors.find((d) => d.id === form.doctorId)?.fullName, [doctors, form.doctorId]);

  const renderSlots = (list: BookingTimeSlot[], label: string) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--t-1)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {list.map((slot) => {
          const on = selectedSlot?.startTime === slot.startTime;
          return (
            <button
              key={slot.displayTime}
              type="button"
              disabled={!slot.isAvailable}
              onClick={() => setSelectedSlot(slot)}
              style={{
                minWidth: 108, padding: '6px 10px', cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                background: on ? 'var(--a-cy)' : 'var(--d-2)',
                color: on ? '#fff' : slot.isAvailable ? 'var(--t-0)' : 'var(--t-3)',
                border: `1px solid ${on ? 'var(--a-cy)' : 'var(--line)'}`, borderRadius: 'var(--r-2)',
                font: 'inherit', fontSize: 12, textAlign: 'center',
              }}
            >
              <div>{slot.displayTime}</div>
              <div style={{ fontSize: 10.5, opacity: 0.75 }}>{slot.currentBookings}/{slot.maxBookings}</div>
            </button>
          );
        })}
        {list.length === 0 && <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Không có khung giờ</span>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--d-0, var(--d-1))' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 14px' }}>
        {/* ------- header thương hiệu ------- */}
        <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid var(--a-cy)' }}>
          <div style={{ color: 'var(--a-cy)', marginBottom: 6 }}><Ico name="stethoscope" size={40} /></div>
          <h1 style={{ margin: '0 0 2px', fontSize: 22, color: 'var(--t-0)' }}>Đặt Lịch Khám Trực Tuyến</h1>
          <div style={{ color: 'var(--a-cy)', fontWeight: 600 }}>{HOSPITAL_NAME}</div>
          <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>{HOSPITAL_ADDRESS} | ĐT: {HOSPITAL_PHONE}</div>
        </div>

        {/* ------- toggle đặt / tra cứu ------- */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          <Btn variant={mode === 'book' ? 'primary' : 'default'} icon="calendar" onClick={() => { setMode('book'); }}>Đặt lịch mới</Btn>
          <Btn variant={mode === 'lookup' ? 'primary' : 'default'} icon="search" onClick={() => setMode('lookup')}>Tra cứu lịch hẹn</Btn>
        </div>

        {/* ================= TRA CỨU ================= */}
        {mode === 'lookup' && (
          <div className="panel">
            <div className="panel-h"><span className="title">Tra cứu <b>lịch hẹn</b></span></div>
            <div className="panel-body pad">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: '1 1 200px' }}>
                  <Inp placeholder="Mã hẹn — VD: DK202602281234" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <Inp placeholder="Số điện thoại" value={lookupPhone} onChange={(e) => setLookupPhone(e.target.value)} />
                </div>
                <Btn variant="primary" icon="search" loading={loading} onClick={() => void handleLookup()}>Tra cứu</Btn>
              </div>

              {lookupResults.map((apt) => (
                <div key={apt.appointmentCode} className="panel" style={{ marginBottom: 8 }}>
                  <div className="panel-body pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: '1 1 160px' }}>
                      <div className="mono" style={{ fontWeight: 700, color: 'var(--t-0)' }}>{apt.appointmentCode}</div>
                      <div style={{ color: 'var(--t-1)' }}>{apt.patientName}</div>
                    </div>
                    <div style={{ flex: '1 1 140px', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
                      <div>{dayjs(apt.appointmentDate).format('DD/MM/YYYY')}{apt.appointmentTime ? ` · ${apt.appointmentTime}` : ''}</div>
                      <div style={{ color: 'var(--t-2)' }}>
                        {[apt.departmentName, apt.doctorName].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusBadge tone={statusTone(apt.status)} dot>{apt.statusName}</StatusBadge>
                      {apt.status < 2 && (
                        <Btn
                          variant="crit" size="sm"
                          onClick={() => cf(
                            `Hủy lịch hẹn ${apt.appointmentCode} của ${apt.patientName}? Thao tác không thể hoàn tác.`,
                            () => void handleCancel(apt.appointmentCode),
                            { tone: 'crit', confirm: 'Hủy lịch' },
                          )}
                        >Hủy</Btn>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {lookupResults.length === 0 && !loading && (
                <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Nhập mã hẹn hoặc số điện thoại để tra cứu</div>
              )}
            </div>
          </div>
        )}

        {/* ================= ĐẶT LỊCH ================= */}
        {mode === 'book' && (
          <>
            {/* stepper */}
            <div className="ab-step">
              {STEPS.map((s, i) => (
                <div key={s} className={`ab-step-it ${step === i ? 'on' : ''} ${step > i ? 'done' : ''}`}>
                  <span className="num">{step > i ? '✓' : i + 1}</span> {s}
                </div>
              ))}
            </div>

            {loading && <LoadingState />}

            {/* ---- B1: khoa / BS / ngày / slot ---- */}
            {!loading && step === 0 && (
              <div className="panel">
                <div className="panel-body pad">
                  <div className="rec-grid-2">
                    <Field label="Khoa khám" required error={errs.departmentId}>
                      <AbSelect
                        value={form.departmentId}
                        onChange={(v) => void onDepartmentChange(v)}
                        options={departments.map((d) => ({ v: d.id, l: `${d.name} (${d.availableDoctors} BS)` }))}
                        fieldNames={{ value: 'v', label: 'l' }}
                        placeholder="— Chọn khoa khám bệnh —"
                        style={{ width: '100%' }}
                      />
                    </Field>
                    <Field label="Bác sĩ (tùy chọn)">
                      <AbSelect
                        value={form.doctorId}
                        onChange={(v) => { set('doctorId', v); setSlots(null); setSelectedSlot(null); }}
                        options={doctors.map((d) => ({ v: d.id, l: `${d.title ? d.title + ' ' : ''}${d.fullName}${d.specialty ? ' — ' + d.specialty : ''}` }))}
                        fieldNames={{ value: 'v', label: 'l' }}
                        placeholder="— Chọn bác sĩ —"
                        style={{ width: '100%' }}
                      />
                    </Field>
                    <Field label="Ngày khám" required error={errs.appointmentDate}>
                      <input
                        type="date"
                        className="ab-date"
                        style={{ width: '100%' }}
                        min={dayjs().format('YYYY-MM-DD')}
                        value={form.appointmentDate}
                        onChange={(e) => { set('appointmentDate', e.target.value); setSlots(null); setSelectedSlot(null); }}
                      />
                    </Field>
                    <Field label="Loại khám">
                      <AbSelect
                        value={String(form.appointmentType)}
                        onChange={(v) => set('appointmentType', Number(v))}
                        options={[{ v: '1', l: 'Tái khám' }, { v: '2', l: 'Khám mới' }, { v: '3', l: 'Khám sức khỏe' }]}
                        fieldNames={{ value: 'v', label: 'l' }}
                        style={{ width: '100%' }}
                      />
                    </Field>
                  </div>

                  <div style={{ margin: '14px 0' }}>
                    <Btn icon="clock" onClick={() => void loadSlots()}>Xem khung giờ trống</Btn>
                  </div>

                  {slots && (
                    <div>
                      <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)', margin: '10px 0' }}>
                        Khung giờ ngày {dayjs(slots.date).format('DD/MM/YYYY')} — Còn trống: <b style={{ color: 'var(--t-0)' }}>{slots.totalAvailable}</b>
                      </div>
                      {renderSlots(slots.morningSlots, 'Buổi sáng (7:30 - 11:30)')}
                      {renderSlots(slots.afternoonSlots, 'Buổi chiều (13:30 - 16:30)')}
                    </div>
                  )}

                  <div style={{ textAlign: 'right', marginTop: 14 }}>
                    <Btn variant="primary" iconRight="arrow-right" onClick={() => { if (validateStep0()) setStep(1); }}>Tiếp theo</Btn>
                  </div>
                </div>
              </div>
            )}

            {/* ---- B2: thông tin BN ---- */}
            {!loading && step === 1 && (
              <div className="panel">
                <div className="panel-body pad">
                  <div className="rec-grid-2">
                    <Field label="Họ và tên" required error={errs.patientName}>
                      <Inp placeholder="Nguyễn Văn A" value={form.patientName} onChange={(e) => set('patientName', e.target.value)} />
                    </Field>
                    <Field label="Số điện thoại" required error={errs.phoneNumber}>
                      <Inp placeholder="0901234567" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} />
                    </Field>
                    <Field label="Email">
                      <Inp placeholder="email@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                    </Field>
                    <Field label="Ngày sinh">
                      <input type="date" className="ab-date" style={{ width: '100%' }} max={dayjs().format('YYYY-MM-DD')}
                        value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                    </Field>
                    <Field label="Giới tính">
                      <AbSelect
                        value={form.gender == null ? '' : String(form.gender)}
                        onChange={(v) => set('gender', v === '' ? undefined : Number(v))}
                        options={[{ v: '1', l: 'Nam' }, { v: '0', l: 'Nữ' }]}
                        fieldNames={{ value: 'v', label: 'l' }}
                        placeholder="— Chọn —"
                        style={{ width: '100%' }}
                      />
                    </Field>
                    <Field label="Số CCCD">
                      <Inp placeholder="001234567890" maxLength={12} value={form.identityNumber} onChange={(e) => set('identityNumber', e.target.value)} />
                    </Field>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Field label="Địa chỉ">
                      <Inp placeholder="Số nhà, đường, phường, quận, TP" value={form.address} onChange={(e) => set('address', e.target.value)} />
                    </Field>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Field label="Lý do khám">
                      <textarea
                        rows={2}
                        placeholder="Mô tả triệu chứng hoặc lý do khám"
                        value={form.reason}
                        onChange={(e) => set('reason', e.target.value)}
                        style={{
                          width: '100%', padding: '6px 10px', background: 'var(--d-2)',
                          border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
                          font: 'inherit', fontSize: 12, color: 'var(--t-0)', resize: 'vertical',
                        }}
                      />
                    </Field>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                    <Btn onClick={() => setStep(0)}>Quay lại</Btn>
                    <Btn variant="primary" iconRight="arrow-right" onClick={() => { if (validateStep1()) setStep(2); }}>Tiếp theo</Btn>
                  </div>
                </div>
              </div>
            )}

            {/* ---- B3: xác nhận ---- */}
            {!loading && step === 2 && (
              <div className="panel">
                <div className="panel-h"><span className="title">Xác nhận <b>thông tin</b></span></div>
                <div className="panel-body pad">
                  <div className="rec-grid-2">
                    <div className="rec-section">
                      <div className="rec-kv"><span>Họ tên</span><b>{form.patientName}</b></div>
                      <div className="rec-kv"><span>SĐT</span><b className="mono">{form.phoneNumber}</b></div>
                      {form.email && <div className="rec-kv"><span>Email</span><b>{form.email}</b></div>}
                    </div>
                    <div className="rec-section">
                      <div className="rec-kv"><span>Ngày khám</span><b>{form.appointmentDate ? dayjs(form.appointmentDate).format('DD/MM/YYYY') : ''}</b></div>
                      <div className="rec-kv"><span>Giờ khám</span><b>{selectedSlot?.displayTime}</b></div>
                      <div className="rec-kv"><span>Khoa</span><b>{deptName}</b></div>
                      {doctorName && <div className="rec-kv"><span>Bác sĩ</span><b>{doctorName}</b></div>}
                    </div>
                  </div>
                  {form.reason && <div style={{ marginTop: 10, fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}><b>Lý do:</b> {form.reason}</div>}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                    <Btn onClick={() => setStep(1)}>Quay lại</Btn>
                    <Btn variant="ok" icon="check" loading={loading} onClick={() => void handleBook()}>Xác nhận đặt lịch</Btn>
                  </div>
                </div>
              </div>
            )}

            {/* ---- B4: kết quả ---- */}
            {step === 3 && result && (
              <div className="panel">
                <div className="panel-body pad" style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--s-ok, #16a34a)', margin: '8px 0' }}><Ico name="check" size={42} /></div>
                  <h2 style={{ margin: '0 0 4px', color: 'var(--t-0)' }}>Đặt lịch thành công!</h2>
                  <div style={{ color: 'var(--t-2)', marginBottom: 14 }}>Mã hẹn: <b className="mono" style={{ color: 'var(--a-cy)' }}>{result.appointmentCode}</b></div>

                  <div className="rec-section" style={{ maxWidth: 380, margin: '0 auto', textAlign: 'left' }}>
                    <div className="rec-kv"><span>Mã hẹn</span><b className="mono">{result.appointmentCode}</b></div>
                    <div className="rec-kv"><span>Ngày</span><b>{dayjs(result.appointmentDate).format('DD/MM/YYYY')}</b></div>
                    {result.appointmentTime && <div className="rec-kv"><span>Giờ</span><b>{result.appointmentTime}</b></div>}
                    {result.departmentName && <div className="rec-kv"><span>Khoa</span><b>{result.departmentName}</b></div>}
                    {result.doctorName && <div className="rec-kv"><span>BS</span><b>{result.doctorName}</b></div>}
                    {result.roomName && <div className="rec-kv"><span>Phòng</span><b>{result.roomName}</b></div>}
                  </div>

                  <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)', margin: '12px auto', maxWidth: 420 }}>
                    Vui lòng lưu mã hẹn và đến viện trước giờ hẹn 15 phút.<br />
                    Mang theo CCCD/CMND và thẻ BHYT (nếu có). Liên hệ {HOSPITAL_PHONE} nếu cần hỗ trợ.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <Btn variant="primary" onClick={resetBooking}>Đặt lịch khác</Btn>
                    <Btn onClick={() => { setMode('lookup'); setLookupCode(result.appointmentCode); }}>Tra cứu</Btn>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
