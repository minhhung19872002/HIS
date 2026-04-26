import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as labApi from '../api/laboratory';
import type { LabRequest, LabTestItem } from '../api/laboratory';
import './Laboratory.css';

// status: 0=Pending(ordered) 1=Collected 2=Processing 3=Completed 4=Approved 5=Verified
const STATUS_LABEL: Record<number, string> = {
  0: '○ CHỜ',
  1: '○ MẪU',
  2: '● CHẠY',
  3: '✓ XONG',
  4: '✓ DUYỆT',
  5: '✓ DUYỆT',
};

// priority: 0=Routine 1=Priority/Urgent 2=Stat/Emergency
const PRIO_LABEL: Record<number, string> = { 0: 'ROUTINE', 1: 'URGENT', 2: 'STAT' };
const PRIO_CLASS: Record<number, string> = { 0: 'prio-ROUTINE', 1: 'prio-URGENT', 2: 'prio-STAT' };

const STATUS_CLASS: Record<number, string> = {
  0: 'stat-pending',
  1: 'stat-pending',
  2: 'stat-running',
  3: 'stat-verified',
  4: 'stat-verified',
  5: 'stat-verified',
};

type ResultRow = { name: string; value: string; unit: string; ref: string; flag: '' | 'H' | 'L' | 'HH' };

function flagFor(test: LabTestItem): ResultRow['flag'] {
  if (!test.result) return '';
  const v = parseFloat(test.result);
  if (Number.isNaN(v)) return '';
  if (typeof test.criticalHigh === 'number' && v >= test.criticalHigh) return 'HH';
  if (typeof test.criticalLow === 'number' && v <= test.criticalLow) return 'HH';
  if (typeof test.normalMax === 'number' && v > test.normalMax) return 'H';
  if (typeof test.normalMin === 'number' && v < test.normalMin) return 'L';
  return '';
}

function abnormalCount(tests?: LabTestItem[]): number {
  if (!tests) return 0;
  return tests.filter((t) => {
    const f = flagFor(t);
    return f !== '';
  }).length;
}

function panelFrom(req: LabRequest): string {
  const names = (req.tests || []).map((t) => t.testName).filter(Boolean);
  if (names.length === 0) return req.requestedTests?.join(' · ') || '—';
  return names.slice(0, 3).join(' · ') + (names.length > 3 ? ` +${names.length - 3}` : '');
}

