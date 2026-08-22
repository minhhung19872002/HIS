/**
 * VisitActionsModals — B1.7 actions wired to reception backend APIs.
 *
 * Four focused modal forms, each triggered from VisitDrawerBody:
 *   1. TempInsuranceModal   — createTemporaryInsurance
 *   2. DocumentHoldModal    — createDocumentHold + returnDocument + list held docs
 *   3. PhotoModal           — uploadPhoto + getPatientPhotos + deletePhoto
 *   4. ServiceOrderModal    — orderServicesAtReception (with searchServices from examination.ts)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App as AntdApp, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import * as receptionApi from '../api/reception';
import type { DocumentHoldDto, PatientPhotoDto, CostEstimationResultDto } from '../api/reception';
import { estimateCostDirect } from '../api/reception';
import { searchServices } from '../../opd/api/examination';
import type { ServiceDto } from '../../opd/api/examination';
import { ModalShell, cf } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';

// ─── 1. Thẻ BHYT tạm ─────────────────────────────────────────────────────────

export interface TempInsuranceModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill from the current visit row */
  defaultPatientName?: string;
  defaultDateOfBirth?: string;
  defaultGender?: number;
}

export const TempInsuranceModal: React.FC<TempInsuranceModalProps> = ({
  open, onClose, defaultPatientName, defaultDateOfBirth, defaultGender,
}) => {
  const { message } = AntdApp.useApp();
  const [busy, setBusy] = useState(false);

  // Form fields
  const [patientName, setPatientName] = useState('');
  const [dob, setDob] = useState<dayjs.Dayjs | null>(null);
  const [gender, setGender] = useState<number>(1);
  const [birthCertNo, setBirthCertNo] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianIdNo, setGuardianIdNo] = useState('');
  const [guardianInsuranceNo, setGuardianInsuranceNo] = useState('');
  const form = useModalForm({
    patientName: { required: true, message: 'Nhập họ tên bệnh nhân' },
    dob: {
      required: true,
      message: 'Nhập ngày sinh',
      validate: (v) => (v && !(v as dayjs.Dayjs).isValid() ? 'Nhập ngày sinh' : undefined),
    },
    guardianName: { required: true, message: 'Nhập họ tên người giám hộ' },
    guardianRelation: { required: true, message: 'Nhập quan hệ với người bệnh' },
  }, open);

  useEffect(() => {
    if (open) {
      setPatientName(defaultPatientName || '');
      setDob(defaultDateOfBirth ? dayjs(defaultDateOfBirth) : null);
      setGender(defaultGender ?? 1);
      setBirthCertNo('');
      setGuardianName('');
      setGuardianRelation('Cha/mẹ');
      setGuardianPhone('');
      setGuardianIdNo('');
      setGuardianInsuranceNo('');
    }
  }, [open, defaultPatientName, defaultDateOfBirth, defaultGender]);

  const submit = async () => {
    if (!form.validate({ patientName, dob, guardianName, guardianRelation })) return;

    setBusy(true);
    try {
      await receptionApi.createTemporaryInsurance({
        patientName: patientName.trim(),
        dateOfBirth: (dob as dayjs.Dayjs).format('YYYY-MM-DD'),
        gender,
        birthCertificateNumber: birthCertNo.trim() || undefined,
        guardian: {
          fullName: guardianName.trim(),
          relationship: guardianRelation.trim(),
          identityNumber: guardianIdNo.trim() || undefined,
          phoneNumber: guardianPhone.trim() || undefined,
          insuranceNumber: guardianInsuranceNo.trim() || undefined,
        },
      });
      message.success('Đã cấp thẻ BHYT tạm');
      onClose();
    } catch {
      message.error('Cấp thẻ BHYT tạm thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Cấp thẻ BHYT tạm"
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Hủy</button>
          <button type="button" className="ab-btn primary" disabled={busy} onClick={submit}>
            <TermIcon name="shield" size={12} /> {busy ? 'Đang cấp…' : 'Cấp thẻ'}
          </button>
        </>
      )}
    >
      <div style={{ padding: 0 }}>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--s-warn)', marginBottom: 'var(--space-12)', padding: '8px 10px', background: 'var(--d-1)', borderRadius: 5 }}>
          Dùng cho trẻ em chưa có thẻ BHYT — thẻ tạm được cấp dựa trên BHYT của người giám hộ.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-12)' }}>
          <Field label="Họ tên bệnh nhân" required error={form.errors.patientName}>
            <Input value={patientName} onChange={(e) => { setPatientName(e.target.value); form.clear('patientName'); }} placeholder="Tên trẻ em" />
          </Field>
          <Field label="Giới tính">
            <Select value={gender} onChange={setGender} style={{ width: '100%' }}
              options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Field label="Ngày sinh" required error={form.errors.dob}>
            <DatePicker
              value={dob} onChange={(v) => { setDob(v); form.clear('dob'); }} format="DD/MM/YYYY"
              style={{ width: '100%' }} placeholder="DD/MM/YYYY"
            />
          </Field>
          <Field label="Số giấy khai sinh">
            <Input value={birthCertNo} onChange={(e) => setBirthCertNo(e.target.value)} placeholder="Tùy chọn" />
          </Field>
        </div>

        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 700, margin: '8px 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Thông tin người giám hộ
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <Field label="Họ tên giám hộ" required error={form.errors.guardianName}>
            <Input value={guardianName} onChange={(e) => { setGuardianName(e.target.value); form.clear('guardianName'); }} placeholder="Họ tên cha/mẹ" />
          </Field>
          <Field label="Quan hệ với BN" required error={form.errors.guardianRelation}>
            <Input value={guardianRelation} onChange={(e) => { setGuardianRelation(e.target.value); form.clear('guardianRelation'); }} placeholder="Cha/mẹ, anh/chị…" />
          </Field>
          <Field label="CCCD giám hộ">
            <Input value={guardianIdNo} onChange={(e) => setGuardianIdNo(e.target.value)} placeholder="Tùy chọn" />
          </Field>
          <Field label="SĐT giám hộ">
            <Input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} placeholder="Tùy chọn" />
          </Field>
        </div>

        <Field label="Số BHYT của giám hộ">
          <Input value={guardianInsuranceNo} onChange={(e) => setGuardianInsuranceNo(e.target.value)} placeholder="Dùng để cấp thẻ tạm cho trẻ" />
        </Field>
      </div>
    </ModalShell>
  );
};

