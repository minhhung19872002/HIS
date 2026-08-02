/* =====================================================================
 * DiagnosisOrdersSection — 2 section giữa của OpdEditor: Chẩn đoán ICD-10
 * + Chỉ định CLS/Dịch vụ. Tách presentational (#362 FE-2b Phase-2 inc-2):
 * JSX verbatim từ OpdEditor, nhận state + handler (search/add/… GIỮ trong
 * main) qua props. KHÔNG chứa logic nghiệp vụ.
 * ===================================================================== */

import React from 'react';
import { ActBtn, Btn, fmtVNDg } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import type { IcdCodeFullDto, ServiceDto } from '../api/examination';
import type { DxRow, OrderRow } from './_shared';
import type { DiagnosisSuggestion } from '../../patient/api/clinicalDecisionSupport';

export interface DiagnosisOrdersSectionProps {
  // Chẩn đoán
  icdQ: string;
  searchIcd: (q: string) => void;
  icdResults: IcdCodeFullDto[];
  addIcd: (i: IcdCodeFullDto) => void;
  diagnoses: DxRow[];
  setPrimary: (idx: number) => void;
  removeIcd: (idx: number) => void;

  // Gợi ý chẩn đoán CDS (#433) — bổ trợ, bác sĩ vẫn quyết định
  cdsSuggestions: DiagnosisSuggestion[];
  cdsLoading: boolean;
  onRunCds: () => void;
  onPickSuggestion: (s: DiagnosisSuggestion) => void;

  // Chỉ định CLS
  svcQ: string;
  searchSvc: (q: string) => void;
  svcResults: ServiceDto[];
  addSvc: (s: ServiceDto) => void;
  orders: OrderRow[];
  updateQty: (i: number, q: number) => void;
  removeSvc: (i: number) => void;
  totalSvc: number;

  // Mẫu bộ chỉ định dùng nhanh (#433)
  orderTpls: { name: string; items: OrderRow[] }[];
  onApplyOrderTpl: (name: string) => void;
  onSaveOrderTpl: () => void;
  onRemoveOrderTpl: (name: string) => void;
}

