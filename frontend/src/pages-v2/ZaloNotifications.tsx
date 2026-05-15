import React, { useCallback, useEffect, useState } from 'react';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, Filter, StatusBadge,
  DrawerShell, ModalShell, DrSec, DrField,
  type ColumnDef, type TopTab, type KpiItem, type StatusTone,
  tk, te, fmtDTg
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  zalo,
  type ZaloNotificationLogDto,
  type ZaloConfigDto,
  type ZaloTemplateDto
} from '../api/nangcap23';

type TabKey = 'logs' | 'cfg';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'logs', l: 'Lịch sử gửi',  ic: 'info' },
  { v: 'cfg',  l: 'Cấu hình OA',  ic: 'settings' },
];

const ZNS_STATUS: { v: number; l: string; tone: StatusTone }[] = [
  { v: 0, l: 'Đang chờ', tone: 'warn' },
  { v: 1, l: 'Đã gửi',   tone: 'info' },
  { v: 2, l: 'Đã nhận',  tone: 'ok'   },
  { v: 3, l: 'Lỗi',      tone: 'crit' },
];
const znsTone = (s: number): StatusTone => ZNS_STATUS[s]?.tone || 'info';
const znsLabel = (s: number): string => ZNS_STATUS[s]?.l || '—';

const ZaloNotificationsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('logs');
  return (
    <div className="ab" data-testid="zalo-notifications-page">
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'logs' && <ZnsLogsPanel />}
      {tab === 'cfg'  && <ZnsConfigPanel />}
    </div>
  );
};

// ────────────────────────── Logs ──────────────────────────

const ZnsLogsPanel: React.FC = () => {
  const [rows, setRows] = useState<ZaloNotificationLogDto[]>([]);
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [detail, setDetail] = useState<ZaloNotificationLogDto | null>(null);
  const [sendOpen, setSendOpen] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await zalo.search({ pageSize: 200 })); }
    catch { te('Không tải được'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (fStatus !== '' && r.status !== Number(fStatus)) return false;
    if (search) {
      const k = search.toLowerCase();
      return [r.targetPhone, r.patientName || '', r.templateName]
        .some((x) => x.toLowerCase().includes(k));
    }
    return true;
  });

  const kpis: KpiItem[] = [
    { lbl: 'Tổng tin', val: rows.length },
    { lbl: 'Đã giao',  val: rows.filter((r) => r.status === 2).length, tone: 'ok'   },
    { lbl: 'Đang chờ', val: rows.filter((r) => r.status === 0).length, tone: 'warn' },
    { lbl: 'Lỗi',      val: rows.filter((r) => r.status === 3).length, tone: 'crit' },
  ];

  const columns: ColumnDef<ZaloNotificationLogDto>[] = [
    { key: 'createdAt', label: 'Thời gian', mono: true, width: 140,
      render: (r) => fmtDTg(r.createdAt) },
    { key: 'templateName', label: 'Mẫu', width: 220,
      render: (r) => (
        <div>
          <b>{r.templateName}</b>
          <div className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.templateId}</div>
        </div>
      ) },
    { key: 'targetPhone', label: 'SĐT', mono: true, width: 130 },
    { key: 'patientName', label: 'Bệnh nhân', width: 200,
      render: (r) => r.patientName || '—' },
    { key: 'sentAt', label: 'Gửi lúc', mono: true, width: 140,
      render: (r) => fmtDTg(r.sentAt) },
    { key: 'costVnd', label: 'Chi phí', mono: true, width: 100,
      render: (r) => r.costVnd ? `${r.costVnd.toLocaleString('vi-VN')}đ` : '—' },
    { key: 'status', label: 'Trạng thái', width: 140,
      render: (r) => <StatusBadge tone={znsTone(r.status)} dot>{r.statusName || znsLabel(r.status)}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm SĐT / BN / mẫu…" />
        <Filter value={fStatus} onChange={setFStatus}
          options={ZNS_STATUS.map((s) => ({ v: String(s.v), l: s.l }))}
          placeholder="▾ Trạng thái" />
        <span className="spacer" />
        <button type="button" className="ab-btn primary" onClick={() => setSendOpen(true)}>
          <TermIcon name="external" size={12} /> Gửi thử
        </button>
      </div>
      <DataTable<ZaloNotificationLogDto>
        rowKey={(r) => r.id} data={filtered} columns={columns}
        onRowClick={setDetail}
      />
      <ZnsSendModal open={sendOpen} onClose={() => setSendOpen(false)} onSent={load} />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} size="md"
        title={detail ? `Tin Zalo · ${detail.templateName}` : ''}>
        {detail && (
          <>
            <DrSec title="THÔNG TIN">
              <DrField lbl="Mẫu">{detail.templateName}</DrField>
              <DrField lbl="Mã mẫu"><span className="mono">{detail.templateId}</span></DrField>
              <DrField lbl="SĐT"><span className="mono">{detail.targetPhone}</span></DrField>
              <DrField lbl="Bệnh nhân">{detail.patientName || '—'}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={znsTone(detail.status)} dot>{detail.statusName}</StatusBadge>
              </DrField>
              <DrField lbl="Message ID"><span className="mono">{detail.messageId || '—'}</span></DrField>
              <DrField lbl="Gửi lúc">{fmtDTg(detail.sentAt)}</DrField>
              <DrField lbl="Giao lúc">{fmtDTg(detail.deliveredAt)}</DrField>
              <DrField lbl="Chi phí">
                {detail.costVnd ? `${detail.costVnd.toLocaleString('vi-VN')}đ` : '—'}
              </DrField>
              {detail.errorMessage && (
                <DrField lbl="Lỗi"><span style={{ color: 'var(--s-crit)' }}>{detail.errorMessage}</span></DrField>
              )}
            </DrSec>
            <DrSec title="PAYLOAD">
              <pre style={{ fontSize: 11, padding: 8, background: 'var(--d-1)', borderRadius: 4, maxHeight: 200, overflow: 'auto', fontFamily: 'var(--font-mono)' }}>
                {(() => { try { return JSON.stringify(JSON.parse(detail.payloadJson || '{}'), null, 2); } catch { return detail.payloadJson; } })()}
              </pre>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ────────────────────────── Send Modal ──────────────────────────

const ZnsSendModal: React.FC<{ open: boolean; onClose: () => void; onSent: () => void }> = ({ open, onClose, onSent }) => {
  const [templates, setTemplates] = useState<ZaloTemplateDto[]>([]);
  const [tplId, setTplId] = useState('appointment_reminder');
  const [phone, setPhone] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) zalo.getTemplates().then(setTemplates).catch(() => { /* ignore */ });
  }, [open]);
  useEffect(() => { setParams({}); }, [tplId]);

  const tpl = templates.find((t) => t.id === tplId);

  const submit = async () => {
    if (!phone) { te('Vui lòng nhập SĐT'); return; }
    try {
      await zalo.send({ templateId: tplId, targetPhone: phone, templateParams: params });
      tk(`Đã gửi tin Zalo · ${phone}`);
      setPhone(''); setParams({});
      onClose(); onSent();
    } catch { te('Gửi thất bại'); }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Gửi tin Zalo (ZNS)" size="md"
      footer={<>
        <button type="button" className="ab-btn ghost" onClick={onClose}>Hủy</button>
        <button type="button" className="ab-btn primary" onClick={submit}>
          <TermIcon name="external" size={12} /> Gửi
        </button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, padding: 14 }}>
        <span style={{ fontSize: 13 }}>Mẫu tin</span>
        <select className="ab-sel" value={tplId} onChange={(e) => setTplId(e.target.value)}>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span style={{ fontSize: 13 }}>SĐT</span>
        <input className="ab-sel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
        {tpl?.params_.map((p) => (
          <React.Fragment key={p}>
            <span style={{ fontSize: 13, color: 'var(--t-2)' }}>{p}</span>
            <input className="ab-sel" value={params[p] || ''}
              onChange={(e) => setParams((s) => ({ ...s, [p]: e.target.value }))} />
          </React.Fragment>
        ))}
      </div>
    </ModalShell>
  );
};

