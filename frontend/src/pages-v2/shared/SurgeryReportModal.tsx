/**
 * SurgeryReportModal — Shared component for PTTT narrative report (tường trình PTTT).
 *
 * Used in:
 *  - OpdEditor (G-09): doctor presses "PTTT (F6)" during OPD examination
 *  - Radiology ResultEntryModal (G-33): technician/doctor enters narrative for
 *    biopsy / procedure under imaging guidance
 *
 * Props:
 *  open         — whether modal is visible
 *  onClose      — close without saving
 *  onSaved      — callback after successful create/update
 *  examinationId — OPD examination to link the surgery record to
 *  patientName   — display label (subtitle of modal)
 *  patientCode   — display label
 *  /** Optional pre-fill values (e.g. from an existing service order) *\/
 *  prefillServiceName? — pre-fill surgeryMethod
 *  prefillDiagnosis?   — pre-fill preOperativeDiagnosis
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Input, Upload, message as antMessage } from 'antd';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import {
  ModalShell, Btn, AbSelect,
  fmtDTg, tk, tw, te,
} from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import { useAbbrExpansion } from '../../utils/abbrExpand';
import { ABBREVIATION_SCOPES } from '../../api/abbreviation';
import {
  createSurgeryRequest,
  getSurgeries,
  printSurgeryReport,
  type SurgeryDto,
} from '../../modules/surgery/api/surgery';
import { uploadPhoto } from '../../modules/reception/api/reception';

// Scope: general + diagnosis abbreviation dictionaries
const PTTT_ABBR_SCOPES = [ABBREVIATION_SCOPES.GENERAL, ABBREVIATION_SCOPES.DIAGNOSIS] as const;

const ANESTHESIA_OPTIONS = [
  { value: 1, label: 'Gây tê tại chỗ' },
  { value: 2, label: 'Gây mê toàn thân' },
  { value: 3, label: 'Gây mê nội khí quản' },
  { value: 4, label: 'Gây tê tủy sống' },
  { value: 5, label: 'Gây tê ngoài màng cứng' },
];

const SURGERY_TYPE_OPTIONS = [
  { value: 1, label: 'Phẫu thuật lớn' },
  { value: 2, label: 'Phẫu thuật nhỏ' },
  { value: 3, label: 'Thủ thuật' },
];

const SURGERY_CLASS_OPTIONS = [
  { value: 1, label: 'Đặc biệt' },
  { value: 2, label: 'Loại 1' },
  { value: 3, label: 'Loại 2' },
  { value: 4, label: 'Loại 3' },
];

interface FormRow {
  label: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

/** Local layout helper — same pattern as in Radiology.tsx */
const FormRow: React.FC<FormRow> = ({ label, extra, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'start', gap: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', paddingTop: 5 }}>{label}</span>
      {extra && <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-3)' }}>{extra}</span>}
    </div>
    <div>{children}</div>
  </div>
);

export interface SurgeryReportModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** OPD examination ID to link surgery record */
  examinationId: string | null;
  /** Patient ID for photo upload (G-05) */
  patientId?: string;
  patientName?: string;
  patientCode?: string;
  /** Pre-fill for service/method (from CLS service order name) */
  prefillServiceName?: string;
  /** Pre-fill for pre-operative diagnosis */
  prefillDiagnosis?: string;
  /** Pre-fill narrative body text (từ SurgeryNarrativeTemplate.NarrativeBody) */
  prefillNarrativeBody?: string;
}

interface SurgeryForm {
  surgeryType: number;
  surgeryClass: number;
  surgeryMethod: string;
  anesthesiaType: number;
  anesthesiaMethod: string;
  preOperativeDiagnosis: string;
  preOperativeIcdCode: string;
  description: string;  // tường trình nội dung
  conclusion: string;
  notes: string;
}

const EMPTY_FORM: SurgeryForm = {
  surgeryType: 3,   // default Thủ thuật (most common in OPD)
  surgeryClass: 4,  // default Loại 3
  surgeryMethod: '',
  anesthesiaType: 1,
  anesthesiaMethod: '',
  preOperativeDiagnosis: '',
  preOperativeIcdCode: '',
  description: '',
  conclusion: '',
  notes: '',
};

