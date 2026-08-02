import React from 'react';
import { ModalShell, Btn } from '@/_v2kit';
import type { PatientLabResultsDto } from '../api/examination';

/* ==========================================================================
   Modal KQ XN · CĐHA tại phòng khám — pure read-only viewer.
   Extracted verbatim from OpdEditor.tsx (#205 FE-2 split, Phase 1). Data is
   fetched in the main component (openClsResults); this is a presentational
   viewer receiving everything via props.
   ========================================================================== */

export const ClsResultsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  loading: boolean;
  data: PatientLabResultsDto | null;
  sub?: string;
}> = ({ open, onClose, loading, data, sub }) => (
  <ModalShell
    open={open}
    onClose={onClose}
    title="Kết quả XN · CĐHA"
    sub={sub}
    size="lg"
    footer={<div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn variant="ghost" size="sm" onClick={onClose}>Đóng</Btn></div>}
  >
    {loading && <div style={{ padding: 'var(--space-20)', textAlign: 'center', color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Đang tải…</div>}
    {!loading && data && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }}>
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Xét nghiệm ({data.labResults?.length ?? 0})</h4>
          {(data.labResults || []).length === 0 && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-3)' }}>Chưa có kết quả xét nghiệm</div>}
          {(data.labResults || []).map((lr) => (
            <div key={lr.orderId} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-10)', marginBottom: 'var(--space-8)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <b style={{ fontSize: 12.5 }}>{lr.serviceName}</b>
                <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{lr.serviceCode}</span>
                <span className="spacer" />
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{lr.resultDate ? new Date(lr.resultDate).toLocaleString('vi-VN') : 'Chưa có KQ'}</span>
              </div>
              {(lr.items || []).map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 'var(--space-8)', fontSize: 'var(--fs-sm)', padding: '3px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <span>{it.testName}</span>
                  <span className="mono" style={{ textAlign: 'right', fontWeight: 600, color: it.isAbnormal ? 'var(--s-crit)' : 'var(--t-0)' }}>
                    {it.result || '—'}{it.unit ? ` ${it.unit}` : ''}{it.isAbnormal ? ' ⚠' : ''}
                  </span>
                  <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{it.referenceRange || '—'}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>CĐHA · TDCN ({data.imagingResults?.length ?? 0})</h4>
          {(data.imagingResults || []).length === 0 && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-3)' }}>Chưa có kết quả CĐHA</div>}
          {(data.imagingResults || []).map((ir) => (
            <div key={ir.orderId} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-10)', marginBottom: 'var(--space-8)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
                <b style={{ fontSize: 12.5 }}>{ir.serviceName}</b>
                <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{ir.serviceCode}</span>
                <span className="spacer" />
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{ir.resultDate ? new Date(ir.resultDate).toLocaleString('vi-VN') : 'Chưa có KQ'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
    {!loading && !data && <div style={{ padding: 'var(--space-20)', textAlign: 'center', color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Không có dữ liệu</div>}
  </ModalShell>
);
