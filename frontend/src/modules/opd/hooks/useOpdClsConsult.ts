import { useState } from 'react';
import {
  getPatientLabResults, getConsultationRecords, createConsultationRecord,
  createSickLeave,
  type PatientLabResultsDto, type ConsultationRecordDto,
} from '../api/examination';
import { tk, tw, te } from '../../../pages-v2/_v2kit';

interface Params {
  examId: string | null;
}

export function useOpdClsConsult({ examId }: Params) {
  const [clsOpen, setClsOpen] = useState(false);
  const [clsData, setClsData] = useState<PatientLabResultsDto | null>(null);
  const [clsLoading, setClsLoading] = useState(false);

  const [consultOpen, setConsultOpen] = useState(false);
  const [consults, setConsults] = useState<ConsultationRecordDto[]>([]);
  const [consultForm, setConsultForm] = useState({ reason: '', summary: '', conclusion: '', recommendations: '' });
  const [consultSaving, setConsultSaving] = useState(false);

  const [sickFrom, setSickFrom] = useState('');
  const [sickTo, setSickTo] = useState('');

  const openClsResults = async () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    setClsOpen(true); setClsLoading(true); setClsData(null);
    try { const r = await getPatientLabResults(examId); setClsData(r.data ?? null); }
    catch { te('Không tải được kết quả CLS'); }
    finally { setClsLoading(false); }
  };

  const openConsults = async () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    setConsultForm({ reason: '', summary: '', conclusion: '', recommendations: '' });
    setConsultOpen(true);
    try { const r = await getConsultationRecords(examId); setConsults(Array.isArray(r.data) ? r.data : []); }
    catch { setConsults([]); }
  };

  const saveConsult = async () => {
    if (!examId) return;
    if (!consultForm.reason.trim()) { tw('Cần nhập lý do hội chẩn'); return; }
    setConsultSaving(true);
    try {
      await createConsultationRecord({
        id: '', examinationId: examId,
        consultationDate: new Date().toISOString(),
        reason: consultForm.reason.trim(),
        summary: consultForm.summary.trim(),
        conclusion: consultForm.conclusion.trim(),
        recommendations: consultForm.recommendations.trim(),
        consultants: [],
      });
      tk('Đã lưu biên bản hội chẩn');
      setConsultForm({ reason: '', summary: '', conclusion: '', recommendations: '' });
      const r = await getConsultationRecords(examId);
      setConsults(Array.isArray(r.data) ? r.data : []);
    } catch { te('Lưu biên bản hội chẩn thất bại'); }
    finally { setConsultSaving(false); }
  };

  const saveSickLeave = async () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    if (!sickFrom || !sickTo) { tw('Chọn từ ngày / đến ngày'); return; }
    const days = Math.max(1, Math.round((new Date(sickTo).getTime() - new Date(sickFrom).getTime()) / 86400000) + 1);
    try {
      await createSickLeave(examId, { days, fromDate: sickFrom, toDate: sickTo });
      tk(`Đã lưu giấy nghỉ ${days} ngày`);
      setSickFrom(''); setSickTo('');
    } catch { te('Lưu giấy nghỉ thất bại'); }
  };

  return {
    clsOpen, setClsOpen, clsData, clsLoading,
    consultOpen, setConsultOpen, consults, consultForm, setConsultForm,
    consultSaving, openClsResults, openConsults, saveConsult,
    sickFrom, setSickFrom, sickTo, setSickTo, saveSickLeave,
  };
}
