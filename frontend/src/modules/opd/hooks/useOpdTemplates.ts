import { useState, useCallback, useEffect } from 'react';
import {
  getOutpatientRecordTemplates, getOutpatientRecordTemplate,
  saveOutpatientRecordTemplate, deleteOutpatientRecordTemplate,
  type OutpatientRecordTemplateDto,
} from '../../patient/api/clinicalNarratives';
import { tk, tw, te } from '../../../pages-v2/_v2kit';
import type { DxRow } from '../pages/_shared';

interface Params {
  history: string;
  exam: string;
  conclusion: string;
  diagnoses: DxRow[];
  setHistory: React.Dispatch<React.SetStateAction<string>>;
  setExam: React.Dispatch<React.SetStateAction<string>>;
  setConclusion: React.Dispatch<React.SetStateAction<string>>;
}

export function useOpdTemplates({
  history, exam, conclusion, diagnoses, setHistory, setExam, setConclusion,
}: Params) {
  const [tpls, setTpls] = useState<OutpatientRecordTemplateDto[]>([]);
  const [tplManageOpen, setTplManageOpen] = useState(false);
  const [tplSaveOpen, setTplSaveOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplBusy, setTplBusy] = useState(false);

  const loadTpls = useCallback(() => {
    getOutpatientRecordTemplates().then((r) => setTpls(Array.isArray(r.data) ? r.data : [])).catch((e) => { console.warn('[async] tải dữ liệu phụ thất bại:', e); });
  }, []);
  useEffect(() => { loadTpls(); }, [loadTpls]);

  const applyTpl = async (id: string) => {
    if (!id) return;
    try {
      const { data: t } = await getOutpatientRecordTemplate(id);
      if (!t) return;
      const histParts = [t.chiefComplaint, t.medicalHistory].filter(Boolean);
      if (histParts.length) setHistory(histParts.join('\n'));
      const examParts = [
        t.physicalExamination, t.generalExamBody,
        t.cardiovascularExam && `Tim mạch: ${t.cardiovascularExam}`,
        t.respiratoryExam && `Hô hấp: ${t.respiratoryExam}`,
        t.giExam && `Tiêu hóa: ${t.giExam}`,
        t.neuroExam && `Thần kinh: ${t.neuroExam}`,
      ].filter(Boolean);
      if (examParts.length) setExam(examParts.join('\n'));
      const conclParts = [t.conclusion, t.treatmentPlan && `Hướng điều trị: ${t.treatmentPlan}`, t.followUpNotes].filter(Boolean);
      if (conclParts.length) setConclusion(conclParts.join('\n'));
      tk(`Đã áp mẫu "${t.templateName}"`);
    } catch { tw('Không tải được mẫu HSBA'); }
  };

  const saveCurrentAsTpl = async () => {
    if (!tplName.trim()) { tw('Nhập tên mẫu'); return; }
    setTplBusy(true);
    try {
      await saveOutpatientRecordTemplate({
        templateCode: `OPD-${Date.now().toString(36).toUpperCase()}`,
        templateName: tplName.trim(),
        diagnosisCode: diagnoses.find((d) => d.isPrimary)?.icdCode || diagnoses[0]?.icdCode,
        diagnosisName: diagnoses.find((d) => d.isPrimary)?.icdName || diagnoses[0]?.icdName,
        medicalHistory: history || undefined,
        physicalExamination: exam || undefined,
        conclusion: conclusion || undefined,
        isPublic: true,
      });
      tk('Đã lưu mẫu HSBA');
      setTplSaveOpen(false); setTplName('');
      loadTpls();
    } catch { te('Lưu mẫu thất bại'); } finally { setTplBusy(false); }
  };

  const removeTpl = async (id: string) => {
    setTplBusy(true);
    try { await deleteOutpatientRecordTemplate(id); tk('Đã xóa mẫu'); loadTpls(); }
    catch { te('Xóa mẫu thất bại'); } finally { setTplBusy(false); }
  };

  return {
    tpls, tplManageOpen, setTplManageOpen,
    tplSaveOpen, setTplSaveOpen, tplName, setTplName,
    tplBusy, applyTpl, saveCurrentAsTpl, removeTpl,
  };
}
