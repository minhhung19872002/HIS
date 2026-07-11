/**
 * surgery-modals/AnesthesiaMonitorModal.tsx
 * Phiếu theo dõi gây mê (AnesthesiaRecord monitors/drugs/fluids)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { InputNumber, Spin } from 'antd';
import { ModalShell, Btn, tk, tw, te } from '../../_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';
import { anesthesiaApi } from '../../../modules/patient/api/clinicalRecords';
import {
  printAnesthesiaMonitor,
  printAnesthesiaRecord,
} from '../../../modules/patient/components/AnesthesiaPrintTemplates';
import { Section } from './_shared';

// ---------------------------------------------------------------------------
// Types & constants (AnesthesiaMonitor-specific)
// ---------------------------------------------------------------------------

export interface AnesthesiaMonitorModalProps {
  open: boolean;
  onClose: () => void;
  surgeryId: string;
  patientId: string;
  patientName?: string;
  surgeryCode?: string;
}

interface MonitorEntry {
  monitorTime: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  spO2?: number;
  etCO2?: number;
  temperature?: number;
  notes?: string;
}

interface DrugEntry {
  givenTime: string;
  drugName: string;
  dose?: string;
  route?: string;
}

const EMPTY_MONITOR: MonitorEntry = { monitorTime: '', systolicBP: undefined, diastolicBP: undefined, heartRate: undefined, spO2: undefined };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AnesthesiaMonitorModal: React.FC<AnesthesiaMonitorModalProps> = ({
  open, onClose, surgeryId, patientId, patientName, surgeryCode,
}) => {
  const [existingId, setExistingId] = useState<string | null>(null);
  const [monitors, setMonitors]     = useState<MonitorEntry[]>([{ ...EMPTY_MONITOR }]);
  const [drugs, setDrugs]           = useState<DrugEntry[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [printing, setPrinting]     = useState(false);

  const load = useCallback(async () => {
    if (!open || !surgeryId) return;
    setLoading(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const existing = Array.isArray(records) ? records[0] : null;
      if (existing) {
        setExistingId(existing.id);
        const mons: MonitorEntry[] = (existing.monitors ?? []).map((m: {
          monitorTime?: string; systolicBP?: number; diastolicBP?: number;
          heartRate?: number; spO2?: number; etCO2?: number;
          temperature?: number; notes?: string;
        }) => ({
          monitorTime:  m.monitorTime ?? '',
          systolicBP:   m.systolicBP,
          diastolicBP:  m.diastolicBP,
          heartRate:    m.heartRate,
          spO2:         m.spO2,
          etCO2:        m.etCO2,
          temperature:  m.temperature,
          notes:        m.notes,
        }));
        setMonitors(mons.length ? mons : [{ ...EMPTY_MONITOR }]);
        const drs: DrugEntry[] = (existing.drugs ?? []).map((d: {
          givenTime?: string; drugName?: string; dose?: string; route?: string;
        }) => ({
          givenTime: d.givenTime ?? '',
          drugName:  d.drugName ?? '',
          dose:      d.dose,
          route:     d.route,
        }));
        setDrugs(drs);
      } else {
        setExistingId(null);
        setMonitors([{ ...EMPTY_MONITOR }]);
        setDrugs([]);
      }
    } catch {
      setMonitors([{ ...EMPTY_MONITOR }]);
      setDrugs([]);
    } finally {
      setLoading(false);
    }
  }, [open, surgeryId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const addMonitor = () => setMonitors((m) => [...m, { ...EMPTY_MONITOR }]);
  const removeMonitor = (i: number) => setMonitors((m) => m.filter((_, idx) => idx !== i));
  const setMonitorField = (i: number, k: keyof MonitorEntry, v: string | number | undefined) =>
    setMonitors((m) => m.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const addDrug = () => setDrugs((d) => [...d, { givenTime: '', drugName: '' }]);
  const removeDrug = (i: number) => setDrugs((d) => d.filter((_, idx) => idx !== i));
  const setDrugField = (i: number, k: keyof DrugEntry, v: string) =>
    setDrugs((d) => d.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const handleSave = async () => {
    const validMonitors = monitors.filter((m) => m.monitorTime);
    setSaving(true);
    try {
      await anesthesiaApi.save({
        id: existingId ?? undefined,
        surgeryId,
        patientId,
        patientName: patientName ?? '',
        asaClass: 1,
        mallampatiScore: 1,
        anesthesiaType: 'Gây mê toàn thân',
        status: 1,
        monitors: validMonitors,
        drugs: drugs.filter((d) => d.drugName),
        fluids: [],
      });
      tk('Đã lưu phiếu theo dõi gây mê');
      await load();
    } catch {
      te('Không thể lưu phiếu theo dõi gây mê');
    } finally {
      setSaving(false);
    }
  };

  // In phiếu: fetch bản ghi mới nhất rồi gọi print helper
  const handlePrintMonitor = async () => {
    if (!surgeryId) return;
    setPrinting(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const rec = Array.isArray(records) ? records[0] : null;
      if (!rec) { tw('Chưa có dữ liệu theo dõi gây mê để in'); return; }
      printAnesthesiaMonitor(rec);
    } catch {
      te('Không in được phiếu theo dõi gây mê');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintRecord = async () => {
    if (!surgeryId) return;
    setPrinting(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const rec = Array.isArray(records) ? records[0] : null;
      if (!rec) { tw('Chưa có dữ liệu để in biên bản gây mê'); return; }
      printAnesthesiaRecord(rec);
    } catch {
      te('Không in được biên bản gây mê');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="chart" size={14} />
          <span>Theo dõi gây mê</span>
        </span>
      }
      sub={[patientName, surgeryCode].filter(Boolean).join(' · ') || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          {existingId && (
            <>
              <Btn variant="ghost" loading={printing} onClick={handlePrintMonitor} icon="print">
                In phiếu TD gây mê
              </Btn>
              <Btn variant="ghost" loading={printing} onClick={handlePrintRecord} icon="print">
                In biên bản GM
              </Btn>
            </>
          )}
          <Btn variant="primary" loading={saving} onClick={handleSave}>
            <TermIcon name="download" size={12} /> Lưu
          </Btn>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-32)' }}><Spin /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Section title={`Theo dõi sinh tồn (${monitors.length} lần)`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: 'var(--d-1)' }}>
                    {['Giờ', 'HA trên', 'HA dưới', 'Mạch', 'SpO2', 'EtCO2', 'Nhiệt độ', 'Ghi chú', ''].map((h, i) => (
                      <th key={i} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, color: 'var(--t-2)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monitors.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '3px 4px' }}>
                        <input
                          type="time"
                          className="hui-inp"
                          style={{ width: 80, height: 26, fontSize: 'var(--fs-xs)' }}
                          value={m.monitorTime}
                          onChange={(e) => setMonitorField(i, 'monitorTime', e.target.value)}
                        />
                      </td>
                      {(['systolicBP', 'diastolicBP', 'heartRate', 'spO2', 'etCO2'] as const).map((k) => (
                        <td key={k} style={{ padding: '3px 4px' }}>
                          <InputNumber
                            size="small"
                            style={{ width: 64 }}
                            value={m[k] as number | undefined}
                            onChange={(v) => setMonitorField(i, k, v ?? undefined)}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '3px 4px' }}>
                        <InputNumber
                          size="small"
                          style={{ width: 72 }}
                          min={34}
                          max={42}
                          step={0.1}
                          value={m.temperature as number | undefined}
                          onChange={(v) => setMonitorField(i, 'temperature', v ?? undefined)}
                        />
                      </td>
                      <td style={{ padding: '3px 4px' }}>
                        <input
                          className="hui-inp"
                          style={{ width: 90, height: 26, fontSize: 'var(--fs-xs)' }}
                          value={m.notes ?? ''}
                          onChange={(e) => setMonitorField(i, 'notes', e.target.value)}
                          placeholder="Ghi chú…"
                        />
                      </td>
                      <td style={{ padding: '3px 4px' }}>
                        <Btn variant="crit" size="sm" onClick={() => removeMonitor(i)}>
                          <TermIcon name="x" size={10} />
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Btn variant="ghost" size="sm" onClick={addMonitor} style={{ marginTop: 'var(--space-6)' }}>
              <TermIcon name="plus" size={11} /> Thêm lần theo dõi
            </Btn>
          </Section>

          <Section title={`Thuốc gây mê (${drugs.length})`}>
            {drugs.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-6)', alignItems: 'center' }}>
                <input
                  type="time"
                  className="hui-inp"
                  style={{ width: 80, height: 28, fontSize: 'var(--fs-xs)' }}
                  value={d.givenTime}
                  onChange={(e) => setDrugField(i, 'givenTime', e.target.value)}
                />
                <input
                  className="hui-inp"
                  style={{ flex: 2, height: 28, fontSize: 'var(--fs-xs)' }}
                  value={d.drugName}
                  onChange={(e) => setDrugField(i, 'drugName', e.target.value)}
                  placeholder="Tên thuốc…"
                />
                <input
                  className="hui-inp"
                  style={{ flex: 1, height: 28, fontSize: 'var(--fs-xs)' }}
                  value={d.dose ?? ''}
                  onChange={(e) => setDrugField(i, 'dose', e.target.value)}
                  placeholder="Liều…"
                />
                <input
                  className="hui-inp"
                  style={{ width: 80, height: 28, fontSize: 'var(--fs-xs)' }}
                  value={d.route ?? ''}
                  onChange={(e) => setDrugField(i, 'route', e.target.value)}
                  placeholder="Đường dùng"
                />
                <Btn variant="crit" size="sm" onClick={() => removeDrug(i)}>
                  <TermIcon name="x" size={10} />
                </Btn>
              </div>
            ))}
            <Btn variant="ghost" size="sm" onClick={addDrug}>
              <TermIcon name="plus" size={11} /> Thêm thuốc
            </Btn>
          </Section>
        </div>
      )}
    </ModalShell>
  );
};
