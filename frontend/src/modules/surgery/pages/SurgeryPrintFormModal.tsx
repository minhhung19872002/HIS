/**
 * SurgeryPrintFormModal — In Phiếu phẫu thuật/thủ thuật MS: 06/BV-02 (port v1 pages/Surgery.tsx → v2, #409).
 *
 * Port của flow v1 `handlePrintSurgeryRecord` → form chỉnh sửa → `executePrintSurgeryRecord`:
 * mọi field trên phiếu đều edit được trước khi in; kèm SurgeryDiagramField (M3.5 — vẽ sơ đồ
 * phẫu thuật bằng SurgeryDrawingPad, BS minh họa vị trí vết mổ / thủ thuật / tổn thương).
 *
 * Prefill: giữ nguyên mapping SurgeryDto của nút in trực tiếp #414 (patientName/gender/room/
 * surgeryTime/CĐ/PP/loại/vô cảm/PTV/mô tả) + bổ sung tuổi (tính từ dateOfBirth) và khoa
 * (requestDepartmentName — v1 hardcode 'Khoa Ngoại' là nợ, dùng dữ liệu thật).
 *
 * Khác v1 (fix wiring bug, ghi trong notes #409): v1 thu field form `diagramImage` nhưng template
 * đọc `surgeryDiagram` → ảnh vẽ KHÔNG BAO GIỜ ra bản in. Ở đây map tường minh
 * surgeryDiagram = <img src={diagramImage}/> để sơ đồ in được; template giữ verbatim.
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Input } from 'antd';
import { ModalShell, Btn, tw } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { Section, Row2 } from '../../../pages-v2/shared/surgery-modals/_shared';
import SurgeryDrawingPad from '../../patient/components/SurgeryDrawingPad';
import { openPrintWindow, escapeHtml as esc } from '../../../utils/printWindow';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import { buildSurgeryRecordHtml, type SurgeryRecordPrintValues } from './printTemplates';
import type { SurgeryDto } from '../api/surgery';

const { TextArea } = Input;

export interface SurgeryPrintFormModalProps {
  open: boolean;
  onClose: () => void;
  surgery: SurgeryDto | null;
}

interface PrintForm {
  patientName: string;
  age: string;
  gender: string;
  departmentName: string;
  roomName: string;
  bedName: string;
  admissionTime: string;
  surgeryTime: string;
  preOpDiagnosis: string;
  postOpDiagnosis: string;
  surgeryMethod: string;
  surgeryType: string;
  anesthesiaMethod: string;
  surgeonName: string;
  anesthesiologistName: string;
  surgeryDescription: string;
  diagramImage: string;
  drainInfo: string;
  removalDate: string;
  stitchRemovalDate: string;
  notes: string;
}

const EMPTY_FORM: PrintForm = {
  patientName: '', age: '', gender: '', departmentName: '', roomName: '', bedName: '',
  admissionTime: '', surgeryTime: '', preOpDiagnosis: '', postOpDiagnosis: '',
  surgeryMethod: '', surgeryType: '', anesthesiaMethod: '', surgeonName: '',
  anesthesiologistName: '', surgeryDescription: '', diagramImage: '',
  drainInfo: '', removalDate: '', stitchRemovalDate: '', notes: '',
};

/**
 * Port verbatim của v1 SurgeryDiagramField: preview ảnh đã vẽ + nút Vẽ sơ đồ / Vẽ lại
 * mở pad 620×380, lưu base64 PNG.
 */
const SurgeryDiagramField: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [padOpen, setPadOpen] = useState(false);
  return (
    <div>
      {value ? (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <img src={value} alt="Sơ đồ PTTT" style={{ maxWidth: 400, border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }} />
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-8)', color: 'var(--t-2)', fontStyle: 'italic', fontSize: 'var(--fs-sm)' }}>
          Chưa có sơ đồ
        </div>
      )}
      <Btn variant="ghost" size="sm" onClick={() => setPadOpen(true)}>
        <TermIcon name="edit" size={11} /> {value ? 'Vẽ lại' : 'Vẽ sơ đồ'}
      </Btn>
      {padOpen && (
        <ModalShell
          open
          onClose={() => setPadOpen(false)}
          size="lg"
          title="Vẽ sơ đồ phẫu thuật"
          sub="BS minh họa vị trí vết mổ, thủ thuật, tổn thương (M3.5)"
        >
          <SurgeryDrawingPad
            initialImage={value || undefined}
            width={620}
            height={380}
            onSave={(b64) => { onChange(b64); setPadOpen(false); }}
          />
        </ModalShell>
      )}
    </div>
  );
};

