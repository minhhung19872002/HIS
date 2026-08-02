import React from 'react';
import { Link } from 'react-router-dom';
import type { OpdFlowStatsDto } from '../../../reception/api/reception';

/* ==========================================================================
   OPD Flow — 7 trạng thái chuẩn MQSoft (#459) + top departments
   ========================================================================== */

// Thứ tự + nhãn + màu theo 7 bước MQSoft: Đăng ký → Chưa khám → Đang khám →
// Đang CLS → Có KQ CLS → Khám xong → Thanh toán xong.
const FLOW_STEPS: { key: keyof OpdFlowStatsDto; label: string; color: string }[] = [
  { key: 'registered',     label: 'Đăng ký',        color: 'var(--t-2)' },
  { key: 'waiting',        label: 'Chưa khám',      color: 'var(--a-am, #d97706)' },
  { key: 'inProgress',     label: 'Đang khám',      color: 'var(--a-cy)' },
  { key: 'waitingCls',     label: 'Đang CLS',       color: 'var(--a-vi, #7c3aed)' },
  { key: 'clsResultReady', label: 'Có KQ CLS',      color: 'var(--a-bl, #2563eb)' },
  { key: 'completed',      label: 'Khám xong',      color: 'var(--a-gr, #16a34a)' },
  { key: 'paid',           label: 'TT xong',        color: 'var(--a-gr, #16a34a)' },
];

export const OpdFlow: React.FC<{
  flow: OpdFlowStatsDto;
  byDept: { departmentId: string; departmentName: string; count: number }[];
}> = ({ flow, byDept }) => {
  const topDepts = byDept.slice(0, 6);
  const maxCount = Math.max(1, ...topDepts.map((d) => d.count));
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Luồng <b>khám bệnh</b></span>
        <span className="sub">· hôm nay · 7 trạng thái</span>
        <div className="actions">
          <Link to="/v2/opd" className="btn sm">Mở OPD →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        <div className="flow" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          {FLOW_STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <div className="flow-arr">→</div>}
              <div className={`flow-step${s.key === 'paid' ? ' done' : ''}`}>
                <div className="flow-v" style={{ color: s.color }}>{flow[s.key]}</div>
                <div className="flow-l">{s.label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
        {topDepts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Chưa có dữ liệu khoa phòng
          </div>
        ) : (
          <div className="opd-depts">
            {topDepts.map((d) => {
              const pct = (d.count / maxCount) * 100;
              return (
                <div key={d.departmentId} className="dept-row">
                  <span className="dept-n" title={d.departmentName}>{d.departmentName}</span>
                  <div className="dept-bar">
                    <div className="dept-bar-fill" style={{ width: `${pct}%`, background: 'var(--a-cy)' }} />
                  </div>
                  <span className="dept-v">{d.count}</span>
                  <span className="dept-w">—</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
