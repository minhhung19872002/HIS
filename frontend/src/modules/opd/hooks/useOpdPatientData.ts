import { useState, useCallback, useRef } from 'react';
import {
  examinationApi,
  getPatientAllergies, getInjuryInfo,
  type RoomPatientListDto, type IcdCodeFullDto, type ServiceDto,
  type ServiceOrderFullDto, type DiagnosisFullDto, type AllergyDto, type InjuryInfoDto,
} from '../api/examination';
import { useAbbrExpansion } from '../../../utils/abbrExpand';
import { type Vitals, type DxRow, type OrderRow, OPD_ABBR_SCOPES } from '../pages/_shared';

interface Params {
  setLeftOpen: (v: boolean) => void;
  setSelPt: React.Dispatch<React.SetStateAction<RoomPatientListDto | null>>;
  setAutoSavedTs: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useOpdPatientData({ setLeftOpen, setSelPt, setAutoSavedTs }: Params) {
  const [vitals, setVitals] = useState<Vitals>({});
  const [history, setHistory] = useState('');
  const [pastHist, setPastHist] = useState('');
  const [familyHist, setFamilyHist] = useState('');
  const [allergyHist, setAllergyHist] = useState('');
  const [medHist, setMedHist] = useState('');
  const [allergies, setAllergies] = useState<AllergyDto[]>([]);
  const [injuryInfo, setInjuryInfo] = useState<Partial<InjuryInfoDto>>({});
  const [exam, setExam] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [diagnoses, setDx] = useState<DxRow[]>([]);
  const [orders, setOrd] = useState<OrderRow[]>([]);
  const expandAbbr = useAbbrExpansion(OPD_ABBR_SCOPES);

  const [icdQ, setIcdQ] = useState('');
  const [icdResults, setIcdResults] = useState<IcdCodeFullDto[]>([]);
  const [svcQ, setSvcQ] = useState('');
  const [svcResults, setSvcResults] = useState<ServiceDto[]>([]);

  // Guard chống race khi đổi BN nhanh (#374 patient-safety)
  const selectReqRef = useRef(0);
  const selectPatient = useCallback(async (q: RoomPatientListDto) => {
    const reqId = ++selectReqRef.current;
    setSelPt(q);
    setLeftOpen(false);
    setVitals({}); setHistory(''); setPastHist(''); setFamilyHist(''); setAllergyHist(''); setMedHist('');
    setIcdQ(''); setIcdResults([]); setSvcQ(''); setSvcResults([]); // #439: ô tìm ICD/DV không giữ text của BN trước
    setAllergies([]); setInjuryInfo({}); setExam(''); setConclusion(''); setDx([]); setOrd([]);
    // #439: reset luôn ô tìm ICD/dịch vụ — trước đây từ khoá của BN trước còn sót lại khi đổi BN
    setIcdQ(''); setIcdResults([]); setSvcQ(''); setSvcResults([]);
    setAutoSavedTs(null);
    const id = q.examinationId;
    const [v, mi, pe, dx, so, al, inj] = await Promise.allSettled([
      examinationApi.getVitalSigns(id),
      examinationApi.getMedicalInterview(id),
      examinationApi.getPhysicalExamination(id),
      examinationApi.getDiagnoses(id),
      examinationApi.getServiceOrders(id),
      getPatientAllergies(q.patientId),
      getInjuryInfo(id),
    ]);
    if (selectReqRef.current !== reqId) return;
    if (v.status === 'fulfilled' && v.value.data) {
      const d = v.value.data;
      setVitals({ pulse: d.pulse, temperature: d.temperature, systolicBP: d.systolicBP, diastolicBP: d.diastolicBP, respiratoryRate: d.respiratoryRate, spO2: d.spO2, weight: d.weight, height: d.height });
    }
    if (mi.status === 'fulfilled' && mi.value.data) {
      const m = mi.value.data;
      setHistory(m.historyOfPresentIllness || m.chiefComplaint || '');
      setPastHist(m.pastMedicalHistory || '');
      setFamilyHist(m.familyHistory || '');
      setAllergyHist(m.allergyHistory || '');
      setMedHist(m.medicationHistory || '');
    }
    const draft = (() => { try { return JSON.parse(localStorage.getItem(`opd-as:${id}`) || 'null'); } catch { return null; } })();
    if (draft) {
      if (draft.history) setHistory((v) => v || draft.history);
      if (draft.exam) setExam((v) => v || draft.exam);
      if (draft.conclusion) setConclusion((v) => v || draft.conclusion);
      if (draft.medHist) setMedHist((v) => v || draft.medHist);
    }
    if (al.status === 'fulfilled' && Array.isArray(al.value.data)) {
      setAllergies((al.value.data as AllergyDto[]).filter((a) => a.isActive !== false));
    }
    if (pe.status === 'fulfilled' && pe.value.data) setExam(pe.value.data.generalAppearance || '');
    if (dx.status === 'fulfilled' && Array.isArray(dx.value.data)) {
      setDx((dx.value.data as DiagnosisFullDto[]).map((x) => ({ icdCode: x.icdCode, icdName: x.icdName, isPrimary: x.isPrimary })));
    }
    if (so.status === 'fulfilled' && Array.isArray(so.value.data)) {
      setOrd((so.value.data as ServiceOrderFullDto[]).map((x) => ({ serviceId: x.serviceId, code: x.serviceCode, name: x.serviceName, qty: x.quantity, unitPrice: x.unitPrice })));
    }
    if (inj.status === 'fulfilled' && inj.value.data) {
      setInjuryInfo(inj.value.data as InjuryInfoDto);
    }
  }, [setLeftOpen, setSelPt, setAutoSavedTs]);

  const searchIcd = useCallback(async (q: string) => {
    setIcdQ(q);
    if (!q || q.length < 2) { setIcdResults([]); return; }
    try { const r = await examinationApi.searchIcdCodes(q, undefined, 20); setIcdResults(Array.isArray(r.data) ? r.data : []); }
    catch { setIcdResults([]); }
  }, []);
  const addIcd = (i: IcdCodeFullDto) => {
    setDx((p) => p.some((x) => x.icdCode === i.code) ? p : [...p, { icdCode: i.code, icdName: i.name, isPrimary: p.length === 0 }]);
    setIcdQ(''); setIcdResults([]);
  };
  const setPrimary = (idx: number) => setDx((p) => p.map((x, i) => ({ ...x, isPrimary: i === idx })));
  const removeIcd = (idx: number) => setDx((p) => {
    const next = p.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((x) => x.isPrimary)) next[0].isPrimary = true;
    return [...next];
  });

