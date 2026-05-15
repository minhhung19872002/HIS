import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, Filter, StatusBadge,
  DrawerShell, ModalShell, ActBtn, DrSec, DrField,
  type ColumnDef, type TopTab, type KpiItem, tk, te
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  npGateway, nphGateway,
  type NationalPrescriptionSubmissionDto,
  type NationalPrescriptionSubmissionDetailDto,
  type NationalPharmacyOutboundReportDto,
  type NationalPharmacyOutboundReportDetailDto,
  type NationalGatewayConfigDto
} from '../api/nangcap23';

type TabKey = 'rx' | 'pharm' | 'cfg';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'rx',    l: 'Đơn thuốc QG', ic: 'pill' },
  { v: 'pharm', l: 'Dược QG',      ic: 'archive' },
  { v: 'cfg',   l: 'Cấu hình',     ic: 'settings' },
];

const fmtDT = (s?: string) => s ? dayjs(s).format('DD/MM/YYYY HH:mm') : '—';

const toneOfStatus = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
  s === 2 ? 'ok' : s === 1 ? 'warn' : s === 3 ? 'crit' : 'info';

const NationalGatewaysV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('rx');
  return (
    <div className="ab-stack" data-testid="national-gateways-page">
      <TopTabs tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'rx' && <PrescriptionPanel />}
      {tab === 'pharm' && <PharmacyPanel />}
      {tab === 'cfg' && <ConfigPanel />}
    </div>
  );
};

// ────────────────────────── Prescription panel ──────────────────────────

