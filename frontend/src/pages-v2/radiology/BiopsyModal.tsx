import React, { useCallback, useEffect, useState } from 'react';
import { App as AntdApp, Input, Select } from 'antd';
import * as pathologyApi from '../../api/pathology';
import type { SpecimenType } from '../../api/pathology';
import type { RadiologyOrderDto } from '../../modules/radiology/api/ris';
import { ModalShell, Btn } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import { FormRow, type ApiErr } from './_shared';

// ─────────────── Modal nhập sinh thiết / GPB từ màn KQ CĐHA ───────────────

export const BiopsyModal: React.FC<{
  open: boolean;
  order: RadiologyOrderDto | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, order, onClose, onSaved }) => {
  const { message } = AntdApp.useApp();
  const [specimenTypes, setSpecimenTypes] = useState<SpecimenType[]>([]);
  const [specimenType, setSpecimenType] = useState('biopsy');
  const [specimenSite, setSpecimenSite] = useState('');
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState('');
  const [grossDescription, setGrossDescription] = useState('');
  const [microscopicDescription, setMicroscopicDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const loadTypes = useCallback(async () => {
    const types = await pathologyApi.getSpecimenTypes();
    setSpecimenTypes(types);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadTypes();
    setSpecimenType('biopsy');
    setSpecimenSite('');
    setClinicalDiagnosis(order?.diagnosis || '');
    setGrossDescription('');
    setMicroscopicDescription('');
    setDiagnosis('');
    setSavedId(null);
  }, [open, order, loadTypes]);

  const handleSave = async () => {
    if (!specimenSite.trim()) { message.warning('Nhập vị trí lấy mẫu'); return; }
    setSaving(true);
    try {
      const result = await pathologyApi.createPathologyResult({
        specimenType: specimenType as 'biopsy' | 'cytology' | 'pap' | 'frozenSection',
        grossDescription,
        microscopicDescription,
        diagnosis,
      } as Parameters<typeof pathologyApi.createPathologyResult>[0]);
      setSavedId(result.id);
      message.success('Đã lưu kết quả sinh thiết / GPB');
      onSaved();
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Không thể lưu kết quả sinh thiết');
    } finally { setSaving(false); }
  };

  const handlePrint = async () => {
    if (!savedId) { message.warning('Lưu trước khi in'); return; }
    setPrinting(true);
    try {
      const blob = await pathologyApi.printPathologyReport(savedId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { message.error('Không in được phiếu sinh thiết'); }
    finally { setPrinting(false); }
  };

  if (!order) return null;
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
        <TermIcon name="scissors" size={14} /><span>Nhập sinh thiết / GPB</span>
      </span>}
      sub={`${order.patientName} · ${order.orderCode}`}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
        <span style={{ flex: 1 }} />
        {savedId && (
          <Btn onClick={handlePrint} loading={printing} icon="print">In phiếu sinh thiết</Btn>
        )}
        <Btn variant="primary" onClick={handleSave} loading={saving} icon="check">Lưu kết quả</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <FormRow label="Loại mẫu">
          <Select
            value={specimenType}
            onChange={setSpecimenType}
            style={{ width: '100%' }}
            options={specimenTypes.map((t) => ({ label: t.name, value: t.code }))}
          />
        </FormRow>
        <FormRow label="Vị trí lấy mẫu">
          <Input
            value={specimenSite}
            onChange={(e) => setSpecimenSite(e.target.value)}
            placeholder="Mô tả vị trí lấy mẫu (vd: thùy trái tuyến giáp)"
          />
        </FormRow>
        <FormRow label="Chẩn đoán lâm sàng (nghi ngờ)">
          <Input
            value={clinicalDiagnosis}
            onChange={(e) => setClinicalDiagnosis(e.target.value)}
            placeholder="Chẩn đoán trước sinh thiết"
          />
        </FormRow>
        <FormRow label="Mô tả đại thể">
          <Input.TextArea
            rows={3}
            value={grossDescription}
            onChange={(e) => setGrossDescription(e.target.value)}
            placeholder="Mô tả màu sắc, kích thước, tính chất mẫu…"
          />
        </FormRow>
        <FormRow label="Mô tả vi thể">
          <Input.TextArea
            rows={3}
            value={microscopicDescription}
            onChange={(e) => setMicroscopicDescription(e.target.value)}
            placeholder="Đặc điểm tế bào, mô bệnh học…"
          />
        </FormRow>
        <FormRow label="Kết luận GPB">
          <Input.TextArea
            rows={3}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Chẩn đoán giải phẫu bệnh cuối cùng"
          />
        </FormRow>
      </div>
    </ModalShell>
  );
};
