/* useOpdCds — hỗ trợ quyết định lâm sàng (CDS) cho OpdEditor v2 (#433).
 * Nguồn: /cds/* (suggest-diagnoses · alerts · early-warning-score) — BỔ TRỢ,
 * không chặn luồng khám: mọi lỗi đều nuốt im lặng (fail-safe, đúng hành vi v1).
 * Cảnh báo "còn thuốc chưa lĩnh" đọc từ đơn thuốc của lượt khám hiện tại.
 */

import { useState, useCallback, useEffect } from 'react';
import cdsApi from '../../patient/api/clinicalDecisionSupport';
import type {
  DiagnosisSuggestion, ClinicalAlert, EarlyWarningScore,
} from '../../patient/api/clinicalDecisionSupport';
import { examinationApi, type RoomPatientListDto } from '../api/examination';
import type { Vitals } from '../pages/_shared';

interface Params {
  examId: string | null;
  selPt: RoomPatientListDto | null;
  vitals: Vitals;
  history: string;
  exam: string;
}

/** Tách chuỗi bệnh sử / khám thực thể thành danh sách triệu chứng - dấu hiệu (như v1). */
const splitClinicalText = (text: string): string[] =>
  text.split(/[;,.\n]/).map((s) => s.trim()).filter(Boolean);

export function useOpdCds({ examId, selPt, vitals, history, exam }: Params) {
  const [suggestions, setSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [ews, setEws] = useState<EarlyWarningScore | null>(null);
  const [cdsLoading, setCdsLoading] = useState(false);
  const [hasActiveMeds, setHasActiveMeds] = useState(false);

  // Đổi bệnh nhân → xoá kết quả CDS của BN trước (tránh hiển thị nhầm BN)
  useEffect(() => {
    setSuggestions([]); setAlerts([]); setEws(null); setHasActiveMeds(false);
  }, [examId]);

  // Cảnh báo thuốc đang dùng chưa lĩnh (parity v1 NangCap4)
  useEffect(() => {
    if (!examId) return;
    let alive = true;
    void (async () => {
      try {
        const r = await examinationApi.getPrescriptions(examId);
        const rows = Array.isArray(r.data) ? r.data : [];
        // Status: 0-Chờ duyệt · 1-Đã duyệt · 2-Đã phát · 3-Hủy → chưa lĩnh = 0|1
        const active = rows.some((rx) => rx.status === 0 || rx.status === 1);
        if (alive) setHasActiveMeds(active);
      } catch { /* lần khám đầu / chưa có đơn — không phải lỗi */ }
    })();
    return () => { alive = false; };
  }, [examId]);

  // Cảnh báo lâm sàng (tương tác thuốc · dị ứng · KQ bất thường) — nạp theo bệnh nhân
  useEffect(() => {
    if (!selPt?.patientId) return;
    let alive = true;
    void (async () => {
      try {
        const r = await cdsApi.getClinicalAlerts(selPt.patientId, examId ?? undefined);
        if (alive && Array.isArray(r.data)) setAlerts(r.data);
      } catch { /* CDS là bổ trợ — không báo lỗi */ }
    })();
    return () => { alive = false; };
  }, [selPt?.patientId, examId]);

  /** Gợi ý chẩn đoán (AI) + NEWS2 — chạy theo yêu cầu bác sĩ (nút bấm). */
  const runCds = useCallback(async () => {
    if (!selPt) return;
    setCdsLoading(true);
    try {
      const request = {
        symptoms: splitClinicalText(history),
        signs: splitClinicalText(exam),
        age: selPt.age,
        gender: selPt.gender,
        temperature: vitals.temperature,
        pulse: vitals.pulse,
        bloodPressureSystolic: vitals.systolicBP,
        bloodPressureDiastolic: vitals.diastolicBP,
        respiratoryRate: vitals.respiratoryRate,
        spO2: vitals.spO2,
      };
      const [sug, alr] = await Promise.allSettled([
        cdsApi.suggestDiagnoses(request),
        cdsApi.getClinicalAlerts(selPt.patientId, examId ?? undefined),
      ]);
      if (sug.status === 'fulfilled' && Array.isArray(sug.value.data)) setSuggestions(sug.value.data);
      if (alr.status === 'fulfilled' && Array.isArray(alr.value.data)) setAlerts(alr.value.data);

      if (vitals.pulse || vitals.spO2 || vitals.temperature) {
        try {
          const r = await cdsApi.calculateEarlyWarningScore({
            pulse: vitals.pulse,
            bloodPressureSystolic: vitals.systolicBP,
            respiratoryRate: vitals.respiratoryRate,
            temperature: vitals.temperature,
            spO2: vitals.spO2,
          });
          if (r.data) setEws(r.data);
        } catch { /* bỏ qua */ }
      }
    } catch { /* CDS là bổ trợ — không chặn khám */ }
    finally { setCdsLoading(false); }
  }, [selPt, history, exam, vitals, examId]);

  return { suggestions, alerts, ews, cdsLoading, hasActiveMeds, runCds };
}
