import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as labApi from '../api/laboratory';
import type { LabRequest, LabTestItem } from '../api/laboratory';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Lab v2 (LIS) — port of design-system-v2/his/project/LIS v2.html
   Layout: KpiStrip + filter toolbar + StatusTabs + DataTable + Drawer
   ──────────────────────────────────────────────────────────── */

type StatusKey = 'ordered' | 'collected' | 'running' | 'verified' | 'rejected';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'ordered',   l: 'Đã chỉ định', tone: 'info' },
  { v: 'collected', l: 'Đã lấy mẫu',  tone: 'warn' },
  { v: 'running',   l: 'Đang chạy',   tone: 'warn' },
  { v: 'verified',  l: 'Đã duyệt',    tone: 'ok' },
  { v: 'rejected',  l: 'Từ chối mẫu', tone: 'crit' },
];

// Backend Status mapping:
// 0 Pending(ordered) | 1 Collected | 2 Processing | 3 Completed | 4 Approved | 5 Verified
const statusKey = (s: number): StatusKey => {
  if (s === 0) return 'ordered';
  if (s === 1) return 'collected';
  if (s === 2) return 'running';
  if (s >= 3) return 'verified';
  return 'ordered';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const PRIO_LABEL: Record<number, string> = { 0: 'ROUTINE', 1: 'URGENT', 2: 'STAT' };
const PRIO_TONE: Record<number, 'ok' | 'warn' | 'crit'> = { 0: 'ok', 1: 'warn', 2: 'crit' };

const flagFor = (test: LabTestItem): '' | 'H' | 'L' | 'HH' => {
  if (!test.result) return '';
  const v = parseFloat(test.result);
  if (Number.isNaN(v)) return '';
  if (typeof test.criticalHigh === 'number' && v >= test.criticalHigh) return 'HH';
  if (typeof test.criticalLow === 'number' && v <= test.criticalLow) return 'HH';
  if (typeof test.normalMax === 'number' && v > test.normalMax) return 'H';
  if (typeof test.normalMin === 'number' && v < test.normalMin) return 'L';
  return '';
};
const abnormalCount = (tests?: LabTestItem[]): number =>
  (tests || []).filter((t) => flagFor(t) !== '').length;

const fmtHM = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';

const LaboratoryV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [rows, setRows]   = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab]   = useState<StatusKey | 'all'>('all');
  const [fGroup, setFGroup] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage]   = useState(0);
  const [detail, setDetail] = useState<LabRequest | null>(null);
  const [date, setDate]   = useState(() => dayjs());
  const PAGE_SIZE = 18;

  const reload = () => {
    setLoading(true);
    labApi.getLabRequests({ fromDate: date.format('YYYY-MM-DD') })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [date]);

  const groupOpts = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => (r.tests || []).forEach((t) => t.testGroup && set.add(t.testGroup)));
    return Array.from(set).map((g) => ({ v: g, l: g }));
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = rows.filter((r) => statusKey(r.status) === s.v).length;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fGroup && !(r.tests || []).some((t) => t.testGroup === fGroup)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.patientName, r.patientCode, r.requestCode, r.sampleBarcode].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, fGroup, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPIs
  const kpis = useMemo(() => {
    const verified = rows.filter((r) => r.status >= 3).length;
    const pending  = rows.filter((r) => r.status >= 0 && r.status <= 2).length;
    const stat     = rows.filter((r) => r.priority === 2).length;
    const totalAbnormal = rows.reduce((a, r) => a + abnormalCount(r.tests), 0);
    const tatTimes = rows
      .filter((l) => l.processingStartTime && l.processingEndTime)
      .map((l) => dayjs(l.processingEndTime).diff(dayjs(l.processingStartTime), 'minute'));
    const tat = tatTimes.length > 0 ? Math.round(tatTimes.reduce((a, b) => a + b, 0) / tatTimes.length) : 0;
    return { total: rows.length, verified, pending, stat, abnormal: totalAbnormal, tat };
  }, [rows]);

  const onApprove = async (r: LabRequest) => {
    try {
      await labApi.completeProcessing(r.id);
      message.success(`Đã duyệt ${r.requestCode}`);
      reload();
    } catch {
      message.error('Duyệt thất bại');
    }
  };

  const onCollect = async (r: LabRequest) => {
    try {
      await labApi.collectSample(r.id, { collectionTime: new Date().toISOString() });
      message.success(`Đã ghi nhận lấy mẫu · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Ghi nhận thất bại');
    }
  };

  const columns: ColumnDef<LabRequest>[] = [
    {
      key: 'code', label: 'Mã XN', width: 140,
      render: (r) => (
        <span>
          <span className="mono">{r.requestCode}</span>
          {r.priority === 2 && (
            <span style={{
              marginLeft: 6, padding: '1px 5px',
              background: 'var(--s-crit-bg, #fee2e2)', border: '1px solid #fca5a5',
              color: 'var(--s-crit, #b91c1c)', borderRadius: 3,
              fontSize: 9, fontWeight: 700,
            }}>STAT</span>
          )}
        </span>
      ),
    },
    { key: 'time', label: 'CĐ lúc', mono: true, width: 70, render: (r) => fmtHM(r.requestDate) },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}</i>
        </div>
      ),
    },
    {
      key: 'panel', label: 'Xét nghiệm',
      render: (r) => {
        const names = (r.tests || []).map((t) => t.testName).filter(Boolean);
        const display = names.length === 0 ? (r.requestedTests?.join(' · ') || '—') :
          names.slice(0, 3).join(' · ') + (names.length > 3 ? ` +${names.length - 3}` : '');
        const groups = Array.from(new Set((r.tests || []).map((t) => t.testGroup).filter(Boolean))).slice(0, 2).join(', ');
        return (
          <div className="cell-2l">
            <b>{display}</b>
            {groups && <i className="mono">{groups}</i>}
          </div>
        );
      },
    },
    { key: 'sample', label: 'Mẫu', width: 110, render: (r) => r.sampleType || '—' },
    { key: 'collect', label: 'Lấy mẫu', mono: true, width: 80, render: (r) => fmtHM(r.collectionTime) },
    { key: 'machine', label: 'Máy', width: 110, mono: true, render: (r) => r.analyzer || '—' },
    {
      key: 'priority', label: 'Ưu tiên', width: 90,
      render: (r) => (
        <span className={`chip ${PRIO_TONE[r.priority] || 'info'}`}>{PRIO_LABEL[r.priority] || 'ROUTINE'}</span>
      ),
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
    {
      key: 'abnormal', label: 'BT', width: 60,
      render: (r) => {
        const ab = abnormalCount(r.tests);
        return ab > 0 ? (
          <span className="chip warn mono">{ab}</span>
        ) : (
          <span style={{ color: 'var(--t-3)' }}>0</span>
        );
      },
    },
  ];

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng XN', val: kpis.total, sub: date.isSame(dayjs(), 'day') ? 'hôm nay' : date.format('DD/MM') },
          {
            lbl: 'Đã duyệt', val: kpis.verified,
            sub: kpis.total > 0 ? `${Math.round(kpis.verified / kpis.total * 100)}%` : '—',
            tone: 'ok',
          },
          { lbl: 'Đang chờ', val: kpis.pending, sub: 'trong quy trình', tone: 'warn' },
          { lbl: 'Bất thường', val: kpis.abnormal, sub: 'H/L flags', tone: 'crit' },
          { lbl: 'STAT', val: kpis.stat, sub: 'ưu tiên', tone: 'crit' },
          { lbl: 'TAT', val: kpis.tat, unit: 'p', sub: 'TB', tone: 'ok' },
        ]}
      />

      <div className="ab-tools">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm BN, mã XN, barcode mẫu…"
        />
        <Filter value={fGroup} onChange={setFGroup} options={groupOpts} placeholder="▾ Nhóm XN" />
        <button type="button" className="ab-btn ghost" onClick={() => { setSearch(''); setFGroup(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </button>
        <button type="button" className="ab-btn ghost" onClick={() => setDate(date.subtract(1, 'day'))}>
          <TermIcon name="chevronL" size={12} />
        </button>
        <button type="button" className="ab-btn ghost" onClick={() => setDate(dayjs())}>Hôm nay</button>
        <button type="button" className="ab-btn ghost" onClick={() => setDate(date.add(1, 'day'))}>
          <TermIcon name="chevronR" size={12} />
        </button>
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </button>
        <button type="button" className="ab-btn ghost" onClick={() => message.info('TODO: Xem QC chart')}>
          <TermIcon name="chart" size={12} /> QC hôm nay
        </button>
        <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Tạo chỉ định mới')}>
          <TermIcon name="plus" size={12} /> Chỉ định <kbd>F2</kbd>
        </button>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<LabRequest>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => {
          const sk = statusKey(r.status);
          return (
            <div className="ab-actions">
              {sk === 'ordered' && (
                <ActBtn ic="check" title="Đánh dấu đã lấy mẫu" onClick={() => onCollect(r)} />
              )}
              {sk === 'running' && (
                <ActBtn ic="check" title="Duyệt kết quả" onClick={() => onApprove(r)} />
              )}
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
              <ActBtn ic="print" title="In phiếu" onClick={() => message.success('Đã gửi máy in')} />
            </div>
          );
        }}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có xét nghiệm nào</div>
          </div>
        )}
      />

      <Pager
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        total={filtered.length}
        perPage={PAGE_SIZE}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{detail.requestCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.patientCode} · ${detail.departmentName || '—'} · ${fmtDT(detail.requestDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="ab-btn" onClick={() => message.success('Đã in phiếu KQ')}>
              <TermIcon name="print" size={12} /> In phiếu
            </button>
            {statusKey(detail.status) === 'running' && (
              <button type="button" className="ab-btn primary" onClick={() => { onApprove(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Duyệt KQ
              </button>
            )}
          </>
        ) : null}
      >
        {detail && <LabDrawerBody r={detail} />}
      </DrawerShell>
    </div>
  );
};

const LabDrawerBody: React.FC<{ r: LabRequest }> = ({ r }) => {
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
          <span style={{ fontSize: 11, color: 'var(--t-2)' }}>
            Ưu tiên&nbsp;
            <span className={`chip ${PRIO_TONE[r.priority] || 'info'}`}>{PRIO_LABEL[r.priority] || 'ROUTINE'}</span>
          </span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
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
          <h5><TermIcon name="activity" size={11} /> KẾT QUẢ {ab > 0 && <span className="chip warn" style={{ marginLeft: 6 }}>{ab} bất thường</span>}</h5>
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
            const color = flag === 'HH' ? 'var(--s-crit)' : flag === 'H' || flag === 'L' ? '#d97706' : 'var(--t-0)';
            return (
              <div key={t.id} style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 50px',
                padding: '8px 0', borderBottom: '1px solid var(--line-soft)',
                fontSize: 12.5, alignItems: 'center',
              }}>
                <span>{t.testName}</span>
                <span className="mono" style={{ textAlign: 'right', color, fontWeight: 600 }}>
                  {t.result || '—'}
                  {t.unit && <small style={{ marginLeft: 3, color: 'var(--t-2)', fontWeight: 400 }}>{t.unit}</small>}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>
                  {t.referenceRange || (t.normalMin !== undefined && t.normalMax !== undefined ? `${t.normalMin}–${t.normalMax}` : '—')}
                </span>
                <span style={{ textAlign: 'center' }}>
                  {flag && (
                    <span style={{
                      padding: '1px 6px', borderRadius: 3,
                      background: flag === 'HH' ? 'var(--s-crit)' : color,
                      color: '#fff', fontSize: 10, fontWeight: 700,
                    }}>{flag}</span>
                  )}
                </span>
              </div>
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

export default LaboratoryV2;
