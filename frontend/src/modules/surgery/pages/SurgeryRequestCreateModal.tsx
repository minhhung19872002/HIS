/**
 * SurgeryRequestCreateModal — Tạo yêu cầu phẫu thuật / thủ thuật (port v1 pages/Surgery.tsx → v2, #409).
 *
 * Business logic VERBATIM từ v1 `handleRequestSubmit`: DTO mapping (surgeryClass: 2,
 * surgeryNature: priority || 1, anesthesiaType || 2, notes = `Bệnh nhân: <mã> - <tên>`),
 * async search (hồ sơ bệnh án / dịch vụ PT / mã ICD, min 2 ký tự, verbatim option label).
 *
 * Khác v1 (đã dọn nợ trước khi port — ghi rõ trong notes #409):
 * - surgeryType: v1 gửi CHUỖI ('Phẫu thuật lớn'…) vào field number của BE (bug binding 400)
 *   → dùng giá trị số đúng contract BE (1-Phẫu thuật, 2-Thủ thuật); fallback `|| 1` giữ verbatim.
 * - Bỏ 2 field v1 KHÔNG BAO GIỜ gửi lên BE (chỉ echo local-state rồi mất): requestingDoctorName,
 *   estimatedDuration (duration được nhập thật ở bước Lên lịch — estimatedDurationMinutes).
 */
import React, { useState } from 'react';
import { Input, Select } from 'antd';
import { ModalShell, Btn, AbSelect, tk, tw } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { Section, Row2 } from './surgery-modals/_shared';
import {
  createSurgeryRequest,
  searchIcdCodes,
  searchServices,
  type CreateSurgeryRequestDto,
  type IcdCodeDto,
  type ServiceDto,
} from '../api/surgery';
import { searchExaminations, type ExaminationDto } from '../../opd/api/examination';

const { TextArea } = Input;

export interface SurgeryRequestCreateModalProps {
  open: boolean;
  onClose: () => void;
  /** Gọi sau khi tạo thành công để trang reload danh sách. */
  onCreated: () => void;
}

interface RequestForm {
  patientCode: string;
  patientName: string;
  medicalRecordId?: string;
  surgeryServiceId?: string;
  surgeryType?: number;
  priority?: number;
  plannedProcedure: string;
  preOpDiagnosis: string;
  preOperativeIcdCode?: string;
  anesthesiaType?: number;
}

const EMPTY_FORM: RequestForm = {
  patientCode: '',
  patientName: '',
  plannedProcedure: '',
  preOpDiagnosis: '',
};

interface SelectOpt { value: string; label: string }

