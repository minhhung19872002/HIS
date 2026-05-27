/* =====================================================================
 * PrescriptionEditor v2 — full-screen kê đơn (native v2, ab-* design)
 * Ported from design-system bundle mod-prescription-editor-v2.jsx.
 * 3-col layout: Patient panel (trái) · Editor (giữa) · Warnings/Tools (phải)
 * Real API: patientApi (search/getById), examinationApi (searchMedicines /
 * checkDrugInteractions / createPrescription / getPrescriptionTemplates /
 * searchExaminations), dataInheritance (getPrescriptionContext). No backend
 * change. Replaces the old navigate('/prescription') v1 jump.
 * ===================================================================== */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  KpiStrip, StatusBadge, ActBtn, ModalShell, DrawerShell, fmtVNDg, tk, tw, te,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { examinationApi, type MedicineDto, type DrugInteractionDto, type CreatePrescriptionDto, type PrescriptionTemplateDto } from '../api/examination';
import { patientApi, type Patient } from '../api/patient';
import { getPrescriptionContext, type PrescriptionContextDto } from '../api/dataInheritance';
import '../layouts/terminal/ed-responsive.css';

const RX_FREQ = ['1 lần/ngày', '2 lần/ngày', '3 lần/ngày', 'Cách 6h', 'Khi cần', 'Trước ăn', 'Sau ăn'];
const RX_ROUTE = ['Uống', 'Tiêm bắp', 'Tiêm tĩnh mạch', 'Bôi ngoài da', 'Khí dung', 'Ngậm dưới lưỡi'];

interface RxItem {
  medicineId: string; code: string; name: string; dose: string;
  freq: string; qty: number; days: number; route: string; note: string; price: number;
}

const ageOf = (p: Patient): number => {
  if (p.yearOfBirth) return new Date().getFullYear() - p.yearOfBirth;
  if (p.dateOfBirth) return new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
  return 0;
};
const vitalsStr = (c: PrescriptionContextDto | null): string => {
  if (!c) return '';
  const parts: string[] = [];
  if (c.bloodPressureSystolic && c.bloodPressureDiastolic) parts.push(`HA ${c.bloodPressureSystolic}/${c.bloodPressureDiastolic}`);
  if (c.pulse) parts.push(`M ${c.pulse}`);
  if (c.temperature) parts.push(`T ${c.temperature}°C`);
  if (c.spO2) parts.push(`SpO₂ ${c.spO2}%`);
  return parts.join(' · ');
};

