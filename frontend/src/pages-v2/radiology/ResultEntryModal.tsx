import React, { useEffect, useState } from 'react';
import { App as AntdApp, Input } from 'antd';
import * as risApi from '../../modules/radiology/api/ris';
import type { RadiologyOrderDto, RadiologyResultTemplateDto } from '../../modules/radiology/api/ris';
import { useAbbrExpansion } from '../../utils/abbrExpand';
import { ABBREVIATION_SCOPES } from '../../api/abbreviation';
import { ModalShell, Btn, AbSelect } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import { SurgeryReportModal } from '../shared/SurgeryReportModal';
import { FormRow, printResultBlob, type ApiErr } from './_shared';
import { SignResultModal } from './SignResultModal';
import { BiopsyModal } from './BiopsyModal';

/** Scope viết tắt CĐHA — khai báo ngoài component để tránh refetch mỗi render. */
const RIS_ABBR_SCOPES = [ABBREVIATION_SCOPES.RADIOLOGY] as const;

export const ResultEntryModal: React.FC<{
  open: boolean;
  order: RadiologyOrderDto | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, order, onClose, onSaved }) => {
  const { message } = AntdApp.useApp();
  const item = order?.items?.[0];
  const [templates, setTemplates] = useState<RadiologyResultTemplateDto[]>([]);
  const [tplId, setTplId] = useState('');
  const [description, setDescription] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [note, setNote] = useState('');
  const [resultId, setResultId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  // PTTT tường trình (G-33) — sinh thiết / thủ thuật dưới hướng dẫn CĐHA
  const [ptttOpen, setPtttOpen] = useState(false);
  // Sinh thiết / GPB (Prompt 8 Đợt 2)
  const [biopsyOpen, setBiopsyOpen] = useState(false);

  // Bung viết tắt inline (MQSoft F2 style) — không cần API call riêng.
  // Hook nạp từ điển một lần và trả hàm expand() chạy local.
  const expand = useAbbrExpansion(RIS_ABBR_SCOPES);

  // Nạp mẫu KQ theo dịch vụ + prefill nếu đã có KQ cũ.
  useEffect(() => {
    const it = order?.items?.[0];
    if (!open || !it) return;
    setTplId(''); setDescription(''); setConclusion(''); setNote(''); setResultId(null);
    if (it.serviceId) {
      risApi.getResultTemplatesByService(it.serviceId)
        .then((r) => setTemplates(Array.isArray(r.data) ? r.data : []))
        .catch(() => setTemplates([]));
    } else {
      setTemplates([]);
    }
    if (it.hasResult) {
      risApi.getRadiologyResult(it.id)
        .then((r) => {
          const d = r.data;
          if (!d) return;
          setResultId(d.id);
          setDescription(d.description || '');
          setConclusion(d.conclusion || '');
          setNote(d.note || '');
        })
        .catch(() => { /* chưa có KQ — bỏ qua */ });
    }
  }, [open, order]);

  const applyTemplate = (id: string) => {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (t.descriptionTemplate) setDescription(t.descriptionTemplate);
    if (t.conclusionTemplate) setConclusion(t.conclusionTemplate);
    if (t.noteTemplate) setNote(t.noteTemplate);
  };

  // Lưu (enter result) — trả resultId để duyệt/in.
  const persist = async (): Promise<string | null> => {
    if (!item) return null;
    if (!description.trim() && !conclusion.trim()) {
      message.warning('Nhập mô tả hoặc kết luận trước khi lưu');
      return null;
    }
    const res = await risApi.enterRadiologyResult({
      orderItemId: item.id,
      templateId: tplId || undefined,
      description: description.trim() || undefined,
      conclusion: conclusion.trim() || undefined,
      note: note.trim() || undefined,
    });
    const id = res.data?.id || resultId;
    if (id) setResultId(id);
    return id ?? null;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const id = await persist();
      if (id) { message.success('Đã lưu báo cáo'); onSaved(); onClose(); }
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Không thể lưu báo cáo');
    } finally { setSaving(false); }
  };

  const handleSaveApprove = async () => {
    setApproving(true);
    try {
      const id = await persist();
      if (!id) return;
      await risApi.finalApproveResult(id, { resultId: id, isFinalApproval: true });
      message.success('Đã lưu & duyệt báo cáo');
      onSaved(); onClose();
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Không thể duyệt báo cáo');
    } finally { setApproving(false); }
  };

  const handlePrint = async () => {
    if (!resultId) return;
    setPrinting(true);
    try { await printResultBlob(resultId); }
    catch { message.error('Không in được phiếu'); }
    finally { setPrinting(false); }
  };

  if (!order || !item) return null;
  const busy = saving || approving;

  return (
    <>
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
        <TermIcon name="file-text" size={14} />
        <span>Nhập kết quả CĐHA</span>
      </span>}
      sub={`${order.patientName} · ${item.serviceName}`}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
        <Btn
          variant="ghost"
          onClick={() => setBiopsyOpen(true)}
          title="Nhập kết quả sinh thiết / giải phẫu bệnh (GPB) liên quan ca CĐHA"
        >
          <TermIcon name="scissors" size={12} /> Sinh thiết / GPB
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => setPtttOpen(true)}
          title="Tường trình phẫu thuật / thủ thuật dưới hướng dẫn CĐHA (sinh thiết…)"
        >
          <TermIcon name="scissors" size={12} /> Tường trình PTTT
        </Btn>
        <span style={{ flex: 1 }} />
        {resultId && (
          <Btn onClick={() => setSignOpen(true)} disabled={busy}>
            <TermIcon name="shield" size={12} /> Ký số
          </Btn>
        )}
        {resultId && (
          <Btn onClick={handlePrint} loading={printing} icon="print">In phiếu</Btn>
        )}
        <Btn onClick={handleSaveDraft} loading={saving} disabled={approving}>Lưu nháp</Btn>
        <Btn variant="primary" onClick={handleSaveApprove} loading={approving} disabled={saving} icon="check">Lưu &amp; Duyệt</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <FormRow label="Mẫu kết quả">
          <AbSelect
            options={templates}
            fieldNames={{ value: 'id', label: 'name' }}
            value={tplId}
            onChange={applyTemplate}
            placeholder={templates.length ? '— Chọn mẫu để điền nhanh —' : '(Không có mẫu)'}
          />
        </FormRow>
        <FormRow
          label="Mô tả hình ảnh"
          extra={
            <span style={{ fontSize: 10.5, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>
              <TermIcon name="zap" size={10} /> gõ viết tắt + Space để bung
            </span>
          }
        >
          <Input.TextArea
            rows={6}
            value={description}
            onChange={(e) => setDescription(expand(e.target.value))}
            placeholder="Nhập mô tả chi tiết hình ảnh…"
            disabled={busy}
          />
        </FormRow>
        <FormRow
          label="Kết luận"
          extra={
            <span style={{ fontSize: 10.5, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>
              <TermIcon name="zap" size={10} /> gõ viết tắt + Space để bung
            </span>
          }
        >
          <Input.TextArea
            rows={4}
            value={conclusion}
            onChange={(e) => setConclusion(expand(e.target.value))}
            placeholder="Nhập kết luận…"
            disabled={busy}
          />
        </FormRow>
        <FormRow label="Đề nghị / Ghi chú">
          <Input.TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập đề nghị (nếu có)…" disabled={busy} />
        </FormRow>
      </div>
    </ModalShell>
    <SignResultModal
      open={signOpen}
      reportId={resultId}
      onClose={() => setSignOpen(false)}
      onSigned={onSaved}
    />
    {/* PTTT tường trình (G-33): biopsy / procedure under imaging guidance */}
    <SurgeryReportModal
      open={ptttOpen}
      onClose={() => setPtttOpen(false)}
      examinationId={order?.visitId ?? null}
      patientName={order?.patientName}
      patientCode={order?.patientCode}
      prefillServiceName={item?.serviceName}
      prefillDiagnosis={order?.diagnosis}
    />
    {/* Sinh thiết / GPB (Prompt 8 Đợt 2) */}
    <BiopsyModal
      open={biopsyOpen}
      order={order}
      onClose={() => setBiopsyOpen(false)}
      onSaved={() => { /* không cần reload — KQ GPB là entity riêng */ }}
    />
    </>
  );
};