export const SurgeryPrintFormModal: React.FC<SurgeryPrintFormModalProps> = ({ open, onClose, surgery }) => {
  const [form, setForm] = useState<PrintForm>(EMPTY_FORM);

  const set = <K extends keyof PrintForm>(k: K, v: PrintForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Prefill từ SurgeryDto khi mở (mapping #414 + tuổi/khoa từ dữ liệu thật)
  useEffect(() => {
    if (!open || !surgery) return;
    const timeSrc = surgery.startTime || surgery.scheduledDate;
    setForm({
      ...EMPTY_FORM,
      patientName: surgery.patientName || '',
      age: surgery.dateOfBirth ? String(dayjs().diff(dayjs(surgery.dateOfBirth), 'year')) : '',
      gender: surgery.gender || '',
      departmentName: surgery.requestDepartmentName || '',
      roomName: surgery.operatingRoomName || '',
      surgeryTime: timeSrc ? dayjs(timeSrc).format('HH:mm DD/MM/YYYY') : '',
      preOpDiagnosis: surgery.preOperativeDiagnosis || '',
      postOpDiagnosis: surgery.postOperativeDiagnosis || '',
      surgeryMethod: surgery.surgeryMethod || '',
      surgeryType: surgery.surgeryNatureName || '',
      anesthesiaMethod: surgery.anesthesiaTypeName || '',
      surgeonName: surgery.requestDoctorName || '',
      surgeryDescription: surgery.description || '',
    });
  }, [open, surgery]);

  // Port của v1 executePrintSurgeryRecord (openPrintWindow thay window.open thủ công)
  const handlePrint = () => {
    if (!surgery) return;
    const values: SurgeryRecordPrintValues = {
      hospitalName: HOSPITAL_NAME,
      ...form,
      // Fix wiring v1: đưa ảnh sơ đồ đã vẽ vào ô "Lược đồ phẫu thuật/thủ thuật" của template
      surgeryDiagram: form.diagramImage
        ? `<img src="${esc(form.diagramImage)}" alt="Sơ đồ PTTT" style="max-width:100%;max-height:400px;" />`
        : '',
    };
    openPrintWindow(buildSurgeryRecordHtml(values, { requestCode: surgery.surgeryCode }), {
      focus: true,
      print: { delayMs: 500 },
      onBlocked: () => tw('Không thể mở cửa sổ in. Vui lòng cho phép popup.'),
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="printer" size={14} />
          <span>In Phiếu phẫu thuật/thủ thuật (MS: 06/BV-02)</span>
        </span>
      }
      sub={surgery ? `${surgery.surgeryCode} · ${surgery.patientName}` : undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="primary" onClick={handlePrint}>
            <TermIcon name="printer" size={12} /> In phiếu
          </Btn>
        </>
      }
    >
      <Section title="Thông tin bệnh nhân">
        <Row2 label="Họ tên người bệnh">
          <Input size="small" value={form.patientName} onChange={(e) => set('patientName', e.target.value)} />
        </Row2>
        <Row2 label="Tuổi">
          <Input size="small" value={form.age} onChange={(e) => set('age', e.target.value)} />
        </Row2>
        <Row2 label="Giới tính">
          <Input size="small" value={form.gender} onChange={(e) => set('gender', e.target.value)} />
        </Row2>
        <Row2 label="Khoa">
          <Input size="small" value={form.departmentName} onChange={(e) => set('departmentName', e.target.value)} />
        </Row2>
        <Row2 label="Buồng/Phòng mổ">
          <Input size="small" value={form.roomName} onChange={(e) => set('roomName', e.target.value)} />
        </Row2>
        <Row2 label="Giường">
          <Input size="small" value={form.bedName} onChange={(e) => set('bedName', e.target.value)} />
        </Row2>
        <Row2 label="Vào viện lúc">
          <Input size="small" value={form.admissionTime} onChange={(e) => set('admissionTime', e.target.value)} placeholder="... giờ ... phút, ngày ... tháng ... năm" />
        </Row2>
        <Row2 label="PT/TT lúc">
          <Input size="small" value={form.surgeryTime} onChange={(e) => set('surgeryTime', e.target.value)} />
        </Row2>
      </Section>

      <Section title="Chẩn đoán">
        <Row2 label="Trước PT/TT">
          <TextArea rows={2} value={form.preOpDiagnosis} onChange={(e) => set('preOpDiagnosis', e.target.value)} />
        </Row2>
        <Row2 label="Sau PT/TT">
          <TextArea rows={2} value={form.postOpDiagnosis} onChange={(e) => set('postOpDiagnosis', e.target.value)} />
        </Row2>
      </Section>

      <Section title="Thông tin phẫu thuật">
        <Row2 label="Phương pháp PT/TT">
          <TextArea rows={2} value={form.surgeryMethod} onChange={(e) => set('surgeryMethod', e.target.value)} />
        </Row2>
        <Row2 label="Loại PT/TT">
          <Input size="small" value={form.surgeryType} onChange={(e) => set('surgeryType', e.target.value)} />
        </Row2>
        <Row2 label="PP vô cảm">
          <Input size="small" value={form.anesthesiaMethod} onChange={(e) => set('anesthesiaMethod', e.target.value)} />
        </Row2>
        <Row2 label="BS phẫu thuật">
          <Input size="small" value={form.surgeonName} onChange={(e) => set('surgeonName', e.target.value)} />
        </Row2>
        <Row2 label="BS gây mê HS">
          <Input size="small" value={form.anesthesiologistName} onChange={(e) => set('anesthesiologistName', e.target.value)} />
        </Row2>
      </Section>

      <Section title="Trình tự phẫu thuật">
        <Row2 label="Mô tả trình tự">
          <TextArea rows={6} value={form.surgeryDescription} onChange={(e) => set('surgeryDescription', e.target.value)} placeholder="Mô tả chi tiết các bước phẫu thuật..." />
        </Row2>
        <Row2 label="Sơ đồ PT (M3.5)">
          <SurgeryDiagramField value={form.diagramImage} onChange={(v) => set('diagramImage', v)} />
        </Row2>
      </Section>

      <Section title="Thông tin hậu phẫu">
        <Row2 label="Dẫn lưu">
          <Input size="small" value={form.drainInfo} onChange={(e) => set('drainInfo', e.target.value)} />
        </Row2>
        <Row2 label="Ngày rút">
          <Input size="small" value={form.removalDate} onChange={(e) => set('removalDate', e.target.value)} />
        </Row2>
        <Row2 label="Ngày cắt chỉ">
          <Input size="small" value={form.stitchRemovalDate} onChange={(e) => set('stitchRemovalDate', e.target.value)} />
        </Row2>
        <Row2 label="Ghi chú khác">
          <TextArea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Row2>
      </Section>
    </ModalShell>
  );
};
