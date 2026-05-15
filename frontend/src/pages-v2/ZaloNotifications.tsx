import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, Filter, StatusBadge,
  ModalShell, DrawerShell, DrSec, DrField,
  type ColumnDef, type TopTab, tk, te
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
  { v: 'logs', l: 'Lịch sử gửi',  ic: 'message-square' },
  { v: 'cfg',  l: 'Cấu hình OA',  ic: 'settings' },
];

const fmtDT = (s?: string) => s ? dayjs(s).format('DD/MM/YYYY HH:mm') : '—';

const toneOfStatus = (s: number): 'ok' | 'warn' | 'crit' | 'info' =>
  s === 2 ? 'ok' : s === 1 ? 'info' : s === 3 ? 'crit' : 'warn';

const ZaloNotificationsV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('logs');
  return (
    <div className="ab-stack" data-testid="zalo-notifications-page">
      <TopTabs tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'logs' && <LogsPanel />}
      {tab === 'cfg' && <ConfigPanel />}
    </div>
  );
};

const LogsPanel: React.FC = () => {
  const [rows, setRows] = useState<ZaloNotificationLogDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<ZaloNotificationLogDto | null>(null);
  const [showSend, setShowSend] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await zalo.search({ keyword: keyword.trim() || undefined, status: status !== '' ? Number(status) : undefined, pageSize: 100 })); }
    catch { te('Không tải được'); }
  }, [keyword, status]);
  useEffect(() => { load(); }, [load]);

  const columns: ColumnDef<ZaloNotificationLogDto>[] = [
    { key: 'time', label: 'Thời gian', mono: true, width: 140, render: r => fmtDT(r.createdAt) },
    { key: 'tpl', label: 'Mẫu', width: 220, render: r => (
      <div><b>{r.templateName}</b><br /><span className="mono" style={{ color: 'var(--t-2)' }}>{r.templateId}</span></div>
    )},
    { key: 'phone', label: 'SĐT', mono: true, width: 120, render: r => r.targetPhone },
    { key: 'patient', label: 'Bệnh nhân', width: 200, render: r => r.patientName || '—' },
    { key: 'sent', label: 'Gửi lúc', mono: true, width: 140, render: r => fmtDT(r.sentAt) },
    { key: 'cost', label: 'Chi phí', mono: true, width: 100, render: r => r.costVnd ? `${r.costVnd.toLocaleString('vi-VN')}đ` : '—' },
    { key: 'st', label: 'Trạng thái', width: 140, render: r => <StatusBadge tone={toneOfStatus(r.status)} dot>{r.statusName}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng tin', val: rows.length },
        { lbl: 'Đã giao', val: rows.filter(r => r.status === 2).length, tone: 'ok' },
        { lbl: 'Đang chờ', val: rows.filter(r => r.status === 0).length, tone: 'warn' },
        { lbl: 'Lỗi', val: rows.filter(r => r.status === 3).length, tone: 'crit' },
      ]} />
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm SĐT / BN / mẫu…" minWidth={300} />
        <Filter value={status} onChange={setStatus} placeholder="— Trạng thái —" options={[
          { v: '0', l: 'Đang chờ' }, { v: '1', l: 'Đã gửi' }, { v: '2', l: 'Đã nhận' }, { v: '3', l: 'Lỗi' }
        ]} />
        <button type="button" className="ab-btn primary" onClick={() => setShowSend(true)}>
          <TermIcon name="send" size={12} /> Gửi thử
        </button>
        <button type="button" className="ab-btn" onClick={load}><TermIcon name="rotate-cw" size={12}/> Tải lại</button>
      </div>
      <DataTable<ZaloNotificationLogDto> data={rows} rowKey={r => r.id} columns={columns} onRowClick={setDetail} />
      <SendModal open={showSend} onClose={() => setShowSend(false)} onSent={load} />
      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={`Tin Zalo — ${detail?.templateName || ''}`}>
        {detail && (
          <>
            <DrSec title="THÔNG TIN">
              <DrField lbl="Mẫu"><b>{detail.templateName}</b><br/><span className="mono" style={{color:'var(--t-2)'}}>{detail.templateId}</span></DrField>
              <DrField lbl="SĐT"><span className="mono">{detail.targetPhone}</span></DrField>
              <DrField lbl="Bệnh nhân">{detail.patientName || '—'}</DrField>
              <DrField lbl="Trạng thái"><StatusBadge tone={toneOfStatus(detail.status)} dot>{detail.statusName}</StatusBadge></DrField>
              <DrField lbl="Message ID"><span className="mono">{detail.messageId || '—'}</span></DrField>
              <DrField lbl="Gửi lúc"><span className="mono">{fmtDT(detail.sentAt)}</span></DrField>
              <DrField lbl="Giao lúc"><span className="mono">{fmtDT(detail.deliveredAt)}</span></DrField>
              <DrField lbl="Chi phí">{detail.costVnd ? `${detail.costVnd.toLocaleString('vi-VN')}đ` : '—'}</DrField>
              {detail.errorMessage && <DrField lbl="Lỗi">{detail.errorMessage}</DrField>}
            </DrSec>
            <DrSec title="PAYLOAD">
              <pre style={{ fontSize: 11, padding: 8, background: 'var(--bg-1)', maxHeight: 200, overflow: 'auto' }}>
                {(() => { try { return JSON.stringify(JSON.parse(detail.payloadJson || '{}'), null, 2); } catch { return detail.payloadJson; } })()}
              </pre>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </>
  );
};

