import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  getSmsBalance, getSmsLogs, getSmsStats, sendTestSms, testSmsConnection,
} from '../api/sms';
import type { SmsBalanceDto, SmsLogDto, SmsStatsDto } from '../api/sms';
import {
  TopTabs, KpiStrip, StatusBadge, SearchBox, DataTable, Pager,
  Btn, DrawerShell, DrSec, DrField, CrudModal, tk, te,
  type ColumnDef, type KpiItem, type CrudFieldCfg,
} from '../../../pages-v2/_v2kit';

// ─── constants ───────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'logs' | 'tools';
const TOP_TABS = [
  { v: 'dashboard' as Tab, l: 'Tổng quan', ic: 'chart' },
  { v: 'logs'      as Tab, l: 'Nhật ký',   ic: 'list'  },
  { v: 'tools'     as Tab, l: 'Công cụ',   ic: 'settings' },
];

const MSG_TYPE_LABEL: Record<string, string> = {
  appointment: 'Lịch hẹn', reminder: 'Nhắc nhở', result: 'Kết quả',
  billing: 'Hóa đơn', emergency: 'Khẩn cấp', test: 'Thử nghiệm',
};
const typeLabel = (t: string) => MSG_TYPE_LABEL[t] || t;

const STATUS_META: Record<number, { l: string; tone: 'ok' | 'crit' | 'info' }> = {
  0: { l: 'Đã gửi',   tone: 'ok' },
  1: { l: 'Lỗi',      tone: 'crit' },
  2: { l: 'Dev mode', tone: 'info' },
};

const STATUS_OPTS = [
  { value: '0', label: 'Đã gửi' },
  { value: '1', label: 'Lỗi' },
  { value: '2', label: 'Dev mode' },
];

const SEND_FIELDS: CrudFieldCfg[] = [
  { key: 'phoneNumber', label: 'Số điện thoại', required: true },
  { key: 'message', label: 'Nội dung (tuỳ chọn)', type: 'textarea' },
];

