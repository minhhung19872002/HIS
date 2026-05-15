import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, Filter, StatusBadge,
  DrawerShell, ActBtn, DrSec, DrField,
  type ColumnDef, type TopTab, type KpiItem, type StatusTone,
  tk, ti, tw, te, cf, fmtDTg, fmtDMYg
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  npGateway, nphGateway,
  type NationalPrescriptionSubmissionDto,
  type NationalPrescriptionSubmissionDetailDto,
  type NationalPharmacyOutboundReportDto,
  type NationalGatewayConfigDto
} from '../api/nangcap23';

type TabKey = 'rx' | 'pharm' | 'cfg';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'rx',    l: 'Đơn thuốc QG', ic: 'pill' },
  { v: 'pharm', l: 'Dược QG',       ic: 'box' },
  { v: 'cfg',   l: 'Cấu hình',      ic: 'settings' },
];

const NPG_STATUS: { v: number; l: string; tone: StatusTone }[] = [
  { v: 0, l: 'Nháp',          tone: 'info' },
  { v: 1, l: 'Đã gửi',        tone: 'warn' },
  { v: 2, l: 'Cổng xác nhận', tone: 'ok'   },
  { v: 3, l: 'Bị từ chối',    tone: 'crit' },
  { v: 4, l: 'Đã hủy',        tone: 'info' },
];
const toneOfStatus = (s: number): StatusTone =>
  NPG_STATUS.find((x) => x.v === s)?.tone || 'info';

const NationalGatewaysV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('rx');
  return (
    <div className="ab" data-testid="national-gateways-page">
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'rx' && <NgRxPanel />}
      {tab === 'pharm' && <NgPharmPanel />}
      {tab === 'cfg' && <NgConfigPanel />}
    </div>
  );
};

// ────────────────────────── Đơn thuốc QG ──────────────────────────