  const searchSvc = useCallback(async (q: string) => {
    setSvcQ(q);
    if (!q || q.length < 2) { setSvcResults([]); return; }
    try { const r = await examinationApi.searchServices(q, 20); setSvcResults(Array.isArray(r.data) ? r.data : []); }
    catch { setSvcResults([]); }
  }, []);
  const addSvc = (s: ServiceDto) => {
    setOrd((p) => p.some((x) => x.serviceId === s.id) ? p : [...p, { serviceId: s.id, code: s.code, name: s.name, qty: 1, unitPrice: s.unitPrice }]);
    setSvcQ(''); setSvcResults([]);
  };
  const updateQty = (i: number, q: number) => setOrd((p) => p.map((x, j) => (j === i ? { ...x, qty: q } : x)));
  const removeSvc = (i: number) => setOrd((p) => p.filter((_, j) => j !== i));

  return {
    vitals, setVitals, history, setHistory, pastHist, setPastHist,
    familyHist, setFamilyHist, allergyHist, setAllergyHist, medHist, setMedHist,
    allergies, injuryInfo, setInjuryInfo, exam, setExam, conclusion, setConclusion,
    diagnoses, setDx, orders, setOrd, expandAbbr,
    icdQ, searchIcd, icdResults, addIcd, setPrimary, removeIcd,
    svcQ, searchSvc, svcResults, addSvc, updateQty, removeSvc,
    selectPatient,
  };
}