const PrescriptionPanel: React.FC = () => {
  const [rows, setRows] = useState<NationalPrescriptionSubmissionDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [detail, setDetail] = useState<NationalPrescriptionSubmissionDetailDto | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await npGateway.search({
        keyword: keyword.trim() || undefined,
        status: status !== '' ? Number(status) : undefined,
        pageSize: 100
      });
      setRows(data || []);
    } catch { te('Không tải được danh sách'); }
  }, [keyword, status]);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo<KpiItem[]>(() => [
    { lbl: 'Tổng', val: rows.length },
    { lbl: 'Cổng xác nhận', val: rows.filter(r => r.status === 2).length, tone: 'ok' },
    { lbl: 'Đang chờ', val: rows.filter(r => r.status === 1).length, tone: 'warn' },
    { lbl: 'Lỗi/Từ chối', val: rows.filter(r => r.status === 3).length, tone: 'crit' },
  ], [rows]);

  const columns: ColumnDef<NationalPrescriptionSubmissionDto>[] = [
    { key: 'code', label: 'Mã giao dịch', mono: true, width: 220, render: r => r.submissionCode },
    { key: 'prx',  label: 'Đơn thuốc', render: r => (
      <div><b>{r.prescriptionCode || '—'}</b><br /><span style={{ color: 'var(--t-2)' }}>{r.patientName || '—'}</span></div>
    )},
    { key: 'doctor', label: 'BS / CCHN', width: 200, render: r => (
      <div><b>{r.doctorIdNumber}</b><br /><span className="mono" style={{ color: 'var(--t-2)' }}>{r.doctorLicenseNumber}</span></div>
    )},
    { key: 'type', label: 'Loại đơn', width: 130, render: r => r.prescriptionType },
    { key: 'sub', label: 'Gửi lúc', mono: true, width: 140, render: r => fmtDT(r.submittedAt) },
    { key: 'st', label: 'Trạng thái', width: 160, render: r =>
      <StatusBadge tone={toneOfStatus(r.status)} dot>{r.statusName}</StatusBadge>
    },
  ];

  const actions = (r: NationalPrescriptionSubmissionDto) => (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {r.status !== 2 && r.status !== 4 && (
        <ActBtn ic="rotate-cw" title="Gửi lại" onClick={async () => {
          try { await npGateway.retry(r.id); tk('Đã gửi lại'); load(); }
          catch { te('Gửi lại thất bại'); }
        }} />
      )}
      {r.status !== 4 && (
        <ActBtn ic="x" title="Hủy" tone="crit" onClick={async () => {
          try { await npGateway.cancel(r.id); tk('Đã hủy'); load(); }
          catch { te('Hủy thất bại'); }
        }} />
      )}
    </span>
  );

  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm mã giao dịch / CCCD BN / BS…" minWidth={320} />
        <Filter value={status} onChange={setStatus} placeholder="— Trạng thái —" options={[
          { v: '0', l: 'Nháp' }, { v: '1', l: 'Đã gửi' }, { v: '2', l: 'Cổng xác nhận' }, { v: '3', l: 'Bị từ chối' }, { v: '4', l: 'Đã hủy' }
        ]} />
        <button type="button" className="ab-btn" onClick={() => load()}>
          <TermIcon name="rotate-cw" size={12} /> Tải lại
        </button>
      </div>
      <DataTable<NationalPrescriptionSubmissionDto>
        data={rows} rowKey={r => r.id} columns={columns} actions={actions}
        onRowClick={async r => {
          try { setDetail(await npGateway.get(r.id)); }
          catch { te('Không tải được chi tiết'); }
        }}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={`Đơn thuốc QG — ${detail?.submissionCode || ''}`}>
        {detail && (
          <>
            <DrSec title="THÔNG TIN GIAO DỊCH">
              <DrField lbl="Mã giao dịch"><span className="mono">{detail.submissionCode}</span></DrField>
              <DrField lbl="Mã CSKB"><span className="mono">{detail.facilityCode}</span></DrField>
              <DrField lbl="Trạng thái"><StatusBadge tone={toneOfStatus(detail.status)} dot>{detail.statusName}</StatusBadge></DrField>
              <DrField lbl="Cổng ack"><span className="mono">{detail.gatewayTransactionId || '—'}</span></DrField>
              <DrField lbl="Gửi lúc"><span className="mono">{fmtDT(detail.submittedAt)}</span></DrField>
              <DrField lbl="Ack lúc"><span className="mono">{fmtDT(detail.acknowledgedAt)}</span></DrField>
              {detail.errorMessage && <DrField lbl="Lỗi">{detail.errorMessage}</DrField>}
            </DrSec>
            <DrSec title="ĐƠN THUỐC">
              <DrField lbl="Đơn thuốc"><span className="mono">{detail.prescriptionCode || '—'}</span></DrField>
              <DrField lbl="Bệnh nhân">{detail.patientName || '—'}</DrField>
              <DrField lbl="CCCD BN"><span className="mono">{detail.patientIdNumber}</span></DrField>
              <DrField lbl="BS"><span className="mono">{detail.doctorIdNumber}</span></DrField>
              <DrField lbl="CCHN"><span className="mono">{detail.doctorLicenseNumber}</span></DrField>
              <DrField lbl="Loại đơn">{detail.prescriptionType}</DrField>
            </DrSec>
            <DrSec title="PAYLOAD GỬI ĐI">
              <pre style={{ fontSize: 11, maxHeight: 240, overflow: 'auto', padding: 8, background: 'var(--bg-1)', border: '1px solid var(--line-soft)' }}>
                {detail.payloadJson ? (() => { try { return JSON.stringify(JSON.parse(detail.payloadJson || ''), null, 2); } catch { return detail.payloadJson; } })() : '—'}
              </pre>
            </DrSec>
            {detail.responseJson && (
              <DrSec title="PHẢN HỒI TỪ CỔNG">
                <pre style={{ fontSize: 11, maxHeight: 200, overflow: 'auto', padding: 8, background: 'var(--bg-1)', border: '1px solid var(--line-soft)' }}>
                  {(() => { try { return JSON.stringify(JSON.parse(detail.responseJson || ''), null, 2); } catch { return detail.responseJson; } })()}
                </pre>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Pharmacy panel ──────────────────────────

const PharmacyPanel: React.FC = () => {
  const [rows, setRows] = useState<NationalPharmacyOutboundReportDto[]>([]);
  const [reportType, setReportType] = useState<string>('');
  const [showGen, setShowGen] = useState(false);
  const [genFrom, setGenFrom] = useState<string>(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [genTo, setGenTo] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [genType, setGenType] = useState<string>('DailySale');
  const [detail, setDetail] = useState<NationalPharmacyOutboundReportDetailDto | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await nphGateway.search({ reportType: reportType || undefined, pageSize: 100 });
      setRows(data || []);
    } catch { te('Không tải được'); }
  }, [reportType]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    try {
      await nphGateway.generate({ reportType: genType, periodFrom: genFrom, periodTo: genTo });
      tk('Đã tạo báo cáo và gửi lên cổng'); setShowGen(false); load();
    } catch { te('Tạo báo cáo thất bại'); }
  };

  const columns: ColumnDef<NationalPharmacyOutboundReportDto>[] = [
    { key: 'code', label: 'Mã báo cáo', mono: true, width: 240, render: r => r.reportCode },
    { key: 'type', label: 'Loại', width: 160, render: r => r.reportType },
    { key: 'period', label: 'Kỳ', mono: true, width: 220, render: r => `${dayjs(r.periodFrom).format('DD/MM')} → ${dayjs(r.periodTo).format('DD/MM/YYYY')}` },
    { key: 'items', label: 'Số mục', mono: true, width: 90, render: r => String(r.itemCount) },
    { key: 'sub', label: 'Gửi lúc', mono: true, width: 140, render: r => fmtDT(r.submittedAt) },
    { key: 'st', label: 'Trạng thái', width: 160, render: r =>
      <StatusBadge tone={toneOfStatus(r.status)} dot>{r.statusName}</StatusBadge>
    },
  ];

  const actions = (r: NationalPharmacyOutboundReportDto) =>
    r.status !== 2 ? (
      <ActBtn ic="rotate-cw" title="Gửi lại" onClick={async () => {
        try { await nphGateway.retry(r.id); tk('Đã gửi lại'); load(); }
        catch { te('Gửi lại thất bại'); }
      }} />
    ) : null;

  return (
    <>
      <div className="ab-toolbar">
        <Filter value={reportType} onChange={setReportType} placeholder="— Loại báo cáo —" options={[
          { v: 'DailySale', l: 'Bán hàng ngày' },
          { v: 'MonthlyInventory', l: 'Tồn kho tháng' },
          { v: 'NarcoticReport', l: 'Báo cáo gây nghiện' },
          { v: 'Recall', l: 'Thu hồi' }
        ]} />
        <button type="button" className="ab-btn primary" onClick={() => setShowGen(true)}>
          <TermIcon name="plus" size={12} /> Tạo & gửi
        </button>
        <button type="button" className="ab-btn" onClick={() => load()}>
          <TermIcon name="rotate-cw" size={12} /> Tải lại
        </button>
      </div>
      <DataTable<NationalPharmacyOutboundReportDto>
        data={rows} rowKey={r => r.id} columns={columns} actions={actions}
        onRowClick={async r => {
          try { setDetail(await nphGateway.get(r.id)); }
          catch { te('Không tải được chi tiết'); }
        }}
      />

      <ModalShell open={showGen} onClose={() => setShowGen(false)} title="Tạo báo cáo gửi cổng Dược QG"
        footer={<>
          <button type="button" className="ab-btn" onClick={() => setShowGen(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={generate}>Tạo & gửi</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
          <span>Loại báo cáo</span>
          <select className="ab-sel" value={genType} onChange={e => setGenType(e.target.value)}>
            <option value="DailySale">Bán hàng ngày</option>
            <option value="MonthlyInventory">Tồn kho tháng</option>
            <option value="NarcoticReport">Báo cáo gây nghiện</option>
            <option value="Recall">Thu hồi</option>
          </select>
          <span>Từ ngày</span>
          <input className="ab-sel" type="date" value={genFrom} onChange={e => setGenFrom(e.target.value)} />
          <span>Đến ngày</span>
          <input className="ab-sel" type="date" value={genTo} onChange={e => setGenTo(e.target.value)} />
        </div>
      </ModalShell>

      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={`Báo cáo Dược QG — ${detail?.reportCode || ''}`}>
        {detail && (
          <>
            <DrSec title="THÔNG TIN">
              <DrField lbl="Mã"><span className="mono">{detail.reportCode}</span></DrField>
              <DrField lbl="Loại">{detail.reportType}</DrField>
              <DrField lbl="Số mục"><span className="mono">{detail.itemCount}</span></DrField>
              <DrField lbl="Kỳ"><span className="mono">{`${dayjs(detail.periodFrom).format('DD/MM/YYYY')} → ${dayjs(detail.periodTo).format('DD/MM/YYYY')}`}</span></DrField>
              <DrField lbl="Trạng thái"><StatusBadge tone={toneOfStatus(detail.status)} dot>{detail.statusName}</StatusBadge></DrField>
              <DrField lbl="Ticket cổng"><span className="mono">{detail.gatewayTicketNumber || '—'}</span></DrField>
            </DrSec>
            <DrSec title="PAYLOAD XML">
              <pre style={{ fontSize: 11, maxHeight: 280, overflow: 'auto', padding: 8, background: 'var(--bg-1)', border: '1px solid var(--line-soft)' }}>
                {detail.payloadXml || '—'}
              </pre>
            </DrSec>
            {detail.responseXml && (
              <DrSec title="PHẢN HỒI">
                <pre style={{ fontSize: 11, maxHeight: 160, overflow: 'auto', padding: 8, background: 'var(--bg-1)', border: '1px solid var(--line-soft)' }}>
                  {detail.responseXml}
                </pre>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Config panel ──────────────────────────

const ConfigPanel: React.FC = () => {
  const [cfg, setCfg] = useState<NationalGatewayConfigDto | null>(null);
  const [tested, setTested] = useState<boolean | null>(null);

  useEffect(() => { npGateway.getConfig().then(setCfg).catch(() => te('Không tải được cấu hình')); }, []);

  const save = async () => {
    if (!cfg) return;
    try { await npGateway.saveConfig(cfg); tk('Đã lưu cấu hình'); }
    catch { te('Lưu thất bại'); }
  };
  const test = async () => {
    try { const r = await npGateway.testConnection(); setTested(r.connected); }
    catch { setTested(false); }
  };

  if (!cfg) return <div style={{ padding: 24 }}>Đang tải cấu hình…</div>;

  return (
    <div style={{ padding: 16, border: '1px solid var(--line)', background: 'var(--bg-1)' }} data-testid="gateway-config-panel">
      <h4 style={{ margin: 0, marginBottom: 12, fontSize: 12, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Cổng quốc gia — Cấu hình
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, fontSize: 13 }}>
        <span>URL Đơn thuốc QG</span><input className="ab-sel" value={cfg.nationalPrescriptionBaseUrl} onChange={e => setCfg({ ...cfg, nationalPrescriptionBaseUrl: e.target.value })} />
        <span>URL Dược QG</span><input className="ab-sel" value={cfg.nationalPharmacyBaseUrl} onChange={e => setCfg({ ...cfg, nationalPharmacyBaseUrl: e.target.value })} />
        <span>Mã CSKB</span><input className="ab-sel" value={cfg.facilityCode} onChange={e => setCfg({ ...cfg, facilityCode: e.target.value })} />
        <span>Tên CSKB</span><input className="ab-sel" value={cfg.facilityName} onChange={e => setCfg({ ...cfg, facilityName: e.target.value })} />
        <span>Chế độ Mock</span>
        <label><input type="checkbox" checked={cfg.mockMode} onChange={e => setCfg({ ...cfg, mockMode: e.target.checked })} /> Bật mock (đề xuất khi demo)</label>
        <span>Tự động gửi</span>
        <label><input type="checkbox" checked={cfg.autoSubmit} onChange={e => setCfg({ ...cfg, autoSubmit: e.target.checked })} /> Tự động gửi mỗi đơn thuốc</label>
        <span>Số lần thử lại</span><input className="ab-sel" type="number" value={cfg.retryCount} onChange={e => setCfg({ ...cfg, retryCount: Number(e.target.value) })} />
        <span>Timeout (giây)</span><input className="ab-sel" type="number" value={cfg.timeoutSeconds} onChange={e => setCfg({ ...cfg, timeoutSeconds: Number(e.target.value) })} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" className="ab-btn primary" onClick={save}><TermIcon name="save" size={12}/> Lưu cấu hình</button>
        <button type="button" className="ab-btn" onClick={test}><TermIcon name="activity" size={12}/> Kiểm tra kết nối</button>
        {tested !== null && (
          <StatusBadge tone={tested ? 'ok' : 'crit'} dot>{tested ? 'Kết nối OK' : 'Mất kết nối'}</StatusBadge>
        )}
      </div>
    </div>
  );
};

export default NationalGatewaysV2;
