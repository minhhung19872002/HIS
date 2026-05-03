import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as risApi from '../api/ris';
import type { RadiologyOrderDto, RadiologyResultDto, RadiologyOrderItemDto } from '../api/ris';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   RIS v2 — port of design-system-v2/his/project/RIS v2.html
   ──────────────────────────────────────────────────────────── */

type StatusKey = 'scheduled' | 'imaging' | 'reading' | 'reported' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch',  tone: 'info' },
  { v: 'imaging',   l: 'Đang chụp',    tone: 'warn' },
  { v: 'reading',   l: 'Chờ đọc phim', tone: 'warn' },
  { v: 'reported',  l: 'Đã đọc',       tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',          tone: 'crit' },
];

const MODALITIES: { v: string; l: string; color: string }[] = [
  { v: 'XR',  l: 'X-Quang',       color: '#0891b2' },
  { v: 'CT',  l: 'CT-Scanner',    color: '#7c3aed' },
  { v: 'MRI', l: 'Cộng hưởng từ', color: '#db2777' },
  { v: 'US',  l: 'Siêu âm',       color: '#16a34a' },
  { v: 'MAM', l: 'Nhũ ảnh',       color: '#ea580c' },
];

const detectModality = (item?: RadiologyOrderItemDto): { v: string; color: string } => {
  const t = (item?.serviceType || item?.serviceCode || '').toUpperCase();
  if (t.includes('CT'))   return { v: 'CT',  color: '#7c3aed' };
  if (t.includes('MRI'))  return { v: 'MRI', color: '#db2777' };
  if (t.includes('US') || t.includes('SIEU') || t.includes('SIÊU')) return { v: 'US', color: '#16a34a' };
  if (t.includes('MAM')) return { v: 'MAM', color: '#ea580c' };
  return { v: 'XR', color: '#0891b2' };
};