const LOG_COLS: ColumnDef<SmsLogDto>[] = [
  { key: 'createdAt',   label: 'Thời gian', mono: true,
    render: (l) => dayjs(l.createdAt).format('DD/MM HH:mm') },
  { key: 'phoneNumber', label: 'SĐT', mono: true, code: true,
    render: (l) => l.phoneNumber },
  { key: 'messageType', label: 'Loại',
    render: (l) => typeLabel(l.messageType) },
  { key: 'message', label: 'Nội dung',
    render: (l) => (
      <span style={{ display: 'inline-block', maxWidth: 320,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {l.message}
      </span>
    ) },
  { key: 'provider', label: 'NCC', render: (l) => l.provider },
  { key: 'status', label: 'Trạng thái',
    render: (l) => {
      const m = STATUS_META[l.status] ?? { l: '—', tone: 'info' as const };
      return <StatusBadge tone={m.tone}>{m.l}</StatusBadge>;
    } },
];

const CARD: React.CSSProperties = {
  padding: '12px 16px',
  background: 'var(--bg-1)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-2)',
};

const SEL: React.CSSProperties = {
  height: 30, padding: '0 8px', borderRadius: 4,
  border: '1px solid var(--line)', background: 'var(--bg-1)',
  color: 'inherit', fontSize: 13,
};

// ─── component ───────────────────────────────────────────────────────────────

const SmsManagementV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');

  // dashboard
  const [balance, setBalance]       = useState<SmsBalanceDto | null>(null);
  const [stats,   setStats]         = useState<SmsStatsDto | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [connOk,  setConnOk]        = useState<boolean | null>(null);
  const [connLoading, setConnLoading] = useState(false);

  // logs
  const [rows,    setRows]    = useState<SmsLogDto[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(0);
  const [kw,      setKw]      = useState('');
  const [fType,   setFType]   = useState('');
  const [fStatus, setFStatus] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  // overlay
  const [selected, setSelected] = useState<SmsLogDto | null>(null);
  const [sendOpen, setSendOpen] = useState(false);

  // ── load dashboard ──────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const [b, s] = await Promise.all([getSmsBalance(), getSmsStats()]);
      setBalance(b as unknown as SmsBalanceDto);
      setStats(s as unknown as SmsStatsDto);
    } catch { /* ignore */ }
    finally { setDashLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── load logs ───────────────────────────────────────────────────────────────
  const loadLogs = useCallback(async (p = 0) => {
    setLogLoading(true);
    try {
      const r = await getSmsLogs({
        keyword:     kw || undefined,
        messageType: fType || undefined,
        status:      fStatus !== '' ? Number(fStatus) : undefined,
        pageIndex: p, pageSize: 20,
      }) as any;
      setRows(r?.items ?? r?.data?.items ?? []);
      setTotal(r?.totalCount ?? r?.data?.totalCount ?? 0);
      setPage(p);
    } catch { setRows([]); setTotal(0); }
    finally { setLogLoading(false); }
  }, [kw, fType, fStatus]);

  useEffect(() => {
    if (tab === 'logs') loadLogs(0);
  }, [tab, loadLogs]);

  // ── actions ─────────────────────────────────────────────────────────────────
  const handleTestConn = async () => {
    setConnLoading(true);
    try {
      const ok = await testSmsConnection() as unknown as boolean;
      setConnOk(ok);
      if (ok) tk('Kết nối SMS thành công'); else te('Kết nối SMS thất bại');
    } catch { setConnOk(false); te('Không thể kết nối SMS'); }
    finally { setConnLoading(false); }
  };

  const handleSend = async (v: Record<string, any>) => {
    try {
      await sendTestSms(String(v.phoneNumber ?? ''), v.message ? String(v.message) : undefined);
      tk('Đã gửi SMS thử nghiệm');
    } catch {
      te('Gửi SMS thất bại');
      throw new Error('failed');
    }
  };

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis: KpiItem[] = [
    { lbl: 'Số dư',        val: balance?.balance ?? 0,       unit: balance?.currency ?? '' },
    { lbl: 'Đã gửi (30d)', val: stats?.totalSent   ?? 0,    tone: 'ok' },
    { lbl: 'Lỗi (30d)',    val: stats?.totalFailed  ?? 0,   tone: 'crit' },
    { lbl: 'Dev mode',     val: stats?.totalDevMode ?? 0,   tone: 'info' },
  ];

  // ── dashboard content ────────────────────────────────────────────────────────
  const dashContent = (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {/* Provider */}
        <div style={CARD}>
          <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4 }}>SMS Gateway</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {dashLoading ? '…' : balance?.provider || '(chưa cấu hình)'}
          </div>
          <StatusBadge tone={balance?.isEnabled ? 'ok' : 'warn'}>
            {balance?.isEnabled ? 'Đã kích hoạt' : 'Dev mode'}
          </StatusBadge>
          {stats && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t-2)' }}>
              Tỷ lệ thành công: <b>{stats.successRate.toFixed(1)}%</b>
            </div>
          )}
        </div>

        {/* Connection test */}
        <div style={CARD}>
          <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 8 }}>Kiểm tra kết nối</div>
          <Btn icon="zap" loading={connLoading} onClick={handleTestConn}>
            {connLoading ? 'Đang kiểm tra…' : 'Test kết nối'}
          </Btn>
          {connOk !== null && (
            <div style={{ marginTop: 8 }}>
              <StatusBadge tone={connOk ? 'ok' : 'crit'}>
                {connOk ? 'Kết nối OK' : 'Kết nối thất bại'}
              </StatusBadge>
            </div>
          )}
        </div>
      </div>

      {/* Stats by type */}
      {stats && stats.byType.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 12 }}>Thống kê theo loại</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.byType.map(item => {
              const pct = item.total > 0
                ? Math.round((item.sent + item.devMode) / item.total * 100) : 0;
              return (
                <div key={item.messageType}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{typeLabel(item.messageType)}</span>
                    <span style={{ color: 'var(--t-2)' }}>
                      {item.sent} gửi / {item.failed} lỗi / {item.devMode} dev
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--line)' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'var(--s-ok)', borderRadius: 3, transition: 'width .3s',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── logs content ─────────────────────────────────────────────────────────────
  const logsContent = (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <SearchBox value={kw} onChange={setKw} placeholder="Tìm SĐT / nội dung…" />
        <select style={SEL} value={fType} onChange={e => setFType(e.target.value)}>
          <option value="">-- Loại tin --</option>
          {Object.entries(MSG_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select style={SEL} value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">-- Trạng thái --</option>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Btn icon="refresh" onClick={() => loadLogs(0)} />
      </div>
      <DataTable<SmsLogDto>
        columns={LOG_COLS}
        data={rows}
        rowKey={(l) => l.id}
        onRowClick={setSelected}
        empty={logLoading ? 'Đang tải…' : 'Không có SMS trong bộ lọc hiện tại'}
      />
      <Pager
        page={page}
        totalPages={Math.max(1, Math.ceil(total / 20))}
        setPage={(p) => { const next = typeof p === 'function' ? p(page) : p; loadLogs(next); }}
        total={total}
        perPage={20}
      />
    </div>
  );

  // ── tools content ─────────────────────────────────────────────────────────────
  const toolsContent = (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ ...CARD, minWidth: 240 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Gửi SMS thử nghiệm</div>
        <Btn variant="primary" icon="send" onClick={() => setSendOpen(true)}>Gửi SMS thử</Btn>
        {!balance?.isEnabled && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--s-warn)' }}>
            Dev mode: SMS sẽ được ghi log nhưng không gửi thật
          </div>
        )}
      </div>
      <div style={{ ...CARD, minWidth: 280, flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Cấu hình SMS Gateway</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--t-2)' }}>Provider: </span>
            {balance?.provider || '(chưa cấu hình)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--t-2)' }}>Trạng thái: </span>
            <StatusBadge tone={balance?.isEnabled ? 'ok' : 'warn'}>
              {balance?.isEnabled ? 'Đã kích hoạt' : 'Dev mode'}
            </StatusBadge>
          </div>
          <div>
            <span style={{ color: 'var(--t-2)' }}>Số dư: </span>
            {balance !== null
              ? `${(balance?.balance ?? 0).toLocaleString()} ${balance?.currency ?? ''}`.trim()
              : 'N/A'}
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t-3)' }}>
          Cấu hình <code>appsettings.json</code> → key <code>Sms</code> · Hỗ trợ: eSMS.vn, SpeedSMS.vn
        </div>
      </div>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <KpiStrip items={kpis} />

      <TopTabs
        tab={tab}
        setTab={setTab}
        tabs={TOP_TABS}
        actions={<Btn icon="refresh" onClick={loadDashboard} title="Làm mới" />}
      />

      <div style={{ padding: '16px 0' }}>
        {tab === 'dashboard' && dashContent}
        {tab === 'logs'      && logsContent}
        {tab === 'tools'     && toolsContent}
      </div>

      {/* Log detail drawer */}
      <DrawerShell
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.phoneNumber ?? ''}
        sub={selected
          ? `${typeLabel(selected.messageType)} · ${dayjs(selected.createdAt).format('DD/MM/YYYY HH:mm:ss')}`
          : ''}
      >
        {selected && (
          <>
            <DrSec title="Tin nhắn">
              <DrField lbl="SĐT">{selected.phoneNumber}</DrField>
              <DrField lbl="Loại">{typeLabel(selected.messageType)}</DrField>
              <DrField lbl="Nội dung">
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selected.message}</div>
              </DrField>
            </DrSec>
            <DrSec title="Gửi">
              <DrField lbl="NCC">{selected.provider}</DrField>
              <DrField lbl="Thời gian">{dayjs(selected.createdAt).format('DD/MM/YYYY HH:mm:ss')}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={STATUS_META[selected.status]?.tone ?? 'info'}>
                  {STATUS_META[selected.status]?.l ?? '—'}
                </StatusBadge>
              </DrField>
              {selected.errorMessage && (
                <DrField lbl="Lỗi">
                  <span style={{ color: 'var(--s-crit)' }}>{selected.errorMessage}</span>
                </DrField>
              )}
            </DrSec>
            {selected.patientName && (
              <DrSec title="Bệnh nhân">
                <DrField lbl="Tên BN">{selected.patientName}</DrField>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>

      {/* Test-send modal */}
      <CrudModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Gửi SMS thử nghiệm"
        fields={SEND_FIELDS}
        onSubmit={handleSend}
      />
    </div>
  );
};

export default SmsManagementV2;
