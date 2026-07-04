import React from 'react';
import { Link } from 'react-router-dom';

/* ==========================================================================
   OPD Flow — status buckets + top departments
   ========================================================================== */

export const OpdFlow: React.FC<{
  flow: { waiting: number; inprog: number; done: number; skipped: number };
  byDept: { departmentId: string; departmentName: string; count: number }[];
}> = ({ flow, byDept }) => {
  const topDepts = byDept.slice(0, 6);
  const maxCount = Math.max(1, ...topDepts.map((d) => d.count));
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Luồng <b>khám bệnh</b></span>
        <span className="sub">· hôm nay</span>
        <div className="actions">
          <Link to="/v2/opd" className="btn sm">Mở OPD →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        <div className="flow">
          <div className="flow-step"><div className="flow-v">{flow.waiting}</div><div className="flow-l">Chờ khám</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step"><div className="flow-v">{flow.inprog}</div><div className="flow-l">Đang khám</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step done"><div className="flow-v">{flow.done}</div><div className="flow-l">Xong</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step"><div className="flow-v">{flow.skipped}</div><div className="flow-l">Bỏ</div></div>
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