/** Convert RcFile to base64 string */
const toBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const SurgeryReportModal: React.FC<SurgeryReportModalProps> = ({
  open,
  onClose,
  onSaved,
  examinationId,
  patientId,
  patientName,
  patientCode,
  prefillServiceName,
  prefillDiagnosis,
  prefillNarrativeBody,
}) => {
  const expand = useAbbrExpansion(PTTT_ABBR_SCOPES);

  const [form, setForm] = useState<SurgeryForm>(EMPTY_FORM);
  const [existingList, setExistingList] = useState<SurgeryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null); // surgeryId being printed

  // G-05: photo attachment state
  const [mainPhoto, setMainPhoto]   = useState<UploadFile[]>([]); // hình chính (1 ảnh)
  const [extraPhotos, setExtraPhotos] = useState<UploadFile[]>([]); // hình phụ (nhiều ảnh)
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Merge prefill values into form when props change; reset photo state on open
  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY_FORM,
      surgeryMethod: prefillServiceName ?? '',
      preOperativeDiagnosis: prefillDiagnosis ?? '',
      description: prefillNarrativeBody ?? '',
    });
    setMainPhoto([]);
    setExtraPhotos([]);
  }, [open, prefillServiceName, prefillDiagnosis, prefillNarrativeBody]);

  // Load existing surgery records for this examination
  const loadExisting = useCallback(async () => {
    if (!examinationId) { setExistingList([]); return; }
    setLoading(true);
    try {
      const res = await getSurgeries({ examinationId, pageSize: 50 });
      setExistingList(res.data?.items ?? []);
    } catch {
      setExistingList([]);
    } finally {
      setLoading(false);
    }
  }, [examinationId]);

  useEffect(() => {
    if (open) loadExisting();
    else setExistingList([]);
  }, [open, loadExisting]);

  const set = <K extends keyof SurgeryForm>(k: K, v: SurgeryForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!examinationId) { tw('Chưa chọn bệnh nhân / lần khám'); return; }
    if (!form.surgeryMethod.trim()) { tw('Cần nhập phương pháp PT/TT'); return; }
    if (!form.description.trim() && !form.conclusion.trim()) {
      tw('Cần nhập tường trình hoặc kết luận');
      return;
    }
    setSaving(true);
    try {
      // G-05: upload photos before saving, then pack URLs into notes
      const photoNotes: string[] = [];
      if (patientId && (mainPhoto.length > 0 || extraPhotos.length > 0)) {
        setUploadingPhotos(true);
        try {
          // Upload hình chính (photoType=5 = surgery main)
          for (const f of mainPhoto) {
            if (f.originFileObj) {
              const base64 = await toBase64(f.originFileObj as RcFile);
              const res = await uploadPhoto({ patientId, photoType: 5, base64Data: base64, fileName: f.name });
              if (res.data?.filePath) photoNotes.push(`[HINHCHINH] ${res.data.filePath}`);
            }
          }
          // Upload hình phụ (photoType=6 = surgery extra)
          for (const f of extraPhotos) {
            if (f.originFileObj) {
              const base64 = await toBase64(f.originFileObj as RcFile);
              const res = await uploadPhoto({ patientId, photoType: 6, base64Data: base64, fileName: f.name });
              if (res.data?.filePath) photoNotes.push(`[HINHPHU] ${res.data.filePath}`);
            }
          }
        } catch {
          void antMessage.warning('Một số hình ảnh không tải lên được, tiếp tục lưu tường trình');
        } finally {
          setUploadingPhotos(false);
        }
      }

      await createSurgeryRequest({
        medicalRecordId: '',          // empty for OPD-only; BE accepts empty/null
        examinationId,
        surgeryServiceId: '',         // free-text entry via surgeryMethod for OPD inline
        surgeryType: form.surgeryType,
        surgeryClass: form.surgeryClass,
        surgeryNature: 2,             // Chương trình (default for OPD PTTT)
        preOperativeDiagnosis: form.preOperativeDiagnosis || undefined,
        preOperativeIcdCode: form.preOperativeIcdCode || undefined,
        surgeryMethod: form.surgeryMethod,
        anesthesiaType: form.anesthesiaType,
        anesthesiaMethod: form.anesthesiaMethod || undefined,
        // Field tường minh (BE map vào cột riêng, migration 78) — thay sentinel Notes cũ.
        surgeryReport: form.description || undefined,
        conclusion: form.conclusion || undefined,
        attachedImageUrls: photoNotes.length > 0 ? photoNotes.join('\n') : undefined,
        notes: form.notes || undefined,
      });
      tk('Đã lưu tường trình PTTT');
      await loadExisting();
      onSaved?.();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Không thể lưu tường trình PTTT');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (surgeryId: string) => {
    setPrinting(surgeryId);
    try {
      const res = await printSurgeryReport(surgeryId);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      te('Không in được phiếu tường trình');
    } finally {
      setPrinting(null);
    }
  };

  const subtitle = [patientName, patientCode].filter(Boolean).join(' · ');

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
          <TermIcon name="scissors" size={14} />
          <span>Tường trình PTTT</span>
        </span>
      }
      sub={subtitle || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          <Btn
            variant="primary"
            loading={saving}
            onClick={handleSave}
          >
            <TermIcon name="plus" size={12} /> Lưu tường trình
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }}>

        {/* ── Danh sách tường trình đã lập ── */}
        {existingList.length > 0 && (
          <section>
            <div style={{
              fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
              color: 'var(--t-2)', marginBottom: 'var(--space-6)', letterSpacing: '.05em',
            }}>
              Tường trình đã lập ({existingList.length})
            </div>
            {existingList.map((s) => (
              <div key={s.id} style={{
                border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: '8px 10px',
                marginBottom: 'var(--space-6)', fontSize: 'var(--fs-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
                  <b style={{ fontSize: 12.5 }}>{s.surgeryServiceName || s.surgeryCode}</b>
                  <span style={{ color: 'var(--t-3)', fontSize: 'var(--fs-xs)' }}>
                    {fmtDTg(s.createdAt)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <Btn
                    size="sm"
                    variant="ghost"
                    loading={printing === s.id}
                    onClick={() => handlePrint(s.id)}
                    icon="print"
                  >
                    In phiếu
                  </Btn>
                </div>
                <div style={{ color: 'var(--t-2)', fontSize: 11.5 }}>
                  {s.anesthesiaTypeName && <span>Vô cảm: {s.anesthesiaTypeName} · </span>}
                  {s.surgeryTypeName && <span>Loại: {s.surgeryTypeName}</span>}
                </div>
              </div>
            ))}
          </section>
        )}

        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>
            Đang tải…
          </div>
        )}

        {/* ── Form tường trình mới ── */}
        <section>
          <div style={{
            fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
            color: 'var(--t-2)', marginBottom: 'var(--space-8)', letterSpacing: '.05em',
          }}>
            Lập tường trình mới
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Loại PT/TT</div>
              <AbSelect
                options={SURGERY_TYPE_OPTIONS}
                value={form.surgeryType}
                onChange={(v) => set('surgeryType', Number(v))}
              />
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Phân loại</div>
              <AbSelect
                options={SURGERY_CLASS_OPTIONS}
                value={form.surgeryClass}
                onChange={(v) => set('surgeryClass', Number(v))}
              />
            </div>
          </div>

          <FormRow label="Phương pháp PT/TT *">
            <input
              className="hui-inp"
              style={{ width: '100%', height: 28 }}
              value={form.surgeryMethod}
              onChange={(e) => set('surgeryMethod', e.target.value)}
              placeholder="Tên thủ thuật / phẫu thuật…"
            />
          </FormRow>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Phương pháp vô cảm</div>
              <AbSelect
                options={ANESTHESIA_OPTIONS}
                value={form.anesthesiaType}
                onChange={(v) => set('anesthesiaType', Number(v))}
              />
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Chi tiết vô cảm</div>
              <input
                className="hui-inp"
                style={{ width: '100%', height: 28 }}
                value={form.anesthesiaMethod}
                onChange={(e) => set('anesthesiaMethod', e.target.value)}
                placeholder="Ví dụ: 2% Lidocaine 5ml…"
              />
            </div>
          </div>

          <FormRow label="Chẩn đoán trước">
            <input
              className="hui-inp"
              style={{ width: '100%', height: 28 }}
              value={form.preOperativeDiagnosis}
              onChange={(e) => set('preOperativeDiagnosis', e.target.value)}
              placeholder="Chẩn đoán trước thủ thuật…"
            />
          </FormRow>

          <FormRow
            label="Tường trình *"
            extra={
              <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>
                <TermIcon name="zap" size={9} /> viết tắt + Space
              </span>
            }
          >
            <Input.TextArea
              rows={5}
              value={form.description}
              onChange={(e) => set('description', expand(e.target.value))}
              placeholder="Mô tả diễn biến, các bước thực hiện, phát hiện trong khi làm thủ thuật…"
            />
          </FormRow>

          <FormRow
            label="Kết luận"
            extra={
              <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>
                <TermIcon name="zap" size={9} /> viết tắt + Space
              </span>
            }
          >
            <Input.TextArea
              rows={3}
              value={form.conclusion}
              onChange={(e) => set('conclusion', expand(e.target.value))}
              placeholder="Kết quả, nhận xét sau thủ thuật…"
            />
          </FormRow>

          <FormRow label="Ghi chú">
            <Input.TextArea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Dặn dò, hướng dẫn sau thủ thuật…"
            />
          </FormRow>

          {/* G-05: Photo upload — only when patientId is provided */}
          {patientId && (
            <>
              <FormRow label="Hình chính">
                <Upload
                  listType="picture-card"
                  fileList={mainPhoto}
                  maxCount={1}
                  accept="image/*"
                  beforeUpload={(file) => {
                    setMainPhoto([{ uid: file.uid, name: file.name, status: 'done', originFileObj: file }]);
                    return false; // prevent auto-upload
                  }}
                  onRemove={() => setMainPhoto([])}
                >
                  {mainPhoto.length === 0 && (
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                      <TermIcon name="upload" size={14} />
                      <div>Chọn ảnh</div>
                    </div>
                  )}
                </Upload>
              </FormRow>
              <FormRow label="Hình phụ">
                <Upload
                  listType="picture-card"
                  fileList={extraPhotos}
                  maxCount={5}
                  accept="image/*"
                  multiple
                  beforeUpload={(file) => {
                    setExtraPhotos((prev) => [
                      ...prev,
                      { uid: file.uid, name: file.name, status: 'done', originFileObj: file },
                    ]);
                    return false;
                  }}
                  onRemove={(file) => setExtraPhotos((prev) => prev.filter((f) => f.uid !== file.uid))}
                >
                  {extraPhotos.length < 5 && (
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                      <TermIcon name="image" size={14} />
                      <div>Thêm ảnh</div>
                    </div>
                  )}
                </Upload>
              </FormRow>
              {uploadingPhotos && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontStyle: 'italic' }}>
                  Đang tải ảnh lên…
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </ModalShell>
  );
};