const LaboratoryV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [labs, setLabs]   = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel]     = useState<string>('');
  const [tab, setTab]     = useState<'all' | 'pending' | 'running' | 'verified' | 'stat'>('all');
  const [search, setSearch] = useState('');
  const [date, setDate]   = useState(() => dayjs());

  const reload = () => {
    setLoading(true);
    labApi.getLabRequests({ fromDate: date.format('YYYY-MM-DD') })
      .then((data) => {
        setLabs(data);
        if (data.length > 0 && !sel) setSel(data[0].id);
      })
      .catch(() => setLabs([]))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [date]);

  const counts = useMemo(() => ({
    all:      labs.length,
    pending:  labs.filter((l) => l.status <= 1).length,
    running:  labs.filter((l) => l.status === 2).length,
    verified: labs.filter((l) => l.status >= 3).length,
    stat:     labs.filter((l) => l.priority === 2).length,
  }), [labs]);

  const filtered = useMemo(() => {
    let src = labs;
    if (tab === 'pending')       src = src.filter((l) => l.status <= 1);
    else if (tab === 'running')  src = src.filter((l) => l.status === 2);
    else if (tab === 'verified') src = src.filter((l) => l.status >= 3);
    else if (tab === 'stat')     src = src.filter((l) => l.priority === 2);
    if (search.trim()) {
      const q = search.toLowerCase();
      src = src.filter((r) =>
        r.patientName.toLowerCase().includes(q)
        || r.patientCode.toLowerCase().includes(q)
        || r.requestCode.toLowerCase().includes(q),
      );
    }
    return src;
  }, [labs, tab, search]);

  const lab = useMemo(() => labs.find((x) => x.id === sel) || labs[0], [labs, sel]);
  const abnormal = abnormalCount(lab?.tests);

  // KPIs derived from data
  const tatTimes = labs
    .filter((l) => l.processingStartTime && l.processingEndTime)
    .map((l) => dayjs(l.processingEndTime).diff(dayjs(l.processingStartTime), 'minute'));
  const tatAvg = tatTimes.length > 0 ? Math.round(tatTimes.reduce((a, b) => a + b, 0) / tatTimes.length) : 0;
  const totalAbnormal = labs.reduce((a, l) => a + abnormalCount(l.tests), 0);

  const handleApprove = async () => {
    if (!lab) return;
    try {
      await labApi.completeProcessing(lab.id);
      message.success(`✓ Đã duyệt ${lab.requestCode}`);
      reload();
    } catch {
      message.error('Không thể duyệt kết quả');
    }
  };

  const resultRows: ResultRow[] = (lab?.tests || []).map((t) => ({
    name: t.testName,
    value: t.result ?? '—',
    unit: t.unit ?? '',
    ref: t.referenceRange ?? (t.normalMin !== undefined && t.normalMax !== undefined ? `${t.normalMin}–${t.normalMax}` : '—'),
    flag: flagFor(t),
  }));

  return (
    <div className="lis-wrap">
      {/* ====== TOP KPIs ====== */}
      <div className="lis-strip">
        <StripCell lbl={`Tổng XN ${date.isSame(dayjs(), 'day') ? 'hôm nay' : date.format('DD/MM')}`} val={counts.all} />
        <StripCell lbl="Đang chạy"          val={counts.running} cls="warn" />
        <StripCell lbl="STAT"               val={counts.stat} cls="crit" />
        <StripCell lbl="Đã duyệt"           val={counts.verified} />
        <StripCell lbl="TAT trung bình"     val={tatAvg} suffix="p" />
        <StripCell lbl="Bất thường"         val={totalAbnormal} suffix={counts.all > 0 ? `${Math.round((totalAbnormal / counts.all) * 100)}%` : ''} color="var(--s-warn)" />
      </div>

      <div className="lis-grid">
        {/* ====== LIST ====== */}
        <div className="lis-list">
          <div className="lis-toolbar">
            <div className="lis-tabs">
              {(['all', 'pending', 'running', 'verified', 'stat'] as const).map((k) => {
                const label = { all: 'Tất cả', pending: 'Chờ', running: 'Chạy', verified: 'Duyệt', stat: 'STAT' }[k];
                return (
                  <div
                    key={k}
                    className={'lis-tab ' + (tab === k ? 'on' : '')}
                    onClick={() => setTab(k)}
                  >{label} <span className="n">{counts[k]}</span></div>
                );
              })}
            </div>
            <input
              type="text" placeholder="Tìm mã XN / BN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                marginLeft: 8, height: 26, padding: '0 8px',
                fontSize: 12, border: '1px solid var(--line)',
                borderRadius: 'var(--r-2)', flex: '0 0 180px',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="opd-btn-sec"
                style={{ height: 28, padding: '0 10px' }}
                onClick={() => setDate(date.subtract(1, 'day'))}
              >←</button>
              <button
                className="opd-btn-sec"
                style={{ height: 28, padding: '0 10px' }}
                onClick={() => setDate(dayjs())}
              >Hôm nay</button>
              <button
                className="opd-btn-sec"
                style={{ height: 28, padding: '0 10px' }}
                onClick={reload}
              >⟳</button>
            </div>
          </div>

          <div className="lis-tbl-wrap">
            <table className="lis-tbl">
              <thead>
                <tr>
                  <th>Mã XN</th>
                  <th>Bệnh nhân</th>
                  <th>Panel</th>
                  <th>Khoa</th>
                  <th>Lấy mẫu</th>
                  <th>Máy</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>BT</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>Đang tải...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>
                    {labs.length === 0 ? 'Chưa có XN nào' : 'Không có XN ở bộ lọc này'}
                  </td></tr>
                ) : filtered.map((x) => {
                  const ab = abnormalCount(x.tests);
                  return (
                    <tr key={x.id} className={sel === x.id ? 'sel' : ''} onClick={() => setSel(x.id)}>
                      <td className="id">{x.requestCode}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{x.patientName}</div>
                        <div style={{ fontSize: 11, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>{x.patientCode}</div>
                      </td>
                      <td>{panelFrom(x)}</td>
                      <td>{x.departmentName || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {x.collectionTime ? dayjs(x.collectionTime).format('HH:mm') : '—'}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--t-2)' }}>{x.analyzer || '—'}</td>
                      <td><span className={'prio-stat ' + (PRIO_CLASS[x.priority] || 'prio-ROUTINE')}>{PRIO_LABEL[x.priority] || 'ROUTINE'}</span></td>
                      <td>
                        <span className={'prio-stat ' + (STATUS_CLASS[x.status] || 'stat-pending')}>
                          {STATUS_LABEL[x.status] || '—'}
                        </span>
                      </td>
                      <td>
                        {ab > 0 ? (
                          <span style={{ color: ab >= 2 ? 'var(--s-crit)' : 'var(--s-warn)' }}>
                            <span
                              className="ab"
                              style={{ background: ab >= 2 ? 'var(--s-crit)' : 'var(--s-warn)' }}
                            />
                            {ab}
                          </span>
                        ) : <span style={{ color: 'var(--t-3)' }}>0</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ====== DETAIL ====== */}
        <div className="lis-detail">
          {!lab ? (
            <div style={{ padding: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              Chọn một xét nghiệm trong danh sách
            </div>
          ) : (
            <>
              <div className="lis-detail-h">
                <div className="lis-detail-t">{panelFrom(lab)}</div>
                <div className="lis-detail-m">
                  <span><b>{lab.requestCode}</b></span>
                  <span>{lab.patientName} · <b>{lab.patientCode}</b></span>
                  {lab.dateOfBirth && <span>{dayjs().diff(dayjs(lab.dateOfBirth), 'year')}t</span>}
                  <span>Ưu tiên <b>{PRIO_LABEL[lab.priority]}</b></span>
                  {lab.analyzer && <span>Máy <b>{lab.analyzer}</b></span>}
                </div>
              </div>

              <div className="lis-status-bar">
                <span className="dot" />
                {lab.collectionTime && <><b>Nhận mẫu {dayjs(lab.collectionTime).format('HH:mm')}</b></>}
                {lab.processingStartTime && <> · Chạy {dayjs(lab.processingStartTime).format('HH:mm')}</>}
                {lab.processingEndTime && <> · <b>Xong {dayjs(lab.processingEndTime).format('HH:mm')}</b></>}
                {lab.status >= 4 && <> · <b>Đã duyệt</b></>}
              </div>

              <div className="lis-detail-body">
                <div className="lis-res-head">
                  <span>Chỉ số</span>
                  <span style={{ textAlign: 'right' }}>Kết quả</span>
                  <span>Tham chiếu</span>
                  <span style={{ textAlign: 'center' }}>Cờ</span>
                </div>
                {resultRows.length === 0 ? (
                  <div style={{ padding: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                    Chưa có kết quả
                  </div>
                ) : resultRows.map((r) => {
                  const cls = r.flag === 'HH' ? 'crit' : r.flag === 'H' || r.flag === 'L' ? 'warn' : '';
                  return (
                    <div key={r.name} className={'lis-res-row ' + cls}>
                      <span>{r.name}</span>
                      <span className="v">
                        {r.value} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t-2)' }}>{r.unit}</span>
                      </span>
                      <span className="ref">{r.ref}</span>
                      <span style={{ textAlign: 'center' }}>
                        {r.flag && <span className={'flag flag-' + r.flag}>{r.flag}</span>}
                      </span>
                    </div>
                  );
                })}

                {abnormal > 0 && (
                  <div style={{ padding: 14, borderTop: '1px solid var(--line)' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t-2)',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                    }}>Cảnh báo</div>
                    <div style={{
                      fontSize: 12, padding: 10, background: 'var(--d-1)',
                      border: '1px solid var(--line)', borderRadius: 'var(--r-2)', lineHeight: 1.55,
                    }}>
                      Có {abnormal} chỉ số bất thường — vui lòng đối chiếu lâm sàng và liên hệ BS chỉ định.
                    </div>
                  </div>
                )}
              </div>

              <div className="lis-detail-foot">
                <div className="lis-sign">
                  <div className="lis-sign-dr">
                    <b>{lab.collectorName || lab.doctorName || '—'}</b>
                    <span>{lab.requestCode} · {lab.processingEndTime ? dayjs(lab.processingEndTime).format('HH:mm') : '—'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="opd-btn-sec"
                    onClick={() => message.info(`⎙ In ${lab.requestCode}`)}
                  >⎙ In</button>
                  <button
                    className="opd-btn-sec"
                    onClick={() => message.success(`📧 Đã gửi ${lab.requestCode} tới BS`)}
                  >📧 Gửi BS</button>
                  <button
                    className="opd-btn-primary"
                    style={{ padding: '0 14px' }}
                    onClick={handleApprove}
                    disabled={lab.status >= 4}
                  >{lab.status >= 4 ? 'Đã duyệt' : '✓ Duyệt'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const StripCell: React.FC<{ lbl: string; val: number; cls?: string; suffix?: string; color?: string }> = ({ lbl, val, cls, suffix, color }) => (
  <div className={'lis-strip-cell ' + (cls || '')}>
    <span className="lbl">{lbl}</span>
    <span className="val" style={color ? { color } : undefined}>
      {val}
      {suffix && <span style={{ fontSize: 12, color: 'var(--t-3)', fontWeight: 400, marginLeft: 4 }}>{suffix}</span>}
    </span>
  </div>
);

export default LaboratoryV2;