const NgRxPanel: React.FC = () => {
  const [rows, setRows] = useState<NationalPrescriptionSubmissionDto[]>([]);
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [detail, setDetail] = useState<NationalPrescriptionSubmissionDetailDto | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await npGateway.search({ pageSize: 200 });
      setRows(data || []);
    } catch { te('Không tải được danh sách'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (fStatus !== '' && r.status !== Number(fStatus)) return false;
    if (search) {
      const k = search.toLowerCase();
      return [r.submissionCode, r.patientName || '', r.prescriptionCode || '']
        .some((x) => x.toLowerCase().includes(k));
    }
    return true;
  });

  const retry = async (r: NationalPrescriptionSubmissionDto) => {
    try { await npGateway.retry(r.id); tk('Đã gửi lại lên cổng QG'); load(); }
    catch { te('Gửi lại thất bại'); }
  };
  const cancel = (r: NationalPrescriptionSubmissionDto) =>
    cf(`Hủy giao dịch ${r.submissionCode}?`, async () => {
      try { await npGateway.cancel(r.id); tw('Đã hủy giao dịch'); load(); }
      catch { te('Hủy thất bại'); }
    });

  const kpis: KpiItem[] = [
    { lbl: 'Tổng',            val: rows.length },
    { lbl: 'Cổng xác nhận',   val: rows.filter((r) => r.status === 2).length, tone: 'ok' },
    { lbl: 'Đang chờ',        val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
    { lbl: 'Lỗi / Từ chối',   val: rows.filter((r) => r.status === 3).length, tone: 'crit' },
  ];

  const columns: ColumnDef<NationalPrescriptionSubmissionDto>[] = [
    { key: 'submissionCode', label: 'Mã giao dịch', mono: true, code: true, width: 220 },
    { key: 'prescription',   label: 'Đơn thuốc',
      render: (r) => (
        <div>
          <b>{r.prescriptionCode || '—'}</b>
          <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientName || '—'}</div>
        </div>
      ) },
    { key: 'doctor', label: 'BS / CCHN', width: 200,
      render: (r) => (
        <div>
          <b>{r.doctorIdNumber}</b>
          <div className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.doctorLicenseNumber}</div>
        </div>
      ) },
    { key: 'prescriptionType', label: 'Loại đơn', width: 120 },
    { key: 'submittedAt',      label: 'Gửi lúc', mono: true, width: 140,
      render: (r) => fmtDTg(r.submittedAt) },
    { key: 'status', label: 'Trạng thái', width: 160,
      render: (r) => <StatusBadge tone={toneOfStatus(r.status)} dot>{r.statusName}</StatusBadge> },
  ];

  const openDetail = async (r: NationalPrescriptionSubmissionDto) => {
    try { setDetail(await npGateway.get(r.id)); }
    catch { te('Không tải được chi tiết'); }
  };

  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã GD / BN / BS…" />
        <Filter value={fStatus} onChange={setFStatus}
          options={NPG_STATUS.map((s) => ({ v: String(s.v), l: s.l }))}
          placeholder="▾ Trạng thái" />
      </div>
      <DataTable<NationalPrescriptionSubmissionDto>
        rowKey={(r) => r.id} data={filtered} columns={columns}
        onRowClick={openDetail}
        actions={(r) => (
          <>
            {r.status !== 2 && r.status !== 4 && (
              <ActBtn ic="refresh" title="Gửi lại" onClick={() => retry(r)} />
            )}
            {r.status !== 4 && (
              <ActBtn ic="x" title="Hủy" tone="crit" onClick={() => cancel(r)} />
            )}
          </>
        )}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)}
        title={`Đơn thuốc QG · ${detail?.submissionCode || ''}`} size="lg">
        {detail && (
          <>
            <DrSec title="THÔNG TIN GIAO DỊCH">
              <DrField lbl="Mã giao dịch"><span className="mono">{detail.submissionCode}</span></DrField>
              <DrField lbl="Mã CSKB"><span className="mono">{detail.facilityCode}</span></DrField>
              <DrField lbl="Trạng thái"><StatusBadge tone={toneOfStatus(detail.status)} dot>{detail.statusName}</StatusBadge></DrField>
              <DrField lbl="Cổng ack"><span className="mono">{detail.gatewayTransactionId || '—'}</span></DrField>
              <DrField lbl="Gửi lúc">{fmtDTg(detail.submittedAt)}</DrField>
              <DrField lbl="Ack lúc">{fmtDTg(detail.acknowledgedAt)}</DrField>
              {detail.errorMessage && <DrField lbl="Lỗi"><span style={{ color: 'var(--s-crit)' }}>{detail.errorMessage}</span></DrField>}
            </DrSec>
            <DrSec title="ĐƠN THUỐC">
              <DrField lbl="Mã đơn"><span className="mono">{detail.prescriptionCode || '—'}</span></DrField>
              <DrField lbl="Bệnh nhân">{detail.patientName || '—'}</DrField>
              <DrField lbl="CCCD BN"><span className="mono">{detail.patientIdNumber}</span></DrField>
              <DrField lbl="BS"><span className="mono">{detail.doctorIdNumber}</span></DrField>
              <DrField lbl="CCHN BS"><span className="mono">{detail.doctorLicenseNumber}</span></DrField>
              <DrField lbl="Loại đơn">{detail.prescriptionType}</DrField>
            </DrSec>
            <DrSec title="PAYLOAD">
              <pre style={{ fontSize: 11, padding: 8, background: 'var(--d-1)', borderRadius: 4, maxHeight: 280, overflow: 'auto', fontFamily: 'var(--font-mono)' }}>
                {detail.payloadJson ? (() => { try { return JSON.stringify(JSON.parse(detail.payloadJson || ''), null, 2); } catch { return detail.payloadJson; } })() : '—'}
              </pre>
            </DrSec>
            {detail.responseJson && (
              <DrSec title="PHẢN HỒI TỪ CỔNG">
                <pre style={{ fontSize: 11, padding: 8, background: 'var(--d-1)', borderRadius: 4, maxHeight: 200, overflow: 'auto', fontFamily: 'var(--font-mono)' }}>
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

// ────────────────────────── Dược QG ──────────────────────────

const NgPharmPanel: React.FC = () => {
  const [rows, setRows] = useState<NationalPharmacyOutboundReportDto[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await nphGateway.search({ pageSize: 200 });
      setRows(data || []);
    } catch { te('Không tải được'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const retry = async (r: NationalPharmacyOutboundReportDto) => {
    try { await nphGateway.retry(r.id); tk('Đã gửi lại'); load(); }
    catch { te('Gửi lại thất bại'); }
  };

  const generate = async () => {
    try {
      const periodFrom = dayjs().subtract(7, 'day').toISOString();
      const periodTo = dayjs().toISOString();
      await nphGateway.generate({ reportType: 'DailySale', periodFrom, periodTo });
      tk('Đã tạo & gửi báo cáo');
      load();
    } catch { te('Tạo báo cáo thất bại'); }
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng báo cáo',  val: rows.length },
    { lbl: 'Cổng xác nhận', val: rows.filter((r) => r.status === 2).length, tone: 'ok' },
    { lbl: 'Đang chờ',      val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
    { lbl: 'Bị từ chối',    val: rows.filter((r) => r.status === 3).length, tone: 'crit' },
  ];

  const columns: ColumnDef<NationalPharmacyOutboundReportDto>[] = [
    { key: 'reportCode', label: 'Mã báo cáo', mono: true, code: true, width: 200 },
    { key: 'reportType', label: 'Loại', width: 160 },
    { key: 'period', label: 'Kỳ báo cáo', mono: true, width: 200,
      render: (r) => `${fmtDMYg(r.periodFrom)} → ${fmtDMYg(r.periodTo)}` },
    { key: 'itemCount',   label: 'Số mục', mono: true, width: 90 },
    { key: 'submittedAt', label: 'Gửi lúc', mono: true,
      render: (r) => fmtDTg(r.submittedAt) },
    { key: 'status', label: 'Trạng thái', width: 160,
      render: (r) => <StatusBadge tone={toneOfStatus(r.status)} dot>{r.statusName}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-toolbar">
        <span className="spacer" />
        <button type="button" className="ab-btn primary" onClick={generate}>
          <TermIcon name="plus" size={12} /> Tạo &amp; gửi
        </button>
      </div>
      <DataTable<NationalPharmacyOutboundReportDto>
        rowKey={(r) => r.id} data={rows} columns={columns}
        actions={(r) => r.status !== 2
          ? <ActBtn ic="refresh" title="Gửi lại" onClick={() => retry(r)} />
          : null}
      />
    </>
  );
};

// ────────────────────────── Cấu hình ──────────────────────────

const NgConfigPanel: React.FC = () => {
  const [cfg, setCfg] = useState<NationalGatewayConfigDto | null>(null);
  const [tested, setTested] = useState<boolean | null>(null);

  useEffect(() => {
    npGateway.getConfig().then(setCfg).catch(() => te('Không tải được cấu hình'));
  }, []);

  const set = <K extends keyof NationalGatewayConfigDto>(k: K, v: NationalGatewayConfigDto[K]) =>
    setCfg((c) => c ? { ...c, [k]: v } : c);

  const save = async () => {
    if (!cfg) return;
    try { await npGateway.saveConfig(cfg); tk('Đã lưu cấu hình'); }
    catch { te('Lưu thất bại'); }
  };
  const test = async () => {
    try {
      const r = await npGateway.testConnection();
      setTested(r.connected);
      if (r.connected) tk('Kết nối OK'); else te('Mất kết nối');
    }
    catch { setTested(false); te('Mất kết nối'); }
  };

  if (!cfg) return <div style={{ padding: 20 }}>Đang tải cấu hình…</div>;

  return (
    <div style={{ padding: 20, maxWidth: 760 }} data-testid="gateway-config-panel">
      <div className="hui-section-t" style={{ marginBottom: 14 }}>CỔNG QUỐC GIA — CẤU HÌNH</div>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, fontSize: 13 }}>
        <span>URL Đơn thuốc QG</span>
        <input className="ab-sel" value={cfg.nationalPrescriptionBaseUrl}
          onChange={(e) => set('nationalPrescriptionBaseUrl', e.target.value)} />
        <span>URL Dược QG</span>
        <input className="ab-sel" value={cfg.nationalPharmacyBaseUrl}
          onChange={(e) => set('nationalPharmacyBaseUrl', e.target.value)} />
        <span>Mã CSKB</span>
        <input className="ab-sel" value={cfg.facilityCode}
          onChange={(e) => set('facilityCode', e.target.value)} />
        <span>Tên CSKB</span>
        <input className="ab-sel" value={cfg.facilityName}
          onChange={(e) => set('facilityName', e.target.value)} />
        <span>Chế độ Mock</span>
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={cfg.mockMode}
            onChange={(e) => set('mockMode', e.target.checked)} /> Bật mock (đề xuất khi demo)
        </label>
        <span>Tự động gửi</span>
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={cfg.autoSubmit}
            onChange={(e) => set('autoSubmit', e.target.checked)} /> Tự động gửi mỗi đơn thuốc
        </label>
        <span>Số lần thử lại</span>
        <input className="ab-sel" type="number" value={cfg.retryCount}
          onChange={(e) => set('retryCount', Number(e.target.value))} />
        <span>Timeout (giây)</span>
        <input className="ab-sel" type="number" value={cfg.timeoutSeconds}
          onChange={(e) => set('timeoutSeconds', Number(e.target.value))} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" className="ab-btn primary" onClick={save}>
          <TermIcon name="check" size={12} /> Lưu cấu hình
        </button>
        <button type="button" className="ab-btn" onClick={test}>
          <TermIcon name="activity" size={12} /> Kiểm tra kết nối
        </button>
        {tested !== null && (
          <StatusBadge tone={tested ? 'ok' : 'crit'} dot>
            {tested ? 'Kết nối OK' : 'Mất kết nối'}
          </StatusBadge>
        )}
      </div>
    </div>
  );
};

export default NationalGatewaysV2;