// ────────────────────────── Config ──────────────────────────

const ZnsConfigPanel: React.FC = () => {
  const [cfg, setCfg] = useState<ZaloConfigDto | null>(null);
  const [tested, setTested] = useState<boolean | null>(null);

  useEffect(() => {
    zalo.getConfig().then(setCfg).catch(() => te('Không tải được cấu hình'));
  }, []);

  const set = <K extends keyof ZaloConfigDto>(k: K, v: ZaloConfigDto[K]) =>
    setCfg((c) => c ? { ...c, [k]: v } : c);

  const save = async () => {
    if (!cfg) return;
    try { await zalo.saveConfig(cfg); tk('Đã lưu cấu hình'); }
    catch { te('Lưu thất bại'); }
  };
  const test = async () => {
    try {
      const r = await zalo.testConnection();
      setTested(r.connected);
      if (r.connected) tk('Kết nối OK'); else te('Mất kết nối');
    } catch { setTested(false); te('Mất kết nối'); }
  };

  if (!cfg) return <div style={{ padding: 20 }}>Đang tải cấu hình…</div>;

  return (
    <div style={{ padding: 20, maxWidth: 760 }} data-testid="zalo-config-panel">
      <div className="hui-section-t" style={{ marginBottom: 14 }}>ZALO OFFICIAL ACCOUNT</div>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, fontSize: 13 }}>
        <span>Access Token</span>
        <input className="ab-sel" value={cfg.accessToken}
          onChange={(e) => set('accessToken', e.target.value)} />
        <span>OA ID</span>
        <input className="ab-sel" value={cfg.oaId}
          onChange={(e) => set('oaId', e.target.value)} />
        <span>Base URL</span>
        <input className="ab-sel" value={cfg.baseUrl}
          onChange={(e) => set('baseUrl', e.target.value)} />
        <span>Mock mode</span>
        <label>
          <input type="checkbox" checked={cfg.mockMode}
            onChange={(e) => set('mockMode', e.target.checked)} /> Bật mock
        </label>
        <span>Kích hoạt</span>
        <label>
          <input type="checkbox" checked={cfg.isEnabled}
            onChange={(e) => set('isEnabled', e.target.checked)} /> Bật gửi Zalo
        </label>
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

export default ZaloNotificationsV2;
