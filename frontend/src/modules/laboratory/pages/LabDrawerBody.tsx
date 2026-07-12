import React from 'react';
import dayjs from 'dayjs';
import TermIcon from '../../../components/layout/terminal/Icon';
import { StatusBadge } from '../../../pages-v2/_v2kit';
import type { LabRequest } from '../api/laboratory';
import {
  STATUS_TABS, statusKey, statusTone, abnormalCount,
  PRIO_LABEL, PRIO_TONE, flagFor, FLAG_COLOR, fmtDT,
} from './_shared';

export const LabDrawerBody: React.FC<{ r: LabRequest }> = ({ r }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || '';
  const ab = abnormalCount(r.tests);

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
            Ưu tiên&nbsp;
            <span className={`chip ${PRIO_TONE[r.priority] || 'info'}`}>{PRIO_LABEL[r.priority] || 'ROUTINE'}</span>
          </span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono ab-u-accent">{r.patientCode}</span>
          <span>Ngày sinh</span>
          <span>{r.dateOfBirth ? dayjs(r.dateOfBirth).format('DD/MM/YYYY') : '—'}{r.dateOfBirth && ` · ${dayjs().diff(dayjs(r.dateOfBirth), 'year')}t`}</span>
          <span>Giới tính</span><span>{r.gender === 1 ? 'Nam' : r.gender === 2 ? 'Nữ' : '—'}</span>
          <span>BS chỉ định</span><span>{r.doctorName || '—'}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="flask" size={11} /> THÔNG TIN MẪU</h5>
        <div className="rec-kv">
          <span>Loại mẫu</span><span>{r.sampleType || '—'}</span>
          <span>Barcode</span><span className="mono">{r.sampleBarcode || '—'}</span>
          <span>Máy phân tích</span><span className="mono">{r.analyzer || '—'}</span>
          <span>CĐ lúc</span><span>{fmtDT(r.requestDate)}</span>
          {r.collectionTime && (<><span>Lấy mẫu lúc</span><span>{fmtDT(r.collectionTime)} · {r.collectorName || '—'}</span></>)}
          {r.processingStartTime && (<><span>Bắt đầu chạy</span><span>{fmtDT(r.processingStartTime)}</span></>)}
          {r.processingEndTime && (<><span>Hoàn thành</span><span>{fmtDT(r.processingEndTime)}</span></>)}
        </div>
      </div>

      {(r.tests || []).length > 0 && (
        <div className="rec-section">
          <h5><TermIcon name="activity" size={11} /> KẾT QUẢ {ab > 0 && <span className="chip warn" style={{ marginLeft: 'var(--space-6)' }}>{ab} bất thường</span>}</h5>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 50px',
            fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', fontWeight: 600,
            padding: '6px 0', borderBottom: '1px solid var(--line-soft)', letterSpacing: 0.4,
          }}>
            <span>Chỉ số</span>
            <span style={{ textAlign: 'right' }}>Kết quả</span>
            <span>Tham chiếu</span>
            <span style={{ textAlign: 'center' }}>Cờ</span>
          </div>
          {(r.tests || []).map((t) => {
            const flag = flagFor(t);
            const topColor = FLAG_COLOR[flag] || 'var(--t-0)';
            const hasParams = t.parameters && t.parameters.length > 0;
            return (
              <React.Fragment key={t.id}>
                {/* Dòng tổng hợp của xét nghiệm */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 50px',
                  padding: '8px 0', borderBottom: hasParams ? 'none' : '1px solid var(--line-soft)',
                  fontSize: 12.5, alignItems: 'center',
                }}>
                  <span style={{ fontWeight: hasParams ? 600 : 400 }}>{t.testName}</span>
                  <span className="mono" style={{ textAlign: 'right', color: topColor, fontWeight: 600 }}>
                    {hasParams ? '' : (t.result || '—')}
                    {!hasParams && t.unit && <small style={{ marginLeft: 'var(--space-3)', color: 'var(--t-2)', fontWeight: 400 }}>{t.unit}</small>}
                  </span>
                  <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                    {!hasParams && (t.referenceRange || (t.normalMin !== undefined && t.normalMax !== undefined ? `${t.normalMin}–${t.normalMax}` : '—'))}
                  </span>
                  <span style={{ textAlign: 'center' }}>
                    {!hasParams && flag && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 'var(--r-1)',
                        background: topColor, color: '#fff', fontSize: 'var(--fs-xxs)', fontWeight: 700,
                      }}>{flag}</span>
                    )}
                  </span>
                </div>
                {/* R1: Bảng per-parameter nếu có */}
                {hasParams && (
                  <div style={{
                    marginLeft: 'var(--space-12)', marginBottom: 'var(--space-6)',
                    borderLeft: '2px solid var(--line-soft)',
                    paddingLeft: 'var(--space-8)',
                  }}>
                    {t.parameters!.map((p, pi) => {
                      const pFlag = p.flag ?? '';
                      const pColor = FLAG_COLOR[pFlag] || 'var(--t-0)';
                      const pRef = p.refRange || (p.refMin != null && p.refMax != null
                        ? `${p.refMin}–${p.refMax}`
                        : p.refMin != null ? `≥${p.refMin}`
                        : p.refMax != null ? `≤${p.refMax}` : '—');
                      return (
                        <div key={pi} style={{
                          display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 50px',
                          padding: '5px 0', borderBottom: '1px solid var(--line-soft)',
                          fontSize: 'var(--fs-sm)', alignItems: 'center',
                        }}>
                          <span style={{ color: 'var(--t-1)' }}>{p.parameterName || p.parameterCode}</span>
                          <span className="mono" style={{ textAlign: 'right', color: pColor, fontWeight: pFlag && pFlag !== 'N' ? 700 : 400 }}>
                            {p.value ?? '—'}
                            {p.unit && <small style={{ marginLeft: 'var(--space-3)', color: 'var(--t-2)', fontWeight: 400 }}>{p.unit}</small>}
                          </span>
                          <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{pRef}</span>
                          <span style={{ textAlign: 'center' }}>
                            {pFlag && pFlag !== 'N' && (
                              <span style={{
                                padding: '1px 5px', borderRadius: 'var(--r-1)',
                                background: pColor, color: '#fff', fontSize: 'var(--fs-xxs)', fontWeight: 700,
                              }}>{pFlag}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {r.clinicalInfo && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> THÔNG TIN LÂM SÀNG</h5>
          <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.clinicalInfo}</div>
        </div>
      )}
    </>
  );
};