export const DiagnosisOrdersSection: React.FC<DiagnosisOrdersSectionProps> = ({
  icdQ, searchIcd, icdResults, addIcd, diagnoses, setPrimary, removeIcd,
  cdsSuggestions, cdsLoading, onRunCds, onPickSuggestion,
  svcQ, searchSvc, svcResults, addSvc, orders, updateQty, removeSvc, totalSvc,
  orderTpls, onApplyOrderTpl, onSaveOrderTpl, onRemoveOrderTpl,
}) => {
  return (
    <>
      {/* Diagnosis */}
      <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-12)' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Chẩn đoán (ICD-10)</h4>
        <div style={{ position: 'relative', marginBottom: 'var(--space-8)' }}>
          <div className="ab-search">
            <TermIcon name="search" size={13} />
            <input value={icdQ} onChange={(e) => searchIcd(e.target.value)} placeholder="Tìm mã ICD-10 hoặc tên bệnh (≥2 ký tự)…" />
          </div>
          {icdResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginTop: 'var(--space-4)', maxHeight: 220, overflow: 'auto', zIndex: 10, boxShadow: '0 8px 20px rgba(0,0,0,.15)' }}>
              {icdResults.map((i) => (
                <div key={i.code} onClick={() => addIcd(i)} style={{ padding: '6px 12px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', display: 'flex', gap: 'var(--space-10)' }}>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--a-cy)', width: 70 }}>{i.code}</span>
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{i.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
          {diagnoses.length === 0 && <span style={{ color: 'var(--t-3)', fontSize: 11.5 }}>Chưa có chẩn đoán</span>}
          {diagnoses.map((d, i) => (
            <span key={d.icdCode} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-6)', padding: '4px 8px', background: d.isPrimary ? 'var(--a-cy)' : 'var(--d-1)', color: d.isPrimary ? '#fff' : 'var(--t-0)', borderRadius: 4, fontSize: 11.5 }}>
              <span className="mono" style={{ fontWeight: 700 }}>{d.icdCode}</span>
              <span>{d.icdName}</span>
              {d.isPrimary ? <span style={{ fontSize: 9, fontWeight: 700, opacity: .8 }}>CHÍNH</span>
                : <button onClick={() => setPrimary(i)} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 'var(--fs-xxs)' }} title="Đặt làm chính">★</button>}
              <button onClick={() => removeIcd(i)} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>

        {/* Gợi ý chẩn đoán (CDS) — chỉ tham khảo, bấm để thêm vào danh sách */}
        <div style={{ marginTop: 'var(--space-10)' }}>
          <Btn variant="ghost" onClick={onRunCds} disabled={cdsLoading}>
            <TermIcon name={cdsLoading ? 'refresh' : 'star'} size={12} />
            {cdsLoading ? ' Đang phân tích…' : ' Gợi ý chẩn đoán (CDS)'}
          </Btn>
          {cdsSuggestions.length > 0 && (
            <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {cdsSuggestions.map((s) => (
                <div key={s.icdCode} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 11.5 }}>
                  <span className="mono" style={{ minWidth: 46, textAlign: 'right', color: s.confidence >= 0.7 ? 'var(--s-ok)' : 'var(--s-warn)' }}>
                    {Math.round(s.confidence * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onPickSuggestion(s)}
                    style={{ background: 'transparent', border: 0, color: 'var(--a-cy)', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    title="Thêm vào danh sách chẩn đoán"
                  >
                    <span className="mono" style={{ fontWeight: 700 }}>{s.icdCode}</span> — {s.icdName}
                  </button>
                  {s.isCommonInDepartment && <span style={{ fontSize: 9.5, color: 'var(--t-3)' }}>THƯỜNG GẶP</span>}
                  {s.reasoning && <span style={{ color: 'var(--t-3)', fontSize: 10.5 }}>{s.reasoning}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Orders */}
      <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-12)' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Chỉ định CLS · Dịch vụ</h4>

        {/* Mẫu bộ chỉ định dùng nhanh (#433) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-10)', flexWrap: 'wrap' }}>
          <select
            className="hui-inp" value="" onChange={(e) => { if (e.target.value) onApplyOrderTpl(e.target.value); }}
            style={{ height: 28, fontSize: 'var(--fs-sm)', flex: '0 1 280px', minWidth: 200 }}
          >
            <option value="">Áp mẫu chỉ định{orderTpls.length ? ` (${orderTpls.length} mẫu)` : ' (chưa có mẫu)'}…</option>
            {orderTpls.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.items.length} DV)</option>)}
          </select>
          <Btn variant="ghost" onClick={onSaveOrderTpl} disabled={orders.length === 0}>
            <TermIcon name="plus" size={12} /> Lưu mẫu
          </Btn>
          {orderTpls.map((t) => (
            <ActBtn key={t.name} ic="trash" tone="crit" title={`Xoá mẫu "${t.name}"`} onClick={() => onRemoveOrderTpl(t.name)} />
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: 'var(--space-10)' }}>
          <div className="ab-search">
            <TermIcon name="search" size={13} />
            <input value={svcQ} onChange={(e) => searchSvc(e.target.value)} placeholder="Tìm XN / CĐHA / thủ thuật (≥2 ký tự)…" />
          </div>
          {svcResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginTop: 'var(--space-4)', maxHeight: 220, overflow: 'auto', zIndex: 10, boxShadow: '0 8px 20px rgba(0,0,0,.15)' }}>
              {svcResults.map((s) => (
                <div key={s.id} onClick={() => addSvc(s)} style={{ padding: '6px 12px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', display: 'grid', gridTemplateColumns: '110px 1fr 110px', gap: 'var(--space-10)' }}>
                  <span className="mono" style={{ color: 'var(--a-cy)' }}>{s.code}</span>
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{s.name}</span>
                  <span className="mono" style={{ textAlign: 'right' }}>{fmtVNDg(s.unitPrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <table className="ab-tbl" style={{ fontSize: 'var(--fs-sm)' }}>
          <thead><tr><th style={{ width: 32 }}>#</th><th>Dịch vụ</th><th style={{ width: 80 }}>SL</th><th style={{ width: 120, textAlign: 'right' }}>Đơn giá</th><th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th><th style={{ width: 40 }}></th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={6} style={{ padding: 'var(--space-20)', textAlign: 'center', color: 'var(--t-3)' }}>Chưa có chỉ định</td></tr>}
            {orders.map((o, i) => (
              <tr key={o.serviceId}>
                <td className="mono">{i + 1}</td>
                <td><div style={{ fontWeight: 600 }}>{o.name}</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{o.code}</div></td>
                <td><input type="number" className="hui-inp" style={{ width: '100%', height: 26 }} value={o.qty} onChange={(e) => updateQty(i, +e.target.value)} /></td>
                <td className="mono" style={{ textAlign: 'right' }}>{fmtVNDg(o.unitPrice)}</td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtVNDg(o.unitPrice * o.qty)}</td>
                <td><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => removeSvc(i)} /></td>
              </tr>
            ))}
          </tbody>
          {orders.length > 0 && <tfoot><tr style={{ background: 'var(--d-1)', fontWeight: 700 }}><td colSpan={4} style={{ textAlign: 'right' }}>Tổng CLS:</td><td className="mono" style={{ textAlign: 'right', color: 'var(--s-ok)' }}>{fmtVNDg(totalSvc)}</td><td></td></tr></tfoot>}
        </table>
      </section>
    </>
  );
};

export default DiagnosisOrdersSection;
