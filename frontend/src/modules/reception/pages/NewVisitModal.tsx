import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, Radio, InputNumber } from 'antd';
import * as receptionApi from '../api/reception';
import type { RoomOverviewDto } from '../api/reception';
import { registerMultipleRooms } from '../../opd/api/multiSpecialtyExam';
import { ModalShell } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { BookingPickerModal } from './BookingPickerModal';
import { validateCccd } from '../types/cccd';
const VISIT_TYPES: { v: string; l: string; ic: string; fee: number; serviceType: number; bhyt?: boolean; emergency?: boolean }[] = [
  { v: 'kham-thuong', l: 'Khám thường',     ic: 'stethoscope', fee: 38000,  serviceType: 3 },
  { v: 'kham-bhyt',   l: 'Khám BHYT',        ic: 'shield',      fee: 0,      serviceType: 3, bhyt: true },
  { v: 'kham-vip',    l: 'Khám dịch vụ',     ic: 'heart',       fee: 250000, serviceType: 2 },
  { v: 'kham-yc',     l: 'Khám theo yêu cầu', ic: 'user',       fee: 350000, serviceType: 2 },
  { v: 'tai-kham',    l: 'Tái khám',         ic: 'refresh',     fee: 25000,  serviceType: 3 },
  { v: 'cap-cuu',     l: 'Cấp cứu',          ic: 'alert',       fee: 0,      serviceType: 3, emergency: true },
  { v: 'tu-van',      l: 'Tư vấn',           ic: 'info',        fee: 80000,  serviceType: 2 },
  { v: 'tiem-chung',  l: 'Tiêm chủng',       ic: 'plus',        fee: 50000,  serviceType: 3 },
];

const Lbl: React.FC<{ label?: string; required?: boolean; error?: string; full?: boolean; children: React.ReactNode }> = ({ label, required, error, full, children }) => (
  // data-fld-err: mốc để auto-scroll tới field lỗi đầu tiên khi validation fail
  <div style={{ gridColumn: full ? '1 / -1' : undefined }} {...(error ? { 'data-fld-err': '' } : {})}>
    {label && (
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>
        {label}{required && <span style={{ color: 'var(--s-crit)' }}> *</span>}
      </div>
    )}
    {children}
    {error && <div style={{ fontSize: 10.5, color: 'var(--s-crit)', marginTop: 'var(--space-3)' }}>{error}</div>}
  </div>
);

// Nhãn hiển thị của field — dùng cho message.error tổng khi validation fail (không để nút im lặng)
const FIELD_LABELS: Record<string, string> = {
  patientName: 'Họ và tên', phone: 'Số điện thoại', age: 'Tuổi', cccd: 'CCCD/CMND',
  bhytNo: 'Số thẻ BHYT', dept: 'Khoa / phòng khám', reason: 'Lý do khám',
};

const fmtVNDw = (n: number) => (n ? n.toLocaleString('vi-VN') + ' ₫' : 'Miễn phí');

interface WizardData {
  patientName: string;
  phone: string;
  cccd: string;
  age: number | null;
  gender: 'M' | 'F';
  address: string;
  visitType: string;
  bhytNo: string;
  dept: string;          // roomId (phòng chính)
  extraRooms: string[];  // roomId[] — phòng khám thêm đồng thời (chỉ thu phí/dịch vụ, KHÔNG áp dụng BHYT)
  priority: 'crit' | 'high' | 'norm';
  reason: string;
}

// Trích lỗi thật từ axios error (string / {message} / ProblemDetails {title,errors} / {error})
// để hiện cho user thay vì thông báo chung chung "thất bại".
function extractApiError(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: unknown; status?: number }; message?: string };
  const d = ax?.response?.data;
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (d && typeof d === 'object') {
    const o = d as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (o.errors && typeof o.errors === 'object') {
      const msgs = Object.values(o.errors as Record<string, unknown>)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      if (msgs.length) return `${typeof o.title === 'string' ? o.title + ': ' : ''}${msgs.join('; ')}`;
    }
    if (typeof o.title === 'string' && o.title.trim()) return o.title.trim();
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
  }
  const status = ax?.response?.status;
  if (status) return `${fallback} (HTTP ${status})`;
  return ax?.message || fallback;
}