// ─── 2. Giữ / Trả giấy tờ ────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  { value: 1, label: 'CCCD / CMND' },
  { value: 2, label: 'Thẻ BHYT' },
  { value: 3, label: 'Sổ khám bệnh' },
  { value: 4, label: 'Giấy giới thiệu' },
  { value: 5, label: 'Hộ chiếu' },
  { value: 6, label: 'Khác' },
];

export interface DocumentHoldModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  medicalRecordId?: string;
  patientName?: string;
}

export const DocumentHoldModal: React.FC<DocumentHoldModalProps> = ({
  open, onClose, patientId, medicalRecordId, patientName,
}) => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<'hold' | 'list'>('hold');
  const [busy, setBusy] = useState(false);
  const [heldDocs, setHeldDocs] = useState<DocumentHoldDto[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  // Hold form
  const [docType, setDocType] = useState(1);
  const [docNumber, setDocNumber] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [holdNotes, setHoldNotes] = useState('');

  // Return form
  const [returnNotes, setReturnNotes] = useState('');
  const [returnToName, setReturnToName] = useState('');
  const form = useModalForm({ docNumber: { required: true, message: 'Nhập số / mã giấy tờ' } }, open);

  const loadHeld = useCallback(async () => {
    if (!patientId) return;
    setLoadingDocs(true);
    try {
      // DocumentHoldSearchDto does not have medicalRecordId; filter by patientId only.
      const res = await receptionApi.searchDocumentHolds({ patientId, status: 0 });
      setHeldDocs(res.data?.items || []);
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không tải được danh sách giấy tờ đang giữ.'));
      setHeldDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [patientId, medicalRecordId, message]);

  useEffect(() => {
    if (open) {
      setTab('hold');
      setDocType(1); setDocNumber(''); setDocDesc(''); setHoldNotes('');
      setReturningId(null); setReturnNotes(''); setReturnToName('');
      loadHeld();
    }
  }, [open, loadHeld]);

  const submitHold = async () => {
    if (!form.validate({ docNumber })) return;
    setBusy(true);
    try {
      await receptionApi.createDocumentHold({
        patientId,
        medicalRecordId,
        documentType: docType,
        documentNumber: docNumber.trim(),
        documentDescription: docDesc.trim() || undefined,
        holdNotes: holdNotes.trim() || undefined,
      });
      message.success('Đã ghi nhận giữ giấy tờ');
      setDocNumber(''); setDocDesc(''); setHoldNotes('');
      loadHeld();
      setTab('list');
    } catch {
      message.error('Ghi nhận giữ giấy tờ thất bại');
    } finally {
      setBusy(false);
    }
  };

  const submitReturn = async (docId: string) => {
    setBusy(true);
    try {
      await receptionApi.returnDocument({
        documentHoldId: docId,
        returnNotes: returnNotes.trim() || undefined,
        returnToPersonName: returnToName.trim() || undefined,
      });
      message.success('Đã trả giấy tờ');
      setReturningId(null); setReturnNotes(''); setReturnToName('');
      loadHeld();
    } catch {
      message.error('Trả giấy tờ thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Giữ / Trả giấy tờ"
      sub={patientName || undefined}
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Đóng</button>
          {tab === 'hold' && (
            <button type="button" className="ab-btn primary" disabled={busy} onClick={submitHold}>
              <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Ghi nhận giữ'}
            </button>
          )}
        </>
      )}
    >
      <div style={{ padding: 0 }}>
        {/* Sub-tabs */}
        <div className="rec-drawer-tabs" style={{ marginBottom: 'var(--space-14)' }}>
          <button type="button" className={tab === 'hold' ? 'on' : ''} onClick={() => setTab('hold')}>Giữ mới</button>
          <button type="button" className={tab === 'list' ? 'on' : ''} onClick={() => { setTab('list'); loadHeld(); }}>
            Đang giữ <i>{heldDocs.length}</i>
          </button>
        </div>

        {tab === 'hold' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
              <Field label="Loại giấy tờ" required>
                <Select value={docType} onChange={setDocType} style={{ width: '100%' }} options={DOCUMENT_TYPES} />
              </Field>
              <Field label="Số / mã giấy tờ" required error={form.errors.docNumber}>
                <Input value={docNumber} onChange={(e) => { setDocNumber(e.target.value); form.clear('docNumber'); }} placeholder="VD: 034093012345" />
              </Field>
            </div>
            <Field label="Mô tả giấy tờ">
              <Input value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder="Tùy chọn" />
            </Field>
            <Field label="Ghi chú giữ">
              <Input.TextArea value={holdNotes} onChange={(e) => setHoldNotes(e.target.value)} rows={2} placeholder="Lý do giữ, điều kiện trả…" />
            </Field>
          </>
        )}

        {tab === 'list' && (
          <div>
            {loadingDocs && <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: '20px 0', fontSize: 'var(--fs-sm)' }}>Đang tải…</div>}
            {!loadingDocs && heldDocs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: '24px 0', fontSize: 'var(--fs-sm)' }}>
                Không có giấy tờ đang được giữ
              </div>
            )}
            {heldDocs.map((d) => (
              <div key={d.id} style={{
                padding: '10px 12px', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)',
                marginBottom: 'var(--space-8)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                  <div>
                    <span className="chip info" style={{ fontSize: 'var(--fs-xs)', marginRight: 'var(--space-6)' }}>{d.documentTypeName}</span>
                    <span className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{d.documentNumber}</span>
                  </div>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{d.holdDurationDays}d</span>
                </div>
                {d.documentDescription && (
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-6)' }}>{d.documentDescription}</div>
                )}

                {returningId === d.id ? (
                  <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-8)', borderTop: '1px solid var(--line-soft)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
                      <Field label="Trả cho">
                        <Input size="small" value={returnToName} onChange={(e) => setReturnToName(e.target.value)} placeholder="Tên người nhận" />
                      </Field>
                      <Field label="Ghi chú trả">
                        <Input size="small" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Tùy chọn" />
                      </Field>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                      <button type="button" className="ab-btn ghost sm" onClick={() => setReturningId(null)}>Hủy</button>
                      <button type="button" className="ab-btn ok sm" disabled={busy} onClick={() => submitReturn(d.id)}>
                        <TermIcon name="check" size={11} /> Xác nhận trả
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="ab-btn ghost sm" onClick={() => {
                    setReturningId(d.id);
                    setReturnNotes(''); setReturnToName('');
                  }}>
                    <TermIcon name="check" size={11} /> Trả giấy tờ
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

// ─── 3. Chụp ảnh bệnh nhân ───────────────────────────────────────────────────

const PHOTO_TYPES = [
  { value: 1, label: 'Ảnh chân dung' },
  { value: 2, label: 'Ảnh CCCD mặt trước' },
  { value: 3, label: 'Ảnh CCCD mặt sau' },
  { value: 4, label: 'Ảnh thẻ BHYT' },
  { value: 5, label: 'Khác' },
];

export interface PhotoModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  medicalRecordId?: string;
  patientName?: string;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  open, onClose, patientId, medicalRecordId, patientName,
}) => {
  const { message } = AntdApp.useApp();
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<PatientPhotoDto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photoType, setPhotoType] = useState(1);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useModalForm({ preview: { required: true, message: 'Chọn ảnh để tải lên' } }, open);

  const loadPhotos = useCallback(async () => {
    if (!patientId) return;
    setLoadingPhotos(true);
    try {
      const res = await receptionApi.getPatientPhotos(patientId, medicalRecordId);
      setPhotos(res.data || []);
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không tải được danh sách ảnh.'));
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, [patientId, medicalRecordId, message]);

  useEffect(() => {
    if (open) {
      setPhotoType(1); setNotes(''); setPreview(null); setFileName('');
      loadPhotos();
    }
  }, [open, loadPhotos]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { message.warning('Chỉ chấp nhận file ảnh'); return; }
    if (file.size > 5 * 1024 * 1024) { message.warning('Ảnh không được vượt quá 5MB'); return; }
    form.clear('preview');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const upload = async () => {
    if (!form.validate({ preview })) return;
    // base64Data = the data URL part after the comma
    const base64Data = (preview as string).split(',')[1];
    if (!base64Data) { message.warning('Không đọc được file ảnh'); return; }
    setBusy(true);
    try {
      await receptionApi.uploadPhoto({
        patientId,
        medicalRecordId,
        photoType,
        base64Data,
        fileName: fileName || 'photo.jpg',
        notes: notes.trim() || undefined,
      });
      message.success('Đã tải ảnh lên');
      setPreview(null); setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadPhotos();
    } catch {
      message.error('Tải ảnh thất bại');
    } finally {
      setBusy(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      await receptionApi.deletePhoto(photoId);
      message.success('Đã xóa ảnh');
      loadPhotos();
    } catch {
      message.error('Xóa ảnh thất bại');
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Chụp ảnh bệnh nhân"
      sub={patientName || undefined}
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Đóng</button>
          <button type="button" className="ab-btn primary" disabled={busy} onClick={upload}>
            <TermIcon name="upload" size={12} /> {busy ? 'Đang tải…' : 'Tải lên'}
          </button>
        </>
      )}
    >
      <div style={{ padding: 0 }}>
        {/* Upload section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)', marginBottom: 'var(--space-14)' }}>
          <Field label="Loại ảnh">
            <Select value={photoType} onChange={setPhotoType} style={{ width: '100%' }} options={PHOTO_TYPES} />
          </Field>
          <Field label="Ghi chú">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tùy chọn" />
          </Field>
        </div>

        <Field label="Chọn ảnh" required error={form.errors.preview}>
          <label style={{
            display: 'block', border: '1.5px dashed var(--line)', borderRadius: 'var(--r-2)',
            padding: preview ? 0 : '20px 0', textAlign: 'center',
            cursor: 'pointer', overflow: 'hidden',
          }}>
            <input
              ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={onFileChange}
            />
            {preview ? (
              <img
                src={preview} alt="preview"
                style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
                <TermIcon name="upload" size={14} />
                {' '}Nhấn để chọn ảnh (JPG/PNG, tối đa 5MB)
              </span>
            )}
          </label>
        </Field>

        {/* Existing photos */}
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 700, marginBottom: 'var(--space-8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ảnh đã lưu {loadingPhotos ? '…' : `(${photos.length})`}
        </div>
        {photos.length === 0 && !loadingPhotos && (
          <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', textAlign: 'center', padding: '12px 0' }}>Chưa có ảnh</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 'var(--space-8)' }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: 'relative', borderRadius: 'var(--r-2)', overflow: 'hidden', border: '1px solid var(--line-soft)' }}>
              <img
                src={p.thumbnailPath || p.filePath} alt={p.photoTypeName}
                style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.5)', padding: '2px 4px', fontSize: 'var(--fs-xxs)', color: '#fff',
              }}>
                {p.photoTypeName}
              </div>
              <button
                type="button"
                onClick={() => cf('Xoá ảnh này? Thao tác không thể hoàn tác.', () => deletePhoto(p.id), { tone: 'crit', confirm: 'Xoá' })}
                style={{
                  position: 'absolute', top: 3, right: 3,
                  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 'var(--r-1)',
                  padding: '2px 3px', cursor: 'pointer', color: '#fff', lineHeight: 1,
                }}
                title="Xóa ảnh"
              >
                <TermIcon name="x" size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

// ─── 4. Chỉ định dịch vụ CLS tại tiếp đón ────────────────────────────────────

// Đối tượng thanh toán — KHỚP backend StatusConstants.PatientType (1=BHYT, 2=Viện phí, 3=Dịch vụ).
// Trước đây 1/2 bị đảo nhãn (1='Viện phí', 2='BHYT') → chọn sai đối tượng khi chỉ định DV. Đã sửa.
const PAYMENT_TYPES = [
  { value: 1, label: 'BHYT' },
  { value: 2, label: 'Viện phí' },
  { value: 3, label: 'Dịch vụ' },
];

interface ServiceRow {
  key: number;
  service: ServiceDto | null;
  quantity: number;
  paymentType: number;
  notes: string;
}

let _rowKey = 0;
const nextKey = () => ++_rowKey;

export interface ServiceOrderModalProps {
  open: boolean;
  onClose: () => void;
  medicalRecordId: string;
  patientName?: string;
}

export const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
  open, onClose, medicalRecordId, patientName,
}) => {
  const { message } = AntdApp.useApp();
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ServiceRow[]>([{ key: nextKey(), service: null, quantity: 1, paymentType: 1, notes: '' }]);
  const [searchResults, setSearchResults] = useState<ServiceDto[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeRowKey, setActiveRowKey] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // #455 Cost estimation state
  const [estOpen, setEstOpen] = useState(false);
  const [estLoading, setEstLoading] = useState(false);
  const [estResult, setEstResult] = useState<CostEstimationResultDto | null>(null);
  const [estPatientType, setEstPatientType] = useState(2);
  const [estCoverage, setEstCoverage] = useState(80);

  useEffect(() => {
    if (open) {
      setRows([{ key: nextKey(), service: null, quantity: 1, paymentType: 1, notes: '' }]);
      setSearchResults([]);
      setActiveRowKey(null);
    }
  }, [open]);

  const doSearch = (kw: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!kw.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchServices(kw.trim(), 15);
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const pickService = (rowKey: number, svc: ServiceDto) => {
    setRows((prev) => prev.map((r) => r.key === rowKey ? { ...r, service: svc } : r));
    setSearchResults([]);
    setActiveRowKey(null);
  };

  const updateRow = (rowKey: number, patch: Partial<ServiceRow>) => {
    setRows((prev) => prev.map((r) => r.key === rowKey ? { ...r, ...patch } : r));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { key: nextKey(), service: null, quantity: 1, paymentType: 1, notes: '' }]);
  };

  const removeRow = (rowKey: number) => {
    setRows((prev) => prev.filter((r) => r.key !== rowKey));
  };

  const submit = async () => {
    const valid = rows.filter((r) => r.service !== null);
    if (valid.length === 0) { message.warning('Thêm ít nhất một dịch vụ'); return; }
    setBusy(true);
    try {
      const result = await receptionApi.orderServicesAtReception(medicalRecordId, {
        services: valid.map((r) => ({
          serviceId: r.service!.id,
          serviceCode: r.service!.code,
          serviceName: r.service!.name,
          quantity: r.quantity,
          paymentType: r.paymentType,
          notes: r.notes.trim() || undefined,
        })),
        autoSelectRoom: true,
      });
      const count = (result.data || []).length;
      message.success(`Đã chỉ định ${count} dịch vụ`);
      onClose();
    } catch (e) {
      // Trước đây `catch {}` nuốt sạch lỗi ⇒ mọi nguyên nhân đều hiện đúng một câu chung chung,
      // không ai biết là thiếu khoa, sai người chỉ định hay dịch vụ không tồn tại.
      message.error(friendlyErrorMessage(e, 'Chỉ định dịch vụ thất bại. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  const doEstimate = async () => {
    const serviceIds = rows.filter(r => r.service).map(r => r.service!.id);
    if (serviceIds.length === 0) { message.warning('Thêm ít nhất một dịch vụ để dự toán'); return; }
    setEstLoading(true);
    setEstOpen(true);
    try {
      const res = await estimateCostDirect({ serviceIds, patientType: estPatientType, insuranceCoverageRate: estCoverage });
      setEstResult(res.data ?? null);
    } catch (e) {
      message.error(friendlyErrorMessage(e, 'Dự toán viện phí thất bại. Vui lòng thử lại.'));
      setEstResult(null);
    } finally {
      setEstLoading(false);
    }
  };

  const printEstimate = () => {
    if (!estResult) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = estResult.items.map((it, i) =>
      `<tr><td>${i + 1}</td><td>${it.serviceName}</td><td>${it.serviceGroupName}</td><td>${it.unitPrice.toLocaleString('vi-VN')}</td><td>${it.insurancePrice.toLocaleString('vi-VN')}</td><td style="font-weight:600">${it.patientPrice.toLocaleString('vi-VN')}</td></tr>`
    ).join('');
    win.document.write(`<html><head><title>Dự toán viện phí</title><style>body{font-family:Arial;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px}th{background:#f0f0f0}h3{text-align:center}</style></head><body>
      <h3>DỰ TOÁN VIỆN PHÍ</h3><p>Đối tượng: <b>${estResult.patientTypeName}</b>${estResult.patientType === 1 ? ` — BHYT ${estResult.insuranceCoverageRate}%` : ''}</p>
      <table><thead><tr><th>STT</th><th>Tên dịch vụ</th><th>Nhóm</th><th>Đơn giá</th><th>BHYT trả</th><th>BN trả</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3"><b>TỔNG CỘNG</b></td><td><b>${estResult.totalAmount.toLocaleString('vi-VN')}</b></td><td><b>${estResult.insuranceAmount.toLocaleString('vi-VN')}</b></td><td><b>${estResult.patientAmount.toLocaleString('vi-VN')}</b></td></tr></tfoot></table>
      <p style="margin-top:16px;font-style:italic;font-size:11px">* Đây là ước tính sơ bộ, chi phí thực tế có thể thay đổi tùy theo chỉ định của bác sĩ.</p>
      </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Chỉ định dịch vụ CLS"
      sub={patientName || undefined}
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Hủy</button>
          <button type="button" className="ab-btn ghost" disabled={estLoading} onClick={doEstimate}>
            <TermIcon name="calculator" size={12} /> {estLoading ? 'Đang tính…' : 'Dự toán'}
          </button>
          <button type="button" className="ab-btn primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang chỉ định…' : `Chỉ định (${rows.filter((r) => r.service).length})`}
          </button>
        </>
      )}
    >
      <div style={{ padding: 0 }}>
        {rows.map((row, idx) => (
          <div key={row.key} style={{
            padding: '10px 12px', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)',
            marginBottom: 'var(--space-8)', position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 600, minWidth: 18 }}>{idx + 1}.</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <Input
                  size="small"
                  value={row.service ? `${row.service.code} · ${row.service.name}` : ''}
                  placeholder="Tìm dịch vụ (mã / tên)…"
                  readOnly={!!row.service}
                  onClick={() => { if (row.service) { updateRow(row.key, { service: null }); } setActiveRowKey(row.key); }}
                  onChange={(e) => {
                    if (!row.service) {
                      setActiveRowKey(row.key);
                      doSearch(e.target.value);
                    }
                  }}
                  suffix={row.service
                    ? <span onClick={() => { updateRow(row.key, { service: null }); setSearchResults([]); }} style={{ cursor: 'pointer' }}><TermIcon name="x" size={10} /></span>
                    : searchLoading && activeRowKey === row.key ? <TermIcon name="refresh" size={10} /> : null
                  }
                />
                {/* Dropdown */}
                {activeRowKey === row.key && !row.service && searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                    background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto',
                  }}>
                    {searchResults.map((svc) => (
                      <div
                        key={svc.id}
                        style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 'var(--fs-sm)' }}
                        onMouseDown={(e) => { e.preventDefault(); pickService(row.key, svc); }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--d-1)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                      >
                        <span className="mono" style={{ color: 'var(--a-cy)', marginRight: 'var(--space-8)' }}>{svc.code}</span>
                        {svc.name}
                        <span style={{ float: 'right', color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>
                          {svc.unitPrice?.toLocaleString('vi-VN')}₫
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Select
                size="small" value={row.paymentType} onChange={(v) => updateRow(row.key, { paymentType: v })}
                style={{ width: 110 }} options={PAYMENT_TYPES}
              />
              <input
                type="number" min={1} max={99} value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                style={{ width: 48, padding: '3px 6px', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', textAlign: 'center' }}
              />
              {rows.length > 1 && (
                <button
                  type="button" className="ab-iconbtn" style={{ color: 'var(--s-crit)' }}
                  title="Xoá dòng dịch vụ" aria-label="Xoá dòng dịch vụ"
                  onClick={() => removeRow(row.key)}
                >
                  <TermIcon name="x" size={11} />
                </button>
              )}
            </div>
            <Input
              size="small" value={row.notes}
              onChange={(e) => updateRow(row.key, { notes: e.target.value })}
              placeholder="Ghi chú chỉ định (tùy chọn)"
            />
          </div>
        ))}

        <button type="button" className="ab-btn ghost sm" onClick={addRow} style={{ marginTop: 'var(--space-4)' }}>
          <TermIcon name="plus" size={11} /> Thêm dịch vụ
        </button>

        <div style={{ marginTop: 'var(--space-14)', padding: '8px 10px', background: 'var(--d-1)', borderRadius: 5, fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
          Tìm dịch vụ bằng từ khoá (mã hoặc tên). Phòng thực hiện sẽ được tự động chọn.
          Hình thức thanh toán mặc định: Viện phí.
        </div>

        {/* #455 Cost estimate panel */}
        {estOpen && (
          <div style={{ marginTop: 'var(--space-14)', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
            {/* Header + controls */}
            <div style={{ padding: '8px 12px', background: 'var(--d-1)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', flex: 1 }}>Dự toán viện phí</span>
              <Select
                size="small" value={estPatientType} onChange={(v) => { setEstPatientType(v); setEstResult(null); }}
                style={{ width: 130 }}
                options={[
                  { value: 1, label: 'BHYT' },
                  { value: 2, label: 'Viện phí' },
                  { value: 3, label: 'Dịch vụ' },
                  { value: 4, label: 'Khám sức khỏe' },
                ]}
              />
              {estPatientType === 1 && (
                <Select
                  size="small" value={estCoverage} onChange={(v) => { setEstCoverage(v); setEstResult(null); }}
                  style={{ width: 100 }}
                  options={[
                    { value: 100, label: 'BHYT 100%' },
                    { value: 95, label: 'BHYT 95%' },
                    { value: 80, label: 'BHYT 80%' },
                  ]}
                />
              )}
              <button type="button" className="ab-btn ghost sm" disabled={estLoading} onClick={doEstimate}>
                {estLoading ? 'Đang tính…' : 'Tính lại'}
              </button>
              {estResult && (
                <button type="button" className="ab-btn ghost sm" onClick={printEstimate}>
                  <TermIcon name="printer" size={11} /> In
                </button>
              )}
              <button type="button" className="ab-iconbtn" onClick={() => setEstOpen(false)}>
                <TermIcon name="x" size={11} />
              </button>
            </div>

            {/* Table */}
            {estResult ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-xs)' }}>
                <thead>
                  <tr style={{ background: 'var(--d-1)' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left', borderBottom: '1px solid var(--line)', fontWeight: 600 }}>Dịch vụ</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid var(--line)', fontWeight: 600, whiteSpace: 'nowrap' }}>Đơn giá</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid var(--line)', fontWeight: 600, whiteSpace: 'nowrap' }}>BHYT trả</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid var(--line)', fontWeight: 600, whiteSpace: 'nowrap' }}>BN trả</th>
                  </tr>
                </thead>
                <tbody>
                  {estResult.items.map((it, i) => (
                    <tr key={it.serviceId} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--d-1)' }}>
                      <td style={{ padding: '4px 8px' }}>{it.serviceName}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{it.unitPrice.toLocaleString('vi-VN')}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--a-cy)' }}>{it.insurancePrice.toLocaleString('vi-VN')}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: estResult.patientType === 1 ? 'var(--s-warn)' : 'var(--t-0)' }}>{it.patientPrice.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
                    <td style={{ padding: '6px 8px' }}>Tổng cộng</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{estResult.totalAmount.toLocaleString('vi-VN')}₫</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--a-cy)' }}>{estResult.insuranceAmount.toLocaleString('vi-VN')}₫</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--s-crit)', fontSize: 'var(--fs-sm)' }}>{estResult.patientAmount.toLocaleString('vi-VN')}₫</td>
                  </tr>
                </tfoot>
              </table>
            ) : estLoading ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Đang tính dự toán…</div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Chưa có kết quả. Nhấn "Tính lại" để dự toán.</div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
};