const statusKey = (s: string): StatusKey => {
  const x = (s || '').toLowerCase();
  if (x.includes('cancel') || x.includes('hủy')) return 'cancelled';
  if (x.includes('read') || x.includes('xong') || x.includes('approve') || x.includes('duyệt') || x.includes('reported')) return 'reported';
  if (x.includes('reading') || x.includes('chờ đọc')) return 'reading';
  if (x.includes('imaging') || x.includes('progress') || x.includes('chạy') || x.includes('đang')) return 'imaging';
  return 'scheduled';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const fmtHM = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';

const RadiologyV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<RadiologyOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fMod, setFMod] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<RadiologyOrderDto | null>(null);
  const [result, setResult] = useState<RadiologyResultDto | null>(null);
  const [date, setDate] = useState(() => dayjs());
  const PAGE_SIZE = 18;

  const reload = () => {
    setLoading(true);
    risApi.getRadiologyOrders(
      date.subtract(7, 'day').format('YYYY-MM-DD'),
      date.format('YYYY-MM-DD'),
    )
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [date]);

  // Load full result when drawer opens
  useEffect(() => {
    setResult(null);
    if (!detail) return;
    const firstItem = detail.items?.[0];
    if (!firstItem?.hasResult) return;
    risApi.getRadiologyResult(firstItem.id)
      .then((r) => setResult(r.data || null))
      .catch(() => setResult(null));
  }, [detail]);

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
      if (fMod) {
        const m = detectModality(r.items?.[0]);
        if (m.v !== fMod) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.patientName, r.patientCode, r.orderCode, r.diagnosis,
          ...(r.items || []).map((i) => i.serviceName)].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, fMod, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const kpis = useMemo(() => {
    const reading  = rows.filter((r) => statusKey(r.status) === 'reading').length;
    const reported = rows.filter((r) => statusKey(r.status) === 'reported').length;
    const imaging  = rows.filter((r) => statusKey(r.status) === 'imaging').length;
    const ctScans  = rows.filter((r) => detectModality(r.items?.[0]).v === 'CT').length;
    return {
      total: rows.length,
      reading,
      reported,
      imaging,
      ctScans,
      modalities: MODALITIES.length,
    };
  }, [rows]);

  const columns: ColumnDef<RadiologyOrderDto>[] = [
    { key: 'code', label: 'Mã RIS', width: 130, mono: true, render: (r) => r.orderCode },
    { key: 'time', label: 'Giờ', mono: true, width: 70, render: (r) => fmtHM(r.orderDate) },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {r.age || '—'}t · {r.gender || '—'}</i>
        </div>
      ),
    },
    {
      key: 'mod', label: 'Modality', width: 80,
      render: (r) => {
        const m = detectModality(r.items?.[0]);
        return (
          <span style={{
            display: 'inline-block', padding: '2px 8px',
            background: m.color, color: '#fff', borderRadius: 3,
            fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
          }}>{m.v}</span>
        );
      },
    },
    {
      key: 'proc', label: 'Kỹ thuật',
      render: (r) => {
        const items = r.items || [];
        const first = items[0];
        return (
          <div className="cell-2l">
            <b>{first?.serviceName || '—'}</b>
            <i className="mono">{first?.serviceCode || ''}{items.length > 1 && ` +${items.length - 1}`}</i>
          </div>
        );
      },
    },
    { key: 'reason', label: 'Lý do CĐ', render: (r) => r.diagnosis || r.clinicalInfo || '—' },
    { key: 'doctor', label: 'BS chỉ định', width: 150, render: (r) => r.orderDoctorName || '—' },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  const onPrint = () => message.success('Đã gửi máy in');
  const onViewer = (r: RadiologyOrderDto) => {
    const firstItem = r.items?.[0];
    if (!firstItem) { message.warning('Không có ảnh DICOM'); return; }
    message.info('Mở DICOM Viewer (TODO)');
  };

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng ca', val: kpis.total, sub: 'gần đây' },
          { lbl: 'Chờ đọc phim', val: kpis.reading, sub: 'backlog', tone: 'warn' },
          {
            lbl: 'Đã có KQ', val: kpis.reported,
            sub: kpis.total > 0 ? `${Math.round(kpis.reported / kpis.total * 100)}%` : '—',
            tone: 'ok',
          },
          { lbl: 'Đang chụp', val: kpis.imaging, sub: 'tại các phòng', tone: 'warn' },
          { lbl: 'CT/MRI', val: kpis.ctScans, sub: 'cần chuẩn bị', tone: 'info' },
          { lbl: 'Modality', val: kpis.modalities, sub: 'loại máy' },
        ]}
      />

      <div className="ab-tools">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm BN, mã RIS, kỹ thuật, chẩn đoán…"
        />
        <Filter
          value={fMod} onChange={setFMod}
          options={MODALITIES.map((m) => ({ v: m.v, l: `${m.v} · ${m.l}` }))}
          placeholder="▾ Modality"
        />
        <button type="button" className="ab-btn ghost" onClick={() => { setSearch(''); setFMod(''); setStab('all'); }}>
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
        <button type="button" className="ab-btn ghost" onClick={() => message.info('TODO: DICOM Worklist')}>
          <TermIcon name="image" size={12} /> DICOM
        </button>
        <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Tạo chỉ định CĐHA')}>
          <TermIcon name="plus" size={12} /> Chỉ định <kbd>F2</kbd>
        </button>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<RadiologyOrderDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => (
          <div className="ab-actions">
            {r.items?.[0]?.hasResult && (
              <ActBtn ic="eye" title="Xem KQ" onClick={() => setDetail(r)} />
            )}
            {r.items?.[0]?.hasImages && (
              <ActBtn ic="image" title="Xem ảnh DICOM" onClick={() => onViewer(r)} />
            )}
            <ActBtn ic="print" title="In phiếu" onClick={onPrint} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có ca CĐHA nào</div>
          </div>
        )}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{detail.orderCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.patientCode} · ${detail.departmentName || '—'} · ${fmtDT(detail.orderDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="ab-btn" onClick={onPrint}>
              <TermIcon name="print" size={12} /> In phiếu
            </button>
            {detail.items?.[0]?.hasImages && (
              <button type="button" className="ab-btn primary" onClick={() => onViewer(detail)}>
                <TermIcon name="image" size={12} /> Xem ảnh DICOM
              </button>
            )}
          </>
        ) : null}
      >
        {detail && <RadiologyDrawerBody r={detail} result={result} />}
      </DrawerShell>
    </div>
  );
};

const RadiologyDrawerBody: React.FC<{ r: RadiologyOrderDto; result: RadiologyResultDto | null }> = ({ r, result }) => {
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
            borderRadius: 3, fontSize: 11, fontWeight: 700,
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
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, fontSize: 12.5,
          }}>
            <div>
              <b style={{ color: 'var(--t-0)' }}>{it.serviceName}</b>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>
                <span className="mono">{it.serviceCode}</span>
                {it.startTime && <> · Bắt đầu {fmtHM(it.startTime)}</>}
                {it.endTime && <> · Xong {fmtHM(it.endTime)}</>}
                {it.technicianName && <> · KTV {it.technicianName}</>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
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
            padding: 14, background: 'var(--d-1)',
            border: '1px solid var(--line)', borderRadius: 6,
            fontSize: 13, lineHeight: 1.6, color: 'var(--t-1)',
            whiteSpace: 'pre-wrap',
          }}>
            {result.description && (<><b>Mô tả:</b> {result.description}<br /><br /></>)}
            {result.conclusion && (<><b>Kết luận:</b> {result.conclusion}</>)}
            {!result.description && !result.conclusion && <span style={{ color: 'var(--t-3)' }}>Chưa có nội dung báo cáo</span>}
          </div>
          {result.approvedBy && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--t-2)' }}>
              {result.approvedBy} · {fmtDT(result.approvedTime)}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default RadiologyV2;
