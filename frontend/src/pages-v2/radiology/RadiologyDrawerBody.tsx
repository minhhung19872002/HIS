import React from 'react';
import type { RadiologyOrderDto, RadiologyResultDto } from '../../modules/radiology/api/ris';
import { StatusBadge } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import { CoReaderSection } from './CoReaderSection';
import { statusKey, statusTone, STATUS_TABS, detectModality, fmtHM, fmtDT } from './_shared';

export const RadiologyDrawerBody: React.FC<{ r: RadiologyOrderDto; result: RadiologyResultDto | null }> = ({ r, result }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || '';
  const m = detectModality(r.items?.[0]);

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span style={{
            padding: '2px 8px', background: m.color, color: '#fff',
            borderRadius: 'var(--r-1)', fontSize: 'var(--fs-xs)', fontWeight: 700,
            fontFamily: 'var(--font-mono)',
          }}>{m.v}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Tuổi · Giới</span><span>{r.age || '—'} tuổi · {r.gender || '—'}</span>
          <span>BS chỉ định</span><span>{r.orderDoctorName || '—'}</span>
          {r.diagnosis && (<><span>Chẩn đoán</span><span>{r.diagnosis}</span></>)}
          {r.clinicalInfo && (<><span>Lâm sàng</span><span>{r.clinicalInfo}</span></>)}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="image" size={11} /> KỸ THUẬT CĐHA ({r.items?.length || 0})</h5>
        {(r.items || []).map((it) => (
          <div key={it.id} style={{
            padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-10)', fontSize: 12.5,
          }}>
            <div>
              <b style={{ color: 'var(--t-0)' }}>{it.serviceName}</b>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>
                <span className="mono">{it.serviceCode}</span>
                {it.startTime && <> · Bắt đầu {fmtHM(it.startTime)}</>}
                {it.endTime && <> · Xong {fmtHM(it.endTime)}</>}
                {it.technicianName && <> · KTV {it.technicianName}</>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              {it.hasResult && <span className="chip ok">KQ</span>}
              {it.hasImages && <span className="chip info">DICOM</span>}
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div className="rec-section">
          <h5><TermIcon name="file-text" size={11} /> BÁO CÁO ĐỌC PHIM</h5>
          <div style={{
            padding: 'var(--space-14)', background: 'var(--d-1)',
            border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
            fontSize: 'var(--fs-md)', lineHeight: 1.6, color: 'var(--t-1)',
            whiteSpace: 'pre-wrap',
          }}>
            {result.description && (<><b>Mô tả:</b> {result.description}<br /><br /></>)}
            {result.conclusion && (<><b>Kết luận:</b> {result.conclusion}</>)}
            {!result.description && !result.conclusion && <span style={{ color: 'var(--t-3)' }}>Chưa có nội dung báo cáo</span>}
          </div>
          {result.approvedBy && (
            <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
              {result.approvedBy} · {fmtDT(result.approvedTime)}
            </div>
          )}
        </div>
      )}

      {/* #139 Co-Reader Section — hien thi neu co report */}
      {result && <CoReaderSection reportId={result.id} />}
    </>
  );
};