export const SurgeryRequestCreateModal: React.FC<SurgeryRequestCreateModalProps> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Async-search option states (verbatim v1)
  const [medicalRecordOptions, setMedicalRecordOptions] = useState<SelectOpt[]>([]);
  const [surgeryServiceOptions, setSurgeryServiceOptions] = useState<SelectOpt[]>([]);
  const [icdCodeOptions, setIcdCodeOptions] = useState<SelectOpt[]>([]);
  const [searchingMedicalRecords, setSearchingMedicalRecords] = useState(false);
  const [searchingSurgeryServices, setSearchingSurgeryServices] = useState(false);
  const [searchingIcdCodes, setSearchingIcdCodes] = useState(false);

  const set = <K extends keyof RequestForm>(k: K, v: RequestForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm(EMPTY_FORM);
    setMedicalRecordOptions([]);
    setSurgeryServiceOptions([]);
    setIcdCodeOptions([]);
  };

  // Search medical records by keyword (patient code/name) — verbatim v1:
  // value = examination id (giữ nguyên hành vi v1; xem smoke-test note #409).
  const handleSearchMedicalRecords = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setMedicalRecordOptions([]);
      return;
    }
    setSearchingMedicalRecords(true);
    try {
      const response = await searchExaminations({ keyword, pageIndex: 1, pageSize: 20 });
      if (response.data?.items) {
        setMedicalRecordOptions(response.data.items.map((item: ExaminationDto) => ({
          value: item.id,
          label: `${item.patientCode} - ${item.patientName} (${item.id.substring(0, 8)})`,
        })));
      }
    } catch (error) {
      console.warn('Error searching medical records:', error);
    } finally {
      setSearchingMedicalRecords(false);
    }
  };

  // Search surgery services by keyword — verbatim v1 (serviceType=1 for surgery services)
  const handleSearchSurgeryServices = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setSurgeryServiceOptions([]);
      return;
    }
    setSearchingSurgeryServices(true);
    try {
      const response = await searchServices(keyword, 1);
      if (response.data) {
        setSurgeryServiceOptions(response.data.map((svc: ServiceDto) => ({
          value: svc.id,
          label: `${svc.code} - ${svc.name} (${svc.unitPrice?.toLocaleString() || 0} đ)`,
        })));
      }
    } catch (error) {
      console.warn('Error searching surgery services:', error);
    } finally {
      setSearchingSurgeryServices(false);
    }
  };

  // Search ICD codes by keyword — verbatim v1
  const handleSearchIcdCodes = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setIcdCodeOptions([]);
      return;
    }
    setSearchingIcdCodes(true);
    try {
      const response = await searchIcdCodes(keyword);
      if (response.data) {
        setIcdCodeOptions(response.data.map((icd: IcdCodeDto) => ({
          value: icd.code,
          label: `${icd.code} - ${icd.name}`,
        })));
      }
    } catch (error) {
      console.warn('Error searching ICD codes:', error);
    } finally {
      setSearchingIcdCodes(false);
    }
  };

  const handleSubmit = async () => {
    // Required-field validation — verbatim thông điệp rule v1
    if (!form.patientCode.trim()) { tw('Vui lòng nhập mã bệnh nhân'); return; }
    if (!form.patientName.trim()) { tw('Vui lòng nhập tên bệnh nhân'); return; }
    if (!form.medicalRecordId) { tw('Vui lòng chọn hồ sơ bệnh án'); return; }
    if (!form.surgeryServiceId) { tw('Vui lòng chọn dịch vụ phẫu thuật'); return; }
    if (!form.surgeryType) { tw('Vui lòng chọn loại phẫu thuật'); return; }
    if (!form.priority) { tw('Vui lòng chọn độ ưu tiên'); return; }
    if (!form.plannedProcedure.trim()) { tw('Vui lòng nhập phương pháp phẫu thuật'); return; }
    if (!form.preOpDiagnosis.trim()) { tw('Vui lòng nhập chẩn đoán'); return; }
    if (!form.preOperativeIcdCode) { tw('Vui lòng chọn mã ICD'); return; }

    setSaving(true);
    try {
      // Build API request DTO — VERBATIM v1 handleRequestSubmit
      const dto: CreateSurgeryRequestDto = {
        medicalRecordId: form.medicalRecordId,
        surgeryServiceId: form.surgeryServiceId,
        surgeryType: form.surgeryType || 1,
        surgeryClass: 2, // Loại 1
        surgeryNature: form.priority || 1,
        preOperativeDiagnosis: form.preOpDiagnosis,
        preOperativeIcdCode: form.preOperativeIcdCode || '',
        surgeryMethod: form.plannedProcedure,
        anesthesiaType: form.anesthesiaType || 2,
        anesthesiaMethod: '',
        scheduledDate: undefined,
        operatingRoomId: undefined,
        notes: `Bệnh nhân: ${form.patientCode} - ${form.patientName}`,
      };

      await createSurgeryRequest(dto);
      tk('Tạo yêu cầu phẫu thuật thành công');
      reset();
      onCreated();
      onClose();
    } catch (error) {
      console.warn('Error creating surgery request:', error);
      tw('Có lỗi xảy ra khi tạo yêu cầu phẫu thuật');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={() => { reset(); onClose(); }}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="plus" size={14} />
          <span>Tạo yêu cầu phẫu thuật</span>
        </span>
      }
      footer={
        <>
          <Btn variant="ghost" onClick={() => { reset(); onClose(); }}>Hủy</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="primary" loading={saving} onClick={() => { void handleSubmit(); }}>
            <TermIcon name="plus" size={12} /> Tạo yêu cầu
          </Btn>
        </>
      }
    >
      <Section title="Bệnh nhân">
        <Row2 label="Mã bệnh nhân">
          <Input
            value={form.patientCode}
            onChange={(e) => set('patientCode', e.target.value)}
            placeholder="Nhập hoặc tìm mã bệnh nhân"
            size="small"
          />
        </Row2>
        <Row2 label="Tên bệnh nhân">
          <Input
            value={form.patientName}
            onChange={(e) => set('patientName', e.target.value)}
            placeholder="Tên bệnh nhân"
            size="small"
          />
        </Row2>
        <Row2 label="Hồ sơ bệnh án">
          <Select
            showSearch
            filterOption={false}
            placeholder="Tìm theo mã BN, tên bệnh nhân..."
            onSearch={(kw) => { void handleSearchMedicalRecords(kw); }}
            loading={searchingMedicalRecords}
            notFoundContent={searchingMedicalRecords ? 'Đang tìm...' : 'Nhập ít nhất 2 ký tự'}
            options={medicalRecordOptions}
            allowClear
            size="small"
            style={{ width: '100%' }}
            value={form.medicalRecordId}
            onChange={(v) => set('medicalRecordId', v)}
          />
        </Row2>
      </Section>

      <Section title="Phẫu thuật / thủ thuật">
        <Row2 label="Dịch vụ PT">
          <Select
            showSearch
            filterOption={false}
            placeholder="Tìm theo mã hoặc tên dịch vụ..."
            onSearch={(kw) => { void handleSearchSurgeryServices(kw); }}
            loading={searchingSurgeryServices}
            notFoundContent={searchingSurgeryServices ? 'Đang tìm...' : 'Nhập ít nhất 2 ký tự'}
            options={surgeryServiceOptions}
            allowClear
            size="small"
            style={{ width: '100%' }}
            value={form.surgeryServiceId}
            onChange={(v) => set('surgeryServiceId', v)}
          />
        </Row2>
        <Row2 label="Loại PT/TT">
          <AbSelect
            options={[
              { value: 1, label: 'Phẫu thuật' },
              { value: 2, label: 'Thủ thuật' },
            ]}
            value={form.surgeryType ?? ''}
            onChange={(v) => set('surgeryType', v ? Number(v) : undefined)}
            placeholder="Chọn loại phẫu thuật"
          />
        </Row2>
        <Row2 label="Độ ưu tiên">
          <AbSelect
            options={[
              { value: 1, label: 'Bình thường' },
              { value: 2, label: 'Khẩn' },
              { value: 3, label: 'Cấp cứu' },
            ]}
            value={form.priority ?? ''}
            onChange={(v) => set('priority', v ? Number(v) : undefined)}
            placeholder="Chọn độ ưu tiên"
          />
        </Row2>
        <Row2 label="Phương pháp PT">
          <Input
            value={form.plannedProcedure}
            onChange={(e) => set('plannedProcedure', e.target.value)}
            placeholder="Nhập phương pháp phẫu thuật"
            size="small"
          />
        </Row2>
        <Row2 label="Loại gây mê">
          <AbSelect
            options={[
              { value: 1, label: 'Gây mê toàn thân' },
              { value: 2, label: 'Gây tê tủy sống' },
              { value: 3, label: 'Gây tê tại chỗ' },
              { value: 4, label: 'Khác' },
            ]}
            value={form.anesthesiaType ?? ''}
            onChange={(v) => set('anesthesiaType', v ? Number(v) : undefined)}
            placeholder="Chọn loại gây mê"
          />
        </Row2>
      </Section>

      <Section title="Chẩn đoán">
        <Row2 label="CĐ trước mổ">
          <TextArea
            rows={2}
            value={form.preOpDiagnosis}
            onChange={(e) => set('preOpDiagnosis', e.target.value)}
            placeholder="Nhập chẩn đoán trước mổ"
          />
        </Row2>
        <Row2 label="Mã ICD">
          <Select
            showSearch
            filterOption={false}
            placeholder="Tìm mã ICD..."
            onSearch={(kw) => { void handleSearchIcdCodes(kw); }}
            loading={searchingIcdCodes}
            notFoundContent={searchingIcdCodes ? 'Đang tìm...' : 'Nhập ít nhất 2 ký tự'}
            options={icdCodeOptions}
            allowClear
            size="small"
            style={{ width: '100%' }}
            value={form.preOperativeIcdCode}
            onChange={(v) => set('preOperativeIcdCode', v)}
          />
        </Row2>
      </Section>
    </ModalShell>
  );
};
