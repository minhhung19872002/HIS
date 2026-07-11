import { useCallback } from 'react';
import { Modal, message } from 'antd';
import type { AlertCheckResult } from '../api/businessAlerts';
import {
  checkBloodTypeMismatch,
  checkBhytClsDailyLimit,
  checkIcdBhytProtocol,
  checkUnfilledPrescriptions,
  estimateCost,
} from '../api/businessAlerts';
import type { CostEstimationResult } from '../api/businessAlerts';

function showAlertModal(result: AlertCheckResult) {
  if (!result.newAlerts?.length) return;

  const criticals = result.newAlerts.filter(a => a.severity === 1);
  const warnings = result.newAlerts.filter(a => a.severity === 2);
  const infos = result.newAlerts.filter(a => a.severity >= 3);

  const content = result.newAlerts.map(a =>
    `• [${a.severityLabel}] ${a.title}: ${a.message}`
  ).join('\n\n');

  if (criticals.length > 0) {
    Modal.error({
      title: `⚠️ Cảnh báo nghiêm trọng (${criticals.length})`,
      content: content,
      width: 600,
      okText: 'Đã hiểu',
    });
  } else if (warnings.length > 0) {
    Modal.warning({
      title: `Cảnh báo (${warnings.length})`,
      content: content,
      width: 600,
      okText: 'Đã hiểu',
    });
  } else if (infos.length > 0) {
    message.info(infos[0].message);
  }
}

export function useSafetyAlerts() {
  const alertBloodType = useCallback(async (patientId: string, bloodType: string, rhFactor?: string) => {
    try {
      const res = await checkBloodTypeMismatch(patientId, bloodType, rhFactor);
      const result = res.data;
      showAlertModal(result);
      return result;
    } catch { return null; }
  }, []);

  const alertBhytClsLimit = useCallback(async (patientId: string, newOrderCount = 1) => {
    try {
      const res = await checkBhytClsDailyLimit(patientId, newOrderCount);
      const result = res.data;
      if (result.totalNewAlerts > 0) showAlertModal(result);
      return result;
    } catch { return null; }
  }, []);

  const alertIcdProtocol = useCallback(async (patientId: string, icdCode: string, medicineIds: string[]) => {
    try {
      const res = await checkIcdBhytProtocol(patientId, icdCode, medicineIds);
      const result = res.data;
      if (result.totalNewAlerts > 0) showAlertModal(result);
      return result;
    } catch { return null; }
  }, []);

  const alertUnfilledRx = useCallback(async (patientId: string) => {
    try {
      const res = await checkUnfilledPrescriptions(patientId);
      const result = res.data;
      if (result.totalNewAlerts > 0) showAlertModal(result);
      return result;
    } catch { return null; }
  }, []);

  const getCostEstimation = useCallback(async (patientId: string, serviceIds: string[]): Promise<CostEstimationResult | null> => {
    try {
      const res = await estimateCost(patientId, serviceIds);
      return res.data;
    } catch { return null; }
  }, []);

  return { alertBloodType, alertBhytClsLimit, alertIcdProtocol, alertUnfilledRx, getCostEstimation };
}