const SendModal: React.FC<{ open: boolean; onClose: () => void; onSent: () => void }> = ({ open, onClose, onSent }) => {
  const [templates, setTemplates] = useState<ZaloTemplateDto[]>([]);
  const [tplId, setTplId] = useState('appointment_reminder');
  const [phone, setPhone] = useState('');
  const [paramsInput, setParamsInput] = useState<Record<string, string>>({});

  useEffect(() => { if (open) zalo.getTemplates().then(setTemplates).catch(() => {}); }, [open]);
  useEffect(() => { setParamsInput({}); }, [tplId]);

  const tpl = templates.find(t => t.id === tplId);

  const submit = async () => {
    if (!phone) { te('Vui lòng nhập SĐT'); return; }
    try {
      await zalo.send({ templateId: tplId, targetPhone: phone, templateParams: paramsInput });
      tk('Đã gửi'); onClose(); onSent();
    } catch { te('Gửi thất bại'); }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Gửi tin Zalo (ZNS)"
      footer={<>
        <button type="button" className="ab-btn" onClick={onClose}>Hủy</button>
        <button type="button" className="ab-btn primary" onClick={submit}>Gửi</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
        <span>Mẫu tin</span>
        <select className="ab-sel" value={tplId} onChange={e => setTplId(e.target.value)}>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span>SĐT</span>
        <input className="ab-sel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901234567" />
        {tpl?.params_.map(p => (
          <React.Fragment key={p}>
            <span>{p}</span>
            <input className="ab-sel" value={paramsInput[p] || ''} onChange={e => setParamsInput({ ...paramsInput, [p]: e.target.value })} />
          </React.Fragment>
        ))}
      </div>
    </ModalShell>
  );
};

const ConfigPanel: React.FC = () => {
  const [cfg, setCfg] = useState<ZaloConfigDto | null>(null);
  const [tested, setTested] = useState<boolean | null>(null);

  useEffect(() => { zalo.getConfig().then(setCfg).catch(() => te('Không tải được cấu hình')); }, []);

  const save = async () => {
    if (!cfg) return;
    try { await zalo.saveConfig(cfg); tk('Đã lưu cấu hình'); }
    catch { te('Lưu thất bại'); }
  };
  const test = async () => {
    try { const r = await zalo.testConnection(); setTested(r.connected); }
    catch { setTested(false); }
  };

  if (!cfg) return <div style={{ padding: 24 }}>Đang tải cấu hình…</div>;
  return (
    <div style={{ padding: 16, border: '1px solid var(--line)', background: 'var(--bg-1)' }} data-testid="zalo-config-panel">
      <h4 style={{ margin: 0, marginBottom: 12, fontSize: 12, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Zalo Official Account
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, fontSize: 13 }}>
        <span>Access Token</span><input className="ab-sel" value={cfg.accessToken} onChange={e => setCfg({ ...cfg, accessToken: e.target.value })} />
        <span>OA ID</span><input className="ab-sel" value={cfg.oaId} onChange={e => setCfg({ ...cfg, oaId: e.target.value })} />
        <span>Base URL</span><input className="ab-sel" value={cfg.baseUrl} onChange={e => setCfg({ ...cfg, baseUrl: e.target.value })} />
        <span>Mock mode</span>
        <label><input type="checkbox" checked={cfg.mockMode} onChange={e => setCfg({ ...cfg, mockMode: e.target.checked })} /> Bật mock</label>
        <span>Kích hoạt</span>
        <label><input type="checkbox" checked={cfg.isEnabled} onChange={e => setCfg({ ...cfg, isEnabled: e.target.checked })} /> Bật gửi Zalo</label>
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

export default ZaloNotificationsV2;
