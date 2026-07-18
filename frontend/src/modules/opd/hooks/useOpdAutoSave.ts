import { useRef, useEffect } from 'react';

interface Params {
  examId: string | null;
  history: string;
  pastHist: string;
  familyHist: string;
  allergyHist: string;
  medHist: string;
  exam: string;
  conclusion: string;
  setAutoSavedTs: (ts: number) => void;
  setStockOpen: (v: boolean) => void;
}

export function useOpdAutoSave({
  examId, history, pastHist, familyHist, allergyHist, medHist, exam, conclusion,
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F10' && examId) { e.preventDefault(); setStockOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [examId, setStockOpen]);
}