export const NewVisitModal: React.FC<{
  open: boolean;
  onClose: () => void;
  rooms: RoomOverviewDto[];
  onDone: () => void;
}> = ({ open, onClose, rooms, onDone }) => {
  const { message } = AntdApp.useApp();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [bhytChecked, setBhytChecked] = useState(false);
  const [bhytValid, setBhytValid] = useState(false);
  const [bhytInfo, setBhytInfo] = useState<{ exp?: string; rate?: number; mock?: boolean } | null>(null);
  // Lý do thẻ không hợp lệ do backend trả về (sai định dạng, hết hạn, bị khóa…)
  const [bhytErr, setBhytErr] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [data, setData] = useState<WizardData>({
    patientName: '', phone: '', cccd: '', age: null, gender: 'M', address: '',
    visitType: 'kham-bhyt', bhytNo: '', dept: '', extraRooms: [], priority: 'norm', reason: '',
  });
  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) => setData((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    if (open) {
      setStep(1); setErrs({}); setBhytChecked(false); setBhytValid(false); setBhytInfo(null); setBhytErr(null);
      setData({ patientName: '', phone: '', cccd: '', age: null, gender: 'M', address: '', visitType: 'kham-bhyt', bhytNo: '', dept: '', extraRooms: [], priority: 'norm', reason: '' });
    }
  }, [open]);

  const visitType = VISIT_TYPES.find((t) => t.v === data.visitType);

  const validate1 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!data.patientName.trim()) e.patientName = 'Bắt buộc';
    if (!data.phone || !/^0\d{9,10}$/.test(data.phone)) e.phone = 'SĐT 10 số';
    if (!data.age || data.age < 0 || data.age > 130) e.age = 'Tuổi không hợp lệ';
    // CCCD: bắt buộc 12 số (hành vi v2 trước port — v1 optional). Mã tỉnh KHÔNG chặn:
    // 3 số đầu có thể là mã QUỐC GIA (công dân sinh/ĐKKS ở nước ngoài, NĐ 137/2015 +
    // TT 07/2016/TT-BCA) — validateCccd chỉ dùng làm gợi ý/cảnh báo mềm dưới ô nhập.
    if (!data.cccd || !/^\d{12}$/.test(data.cccd.replace(/\s/g, ''))) {
      e.cccd = 'CCCD 12 số';
    }
    setErrs(e); return e;
  };
  const validate2 = (): Record<string, string> => {
    const e: Record<string, string> = (visitType?.bhyt && !bhytValid) ? { bhytNo: 'Cần xác thực BHYT hợp lệ' } : {};
    setErrs(e); return e;
  };
  const validate3 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!data.dept) e.dept = 'Chọn khoa / phòng';
    if (!data.reason.trim()) e.reason = 'Nhập lý do khám';
    setErrs(e); return e;
  };

  /** Validation fail → KHÔNG im lặng: toast tổng + (field đã tô đỏ qua Lbl) + cuộn tới lỗi đầu tiên. */
  const reportErrors = (e: Record<string, string>) => {
    const labels = Object.keys(e).map((k) => FIELD_LABELS[k] || k);
    message.error(`Vui lòng kiểm tra: ${labels.join(', ')}`);
    requestAnimationFrame(() => {
      document.querySelector('[data-fld-err]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const verifyBhyt = async () => {
    if (!data.bhytNo.trim()) { message.warning('Nhập số thẻ BHYT'); return; }
    try {
      const res = await receptionApi.verifyInsurance({ insuranceNumber: data.bhytNo.trim(), patientName: data.patientName || undefined });
      const r = res.data;
      const ok = r.isValid && !r.isExpired && !r.isBlacklisted;
      const mock = r.isMockData ?? r.dataSource === 'MOCK';
      setBhytChecked(true); setBhytValid(ok);
      setBhytInfo(ok ? { exp: r.endDate, rate: r.paymentRate, mock } : null);
      setBhytErr(ok ? null : (r.errorMessage || null));
      if (!ok) message.error(r.errorMessage || 'Thẻ BHYT không hợp lệ');
      // Mock = chưa kết nối cổng BHXH: báo cảnh báo chứ KHÔNG báo "hợp lệ", tránh nhân viên
      // tiếp đón hiểu nhầm là đã đối chiếu quyền lợi thật.
      else if (mock) message.warning('Chưa kết nối cổng BHXH — thông tin thẻ chỉ là mô phỏng');
      else message.success('Thẻ BHYT hợp lệ · còn hạn');
    } catch {
      setBhytChecked(true); setBhytValid(false); setBhytErr(null);
      message.error('Tra cứu BHYT thất bại');
    }
  };

  const next = () => {
    const e = step === 1 ? validate1() : step === 2 ? validate2() : step === 3 ? validate3() : {};
    if (Object.keys(e).length > 0) { reportErrors(e); return; }
    setStep((s) => Math.min(4, s + 1));
  };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    if (!data.dept) { message.warning('Chọn khoa / phòng'); return; }
    setSubmitting(true);
    try {
      const yearOfBirth = data.age ? new Date().getFullYear() - data.age : undefined;
      const isPriority = data.priority !== 'norm';
      if (visitType?.bhyt && data.bhytNo.trim()) {
        await receptionApi.registerInsurancePatient({
          insuranceNumber: data.bhytNo.trim(), roomId: data.dept,
          identityNumber: data.cccd.trim() || undefined, isPriority,
          // BN mới đăng ký BHYT lần đầu — backend tạo BN nếu chưa có trong hệ thống
          newPatient: {
            fullName: data.patientName.trim(),
            gender: data.gender === 'F' ? 2 : 1,
            yearOfBirth,
            phoneNumber: data.phone.trim() || undefined,
            address: data.address.trim() || undefined,
            identityNumber: data.cccd.trim() || undefined,
          },
        });
      } else {
        const feeResp = await receptionApi.registerFeePatient({
          newPatient: {
            fullName: data.patientName.trim(),
            gender: data.gender === 'F' ? 2 : 1,
            yearOfBirth,
            phoneNumber: data.phone.trim() || undefined,
            address: data.address.trim() || undefined,
            identityNumber: data.cccd.trim() || undefined,
          },
          serviceType: visitType?.serviceType ?? 3,
          roomId: data.dept, isPriority,
        });
        // Đa chuyên khoa: đăng ký BN vào các phòng khám thêm (chỉ thu phí/dịch vụ).
        const createdPatientId = feeResp.data?.patientId;
        if (data.extraRooms.length > 0 && createdPatientId) {
          await registerMultipleRooms({
            patientId: createdPatientId,
            patientType: visitType?.serviceType ?? 3,
            roomIds: data.extraRooms,
            chiefComplaint: data.reason.trim() || undefined,
          });
        }
      }
      const extraMsg = (!visitType?.bhyt && data.extraRooms.length > 0) ? ` · +${data.extraRooms.length} phòng thêm` : '';
      message.success(`Đã đăng ký · ${data.patientName.trim()}${extraMsg}`);
      onDone();
    } catch (err) {
      message.error(extractApiError(err, 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.'));
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = ['Bệnh nhân', 'BHYT & hình thức', 'Khoa & lý do', 'Xác nhận'];
  const selRoom = rooms.find((r) => r.roomId === data.dept);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Đăng ký tiếp đón mới"
      sub={`Bước ${step}/4`}
      footer={
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Hủy</button>
          <span style={{ flex: 1 }} />
          {step > 1 && <button type="button" className="ab-btn" onClick={prev}>← Quay lại</button>}
          {step < 4
            ? <button type="button" className="ab-btn primary" onClick={next}>Tiếp tục →</button>
            : <button type="button" className="ab-btn primary" disabled={submitting} onClick={submit}>
                <TermIcon name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Đăng ký'}
              </button>}
        </>
      }
    >
      <div>
        {/* Stepper */}
        <div className="ab-step">
          {STEPS.map((lbl, i) => (
            <div key={i} className={`ab-step-it ${step === i + 1 ? 'on' : ''} ${step > i + 1 ? 'done' : ''}`}>
              <span className="num">{step > i + 1 ? '✓' : i + 1}</span>
              <span>{lbl}</span>
            </div>
          ))}
        </div>

        {/* Step 1 — Bệnh nhân */}
        {step === 1 && (
          <div>
            <div style={{ padding: '12px 14px', background: 'var(--s-info-soft)', border: '1px solid #bfdbfe', borderRadius: 'var(--r-3)', marginBottom: 'var(--space-14)', display: 'flex', alignItems: 'center', gap: 'var(--space-10)', fontSize: 'var(--fs-sm)' }}>
              <TermIcon name="search" size={14} />
              <span style={{ flex: 1 }}>Tìm BN cũ bằng SĐT để tự động điền · hoặc nhập mới bên dưới</span>
              <button type="button" className="ab-btn ghost sm" onClick={() => setPickerOpen(true)}>
                <TermIcon name="calendar" size={11} /> Từ lịch đặt khám
              </button>
            </div>
            <div className="rec-grid-2">
              <Lbl label="Họ và tên" required error={errs.patientName}>
                <Input value={data.patientName} onChange={(e) => set('patientName', e.target.value)} placeholder="Nguyễn Văn A" />
              </Lbl>
              <Lbl label="Số điện thoại" required error={errs.phone}>
                <Input value={data.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0912 345 678" />
              </Lbl>
            </div>
            <div className="rec-grid-3" style={{ marginTop: 'var(--space-10)' }}>
              <Lbl label="Tuổi" required error={errs.age}>
                <InputNumber value={data.age} onChange={(v) => set('age', v)} min={0} max={130} style={{ width: '100%' }} />
              </Lbl>
              <Lbl label="Giới tính">
                <Radio.Group value={data.gender} onChange={(e) => set('gender', e.target.value)} optionType="button" options={[{ value: 'M', label: 'Nam' }, { value: 'F', label: 'Nữ' }]} />
              </Lbl>
              <Lbl label="CCCD/CMND" required error={errs.cccd}>
                <Input value={data.cccd} onChange={(e) => set('cccd', e.target.value)} placeholder="012345678901" maxLength={12} />
                {(() => {
                  // Gợi ý nơi cấp theo mã tỉnh (3 số đầu) — port v1 help "Nơi cấp: <tỉnh>".
                  // Mã lạ → cảnh báo MỀM (không chặn lưu: có thể là mã quốc gia ĐKKS nước ngoài).
                  if (!data.cccd || data.cccd.replace(/\s/g, '').length !== 12) return null;
                  const r = validateCccd(data.cccd);
                  if (r.valid && r.province) {
                    return <div style={{ fontSize: 10.5, color: 'var(--t-2)', marginTop: 'var(--space-3)' }}>Nơi cấp: {r.province}</div>;
                  }
                  return <div style={{ fontSize: 10.5, color: 'var(--s-warn)', marginTop: 'var(--space-3)' }}>Mã tỉnh không nhận diện được — kiểm tra lại số CCCD (vẫn lưu được nếu đúng)</div>;
                })()}
              </Lbl>
            </div>
            <div style={{ marginTop: 'var(--space-10)' }}>
              <Lbl label="Địa chỉ thường trú">
                <Input value={data.address} onChange={(e) => set('address', e.target.value)} placeholder="P. Lê Hồng Phong, TP. Hưng Yên" />
              </Lbl>
            </div>
          </div>
        )}

        {/* Step 2 — BHYT & hình thức */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 'var(--space-8)' }}>HÌNH THỨC KHÁM</div>
            <div className="rec-vtype">
              {VISIT_TYPES.map((t) => (
                <label key={t.v} className={data.visitType === t.v ? 'on' : ''}>
                  <input type="radio" name="vt" checked={data.visitType === t.v} onChange={() => set('visitType', t.v)} />
                  <TermIcon name={t.ic} size={14} className="ico" />
                  <span>{t.l}</span>
                </label>
              ))}
            </div>
            {visitType?.bhyt ? (
              <div style={{ marginTop: 'var(--space-18)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 'var(--space-8)' }}>THẺ BHYT</div>
                <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <Lbl label="Số thẻ BHYT" required error={errs.bhytNo}>
                      <Input value={data.bhytNo} onChange={(e) => { set('bhytNo', e.target.value); setBhytChecked(false); setBhytValid(false); setBhytErr(null); }} placeholder="HC4010112345678 (15 ký tự)" />
                    </Lbl>
                  </div>
                  <button type="button" className="ab-btn primary" onClick={verifyBhyt}>
                    <TermIcon name="shield" size={12} /> Xác thực
                  </button>
                </div>
                {bhytChecked && bhytValid && (
                  <>
                    <div className="rec-bhyt-card" style={{ marginTop: 'var(--space-10)' }}>
                      <div className="rec-bhyt-icon"><TermIcon name="check" size={18} /></div>
                      <div>
                        <div className="rec-bhyt-num">{data.bhytNo}</div>
                        <div className="rec-bhyt-meta">
                          {bhytInfo?.exp && <span>Hạn: <b>{dayjs(bhytInfo.exp).format('DD/MM/YYYY')}</b></span>}
                          <span>Mức hưởng: <b>{bhytInfo?.rate || 80}%</b></span>
                        </div>
                      </div>
                      <span className={bhytInfo?.mock ? 'chip warn' : 'chip ok'}>{bhytInfo?.mock ? 'Mô phỏng' : 'Hợp lệ'}</span>
                    </div>
                    {/* Chưa cấu hình tài khoản cổng giám định BHYT → số liệu trên là giả định.
                        Phải nói rõ, nếu không tiếp đón sẽ tính sai quyền lợi cho bệnh nhân. */}
                    {bhytInfo?.mock && (
                      <div style={{ marginTop: 'var(--space-8)', padding: '8px 12px', display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-start', background: 'var(--d-1)', border: '1px solid var(--s-warn)', borderRadius: 'var(--r-3)', fontSize: 'var(--fs-xs)', color: 'var(--s-warn)' }}>
                        <TermIcon name="alert" size={12} />
                        <span>Chưa kết nối cổng BHXH — hạn thẻ và mức hưởng ở trên là dữ liệu mô phỏng, <b>chưa đối chiếu</b> với cơ quan BHXH.</span>
                      </div>
                    )}
                  </>
                )}
                {bhytChecked && !bhytValid && (
                  <div className="rec-bhyt-card invalid" style={{ marginTop: 'var(--space-10)' }}>
                    <div className="rec-bhyt-icon"><TermIcon name="x" size={18} /></div>
                    <div>
                      <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--s-crit)' }}>{bhytErr || 'Thẻ không hợp lệ hoặc đã hết hạn'}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>Đổi sang hình thức khám khác hoặc kiểm tra lại số thẻ</div>
                    </div>
                    <span className="chip crit">Lỗi</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 'var(--space-18)', padding: '12px 14px', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>Phí {visitType?.l.toLowerCase()}</span>
                <b style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-lg)', color: 'var(--a-cy)' }}>{fmtVNDw(visitType?.fee || 0)}</b>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Khoa & lý do */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 'var(--space-8)' }}>CHỌN KHOA · PHÒNG KHÁM</div>
            <div className="rec-deptgrid">
              {rooms.map((r) => (
                <label key={r.roomId} className={data.dept === r.roomId ? 'on' : ''}>
                  <input type="radio" name="dept" checked={data.dept === r.roomId} onChange={() => setData((d) => ({ ...d, dept: r.roomId, extraRooms: d.extraRooms.filter((x) => x !== r.roomId) }))} />
                  <div className="di"><TermIcon name="stethoscope" size={14} /></div>
                  <div>
                    <b>{r.departmentName || r.roomName}</b>
                    <i>{r.roomName} · chờ {r.waitingCount ?? 0}</i>
                  </div>
                  <span className="chip info">{r.waitingCount ?? 0}</span>
                </label>
              ))}
              {rooms.length === 0 && <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Không có phòng khám khả dụng</div>}
            </div>
            {errs.dept && <div data-fld-err="" style={{ color: 'var(--s-crit)', fontSize: 'var(--fs-xs)', marginTop: 'var(--space-6)' }}>{errs.dept}</div>}

            {/* Phòng khám thêm — đa chuyên khoa (chỉ thu phí/dịch vụ, KHÔNG áp dụng BHYT) */}
            {!visitType?.bhyt && (
              <div style={{ marginTop: 'var(--space-16)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 'var(--space-8)' }}>
                  PHÒNG KHÁM THÊM <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(đồng thời · tùy chọn)</span>
                </div>
                <div className="rec-deptgrid">
                  {rooms.filter((r) => r.roomId !== data.dept).map((r) => {
                    const on = data.extraRooms.includes(r.roomId);
                    return (
                      <label key={r.roomId} className={on ? 'on' : ''}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setData((d) => ({
                            ...d,
                            extraRooms: on
                              ? d.extraRooms.filter((x) => x !== r.roomId)
                              : [...d.extraRooms, r.roomId],
                          }))}
                        />
                        <div className="di"><TermIcon name="plus" size={14} /></div>
                        <div>
                          <b>{r.departmentName || r.roomName}</b>
                          <i>{r.roomName} · chờ {r.waitingCount ?? 0}</i>
                        </div>
                        {on && <span className="chip ok">+</span>}
                      </label>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--t-2)', marginTop: 'var(--space-6)' }}>
                  BN được cấp số ở <b>tất cả</b> phòng đã chọn (khám đa chuyên khoa). Không áp dụng cho khám BHYT.
                </div>
              </div>
            )}

            <div style={{ marginTop: 'var(--space-14)' }}>
              <Lbl label="Lý do khám" required error={errs.reason}>
                <Input.TextArea rows={3} value={data.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Triệu chứng chính, thời gian khởi phát…" />
              </Lbl>
            </div>
            <div style={{ marginTop: 'var(--space-12)' }}>
              <Lbl label="Mức ưu tiên">
                <Radio.Group
                  value={data.priority}
                  onChange={(e) => set('priority', e.target.value)}
                  optionType="button"
                  options={[{ value: 'norm', label: 'Thường' }, { value: 'high', label: 'Ưu tiên' }, { value: 'crit', label: 'Cấp cứu' }]}
                />
              </Lbl>
            </div>
          </div>
        )}

        {/* Step 4 — Xác nhận */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 'var(--space-10)' }}>XÁC NHẬN ĐĂNG KÝ</div>
            <div style={{ background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 'var(--space-8)', fontSize: 12.5 }}>
                <span style={{ color: 'var(--t-2)' }}>Bệnh nhân</span><b>{data.patientName} · {data.gender === 'F' ? 'Nữ' : 'Nam'} · {data.age}t</b>
                <span style={{ color: 'var(--t-2)' }}>SĐT</span><span className="mono">{data.phone}</span>
                <span style={{ color: 'var(--t-2)' }}>CCCD</span><span className="mono">{data.cccd}</span>
                {data.address && <><span style={{ color: 'var(--t-2)' }}>Địa chỉ</span><span>{data.address}</span></>}
                <span style={{ color: 'var(--t-2)' }}>Hình thức</span><span>{visitType?.l}</span>
                {data.bhytNo && <><span style={{ color: 'var(--t-2)' }}>Thẻ BHYT</span><span className="mono">{data.bhytNo} {bhytValid && <span className="chip ok" style={{ marginLeft: 'var(--space-6)' }}>Hợp lệ</span>}</span></>}
                <span style={{ color: 'var(--t-2)' }}>Khoa khám</span><b>{selRoom?.departmentName} · <span className="mono">{selRoom?.roomName}</span></b>
                {!visitType?.bhyt && data.extraRooms.length > 0 && (
                  <>
                    <span style={{ color: 'var(--t-2)' }}>Phòng thêm</span>
                    <span>
                      {data.extraRooms.map((id) => rooms.find((r) => r.roomId === id)?.roomName || id).join(', ')}
                      <span className="chip info" style={{ marginLeft: 'var(--space-6)' }}>+{data.extraRooms.length} phòng</span>
                    </span>
                  </>
                )}
                <span style={{ color: 'var(--t-2)' }}>Lý do</span><span>{data.reason}</span>
                <span style={{ color: 'var(--t-2)' }}>Ưu tiên</span><span><span className={`chip ${data.priority === 'crit' ? 'crit' : data.priority === 'high' ? 'warn' : 'info'}`}>{data.priority === 'crit' ? 'Cấp cứu' : data.priority === 'high' ? 'Ưu tiên' : 'Thường'}</span></span>
                <span style={{ color: 'var(--t-2)' }}>Phí khám</span><b style={{ color: 'var(--a-cy)', fontFamily: 'var(--font-mono)' }}>{fmtVNDw(visitType?.bhyt && bhytValid ? 0 : (visitType?.fee || 0))}</b>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-12)', padding: '10px 12px', background: '#fefce8', border: '1px solid var(--s-warn-bd)', borderRadius: 'var(--r-2)', fontSize: 11.5, color: '#854d0e' }}>
              <TermIcon name="alert" size={12} /> Sau khi đăng ký, hệ thống cấp số thứ tự và in phiếu hẹn. BN xuất trình phiếu tại phòng khám.
            </div>
          </div>
        )}
      </div>

      {/* Picker: chọn BN đã đặt khám → check-in (quickRegisterByAppointment) */}
      <BookingPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onCheckedIn={() => { setPickerOpen(false); onDone(); }}
      />
    </ModalShell>
  );
};

/* ────────────────────────────────────────────────────────────
   Now-serving tab — grid of rooms with current ticket
   ──────────────────────────────────────────────────────────── */

