import { useRef, useEffect } from 'react';
import { examinationApi } from '../api/examination';
import type { Vitals } from '../pages/_shared';

interface Params {
  examId: string | null;
  history: string;
  pastHist: string;
  familyHist: string;
  allergyHist: string;
  medHist: string;
  exam: string;
  conclusion: string;
  vitals: Vitals;
  setAutoSavedTs: (ts: number) => void;
  setStockOpen: (v: boolean) => void;
}

/** Chu kỳ auto-save lên server (ms) — parity v1 OPD. */
const SERVER_AUTOSAVE_MS = 30_000;

export function useOpdAutoSave({
  examId, history, pastHist, familyHist, allergyHist, medHist, exam, conclusion, vitals,
  setAutoSavedTs, setStockOpen,
}: Params) {
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!examId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(`opd-as:${examId}`, JSON.stringify({ history, pastHist, familyHist, allergyHist, medHist, exam, conclusion }));
        setAutoSavedTs(Date.now());
      } catch { /* localStorage full — silently skip */ }
    }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [examId, history, pastHist, familyHist, allergyHist, medHist, exam, conclusion, setAutoSavedTs]);

  // ── Auto-save lên SERVER mỗi 30s (#433) ──────────────────────────────────
  // Chỉ ghi phần đã có dữ liệu, im lặng khi lỗi (không chặn khám). Ref giữ
  // dữ liệu mới nhất để interval không phải tạo lại mỗi lần gõ phím.
  const latest = useRef({ examId, history, pastHist, familyHist, allergyHist, medHist, exam, vitals });
  latest.current = { examId, history, pastHist, familyHist, allergyHist, medHist, exam, vitals };

  useEffect(() => {
    if (!examId) return;
    const timer = setInterval(() => {
      const s = latest.current;
      const id = s.examId;
      if (!id) return;
      void (async () => {
        try {
          if (Object.values(s.vitals).some((v) => v !== undefined && v !== null)) {
            await examinationApi.updateVitalSigns(id, { ...s.vitals, measuredAt: new Date().toISOString() });
          }
          if (s.history || s.pastHist || s.familyHist || s.allergyHist || s.medHist) {
            await examinationApi.updateMedicalInterview(id, {
              historyOfPresentIllness: s.history, pastMedicalHistory: s.pastHist,
              familyHistory: s.familyHist, allergyHistory: s.allergyHist, medicationHistory: s.medHist,
            });
          }
          if (s.exam) {
            await examinationApi.updatePhysicalExamination(id, { generalAppearance: s.exam });
          }
          setAutoSavedTs(Date.now());
        } catch { /* auto-save im lặng — bác sĩ vẫn lưu tay được */ }
      })();
    }, SERVER_AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [examId, setAutoSavedTs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F10' && examId) { e.preventDefault(); setStockOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [examId, setStockOpen]);
}