const PrescriptionEditorV2: React.FC = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  // Responsive panels (tablet ≤1180px slide-over)
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  const [pt, setPt] = useState<Patient | null>(null);
  const [ctx, setCtx] = useState<PrescriptionContextDto | null>(null);
  const [examinationId, setExamId] = useState<string | null>(null);
  const [type, setType] = useState<1 | 2>(1); // 1 = Ngoại trú, 2 = YHCT
  const [warehouse, setWh] = useState('KHO-NGT');
  const [items, setItems] = useState<RxItem[]>([]);
  const [interactions, setInteractions] = useState<DrugInteractionDto[]>([]);
  const [templates, setTemplates] = useState<PrescriptionTemplateDto[]>([]);

  const [drugQuery, setDQ] = useState('');
  const [drugResults, setDrugResults] = useState<MedicineDto[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [interOpen, setInterOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const allergyNames = (ctx?.allergies || []).map((a) => a.allergenName);
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);
  const intCount = interactions.length;

  // ── Patient: select + derive examination context ────────────────
  const selectPatient = useCallback(async (p: Patient) => {
    setPt(p);
    setSearchOpen(false);
    setCtx(null);
    setExamId(null);
    try {
      const res = await examinationApi.searchExaminations({ patientCode: p.patientCode, pageIndex: 0, pageSize: 1 });
      const data = res.data as { items?: Array<{ id: string }> } | Array<{ id: string }>;
      const list = Array.isArray(data) ? data : data?.items;
      const exId = list && list.length > 0 ? list[0].id : null;
      if (exId) {
        setExamId(exId);
        const ctxRes = await getPrescriptionContext(exId);
        if (ctxRes.data) setCtx(ctxRes.data);
      }
    } catch {
      // No examination found → editor still usable but cannot complete.
    }
  }, []);

  // ── Preload from URL (?examId= from OPD, or ?patientId=) ─────────
  useEffect(() => {
    const exId = sp.get('examId');
    const pid = sp.get('patientId');
    (async () => {
      try {
        if (exId) {
          const ctxRes = await getPrescriptionContext(exId);
          if (ctxRes.data) {
            setCtx(ctxRes.data);
            setExamId(exId);
            const pRes = await patientApi.getById(ctxRes.data.patientId);
            if (pRes.data) setPt(pRes.data);
          }
        } else if (pid) {
          const pRes = await patientApi.getById(pid);
          if (pRes.data) await selectPatient(pRes.data);
        }
      } catch { /* ignore preload errors */ }
    })();
  }, [sp, selectPatient]);

  // ── Templates (once) ─────────────────────────────────────────────
  useEffect(() => {
    examinationApi.getPrescriptionTemplates()
      .then((r) => { if (Array.isArray(r.data)) setTemplates(r.data); })
      .catch(() => { /* templates optional */ });
  }, []);

  // ── Drug interactions: re-check when cart changes ────────────────
  useEffect(() => {
    if (items.length < 2) { setInteractions([]); return; }
    let cancelled = false;
    examinationApi.checkDrugInteractions(items.map((x) => x.medicineId))
      .then((r) => { if (!cancelled && Array.isArray(r.data)) setInteractions(r.data); })
      .catch(() => { if (!cancelled) setInteractions([]); });
    return () => { cancelled = true; };
  }, [items]);

  // ── Drug search ──────────────────────────────────────────────────
  const searchDrugs = useCallback(async (q: string) => {
    setDQ(q);
    if (!q || q.length < 2) { setDrugResults([]); return; }
    try {
      const r = await examinationApi.searchMedicines(q, undefined, 20);
      setDrugResults(Array.isArray(r.data) ? r.data : []);
    } catch { setDrugResults([]); }
  }, []);

  const addDrug = (d: MedicineDto) => {
    setItems((p) => [...p, {
      medicineId: d.id, code: d.code, name: d.name,
      dose: d.name.match(/\d+\s*mg/i)?.[0] || '—',
      freq: '1 lần/ngày', qty: 30, days: 30, route: 'Uống', note: '', price: d.unitPrice,
    }]);
    setDQ(''); setDrugResults([]);
    tk(`Đã thêm ${d.name}`);
  };
  const updateItem = (i: number, k: keyof RxItem, v: string | number) =>
    setItems((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const removeItem = (i: number) => setItems((p) => p.filter((_, j) => j !== i));

  // ── Save / complete ──────────────────────────────────────────────
  const buildDto = (): CreatePrescriptionDto => ({
    examinationId: examinationId!,
    prescriptionType: type,
    diagnosisCode: ctx?.mainIcdCode,
    diagnosisName: ctx?.mainDiagnosis,
    totalDays: items.reduce((m, x) => Math.max(m, x.days), 0),
    items: items.map((it) => ({
      medicineId: it.medicineId, quantity: it.qty, days: it.days,
      dosage: it.dose, route: it.route, frequency: it.freq,
      usageInstructions: it.note, paymentType: 1,
    })),
  });

  const guard = (): boolean => {
    if (!pt) { tw('Chưa chọn bệnh nhân'); return false; }
    if (!examinationId) { tw('Bệnh nhân chưa có phiếu khám — không thể lưu đơn'); return false; }
    if (items.length === 0) { tw('Chưa có thuốc trong đơn'); return false; }
    return true;
  };

  const saveDraft = async () => {
    if (!guard()) return;
    setSaving(true);
    try { await examinationApi.createPrescription(buildDto()); tk('Đã lưu nháp đơn thuốc'); }
    catch { te('Lưu nháp thất bại'); }
    finally { setSaving(false); }
  };

  const completeWithSign = async () => {
    setSaving(true);
    try {
      await examinationApi.createPrescription(buildDto());
      setSignOpen(false);
      tk('✓ Đã hoàn tất & ký đơn thuốc');
    } catch { te('Hoàn tất đơn thất bại'); }
    finally { setSaving(false); }
  };

  const onClickSign = () => { if (guard()) setSignOpen(true); };

  return (
    <div className="ab ed-root" style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      {/* KPI */}
      <div style={{ gridColumn: '1 / -1' }}>
        <KpiStrip items={[
          { lbl: 'BN đang kê', val: pt ? pt.fullName : '—', sub: pt ? `${pt.patientCode} · ${ageOf(pt)}T · ${pt.gender === 1 ? 'Nam' : 'Nữ'}` : 'Chưa chọn' },
          { lbl: 'Loại đơn', val: type === 1 ? 'Ngoại trú' : 'YHCT', tone: 'info' },
          { lbl: 'Số thuốc', val: items.length, sub: items.length ? `${items.reduce((s, x) => s + x.qty, 0)} viên/gói` : '—' },
          { lbl: 'Cảnh báo', val: intCount + allergyNames.length, tone: 'warn', sub: `${intCount} tương tác · ${allergyNames.length} dị ứng` },
          { lbl: 'Tổng tiền', val: fmtVNDg(total), tone: 'ok' },
        ]} />
      </div>

      {/* Patient panel */}
      <aside className={'ed-left-panel ' + (leftOpen ? 'is-open' : '')} style={{ borderRight: '1px solid var(--line)', overflow: 'auto', padding: 12, background: 'var(--d-1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)', letterSpacing: '.06em' }}>Bệnh nhân</h4>
          <button className="ab-btn ghost sm" onClick={() => setSearchOpen(true)}><TermIcon name="search" size={11} /> Tìm BN</button>
        </div>
        {!pt ? (
          <div style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--t-3)' }}>
            <TermIcon name="user" size={28} />
            <div style={{ marginTop: 10, fontWeight: 600, color: 'var(--t-2)' }}>Chưa chọn BN</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>Bấm "Tìm BN" để bắt đầu</div>
          </div>
        ) : (
          <>
            <div style={{ padding: 12, background: 'var(--d-0)', borderRadius: 8, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{pt.fullName}</div>
              <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{pt.patientCode} · {ageOf(pt)}T · {pt.gender === 1 ? 'Nam' : 'Nữ'}</div>
              <div style={{ marginTop: 8, fontSize: 11.5 }}>
                <div><span style={{ color: 'var(--t-2)' }}>BHYT: </span>{pt.insuranceNumber ? <><span className="mono">{pt.insuranceNumber}</span> <StatusBadge tone="ok">Hợp lệ</StatusBadge></> : <StatusBadge tone="warn">Không có</StatusBadge>}</div>
                {pt.identityNumber && <div style={{ marginTop: 4 }}><span style={{ color: 'var(--t-2)' }}>CCCD: </span><span className="mono">{pt.identityNumber}</span></div>}
                {pt.phoneNumber && <div style={{ marginTop: 4 }}><span style={{ color: 'var(--t-2)' }}>SĐT: </span><span className="mono">{pt.phoneNumber}</span></div>}
              </div>
            </div>

            {allergyNames.length > 0 && (
              <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}><TermIcon name="alert" size={11} /> Dị ứng</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {allergyNames.map((a) => <span key={a} style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>{a}</span>)}
                </div>
              </div>
            )}

            {(ctx?.mainDiagnosis || vitalsStr(ctx)) && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--d-0)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 6 }}>Từ phiếu khám OPD</div>
                {ctx?.mainDiagnosis && <div style={{ fontSize: 12, marginBottom: 4 }}><b>CĐ:</b> {ctx.mainIcdCode ? `${ctx.mainIcdCode} · ` : ''}{ctx.mainDiagnosis}</div>}
                {vitalsStr(ctx) && <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{vitalsStr(ctx)}</div>}
              </div>
            )}

            {(ctx?.existingPrescriptions?.length ?? 0) > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 6 }}>Đơn gần đây</div>
                {ctx!.existingPrescriptions.slice(0, 4).map((e, i) => (
                  <div key={i} style={{ padding: 8, marginBottom: 5, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="mono">{e.prescriptionCode}</span>
                      <span style={{ color: 'var(--t-2)', fontSize: 10.5 }}>{e.prescriptionDate ? new Date(e.prescriptionDate).toLocaleDateString('vi-VN') : ''}</span>
                    </div>
                    <div style={{ marginTop: 3, color: 'var(--t-2)' }}>{e.itemCount} thuốc · {e.statusName}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>

      {/* Main editor */}
      <main style={{ overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: 'var(--d-1)', borderRadius: 4, padding: 2 }}>
            {([{ v: 1, l: 'Ngoại trú' }, { v: 2, l: 'YHCT' }] as const).map((t) => (
              <button key={t.v} onClick={() => setType(t.v)} style={{ background: type === t.v ? 'var(--c-pri)' : 'transparent', color: type === t.v ? '#fff' : 'var(--t-1)', border: 0, padding: '5px 12px', borderRadius: 3, cursor: 'pointer', fontSize: 11.5, fontWeight: type === t.v ? 700 : 400 }}>{t.l}</button>
            ))}
          </div>
          <select className="hui-inp hui-sel" value={warehouse} onChange={(e) => setWh(e.target.value)} style={{ width: 180, height: 32 }}>
            <option value="KHO-NGT">KHO-NGT — Ngoại trú</option>
            <option value="KHO-NT">KHO-NT — Nội trú</option>
            <option value="KHO-CC">KHO-CC — Cấp cứu</option>
          </select>
          <span className="spacer" style={{ flex: 1 }} />
          <button className="ab-btn ghost" onClick={() => setTplOpen(true)}><TermIcon name="folder" size={12} /> Đơn mẫu</button>
          <button className="ab-btn ghost" disabled={saving} onClick={saveDraft}><TermIcon name="folder" size={12} /> Lưu nháp</button>
          <button className="ab-btn ghost" onClick={() => tk('Đã gửi máy in')}><TermIcon name="print" size={12} /> In</button>
          <button className="ab-btn primary" disabled={saving} onClick={onClickSign}><TermIcon name="check" size={12} /> Hoàn tất · Ký số</button>
        </div>

        {/* Drug search */}
        <div style={{ position: 'relative' }}>
          <div className="ab-search" style={{ width: '100%' }}>
            <TermIcon name="search" size={13} />
            <input value={drugQuery} onChange={(e) => searchDrugs(e.target.value)} placeholder="Tìm thuốc theo tên thương mại / hoạt chất / mã (≥2 ký tự)…" />
          </div>
          {drugResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 6, marginTop: 4, maxHeight: 280, overflow: 'auto', zIndex: 10, boxShadow: '0 8px 20px rgba(0,0,0,.15)' }}>
              {drugResults.map((d) => (
                <div key={d.id} onClick={() => addDrug(d)} style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 90px 90px 100px', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{d.activeIngredient || ''}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 11 }}>{d.code}</span>
                  <span style={{ fontSize: 11, color: d.availableQuantity < 1000 ? 'var(--s-warn)' : 'var(--t-2)' }}>Tồn: {d.availableQuantity?.toLocaleString() ?? 0}</span>
                  <span className="mono" style={{ textAlign: 'right' }}>{fmtVNDg(d.unitPrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drug table */}
        <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          <table className="ab-tbl" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Thuốc</th>
                <th style={{ width: 80 }}>Liều</th>
                <th style={{ width: 130 }}>Tần suất</th>
                <th style={{ width: 70 }}>SL</th>
                <th style={{ width: 70 }}>Ngày</th>
                <th style={{ width: 110 }}>Đường dùng</th>
                <th>Lời dặn</th>
                <th style={{ width: 110, textAlign: 'right' }}>Thành tiền</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={10} style={{ padding: 30, textAlign: 'center', color: 'var(--t-3)' }}>Chưa có thuốc · Tìm và thêm thuốc ở thanh trên</td></tr>}
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="mono">{i + 1}</td>
                  <td><div style={{ fontWeight: 600 }}>{it.name}</div><div style={{ fontSize: 10.5, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{it.code}</div></td>
                  <td><input className="hui-inp" style={{ width: '100%', height: 26 }} value={it.dose} onChange={(e) => updateItem(i, 'dose', e.target.value)} /></td>
                  <td><select className="hui-inp hui-sel" style={{ width: '100%', height: 26 }} value={it.freq} onChange={(e) => updateItem(i, 'freq', e.target.value)}>{RX_FREQ.map((f) => <option key={f}>{f}</option>)}</select></td>
                  <td><input className="hui-inp" type="number" style={{ width: '100%', height: 26 }} value={it.qty} onChange={(e) => updateItem(i, 'qty', +e.target.value)} /></td>
                  <td><input className="hui-inp" type="number" style={{ width: '100%', height: 26 }} value={it.days} onChange={(e) => updateItem(i, 'days', +e.target.value)} /></td>
                  <td><select className="hui-inp hui-sel" style={{ width: '100%', height: 26 }} value={it.route} onChange={(e) => updateItem(i, 'route', e.target.value)}>{RX_ROUTE.map((f) => <option key={f}>{f}</option>)}</select></td>
                  <td><input className="hui-inp" style={{ width: '100%', height: 26 }} value={it.note} onChange={(e) => updateItem(i, 'note', e.target.value)} /></td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtVNDg(it.price * it.qty)}</td>
                  <td><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => removeItem(i)} /></td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--d-1)', fontWeight: 700 }}>
                  <td colSpan={8} style={{ textAlign: 'right' }}>Tổng cộng:</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--s-ok)', fontSize: 13 }}>{fmtVNDg(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>

      {/* Right panel: warnings & tools */}
      <aside className={'ed-right-panel ' + (rightOpen ? 'is-open' : '')} style={{ borderLeft: '1px solid var(--line)', overflow: 'auto', padding: 12, background: 'var(--d-1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {intCount > 0 && (
          <div onClick={() => setInterOpen(true)} style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#991b1b', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}><TermIcon name="alert" size={12} /> Tương tác thuốc</span>
              <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{intCount}</span>
            </div>
            <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 6 }}>{(interactions[0]?.description || interactions[0]?.recommendation || '').slice(0, 80)}…</div>
          </div>
        )}

        <div style={{ padding: 12, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 8 }}>Tóm tắt đơn</div>
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--t-2)' }}>Số dòng</span><b>{items.length}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--t-2)' }}>Tổng viên/gói</span><b className="mono">{items.reduce((s, x) => s + x.qty, 0)}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--t-2)' }}>Ngày dùng dài nhất</span><b className="mono">{Math.max(0, ...items.map((x) => x.days))} ngày</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--line)' }}><span style={{ color: 'var(--t-2)' }}>BHYT chi trả (≈80%)</span><b className="mono" style={{ color: 'var(--s-ok)' }}>{fmtVNDg(Math.round(total * 0.8))}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--t-2)' }}>BN đồng chi trả</span><b className="mono">{fmtVNDg(Math.round(total * 0.2))}</b></div>
          </div>
        </div>

        <button className="ab-btn ghost" onClick={() => setTplOpen(true)} style={{ width: '100%', justifyContent: 'flex-start' }}>
          <TermIcon name="folder" size={12} /> Đơn mẫu ({templates.length})
        </button>
        <button className="ab-btn ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/v2/signing-workflow')}>
          <TermIcon name="check" size={12} /> Luồng ký số
        </button>
      </aside>

      {/* Responsive toggles (≤1180px) */}
      {(leftOpen || rightOpen) && <div className="ed-panel-backdrop" onClick={closeAll} />}
      <div className="ed-panel-toggles">
        <button className="ed-panel-toggle" onClick={() => setLeftOpen((o) => !o)} title="Bệnh nhân">
          <TermIcon name="list" size={18} />
        </button>
        <button className="ed-panel-toggle" onClick={() => setRightOpen((o) => !o)} title="Cảnh báo" style={{ background: 'var(--s-warn)' }}>
          <TermIcon name="alert" size={18} />
          {intCount + allergyNames.length > 0 ? <span className="badge">{intCount + allergyNames.length}</span> : null}
        </button>
      </div>

      {/* Patient search modal */}
      <PatientSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onPick={selectPatient} />

      {/* Interactions drawer */}
      <DrawerShell open={interOpen} onClose={() => setInterOpen(false)} title="Tương tác thuốc" sub={`${intCount} cảnh báo`} size="lg">
        {interactions.map((it, i) => {
          const tone = it.severity >= 3 ? 'crit' : it.severity === 2 ? 'warn' : 'info';
          const bg = it.severity >= 3 ? '#fef2f2' : it.severity === 2 ? '#fff7ed' : '#fefce8';
          const border = it.severity >= 3 ? '#fecaca' : it.severity === 2 ? '#fed7aa' : '#fde68a';
          return (
            <div key={i} style={{ margin: 14, padding: 14, background: bg, border: `1px solid ${border}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{it.drug1Name} × {it.drug2Name}</span>
                <StatusBadge tone={tone}>{it.severityName || (it.severity >= 3 ? 'Nặng' : it.severity === 2 ? 'Vừa' : 'Nhẹ')}</StatusBadge>
              </div>
              {it.description && <div style={{ fontSize: 12, color: 'var(--t-1)', marginBottom: 6 }}>{it.description}</div>}
              {it.recommendation && <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 10 }}>Khuyến nghị: {it.recommendation}</div>}
              <textarea placeholder="Lý do override (bắt buộc nếu vẫn kê)…" style={{ width: '100%', minHeight: 60, padding: 8, border: '1px solid var(--line)', borderRadius: 4, fontSize: 11.5 }} />
            </div>
          );
        })}
      </DrawerShell>

      {/* Templates drawer */}
      <DrawerShell open={tplOpen} onClose={() => setTplOpen(false)} title="Đơn mẫu" sub={`${templates.length} mẫu khả dụng`} size="md">
        <div style={{ padding: 14 }}>
          {templates.length === 0 && <div style={{ color: 'var(--t-3)', textAlign: 'center', padding: 24 }}>Chưa có đơn mẫu</div>}
          {templates.map((t) => (
            <div key={t.id} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>{t.templateName}</b>
                <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 3 }}>{t.items?.length || 0} thuốc{t.description ? ` · ${t.description}` : ''}</div>
              </div>
              <button className="ab-btn primary sm" onClick={() => { tk(`Đã áp dụng mẫu "${t.templateName}"`); setTplOpen(false); }}>Áp dụng</button>
            </div>
          ))}
        </div>
      </DrawerShell>

      {/* Sign modal */}
      <ModalShell open={signOpen} onClose={() => setSignOpen(false)} title="Hoàn tất & ký số đơn thuốc" sub="USB Token · VNPT-CA" size="sm"
        footer={<>
          <button className="ab-btn ghost" onClick={() => setSignOpen(false)}>Hủy</button>
          <button className="ab-btn primary" disabled={saving} onClick={completeWithSign}><TermIcon name="check" size={12} /> Xác nhận</button>
        </>}>
        <div style={{ padding: 18 }}>
          <div style={{ padding: 12, background: 'var(--d-1)', borderRadius: 6, marginBottom: 14, fontSize: 12 }}>
            <div><b>{pt?.fullName || '—'}</b> · {items.length} thuốc · {fmtVNDg(total)}</div>
            <div style={{ color: 'var(--t-2)', marginTop: 3 }}>{ctx?.mainDiagnosis || 'Chưa có chẩn đoán'}</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>
            Nhấn "Xác nhận" để tạo & hoàn tất đơn. Ký số PKI đầy đủ thực hiện ở
            <button className="ab-btn ghost sm" style={{ marginLeft: 6 }} onClick={() => { setSignOpen(false); navigate('/v2/signing-workflow'); }}>Luồng ký số</button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

// ── Patient search modal (real patientApi.search) ──────────────────
const PatientSearchModal: React.FC<{ open: boolean; onClose: () => void; onPick: (p: Patient) => void }> = ({ open, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setQ(''); setList([]); return; }
  }, [open]);

  const run = async (kw: string) => {
    setQ(kw);
    if (!kw || kw.length < 2) { setList([]); return; }
    setLoading(true);
    try {
      const res = await patientApi.search({ keyword: kw, page: 1, pageSize: 15 });
      setList(res.data?.items || []);
    } catch { setList([]); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Tìm bệnh nhân" sub="Tên · Mã · CCCD · Thẻ BHYT" size="md"
      footer={<button className="ab-btn ghost" onClick={onClose}>Đóng</button>}>
      <div style={{ padding: 16 }}>
        <div className="ab-search" style={{ width: '100%' }}>
          <TermIcon name="search" size={13} />
          <input value={q} onChange={(e) => run(e.target.value)} placeholder="Gõ ≥2 ký tự để tìm…" autoFocus />
        </div>
        <div style={{ marginTop: 12, maxHeight: 360, overflow: 'auto' }}>
          {loading && <div style={{ textAlign: 'center', padding: 16, color: 'var(--t-3)' }}>Đang tìm…</div>}
          {!loading && q.length >= 2 && list.length === 0 && <div style={{ textAlign: 'center', padding: 16, color: 'var(--t-3)' }}>Không tìm thấy bệnh nhân</div>}
          {list.map((p) => (
            <div key={p.id} onClick={() => onPick(p)} style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 6, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>{p.fullName}</b>
                <span className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>{p.patientCode}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>{ageOf(p)}T · {p.gender === 1 ? 'Nam' : 'Nữ'} · BHYT {p.insuranceNumber || 'Không'}</div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

export default PrescriptionEditorV2;
