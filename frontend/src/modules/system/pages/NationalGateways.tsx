import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, Filter, StatusBadge,
  DrawerShell, ModalShell, Btn, DrSec, DrField, useListData,
  type ColumnDef, type TopTab, type KpiItem, type StatusTone,
  tk, tw, te, fmtDTg, fmtDMYg
} from '@/_v2kit';
import { RowActions } from '../../../components/actions';
import { friendlyErrorMessage } from '@/utils/friendlyError';
import TermIcon from '../../../components/layout/terminal/Icon';
import {
  npGateway, nphGateway,
  type NationalPrescriptionSubmissionDto,
  type NationalPrescriptionSubmissionDetailDto,
  type NationalPharmacyOutboundReportDto,
  type NationalGatewayConfigDto
} from '../../../api/nangcap23';

type TabKey = 'rx' | 'pharm' | 'cfg';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'rx',    l: 'Đơn thuốc QG', ic: 'pill' },
  { v: 'pharm', l: 'Dược QG',       ic: 'archive' },
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
// QA-R11: acks of the InMemory gateway fakes (server NationalGateway:MockMode=true) carry a "MOCK-" id — they are not
// receipts from the national gateway and were shown/counted as "Cổng xác nhận".
const isMockAck = (id?: string | null) => !!id && id.startsWith('MOCK-');
const StatusCell: React.FC<{ status: number; name: string; ackId?: string | null }> = ({ status, name, ackId }) => (
  isMockAck(ackId)
    ? <StatusBadge tone="info" dot>{name.includes('MOCK') ? name : `${name} (MOCK — chưa gửi cổng thật)`}</StatusBadge>
    : <StatusBadge tone={toneOfStatus(status)} dot>{name}</StatusBadge>
);

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
  const { rows, loading, reload } = useListData<NationalPrescriptionSubmissionDto>(
    useCallback(() => npGateway.search({ pageSize: 200 }), []),
    useCallback(() => te('Không tải được danh sách'), []),
  );
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [detail, setDetail] = useState<NationalPrescriptionSubmissionDetailDto | null>(null);
  const [acting, setActing] = useState(false); // #467: chống double-submit gửi lại / hủy

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
    if (acting) return;
    setActing(true);
    try { await npGateway.retry(r.id); tk('Đã gửi lại lên cổng QG'); reload(); }
    catch (e) { te(friendlyErrorMessage(e, 'Gửi lại thất bại. Vui lòng thử lại.')); }
    finally { setActing(false); }
  };
  // Confirm do RowActions (tone: 'danger') tự mở — không bọc cf() thêm ở đây (tránh hỏi 2 lần).
  const cancel = async (r: NationalPrescriptionSubmissionDto) => {
    if (acting) return;
    setActing(true);
    try { await npGateway.cancel(r.id); tw('Đã hủy giao dịch'); reload(); }
    catch (e) { te(friendlyErrorMessage(e, 'Hủy giao dịch thất bại. Vui lòng thử lại.')); }
    finally { setActing(false); }
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng',            val: rows.length },
    { lbl: 'Cổng xác nhận',   val: rows.filter((r) => r.status === 2 && !isMockAck(r.gatewayTransactionId)).length, tone: 'ok' },
    { lbl: 'Đang chờ',        val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
    { lbl: 'Lỗi / Từ chối',   val: rows.filter((r) => r.status === 3).length, tone: 'crit' },
    { lbl: 'Mock (chưa gửi thật)', val: rows.filter((r) => isMockAck(r.gatewayTransactionId)).length, tone: 'info' },
  ];

  const columns: ColumnDef<NationalPrescriptionSubmissionDto>[] = [
    { key: 'submissionCode', label: 'Mã giao dịch', mono: true, code: true, width: 220 },
    { key: 'prescription',   label: 'Đơn thuốc',
      render: (r) => (
        <div>
          <b>{r.prescriptionCode || '—'}</b>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientName || '—'}</div>
        </div>
      ) },
    { key: 'doctor', label: 'BS / CCHN', width: 200,
      render: (r) => (
        <div>
          <b>{r.doctorIdNumber}</b>
          <div className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.doctorLicenseNumber}</div>
        </div>
      ) },
    { key: 'prescriptionType', label: 'Loại đơn', width: 120 },
    { key: 'submittedAt',      label: 'Gửi lúc', mono: true, width: 140,
      render: (r) => fmtDTg(r.submittedAt) },
    { key: 'status', label: 'Trạng thái', width: 160,
      render: (r) => <StatusCell status={r.status} name={r.statusName} ackId={r.gatewayTransactionId} /> },
  ];

  const openDetail = async (r: NationalPrescriptionSubmissionDto) => {
    try { setDetail(await npGateway.get(r.id)); }
    catch (e) { te(friendlyErrorMessage(e, 'Không tải được chi tiết. Vui lòng thử lại.')); }
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
        rowKey={(r) => r.id} data={filtered} columns={columns} loading={loading}
        onRowClick={openDetail}
        actions={(r) => (
          <RowActions actions={[
            { key: 'retry', icon: 'refresh', label: 'Gửi lại', primary: true,
              hidden: r.status === 2 || r.status === 4, disabled: acting,
              onClick: () => retry(r) },
            { key: 'cancel', icon: 'x', label: 'Hủy giao dịch', tone: 'danger',
              hidden: r.status === 4, disabled: acting,
              confirm: `Hủy giao dịch ${r.submissionCode}?`,
              onClick: () => cancel(r) },
          ]} />
        )}
      />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)}
        title={`Đơn thuốc QG · ${detail?.submissionCode || ''}`} size="lg">
        {detail && (
          <>
            <DrSec title="THÔNG TIN GIAO DỊCH">
              <DrField lbl="Mã giao dịch"><span className="mono">{detail.submissionCode}</span></DrField>
              <DrField lbl="Mã CSKB"><span className="mono">{detail.facilityCode}</span></DrField>
              <DrField lbl="Trạng thái"><StatusCell status={detail.status} name={detail.statusName} ackId={detail.gatewayTransactionId} /></DrField>
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
              <pre style={{ fontSize: 'var(--fs-xs)', padding: 'var(--space-8)', background: 'var(--d-1)', borderRadius: 4, maxHeight: 280, overflow: 'auto', fontFamily: 'var(--font-mono)' }}>
                {detail.payloadJson ? (() => { try { return JSON.stringify(JSON.parse(detail.payloadJson || ''), null, 2); } catch { return detail.payloadJson; } })() : '—'}
              </pre>
            </DrSec>
            {detail.responseJson && (
              <DrSec title="PHẢN HỒI TỪ CỔNG">
                <pre style={{ fontSize: 'var(--fs-xs)', padding: 'var(--space-8)', background: 'var(--d-1)', borderRadius: 4, maxHeight: 200, overflow: 'auto', fontFamily: 'var(--font-mono)' }}>
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

// QA-R11: 'AntibioticReport' / 'InPatientUsage' are not accepted by the API (always 400) and 'NarcoticReport' has no
// data source (it was filed to the gateway EMPTY). Only the type that gathers data (retail sales) is offered.
const NPH_REPORT_TYPES = [
  { value: 'DailySale',       label: 'Xuất bán lẻ (nhà thuốc BV)' },
];

const NgPharmPanel: React.FC = () => {
  const { rows, loading, reload } = useListData<NationalPharmacyOutboundReportDto>(
    useCallback(() => nphGateway.search({ pageSize: 200 }), []),
    useCallback(() => te('Không tải được'), []),
  );

  const [genOpen, setGenOpen]       = useState(false);
  const [reportType, setReportType] = useState('DailySale');
  const [periodFrom, setPeriodFrom] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [periodTo, setPeriodTo]     = useState(dayjs().format('YYYY-MM-DD'));
  const [genLoading, setGenLoading] = useState(false);
  const [acting, setActing] = useState(false); // #467: chống double-submit gửi lại

  const retry = async (r: NationalPharmacyOutboundReportDto) => {
    if (acting) return;
    setActing(true);
    try { await nphGateway.retry(r.id); tk('Đã gửi lại'); reload(); }
    catch (e) { te(friendlyErrorMessage(e, 'Gửi lại thất bại. Vui lòng thử lại.')); }
    finally { setActing(false); }
  };

  const submitGenerate = async () => {
    if (genLoading) return;
    setGenLoading(true);
    try {
      // QA-R11: send the VN calendar days as-is — new Date('YYYY-MM-DD') is UTC midnight (07:00 VN), so the period
      // started at 07:00 on the first day. The API reads whole days (end day inclusive).
      await nphGateway.generate({ reportType, periodFrom, periodTo });
      tk(`Đã tạo & gửi báo cáo ${NPH_REPORT_TYPES.find(t => t.value === reportType)?.label}`);
      setGenOpen(false);
      reload();
    } catch (e) { te(friendlyErrorMessage(e, 'Tạo báo cáo thất bại. Vui lòng thử lại.')); }
    finally { setGenLoading(false); }
  };

  const SEL: React.CSSProperties = {
    height: 32, padding: '0 8px', borderRadius: 4,
    border: '1px solid var(--line)', background: 'var(--bg-1)', fontSize: 13, color: 'var(--t-0)', width: '100%',
  };

  const kpis: KpiItem[] = [
    { lbl: 'Tổng báo cáo',  val: rows.length },
    { lbl: 'Cổng xác nhận', val: rows.filter((r) => r.status === 2 && !isMockAck(r.gatewayTicketNumber)).length, tone: 'ok' },
    { lbl: 'Đang chờ',      val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
    { lbl: 'Bị từ chối',    val: rows.filter((r) => r.status === 3).length, tone: 'crit' },
    { lbl: 'Mock (chưa gửi thật)', val: rows.filter((r) => isMockAck(r.gatewayTicketNumber)).length, tone: 'info' },
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
      render: (r) => <StatusCell status={r.status} name={r.statusName} ackId={r.gatewayTicketNumber} /> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-toolbar">
        <span className="spacer" />
        <Btn variant="primary" onClick={() => setGenOpen(true)}>
          <TermIcon name="plus" size={12} /> Tạo &amp; gửi
        </Btn>
      </div>
      <DataTable<NationalPharmacyOutboundReportDto>
        rowKey={(r) => r.id} data={rows} columns={columns} loading={loading}
        actions={(r) => (
          <RowActions actions={[
            { key: 'retry', icon: 'refresh', label: 'Gửi lại', primary: true,
              hidden: r.status === 2, disabled: acting, onClick: () => retry(r) },
          ]} />
        )}
      />
      <ModalShell open={genOpen} onClose={() => setGenOpen(false)} title="Tạo báo cáo Dược QG" size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setGenOpen(false)}>Huỷ</Btn>
          <Btn variant="primary" onClick={submitGenerate} disabled={genLoading}>
            <TermIcon name="external" size={12} /> {genLoading ? 'Đang gửi…' : 'Tạo & gửi'}
          </Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', padding: 'var(--space-4) 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Loại báo cáo</label>
            <select style={SEL} value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {NPH_REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Từ ngày</label>
              <input type="date" style={SEL} value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Đến ngày</label>
              <input type="date" style={SEL} value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </div>
          </div>
        </div>
      </ModalShell>
    </>
  );
};

// ────────────────────────── Cấu hình ──────────────────────────

const NgConfigPanel: React.FC = () => {
  const [cfg, setCfg] = useState<NationalGatewayConfigDto | null>(null);
  const [tested, setTested] = useState<boolean | null>(null);
  const [saving, setSaving]   = useState(false); // #467: chống double-submit lưu / test
  const [testing, setTesting] = useState(false);
  const [loadErr, setLoadErr] = useState(false); // #467: tránh kẹt "Đang tải…" khi API lỗi

  const loadCfg = useCallback(() => {
    setLoadErr(false);
    npGateway.getConfig().then(setCfg)
      .catch((e) => { setLoadErr(true); te(friendlyErrorMessage(e, 'Không tải được cấu hình')); });
  }, []);

  useEffect(() => { loadCfg(); }, [loadCfg]);

  const set = <K extends keyof NationalGatewayConfigDto>(k: K, v: NationalGatewayConfigDto[K]) =>
    setCfg((c) => c ? { ...c, [k]: v } : c);

  const save = async () => {
    if (!cfg || saving) return;
    setSaving(true);
    try { await npGateway.saveConfig(cfg); tk('Đã lưu cấu hình'); }
    catch (e) { te(friendlyErrorMessage(e, 'Lưu cấu hình thất bại. Vui lòng thử lại.')); }
    finally { setSaving(false); }
  };
  const test = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const r = await npGateway.testConnection();
      setTested(r.connected);
      // QA-R11: the mock client answers every ping with true — that is not a connection to the national gateway.
      if (r.connected && cfg?.mockMode) tw('Đang chạy MOCK — không có kết nối tới cổng quốc gia thật');
      else if (r.connected) tk('Kết nối OK'); else te('Mất kết nối');
    }
    catch (e) { setTested(false); te(friendlyErrorMessage(e, 'Mất kết nối')); }
    finally { setTesting(false); }
  };

  if (!cfg) return (
    <div style={{ padding: 'var(--space-20)', fontSize: 'var(--fs-md)', color: 'var(--t-2)' }}>
      {loadErr ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)' }}>
          <span>Không tải được cấu hình cổng quốc gia.</span>
          <Btn onClick={loadCfg}><TermIcon name="refresh" size={12} /> Thử lại</Btn>
        </div>
      ) : 'Đang tải cấu hình…'}
    </div>
  );

  return (
    <div style={{ padding: 'var(--space-20)', maxWidth: 760 }} data-testid="gateway-config-panel">
      <div className="hui-section-t" style={{ marginBottom: 'var(--space-14)' }}>CỔNG QUỐC GIA — CẤU HÌNH</div>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--space-10)', fontSize: 'var(--fs-md)' }}>
        {/* QA-R11: the gateway HttpClients take their base URL / timeout from appsettings at start-up — the values saved
            here were never used. Read-only so the page does not pretend. */}
        <span>URL Đơn thuốc QG</span>
        <input className="ab-sel" value={cfg.nationalPrescriptionBaseUrl} disabled
          title="Máy chủ dùng appsettings NationalGateway:Prescription:BaseUrl" />
        <span>URL Dược QG</span>
        <input className="ab-sel" value={cfg.nationalPharmacyBaseUrl} disabled
          title="Máy chủ dùng appsettings NationalGateway:Pharmacy:BaseUrl" />
        <span>Mã CSKB</span>
        <input className="ab-sel" value={cfg.facilityCode}
          onChange={(e) => set('facilityCode', e.target.value)} />
        <span>Tên CSKB</span>
        <input className="ab-sel" value={cfg.facilityName}
          onChange={(e) => set('facilityName', e.target.value)} />
        {/* QA-R11: the fake/real gateway client is chosen by the server at start-up (appsettings NationalGateway:MockMode);
            this checkbox saved a flag nothing read, and auto-submit has no implementation. Shown read-only / as such. */}
        <span>Chế độ Mock</span>
        <span style={{ fontSize: 'var(--fs-md)' }}>
          <StatusBadge tone={cfg.mockMode ? 'warn' : 'ok'} dot>
            {cfg.mockMode ? 'MOCK — không gửi cổng thật' : 'Gửi cổng thật'}
          </StatusBadge>
          <span style={{ marginLeft: 8, color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>
            do máy chủ quyết định (NationalGateway:MockMode), không đổi tại đây
          </span>
        </span>
        <span>Tự động gửi</span>
        <label style={{ fontSize: 'var(--fs-md)', color: 'var(--t-2)' }}>
          <input type="checkbox" checked={false} disabled /> Tự động gửi mỗi đơn thuốc — chưa hỗ trợ
        </label>
        <span>Số lần thử lại</span>
        <input className="ab-sel" type="number" value={cfg.retryCount}
          onChange={(e) => set('retryCount', Number(e.target.value))} />
        <span>Timeout (giây)</span>
        <input className="ab-sel" type="number" value={cfg.timeoutSeconds} disabled
          title="Máy chủ dùng appsettings NationalGateway:TimeoutSeconds" />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-8)', marginTop: 'var(--space-16)' }}>
        <Btn variant="primary" onClick={save} disabled={saving}>
          <TermIcon name="check" size={12} /> {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
        </Btn>
        <Btn onClick={test} disabled={testing}>
          <TermIcon name="activity" size={12} /> {testing ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
        </Btn>
        {tested !== null && (
          <StatusBadge tone={tested ? (cfg.mockMode ? 'warn' : 'ok') : 'crit'} dot>
            {tested ? (cfg.mockMode ? 'MOCK — không kiểm tra cổng thật' : 'Kết nối OK') : 'Mất kết nối'}
          </StatusBadge>
        )}
      </div>
    </div>
  );
};

export default NationalGatewaysV2;
